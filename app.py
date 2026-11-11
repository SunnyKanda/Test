"""Crew: a private group chat with Claude, GPT, Gemini and Grok, plus a to-do list,
planner, goals and job tracker they can all see.

Run it with:  python app.py
"""
import asyncio
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from contextlib import asynccontextmanager
from datetime import timedelta

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

from crew.db import DB  # noqa: E402
from crew.providers import AGENTS, ORDER, ProviderError, Providers  # noqa: E402
from crew.schedule import DEFAULT_TIMES, Scheduler  # noqa: E402
from crew.team import Team  # noqa: E402

DATA_DIR = os.environ.get("DATA_DIR", "data")
PASSWORD = os.environ.get("APP_PASSWORD", "").strip()
HERE = os.path.dirname(os.path.abspath(__file__))


def _secret() -> str:
    """Signs sign-in cookies and encrypts stored API keys."""
    value = os.environ.get("APP_SECRET", "").strip() or PASSWORD
    if value:
        return value
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, ".secret")
    if not os.path.exists(path):
        with open(path, "w") as f:
            f.write(secrets.token_hex(32))
        os.chmod(path, 0o600)
    with open(path) as f:
        return f.read().strip()


SECRET = _secret()
db = DB(os.environ.get("DATABASE_URL"), DATA_DIR)
providers = Providers(db, SECRET)
team = Team(db, providers)
scheduler = Scheduler(db, team)
_background: set[asyncio.Task] = set()


def spawn(coro) -> None:
    task = asyncio.create_task(coro)
    _background.add(task)
    task.add_done_callback(_background.discard)


@asynccontextmanager
async def lifespan(_: FastAPI):
    team.ensure_welcome()
    spawn(scheduler.loop())
    yield
    for task in list(_background):
        task.cancel()


app = FastAPI(title="Crew", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

# ── sign-in ──────────────────────────────────────────────────────────────────
COOKIE = "crew_session"
SESSION_DAYS = 60
OPEN_PATHS = {"/api/login", "/api/auth", "/api/cron/tick", "/api/health"}
_failed: dict[str, list[float]] = {}


def _sign(expires: int) -> str:
    mac = hmac.new(SECRET.encode(), f"session:{expires}".encode(), hashlib.sha256).hexdigest()
    return f"{expires}.{mac}"


def _signed_in(request: Request) -> bool:
    token = request.cookies.get(COOKIE, "")
    expires, _, _ = token.partition(".")
    if not expires.isdigit() or int(expires) < time.time():
        return False
    return hmac.compare_digest(token, _sign(int(expires)))


def _is_local(request: Request) -> bool:
    direct = request.client and request.client.host in ("127.0.0.1", "::1", "testclient")
    return bool(direct) and "x-forwarded-for" not in request.headers


def _allowed(request: Request) -> bool:
    if PASSWORD:
        return _signed_in(request)
    # No password set: only the computer the app runs on may use it.
    return _is_local(request)


@app.middleware("http")
async def guard(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/") and path not in OPEN_PATHS and not _allowed(request):
        return JSONResponse({"detail": "Sign in first."}, status_code=401)
    response = await call_next(request)
    if not path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache"
    return response


@app.get("/api/auth")
async def auth_state(request: Request):
    return {
        "ok": _allowed(request),
        "needs_password": bool(PASSWORD),
        "locked_out": not PASSWORD and not _is_local(request),
    }


@app.post("/api/login")
async def login(request: Request):
    if not PASSWORD:
        raise HTTPException(400, "No password is set on the server. Set APP_PASSWORD and restart.")
    who = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0]
    recent = [t for t in _failed.get(who, []) if t > time.time() - 600]
    if len(recent) >= 8:
        raise HTTPException(429, "Too many wrong tries. Wait ten minutes.")
    body = await request.json()
    if not hmac.compare_digest(str(body.get("password", "")).encode(), PASSWORD.encode()):
        _failed[who] = [*recent, time.time()]
        raise HTTPException(401, "That password isn't right.")
    _failed.pop(who, None)
    expires = int(time.time()) + SESSION_DAYS * 86400
    response = JSONResponse({"ok": True})
    secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    response.set_cookie(COOKIE, _sign(expires), max_age=SESSION_DAYS * 86400, httponly=True,
                        samesite="lax", secure=secure)
    return response


@app.post("/api/logout")
async def logout():
    response = JSONResponse({"ok": True})
    response.delete_cookie(COOKIE)
    return response


# ── everything the screens need ──────────────────────────────────────────────
def _agents_view() -> list[dict]:
    usage = team.usage_today()
    out = []
    for key in ORDER:
        a = AGENTS[key]
        out.append({
            "id": key, "name": a["name"], "role": a["role"], "does": a["does"], "key_url": a["key_url"],
            "has_key": bool(providers.key(key)) or providers.mock, "key_source": providers.key_source(key),
            "enabled": providers.enabled(key), "ready": providers.ready(key),
            "model": db.get(f"model_{key}") or a["default_model"],
            "auto_model": db.get(f"auto_model_{key}"), "replies_today": usage.get(key, 0),
        })
    return out


def _settings_view() -> dict:
    out = {
        "name": team.name(), "timezone": db.get("timezone", "Europe/London"),
        "reply_mode": db.get("reply_mode", "team"), "daily_cap": int(db.get("daily_cap", "60") or 60),
        "checkins": db.get("checkins", "1") == "1", "ntfy_topic": db.get("ntfy_topic"),
        "today": team.today(),
    }
    for kind, default in DEFAULT_TIMES.items():
        out[f"time_{kind}"] = db.get(f"time_{kind}", default)
        out[f"on_{kind}"] = db.get(f"on_{kind}", "1") == "1"
    return out


def _data() -> dict:
    cutoff = (team.now().date() - timedelta(days=90)).isoformat()
    return {
        "version": db.version,
        "settings": _settings_view(),
        "agents": _agents_view(),
        "tasks": db.q("SELECT * FROM tasks WHERE done=0 OR done_day>=? ORDER BY created_at", (cutoff,)),
        "goals": db.q("SELECT * FROM goals ORDER BY created_at"),
        "jobs": db.q("SELECT * FROM jobs ORDER BY created_at DESC"),
        "memory": db.q("SELECT * FROM memory ORDER BY created_at"),
    }


def _messages(after: str) -> list[dict]:
    if after:
        rows = db.q("SELECT * FROM messages WHERE created_at>? ORDER BY created_at", (after,))
    else:
        rows = db.q("SELECT * FROM messages ORDER BY created_at DESC LIMIT 200")[::-1]
    for row in rows:
        row["meta"] = json.loads(row["meta"] or "{}")
    return rows


@app.get("/api/poll")
async def poll(after: str = "", version: int = 0):
    out = {"messages": _messages(after), "typing": team.typing, "version": db.version}
    if version != db.version:
        out["data"] = _data()
    return out


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.get("/api/cron/tick")
async def cron_tick():
    """An outside pinger can call this to wake a sleeping host and send due check-ins."""
    spawn(scheduler.tick())
    return {"ok": True}


# ── chat ─────────────────────────────────────────────────────────────────────
@app.post("/api/messages")
async def send_message(request: Request):
    body = await request.json()
    text = str(body.get("text", "")).strip()[:6000]
    if not text:
        raise HTTPException(400, "Write something first.")
    message = team.post("sunny", text)
    spawn(team.kick())
    message["meta"] = {}
    return message


@app.post("/api/checkin/{kind}")
async def checkin_now(kind: str):
    if kind not in DEFAULT_TIMES:
        raise HTTPException(404, "No such check-in.")
    if not providers.ready_agents():
        raise HTTPException(400, "Add an API key for at least one crew member first.")
    spawn(team.checkin(kind))
    return {"ok": True}


# ── to-do, goals, jobs, notes ────────────────────────────────────────────────
DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
CLOCK = re.compile(r"^\d{2}:\d{2}$")
FIELDS = {
    "tasks": {"title": 200, "notes": 2000, "due": "day", "time": "clock", "done": "flag", "top": "flag", "goal_id": 32},
    "goals": {"title": 200, "why": 1000, "horizon": ("week", "month", "big"), "done": "flag"},
    "jobs": {"title": 200, "company": 200, "link": 500, "next_step": 300, "next_date": "day", "notes": 2000,
             "status": ("lead", "applied", "interview", "offer", "closed")},
    "memory": {"text": 300},
}


def _clean(table: str, body: dict) -> dict:
    out = {}
    for field, rule in FIELDS[table].items():
        if field not in body:
            continue
        value = body[field]
        if rule == "flag":
            out[field] = 1 if value else 0
        elif rule == "day":
            value = str(value or "")
            if value and not DAY.match(value):
                raise HTTPException(400, f"{field} must be a date.")
            out[field] = value
        elif rule == "clock":
            value = str(value or "")
            if value and not CLOCK.match(value):
                raise HTTPException(400, f"{field} must be a time.")
            out[field] = value
        elif isinstance(rule, tuple):
            if value not in rule:
                raise HTTPException(400, f"{field} isn't valid.")
            out[field] = value
        else:
            out[field] = str(value or "").strip()[:rule]
    if table == "jobs" and out.get("link") and not re.match(r"^https?://", out["link"]):
        out["link"] = "https://" + out["link"]
    return out


def _stamp_done(table: str, row_id: str, changes: dict) -> None:
    if "done" in changes:
        changes["done_day"] = team.today() if changes["done"] else ""
    if table == "jobs" and changes.get("status") == "applied":
        current = db.q("SELECT applied_day FROM jobs WHERE id=?", (row_id,)) if row_id else []
        if not current or not current[0]["applied_day"]:
            changes["applied_day"] = team.today()


@app.post("/api/{table}")
async def create(table: str, request: Request):
    if table not in FIELDS:
        raise HTTPException(404)
    changes = _clean(table, await request.json())
    main = "text" if table == "memory" else "title"
    if not changes.get(main):
        raise HTTPException(400, "Give it a name first.")
    _stamp_done(table, "", changes)
    return db.insert(table, changes)


@app.patch("/api/{table}/{row_id}")
async def change(table: str, row_id: str, request: Request):
    if table not in FIELDS:
        raise HTTPException(404)
    changes = _clean(table, await request.json())
    if "title" in changes and not changes["title"]:
        raise HTTPException(400, "It needs a name.")
    _stamp_done(table, row_id, changes)
    db.update(table, row_id, changes)
    return {"ok": True}


@app.delete("/api/{table}/{row_id}")
async def remove(table: str, row_id: str):
    if table not in FIELDS:
        raise HTTPException(404)
    db.delete(table, row_id)
    if table == "goals":
        db.x("UPDATE tasks SET goal_id='' WHERE goal_id=?", (row_id,))
    return {"ok": True}


# ── settings ─────────────────────────────────────────────────────────────────
@app.put("/api/settings")
async def save_settings(request: Request):
    body = await request.json()
    if "name" in body:
        db.set("name", str(body["name"]).strip()[:40] or "Sunny")
    if "timezone" in body:
        from zoneinfo import ZoneInfo
        try:
            ZoneInfo(str(body["timezone"]))
        except Exception:
            raise HTTPException(400, "That timezone isn't recognised. Try one like Europe/London.")
        db.set("timezone", str(body["timezone"]))
    if "reply_mode" in body and body["reply_mode"] in ("team", "one"):
        db.set("reply_mode", body["reply_mode"])
    if "daily_cap" in body:
        try:
            db.set("daily_cap", str(max(1, min(500, int(body["daily_cap"])))))
        except (TypeError, ValueError):
            raise HTTPException(400, "The daily limit must be a number.")
    if "checkins" in body:
        db.set("checkins", "1" if body["checkins"] else "0")
    if "ntfy_topic" in body:
        topic = str(body["ntfy_topic"]).strip()
        if topic and not re.fullmatch(r"[A-Za-z0-9_-]{6,64}", topic):
            raise HTTPException(400, "Use 6 to 64 letters, numbers, dashes or underscores.")
        db.set("ntfy_topic", topic)
    for kind in DEFAULT_TIMES:
        if f"time_{kind}" in body:
            if not CLOCK.match(str(body[f"time_{kind}"])):
                raise HTTPException(400, "Times look like 08:00.")
            db.set(f"time_{kind}", body[f"time_{kind}"])
        if f"on_{kind}" in body:
            db.set(f"on_{kind}", "1" if body[f"on_{kind}"] else "0")
    return _settings_view()


@app.put("/api/agents/{agent}")
async def save_agent(agent: str, request: Request):
    if agent not in AGENTS:
        raise HTTPException(404)
    body = await request.json()
    if "key" in body:
        providers.set_key(agent, str(body["key"]))
    if "model" in body:
        db.set(f"model_{agent}", str(body["model"]).strip()[:100])
        db.set(f"auto_model_{agent}", "")
    if "enabled" in body:
        db.set(f"enabled_{agent}", "1" if body["enabled"] else "0")
    return {"ok": True}


@app.get("/api/agents/{agent}/models")
async def agent_models(agent: str):
    if agent not in AGENTS:
        raise HTTPException(404)
    if not providers.key(agent) and not providers.mock:
        raise HTTPException(400, "Add a key first.")
    try:
        return {"models": await providers.list_models(agent)}
    except ProviderError as exc:
        raise HTTPException(400, str(exc))


@app.post("/api/agents/{agent}/test")
async def agent_test(agent: str):
    if agent not in AGENTS:
        raise HTTPException(404)
    try:
        reply = await providers.complete(
            agent, "You are being connection-tested. Reply with a short friendly hello, five words at most.",
            [{"role": "user", "content": "Say hello."}],
        )
        model = db.get(f"model_{agent}") or AGENTS[agent]["default_model"]
        if model == "auto":
            model = db.get(f"auto_model_{agent}") or "auto"
        return {"ok": True, "reply": reply[:200], "model": model}
    except ProviderError as exc:
        return {"ok": False, "error": str(exc)}


# ── the screens ──────────────────────────────────────────────────────────────
@app.get("/")
async def index():
    return FileResponse(os.path.join(HERE, "static", "index.html"))


app.mount("/", StaticFiles(directory=os.path.join(HERE, "static")), name="static")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    hosted = bool(PASSWORD)
    if not hosted:
        print(f"\n  Crew is running. Open http://localhost:{port} on this computer.\n"
              "  To use it from your phone or host it online, set APP_PASSWORD first (see README).\n")
    uvicorn.run(app, host="0.0.0.0" if hosted else "127.0.0.1", port=port, log_level="warning" if not hosted else "info")

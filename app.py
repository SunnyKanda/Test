"""
Multi-Model AI Team Application
Orchestrates Claude, ChatGPT, and Gemini through collaborative reasoning stages:
  1. Initial independent responses
  2. AI-to-AI discussion
  3. Refined responses
  4. Final synthesized answer
"""

import asyncio
import json
import uuid
import sqlite3
import os
import threading
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

import anthropic as anthropic_sdk
from openai import AsyncOpenAI
import google.generativeai as genai

# ─── Database ────────────────────────────────────────────────────────────────

DB_PATH = "sessions.db"
_db_lock = threading.Lock()


def init_db():
    with _db_lock, sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                prompt      TEXT NOT NULL,
                models      TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'running',
                session_data TEXT DEFAULT '{}',
                created_at  TEXT NOT NULL
            )
        """)
        conn.commit()


def db_save_session(sid: str, prompt: str, models: list[str]):
    with _db_lock, sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO sessions (id, prompt, models, status, session_data, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (sid, prompt, json.dumps(models), "running", "{}", datetime.utcnow().isoformat()),
        )
        conn.commit()


def db_update_session(sid: str, status: str, data: dict):
    with _db_lock, sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE sessions SET status=?, session_data=? WHERE id=?",
            (status, json.dumps(data), sid),
        )
        conn.commit()


def db_get_session(sid: str) -> dict | None:
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT id, prompt, models, status, session_data, created_at FROM sessions WHERE id=?",
            (sid,),
        ).fetchone()
    if row:
        return {
            "id": row[0],
            "prompt": row[1],
            "models": json.loads(row[2]),
            "status": row[3],
            "session_data": json.loads(row[4] or "{}"),
            "created_at": row[5],
        }
    return None


def db_list_sessions() -> list[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT id, prompt, models, status, created_at FROM sessions "
            "ORDER BY created_at DESC LIMIT 30"
        ).fetchall()
    return [
        {"id": r[0], "prompt": r[1], "models": json.loads(r[2]), "status": r[3], "created_at": r[4]}
        for r in rows
    ]


# ─── AI Clients ──────────────────────────────────────────────────────────────

claude_client = anthropic_sdk.AsyncAnthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY", "")
)
openai_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

_gemini_ready = False
if os.environ.get("GOOGLE_API_KEY"):
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
    _gemini_ready = True

MODEL_CONFIG: dict[str, dict] = {
    "claude": {"name": "Claude",   "model": "claude-opus-4-6"},
    "gpt":    {"name": "ChatGPT",  "model": "gpt-4o"},
    "gemini": {"name": "Gemini",   "model": "gemini-1.5-pro"},
}


# ─── Model Streaming ─────────────────────────────────────────────────────────

async def stream_claude(
    system: str, user_msg: str,
    queue: asyncio.Queue, model_key: str, stage: str,
) -> str:
    full = ""
    try:
        async with claude_client.messages.stream(
            model=MODEL_CONFIG["claude"]["model"],
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        ) as s:
            async for text in s.text_stream:
                full += text
                await queue.put({"type": "chunk", "model": model_key, "stage": stage, "text": text})
    except Exception as exc:
        err = f"\n[Claude error: {exc}]"
        full += err
        await queue.put({"type": "chunk", "model": model_key, "stage": stage, "text": err})
    await queue.put({"type": "model_done", "model": model_key, "stage": stage})
    return full


async def stream_gpt(
    system: str, user_msg: str,
    queue: asyncio.Queue, model_key: str, stage: str,
) -> str:
    full = ""
    try:
        stream = await openai_client.chat.completions.create(
            model=MODEL_CONFIG["gpt"]["model"],
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=2048,
            stream=True,
        )
        async for chunk in stream:
            text = chunk.choices[0].delta.content or ""
            if text:
                full += text
                await queue.put({"type": "chunk", "model": model_key, "stage": stage, "text": text})
    except Exception as exc:
        err = f"\n[ChatGPT error: {exc}]"
        full += err
        await queue.put({"type": "chunk", "model": model_key, "stage": stage, "text": err})
    await queue.put({"type": "model_done", "model": model_key, "stage": stage})
    return full


async def stream_gemini(
    system: str, user_msg: str,
    queue: asyncio.Queue, model_key: str, stage: str,
) -> str:
    full = ""
    if not _gemini_ready:
        msg = "[Gemini: GOOGLE_API_KEY not configured]"
        await queue.put({"type": "chunk", "model": model_key, "stage": stage, "text": msg})
        await queue.put({"type": "model_done", "model": model_key, "stage": stage})
        return msg

    try:
        loop = asyncio.get_event_loop()

        def _sync_generate() -> str:
            m = genai.GenerativeModel(
                model_name=MODEL_CONFIG["gemini"]["model"],
                system_instruction=system,
            )
            resp = m.generate_content(
                user_msg,
                generation_config={"max_output_tokens": 2048},
            )
            return resp.text

        text = await loop.run_in_executor(None, _sync_generate)
        full = text

        # Simulate streaming in word batches for responsive UX
        words = text.split()
        buf = ""
        for i, word in enumerate(words):
            buf += word + (" " if i < len(words) - 1 else "")
            if len(buf) >= 60 or i == len(words) - 1:
                await queue.put({"type": "chunk", "model": model_key, "stage": stage, "text": buf})
                buf = ""
                await asyncio.sleep(0.008)

    except Exception as exc:
        err = f"\n[Gemini error: {exc}]"
        full += err
        await queue.put({"type": "chunk", "model": model_key, "stage": stage, "text": err})

    await queue.put({"type": "model_done", "model": model_key, "stage": stage})
    return full


async def call_model(
    model_key: str, system: str, user_msg: str,
    queue: asyncio.Queue, stage: str,
) -> str:
    if model_key == "claude":
        return await stream_claude(system, user_msg, queue, model_key, stage)
    if model_key == "gpt":
        return await stream_gpt(system, user_msg, queue, model_key, stage)
    if model_key == "gemini":
        return await stream_gemini(system, user_msg, queue, model_key, stage)
    return f"[Unknown model: {model_key}]"


# ─── Prompt Builders ─────────────────────────────────────────────────────────

def _name(mk: str) -> str:
    return MODEL_CONFIG.get(mk, {}).get("name", mk)


def sys_initial(model_key: str) -> str:
    return (
        f"You are {_name(model_key)}, an AI assistant participating in a collaborative AI team exercise.\n"
        "Provide a comprehensive, well-structured, and accurate answer to the user's question.\n"
        "This is your independent initial assessment — be thorough, clear, and well-organized."
    )


def sys_discussion(model_key: str) -> str:
    return (
        f"You are {_name(model_key)}, reviewing responses from your AI teammates.\n\n"
        "Analyze all the responses below and provide substantive discussion commentary covering:\n"
        "1. **Agreements** — points that all or most AIs got right and why they matter\n"
        "2. **Differences** — where responses diverge and which approach is more accurate or complete\n"
        "3. **Gaps** — important information missing from some or all responses\n"
        "4. **Improvements** — specific suggestions for a stronger final answer\n\n"
        "Be specific and reference the responses directly. Be constructively critical and intellectually honest."
    )


def sys_refinement(model_key: str) -> str:
    return (
        f"You are {_name(model_key)}, refining your answer based on your AI team's discussion.\n\n"
        "Review the discussion commentary and produce an improved, comprehensive answer that:\n"
        "- Incorporates valid insights raised by your teammates\n"
        "- Corrects any errors or gaps that were identified\n"
        "- Maintains your perspective where you believe it is correct\n"
        "- Is more complete and accurate than your initial response\n"
        "Produce a well-structured, authoritative final answer."
    )


SYS_SYNTHESIS = (
    "You are an expert synthesizer reviewing multiple AI responses to create the best possible final answer.\n\n"
    "Your task:\n"
    "1. Read all refined AI responses carefully\n"
    "2. Identify the strongest arguments and most accurate information from each\n"
    "3. Synthesize them into one comprehensive, well-structured answer\n"
    "4. Clearly acknowledge any meaningful disagreements that remain between the models\n"
    "5. The result should be better than any individual response\n\n"
    "Format your answer clearly. Be authoritative and precise."
)


def msg_initial(prompt: str) -> str:
    return prompt


def msg_discussion(prompt: str, model_key: str, initial: dict) -> str:
    lines = [f"Original question:\n{prompt}\n\nAI Team Initial Responses:"]
    for mk, resp in initial.items():
        lines.append(f"\n=== {_name(mk)} ===\n{resp}")
    lines.append(f"\nAs {_name(model_key)}, please provide your discussion commentary.")
    return "\n".join(lines)


def msg_refinement(prompt: str, model_key: str, initial: dict, discussion: dict) -> str:
    my_initial = initial.get(model_key, "[No initial response]")
    lines = [
        f"Original question:\n{prompt}",
        f"\nYour initial response:\n{my_initial}",
    ]
    if discussion:
        lines.append("\nTeam Discussion Commentary:")
        for mk, resp in discussion.items():
            lines.append(f"\n--- {_name(mk)}'s Commentary ---\n{resp}")
    lines.append(f"\nAs {_name(model_key)}, please provide your refined and improved answer.")
    return "\n".join(lines)


def msg_synthesis(prompt: str, refined: dict) -> str:
    lines = [f"Original question:\n{prompt}\n\nAI Team Refined Responses:"]
    for mk, resp in refined.items():
        lines.append(f"\n=== {_name(mk)} ===\n{resp}")
    lines.append("\nPlease create the final synthesized answer.")
    return "\n".join(lines)


# ─── Orchestration ────────────────────────────────────────────────────────────

def _is_error(text: str) -> bool:
    return not text or text.lstrip().startswith("[")


async def orchestrate(
    session_id: str, prompt: str, models: list[str], queue: asyncio.Queue
):
    data: dict = {"initial": {}, "discussion": {}, "refined": {}, "final": ""}

    async def run_stage(
        stage_key: str, label: str, participants: list[str],
        sys_fn, msg_fn,
    ) -> dict[str, str]:
        await queue.put({
            "type": "stage_start", "stage": stage_key,
            "label": label, "models": participants,
        })
        tasks = {
            mk: asyncio.create_task(
                call_model(mk, sys_fn(mk), msg_fn(mk), queue, stage_key)
            )
            for mk in participants
        }
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        output: dict[str, str] = {}
        for mk, res in zip(tasks.keys(), results):
            output[mk] = str(res) if isinstance(res, Exception) else res
        await queue.put({"type": "stage_complete", "stage": stage_key})
        return output

    try:
        # ── Stage 1: Initial Responses ────────────────────────────────────
        data["initial"] = await run_stage(
            "initial", "Initial Responses", models,
            sys_fn=sys_initial,
            msg_fn=lambda _: msg_initial(prompt),
        )

        ok = [mk for mk in models if not _is_error(data["initial"].get(mk, ""))]
        if not ok:
            await queue.put({"type": "fatal_error", "message": "All models failed to respond."})
            return

        # ── Stage 2: Discussion ───────────────────────────────────────────
        if len(ok) > 1:
            data["discussion"] = await run_stage(
                "discussion", "AI Team Discussion", ok,
                sys_fn=sys_discussion,
                msg_fn=lambda mk: msg_discussion(prompt, mk, data["initial"]),
            )

        # ── Stage 3: Refined Responses ────────────────────────────────────
        data["refined"] = await run_stage(
            "refined", "Refined Responses", ok,
            sys_fn=sys_refinement,
            msg_fn=lambda mk: msg_refinement(prompt, mk, data["initial"], data["discussion"]),
        )

        # Fall back to initial if refinement produced nothing
        for mk in ok:
            if _is_error(data["refined"].get(mk, "")):
                data["refined"][mk] = data["initial"].get(mk, "")

        # ── Stage 4: Final Synthesis ──────────────────────────────────────
        await queue.put({
            "type": "stage_start", "stage": "final",
            "label": "Final Synthesized Answer", "models": [],
        })
        synthesizer = "claude" if "claude" in ok else ok[0]
        final_text = await call_model(
            synthesizer, SYS_SYNTHESIS,
            msg_synthesis(prompt, data["refined"]),
            queue, "final",
        )
        data["final"] = final_text
        await queue.put({"type": "stage_complete", "stage": "final"})

        db_update_session(session_id, "completed", data)
        await queue.put({"type": "done", "session_id": session_id})

    except asyncio.CancelledError:
        db_update_session(session_id, "cancelled", data)
        raise
    except Exception as exc:
        db_update_session(session_id, "error", data)
        await queue.put({"type": "fatal_error", "message": str(exc)})


# ─── FastAPI App ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    os.makedirs("static", exist_ok=True)
    yield


app = FastAPI(title="AI Team Chat", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


class ChatRequest(BaseModel):
    prompt: str
    models: list[str] = ["claude", "gpt", "gemini"]


@app.post("/api/chat")
async def api_chat(request: ChatRequest):
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(400, "Prompt cannot be empty")

    active_models = [m for m in request.models if m in MODEL_CONFIG]
    if not active_models:
        active_models = list(MODEL_CONFIG.keys())

    session_id = str(uuid.uuid4())
    db_save_session(session_id, prompt, active_models)

    async def generate():
        queue: asyncio.Queue = asyncio.Queue()
        yield f"data: {json.dumps({'type': 'session_start', 'session_id': session_id})}\n\n"

        task = asyncio.create_task(orchestrate(session_id, prompt, active_models, queue))
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=120.0)
                    yield f"data: {json.dumps(event)}\n\n"
                    if event["type"] in ("done", "fatal_error"):
                        break
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    if task.done():
                        break
        finally:
            if not task.done():
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/sessions")
async def api_list_sessions():
    return db_list_sessions()


@app.get("/api/sessions/{session_id}")
async def api_get_session(session_id: str):
    session = db_get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session


# Serve frontend — must be last so it doesn't shadow API routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")

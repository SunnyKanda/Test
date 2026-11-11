"""The group chat: who replies, what they are told, and what they can do."""
import asyncio
import json
import logging
import re
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx2 as httpx

from .providers import AGENTS, ORDER, ProviderError, Providers

log = logging.getLogger("crew")

HISTORY = 30
ACTION = re.compile(r"\[\[\s*(task|remember)\s*:\s*([^\]]+?)\s*\]\]", re.I)
MENTION = re.compile(r"@(claude|chatgpt|gpt|gemini|grokbot|grok|all|team|everyone)\b", re.I)
ROUTES = [
    ("gpt", re.compile(r"\b(cv|resume|résumé|cover letter|interview|appl(y|ied|ication)|job|vacanc|hiring|recruit)", re.I)),
    ("grok", re.compile(r"\b(money|earn|cash|income|sell|side ?hustle|gig|freelanc|rent|debt|bills?|broke|skint)", re.I)),
    ("gemini", re.compile(r"\b(how do|how does|what is|what are|where can|benefit|universal credit|course|training|qualif|grant|research|explain)", re.I)),
]

WELCOME = (
    "Welcome aboard, {name}. This is your crew's group chat.\n\n"
    "Claude coaches, GPT handles job hunting, Gemini researches and Grok brings money ideas. "
    "Write to everyone, or start a message with a name like @grok to ask one of them.\n\n"
    "To get going, tell the crew three things: what work you've done before, how soon you need money "
    "coming in, and how much energy you've got on a normal day."
)
NO_KEYS = (
    "Nobody on the crew can talk yet because no API keys have been added. Open Settings (top right) "
    "and add a key for at least one of them. Your to-do list, planner, goals and job tracker work without keys."
)


class Team:
    def __init__(self, db, providers: Providers):
        self.db = db
        self.providers = providers
        self.typing = ""
        self._lock = asyncio.Lock()
        self._pending = False
        self._round = 0

    # ── time ──────────────────────────────────────────────────────────────
    def tz(self) -> ZoneInfo:
        try:
            return ZoneInfo(self.db.get("timezone", "Europe/London"))
        except Exception:
            return ZoneInfo("Europe/London")

    def now(self) -> datetime:
        return datetime.now(self.tz())

    def today(self) -> str:
        return self.now().date().isoformat()

    def name(self) -> str:
        return self.db.get("name", "Sunny") or "Sunny"

    # ── messages ──────────────────────────────────────────────────────────
    def post(self, sender: str, text: str, kind: str = "chat", meta: dict | None = None) -> dict:
        return self.db.insert(
            "messages", {"sender": sender, "kind": kind, "text": text, "meta": json.dumps(meta or {})}
        )

    def ensure_welcome(self) -> None:
        if not self.db.q("SELECT id FROM messages LIMIT 1"):
            self.post("system", WELCOME.format(name=self.name()), kind="welcome")

    # ── a round of replies ────────────────────────────────────────────────
    async def kick(self) -> None:
        """Have the crew answer the latest messages. Safe to call while a round is running."""
        if self._lock.locked():
            self._pending = True
            return
        async with self._lock:
            while True:
                self._pending = False
                try:
                    await self._reply_round()
                except Exception:
                    log.exception("round failed")
                finally:
                    self.typing = ""
                if not self._pending:
                    break

    async def _reply_round(self) -> None:
        ready = self.providers.ready_agents()
        last = self.db.q("SELECT text FROM messages WHERE sender='sunny' ORDER BY created_at DESC LIMIT 1")
        text = last[0]["text"] if last else ""
        if not ready:
            self._notice_once("nokeys", NO_KEYS)
            return
        mentioned = self._mentioned(text)
        if mentioned is not None:
            missing = [a for a in mentioned if a not in ready]
            for a in missing:
                self.post("system", f"{AGENTS[a]['name']} isn't set up yet. Add a key in Settings.", kind="notice")
            responders = [a for a in mentioned if a in ready]
        else:
            lead = next((a for a, pattern in ROUTES if a in ready and pattern.search(text)), None)
            if lead is None:
                lead = ready[0] if "claude" in ready else ready[self._round % len(ready)]
            rest = [a for a in ready if a != lead]
            responders = [lead] if self.db.get("reply_mode", "team") == "one" else [lead, *rest]
        self._round += 1
        for position, agent in enumerate(responders):
            await self._speak(agent, may_pass=position > 0 and mentioned is None)

    def _mentioned(self, text: str) -> list[str] | None:
        found = [m.lower() for m in MENTION.findall(text)]
        if not found:
            return None
        if any(m in ("all", "team", "everyone") for m in found):
            return list(ORDER)
        alias = {"chatgpt": "gpt", "grokbot": "grok"}
        out: list[str] = []
        for m in found:
            agent = alias.get(m, m)
            if agent not in out:
                out.append(agent)
        return out

    async def _speak(self, agent: str, may_pass: bool = False, instruction: str = "") -> bool:
        """One agent writes one message. Returns True if something was posted."""
        if not self._within_cap(agent):
            return False
        self.typing = agent
        try:
            reply = await self.providers.complete(agent, self._system(agent, may_pass), self._history(agent, instruction))
        except ProviderError as exc:
            self.post("system", str(exc), kind="notice", meta={"agent": agent})
            return False
        except Exception as exc:
            log.exception("agent %s failed", agent)
            self.post("system", f"{AGENTS[agent]['name']} hit an unexpected error: {str(exc)[:160]}", kind="notice")
            return False
        finally:
            self.typing = ""
        self._count(agent)
        reply = re.sub(rf"^\s*\**{AGENTS[agent]['name']}\b[^:\n]{{0,30}}:\**\s*", "", reply, flags=re.I)
        text, actions = self._apply_actions(agent, reply)
        if text.strip(" .!*").upper() == "PASS" or (not text and not actions):
            return False
        self.post(agent, text or "Done.", meta={"actions": actions} if actions else None)
        return True

    # ── things agents can do ──────────────────────────────────────────────
    def _apply_actions(self, agent: str, reply: str) -> tuple[str, list[dict]]:
        actions: list[dict] = []
        added = 0
        for kind, body in ACTION.findall(reply):
            kind = kind.lower()
            body = body.strip()
            if kind == "task" and added < 3:
                title, _, when = body.partition("|")
                title = title.strip()[:200]
                due = self._parse_day(when)
                same = self.db.q("SELECT id FROM tasks WHERE done=0 AND lower(title)=?", (title.lower(),))
                if title and not same:
                    self.db.insert("tasks", {"title": title, "due": due, "added_by": agent})
                    actions.append({"type": "task", "title": title, "due": due})
                    added += 1
            elif kind == "remember" and body:
                same = self.db.q("SELECT id FROM memory WHERE lower(text)=?", (body.lower(),))
                if not same:
                    self.db.insert("memory", {"text": body[:300], "added_by": agent})
                    actions.append({"type": "remember", "text": body[:300]})
        text = re.sub(r"\n{3,}", "\n\n", ACTION.sub("", reply)).strip()
        return text, actions

    def _parse_day(self, when: str) -> str:
        when = when.strip().lower().removeprefix("due:").strip()
        today = self.now().date()
        if when == "today":
            return today.isoformat()
        if when == "tomorrow":
            return (today + timedelta(days=1)).isoformat()
        try:
            return date.fromisoformat(when).isoformat()
        except ValueError:
            return ""

    # ── limits ────────────────────────────────────────────────────────────
    def _within_cap(self, agent: str) -> bool:
        try:
            cap = int(self.db.get("daily_cap", "60"))
        except ValueError:
            cap = 60
        used = self.db.q("SELECT calls FROM usage WHERE day=? AND agent=?", (self.today(), agent))
        if used and used[0]["calls"] >= cap:
            self._notice_once(
                f"cap:{agent}:{self.today()}",
                f"{AGENTS[agent]['name']} has reached today's limit of {cap} replies. "
                "It resets at midnight, or raise it in Settings.",
            )
            return False
        return True

    def _count(self, agent: str) -> None:
        self.db.x(
            "INSERT INTO usage (day, agent, calls) VALUES (?, ?, 1) "
            "ON CONFLICT (day, agent) DO UPDATE SET calls = usage.calls + 1",
            (self.today(), agent),
        )
        self.db.bump()

    def usage_today(self) -> dict:
        rows = self.db.q("SELECT agent, calls FROM usage WHERE day=?", (self.today(),))
        return {r["agent"]: r["calls"] for r in rows}

    def _notice_once(self, key: str, text: str) -> None:
        """Post a notice unless the same one is already the latest message."""
        last = self.db.q("SELECT kind, meta FROM messages ORDER BY created_at DESC LIMIT 1")
        if last and last[0]["kind"] == "notice" and json.loads(last[0]["meta"]).get("key") == key:
            return
        if key.startswith("cap:") and self.db.q("SELECT key FROM runs WHERE key=?", (key,)):
            return
        if key.startswith("cap:"):
            self.db.x("INSERT INTO runs (key, ran_at) VALUES (?, ?)", (key, self.now().isoformat()))
        self.post("system", text, kind="notice", meta={"key": key})

    # ── what each agent is told ───────────────────────────────────────────
    def _system(self, agent: str, may_pass: bool) -> str:
        me = AGENTS[agent]
        name = self.name()
        mates = "\n".join(
            f"- {AGENTS[a]['name']} ({AGENTS[a]['role']}): {AGENTS[a]['does'].replace('Sunny', name)}"
            for a in ORDER if a != agent
        )
        memory = self.db.q("SELECT text FROM memory ORDER BY created_at")
        about = "\n".join(f"- {m['text']}" for m in memory) or "- Nothing saved yet. Ask, and save what matters."
        passing = (
            "\nIf a teammate has already said what you would say, reply with the single word PASS and nothing "
            "else. A message that only repeats or agrees wastes the reader's attention; add something new, "
            "or disagree, or pass.\n"
            if may_pass else ""
        )
        return f"""You are {me['name']}, one of four AI teammates in a private group chat with {name}. Your part on the team is {me['role']}: {me['does'].replace('Sunny', name)}.

Your teammates, who are other AI models in the same chat:
{mates}

{name} set this chat up because they are struggling: out of work, short of money, and finding it hard to focus. They are often tired when they write. What they need from the team is steady, practical steering towards paid work and a day they can actually get through, one small step at a time.

What the team knows about {name}:
{about}

Where things stand right now:
{self.snapshot()}

How to write here:
- This is a phone chat. Most messages should be one to four sentences. Write longer only when {name} asks for a draft, such as a CV section or a cover letter.
- Give one concrete next step that is small enough to do today. If a plan is too big for a tired person, shrink it.
- Speak in your own voice from your own role, and build on what teammates said. If a teammate's advice is weak or unrealistic, say so plainly; {name} is better served by honest disagreement than by four voices agreeing.
- Be kind and direct. No pep talks, no lectures, no lists of ten options.
- Plain text only. No headings, no tables.
{passing}
Being honest about limits:
- You have no internet access in this chat. Never invent job adverts, employers who are hiring, links, phone numbers, pay figures or statistics. Say what to search for and where instead, and let {name} bring back what they find.
- Do not suggest gambling, crypto or trading punts, get-rich-quick schemes, or anything that costs money up front.
- If {name} mentions wanting to harm themselves or not wanting to be here, that comes before any task. Answer warmly, take it seriously, and point them to a person they can talk to now: Samaritans on 116 123 (UK and Ireland, free, any hour), or local emergency services.

Things you can do, by putting a tag on its own line at the end of your message:
[[task: short title | YYYY-MM-DD]] adds an item to {name}'s to-do list. The date is optional; "today" and "tomorrow" also work. Add a task when {name} has agreed to something or asked for a plan, at most two per message, and never one that is already on the list.
[[remember: one fact]] saves a lasting fact about {name}, such as skills, past jobs, constraints or preferences, so the whole team has it in future chats.
The app removes the tags and shows {name} what was added."""

    def snapshot(self) -> str:
        now = self.now()
        today = now.date().isoformat()
        tasks = self.db.q("SELECT title, due, time, top FROM tasks WHERE done=0 ORDER BY due, time LIMIT 40")
        overdue = [t for t in tasks if t["due"] and t["due"] < today]
        todays = [t for t in tasks if t["due"] == today]
        later = [t for t in tasks if not t["due"] or t["due"] > today]
        done_today = self.db.q("SELECT title FROM tasks WHERE done=1 AND done_day=?", (today,))
        week_ago = (now.date() - timedelta(days=6)).isoformat()
        done_week = self.db.q("SELECT COUNT(*) AS n FROM tasks WHERE done=1 AND done_day>=?", (week_ago,))[0]["n"]

        def line(t):
            bits = [t["title"]]
            if t["time"]:
                bits.append(f"at {t['time']}")
            if t["due"] and t["due"] != today:
                bits.append(f"due {t['due']}")
            if t["top"]:
                bits.append("(top priority)")
            return "  - " + " ".join(bits)

        out = [f"It is {now.strftime('%A %-d %B %Y, %H:%M')} for {self.name()}."]
        out.append(f"To do today ({len(todays)}):" if todays else "Nothing is planned for today yet.")
        out += [line(t) for t in todays]
        if overdue:
            out.append(f"Overdue ({len(overdue)}):")
            out += [line(t) for t in overdue[:10]]
        if later:
            out.append(f"Later or undated ({len(later)}):")
            out += [line(t) for t in later[:10]]
        out.append(
            f"Finished today: {', '.join(t['title'] for t in done_today)}." if done_today else "Nothing finished yet today."
        )
        out.append(f"Finished in the last 7 days: {done_week}.")
        goals = self.db.q("SELECT id, title, horizon FROM goals WHERE done=0 ORDER BY created_at")
        if goals:
            out.append("Goals:")
            for g in goals:
                steps = self.db.q("SELECT done FROM tasks WHERE goal_id=?", (g["id"],))
                progress = f" ({sum(s['done'] for s in steps)}/{len(steps)} steps done)" if steps else ""
                label = {"week": "this week", "month": "this month", "big": "big picture"}.get(g["horizon"], "")
                out.append(f"  - {g['title']} [{label}]{progress}")
        else:
            out.append("No goals written down yet.")
        jobs = self.db.q("SELECT title, company, status, next_step, next_date FROM jobs ORDER BY created_at DESC LIMIT 15")
        if jobs:
            out.append("Job tracker:")
            for j in jobs:
                nxt = f"; next: {j['next_step']} {j['next_date']}".rstrip() if j["next_step"] else ""
                at = f" at {j['company']}" if j["company"] else ""
                out.append(f"  - {j['title']}{at} [{j['status']}]{nxt}")
        else:
            out.append("Job tracker is empty.")
        return "\n".join(out)

    def _history(self, agent: str, instruction: str = "") -> list[dict]:
        rows = self.db.q(
            "SELECT sender, text FROM messages WHERE kind='chat' ORDER BY created_at DESC LIMIT ?", (HISTORY,)
        )[::-1]
        name = self.name()
        messages: list[dict] = []
        for row in rows:
            body = row["text"][:2000]
            if row["sender"] == agent:
                role, content = "assistant", body
            elif row["sender"] == "sunny":
                role, content = "user", f"{name}: {body}"
            else:
                who = AGENTS.get(row["sender"], {"name": row["sender"], "role": ""})
                role, content = "user", f"{who['name']} ({who['role']}): {body}"
            if messages and messages[-1]["role"] == role:
                messages[-1]["content"] += "\n\n" + content
            else:
                messages.append({"role": role, "content": content})
        while messages and messages[0]["role"] == "assistant":
            messages.pop(0)
        if instruction:
            closing = f"[Check-in] {instruction}"
        elif not messages or messages[-1]["role"] == "assistant":
            closing = f"[Check-in] The chat is quiet. Say something useful to {name} from your role."
        else:
            closing = ""
        if closing:
            if messages and messages[-1]["role"] == "user":
                messages[-1]["content"] += "\n\n" + closing
            else:
                messages.append({"role": "user", "content": closing})
        return messages

    # ── check-ins while Sunny is away ─────────────────────────────────────
    async def checkin(self, kind: str) -> bool:
        ready = self.providers.ready_agents()
        if not ready:
            return False
        name = self.name()
        day_number = self.now().timetuple().tm_yday
        coach = "claude" if "claude" in ready else ready[0]
        rotating = ready[day_number % len(ready)]
        plans = {
            "morning": ([coach], (
                f"It's morning and {name} hasn't opened the app yet. Write the message they will wake up to: "
                "name the one to three things that matter most today, taken from the list above, and the very first "
                "small step. If today's list is empty, propose up to two tasks and add them. Under 80 words."
            )),
            "nudge": ([rotating], (
                f"It's the afternoon and {name} hasn't ticked anything off today. Send a short, kind nudge: pick the "
                "easiest open item and shrink it into a ten-minute version. No guilt. Under 50 words."
            )),
            "evening": ([rotating], (
                f"It's evening. Write {name}'s wrap-up: name what got done today, however small, without flattery, "
                "then choose the first thing for tomorrow and add it as a task for tomorrow if it isn't listed. "
                "Under 70 words."
            )),
            "weekly": (ready, (
                f"It's the weekly review. From your own role, tell {name} in two or three sentences what moved this "
                "week, what is stuck, and the one thing you want them to do next week. Don't repeat teammates."
            )),
        }
        if kind not in plans:
            return False
        agents, instruction = plans[kind]
        posted = False
        async with self._lock:
            for agent in agents:
                posted = await self._speak(agent, instruction=instruction) or posted
        if posted:
            await self.notify_phone()
        return posted

    async def notify_phone(self) -> None:
        topic = self.db.get("ntfy_topic").strip()
        if not re.fullmatch(r"[A-Za-z0-9_-]{6,64}", topic):
            return
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                # Deliberately generic: nothing personal leaves the app this way.
                await client.post(f"https://ntfy.sh/{topic}", content="Your crew left you a message.",
                                  headers={"Title": "Crew"})
        except Exception:
            log.warning("phone alert failed")

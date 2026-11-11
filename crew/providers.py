"""The four model connections: Claude, GPT, Gemini and Grok."""
import base64
import hashlib
import os
import re

import anthropic
import openai
from cryptography.fernet import Fernet, InvalidToken

AGENTS: dict[str, dict] = {
    "claude": {
        "name": "Claude",
        "role": "Coach",
        "does": "keeps the plan honest and breaks goals into small steps",
        "kind": "anthropic",
        "env": ["ANTHROPIC_API_KEY"],
        "default_model": "claude-opus-5-5",
        "key_url": "https://console.anthropic.com",
    },
    "gpt": {
        "name": "GPT",
        "role": "Job hunter",
        "does": "CVs, cover letters, applications and interview practice",
        "kind": "openai",
        "base_url": None,
        "env": ["OPENAI_API_KEY"],
        "default_model": "auto",
        "key_url": "https://platform.openai.com",
    },
    "gemini": {
        "name": "Gemini",
        "role": "Researcher",
        "does": "how things work, training options, support Sunny may be entitled to",
        "kind": "openai",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env": ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
        "default_model": "auto",
        "key_url": "https://aistudio.google.com",
    },
    "grok": {
        "name": "Grok",
        "role": "Money ideas",
        "does": "realistic ways to earn soon, and blunt reality checks",
        "kind": "openai",
        "base_url": "https://api.x.ai/v1",
        "env": ["XAI_API_KEY"],
        "default_model": "auto",
        "key_url": "https://console.x.ai",
    },
}
ORDER = ["claude", "gpt", "gemini", "grok"]

# Claude models that accept the server-side refusal fallback.
_FALLBACK_MODELS = {"claude-fable-5-2", "claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"}

# Model ids that are not for plain text chat.
_NOT_CHAT = re.compile(
    r"embed|image|imagine|imagen|audio|tts|whisper|transcri|realtime|moderation|video|veo|sora|"
    r"dall|search|codex|code|vision|live|robotics|computer|guard|aqa|learnlm|gemma|deep-research|-pro\b",
    re.I,
)


class ProviderError(Exception):
    """A failure with a message that is safe and useful to show Sunny."""

    def __init__(self, message: str, model_missing: bool = False):
        super().__init__(message)
        self.model_missing = model_missing


class Providers:
    def __init__(self, db, secret: str):
        self.db = db
        self._fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest()))
        self.mock = os.environ.get("CREW_MOCK") == "1"

    # ── keys ──────────────────────────────────────────────────────────────
    def key(self, agent: str) -> str:
        for name in AGENTS[agent]["env"]:
            value = os.environ.get(name, "").strip()
            if value and "your_" not in value:
                return value
        stored = self.db.get(f"key_{agent}")
        if not stored:
            return ""
        try:
            return self._fernet.decrypt(stored.encode()).decode()
        except InvalidToken:
            return ""  # the secret changed; the key has to be entered again

    def key_source(self, agent: str) -> str:
        for name in AGENTS[agent]["env"]:
            value = os.environ.get(name, "").strip()
            if value and "your_" not in value:
                return "host"
        return "app" if self.key(agent) else ""

    def set_key(self, agent: str, key: str) -> None:
        key = key.strip()
        self.db.set(f"key_{agent}", self._fernet.encrypt(key.encode()).decode() if key else "")
        self.db.set(f"auto_model_{agent}", "")

    def enabled(self, agent: str) -> bool:
        return self.db.get(f"enabled_{agent}", "1") == "1"

    def ready(self, agent: str) -> bool:
        return self.enabled(agent) and (self.mock or bool(self.key(agent)))

    def ready_agents(self) -> list[str]:
        return [a for a in ORDER if self.ready(a)]

    # ── clients ───────────────────────────────────────────────────────────
    def _anthropic(self) -> anthropic.AsyncAnthropic:
        return anthropic.AsyncAnthropic(api_key=self.key("claude"), timeout=180.0, max_retries=2)

    def _openai(self, agent: str) -> openai.AsyncOpenAI:
        return openai.AsyncOpenAI(
            api_key=self.key(agent), base_url=AGENTS[agent]["base_url"], timeout=180.0, max_retries=2
        )

    # ── models ────────────────────────────────────────────────────────────
    async def list_models(self, agent: str) -> list[str]:
        """Text-chat model ids the key can use, best guess first."""
        if self.mock:
            return [f"mock-{agent}-large", f"mock-{agent}-small"]
        try:
            if AGENTS[agent]["kind"] == "anthropic":
                found = []
                async for m in self._anthropic().models.list(limit=100):
                    found.append((m.id, str(getattr(m, "created_at", "") or "")))
            else:
                found = []
                async for m in self._openai(agent).models.list():
                    found.append((m.id.removeprefix("models/"), int(getattr(m, "created", 0) or 0)))
        except (anthropic.APIError, openai.APIError) as exc:
            raise self._friendly(agent, exc) from exc
        return rank_models(agent, found)

    async def model(self, agent: str) -> str:
        chosen = self.db.get(f"model_{agent}") or AGENTS[agent]["default_model"]
        if chosen != "auto":
            return chosen
        cached = self.db.get(f"auto_model_{agent}")
        if cached:
            return cached
        ranked = await self.list_models(agent)
        if not ranked:
            raise ProviderError(
                f"{AGENTS[agent]['name']}'s key works but no chat model was found. Pick one in Settings."
            )
        self.db.set(f"auto_model_{agent}", ranked[0])
        return ranked[0]

    # ── chat ──────────────────────────────────────────────────────────────
    async def complete(self, agent: str, system: str, messages: list[dict]) -> str:
        if self.mock:
            return _mock_reply(agent, messages)
        if not self.key(agent):
            raise ProviderError(f"{AGENTS[agent]['name']} has no API key yet. Add one in Settings.")
        model = await self.model(agent)
        try:
            if AGENTS[agent]["kind"] == "anthropic":
                return await self._claude(model, system, messages)
            return await self._openai_chat(agent, model, system, messages)
        except (anthropic.APIError, openai.APIError) as exc:
            err = self._friendly(agent, exc, model)
            if err.model_missing:
                self.db.set(f"auto_model_{agent}", "")
            raise err from exc

    async def _claude(self, model: str, system: str, messages: list[dict]) -> str:
        client = self._anthropic()
        common = dict(model=model, max_tokens=16000, system=system, messages=messages)
        if model in _FALLBACK_MODELS:
            # If the model declines a request, the API retries it on a fallback model.
            resp = await client.beta.messages.create(
                **common,
                output_config={"effort": "medium"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        else:
            resp = await client.messages.create(**common)
        if resp.stop_reason == "refusal":
            raise ProviderError("Claude declined to answer that one.")
        text = "".join(block.text for block in resp.content if block.type == "text").strip()
        if not text:
            raise ProviderError("Claude sent back an empty reply.")
        return text

    async def _openai_chat(self, agent: str, model: str, system: str, messages: list[dict]) -> str:
        # No token limit is sent: the three services disagree on the parameter name,
        # and reply length is steered by the prompt instead.
        resp = await self._openai(agent).chat.completions.create(
            model=model, messages=[{"role": "system", "content": system}, *messages]
        )
        text = (resp.choices[0].message.content or "").strip() if resp.choices else ""
        if not text:
            raise ProviderError(f"{AGENTS[agent]['name']} sent back an empty reply.")
        return text

    def _friendly(self, agent: str, exc: Exception, model: str = "") -> ProviderError:
        name = AGENTS[agent]["name"]
        site = AGENTS[agent]["key_url"].removeprefix("https://")
        if isinstance(exc, (anthropic.AuthenticationError, openai.AuthenticationError)):
            return ProviderError(f"{name}'s API key was rejected. Check it in Settings.")
        if isinstance(exc, (anthropic.PermissionDeniedError, openai.PermissionDeniedError)):
            return ProviderError(f"{name}'s key isn't allowed to do this. Check the account at {site}.")
        if isinstance(exc, (anthropic.NotFoundError, openai.NotFoundError)):
            return ProviderError(
                f"{name} doesn't have a model called “{model}”. Pick another in Settings.", model_missing=True
            )
        if isinstance(exc, (anthropic.RateLimitError, openai.RateLimitError)):
            return ProviderError(
                f"{name} is out of credit or over its rate limit. Check billing at {site}, or try again shortly."
            )
        if isinstance(exc, (anthropic.APITimeoutError, openai.APITimeoutError)):
            return ProviderError(f"{name} took too long to answer.")
        if isinstance(exc, (anthropic.APIConnectionError, openai.APIConnectionError)):
            return ProviderError(f"Couldn't reach {name}. Check the internet connection.")
        if isinstance(exc, (anthropic.APIStatusError, openai.APIStatusError)):
            detail = str(getattr(exc, "message", "") or exc)[:200]
            if exc.status_code >= 500:
                return ProviderError(f"{name}'s service is having trouble ({exc.status_code}). Try again shortly.")
            missing = exc.status_code == 400 and "model" in detail.lower()
            return ProviderError(f"{name} refused the request ({exc.status_code}): {detail}", model_missing=missing)
        return ProviderError(f"{name} failed: {str(exc)[:200]}")


def rank_models(agent: str, found: list[tuple]) -> list[str]:
    """Order model ids so the first is a sensible everyday chat model."""
    family = {"claude": "claude", "gpt": "gpt", "gemini": "gemini", "grok": "grok"}[agent]
    chat = [(mid, made) for mid, made in found if mid.startswith(family) and not _NOT_CHAT.search(mid)]
    if agent == "claude":
        chat.sort(key=lambda m: (m[0] != AGENTS["claude"]["default_model"], _neg(m[1]), m[0]))
        return [m[0] for m in chat]
    if agent == "gemini":
        # The free tier covers Flash models, so those lead.
        def score(m):
            mid = m[0]
            return (
                mid != "gemini-flash-latest",
                "flash" not in mid,
                "lite" in mid,
                "preview" in mid or "exp" in mid,
                [-int(n) for n in re.findall(r"\d+", mid)[:2]],
            )
        chat.sort(key=score)
        return [m[0] for m in chat]
    # GPT and Grok: newest first, with dated snapshots behind their plain names.
    chat.sort(key=lambda m: (bool(re.search(r"\d{4}-?\d{2}-?\d{2}|\d{4}$", m[0])), _neg(m[1]), m[0]))
    return [m[0] for m in chat]


def _neg(made):
    if isinstance(made, int):
        return -made
    return [-ord(c) for c in made]  # newest ISO date first


def _mock_reply(agent: str, messages: list[dict]) -> str:
    last = messages[-1]["content"] if messages else ""
    if os.environ.get("CREW_MOCK_FAIL") == agent:
        raise ProviderError(f"{AGENTS[agent]['name']}'s API key was rejected. Check it in Settings.")
    if "[Check-in]" in last:
        return f"Morning Sunny. One thing first: open your CV file. [[task: Open CV and fix the top section | today]]"
    if agent == "gemini":
        return "PASS"
    if agent == "gpt":
        return "GPT: Agreed. Send me your last job title and I'll draft the CV summary. [[remember: Wants a job quickly]]"
    return f"Here's a small step for today, from {AGENTS[agent]['name']}. [[task: Write down three jobs you could do tomorrow | today]]"

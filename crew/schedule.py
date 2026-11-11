"""Check-ins that run while Sunny is away."""
import asyncio
import logging
from datetime import datetime, timedelta

log = logging.getLogger("crew")

DEFAULT_TIMES = {"morning": "08:00", "nudge": "14:30", "evening": "20:00", "weekly": "18:00"}
WINDOW = timedelta(hours=4)  # a missed check-in is still sent this long after its time


class Scheduler:
    def __init__(self, db, team):
        self.db = db
        self.team = team
        self._busy = False

    def time_for(self, kind: str) -> str:
        return self.db.get(f"time_{kind}", DEFAULT_TIMES[kind])

    def due(self, now: datetime) -> list[str]:
        if self.db.get("checkins", "1") != "1":
            return []
        out = []
        for kind in DEFAULT_TIMES:
            if self.db.get(f"on_{kind}", "1") != "1":
                continue
            if kind == "weekly" and now.weekday() != 6:  # Sunday
                continue
            try:
                hour, minute = (int(p) for p in self.time_for(kind).split(":"))
            except ValueError:
                continue
            at = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if not (at <= now < at + WINDOW):
                continue
            if self.db.q("SELECT key FROM runs WHERE key=?", (f"{kind}:{now.date().isoformat()}",)):
                continue
            out.append(kind)
        return out

    def _skip(self, kind: str, today: str) -> bool:
        if kind != "nudge":
            return False
        done = self.db.q("SELECT id FROM tasks WHERE done=1 AND done_day=? LIMIT 1", (today,))
        open_now = self.db.q("SELECT id FROM tasks WHERE done=0 AND due<>'' AND due<=? LIMIT 1", (today,))
        return bool(done) or not open_now

    async def tick(self) -> list[str]:
        """Send any check-in that is due. Safe to call as often as you like."""
        if self._busy:
            return []
        self._busy = True
        sent = []
        try:
            now = self.team.now()
            today = now.date().isoformat()
            for kind in self.due(now):
                if not self.team.providers.ready_agents():
                    break
                # Mark first, so a crash or a second caller can't send it twice.
                self.db.x("INSERT INTO runs (key, ran_at) VALUES (?, ?) ON CONFLICT (key) DO NOTHING",
                          (f"{kind}:{today}", now.isoformat()))
                if self._skip(kind, today):
                    continue
                if await self.team.checkin(kind):
                    sent.append(kind)
        except Exception:
            log.exception("tick failed")
        finally:
            self._busy = False
        return sent

    async def loop(self) -> None:
        while True:
            await self.tick()
            await asyncio.sleep(60)

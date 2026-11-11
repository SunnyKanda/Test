"""Storage. SQLite by default; Postgres when DATABASE_URL is set (for hosts with no disk)."""
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone

SCHEMA = [
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    """CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, sender TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'chat', text TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '{}')""",
    """CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '', due TEXT NOT NULL DEFAULT '', time TEXT NOT NULL DEFAULT '',
        done INTEGER NOT NULL DEFAULT 0, done_day TEXT NOT NULL DEFAULT '',
        top INTEGER NOT NULL DEFAULT 0, goal_id TEXT NOT NULL DEFAULT '',
        added_by TEXT NOT NULL DEFAULT 'sunny')""",
    """CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, title TEXT NOT NULL,
        why TEXT NOT NULL DEFAULT '', horizon TEXT NOT NULL DEFAULT 'month',
        done INTEGER NOT NULL DEFAULT 0, done_day TEXT NOT NULL DEFAULT '')""",
    """CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, title TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'lead', next_step TEXT NOT NULL DEFAULT '',
        next_date TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
        applied_day TEXT NOT NULL DEFAULT '')""",
    """CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, text TEXT NOT NULL,
        added_by TEXT NOT NULL DEFAULT 'sunny')""",
    "CREATE TABLE IF NOT EXISTS runs (key TEXT PRIMARY KEY, ran_at TEXT NOT NULL)",
    """CREATE TABLE IF NOT EXISTS usage (
        day TEXT NOT NULL, agent TEXT NOT NULL, calls INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, agent))""",
]

_lock = threading.RLock()
_last_stamp = ""


def stamp() -> str:
    """UTC timestamp that is strictly increasing, so it doubles as a message cursor."""
    global _last_stamp
    with _lock:
        s = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")
        if s <= _last_stamp:
            head, micro = _last_stamp.rsplit(".", 1)
            n = int(micro) + 1
            if n > 999999:  # practically unreachable; fall back to waiting it out
                while s <= _last_stamp:
                    s = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")
            else:
                s = f"{head}.{n:06d}"
        _last_stamp = s
        return s


def new_id() -> str:
    return uuid.uuid4().hex[:16]


class DB:
    def __init__(self, url: str | None = None, data_dir: str = "data"):
        self.url = url or ""
        self.pg = self.url.startswith(("postgres://", "postgresql://"))
        self.data_dir = data_dir
        self._conn = None
        if not self.pg:
            os.makedirs(data_dir, exist_ok=True)
            self.path = os.path.join(data_dir, "crew.db")
        for stmt in SCHEMA:
            self.x(stmt)
        self.version = 1  # bumped whenever tasks/goals/jobs/memory/settings change

    def _connect(self):
        if self.pg:
            import psycopg
            from psycopg.rows import dict_row
            return psycopg.connect(self.url, autocommit=True, row_factory=dict_row)
        conn = sqlite3.connect(self.path, check_same_thread=False, isolation_level=None)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _run(self, sql: str, params: tuple, fetch: bool):
        if self.pg:
            sql = sql.replace("?", "%s")
        with _lock:
            for attempt in (1, 2):
                try:
                    if self._conn is None:
                        self._conn = self._connect()
                    cur = self._conn.execute(sql, params)
                    rows = [dict(r) for r in cur.fetchall()] if fetch else None
                    return rows
                except Exception as exc:
                    # Hosted Postgres drops idle connections; reconnect once.
                    dropped = self.pg and type(exc).__name__ in ("OperationalError", "InterfaceError")
                    if dropped and attempt == 1:
                        try:
                            self._conn.close()
                        except Exception:
                            pass
                        self._conn = None
                        continue
                    raise

    def q(self, sql: str, params: tuple = ()) -> list[dict]:
        return self._run(sql, params, True)

    def x(self, sql: str, params: tuple = ()) -> None:
        self._run(sql, params, False)

    def bump(self):
        self.version += 1

    # settings
    def get(self, key: str, default: str = "") -> str:
        rows = self.q("SELECT value FROM settings WHERE key=?", (key,))
        return rows[0]["value"] if rows else default

    def set(self, key: str, value: str) -> None:
        self.x(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT (key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
        self.bump()

    def insert(self, table: str, row: dict) -> dict:
        row = {"id": new_id(), "created_at": stamp(), **row}
        cols = ", ".join(row)
        marks = ", ".join("?" for _ in row)
        self.x(f"INSERT INTO {table} ({cols}) VALUES ({marks})", tuple(row.values()))
        if table != "messages":
            self.bump()
        return row

    def update(self, table: str, row_id: str, changes: dict) -> None:
        if not changes:
            return
        sets = ", ".join(f"{k}=?" for k in changes)
        self.x(f"UPDATE {table} SET {sets} WHERE id=?", (*changes.values(), row_id))
        self.bump()

    def delete(self, table: str, row_id: str) -> None:
        self.x(f"DELETE FROM {table} WHERE id=?", (row_id,))
        self.bump()

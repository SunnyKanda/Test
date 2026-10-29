"""SQLite storage for PubPal: pubs and user-submitted suggestions."""

import json
import math
import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("PUBPAL_DB", os.path.join(os.path.dirname(__file__), "pubpal.db"))

# Yes / no / unknown fields. NULL in the database means "we don't know yet".
FACILITIES = [
    "shows_sports",
    "pool_table",
    "dog_friendly",
    "outdoor_seating",
    "baby_changing",
    "accessible",
]
DRINKS = [
    "real_ale",
    "craft_beer",
    "lager",
    "stout",
    "cider",
    "alcohol_free",
]
FLAGS = FACILITIES + DRINKS
DETAILS = ["name", "address", "postcode", "phone", "website"]

SCHEMA = f"""
CREATE TABLE IF NOT EXISTS pubs (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    address     TEXT,
    postcode    TEXT,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    phone       TEXT,
    website     TEXT,
    {", ".join(f"{f} INTEGER" for f in FLAGS)},
    claimed     INTEGER NOT NULL DEFAULT 0,   -- landlord-managed listing (future paid tier)
    is_demo     INTEGER NOT NULL DEFAULT 0,
    osm_id      TEXT UNIQUE,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suggestions (
    id          INTEGER PRIMARY KEY,
    pub_id      INTEGER REFERENCES pubs(id) ON DELETE CASCADE,  -- NULL = a new pub
    changes     TEXT NOT NULL,                                  -- JSON of proposed fields
    note        TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',                -- pending | approved | rejected
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA)


def _flag(value):
    return None if value is None else bool(value)


def pub_to_dict(row, distance_km=None):
    pub = {
        "id": row["id"],
        "name": row["name"],
        "address": row["address"],
        "postcode": row["postcode"],
        "lat": row["lat"],
        "lng": row["lng"],
        "phone": row["phone"],
        "website": row["website"],
        "facilities": {f: _flag(row[f]) for f in FACILITIES},
        "drinks": {d: _flag(row[d]) for d in DRINKS},
        "claimed": bool(row["claimed"]),
        "is_demo": bool(row["is_demo"]),
        "updated_at": row["updated_at"],
    }
    if distance_km is not None:
        pub["distance_km"] = round(distance_km, 2)
    return pub


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def find_pubs(lat, lng, radius_km, required=()):
    # Cheap bounding-box prefilter, then exact distance. Fine for a town's worth of pubs.
    dlat = radius_km / 111.0
    dlng = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.01))
    where = ["lat BETWEEN ? AND ?", "lng BETWEEN ? AND ?"]
    where += [f"{f} = 1" for f in required]
    with connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM pubs WHERE {' AND '.join(where)}",
            (lat - dlat, lat + dlat, lng - dlng, lng + dlng),
        ).fetchall()
    results = []
    for row in rows:
        d = haversine_km(lat, lng, row["lat"], row["lng"])
        if d <= radius_km:
            results.append(pub_to_dict(row, d))
    results.sort(key=lambda p: p["distance_km"])
    return results


def get_pub(pub_id):
    with connect() as conn:
        row = conn.execute("SELECT * FROM pubs WHERE id = ?", (pub_id,)).fetchone()
    return pub_to_dict(row) if row else None


def add_suggestion(pub_id, changes, note):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO suggestions (pub_id, changes, note) VALUES (?, ?, ?)",
            (pub_id, json.dumps(changes), note),
        )
        return cur.lastrowid


def list_suggestions(status="pending"):
    with connect() as conn:
        rows = conn.execute(
            """SELECT s.*, p.name AS pub_name FROM suggestions s
               LEFT JOIN pubs p ON p.id = s.pub_id
               WHERE s.status = ? ORDER BY s.created_at""",
            (status,),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "pub_id": r["pub_id"],
            "pub_name": r["pub_name"],
            "changes": json.loads(r["changes"]),
            "note": r["note"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def resolve_suggestion(suggestion_id, approve):
    """Approve (apply the changes) or reject a pending suggestion. Returns False if not found."""
    with connect() as conn:
        s = conn.execute(
            "SELECT * FROM suggestions WHERE id = ? AND status = 'pending'", (suggestion_id,)
        ).fetchone()
        if not s:
            return False
        if approve:
            changes = json.loads(s["changes"])
            if s["pub_id"] is None:
                cols = list(changes)
                conn.execute(
                    f"INSERT INTO pubs ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                    [changes[c] for c in cols],
                )
            elif changes:
                sets = ", ".join(f"{c} = ?" for c in changes)
                conn.execute(
                    f"UPDATE pubs SET {sets}, updated_at = datetime('now') WHERE id = ?",
                    [*changes.values(), s["pub_id"]],
                )
        conn.execute(
            "UPDATE suggestions SET status = ? WHERE id = ?",
            ("approved" if approve else "rejected", suggestion_id),
        )
        return True

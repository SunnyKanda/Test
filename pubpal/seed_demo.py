"""Load a handful of made-up pubs around Halifax town centre for trying the app out.

    python seed_demo.py

These are fictional and flagged as demo data; the app shows a banner while they
exist, and running import_osm.py removes them.
"""

import db

Y, N, U = 1, 0, None  # yes, no, unknown

# name, lat, lng, (sports, pool, dogs, outdoor, baby, accessible), (ale, craft, lager, stout, cider, alcohol-free)
DEMO_PUBS = [
    ("The Demo Arms", 53.7232, -1.8590, (Y, Y, Y, N, N, Y), (Y, N, Y, Y, Y, Y)),
    ("The Sample Inn", 53.7255, -1.8655, (N, N, Y, Y, U, Y), (Y, Y, Y, U, Y, Y)),
    ("The Placeholder Tap", 53.7210, -1.8640, (N, N, Y, N, N, N), (Y, Y, N, Y, Y, U)),
    ("The Test & Anchor", 53.7298, -1.8702, (Y, Y, N, Y, Y, Y), (N, N, Y, Y, Y, Y)),
    ("The Mock Turtle", 53.7175, -1.8520, (U, U, U, Y, U, U), (Y, U, Y, U, U, U)),
    ("The Pretend Fox", 53.7380, -1.8810, (Y, N, Y, Y, N, Y), (Y, N, Y, Y, N, Y)),
    ("The Example Hotel", 53.7100, -1.8950, (Y, Y, N, N, Y, Y), (N, N, Y, Y, Y, Y)),
]


def main():
    db.init_db()
    cols = ["name", "address", "postcode", "lat", "lng", *db.FACILITIES, *db.DRINKS, "is_demo"]
    rows = [
        (name, "Demo data – not a real pub", "HX1", lat, lng, *fac, *drinks, 1)
        for name, lat, lng, fac, drinks in DEMO_PUBS
    ]
    with db.connect() as conn:
        conn.execute("DELETE FROM pubs WHERE is_demo = 1")
        conn.executemany(
            f"INSERT INTO pubs ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})", rows
        )
    print(f"Loaded {len(rows)} demo pubs.")


if __name__ == "__main__":
    main()

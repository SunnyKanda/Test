"""Import Halifax pubs from OpenStreetMap into the PubPal database.

    python import_osm.py

Safe to re-run: new pubs are added, names and locations are refreshed, and any
facility or drink already set (by an approved suggestion or a landlord) is kept.
Removes the demo pubs the first time it imports real data.
"""

import json
import sys
import urllib.parse
import urllib.request

import db

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
# Halifax, West Yorkshire and its immediate surroundings (south, west, north, east).
HALIFAX_BBOX = (53.68, -1.95, 53.76, -1.80)


def overpass_query(bbox):
    box = ",".join(str(v) for v in bbox)
    return (
        "[out:json][timeout:60];"
        f'(node["amenity"="pub"]({box});way["amenity"="pub"]({box}););'
        "out center tags;"
    )


def _yes_no(value):
    if value in ("yes", "only", "designated"):
        return 1
    if value == "no":
        return 0
    return None


def element_to_pub(el):
    """Map an OpenStreetMap element to PubPal fields. Returns None if unusable."""
    tags = el.get("tags", {})
    lat = el.get("lat", el.get("center", {}).get("lat"))
    lng = el.get("lon", el.get("center", {}).get("lon"))
    if not tags.get("name") or lat is None or lng is None:
        return None

    street = " ".join(filter(None, [tags.get("addr:housenumber"), tags.get("addr:street")]))
    address = ", ".join(filter(None, [street, tags.get("addr:city") or tags.get("addr:town")]))
    sport = tags.get("sport", "")

    return {
        "osm_id": f"{el['type']}/{el['id']}",
        "name": tags["name"],
        "address": address or None,
        "postcode": tags.get("addr:postcode"),
        "lat": lat,
        "lng": lng,
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "website": tags.get("website") or tags.get("contact:website"),
        "shows_sports": None,  # OSM has no reliable tag for this; comes from suggestions

        "pool_table": 1 if any(s in sport for s in ("billiards", "pool", "snooker")) else None,
        "dog_friendly": _yes_no(tags.get("dog")),
        "outdoor_seating": _yes_no(tags.get("outdoor_seating") or tags.get("beer_garden")),
        "baby_changing": _yes_no(tags.get("changing_table")),
        "accessible": _yes_no(tags.get("wheelchair")),
        "real_ale": _yes_no(tags.get("real_ale") or tags.get("drink:real_ale")),
        "craft_beer": _yes_no(tags.get("drink:craft_beer")),
        "lager": _yes_no(tags.get("drink:lager")),
        "stout": _yes_no(tags.get("drink:stout")),
        "cider": _yes_no(tags.get("real_cider") or tags.get("drink:cider")),
        "alcohol_free": _yes_no(tags.get("drink:alcohol_free") or tags.get("drink:non_alcoholic")),
    }


def upsert(pubs):
    refresh = ["name", "address", "postcode", "lat", "lng", "phone", "website"]
    cols = list(pubs[0])
    update = [f"{c} = COALESCE(excluded.{c}, {c})" for c in refresh]
    # Never overwrite a known facility/drink with what OSM says.
    update += [f"{c} = COALESCE({c}, excluded.{c})" for c in db.FLAGS]
    sql = (
        f"INSERT INTO pubs ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))}) "
        f"ON CONFLICT(osm_id) DO UPDATE SET {', '.join(update)}, updated_at = datetime('now')"
    )
    with db.connect() as conn:
        conn.execute("DELETE FROM pubs WHERE is_demo = 1")
        conn.executemany(sql, [[p[c] for c in cols] for p in pubs])


def fetch(bbox):
    data = urllib.parse.urlencode({"data": overpass_query(bbox)}).encode()
    req = urllib.request.Request(OVERPASS_URL, data=data, headers={"User-Agent": "PubPal/0.1"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.load(resp)


def main():
    db.init_db()
    print("Fetching pubs from OpenStreetMap…")
    elements = fetch(HALIFAX_BBOX)["elements"]
    pubs = [p for p in map(element_to_pub, elements) if p]
    if not pubs:
        sys.exit("No pubs returned; nothing imported.")
    upsert(pubs)
    print(f"Imported {len(pubs)} pubs.")


if __name__ == "__main__":
    main()

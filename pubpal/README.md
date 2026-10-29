# PubPal

Find pubs near you in Halifax, West Yorkshire. Share your location, type a postcode, or tap the map, then pick a radius and filter by what matters to you:

- **Facilities:** shows sports, pool table, dog friendly, outdoor seating, baby changing, accessible
- **Drinks:** cask ale, craft beer, lager, stout, cider, alcohol-free (just "do they have it", not a full menu)

Anyone can suggest an edit or add a missing pub. Suggestions go live only after an admin approves them.

## Run it

```bash
cd pubpal
pip install -r requirements.txt

python import_osm.py        # load real Halifax pubs from OpenStreetMap (needs internet)
# or: python seed_demo.py   # a few made-up pubs, just to try it out

PUBPAL_ADMIN_TOKEN=pick-a-password uvicorn server:app --reload
```

Then open:

- http://localhost:8000: the app
- http://localhost:8000/admin: approve or reject suggestions (enter the token you chose)

Location sharing in the browser works on `localhost` and on any `https://` site. It won't work over plain `http://` on another address, such as testing from your phone across Wi-Fi.

## Tests

```bash
cd pubpal && python -m pytest -q tests
```

## How it fits together

| Piece            | What it does                                                    |
|------------------|-----------------------------------------------------------------|
| `server.py`      | FastAPI app: pub search, pub details, suggestions, admin        |
| `db.py`          | SQLite tables (`pubs`, `suggestions`) and the radius search     |
| `import_osm.py`  | Pulls `amenity=pub` from OpenStreetMap for the Halifax area. Safe to re-run: it never overwrites facilities or drinks you've already set |
| `seed_demo.py`   | Fictional demo pubs, clearly flagged in the UI                  |
| `static/`        | The web page: Leaflet map, filters, pub drawer, suggestion forms, admin page |

Every facility and drink is **yes / no / unknown**. Unknown shows as "?" so missing data never looks like a "no". Filters only match pubs where the answer is a known yes.

**Maps:** the map uses free OpenStreetMap tiles, which need no API key. The **Directions** button opens Google Maps, also with no key. Postcode lookup uses the free postcodes.io service.

**Later:** the `claimed` column marks landlord-managed listings. It's the hook for the paid "landlord fills in their own page" tier. Nothing uses it yet beyond a "✓ Landlord" badge.

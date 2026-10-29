# PubPal — Design Sketch

> Status: **phase 1 web app built**. See `README.md` to run it. The original sketch is kept below. Where it differs from the decisions here, the decisions win.

## Decisions (29 Oct 2026)

- **Web app first.** Native apps come later.
- **Pilot area:** Halifax, West Yorkshire.
- **No individual beers.** Craft pubs change their menu too often. Each pub just records yes / no / unknown for cask ale, craft beer, lager, stout, cider and alcohol-free. This replaces the `beers` and `pub_beers` tables in §5 with six columns on `pubs`.
- **Data:** anyone can suggest edits or new pubs, and an admin approves them. Long term, landlords pay to manage their own listing (`claimed` flag).
- **Free and open to browse,** with no accounts.
- **Maps:** browser location plus a free OpenStreetMap map, and a "Directions" button that opens Google Maps.
- **Simpler stack:** SQLite with a distance calculation in Python instead of PostGIS. That's plenty for one town.

## 1. What it does

PubPal shows you the pubs near you. You share your location (or drop a pin), pick a radius, and get a list and map of pubs in that circle. Each pub has a profile showing:

- **Beers on offer**, grouped by style: ales, stouts, lagers (plus room for ciders, IPAs and so on later)
- **Facilities**: shows sports, pool table, dog friendly, outdoor seating, baby changing, accessible

Filters let you narrow results: e.g. "dog friendly + outdoor seating + has a stout, within 2 km".

---

## 2. User flow

```
 ┌──────────────┐    ┌────────────────────┐    ┌──────────────────┐    ┌───────────────┐
 │ Open app     │──▶ │ Allow location?    │──▶ │ Results          │──▶ │ Pub detail    │
 │              │    │  yes → GPS coords  │    │ map + list       │    │ beers, venue  │
 │              │    │  no  → search a    │    │ radius slider    │    │ info,         │
 │              │    │        postcode    │    │ filter chips     │    │ directions    │
 └──────────────┘    └────────────────────┘    └──────────────────┘    └───────────────┘
```

## 3. Screen wireframes

### 3a. Results (map + list)

```
┌─────────────────────────────────────┐
│  PubPal              📍 Near me  ⚙  │
├─────────────────────────────────────┤
│  Radius:  ○───────●──────○   2 km   │
│  [🐶 Dogs] [⚽ Sports] [🎱 Pool]     │
│  [🌳 Outdoor] [🚼 Baby] [♿ Access]  │
│  Beer: [Ale] [Stout] [Lager]        │
├─────────────────────────────────────┤
│           . MAP VIEW .              │
│     🍺        (you)●       🍺       │
│          🍺   ╭─────╮               │
│               │ 2km │    🍺         │
│     🍺        ╰─────╯               │
├─────────────────────────────────────┤
│ The Red Lion            0.3 km  ›   │
│ 🐶 ⚽ 🌳 ♿   Ale·Stout·Lager        │
├─────────────────────────────────────┤
│ The Crown & Anchor      0.8 km  ›   │
│ 🎱 🌳 🚼     Ale·Lager              │
├─────────────────────────────────────┤
│ The Fox                 1.6 km  ›   │
│ 🐶 ⚽ 🎱     Stout·Lager            │
└─────────────────────────────────────┘
```

### 3b. Pub detail

```
┌─────────────────────────────────────┐
│ ‹ Back                              │
│  [ photo ]                          │
│  The Red Lion              0.3 km   │
│  12 High St, Anytown AB1 2CD        │
│  Open now · closes 23:00            │
│  [ Directions ]  [ Call ]           │
├─────────────────────────────────────┤
│  FACILITIES                         │
│  ✅ Shows sports    ❌ Pool table    │
│  ✅ Dog friendly    ✅ Outdoor seats │
│  ❌ Baby changing   ✅ Accessible    │
├─────────────────────────────────────┤
│  ON TAP                             │
│  Ales                               │
│   • Doom Bar             4.0%       │
│   • London Pride         4.1%       │
│  Stouts                             │
│   • Guinness             4.2%       │
│  Lagers                             │
│   • Camden Hells         4.6%       │
│                                     │
│  Last updated 3 days ago  [Suggest  │
│                            an edit] │
└─────────────────────────────────────┘
```

---

## 4. Architecture

```
┌──────────────────┐   HTTPS/JSON   ┌───────────────────┐       ┌─────────────────────────┐
│  Client          │ ─────────────▶ │  API server       │ ────▶ │  PostgreSQL + PostGIS   │
│  (web/PWA first, │                │  (Python/FastAPI) │       │  pubs, beers, pub_beers │
│   mobile later)  │ ◀───────────── │                   │       │  spatial index on loc   │
│  Leaflet map     │                └───────────────────┘       └─────────────────────────┘
│  browser GPS     │                         │
└──────────────────┘                         ▼ (one-off/periodic import)
                                   ┌───────────────────┐
                                   │ OpenStreetMap     │
                                   │ (amenity=pub)     │
                                   └───────────────────┘
```

Suggested stack (open to change):

| Layer    | Choice                          | Why                                                         |
|----------|---------------------------------|-------------------------------------------------------------|
| Client   | Web PWA, Leaflet + OSM tiles    | Works on any phone through the browser; no app-store step   |
| Location | Browser Geolocation API         | Built in; fall back to postcode lookup (postcodes.io in UK) |
| API      | Python + FastAPI                | Fits the Python already in this repo; quick to build        |
| DB       | PostgreSQL + PostGIS            | Proper "within X metres" queries with a spatial index       |
| Seed     | OpenStreetMap Overpass export   | Free, open pub locations; many have dog/outdoor/wheelchair tags |

Simpler fallback for a prototype: SQLite with plain lat/lng columns plus a Haversine distance calculation. That's fine up to a few thousand pubs.

---

## 5. Database schema

```
┌──────────────────────┐        ┌───────────────────┐        ┌──────────────────┐
│ pubs                 │        │ pub_beers         │        │ beers            │
├──────────────────────┤        ├───────────────────┤        ├──────────────────┤
│ id            PK     │◀──────┐│ pub_id    FK      │┌──────▶│ id          PK   │
│ name                 │       └│ beer_id   FK      ││       │ name             │
│ address              │        │ serving           │┘       │ brewery          │
│ postcode             │        │  (cask/keg/bottle)│        │ style  (enum)    │
│ location  geography  │        │ on_now   bool     │        │  ale|stout|lager │
│ phone, website       │        │ updated_at        │        │ abv              │
│ opening_hours  jsonb │        └───────────────────┘        └──────────────────┘
│ shows_sports   bool  │
│ pool_table     bool  │
│ dog_friendly   bool  │
│ outdoor_seating bool │
│ baby_changing  bool  │
│ accessible     bool  │
│ osm_id, source       │
│ created_at, updated_at│
└──────────────────────┘
```

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE beer_style AS ENUM ('ale', 'stout', 'lager');  -- extend later: cider, ipa, porter...

CREATE TABLE pubs (
    id               BIGSERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    address          TEXT,
    postcode         TEXT,
    location         GEOGRAPHY(POINT, 4326) NOT NULL,  -- lng/lat
    phone            TEXT,
    website          TEXT,
    opening_hours    JSONB,
    -- facilities: NULL = unknown, which is different from false
    shows_sports     BOOLEAN,
    pool_table       BOOLEAN,
    dog_friendly     BOOLEAN,
    outdoor_seating  BOOLEAN,
    baby_changing    BOOLEAN,
    accessible       BOOLEAN,
    osm_id           BIGINT UNIQUE,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX pubs_location_gix ON pubs USING GIST (location);

CREATE TABLE beers (
    id        BIGSERIAL PRIMARY KEY,
    name      TEXT NOT NULL,
    brewery   TEXT,
    style     beer_style NOT NULL,
    abv       NUMERIC(3,1),
    UNIQUE (name, brewery)
);

CREATE TABLE pub_beers (
    pub_id     BIGINT REFERENCES pubs(id) ON DELETE CASCADE,
    beer_id    BIGINT REFERENCES beers(id) ON DELETE CASCADE,
    serving    TEXT,                 -- 'cask' | 'keg' | 'bottle'
    on_now     BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (pub_id, beer_id)
);
```

**Design notes**

- **Facilities as columns rather than a tags table.** The list is short and fixed, so plain columns keep the filter SQL simple. If the list grows past about 15, move to a `features` table plus a `pub_features` join table.
- **Nullable booleans.** `NULL` means "we don't know", and the UI shows a `?`. Without this, missing data would look like a "no".
- **Beers are shared across pubs.** "Guinness" is one row that many pubs link to, which lets you search for every pub serving a given beer.

### Core query: pubs within a radius, with filters

```sql
SELECT p.id, p.name,
       ST_Distance(p.location, ST_MakePoint(:lng, :lat)::geography) AS distance_m
FROM pubs p
WHERE ST_DWithin(p.location, ST_MakePoint(:lng, :lat)::geography, :radius_m)
  AND (:dog_friendly IS NOT TRUE OR p.dog_friendly)
  AND (:outdoor      IS NOT TRUE OR p.outdoor_seating)
  -- ...one line per facility filter
  AND (:style IS NULL OR EXISTS (
        SELECT 1 FROM pub_beers pb JOIN beers b ON b.id = pb.beer_id
        WHERE pb.pub_id = p.id AND pb.on_now AND b.style = :style))
ORDER BY distance_m
LIMIT 50;
```

---

## 6. API sketch

| Method | Endpoint                         | Purpose                                   |
|--------|----------------------------------|-------------------------------------------|
| GET    | `/pubs?lat=&lng=&radius=`        | Pubs in the radius, nearest first         |
|        | `&dog_friendly=true&style=stout` | Optional filters (any facility or style)  |
| GET    | `/pubs/{id}`                     | Full pub detail, including its beer list  |
| GET    | `/beers?q=guinness`              | Search beers                              |
| POST   | `/pubs/{id}/suggestions`         | User-submitted correction (moderated)     |
| POST   | `/admin/pubs`, `PUT /admin/pubs/{id}` | Add or edit pubs (admin/landlord)    |

Example response for `GET /pubs?lat=51.5&lng=-0.12&radius=2000`:

```json
{
  "results": [
    {
      "id": 42,
      "name": "The Red Lion",
      "distance_m": 310,
      "location": { "lat": 51.5021, "lng": -0.1189 },
      "facilities": {
        "shows_sports": true, "pool_table": false, "dog_friendly": true,
        "outdoor_seating": true, "baby_changing": null, "accessible": true
      },
      "styles_available": ["ale", "stout", "lager"]
    }
  ]
}
```

Radius limits: default 2 km, max 25 km, with a slider in steps such as 0.5, 1, 2, 5, 10 and 25 km.

---

## 7. Where the data comes from

The hard part of this app is the data, not the code.

1. **Pub locations.** Import every `amenity=pub` from OpenStreetMap via Overpass. That covers name, address and coordinates, and often `dog=yes`, `outdoor_seating=yes`, `wheelchair=yes`, `changing_table=yes` and `sport=*`.
2. **Beers.** Rarely available as open data. Options:
   - Crowdsourced: users tap "What's on tap?" and add or confirm beers.
   - Landlord accounts: pubs claim their listing and keep it up to date.
   - Seed a small set by hand for a pilot area.
3. **Freshness.** Store `updated_at` on everything and show "last updated N days ago". Beer lists go stale quickly.

---

## 8. Build phases (when we do build)

| Phase | Scope                                                                 |
|-------|-----------------------------------------------------------------------|
| 1 MVP | OSM import for one town/city, radius search, map + list, facility filters, pub detail page |
| 2     | Beer DB with style filter, user suggestions plus a simple admin review |
| 3     | Landlord claim/edit accounts, photos, opening hours, "open now" filter |
| 4     | Native mobile app, favourites, reviews, events (quiz night, live sport fixtures) |

---

## 9. Open questions

- **Platform:** web/PWA first, or straight to a native iOS/Android app?
- **Area:** UK only to start (postcodes, cask ale culture)? Which town should the pilot cover?
- **Beer data:** crowdsourced, landlord-maintained, or both?
- **Extra beer styles:** add cider, IPA, porter, and alcohol-free now, or later?
- **Accounts:** do users need to log in to browse, or only to suggest edits?

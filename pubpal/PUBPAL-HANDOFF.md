# PubPal: project handoff

This document describes PubPal and contains the complete source code. It was written so another AI assistant or developer can review it, test it and carry on building it without needing access to the GitHub repository.

**For the reviewer:** please read sections 1 to 6, then the code in section 7. Useful things to do:
- Review the code for bugs and security problems.
- Suggest how to tackle the items in section 5.
- If you write changes, give complete replacement files, because the owner copies them in by hand.

---

## 1. What PubPal is

A free mobile web app that shows people the pubs near them. The pilot area is **Halifax, West Yorkshire, UK**.

- **Find pubs:** use your phone's location (**Near me**), type a postcode, or tap the map, then pick a distance (500 m to 25 km).
- **See them:** a map with pub dots and a list, nearest first.
- **Filter by facilities:** shows sports, pool table, dog friendly, outdoor seating, baby changing, accessible.
- **Filter by drinks:** cask ale, craft beer, lager, stout, cider, alcohol-free. This is only "do they have it", never a beer menu, because craft pubs change their beers constantly.
- **Yes / no / unknown:** every facility and drink is one of the three. Unknown shows as "?" so missing data never looks like a "no". Filters only match a known yes.
- **Pub page:** address, distance, a Directions button (opens Google Maps), Call and Website buttons when known, and the yes/no/? grid.
- **Suggestions:** anyone can suggest an edit or add a missing pub (dragging a pin on a small map). No account is needed. Nothing goes live until the admin approves it.
- **Admin page:** you set the password on your first visit. It has buttons to import real Halifax pubs from OpenStreetMap or load made-up demo pubs, and a list of suggestions to approve or reject.
- **Business plan:** eventually landlords pay to manage their own listing. Only a `claimed` database column and a "✓ Landlord" badge exist for this so far.

### Decisions the owner has made
- **Web app first,** with no native iPhone/Android app yet.
- **Free to browse,** with no user accounts.
- **Simple data:** drink *types* only, never specific beers.
- **Hosting:** SiteGround shared hosting, which means plain PHP with no build step, no Node and no Python on the server.
- **Map:** free OpenStreetMap tiles drawn with Leaflet. Google Maps is used only for the Directions link, so no API key or billing is needed.
- **Visual design "Brightside":**
  - **Colours:** coral `#F96363` (deeper `#D7383F` for buttons, so white text is readable), butter `#F9DB8E`, mint `#B2E3C6`, navy ink `#193049`, on white.
  - **Fonts:** Plus Jakarta Sans for headings, DM Sans for body text.
  - **Logo:** a smiling map pin.
  - **Dark mode:** follows the phone's setting.

---

## 2. How it's built

```
Browser (index.html + app.js + style.css, Leaflet 1.9.4 from unpkg)
   │  fetch("api.php?action=…")            postcodes.io (postcode → lat/lng, called from the browser)
   ▼                                        tile.openstreetmap.org (map tiles)
api.php  ── lib/db.php   (PDO: SQLite file data/pubpal.sqlite by default, or MySQL if config.php is filled in)
         └─ lib/osm.php  (imports pubs from the OpenStreetMap Overpass API; also loads the demo pubs)
admin.html (same API, sends the admin password in an X-Admin-Password header)
```

**Database tables** (created automatically on first request):
- **`pubs`:**
  - details: `id, name, address, postcode, lat, lng, phone, website`
  - 12 flag columns, each `SMALLINT NULL` (1 = yes, 0 = no, NULL = unknown): `shows_sports, pool_table, dog_friendly, outdoor_seating, baby_changing, accessible, real_ale, craft_beer, lager, stout, cider, alcohol_free`
  - other: `claimed, is_demo, osm_id (unique), updated_at`
- **`suggestions`:** `id, pub_id` (NULL means a new pub), `changes` (JSON), `note, status` (pending/approved/rejected), `created_at`.
- **`settings`:** `name, value`. Holds the admin password hash.

Column names are quoted with backticks in SQL because `accessible` is a reserved word in MySQL.

**Radius search:** the database pre-filters a bounding box, then PHP works out the exact (haversine) distance and sorts by it. That's fine for one town's worth of pubs.

**API actions** (`api.php?action=`):

| Action | Method | What it does |
|---|---|---|
| `pubs&lat=&lng=&radius_km=&has=a,b` | GET | Pubs in the radius with every listed flag = yes, nearest first |
| `pub&id=` | GET | One pub |
| `suggest_edit&id=` | POST JSON `{flags:{key:bool}, name?, address?, postcode?, phone?, website?, note?}` | Suggest a change (pending) |
| `suggest_pub` | POST JSON `{name, lat, lng, address?, postcode?, flags, note?}` | Suggest a new pub (pending) |
| `admin_status` | GET | Whether a password is set, plus pub counts |
| `admin_setup` | POST `{password}` | First-time password (refused once one is set) |
| `admin_suggestions` | GET (admin) | Pending suggestions and pub counts |
| `admin_resolve&id=&decision=approve\|reject` | POST (admin) | Approve (applies the changes) or reject |
| `admin_import` | POST (admin) | Import Halifax pubs from OpenStreetMap. Safe to re-run: never overwrites a known flag, and removes the demo pubs |
| `admin_demo` | POST (admin) | Load 7 made-up demo pubs |

---

## 3. Putting it on SiteGround

1. **Upload:** in Site Tools, open **File Manager** → `public_html`. Create a `pubpal` folder, upload the files from section 7 (or `pubpal-siteground.zip`) and extract them.
2. **Check settings:** PHP 8.1 or newer (**Devs → PHP Manager**), and an SSL certificate, because phones only share location with `https://` sites.
3. **Set the admin password:** open `https://yoursite/pubpal/admin.html` immediately.
4. **Load pubs:** tap **Import Halifax pubs**.
5. **Open the app:** `https://yoursite/pubpal/`.
6. **If the database fails:** SQLite may be unavailable. Create a MySQL database in Site Tools and fill in `config.php`.

---

## 4. What has been tested

**Tested:**
- **Automated tests:** 22 pass (`tests/test_api.py`). They drive the API through PHP's built-in server against **SQLite and MariaDB**, using a fake OpenStreetMap server. They cover:
  - radius search and filters
  - input validation
  - suggestion → approve/reject
  - new pubs
  - the admin password (including that nobody can reset it once set)
  - the OSM import, including that approved corrections survive a re-import
- **Browser click-through:** done on **Apache with PHP 8.3** (similar to SiteGround), in a phone-sized headless Chrome. It covered:
  - setting the password
  - loading demo pubs
  - Near me, filters and the no-results screen
  - the pub page
  - suggesting an edit
  - adding a pub with the pin map
  - approving both suggestions
  - a wrong password being refused

  There were no JavaScript errors and no sideways scrolling.
- **Privacy:** on Apache, `.htaccess` blocks `config.php`, `lib/`, `data/` and the SQLite file (403).

**Not tested:**
- **On SiteGround itself:** it hasn't been uploaded anywhere yet.
- **Real OpenStreetMap import:** the test machine had no internet access. The import code is tested only against a fake server.
- **Real map tiles and postcode lookup:** both were blocked on the test machine, so the map was grey.
- **On a real phone:** location sharing on a real phone has not been tried.

---

## 5. Outstanding work

### Needs doing before real people use it
- [ ] **Deploy and test** on SiteGround with the real OpenStreetMap import, real phone GPS and real map tiles.
- [ ] **Spam protection** on the suggestion forms. There's currently no rate limiting, hidden spam trap (honeypot) or CAPTCHA, so a bot could flood the approval list. Nothing goes live without approval, so the harm is limited to clutter.
- [ ] **Admin password reset.** There is none. The only way is to delete the `admin_password` row from `settings` (or delete the SQLite file, which wipes everything).
- [ ] **Admin setup window.** The first person to visit `admin.html` sets the password, so it must be set right after uploading.
- [ ] **Login rate limit.** The only protection on the admin login is a 0.5 s delay after each wrong password.
- [ ] **Backups** of `data/pubpal.sqlite` (or of the MySQL database).
- [ ] **Privacy page** saying location is used only in the browser to search and is never stored, plus a contact address.
- [ ] **HTTPS redirect.** There's no `.htaccess` rule forcing it yet; SiteGround can force HTTPS in its settings instead.
- [ ] **Map tile limits.** OpenStreetMap's free tile servers have a fair-use policy. That's fine for a pilot, but a busy app would need a tile provider (e.g. MapTiler, Stadia or Thunderforest, all of which have free tiers).

### Missing features
- **Admin tools:**
  - edit or delete a pub directly
  - edit a suggestion before approving it
  - spot duplicate pubs
  - a history of changes
  - email alerts when a suggestion arrives
  - more than one admin
- **Landlord accounts (the paid tier):** sign-up, claiming a pub, verifying ownership, the landlord editing their own listing without approval, and payments (e.g. Stripe). Only the `claimed` column and badge exist.
- **More pub information:** opening hours and an "open now" filter, photos, a short description, events (quiz nights, live music, which sports fixtures are shown), food served, and a finer accessibility breakdown (step-free entrance vs accessible toilet).
- **Search:** by pub name, and by area or village name rather than just postcode.
- **For users:** favourites, sharing a pub link (the pub page has no URL of its own yet), reviews or ratings, and "last confirmed by a visitor" freshness.
- **Scaling up:** grouping map markers when there are many pubs, a limit or paging on the list, and covering areas beyond the Halifax import box.
- **App feel:** installable home-screen app (web manifest and service worker), offline use, and a dark map style in dark mode.
- **Analytics:** none yet. A privacy-friendly option is Plausible or Umami.
- **Native apps:** iPhone and Android apps later.

### Data quality
- **Sports and drinks:** OpenStreetMap rarely records these, so most pubs will show "?" until suggestions or landlords fill them in.
- **Shows sports:** never imported, because OSM has no reliable tag for it.

---

## 6. What the previous assistant couldn't do

- **Hosting:** log in to SiteGround, upload files, or set up the domain, SSL or database.
- **Internet:** reach the internet from its sandbox, so no real OpenStreetMap, map tiles or postcodes.io during testing.
- **Phone testing:** test on a real phone or with real GPS.
- **Paid services:** set up payment, email or Google Maps API accounts.
- **Legal:** give legal advice on privacy or terms.

---

## 7. Source code

Upload everything inside `site/` to the web server. `tests/` is for development only and isn't uploaded.

```
site/
  .htaccess          blocks config.php, turns off folder listings
  index.html         the app page
  app.js             app logic (map, search, filters, pub sheet, suggestion forms)
  style.css          Brightside styles (also used by admin.html)
  admin.html         admin page (password, import, approve)
  logo.svg           logo and favicon
  api.php            JSON API
  config.php         optional MySQL settings
  lib/.htaccess      Require all denied
  lib/db.php         database layer
  lib/osm.php        OpenStreetMap import and demo pubs
  data/.htaccess     Require all denied (SQLite file is created here)
tests/
  test_api.py        pytest end-to-end tests
```

### `site/.htaccess`

````apache
# PubPal: keep settings and the database private.
<Files "config.php">
  Require all denied
</Files>
Options -Indexes
DirectoryIndex index.html
````

### `site/index.html`

````html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>PubPal – pubs near you in Halifax</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap">
  <link rel="icon" href="logo.svg">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="layout">
    <section class="side">
      <header class="brandline">
        <div class="brand"><img src="logo.svg" alt="" class="mark">PubPal</div>
        <span class="place">Halifax, West Yorkshire</span>
      </header>

      <div>
        <p class="eyebrow">Good places, good company</p>
        <h1>Find your <em>kind</em> of pub.</h1>
      </div>

      <p id="demo-banner" class="notice" hidden>
        <strong>Showing made-up demo pubs.</strong> Real Halifax pubs can be loaded from the admin page.
      </p>

      <form id="postcode-form" class="search">
        <span aria-hidden="true">⌕</span>
        <input id="postcode" placeholder="Postcode, e.g. HX1 1RE" autocomplete="postal-code" aria-label="Postcode">
        <button type="submit" class="search-go">Go</button>
      </form>

      <div class="pills">
        <button type="button" id="locate" class="pill" aria-pressed="false">◎ Near me</button>
        <button type="button" id="radius-pill" class="pill" aria-pressed="false"></button>
        <button type="button" id="filter-pill" class="pill" aria-pressed="false"></button>
      </div>
      <p id="where-status" class="status-line"></p>

      <div id="panel" class="panel" hidden>
        <div><p class="group">Distance <span id="radius-label"></span></p><div class="pills" id="radii"></div></div>
        <div><p class="group">Facilities</p><div class="opts" id="facility-opts"></div></div>
        <div><p class="group">Drinks available</p><div class="opts" id="drink-opts"></div></div>
        <button type="button" class="btn" id="panel-done"></button>
        <button type="button" class="btn soft" id="panel-clear">Clear filters</button>
      </div>

      <div class="map-wrap"><div id="map"></div></div>

      <div class="listhead"><strong>Nearby places</strong><span id="result-count"></span></div>
      <ul id="results" class="results"></ul>

      <button type="button" id="add-pub" class="btn soft">⊕ Add a missing pub</button>
    </section>
  </main>

  <div id="scrim" class="scrim" hidden></div>
  <aside id="drawer" class="drawer" hidden role="dialog" aria-modal="true">
    <div class="drawer-in" id="drawer-body"></div>
  </aside>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="app.js"></script>
</body>
</html>
````

### `site/app.js`

````javascript
// PubPal front end: map, search, pub details and suggestions.

const HALIFAX = { lat: 53.7245, lng: -1.8616 }; // town centre, used until we know where you are
const RADII_KM = [0.5, 1, 2, 5, 10, 25];

const FACILITIES = {
  shows_sports: "Shows sports",
  pool_table: "Pool table",
  dog_friendly: "Dog friendly",
  outdoor_seating: "Outdoor seating",
  baby_changing: "Baby changing",
  accessible: "Accessible",
};
const DRINKS = {
  real_ale: "Cask ale",
  craft_beer: "Craft beer",
  lager: "Lager",
  stout: "Stout",
  cider: "Cider",
  alcohol_free: "Alcohol-free",
};
// Short labels for the tags under each pub in the list, in order of priority.
const TAGS = {
  dog_friendly: "Dogs ✓",
  accessible: "Step-free ✓",
  outdoor_seating: "Outdoor ✓",
  alcohol_free: "Alcohol-free ✓",
  shows_sports: "Sports ✓",
  pool_table: "Pool ✓",
  baby_changing: "Baby change ✓",
};

const state = {
  centre: { ...HALIFAX },
  radiusKm: 2,
  filters: new Set(),
  panelOpen: false,
  pubs: [],
  markers: new Map(),
};

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${Number(km.toFixed(km < 10 ? 1 : 0))} km`);
const flagsOf = (p) => ({ ...p.facilities, ...p.drinks });

// ─── Map ──────────────────────────────────────────────────────────────────────

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const map = L.map("map").setView([HALIFAX.lat, HALIFAX.lng], 14);
L.tileLayer(TILES, { maxZoom: 19, attribution: TILE_CREDIT }).addTo(map);

const youMarker = L.circleMarker([HALIFAX.lat, HALIFAX.lng], {
  radius: 7, color: "#fff", weight: 3, fillColor: "#3f87e8", fillOpacity: 1,
}).addTo(map).bindTooltip("Search centre");
const radiusCircle = L.circle([HALIFAX.lat, HALIFAX.lng], {
  radius: state.radiusKm * 1000, color: "#f96363", weight: 2, dashArray: "6 6", fillColor: "#f96363", fillOpacity: 0.07,
}).addTo(map);

const pubIcon = (nearest) =>
  L.divIcon({ className: "", html: `<div class="pub-dot${nearest ? " nearest" : ""}"></div>`, iconSize: nearest ? [26, 26] : [22, 22] });

// Tap anywhere on the map to search from there.
map.on("click", (e) => setCentre(e.latlng.lat, e.latlng.lng, "Searching from the point you tapped."));

// ─── Search ───────────────────────────────────────────────────────────────────

function setCentre(lat, lng, message, { nearMe = false } = {}) {
  state.centre = { lat, lng };
  youMarker.setLatLng([lat, lng]);
  radiusCircle.setLatLng([lat, lng]);
  $("locate").setAttribute("aria-pressed", nearMe);
  $("where-status").textContent = message || "";
  search({ fit: true });
}

async function search({ fit = false } = {}) {
  const { lat, lng } = state.centre;
  const params = new URLSearchParams({ lat, lng, radius_km: state.radiusKm, has: [...state.filters].join(",") });
  try {
    const res = await fetch(`api.php?action=pubs&${params}`);
    if (!res.ok) throw new Error();
    state.pubs = (await res.json()).results;
  } catch {
    $("where-status").textContent = "Couldn't load pubs. Check your connection and try again.";
    return;
  }
  renderControls();
  renderResults();
  if (fit) map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
}

function nextRadius() {
  return RADII_KM[Math.min(RADII_KM.indexOf(state.radiusKm) + 1, RADII_KM.length - 1)];
}

function setRadius(km) {
  state.radiusKm = km;
  radiusCircle.setRadius(km * 1000);
  search({ fit: true });
}

function renderControls() {
  const n = state.pubs.length;
  $("radius-pill").textContent = `↔ ${formatKm(state.radiusKm)}`;
  $("filter-pill").innerHTML = `☷ Filters${state.filters.size ? `<span class="n">${state.filters.size}</span>` : ""}`;
  $("filter-pill").setAttribute("aria-pressed", state.panelOpen);
  $("panel").hidden = !state.panelOpen;
  $("radius-label").textContent = formatKm(state.radiusKm);
  $("radii").innerHTML = RADII_KM
    .map((km) => `<button type="button" class="pill" data-km="${km}" aria-pressed="${km === state.radiusKm}">${formatKm(km)}</button>`)
    .join("");
  const opts = (labels) => Object.entries(labels).map(([key, label]) => {
    const on = state.filters.has(key);
    return `<button type="button" class="opt" data-key="${key}" aria-pressed="${on}"><span>${label}</span><span class="box">${on ? "✓" : ""}</span></button>`;
  }).join("");
  $("facility-opts").innerHTML = opts(FACILITIES);
  $("drink-opts").innerHTML = opts(DRINKS);
  $("panel-done").textContent = `See ${n} matching place${n === 1 ? "" : "s"} →`;
}

function renderResults() {
  for (const m of state.markers.values()) m.remove();
  state.markers.clear();

  $("demo-banner").hidden = !state.pubs.some((p) => p.is_demo);
  const n = state.pubs.length;
  $("result-count").textContent = n ? `${n} within ${formatKm(state.radiusKm)} · nearest first` : "";

  $("results").innerHTML = n
    ? state.pubs.map((p) => {
      const flags = flagsOf(p);
      const tags = (p.claimed ? ['<span class="tag landlord">✓ Landlord</span>'] : [])
        .concat(Object.keys(TAGS).filter((k) => flags[k]).slice(0, 3).map((k) => `<span class="tag">${TAGS[k]}</span>`))
        .join("");
      const drinks = Object.keys(DRINKS).filter((k) => flags[k]).map((k) => DRINKS[k]).join(" · ");
      return `<li><button type="button" class="row" data-id="${p.id}">
        <span class="thumb"></span>
        <span class="row-main">
          <span class="row-top"><b>${esc(p.name)}</b><span>↗ ${formatKm(p.distance_km)}</span></span>
          <span class="tags">${tags}</span>
          <span class="drinks">${drinks}</span>
        </span></button></li>`;
    }).join("")
    : `<li class="empty"><b>No pubs found</b>
        <p>Nothing matched within ${formatKm(state.radiusKm)}${state.filters.size ? " with those filters" : ""}. Try a bigger distance or clear a filter.</p>
        ${state.radiusKm < RADII_KM.at(-1) ? `<button type="button" class="btn" id="widen">Try ${formatKm(nextRadius())} →</button>` : ""}</li>`;

  state.pubs.forEach((p, i) => {
    const marker = L.marker([p.lat, p.lng], { icon: pubIcon(i === 0), title: p.name, zIndexOffset: i === 0 ? 1000 : 0 })
      .addTo(map)
      .on("click", () => openPub(p.id));
    if (i === 0) marker.bindTooltip(`Nearest · ${formatKm(p.distance_km)}`, { permanent: true, direction: "top", offset: [0, -12], className: "nearest-tip" });
    else marker.bindTooltip(`${p.name} · ${formatKm(p.distance_km)}`);
    state.markers.set(p.id, marker);
  });
}

$("results").addEventListener("click", (e) => {
  if (e.target.closest("#widen")) return setRadius(nextRadius());
  const row = e.target.closest(".row");
  if (row) openPub(Number(row.dataset.id));
});

// ─── Controls ─────────────────────────────────────────────────────────────────

$("locate").addEventListener("click", () => {
  if (!navigator.geolocation) {
    $("where-status").textContent = "Your browser can't share location. Try a postcode instead.";
    return;
  }
  $("where-status").textContent = "Finding you…";
  navigator.geolocation.getCurrentPosition(
    (pos) => setCentre(pos.coords.latitude, pos.coords.longitude, "Showing pubs near you.", { nearMe: true }),
    () => ($("where-status").textContent = "Couldn't get your location. Try a postcode, or tap the map."),
    { enableHighAccuracy: true, timeout: 10000 },
  );
});

$("postcode-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pc = $("postcode").value.trim();
  if (!pc) return;
  $("where-status").textContent = "Looking up postcode…";
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
    if (!res.ok) throw new Error();
    const { result } = await res.json();
    setCentre(result.latitude, result.longitude, `Showing pubs near ${result.postcode}.`);
  } catch {
    $("where-status").textContent = "Couldn't find that postcode. Check it and try again.";
  }
});

$("radius-pill").addEventListener("click", () => setRadius(RADII_KM[(RADII_KM.indexOf(state.radiusKm) + 1) % RADII_KM.length]));
$("filter-pill").addEventListener("click", () => {
  state.panelOpen = !state.panelOpen;
  renderControls();
});
$("panel-done").addEventListener("click", () => {
  state.panelOpen = false;
  renderControls();
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("panel-clear").addEventListener("click", () => {
  state.filters.clear();
  search();
});
$("panel").addEventListener("click", (e) => {
  const r = e.target.closest("[data-km]");
  if (r) return setRadius(Number(r.dataset.km));
  const opt = e.target.closest(".opt");
  if (!opt) return;
  const key = opt.dataset.key;
  state.filters.has(key) ? state.filters.delete(key) : state.filters.add(key);
  search();
});

// ─── Pub sheet ────────────────────────────────────────────────────────────────

let pinMap = null;

function openDrawer(html) {
  if (pinMap) { pinMap.remove(); pinMap = null; }
  $("drawer-body").innerHTML = html;
  $("drawer").hidden = false;
  $("scrim").hidden = false;
  $("drawer").scrollTop = 0;
}
function closeDrawer() {
  if (pinMap) { pinMap.remove(); pinMap = null; }
  $("drawer").hidden = true;
  $("scrim").hidden = true;
  document.querySelectorAll(".row.active").forEach((r) => r.classList.remove("active"));
}
$("scrim").addEventListener("click", closeDrawer);
$("drawer").addEventListener("click", (e) => { if (e.target.closest(".close")) closeDrawer(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("drawer").hidden) closeDrawer(); });

const sheetHead = (title, sub, extra = "") => `
  <div class="grab"></div>
  <div class="sheet-head">
    <div><h2>${esc(title)}</h2>${sub ? `<p class="loc">${sub}</p>` : ""}${extra}</div>
    <button type="button" class="close" aria-label="Close">✕</button>
  </div>`;

function statusTile(value, label) {
  const [cls, mark, word] = value === true ? ["yes", "✓", "Yes"] : value === false ? ["no", "×", "No"] : ["unknown", "?", "Not known yet"];
  return `<div class="st"><span>${label}</span><span class="dot ${cls}" title="${word}" aria-label="${word}">${mark}</span></div>`;
}

async function openPub(id) {
  const res = await fetch(`api.php?action=pub&id=${id}`);
  if (!res.ok) return;
  const p = await res.json();
  const dist = state.pubs.find((x) => x.id === id)?.distance_km;

  document.querySelectorAll(".row").forEach((r) => r.classList.toggle("active", Number(r.dataset.id) === id));
  map.panTo([p.lat, p.lng]);

  const where = [p.address, p.postcode].filter(Boolean).join(", ");
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  openDrawer(`
    ${sheetHead(p.name, `⌖ ${esc(where || "Halifax")}${dist != null ? ` · ${formatKm(dist)} away` : ""}`,
      p.claimed ? '<span class="badge">✓ Details from the landlord</span>' : "")}
    <div class="hero" aria-hidden="true"><i class="sun"></i><i class="roof"></i><i class="front"></i><i class="awning"></i><i class="door"></i><i class="win wl"></i><i class="win wr"></i></div>
    <div class="actions">
      <a class="act primary" href="${directions}" target="_blank" rel="noopener">↗ Directions</a>
      ${p.phone ? `<a class="act" href="tel:${esc(p.phone)}">☎ Call</a>` : ""}
      ${p.website ? `<a class="act" href="${esc(p.website)}" target="_blank" rel="noopener">Website</a>` : ""}
    </div>
    <p class="sec">Facilities <span>Yes / No / Not known</span></p>
    <div class="status">${Object.entries(FACILITIES).map(([k, label]) => statusTile(p.facilities[k], label)).join("")}</div>
    <p class="sec">Drinks available <span>Not a drinks menu</span></p>
    <div class="status">${Object.entries(DRINKS).map(([k, label]) => statusTile(p.drinks[k], label)).join("")}</div>
    <p class="updated">Last updated ${esc(p.updated_at.slice(0, 10))}</p>
    <button type="button" class="linkbtn" id="suggest-btn">Something not quite right? Suggest an edit</button>
  `);
  $("suggest-btn").addEventListener("click", () => openSuggestForm(p));
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

function triSelect(key, label, current) {
  const opt = (v, text) => `<option value="${v}" ${String(current) === v ? "selected" : ""}>${text}</option>`;
  return `<label class="tri" for="f-${key}"><span>${label}</span>
    <select id="f-${key}" name="${key}">${opt("null", "Don't know")}${opt("true", "Yes")}${opt("false", "No")}</select></label>`;
}

function suggestionFields(pub, submitLabel) {
  return `
    <p class="sec">Facilities</p>
    ${Object.entries(FACILITIES).map(([k, label]) => triSelect(k, label, pub?.facilities[k] ?? null)).join("")}
    <p class="sec">Drinks available</p>
    ${Object.entries(DRINKS).map(([k, label]) => triSelect(k, label, pub?.drinks[k] ?? null)).join("")}
    <label class="field" for="f-note">Anything else? (optional)<textarea id="f-note" name="note" rows="2" maxlength="500"></textarea></label>
    <button type="submit" class="btn">${submitLabel}</button>
    <div id="form-msg"></div>`;
}

function readFlags(form, pub) {
  const current = pub ? flagsOf(pub) : {};
  const flags = {};
  for (const key of [...Object.keys(FACILITIES), ...Object.keys(DRINKS)]) {
    const v = form.elements[key].value;
    if (v === "null") continue;
    if (v !== String(current[key] ?? null)) flags[key] = v === "true";
  }
  return flags;
}

async function submitSuggestion(form, url, body) {
  const msg = $("form-msg");
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) {
    form.outerHTML = `<div class="toast"><strong>✓ Thanks!</strong> Your suggestion will show up once it's been checked.</div>`;
  } else {
    const err = await res.json().catch(() => ({}));
    msg.className = "toast error";
    msg.textContent = res.status === 400 && err.detail === "Nothing to change"
      ? "You haven't changed anything yet. Pick Yes or No for something that's different."
      : typeof err.detail === "string" ? err.detail : "That didn't send. Check the form and try again.";
  }
}

function openSuggestForm(pub) {
  openDrawer(`
    ${sheetHead("Suggest an edit", `${esc(pub.name)} · change only what you know. We check suggestions before they go live.`)}
    <form id="suggest-form" class="form">${suggestionFields(pub, "Submit suggestion")}</form>`);
  $("suggest-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    submitSuggestion(form, `api.php?action=suggest_edit&id=${pub.id}`, { flags: readFlags(form, pub), note: form.elements.note.value || null });
  });
}

// Adding a missing pub: drag a pin on a small map to where it is, then fill in what you know.
$("add-pub").addEventListener("click", () => {
  openDrawer(`
    ${sheetHead("Add a missing pub", "Drag the pin to the right spot, then fill in what you know.")}
    <div id="pin-map" class="pin-map"></div>
    <p class="hint">Drag the pin to where the pub is.</p>
    <form id="new-pub-form" class="form">
      <label class="field" for="f-name">Pub name<input id="f-name" name="name" required maxlength="120" placeholder="Name of the pub"></label>
      <label class="field" for="f-address">Street or area<input id="f-address" name="address" maxlength="200" placeholder="Street address, Halifax"></label>
      <label class="field" for="f-postcode">Postcode<input id="f-postcode" name="postcode" maxlength="10" placeholder="HX1 …"></label>
      ${suggestionFields(null, "Suggest this pub")}
    </form>`);

  const start = map.getCenter();
  pinMap = L.map("pin-map", { zoomControl: false }).setView(start, 16);
  L.tileLayer(TILES, { maxZoom: 19, attribution: TILE_CREDIT }).addTo(pinMap);
  const pin = L.marker(start, { draggable: true, icon: pubIcon(true) }).addTo(pinMap);
  pinMap.on("click", (e) => pin.setLatLng(e.latlng));

  $("new-pub-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const f = form.elements;
    const { lat, lng } = pin.getLatLng();
    submitSuggestion(form, "api.php?action=suggest_pub", {
      name: f.name.value, address: f.address.value || null, postcode: f.postcode.value || null,
      lat, lng, flags: readFlags(form, null), note: f.note.value || null,
    });
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

$("where-status").textContent = "Showing Halifax town centre. Use Near me, a postcode, or tap the map.";
search();
````

### `site/style.css`

````css
/* Brightside: coral, butter and mint on white, navy ink. */
:root {
  --coral: #f96363;
  --accent: #d7383f;        /* deeper coral: readable white text on buttons */
  --accent-ink: #ffffff;
  --accent-soft: #fff1f0;
  --butter: #f9db8e;
  --mint: #b2e3c6;
  --bg: #ffffff;
  --surface: #f4f7f7;
  --ink: #193049;
  --muted: #5b6f81;
  --line: #e2e9e9;
  --mapbg: #e7f3e8;
  --yes: #15744c; --yes-bg: #d6f4e5;
  --no: #b54054; --no-bg: #fae3e5;
  --unknown: #596779; --unknown-bg: #e7eaf1;
  --you: #3f87e8;
  --font-head: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
  --font-body: "DM Sans", system-ui, -apple-system, Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --accent: #e5484d; --accent-soft: #454051;
    --bg: #1d2637; --surface: #2a3448; --mapbg: #293e46;
    --ink: #f8f8ff; --muted: #b5bfd0; --line: #3f4b62;
    --yes: #7ee2b0; --yes-bg: #1f4d3a;
    --no: #ff9aa8; --no-bg: #4d2530;
    --unknown: #c3cbe0; --unknown-bg: #39445a;
    color-scheme: dark;
  }
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; }
body { font-family: var(--font-body); background: var(--bg); color: var(--ink); line-height: 1.45; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid var(--you); outline-offset: 2px; }

/* Phone: one scrolling column. Desktop: the column on the left, the map filling the right. */
.layout { max-width: 560px; margin: 0 auto; }
.side {
  display: grid; gap: 16px;
  padding: 14px max(18px, env(safe-area-inset-right)) calc(40px + env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
}
.map-wrap { position: relative; height: 320px; border-radius: 18px; overflow: hidden; border: 1px solid var(--line); background: var(--mapbg); }
#map { position: absolute; inset: 0; }
@media (min-width: 900px) {
  .layout { max-width: none; }
  .side { width: 440px; height: 100vh; overflow-y: auto; border-right: 1px solid var(--line); align-content: start; }
  .map-wrap { position: fixed; top: 0; right: 0; bottom: 0; left: 440px; height: auto; border-radius: 0; border: 0; }
}

.brandline { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.brand { display: flex; align-items: center; gap: 9px; font-family: var(--font-head); font-weight: 800; font-size: 1.35rem; letter-spacing: -.04em; }
.mark { width: 36px; height: 36px; transform: rotate(-5deg); }
.place { font-size: .85rem; color: var(--muted); font-weight: 500; }
.eyebrow { font-size: .72rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin: 6px 0 4px; }
h1 { font-family: var(--font-head); font-weight: 800; font-size: clamp(1.9rem, 8vw, 2.4rem); line-height: 1.08; letter-spacing: -.045em; margin: 0; text-wrap: balance; }
h1 em { font-style: normal; color: var(--coral); }
.notice { margin: 0; background: var(--accent-soft); border: 1px solid var(--coral); border-radius: 12px; padding: 10px 12px; font-size: .88rem; }

.search { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 0 6px 0 12px; min-height: 46px; color: var(--muted); }
.search input { flex: 1; min-width: 0; border: 0; background: none; color: var(--ink); padding: 10px 0; outline: none; }
.search-go { border: 0; background: var(--ink); color: var(--bg); border-radius: 9px; padding: 7px 12px; font-weight: 700; }
.status-line { margin: -8px 0 0; font-size: .85rem; color: var(--muted); }
.status-line:empty { display: none; }

.pills { display: flex; gap: 7px; flex-wrap: wrap; }
.pill { border: 1px solid var(--line); background: var(--surface); border-radius: 12px; min-height: 40px; padding: 8px 12px; font-size: .9rem; font-weight: 700; font-family: var(--font-head); }
.pill[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.pill .n { display: inline-grid; place-items: center; min-width: 20px; height: 20px; border-radius: 6px; background: var(--accent); color: var(--accent-ink); font-size: .75rem; margin-left: 4px; padding: 0 5px; }

.panel { display: grid; gap: 14px; background: var(--surface); border-radius: 16px; padding: 14px; }
.group { font-family: var(--font-head); font-weight: 800; font-size: .95rem; margin: 0 0 8px; display: flex; justify-content: space-between; }
.group span { color: var(--accent); }
.panel .pill { background: var(--bg); }
.panel .pill[aria-pressed="true"] { background: var(--accent); }
.opts { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.opt { display: flex; justify-content: space-between; align-items: center; gap: 6px; text-align: left; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 10px; min-height: 46px; font-size: .88rem; font-weight: 500; }
.opt .box { width: 20px; height: 20px; border-radius: 6px; border: 1px solid var(--line); display: grid; place-items: center; font-size: .75rem; flex: none; }
.opt[aria-pressed="true"] { background: var(--accent-soft); border: 1.5px solid var(--coral); }
.opt[aria-pressed="true"] .box { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }

.listhead { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.listhead strong { font-family: var(--font-head); font-size: 1.05rem; letter-spacing: -.02em; }
.listhead span { font-size: .8rem; color: var(--muted); font-weight: 500; text-align: right; }
.results { list-style: none; margin: 0; padding: 0; }
.row { width: 100%; display: flex; gap: 12px; padding: 12px 0; border: 0; border-bottom: 1px solid var(--line); background: none; text-align: left; }
.results li:last-child .row { border-bottom: 0; }
.row.active .row-top b { color: var(--accent); }
.thumb { width: 54px; height: 58px; border-radius: 12px; background: linear-gradient(145deg, var(--butter), var(--mapbg)); position: relative; overflow: hidden; flex: none; }
.thumb::before { content: ""; position: absolute; bottom: 0; left: 9px; right: 8px; height: 26px; border-radius: 5px 5px 0 0; background: var(--coral); opacity: .75; }
.thumb::after { content: ""; position: absolute; bottom: 0; left: 22px; width: 12px; height: 18px; background: var(--bg); border-radius: 3px 3px 0 0; }
.row-main { flex: 1; min-width: 0; display: grid; gap: 5px; }
.row-top { display: flex; justify-content: space-between; gap: 8px; }
.row-top b { font-family: var(--font-head); font-size: 1rem; letter-spacing: -.02em; }
.row-top span { font-size: .82rem; color: var(--muted); font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.tags { display: flex; gap: 5px; flex-wrap: wrap; }
.tag { font-size: .74rem; font-weight: 700; border-radius: 7px; padding: 3px 7px; background: var(--surface); border: 1px solid var(--line); }
.tag.landlord { background: var(--yes-bg); color: var(--yes); border-color: transparent; }
.drinks { font-size: .8rem; color: var(--muted); }
.empty { text-align: center; padding: 22px 8px; display: grid; gap: 8px; justify-items: center; }
.empty b { font-family: var(--font-head); font-size: 1.2rem; }
.empty p { margin: 0; color: var(--muted); font-size: .92rem; }
.empty .btn { max-width: 280px; }

.btn { border: 0; background: var(--accent); color: var(--accent-ink); font-family: var(--font-head); font-weight: 800; border-radius: 13px; padding: 12px 14px; min-height: 48px; width: 100%; }
.btn:disabled { opacity: .6; cursor: default; }
.btn.soft { background: var(--surface); color: var(--ink); border: 1px solid var(--line); }
.linkbtn { border: 0; background: none; color: var(--accent); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; padding: 8px 0; justify-self: start; }

/* Map markers */
.pub-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--accent); border: 3px solid #fff; box-shadow: 0 2px 6px rgba(25, 48, 73, .35); }
.pub-dot.nearest { width: 20px; height: 20px; }
.leaflet-tooltip.nearest-tip { background: var(--accent); color: #fff; border: 0; border-radius: 10px; font: 800 11px var(--font-head); padding: 4px 9px; box-shadow: none; }
.leaflet-tooltip.nearest-tip::before { border-top-color: var(--accent); }

/* Pub sheet: slides up on phones, sits on the right on desktop */
.scrim { position: fixed; inset: 0; background: rgba(13, 24, 38, .45); z-index: 1000; }
.drawer {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 1001; max-height: 88vh; overflow-y: auto;
  background: var(--bg); border-radius: 22px 22px 0 0; box-shadow: 0 -8px 30px rgba(13, 24, 38, .25);
  padding: 10px max(18px, env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
}
.drawer-in { max-width: 560px; margin: 0 auto; display: grid; gap: 14px; }
.grab { width: 44px; height: 5px; border-radius: 3px; background: var(--line); margin: 0 auto; }
@media (min-width: 900px) {
  .drawer { left: auto; top: 0; width: 440px; max-height: none; border-radius: 0; padding: 20px 24px; }
  .grab { display: none; }
}
.sheet-head { display: flex; justify-content: space-between; align-items: start; gap: 10px; }
.drawer h2 { font-family: var(--font-head); font-weight: 800; font-size: 1.6rem; letter-spacing: -.04em; line-height: 1.12; margin: 0; text-wrap: balance; }
.close { border: 1px solid var(--line); background: var(--surface); border-radius: 12px; width: 40px; height: 40px; flex: none; }
.loc { color: var(--muted); font-size: .9rem; margin: 4px 0 0; }
.badge { display: inline-block; margin-top: 6px; font-size: .78rem; font-weight: 700; background: var(--yes-bg); color: var(--yes); border-radius: 7px; padding: 3px 8px; }
.hero { height: 140px; border-radius: 18px; background: linear-gradient(140deg, var(--butter), var(--mapbg) 78%); position: relative; overflow: hidden; }
.hero i { position: absolute; display: block; }
.hero .sun { right: 24px; top: 16px; width: 42px; height: 42px; border-radius: 50%; background: var(--coral); opacity: .35; }
.hero .roof { bottom: 0; left: 50%; width: 210px; margin-left: -105px; height: 104px; background: var(--ink); opacity: .78; clip-path: polygon(0 20%, 50% 0, 100% 20%, 100% 100%, 0 100%); }
.hero .front { bottom: 0; left: 50%; width: 182px; margin-left: -91px; height: 80px; background: var(--bg); }
.hero .awning { bottom: 66px; left: 50%; width: 192px; margin-left: -96px; height: 15px; background: repeating-linear-gradient(90deg, var(--coral) 0 23px, var(--bg) 23px 46px); transform: skew(-9deg); }
.hero .door { bottom: 0; left: 50%; margin-left: -17px; width: 34px; height: 54px; background: var(--ink); border-radius: 3px 3px 0 0; }
.hero .win { bottom: 18px; width: 38px; height: 35px; border: 4px solid var(--ink); background: var(--butter); }
.hero .wl { left: calc(50% - 72px); }
.hero .wr { left: calc(50% + 34px); }
.actions { display: flex; gap: 8px; }
.act { flex: 1; display: grid; place-items: center; text-decoration: none; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 12px; min-height: 44px; font-weight: 700; font-size: .88rem; }
.act.primary { flex: 1.4; background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.sec { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--font-head); font-weight: 800; margin: 4px 0 -4px; }
.sec span { font-family: var(--font-body); font-weight: 500; font-size: .78rem; color: var(--muted); }
.status { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.st { display: flex; justify-content: space-between; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 11px; padding: 9px 10px; font-size: .88rem; font-weight: 700; min-width: 0; }
.dot { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: .78rem; font-weight: 800; flex: none; }
.dot.yes { background: var(--yes-bg); color: var(--yes); }
.dot.no { background: var(--no-bg); color: var(--no); }
.dot.unknown { background: var(--unknown-bg); color: var(--unknown); }
.updated { font-size: .78rem; color: var(--muted); margin: 0; }

/* Forms */
.form { display: grid; gap: 12px; }
.field { display: grid; gap: 6px; font-size: .88rem; font-weight: 700; }
.field input, .field textarea { font-weight: 400; background: var(--surface); border: 1px solid var(--line); border-radius: 11px; padding: 10px 12px; min-height: 44px; width: 100%; }
.tri { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: .92rem; }
.tri select { background: var(--surface); border: 1px solid var(--line); border-radius: 9px; padding: 7px 8px; }
.pin-map { height: 200px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); }
.hint { font-size: .8rem; color: var(--muted); margin: -6px 0 0; }
.toast { background: var(--accent-soft); border: 1px solid var(--coral); border-radius: 12px; padding: 13px; font-weight: 500; }
.toast.error { background: var(--no-bg); border-color: var(--no); }

@media (prefers-reduced-motion: no-preference) {
  .drawer { animation: up .22s ease-out; }
  @keyframes up { from { transform: translateY(30px); opacity: .6; } }
}
````

### `site/admin.html`

````html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>PubPal admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap">
  <link rel="icon" href="logo.svg">
  <link rel="stylesheet" href="style.css">
  <style>
    .admin { max-width: 640px; margin: 0 auto; display: grid; gap: 16px; padding: 14px max(18px, env(safe-area-inset-right)) 40px max(18px, env(safe-area-inset-left)); }
    .box { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 16px; display: grid; gap: 12px; }
    .box h2 { font-family: var(--font-head); font-weight: 800; font-size: 1.15rem; letter-spacing: -.02em; margin: 0; }
    .box p { margin: 0; }
    .stats { display: flex; gap: 8px; flex-wrap: wrap; }
    .stat { background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; min-width: 110px; }
    .stat b { display: block; font-family: var(--font-head); font-size: 1.4rem; font-variant-numeric: tabular-nums; }
    .stat span { font-size: .8rem; color: var(--muted); }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .card { background: var(--bg); border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: grid; gap: 8px; }
    .card h3 { margin: 0; font-family: var(--font-head); font-size: 1rem; }
    .card table { border-collapse: collapse; font-size: .9rem; }
    .card td { padding: 2px 14px 2px 0; vertical-align: top; }
    .card td:first-child { color: var(--muted); }
    .approve { background: var(--yes); }
    .reject { background: var(--surface); color: var(--no); border: 1px solid var(--line); }
    .quiet { color: var(--muted); font-size: .88rem; }
    #msg:empty { display: none; }
  </style>
</head>
<body>
  <main class="admin">
    <header class="brandline">
      <div class="brand"><img src="logo.svg" alt="" class="mark">PubPal admin</div>
      <a class="place" href="./">← Back to the app</a>
    </header>

    <div id="msg" class="toast"></div>

    <!-- First visit: choose the admin password -->
    <form id="setup" class="box" hidden>
      <h2>Choose an admin password</h2>
      <p class="quiet">This is the first visit to the admin page. The password you choose here is needed to approve suggestions and load pubs. Do this straight away after uploading.</p>
      <label class="field" for="new-password">Password (at least 8 characters)<input id="new-password" type="password" minlength="8" required autocomplete="new-password"></label>
      <label class="field" for="new-password-2">Type it again<input id="new-password-2" type="password" minlength="8" required autocomplete="new-password"></label>
      <button class="btn" type="submit">Save password</button>
    </form>

    <form id="login" class="box" hidden>
      <h2>Sign in</h2>
      <label class="field" for="password">Admin password<input id="password" type="password" required autocomplete="current-password"></label>
      <button class="btn" type="submit">Sign in</button>
    </form>

    <div id="dashboard" hidden>
      <div class="admin" style="padding:0">
        <section class="box">
          <h2>Pubs</h2>
          <div class="stats">
            <div class="stat"><b id="count-total">0</b><span>pubs listed</span></div>
            <div class="stat"><b id="count-demo">0</b><span>of them made-up demo pubs</span></div>
          </div>
          <p class="quiet">Import loads every pub in and around Halifax from OpenStreetMap. It's safe to run again: it adds new pubs and never overwrites facilities or drinks you've approved. It also removes the demo pubs.</p>
          <div class="two">
            <button class="btn" type="button" id="import">Import Halifax pubs</button>
            <button class="btn soft" type="button" id="demo">Load demo pubs</button>
          </div>
        </section>

        <section class="box">
          <h2>Suggestions waiting for you <span id="pending-count" class="quiet"></span></h2>
          <div id="list" style="display:grid;gap:10px"></div>
        </section>

        <button class="btn soft" type="button" id="sign-out">Sign out</button>
      </div>
    </div>
  </main>

  <script>
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const LABELS = {
      name: "Name", address: "Address", postcode: "Postcode", phone: "Phone", website: "Website", lat: "Latitude", lng: "Longitude",
      shows_sports: "Shows sports", pool_table: "Pool table", dog_friendly: "Dog friendly", outdoor_seating: "Outdoor seating",
      baby_changing: "Baby changing", accessible: "Accessible", real_ale: "Cask ale", craft_beer: "Craft beer", lager: "Lager",
      stout: "Stout", cider: "Cider", alcohol_free: "Alcohol-free",
    };
    const FLAG_KEYS = new Set(["shows_sports", "pool_table", "dog_friendly", "outdoor_seating", "baby_changing", "accessible", "real_ale", "craft_beer", "lager", "stout", "cider", "alcohol_free"]);

    let password = "";
    try { password = sessionStorage.getItem("pubpal-admin") || ""; } catch {}

    function say(text, isError = false) {
      $("msg").textContent = text;
      $("msg").className = isError ? "toast error" : "toast";
    }

    async function api(action, { method = "GET", body, query = "" } = {}) {
      const res = await fetch(`api.php?action=${action}${query}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.detail || "Something went wrong. Try again."), { status: res.status });
      return data;
    }

    function show(view) {
      for (const id of ["setup", "login", "dashboard"]) $(id).hidden = id !== view;
    }

    function showCounts(pubs) {
      $("count-total").textContent = pubs.total;
      $("count-demo").textContent = pubs.demo;
    }

    function describe(key, value) {
      if (FLAG_KEYS.has(key)) return value ? "Yes" : "No";
      return key === "lat" || key === "lng" ? Number(value).toFixed(5) : esc(value);
    }

    async function loadDashboard() {
      try {
        const { suggestions, pubs } = await api("admin_suggestions");
        try { sessionStorage.setItem("pubpal-admin", password); } catch {}
        show("dashboard");
        showCounts(pubs);
        $("pending-count").textContent = suggestions.length ? `(${suggestions.length})` : "";
        $("list").innerHTML = suggestions.length ? suggestions.map((s) => `
          <div class="card">
            <h3>${s.pub_id ? `Edit to ${esc(s.pub_name)}` : `New pub: ${esc(s.changes.name)}`}</h3>
            <span class="quiet">Sent ${esc(s.created_at)} UTC</span>
            <table>${Object.entries(s.changes).map(([k, v]) => `<tr><td>${LABELS[k] || esc(k)}</td><td>${describe(k, v)}</td></tr>`).join("")}</table>
            ${!s.pub_id ? `<a class="quiet" href="https://www.google.com/maps?q=${s.changes.lat},${s.changes.lng}" target="_blank" rel="noopener">See the pin on Google Maps</a>` : ""}
            ${s.note ? `<p>“${esc(s.note)}”</p>` : ""}
            <div class="two">
              <button class="btn approve" type="button" data-id="${s.id}" data-decision="approve">Approve</button>
              <button class="btn reject" type="button" data-id="${s.id}" data-decision="reject">Reject</button>
            </div>
          </div>`).join("") : `<p class="quiet">Nothing waiting. New suggestions from the app appear here.</p>`;
      } catch (e) {
        password = "";
        try { sessionStorage.removeItem("pubpal-admin"); } catch {}
        show("login");
        if (e.status !== 401 || $("password").value) say(e.message, true);
      }
    }

    async function start() {
      try {
        const status = await api("admin_status");
        if (!status.password_set) return show("setup");
        if (password) return loadDashboard();
        show("login");
      } catch (e) {
        say(e.message, true);
      }
    }

    $("setup").addEventListener("submit", async (e) => {
      e.preventDefault();
      const p1 = $("new-password").value, p2 = $("new-password-2").value;
      if (p1 !== p2) return say("The two passwords don't match. Type them again.", true);
      try {
        await api("admin_setup", { method: "POST", body: { password: p1 } });
        password = p1;
        say("Password saved. Next, import the Halifax pubs.");
        loadDashboard();
      } catch (err) {
        say(err.message, true);
      }
    });

    $("login").addEventListener("submit", (e) => {
      e.preventDefault();
      password = $("password").value;
      $("msg").textContent = "";
      loadDashboard();
    });

    $("sign-out").addEventListener("click", () => {
      password = "";
      try { sessionStorage.removeItem("pubpal-admin"); } catch {}
      $("password").value = "";
      $("msg").textContent = "";
      show("login");
    });

    $("import").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = "Importing… (up to a minute)";
      try {
        const r = await api("admin_import", { method: "POST" });
        showCounts(r.pubs);
        say(`Done: ${r.added} new pubs added, ${r.updated} updated.`);
      } catch (err) {
        say(err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = "Import Halifax pubs";
      }
    });

    $("demo").addEventListener("click", async () => {
      try {
        const r = await api("admin_demo", { method: "POST" });
        showCounts(r.pubs);
        say(`Loaded ${r.loaded} made-up demo pubs. Importing real pubs removes them.`);
      } catch (err) {
        say(err.message, true);
      }
    });

    $("list").addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-id]");
      if (!b) return;
      b.disabled = true;
      try {
        await api("admin_resolve", { method: "POST", query: `&id=${b.dataset.id}&decision=${b.dataset.decision}` });
        say(b.dataset.decision === "approve" ? "Approved. It's live in the app now." : "Rejected.");
      } catch (err) {
        say(err.message, true);
      }
      loadDashboard();
    });

    start();
  </script>
</body>
</html>
````

### `site/logo.svg`

````html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70"><rect width="70" height="70" rx="20" fill="#F96363"/><path d="M35 9c-15 0-26 11-26 25 0 19 26 31 26 31S61 53 61 34C61 20 50 9 35 9Z" fill="#fff"/><circle cx="26" cy="32" r="4" fill="#F96363"/><circle cx="44" cy="32" r="4" fill="#F96363"/><path d="M25 42q10 10 20 0" fill="none" stroke="#F96363" stroke-width="4" stroke-linecap="round"/></svg>
````

### `site/api.php`

````php
<?php
// PubPal JSON API. Every request is api.php?action=<name>.

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/osm.php';

const MAX_RADIUS_KM = 25;
const MIN_PASSWORD_LENGTH = 8;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond($data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function fail(string $message, int $status = 400): never
{
    respond(['detail' => $message], $status);
}

function body(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($data)) {
        fail('Request body must be JSON');
    }
    return $data;
}

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        fail("Use $method for this", 405);
    }
}

function number_param(string $name, float $min, float $max, ?float $default = null): float
{
    $raw = $_GET[$name] ?? null;
    if ($raw === null || $raw === '') {
        if ($default === null) {
            fail("Missing $name");
        }
        return $default;
    }
    if (!is_numeric($raw) || $raw < $min || $raw > $max) {
        fail("$name must be a number between $min and $max", 422);
    }
    return (float) $raw;
}

function id_param(): int
{
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) {
        fail('Missing or bad id');
    }
    return $id;
}

/** Turn a suggestion request body into validated column => value changes. */
function suggestion_changes(array $b): array
{
    $limits = ['name' => 120, 'address' => 200, 'postcode' => 10, 'phone' => 30, 'website' => 200];
    $changes = [];
    foreach ($limits as $field => $max) {
        $v = $b[$field] ?? null;
        if ($v === null || $v === '') {
            continue;
        }
        if (!is_string($v) || mb_strlen($v) > $max) {
            fail("$field must be text of at most $max characters", 422);
        }
        $changes[$field] = trim($v);
    }
    foreach (['lat' => 90, 'lng' => 180] as $field => $max) {
        $v = $b[$field] ?? null;
        if ($v === null) {
            continue;
        }
        if (!is_int($v) && !is_float($v) || abs($v) > $max) {
            fail("$field must be a number between -$max and $max", 422);
        }
        $changes[$field] = (float) $v;
    }
    $flags = $b['flags'] ?? [];
    if (!is_array($flags)) {
        fail('flags must be an object', 422);
    }
    $unknown = array_diff(array_keys($flags), FLAGS);
    if ($unknown) {
        fail('Unknown field(s): ' . implode(', ', $unknown));
    }
    foreach ($flags as $flag => $v) {
        if (!is_bool($v)) {
            fail("$flag must be true or false", 422);
        }
        $changes[$flag] = $v ? 1 : 0;
    }
    return $changes;
}

function note(array $b): ?string
{
    $note = $b['note'] ?? null;
    if ($note !== null && (!is_string($note) || mb_strlen($note) > 500)) {
        fail('note must be text of at most 500 characters', 422);
    }
    return $note ?: null;
}

function require_admin(): void
{
    $hash = setting('admin_password');
    if ($hash === null) {
        fail('Set an admin password first', 403);
    }
    $given = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '';
    if (!password_verify($given, $hash)) {
        usleep(500000); // slow down password guessing
        fail('Wrong admin password', 401);
    }
}

try {
    switch ($_GET['action'] ?? '') {
        case 'pubs':
            $lat = number_param('lat', -90, 90);
            $lng = number_param('lng', -180, 180);
            $radius = number_param('radius_km', 0.01, MAX_RADIUS_KM, 2);
            $required = array_values(array_filter(explode(',', $_GET['has'] ?? '')));
            $unknown = array_diff($required, FLAGS);
            if ($unknown) {
                fail('Unknown filter(s): ' . implode(', ', $unknown));
            }
            respond(['results' => find_pubs($lat, $lng, $radius, $required)]);

        case 'pub':
            $pub = get_pub(id_param());
            $pub ? respond($pub) : fail('Pub not found', 404);

        case 'suggest_edit':
            require_method('POST');
            $id = id_param();
            if (!get_pub($id)) {
                fail('Pub not found', 404);
            }
            $b = body();
            $changes = suggestion_changes($b);
            unset($changes['lat'], $changes['lng']);
            if (!$changes) {
                fail('Nothing to change');
            }
            respond(['id' => add_suggestion($id, $changes, note($b)), 'status' => 'pending'], 201);

        case 'suggest_pub':
            require_method('POST');
            $b = body();
            $changes = suggestion_changes($b);
            if (empty($changes['name']) || !isset($changes['lat'], $changes['lng'])) {
                fail('A new pub needs a name and a location');
            }
            respond(['id' => add_suggestion(null, $changes, note($b)), 'status' => 'pending'], 201);

        // ─── Admin ────────────────────────────────────────────────────────────

        case 'admin_status':
            respond(['password_set' => setting('admin_password') !== null, 'pubs' => pub_counts()]);

        case 'admin_setup':
            require_method('POST');
            if (setting('admin_password') !== null) {
                fail('The admin password is already set', 403);
            }
            $password = body()['password'] ?? '';
            if (!is_string($password) || strlen($password) < MIN_PASSWORD_LENGTH) {
                fail('Choose a password of at least ' . MIN_PASSWORD_LENGTH . ' characters', 422);
            }
            save_setting('admin_password', password_hash($password, PASSWORD_DEFAULT));
            respond(['ok' => true]);

        case 'admin_suggestions':
            require_admin();
            respond(['suggestions' => list_suggestions(), 'pubs' => pub_counts()]);

        case 'admin_resolve':
            require_method('POST');
            require_admin();
            $decision = $_GET['decision'] ?? '';
            if (!in_array($decision, ['approve', 'reject'], true)) {
                fail('decision must be approve or reject');
            }
            resolve_suggestion(id_param(), $decision === 'approve')
                ? respond(['ok' => true])
                : fail('No pending suggestion with that id', 404);

        case 'admin_import':
            require_method('POST');
            require_admin();
            set_time_limit(180);
            try {
                [$added, $updated] = upsert_pubs(fetch_osm_pubs());
            } catch (RuntimeException $e) {
                fail($e->getMessage(), 502);
            }
            respond(['added' => $added, 'updated' => $updated, 'pubs' => pub_counts()]);

        case 'admin_demo':
            require_method('POST');
            require_admin();
            respond(['loaded' => load_demo_pubs(), 'pubs' => pub_counts()]);

        default:
            fail('Unknown action', 404);
    }
} catch (PDOException $e) {
    error_log('PubPal database error: ' . $e->getMessage());
    fail("The database isn't working. Check the settings in config.php.", 500);
}
````

### `site/config.php`

````php
<?php
// PubPal settings.
//
// Leave this as it is to use the built-in SQLite database (a file in the data/ folder).
// To use MySQL instead, create a database and user (SiteGround: Site Tools → Site → MySQL)
// and fill in the four values below.

return [
    'mysql' => [
        'host' => 'localhost',
        'name' => '',
        'user' => '',
        'pass' => '',
    ],
];
````

### `site/lib/.htaccess`

````apache
Require all denied
````

### `site/lib/db.php`

````php
<?php
// Database access for PubPal: SQLite by default, MySQL if configured in config.php.

const FACILITIES = ['shows_sports', 'pool_table', 'dog_friendly', 'outdoor_seating', 'baby_changing', 'accessible'];
const DRINKS = ['real_ale', 'craft_beer', 'lager', 'stout', 'cider', 'alcohol_free'];
const FLAGS = [...FACILITIES, ...DRINKS];
const DETAILS = ['name', 'address', 'postcode', 'phone', 'website'];

/** Quote a column name. Needed because `accessible` is a reserved word in MySQL. */
function col(string $name): string
{
    return "`$name`";
}

function now(): string
{
    return gmdate('Y-m-d H:i:s');
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $config = require __DIR__ . '/../config.php';
    $mysql = $config['mysql'] ?? [];
    if (!empty($mysql['name'])) {
        $pdo = new PDO(
            "mysql:host={$mysql['host']};dbname={$mysql['name']};charset=utf8mb4",
            $mysql['user'],
            $mysql['pass'],
        );
    } else {
        $path = getenv('PUBPAL_DB') ?: __DIR__ . '/../data/pubpal.sqlite';
        $pdo = new PDO('sqlite:' . $path);
        $pdo->exec('PRAGMA foreign_keys = ON');
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    create_tables($pdo);
    return $pdo;
}

function create_tables(PDO $pdo): void
{
    $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    $id = $mysql ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $text = $mysql ? 'VARCHAR(255)' : 'TEXT';
    $engine = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    // NULL in a flag column means "we don't know yet".
    $flags = implode(', ', array_map(fn($f) => col($f) . ' SMALLINT NULL', FLAGS));

    $pdo->exec("CREATE TABLE IF NOT EXISTS pubs (
        id $id,
        name $text NOT NULL,
        address $text NULL,
        postcode $text NULL,
        lat DOUBLE NOT NULL,
        lng DOUBLE NOT NULL,
        phone $text NULL,
        website $text NULL,
        $flags,
        claimed SMALLINT NOT NULL DEFAULT 0,
        is_demo SMALLINT NOT NULL DEFAULT 0,
        osm_id VARCHAR(40) NULL UNIQUE,
        updated_at $text NOT NULL
    )$engine");

    $pdo->exec("CREATE TABLE IF NOT EXISTS suggestions (
        id $id,
        pub_id INT NULL,
        changes TEXT NOT NULL,
        note TEXT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'pending',
        created_at $text NOT NULL,
        FOREIGN KEY (pub_id) REFERENCES pubs(id) ON DELETE CASCADE
    )$engine");

    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        name VARCHAR(40) PRIMARY KEY,
        value TEXT NOT NULL
    )$engine");
}

function setting(string $name): ?string
{
    $stmt = db()->prepare('SELECT value FROM settings WHERE name = ?');
    $stmt->execute([$name]);
    $value = $stmt->fetchColumn();
    return $value === false ? null : $value;
}

function save_setting(string $name, string $value): void
{
    db()->prepare('DELETE FROM settings WHERE name = ?')->execute([$name]);
    db()->prepare('INSERT INTO settings (name, value) VALUES (?, ?)')->execute([$name, $value]);
}

function flag_out($value): ?bool
{
    return $value === null ? null : (bool) $value;
}

function pub_out(array $row, ?float $distance_km = null): array
{
    $pub = [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'address' => $row['address'],
        'postcode' => $row['postcode'],
        'lat' => (float) $row['lat'],
        'lng' => (float) $row['lng'],
        'phone' => $row['phone'],
        'website' => $row['website'],
        'facilities' => array_combine(FACILITIES, array_map(fn($f) => flag_out($row[$f]), FACILITIES)),
        'drinks' => array_combine(DRINKS, array_map(fn($f) => flag_out($row[$f]), DRINKS)),
        'claimed' => (bool) $row['claimed'],
        'is_demo' => (bool) $row['is_demo'],
        'updated_at' => $row['updated_at'],
    ];
    if ($distance_km !== null) {
        $pub['distance_km'] = round($distance_km, 2);
    }
    return $pub;
}

function haversine_km(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $p1 = deg2rad($lat1);
    $p2 = deg2rad($lat2);
    $dp = $p2 - $p1;
    $dl = deg2rad($lng2 - $lng1);
    $a = sin($dp / 2) ** 2 + cos($p1) * cos($p2) * sin($dl / 2) ** 2;
    return 2 * 6371.0 * asin(sqrt($a));
}

/** Pubs within $radius_km that have every flag in $required, nearest first. */
function find_pubs(float $lat, float $lng, float $radius_km, array $required = []): array
{
    // Cheap bounding-box prefilter, then exact distance. Fine for a town's worth of pubs.
    $dlat = $radius_km / 111.0;
    $dlng = $radius_km / (111.0 * max(cos(deg2rad($lat)), 0.01));
    $where = ['lat BETWEEN ? AND ?', 'lng BETWEEN ? AND ?'];
    foreach ($required as $flag) {
        $where[] = col($flag) . ' = 1'; // $required is checked against FLAGS by the caller
    }
    $stmt = db()->prepare('SELECT * FROM pubs WHERE ' . implode(' AND ', $where));
    $stmt->execute([$lat - $dlat, $lat + $dlat, $lng - $dlng, $lng + $dlng]);

    $results = [];
    foreach ($stmt as $row) {
        $d = haversine_km($lat, $lng, (float) $row['lat'], (float) $row['lng']);
        if ($d <= $radius_km) {
            $results[] = pub_out($row, $d);
        }
    }
    usort($results, fn($a, $b) => $a['distance_km'] <=> $b['distance_km']);
    return $results;
}

function get_pub(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM pubs WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? pub_out($row) : null;
}

/** Insert a pub. $fields keys must be real column names. */
function insert_pub(array $fields): int
{
    $fields['updated_at'] = now();
    $cols = array_keys($fields);
    $sql = 'INSERT INTO pubs (' . implode(', ', array_map('col', $cols)) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')';
    db()->prepare($sql)->execute(array_values($fields));
    return (int) db()->lastInsertId();
}

function add_suggestion(?int $pub_id, array $changes, ?string $note): int
{
    db()->prepare('INSERT INTO suggestions (pub_id, changes, note, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$pub_id, json_encode($changes), $note, now()]);
    return (int) db()->lastInsertId();
}

function list_suggestions(): array
{
    $rows = db()->query(
        "SELECT s.*, p.name AS pub_name FROM suggestions s
         LEFT JOIN pubs p ON p.id = s.pub_id
         WHERE s.status = 'pending' ORDER BY s.created_at, s.id"
    )->fetchAll();
    return array_map(fn($r) => [
        'id' => (int) $r['id'],
        'pub_id' => $r['pub_id'] === null ? null : (int) $r['pub_id'],
        'pub_name' => $r['pub_name'],
        'changes' => json_decode($r['changes'], true),
        'note' => $r['note'],
        'created_at' => $r['created_at'],
    ], $rows);
}

/** Approve (apply the changes) or reject a pending suggestion. False if there is no such pending suggestion. */
function resolve_suggestion(int $id, bool $approve): bool
{
    $pdo = db();
    $stmt = $pdo->prepare("SELECT * FROM suggestions WHERE id = ? AND status = 'pending'");
    $stmt->execute([$id]);
    $s = $stmt->fetch();
    if (!$s) {
        return false;
    }
    $pdo->beginTransaction();
    if ($approve) {
        // Only known columns ever reach SQL, even though changes were validated on the way in.
        $allowed = array_flip([...DETAILS, ...FLAGS, 'lat', 'lng']);
        $changes = array_intersect_key(json_decode($s['changes'], true), $allowed);
        if ($s['pub_id'] === null) {
            insert_pub($changes);
        } elseif ($changes) {
            $sets = implode(', ', array_map(fn($c) => col($c) . ' = ?', array_keys($changes)));
            $pdo->prepare("UPDATE pubs SET $sets, updated_at = ? WHERE id = ?")
                ->execute([...array_values($changes), now(), $s['pub_id']]);
        }
    }
    $pdo->prepare('UPDATE suggestions SET status = ? WHERE id = ?')->execute([$approve ? 'approved' : 'rejected', $id]);
    $pdo->commit();
    return true;
}

function pub_counts(): array
{
    $row = db()->query('SELECT COUNT(*) AS total, COALESCE(SUM(is_demo), 0) AS demo FROM pubs')->fetch();
    return ['total' => (int) $row['total'], 'demo' => (int) $row['demo']];
}
````

### `site/lib/osm.php`

````php
<?php
// Import Halifax pubs from OpenStreetMap, and the made-up demo pubs for trying the app out.

require_once __DIR__ . '/db.php';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// Halifax, West Yorkshire and its immediate surroundings: south, west, north, east.
const HALIFAX_BBOX = [53.68, -1.95, 53.76, -1.80];

function overpass_query(array $bbox): string
{
    $box = implode(',', $bbox);
    return "[out:json][timeout:60];(node[\"amenity\"=\"pub\"]($box);way[\"amenity\"=\"pub\"]($box););out center tags;";
}

function yes_no(?string $value): ?int
{
    if (in_array($value, ['yes', 'only', 'designated'], true)) {
        return 1;
    }
    return $value === 'no' ? 0 : null;
}

/** Map an OpenStreetMap element to PubPal columns, or null if it has no name or location. */
function element_to_pub(array $el): ?array
{
    $t = $el['tags'] ?? [];
    $lat = $el['lat'] ?? $el['center']['lat'] ?? null;
    $lng = $el['lon'] ?? $el['center']['lon'] ?? null;
    if (empty($t['name']) || $lat === null || $lng === null) {
        return null;
    }
    $street = trim(($t['addr:housenumber'] ?? '') . ' ' . ($t['addr:street'] ?? ''));
    $address = implode(', ', array_filter([$street, $t['addr:city'] ?? $t['addr:town'] ?? '']));
    $sport = $t['sport'] ?? '';

    return [
        'osm_id' => $el['type'] . '/' . $el['id'],
        'name' => $t['name'],
        'address' => $address ?: null,
        'postcode' => $t['addr:postcode'] ?? null,
        'lat' => $lat,
        'lng' => $lng,
        'phone' => $t['phone'] ?? $t['contact:phone'] ?? null,
        'website' => $t['website'] ?? $t['contact:website'] ?? null,
        'shows_sports' => null, // OSM has no reliable tag for this; comes from suggestions
        'pool_table' => preg_match('/billiards|pool|snooker/', $sport) ? 1 : null,
        'dog_friendly' => yes_no($t['dog'] ?? null),
        'outdoor_seating' => yes_no($t['outdoor_seating'] ?? $t['beer_garden'] ?? null),
        'baby_changing' => yes_no($t['changing_table'] ?? null),
        'accessible' => yes_no($t['wheelchair'] ?? null),
        'real_ale' => yes_no($t['real_ale'] ?? $t['drink:real_ale'] ?? null),
        'craft_beer' => yes_no($t['drink:craft_beer'] ?? null),
        'lager' => yes_no($t['drink:lager'] ?? null),
        'stout' => yes_no($t['drink:stout'] ?? null),
        'cider' => yes_no($t['real_cider'] ?? $t['drink:cider'] ?? null),
        'alcohol_free' => yes_no($t['drink:alcohol_free'] ?? $t['drink:non_alcoholic'] ?? null),
    ];
}

/**
 * Add new pubs and refresh names, addresses and locations of ones we already have.
 * A facility or drink that is already known (from an approved suggestion) is never overwritten.
 * Removes the demo pubs. Returns [added, updated].
 */
function upsert_pubs(array $pubs): array
{
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM pubs WHERE is_demo = 1');
    $find = $pdo->prepare('SELECT * FROM pubs WHERE osm_id = ?');
    $added = $updated = 0;
    foreach ($pubs as $pub) {
        $find->execute([$pub['osm_id']]);
        $existing = $find->fetch();
        if (!$existing) {
            insert_pub($pub);
            $added++;
            continue;
        }
        $changes = [];
        foreach (['name', 'address', 'postcode', 'lat', 'lng', 'phone', 'website'] as $c) {
            if ($pub[$c] !== null) {
                $changes[$c] = $pub[$c];
            }
        }
        foreach (FLAGS as $f) {
            if ($existing[$f] === null && $pub[$f] !== null) {
                $changes[$f] = $pub[$f];
            }
        }
        $sets = implode(', ', array_map(fn($c) => col($c) . ' = ?', array_keys($changes)));
        $pdo->prepare("UPDATE pubs SET $sets, updated_at = ? WHERE id = ?")
            ->execute([...array_values($changes), now(), $existing['id']]);
        $updated++;
    }
    $pdo->commit();
    return [$added, $updated];
}

/** Fetch Halifax pubs from OpenStreetMap. Throws RuntimeException with a readable message on failure. */
function fetch_osm_pubs(): array
{
    $ch = curl_init(getenv('PUBPAL_OVERPASS_URL') ?: OVERPASS_URL); // env override is for tests
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query(['data' => overpass_query(HALIFAX_BBOX)]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_USERAGENT => 'PubPal/0.2',
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($body === false || $status !== 200) {
        throw new RuntimeException("OpenStreetMap didn't answer (" . ($error ?: "HTTP $status") . '). Try again in a few minutes.');
    }
    $data = json_decode($body, true);
    $pubs = array_values(array_filter(array_map('element_to_pub', $data['elements'] ?? [])));
    if (!$pubs) {
        throw new RuntimeException('OpenStreetMap returned no pubs, so nothing was changed.');
    }
    return $pubs;
}

/** Replace any demo pubs with the fictional set around Halifax town centre. */
function load_demo_pubs(): int
{
    $Y = 1; $N = 0; $U = null;
    // name, lat, lng, [sports, pool, dogs, outdoor, baby, accessible], [ale, craft, lager, stout, cider, alcohol-free]
    $demo = [
        ['The Demo Arms', 53.7232, -1.8590, [$Y, $Y, $Y, $N, $N, $Y], [$Y, $N, $Y, $Y, $Y, $Y]],
        ['The Sample Inn', 53.7255, -1.8655, [$N, $N, $Y, $Y, $U, $Y], [$Y, $Y, $Y, $U, $Y, $Y]],
        ['The Placeholder Tap', 53.7210, -1.8640, [$N, $N, $Y, $N, $N, $N], [$Y, $Y, $N, $Y, $Y, $U]],
        ['The Test & Anchor', 53.7298, -1.8702, [$Y, $Y, $N, $Y, $Y, $Y], [$N, $N, $Y, $Y, $Y, $Y]],
        ['The Mock Turtle', 53.7175, -1.8520, [$U, $U, $U, $Y, $U, $U], [$Y, $U, $Y, $U, $U, $U]],
        ['The Pretend Fox', 53.7380, -1.8810, [$Y, $N, $Y, $Y, $N, $Y], [$Y, $N, $Y, $Y, $N, $Y]],
        ['The Example Hotel', 53.7100, -1.8950, [$Y, $Y, $N, $N, $Y, $Y], [$N, $N, $Y, $Y, $Y, $Y]],
    ];
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM pubs WHERE is_demo = 1');
    foreach ($demo as [$name, $lat, $lng, $fac, $drinks]) {
        insert_pub([
            'name' => $name, 'address' => 'Demo data – not a real pub', 'postcode' => 'HX1',
            'lat' => $lat, 'lng' => $lng, 'is_demo' => 1,
            ...array_combine(FACILITIES, $fac), ...array_combine(DRINKS, $drinks),
        ]);
    }
    $pdo->commit();
    return count($demo);
}
````

### `site/data/.htaccess`

````apache
Require all denied
````

### `tests/test_api.py`

````python
"""End-to-end tests for the PHP API, run with PHP's built-in server.

    python -m pytest -q tests                       # SQLite
    PUBPAL_TEST_MYSQL=1 python -m pytest -q tests   # also MySQL/MariaDB (needs a local server, root over socket)
"""

import json
import os
import shutil
import socket
import subprocess
import time

import httpx
import pytest

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "site")
CENTRE = {"lat": 53.7245, "lng": -1.8616}
PASSWORD = "correct horse"

OVERPASS_FIXTURE = {
    "elements": [
        {"type": "node", "id": 1, "lat": 53.7250, "lon": -1.8610,
         "tags": {"amenity": "pub", "name": "Real Pub", "dog": "yes", "wheelchair": "no", "real_ale": "yes",
                  "addr:housenumber": "1", "addr:street": "Fake St", "addr:postcode": "HX1 1AA"}},
        {"type": "way", "id": 2, "center": {"lat": 53.7260, "lon": -1.8620},
         "tags": {"amenity": "pub", "name": "Way Pub", "sport": "billiards"}},
        {"type": "node", "id": 3, "lat": 53.7, "lon": -1.8, "tags": {"amenity": "pub"}},  # no name: skipped
    ]
}


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_php(docroot, env):
    port = free_port()
    proc = subprocess.Popen(["php", "-S", f"127.0.0.1:{port}", "-t", docroot],
                            env={**os.environ, **env}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            socket.create_connection(("127.0.0.1", port), timeout=0.1).close()
            return proc, f"http://127.0.0.1:{port}"
        except OSError:
            time.sleep(0.05)
    proc.kill()
    raise RuntimeError("PHP server didn't start")


def mysql(sql):
    subprocess.run(["mysql", "-uroot", "-e", sql], check=True)


BACKENDS = ["sqlite"] + (["mysql"] if os.environ.get("PUBPAL_TEST_MYSQL") else [])


@pytest.fixture(params=BACKENDS)
def api(request, tmp_path):
    site = tmp_path / "site"
    shutil.copytree(SITE, site)
    env = {}
    if request.param == "mysql":
        mysql("DROP DATABASE IF EXISTS pubpal_test; CREATE DATABASE pubpal_test;"
              "CREATE USER IF NOT EXISTS 'pubpal'@'localhost' IDENTIFIED BY 'pw';"
              "GRANT ALL ON pubpal_test.* TO 'pubpal'@'localhost';")
        (site / "config.php").write_text(
            "<?php return ['mysql' => ['host' => 'localhost', 'name' => 'pubpal_test', 'user' => 'pubpal', 'pass' => 'pw']];")

    # A second PHP server stands in for OpenStreetMap's Overpass API.
    fake = tmp_path / "overpass"
    fake.mkdir()
    (fake / "index.php").write_text("<?php header('Content-Type: application/json'); echo file_get_contents(__DIR__ . '/data.json');")
    (fake / "data.json").write_text(json.dumps(OVERPASS_FIXTURE))
    osm_proc, osm_url = start_php(str(fake), {})
    env["PUBPAL_OVERPASS_URL"] = osm_url + "/index.php"

    proc, base = start_php(str(site), env)
    client = httpx.Client(base_url=base + "/api.php", timeout=30)
    client.post("", params={"action": "admin_setup"}, json={"password": PASSWORD})
    client.headers["X-Admin-Password"] = PASSWORD
    client.post("", params={"action": "admin_demo"})
    yield client
    client.close()
    proc.kill()
    osm_proc.kill()


def get(client, action, **params):
    return client.get("", params={"action": action, **params})


def post(client, action, body=None, **params):
    return client.post("", params={"action": action, **params}, json=body if body is not None else {})


def pubs(client, **params):
    r = get(client, "pubs", **{**CENTRE, **params})
    assert r.status_code == 200, r.text
    return r.json()["results"]


def test_radius_search_sorted_by_distance(api):
    near, far = pubs(api, radius_km=1), pubs(api, radius_km=10)
    assert 0 < len(near) < len(far)
    assert all(p["distance_km"] <= 1 for p in near)
    assert [p["distance_km"] for p in far] == sorted(p["distance_km"] for p in far)
    assert far[0]["is_demo"] is True and isinstance(far[0]["facilities"]["dog_friendly"], bool)


def test_filters_require_yes(api):
    found = pubs(api, radius_km=25, has="dog_friendly,cider")
    assert found and all(p["facilities"]["dog_friendly"] and p["drinks"]["cider"] for p in found)


def test_bad_search_input(api):
    assert get(api, "pubs", **CENTRE, has="karaoke").status_code == 400
    assert get(api, "pubs", **CENTRE, radius_km=100).status_code == 422
    assert get(api, "pubs", lat="abc", lng=1).status_code == 422
    assert get(api, "nope").status_code == 404


def test_pub_detail(api):
    pub = pubs(api)[0]
    assert get(api, "pub", id=pub["id"]).json()["name"] == pub["name"]
    assert get(api, "pub", id=999999).status_code == 404


def test_edit_applies_only_after_approval(api):
    pub = pubs(api, radius_km=25)[0]
    r = post(api, "suggest_edit", {"flags": {"pool_table": not pub["facilities"]["pool_table"]}, "note": "Got a new table"}, id=pub["id"])
    assert r.status_code == 201, r.text
    assert get(api, "pub", id=pub["id"]).json()["facilities"]["pool_table"] == pub["facilities"]["pool_table"]

    pending = get(api, "admin_suggestions").json()["suggestions"]
    assert len(pending) == 1 and pending[0]["note"] == "Got a new table"
    assert post(api, "admin_resolve", id=pending[0]["id"], decision="approve").status_code == 200
    assert get(api, "pub", id=pub["id"]).json()["facilities"]["pool_table"] is (not pub["facilities"]["pool_table"])
    assert get(api, "admin_suggestions").json()["suggestions"] == []
    assert post(api, "admin_resolve", id=pending[0]["id"], decision="approve").status_code == 404


def test_new_pub_suggestion(api):
    body = {"name": "The New One", "lat": 53.7250, "lng": -1.8600, "flags": {"cider": True}}
    sid = post(api, "suggest_pub", body).json()["id"]
    post(api, "admin_resolve", id=sid, decision="approve")
    new = [p for p in pubs(api, radius_km=1) if p["name"] == "The New One"]
    assert new and new[0]["drinks"]["cider"] is True and new[0]["drinks"]["lager"] is None


def test_rejected_suggestion_changes_nothing(api):
    pub = pubs(api)[0]
    sid = post(api, "suggest_edit", {"name": "Vandalised"}, id=pub["id"]).json()["id"]
    post(api, "admin_resolve", id=sid, decision="reject")
    assert get(api, "pub", id=pub["id"]).json()["name"] == pub["name"]


def test_suggestion_validation(api):
    pub_id = pubs(api)[0]["id"]
    assert post(api, "suggest_pub", {"name": "No location"}).status_code == 400
    assert post(api, "suggest_edit", {"flags": {"karaoke": True}}, id=pub_id).status_code == 400
    assert post(api, "suggest_edit", {"flags": {"cider": "yes"}}, id=pub_id).status_code == 422
    assert post(api, "suggest_edit", {}, id=pub_id).status_code == 400
    assert post(api, "suggest_edit", {"name": "x" * 500}, id=pub_id).status_code == 422
    assert post(api, "suggest_edit", {"name": "x"}, id=999999).status_code == 404
    assert get(api, "suggest_edit", id=pub_id).status_code == 405


def test_admin_password(api):
    assert get(api, "admin_status").json()["password_set"] is True
    anon = httpx.Client(base_url=str(api.base_url), timeout=30)
    assert anon.get("", params={"action": "admin_suggestions"}).status_code == 401
    assert anon.get("", params={"action": "admin_suggestions"}, headers={"X-Admin-Password": "nope"}).status_code == 401
    assert anon.post("", params={"action": "admin_demo"}).status_code == 401
    # Once set, nobody can set the password again.
    assert anon.post("", params={"action": "admin_setup"}, json={"password": "takeover123"}).status_code == 403


def test_import_from_osm(api):
    r = post(api, "admin_import")
    assert r.status_code == 200, r.text
    assert r.json()["added"] == 2 and r.json()["pubs"] == {"total": 2, "demo": 0}  # demo pubs cleared

    real = {p["name"]: p for p in pubs(api, radius_km=5)}
    assert set(real) == {"Real Pub", "Way Pub"}
    p = real["Real Pub"]
    assert p["facilities"]["dog_friendly"] is True and p["facilities"]["accessible"] is False
    assert p["drinks"]["real_ale"] is True and p["drinks"]["cider"] is None
    assert get(api, "pub", id=p["id"]).json()["address"] == "1 Fake St"
    assert real["Way Pub"]["facilities"]["pool_table"] is True

    # An approved correction survives a re-import even though OSM still says dog=yes.
    sid = post(api, "suggest_edit", {"flags": {"dog_friendly": False, "cider": True}}, id=p["id"]).json()["id"]
    post(api, "admin_resolve", id=sid, decision="approve")
    r = post(api, "admin_import").json()
    assert r["added"] == 0 and r["updated"] == 2
    again = get(api, "pub", id=p["id"]).json()
    assert again["facilities"]["dog_friendly"] is False and again["drinks"]["cider"] is True


def test_private_files_not_served(api):
    # PHP's built-in server ignores .htaccess, so check the files exist that block these on SiteGround (Apache).
    for path in ["lib/.htaccess", "data/.htaccess"]:
        assert open(os.path.join(SITE, path)).read().strip() == "Require all denied"
    assert "config.php" in open(os.path.join(SITE, ".htaccess")).read()
````

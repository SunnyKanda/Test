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

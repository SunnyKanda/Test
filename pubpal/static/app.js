// PubPal front end: map, search, pub details and suggestions.

const HALIFAX = { lat: 53.7245, lng: -1.8616 }; // town centre, used until we know where you are
const RADII_KM = [0.5, 1, 2, 5, 10, 25];

const FACILITIES = {
  shows_sports: ["⚽", "Shows sports"],
  pool_table: ["🎱", "Pool table"],
  dog_friendly: ["🐶", "Dog friendly"],
  outdoor_seating: ["🌳", "Outdoor seating"],
  baby_changing: ["🚼", "Baby changing"],
  accessible: ["♿", "Accessible"],
};
const DRINKS = {
  real_ale: "Cask ale",
  craft_beer: "Craft beer",
  lager: "Lager",
  stout: "Stout",
  cider: "Cider",
  alcohol_free: "Alcohol-free",
};

const state = {
  centre: { ...HALIFAX },
  radiusKm: 2,
  filters: new Set(),
  pubs: [],
  markers: new Map(),
};

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ─── Map ──────────────────────────────────────────────────────────────────────

const map = L.map("map", { zoomControl: true }).setView([HALIFAX.lat, HALIFAX.lng], 14);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const youMarker = L.circleMarker([HALIFAX.lat, HALIFAX.lng], {
  radius: 8, color: "#fff", weight: 3, fillColor: "#1e88e5", fillOpacity: 1,
}).addTo(map).bindTooltip("Search centre");
const radiusCircle = L.circle([HALIFAX.lat, HALIFAX.lng], {
  radius: state.radiusKm * 1000, color: "#b5651d", weight: 1, fillOpacity: 0.06,
}).addTo(map);

const pubIcon = L.divIcon({ className: "", html: '<div style="font-size:24px;line-height:24px">🍺</div>', iconSize: [24, 24], iconAnchor: [12, 12] });

// Tap anywhere on the map to search from there.
map.on("click", (e) => {
  if (addPubMarker) return;
  setCentre(e.latlng.lat, e.latlng.lng, "Searching from the point you tapped.");
});

// ─── Search ───────────────────────────────────────────────────────────────────

function setCentre(lat, lng, message) {
  state.centre = { lat, lng };
  youMarker.setLatLng([lat, lng]);
  radiusCircle.setLatLng([lat, lng]);
  if (message) $("where-status").textContent = message;
  search({ fit: true });
}

async function search({ fit = false } = {}) {
  const { lat, lng } = state.centre;
  const params = new URLSearchParams({ lat, lng, radius_km: state.radiusKm, has: [...state.filters].join(",") });
  const res = await fetch(`/api/pubs?${params}`);
  const data = await res.json();
  state.pubs = data.results;
  renderResults();
  if (fit) map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
}

function renderResults() {
  for (const m of state.markers.values()) m.remove();
  state.markers.clear();

  $("demo-banner").hidden = !state.pubs.some((p) => p.is_demo);
  const n = state.pubs.length;
  $("result-count").textContent = n
    ? `${n} pub${n === 1 ? "" : "s"} within ${formatKm(state.radiusKm)}`
    : `No pubs found within ${formatKm(state.radiusKm)}${state.filters.size ? " with those filters" : ""}. Try a bigger radius.`;

  $("results").innerHTML = state.pubs.map((p) => `
    <li data-id="${p.id}">
      <div class="result-head">
        <span>${esc(p.name)}${p.claimed ? '<span class="badge">✓ Landlord</span>' : ""}</span>
        <span class="result-dist">${formatKm(p.distance_km)}</span>
      </div>
      <div class="result-icons">${Object.entries(FACILITIES).filter(([k]) => p.facilities[k]).map(([, [icon, label]]) => `<span title="${label}">${icon}</span>`).join("")}</div>
      <div class="result-drinks">${Object.entries(DRINKS).filter(([k]) => p.drinks[k]).map(([, label]) => label).join(" · ")}</div>
    </li>`).join("");

  for (const p of state.pubs) {
    const marker = L.marker([p.lat, p.lng], { icon: pubIcon, title: p.name })
      .addTo(map)
      .bindTooltip(`${p.name} · ${formatKm(p.distance_km)}`)
      .on("click", () => openPub(p.id));
    state.markers.set(p.id, marker);
  }
}

const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${Number(km.toFixed(km < 10 ? 1 : 0))} km`);

$("results").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]");
  if (li) openPub(Number(li.dataset.id));
});

// ─── Controls ─────────────────────────────────────────────────────────────────

$("locate").addEventListener("click", () => {
  if (!navigator.geolocation) {
    $("where-status").textContent = "Your browser can't share location. Try a postcode instead.";
    return;
  }
  $("where-status").textContent = "Finding you…";
  navigator.geolocation.getCurrentPosition(
    (pos) => setCentre(pos.coords.latitude, pos.coords.longitude, "Showing pubs near you."),
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
    $("where-status").textContent = "Couldn't find that postcode.";
  }
});

$("radius").addEventListener("input", (e) => {
  state.radiusKm = RADII_KM[Number(e.target.value)];
  $("radius-label").textContent = formatKm(state.radiusKm);
  radiusCircle.setRadius(state.radiusKm * 1000);
});
$("radius").addEventListener("change", () => search({ fit: true }));

function renderChips(containerId, entries) {
  $(containerId).innerHTML = entries
    .map(([key, label]) => `<button class="chip" data-key="${key}" aria-pressed="false">${label}</button>`)
    .join("");
}
renderChips("facility-chips", Object.entries(FACILITIES).map(([k, [icon, label]]) => [k, `${icon} ${label}`]));
renderChips("drink-chips", Object.entries(DRINKS));

document.querySelector(".filters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const key = chip.dataset.key;
  state.filters.has(key) ? state.filters.delete(key) : state.filters.add(key);
  chip.setAttribute("aria-pressed", state.filters.has(key));
  $("filter-count").textContent = state.filters.size ? `(${state.filters.size} on)` : "";
  search();
});

// ─── Pub detail drawer ────────────────────────────────────────────────────────

function openDrawer(html) {
  $("drawer-body").innerHTML = html;
  $("drawer").hidden = false;
}
function closeDrawer() {
  $("drawer").hidden = true;
  clearAddPubMarker();
  document.querySelectorAll(".results li.active").forEach((li) => li.classList.remove("active"));
}
$("drawer-close").addEventListener("click", closeDrawer);

function flagRow(value, label) {
  const cls = value === true ? "yes" : value === false ? "no" : "unknown";
  const mark = value === true ? "✓" : value === false ? "✗" : "?";
  return `<div class="flag ${cls}"><span class="mark">${mark}</span>${label}</div>`;
}

async function openPub(id) {
  const res = await fetch(`/api/pubs/${id}`);
  if (!res.ok) return;
  const p = await res.json();
  const dist = state.pubs.find((x) => x.id === id)?.distance_km;

  document.querySelectorAll(".results li").forEach((li) => li.classList.toggle("active", Number(li.dataset.id) === id));
  map.panTo([p.lat, p.lng]);

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  openDrawer(`
    <h2>${esc(p.name)}</h2>
    ${p.claimed ? '<span class="badge">✓ Details from the landlord</span>' : ""}
    <p class="muted">${esc([p.address, p.postcode].filter(Boolean).join(", "))}${dist != null ? ` · ${formatKm(dist)} away` : ""}</p>
    <div class="actions">
      <a href="${directions}" target="_blank" rel="noopener">Directions (Google Maps)</a>
      ${p.phone ? `<a class="secondary" href="tel:${esc(p.phone)}">Call</a>` : ""}
      ${p.website ? `<a class="secondary" href="${esc(p.website)}" target="_blank" rel="noopener">Website</a>` : ""}
    </div>

    <h3>Facilities</h3>
    <div class="flag-grid">${Object.entries(FACILITIES).map(([k, [icon, label]]) => flagRow(p.facilities[k], `${icon} ${label}`)).join("")}</div>

    <h3>Drinks</h3>
    <div class="flag-grid">${Object.entries(DRINKS).map(([k, label]) => flagRow(p.drinks[k], label)).join("")}</div>

    <p class="muted">✓ yes · ✗ no · ? not known yet</p>
    <button id="suggest-btn">Something wrong or missing? Suggest an edit</button>
  `);
  $("suggest-btn").addEventListener("click", () => openSuggestForm(p));
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

function triSelect(key, label, current) {
  const opt = (v, text) => `<option value="${v}" ${String(current) === v ? "selected" : ""}>${text}</option>`;
  return `<label class="tri"><span>${label}</span>
    <select name="${key}">${opt("null", "Don't know")}${opt("true", "Yes")}${opt("false", "No")}</select></label>`;
}

function suggestionFields(pub) {
  return `
    <h3>Facilities</h3>
    ${Object.entries(FACILITIES).map(([k, [icon, label]]) => triSelect(k, `${icon} ${label}`, pub?.facilities[k] ?? null)).join("")}
    <h3>Drinks available</h3>
    ${Object.entries(DRINKS).map(([k, label]) => triSelect(k, label, pub?.drinks[k] ?? null)).join("")}
    <label>Anything else? <textarea name="note" rows="2" maxlength="500"></textarea></label>
    <button type="submit" class="primary">Send for approval</button>
    <div id="form-msg"></div>`;
}

function readFlags(form, pub) {
  const flags = {};
  for (const key of [...Object.keys(FACILITIES), ...Object.keys(DRINKS)]) {
    const v = form.elements[key].value;
    if (v === "null") continue;
    const current = pub ? { ...pub.facilities, ...pub.drinks }[key] : null;
    if (v !== String(current)) flags[key] = v === "true";
  }
  return flags;
}

async function submitSuggestion(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const msg = $("form-msg");
  if (res.ok) {
    msg.className = "notice";
    msg.textContent = "Thanks! Your suggestion will appear once it's been checked.";
    $("drawer-body").querySelector("button[type=submit]").disabled = true;
  } else {
    const err = await res.json().catch(() => ({}));
    msg.className = "error";
    msg.textContent = typeof err.detail === "string" ? err.detail : "Sorry, that didn't work. Please check the form.";
  }
}

function openSuggestForm(pub) {
  openDrawer(`
    <h2>Suggest an edit</h2>
    <p class="muted">${esc(pub.name)} · only change what you know. Edits are checked before they go live.</p>
    <form id="suggest-form" class="form-grid">${suggestionFields(pub)}</form>`);
  $("suggest-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    submitSuggestion(`/api/pubs/${pub.id}/suggestions`, { flags: readFlags(form, pub), note: form.elements.note.value || null });
  });
}

// Adding a missing pub: drag a pin to where it is, then fill in what you know.
let addPubMarker = null;
function clearAddPubMarker() {
  if (addPubMarker) addPubMarker.remove();
  addPubMarker = null;
}

$("add-pub").addEventListener("click", () => {
  clearAddPubMarker();
  addPubMarker = L.marker(map.getCenter(), { draggable: true, icon: pubIcon }).addTo(map)
    .bindTooltip("Drag me to the pub", { permanent: true, direction: "top" });
  openDrawer(`
    <h2>Add a missing pub</h2>
    <p class="muted">Drag the 🍺 pin on the map to where the pub is.</p>
    <form id="new-pub-form" class="form-grid">
      <label>Pub name <input name="name" required maxlength="120"></label>
      <label>Address <input name="address" maxlength="200"></label>
      <label>Postcode <input name="postcode" maxlength="10"></label>
      ${suggestionFields(null)}
    </form>`);
  $("new-pub-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const { lat, lng } = addPubMarker.getLatLng();
    submitSuggestion("/api/suggestions", {
      name: f.name.value, address: f.address.value || null, postcode: f.postcode.value || null,
      lat, lng, flags: readFlags(e.target, null), note: f.note.value || null,
    });
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

$("where-status").textContent = "Showing Halifax town centre. Use your location, a postcode, or tap the map.";
search();

// Nikke Bol offline cache: everything the app needs, cached on install.
const CACHE = "nikke-bol-v5";
const SHELL = ["./", "index.html", "style.css", "data.js", "audio.js", "core.js", "words.js", "study.js", "profiles.js", "path.js", "reminders.js", "app.js", "privacy.html", "manifest.webmanifest", "icon.svg",
  "fonts/baloo-paaji-2-gurmukhi-500-normal.woff2", "fonts/baloo-paaji-2-gurmukhi-600-normal.woff2", "fonts/baloo-paaji-2-gurmukhi-700-normal.woff2", "fonts/baloo-paaji-2-gurmukhi-800-normal.woff2",
  "fonts/baloo-paaji-2-latin-500-normal.woff2", "fonts/baloo-paaji-2-latin-600-normal.woff2", "fonts/baloo-paaji-2-latin-700-normal.woff2", "fonts/baloo-paaji-2-latin-800-normal.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(res => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});

"use strict";
/* Shared plumbing: settings, sound, family voices, progress, sparkles, screens. */

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickOne = a => a[Math.random() * a.length | 0];
const state = { view: "home", cat: null, set: 0, i: 0, auto: false, autoTimer: 0, back: null };

/* Today, in Punjabi. Desi months follow the Nanakshahi start dates. */
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5]; // JS getDay() (Sun=0) -> index in the days list (Mon first)
const DESI_STARTS = [[3, 14], [4, 14], [5, 15], [6, 15], [7, 16], [8, 16], [9, 15], [10, 15], [11, 14], [12, 14], [1, 13], [2, 12]];
function desiMonthIndex(d) {
  const order = x => ((x[0] - 3 + 12) % 12) * 100 + x[1]; // months counted from Chet (March)
  const now = order([d.getMonth() + 1, d.getDate()]);
  let idx = 11;
  DESI_STARTS.forEach((s, i) => { if (now >= order(s)) idx = i; });
  return idx;
}

/* =========================================================
   Settings (per device)
   ========================================================= */
const LEVELS = [
  { id: "baby", pa: "ਨਿੱਕੇ", en: "Baby" },
  { id: "child", pa: "ਬੱਚੇ", en: "Child" },
  { id: "adult", pa: "ਵੱਡੇ", en: "Grown-up learner" },
];
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

/* Learners. Each has their own settings, progress, streak and path; family recordings are shared. */
const DEFAULTS = { en: true, tr: true, sfx: true, rate: 0.8, rec: false, level: "baby", goal: 5 };
const AVATARS = ["🦁", "🐯", "🐼", "🦚", "🐘", "🐰", "🦄", "🐻", "🐥", "🐬", "🦋", "🌻"];
const blankProgress = () => ({ items: {}, log: {}, path: {} });
let PROFILES = store.get("nikke-bol:profiles", []);
let current = null, S = { ...DEFAULTS }, P = blankProgress();
const save = () => { if (current) store.set(`nikke-bol:${current}:settings`, S); };
const saveP = () => { if (current) store.set(`nikke-bol:${current}:progress`, P); };
const profile = () => PROFILES.find(p => p.id === current);
function loadProfile(id) {
  current = id; store.set("nikke-bol:current", id);
  S = { ...DEFAULTS, ...store.get(`nikke-bol:${id}:settings`, {}) };
  P = { ...blankProgress(), ...store.get(`nikke-bol:${id}:progress`, {}) };
  // Days from the first version become practised days.
  if (P.days) { P.days.forEach(d => { P.log[d] = P.log[d] || { secs: 0, n: 3 }; }); delete P.days; saveP(); }
}
function addProfile(name, avatar, settings = {}) {
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  PROFILES.push({ id, name, avatar, created: Date.now() });
  store.set("nikke-bol:profiles", PROFILES);
  loadProfile(id);
  Object.assign(S, settings); save(); saveP();
  return id;
}
function updateProfile(id, fields) { Object.assign(PROFILES.find(p => p.id === id), fields); store.set("nikke-bol:profiles", PROFILES); }
function removeProfile(id) {
  PROFILES = PROFILES.filter(p => p.id !== id);
  store.set("nikke-bol:profiles", PROFILES);
  store.del(`nikke-bol:${id}:settings`); store.del(`nikke-bol:${id}:progress`);
  if (current === id) { current = null; if (PROFILES.length) loadProfile(PROFILES[0].id); }
}
(() => {
  // The single-learner version kept one set of settings and progress; move them into a first learner.
  const oldS = store.get("nikke-bol", null), oldP = store.get("nikke-bol-progress", null);
  if (!PROFILES.length && (oldS || oldP)) {
    addProfile("Learner", "🦚", oldS || {});
    if (oldP) { P = { ...blankProgress(), ...oldP }; saveP(); loadProfile(current); }
    store.del("nikke-bol"); store.del("nikke-bol-progress");
  }
  const want = store.get("nikke-bol:current", null);
  if (PROFILES.some(p => p.id === want)) loadProfile(want);
  else if (PROFILES.length) loadProfile(PROFILES[0].id);
})();
const atLeast = lvl => LEVELS.findIndex(l => l.id === S.level) >= LEVELS.findIndex(l => l.id === lvl);

/* =========================================================
   Sound. Every phrase has a built-in recording in audio.js
   (NB_TEXT maps the Gurmukhi text to its clip). The device's own
   text-to-speech is only a backstop for a missing clip.
   ========================================================= */
const BUILTIN = window.NB_AUDIO || {};
const TEXT_INDEX = window.NB_TEXT || {};
const norm = t => String(t).replace(/[।!?]/g, "").trim();
const clipFor = text => BUILTIN[TEXT_INDEX[norm(text)]] || null;

const synth = window.speechSynthesis;
const NUKTA = { "ਖ਼": "ख़", "ਗ਼": "ग़", "ਜ਼": "ज़", "ੜ": "ड़", "ਫ਼": "फ़", "ੰ": "ं", "ੲ": "", "ੳ": "", "ੵ": "" };
function toDevanagari(s) {
  s = s.replace(/ੱ([ਕ-ਹਖ਼-ਫ਼])/g, (m, c) => c + "੍" + c); // addak doubles the next letter
  return [...s].map(ch => {
    if (ch in NUKTA) return NUKTA[ch];
    const c = ch.charCodeAt(0);
    return c >= 0x0A00 && c <= 0x0A7F ? String.fromCharCode(c - 0x100) : ch;
  }).join("");
}
function ttsVoice() {
  const v = synth ? synth.getVoices() : [];
  return v.find(x => /^pa/i.test(x.lang)) || v.find(x => /^hi/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null;
}

let speakToken = 0, audioEl = null;
function stopAudio() { if (audioEl) { audioEl.pause(); audioEl = null; } }
function stopSpeaking() { speakToken++; synth && synth.cancel(); stopAudio(); }
function playSrc(src, done) {
  const a = audioEl = new Audio(src);
  a.playbackRate = Math.min(1.3, Math.max(0.6, S.rate / 0.8)); // the speed slider's default (0.8) is natural speed
  let ended = false;
  const end = () => { if (!ended) { ended = true; done && done(); } };
  a.onended = end; a.onerror = end;
  a.play().catch(end);
}
function speakTTS(pa, tr, done) {
  const token = speakToken;
  const end = () => { if (token === speakToken) done && done(); };
  if (!synth) { setTimeout(end, 900); return; }
  const v = ttsVoice(), mode = !v ? "none" : /^pa/i.test(v.lang) ? "pa" : /^hi/i.test(v.lang) ? "hi" : "en";
  const text = mode === "pa" ? pa : mode === "hi" ? toDevanagari(pa) : (tr || pa);
  const u = new SpeechSynthesisUtterance(text);
  if (v) u.voice = v;
  u.rate = +S.rate;
  let fired = false;
  u.onend = u.onerror = () => { if (!fired) { fired = true; end(); } };
  synth.speak(u);
  setTimeout(() => { if (!fired) { fired = true; end(); } }, 1500 + text.length * 260);
}
/* Say a list of phrases one after another. Family recordings (by key) win over the built-in voice. */
function say(texts, opts = {}) {
  stopSpeaking();
  const token = speakToken, list = [].concat(texts);
  const fam = opts.key && Rec.get(opts.key);
  if (fam) { playBlob(fam, opts.done); return; }
  let k = 0;
  const next = () => {
    if (token !== speakToken) return;
    if (k >= list.length) { opts.done && opts.done(); return; }
    const t = list[k++], src = clipFor(t);
    const after = () => setTimeout(next, opts.gap ?? 220);
    if (src) playSrc(src, after);
    else speakTTS(t, k === 1 ? opts.tr : "", after);
  };
  next();
}
function playBlob(blob, done) {
  const url = URL.createObjectURL(blob);
  playSrc(url, () => { URL.revokeObjectURL(url); done && done(); });
}

/* Little sounds (WebAudio, no files) */
let actx = null;
function tone(freqs, dur = 0.12, type = "triangle", gap = 0.08) {
  if (!S.sfx) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * gap;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    });
  } catch (e) {}
}
const pop = () => tone([660, 990], 0.1);
const yay = () => tone([523, 659, 784, 1047], 0.18, "triangle", 0.09);
const boop = () => tone([330, 262], 0.12, "sine", 0.1);

/* =========================================================
   Family voices: recordings made on this device (IndexedDB), packs
   imported from a file, and, inside the shared Claude page, a family
   store everyone with the link hears.
   ========================================================= */
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
const dataURLToBlob = u => { const [h, d] = u.split(","); const bin = atob(d); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: h.slice(5, h.indexOf(";")) }); };

const Rec = {
  db: null, cache: new Map(),
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open("nikke-bol", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("voices");
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => { const t = db.transaction("voices", mode); fn(t.objectStore("voices")); t.oncomplete = res; t.onerror = () => rej(t.error); });
  },
  async loadAll() {
    try {
      const db = await this.open();
      await new Promise(res => {
        const req = db.transaction("voices").objectStore("voices").openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { this.cache.set(c.key, c.value); c.continue(); } else res(); };
        req.onerror = () => res();
      });
    } catch (e) {}
  },
  get(k) { return this.cache.get(k); },
  async put(k, blob, share = true) {
    this.cache.set(k, blob);
    try { await this.tx("readwrite", s => s.put(blob, k)); } catch (e) {}
    if (share) Family.push(k, blob);
  },
  async del(k) {
    this.cache.delete(k);
    try { await this.tx("readwrite", s => s.delete(k)); } catch (e) {}
    Family.remove(k);
  },
};

const hexKey = k => "v" + [...new TextEncoder().encode(k)].map(b => b.toString(16).padStart(2, "0")).join("");
const Family = {
  store: null, shared: 0,
  async init() {
    if (!window.claude || !window.claude.use) return;
    let db = null;
    try { db = await window.claude.use("db"); } catch (e) {}
    if (!db) return;
    this.store = db.collection("voices");
    this.store.onSnapshot(snap => {
      snap.docChanges().forEach(ch => {
        const d = ch.doc.data() || {};
        if (!d.key) return;
        if (ch.type === "removed") { Rec.cache.delete(d.key); return; }
        try { const b = dataURLToBlob(d.audio); Rec.cache.set(d.key, b); Rec.tx("readwrite", s => s.put(b, d.key)).catch(() => {}); } catch (e) {}
      });
      this.shared = snap.size;
      refreshView();
    }, () => { this.store = null; });
  },
  async push(k, blob) {
    if (!this.store) return;
    try {
      const audio = await blobToDataURL(blob);
      if (audio.length > 240000) { toast("That recording is too long to share. Keep it under 10 seconds."); return; }
      await this.store.doc(hexKey(k)).set({ key: k, audio, at: Date.now() });
    } catch (e) { toast("Saved on this device. Only editors of this page can share recordings with the family."); }
  },
  async remove(k) { if (this.store) try { await this.store.doc(hexKey(k)).delete(); } catch (e) {} },
};

async function exportVoices() {
  const pack = { app: "nikke-bol", version: 1, voices: {} };
  for (const [k, b] of Rec.cache) pack.voices[k] = await blobToDataURL(b);
  const n = Object.keys(pack.voices).length;
  if (!n) { toast("No family recordings yet. Switch on “Record my own voice” first."); return; }
  const json = JSON.stringify(pack), name = "nikke-bol-family-voices.json";
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) {}
  if (dl) { try { await dl.save({ filename: name, data: new Blob([json], { type: "application/json" }) }); } catch (e) {} return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  toast(`Saved ${n} recordings. Send the file to family, then they tap “Add a voice pack”.`);
}
async function importVoices(file) {
  try {
    const pack = JSON.parse(await file.text());
    if (!pack || pack.app !== "nikke-bol" || !pack.voices) throw new Error("not a pack");
    let n = 0;
    for (const [k, u] of Object.entries(pack.voices)) { await Rec.put(k, dataURLToBlob(u)); n++; }
    toast(`Added ${n} family recordings.`);
    refreshView();
  } catch (e) { toast("That file isn't a Nikke Bol voice pack."); }
}

/* =========================================================
   Progress: every word, letter and reading word is a card in a
   Leitner box. Right answers move it up a box (seen again later),
   a wrong answer sends it back to box 1.
   ========================================================= */
const DAY = 864e5;
const INTERVALS = [0, 1, 2, 4, 8, 16, 32].map(d => d * DAY);
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayStr = () => dayKey(new Date());
const dayLog = (k = todayStr()) => P.log[k] || (P.log[k] = { secs: 0, n: 0 });
function markDay() { dayLog().n++; }
function seen(key) {
  if (!P.items[key]) { P.items[key] = { box: 0, due: Date.now(), right: 0, wrong: 0 }; markDay(); saveP(); }
}
function grade(key, ok) {
  const it = P.items[key] || (P.items[key] = { box: 0, due: 0, right: 0, wrong: 0 });
  if (ok) { it.box = Math.min(6, it.box + 1); it.right++; } else { it.box = 1; it.wrong++; }
  it.due = Date.now() + (ok ? INTERVALS[it.box] : 10 * 60e3);
  markDay(); saveP();
}
/* A day counts once you have practised for a minute or met three words. */
const practised = k => { const l = P.log[k]; return !!l && (l.secs >= 60 || l.n >= 3); };
const goalMet = k => { const l = P.log[k]; return !!l && l.secs >= S.goal * 60; };
/* Streak of practised days. One missed day a week is a free rest day and doesn't break it. */
function streak() {
  const d = new Date(); let n = 0, lastRest = -99;
  if (!practised(dayKey(d))) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 2000; i++) {
    if (practised(dayKey(d))) n++;
    else {
      const before = new Date(d); before.setDate(before.getDate() - 1);
      if (n > 0 && i - lastRest >= 7 && practised(dayKey(before))) lastRest = i;
      else break;
    }
    d.setDate(d.getDate() - 1);
  }
  return n;
}
/* Time spent: counted in 5-second steps while the app is open and someone touched it in the last minute. */
let lastAct = 0;
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => { lastAct = Date.now(); }, true);
setInterval(() => {
  if (!current || document.hidden || Date.now() - lastAct > 60e3) return;
  const L = dayLog(), before = L.secs, goal = S.goal * 60;
  L.secs += 5;
  if (L.secs % 30 === 0) saveP();
  if (before < goal && L.secs >= goal) { saveP(); if (typeof Reminders !== "undefined") Reminders.refresh(); setTimeout(() => { yay(); say([UI_SAY.goalDone]); toast(`Today's ${S.goal} minutes done! 🔥 ${streak()} day streak`); }, 400); }
  if (typeof renderGoal === "function") renderGoal();
}, 5000);
addEventListener("visibilitychange", () => { if (document.hidden) { saveP(); if (typeof Reminders !== "undefined") Reminders.refresh(); } });
const dueKeys = () => Object.entries(P.items).filter(([k, v]) => v.due <= Date.now()).sort((a, b) => a[1].due - b[1].due).map(([k]) => k);

/* =========================================================
   Sparkles: a burst of stars, petals and dots from where you tap.
   ========================================================= */
const fx = $("fx"), g2 = fx.getContext("2d");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let parts = [], raf = 0;
const FX_COLS = ["#ffb627", "#ff3d8b", "#16c2b0", "#7ccf3c", "#ff7a1a", "#9b5cff", "#fff4e8"];
function sizeFx() { const d = devicePixelRatio || 1; fx.width = innerWidth * d; fx.height = innerHeight * d; g2.setTransform(d, 0, 0, d, 0, 0); }
addEventListener("resize", sizeFx); sizeFx();
function burst(x, y, n = 26, big = false) {
  if (reduced) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (big ? 6 : 3.5) + Math.random() * (big ? 7 : 4);
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (big ? 4 : 2), r: 4 + Math.random() * 7, life: 1,
      c: FX_COLS[i % FX_COLS.length], s: Math.floor(Math.random() * 3), rot: Math.random() * 6, vr: (Math.random() - .5) * .3 });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
function shape(p) {
  g2.save(); g2.translate(p.x, p.y); g2.rotate(p.rot); g2.globalAlpha = Math.max(0, p.life); g2.fillStyle = p.c;
  g2.beginPath();
  if (p.s === 0) { for (let i = 0; i < 10; i++) { const rr = i % 2 ? p.r * .45 : p.r; const a = i * Math.PI / 5; g2.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } }
  else if (p.s === 1) { g2.moveTo(0, -p.r); g2.lineTo(p.r * .8, 0); g2.lineTo(0, p.r); g2.lineTo(-p.r * .8, 0); } // phulkari diamond
  else g2.arc(0, 0, p.r * .6, 0, Math.PI * 2);
  g2.closePath(); g2.fill(); g2.restore();
}
function tick() {
  g2.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += .22; p.vx *= .985; p.rot += p.vr; p.life -= .016; shape(p); }
  raf = parts.length ? requestAnimationFrame(tick) : 0;
  if (!raf) g2.clearRect(0, 0, innerWidth, innerHeight);
}
function burstFrom(el, n, big) { if (!el || !el.isConnected) return; const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, n, big); }

/* =========================================================
   Screens. Home, Learn and Game have fixed markup; everything else
   renders into the generic #page screen.
   ========================================================= */
function show(view) {
  state.view = view;
  for (const id of ["home", "learn", "game", "page"]) $(id).hidden = id !== view;
  if (view !== "learn" && typeof stopAuto === "function") stopAuto();
  if (view !== "page") state.pageRender = null;
  scrollTo(0, 0);
}
/* Open a page: title, Punjabi title spoken when tapped, and a render function that fills #pageBody. */
function openPage(pa, en, render, back = goHome) {
  stopSpeaking();
  state.pageRender = render; state.back = back;
  $("ptitle").innerHTML = `${esc(pa)}<small>${esc(en)}</small>`;
  $("ptitle").onclick = () => say([pa]);
  $("pextra").innerHTML = "";
  show("page");
  render($("pageBody"));
}
function goHome() { stopSpeaking(); show("home"); renderHome(); }
function refreshView() {
  if (state.view === "learn" && typeof renderCard === "function") renderCard();
  if (state.view === "page" && state.pageRender && state.pageLive) state.pageRender($("pageBody"));
}

let toastT = 0;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3600); }

/* Shared visuals for any word-like item. */
function luminance(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
function visualOf(item, small = false) {
  if (item.hex) return `<span class="swatch${small ? " sm" : ""}" style="--sw:${item.hex}">${item.e || ""}</span>`;
  if (item.num) return `<span class="numeral">${item.num}</span>`;
  if (item.letter) return `<span class="letter">${item.letter}</span>`;
  return `<span class="emo">${item.e || ""}</span>`;
}
const GENDER = { m: "ਪੁਲਿੰਗ · masculine", f: "ਇਸਤਰੀ ਲਿੰਗ · feminine" };
const TONAL = { "ਘ": "k", "ਝ": "ch", "ਢ": "t", "ਧ": "t", "ਭ": "p" };
function grownUpNote(item) {
  const bits = [];
  if (item.g) bits.push(GENDER[item.g]);
  const first = (item.word || item.pa || "")[0];
  if (TONAL[first]) bits.push(`starts with ${first}: say a soft “${TONAL[first]}” with a low, rising tone`);
  return bits.join(" · ");
}

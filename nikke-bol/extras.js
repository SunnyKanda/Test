"use strict";
/* Stickers, word of the day, and the grown-ups rating card. */

/* =========================================================
   Stickers: earned for milestones, collected in a sticker book.
   ========================================================= */
const keysOf = catId => CATS.find(c => c.id === catId).sets.flatMap(s => s.items).map(it => it.key);
const metCount = () => Object.keys(P.items).length;
const unitsDone = () => Object.values(P.path || {}).filter(Boolean).length;
const stat = k => (P.stats || {})[k] || 0;
const answered = () => Object.values(P.items).reduce((s, v) => s + v.right + v.wrong, 0);
const allMet = keys => keys.every(k => P.items[k]);
const STICKERS = [
  { id: "first-word", e: "🌱", en: "First word", how: "Hear your first word", test: () => metCount() >= 1 },
  { id: "words-10", e: "🌼", en: "10 words", how: "Meet 10 words", test: () => metCount() >= 10 },
  { id: "words-50", e: "🌻", en: "50 words", how: "Meet 50 words", test: () => metCount() >= 50 },
  { id: "words-100", e: "🌳", en: "100 words", how: "Meet 100 words", test: () => metCount() >= 100 },
  { id: "words-250", e: "🏵️", en: "250 words", how: "Meet 250 words", test: () => metCount() >= 250 },
  { id: "goal-1", e: "🎯", en: "Goal!", how: "Meet your daily goal", test: () => Object.keys(P.log).some(goalMet) },
  { id: "streak-3", e: "🔥", en: "3-day streak", how: "Practise 3 days in a row", test: () => streak() >= 3 },
  { id: "streak-7", e: "🦚", en: "7-day streak", how: "Practise for a whole week", test: () => streak() >= 7 },
  { id: "streak-30", e: "🏆", en: "30-day streak", how: "Practise for a month", test: () => streak() >= 30 },
  { id: "unit-1", e: "⭐", en: "First unit", how: "Finish a unit on the path", test: () => unitsDone() >= 1 },
  { id: "three-stars", e: "🌟", en: "Three stars", how: "Get three stars on a unit", test: () => Object.values(P.path || {}).some(s => s === 3) },
  { id: "units-10", e: "🎖️", en: "10 units", how: "Finish 10 units", test: () => unitsDone() >= 10 },
  { id: "path-done", e: "👑", en: "Whole path", how: "Finish every unit", test: () => pathUnits().every(u => unitStars(u)) },
  { id: "colours", e: "🎨", en: "All the colours", how: "Meet all 12 colours", test: () => allMet(keysOf("colours")) },
  { id: "counting", e: "🔢", en: "Count to 20", how: "Meet the numbers 1 to 20", test: () => allMet(keysOf("numbers")) },
  { id: "family", e: "👨‍👩‍👧", en: "Family", how: "Meet all the family words", test: () => allMet(keysOf("family")) },
  { id: "letters", e: "ੳ", en: "All 35 letters", how: "Meet every letter of the ਪੈਂਤੀ", test: () => allMet(keysOf("painti")) },
  { id: "reader", e: "📖", en: "Reader", how: "Read 5 words on your own", test: () => Object.entries(P.items).filter(([k, v]) => k.startsWith("read:") && v.right).length >= 5 },
  { id: "writer", e: "✍️", en: "Writer", how: "Trace 5 letters", test: () => stat("traced") >= 5 },
  { id: "speaker", e: "🎙️", en: "Speaker", how: "Record yourself 3 times", test: () => stat("spoke") >= 3 },
  { id: "reviewer", e: "🔁", en: "Super memory", how: "Answer 50 questions", test: () => answered() >= 50 },
  { id: "tones", e: "🎵", en: "Good ears", how: "Finish a tones quiz", test: () => stat("tones") >= 1, level: "adult" },
];
const stickerList = () => STICKERS.filter(s => !s.level || atLeast(s.level));
let stickerQueue = [], stickerTimer = 0;
function checkStickers() {
  if (!current) return;
  clearTimeout(stickerTimer);
  stickerTimer = setTimeout(() => {
    P.stickers = P.stickers || {};
    const fresh = stickerList().filter(s => !P.stickers[s.id] && s.test());
    if (!fresh.length) return;
    fresh.forEach(s => { P.stickers[s.id] = Date.now(); });
    saveP();
    stickerQueue.push(...fresh);
    flushStickers();
  }, 300);
}
/* Stickers wait for a pause: home, word cards, the game, or the end of a quiz. Never mid-question. */
function flushStickers(force = false) {
  if (!stickerQueue.length || !$("stickerPop").hidden) return;
  if (!force && !["home", "learn", "game"].includes(state.view)) return;
  setTimeout(showNextSticker, 900); // let the right-answer moment finish first
}
function showNextSticker() {
  const s = stickerQueue.shift(), el = $("stickerPop");
  if (!s) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<div class="sp-card" role="dialog" aria-label="New sticker: ${esc(s.en)}">
      <div class="sp-ribbon">${UI_SAY.newSticker}</div>
      <div class="badge-big">${s.e}</div>
      <b>${esc(s.en)}</b><small>${esc(s.how)}</small>
      <button class="cta" id="spOk">${UI_SAY.well.replace("!", "")} ›</button>
      ${stickerQueue.length ? `<span class="hint">+${stickerQueue.length} more</span>` : ""}
    </div>`;
  yay(); say([UI_SAY.newSticker]);
  setTimeout(() => burstFrom(el.querySelector(".badge-big"), 70, true), 200);
  $("spOk").onclick = () => { pop(); showNextSticker(); if (state.view === "home") renderHome(); };
}
function openStickers() {
  openPage(UI_SAY.stickers, "Sticker book", body => {
    const list = stickerList(), got = P.stickers || {}, n = list.filter(s => got[s.id]).length;
    body.innerHTML = `<div class="pathhead"><b>${n} of ${list.length} stickers</b><span class="track"><i style="width:${n / list.length * 100}%"></i></span></div>
      <div class="stickers">${list.map(s => got[s.id]
        ? `<button class="sticker got" data-s="${s.id}"><span class="badge">${s.e}</span><b>${esc(s.en)}</b><small>${new Date(got[s.id]).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></button>`
        : `<div class="sticker"><span class="badge">?</span><b>${esc(s.en)}</b><small>${esc(s.how)}</small></div>`).join("")}</div>`;
    body.querySelectorAll(".sticker.got").forEach(b => b.onclick = e => { pop(); burst(e.clientX, e.clientY, 20); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); });
  });
}

/* =========================================================
   Word of the day: the same word as today's reminder.
   ========================================================= */
const wordOfDay = (date = new Date()) => Reminders.wordOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));
function wordCardHTML() {
  const w = wordOfDay();
  return `<button class="wotd" id="wotd"><span class="emo">${w.e}</span>
    <span class="txt"><small>${UI_SAY.wordOfDay} · Word of the day</small><b>${w.pa}</b><span>${S.tr ? w.tr + " · " : ""}${esc(w.en)}</span></span><span class="spk">🔊</span></button>`;
}
function wireWordCard() {
  const el = $("wotd"); if (!el) return;
  const w = wordOfDay();
  el.onclick = e => { pop(); burst(e.clientX, e.clientY, 20); seen(w.key); say(w.say, { key: w.key, tr: w.sayTr }); };
}
function openWordOfDay(date = new Date()) {
  const w = wordOfDay(date);
  openPage(UI_SAY.wordOfDay, "Word of the day", body => {
    body.innerHTML = `<button class="flash learncard" id="wdCard"><div class="vis">${visualOf(w)}</div><div class="word">${w.pa}</div>
        ${S.tr ? `<div class="tr">${w.tr}</div>` : ""}<div class="en">${esc(w.en)}</div><span class="hint">🔊 Tap to hear it again</span></button>
      <div class="row2"><button class="cta" id="wdMore">${atLeast("child") ? "Carry on with the path ›" : "More words ›"}</button></div>`;
    const hear = () => say([UI_SAY.wordOfDay, ...w.say], { key: w.key, gap: 450 });
    seen(w.key); hear();
    $("wdCard").onclick = e => { pop(); burst(e.clientX, e.clientY, 20); say(w.say, { key: w.key }); };
    $("wdMore").onclick = () => { pop(); state.tab = atLeast("child") ? "path" : "words"; state.scrollPath = true; goHome(); };
  });
}

/* =========================================================
   Rating card: asked of grown-ups after a happy moment, never
   mid-lesson, behind the grown-ups check (kids' app rules).
   ========================================================= */
const Rate = {
  get rec() { return store.get("nikke-bol:rate", { asked: 0, times: 0, done: false, first: 0 }); },
  set rec(v) { store.set("nikke-bol:rate", v); },
  plugin() { const c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins.InAppReview || null; },
  maybe() {
    const r = this.rec;
    if (!this.plugin() || r.done || r.times >= 3 || !$("stickerPop").hidden) return;
    if (Date.now() - r.first < 2 * DAY || Date.now() - r.asked < 120 * DAY) return;
    if (streak() < 3 && !Object.values(P.path || {}).some(s => s === 3)) return;
    this.rec = { ...r, asked: Date.now(), times: r.times + 1 };
    const el = $("rateCard");
    el.hidden = false;
    el.innerHTML = `<div class="sp-card"><div class="badge-big">💛</div><b>Grown-ups: enjoying Nikke Bol?</b>
      <small>A quick rating helps other families find it. It takes a few seconds.</small>
      <div class="row2"><button class="cta ghost" id="rNo">Not now</button><button class="cta" id="rYes">Rate it ★</button></div></div>`;
    $("rNo").onclick = () => { el.hidden = true; };
    $("rYes").onclick = () => { el.hidden = true; parentGate(async () => { try { await this.plugin().requestReview(); this.rec = { ...this.rec, done: true }; } catch (e) {} }); };
  },
};

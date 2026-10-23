"use strict";
/* Home, word cards and the find-it game. */

/* ---- Home ---- */
const levelCats = () => CATS.map((c, i) => ({ c, i })).filter(({ c }) => !c.level || atLeast(c.level));
const STUDY_TILES = [
  { id: "reading", pa: UI_SAY.read, en: "Reading", emoji: "ਕਾ", c: "#ffb627", level: "child", open: () => openReading() },
  { id: "chart", pa: UI_SAY.chart, en: "Sound chart", emoji: "ਕਿ", c: "#16c2b0", level: "child", open: () => openChart() },
  { id: "write", pa: UI_SAY.write, en: "Writing", emoji: "✍️", c: "#ff8fb3", level: "child", open: () => openTracing() },
  { id: "sentences", pa: UI_SAY.sentences, en: "Sentences", emoji: "🧩", c: "#9b5cff", level: "child", open: () => openSentences() },
  { id: "speak", pa: UI_SAY.speak, en: "Listen & say it", emoji: "🎙️", c: "#ff7a1a", level: "child", open: () => openSpeak() },
  { id: "tones", pa: UI_SAY.tones, en: "Tones", emoji: "🎵", c: "#7ccf3c", level: "adult", open: () => openTones() },
  { id: "review", pa: UI_SAY.review, en: "Review", emoji: "🔁", c: "#ff3d8b", level: "child", open: () => openReview() },
  { id: "progress", pa: UI_SAY.progress, en: "My progress", emoji: "⭐", c: "#fff4e8", level: "child", open: () => openProgress() },
  { id: "calendar", pa: UI_SAY.calendar, en: "Calendar", emoji: "📅", c: "#16c2b0", level: "child", open: () => openCalendar() },
  { id: "stickers", pa: UI_SAY.stickers, en: "Sticker book", emoji: "🏅", c: "#ffb627", level: "child", open: () => openStickers() },
];

const HOME_TABS = [
  { id: "path", pa: UI_SAY.path, en: "Path" },
  { id: "words", pa: UI_SAY.words, en: "Words" },
  { id: "practice", pa: UI_SAY.practice, en: "Practice" },
];
function renderHome() {
  renderProfileChip();
  renderGoal();
  const tabbed = atLeast("child");
  if (!state.tab) state.tab = "path";
  const tab = tabbed ? state.tab : "words";
  $("tabs").hidden = !tabbed;
  $("tabs").innerHTML = HOME_TABS.map(t => `<button role="tab" aria-selected="${t.id === tab}" data-t="${t.id}">${t.pa}<small>${t.en}</small></button>`).join("");
  $("tabs").querySelectorAll("button").forEach(b => b.onclick = () => { state.tab = b.dataset.t; pop(); say([HOME_TABS.find(t => t.id === state.tab).pa]); renderHome(); scrollTo(0, 0); });
  $("today").hidden = tab !== "words";
  $("foot").hidden = tab !== "words";

  if (tab === "path") { renderPath($("tiles")); $("tiles").insertAdjacentHTML("afterbegin", wordCardHTML()); wireWordCard(); return; }
  const now = new Date();
  const dIdx = DAY_ORDER[now.getDay()];
  const day = CATS[2].sets[0].items[dIdx];
  const month = CATS[3].sets[0].items[now.getMonth()];
  const desi = CATS[3].sets[1].items[desiMonthIndex(now)];
  $("today").innerHTML = `<span class="big">ਅੱਜ <b>${day.pa}</b> ਹੈ ${day.e}</span>
    <span class="sub">Today is ${day.en} · ${month.pa} · ${desi.pa}</span>`;
  $("today").onclick = e => { pop(); burst(e.clientX, e.clientY); say([`ਅੱਜ ${day.pa} ਹੈ`], { tr: `ajj ${day.tr} hai` }); };

  const due = dueKeys().length;
  const tile = (attrs, c, emoji, pa, en, extra = "") => `<button class="tile" style="--c:${c}" ${attrs}>
      <span class="emo">${emoji}</span><span class="pa">${pa}</span><span class="en">${en}</span>${extra}</button>`;
  let html = "";
  if (tab === "words") {
    html += wordCardHTML() + `<div class="tiles">${levelCats().map(({ c, i }) => tile(`data-i="${i}"`, c.c, c.emoji, c.pa, c.en)).join("")}</div>
      <button class="tile wide" style="--c:#fff4e8" data-game="1"><span class="emo">🎈</span><span><span class="pa">ਖੇਡ</span><br><span class="en">Game · find the right one</span></span></button>`;
    if (!tabbed) html += `<button class="tile wide" style="--c:#ffb627" data-s="stickers"><span class="emo">🏅</span><span><span class="pa">${UI_SAY.stickers}</span><br><span class="en">Sticker book · ${Object.keys(P.stickers || {}).length} collected</span></span></button>`;
  } else {
    const study = STUDY_TILES.filter(t => atLeast(t.level));
    html += `<div class="tiles">${study.map(t => tile(`data-s="${t.id}"`, t.c, t.emoji, t.pa, t.en, t.id === "review" && due ? `<span class="due">${due}</span>` : "")).join("")}</div>`;
  }
  $("tiles").innerHTML = html;
  wireWordCard();
  $("tiles").querySelectorAll(".tile").forEach(t => t.onclick = e => {
    pop(); burst(e.clientX, e.clientY, 18);
    if (t.dataset.game) return openGame();
    if (t.dataset.s === "stickers") { say([UI_SAY.stickers]); return openStickers(); }
    if (t.dataset.s) { const s = STUDY_TILES.find(x => x.id === t.dataset.s); say([s.pa]); return s.open(); }
    const c = CATS[+t.dataset.i];
    say([c.pa], { tr: c.tr });
    openLearn(+t.dataset.i);
  });
}

/* ---- Learn ---- */
const cat = () => CATS[state.cat];
const items = () => cat().sets[state.set].items;

function openLearn(ci) {
  state.cat = ci; state.set = 0; state.i = 0;
  const now = new Date();
  if (cat().id === "days") state.i = DAY_ORDER[now.getDay()];
  if (cat().id === "months") state.i = now.getMonth();
  show("learn");
  $("ltitle").innerHTML = `${cat().pa}<small>${cat().en}</small>`;
  renderSets();
  renderCard();
}
function renderSets() {
  const sets = cat().sets;
  $("sets").hidden = sets.length < 2;
  $("sets").innerHTML = sets.map((s, i) => `<button aria-pressed="${i === state.set}" data-i="${i}">${s.pa}${S.en && s.en ? ` <small>${s.en}</small>` : ""}</button>`).join("");
  $("sets").querySelectorAll("button").forEach(b => b.onclick = () => {
    state.set = +b.dataset.i; stopAuto();
    const now = new Date();
    state.i = cat().id === "months" ? (state.set === 0 ? now.getMonth() : desiMonthIndex(now)) : 0;
    pop(); renderSets(); renderCard();
  });
}
function isToday(c, i) {
  const now = new Date();
  if (c.id === "days") return i === DAY_ORDER[now.getDay()];
  if (c.id === "months") return state.set === 0 ? i === now.getMonth() : i === desiMonthIndex(now);
  return false;
}
function cardHTML(c, item, i) {
  const words = (pa, tr, en) => `<div class="pa">${esc(pa)}</div>${S.tr ? `<div class="tr">${esc(tr)}</div>` : ""}${S.en && en !== "" ? `<div class="en">${esc(en)}</div>` : ""}`;
  let h = "";
  if (isToday(c, i)) h += `<span class="badge">${c.id === "days" ? "ਅੱਜ · today" : "ਇਹ ਮਹੀਨਾ · this month"}</span>`;
  if (Rec.get(item.key)) h += `<span class="recbadge" title="Family recording">🎙️</span>`;
  if (c.id === "numbers") {
    h += `<div class="vis numeral">${item.num}</div>
      <div class="count${item.n > 10 ? " many" : ""}" aria-hidden="true">${Array(item.n).fill(`<span>${item.e}</span>`).join("")}</div>
      ${words(item.pa, item.tr, item.n)}`;
  } else if (c.id === "painti") {
    h += `<div class="vis letter">${item.letter}</div>${words(item.pa, item.tr, "")}`;
    if (item.word) h += `<div class="eg"><span>${item.e}</span><span>${item.word}</span></div>
      ${S.tr || S.en ? `<div class="en">${[S.tr ? item.wordTr : "", S.en ? item.en : ""].filter(Boolean).join(" · ")}</div>` : ""}`;
  } else {
    h += `<div class="vis${item.pa.length > 12 ? " sm" : ""}">${item.e}</div>${words(item.pa, item.tr, item.en)}`;
  }
  if (S.level === "adult") { const note = grownUpNote(item); if (note) h += `<div class="note">${esc(note)}</div>`; }
  return h;
}
function renderCard(dir) {
  const c = cat(), list = items(), item = list[state.i], el = $("card");
  seen(item.key);
  el.innerHTML = cardHTML(c, item, state.i);
  if (c.id === "colours") { el.style.setProperty("--c", item.hex); el.classList.toggle("light-ink", luminance(item.hex) < 0.55); }
  else { el.style.removeProperty("--c"); el.classList.remove("light-ink"); }
  el.setAttribute("aria-label", `${item.pa} — ${item.en}`);
  el.classList.remove("in-l", "in-r", "bump"); void el.offsetWidth;
  if (dir) el.classList.add(dir > 0 ? "in-r" : "in-l");
  $("dots").textContent = `${gurmukhiDigits(state.i + 1)} / ${gurmukhiDigits(list.length)}   ·   ${state.i + 1} of ${list.length}`;
  $("toggleEn").classList.toggle("on", S.en);
  renderRecRow();
}
const sayItem = (item, done) => say(item.say, { key: item.key, tr: item.sayTr, done });
function tapCard(x, y) {
  const el = $("card");
  el.classList.remove("in-l", "in-r", "bump"); void el.offsetWidth; el.classList.add("bump");
  pop(); burst(x, y);
  sayItem(items()[state.i]);
}
function go(d, speak = true) {
  const n = items().length;
  state.i = (state.i + d + n) % n;
  renderCard(d);
  if (speak) sayItem(items()[state.i]);
}
(() => {
  const el = $("card"); let sx = 0, sy = 0, down = false;
  el.addEventListener("pointerdown", e => { down = true; sx = e.clientX; sy = e.clientY; });
  el.addEventListener("pointerup", e => {
    if (!down) return; down = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { stopAuto(); go(dx < 0 ? 1 : -1); }
    else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) tapCard(e.clientX, e.clientY);
  });
  el.addEventListener("pointercancel", () => { down = false; });
  el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const r = el.getBoundingClientRect(); tapCard(r.left + r.width / 2, r.top + r.height / 3); } });
})();
$("prev").onclick = () => { stopAuto(); pop(); go(-1); };
$("next").onclick = () => { stopAuto(); pop(); go(1); };
$("back").onclick = () => { pop(); goHome(); };
$("toggleEn").onclick = () => { S.en = !S.en; save(); renderSets(); renderCard(); };
addEventListener("keydown", e => {
  if ($("settings").open) return;
  if (state.view === "learn") {
    if (e.key === "ArrowRight") { stopAuto(); go(1); }
    if (e.key === "ArrowLeft") { stopAuto(); go(-1); }
  }
  if (e.key === "Escape" && state.view !== "home") goHome();
});

/* Play all: walks through every card, saying each one. */
function stopAuto() { state.auto = false; clearTimeout(state.autoTimer); $("play").classList.remove("on"); $("play").textContent = "▶"; }
function autoStep() {
  if (!state.auto) return;
  const el = $("card"); el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
  sayItem(items()[state.i], () => {
    if (!state.auto) return;
    state.autoTimer = setTimeout(() => { if (!state.auto) return; go(1, false); autoStep(); }, 1100);
  });
}
$("play").onclick = () => {
  if (state.auto) { stopAuto(); stopSpeaking(); return; }
  state.auto = true; $("play").classList.add("on"); $("play").textContent = "❚❚"; autoStep();
};

/* Family voice row under the card (grown-ups switch it on in settings). */
let recorder = null;
function renderRecRow() {
  const row = $("recrow");
  row.hidden = !S.rec;
  if (!S.rec) return;
  const item = items()[state.i], k = item.key, has = !!Rec.get(k);
  row.innerHTML = recorder
    ? `<button class="live" id="recStop">■ Stop recording</button>`
    : `<button id="recGo">🎙️ ${has ? "Record again" : "Record " + esc(item.pa)}</button>
       <label class="filebtn">📎 Use a voice note<input type="file" id="recFile" accept="audio/*"></label>
       ${has ? `<button id="recDel">Remove</button>` : ""}`;
  if ($("recGo")) $("recGo").onclick = () => startRec(k);
  if ($("recStop")) $("recStop").onclick = () => recorder && recorder.stop();
  if ($("recDel")) $("recDel").onclick = async () => { await Rec.del(k); toast("Recording removed"); renderCard(); };
  if ($("recFile")) $("recFile").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 900000) { toast("That voice note is too long. Keep it under 10 seconds."); return; }
    await Rec.put(k, f); toast("Saved. Tap the card to hear it."); renderCard();
  };
}
async function recordAudio(maxMs, onStart) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return new Promise((res, rej) => {
    const chunks = []; let rec;
    try { rec = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(t => t.stop()); rej(e); return; }
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(new Blob(chunks, { type: rec.mimeType || "audio/webm" })); };
    rec.start(); onStart && onStart(rec);
    setTimeout(() => rec.state === "recording" && rec.stop(), maxMs);
  });
}
async function startRec(k) {
  stopAuto(); stopSpeaking();
  try {
    const blob = await recordAudio(8000, r => { recorder = r; renderRecRow(); });
    recorder = null;
    if (blob.size > 0) { await Rec.put(k, blob); toast("Saved. Tap the card to hear it."); }
  } catch (e) {
    recorder = null;
    toast("The microphone isn't available here. Use “Use a voice note” instead, or open the installed app.");
  }
  renderCard();
}

/* ---- Game: "ਲਾਲ ਕਿੱਥੇ ਹੈ?" — where is red? ---- */
const G = { cat: 0, target: null, opts: [], stars: 0, locked: false, missed: false };
const gameCats = () => levelCats().filter(({ c }) => c.game).map(({ i }) => i);
function gamePool(c) {
  if (c.id === "numbers") return c.sets[0].items;
  if (c.id === "painti") return c.sets[0].items.filter(x => x.word);
  return c.sets.flatMap(s => s.items);
}
function openGame() {
  show("game");
  const gc = gameCats();
  if (!gc.includes(G.cat)) G.cat = gc[0];
  $("gsets").innerHTML = gc.map(i => `<button aria-pressed="${i === G.cat}" data-i="${i}">${CATS[i].pa}${S.en ? ` <small>${CATS[i].en}</small>` : ""}</button>`).join("");
  $("gsets").querySelectorAll("button").forEach(b => b.onclick = () => { G.cat = +b.dataset.i; pop(); openGame(); });
  newRound();
}
function newRound() {
  const c = CATS[G.cat], pool = gamePool(c);
  let target; do { target = pickOne(pool); } while (pool.length > 1 && target === G.target);
  const n = S.level === "adult" ? 4 : 3;
  G.target = target; G.opts = shuffle([target, ...shuffle(pool.filter(x => x !== target)).slice(0, n - 1)]); G.locked = false; G.missed = false;
  $("ask").innerHTML = `<div class="q">${esc(target.answer)} ਕਿੱਥੇ ਹੈ? 🔊</div><div class="qt">${S.tr ? esc(target.answerTr) + " kitthe hai?" : ""}${S.en ? ` · Where is the ${esc(c.id === "numbers" ? "number " + target.en : target.en)}?` : ""}</div>`;
  $("ask").onclick = () => say([target.answer, UI_SAY.find], { tr: `${target.answerTr} kitthe hai?` });
  $("opts").classList.toggle("four", n === 4);
  $("opts").innerHTML = G.opts.map((o, i) => {
    if (c.id === "colours") return `<button class="opt" data-i="${i}" style="--c:${o.hex}" aria-label="${esc(o.en)}">${o.e}</button>`;
    if (c.id === "numbers") return `<button class="opt numeral" data-i="${i}" aria-label="${o.n}"><span>${o.num}<span class="mini">${o.e.repeat(o.n)}</span></span></button>`;
    return `<button class="opt" data-i="${i}" aria-label="${esc(o.en)}">${o.e}</button>`;
  }).join("");
  $("opts").querySelectorAll(".opt").forEach(b => b.onclick = e => pick(b, G.opts[+b.dataset.i], e));
  setTimeout(() => state.view === "game" && $("ask").click(), 250);
}
function pick(btn, o, e) {
  if (G.locked) return;
  if (o === G.target) {
    G.locked = true; G.stars++;
    if (atLeast("child")) grade(o.key, !G.missed);
    $("stars").textContent = `⭐ ${G.stars}`;
    btn.classList.add("yes"); yay();
    burst(e.clientX, e.clientY, 60, true);
    say([UI_SAY.well]);
    setTimeout(() => state.view === "game" && newRound(), 2000);
  } else {
    G.missed = true;
    btn.classList.remove("nope"); void btn.offsetWidth; btn.classList.add("nope");
    boop();
    say([o.answer], { tr: o.answerTr }); // say what they tapped: still learning
  }
}
$("gback").onclick = () => { pop(); goHome(); };

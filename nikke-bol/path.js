"use strict";
/* The learning path, its units, the daily goal and the practice calendar. */

const UNIT_SAY = { numbers1: "ਇੱਕ ਤੋਂ ਪੰਜ", numbers2: "ਛੇ ਤੋਂ ਦਸ", numbers3: "ਗਿਆਰਾਂ ਤੋਂ ਪੰਦਰਾਂ", numbers4: "ਸੋਲ਼ਾਂ ਤੋਂ ਵੀਹ", letters1: "ਪੈਂਤੀ", letters2: "ਪੈਂਤੀ", letters3: "ਪੈਂਤੀ", letters4: "ਪੈਂਤੀ", months1: "ਮਹੀਨੇ", months2: "ਮਹੀਨੇ" };
const lessonById = id => [...MATRAS, ...MARKS].find(m => m.id === id);
function unitInfo(u) {
  if (u.kind === "read") { const m = lessonById(u.lesson); return { pa: m.name, en: MATRAS.includes(m) ? `Reading · ${m.sound}` : "Reading", say: m.name }; }
  if (u.kind === "sentences") return { pa: UI_SAY.sentences, en: "Sentences", say: UI_SAY.sentences };
  if (u.kind === "tones") return { pa: UI_SAY.tones, en: "Tones", say: UI_SAY.tones };
  return { pa: u.pa, en: u.en, say: UNIT_SAY[u.id] || u.pa };
}
function unitItems(u) {
  if (u.kind === "words") return u.words.map(w => REG.get(u.cat + ":" + w));
  if (u.kind === "read") return lessonById(u.lesson).words.map(w => REG.get("read:" + w.pa));
  return [];
}
const pathUnits = () => PATH.filter(u => !u.level || atLeast(u.level));
const unitStars = u => (P.path || {})[u.id] || 0;
function nextUnitIndex() { const units = pathUnits(); const i = units.findIndex(u => !unitStars(u)); return i < 0 ? units.length - 1 : i; }

/* ---- Daily goal ring and streak, shown at the top of home ---- */
function renderGoal() {
  const el = $("goal"); if (!el || !current) return;
  const secs = (P.log[todayStr()] || {}).secs || 0, goal = S.goal * 60, f = Math.min(1, secs / goal);
  const st = streak(), C = 2 * Math.PI * 22;
  el.innerHTML = `<span class="ring"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="22" class="bg"/><circle cx="26" cy="26" r="22" class="fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - f)}"/></svg><b>${f >= 1 ? "✓" : Math.floor(secs / 60)}</b></span>
    <span class="gtext"><b>${f >= 1 ? "Goal done today!" : `${Math.floor(secs / 60)} of ${S.goal} min today`}</b><small>${UI_SAY.calendar} · tap for your calendar</small></span>
    <span class="flame${st ? "" : " off"}">🔥<b>${st}</b><small>day${st === 1 ? "" : "s"}</small></span>`;
}

/* ---- The path: a stitched line winding through units ---- */
const PATH_X = [0, 1, 1.4, 1, 0, -1, -1.4, -1];
function renderPath(root) {
  const units = pathUnits(), next = nextUnitIndex(), done = units.filter(unitStars).length;
  const stepY = 116, top = 40, h = top + units.length * stepY;
  const W = Math.min(520, (root.clientWidth || innerWidth - 32)), U = Math.min(70, W * .17); // px per step sideways
  const pos = i => ({ x: PATH_X[i % PATH_X.length], y: top + i * stepY });
  root.innerHTML = `<div class="pathhead"><b>${done} of ${units.length} units</b><span class="track"><i style="width:${done / units.length * 100}%"></i></span></div>
    <div class="path" style="height:${h}px; width:${W}px">
      <svg class="stitch" viewBox="0 0 ${W} ${h}" aria-hidden="true">
        <path d="${units.map((_, i) => { const p = pos(i); return (i ? "L" : "M") + (W / 2 + p.x * U) + " " + (p.y + 34); }).join(" ")}"/></svg>
      ${units.map((u, i) => {
        const info = unitInfo(u), p = pos(i), stars = unitStars(u), locked = i > next, now = i === next;
        return `<div class="node${locked ? " locked" : ""}${now ? " now" : ""}${stars ? " complete" : ""}" style="top:${p.y}px; left:${W / 2 + p.x * U}px">
          <button data-u="${i}" ${locked ? 'aria-disabled="true"' : ""} aria-label="${esc(info.en)}${locked ? " (locked)" : ""}">${locked ? "🔒" : u.emoji}</button>
          <span class="nlabel ${p.x > 0 ? "left" : "right"}"><b>${info.pa}</b><small>${info.en}</small><span class="stars">${[1, 2, 3].map(k => `<i class="${k <= stars ? "on" : ""}">★</i>`).join("")}</span></span>
          ${now ? `<span class="go">${UI_SAY.learn}!</span>` : ""}
        </div>`;
      }).join("")}
    </div>`;
  root.querySelectorAll(".node button").forEach(b => b.onclick = e => {
    const i = +b.dataset.u;
    if (i > next) { boop(); toast("Finish the unit before to unlock this one."); return; }
    pop(); burst(e.clientX, e.clientY, 16); startUnit(units[i]);
  });
  const nowEl = root.querySelector(".node.now");
  if (nowEl && state.scrollPath) { nowEl.scrollIntoView({ block: "center" }); state.scrollPath = false; }
}

/* ---- Running a unit: learn the cards, then a short quiz; stars from first-try answers ---- */
function startUnit(u) {
  if (u.kind === "sentences") return sentenceUnit(u);
  if (u.kind === "tones") return toneUnit(u);
  const info = unitInfo(u), items = unitItems(u), back = () => { state.scrollPath = true; goHome(); };
  say([info.say]);
  let i = -1; // -1 is the lesson intro for reading units
  const learn = () => {
    if (u.kind !== "read" && i < 0) i = 0;
    openPage(info.pa, `${info.en} · ${UI_SAY.learn}`, body => {
      if (i < 0) {
        const m = lessonById(u.lesson), isMatra = MATRAS.includes(m);
        body.innerHTML = `<div class="hero-sign"><button class="hero" data-say="${m.name}">${isMatra ? "ਕ" + m.sign : m.words[0].pa}</button>
          <div><div class="pa">${m.name}</div>${S.tr ? `<div class="tr">${m.nameTr}</div>` : ""}<p>${esc(m.how)}</p></div></div>
          ${isMatra ? `<div class="sylgrid">${CONSONANTS.slice(0, 15).map(c => `<button class="syl" data-say="${c + m.sign}">${c + m.sign}</button>`).join("")}</div>` : ""}
          <button class="cta" id="uNext">Read the words ›</button>`;
        tapToSay(body);
        $("uNext").onclick = () => { pop(); i = 0; learn(); };
        return;
      }
      const it = items[i];
      body.innerHTML = `<div class="ustep">${items.map((_, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("")}</div>
        <button class="flash learncard" id="uCard">
          <div class="vis">${visualOf(it)}</div>
          <div class="word${it.pa.length > 8 ? " sm" : ""}">${it.kind === "letter" ? `${it.pa} · ${it.word || ""}` : it.pa}</div>
          ${S.tr ? `<div class="tr">${it.kind === "letter" ? `${it.tr}${it.wordTr ? " · " + it.wordTr : ""}` : it.tr}</div>` : ""}
          ${S.en ? `<div class="en">${esc(it.en)}</div>` : ""}
          ${S.level === "adult" && grownUpNote(it) ? `<div class="note">${esc(grownUpNote(it))}</div>` : ""}
          <span class="hint">🔊 Tap to hear it again</span>
        </button>
        <div class="row2"><button class="cta ghost" id="uPrev" ${i ? "" : "disabled"}>‹</button><button class="cta" id="uNext">${i < items.length - 1 ? "Next ›" : "Quiz time ▶"}</button></div>`;
      seen(it.key);
      const hear = () => say(it.say, { key: it.key });
      hear();
      $("uCard").onclick = e => { pop(); burst(e.clientX, e.clientY, 14); hear(); };
      $("uPrev").onclick = () => { i--; learn(); };
      $("uNext").onclick = () => { pop(); if (i < items.length - 1) { i++; learn(); } else quiz(); };
    }, back);
  };
  const quiz = () => {
    const queue = shuffle(items.map(it => ({ it, first: true })));
    let right = 0, asked = 0;
    const ask = () => {
      if (!queue.length) return finishUnit(u, right / items.length);
      const { it, first } = queue.shift();
      const others = shuffle(items.filter(x => x !== it && (x.letter || x.hex || x.num || x.e) !== (it.letter || it.hex || it.num || it.e)));
      const useText = textAnswers.has(it.group) || S.level === "adult" && it.kind === "word";
      const opts = shuffle([it, ...others.slice(0, S.level === "adult" ? 3 : 2)]);
      asked++;
      openPage(info.pa, `${info.en} · Quiz`, body => {
        const prompt = it.kind === "read"
          ? `<div class="flash"><div class="word">${it.pa}</div><p class="hint">Read it. Which picture is it?</p></div>`
          : `<button class="ask" id="qAsk"><div class="q">🔊 ${UI_SAY.listen}</div><div class="qt">Which one is it? Tap to hear again.</div></button>`;
        const label = r => useText ? `<span class="pa">${r.answer}</span>${S.en ? `<small>${esc(r.en)}</small>` : ""}` : visualOf(r) + (S.en && textAnswers.has(r.group) ? `<small>${esc(r.en)}</small>` : "");
        body.innerHTML = `<div class="ustep">${items.map((_, k) => `<i class="${k < items.length - queue.length - 1 ? "done" : k === items.length - queue.length - 1 ? "on" : ""}"></i>`).join("")}</div>
          ${prompt}<div class="choices grid${opts.length}">${opts.map((r, k) => `<button class="choice big" data-k="${k}">${label(r)}</button>`).join("")}</div>`;
        if (it.kind !== "read") { const hear = () => say(it.say, { key: it.key }); $("qAsk").onclick = hear; hear(); }
        body.querySelectorAll(".choice").forEach(b => b.onclick = e => {
          const ok = opts[+b.dataset.k] === it;
          body.querySelectorAll(".choice").forEach(x => x.disabled = true);
          b.classList.add(ok ? "yes" : "nope");
          if (!ok) { body.querySelectorAll(".choice")[opts.indexOf(it)].classList.add("yes"); queue.push({ it, first: false }); }
          if (first) grade(it.key, ok);
          if (ok && first) right++;
          ok ? (yay(), burst(e.clientX, e.clientY, 24)) : boop();
          say(it.say, { key: it.key, done: () => setTimeout(() => state.view === "page" && ask(), 450) });
        });
      }, back);
    };
    ask();
  };
  learn();
}
function finishUnit(u, score) {
  const stars = score >= .9 ? 3 : score >= .6 ? 2 : 1;
  P.path = P.path || {};
  const before = unitStars(u);
  P.path[u.id] = Math.max(before, stars); saveP(); afterProgress();
  if (stars === 3 && typeof Rate !== "undefined") setTimeout(() => Rate.maybe(), 2500);
  const info = unitInfo(u), units = pathUnits(), idx = units.indexOf(u), nextU = units[idx + 1];
  openPage(info.pa, "Unit complete", body => {
    body.innerHTML = `<div class="done">
      <div class="bigstars">${[1, 2, 3].map(k => `<i class="${k <= stars ? "on" : ""}" style="animation-delay:${k * .25}s">★</i>`).join("")}</div>
      <div class="pa">${stars === 3 ? UI_SAY.great : UI_SAY.well}</div>
      <p>${Math.round(score * 100)}% right first time.${stars < 3 ? " Play again any time for more stars." : ""}</p>
      ${nextU ? `<button class="cta" id="fNext">Next: ${unitInfo(nextU).en} ›</button>` : `<p>You finished the whole path! 🏆</p>`}
      <button class="cta ghost" id="fPath">Back to the path</button></div>`;
    yay(); say([stars === 3 ? UI_SAY.great : UI_SAY.well]);
    setTimeout(() => burstFrom(body.querySelector(".bigstars"), 80, true), 300);
    flushStickers(true);
    if (nextU) $("fNext").onclick = () => { pop(); startUnit(nextU); };
    $("fPath").onclick = () => { pop(); state.scrollPath = true; goHome(); };
  }, () => { state.scrollPath = true; goHome(); });
}
/* Sentences and tones reuse their quizzes, with stars at the end. */
function sentenceUnit(u) {
  const examples = [[1, 0], [1, 6], [3, 4], [3, 9], [8, 7], [8, 1]].map(([a, n]) => ({ a: ADJS[a], n: NOUNS[n] }));
  say([UI_SAY.sentences]);
  openPage(UI_SAY.sentences, "Sentences · Learn", body => {
    body.innerHTML = `<p class="lead">In Punjabi, describing words that end in <b>ਾ</b> change to <b>ੀ</b> for feminine words. Listen:</p>
      <div class="wordlist wide">${examples.map(({ a, n }) => `<button class="wcard" data-say="${sentenceText(a, n)}"><span class="emo">${n.e}</span><span class="pa">${sentenceText(a, n)}</span>${S.en ? `<span class="en">This is a ${a.en} ${n.en} · ${n.g === "f" ? "feminine" : "masculine"}</span>` : ""}</button>`).join("")}</div>
      <button class="cta" id="uQuiz">Quiz time ▶</button>`;
    tapToSay(body);
    $("uQuiz").onclick = () => { pop(); sentenceQuiz(0, 0, score => finishUnit(u, score / 8)); };
  }, () => { state.scrollPath = true; goHome(); });
}
function toneUnit(u) { say([UI_SAY.tones]); openTones(score => finishUnit(u, score / 8)); }

/* ---- Calendar: a stitch for every day you practised, a gold diamond when you met the goal ---- */
let calMonth = null;
function openCalendar() {
  const now = new Date();
  if (!calMonth) calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  openPage(UI_SAY.calendar, "Calendar", body => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    const monthName = calMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const cells = [];
    for (let k = 0; k < first; k++) cells.push(`<span></span>`);
    for (let d = 1; d <= days; d++) {
      const k = dayKey(new Date(y, m, d)), l = P.log[k], isToday = k === todayStr();
      const cls = goalMet(k) ? "met" : practised(k) ? "did" : "";
      cells.push(`<button class="day ${cls}${isToday ? " now" : ""}" data-k="${k}" aria-label="${d} ${monthName}${cls === "met" ? ", goal met" : cls ? ", practised" : ""}"><span>${d}</span>${cls ? "<i></i>" : ""}</button>`);
    }
    const week = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const l = P.log[dayKey(d)] || { secs: 0, n: 0 }; return { d, l }; });
    const maxSecs = Math.max(S.goal * 60, ...week.map(w => w.l.secs));
    const weekMins = Math.round(week.reduce((s, w) => s + w.l.secs, 0) / 60), weekWords = week.reduce((s, w) => s + w.l.n, 0);
    body.innerHTML = `
      <div class="stats three"><div><b>${streak()}</b><span>day streak 🔥</span></div><div><b>${weekMins}</b><span>minutes this week</span></div><div><b>${weekWords}</b><span>words practised</span></div></div>
      <div class="cal">
        <div class="calhead"><button id="cPrev" aria-label="Previous month">‹</button><b>${monthName}</b><button id="cNext" aria-label="Next month" ${y === now.getFullYear() && m === now.getMonth() ? "disabled" : ""}>›</button></div>
        <div class="calgrid">${["M", "T", "W", "T", "F", "S", "S"].map(d => `<small>${d}</small>`).join("")}${cells.join("")}</div>
        <div class="legend"><span><i class="did"></i> practised</span><span><i class="met"></i> daily goal met</span></div>
        <p class="daynote" id="dayNote">Tap a day to see what you did.</p>
      </div>
      <h3 class="sect">ਇਸ ਹਫ਼ਤੇ <small>This week, minutes each day</small></h3>
      <div class="weekbars">${week.map(({ d, l }) => `<div><span class="b" style="height:${Math.max(3, l.secs / maxSecs * 100)}%" title="${Math.round(l.secs / 60)} min"></span><small>${d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2)}</small></div>`).join("")}
        <i class="goalline" style="bottom:calc(${S.goal * 60 / maxSecs * 100}% * .82 + 22px)"></i></div>
      <p class="hint">Miss a day? One rest day a week keeps your streak going.</p>`;
    $("cPrev").onclick = () => { calMonth = new Date(y, m - 1, 1); openCalendar(); };
    $("cNext").onclick = () => { calMonth = new Date(y, m + 1, 1); openCalendar(); };
    body.querySelectorAll(".day").forEach(b => b.onclick = () => {
      const l = P.log[b.dataset.k];
      const date = new Date(b.dataset.k + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      $("dayNote").textContent = l && (l.secs || l.n) ? `${date}: ${Math.round(l.secs / 60)} min, ${l.n} words practised${l.secs >= S.goal * 60 ? " · goal met ✓" : ""}.` : `${date}: no practice.`;
    });
  });
}

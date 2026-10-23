"use strict";
/* Reading, writing, sentences, speaking, tones, review and progress. */

const SIGNS = MATRAS.map(m => m.sign);
const tapToSay = (root, sel = "[data-say]") => root.querySelectorAll(sel).forEach(b => b.onclick = e => {
  pop(); burst(e.clientX, e.clientY, 12);
  b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
  say(b.dataset.say.split("|"));
});
const backTo = fn => () => { pop(); fn(); };

/* Every reviewable thing, by key. */
const REG = new Map();
CATS.forEach(c => c.sets.forEach(s => s.items.forEach(it => REG.set(it.key, { ...it, group: c.id, kind: c.id === "painti" ? "letter" : "word" }))));
[...MATRAS, ...MARKS].forEach(m => m.words.forEach(w => REG.set("read:" + w.pa, { ...w, key: "read:" + w.pa, say: [w.pa], answer: w.pa, answerTr: w.tr, group: "read:" + m.id, kind: "read" })));

/* =========================================================
   Reading: vowel letters, the ten vowel signs, then ਬਿੰਦੀ ਟਿੱਪੀ ਅੱਧਕ
   ========================================================= */
function lessonScore(m) {
  const done = m.words.filter(w => (P.items["read:" + w.pa] || {}).box >= 2).length;
  return `${done}/${m.words.length}`;
}
function openReading() {
  openPage(UI_SAY.read, "Reading", body => {
    body.innerHTML = `<p class="lead">Punjabi letters change their sound with small signs called <b>ਲਗਾਂ ਮਾਤਰਾਂ</b>. Learn one sign at a time: tap to hear, then read the words.</p>
      <div class="lessons">
        <button class="lesson" data-l="vowels"><span class="big">ਅ ਆ ਇ</span><span><b>ਸਵਰ</b> Vowel letters</span></button>
        ${MATRAS.map((m, i) => `<button class="lesson" data-l="${i}"><span class="big">ਕ${m.sign}</span><span><b>${m.name}</b> ${m.sound}<small>${lessonScore(m)} read</small></span></button>`).join("")}
        ${MARKS.map((m, i) => `<button class="lesson" data-k="${i}"><span class="big">${m.words[0].pa}</span><span><b>${m.name}</b> ${m.id === "addak" ? "double" : "nasal"}<small>${lessonScore(m)} read</small></span></button>`).join("")}
      </div>`;
    body.querySelectorAll(".lesson").forEach(b => b.onclick = () => {
      pop();
      if (b.dataset.l === "vowels") return openVowels();
      if (b.dataset.l) return openLesson(MATRAS[+b.dataset.l]);
      openLesson(MARKS[+b.dataset.k]);
    });
  });
}
function openVowels() {
  openPage("ਸਵਰ", "Vowel letters", body => {
    body.innerHTML = `<p class="lead">Words that start with a vowel sound use these ten letters. They are built on ੳ, ਅ and ੲ with the same signs you will learn next.</p>
      <div class="sylgrid">${VOWEL_LETTERS.map(v => `<button class="syl" data-say="${v}">${v}</button>`).join("")}</div>`;
    tapToSay(body);
  }, backTo(openReading));
}
function openLesson(m) {
  const isMatra = MATRAS.includes(m);
  openPage(m.name, isMatra ? `Vowel sign · ${m.sound}` : "Sign", body => {
    body.innerHTML = `
      <div class="hero-sign"><button class="hero" data-say="${m.name}">${isMatra ? "ਕ" + m.sign : m.words[0].pa}</button>
        <div><div class="pa">${m.name}${m.sign ? ` <span class="signbox">${"◌" + m.sign}</span>` : ""}</div>${S.tr ? `<div class="tr">${m.nameTr}</div>` : ""}<p>${esc(m.how)}</p></div></div>
      ${isMatra ? `<h3 class="sect">ਸੁਣੋ <small>Tap each one</small></h3>
        <div class="sylgrid">${CONSONANTS.map(c => `<button class="syl" data-say="${c + m.sign}">${c + m.sign}</button>`).join("")}</div>` : ""}
      <h3 class="sect">ਪੜ੍ਹੋ <small>Read these words</small></h3>
      <div class="wordlist">${m.words.map(w => `<button class="wcard" data-say="${w.pa}"><span class="emo">${w.e}</span><span class="pa">${w.pa}</span>${S.tr ? `<span class="tr">${w.tr}</span>` : ""}${S.en ? `<span class="en">${w.en}</span>` : ""}</button>`).join("")}</div>
      <button class="cta" id="readGo">Practise reading ▶</button>`;
    tapToSay(body);
    $("readGo").onclick = () => { pop(); readPractice(m); };
  }, backTo(openReading));
}
/* Read it yourself, then check: a flash card that hides the answer until you tap. */
function readPractice(m) {
  const deck = shuffle([...m.words]); let i = 0, revealed = false;
  openPage(m.name, "Read it yourself", body => {
    const render = () => {
      if (i >= deck.length) {
        body.innerHTML = `<div class="done"><div class="emo">🌟</div><div class="pa">${UI_SAY.great}</div><p>You read all ${deck.length} words. They will come back in Review.</p>
          <button class="cta" id="again">Again</button> <button class="cta ghost" id="toLessons">All lessons</button></div>`;
        say([UI_SAY.great]); yay(); burstFrom(body.querySelector(".emo"), 50, true); flushStickers(true);
        $("again").onclick = () => readPractice(m); $("toLessons").onclick = () => openReading();
        return;
      }
      const w = deck[i];
      body.innerHTML = `<div class="flash">
          <div class="count">${i + 1} / ${deck.length}</div>
          <div class="word">${w.pa}</div>
          <div class="reveal"${revealed ? "" : " hidden"}><span class="emo">${w.e}</span><span>${S.tr ? w.tr + " · " : ""}${w.en}</span></div>
          ${revealed
            ? `<div class="row2"><button class="cta ghost" id="no">Not yet</button><button class="cta" id="yes">✓ I read it</button></div>`
            : `<button class="cta" id="check">🔊 Check</button>`}
        </div><p class="hint">Say it out loud first, then press Check.</p>`;
      if (!revealed) $("check").onclick = () => { revealed = true; say([w.pa]); render(); };
      else {
        $("yes").onclick = e => { grade("read:" + w.pa, true); yay(); burst(e.clientX, e.clientY, 30); i++; revealed = false; render(); };
        $("no").onclick = () => { grade("read:" + w.pa, false); deck.push(w); i++; revealed = false; render(); };
      }
    };
    render();
  }, () => openLesson(m));
}

/* ---- ਬਾਰਾਂਖੜੀ: the whole syllable chart ---- */
function openChart() {
  openPage(UI_SAY.chart, "Sound chart", body => {
    body.innerHTML = `<p class="lead">Every letter with every vowel sign. Tap any box to hear it. Tap a heading for the sign's name.</p>
      <div class="chartwrap"><table class="chart"><thead><tr><th></th>${MATRAS.map(m => `<th><button data-say="${m.name}">${m.sign ? "◌" + m.sign : "—"}<small>${m.name}</small></button></th>`).join("")}</tr></thead>
      <tbody>${CONSONANTS.map(c => `<tr><th>${c}</th>${SIGNS.map(s => `<td><button data-say="${c + s}">${c + s}</button></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    tapToSay(body);
  });
}

/* =========================================================
   Writing: trace a letter with a finger. The letter is drawn
   faintly; we sample points inside it and count how many the
   finger has covered.
   ========================================================= */
const TRACE_LETTERS = CATS[5].sets[0].items;
let traceIdx = 0;
function openTracing() {
  openPage(UI_SAY.write, "Writing", body => {
    const it = TRACE_LETTERS[traceIdx];
    body.innerHTML = `<div class="strip">${TRACE_LETTERS.map((l, i) => `<button data-i="${i}" aria-pressed="${i === traceIdx}">${l.letter}</button>`).join("")}</div>
      <div class="tracebox"><canvas id="traceBg"></canvas><canvas id="traceInk"></canvas></div>
      <div class="meter"><span id="traceBar"></span></div>
      <div class="row2"><button class="cta ghost" id="tClear">↺ Clear</button><button class="cta ghost" id="tHear">🔊 ${it.pa}</button><button class="cta" id="tNext">Next ›</button></div>
      <p class="hint">Trace over the grey letter with your finger. Fill it in to finish.</p>`;
    body.querySelectorAll(".strip button").forEach(b => b.onclick = () => { traceIdx = +b.dataset.i; pop(); openTracing(); });
    body.querySelector(`.strip [aria-pressed="true"]`).scrollIntoView({ inline: "center", block: "nearest" });
    $("tHear").onclick = () => say(it.say);
    $("tNext").onclick = () => { traceIdx = (traceIdx + 1) % TRACE_LETTERS.length; pop(); openTracing(); };
    setupTrace(it);
  });
}
function setupTrace(it) {
  const bg = $("traceBg"), ink = $("traceInk"), box = bg.parentElement;
  const size = Math.min(box.clientWidth, 420), d = devicePixelRatio || 1;
  for (const c of [bg, ink]) { c.width = size * d; c.height = size * d; c.style.width = c.style.height = size + "px"; }
  const b = bg.getContext("2d"), k = ink.getContext("2d");
  b.scale(d, d); k.scale(d, d);
  let samples = [], hit = new Set(), outside = 0, inside = 0, done = false;
  const draw = () => {
    b.clearRect(0, 0, size, size);
    b.fillStyle = "rgba(43,10,34,.06)"; b.fillRect(0, size * .72, size, 2); // writing line
    b.fillStyle = "rgba(43,10,34,.16)";
    b.font = `700 ${size * .78}px "Baloo Paaji 2", "Mukta Mahee", "Noto Sans Gurmukhi", sans-serif`;
    b.textAlign = "center"; b.textBaseline = "alphabetic";
    b.fillText(it.letter, size / 2, size * .76);
    const img = b.getImageData(0, 0, size * d, size * d).data, step = Math.max(6, size / 34);
    samples = [];
    for (let y = step / 2; y < size; y += step) for (let x = step / 2; x < size; x += step) {
      const p = ((y * d | 0) * size * d + (x * d | 0)) * 4 + 3;
      if (img[p] > 20) samples.push([x, y]);
    }
  };
  (document.fonts ? document.fonts.load(`700 100px "Baloo Paaji 2"`).catch(() => {}) : Promise.resolve()).then(draw);
  const R = Math.max(14, size * .055);
  k.lineCap = k.lineJoin = "round"; k.lineWidth = R * 2; k.strokeStyle = "#ff3d8b";
  let last = null;
  const at = e => { const r = ink.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const mark = ([x, y]) => {
    let near = false;
    samples.forEach((s, i) => { if ((s[0] - x) ** 2 + (s[1] - y) ** 2 < R * R) { hit.add(i); near = true; } });
    near ? inside++ : outside++;
    const cover = samples.length ? hit.size / samples.length : 0;
    $("traceBar").style.width = Math.min(100, cover / .7 * 100) + "%";
    if (!done && cover >= .7 && outside < inside * .6) {
      done = true; yay(); burstFrom(ink, 60, true); say([UI_SAY.well, ...it.say]); grade(it.key, true); bump("traced");
    }
  };
  ink.onpointerdown = e => { ink.setPointerCapture(e.pointerId); last = at(e); k.beginPath(); k.moveTo(...last); k.lineTo(...last); k.stroke(); mark(last); };
  ink.onpointermove = e => {
    if (!last) return;
    const p = at(e); k.beginPath(); k.moveTo(...last); k.lineTo(...p); k.stroke();
    const steps = Math.ceil(Math.hypot(p[0] - last[0], p[1] - last[1]) / (R / 2));
    for (let s = 1; s <= steps; s++) mark([last[0] + (p[0] - last[0]) * s / steps, last[1] + (p[1] - last[1]) * s / steps]);
    last = p;
  };
  ink.onpointerup = ink.onpointercancel = () => { last = null; };
  $("tClear").onclick = () => { k.clearRect(0, 0, size, size); hit.clear(); inside = outside = 0; done = false; $("traceBar").style.width = "0"; };
}

/* =========================================================
   Sentences: ਇਹ ___ ___ ਹੈ — adjectives that end in ਾ change
   to ੀ for feminine words.
   ========================================================= */
const SB = { noun: 7, adj: 1, quiz: false };
function openSentences() {
  openPage(UI_SAY.sentences, "Make a sentence", body => {
    const n = NOUNS[SB.noun], a = ADJS[SB.adj];
    const form = n.g === "f" ? a.f : a.m, formTr = n.g === "f" ? a.trf : a.trm;
    const sentence = sentenceText(a, n);
    const changes = a.m !== a.f;
    const why = !changes
      ? `${a.m} (${a.en}) never changes, whatever the word.`
      : n.g === "f"
        ? `${n.pa} is a feminine word, so ${a.m} becomes <b>${a.f}</b>.`
        : `${n.pa} is a masculine word, so it stays <b>${a.m}</b>.`;
    body.innerHTML = `
      <div class="sentence-card">
        <div class="pic" style="${a.hex ? `--tint:${a.hex}` : ""}"><span style="font-size:${(a.scale || 1) * 100}%">${n.e}</span>${a.hex ? `<i class="dot"></i>` : ""}</div>
        <button class="sentence" id="sPlay"><span>ਇਹ</span> <span class="hl">${form}</span> <span>${n.pa}</span> <span>ਹੈ</span> 🔊</button>
        ${S.tr ? `<div class="tr">ih ${formTr} ${n.tr} hai</div>` : ""}
        ${S.en ? `<div class="en">This is a ${a.en} ${n.en}.</div>` : ""}
        <p class="why">${why}</p>
      </div>
      <h3 class="sect">ਕਿਹੋ ਜਿਹਾ? <small>Pick a word</small></h3>
      <div class="chips">${ADJS.map((x, i) => `<button aria-pressed="${i === SB.adj}" data-a="${i}">${x.hex ? `<i style="background:${x.hex}"></i>` : ""}${n.g === "f" ? x.f : x.m}${S.en ? ` <small>${x.en}</small>` : ""}</button>`).join("")}</div>
      <h3 class="sect">ਕੀ? <small>Pick a thing</small></h3>
      <div class="chips nouns">${NOUNS.map((x, i) => `<button aria-pressed="${i === SB.noun}" data-n="${i}"><span class="e">${x.e}</span>${x.pa}${S.level === "adult" ? ` <small>${x.g === "f" ? "fem." : "masc."}</small>` : ""}</button>`).join("")}</div>
      <button class="cta" id="sQuiz">Test me: which is right? ▶</button>`;
    $("sPlay").onclick = e => { pop(); burst(e.clientX, e.clientY, 16); say([sentence]); };
    body.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { SB.adj = +b.dataset.a; pop(); openSentences(); say([sentenceText(ADJS[SB.adj], NOUNS[SB.noun])]); });
    body.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { SB.noun = +b.dataset.n; pop(); openSentences(); say([sentenceText(ADJS[SB.adj], NOUNS[SB.noun])]); });
    $("sQuiz").onclick = () => { pop(); sentenceQuiz(0, 0); };
  });
}
function sentenceQuiz(round, score, onDone) {
  const changing = ADJS.filter(a => a.m !== a.f);
  if (round >= 8 && onDone) return onDone(score);
  if (round >= 8) {
    openPage(UI_SAY.sentences, "Which is right?", body => {
      body.innerHTML = `<div class="done"><div class="emo">${score >= 6 ? "🏆" : "🌱"}</div><div class="pa">${score >= 6 ? UI_SAY.great : UI_SAY.well}</div><p>${score} of 8 right.</p>
        <button class="cta" id="again">Again</button> <button class="cta ghost" id="toBuilder">Back to the builder</button></div>`;
      say([score >= 6 ? UI_SAY.great : UI_SAY.well]); if (score >= 6) yay(); flushStickers(true);
      $("again").onclick = () => sentenceQuiz(0, 0); $("toBuilder").onclick = () => openSentences();
    }, () => openSentences());
    return;
  }
  const n = pickOne(NOUNS), a = pickOne(changing);
  const right = sentenceText(a, n), wrong = `ਇਹ ${n.g === "f" ? a.m : a.f} ${n.pa} ਹੈ`;
  const opts = shuffle([right, wrong]);
  openPage(UI_SAY.sentences, `Which is right? ${round + 1} / 8`, body => {
    body.innerHTML = `<div class="sentence-card"><div class="pic" style="${a.hex ? `--tint:${a.hex}` : ""}"><span style="font-size:${(a.scale || 1) * 100}%">${n.e}</span>${a.hex ? `<i class="dot"></i>` : ""}</div>
      ${S.en ? `<div class="en">This is a ${a.en} ${n.en}.</div>` : ""}</div>
      <div class="choices">${opts.map((o, i) => `<button class="choice" data-i="${i}">${o}</button>`).join("")}</div>`;
    body.querySelectorAll(".choice").forEach(b => b.onclick = e => {
      const ok = opts[+b.dataset.i] === right;
      body.querySelectorAll(".choice").forEach(x => x.disabled = true);
      b.classList.add(ok ? "yes" : "nope");
      if (ok) { yay(); burst(e.clientX, e.clientY, 30); } else { boop(); body.querySelectorAll(".choice")[opts.indexOf(right)].classList.add("yes"); }
      grade("sent:" + n.pa, ok);
      say([right], { done: () => setTimeout(() => state.view === "page" && sentenceQuiz(round + 1, score + (ok ? 1 : 0), onDone), 700) });
    });
  }, onDone ? () => { state.scrollPath = true; goHome(); } : () => openSentences());
}

/* =========================================================
   Listen & say it: hear the word, record yourself, compare.
   ========================================================= */
let sayItBack = { item: null, mine: null };
function speakPool() { return levelCats().flatMap(({ c }) => c.sets.flatMap(s => s.items)).filter(it => it.say.length === 1); }
function openSpeak(newWord = true) {
  if (newWord || !sayItBack.item) sayItBack = { item: pickOne(speakPool()), mine: null };
  const it = sayItBack.item;
  openPage(UI_SAY.speak, "Listen & say it", body => {
    body.innerHTML = `<div class="flash">
        <div class="vis">${visualOf(it)}</div>
        <div class="word sm">${it.pa}</div>${S.tr ? `<div class="tr">${it.tr}</div>` : ""}${S.en ? `<div class="en">${it.en}</div>` : ""}
        <div class="waves"><div><small>Nikke Bol</small><canvas id="wModel"></canvas></div><div><small>You</small><canvas id="wMine"></canvas></div></div>
        <div class="row2 wrap">
          <button class="cta ghost" id="spHear">① 🔊 Listen</button>
          <button class="cta" id="spRec">② 🎙️ Say it</button>
          <button class="cta ghost" id="spBoth" ${sayItBack.mine ? "" : "disabled"}>③ ▶ Compare</button>
        </div></div>
      <div class="row2"><button class="cta ghost" id="spNext">Another word ›</button></div>
      <p class="hint">Listen, then record yourself saying it. Compare: does yours sound the same?</p>`;
    const src = clipFor(it.pa);
    if (src) drawWave($("wModel"), src);
    if (sayItBack.mine) drawWave($("wMine"), sayItBack.mine);
    $("spHear").onclick = () => say(it.say);
    $("spNext").onclick = () => { pop(); openSpeak(true); };
    $("spBoth").onclick = () => say(it.say, { done: () => setTimeout(() => sayItBack.mine && playSrc(sayItBack.mine), 350) });
    $("spRec").onclick = async () => {
      stopSpeaking();
      const btn = $("spRec");
      try {
        const blob = await recordAudio(3500, r => { btn.classList.add("live"); btn.textContent = "■ Stop"; btn.onclick = () => r.stop(); });
        sayItBack.mine = URL.createObjectURL(blob);
        seen(it.key); markDay(); bump("spoke");
        openSpeak(false);
        playSrc(sayItBack.mine);
      } catch (e) { toast("The microphone isn't available here. Open the installed app to record."); }
    };
  });
}
async function drawWave(cv, src) {
  const w = cv.clientWidth || 280, h = 56, d = devicePixelRatio || 1;
  cv.width = w * d; cv.height = h * d;
  const g = cv.getContext("2d"); g.scale(d, d);
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const buf = await actx.decodeAudioData(await (await fetch(src)).arrayBuffer());
    const data = buf.getChannelData(0), bars = Math.floor(w / 4), per = Math.floor(data.length / bars);
    let max = 0; const vals = [];
    for (let i = 0; i < bars; i++) { let m = 0; for (let j = i * per; j < (i + 1) * per; j += 8) m = Math.max(m, Math.abs(data[j])); vals.push(m); max = Math.max(max, m); }
    g.fillStyle = getComputedStyle(cv).color;
    vals.forEach((v, i) => { const bh = Math.max(2, v / (max || 1) * (h - 4)); g.fillRect(i * 4, (h - bh) / 2, 3, bh); });
  } catch (e) {}
}

/* =========================================================
   Tones: same letters, different pitch.
   ========================================================= */
function openTones(onDone) {
  openPage(UI_SAY.tones, "Tones", body => {
    body.innerHTML = `<p class="lead">Punjabi uses pitch to tell words apart. Words starting with <b>ਘ ਝ ਢ ਧ ਭ</b> are said with a soft k, ch, t, t or p and a <b>low tone that rises</b>. A <b>ਹ</b> in the middle or at the end makes a tone too. Tap each pair and listen to the difference.</p>
      <div class="pairs">${TONE_PAIRS.map(([a, b]) => `<div class="pair">
        <button class="wcard" data-say="${a.pa}"><span class="emo">${a.e}</span><span class="pa">${a.pa}</span><span class="tr">${a.tr}</span><span class="en">${a.en}</span></button>
        <button class="wcard" data-say="${b.pa}"><span class="emo">${b.e}</span><span class="pa">${b.pa}</span><span class="tr">${b.tr}</span><span class="en">${b.en}</span></button></div>`).join("")}</div>
      <button class="cta" id="toneQuiz">Which did you hear? ▶</button>
      <p class="hint">These are recorded by a computer voice. Ask a native speaker to say them too.</p>`;
    tapToSay(body);
    $("toneQuiz").onclick = () => { pop(); toneQuiz(0, 0, onDone); };
  }, onDone ? () => { state.scrollPath = true; goHome(); } : goHome);
}
function toneQuiz(round, score, onDone) {
  if (round >= 8) bump("tones");
  if (round >= 8 && onDone) return onDone(score);
  if (round >= 8) {
    openPage(UI_SAY.tones, "Which did you hear?", body => {
      body.innerHTML = `<div class="done"><div class="emo">${score >= 6 ? "🏆" : "👂"}</div><p>${score} of 8 right.</p><button class="cta" id="again">Again</button> <button class="cta ghost" id="toTones">Back</button></div>`;
      $("again").onclick = () => toneQuiz(0, 0); $("toTones").onclick = () => openTones(); flushStickers(true);
    }, () => openTones());
    return;
  }
  const pair = pickOne(TONE_PAIRS), target = pickOne(pair);
  openPage(UI_SAY.tones, `Which did you hear? ${round + 1} / 8`, body => {
    body.innerHTML = `<button class="ask" id="tAsk"><div class="q">${UI_SAY.which} 🔊</div><div class="qt">Tap to hear it again</div></button>
      <div class="choices two">${pair.map((w, i) => `<button class="choice" data-i="${i}"><span class="emo">${w.e}</span> ${w.pa}<small>${w.tr} · ${w.en}</small></button>`).join("")}</div>`;
    $("tAsk").onclick = () => say([target.pa]);
    say([UI_SAY.which, target.pa], { gap: 500 });
    body.querySelectorAll(".choice").forEach(b => b.onclick = e => {
      const ok = pair[+b.dataset.i] === target;
      body.querySelectorAll(".choice").forEach(x => x.disabled = true);
      b.classList.add(ok ? "yes" : "nope");
      ok ? (yay(), burst(e.clientX, e.clientY, 30)) : boop();
      setTimeout(() => state.view === "page" && toneQuiz(round + 1, score + (ok ? 1 : 0), onDone), 1100);
    });
  }, () => openTones(onDone));
}

/* =========================================================
   Review: ten questions, cards that are due first.
   ========================================================= */
function reviewDeck() {
  const allowed = new Set(levelCats().map(({ c }) => c.id));
  const ok = k => { const r = REG.get(k); return r && (r.kind === "read" || allowed.has(r.group)); };
  let keys = dueKeys().filter(ok);
  if (keys.length < 10) {
    const met = Object.entries(P.items).filter(([k]) => ok(k) && !keys.includes(k)).sort((a, b) => a[1].box - b[1].box).map(([k]) => k);
    keys = keys.concat(met);
  }
  if (keys.length < 10) {
    const fresh = levelCats().flatMap(({ c }) => c.sets[0].items.slice(0, 4)).map(it => it.key).filter(k => ok(k) && !keys.includes(k));
    keys = keys.concat(shuffle(fresh));
  }
  return shuffle(keys.slice(0, 10));
}
const textAnswers = new Set(["family", "talk", "routine", "days", "months"]);
function openReview() {
  const deck = reviewDeck(); let i = 0, score = 0;
  const next = () => {
    if (i >= deck.length) {
      openPage(UI_SAY.review, "Review", body => {
        body.innerHTML = `<div class="done"><div class="emo">${score >= deck.length * .8 ? "🏆" : "🌟"}</div><div class="pa">${UI_SAY.well}</div>
          <p>${score} of ${deck.length} right. Wrong ones come back sooner; right ones come back later.</p>
          <button class="cta" id="again">Another round</button> <button class="cta ghost" id="toProg">My progress</button></div>`;
        say([UI_SAY.well]); yay(); burstFrom(body.querySelector(".emo"), 50, true); flushStickers(true);
        $("again").onclick = () => openReview(); $("toProg").onclick = () => openProgress();
      });
      return;
    }
    const q = REG.get(deck[i]);
    const pool = [...REG.values()].filter(r => r.kind === q.kind && r !== q);
    const same = pool.filter(r => r.group === q.group);
    const useText = textAnswers.has(q.group) || (S.level === "adult" && q.kind === "word");
    const label = r => useText ? r.answer : (r.letter || r.hex || r.num || r.e);
    const opts = [q]; const used = new Set([label(q)]);
    for (const r of shuffle([...same]).concat(shuffle(pool))) {
      if (opts.length >= (S.level === "adult" ? 4 : 3)) break;
      if (!used.has(label(r))) { opts.push(r); used.add(label(r)); }
    }
    shuffle(opts);
    openPage(UI_SAY.review, `Review ${i + 1} / ${deck.length}`, body => {
      const prompt = q.kind === "read"
        ? `<div class="flash"><div class="word">${q.pa}</div><p class="hint">Read it. Which picture is it?</p></div>`
        : `<button class="ask" id="rAsk"><div class="q">🔊 ਸੁਣੋ</div><div class="qt">Listen, then pick. Tap to hear it again.</div></button>`;
      const optHTML = r => useText
        ? `<span class="pa">${r.answer}</span>${S.en ? `<small>${r.en}</small>` : ""}`
        : visualOf(r) + (S.en && textAnswers.has(r.group) ? `<small>${r.en}</small>` : "");
      body.innerHTML = prompt + `<div class="choices grid${opts.length}">${opts.map((r, k) => `<button class="choice big" data-k="${k}">${optHTML(r)}</button>`).join("")}</div>`;
      if (q.kind !== "read") { $("rAsk").onclick = () => say(q.say, { key: q.key }); say(q.say, { key: q.key }); }
      body.querySelectorAll(".choice").forEach(b => b.onclick = e => {
        const ok = opts[+b.dataset.k] === q;
        body.querySelectorAll(".choice").forEach(x => x.disabled = true);
        b.classList.add(ok ? "yes" : "nope");
        if (!ok) body.querySelectorAll(".choice")[opts.indexOf(q)].classList.add("yes");
        grade(q.key, ok); if (ok) { score++; yay(); burst(e.clientX, e.clientY, 30); } else boop();
        const after = () => setTimeout(() => { if (state.view === "page") { i++; next(); } }, 600);
        q.kind === "read" || !ok ? say(q.say, { key: q.key, done: after }) : after();
      });
    });
  };
  next();
}

/* ---- Progress ---- */
function openProgress() {
  openPage(UI_SAY.progress, "My progress", body => {
    const vals = Object.values(P.items);
    const met = vals.length, mastered = vals.filter(v => v.box >= 3).length, due = dueKeys().length;
    const bar = (label, keys, isMet = k => P.items[k], isOk = k => (P.items[k] || {}).box >= 3) => {
      const n = keys.length, m = keys.filter(isMet).length, g = keys.filter(isOk).length;
      return `<div class="pbar"><span class="l">${label}</span><span class="track"><i class="met" style="width:${n ? m / n * 100 : 0}%"></i><i class="ok" style="width:${n ? g / n * 100 : 0}%"></i></span><span class="n">${g}/${n}</span></div>`;
    };
    body.innerHTML = `<div class="stats">
        <div><b>${met}</b><span>words met</span></div><div><b>${mastered}</b><span>learned well</span></div>
        <div><b>${due}</b><span>due for review</span></div><div><b>${streak()}</b><span>day streak 🔥</span></div></div>
      <div class="row2"><button class="cta" id="pReview">Start review ▶</button><button class="cta ghost" id="pCal">📅 ${UI_SAY.calendar}</button></div>
      ${atLeast("child") ? `<h3 class="sect">ਰਾਹ <small>Learning path</small></h3>${bar("Units finished", pathUnits().map(u => u.id), id => (P.path || {})[id], id => (P.path || {})[id] === 3)}<p class="hint">Green bar: units with three stars.</p>` : ""}
      <h3 class="sect">ਸ਼ਬਦ <small>Words · pink = met, green = learned</small></h3>
      ${levelCats().map(({ c }) => bar(`${c.pa} <small>${c.en}</small>`, c.sets.flatMap(s => s.items).map(it => it.key))).join("")}
      ${atLeast("child") ? `<h3 class="sect">ਪੜ੍ਹਨਾ <small>Reading</small></h3>
      ${[...MATRAS, ...MARKS].map(m => bar(`${m.name} <small>${m.sign ? "ਕ" + m.sign : ""}</small>`, m.words.map(w => "read:" + w.pa))).join("")}` : ""}
      <p class="hint">Progress is kept on this device, separately for each learner.</p>`;
    $("pReview").onclick = () => { pop(); openReview(); };
    $("pCal").onclick = () => { pop(); openCalendar(); };
  });
}

/* Grown-ups: settings sit behind a sum a young child can't answer. */
$("grownups").onclick = () => parentGate(openSettings);
function syncSettings() {
  $("sEn").checked = S.en; $("sTr").checked = S.tr; $("sSfx").checked = S.sfx; $("sRate").value = S.rate; $("sRec").checked = S.rec;
  $("sWho").textContent = profile() ? `${profile().avatar} ${profile().name}` : "";
  $("sGoal").value = S.goal;
  renderReminderRow();
  $("sLevel").innerHTML = LEVELS.map(l => `<option value="${l.id}"${l.id === S.level ? " selected" : ""}>${l.pa} · ${l.en}</option>`).join("");
  const n = Rec.cache.size;
  $("famNote").textContent = `${n} family recording${n === 1 ? "" : "s"} on this device.` + (Family.store ? ` Recordings you add here are shared with everyone who opens this page (${Family.shared} shared).` : "");
}
function openSettings() { syncSettings(); try { $("settings").showModal(); } catch (e) { $("settings").setAttribute("open", ""); } }
for (const [id, key] of [["sEn", "en"], ["sTr", "tr"], ["sSfx", "sfx"], ["sRec", "rec"]]) $(id).onchange = e => { S[key] = e.target.checked; save(); };
$("sRate").oninput = e => { S.rate = +e.target.value; save(); };
$("sRate").onchange = () => say([UI_SAY.hello]);
$("sLevel").onchange = e => { S.level = e.target.value; save(); };
$("sGoal").onchange = e => { S.goal = +e.target.value; save(); };
$("famExport").onclick = () => exportVoices();
$("famImport").onchange = e => { const f = e.target.files[0]; if (f) importFile(f).then(syncSettings); e.target.value = ""; };
$("bkSave").onclick = () => exportBackup();
$("bkLoad").onchange = e => { const f = e.target.files[0]; if (f) importFile(f).then(syncSettings); e.target.value = ""; };
$("sLearners").onclick = () => { $("settings").close(); openProfiles(); };
$("sReset").onclick = () => {
  const b = $("sReset");
  if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = `Tap again to clear ${profile() ? profile().name + "'s" : "all"} progress`; return; }
  P = blankProgress(); saveP(); delete b.dataset.sure; b.textContent = "Progress cleared";
};
$("sDone").onclick = () => { $("settings").close ? $("settings").close() : $("settings").removeAttribute("open"); };
$("settings").addEventListener("close", () => {
  renderHome();
  if (state.view === "learn") { renderSets(); renderCard(); }
  if (state.view === "game") openGame();
  if (state.view === "page" && state.pageRender) state.pageRender($("pageBody"));
});
$("pback").onclick = () => { pop(); stopSpeaking(); (state.back || goHome)(); };

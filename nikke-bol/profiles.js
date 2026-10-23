"use strict";
/* Learners, first-run welcome, the grown-ups gate, and moving everything to a new phone. */

/* ---- Parental gate: a sum a young child can't answer. Used before settings, deleting a learner and backups. ---- */
function parentGate(then) {
  const a = 3 + (Math.random() * 7 | 0), b = 3 + (Math.random() * 7 | 0);
  const dlg = $("gate");
  $("gateQ").textContent = `${a} × ${b} = ?`;
  $("gateIn").value = "";
  $("gateMsg").textContent = "";
  $("gateForm").onsubmit = e => {
    e.preventDefault();
    if (+$("gateIn").value === a * b) { dlg.close(); then(); }
    else { $("gateMsg").textContent = "Not quite. Ask a grown-up to help."; $("gateIn").value = ""; }
  };
  $("gateCancel").onclick = () => dlg.close();
  try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
  setTimeout(() => $("gateIn").focus(), 50);
}

/* ---- Who's learning? ---- */
function renderProfileChip() {
  const p = profile();
  $("who").innerHTML = p ? `<span class="av">${p.avatar}</span><span>${esc(p.name)}</span>` : "";
  $("who").hidden = !p;
}
function openProfiles() {
  const dlg = $("profiles");
  const render = () => {
    $("profList").innerHTML = PROFILES.map(p => {
      const s = store.get(`nikke-bol:${p.id}:settings`, {}), lvl = LEVELS.find(l => l.id === (s.level || "baby"));
      return `<button class="prof${p.id === current ? " on" : ""}" data-id="${p.id}"><span class="av">${p.avatar}</span><span><b>${esc(p.name)}</b><small>${lvl.pa} · ${lvl.en}</small></span></button>`;
    }).join("") + `<button class="prof add" id="profAdd"><span class="av">＋</span><span><b>Add a learner</b><small>Brother, sister, cousin, you</small></span></button>`;
    dlg.querySelectorAll(".prof[data-id]").forEach(b => b.onclick = () => { pop(); loadProfile(b.dataset.id); state.tab = null; dlg.close(); goHome(); });
    $("profAdd").onclick = () => { dlg.close(); openWelcome(true); };
    $("profEdit").onclick = () => parentGate(() => { dlg.close(); openEditProfile(); });
  };
  render();
  $("profClose").onclick = () => dlg.close();
  try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
}
function openEditProfile() {
  const p = profile(); if (!p) return;
  openPage("ਮੇਰਾ ਨਾਂ", "Edit learner", body => {
    body.innerHTML = `<div class="form">
      <label for="epName">Name</label><input id="epName" maxlength="20" value="${esc(p.name)}">
      <span class="lbl">Picture</span><div class="avatars">${AVATARS.map(a => `<button type="button" aria-pressed="${a === p.avatar}" data-a="${a}">${a}</button>`).join("")}</div>
      <span class="lbl">Level</span><div class="chips">${LEVELS.map(l => `<button type="button" aria-pressed="${l.id === S.level}" data-l="${l.id}">${l.pa} <small>${l.en}</small></button>`).join("")}</div>
      <span class="lbl">Daily goal</span><div class="chips">${[5, 10, 15, 20].map(m => `<button type="button" aria-pressed="${m === S.goal}" data-g="${m}">${m} min</button>`).join("")}</div>
      <div class="row2"><button class="cta" id="epSave">Save</button></div>
      <div class="row2"><button class="cta ghost danger" id="epDel">Delete ${esc(p.name)}</button></div></div>`;
    let avatar = p.avatar;
    body.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { avatar = b.dataset.a; body.querySelectorAll("[data-a]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    body.querySelectorAll("[data-l]").forEach(b => b.onclick = () => { S.level = b.dataset.l; body.querySelectorAll("[data-l]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    body.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { S.goal = +b.dataset.g; body.querySelectorAll("[data-g]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    $("epSave").onclick = () => { updateProfile(p.id, { name: $("epName").value.trim() || p.name, avatar }); save(); toast("Saved"); goHome(); };
    $("epDel").onclick = () => {
      const b = $("epDel");
      if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = `Tap again: delete ${p.name} and all their progress`; return; }
      removeProfile(p.id);
      if (!PROFILES.length) openWelcome(); else goHome();
    };
  });
}

/* ---- Welcome: name, picture, level and daily goal ---- */
function openWelcome(adding = false) {
  const draft = { name: "", avatar: pickOne(AVATARS), level: "baby", goal: 5 };
  const w = $("welcome");
  let step = adding ? 1 : 0;
  const steps = [
    () => `<div class="wl-hero"><div class="logo">ਨਿੱਕੇ ਬੋਲ</div><p class="big">Learn Punjabi together</p>
        <ul class="ticks"><li>Over 700 words, letters and sentences, all spoken in Punjabi</li><li>From first words for babies to reading and writing Gurmukhi</li><li>Works offline. No ads. Nothing leaves your device.</li></ul></div>
      <button class="cta" id="wNext">${UI_SAY.start} · Let's start</button>
      <label class="linkish">Moving from another phone? Restore a backup<input type="file" id="wRestore" accept=".json,application/json"></label>`,
    () => `<h2>Who's learning?</h2>
      <label for="wName">Their name</label><input id="wName" maxlength="20" placeholder="e.g. Simran" value="${esc(draft.name)}" autocomplete="off">
      <span class="lbl">Pick a picture</span><div class="avatars">${AVATARS.map(a => `<button aria-pressed="${a === draft.avatar}" data-a="${a}">${a}</button>`).join("")}</div>
      <div class="row2">${adding || PROFILES.length ? `<button class="cta ghost" id="wBack">Cancel</button>` : ""}<button class="cta" id="wNext">Next ›</button></div>`,
    () => `<h2>How much Punjabi?</h2><div class="levelpick">${LEVELS.map(l => `<button aria-pressed="${l.id === draft.level}" data-l="${l.id}"><b>${l.pa}</b><span>${l.en}</span><small>${{
        baby: "Big pictures and sounds. Tap, listen, repeat. For babies and toddlers.",
        child: "A learning path, reading and writing Gurmukhi, games and review.",
        adult: "Everything, plus tones, grammar notes and harder quizzes.",
      }[l.id]}</small></button>`).join("")}</div>
      <div class="row2"><button class="cta ghost" id="wBack">‹ Back</button><button class="cta" id="wNext">Next ›</button></div>`,
    () => `<h2>A little every day</h2><p class="sub">Pick a daily goal. Short and often works best.</p>
      <div class="levelpick goals">${[5, 10, 15, 20].map(m => `<button aria-pressed="${m === draft.goal}" data-g="${m}"><b>${m} min</b><span>${{ 5: "Easy", 10: "Steady", 15: "Keen", 20: "Super keen" }[m]}</span></button>`).join("")}</div>
      <div class="row2"><button class="cta ghost" id="wBack">‹ Back</button><button class="cta" id="wNext">Start learning 🎉</button></div>`,
  ];
  const render = () => {
    w.innerHTML = `<div class="wl-card">${steps[step]()}<div class="wl-dots">${steps.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div></div>`;
    w.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { draft.avatar = b.dataset.a; pop(); render(); });
    w.querySelectorAll("[data-l]").forEach(b => b.onclick = () => { draft.level = b.dataset.l; pop(); render(); });
    w.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { draft.goal = +b.dataset.g; pop(); render(); });
    const name = $("wName");
    if (name) { name.oninput = () => { draft.name = name.value; }; setTimeout(() => name.focus(), 50); }
    if ($("wRestore")) $("wRestore").onchange = e => { const f = e.target.files[0]; if (f) importFile(f); };
    if ($("wBack")) $("wBack").onclick = () => { if (step <= 1 && (adding || PROFILES.length)) { w.hidden = true; return; } step--; render(); };
    $("wNext").onclick = e => {
      pop();
      if (step === 0) say([UI_SAY.welcome]);
      if (step === 1 && !draft.name.trim()) { name.focus(); name.classList.add("nope"); setTimeout(() => name.classList.remove("nope"), 500); return; }
      if (step < steps.length - 1) { step++; render(); return; }
      addProfile(draft.name.trim(), draft.avatar, { level: draft.level, goal: draft.goal });
      w.hidden = true; state.tab = null; yay(); burst(e.clientX, e.clientY, 60, true); say([UI_SAY.letsgo]);
      goHome();
    };
  };
  w.hidden = false;
  render();
}

/* ---- Move to a new phone: one file with every learner, their progress and the family recordings ---- */
async function saveFile(name, blob) {
  const cap = window.Capacitor;
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins.Filesystem && cap.Plugins.Share) {
    const data = (await blobToDataURL(blob)).split(",")[1];
    const r = await cap.Plugins.Filesystem.writeFile({ path: name, data, directory: "CACHE" });
    await cap.Plugins.Share.share({ title: name, files: [r.uri] });
    return;
  }
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) {}
  if (dl) { await dl.save({ filename: name, data: blob }); return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}
async function exportBackup() {
  const out = { app: "nikke-bol", kind: "backup", version: 2, at: new Date().toISOString(), profiles: PROFILES, data: {}, voices: {} };
  saveP(); save();
  for (const p of PROFILES) out.data[p.id] = { settings: store.get(`nikke-bol:${p.id}:settings`, {}), progress: store.get(`nikke-bol:${p.id}:progress`, {}) };
  for (const [k, b] of Rec.cache) out.voices[k] = await blobToDataURL(b);
  try { await saveFile(`nikke-bol-backup-${todayStr()}.json`, new Blob([JSON.stringify(out)], { type: "application/json" })); toast("Backup saved. Open it on the new phone with “Restore a backup”."); }
  catch (e) { toast("The backup wasn't saved."); }
}
async function importFile(file) {
  let pack;
  try { pack = JSON.parse(await file.text()); } catch (e) { toast("That file isn't from Nikke Bol."); return; }
  if (!pack || pack.app !== "nikke-bol") { toast("That file isn't from Nikke Bol."); return; }
  let n = 0;
  for (const [k, u] of Object.entries(pack.voices || {})) { try { await Rec.put(k, dataURLToBlob(u)); n++; } catch (e) {} }
  if (pack.kind === "backup") {
    for (const p of pack.profiles || []) {
      if (!PROFILES.some(x => x.id === p.id)) PROFILES.push(p); else updateProfile(p.id, p);
      const d = (pack.data || {})[p.id] || {};
      store.set(`nikke-bol:${p.id}:settings`, d.settings || {}); store.set(`nikke-bol:${p.id}:progress`, d.progress || {});
    }
    store.set("nikke-bol:profiles", PROFILES);
    if (PROFILES.length) loadProfile(current && PROFILES.some(p => p.id === current) ? current : PROFILES[0].id);
    toast(`Restored ${pack.profiles.length} learner${pack.profiles.length === 1 ? "" : "s"} and ${n} recordings.`);
    $("welcome").hidden = true;
    goHome();
  } else toast(`Added ${n} family recordings.`);
}

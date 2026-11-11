"use strict";
/* Crew: chat, planner, to-do, goals and jobs. Plain JavaScript, no build step. */

const S = {
  data: null, version: 0, cursor: "", seen: new Set(), tab: "chat",
  plan: "day", day: "", unread: 0, lastDay: "", waitingUntil: 0, stale: false, refocus: "",
};
const TABS = [
  ["chat", "Crew", "M4 5h16v11H9l-5 4z"],
  ["plan", "Plan", "M3 17h18M6.5 17a5.5 5.5 0 0 1 11 0M12 4v3M4.6 8.6l2 2M19.4 8.6l-2 2"],
  ["todo", "To-do", "M4 6.5l1.8 1.8L9 5M4 12.5l1.8 1.8L9 11M4 18.5l1.8 1.8L9 17M12.5 7H20M12.5 13H20M12.5 19H20"],
  ["goals", "Goals", "M6 21V4M6 5h11l-2.5 4L17 13H6"],
  ["jobs", "Jobs", "M4 8h16v11H4zM9 8V5h6v3M4 13h16"],
];
const ICON = {
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  send: "M5 12h13M12.5 6l6 6-6 6",
  star: "M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z",
  left: "M14.5 5l-7 7 7 7", right: "M9.5 5l7 7-7 7", close: "M6 6l12 12M18 6L6 18", bin: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
};
const HORIZONS = [["week", "This week"], ["month", "This month"], ["big", "Big picture"]];
const STATUSES = [["lead", "Leads to look at"], ["applied", "Applied"], ["interview", "Interviewing"], ["offer", "Offers"], ["closed", "Closed"]];
const PROMPTS = [
  ["Plan my day", "Help me plan today. Keep it small."],
  ["I'm stuck", "I'm stuck and can't get started. Give me one tiny thing to do."],
  ["Help me find work", "@gpt where do I start with finding a job? Ask me what you need to know."],
  ["Money ideas", "@grok what are realistic ways I could earn some money in the next two weeks? Ask me what you need to know first."],
  ["What next?", "What's the single most useful thing I could do next?"],
];

/* ── small helpers ─────────────────────────────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "value") el.value = v;
    else if (k === "checked" || k === "disabled" || k === "open" || k === "selected") el[k] = !!v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
  return el;
}
function icon(path) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  svg.append(p);
  return svg;
}
async function api(method, path, body) {
  const res = await fetch(path, {
    method, headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { showGate(); throw new Error("Sign in first."); }
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.detail || "Something went wrong. Try again.");
  return out;
}
let toastTimer;
function toast(text) {
  const el = $("#toast");
  el.textContent = text; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
}
const guard = (fn) => async (...args) => { try { await fn(...args); } catch (err) { toast(err.message); } };

/* dates are plain YYYY-MM-DD strings, handled at UTC noon to dodge clock changes */
const toDate = (s) => new Date(s + "T12:00:00Z");
const toStr = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d); };
const fmt = (s, opts) => toDate(s).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
const today = () => S.data.settings.today;
const mondayOf = (s) => addDays(s, -((toDate(s).getUTCDay() + 6) % 7));
function dayLabel(s) {
  if (s === today()) return "Today";
  if (s === addDays(today(), 1)) return "Tomorrow";
  if (s === addDays(today(), -1)) return "Yesterday";
  return fmt(s, { weekday: "short", day: "numeric", month: "short" });
}
const agent = (id) => S.data.agents.find((a) => a.id === id);

/* ── sign-in ───────────────────────────────────────────────────────────── */
async function showGate() {
  const state = await fetch("/api/auth").then((r) => r.json());
  if (state.ok) return false;
  const gate = $("#gate");
  $("#app").hidden = true; gate.hidden = false; gate.replaceChildren();
  if (state.locked_out) {
    gate.append(h("div", {}, h("h1", {}, "Crew is locked"),
      h("p", {}, "No password has been set, so the app only opens on the computer it runs on. Set APP_PASSWORD on the host and restart to use it from here.")));
    return true;
  }
  const err = h("p", { class: "err", role: "alert" });
  const pw = h("input", { type: "password", "aria-label": "Password", placeholder: "Password", autocomplete: "current-password" });
  gate.append(h("form", {
    onsubmit: async (e) => {
      e.preventDefault();
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw.value }) });
      if (res.ok) location.reload();
      else err.textContent = (await res.json()).detail || "That didn't work.";
    },
  }, h("h1", {}, "Crew"), h("p", { class: "hint" }, "Your crew is waiting. Enter your password to come aboard."), pw,
    h("button", { class: "btn" }, "Sign in"), err));
  pw.focus();
  return true;
}

/* ── polling ───────────────────────────────────────────────────────────── */
let pollTimer;
async function poll() {
  clearTimeout(pollTimer);
  try {
    const r = await api("GET", `/api/poll?after=${encodeURIComponent(S.cursor)}&version=${S.version}`);
    if (r.data) { S.data = r.data; S.version = r.version; onData(); }
    if (r.messages.length) addMessages(r.messages);
    setTyping(r.typing);
    if (r.typing) S.waitingUntil = Date.now() + 20000;
  } catch (err) { console.error(err); /* offline or signed out; keep trying */ }
  const busy = Date.now() < S.waitingUntil;
  pollTimer = setTimeout(poll, document.hidden ? 30000 : busy ? 1200 : 5000);
}
const refresh = () => poll();
document.addEventListener("visibilitychange", () => { if (!document.hidden) { poll(); if (S.tab === "chat") clearUnread(); } });

function onData() {
  renderRoster();
  $("#title").textContent = S.tab === "chat" ? `${S.data.settings.name}'s crew` : TABS.find((t) => t[0] === S.tab)[1];
  if (S.tab === "chat") return;
  const active = document.activeElement;
  if (active && $("#view").contains(active) && /INPUT|TEXTAREA/.test(active.tagName) && active.value) { S.stale = true; return; }
  renderView();
}
$("#view").addEventListener("focusout", () => { if (S.stale) setTimeout(() => { if (S.stale) renderView(); }, 150); });

/* ── chrome ────────────────────────────────────────────────────────────── */
function renderRoster() {
  $("#roster").replaceChildren(...S.data.agents.map((a) =>
    h("span", { class: `face who-${a.id}${a.ready ? "" : " off"}`, title: `${a.name}: ${a.ready ? "on the crew" : "not set up"}` }, a.name[0])));
}
function renderTabs() {
  $("#tabs").replaceChildren(...TABS.map(([id, label, path]) =>
    h("button", { "aria-current": S.tab === id ? "page" : null, onclick: () => go(id) }, icon(path), label,
      id === "chat" && S.unread ? h("span", { class: "badge" }, String(S.unread)) : null)));
  document.title = S.unread ? `(${S.unread}) Crew` : "Crew";
}
function go(tab) {
  S.tab = tab;
  $("#chat").hidden = tab !== "chat";
  $("#view").hidden = tab === "chat";
  if (tab === "chat") { clearUnread(); scrollDown(true); }
  else { S.day = S.day || today(); $("#view").scrollTop = 0; }
  renderTabs(); onData();
}
function clearUnread() { S.unread = 0; renderTabs(); }

/* ── chat ──────────────────────────────────────────────────────────────── */
function rich(text) {
  const frag = document.createDocumentFragment();
  for (const part of text.split(/(\*\*[^*\n]+\*\*|https?:\/\/[^\s<>)]+)/g)) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) frag.append(h("strong", {}, part.slice(2, -2)));
    else if (/^https?:\/\//.test(part)) frag.append(h("a", { href: part, target: "_blank", rel: "noopener noreferrer" }, part));
    else frag.append(part);
  }
  return frag;
}
function addMessages(list) {
  const thread = $("#thread");
  const nearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 140;
  let mine = false;
  for (const m of list) {
    if (S.seen.has(m.id)) continue;
    S.seen.add(m.id);
    if (m.created_at > S.cursor) S.cursor = m.created_at;
    const when = new Date(m.created_at + "Z");
    const day = when.toLocaleDateString("en-CA");
    if (day !== S.lastDay) {
      S.lastDay = day;
      const label = day === new Date().toLocaleDateString("en-CA") ? "Today" : when.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      thread.append(h("div", { class: "day-mark" }, label));
    }
    const time = h("time", {}, when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    if (m.sender === "system") {
      thread.append(h("div", { class: `note${m.kind === "notice" ? " problem" : ""}` }, rich(m.text)));
    } else if (m.sender === "sunny") {
      mine = true;
      thread.append(h("div", { class: "msg mine" }, h("div", { class: "bubble" }, h("div", { class: "text" }, rich(m.text)), time)));
    } else {
      const a = agent(m.sender) || { name: m.sender, role: "" };
      const added = (m.meta.actions || []).map((act) => act.type === "task"
        ? h("div", { class: "added" }, h("b", {}, "Added to to-do"), act.title + (act.due ? ` (${dayLabel(act.due)})` : ""))
        : h("div", { class: "added" }, h("b", {}, "Noted"), act.text));
      thread.append(h("div", { class: `msg who-${m.sender}` },
        h("span", { class: `face who-${m.sender}` }, a.name[0]),
        h("div", { class: "bubble" }, h("div", { class: "who" }, a.name, h("span", {}, a.role)), h("div", { class: "text" }, rich(m.text)), added, time)));
      if (S.booted && (S.tab !== "chat" || document.hidden)) S.unread += 1;
    }
  }
  if (nearBottom || mine || !S.booted) scrollDown(true);
  if (S.booted) renderTabs();
}
function scrollDown() { const t = $("#thread"); requestAnimationFrame(() => { t.scrollTop = t.scrollHeight; }); }
function setTyping(id) {
  const el = $("#typing");
  if (!id || !S.data) { el.hidden = true; return; }
  const a = agent(id);
  el.replaceChildren(`${a ? a.name : "Someone"} is writing`, h("i"), h("i"), h("i"));
  el.hidden = false;
  if (S.tab === "chat") { const t = $("#thread"); if (t.scrollHeight - t.scrollTop - t.clientHeight < 140) scrollDown(); }
}
const send = guard(async (text) => {
  text = text.trim();
  if (!text) return;
  $("#send").disabled = true;
  try {
    const m = await api("POST", "/api/messages", { text });
    addMessages([m]);
    S.waitingUntil = Date.now() + 90000;
    poll();
  } finally { $("#send").disabled = false; }
});
function setupChat() {
  const draft = $("#draft");
  const grow = () => { draft.style.height = "auto"; draft.style.height = Math.min(draft.scrollHeight + 2, 150) + "px"; };
  $("#send").append(icon(ICON.send));
  $("#open-settings").append(icon(ICON.gear));
  $("#open-settings").addEventListener("click", openSettings);
  draft.addEventListener("input", grow);
  draft.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(pointer: fine)").matches) { e.preventDefault(); $("#composer").requestSubmit(); }
  });
  $("#composer").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = draft.value;
    draft.value = ""; grow();
    send(text);
  });
  $("#prompts").replaceChildren(...PROMPTS.map(([label, text]) => h("button", { type: "button", onclick: () => send(text) }, label)));
}
function ask(text) { go("chat"); send(text); }

/* ── tasks (shared by Plan, To-do and Goals) ───────────────────────────── */
const saveTask = guard(async (id, changes) => { await api("PATCH", `/api/tasks/${id}`, changes); await refresh(); });
const addTask = guard(async (fields, refocus) => {
  if (!fields.title.trim()) return;
  S.refocus = refocus || "";
  await api("POST", "/api/tasks", fields);
  await refresh();
});
function taskRow(t, opts = {}) {
  const bits = [];
  if (t.time) bits.push(t.time);
  if (opts.showDue && t.due) {
    const late = !t.done && t.due < today();
    bits.push(late ? h("span", { class: "late" }, `was due ${dayLabel(t.due)}`) : dayLabel(t.due));
  }
  const goal = t.goal_id && !opts.hideGoal && S.data.goals.find((g) => g.id === t.goal_id);
  if (goal) bits.push(goal.title);
  if (t.added_by !== "sunny" && agent(t.added_by)) bits.push(`from ${agent(t.added_by).name}`);
  const meta = bits.flatMap((b, i) => (i ? [", ", b] : [b]));
  return h("li", { class: t.done ? "done" : "" },
    h("button", { class: "tick", role: "checkbox", "aria-checked": String(!!t.done), "aria-label": `${t.done ? "Untick" : "Tick off"}: ${t.title}`,
      onclick: () => saveTask(t.id, { done: !t.done }) }),
    h("button", { class: "task-main", onclick: () => editTask(t) }, h("span", { class: "t" }, t.title), bits.length ? h("span", { class: "m" }, meta) : null),
    opts.star ? h("button", { class: "star", "aria-pressed": String(!!t.top), "aria-label": t.top ? "Remove from top 3" : "Make this a top 3 priority",
      onclick: () => {
        const starred = S.data.tasks.filter((x) => x.top && !x.done && x.due === t.due).length;
        if (!t.top && starred >= 3) return toast("Three is the limit. Unstar one first.");
        saveTask(t.id, { top: !t.top });
      } }, icon(ICON.star)) : null);
}
const taskList = (items, opts) => h("ul", { class: "tasks" }, items.map((t) => taskRow(t, opts)));
const byTime = (a, b) => (a.time || "99") < (b.time || "99") ? -1 : (a.time || "99") > (b.time || "99") ? 1 : a.created_at < b.created_at ? -1 : 1;
const onDay = (d) => S.data.tasks.filter((t) => t.due === d || (t.done && t.done_day === d && !t.due)).sort(byTime);

function editTask(t) {
  const f = {
    title: h("input", { type: "text", value: t.title }),
    due: h("input", { type: "date", value: t.due }),
    time: h("input", { type: "time", value: t.time }),
    goal: h("select", {}, h("option", { value: "" }, "No goal"), S.data.goals.filter((g) => !g.done || g.id === t.goal_id).map((g) => h("option", { value: g.id, selected: g.id === t.goal_id }, g.title))),
    notes: h("textarea", { class: "field" }),
  };
  f.notes.value = t.notes;
  sheet("Edit to-do", h("form", {
    onsubmit: guard(async (e) => {
      e.preventDefault();
      await api("PATCH", `/api/tasks/${t.id}`, { title: f.title.value, due: f.due.value, time: f.time.value, goal_id: f.goal.value, notes: f.notes.value });
      closeSheet(); await refresh();
    }),
  },
    h("label", { class: "f" }, "What", f.title),
    h("div", { class: "two" }, h("label", { class: "f" }, "Day", f.due), h("label", { class: "f" }, "Time (optional)", f.time)),
    h("label", { class: "f" }, "Part of a goal", f.goal),
    h("label", { class: "f" }, "Notes", f.notes),
    h("div", { class: "sheet-actions" }, h("button", { class: "btn" }, "Save changes"),
      h("button", { class: "btn danger", type: "button", onclick: guard(async () => { await api("DELETE", `/api/tasks/${t.id}`); closeSheet(); await refresh(); }) }, "Delete"))));
}

/* ── Plan: day, week, month ────────────────────────────────────────────── */
function horizon(done, total) {
  const frac = total ? done / total : 0;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 132 84");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", total ? `${done} of ${total} done` : "Nothing planned yet");
  const rays = frac === 1 ? [[-34, -6, -44, -8], [-26, -24, -34, -31], [0, -34, 0, -44], [26, -24, 34, -31], [34, -6, 44, -8]]
    .map(([a, b, c, d]) => `<line x1="${66 + a}" y1="${34 + b}" x2="${66 + c}" y2="${34 + d}" stroke="var(--sun)" stroke-width="3" stroke-linecap="round"/>`).join("") : "";
  svg.innerHTML = `<defs><clipPath id="sky"><rect width="132" height="62"/></clipPath></defs>
    <g clip-path="url(#sky)">${rays}<circle class="sun" cx="66" cy="34" r="20" fill="var(--sun)" style="transform:translateY(${Math.round((1 - frac) * 28)}px)"/></g>
    <line x1="6" y1="62" x2="126" y2="62" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
    <line x1="30" y1="71" x2="102" y2="71" stroke="var(--sea)" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    <line x1="50" y1="80" x2="82" y2="80" stroke="var(--sea)" stroke-width="3" stroke-linecap="round" opacity=".4"/>`;
  return svg;
}
function navRow(label, step, isNow) {
  return h("div", { class: "date-nav" },
    h("button", { class: "icon-btn", "aria-label": "Earlier", onclick: () => { S.day = step(-1); renderView(); } }, icon(ICON.left)),
    h("h2", {}, label),
    isNow ? null : h("button", { class: "btn quiet small", onclick: () => { S.day = today(); renderView(); } }, "Today"),
    h("button", { class: "icon-btn", "aria-label": "Later", onclick: () => { S.day = step(1); renderView(); } }, icon(ICON.right)));
}
function renderPlan(view) {
  view.append(h("div", { class: "seg", role: "group", "aria-label": "Planner view" },
    [["day", "Day"], ["week", "Week"], ["month", "Month"]].map(([id, label]) =>
      h("button", { "aria-pressed": String(S.plan === id), onclick: () => { S.plan = id; renderView(); } }, label))));
  if (S.plan === "day") planDay(view);
  else if (S.plan === "week") planWeek(view);
  else planMonth(view);
}
function planDay(view) {
  const d = S.day, items = onDay(d), done = items.filter((t) => t.done).length;
  const isToday = d === today();
  view.append(navRow(isToday ? "Today" : fmt(d, { weekday: "long", day: "numeric", month: "long" }), (n) => addDays(d, n), isToday));
  const left = items.length - done;
  const line = !items.length ? ["A clear day", "Add one small thing below."]
    : left === 0 ? ["All done", `${done} ticked off. That counts.`]
    : [`${done} of ${items.length} done`, left === 1 ? "One to go." : `${left} to go. One at a time.`];
  view.append(h("div", { class: "horizon" }, horizon(done, items.length), h("div", {}, h("strong", {}, line[0]), h("span", {}, line[1]))));

  const title = h("input", { type: "text", id: "add-day", placeholder: isToday ? "Add something for today" : "Add something for this day", "aria-label": "New to-do" });
  const time = h("input", { type: "time", "aria-label": "Time (optional)" });
  view.append(h("form", { class: "row-form", style: "margin-top:14px", onsubmit: (e) => { e.preventDefault(); addTask({ title: title.value, due: d, time: time.value }, "#add-day"); title.value = ""; } },
    title, time, h("button", { class: "btn" }, "Add")));

  const top = items.filter((t) => t.top), rest = items.filter((t) => !t.top);
  if (top.length) view.append(h("h2", {}, "Top 3"), taskList(top, { star: true }));
  if (rest.length) view.append(h("h2", {}, top.length ? "Also today" : "To do", top.length ? null : h("small", {}, "Star up to three that matter most")), taskList(rest, { star: true }));
  if (isToday) {
    const late = S.data.tasks.filter((t) => !t.done && t.due && t.due < d);
    if (late.length) view.append(
      h("h2", {}, "Left over from earlier", h("small", {}, String(late.length))),
      taskList(late, { showDue: true }),
      h("div", { class: "card actions", style: "border:0;background:none;padding:8px 0 0" },
        h("button", { class: "btn quiet small", onclick: guard(async () => { for (const t of late) await api("PATCH", `/api/tasks/${t.id}`, { due: d }); await refresh(); }) }, "Move all to today"),
        h("button", { class: "btn quiet small", onclick: () => ask("I've got old to-dos piling up. Help me decide which to drop and which to keep.") }, "Ask the crew what to drop")));
    if (!items.length && !late.length) view.append(h("p", { class: "hint", style: "margin-top:14px" }, "Not sure where to start? ",
      h("button", { class: "btn quiet small", onclick: () => ask(PROMPTS[0][1]) }, "Ask the crew to plan today")));
  }
}
function planWeek(view) {
  const start = mondayOf(S.day), end = addDays(start, 6);
  view.append(navRow(`${fmt(start, { day: "numeric", month: "short" })} to ${fmt(end, { day: "numeric", month: "short" })}`, (n) => addDays(S.day, 7 * n), mondayOf(today()) === start));
  goalsStrip(view, "week", "This week's goals");
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i), items = onDay(d), done = items.filter((t) => t.done).length;
    view.append(h("div", { class: `week-day${d === today() ? " is-today" : ""}` },
      h("button", { onclick: () => { S.day = d; S.plan = "day"; renderView(); }, "aria-label": `Open ${fmt(d, { weekday: "long", day: "numeric", month: "long" })}` },
        h("b", {}, fmt(d, { weekday: "long", day: "numeric" })), h("span", {}, items.length ? `${done} of ${items.length} done` : "Nothing planned")),
      items.length ? taskList(items, {}) : null));
  }
}
function planMonth(view) {
  const first = S.day.slice(0, 8) + "01";
  const shift = (n) => { const d = toDate(first); d.setUTCMonth(d.getUTCMonth() + n); return toStr(d); };
  view.append(navRow(fmt(first, { month: "long", year: "numeric" }), shift, today().slice(0, 7) === first.slice(0, 7)));
  const grid = h("div", { class: "cal" }, ["M", "T", "W", "T", "F", "S", "S"].map((d) => h("div", { class: "dow", "aria-hidden": "true" }, d)));
  const lead = (toDate(first).getUTCDay() + 6) % 7;
  for (let i = 0; i < lead; i++) grid.append(h("span"));
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) {
    const items = onDay(d), open = items.filter((t) => !t.done).length;
    const cls = [d === today() ? "is-today" : "", open ? "has-open" : items.length ? "all-done" : ""].join(" ");
    const said = `${fmt(d, { weekday: "long", day: "numeric", month: "long" })}: ${items.length ? `${items.length - open} of ${items.length} done` : "nothing planned"}`;
    grid.append(h("button", { class: cls, "aria-label": said, onclick: () => { S.day = d; S.plan = "day"; renderView(); } }, String(Number(d.slice(8))), h("i")));
  }
  view.append(grid, h("p", { class: "hint", style: "margin-top:10px" }, "A teal dot means things to do. A yellow dot means everything that day got done."));
  goalsStrip(view, "month", "This month's goals");
}
function goalsStrip(view, horizonId, label) {
  const goals = S.data.goals.filter((g) => !g.done && g.horizon === horizonId);
  view.append(h("h2", {}, label));
  if (!goals.length) return view.append(h("p", { class: "hint" }, "None yet. ", h("button", { class: "btn quiet small", onclick: () => go("goals") }, "Set one")));
  view.append(h("ul", { class: "tasks" }, goals.map((g) => {
    const steps = S.data.tasks.filter((t) => t.goal_id === g.id);
    return h("li", {}, h("button", { class: "task-main", style: "padding-left:14px", onclick: () => go("goals") }, h("span", { class: "t" }, g.title),
      h("span", { class: "m" }, steps.length ? `${steps.filter((t) => t.done).length} of ${steps.length} steps done` : "No steps yet")));
  })));
}

/* ── To-do ─────────────────────────────────────────────────────────────── */
function renderTodo(view) {
  const title = h("input", { type: "text", id: "add-todo", placeholder: "Add a to-do", "aria-label": "New to-do" });
  const due = h("input", { type: "date", "aria-label": "Day (optional)" });
  view.append(h("form", { class: "row-form", onsubmit: (e) => { e.preventDefault(); addTask({ title: title.value, due: due.value }, "#add-todo"); title.value = ""; } },
    title, due, h("button", { class: "btn" }, "Add")));
  const open = S.data.tasks.filter((t) => !t.done), t0 = today();
  const sort = (a, b) => (a.due + (a.time || "99") < b.due + (b.time || "99") ? -1 : 1);
  const groups = [
    ["Overdue", open.filter((t) => t.due && t.due < t0).sort(sort), true],
    ["Today", open.filter((t) => t.due === t0).sort(byTime), false],
    ["Coming up", open.filter((t) => t.due > t0).sort(sort), true],
    ["No day set", open.filter((t) => !t.due), false],
  ];
  if (!open.length) view.append(h("p", { class: "empty", style: "margin-top:16px" }, "Nothing on the list. Add one thing above, or ask the crew for a first step."));
  for (const [label, items, showDue] of groups) if (items.length) view.append(h("h2", {}, label, h("small", {}, String(items.length))), taskList(items, { showDue }));
  const done = S.data.tasks.filter((t) => t.done).sort((a, b) => (a.done_day < b.done_day ? 1 : -1)).slice(0, 30);
  if (done.length) view.append(h("details", { style: "margin-top:22px" }, h("summary", {}, `Done recently (${done.length})`), h("div", { style: "margin-top:8px" }, taskList(done, {}))));
}

/* ── Goals ─────────────────────────────────────────────────────────────── */
function wins() {
  const days = new Set(S.data.tasks.filter((t) => t.done).map((t) => t.done_day));
  let d = days.has(today()) ? today() : addDays(today(), -1), run = 0;
  while (days.has(d)) { run += 1; d = addDays(d, -1); }
  const weekStart = mondayOf(today());
  return { run, week: S.data.tasks.filter((t) => t.done && t.done_day >= weekStart).length };
}
function renderGoals(view) {
  const w = wins();
  view.append(h("div", { class: "wins" },
    h("div", {}, h("strong", {}, String(w.week)), h("span", {}, w.week === 1 ? "thing done this week" : "things done this week")),
    h("div", {}, h("strong", {}, w.run ? `${w.run} ${w.run === 1 ? "day" : "days"}` : "Day one"), h("span", {}, w.run ? "in a row with something ticked off" : "tick one thing off to start a run"))));
  const title = h("input", { type: "text", id: "add-goal", placeholder: "A goal, in your own words", "aria-label": "New goal" });
  const hz = h("select", { "aria-label": "Timeframe" }, HORIZONS.map(([id, label]) => h("option", { value: id, selected: id === "month" }, label)));
  view.append(h("form", { class: "row-form", style: "margin-top:16px", onsubmit: guard(async (e) => {
    e.preventDefault(); if (!title.value.trim()) return;
    S.refocus = "#add-goal"; await api("POST", "/api/goals", { title: title.value, horizon: hz.value }); title.value = ""; await refresh();
  }) }, title, hz, h("button", { class: "btn" }, "Add goal")));
  const open = S.data.goals.filter((g) => !g.done);
  if (!open.length) view.append(h("p", { class: "empty", style: "margin-top:16px" }, "No goals yet. Start with one, like “Get a job” or “Earn £100 this month”, then break it into small steps."));
  for (const [id, label] of HORIZONS) {
    const goals = open.filter((g) => g.horizon === id);
    if (goals.length) view.append(h("h2", {}, label), ...goals.map(goalCard));
  }
  const achieved = S.data.goals.filter((g) => g.done);
  if (achieved.length) view.append(h("details", { style: "margin-top:22px" }, h("summary", {}, `Achieved (${achieved.length})`), h("div", { style: "margin-top:8px" }, achieved.map(goalCard))));
}
function goalCard(g) {
  const steps = S.data.tasks.filter((t) => t.goal_id === g.id).sort((a, b) => a.done - b.done || (a.created_at < b.created_at ? -1 : 1));
  const done = steps.filter((t) => t.done).length;
  const step = h("input", { type: "text", id: `step-${g.id}`, placeholder: "Add a small step", "aria-label": `New step for ${g.title}` });
  const setDone = (value) => guard(async () => { await api("PATCH", `/api/goals/${g.id}`, { done: value }); await refresh(); });
  return h("div", { class: `card${g.done ? " achieved" : ""}` },
    h("h3", {}, g.title), g.why ? h("p", { class: "why" }, g.why) : null,
    steps.length ? [h("div", { class: "bar" }, h("i", { style: `width:${Math.round((done / steps.length) * 100)}%` })), h("span", { class: "hint" }, `${done} of ${steps.length} steps done`), taskList(steps, { showDue: true, hideGoal: true })] : null,
    g.done ? h("div", { class: "actions" }, h("button", { class: "btn quiet small", onclick: setDone(false) }, "Reopen")) : [
      h("form", { class: "row-form", style: "margin-top:10px", onsubmit: (e) => { e.preventDefault(); addTask({ title: step.value, goal_id: g.id }, `#step-${g.id}`); step.value = ""; } }, step, h("button", { class: "btn quiet" }, "Add step")),
      h("div", { class: "actions" },
        h("button", { class: "btn quiet small", onclick: () => ask(`@claude my goal is “${g.title}”. Break it into small steps and add the first two to my to-do list.`) }, "Ask the crew to break it down"),
        h("button", { class: "btn quiet small", onclick: () => editGoal(g) }, "Edit"),
        h("button", { class: "btn quiet small", onclick: setDone(true) }, "Mark achieved"))]);
}
function editGoal(g) {
  const title = h("input", { type: "text", value: g.title });
  const why = h("textarea", { class: "field" }); why.value = g.why;
  const hz = h("select", {}, HORIZONS.map(([id, label]) => h("option", { value: id, selected: id === g.horizon }, label)));
  sheet("Edit goal", h("form", { onsubmit: guard(async (e) => { e.preventDefault(); await api("PATCH", `/api/goals/${g.id}`, { title: title.value, why: why.value, horizon: hz.value }); closeSheet(); await refresh(); }) },
    h("label", { class: "f" }, "Goal", title), h("label", { class: "f" }, "Why it matters to you", why), h("label", { class: "f" }, "Timeframe", hz),
    h("div", { class: "sheet-actions" }, h("button", { class: "btn" }, "Save changes"),
      h("button", { class: "btn danger", type: "button", onclick: guard(async () => { await api("DELETE", `/api/goals/${g.id}`); closeSheet(); await refresh(); }) }, "Delete"))));
}

/* ── Jobs ──────────────────────────────────────────────────────────────── */
function renderJobs(view) {
  const weekStart = mondayOf(today());
  const applied = S.data.jobs.filter((j) => j.applied_day && j.applied_day >= weekStart).length;
  view.append(h("div", { class: "wins" },
    h("div", {}, h("strong", {}, String(applied)), h("span", {}, applied === 1 ? "application sent this week" : "applications sent this week")),
    h("div", {}, h("strong", {}, String(S.data.jobs.filter((j) => j.status === "interview").length)), h("span", {}, "at interview stage"))));
  const role = h("input", { type: "text", id: "add-job", placeholder: "Job title", "aria-label": "Job title" });
  const company = h("input", { type: "text", placeholder: "Employer", "aria-label": "Employer" });
  view.append(h("form", { class: "row-form", style: "margin-top:16px", onsubmit: guard(async (e) => {
    e.preventDefault(); if (!role.value.trim()) return;
    S.refocus = "#add-job"; await api("POST", "/api/jobs", { title: role.value, company: company.value }); role.value = ""; company.value = ""; await refresh();
  }) }, role, company, h("button", { class: "btn" }, "Add job")));
  if (!S.data.jobs.length) view.append(h("p", { class: "empty", style: "margin-top:16px" }, "Every job you spot goes here, so nothing gets lost. Add the first one above, or ",
    h("button", { class: "btn quiet small", onclick: () => ask(PROMPTS[2][1]) }, "ask GPT where to look")));
  for (const [id, label] of STATUSES) {
    const jobs = S.data.jobs.filter((j) => j.status === id);
    if (jobs.length) view.append(h("h2", {}, label, h("small", {}, String(jobs.length))), ...jobs.map(jobCard));
  }
}
function jobCard(j) {
  const status = h("select", { "aria-label": `Stage for ${j.title}`, onchange: guard(async () => { await api("PATCH", `/api/jobs/${j.id}`, { status: status.value }); await refresh(); }) },
    STATUSES.map(([id]) => h("option", { value: id, selected: id === j.status }, { lead: "Lead", applied: "Applied", interview: "Interview", offer: "Offer", closed: "Closed" }[id])));
  const late = j.next_date && j.next_date < today() && j.status !== "closed";
  return h("div", { class: "card" },
    h("div", { class: "job-top" }, h("div", {}, h("h3", {}, j.title), j.company ? h("p", { class: "why" }, j.company) : null), status),
    j.next_step ? h("p", { class: "job-next" }, "Next: ", j.next_step, j.next_date ? [", by ", h("span", { class: late ? "late" : "" }, dayLabel(j.next_date))] : null) : null,
    j.link ? h("p", { class: "job-next" }, h("a", { href: j.link, target: "_blank", rel: "noopener noreferrer" }, "Open the advert")) : null,
    h("div", { class: "actions" },
      h("button", { class: "btn quiet small", onclick: () => ask(`@gpt help me with the ${j.title} job${j.company ? ` at ${j.company}` : ""}. It's at the “${j.status}” stage. What should I do next?`) }, "Ask GPT for help"),
      h("button", { class: "btn quiet small", onclick: () => editJob(j) }, "Edit")));
}
function editJob(j) {
  const f = { title: h("input", { type: "text", value: j.title }), company: h("input", { type: "text", value: j.company }), link: h("input", { type: "text", value: j.link, inputmode: "url" }),
    next_step: h("input", { type: "text", value: j.next_step }), next_date: h("input", { type: "date", value: j.next_date }), notes: h("textarea", { class: "field" }) };
  f.notes.value = j.notes;
  sheet("Edit job", h("form", { onsubmit: guard(async (e) => {
    e.preventDefault();
    await api("PATCH", `/api/jobs/${j.id}`, Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value])));
    closeSheet(); await refresh();
  }) },
    h("label", { class: "f" }, "Job title", f.title), h("label", { class: "f" }, "Employer", f.company), h("label", { class: "f" }, "Link to the advert", f.link),
    h("div", { class: "two" }, h("label", { class: "f" }, "Next step", f.next_step), h("label", { class: "f" }, "By", f.next_date)),
    h("label", { class: "f" }, "Notes", f.notes),
    h("div", { class: "sheet-actions" }, h("button", { class: "btn" }, "Save changes"),
      h("button", { class: "btn danger", type: "button", onclick: guard(async () => { await api("DELETE", `/api/jobs/${j.id}`); closeSheet(); await refresh(); }) }, "Delete"))));
}

function renderView() {
  S.stale = false;
  const view = $("#view"), keep = view.scrollTop;
  view.replaceChildren();
  ({ plan: renderPlan, todo: renderTodo, goals: renderGoals, jobs: renderJobs })[S.tab](view);
  view.scrollTop = keep;
  if (S.refocus) { const el = $(S.refocus, view); if (el) el.focus({ preventScroll: true }); S.refocus = ""; }
}

/* ── sheet ─────────────────────────────────────────────────────────────── */
function sheet(title, body) {
  const dlg = $("#sheet");
  dlg.replaceChildren(h("div", { class: "sheet-head" }, h("h2", {}, title), h("button", { class: "icon-btn", "aria-label": "Close", onclick: closeSheet }, icon(ICON.close))), h("div", { class: "sheet-body" }, body));
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
function closeSheet() { $("#sheet").close(); }
$("#sheet").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeSheet(); });

/* ── settings ──────────────────────────────────────────────────────────── */
const saveSetting = guard(async (changes, quiet) => { await api("PUT", "/api/settings", changes); await refresh(); if (!quiet) toast("Saved"); });
function memberCard(id) {
  const a = agent(id);
  const result = h("p", { class: "result", role: "status" });
  const key = h("input", { type: "password", autocomplete: "off", placeholder: a.has_key ? "Paste a new key to replace" : "Paste the API key here", "aria-label": `${a.name} API key` });
  const model = h("select", { "aria-label": `${a.name} model` });
  const fixed = a.model !== "auto";
  model.append(h("option", { value: id === "claude" ? "claude-opus-5-5" : "auto", selected: !fixed || a.model === "claude-opus-5-5" }, id === "claude" ? "claude-opus-5-5 (recommended)" : `Choose for me${a.auto_model ? ` (using ${a.auto_model})` : ""}`));
  if (fixed && a.model !== "claude-opus-5-5") model.append(h("option", { value: a.model, selected: true }, a.model));
  let loaded = false;
  const loadModels = guard(async () => {
    if (loaded || !a.has_key) return; loaded = true;
    const { models } = await api("GET", `/api/agents/${id}/models`);
    for (const m of models) if (![...model.options].some((o) => o.value === m)) model.append(h("option", { value: m }, m));
  });
  model.addEventListener("pointerdown", loadModels); model.addEventListener("focus", loadModels);
  model.addEventListener("change", guard(async () => { await api("PUT", `/api/agents/${id}`, { model: model.value }); await refresh(); toast(`${a.name} will use ${model.value === "auto" ? "the best match" : model.value}`); }));
  const redraw = () => { const old = $(`#member-${id}`); if (old) old.replaceWith(memberCard(id)); };
  const test = guard(async () => {
    result.className = "result"; result.textContent = `Asking ${a.name} to say hello…`;
    const r = await api("POST", `/api/agents/${id}/test`);
    await refresh();
    result.className = `result${r.ok ? "" : " bad"}`;
    result.textContent = r.ok ? `${a.name} replied: “${r.reply}” (model: ${r.model})` : r.error;
  });
  return h("div", { class: "member", id: `member-${id}` },
    h("div", { class: "member-head" }, h("span", { class: `face who-${id}${a.ready ? "" : " off"}` }, a.name[0]),
      h("div", {}, h("b", {}, a.name), h("span", {}, `${a.role}: ${a.does.replace("Sunny", S.data.settings.name)}`)),
      h("span", { class: `state${a.ready ? " ok" : ""}` }, a.ready ? "On the crew" : a.has_key ? "Switched off" : "Needs a key")),
    a.key_source === "host" ? h("p", { class: "hint" }, "The key for this one is set on the host.") : h("form", { class: "row-form", style: "margin-top:10px", onsubmit: guard(async (e) => {
      e.preventDefault(); if (!key.value.trim()) return;
      await api("PUT", `/api/agents/${id}`, { key: key.value }); await refresh(); redraw(); toast(`${a.name}'s key saved`);
    }) }, key, h("button", { class: "btn" }, "Save key")),
    h("p", { class: "hint" }, "Get a key at ", h("a", { href: a.key_url, target: "_blank", rel: "noopener noreferrer", style: "color:var(--sea)" }, a.key_url.replace("https://", "")),
      a.replies_today ? `. Replies today: ${a.replies_today}.` : "."),
    a.has_key ? [
      h("label", { class: "f" }, "Model", model),
      h("div", { class: "sheet-actions", style: "margin-top:10px" },
        h("button", { class: "btn quiet", type: "button", onclick: test }, `Test ${a.name}`),
        h("label", { class: "switch" }, h("input", { type: "checkbox", checked: a.enabled, onchange: guard(async (e) => { await api("PUT", `/api/agents/${id}`, { enabled: e.target.checked }); await refresh(); redraw(); }) }), "On the crew")),
      result] : null);
}
function openSettings() {
  const s = S.data.settings;
  const text = (key, attrs = {}) => h("input", { type: "text", value: s[key], ...attrs, onchange: (e) => saveSetting({ [key]: e.target.value }) });
  const checkRow = (kind, label) => [
    h("label", { class: "switch" }, h("input", { type: "checkbox", checked: s[`on_${kind}`], onchange: (e) => saveSetting({ [`on_${kind}`]: e.target.checked }) }), label),
    h("input", { type: "time", value: s[`time_${kind}`], "aria-label": `${label} time`, onchange: (e) => e.target.value && saveSetting({ [`time_${kind}`]: e.target.value }) })];
  const note = h("input", { type: "text", placeholder: "Something the crew should know about you", "aria-label": "New note" });
  const memory = () => h("ul", { class: "memory", id: "memory-list" }, S.data.memory.map((m) => h("li", {}, h("span", {}, m.text, agent(m.added_by) ? h("small", { class: "hint" }, ` (noted by ${agent(m.added_by).name})`) : null),
    h("button", { class: "icon-btn", "aria-label": `Forget: ${m.text}`, onclick: guard(async () => { await api("DELETE", `/api/memory/${m.id}`); await refresh(); $("#memory-list").replaceWith(memory()); }) }, icon(ICON.bin)))));
  sheet("Settings", [
    h("h3", {}, "Your crew"),
    h("p", { class: "hint" }, "Each crew member needs its own API key from the company that makes it. One key is enough to start. Keys are stored encrypted and never shown again."),
    S.data.agents.map((a) => memberCard(a.id)),

    h("h3", {}, "About you"),
    h("div", { class: "two" }, h("label", { class: "f" }, "What the crew calls you", text("name")), h("label", { class: "f" }, "Timezone", text("timezone", { placeholder: "Europe/London" }))),
    h("p", { class: "hint", style: "margin-top:14px" }, "What the crew remembers about you. They add to this as you talk; remove anything that's wrong."),
    memory(),
    h("form", { class: "row-form", onsubmit: guard(async (e) => { e.preventDefault(); if (!note.value.trim()) return; await api("POST", "/api/memory", { text: note.value }); note.value = ""; await refresh(); $("#memory-list").replaceWith(memory()); }) }, note, h("button", { class: "btn quiet" }, "Add note")),

    h("h3", {}, "Check-ins while you're away"),
    h("label", { class: "switch" }, h("input", { type: "checkbox", checked: s.checkins, onchange: (e) => saveSetting({ checkins: e.target.checked }) }), "The crew messages you on a schedule"),
    h("div", { class: "times" }, checkRow("morning", "Morning plan"), checkRow("nudge", "Afternoon nudge, only if nothing's ticked off"), checkRow("evening", "Evening wrap-up"), checkRow("weekly", "Sunday review from everyone")),
    h("div", { class: "sheet-actions" }, h("button", { class: "btn quiet", type: "button", onclick: guard(async () => { await api("POST", "/api/checkin/morning"); closeSheet(); go("chat"); S.waitingUntil = Date.now() + 90000; poll(); }) }, "Send a morning plan now")),
    h("label", { class: "f" }, "Phone alerts (optional)", text("ntfy_topic", { placeholder: "a-private-topic-name" })),
    h("p", { class: "hint" }, "Install the free ntfy app, subscribe to a topic name only you would guess, and type the same name here. An alert only ever says “Your crew left you a message”."),

    h("h3", {}, "Keeping costs down"),
    h("label", { class: "f" }, "Who answers each message", h("select", { onchange: (e) => saveSetting({ reply_mode: e.target.value }) },
      h("option", { value: "team", selected: s.reply_mode === "team" }, "Everyone with something to add"), h("option", { value: "one", selected: s.reply_mode === "one" }, "One crew member (cheapest)"))),
    h("label", { class: "f" }, "Most replies per crew member per day", h("input", { type: "number", min: "1", max: "500", value: s.daily_cap, onchange: (e) => saveSetting({ daily_cap: e.target.value }) })),
    h("p", { class: "hint" }, "Every reply costs a little on that company's bill. Set a monthly spending limit on each account too."),

    h("h3", {}, "Good to know"),
    h("p", { class: "hint" }, "What you write here is sent to the companies behind the crew (Anthropic, OpenAI, Google and xAI) so they can answer. The crew can't browse the internet, so check any facts they give you."),
    h("p", { class: "hint" }, "If things get too heavy, talk to a person: Samaritans, 116 123, free at any hour in the UK and Ireland."),
    S.needsPassword ? h("div", { class: "sheet-actions" }, h("button", { class: "btn quiet", onclick: async () => { await fetch("/api/logout", { method: "POST" }); location.reload(); } }, "Sign out")) : null,
  ]);
}

/* ── start ─────────────────────────────────────────────────────────────── */
(async function start() {
  const state = await fetch("/api/auth").then((r) => r.json()).catch(() => ({ ok: false }));
  S.needsPassword = state.needs_password;
  if (!state.ok) { await showGate(); return; }
  $("#app").hidden = false;
  setupChat();
  await poll();
  if (!S.data) return;
  S.day = today();
  S.booted = true;
  renderTabs();
  scrollDown();
})();

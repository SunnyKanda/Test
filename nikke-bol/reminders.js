"use strict";
/* Daily reminders (phone app only). Instead of one repeating alarm, we schedule the next
   two weeks one day at a time, and skip today once someone has met their goal, so the
   reminder only comes on days you haven't practised yet. Refreshed every time the app
   opens, is put away, or a goal is met. */

const Reminders = {
  ids: [...Array(14)].map((_, i) => 4100 + i),
  get settings() { return store.get("nikke-bol:reminder", { on: false, time: "17:30" }); },
  set settings(v) { store.set("nikke-bol:reminder", v); },
  plugin() {
    const c = window.Capacitor;
    return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.LocalNotifications || null;
  },
  available() { return !!this.plugin(); },

  async enable(time) {
    const ln = this.plugin(); if (!ln) return false;
    let perm = await ln.checkPermissions();
    if (perm.display !== "granted") perm = await ln.requestPermissions();
    if (perm.display !== "granted") { toast("Notifications are off for Nikke Bol. Turn them on in your phone's Settings."); return false; }
    this.settings = { on: true, time };
    await this.refresh();
    return true;
  },
  async disable() {
    this.settings = { ...this.settings, on: false };
    const ln = this.plugin(); if (ln) await ln.cancel({ notifications: [...this.ids, 4200].map(id => ({ id })) }).catch(() => {});
  },

  /* A word to tempt you back: a different one each day. */
  wordOfDay(date) {
    const all = CATS.filter(c => !["numbers", "painti", "days", "months", "talk", "routine"].includes(c.id)).flatMap(c => c.sets.flatMap(s => s.items)).filter(it => it.e && it.say.length === 1);
    const n = Math.floor(date.getTime() / DAY);
    return all[n % all.length];
  },
  message(date) {
    const names = PROFILES.map(p => p.name);
    const who = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : "everyone";
    const w = this.wordOfDay(date), st = streak();
    const lines = [
      `Today's word: ${w.pa} (${w.tr}) means “${w.en}” ${w.e}`,
      st > 1 ? `Keep ${who}'s ${st}-day streak going 🔥` : `A few minutes of Punjabi with ${who}?`,
      `${w.e} Can ${who} say ${w.pa}? Tap to hear it.`,
    ];
    return { title: "ਨਿੱਕੇ ਬੋਲ · Punjabi time", body: lines[Math.floor(date.getTime() / DAY) % lines.length] };
  },

  /* Sunday evening: how everyone got on this week (Monday to now, as of the last time the app was open). */
  weeklyNote() {
    if (this.settings.weekly === false) return null;
    const at = new Date(); at.setDate(at.getDate() + ((7 - at.getDay()) % 7)); at.setHours(18, 0, 0, 0);
    if (at.getTime() < Date.now() + 60e3) at.setDate(at.getDate() + 7);
    const monday = new Date(at); monday.setDate(at.getDate() - 6);
    const parts = PROFILES.map(p => {
      const log = store.get(`nikke-bol:${p.id}:progress`, {}).log || {};
      let secs = 0, n = 0;
      for (let d = new Date(monday); d <= at; d.setDate(d.getDate() + 1)) { const l = log[dayKey(d)]; if (l) { secs += l.secs; n += l.n; } }
      return { name: p.name, mins: Math.round(secs / 60), n };
    });
    const any = parts.some(x => x.mins || x.n);
    const body = any ? "This week: " + parts.map(x => `${x.name} ${x.mins} min, ${x.n} words`).join(" · ") + ". ਸ਼ਾਬਾਸ਼!"
      : "A new week of Punjabi starts tomorrow. Five minutes a day is plenty.";
    return { title: "ਨਿੱਕੇ ਬੋਲ · Your week", body, schedule: { at } };
  },
  /* Tapping a reminder opens the word of the day; the weekly one opens the calendar. */
  listen() {
    const ln = this.plugin(); if (!ln || !ln.addListener) return;
    ln.addListener("localNotificationActionPerformed", a => {
      const x = (a && a.notification && a.notification.extra) || {};
      $("welcome").hidden = true;
      if (x.kind === "word") openWordOfDay(new Date(x.at || Date.now()));
      else if (x.kind === "week") openCalendar();
    });
  },
  async refresh() {
    const ln = this.plugin(), cfg = this.settings;
    if (!ln || !cfg.on || !PROFILES.length) return;
    await ln.cancel({ notifications: [...this.ids, 4200].map(id => ({ id })) }).catch(() => {});
    const [hh, mm] = cfg.time.split(":").map(Number);
    // Today is skipped if any learner has already met their goal.
    const doneToday = PROFILES.some(p => {
      const s = { ...DEFAULTS, ...store.get(`nikke-bol:${p.id}:settings`, {}) };
      const l = (store.get(`nikke-bol:${p.id}:progress`, {}).log || {})[todayStr()];
      return l && l.secs >= s.goal * 60;
    });
    const list = [];
    for (let d = 0; d < this.ids.length; d++) {
      const at = new Date(); at.setDate(at.getDate() + d); at.setHours(hh, mm, 0, 0);
      if (at.getTime() < Date.now() + 60e3 || (d === 0 && doneToday)) continue;
      list.push({ id: this.ids[d], ...this.message(at), schedule: { at }, smallIcon: "ic_stat_nikke", iconColor: "#FF3D8B", extra: { kind: "word", at: at.getTime() } });
    }
    const weekly = this.weeklyNote();
    if (weekly) list.push({ id: 4200, ...weekly, smallIcon: "ic_stat_nikke", iconColor: "#FF3D8B", extra: { kind: "week" } });
    if (list.length) await ln.schedule({ notifications: list }).catch(() => {});
  },
};

/* Grown-ups settings: the reminder row. */
function renderReminderRow() {
  const row = $("remRow"); if (!row) return;
  if (!Reminders.available()) {
    row.innerHTML = `<p class="small">Daily reminders work in the Nikke Bol phone app.</p>`;
    return;
  }
  const cfg = Reminders.settings;
  row.innerHTML = `<div class="row"><label for="remOn">Remind me to practise<br><small>Only on days you haven't met your goal yet.</small></label><input type="checkbox" id="remOn" ${cfg.on ? "checked" : ""}></div>
    <div class="row"${cfg.on ? "" : " hidden"}><label for="remTime">At</label><input type="time" id="remTime" value="${cfg.time}"></div>
    <div class="row"${cfg.on ? "" : " hidden"}><label for="remWeek">Weekly summary<br><small>Sunday at 6pm: minutes and words for each learner.</small></label><input type="checkbox" id="remWeek" ${cfg.weekly === false ? "" : "checked"}></div>`;
  $("remWeek").onchange = async e => { Reminders.settings = { ...Reminders.settings, weekly: e.target.checked }; await Reminders.refresh(); };
  $("remOn").onchange = async e => {
    if (e.target.checked) { if (!(await Reminders.enable($("remTime").value || cfg.time))) e.target.checked = false; else toast(`Reminder set for ${Reminders.settings.time} each day.`); }
    else { await Reminders.disable(); toast("Reminders off."); }
    renderReminderRow();
  };
  $("remTime").onchange = async e => { if (e.target.value) { Reminders.settings = { ...Reminders.settings, time: e.target.value }; await Reminders.refresh(); toast(`Reminder moved to ${e.target.value}.`); } };
}

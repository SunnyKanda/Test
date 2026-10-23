"use strict";
/* Start-up: first run shows the welcome; everyone else lands on home. */
$("who").onclick = () => { pop(); openProfiles(); };
$("goal").onclick = () => { pop(); if (atLeast("child")) openCalendar(); else parentGate(openCalendar); };
renderHome();
if (!PROFILES.length) openWelcome();
Rec.loadAll().then(refreshView);
Family.init();
Reminders.refresh();
if ("serviceWorker" in navigator && location.protocol === "https:" && !window.claude && !window.Capacitor) navigator.serviceWorker.register("sw.js").catch(() => {});

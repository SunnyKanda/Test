"use strict";
/* The one-off unlock. Apple or Google take the payment and sign the purchase;
   the app asks the store what this account owns on every start, so the store
   always has the final say. No server, no account, nothing collected. */

const UNLOCK_ID = "nikkebol.unlock";
const FREE_UNITS = 7;                    // the first seven path units, up to the first reading lesson
const FREE_LESSONS = new Set(["mukta"]); // plus the vowel letters
const PAID_TILES = new Set(["chart", "write", "sentences", "speak", "tones", "review"]);

const Unlock = {
  /* What the store last said, kept on the device so the app works offline. Not part of backups. */
  get rec() { return store.get("nikke-bol:unlock", { owned: false, pending: false, checked: 0, missSince: 0 }); },
  set rec(v) { store.set("nikke-bol:unlock", v); },
  product: null, productErr: false, busy: false, msg: "",
  plugin() { const c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins.NativePurchases || null; },
  platform() { const c = window.Capacitor; return c && c.getPlatform ? c.getPlatform() : "web"; },
  /* The web version is a taster unless a build marks it as the full preview. */
  has() { return this.plugin() ? this.rec.owned : !!window.NB_FULL_WEB; },
  unitOpen(u) { return this.has() || PATH.indexOf(u) < FREE_UNITS; },
  lessonOpen(m) { return this.has() || FREE_LESSONS.has(m.id); },

  /* Locked things go through the grown-ups check to the unlock page; open things just open. */
  need(then, back = goHome) {
    if (this.has()) return then();
    pop(); toast("This part is in the full app. Ask a grown-up.");
    parentGate(() => openUnlock(then, back));
  },

  async init() {
    const p = this.plugin(); if (!p) return;
    try { await p.addListener("transactionUpdated", t => { if (t.productIdentifier === UNLOCK_ID) this.refresh(); }); } catch (e) {}
    document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - this.rec.checked > 60e3) this.refresh(); });
    await this.refresh();
  },
  /* Ask the store what this Apple ID or Google account owns. */
  async refresh() {
    const p = this.plugin(); if (!p) return this.has();
    try {
      const { purchases = [] } = await p.getPurchases({ productType: "inapp" });
      // iOS only returns purchases Apple's signature checks out for; a refund sets revocationDate.
      // Android: "1" is purchased, anything else is still pending; refunds drop off the list.
      const mine = purchases.filter(t => t.productIdentifier === UNLOCK_ID && !t.revocationDate);
      const done = mine.filter(t => t.purchaseState == null || t.purchaseState === "1");
      // Google refunds a purchase that isn't acknowledged within 3 days, so catch any that slipped through.
      for (const t of done) if (t.isAcknowledged === false && t.purchaseToken) await p.acknowledgePurchase({ purchaseToken: t.purchaseToken }).catch(() => {});
      this.apply(done.length > 0, mine.length > done.length);
    } catch (e) { /* offline, or the store isn't reachable: keep the last answer */ }
    return this.has();
  },
  apply(owned, pending) {
    const r = this.rec, was = this.has(), now = Date.now();
    if (owned) this.rec = { owned: true, pending: false, checked: now, missSince: 0 };
    else if (r.owned) {
      // It was bought, and now the store says no: a refund, or a store hiccup. Relock only after
      // "no" answers at least three days apart, so a paying family is never locked out by a glitch.
      const since = r.missSince || now;
      this.rec = { owned: now - since < 3 * DAY, pending, checked: now, missSince: since };
    } else this.rec = { owned: false, pending, checked: now, missSince: 0 };
    if (this.has() !== was) this.changed(this.has());
  },
  changed(nowOwned) {
    if (this.onPage()) this.view($("pageBody"));
    else if (state.view === "home") renderHome();
    else if ($("settings").open) renderUnlockRow();
    if (nowOwned) { yay(); burst(innerWidth / 2, innerHeight / 3, 60, true); }
  },
  async loadProduct() {
    const p = this.plugin(); if (!p || this.product) return;
    try { this.product = (await p.getProduct({ productIdentifier: UNLOCK_ID, productType: "inapp" })).product; this.productErr = false; }
    catch (e) { this.productErr = true; }
  },
  async buy() {
    const p = this.plugin(); if (!p || this.busy) return;
    this.busy = true; this.msg = "Opening the store…"; this.redraw();
    try {
      const t = await p.purchaseProduct({ productIdentifier: UNLOCK_ID, productType: "inapp" });
      // The plugin has already checked Apple's signature, or acknowledged it with Google.
      if (t && t.productIdentifier === UNLOCK_ID && (t.purchaseState == null || t.purchaseState === "1")) { this.msg = ""; this.apply(true, false); }
      else await this.refresh();
    } catch (e) {
      const why = String(e && e.message || e);
      await this.refresh(); // "already owned" and cancelled purchases both land here on Android
      if (this.has()) this.msg = "";
      else if (/pending/i.test(why) || this.rec.pending) { this.rec = { ...this.rec, pending: true }; this.msg = ""; }
      else this.msg = /cancel/i.test(why) || /not purchased/i.test(why) ? "No payment was taken." : "The store couldn't finish the purchase. No payment was taken. Please try again.";
    } finally { this.busy = false; this.redraw(); }
  },
  async checkAgain() {
    if (this.busy) return;
    this.busy = true; this.msg = "Checking…"; this.redraw();
    await this.refresh();
    this.busy = false; this.msg = this.has() ? "" : "Not finished yet. Nikke Bol keeps checking each time it opens."; this.redraw();
  },
  async restore() {
    const p = this.plugin(); if (!p || this.busy) return;
    this.busy = true; this.msg = "Checking with the store…"; this.redraw();
    try { await p.restorePurchases(); } catch (e) {}
    await this.refresh();
    this.busy = false;
    this.msg = this.has() ? "" : `No purchase found for this ${this.platform() === "ios" ? "Apple ID" : "Google account"}. Check you're signed in with the one you used to buy it.`;
    this.redraw();
  },
  view: null, // the unlock page's render function, while it's open
  onPage() { return state.view === "page" && !!this.view && state.pageRender === this.view; },
  redraw() { if (this.onPage()) this.view($("pageBody")); else if ($("settings").open) renderUnlockRow(); },
};

/* ---- The unlock page, reached only through the grown-ups check ---- */
function openUnlock(then = goHome, back = goHome) {
  Unlock.msg = "";
  const render = body => {
    const U = Unlock, p = U.plugin(), store_ = U.platform() === "ios" ? "Apple" : "Google";
    if (U.has()) {
      body.innerHTML = `<div class="pw-hero"><div class="badge-big">🎉</div><h3>Everything is unlocked</h3>
          <p>Thank you for supporting Nikke Bol. Every learner on this ${p ? "phone" : "device"} can use the whole app.</p></div>
        <div class="row2"><button class="cta" id="pwGo">Carry on ›</button></div>`;
      $("pwGo").onclick = () => { pop(); then(); };
      return;
    }
    const price = U.product ? U.product.priceString : "";
    const inside = [
      `All ${PATH.filter(u => !u.level || atLeast(u.level)).length} units of the learning path`,
      "Every reading lesson, and the full ਬਾਰਾਂਖੜੀ sound chart",
      "Writing: trace all 35 letters of the ਪੈਂਤੀ",
      "Sentences, Listen & say it, and Review",
      ...(atLeast("adult") ? ["Tones, for grown-up learners"] : []),
      "More learners: brothers, sisters, cousins, you",
    ];
    body.innerHTML = `<div class="pw-hero"><div class="badge-big">🔓</div><h3>Unlock all of Nikke Bol</h3>
        <p>${p ? (price ? `One payment of <b>${esc(price)}</b>. ` : "One payment. ") + "Yours to keep, for every learner on this phone." : "The full app is on the App Store and Google Play."}</p></div>
      <ul class="ticks pw-list">${inside.map(t => `<li>${t}</li>`).join("")}</ul>
      <p class="hint">Free for everyone: all the word cards, the find-it game, the first ${FREE_UNITS} units, stickers and the calendar.</p>
      ${p ? `
        ${U.rec.pending ? `<p class="pw-note" role="status">Waiting for the payment to finish, or for a parent to approve it with Ask to Buy. Nikke Bol unlocks by itself when it's done.</p>` : ""}
        ${U.productErr && !U.product ? `<p class="pw-note" role="status">The store isn't available right now. Check the internet connection and try again.</p>` : ""}
        <div class="row2"><button class="cta" id="pwBuy" ${U.busy || !U.product && !U.productErr && !U.rec.pending ? "disabled" : ""}>${
          U.rec.pending ? "Check again" : U.product ? `Unlock everything · ${esc(price)}` : U.productErr ? "Try again" : "Loading…"}</button></div>
        <div class="row2"><button class="cta ghost" id="pwRestore" ${U.busy ? "disabled" : ""}>Restore purchase</button></div>
        <p class="pw-msg" role="status">${esc(U.msg)}</p>
        <p class="small pw-small">No subscription and no ads. ${store_} takes the payment; Nikke Bol never sees your card details and collects nothing.${U.product && U.product.isFamilyShareable ? " Shared with your family through Family Sharing." : ""} Bought it before? Restore it with the same ${U.platform() === "ios" ? "Apple ID" : "Google account"}.</p>`
      : `<p class="pw-note">Search <b>“Nikke Bol”</b> on the App Store or Google Play to get the full app.</p>`}`;
    if (!p) return;
    $("pwBuy").onclick = () => {
      pop();
      if (U.rec.pending) return U.checkAgain();
      if (U.product) return U.buy();
      U.productErr = false; U.redraw(); U.loadProduct().then(() => U.redraw());
    };
    $("pwRestore").onclick = () => { pop(); U.restore(); };
  };
  Unlock.productErr = false;
  Unlock.view = render;
  $("toast").hidden = true; // the "ask a grown-up" note has done its job
  openPage("ਪੂਰੀ ਐਪ", "The full app", render, back);
  if (Unlock.plugin() && !Unlock.product) Unlock.loadProduct().then(() => Unlock.redraw());
}

/* ---- In the grown-ups settings: status, unlock and restore ---- */
function renderUnlockRow() {
  const el = $("unlockRow"); if (!el) return;
  const U = Unlock;
  if (!U.plugin()) { el.innerHTML = U.has() ? "" : `<p class="small">The full app is on the App Store and Google Play.</p>`; return; }
  el.innerHTML = U.has()
    ? `<p class="small">✓ Full app unlocked on this phone. Thank you!</p>`
    : `<div class="famrow"><button class="pill go" id="sUnlock">🔓 Unlock everything</button><button class="pill" id="sRestore" ${U.busy ? "disabled" : ""}>Restore purchase</button></div>
       <p class="small">${esc(U.msg)}</p>`;
  if ($("sUnlock")) $("sUnlock").onclick = () => { $("settings").close(); openUnlock(); };
  if ($("sRestore")) $("sRestore").onclick = () => U.restore();
}

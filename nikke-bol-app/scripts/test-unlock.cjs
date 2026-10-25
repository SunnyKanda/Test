// Unlock flow against a fake App Store / Google Play: npm run test:unlock
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const URL_ = 'file://' + require('path').join(__dirname, '../../nikke-bol/index.html');
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); if (!ok) fails++; };

const fakeStore = () => {
  const S = window.__store = Object.assign({ platform: 'ios', owned: false, pendingTx: false, androidUnacked: false, purchase: 'ok', productFail: false, getFail: false, acks: [], restores: 0, listeners: {} }, JSON.parse(localStorage.getItem('__storecfg') || '{}'));
  const tx = () => S.platform === 'ios'
    ? { transactionId: '2000001', productIdentifier: 'nikkebol.unlock', purchaseDate: '2026-10-24T10:00:00Z', ownershipType: 'purchased' }
    : { transactionId: 'tok', productIdentifier: 'nikkebol.unlock', purchaseDate: '2026-10-24T10:00:00Z', purchaseState: S.pendingTx ? '2' : '1', purchaseToken: 'tok', isAcknowledged: !S.androidUnacked, orderId: 'GPA.1' };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => S.platform, Plugins: {
    LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }), cancel: async () => {}, schedule: async () => {}, addListener: () => {} },
    Haptics: { impact: () => {}, notification: () => {} },
    NativePurchases: {
      getPurchases: async () => { if (S.getFail) throw new Error('Billing service unavailable'); return { purchases: S.owned || S.pendingTx ? [tx()] : [] }; },
      getProduct: async () => { if (S.productFail) throw new Error('Product not found'); return { product: { identifier: 'nikkebol.unlock', title: 'Unlock everything', priceString: '£3.99', price: 3.99, currencyCode: 'GBP', isFamilyShareable: S.platform === 'ios' } }; },
      purchaseProduct: async () => {
        if (S.purchase === 'pending') { S.pendingTx = S.platform === 'android'; throw new Error(S.platform === 'ios' ? 'Transaction pending' : 'Purchase is pending'); }
        if (S.purchase === 'cancel') throw new Error(S.platform === 'ios' ? 'User cancelled' : 'Purchase is not purchased');
        if (S.purchase === 'owned') { S.owned = true; throw new Error('Purchase is not purchased'); }
        S.owned = true; return tx();
      },
      acknowledgePurchase: async ({ purchaseToken }) => { S.acks.push(purchaseToken); S.androidUnacked = false; },
      restorePurchases: async () => { S.restores++; },
      addListener: async (ev, fn) => { S.listeners[ev] = fn; return { remove() {} }; },
    } } };
};

const until = (p, fn) => p.waitForFunction(fn, null, { timeout: 4000 }).catch(() => {});
async function gate(p) {
  await p.waitForSelector('#gate[open]');
  const [a, c] = (await p.textContent('#gateQ')).match(/\d+/g).map(Number);
  await p.fill('#gateIn', String(a * c)); await p.click('#gateForm button[type=submit]'); await p.waitForTimeout(250);
}
async function newLearner(p, level = 'child') {
  await p.click('#wNext'); await p.fill('#wName', 'Simran'); await p.click('#wNext'); await p.click(`[data-l="${level}"]`); await p.click('#wNext'); await p.click('#wNext'); await p.waitForTimeout(400);
}

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.addInitScript(fakeStore);
  await p.goto(URL_); await p.waitForTimeout(500);
  await newLearner(p, 'adult');

  // --- Locked state ---
  const paid = await p.$$eval('.node.paid', n => n.length), total = await p.$$eval('.node', n => n.length);
  check('path: units after the first 7 carry a padlock', paid === total - 7, `${paid} of ${total}`);
  check('path: first 7 units are open', await p.$$eval('.node', n => n.slice(0, 7).every(x => !x.classList.contains('paid'))));
  await p.click('#tabs [data-t="practice"]'); await p.waitForTimeout(200);
  const locks = await p.$$eval('.tile .lock', n => n.length);
  check('practice: 6 tiles locked (adult level)', locks === 6, String(locks));
  await p.click('.tile[data-s="reading"]'); await p.waitForTimeout(200);
  const openLessons = await p.$$eval('.lesson:not(.paid)', n => n.map(x => x.textContent.trim().slice(0, 12)));
  check('reading: only the vowel letters and ਮੁਕਤਾ are free', openLessons.length === 2, openLessons.join(' | '));
  await p.click('.lesson:not(.paid) >> nth=1'); await p.waitForTimeout(200);
  check('reading: free lesson opens', (await p.textContent('#ptitle')).includes('ਮੁਕਤਾ'));
  await p.click('#pback'); await p.click('.lesson.paid >> nth=0'); await p.waitForTimeout(200);
  check('reading: locked lesson asks for a grown-up', await p.isVisible('#gate[open]'));
  await p.click('#gateCancel'); await p.click('#pback');

  // --- Product fails to load, then loads ---
  await p.evaluate(() => { window.__store.productFail = true; Unlock.product = null; });
  await p.click('.tile[data-s="write"]'); await gate(p); await until(p, () => $('pwBuy') && $('pwBuy').textContent.includes('Try again'));
  check('unlock page: store unavailable shows Try again', (await p.textContent('#pwBuy')).includes('Try again') && (await p.textContent('#pageBody')).includes("isn't available"));
  await p.evaluate(() => { window.__store.productFail = false; }); await p.click('#pwBuy'); await until(p, () => $('pwBuy') && $('pwBuy').textContent.includes('£'));
  check('unlock page: price comes from the store', (await p.textContent('#pwBuy')).includes('£3.99'), await p.textContent('#pwBuy'));
  check('unlock page: Family Sharing line on iOS', (await p.textContent('#pageBody')).includes('Family Sharing'));

  // --- Cancel ---
  await p.evaluate(() => { window.__store.purchase = 'cancel'; });
  await p.click('#pwBuy'); await until(p, () => !Unlock.busy && document.querySelector('.pw-msg').textContent);
  check('cancel: "No payment was taken", still locked', (await p.textContent('.pw-msg')).includes('No payment was taken') && !(await p.evaluate(() => Unlock.has())));

  // --- Ask to Buy (pending), then approval arrives through Transaction.updates ---
  await p.evaluate(() => { window.__store.purchase = 'pending'; });
  await p.click('#pwBuy'); await until(p, () => !Unlock.busy && $('pwBuy').textContent.includes('Check again'));
  check('ask to buy: waiting note shown', (await p.textContent('#pageBody')).includes('Ask to Buy') && (await p.textContent('#pwBuy')).includes('Check again'));
  await p.evaluate(() => { window.__store.owned = true; window.__store.listeners.transactionUpdated({ productIdentifier: 'nikkebol.unlock' }); });
  await until(p, () => $('pwGo'));
  check('ask to buy: approval unlocks by itself', await p.evaluate(() => Unlock.has()) && (await p.textContent('#pageBody')).includes('Everything is unlocked'));
  await p.click('#pwGo'); await p.waitForTimeout(300);
  check('carry on: opens what was tapped (Writing)', (await p.textContent('#ptitle')).includes('Writing'));
  await p.click('#pback');
  check('home: no padlocks once unlocked', (await p.$$eval('.tile .lock', n => n.length)) === 0);

  // --- Reopen: store still says owned ---
  await p.reload(); await until(p, () => Unlock.rec.checked > Date.now() - 5000 || window.__store.getFail);
  check('reopen: still unlocked', await p.evaluate(() => Unlock.has()) && (await p.$$eval('.node.paid', n => n.length)) === 0);

  // --- Offline at start: keep the last answer ---
  await p.evaluate(() => localStorage.setItem('__storecfg', JSON.stringify({ owned: false, getFail: true })));
  await p.reload(); await until(p, () => Unlock.rec.checked > Date.now() - 5000 || window.__store.getFail);
  check('offline: stays unlocked from the saved answer', await p.evaluate(() => Unlock.has()));

  // --- Refund: one "no" keeps it, "no" again 3+ days later relocks ---
  await p.evaluate(() => localStorage.setItem('__storecfg', JSON.stringify({ owned: false })));
  await p.reload(); await until(p, () => Unlock.rec.checked > Date.now() - 5000 || window.__store.getFail);
  check('refund/glitch: first "no" keeps the unlock', await p.evaluate(() => Unlock.has() && Unlock.rec.missSince > 0));
  await p.evaluate(async () => { Unlock.rec = { ...Unlock.rec, missSince: Date.now() - 4 * DAY }; await Unlock.refresh(); });
  check('refund: "no" again days later relocks', !(await p.evaluate(() => Unlock.has())));
  await p.evaluate(async () => { window.__store.owned = true; await Unlock.refresh(); });
  check('re-bought or store back: unlocks again, miss cleared', await p.evaluate(() => Unlock.has() && !Unlock.rec.missSince));
  await p.evaluate(() => localStorage.removeItem('__storecfg'));

  // --- Backups don't carry the unlock ---
  check('backup leaves the unlock out', await p.evaluate(() => !exportBackup.toString().includes('unlock')));

  // --- Restore on a new phone, nothing bought ---
  const ctx2 = await b.newContext({ viewport: { width: 400, height: 860 } }); const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errs.push('p2 pageerror: ' + e.message));
  await p2.addInitScript(fakeStore); await p2.goto(URL_); await p2.waitForTimeout(500); await newLearner(p2);
  await p2.click('#grownups'); await gate(p2); await p2.waitForTimeout(200);
  check('settings: unlock and restore buttons', await p2.isVisible('#sUnlock') && await p2.isVisible('#sRestore'));
  await p2.click('#sRestore'); await until(p2, () => $('unlockRow').textContent.includes('No purchase'));
  check('restore with nothing bought: clear message', (await p2.textContent('#unlockRow')).includes('No purchase found for this Apple ID'));
  await p2.evaluate(() => { window.__store.owned = true; }); await p2.click('#sRestore'); await until(p2, () => $('unlockRow').textContent.includes('Full app unlocked'));
  check('restore with a purchase: unlocked', (await p2.textContent('#unlockRow')).includes('Full app unlocked') && await p2.evaluate(() => window.__store.restores === 2));
  await p2.click('#sDone');

  // --- Add a learner: locked on a free phone ---
  const ctx3 = await b.newContext({ viewport: { width: 400, height: 860 } }); const p3 = await ctx3.newPage();
  p3.on('pageerror', e => errs.push('p3 pageerror: ' + e.message));
  await p3.addInitScript(() => localStorage.setItem('__storecfg', JSON.stringify({ platform: 'android' })));
  await p3.addInitScript(fakeStore); await p3.goto(URL_); await p3.waitForTimeout(500); await newLearner(p3);
  await p3.click('#who'); await p3.waitForTimeout(200);
  check('learners: second learner shows the padlock note', (await p3.textContent('#profAdd')).includes('full app'));
  await p3.click('#profAdd'); await until(p3, () => $('gate').open);
  check('learners: adding asks for a grown-up', await p3.isVisible('#gate[open]'));
  await gate(p3); await until(p3, () => $('pwBuy') && $('pwBuy').textContent.includes('£'));
  check('android: no Family Sharing line, Google named', !(await p3.textContent('#pageBody')).includes('Family Sharing') && (await p3.textContent('#pageBody')).includes('Google takes the payment'));
  // Android: already owned on this account (ITEM_ALREADY_OWNED comes back as a failure)
  await p3.evaluate(() => { window.__store.purchase = 'owned'; });
  await p3.click('#pwBuy'); await until(p3, () => $('pwGo'));
  check('android: "already owned" still unlocks', await p3.evaluate(() => Unlock.has()));
  await p3.click('#pwGo'); await p3.waitForTimeout(300);
  check('learners: carry on opens the add-learner screen', await p3.isVisible('#wName'));

  // --- Android: purchase found that was never acknowledged ---
  const ctx4 = await b.newContext(); const p4 = await ctx4.newPage();
  await p4.addInitScript(() => localStorage.setItem('__storecfg', JSON.stringify({ platform: 'android', owned: true, androidUnacked: true })));
  await p4.addInitScript(fakeStore); await p4.goto(URL_); await until(p4, () => Unlock.rec.checked > 0);
  check('android: unacknowledged purchase gets acknowledged at start', await p4.evaluate(() => window.__store.acks.join()) === 'tok' && await p4.evaluate(() => Unlock.has()));
  // Android pending (cash payment): not unlocked yet
  const ctx5 = await b.newContext(); const p5 = await ctx5.newPage();
  await p5.addInitScript(() => localStorage.setItem('__storecfg', JSON.stringify({ platform: 'android', pendingTx: true })));
  await p5.addInitScript(fakeStore); await p5.goto(URL_); await until(p5, () => Unlock.rec.checked > 0);
  check('android: pending payment stays locked and is remembered', await p5.evaluate(() => !Unlock.has() && Unlock.rec.pending));

  // --- Web: taster, and the full preview build ---
  const ctx6 = await b.newContext({ viewport: { width: 400, height: 860 } }); const p6 = await ctx6.newPage();
  p6.on('pageerror', e => errs.push('p6 pageerror: ' + e.message));
  await p6.goto(URL_); await p6.waitForTimeout(500); await newLearner(p6);
  check('web: taster has padlocks', (await p6.$$eval('.node.paid', n => n.length)) > 0);
  await p6.click('.node.paid button >> nth=0', { force: true }).catch(() => {});
  await p6.evaluate(() => startUnit(PATH[10])); await gate(p6); await p6.waitForTimeout(200);
  check('web: unlock page points to the stores, no buy button', (await p6.textContent('#pageBody')).includes('Search') && !(await p6.$('#pwBuy')));
  const ctx7 = await b.newContext(); const p7 = await ctx7.newPage();
  await p7.addInitScript(() => { window.NB_FULL_WEB = true; }); await p7.goto(URL_); await p7.waitForTimeout(400); await newLearner(p7);
  check('web full preview: no padlocks', (await p7.$$eval('.node.paid', n => n.length)) === 0);

  console.log(errs.join('\n') || 'no page errors'); console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await b.close();
  process.exitCode = fails ? 1 : 0;
})();

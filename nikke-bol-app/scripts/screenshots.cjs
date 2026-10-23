// Store screenshots: renders real app screens with a sample learner at each store's required size.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "../../nikke-bol/index.html");
const DEVICES = [
  { name: "iphone-6.7", width: 430, height: 932, scale: 3 },   // 1290 x 2796
  { name: "ipad-13", width: 1032, height: 1376, scale: 2 },     // 2064 x 2752
  { name: "android-phone", width: 360, height: 800, scale: 3 }, // 1080 x 2400
];
function seed() {
  const id = "pdemo", d = new Date(), key = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const log = {};
  for (let i = 0; i < 26; i++) { if (i === 9 || i === 17) continue; const x = new Date(d); x.setDate(d.getDate() - i); log[key(x)] = { secs: i === 0 ? 280 : 420 + (i % 4) * 120, n: 12 }; }
  const path = {}; ["hello", "family1", "colours1", "letters1", "numbers1", "animals1", "r-mukta"].forEach((u, i) => path[u] = i % 3 ? 3 : 2);
  localStorage.setItem("nikke-bol:profiles", JSON.stringify([{ id, name: "Simran", avatar: "🦚", created: 1 }]));
  localStorage.setItem("nikke-bol:current", JSON.stringify(id));
  localStorage.setItem(`nikke-bol:${id}:settings`, JSON.stringify({ level: "child", goal: 10, sfx: false }));
  localStorage.setItem(`nikke-bol:${id}:progress`, JSON.stringify({ items: {}, log, path }));
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  for (const dev of DEVICES) {
    const ctx = await b.newContext({ viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.scale, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    const shot = async n => { await p.waitForTimeout(600); await p.screenshot({ path: path.join(__dirname, "../store/screenshots", `${dev.name}-${n}.png`) }); };
    // 1 welcome (fresh install)
    await p.goto(url); await p.waitForTimeout(800); await shot("1-welcome");
    await p.evaluate(seed); await p.goto(url); await p.waitForTimeout(800);
    await shot("2-path");
    await p.evaluate(() => { state.tab = "words"; renderHome(); openLearn(0); state.i = 2; renderCard(); }); await shot("3-words");
    await p.evaluate(() => openLesson(MATRAS[1])); await shot("4-reading");
    await p.evaluate(() => { SB.noun = 7; SB.adj = 1; openSentences(); }); await shot("5-sentences");
    await p.evaluate(() => openCalendar()); await shot("6-calendar");
    await p.evaluate(() => { goHome(); openGame(); }); await shot("7-game");
    await ctx.close();
  }
  await b.close();
  console.log("done");
})();

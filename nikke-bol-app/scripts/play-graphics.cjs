// Google Play listing graphics: the 512×512 app icon and the 1024×500 feature graphic (outputs go in store/).
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const path = require("path"), fs = require("fs");
const fontDir = path.join(__dirname, "../../nikke-bol/fonts");
const face = (file, weight) => `@font-face{font-family:B;font-weight:${weight};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir, file)).toString("base64")})}`;
const css = face("baloo-paaji-2-gurmukhi-800-normal.woff2", 800) + face("baloo-paaji-2-latin-800-normal.woff2", 800) + face("baloo-paaji-2-latin-600-normal.woff2", 600) + "html,body{margin:0}";
const motif = `<path d="M256 56 L456 256 L256 456 L56 256 Z" fill="#ff3d8b"/>
  <path d="M256 96 L416 256 L256 416 L96 256 Z" fill="none" stroke="#ffb627" stroke-width="10" stroke-dasharray="18 14" stroke-linecap="round"/>
  <text x="256" y="322" text-anchor="middle" font-family="B" font-weight="800" font-size="230" fill="#fff4e8">ੳ</text>`;
const pattern = `<pattern id="p" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M28 6 L50 28 L28 50 L6 28 Z" fill="none" stroke="#ffb627" stroke-opacity=".18" stroke-width="2" stroke-dasharray="3 4"/><path d="M28 18 L38 28 L28 38 L18 28 Z" fill="none" stroke="#ff3d8b" stroke-opacity=".25" stroke-width="2"/></pattern>`;
const disc = (x, y, ch) => `<g transform="translate(${x} ${y})"><circle r="40" fill="#fff8ef"/><circle r="33" fill="none" stroke="#ffb627" stroke-width="3" stroke-dasharray="7 5"/>
  <text y="20" text-anchor="middle" font-family="B" font-weight="800" font-size="52" fill="#3a0d2e">${ch}</text></g>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#3a0d2e"/>${motif}</svg>`;
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500"><defs>${pattern}</defs>
  <rect width="1024" height="500" fill="#3a0d2e"/><rect width="1024" height="500" fill="url(#p)"/>
  <g transform="translate(70 95) scale(.6)">${motif}</g>
  <text x="430" y="200" font-family="B" font-weight="800" font-size="118" fill="#ffb627">ਨਿੱਕੇ ਬੋਲ</text>
  <text x="434" y="262" font-family="B" font-weight="600" font-size="44" fill="#fff4e8">Learn Punjabi together</text>
  ${["ੳ", "ਅ", "ੲ", "ਸ", "ਹ", "ਕ"].map((c, i) => disc(478 + i * 92, 360 + (i % 2 ? 14 : -6), c)).join("")}</svg>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const p = await b.newPage();
  const render = async (svg, w, h, file) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<style>${css}</style>${svg}`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, "../store", file), clip: { x: 0, y: 0, width: w, height: h } });
  };
  await render(icon, 512, 512, "play-icon-512.png");
  await render(feature, 1024, 500, "play-feature-graphic-1024x500.png");
  await b.close();
  console.log("rendered store/play-icon-512.png and store/play-feature-graphic-1024x500.png");
})();

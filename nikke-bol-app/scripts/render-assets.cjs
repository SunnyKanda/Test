// Render the app icon and splash screen PNGs from SVG with Chromium (run once; outputs go in resources/).
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const path = require("path"), fs = require("fs");
const font = fs.readFileSync(path.join(__dirname, "../../nikke-bol/fonts/baloo-paaji-2-gurmukhi-800-normal.woff2")).toString("base64");
const css = `@font-face{font-family:B;src:url(data:font/woff2;base64,${font})}html,body{margin:0;background:transparent}`;
const motif = (s, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
  ${bg ? `<rect width="512" height="512" fill="#3a0d2e"/>` : ""}
  <path d="M256 56 L456 256 L256 456 L56 256 Z" fill="#ff3d8b"/>
  <path d="M256 96 L416 256 L256 416 L96 256 Z" fill="none" stroke="#ffb627" stroke-width="10" stroke-dasharray="18 14" stroke-linecap="round"/>
  <text x="256" y="322" text-anchor="middle" font-family="B" font-size="230" fill="#fff4e8">ੳ</text></svg>`;
const pattern = `<pattern id="p" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M28 6 L50 28 L28 50 L6 28 Z" fill="none" stroke="#ffb627" stroke-opacity=".16" stroke-width="2" stroke-dasharray="3 4"/><path d="M28 18 L38 28 L28 38 L18 28 Z" fill="none" stroke="#ff3d8b" stroke-opacity=".22" stroke-width="2"/></pattern>`;
const splash = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><defs>${pattern}</defs>
  <rect width="${s}" height="${s}" fill="#3a0d2e"/><rect width="${s}" height="${s}" fill="url(#p)"/>
  <g transform="translate(${s / 2 - 300} ${s / 2 - 420}) scale(1.17)">${motif(512, false).replace(/<\/?svg[^>]*>/g, "")}</g>
  <text x="${s / 2}" y="${s / 2 + 330}" text-anchor="middle" font-family="B" font-size="190" fill="#ffb627">ਨਿੱਕੇ ਬੋਲ</text></svg>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const p = await b.newPage();
  const render = async (svg, size, file, transparent) => {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<style>${css}</style>${svg}`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, "../resources", file), omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  };
  await render(motif(1024, true), 1024, "icon-only.png");
  await render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><g transform="translate(205 205) scale(1.2)">${motif(512, false).replace(/<\/?svg[^>]*>/g, "")}</g></svg>`, 1024, "icon-foreground.png", true);
  await render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#3a0d2e"/></svg>`, 1024, "icon-background.png");
  await render(splash(2732), 2732, "splash.png");
  await render(splash(2732), 2732, "splash-dark.png");
  await b.close();
  console.log("rendered");
})();

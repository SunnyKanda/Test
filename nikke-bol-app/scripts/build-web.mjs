// Copy the web app into www/ for Capacitor. The service worker isn't needed inside the native app.
import { cpSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "..", "nikke-bol"), out = join(root, "www");
const skip = new Set(["sw.js", "build-artifact.py", "README.md"]);
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of readdirSync(src)) if (!skip.has(f)) cpSync(join(src, f), join(out, f), { recursive: true });
console.log("Copied web app to www/");

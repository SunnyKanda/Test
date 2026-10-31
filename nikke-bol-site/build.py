"""Build the Nikke Bol website: the landing page and the privacy policy, ready to upload.

Usage: python3 build.py              -> writes upload/ (index.html, privacy.html, icon.svg)
       python3 build.py --artifact X -> also writes the landing page without its document
                                        skeleton, for publishing as a Claude artifact

The landing page's letters and words use the app's own recordings, read from
../nikke-bol/audio.js, and its phone pictures come from the store screenshots.
Needs Node.js and Pillow.
"""
import base64, io, json, pathlib, shutil, subprocess, sys
from PIL import Image

here = pathlib.Path(__file__).parent
app = here.parent / "nikke-bol"
shots = here.parent / "nikke-bol-app" / "store" / "screenshots"
out = here / "upload"

LETTERS = ["ੳ", "ਅ", "ੲ", "ਸ", "ਹ", "ਕ", "ਗ", "ਚ", "ਤ", "ਪ", "ਬ", "ਮ"]
WORDS = ["ਲਾਲ", "ਨੀਲਾ", "ਪੀਲਾ", "ਹਰਾ", "ਕ", "ਕਾ", "ਕਿ", "ਕੀ", "ਕੁ", "ਕੂ", "ਕੇ", "ਕੈ", "ਕੋ", "ਕੌ",
         "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "ਪਰਿਵਾਰ", "ਰੰਗ", "ਪੈਂਤੀ", "ਇੱਕ ਤੋਂ ਪੰਜ", "ਜਾਨਵਰ", "ਮੁਕਤਾ",
         "ਇਹ ਨੀਲੀ ਗੱਡੀ ਹੈ", "ਬਾਰਾਂਖੜੀ", "ਸ਼ਾਬਾਸ਼"]

# Pull the letters (name, word, meaning, two clips) and the spoken words out of the app.
NODE = r"""
global.window = {}; require(process.argv[1] + "/audio.js");
const fs = require("fs"), T = window.NB_TEXT, A = window.NB_AUDIO;
const P = eval(fs.readFileSync(process.argv[1] + "/data.js", "utf8").match(/const PAINTI = (\[[\s\S]*?\n\]);/)[1]);
const want = JSON.parse(process.argv[2]), clip = w => { const s = A[T[w]]; if (!s) throw new Error("no recording for " + w); return s; };
const letters = want.letters.map(l => { const r = P.find(x => x[0] === l); return { l: r[0], name: r[1], nameTr: r[2], word: r[3], wordTr: r[4], en: r[5], e: r[6], a1: clip(r[1]), a2: clip(r[3]) }; });
const say = Object.fromEntries(want.words.map(w => [w, clip(w)]));
process.stdout.write(JSON.stringify({ letters, say }));
"""
data = json.loads(subprocess.run(["node", "-e", NODE, str(app), json.dumps({"letters": LETTERS, "words": WORDS})],
                                 check=True, capture_output=True, text=True).stdout)

def shot(name):
    im = Image.open(shots / name).convert("RGB")
    im = im.resize((460, round(im.height * 460 / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=78, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()

page = (here / "src" / "landing.html").read_text()
page = (page.replace("__LETTERS__", json.dumps(data["letters"], ensure_ascii=False, separators=(",", ":")))
            .replace("__SAY__", json.dumps(data["say"], ensure_ascii=False, separators=(",", ":")))
            .replace("__SHOT_PATH__", shot("iphone-6.7-2-path.png"))
            .replace("__SHOT_WORD__", shot("iphone-6.7-3-words.png")))
assert "__" + "SHOT" not in page and "__LETTERS__" not in page and "__SAY__" not in page

if "--artifact" in sys.argv:
    pathlib.Path(sys.argv[sys.argv.index("--artifact") + 1]).write_text(page)

# The website version: a full document, a favicon, sharing details and a link to the privacy policy.
head, body = page.split("</style>\n", 1)
site = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#3a0d2e">
<meta property="og:title" content="Nikke Bol: Learn Punjabi">
<meta property="og:description" content="A Punjabi learning app for babies, children and families. Over 700 words, letters and sentences, all spoken in Punjabi.">
<link rel="icon" href="icon.svg" type="image/svg+xml">
{head}
:root {{ padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }}
body {{ margin: 0; }}
img {{ max-width: 100%; }}
[hidden] {{ display: none !important; }}
</style>
</head>
<body>
{body.replace("<small>© 2026 Nikke Bol</small>", '<small>© 2026 Nikke Bol · <a href="privacy.html">Privacy policy</a></small>')}
</body>
</html>
"""
assert 'href="privacy.html"' in site
out.mkdir(exist_ok=True)
(out / "index.html").write_text(site)
shutil.copy(app / "privacy.html", out / "privacy.html")
shutil.copy(app / "icon.svg", out / "icon.svg")
print(f"wrote {out}/: index.html ({len(site):,} bytes), privacy.html, icon.svg")
if "[contact email]" in (out / "privacy.html").read_text():
    print("note: privacy.html still says [contact email]; put your address in ../nikke-bol/privacy.html and build again")

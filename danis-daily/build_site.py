"""Export CalmFax as a self-contained static site (e.g. for SiteGround).

Reads page.html (the artifact source, which is a page fragment) and writes site/:
  index.html             complete standalone document
  manifest.webmanifest   lets "Add to Home Screen" open it full-screen
  apple-touch-icon.png   180x180 home-screen icon (iPhone)
  icon-512.png           512x512 icon (Android)
  .htaccess              tells the server not to cache the page, so each morning's edition shows

Run: python3 build_site.py
"""
import json
import pathlib

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
SITE = HERE / "site"

RESET = """
  :root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
  body { margin: 0; }
  img { max-width: 100%; }
  [hidden] { display: none !important; }
"""


def build_html():
    src = (HERE / "page.html").read_text()
    head_end = src.index("</style>") + len("</style>")
    head, body = src[:head_end], src[head_end:]
    head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
    head = head.replace("<style>", "<style>" + RESET, 1)
    return (
        "<!doctype html>\n<html lang=\"en-GB\">\n<head>\n"
        "<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        "<meta name=\"robots\" content=\"noindex, nofollow\">\n"
        "<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n"
        "<meta name=\"mobile-web-app-capable\" content=\"yes\">\n"
        "<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\">\n"
        "<link rel=\"apple-touch-icon\" href=\"apple-touch-icon.png\">\n"
        "<link rel=\"manifest\" href=\"manifest.webmanifest\">\n"
        + head
        + "\n</head>\n<body>"
        + body
        + "</body>\n</html>\n"
    )


HTACCESS = """<Files "index.html">
  Header set Cache-Control "no-cache, must-revalidate"
</Files>
"""


def build_icon(size):
    """A neon crystal: a cyan-to-pink hexagon outline with a violet core, on night."""
    import math
    scale = 4  # draw large, then shrink, for smooth edges
    big = size * scale
    img = Image.new("RGB", (big, big), (7, 7, 15))
    d = ImageDraw.Draw(img)
    cx = cy = big / 2
    w = max(2, int(big * 0.03))
    for i, r in enumerate((big * 0.34, big * 0.22)):
        pts = [(cx + r * math.cos(math.radians(60 * k - 90)), cy + r * math.sin(math.radians(60 * k - 90))) for k in range(6)]
        for k in range(6):
            t = k / 6
            start, end = ((62, 240, 224), (255, 90, 168)) if i == 0 else ((157, 107, 255), (255, 90, 168))
            colour = tuple(int(start[c] + (end[c] - start[c]) * t) for c in range(3))
            d.line([pts[k], pts[(k + 1) % 6]], fill=colour, width=w)
            if i == 0:
                d.line([pts[k], (cx, cy)], fill=(60, 52, 110), width=max(1, w // 2))
    core = big * 0.09
    d.ellipse([cx - core, cy - core, cx + core, cy + core], fill=(157, 107, 255))
    return img.resize((size, size), Image.LANCZOS)


def main():
    SITE.mkdir(exist_ok=True)
    (SITE / "index.html").write_text(build_html())
    (SITE / ".htaccess").write_text(HTACCESS)
    (SITE / "manifest.webmanifest").write_text(json.dumps({
        "name": "CalmFax",
        "short_name": "CalmFax",
        "start_url": "./",
        "display": "standalone",
        "background_color": "#07070f",
        "theme_color": "#07070f",
        "icons": [
            {"src": "apple-touch-icon.png", "sizes": "180x180", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        ],
    }, indent=2) + "\n")
    build_icon(180).save(SITE / "apple-touch-icon.png")
    build_icon(512).save(SITE / "icon-512.png")
    print("Wrote", ", ".join(sorted(p.name for p in SITE.iterdir())))


if __name__ == "__main__":
    main()

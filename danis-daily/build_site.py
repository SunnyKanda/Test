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
        "<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"default\">\n"
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
    """A quiet horizon: a sage half-sun resting on a line, on mist."""
    scale = 4  # draw large, then shrink, for smooth edges
    big = size * scale
    img = Image.new("RGB", (big, big), (238, 242, 240))
    d = ImageDraw.Draw(img)
    sage = (79, 125, 104)
    w = max(2, int(big * 0.035))
    cx, base, r = big / 2, big * 0.62, big * 0.2
    d.arc([cx - r, base - r, cx + r, base + r], 180, 360, fill=sage, width=w)
    d.line([big * 0.16, base, big * 0.84, base], fill=sage, width=w)
    d.line([big * 0.3, base + big * 0.09, big * 0.7, base + big * 0.09], fill=(167, 190, 178), width=w)
    for x0, y0, x1, y1 in ((0.5, 0.22, 0.5, 0.3), (0.29, 0.31, 0.33, 0.35), (0.71, 0.31, 0.67, 0.35)):
        d.line([big * x0, big * y0, big * x1, big * y1], fill=sage, width=w)
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
        "background_color": "#eef2f0",
        "theme_color": "#eef2f0",
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

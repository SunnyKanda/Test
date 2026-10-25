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
        "<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black\">\n"
        "<link rel=\"apple-touch-icon\" href=\"apple-touch-icon.png\">\n"
        "<link rel=\"manifest\" href=\"manifest.webmanifest\">\n"
        + head
        + "\n</head>\n<body>"
        + body
        + "</body>\n</html>\n"
    )


# 5x7 mosaic glyphs, same as the page masthead
GLYPHS = (
    ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],  # C
    ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],  # F
)

HTACCESS = """<Files "index.html">
  Header set Cache-Control "no-cache, must-revalidate"
</Files>
"""


def build_icon(size):
    img = Image.new("RGB", (size, size), (0, 0, 0))
    d = ImageDraw.Draw(img)
    band = int(size * 0.62)
    top = (size - band) // 2
    d.rectangle([0, top, size, top + band], fill=(0, 0, 255))
    cols, rows = 11, 7  # "CF" with a one-cell gap
    cell_w = size * 0.8 / cols
    cell_h = band * 0.8 / rows
    x0 = (size - cell_w * cols) / 2
    y0 = top + (band - cell_h * rows) / 2
    gap = max(1, cell_w * 0.12)
    for glyph, offset in zip(GLYPHS, (0, 6)):
        for r, row in enumerate(glyph):
            for c, bit in enumerate(row):
                if bit == "1":
                    x = x0 + (offset + c) * cell_w
                    y = y0 + r * cell_h
                    d.rectangle([x + gap / 2, y + gap / 2, x + cell_w - gap / 2, y + cell_h - gap / 2], fill=(255, 255, 0))
    return img


def main():
    SITE.mkdir(exist_ok=True)
    (SITE / "index.html").write_text(build_html())
    (SITE / ".htaccess").write_text(HTACCESS)
    (SITE / "manifest.webmanifest").write_text(json.dumps({
        "name": "CalmFax",
        "short_name": "CalmFax",
        "start_url": "./",
        "display": "standalone",
        "background_color": "#000000",
        "theme_color": "#000000",
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

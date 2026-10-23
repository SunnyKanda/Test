"""Bundle Nikke Bol into one self-contained page for publishing as a Claude artifact.

Usage: python3 build-artifact.py OUT.html
Inlines style.css and every local script, and drops the document skeleton,
manifest and icon links (the artifact host supplies its own).
"""
import re, sys, pathlib

here = pathlib.Path(__file__).parent
html = (here / "index.html").read_text()
html = re.sub(r"<!doctype html>\n|<html[^>]*>\n|</?head>\n|</?body>\n|</html>\n", "", html)
html = re.sub(r'<meta charset[^>]*>\n|<meta name="viewport"[^>]*>\n|<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n', "", html)
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + (here / "style.css").read_text() + "</style>")
html = re.sub(r'<script src="([\w-]+\.js)"></script>', lambda m: "<script>\n" + (here / m.group(1)).read_text() + "</script>", html)
pathlib.Path(sys.argv[1]).write_text(html)
print(f"wrote {sys.argv[1]} ({len(html):,} bytes)")

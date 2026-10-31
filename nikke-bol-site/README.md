# Nikke Bol website

The landing page and privacy policy for Nikke Bol, ready to put on any web host.

| Path | |
|---|---|
| `upload/` | **The files to upload**: `index.html` (landing page), `privacy.html`, `icon.svg` |
| `src/landing.html` | The landing page source (the letters, words and pictures are filled in by the build) |
| `build.py` | Rebuilds `upload/` from the source, the app's recordings and the store screenshots |

After changing the page, the privacy policy (`../nikke-bol/privacy.html`) or the screenshots, run:

```sh
python3 build.py   # needs Node.js and Pillow
```

## Putting it on SiteGround

1. Zip the three files inside `upload/` (the files themselves, not the folder).
2. SiteGround → **Websites** → your site → **Site Tools** → **Site** → **File Manager**.
3. Open `public_html`. If the site is new, delete SiteGround's placeholder `default.html` (or `index.html`).
4. Click **File Upload**, choose the zip, then right-click it → **Extract**, and delete the zip.
5. **Security** → **HTTPS Enforce**: switch it on.

The page loads three.js from cdnjs and its fonts from Google Fonts, so it needs nothing else on the server. The privacy policy's address (`https://your-domain/privacy.html`) is the one to give the App Store and Google Play.

If the site already runs WordPress, upload into a subfolder instead (for example `public_html/app/`), or WordPress's home page and this page will compete.

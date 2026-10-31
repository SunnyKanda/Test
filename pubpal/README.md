# PubPal

Find pubs near you in Halifax, West Yorkshire. Share your location, type a postcode, or tap the map, then pick a distance and filter by what matters to you:

- **Facilities:** shows sports, pool table, dog friendly, outdoor seating, baby changing, accessible
- **Drinks:** cask ale, craft beer, lager, stout, cider, alcohol-free (just "do they have it", not a full menu)

Anyone can suggest an edit or add a missing pub. Suggestions go live only after you approve them on the admin page.

It's plain PHP with no build step, made for ordinary shared hosting such as SiteGround.

## Put it on SiteGround

1. **Upload:** in Site Tools, open **Site → File Manager** and go to `public_html`. To put the app at its own address, such as `yoursite.com/pubpal`, create a folder first and open that. Upload `pubpal-siteground.zip`, then right-click it and choose **Extract**. You can delete the zip afterwards.
2. **Use HTTPS:** check **Security → SSL Manager** shows a certificate for your domain. Phones only share their location with `https://` sites.
3. **Set the admin password straight away:** open `https://yoursite.com/pubpal/admin.html` and choose one. Until you do, anyone who finds that page could set it.
4. **Load the pubs:** on the same page, tap **Import Halifax pubs**. It takes up to a minute. If OpenStreetMap is busy, try again later; **Load demo pubs** gives you made-up ones to try the app with meanwhile.
5. **Open the app:** go to `https://yoursite.com/pubpal/`.

The site needs **PHP 8.1 or newer**. In Site Tools that's under **Devs → PHP Manager**.

### Database

By default PubPal keeps everything in a single SQLite file, `data/pubpal.sqlite`, which it creates itself. The `.htaccess` files stop anyone downloading it, or the `lib/` folder and `config.php`.

If the app says the database isn't working, SQLite may not be switched on for your hosting. In that case use MySQL instead:

1. In Site Tools, open **Site → MySQL** and create a database and a user with access to it.
2. In File Manager, edit `config.php` and fill in the database name, user and password.

PubPal creates its tables automatically on first use.

## Files

| Path                | What it is                                                         |
|---------------------|--------------------------------------------------------------------|
| `site/index.html`, `app.js`, `style.css` | The app: map, filters, pub pages, suggestion forms |
| `site/admin.html`   | Admin page: password, importing pubs, approving suggestions        |
| `site/api.php`      | The JSON API the pages talk to (`api.php?action=…`)                |
| `site/lib/db.php`   | Database tables, radius search, suggestions                         |
| `site/lib/osm.php`  | OpenStreetMap import and the demo pubs                              |
| `site/config.php`   | Optional MySQL settings                                             |
| `pubpal-siteground.zip` | The contents of `site/`, ready to upload                       |

Every facility and drink is **yes / no / unknown**. Unknown shows as "?" so missing data never looks like a "no". Filters only match pubs where the answer is a known yes.

**Maps:** the map uses free OpenStreetMap tiles, which need no API key. The Directions button opens Google Maps, also with no key. Postcode lookup uses the free postcodes.io service.

**Later:** the `claimed` column marks landlord-managed listings. It's the hook for the paid "landlord fills in their own page" tier.

## Developing

Run it locally with PHP's built-in server (it ignores `.htaccess`, which is fine for local use):

```bash
php -S localhost:8000 -t pubpal/site
```

Tests drive the API through that server, using a fake OpenStreetMap:

```bash
pip install pytest httpx
python -m pytest -q pubpal/tests                       # SQLite
PUBPAL_TEST_MYSQL=1 python -m pytest -q pubpal/tests   # SQLite and a local MySQL/MariaDB
```

Rebuild the upload zip after changing anything in `site/`:

```bash
cd pubpal/site && rm -f ../pubpal-siteground.zip && zip -rq ../pubpal-siteground.zip . -x 'data/*.sqlite'
```

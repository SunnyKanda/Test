# Handy Halifax

A one-page MVP website for a local Halifax odd-job / easy-DIY help service.
Quote-first: visitors see honest guide prices, fill in a structured form, and are
handed off to WhatsApp with a pre-filled message (with an optional backup copy
sent straight to you).

## Files

| File | Purpose |
|------|---------|
| `index.html` | The single-page site |
| `styles.css` | All styling (shared with the legal pages) |
| `script.js` | Quote form, WhatsApp handoff, lead backup, mobile nav |
| `privacy.html` / `terms.html` | Starting legal pages, linked in the footer |
| `robots.txt` / `sitemap.xml` | Search-engine basics |
| `site.webmanifest` | Browser/PWA metadata |

To preview locally, open `index.html` in a browser, or run
`python3 -m http.server` in this folder and visit the printed address.

## Replace before launch

These are placeholders. Search every file and swap them out:

- **Phone number** — `07563 123456` and `447563123456`
  (in `index.html`, `script.js`, `privacy.html`, `terms.html`).
- **Domain** — `handyhalifax.co.uk` is a placeholder used in the canonical URL,
  Open Graph tags, `sitemap.xml` and `robots.txt`. Replace with your real domain.
- **Your name** — `[Add your name here]` in the About section of `index.html`.
- **Hero image** — the hero currently uses a styled placeholder panel. For a real
  local service, a genuine photo converts better. Replace the `.hero-visual` block
  in `index.html` with `<img src="hero.jpg" alt="Handy Halifax fitting a shelf in a
  Halifax home" />`.
- **About photo** — replace the `.about-avatar` block with a real, friendly photo
  of you: `<img src="about.jpg" alt="[Your name], Handy Halifax" />`.
- **`og-image.jpg`** — add a 1200x630 share image, or remove the `og:image` tag.

## Lead backup (recommended — ~10 minutes)

WhatsApp-only handoff is leaky: if WhatsApp fails to open (some iOS cases, desktop
users without WhatsApp), the lead is lost. The form can also POST every enquiry —
and any uploaded photos — straight to you.

1. Create a free form at <https://formspree.io>.
2. Copy its endpoint (looks like `https://formspree.io/f/abcdwxyz`).
3. Paste it into `FORMSPREE_ENDPOINT` at the top of `script.js`.

Until that's set, the site still works fully — it just skips the backup copy.
Netlify Forms is a good alternative if you host on Netlify.

## Honesty — claims deliberately left OUT

This site does **not** claim "DBS Checked", "Fully Insured", star ratings, a
Trustpilot widget or any customer testimonials, because none of those are true yet.
Adding them when untrue is both misleading and an SEO risk (fake review schema is a
serious Google penalty). Add them only once they are genuinely true:

- **Insurance** — once you hold a real tradesman public liability policy, you can
  add an honest "Public liability insured" line to the hero trust cards.
- **Reviews** — when you have genuine reviews, add a reviews section and only then
  consider `aggregateRating` schema, using real numbers.

## SEO — the priorities, in order

On-page work is already done in this build (local keywords, HX1–HX7, location-led
headings, `HomeAndConstructionBusiness` + `FAQPage` JSON-LD, meta tags, sitemap).
For a local service that's roughly 20% of the game. The bigger wins:

1. **Google Business Profile** — set one up. Real or service-area address, phone,
   hours, photos, regular posts, and especially reviews. Aim for 10–20 genuine
   Google reviews in the first few months — this outranks almost any on-page work.
2. **Postcodes & areas** — already woven into the copy (HX1–HX7 and the named
   towns). Keep using these terms as you add content.
3. **Per-service pages (later)** — split into dedicated pages like
   `/flat-pack-assembly-halifax/` and `/tv-wall-mounting-halifax/`; each can rank
   for its own long-tail searches.
4. **A simple blog (later)** — posts like "What does flat-pack assembly cost in
   Halifax?" pull in long-tail traffic and convert well.

## Also worth checking

- Search "Handy Halifax" on Companies House and run a trademark check before
  printing branding — "Handy [town]" is a common pattern.
- Keep the quote-first WhatsApp flow. No checkout or fixed online payment at this
  stage — job scope varies too much.

# ਨਿੱਕੇ ਬੋਲ · Nikke Bol

First Punjabi words for babies and toddlers. One HTML file plus a bundled audio file, no build step, no tracking, works offline.

## What's inside

| Section | Punjabi | Words |
|---|---|---|
| Colours | ਰੰਗ | 12 colours. The whole card turns that colour |
| Numbers | ਗਿਣਤੀ | 1–20 in Gurmukhi numerals (੧ ੨ ੩…), with things to count |
| Days | ਦਿਨ | Monday–Sunday. Opens on today |
| Months | ਮਹੀਨੇ | January–December **and** the desi months (ਚੇਤ, ਵਿਸਾਖ… with Vaisakhi, Lohri, Maghi) |
| Fruit & veg | ਫਲ ਤੇ ਸਬਜ਼ੀਆਂ | 12 fruit + 12 veg |
| Alphabet | ਪੈਂਤੀ | All 35 letters, ੳ to ੜ, each with a first word (ੳ ਉੱਲੂ, ਕ ਕਬੂਤਰ…) |
| Game | ਖੇਡ | "ਲਾਲ ਕਿੱਥੇ ਹੈ?" (where is red?). Tap the right one for stars and "ਸ਼ਾਬਾਸ਼!" |

- **Tap** a card to hear it (with sparkles). **Swipe** or use the arrows to move. **▶** plays through every card on its own.
- **Today card** on the home screen says what day it is in Punjabi, plus the English and desi month.
- **Hold for grown-ups** (press for about a second so babies can't open it): show or hide English and roman spelling, speaking speed, voice, sounds.
- **Record my own voice**: switch it on in grown-ups settings and Nani, Dadi or you can record each word. Recordings play instead of the computer voice and stay on the device.

## Voices

Every word has a Punjabi voice **recorded into the app** (`audio.js`, about 170 short clips), so it sounds the same on every phone and tablet, needs no setup, and works offline. The clips were made with an ElevenLabs voice and checked with Whisper speech recognition.

What plays when a card is tapped, in order:

1. A **family recording**, if a grown-up recorded one for that word ("Record my own voice" in settings).
2. The **built-in recording**.
3. The device's own text-to-speech, only if a clip is ever missing (Punjabi voice, then Hindi via Gurmukhi→Devanagari, then roman spelling).

To regenerate the clips, keep the clip names (`colours-0-0`, `painti-n-5`, `today-3`…). They follow the category, set and position of each word in `index.html`.

## Running it

Open `index.html` in a browser. To install it on a phone home screen (and use it offline), serve the folder over HTTPS, e.g. GitHub Pages, Netlify, or locally:

```sh
cd nikke-bol && python3 -m http.server 8000
```

Then "Add to Home Screen" from the browser menu.

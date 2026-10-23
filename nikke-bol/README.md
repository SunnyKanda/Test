# ਨਿੱਕੇ ਬੋਲ · Nikke Bol

First Punjabi words for babies and toddlers. One HTML file, no build step, no tracking, works offline.

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

The app uses the device's built-in text-to-speech:

1. A **Punjabi voice** (pa-IN) if the device has one.
2. Otherwise a **Hindi voice**: the Gurmukhi is converted letter-for-letter into Devanagari (the two scripts share a Unicode layout, and addak ੱ becomes a doubled consonant), so it sounds close.
3. Otherwise the roman spelling is read in English.

On Android, install "Speech Services by Google" and add Punjabi for the best result. iPhones have a Hindi voice built in. Recording your own voice beats all of them.

## Running it

Open `index.html` in a browser. To install it on a phone home screen (and use it offline), serve the folder over HTTPS, e.g. GitHub Pages, Netlify, or locally:

```sh
cd nikke-bol && python3 -m http.server 8000
```

Then "Add to Home Screen" from the browser menu.

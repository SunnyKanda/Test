# ਨਿੱਕੇ ਬੋਲ · Nikke Bol

Learn Punjabi, from a baby's first words to reading, writing and simple sentences. Every word has a Punjabi voice built in. No build step, no tracking, works offline once installed.

## Learners, path, streaks

- **Learners:** on first launch, a short welcome asks for the learner's name, a picture, a level and a daily goal. Add brothers, sisters or a grown-up from the name chip at the top; each learner has their own progress, path, streak and settings. Family recordings are shared.
- **Learning path** (child and grown-up levels): 38 short units in order, mixing words, reading lessons and sentences (plus tones for grown-ups). Each unit teaches its cards, then quizzes them; first-try answers earn up to three stars and unlock the next unit.
- **Daily goal and streak:** time counts while someone is using the app. The ring at the top fills towards the goal; the streak counts practised days, with one free rest day a week.
- **Daily reminders** (phone app): a notification at a time you choose, only on days nobody has met their goal yet, with a word of the day. Set it up on the welcome screen or in the grown-ups area.
- **Stickers:** 22 stickers for milestones (first word, streaks, all 35 letters, three stars, tracing, recording…), celebrated when earned and collected in a sticker book.
- **Word of the day:** on the home screen, and in each day's reminder; tapping the reminder opens it.
- **Weekly summary** (phone app): a Sunday-evening notification with each learner's minutes and words.
- **Rating card** (phone app): after a 3-day streak or a three-star unit, grown-ups are asked (behind the grown-ups check) whether they'd rate the app. At most three times, months apart.
- **Haptics:** a light buzz on taps and right or wrong answers in the phone app (switch off with "Happy sounds").
- **Calendar:** a stitch for each day practised and a gold diamond when the goal was met, plus minutes per day for the last week.
- **Grown-ups area:** behind a multiplication question. Learners, level, goal, sounds, family voices, backup and restore, privacy policy.

## Levels

Pick a level when adding a learner (or later in grown-ups settings):

| Level | What it shows |
|---|---|
| ਨਿੱਕੇ · Baby | Word cards and the find-it game |
| ਬੱਚੇ · Child | Adds reading, writing, sentences, listen & say it, review and progress |
| ਵੱਡੇ · Grown-up learner | Adds tones, grammar notes (gender, tone hints) on cards, and harder quizzes with four options |

## What's inside

**Words** (tap to hear, swipe for the next one, ▶ plays them all)

| Section | Punjabi | |
|---|---|---|
| Colours | ਰੰਗ | 12 |
| Numbers | ਗਿਣਤੀ | 1–20 with Gurmukhi numerals |
| Days | ਦਿਨ | Opens on today |
| Months | ਮਹੀਨੇ | January–December and the desi months |
| Fruit & veg | ਫਲ ਤੇ ਸਬਜ਼ੀਆਂ | 24 |
| Alphabet | ਪੈਂਤੀ | All 35 letters with a first word |
| Family | ਪਰਿਵਾਰ | Mum's side and dad's side: ਨਾਨੀ, ਦਾਦੀ, ਮਾਸੀ, ਭੂਆ, ਚਾਚਾ, ਤਾਇਆ… |
| Body | ਸਰੀਰ | 13 |
| Animals | ਜਾਨਵਰ | Home & farm, wild |
| Food & drink | ਖਾਣਾ-ਪੀਣਾ | ਰੋਟੀ, ਦਾਲ, ਲੱਸੀ… |
| Saying things | ਗੱਲਾਂ | Hello, thank you, I'm hungry… (child level) |
| Every day | ਰੋਜ਼ ਦੇ ਕੰਮ | Eat, wash your hands, go to sleep… (child level) |

**Read, write, speak**

- **ਪੜ੍ਹਨਾ Reading**: the vowel letters, then one lesson per vowel sign (ਲਗਾਂ ਮਾਤਰਾਂ: ਮੁਕਤਾ to ਕਨੌੜਾ) and ਬਿੰਦੀ, ਟਿੱਪੀ, ਅੱਧਕ. Each lesson has a tap-to-hear syllable grid, example words, and a "read it, then check" practice.
- **ਬਾਰਾਂਖੜੀ Sound chart**: every consonant with every vowel sign, 290 recorded syllables.
- **ਲਿਖਣਾ Writing**: trace any of the 35 letters with a finger; the app checks how much of the letter you covered.
- **ਵਾਕ Sentences**: build "ਇਹ ਨੀਲੀ ਗੱਡੀ ਹੈ" from a thing and a describing word, and see why ਨੀਲਾ becomes ਨੀਲੀ for feminine words. Includes a "which is right?" quiz.
- **ਸੁਣੋ ਤੇ ਬੋਲੋ Listen & say it**: hear a word, record yourself, compare the two (with waveforms).
- **ਸੁਰ Tones** (grown-up level): minimal pairs like ਕੋੜਾ / ਘੋੜਾ, and a "which did you hear?" quiz.
- **ਦੁਹਰਾਈ Review**: spaced repetition. Ten questions per round; words you get wrong come back sooner.
- **ਮੇਰੀ ਤਰੱਕੀ Progress**: words met and learned, per section and per reading lesson, and a day streak.

**For grown-ups** (🔒 button, answer the sum): learners, level, daily goal, English and roman spelling, speaking speed, sounds, "Record my own voice", family voice packs, backup and restore, and clearing progress.

## Family voices

- Switch on **Record my own voice**. Each word card gets a record button and a "use a voice note" option. Family recordings play instead of the built-in voice.
- **Save a voice pack** puts every recording into one `.json` file. Send it to family; they **Add a voice pack** on their phone.
- In the shared Claude page, recordings added by the owner or editors go to a family store, so everyone with the link hears them.

## Voices and audio

`audio.js` holds about 730 short MP3 clips (every word, letter name, syllable, sentence and app phrase), keyed by their Gurmukhi text in `NB_TEXT`. They were made with an ElevenLabs voice through Higgsfield. The device's text-to-speech is only used if a clip is missing.

Computer voices are good but not perfect, especially for tones and single syllables. A native speaker should listen through, and family recordings can replace any word.

## Files

| File | |
|---|---|
| `index.html` | Page markup |
| `style.css` | All styles |
| `data.js` | Every word, lesson, sentence and tone pair |
| `audio.js` | Built-in recordings |
| `core.js` | Learners and their storage, sound, family voices, progress (spaced repetition), time and streaks, sparkles, screens |
| `words.js` | Home (tabs), word cards, find-it game |
| `study.js` | Reading, chart, writing, sentences, speaking, tones, review, progress, settings |
| `profiles.js` | Welcome, learner switching and editing, grown-ups gate, backup and restore |
| `path.js` | Learning path, unit runner, daily goal ring, calendar |
| `reminders.js` | Daily reminder notifications in the phone app |
| `extras.js` | Stickers, word of the day, rating card |
| `app.js` | Start-up |
| `fonts/` | Baloo Paaji 2 (SIL Open Font License), bundled so it works offline |
| `privacy.html` | Privacy policy for the app stores |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Install to home screen and offline use |
| `build-artifact.py` | Bundles everything into one page for sharing as a Claude artifact |

## Phone apps

`../nikke-bol-app` wraps this folder as iOS and Android apps with Capacitor, with icons, splash screens, store screenshots and listing text. See its README.

## Running it

Open `index.html` in a browser. To install it on a phone and use it offline, serve the folder over HTTPS (GitHub Pages, Netlify) or locally:

```sh
cd nikke-bol && python3 -m http.server 8000
```

Then "Add to Home Screen". Recording needs the microphone, which works on HTTPS or localhost.

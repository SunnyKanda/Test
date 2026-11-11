# Crew

A private website where four AI teammates (Claude, GPT, Gemini and Grok) share
one group chat with you, plus your to-do list, planner, goals and job hunt.
It runs on ordinary PHP web hosting such as SiteGround, and installs on an
Android phone from the browser.

- **Crew** is the chat. Write to everyone, or start with `@claude`, `@gpt`,
  `@gemini` or `@grok` to ask one of them. They can add to-dos, remember facts
  about you, save drafts to your papers and send scouts.
- **Scouts** are the crew's helpers. A scout searches the live internet and
  brings back a short report with links. Real job adverts it finds go straight
  into your job tracker. Regular scouts can go out every day or every week.
- **Plan** shows your day, week and month, with an energy setting and a
  15-minute focus timer.
- **To-do** is every open item in one list.
- **Goals** breaks big aims into small steps and counts what you finish.
- **Jobs** tracks every job from first sighting to offer, and keeps your CV and
  cover letters under Papers.

The crew also checks in on a schedule: a morning plan, an afternoon nudge if
nothing is ticked off, an evening wrap-up and a Sunday review.

The other folders in this repository (`nikke-bol*`) are a separate project.

## Put it on SiteGround

You need `crew-site.zip` (build it with `./build-zip.sh`, which needs PHP and
Composer). Menu names below may differ slightly in your control panel.

1. In Site Tools open **Site > File Manager** and go into `public_html`.
2. Upload `crew-site.zip`, then right-click it and choose **Extract**. Delete
   the zip afterwards. You can rename the `crew-site` folder to anything.
3. Visit `https://your-domain/crew-site/`. Choose a password on the first
   screen. Do this straight away: whoever sets the password owns the site.
4. Open Settings (the cog), paste an API key for at least one crew member,
   and press **Test** and **Test web search**. Add your town so scouts search
   nearby.
5. Still in Settings, copy the command under "Keeping the crew working when
   the app is closed". In Site Tools open **Devs > Cron Jobs** and add it to
   run every 30 minutes, or as often as the panel allows.

The site needs PHP 8.1 or newer (**Devs > PHP Manager**) with the `pdo_sqlite`,
`curl` and `sodium` extensions, which are normally on. If one is missing the
site says so in plain words.

Without step 5 everything still works, but check-ins and regular scouts only
happen while you have the app open.

## Install it on an Android phone

Open the site in Chrome, sign in, then open the Chrome menu and choose
**Add to Home screen** (or **Install app**). It gets its own icon and opens
full screen like any other app.

## API keys and cost

| Crew member | Where to get a key |
| --- | --- |
| Claude | https://console.anthropic.com |
| GPT | https://platform.openai.com |
| Gemini | https://aistudio.google.com |
| Grok | https://console.x.ai |

API use is billed by each company, separately from any chat subscription.
Web searches by scouts are charged on top of normal usage. Set a monthly
spending limit on each account. In the app, "Keeping costs down" limits
replies per crew member per day and can restrict each message to one reply.
Regular scouts start switched off for the same reason.

Claude's default model is the most capable and the most expensive Claude
option; pick a Haiku model in the Model menu to spend far less. For GPT,
Gemini and Grok the app picks a model from the list your key can use.

## Where your data lives

Everything is stored in one database file in a `crew-data` folder that the
site creates beside `public_html`, outside the part of the server the public
can reach. If the host forbids that, it falls back to a locked `data` folder
inside the app. API keys are stored encrypted and never sent back to the
browser. To update the site later, upload and extract a newer zip over the
old folder; your data is not touched.

What you write, plus your to-dos, goals, job list, papers and saved notes, is
sent to the companies behind the crew members you have switched on so they
can answer. Scouts read live web pages and can misread them, so open the link
and check before relying on a report. Never pay to apply for a job.

## Run it on your own computer

```
cd crew-site && composer install && php -S localhost:8000
```

Add `CREW_MOCK=1` in front of `php` to try it with fake replies and no keys.

## Tests

```
php tests/run.php
```

The tests use fake replies and a fake network, so they need no keys and cost
nothing.

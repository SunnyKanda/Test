# Crew

A private group chat with four AI teammates (Claude, GPT, Gemini and Grok) who
share one view of your to-do list, planner, goals and job hunt.

- **Crew** is the chat. Write to everyone, or start with `@claude`, `@gpt`,
  `@gemini` or `@grok` to ask one of them. They can add to-dos for you and
  remember facts about you.
- **Plan** shows your day, week and month.
- **To-do** is every open item in one list.
- **Goals** breaks big aims into small steps and counts what you finish.
- **Jobs** tracks every job from first sighting to offer.

The crew also checks in on a schedule: a morning plan, an afternoon nudge if
nothing is ticked off, an evening wrap-up and a Sunday review.

The other folders in this repository (`nikke-bol*`) are a separate project.

## Run it on your computer

You need Python 3.11 or newer.

```
pip install -r requirements.txt
python app.py
```

Open http://localhost:8000. The planner, to-do list, goals and job tracker
work straight away. The chat needs at least one API key.

## Add API keys

Open Settings (the cog, top right) and paste a key for each crew member you
want. One is enough to start.

| Crew member | Where to get a key |
| --- | --- |
| Claude | https://console.anthropic.com |
| GPT | https://platform.openai.com |
| Gemini | https://aistudio.google.com |
| Grok | https://console.x.ai |

Press **Test** next to each one. If a test fails, the message says why (wrong
key, no credit, model not found). For GPT, Gemini and Grok the app picks a
model from the list your key can use; change it in the Model menu if you like.

API use is billed by each company, separately from any chat subscription. Set
a monthly spending limit on each account. Inside the app, "Keeping costs down"
in Settings limits replies per day and can restrict each message to one reply.
Claude's default model is the most capable and the most expensive of the
Claude options; pick a Haiku model in the Model menu to spend far less.

## Keep it running while you're away

Check-ins only happen while the app is running. On your own computer that
means while `python app.py` is open. To have it running all the time, and to
use it from your phone, put it on a host:

1. Create a free Postgres database (for example at https://neon.tech) and
   copy its connection address.
2. Deploy this repository as a Docker web service (for example at
   https://render.com, which reads `render.yaml`). Set two environment
   variables: `APP_PASSWORD` (a long password of your choosing) and
   `DATABASE_URL` (the address from step 1).
3. Free hosts go to sleep when nobody is using them. Point a free pinger (for
   example https://cron-job.org) at `https://YOUR-APP-ADDRESS/api/cron/tick`
   every 10 minutes. That wakes the app and sends any check-in that is due.

Check each service's current prices before relying on its free plan. A paid
host with a permanent disk also works; then you can skip `DATABASE_URL` and
set `DATA_DIR` to the disk's folder.

On your phone, open the app's address in the browser and choose "Add to Home
Screen" to get an app icon.

The app refuses outside connections until `APP_PASSWORD` is set.

## Privacy

Everything you write in the chat, plus your to-dos, goals, job list and saved
notes, is sent to the companies behind the crew members you have switched on
so they can answer. API keys entered in Settings are stored encrypted and are
never sent back to the browser. The crew has no internet access, so check
facts they give you.

## Tests

```
python -m unittest discover tests
```

The tests use built-in fake replies, so they need no keys and cost nothing.

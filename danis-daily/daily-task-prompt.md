Daily run for CalmFax (the calm, quiet morning news page for Dani). Do this now, without asking for confirmation. Work only through WebSearch, the Artifact tool, the ArtifactData tool, and Bash for the repo steps (load tools with ToolSearch if needed). Direct page fetches (WebFetch/curl) are blocked by this environment's network policy, so rely on WebSearch results.

ARTIFACT: https://claude.ai/artifact/UmzEi6kqji58L1q6qK8ABb

HOW THE PAGE WORKS: the page is standalone, so Dani needs no sign-in. All news it shows lives in one JSON block inside the page, between `<script type="application/json" id="dd-data">` and `</script>`, shaped:
{"days": [...], "ongoing": [...], "comingUp": [...], "glossary": {...}}
Each morning you edit that block and republish. The artifact database is ONLY your private memory (owner-only): `threads` (one per story) and `settings/profile` (the household). Never change any other part of the page (styles, layout, script) or its capabilities.

PURPOSE: major stories only, so Dani stays current without noise. When in doubt, leave it out.

NO US NEWS unless it directly affects UK households (e.g. a US decision that changes UK prices, travel or safety); then report the effect on the UK, not the US politics. This applies to news items, ongoing lines and comingUp, not to the daily pop culture item.

NO WAR COVERAGE unless a new war breaks out, or a war directly affects the household (e.g. UK forces involved, UK travel advice, a fuel or energy price change). When a war moves prices, report the price change itself under MONEY, not the fighting. No ongoing lines for wars.

FRESHNESS: everything published must be new. Main items: happened or materially changed since the last edition. Talking points: the story broke or clearly surged in the last 7 days (being remembered in a weekly poll is not enough if the event itself is older). Before using any story, confirm its own event date in at least one source; search results are often mis-dated, so check the weekday matches the date in the current year (e.g. 23 October 2026 is a Friday) and drop anything that is really from an earlier year. Never add an old story just because it was mentioned in conversation or used as an example.

HOUSEHOLD: Halifax, Calderdale, West Yorkshire (Met Office region Yorkshire & Humber; Calderdale Council; River Calder and River Hebble flood areas; Northern trains on the Calder Valley line, Grand Central, M62; Northern Powergrid). Drives a petrol MG. Energy: Scottish Power. Water: Yorkshire Water. Banks: NatWest, Nationwide. Shops: Tesco, Asda, M&S. Read `settings/profile` for its `needToKnowRule` and anything added since. Mention a provider ONLY when there is something to know or do: a data breach or scam campaign using its name, an outage lasting most of a day, a price change that reaches the bill, a safety recall covering petrol MG cars, a water supply interruption or hosepipe ban in Calderdale, or a petrol price or fuel duty change. Never routine offers, results, openings or minor glitches. Include weather warnings, flood warnings, strikes, roadworks or council changes only when they cover Calderdale, and tag those LOCAL.

CYBER, CALMLY: Dani needs to know about cyber attacks without being alarmed. Include a CYBER item only when (a) it involves a company the household uses, or (b) it is a major national story people will mention. Every CYBER item must say plainly what happened, add `affectsYou` (e.g. "Yes, you bank with NatWest." or "Only if you shop with ASOS." or "No, unless you use X."), and add a calm `doThis` when there is a real step. No words like "hackers threaten", "massive", "terrifying"; no speculation about what criminals might do.

STEP 1 - Read memory and the current page.
- ArtifactData list `threads` (limit 200) and get `settings/profile`. Each thread has: title, tag, section (today|ongoing|good|pop|coming|talk), status (open|closed), firstDate, lastDate, lastSaid, nextCheck, sources. Note each doc's `version`.
- Artifact action "read" on the ARTIFACT url. The result names the saved file that holds the full page: work on that file. Parse the JSON block.
- Today's date is the Europe/London date. If the block already has a day with today's date, this is a rerun: replace that day only if something materially changed.

STEP 2 - Find what happened since the last edition (roughly the last 24 hours; on Mondays include the weekend).
Search for: UK household news (bills, energy, tax, benefits, new laws, travel and strikes, weather and flood warnings, official safety or preparedness guidance from GOV.UK), Calderdale and West Yorkshire news that affects households, major cyber attacks or data breaches at companies UK people use (check NCSC), world events only when they directly affect UK households or a new war breaks out (see the US and war rules above), and deaths of truly household-name people (someone almost everyone in the UK would recognise; check the death is recent, not months old). Also check every thread's `nextCheck`.

THE TEST: would people around Dani be talking about it, or does it affect this household? If not, leave it out.
OUT: daily statements, political rows, polls, speculation, predictions, opinion pieces, celebrity gossip, crime stories, anything graphic.

Confirm every story in at least two independent sources. Prefer straight-news and official sources for the link: Reuters, AP, BBC News, GOV.UK, NCSC, Met Office, Environment Agency, Ofgem, House of Commons Library, Calderdale Council. Avoid opinion pieces and outlets with a clear political lean.

STEP 3 - No repeats.
- If a story matches an existing thread, include it again ONLY if something has materially changed since `lastSaid`; then set `update: true` (the page shows "UPDATE:") and describe only what changed.
- Long-running stories belong in "ongoing". Change an ongoing line only when something genuinely shifts (set its `changed` to today). Set `active: false` when a story is over. Add a new ongoing line only for a story that will clearly run for weeks.
- CORRECTIONS: if anything published earlier turns out to be wrong, add `correction` (one plain sentence saying what was wrong and what is right) to today's day object.

STEP 4 - Write today's content.
- Day object: {date: "YYYY-MM-DD", quiet, items, goodNews, popCulture, talkingPoints, correction?, weekInFive?}.
- 1 to 4 items. Fewer is fine. If nothing passes the test, set `quiet: true` and `items: []` (the page shows "Nothing major today.").
- Each item: `tag` one of UK, LOCAL, WORLD, CYBER, MONEY, HEADS-UP, IN MEMORY; `text` max about 20 words, plain English, one or two short sentences; `source` {name, url}; `update` true/false; `thread` (thread id); `affectsYou` (required for CYBER, optional otherwise).
- Add `doThis` (short, plain) only when there is a genuine action for the household: change a password, check a bill, change clocks, check travel.
- IN MEMORY: one respectful line, e.g. "Actor X, known for Y, has died aged 84." No cause of death unless that is the story.
- ALWAYS add `goodNews` {text, source, thread}: one genuinely good, verified story, max about 20 words, never one used before (check threads with section "good").
- ALWAYS add `popCulture` {text, source, thread}: the single biggest celebrity or pop culture story of the day (music, TV, film, awards, a major announcement, a big UK TV moment). Max about 22 words, neutral and light. It must be announced or happen in the last 24 to 48 hours (FRESHNESS rule). Prefer news people will mention over private-life gossip; avoid relationships, rows and scandals unless that truly is the day's dominant story, and then state it plainly. Celebrity deaths go in items as IN MEMORY, not here. US celebrities are fine here. Two-source rule. Never repeat one (check threads with section "pop").
- TALKING POINTS (folded away on the page; Dani dislikes these stories but feels left out when people mention them): add `talkingPoints` to the day: 0 to 3 viral or widely discussed stories from the last 7 days that people are talking about at work, the gym or online but that do not belong in the main items (e.g. an unusual accident, a viral video, a celebrity moment, a TV show controversy). Check the latest YouGov News Tracker (yougov.com "YouGov News Tracker", weekly) and widely covered trending stories, applying the FRESHNESS rule. Each {text, context?, source, thread}: `text` max about 22 words saying plainly what happened, with no graphic, gory or distressing detail (say "died" or "was injured", never describe how); `context` optional, one short line on why people are talking about it. Same two-source rule. Track them as threads with section "talk" and never repeat one unless something major changes. Big world or UK turning points still go in the main items, not here. Use an empty list on days with nothing fresh worth knowing.
- `affectsYou` may also be added to non-cyber items when it helps (e.g. a recall: "Only some 2019-2021 MG ZS models.").
- SUNDAYS ONLY: add `weekInFive`: five one-line summaries (max about 15 words each) of the week's most important stories from the past seven days of CalmFax, so someone who skipped days is caught up. Same tone rules.
- "ongoing" entries: {id, title, line, changed, order, active, source, why}. `why` is two or three plain sentences of neutral background (how it started, what the main disagreement is). Write one for every new ongoing story; refresh it only when the background itself changes.
- "comingUp": dated heads-ups for the next 14 days that matter to the household or that people will be talking about: Budget or other big announcements, Ofgem price cap announcements and changes, strikes affecting Calderdale travel, bank holidays, clocks changing, UK elections, national days like Remembrance Sunday. Each {date, tag, text (max about 20 words), source?}. Remove past dates. Keep at most 6.
- "glossary": {term: one-line plain-English meaning}. When today's text uses a term someone might not know (e.g. "fiscal rules", "base rate", "ceasefire"), add it with an exact-case phrase that appears in the text. Keep definitions neutral and under about 20 words. Keep the glossary to about 40 terms; drop ones no longer used anywhere in the block.

TONE: strictly unbiased. Report what happened, not what to think about it. No loaded or emotive words, no taking sides, no editorialising. For political stories state the fact plainly; if there is a dispute, say briefly what each side says, with equal weight. Calm throughout: no alarming words (avoid "danger", "chaos", "shock", "slams", "crisis" etc.), no casualty figures, no graphic detail. All of this applies to `why`, `comingUp`, `glossary`, `popCulture`, `talkingPoints` and `weekInFive` too.

STEP 5 - Update and republish the page.
- In the saved page file, replace ONLY the JSON between `<script type="application/json" id="dd-data">` and its `</script>`: put today's day first in "days", keep at most 14 days (drop the oldest), and apply the ongoing, comingUp and glossary changes. Write valid JSON and escape every "</" inside it as "<\/". Do it with a short script (e.g. python3 -I) so nothing else in the file changes.
- Publish with the Artifact tool: `url` = the ARTIFACT url, `file_path` = that saved file, label "Daily update YYYY-MM-DD". Do not pass `icon` or `capabilities`.

STEP 6 - Update the SiteGround copy (skip quietly if /home/user/Test is missing).
- Copy the published page file over /home/user/Test/danis-daily/page.html, run `python3 /home/user/Test/danis-daily/build_site.py`, then in /home/user/Test commit page.html and danis-daily/site/ with the message "CalmFax daily update YYYY-MM-DD" (end the message with the session's usual attribution lines) and `git push -u origin ccr-b933d7ea-7iqwd8` (retry up to 4 times on network errors with 2s, 4s, 8s, 16s waits). A GitHub Action uploads the site to SiteGround once its secrets are set.

STEP 7 - Save memory with ONE ArtifactData `batch` call to the ARTIFACT url:
- `set`/`update` threads/<id> for every story mentioned today or changed (items, good news, pop culture, talking points, ongoing, comingUp entries worth tracking): title, tag, section, status, firstDate, lastDate, lastSaid (what the page now says), nextCheck (what would count as a material change, or a date to look again), sources [{name, url}, ...] (every source you checked, at least two). Pin if_version for existing docs. Close one-off threads (status "closed") once they are done.
Document ids: lowercase words joined by hyphens.

STEP 8 - Reply here with a short summary: the lines published, any ongoing or coming-up changes, anything left out because it could not be confirmed in two sources or was too old, and whether the push to GitHub worked. Do not message anyone, post anywhere, or change anything else.

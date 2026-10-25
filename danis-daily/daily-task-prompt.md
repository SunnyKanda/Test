Daily run for CalmFax (the calm Teletext news page for Dani). Do this now, without asking for confirmation. Work only through WebSearch, the Artifact tool, the ArtifactData tool, and Bash for the repo steps (load tools with ToolSearch if needed). Direct page fetches (WebFetch/curl) are blocked by this environment's network policy, so rely on WebSearch results.

ARTIFACT: https://claude.ai/artifact/UmzEi6kqji58L1q6qK8ABb

HOW THE PAGE WORKS: the page is standalone, so Dani needs no sign-in. All news it shows lives in one JSON block inside the page, between `<script type="application/json" id="dd-data">` and `</script>`, shaped:
{"days": [...], "ongoing": [...], "comingUp": [...], "glossary": {...}}
Each morning you edit that block and republish. The artifact database is ONLY your private memory (owner-only): `threads` (one per story) and `settings/profile` (the household). Never change any other part of the page (styles, layout, script) or its capabilities.

HOUSEHOLD: Halifax, Calderdale, West Yorkshire (Met Office region Yorkshire & Humber; Calderdale Council; River Calder and River Hebble flood areas; Northern trains on the Calder Valley line, Grand Central, M62; Northern Powergrid). Read `settings/profile` for anything added since (energy supplier, banks, shops, car). Use it to decide relevance: include weather warnings, flood warnings, strikes, roadworks or council changes only when they cover Calderdale or the household's own providers, and tag those LOCAL. Cyber items about companies the household uses come first.

STEP 1 - Read memory and the current page.
- ArtifactData list `threads` (limit 200) and get `settings/profile`. Each thread has: title, tag, section (today|ongoing|good|coming), status (open|closed), firstDate, lastDate, lastSaid, nextCheck, sources. Note each doc's `version`.
- Artifact action "read" on the ARTIFACT url. The result names the saved file that holds the full page: work on that file. Parse the JSON block.
- Today's date is the Europe/London date. If the block already has a day with today's date, this is a rerun: replace that day only if something materially changed.

STEP 2 - Find what happened since the last edition (roughly the last 24 hours; on Mondays include the weekend).
Search for: UK household news (bills, energy, tax, benefits, new laws, travel and strikes, weather and flood warnings, official safety or preparedness guidance from GOV.UK), Calderdale and West Yorkshire news that affects households, major cyber attacks or data breaches at companies UK people use (check NCSC), genuine turning points in world events (a ceasefire, a new conflict, a major US presidential decision with real consequences), and deaths of truly household-name people (someone almost everyone in the UK would recognise; check the death is recent, not months old). Also check every thread's `nextCheck`.

THE TEST: would people around Dani be talking about it, or does it affect this household? If not, leave it out.
OUT: daily statements, political rows, polls, speculation, predictions, opinion pieces, celebrity gossip, crime stories, anything graphic.

Confirm every story in at least two independent sources. Prefer straight-news and official sources for the link: Reuters, AP, BBC News, GOV.UK, NCSC, Met Office, Environment Agency, Ofgem, House of Commons Library, Calderdale Council. Avoid opinion pieces and outlets with a clear political lean.

STEP 3 - No repeats.
- If a story matches an existing thread, include it again ONLY if something has materially changed since `lastSaid`; then set `update: true` (the page shows "UPDATE:") and describe only what changed.
- Long-running stories belong in "ongoing". Change an ongoing line only when something genuinely shifts (set its `changed` to today). Set `active: false` when a story is over. Add a new ongoing line only for a story that will clearly run for weeks.
- CORRECTIONS: if anything published earlier turns out to be wrong, add `correction` (one plain sentence saying what was wrong and what is right) to today's day object.

STEP 4 - Write today's content.
- Day object: {date: "YYYY-MM-DD", quiet, items, goodNews, correction?, weekInFive?}.
- 1 to 4 items. Fewer is fine. If nothing passes the test, set `quiet: true` and `items: []` (the page shows "Nothing major today.").
- Each item: `tag` one of UK, LOCAL, WORLD, CYBER, MONEY, HEADS-UP, IN MEMORY; `text` max about 20 words, plain English, one or two short sentences; `source` {name, url}; `update` true/false; `thread` (thread id).
- Add `doThis` (short, plain) only when there is a genuine action for the household: change a password, check a bill, change clocks, check travel.
- IN MEMORY: one respectful line, e.g. "Actor X, known for Y, has died aged 84." No cause of death unless that is the story.
- ALWAYS add `goodNews` {text, source, thread}: one genuinely good, verified story, max about 20 words, never one used before (check threads with section "good").
- SUNDAYS ONLY: add `weekInFive`: five one-line summaries (max about 15 words each) of the week's most important stories from the past seven days of CalmFax, so someone who skipped days is caught up. Same tone rules.
- "ongoing" entries: {id, title, line, changed, order, active, source, why}. `why` is two or three plain sentences of neutral background (how it started, what the main disagreement is). Write one for every new ongoing story; refresh it only when the background itself changes.
- "comingUp": dated heads-ups for the next 14 days that matter to the household or that people will be talking about: Budget or other big announcements, Ofgem price cap announcements and changes, strikes affecting Calderdale travel, bank holidays, clocks changing, major elections, national days like Remembrance Sunday. Each {date, tag, text (max about 20 words), source?}. Remove past dates. Keep at most 6.
- "glossary": {term: one-line plain-English meaning}. When today's text uses a term someone might not know (e.g. "fiscal rules", "base rate", "ceasefire"), add it with an exact-case phrase that appears in the text. Keep definitions neutral and under about 20 words. Keep the glossary to about 40 terms; drop ones no longer used anywhere in the block.

TONE: strictly unbiased. Report what happened, not what to think about it. No loaded or emotive words, no taking sides, no editorialising. For political stories state the fact plainly; if there is a dispute, say briefly what each side says, with equal weight. Calm throughout: no alarming words (avoid "danger", "chaos", "shock", "slams", "crisis" etc.), no casualty figures, no graphic detail. All of this applies to `why`, `comingUp`, `glossary` and `weekInFive` too.

STEP 5 - Update and republish the page.
- In the saved page file, replace ONLY the JSON between `<script type="application/json" id="dd-data">` and its `</script>`: put today's day first in "days", keep at most 14 days (drop the oldest), and apply the ongoing, comingUp and glossary changes. Write valid JSON and escape every "</" inside it as "<\/". Do it with a short script (e.g. python3 -I) so nothing else in the file changes.
- Publish with the Artifact tool: `url` = the ARTIFACT url, `file_path` = that saved file, label "Daily update YYYY-MM-DD". Do not pass `icon` or `capabilities`.

STEP 6 - Update the SiteGround copy (skip quietly if /home/user/Test is missing).
- Copy the published page file over /home/user/Test/danis-daily/page.html, run `python3 /home/user/Test/danis-daily/build_site.py`, then in /home/user/Test commit page.html and danis-daily/site/ with the message "CalmFax daily update YYYY-MM-DD" (end the message with the session's usual attribution lines) and `git push -u origin ccr-b933d7ea-7iqwd8` (retry up to 4 times on network errors with 2s, 4s, 8s, 16s waits). A GitHub Action uploads the site to SiteGround once its secrets are set.

STEP 7 - Save memory with ONE ArtifactData `batch` call to the ARTIFACT url:
- `set`/`update` threads/<id> for every story mentioned today or changed (items, good news, ongoing, comingUp entries worth tracking): title, tag, section, status, firstDate, lastDate, lastSaid (what the page now says), nextCheck (what would count as a material change, or a date to look again), sources [{name, url}, ...] (every source you checked, at least two). Pin if_version for existing docs. Close one-off threads (status "closed") once they are done.
Document ids: lowercase words joined by hyphens.

STEP 8 - Reply here with a short summary: the lines published, any ongoing or coming-up changes, anything left out because it could not be confirmed in two sources, and whether the push to GitHub worked. Do not message anyone, post anywhere, or change anything else.

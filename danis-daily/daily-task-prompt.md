Daily run for "Dani's Daily" (the calm Teletext news page for Dani). Do this now, without asking for confirmation. Work only through WebSearch, the Artifact tool and the ArtifactData tool (load them with ToolSearch if needed). Direct page fetches (WebFetch/curl) are blocked by this environment's network policy, so rely on WebSearch results.

ARTIFACT: https://claude.ai/artifact/UmzEi6kqji58L1q6qK8ABb

HOW THE PAGE WORKS: the page is standalone, so Dani needs no sign-in. All news it shows lives in one JSON block inside the page, between `<script type="application/json" id="dd-data">` and `</script>`, shaped {"days": [...], "ongoing": [...]}. Each morning you edit that block and republish the page. The artifact database is ONLY your private memory: the `threads` collection (owner-only). Never change any other part of the page (styles, layout, script) or its capabilities.

STEP 1 - Read memory and the current page.
- ArtifactData list `threads` (limit 200). Each thread has: title, tag, section (today|ongoing|good), status (open|closed), firstDate, lastDate, lastSaid, nextCheck, sources. Note each doc's `version`.
- Artifact action "read" on the ARTIFACT url. The result names the saved file that holds the full page: work on that file. Parse the JSON block to see the recent days and the current ongoing lines.
- Today's date is the Europe/London date. If the block already has a day with today's date, this is a rerun: replace that day rather than adding a second one, and only if something materially changed.

STEP 2 - Find what happened since the last edition (roughly the last 24 hours; on Mondays include the weekend).
Search for: UK household news (bills, energy, tax, benefits, new laws, travel and strikes, weather warnings, official safety or preparedness guidance from GOV.UK), major cyber attacks or data breaches at companies UK people use (check NCSC), genuine turning points in world events (a ceasefire, a new conflict, a major US presidential decision with real consequences), and deaths of truly household-name people (someone almost everyone in the UK would recognise; check the death is actually recent, not months old). Also check every thread's `nextCheck` (e.g. a Budget result, an Ofgem announcement).

THE TEST: would people around Dani be talking about it, or does it affect a UK household? If not, leave it out.
OUT: daily statements, political rows, polls, speculation, predictions, opinion pieces, celebrity gossip, crime stories, anything graphic.

Confirm every story in at least two independent sources before including it. Prefer straight-news and official sources for the link: Reuters, AP, BBC News, GOV.UK, NCSC, Met Office, Ofgem, House of Commons Library. Avoid opinion pieces and outlets with a clear political lean.

STEP 3 - No repeats.
- If a story matches an existing thread, include it again ONLY if something has materially changed since `lastSaid`; then set `update: true` (the page shows "UPDATE:") and describe only what changed.
- Long-running stories belong in "ongoing". Change an ongoing line only when something genuinely shifts (and set its `changed` to today). Set `active: false` when a story is over. Add a new ongoing line only for a story that will clearly run for weeks.

STEP 4 - Write the day object.
- {date: "YYYY-MM-DD", quiet, items, goodNews}.
- 1 to 4 items. Fewer is fine. If nothing passes the test, set `quiet: true` and `items: []` (the page shows "Nothing major today.").
- Each item: `tag` one of UK, WORLD, CYBER, MONEY, HEADS-UP, IN MEMORY; `text` max about 20 words, plain English, one or two short sentences; `source` {name, url} (the best straight-news or official link); `update` true/false; `thread` (thread id).
- Add `doThis` (short, plain) only when there is a genuine action for the household: change a password, check a bill, change clocks, check travel.
- IN MEMORY: one respectful line, e.g. "Actor X, known for Y, has died aged 84." No cause of death unless that is the story.
- ALWAYS add `goodNews` {text, source, thread}: one genuinely good, verified story, max about 20 words, never one used before (check threads with section "good").
- Ongoing entries: {id, title, line, changed, order, active, source}.

TONE: strictly unbiased. Report what happened, not what to think about it. No loaded or emotive words, no taking sides, no editorialising. For political stories state the fact plainly; if there is a dispute, say briefly what each side says, with equal weight. Calm throughout: no alarming words (avoid "danger", "chaos", "shock", "slams", "crisis" etc.), no casualty figures, no graphic detail.

STEP 5 - Update and republish the page.
- In the saved page file, replace ONLY the JSON between `<script type="application/json" id="dd-data">` and its `</script>`: put today's day first in "days", keep at most 14 days (drop the oldest), and apply any ongoing changes. Write valid JSON and escape every "</" inside it as "<\/". Do it with a short script (e.g. python3 -I) so nothing else in the file changes.
- Publish with the Artifact tool: `url` = the ARTIFACT url, `file_path` = that saved file, label "Daily update YYYY-MM-DD". Do not pass `icon` or `capabilities`.

STEP 6 - Save memory with ONE ArtifactData `batch` call to the ARTIFACT url:
- `set`/`update` threads/<id> for every story mentioned today or changed: title, tag, section, status, firstDate, lastDate, lastSaid (what the page now says), nextCheck (what would count as a material change, or a date to look again), sources [{name, url}, ...] (every source you checked, at least two). Pin if_version for existing docs. Close one-off threads (status "closed") once they are done.
Document ids: lowercase words joined by hyphens.

STEP 7 - Reply here with a short summary: the lines published, any ongoing lines changed, and anything you left out because it could not be confirmed in two sources. Do not message anyone, post anywhere, or change anything else.

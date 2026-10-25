Daily run for "Dani's Daily" (the calm Teletext news page for Dani). Do this now, without asking for confirmation. Work only through WebSearch and the ArtifactData tool (load both with ToolSearch if needed). Direct page fetches (WebFetch/curl) are blocked by this environment's network policy, so rely on WebSearch results. Never republish or edit the page itself; only write to its database.

ARTIFACT: https://claude.ai/artifact/UmzEi6kqji58L1q6qK8ABb

STEP 1 - Read memory first.
- ArtifactData list `threads` (limit 200). Each thread has: title, tag, section (today|ongoing|good), status (open|closed), firstDate, lastDate, lastSaid, nextCheck. Note each doc's `version`.
- ArtifactData list `ongoing` (the P150 lines) and query `days` ordered by date desc, limit 7, to see what was said recently.
- Today's date is the Europe/London date. If `days/<today>` already exists, this is a rerun: update it (pin if_version) rather than adding a second day.

STEP 2 - Find what happened since the last edition (roughly the last 24 hours; on Mondays include the weekend).
Search for: UK household news (bills, energy, tax, benefits, new laws, travel and strikes, weather warnings, official safety or preparedness guidance from GOV.UK), major cyber attacks or data breaches at companies UK people use (check NCSC), genuine turning points in world events (a ceasefire, a new conflict, a major US presidential decision with real consequences), and deaths of truly household-name people (someone almost everyone in the UK would recognise). Also check every thread's `nextCheck` (e.g. a Budget result, an Ofgem announcement).

THE TEST: would people around Dani be talking about it, or does it affect a UK household? If not, leave it out.
OUT: daily statements, political rows, polls, speculation, predictions, opinion pieces, celebrity gossip, crime stories, anything graphic.

Confirm every story in at least two independent sources before including it. Prefer straight-news and official sources for the link: Reuters, AP, BBC News, GOV.UK, NCSC, Met Office, Ofgem, House of Commons Library. Avoid opinion pieces and outlets with a clear political lean.

STEP 3 - No repeats.
- If a story matches an existing thread, include it again ONLY if something has materially changed since `lastSaid`; then start the line with nothing extra (the page shows "UPDATE:" when `update: true`) and describe only what changed.
- Long-running stories belong in P150 (`ongoing`). Change an ongoing line only when something genuinely shifts. Set `active: false` when a story is over. Add a new ongoing line only for a story that will clearly run for weeks.

STEP 4 - Write the day.
- 1 to 4 items. Fewer is fine. If nothing passes the test, set `quiet: true` and `items: []` (the page shows "Nothing major today.").
- Each item: `tag` one of UK, WORLD, CYBER, MONEY, HEADS-UP, IN MEMORY; `text` max about 20 words, plain English, one or two short sentences; `source` {name, url} (the best straight-news or official link); `confirmedBy` [{name, url}, ...] (the other sources you checked); `update` true/false; `thread` (thread id).
- Add `doThis` (short, plain) only when there is a genuine action for the household: change a password, check a bill, change clocks, check travel.
- IN MEMORY: one respectful line, e.g. "Actor X, known for Y, has died aged 84." No cause of death unless that is the story.
- ALWAYS add `goodNews` {text, source, confirmedBy, thread}: one genuinely good, verified story, max about 20 words, never one used before (check threads with section "good").

TONE: strictly unbiased. Report what happened, not what to think about it. No loaded or emotive words, no taking sides, no editorialising. For political stories state the fact plainly; if there is a dispute, say briefly what each side says, with equal weight. Calm throughout: no alarming words (avoid "danger", "chaos", "shock", "slams", "crisis" etc.), no casualty figures, no graphic detail.

STEP 5 - Save with ONE ArtifactData `batch` call to the artifact URL:
- `set` days/<YYYY-MM-DD> with {date, quiet, items, goodNews, publishedAt (ISO now)}.
- `set`/`update` ongoing/<id> with {title, line, changed (today if the line changed), order, active, source, confirmedBy} only where something changed (pin if_version for existing docs).
- `set`/`update` threads/<id> for every story mentioned today or changed: title, tag, section, status, firstDate, lastDate, lastSaid (what the page now says), nextCheck (what would count as a material change, or a date to look again). Close one-off threads (status "closed") once they are done.
Document ids: lowercase words joined by hyphens.

STEP 6 - Reply here with a short summary: the lines published, any ongoing lines changed, and anything you left out because it could not be confirmed in two sources. Do not message anyone, post anywhere, or change anything else.

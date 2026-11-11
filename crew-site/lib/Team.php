<?php
declare(strict_types=1);

/** The group chat: who replies, what they are told, what they can do, and the scouts they send out. */
final class Team
{
    private const HISTORY = 30;
    private const TAG = '/\[\[\s*(task|remember|scout|job)\s*:\s*([^\]]+?)\s*\]\]/i';
    private const PAPER = '/\[\[\s*paper\s*:\s*([^\]]+?)\s*\]\](.*?)\[\[\s*\/\s*paper\s*\]\]/is';
    private const MENTION = '/@(claude|chatgpt|gpt|gemini|grokbot|grok|all|team|everyone)\b/i';
    private const ROUTES = [
        'gpt' => '/\b(cv|resume|résumé|cover letter|interview|appl(y|ied|ication)|job|vacanc|hiring|recruit)/iu',
        'grok' => '/\b(money|earn|cash|income|sell|side ?hustle|gig|freelanc|rent|debt|bills?|broke|skint)/i',
        'gemini' => '/\b(how do|how does|what is|what are|where can|benefit|universal credit|course|training|qualif|grant|research|explain)/i',
    ];
    public const SEED_SCOUTS = [
        ['Job scout', 'gpt', 'daily', 'Find job adverts posted in the last few days that {name} could realistically get, near where they live or fully remote. Use what the team knows about their experience. Give each advert as a job lead.'],
        ['Money scout', 'grok', 'weekly', 'Find legitimate ways {name} could earn money within the next two weeks that fit their situation: casual and agency work nearby, gig platforms that operate in their area, things they could sell. Give real names and how to sign up. Nothing that costs money up front.'],
        ['Support scout', 'gemini', 'weekly', 'Find support {name} may be entitled to where they live: benefits, council help, free training, free CV and job-search help, help with food or energy bills. Give the official page for each and how to apply.'],
    ];

    public function __construct(private Db $db, public Providers $providers)
    {
    }

    // ── time and identity ───────────────────────────────────────────────────
    public ?DateTimeImmutable $fakeNow = null;

    public function tz(): DateTimeZone
    {
        try {
            return new DateTimeZone($this->db->get('timezone', 'Europe/London'));
        } catch (Throwable) {
            return new DateTimeZone('Europe/London');
        }
    }

    public function now(): DateTimeImmutable
    {
        return $this->fakeNow ?? new DateTimeImmutable('now', $this->tz());
    }

    public function today(): string
    {
        return $this->now()->format('Y-m-d');
    }

    public function name(): string
    {
        return $this->db->get('name', 'Sunny') ?: 'Sunny';
    }

    // ── messages ────────────────────────────────────────────────────────────
    public function post(string $sender, string $text, string $kind = 'chat', array $meta = []): array
    {
        return $this->db->insert('messages', ['sender' => $sender, 'kind' => $kind, 'text' => $text,
            'meta' => json_encode($meta ?: new stdClass())]);
    }

    public function firstRun(): void
    {
        if ($this->db->get('seeded') === '1') {
            return;
        }
        $this->db->set('seeded', '1');
        $name = $this->name();
        $this->post('system',
            "Welcome aboard, $name. This is your crew's group chat.\n\n"
            . "Claude coaches, GPT handles job hunting, Gemini researches and Grok brings money ideas. Write to everyone, "
            . "or start a message with a name like @grok to ask one of them. Each of them can send a scout onto the "
            . "internet and bring back what it finds.\n\n"
            . "To get going, tell the crew three things: what work you've done before, how soon you need money coming in, "
            . "and how much energy you've got on a normal day.", 'welcome');
        foreach (self::SEED_SCOUTS as [$title, $agent, $cadence, $brief]) {
            $this->db->insert('scouts', ['title' => $title, 'agent' => $agent, 'cadence' => $cadence, 'brief' => $brief, 'enabled' => 0]);
        }
    }

    public function userSays(string $text): array
    {
        $message = $this->post('sunny', $text);
        $this->queueReplies($text);
        return $message;
    }

    private function queueReplies(string $text): void
    {
        $ready = $this->providers->readyAgents();
        if (!$ready) {
            $this->noticeOnce('nokeys', 'Nobody on the crew can talk yet because no API keys have been added. Open Settings '
                . '(top right) and add a key for at least one of them. Your to-do list, planner, goals and job tracker work without keys.');
            return;
        }
        $mentioned = $this->mentioned($text);
        if ($mentioned !== null) {
            foreach ($mentioned as $a) {
                if (!in_array($a, $ready, true)) {
                    $this->post('system', Providers::AGENTS[$a]['name'] . " isn't set up yet. Add a key in Settings.", 'notice');
                }
            }
            $responders = array_values(array_intersect($mentioned, $ready));
        } else {
            $lead = null;
            foreach (self::ROUTES as $agent => $pattern) {
                if (in_array($agent, $ready, true) && preg_match($pattern, $text)) {
                    $lead = $agent;
                    break;
                }
            }
            $lead ??= $ready[0];
            $rest = array_values(array_diff($ready, [$lead]));
            $responders = $this->db->get('reply_mode', 'team') === 'one' ? [$lead] : [$lead, ...$rest];
        }
        foreach ($responders as $i => $agent) {
            $this->enqueue('chat', 'reply', $agent, ['may_pass' => $i > 0 && $mentioned === null]);
        }
    }

    private function mentioned(string $text): ?array
    {
        if (!preg_match_all(self::MENTION, $text, $m)) {
            return null;
        }
        $found = array_map('strtolower', $m[1]);
        if (array_intersect($found, ['all', 'team', 'everyone'])) {
            return Providers::ORDER;
        }
        $alias = ['chatgpt' => 'gpt', 'grokbot' => 'grok'];
        return array_values(array_unique(array_map(fn ($x) => $alias[$x] ?? $x, $found)));
    }

    // ── the work queue ──────────────────────────────────────────────────────
    // Each web request or cron run does one piece of work, so nothing depends on a long-lived process.
    public function enqueue(string $lane, string $kind, string $agent, array $payload = []): void
    {
        $this->db->insert('queue', ['lane' => $lane, 'kind' => $kind, 'agent' => $agent, 'payload' => json_encode($payload)]);
    }

    public function pending(): array
    {
        $out = ['chat' => 0, 'scout' => 0, 'typing' => ''];
        foreach ($this->db->q("SELECT lane, agent, status FROM queue WHERE status IN ('pending','running') ORDER BY created_at, rowid") as $row) {
            $out[$row['lane']]++;
            if ($row['lane'] === 'chat' && $out['typing'] === '') {
                $out['typing'] = $row['agent'];
            }
        }
        return $out;
    }

    /** Does the oldest waiting item in a lane. Returns 'done', 'busy' (someone else is on it) or 'empty'. */
    public function workOne(string $lane): string
    {
        $item = $this->db->locked(function () use ($lane) {
            $now = time();
            // A worker that died mid-job gets one retry, then the item is dropped.
            $this->db->x("UPDATE queue SET status='pending' WHERE status='running' AND started_at < ? AND attempts < 2", [$now - 240]);
            $dead = $this->db->q("SELECT id, kind, payload FROM queue WHERE status='running' AND started_at < ?", [$now - 240]);
            foreach ($dead as $d) {
                $this->db->x('DELETE FROM queue WHERE id=?', [$d['id']]);
                if ($d['kind'] === 'scout') {
                    $this->db->update('reports', json_decode($d['payload'], true)['report_id'] ?? '', ['status' => 'failed', 'body' => 'The scout timed out twice.']);
                }
            }
            if ($this->db->q("SELECT id FROM queue WHERE lane=? AND status='running'", [$lane])) {
                return 'busy';
            }
            $next = $this->db->q("SELECT * FROM queue WHERE lane=? AND status='pending' ORDER BY created_at, rowid LIMIT 1", [$lane]);
            if (!$next) {
                return null;
            }
            $this->db->x("UPDATE queue SET status='running', started_at=?, attempts=attempts+1 WHERE id=?", [$now, $next[0]['id']]);
            return $next[0];
        });
        if (!is_array($item)) {
            return $item ?? 'empty';
        }
        $payload = json_decode($item['payload'], true) ?: [];
        try {
            match ($item['kind']) {
                'reply' => $this->speak($item['agent'], (bool) ($payload['may_pass'] ?? false)),
                'checkin' => $this->speak($item['agent'], false, (string) ($payload['instruction'] ?? '')),
                'scout' => $this->runScout((string) ($payload['report_id'] ?? '')),
                default => null,
            };
        } catch (Throwable $e) {
            error_log('crew: ' . $e->getMessage());
            $this->post('system', 'Something went wrong on the server: ' . mb_substr($e->getMessage(), 0, 160), 'notice');
        } finally {
            $this->db->x('DELETE FROM queue WHERE id=?', [$item['id']]);
            $this->db->bump();
        }
        return 'done';
    }

    // ── one crew member writes one message ──────────────────────────────────
    private function speak(string $agent, bool $mayPass, string $instruction = ''): bool
    {
        if (!$this->providers->ready($agent) || !$this->withinCap($agent)) {
            return false;
        }
        try {
            $reply = $this->providers->complete($agent, $this->system($agent, $mayPass), $this->history($agent, $instruction));
        } catch (ProviderError $e) {
            $this->post('system', $e->getMessage(), 'notice', ['agent' => $agent]);
            return false;
        }
        $this->count($agent);
        $name = preg_quote(Providers::AGENTS[$agent]['name'], '/');
        $reply = preg_replace("/^\s*\**{$name}\b[^:\n]{0,30}:\**\s*/i", '', $reply);
        [$text, $actions] = $this->applyActions($agent, $reply);
        if (strtoupper(trim($text, " .!*\n")) === 'PASS' || ($text === '' && !$actions)) {
            return false;
        }
        $this->post($agent, $text !== '' ? $text : 'Done.', 'chat', $actions ? ['actions' => $actions] : []);
        return true;
    }

    /** Carries out the [[tags]] in a reply and returns the text without them. */
    private function applyActions(string $agent, string $reply, ?array $sources = null): array
    {
        $actions = [];
        $reply = preg_replace_callback(self::PAPER, function ($m) use ($agent, &$actions) {
            $title = mb_substr(trim($m[1]), 0, 120);
            $body = trim($m[2]);
            if ($title !== '' && $body !== '') {
                $same = $this->db->q('SELECT id FROM papers WHERE lower(title)=lower(?)', [$title]);
                if ($same) {
                    $this->db->update('papers', $same[0]['id'], ['body' => $body, 'added_by' => $agent, 'created_at' => Db::stamp()]);
                } else {
                    $this->db->insert('papers', ['title' => $title, 'body' => $body, 'added_by' => $agent]);
                }
                $actions[] = ['type' => 'paper', 'title' => $title];
            }
            return '';
        }, $reply);

        preg_match_all(self::TAG, $reply, $found, PREG_SET_ORDER);
        $tasks = 0;
        $scouts = 0;
        foreach ($found as [, $kind, $body]) {
            $kind = strtolower($kind);
            $parts = array_map('trim', explode('|', $body));
            if ($kind === 'task' && $tasks < 3) {
                $title = mb_substr($parts[0], 0, 200);
                $due = $this->parseDay($parts[1] ?? '');
                if ($title !== '' && !$this->db->q('SELECT id FROM tasks WHERE done=0 AND lower(title)=lower(?)', [$title])) {
                    $this->db->insert('tasks', ['title' => $title, 'due' => $due, 'added_by' => $agent]);
                    $actions[] = ['type' => 'task', 'title' => $title, 'due' => $due];
                    $tasks++;
                }
            } elseif ($kind === 'remember' && $body !== '') {
                if (!$this->db->q('SELECT id FROM memory WHERE lower(text)=lower(?)', [$body])) {
                    $this->db->insert('memory', ['text' => mb_substr($body, 0, 300), 'added_by' => $agent]);
                    $actions[] = ['type' => 'remember', 'text' => mb_substr($body, 0, 300)];
                }
            } elseif ($kind === 'scout' && $sources === null && $scouts < 1) {
                $id = $this->sendScout($agent, mb_substr($body, 0, 600));
                if ($id) {
                    $actions[] = ['type' => 'scout', 'text' => mb_substr($body, 0, 200), 'report_id' => $id];
                    $scouts++;
                }
            } elseif ($kind === 'job' && $sources !== null) {
                // Only leads whose link points at a site the scout actually visited are kept.
                [$title, $company, $link] = [$parts[0], $parts[1] ?? '', $parts[2] ?? ''];
                if ($title !== '' && $this->linkIsSourced($link, $sources)
                    && !$this->db->q('SELECT id FROM jobs WHERE link=? OR (lower(title)=lower(?) AND lower(company)=lower(?))', [$link, $title, $company])) {
                    $this->db->insert('jobs', ['title' => mb_substr($title, 0, 200), 'company' => mb_substr($company, 0, 200),
                        'link' => mb_substr($link, 0, 500), 'added_by' => $agent, 'notes' => 'Found by a scout. Check the advert is real before applying, and never pay to apply.']);
                    $actions[] = ['type' => 'job', 'title' => $title, 'company' => $company];
                }
            }
        }
        $text = trim(preg_replace("/\n{3,}/", "\n\n", preg_replace(self::TAG, '', $reply)));
        return [$text, $actions];
    }

    private function linkIsSourced(string $link, array $sources): bool
    {
        $host = fn (string $u) => preg_replace('/^www\./', '', strtolower((string) parse_url($u, PHP_URL_HOST)));
        if (!preg_match('#^https?://#i', $link) || $host($link) === '') {
            return false;
        }
        foreach ($sources as $s) {
            $title = strtolower(trim($s['title'] ?? ''));
            $known = [$host($s['url'] ?? ''), preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/', $title) ? preg_replace('/^www\./', '', $title) : ''];
            foreach (array_filter($known) as $k) {
                if ($host($link) === $k || str_ends_with($host($link), '.' . $k) || str_ends_with($k, '.' . $host($link))) {
                    return true;
                }
            }
        }
        return false;
    }

    private function parseDay(string $when): string
    {
        $when = trim(preg_replace('/^due:/', '', strtolower(trim($when))));
        if ($when === 'today') {
            return $this->today();
        }
        if ($when === 'tomorrow') {
            return $this->now()->modify('+1 day')->format('Y-m-d');
        }
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $when);
        return $d && $d->format('Y-m-d') === $when ? $when : '';
    }

    // ── scouts: helpers that browse the web and report back ─────────────────
    /** Queues a scouting run. Returns the report id, or '' if an identical one is already out. */
    public function sendScout(string $agent, string $brief, string $title = '', string $scoutId = ''): string
    {
        $brief = trim($brief);
        if ($brief === '' || $this->db->q("SELECT id FROM reports WHERE brief=? AND status IN ('queued','running')", [$brief])) {
            return '';
        }
        $title = $title !== '' ? $title : mb_substr(ucfirst($brief), 0, 70) . (mb_strlen($brief) > 70 ? '…' : '');
        $report = $this->db->insert('reports', ['scout_id' => $scoutId, 'agent' => $agent, 'title' => $title, 'brief' => $brief]);
        $this->enqueue('scout', 'scout', $agent, ['report_id' => $report['id']]);
        return $report['id'];
    }

    private function runScout(string $reportId): void
    {
        $rows = $this->db->q('SELECT * FROM reports WHERE id=?', [$reportId]);
        if (!$rows) {
            return;
        }
        $report = $rows[0];
        $this->db->update('reports', $reportId, ['status' => 'running']);
        // The sender's own model browses if it can; otherwise another crew member's does.
        $order = array_values(array_unique([$report['agent'], ...Providers::ORDER]));
        $candidates = array_values(array_filter($order, fn ($a) => $this->providers->ready($a) && $this->withinCap($a)));
        $result = null;
        $problem = 'No crew member with an API key is available to browse.';
        foreach (array_slice($candidates, 0, 2) as $agent) {
            try {
                $result = $this->providers->research($agent, $this->scoutSystem($agent), $this->scoutBrief($report['brief']));
                $this->count($agent);
                break;
            } catch (ProviderError $e) {
                $problem = $e->getMessage();
            }
        }
        $sender = $report['agent'];
        if ($result === null) {
            $this->db->update('reports', $reportId, ['status' => 'failed', 'body' => $problem]);
            $this->post('system', "The scout for “{$report['title']}” came back empty-handed. $problem", 'notice');
            return;
        }
        [$summary, $body] = array_pad(preg_split('/^\s*-{3,}\s*$/m', $result['text'], 2), 2, '');
        if (trim($body) === '') {
            $body = $summary;
            $summary = mb_substr($summary, 0, 400);
        }
        [$body, $actions] = $this->applyActions($sender, $body, $result['sources']);
        [$summary] = $this->applyActions($sender, $summary, []);
        $this->db->update('reports', $reportId, ['status' => 'done', 'body' => $body, 'sources' => json_encode($result['sources']),
            'created_at' => Db::stamp()]);
        $this->post($sender, "Scout report: {$report['title']}\n\n" . trim($summary), 'chat',
            ['actions' => $actions, 'report_id' => $reportId]);
    }

    private function scoutBrief(string $brief): string
    {
        return str_replace('{name}', $this->name(), $brief);
    }

    private function scoutSystem(string $agent): string
    {
        $name = $this->name();
        $me = Providers::AGENTS[$agent];
        $place = trim($this->db->get('location'));
        $where = $place !== '' ? "$name lives in or near: $place." : "The team doesn't know where $name lives yet, so say which country your findings apply to.";
        $tracked = implode('; ', array_map(fn ($j) => trim($j['title'] . ' at ' . $j['company'], ' at'),
            $this->db->q('SELECT title, company FROM jobs ORDER BY created_at DESC LIMIT 20')));
        return <<<TXT
You are a scout sent out by {$me['name']}, one of the AI teammates helping $name find paid work and get through a hard stretch. Your job is to search the live web for the brief you are given and bring back findings $name can act on today. You have a web search tool: use it, several times if needed, and base everything on pages you actually found.

$where
It is {$this->now()->format('l j F Y')}.

What the team knows about $name:
{$this->aboutBlock()}
{$this->papersBlock(1200)}
Jobs already in $name's tracker (don't bring these back again): {$tracked}

Rules for what you bring back:
- Report only what the pages say. If you could not find something, say so plainly; an honest "nothing good today" is a useful report. Never fill gaps with invented adverts, employers, pay rates, links or phone numbers.
- Prefer recent pages and official sources. Give the date of an advert when the page shows one.
- Warn about anything that looks like a scam: a fee to apply or train, a vague employer, contact only through a messaging app, pay that is too good. Leave out anything that needs money up front, and all gambling, crypto and trading schemes.
- $name is tired and short of time. Bring at most five findings, best first, each with what it is, why it fits, and the exact next step.

Format, exactly:
First, a summary for the group chat of 60 words or fewer: what you found and the single best thing to do next.
Then a line containing only ---
Then the full report in plain text, no headings or tables, with the page address after each finding.
After the report you may add tags, each on its own line:
[[job: job title | employer | full link to the advert]] for each real job advert you found, so it lands in $name's job tracker. Only for adverts you saw, with their true links.
[[task: short title | YYYY-MM-DD]] for at most two next steps ("today" and "tomorrow" also work as dates).
TXT;
    }

    // ── limits ──────────────────────────────────────────────────────────────
    private function withinCap(string $agent): bool
    {
        $cap = max(1, (int) $this->db->get('daily_cap', '60'));
        $used = $this->db->q('SELECT calls FROM usage WHERE day=? AND agent=?', [$this->today(), $agent]);
        if ($used && (int) $used[0]['calls'] >= $cap) {
            $key = "cap:$agent:" . $this->today();
            if ($this->db->x('INSERT OR IGNORE INTO runs (key, ran_at) VALUES (?, ?)', [$key, Db::stamp()])) {
                $this->post('system', Providers::AGENTS[$agent]['name'] . " has reached today's limit of $cap replies. "
                    . 'It resets at midnight, or raise it in Settings.', 'notice');
            }
            return false;
        }
        return true;
    }

    private function count(string $agent): void
    {
        $this->db->x('INSERT INTO usage (day, agent, calls) VALUES (?, ?, 1) ON CONFLICT (day, agent) DO UPDATE SET calls = calls + 1',
            [$this->today(), $agent]);
    }

    public function usageToday(): array
    {
        return array_column($this->db->q('SELECT agent, calls FROM usage WHERE day=?', [$this->today()]), 'calls', 'agent');
    }

    private function noticeOnce(string $key, string $text): void
    {
        $last = $this->db->q('SELECT kind, meta FROM messages ORDER BY seq DESC LIMIT 1');
        if ($last && $last[0]['kind'] === 'notice' && (json_decode($last[0]['meta'], true)['key'] ?? '') === $key) {
            return;
        }
        $this->post('system', $text, 'notice', ['key' => $key]);
    }

    // ── what each crew member is told ───────────────────────────────────────
    private function aboutBlock(): string
    {
        $memory = $this->db->q('SELECT text FROM memory ORDER BY created_at');
        return $memory ? implode("\n", array_map(fn ($m) => '- ' . $m['text'], $memory)) : '- Nothing saved yet.';
    }

    private function papersBlock(int $limit): string
    {
        $papers = $this->db->q('SELECT title, body FROM papers ORDER BY created_at DESC LIMIT 3');
        if (!$papers) {
            return '';
        }
        $out = "\n" . $this->name() . "'s papers (CV, letters and other saved drafts):\n";
        foreach ($papers as $p) {
            $cut = mb_strlen($p['body']) > $limit ? mb_substr($p['body'], 0, $limit) . ' […]' : $p['body'];
            $out .= "«{$p['title']}»\n$cut\n\n";
        }
        return $out;
    }

    private function system(string $agent, bool $mayPass): string
    {
        $me = Providers::AGENTS[$agent];
        $name = $this->name();
        $does = fn (string $a) => str_replace('Sunny', $name, Providers::AGENTS[$a]['does']);
        $mates = implode("\n", array_map(fn ($a) => '- ' . Providers::AGENTS[$a]['name'] . ' (' . Providers::AGENTS[$a]['role'] . '): ' . $does($a),
            array_values(array_diff(Providers::ORDER, [$agent]))));
        $place = trim($this->db->get('location'));
        $where = $place !== '' ? "$name lives in or near $place." : "Nobody has asked where $name lives yet. It matters for job and support searches, so ask when it becomes relevant and save the answer.";
        $passing = $mayPass
            ? "\nIf a teammate has already said what you would say, reply with the single word PASS and nothing else. A message that only repeats or agrees wastes the reader's attention; add something new, or disagree, or pass.\n"
            : '';
        return <<<TXT
You are {$me['name']}, one of four AI teammates in a private group chat with $name. Your part on the team is {$me['role']}: {$does($agent)}.

Your teammates, who are other AI models in the same chat:
$mates

$name set this chat up because they are struggling: out of work, short of money, and finding it hard to focus. They are often tired when they write. What they need from the team is steady, practical steering towards paid work and a day they can actually get through, one small step at a time.

What the team knows about $name:
{$this->aboutBlock()}
$where
{$this->papersBlock(2500)}
Where things stand right now:
{$this->snapshot()}

How to write here:
- This is a phone chat. Most messages should be one to four sentences. Write longer only when $name asks for a draft, such as a CV section or a cover letter.
- Give one concrete next step that is small enough to do today. If a plan is too big for a tired person, shrink it. When $name has said their energy is low, shrink it again.
- Speak in your own voice from your own role, and build on what teammates said. If a teammate's advice is weak or unrealistic, say so plainly; $name is better served by honest disagreement than by four voices agreeing.
- Be kind and direct. No pep talks, no lectures, no lists of ten options.
- Plain text only. No headings, no tables.
$passing
Being honest about limits:
- In this chat you cannot see the internet yourself. Never invent job adverts, employers who are hiring, links, phone numbers, pay figures or statistics. When current facts are needed, send a scout (below) and say that you have; don't describe results before the scout reports back.
- Do not suggest gambling, crypto or trading punts, get-rich-quick schemes, or anything that costs money up front.
- If $name mentions wanting to harm themselves or not wanting to be here, that comes before any task. Answer warmly, take it seriously, and point them to a person they can talk to now: Samaritans on 116 123 (UK and Ireland, free, any hour), or local emergency services.

Things you can do, by putting a tag on its own line at the end of your message. The app carries them out, removes the tags and shows $name what happened.
[[task: short title | YYYY-MM-DD]] adds an item to $name's to-do list. The date is optional; "today" and "tomorrow" also work. Add a task when $name has agreed to something or asked for a plan, at most two per message, and never one that is already on the list.
[[remember: one fact]] saves a lasting fact about $name, such as skills, past jobs, where they live, constraints or preferences, so the whole team has it in future chats.
[[scout: what to find]] sends your scout, a helper with live web search, to look something up. It reports back in this chat within a few minutes and can put real job adverts into the job tracker. Write the brief so a stranger could act on it: what to find, where, and what would make a result useful. One scout per message, and only when live information would change what $name does next.
[[paper: title]] followed by the full text and then [[/paper]] saves a document such as a CV or cover letter into $name's papers, replacing any paper with the same title. Use it for any draft longer than a few lines, and keep the chat message itself short.
TXT;
    }

    public function snapshot(): string
    {
        $now = $this->now();
        $today = $this->today();
        $tasks = $this->db->q('SELECT title, due, time, top FROM tasks WHERE done=0 ORDER BY due, time LIMIT 40');
        $line = function (array $t) use ($today) {
            $bits = [$t['title']];
            if ($t['time'] !== '') {
                $bits[] = 'at ' . $t['time'];
            }
            if ($t['due'] !== '' && $t['due'] !== $today) {
                $bits[] = 'due ' . $t['due'];
            }
            if ($t['top']) {
                $bits[] = '(top priority)';
            }
            return '  - ' . implode(' ', $bits);
        };
        $todays = array_filter($tasks, fn ($t) => $t['due'] === $today);
        $overdue = array_filter($tasks, fn ($t) => $t['due'] !== '' && $t['due'] < $today);
        $later = array_filter($tasks, fn ($t) => $t['due'] === '' || $t['due'] > $today);
        $out = ['It is ' . $now->format('l j F Y, H:i') . ' for ' . $this->name() . '.'];
        [$day, $level] = array_pad(explode('|', $this->db->get('energy')), 2, '');
        if ($day === $today && $level !== '') {
            $out[] = $this->name() . " says their energy today is $level.";
        }
        $out[] = $todays ? 'To do today (' . count($todays) . '):' : 'Nothing is planned for today yet.';
        array_push($out, ...array_map($line, $todays));
        if ($overdue) {
            $out[] = 'Overdue (' . count($overdue) . '):';
            array_push($out, ...array_map($line, array_slice($overdue, 0, 10)));
        }
        if ($later) {
            $out[] = 'Later or undated (' . count($later) . '):';
            array_push($out, ...array_map($line, array_slice($later, 0, 10)));
        }
        $done = array_column($this->db->q('SELECT title FROM tasks WHERE done=1 AND done_day=?', [$today]), 'title');
        $out[] = $done ? 'Finished today: ' . implode(', ', $done) . '.' : 'Nothing finished yet today.';
        $weekAgo = $now->modify('-6 days')->format('Y-m-d');
        $out[] = 'Finished in the last 7 days: ' . $this->db->q('SELECT COUNT(*) AS n FROM tasks WHERE done=1 AND done_day>=?', [$weekAgo])[0]['n'] . '.';
        $goals = $this->db->q('SELECT id, title, horizon FROM goals WHERE done=0 ORDER BY created_at');
        if ($goals) {
            $out[] = 'Goals:';
            foreach ($goals as $g) {
                $steps = $this->db->q('SELECT done FROM tasks WHERE goal_id=?', [$g['id']]);
                $progress = $steps ? ' (' . array_sum(array_column($steps, 'done')) . '/' . count($steps) . ' steps done)' : '';
                $label = ['week' => 'this week', 'month' => 'this month', 'big' => 'big picture'][$g['horizon']] ?? '';
                $out[] = "  - {$g['title']} [$label]$progress";
            }
        } else {
            $out[] = 'No goals written down yet.';
        }
        $jobs = $this->db->q('SELECT title, company, status, next_step, next_date FROM jobs ORDER BY created_at DESC LIMIT 15');
        if ($jobs) {
            $out[] = 'Job tracker:';
            foreach ($jobs as $j) {
                $next = $j['next_step'] !== '' ? rtrim("; next: {$j['next_step']} {$j['next_date']}") : '';
                $at = $j['company'] !== '' ? " at {$j['company']}" : '';
                $out[] = "  - {$j['title']}$at [{$j['status']}]$next";
            }
        } else {
            $out[] = 'Job tracker is empty.';
        }
        $out_scouts = $this->db->q("SELECT title FROM reports WHERE status IN ('queued','running')");
        if ($out_scouts) {
            $out[] = 'Scouts still out: ' . implode('; ', array_column($out_scouts, 'title')) . '.';
        }
        return implode("\n", $out);
    }

    public function history(string $agent, string $instruction = ''): array
    {
        $rows = array_reverse($this->db->q("SELECT sender, text FROM messages WHERE kind='chat' ORDER BY seq DESC LIMIT " . self::HISTORY));
        $name = $this->name();
        $messages = [];
        foreach ($rows as $row) {
            $body = mb_substr($row['text'], 0, 2000);
            if ($row['sender'] === $agent) {
                [$role, $content] = ['assistant', $body];
            } elseif ($row['sender'] === 'sunny') {
                [$role, $content] = ['user', "$name: $body"];
            } else {
                $who = Providers::AGENTS[$row['sender']] ?? ['name' => $row['sender'], 'role' => ''];
                [$role, $content] = ['user', "{$who['name']} ({$who['role']}): $body"];
            }
            if ($messages && $messages[count($messages) - 1]['role'] === $role) {
                $messages[count($messages) - 1]['content'] .= "\n\n" . $content;
            } else {
                $messages[] = ['role' => $role, 'content' => $content];
            }
        }
        while ($messages && $messages[0]['role'] === 'assistant') {
            array_shift($messages);
        }
        $closing = '';
        if ($instruction !== '') {
            $closing = "[Check-in] $instruction";
        } elseif (!$messages || $messages[count($messages) - 1]['role'] === 'assistant') {
            $closing = "[Check-in] The chat is quiet. Say something useful to $name from your role.";
        }
        if ($closing !== '') {
            if ($messages && $messages[count($messages) - 1]['role'] === 'user') {
                $messages[count($messages) - 1]['content'] .= "\n\n" . $closing;
            } else {
                $messages[] = ['role' => 'user', 'content' => $closing];
            }
        }
        return $messages;
    }

    // ── check-ins ───────────────────────────────────────────────────────────
    public function checkin(string $kind): bool
    {
        $ready = $this->providers->readyAgents();
        if (!$ready) {
            return false;
        }
        $name = $this->name();
        $coach = in_array('claude', $ready, true) ? 'claude' : $ready[0];
        $rotating = $ready[(int) $this->now()->format('z') % count($ready)];
        $plans = [
            'morning' => [[$coach], "It's morning and $name hasn't opened the app yet. Write the message they will wake up to: name the one to three things that matter most today, taken from the list above, and the very first small step. Mention anything a scout brought back overnight that deserves action. If today's list is empty, propose up to two tasks and add them. Under 80 words."],
            'nudge' => [[$rotating], "It's the afternoon and $name hasn't ticked anything off today. Send a short, kind nudge: pick the easiest open item and shrink it into a ten-minute version. No guilt. Under 50 words."],
            'evening' => [[$rotating], "It's evening. Write $name's wrap-up: name what got done today, however small, without flattery, then choose the first thing for tomorrow and add it as a task for tomorrow if it isn't listed. Under 70 words."],
            'weekly' => [$ready, "It's the weekly review. From your own role, tell $name in two or three sentences what moved this week, what is stuck, and the one thing you want them to do next week. Don't repeat teammates."],
        ];
        if (!isset($plans[$kind])) {
            return false;
        }
        foreach ($plans[$kind][0] as $agent) {
            $this->enqueue('chat', 'checkin', $agent, ['instruction' => $plans[$kind][1]]);
        }
        return true;
    }

    public function notifyPhone(): void
    {
        $topic = trim($this->db->get('ntfy_topic'));
        if (!preg_match('/^[A-Za-z0-9_-]{6,64}$/', $topic) || $this->providers->mock) {
            return;
        }
        // Deliberately generic: nothing personal leaves the app this way.
        $ch = curl_init("https://ntfy.sh/$topic");
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => 'Your crew left you a message.',
            CURLOPT_HTTPHEADER => ['Title: Crew'], CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
        curl_exec($ch);
        curl_close($ch);
    }
}

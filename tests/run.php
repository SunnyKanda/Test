<?php
/** Run with:  php tests/run.php   Uses fake replies, so it needs no API keys and costs nothing. */
declare(strict_types=1);
putenv('CREW_MOCK=1');
require __DIR__ . '/../crew-site/lib/bootstrap.php';

$fails = 0;
$count = 0;
function check(bool $ok, string $what): void
{
    global $fails, $count;
    $count++;
    if (!$ok) {
        $fails++;
        echo "FAIL: $what\n";
    }
}
function make(): array
{
    $db = new Db(tempnam(sys_get_temp_dir(), 'crew'));
    $providers = new Providers($db, 'test-secret');
    $team = new Team($db, $providers);
    $team->fakeNow = new DateTimeImmutable('2026-11-11 10:00', $team->tz());
    return [$db, $providers, $team, new Schedule($db, $team)];
}
function drain(Team $team): void
{
    foreach (['chat', 'scout', 'chat'] as $lane) {
        while ($team->workOne($lane) === 'done') {
        }
    }
}
function senders(Db $db): array
{
    return array_column($db->q('SELECT sender FROM messages ORDER BY seq'), 'sender');
}

// everyone answers once; one may pass; the topic picks who leads
[$db, , $team] = make();
$team->userSays('hello, where do I start?');
check($team->pending()['chat'] === 4 && $team->pending()['typing'] === 'claude', 'four replies queued, claude first');
drain($team);
check(senders($db) === ['sunny', 'claude', 'gpt', 'grok'], 'gemini passed: ' . implode(',', senders($db)));
check(count($db->q('SELECT id FROM tasks')) === 1, 'duplicate to-do not added twice');
check($db->q('SELECT text FROM memory')[0]['text'] === 'Wants a job quickly', 'fact remembered');
check(!array_filter($db->q('SELECT text FROM messages'), fn ($m) => str_contains($m['text'], '[[') || str_starts_with($m['text'], 'GPT:')), 'tags and name prefix stripped');
check($team->pending()['chat'] === 0, 'queue empty after work');

[$db, , $team] = make();
$team->userSays('can someone look at my cv');
drain($team);
check(senders($db)[1] === 'gpt', 'cv question led by gpt');

[$db, , $team] = make();
$team->userSays('@grokbot any ideas?');
drain($team);
check(senders($db) === ['sunny', 'grok'], 'mention asks only grok');

// a failing member is reported and the rest carry on
[$db, , $team] = make();
putenv('CREW_MOCK_FAIL=claude');
$team->userSays('hello');
drain($team);
putenv('CREW_MOCK_FAIL');
$rows = $db->q('SELECT sender, kind, text FROM messages ORDER BY seq');
check($rows[1]['kind'] === 'notice' && str_contains($rows[1]['text'], 'rejected') && in_array('gpt', senders($db), true), 'failure shown, others reply');

// daily limit
[$db, , $team] = make();
$db->set('daily_cap', '1');
foreach ([1, 2] as $_) {
    $team->userSays('@claude hello');
    drain($team);
}
check(count(array_keys(senders($db), 'claude')) === 1 && count($db->q("SELECT seq FROM messages WHERE kind='notice'")) === 1, 'daily limit holds, one notice');

// no keys
[$db, $providers, $team] = make();
$providers->mock = false;
$team->userSays('hello');
check(str_contains($db->q('SELECT text FROM messages ORDER BY seq DESC LIMIT 1')[0]['text'], 'Settings'), 'no keys explained');

// history always ends with the user
[$db, , $team] = make();
$team->post('claude', 'morning');
$h = $team->history('claude');
check(end($h)['role'] === 'user' && $h[0]['role'] === 'user', 'history ends with a user turn');

// a crew member sends a scout; real leads land in the tracker, unsourced ones don't
[$db, , $team] = make();
$team->userSays('@gpt find me warehouse jobs');
drain($team);
$msgs = $db->q('SELECT sender, text, meta FROM messages ORDER BY seq');
check(count($msgs) === 3 && str_starts_with($msgs[2]['text'], 'Scout report:'), 'scout reported back in chat');
check(!str_contains($msgs[2]['text'], '---') && !str_contains($msgs[2]['text'], '[['), 'chat gets the summary only');
$jobs = $db->q('SELECT title, link, added_by FROM jobs');
check(count($jobs) === 1 && $jobs[0]['link'] === 'https://example.com/jobs/123', 'only the sourced job lead was kept');
$report = $db->q('SELECT * FROM reports')[0];
check($report['status'] === 'done' && count(json_decode($report['sources'], true)) === 2 && !str_contains($report['body'], '[['), 'report saved with sources');
check($db->q("SELECT due FROM tasks WHERE title LIKE 'Apply%'")[0]['due'] === '2026-11-12', 'scout task dated tomorrow');
check($team->sendScout('gpt', 'x') !== '' && $team->sendScout('gpt', 'x') === '', 'identical scout not sent twice');

// scout falls back to another crew member, then reports failure honestly
[$db, , $team] = make();
putenv('CREW_MOCK_FAIL=grok');
$team->sendScout('grok', 'find gigs');
drain($team);
putenv('CREW_MOCK_FAIL');
check($db->q('SELECT status FROM reports')[0]['status'] === 'done', 'scout fell back to another member');

// papers
[$db, , $team] = make();
$team->userSays('@claude write my cv');
drain($team);
$paper = $db->q('SELECT title, body FROM papers');
check(count($paper) === 1 && $paper[0]['title'] === 'CV draft' && str_contains($paper[0]['body'], 'Warehouse'), 'paper saved');
check(!str_contains($db->q('SELECT text FROM messages ORDER BY seq DESC LIMIT 1')[0]['text'], 'Warehouse operative, 3'), 'paper text kept out of chat');

// check-ins: window, once a day, nudge rule, standing scouts
[$db, , $team, $sched] = make();
$at = fn (string $t) => new DateTimeImmutable($t, $team->tz());
check($sched->dueCheckins($at('2026-11-11 07:59')) === [], 'nothing before 8');
check($sched->dueCheckins($at('2026-11-11 08:00')) === ['morning'], 'morning due at 8');
check($sched->dueCheckins($at('2026-11-11 12:30')) === [], 'morning window closed');
check($sched->dueCheckins($at('2026-11-11 20:05')) === ['evening'], 'evening, no weekly on Wednesday');
check(in_array('weekly', $sched->dueCheckins($at('2026-11-15 18:30')), true), 'weekly on Sunday');
$team->fakeNow = $at('2026-11-11 08:01');
check($sched->tick() === ['morning'] && $sched->tick() === [], 'morning queued once');
drain($team);
check(senders($db) === ['claude'], 'morning written by the coach');
$team->fakeNow = $at('2026-11-11 14:31');
$db->insert('tasks', ['title' => 'a', 'due' => '2026-11-11']);
$db->insert('tasks', ['title' => 'b', 'due' => '2026-11-11', 'done' => 1, 'done_day' => '2026-11-11']);
check($sched->tick() === [], 'no nudge when something is ticked off');
$team->firstRun();
check(count($db->q('SELECT id FROM scouts WHERE enabled=0')) === 3, 'three standing scouts seeded, switched off');
$db->x("UPDATE scouts SET enabled=1");
$team->fakeNow = $at('2026-11-12 06:00');
check($sched->tick() === [], 'scouts wait for their time');
$team->fakeNow = $at('2026-11-12 07:05');
check(count($sched->tick()) === 3 && $sched->tick() === [], 'standing scouts sent once');
drain($team);
$team->fakeNow = $at('2026-11-13 07:05');
check($sched->tick() === ['scout:Job scout'], 'next day only the daily scout goes');

// keys
[$db, $providers] = make();
$providers->setKey('grok', 'xai-secret-123');
check(!str_contains($db->get('key_grok'), 'xai-secret') && $providers->key('grok') === 'xai-secret-123', 'key stored encrypted');
check((new Providers($db, 'other'))->key('grok') === '', 'wrong secret cannot read key');

// model ranking
check(Providers::rank('gpt', [['gpt-5-pro', 9], ['gpt-image-2', 8], ['gpt-5.6-terra', 7], ['gpt-5-2025-08-07', 6], ['text-embedding-3', 5]])[0] === 'gpt-5.6-terra', 'gpt ranking');
check(array_slice(Providers::rank('gemini', [['gemini-3.1-pro-preview', 0], ['gemini-3.5-flash', 0], ['gemini-3.1-flash-lite', 0], ['gemini-flash-latest', 0], ['gemini-embedding-001', 0]]), 0, 2) === ['gemini-flash-latest', 'gemini-3.5-flash'], 'gemini ranking');
check(Providers::rank('grok', [['grok-4.6', 20], ['grok-imagine-image', 30], ['grok-4-0709', 10]]) === ['grok-4.6', 'grok-4-0709'], 'grok ranking');

// real request shapes, answered by a fake network
[$db, $providers] = make();
$providers->mock = false;
foreach (['gpt', 'gemini', 'grok', 'claude'] as $a) {
    $providers->setKey($a, "key-$a");
}
$seen = [];
$providers->http = function ($method, $url, $headers, $body) use (&$seen) {
    $seen[] = [$method, $url, $headers, $body];
    if (str_ends_with($url, '/models')) {
        return [200, ['data' => [['id' => 'models/gemini-flash-latest', 'created' => 1], ['id' => 'gpt-5.6-terra', 'created' => 5], ['id' => 'grok-4.6', 'created' => 5]]]];
    }
    if (str_ends_with($url, '/chat/completions')) {
        return [200, ['choices' => [['message' => ['content' => ' hello there ']]]]];
    }
    if (str_ends_with($url, '/responses')) {
        return [200, ['output' => [['type' => 'web_search_call'], ['type' => 'message', 'content' => [['type' => 'output_text', 'text' => 'Found it.',
            'annotations' => [['type' => 'url_citation', 'url' => 'https://a.example/x', 'title' => 'A']]]]]]]];
    }
    if (str_contains($url, ':generateContent')) {
        return [200, ['candidates' => [['content' => ['parts' => [['text' => 'Grounded.']]],
            'groundingMetadata' => ['groundingChunks' => [['web' => ['uri' => 'https://vertexaisearch.cloud.google.com/r/1', 'title' => 'gov.uk']]]]]]]];
    }
    return [404, []];
};
check($providers->complete('gpt', 'sys', [['role' => 'user', 'content' => 'hi']]) === 'hello there', 'gpt chat parsed');
check($seen[0][1] === 'https://api.openai.com/v1/models' && $seen[1][3]['model'] === 'gpt-5.6-terra' && $seen[1][3]['messages'][0]['role'] === 'system', 'gpt auto model + system message');
$r = $providers->research('grok', 'sys', 'brief');
check($r['text'] === 'Found it.' && $r['sources'][0]['url'] === 'https://a.example/x', 'grok web search parsed');
$last = end($seen);
check($last[1] === 'https://api.x.ai/v1/responses' && $last[3]['tools'] === [['type' => 'web_search']] && $last[2]['Authorization'] === 'Bearer key-grok', 'grok request shape');
$r = $providers->research('gemini', 'sys', 'brief');
$last = end($seen);
check($r['text'] === 'Grounded.' && $r['sources'][0]['title'] === 'gov.uk' && str_contains($last[1], '/models/gemini-flash-latest:generateContent') && isset($last[3]['tools'][0]['google_search']), 'gemini grounding parsed');
$providers->http = fn () => [429, ['error' => ['message' => 'quota']]];
try {
    $providers->complete('gpt', 's', [['role' => 'user', 'content' => 'x']]);
    check(false, 'should have thrown');
} catch (ProviderError $e) {
    check(str_contains($e->getMessage(), 'out of credit'), 'billing error explained');
}

// Claude through the official SDK, with a fake transport
$sent = [];
$providers->claudeTransport = new class($sent) implements Psr\Http\Client\ClientInterface {
    public function __construct(public array &$sent)
    {
    }
    public function sendRequest(Psr\Http\Message\RequestInterface $request): Psr\Http\Message\ResponseInterface
    {
        $body = json_decode((string) $request->getBody(), true);
        $this->sent[] = ['url' => (string) $request->getUri(), 'body' => $body, 'beta' => $request->getHeaderLine('anthropic-beta')];
        $content = isset($body['tools'])
            ? [['type' => 'server_tool_use', 'id' => 'srvtoolu_1', 'name' => 'web_search', 'input' => ['query' => 'jobs']],
               ['type' => 'web_search_tool_result', 'tool_use_id' => 'srvtoolu_1', 'content' => [['type' => 'web_search_result', 'url' => 'https://jobs.example/1', 'title' => 'Job one', 'encrypted_content' => 'x', 'page_age' => null]]],
               ['type' => 'text', 'text' => 'One advert found.', 'citations' => [['type' => 'web_search_result_location', 'url' => 'https://jobs.example/2', 'title' => 'Job two', 'cited_text' => 'c', 'encrypted_index' => 'e']]]]
            : [['type' => 'thinking', 'thinking' => '', 'signature' => 's'], ['type' => 'text', 'text' => 'Hello from Claude.']];
        return new GuzzleHttp\Psr7\Response(200, ['content-type' => 'application/json'], json_encode([
            'id' => 'msg_1', 'type' => 'message', 'role' => 'assistant', 'model' => 'claude-opus-5-5', 'content' => $content,
            'stop_reason' => 'end_turn', 'stop_sequence' => null, 'usage' => ['input_tokens' => 1, 'output_tokens' => 1]]));
    }
};
try {
    check($providers->complete('claude', 'sys', [['role' => 'user', 'content' => 'hi']]) === 'Hello from Claude.', 'claude chat parsed');
    check($sent[0]['body']['fallbacks'] === 'default' && str_contains($sent[0]['beta'], 'server-side-fallback-2026-07-01')
        && $sent[0]['body']['output_config'] === ['effort' => 'medium'] && $sent[0]['body']['max_tokens'] === 16000, 'claude request shape: ' . json_encode($sent[0]));
    $r = $providers->research('claude', 'sys', 'brief');
    check($r['text'] === 'One advert found.' && array_column($r['sources'], 'url') === ['https://jobs.example/1', 'https://jobs.example/2'], 'claude web search parsed: ' . json_encode($r));
    check($sent[1]['body']['tools'] === [['type' => 'web_search_20260209', 'name' => 'web_search', 'max_uses' => 6]], 'claude web tool shape: ' . json_encode($sent[1]['body']['tools'] ?? null));
} catch (Throwable $e) {
    check(false, 'claude path threw: ' . get_class($e) . ': ' . $e->getMessage());
}

echo $fails ? "\n$fails of $count checks failed\n" : "all $count checks passed\n";
exit($fails ? 1 : 0);

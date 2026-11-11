<?php
/** Everything the screens talk to. Called as api.php?r=route, with GET or POST only so any host allows it. */
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

$app = crew_boot();
$db = $app['db'];
$providers = $app['providers'];
$team = $app['team'];
$schedule = $app['schedule'];
$secret = $app['conf']['secret'];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $message, int $status = 400): never
{
    out(['detail' => $message], $status);
}

$route = trim((string) ($_GET['r'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'] === 'GET' ? 'GET' : strtoupper((string) ($_GET['_m'] ?? 'POST'));
$body = [];
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    // A custom header can't be sent by another site's form, which blocks forged requests.
    if (($_SERVER['HTTP_X_CREW'] ?? '') !== '1') {
        fail('Request refused.', 403);
    }
    $body = json_decode(file_get_contents('php://input') ?: '[]', true);
    $body = is_array($body) ? $body : [];
}
[$head, $arg, $tail] = array_pad(explode('/', $route), 3, '');

// ── sign-in ──────────────────────────────────────────────────────────────────
const COOKIE = 'crew_session';
const SESSION_DAYS = 60;
$sign = fn (int $expires) => $expires . '.' . hash_hmac('sha256', "session:$expires", $secret);
$signedIn = (function () use ($sign) {
    $token = (string) ($_COOKIE[COOKIE] ?? '');
    $expires = (int) strtok($token, '.');
    return $expires > time() && hash_equals($sign($expires), $token);
})();
$hasPassword = $db->get('password_hash') !== '';
$startSession = function () use ($sign) {
    $expires = time() + SESSION_DAYS * 86400;
    $https = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    setcookie(COOKIE, $sign($expires), ['expires' => $expires, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => $https]);
};

if ($route === 'auth') {
    out(['ok' => $signedIn && $hasPassword, 'setup' => !$hasPassword]);
}
if ($route === 'setup' && $method === 'POST') {
    if ($hasPassword) {
        fail('A password has already been set.', 403);
    }
    $password = (string) ($body['password'] ?? '');
    if (strlen($password) < 8) {
        fail('Use at least 8 characters.');
    }
    $db->set('password_hash', password_hash($password, PASSWORD_DEFAULT));
    $team->firstRun();
    $startSession();
    out(['ok' => true]);
}
if ($route === 'login' && $method === 'POST') {
    $recent = array_values(array_filter(json_decode($db->get('login_fails', '[]'), true) ?: [], fn ($t) => $t > time() - 600));
    if (count($recent) >= 8) {
        fail('Too many wrong tries. Wait ten minutes.', 429);
    }
    if (!$hasPassword || !password_verify((string) ($body['password'] ?? ''), $db->get('password_hash'))) {
        $db->set('login_fails', json_encode([...$recent, time()]), false);
        fail("That password isn't right.", 401);
    }
    $db->set('login_fails', '[]', false);
    $startSession();
    out(['ok' => true]);
}
if ($route === 'logout') {
    setcookie(COOKIE, '', ['expires' => 1, 'path' => '/']);
    out(['ok' => true]);
}
if (!$signedIn || !$hasPassword) {
    fail('Sign in first.', 401);
}

// ── what the screens show ────────────────────────────────────────────────────
$agentsView = function () use ($db, $providers, $team) {
    $usage = $team->usageToday();
    $out = [];
    foreach (Providers::ORDER as $id) {
        $a = Providers::AGENTS[$id];
        $out[] = ['id' => $id, 'name' => $a['name'], 'role' => $a['role'], 'does' => $a['does'], 'scout' => $a['scout'],
            'key_url' => $a['key_url'], 'has_key' => $providers->mock || $providers->key($id) !== '',
            'enabled' => $providers->enabled($id), 'ready' => $providers->ready($id),
            'model' => $db->get("model_$id") ?: $a['default_model'], 'auto_model' => $db->get("auto_model_$id"),
            'replies_today' => (int) ($usage[$id] ?? 0)];
    }
    return $out;
};
$settingsView = function () use ($db, $team, $app) {
    [$day, $level] = array_pad(explode('|', $db->get('energy')), 2, '');
    $self = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost')
        . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    $out = ['name' => $team->name(), 'timezone' => $db->get('timezone', 'Europe/London'), 'location' => $db->get('location'),
        'reply_mode' => $db->get('reply_mode', 'team'), 'daily_cap' => (int) $db->get('daily_cap', '60'),
        'checkins' => $db->get('checkins', '1') === '1', 'ntfy_topic' => $db->get('ntfy_topic'),
        'time_scouts' => $db->get('time_scouts', '07:00'), 'today' => $team->today(),
        'energy' => $day === $team->today() ? $level : '',
        'cron_command' => 'php ' . realpath(__DIR__ . '/cron.php'),
        'cron_url' => $self . '/cron.php?key=' . $app['conf']['cron'],
        'last_cron' => (int) $db->get('last_cron', '0')];
    foreach (Schedule::TIMES as $kind => $default) {
        $out["time_$kind"] = $db->get("time_$kind", $default);
        $out["on_$kind"] = $db->get("on_$kind", '1') === '1';
    }
    return $out;
};
$data = function () use ($db, $team, $agentsView, $settingsView) {
    $cutoff = $team->now()->modify('-90 days')->format('Y-m-d');
    $reports = $db->q('SELECT * FROM reports ORDER BY created_at DESC LIMIT 60');
    foreach ($reports as &$r) {
        $r['sources'] = json_decode($r['sources'], true) ?: [];
    }
    return ['version' => $db->version(), 'settings' => $settingsView(), 'agents' => $agentsView(),
        'tasks' => $db->q('SELECT * FROM tasks WHERE done=0 OR done_day>=? ORDER BY created_at, rowid', [$cutoff]),
        'goals' => $db->q('SELECT * FROM goals ORDER BY created_at, rowid'),
        'jobs' => $db->q('SELECT * FROM jobs ORDER BY created_at DESC, rowid DESC'),
        'memory' => $db->q('SELECT * FROM memory ORDER BY created_at, rowid'),
        'papers' => $db->q('SELECT * FROM papers ORDER BY created_at DESC, rowid DESC'),
        'scouts' => $db->q('SELECT * FROM scouts ORDER BY created_at, rowid'),
        'reports' => $reports];
};

if ($route === 'poll') {
    // With the app open, this doubles as the clock for check-ins and standing scouts.
    if (time() - (int) $db->get('last_tick', '0') >= 60) {
        $db->set('last_tick', (string) time(), false);
        $team->firstRun();
        $schedule->tick();
    }
    $after = (int) ($_GET['after'] ?? 0);
    $messages = $after > 0
        ? $db->q('SELECT * FROM messages WHERE seq>? ORDER BY seq', [$after])
        : array_reverse($db->q('SELECT * FROM messages ORDER BY seq DESC LIMIT 200'));
    foreach ($messages as &$m) {
        $m['meta'] = json_decode($m['meta'], true) ?: new stdClass();
    }
    $pending = $team->pending();
    $result = ['messages' => $messages, 'typing' => $pending['typing'], 'pending' => ['chat' => $pending['chat'], 'scout' => $pending['scout']],
        'version' => $db->version()];
    if ((int) ($_GET['version'] ?? 0) !== $result['version']) {
        $result['data'] = $data();
    }
    out($result);
}

if ($route === 'work' && $method === 'POST') {
    // One piece of work per request. The work carries on even if the phone drops the connection.
    $lane = ($_GET['lane'] ?? 'chat') === 'scout' ? 'scout' : 'chat';
    ignore_user_abort(true);
    @set_time_limit(240);
    session_write_close();
    out(['state' => $team->workOne($lane)]);
}

// ── chat ─────────────────────────────────────────────────────────────────────
if ($route === 'messages' && $method === 'POST') {
    $text = mb_substr(trim((string) ($body['text'] ?? '')), 0, 6000);
    if ($text === '') {
        fail('Write something first.');
    }
    $message = $team->userSays($text);
    $message['seq'] = (int) $db->q('SELECT seq FROM messages WHERE id=?', [$message['id']])[0]['seq'];
    $message['meta'] = new stdClass();
    out($message);
}
if ($head === 'checkin' && $method === 'POST') {
    if (!isset(Schedule::TIMES[$arg])) {
        fail('No such check-in.', 404);
    }
    if (!$team->checkin($arg)) {
        fail('Add an API key for at least one crew member first.');
    }
    out(['ok' => true]);
}
if ($route === 'energy' && $method === 'POST') {
    $level = (string) ($body['level'] ?? '');
    if (!in_array($level, ['low', 'okay', 'good', ''], true)) {
        fail('Pick low, okay or good.');
    }
    $db->set('energy', $level === '' ? '' : $team->today() . '|' . $level);
    out(['ok' => true]);
}

// ── scouts ───────────────────────────────────────────────────────────────────
if ($route === 'scout' && $method === 'POST') {
    $brief = mb_substr(trim((string) ($body['brief'] ?? '')), 0, 600);
    $agent = (string) ($body['agent'] ?? 'claude');
    if ($brief === '' || !isset(Providers::AGENTS[$agent])) {
        fail('Say what the scout should look for.');
    }
    if (!$providers->readyAgents()) {
        fail('Add an API key for at least one crew member first.');
    }
    $id = $team->sendScout($agent, $brief);
    $id === '' ? fail('A scout is already out looking for exactly that.') : out(['ok' => true, 'report_id' => $id]);
}
if ($head === 'scouts' && $tail === 'run' && $method === 'POST') {
    $scout = $db->q('SELECT * FROM scouts WHERE id=?', [$arg])[0] ?? fail('No such scout.', 404);
    if (!$providers->readyAgents()) {
        fail('Add an API key for at least one crew member first.');
    }
    $id = $team->sendScout($scout['agent'], $scout['brief'], $scout['title'], $scout['id']);
    $id === '' ? fail('That scout is already out.') : out(['ok' => true, 'report_id' => $id]);
}

// ── to-do, goals, jobs, notes, papers, standing scouts ──────────────────────
const FIELDS = [
    'tasks' => ['title' => 200, 'notes' => 2000, 'due' => 'day', 'time' => 'clock', 'done' => 'flag', 'top' => 'flag', 'goal_id' => 32],
    'goals' => ['title' => 200, 'why' => 1000, 'horizon' => ['week', 'month', 'big'], 'done' => 'flag'],
    'jobs' => ['title' => 200, 'company' => 200, 'link' => 500, 'next_step' => 300, 'next_date' => 'day', 'notes' => 2000,
               'status' => ['lead', 'applied', 'interview', 'offer', 'closed']],
    'memory' => ['text' => 300],
    'papers' => ['title' => 120, 'body' => 60000],
    'scouts' => ['title' => 80, 'brief' => 600, 'agent' => ['claude', 'gpt', 'gemini', 'grok'], 'cadence' => ['daily', 'weekly'], 'enabled' => 'flag'],
    'reports' => ['seen' => 'flag'],
];
$clean = function (string $table, array $body) {
    $out = [];
    foreach (FIELDS[$table] as $field => $rule) {
        if (!array_key_exists($field, $body)) {
            continue;
        }
        $value = $body[$field];
        if ($rule === 'flag') {
            $out[$field] = $value ? 1 : 0;
        } elseif ($rule === 'day' || $rule === 'clock') {
            $value = (string) ($value ?? '');
            if ($value !== '' && !preg_match($rule === 'day' ? '/^\d{4}-\d{2}-\d{2}$/' : '/^\d{2}:\d{2}$/', $value)) {
                fail("That $field isn't valid.");
            }
            $out[$field] = $value;
        } elseif (is_array($rule)) {
            if (!in_array($value, $rule, true)) {
                fail("That $field isn't valid.");
            }
            $out[$field] = $value;
        } else {
            $out[$field] = mb_substr(trim((string) ($value ?? '')), 0, $rule);
        }
    }
    if ($table === 'jobs' && ($out['link'] ?? '') !== '' && !preg_match('#^https?://#i', $out['link'])) {
        $out['link'] = 'https://' . $out['link'];
    }
    return $out;
};
if (isset(FIELDS[$head]) && $tail === '') {
    $main = ['memory' => 'text', 'reports' => ''][$head] ?? 'title';
    $stamp = function (array &$changes, string $id) use ($db, $team, $head) {
        if (array_key_exists('done', $changes)) {
            $changes['done_day'] = $changes['done'] ? $team->today() : '';
        }
        if ($head === 'jobs' && ($changes['status'] ?? '') === 'applied') {
            $current = $id !== '' ? $db->q('SELECT applied_day FROM jobs WHERE id=?', [$id]) : [];
            if (!$current || $current[0]['applied_day'] === '') {
                $changes['applied_day'] = $team->today();
            }
        }
    };
    if ($method === 'POST' && $arg === '' && $head !== 'reports') {
        $changes = $clean($head, $body);
        if (($changes[$main] ?? '') === '' || ($head === 'scouts' && ($changes['brief'] ?? '') === '')) {
            fail($head === 'scouts' ? 'Give the scout a name and say what to look for.' : 'Give it a name first.');
        }
        $stamp($changes, '');
        out($db->insert($head, $changes));
    }
    if ($method === 'PATCH' && $arg !== '') {
        $changes = $clean($head, $body);
        if ($main !== '' && array_key_exists($main, $changes) && $changes[$main] === '') {
            fail('It needs a name.');
        }
        $stamp($changes, $arg);
        $db->update($head, $arg, $changes);
        out(['ok' => true]);
    }
    if ($method === 'DELETE' && $arg !== '') {
        $db->delete($head, $arg);
        if ($head === 'goals') {
            $db->x("UPDATE tasks SET goal_id='' WHERE goal_id=?", [$arg]);
        }
        out(['ok' => true]);
    }
}

// ── settings ─────────────────────────────────────────────────────────────────
if ($route === 'settings' && $method === 'PUT') {
    if (isset($body['name'])) {
        $db->set('name', mb_substr(trim((string) $body['name']), 0, 40) ?: 'Sunny');
    }
    if (isset($body['location'])) {
        $db->set('location', mb_substr(trim((string) $body['location']), 0, 120));
    }
    if (isset($body['timezone'])) {
        try {
            new DateTimeZone((string) $body['timezone']);
        } catch (Throwable) {
            fail("That timezone isn't recognised. Try one like Europe/London.");
        }
        $db->set('timezone', (string) $body['timezone']);
    }
    if (in_array($body['reply_mode'] ?? null, ['team', 'one'], true)) {
        $db->set('reply_mode', $body['reply_mode']);
    }
    if (isset($body['daily_cap'])) {
        if (!is_numeric($body['daily_cap'])) {
            fail('The daily limit must be a number.');
        }
        $db->set('daily_cap', (string) max(1, min(500, (int) $body['daily_cap'])));
    }
    if (isset($body['checkins'])) {
        $db->set('checkins', $body['checkins'] ? '1' : '0');
    }
    if (isset($body['ntfy_topic'])) {
        $topic = trim((string) $body['ntfy_topic']);
        if ($topic !== '' && !preg_match('/^[A-Za-z0-9_-]{6,64}$/', $topic)) {
            fail('Use 6 to 64 letters, numbers, dashes or underscores.');
        }
        $db->set('ntfy_topic', $topic);
    }
    foreach ([...array_keys(Schedule::TIMES), 'scouts'] as $kind) {
        if (isset($body["time_$kind"])) {
            if (!preg_match('/^\d{2}:\d{2}$/', (string) $body["time_$kind"])) {
                fail('Times look like 08:00.');
            }
            $db->set("time_$kind", $body["time_$kind"]);
        }
        if (isset($body["on_$kind"])) {
            $db->set("on_$kind", $body["on_$kind"] ? '1' : '0');
        }
    }
    if (isset($body['new_password'])) {
        if (strlen((string) $body['new_password']) < 8) {
            fail('Use at least 8 characters.');
        }
        $db->set('password_hash', password_hash((string) $body['new_password'], PASSWORD_DEFAULT));
    }
    out($settingsView());
}
if ($head === 'agents' && isset(Providers::AGENTS[$arg])) {
    if ($tail === '' && $method === 'PUT') {
        if (isset($body['key'])) {
            $providers->setKey($arg, (string) $body['key']);
        }
        if (isset($body['model'])) {
            $db->set("model_$arg", mb_substr(trim((string) $body['model']), 0, 100));
            $db->set("auto_model_$arg", '');
        }
        if (isset($body['enabled'])) {
            $db->set("enabled_$arg", $body['enabled'] ? '1' : '0');
        }
        out(['ok' => true]);
    }
    if ($tail === 'models') {
        if (!$providers->mock && $providers->key($arg) === '') {
            fail('Add a key first.');
        }
        try {
            out(['models' => $providers->listModels($arg)]);
        } catch (ProviderError $e) {
            fail($e->getMessage());
        }
    }
    if ($tail === 'test' && $method === 'POST') {
        @set_time_limit(200);
        try {
            $reply = $providers->complete($arg, 'You are being connection-tested. Reply with a short friendly hello, five words at most.',
                [['role' => 'user', 'content' => 'Say hello.']]);
            $model = $db->get("model_$arg") ?: Providers::AGENTS[$arg]['default_model'];
            out(['ok' => true, 'reply' => mb_substr($reply, 0, 200), 'model' => $model === 'auto' ? ($db->get("auto_model_$arg") ?: 'auto') : $model]);
        } catch (ProviderError $e) {
            out(['ok' => false, 'error' => $e->getMessage()]);
        }
    }
    if ($tail === 'test-web' && $method === 'POST') {
        @set_time_limit(240);
        try {
            $found = $providers->research($arg, 'You are being connection-tested. Use web search once, then answer in one short sentence.',
                'What is the top headline on bbc.co.uk/news right now?');
            out(['ok' => true, 'reply' => mb_substr($found['text'], 0, 240), 'sources' => count($found['sources'])]);
        } catch (ProviderError $e) {
            out(['ok' => false, 'error' => $e->getMessage()]);
        }
    }
}

fail('Not found.', 404);

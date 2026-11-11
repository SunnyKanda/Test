<?php
/**
 * Runs the crew while nobody has the app open: sends check-ins, sends standing scouts,
 * and finishes any replies still waiting. Point a cron job at this file:
 *
 *     php /full/path/to/cron.php
 *
 * or call it over the web with the key shown in Settings:  cron.php?key=...
 */
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

$cli = PHP_SAPI === 'cli';
$app = crew_boot();
if (!$cli) {
    header('Content-Type: text/plain; charset=utf-8');
    if (!hash_equals($app['conf']['cron'], (string) ($_GET['key'] ?? ''))) {
        http_response_code(403);
        exit("Wrong key.\n");
    }
}
ignore_user_abort(true);
@set_time_limit($cli ? 600 : 110);
$deadline = time() + ($cli ? 480 : 60);
$db = $app['db'];
$team = $app['team'];

$before = (int) ($db->q('SELECT COALESCE(MAX(seq), 0) AS n FROM messages')[0]['n']);
$team->firstRun();
$queued = $app['schedule']->tick();
$done = 0;
foreach (['chat', 'scout', 'chat'] as $lane) {
    while (time() < $deadline && $team->workOne($lane) === 'done') {
        $done++;
    }
}
$db->set('last_cron', (string) time(), false);
$new = $db->q("SELECT COUNT(*) AS n FROM messages WHERE seq>? AND sender NOT IN ('sunny','system')", [$before])[0]['n'];
if ($new > 0) {
    $team->notifyPhone();
}
echo 'ok: queued ' . count($queued) . ", did $done, $new new message(s)\n";

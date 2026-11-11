<?php
/** Shared start-up: finds the private data folder, opens the database, loads the classes. */
declare(strict_types=1);

if (PHP_VERSION_ID < 80100) {
    http_response_code(500);
    exit('Crew needs PHP 8.1 or newer. Change the PHP version in your hosting control panel.');
}

const CREW_ROOT = __DIR__ . '/..';

require_once __DIR__ . '/Db.php';
require_once __DIR__ . '/Providers.php';
require_once __DIR__ . '/Team.php';
require_once __DIR__ . '/Schedule.php';
if (is_file(CREW_ROOT . '/vendor/autoload.php')) {
    require_once CREW_ROOT . '/vendor/autoload.php';
}

/** Where the database and secret live. Outside the web folder when the host allows it. */
function crew_data_dir(): string
{
    // The web side records where the data lives, so the cron job (which can't see the web root) finds it too.
    $pointer = __DIR__ . '/datapath.php';
    if (!getenv('CREW_DATA_DIR') && is_file($pointer)) {
        $known = require $pointer;
        if (is_string($known) && is_file($known . '/secret.php')) {
            return $known;
        }
    }
    $override = getenv('CREW_DATA_DIR');
    if ($override) {
        $candidates = [$override];
    } else {
        $candidates = [];
        $docroot = isset($_SERVER['DOCUMENT_ROOT']) ? realpath($_SERVER['DOCUMENT_ROOT']) : false;
        if ($docroot) {
            $candidates[] = dirname($docroot) . '/crew-data';
        }
        $candidates[] = CREW_ROOT . '/data';
    }
    // Reuse a folder that already holds the database, so web and cron agree.
    foreach ($candidates as $dir) {
        if (is_file($dir . '/secret.php')) {
            if (!getenv('CREW_DATA_DIR') && !is_file($pointer)) {
                @file_put_contents($pointer, "<?php return " . var_export($dir, true) . ";\n", LOCK_EX);
            }
            return $dir;
        }
    }
    foreach ($candidates as $dir) {
        if ((is_dir($dir) || @mkdir($dir, 0700, true)) && is_writable($dir)) {
            if (!getenv('CREW_DATA_DIR')) {
                @file_put_contents($pointer, "<?php return " . var_export($dir, true) . ";\n", LOCK_EX);
            }
            if (!is_file($dir . '/.htaccess')) {
                @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
                @file_put_contents($dir . '/index.html', '');
            }
            return $dir;
        }
    }
    http_response_code(500);
    exit('Crew cannot create its data folder. Make the "data" folder inside the app writable (permissions 755).');
}

/** A random secret, created once. Signs sign-in cookies and encrypts stored API keys. */
function crew_secret(string $dir): array
{
    $file = $dir . '/secret.php';
    if (!is_file($file)) {
        $made = ['secret' => bin2hex(random_bytes(32)), 'db' => 'crew-' . bin2hex(random_bytes(8)) . '.sqlite',
                 'cron' => bin2hex(random_bytes(12))];
        file_put_contents($file, "<?php return " . var_export($made, true) . ";\n", LOCK_EX);
        @chmod($file, 0600);
    }
    return require $file;
}

function crew_boot(): array
{
    if (!extension_loaded('pdo_sqlite') || !extension_loaded('curl') || !extension_loaded('sodium')) {
        http_response_code(500);
        exit('Crew needs the PHP extensions pdo_sqlite, curl and sodium. Switch them on in your hosting control panel.');
    }
    $dir = crew_data_dir();
    $conf = crew_secret($dir);
    $db = new Db($dir . '/' . $conf['db']);
    $providers = new Providers($db, $conf['secret']);
    $team = new Team($db, $providers);
    $schedule = new Schedule($db, $team);
    return ['db' => $db, 'providers' => $providers, 'team' => $team, 'schedule' => $schedule, 'conf' => $conf];
}

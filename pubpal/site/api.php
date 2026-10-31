<?php
// PubPal JSON API. Every request is api.php?action=<name>.

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/osm.php';

const MAX_RADIUS_KM = 25;
const MIN_PASSWORD_LENGTH = 8;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond($data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function fail(string $message, int $status = 400): never
{
    respond(['detail' => $message], $status);
}

function body(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($data)) {
        fail('Request body must be JSON');
    }
    return $data;
}

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        fail("Use $method for this", 405);
    }
}

function number_param(string $name, float $min, float $max, ?float $default = null): float
{
    $raw = $_GET[$name] ?? null;
    if ($raw === null || $raw === '') {
        if ($default === null) {
            fail("Missing $name");
        }
        return $default;
    }
    if (!is_numeric($raw) || $raw < $min || $raw > $max) {
        fail("$name must be a number between $min and $max", 422);
    }
    return (float) $raw;
}

function id_param(): int
{
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) {
        fail('Missing or bad id');
    }
    return $id;
}

/** Turn a suggestion request body into validated column => value changes. */
function suggestion_changes(array $b): array
{
    $limits = ['name' => 120, 'address' => 200, 'postcode' => 10, 'phone' => 30, 'website' => 200];
    $changes = [];
    foreach ($limits as $field => $max) {
        $v = $b[$field] ?? null;
        if ($v === null || $v === '') {
            continue;
        }
        if (!is_string($v) || mb_strlen($v) > $max) {
            fail("$field must be text of at most $max characters", 422);
        }
        $changes[$field] = trim($v);
    }
    foreach (['lat' => 90, 'lng' => 180] as $field => $max) {
        $v = $b[$field] ?? null;
        if ($v === null) {
            continue;
        }
        if (!is_int($v) && !is_float($v) || abs($v) > $max) {
            fail("$field must be a number between -$max and $max", 422);
        }
        $changes[$field] = (float) $v;
    }
    $flags = $b['flags'] ?? [];
    if (!is_array($flags)) {
        fail('flags must be an object', 422);
    }
    $unknown = array_diff(array_keys($flags), FLAGS);
    if ($unknown) {
        fail('Unknown field(s): ' . implode(', ', $unknown));
    }
    foreach ($flags as $flag => $v) {
        if (!is_bool($v)) {
            fail("$flag must be true or false", 422);
        }
        $changes[$flag] = $v ? 1 : 0;
    }
    return $changes;
}

function note(array $b): ?string
{
    $note = $b['note'] ?? null;
    if ($note !== null && (!is_string($note) || mb_strlen($note) > 500)) {
        fail('note must be text of at most 500 characters', 422);
    }
    return $note ?: null;
}

function require_admin(): void
{
    $hash = setting('admin_password');
    if ($hash === null) {
        fail('Set an admin password first', 403);
    }
    $given = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '';
    if (!password_verify($given, $hash)) {
        usleep(500000); // slow down password guessing
        fail('Wrong admin password', 401);
    }
}

try {
    switch ($_GET['action'] ?? '') {
        case 'pubs':
            $lat = number_param('lat', -90, 90);
            $lng = number_param('lng', -180, 180);
            $radius = number_param('radius_km', 0.01, MAX_RADIUS_KM, 2);
            $required = array_values(array_filter(explode(',', $_GET['has'] ?? '')));
            $unknown = array_diff($required, FLAGS);
            if ($unknown) {
                fail('Unknown filter(s): ' . implode(', ', $unknown));
            }
            respond(['results' => find_pubs($lat, $lng, $radius, $required)]);

        case 'pub':
            $pub = get_pub(id_param());
            $pub ? respond($pub) : fail('Pub not found', 404);

        case 'suggest_edit':
            require_method('POST');
            $id = id_param();
            if (!get_pub($id)) {
                fail('Pub not found', 404);
            }
            $b = body();
            $changes = suggestion_changes($b);
            unset($changes['lat'], $changes['lng']);
            if (!$changes) {
                fail('Nothing to change');
            }
            respond(['id' => add_suggestion($id, $changes, note($b)), 'status' => 'pending'], 201);

        case 'suggest_pub':
            require_method('POST');
            $b = body();
            $changes = suggestion_changes($b);
            if (empty($changes['name']) || !isset($changes['lat'], $changes['lng'])) {
                fail('A new pub needs a name and a location');
            }
            respond(['id' => add_suggestion(null, $changes, note($b)), 'status' => 'pending'], 201);

        // ─── Admin ────────────────────────────────────────────────────────────

        case 'admin_status':
            respond(['password_set' => setting('admin_password') !== null, 'pubs' => pub_counts()]);

        case 'admin_setup':
            require_method('POST');
            if (setting('admin_password') !== null) {
                fail('The admin password is already set', 403);
            }
            $password = body()['password'] ?? '';
            if (!is_string($password) || strlen($password) < MIN_PASSWORD_LENGTH) {
                fail('Choose a password of at least ' . MIN_PASSWORD_LENGTH . ' characters', 422);
            }
            save_setting('admin_password', password_hash($password, PASSWORD_DEFAULT));
            respond(['ok' => true]);

        case 'admin_suggestions':
            require_admin();
            respond(['suggestions' => list_suggestions(), 'pubs' => pub_counts()]);

        case 'admin_resolve':
            require_method('POST');
            require_admin();
            $decision = $_GET['decision'] ?? '';
            if (!in_array($decision, ['approve', 'reject'], true)) {
                fail('decision must be approve or reject');
            }
            resolve_suggestion(id_param(), $decision === 'approve')
                ? respond(['ok' => true])
                : fail('No pending suggestion with that id', 404);

        case 'admin_import':
            require_method('POST');
            require_admin();
            set_time_limit(180);
            try {
                [$added, $updated] = upsert_pubs(fetch_osm_pubs());
            } catch (RuntimeException $e) {
                fail($e->getMessage(), 502);
            }
            respond(['added' => $added, 'updated' => $updated, 'pubs' => pub_counts()]);

        case 'admin_demo':
            require_method('POST');
            require_admin();
            respond(['loaded' => load_demo_pubs(), 'pubs' => pub_counts()]);

        default:
            fail('Unknown action', 404);
    }
} catch (PDOException $e) {
    error_log('PubPal database error: ' . $e->getMessage());
    fail("The database isn't working. Check the settings in config.php.", 500);
}

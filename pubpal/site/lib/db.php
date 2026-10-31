<?php
// Database access for PubPal: SQLite by default, MySQL if configured in config.php.

const FACILITIES = ['shows_sports', 'pool_table', 'dog_friendly', 'outdoor_seating', 'baby_changing', 'accessible'];
const DRINKS = ['real_ale', 'craft_beer', 'lager', 'stout', 'cider', 'alcohol_free'];
const FLAGS = [...FACILITIES, ...DRINKS];
const DETAILS = ['name', 'address', 'postcode', 'phone', 'website'];

/** Quote a column name. Needed because `accessible` is a reserved word in MySQL. */
function col(string $name): string
{
    return "`$name`";
}

function now(): string
{
    return gmdate('Y-m-d H:i:s');
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $config = require __DIR__ . '/../config.php';
    $mysql = $config['mysql'] ?? [];
    if (!empty($mysql['name'])) {
        $pdo = new PDO(
            "mysql:host={$mysql['host']};dbname={$mysql['name']};charset=utf8mb4",
            $mysql['user'],
            $mysql['pass'],
        );
    } else {
        $path = getenv('PUBPAL_DB') ?: __DIR__ . '/../data/pubpal.sqlite';
        $pdo = new PDO('sqlite:' . $path);
        $pdo->exec('PRAGMA foreign_keys = ON');
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    create_tables($pdo);
    return $pdo;
}

function create_tables(PDO $pdo): void
{
    $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    $id = $mysql ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $text = $mysql ? 'VARCHAR(255)' : 'TEXT';
    $engine = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    // NULL in a flag column means "we don't know yet".
    $flags = implode(', ', array_map(fn($f) => col($f) . ' SMALLINT NULL', FLAGS));

    $pdo->exec("CREATE TABLE IF NOT EXISTS pubs (
        id $id,
        name $text NOT NULL,
        address $text NULL,
        postcode $text NULL,
        lat DOUBLE NOT NULL,
        lng DOUBLE NOT NULL,
        phone $text NULL,
        website $text NULL,
        $flags,
        claimed SMALLINT NOT NULL DEFAULT 0,
        is_demo SMALLINT NOT NULL DEFAULT 0,
        osm_id VARCHAR(40) NULL UNIQUE,
        updated_at $text NOT NULL
    )$engine");

    $pdo->exec("CREATE TABLE IF NOT EXISTS suggestions (
        id $id,
        pub_id INT NULL,
        changes TEXT NOT NULL,
        note TEXT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'pending',
        created_at $text NOT NULL,
        FOREIGN KEY (pub_id) REFERENCES pubs(id) ON DELETE CASCADE
    )$engine");

    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        name VARCHAR(40) PRIMARY KEY,
        value TEXT NOT NULL
    )$engine");
}

function setting(string $name): ?string
{
    $stmt = db()->prepare('SELECT value FROM settings WHERE name = ?');
    $stmt->execute([$name]);
    $value = $stmt->fetchColumn();
    return $value === false ? null : $value;
}

function save_setting(string $name, string $value): void
{
    db()->prepare('DELETE FROM settings WHERE name = ?')->execute([$name]);
    db()->prepare('INSERT INTO settings (name, value) VALUES (?, ?)')->execute([$name, $value]);
}

function flag_out($value): ?bool
{
    return $value === null ? null : (bool) $value;
}

function pub_out(array $row, ?float $distance_km = null): array
{
    $pub = [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'address' => $row['address'],
        'postcode' => $row['postcode'],
        'lat' => (float) $row['lat'],
        'lng' => (float) $row['lng'],
        'phone' => $row['phone'],
        'website' => $row['website'],
        'facilities' => array_combine(FACILITIES, array_map(fn($f) => flag_out($row[$f]), FACILITIES)),
        'drinks' => array_combine(DRINKS, array_map(fn($f) => flag_out($row[$f]), DRINKS)),
        'claimed' => (bool) $row['claimed'],
        'is_demo' => (bool) $row['is_demo'],
        'updated_at' => $row['updated_at'],
    ];
    if ($distance_km !== null) {
        $pub['distance_km'] = round($distance_km, 2);
    }
    return $pub;
}

function haversine_km(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $p1 = deg2rad($lat1);
    $p2 = deg2rad($lat2);
    $dp = $p2 - $p1;
    $dl = deg2rad($lng2 - $lng1);
    $a = sin($dp / 2) ** 2 + cos($p1) * cos($p2) * sin($dl / 2) ** 2;
    return 2 * 6371.0 * asin(sqrt($a));
}

/** Pubs within $radius_km that have every flag in $required, nearest first. */
function find_pubs(float $lat, float $lng, float $radius_km, array $required = []): array
{
    // Cheap bounding-box prefilter, then exact distance. Fine for a town's worth of pubs.
    $dlat = $radius_km / 111.0;
    $dlng = $radius_km / (111.0 * max(cos(deg2rad($lat)), 0.01));
    $where = ['lat BETWEEN ? AND ?', 'lng BETWEEN ? AND ?'];
    foreach ($required as $flag) {
        $where[] = col($flag) . ' = 1'; // $required is checked against FLAGS by the caller
    }
    $stmt = db()->prepare('SELECT * FROM pubs WHERE ' . implode(' AND ', $where));
    $stmt->execute([$lat - $dlat, $lat + $dlat, $lng - $dlng, $lng + $dlng]);

    $results = [];
    foreach ($stmt as $row) {
        $d = haversine_km($lat, $lng, (float) $row['lat'], (float) $row['lng']);
        if ($d <= $radius_km) {
            $results[] = pub_out($row, $d);
        }
    }
    usort($results, fn($a, $b) => $a['distance_km'] <=> $b['distance_km']);
    return $results;
}

function get_pub(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM pubs WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? pub_out($row) : null;
}

/** Insert a pub. $fields keys must be real column names. */
function insert_pub(array $fields): int
{
    $fields['updated_at'] = now();
    $cols = array_keys($fields);
    $sql = 'INSERT INTO pubs (' . implode(', ', array_map('col', $cols)) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')';
    db()->prepare($sql)->execute(array_values($fields));
    return (int) db()->lastInsertId();
}

function add_suggestion(?int $pub_id, array $changes, ?string $note): int
{
    db()->prepare('INSERT INTO suggestions (pub_id, changes, note, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$pub_id, json_encode($changes), $note, now()]);
    return (int) db()->lastInsertId();
}

function list_suggestions(): array
{
    $rows = db()->query(
        "SELECT s.*, p.name AS pub_name FROM suggestions s
         LEFT JOIN pubs p ON p.id = s.pub_id
         WHERE s.status = 'pending' ORDER BY s.created_at, s.id"
    )->fetchAll();
    return array_map(fn($r) => [
        'id' => (int) $r['id'],
        'pub_id' => $r['pub_id'] === null ? null : (int) $r['pub_id'],
        'pub_name' => $r['pub_name'],
        'changes' => json_decode($r['changes'], true),
        'note' => $r['note'],
        'created_at' => $r['created_at'],
    ], $rows);
}

/** Approve (apply the changes) or reject a pending suggestion. False if there is no such pending suggestion. */
function resolve_suggestion(int $id, bool $approve): bool
{
    $pdo = db();
    $stmt = $pdo->prepare("SELECT * FROM suggestions WHERE id = ? AND status = 'pending'");
    $stmt->execute([$id]);
    $s = $stmt->fetch();
    if (!$s) {
        return false;
    }
    $pdo->beginTransaction();
    if ($approve) {
        // Only known columns ever reach SQL, even though changes were validated on the way in.
        $allowed = array_flip([...DETAILS, ...FLAGS, 'lat', 'lng']);
        $changes = array_intersect_key(json_decode($s['changes'], true), $allowed);
        if ($s['pub_id'] === null) {
            insert_pub($changes);
        } elseif ($changes) {
            $sets = implode(', ', array_map(fn($c) => col($c) . ' = ?', array_keys($changes)));
            $pdo->prepare("UPDATE pubs SET $sets, updated_at = ? WHERE id = ?")
                ->execute([...array_values($changes), now(), $s['pub_id']]);
        }
    }
    $pdo->prepare('UPDATE suggestions SET status = ? WHERE id = ?')->execute([$approve ? 'approved' : 'rejected', $id]);
    $pdo->commit();
    return true;
}

function pub_counts(): array
{
    $row = db()->query('SELECT COUNT(*) AS total, COALESCE(SUM(is_demo), 0) AS demo FROM pubs')->fetch();
    return ['total' => (int) $row['total'], 'demo' => (int) $row['demo']];
}

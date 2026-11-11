<?php
declare(strict_types=1);

/** Storage: one SQLite file. */
final class Db
{
    private PDO $pdo;

    private const SCHEMA = [
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS messages (
            seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL, created_at TEXT NOT NULL, sender TEXT NOT NULL,
            kind TEXT NOT NULL DEFAULT 'chat', text TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '{}')",
        "CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL, title TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '', due TEXT NOT NULL DEFAULT '', time TEXT NOT NULL DEFAULT '',
            done INTEGER NOT NULL DEFAULT 0, done_day TEXT NOT NULL DEFAULT '',
            top INTEGER NOT NULL DEFAULT 0, goal_id TEXT NOT NULL DEFAULT '',
            added_by TEXT NOT NULL DEFAULT 'sunny')",
        "CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL, title TEXT NOT NULL,
            why TEXT NOT NULL DEFAULT '', horizon TEXT NOT NULL DEFAULT 'month',
            done INTEGER NOT NULL DEFAULT 0, done_day TEXT NOT NULL DEFAULT '')",
        "CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL, title TEXT NOT NULL,
            company TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'lead', next_step TEXT NOT NULL DEFAULT '',
            next_date TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
            applied_day TEXT NOT NULL DEFAULT '', added_by TEXT NOT NULL DEFAULT 'sunny')",
        "CREATE TABLE IF NOT EXISTS memory (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL, text TEXT NOT NULL,
            added_by TEXT NOT NULL DEFAULT 'sunny')",
        "CREATE TABLE IF NOT EXISTS papers (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL, title TEXT NOT NULL,
            body TEXT NOT NULL DEFAULT '', added_by TEXT NOT NULL DEFAULT 'sunny')",
        "CREATE TABLE IF NOT EXISTS scouts (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL, title TEXT NOT NULL, brief TEXT NOT NULL,
            agent TEXT NOT NULL DEFAULT 'claude', cadence TEXT NOT NULL DEFAULT 'daily',
            enabled INTEGER NOT NULL DEFAULT 1, last_day TEXT NOT NULL DEFAULT '')",
        "CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL, scout_id TEXT NOT NULL DEFAULT '',
            agent TEXT NOT NULL, title TEXT NOT NULL, brief TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'queued', body TEXT NOT NULL DEFAULT '',
            sources TEXT NOT NULL DEFAULT '[]', seen INTEGER NOT NULL DEFAULT 0)",
        "CREATE TABLE IF NOT EXISTS queue (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL, lane TEXT NOT NULL, kind TEXT NOT NULL,
            agent TEXT NOT NULL DEFAULT '', payload TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'pending', started_at INTEGER NOT NULL DEFAULT 0,
            attempts INTEGER NOT NULL DEFAULT 0)",
        "CREATE TABLE IF NOT EXISTS runs (key TEXT PRIMARY KEY, ran_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS usage (
            day TEXT NOT NULL, agent TEXT NOT NULL, calls INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, agent))",
    ];

    public function __construct(string $path)
    {
        $this->pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $this->pdo->exec('PRAGMA busy_timeout = 8000');
        $this->pdo->exec('PRAGMA journal_mode = WAL');
        if (!$this->q("SELECT name FROM sqlite_master WHERE name='usage'")) {
            foreach (self::SCHEMA as $sql) {
                $this->pdo->exec($sql);
            }
        }
        @chmod($path, 0600);
    }

    public function q(string $sql, array $params = []): array
    {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        return $st->fetchAll();
    }

    public function x(string $sql, array $params = []): int
    {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        return $st->rowCount();
    }

    /** Runs $fn while holding the write lock, so two requests can't claim the same work. */
    public function locked(callable $fn): mixed
    {
        $this->pdo->exec('BEGIN IMMEDIATE');
        try {
            $out = $fn();
            $this->pdo->exec('COMMIT');
            return $out;
        } catch (Throwable $e) {
            $this->pdo->exec('ROLLBACK');
            throw $e;
        }
    }

    public function get(string $key, string $default = ''): string
    {
        $rows = $this->q('SELECT value FROM settings WHERE key=?', [$key]);
        return $rows ? $rows[0]['value'] : $default;
    }

    public function set(string $key, string $value, bool $bump = true): void
    {
        $this->x('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value=excluded.value',
            [$key, $value]);
        if ($bump) {
            $this->bump();
        }
    }

    /** The screens reload their data whenever this number changes. */
    public function version(): int
    {
        return (int) $this->get('version', '1');
    }

    public function bump(): void
    {
        $this->x("INSERT INTO settings (key, value) VALUES ('version', '2')
                  ON CONFLICT (key) DO UPDATE SET value = CAST(value AS INTEGER) + 1");
    }

    public static function id(): string
    {
        return bin2hex(random_bytes(8));
    }

    public static function stamp(): string
    {
        return gmdate('Y-m-d\TH:i:s');
    }

    public function insert(string $table, array $row): array
    {
        $row = ['id' => self::id(), 'created_at' => self::stamp()] + $row;
        $cols = implode(', ', array_keys($row));
        $marks = implode(', ', array_fill(0, count($row), '?'));
        $this->x("INSERT INTO $table ($cols) VALUES ($marks)", array_values($row));
        if ($table !== 'messages') {
            $this->bump();
        }
        return $row;
    }

    public function update(string $table, string $id, array $changes): void
    {
        if (!$changes) {
            return;
        }
        $sets = implode(', ', array_map(fn ($k) => "$k=?", array_keys($changes)));
        $this->x("UPDATE $table SET $sets WHERE id=?", [...array_values($changes), $id]);
        $this->bump();
    }

    public function delete(string $table, string $id): void
    {
        $this->x("DELETE FROM $table WHERE id=?", [$id]);
        $this->bump();
    }
}

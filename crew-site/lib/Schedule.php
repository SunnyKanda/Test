<?php
declare(strict_types=1);

/** Decides what is due: check-ins and standing scouts. Doing the work is the queue's job. */
final class Schedule
{
    public const TIMES = ['morning' => '08:00', 'nudge' => '14:30', 'evening' => '20:00', 'weekly' => '18:00'];
    private const WINDOW = 4 * 3600; // a missed check-in is still sent this long after its time

    public function __construct(private Db $db, private Team $team)
    {
    }

    public function timeFor(string $kind): string
    {
        return $this->db->get("time_$kind", self::TIMES[$kind]);
    }

    private function at(DateTimeImmutable $now, string $clock): ?DateTimeImmutable
    {
        return preg_match('/^(\d{2}):(\d{2})$/', $clock, $m) ? $now->setTime((int) $m[1], (int) $m[2]) : null;
    }

    public function dueCheckins(DateTimeImmutable $now): array
    {
        if ($this->db->get('checkins', '1') !== '1') {
            return [];
        }
        $out = [];
        foreach (array_keys(self::TIMES) as $kind) {
            if ($this->db->get("on_$kind", '1') !== '1' || ($kind === 'weekly' && $now->format('w') !== '0')) {
                continue;
            }
            $at = $this->at($now, $this->timeFor($kind));
            if (!$at || $now < $at || $now->getTimestamp() >= $at->getTimestamp() + self::WINDOW) {
                continue;
            }
            if (!$this->db->q('SELECT key FROM runs WHERE key=?', ["$kind:" . $now->format('Y-m-d')])) {
                $out[] = $kind;
            }
        }
        return $out;
    }

    public function dueScouts(DateTimeImmutable $now): array
    {
        $at = $this->at($now, $this->db->get('time_scouts', '07:00'));
        if (!$at || $now < $at) {
            return [];
        }
        $today = $now->format('Y-m-d');
        $weekAgo = $now->modify('-7 days')->format('Y-m-d');
        return array_values(array_filter($this->db->q('SELECT * FROM scouts WHERE enabled=1'), fn ($s) =>
            $s['cadence'] === 'daily' ? $s['last_day'] !== $today : ($s['last_day'] === '' || $s['last_day'] <= $weekAgo)));
    }

    /** Queues whatever is due. Cheap, and safe to call as often as you like. Returns what was queued. */
    public function tick(): array
    {
        $queued = [];
        if (!$this->team->providers->readyAgents()) {
            return $queued;
        }
        $now = $this->team->now();
        $today = $now->format('Y-m-d');
        foreach ($this->dueCheckins($now) as $kind) {
            // Mark first, so two callers can't both send it.
            if (!$this->db->x('INSERT OR IGNORE INTO runs (key, ran_at) VALUES (?, ?)', ["$kind:$today", Db::stamp()])) {
                continue;
            }
            if ($kind === 'nudge') {
                $done = $this->db->q('SELECT id FROM tasks WHERE done=1 AND done_day=? LIMIT 1', [$today]);
                $open = $this->db->q("SELECT id FROM tasks WHERE done=0 AND due<>'' AND due<=? LIMIT 1", [$today]);
                if ($done || !$open) {
                    continue;
                }
            }
            if ($this->team->checkin($kind)) {
                $queued[] = $kind;
            }
        }
        foreach ($this->dueScouts($now) as $scout) {
            if ($this->db->x('UPDATE scouts SET last_day=? WHERE id=? AND last_day<>?', [$today, $scout['id'], $today])) {
                if ($this->team->sendScout($scout['agent'], $scout['brief'], $scout['title'], $scout['id'])) {
                    $queued[] = 'scout:' . $scout['title'];
                }
            }
        }
        return $queued;
    }
}

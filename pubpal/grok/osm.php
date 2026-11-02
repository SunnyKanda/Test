<?php
// Import Halifax pubs from OpenStreetMap, and the made-up demo pubs for trying the app out.

require_once __DIR__ . '/db.php';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// Tried in order; the main server is often busy, so fall back to public mirrors.
const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
];
// Halifax, West Yorkshire and its immediate surroundings: south, west, north, east.
const HALIFAX_BBOX = [53.68, -1.95, 53.76, -1.80];

function overpass_query(array $bbox): string
{
    $box = implode(',', $bbox);
    return "[out:json][timeout:60];(node[\"amenity\"=\"pub\"]($box);way[\"amenity\"=\"pub\"]($box););out center tags;";
}

function yes_no(?string $value): ?int
{
    if (in_array($value, ['yes', 'only', 'designated'], true)) {
        return 1;
    }
    return $value === 'no' ? 0 : null;
}

/** Map an OpenStreetMap element to PubPal columns, or null if it has no name or location. */
function element_to_pub(array $el): ?array
{
    $t = $el['tags'] ?? [];
    $lat = $el['lat'] ?? $el['center']['lat'] ?? null;
    $lng = $el['lon'] ?? $el['center']['lon'] ?? null;
    $name = is_string($t['name'] ?? null) ? mb_substr(clean_line($t['name']), 0, 120) : '';
    if ($name === '' || !is_numeric($lat) || !is_numeric($lng)) {
        return null;
    }
    $street = trim(($t['addr:housenumber'] ?? '') . ' ' . ($t['addr:street'] ?? ''));
    $address = mb_substr(clean_line(implode(', ', array_filter([$street, $t['addr:city'] ?? $t['addr:town'] ?? '']))), 0, 200);
    $postcode = mb_substr(clean_line((string) ($t['addr:postcode'] ?? '')), 0, 10);
    $sport = $t['sport'] ?? '';

    return [
        'osm_id' => $el['type'] . '/' . $el['id'],
        'name' => $name,
        'address' => $address ?: null,
        'postcode' => $postcode ?: null,
        'lat' => (float) $lat,
        'lng' => (float) $lng,
        // Anyone can edit OpenStreetMap, so only safe phone numbers and http(s) links are kept.
        'phone' => clean_phone($t['phone'] ?? $t['contact:phone'] ?? null),
        'website' => clean_url($t['website'] ?? $t['contact:website'] ?? null),
        'shows_sports' => null, // OSM has no reliable tag for this; comes from suggestions
        'pool_table' => preg_match('/billiards|pool|snooker/', $sport) ? 1 : null,
        'dog_friendly' => yes_no($t['dog'] ?? null),
        'outdoor_seating' => yes_no($t['outdoor_seating'] ?? $t['beer_garden'] ?? null),
        'baby_changing' => yes_no($t['changing_table'] ?? null),
        'accessible' => yes_no($t['wheelchair'] ?? null),
        'real_ale' => yes_no($t['real_ale'] ?? $t['drink:real_ale'] ?? null),
        'craft_beer' => yes_no($t['drink:craft_beer'] ?? null),
        'lager' => yes_no($t['drink:lager'] ?? null),
        'stout' => yes_no($t['drink:stout'] ?? null),
        'cider' => yes_no($t['real_cider'] ?? $t['drink:cider'] ?? null),
        'alcohol_free' => yes_no($t['drink:alcohol_free'] ?? $t['drink:non_alcoholic'] ?? null),
    ];
}

/**
 * Add new pubs and refresh names, addresses and locations of ones we already have.
 * A facility or drink that is already known (from an approved suggestion) is never overwritten,
 * and neither is a detail (name, phone...) that an admin approved a correction to.
 * Removes the demo pubs. Returns [added, updated].
 */
function upsert_pubs(array $pubs): array
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM pubs WHERE is_demo = 1');
        $find = $pdo->prepare('SELECT * FROM pubs WHERE osm_id = ?');
        $added = $updated = 0;
        foreach ($pubs as $pub) {
            $find->execute([$pub['osm_id']]);
            $existing = $find->fetch();
            if (!$existing) {
                insert_pub($pub);
                $added++;
                continue;
            }
            // Details an admin has approved a correction to are kept, not overwritten by OSM.
            $edited = json_decode((string) ($existing['edited'] ?? ''), true) ?: [];
            $changes = [];
            foreach (['name', 'address', 'postcode', 'lat', 'lng', 'phone', 'website'] as $c) {
                if ($pub[$c] !== null && !in_array($c, $edited, true)) {
                    $changes[$c] = $pub[$c];
                }
            }
            foreach (FLAGS as $f) {
                if ($existing[$f] === null && $pub[$f] !== null) {
                    $changes[$f] = $pub[$f];
                }
            }
            $sets = implode(', ', array_map(fn($c) => col($c) . ' = ?', array_keys($changes)));
            $pdo->prepare("UPDATE pubs SET $sets, updated_at = ? WHERE id = ?")
                ->execute([...array_values($changes), now(), $existing['id']]);
            $updated++;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    return [$added, $updated];
}

/** Fetch Halifax pubs from OpenStreetMap. Throws RuntimeException with a readable message on failure. */
function fetch_osm_pubs(): array
{
    @set_time_limit(300);
    $override = getenv('PUBPAL_OVERPASS_URL'); // env override is for tests
    $urls = $override ? [$override] : OVERPASS_MIRRORS;
    $query = http_build_query(['data' => overpass_query(HALIFAX_BBOX)]);
    $body = false;
    $problems = [];
    foreach ($urls as $url) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $query,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 75,
            CURLOPT_USERAGENT => 'PubPal/0.3 (Halifax pub finder)',
        ]);
        $result = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($result !== false && $status === 200 && is_array(json_decode($result, true))) {
            $body = $result;
            break;
        }
        $problems[] = $error ?: "HTTP $status";
    }
    if ($body === false) {
        throw new RuntimeException("OpenStreetMap didn't answer (" . implode(', ', $problems) . '). Try again in a few minutes.');
    }
    $data = json_decode($body, true);
    $elements = is_array($data) && is_array($data['elements'] ?? null) ? $data['elements'] : [];
    $pubs = array_values(array_filter(array_map(fn($el) => is_array($el) ? element_to_pub($el) : null, $elements)));
    if (!$pubs) {
        throw new RuntimeException('OpenStreetMap returned no pubs, so nothing was changed.');
    }
    return $pubs;
}

/** Replace any demo pubs with the fictional set around Halifax town centre. */
function load_demo_pubs(): int
{
    $Y = 1; $N = 0; $U = null;
    // name, lat, lng, [sports, pool, dogs, outdoor, baby, accessible], [ale, craft, lager, stout, cider, alcohol-free]
    $demo = [
        ['The Demo Arms', 53.7232, -1.8590, [$Y, $Y, $Y, $N, $N, $Y], [$Y, $N, $Y, $Y, $Y, $Y]],
        ['The Sample Inn', 53.7255, -1.8655, [$N, $N, $Y, $Y, $U, $Y], [$Y, $Y, $Y, $U, $Y, $Y]],
        ['The Placeholder Tap', 53.7210, -1.8640, [$N, $N, $Y, $N, $N, $N], [$Y, $Y, $N, $Y, $Y, $U]],
        ['The Test & Anchor', 53.7298, -1.8702, [$Y, $Y, $N, $Y, $Y, $Y], [$N, $N, $Y, $Y, $Y, $Y]],
        ['The Mock Turtle', 53.7175, -1.8520, [$U, $U, $U, $Y, $U, $U], [$Y, $U, $Y, $U, $U, $U]],
        ['The Pretend Fox', 53.7380, -1.8810, [$Y, $N, $Y, $Y, $N, $Y], [$Y, $N, $Y, $Y, $N, $Y]],
        ['The Example Hotel', 53.7100, -1.8950, [$Y, $Y, $N, $N, $Y, $Y], [$N, $N, $Y, $Y, $Y, $Y]],
    ];
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM pubs WHERE is_demo = 1');
    foreach ($demo as [$name, $lat, $lng, $fac, $drinks]) {
        insert_pub([
            'name' => $name, 'address' => 'Demo data – not a real pub', 'postcode' => 'HX1',
            'lat' => $lat, 'lng' => $lng, 'is_demo' => 1,
            ...array_combine(FACILITIES, $fac), ...array_combine(DRINKS, $drinks),
        ]);
    }
    $pdo->commit();
    return count($demo);
}

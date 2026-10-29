<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$query = isset($_GET['q']) ? trim($_GET['q']) : '';
$category = isset($_GET['cat']) ? trim($_GET['cat']) : '';

if ($query === '') {
    echo json_encode(['error' => 'Missing search query']);
    exit;
}

$url = 'https://apibay.org/q.php?q=' . urlencode($query);
if ($category !== '') {
    $url .= '&cat=' . urlencode($category);
}

$context = stream_context_create([
    'http' => [
        'timeout' => 10,
        'header' => "User-Agent: TorrentFlix/1.0\r\n",
    ],
    'ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true,
    ],
]);

$response = @file_get_contents($url, false, $context);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to reach torrent API']);
    exit;
}

$data = json_decode($response, true);

if (!is_array($data)) {
    http_response_code(502);
    echo json_encode(['error' => 'Invalid response from torrent API']);
    exit;
}

// Standard trackers for magnet link construction
$trackers = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://tracker.bittor.pw:1337/announce',
    'udp://public.popcornflix.com:6969/announce',
    'udp://tracker.dler.org:6969/announce',
    'udp://exodus.desync.com:6969',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.files.fm:7073/announce',
];

$trackerStr = '';
foreach ($trackers as $tr) {
    $trackerStr .= '&tr=' . urlencode($tr);
}

$results = [];
foreach ($data as $item) {
    // apibay returns {id: "0"} for no results
    if (!isset($item['info_hash']) || $item['id'] === '0') continue;

    $name = $item['name'] ?? 'Unknown';
    $hash = $item['info_hash'];
    $magnet = 'magnet:?xt=urn:btih:' . $hash . '&dn=' . urlencode($name) . $trackerStr;

    $results[] = [
        'id' => $item['id'],
        'name' => $name,
        'info_hash' => $hash,
        'magnet' => $magnet,
        'size' => intval($item['size'] ?? 0),
        'seeders' => intval($item['seeders'] ?? 0),
        'leechers' => intval($item['leechers'] ?? 0),
        'category' => intval($item['category'] ?? 0),
        'added' => intval($item['added'] ?? 0),
        'username' => $item['username'] ?? '',
    ];
}

// Sort by seeders descending
usort($results, function($a, $b) {
    return $b['seeders'] - $a['seeders'];
});

echo json_encode($results);

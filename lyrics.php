<?php
/* Synced lyrics gateway for the Music player: lyrics.php?title=&artist=&album=&duration=<seconds> (JSON). */
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/spotify.php';   // only for the connected player session check
require __DIR__ . '/inc/lyrics.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header('Pragma: no-cache');
header('Content-Type: application/json; charset=utf-8');

try {
    $out = lyrics_handle();
} catch (Throwable $e) {
    $out = array(500, array('ok' => false, 'error' => 'Дууны үг ачаалж чадсангүй. Дахин оролдоорой.'), array());
}
http_response_code($out[0]);
foreach ($out[2] as $line) header($line);
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'HEAD') exit;
echo json_encode($out[1], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);

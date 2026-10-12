<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/spotify.php';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header('Pragma: no-cache');
if (isset($_GET['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    try { sp_session(); $data = sp_dispatch(is_string($_GET['action']) ? $_GET['action'] : ''); }
    catch (SpotifySiteException $e) { http_response_code($e->getCode() >= 400 && $e->getCode() <= 599 ? $e->getCode() : 500); $data = array('ok' => false, 'error' => $e->getMessage()); if ($e->retryAfter) { $data['retryAfter'] = $e->retryAfter; header('Retry-After: ' . $e->retryAfter); } }
    catch (Throwable $e) { http_response_code(500); $data = array('ok' => false, 'error' => 'Үйлдэл амжилтгүй боллоо. Дахин оролдоорой.'); }
    session_write_close(); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE); exit;
}
// The player lives inside Music; this file remains the same-origin API gateway.
$config = sp_config();
header('Location: ' . $config['pageUrl'], true, 303);
exit;

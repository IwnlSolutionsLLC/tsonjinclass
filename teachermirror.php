<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/teachermirror.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
try {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $action = is_string($_GET['action'] ?? null) ? $_GET['action'] : 'status';
    if ($method === 'POST') {
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 98304) tm_fail('Хүсэлт хэт том байна.', 413, 'body_too_large');
        $input = fopen('php://input', 'rb');
        $raw = stream_get_contents($input, 98305);
        fclose($input);
        if ($raw === false || strlen($raw) > 98304) tm_fail('Хүсэлт хэт том байна.', 413, 'body_too_large');
        $body = json_decode($raw, true);
        if (!is_array($body) || ($body && is_list_array($body))) tm_fail('JSON хүсэлт буруу байна.');
    } else { $body = $_GET; }
    echo json_encode(tm_dispatch($action, $method, $body), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
} catch (TeacherMirrorException $error) {
    http_response_code($error->httpStatus);
    echo json_encode(array('ok' => false, 'error' => $error->getMessage(), 'code' => $error->errorId), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'error' => 'Холболтын сервер түр алдаа гаргалаа. Дахин оролдоно уу.', 'code' => 'server_error'), JSON_UNESCAPED_UNICODE);
}

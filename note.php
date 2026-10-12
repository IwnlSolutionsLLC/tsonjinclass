<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/note.php';
header('Cache-Control: no-store, private');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Content-Type: application/json; charset=utf-8');
try {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $action = is_string($_GET['action'] ?? null) ? $_GET['action'] : '';
    echo json_encode(note_dispatch($action, $method), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
} catch (NoteException $error) {
    http_response_code($error->httpStatus);
    echo json_encode(array('ok' => false, 'error' => $error->getMessage(), 'code' => $error->errorId), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'error' => 'Тэмдэглэл түр алдаа гаргалаа. Дахин оролдоно уу.', 'code' => 'server_error'), JSON_UNESCAPED_UNICODE);
}

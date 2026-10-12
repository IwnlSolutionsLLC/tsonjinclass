<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/folders.php';
require __DIR__ . '/inc/doodle.php';
require __DIR__ . '/inc/office.php';
function json_out($data, $status = 200) { http_response_code($status); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fail($message, $status = 400, $extra = array()) { json_out(array_merge(array('ok' => false, 'error' => $message), $extra), $status); }
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function asset($p) { $f = __DIR__ . '/' . $p; return $p . (is_file($f) ? '?v=' . filemtime($f) : ''); }
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');
$action = $_GET['action'] ?? 'editor';
try {
    ensure_dirs(); folder_prepare(); $cfg = office_config();
    $id = office_ticket_id($_GET['ticket'] ?? ''); $row = office_session($id, $cfg);
    if ($action === 'callback') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new RuntimeException('POST required', 405);
        $raw = file_get_contents('php://input', false, null, 0, 1048577);
        if ($raw === false || strlen($raw) > 1048576 || !is_array($body = json_decode($raw, true))) throw new RuntimeException('Invalid callback', 400);
        office_callback($cfg, $id, $body); json_out(array('error' => 0));
    }
    if (!in_array($_SERVER['REQUEST_METHOD'], array('GET', 'HEAD'), true)) throw new RuntimeException('GET required', 405);
    if ($action === 'file') {
        $lock = folder_storage_lock(false);
        try {
            $state = folder_state(); $file = $state['folders'][$row['folder']]['files'][$row['file']] ?? null;
            if (!$file || folder_file_version($file) !== $row['currentVersion']) throw new RuntimeException('Document source changed or was deleted', 409);
            $fp = folder_open_blob($row['folder'], $file);
        } finally { folder_storage_unlock($lock); }
        // No owner cookie is necessary; the short-lived ticket only grants this file.
        folder_stream_file($row['folder'], $file, $fp); exit;
    }
    if ($action === 'status') json_out(array('ok' => true, 'status' => $row['status'], 'lastSave' => $row['lastSave'], 'closed' => $row['closed']));
    if ($action !== 'editor' || $row['mode'] !== 'edit') throw new RuntimeException('Editor not found', 404);
    $boot = array('config' => office_editor_config($cfg, $id, $row), 'apiUrl' => $cfg['serverUrl'] . '/web-apps/apps/api/documents/api.js', 'statusUrl' => 'office.php?action=status&ticket=' . rawurlencode($_GET['ticket']), 'folder' => $row['folder'], 'file' => $row['file']);
    $origin = office_origin($cfg['serverUrl']);
    header("Content-Security-Policy: default-src 'self'; script-src 'self' $origin; frame-src 'self' $origin; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' $origin; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
} catch (Throwable $e) {
    $status = $e->getCode(); $status = $status >= 400 && $status <= 599 ? $status : 500;
    if ($action === 'callback') json_out(array('error' => 1), $status);
    if ($action === 'file' || $action === 'status') fail($status < 500 ? $e->getMessage() : 'Office үйлчилгээнд алдаа гарлаа.', $status);
    http_response_code($status);
    ?><!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Office засварлагч</title><script src="<?= h(asset('assets/js/theme.js')) ?>"></script><script src="<?= h(asset('assets/js/i18n.js')) ?>"></script><link rel="stylesheet" href="<?= h(asset('assets/css/navigation.css')) ?>"><link rel="stylesheet" href="<?= h(asset('assets/css/style.css')) ?>"><link rel="stylesheet" href="<?= h(asset('assets/css/senior.css')) ?>"><link rel="stylesheet" href="<?= h(asset('assets/css/themes.css')) ?>"></head><body><main class="wrap panel glass"><div class="section-head"><h1>Office засварлагчийг нээж чадсангүй</h1><?php include __DIR__ . '/inc/language-switch.php'; ?><?php include __DIR__ . '/inc/theme-toggle.php'; ?></div><p><?= h($status < 500 ? $e->getMessage() : 'Document Server-ийн тохиргоо болон холболтыг шалгана уу.') ?></p><a class="btn btn-primary" href="index.php#folders">Хавтас руу буцах</a></main></body></html><?php exit;
}
?><!doctype html>
<html lang="mn">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?= h($row['title']) ?> · Office</title><script src="<?= h(asset('assets/js/theme.js')) ?>"></script><script src="<?= h(asset('assets/js/i18n.js')) ?>"></script><link rel="stylesheet" href="<?= h(asset('assets/css/navigation.css')) ?>"><link rel="stylesheet" href="<?= h(asset('assets/css/style.css')) ?>"><link rel="stylesheet" href="<?= h(asset('assets/css/senior.css')) ?>"><link rel="stylesheet" href="<?= h(asset('assets/css/office.css')) ?>"><link rel="stylesheet" href="<?= h(asset('assets/css/themes.css')) ?>"></head>
<body>
<header class="office-header"><a href="index.php#folders" target="_self">← Хавтас</a><strong><?= h($row['title']) ?></strong><span id="officeSaveStatus" role="status">Засварлагчийг ачаалж байна…</span><?php include __DIR__ . '/inc/language-switch.php'; ?><?php include __DIR__ . '/inc/theme-toggle.php'; ?></header>
<main id="officeHost"><div id="officeDocument"></div></main>
<div id="officeError" hidden role="alert"><h2>Засварлагчийг ачаалж чадсангүй</h2><p>Document Server ажиллаж байгаа эсэх болон серверийн HTTPS хаягийг админ тохиргооноос шалгана уу.</p><button id="officeRetry" type="button">Дахин ачаалах</button></div>
<script type="application/json" id="officeBoot"><?= json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_INVALID_UTF8_SUBSTITUTE) ?></script>
<script src="assets/js/office-window.js"></script>
</body></html>

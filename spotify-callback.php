<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/spotify.php';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header('Pragma: no-cache');
try {
    sp_session(); sp_oauth_complete($_GET);
    $_SESSION['sp_flash'] = 'Тоглуулагч амжилттай холбогдлоо.';
} catch (SpotifySiteException $e) {
    if (session_status() === PHP_SESSION_ACTIVE) $_SESSION['sp_flash'] = $e->getMessage();
} catch (Throwable $e) {
    if (session_status() === PHP_SESSION_ACTIVE) $_SESSION['sp_flash'] = 'Нэвтрэлт амжилтгүй боллоо. Дахин оролдоорой.';
}
session_write_close();
try { $target = sp_config()['pageUrl']; } catch (Throwable $e) { $target = './spotify.php'; }
header('Location: ' . $target, true, 303);
exit;

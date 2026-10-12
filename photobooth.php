<?php
/* A QR/link opens only its Photobooth PNG and optional animated companion. */
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/folders.php';
require __DIR__ . '/inc/photobooth.php';

header('Cache-Control: private, no-store');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; script-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'");

function photobooth_h($value) { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); }
function photobooth_public_json($data, $code = 200) { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE); exit; }

$info = null; $error = ''; $token = $_GET['token'] ?? ''; $action = $_GET['action'] ?? '';
try {
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', array('GET', 'HEAD'), true)) photobooth_error('GET хүсэлт шаардлагатай.', 405);
    if ($action !== '' && $action !== 'photobooth_share_info') photobooth_error('Хуудас олдсонгүй.', 404);
    $row = photobooth_public_record($token);
    if (isset($_GET['asset'])) photobooth_stream_asset($row, $_GET['asset']);
    $info = photobooth_public_info($row, $token);
    if ($action === 'photobooth_share_info') photobooth_public_json($info);
} catch (Throwable $failure) {
    $code = (int)$failure->getCode(); if ($code < 400 || $code > 599) $code = 500;
    $error = $code >= 500 ? 'Зургийг түр үзүүлэх боломжгүй байна. Дараа дахин оролдоорой.' : $failure->getMessage();
    if ($action === 'photobooth_share_info' || isset($_GET['asset'])) photobooth_public_json(array('ok' => false, 'error' => $error), $code);
    http_response_code($code);
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') exit;
?><!doctype html>
<html lang="mn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#efb23f">
  <title><?= photobooth_h($info ? $info['title'] : 'Photobooth') ?> · IwnlX</title>
  <link rel="icon" href="assets/img/favicon-48.png" type="image/png">
  <style>
    :root{color-scheme:light;--ink:#29211b;--paper:#fffaf0;--orange:#ff6b1e;--line:#d2bea7}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Helvetica,sans-serif;line-height:1.5}a{color:inherit}header,main,footer{max-width:1100px;margin:auto;padding:22px 28px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line)}.brand{text-decoration:none;background:var(--ink);padding:10px 16px;border-radius:10px}.brand img{width:220px;max-width:40vw;height:auto;display:block}.brand small{color:#fff;font-size:10px;display:block;font-weight:500;letter-spacing:2px;padding-left:4px}.back{font-size:13px;text-decoration:none;border-bottom:1px solid currentColor}h1{font-size:clamp(28px,5vw,48px);line-height:1.1;letter-spacing:-1.5px;margin:30px 0 10px}.intro{color:#746251;margin:0 0 28px}.captures{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}.captures.single{max-width:560px;grid-template-columns:1fr;margin:auto}.capture{margin:0;border:1px solid var(--line);border-radius:18px;background:#fff;padding:18px;box-shadow:5px 6px 0 #efdbba}.capture img,.capture video{width:100%;max-height:78vh;object-fit:contain;display:block;border-radius:6px;background:#f4ece1}.capture h2{font-size:20px;letter-spacing:-.5px;margin:18px 0 4px}.capture p{font-size:13px;color:#746251;margin:0 0 16px}.download{display:block;background:var(--ink);color:#fff;text-align:center;border-radius:9px;padding:12px 18px;text-decoration:none;font-weight:700}.download:focus-visible,.back:focus-visible{outline:3px solid var(--orange);outline-offset:5px}.live .download{background:var(--orange);color:var(--ink)}.error{max-width:600px;margin:80px auto;padding:28px;border:1px solid var(--line);border-radius:18px;background:#fff}footer{font-size:12px;color:#746251;text-align:center;padding-top:36px;padding-bottom:36px}@media(max-width:680px){header,main,footer{padding-left:18px;padding-right:18px}.captures{grid-template-columns:1fr;gap:22px}.capture{padding:12px}.capture img,.capture video{max-height:none}h1{margin-top:24px}}
  </style>
</head>
<body>
  <header><a class="brand" href="index.php#photobooth" aria-label="IwnlX Photobooth"><img src="assets/img/photobooth/logo.png" alt="IwnlX"><small>PHOTOBOOTH · 12-2</small></a><a class="back" href="index.php#photobooth">Photobooth руу</a></header>
  <main>
  <?php if (!$info): ?>
    <div class="error"><h1>Холбоос нээгдэхгүй байна</h1><p><?= photobooth_h($error) ?></p><p>Зураг авсан хүнээс шинэ QR холбоос аваарай.</p></div>
  <?php else: ?>
    <h1><?= photobooth_h($info['title']) ?></h1>
    <p class="intro"><?= date('Y.m.d', $info['time']) ?> · Зургаа утсандаа хадгалаарай.</p>
    <div class="captures<?= $info['motion'] ? '' : ' single' ?>">
      <figure class="capture"><img src="<?= photobooth_h($info['photo']['url']) ?>" alt="<?= photobooth_h($info['title']) ?> Photobooth зураг" decoding="async"><figcaption><h2>Зургийн хуудас</h2><p>PNG · Бүтэн хэмжээтэй зураг</p><a class="download" href="<?= photobooth_h($info['photo']['download']) ?>" download>PNG татах</a></figcaption></figure>
      <?php if ($info['motion']): $motion = $info['motion']; ?>
      <figure class="capture live">
        <?php if ($motion['ext'] === 'gif'): ?><img src="<?= photobooth_h($motion['url']) ?>" alt="Хөдөлгөөнт Photobooth зураг" decoding="async"><?php else: ?><video src="<?= photobooth_h($motion['url']) ?>" controls muted playsinline loop preload="metadata" aria-label="Хөдөлгөөнт Photobooth зураг"></video><?php endif; ?>
        <figcaption><h2>Live зураг</h2><p><?= strtoupper(photobooth_h($motion['ext'])) ?> · Хөдөлгөөнт дурсамж</p><a class="download" href="<?= photobooth_h($motion['download']) ?>" download><?= strtoupper(photobooth_h($motion['ext'])) ?> татах</a></figcaption>
      </figure>
      <?php endif; ?>
    </div>
  <?php endif; ?>
  </main>
  <footer>Энэ холбоос зөвхөн энэ Photobooth зургийг нээнэ.</footer>
</body>
</html>

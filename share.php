<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
ensure_dirs();
$schedule = load_schedule();
$token = isset($_GET['token']) && is_string($_GET['token']) && preg_match('/^[a-f0-9]{64}$/D', $_GET['token']) ? $_GET['token'] : '';
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function asset($p) { $f = __DIR__ . '/' . $p; return $p . (is_file($f) ? '?v=' . filemtime($f) : ''); }
function icon($name, $cls = '') { return '<svg class="i ' . $cls . '" aria-hidden="true"><use href="#i-' . $name . '"/></svg>'; }
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: private, no-store');
header('X-Robots-Tag: noindex, nofollow');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
?><!doctype html>
<html lang="mn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#0fa35a">
  <title>Хуваалцсан хавтас · <?= h($schedule['className']) ?></title>
  <link rel="icon" href="<?= h(asset('assets/img/favicon-48.png')) ?>" type="image/png">
  <link rel="stylesheet" href="<?= h(asset('assets/css/style.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/folders.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/workspace.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/senior.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/themes.css')) ?>">
  <script src="<?= h(asset('assets/js/theme.js')) ?>"></script><script src="<?= h(asset('assets/js/i18n.js')) ?>"></script><link rel="stylesheet" href="<?= h(asset('assets/css/navigation.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/glass.css')) ?>">
</head>
<body data-page="share" data-tab="folders">
<?php include __DIR__ . '/inc/icons.php'; ?>
<div class="bg-orbs" aria-hidden="true"><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div></div>
<div class="grain" aria-hidden="true"></div>
<header class="nav glass">
  <a class="brand" href="index.php#folders" aria-label="Сурагчдын хавтас">
    <span class="brand-mark photo"><img src="<?= h(asset('assets/img/logo.jpg')) ?>" alt="" width="400" height="250" decoding="async"></span>
    <span class="brand-text"><b><?= h($schedule['className']) ?> анги</b><small>Хуваалцсан хавтас</small></span>
  </a>
  <a class="btn btn-ghost btn-sm" href="index.php#folders"><?= icon('folder', 'i-sm') ?>Бүх хавтас</a>
  <?php include __DIR__ . '/inc/language-switch.php'; ?><?php include __DIR__ . '/inc/theme-toggle.php'; ?>
</header>
<main class="wrap" id="sharedFolderApp" data-token="<?= h($token) ?>">
  <section class="view">
    <div class="folders-hero glass">
      <div class="folders-heading">
        <span class="folder-hero-icon"><?= icon('folder', 'i-lg') ?></span>
        <div><h1 id="sharedFolderTitle">Хуваалцсан хавтас</h1><p id="sharedFolderDescription">Ачаалж байна…</p></div>
      </div>
      <div class="head-actions"><button class="btn btn-primary" id="sharedFolderUploadBtn" type="button" hidden><?= icon('upload') ?>Файл нэмэх</button><input type="file" id="sharedFolderFileInput" multiple hidden></div>
    </div>
    <p class="hint" id="sharedFolderPermission"></p>
    <nav class="folder-breadcrumbs" id="sharedFolderBreadcrumbs" aria-label="Хавтасны зам"></nav>
    <div class="folder-status" id="sharedFolderStatus" role="status" aria-live="polite"></div>
    <div class="folder-upload glass" id="sharedFolderUploadProgress" hidden>
      <div><span id="sharedFolderUploadMessage" role="status" aria-live="polite"></span><button class="btn btn-ghost btn-sm" id="sharedFolderCancelUpload" type="button">Цуцлах</button></div>
      <progress id="sharedFolderProgressBar" max="100" value="0" aria-label="Файл нэмэх явц"></progress>
    </div>
    <div class="folder-toolbar glass">
      <label class="folder-search"><span>Файлаар хайх</span><input class="input" id="sharedFolderSearch" type="search" placeholder="Файлын нэр…" autocomplete="off"></label>
      <div class="head-actions"><label class="folder-select-all"><input id="sharedFolderSelectAll" type="checkbox">Бүгдийг сонгох</label><span id="sharedFolderSelectionCount" class="hint">0 сонгосон</span><button class="btn btn-ghost" id="sharedFolderDownloadSelected" type="button" disabled><?= icon('download', 'i-sm') ?>ZIP татах</button></div>
    </div>
    <div class="folder-directories" id="sharedFolderDirectories"></div>
    <div class="folder-files" id="sharedFolderFiles"></div>
  </section>
</main>
<footer class="foot wrap glass"><span>© <?= date('Y') ?> <?= h($schedule['className']) ?> анги</span><span>Холбоосын эрхийн дагуу файл үзэх, татах, нэмэх боломжтой.</span></footer>
<script type="application/json" id="boot">{}</script>
<script src="<?= h(asset('assets/js/common.js')) ?>"></script>
<script src="<?= h(asset('assets/js/file-preview.js')) ?>"></script>
<script src="<?= h(asset('assets/js/file-editors.js')) ?>"></script>
<script src="<?= h(asset('assets/js/shared-folders.js')) ?>"></script>
</body>
</html>

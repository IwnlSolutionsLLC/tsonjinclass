<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/spotify.php';

ensure_dirs();
$schedule = load_schedule();
$pdf = schedule_pdf_info();
$admin = is_admin();
$member = $admin || is_member();
$className = $schedule['className'];
$boot = array(
    'schedule' => $schedule,
    'pdf' => $pdf,
    'admin' => $admin,
    'member' => $member,
    'setup' => setup_needed(),
    'csrf' => $member ? csrf_token() : null,
);
$spotifyConfig = sp_config();
$spotifyBoot = array('clientId' => $spotifyConfig['clientId'], 'redirectUri' => $spotifyConfig['redirectUri'], 'apiUrl' => 'spotify.php');
$mirrorBoot = array('apiUrl' => 'teachermirror.php', 'admin' => $admin);
$cctvBoot = array('apiUrl' => 'cctv/api.php', 'admin' => $admin, 'adminCsrf' => $admin ? csrf_token() : null, 'setupUrl' => 'admin.php#camera-setup');

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function asset($p) { $f = __DIR__ . '/' . $p; return $p . (is_file($f) ? '?v=' . filemtime($f) : ''); }
function icon($name, $cls = '') { return '<svg class="i ' . $cls . '" aria-hidden="true"><use href="#i-' . $name . '"/></svg>'; }

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cache-Control: no-store');
header('Permissions-Policy: camera=(self), microphone=(self), display-capture=(self)');
?><!doctype html>
<html lang="mn" class="<?= $admin ? 'is-admin ' : '' ?><?= $member ? 'is-member' : '' ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title><?= h($className) ?> анги</title>
  <meta name="description" content="<?= h($className) ?> ангийн хичээл, дугуйлангийн хуваарь, сурах бичиг, хувийн ажил, цомог, Дурсамжийн самбар, Music, YouTube, GOOGLE, Photobooth болон AI CHAT.">
  <meta name="theme-color" content="#6d4aff">
  <script src="<?= h(asset('assets/js/theme.js')) ?>"></script>
  <script src="<?= h(asset('assets/js/i18n.js')) ?>"></script>
  <link rel="icon" href="assets/img/favicon-48.png" sizes="48x48" type="image/png">
  <link rel="icon" href="assets/img/logo-192.png" sizes="192x192" type="image/png">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Unbounded:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= h(asset('assets/css/style.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/folders.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/workspace.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/textbooks.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/doodle.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/board.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/clubs.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/student-clubs.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/music.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/music-lyrics.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/youtube.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/google.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/flashcards.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/ludo.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/chooser.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/games.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/note-board.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/photobooth.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/ai-chat.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/senior.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/themes.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/cctv-display.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/navigation.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/teachermirror.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/intercom.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/call-board.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/aurora.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/motion.css')) ?>">
</head>
<body data-page="home" data-tab="schedule">
<?php include __DIR__ . '/inc/icons.php'; ?>
<div class="bg-orbs" aria-hidden="true"><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div><div class="orb o4"></div><div class="bg-stars"></div><div class="bg-grid"></div></div>
<div class="grain" aria-hidden="true"></div>

<header class="nav nav-home glass nav-with-menu">
  <button id="siteMenuButton" class="site-menu-button" type="button" aria-controls="siteMenu" aria-expanded="false" aria-haspopup="dialog" aria-label="Цэс нээх" data-i18n-aria-label="nav.openMenu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span data-i18n="nav.menu">Цэс</span></button>
  <a class="brand" href="#schedule" data-tab="schedule" aria-label="Нүүр">
    <span class="brand-mark photo"><img src="<?= h(asset('assets/img/logo.jpg')) ?>" alt="" width="400" height="250" decoding="async"></span>
    <span class="brand-text"><b><span data-i18n-skip><?= h($className) ?></span> <span data-i18n="nav.class">анги</span><span class="brand-dot"></span></b><small data-i18n="brand.tagline">Суралцах. Бүтээх. Дурсах.</small></span>
  </a>
  <span class="nav-current" id="siteCurrentSection" data-i18n="nav.schedule">Хуваарь</span>
  <div class="nav-actions">
    <?php include __DIR__ . '/inc/language-switch.php'; ?>
    <?php include __DIR__ . '/inc/theme-toggle.php'; ?>
  </div>
</header>
<dialog class="site-menu" id="siteMenu" aria-labelledby="siteMenuTitle">
  <div class="site-menu-head"><span class="site-menu-logo" aria-hidden="true"><img src="<?= h(asset('assets/img/logo.jpg')) ?>" alt="" width="400" height="250" decoding="async"></span><div><span class="site-menu-kicker" data-i18n-skip><?= h($className) ?></span><h2 id="siteMenuTitle" data-i18n="nav.sections">Ангийн хэрэгслүүд</h2><p data-i18n="nav.subtitle">Суралцах, бүтээх, хамтдаа байх.</p></div><button class="site-menu-close" id="siteMenuClose" type="button" aria-label="Цэс хаах" data-i18n-aria-label="nav.close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
  <div class="tabs site-menu-tabs" role="tablist" aria-orientation="vertical" aria-label="Хэсгүүд" data-i18n-aria-label="nav.sections">
    <div class="tab-group" role="presentation"><span class="tab-group-label" aria-hidden="true" data-i18n="nav.group.lessons">Хичээл</span></div>
    <button class="tab" type="button" role="tab" id="tab-schedule" aria-controls="view-schedule" data-tab="schedule"><?= icon('calendar') ?><span data-i18n="nav.schedule">Хуваарь</span></button>
    <button class="tab" type="button" role="tab" id="tab-clubs" aria-controls="view-clubs" data-tab="clubs"><?= icon('clock') ?><span data-i18n="nav.clubs">Дугуйлан</span></button>
    <button class="tab" type="button" role="tab" id="tab-teachermirror" aria-controls="view-teachermirror" data-tab="teachermirror"><?= icon('screen') ?><span data-i18n="nav.teachermirror">Дэлгэц Хуваалцах</span></button>
    <div class="tab-group" role="presentation"><span class="tab-group-label" aria-hidden="true" data-i18n="nav.group.study">Сурах</span></div>
    <button class="tab" type="button" role="tab" id="tab-textbooks" aria-controls="view-textbooks" data-tab="textbooks"><?= icon('book') ?><span data-i18n="nav.textbooks">СУРАХ БИЧИГ</span></button>
    <button class="tab" type="button" role="tab" id="tab-folders" aria-controls="view-folders" data-tab="folders"><?= icon('folder') ?><span data-i18n="nav.folders">Хавтас</span></button>
    <button class="tab" type="button" role="tab" id="tab-ai-chat" aria-controls="view-ai-chat" data-tab="ai-chat"><?= icon('chat') ?><span data-i18n="nav.aiChat">AI CHAT</span></button>
    <div class="tab-group" role="presentation"><span class="tab-group-label" aria-hidden="true" data-i18n="nav.group.create">Бүтээл ба дурсамж</span></div>
    <button class="tab" type="button" role="tab" id="tab-album" aria-controls="view-album" data-tab="album"><?= icon('images') ?><span data-i18n="nav.album">Цомог</span><?= icon('lock', 'tab-lock') ?></button>
    <button class="tab" type="button" role="tab" id="tab-doodle" aria-controls="view-doodle" data-tab="doodle"><?= icon('pen') ?><span data-i18n="nav.doodle">Дурсамжийн самбар</span><?= icon('lock', 'tab-lock') ?></button>
    <button class="tab" type="button" role="tab" id="tab-board" aria-controls="view-board" data-tab="board"><?= icon('palette') ?><span data-i18n="nav.board">САМБАР</span><?= icon('lock', 'tab-lock') ?></button>
    <button class="tab" type="button" role="tab" id="tab-photobooth" aria-controls="view-photobooth" data-tab="photobooth"><?= icon('camera') ?><span data-i18n="nav.photobooth">Photobooth</span></button>
    <div class="tab-group" role="presentation"><span class="tab-group-label" aria-hidden="true" data-i18n="nav.group.fun">Чөлөөт цаг</span></div>
    <button class="tab" type="button" role="tab" id="tab-music" aria-controls="view-music" data-tab="music"><?= icon('music') ?><span data-i18n="nav.music">Music</span></button>
    <button class="tab" type="button" role="tab" id="tab-youtube" aria-controls="view-youtube" data-tab="youtube"><?= icon('youtube') ?><span data-i18n="nav.youtube">YouTube</span></button>
    <button class="tab" type="button" role="tab" id="tab-google" aria-controls="view-google" data-tab="google"><?= icon('globe') ?><span data-i18n="nav.google">GOOGLE</span></button>
    <button class="tab" type="button" role="tab" id="tab-games" aria-controls="view-games" data-tab="games"><?= icon('dice') ?><span data-i18n="nav.games">Тоглоомууд</span></button>
  </div>
  <div class="site-menu-footer">
    <button class="btn btn-ghost" type="button" id="siteFullscreenButton" data-menu-action aria-pressed="false" title="Бүтэн дэлгэц" data-i18n-title="mirror.fullscreen"><?= icon('expand') ?><span data-i18n="mirror.fullscreen">Бүтэн дэлгэц</span></button>
    <button class="btn btn-ghost" type="button" id="intercomListenButton" title="Intercom сонсох" data-i18n-title="intercom.listen" data-menu-action data-chime="<?= h(asset('assets/audio/music.mp3')) ?>" aria-pressed="false"><?= icon('speaker') ?><span data-i18n="intercom.listen">Intercom сонсох</span></button>
    <button class="btn btn-ghost" type="button" data-add-media title="Зураг нэмэх" data-i18n-title="nav.addPhoto"><?= icon('plus') ?><span data-i18n="nav.addPhoto">Зураг нэмэх</span></button>
    <a class="btn btn-ghost" href="admin.php" title="Удирдлага" data-i18n-title="nav.admin"><?= icon('settings') ?><span data-i18n="nav.admin">Удирдлага</span></a>
  </div>
</dialog>

<main class="wrap">
  <!-- ================= ХУВААРЬ ================= -->
  <section class="view" id="view-schedule" role="tabpanel" aria-labelledby="tab-schedule">
    <div class="dash">
      <div class="today-card glass">
        <span class="today-num" id="todayNum" aria-hidden="true" data-i18n-skip></span>
        <div class="today-head">
          <p class="home-greeting" id="homeGreeting" data-i18n-skip></p>
          <h1 class="today-day" id="todayDay" data-i18n-skip></h1>
          <p class="today-date" id="dateLine" data-i18n-skip></p>
        </div>
        <ul class="today-facts">
          <?php if ($schedule['homeroom']['teacher'] !== ''): ?>
            <li class="fact"><span class="fact-ico"><?= icon('user') ?></span><span class="fact-text"><span class="fact-label">Даасан багш</span><b class="fact-value" data-user-content><?= h($schedule['homeroom']['teacher']) ?></b></span></li>
          <?php endif; ?>
          <?php if ($schedule['homeroom']['room'] !== ''): ?>
            <li class="fact"><span class="fact-ico"><?= icon('door') ?></span><span class="fact-text"><span class="fact-label">Танхим</span><b class="fact-value" data-user-content><?= h($schedule['homeroom']['room']) ?></b></span></li>
          <?php endif; ?>
          <li class="fact"><span class="fact-ico"><?= icon('calendar') ?></span><span class="fact-text"><span class="fact-label" data-i18n="schedule.factWeek">7 хоногт</span><b class="fact-value" id="factWeek" data-i18n-skip>—</b></span></li>
          <li class="fact"><span class="fact-ico"><?= icon('clock') ?></span><span class="fact-text"><span class="fact-label">Өнөөдөр</span><b class="fact-value" id="factToday" data-i18n-skip>—</b></span></li>
        </ul>
      </div>

      <aside class="now-card glass" aria-live="polite">
        <div class="now-head"><span class="label" id="nowLabel">Өнөөдөр</span><span class="clock" id="clock">--:--</span></div>
        <div class="now-main idle" id="nowMain"></div>
        <div class="next-list" id="nextList"></div>
      </aside>
    </div>

    <div class="home-launch" role="group" aria-label="Хурдан нээх" data-i18n-aria-label="home.launch">
      <button class="home-tile" type="button" data-tab="music" style="--ta:#8b5cf6;--tb:#ec4899"><span class="home-tile-icon"><?= icon('music') ?></span><span class="home-tile-copy"><b data-i18n="nav.music">Music</b><small data-i18n="home.tile.music">Дуу сонсох</small></span><span class="home-tile-arrow" aria-hidden="true">↗</span></button>
      <button class="home-tile" type="button" data-tab="google" style="--ta:#3b82f6;--tb:#22d3ee"><span class="home-tile-icon"><?= icon('globe') ?></span><span class="home-tile-copy"><b data-i18n="nav.google">GOOGLE</b><small data-i18n="home.tile.google">Хайх, сурах</small></span><span class="home-tile-arrow" aria-hidden="true">↗</span></button>
      <button class="home-tile" type="button" data-tab="games" style="--ta:#f59e0b;--tb:#ef4444"><span class="home-tile-icon"><?= icon('dice') ?></span><span class="home-tile-copy"><b data-i18n="nav.games">Тоглоомууд</b><small data-i18n="home.tile.games">Ludo, Chooser…</small></span><span class="home-tile-arrow" aria-hidden="true">↗</span></button>
      <button class="home-tile" type="button" data-tab="ai-chat" style="--ta:#6d4aff;--tb:#22d3ee"><span class="home-tile-icon"><?= icon('chat') ?></span><span class="home-tile-copy"><b data-i18n="nav.aiChat">AI CHAT</b><small data-i18n="home.tile.ai">Асуулт асуух</small></span><span class="home-tile-arrow" aria-hidden="true">↗</span></button>
      <button class="home-tile" type="button" data-tab="textbooks" style="--ta:#10b981;--tb:#3b82f6"><span class="home-tile-icon"><?= icon('book') ?></span><span class="home-tile-copy"><b data-i18n="nav.textbooks">СУРАХ БИЧИГ</b><small data-i18n="home.tile.books">12-р ангийн ном</small></span><span class="home-tile-arrow" aria-hidden="true">↗</span></button>
      <button class="home-tile" type="button" data-tab="folders" style="--ta:#0ea5e9;--tb:#6366f1"><span class="home-tile-icon"><?= icon('folder') ?></span><span class="home-tile-copy"><b data-i18n="nav.folders">Хавтас</b><small data-i18n="home.tile.folders">Миний файлууд</small></span><span class="home-tile-arrow" aria-hidden="true">↗</span></button>
      <button class="home-tile" type="button" data-tab="doodle" style="--ta:#ec4899;--tb:#f97316"><span class="home-tile-icon"><?= icon('pen') ?></span><span class="home-tile-copy"><b data-i18n="nav.doodle">Дурсамжийн самбар</b><small data-i18n="home.tile.doodle">Зурж үлдээх</small></span><span class="home-tile-arrow" aria-hidden="true">↗</span></button>
      <button class="home-tile" type="button" data-tab="youtube" style="--ta:#ef4444;--tb:#f97316"><span class="home-tile-icon"><?= icon('youtube') ?></span><span class="home-tile-copy"><b data-i18n="nav.youtube">YouTube</b><small data-i18n="home.tile.youtube">Хамтдаа үзэх</small></span><span class="home-tile-arrow" aria-hidden="true">↗</span></button>
    </div>

    <div class="section-head">
      <div>
        <h2>Хичээлийн хуваарь</h2>
        <p id="schedSub"><?= h($className) ?> анги болон түвшний нийтлэг хичээлүүд</p>
      </div>
      <div class="head-actions">
        <div class="seg" id="viewSeg" role="tablist" aria-label="Хуваарь харах"></div>
        <a class="btn btn-ghost btn-sm admin-only" href="admin.php#schedule" hidden><?= icon('edit', 'i-sm') ?>Засах</a>
      </div>
    </div>
    <div class="glass week-shell" id="schedView"></div>
    <div class="sched-foot">
      <span id="schedUpdated"></span>
      <?php if ($pdf): ?>
        <a href="<?= h($pdf['url']) ?>" target="_blank" rel="noopener"><?= icon('file', 'i-sm') ?>Сургуулийн эх хуваарь (PDF)</a>
      <?php endif; ?>
    </div>
  </section>

  <!-- ================= ЦОМОГ ================= -->
  <section class="view" id="view-album" role="tabpanel" aria-labelledby="tab-album" hidden>
    <div class="lock-screen" id="albumLock" hidden>
      <div class="lock-card glass">
        <div class="lock-icon"><?= icon('lock', 'i-lg') ?></div>
        <h2>Цомог түгжээтэй</h2>
        <p>Ангийн цомгийг үзэхийн тулд 4 оронтой кодоо оруулна уу.</p>
        <div class="pin" id="albumPin"></div>
      </div>
    </div>

    <div id="albumBody" hidden>
      <div class="album-hero glass">
        <div class="album-title">
          <span class="album-icon"><?= icon('images', 'i-lg') ?></span>
          <div>
            <h2>Ангийн цомог</h2>
            <p id="albumStats">Дурсамжит зураг, бичлэгүүд</p>
          </div>
        </div>
        <div class="head-actions">
          <button class="btn btn-primary" data-add-media><?= icon('plus') ?>Зураг нэмэх</button>
          <button class="btn btn-ghost admin-only" id="selToggle" hidden><?= icon('select', 'i-sm') ?><span>Сонгох</span></button>
          <button class="btn btn-danger admin-only" id="selDelete" hidden><?= icon('trash', 'i-sm') ?><span>Устгах</span></button>
          <button class="btn btn-ghost btn-icon" id="albumLockBtn" title="Цомгийг түгжих" aria-label="Цомгийг түгжих"><?= icon('lock', 'i-sm') ?></button>
        </div>
      </div>
      <div class="gal-bar">
        <div class="seg" id="galFilter" role="tablist" aria-label="Шүүлтүүр">
          <button class="on" data-f="all">Бүгд <span class="badge" data-c="all">0</span></button>
          <button data-f="image"><?= icon('images', 'i-sm') ?>Зураг <span class="badge" data-c="image">0</span></button>
          <button data-f="video"><?= icon('video', 'i-sm') ?>Видео <span class="badge" data-c="video">0</span></button>
          <button data-f="screenshot"><?= icon('screen', 'i-sm') ?><span data-i18n="album.screenshots">Screenshot</span> <span class="badge" data-c="screenshot">0</span></button>
        </div>
        <span class="gal-stats" id="galStats"></span>
      </div>
      <div id="gallery" aria-live="polite"></div>
      <div class="gal-more"><button class="btn btn-ghost" id="loadMore" hidden>Цааш үзэх</button></div>
    </div>
  </section>
  <!-- ================= ХАВТАС ================= -->
  <section class="view" id="view-folders" role="tabpanel" aria-labelledby="tab-folders" hidden>
    <div id="foldersHome">
      <div class="folders-hero glass">
        <div class="folders-heading">
          <span class="folder-hero-icon"><?= icon('folder', 'i-lg') ?></span>
          <div><h2>Сурагчдын хавтас</h2><p>Нэрээ сонгоод 4 оронтой нууц үгээ оруулна уу.</p></div>
        </div>
        <label class="folder-search"><span>Нэрээр хайх</span><input class="input" id="folderSearch" type="search" placeholder="Сурагчийн нэр…" autocomplete="off"></label>
      </div>
      <p class="folders-intro">Хувийн хавтсандаа файл нэмэх, урьдчилан үзэх, татах, устгах боломжтой.</p>
      <div id="foldersStatus" class="folder-status" role="status" aria-live="polite"></div>
      <div class="folder-grid" id="folderGrid"></div>
    </div>

    <div id="folderBody" hidden>
      <button class="btn btn-ghost btn-sm folder-back" id="folderBack"><?= icon('back', 'i-sm') ?>Бүх хавтас</button>
      <div class="folders-hero glass">
        <div class="folders-heading">
          <span class="folder-hero-icon"><?= icon('folder', 'i-lg') ?></span>
          <div><h2 id="folderTitle" data-i18n-skip></h2><p data-i18n-skip id="folderDescription" class="folder-meta-description"></p><p id="folderStats"></p></div>
        </div>
        <div class="head-actions folder-head-actions">
          <button class="btn btn-primary" id="folderUploadBtn"><?= icon('upload') ?>Файл нэмэх</button>
          <button class="btn btn-ghost" id="folderNewDirBtn"><?= icon('folder', 'i-sm') ?>Шинэ хавтас</button>
          <button class="btn btn-ghost btn-icon" id="folderMetaBtn" title="Хавтасны тайлбар, дүрс" aria-label="Хавтасны тайлбар, дүрс"><?= icon('settings', 'i-sm') ?></button>
          <button class="btn btn-ghost btn-icon" id="folderShareBtn" title="Хавтас хуваалцах" aria-label="Хавтас хуваалцах"><?= icon('link', 'i-sm') ?></button>
          <button class="btn btn-ghost" id="folderLockBtn"><?= icon('lock', 'i-sm') ?>Түгжих</button>
          <input id="folderFileInput" type="file" multiple hidden>
        </div>
      </div>
      <nav data-i18n-skip id="folderBreadcrumbs" class="folder-breadcrumbs" aria-label="Хавтасны зам"></nav>
      <div class="folder-upload glass" id="folderUploadProgress" hidden>
        <div class="folder-upload-top"><span id="folderUploadMessage" role="status" aria-live="polite"></span><button class="btn btn-ghost btn-sm" id="folderCancelUpload">Зогсоох</button></div>
        <progress id="folderProgressBar" max="100" value="0" aria-label="Файл байршуулах явц"></progress>
      </div>
      <div class="folder-toolbar glass">
        <label class="folder-search"><span>Файлаар хайх</span><input class="input" id="folderFileSearch" type="search" placeholder="Файлын нэр…" autocomplete="off"></label>
        <div class="folder-selection">
          <label class="folder-select-all"><input type="checkbox" id="folderSelectAll">Бүгдийг сонгох</label>
          <span id="folderSelectionCount" role="status" aria-live="polite">0 сонгосон</span>
        </div>
        <div class="folder-bulk-actions">
          <button class="btn btn-ghost btn-sm" id="folderMoveSelected" disabled><?= icon('folder', 'i-sm') ?>Зөөх</button>
          <button class="btn btn-ghost btn-sm" id="folderDownloadSelected" disabled><?= icon('download', 'i-sm') ?>Татах (ZIP)</button>
          <button class="btn btn-danger-ghost btn-sm" id="folderDeleteSelected" disabled><?= icon('trash', 'i-sm') ?>Устгах</button>
        </div>
      </div>
      <div id="folderFilesStatus" class="folder-status" role="status" aria-live="polite"></div>
      <div id="folderDirectories" class="folder-directories"></div>
      <div id="folderFiles" class="folder-files"></div>
    </div>
  </section>
  <?php include __DIR__ . '/inc/textbooks-view.php'; ?>
  <?php include __DIR__ . '/inc/doodle-view.php'; ?>
  <?php include __DIR__ . '/inc/board-view.php'; ?>
  <?php include __DIR__ . '/inc/clubs-view.php'; ?>
  <?php include __DIR__ . '/inc/music-view.php'; ?>
  <?php include __DIR__ . '/inc/youtube-view.php'; ?>
  <?php include __DIR__ . '/inc/google-view.php'; ?>
  <?php include __DIR__ . '/inc/games-view.php'; ?>
  <?php include __DIR__ . '/inc/photobooth-view.php'; ?>
  <?php include __DIR__ . '/inc/ai-chat-view.php'; ?>
  <?php include __DIR__ . '/inc/teachermirror-view.php'; ?>
</main>

<footer class="foot wrap glass">
  <span>© <?= date('Y') ?> <?= h($className) ?> анги<?= $schedule['school'] ? ' · ' . h($schedule['school']) : '' ?></span>
  <span><a href="admin.php">Удирдлага</a></span>
</footer>


<button class="fab" data-add-media aria-label="Зураг нэмэх"><?= icon('plus', 'i-lg') ?></button>
<div class="intercom-pill" id="intercomPill" role="status" aria-live="polite" data-i18n-skip hidden><i aria-hidden="true"></i><span></span></div>
<?php include __DIR__ . '/inc/note-board-view.php'; ?>
<dialog class="call-overlay" id="callOverlay" data-state="idle" aria-labelledby="callName" aria-describedby="callStatus" data-ring="<?= h(asset('assets/audio/1006.mp3')) ?>">
  <div class="call-card">
    <div class="call-art" aria-hidden="true">
      <span class="call-ring"></span><span class="call-ring"></span><span class="call-ring"></span>
      <span class="call-avatar-frame">
        <img class="call-avatar" id="callAvatar" src="<?= h(asset('assets/img/teacher.jpg')) ?>" alt="" width="320" height="320" decoding="async">
        <svg class="call-avatar-fallback" viewBox="0 0 24 24" hidden><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
      </span>
    </div>
    <div class="call-heading">
      <h2 class="call-name" id="callName" data-i18n="call.board.teacher">Багш</h2>
      <p class="call-status" id="callStatus" role="status" aria-live="polite" data-i18n-skip>Багш дуудаж байна…</p>
      <p class="call-timer" id="callTimer" role="timer" aria-live="off" aria-label="Ярианы хугацаа" data-i18n-aria-label="call.board.timerLabel" hidden>00:00</p>
    </div>
    <div class="call-mic" id="callMic" data-mic="off" role="status" aria-live="polite" hidden>
      <svg class="call-mic-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/><path class="call-mic-slash" d="M4 4l16 16"/></svg>
      <span class="call-mic-text" id="callMicText" data-i18n-skip></span>
    </div>
    <div class="call-notes" role="status" aria-live="polite">
      <p class="call-note" id="callNoteSound" data-i18n-skip hidden></p>
      <p class="call-note" id="callNoteTeacher" data-i18n-skip hidden></p>
      <p class="call-note" id="callNoteMic" data-i18n-skip hidden></p>
    </div>
    <div class="call-actions">
      <button class="call-btn call-btn-mute" id="callMute" type="button" aria-pressed="false" hidden>
        <svg class="call-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/><path class="call-mic-slash" d="M4 4l16 16"/></svg>
        <span id="callMuteLabel" data-i18n-skip>Микрофон хаах</span>
      </button>
      <button class="call-btn call-btn-hangup" id="callHangup" type="button">
        <svg class="call-btn-icon call-hangup-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>
        <span id="callHangupLabel" data-i18n-skip>Татгалзах</span>
      </button>
    </div>
    <audio id="callRemoteAudio" autoplay playsinline hidden></audio>
  </div>
</dialog>

<script type="application/json" id="boot"><?= json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_INVALID_UTF8_SUBSTITUTE) ?></script>
<script src="<?= h(asset('assets/js/common.js')) ?>"></script>
<script src="<?= h(asset('assets/js/uploader.js')) ?>"></script>
<script src="<?= h(asset('assets/js/file-preview.js')) ?>"></script>
<script src="<?= h(asset('assets/js/office-editor.js')) ?>"></script>
<script src="<?= h(asset('assets/js/file-editors.js')) ?>"></script>
<script src="<?= h(asset('assets/js/file-converter.js')) ?>"></script>
<script src="<?= h(asset('assets/js/folders.js')) ?>"></script>
<script src="<?= h(asset('assets/js/textbooks.js')) ?>"></script>
<script src="<?= h(asset('assets/js/doodle.js')) ?>"></script>
<script src="<?= h(asset('assets/js/board.js')) ?>"></script>
<script src="<?= h(asset('assets/js/club-clock.js')) ?>"></script>
<script src="<?= h(asset('assets/js/student-clubs.js')) ?>"></script>
<script src="<?= h(asset('assets/js/clubs.js')) ?>"></script>
<script>window.C122_SPOTIFY=<?= json_encode($spotifyBoot, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="<?= h(asset('assets/js/spotify.js')) ?>"></script>
<script src="<?= h(asset('assets/js/music-player.js')) ?>"></script>
<script src="<?= h(asset('assets/js/music.js')) ?>"></script>
<script src="<?= h(asset('assets/js/music-lyrics.js')) ?>"></script>
<script src="<?= h(asset('assets/js/youtube.js')) ?>"></script>
<script src="<?= h(asset('assets/js/google.js')) ?>"></script>
<script src="<?= h(asset('assets/js/sfx.js')) ?>"></script>
<script src="<?= h(asset('assets/js/flashcards.js')) ?>"></script>
<script src="<?= h(asset('assets/js/ludo.js')) ?>"></script>
<script src="<?= h(asset('assets/js/chooser.js')) ?>"></script>
<script src="<?= h(asset('assets/js/games.js')) ?>"></script>
<script src="<?= h(asset('assets/js/vendor/qrcode/qrcode.min.js')) ?>"></script>
<script src="<?= h(asset('assets/js/vendor/gif/gif.js')) ?>"></script>
<script src="<?= h(asset('assets/js/photobooth-effects.js')) ?>"></script>
<script src="<?= h(asset('assets/js/photobooth-vision.js')) ?>"></script>
<script src="<?= h(asset('assets/js/photobooth.js')) ?>"></script>
<script src="<?= h(asset('assets/js/ai-chat.js')) ?>"></script>
<script>window.C122_CCTV = <?= json_encode($cctvBoot, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;window.C122_CCTV.setupRequested=location.hash==='#camera-setup';</script>
<script>window.C122_TEACHERMIRROR = <?= json_encode($mirrorBoot, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="<?= h(asset('assets/js/cctv-peer.js')) ?>"></script>
<script src="<?= h(asset('assets/js/teachermirror.js')) ?>"></script>
<script src="<?= h(asset('assets/js/navigation.js')) ?>"></script>
<script src="<?= h(asset('assets/js/fullscreen-back.js')) ?>"></script>
<script src="<?= h(asset('assets/js/display-fullscreen.js')) ?>"></script>
<script src="<?= h(asset('assets/js/app.js')) ?>"></script>
<script src="<?= h(asset('assets/js/home.js')) ?>"></script>
<script src="<?= h(asset('assets/js/motion.js')) ?>"></script>
<script src="<?= h(asset('assets/js/intercom-listener.js')) ?>"></script>
<script src="<?= h(asset('assets/js/call-board.js')) ?>"></script>
<script src="<?= h(asset('assets/js/note-board.js')) ?>"></script>
<script src="<?= h(asset('assets/js/cctv-display.js')) ?>"></script>
<script src="<?= h(asset('assets/js/android-display.js')) ?>"></script>
</body>
</html>

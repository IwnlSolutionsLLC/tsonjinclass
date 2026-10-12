<?php
define('C122', true);
require __DIR__ . '/inc/core.php';

ensure_dirs();
$admin = is_admin();
$schedule = load_schedule();
$setupWritable = setup_needed() ? setup_code() !== '' : true;   // database/setup.php-д тохиргооны код үүсгэнэ
$boot = array(
    'admin' => $admin,
    'csrf' => $admin ? csrf_token() : null,
    'albumPinCustom' => $admin ? !empty(album_cfg()['hash']) : null,
    'setup' => setup_needed(),
    'schedule' => $admin ? $schedule : null,
    'pdf' => $admin ? schedule_pdf_info() : null,
);
$cctvBoot = array('apiUrl' => 'cctv/api.php', 'admin' => $admin, 'adminCsrf' => $boot['csrf'], 'role' => 'viewer');

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function asset($p) { $f = __DIR__ . '/' . $p; return $p . (is_file($f) ? '?v=' . filemtime($f) : ''); }

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');
?><!doctype html>
<html lang="mn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex">
  <title>Удирдлага · <?= h($schedule['className']) ?> анги</title>
  <meta name="theme-color" content="#0fa35a">
  <script src="<?= h(asset('assets/js/theme.js')) ?>"></script><script src="<?= h(asset('assets/js/i18n.js')) ?>"></script><link rel="stylesheet" href="<?= h(asset('assets/css/navigation.css')) ?>">
  <link rel="icon" href="assets/img/favicon-48.png" sizes="48x48" type="image/png">
  <link rel="icon" href="assets/img/logo-192.png" sizes="192x192" type="image/png">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Unbounded:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= h(asset('assets/css/style.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/workspace.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/senior.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/themes.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/cctv.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/cctv-display.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/intercom.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/call.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/note.css')) ?>">
  <link rel="stylesheet" href="<?= h(asset('assets/css/aurora.css')) ?>">
</head>
<body data-page="admin">
<?php include __DIR__ . '/inc/icons.php'; ?>
<div class="bg-orbs" aria-hidden="true"><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div></div>
<div class="grain" aria-hidden="true"></div>

<header class="nav glass">
  <a class="brand" href="./" aria-label="Нүүр хуудас">
    <span class="brand-mark photo"><img src="<?= h(asset('assets/img/logo.jpg')) ?>" alt="" width="400" height="250" decoding="async"></span>
    <span class="brand-text"><b>Удирдлага</b><small><?= h($schedule['className']) ?> анги</small></span>
  </a>
  <nav class="nav-links">
    <a href="./" title="Сайт руу буцах"><svg class="i" aria-hidden="true"><use href="#i-back"/></svg><span>Сайт руу</span></a>
  </nav>
  <?php include __DIR__ . '/inc/language-switch.php'; ?><?php include __DIR__ . '/inc/theme-toggle.php'; ?>
  <button class="btn btn-ghost btn-icon" id="logoutBtn" title="Гарах" aria-label="Гарах" <?= $admin ? '' : 'hidden' ?>><svg class="i" aria-hidden="true"><use href="#i-logout"/></svg></button>
</header>

<main class="wrap" id="adminRoot">
  <?php if (!$admin): ?>
    <div class="login-card glass">
      <div class="modal-icon"><svg class="i i-lg" aria-hidden="true"><use href="#i-<?= setup_needed() ? 'shield' : 'lock' ?>"/></svg></div>
      <h3 style="font-family:var(--display);margin:0 0 6px;font-size:22px"><?= setup_needed() ? 'Админ нууц үг үүсгэх' : 'Админ нэвтрэх' ?></h3>
      <p class="hint" style="font-size:14px;margin:0 0 18px"><?= setup_needed()
          ? 'Сайтыг анх удаа ажиллуулж байна. Pterodactyl-ийн File Manager-ээс database/setup.php файлыг нээж, доторх тохиргооны кодыг хуулаад нууц үгээ үүсгэнэ үү.'
          : 'Хуваарь засах, зураг удирдахын тулд нууц үгээ оруулна уу.' ?></p>
      <?php if (!$setupWritable): ?>
        <p class="err" style="margin:0 0 14px">database/ хавтас руу бичих эрхгүй байна. Хостинг дээрээ database/ хавтсанд бичих эрх (жишээ нь 775) олгоно уу.</p>
      <?php endif; ?>
      <button class="btn btn-primary" id="loginBtn" style="width:100%"><svg class="i" aria-hidden="true"><use href="#i-lock"/></svg><?= setup_needed() ? 'Нууц үг үүсгэх' : 'Нэвтрэх' ?></button>
    </div>
  <?php else: ?>
    <div class="admin-top">
      <div>
        <h1>Удирдлага</h1>
        <p>Хичээлийн хуваарь, зургийн сан, тохиргоо</p>
      </div>
      <div class="toolbar">
        <a class="btn btn-ghost" href="./#photos"><svg class="i" aria-hidden="true"><use href="#i-images"/></svg>Зургийн цомог</a>
        <a class="btn btn-primary" href="#intercom"><svg class="i" aria-hidden="true"><use href="#i-mic"/></svg>Intercom</a>
        <a class="btn btn-primary" href="#cctv"><svg class="i" aria-hidden="true"><use href="#i-eye"/></svg>Шууд камер</a>
      </div>
    </div>

    <?php include __DIR__ . '/inc/intercom-admin-view.php'; ?>
    <?php include __DIR__ . '/inc/note-admin-view.php'; ?>
    <?php include __DIR__ . '/inc/cctv-admin-view.php'; ?>
    <?php include __DIR__ . '/inc/cctv-display-view.php'; ?>

    <section class="panel glass" id="schedule">
      <h2><svg class="i" aria-hidden="true"><use href="#i-calendar"/></svg>Хичээлийн хуваарь</h2>
      <p class="hint">Нүд дээр дарж хичээл нэмэх, засах, устгах. Өөрчлөлт хийсний дараа «Хадгалах» дарна. Хадгалах бүрт өмнөх хувилбар нөөцлөгдөнө.</p>
      <div class="toolbar" style="margin-bottom:14px">
        <button class="btn btn-primary" id="importBtn"><svg class="i" aria-hidden="true"><use href="#i-upload"/></svg>Хуваарь оруулах</button>
        <button class="btn btn-ghost" id="addLessonBtn"><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg>Хичээл нэмэх</button>
        <button class="btn btn-ghost" id="exportJson"><svg class="i" aria-hidden="true"><use href="#i-download"/></svg>JSON</button>
        <button class="btn btn-ghost" id="exportCsv"><svg class="i" aria-hidden="true"><use href="#i-download"/></svg>CSV (Excel)</button>
        <button class="btn btn-ghost" id="backupsBtn"><svg class="i" aria-hidden="true"><use href="#i-refresh"/></svg>Нөөц</button>
        <button class="btn btn-danger-ghost" id="clearBtn"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg>Хуваарь устгах</button>
      </div>
      <div class="glass week-shell edit-grid" id="editGrid"></div>
    </section>

    <div class="savebar" id="saveBar" hidden>
      <span><svg class="i" aria-hidden="true"><use href="#i-alert"/></svg>Хадгалаагүй өөрчлөлт байна</span>
      <div class="toolbar">
        <button class="btn btn-ghost btn-sm" id="discardBtn">Буцаах</button>
        <button class="btn btn-primary btn-sm" id="saveBtn"><svg class="i i-sm" aria-hidden="true"><use href="#i-save"/></svg>Хадгалах</button>
      </div>
    </div>

    <div class="admin-cols">
      <section class="panel glass">
        <h2><svg class="i" aria-hidden="true"><use href="#i-user"/></svg>Ангийн мэдээлэл</h2>
        <p class="hint">Нүүр хуудсанд харагдана.</p>
        <div class="grid-2">
          <div class="field"><label for="fClass">Анги</label><input class="input" id="fClass" maxlength="20" placeholder="12-2"></div>
          <div class="field"><label for="fRoom">Танхим</label><input class="input" id="fRoom" maxlength="40" placeholder="110"></div>
        </div>
        <div class="field"><label for="fTeacher">Даасан багш</label><input class="input" id="fTeacher" maxlength="80"></div>
        <div class="field"><label for="fSchool">Сургууль</label><input class="input" id="fSchool" maxlength="160"></div>
        <div class="field"><label for="fTerm">Хичээлийн жил, улирал</label><input class="input" id="fTerm" maxlength="160"></div>
      </section>

      <section class="panel glass">
        <h2><svg class="i" aria-hidden="true"><use href="#i-clock"/></svg>Хонхны цаг</h2>
        <p class="hint">Цаг бүрийн эхлэх, дуусах хугацаа.</p>
        <table class="periods-table" id="periodsTable"></table>
        <div class="toolbar" style="margin-top:8px">
          <button class="btn btn-ghost btn-sm" id="addPeriod"><svg class="i i-sm" aria-hidden="true"><use href="#i-plus"/></svg>Цаг нэмэх</button>
          <button class="btn btn-ghost btn-sm" id="removePeriod"><svg class="i i-sm" aria-hidden="true"><use href="#i-x"/></svg>Сүүлийн цагийг хасах</button>
        </div>
      </section>
    </div>

    <div class="admin-cols">
      <section class="panel glass">
        <h2><svg class="i" aria-hidden="true"><use href="#i-file"/></svg>Сургуулийн эх хуваарь (PDF)</h2>
        <p class="hint">Нүүр хуудсанд «Сургуулийн эх хуваарь (PDF)» холбоос болж харагдана.</p>
        <div id="pdfBox"></div>
      </section>

      <section class="panel glass">
        <h2><svg class="i" aria-hidden="true"><use href="#i-drive"/></svg>Зургийн сан</h2>
        <p class="hint">Зураг, видео database/photos хавтсанд хадгалагдана. Нэг файлын хэмжээнд хязгаар байхгүй.</p>
        <div id="storageBox"><div class="spinner dark"></div></div>
        <div id="thumbTool" class="thumb-tool"></div>
      </section>
    </div>

    <section class="panel glass" id="officeSettings">
      <h2><svg class="i" aria-hidden="true"><use href="#i-file"/></svg>Бүрэн Office засварлагч</h2>
      <p class="hint">Word, Excel, PowerPoint болон PDF файлыг бүрэн засахын тулд ONLYOFFICE Document Server холбоно. Сервер суулгах заавар шинэчлэлийн deploy/onlyoffice/README.md файлд бий.</p>
      <form id="officeForm" novalidate>
        <label class="folder-share-permission"><input id="officeEnabled" type="checkbox"> Бүрэн Office засварлагчийг идэвхжүүлэх</label>
        <div class="office-settings-grid">
          <div class="field"><label for="officeServer">Document Server-ийн HTTPS хаяг</label><input class="input" id="officeServer" type="url" placeholder="https://docs.example.com" maxlength="500"></div>
          <div class="field"><label for="officeSite">Энэ сайтын HTTPS хаяг</label><input class="input" id="officeSite" type="url" placeholder="https://class.example.com" maxlength="500"><small class="hint">Сайт дэд хавтсанд байрласан бол замыг хамт оруулна.</small></div>
          <div class="field"><label for="officeInternal">Серверийн дотоод хаяг <span class="hint">(заавал биш)</span></label><input class="input" id="officeInternal" type="url" placeholder="http://127.0.0.1:8082" maxlength="500"><small class="hint">PHP серверээс Document Server рүү холбогдох өөр хаяг шаардлагатай үед.</small></div>
          <div class="field"><label for="officeSecret">JWT нууц түлхүүр</label><input class="input" id="officeSecret" type="password" autocomplete="new-password" maxlength="1024"><small class="hint">Серверийн JWT_SECRET-тэй ижил, 32-с дээш тэмдэгт.</small></div>
        </div>
        <div class="toolbar"><button class="btn btn-primary" id="officeSave" type="submit"><svg class="i i-sm" aria-hidden="true"><use href="#i-save"/></svg>Тохиргоо хадгалах</button><span class="hint" id="officeSettingsStatus" role="status"></span></div>
        <p class="err" id="officeSettingsError" role="alert"></p>
      </form>
    </section>

    <section class="panel glass" id="musicSettings">
      <h2><svg class="i" aria-hidden="true"><use href="#i-music"/></svg>Music · YouTube хайлт</h2>
      <p class="hint">YouTube нэрээр хайхад доорх түлхүүрийг тохируулна. Шууд видео холбоос нээхэд түлхүүр шаардлагагүй. Music хэсэг дууг Spotify-оос хайна.</p>
      <p class="hint">Дууг сайт дотроо хайхын тулд YouTube Data API v3 түлхүүр холбоно. YouTube холбоосоор дуу нэмэх, тоглуулах жагсаалт нь энэ түлхүүргүйгээр ажиллана.</p>
      <form id="musicSettingsForm" novalidate>
        <div class="field"><label for="musicApiKey">YouTube Data API түлхүүр</label><input class="input" id="musicApiKey" type="password" autocomplete="off" maxlength="200" placeholder="Хоосон орхивол одоогийн түлхүүр хэвээр"><small class="hint">Түлхүүр зөвхөн серверт хадгалагдана. YouTube Data API v3-д хязгаарласан түлхүүр хэрэглэнэ.</small></div>
        <label class="folder-share-permission"><input type="checkbox" id="musicClearKey"> Хадгалсан түлхүүрийг салгах</label>
        <div class="toolbar"><button class="btn btn-primary" id="musicSettingsSave" type="submit"><svg class="i i-sm" aria-hidden="true"><use href="#i-save"/></svg>Хадгалах</button><span class="hint" id="musicSettingsStatus" role="status"></span></div>
        <p class="err" id="musicSettingsError" role="alert"></p>
      </form>
    </section>

    <section class="panel glass" id="flashcardsSettings">
      <h2><svg class="i" aria-hidden="true"><use href="#i-cards"/></svg>FlashCards · Үгийн сан</h2>
      <p class="hint">Багц бүрт мөр бүрт нэг үг. Хятад: <b>ханз | пиньин | утга</b>. Англи: <b>үг | утга</b>. Тусгаарлагч нь <b>|</b> тэмдэг (эсвэл таб).</p>
      <div class="toolbar" style="margin-bottom:10px">
        <label for="fcAdminDeck" class="sr-only">Багц</label>
        <select class="input" id="fcAdminDeck" style="max-width:220px"></select>
        <span class="hint" id="fcAdminCount"></span>
      </div>
      <textarea class="input" id="fcAdminText" rows="12" spellcheck="false" style="width:100%;font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.7" placeholder="你好 | nǐ hǎo | сайн уу&#10;谢谢 | xiè xie | баярлалаа"></textarea>
      <div class="toolbar" style="margin-top:10px"><button class="btn btn-primary" id="fcAdminSave" type="button"><svg class="i i-sm" aria-hidden="true"><use href="#i-save"/></svg>Хадгалах</button><span class="hint" id="fcAdminStatus" role="status"></span></div>
      <p class="err" id="fcAdminError" role="alert"></p>
    </section>

    <section class="panel glass" id="aiSettings">
      <h2><svg class="i" aria-hidden="true"><use href="#i-chat"/></svg>AI CHAT · IwnlX Ai</h2>
      <p class="hint">egune-nano · Түлхүүр index.php-тэй зэрэгцээ ai-settings.php файлд эсвэл доорх тохиргоонд хадгалагдана. Хариулт богино, төлбөртэй хүсэлт зөвхөн хэрэглэгч илгээх үед гарна. Music нь AI түлхүүр ашиглахгүй.</p>
      <form id="aiSettingsForm" novalidate>
        <div class="field"><label for="aiEguneKey">Egune API түлхүүр</label><input class="input" id="aiEguneKey" type="password" autocomplete="off" maxlength="200" placeholder="Хоосон орхивол одоогийн түлхүүр хэвээр"><small class="hint">Түлхүүр хөтөч рүү буцаахгүй. ai-settings.php файлыг index.php-ийн хажууд байрлуулна. C122_EGUNE_API_KEY серверийн тохиргоо байвал түүнийг ашиглана.</small></div>
        <label class="folder-share-permission"><input type="checkbox" id="aiClearEgune"> Хадгалсан Egune түлхүүрийг салгах</label>
        <div class="toolbar" style="align-items:flex-start">
          <div class="field" style="flex:1;min-width:140px"><label for="aiMaxOutput">Ердийн хариултын токен</label><input class="input" id="aiMaxOutput" type="number" min="100" max="1200" step="50" value="500" required></div>
          <div class="field" style="flex:1;min-width:140px"><label for="aiMaxDaily">Нэг сурагч / өдөр</label><input class="input" id="aiMaxDaily" type="number" min="1" max="200" value="20" required></div>
          <div class="field" style="flex:1;min-width:140px"><label for="aiSiteDaily">Нийт хүсэлт / өдөр</label><input class="input" id="aiSiteDaily" type="number" min="1" max="200" value="80" required></div>
        </div>
        <div class="field"><label for="aiBudgetMnt">Egune-ийн нийт хэрэглээний тооцоолсон хязгаар (₮)</label><input class="input" id="aiBudgetMnt" type="number" min="0" step="100" value="0"><small class="hint">0 = мөнгөн хязгааргүй. Өдрийн болон токены хязгаар үргэлж үйлчилнэ. Энэ нь өгсөн үнэ дээр тулгуурласан тооцоо; үйлчилгээний бодит үлдэгдэл биш. Anthropic-ийн үлдэгдлээс тусдаа.</small></div>
        <div class="toolbar"><button class="btn btn-primary" id="aiSettingsSave" type="submit"><svg class="i i-sm" aria-hidden="true"><use href="#i-save"/></svg>Хадгалах</button><span class="hint" id="aiSettingsStatus" role="status"></span></div>
        <p class="hint" id="aiUsageStatus"></p><p class="err" id="aiSettingsError" role="alert"></p>
      </form>
    </section>

    <section class="panel glass" id="albumPinPanel">
      <h2><svg class="i" aria-hidden="true"><use href="#i-lock"/></svg>Цомгийн код</h2>
      <p class="hint" id="albumPinHint">Ангийн цомгийг үзэх, зураг нэмэхэд ашиглах 4 оронтой код. Код мэдэх хүн бүр зураг нэмж чадна, харин устгах эрх зөвхөн админд бий. Код солиход бүх хүн цомгоос гарч, шинэ кодоо оруулна.</p>
      <form id="pinForm" class="toolbar" novalidate>
        <div class="field" style="margin:0;min-width:180px"><label for="pinNew">Шинэ код</label><input class="input" id="pinNew" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="••••"></div>
        <button class="btn btn-primary" type="submit" style="align-self:flex-end"><svg class="i i-sm" aria-hidden="true"><use href="#i-check"/></svg>Солих</button>
        <span class="err" id="pinErr" style="align-self:flex-end"></span>
      </form>
    </section>

    <section class="panel glass">
      <h2><svg class="i" aria-hidden="true"><use href="#i-shield"/></svg>Нууц үг солих</h2>
      <p class="hint">Сольсны дараа бусад бүх төхөөрөмж системээс гарна.</p>
      <form id="pwForm" class="grid-3" novalidate>
        <div class="field"><label for="pwCur">Одоогийн нууц үг</label><input class="input" id="pwCur" type="password" autocomplete="current-password"></div>
        <div class="field"><label for="pwNew">Шинэ нууц үг</label><input class="input" id="pwNew" type="password" autocomplete="new-password"></div>
        <div class="field"><label for="pwNew2">Шинэ нууц үг давтах</label><input class="input" id="pwNew2" type="password" autocomplete="new-password"></div>
        <div class="toolbar"><button class="btn btn-primary" type="submit"><svg class="i" aria-hidden="true"><use href="#i-check"/></svg>Солих</button><span class="err" id="pwErr"></span></div>
      </form>
    </section>
  <?php endif; ?>
</main>

<footer class="foot wrap glass">
  <span><?= h($schedule['className']) ?> анги · Удирдлага</span>
  <span><a href="./">Нүүр хуудас</a></span>
</footer>

<script type="application/json" id="boot"><?= json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_INVALID_UTF8_SUBSTITUTE) ?></script>
<script src="<?= h(asset('assets/js/common.js')) ?>"></script>
<script src="<?= h(asset('assets/js/uploader.js')) ?>"></script>
<script src="<?= h(asset('assets/js/pdf-import.js')) ?>"></script>
<script src="<?= h(asset('assets/js/admin.js')) ?>"></script>
<script src="<?= h(asset('assets/js/intercom.js')) ?>"></script>
<script src="<?= h(asset('assets/js/call.js')) ?>"></script>
<script src="<?= h(asset('assets/js/fullscreen-back.js')) ?>"></script>
<script src="<?= h(asset('assets/js/note.js')) ?>"></script>
<script src="<?= h(asset('assets/js/office-settings.js')) ?>"></script>
<script src="<?= h(asset('assets/js/music-settings.js')) ?>"></script>
<script src="<?= h(asset('assets/js/ai-settings.js')) ?>"></script>
<script>window.C122_CCTV = <?= json_encode($cctvBoot, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE) ?>;window.C122_CCTV.setupRequested=location.hash==='#camera-setup';</script>
<script src="<?= h(asset('assets/js/cctv-peer.js')) ?>"></script>
<script src="<?= h(asset('assets/js/cctv-viewer.js')) ?>"></script>
<script src="<?= h(asset('assets/js/cctv-display.js')) ?>"></script>
</body>
</html>

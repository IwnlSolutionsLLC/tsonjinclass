<?php
if (!defined('C122')) exit;
$clubsCatalogPath = __DIR__ . '/../assets/data/clubs.json';
$clubsCatalog = is_file($clubsCatalogPath) ? json_decode(file_get_contents($clubsCatalogPath), true) : array();
if (!is_array($clubsCatalog)) $clubsCatalog = array();
$clubStudentsPath = __DIR__ . '/../assets/data/club-students.json';
$clubStudents = is_file($clubStudentsPath) ? json_decode(file_get_contents($clubStudentsPath), true) : array();
if (!is_array($clubStudents)) $clubStudents = array();
?>
<section class="view clubs-view" id="view-clubs" role="tabpanel" aria-labelledby="tab-clubs" hidden>
  <header class="clubs-header">
    <div>
      <p class="clubs-term" id="clubsTerm">2026–2027 · I улирал</p>
      <h2>Дугуйлангийн хуваарь</h2>
      <p class="clubs-school" id="clubsSchool">Цонжин Кибер Боардинг сургууль</p>
    </div>
    <div class="clubs-source-actions">
      <button class="btn btn-ghost btn-sm" type="button" id="clubsSourceView"><?= icon('images', 'i-sm') ?>Эх зураг</button>
      <a class="btn btn-ghost btn-sm" id="clubsSourceDownload" href="assets/img/clubs-schedule.jpg" download="Дугуйлангийн-хуваарь-2026-2027.jpg"><?= icon('download', 'i-sm') ?>Татах</a>
    </div>
  </header>
  <div class="student-clubs-controls">
    <label class="student-clubs-picker" for="studentClubsName"><span>Миний нэр</span><select id="studentClubsName"><option value="">Нэрээ сонгоорой</option></select></label>
    <div class="student-clubs-switch" role="group" aria-label="Хуваарийн харагдац">
      <button id="studentClubsPersonalButton" type="button" aria-pressed="true">Миний хуваарь</button>
      <button id="studentClubsGeneralButton" type="button" aria-pressed="false">Нийт хуваарь</button>
    </div>
  </div>
  <div id="clubsPersonalPanel">
    <div class="student-clubs-welcome" id="studentClubsWelcome">
      <?= icon('user') ?><h3>Нэрээ сонгоод өөрийн хуваарийг хараарай</h3>
      <p>Өнөөдөр, маргааш ямар дугуйлантайгаа болон хэдэн цагт эхлэхийг хараарай.</p>
      <button class="btn btn-ghost btn-sm" id="studentClubsWelcomeGeneral" type="button">Нийт хуваарь харах <?= icon('right', 'i-sm') ?></button>
    </div>
    <div id="studentClubsContent" hidden>
      <div class="student-clubs-heading"><div><p class="student-clubs-kicker">12-2 · МИНИЙ ДУГУЙЛАН</p><h3 id="studentClubsTitle"></h3></div><span class="student-clubs-clock-note">Улаанбаатарын цагаар</span></div>
      <div class="student-clubs-day-controls" id="studentClubsDayControls">
        <div class="student-clubs-day-buttons" role="group" aria-label="Өдөр сонгох"><button type="button" data-student-clubs-day="today" aria-pressed="true">Өнөөдөр</button><button type="button" data-student-clubs-day="tomorrow" aria-pressed="false">Маргааш</button><button type="button" data-student-clubs-day="week" aria-pressed="false">Долоо хоног</button></div>
        <label class="student-clubs-date-picker" for="studentClubsDate"><span>Өөр өдөр</span><input id="studentClubsDate" type="date" aria-label="Хуваарь харах өдөр"></label>
      </div>
      <div class="student-clubs-day" id="studentClubsDay">
        <div class="student-clubs-day-heading"><h4 id="studentClubsDayTitle"></h4><span id="studentClubsDaySummary"></span></div>
        <div id="studentClubsDayCards" class="student-clubs-day-cards"></div>
        <div class="student-clubs-day-empty" id="studentClubsDayEmpty" hidden><?= icon('calendar') ?><h4 id="studentClubsDayEmptyTitle"></h4><p id="studentClubsDayEmptyText"></p></div>
      </div>
      <div class="student-clubs-no-registration" id="studentClubsNoRegistration" hidden><h4>Дугуйлангийн сонголт бүртгэгдээгүй байна</h4><p>Өгсөн бүртгэлийн жагсаалтад энэ нэрийн сонголт байхгүй. Нийт хуваарийг үзэх боломжтой.</p><button class="btn btn-ghost btn-sm" id="studentClubsNoRegistrationGeneral" type="button">Нийт хуваарь харах</button></div>
      <div class="student-clubs-week" id="studentClubsWeek" hidden>
        <div class="student-clubs-week-heading"><h4>Долоо хоногийн хуваарь</h4><span id="studentClubsWeekSummary"></span></div>
        <div class="student-clubs-conflict-note" id="studentClubsConflictNote" hidden><?= icon('clock', 'i-sm') ?><span></span></div>
        <div id="studentClubsAgenda" class="student-clubs-agenda"></div>
      </div>
      <details id="studentClubsChoicesDetails" class="student-clubs-choices-details"><summary>Миний бүртгэлийн 3 сонголт</summary><div class="student-clubs-choices" id="studentClubsChoices"></div></details>
      <p class="student-clubs-source-note">Эх зурагт байгаа цагуудыг сонгосон дугуйлантай холбоод харуулав. Сонголтуудыг 2026.09.21-ний бүртгэлээс авсан.</p>
    </div>
    <p class="student-clubs-sr-only" id="studentClubsAnnouncement" aria-live="polite" aria-atomic="true"></p>
  </div>
  <div id="clubsGeneralPanel" hidden>
  <div class="clubs-controls">
    <label class="clubs-search">
      <svg class="i i-sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
      <input id="clubsSearch" type="search" placeholder="Дугуйлан, багш, танхим хайх…" aria-label="Дугуйлан хайх">
    </label>
    <label class="clubs-grade-label"><span>Анги</span><select id="clubsGrade" aria-label="Ангиар шүүх">
      <?php for ($clubsGrade = 12; $clubsGrade >= 1; $clubsGrade--): ?>
        <option value="<?= $clubsGrade ?>"><?= $clubsGrade ?>-р анги</option>
      <?php endfor; ?>
    </select></label>
    <button class="clubs-all-school" id="clubsAllSchool" type="button" aria-pressed="false">Бүх анги</button>
  </div>
  <div class="clubs-days-row">
    <div class="clubs-days" id="clubsDays" role="group" aria-label="Гарагаар шүүх"></div>
    <span id="clubsToday" class="clubs-today"></span>
  </div>
  <div class="clubs-results-head"><p id="clubsResultCount" aria-live="polite"></p><button id="clubsReset" class="clubs-reset" type="button" hidden>Шүүлтүүр цэвэрлэх</button></div>
  <div class="clubs-table-wrap" id="clubsTableWrap">
    <table class="clubs-table" aria-label="Дугуйлангийн долоо хоногийн хуваарь">
      <thead id="clubsTableHead"></thead><tbody id="clubsTableBody"></tbody>
    </table>
  </div>
  <div class="clubs-cards" id="clubsCards" aria-label="Дугуйлангууд"></div>
  <div class="clubs-empty" id="clubsEmpty" hidden><h3>Хуваарь олдсонгүй</h3><p id="clubsEmptyText"></p><button class="btn btn-ghost btn-sm" type="button" id="clubsEmptyReset">Бүх өдрийг харах</button></div>
  <p class="clubs-grade-note" id="clubsGradeNote" hidden>Анги нь эх зурагт заагаагүй дугуйланг мөн харуулав.</p>
  <details class="clubs-source-notes" id="clubsSourceNotes" hidden><summary>Эх хуваарийн тэмдэглэл</summary><ul id="clubsSourceNotesList"></ul></details>
  </div>
  <script type="application/json" id="clubsData"><?= json_encode($clubsCatalog, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
  <script type="application/json" id="clubStudentsData"><?= json_encode($clubStudents, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
</section>

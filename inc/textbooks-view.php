<?php
if (!defined('C122')) exit;
$textbookCatalog = json_decode(file_get_contents(__DIR__ . '/../assets/data/textbooks.json'), true);
?>
<section class="view textbook-view" id="view-textbooks" role="tabpanel" aria-labelledby="tab-textbooks" hidden>
  <div id="textbooksHome">
    <div class="textbook-hero">
      <div class="textbook-hero-copy">
        <span class="textbook-eyebrow">12-Р АНГИ / НОМЫН САН</span>
        <h2>СУРАХ БИЧИГ<span class="textbook-title-dot">.</span></h2>
        <p>Номоо нээгээд, бодол санаа болон бодлогынхоо шийдлийг нэг дор тэмдэглэе.</p>
        <div class="textbook-hero-meta"><span><b><?= count($textbookCatalog['books'] ?? array()) ?></b> сурах бичиг</span><span>Албан ёсны цахим эх</span><span>Тэмдэглэлтэй уншигч</span></div>
      </div>
      <div class="textbook-hero-art" aria-hidden="true"><div class="textbook-stack"><i>12</i><i>12</i><i>12</i></div><span class="textbook-art-note">Өнөөдрийн хичээл.<br>Маргаашийн боломж.</span></div>
    </div>
    <div class="textbook-toolbar">
      <label class="textbook-search"><span aria-hidden="true">⌕</span><input id="textbookSearch" type="search" placeholder="Хичээл, номын нэрээр хайх…" aria-label="Сурах бичиг хайх"></label>
      <div class="textbook-filters" id="textbookFilters" aria-label="Номын төрөл"></div>
    </div>
    <div class="textbook-results-head"><h3>Манай номын тавиур</h3><span id="textbookCount" aria-live="polite"></span></div>
    <div class="textbook-grid" id="textbookGrid"></div>
    <p class="textbook-source-note">Эдгээр нь <a href="https://econtent.edu.mn/book/12rangi" target="_blank" rel="noopener noreferrer">ECONTENT</a> болон <a href="https://medle.mn/textbook/12" target="_blank" rel="noopener noreferrer">MEDLE</a>-ийн 12-р ангийн цахим санд байгаа бүх 10 сурах бичиг. Номыг эх сайтын уншигчаар нээнэ.</p>
  </div>
  <div id="textbookReader" hidden>
    <div class="textbook-reader-head">
      <button id="textbookBack" class="btn btn-ghost" type="button"><?= icon('back', 'i-sm') ?>Номын тавиур</button>
      <div class="textbook-reader-heading"><span>12-Р АНГИЙН СУРАХ БИЧИГ</span><h2 id="textbookReaderTitle"></h2></div>
      <a id="textbookOriginal" class="btn btn-ghost btn-sm" href="https://econtent.edu.mn/book/12rangi" target="_blank" rel="noopener noreferrer">Эх сайтад нээх ↗</a>
    </div>
    <div class="textbook-study-layout">
      <div class="textbook-book-panel">
        <div class="textbook-reader-tools"><span id="textbookFrameStatus" role="status">Номыг ачаалж байна…</span><button id="textbookFocus" class="btn btn-ghost btn-sm" type="button">Номоо томруулах</button><button id="textbookFullscreen" class="btn btn-ghost btn-sm" type="button" data-i18n="mirror.fullscreen">Бүтэн дэлгэц</button></div>
        <iframe id="textbookFrame" title="Сурах бичгийн албан ёсны уншигч" referrerpolicy="no-referrer"></iframe>
        <div class="textbook-reader-help">Ном харагдахгүй байвал <a id="textbookFallback" href="https://econtent.edu.mn/book/12rangi" target="_blank" rel="noopener noreferrer">ECONTENT ↗</a> эсвэл <a id="textbookMedle" href="https://medle.mn/textbook/12" target="_blank" rel="noopener noreferrer">MEDLE ↗</a>-д нээгээрэй.</div>
      </div>
      <aside class="textbook-notes-panel" aria-label="Хичээлийн тэмдэглэл">
        <div class="textbook-notes-head"><div><span>МИНИЙ АЖЛЫН ДЭВТЭР</span><h3>Унш. Бод. Тэмдэглэ.</h3></div><?= icon('edit', 'i-lg') ?></div>
        <div class="textbook-student-bar"><span id="textbookStudent">Хувийн ажлаа нээхийн тулд нэвтрээрэй.</span><button id="textbookStudentLogin" class="btn btn-ghost btn-sm" type="button"><?= icon('lock', 'i-sm') ?>Нэвтрэх</button></div>
        <label class="field"><span>Хуудас / сэдэв</span><input id="textbookNotePage" class="input" maxlength="80" placeholder="Жишээ нь: 42-р хуудас, бодлого 3" disabled></label>
        <div class="textbook-work-tabs" aria-label="Ажлын төрөл"><button id="textbookTextTab" type="button" class="on" aria-pressed="true">Тэмдэглэл</button><button id="textbookDrawTab" type="button" aria-pressed="false">Зураг, бодолт</button></div>
        <div id="textbookTextWork" class="textbook-text-work"><label class="textbook-note-label" for="textbookNote">Тэмдэглэл, бодлого, даалгавар</label><textarea id="textbookNote" class="textbook-note-input" maxlength="22000" placeholder="Өөрийн үгээр тайлбарлаарай. Бодлогын алхам, шинэ санаа, багшаас асуух зүйлсээ энд бичээрэй…" disabled></textarea></div>
        <div id="textbookDrawWork" class="textbook-draw-work" hidden><div class="textbook-draw-tools"><div id="textbookDrawColors" class="textbook-draw-colors" aria-label="Зураасны өнгө"></div><div class="textbook-brush-row"><label>Бийр <input id="textbookDrawWidth" type="range" min="1" max="24" value="4" aria-label="Бийрийн өргөн"><span id="textbookDrawWidthLabel">4</span></label><button id="textbookDrawUndo" class="btn btn-ghost btn-sm" type="button" disabled>Шинэ зураас буцаах</button><button id="textbookDrawExpand" class="btn btn-ghost btn-sm" type="button">Томруулах</button><button id="textbookDrawExport" class="btn btn-ghost btn-sm" type="button">PNG татах</button></div></div><canvas id="textbookDrawCanvas" width="1200" height="800" aria-label="Бодлогоо зурж бичих талбар"></canvas><p class="textbook-draw-hint">Хадгалсан зураас үлдэнэ. Зөвхөн хадгалаагүй шинэ зураасыг буцааж болно.</p></div>
        <span id="textbookDraftStatus" class="textbook-draft-status" role="status">Нэвтэрсний дараа ажил тань вэбсайтад хадгалагдаж, бусад төхөөрөмжөөс нээгдэнэ.</span>
        <div class="textbook-note-actions"><button id="textbookSaveFolder" class="btn btn-primary" type="button" disabled><?= icon('save', 'i-sm') ?>Вэбсайтад хадгалах</button><button id="textbookExport" class="btn btn-ghost" type="button"><?= icon('download', 'i-sm') ?>TXT татах</button></div>
        <div id="textbookRemoteStatus" class="textbook-remote-status" role="status"></div>
        <button id="textbookLoadRemote" class="btn btn-ghost btn-sm" type="button" hidden>Шинэ хувилбарыг ачаалах</button>
        <button id="textbookRestoreDraft" class="btn btn-ghost btn-sm" type="button" hidden>Хадгалагдаагүй ажлаа сэргээх</button>
      </aside>
    </div>
  </div>
  <script id="textbooksData" type="application/json"><?= json_encode($textbookCatalog, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
</section>

<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="view" id="view-doodle" role="tabpanel" aria-labelledby="tab-doodle" hidden>
  <div class="lock-screen" id="doodleLock" hidden>
    <div class="lock-card glass">
      <div class="lock-icon"><?= icon('lock', 'i-lg') ?></div>
      <span class="eyebrow">OUR LAST YEAR, OUR OWN WALL</span>
      <h2>Бидний дурсамжийн самбар</h2>
      <p>Цомгийн 4 оронтой кодоор нээгээд, ангийнхаа дурсамжийг хамт бүтээе.</p>
      <div class="pin" id="doodlePin"></div>
    </div>
  </div>
  <div id="doodleBody" hidden>
    <div id="doodleHome">
      <div class="doodle-hero glass">
        <div><span class="eyebrow">THE CLASS OF 12–2 / MEMORY BOOK</span><h2><span data-i18n="nav.doodle">Дурсамжийн самбар</span><span class="doodle-title-star" aria-hidden="true">✳</span></h2><p>Энэ жилийн жижиг мөчүүдийг энд үлдээе.<br>Зур. Бич. Наа. Хамтдаа дурсамж бүтээ.</p></div>
        <div class="head-actions"><button class="btn btn-primary" id="doodleNew"><?= icon('plus') ?>Шинэ хуудас</button><button class="btn btn-ghost btn-icon" id="doodleLockBtn" aria-label="Дурсамжийн самбарыг түгжих" title="Түгжих"><?= icon('lock') ?></button></div>
      </div>
      <div class="doodle-intro"><span>✦ Зурах · Бичих · Зураг · GIF</span><p>Хадгалсан зурлага, зураг, бичвэрийг арилгахгүй. Хуудас бүр бидний дурсамж болон үлдэнэ.</p></div>
      <div class="doodle-collection-bar">
        <label class="doodle-search"><svg viewBox="0 0 24 24" class="i i-sm" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input type="search" id="doodleSearch" placeholder="Хуудасны нэр, зохиогч…" aria-label="Ачаалсан хуудсуудаас нэр, зохиогчоор хайх" autocomplete="off"></label>
        <div class="doodle-filters" role="group" aria-label="Хуудасны төлөв"><button type="button" data-doodle-filter="all" class="on" aria-pressed="true">Бүгд</button><button type="button" data-doodle-filter="open" aria-pressed="false">Зурж болно</button><button type="button" data-doodle-filter="sealed" aria-pressed="false">Дууссан</button></div>
        <button class="btn btn-ghost btn-sm" id="doodleRefresh" title="Хуудсуудыг шинэчлэх"><?= icon('refresh', 'i-sm') ?><span>Шинэчлэх</span></button>
      </div>
      <div id="doodlePagesStatus" class="doodle-status" role="status" aria-live="polite"></div>
      <div id="doodlePages" class="doodle-page-grid"></div>
      <div class="gal-more"><button class="btn btn-ghost" id="doodleMore" hidden>Дараагийн хуудсууд</button></div>
    </div>
    <div id="doodleEditor" hidden>
      <div class="doodle-editor-head"><button class="btn btn-ghost btn-sm" id="doodleBack"><?= icon('back', 'i-sm') ?>Бүх хуудас</button><div class="doodle-page-heading"><h2 id="doodlePageTitle"></h2><p id="doodlePageMeta"></p></div><button class="btn btn-ghost btn-sm" id="doodleEditorNew"><?= icon('plus', 'i-sm') ?>Шинэ хуудас</button><button class="btn btn-ghost btn-sm" id="doodleExport"><?= icon('download', 'i-sm') ?>PNG татах</button><button class="btn btn-ghost btn-icon btn-sm" id="doodleFocus" aria-label="Зургийн орчныг томруулах" title="Зургийн орчныг томруулах" aria-pressed="false"><?= icon('expand', 'i-sm') ?></button></div>
      <div class="doodle-editor-status"><span id="doodleSaveStatus" class="doodle-save-status" role="status" aria-live="polite"></span><button type="button" class="btn btn-ghost btn-sm" id="doodleRetry" hidden>Дахин хадгалах</button><span class="doodle-permanent-note"><?= icon('lock', 'i-sm') ?>Хадгалсан дурсамж хэвээр үлдэнэ</span></div>
      <div class="doodle-tools glass" role="toolbar" aria-label="Зурах хэрэгслүүд">
        <div class="doodle-tool-group"><button class="doodle-tool on" data-doodle-tool="pen" title="Үзэг (P)" aria-label="Үзэг" aria-pressed="true">✎<span>Үзэг</span></button><button class="doodle-tool" data-doodle-tool="highlight" title="Тодруулагч (H)" aria-label="Тодруулагч" aria-pressed="false">▰<span>Тодруулагч</span></button><button class="doodle-tool" data-doodle-tool="pan" title="Хуудсыг зөөж харах (V эсвэл Space)" aria-label="Хуудсыг зөөж харах" aria-pressed="false"><svg viewBox="0 0 24 24" class="i" aria-hidden="true"><path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-3a1.5 1.5 0 0 1 3 0v7c0 4-3 6-6 6h-1c-2 0-4-1-5-3l-4-5a1.5 1.5 0 0 1 2-2l2 2"/></svg><span>Зөөх</span></button><button class="doodle-tool" id="doodleText" title="Бичвэр нэмэх (T)" aria-label="Бичвэр нэмэх">T<span>Бичвэр</span></button><button class="doodle-tool" id="doodleSticky" title="Наадаг тэмдэглэл" aria-label="Наадаг тэмдэглэл">▧<span>Тэмдэглэл</span></button></div>
        <div class="doodle-tool-group"><button class="doodle-tool" id="doodleStickers">☺<span>Стикер</span></button><button class="doodle-tool" id="doodleImages"><?= icon('images') ?><span>Зураг</span></button><button class="doodle-tool" id="doodleGifs"><b class="doodle-gif-label">GIF</b><span>Хөдөлгөөнт</span></button></div>
        <div class="doodle-brush"><div class="doodle-brush-label"><label for="doodleWidth">Үзгийн хэмжээ</label><output id="doodleWidthValue" for="doodleWidth">5</output><span class="doodle-brush-preview" id="doodleBrushPreview" aria-hidden="true"></span></div><input id="doodleWidth" type="range" min="1" max="48" value="5"><div class="doodle-width-presets" role="group" aria-label="Үзгийн хэмжээ сонгох"><button type="button" data-doodle-width="2" title="Нарийн · 2 px" aria-label="Нарийн · 2 px">Нарийн</button><button type="button" data-doodle-width="5" title="Дунд · 5 px" aria-label="Дунд · 5 px">Дунд</button><button type="button" data-doodle-width="16" title="Бүдүүн · 16 px" aria-label="Бүдүүн · 16 px">Бүдүүн</button></div></div>
        <div class="doodle-save-group"><button class="btn btn-primary btn-sm" id="doodleSave" disabled><?= icon('check', 'i-sm') ?>Хадгалах</button><button class="btn btn-ghost btn-sm" id="doodleFinalize">Хуудсыг дуусгах</button></div>
      </div>
      <div class="doodle-color-bar"><span class="doodle-palette-label">ӨНГӨ</span><div id="doodleColors" class="doodle-colors" role="group" aria-label="Зургийн өнгө"></div><label class="doodle-custom-color"><input type="color" id="doodleColor" value="#254536" aria-label="Өөр өнгө сонгох"><span>Өөр өнгө</span></label><output id="doodleColorValue" for="doodleColor">#254536</output></div>
      <div class="doodle-placement-note" id="doodlePlacement" hidden><span></span><button class="btn btn-ghost btn-sm" id="doodleCancelPlace">Цуцлах</button></div>
      <div class="doodle-canvas-shell" id="doodleCanvasShell"><div class="doodle-canvas-stage" id="doodleCanvasStage"><canvas id="doodleCanvas" width="1600" height="1000" aria-label="Хамтын дурсамжийн хуудас. Хуруу эсвэл үзгээр зурна." tabindex="0"></canvas><div class="doodle-overlays" id="doodleOverlays" aria-hidden="true"></div></div></div>
      <div class="doodle-canvas-foot"><span>1600 × 1000 · <kbd>P</kbd> үзэг <kbd>H</kbd> тодруулагч <kbd>V</kbd> зөөх · <kbd>Space</kbd> дарж зөөнө</span><div><button class="btn btn-ghost btn-sm" id="doodleFit" title="Хуудсыг бүтнээр харах (F)">Бүтнээр харах</button><button class="btn btn-ghost btn-sm" id="doodleZoomOut" aria-label="Жижигрүүлэх">−</button><output id="doodleZoomValue" aria-label="Харах хэмжээ">100%</output><button class="btn btn-ghost btn-sm" id="doodleZoomIn" aria-label="Томруулах">+</button><button class="btn btn-ghost btn-sm" id="doodleActual" title="100 хувийн хэмжээгээр харах">1:1</button></div></div>
    </div>
    <input id="doodleImageInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
  </div>
</section>

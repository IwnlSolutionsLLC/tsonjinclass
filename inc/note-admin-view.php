<?php if (!defined('C122') || empty($admin)) return; ?>
<?php /* The board card styles are shared with the classroom board so the live preview below looks exactly like the real thing. */ ?>
<link rel="stylesheet" href="<?= htmlspecialchars(function_exists('asset') ? asset('assets/css/note-board.css') : 'assets/css/note-board.css', ENT_QUOTES, 'UTF-8') ?>">
<section class="panel glass tn-panel" id="teacherNote" aria-labelledby="tnTitle">
  <div class="tn-heading">
    <div>
      <span class="tn-kicker">12-2 / NOTE</span>
      <h2 id="tnTitle"><svg class="i" aria-hidden="true"><use href="#i-edit"/></svg><span data-i18n="note.title">Багшийн тэмдэглэл</span></h2>
      <p class="hint" data-i18n="note.lead">Тэмдэглэл бичиж, төрлөө сонгоод илгээнэ үү. Сонсож буй самбарууд эхлээд дуу тоглуулж, дараа нь тэмдэглэлийг дэлгэцэн дээр гаргана.</p>
    </div>
    <span class="tn-badge" id="tnBoards" role="status" aria-live="polite" data-i18n-skip><i aria-hidden="true"></i><span></span></span>
  </div>
  <p class="tn-hint" id="tnBoardsHint" data-i18n="note.boards.hint" hidden>Самбар дээр сайтыг нээж «Intercom сонсох» товчийг дарвал тэмдэглэл түүн дээр гарна.</p>

  <div class="tn-grid">
    <form class="tn-compose" id="tnForm" data-type="normal" novalidate>
      <fieldset class="tn-types">
        <legend data-i18n="note.typeLegend">Төрөл</legend>
        <div class="tn-type-row">
          <label class="tn-type" data-type="urgent">
            <input class="tn-radio" type="radio" name="tnType" value="urgent">
            <span class="tn-type-face">
              <span class="tn-type-icon" aria-hidden="true"><svg class="tn-ico" viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg></span>
              <span class="tn-type-name" data-i18n="note.type.urgent">Яаралтай</span>
            </span>
          </label>
          <label class="tn-type" data-type="normal">
            <input class="tn-radio" type="radio" name="tnType" value="normal" checked>
            <span class="tn-type-face">
              <span class="tn-type-icon" aria-hidden="true"><svg class="tn-ico" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.6A8 8 0 1 1 21 12Z"/></svg></span>
              <span class="tn-type-name" data-i18n="note.type.normal">Энхийн</span>
            </span>
          </label>
          <label class="tn-type" data-type="info">
            <input class="tn-radio" type="radio" name="tnType" value="info">
            <span class="tn-type-face">
              <span class="tn-type-icon" aria-hidden="true"><svg class="tn-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></span>
              <span class="tn-type-name" data-i18n="note.type.info">Мэдээлэл</span>
            </span>
          </label>
        </div>
      </fieldset>

      <div class="field">
        <label for="tnTitleInput" data-i18n="note.titleLabel">Гарчиг (заавал биш)</label>
        <input class="input" id="tnTitleInput" type="text" maxlength="80" autocomplete="off" placeholder="Жишээ: Хичээл өөрчлөгдлөө" data-i18n-placeholder="note.titlePlaceholder">
      </div>
      <div class="field">
        <label for="tnText" data-i18n="note.textLabel">Тэмдэглэл</label>
        <textarea class="input tn-textarea" id="tnText" rows="6" maxlength="600" aria-describedby="tnCount tnError" placeholder="Самбар дээр харагдах текстээ энд бичнэ үү…" data-i18n-placeholder="note.textPlaceholder"></textarea>
        <div class="tn-count" id="tnCount" aria-live="off" data-i18n-skip>0 / 600</div>
      </div>

      <div class="tn-actions">
        <button class="btn btn-primary tn-send" id="tnSend" type="submit" disabled><svg class="i" aria-hidden="true"><use href="#i-send"/></svg><span id="tnSendLabel" data-i18n="note.send">Илгээх</span></button>
      </div>
      <p class="err tn-error" id="tnError" role="alert"></p>
      <p class="tn-warn" id="tnSoundWarn" role="alert" hidden><svg class="i i-sm" aria-hidden="true"><use href="#i-alert"/></svg><span data-i18n="note.soundWarn">Дууны файл (assets/audio/teacher.mp3) серверээс олдсонгүй тул тэмдэглэл дуугүй гарна.</span></p>
    </form>

    <div class="tn-preview">
      <h3 class="tn-preview-title" data-i18n="note.previewTitle">Самбар дээр ингэж харагдана</h3>
      <div class="tn-preview-frame" id="tnPreviewFrame" aria-hidden="true" inert>
        <div class="tn-preview-stage" id="tnPreviewStage">
          <?php include __DIR__ . '/note-stage.php'; ?>
        </div>
      </div>
    </div>
  </div>

  <section class="tn-history" aria-labelledby="tnHistoryTitle">
    <div class="tn-history-head">
      <h3 id="tnHistoryTitle" data-i18n="note.historyTitle">Сүүлийн тэмдэглэлүүд</h3>
      <button class="btn btn-danger-ghost btn-sm" id="tnClear" type="button" hidden><svg class="i i-sm" aria-hidden="true"><use href="#i-trash"/></svg><span data-i18n="note.clear">Бүгдийг устгах</span></button>
    </div>
    <ul class="tn-list" id="tnList" data-i18n-skip></ul>
  </section>
</section>

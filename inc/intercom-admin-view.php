<?php if (!defined('C122') || empty($admin)) return; ?>
<section class="panel glass intercom-panel" id="intercom" aria-labelledby="intercomTitle">
  <div class="intercom-heading">
    <div>
      <span class="intercom-kicker">12-2 / INTERCOM · CALL</span>
      <h2 id="intercomTitle"><svg class="i" aria-hidden="true"><use href="#i-mic"/></svg>Intercom</h2>
      <p class="hint" data-i18n="intercom.lead">Товчийг дарж яриагаа бичээд дахин дарахад сонсож буй дэлгэцүүдээр тоглоно. Эхлээд дуудлагын хөгжим тоглож, дууссаны дараа таны зарлал сонсогдоно.</p>
    </div>
    <span class="intercom-badge" id="intercomListeners" role="status" aria-live="polite"><i aria-hidden="true"></i><span>Сонсож буй дэлгэц алга</span></span>
  </div>

  <div class="intercom-grid">
    <!-- 1. INTERCOM: record an announcement -->
    <section class="ic-card intercom-card" aria-labelledby="icAnnounceTitle">
      <header class="ic-card-head">
        <span class="ic-card-icon" aria-hidden="true"><svg class="i"><use href="#i-mic"/></svg></span>
        <div>
          <h3 id="icAnnounceTitle" data-i18n="intercom.cardTitle">Зарлал илгээх</h3>
          <p class="ic-card-sub" data-i18n="intercom.cardSub">Хөгжим тоглосны дараа таны дуу сонсогдоно.</p>
        </div>
      </header>

      <div class="intercom-stage">
        <button class="intercom-button" id="intercomBtn" type="button" aria-pressed="false" aria-describedby="intercomStatus">
          <span class="intercom-ring" aria-hidden="true"></span>
          <svg class="i" aria-hidden="true"><use href="#i-mic"/></svg>
          <span class="intercom-button-label" id="intercomBtnLabel">INTERCOM</span>
        </button>
        <div class="intercom-readout">
          <div class="intercom-timer" id="intercomTimer" aria-hidden="true">0:00</div>
          <div class="intercom-meter" id="intercomMeter" aria-hidden="true" hidden></div>
          <p class="intercom-silent" id="intercomSilent" role="status" hidden></p>
          <p class="intercom-status" id="intercomStatus" role="status" aria-live="polite">Бэлэн. INTERCOM товчийг дарж ярьж эхэлнэ үү.</p>
          <button class="btn btn-ghost btn-sm" id="intercomCancel" type="button" hidden><svg class="i i-sm" aria-hidden="true"><use href="#i-x"/></svg><span data-i18n="intercom.cancel">Цуцлах</span></button>
        </div>
      </div>

      <div class="intercom-review" id="intercomReview" role="group" aria-labelledby="intercomReviewTitle" hidden>
        <div class="intercom-review-head">
          <strong id="intercomReviewTitle" data-i18n="intercom.reviewTitle">Бичлэгээ шалгана уу</strong>
          <span class="intercom-review-time" id="intercomReviewTime">0:00</span>
        </div>
        <div class="intercom-review-actions">
          <button class="btn btn-ghost" id="intercomReviewPlay" type="button"><svg class="i" aria-hidden="true"><use href="#i-play"/></svg><span>Сонсох</span></button>
          <button class="btn btn-primary" id="intercomReviewSend" type="button"><svg class="i" aria-hidden="true"><use href="#i-send"/></svg><span data-i18n="intercom.reviewSend">Илгээх</span></button>
          <button class="btn btn-ghost" id="intercomReviewRedo" type="button"><svg class="i" aria-hidden="true"><use href="#i-refresh"/></svg><span data-i18n="intercom.reviewRedo">Дахин бичих</span></button>
          <button class="btn btn-danger-ghost" id="intercomReviewDiscard" type="button"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg><span data-i18n="intercom.reviewDiscard">Устгах</span></button>
        </div>
      </div>

      <div class="intercom-options">
        <label class="ic-switch" for="intercomReviewToggle">
          <input type="checkbox" id="intercomReviewToggle">
          <span class="ic-switch-track" aria-hidden="true"><i></i></span>
          <span class="ic-switch-text" data-i18n="intercom.reviewToggle">Илгээхээс өмнө сонсож шалгах</span>
        </label>
        <button class="btn btn-ghost btn-sm" id="intercomPreviewAll" type="button" aria-pressed="false"><svg class="i i-sm" aria-hidden="true"><use href="#i-speaker"/></svg><span id="intercomPreviewAllLabel">Самбар дээр сонсогдох хэлбэрээр сонсох</span></button>
      </div>

      <p class="intercom-warn" id="intercomChimeWarn" role="alert" hidden><svg class="i i-sm" aria-hidden="true"><use href="#i-alert"/></svg><span>Дуудлагын хөгжмийн файл серверээс олдсонгүй тул зарлал хөгжимгүйгээр тоглоно. Администратор assets/audio/music.mp3 файлыг байршуулна уу.</span></p>
    </section>

    <!-- 2. CALL: ring the board and talk -->
    <section class="ic-card call-card" id="callCard" data-state="idle" aria-labelledby="callTitle">
      <header class="ic-card-head">
        <span class="ic-card-icon" aria-hidden="true"><svg class="i"><use href="#i-phone"/></svg></span>
        <div>
          <h3 id="callTitle" data-i18n="call.cardTitle">Самбар руу дуудлага</h3>
          <p class="ic-card-sub" data-i18n="call.cardSub">Самбар хонх дуугаргаж, өөрөө хүлээн авсны дараа та хоёр шууд ярилцана.</p>
        </div>
      </header>

      <div class="call-stage">
        <div class="call-avatar" id="callAvatar">
          <span class="call-rings" aria-hidden="true"><i></i><i></i><i></i></span>
          <img src="assets/img/teacher.jpg" alt="" width="120" height="120" decoding="async">
        </div>
        <div class="call-readout">
          <p class="call-boards" id="callBoards" role="status" aria-live="polite"><i aria-hidden="true"></i><span>Самбарын төлөвийг шалгаж байна…</span></p>
          <p class="call-status" id="callStatus" role="status" aria-live="polite">Самбарын төлөвийг шалгаж байна…</p>
          <div class="call-timer" id="callTimer" aria-hidden="true" hidden>0:00</div>
        </div>
      </div>

      <div class="call-levels" id="callLevels" aria-hidden="true" hidden>
        <div class="call-level"><span class="call-level-label" id="callMicLabel">Таны микрофон</span><span class="call-meter" id="callMicMeter"></span></div>
        <div class="call-level"><span class="call-level-label" id="callHeardLabel">Самбарын дуу</span><span class="call-meter" id="callHeardMeter"></span></div>
      </div>

      <p class="call-hint" id="callHint" role="status" hidden><svg class="i i-sm" aria-hidden="true"><use href="#i-mic-off"/></svg><span></span></p>

      <div class="call-actions">
        <button class="call-btn call-btn-start" id="callStart" type="button" disabled><svg class="i" aria-hidden="true"><use href="#i-phone"/></svg><span data-i18n="call.start">ДУУДЛАГА ХИЙХ</span></button>
        <button class="call-btn call-btn-hang" id="callCancel" type="button" hidden><svg class="i" aria-hidden="true"><use href="#i-phone-off"/></svg><span data-i18n="call.cancel">Цуцлах</span></button>
        <button class="call-btn call-btn-ghost" id="callMute" type="button" aria-pressed="false" hidden><svg class="i" aria-hidden="true"><use href="#i-mic"/></svg><span>Микрофон хаах</span></button>
        <button class="call-btn call-btn-ghost" id="callSpeaker" type="button" aria-pressed="false" hidden><svg class="i" aria-hidden="true"><use href="#i-volume"/></svg><span>Самбарын дууг хаах</span></button>
        <button class="call-btn call-btn-hang" id="callHangup" type="button" hidden><svg class="i" aria-hidden="true"><use href="#i-phone-off"/></svg><span data-i18n="call.hangup">Таслах</span></button>
        <button class="call-btn call-btn-ghost" id="callUnlock" type="button" hidden><svg class="i" aria-hidden="true"><use href="#i-volume"/></svg><span data-i18n="call.unlock">Самбарын дууг нээх</span></button>
      </div>
      <p class="err call-error" id="callError" role="alert"></p>
      <audio id="callAudio" autoplay playsinline></audio>
    </section>
  </div>

  <section class="intercom-recent-wrap" aria-labelledby="intercomRecentTitle">
    <div class="intercom-recent-head">
      <h3 id="intercomRecentTitle" data-i18n="intercom.recent">Сүүлийн зарлалууд</h3>
      <button class="btn btn-danger-ghost btn-sm" id="intercomClear" type="button" hidden><svg class="i i-sm" aria-hidden="true"><use href="#i-trash"/></svg><span data-i18n="intercom.clear">Бүгдийг устгах</span></button>
    </div>
    <ul class="intercom-recent" id="intercomRecent"></ul>
  </section>
  <p class="err" id="intercomError" role="alert"></p>

  <details class="intercom-how">
    <summary data-i18n="intercom.howTitle">Дэлгэцийг хэрхэн холбох вэ?</summary>
    <ol>
      <li data-i18n="intercom.how1">Анги дахь дэлгэц дээр сайтыг нээнэ.</li>
      <li data-i18n="intercom.how2">Цэс → «Intercom сонсох» товчийг дарна. Анх удаа Цомгийн кодоор (4 оронтой) нэвтэрнэ.</li>
      <li data-i18n="intercom.how3">Дэлгэц 30 хоног хүртэл холбоотой үлдэнэ. Дууг хөтөч хаасан/дахин ачаалсны дараа нэг товшиж идэвхжүүлэх шаардлага гарч болно.</li>
    </ol>
  </details>
</section>

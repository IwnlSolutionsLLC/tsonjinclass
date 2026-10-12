<?php if (!defined('C122')) return; ?>
<section id="view-teachermirror" class="view mirror-view" role="tabpanel" aria-labelledby="tab-teachermirror" hidden>
  <header class="mirror-heading">
    <div><span class="mirror-kicker" data-i18n="mirror.kicker">12-2 / ХАМТДАА ҮЗЬЕ</span><h1 data-i18n="mirror.title">Дэлгэц хуваалцах.</h1><p data-i18n="mirror.intro">Багшийн дэлгэцийг ангид шууд үзүүлнэ. Холбоосоо том дэлгэц дээр нээгээд энэ хэсэгт хүлээгээрэй.</p></div>
    <div class="mirror-switch" role="group" aria-label="Дэлгэцийн горим" data-i18n-aria-label="mirror.mode"><button id="mirrorBoardMode" type="button" aria-pressed="true" data-i18n="mirror.boardMode">Ангийн дэлгэц</button><button id="mirrorTeacherMode" type="button" aria-pressed="false" data-i18n="mirror.teacherMode">Багш</button></div>
  </header>
  <div id="mirrorBoardPanel" class="mirror-card">
    <div class="mirror-card-heading"><div><span class="mirror-kicker" data-i18n="mirror.boardKicker">ТОМ ДЭЛГЭЦ</span><h2 id="mirrorBoardLabel" data-i18n-skip>Багшийн дэлгэцийг хүлээж байна</h2></div><span id="mirrorBoardState" class="mirror-status" data-i18n-skip>Хүлээж байна</span></div>
    <div id="mirrorBoardStage" class="mirror-stage">
      <video id="mirrorBoardVideo" width="1280" height="720" autoplay playsinline muted aria-label="Багшийн шууд дэлгэц" data-i18n-aria-label="mirror.videoLabel"></video>
      <div id="mirrorBoardPlaceholder" class="mirror-placeholder"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="7" y="10" width="50" height="34" rx="4"></rect><path d="M23 54h18M32 44v10m-7-26 5-5 9 8"></path></svg><strong id="mirrorBoardHint" data-i18n-skip>Багш хуваалцаж эхлэхэд автоматаар холбогдоно.</strong><span data-i18n="mirror.boardHelp">Энэ хэсгийг нээлттэй байлгаарай.</span></div>
      <span id="mirrorBoardLive" class="mirror-video-live" hidden><i aria-hidden="true"></i>LIVE</span>
      <div id="mirrorPlaybackPrompt" class="mirror-playback-prompt" hidden><strong data-i18n="mirror.playPrompt">Дүрсийг тоглуулахын тулд нэг удаа дарна уу.</strong><button id="mirrorPlay" class="mirror-button mirror-primary" type="button" data-i18n="mirror.playVideo">Дүрсийг тоглуулах</button></div>
    </div>
    <div class="mirror-controls"><p id="mirrorBoardMessage" role="status" aria-live="polite" data-i18n-skip>Шууд холболтыг хүлээж байна.</p><div><button id="mirrorAudio" class="mirror-button" type="button" aria-pressed="false" disabled data-i18n-skip>Дууг сонсох</button><button id="mirrorRetry" class="mirror-button" type="button" disabled data-i18n="mirror.retry">Дахин холбох</button><button id="mirrorFullscreen" class="mirror-button" type="button" data-i18n="mirror.fullscreen">Бүтэн дэлгэц</button></div></div>
    <p id="mirrorBoardDiagnostics" class="mirror-diagnostics" data-i18n-skip></p>
  </div>
  <div id="mirrorTeacherPanel" class="mirror-card" hidden>
    <div class="mirror-card-heading"><div><span class="mirror-kicker" data-i18n="mirror.teacherKicker">БАГШИЙН ТӨХӨӨРӨМЖ</span><h2 data-i18n="mirror.teacherTitle">Хичээлээ том дэлгэцэд.</h2></div></div>
    <div id="mirrorTeacherLogin" class="mirror-login"><p data-i18n="mirror.loginHelp">Дэлгэц хуваалцахын тулд сайтын админ нууц үгээр нэвтэрнэ.</p><button id="mirrorLogin" class="mirror-button mirror-primary" type="button" data-i18n="mirror.login">Багшаар нэвтрэх</button></div>
    <div id="mirrorTeacherSettings" hidden>
      <div class="mirror-fields">
        <label><span data-i18n="mirror.label">Багш / хичээлийн нэр</span><input id="mirrorTeacherLabel" type="text" maxlength="80" autocomplete="off" placeholder="12-2 · Багшийн дэлгэц" data-i18n-placeholder="mirror.labelPlaceholder"></label>
        <label><span data-i18n="mirror.source">Хуваалцах зүйл</span><select id="mirrorSource"><option value="screen" data-i18n="mirror.screen">Дэлгэц / цонх / Chrome таб</option><option value="camera" data-i18n="mirror.camera">Камер · утаснаас үзүүлэх</option></select></label>
        <label><span data-i18n="mirror.quality">Дүрсний тохиргоо</span><select id="mirrorQuality"><option value="balanced" data-i18n="mirror.balancedQuality">Хөнгөн · 720p / 15 FPS</option><option value="low" data-i18n="mirror.lowQuality">Хамгийн хөнгөн · 480p / 12 FPS</option><option value="sharp" data-i18n="mirror.sharpQuality">Тод текст · 1080p / 24 FPS</option></select></label>
      </div>
      <label class="mirror-audio-option"><input id="mirrorShareAudio" type="checkbox"><span data-i18n="mirror.shareAudio">Дууг хамт хуваалцах</span></label>
      <p id="mirrorSourceHelp" class="mirror-note" data-i18n-skip>«Эхлэх» дараад хуваалцах дэлгэц, цонх эсвэл табаа сонгоно. Дуу хуваалцах боломж нь төхөөрөмж болон сонгосон эх үүсвэрээс хамаарна.</p>
      <div class="mirror-teacher-actions"><button id="mirrorStart" class="mirror-button mirror-primary" type="button" data-i18n="mirror.start">Хуваалцаж эхлэх</button><button id="mirrorStop" class="mirror-button mirror-danger" type="button" disabled data-i18n="mirror.stop">Зогсоох</button><span id="mirrorTeacherCount" class="mirror-count">0 / 8</span></div>
    </div>
    <p id="mirrorTeacherMessage" class="mirror-teacher-message" role="status" aria-live="polite" data-i18n-skip>Хуваалцахдаа зөвхөн үзүүлэх зүйлээ сонгоорой.</p>
    <div id="mirrorTeacherStage" class="mirror-stage mirror-preview" hidden><video id="mirrorTeacherPreview" width="1280" height="720" autoplay playsinline muted aria-label="Таны хуваалцаж буй дүрс" data-i18n-aria-label="mirror.previewLabel"></video></div>
    <p class="mirror-footnote" data-i18n="mirror.privacy">Зөвхөн шууд дамжуулна. Бичлэг хадгалахгүй. Сайтын бусад хэсэгт орсон ч хуваалцалт үргэлжилнэ; «Зогсоох» эсвэл хөтчийн хуваалцахыг зогсоох товчоор дуусгана.</p>
  </div>
</section>
<aside id="mirrorSharingBadge" class="mirror-sharing-badge" role="status" aria-live="polite" hidden><span class="mirror-sharing-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8m-4-4v4"></path></svg></span><div><strong id="mirrorSharingTitle" data-i18n-skip>LIVE</strong><span id="mirrorSharingDetail" data-i18n-skip></span></div><button id="mirrorBadgeStop" class="mirror-button mirror-danger" type="button" data-i18n="mirror.stop">Зогсоох</button></aside>

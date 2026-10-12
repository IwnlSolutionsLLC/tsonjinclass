<?php if (!defined('C122') || empty($admin)) return; ?>
<section class="panel glass cctv-admin-panel" id="cctv" aria-labelledby="cctvTitle">
  <div class="cctv-heading">
    <div><span class="cctv-kicker">12-2 / ШУУД ХОЛБОЛТ</span><h2 id="cctvTitle">Ангийн шууд дүрс.</h2><p>Ангийн дэлгэцийн камер, микрофоноос шууд үзнэ.</p></div>
    <span id="cctvLiveBadge" class="cctv-status-badge"><i aria-hidden="true"></i><span>OFFLINE</span></span>
  </div>
  <section class="cctv-view-card" aria-label="Ангийн камерын дүрс">
    <div id="cctvStage" class="cctv-stage">
      <video id="cctvVideo" width="1280" height="720" autoplay playsinline muted aria-label="Ангийн камерын шууд дүрс"></video>
      <div id="cctvPlaceholder" class="cctv-placeholder"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="17" width="32" height="30" rx="6"></rect><path d="m41 26 14-7v26l-14-7"></path></svg><strong id="cctvStageTitle">Холболтыг шалгаж байна</strong><span id="cctvStageHint">Камерын мэдээлэл ачаалсны дараа үзэж эхлээрэй.</span></div>
      <span id="cctvViewingBadge" class="cctv-on-video" hidden><i aria-hidden="true"></i>LIVE</span>
    </div>
    <div class="cctv-controls">
      <div class="cctv-control-main"><button id="cctvStartView" class="cctv-button cctv-primary" type="button" disabled>Үзэж эхлэх</button><button id="cctvStopView" class="cctv-button" type="button" disabled>Үзэхээ зогсоох</button></div>
      <div class="cctv-control-audio"><button id="cctvListen" class="cctv-button" type="button" aria-pressed="false" disabled>Дууг сонсох</button><label class="cctv-volume" for="cctvVolume"><span>Дуу</span><input id="cctvVolume" type="range" min="0" max="100" value="70" aria-label="Дууны хэмжээ"></label><button id="cctvFullscreen" class="cctv-button" type="button">Бүтэн дэлгэц</button></div>
    </div>
    <p id="cctvViewerMessage" class="cctv-message" role="status" aria-live="polite">Камерын холболтыг шалгаж байна.</p>
  </section>
  <section class="cctv-details" aria-label="Камерын мэдээлэл">
    <div><span>Ангийн дэлгэц</span><strong id="cctvDeviceLabel">—</strong></div>
    <div><span>Холболт</span><strong id="cctvConnection">Шалгаж байна</strong></div>
    <div><span>Эхэлсэн цаг</span><strong id="cctvStartedAt">—</strong></div>
    <div><span>Сүүлийн холбоо</span><strong id="cctvHeartbeat">—</strong></div>
    <div><span>Үзэж буй багш</span><strong id="cctvViewerCount">0 / 4</strong></div>
  </section>
  <section class="cctv-device-settings">
    <div><span class="cctv-kicker">БҮРТГЭЛТЭЙ ТӨХӨӨРӨМЖ / 1 ДЭЛГЭЦ</span><h2>Ангийн дэлгэцийн бүртгэл</h2><p id="cctvDeviceHelp">Ангийн том дэлгэц дээр Удирдлага → Камерын тохиргоог нээгээд бүртгэнэ.</p>
      <p>Бүртгэсэн: <time id="cctvRegisteredAt">—</time> · Хүчинтэй: <time id="cctvExpiresAt">—</time></p>
      <p>Төхөөрөмжийн сүүлийн холбоо: <time id="cctvDeviceLastSeen">—</time></p>
    </div>
    <div class="cctv-setup-actions"><a class="cctv-button" href="#camera-setup" data-cctv-open-setup>Төхөөрөмж бүртгэх / солих</a><button id="cctvRevoke" class="cctv-button cctv-danger" type="button" disabled>Бүртгэлээс устгах</button></div>
  </section>
  <p class="cctv-footnote">Зөвхөн шууд дүрс. Бичлэг болон дууг сайт дээр хадгалахгүй. «Үзэхээ зогсоох» нь зөвхөн таны үзэж буй холболтыг хаана.</p>
</section>

<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="game-panel chooser-view" id="view-chooser" role="tabpanel" aria-labelledby="game-tab-chooser" data-phase="idle" hidden>
  <div class="chooser-hero">
    <div><span class="eyebrow">12–2 / CAMERA GAME</span><h2>Chooser<span aria-hidden="true">.</span></h2><p data-i18n="chooser.tagline">Камер ангийн царайг хараад нэгийг санамсаргүй сонгоно.</p></div>
    <ol class="chooser-steps" aria-label="Хэрхэн тоглох" data-i18n-aria-label="chooser.howTo">
      <li><b>1</b><span data-i18n="chooser.step1">Камераа асаа</span></li>
      <li><b>2</b><span data-i18n="chooser.step2">Бүгд камерт харагд</span></li>
      <li><b>3</b><span data-i18n="chooser.step3">«Сонгох» дар</span></li>
    </ol>
  </div>

  <div class="chooser-shell glass">
    <div class="chooser-stage" id="chooserStage">
      <video id="chooserVideo" playsinline muted autoplay></video>
      <canvas id="chooserCanvas" class="chooser-canvas"></canvas>
      <div class="chooser-vignette" id="chooserVignette" aria-hidden="true"><span class="chooser-ring"></span></div>
      <div class="chooser-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="chooser-hud">
        <span class="chooser-live" aria-hidden="true"><i></i>LIVE</span>
        <span class="chooser-count" id="chooserCount" role="status" aria-live="polite" data-i18n-skip></span>
      </div>
      <div class="chooser-scanline" aria-hidden="true"></div>
      <div class="chooser-countdown" id="chooserCountdown" aria-hidden="true" hidden></div>
      <div class="chooser-confetti" id="chooserConfetti" aria-hidden="true"></div>
      <div class="chooser-banner" id="chooserBanner" hidden><span class="chooser-banner-sub" data-i18n="chooser.bannerSub">ӨНӨӨДРИЙН АЗТАН</span><strong data-i18n="chooser.banner">СОНГОГДЛОО!</strong></div>
      <div class="chooser-idle" id="chooserIdle">
        <span class="chooser-idle-icon"><?= icon('target','i-lg') ?></span>
        <strong data-i18n="chooser.idleTitle">Камераа асаа</strong>
        <span data-i18n="chooser.idleHint">Ангиа камерт харуулаад «Сонгох» дарна.</span>
        <button class="btn btn-primary chooser-start" id="chooserStart" type="button"><?= icon('camera','i-sm') ?><span data-i18n="chooser.start">Камер асаах</span></button>
      </div>
    </div>

    <div class="chooser-dock">
      <p class="chooser-msg" id="chooserMsg" role="status" aria-live="polite"></p>
      <div class="chooser-controls">
        <button class="chooser-tool" id="chooserFlip" type="button" title="Камер солих" aria-label="Камер солих" data-i18n-title="chooser.flip" data-i18n-aria-label="chooser.flip" hidden><?= icon('convert') ?></button>
        <button class="chooser-go chooser-choose" id="chooserChoose" type="button"><?= icon('target') ?><span data-i18n="chooser.choose">Сонгох</span></button>
        <button class="chooser-go chooser-again" id="chooserAgain" type="button"><?= icon('refresh') ?><span data-i18n="chooser.again">Дахин сонгох</span></button>
        <button class="chooser-tool" id="chooserStop" type="button" title="Камер унтраах" aria-label="Камер унтраах" data-i18n-title="chooser.stop" data-i18n-aria-label="chooser.stop"><?= icon('x') ?></button>
      </div>
      <p class="chooser-keys" data-i18n="chooser.keys">Space — сонгох · R — дахин</p>
    </div>
  </div>
  <p class="chooser-privacy"><?= icon('shield','i-sm') ?><span data-i18n="chooser.privacy">Царайг зөвхөн энэ төхөөрөмж дээр боловсруулна — хадгалж, илгээхгүй.</span></p>
</section>

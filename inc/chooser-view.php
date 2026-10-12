<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="game-panel chooser-view" id="view-chooser" role="tabpanel" aria-labelledby="game-tab-chooser" data-phase="idle" hidden>
  <div class="chooser-hero"><div><span class="eyebrow">12–2 / CAMERA GAME</span><h2>Chooser<span aria-hidden="true">.</span></h2><p data-i18n="chooser.tagline">Камер ангийн царайг хараад нэгийг санамсаргүй сонгоно.</p></div></div>

  <div class="chooser-stage glass" id="chooserStage">
    <video id="chooserVideo" playsinline muted autoplay></video>
    <canvas id="chooserCanvas" class="chooser-canvas"></canvas>
    <div class="chooser-confetti" id="chooserConfetti" aria-hidden="true"></div>
    <div class="chooser-scanline" aria-hidden="true"></div>
    <div class="chooser-banner" id="chooserBanner" hidden><span class="chooser-banner-sub">СОНГОГДСОН</span><strong>СОНГОГДЛОО!</strong></div>
    <div class="chooser-idle" id="chooserIdle">
      <span class="chooser-idle-icon"><?= icon('target','i-lg') ?></span>
      <strong data-i18n="chooser.idleTitle">Камераа асаа</strong>
      <span data-i18n="chooser.idleHint">Ангиа камерт харуулаад «Сонгох» дарна.</span>
      <button class="btn btn-primary" id="chooserStart" type="button"><?= icon('camera','i-sm') ?><span data-i18n="chooser.start">Камер асаах</span></button>
    </div>
  </div>

  <p class="chooser-msg" id="chooserMsg" role="status" aria-live="polite"></p>
  <div class="chooser-controls">
    <button class="btn btn-primary chooser-choose" id="chooserChoose" type="button"><?= icon('target','i-sm') ?><span data-i18n="chooser.choose">Сонгох</span></button>
    <button class="btn btn-ghost chooser-again" id="chooserAgain" type="button"><?= icon('refresh','i-sm') ?><span data-i18n="chooser.again">Дахин</span></button>
  </div>
  <p class="chooser-privacy" data-i18n="chooser.privacy">Царайг зөвхөн энэ төхөөрөмж дээр боловсруулна — хадгалж, илгээхгүй.</p>
</section>

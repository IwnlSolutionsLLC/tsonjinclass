<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="game-panel" id="view-flashcards" role="tabpanel" aria-labelledby="game-tab-flashcards" hidden>
  <div class="fc-hero"><div><span class="eyebrow">12–2 / WORD TRAINER</span><h2>FlashCards<span aria-hidden="true">.</span></h2><p data-i18n="flashcards.tagline">Англи үг, HSK ханз — зүүн тийш мэднэ, баруун тийш мэдэхгүй.</p></div></div>

  <div class="fc-decks" id="fcDecks"></div>

  <div class="fc-play glass" id="fcPlay" hidden>
    <div class="fc-play-top">
      <button class="btn btn-ghost btn-sm" id="fcBack" type="button"><?= icon('back','i-sm') ?><span data-i18n="flashcards.decks">Багцууд</span></button>
      <div class="fc-play-title"><strong id="fcDeckName"></strong><small id="fcProgress"></small></div>
      <div class="fc-play-actions">
        <button class="btn btn-ghost btn-icon btn-sm" id="fcShuffle" type="button" aria-label="Холих" data-i18n-aria-label="flashcards.shuffle"><?= icon('shuffle','i-sm') ?></button>
        <button class="btn btn-ghost btn-icon btn-sm" id="fcRestart" type="button" aria-label="Эхнээс нь" data-i18n-aria-label="flashcards.restart"><?= icon('refresh','i-sm') ?></button>
      </div>
    </div>
    <div class="fc-track" id="fcTrack">
      <span class="fc-side fc-side-left" aria-hidden="true"><?= icon('check') ?><b data-i18n="flashcards.know">Мэднэ</b></span>
      <span class="fc-side fc-side-right" aria-hidden="true"><?= icon('x') ?><b data-i18n="flashcards.dontKnow">Мэдэхгүй</b></span>
      <div class="fc-card-stage" id="fcStage"></div>
    </div>
    <p class="fc-hint" data-i18n="flashcards.hint">Карт дээр дарж утгыг нь хар · ← мэднэ · → мэдэхгүй</p>
    <div class="fc-controls">
      <button class="btn fc-btn-know" id="fcKnow" type="button"><?= icon('check','i-sm') ?><span data-i18n="flashcards.know">Мэднэ</span></button>
      <button class="btn fc-btn-flip" id="fcFlip" type="button"><?= icon('refresh','i-sm') ?><span data-i18n="flashcards.flip">Эргүүлэх</span></button>
      <button class="btn fc-btn-dont" id="fcDont" type="button"><?= icon('x','i-sm') ?><span data-i18n="flashcards.dontKnow">Мэдэхгүй</span></button>
    </div>
  </div>

  <div class="fc-summary glass" id="fcSummary" hidden>
    <div class="fc-summary-badge" id="fcSummaryBadge"><?= icon('sparkle','i-lg') ?></div>
    <h3 id="fcSummaryTitle" data-i18n="flashcards.done">Дууслаа!</h3>
    <div class="fc-summary-stats">
      <div class="fc-stat fc-stat-know"><b id="fcKnownCount">0</b><small data-i18n="flashcards.know">Мэднэ</small></div>
      <div class="fc-stat fc-stat-dont"><b id="fcUnknownCount">0</b><small data-i18n="flashcards.dontKnow">Мэдэхгүй</small></div>
    </div>
    <div class="fc-summary-actions">
      <button class="btn btn-primary" id="fcRepeat" type="button" hidden><?= icon('refresh','i-sm') ?><span data-i18n="flashcards.repeatDont">Мэдэхгүйг давтах</span></button>
      <button class="btn btn-ghost" id="fcAgain" type="button"><?= icon('refresh','i-sm') ?><span data-i18n="flashcards.again">Дахин</span></button>
      <button class="btn btn-ghost" id="fcToDecks" type="button"><?= icon('back','i-sm') ?><span data-i18n="flashcards.decks">Багцууд</span></button>
    </div>
  </div>
</section>

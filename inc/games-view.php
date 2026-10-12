<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="view games-view" id="view-games" role="tabpanel" aria-labelledby="tab-games" hidden>
  <div class="games-hero">
    <div><span class="eyebrow">12–2 / PLAY TOGETHER</span><h2 data-i18n="nav.games">Тоглоомууд</h2><p data-i18n="games.hint">Сурах, тоглох, азаа үзэх — нэг дор.</p></div>
    <button class="sfx-toggle" data-sfx-toggle type="button" aria-label="Дуу: асаалттай" aria-pressed="true"><?= icon('speaker','i-sm') ?></button>
  </div>
  <div class="games-picker glass" role="tablist" aria-label="Тоглоомууд" data-i18n-aria-label="nav.games">
    <button type="button" role="tab" id="game-tab-flashcards" data-game="flashcards" aria-controls="view-flashcards" aria-selected="true"><?= icon('cards') ?><span>FlashCards</span></button>
    <button type="button" role="tab" id="game-tab-ludo" data-game="ludo" aria-controls="view-ludo" aria-selected="false" tabindex="-1"><?= icon('dice') ?><span>Ludo</span></button>
    <button type="button" role="tab" id="game-tab-chooser" data-game="chooser" aria-controls="view-chooser" aria-selected="false" tabindex="-1"><?= icon('target') ?><span>Chooser</span></button>
  </div>
  <?php include __DIR__ . '/flashcards-view.php'; ?>
  <?php include __DIR__ . '/ludo-view.php'; ?>
  <?php include __DIR__ . '/chooser-view.php'; ?>
</section>

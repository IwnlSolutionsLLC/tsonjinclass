<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="game-panel" id="view-ludo" role="tabpanel" aria-labelledby="game-tab-ludo" hidden>
  <div class="ludo-hero"><div><span class="eyebrow">12–2 / BOARD GAME</span><h2>Ludo<span aria-hidden="true">.</span></h2><p data-i18n="ludo.tagline">2–4 хүн. Нэг дэлгэц дээр ээлжлэн тоглоно.</p></div></div>

  <div class="ludo-setup glass" id="ludoSetup">
    <h3 data-i18n="ludo.howMany">Хэдүүлээ тоглох вэ?</h3>
    <div class="ludo-setup-grid">
      <button class="ludo-setup-btn" type="button" data-ludo-players="2"><span class="ludo-dots"><i class="ludo-red"></i><i class="ludo-yellow"></i></span><strong>2</strong><small data-i18n="ludo.players">тоглогч</small></button>
      <button class="ludo-setup-btn" type="button" data-ludo-players="3"><span class="ludo-dots"><i class="ludo-red"></i><i class="ludo-green"></i><i class="ludo-yellow"></i></span><strong>3</strong><small data-i18n="ludo.players">тоглогч</small></button>
      <button class="ludo-setup-btn" type="button" data-ludo-players="4"><span class="ludo-dots"><i class="ludo-red"></i><i class="ludo-green"></i><i class="ludo-yellow"></i><i class="ludo-blue"></i></span><strong>4</strong><small data-i18n="ludo.players">тоглогч</small></button>
    </div>
    <p class="ludo-rules" data-i18n="ludo.rules">6 буувал хүү гарна · өрсөлдөгчийг цохиж гэрт нь буцаана · бүх хүүгээ төвд аваачвал яллана.</p>
  </div>

  <div class="ludo-game" id="ludoGame" hidden>
    <div class="ludo-board-wrap"><div class="ludo-board" id="ludoBoard" role="img" aria-label="Ludo самбар"></div></div>
    <aside class="ludo-panel glass">
      <div class="ludo-turn" id="ludoTurn"><span class="ludo-turn-dot" aria-hidden="true"></span><div><small data-i18n="ludo.turn">Ээлж</small><strong id="ludoTurnName"></strong></div></div>
      <button class="ludo-die" id="ludoDie" type="button" aria-label="Шоо шидэх" data-i18n-aria-label="ludo.roll"></button>
      <p class="ludo-status" id="ludoStatus" role="status" aria-live="polite"></p>
      <button class="btn btn-ghost btn-sm" id="ludoNew" type="button"><?= icon('refresh','i-sm') ?><span data-i18n="ludo.newGame">Шинэ тоглоом</span></button>
    </aside>
  </div>

  <div class="ludo-winner" id="ludoWinner" hidden>
    <div class="ludo-winner-card glass">
      <div class="ludo-winner-crown" aria-hidden="true"><?= icon('sparkle','i-lg') ?></div>
      <strong id="ludoWinnerName"></strong>
      <span data-i18n="ludo.wins">яллаа! 🎉</span>
      <button class="btn btn-primary" id="ludoWinnerNew" type="button"><?= icon('refresh','i-sm') ?><span data-i18n="ludo.newGame">Шинэ тоглоом</span></button>
    </div>
  </div>
</section>

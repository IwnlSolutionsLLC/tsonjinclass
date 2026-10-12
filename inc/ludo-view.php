<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="game-panel ludo-view" id="view-ludo" role="tabpanel" aria-labelledby="game-tab-ludo" hidden>
  <div class="ludo-hero"><div><span class="eyebrow">12–2 / BOARD GAME</span><h2>Ludo<span aria-hidden="true">.</span></h2><p data-i18n="ludo.tagline">2–4 хүн. Нэг дэлгэц дээр ээлжлэн тоглоно.</p></div></div>

  <div class="ludo-setup glass" id="ludoSetup">
    <div class="ludo-setup-head">
      <div><h3 data-i18n="ludo.setupTitle">Тоглогчид</h3><p data-i18n="ludo.setupHint">Нэрээ бичээд, өнгөө сонгоорой.</p></div>
      <div class="ludo-count" role="radiogroup" aria-label="Тоглогчийн тоо" data-i18n-aria-label="ludo.howMany">
        <button type="button" role="radio" data-ludo-count="2" aria-checked="false">2</button>
        <button type="button" role="radio" data-ludo-count="3" aria-checked="false">3</button>
        <button type="button" role="radio" data-ludo-count="4" aria-checked="true">4</button>
      </div>
    </div>
    <div class="ludo-player-list" id="ludoPlayerList"></div>
    <div class="ludo-setup-actions">
      <button class="btn btn-ghost" id="ludoResume" type="button" hidden><?= icon('play','i-sm') ?><span data-i18n="ludo.resume">Өмнөх тоглоомоо үргэлжлүүлэх</span></button>
      <button class="btn btn-primary ludo-start-btn" id="ludoStart" type="button"><?= icon('dice','i-sm') ?><span data-i18n="ludo.start">Тоглоом эхлэх</span></button>
    </div>
    <p class="ludo-rules" data-i18n="ludo.rules">6 буувал хүү гарна · өрсөлдөгчийг цохиж гэрт нь буцаана · бүх хүүгээ төвд аваачвал яллана.</p>
  </div>

  <div class="ludo-game" id="ludoGame" hidden>
    <div class="ludo-topbar glass">
      <div class="ludo-scores" id="ludoScores" aria-label="Тоглогчид" data-i18n-aria-label="ludo.setupTitle"></div>
      <button class="btn btn-ghost btn-sm ludo-restart" id="ludoNew" type="button"><?= icon('refresh','i-sm') ?><span data-i18n="ludo.newGame">Шинэ тоглоом</span></button>
    </div>
    <div class="ludo-main">
      <div class="ludo-board-wrap"><div class="ludo-board" id="ludoBoard" role="group" aria-label="Ludo самбар" data-i18n-aria-label="ludo.board"></div></div>
      <aside class="ludo-panel glass">
        <div class="ludo-turn" id="ludoTurn"><span class="ludo-turn-dot" aria-hidden="true"></span><div><small data-i18n="ludo.turn">Ээлж</small><strong id="ludoTurnName" data-i18n-skip></strong></div></div>
        <div class="ludo-die-wrap">
          <button class="ludo-die" id="ludoDie" type="button" aria-label="Шоо шидэх" data-i18n-aria-label="ludo.roll"><span class="ludo-die-face" aria-hidden="true"></span></button>
          <span class="ludo-six-flash" id="ludoSixFlash" aria-hidden="true">6!</span>
        </div>
        <p class="ludo-roll-hint" data-i18n="ludo.rollHint">Шоон дээр дар · Space</p>
        <p class="ludo-status" id="ludoStatus" role="status" aria-live="polite" data-i18n-skip></p>
      </aside>
    </div>
  </div>

  <dialog class="ludo-winner" id="ludoWinner" aria-labelledby="ludoWinnerName">
    <div class="ludo-winner-card glass">
      <div class="ludo-confetti" id="ludoConfetti" aria-hidden="true"></div>
      <div class="ludo-winner-crown" aria-hidden="true"><span id="ludoWinnerMedal">🏆</span></div>
      <small class="ludo-winner-place" id="ludoWinnerPlace" data-i18n-skip></small>
      <strong id="ludoWinnerName" data-i18n-skip></strong>
      <span class="ludo-winner-wins" data-i18n="ludo.wins">яллаа! 🎉</span>
      <ol class="ludo-standings" id="ludoStandings" data-i18n-skip hidden></ol>
      <div class="ludo-winner-actions">
        <button class="btn btn-ghost" id="ludoContinue" type="button" hidden><?= icon('play','i-sm') ?><span data-i18n="ludo.continue">Бусад байрын төлөө үргэлжлүүлэх</span></button>
        <button class="btn btn-ghost" id="ludoWinnerSetup" type="button"><?= icon('user','i-sm') ?><span data-i18n="ludo.changePlayers">Тоглогч солих</span></button>
        <button class="btn btn-primary" id="ludoWinnerNew" type="button"><?= icon('refresh','i-sm') ?><span data-i18n="ludo.rematch">Дахин тоглох</span></button>
      </div>
    </div>
  </dialog>
</section>

<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="view google-view" id="view-google" role="tabpanel" aria-labelledby="tab-google" hidden>
  <div class="google-hero">
    <div><span class="eyebrow">12–2 / SEARCH &amp; PLAY</span><h2 class="google-wordmark" aria-label="GOOGLE"><span>G</span><span>O</span><span>O</span><span>G</span><span>L</span><span>E</span></h2><p data-i18n="google.tagline">Хайж, сайтаар зочилж, тоглоод — бүгд энд.</p></div>
  </div>

  <div class="google-browser glass" id="googleBrowser">
    <div class="google-toolbar">
      <div class="google-nav-buttons">
        <button class="google-btn" id="googleBack" type="button" aria-label="Буцах" title="Буцах" data-i18n-aria-label="google.back" data-i18n-title="google.back" disabled><?= icon('left') ?></button>
        <button class="google-btn" id="googleForward" type="button" aria-label="Урагшлах" title="Урагшлах" data-i18n-aria-label="google.forward" data-i18n-title="google.forward" disabled><?= icon('right') ?></button>
        <button class="google-btn" id="googleReload" type="button" aria-label="Дахин ачаалах" title="Дахин ачаалах" data-i18n-aria-label="google.reload" data-i18n-title="google.reload" disabled><?= icon('refresh') ?></button>
        <button class="google-btn" id="googleHome" type="button" aria-label="Нүүр" title="Нүүр" data-i18n-aria-label="google.home" data-i18n-title="google.home"><?= icon('home') ?></button>
      </div>
      <form class="google-omnibox" id="googleBar" role="search">
        <span class="google-omnibox-icon" aria-hidden="true"><?= icon('search', 'i-sm') ?></span>
        <label class="sr-only" for="googleAddress" data-i18n="google.addressLabel">Хайх эсвэл хаяг бичих</label>
        <input id="googleAddress" type="text" inputmode="search" enterkeyhint="go" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="2000" placeholder="Google-ээс хайх эсвэл сайтын хаяг бичих…" data-i18n-placeholder="google.placeholder">
        <button class="google-go" type="submit" aria-label="Хайх" data-i18n-aria-label="google.go"><?= icon('right', 'i-sm') ?></button>
      </form>
      <div class="google-nav-buttons">
        <button class="google-btn" id="googleStar" type="button" aria-pressed="false" aria-label="Миний сайтад нэмэх" title="Миний сайтад нэмэх" data-i18n-aria-label="google.star" data-i18n-title="google.star" disabled><?= icon('star') ?></button>
        <button class="google-btn" id="googleExternal" type="button" aria-label="Шинэ табд нээх" title="Шинэ табд нээх" data-i18n-aria-label="google.newTab" data-i18n-title="google.newTab" disabled><?= icon('external') ?></button>
        <button class="google-btn" id="googleFullscreen" type="button" aria-label="Бүтэн дэлгэц" title="Бүтэн дэлгэц" data-i18n-aria-label="mirror.fullscreen" data-i18n-title="mirror.fullscreen"><?= icon('expand') ?></button>
      </div>
    </div>
    <div class="google-progress" id="googleProgress" aria-hidden="true"><i></i></div>

    <div class="google-viewport">
      <div class="google-start" id="googleStart">
        <form class="google-big-search" id="googleBigSearch" role="search">
          <span class="google-wordmark google-wordmark-lg" aria-hidden="true"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></span>
          <div class="google-big-field">
            <?= icon('search') ?>
            <label class="sr-only" for="googleBigInput" data-i18n="google.addressLabel">Хайх эсвэл хаяг бичих</label>
            <input id="googleBigInput" type="text" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="2000" placeholder="Юу хайх вэ?" data-i18n-placeholder="google.bigPlaceholder">
            <button class="btn btn-primary" type="submit"><span data-i18n="google.search">Хайх</span></button>
          </div>
          <p class="google-safe"><?= icon('shield', 'i-sm') ?><span data-i18n="google.safe">SafeSearch асаалттай — ангид тохирох үр дүн.</span></p>
        </form>

        <div class="google-shelf" id="googleFavsShelf" hidden>
          <div class="google-shelf-head"><h3 data-i18n="google.favorites">Миний сайтууд</h3></div>
          <div class="google-tiles" id="googleFavs"></div>
        </div>
        <div class="google-shelf">
          <div class="google-shelf-head"><h3 data-i18n="google.learn">Хайх ба сурах</h3></div>
          <div class="google-tiles" id="googleLearn"></div>
        </div>
        <div class="google-shelf">
          <div class="google-shelf-head"><h3 data-i18n="google.play">Тоглох</h3></div>
          <div class="google-tiles" id="googlePlay"></div>
        </div>
        <div class="google-shelf" id="googleRecentShelf" hidden>
          <div class="google-shelf-head"><h3 data-i18n="google.recent">Сүүлд нээсэн</h3><button class="btn btn-ghost btn-sm" id="googleClearRecent" type="button"><?= icon('trash', 'i-sm') ?><span data-i18n="google.clear">Цэвэрлэх</span></button></div>
          <div class="google-recent" id="googleRecent" data-i18n-skip></div>
        </div>
      </div>
      <iframe id="googleFrame" class="google-frame" title="Вэб хуудас" data-i18n-title="google.frameTitle" hidden
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-pointer-lock allow-presentation allow-downloads allow-modals"
        allow="fullscreen; autoplay; clipboard-write; encrypted-media; gamepad; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>

    <div class="google-statusbar">
      <span class="google-current" id="googleCurrent" data-i18n-skip></span>
      <span class="google-hint" id="googleHint" hidden><span data-i18n="google.blockedHint">Сайт энд нээгдэхгүй байна уу?</span> <button type="button" id="googleHintOpen" data-i18n="google.newTab">Шинэ табд нээх</button></span>
    </div>
  </div>
</section>

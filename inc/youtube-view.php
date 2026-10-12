<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="view" id="view-youtube" role="tabpanel" aria-labelledby="tab-youtube" hidden>
  <div class="yt-hero"><div><span class="eyebrow">12–2 / WATCH TOGETHER</span><h2>YouTube<span aria-hidden="true">.</span></h2><p data-i18n="youtube.tagline">Хайгаад, ангийн дэлгэц дээрээ хамтдаа үзээрэй.</p></div></div>

  <div class="yt-stage glass" id="ytStage">
    <div class="yt-player-frame"><div id="ytPlayerMount" class="yt-player-mount"></div>
      <div class="yt-player-empty" id="ytPlayerEmpty">
        <span class="yt-empty-icon"><?= icon('youtube','i-lg') ?></span>
        <strong data-i18n="youtube.emptyTitle">Юу үзэх вэ?</strong>
        <span data-i18n="youtube.emptyHint">Дуу, клип, хичээл — хайгаад доороос сонгоорой.</span>
      </div>
    </div>
    <div class="yt-now" id="ytNow" hidden>
      <div class="yt-now-copy"><strong id="ytNowTitle"></strong><small id="ytNowChannel"></small></div>
    </div>
  </div>

  <div class="yt-search glass">
    <form id="ytSearchForm" class="yt-search-form">
      <label class="sr-only" for="ytSearchInput" data-i18n="youtube.searchLabel">Видео хайх</label>
      <input class="input" id="ytSearchInput" type="search" placeholder="Видео, дуу, суваг хайх эсвэл холбоос буулгах…" data-i18n-placeholder="youtube.searchPlaceholder" maxlength="180" autocomplete="off">
      <button class="btn btn-primary" type="submit" id="ytSearchButton"><?= icon('eye','i-sm') ?><span data-i18n="youtube.searchButton">Хайх</span></button>
    </form>
    <div id="ytSearchStatus" class="yt-search-status" role="status" aria-live="polite"></div>
    <div id="ytResults" class="yt-results" aria-live="polite"></div>
    <p class="yt-foot"><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" data-i18n="youtube.terms">YouTube-ийн нөхцөл</a></p>
  </div>
</section>

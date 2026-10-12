<?php
/*
 * The teacher's note card. One markup, two uses: the classroom board shows it full screen (inc/note-board-view.php) and the
 * admin panel shows it as a scaled live preview (inc/note-admin-view.php), so both always look the same.
 * No ids in here (the page has one of each use); the three type icons and labels are switched by [data-type] in CSS.
 */
if (!defined('C122')) { http_response_code(404); exit; }
$nbAvatar = function_exists('asset') ? asset('assets/img/teacher.jpg') : 'assets/img/teacher.jpg';
$nbEsc = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
?>
<div class="nb-stage" data-type="normal">
  <div class="nb-bg" aria-hidden="true"><i class="nb-blob nb-blob-1"></i><i class="nb-blob nb-blob-2"></i><i class="nb-blob nb-blob-3"></i><i class="nb-glow"></i></div>
  <div class="nb-card">
    <header class="nb-head">
      <span class="nb-avatar" aria-hidden="true"><img src="<?= $nbEsc($nbAvatar) ?>" alt="" width="320" height="320" decoding="async"></span>
      <span class="nb-from"><b class="nb-from-name" data-i18n="note.board.teacher">Багш</b><small class="nb-time" data-user-content></small></span>
      <span class="nb-badge">
        <span class="nb-badge-icon" aria-hidden="true">
          <svg class="nb-ico nb-ico-urgent" viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
          <svg class="nb-ico nb-ico-normal" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.6A8 8 0 1 1 21 12Z"/></svg>
          <svg class="nb-ico nb-ico-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
        </span>
        <span class="nb-badge-text nb-badge-urgent" data-i18n="note.type.urgent">Яаралтай</span>
        <span class="nb-badge-text nb-badge-normal" data-i18n="note.type.normal">Энхийн</span>
        <span class="nb-badge-text nb-badge-info" data-i18n="note.type.info">Мэдээлэл</span>
      </span>
    </header>
    <h2 class="nb-title" data-user-content hidden></h2>
    <div class="nb-body"><p class="nb-text" data-user-content></p></div>
  </div>
  <footer class="nb-foot">
    <button class="nb-close" type="button" disabled aria-disabled="true">
      <span class="nb-dial" aria-hidden="true">
        <svg class="nb-ring" viewBox="0 0 48 48"><circle class="nb-ring-track" cx="24" cy="24" r="20"/><circle class="nb-ring-fill" cx="24" cy="24" r="20"/></svg>
        <span class="nb-count" data-i18n-skip>10</span>
        <svg class="nb-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </span>
      <span class="nb-close-label" data-i18n="note.close">Хаах</span>
    </button>
  </footer>
</div>

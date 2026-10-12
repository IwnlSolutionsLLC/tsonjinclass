<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<?php /* Teacher's note, full screen on the classroom board. Hidden until assets/js/note-board.js has a note to show. */ ?>
<div class="nb-overlay" id="noteOverlay" role="dialog" aria-modal="true" aria-label="Багшийн тэмдэглэл" data-i18n-aria-label="note.title" data-sound="<?= htmlspecialchars(function_exists('asset') ? asset('assets/audio/teacher.mp3') : 'assets/audio/teacher.mp3', ENT_QUOTES, 'UTF-8') ?>" tabindex="-1" hidden>
  <?php include __DIR__ . '/note-stage.php'; ?>
  <p class="nb-sr" id="noteSr" role="status" aria-live="polite" data-i18n-skip></p>
</div>

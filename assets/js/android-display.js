/* Keep an explicitly opened Android classroom display awake while this page is visible. */
(function () {
  'use strict';
  var enabled = new URLSearchParams(location.search).get('display') === 'android';
  try {
    enabled = enabled || sessionStorage.getItem('c122.androidDisplay') === '1';
    if (enabled) sessionStorage.setItem('c122.androidDisplay', '1');
  } catch (_) {}
  if (!enabled || !navigator.wakeLock || !navigator.wakeLock.request) return;

  var lock = null;
  var requesting = false;
  var active = true;

  async function acquire() {
    if (!active || document.visibilityState !== 'visible' || lock || requesting) return;
    requesting = true;
    try {
      var granted = await navigator.wakeLock.request('screen');
      if (!active || document.visibilityState !== 'visible') {
        await granted.release();
        return;
      }
      lock = granted;
      granted.addEventListener('release', function () {
        if (lock === granted) lock = null;
        // A browser can release a wake lock when backgrounded or under power restrictions.
        // A failed request stops here until visibility changes or the next user interaction.
        if (active && document.visibilityState === 'visible') setTimeout(acquire, 1000);
      });
    } catch (_) {
      // The display's own sleep settings remain available if Chrome cannot grant a wake lock.
    } finally {
      requesting = false;
    }
  }

  function release() {
    if (!lock) return;
    var current = lock;
    lock = null;
    current.release().catch(function () {});
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') acquire();
    else release();
  });
  window.addEventListener('pagehide', function () { active = false; release(); });
  window.addEventListener('pageshow', function () { active = true; acquire(); });
  document.addEventListener('pointerdown', acquire, { passive: true });
  acquire();
})();

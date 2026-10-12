/* The registered classroom (camera) display stays fullscreen all the time: it re-enters fullscreen on the next touch
   and straight after any exit (including the Back button). Browsers only allow entering fullscreen from a user gesture. */
(function () {
  'use strict';
  var armed = false, api = (window.C122_CCTV && window.C122_CCTV.apiUrl) || 'cctv/api.php';
  function current() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function enter() {
    if (current() || document.visibilityState === 'hidden') return;
    var el = document.documentElement, fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!fn) return;
    try { var r = fn.call(el); if (r && r.catch) r.catch(function () {}); } catch (_) {}
  }
  function arm() {
    if (armed) return;
    armed = true;
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (name) { document.addEventListener(name, enter, { capture: true, passive: true }); });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (name) { document.addEventListener(name, function () { if (!current()) setTimeout(enter, 0); }); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') setTimeout(enter, 200); });
    setInterval(function () { if (!current() && navigator.userActivation && navigator.userActivation.isActive) enter(); }, 1500);
    enter();   // works at once on kiosk / installed-app displays; otherwise the first touch does it
  }
  try {
    fetch(api + '?action=status', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.enrolled) arm(); })
      .catch(function () {});
  } catch (_) {}
})();

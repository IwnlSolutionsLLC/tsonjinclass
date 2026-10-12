/* Back button for every browser-fullscreen view (screen share stage, book reader, lyrics, viewers...).
   It is appended INSIDE the fullscreen element (a button outside it is hidden or unclickable in fullscreen). */
(function () {
  'use strict';
  var btn = null, host = null;
  var STYLE = '.c122-fs-back{position:fixed;inset:auto;top:max(14px,env(safe-area-inset-top));left:max(14px,env(safe-area-inset-left));margin:0;padding:0 22px 0 16px;' +
    'min-height:56px;display:inline-flex;pointer-events:auto;align-items:center;gap:10px;border:1px solid rgba(255,255,255,.35);border-radius:999px;cursor:pointer;' +
    'font:700 17px/1 system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;background:rgba(18,24,22,.78);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);' +
    'box-shadow:0 8px 28px rgba(0,0,0,.45);overflow:visible;z-index:2147483647}' +
    '.c122-fs-back svg{width:24px;height:24px;flex:none}.c122-fs-back:hover,.c122-fs-back:focus-visible{background:rgba(18,24,22,.92);outline:3px solid #fff;outline-offset:2px}' +
    '.c122-fs-back:active{transform:scale(.97)}.c122-fs-back::backdrop{background:transparent}';
  function T(text) { try { return window.C122I18n ? window.C122I18n.t('fs.back', text) : text; } catch (_) { return text; } }
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function exit() {
    var fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fn) { try { var r = fn.call(document); if (r && r.catch) r.catch(function () {}); } catch (_) {} }
  }
  function build() {
    if (btn) return btn;
    var style = document.createElement('style'); style.textContent = STYLE; document.head.appendChild(style);
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'c122-fs-back'; btn.setAttribute('data-i18n-skip', '');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span></span>';
    btn.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); exit(); });
    return btn;
  }
  function label() { btn.querySelector('span').textContent = T('Буцах'); btn.setAttribute('aria-label', T('Буцах')); }
  function hide() {
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    host = null;
  }
  function show(el) {
    build(); label(); hide();
    var tag = (el.tagName || '').toUpperCase();
    if (el === document.documentElement || el === document.body) return;                    // whole-page fullscreen keeps the site header and its menu
    if (['IFRAME', 'VIDEO', 'AUDIO', 'IMG', 'CANVAS', 'EMBED', 'OBJECT'].indexOf(tag) >= 0) return;   // cannot hold children
    el.appendChild(btn); host = el;     // inside the fullscreen element: the only place Chrome lets a click reach
  }
  function onChange() {
    var el = fsElement();
    if (!el) { hide(); return; }
    if (document.body && document.body.classList.contains('board-immersive')) { hide(); return; }   // the board has its own Menu
    show(el);
  }
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  document.addEventListener('c122:language', function () { if (btn && btn.parentNode) label(); });
  window.addEventListener('pagehide', hide);
})();

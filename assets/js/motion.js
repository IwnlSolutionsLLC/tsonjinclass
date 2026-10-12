/* MOTION — interactive animation for the Aurora theme: sliding menu indicator, glass spotlight that
   follows the pointer, gentle 3D tilt on tiles, ink ripples, scroll reveal, clock tick, count-up,
   a scroll progress bar and the section-title swap. Pure progressive enhancement: if this file fails,
   the site still works and looks right. Respects prefers-reduced-motion. */
(function () {
  'use strict';
  var body = document.body; if (!body) return;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var fine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
  function still() { return reduce.matches; }

  body.classList.add('mo-boot');
  setTimeout(function () { body.classList.remove('mo-boot'); }, 1600);

  /* ---------- menu: stagger order + sliding indicator ---------- */
  var menu = document.getElementById('siteMenu'), tabs = menu && menu.querySelector('.site-menu-tabs'), indicator = null;
  if (tabs) Array.prototype.forEach.call(tabs.children, function (el, i) { el.style.setProperty('--i', i); });
  function placeIndicator(animate) {
    if (!tabs) return;
    var on = tabs.querySelector('.tab.on');
    if (!on || !on.offsetParent || !on.offsetWidth) return;   // drawer closed or nothing selected yet
    if (!indicator) {
      indicator = document.createElement('span'); indicator.className = 'tab-indicator'; indicator.setAttribute('aria-hidden', 'true');
      tabs.appendChild(indicator); animate = false;
    }
    indicator.classList.toggle('no-anim', !animate || still());
    indicator.style.width = on.offsetWidth + 'px';
    indicator.style.height = on.offsetHeight + 'px';
    indicator.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)';
    if (!indicator.classList.contains('is-ready')) { void indicator.offsetWidth; indicator.classList.add('is-ready'); tabs.classList.add('has-indicator'); }
    if (!animate) raf(function () { indicator.classList.remove('no-anim'); });
  }
  if (tabs) {
    document.addEventListener('c122:tab', function () { raf(function () { placeIndicator(true); }); });
    if (window.ResizeObserver) new ResizeObserver(function () { placeIndicator(false); }).observe(tabs);
    if (window.MutationObserver && menu) new MutationObserver(function () { if (menu.open) raf(function () { placeIndicator(false); }); }).observe(menu, { attributes: true, attributeFilter: ['open'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeIndicator(false); });
    window.addEventListener('load', function () { placeIndicator(false); });
    raf(function () { placeIndicator(false); });
  }

  /* ---------- section title swap ---------- */
  var current = document.getElementById('siteCurrentSection'), lastTab = body.getAttribute('data-tab');
  document.addEventListener('c122:tab', function (event) {
    var name = event.detail && event.detail.name;
    if (current && name !== lastTab && !still()) { current.classList.remove('mo-swap'); void current.offsetWidth; current.classList.add('mo-swap'); }
    lastTab = name;
    raf(function () { scan(document.getElementById('view-' + name)); if (name === 'schedule') countUp(); });
  });

  /* ---------- glass spotlight + tile tilt ---------- */
  var SPOT = '.glass, .home-tile, .now-card, .week-shell, .album-hero, .folders-hero, .panel, .lock-card';
  var TILT = '.home-tile, .google-tile, .folder-card';
  var lit = null, tilted = null, pending = null;
  function clearTilt() { if (tilted) { tilted.style.rotate = ''; tilted = null; } }
  function clearLit() { if (lit) { lit.style.removeProperty('--mx'); lit.style.removeProperty('--my'); lit = null; } }
  document.addEventListener('pointermove', function (event) {
    if (!fine.matches || event.pointerType === 'touch') return;
    if (pending) { pending.event = event; return; }
    pending = { event: event };
    raf(function () {
      var e = pending.event; pending = null;
      var target = e.target && e.target.closest ? e.target : null;
      var spot = target && target.closest(SPOT), tile = target && !still() && target.closest(TILT);
      if (spot !== lit) clearLit();
      if (spot) { var r = spot.getBoundingClientRect(); lit = spot; spot.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px'); spot.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px'); }
      if (tile !== tilted) clearTilt();
      if (tile) {
        var b = tile.getBoundingClientRect(), dx = (e.clientX - b.left) / b.width * 2 - 1, dy = (e.clientY - b.top) / b.height * 2 - 1;
        var amount = Math.min(1, Math.sqrt(dx * dx + dy * dy)) * 7;
        tilted = tile; tile.style.rotate = amount < 0.4 ? '' : (-dy).toFixed(3) + ' ' + dx.toFixed(3) + ' 0 ' + amount.toFixed(2) + 'deg';
      }
    });
  }, { passive: true });
  document.addEventListener('pointerleave', function () { clearLit(); clearTilt(); });
  window.addEventListener('blur', function () { clearLit(); clearTilt(); });

  /* ---------- ink ripples ---------- */
  var RIPPLE = '.btn, .tab, .home-tile, .google-tile, .google-btn, .games-picker button, .chooser-go, .chooser-tool, .seg button, .ludo-count button, .site-menu-button, .theme-toggle, .site-language-button';
  document.addEventListener('pointerdown', function (event) {
    if (still() || event.button > 0) return;
    var el = event.target && event.target.closest && event.target.closest(RIPPLE);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    var host = null;
    for (var i = 0; i < el.children.length; i++) if (el.children[i].tagName === 'MO-RIPPLE') { host = el.children[i]; break; }
    if (!host) {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      host = document.createElement('mo-ripple'); host.setAttribute('aria-hidden', 'true'); el.appendChild(host);
    }
    var r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, dot = document.createElement('b');
    dot.style.width = dot.style.height = d + 'px';
    dot.style.left = (event.clientX - r.left - d / 2) + 'px'; dot.style.top = (event.clientY - r.top - d / 2) + 'px';
    host.appendChild(dot); setTimeout(function () { dot.remove(); }, 700);
  }, { passive: true });

  /* ---------- scroll reveal ---------- */
  var REVEAL = '.glass:not(.nav):not(.modal):not(.site-menu), .home-tile, .folder-card, .google-tile, .textbook-card, .music-playlist-card, .doodle-page-card, .tile';
  var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target; io.unobserve(el); el.classList.add('mo-in');
      setTimeout(function () { el.classList.remove('mo-rv', 'mo-in'); }, 900);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }) : null;
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
  function consider(el, fold) {
    if (seen.has(el)) return; seen.add(el);
    if (el.closest('dialog, .modal-back, [hidden]')) return;
    var r = el.getBoundingClientRect();
    if (r.height > 0 && r.top > fold) { el.classList.add('mo-rv'); io.observe(el); }
  }
  function scan(root) {
    if (!io || !seen || still() || !root || !root.querySelectorAll) return;
    var fold = window.innerHeight * 0.94;
    if (root.matches && root.matches(REVEAL)) consider(root, fold);
    Array.prototype.forEach.call(root.querySelectorAll(REVEAL), function (el) { consider(el, fold); });
  }
  var main = document.querySelector('main'), queued = [], scheduled = false;
  if (main && window.MutationObserver) new MutationObserver(function (records) {
    records.forEach(function (record) { Array.prototype.forEach.call(record.addedNodes, function (node) { if (node.nodeType === 1 && queued.length < 400) queued.push(node); }); });
    if (scheduled || !queued.length) return; scheduled = true;
    raf(function () { scheduled = false; var list = queued; queued = []; list.forEach(function (node) { if (node.isConnected) scan(node); }); });
  }).observe(main, { childList: true, subtree: true });

  /* ---------- clock tick + count-up ---------- */
  var clock = document.getElementById('clock'), clockText = clock ? clock.textContent : '';
  if (clock && window.MutationObserver) new MutationObserver(function () {
    var text = clock.textContent; if (text === clockText) return; clockText = text;
    if (still()) return; clock.classList.remove('mo-tick'); void clock.offsetWidth; clock.classList.add('mo-tick');
  }).observe(clock, { childList: true, characterData: true, subtree: true });
  var counting = false;
  function countUp() {
    var el = document.getElementById('todayNum'); if (!el || still() || counting) return;
    var target = parseInt(el.textContent, 10); if (!isFinite(target) || target <= 1) return;
    var started = performance.now(); counting = true;
    (function step(now) {
      var p = Math.min(1, (now - started) / 800), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.max(1, Math.round(target * eased)));
      if (p < 1) raf(step); else { el.textContent = String(target); counting = false; }
    })(started);
  }

  /* ---------- scroll progress ---------- */
  var bar = document.createElement('div'); bar.className = 'mo-progress'; bar.setAttribute('aria-hidden', 'true'); body.appendChild(bar);
  var ticking = false;
  function progress() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 40 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0).toFixed(4) + ')';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; raf(progress); } }, { passive: true });
  window.addEventListener('resize', function () { if (!ticking) { ticking = true; raf(progress); } });

  raf(function () { scan(document.querySelector('.view:not([hidden])')); if (body.getAttribute('data-tab') === 'schedule') countUp(); progress(); });
})();

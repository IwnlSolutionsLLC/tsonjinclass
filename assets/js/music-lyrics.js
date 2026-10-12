/* Music lyrics: Apple Music style synced lyrics for the player.
 * Builds its own panel inside #musicLyrics, opened by #musicLyricsToggle, and follows the player through the
 * 'c122:music-state' event ({track, positionMs, paused, ready, at}). Lines come from lyrics.php (parsed server side).
 * Pure helpers (buildRows, findActive, normalize) are exported for the node unit test. ES5 on purpose. */
(function () {
  'use strict';

  var GAP_MS = 6000;          /* a pause longer than this shows the three dots */
  var FOLLOW_HOLD = 4000;     /* manual scrolling pauses auto-follow this long */
  var DELAY_STEP = 250, DELAY_MAX = 5000;
  var FETCH_TIMEOUT = 12000, RETRY_MS = 25000, RETRY_MAX = 3, CACHE_MAX = 40;
  var KEY_OPEN = 'c122:lyrics-open', KEY_DELAY = 'c122:lyrics-delay';

  /* ---------- pure helpers ---------- */

  /* Server lines [{t, text}] -> display rows [{t, text, gap}]. A gap row is the dots indicator. */
  function buildRows(lines) {
    var items = [], rows = [], i, l, it, next, sung;
    for (i = 0; lines && i < lines.length; i++) {
      l = lines[i];
      if (l && typeof l.text === 'string' && isFinite(l.t)) items.push({ t: Math.max(0, +l.t), text: l.text });
    }
    if (!items.length) return rows;
    if (items[0].t >= 2500) rows.push({ t: 0, text: '', gap: true });                 /* intro */
    for (i = 0; i < items.length; i++) {
      it = items[i]; next = items[i + 1];
      if (it.text === '') {                                                            /* an explicit break */
        if (next && next.t - it.t > GAP_MS && !(rows.length && rows[rows.length - 1].gap)) rows.push({ t: it.t, text: '', gap: true });
        continue;
      }
      rows.push({ t: it.t, text: it.text, gap: false });
      if (next && next.text !== '') {                                                  /* a long wait the file did not mark */
        sung = Math.min(7000, Math.max(2500, it.text.length * 90));
        if (next.t - (it.t + sung) > GAP_MS) rows.push({ t: it.t + sung, text: '', gap: true });
      }
    }
    return rows;
  }

  /* Index of the last row whose start is <= time, or -1 before the first row. */
  function findActive(rows, time) {
    var lo = 0, hi = rows.length - 1, ans = -1, mid;
    while (lo <= hi) {
      mid = (lo + hi) >> 1;
      if (rows[mid].t <= time) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  }

  function hasLines(rows) {
    for (var i = 0; i < rows.length; i++) if (!rows[i].gap) return true;
    return false;
  }

  /* Server body -> {found, instrumental, rows, plain}. Tolerates garbage. */
  function normalize(body) {
    var list = [], s = body && body.synced, i, sorted = true;
    for (i = 0; s && i < s.length; i++) {
      if (s[i] && typeof s[i].text === 'string' && isFinite(s[i].t)) {
        list.push({ t: Math.max(0, Math.round(+s[i].t)), text: s[i].text, n: i });
        if (list.length > 1 && list[list.length - 1].t < list[list.length - 2].t) sorted = false;
      }
    }
    if (!sorted) list.sort(function (a, b) { return a.t === b.t ? a.n - b.n : a.t - b.t; });
    return {
      found: !!(body && body.found),
      instrumental: !!(body && body.instrumental),
      rows: buildRows(list),
      plain: body && typeof body.plain === 'string' ? body.plain : ''
    };
  }

  if (typeof window === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) module.exports = { buildRows: buildRows, findActive: findActive, normalize: normalize, GAP_MS: GAP_MS };
    return;
  }

  /* ---------- browser part ---------- */

  var C = (window.C122 = window.C122 || {});
  C.MusicLyrics = { buildRows: buildRows, findActive: findActive, normalize: normalize };

  function T(key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sget(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function byId(id) { return document.getElementById(id); }

  /* status line per mode: [i18n key, Mongolian text] */
  var STATUS = {
    idle: ['lyrics.idle', 'Дуу тоглуулахад үг энд гарна.'],
    loading: ['lyrics.loading', 'Дууны үгийг хайж байна…'],
    none: ['lyrics.none', 'Энэ дууны үг олдсонгүй.'],
    instrumental: ['lyrics.instrumental', 'Хөгжим дангаараа — үггүй дуу.'],
    'error.unavailable': ['lyrics.err.unavailable', 'Дууны үгийн үйлчилгээ одоогоор хариу өгөхгүй байна.'],
    'error.locked': ['lyrics.err.locked', 'Дууны үг үзэхийн тулд цомгийн кодоо оруулна уу.'],
    'error.rate': ['lyrics.err.rate', 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоорой.'],
    'error.generic': ['lyrics.err.generic', 'Дууны үгийг ачаалж чадсангүй.']
  };

  var mount = null, toggle = null, els = {}, built = false, io = null, ro = null;
  var st = {
    open: false, uri: '', track: null, snap: null, mode: 'idle', rows: [], btns: [], keys: [], active: -2, roving: null,
    delay: 0, raf: 0, tween: 0, userUntil: 0, userTimer: 0, loadSeq: 0, ctrl: null, pendingTrack: null, plainText: '', debounce: 0, retryTimer: 0, retries: 0,
    inView: true, full: false, fixed: false, cache: {}, cacheKeys: []
  };

  /* ---------- time ---------- */

  function position() {
    var s = st.snap, p;
    if (!s) return 0;
    p = s.pos;
    if (!s.paused) p += Math.max(0, now() - s.at);
    if (s.dur > 0 && p > s.dur) p = s.dur;
    return p;
  }
  function lyricTime() { return position() - st.delay; }

  /* ---------- build ---------- */

  function build() {
    mount.setAttribute('role', 'region');
    mount.setAttribute('aria-label', T('lyrics.heading', 'Дууны үг'));
    mount.setAttribute('data-i18n-aria-label', 'lyrics.heading');
    mount.innerHTML =
      '<div class="ml-panel" data-mode="idle">' +
        '<div class="ml-head">' +
          '<div class="ml-heading"><span class="ml-eyebrow" data-i18n="lyrics.heading">' + esc(T('lyrics.heading', 'Дууны үг')) + '</span><span class="ml-track" data-user-content></span></div>' +
          '<div class="ml-tools">' +
            '<div class="ml-nudge" role="group" aria-label="' + esc(T('lyrics.nudge', 'Үгийн хугацаа тохируулах')) + '" data-i18n-aria-label="lyrics.nudge">' +
              '<button type="button" class="ml-tool" data-ml="earlier" aria-label="' + esc(T('lyrics.earlier', 'Үгийг 0.5 секундээр түрүүлэх')) + '" data-i18n-aria-label="lyrics.earlier">&minus;0.5</button>' +
              '<button type="button" class="ml-tool ml-nudge-val" data-ml="reset" aria-label="' + esc(T('lyrics.offsetReset', 'Хугацааг анхны байдалд оруулах')) + '" data-i18n-aria-label="lyrics.offsetReset"></button>' +
              '<button type="button" class="ml-tool" data-ml="later" aria-label="' + esc(T('lyrics.later', 'Үгийг 0.5 секундээр хойшлуулах')) + '" data-i18n-aria-label="lyrics.later">+0.5</button>' +
            '</div>' +
            '<button type="button" class="ml-tool ml-full" data-ml="full" aria-pressed="false" aria-label="' + esc(T('lyrics.full', 'Бүтэн дэлгэцээр харах')) + '" data-i18n-aria-label="lyrics.full"><svg class="i" aria-hidden="true"><use href="#i-expand"/></svg></button>' +
          '</div>' +
        '</div>' +
        '<div class="ml-stage">' +
          '<div class="ml-scroll" aria-live="off">' +
            '<ol class="ml-lines" aria-describedby="mlHint" data-user-content></ol>' +
            '<div class="ml-plain" data-user-content hidden></div>' +
          '</div>' +
          '<div class="ml-status" role="status" aria-live="polite">' +
            '<div class="ml-skel" aria-hidden="true" hidden><i></i><i></i><i></i><i></i></div>' +
            '<p class="ml-status-text"></p>' +
            '<button type="button" class="ml-tool ml-retry" data-ml="retry" hidden data-i18n="lyrics.retry">' + esc(T('lyrics.retry', 'Дахин оролдох')) + '</button>' +
          '</div>' +
        '</div>' +
        '<p class="ml-plain-note" hidden data-i18n="lyrics.plainNote">' + esc(T('lyrics.plainNote', 'Энэ дууны үг цагтай холбогдоогүй тул гүйлгэн унших боломжтой.')) + '</p>' +
        '<p class="ml-credit" data-i18n="lyrics.credit">' + esc(T('lyrics.credit', 'Дууны үг: LRCLIB')) + '</p>' +
        '<span class="sr-only" id="mlHint" data-i18n="lyrics.seekHint">' + esc(T('lyrics.seekHint', 'Мөр дээр дарж дууг тэр хэсгээс нь сонсоно.')) + '</span>' +
      '</div>';
    els.panel = mount.querySelector('.ml-panel');
    els.track = mount.querySelector('.ml-track');
    els.scroll = mount.querySelector('.ml-scroll');
    els.lines = mount.querySelector('.ml-lines');
    els.plain = mount.querySelector('.ml-plain');
    els.status = mount.querySelector('.ml-status');
    els.statusText = mount.querySelector('.ml-status-text');
    els.skel = mount.querySelector('.ml-skel');
    els.retry = mount.querySelector('.ml-retry');
    els.note = mount.querySelector('.ml-plain-note');
    els.val = mount.querySelector('.ml-nudge-val');
    els.full = mount.querySelector('.ml-full');
    els.nudge = mount.querySelector('.ml-nudge');
  }

  function bind() {
    mount.addEventListener('click', function (e) {
      var tool = e.target.closest ? e.target.closest('[data-ml]') : null;
      if (tool && mount.contains(tool)) {
        var a = tool.getAttribute('data-ml');
        if (a === 'earlier') nudge(-DELAY_STEP);
        else if (a === 'later') nudge(DELAY_STEP);
        else if (a === 'reset') nudge(0, true);
        else if (a === 'full') toggleFull();
        else if (a === 'retry') { st.retries = 0; load(); }
        return;
      }
      onLineClick(e);
    });
    els.lines.addEventListener('keydown', onLineKey);
    ['wheel', 'touchstart', 'pointerdown'].forEach(function (name) {
      els.scroll.addEventListener(name, userScrolled, { passive: true });
    });
    els.scroll.addEventListener('keydown', function (e) {
      if (e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') userScrolled();
    });
    toggle.addEventListener('click', function () { setOpen(!st.open); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopWork(); else resume(); });
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.fixed) exitFull(); });
    document.addEventListener('c122:language', refreshTexts);
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) { onViewChange(!!entries[entries.length - 1].isIntersecting); }, { threshold: 0 });
      io.observe(mount);
    }
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(function () { if (st.inView && st.open) { layoutPads(); if (st.mode === 'synced') follow(true); } });
      ro.observe(els.scroll);
    } else window.addEventListener('resize', function () { if (st.open) { layoutPads(); if (st.mode === 'synced') follow(true); } });
  }

  function refreshTexts() {
    renderDelay();
    var on = st.full;
    els.full.setAttribute('aria-label', T(on ? 'lyrics.fullExit' : 'lyrics.full', on ? 'Бүтэн дэлгэцээс гарах' : 'Бүтэн дэлгэцээр харах'));
    els.full.setAttribute('data-i18n-aria-label', on ? 'lyrics.fullExit' : 'lyrics.full');
  }

  /* ---------- open / close ---------- */

  function setOpen(on, persist) {
    if (!on && st.full) exitFull();
    st.open = !!on;
    if (persist !== false) sset(KEY_OPEN, on ? '1' : '0');
    mount.hidden = !on;
    toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!on) {
      stopWork(); abortFetch();
      clearTimeout(st.debounce); clearTimeout(st.retryTimer);
      if (st.mode === 'loading') setMode('idle');
      return;
    }
    renderDelay(); layoutPads();
    startForTrack(true);
    if (st.mode === 'synced') { resume(); }
  }

  function onViewChange(vis) {
    st.inView = vis;
    if (vis && st.open) { layoutPads(); resume(); } else stopWork();
  }

  /* ---------- track + fetch ---------- */

  function onTrack(track, uri) {
    st.uri = uri; st.track = track; st.retries = 0;
    abortFetch(); clearTimeout(st.debounce); clearTimeout(st.retryTimer);
    clearRows();
    els.track.textContent = track ? String(track.title || '') + (track.artist ? ' — ' + track.artist : '') : '';
    if (st.open) startForTrack(false);
  }

  function startForTrack(immediate) {
    var hit;
    if (!st.uri) { setMode('idle'); return; }
    hit = st.cache[st.uri];
    if (hit) { applyResult(hit); return; }
    setMode('loading');
    clearTimeout(st.debounce);
    st.debounce = setTimeout(function () { st.debounce = 0; load(); }, immediate ? 0 : 350);
  }

  function abortFetch() {
    if (st.ctrl) { try { st.ctrl.abort(); } catch (e) { /* already done */ } st.ctrl = null; }
    st.loadSeq++;
  }

  function remember(uri, res) {
    if (!st.cache[uri]) {
      st.cacheKeys.push(uri);
      if (st.cacheKeys.length > CACHE_MAX) delete st.cache[st.cacheKeys.shift()];
    }
    st.cache[uri] = res;
  }

  function load() {
    var track = st.track, uri = st.uri, seq, timer, url;
    if (!track || !uri || !st.open) return;
    if (!window.fetch) { fail('generic'); return; }
    abortFetch();
    seq = st.loadSeq;
    setMode('loading');
    url = 'lyrics.php?title=' + encodeURIComponent(String(track.title || '').slice(0, 200)) +
      '&artist=' + encodeURIComponent(String(track.artist || '').slice(0, 200)) +
      '&album=' + encodeURIComponent(String(track.album || '').slice(0, 200)) +
      '&duration=' + Math.round((+track.durationMs || 0) / 1000);
    st.ctrl = window.AbortController ? new AbortController() : null;
    timer = setTimeout(function () { if (st.ctrl) { try { st.ctrl.abort(); } catch (e) { /* ignore */ } } }, FETCH_TIMEOUT);
    window.fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: st.ctrl ? st.ctrl.signal : undefined })
      .then(function (res) {
        return res.json().then(function (body) { return { status: res.status, body: body || {} }; }, function () { return { status: res.status, body: {} }; });
      })
      .then(function (r) {
        clearTimeout(timer);
        if (seq !== st.loadSeq || uri !== st.uri) return;
        st.ctrl = null;
        var b = r.body;
        if (r.status === 401) return fail('locked');
        if (r.status === 429) return fail('rate', (+b.retryAfter || 30) * 1000 + 1000);
        if (!b.ok) return fail('generic', RETRY_MS);
        if (b.found === false && b.error === 'unavailable') return fail('unavailable', RETRY_MS);
        var res = normalize(b);
        remember(uri, res);
        applyResult(res);
      })
      .catch(function () {
        clearTimeout(timer);
        if (seq !== st.loadSeq || uri !== st.uri) return;
        st.ctrl = null;
        fail('unavailable', RETRY_MS);
      });
  }

  function fail(kind, retryMs) {
    var uri = st.uri;
    setMode('error', kind);
    clearTimeout(st.retryTimer);
    if (retryMs && st.retries < RETRY_MAX) {
      st.retryTimer = setTimeout(function () {
        st.retryTimer = 0;
        if (st.open && uri === st.uri && st.mode === 'error') { st.retries++; load(); }
      }, retryMs);
    }
  }

  function applyResult(res) {
    if (res.rows && hasLines(res.rows)) { st.rows = res.rows; setMode('synced'); }
    else if (res.instrumental) setMode('instrumental');
    else if (res.plain) { st.plainText = res.plain; setMode('plain'); }
    else setMode('none');
  }

  /* ---------- modes ---------- */

  function clearRows() {
    st.rows = []; st.btns = []; st.keys = []; st.active = -2; st.roving = null;
    els.lines.textContent = '';
    els.plain.textContent = '';
    st.plainText = '';
    setMode(st.uri ? 'loading' : 'idle');
  }

  function setMode(mode, kind) {
    var msg = STATUS[mode === 'error' ? 'error.' + (kind || 'generic') : mode], textOnly = mode === 'plain' || mode === 'synced';
    st.mode = mode;
    els.panel.setAttribute('data-mode', mode);
    if (msg && !textOnly) {
      els.statusText.setAttribute('data-i18n', msg[0]);
      els.statusText.textContent = T(msg[0], msg[1]);
    } else {
      els.statusText.removeAttribute('data-i18n');
      els.statusText.textContent = '';
    }
    els.status.hidden = !msg || textOnly;
    els.skel.hidden = mode !== 'loading';
    els.retry.hidden = mode !== 'error';
    els.nudge.hidden = mode !== 'synced';
    els.lines.hidden = mode !== 'synced';
    els.plain.hidden = mode !== 'plain';
    els.note.hidden = mode !== 'plain';
    if (mode === 'plain') els.scroll.setAttribute('tabindex', '0'); else els.scroll.removeAttribute('tabindex');
    if (mode !== 'synced') stopWork();
    if (mode === 'synced') renderLines();
    else if (mode === 'plain') renderPlain();
  }

  function renderPlain() {
    var parts = String(st.plainText || '').split(/\n{2,}/), frag = document.createDocumentFragment(), i, p;
    els.plain.textContent = '';
    for (i = 0; i < parts.length; i++) {
      if (!parts[i].trim()) continue;
      p = document.createElement('p');
      p.textContent = parts[i].replace(/^\n+|\n+$/g, '');
      frag.appendChild(p);
    }
    els.plain.appendChild(frag);
    els.scroll.scrollTop = 0;
  }

  function renderLines() {
    var frag = document.createDocumentFragment(), rows = st.rows, i, li, b, dots;
    els.lines.textContent = '';
    st.btns = []; st.keys = []; st.active = -2; st.roving = null;
    for (i = 0; i < rows.length; i++) {
      li = document.createElement('li');
      li.className = 'ml-row' + (rows[i].gap ? ' ml-gap' : '');
      if (rows[i].gap) {
        li.setAttribute('aria-hidden', 'true');
        dots = document.createElement('span'); dots.className = 'ml-dots';
        dots.innerHTML = '<i></i><i></i><i></i>';
        li.appendChild(dots);
        rows[i].btn = null;
      } else {
        b = document.createElement('button');
        b.type = 'button'; b.className = 'ml-line'; b.tabIndex = -1;
        b.setAttribute('data-i', String(i));
        b.textContent = rows[i].text;
        li.appendChild(b);
        rows[i].btn = b; st.btns.push(b);
      }
      rows[i].el = li;
      frag.appendChild(li);
    }
    els.lines.appendChild(frag);
    mount.classList.toggle('ml-seekable', canSeek());
    layoutPads();
    update(true);
    ensureLoop();
  }

  function canSeek() { return !!(window.C122 && C122.Music && typeof C122.Music.seek === 'function'); }

  /* ---------- highlight + scroll ---------- */

  function paint(idx) {
    var rows = st.rows, i, d, dist, pos, key, row;
    for (i = 0; i < rows.length; i++) {
      d = i > idx ? i - idx : idx - i;
      dist = d === 0 ? 0 : d === 1 ? 1 : d <= 3 ? 2 : 3;
      pos = i < idx ? 'past' : i === idx ? 'now' : 'next';
      key = pos + dist;
      if (st.keys[i] === key) continue;
      st.keys[i] = key;
      row = rows[i];
      row.el.setAttribute('data-pos', pos);
      row.el.setAttribute('data-dist', String(dist));
      if (row.btn) { if (pos === 'now') row.btn.setAttribute('aria-current', 'true'); else row.btn.removeAttribute('aria-current'); }
    }
    if (!els.lines.contains(document.activeElement)) {
      for (i = Math.max(0, idx); i < rows.length; i++) if (rows[i].btn) { setRoving(rows[i].btn); return; }
      for (i = rows.length - 1; i >= 0; i--) if (rows[i].btn) { setRoving(rows[i].btn); return; }
    }
  }

  function setRoving(btn) {
    if (st.roving && st.roving !== btn) st.roving.tabIndex = -1;
    btn.tabIndex = 0;
    st.roving = btn;
  }

  function update(instant) {
    var idx, prev;
    if (st.mode !== 'synced' || !st.rows.length) return;
    idx = findActive(st.rows, lyricTime());
    if (idx === st.active) return;
    prev = st.active;
    st.active = idx;
    paint(idx);
    follow(instant || prev === -2);
  }

  function follow(instant) {
    var row, top, sc = els.scroll;
    if (st.mode !== 'synced' || !st.rows.length || now() < st.userUntil || !sc.clientHeight) return;
    row = st.rows[st.active];
    top = row && row.el ? row.el.offsetTop + row.el.offsetHeight / 2 - sc.clientHeight * 0.36 : 0;
    scrollToTop(top, instant);
  }

  function cancelTween() { if (st.tween) { cancelAnimationFrame(st.tween); st.tween = 0; } }

  function scrollToTop(top, instant) {
    var sc = els.scroll, max = Math.max(0, sc.scrollHeight - sc.clientHeight), from, dist, t0, dur;
    top = Math.max(0, Math.min(max, top));
    cancelTween();
    from = sc.scrollTop; dist = top - from;
    if (Math.abs(dist) < 1) return;
    if (instant || reduceMotion() || document.hidden || Math.abs(dist) > sc.clientHeight * 2.2) { sc.scrollTop = top; return; }
    t0 = now(); dur = Math.max(380, Math.min(900, Math.abs(dist) * 1.1));
    function step(ts) {
      var p = Math.min(1, ((ts || now()) - t0) / dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      sc.scrollTop = from + dist * e;
      st.tween = p < 1 ? requestAnimationFrame(step) : 0;
    }
    st.tween = requestAnimationFrame(step);
  }

  function layoutPads() {
    var h = els.scroll.clientHeight;
    if (!h) return;
    els.lines.style.paddingTop = Math.round(h * 0.36) + 'px';
    els.lines.style.paddingBottom = Math.round(h * 0.64) + 'px';
  }

  function userScrolled() {
    st.userUntil = now() + FOLLOW_HOLD;
    cancelTween();
    clearTimeout(st.userTimer);
    st.userTimer = setTimeout(function () { st.userTimer = 0; if (st.open && st.inView) follow(false); }, FOLLOW_HOLD + 50);
  }

  /* ---------- the animation loop: only while visible and playing ---------- */

  function canRun() { return st.open && st.inView && !document.hidden && st.mode === 'synced'; }

  function tick() {
    st.raf = 0;
    if (!canRun()) return;
    update(false);
    if (st.snap && !st.snap.paused) st.raf = requestAnimationFrame(tick);
  }

  function ensureLoop() {
    if (st.raf || !canRun() || !st.snap || st.snap.paused) return;
    st.raf = requestAnimationFrame(tick);
  }

  function stopWork() {
    if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
    cancelTween();
    clearTimeout(st.userTimer); st.userTimer = 0;
  }

  /* After being hidden: repaint at the current time and pick the loop up again. */
  function resume() {
    if (!canRun()) return;
    st.userUntil = 0;
    layoutPads();
    st.active = -2;
    update(true);
    ensureLoop();
  }

  /* ---------- player state ---------- */

  function onState(e) {
    var d = e && e.detail, t, at, n, uri;
    if (!d) return;
    t = d.track && typeof d.track === 'object' ? d.track : null;
    n = now();
    at = typeof d.at === 'number' && isFinite(d.at) ? d.at : n;
    if (at > n + 50) at = n;
    st.snap = { pos: Math.max(0, +d.positionMs || 0), at: at, paused: !!d.paused || d.ready === false, dur: t && +t.durationMs > 0 ? +t.durationMs : 0 };
    if (!built) { st.pendingTrack = t; return; }
    uri = t && t.uri ? String(t.uri) : '';
    if (uri !== st.uri) onTrack(t, uri);
    else if (t) st.track = t;
    if (!st.open || st.mode !== 'synced') return;
    update(false);
    if (st.snap.paused) { if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; } } else ensureLoop();
  }

  /* ---------- seek, nudge ---------- */

  function onLineClick(e) {
    var b = e.target.closest ? e.target.closest('.ml-line') : null, row, ms;
    if (!b || !els.lines.contains(b)) return;
    row = st.rows[+b.getAttribute('data-i')];
    if (!row || !canSeek()) return;
    ms = Math.max(0, Math.round(row.t + st.delay));
    st.userUntil = 0;
    if (st.snap) st.snap = { pos: ms, at: now(), paused: st.snap.paused, dur: st.snap.dur };
    update(false);
    follow(false);
    ensureLoop();
    try { C122.Music.seek(ms); } catch (err) { /* the next player state corrects the view */ }
  }

  function onLineKey(e) {
    var k = e.key, cur = e.target.closest ? e.target.closest('.ml-line') : null, i, next;
    if (!cur || (k !== 'ArrowDown' && k !== 'ArrowUp' && k !== 'Home' && k !== 'End')) return;
    i = st.btns.indexOf(cur);
    next = k === 'ArrowDown' ? st.btns[i + 1] : k === 'ArrowUp' ? st.btns[i - 1] : k === 'Home' ? st.btns[0] : st.btns[st.btns.length - 1];
    e.preventDefault();
    if (!next) return;
    setRoving(next);
    next.focus();
    userScrolled();
  }

  function renderDelay() {
    var s = (st.delay / 1000).toFixed(1);
    if (st.delay > 0) s = '+' + s;
    els.val.textContent = T('lyrics.offsetValue', '{n}с', { n: s });
  }

  function nudge(delta, reset) {
    var v = reset ? 0 : Math.max(-DELAY_MAX, Math.min(DELAY_MAX, st.delay + delta));
    st.delay = v;
    sset(KEY_DELAY, String(v));
    renderDelay();
    st.userUntil = 0;
    update(false);
  }

  /* ---------- full screen (with a fixed-overlay fallback) ---------- */

  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }

  function setFull(on) {
    st.full = on;
    mount.classList.toggle('is-full', on);
    els.full.setAttribute('aria-pressed', on ? 'true' : 'false');
    els.full.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-' + (on ? 'compress' : 'expand') + '"/></svg>';
    refreshTexts();
    layoutPads();
    if (st.mode === 'synced') { st.userUntil = 0; follow(true); }
    window.setTimeout(function () { layoutPads(); if (st.mode === 'synced') follow(true); }, 120);
  }

  function fixedFull(on) {
    var node = mount.parentNode;
    st.fixed = on;
    mount.classList.toggle('ml-fixed', on);
    document.documentElement.classList.toggle('ml-lock', on);
    /* a backdrop-filter/transform ancestor would trap a position:fixed child */
    while (node && node !== document.body && node.nodeType === 1) { node.classList.toggle('ml-unfilter', on); node = node.parentNode; }
    setFull(on);
    if (on) els.full.focus();
  }

  function enterFull() {
    var req = mount.requestFullscreen || mount.webkitRequestFullscreen, p;
    if (!req) { fixedFull(true); return; }
    try { p = req.call(mount); } catch (e) { fixedFull(true); return; }
    if (p && typeof p.then === 'function') p.then(null, function () { fixedFull(true); });
  }

  function exitFull() {
    if (fsElement() === mount) {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) { try { var p = ex.call(document); if (p && p.catch) p.catch(function () {}); } catch (e) { /* ignore */ } }
    } else if (st.fixed) fixedFull(false);
    else setFull(false);
  }

  function toggleFull() { if (st.full) exitFull(); else enterFull(); }

  function onFsChange() {
    var on = fsElement() === mount;
    if (!st.fixed && on !== st.full) setFull(on);
  }

  /* ---------- init ---------- */

  function tryInit() {
    if (built) return true;
    mount = byId('musicLyrics'); toggle = byId('musicLyricsToggle');
    if (!mount || !toggle) return false;
    built = true;
    build();
    bind();
    st.delay = Math.max(-DELAY_MAX, Math.min(DELAY_MAX, parseInt(sget(KEY_DELAY), 10) || 0));
    renderDelay();
    toggle.hidden = false;
    toggle.setAttribute('aria-controls', 'musicLyrics');
    if (!toggle.textContent.replace(/\s+/g, '') && !toggle.getAttribute('aria-label')) {
      toggle.setAttribute('aria-label', T('lyrics.toggle', 'Дууны үг'));
      toggle.setAttribute('data-i18n-aria-label', 'lyrics.toggle');
    }
    setMode('idle');
    /* adopt whatever the player reported before the panel existed */
    if (st.pendingTrack && st.pendingTrack.uri) onTrack(st.pendingTrack, String(st.pendingTrack.uri));
    setOpen(sget(KEY_OPEN) === '1', false);
    return true;
  }

  document.addEventListener('c122:music-state', onState);

  function boot() {
    var tries = 0, timer;
    if (tryInit()) return;
    timer = setInterval(function () { if (tryInit() || ++tries > 75) clearInterval(timer); }, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

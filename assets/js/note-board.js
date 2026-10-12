/* Teacher's note (display): when the teacher sends a note, this board plays teacher.mp3 to its end and only then shows the note full
   screen. The Close button is locked for 10 seconds (countdown ring) and the note stays until someone closes it.
   Runs only while "Intercom сонсох" is ON (the same switch as the intercom and the calls). A call has priority over a note.
   The only thing kept on this device is the last handled note number (localStorage c122:note-seq). */
(function () {
  'use strict';
  var root = document.getElementById('noteOverlay');
  if (!root || typeof fetch === 'undefined') return;
  var stage = root.querySelector('.nb-stage');
  var closeBtn = root.querySelector('.nb-close');
  var countEl = root.querySelector('.nb-count');
  var titleEl = root.querySelector('.nb-title');
  var textEl = root.querySelector('.nb-text');
  var bodyEl = root.querySelector('.nb-body');
  var timeEl = root.querySelector('.nb-time');
  var srEl = document.getElementById('noteSr');
  if (!stage || !closeBtn || !countEl || !titleEl || !textEl || !bodyEl || !timeEl) return;

  var API = 'note.php';
  var KEY_ON = 'c122:intercom', KEY_ID = 'c122:intercom-id', KEY_SEQ = 'c122:note-seq';
  var POLL_MS = 3000, RETRY_MS = 8000, AUTH_MS = 10000, POLL_TIMEOUT_MS = 8000;
  var MAX_AGE_SECONDS = 600;             // a note older than this is not shown late
  var LOCK_MS = 10000;                   // the Close button stays locked for exactly this long once the note is on screen
  var HARD_CLOSE_MS = 30 * 60 * 1000;    // nobody came back: close by itself
  var WATCH_MS = 400;                    // how often a running sequence looks at the call overlay
  var DEFAULT_SOUND_MS = 7200;           // teacher.mp3 is 7.2 s; used when the length is not known yet
  var SOUND_URL = root.getAttribute('data-sound') || 'assets/audio/teacher.mp3';   // lowercase: Linux hosting is case-sensitive

  var listening = false, polling = false, pollTimer = 0, listenerId = '';
  var handledSeq = 0;                    // the newest note whose sequence has started on this page
  var activeSeq = 0;                     // the note that is held / playing / shown now
  var current = null;                    // that note
  var phase = 'idle';                    // idle | hold (waiting for a call to end) | sound | show
  var audio = null, soundTimer = 0, watchdog = 0, watchTimer = 0, tickTimer = 0, readyTimer = 0, hardTimer = 0;
  var locked = true, shownAt = 0, probe = null, soundWarned = false, fitTimer = 0, lastFocus = null;

  function T(key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  }
  function read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function write(key, value) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (_) {} }
  function warn() { try { if (window.console && console.warn) console.warn.apply(console, arguments); } catch (_) {} }
  function site() { return window.C122 || {}; }
  function storedSeq() { var value = read(KEY_SEQ); return value !== null && /^\d+$/.test(value) ? Number(value) : 0; }
  function currentListenerId() {
    var id = listenerId || read(KEY_ID) || '';
    return /^[a-f0-9]{8,32}$/.test(id) ? id : '';
  }

  /* ---------- the neighbours: intercom announcements, site music, calls ---------- */
  function suspendIntercom() { if (window.C122Intercom && typeof window.C122Intercom.suspend === 'function') { try { window.C122Intercom.suspend(); } catch (_) {} } }
  function resumeIntercom() { if (window.C122Intercom && typeof window.C122Intercom.resume === 'function') { try { window.C122Intercom.resume(); } catch (_) {} } }
  function pauseMusic() { var s = site(); if (s.Music && typeof s.Music.pause === 'function') { try { s.Music.pause(); } catch (_) {} } }
  /* A ringing or running call (call-board.js) is a modal dialog above everything; it wins over a note. */
  function callActive() {
    var overlay = document.getElementById('callOverlay');
    if (!overlay) return false;
    if (overlay.open) return true;
    var state = overlay.getAttribute('data-state');
    return (!!state && state !== 'idle') || document.documentElement.classList.contains('call-open');
  }

  /* ---------- text fitting: the biggest type that still fits the card (a 600 character note on a TV) ---------- */
  function fit() {
    if (root.hidden) return;
    var base = parseFloat(window.getComputedStyle(stage).fontSize) || 18;
    var lo = Math.max(11, base * 0.8), hi = base * 4.4, size = hi, i;
    textEl.style.fontSize = hi + 'px';
    if (textEl.offsetHeight > bodyEl.clientHeight + 1) {
      for (i = 0; i < 10; i++) {
        size = (lo + hi) / 2;
        textEl.style.fontSize = size + 'px';
        if (textEl.offsetHeight > bodyEl.clientHeight + 1) hi = size; else lo = size;
      }
      textEl.style.fontSize = lo + 'px';
    }
    bodyEl.classList.toggle('is-scroll', textEl.offsetHeight > bodyEl.clientHeight + 1);
    textEl.classList.toggle('is-centered', textEl.textContent.length <= 150 && textEl.textContent.indexOf('\n') < 0);
  }
  function scheduleFit() { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 120); }
  window.addEventListener('resize', scheduleFit);
  if (window.ResizeObserver) { try { new ResizeObserver(scheduleFit).observe(bodyEl); } catch (_) {} }
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', scheduleFit);   // the web font changes the line lengths

  function clock(seconds) {
    var date = new Date(seconds * 1000);
    if (window.C122I18n) return window.C122I18n.formatDate(date, { hour: '2-digit', minute: '2-digit', hour12: false });
    try { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', hour: '2-digit', minute: '2-digit', hour12: false }).format(date); } catch (_) { return ''; }
  }
  function paintTime() { if (current) timeEl.textContent = clock(current.at); }
  document.addEventListener('c122:language', paintTime);

  /* ---------- the overlay ---------- */
  function fill(note) {
    stage.setAttribute('data-type', note.type === 'urgent' || note.type === 'info' ? note.type : 'normal');
    titleEl.hidden = !note.title;
    titleEl.textContent = note.title || '';
    textEl.textContent = note.text;
    textEl.style.fontSize = '';
    paintTime();
  }
  function setCount(n) { var text = String(n); if (countEl.textContent !== text) countEl.textContent = text; }
  function stopCountdown() { clearInterval(tickTimer); clearTimeout(readyTimer); tickTimer = readyTimer = 0; }
  function ready() {
    if (!locked) return;
    locked = false;
    stopCountdown();
    closeBtn.disabled = false;
    closeBtn.removeAttribute('aria-disabled');
    root.classList.remove('is-counting');
    root.classList.add('is-ready');
    if (srEl) srEl.textContent = T('note.closeReady', 'Одоо хаах боломжтой.');
    try { closeBtn.focus({ preventScroll: true }); } catch (_) {}
  }
  function startCountdown() {
    stopCountdown();
    locked = true;
    shownAt = Date.now();
    closeBtn.disabled = true;
    closeBtn.setAttribute('aria-disabled', 'true');
    root.classList.remove('is-ready', 'is-counting');
    void root.offsetWidth;                                  // restart the ring animation
    root.classList.add('is-counting');
    setCount(10);
    if (srEl) srEl.textContent = '';
    tickTimer = setInterval(function () {
      var left = Math.ceil((LOCK_MS - (Date.now() - shownAt)) / 1000);
      if (left <= 0) ready(); else setCount(left);
    }, 150);
    readyTimer = setTimeout(ready, LOCK_MS);
  }
  function showOverlay(note) {
    lastFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    fill(note);
    root.hidden = false;
    root.classList.add('is-open');
    document.documentElement.classList.add('nb-open');
    fit();
    startCountdown();
    try { root.focus({ preventScroll: true }); } catch (_) {}
    clearTimeout(hardTimer);
    hardTimer = setTimeout(function () { close(); }, HARD_CLOSE_MS);
  }
  function hideOverlay() {
    stopCountdown();
    clearTimeout(hardTimer); hardTimer = 0;
    root.classList.remove('is-open', 'is-counting', 'is-ready');
    root.hidden = true;
    document.documentElement.classList.remove('nb-open');
  }

  /* ---------- sound: teacher.mp3 plays to its very end, then the note appears ---------- */
  function soundMs() {
    var length = probe && probe.duration;
    return (isFinite(length) && length > 0 ? length : DEFAULT_SOUND_MS / 1000) * 1000;
  }
  function stopSound() {
    clearTimeout(soundTimer); clearTimeout(watchdog); soundTimer = watchdog = 0;
    if (audio) {
      var old = audio;
      audio = null;
      old.onended = old.onerror = old.ondurationchange = null;
      try { old.pause(); } catch (_) {}
    }
  }
  function playSound(note) {
    stopSound();
    var element, done = false;
    try { element = new Audio(SOUND_URL); } catch (_) { element = null; }
    function finish() {
      if (done) return;
      done = true;
      if (audio === element) audio = null;
      clearTimeout(soundTimer); clearTimeout(watchdog); soundTimer = watchdog = 0;
      if (element) { element.onended = element.onerror = element.ondurationchange = null; }
      if (phase === 'sound' && current === note) present(note);
    }
    function arm() {
      clearTimeout(watchdog);
      var length = element && element.duration;
      watchdog = setTimeout(finish, (isFinite(length) && length > 0 ? length + 3 : 15) * 1000);   // never stuck on a stalled file
    }
    if (!element) { finish(); return; }
    audio = element;
    element.preload = 'auto';
    element.onended = finish;
    element.onerror = function () {                           // missing or broken file: show the note right away
      if (!soundWarned) { soundWarned = true; warn('[note] teacher.mp3 failed to play - ' + SOUND_URL + '. The note is shown without it.'); }
      finish();
    };
    element.ondurationchange = arm;
    var attempt;
    try { attempt = element.play(); } catch (_) { attempt = null; soundTimer = setTimeout(finish, soundMs() + 1000); return; }
    if (attempt && attempt.then) {
      attempt.then(arm, function () {                         // the browser blocked sound: same timing, silently
        if (done) return;
        clearTimeout(watchdog);
        soundTimer = setTimeout(finish, soundMs() + 1000);
      });
    } else arm();
  }

  /* ---------- the sequence: (hold for a call) -> sound -> note -> close ---------- */
  function present(note) {
    phase = 'show';
    showOverlay(note);
  }
  function run(note) {
    phase = 'sound';
    handledSeq = Math.max(handledSeq, note.seq);
    write(KEY_SEQ, String(handledSeq));
    suspendIntercom();
    pauseMusic();
    playSound(note);
  }
  function abort(keepSuspended) {
    stopSound();
    hideOverlay();
    phase = 'idle';
    clearInterval(watchTimer); watchTimer = 0;
    if (!keepSuspended && !callActive()) resumeIntercom();     // during a call, call-board.js resumes the announcements when it ends
  }
  function watch() {
    if (phase === 'idle') { clearInterval(watchTimer); watchTimer = 0; return; }
    var call = callActive();
    if (phase === 'hold' && !call) run(current);
    else if (phase === 'sound' && call) { stopSound(); phase = 'hold'; }            // the call won: the sequence starts over once it ends
    else if (phase === 'show' && !call) suspendIntercom();                          // a finished call resumes announcements; they wait while the note is on screen
  }
  function begin(note) {
    abort(true);                                              // a newer note replaces the one before it and restarts the sequence
    current = note;
    activeSeq = note.seq;
    if (callActive()) phase = 'hold'; else run(note);
    clearInterval(watchTimer);
    watchTimer = setInterval(watch, WATCH_MS);
  }
  function close() {
    if (phase !== 'show') return;
    abort(false);
    current = null;
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (_) {} }
    lastFocus = null;
  }

  closeBtn.addEventListener('click', function () { if (!locked) close(); });
  root.addEventListener('keydown', function (event) {
    var key = event.key;
    if (key === 'Escape' || key === 'Esc') { event.preventDefault(); event.stopPropagation(); if (!locked) close(); return; }
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      if (event.target !== closeBtn) { event.preventDefault(); if (!locked) close(); }
      event.stopPropagation();
      return;
    }
    if (key === 'Tab') {                                      // focus stays inside: the Close button is the only control
      event.preventDefault();
      if (!locked) { try { closeBtn.focus({ preventScroll: true }); } catch (_) {} } else { try { root.focus({ preventScroll: true }); } catch (_) {} }
    }
  });

  /* ---------- talking to the server ---------- */
  function schedule(delay) {
    clearTimeout(pollTimer);
    if (!listening) { polling = false; return; }
    polling = true;
    pollTimer = setTimeout(poll, delay);
  }
  function poll() {
    if (!listening) { polling = false; return; }
    if (document.hidden) { polling = false; return; }         // paused while the page is hidden; visibilitychange wakes it
    var controller = window.AbortController ? new AbortController() : null;
    var timeout = controller ? setTimeout(function () { controller.abort(); }, POLL_TIMEOUT_MS) : 0;
    var url = API + '?action=poll&l=' + currentListenerId() + '&ack=' + Math.max(handledSeq, storedSeq());
    var options = { credentials: 'same-origin', cache: 'no-store' };
    if (controller) options.signal = controller.signal;
    fetch(url, options).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (data) { return { status: response.status, ok: response.ok, data: data }; });
    }).then(function (result) {
      clearTimeout(timeout);
      if (result.status === 403) { schedule(AUTH_MS); return; }   // not paired yet: intercom-listener.js pairs this board itself
      if (!result.ok || !result.data || result.data.ok === false) throw new Error('poll');
      handle(result.data);
      schedule(POLL_MS);
    }).catch(function () { clearTimeout(timeout); schedule(RETRY_MS); });
  }
  function handle(data) {
    var seq = Number(data.seq) || 0, latest = data.latest;
    if (seq < storedSeq()) { handledSeq = seq; activeSeq = Math.min(activeSeq, seq); write(KEY_SEQ, String(seq)); }   // the server started over
    if (!latest || !latest.text) return;
    var done = Math.max(handledSeq, storedSeq(), activeSeq);   // another tab of this browser may have handled it
    if (latest.seq > done && latest.age <= MAX_AGE_SECONDS) begin(latest);
  }

  /* ---------- on / off ---------- */
  function start() {
    if (polling) return;
    if (!probe) {                                              // warm the cache so the sound starts at once
      try { probe = new Audio(SOUND_URL); probe.preload = 'auto'; probe.load(); } catch (_) { probe = null; }
    }
    schedule(0);
  }
  function setListening(on) {
    if (on === listening) return;
    listening = on;
    if (on) { start(); return; }
    clearTimeout(pollTimer); polling = false;
    if (phase !== 'idle') { abort(false); current = null; }
    activeSeq = handledSeq;                                    // a note that was only waiting for a call is not lost
  }
  document.addEventListener('c122:intercom-enabled', function (event) {
    var detail = event && event.detail || {};
    if (typeof detail.listenerId === 'string' && /^[a-f0-9]{8,32}$/.test(detail.listenerId)) listenerId = detail.listenerId;
    setListening(!!detail.enabled);
  });
  window.addEventListener('storage', function (event) {
    if (event.key === KEY_ON) setListening(event.newValue === '1');
    else if (event.key === KEY_ID && /^[a-f0-9]{8,32}$/.test(event.newValue || '')) listenerId = event.newValue;
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && listening && !polling) schedule(0); });
  window.addEventListener('pagehide', function () { stopSound(); });

  handledSeq = storedSeq();
  listenerId = read(KEY_ID) || '';
  if (read(KEY_ON) === '1') setListening(true);
})();

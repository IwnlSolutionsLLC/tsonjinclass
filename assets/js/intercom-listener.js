/* Intercom (display): while listening, play the music.mp3 chime to its end and then the teacher's announcement. */
(function () {
  'use strict';
  var C = window.C122 || {};
  var button = document.getElementById('intercomListenButton');
  var pill = document.getElementById('intercomPill');
  if (!button || !pill) return;

  var KEY_ON = 'c122:intercom', KEY_ID = 'c122:intercom-id', KEY_SEQ = 'c122:intercom-seq', KEY_MIC = 'c122:call-mic';
  var MAX_AGE_SECONDS = 180;           // an announcement older than this is not played late
  var POLL_MS = 2000, RETRY_MS = 8000, AUTH_MS = 10000;
  var CHIME_FALLBACK = 'assets/audio/music.mp3';     // always lowercase: Linux hosting is case-sensitive
  var SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

  var pillText = pill.querySelector('span');
  var labelEl = button.querySelector('span');
  var chimeUrl = button.getAttribute('data-chime') || CHIME_FALLBACK;
  var chimeEl = new Audio(chimeUrl);
  var voiceEl = new Audio(SILENCE);
  chimeEl.preload = 'auto';
  try { chimeEl.load(); } catch (_) {}

  var enabled = false, polling = false, pollTimer = 0, authState = false, offline = false;
  var lastSeq = null, ackSeq = 0, queue = [], busy = false, playing = false;
  var primed = false, needsTap = false, pairing = false;
  var suspended = false, runId = 0, abortPlay = null, preloadWarned = false;
  var listenerId = '';

  function T(key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  }
  function read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function write(key, value) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (_) {} }
  function randomId() {
    var bytes = new Uint8Array(8), out = '';
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes); else for (var i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    for (var j = 0; j < 8; j++) out += ('0' + bytes[j].toString(16)).slice(-2);
    return out;
  }
  function installedApp() {
    try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; } catch (_) { return false; }
  }
  /* Browsers only let a page make sound after the person has touched it once (installed apps are exempt). */
  function audioReady() {
    if (primed || installedApp()) return true;
    return !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
  }
  function warn() {
    try { if (window.console && console.warn) console.warn.apply(console, arguments); } catch (_) {}
  }

  /* ---------- interface ---------- */
  function render() {
    button.setAttribute('aria-pressed', String(enabled));
    labelEl.setAttribute('data-i18n', enabled ? 'intercom.listening' : 'intercom.listen');
    labelEl.textContent = enabled ? 'Intercom сонсож байна — зогсоох' : 'Intercom сонсох';
    if (window.C122I18n) window.C122I18n.translate(labelEl);
    /* Idle listening shows NOTHING. Only a warning (sound locked, album code needed, connection lost) or an announcement playing is
       shown, never on the whiteboard: while the board editor is immersive the pill stays hidden in every state, and the 'playing'
       state is hidden on the board tab. A tap anywhere still unlocks sound (resumeAfterTap below). */
    var state = '', text = '';
    if (enabled) {
      if (playing) { state = 'playing'; text = T('intercom.pillPlaying', 'Intercom · зарлал тоглож байна…'); }
      else if (authState) { state = 'warn'; text = T('intercom.pillAuth', 'Intercom · Цомгийн кодоор нэвтэрнэ үү'); }
      else if (needsTap || !audioReady()) { state = 'warn'; text = T('intercom.pillLocked', 'Intercom · дууг идэвхжүүлэхийн тулд дэлгэц дээр товшино уу'); }
      else if (offline) { state = 'off'; text = T('intercom.pillOffline', 'Intercom · холболт тасарсан, дахин оролдож байна'); }
    }
    var body = document.body, onBoard = body.getAttribute('data-tab') === 'board';
    var hide = !state || body.classList.contains('board-immersive') || (state === 'playing' && onBoard);
    pill.hidden = hide;
    if (hide) { pillText.textContent = ''; pill.removeAttribute('data-state'); return; }
    pill.setAttribute('data-state', state);
    pillText.textContent = text;
  }
  function toast(message, type) { if (C.toast) C.toast(message, type); }

  /* ---------- sound ---------- */
  function prime() {
    if (playing) { primed = true; return; }          // sound is already coming out, so it is unlocked
    [chimeEl, voiceEl].forEach(function (element) {
      var wasMuted = element.muted;
      element.muted = true;
      var attempt;
      try { attempt = element.play(); } catch (_) { element.muted = wasMuted; return; }
      if (attempt && attempt.then) {
        attempt.then(function () {
          if (!playing) { element.pause(); try { element.currentTime = 0; } catch (_) {} }
          element.muted = wasMuted;
          primed = true; needsTap = false; render();
        }).catch(function () { element.muted = wasMuted; });
      }
    });
  }
  function suspendedError() { var failure = new Error('suspended'); failure.name = 'Suspended'; return failure; }
  /* Plays one element. Resolves when it ends (or a watchdog stops it), rejects on a play/media error or when suspend() aborts it.
     `limit` is milliseconds, or a function returning them (re-read once the length of the sound is known). */
  function playElement(element, limit) {
    return new Promise(function (resolve, reject) {
      var finished = false, watchdog = 0, began = Date.now();
      function limitMs() { return typeof limit === 'function' ? limit() : limit; }
      function arm() {
        clearTimeout(watchdog);
        watchdog = setTimeout(function () { try { element.pause(); } catch (_) {} done(null, 'timeout'); }, Math.max(500, limitMs() - (Date.now() - began)));
      }
      function done(error, outcome) {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        element.removeEventListener('ended', onEnded);
        element.removeEventListener('error', onError);
        element.removeEventListener('durationchange', arm);
        if (abortPlay === abort) abortPlay = null;
        if (error) reject(error); else resolve(outcome || 'ended');
      }
      function abort() { try { element.pause(); } catch (_) {} done(suspendedError()); }
      function onEnded() { done(); }
      function onError() {
        var code = element.error && element.error.code, failure = new Error('media' + (code ? ' ' + code : ''));
        failure.name = 'MediaError'; failure.code = code || 0;
        done(failure);
      }
      element.addEventListener('ended', onEnded);
      element.addEventListener('error', onError);
      element.addEventListener('durationchange', arm);
      abortPlay = abort;
      try { element.currentTime = 0; } catch (_) {}
      element.muted = false;
      arm();
      var attempt;
      try { attempt = element.play(); } catch (error) { done(error); return; }
      if (attempt && attempt.catch) attempt.catch(done);
    });
  }
  /* The chime must be heard to its very end before the announcement starts: the ended event, with a watchdog of length + 3 s. */
  function chimeLimit() {
    var length = chimeEl.duration;
    return (isFinite(length) && length > 0 ? length + 3 : 30) * 1000;
  }
  function reportChime(reason, error) {
    var code = error && error.code ? ' (media error ' + error.code + ')' : '';
    function say(status) { warn('[intercom] chime not played: ' + reason + code + ' - ' + chimeUrl + ' - HTTP ' + status + '. The announcement plays without it.'); }
    if (!window.fetch) { say('?'); return; }
    fetch(chimeUrl, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' }).then(function (response) { say(response.status); }, function () { say('no response'); });
  }
  function playChime() {
    return playElement(chimeEl, chimeLimit).then(function (outcome) {
      if (outcome === 'timeout') warn('[intercom] chime stopped by the watchdog after ' + Math.round(chimeLimit() / 1000) + ' s - ' + chimeUrl);
    }, function (error) {
      if (error && (error.name === 'NotAllowedError' || error.name === 'Suspended')) throw error;   // waits for a tap / is stopped on purpose
      reportChime(error && error.name === 'MediaError' ? 'it failed to load' : 'play() was rejected' + (error && error.name ? ' (' + error.name + ')' : ''), error);   // a missing chime must not cancel the announcement
    });
  }
  chimeEl.addEventListener('error', function () {
    if (preloadWarned) return;
    preloadWarned = true;
    reportChime('it failed to preload', chimeEl.error);
  });
  function fetchVoice(item) {
    return fetch('intercom.php?action=audio&id=' + encodeURIComponent(item.id), { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
      if (!response.ok) { var failure = new Error('audio ' + response.status); failure.status = response.status; throw failure; }
      return response.blob();
    }).then(function (blob) {
      return URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: item.mime }));
    });
  }
  function pauseMusic() { if (C.Music && typeof C.Music.pause === 'function') { try { C.Music.pause(); } catch (_) {} } }
  function announce(active) {
    playing = active;
    document.dispatchEvent(new CustomEvent('c122:intercom', { detail: { playing: active } }));
    render();
  }
  function stopSound() {
    if (abortPlay) abortPlay();
    try { chimeEl.pause(); voiceEl.pause(); } catch (_) {}
  }

  function next() {
    if (busy || !enabled || suspended || !queue.length) return;
    var item = queue[0];
    if (Date.now() - item.receivedAt > MAX_AGE_SECONDS * 1000) { queue.shift(); next(); return; }
    var token = ++runId;
    function still() { if (token !== runId) throw suspendedError(); }
    busy = true;
    announce(true);
    pauseMusic();
    var voice = fetchVoice(item);
    voice.catch(function () {});                       // handled below; avoids an unhandled rejection during the chime
    var url = '';
    playChime().then(function () {
      still();
      return voice;
    }).then(function (objectUrl) {
      url = objectUrl;
      still();                                         // the chime has fully ended: only now does the announcement start
      voiceEl.src = url;
      return playElement(voiceEl, (MAX_AGE_SECONDS + 30) * 1000);
    }).then(function () {
      ackSeq = Math.max(ackSeq, item.seq);
      queue.shift();
    }).catch(function (error) {
      if (error && error.name === 'Suspended') return;                                // a call (or switching off) stopped it: the item stays queued while it is fresh
      if (error && error.name === 'NotAllowedError') {                               // wait for a tap, keep the announcement queued
        needsTap = true;
        voice.then(function (objectUrl) { URL.revokeObjectURL(objectUrl); }, function () {});
        return;
      }
      queue.shift();
      toast(T('intercom.playFailed', 'Intercom зарлалыг тоглуулж чадсангүй.'), 'error');
    }).then(function () {
      if (url) URL.revokeObjectURL(url);
      try { voiceEl.pause(); } catch (_) {}
      busy = false;
      announce(false);
      if (!needsTap) next();
    });
  }

  /* ---------- talking to the server ---------- */
  function schedule(delay) {
    clearTimeout(pollTimer);
    if (!enabled) { polling = false; return; }
    polling = true;
    pollTimer = setTimeout(poll, delay);
  }
  function pair() {
    if (pairing || !C.state || !C.state.csrf) return Promise.resolve(false);
    pairing = true;
    return fetch('intercom.php?action=enable', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'X-CSRF': C.state.csrf } })
      .then(function (response) { return response.ok; })
      .catch(function () { return false; })
      .then(function (ok) { pairing = false; return ok; });
  }
  function poll() {
    if (!enabled) return;
    var query = 'intercom.php?action=poll&l=' + listenerId + '&r=' + (audioReady() ? 1 : 0) + '&ack=' + ackSeq;
    fetch(query, { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (data) { return { response: response, data: data }; });
    }).then(function (result) {
      var response = result.response, data = result.data;
      if (response.status === 403 && data && data.code === 'listener_required') {
        authState = true; render();
        return pair().then(function (ok) {
          if (ok) { authState = false; render(); schedule(300); } else schedule(AUTH_MS);
        });
      }
      if (!response.ok || !data || data.ok === false) throw new Error('poll');
      authState = false; offline = false;
      handle(data);
      render();
      schedule(POLL_MS);
    }).catch(function () {
      offline = true; render();
      schedule(RETRY_MS);
    });
  }
  function handle(data) {
    var seq = Number(data.seq) || 0, latest = data.latest;
    if (lastSeq === null || seq < lastSeq) { lastSeq = seq; write(KEY_SEQ, String(seq)); return; }
    if (latest && latest.seq > lastSeq) {
      lastSeq = latest.seq; write(KEY_SEQ, String(lastSeq));
      if (latest.age <= MAX_AGE_SECONDS) {
        queue.push({ seq: latest.seq, id: latest.id, mime: latest.mime, receivedAt: Date.now() - latest.age * 1000 });
        if (queue.length > 3) queue.shift();
        next();
      }
    }
  }

  /* ---------- on / off ---------- */
  function start() {
    if (polling) return;
    schedule(0);
  }
  /* Tells the CALL client (call-board.js) that listening was switched; `user` is true when a tap caused it (a permission prompt may be shown then). */
  function emitEnabled(user) {
    try { document.dispatchEvent(new CustomEvent('c122:intercom-enabled', { detail: { enabled: enabled, listenerId: listenerId, user: !!user } })); } catch (_) {}
  }
  function setEnabled(on, save, user, quiet) {
    enabled = on;
    if (save !== false) write(KEY_ON, on ? '1' : '0');
    if (on) { start(); }
    else {
      clearTimeout(pollTimer); polling = false;
      queue = []; needsTap = false; authState = false; offline = false;
      runId++;
      stopSound();                                   // also releases a play that was waiting for its ended event
      if (playing) announce(false);
    }
    render();
    if (!quiet) emitEnabled(user);
  }
  button.addEventListener('click', function () {
    if (enabled) { setEnabled(false, true, true); toast(T('intercom.toastOff', 'Intercom сонсохыг зогсоолоо.')); return; }
    prime();                                         // this tap is the permission for sound
    setEnabled(true, true, true);                    // synchronously tells call-board.js, which may ask for the microphone inside this tap
    toast(T('intercom.toastOn', 'Intercom сонсож байна. Багшийн зарлал энэ дэлгэцээр тоглоно.'));
  });
  function resumeAfterTap() {
    if (needsTap) { needsTap = false; render(); next(); }            // the tap itself unlocks sound for this play()
    else if (enabled && !primed) prime();
  }
  pill.addEventListener('click', function () {
    if (authState) { var album = document.querySelector('[data-tab="album"]'); if (album) album.click(); }
    else resumeAfterTap();
  });
  ['pointerdown', 'keydown', 'touchend'].forEach(function (name) {
    window.addEventListener(name, resumeAfterTap, { capture: true, passive: true });
  });
  document.addEventListener('c122:language', render);
  if (window.MutationObserver) { try { new MutationObserver(render).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-tab'] }); } catch (_) {} }
  document.addEventListener('c122:tab', render);
  document.addEventListener('c122:call-mic', render);                  // call-board.js reports the microphone permission result
  window.addEventListener('storage', function (event) { if (event.key === KEY_ON) setEnabled(event.newValue === '1', false, false); });

  /* A call takes priority over announcements: stop what is playing and hold the queue; it plays again (if still fresh) afterwards. */
  window.C122Intercom = {
    suspend: function () {
      if (suspended) return;
      suspended = true;
      runId++;
      stopSound();
    },
    resume: function () {
      if (!suspended) return;
      suspended = false;
      if (enabled) next();
    }
  };

  listenerId = read(KEY_ID);
  if (!/^[a-f0-9]{16}$/.test(listenerId || '')) { listenerId = randomId(); write(KEY_ID, listenerId); }
  var stored = read(KEY_SEQ);
  lastSeq = stored !== null && /^\d+$/.test(stored) ? Number(stored) : null;

  var saved = read(KEY_ON), androidDisplay = /(?:^|[?&])display=android(?:&|$)/.test(location.search);
  try { androidDisplay = androidDisplay || sessionStorage.getItem('c122.androidDisplay') === '1'; } catch (_) {}
  setEnabled(saved === '1' || (saved === null && androidDisplay), false, false, true);
  // Announce the starting state once every script of the page (call-board.js loads after this file) has run.
  function announceStart() { emitEnabled(false); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', announceStart, { once: true });
  else setTimeout(announceStart, 0);
})();

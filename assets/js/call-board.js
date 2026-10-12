/* Call (display): the teacher rings this classroom board. The board plays the ringtone, answers by itself, and both sides talk
   over WebRTC (audio only). Signaling goes through call.php (polling); no audio ever reaches the server and nothing is recorded.
   Runs only while "Intercom сонсох" is ON (intercom-listener.js tells us with the c122:intercom-enabled event). */
(function () {
  'use strict';
  var overlay = document.getElementById('callOverlay');
  if (!overlay || typeof Promise === 'undefined' || typeof fetch === 'undefined') return;

  var API = 'call.php';
  var KEY_ON = 'c122:intercom', KEY_ID = 'c122:intercom-id', KEY_MIC = 'c122:call-mic', KEY_CLAIM = 'c122:call-claim';
  var POLL_IDLE = 1500, POLL_RING = 700, POLL_ACTIVE = 2000, POLL_RETRY = 3000, POLL_GONE = 30000, POLL_TIMEOUT = 8000;
  var RING_FALLBACK_MS = 8500;        // the ringtone is 7.8 s; if sound is blocked the call is still answered after this long
  var SILENCE_MS = 20000;             // no reply from the server for this long: the call is over (the server drops it after 20 s too)
  var CONNECT_LIMIT_MS = 35000;       // answered, but the audio never connected
  var DISCONNECT_GRACE_MS = 8000;     // a brief "disconnected" often heals by itself
  var ENDED_SHOW_MS = 3000;           // how long the reason stays on screen
  var MIC_WAIT_MS = 8000;             // do not wait forever for a microphone permission prompt nobody answers
  var SILENCE_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  var DEFAULT_RING = 'assets/audio/1006.mp3';       // lowercase: Linux hosting is case-sensitive

  var el = {
    avatar: document.getElementById('callAvatar'), fallback: overlay.querySelector('.call-avatar-fallback'),
    name: document.getElementById('callName'), status: document.getElementById('callStatus'), timer: document.getElementById('callTimer'),
    mic: document.getElementById('callMic'), micText: document.getElementById('callMicText'),
    noteSound: document.getElementById('callNoteSound'), noteTeacher: document.getElementById('callNoteTeacher'), noteMic: document.getElementById('callNoteMic'),
    mute: document.getElementById('callMute'), muteLabel: document.getElementById('callMuteLabel'),
    hangup: document.getElementById('callHangup'), hangupLabel: document.getElementById('callHangupLabel'),
    remote: document.getElementById('callRemoteAudio')
  };
  if (!el.status || !el.hangup || !el.remote) return;
  var ringUrl = overlay.getAttribute('data-ring') || DEFAULT_RING;

  var enabled = false, listenerId = '', csrf = '', iceServers = [];
  var pollTimer = 0, pollBusy = false;
  var cur = null;                                 // the call this page is handling
  var view = { state: 'idle', reason: '' };       // what the overlay shows (it outlives `cur` for a moment when a call ends)
  var handled = {}, hungUp = {};                  // call ids already declined/ended here; ids we asked the server to hang up
  var ring = null, ringOwner = null, ringWarned = false, primed = false, soundBlocked = false;
  var tickTimer = 0, hideTimer = 0, permission = '';
  var tabId = '';

  function T(key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  }
  function read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function write(key, value) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (_) {} }
  function warn() { try { if (window.console && console.warn) console.warn.apply(console, arguments); } catch (_) {} }
  function noop() {}
  function site() { return window.C122 || {}; }
  function toast(message, type) { var s = site(); if (s.toast) s.toast(message, type); }
  function randomId() {
    var bytes = new Uint8Array(8), out = '';
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes); else for (var i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    for (var j = 0; j < 8; j++) out += ('0' + bytes[j].toString(16)).slice(-2);
    return out;
  }
  function setText(node, text) { if (node && node.textContent !== text) node.textContent = text; }
  function micOk() { return read(KEY_MIC) === '1'; }
  function stopStream(stream) {
    if (!stream || !stream.getTracks) return;
    stream.getTracks().forEach(function (track) { try { track.onended = null; track.stop(); } catch (_) {} });
  }
  function parse(response) {
    return response.json().catch(function () { return null; }).then(function (data) { return { status: response.status, ok: response.ok && !!data && data.ok !== false, data: data }; });
  }
  /* A missing media file is the kind of failure that used to hide for months: say which file and what the server answered. */
  function probe(label, url, error) {
    var code = error && error.code ? ' (media error ' + error.code + ')' : '';
    function say(status) { warn('[call] ' + label + ' failed to load' + code + ' - ' + url + ' - HTTP ' + status); }
    if (!window.fetch) { say('?'); return; }
    fetch(url, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' }).then(function (response) { say(response.status); }, function () { say('no response'); });
  }

  /* ---------- several tabs of the same browser share one listener id: only one of them may take a call ---------- */
  function claimRecord() { try { return JSON.parse(read(KEY_CLAIM) || 'null'); } catch (_) { return null; } }
  function claimedByOther(id) {
    var record = claimRecord();
    return !!(record && record.id === id && record.tab !== tabId && Date.now() - record.t < 6000);
  }
  function claim(id) {
    if (claimedByOther(id)) return false;
    write(KEY_CLAIM, JSON.stringify({ id: id, tab: tabId, t: Date.now() }));
    return true;
  }
  function releaseClaim(id) { var record = claimRecord(); if (record && record.id === id && record.tab === tabId) write(KEY_CLAIM, null); }

  /* ---------- interface ---------- */
  function endReasonText(reason) {
    switch (reason) {
      case 'hangup_teacher': return T('call.board.end.hangup_teacher', 'Багш яриаг дуусгалаа.');
      case 'cancelled': return T('call.board.end.cancelled', 'Багш дуудлагаа цуцаллаа.');
      case 'missed': return T('call.board.end.missed', 'Дуудлага хариулагдсангүй.');
      case 'declined': return T('call.board.end.declined', 'Дуудлага татгалзагдлаа.');
      case 'failed': return T('call.board.end.failed', 'Холболт тогтсонгүй.');
      case 'lost': return T('call.board.end.lost', 'Холболт тасарлаа.');
      case 'timeout': return T('call.board.end.timeout', 'Яриа дээд хугацаандаа (30 минут) хүрч дууслаа.');
      case 'unsupported': return T('call.board.end.unsupported', 'Энэ хөтөч дуудлагыг дэмжихгүй байна.');
      default: return T('call.board.end.generic', 'Яриа дууслаа.');
    }
  }
  function formatTime(ms) {
    var total = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(total / 3600), m = Math.floor(total / 60) % 60, s = total % 60;
    function two(n) { return (n < 10 ? '0' : '') + n; }
    return (h ? h + ':' + two(m) : m) + ':' + two(s);
  }
  function micIndicator(call, state) {
    if (!call || (state !== 'connecting' && state !== 'active') || !call.micChecked) return 'off';
    if (!call.track) return 'blocked';
    return call.muted ? 'muted' : 'live';
  }
  function render() {
    var call = cur, state = view.state, mic = micIndicator(call, state);
    var live = state === 'ringing' || state === 'connecting' || state === 'active';
    overlay.setAttribute('data-state', state);
    if (state === 'ringing') setText(el.status, T('call.board.ringing', 'Багш дуудаж байна…'));
    else if (state === 'connecting') setText(el.status, T('call.board.connecting', 'Холбогдож байна…'));
    else if (state === 'active') setText(el.status, T('call.board.talking', 'Яриа үргэлжилж байна'));
    else if (state === 'ended') setText(el.status, endReasonText(view.reason));
    setText(el.hangupLabel, state === 'ringing' ? T('call.board.decline', 'Татгалзах') : T('call.board.hangup', 'Таслах'));
    el.timer.hidden = state !== 'active';
    if (state === 'active' && call && call.started) setText(el.timer, formatTime(Date.now() - call.started));

    el.mute.hidden = !(state === 'connecting' || state === 'active');
    var muted = !!(call && call.muted), canMute = !!(call && call.track);
    el.mute.setAttribute('aria-pressed', String(muted));
    el.mute.setAttribute('aria-disabled', String(!canMute));
    setText(el.muteLabel, muted ? T('call.board.unmute', 'Микрофон нээх') : T('call.board.mute', 'Микрофон хаах'));

    el.mic.hidden = mic === 'off';
    el.mic.setAttribute('data-mic', mic);
    if (mic === 'live') setText(el.micText, T('call.board.micLive', 'Микрофон асаалттай'));
    else if (mic === 'muted') setText(el.micText, T('call.board.micMuted', 'Микрофон хаасан'));
    else if (mic === 'blocked') setText(el.micText, T('call.board.micBlocked', 'Микрофон хаалттай'));

    var blockedSound = live && soundBlocked, teacherMuted = state === 'active' && !!(call && call.teacherMuted);
    setNote(el.noteSound, blockedSound, T('call.board.tapForSound', 'Дуу гарахгүй байна. Дэлгэц дээр нэг товшино уу.'));
    setNote(el.noteTeacher, teacherMuted, T('call.board.teacherMuted', 'Багш микрофоноо хаасан байна.'));
    setNote(el.noteMic, mic === 'blocked', T('call.board.micNote', 'Хөтчийн тохиргооноос микрофоныг зөвшөөрвөл Багш таныг сонсох боломжтой. Одоо та зөвхөн сонсож байна.'));
    el.noteSound.classList.toggle('is-sound', blockedSound);
  }
  function setNote(node, visible, text) {
    if (visible) { setText(node, text); node.hidden = false; } else { node.hidden = true; }
  }
  function showCaller(caller) {
    var name = caller && typeof caller.name === 'string' ? caller.name.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    if (!name || name === 'Багш') {
      el.name.setAttribute('data-i18n', 'call.board.teacher'); el.name.removeAttribute('data-user-content');
      setText(el.name, T('call.board.teacher', 'Багш'));
    } else {
      el.name.removeAttribute('data-i18n'); el.name.setAttribute('data-user-content', '');
      setText(el.name, name);
    }
    var src = caller && typeof caller.avatar === 'string' && /^assets\/img\/[\w.\-]+\.(?:jpe?g|png|webp)$/i.test(caller.avatar) ? caller.avatar : '';
    if (src && (el.avatar.getAttribute('src') || '').split('?')[0] !== src) { el.avatar.hidden = false; el.fallback.hidden = true; el.avatar.setAttribute('src', src); }
  }
  if (el.avatar) {
    el.avatar.addEventListener('error', function () { el.avatar.hidden = true; if (el.fallback) el.fallback.hidden = false; });
    el.avatar.addEventListener('load', function () { el.avatar.hidden = false; if (el.fallback) el.fallback.hidden = true; });
  }
  function show() {
    document.documentElement.classList.add('call-open');
    if (overlay.open) return;
    try {
      if (typeof overlay.showModal === 'function') overlay.showModal(); else overlay.setAttribute('open', '');
    } catch (_) { overlay.setAttribute('open', ''); }
    try { el.hangup.focus({ preventScroll: true }); } catch (_) {}
  }
  function hide() {
    clearTimeout(hideTimer); hideTimer = 0;
    if (cur) return;                               // a newer call took the screen
    stopTick();
    view.state = 'idle'; view.reason = '';
    render();
    try { if (overlay.open) { if (typeof overlay.close === 'function') overlay.close(); else overlay.removeAttribute('open'); } } catch (_) { overlay.removeAttribute('open'); }
    document.documentElement.classList.remove('call-open');
    resumeIntercom();
  }
  function setView(state) { view.state = state; view.reason = ''; render(); }
  function startTick() { if (!tickTimer) tickTimer = setInterval(tick, 1000); }
  function stopTick() { clearInterval(tickTimer); tickTimer = 0; }
  function tick() {
    if (view.state !== 'idle' && !overlay.open) show();       // while a call is on, the screen cannot be dismissed
    if (!cur) return;
    claim(cur.id);
    if (cur.phase === 'active') setText(el.timer, formatTime(Date.now() - cur.started));
  }
  // A modal dialog closes on Escape (or when other code closes it): not while a call is on.
  overlay.addEventListener('cancel', function (event) { if (view.state !== 'idle') event.preventDefault(); });
  overlay.addEventListener('close', function () { if (view.state !== 'idle') show(); });
  overlay.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { event.preventDefault(); return; }
    if (event.key !== 'Tab') return;
    var items = [el.mute, el.hangup].filter(function (button) { return !button.hidden; });     // focus stays on the call buttons (also where the browser would let it wander off to its own bars)
    if (!items.length) { event.preventDefault(); return; }
    var first = items[0], last = items[items.length - 1], now = document.activeElement;
    if (items.indexOf(now) < 0) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
    else if (event.shiftKey && now === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && now === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener('c122:language', render);

  /* ---------- other parts of the page ---------- */
  function pauseMusic() { var s = site(); if (s.Music && typeof s.Music.pause === 'function') { try { s.Music.pause(); } catch (_) {} } }
  function suspendIntercom() { if (window.C122Intercom && typeof window.C122Intercom.suspend === 'function') { try { window.C122Intercom.suspend(); } catch (_) {} } }
  function resumeIntercom() { if (window.C122Intercom && typeof window.C122Intercom.resume === 'function') { try { window.C122Intercom.resume(); } catch (_) {} } }

  /* ---------- sound: ringtone and the teacher's voice ---------- */
  function ringElement() {
    if (ring) return ring;
    ring = new Audio(ringUrl);
    ring.preload = 'auto';
    ring.addEventListener('ended', function () {
      var owner = ringOwner;
      ringOwner = null;
      if (owner && cur === owner && owner.phase === 'ringing') accept();       // the ring is over: answer
    });
    ring.addEventListener('error', function () { if (!ringWarned) { ringWarned = true; probe('ringtone', ringUrl, ring.error); } });
    try { ring.load(); } catch (_) {}
    return ring;
  }
  function soundRefused(error) {
    if (error && error.name === 'AbortError') return;                  // we paused it ourselves
    if (error && error.name === 'NotAllowedError') { soundBlocked = true; render(); return; }
    warn('[call] sound could not play (' + (error && error.name ? error.name : 'error') + ')');
  }
  function playRing(call) {
    var element = ringElement(), attempt;
    ringOwner = call;
    try { element.pause(); element.currentTime = 0; } catch (_) {}
    element.loop = false; element.muted = false;
    try { attempt = element.play(); } catch (error) { soundRefused(error); return; }
    if (attempt && attempt.catch) attempt.catch(function (error) { if (cur === call && call.phase === 'ringing') soundRefused(error); });
  }
  function stopRing() {
    ringOwner = null;
    if (!ring) return;
    try { ring.pause(); ring.currentTime = 0; } catch (_) {}
  }
  function playRemote() {
    var attempt;
    el.remote.muted = false; el.remote.volume = 1;
    try { attempt = el.remote.play(); } catch (error) { soundRefused(error); return; }
    if (attempt && attempt.catch) attempt.catch(function (error) { if (cur) soundRefused(error); });
  }
  el.remote.addEventListener('playing', function () { if (soundBlocked && el.remote.srcObject) { soundBlocked = false; render(); } });
  /* A tap on the screen is the browser's permission for sound: retry whatever was refused. */
  function unlockSound() {
    if (!soundBlocked || !cur) return;
    soundBlocked = false;
    if (cur.phase === 'ringing' && ring && ring.paused) playRing(cur);
    if (cur.remote) playRemote();
    render();
  }
  overlay.addEventListener('pointerdown', unlockSound, true);
  overlay.addEventListener('keydown', unlockSound, true);
  /* iPad/iPhone only let an element make sound after a tap played it once, so warm both up while the person is tapping anyway. */
  function prime() {
    if (primed || cur) return;
    [ringElement(), el.remote].forEach(function (element) {
      var wasMuted = element.muted, attempt, borrowed = false;
      if (element === el.remote && !element.srcObject && !element.getAttribute('src')) { element.src = SILENCE_WAV; borrowed = true; }
      element.muted = true;
      try { attempt = element.play(); } catch (_) { element.muted = wasMuted; return; }
      function settle() {
        element.muted = wasMuted;
        if (borrowed && !element.srcObject) element.removeAttribute('src');
      }
      if (attempt && attempt.then) {
        attempt.then(function () {
          if (!cur) { try { element.pause(); element.currentTime = 0; } catch (_) {} }
          settle(); primed = true;
        }, settle);
      } else settle();
    });
  }
  function firstTouch() {
    if (!enabled || primed) return;
    prime();
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(function (name) { window.addEventListener(name, firstTouch, { capture: true, passive: true }); });

  /* ---------- microphone permission (asked once, when listening is switched on by a tap) ---------- */
  function setMic(value) {
    if (read(KEY_MIC) === value) return;
    write(KEY_MIC, value);
    try { document.dispatchEvent(new CustomEvent('c122:call-mic', { detail: { mic: value === '1' } })); } catch (_) {}
  }
  /* The browser's own permission state keeps the stored answer honest (the person may change it in the browser settings later).
     The first reading only fills in an answer we do not have yet: a tap's real outcome (denied, or no microphone at all) is more exact. */
  function applyPermission(state, first) {
    permission = state;
    if (first && read(KEY_MIC) !== null) { if (state === 'denied') setMic('0'); return; }
    if (state === 'granted') setMic('1'); else if (state === 'denied') setMic('0');
  }
  function watchPermission() {
    try {
      navigator.permissions.query({ name: 'microphone' }).then(function (status) {
        applyPermission(status.state, true);
        status.onchange = function () { applyPermission(status.state, false); };
      }, noop);
    } catch (_) {}
  }
  function micHint(insecure) {
    return insecure
      ? T('call.board.micInsecure', 'Микрофон ашиглахад HTTPS холболт шаардлагатай тул дуудлагыг зөвхөн сонсох боломжтой.')
      : T('call.micHint', 'Микрофон зөвшөөрөгдөөгүй тул дуудлагыг зөвхөн сонсох боломжтой. Хөтчийн тохиргооноос микрофоныг зөвшөөрнө үү.');
  }
  function askMicOnce() {
    var devices = navigator.mediaDevices;
    if (permission === 'granted') { setMic('1'); return; }
    if (!devices || typeof devices.getUserMedia !== 'function') {
      setMic('0');
      toast(micHint(window.isSecureContext === false), 'error');
      return;
    }
    devices.getUserMedia({ audio: true }).then(function (stream) {
      stopStream(stream);                           // only the permission was wanted; nothing is kept or recorded
      setMic('1');
    }, function () {
      setMic('0');
      toast(micHint(false), 'error');
    });
  }
  /* Resolves {stream, denied}; the stream is null when the microphone is refused, missing, or nobody answered the prompt in time. */
  function getMic() {
    return new Promise(function (resolve) {
      var devices = navigator.mediaDevices, settled = false, timer;
      if (!devices || typeof devices.getUserMedia !== 'function') { resolve({ stream: null, denied: false }); return; }
      timer = setTimeout(function () { if (!settled) { settled = true; resolve({ stream: null, denied: false }); } }, MIC_WAIT_MS);
      devices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }).then(function (stream) {
        if (settled) { stopStream(stream); return; }              // too late: nobody is waiting for it any more
        settled = true; clearTimeout(timer); resolve({ stream: stream, denied: false });
      }, function (error) {
        if (settled) return;
        settled = true; clearTimeout(timer);
        resolve({ stream: null, denied: !!(error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) });
      });
    });
  }

  /* ---------- talking to the server ---------- */
  function post(action, body, keepalive) {
    var payload = {}, key;
    for (key in body) if (Object.prototype.hasOwnProperty.call(body, key)) payload[key] = body[key];
    payload.l = listenerId;
    function send() {
      return fetch(API + '?action=' + action, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', keepalive: !!keepalive,
        headers: { 'Content-Type': 'application/json', 'X-Call-CSRF': csrf }, body: JSON.stringify(payload)
      }).then(parse);
    }
    return send().then(function (result) {
      if (result.status === 403 && result.data && result.data.code === 'csrf' && !keepalive) {      // the pairing cookie was renewed: fetch the new token and try once more
        return fetchPoll(null).then(function (poll) { if (poll.ok && poll.data.csrf) csrf = poll.data.csrf; return send(); });
      }
      return result;
    });
  }
  function fetchPoll(call) {
    var query = API + '?action=boardpoll&l=' + encodeURIComponent(listenerId) + '&mic=' + (micOk() ? '1' : '0') + '&id=' + (call ? call.id : '') + '&since=' + (call ? call.cursor : 0);
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, POLL_TIMEOUT);
    return fetch(query, { credentials: 'same-origin', cache: 'no-store', signal: controller ? controller.signal : undefined }).then(parse).then(function (result) {
      clearTimeout(timer); return result;
    }, function (error) { clearTimeout(timer); throw error; });
  }
  function schedule(delay) {
    clearTimeout(pollTimer);
    pollTimer = 0;
    if (enabled) pollTimer = setTimeout(poll, delay);
  }
  function pollSoon() { if (enabled && !pollBusy) schedule(0); }
  function nextDelay() { return cur ? (cur.phase === 'active' ? POLL_ACTIVE : POLL_RING) : POLL_IDLE; }
  function poll() {
    pollTimer = 0;
    if (!enabled || pollBusy) return;
    if (!/^[a-f0-9]{8,32}$/.test(listenerId)) { schedule(POLL_RETRY); return; }
    pollBusy = true;
    fetchPoll(cur).then(function (result) {
      pollBusy = false;
      if (!enabled) return;
      if (!result.ok) { pollFailed(result.status); return; }
      if (result.data.csrf) csrf = result.data.csrf;
      if (result.data.ice && Object.prototype.toString.call(result.data.ice.iceServers) === '[object Array]') iceServers = result.data.ice.iceServers;
      if (cur) cur.lastOk = Date.now();
      // A wall-mounted board is never reloaded: whatever goes wrong while handling one answer, the next poll must still happen.
      try { handle(result.data); } catch (error) { warn('[call] could not handle the server answer: ' + (error && error.message ? error.message : error)); }
      if (enabled) schedule(nextDelay());
    }, function () {
      pollBusy = false;
      if (enabled) pollFailed(0);
    }).then(null, function (error) {
      pollBusy = false;
      warn('[call] poll error: ' + (error && error.message ? error.message : error));
      if (enabled && !pollTimer) schedule(POLL_RETRY);
    });
  }
  /* A few failed polls must not drop a call; twenty seconds of silence do (the server drops it after the same time). */
  function pollFailed(status) {
    if (cur) {
      if (Date.now() - cur.lastOk >= SILENCE_MS) {
        warn('[call] the server has not answered for ' + Math.round(SILENCE_MS / 1000) + ' s: ending the call on this screen.');
        var call = cur;
        sendEnd(call, false);
        finish('lost');
        schedule(POLL_RETRY);
        return;
      }
      schedule(nextDelay());
      return;
    }
    schedule(status === 404 ? POLL_GONE : status === 403 ? POLL_IDLE : POLL_RETRY);     // not paired yet (403: the intercom listener is doing that), server hiccup, or call.php missing: wait quietly
  }
  function orphan(id) {
    var now = Date.now();
    if (claimedByOther(id)) return;                         // another tab of this browser is on that call
    if (hungUp[id] && now - hungUp[id] < 4000) return;
    hungUp[id] = now;
    post('hangup', { id: id }).then(noop, noop);            // this page has no session for a call the server thinks it is on (page was reloaded)
  }

  function handle(data) {
    var c = data.call, call = cur;
    if (!call) {
      if (!c) return;
      if (c.state === 'ringing') {
        if (handled[c.id] || !c.offer || c.offer.type !== 'offer' || typeof c.offer.sdp !== 'string') return;
        startRinging(c);
        if (cur) applyCandidates(cur, data);                 // the teacher's candidates may already be waiting
      } else if (c.state === 'connecting' || c.state === 'active') {
        orphan(c.id);
      }
      return;
    }
    if (!c || c.id !== call.id) {                           // our call is gone; a newer one may already be ringing
      finish(null, true);
      handle(data);
      return;
    }
    var teacherMuted = !!c.teacherMuted;
    if (call.teacherMuted !== teacherMuted) { call.teacherMuted = teacherMuted; render(); }
    if (c.state === 'ended') {
      var reason = String(c.endReason || '');
      if (reason === 'taken') finish(reason, true); else finish(reason || 'generic');       // 'taken': another screen answered, nothing to tell
      return;
    }
    applyCandidates(call, data);
  }
  function applyCandidates(call, data) {
    var list = data.candidates;
    if (list && Object.prototype.toString.call(list) === '[object Array]') {
      list.forEach(function (row) {
        if (!row || typeof row.n !== 'number' || row.n <= call.seen) return;
        call.seen = row.n;
        var init = candidateInit(row.c);
        if (!init) return;
        if (call.remoteSet && call.pc) call.pc.addIceCandidate(init).then(noop, noop);
        else call.pendingRemote.push(init);
      });
    }
    var cursor = Number(data.cursor);
    if (isFinite(cursor) && cursor > call.cursor) call.cursor = cursor;
  }
  function candidateInit(c) {
    if (!c || typeof c.candidate !== 'string' || c.candidate === '') return null;
    var init = { candidate: c.candidate };
    if (typeof c.sdpMid === 'string') init.sdpMid = c.sdpMid;
    if (typeof c.sdpMLineIndex === 'number') init.sdpMLineIndex = c.sdpMLineIndex;
    if (typeof c.usernameFragment === 'string') init.usernameFragment = c.usernameFragment;
    return init;
  }

  /* ---------- ringing ---------- */
  function startRinging(c) {
    if (!claim(c.id)) { handled[c.id] = true; return; }
    clearTimeout(hideTimer); hideTimer = 0;
    var call = cur = {
      id: c.id, offer: c.offer, phase: 'ringing', cursor: 0, seen: 0, lastOk: Date.now(), teacherMuted: !!c.teacherMuted,
      pc: null, stream: null, track: null, remote: null, micChecked: false, muted: false,
      pendingRemote: [], remoteSet: false, out: [], answered: false, flushTimer: 0, flushing: false, signalFails: 0,
      ringTimer: 0, connectTimer: 0, discTimer: 0, started: 0
    };
    soundBlocked = false;
    suspendIntercom();                                       // a call outranks any announcement
    pauseMusic();
    showCaller(c.caller);
    setView('ringing');
    show();
    startTick();
    call.ringTimer = setTimeout(function () { if (cur === call) accept(); }, RING_FALLBACK_MS);
    playRing(call);
  }

  /* ---------- answering ---------- */
  function accept() {
    var call = cur;
    if (!call || call.phase !== 'ringing') return;
    clearTimeout(call.ringTimer);
    stopRing();
    call.phase = 'connecting';
    call.connectTimer = setTimeout(function () { if (cur === call && call.phase !== 'active') fail(call, 'failed'); }, CONNECT_LIMIT_MS);
    setView('connecting');
    if (!(window.RTCPeerConnection || window.webkitRTCPeerConnection)) { fail(call, 'unsupported'); return; }
    getMic().then(function (mic) {
      if (cur !== call) { stopStream(mic.stream); return; }
      if (mic.stream) {
        call.stream = mic.stream;
        call.track = mic.stream.getAudioTracks()[0] || null;
        if (call.track) call.track.onended = function () { if (cur === call) { call.track = null; render(); reportListenOnly(call); } };
        setMic('1');
      } else if (mic.denied) setMic('0');
      call.micChecked = true;
      render();
      return startPeer(call);
    }).then(noop, function (error) {
      warn('[call] could not answer the call: ' + (error && error.message ? error.message : error));
      fail(call, 'failed');
    });
  }
  function startPeer(call) {
    var Peer = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    var pc = new Peer({ iceServers: iceServers });
    call.pc = pc;
    pc.onicecandidate = function (event) { if (cur === call && event.candidate) queueSignal(call, event.candidate); };
    pc.ontrack = function (event) {
      if (cur !== call) return;
      var stream = event.streams && event.streams[0];
      if (!stream) { stream = call.remote || new MediaStream(); stream.addTrack(event.track); }
      call.remote = stream;
      if (el.remote.srcObject !== stream) el.remote.srcObject = stream;
      playRemote();
    };
    pc.onconnectionstatechange = function () { peerChanged(call); };
    pc.oniceconnectionstatechange = function () { peerChanged(call); };
    return pc.setRemoteDescription({ type: 'offer', sdp: call.offer.sdp }).then(function () {
      if (cur !== call) return null;
      call.remoteSet = true;
      call.pendingRemote.splice(0).forEach(function (init) { pc.addIceCandidate(init).then(noop, noop); });
      if (call.track) pc.addTrack(call.track, call.stream);   // after the offer, so the offered audio line is reused (sendrecv); without a track the answer is receive-only
      return pc.createAnswer();
    }).then(function (answer) {
      if (cur !== call || !answer) return null;
      return pc.setLocalDescription(answer);
    }).then(function () {
      if (cur !== call || !call.pc) return null;
      return sendAnswer(call);
    });
  }
  function sendAnswer(call) {
    var attempts = 0;
    function go() {
      attempts++;
      return post('answer', { id: call.id, answer: { type: 'answer', sdp: call.pc.localDescription.sdp } }).then(function (result) {
        if (cur !== call) return;
        if (result.status === 409) { finish('taken', true); return; }            // another screen answered first, or the call is over: close quietly
        if (!result.ok) throw new Error('answer ' + result.status + (result.data && result.data.code ? ' ' + result.data.code : ''));
        call.answered = true;
        scheduleFlush(call);
        pollSoon();
      }, function (error) {
        if (cur !== call) return;
        if (attempts < 3) return new Promise(function (resolve) { setTimeout(resolve, 600); }).then(function () { return cur === call ? go() : null; });
        throw error;
      });
    }
    return go();
  }
  /* Candidates found before the answer reached the server wait here: the server accepts them only from the screen that answered. */
  var CANDIDATE_LINE = /^candidate:[\x21-\x7E ]+$/;
  function queueSignal(call, candidate) {
    var init = typeof candidate.toJSON === 'function' ? candidate.toJSON() : candidate;
    if (!init || typeof init.candidate !== 'string' || init.candidate.length > 1500 || !CANDIDATE_LINE.test(init.candidate)) return;
    var mid = typeof init.sdpMid === 'string' && init.sdpMid.length <= 64 ? init.sdpMid : null;
    var index = typeof init.sdpMLineIndex === 'number' && init.sdpMLineIndex >= 0 && init.sdpMLineIndex <= 16 ? init.sdpMLineIndex : null;
    if (mid === null && index === null) return;
    call.out.push({ candidate: init.candidate, sdpMid: mid, sdpMLineIndex: index, usernameFragment: typeof init.usernameFragment === 'string' && init.usernameFragment.length <= 256 ? init.usernameFragment : null });
    scheduleFlush(call);
  }
  function scheduleFlush(call, delay) {
    if (cur !== call || !call.answered || call.flushTimer || !call.out.length) return;
    call.flushTimer = setTimeout(function () { call.flushTimer = 0; flush(call); }, delay || 120);
  }
  function flush(call) {
    if (cur !== call || !call.answered || call.flushing || !call.out.length) return;
    var batch = call.out.splice(0, 20);
    call.flushing = true;
    post('signal', { id: call.id, candidates: batch }).then(function (result) {
      call.flushing = false;
      if (cur !== call) return;
      if (result.status === 409) { finish('taken', true); return; }
      if (result.status >= 500 || result.status === 429) { requeue(call, batch); return; }
      if (result.data && result.data.ended) pollSoon();                           // the call is already over: let the poll say why
      scheduleFlush(call);
    }, function () {
      call.flushing = false;
      if (cur === call) requeue(call, batch);
    });
  }
  function requeue(call, batch) {
    if (++call.signalFails > 10) return;                                           // media may still connect through the candidates already sent
    call.out = batch.concat(call.out);
    scheduleFlush(call, 700);
  }

  /* ---------- the audio connection ---------- */
  function peerChanged(call) {
    if (cur !== call || !call.pc) return;
    var state = call.pc.connectionState || '', ice = call.pc.iceConnectionState || '';
    var connected = state ? state === 'connected' : (ice === 'connected' || ice === 'completed');
    if (connected) {
      clearTimeout(call.discTimer); call.discTimer = 0;
      if (call.phase === 'connecting') becomeActive(call);
      return;
    }
    if (state === 'failed' || ice === 'failed') { fail(call, call.phase === 'active' ? 'lost' : 'failed'); return; }
    if ((state === 'disconnected' || ice === 'disconnected') && !call.discTimer) {
      call.discTimer = setTimeout(function () {
        call.discTimer = 0;
        if (cur === call && call.pc) {
          var s = call.pc.connectionState || '', i = call.pc.iceConnectionState || '';
          if (s ? s !== 'connected' : (i !== 'connected' && i !== 'completed')) fail(call, 'lost');
        }
      }, DISCONNECT_GRACE_MS);
    }
  }
  function becomeActive(call) {
    clearTimeout(call.connectTimer); call.connectTimer = 0;
    call.phase = 'active';
    call.started = Date.now();
    setView('active');
    setText(el.timer, formatTime(0));
    post('connected', { id: call.id }).then(function (result) { if (cur === call && result.status === 409) finish('taken', true); }, noop);
    if (!call.track) reportListenOnly(call);
    playRemote();
  }
  /* A screen with no microphone tells the teacher so, in the same way as a muted one (the teacher's page shows "the board's microphone is off"). */
  function reportListenOnly(call) {
    if (cur === call && call.phase === 'active') post('mute', { id: call.id, muted: true }).then(noop, noop);
  }

  /* ---------- ending ---------- */
  function sendEnd(call, keepalive) {
    var action = call.phase === 'ringing' ? 'decline' : 'hangup', tries = 0;
    (function go() {
      tries++;
      post(action, { id: call.id }, keepalive).then(function (result) {
        if (result.status >= 500 && tries < 3 && !keepalive) setTimeout(go, 700);
      }, function () {
        if (tries < 3 && !keepalive) setTimeout(go, 700);
      });
    })();
  }
  function fail(call, reason) {
    if (cur !== call) return;
    sendEnd(call, false);
    finish(reason);
  }
  function teardown(call) {
    clearTimeout(call.ringTimer); clearTimeout(call.connectTimer); clearTimeout(call.discTimer); clearTimeout(call.flushTimer);
    if (ringOwner === call) stopRing();
    var pc = call.pc;
    call.pc = null;
    if (pc) {
      pc.onicecandidate = pc.ontrack = pc.onconnectionstatechange = pc.oniceconnectionstatechange = null;
      try { pc.close(); } catch (_) {}
    }
    stopStream(call.stream);                                 // the microphone is released on every way out
    call.stream = null; call.track = null; call.remote = null;
    call.out = []; call.pendingRemote = [];
    try { el.remote.pause(); } catch (_) {}
    el.remote.srcObject = null;
    el.remote.removeAttribute('src');
  }
  /* Every way a call can end (teacher hung up, this screen hung up, error, lost) comes through here. */
  function finish(reason, quiet) {
    var call = cur;
    if (!call) return;
    cur = null;
    handled[call.id] = true;
    soundBlocked = false;
    teardown(call);
    releaseClaim(call.id);
    clearTimeout(hideTimer);
    if (quiet) { hide(); return; }
    view.state = 'ended'; view.reason = reason || 'generic';
    render();
    show();
    startTick();
    hideTimer = setTimeout(hide, ENDED_SHOW_MS);
  }

  el.hangup.addEventListener('click', function () {
    var call = cur;
    if (!call) return;
    sendEnd(call, false);
    finish(null, true);
  });
  el.mute.addEventListener('click', function () {
    var call = cur;
    if (!call || !call.track) return;
    call.muted = !call.muted;
    call.track.enabled = !call.muted;
    render();
    post('mute', { id: call.id, muted: call.muted }).then(noop, noop);
  });
  // The person closing the tab must not leave the teacher listening to nothing.
  window.addEventListener('pagehide', function () {
    var call = cur;
    if (!call) return;
    sendEnd(call, true);
    cur = null;
    teardown(call);
    releaseClaim(call.id);
  });

  /* ---------- on / off ---------- */
  function setEnabled(on, user) {
    if (on) {
      if (user) { prime(); askMicOnce(); }                   // inside the tap that switched listening on
      if (enabled) return;
      enabled = true;
      ringElement();                                          // preload the ringtone
      watchPermission();
      schedule(0);
    } else {
      if (!enabled) return;
      enabled = false;
      clearTimeout(pollTimer); pollTimer = 0;
      var call = cur;
      if (call) { sendEnd(call, false); finish(null, true); }
      else if (view.state !== 'idle') hide();
    }
  }
  document.addEventListener('c122:intercom-enabled', function (event) {
    var detail = event && event.detail || {};
    if (typeof detail.listenerId === 'string' && /^[a-f0-9]{8,32}$/.test(detail.listenerId)) listenerId = detail.listenerId;
    setEnabled(!!detail.enabled, !!detail.user);
  });
  window.addEventListener('storage', function (event) {
    if (event.key === KEY_ON) setEnabled(event.newValue === '1', false);
    else if (event.key === KEY_ID && /^[a-f0-9]{8,32}$/.test(event.newValue || '')) listenerId = event.newValue;
  });

  tabId = randomId();
  listenerId = read(KEY_ID) || '';
  render();
  if (read(KEY_ON) === '1') setEnabled(true, false);
})();

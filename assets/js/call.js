/*
 * CALL (admin): the teacher rings the classroom board and both talk (audio only, WebRTC).
 * Signaling goes through call.php (polling); the audio itself never touches the server.
 * States: idle -> preparing -> ringing -> connecting -> active -> ended (reason shown 4 s) -> idle.
 */
(function () {
  'use strict';
  var C = window.C122;
  var card = document.getElementById('callCard');
  if (!C || !card || !C.state || !C.state.admin) return;

  var API = 'call.php';
  var shared = window.C122Admin = window.C122Admin || {};
  var el = function (id) { return document.getElementById(id); };
  var startBtn = el('callStart'), cancelBtn = el('callCancel'), muteBtn = el('callMute'), speakerBtn = el('callSpeaker');
  var hangBtn = el('callHangup'), unlockBtn = el('callUnlock');
  var boardsEl = el('callBoards'), statusEl = el('callStatus'), timerEl = el('callTimer'), hintEl = el('callHint');
  var errorEl = el('callError'), audioEl = el('callAudio'), avatarEl = el('callAvatar');
  var levelsEl = el('callLevels'), micMeterEl = el('callMicMeter'), heardMeterEl = el('callHeardMeter');
  var micLabelEl = el('callMicLabel'), heardLabelEl = el('callHeardLabel');

  var POLL_FAST = 700, POLL_SLOW = 2000;       // ringing/connecting vs active
  var ENDED_SHOW = 4000;                       // how long the reason stays on screen
  var STATUS_EVERY = 5000;
  var LOST_AFTER = 25000;                      // polls failing this long: give up (the server ends it at 20 s anyway)
  var METER_BARS = 12;
  var CANCELLED = { cancelled: true };         // sentinel: an async step noticed the user cancelled meanwhile

  var state = 'idle';                          // idle | preparing | ringing | connecting | active | ended
  var session = 0;                             // bumped by every start and teardown: callbacks of an older one do nothing
  var cur = null;                              // the call this page owns
  var info = null;                             // newest answer of GET status while idle: { boards, micBoards, call, turn }
  var endedReason = '', endedLine = '', endedTone = '';
  var statusTimer = 0, tickTimer = 0, endTimer = 0, wakeLock = null;
  var netWeak = false, speakerOff = false, audioBlocked = false, remoteMuted = false, loadedOnce = false, statusFailed = '';
  var audioCtx = null, meterRaf = 0, meters = [];
  var errorLine = null;                        // { key, fallback } of the line under the buttons, redrawn on language change

  function T(key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  }
  function noop() {}
  /* Live regions announce every text change: only write when the words really changed. */
  function setText(node, text) { if (node.textContent !== text) node.textContent = text; }
  function stopStream(stream) {
    if (stream) stream.getTracks().forEach(function (track) { try { track.stop(); } catch (_) {} });
  }
  function safe(fn) { try { return fn(); } catch (_) { return undefined; } }
  function clock(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    return Math.floor(seconds / 60) + ':' + ('0' + (seconds % 60)).slice(-2);
  }
  function live() { return state === 'preparing' || state === 'ringing' || state === 'connecting' || state === 'active'; }
  function orphan() { return !!(info && info.call && info.call.state !== 'ended' && !cur); }

  /* ---------- server calls ---------- */
  function api(method, action, query, body, options) {
    options = options || {};
    var init = { method: method, credentials: 'same-origin', cache: 'no-store', headers: {} };
    if (method === 'POST') {
      init.headers['X-CSRF'] = C.state.csrf || '';
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body || {});
    }
    var controller = window.AbortController ? new AbortController() : null;
    var timer = 0;
    if (options.keepalive) init.keepalive = true;
    else if (controller) { init.signal = controller.signal; timer = setTimeout(function () { controller.abort(); }, options.timeout || 12000); }
    return fetch(API + '?action=' + action + (query || ''), init).then(function (response) {
      return response.text().then(function (text) {
        var data = null;
        try { data = JSON.parse(text); } catch (_) {}
        if (!response.ok || !data || data.ok === false) {
          var failure = new Error((data && data.error) || ('HTTP ' + response.status));
          failure.status = response.status;
          failure.code = (data && data.code) || '';
          failure.server = true;
          throw failure;
        }
        return data;
      });
    }, function () {
      var failure = new Error('network');
      failure.code = 'network';
      throw failure;
    }).then(function (data) { clearTimeout(timer); return data; }, function (error) { clearTimeout(timer); throw error; });
  }
  var ERRORS = {
    no_board: ['call.errNoBoard', 'Одоогоор холбогдсон самбар алга. Самбар дээр сайтыг нээж «Intercom сонсох» товчийг дарна уу.'],
    busy: ['call.errBusy', 'Өөр дуудлага явагдаж байна. Дуусахыг хүлээнэ үү.'],
    rate_limited: ['call.errRate', 'Хэт олон удаа дуудлаа. Нэг минут хүлээгээд дахин оролдоно уу.'],
    csrf: ['call.errAuth', 'Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.'],
    teacher_required: ['call.errAuth', 'Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.'],
    network: ['call.errNetwork', 'Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоно уу.'],
    storage_unavailable: ['call.errServer', 'Серверийн алдаа. Түр хүлээгээд дахин оролдоно уу.'],
    server_error: ['call.errServer', 'Серверийн алдаа. Түр хүлээгээд дахин оролдоно уу.']
  };
  function errorPair(error) {
    var code = error && error.code;
    if (code && ERRORS[code]) return ERRORS[code];
    if (error && error.micName) return micPair(error);
    return ['call.errGeneric', 'Дуудлага эхлүүлж чадсангүй. Дахин оролдоно уу.'];
  }
  function micPair(error) {
    var name = error && error.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return ['intercom.micDenied', 'Микрофоны зөвшөөрөл олгогдсонгүй. Хөтчийн хаягийн мөрөөс микрофоныг зөвшөөрч дахин оролдоно уу.'];
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return ['intercom.micMissing', 'Микрофон олдсонгүй.'];
    if (name === 'NotReadableError' || name === 'AbortError') return ['intercom.micBusy', 'Микрофоныг өөр програм ашиглаж байна.'];
    return ['intercom.micFailed', 'Микрофоныг нээж чадсангүй.'];
  }

  /* ---------- rendering ---------- */
  function setErrorLine(pair) { errorLine = pair || null; paintError(); }
  function paintError() { setText(errorEl, errorLine ? T(errorLine[0], errorLine[1]) : ''); }

  var END_TEXT = {
    cancelled: ['call.end.cancelled', 'Дуудлагыг цуцаллаа.'],
    declined: ['call.end.declined', 'Самбар дуудлагаас татгалзлаа.'],
    missed: ['call.end.missed', 'Самбар хариулсангүй.'],
    hangup_teacher: ['call.end.done', 'Дуудлага дууслаа.'],
    hangup_board: ['call.end.board', 'Самбар дуудлагыг таслалаа.'],
    failed: ['call.end.failed', 'Холболт тогтоогдсонгүй. Дахин оролдоно уу.'],
    lost: ['call.end.lost', 'Холболт тасарлаа.'],
    taken: ['call.end.taken', 'Өөр самбар дуудлагад хариулсан.'],
    timeout: ['call.end.timeout', 'Дуудлага 30 минутын дээд хугацаандаа хүрч дууслаа.']
  };
  var BAD_END = { declined: 1, missed: 1, failed: 1, lost: 1, timeout: 1 };
  function endText() {
    var pair = END_TEXT[endedReason] || END_TEXT.hangup_teacher;
    var text = T(pair[0], pair[1]);
    if (endedReason === 'failed' && info && info.turn === false) text += ' ' + T('call.end.failedTurn', 'Самбар өөр сүлжээнд байвал TURN сервер (шууд камерын тохиргоотой ижил) шаардлагатай.');
    if (endedLine) text += ' · ' + endedLine;
    return text;
  }
  function boardsText() {
    if (statusFailed) return [T(statusFailed === 'auth' ? 'call.errAuth' : 'call.errNetwork', statusFailed === 'auth' ? 'Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.' : 'Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоно уу.'), 'off'];
    if (!loadedOnce) return [T('call.boardsChecking', 'Самбарын төлөвийг шалгаж байна…'), 'wait'];
    if (!info || !info.boards) return [T('call.boardsNone', 'Холбогдсон самбар алга'), 'off'];
    var text = T('call.boardsCount', '{count} самбар холбогдсон', { count: info.boards });
    var silent = info.boards - (info.micBoards || 0);
    if (silent > 0) text += T('call.boardsNoMic', ' · {count} самбарт микрофон зөвшөөрөөгүй', { count: silent });
    return [text, 'on'];
  }
  function canStart() {
    return (state === 'idle' || state === 'ended') && loadedOnce && !statusFailed && !!(info && info.boards) && !orphan();
  }
  function statusLine() {
    if (state === 'preparing') return T('call.prepare', 'Микрофон, холболтыг бэлдэж байна…');
    if (state === 'ringing') return T('call.ringing', 'Самбар дуугарч байна…');
    if (state === 'connecting') return T('call.connecting', 'Холбогдож байна…');
    if (state === 'active') return netWeak ? T('call.netWeak', 'Холболт тогтворгүй байна…') : T('call.active', 'Самбартай холбогдлоо. Ярьж болно.');
    if (state === 'ended') return endText();
    if (orphan()) return T('call.orphan', 'Өмнөх дуудлага үргэлжилсээр байна. Таслаад шинээр дуудна уу.');
    if (!loadedOnce) return T('call.boardsChecking', 'Самбарын төлөвийг шалгаж байна…');
    if (info && info.boards) return T('call.idle', 'Бэлэн. ДУУДЛАГА ХИЙХ товчийг дарна уу.');
    return T('call.boardsHint', 'Самбар дээр сайтыг нээж «Intercom сонсох» товчийг дарна уу.');
  }
  function render() {
    var hadFocus = card.contains(document.activeElement) && document.activeElement.tagName === 'BUTTON';
    card.setAttribute('data-state', state);
    card.setAttribute('data-tone', state === 'ended' ? (BAD_END[endedReason] ? 'bad' : 'ok') : (netWeak ? 'warn' : ''));
    startBtn.hidden = !(state === 'idle' || state === 'ended');
    startBtn.disabled = !canStart();
    cancelBtn.hidden = !(state === 'preparing' || state === 'ringing' || state === 'connecting');
    muteBtn.hidden = speakerBtn.hidden = state !== 'active';
    hangBtn.hidden = !(state === 'active' || (state === 'idle' && orphan()));
    unlockBtn.hidden = !(state === 'active' && audioBlocked);
    levelsEl.hidden = state !== 'active';
    timerEl.hidden = !(state === 'ringing' || state === 'connecting' || state === 'active');
    var board = boardsText();
    boardsEl.setAttribute('data-on', board[1]);
    setText(boardsEl.querySelector('span'), board[0]);
    setText(statusEl, statusLine());
    var muted = !!(cur && cur.muted);
    muteBtn.setAttribute('aria-pressed', String(muted));
    muteBtn.classList.toggle('is-on', muted);
    setText(muteBtn.querySelector('span'), muted ? T('call.muteOff', 'Микрофон нээх') : T('call.muteOn', 'Микрофон хаах'));
    muteBtn.querySelector('use').setAttribute('href', muted ? '#i-mic-off' : '#i-mic');
    speakerBtn.setAttribute('aria-pressed', String(speakerOff));
    speakerBtn.classList.toggle('is-on', speakerOff);
    setText(speakerBtn.querySelector('span'), speakerOff ? T('call.spkOn', 'Самбарын дууг нээх') : T('call.spkOff', 'Самбарын дууг хаах'));
    var hint = '';
    if (state === 'active' && muted) hint = T('call.youMuted', 'Таны микрофон хаалттай байна. Самбар таныг сонсохгүй.');
    else if (state === 'active' && remoteMuted) hint = T('call.remoteMuted', 'Самбарын микрофон хаалттай байна.');
    hintEl.hidden = !hint;
    setText(hintEl.querySelector('span'), hint);
    if (micLabelEl) setText(micLabelEl, T('call.micLabel', 'Таны микрофон'));
    if (heardLabelEl) setText(heardLabelEl, T('call.heardLabel', 'Самбарын дуу'));
    paintTimer();
    paintError();
    // The button that had focus may just have been hidden (Start -> Cancel -> Hang up): keep keyboard users on a live control.
    if (hadFocus && (document.activeElement === document.body || document.activeElement === null)) {
      var next = [cancelBtn, hangBtn, startBtn, muteBtn].filter(function (button) { return !button.hidden && !button.disabled; })[0];
      if (next) next.focus();
    }
  }
  function setState(next) {
    state = next;
    if (next !== 'ended') { endedReason = ''; endedLine = ''; }
    if (next !== 'active') { netWeak = false; remoteMuted = false; audioBlocked = false; }
    render();
  }
  function paintTimer() {
    if (!cur) { setText(timerEl, '0:00'); return; }
    if (state === 'active' && cur.startedAt) setText(timerEl, clock((Date.now() - cur.startedAt) / 1000));
    else if (cur.ringAt) setText(timerEl, clock((Date.now() - cur.ringAt) / 1000));
  }
  function startTick() {
    stopTick();
    tickTimer = setInterval(paintTimer, 500);
  }
  function stopTick() { clearInterval(tickTimer); tickTimer = 0; }

  /* ---------- screen wake lock: a phone must not fall asleep in the middle of a call ---------- */
  function wake(on) {
    safe(function () {
      if (on) {
        if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (lock) { wakeLock = lock; lock.addEventListener('release', function () { wakeLock = null; }); }, noop);
      } else if (wakeLock) { wakeLock.release(); wakeLock = null; }
    });
  }

  /* ---------- level meters (Web Audio) ---------- */
  function ensureAudioContext() {
    if (audioCtx) { if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume().catch(noop); return; }
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    safe(function () { audioCtx = new Ctx(); });
  }
  function buildBars(host) {
    if (host.childNodes.length) return;
    for (var i = 0; i < METER_BARS; i++) host.appendChild(document.createElement('i'));
  }
  function addMeter(stream, host, onLevel) {
    if (!audioCtx || !stream || !stream.getAudioTracks().length) return;
    safe(function () {
      buildBars(host);
      var source = audioCtx.createMediaStreamSource(stream);
      var analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      meters.push({ source: source, analyser: analyser, data: new Uint8Array(analyser.fftSize), host: host, bars: host.childNodes, shown: 0, lit: -1, onLevel: onLevel });
    });
    if (meters.length && !meterRaf) meterFrame();
  }
  function meterFrame() {
    if (!meters.length) { meterRaf = 0; return; }
    meterRaf = requestAnimationFrame(meterFrame);
    for (var m = 0; m < meters.length; m++) {
      var meter = meters[m], sum = 0;
      meter.analyser.getByteTimeDomainData(meter.data);
      for (var i = 0; i < meter.data.length; i++) { var v = (meter.data[i] - 128) / 128; sum += v * v; }
      var level = Math.min(1, Math.sqrt(Math.sqrt(sum / meter.data.length)) * 1.45);
      meter.shown = Math.max(level, meter.shown - 0.05);
      var lit = Math.round(meter.shown * METER_BARS);
      if (lit !== meter.lit) {
        for (var b = 0; b < meter.bars.length; b++) meter.bars[b].className = b < lit ? 'on' : '';
        meter.lit = lit;
      }
      if (meter.onLevel) meter.onLevel(meter.shown);
    }
  }
  function clearMeters() {
    meters.forEach(function (meter) { safe(function () { meter.source.disconnect(); }); for (var b = 0; b < meter.bars.length; b++) meter.bars[b].className = ''; });
    meters = [];
    if (meterRaf) cancelAnimationFrame(meterRaf);
    meterRaf = 0;
    avatarEl.classList.remove('is-speaking');
  }

  /* ---------- starting a call ---------- */
  function newCall(token) {
    return { token: token, id: '', pc: null, stream: null, track: null, remote: null, cursor: 0, answerApplied: false, remoteReady: false, pendingRemote: [],
      out: [], flushing: false, flushFails: 0, flushTimer: 0, pollTimer: 0, polling: false, lastOk: Date.now(), startedAt: 0, ringAt: 0, muted: false,
      connectedSent: false, discTimer: 0, turn: true, serverSkew: 0 };
  }
  function toInit(candidate) {
    return { candidate: candidate.candidate, sdpMid: candidate.sdpMid, sdpMLineIndex: candidate.sdpMLineIndex, usernameFragment: candidate.usernameFragment || undefined };
  }
  function fail(error) {
    setState('idle');
    var pair = errorPair(error);
    setErrorLine(pair);
    if (error && error.code === 'no_board') refreshStatus();
    if (error && error.code === 'busy') refreshStatus();
  }
  function startCall() {
    if (state !== 'idle' && state !== 'ended') return;
    clearTimeout(endTimer);
    setErrorLine(null);
    if (shared.announceBusy && shared.announceBusy()) { setErrorLine(['call.announceBusy', 'Зарлал бичиж байна. Эхлээд түүнийг дуусгана уу.']); return; }
    if (!window.isSecureContext) { setErrorLine(['call.errInsecure', 'Дуудлага зөвхөн HTTPS холболтоор ажиллана.']); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection) { setErrorLine(['call.errUnsupported', 'Энэ хөтөч дуудлагыг дэмжихгүй байна. Chrome эсвэл Safari-ийн шинэ хувилбар ашиглана уу.']); return; }
    if (shared.stopPreview) shared.stopPreview();
    var token = ++session;
    var mine = cur = newCall(token);
    mine.ringAt = Date.now();
    ensureAudioContext();                                    // inside the click, so Safari lets the meters run later
    setState('preparing');
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      mine.stream = stream;
      if (token !== session) { stopStream(stream); throw CANCELLED; }       // cancelled while the permission prompt was open
      mine.track = stream.getAudioTracks()[0];
      if (!mine.track) { var none = new Error('no track'); none.name = 'NotFoundError'; none.micName = true; throw none; }
      return api('GET', 'status');
    }, function (error) {
      if (token === session) error.micName = true;
      throw error;
    }).then(function (status) {
      if (token !== session) throw CANCELLED;
      applyStatus(status);
      if (!status.boards) { var none = new Error('no board'); none.code = 'no_board'; throw none; }
      if (status.call && status.call.state !== 'ended') { var busy = new Error('busy'); busy.code = 'busy'; throw busy; }
      mine.turn = !status.ice || status.ice.turnConfigured !== false;
      return buildPeer(mine, status.ice);
    }).then(function (offer) {
      if (token !== session) throw CANCELLED;
      return api('POST', 'start', null, { offer: offer });
    }).then(function (result) {
      if (token !== session) {                               // cancelled while the request was in flight: hang the new call up again
        sendHangup(result.call.id, 2);
        throw CANCELLED;
      }
      mine.id = result.call.id;
      mine.ringAt = Date.now();
      mine.lastOk = Date.now();
      setState('ringing');
      startTick();
      wake(true);
      schedulePoll(mine, POLL_FAST);
      flushCandidates(mine);
    }).catch(function (error) {
      if (error === CANCELLED || token !== session) return;
      teardown();
      fail(error);
    });
  }
  function buildPeer(mine, ice) {
    var pc = new RTCPeerConnection({ iceServers: (ice && ice.iceServers) || [] });
    mine.pc = pc;
    mine.stream.getTracks().forEach(function (track) { pc.addTrack(track, mine.stream); });
    pc.onicecandidate = function (event) {
      if (cur !== mine || !event.candidate || !event.candidate.candidate) return;
      mine.out.push(toInit(event.candidate));
      scheduleFlush(mine, 120);
    };
    pc.ontrack = function (event) {
      if (cur !== mine) return;
      var remote = (event.streams && event.streams[0]) || new MediaStream([event.track]);
      mine.remote = remote;
      audioEl.srcObject = remote;
      playRemote();
      if (state === 'active') watchRemote(mine);
    };
    pc.onconnectionstatechange = function () { connectionChanged(mine); };
    pc.oniceconnectionstatechange = function () { connectionChanged(mine); };
    return pc.createOffer({ offerToReceiveAudio: true }).then(function (offer) { return pc.setLocalDescription(offer); }).then(function () {
      return { type: pc.localDescription.type, sdp: pc.localDescription.sdp };
    });
  }

  /* ---------- candidates we send (trickle ICE) ---------- */
  function scheduleFlush(mine, delay) {
    clearTimeout(mine.flushTimer);
    mine.flushTimer = setTimeout(function () { flushCandidates(mine); }, delay);
  }
  function flushCandidates(mine) {
    if (cur !== mine || !mine.id || mine.flushing || !mine.out.length) return;
    mine.flushing = true;
    var batch = mine.out.splice(0, 20);
    api('POST', 'signal', null, { id: mine.id, candidates: batch }).then(function () {
      mine.flushing = false;
      mine.flushFails = 0;
      if (mine.out.length) flushCandidates(mine);
    }, function (error) {
      mine.flushing = false;
      if (error && error.code === 'bad_candidate') { if (mine.out.length) flushCandidates(mine); return; }   // that batch is lost, the rest may still work
      if (++mine.flushFails <= 5) { mine.out = batch.concat(mine.out); scheduleFlush(mine, 800); }
    });
  }

  /* ---------- polling the server ---------- */
  function schedulePoll(mine, delay) {
    if (cur !== mine) return;
    clearTimeout(mine.pollTimer);
    mine.pollTimer = setTimeout(function () { pollOnce(mine); }, delay);
  }
  function pollOnce(mine) {
    if (cur !== mine || mine.polling || !live()) return;
    mine.polling = true;
    api('GET', 'poll', '&id=' + mine.id + '&since=' + mine.cursor, null, { timeout: 8000 }).then(function (data) {
      mine.polling = false;
      if (cur !== mine) return;
      mine.lastOk = Date.now();
      if (netWeak && state === 'active' && !(mine.pc && /disconnected|failed/.test(mine.pc.connectionState || ''))) { netWeak = false; render(); }
      try { handlePoll(mine, data); } catch (error) { if (window.console && console.error) console.error('[call] could not handle the server answer', error); }   // the next poll must still happen
    }, function (error) {
      mine.polling = false;
      if (cur !== mine) return;
      if (error && error.status === 403) { endCall('failed', false, ['call.errAuth', 'Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.']); return; }
      if (Date.now() - mine.lastOk > 6000 && !netWeak && state === 'active') { netWeak = true; render(); }
      if (Date.now() - mine.lastOk > LOST_AFTER) endCall('lost', true);
    }).then(function () {
      if (cur === mine && live() && !mine.polling) schedulePoll(mine, state === 'active' ? POLL_SLOW : POLL_FAST);
    });
  }
  function handlePoll(mine, data) {
    var call = data.call;
    if (typeof data.now === 'number') mine.serverSkew = data.now - Date.now() / 1000;
    if (!call) { endCall('lost', false); return; }
    if (call.state === 'ended') { endCall(call.endReason || 'hangup_teacher', false); return; }
    if (data.answer && !mine.answerApplied) {
      mine.answerApplied = true;
      applyAnswer(mine, data.answer);
    }
    if (data.candidates && data.candidates.length) data.candidates.forEach(function (row) { addRemoteCandidate(mine, row.c); });
    if (typeof data.cursor === 'number' && data.cursor > mine.cursor) mine.cursor = data.cursor;
    var changed = false;
    if ((call.boardMuted === true) !== remoteMuted) { remoteMuted = call.boardMuted === true; changed = true; }
    if (call.state === 'connecting' && state === 'ringing') { setState('connecting'); return; }
    if (call.state === 'active' && state !== 'active') { markActive(mine, call); return; }
    if (changed) render();
  }
  function applyAnswer(mine, answer) {
    var description = { type: 'answer', sdp: answer.sdp };
    if (state === 'ringing') setState('connecting');
    mine.pc.setRemoteDescription(window.RTCSessionDescription ? new RTCSessionDescription(description) : description).then(function () {
      if (cur !== mine) return;
      mine.remoteReady = true;
      var queued = mine.pendingRemote; mine.pendingRemote = [];
      queued.forEach(function (candidate) { addRemoteCandidate(mine, candidate); });
    }).catch(function () {
      if (cur === mine) endCall('failed', true);
    });
  }
  function addRemoteCandidate(mine, candidate) {
    if (!candidate || !candidate.candidate) return;
    if (!mine.remoteReady) { mine.pendingRemote.push(candidate); return; }
    safe(function () {
      mine.pc.addIceCandidate(window.RTCIceCandidate ? new RTCIceCandidate(candidate) : candidate).catch(noop);
    });
  }

  /* ---------- connection state ---------- */
  function connectionChanged(mine) {
    if (cur !== mine || !mine.pc) return;
    var cs = mine.pc.connectionState || '', ics = mine.pc.iceConnectionState || '';
    var connected = cs ? cs === 'connected' : (ics === 'connected' || ics === 'completed');
    var failed = cs === 'failed' || ics === 'failed';
    var disconnected = cs === 'disconnected' || (!cs && ics === 'disconnected');
    if (connected) {
      clearTimeout(mine.discTimer);
      if (netWeak) { netWeak = false; render(); }
      reportConnected(mine, 0);
    } else if (failed) {
      endCall(state === 'active' ? 'lost' : 'failed', true);
    } else if (disconnected && state === 'active' && !mine.discTimer) {
      netWeak = true; render();
      mine.discTimer = setTimeout(function () {
        mine.discTimer = 0;
        if (cur !== mine || !mine.pc) return;
        var now = mine.pc.connectionState || mine.pc.iceConnectionState;
        if (now !== 'connected' && now !== 'completed') endCall('lost', true);
      }, 8000);
    }
    if (connected) { clearTimeout(mine.discTimer); mine.discTimer = 0; }
  }
  function reportConnected(mine, attempt) {
    if (cur !== mine || mine.connectedSent || (mine.reporting && attempt === 0)) return;
    mine.reporting = true;
    api('POST', 'connected', null, { id: mine.id }).then(function () {
      mine.connectedSent = true;
      mine.reporting = false;
      if (cur === mine && state !== 'active') markActive(mine, null);
    }, function () {
      if (attempt < 5 && cur === mine) setTimeout(function () { reportConnected(mine, attempt + 1); }, 1000);
      else mine.reporting = false;
    });
  }
  function markActive(mine, call) {
    if (state === 'active') return;
    var elapsed = 0;
    if (call && call.answeredAt && mine.serverSkew !== undefined) elapsed = Math.max(0, Date.now() / 1000 + mine.serverSkew - call.answeredAt);
    mine.startedAt = Date.now() - elapsed * 1000;
    setState('active');
    if (!meters.length) {
      addMeter(mine.stream, micMeterEl);
      if (mine.remote) watchRemote(mine);
    }
    playRemote();
    startTick();
    schedulePoll(mine, POLL_SLOW);
  }
  function watchRemote(mine) {
    addMeter(mine.remote, heardMeterEl, function (level) { avatarEl.classList.toggle('is-speaking', level > 0.12); });
  }
  function playRemote() {
    audioEl.muted = speakerOff;
    var started = safe(function () { return audioEl.play(); });
    if (started && started.then) started.then(function () { if (audioBlocked) { audioBlocked = false; render(); } }, function () { audioBlocked = true; render(); });
  }

  /* ---------- ending ---------- */
  function sendHangup(id, tries, keepalive) {
    api('POST', 'hangup', null, { id: id }, { keepalive: !!keepalive }).catch(function () {
      if (tries > 1 && !keepalive) setTimeout(function () { sendHangup(id, tries - 1); }, 800);
    });
  }
  function teardown() {
    session++;
    var mine = cur;
    cur = null;
    stopTick();
    wake(false);
    clearMeters();
    if (mine) {
      clearTimeout(mine.pollTimer); clearTimeout(mine.flushTimer); clearTimeout(mine.discTimer);
      if (mine.pc) {
        mine.pc.onicecandidate = mine.pc.ontrack = mine.pc.onconnectionstatechange = mine.pc.oniceconnectionstatechange = null;
        safe(function () { mine.pc.close(); });
      }
      stopStream(mine.stream);
    }
    safe(function () { audioEl.pause(); audioEl.srcObject = null; });
    return mine;
  }
  /* Ends the call on this side; `notify` also tells the server (the other side learns it from there). */
  function endCall(reason, notify, line) {
    var mine = cur;
    var seconds = mine && mine.startedAt ? (Date.now() - mine.startedAt) / 1000 : 0;
    if (notify && mine && mine.id) sendHangup(mine.id, 2);
    teardown();
    clearTimeout(endTimer);
    endedReason = reason;
    endedLine = seconds >= 1 ? clock(seconds) : '';
    state = 'ended';
    netWeak = false; remoteMuted = false; audioBlocked = false;
    if (info) info.call = null;                              // the hang-up is on its way: do not show it as a call left over
    if (line) setErrorLine(line);
    render();
    endTimer = setTimeout(function () { if (state === 'ended') { setState('idle'); setErrorLine(null); refreshStatus(); } }, ENDED_SHOW);
    setTimeout(refreshStatus, 900);
  }
  function onCancelOrHangup() {
    if (cur) {
      var mine = cur;
      endCall(state === 'active' ? 'hangup_teacher' : 'cancelled', true);
      return mine;
    }
    if (orphan()) {                                          // a call from an earlier page load or another tab
      var id = info.call.id;
      sendHangup(id, 3);
      info.call = null;
      render();
      setTimeout(refreshStatus, 600);
    }
  }
  function toggleMute() {
    var mine = cur;
    if (!mine || state !== 'active') return;
    mine.muted = !mine.muted;
    if (mine.track) mine.track.enabled = !mine.muted;
    render();
    api('POST', 'mute', null, { id: mine.id, muted: mine.muted }).catch(function () {
      api('POST', 'mute', null, { id: mine.id, muted: mine.muted }).catch(noop);
    });
  }
  function toggleSpeaker() {
    speakerOff = !speakerOff;
    audioEl.muted = speakerOff;
    render();
  }

  /* ---------- who is online, while no call is running ---------- */
  function applyStatus(status) {
    statusFailed = '';
    loadedOnce = true;
    info = { boards: status.boards || 0, micBoards: status.micBoards || 0, call: status.call || null, turn: status.ice ? status.ice.turnConfigured !== false : true };
  }
  function refreshStatus() {
    if (live()) return Promise.resolve();
    return api('GET', 'status').then(function (status) {
      if (live()) return;
      applyStatus(status);
      render();
    }, function (error) {
      if (live()) return;
      statusFailed = error && error.status === 403 ? 'auth' : 'network';
      render();
    });
  }
  function statusLoop() {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { (document.hidden ? Promise.resolve() : refreshStatus()).then(statusLoop, statusLoop); }, STATUS_EVERY);
  }

  /* ---------- wiring ---------- */
  startBtn.addEventListener('click', startCall);
  cancelBtn.addEventListener('click', onCancelOrHangup);
  hangBtn.addEventListener('click', onCancelOrHangup);
  muteBtn.addEventListener('click', toggleMute);
  speakerBtn.addEventListener('click', toggleSpeaker);
  unlockBtn.addEventListener('click', playRemote);
  window.addEventListener('pagehide', function () {
    if (cur && cur.id && live()) sendHangup(cur.id, 1, true);          // keepalive fetch: it outlives the page
  });
  window.addEventListener('beforeunload', function (event) {
    if (live()) { event.preventDefault(); event.returnValue = ''; }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (live()) wake(true); else refreshStatus();
  });
  document.addEventListener('c122:language', render);

  shared.callBusy = function () { return live(); };
  render();
  refreshStatus().then(statusLoop, statusLoop);
})();

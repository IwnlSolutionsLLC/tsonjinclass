/* Intercom (admin): record the teacher's voice (optionally listen back first), then send it to the listening displays. */
(function () {
  'use strict';
  var C = window.C122;
  var button = document.getElementById('intercomBtn');
  if (!C || !button || !C.state || !C.state.admin) return;

  var shared = window.C122Admin = window.C122Admin || {};          // lets call.js and this file avoid fighting over the microphone
  var label = document.getElementById('intercomBtnLabel');
  var timerEl = document.getElementById('intercomTimer');
  var statusEl = document.getElementById('intercomStatus');
  var cancelButton = document.getElementById('intercomCancel');
  var badge = document.getElementById('intercomListeners');
  var recentEl = document.getElementById('intercomRecent');
  var clearButton = document.getElementById('intercomClear');
  var errorEl = document.getElementById('intercomError');
  var meterEl = document.getElementById('intercomMeter');
  var silentEl = document.getElementById('intercomSilent');
  var reviewBox = document.getElementById('intercomReview');
  var reviewTime = document.getElementById('intercomReviewTime');
  var reviewPlay = document.getElementById('intercomReviewPlay');
  var reviewSend = document.getElementById('intercomReviewSend');
  var reviewRedo = document.getElementById('intercomReviewRedo');
  var reviewDiscard = document.getElementById('intercomReviewDiscard');
  var reviewToggle = document.getElementById('intercomReviewToggle');
  var previewAll = document.getElementById('intercomPreviewAll');
  var previewAllLabel = document.getElementById('intercomPreviewAllLabel');
  var chimeWarn = document.getElementById('intercomChimeWarn');

  var MAX_SECONDS = 120;
  var MIN_SECONDS = 0.8;
  var METER_BARS = 24;
  var REVIEW_KEY = 'c122:intercom-review';
  var CHIME_DEFAULT = 'assets/audio/music.mp3';
  var phase = 'idle';                  // idle | starting | recording | review | sending
  var stream = null, recorder = null, chunks = [], startedAt = 0, sendOnStop = false;
  var tickTimer = 0, limitTimer = 0, statusTimer = 0;
  var pending = null;                  // { blob, seconds, url } while the teacher reviews a recording
  var lastData = null;                 // newest intercom.php?action=status answer
  var skew = 0;                        // server clock minus browser clock, in seconds
  var chimeUrl = CHIME_DEFAULT, chimeOk = true, chimeBroken = false;
  var said = null;                     // last status line, so it can be redrawn when the language changes
  var voiceCache = {};                 // item id -> Blob, for listening again without downloading again
  var player = null;                   // the sound that is playing now: { owner, stop }
  var rowsKey = '', rows = {};

  function T(key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  }
  function clock(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    return Math.floor(seconds / 60) + ':' + ('0' + (seconds % 60)).slice(-2);
  }
  function nowSeconds() { return Date.now() / 1000 + skew; }
  function safe(fn) { try { return fn(); } catch (_) { return undefined; } }
  /* Live regions announce every text change: only write when the words really changed. */
  function setText(node, text) { if (node.textContent !== text) node.textContent = text; }

  /* ---------- the review preference lives only in this browser ---------- */
  function readReview() { return !!safe(function () { return localStorage.getItem(REVIEW_KEY) === '1'; }); }
  function saveReview(on) { safe(function () { localStorage.setItem(REVIEW_KEY, on ? '1' : '0'); }); }
  function reviewOn() { return !!(reviewToggle && reviewToggle.checked); }

  /* ---------- status line ---------- */
  function paintSay() {
    if (!said) return;
    setText(statusEl, said.key ? T(said.key, said.fallback, said.params) : said.text);
    statusEl.classList.toggle('is-error', !!said.error);
  }
  function sayKey(key, fallback, params, isError) { said = { key: key, fallback: fallback, params: params, error: !!isError }; paintSay(); }
  function sayText(text, isError) { said = { text: text, error: !!isError }; paintSay(); }

  var ERRORS = {
    csrf: ['intercom.errAuth', 'Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.'],
    teacher_required: ['intercom.errAuth', 'Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.'],
    too_large: ['intercom.errTooLarge', 'Бичлэг хэт урт байна.'],
    unsupported_type: ['intercom.errType', 'Энэ дууны формат дэмжигдэхгүй байна.'],
    not_found: ['intercom.errGone', 'Бичлэг олдсонгүй. Жагсаалтыг шинэчиллээ.'],
    storage_unavailable: ['intercom.errServer', 'Серверийн алдаа. Түр хүлээгээд дахин оролдоно уу.']
  };
  function errorText(error, fallbackKey, fallback) {
    var known = error && ERRORS[error.code];
    if (known) return T(known[0], known[1]);
    if (error && error.network) return T('intercom.errNetwork', 'Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоно уу.');
    return fallbackKey ? T(fallbackKey, fallback) : ((error && error.message) || '');
  }

  /* ---------- tiny fetch helper: JSON in/out, errors carry the server's code ---------- */
  function api(url, options, timeoutMs) {
    options = options || {};
    options.credentials = 'same-origin';
    options.cache = 'no-store';
    options.headers = options.headers || {};
    var controller = window.AbortController ? new AbortController() : null;
    var timer = 0;
    if (controller) { options.signal = controller.signal; timer = setTimeout(function () { controller.abort(); }, timeoutMs || 15000); }
    return fetch(url, options).then(function (response) {
      return response.text().then(function (text) {
        var data = null;
        try { data = JSON.parse(text); } catch (_) {}
        if (!response.ok || !data || data.ok === false) {
          var failure = new Error((data && data.error) || ('Серверийн алдаа (' + response.status + ')'));
          failure.code = (data && data.code) || '';
          failure.status = response.status;
          throw failure;
        }
        return data;
      });
    }, function (error) {
      var failure = new Error(error && error.name === 'AbortError' ? 'timeout' : 'network');
      failure.network = true;
      failure.timeout = failure.message === 'timeout';
      throw failure;
    }).then(function (data) { clearTimeout(timer); return data; }, function (error) { clearTimeout(timer); throw error; });
  }
  function postJson(url, body) {
    return api(url, { method: 'POST', headers: { 'X-CSRF': C.state.csrf || '', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  /* ---------- phase ---------- */
  function setPhase(next) {
    phase = next;
    var recording = next === 'recording';
    button.setAttribute('aria-pressed', String(recording));
    button.classList.toggle('is-recording', recording);
    button.classList.toggle('is-busy', next === 'starting' || next === 'sending');
    button.disabled = next === 'starting' || next === 'sending' || next === 'review';   // while reviewing, the review buttons below are the way on
    label.textContent = recording ? (reviewOn() ? T('intercom.btnStop', 'ЗОГСООХ') : T('intercom.btnSend', 'ИЛГЭЭХ')) : 'INTERCOM';
    cancelButton.hidden = !recording;
    timerEl.classList.toggle('is-live', recording);
    reviewBox.hidden = next !== 'review' || !pending;
    reviewSend.disabled = reviewRedo.disabled = reviewDiscard.disabled = next === 'sending';
    previewAll.disabled = next === 'starting' || next === 'recording' || next === 'sending';
    reviewToggle.disabled = next === 'sending';
    if (!recording) timerEl.textContent = '0:00';
    if (!recording) meterStop();
    paintPlayers();
  }

  /* ---------- microphone level meter (Web Audio) ---------- */
  var audioCtx = null, meterRaf = 0, meterBars = [], analyser = null, meterData = null, meterShown = 0, meterLit = -1, loudSeen = false;
  function buildMeter() {
    if (!meterEl || meterBars.length) return;
    for (var i = 0; i < METER_BARS; i++) { var bar = document.createElement('i'); meterEl.appendChild(bar); meterBars.push(bar); }
  }
  function meterStart(media) {
    meterStop();
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || !meterEl) return;
    try {
      buildMeter();
      audioCtx = new Ctx();
      if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume().catch(function () {});
      var source = audioCtx.createMediaStreamSource(media);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      meterData = new Uint8Array(analyser.fftSize);
    } catch (_) { meterStop(); return; }
    meterShown = 0; meterLit = -1; loudSeen = false;
    meterEl.hidden = false;
    meterFrame();
  }
  function meterFrame() {
    if (!analyser) return;
    meterRaf = requestAnimationFrame(meterFrame);
    analyser.getByteTimeDomainData(meterData);
    var sum = 0;
    for (var i = 0; i < meterData.length; i++) { var v = (meterData[i] - 128) / 128; sum += v * v; }
    var level = Math.min(1, Math.sqrt(Math.sqrt(sum / meterData.length)) * 1.45);   // speech sits around the middle of the scale
    if (level > 0.2) loudSeen = true;
    meterShown = Math.max(level, meterShown - 0.045);
    var lit = Math.round(meterShown * METER_BARS);
    if (lit !== meterLit) {
      for (var b = 0; b < meterBars.length; b++) meterBars[b].className = b < lit ? 'on' : '';
      meterLit = lit;
    }
    // Nothing heard for the first 3 seconds: say so (only when the audio context really is running, otherwise the meter is just not working).
    var quiet = phase === 'recording' && Date.now() - startedAt > 3000 && !loudSeen && audioCtx && audioCtx.state === 'running';
    if (silentEl.hidden === !quiet) { silentEl.hidden = !quiet; if (quiet) silentEl.textContent = T('intercom.silent', 'Микрофоноос дуу сонсогдохгүй байна. Микрофоноо шалгана уу.'); }
  }
  function meterStop() {
    if (meterRaf) cancelAnimationFrame(meterRaf);
    meterRaf = 0; analyser = null; meterData = null;
    if (audioCtx) { var closing = audioCtx; audioCtx = null; safe(function () { closing.close(); }); }
    if (meterEl) { meterEl.hidden = true; for (var i = 0; i < meterBars.length; i++) meterBars[i].className = ''; }
    if (silentEl) silentEl.hidden = true;
  }

  /* ---------- playing sounds here (listen back, preview as the boards hear it) ---------- */
  function stopPlayer() {
    if (!player) return;
    var current = player;
    player = null;
    current.stop();
    paintPlayers();
  }
  /* parts: [{ kind: 'chime', url }, { kind: 'voice', blob }]; the chime may fail without stopping the voice. */
  function playParts(owner, parts, onPart) {
    stopPlayer();
    var index = 0, audio = null, urls = [], dead = false;
    var control = {
      owner: owner,
      stop: function () {
        dead = true;
        if (audio) { audio.onended = audio.onerror = null; safe(function () { audio.pause(); }); }
        urls.forEach(function (url) { URL.revokeObjectURL(url); });
      }
    };
    player = control;
    function finish() { if (player === control) { player = null; control.stop(); paintPlayers(); } }
    function next() {
      if (dead) return;
      if (index >= parts.length) { finish(); return; }
      var part = parts[index++], settled = false;
      var source = part.url;
      if (part.blob) { source = URL.createObjectURL(part.blob); urls.push(source); }
      var current = new Audio(source);
      audio = current;
      function advance() { if (settled || dead) return; settled = true; next(); }
      function failed(error) {
        if (settled || dead) return;
        if (part.kind === 'chime' && !(error && error.name === 'NotAllowedError')) { chimeBroken = true; paintChime(); advance(); return; }
        settled = true;
        finish();
        errorEl.textContent = T('intercom.previewFailed', 'Бичлэгийг тоглуулж чадсангүй.');
      }
      current.onended = function () { if (part.kind === 'chime' && chimeBroken) { chimeBroken = false; paintChime(); } advance(); };
      current.onerror = function () { failed(current.error); };
      if (onPart) onPart(part.kind);
      var started = current.play();
      if (started && started.catch) started.catch(failed);
    }
    paintPlayers();
    next();
    return control;
  }
  function owns(type, id) { return !!(player && player.owner.type === type && (id === undefined || player.owner.id === id)); }
  function fetchVoice(item) {
    if (voiceCache[item.id]) return Promise.resolve(voiceCache[item.id]);
    return fetch('intercom.php?action=audio&id=' + encodeURIComponent(item.id), { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('audio');
      return response.blob();
    }).then(function (blob) { voiceCache[item.id] = blob; return blob; });
  }
  function paintPlayers() {
    var reviewPlaying = owns('review'), allPlaying = owns('all');
    reviewPlay.querySelector('span').textContent = reviewPlaying ? T('intercom.stop', 'Зогсоох') : T('intercom.play', 'Сонсох');
    reviewPlay.setAttribute('aria-pressed', String(reviewPlaying));
    previewAllLabel.textContent = allPlaying ? T('intercom.stop', 'Зогсоох') : T('intercom.previewAll', 'Самбар дээр сонсогдох хэлбэрээр сонсох');
    previewAll.setAttribute('aria-pressed', String(allPlaying));
    previewAll.classList.toggle('is-playing', allPlaying);
    Object.keys(rows).forEach(function (id) {
      var play = rows[id].play, on = owns('row', id);
      play.querySelector('span').textContent = on ? T('intercom.stop', 'Зогсоох') : T('intercom.play', 'Сонсох');
      play.setAttribute('aria-pressed', String(on));
    });
  }
  function toggleRow(item) {
    if (owns('row', item.id)) { stopPlayer(); return; }
    errorEl.textContent = '';
    var owner = { type: 'row', id: item.id };
    stopPlayer();
    player = { owner: owner, stop: function () {} };            // marks the row busy while the file downloads
    var holder = player;
    paintPlayers();
    fetchVoice(item).then(function (blob) {
      if (player !== holder) return;
      player = null;
      playParts(owner, [{ kind: 'voice', blob: blob }]);
    }).catch(function () {
      if (player === holder) player = null;
      paintPlayers();
      errorEl.textContent = T('intercom.previewFailed', 'Бичлэгийг тоглуулж чадсангүй.');
    });
  }
  function toggleReview() {
    if (!pending) return;
    if (owns('review')) { stopPlayer(); return; }
    playParts({ type: 'review' }, [{ kind: 'voice', blob: pending.blob }]);
  }
  /* Exactly what a display does: the chime to its end, then the announcement. */
  function togglePreviewAll() {
    if (owns('all')) { stopPlayer(); return; }
    errorEl.textContent = '';
    var item = lastData && lastData.items && lastData.items.length ? lastData.items[0] : null;
    if (!pending && !item) { sayKey('intercom.previewNone', 'Сонсох бичлэг алга. Эхлээд зарлал бичнэ үү.', null, true); return; }
    var owner = { type: 'all' };
    stopPlayer();
    player = { owner: owner, stop: function () {} };
    var holder = player;
    paintPlayers();
    var source = pending ? Promise.resolve(pending.blob) : fetchVoice(item);
    source.then(function (blob) {
      if (player !== holder) return;
      player = null;
      var parts = [];
      if (chimeOk) parts.push({ kind: 'chime', url: chimeUrl });
      parts.push({ kind: 'voice', blob: blob });
      playParts(owner, parts, function (kind) {
        if (kind === 'chime') sayKey('intercom.previewChime', 'Дуудлагын хөгжим тоглож байна…');
        else sayKey('intercom.previewVoice', 'Зарлал тоглож байна…');
      });
    }).catch(function () {
      if (player === holder) player = null;
      paintPlayers();
      errorEl.textContent = T('intercom.previewFailed', 'Бичлэгийг тоглуулж чадсангүй.');
    });
  }

  /* ---------- recording ---------- */
  function micMessage(error) {
    var name = error && error.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return T('intercom.micDenied', 'Микрофоны зөвшөөрөл олгогдсонгүй. Хөтчийн хаягийн мөрөөс микрофоныг зөвшөөрч дахин оролдоно уу.');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return T('intercom.micMissing', 'Микрофон олдсонгүй.');
    if (name === 'NotReadableError' || name === 'AbortError') return T('intercom.micBusy', 'Микрофоныг өөр програм ашиглаж байна.');
    return (error && error.message) || T('intercom.micFailed', 'Микрофоныг нээж чадсангүй.');
  }
  function pickMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    var list = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  function releaseStream() {
    if (stream) stream.getTracks().forEach(function (track) { safe(function () { track.stop(); }); });
    stream = null;
  }
  function clearTimers() {
    clearInterval(tickTimer); clearTimeout(limitTimer);
    tickTimer = limitTimer = 0;
  }
  function recordingLine() {
    if (reviewOn()) sayKey('intercom.recordingReview', 'Бичиж байна… Ярьж дуусаад ЗОГСООХ товчийг дарж, илгээхээсээ өмнө сонсоно уу.');
    else sayKey('intercom.recording', 'Бичиж байна… Ярьж дуусаад INTERCOM товчийг дахин дарж илгээнэ үү.');
  }
  function start() {
    if (phase !== 'idle' && phase !== 'review') return;     // review is allowed: "record again" comes through here
    errorEl.textContent = '';
    if (shared.callBusy && shared.callBusy()) { sayKey('intercom.callBusy', 'Дуудлага явагдаж байна. Эхлээд дуудлагаа дуусгана уу.', null, true); return; }
    if (!window.isSecureContext) { sayKey('intercom.insecure', 'Микрофон зөвхөн HTTPS холболтоор ажиллана.', null, true); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { sayKey('intercom.unsupported', 'Энэ хөтөч дуу бичихийг дэмжихгүй байна. Chrome эсвэл Safari-ийн шинэ хувилбар ашиглана уу.', null, true); return; }
    stopPlayer();
    dropPending();
    setPhase('starting');
    sayKey('intercom.starting', 'Микрофоны зөвшөөрөл хүлээж байна…');
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (media) {
      stream = media;
      var mime = pickMime(), options = { audioBitsPerSecond: 48000 };
      if (mime) options.mimeType = mime;
      try { recorder = new MediaRecorder(stream, options); }
      catch (_) { recorder = new MediaRecorder(stream); }
      chunks = [];
      sendOnStop = false;
      recorder.ondataavailable = function (event) { if (event.data && event.data.size) chunks.push(event.data); };
      recorder.onerror = function () { sendOnStop = false; finishRecording(); sayKey('intercom.recorderFailed', 'Бичлэг амжилтгүй боллоо. Дахин оролдоно уу.', null, true); };
      recorder.onstop = finishRecording;
      recorder.start(250);
      startedAt = Date.now();
      setPhase('recording');
      recordingLine();
      meterStart(stream);
      tickTimer = setInterval(function () { timerEl.textContent = clock((Date.now() - startedAt) / 1000) + ' / ' + clock(MAX_SECONDS); }, 250);
      limitTimer = setTimeout(function () { sayKey('intercom.limit', 'Дээд хугацаа (2 минут) дууслаа. Илгээж байна…'); stopRecording(true); }, MAX_SECONDS * 1000);
    }).catch(function (error) {
      releaseStream();
      setPhase('idle');
      sayText(micMessage(error), true);
    });
  }
  function stopRecording(send) {
    if (!recorder || recorder.state === 'inactive') return;
    sendOnStop = send;
    clearTimers();
    try { recorder.stop(); } catch (_) { finishRecording(); }
  }
  function finishRecording() {
    if (!recorder) return;
    clearTimers();
    var seconds = (Date.now() - startedAt) / 1000;
    var type = (recorder && recorder.mimeType) || 'audio/webm';
    var blob = new Blob(chunks, { type: type });
    chunks = [];
    recorder = null;
    releaseStream();
    meterStop();
    if (!sendOnStop) { setPhase('idle'); sayKey('intercom.cancelled', 'Цуцаллаа. Юу ч илгээгээгүй.'); return; }
    sendOnStop = false;
    if (seconds < MIN_SECONDS || blob.size < 800) { setPhase('idle'); sayKey('intercom.tooShort', 'Хэт богино байна. Дахин товчийг дарж ярина уу.', null, true); return; }
    if (reviewOn()) { enterReview(blob, seconds); return; }
    upload(blob, seconds);
  }

  /* ---------- review before sending ---------- */
  function dropPending() {
    if (owns('review')) stopPlayer();
    if (pending) { URL.revokeObjectURL(pending.url); pending = null; }
  }
  function enterReview(blob, seconds) {
    dropPending();
    pending = { blob: blob, seconds: seconds, url: URL.createObjectURL(blob) };
    reviewTime.textContent = clock(seconds);
    setPhase('review');
    sayKey('intercom.reviewReady', 'Бичлэг бэлэн ({time}). Сонсоод илгээнэ үү.', { time: clock(seconds) });
    reviewPlay.focus();
  }
  function sendPending() {
    if (phase !== 'review' || !pending) return;
    var item = pending;
    stopPlayer();
    upload(item.blob, item.seconds, function () { dropPending(); });
  }
  function leaveReview(redo) {
    if (phase !== 'review') return;
    dropPending();
    setPhase('idle');
    if (redo) { start(); return; }
    sayKey('intercom.discarded', 'Бичлэгийг устгалаа. Юу ч илгээгээгүй.');
    button.focus();
  }

  /* ---------- sending ---------- */
  function upload(blob, seconds, done) {
    setPhase('sending');
    sayKey('intercom.sending', 'Илгээж байна…');
    api('intercom.php?action=send&duration=' + encodeURIComponent(seconds.toFixed(1)), {
      method: 'POST',
      headers: { 'X-CSRF': C.state.csrf || '', 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob
    }, 60000).then(function (data) {
      var wasReview = !!pending;
      if (done) done();
      setPhase('idle');
      if (wasReview) button.focus();
      if (data.listening > 0) sayKey('intercom.sent', 'Илгээгдлээ. {count} дэлгэц сонсож байна.', { count: data.listening });
      else sayKey('intercom.sentNone', 'Илгээгдлээ, гэхдээ одоогоор сонсож буй дэлгэц алга. 3 минутын дотор холбогдсон дэлгэц тоглуулна.');
      refresh();
    }).catch(function (error) {
      // A recording the teacher wanted to review stays available so it can be sent again.
      setPhase(pending ? 'review' : 'idle');
      if (error && error.timeout) sayKey('intercom.timeout', 'Илгээх хугацаа хэтэрлээ. Холболтоо шалгаад дахин оролдоно уу.', null, true);
      else sayText(errorText(error, 'intercom.sendFailed', 'Илгээж чадсангүй.'), true);
    });
  }
  function resend(item, trigger) {
    if (phase === 'starting' || phase === 'recording' || phase === 'sending') return;
    var count = lastData ? (lastData.listening || 0) : 0;
    var question = count
      ? T('intercom.resendConfirm', 'Энэ зарлалыг {count} дэлгэц дээр дахин тоглуулах уу?', { count: count })
      : T('intercom.resendConfirmNone', 'Одоогоор сонсож буй дэлгэц алга. Дахин илгээвэл 3 минутын дотор холбогдсон дэлгэц тоглуулна. Үргэлжлүүлэх үү?');
    if (!window.confirm(question)) return;
    errorEl.textContent = '';
    trigger.disabled = true;
    postJson('intercom.php?action=resend', { id: item.id }).then(function (data) {
      if (data.listening > 0) sayKey('intercom.resent', 'Дахин илгээгдлээ. {count} дэлгэц сонсож байна.', { count: data.listening });
      else sayKey('intercom.sentNone', 'Илгээгдлээ, гэхдээ одоогоор сонсож буй дэлгэц алга. 3 минутын дотор холбогдсон дэлгэц тоглуулна.');
      return refresh();
    }).catch(function (error) {
      errorEl.textContent = errorText(error, 'intercom.resendFailed', 'Дахин илгээж чадсангүй.');
      if (error && error.code === 'not_found') refresh();
    }).then(function () { trigger.disabled = false; });
  }

  /* ---------- status / history ---------- */
  function renderBadge(data) {
    var count = data ? (data.listening || 0) : 0, notReady = data ? Math.max(0, count - (data.ready || 0)) : 0;
    var text = count ? T('intercom.listeningCount', '{count} дэлгэц сонсож байна', { count: count }) : T('intercom.noListeners', 'Сонсож буй дэлгэц алга');
    if (count && notReady) text += T('intercom.notReady', ' · {count} дэлгэцэд дууг идэвхжүүлээгүй', { count: notReady });
    setText(badge.querySelector('span'), text);
    badge.classList.toggle('is-live', count > 0 && !notReady);
    badge.classList.toggle('is-warn', count > 0 && notReady > 0);
  }
  function paintChime() {
    var missing = !chimeOk || chimeBroken;
    chimeWarn.hidden = !missing;
    if (missing) chimeWarn.querySelector('span').textContent = T('intercom.chimeMissing', 'Дуудлагын хөгжмийн файл серверээс олдсонгүй тул зарлал хөгжимгүйгээр тоглоно. Администратор assets/audio/music.mp3 файлыг байршуулна уу.');
  }
  function ago(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    if (seconds < 45) return T('intercom.agoNow', 'дөнгөж сая');
    if (seconds < 3600) return T('intercom.agoMin', '{count} мин өмнө', { count: Math.max(1, Math.round(seconds / 60)) });
    if (seconds < 86400) return T('intercom.agoHour', '{count} цагийн өмнө', { count: Math.floor(seconds / 3600) });
    return T('intercom.agoDay', '{count} өдрийн өмнө', { count: Math.floor(seconds / 86400) });
  }
  function exactTime(at) {
    var options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    if (window.C122I18n && window.C122I18n.formatDate) return window.C122I18n.formatDate(at, options);
    return new Date(at * 1000).toLocaleString([], options);
  }
  function makeRow(item) {
    var row = document.createElement('li');
    row.className = 'intercom-item';
    var info = document.createElement('div');
    info.className = 'intercom-item-info';
    var when = document.createElement('time');
    when.className = 'intercom-item-when';
    var meta = document.createElement('span');
    meta.className = 'intercom-item-meta';
    info.appendChild(when); info.appendChild(meta);
    var actions = document.createElement('div');
    actions.className = 'intercom-item-actions';
    var play = document.createElement('button');
    play.type = 'button'; play.className = 'btn btn-ghost btn-sm'; play.setAttribute('data-act', 'play'); play.setAttribute('data-id', item.id);
    play.innerHTML = '<svg class="i i-sm" aria-hidden="true"><use href="#i-play"/></svg><span></span>';
    play.addEventListener('click', function () { toggleRow(item); });
    var again = document.createElement('button');
    again.type = 'button'; again.className = 'btn btn-ghost btn-sm'; again.setAttribute('data-act', 'resend'); again.setAttribute('data-id', item.id);
    again.innerHTML = '<svg class="i i-sm" aria-hidden="true"><use href="#i-send"/></svg><span></span>';
    again.addEventListener('click', function () { resend(item, again); });
    actions.appendChild(play); actions.appendChild(again);
    row.appendChild(info); row.appendChild(actions);
    return { el: row, when: when, meta: meta, play: play, again: again };
  }
  function paintRows(data) {
    var items = data.items || [];
    items.forEach(function (item, index) {
      var parts = rows[item.id];
      if (!parts) return;
      var age = nowSeconds() - item.at;
      parts.when.textContent = ago(age);
      parts.when.setAttribute('datetime', new Date(item.at * 1000).toISOString());
      parts.when.title = exactTime(item.at);
      var line = clock(item.duration || 0);
      if (index === 0) line += ' · ' + T('intercom.delivered', '{count} дэлгэцэнд тоглосон', { count: data.delivered || 0 });
      parts.meta.textContent = line;
      var when = ago(age);
      parts.play.setAttribute('aria-label', T('intercom.playAria', '{time} илгээсэн зарлалыг сонсох', { time: when }));
      parts.again.querySelector('span').textContent = T('intercom.resend', 'Дахин илгээх');
      parts.again.setAttribute('aria-label', T('intercom.resendAria', '{time} илгээсэн зарлалыг дахин илгээх', { time: when }));
    });
  }
  function emptyRow() {
    var li = document.createElement('li');
    li.className = 'intercom-empty';
    li.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-mic"/></svg><span></span>';
    li.querySelector('span').textContent = T('intercom.none', 'Одоогоор илгээсэн зарлал алга. Дээрх микрофон товчийг дарж эхний зарлалаа бичээрэй.');
    return li;
  }
  function renderRecent(data) {
    var items = data.items || [];
    clearButton.hidden = !items.length;
    var key = items.map(function (item) { return item.id; }).join(',');
    if (key !== rowsKey) {
      // The list really changed: rebuild it, and give keyboard focus back to the same control if it survived.
      var active = document.activeElement, act = active && active.getAttribute ? active.getAttribute('data-act') : null, actId = active && active.getAttribute ? active.getAttribute('data-id') : null;
      rowsKey = key; rows = {};
      recentEl.textContent = '';
      if (!items.length) recentEl.appendChild(emptyRow());
      items.forEach(function (item) { rows[item.id] = makeRow(item); recentEl.appendChild(rows[item.id].el); });
      Object.keys(voiceCache).forEach(function (id) { if (!rows[id]) delete voiceCache[id]; });
      if (act && actId && rows[actId]) (act === 'play' ? rows[actId].play : rows[actId].again).focus();
    } else if (!items.length) {
      var empty = recentEl.querySelector('.intercom-empty span');
      if (empty) empty.textContent = T('intercom.none', 'Одоогоор илгээсэн зарлал алга. Дээрх микрофон товчийг дарж эхний зарлалаа бичээрэй.');
    }
    paintRows(data);
    paintPlayers();
  }
  function applyStatus(data) {
    lastData = data;
    if (data.maxSeconds) MAX_SECONDS = data.maxSeconds;
    if (typeof data.now === 'number') skew = data.now - Date.now() / 1000;
    if (data.chime) chimeUrl = data.chime;
    chimeOk = data.chimeOk !== false;
    renderBadge(data);
    renderRecent(data);
    paintChime();
  }
  function refresh() {
    return api('intercom.php?action=status').then(applyStatus).catch(function () {});
  }
  function schedule() {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { (document.hidden ? Promise.resolve() : refresh()).then(schedule); }, 5000);
  }
  function rerender() {
    setPhase(phase);
    paintSay();
    renderBadge(lastData);
    if (lastData) { rowsKey = '\u0000'; renderRecent(lastData); } else { recentEl.textContent = ''; recentEl.appendChild(emptyRow()); }
    paintChime();
    reviewTime.textContent = pending ? clock(pending.seconds) : '0:00';
    if (phase === 'recording') recordingLine();
  }

  /* ---------- wiring ---------- */
  button.addEventListener('click', function () {
    if (phase === 'idle') start();
    else if (phase === 'recording') {
      if (reviewOn()) sayKey('intercom.stopping', 'Зогсоож байна…');
      else sayKey('intercom.sending', 'Илгээж байна…');
      stopRecording(true);
    }
  });
  cancelButton.addEventListener('click', function () { stopRecording(false); });
  reviewPlay.addEventListener('click', toggleReview);
  reviewSend.addEventListener('click', sendPending);
  reviewRedo.addEventListener('click', function () { leaveReview(true); });
  reviewDiscard.addEventListener('click', function () { leaveReview(false); });
  previewAll.addEventListener('click', togglePreviewAll);
  reviewToggle.addEventListener('change', function () {
    saveReview(reviewToggle.checked);
    setPhase(phase);
    if (phase === 'recording') recordingLine();
  });
  clearButton.addEventListener('click', function () {
    if (!window.confirm(T('intercom.confirmClear', 'Бүх зарлалыг серверээс устгах уу?'))) return;
    stopPlayer();
    postJson('intercom.php?action=clear', {})
      .then(function () { return refresh(); })
      .catch(function (error) { errorEl.textContent = errorText(error, 'intercom.clearFailed', 'Устгаж чадсангүй.'); });
  });
  window.addEventListener('beforeunload', function (event) {
    if (phase === 'recording' || phase === 'sending' || phase === 'review') { event.preventDefault(); event.returnValue = ''; }
  });
  document.addEventListener('c122:language', rerender);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });

  shared.announceBusy = function () { return phase === 'starting' || phase === 'recording'; };
  shared.stopPreview = stopPlayer;

  reviewToggle.checked = readReview();
  sayKey('intercom.idle', 'Бэлэн. INTERCOM товчийг дарж ярьж эхэлнэ үү.');
  rerender();
  refresh().then(schedule);
})();

/* The paired classroom display sends live camera + microphone to signed-in teachers. */
(function () {
  'use strict';
  var boot = window.C122_CCTV;
  if (!boot || !boot.apiUrl) return;
  var enrolled = false, csrf = '', stream = null, sessionId = '', cursor = 0, peers = new Map();
  var epoch = 0, starting = false, disposed = false, retryCount = 0, pollTimer = null, heartbeatTimer = null, statusTimer = null, statusFailures = 0;
  var preferenceKey = 'c122:cctv:device', deviceId = '', preference = null, captureRetryTimer = null, captureRetryCount = 0, statusInFlight = false, statusGeneration = 0, statusRequest = 0;
  var wakeLock = null, releaseDeviceLock = null, lockOwner = 0, manualPause = false, pairing = false, lastMessage = '', connectingEpoch = 0;
  var setup = document.getElementById('cctvDisplaySetup'), inlineSetup = document.getElementById('camera-setup'), panel = null, iceServers = [], iceExpiresAt = 0;
  var cameraIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="m16 10 5-3v10l-5-3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  try { manualPause = sessionStorage.getItem('c122:cctv:paused') === '1'; } catch (_) {}
  function readPreference() {
    try { var value = JSON.parse(localStorage.getItem(preferenceKey) || 'null'); if (value && typeof value.deviceId === 'string' && ['resume','paused'].indexOf(value.mode) !== -1) return value; } catch (_) {}
    return null;
  }
  function ownPreference() { return deviceId && preference && preference.deviceId === deviceId ? preference : null; }
  function writePreference(mode, media) {
    if (!deviceId) return; var previous = ownPreference() || {};
    preference = {deviceId:deviceId,mode:mode,videoId:previous.videoId || '',audioId:previous.audioId || ''};
    if (media) { ['video','audio'].forEach(function (kind) { var track = media.getTracks().find(function (item) { return item.kind === kind; }); if (track && track.getSettings) { var settings = track.getSettings(); if (settings.deviceId) preference[kind + 'Id'] = settings.deviceId; } }); }
    try { localStorage.setItem(preferenceKey, JSON.stringify(preference)); } catch (_) { /* Current tab remains usable when browser storage is unavailable. */ }
  }
  function forgetPreference() {
    if (ownPreference()) { try { localStorage.removeItem(preferenceKey); } catch (_) {} preference = null; }
  }
  preference = readPreference();

  function node(tag, className, text) {
    var item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }
  function button(label, action, className) {
    var item = node('button', className || 'cctv-display-button', label);
    item.type = 'button'; item.addEventListener('click', action); return item;
  }
  function savedPause(value) {
    manualPause = value;
    if (value) writePreference('paused');
    try { if (value) sessionStorage.setItem('c122:cctv:paused', '1'); else sessionStorage.removeItem('c122:cctv:paused'); } catch (_) {}
  }
  function errorText(error) {
    if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) return 'Камер, микрофоны зөвшөөрөл хаалттай байна. Chrome-ийн сайтын зөвшөөрлөөс хоёуланг нь Allow болгоод дахин эхлүүлнэ үү.';
    if (error && error.name === 'NotFoundError') return 'Камер эсвэл микрофон олдсонгүй. Хоёр төхөөрөмжийн холболтыг шалгаад дахин эхлүүлнэ үү.';
    if (error && (error.name === 'NotReadableError' || error.name === 'AbortError')) return 'Камер эсвэл микрофон өөр аппд ашиглагдаж байна, эсвэл төхөөрөмж салсан байна. Холболтыг шалгаад дахин эхлүүлнэ үү.';
    return error && error.message || 'Шууд холболт түр тасарлаа. Дахин оролдоно уу.';
  }
  function createUi() {
    if (setup) {
      panel = node('section', 'cctv-display-setup-panel');
      var heading = node('h2', '', 'Энэ том дэлгэцийн камер');
      var note = node('p', 'cctv-display-note', 'Камер болон микрофон зөвхөн энэ дэлгэц дээр ажиллана. Дүрс, дууг нэвтэрсэн багш шууд харна. Бичлэг хадгалахгүй. Эхлүүлсний дараа шинэчлэх, дахин нээхэд автоматаар холбогдоно; Зогсоох дарвал өөрөө дахин эхлүүлэх хүртэл унтраалттай байна.');
      var status = node('p', 'cctv-display-status', 'Дэлгэцийн холболтыг шалгаж байна…');
      status.setAttribute('aria-live', 'polite');
      var label = node('label', 'cctv-display-label', 'Дэлгэцийн нэр');
      var labelInput = node('input', 'cctv-display-label-input'); labelInput.type = 'text'; labelInput.id = 'cctvDisplayLabel'; labelInput.value = 'Анги 12-2 · том дэлгэц'; labelInput.maxLength = 80; labelInput.autocomplete = 'off';
      label.setAttribute('for', 'cctvDisplayLabel'); label.appendChild(labelInput);
      var actions = node('div', 'cctv-display-actions');
      var pair = button('Энэ дэлгэцийг холбох', pairDisplay, 'cctv-display-button cctv-display-primary'); pair.dataset.cctvPair = '';
      var start = button('Камер + микрофон эхлүүлэх', function () { startCapture(true); }, 'cctv-display-button cctv-display-primary'); start.dataset.cctvStart = '';
      var stop = button('Шууд дамжуулалтыг зогсоох', function () { stopCapture('Камер болон микрофон унтарлаа.', true); }, 'cctv-display-button cctv-display-stop'); stop.dataset.cctvStop = '';
      actions.appendChild(pair); actions.appendChild(start); actions.appendChild(stop);
      var preview = node('video', 'cctv-display-preview'); preview.autoplay = true; preview.muted = true; preview.playsInline = true;
      preview.setAttribute('aria-label', 'Энэ дэлгэцийн камерын дуугүй урьдчилсан дүрс');
      panel.appendChild(heading); panel.appendChild(note); panel.appendChild(status); panel.appendChild(label); panel.appendChild(actions); panel.appendChild(preview);
      setup.appendChild(panel);
      var loading = document.getElementById('cctvSetupLoading'); if (loading) loading.remove();
    }
    render();
  }
  function supported() { return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection && window.C122CCTVPeer); }
  function render(message) {
    if (message !== undefined) lastMessage = message;
    var live = !!stream, count = 0;
    peers.forEach(function (item) { if (item.state === 'connected') count++; });
    if (live && lastMessage.indexOf('Шууд · багш холбогдсон:') === 0) lastMessage = '';
    var status = lastMessage || (live ? 'Шууд · багш холбогдсон: ' + count : enrolled ? 'Холбогдсон · камер, микрофон унтраалттай' : 'Энэ төхөөрөмж хараахан холбогдоогүй байна.');
    var admin = isAdmin();
    if (inlineSetup) inlineSetup.hidden = !admin;
    document.querySelectorAll('[data-cctv-open-setup]').forEach(function (link) { link.hidden = !admin; });
    if (panel) {
      if (!inlineSetup) panel.hidden = !admin;
      panel.querySelector('.cctv-display-status').textContent = status;
      panel.querySelector('.cctv-display-label').hidden = enrolled;
      panel.querySelectorAll('[data-cctv-start]').forEach(function (item) { item.hidden = !enrolled || live; item.disabled = starting || !supported(); });
      panel.querySelectorAll('[data-cctv-stop]').forEach(function (item) { item.hidden = !live && !starting && !captureRetryTimer; item.disabled = false; });
      var pair = panel.querySelector('[data-cctv-pair]'); if (pair) { pair.hidden = enrolled; pair.disabled = pairing || !adminCsrf(); }
      var preview = panel.querySelector('video'); preview.hidden = !live;
      if (preview.srcObject !== stream) { preview.srcObject = stream; if (stream) preview.play().catch(function () {}); }
    }
    document.documentElement.classList.toggle('cctv-is-live', live);
  }
  function isAdmin() {
    if (window.C122 && window.C122.state && typeof window.C122.state.admin === 'boolean') return window.C122.state.admin;
    return !!boot.admin;
  }
  function adminCsrf() {
    if (window.C122 && window.C122.state && typeof window.C122.state.admin === 'boolean') return window.C122.state.admin ? window.C122.state.csrf || '' : '';
    return boot.admin ? boot.adminCsrf || '' : '';
  }
  function openSetup() {
    if (!inlineSetup) {
      if (boot.setupUrl && window.location && typeof window.location.assign === 'function') window.location.assign(boot.setupUrl);
      return;
    }
    if (!isAdmin()) {
      if (window.C122 && typeof window.C122.login === 'function') window.C122.login().then(function (result) { if (result) openSetup(); });
      return;
    }
    render(); inlineSetup.open = true;
    if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#camera-setup');
    setTimeout(function () { if (inlineSetup.scrollIntoView) inlineSetup.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 25);
  }
  async function api(action, options) {
    options = options || {};
    var url = boot.apiUrl + '?action=' + encodeURIComponent(action);
    Object.keys(options.query || {}).forEach(function (key) { url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(options.query[key]); });
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 12000);
    var init = { method: options.body !== undefined ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: {}, signal: controller.signal };
    if (options.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.headers[options.admin ? 'X-CSRF' : 'X-CCTV-CSRF'] = options.admin ? adminCsrf() : csrf; init.body = JSON.stringify(options.body); }
    try {
      var response = await fetch(url, init), data = await response.json();
      if (!response.ok || !data || data.ok === false) {
        var error = new Error(data && data.error || 'Серверийн холболт түр тасарлаа.'); error.status = response.status; error.code = data && data.code || ''; error.retryAfter = data && data.retryAfter || 0; throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  }
  async function pairDisplay() {
    if (pairing || !adminCsrf()) return;
    pairing = true; render('Том дэлгэцийг холбож байна…');
    try {
      var labelInput = panel && panel.querySelector('#cctvDisplayLabel');
      var label = labelInput && labelInput.value.trim().replace(/\s+/g, ' ').slice(0, 80) || 'Анги 12-2 · том дэлгэц';
      var data = await api('pair', { admin: true, body: { label: label } });
      enrolled = !!data.enrolled; csrf = data.publisherCsrf || ''; deviceId = data.deviceId || '';
      savedPause(true); clearTimeout(captureRetryTimer); captureRetryTimer = null; captureRetryCount = 0; render('Дэлгэц холбогдлоо. Камер + микрофон эхлүүлэх товчийг дарж Chrome-д зөвшөөрөл өгнө үү.');
    } catch (error) { render(errorText(error)); }
    finally { pairing = false; render(); }
  }
  async function permissionState() {
    if (!navigator.permissions || !navigator.permissions.query) return 'unknown';
    try {
      var timer, queries = Promise.all([navigator.permissions.query({ name: 'camera' }), navigator.permissions.query({ name: 'microphone' })]);
      var results; try { results = await Promise.race([queries, new Promise(function (resolve) { timer = setTimeout(function () { resolve(null); }, 2000); })]); } finally { clearTimeout(timer); }
      if (!results) return 'unknown';
      if (results.some(function (permission) { return permission.state === 'denied'; })) return 'denied';
      if (results.some(function (permission) { return permission.state === 'prompt'; })) return 'prompt';
      return results.every(function (permission) { return permission.state === 'granted'; }) ? 'granted' : 'unknown';
    } catch (_) { return 'unknown'; }
  }
  function wantsResume() { var own = ownPreference(); return !!(own && own.mode === 'resume' && !manualPause); }
  function resumeCapture() { if (wantsResume() && !captureRetryTimer && !stream && !starting && !disposed) startCapture(false); }
  function scheduleCaptureRetry(error) {
    if (disposed || !enrolled || !wantsResume() || captureRetryTimer) { render(errorText(error)); return; }
    var delay = [2000,4000,8000,15000,30000][Math.min(captureRetryCount++,4)];
    var owner = deviceId;
    captureRetryTimer = setTimeout(function () { captureRetryTimer = null; if (!disposed && deviceId === owner && wantsResume()) startCapture(false); }, delay);
    render(errorText(error) + ' Автоматаар дахин холбогдоно · ' + Math.round(delay / 1000) + ' сек.');
  }
  async function claimDevice(current) {
    if (!navigator.locks || !navigator.locks.request) return true;
    return new Promise(function (resolve, reject) {
      navigator.locks.request('c122:classroom-camera', { ifAvailable: true }, function (lock) {
        if (!lock) { resolve(false); return; }
        return new Promise(function (release) { releaseDeviceLock = release; lockOwner = current; resolve(true); });
      }).catch(reject);
    });
  }
  function releaseLock(owner) { if (releaseDeviceLock && (!owner || owner === lockOwner)) { releaseDeviceLock(); releaseDeviceLock = null; lockOwner = 0; } }
  async function keepAwake() {
    if (!stream || disposed || document.visibilityState !== 'visible' || !navigator.wakeLock || wakeLock) return;
    try {
      var lock = await navigator.wakeLock.request('screen');
      if (!stream || disposed) { await lock.release(); return; }
      wakeLock = lock; lock.addEventListener('release', function () { if (wakeLock === lock) wakeLock = null; });
    } catch (_) { /* Capture still works if the device denies a wake lock. */ }
  }
  function releaseWakeLock() { if (wakeLock) { var lock = wakeLock; wakeLock = null; lock.release().catch(function () {}); } }
  async function startCapture(manual) {
    if (starting || stream || disposed || !enrolled || !csrf) return;
    if (!supported()) { render('HTTPS болон шинэ Chrome шаардлагатай. Камер, микрофон энэ браузерт ажиллахгүй байна.'); return; }
    if (!manual && !wantsResume()) return;
    clearTimeout(captureRetryTimer); captureRetryTimer = null;
    starting = true; if (manual) savedPause(false);
    var current = ++epoch, ownerDevice = deviceId, media = null;
    render('Камер болон микрофоныг холбож байна…');
    try {
      if (!manual) {
        var permission = await permissionState();
        if (current !== epoch || disposed || !enrolled || deviceId !== ownerDevice || !wantsResume()) return;
        if (permission === 'denied' || permission === 'prompt') { stopCapture('Chrome-д камер, микрофоны байнгын зөвшөөрөл өгөөд Эхлүүлэх дарна уу.', true); return; }
      }
      if (!await claimDevice(current)) { var occupied = new Error('Камер энэ төхөөрөмжийн өөр таб дээр ажиллаж байна.'); occupied.name = 'CameraBusyError'; throw occupied; }
      if (current !== epoch || disposed || !enrolled || deviceId !== ownerDevice) { releaseLock(current); return; }
      var own = ownPreference() || {}, videoOptions = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 20, max: 25 } }, audioOptions = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      if (!manual && own.videoId) videoOptions.deviceId = {ideal: own.videoId}; if (!manual && own.audioId) audioOptions.deviceId = {ideal: own.audioId};
      media = await navigator.mediaDevices.getUserMedia({ video: videoOptions, audio: audioOptions });
      if (current !== epoch || disposed || !enrolled || deviceId !== ownerDevice) { media.getTracks().forEach(function (track) { track.stop(); }); releaseLock(current); return; }
      if (!media.getVideoTracks().length || !media.getAudioTracks().length) throw new Error('Камер болон микрофон хоёулаа шаардлагатай.');
      stream = media; savedPause(false); writePreference('resume', media); captureRetryCount = 0;
      stream.getTracks().forEach(function (track) {
        track.addEventListener('ended', function () {
          if (current !== epoch || !stream) return;
          stopCapture('Камер эсвэл микрофон саллаа. Дахин холбогдохыг хүлээж байна.', false);
          scheduleCaptureRetry(Object.assign(new Error('Камер эсвэл микрофон салсан байна.'), {name:'NotFoundError'}));
        });
      });
      render('Шууд · багш холбогдсон: 0'); keepAwake();
      await establishSession(current);
    } catch (error) {
      if (current !== epoch) return;
      if (media && media !== stream) media.getTracks().forEach(function (track) { track.stop(); });
      if (stream && error.status !== 401 && error.status !== 403) scheduleRecovery(error, current);
      else if (error.status === 401 || error.status === 403) { forgetPreference(); enrolled = false; csrf = ''; stopCapture('Энэ дэлгэцийн бүртгэл хүчингүй болсон тул камер болон микрофон унтарлаа.', false); deviceId = ''; }
      else if (['NotFoundError','NotReadableError','AbortError','CameraBusyError'].indexOf(error.name) !== -1 && wantsResume()) { stopCapture(errorText(error), false); scheduleCaptureRetry(error); }
      else stopCapture(errorText(error), true);
    } finally { if (current === epoch) { starting = false; render(); } }
  }
  function closePeers() { peers.forEach(function (item) { clearTimeout(item.restartTimer); item.peer.close(); }); peers.clear(); }
  function removePeer(id) { var item = peers.get(id); if (item) { clearTimeout(item.restartTimer); item.peer.close(); peers.delete(id); render(); } }
  function peerFor(id, current) {
    if (peers.has(id)) return peers.get(id).peer;
    if (typeof id !== 'string' || id.length > 128 || peers.size >= 4) return null;
    var item = { peer: null, state: 'new', retries: 0, restartTimer: null }, ownerSession = sessionId;
    item.peer = window.C122CCTVPeer.create({
      iceServers: iceServers, stream: stream,
      onSignal: function (type, data) {
        if (current !== epoch || !stream || sessionId !== ownerSession || peers.get(id) !== item) return;
        return api('signal', { body: { sessionId: ownerSession, viewerId: id, role: 'publisher', type: type, data: data } }).catch(function (error) {
          if (error.code === 'viewer_ended') { if (current === epoch && sessionId === ownerSession) removePeer(id); return; }
          throw error;
        });
      },
      onState: function (state) {
        if (current !== epoch || peers.get(id) !== item) return;
        item.state = state;
        if (state === 'connected') { item.retries = 0; clearTimeout(item.restartTimer); item.restartTimer = null; render('Шууд · багш холбогдсон: ' + connectedCount()); }
        else if ((state === 'failed' || state === 'disconnected') && !item.restartTimer && item.retries < 3) {
          item.restartTimer = setTimeout(function () {
            item.restartTimer = null;
            if (current !== epoch || peers.get(id) !== item || !stream) return;
            item.retries++; item.peer.restartOffer().catch(function (error) { handleConnectionError(error, current); });
          }, state === 'failed' ? 1500 : 5000);
        }
        render();
      },
      onError: function (error) { handleConnectionError(error, current); }
    });
    peers.set(id, item); return item.peer;
  }
  function connectedCount() { var count = 0; peers.forEach(function (item) { if (item.state === 'connected') count++; }); return count; }
  async function establishSession(current) {
    if (current !== epoch || !stream || disposed) return;
    if (connectingEpoch === current) return;
    connectingEpoch = current;
    var data;
    try { data = await api('start', { body: {} }); }
    finally { if (connectingEpoch === current) connectingEpoch = 0; }
    if (current !== epoch || !stream || disposed) {
      if (data.sessionId) endSession(data.sessionId, false); return;
    }
    sessionId = data.sessionId; iceServers = data.iceServers || []; iceExpiresAt = Number(data.iceExpiresAt) || 0; cursor = 0; retryCount = 0; closePeers();
    clearTimeout(pollTimer); clearTimeout(heartbeatTimer);
    render('Шууд · багш холбогдсон: 0');
    poll(current, sessionId); scheduleHeartbeat(current, sessionId);
  }
  function scheduleHeartbeat(current, ownSession) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(async function () {
      if (current !== epoch || !stream || sessionId !== ownSession || disposed) return;
      try {
        var data = await api('heartbeat', { body: { sessionId: ownSession } });
        if (current !== epoch || sessionId !== ownSession) return;
        if (data.iceServers) {
          iceServers = data.iceServers;
          var renewedAt = Number(data.iceExpiresAt) || 0, renewed = renewedAt && iceExpiresAt && renewedAt !== iceExpiresAt;
          iceExpiresAt = renewedAt;
          peers.forEach(function (item) {
            item.peer.updateIceServers(iceServers);
            if (renewed && item.state === 'connected') item.peer.restartOffer().catch(function (error) { if (current === epoch && sessionId === ownSession) handleConnectionError(error, current); });
          });
        }
        retryCount = 0; scheduleHeartbeat(current, ownSession);
      } catch (error) { if (current === epoch && sessionId === ownSession) handleConnectionError(error, current); }
    }, 20000);
  }
  async function poll(current, ownSession) {
    if (current !== epoch || !stream || sessionId !== ownSession || disposed) return;
    try {
      var data = await api('poll', { query: { sessionId: ownSession, role: 'publisher', since: cursor } });
      if (current !== epoch || sessionId !== ownSession || !stream) return;
      var events = Array.isArray(data.events) ? data.events : [];
      for (var i = 0; i < events.length; i++) {
        if (current !== epoch || sessionId !== ownSession || !stream) return;
        var event = events[i], peer;
        if (event.type === 'viewer-left') { removePeer(event.viewerId); continue; }
        if (event.type === 'viewer-joined') { peer = peerFor(event.viewerId, current); if (peer) await peer.offer(); }
        else if (event.type === 'answer') { peer = peers.get(event.viewerId); if (peer) await peer.peer.acceptAnswer(event.data); }
        else if (event.type === 'candidate') { peer = peers.get(event.viewerId); if (peer) await peer.peer.addCandidate(event.data); }
      }
      cursor = Number(data.cursor) || cursor; retryCount = 0;
      if (current !== epoch || sessionId !== ownSession || !stream) return;
      pollTimer = setTimeout(function () { poll(current, ownSession); }, peers.size ? 1200 : 2000);
    } catch (error) { if (current === epoch && sessionId === ownSession) handleConnectionError(error, current); }
  }
  function handleConnectionError(error, current) {
    if (current !== epoch || !stream || disposed) return;
    if (error.status === 401 || error.status === 403) { forgetPreference(); enrolled = false; csrf = ''; stopCapture('Энэ дэлгэцийн эрх хүчингүй болсон тул камер болон микрофон унтарлаа.', false); deviceId = ''; return; }
    if (error.status === 409) { scheduleRecovery(error, current); return; }
    scheduleRecovery(error, current);
  }
  function scheduleRecovery(error, current) {
    if (current !== epoch || !stream || disposed) return;
    clearTimeout(pollTimer); clearTimeout(heartbeatTimer); closePeers();
    sessionId = ''; retryCount++;
    var delay = Math.min(30000, 1500 * Math.pow(2, Math.min(retryCount - 1, 5)));
    if (error && error.retryAfter) delay = Math.max(delay, Math.min(60000, Number(error.retryAfter) * 1000));
    render('Камер + микрофон идэвхтэй · холболтыг дахин сэргээж байна…');
    pollTimer = setTimeout(async function () {
      if (current !== epoch || !stream || disposed) return;
      try { await establishSession(current); }
      catch (failure) { handleConnectionError(failure, current); }
    }, delay);
  }
  function endSession(id, beacon) {
    if (!id || !csrf) return;
    var body = JSON.stringify({ sessionId: id, publisherCsrf: csrf });
    if (beacon && navigator.sendBeacon) {
      try { if (navigator.sendBeacon(boot.apiUrl + '?action=end', new Blob([body], { type: 'application/json' }))) return; } catch (_) {}
    }
    fetch(boot.apiUrl + '?action=end', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CCTV-CSRF': csrf }, body: body, keepalive: true }).catch(function () {});
  }
  function stopCapture(message, manual, unload) {
    epoch++; starting = false; clearTimeout(captureRetryTimer); captureRetryTimer = null; if (manual || unload) captureRetryCount = 0; clearTimeout(pollTimer); clearTimeout(heartbeatTimer); retryCount = 0;
    var previousSession = sessionId; sessionId = ''; closePeers();
    if (stream) { var previous = stream; stream = null; previous.getTracks().forEach(function (track) { track.stop(); }); }
    releaseWakeLock(); releaseLock(); if (manual) savedPause(true);
    endSession(previousSession, !!unload); render(message || 'Камер болон микрофон унтарлаа.');
  }
  function nextStatus(delay) { clearTimeout(statusTimer); if (!disposed) statusTimer = setTimeout(loadStatus, delay); }
  async function loadStatus() {
    if (disposed || statusInFlight) return;
    statusInFlight = true; var generation = statusGeneration, request = ++statusRequest;
    try {
      var data = await api('status');
      if (disposed || generation !== statusGeneration) return;
      statusFailures = 0;
      if (!data.enrolled) {
        forgetPreference(); enrolled = false; csrf = '';
        if (stream || starting || captureRetryTimer) stopCapture('Энэ дэлгэцийн бүртгэл хүчингүй болсон тул камер болон микрофон унтарлаа.', false);
        deviceId = ''; render(); return;
      }
      var previousId = deviceId; enrolled = true; csrf = data.publisherCsrf || ''; deviceId = data.deviceId || '';
      if (previousId && previousId !== deviceId) stopCapture('Шинэ төхөөрөмжийн бүртгэл. Эхлүүлэх товч дарна уу.', false);
      preference = readPreference(); var own = ownPreference();
      if (own) manualPause = own.mode === 'paused';
      else if (manualPause && deviceId) writePreference('paused');
      if (!supported()) { render('HTTPS болон шинэ Chrome шаардлагатай.'); return; }
      render(manualPause ? 'Камер болон микрофон унтраалттай байна. Эхлүүлэх товчийг дарна уу.' : (!stream && !starting && !captureRetryTimer && !wantsResume() ? 'Дэлгэц бүртгэлтэй. Эхлүүлэхийг нэг удаа дарвал дараа нь автоматаар холбогдоно.' : undefined));
      resumeCapture();
    } catch (error) {
      if (disposed || generation !== statusGeneration) return;
      statusFailures++; if (!stream) render(errorText(error) + ' Холболтыг дахин шалгаж байна…');
    } finally { if (request === statusRequest) statusInFlight = false; if (generation === statusGeneration && request === statusRequest) nextStatus(statusFailures ? Math.min(30000, 2000 * Math.pow(2, Math.min(statusFailures - 1,4))) : 15000); }
  }
  function pageHidden() { disposed = true; statusGeneration++; clearTimeout(statusTimer); stopCapture('', false, true); }
  document.addEventListener('c122:cctv-device-removed', function () {
    statusGeneration++; statusInFlight = false; forgetPreference(); enrolled = false; csrf = ''; deviceId = ''; stopCapture('Төхөөрөмжийн бүртгэл устсан. Камер болон микрофон унтарлаа.', false); nextStatus(15000);
  });
  document.addEventListener('c122:auth', function () { render(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { if (stream) keepAwake(); else if (!disposed) loadStatus(); } });
  window.addEventListener('pagehide', pageHidden);
  window.addEventListener('pageshow', function (event) { if (event.persisted) { disposed = false; statusGeneration++; statusInFlight = false; loadStatus(); } });
  window.addEventListener('hashchange', function (event) { if (event.newURL && event.newURL.split('#')[1] === 'camera-setup') openSetup(); });
  window.addEventListener('online', function () {
    if (disposed) return;
    if (!stream) { clearTimeout(statusTimer); loadStatus(); return; }
    if (!sessionId) { var current = epoch; clearTimeout(pollTimer); establishSession(current).catch(function (error) { handleConnectionError(error, current); }); }
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== preferenceKey || disposed) return;
    preference = readPreference(); var own = ownPreference();
    if (own && own.mode === 'paused') stopCapture('Шууд дамжуулалтыг энэ төхөөрөмжийн өөр таб дээр зогсоолоо.', true);
    else if (own && own.mode === 'resume') { manualPause = false; resumeCapture(); }
  });
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', function () {
    if (!disposed && !stream && !starting && wantsResume()) { clearTimeout(captureRetryTimer); captureRetryTimer = null; resumeCapture(); }
  });
  if (boot.setupRequested && !inlineSetup && boot.setupUrl) { openSetup(); return; }
  createUi();
  document.querySelectorAll('[data-cctv-open-setup]').forEach(function (link) { link.addEventListener('click', function (event) { event.preventDefault(); openSetup(); }); });
  if (boot.setupRequested) openSetup();
  loadStatus();
})();
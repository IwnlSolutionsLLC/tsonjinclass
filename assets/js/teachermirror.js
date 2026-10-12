/* Visible, live screen sharing. Capture always starts from the teacher's click. */
(function () {
  'use strict';
  var C = window.C122 = window.C122 || {}, boot = window.C122_TEACHERMIRROR || {};
  var apiUrl = boot.apiUrl || 'teachermirror.php', elements = {}, initialized = false, visible = false, mode = 'board';
  var board = { generation: 0, operation: 0, runningGeneration: null, timer: null, retry: 0, sessionId: '', viewerId: '', csrf: '', cursor: 0, peer: null, label: '', media: false, audio: false, local: false, state: 'waiting', lastStatus: 0, disconnectTimer: null, hasVideo: false, playBlocked: false, frameCallback: null, monitorTimer: null, joinedAt: 0, lastFrameAt: 0, lastTime: 0, lastFrames: 0, bytes: 0, decoded: 0, lastIncomingAt: 0, lastDecodedAt: 0, recoveries: 0, turnConfigured: false, diagnostics: '', visibilityAt: 0 };
  var teacher = { epoch: 0, loopGeneration: 0, starting: false, stream: null, sessionId: '', label: '', source: 'screen', quality: 'balanced', cursor: 0, discardOldSignals: false, iceServers: [], iceExpiresAt: 0, peers: new Map(), pollTimer: null, heartbeatTimer: null, recoveryTimer: null, recovering: false, pollRetry: 0, heartbeatRetry: 0, viewers: 0 };
  var boardMessage = ['waitingMessage', 'Шууд холболтыг хүлээж байна.'], teacherMessage = ['ready', 'Хуваалцахдаа зөвхөн үзүүлэх зүйлээ сонгоорой.'];

  function t(key, fallback, params) {
    var value = fallback;
    try { if (window.C122I18n && window.C122I18n.t) value = window.C122I18n.t('mirror.' + key, fallback, params || {}); } catch (_) {}
    return String(value || fallback).replace(/\{([a-zA-Z]+)\}/g, function (match, name) { return params && params[name] !== undefined ? params[name] : match; });
  }
  function authText(key, fallback) { try { return window.C122I18n && window.C122I18n.t ? window.C122I18n.t('auth.' + key, fallback) : fallback; } catch (_) { return fallback; } }
  function admin() { return C.state && typeof C.state.admin === 'boolean' ? C.state.admin : !!boot.admin; }
  function csrf() { return C.state && C.state.csrf || boot.adminCsrf || ''; }
  function text(id, value) { if (elements[id] && elements[id].textContent !== String(value)) elements[id].textContent = value; }
  function stopTracks(stream) { if (stream && stream.getTracks) stream.getTracks().forEach(function (track) { try { track.stop(); } catch (_) {} }); }
  function play(video) { if (!video) return; try { var result = video.play(); if (result && result.catch) result.catch(function () {}); } catch (_) {} }
  function teacherCurrent(epoch, sessionId) { return teacher.epoch === epoch && !!teacher.stream && (!sessionId || teacher.sessionId === sessionId); }
  function boardCurrent(generation) { return visible && mode === 'board' && board.generation === generation; }
  function backoff(count) { return Math.min(30000, 2000 * Math.pow(2, Math.min(count, 4))); }
  function profile(value) {
    if (value === 'low' || value === 'light') return { width: 854, height: 480, fps: 12, bitrate: 650000 };
    if (value === 'sharp' || value === 'text') return { width: 1920, height: 1080, fps: 24, bitrate: 2500000 };
    if (value === 'motion') return { width: 1280, height: 720, fps: 24, bitrate: 1800000 };
    return { width: 1280, height: 720, fps: 15, bitrate: 1200000 };
  }
  async function limitCapture(stream, selected) {
    var timer;
    try {
      await Promise.race([Promise.all(stream.getVideoTracks().map(function (track) {
        if (!track.applyConstraints) return Promise.resolve();
        try { return Promise.resolve(track.applyConstraints({ width: { max: selected.width }, height: { max: selected.height }, frameRate: { ideal: selected.fps, max: selected.fps } })).catch(function () {}); } catch (_) { return Promise.resolve(); }
      })), new Promise(function (resolve) { timer = setTimeout(resolve, 2000); })]);
    } finally { clearTimeout(timer); }
  }

  async function api(action, body, role, query, token) {
    var url = apiUrl + (apiUrl.indexOf('?') < 0 ? '?' : '&') + 'action=' + encodeURIComponent(action), headers = { Accept: 'application/json' };
    Object.keys(query || {}).forEach(function (key) { url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(query[key]); });
    if (role === 'publisher') headers['X-CSRF'] = token || csrf();
    else if (body) headers['X-MIRROR-CSRF'] = token || board.csrf;
    var controller = typeof AbortController === 'function' ? new AbortController() : null, timeout;
    var options = { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: headers };
    if (body) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
    if (controller) options.signal = controller.signal;
    try {
      return await Promise.race([fetch(url, options).then(async function (response) {
        var data = await response.json();
        if (!response.ok || !data || !data.ok) { var failure = new Error(data && data.error || t('networkError', 'Холболт түр тасарлаа.')); failure.status = response.status; failure.code = data && data.code; throw failure; }
        return data;
      }), new Promise(function (_, reject) { timeout = setTimeout(function () { if (controller) controller.abort(); var error = new Error(t('timeout', 'Холболт удааширлаа. Дахин холбогдож байна.')); error.status = 0; reject(error); }, 12000); })]);
    } finally { clearTimeout(timeout); }
  }
  function beacon(action, body) {
    var url = apiUrl + (apiUrl.indexOf('?') < 0 ? '?' : '&') + 'action=' + action;
    try { if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([JSON.stringify(body)], { type: 'application/json' }))) return; } catch (_) {}
    try { fetch(url, { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(function () {}); } catch (_) {}
  }
  function setBoardMessage(key, fallback, params) { boardMessage = [key, fallback, params]; render(); }
  function setTeacherMessage(key, fallback, params) { teacherMessage = [key, fallback, params]; render(); }

  function render() {
    if (!initialized) return;
    elements.mirrorBoardPanel.hidden = mode !== 'board'; elements.mirrorTeacherPanel.hidden = mode !== 'teacher';
    elements.mirrorBoardMode.setAttribute('aria-pressed', mode === 'board' ? 'true' : 'false'); elements.mirrorTeacherMode.setAttribute('aria-pressed', mode === 'teacher' ? 'true' : 'false');
    elements.mirrorTeacherLogin.hidden = admin(); elements.mirrorTeacherSettings.hidden = !admin();
    var busy = teacher.starting || !!teacher.stream;
    ['mirrorTeacherLabel', 'mirrorSource', 'mirrorQuality', 'mirrorShareAudio'].forEach(function (id) { elements[id].disabled = busy; });
    elements.mirrorStart.disabled = busy || !window.isSecureContext || !navigator.mediaDevices || !window.C122CCTVPeer || !window.RTCPeerConnection;
    elements.mirrorStop.disabled = !busy;
    elements.mirrorTeacherStage.hidden = !teacher.stream;
    elements.mirrorSharingBadge.hidden = !busy;
    text('mirrorTeacherCount', teacher.viewers + ' / 8');
    text('mirrorTeacherMessage', t.apply(null, teacherMessage)); text('mirrorBoardMessage', t.apply(null, boardMessage));
    text('mirrorSharingTitle', teacher.stream ? t('sharingLive', 'LIVE · Дэлгэц хуваалцаж байна') : t('starting', 'Хуваалцахыг эхлүүлж байна'));
    text('mirrorSharingDetail', teacher.stream ? t('sharingDetail', '{name} · {count} дэлгэц холбогдсон', { name: teacher.label || t('defaultLabel', '12-2 · Багшийн дэлгэц'), count: teacher.viewers }) : t('pickerWaiting', 'Хөтчийн сонголтыг хүлээж байна'));
    text('mirrorBoardLabel', board.label || t('waitingTitle', 'Багшийн дэлгэцийг хүлээж байна'));
    text('mirrorBoardState', board.media ? 'LIVE' : board.playBlocked ? t('playRequired', 'Тоглуулахыг хүлээж байна') : board.state === 'connecting' || board.state === 'stalled' ? t('connecting', 'Холбогдож байна') : t('waiting', 'Хүлээж байна'));
    elements.mirrorBoardState.classList.toggle('is-live', board.media); elements.mirrorBoardLive.hidden = !board.media; elements.mirrorBoardPlaceholder.hidden = board.media || board.playBlocked;
    elements.mirrorPlaybackPrompt.hidden = !board.playBlocked; elements.mirrorRetry.disabled = !board.sessionId || board.local;
    text('mirrorBoardHint', board.state === 'stalled' ? t.apply(null, boardMessage) : board.state === 'connecting' ? t('connectingHint', 'Багшийн дүрстэй холбогдож байна…') : t('waitingHint', 'Багш хуваалцаж эхлэхэд автоматаар холбогдоно.'));
    text('mirrorBoardDiagnostics', board.diagnostics);
    elements.mirrorAudio.disabled = !board.audio || !board.media || board.local;
    text('mirrorAudio', elements.mirrorBoardVideo.muted ? t('listen', 'Дууг сонсох') : t('mute', 'Дууг хаах'));
    elements.mirrorAudio.setAttribute('aria-pressed', elements.mirrorBoardVideo.muted ? 'false' : 'true');
    var screenAvailable = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    if (elements.mirrorSource.options && elements.mirrorSource.options[0]) elements.mirrorSource.options[0].disabled = !screenAvailable;
    text('mirrorSourceHelp', elements.mirrorSource.value === 'camera' ? t('cameraHelp', 'Утасны камерыг сонгож шууд үзүүлнэ. Энэ нь утасны бүтэн дэлгэцийг хуваалцахгүй. Дууг сонгосон үед микрофоны зөвшөөрөл асууна.') : t('screenHelp', '«Эхлэх» дараад хуваалцах дэлгэц, цонх эсвэл табаа сонгоно. Дуу хуваалцах боломж нь төхөөрөмж болон сонгосон эх үүсвэрээс хамаарна.'));
    renderShots();
  }

  function clearBoard() {
    clearTimeout(board.disconnectTimer); board.disconnectTimer = null;
    clearTimeout(board.monitorTimer); board.monitorTimer = null;
    var video = elements.mirrorBoardVideo;
    if (video && board.frameCallback !== null && video.cancelVideoFrameCallback) { try { video.cancelVideoFrameCallback(board.frameCallback); } catch (_) {} }
    board.frameCallback = null;
    if (board.peer) board.peer.close(); board.peer = null;
    if (board.sessionId && board.viewerId) beacon('leave', { sessionId: board.sessionId, viewerId: board.viewerId, viewerCsrf: board.csrf });
    board.sessionId = ''; board.viewerId = ''; board.cursor = 0; board.media = false; board.audio = false; board.local = false; board.state = 'waiting'; board.label = ''; board.hasVideo = false; board.playBlocked = false; board.joinedAt = 0; board.lastFrameAt = 0; board.lastTime = 0; board.lastFrames = 0; board.bytes = 0; board.decoded = 0; board.lastIncomingAt = 0; board.lastDecodedAt = 0; board.diagnostics = '';
    if (elements.mirrorBoardVideo) { elements.mirrorBoardVideo.srcObject = null; elements.mirrorBoardVideo.muted = true; }
  }
  function stopBoard() { board.generation++; clearTimeout(board.timer); board.timer = null; clearBoard(); render(); }
  function scheduleBoard(generation, delay) {
    clearTimeout(board.timer);
    if (boardCurrent(generation)) board.timer = setTimeout(function () { board.timer = null; watchBoard(generation); }, delay);
  }
  function restartBoard(generation, key, fallback, delay) {
    if (!boardCurrent(generation)) return;
    /* A failed peer may still have a poll in flight. Give its replacement a new loop. */
    board.generation++; board.operation++; board.runningGeneration = null;
    clearBoard(); board.lastStatus = 0; setBoardMessage(key || 'boardReconnecting', fallback || 'Холболтыг сэргээж байна.'); scheduleBoard(board.generation, delay === undefined ? 2000 : delay);
  }
  function receivedFrame(generation) {
    if (!boardCurrent(generation) || !elements.mirrorBoardVideo.srcObject || elements.mirrorBoardVideo.paused) return;
    board.lastFrameAt = Date.now(); board.recoveries = 0;
    if (!board.media || board.state !== 'connected' || board.playBlocked) {
      board.media = true; board.state = 'connected'; board.playBlocked = false;
      setBoardMessage(board.local ? 'localPreview' : 'viewing', board.local ? 'Таны хуваалцаж буй дүрс. Дуу давхар тоглуулахгүй.' : '{name} · Шууд үзэж байна.', { name: board.label });
    }
  }
  function samplePlayback(generation) {
    var video = elements.mirrorBoardVideo;
    if (!boardCurrent(generation) || !video.srcObject || video.paused || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    var frames = 0, counterAvailable = false;
    try {
      var measured = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality().totalVideoFrames : video.webkitDecodedFrameCount;
      if (typeof measured === 'number' && isFinite(measured)) { frames = measured; counterAvailable = true; }
    } catch (_) {}
    var time = Number(video.currentTime) || 0;
    if (counterAvailable ? frames > board.lastFrames : !video.requestVideoFrameCallback && time > board.lastTime + 0.01) receivedFrame(generation);
    board.lastFrames = Math.max(board.lastFrames, frames); board.lastTime = Math.max(board.lastTime, time);
  }
  function watchVideoFrames(generation) {
    var video = elements.mirrorBoardVideo;
    if (!video.requestVideoFrameCallback || board.frameCallback !== null || !boardCurrent(generation)) return;
    function frame(_, metadata) {
      if (!boardCurrent(generation) || !video.srcObject) return;
      board.frameCallback = null;
      if ((metadata.width || video.videoWidth) > 0 && (metadata.height || video.videoHeight) > 0) receivedFrame(generation);
      if (boardCurrent(generation)) board.frameCallback = video.requestVideoFrameCallback(frame);
    }
    board.frameCallback = video.requestVideoFrameCallback(frame);
  }
  function playBoard(generation, explicit) {
    var video = elements.mirrorBoardVideo;
    if (!boardCurrent(generation) || !video.srcObject || (board.playBlocked && !explicit)) return;
    var expectedStream = video.srcObject;
    try {
      var result = video.play();
      Promise.resolve(result).then(function () {
        if (!boardCurrent(generation) || video.srcObject !== expectedStream) return;
        board.playBlocked = false; watchVideoFrames(generation); samplePlayback(generation); render();
      }).catch(function (error) {
        if (!boardCurrent(generation) || video.srcObject !== expectedStream || error.name === 'AbortError') return;
        if (error.name === 'NotAllowedError') {
          board.playBlocked = true; board.media = false;
          setBoardMessage('autoplayBlocked', 'Хөтөч автоматаар тоглуулахыг зөвшөөрөөгүй. «Дүрсийг тоглуулах» товчийг нэг удаа дарна уу.');
        } else setBoardMessage('playbackFailed', 'Дүрс тоглуулахад алдаа гарлаа. «Дахин холбох» дарж оролдоно уу.');
      });
    } catch (_) { board.playBlocked = true; setBoardMessage('autoplayBlocked', 'Хөтөч автоматаар тоглуулахыг зөвшөөрөөгүй. «Дүрсийг тоглуулах» товчийг нэг удаа дарна уу.'); }
  }
  function attachBoardStream(stream, generation) {
    var video = elements.mirrorBoardVideo;
    /* Audio and video usually arrive separately on the same stream. Reassigning it resets playback. */
    if (video.srcObject !== stream) { video.srcObject = stream; video.muted = true; board.lastTime = 0; board.lastFrames = 0; }
    board.hasVideo = stream.getVideoTracks().length > 0; board.audio = stream.getAudioTracks().length > 0;
    watchVideoFrames(generation); playBoard(generation, false); render();
  }
  async function readBoardStats(peer) {
    if (!peer || !peer.connection || !peer.connection.getStats) return null;
    var timer;
    try {
      var reports = await Promise.race([peer.connection.getStats(), new Promise(function (resolve) { timer = setTimeout(function () { resolve(null); }, 3000); })]);
      if (!reports || !reports.forEach) return null;
      var result = { bytes: 0, decoded: 0, fps: 0, width: 0, height: 0 };
      reports.forEach(function (report) {
        if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.mediaType === 'video') && !report.isRemote) {
          result.bytes += Number(report.bytesReceived) || 0; result.decoded += Number(report.framesDecoded) || 0;
          result.fps += Number(report.framesPerSecond) || 0; result.width = Number(report.frameWidth) || result.width; result.height = Number(report.frameHeight) || result.height;
        }
      }); return result;
    } catch (_) { return null; } finally { clearTimeout(timer); }
  }
  function monitorBoard(generation, delay) {
    clearTimeout(board.monitorTimer);
    if (!boardCurrent(generation) || !board.sessionId) return;
    board.monitorTimer = setTimeout(async function () {
      board.monitorTimer = null;
      if (!boardCurrent(generation) || !board.sessionId) return;
      if (document.visibilityState === 'hidden') { monitorBoard(generation, 4000); return; }
      samplePlayback(generation);
      var peer = board.peer, stats = await readBoardStats(peer);
      if (!boardCurrent(generation) || board.peer !== peer) return;
      var state = peer && peer.connection && (peer.connection.connectionState || peer.connection.iceConnectionState) || (board.local ? 'connected' : 'connecting');
      var connection = state === 'connected' || state === 'completed' ? t('transportConnected', 'Холбогдсон') : state === 'failed' || state === 'disconnected' ? t('transportInterrupted', 'Тасарсан') : t('connecting', 'Холбогдож байна');
      var now = Date.now();
      if (stats) {
        if (stats.bytes > board.bytes) board.lastIncomingAt = now;
        if (stats.decoded > board.decoded) board.lastDecodedAt = now;
        board.bytes = stats.bytes; board.decoded = stats.decoded;
      }
      var video = elements.mirrorBoardVideo;
      board.diagnostics = board.media ? t('videoDiagnostics', '{width}×{height} · {fps} FPS', { width: video.videoWidth || stats && stats.width || '—', height: video.videoHeight || stats && stats.height || '—', fps: stats && stats.fps ? Math.round(stats.fps) : '—' }) : t('connectionDiagnostics', '{state} · Видео {kb} KB · {frames} кадр', { state: connection, kb: Math.round(board.bytes / 1024), frames: board.decoded });
      var startupAge = now - Math.max(board.joinedAt, board.visibilityAt), frameAge = board.lastFrameAt ? now - Math.max(board.lastFrameAt, board.visibilityAt) : startupAge;
      if (!board.playBlocked && !board.local) {
        if (!board.media && startupAge > 12000) {
          board.state = 'stalled';
          if (board.bytes > 0 && board.decoded === 0) setBoardMessage('decodeWaiting', 'Дүрсний өгөгдөл ирсэн ч зураг хараахан тайлагдаагүй байна. Багшийн төхөөрөмж дээр 480p тохиргоо сонгож дахин эхлүүлж болно.');
          else if (!board.bytes && !board.turnConfigured && (state === 'failed' || state === 'disconnected')) setBoardMessage('networkBlocked', 'Wi-Fi төхөөрөмжүүдийн дүрсний холболтыг хааж байж болно. Холболтыг сэргээж байна; үргэлжилбэл сайтын эзнээр дамжуулах серверийн тохиргоог шалгуулна уу.');
          else setBoardMessage('framesWaiting', 'Багшийн нэр ирсэн боловч дүрсний кадр хараахан ирсэнгүй. Холболтыг сэргээж байна.');
        }
        var decoderStuck = stats && board.lastIncomingAt > 0 && now - board.lastIncomingAt < 8000 && now - Math.max(board.lastDecodedAt, board.joinedAt, board.visibilityAt) > 20000;
        if ((!board.media && startupAge > 24000) || (board.media && frameAge > 20000 && (video.readyState < 2 || video.paused || state === 'failed' || state === 'disconnected' || decoderStuck))) {
          restartBoard(generation, 'videoStalled', 'Дүрс түр зогслоо. Шинээр холбогдож байна.', backoff(board.recoveries++)); return;
        }
        /* A static slide may send no new frames for a while; keep its last good image. */
      }
      render(); monitorBoard(generation, board.media ? 4000 : 2000);
    }, delay);
  }
  function createBoardPeer(generation, iceServers) {
    var sessionId = board.sessionId, viewerId = board.viewerId, viewerCsrf = board.csrf;
    var peer = window.C122CCTVPeer.create({
      iceServers: iceServers || [], preferredVideoCodecs: ['video/H264', 'video/VP8'], lowLatency: true,
      onSignal: function (type, data) { if (!boardCurrent(generation) || board.viewerId !== viewerId) return Promise.resolve(); return api('signal', { role: 'viewer', sessionId: sessionId, viewerId: viewerId, type: type, data: data }, 'viewer', null, viewerCsrf); },
      onTrack: function (event) {
        if (!boardCurrent(generation) || board.viewerId !== viewerId) return;
        var video = elements.mirrorBoardVideo, stream = event.streams && event.streams[0];
        if (!stream) { stream = video.srcObject || new MediaStream(); if (event.track && !stream.getTracks().some(function (track) { return track.id === event.track.id; })) stream.addTrack(event.track); }
        attachBoardStream(stream, generation);
        if (event.track && event.track.addEventListener) {
          event.track.addEventListener('unmute', function () { if (boardCurrent(generation) && board.viewerId === viewerId) playBoard(generation, false); });
          event.track.addEventListener('ended', function () { if (event.track.kind === 'video' && boardCurrent(generation) && board.viewerId === viewerId) restartBoard(generation, 'sourceInterrupted', 'Багшийн дүрс тасарлаа. Шинээр холбогдож байна.'); });
        }
        if (!board.media && !board.playBlocked) setBoardMessage('framesLoading', 'Дүрсний холболт ирлээ. Эхний кадрыг хүлээж байна.');
      },
      onState: function (state) {
        if (!boardCurrent(generation) || board.viewerId !== viewerId) return;
        if (state === 'connected') { clearTimeout(board.disconnectTimer); board.disconnectTimer = null; board.retry = 0; playBoard(generation, false); }
        else if (state === 'failed') restartBoard(generation, board.turnConfigured ? 'connectionFailed' : 'networkBlocked', board.turnConfigured ? 'Дүрсний холболт байгуулагдсангүй. Шинээр холбогдож байна.' : 'Wi-Fi төхөөрөмжүүдийн шууд холбоог хааж байж болно. Шинээр холбогдож байна; үргэлжилбэл сайтын эзнээр дамжуулах серверийг шалгуулна уу.', backoff(board.recoveries++));
        else if (state === 'disconnected' && !board.disconnectTimer) { setBoardMessage('boardReconnecting', 'Холболтыг сэргээж байна.'); board.disconnectTimer = setTimeout(function () { board.disconnectTimer = null; restartBoard(generation); }, 10000); }
      },
      onError: function (error) { restartBoard(generation, error && error.name === 'OperationError' ? 'negotiationFailed' : 'boardReconnecting', error && error.name === 'OperationError' ? 'Хөтчүүд дүрсний форматаа тохиролцож чадсангүй. Шинээр холбогдож байна.' : 'Холболтыг сэргээж байна.', backoff(board.recoveries++)); }
    });
    board.peer = peer; board.joinedAt = Date.now(); monitorBoard(generation, 2000);
  }
  async function watchBoard(generation) {
    if (!boardCurrent(generation) || board.runningGeneration === generation) return;
    if (!window.RTCPeerConnection || !window.C122CCTVPeer) { setBoardMessage('unsupported', 'HTTPS болон WebRTC дэмждэг хөтчөөр нээнэ үү.'); return; }
    var operation = ++board.operation; board.runningGeneration = generation;
    try {
      if (!board.sessionId || Date.now() - board.lastStatus > (board.media ? 30000 : 10000)) {
        var status = await api('status');
        if (!boardCurrent(generation)) return;
        board.lastStatus = Date.now(); board.csrf = status.viewerCsrf || ''; board.turnConfigured = !!status.turnConfigured;
        if (!status.live || !status.sessionId) { clearBoard(); setBoardMessage('waitingMessage', 'Шууд холболтыг хүлээж байна.'); scheduleBoard(generation, 3000); return; }
        if (teacher.stream && teacher.sessionId === status.sessionId) {
          if (!board.local) { clearBoard(); board.joinedAt = Date.now(); }
          board.local = true; board.sessionId = status.sessionId; board.label = status.label || teacher.label;
          attachBoardStream(teacher.stream, generation); monitorBoard(generation, 2000);
          if (!board.media) setBoardMessage('framesLoading', 'Дүрсний холболт ирлээ. Эхний кадрыг хүлээж байна.'); scheduleBoard(generation, 3000); return;
        }
        if (board.sessionId !== status.sessionId || board.local) {
          clearBoard(); board.sessionId = status.sessionId; board.label = status.label || t('defaultLabel', '12-2 · Багшийн дэлгэц'); board.state = 'connecting'; render();
          var pendingSessionId = board.sessionId, pendingCsrf = board.csrf;
          var joined = await api('join', { sessionId: pendingSessionId }, 'viewer', null, pendingCsrf);
          if (!boardCurrent(generation)) { beacon('leave', { sessionId: pendingSessionId, viewerId: joined.viewerId, viewerCsrf: pendingCsrf }); return; }
          board.viewerId = joined.viewerId; board.turnConfigured = !!joined.turnConfigured; createBoardPeer(generation, joined.iceServers); setBoardMessage('connectingMessage', 'Багшийн дүрсийг ачаалж байна.');
        }
      }
      if (board.local) { scheduleBoard(generation, 3000); return; }
      var viewerId = board.viewerId, peer = board.peer;
      var result = await api('poll', null, 'viewer', { role: 'viewer', sessionId: board.sessionId, viewerId: viewerId, since: board.cursor });
      if (!boardCurrent(generation) || board.viewerId !== viewerId || board.peer !== peer) return;
      if (result.iceServers) peer.updateIceServers(result.iceServers);
      if (typeof result.turnConfigured === 'boolean') board.turnConfigured = result.turnConfigured;
      var events = result.events || [];
      for (var i = 0; i < events.length; i++) {
        if (!boardCurrent(generation) || board.peer !== peer) return;
        if (events[i].type === 'offer') await peer.acceptOffer(events[i].data);
        else if (events[i].type === 'candidate') await peer.addCandidate(events[i].data);
      }
      if (!boardCurrent(generation) || board.peer !== peer) return;
      board.cursor = result.cursor || board.cursor; board.retry = 0; scheduleBoard(generation, 1200);
    } catch (error) {
      if (!boardCurrent(generation)) return;
      if (error.status === 403 || error.status === 409 || !board.peer) { clearBoard(); board.lastStatus = 0; }
      var limit = error.code === 'viewer_limit';
      setBoardMessage(limit ? 'viewerLimit' : 'boardReconnecting', limit ? 'Одоогоор 8 дэлгэц холбогдсон байна. Сулрахад автоматаар холбогдоно.' : 'Холболтыг сэргээж байна.');
      scheduleBoard(generation, backoff(board.retry++));
    } finally { if (board.operation === operation) board.runningGeneration = null; }
  }

  function closeTeacherPeers() { teacher.peers.forEach(function (item) { clearTimeout(item.restartTimer); item.peer.close(); }); teacher.peers.clear(); teacher.viewers = 0; }
  function clearTeacherTimers() { clearTimeout(teacher.pollTimer); clearTimeout(teacher.heartbeatTimer); clearTimeout(teacher.recoveryTimer); teacher.pollTimer = teacher.heartbeatTimer = teacher.recoveryTimer = null; }
  function stopTeacher(messageKey, fallback) {
    teacher.epoch++; teacher.loopGeneration++; clearTeacherTimers(); closeTeacherPeers();
    var oldSession = teacher.sessionId; teacher.sessionId = ''; teacher.starting = false; teacher.recovering = false;
    if (teacher.stream) teacher.stream.getTracks().forEach(function (track) { track.onended = null; });
    stopTracks(teacher.stream); teacher.stream = null;
    if (oldSession) beacon('end', { sessionId: oldSession, csrf: csrf() });
    if (elements.mirrorTeacherPreview) elements.mirrorTeacherPreview.srcObject = null;
    if (board.local) { clearBoard(); board.lastStatus = 0; }
    setTeacherMessage(messageKey || 'stopped', fallback || 'Хуваалцалт дууслаа. Дахин эхлэхдээ үзүүлэх зүйлээ шинээр сонгоно.');
    if (visible && mode === 'board') scheduleBoard(board.generation, 1000);
  }
  function tunePeer(peer) {
    try {
      var selected = profile(teacher.quality);
      peer.connection.getSenders().forEach(function (sender) {
        if (!sender.track || sender.track.kind !== 'video' || !sender.getParameters || !sender.setParameters) return;
        var parameters = sender.getParameters(); if (!parameters.encodings || !parameters.encodings.length) return;
        var settings = sender.track.getSettings ? sender.track.getSettings() : {};
        var scale = Math.max(1, (Number(settings.width) || selected.width) / selected.width, (Number(settings.height) || selected.height) / selected.height);
        parameters.encodings.forEach(function (encoding) { encoding.maxBitrate = selected.bitrate; encoding.maxFramerate = selected.fps; encoding.scaleResolutionDownBy = scale; });
        parameters.degradationPreference = teacher.quality === 'sharp' || teacher.quality === 'text' ? 'maintain-resolution' : 'balanced';
        Promise.resolve(sender.setParameters(parameters)).catch(function () {});
      });
    } catch (_) {}
  }
  function removeTeacherPeer(viewerId) { var item = teacher.peers.get(viewerId); if (item) { clearTimeout(item.restartTimer); item.peer.close(); teacher.peers.delete(viewerId); } }
  function createTeacherPeer(viewerId, epoch, sessionId) {
    if (!teacherCurrent(epoch, sessionId) || teacher.peers.has(viewerId) || teacher.peers.size >= 8) return;
    var item = { peer: null, restartTimer: null, restarts: 0 };
    item.peer = window.C122CCTVPeer.create({
      iceServers: teacher.iceServers, stream: teacher.stream, preferredVideoCodecs: ['video/H264', 'video/VP8'], lowLatency: true,
      onSignal: function (type, data) { if (!teacherCurrent(epoch, sessionId) || teacher.peers.get(viewerId) !== item) return Promise.resolve(); return api('signal', { role: 'publisher', sessionId: sessionId, viewerId: viewerId, type: type, data: data }, 'publisher'); },
      onState: function (state) {
        if (!teacherCurrent(epoch, sessionId) || teacher.peers.get(viewerId) !== item) return;
        if (state === 'connected') { clearTimeout(item.restartTimer); item.restartTimer = null; item.restarts = 0; tunePeer(item.peer); }
        else if ((state === 'failed' || state === 'disconnected') && !item.restartTimer) {
          item.restartTimer = setTimeout(function () { item.restartTimer = null; if (teacherCurrent(epoch, sessionId) && teacher.peers.get(viewerId) === item) item.peer.restartOffer().then(function () { tunePeer(item.peer); }).catch(function (error) { teacherError(error, epoch, sessionId); }); }, backoff(item.restarts++));
        }
      },
      onError: function (error) { if (teacherCurrent(epoch, sessionId) && teacher.peers.get(viewerId) === item) teacherError(error, epoch, sessionId); }
    });
    teacher.peers.set(viewerId, item);
    item.peer.offer().then(function () { if (teacherCurrent(epoch, sessionId)) tunePeer(item.peer); }).catch(function (error) { teacherError(error, epoch, sessionId); });
  }
  function updateTeacherIce(result, epoch, sessionId) {
    if (!teacherCurrent(epoch, sessionId)) return;
    var previous = teacher.iceExpiresAt;
    if (Array.isArray(result.iceServers)) teacher.iceServers = result.iceServers;
    if (result.iceExpiresAt) teacher.iceExpiresAt = result.iceExpiresAt;
    teacher.peers.forEach(function (item) {
      item.peer.updateIceServers(teacher.iceServers);
      if (previous && result.iceExpiresAt && previous !== result.iceExpiresAt) item.peer.restartOffer().then(function () { tunePeer(item.peer); }).catch(function (error) { teacherError(error, epoch, sessionId); });
    });
  }
  function teacherError(error, epoch, sessionId) {
    if (!teacherCurrent(epoch, sessionId)) return;
    if (error.code === 'viewer_ended') return;
    if (error.status === 401 || error.status === 403 || error.code === 'room_busy') { stopTeacher('authLost', 'Багшийн нэвтрэлт эсвэл дамжуулалтын эрх дууслаа. Дахин нэвтэрч эхлүүлнэ үү.'); return; }
    setTeacherMessage('teacherReconnecting', 'Шууд дүрс хэвээр байна. Сүлжээний холболтыг сэргээж байна.');
    if (error.code === 'cursor_invalid') { teacher.cursor = 0; teacher.discardOldSignals = true; closeTeacherPeers(); }
    if (error.code === 'session_ended' || error.code === 'cursor_invalid') recoverTeacher(epoch, sessionId);
  }
  function pollTeacher(epoch, sessionId, delay) {
    clearTimeout(teacher.pollTimer);
    if (!teacherCurrent(epoch, sessionId) || teacher.recovering) return;
    var loopGeneration = teacher.loopGeneration;
    teacher.pollTimer = setTimeout(async function () {
      if (!teacherCurrent(epoch, sessionId) || teacher.recovering || teacher.loopGeneration !== loopGeneration) return;
      try {
        var result = await api('poll', null, 'publisher', { role: 'publisher', sessionId: sessionId, since: teacher.cursor });
        if (!teacherCurrent(epoch, sessionId) || teacher.recovering || teacher.loopGeneration !== loopGeneration) return;
        if (Array.isArray(result.viewerIds)) {
          teacher.peers.forEach(function (_, viewerId) { if (result.viewerIds.indexOf(viewerId) < 0) removeTeacherPeer(viewerId); });
          result.viewerIds.forEach(function (viewerId) { createTeacherPeer(viewerId, epoch, sessionId); });
        }
        var events = result.events || [];
        for (var i = 0; i < events.length; i++) {
          if (!teacherCurrent(epoch, sessionId) || teacher.recovering || teacher.loopGeneration !== loopGeneration) return;
          var event = events[i], item = teacher.peers.get(event.viewerId);
          if (event.type === 'viewer-joined' && (!Array.isArray(result.viewerIds) || result.viewerIds.indexOf(event.viewerId) >= 0)) createTeacherPeer(event.viewerId, epoch, sessionId);
          else if (event.type === 'viewer-left') removeTeacherPeer(event.viewerId);
          else if (item && event.type === 'answer' && !teacher.discardOldSignals) { await item.peer.acceptAnswer(event.data); if (teacherCurrent(epoch, sessionId)) tunePeer(item.peer); }
          else if (item && event.type === 'candidate' && !teacher.discardOldSignals) await item.peer.addCandidate(event.data);
        }
        if (!teacherCurrent(epoch, sessionId) || teacher.recovering || teacher.loopGeneration !== loopGeneration) return;
        teacher.cursor = result.cursor || teacher.cursor; teacher.discardOldSignals = false; teacher.viewers = Number(result.viewers) || 0; teacher.pollRetry = 0;
        setTeacherMessage('teacherLive', 'Хуваалцаж байна · {count} дэлгэц холбогдсон.', { count: teacher.viewers }); pollTeacher(epoch, sessionId, 1200);
      } catch (error) { if (teacher.loopGeneration !== loopGeneration) return; teacherError(error, epoch, sessionId); pollTeacher(epoch, sessionId, backoff(teacher.pollRetry++)); }
    }, delay);
  }
  function heartbeatTeacher(epoch, sessionId, delay) {
    clearTimeout(teacher.heartbeatTimer);
    if (!teacherCurrent(epoch, sessionId) || teacher.recovering) return;
    var loopGeneration = teacher.loopGeneration;
    teacher.heartbeatTimer = setTimeout(async function () {
      if (!teacherCurrent(epoch, sessionId) || teacher.recovering || teacher.loopGeneration !== loopGeneration) return;
      try {
        var result = await api('heartbeat', { sessionId: sessionId }, 'publisher');
        if (!teacherCurrent(epoch, sessionId) || teacher.recovering || teacher.loopGeneration !== loopGeneration) return;
        updateTeacherIce(result, epoch, sessionId); teacher.heartbeatRetry = 0; heartbeatTeacher(epoch, sessionId, 20000);
      } catch (error) { if (teacher.loopGeneration !== loopGeneration) return; teacherError(error, epoch, sessionId); heartbeatTeacher(epoch, sessionId, backoff(teacher.heartbeatRetry++)); }
    }, delay);
  }
  function recoverTeacher(epoch, oldSession) {
    if (!teacherCurrent(epoch, oldSession) || teacher.recovering) return;
    teacher.recovering = true; teacher.loopGeneration++; clearTeacherTimers();
    var attempt = 0;
    async function recover() {
      if (!teacherCurrent(epoch, oldSession)) return;
      try {
        var result = await api('start', { sessionId: oldSession, label: teacher.label }, 'publisher');
        if (!teacherCurrent(epoch, oldSession)) { if (result.sessionId) beacon('end', { sessionId: result.sessionId, csrf: csrf() }); return; }
        if (result.sessionId !== oldSession) { closeTeacherPeers(); teacher.cursor = 0; teacher.discardOldSignals = false; teacher.sessionId = result.sessionId; }
        teacher.recovering = false; updateTeacherIce(result, epoch, teacher.sessionId);
        pollTeacher(epoch, teacher.sessionId, 0); heartbeatTeacher(epoch, teacher.sessionId, 20000);
      } catch (error) {
        if (!teacherCurrent(epoch, oldSession)) return;
        if (error.status === 401 || error.status === 403 || error.code === 'room_busy') { stopTeacher('roomBusy', 'Өөр багшийн хуваалцалт ажиллаж байна, эсвэл нэвтрэх эрх дууссан. Түр хүлээгээд дахин эхлүүлнэ үү.'); return; }
        teacher.recoveryTimer = setTimeout(recover, backoff(attempt++));
      }
    }
    recover();
  }
  async function startTeacher() {
    if (!admin() || teacher.starting || teacher.stream) return;
    if (!window.isSecureContext || !navigator.mediaDevices || !window.C122CCTVPeer || !window.RTCPeerConnection) { setTeacherMessage('unsupported', 'HTTPS болон WebRTC дэмждэг хөтчөөр нээнэ үү.'); return; }
    var source = elements.mirrorSource.value, quality = elements.mirrorQuality.value || 'balanced', selected = profile(quality), audio = !!elements.mirrorShareAudio.checked;
    if (source === 'screen' && !navigator.mediaDevices.getDisplayMedia) { setTeacherMessage('phoneHelp', 'Энэ хөтөч дэлгэц хуваалцахгүй. «Камер» сонголтоор утасны камераас үзүүлж болно.'); return; }
    if (source === 'camera' && !navigator.mediaDevices.getUserMedia) { setTeacherMessage('cameraUnsupported', 'Энэ хөтөч камер хуваалцах боломжгүй байна.'); return; }
    var epoch = ++teacher.epoch, capture;
    teacher.starting = true; teacher.source = source; teacher.quality = quality;
    teacher.label = elements.mirrorTeacherLabel.value.trim().slice(0, 80) || t('defaultLabel', '12-2 · Багшийн дэлгэц'); render();
    try {
      /* No await before the chooser: Chrome requires this teacher click. */
      if (source === 'screen') capture = navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: selected.width }, height: { ideal: selected.height }, frameRate: { ideal: selected.fps } }, audio: audio, selfBrowserSurface: 'exclude', surfaceSwitching: 'include', systemAudio: audio ? 'include' : 'exclude' });
      else capture = navigator.mediaDevices.getUserMedia({ video: { width: { ideal: selected.width }, height: { ideal: selected.height }, frameRate: { ideal: selected.fps }, facingMode: { ideal: 'environment' } }, audio: audio ? { echoCancellation: true, noiseSuppression: true } : false });
      var stream = await capture;
      if (teacher.epoch !== epoch || !teacher.starting || !admin()) { stopTracks(stream); return; }
      if (!stream.getVideoTracks().length) { stopTracks(stream); throw new Error(t('noVideo', 'Хуваалцах дүрс олдсонгүй.')); }
      teacher.stream = stream;
      stream.getVideoTracks().forEach(function (track) { try { track.contentHint = quality === 'motion' ? 'motion' : 'detail'; } catch (_) {} track.onended = function () { if (teacher.epoch === epoch) stopTeacher('sourceEnded', 'Хөтчийн хуваалцалт дууслаа.'); }; });
      elements.mirrorTeacherPreview.srcObject = stream; elements.mirrorTeacherPreview.muted = true; play(elements.mirrorTeacherPreview); render();
      await limitCapture(stream, selected);
      if (!teacherCurrent(epoch)) return;
      var result = await api('start', { label: teacher.label }, 'publisher');
      if (!teacherCurrent(epoch)) { if (result.sessionId) beacon('end', { sessionId: result.sessionId, csrf: csrf() }); return; }
      teacher.sessionId = result.sessionId; teacher.starting = false; teacher.cursor = 0; teacher.discardOldSignals = false; teacher.loopGeneration++; teacher.pollRetry = teacher.heartbeatRetry = 0;
      teacher.iceServers = result.iceServers || []; teacher.iceExpiresAt = result.iceExpiresAt || 0;
      setTeacherMessage(audio && !stream.getAudioTracks().length ? 'liveNoAudio' : 'teacherLive', audio && !stream.getAudioTracks().length ? 'Дүрс хуваалцаж байна. Сонгосон эх үүсвэр дуу өгсөнгүй; шаардлагатай бол дуу хуваалцах боломжтой Chrome таб сонгоорой.' : 'Хуваалцаж байна · {count} дэлгэц холбогдсон.', { count: 0 });
      pollTeacher(epoch, teacher.sessionId, 0); heartbeatTeacher(epoch, teacher.sessionId, 20000);
    } catch (error) {
      if (teacher.epoch !== epoch) return;
      var key = error.code === 'room_busy' ? 'roomBusy' : error.name === 'NotAllowedError' || error.name === 'AbortError' ? 'captureCancelled' : error.status === 401 || error.status === 403 ? 'authLost' : 'captureFailed';
      var fallback = key === 'roomBusy' ? 'Өөр багш хуваалцаж байна. Дуусахыг хүлээгээд дахин эхлүүлнэ үү.' : key === 'captureCancelled' ? 'Хуваалцах сонголтыг цуцалсан эсвэл зөвшөөрөл өгөөгүй байна. Хүсвэл дахин эхлүүлээрэй.' : key === 'authLost' ? 'Багшаар дахин нэвтэрч эхлүүлнэ үү.' : 'Хуваалцаж чадсангүй. Төхөөрөмж, сүлжээ болон хөтчийн зөвшөөрлийг шалгаад дахин эхлүүлнэ үү.';
      stopTeacher(key, fallback);
    }
  }

  /* ---------- Screenshot: 3-dot menu over a live video; the PNG is saved into the album ---------- */
  var shots = { controls: [], busy: false, saving: false, stamp: '', repeat: 0, toasts: null, toastTimer: null };
  var SHOT_DOTS = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="5" r="2.1"/><circle cx="12" cy="12" r="2.1"/><circle cx="12" cy="19" r="2.1"/></svg><span class="mirror-shot-spinner" aria-hidden="true"></span>';
  var SHOT_CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z"></path><circle cx="12" cy="13" r="4"></circle></svg>';
  function shotError(code, message) { var error = new Error(message || code); error.shot = code; return error; }
  function videoReady(video) { return !!(video && video.srcObject && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0); }
  function framesDecoded(video) {
    try { var quality = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null; if (quality && typeof quality.totalVideoFrames === 'number') return quality.totalVideoFrames > 0; } catch (_) {}
    return typeof video.webkitDecodedFrameCount === 'number' ? video.webkitDecodedFrameCount > 0 : (Number(video.currentTime) || 0) > 0;
  }
  /* A frame that was never decoded draws nothing (all transparent) or pure black. Real black screens pass once frames were decoded. */
  function framePixels(canvas) {
    var probe = document.createElement('canvas'), visible = false, light = false;
    probe.width = 32; probe.height = 18;
    var context = probe.getContext('2d'); context.drawImage(canvas, 0, 0, 32, 18);
    var data = context.getImageData(0, 0, 32, 18).data;
    for (var i = 0; i < data.length; i += 4) { if (data[i + 3] > 0) { visible = true; if (data[i] + data[i + 1] + data[i + 2] > 24) { light = true; break; } } }
    return { visible: visible, light: light };
  }
  function canvasBlob(canvas, type, quality) { return new Promise(function (resolve) { try { canvas.toBlob(resolve, type, quality); } catch (_) { resolve(null); } }); }
  async function captureVideo(video) {
    if (!videoReady(video)) throw shotError('noFrame');
    var width = video.videoWidth, height = video.videoHeight, canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    try { canvas.getContext('2d').drawImage(video, 0, 0, width, height); } catch (_) { throw shotError('noFrame'); }
    var pixels = framePixels(canvas);
    if (!pixels.visible || (!pixels.light && !framesDecoded(video))) throw shotError('noFrame');
    var blob = await canvasBlob(canvas, 'image/png');
    if (!blob || !blob.size) throw shotError('encode');
    return { blob: blob, canvas: canvas, width: width, height: height };
  }
  function shotName() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    var stamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
    if (stamp === shots.stamp) shots.repeat++; else { shots.stamp = stamp; shots.repeat = 0; }
    return 'screenshot-' + stamp + (shots.repeat ? '-' + (shots.repeat + 1) : '') + '.png';
  }
  /* The album endpoint takes one request up to chunkMax. A very large PNG falls back to JPEG, then to a smaller JPEG. */
  async function fitShot(frame, name) {
    var limit = Math.max(256 * 1024, Math.min(Number(C.state && C.state.chunkMax) || 8 * 1024 * 1024, 32 * 1024 * 1024)) - 1024;
    if (frame.blob.size <= limit) return { blob: frame.blob, name: name };
    var canvas = frame.canvas;
    for (var attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) { var scale = Math.pow(0.7, attempt); canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(frame.width * scale)); canvas.height = Math.max(1, Math.round(frame.height * scale)); canvas.getContext('2d').drawImage(frame.canvas, 0, 0, canvas.width, canvas.height); }
      var jpeg = await canvasBlob(canvas, 'image/jpeg', 0.92 - attempt * 0.06);
      if (jpeg && jpeg.size && jpeg.size <= limit) return { blob: jpeg, name: name.replace(/\.png$/, '.jpg') };
    }
    throw shotError('tooLarge');
  }
  function shotHost() { var full = document.fullscreenElement; return full && full.nodeType === 1 && full.tagName !== 'VIDEO' ? full : document.body; }
  function dismissShotToast() { clearTimeout(shots.toastTimer); shots.toastTimer = null; if (shots.toasts) shots.toasts.textContent = ''; }
  function holdShotToast(seconds) { clearTimeout(shots.toastTimer); if (seconds) shots.toastTimer = setTimeout(dismissShotToast, seconds * 1000); }
  function shotToast(message, options) {
    options = options || {};
    if (!shots.toasts) { shots.toasts = document.createElement('div'); shots.toasts.className = 'mirror-shot-toasts'; shots.toasts.setAttribute('role', 'status'); shots.toasts.setAttribute('aria-live', 'polite'); shots.toasts.setAttribute('data-i18n-skip', ''); }
    if (shots.toasts.parentNode !== shotHost()) shotHost().appendChild(shots.toasts);
    shots.toasts.textContent = '';
    var toast = document.createElement('div'), label = document.createElement('span'), seconds = options.sticky ? 0 : options.error ? 8 : 10;
    toast.className = 'mirror-shot-toast' + (options.error ? ' is-error' : ''); label.className = 'mirror-shot-toast-text'; label.textContent = message; toast.appendChild(label);
    if (options.action) {
      var action = document.createElement('button'); action.type = 'button'; action.className = 'mirror-button mirror-primary'; action.textContent = options.action;
      action.addEventListener('click', function () { dismissShotToast(); options.onAction(); }); toast.appendChild(action);
    }
    toast.addEventListener('pointerenter', function () { holdShotToast(0); }); toast.addEventListener('pointerleave', function () { holdShotToast(4); });
    toast.addEventListener('focusin', function () { holdShotToast(0); }); toast.addEventListener('focusout', function () { holdShotToast(4); });
    shots.toasts.appendChild(toast); holdShotToast(seconds);
  }
  function announceShot(item, updated) { document.dispatchEvent(new CustomEvent('c122:media-item', { detail: { item: item, updated: !!updated } })); }
  function openShotAlbum() {
    var go = function () { if (C.openAlbum) C.openAlbum('screenshot'); else location.hash = '#album'; };
    if (document.fullscreenElement && document.exitFullscreen) Promise.resolve(document.exitFullscreen()).then(go, go); else go();
  }
  /* Saving needs the album code (or the admin login). Offer the code prompt instead of failing silently. */
  async function ensureShotMember() {
    if (C.state && C.state.member) return true;
    if (!C.ensureMember) return false;
    /* Prompts are appended to <body>; a fullscreen stage would hide them. */
    if (document.fullscreenElement && document.exitFullscreen) { try { await document.exitFullscreen(); } catch (_) {} }
    if (C.confirm) {
      var proceed = await C.confirm({ title: t('shotNeedCode', 'Цомгийн код шаардлагатай'), text: t('shotNeedCodeText', 'Screenshot-ыг ангийн цомогт хадгалахын тулд цомгийн 4 оронтой кодоо оруулна уу.'), ok: t('shotEnterCode', 'Код оруулах'), icon: 'lock' });
      if (!proceed) return false;
    }
    return !!(await C.ensureMember());
  }
  async function saveShot(frame, name) {
    var prepared = await fitShot(frame, name), retried = 0;
    for (;;) {
      var timer;
      try {
        var result = await Promise.race([
          C.api('upload_small', { query: { name: prepared.name, size: prepared.blob.size, lm: String(Date.now()) }, raw: prepared.blob, type: 'application/octet-stream' }),
          new Promise(function (_, reject) { timer = setTimeout(function () { var error = new Error(t('timeout', 'Холболт удааширлаа. Дахин холбогдож байна.')); error.status = 0; reject(error); }, 60000); })
        ]);
        return { item: result.item, blob: prepared.blob };
      } catch (error) {
        if (retried++ >= 1) throw error;
        if (error.status === 403) await C.refreshStatus();
        else if (error.status === 401 && error.data && error.data.locked) { if (!(await ensureShotMember())) throw shotError('cancelled'); }
        else if (error.status === 413) { C.state.chunkMax = Math.max(256 * 1024, Math.floor(prepared.blob.size / 2)); prepared = await fitShot(frame, name); }
        else throw error;
      } finally { clearTimeout(timer); }
    }
  }
  function shotMessage(error) {
    if (error && error.shot === 'tooLarge') return t('shotTooLarge', 'Screenshot хэт том байна. Дүрсний тохиргоог багасгаад дахин оролдоно уу.');
    if (error && error.shot === 'cancelled') return t('shotCancelled', 'Цомгийн код оруулаагүй тул screenshot хадгалагдсангүй.');
    if (error && error.message && !error.shot) return error.message;
    return t('shotFailed', 'Screenshot хадгалж чадсангүй. Дахин оролдоно уу.');
  }
  function flashShot(control) {
    control.flash.classList.remove('is-flash'); void control.flash.offsetWidth; control.flash.classList.add('is-flash');
    setTimeout(function () { control.flash.classList.remove('is-flash'); }, 700);
  }
  async function takeShot(control) {
    if (shots.busy) return;
    shots.busy = true;
    var frame = null;
    try {
      try { frame = await captureVideo(control.video); } catch (_) { shotToast(t('shotNoFrame', 'Дүрс бэлэн болоогүй байна. Хэдхэн секундийн дараа дахин оролдоно уу.'), { error: true }); return; }
      flashShot(control);
      if (!(await ensureShotMember())) { shotToast(t('shotCancelled', 'Цомгийн код оруулаагүй тул screenshot хадгалагдсангүй.'), { error: true }); return; }
      shots.saving = true; renderShots(); shotToast(t('shotSaving', 'Screenshot хадгалж байна…'), { sticky: true });
      var saved = await saveShot(frame, shotName()), item = saved.item;
      announceShot(item, false);
      if (!item.thumb && C.thumbs) C.thumbs.add({ name: item.name, kind: 'image', file: saved.blob, key: item.thumbKey, onDone: function (fresh) { announceShot(fresh, true); }, onFail: function () { announceShot(Object.assign({}, item, { raw: true }), true); } });
      shotToast(t('shotSaved', 'Screenshot цомогт хадгалагдлаа'), { action: t('shotView', 'Үзэх'), onAction: openShotAlbum });
    } catch (error) {
      shotToast(shotMessage(error), { error: true });
    } finally {
      if (frame) frame.canvas.width = frame.canvas.height = 0;
      shots.saving = false; shots.busy = false; renderShots();
    }
  }
  function setShotMenu(control, open, restoreFocus) {
    if (control.open === open) return;
    control.open = open; control.menu.hidden = !open; control.button.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) control.item.focus(); else if (restoreFocus) control.button.focus();
  }
  function createShotControl(stage, video, kind) {
    var wrap = document.createElement('div'), button = document.createElement('button'), menu = document.createElement('div'), item = document.createElement('button'), label = document.createElement('span'), flash = document.createElement('div');
    var id = 'mirror' + kind + 'Shot', control = { kind: kind, video: video, wrap: wrap, button: button, menu: menu, item: item, label: label, flash: flash, open: false };
    wrap.className = 'mirror-shot'; wrap.hidden = true;
    button.id = id + 'Button'; button.type = 'button'; button.className = 'mirror-shot-button'; button.innerHTML = SHOT_DOTS;
    button.setAttribute('aria-haspopup', 'menu'); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', id + 'Menu');
    menu.id = id + 'Menu'; menu.className = 'mirror-shot-menu'; menu.hidden = true; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-labelledby', button.id);
    item.type = 'button'; item.className = 'mirror-shot-item'; item.setAttribute('role', 'menuitem'); item.tabIndex = -1; item.innerHTML = SHOT_CAMERA;
    label.setAttribute('data-i18n-skip', ''); item.appendChild(label); menu.appendChild(item);
    flash.className = 'mirror-shot-flash'; flash.setAttribute('aria-hidden', 'true');
    wrap.appendChild(button); wrap.appendChild(menu); stage.appendChild(flash); stage.appendChild(wrap);
    button.addEventListener('click', function () { setShotMenu(control, !control.open, false); });
    button.addEventListener('keydown', function (event) { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setShotMenu(control, true, false); } });
    item.addEventListener('click', function () { setShotMenu(control, false, true); takeShot(control); });
    menu.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setShotMenu(control, false, true); }
      else if (event.key === 'Tab') setShotMenu(control, false, true);
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') { event.preventDefault(); item.focus(); }
    });
    wrap.addEventListener('focusout', function (event) { if (control.open && event.relatedTarget && !wrap.contains(event.relatedTarget)) setShotMenu(control, false, false); });
    shots.controls.push(control);
  }
  function renderShots() {
    if (!shots.controls.length) return;
    var ready = { Board: visible && mode === 'board' && board.media && !board.playBlocked && videoReady(elements.mirrorBoardVideo), Teacher: !!teacher.stream && videoReady(elements.mirrorTeacherPreview) };
    var menuLabel = t('shotMenu', 'Нэмэлт үйлдлүүд'), itemLabel = t('screenshot', 'SCREENSHOT');
    shots.controls.forEach(function (control) {
      var on = !!ready[control.kind];
      if (control.wrap.hidden === on) control.wrap.hidden = !on;
      if (!on) setShotMenu(control, false, false);
      if (control.button.getAttribute('aria-label') !== menuLabel) { control.button.setAttribute('aria-label', menuLabel); control.menu.setAttribute('aria-label', menuLabel); }
      if (control.label.textContent !== itemLabel) control.label.textContent = itemLabel;
      control.button.classList.toggle('is-busy', shots.saving); control.button.setAttribute('aria-busy', shots.saving ? 'true' : 'false'); control.item.disabled = shots.saving;
    });
  }
  function initShots() {
    createShotControl(elements.mirrorBoardStage, elements.mirrorBoardVideo, 'Board');
    createShotControl(elements.mirrorTeacherStage, elements.mirrorTeacherPreview, 'Teacher');
    ['loadeddata', 'playing', 'emptied', 'resize'].forEach(function (name) { elements.mirrorTeacherPreview.addEventListener(name, renderShots); });
    document.addEventListener('pointerdown', function (event) { shots.controls.forEach(function (control) { if (control.open && !control.wrap.contains(event.target)) setShotMenu(control, false, false); }); }, true);
    document.addEventListener('fullscreenchange', function () { if (shots.toasts && shots.toasts.parentNode) shotHost().appendChild(shots.toasts); });
  }

  function changeMode(next) { if (mode === next) return; stopBoard(); mode = next; render(); if (visible && mode === 'board') watchBoard(board.generation); }
  function init() {
    if (initialized) return true;
    var ids = ['mirrorBoardPanel', 'mirrorTeacherPanel', 'mirrorBoardMode', 'mirrorTeacherMode', 'mirrorTeacherLogin', 'mirrorTeacherSettings', 'mirrorLogin', 'mirrorTeacherLabel', 'mirrorSource', 'mirrorQuality', 'mirrorShareAudio', 'mirrorStart', 'mirrorStop', 'mirrorTeacherCount', 'mirrorTeacherMessage', 'mirrorTeacherPreview', 'mirrorSharingBadge', 'mirrorSharingTitle', 'mirrorSharingDetail', 'mirrorBadgeStop', 'mirrorBoardLabel', 'mirrorBoardState', 'mirrorBoardLive', 'mirrorBoardPlaceholder', 'mirrorBoardHint', 'mirrorBoardMessage', 'mirrorBoardVideo', 'mirrorAudio', 'mirrorFullscreen', 'mirrorBoardStage', 'mirrorSourceHelp', 'mirrorPlaybackPrompt', 'mirrorPlay', 'mirrorRetry', 'mirrorBoardDiagnostics', 'mirrorTeacherStage'];
    for (var i = 0; i < ids.length; i++) { elements[ids[i]] = document.getElementById(ids[i]); if (!elements[ids[i]]) return false; }
    initialized = true; document.body.appendChild(elements.mirrorSharingBadge); initShots();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) elements.mirrorSource.value = 'camera';
    elements.mirrorBoardMode.addEventListener('click', function () { changeMode('board'); }); elements.mirrorTeacherMode.addEventListener('click', function () { changeMode('teacher'); });
    elements.mirrorSource.addEventListener('change', render);
    elements.mirrorLogin.addEventListener('click', function () { if (C.login) C.login({ title: authText('teacherTitle', 'Багш нэвтрэх'), message: authText('teacherMessage', 'Дэлгэцээ ангитай хуваалцахын тулд удирдлагын нууц үгээ оруулна уу.') }).then(function (ok) { if (ok) { setTeacherMessage('loginReady', 'Нэвтэрлээ. «Хуваалцаж эхлэх» дарж үзүүлэх зүйлээ сонгоно.'); render(); } }); });
    elements.mirrorStart.addEventListener('click', startTeacher);
    elements.mirrorStop.addEventListener('click', function () { stopTeacher(); }); elements.mirrorBadgeStop.addEventListener('click', function () { stopTeacher(); });
    elements.mirrorPlay.addEventListener('click', function () { playBoard(board.generation, true); });
    elements.mirrorRetry.addEventListener('click', function () { if (!board.local) { board.recoveries = 0; restartBoard(board.generation, 'boardReconnecting', 'Холболтыг сэргээж байна.', 0); } });
    ['loadeddata', 'playing', 'timeupdate'].forEach(function (event) { elements.mirrorBoardVideo.addEventListener(event, function () { samplePlayback(board.generation); }); });
    elements.mirrorBoardVideo.addEventListener('error', function () { if (visible && mode === 'board' && board.sessionId && !board.local) restartBoard(board.generation, 'decodeFailed', 'Хөтөч дүрсийг тоглуулж чадсангүй. Шинээр холбогдож байна.', backoff(board.recoveries++)); });
    elements.mirrorAudio.addEventListener('click', async function () {
      if (!board.audio || board.local) return; var video = elements.mirrorBoardVideo; video.muted = !video.muted;
      try { await video.play(); render(); } catch (_) { video.muted = true; setBoardMessage('audioBlocked', 'Дуу тоглуулахыг хөтөч зөвшөөрөөгүй. Дахин «Дууг сонсох» дарна уу.'); }
    });
    elements.mirrorFullscreen.addEventListener('click', function () { var stage = elements.mirrorBoardStage; if (stage.requestFullscreen) Promise.resolve(stage.requestFullscreen()).catch(function () { setBoardMessage('fullscreenBlocked', 'Бүтэн дэлгэц нээгдсэнгүй. Хөтчийн бүтэн дэлгэцийн товчийг ашиглаж болно.'); }); else setBoardMessage('fullscreenUnsupported', 'Энэ хөтөч бүтэн дэлгэцийг дэмжихгүй байна.'); });
    document.addEventListener('c122:auth', function () { if (!admin() && (teacher.stream || teacher.starting)) stopTeacher('authLost', 'Багшийн нэвтрэлт дууслаа.'); else render(); });
    document.addEventListener('c122:language', render);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState !== 'hidden' && visible && mode === 'board') { board.visibilityAt = Date.now(); playBoard(board.generation, false); monitorBoard(board.generation, 2000); } });
    window.addEventListener('pagehide', function () { visible = false; stopBoard(); if (teacher.stream || teacher.starting) stopTeacher('stopped', 'Хуваалцалт дууслаа.'); });
    window.addEventListener('pageshow', function (event) { if (event.persisted && document.body.getAttribute('data-tab') === 'teachermirror') { visible = true; board.lastStatus = 0; render(); if (mode === 'board') watchBoard(board.generation); } });
    window.addEventListener('online', function () { if (visible && mode === 'board') { board.lastStatus = 0; scheduleBoard(board.generation, 0); } });
    render(); return true;
  }
  C.TeacherMirror = {
    show: function () { if (!init()) return; if (visible) { render(); return; } visible = true; board.lastStatus = 0; render(); if (mode === 'board') watchBoard(board.generation); },
    hide: function () { visible = false; if (initialized) stopBoard(); }
  };
})();

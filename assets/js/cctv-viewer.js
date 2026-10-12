/* Teacher-only live viewing. No camera capture, recording or media storage. */
(function () {
  'use strict';
  var boot = window.C122_CCTV || {}, csrf = boot.adminCsrf || '';
  var loginForm = document.getElementById('cctvLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = loginForm.querySelector('button'), message = document.getElementById('cctvLoginMessage');
      button.disabled = true; message.textContent = 'Нэвтэрч байна…';
      try {
        var response = await fetch(boot.loginApi + '?action=login', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: document.getElementById('cctvPassword').value }) });
        var data = await response.json();
        if (!response.ok || !data.ok || !data.admin) throw new Error(data.error || 'Нэвтрэх боломжгүй байна.');
        document.getElementById('cctvPassword').value = ''; window.location.reload();
      } catch (error) { message.textContent = error.message || 'Холболтоо шалгаад дахин оролдоорой.'; message.classList.add('is-error'); button.disabled = false; }
    });
  }
  if (!boot.admin || boot.role !== 'viewer') return;

  var video = document.getElementById('cctvVideo'), stage = document.getElementById('cctvStage');
  if (!video || !stage) return;
  var startButton = document.getElementById('cctvStartView'), stopButton = document.getElementById('cctvStopView');
  var listenButton = document.getElementById('cctvListen'), volume = document.getElementById('cctvVolume');
  var fullButton = document.getElementById('cctvFullscreen'), revokeButton = document.getElementById('cctvRevoke');
  var message = document.getElementById('cctvViewerMessage'), placeholder = document.getElementById('cctvPlaceholder');
  var dashboard = null, active = null, epoch = 0, joining = false, intent = false, closed = false, authLost = false;
  var retryCount = 0, pollTimer = 0, dashboardTimer = 0, reconnectTimer = 0, waitTimer = 0, clockTimer = 0;
  var audioWanted = false, pendingRequests = new Set();
  video.muted = true; video.volume = .7;

  function text(id, value) { document.getElementById(id).textContent = value; }
  function notice(value, error) { message.textContent = value; message.classList.toggle('is-error', !!error); }
  function controls() {
    startButton.disabled = closed || authLost || joining || !!active || !dashboard || !dashboard.live || !window.C122CCTVPeer || !window.RTCPeerConnection;
    stopButton.disabled = !active && !joining && !intent;
    listenButton.disabled = !active;
    revokeButton.disabled = closed || authLost || !dashboard || !dashboard.paired;
    listenButton.textContent = video.muted ? 'Дууг сонсох' : 'Дууг хаах';
    listenButton.setAttribute('aria-pressed', String(!video.muted));
  }
  function viewState(state, hint) {
    var connected = state === 'live';
    placeholder.hidden = connected; document.getElementById('cctvViewingBadge').hidden = !connected;
    text('cctvConnection', connected ? 'Шууд холбогдсон' : state === 'connecting' ? 'Холбогдож байна' : state === 'reconnecting' ? 'Дахин холбогдож байна' : state === 'error' ? 'Холболтын алдаа' : 'Үзэж эхлээгүй');
    text('cctvStageTitle', state === 'connecting' ? 'Дүрсийг холбож байна' : state === 'reconnecting' ? 'Дахин холбогдож байна' : state === 'error' ? 'Дүрс холбогдсонгүй' : dashboard && dashboard.live ? 'Камер ажиллаж байна' : 'Камер одоогоор OFFLINE');
    text('cctvStageHint', hint || (dashboard && dashboard.live ? '«Үзэж эхлэх» товчийг дарна уу.' : 'Ангийн дэлгэц дээр камер эхлүүлсний дараа энд дүрс гарна.'));
    controls();
  }
  async function api(action, body, externalSignal) {
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 20000);
    pendingRequests.add(controller);
    var onAbort = function () { controller.abort(); };
    if (externalSignal) externalSignal.addEventListener('abort', onAbort, { once: true });
    var options = { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: {} };
    if (body !== undefined) { options.headers['Content-Type'] = 'application/json'; options.headers['X-CSRF'] = csrf; options.body = JSON.stringify(body); }
    try {
      var response = await fetch(boot.apiUrl + '?action=' + action, options), data;
      try { data = await response.json(); } catch (_) { throw new Error('Серверийн хариуг унших боломжгүй байна.'); }
      if (!response.ok || !data.ok) {
        var error = new Error(data.error || 'Камерын хүсэлт амжилтгүй боллоо.'); error.status = response.status; error.code = data.code || ''; error.retryAfter = Number(data.retryAfter || response.headers.get('Retry-After') || 0); throw error;
      }
      if (typeof data.csrf === 'string' && data.csrf) csrf = data.csrf;
      return data;
    } finally {
      clearTimeout(timer); pendingRequests.delete(controller);
      if (externalSignal) externalSignal.removeEventListener('abort', onAbort);
    }
  }
  function leave(viewer, beacon) {
    if (!viewer || !viewer.viewerId) return;
    var body = { sessionId: viewer.sessionId, viewerId: viewer.viewerId, csrf: csrf };
    if (beacon && navigator.sendBeacon) {
      try { if (navigator.sendBeacon(boot.apiUrl + '?action=leave', new Blob([JSON.stringify(body)], { type: 'application/json' }))) return; } catch (_) {}
    }
    return api('leave', body).catch(function () {});
  }
  function stopViewer(notifyServer, preserveIntent) {
    ++epoch; joining = false; var previous = active; active = null;
    clearTimeout(pollTimer); clearTimeout(reconnectTimer); clearTimeout(waitTimer);
    if (!preserveIntent) { intent = false; retryCount = 0; audioWanted = false; }
    if (previous) { previous.pollAbort.abort(); previous.peer.close(); if (notifyServer) leave(previous, false); }
    video.pause(); video.srcObject = null; video.muted = true;
    viewState('idle');
  }
  function loseAuth(error) {
    authLost = true; stopViewer(true, false); clearTimeout(dashboardTimer);
    notice(error.message || 'Багшийн нэвтрэлт дууслаа. Хуудсаа дахин нээгээд нэвтэрнэ үү.', true);
    controls();
  }
  function accessError(error) {
    if (error.status === 401 || error.code === 'teacher_required') { loseAuth(error); return true; }
    if (error.code === 'viewer_not_owned') { stopViewer(false, false); viewState('error', error.message); notice(error.message, true); return true; }
    return false;
  }
  function heartbeatAge() {
    if (!dashboard || !dashboard.lastHeartbeat) { text('cctvHeartbeat', '—'); return; }
    var seconds = Math.max(0, Math.floor(Date.now() / 1000) - Number(dashboard.lastHeartbeat));
    text('cctvHeartbeat', seconds < 5 ? 'Дөнгөж сая' : seconds < 60 ? seconds + ' секундийн өмнө' : Math.floor(seconds / 60) + ' минутын өмнө');
  }
  function updateDashboard(data) {
    dashboard = data;
    text('cctvDeviceLabel', data.paired ? data.deviceLabel || 'Ангийн дэлгэц' : 'Дэлгэц холбоогүй');
    var badge = document.getElementById('cctvLiveBadge'); badge.classList.toggle('is-live', !!data.live); badge.querySelector('span').textContent = data.live ? 'LIVE' : 'OFFLINE';
    var started = Number(data.startedAt); text('cctvStartedAt', started > 0 ? new Date(started * 1000).toLocaleString('mn-MN', { timeZone: 'Asia/Ulaanbaatar', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
    text('cctvViewerCount', Math.max(0, Number(data.viewers) || 0) + ' / 4'); heartbeatAge();
    function deviceDate(value) { return value ? new Date(Number(value) * 1000).toLocaleString('mn-MN', {timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'; }
    [['cctvRegisteredAt',data.deviceRegisteredAt],['cctvExpiresAt',data.deviceExpiresAt],['cctvDeviceLastSeen',data.deviceLastSeenAt]].forEach(function (entry) { var node = document.getElementById(entry[0]); if (node) node.textContent = deviceDate(entry[1]); });
    text('cctvDeviceHelp', data.paired ? (data.turnConfigured ? 'Нэг дэлгэц бүртгэлтэй. Эхлүүлэхийг нэг удаа дарсны дараа шинэчлэх, дахин нээхэд автоматаар холбогдоно.' : 'Нэг дэлгэц бүртгэлтэй. Эхлүүлэхийг нэг удаа дарсны дараа автоматаар холбогдоно. Өөр сүлжээнд холболтгүй бол TURN тохиргоо шаардлагатай.') : 'Ангийн дэлгэц дээр тохиргооны хуудсыг нээгээд USB камер, микрофоноо сонгоно.');
    if (active && (!data.live || data.sessionId !== active.sessionId)) reconnect(data.live ? 'Камерын шинэ холболттой дахин холбогдож байна.' : 'Камер дахин ажиллахыг хүлээж байна.');
    else if (intent && data.live && !active && !joining && !reconnectTimer) startViewer(true);
    if (!active && !joining && !intent) viewState('idle');
    controls();
  }
  async function loadDashboard() {
    if (closed || authLost) return;
    try { updateDashboard(await api('dashboard')); }
    catch (error) { if (!accessError(error)) notice(error.message || 'Сүлжээ тасарлаа. Дахин шалгаж байна.', true); }
    if (!closed && !authLost) dashboardTimer = setTimeout(loadDashboard, 10000);
  }
  function reconnect(reason) {
    if (!intent || closed || authLost || reconnectTimer) return;
    var wait = [1000, 2000, 4000, 8000, 15000, 30000][Math.min(retryCount++, 5)];
    stopViewer(true, true); viewState('reconnecting', reason || 'Сүлжээг сэргээж байна.'); notice('Холболт тасарлаа. Дахин холбогдож байна.');
    reconnectTimer = setTimeout(function () { reconnectTimer = 0; startViewer(true); }, wait);
  }
  async function poll(viewer, generation) {
    if (closed || generation !== epoch || active !== viewer) return;
    try {
      var query = 'poll&role=viewer&sessionId=' + encodeURIComponent(viewer.sessionId) + '&viewerId=' + encodeURIComponent(viewer.viewerId) + '&since=' + viewer.cursor;
      var data = await api(query, undefined, viewer.pollAbort.signal);
      if (generation !== epoch || active !== viewer) return;
      if (Array.isArray(data.iceServers)) viewer.peer.updateIceServers(data.iceServers);
      for (var i = 0; i < (data.events || []).length; i++) {
        if (generation !== epoch || active !== viewer) return;
        var event = data.events[i];
        if (event.type === 'offer') await viewer.peer.acceptOffer(event.data);
        else if (event.type === 'candidate') await viewer.peer.addCandidate(event.data);
      }
      if (generation !== epoch || active !== viewer) return;
      viewer.cursor = Math.max(viewer.cursor, Number(data.cursor) || 0);
      text('cctvViewerCount', Math.max(0, Number(data.viewers) || 0) + ' / 4');
      pollTimer = setTimeout(function () { poll(viewer, generation); }, 1000);
    } catch (error) {
      if (generation !== epoch || active !== viewer || closed) return;
      if (!accessError(error)) reconnect(error.code === 'session_ended' ? 'Камер дахин ажиллахыг хүлээж байна.' : error.message);
    }
  }
  async function startViewer(retry) {
    if (joining || active || closed || authLost) return;
    if (!retry) { intent = true; retryCount = 0; }
    var generation = ++epoch; joining = true; viewState(retry ? 'reconnecting' : 'connecting'); notice('Шууд дүрстэй холбогдож байна…');
    try {
      var state = await api('dashboard');
      if (generation !== epoch || closed) return;
      updateDashboard(state);
      if (!state.live || !state.sessionId) { joining = false; reconnect('Камер OFFLINE байна. Дахин ажиллахыг хүлээж байна.'); return; }
      var joined = await api('join', { sessionId: state.sessionId });
      var viewer = { viewerId: joined.viewerId, sessionId: state.sessionId, cursor: 0, pollAbort: new AbortController(), peer: null };
      if (generation !== epoch || closed) { leave(viewer, closed); return; }
      if (!window.C122CCTVPeer || !window.RTCPeerConnection) { leave(viewer, false); throw new Error('Энэ хөтөч шууд дүрсний WebRTC холболт дэмжихгүй байна. Chrome эсвэл Edge ашиглана уу.'); }
      viewer.peer = window.C122CCTVPeer.create({
        iceServers: joined.iceServers || [],
        onSignal: function (type, data) { if (generation !== epoch || active !== viewer) return Promise.resolve(); return api('signal', { sessionId: viewer.sessionId, viewerId: viewer.viewerId, role: 'viewer', type: type, data: data }); },
        onTrack: function (event) {
          if (generation !== epoch || active !== viewer) return;
          var stream = event.streams && event.streams[0];
          if (!stream) { stream = video.srcObject || new MediaStream(); if (!stream.getTracks().includes(event.track)) stream.addTrack(event.track); }
          video.srcObject = stream; video.muted = !audioWanted;
          video.play().catch(function () { if (generation !== epoch || active !== viewer) return; video.muted = true; audioWanted = false; controls(); notice('Дүрс холбогдсон. Дууг сонсохын тулд «Дууг сонсох» товчийг дарна уу.'); });
        },
        onState: function (state) {
          if (generation !== epoch || active !== viewer) return;
          if (state === 'connected' || state === 'completed') { clearTimeout(reconnectTimer); reconnectTimer = 0; clearTimeout(waitTimer); retryCount = 0; viewState('live'); notice(audioWanted ? 'Ангийн шууд дүрс, дуу холбогдлоо.' : 'Ангийн шууд дүрс холбогдлоо. Дуу анхдагчаар хаалттай.'); }
          else if (state === 'failed' || state === 'closed') reconnect('Сүлжээний холболтыг сэргээж байна.');
          else if (state === 'disconnected') { clearTimeout(waitTimer); waitTimer = setTimeout(function () { reconnect('Сүлжээ түр тасарлаа.'); }, 5000); }
        },
        onError: function (error) { if (generation === epoch && active === viewer) reconnect(error.message); }
      });
      active = viewer; joining = false; controls();
      waitTimer = setTimeout(function () { if (generation === epoch && active === viewer) reconnect('Камерын хариуг дахин хүлээж байна.'); }, 20000);
      poll(viewer, generation);
    } catch (error) {
      if (generation !== epoch || closed) return;
      if (viewer && active !== viewer) leave(viewer, false);
      joining = false;
      if (accessError(error)) return;
      else if (retry && error.status !== 403) reconnect(error.message);
      else { stopViewer(true, false); viewState('error', error.message); notice(error.message || 'Холбогдох боломжгүй байна. Дахин оролдоорой.', true); }
    }
  }
  startButton.addEventListener('click', function () { startViewer(false); });
  stopButton.addEventListener('click', function () { stopViewer(true, false); notice('Та үзэхээ зогсоолоо. Ангийн камер үргэлжлэн ажиллана.'); });
  listenButton.addEventListener('click', async function () {
    if (!active) return;
    var generation = epoch, viewer = active;
    audioWanted = video.muted; video.muted = !audioWanted; controls();
    if (audioWanted) {
      try { await video.play(); if (generation === epoch && active === viewer) notice('Шууд дууг сонсож байна.'); }
      catch (_) { if (generation !== epoch || active !== viewer) return; audioWanted = false; video.muted = true; controls(); notice('Хөтөч дууг эхлүүлсэнгүй. «Дууг сонсох» товчийг дахин дарна уу.', true); }
    }
    else notice('Дууг хаалаа. Дүрс үргэлжлэн тоглож байна.');
  });
  volume.addEventListener('input', function () { video.volume = Math.max(0, Math.min(1, Number(volume.value) / 100)); });
  fullButton.addEventListener('click', async function () {
    try { if (document.fullscreenElement === stage) await document.exitFullscreen(); else if (stage.requestFullscreen) await stage.requestFullscreen(); else notice('Энэ хөтөч бүтэн дэлгэц дэмжихгүй байна.', true); }
    catch (_) { notice('Бүтэн дэлгэц рүү шилжих боломжгүй байна.', true); }
  });
  revokeButton.addEventListener('click', async function () {
    revokeButton.disabled = true;
    try { await api('revoke', {}); document.dispatchEvent(new CustomEvent('c122:cctv-device-removed')); stopViewer(false, false); updateDashboard(await api('dashboard')); notice('Ангийн дэлгэцийн зөвшөөрлийг цуцаллаа. Дахин ашиглах бол дэлгэцийг шинээр холбоно.'); }
    catch (error) { if (!accessError(error)) notice(error.message, true); }
    controls();
  });
  window.addEventListener('pagehide', function () {
    closed = true; var previous = active; stopViewer(false, false);
    clearTimeout(dashboardTimer); clearInterval(clockTimer);
    pendingRequests.forEach(function (controller) { controller.abort(); });
    leave(previous, true);
  });
  window.addEventListener('pageshow', function (event) { if (event.persisted) window.location.reload(); });
  clockTimer = setInterval(heartbeatAge, 1000); controls(); loadDashboard();
})();

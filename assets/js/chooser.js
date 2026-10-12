/* CHOOSER — the class camera scans faces, then randomly picks one and zooms in: "СОНГОГДЛОО!".
   A fun pick-a-student game. Faces are processed locally in the browser; nothing is uploaded or saved. */
(function () {
  'use strict';
  var C = window.C122; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var T = function (key, fallback) { return window.C122I18n ? window.C122I18n.t(key, fallback) : fallback; };
  var sfx = function (n) { if (state.visible && !document.hidden && C.SFX) C.SFX.play(n); };
  var FACEAPI = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
  var MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
  var state = { visible:false, stream:null, detector:null, kind:null, raf:0, faces:[], scanning:false, chosen:null, ready:false, started:false, loadingModel:false, detectorPromise:null, scanTimer:0, detectTimer:0, epoch:0, starting:false };

  function setMsg(msg) { var el = $('chooserMsg'); if (el) el.textContent = msg || ''; }
  function setPhase(p) { var v = $('view-chooser'); if (v) v.setAttribute('data-phase', p); }

  /* ---- face detection backends ---- */
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = function () { rej(new Error('load')); }; document.head.appendChild(s); });
  }
  function initDetector() {
    if (state.detector) return Promise.resolve(state.detector);
    if (state.detectorPromise) return state.detectorPromise;
    if (window.FaceDetector) {   // native (fast, no download) where available
      try { var fd = new window.FaceDetector({ fastMode:true, maxDetectedFaces:30 }); state.detector = fd; state.kind = 'native'; return Promise.resolve(fd); } catch (e) {}
    }
    state.loadingModel = true; setMsg(T('chooser.loading','Царай таних хэрэгслийг ачаалж байна…'));
    var p = (window.faceapi ? Promise.resolve() : loadScript(FACEAPI))
      .then(function () { return window.faceapi.nets.tinyFaceDetector.loadFromUri(MODELS); })
      .then(function () { state.detector = window.faceapi; state.kind = 'faceapi'; state.loadingModel = false; return state.detector; })
      .catch(function (e) { state.loadingModel = false; throw e; });
    state.detectorPromise = p;
    p.catch(function () { state.detectorPromise = null; });
    return p;
  }
  function detectFaces() {
    var video = $('chooserVideo');
    if (!video || !video.videoWidth) return Promise.resolve([]);
    if (state.kind === 'native') {
      return state.detector.detect(video).then(function (list) {
        return list.map(function (f) { var b = f.boundingBox; return { x:b.x, y:b.y, w:b.width, h:b.height }; });
      }).catch(function () { return []; });
    }
    return state.detector.detectAllFaces(video, new state.detector.TinyFaceDetectorOptions({ inputSize:320, scoreThreshold:0.4 }))
      .then(function (list) { return list.map(function (d) { var b = d.box; return { x:b.x, y:b.y, w:b.width, h:b.height }; }); })
      .catch(function () { return []; });
  }

  /* ---- camera ---- */
  function startCamera(epoch) {
    if (state.stream) return Promise.resolve();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error(T('chooser.noCam','Энэ төхөөрөмж дээр камер ашиглах боломжгүй байна.')));
    return navigator.mediaDevices.getUserMedia({ video:{ width:{ ideal:1280 }, height:{ ideal:720 }, facingMode:'user' }, audio:false })
      .then(function (stream) { if (!state.visible || epoch !== state.epoch) { stream.getTracks().forEach(function (track) { track.stop(); }); return; } state.stream = stream; var v = $('chooserVideo'); v.srcObject = stream; return v.play().catch(function () {}); });
  }
  function stopCamera() {
    clearInterval(state.scanTimer); state.scanTimer = 0; clearTimeout(state.detectTimer); state.detectTimer = 0; state.scanning = false;
    if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
    if (state.stream) { state.stream.getTracks().forEach(function (t) { t.stop(); }); state.stream = null; }
    var v = $('chooserVideo'); if (v) v.srcObject = null;
  }

  /* ---- draw boxes / spotlight ---- */
  function drawLoop() {
    var video = $('chooserVideo'), canvas = $('chooserCanvas');
    if (!video || !canvas) return;
    var ctx = canvas.getContext('2d');
    function frame() {
      state.raf = requestAnimationFrame(frame);
      if (!video.videoWidth) return;
      if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (state.chosen) return;   // chosen overlay is handled by zoom, stop drawing boxes
      state.faces.forEach(function (f, i) {
        var active = state.scanning && i === state.highlight;
        ctx.lineWidth = Math.max(3, canvas.width / 220);
        ctx.strokeStyle = active ? '#14b866' : 'rgba(255,255,255,.75)';
        ctx.shadowColor = active ? 'rgba(20,184,102,.9)' : 'transparent'; ctx.shadowBlur = active ? 24 : 0;
        roundRect(ctx, f.x, f.y, f.w, f.h, Math.min(f.w, f.h) * 0.18); ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }
    frame();
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function detectLoop() {
    if (!state.visible || !state.stream) return;
    var epoch = state.epoch;
    detectFaces().then(function (faces) { if (epoch === state.epoch && state.visible && !state.chosen) state.faces = faces; }).finally(function () {
      if (epoch === state.epoch && state.visible && state.stream && !state.chosen) state.detectTimer = setTimeout(detectLoop, 250);
    });
  }

  /* ---- the game ---- */
  function choose() {
    if (state.scanning || state.chosen || !state.stream) return;
    if (!state.faces.length) { setMsg(T('chooser.moveIn','Камерт царай харагдахгүй байна. Ойртоно уу.')); return; }
    state.scanning = true; setPhase('scanning'); setMsg(T('chooser.scanning','Сонгож байна…'));
    sfx('scanStart');
    var elapsed = 0, step = 110;
    state.scanTimer = setInterval(function () {
      elapsed += step;
      state.highlight = Math.floor(Math.random() * Math.max(1, state.faces.length));
      sfx('tick');
      if (!state.visible || !state.stream) { clearInterval(state.scanTimer); state.scanTimer = 0; return; }
      if (elapsed >= 3000) { clearInterval(state.scanTimer); state.scanTimer = 0; lockChoice(); }
    }, step);
  }
  function lockChoice() {
    if (!state.visible || !state.stream) return;
    state.scanning = false;
    var faces = state.faces;
    if (!faces.length) { setPhase('ready'); setMsg(T('chooser.lost','Царай алга болсон. Дахин оролдоно уу.')); return; }
    var pick = faces[Math.floor(Math.random() * faces.length)];
    state.chosen = pick;
    zoomTo(pick);
    setPhase('chosen'); setMsg('');
    $('chooserBanner').hidden = false; $('chooserBanner').classList.remove('pop'); void $('chooserBanner').offsetWidth; $('chooserBanner').classList.add('pop');
    sfx('chosen');
    burst();
  }
  function zoomTo(f) {
    var video = $('chooserVideo'), wrap = $('chooserStage');
    var vw = video.videoWidth, vh = video.videoHeight; if (!vw) return;
    // the video is object-fit:cover inside the stage; compute scale/translate to center the face and enlarge
    var cx = (f.x + f.w / 2) / vw, cy = (f.y + f.h / 2) / vh;
    var zoom = Math.max(1.8, Math.min(3.2, 0.42 / Math.max(f.w / vw, f.h / vh)));
    video.style.transformOrigin = (cx * 100) + '% ' + (cy * 100) + '%';
    video.style.transform = 'scale(' + zoom.toFixed(2) + ')';
    $('chooserCanvas').style.opacity = '0';
  }
  function reset() {
    clearInterval(state.scanTimer); state.scanTimer = 0; clearTimeout(state.detectTimer); state.detectTimer = 0;
    state.chosen = null; state.scanning = false; state.highlight = -1;
    var v = $('chooserVideo'); if (v) { v.style.transform = ''; }
    $('chooserCanvas').style.opacity = '1'; $('chooserBanner').hidden = true;
    setPhase(state.stream ? 'ready' : 'idle'); setMsg('');
    if (state.stream) detectLoop();
  }
  function burst() {
    var layer = $('chooserConfetti'); if (!layer) return; layer.innerHTML = '';
    var colors = ['#14b866','#f0a90b','#e5484d','#3b82f6','#30a46c'];
    for (var i = 0; i < 90; i++) { var s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = colors[i % colors.length]; s.style.animationDelay = (Math.random() * 0.3) + 's'; s.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)'; layer.appendChild(s); }
    setTimeout(function () { layer.innerHTML = ''; }, 2600);
  }

  function begin() {
    if (state.started || state.starting) return;
    var epoch = ++state.epoch; state.starting = true;
    setMsg(T('chooser.starting','Камер асааж байна…'));
    Promise.all([startCamera(epoch), initDetector()]).then(function () {
      if (epoch !== state.epoch || !state.visible || !state.stream) return;
      state.starting = false; state.started = true; state.ready = true; setPhase('ready'); setMsg(T('chooser.ready','Бэлэн! «Сонгох» дарна уу.'));
      drawLoop(); detectLoop();
    }).catch(function (error) {
      if (epoch !== state.epoch) return; state.starting = false;
      var denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setPhase('idle'); setMsg(denied ? T('chooser.denied','Камерын зөвшөөрөл өгөөгүй байна. Хөтчийн зөвшөөрлийг нээнэ үү.') : (error && error.message) || T('chooser.failed','Камер эсвэл царай таних хэрэгсэл ачаалагдсангүй.'));
      stopCamera();
    });
  }

  function bind() {
    if (state.bound) return; state.bound = true;
    $('chooserStart').onclick = begin;
    $('chooserChoose').onclick = choose;
    $('chooserAgain').onclick = reset;
  }

  C.Chooser = {
    show:function () { state.visible = true; bind(); setPhase(state.stream ? 'ready' : 'idle'); if (state.stream) { drawLoop(); detectLoop(); } },
    hide:function () { state.visible = false; state.epoch++; state.starting = false; if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; } /* keep camera stream paused */ stopCamera(); state.started = false; reset(); }
  };
})();

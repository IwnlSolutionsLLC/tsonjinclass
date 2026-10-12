/* CHOOSER — the class camera scans faces, then randomly picks one and zooms in: "СОНГОГДЛОО!".
   A fun pick-a-student game. Faces are processed locally in the browser; nothing is uploaded or saved. */
(function () {
  'use strict';
  var C = window.C122; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var T = function (key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  };
  var sfx = function (n, o) { if (state.visible && !document.hidden && C.SFX) C.SFX.play(n, o); };
  var FACEAPI = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
  var MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
  var SCAN_MS = 3000;
  var state = { visible:false, bound:false, stream:null, detector:null, kind:null, raf:0, faces:[], scanning:false, highlight:-1, chosen:null, started:false, detectorPromise:null,
    scanTimer:0, detectTimer:0, countTimer:0, loopActive:false, epoch:0, starting:false, facing:'user', cameras:0 };

  function setMsg(msg) { var el = $('chooserMsg'); if (el) el.textContent = msg || ''; }
  function setPhase(p) { var v = $('view-chooser'); if (v) v.setAttribute('data-phase', p); }
  function mirrored() { return state.facing === 'user'; }
  function setCount() {
    var el = $('chooserCount'); if (!el) return;
    var n = state.faces.length;
    el.textContent = n ? T('chooser.faces', '{count} царай', { count:n }) : T('chooser.noFaces', 'Царай хайж байна…');
    el.classList.toggle('has-faces', n > 0);
  }

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
    setMsg(T('chooser.loading', 'Царай таних хэрэгслийг ачаалж байна…'));
    var p = (window.faceapi ? Promise.resolve() : loadScript(FACEAPI))
      .then(function () { return window.faceapi.nets.tinyFaceDetector.loadFromUri(MODELS); })
      .then(function () { state.detector = window.faceapi; state.kind = 'faceapi'; return state.detector; });
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
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error(T('chooser.noCam', 'Энэ төхөөрөмж дээр камер ашиглах боломжгүй байна.')));
    return navigator.mediaDevices.getUserMedia({ video:{ width:{ ideal:1280 }, height:{ ideal:720 }, facingMode:state.facing }, audio:false })
      .then(function (stream) {
        if (!state.visible || epoch !== state.epoch) { stream.getTracks().forEach(function (track) { track.stop(); }); return; }
        state.stream = stream; var v = $('chooserVideo'); v.srcObject = stream;
        $('chooserStage').classList.toggle('is-mirrored', mirrored());
        countCameras();
        return v.play().catch(function () {});
      });
  }
  function countCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then(function (list) {
      state.cameras = list.filter(function (d) { return d.kind === 'videoinput'; }).length;
      $('chooserFlip').hidden = state.cameras < 2;
    }).catch(function () {});
  }
  function stopCamera() {
    clearTimeout(state.scanTimer); state.scanTimer = 0; clearTimeout(state.detectTimer); state.detectTimer = 0; clearInterval(state.countTimer); state.countTimer = 0; state.scanning = false; state.loopActive = false;
    if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
    if (state.stream) { state.stream.getTracks().forEach(function (t) { t.stop(); }); state.stream = null; }
    var v = $('chooserVideo'); if (v) v.srcObject = null;
  }

  /* ---- draw face brackets ---- */
  function drawLoop() {
    var video = $('chooserVideo'), canvas = $('chooserCanvas');
    if (!video || !canvas || state.raf) return;
    var ctx = canvas.getContext('2d');
    function frame() {
      state.raf = requestAnimationFrame(frame);
      if (!video.videoWidth) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (state.chosen) return;   // the zoom + spotlight take over
      var unit = Math.max(2, canvas.width / 320), t = performance.now() / 1000;
      state.faces.forEach(function (f, i) {
        var active = state.scanning && i === state.highlight, dim = state.scanning && !active;
        var pad = Math.min(f.w, f.h) * (active ? 0.16 : 0.1);
        var x = f.x - pad, y = f.y - pad, w = f.w + pad * 2, h = f.h + pad * 2;
        if (active) { ctx.fillStyle = 'rgba(20,220,130,.18)'; roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.2); ctx.fill(); }
        ctx.lineWidth = unit * (active ? 2.6 : 1.4);
        ctx.strokeStyle = active ? '#3dffa8' : dim ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,' + (0.7 + Math.sin(t * 3 + i) * 0.2).toFixed(2) + ')';
        ctx.shadowColor = active ? 'rgba(61,255,168,.95)' : 'transparent'; ctx.shadowBlur = active ? unit * 10 : 0;
        brackets(ctx, x, y, w, h, Math.min(w, h) * 0.28);
        ctx.shadowBlur = 0;
        label(ctx, String(i + 1), x + w / 2, y - unit * 6, unit, active);
      });
    }
    frame();
  }
  function brackets(ctx, x, y, w, h, l) {
    ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(x, y + l); ctx.lineTo(x, y); ctx.lineTo(x + l, y);
    ctx.moveTo(x + w - l, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + l);
    ctx.moveTo(x + w, y + h - l); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - l, y + h);
    ctx.moveTo(x + l, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - l);
    ctx.stroke();
  }
  function label(ctx, text, cx, cy, unit, active) {
    var r = unit * 7;
    ctx.save(); ctx.translate(cx, cy);
    if (mirrored()) ctx.scale(-1, 1);   // the canvas is mirrored with the video; keep the digits readable
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = active ? '#3dffa8' : 'rgba(10,25,18,.72)'; ctx.fill();
    ctx.fillStyle = active ? '#06281a' : '#fff'; ctx.font = '800 ' + Math.round(r * 1.1) + 'px Manrope, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, r * 0.06); ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function detectLoop() {
    if (!state.visible || !state.stream || state.loopActive) return;
    state.loopActive = true; var epoch = state.epoch;
    (function tick() {
      if (epoch !== state.epoch) return;   // a newer camera session owns the loop
      if (!state.visible || !state.stream || state.chosen) { state.loopActive = false; return; }
      detectFaces().then(function (faces) { if (epoch === state.epoch && !state.chosen) { state.faces = faces; setCount(); } }).finally(function () {
        if (epoch === state.epoch) state.detectTimer = setTimeout(tick, 220);
      });
    })();
  }

  /* ---- the game ---- */
  function choose() {
    if (state.scanning || state.chosen || !state.stream) return;
    if (!state.faces.length) { setMsg(T('chooser.moveIn', 'Камерт царай харагдахгүй байна. Ойртоно уу.')); sfx('nope'); return; }
    state.scanning = true; setPhase('scanning'); setMsg(T('chooser.scanning', 'Хэн байх бол…? 🥁'));
    sfx('scanStart', { seconds:SCAN_MS / 1000 });
    var started = performance.now(), last = -1;
    countdown(3);
    (function step() {
      var elapsed = performance.now() - started;
      if (!state.visible || !state.stream) { state.scanTimer = 0; return; }
      if (elapsed >= SCAN_MS) { state.scanTimer = 0; lockChoice(); return; }
      var n = Math.max(1, state.faces.length), next = Math.floor(Math.random() * n);
      if (n > 1 && next === last) next = (next + 1) % n;
      state.highlight = last = next; sfx('tick');
      // Slot-machine slow down: fast at first, then each jump takes longer.
      var p = elapsed / SCAN_MS;
      state.scanTimer = setTimeout(step, 70 + 300 * p * p);
    })();
  }
  function countdown(from) {
    var el = $('chooserCountdown'), n = from;
    clearInterval(state.countTimer);
    function show() { el.hidden = false; el.textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    show();
    state.countTimer = setInterval(function () { n--; if (n <= 0) { clearInterval(state.countTimer); state.countTimer = 0; el.hidden = true; return; } show(); }, SCAN_MS / from);
  }
  function lockChoice() {
    if (!state.visible || !state.stream) return;
    state.scanning = false; clearInterval(state.countTimer); state.countTimer = 0; $('chooserCountdown').hidden = true;
    var faces = state.faces;
    if (!faces.length) { setPhase('ready'); setMsg(T('chooser.lost', 'Царай алга болсон. Дахин оролдоно уу.')); return; }
    var pick = faces[state.highlight >= 0 && state.highlight < faces.length ? state.highlight : Math.floor(Math.random() * faces.length)];
    state.chosen = pick;
    zoomTo(pick);
    setPhase('chosen'); setMsg(T('chooser.chosenMsg', 'Баяр хүргэе! 🎉 Дахин сонгох бол «Дахин сонгох» дар.'));
    var banner = $('chooserBanner'); banner.hidden = false; banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
    sfx('chosen');
    burst();
  }
  /* Zoom the (object-fit: cover, optionally mirrored) video so the chosen face sits in the middle, never showing an edge. */
  function zoomTo(f) {
    var video = $('chooserVideo'), stage = $('chooserStage');
    var vw = video.videoWidth, vh = video.videoHeight, W = stage.clientWidth, H = stage.clientHeight; if (!vw || !W) return;
    var s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
    var fx = ox + (f.x + f.w / 2) * s, fy = oy + (f.y + f.h / 2) * s;
    var z = Math.max(1.6, Math.min(3.2, 0.48 * H / Math.max(1, f.h * s)));
    var ty = Math.min(0, Math.max(H - z * H, H / 2 - z * fy)), tx, sx;
    if (mirrored()) { tx = Math.min(z * W, Math.max(W, W / 2 + z * fx)); sx = tx - z * fx; video.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + (-z).toFixed(3) + ',' + z.toFixed(3) + ')'; }
    else { tx = Math.min(0, Math.max(W - z * W, W / 2 - z * fx)); sx = tx + z * fx; video.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + z.toFixed(3) + ',' + z.toFixed(3) + ')'; }
    var sy = ty + z * fy, vig = $('chooserVignette');
    vig.style.setProperty('--vx', (sx / W * 100).toFixed(1) + '%'); vig.style.setProperty('--vy', (sy / H * 100).toFixed(1) + '%');
    vig.style.setProperty('--vr', Math.round(Math.min(W, H) * 0.3) + 'px');
  }
  function reset() {
    clearTimeout(state.scanTimer); state.scanTimer = 0; clearInterval(state.countTimer); state.countTimer = 0;
    state.chosen = null; state.scanning = false; state.highlight = -1;
    var v = $('chooserVideo'); if (v) v.style.transform = '';
    $('chooserBanner').hidden = true; $('chooserCountdown').hidden = true;
    setPhase(state.stream ? 'ready' : 'idle'); setMsg(state.stream ? T('chooser.ready', 'Бэлэн! «Сонгох» дарна уу.') : '');
    if (state.stream) detectLoop();
  }
  function burst() {
    var layer = $('chooserConfetti'); if (!layer) return; layer.innerHTML = '';
    var colors = ['#3dffa8', '#f0a90b', '#e5484d', '#3b82f6', '#8e4ec6', '#ffffff', '#e93d82'];
    for (var i = 0; i < 110; i++) {
      var s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%'; s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.35) + 's'; s.style.animationDuration = (1.8 + Math.random() * 1.2) + 's';
      s.style.setProperty('--spin', (Math.random() * 900 - 450) + 'deg'); s.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
      if (i % 3 === 0) s.style.borderRadius = '50%';
      layer.appendChild(s);
    }
    setTimeout(function () { layer.innerHTML = ''; }, 3400);
  }

  function begin() {
    if (state.started || state.starting) return;
    var epoch = ++state.epoch; state.starting = true;
    setPhase('starting'); setMsg(T('chooser.starting', 'Камер асааж байна…'));
    Promise.all([startCamera(epoch), initDetector()]).then(function () {
      if (epoch !== state.epoch || !state.visible || !state.stream) return;
      state.starting = false; state.started = true; setPhase('ready'); setMsg(T('chooser.ready', 'Бэлэн! «Сонгох» дарна уу.')); setCount();
      drawLoop(); detectLoop(); sfx('pop');
    }).catch(function (error) {
      if (epoch !== state.epoch) return; state.starting = false;
      var denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setPhase('idle'); setMsg(denied ? T('chooser.denied', 'Камерын зөвшөөрөл өгөөгүй байна. Хөтчийн зөвшөөрлийг нээнэ үү.') : (error && error.message && error.message !== 'load' ? error.message : T('chooser.failed', 'Камер эсвэл царай таних хэрэгсэл ачаалагдсангүй.')));
      stopCamera();
    });
  }
  function shutdown() {
    state.epoch++; state.starting = false; state.started = false;
    stopCamera(); reset(); state.faces = []; setCount(); setPhase('idle'); setMsg('');
  }
  function flip() {
    if (state.scanning || state.starting) return;
    state.facing = state.facing === 'user' ? 'environment' : 'user';
    shutdown(); begin();
  }

  function bind() {
    if (state.bound) return; state.bound = true;
    $('chooserStart').onclick = begin;
    $('chooserChoose').onclick = choose;
    $('chooserAgain').onclick = function () { reset(); sfx('boing'); };
    $('chooserStop').onclick = shutdown;
    $('chooserFlip').onclick = flip;
    document.addEventListener('keydown', function (e) {
      if (!state.visible || e.repeat || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable],dialog,.modal-back'))) return;
      var onButton = e.target.closest && e.target.closest('button,a');
      if (e.key === ' ' && !onButton && state.stream && !state.scanning) { e.preventDefault(); if (state.chosen) reset(); else choose(); }
      else if ((e.key === 'r' || e.key === 'R') && state.chosen) { reset(); }
    });
    window.addEventListener('resize', function () { if (state.chosen) zoomTo(state.chosen); });
  }

  C.Chooser = {
    show:function () { state.visible = true; bind(); setPhase(state.stream ? 'ready' : 'idle'); setCount(); if (state.stream) { drawLoop(); detectLoop(); } },
    hide:function () { state.visible = false; shutdown(); }
  };
})();

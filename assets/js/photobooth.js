/* Intentional, silent camera capture. Every export is made locally first. */
(function () {
  'use strict';
  var C = window.C122 = window.C122 || {}, root, video, canvas;
  var effects = C.PhotoboothEffects, analyses = new WeakMap(), surfaces = new WeakMap();
  var frames = {
    retro: { name: 'Good Vibes', width: 1241, height: 3510, background: '#f2b03b' },
    classic: { name: 'Paper Club', width: 1241, height: 3510, background: '#f2eee3', ink: '#30372d' },
    noir: { name: 'After Hours', width: 1241, height: 3510, background: '#202625', ink: '#f1efdf' },
    mint: { name: 'Fresh Mint', width: 1241, height: 3510, background: '#b8d7bb', ink: '#284735' }
  };
  var filters = { none: 'none', vintage: 'sepia(.35) saturate(1.25) contrast(1.05)', mono: 'grayscale(1) contrast(1.12)', bright: 'brightness(1.13) saturate(1.1)', pink: 'sepia(.2) saturate(1.25) hue-rotate(320deg)', cool: 'saturate(.8) hue-rotate(12deg) contrast(1.05)' };
  var slots = [{ x: .06065176, y: .03535174, w: .87942459, h: .18706960 }, { x: .06065176, y: .23418783, w: .87942459, h: .18706962 }, { x: .06065176, y: .43302392, w: .87942459, h: .18706958 }, { x: .06065176, y: .63186003, w: .87942459, h: .18706958 }];
  var overlay = null, logo = null, assetPromise = null;
  var state = { processing: false, noBackground: false, face: 'none', visionBefore: null, visible: false, camera: null, opening: false, epoch: 0, busy: false, saving: false, shots: [], frame: 'retro', filter: 'none', mirror: true, stickers: [], selected: null, motionFrames: [], gif: null, gifWidth: 320, gifRevision: -1, revision: 0, encoder: null, preview: null, item: null, share: null, loaded: false, limits: null };
  var stickerSymbols = { heart: '♥', star: '✦', smile: '☺', flower: '✿', spark: '✧', tape: '▰' };

  function $(id) { return document.getElementById(id); }
  function isBusy() { return state.busy || state.saving || state.processing; }
  function filterCss() { return effects ? effects.filterCss(state.filter) : filters[state.filter] || 'none'; }
  function notice(message, error) { $('pbNotice').textContent = message || ''; $('pbNotice').classList.toggle('error', !!error); }
  function imageFrom(url) { return new Promise(function (resolve, reject) { var image = new Image(); image.onload = function () { resolve(image); }; image.onerror = function () { reject(new Error('Зургийг нээж чадсангүй.')); }; image.src = url; }); }
  function loadAssets() {
    if (assetPromise) return assetPromise;
    assetPromise = Promise.allSettled([
      imageFrom('assets/img/photobooth/retro-overlay.png').then(function (im) { overlay = im; frames.retro.width = im.width; frames.retro.height = im.height; }),
      imageFrom('assets/img/photobooth/logo.png').then(function (im) { logo = im; }),
      fetch('assets/img/photobooth/manifest.json', { cache: 'no-cache' }).then(function (res) { if (!res.ok) throw new Error('frame'); return res.json(); }).then(function (manifest) { if (manifest.slots && manifest.slots.length === 4 && manifest.slots.every(function (s) { return isFinite(s.x) && isFinite(s.y) && s.w > 0 && s.h > 0 && s.w <= 1 && s.h <= 1; })) slots = manifest.slots; })
    ]).then(function () { render(); });
    return assetPromise;
  }
  function frameInfo() { return frames[state.frame] || frames.retro; }
  function slotBox(slot, width, height) { return { x: slot.x * width, y: slot.y * height, w: slot.w * width, h: slot.h * height }; }
  function motionReady() { return state.shots.length === 4 && state.motionFrames.length === 4 && state.motionFrames.every(function (burst) { return Array.isArray(burst) && burst.length >= 2; }); }
  function photoSource(index, motionIndex) { var burst = state.motionFrames[index]; return motionIndex !== undefined && Array.isArray(burst) && burst.length ? burst[motionIndex % burst.length] : state.shots[index]; }
  function photoSurface(source) {
    if (!source || source === video || !effects) return source;
    var key = state.filter + '/' + state.noBackground + '/' + state.face, cached = surfaces.get(source);
    if (cached && cached.key === key) return cached.canvas;
    if (state.filter === 'none' && !state.noBackground && state.face === 'none') return source;
    var info = analyses.get(source), output = document.createElement('canvas');
    output.width = source.width; output.height = source.height;
    var subject = document.createElement('canvas'); subject.width = output.width; subject.height = output.height;
    var sc = subject.getContext('2d'); sc.filter = filterCss(); sc.drawImage(source, 0, 0); sc.filter = 'none'; effects.drawFilterOverlay(sc, subject.width, subject.height, state.filter);
    if (state.noBackground && info && info.mask) { sc.globalCompositeOperation = 'destination-in'; sc.drawImage(info.mask, 0, 0, subject.width, subject.height); sc.globalCompositeOperation = 'source-over'; }
    var context = output.getContext('2d');
    if (state.noBackground) { context.fillStyle = '#ffffff'; context.fillRect(0, 0, output.width, output.height); }
    context.drawImage(subject, 0, 0);
    if (info && effects && state.face !== 'none') effects.drawFace(context, info.faces, output.width, output.height, state.face);
    surfaces.set(source, { key: key, canvas: output }); return output;
  }
  function drawCover(context, source, box, mirror) {
    var live = source === video; source = photoSurface(source);
    var sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height;
    if (!sw || !sh) return;
    var scale = Math.max(box.w / sw, box.h / sh), cropW = box.w / scale, cropH = box.h / scale;
    context.save(); context.beginPath(); context.rect(box.x, box.y, box.w, box.h); context.clip(); context.filter = live || !effects ? filterCss() : 'none';
    if (mirror) { context.translate(box.x + box.w, box.y); context.scale(-1, 1); context.drawImage(source, (sw - cropW) / 2, (sh - cropH) / 2, cropW, cropH, 0, 0, box.w, box.h); }
    else context.drawImage(source, (sw - cropW) / 2, (sh - cropH) / 2, cropW, cropH, box.x, box.y, box.w, box.h);
    context.restore();
  }
  function visionStatus(message, error) { $('pbVisionStatus').textContent = message; $('pbVisionStatus').classList.toggle('error', !!error); }
  function visionReady() { return state.shots.length === 4 && state.shots.concat.apply(state.shots, state.motionFrames).every(function (source) { var info = analyses.get(source); return (!state.noBackground || info && info.mask) && (state.face === 'none' || info && info.faceDone); }); }
  async function processPortraits(epoch) {
    if (!state.noBackground && state.face === 'none') return;
    if (!C.PhotoboothVision) throw new Error('Зураг боловсруулах хэрэгсэл ачаалагдаагүй байна.');
    state.processing = true; surfaces = new WeakMap(); render();
    try {
      var requested = { background: state.noBackground, face: state.face !== 'none' };
      var sources = state.shots.concat.apply(state.shots, state.motionFrames), facesFound = 0, needed = {background:false,face:false};
      sources.forEach(function (source) { var info = analyses.get(source) || {}; if (requested.background && !info.mask) needed.background = true; if (requested.face && !info.faceDone) needed.face = true; });
      if (needed.background || needed.face) { visionStatus('Зураг боловсруулах хэрэгсэл бэлдэж байна…'); await C.PhotoboothVision.prepare(needed); }
      for (var i = 0; i < sources.length; i++) {
        if (epoch !== state.epoch || !state.visible) { var aborted = new Error('Processing cancelled'); aborted.name = 'AbortError'; throw aborted; }
        var source = sources[i], previous = analyses.get(source) || {}, missing = { background: requested.background && !previous.mask, face: requested.face && !previous.faceDone };
        if (missing.background || missing.face) { var result = await C.PhotoboothVision.analyze(source, missing); if (epoch !== state.epoch || !state.visible) { var cancel = new Error('Processing cancelled'); cancel.name = 'AbortError'; throw cancel; } analyses.set(source, { mask: missing.background ? result.mask : previous.mask, faces: missing.face ? result.faces : previous.faces || [], faceDone: previous.faceDone || missing.face }); }
        var current = analyses.get(source); if (i < 4 && current && current.faces) facesFound += current.faces.length;
        visionStatus('PNG + GIF боловсруулж байна · ' + (i + 1) + ' / ' + sources.length);
      }
      surfaces = new WeakMap();
      visionStatus((state.noBackground ? 'Цагаан студийн дэвсгэр бэлэн. ' : '') + (requested.face ? (facesFound ? 'Нүүрний эффект бэлэн. ' : 'Нүүр олдсонгүй. Камер руу харж, илүү гэрэлтэй газар дахин аваарай. ') : '') + '4 зураг болон GIF-д хэрэглэнэ.');
    } finally { if (epoch === state.epoch) { state.processing = false; render(); } }
  }
  async function changePortrait(background, face) {
    if (isBusy()) return;
    var previous = { background: state.noBackground, face: state.face }, epoch = state.epoch;
    state.noBackground = background; state.face = face; state.visionBefore = previous; changed();
    try { if (state.shots.length === 4) await processPortraits(epoch); else visionStatus('Нүүрний эффект сонголоо. Дөрвөн зургаа авсны дараа хэрэглэнэ.'); }
    catch (error) { if (epoch === state.epoch && error.name !== 'AbortError') { state.noBackground = previous.background; state.face = previous.face; surfaces = new WeakMap(); changed(); visionStatus('Эффект хэрэглэж чадсангүй. ' + error.message, true); } }
    finally { if (epoch === state.epoch) { state.visionBefore = null; render(); } }
  }
  function drawBrand(context, width, height, frame) {
    context.save(); context.fillStyle = frame.ink || '#30372d'; context.textAlign = 'center';
    if (logo) { var lw = Math.min(width * .43, height * .029 * logo.width / logo.height), lh = lw * logo.height / logo.width; context.fillStyle = '#253b32'; context.fillRect(0, 0, width, height * .034); context.drawImage(logo, (width - lw) / 2, height * .002, lw, lh); context.fillStyle = frame.ink || '#30372d'; }
    else { context.font = '500 ' + Math.round(width * .085) + 'px sans-serif'; context.fillText('IwnlX', width / 2, height * .03); }
    context.font = '700 ' + Math.round(width * .12) + 'px sans-serif'; context.fillText('2027', width / 2, height * .88);
    context.font = '800 ' + Math.round(width * .095) + 'px sans-serif'; context.fillText('SENIORS', width / 2, height * .93);
    context.font = '500 ' + Math.round(width * .022) + 'px sans-serif'; context.fillText('12–2  /  THE DAYS WE WILL REMEMBER', width / 2, height * .972);
    if (state.frame === 'mint') { context.strokeStyle = '#57795b'; context.lineWidth = width * .004; context.beginPath(); context.arc(width * .12, height * .887, width * .06, 0, Math.PI * 2); context.stroke(); context.beginPath(); context.arc(width * .89, height * .91, width * .043, 0, Math.PI * 2); context.stroke(); }
    context.restore();
  }
  function drawSticker(context, sticker, width, height, selected) {
    var size = sticker.size * width, x = sticker.x * width, y = sticker.y * height;
    context.save(); context.translate(x, y); context.fillStyle = sticker.color; context.strokeStyle = '#181a17'; context.lineWidth = Math.max(1, width * .002);
    if (effects) effects.drawSticker(context, sticker, size);
    else { context.font = '700 ' + Math.round(size) + 'px Arial,sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(stickerSymbols[sticker.kind] || '✦', 0, 0); }
    if (selected) { context.globalAlpha = 1; context.strokeStyle = '#fff'; context.lineWidth = width * .003; context.setLineDash([width * .012, width * .008]); context.strokeRect(-size * .6, -size * .6, size * 1.2, size * 1.2); }
    context.restore();
  }
  function compose(target, options) {
    options = options || {}; var width = target.width, height = target.height, context = target.getContext('2d'), frame = frameInfo();
    context.clearRect(0, 0, width, height); context.fillStyle = frame.background; context.fillRect(0, 0, width, height);
    slots.forEach(function (slot, index) {
      var box = slotBox(slot, width, height), source = photoSource(index, options.motionIndex), mirrored = state.mirror;
      if (options.live && index === state.shots.length && index < 4 && video && video.readyState >= 2) source = video;
      if (source) drawCover(context, source, box, mirrored);
      else { context.fillStyle = state.frame === 'noir' ? '#444b45' : '#e4dccc'; context.fillRect(box.x, box.y, box.w, box.h); context.fillStyle = state.frame === 'noir' ? '#aeb5a6' : '#9c947b'; context.font = '500 ' + Math.round(width * .08) + 'px sans-serif'; context.textAlign = 'center'; context.fillText('0' + (index + 1), box.x + box.w / 2, box.y + box.h / 2 + width * .025); }
    });
    if (state.frame === 'retro' && overlay) context.drawImage(overlay, 0, 0, width, height);
    else drawBrand(context, width, height, frame);
    state.stickers.forEach(function (sticker) { drawSticker(context, sticker, width, height, options.selection && sticker.id === state.selected); });
  }
  function render() {
    if (!canvas) return;
    var busy = isBusy();
    var frame = frameInfo(), previewWidth = Math.min(620, frame.width), previewHeight = Math.round(previewWidth * frame.height / frame.width); if (canvas.width !== previewWidth || canvas.height !== previewHeight) { canvas.width = previewWidth; canvas.height = previewHeight; }
    compose(canvas, { live: !!state.camera && state.visible && !isBusy(), selection: true });
    $('pbPrintState').textContent = state.shots.length + ' / 4';
    $('pbCapture').disabled = !state.camera || busy || state.opening;
    $('pbRetake').disabled = !state.shots.length || busy;
    $('pbDownload').disabled = state.shots.length !== 4 || busy || !visionReady();
    $('pbSave').disabled = state.shots.length !== 4 || busy || !visionReady();
    $('pbDownloadMotion').hidden = !motionReady() && !state.gif;
    $('pbDownloadMotion').disabled = busy || !visionReady();
    $('pbFrames').querySelectorAll('button').forEach(function (button) { button.classList.toggle('on', button.dataset.pbFrame === state.frame); button.setAttribute('aria-pressed', String(button.dataset.pbFrame === state.frame)); });
    $('pbFilters').querySelectorAll('button').forEach(function (button) { button.classList.toggle('on', button.dataset.pbFilter === state.filter); button.setAttribute('aria-pressed', String(button.dataset.pbFilter === state.filter)); });
    [ 'pbFrames', 'pbFilters', 'pbStickers', 'pbStickerAdjust', 'pbFaceEffects' ].forEach(function (id) { $(id).querySelectorAll('button,input').forEach(function (control) { control.disabled = busy; }); });
    ['pbMirror','pbMotion','pbPhotoFiles','pbTitle','pbFilterGroup','pbStickerGroup','pbStickerSearch'].forEach(function (id) { $(id).disabled = busy; });
    $('pbVideo').style.transform = state.mirror ? 'scaleX(-1)' : '';
    $('pbVideo').style.filter = filterCss();
    $('pbNoBackground').disabled = busy || state.shots.length !== 4; $('pbNoBackground').checked = state.noBackground;
    $('pbFaceEffects').querySelectorAll('button').forEach(function (button) { button.classList.toggle('on', button.dataset.pbFace === state.face); button.setAttribute('aria-pressed', String(button.dataset.pbFace === state.face)); });
  }
  function changed() { state.revision++; state.item = null; state.share = null; $('pbShare').hidden = true; render(); }
  function cameraLabel(message, active) { $('pbCameraStatus').textContent = message; $('pbCameraStatus').classList.toggle('on', !!active); }
  function stopCamera(message) {
    state.epoch++; state.opening = false;
    if (state.processing || !visionReady() && state.shots.length === 4) { state.noBackground = state.visionBefore ? state.visionBefore.background : false; state.face = state.visionBefore ? state.visionBefore.face : 'none'; surfaces = new WeakMap(); state.revision++; }
    state.processing = false; state.visionBefore = null; if (C.PhotoboothVision) C.PhotoboothVision.release();
    if (state.camera) state.camera.getTracks().forEach(function (track) { track.stop(); });
    state.camera = null; if (video) video.srcObject = null;
    if (state.preview) { cancelAnimationFrame(state.preview); state.preview = null; }
    if (state.encoder) { var encoder = state.encoder; try { encoder.abort(); } catch (e) {} disposeEncoder(encoder); state.encoder = null; }
    state.busy = false; $('pbCountdown').hidden = true; $('pbVideo').hidden = true; $('pbCameraEmpty').hidden = false; $('pbCameraStop').hidden = true;
    cameraLabel('Камер унтраалттай', false); if (message) notice(message); render();
  }
  var lastPreview = 0;
  function previewLoop(time) { if (!state.visible || !state.camera) return; if (!isBusy() && (!time || time - lastPreview >= 100)) { compose(canvas, { live: true, selection: true }); lastPreview = time || 0; } state.preview = requestAnimationFrame(previewLoop); }
  async function startCamera() {
    if (state.camera || state.opening) return; if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { notice('Камер HTTPS холболттой сайтад ажиллана. Доороос 4 зураг сонгож болно.', true); return; }
    var epoch = ++state.epoch; state.opening = true; $('pbCameraStart').disabled = true; cameraLabel('Камерын зөвшөөрөл хүлээж байна…', false); notice('');
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' } });
      if (epoch !== state.epoch || !state.visible) { stream.getTracks().forEach(function (track) { track.stop(); }); return; }
      state.camera = stream; video.srcObject = stream;
      stream.getVideoTracks().forEach(function (track) { track.addEventListener('ended', function () { if (state.camera === stream) stopCamera('Камерын холболт тасарлаа. Дахин асааж болно.'); }); });
      await video.play();
      if (epoch !== state.epoch || !state.visible) { stream.getTracks().forEach(function (track) { track.stop(); }); return; }
      $('pbCameraEmpty').hidden = true; video.hidden = false; $('pbCameraStop').hidden = false; cameraLabel('Камер асаалттай · Дуу бичихгүй', true); previewLoop();
    } catch (error) {
      if (epoch === state.epoch) { stopCamera(); notice(error.name === 'NotAllowedError' ? 'Камерын зөвшөөрөл өгөөгүй байна. Хөтчийн камерын тохиргоог нээгээд дахин оролдоорой.' : 'Камераа нээж чадсангүй. Холболтоо шалгах эсвэл доороос 4 зураг сонгоорой.', true); }
    } finally { if (epoch === state.epoch) state.opening = false; $('pbCameraStart').disabled = false; render(); }
  }
  function wait(milliseconds, epoch) { return new Promise(function (resolve, reject) { setTimeout(function () { if (state.epoch !== epoch || !state.visible || !state.camera) { var error = new Error('Capture cancelled'); error.name = 'AbortError'; reject(error); } else resolve(); }, milliseconds); }); }
  function snapshotVideo(maxWidth) {
    var shot = document.createElement('canvas'), scale = Math.min(1, maxWidth / video.videoWidth); shot.width = Math.max(1, Math.round(video.videoWidth * scale)); shot.height = Math.max(1, Math.round(video.videoHeight * scale)); shot.getContext('2d').drawImage(video, 0, 0, shot.width, shot.height); return shot;
  }
  function updateShotRow() { $('pbShotRow').querySelectorAll('[data-pb-shot]').forEach(function (cell, index) { cell.textContent = '0' + (index + 1); if (state.shots[index]) { var image = new Image(); image.src = state.shots[index].toDataURL('image/jpeg', .6); image.alt = 'Зураг ' + (index + 1); cell.textContent = ''; cell.appendChild(image); } cell.classList.remove('active'); }); }
  async function capture() {
    if (!state.camera || isBusy() || video.readyState < 2) return;
    var epoch = state.epoch, motionWanted = $('pbMotion').checked; state.busy = true; analyses = new WeakMap(); surfaces = new WeakMap(); state.noBackground = false; state.shots = []; state.motionFrames = motionWanted ? [[], [], [], []] : []; state.gif = null; state.gifWidth = 320; state.gifRevision = -1; changed(); updateShotRow(); notice('Позоо аваарай. Зураг бүрийн өмнө 3 секунд тоолно.');
    try {
      for (var index = 0; index < 4; index++) {
        var cell = $('pbShotRow').querySelector('[data-pb-shot="' + index + '"]'); cell.classList.add('active');
        for (var count = 3; count > 0; count--) { $('pbCountdown').textContent = count; $('pbCountdown').hidden = false; await wait(1000, epoch); }
        $('pbCountdown').hidden = true; state.shots.push(snapshotVideo(1600)); $('pbCameraStage').classList.remove('flash'); void $('pbCameraStage').offsetWidth; $('pbCameraStage').classList.add('flash'); updateShotRow(); compose(canvas, { selection: true }); $('pbPrintState').textContent = state.shots.length + ' / 4';
        if (motionWanted) {
          notice('Амьд зураг ' + (index + 1) + ' / 4 · Позоо хөдөлгөөнтэй үргэлжлүүлээрэй…'); cameraLabel('Амьд зураг ' + (index + 1) + ' / 4 авч байна · Дуу бичихгүй', true);
          for (var frame = 0; frame < 12; frame++) { state.motionFrames[index].push(snapshotVideo(480)); await wait(125, epoch); }
        }
        await wait(250, epoch);
      }
      await processPortraits(epoch);
      if (motionWanted) {
        notice('GIF бэлдэж байна…'); await ensureGIF(epoch);
      }
      if (epoch === state.epoch) notice('Боллоо. Стикерээ байрлуулаад зураг татах эсвэл цомогт хадгалаарай.');
    } catch (error) { if (epoch === state.epoch && error.name !== 'AbortError') { if (!visionReady()) { state.noBackground = false; state.face = 'none'; surfaces = new WeakMap(); state.revision++; visionStatus('Эффект хэрэглэж чадсангүй. Original зураг бэлэн.', true); } notice('PNG зураг бэлэн. ' + error.message, true); } }
    finally { if (epoch === state.epoch) { state.busy = false; $('pbCountdown').hidden = true; cameraLabel('Камер асаалттай · Дуу бичихгүй', !!state.camera); render(); } }
  }
  function disposeEncoder(encoder) { ['activeWorkers','freeWorkers'].forEach(function (pool) { (encoder[pool] || []).forEach(function (worker) { try { worker.terminate(); } catch (e) {} }); if (Array.isArray(encoder[pool])) encoder[pool].length = 0; }); }
  function ensureGIF(epoch, maxBytes) {
    if (!motionReady()) return Promise.resolve(null);
    if (state.gif && state.gifRevision === state.revision && (!maxBytes || state.gif.size <= maxBytes)) return Promise.resolve(state.gif);
    if (!window.GIF) return Promise.reject(new Error('GIF хэрэгсэл ачаалагдаагүй байна. Хуудсаа дахин нээгээрэй.'));
    return new Promise(function (resolve, reject) {
      var frame = frameInfo(), width = maxBytes && state.gif && state.gifRevision === state.revision && state.gif.size > maxBytes ? Math.max(160, Math.round(state.gifWidth * .8)) : 320, height = Math.round(width * frame.height / frame.width), output = document.createElement('canvas'); output.width = width; output.height = height;
      var encoder = new window.GIF({ workers: 2, quality: 12, width: width, height: height, workerScript: 'assets/js/vendor/gif/gif.worker.js', repeat: 0 });
      var revision = state.revision, settled = false; state.encoder = encoder;
      var timer = setTimeout(function () { finish(new Error('GIF бэлдэх хугацаа дууслаа. PNG зургаа татаж болно.')); try { encoder.abort(); } catch (e) {} }, 45000);
      function finish(error, blob) { if (settled) return; settled = true; clearTimeout(timer); disposeEncoder(encoder); if (state.encoder === encoder) state.encoder = null; if (error) reject(error); else if (epoch !== state.epoch || !state.visible) { var abort = new Error('GIF cancelled'); abort.name = 'AbortError'; reject(abort); } else { state.gif = blob; state.gifWidth = width; state.gifRevision = revision; if (maxBytes && blob.size > maxBytes && width > 160) resolve(ensureGIF(epoch, maxBytes)); else resolve(blob); } }
      encoder.on('finished', function (blob, bytes) {
        // gif.js allocates whole 4096-byte pages; remove only its zero padding after the GIF trailer.
        if (bytes && bytes.length) { var end = bytes.length - 1; while (end >= 0 && bytes[end] === 0) end--; if (end >= 0 && bytes[end] === 0x3b && end < bytes.length - 1) blob = new Blob([bytes.subarray(0, end + 1)], { type: 'image/gif' }); }
        finish(null, blob);
      }); encoder.on('error', function () { finish(new Error('GIF бэлдэж чадсангүй. PNG зургаа татаж болно.')); }); encoder.on('abort', function () { var abort = new Error('GIF cancelled'); abort.name = 'AbortError'; finish(abort); });
      encoder.on('progress', function (progress) { if (state.visible && state.encoder === encoder) notice('GIF бэлдэж байна · ' + Math.round(progress * 100) + '%'); });
      try { var count = Math.min.apply(Math, state.motionFrames.map(function (burst) { return burst.length; })); for (var index = 0; index < count; index++) { compose(output, { motionIndex: index }); encoder.addFrame(output, { copy: true, delay: 125 }); } encoder.render(); } catch (error) { finish(error); }
    });
  }
  function cleanCanvas() { var output = document.createElement('canvas'), frame = frameInfo(); output.width = frame.width; output.height = frame.height; compose(output); return output; }
  function pngBlob(output) { return new Promise(function (resolve, reject) { output.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('Зураг бэлдэж чадсангүй.')); }, 'image/png'); }); }
  function downloadBlob(blob, name) { var url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); }
  function fileName(extension) { return '12-2-photobooth-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.' + extension; }
  async function downloadPhoto() { if (isBusy() || !visionReady()) return; try { downloadBlob(await pngBlob(cleanCanvas()), fileName('png')); } catch (error) { notice(error.message, true); } }
  async function downloadMotion() { if (isBusy() || !visionReady()) return; var epoch = state.epoch; state.busy = true; render(); try { var blob = await ensureGIF(epoch); if (blob) downloadBlob(blob, fileName('gif')); notice('Амьд зураг GIF хэлбэрээр бэлэн.'); } catch (error) { if (error.name !== 'AbortError') notice(error.message, true); } finally { if (epoch === state.epoch) { state.busy = false; render(); } } }
  function auth() { return (C.askAlbumUnlock || C.ensureMember).call(C); }
  function apiError(response) { return response.text().then(function (text) { var data; try { data = JSON.parse(text); } catch (error) {} if (!response.ok || !data || data.ok === false) { if (response.status === 401) { C.state.member = C.state.admin = false; document.documentElement.classList.remove('is-member','is-admin'); document.dispatchEvent(new CustomEvent('c122:auth')); } var failure = new Error(data && data.error || 'Серверийн алдаа (' + response.status + ')'); failure.status = response.status; throw failure; } return data; }); }
  async function loadSaved(silent) {
    var data = await C.api('photobooth_list'); if (data.csrf) C.state.csrf = data.csrf; state.limits = data.limits || state.limits;
    if (!C.state.member && !C.state.admin) return data;
    var shelf = $('pbSaved'); shelf.textContent = '';
    (data.items || []).forEach(function (record) {
      var item = record.item || record, card = document.createElement('article'); card.className = 'pb-saved-card'; var image = new Image(); image.src = item.url; image.alt = item.name || 'Photobooth'; image.loading = 'lazy'; card.appendChild(image); var name = document.createElement('b'); name.textContent = item.name || 'Photobooth'; card.appendChild(name); var button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-ghost btn-sm'; button.textContent = 'Татах / QR'; button.onclick = function () { state.item = item; state.share = record.share || null; showShare(state.share); $('pbShare').scrollIntoView({ behavior: 'smooth', block: 'center' }); if (!state.share || !state.share.url) notice('Энэ зургийн холбоос хаалттай. Шинэ QR үүсгэж болно.'); }; card.appendChild(button); shelf.appendChild(card);
    });
    if (!data.items || !data.items.length) { var empty = document.createElement('p'); empty.className = 'pb-control-hint'; empty.textContent = 'Анхны дурсамжаа үлдээгээрэй.'; shelf.appendChild(empty); }
    state.loaded = true; if (!silent) notice('Хадгалсан зурагнууд бэлэн.'); return data;
  }
  function showShare(share) {
    $('pbShare').hidden = false; var qr = $('pbQR'), link = $('pbShareLink'); qr.textContent = ''; $('pbShareStatus').textContent = ''; var downloads = $('pbSavedDownloads'); downloads.textContent = '';
    if (state.item) [ { url: state.item.download, label: 'PNG татах' }, { url: state.item.motionDownload, label: 'Амьд зураг татах' } ].forEach(function (asset) { if (!asset.url) return; var anchor = document.createElement('a'); anchor.className = 'btn btn-ghost btn-sm'; anchor.href = asset.url; anchor.textContent = asset.label; anchor.setAttribute('download', ''); downloads.appendChild(anchor); });
    var url = share && share.url ? new URL(share.url, location.href).href : '';
    link.hidden = !url; qr.hidden = !url; $('pbCopyShare').disabled = !url; $('pbRevokeShare').disabled = !url;
    if (url) { link.href = url; if (window.QRCode) { try { new window.QRCode(qr, { text: url, width: 200, height: 200, colorDark: '#171717', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M }); } catch (error) { qr.hidden = true; $('pbShareStatus').textContent = 'QR бэлдэж чадсангүй. Холбоосыг хуулж болно.'; } } else { qr.hidden = true; $('pbShareStatus').textContent = 'Холбоос бэлэн. QR хэрэгсэл ачаалагдаагүй байна.'; } }
    else { link.removeAttribute('href'); $('pbShareStatus').textContent = 'Холбоос хаалттай. Өмнөх QR кодоор татах боломжгүй.'; }
  }
  async function save() {
    if (isBusy() || !visionReady()) return;
    if (!await auth() || !state.visible || isBusy() || !visionReady()) return;
    var epoch = state.epoch; state.busy = state.saving = true; render(); notice('Зургаа цомогт хадгалж байна…');
    try {
      await loadSaved(true); if (!C.state.csrf) await C.refreshStatus();
      var output = cleanCanvas(), photo = await pngBlob(output), limits = state.limits || {};
      var resized = false, maxPhoto = Number(limits.maxPhotoBytes) || 12 * 1024 * 1024;
      while (photo.size > maxPhoto && output.width > 480) { var smaller = document.createElement('canvas'); smaller.width = Math.max(480, Math.round(output.width * .8)); smaller.height = Math.round(output.height * smaller.width / output.width); smaller.getContext('2d').drawImage(output, 0, 0, smaller.width, smaller.height); output = smaller; photo = await pngBlob(output); resized = true; }
      if (photo.size > maxPhoto) throw new Error('Зураг серверийн зөвшөөрсөн хэмжээнээс том байна. PNG зургаа шууд татаж болно.');
      var maxMotion = Math.min(Number(limits.maxMotionBytes) || 20 * 1024 * 1024, limits.maxTotalBytes ? Math.max(1, limits.maxTotalBytes - photo.size - 16384) : Infinity), motion = await ensureGIF(epoch, maxMotion);
      if (motion && motion.size > maxMotion) throw new Error('Амьд GIF серверийн зөвшөөрсөн хэмжээнд багтахгүй байна. PNG болон GIF-ээ шууд татаж аваарай, эсвэл сайтын эзнээр файл хадгалах хэмжээг нэмүүлээрэй.');
      var form = new FormData(); form.append('photo', photo, fileName('png')); if (motion) form.append('motion', motion, fileName('gif')); form.append('title', $('pbTitle').value.trim() || '12–2 · Photobooth'); form.append('frame', state.frame);
      if (epoch !== state.epoch || !state.visible) return;
      var response = await fetch('api.php?action=photobooth_save', { method: 'POST', body: form, credentials: 'same-origin', cache: 'no-store', headers: { 'X-CSRF': C.state.csrf || '' } }); var data = await apiError(response);
      state.loaded = false;
      document.dispatchEvent(new CustomEvent('c122:media-added'));
      if (epoch === state.epoch && state.visible) { state.item = data.item; state.share = data.share; showShare(data.share); notice(resized ? 'Цомогт хадгаллаа. Серверт багтаахаар хэмжээг нь тохирууллаа; бүрэн хэмжээтэй PNG-г шууд татаж болно.' : 'Цомогт хадгаллаа. QR кодоо утсаараа уншуулаарай.'); await loadSaved(true); }
    } catch (error) { if (epoch === state.epoch && error.name !== 'AbortError') notice(error.message || 'Хадгалж чадсангүй. PNG зургаа шууд татаж болно.', true); }
    finally { state.saving = false; if (epoch === state.epoch) state.busy = false; render(); }
  }
  async function shareOperation(operation) {
    if (!state.item || isBusy() || state.saving || !await auth() || !state.item) return;
    var item = state.item, epoch = state.epoch; $('pbRecreateShare').disabled = $('pbRevokeShare').disabled = true;
    try { var data = await C.api('photobooth_share', { body: { id: item.id, operation: operation } }); if (epoch !== state.epoch || state.item !== item) return; state.share = data.share || null; showShare(state.share); $('pbShareStatus').textContent = operation === 'revoke' ? 'Холбоос хаалаа. Өмнөх QR ажиллахгүй.' : 'Шинэ QR бэлэн. Өмнөх холбоос ажиллахгүй.'; await loadSaved(true); }
    catch (error) { notice(error.message, true); }
    finally { $('pbRecreateShare').disabled = false; $('pbRevokeShare').disabled = !state.share || !state.share.url; }
  }
  function selectSticker(id) {
    state.selected = id; var selected = state.stickers.find(function (item) { return item.id === id; }); $('pbStickerAdjust').hidden = !selected;
    if (selected) { $('pbStickerSize').value = Math.round(selected.size * 100); $('pbStickerColor').value = selected.color; $('pbStickerRotation').value = selected.rotation || 0; }
    var list = $('pbStickerSelection'); list.textContent = ''; state.stickers.forEach(function (item, index) { var button = document.createElement('button'); button.type = 'button'; button.textContent = ((effects && effects.stickers.find(function (v) { return v.id === item.kind; }) || {}).name || stickerSymbols[item.kind] || '✦') + ' ' + (index + 1); button.className = item.id === id ? 'on' : ''; button.setAttribute('aria-pressed', String(item.id === id)); button.onclick = function () { if (!isBusy()) selectSticker(item.id); }; list.appendChild(button); }); render();
  }
  function canvasPoint(event) { var box = canvas.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) }; }
  async function chooseFiles(event) {
    if (isBusy()) return; var files = Array.from(event.target.files || []); event.target.value = ''; if (!files.length) return;
    if (files.length !== 4) { notice('Яг 4 зураг сонгоорой.', true); return; }
    if (files.some(function (file) { return !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 20 * 1024 * 1024; })) { notice('PNG, JPG эсвэл WEBP төрлийн 20 МБ хүртэлх 4 зураг сонгоорой.', true); return; }
    var epoch = state.epoch; state.busy = true; render();
    try { var images = await Promise.all(files.map(async function (file) { var url = URL.createObjectURL(file); try { var image = await imageFrom(url); if (image.width * image.height > 50000000) throw new Error('Зураг хэт том байна. Жижигрүүлээд дахин сонгоорой.'); var shot = document.createElement('canvas'), scale = Math.min(1, 1600 / image.width); shot.width = Math.round(image.width * scale); shot.height = Math.round(image.height * scale); shot.getContext('2d').drawImage(image, 0, 0, shot.width, shot.height); return shot; } finally { URL.revokeObjectURL(url); } })); if (epoch !== state.epoch) return; analyses = new WeakMap(); surfaces = new WeakMap(); state.shots = images; state.motionFrames = []; state.noBackground = false; state.gif = null; state.mirror = false; $('pbMirror').checked = false; changed(); updateShotRow(); await processPortraits(epoch); notice('Дөрвөн зураг бэлэн. Жааз, фильтр, стикерээ сонгоорой.'); }
    catch (error) { if (epoch === state.epoch) { if (state.shots.length === 4 && !visionReady()) { state.noBackground = false; state.face = 'none'; surfaces = new WeakMap(); changed(); } notice(error.message, true); } }
    finally { if (epoch === state.epoch) { state.busy = false; render(); } }
  }
  function buildLibraries() {
    if (!effects) return;
    var group = $('pbFilterGroup').value, filterList = $('pbFilters'); filterList.textContent = '';
    effects.filters.filter(function (item) { return group === 'all' || item.group === group; }).forEach(function (item) { var button = document.createElement('button'); button.type = 'button'; button.dataset.pbFilter = item.id; var chip = document.createElement('span'); chip.className = 'pb-filter-chip'; chip.style.filter = item.css; chip.setAttribute('aria-hidden', 'true'); button.appendChild(chip); button.appendChild(document.createTextNode(item.name)); filterList.appendChild(button); });
    group = $('pbStickerGroup').value; var query = $('pbStickerSearch').value.trim().toLocaleLowerCase(), list = $('pbStickers'); list.textContent = '';
    effects.stickers.filter(function (item) { return (group === 'all' || item.group === group) && (!query || (item.name + ' ' + item.id).toLocaleLowerCase().indexOf(query) !== -1); }).forEach(function (item) { var button = document.createElement('button'); button.type = 'button'; button.dataset.pbSticker = item.id; button.title = item.name; button.setAttribute('aria-label', item.name + ' нэмэх'); var icon = document.createElement('canvas'); icon.width = 100; icon.height = 80; icon.setAttribute('aria-hidden', 'true'); var context = icon.getContext('2d'); context.translate(50, 40); effects.drawSticker(context, {kind:item.id,color:item.color}, 66); button.appendChild(icon); var label = document.createElement('small'); label.textContent = item.name; button.appendChild(label); list.appendChild(button); });
    if (!list.children.length) { var empty = document.createElement('p'); empty.className = 'pb-control-hint'; empty.textContent = 'Стикер олдсонгүй.'; list.appendChild(empty); }
    var faceList = $('pbFaceEffects'); if (!faceList.children.length) effects.faces.forEach(function (item) { var button = document.createElement('button'); button.type = 'button'; button.dataset.pbFace = item.id; var icon = document.createElement('span'); icon.textContent = item.symbol; icon.setAttribute('aria-hidden', 'true'); button.appendChild(icon); button.appendChild(document.createTextNode(item.name)); faceList.appendChild(button); });
    render();
  }
  function init() {
    if (root) return; root = $('view-photobooth'); if (!root) return; video = $('pbVideo'); canvas = $('pbCanvas'); buildLibraries();
    $('pbFilterGroup').onchange = $('pbStickerGroup').onchange = buildLibraries; $('pbStickerSearch').oninput = buildLibraries;
    $('pbFaceEffects').onclick = function (event) { var button = event.target.closest('[data-pb-face]'); if (button && !isBusy()) changePortrait(state.noBackground, button.dataset.pbFace); };
    $('pbNoBackground').onchange = function () { changePortrait(this.checked, state.face); };
    $('pbCameraStart').onclick = startCamera; $('pbCameraStop').onclick = function () { stopCamera('Камер унтраалаа. Авсан зураг хэвээр үлдэнэ.'); }; $('pbCapture').onclick = capture;
    $('pbRetake').onclick = function () { if (isBusy()) return; analyses = new WeakMap(); surfaces = new WeakMap(); state.noBackground = false; state.shots = []; state.motionFrames = []; state.gif = null; visionStatus('Дөрвөн зургаа аваад дэвсгэрээ сонгоорой.'); changed(); updateShotRow(); notice('Дахин зураг авч болно.'); };
    $('pbMirror').onchange = function () { if (isBusy()) return; state.mirror = this.checked; changed(); }; $('pbPhotoFiles').onchange = chooseFiles;
    $('pbFrames').onclick = function (event) { var button = event.target.closest('[data-pb-frame]'); if (button && !isBusy()) { state.frame = button.dataset.pbFrame; changed(); } };
    $('pbFilters').onclick = function (event) { var button = event.target.closest('[data-pb-filter]'); if (button && !isBusy()) { state.filter = button.dataset.pbFilter; changed(); } };
    $('pbStickers').onclick = function (event) { var button = event.target.closest('[data-pb-sticker]'); if (!button || isBusy()) return; if (state.stickers.length >= 48) { notice('48 стикер хүртэл нэмж болно.'); return; } var item = effects && effects.stickers.find(function (value) { return value.id === button.dataset.pbSticker; }); if (effects && !item) return; var sticker = { id: 's' + Date.now() + Math.random(), kind: button.dataset.pbSticker, x: .8, y: .19 + state.stickers.length % 4 * .17, size: .18, rotation: 0, color: item ? item.color : '#ff6624' }; state.stickers.push(sticker); changed(); selectSticker(sticker.id); };
    $('pbStickerRotation').oninput = function () { var selected = state.stickers.find(function (item) { return item.id === state.selected; }); if (selected && !isBusy()) { selected.rotation = Number(this.value); changed(); } };
    $('pbStickerSize').oninput = function () { var selected = state.stickers.find(function (item) { return item.id === state.selected; }); if (selected && !isBusy()) { selected.size = Number(this.value) / 100; changed(); } };
    $('pbStickerColor').oninput = function () { var selected = state.stickers.find(function (item) { return item.id === state.selected; }); if (selected && !isBusy()) { selected.color = this.value; changed(); } };
    $('pbStickerRemove').onclick = function () { if (isBusy()) return; state.stickers = state.stickers.filter(function (item) { return item.id !== state.selected; }); changed(); selectSticker(null); };
    var drag = null;
    canvas.onpointerdown = function (event) { if (isBusy()) return; var point = canvasPoint(event), hit = state.stickers.slice().reverse().find(function (sticker) { return Math.abs(point.x - sticker.x) < sticker.size * .65 && Math.abs((point.y - sticker.y) * canvas.height / canvas.width) < sticker.size * .65; }); selectSticker(hit ? hit.id : null); if (hit) { drag = { id: hit.id, dx: point.x - hit.x, dy: point.y - hit.y }; canvas.setPointerCapture(event.pointerId); event.preventDefault(); } };
    canvas.onpointermove = function (event) { if (!drag || isBusy()) return; var sticker = state.stickers.find(function (item) { return item.id === drag.id; }); if (!sticker) return; var point = canvasPoint(event); sticker.x = Math.max(.02, Math.min(.98, point.x - drag.dx)); sticker.y = Math.max(.02, Math.min(.98, point.y - drag.dy)); changed(); };
    canvas.onpointerup = canvas.onpointercancel = function () { drag = null; };
    $('pbDownload').onclick = downloadPhoto; $('pbDownloadMotion').onclick = downloadMotion; $('pbSave').onclick = save;
    $('pbRecreateShare').onclick = function () { shareOperation('recreate'); }; $('pbRevokeShare').onclick = function () { shareOperation('revoke'); };
    $('pbCopyShare').onclick = async function () { if (!state.share || !state.share.url) return; var url = new URL(state.share.url, location.href).href; try { await navigator.clipboard.writeText(url); $('pbShareStatus').textContent = 'Холбоос хууллаа.'; } catch (error) { var input = document.createElement('input'); input.className = 'input'; input.readOnly = true; input.value = url; $('pbShare').appendChild(input); input.select(); $('pbShareStatus').textContent = 'Холбоосыг сонгоод хуулна уу.'; } };
    $('pbSavedLoad').onclick = async function () { if (!await auth()) return; try { await loadSaved(); } catch (error) { notice(error.message, true); } };
    document.addEventListener('c122:auth', function () { if (!C.state.member && !C.state.admin) { state.loaded = false; state.item = null; state.share = null; $('pbSaved').textContent = ''; $('pbShare').hidden = true; $('pbQR').textContent = ''; } });
    window.addEventListener('pagehide', function () { if (root) stopCamera(); });
    loadAssets(); render();
  }
  C.Photobooth = { show: function () { init(); if (!root) return; state.visible = true; loadAssets(); render(); if (C.state && C.state.member && !state.loaded) loadSaved(true).catch(function () {}); }, hide: function () { if (!root) return; state.visible = false; stopCamera(); } };
})();

/* Local, opt-in portrait processing. No image data leaves this browser. */
(function () {
  'use strict';
  var C = window.C122 = window.C122 || {};
  var script = document.currentScript;
  var scriptUrl = script && script.src || new URL('assets/js/photobooth-vision.js', document.baseURI).href;
  var vendorUrl = new URL('vendor/mediapipe/', scriptUrl).href;
  var paths = {
    bundle: new URL('vision_bundle.js', vendorUrl).href,
    module: new URL('vision_bundle.mjs', vendorUrl).href,
    wasm: new URL('wasm/', vendorUrl).href.replace(/\/$/, ''),
    background: new URL('selfie_segmenter.tflite', vendorUrl).href,
    face: new URL('face_landmarker.task', vendorUrl).href
  };
  var epoch = 0, queue = Promise.resolve(), queued = 0, worker = null, workerFailed = false;
  var requestId = 0, pending = new Map(), jobs = new Set(), modulePromise = null, main = null;
  var MAX_SIDE = 512, MAX_QUEUE = 64, LOAD_TIMEOUT = 45000, IMAGE_TIMEOUT = 15000;

  function error(message, code) { var value = new Error(message); value.code = code; return value; }
  function aborted() { var value = error('Зураг боловсруулах үйлдлийг зогсоолоо.', 'VISION_CANCELLED'); value.name = 'AbortError'; return value; }
  function bounded(promise, milliseconds, lateValue) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () { settled = true; reject(error('Зураг боловсруулах хугацаа хэтэрлээ. Дахин оролдоно уу.', 'VISION_TIMEOUT')); }, milliseconds);
      promise.then(function (value) {
        if (settled) { if (lateValue) lateValue(value); return; }
        settled = true; clearTimeout(timer); resolve(value);
      }, function (err) { if (!settled) { settled = true; clearTimeout(timer); reject(err); } });
    });
  }
  function flags(options) { options = options || {}; return { background: !!options.background, face: !!options.face }; }
  function closeTask(task) { if (task && typeof task.close === 'function') { try { task.close(); } catch (_) {} } }
  function closeMain(value) { if (!value) return; closeTask(value.segmenter); closeTask(value.landmarker); }
  function destroyWorker(reason) {
    if (worker) worker.terminate(); worker = null;
    pending.forEach(function (request) { clearTimeout(request.timer); request.reject(reason || aborted()); }); pending.clear();
  }
  function serial(operation, generation) {
    if (queued >= MAX_QUEUE) return Promise.reject(error('Зураг боловсруулж байна. Түр хүлээгээд дахин оролдоно уу.', 'VISION_BUSY'));
    queued++;
    var run = queue.catch(function () {}).then(function () { if (generation !== epoch) throw aborted(); return operation(); });
    queue = run.catch(function () {});
    var output = new Promise(function (resolve, reject) {
      var job = { cancel: function () { reject(aborted()); } }; jobs.add(job);
      run.then(function (value) { jobs.delete(job); resolve(value); }, function (err) { jobs.delete(job); reject(err); });
    });
    return output.finally(function () { if (generation === epoch) queued = Math.max(0, queued - 1); });
  }
  function workerAvailable() { return !workerFailed && typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function'; }
  function getWorker() {
    if (worker) return worker;
    worker = new Worker(new URL('photobooth-vision-worker.js', scriptUrl).href);
    var local = worker;
    local.onmessage = function (event) {
      if (worker !== local) return;
      var data = event.data || {}, request = pending.get(data.id); if (!request) return;
      pending.delete(data.id); clearTimeout(request.timer);
      if (data.error) request.reject(error(data.error.message || 'Зургийг боловсруулж чадсангүй.', data.error.code || 'VISION_INFERENCE'));
      else request.resolve(data.result);
    };
    local.onerror = function () { if (worker !== local) return; workerFailed = true; destroyWorker(error('Зураг боловсруулах туслах ажиллаж чадсангүй.', 'VISION_WORKER')); };
    local.onmessageerror = function () { if (worker !== local) return; workerFailed = true; destroyWorker(error('Зургийн мэдээллийг боловсруулж чадсангүй.', 'VISION_WORKER')); };
    return worker;
  }
  function callWorker(type, data, transfer, generation) {
    if (generation !== epoch) return Promise.reject(aborted());
    return new Promise(function (resolve, reject) {
      var local;
      try { local = getWorker(); } catch (err) { reject(err); return; }
      var id = ++requestId;
      var timer = setTimeout(function () {
        if (!pending.has(id)) return;
        workerFailed = true; destroyWorker(error('Зураг боловсруулах хугацаа хэтэрлээ. Дахин оролдоно уу.', 'VISION_TIMEOUT'));
      }, type === 'prepare' ? LOAD_TIMEOUT : IMAGE_TIMEOUT);
      pending.set(id, { resolve: resolve, reject: reject, timer: timer });
      try { local.postMessage(Object.assign({ id: id, type: type, paths: paths }, data), transfer || []); }
      catch (err) { pending.delete(id); clearTimeout(timer); reject(err); }
    });
  }
  async function loadModule() {
    if (!modulePromise) modulePromise = bounded(import(paths.module), LOAD_TIMEOUT).catch(function (err) { modulePromise = null; throw err; });
    return modulePromise;
  }
  async function prepareMain(options, generation) {
    var runtime = main;
    if (!runtime) {
      var library = await loadModule(); if (generation !== epoch) throw aborted();
      var files = await bounded(library.FilesetResolver.forVisionTasks(paths.wasm), LOAD_TIMEOUT); if (generation !== epoch) throw aborted();
      runtime = { library: library, files: files, segmenter: null, landmarker: null };
      main = runtime;
    }
    if (options.background && !runtime.segmenter) {
      var segmenter = await bounded(runtime.library.ImageSegmenter.createFromOptions(runtime.files, {
        baseOptions: { modelAssetPath: paths.background, delegate: 'CPU' }, runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false
      }), LOAD_TIMEOUT, closeTask);
      if (generation !== epoch || main !== runtime) { closeTask(segmenter); throw aborted(); }
      runtime.segmenter = segmenter;
    }
    if (options.face && !runtime.landmarker) {
      var landmarker = await bounded(runtime.library.FaceLandmarker.createFromOptions(runtime.files, {
        baseOptions: { modelAssetPath: paths.face, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 4,
        minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false
      }), LOAD_TIMEOUT, closeTask);
      if (generation !== epoch || main !== runtime) { closeTask(landmarker); throw aborted(); }
      runtime.landmarker = landmarker;
    }
    return { backend: 'main-cpu', background: !!runtime.segmenter, face: !!runtime.landmarker };
  }
  async function prepareInternal(options, generation) {
    if (!options.background && !options.face) return { backend: 'none', background: false, face: false };
    if (workerAvailable()) {
      try { return await callWorker('prepare', { options: options }, [], generation); }
      catch (err) {
        if (generation !== epoch || err.name === 'AbortError') throw aborted();
        workerFailed = true; destroyWorker(err);
      }
    }
    return prepareMain(options, generation);
  }
  function snapshot(source) {
    var width = Number(source && (source.videoWidth || source.naturalWidth || source.width));
    var height = Number(source && (source.videoHeight || source.naturalHeight || source.height));
    if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) throw error('Зураг хараахан бэлэн болоогүй байна.', 'VISION_IMAGE');
    var scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    var image = document.createElement('canvas'); image.width = Math.max(1, Math.round(width * scale)); image.height = Math.max(1, Math.round(height * scale));
    var context = image.getContext('2d'); if (!context) throw error('Энэ хөтөч зураг боловсруулах боломжгүй байна.', 'VISION_UNSUPPORTED');
    context.drawImage(source, 0, 0, image.width, image.height); return image;
  }
  function feather(value) { var t = Math.max(0, Math.min(1, (value - .4) / .48)); return Math.round(t * t * (3 - 2 * t) * 255); }
  function readMask(result) {
    var masks = result.confidenceMasks;
    if (!masks || masks.length < 1 || masks.length > 2) throw error('Хүний дэвсгэр ялгах загвар тохирохгүй байна.', 'VISION_MASK');
    // The selfie model exposes foreground alone, or background/person channels.
    var mask = masks[masks.length === 2 ? 1 : 0], values = mask.getAsFloat32Array(), alpha = new Uint8Array(mask.width * mask.height);
    for (var i = 0; i < alpha.length; i++) alpha[i] = feather(values[i]);
    return { width: mask.width, height: mask.height, alpha: alpha.buffer };
  }
  function maskCanvas(mask) {
    if (!mask) return null;
    var width = Number(mask.width), height = Number(mask.height), alpha = new Uint8Array(mask.alpha);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_SIDE * 2 || height > MAX_SIDE * 2 || alpha.length !== width * height) throw error('Дэвсгэрийн мэдээлэл буруу байна.', 'VISION_MASK');
    var output = document.createElement('canvas'); output.width = width; output.height = height;
    var context = output.getContext('2d'), pixels = context.createImageData(width, height);
    for (var i = 0; i < alpha.length; i++) { var p = i * 4; pixels.data[p] = 255; pixels.data[p + 1] = 255; pixels.data[p + 2] = 255; pixels.data[p + 3] = alpha[i]; }
    context.putImageData(pixels, 0, 0); return output;
  }
  function copyFaces(result) {
    return (result && result.faceLandmarks || []).map(function (face) { return face.map(function (point) { return { x: point.x, y: point.y, z: point.z }; }); });
  }
  async function analyzeMain(image, options, generation) {
    await prepareMain(options, generation); if (generation !== epoch) throw aborted();
    var runtime = main, result = { mask: null, faces: [], backend: 'main-cpu' };
    // Yield before synchronous low-resolution fallback inference so the notice can paint.
    await new Promise(function (resolve) { setTimeout(resolve, 0); }); if (generation !== epoch) throw aborted();
    if (options.background) {
      var segmented = runtime.segmenter.segment(image);
      try { result.mask = readMask(segmented); } finally { if (segmented && typeof segmented.close === 'function') segmented.close(); }
    }
    if (options.face) {
      await new Promise(function (resolve) { setTimeout(resolve, 0); }); if (generation !== epoch) throw aborted();
      result.faces = copyFaces(runtime.landmarker.detect(image));
    }
    return result;
  }
  function prepare(options) {
    var requested = flags(options), generation = epoch;
    return serial(function () { return prepareInternal(requested, generation); }, generation);
  }
  function analyze(source, options) {
    var requested = flags(options), generation = epoch, image;
    if (!requested.background && !requested.face) return Promise.resolve({ mask: null, faces: [], backend: 'none' });
    if (options && options.live && queued > 1) return Promise.reject(error('Зураг боловсруулж байна.', 'VISION_BUSY'));
    try { image = snapshot(source); } catch (err) { return Promise.reject(err); }
    return serial(async function () {
      var capability = await prepareInternal(requested, generation), result;
      if (generation !== epoch) throw aborted();
      if (capability.backend === 'worker-cpu') {
        var bitmap;
        try {
          bitmap = await createImageBitmap(image); if (generation !== epoch) { bitmap.close(); throw aborted(); }
          result = await callWorker('analyze', { image: bitmap, options: requested }, [bitmap], generation);
        } catch (err) {
          if (bitmap) { try { bitmap.close(); } catch (_) {} }
          if (generation !== epoch || err.name === 'AbortError') throw aborted();
          workerFailed = true; destroyWorker(err); result = await analyzeMain(image, requested, generation);
        }
      } else result = await analyzeMain(image, requested, generation);
      if (generation !== epoch) throw aborted();
      return { mask: maskCanvas(result.mask), faces: result.faces || [], backend: result.backend };
    }, generation).finally(function () { image.width = 1; image.height = 1; });
  }
  function release() {
    epoch++; queued = 0; queue = Promise.resolve(); destroyWorker(aborted()); workerFailed = false;
    jobs.forEach(function (job) { job.cancel(); }); jobs.clear();
    closeMain(main); main = null;
  }
  C.PhotoboothVision = { prepare: prepare, analyze: analyze, release: release };
}());

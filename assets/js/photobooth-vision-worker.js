/* Local-only CPU inference; classic worker supports the MediaPipe WASM loader. */
'use strict';
var visionLibrary = null, visionFiles = null, personSegmenter = null, faceLandmarker = null;
var work = Promise.resolve();

function workerError(message, code) { var value = new Error(message); value.code = code; return value; }
async function prepareVision(paths, options) {
  if (!visionLibrary) {
    self.exports = {};
    importScripts(paths.bundle);
    visionLibrary = self.exports;
    if (!visionLibrary.FilesetResolver) throw workerError('Зураг боловсруулах санг нээж чадсангүй.', 'VISION_LOAD');
  }
  if (!visionFiles) visionFiles = await visionLibrary.FilesetResolver.forVisionTasks(paths.wasm);
  if (options.background && !personSegmenter) {
    personSegmenter = await visionLibrary.ImageSegmenter.createFromOptions(visionFiles, {
      baseOptions: { modelAssetPath: paths.background, delegate: 'CPU' }, canvas: new OffscreenCanvas(1, 1),
      runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false
    });
  }
  if (options.face && !faceLandmarker) {
    faceLandmarker = await visionLibrary.FaceLandmarker.createFromOptions(visionFiles, {
      baseOptions: { modelAssetPath: paths.face, delegate: 'CPU' }, canvas: new OffscreenCanvas(1, 1),
      runningMode: 'IMAGE', numFaces: 4, minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5,
      outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false
    });
  }
  return { backend: 'worker-cpu', background: !!personSegmenter, face: !!faceLandmarker };
}
function workerMask(result) {
  var masks = result.confidenceMasks;
  // Selfie foreground-only output, or the background/person channel pair.
  if (!masks || masks.length < 1 || masks.length > 2) throw workerError('Хүний дэвсгэр ялгах загвар тохирохгүй байна.', 'VISION_MASK');
  var mask = masks[masks.length === 2 ? 1 : 0], values = mask.getAsFloat32Array(), alpha = new Uint8Array(mask.width * mask.height);
  for (var i = 0; i < alpha.length; i++) {
    var t = Math.max(0, Math.min(1, (values[i] - .4) / .48));
    alpha[i] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  return { width: mask.width, height: mask.height, alpha: alpha.buffer };
}
async function runVision(message) {
  var image = message.image, result;
  try {
    var capabilities = await prepareVision(message.paths, message.options || {});
    if (message.type === 'prepare') return capabilities;
    if (message.type !== 'analyze' || !image || !image.width || !image.height || Math.max(image.width, image.height) > 512) throw workerError('Зургийн хэмжээ буруу байна.', 'VISION_IMAGE');
    result = { mask: null, faces: [], backend: 'worker-cpu' };
    if (message.options.background) {
      var segmentation = personSegmenter.segment(image);
      try { result.mask = workerMask(segmentation); } finally { if (segmentation && typeof segmentation.close === 'function') segmentation.close(); }
    }
    if (message.options.face) result.faces = (faceLandmarker.detect(image).faceLandmarks || []).map(function (face) { return face.map(function (point) { return { x: point.x, y: point.y, z: point.z }; }); });
    return result;
  } finally { if (image && typeof image.close === 'function') image.close(); }
}
self.onmessage = function (event) {
  var message = event.data || {};
  work = work.catch(function () {}).then(async function () {
    try {
      var result = await runVision(message), transfer = result.mask ? [result.mask.alpha] : [];
      self.postMessage({ id: message.id, result: result }, transfer);
    } catch (err) { self.postMessage({ id: message.id, error: { message: err && err.message || 'Зургийг боловсруулж чадсангүй.', code: err && err.code || 'VISION_INFERENCE' } }); }
  });
};

Photobooth portrait processing uses local MediaPipe Tasks Vision 0.10.21 and
the official version 1 landscape selfie segmenter and face landmarker models.
SOURCE.json records the verified npm package integrity, download URLs, and
SHA-256 hashes. LICENSE is the upstream Apache 2.0 license.

Upload this entire directory with the application. Models and WASM are served
from your own website; inference runs on the user's device with CPU delegation.
No photos or landmarks are sent to Google or another model provider. Detection
locates facial features for optional decorative effects and does not identify
people. Captured PNG/GIF exports are uploaded only when the user saves them to
the website album.

vision_bundle.js is the unmodified npm CommonJS bundle renamed from
vision_bundle.cjs so servers use a browser-compatible JavaScript MIME type.
The classic worker supplies its exports object. vision_bundle.mjs is the
unmodified ES module for the low-resolution main-thread fallback.

Apache MIME mappings are included in .htaccess. Other hosting servers should
serve .js/.mjs as JavaScript and .wasm as application/wasm.

The selfie mask is approximate, especially for hair, hands, and crowded scenes.
Keeping the original photos allows background removal to be turned off later.

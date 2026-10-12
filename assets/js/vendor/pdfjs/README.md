# PDF.js 6.3.289

Vendored from Mozilla's official `pdfjs-dist` npm package:
https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.3.289.tgz

Package integrity (SHA-512):
`ZHjSVpDa3D6izMq8/04lvkhkATUmL9px6ChPaXc1k6nU2Mrhlg1/7F0bdUqCwUjw3NsPTfPZsMDUU6ZIcRaeQw==`

`pdf.js` and `pdf.worker.js` are the unmodified minified ES modules from
`legacy/build/pdf.min.mjs` and `legacy/build/pdf.worker.min.mjs`, which include
compatibility code for older browser engines. The `.js` extension supplies a
JavaScript MIME type on hosting servers without an `.mjs` MIME mapping;
dynamic import and the module worker still parse these files as ES modules.
The Apache 2.0 license is in `LICENSE`. Supporting fonts, CMaps, color profiles,
and image decoders retain their included licenses.

The folder preview imports these files only when a PDF is opened. The PDF is
fetched through the site's authenticated file endpoint, passed as bytes to a
local worker, and drawn onto a canvas. There is no remote viewer, external
document upload, annotation HTML, or PDF scripting sandbox.

Official documentation: https://mozilla.github.io/pdf.js/examples/

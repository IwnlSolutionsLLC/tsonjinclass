/* Shared authenticated file previews — local PDF renderer; no external viewer. */
(function () {
  'use strict';
  var C = window.C122;
  if (!C) return;
  var pdfJsPromise = null;
  function loadPdfJs() {
    if (!pdfJsPromise) {
      var base = new URL('assets/js/vendor/pdfjs/', document.baseURI);
      pdfJsPromise = import(new URL('pdf.js', base).href).then(function (library) {
        library.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.js', base).href;
        return { library: library, base: base };
      }).catch(function (error) { pdfJsPromise = null; throw error; });
    }
    return pdfJsPromise;
  }

  async function open(file, options) {
    options = options || {};
    var current = function () { return !options.alive || options.alive(); };
    var controller = new AbortController(), objectUrls = [], alive = true;
    var pdfLoadingTask = null, pdfDocument = null, pdfRenderTask = null, pdfPage = null;
    var modal = C.openModal(
      '<div class="folder-preview"><div class="folder-preview-head"><div><h3>' + C.esc(file.name) + '</h3>' +
      '<p class="hint">' + C.esc(C.fmtBytes(file.size)) + '</p></div><button class="btn btn-ghost btn-icon" type="button" data-close aria-label="Хаах">' + C.icon('x') + '</button></div>' +
      '<div class="folder-preview-content" aria-live="polite">Ачаалж байна…</div>' +
      '<div class="actions"><a class="btn btn-primary" data-preview-download href="' + C.esc(options.url(true)) + '" download="' + C.esc(file.name) + '">' + C.icon('download') + 'Татах</a></div></div>',
      { wide: true, onClose: function () {
        alive = false;
        controller.abort();
        if (pdfRenderTask) pdfRenderTask.cancel();
        if (pdfPage) pdfPage.cleanup();
        if (pdfLoadingTask) pdfLoadingTask.destroy().catch(function () {});
        C.$$('canvas', modal.el).forEach(function (canvas) { canvas.width = canvas.height = 0; });
        C.$$('video,audio', modal.el).forEach(function (media) { media.pause(); media.removeAttribute('src'); media.load(); });
        C.$$('iframe,img', modal.el).forEach(function (media) { media.removeAttribute('src'); });
        objectUrls.forEach(function (objectUrl) { URL.revokeObjectURL(objectUrl); });
        if (options.onClose) options.onClose();
      } }
    );
    if (options.download) modal.el.querySelector('[data-preview-download]').onclick = function (event) { event.preventDefault(); options.download(); };
    if (options.onOpen) options.onOpen(modal);
    var box = modal.el.querySelector('.folder-preview-content');
    function fallback() { if (alive) box.textContent = 'Энэ файлыг хөтөч дээр шууд харуулах боломжгүй байна. Татаж аваад тохирох программаар нээнэ үү.'; }
    async function previewPdf(data) {
      var renderer = await loadPdfJs();
      if (!alive || !current()) return;
      var library = renderer.library;
      pdfLoadingTask = library.getDocument({
        data: new Uint8Array(data),
        isEvalSupported: false,
        enableXfa: false,
        cMapUrl: new URL('cmaps/', renderer.base).href,
        cMapPacked: true,
        standardFontDataUrl: new URL('standard_fonts/', renderer.base).href,
        iccUrl: new URL('iccs/', renderer.base).href,
        wasmUrl: new URL('wasm/', renderer.base).href,
        maxImageSize: 16 * 1024 * 1024,
        canvasMaxAreaInBytes: 32 * 1024 * 1024,
        verbosity: 0
      });
      pdfDocument = await pdfLoadingTask.promise;
      if (!alive || !current()) return;
      box.textContent = '';
      var controls = C.el('<div class="folder-pdf-controls"><button type="button" class="btn btn-ghost btn-sm" data-pdf-prev>' +
        C.icon('left', 'i-sm') + 'Өмнөх</button><span class="folder-pdf-status" role="status" aria-live="polite"></span>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-pdf-next>Дараах' + C.icon('right', 'i-sm') + '</button></div>');
      var stage = document.createElement('div');
      stage.className = 'folder-pdf-stage';
      var canvas = document.createElement('canvas');
      canvas.className = 'folder-pdf-canvas';
      canvas.setAttribute('role', 'img');
      stage.appendChild(canvas);
      box.appendChild(controls);
      box.appendChild(stage);
      var previous = controls.querySelector('[data-pdf-prev]'), next = controls.querySelector('[data-pdf-next]');
      var label = controls.querySelector('.folder-pdf-status'), pageNumber = 1, rendering = false;
      function syncControls() {
        previous.disabled = rendering || pageNumber <= 1;
        next.disabled = rendering || pageNumber >= pdfDocument.numPages;
        label.textContent = pageNumber + ' / ' + pdfDocument.numPages + (rendering ? ' · Ачаалж байна…' : ' хуудас');
      }
      async function renderPage(number) {
        if (!alive || rendering) return;
        rendering = true;
        pageNumber = number;
        syncControls();
        try {
          if (pdfPage) pdfPage.cleanup();
          pdfPage = await pdfDocument.getPage(number);
          if (!alive || !current()) return;
          var natural = pdfPage.getViewport({ scale: 1 });
          var width = Math.min(1000, Math.max(160, stage.clientWidth - 24));
          var viewport = pdfPage.getViewport({ scale: width / natural.width });
          // Keep one page in memory and bound canvas allocation on mobile browsers.
          var outputScale = Math.min(window.devicePixelRatio || 1, 2,
            Math.sqrt(8 * 1024 * 1024 / (viewport.width * viewport.height)),
            8192 / Math.max(viewport.width, viewport.height));
          canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
          canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
          canvas.style.width = '100%';
          canvas.style.maxWidth = Math.floor(viewport.width) + 'px';
          canvas.style.height = 'auto';
          canvas.setAttribute('aria-label', file.name + ' — ' + number + ' / ' + pdfDocument.numPages + ' хуудас');
          stage.scrollTop = 0;
          pdfRenderTask = pdfPage.render({
            canvas: canvas,
            viewport: viewport,
            transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
            annotationMode: library.AnnotationMode.DISABLE,
            background: '#fff'
          });
          await pdfRenderTask.promise;
        } catch (error) {
          if (alive && error.name !== 'RenderingCancelledException') label.textContent = 'PDF хуудсыг харуулж чадсангүй. Файлыг татаж аваад үзнэ үү.';
        } finally {
          pdfRenderTask = null;
          rendering = false;
          if (alive) {
            previous.disabled = pageNumber <= 1;
            next.disabled = pageNumber >= pdfDocument.numPages;
            if (label.textContent.indexOf('харуулж чадсангүй') === -1) syncControls();
          }
        }
      }
      previous.onclick = function () { if (pageNumber > 1) renderPage(pageNumber - 1); };
      next.onclick = function () { if (pageNumber < pdfDocument.numPages) renderPage(pageNumber + 1); };
      await renderPage(1);
    }
    try {
      if (options.check) await options.check(controller.signal);
      if (!alive || !current()) return;
      box.textContent = '';
      var kind = file.preview;
      if (!kind && C.FileEditors && C.FileEditors.canEdit(file) && C.FileEditors.preview) {
        var handled = await C.FileEditors.preview(file, box, { readOnly: true, url: options.url(false), signal: controller.signal });
        if (handled) return;
      }
      if (!kind) { fallback(); return; }
      if (kind === 'audio' || kind === 'video') {
        var media = document.createElement(kind);
        media.controls = true;
        media.preload = 'metadata';
        if (kind === 'video') media.playsInline = true;
        media.src = options.url(false);
        media.onerror = function () {
          if (!alive || !current()) return;
          Promise.resolve(options.check ? options.check(controller.signal) : null).then(fallback).catch(function () { if (alive) fallback(); });
        };
        box.appendChild(media);
        return;
      }
      // Large images/PDFs can be downloaded without allocating the whole file in the browser.
      if (kind !== 'text' && Number(file.size) > 64 * 1024 * 1024) {
        box.textContent = 'Урьдчилан үзэхэд энэ файл том байна. Татаж аваад үзнэ үү.';
        return;
      }
      var response = await fetch(options.url(false), {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: kind === 'text' ? { Range: 'bytes=0-262143' } : {}
      });
      if (!response.ok) {
        if (current() && (response.status === 401 || response.status === 403) && options.onUnauthorized) options.onUnauthorized();
        var responseError = new Error('Файлыг ачаалж чадсангүй.');
        responseError.status = response.status;
        throw responseError;
      }
      if (kind === 'text') {
        var text = '', limit = 262144, truncated = Number(file.size) > limit;
        if (response.body && response.body.getReader) {
          var reader = response.body.getReader(), decoder = new TextDecoder('utf-8'), bytes = 0;
          while (true) {
            var result = await reader.read();
            if (result.done) { text += decoder.decode(); break; }
            var allowed = Math.min(result.value.length, limit - bytes);
            text += decoder.decode(result.value.subarray(0, allowed), { stream: true });
            bytes += allowed;
            if (bytes >= limit) { text += decoder.decode(); await reader.cancel(); break; }
          }
        } else {
          if (Number(file.size) > limit) { box.textContent = 'Текст файлыг татаж аваад үзнэ үү.'; return; }
          text = await response.text();
        }
        if (!alive || !current()) return;
        var pre = document.createElement('pre');
        pre.className = 'folder-preview-text';
        pre.textContent = text;
        box.appendChild(pre);
        if (truncated) {
          var note = document.createElement('p');
          note.className = 'hint';
          note.textContent = 'Эхний 256 КБ текстийг харуулж байна. Бүтэн файлыг татаж аваарай.';
          box.appendChild(note);
        }
      } else if (kind === 'pdf') {
        var pdfBytes = await response.arrayBuffer();
        if (!alive || !current()) return;
        box.textContent = 'PDF хуудсыг ачаалж байна…';
        await previewPdf(pdfBytes);
      } else {
        var blob = await response.blob();
        if (!alive || !current()) return;
        var objectUrl = URL.createObjectURL(blob);
        objectUrls.push(objectUrl);
        var element;
        if (kind === 'image') {
          element = document.createElement('img');
          element.alt = file.name;
          element.onerror = fallback;
        } else { fallback(); return; }
        element.src = objectUrl;
        box.appendChild(element);
      }
    } catch (error) {
      if (alive && current() && (error.status === 401 || error.status === 403) && options.onUnauthorized) options.onUnauthorized();
      if (alive && current() && options.onError) options.onError(error);
      if (alive && error.name !== 'AbortError') {
        box.textContent = error.name === 'PasswordException' ? 'Энэ PDF файл нэмэлт нууц үгтэй байна. Татаж аваад нээнэ үү.' :
          file.preview === 'pdf' ? 'PDF файлыг харуулж чадсангүй. Файлыг татаж аваад үзнэ үү.' : error.message || 'Файлыг ачаалж чадсангүй.';
      }
    }
  }

  C.FilePreview = { open: open };
})();

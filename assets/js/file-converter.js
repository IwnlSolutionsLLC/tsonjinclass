/* File conversion makes a new copy. Images and text are processed locally. */
(function () {
  'use strict';
  var C = window.C122;
  if (!C) return;
  var LIMIT = 32 * 1024 * 1024;
  var imageFormats = ['png', 'jpg', 'jpeg', 'webp'];
  var textFormats = ['txt', 'md', 'csv', 'tsv', 'log'];
  var sheetFormats = ['xls', 'xlsx', 'csv', 'tsv'];
  var officeFormats = ['doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp'];
  function extension(file) { return String(file.name || '').split('.').pop().toLowerCase(); }
  function identity(folder) { return folder && typeof folder === 'object' ? folder.id : folder; }
  function sameContext(context) {
    var active = C.Folders && C.Folders.context();
    return active && !active.readOnly && identity(active.folder) === identity(context.folder) && String(active.parent || '') === String(context.parent || '');
  }
  function canConvert(file) { return imageFormats.concat(textFormats, sheetFormats, officeFormats, ['pdf']).indexOf(extension(file)) !== -1; }
  function nameFor(file, ext) { return String(file.name).replace(/\.[^.]+$/, '') + '.' + ext; }
  function cleanName(name, ext) {
    var value = String(name).trim();
    if (!value || value.length > 180 || /[\x00-\x1f/\\]/.test(value) || value === '.' || value === '..') throw new Error('Файлын нэр зөв оруулаарай.');
    return value.replace(/\.[^.]+$/, '') + '.' + ext;
  }
  function localOptions(ext) {
    var options = [];
    function add(target, label, kind) { if (!options.some(function (option) { return option.target === target; })) options.push({ target: target, label: label, kind: kind || 'local' }); }
    if (imageFormats.indexOf(ext) !== -1) {
      add('pdf', 'PDF баримт'); if (ext !== 'png') add('png', 'PNG зураг'); if (ext !== 'jpg' && ext !== 'jpeg') add('jpg', 'JPEG зураг'); if (ext !== 'webp') add('webp', 'WebP зураг');
    }
    if (ext === 'pdf') { add('png', 'PNG зураг · хуудас бүр'); add('jpg', 'JPEG зураг · хуудас бүр'); add('txt', 'TXT · PDF-ийн текст'); }
    if (textFormats.indexOf(ext) !== -1) add('pdf', 'PDF баримт');
    if (sheetFormats.indexOf(ext) !== -1) {
      if (ext !== 'xlsx') add('xlsx', 'Excel XLSX'); if (ext !== 'csv') add('csv', 'CSV · сонгосон хуудас'); add('json', 'JSON · сонгосон хуудас');
    }
    return options;
  }
  function addOfficeOptions(options, ext) {
    var targets = [];
    if (['doc', 'docx', 'odt', 'rtf'].indexOf(ext) !== -1) targets = [['pdf', 'PDF баримт'], ['docx', 'Word DOCX'], ['txt', 'TXT текст']];
    if (['xls', 'xlsx', 'ods'].indexOf(ext) !== -1) targets = [['pdf', 'PDF баримт'], ['xlsx', 'Excel XLSX'], ['csv', 'CSV хүснэгт']];
    if (['ppt', 'pptx', 'odp'].indexOf(ext) !== -1) targets = [['pdf', 'PDF баримт'], ['pptx', 'PowerPoint PPTX']];
    targets.forEach(function (entry) {
      if (entry[0] === ext) return;
      var existing = options.find(function (option) { return option.target === entry[0]; });
      if (existing && (entry[0] === 'xlsx' || entry[0] === 'csv')) return;
      if (!existing) options.push({ target: entry[0], label: entry[1] + ' · Office', kind: 'office' });
    });
  }
  function canvasBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob || blob.type !== type) reject(new Error('Энэ хөтөч сонгосон зургийн хэлбэрийг үүсгэж чадсангүй. PNG эсвэл JPEG сонгоорой.'));
        else resolve(blob);
      }, type, quality);
    });
  }
  async function imageConversion(blob, target) {
    var source, cleanup;
    if (window.createImageBitmap) { source = await createImageBitmap(blob); cleanup = function () { source.close(); }; }
    else {
      var url = URL.createObjectURL(blob); source = new Image();
      await new Promise(function (resolve, reject) { source.onload = resolve; source.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Зургийг уншиж чадсангүй.')); }; source.src = url; });
      cleanup = function () { URL.revokeObjectURL(url); };
    }
    try {
      var width = source.width || source.naturalWidth, height = source.height || source.naturalHeight;
      if (!width || !height || width * height > 25000000) throw new Error('Зураг 25 сая хүртэл цэгтэй байх ёстой. Жижигрүүлээд дахин оруулаарай.');
      var canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      var ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Зургийг хөрвүүлэх боломжгүй байна.');
      if (target === 'jpg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
      ctx.drawImage(source, 0, 0);
      if (target === 'pdf') {
        var PDFLib = await C.FileLibraries.load('pdfLib'), doc = await PDFLib.PDFDocument.create();
        var png = await canvasBlob(canvas, 'image/png'); var image = await doc.embedPng(new Uint8Array(await png.arrayBuffer()));
        var scale = Math.min(1, 14400 / Math.max(width, height)); var page = doc.addPage([Math.max(1, width * scale), Math.max(1, height * scale)]);
        page.drawImage(image, { x: 0, y: 0, width: width * scale, height: height * scale });
        return { blob: new Blob([await doc.save()], { type: 'application/pdf' }), extension: 'pdf' };
      }
      var type = target === 'jpg' ? 'image/jpeg' : 'image/' + target;
      return { blob: await canvasBlob(canvas, type, 0.92), extension: target };
    } finally { cleanup(); }
  }
  function decodeText(buffer) {
    var value;
    try { value = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
    catch (error) { throw new Error('Энэ текст UTF-8 биш байна. UTF-8 хэлбэрээр хадгалаад дахин оруулаарай.'); }
    if (value.indexOf('\u0000') !== -1) throw new Error('Энэ файл энгийн текст биш байна.');
    return value.replace(/\r\n?/g, '\n');
  }
  async function textPdf(blob, progress) {
    if (blob.size > 2 * 1024 * 1024) throw new Error('Текстийг PDF болгох хэмжээ 2 MiB хүртэл.');
    var text = decodeText(await blob.arrayBuffer()), PDFLib = await C.FileLibraries.load('pdfLib'), doc = await PDFLib.PDFDocument.create();
    var font = await C.FileLibraries.embedFont(doc), size = 11, lineHeight = 16, pageWidth = 595.28, pageHeight = 841.89, margin = 44, maxWidth = pageWidth - margin * 2;
    var supported = new Set(font.getCharacterSet()), unsupported = Array.from(text).find(function (character) { return character !== '\n' && character !== '\t' && !supported.has(character.codePointAt(0)); });
    if (unsupported) throw new Error('PDF үсгийн хэв энэ тэмдэгтийг дэмжихгүй байна: ' + unsupported + '. Тэр тэмдэгтийг солиод дахин хөрвүүлээрэй.');
    var pages = 0, page = null, y;
    function newPage() { if (++pages > 500) throw new Error('Хөрвүүлсэн PDF 500-аас олон хуудастай болно. Текстээ хэсэг болгон хуваагаарай.'); page = doc.addPage([pageWidth, pageHeight]); y = pageHeight - margin - size; }
    function writeLine(value) { if (!page || y < margin) newPage(); page.drawText(value, { x: margin, y: y, size: size, font: font, color: PDFLib.rgb(0.08, 0.11, 0.16) }); y -= lineHeight; }
    var lines = text.replace(/\t/g, '    ').split('\n');
    for (var index = 0; index < lines.length; index++) {
      var characters = Array.from(lines[index]), offset = 0; if (!characters.length) { writeLine(''); continue; }
      while (offset < characters.length) {
        var remaining = characters.length - offset, low = 1, high = Math.min(remaining, 4096), fit = 1;
        while (low <= high) { var middle = Math.floor((low + high) / 2); if (font.widthOfTextAtSize(characters.slice(offset, offset + middle).join(''), size) <= maxWidth) { fit = middle; low = middle + 1; } else high = middle - 1; }
        if (fit < remaining) { var space = characters.slice(offset, offset + fit).lastIndexOf(' '); if (space > fit * 0.5) fit = space + 1; }
        writeLine(characters.slice(offset, offset + fit).join('')); offset += fit;
      }
      if (index % 100 === 0) { progress('PDF үүсгэж байна… ' + pages + ' хуудас'); await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    }
    if (!page) newPage();
    return { blob: new Blob([await doc.save()], { type: 'application/pdf' }), extension: 'pdf' };
  }
  async function pdfConversion(blob, target, selectedPage, progress) {
    var loaded = await C.FileLibraries.load('pdfjs');
    var task = loaded.library.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), cMapUrl: new URL('cmaps/', loaded.base).href, cMapPacked: true, standardFontDataUrl: new URL('standard_fonts/', loaded.base).href, wasmUrl: new URL('wasm/', loaded.base).href, isEvalSupported: false });
    var pdf = await task.promise;
    try {
      if (target === 'txt') {
        if (pdf.numPages > 500) throw new Error('PDF текст задлах хэмжээ 500 хуудас хүртэл.');
        var texts = [];
        for (var number = 1; number <= pdf.numPages; number++) {
          progress('Текст уншиж байна… ' + number + ' / ' + pdf.numPages);
          var page = await pdf.getPage(number), content = await page.getTextContent();
          var value = content.items.map(function (item) { return item.str + (item.hasEOL ? '\n' : ' '); }).join('').trim(); texts.push(value);
        }
        if (!texts.some(function (value) { return value.trim(); })) throw new Error('Энэ PDF зурагнаас бүрдсэн байна. Текст задлахын тулд дүрс таних хэрэгтэй.');
        return { blob: new Blob([texts.join('\n\n---\n\n')], { type: 'text/plain;charset=utf-8' }), extension: 'txt' };
      }
      var pages = selectedPage ? [selectedPage] : Array.from({ length: pdf.numPages }, function (_, index) { return index + 1; });
      if (pages.some(function (page) { return page < 1 || page > pdf.numPages; })) throw new Error('Хуудасны дугаар PDF-д байхгүй байна.');
      if (pages.length > 60) throw new Error('Нэг удаа 60 хүртэл хуудсыг зураг болгоно. Хуудасны дугаар сонгоорой.');
      var type = target === 'jpg' ? 'image/jpeg' : 'image/png', JSZip = pages.length > 1 ? await C.FileLibraries.load('jszip') : null, zip = JSZip ? new JSZip() : null, total = 0, single = null;
      for (var index = 0; index < pages.length; index++) {
        progress('Зураг үүсгэж байна… ' + (index + 1) + ' / ' + pages.length);
        var page = await pdf.getPage(pages[index]), natural = page.getViewport({ scale: 1 });
        var scale = Math.min(1.5, 1800 / Math.max(natural.width, natural.height)), viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.ceil(viewport.width)); canvas.height = Math.max(1, Math.ceil(viewport.height));
        if (canvas.width * canvas.height > 5000000) throw new Error('PDF хуудасны хэмжээ хэт том байна.');
        var ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Энэ хөтөч зураг хөрвүүлж чадсангүй.');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); await page.render({ canvasContext: ctx, viewport: viewport, background: 'rgb(255,255,255)' }).promise;
        var image = await canvasBlob(canvas, type, 0.92); total += image.size;
        if (total > 100 * 1024 * 1024) throw new Error('Хөрвүүлсэн зургууд 100 MiB-ээс том байна. Нэг хуудас сонгоорой.');
        if (zip) zip.file('page-' + String(pages[index]).padStart(3, '0') + '.' + target, await image.arrayBuffer()); else single = image;
        canvas.width = canvas.height = 1; page.cleanup();
      }
      return { blob: zip ? await zip.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'STORE' }) : single, extension: zip ? 'zip' : target };
    } finally { await pdf.destroy(); }
  }
  async function spreadsheetConversion(blob, source, target, sheetName) {
    var XLSX = await C.FileLibraries.load('xlsx'), buffer = await blob.arrayBuffer();
    var workbook = source === 'csv' || source === 'tsv' ? XLSX.read(decodeText(buffer), { type: 'string', raw: true, FS: source === 'tsv' ? '\t' : ',' }) : XLSX.read(new Uint8Array(buffer), { type: 'array', cellFormula: true, cellNF: true, cellStyles: true });
    if (!workbook.SheetNames.length) throw new Error('Хүснэгтийн хуудас олдсонгүй.');
    if (target === 'xlsx') return { blob: new Blob([XLSX.write(workbook, { type: 'array', bookType: 'xlsx', cellStyles: true })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), extension: 'xlsx' };
    var name = sheetName && workbook.Sheets[sheetName] ? sheetName : workbook.SheetNames[0], sheet = workbook.Sheets[name];
    if (sheet['!ref']) { var range = XLSX.utils.decode_range(sheet['!ref']); if ((range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1) > 200000) throw new Error('CSV/JSON хөрвүүлэхэд нэг хуудас 200,000 хүртэл нүдтэй байна. Хүснэгтээ хэсэг болгон хуваагаарай.'); }
    if (target === 'csv') return { blob: new Blob(['\ufeff' + XLSX.utils.sheet_to_csv(sheet)], { type: 'text/csv;charset=utf-8' }), extension: 'csv' };
    var values = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
    return { blob: new Blob([JSON.stringify({ sheet: name, rows: values }, null, 2)], { type: 'application/json;charset=utf-8' }), extension: 'json' };
  }
  async function convertLocal(file, blob, target, settings, progress) {
    var source = extension(file); settings = settings || {}; progress = progress || function () {};
    if (imageFormats.indexOf(source) !== -1) return imageConversion(blob, target);
    if (source === 'pdf') return pdfConversion(blob, target, settings.page || null, progress);
    if (target === 'pdf' && textFormats.indexOf(source) !== -1) return textPdf(blob, progress);
    if (sheetFormats.indexOf(source) !== -1) return spreadsheetConversion(blob, source, target, settings.sheet || '');
    throw new Error('Энэ хөрвүүлэлтэд бүрэн Office сервер шаардлагатай.');
  }
  function download(blob, name) {
    var url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  async function open(file) {
    var context = C.Folders && C.Folders.context(); if (!context || context.readOnly || !canConvert(file)) return;
    var ext = extension(file), options = localOptions(ext);
    var modal = C.openModal('<div class="fe-heading"><div><span class="eyebrow">ФАЙЛ ХӨРВҮҮЛЭХ</span><h3></h3></div><button type="button" class="btn btn-ghost" data-close-convert aria-label="Хаах">×</button></div><p class="fe-note">Хөрвүүлсэн файл шинэ хуулбар болж хадгалагдана.</p><div class="converter-options"><div class="field"><label>Шинэ хэлбэр<select class="input" data-target aria-label="Шинэ файлын хэлбэр"></select></label></div><div class="field"><label>Файлын нэр<input class="input" data-name aria-label="Хөрвүүлсэн файлын нэр"></label></div><div class="field" data-pdf-options hidden><label>Хуудас<select class="input" data-pdf-page aria-label="PDF хуудас"><option value="all">Бүх хуудас · олон хуудас ZIP болно</option><option value="single">Нэг хуудас</option></select></label><input class="input" data-page-number type="number" min="1" value="1" aria-label="Хуудасны дугаар" hidden></div><div class="field" data-sheet-options hidden><label>Хүснэгтийн хуудас<select class="input" data-sheet aria-label="Хөрвүүлэх хүснэгтийн хуудас"></select></label></div></div><p class="fe-note" data-limit></p><div class="converter-result" data-result role="status" aria-live="polite"></div><div class="actions"><button type="button" class="btn btn-ghost" data-download disabled>Татах</button><button type="button" class="btn btn-ghost" data-add disabled>Хавтаст хадгалах</button><button type="button" class="btn btn-primary" data-convert>Хөрвүүлэх</button></div>', { wide: true, sticky: true });
    modal.el.classList.add('fe-dialog'); modal.el.querySelector('h3').textContent = file.name;
    var target = modal.el.querySelector('[data-target]'), name = modal.el.querySelector('[data-name]'), convert = modal.el.querySelector('[data-convert]'), add = modal.el.querySelector('[data-add]'), get = modal.el.querySelector('[data-download]'), result = modal.el.querySelector('[data-result]'), limit = modal.el.querySelector('[data-limit]'), pageSelect = modal.el.querySelector('[data-pdf-page]'), pageNumber = modal.el.querySelector('[data-page-number]'), sheetSelect = modal.el.querySelector('[data-sheet]');
    var state = { busy: false, closed: false, blob: null, result: null, saved: false, office: false, options: options, sheetLoaded: false };
    function renderOptions(preserve) { var selected = target.value; target.replaceChildren(); state.options.forEach(function (option, index) { var node = document.createElement('option'); node.value = String(index); node.textContent = option.label; target.appendChild(node); }); if (preserve && selected !== '') target.value = selected; convert.disabled = state.busy || !state.options.length; if (!preserve) update(); }
    function chosen() { return state.options[Number(target.value)]; }
    async function read() {
      if (!state.blob) { if (Number(file.size) > LIMIT) throw new Error('Хөтөч дээр хөрвүүлэх файл 32 MiB хүртэл.'); state.blob = await C.Folders.readFile(file); }
      if (!sameContext(context)) throw new Error('Хавтас солигдсон байна. Файлаа дахин нээгээрэй.'); return state.blob;
    }
    async function populateSheets() {
      if (state.sheetLoaded || ext === 'csv' || ext === 'tsv') return;
      state.sheetLoaded = true;
      try {
        var blob = await read(), XLSX = await C.FileLibraries.load('xlsx'), workbook = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: 'array', bookSheets: true });
        if (state.closed) return; sheetSelect.replaceChildren(); workbook.SheetNames.forEach(function (sheet) { var option = document.createElement('option'); option.value = sheet; option.textContent = sheet; sheetSelect.appendChild(option); });
      } catch (error) { state.sheetLoaded = false; result.textContent = error.message; }
    }
    function clearOutput() { state.result = null; state.saved = false; add.disabled = get.disabled = true; result.textContent = ''; }
    function update() {
      var option = chosen(); if (!option) { limit.textContent = 'Энэ хэлбэрийг хөрвүүлэхэд бүрэн Office сервер хэрэгтэй. Сайтын эзэн тохиргооны заавраар холбоно.'; return; }
      name.value = nameFor(file, option.target); name.disabled = option.kind === 'office'; modal.el.querySelector('[data-pdf-options]').hidden = !(ext === 'pdf' && option.target !== 'txt');
      var showSheets = sheetFormats.indexOf(ext) !== -1 && ['csv', 'json'].indexOf(option.target) !== -1 && ext !== 'csv' && ext !== 'tsv'; modal.el.querySelector('[data-sheet-options]').hidden = !showSheets;
      if (showSheets) populateSheets();
      limit.textContent = option.kind === 'office' ? 'Бүрэн Office сервер баримтыг хөрвүүлж, шинэ файлыг хавтаст хадгална.' : ext === 'pdf' ? 'Зураг хөрвүүлэхэд нэг удаа 60 хуудас хүртэл. Зурагтай PDF-ээс текст задлах боломжгүй.' : sheetFormats.indexOf(ext) !== -1 ? 'CSV болон JSON-д нэг хуудасны өгөгдөл орно. Зураг, диаграм болон хэлбэржүүлэлт орохгүй.' : 'Зураг 25 сая цэг хүртэл. Текстийг PDF болгох хэмжээ 2 MiB хүртэл.';
    }
    target.addEventListener('change', function () { clearOutput(); update(); });
    pageSelect.addEventListener('change', function () { pageNumber.hidden = pageSelect.value !== 'single'; clearOutput(); }); pageNumber.addEventListener('input', clearOutput); sheetSelect.addEventListener('change', clearOutput);
    modal.el.querySelector('[data-close-convert]').onclick = function () { if (!state.busy) { state.closed = true; modal.close(); } };
    convert.onclick = async function () {
      if (state.busy || !chosen()) return; clearOutput();
      if (!sameContext(context)) { result.textContent = 'Хавтас солигдсон байна. Файлаа дахин нээгээрэй.'; return; }
      state.busy = true; convert.disabled = true; target.disabled = true; result.textContent = 'Хөрвүүлж байна…';
      try {
        var option = chosen(); cleanName(name.value, option.target);
        if (option.kind === 'office') {
          var response = await C.Folders.request('office_convert', { method: 'POST', timeout: 240000, body: { folder: identity(context.folder), file: file.id, target: option.target } });
          if (!sameContext(context)) throw new Error('Хавтас солигдсон байна. Хөрвүүлсэн файл эх хавтаст хадгалагдсан байж болно.');
          if (!response.file) throw new Error('Хөрвүүлсэн файл олдсонгүй.'); state.saved = true; result.textContent = 'Хөрвүүлсэн файл хавтаст хадгалагдлаа: ' + response.file.name; await C.Folders.refresh(); C.toast('Хөрвүүлсэн файл хадгалагдлаа');
        } else {
          var blob = await read(), selectedPage = pageSelect.value === 'single' ? Number(pageNumber.value) : null;
          if (selectedPage !== null && (!Number.isInteger(selectedPage) || selectedPage < 1)) throw new Error('Хуудасны дугаараа зөв оруулаарай.');
          state.result = await convertLocal(file, blob, option.target, { page: selectedPage, sheet: sheetSelect.value }, function (message) { result.textContent = message; });
          if (!sameContext(context)) throw new Error('Хавтас солигдсон байна. Файлаа дахин нээгээрэй.');
          name.value = cleanName(name.value, state.result.extension); get.disabled = add.disabled = false; result.textContent = 'Бэлэн · ' + (state.result.blob.size / 1024).toFixed(1) + ' KB. Татах эсвэл хавтаст хадгалаарай.';
        }
      } catch (error) { state.result = null; result.textContent = error.message; }
      finally { state.busy = false; convert.disabled = !state.options.length; target.disabled = false; }
    };
    get.onclick = function () { if (!state.result) return; try { download(state.result.blob, cleanName(name.value, state.result.extension)); } catch (error) { result.textContent = error.message; } };
    add.onclick = async function () {
      if (state.busy || !state.result) return;
      if (!sameContext(context)) { result.textContent = 'Хавтас солигдсон байна. Файлаа дахин нээгээрэй.'; return; }
      state.busy = true; add.disabled = true; convert.disabled = true; result.textContent = 'Хавтаст хадгалж байна…';
      try { var convertedName = cleanName(name.value, state.result.extension); await C.Folders.uploadBlob(state.result.blob, convertedName); state.saved = true; await C.Folders.refresh(); result.textContent = 'Хавтаст хадгалагдлаа: ' + convertedName; C.toast('Хөрвүүлсэн файл хадгалагдлаа'); }
      catch (error) { result.textContent = error.message; add.disabled = false; }
      finally { state.busy = false; convert.disabled = !state.options.length; }
    };
    renderOptions();
    if (C.OfficeEditor && officeFormats.indexOf(ext) !== -1) {
      try { var status = await C.OfficeEditor.status(); if (!state.closed && status.enabled) { var preserve = state.options.length > 0; state.office = true; addOfficeOptions(state.options, ext); renderOptions(preserve); } }
      catch (error) { /* Local conversion remains available. */ }
    }
  }
  C.FileConverter = { open: open, canConvert: canConvert, convertLocal: convertLocal };
})();

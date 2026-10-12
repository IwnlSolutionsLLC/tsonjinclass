/* Local text, Word, spreadsheet and PDF editors. Documents stay on this website. */
(function () {
  'use strict';
  var C = window.C122;
  if (!C) return;
  var base = new URL('assets/js/vendor/file-tools/', document.baseURI);
  var pending = Object.create(null), fontPromise = null;
  var libraries = {
    pdfLib: ['pdf-lib.min.js', 'PDFLib'], fontkit: ['fontkit.min.js', 'fontkit'],
    jszip: ['jszip.min.js', 'JSZip'], xlsx: ['xlsx.full.min.js', 'XLSX']
  };
  function loadLibrary(name) {
    if (name === 'pdfjs') {
      if (!pending.pdfjs) {
        var pdfBase = new URL('assets/js/vendor/pdfjs/', document.baseURI);
        pending.pdfjs = import(new URL('pdf.js', pdfBase).href).then(function (library) {
          library.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.js', pdfBase).href;
          return { library: library, base: pdfBase };
        }).catch(function (error) { delete pending.pdfjs; throw error; });
      }
      return pending.pdfjs;
    }
    var entry = libraries[name];
    if (!entry) return Promise.reject(new Error('Туслах програм олдсонгүй.'));
    if (window[entry[1]]) return Promise.resolve(window[entry[1]]);
    if (!pending[name]) pending[name] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = new URL(entry[0], base).href;
      script.onload = function () {
        if (window[entry[1]]) resolve(window[entry[1]]);
        else { delete pending[name]; reject(new Error('Засварлагч ачаалж чадсангүй.')); }
      };
      script.onerror = function () { delete pending[name]; script.remove(); reject(new Error('Засварлагч ачаалж чадсангүй. Дахин оролдоно уу.')); };
      document.head.appendChild(script);
    });
    return pending[name];
  }
  function fontBytes() {
    if (!fontPromise) fontPromise = fetch(new URL('NotoSans-Regular.ttf', base).href, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) throw new Error('Үсгийн хэв ачаалж чадсангүй.');
      return response.arrayBuffer();
    }).catch(function (error) { fontPromise = null; throw error; });
    return fontPromise;
  }
  C.FileLibraries = {
    load: loadLibrary, fontBytes: fontBytes,
    embedFont: async function (doc) {
      var results = await Promise.all([loadLibrary('fontkit'), fontBytes()]);
      doc.registerFontkit(results[0]);
      return doc.embedFont(new Uint8Array(results[1].slice(0)), { subset: true });
    }
  };

  var textExtensions = ['txt', 'md', 'csv', 'tsv', 'json', 'log', 'xml', 'html', 'css', 'js', 'yaml', 'yml'];
  var officeExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'odt', 'ods', 'odp', 'rtf', 'pdf'];
  function extension(file) { return String(file.name || '').split('.').pop().toLowerCase(); }
  function canEdit(file) { return textExtensions.concat(officeExtensions).indexOf(extension(file)) !== -1; }
  function copyName(name, suffix, ext) {
    var stem = String(name).replace(/\.[^.]+$/, '');
    return stem + ' — ' + (suffix || 'засварласан') + '.' + (ext || String(name).split('.').pop());
  }
  function identity(folder) { return folder && typeof folder === 'object' ? folder.id : folder; }
  function sameContext(captured) {
    var current = C.Folders && C.Folders.context();
    return current && !current.readOnly && identity(current.folder) === identity(captured.folder) && String(current.parent || '') === String(captured.parent || '');
  }
  function element(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, action, cls) {
    var node = element('button', 'btn ' + (cls || 'btn-ghost'), text);
    node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function label(text, input) {
    var wrap = element('label', 'fe-control'); wrap.appendChild(element('span', '', text)); wrap.appendChild(input); return wrap;
  }
  function note(node, text) { node.appendChild(element('p', 'fe-note', text)); }

  function shell(file, context) {
    var modal = C.openModal('<div class="fe-heading"><div><span class="eyebrow">ФАЙЛ ЗАСАХ</span><h3></h3></div><button class="btn btn-ghost fe-close" type="button" aria-label="Хаах">×</button></div><div class="fe-body"><p class="fe-note">Файл уншиж байна…</p></div><div class="fe-footer"><div class="fe-status" role="status" aria-live="polite"></div><div class="actions"><button type="button" class="btn btn-ghost" data-save-copy>Хуулбар хадгалах</button><button type="button" class="btn btn-primary" data-save>Хадгалах</button></div></div>', { wide: true, sticky: true });
    modal.el.classList.add('fe-dialog');
    modal.el.querySelector('h3').textContent = file.name;
    var state = { modal: modal, body: modal.el.querySelector('.fe-body'), status: modal.el.querySelector('.fe-status'), file: Object.assign({}, file), context: context, dirty: false, busy: false, closed: false, exportBlob: null, copyExtension: null, copyDefault: false, cleanup: null };
    var save = modal.el.querySelector('[data-save]'), copy = modal.el.querySelector('[data-save-copy]');
    save.disabled = copy.disabled = true;
    state.changed = function () { state.dirty = true; state.status.textContent = 'Хадгалаагүй өөрчлөлт'; };
    state.ready = function () { save.disabled = copy.disabled = false; state.status.textContent = 'Бэлэн'; if (state.copyDefault) { save.textContent = 'Эх файлыг солих'; copy.classList.remove('btn-ghost'); copy.classList.add('btn-primary'); save.classList.remove('btn-primary'); save.classList.add('btn-ghost'); } };
    async function close() {
      if (state.busy) return;
      if (state.dirty && !await C.confirm({ title: 'Өөрчлөлтөө хадгалахгүй хаах уу?', text: 'Хадгалаагүй өөрчлөлт устах болно.', ok: 'Хаах' })) return;
      state.closed = true; document.removeEventListener('keydown', shortcut);
      if (state.cleanup) state.cleanup(); modal.close();
    }
    async function persist(asCopy) {
      if (state.busy || !state.exportBlob) return;
      if (!sameContext(context)) { state.status.textContent = 'Хавтас солигдсон байна. Энэ файлыг дахин нээгээрэй.'; return; }
      if (!asCopy && state.copyDefault && !await C.confirm({ title: 'Эх файлыг солих уу?', text: 'Энгийн хүснэгт засварлагч зураг, диаграм болон зарим хэлбэржүүлэлтийг хадгалахгүй байж болно. Хуулбар хадгалах нь эх файлыг үлдээнэ.', ok: 'Эх файлыг солих' })) return;
      if (document.activeElement && modal.el.contains(document.activeElement)) document.activeElement.blur();
      state.busy = true; save.disabled = copy.disabled = true; state.status.textContent = 'Хадгалж байна…';
      try {
        var blob = await state.exportBlob();
        if (!sameContext(context)) throw new Error('Хавтас солигдсон байна. Файлыг дахин нээгээрэй.');
        if (blob.size > 32 * 1024 * 1024 && !asCopy) throw new Error('Эх файлыг засварлан хадгалах хэмжээ 32 MiB хүртэл. Хуулбар болгон хадгалаарай.');
        if (asCopy) await C.Folders.uploadBlob(blob, copyName(state.file.name, 'засварласан', state.copyExtension));
        else {
          var result = await C.Folders.saveFile(state.file, blob);
          if (result && result.file) state.file = Object.assign({}, result.file);
          else if (result && result.version !== undefined) state.file.version = result.version;
        }
        state.dirty = false; state.status.textContent = asCopy ? 'Хуулбар хавтаст хадгалагдлаа.' : 'Өөрчлөлт хадгалагдлаа.';
        await C.Folders.refresh(); C.toast(asCopy ? 'Хуулбар хадгалагдлаа' : 'Файл хадгалагдлаа');
      } catch (error) {
        state.status.textContent = error.status === 409 ? 'Файлыг өөр хүн өөрчилсөн байна. Өөрчлөлтөө хуулбар болгон хадгалаад файлаа дахин нээгээрэй.' : error.message;
      } finally { state.busy = false; save.disabled = copy.disabled = false; }
    }
    function shortcut(event) {
      if (state.closed) return;
      var backs = document.querySelectorAll('.modal-back');
      if (event.key === 'Escape' && backs.length && backs[backs.length - 1].contains(modal.el)) { event.preventDefault(); close(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && modal.el.contains(document.activeElement)) { event.preventDefault(); persist(state.copyDefault); }
    }
    document.addEventListener('keydown', shortcut);
    modal.el.querySelector('.fe-close').onclick = close;
    save.onclick = function () { persist(false); }; copy.onclick = function () { persist(true); };
    return state;
  }

  async function textEditor(state, blob, ext) {
    if (blob.size > 4 * 1024 * 1024) throw new Error('Текст засварлагч 4 MiB хүртэл файл нээнэ.');
    var bytes = new Uint8Array(await blob.arrayBuffer()), text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch (error) { throw new Error('Энэ текст UTF-8 хэлбэртэй биш байна. UTF-8 болгон хадгалаад дахин нээгээрэй.'); }
    if (text.indexOf('\u0000') !== -1) throw new Error('Энэ файл энгийн текст файл биш байна.');
    var bom = bytes.length >= 3 && bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191;
    var crlf = text.indexOf('\r\n') !== -1;
    state.body.replaceChildren();
    var toolbar = element('div', 'fe-toolbar');
    toolbar.appendChild(element('span', 'fe-note', ext.toUpperCase() + ' · Текст засварлагч'));
    var input = element('textarea', 'fe-textarea input'); input.value = text; input.spellcheck = false; input.setAttribute('aria-label', 'Файлын агуулга');
    if (ext === 'json') toolbar.appendChild(button('JSON цэгцлэх', function () {
      try { input.value = JSON.stringify(JSON.parse(input.value), null, 2); state.changed(); }
      catch (error) { state.status.textContent = 'JSON бүтэц алдаатай байна: ' + error.message; }
    }));
    state.body.append(toolbar, input);
    input.addEventListener('input', state.changed);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Tab') { event.preventDefault(); var start = input.selectionStart, end = input.selectionEnd; input.setRangeText('  ', start, end, 'end'); state.changed(); }
    });
    state.exportBlob = async function () {
      if (ext === 'json') { try { JSON.parse(input.value); } catch (error) { throw new Error('JSON бүтэц алдаатай байна: ' + error.message); } }
      var value = input.value.replace(/\r\n?/g, '\n');
      if (crlf) value = value.replace(/\n/g, '\r\n');
      return new Blob([(bom ? '\ufeff' : '') + value], { type: 'text/plain;charset=utf-8' });
    };
    state.ready(); input.focus();
  }

  var WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  function wordText(paragraph) {
    var parts = [];
    function walk(node) {
      if (node.nodeType === 1 && node.namespaceURI === WORD_NS) {
        if (node.localName === 't') { parts.push(node.textContent); return; }
        if (node.localName === 'tab') { parts.push('\t'); return; }
        if (node.localName === 'br' || node.localName === 'cr') { parts.push('\n'); return; }
      }
      Array.from(node.childNodes).forEach(walk);
    }
    walk(paragraph); return parts.join('');
  }
  function wordNode(doc, name) { return doc.createElementNS(WORD_NS, 'w:' + name); }
  function wordFormat(paragraph, name, enabled) {
    Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 'r')).forEach(function (run) {
      var props = Array.from(run.children).find(function (node) { return node.localName === 'rPr' && node.namespaceURI === WORD_NS; });
      if (!props) { props = wordNode(paragraph.ownerDocument, 'rPr'); run.insertBefore(props, run.firstChild); }
      var found = Array.from(props.children).filter(function (node) { return node.namespaceURI === WORD_NS && (node.localName === name || node.localName === name + 'Cs'); });
      found.forEach(function (node) { node.remove(); });
      var setting = wordNode(paragraph.ownerDocument, name); setting.setAttributeNS(WORD_NS, 'w:val', enabled ? '1' : '0'); props.appendChild(setting);
    });
  }
  function replaceWordText(paragraph, value) {
    var doc = paragraph.ownerDocument;
    var texts = Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 't'));
    Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 'br')).concat(Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 'cr')), Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 'tab'))).forEach(function (node) { node.remove(); });
    if (!texts.length) { var run = wordNode(doc, 'r'), text = wordNode(doc, 't'); run.appendChild(text); paragraph.appendChild(run); texts.push(text); }
    var remaining = value;
    texts.forEach(function (text, index) {
      var amount = index === texts.length - 1 ? remaining.length : Math.min(text.textContent.length, remaining.length);
      var chunk = remaining.slice(0, amount); remaining = remaining.slice(amount);
      var segments = chunk.split(/(\n|\t)/), fragment = doc.createDocumentFragment();
      segments.forEach(function (part) {
        if (part === '\n' || part === '\t') fragment.appendChild(wordNode(doc, part === '\n' ? 'br' : 'tab'));
        else { var item = wordNode(doc, 't'); item.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve'); item.textContent = part; fragment.appendChild(item); }
      });
      text.parentNode.replaceChild(fragment, text);
    });
  }
  async function wordEditor(state, blob) {
    var JSZip = await loadLibrary('jszip');
    var zip = await JSZip.loadAsync(await blob.arrayBuffer());
    var entry = zip.file('word/document.xml');
    if (!entry) throw new Error('Энэ файл DOCX баримт биш байна.');
    var total = 0;
    Object.keys(zip.files).forEach(function (key) { var item = zip.files[key]; total += item._data && Number(item._data.uncompressedSize) || 0; });
    if (total > 256 * 1024 * 1024 || (entry._data && entry._data.uncompressedSize > 8 * 1024 * 1024)) throw new Error('Баримтын агуулга энгийн засварлагчид хэт том байна.');
    var xml = await entry.async('string'), doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Word баримтын бүтэц алдаатай байна.');
    var paragraphs = Array.from(doc.getElementsByTagNameNS(WORD_NS, 'p'));
    if (paragraphs.length > 3000) throw new Error('Баримт 3,000-аас олон догол мөртэй байна. Бүрэн Word засварлагчаар нээгээрэй.');
    var records = [], list = element('div', 'fe-word-list');
    state.body.replaceChildren();
    note(state.body, 'Энгийн Word засварлагч: догол мөрийн текст, тод болон налуу үсэг. Зураг, хүснэгт болон баримтын бусад хэсэг эх файлд хадгалагдана. Нарийн хэлбэржүүлэлтэд бүрэн Word засварлагч ашиглаарай.');
    function addRow(paragraph, isNew) {
      var original = wordText(paragraph);
      var row = element('div', 'fe-word-row'), tools = element('div', 'fe-word-tools');
      var input = element('textarea', 'input'); input.value = original; input.rows = Math.max(1, Math.min(5, original.split('\n').length)); input.setAttribute('aria-label', 'Догол мөр ' + (records.length + 1));
      var record = { paragraph: paragraph, original: original, input: input, isNew: !!isNew, bold: null, italic: null }; records.push(record);
      function format(kind, control) {
        record[kind] = record[kind] !== true; control.setAttribute('aria-pressed', String(record[kind]));
        input.style[kind === 'bold' ? 'fontWeight' : 'fontStyle'] = record[kind] ? (kind === 'bold' ? 'bold' : 'italic') : 'normal'; state.changed();
      }
      var bold = button('B', function () { format('bold', bold); }); bold.setAttribute('aria-label', 'Догол мөрийг тод болгох'); bold.setAttribute('aria-pressed', 'false');
      var italic = button('I', function () { format('italic', italic); }); italic.setAttribute('aria-label', 'Догол мөрийг налуу болгох'); italic.setAttribute('aria-pressed', 'false');
      tools.append(element('span', 'fe-note', String(records.length)), bold, italic); row.append(tools, input); list.appendChild(row); input.addEventListener('input', state.changed); return input;
    }
    paragraphs.forEach(function (paragraph) { addRow(paragraph, false); });
    state.body.appendChild(list);
    state.body.appendChild(button('+ Догол мөр нэмэх', function () {
      var body = doc.getElementsByTagNameNS(WORD_NS, 'body')[0];
      var paragraph = wordNode(doc, 'p'), run = wordNode(doc, 'r'), text = wordNode(doc, 't'); text.textContent = ''; run.appendChild(text); paragraph.appendChild(run);
      var section = Array.from(body.children).find(function (node) { return node.localName === 'sectPr'; });
      body.insertBefore(paragraph, section || null); addRow(paragraph, true).focus(); state.changed();
    }));
    state.exportBlob = async function () {
      records.forEach(function (record) {
        if (record.input.value !== wordText(record.paragraph)) replaceWordText(record.paragraph, record.input.value);
        if (record.bold !== null) wordFormat(record.paragraph, 'b', record.bold);
        if (record.italic !== null) wordFormat(record.paragraph, 'i', record.italic);
      });
      zip.file('word/document.xml', new XMLSerializer().serializeToString(doc));
      return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
    };
    state.ready();
  }

  function editCell(sheet, address, value, XLSX) {
    var original = sheet[address] || {}, cell = Object.assign({}, original);
    ['v', 'f', 'F', 'w', 'h', 'r'].forEach(function (key) { delete cell[key]; });
    if (value === '') cell.t = 'z';
    else if (value[0] === '=') { cell.t = 'n'; cell.f = value.slice(1); if (!cell.f.trim()) throw new Error('Томьёо хоосон байна.'); }
    else if (value[0] === "'") { cell.t = 's'; cell.v = value.slice(1); }
    else if (/^(true|false)$/i.test(value)) { cell.t = 'b'; cell.v = value.toLowerCase() === 'true'; }
    else if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) && !/^[-+]?0\d/.test(value) && Number.isFinite(Number(value))) { cell.t = 'n'; cell.v = Number(value); }
    else { cell.t = 's'; cell.v = value; }
    sheet[address] = cell;
    var pos = XLSX.utils.decode_cell(address), range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : { s: pos, e: pos };
    range.s.r = Math.min(range.s.r, pos.r); range.s.c = Math.min(range.s.c, pos.c); range.e.r = Math.max(range.e.r, pos.r); range.e.c = Math.max(range.e.c, pos.c); sheet['!ref'] = XLSX.utils.encode_range(range);
  }
  function cellValue(cell) { return !cell || cell.t === 'z' ? '' : cell.f ? '=' + cell.f : cell.v instanceof Date ? cell.v.toISOString().slice(0, 10) : String(cell.v === undefined ? '' : cell.v); }
  async function spreadsheetEditor(state, blob, ext) {
    var XLSX = await loadLibrary('xlsx');
    var workbook = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: 'array', cellStyles: true, cellFormula: true, cellNF: true, bookVBA: true });
    if (!workbook.SheetNames.length) throw new Error('Хүснэгт олдсонгүй.');
    state.copyDefault = true; state.copyExtension = ext; state.body.replaceChildren();
    note(state.body, 'Нүд болон томьёог засаж, хуудас сольж болно. Томьёоны үр дүн Excel-д нээхэд шинэчлэгдэнэ. Зураг, диаграм болон зарим хэлбэржүүлэлтийг хадгалахгүй байж болох тул хуулбар хадгалахыг зөвлөж байна.');
    var controls = element('div', 'fe-toolbar'), selector = element('select', 'input'); selector.setAttribute('aria-label', 'Хүснэгтийн хуудас');
    workbook.SheetNames.forEach(function (name) { var option = element('option', '', name); option.value = name; selector.appendChild(option); });
    var position = element('input', 'input'); position.value = 'A1'; position.setAttribute('aria-label', 'Нүдний хаяг'); position.style.width = '100px';
    var formula = element('input', 'input'); formula.setAttribute('aria-label', 'Сонгосон нүдний утга эсвэл томьёо'); formula.placeholder = 'Утга эсвэл =SUM(A1:A5)';
    var formulaBar = element('div', 'fe-formula-bar'), selectedLabel = element('span', 'fe-note', 'A1'); formulaBar.append(selectedLabel, formula);
    var wrap = element('div', 'fe-grid-wrap'), table = element('table', 'fe-grid'); wrap.appendChild(table);
    var startRow = 0, startCol = 0, selectedAddress = 'A1', visible = Object.create(null), pageInfo = element('span', 'fe-note');
    function sheet() { return workbook.Sheets[selector.value]; }
    function selectCell(address) {
      selectedAddress = address; selectedLabel.textContent = address; formula.value = cellValue(sheet()[address]); position.value = address;
      Object.keys(visible).forEach(function (key) { visible[key].classList.toggle('selected', key === address); });
    }
    function commit(address, value) {
      if (cellValue(sheet()[address]) === value) return;
      try { editCell(sheet(), address, value, XLSX); if (visible[address]) visible[address].value = value; if (selectedAddress === address) formula.value = value; state.changed(); }
      catch (error) { state.status.textContent = error.message; }
    }
    function render() {
      table.replaceChildren(); visible = Object.create(null);
      var head = element('thead'), header = element('tr'); header.appendChild(element('th', '', '#'));
      for (var col = startCol; col < startCol + 12; col++) header.appendChild(element('th', '', XLSX.utils.encode_col(col)));
      head.appendChild(header); table.appendChild(head); var body = element('tbody');
      for (var row = startRow; row < Math.min(1048576, startRow + 30); row++) {
        var tr = element('tr'); tr.appendChild(element('th', '', String(row + 1)));
        for (var column = startCol; column < Math.min(16384, startCol + 12); column++) {
          var address = XLSX.utils.encode_cell({ r: row, c: column }), td = element('td'), input = element('input', 'fe-cell');
          input.type = 'text'; input.value = cellValue(sheet()[address]); input.setAttribute('aria-label', selector.value + ' ' + address); input.dataset.address = address;
          input.addEventListener('focus', function (event) { selectCell(event.target.dataset.address); });
          input.addEventListener('change', function (event) { commit(event.target.dataset.address, event.target.value); });
          input.addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); event.target.blur(); var next = XLSX.utils.decode_cell(event.target.dataset.address); next.r++; var target = visible[XLSX.utils.encode_cell(next)]; if (target) target.focus(); } });
          td.appendChild(input); tr.appendChild(td); visible[address] = input;
        }
        body.appendChild(tr);
      }
      table.appendChild(body); pageInfo.textContent = (startRow + 1) + '–' + Math.min(1048576, startRow + 30) + ' мөр · ' + XLSX.utils.encode_col(startCol) + '–' + XLSX.utils.encode_col(Math.min(16383, startCol + 11)); selectCell(selectedAddress);
    }
    controls.append(selector, position, button('Нүд рүү очих', function () {
      var address = position.value.trim().toUpperCase();
      if (!/^[A-Z]{1,3}[1-9]\d{0,6}$/.test(address)) { state.status.textContent = 'A1 гэх мэт нүдний хаяг оруулаарай.'; return; }
      var pos = XLSX.utils.decode_cell(address);
      if (pos.r >= 1048576 || pos.c >= 16384) { state.status.textContent = 'Нүдний хаяг хүснэгтийн хязгаараас гарсан байна.'; return; }
      startRow = Math.floor(pos.r / 30) * 30; startCol = Math.floor(pos.c / 12) * 12; selectedAddress = address; render(); if (visible[address]) visible[address].focus();
    }));
    var pager = element('div', 'fe-toolbar');
    pager.append(button('↑ Өмнөх мөрүүд', function () { startRow = Math.max(0, startRow - 30); render(); }), button('↓ Дараах мөрүүд', function () { startRow = Math.min(1048546, startRow + 30); render(); }), button('← Багана', function () { startCol = Math.max(0, startCol - 12); render(); }), button('Багана →', function () { startCol = Math.min(16372, startCol + 12); render(); }), pageInfo);
    selector.addEventListener('change', function () { startRow = startCol = 0; selectedAddress = 'A1'; render(); });
    formula.addEventListener('change', function () { commit(selectedAddress, formula.value); });
    formula.addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); formula.blur(); } });
    state.body.append(controls, formulaBar, wrap, pager); render();
    state.exportBlob = async function () {
      workbook.Workbook = workbook.Workbook || {}; workbook.Workbook.CalcPr = Object.assign({}, workbook.Workbook.CalcPr, { fullCalcOnLoad: true, forceFullCalc: true, calcMode: 'auto' });
      return new Blob([XLSX.write(workbook, { type: 'array', bookType: ext === 'xls' ? 'biff8' : 'xlsx', cellStyles: true, bookSST: false })], { type: ext === 'xls' ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    };
    state.ready();
  }

  function hexRgb(value, PDFLib) { return PDFLib.rgb(parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255); }
  async function pdfEditor(state, blob) {
    var bytes = await blob.arrayBuffer(), results = await Promise.all([C.FileLibraries.load('pdfLib'), C.FileLibraries.load('pdfjs')]);
    var PDFLib = results[0], pdfjs = results[1]; await PDFLib.PDFDocument.load(new Uint8Array(bytes.slice(0)));
    var loading = pdfjs.library.getDocument({ data: new Uint8Array(bytes.slice(0)), cMapUrl: new URL('cmaps/', pdfjs.base).href, cMapPacked: true, standardFontDataUrl: new URL('standard_fonts/', pdfjs.base).href, wasmUrl: new URL('wasm/', pdfjs.base).href, isEvalSupported: false });
    var pdf = await loading.promise;
    if (pdf.numPages > 500) { await pdf.destroy(); throw new Error('Энгийн PDF засварлагч 500 хүртэл хуудастай файл нээнэ.'); }
    var pages = Array.from({ length: pdf.numPages }, function (_, index) { return { source: index, rotation: 0, annotations: [] }; });
    var current = 0, viewport = null, renderTask = null, renderSeq = 0, drawing = null;
    state.body.replaceChildren(); note(state.body, 'PDF дээр текст, гар зураг нэмэх, хуудас эргүүлэх, дараалал солих болон устгах боломжтой. Эх PDF-ийн байгаа текстийг энэ энгийн засварлагч өөрчлөхгүй.');
    var toolbar = element('div', 'fe-toolbar'), pageLabel = element('span', 'fe-note'), mode = element('select', 'input');
    [['text', 'Текст нэмэх'], ['pen', 'Гар зураг'], ['highlight', 'Тодруулагч']].forEach(function (entry) { var option = element('option', '', entry[1]); option.value = entry[0]; mode.appendChild(option); }); mode.setAttribute('aria-label', 'PDF хэрэгсэл');
    var text = element('input', 'input'); text.placeholder = 'Нэмэх текст'; text.setAttribute('aria-label', 'PDF дээр нэмэх текст');
    var size = element('input', 'input'); size.type = 'number'; size.min = '8'; size.max = '72'; size.value = '18'; size.setAttribute('aria-label', 'Үсгийн хэмжээ'); size.style.width = '85px';
    var color = element('input', 'input'); color.type = 'color'; color.value = '#2454a4'; color.setAttribute('aria-label', 'Өнгө'); color.style.width = '50px';
    var stage = element('div', 'fe-pdf-stage'), canvas = element('canvas', 'fe-pdf-canvas'), overlay = element('canvas', 'fe-pdf-overlay'); stage.append(canvas, overlay);
    function paint() {
      if (!viewport) return;
      var ctx = overlay.getContext('2d'); ctx.clearRect(0, 0, overlay.width, overlay.height);
      var all = pages[current].annotations.concat(drawing ? [drawing] : []);
      all.forEach(function (annotation) {
        ctx.save(); ctx.strokeStyle = ctx.fillStyle = annotation.color;
        if (annotation.type === 'text') {
          var point = viewport.convertToViewportPoint(annotation.x, annotation.y);
          ctx.font = (annotation.size * viewport.scale) + 'px sans-serif'; ctx.fillText(annotation.text, point[0], point[1]);
        } else {
          ctx.globalAlpha = annotation.type === 'highlight' ? 0.25 : 1; ctx.lineWidth = (annotation.type === 'highlight' ? 16 : 2) * viewport.scale; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath();
          annotation.points.forEach(function (point, index) { var screen = viewport.convertToViewportPoint(point[0], point[1]); if (!index) ctx.moveTo(screen[0], screen[1]); else ctx.lineTo(screen[0], screen[1]); }); ctx.stroke();
        }
        ctx.restore();
      });
    }
    async function render() {
      var sequence = ++renderSeq; if (renderTask) { renderTask.cancel(); renderTask = null; }
      viewport = null; overlay.style.pointerEvents = 'none'; pageLabel.textContent = (current + 1) + ' / ' + pages.length;
      try {
        var page = await pdf.getPage(pages[current].source + 1); if (state.closed || sequence !== renderSeq) return;
        var natural = page.getViewport({ scale: 1, rotation: (page.rotate + pages[current].rotation) % 360 });
        viewport = page.getViewport({ scale: Math.min(1.5, 800 / natural.width), rotation: (page.rotate + pages[current].rotation) % 360 });
        canvas.width = overlay.width = Math.ceil(viewport.width); canvas.height = overlay.height = Math.ceil(viewport.height); stage.style.width = canvas.width + 'px';
        renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }); await renderTask.promise;
        if (state.closed || sequence !== renderSeq) return; renderTask = null; overlay.style.pointerEvents = ''; paint();
      } catch (error) { if (error.name !== 'RenderingCancelledException' && !state.closed) state.status.textContent = error.message; }
    }
    toolbar.append(button('← Хуудас', function () { if (current > 0) { current--; render(); } }), pageLabel, button('Хуудас →', function () { if (current < pages.length - 1) { current++; render(); } }), button('Эргүүлэх ↻', function () { pages[current].rotation = (pages[current].rotation + 90) % 360; state.changed(); render(); }), button('Урагш зөөх', function () { if (current > 0) { var page = pages.splice(current, 1)[0]; pages.splice(--current, 0, page); state.changed(); render(); } }), button('Хойш зөөх', function () { if (current < pages.length - 1) { var page = pages.splice(current, 1)[0]; pages.splice(++current, 0, page); state.changed(); render(); } }), button('Хуудас устгах', async function () {
      if (pages.length === 1) { state.status.textContent = 'PDF дор хаяж нэг хуудастай байх ёстой.'; return; }
      if (!await C.confirm({ title: 'Энэ хуудсыг устгах уу?', ok: 'Устгах', danger: true })) return;
      pages.splice(current, 1); current = Math.min(current, pages.length - 1); state.changed(); render();
    }));
    var tools = element('div', 'fe-toolbar'); tools.append(mode, text, label('Хэмжээ', size), label('Өнгө', color), button('Сүүлийн нэмэлтийг буцаах', function () { if (pages[current].annotations.length) { pages[current].annotations.pop(); state.changed(); paint(); } }));
    function point(event) { var rect = overlay.getBoundingClientRect(); return viewport.convertToPdfPoint((event.clientX - rect.left) * overlay.width / rect.width, (event.clientY - rect.top) * overlay.height / rect.height); }
    overlay.addEventListener('pointerdown', function (event) {
      if (!viewport || state.busy) return; event.preventDefault(); var p = point(event);
      if (mode.value === 'text') {
        if (!text.value.trim()) { state.status.textContent = 'Нэмэх текстээ бичээд хуудсан дээр дарна уу.'; text.focus(); return; }
        pages[current].annotations.push({ type: 'text', x: p[0], y: p[1], text: text.value, size: Math.max(8, Math.min(72, Number(size.value) || 18)), color: color.value }); state.changed(); paint();
      } else { drawing = { type: mode.value, color: mode.value === 'highlight' ? '#f4c430' : color.value, points: [p] }; overlay.setPointerCapture(event.pointerId); }
    });
    overlay.addEventListener('pointermove', function (event) { if (drawing && viewport) { drawing.points.push(point(event)); paint(); } });
    function finishDrawing() { if (drawing) { if (drawing.points.length > 1) { pages[current].annotations.push(drawing); state.changed(); } drawing = null; paint(); } }
    overlay.addEventListener('pointerup', finishDrawing); overlay.addEventListener('pointercancel', finishDrawing);
    state.body.append(toolbar, tools, stage);
    state.cleanup = function () { renderSeq++; if (renderTask) renderTask.cancel(); pdf.destroy(); };
    state.exportBlob = async function () {
      finishDrawing(); var output = await PDFLib.PDFDocument.load(new Uint8Array(bytes.slice(0))); var font = null;
      if (pages.some(function (page) { return page.annotations.some(function (annotation) { return annotation.type === 'text'; }); })) font = await C.FileLibraries.embedFont(output);
      var originals = output.getPages();
      for (var pageIndex = originals.length - 1; pageIndex >= 0; pageIndex--) output.removePage(pageIndex);
      pages.forEach(function (record, index) {
        var page = originals[record.source];
        page.setRotation(PDFLib.degrees((page.getRotation().angle + record.rotation) % 360)); output.insertPage(index, page);
        record.annotations.forEach(function (annotation) {
          if (annotation.type === 'text') page.drawText(annotation.text, { x: annotation.x, y: annotation.y, size: annotation.size, font: font, color: hexRgb(annotation.color, PDFLib) });
          else annotation.points.slice(1).forEach(function (point, pointIndex) { var start = annotation.points[pointIndex]; page.drawLine({ start: { x: start[0], y: start[1] }, end: { x: point[0], y: point[1] }, thickness: annotation.type === 'highlight' ? 16 : 2, opacity: annotation.type === 'highlight' ? 0.25 : 1, color: hexRgb(annotation.color, PDFLib) }); });
        });
      });
      return new Blob([await output.save()], { type: 'application/pdf' });
    };
    state.ready(); await render();
  }

  async function openBasic(file) {
    var context = C.Folders && C.Folders.context();
    if (!context || context.readOnly || !identity(context.folder)) return;
    var ext = extension(file), state = shell(file, context);
    try {
      if (Number(file.size) > 32 * 1024 * 1024) throw new Error('Энгийн засварлагч 32 MiB хүртэл файл нээнэ.');
      var blob = await C.Folders.readFile(file); if (state.closed) return;
      if (textExtensions.indexOf(ext) !== -1) await textEditor(state, blob, ext);
      else if (ext === 'docx') await wordEditor(state, blob);
      else if (ext === 'xlsx' || ext === 'xls') await spreadsheetEditor(state, blob, ext);
      else if (ext === 'pdf') await pdfEditor(state, blob);
      else throw new Error('Энэ хэлбэрт бүрэн Office засварлагч шаардлагатай. DOCX эсвэл XLSX хувилбараар дахин оруулж болно.');
    } catch (error) { if (!state.closed) { state.body.replaceChildren(element('p', 'fe-note', error.message)); state.status.textContent = 'Файл нээгдсэнгүй.'; } }
  }
  async function open(file) {
    if (!canEdit(file)) { C.toast('Энэ файлын хэлбэрийг засах боломжгүй байна.', 'error'); return; }
    var ext = extension(file), context = C.Folders && C.Folders.context();
    if (!context || context.readOnly) return;
    if (textExtensions.indexOf(ext) !== -1) return openBasic(file);
    var officeError = '';
    if (C.OfficeEditor) {
      try { var status = await C.OfficeEditor.status(); if (!sameContext(context)) return; if (status.enabled) return await C.OfficeEditor.open(file); }
      catch (error) { officeError = error.message || 'Бүрэн засварлагчтай холбогдож чадсангүй.'; C.toast(officeError, 'error'); }
    }
    var fallback = ['docx', 'xlsx', 'xls', 'pdf'].indexOf(ext) !== -1;
    var message = officeError ? 'Бүрэн засварлагчийг нээж чадсангүй: ' + C.esc(officeError) : 'Word, Excel болон PDF-ийн бүрэн засварлагчийг сайтын эзэн серверт холбож тохируулна. Тохиргооны заавар сайтын багцад байна.';
    var modal = C.openModal('<div class="modal-icon">' + C.icon('file') + '</div><h3>Бүрэн Office засварлагч</h3><p class="lead">' + message + '</p>' + (fallback ? '<p class="fe-note">Одоогоор энэ файлыг энгийн засварлагчаар засаж болно.</p>' : '<p class="fe-note">Энэ хэлбэр энгийн засварлагчид дэмжигдэхгүй. Бүрэн засварлагчийг тохируулсны дараа дахин нээгээрэй.</p>') + '<div class="actions"><button class="btn btn-ghost" data-close>Хаах</button>' + (fallback ? '<button class="btn btn-primary" type="button" data-basic>Энгийн засварлагч</button>' : '') + '</div>');
    if (fallback) modal.el.querySelector('[data-basic]').onclick = function () { modal.close(); if (sameContext(context)) openBasic(file); };
  }

  async function preview(file, box, opts) {
    opts = opts || {};
    var ext = extension(file);
    if (['docx', 'xlsx', 'xls'].indexOf(ext) === -1) return false;
    if (Number(file.size) > 32 * 1024 * 1024) throw new Error('Баримт урьдчилж харахад хэт том байна. Файлыг татаж нээгээрэй.');
    var response = await fetch(opts.url, { credentials: 'same-origin', cache: 'no-store', signal: opts.signal });
    if (!response.ok) { var error = new Error('Баримтыг уншиж чадсангүй (' + response.status + ').'); error.status = response.status; throw error; }
    var bytes = await response.arrayBuffer();
    if (bytes.byteLength > 32 * 1024 * 1024) throw new Error('Баримт урьдчилж харахад хэт том байна.');
    function alive() { return !(opts.signal && opts.signal.aborted) && box.isConnected; }
    if (!alive()) return true;
    if (ext === 'docx') {
      var JSZip = await loadLibrary('jszip'), zip = await JSZip.loadAsync(bytes), entry = zip.file('word/document.xml');
      if (!entry || (entry._data && entry._data.uncompressedSize > 8 * 1024 * 1024)) throw new Error('Word баримтын агуулгыг харах боломжгүй байна.');
      var doc = new DOMParser().parseFromString(await entry.async('string'), 'application/xml');
      if (doc.getElementsByTagName('parsererror').length) throw new Error('Word баримтын бүтэц алдаатай байна.');
      if (!alive()) return true;
      var paragraphs = Array.from(doc.getElementsByTagNameNS(WORD_NS, 'p'));
      box.replaceChildren(); note(box, 'Word баримтын текстийг харуулж байна. Зураг болон бүрэн хэлбэржүүлэлтийг татаж эсвэл бүрэн засварлагчаар нээж хараарай.');
      var article = element('article', 'fe-document-preview'), limit = Math.min(1000, paragraphs.length);
      for (var i = 0; i < limit; i++) article.appendChild(element('p', '', wordText(paragraphs[i]) || '\u00a0'));
      box.appendChild(article);
      if (paragraphs.length > limit) note(box, 'Эхний 1,000 догол мөрийг харууллаа. Бүтэн баримтыг татаж нээгээрэй.');
    } else {
      var XLSX = await loadLibrary('xlsx'), workbook = XLSX.read(new Uint8Array(bytes), { type: 'array', cellFormula: true });
      if (!alive()) return true;
      box.replaceChildren(); note(box, 'Эхний 100 мөр, 20 баганыг харуулж байна. Томьёоны хадгалсан үр дүн эсвэл томьёог харуулна.');
      var toolbar = element('div', 'fe-toolbar'), selector = element('select', 'input'); selector.setAttribute('aria-label', 'Хүснэгтийн хуудас');
      workbook.SheetNames.forEach(function (name) { var option = element('option', '', name); option.value = name; selector.appendChild(option); }); toolbar.appendChild(selector);
      var wrap = element('div', 'fe-grid-wrap'), table = element('table', 'fe-grid'); wrap.appendChild(table); box.append(toolbar, wrap);
      function renderSheet() {
        table.replaceChildren(); var sheet = workbook.Sheets[selector.value]; if (!sheet || !sheet['!ref']) return;
        var range = XLSX.utils.decode_range(sheet['!ref']), head = element('tr'); head.appendChild(element('th', '', '#'));
        for (var col = range.s.c; col <= Math.min(range.e.c, range.s.c + 19); col++) head.appendChild(element('th', '', XLSX.utils.encode_col(col)));
        table.appendChild(head);
        for (var row = range.s.r; row <= Math.min(range.e.r, range.s.r + 99); row++) {
          var tr = element('tr'); tr.appendChild(element('th', '', String(row + 1)));
          for (var column = range.s.c; column <= Math.min(range.e.c, range.s.c + 19); column++) {
            var cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
            var value = cell && cell.v !== undefined ? XLSX.utils.format_cell(cell) : cellValue(cell);
            tr.appendChild(element('td', '', value));
          }
          table.appendChild(tr);
        }
      }
      selector.addEventListener('change', renderSheet); renderSheet();
    }
    return true;
  }
  C.FileEditors = { open: open, canEdit: canEdit, openBasic: openBasic, preview: preview };
})();

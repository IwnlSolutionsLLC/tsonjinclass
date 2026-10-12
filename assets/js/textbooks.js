/* Албан ёсны номын уншигч + сурагчийн хувийн, вэбсайтад хадгалах ажлын дэвтэр. */
(function () {
  'use strict';
  var C = window.C122, view = document.getElementById('view-textbooks');
  if (!C || !view) return;
  var $ = function (id) { return document.getElementById(id); };
  var catalog;
  try { catalog = JSON.parse($('textbooksData').textContent); } catch (error) { return; }
  var books = catalog.books || [], category = '', search = '', initialized = false;
  var colors = ['#183d32','#000000','#595e66','#a1a6ab','#ffffff','#dd4848','#f18b36','#e3ba32','#8bb23e','#2a9664','#43b5ae','#327abe','#6057ac','#ae5fc0','#dc6a9f','#905a3c'];
  var state = { book: null, folder: null, folders: [], csrf: null, version: null, drawing: blankDrawing(), savedStrokes: 0, color: colors[0], width: 4, stroke: null, pointer: null, loading: false, saving: false, dirty: false, conflict: false, revision: 0, context: 0, timer: null, frameTimer: null, expanded: false, backup: null };
  var canvas = $('textbookDrawCanvas'), ctx = canvas.getContext('2d');
  function blankDrawing() { return { width: 1200, height: 800, strokes: [] }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function draftKey(folder, book) { return 'c122:study-draft:v2:' + folder + ':' + book; }
  function localRead(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (error) { return null; } }
  function localWrite(key, value) { try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); return true; } catch (error) { return false; } }
  function validBook(book) { return book && /^https:\/\/econtent\.edu\.mn\/pages\/more\.php\?id=\d+$/.test(book.url) && /^https:\/\/medle\.mn\/textbook\/12\/\d+$/.test(book.medleUrl); }
  async function request(action, opts) {
    opts = opts || {};
    var url = 'api.php?action=' + encodeURIComponent(action), headers = {}, isPost = opts.body !== undefined;
    Object.keys(opts.query || {}).forEach(function (key) { url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(opts.query[key]); });
    if (state.csrf && isPost) headers['X-Folder-CSRF'] = state.csrf;
    if (isPost) headers['Content-Type'] = 'application/json';
    var response;
    try { response = await fetch(url, { method: isPost ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: headers, body: isPost ? JSON.stringify(opts.body) : undefined }); }
    catch (error) { throw new Error('Сүлжээ тасарлаа. Хадгалаагүй ажлын хуулбарыг энэ төхөөрөмжид үлдээв.'); }
    var data;
    try { data = await response.json(); } catch (error) { data = null; }
    if (!response.ok || !data || data.ok === false) { var ex = new Error(data && data.error || 'Серверийн алдаа (' + response.status + ')'); ex.status = response.status; ex.data = data; throw ex; }
    return data;
  }
  function renderBooks() {
    var term = search.trim().toLocaleLowerCase(), filtered = books.filter(function (book) { return (!category || book.category === category) && (!term || (book.title + ' ' + book.subject).toLocaleLowerCase().indexOf(term) >= 0); });
    $('textbookCount').textContent = filtered.length + ' / ' + books.length + ' ном';
    $('textbookGrid').innerHTML = filtered.length ? filtered.map(function (book) {
      return '<article class="textbook-card tone-' + C.esc(book.tone) + '"><button class="textbook-cover-button" type="button" data-open-book="' + C.esc(book.id) + '" aria-label="' + C.esc(book.title) + ' унших"><div class="textbook-cover"><span class="textbook-cover-top">ЕРӨНХИЙ БОЛОВСРОЛЫН<br>СУРАХ БИЧИГ</span><span class="textbook-cover-mark">' + C.esc(book.mark) + '</span><span class="textbook-cover-title">' + C.esc(book.subject) + '<br><span class="textbook-cover-grade">XII</span></span></div></button><div class="textbook-card-copy"><span>' + C.esc(book.category) + '</span><h4>' + C.esc(book.title) + '</h4></div><div class="textbook-card-links"><button class="textbook-read-link" type="button" data-open-book="' + C.esc(book.id) + '">Унших + ажиллах ↗</button><a href="' + C.esc(book.medleUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="' + C.esc(book.title) + ' MEDLE-д нээх">MEDLE ↗</a></div></article>';
    }).join('') : '<div class="textbook-empty">Ийм нэртэй ном олдсонгүй. Өөр нэрээр хайгаарай.</div>';
  }
  function renderFilters() {
    var categories = [''].concat(books.reduce(function (list, book) { if (list.indexOf(book.category) < 0) list.push(book.category); return list; }, []));
    $('textbookFilters').innerHTML = categories.map(function (name) { return '<button class="textbook-filter' + (name === category ? ' on' : '') + '" type="button" data-book-category="' + C.esc(name) + '" aria-pressed="' + (name === category) + '">' + C.esc(name || 'Бүгд') + '</button>'; }).join('');
  }
  function snapshot() { return { page: $('textbookNotePage').value, text: $('textbookNote').value, drawing: clone(state.drawing), version: state.version, savedStrokes: state.savedStrokes, time: Date.now() }; }
  function rememberDraft() { if (!state.folder || !state.book || !state.dirty) return; localWrite(draftKey(state.folder.id, state.book.id), snapshot()); }
  function controls() {
    var available = !!state.folder && !!state.csrf && !state.loading && !state.conflict;
    $('textbookNote').disabled = $('textbookNotePage').disabled = !available;
    $('textbookSaveFolder').disabled = !available || state.saving;
    $('textbookDrawWidth').disabled = !available;
    $('textbookDrawUndo').disabled = !available || state.saving || state.drawing.strokes.length <= state.savedStrokes;
    $('textbookRestoreDraft').disabled = state.saving || !available;
    canvas.setAttribute('aria-disabled', available ? 'false' : 'true');
    canvas.style.cursor = available ? 'crosshair' : 'not-allowed';
    $('textbookStudent').textContent = state.folder ? state.folder.name + (state.csrf ? ' · хувийн ажлын дэвтэр' : ' · дахин нэвтрээрэй') : 'Хувийн ажлаа нээхийн тулд нэвтрээрэй.';
    $('textbookStudentLogin').innerHTML = C.icon('lock', 'i-sm') + (state.folder && state.csrf ? 'Солих' : 'Нэвтрэх');
  }
  function setDraftStatus(message) { $('textbookDraftStatus').textContent = message; }
  function changed() {
    state.dirty = true; state.revision++;
    rememberDraft(); controls();
    setDraftStatus('Вэбсайтад хадгалахаар бэлдэж байна…');
    clearTimeout(state.timer);
    if (!state.conflict && state.csrf) state.timer = setTimeout(function () { saveWork(false); }, 1200);
  }
  function renderDrawing() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.drawing.strokes.concat(state.stroke ? [state.stroke] : []).forEach(function (stroke) {
      if (!stroke.points.length) return;
      ctx.strokeStyle = ctx.fillStyle = stroke.color; ctx.lineWidth = stroke.width; ctx.lineCap = ctx.lineJoin = 'round';
      if (stroke.points.length === 1) { ctx.beginPath(); ctx.arc(stroke.points[0][0], stroke.points[0][1], stroke.width / 2, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.beginPath(); ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
      stroke.points.slice(1).forEach(function (point) { ctx.lineTo(point[0], point[1]); }); ctx.stroke();
    });
  }
  function setWork(note) {
    $('textbookNote').value = note && note.text || ''; $('textbookNotePage').value = note && note.page || '';
    state.drawing = note && note.drawing ? clone(note.drawing) : blankDrawing(); state.savedStrokes = state.drawing.strokes.length;
    state.version = note && note.version || null; state.stroke = null; state.dirty = false; state.conflict = false; state.revision++;
    renderDrawing(); controls();
    $('textbookRemoteStatus').textContent = note ? 'Ажил таны хувийн хавтсанд хадгалагдсан. Өөр төхөөрөмжөөс нэр, кодоороо нэвтэрч нээнэ.' : 'Шинэ ажил. Бичиж эсвэл зурж эхлэхэд вэбсайтад автоматаар хадгална.';
    $('textbookLoadRemote').hidden = true;
  }
  async function loadWork() {
    if (!state.book || !state.folder || !state.csrf) return;
    var context = state.context, folder = state.folder.id, book = state.book.id;
    state.loading = true; controls(); setDraftStatus('Хувийн ажлыг вэбсайтаас нээж байна…');
    try {
      var data = await request('study_note', { query: { folder: folder, book: book } });
      if (context !== state.context) return;
      state.csrf = data.csrf || state.csrf; setWork(data.note);
      state.backup = localRead(draftKey(folder, book));
      var draftDiffers = state.backup && (state.backup.text !== $('textbookNote').value || state.backup.page !== $('textbookNotePage').value || JSON.stringify(state.backup.drawing) !== JSON.stringify(state.drawing));
      $('textbookRestoreDraft').hidden = !draftDiffers;
      if (!draftDiffers) { state.backup = null; localWrite(draftKey(folder, book), null); }
      setDraftStatus(draftDiffers ? 'Энэ төхөөрөмжид хадгалагдаагүй ажлын хуулбар байна. Хүсвэл сэргээгээрэй.' : 'Ажил вэбсайтаас нээгдлээ. Өөрчлөлт автоматаар хадгалагдана.');
    } catch (error) {
      if (context !== state.context) return;
      if (error.status === 401) state.csrf = null;
      state.conflict = true; $('textbookLoadRemote').hidden = false;
      setDraftStatus(error.message);
    } finally { if (context === state.context) { state.loading = false; controls(); } }
  }
  async function saveWork(explicit) {
    clearTimeout(state.timer);
    if (!state.folder || !state.csrf || !state.book || state.loading || state.conflict || state.stroke) return;
    if (state.saving) { if (explicit) C.toast('Ажлыг хадгалж байна…'); return; }
    if (!state.dirty) { if (explicit) C.toast('Ажил вэбсайтад хадгалагдсан байна.'); return; }
    var context = state.context, revision = state.revision, folder = state.folder.id, book = state.book.id, draft = snapshot();
    if (new TextEncoder().encode(draft.text).length > 65536) { setDraftStatus('Тэмдэглэл 64 КБ хүртэл байна. TXT татаад тэмдэглэлээ товчлоорой.'); return; }
    var body = { folder: folder, book: book, page: draft.page, text: draft.text, drawing: draft.drawing, version: state.version };
    if (new TextEncoder().encode(JSON.stringify(body)).length > 1040000) { setDraftStatus('Зургийн хэмжээ дүүрсэн байна. Одоогийн ажлаа TXT хэлбэрээр татаарай.'); return; }
    state.saving = true; controls(); setDraftStatus('Ажлыг вэбсайтад хадгалж байна…');
    try {
      var data;
      try { data = await request('study_note_save', { body: body }); }
      catch (accessError) {
        if (accessError.status !== 403 || !accessError.data || !accessError.data.csrfInvalid || context !== state.context) throw accessError;
        var refreshed = await request('study_note', { query: { folder: folder, book: book } });
        if (context !== state.context) return;
        state.csrf = refreshed.csrf || state.csrf;
        data = await request('study_note_save', { body: body });
      }
      if (context !== state.context) return;
      state.version = data.note.version; state.csrf = data.csrf || state.csrf; state.savedStrokes = draft.drawing.strokes.length;
      state.dirty = state.revision !== revision;
      if (!state.dirty) { localWrite(draftKey(folder, book), null); state.backup = null; $('textbookRestoreDraft').hidden = true; }
      else rememberDraft();
      setDraftStatus(state.dirty ? 'Шинэ өөрчлөлтийг хадгалах гэж байна…' : 'Вэбсайтад хадгалагдлаа ✓');
      $('textbookRemoteStatus').textContent = 'Ажил ' + state.folder.name + '-ын хувийн хавтсанд хадгалагдсан.';
      if (explicit) C.toast('Ажлыг вэбсайтад хадгаллаа.');
    } catch (error) {
      if (context !== state.context) return;
      rememberDraft();
      if (error.status === 401) state.csrf = null;
      if (error.status === 409) { state.conflict = true; $('textbookLoadRemote').hidden = false; }
      setDraftStatus(error.message + ' Хадгалаагүй хуулбар энэ төхөөрөмжид үлдсэн.');
      if (explicit) C.toast(error.message, 'error');
    } finally {
      if (context === state.context) {
        state.saving = false; controls();
        if (state.dirty && state.revision !== revision && !state.conflict && state.csrf) state.timer = setTimeout(function () { saveWork(false); }, 900);
      }
    }
  }
  async function leaveWork() {
    if (state.stroke) endStroke();
    rememberDraft(); clearTimeout(state.timer);
    if (state.saving) { C.toast('Хадгалалт дуусахыг түр хүлээгээрэй.'); return false; }
    if (state.dirty && !state.conflict && state.csrf) await saveWork(true);
    if (state.saving) return false;
    return true;
  }
  async function openBook(id) {
    var book = books.find(function (item) { return String(item.id) === String(id); });
    if (!validBook(book) || !await leaveWork()) return;
    state.context++; state.book = book; state.loading = state.saving = false; state.backup = null;
    closeExpanded(); setWork(null); $('textbookRestoreDraft').hidden = true;
    $('textbooksHome').hidden = true; $('textbookReader').hidden = false;
    $('textbookReaderTitle').textContent = book.title;
    $('textbookOriginal').href = $('textbookFallback').href = book.url; $('textbookMedle').href = book.medleUrl;
    $('textbookFrameStatus').textContent = 'ECONTENT-ийн уншигч ачаалж байна…';
    clearTimeout(state.frameTimer);
    $('textbookFrame').src = book.url;
    state.frameTimer = setTimeout(function () { $('textbookFrameStatus').textContent = 'ECONTENT-ийн уншигч · шаардлагатай бол эх сайтад нээгээрэй'; }, 10000);
    setDraftStatus(state.folder && state.csrf ? 'Хувийн ажлыг нээж байна…' : 'Өөрийн нэр, 4 оронтой кодоор нэвтрэхэд ажил тань вэбсайтад хадгалагдана.');
    await loadWork();
    $('textbookReaderTitle').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  async function chooseStudent() {
    if (!await leaveWork()) return;
    var modal = C.openModal('<h3>Миний ажлын дэвтэр</h3><p class="textbook-folder-help">Нэрээ сонгоод хувийн хавтасны 4 оронтой кодоо оруулна уу. Тэмдэглэл, зургийг өөр төхөөрөмжөөс ч нээж болно.</p><form><label class="field"><span>Миний нэр</span><select id="studyStudentPicker" class="input"><option value="">Ачаалж байна…</option></select></label><label class="field textbook-pin-field"><span>Хувийн хавтасны нууц үг</span><input id="studyStudentPin" class="input textbook-pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="••••"></label><p class="textbook-cloud-note">Энэ нь цомгийн кодоос тусдаа, өөрийн хавтасны код юм.</p><div class="err" role="status"></div><div class="actions"><button class="btn btn-ghost" type="button" data-close>Цуцлах</button><button class="btn btn-primary" type="submit" disabled>Ажлаа нээх</button></div></form>');
    modal.el.classList.add('textbook-save-modal');
    var picker = modal.el.querySelector('#studyStudentPicker'), pin = modal.el.querySelector('#studyStudentPin'), error = modal.el.querySelector('.err'), button = modal.el.querySelector('[type=submit]');
    var active = true, modalClose = modal.close;
    modal.close = function () { active = false; modalClose(); };
    function selected() { return state.folders.find(function (folder) { return folder.id === picker.value; }); }
    function updatePin() { var folder = selected(); pin.closest('label').hidden = !!(folder && folder.unlocked); error.textContent = ''; }
    picker.onchange = updatePin;
    try {
      var data = await request('folders'); if (!modal.el.isConnected) return;
      state.folders = data.folders || [];
      picker.innerHTML = state.folders.map(function (folder) { return '<option value="' + C.esc(folder.id) + '">' + C.esc(folder.name) + '</option>'; }).join('');
      var previousStudent = state.folder ? state.folder.id : localRead('c122:study-student');
      if (previousStudent && state.folders.some(function (folder) { return folder.id === previousStudent; })) picker.value = previousStudent;
      button.disabled = !state.folders.length; updatePin();
    } catch (ex) { error.textContent = ex.message; }
    modal.el.querySelector('form').onsubmit = async function (event) {
      event.preventDefault(); var folder = selected(); if (!folder) return;
      var enteredPin = pin.value;
      if (!folder.unlocked && !/^[0-9]{4}$/.test(enteredPin)) { error.textContent = '4 оронтой кодоо бүтнээр оруулна уу.'; return; }
      error.textContent = ''; button.disabled = true;
      try {
        var unlocked = folder.unlocked ? await request('study_note', { query: { folder: folder.id, book: state.book.id } }) : await request('folder_unlock', { body: { folder: folder.id, pin: enteredPin } });
        if (!modal.el.isConnected || !active) return;
        state.context++; state.folder = { id: folder.id, name: folder.name }; state.csrf = unlocked.csrf; state.loading = state.saving = false; localWrite('c122:study-student', state.folder.id);
        modal.close(); await loadWork();
      } catch (ex) {
        error.textContent = ex.message; button.disabled = false;
        if (ex.status === 401) { folder.unlocked = false; updatePin(); error.textContent = ex.message; pin.focus(); }
      }
    };
  }
  function pointFrom(event) {
    var rect = canvas.getBoundingClientRect(), ratio = Math.min(rect.width / 1200, rect.height / 800), left = rect.left + (rect.width - 1200 * ratio) / 2, top = rect.top + (rect.height - 800 * ratio) / 2;
    return [Math.round(Math.max(0, Math.min(1200, (event.clientX - left) / ratio)) * 100) / 100, Math.round(Math.max(0, Math.min(800, (event.clientY - top) / ratio)) * 100) / 100];
  }
  function totalPoints() { return state.drawing.strokes.reduce(function (total, stroke) { return total + stroke.points.length; }, 0); }
  function endStroke(event) {
    if (event && event.pointerId !== undefined && event.pointerId !== state.pointer) return;
    if (!state.stroke) return;
    state.drawing.strokes.push(state.stroke); state.stroke = null; state.pointer = null; renderDrawing(); changed();
  }
  canvas.addEventListener('pointerdown', function (event) {
    if (state.stroke) return;
    if (!state.csrf || state.loading || state.conflict || event.button > 0) { if (!state.csrf) C.toast('Эхлээд өөрийн нэр, кодоор нэвтрээрэй.'); return; }
    if (state.drawing.strokes.length >= 2000 || totalPoints() >= 39000) { C.toast('Энэ зургийн талбар дүүрсэн байна.', 'error'); return; }
    event.preventDefault(); clearTimeout(state.timer);
    state.pointer = event.pointerId; state.stroke = { color: state.color, width: state.width, points: [pointFrom(event)] }; canvas.setPointerCapture(event.pointerId); renderDrawing();
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!state.stroke || event.pointerId !== state.pointer) return;
    var events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event]; if (!events.length) events = [event];
    events.forEach(function (sample) {
      if (state.stroke.points.length >= 2990 || totalPoints() + state.stroke.points.length >= 39950) return;
      var point = pointFrom(sample), previous = state.stroke.points[state.stroke.points.length - 1];
      if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) >= 2) state.stroke.points.push(point);
    }); renderDrawing();
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(function (name) { canvas.addEventListener(name, endStroke); });
  function closeExpanded() { state.expanded = false; $('textbookDrawWork').classList.remove('expanded'); $('textbookDrawExpand').textContent = 'Томруулах'; }
  function workTab(draw) {
    $('textbookTextWork').hidden = draw; $('textbookDrawWork').hidden = !draw;
    $('textbookTextTab').classList.toggle('on', !draw); $('textbookDrawTab').classList.toggle('on', draw);
    $('textbookTextTab').setAttribute('aria-pressed', String(!draw)); $('textbookDrawTab').setAttribute('aria-pressed', String(draw));
    if (!draw) closeExpanded();
  }
  function download(blob, name) { var url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); }
  function restoreBackup() {
    var backup = state.backup; if (!backup || !state.csrf || state.conflict) return;
    $('textbookNote').value = backup.text || ''; $('textbookNotePage').value = backup.page || '';
    if (backup.drawing && Array.isArray(backup.drawing.strokes)) {
      var old = state.drawing.strokes.slice(0, state.savedStrokes), matches = old.every(function (stroke, index) { return JSON.stringify(stroke) === JSON.stringify(backup.drawing.strokes[index]); });
      state.drawing.strokes = matches ? clone(backup.drawing.strokes) : old.concat(clone(backup.drawing.strokes.slice(backup.savedStrokes || 0)));
    }
    state.backup = null; $('textbookRestoreDraft').hidden = true; renderDrawing(); changed(); C.toast('Хадгалаагүй ажлыг сэргээлээ.');
  }
  function initialize() {
    if (initialized) return; initialized = true; renderFilters(); renderBooks(); controls(); renderDrawing();
    $('textbookSearch').oninput = function () { search = this.value; renderBooks(); };
    $('textbookFilters').onclick = function (event) { var button = event.target.closest('[data-book-category]'); if (!button) return; category = button.dataset.bookCategory; renderFilters(); renderBooks(); };
    $('textbookGrid').onclick = function (event) { var button = event.target.closest('[data-open-book]'); if (button) openBook(button.dataset.openBook); };
    $('textbookBack').onclick = async function () { if (!await leaveWork()) return; state.context++; closeExpanded(); clearTimeout(state.frameTimer); $('textbookFrame').removeAttribute('src'); $('textbookReader').hidden = true; $('textbooksHome').hidden = false; state.book = null; $('textbookSearch').focus(); };
    $('textbookFullscreen').onclick = function () {
      var panel = C.$('.textbook-book-panel'), active = document.fullscreenElement || document.webkitFullscreenElement;
      if (active) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      var enter = panel.requestFullscreen || panel.webkitRequestFullscreen;
      if (enter) { try { var r = enter.call(panel); if (r && r.catch) r.catch(function () {}); } catch (_) {} }
    };
    $('textbookFocus').onclick = function () { var expanded = C.$('.textbook-study-layout').classList.toggle('focus-book'); this.textContent = expanded ? 'Тэмдэглэлээ харуулах' : 'Номоо томруулах'; };
    $('textbookFrame').onload = function () { clearTimeout(state.frameTimer); if (state.book) $('textbookFrameStatus').textContent = 'ECONTENT · албан ёсны уншигч'; };
    $('textbookStudentLogin').onclick = chooseStudent;
    $('textbookSaveFolder').onclick = function () { saveWork(true); };
    $('textbookNote').oninput = $('textbookNotePage').oninput = changed;
    $('textbookTextTab').onclick = function () { workTab(false); }; $('textbookDrawTab').onclick = function () { workTab(true); };
    $('textbookDrawColors').innerHTML = colors.map(function (color, index) { return '<button type="button" style="--brush:' + color + '" data-color="' + color + '" class="' + (!index ? 'on' : '') + '" aria-label="Өнгө ' + color + '" aria-pressed="' + (!index) + '"></button>'; }).join('');
    $('textbookDrawColors').onclick = function (event) { var button = event.target.closest('[data-color]'); if (!button) return; state.color = button.dataset.color; C.$$('[data-color]', this).forEach(function (item) { var selected = item === button; item.classList.toggle('on', selected); item.setAttribute('aria-pressed', String(selected)); }); };
    $('textbookDrawWidth').oninput = function () { state.width = Number(this.value); $('textbookDrawWidthLabel').textContent = state.width; };
    $('textbookDrawUndo').onclick = function () { if (state.saving || state.drawing.strokes.length <= state.savedStrokes) return; state.drawing.strokes.pop(); renderDrawing(); changed(); };
    $('textbookDrawExpand').onclick = function () { state.expanded = !state.expanded; $('textbookDrawWork').classList.toggle('expanded', state.expanded); this.textContent = state.expanded ? 'Хэвийн хэмжээ' : 'Томруулах'; };
    $('textbookDrawExport').onclick = function () { if (!state.book) return; var output = document.createElement('canvas'); output.width = 1200; output.height = 800; var paint = output.getContext('2d'); paint.fillStyle = '#ffffff'; paint.fillRect(0, 0, 1200, 800); paint.drawImage(canvas, 0, 0); output.toBlob(function (blob) { if (blob) download(blob, state.book.title + ' - бодолт.png'); }, 'image/png'); };
    $('textbookExport').onclick = function () { if (!state.book) return; download(new Blob(['\uFEFF' + state.book.title + '\n' + state.book.url + '\n\n' + $('textbookNotePage').value + '\n\n' + $('textbookNote').value], { type: 'text/plain;charset=utf-8' }), state.book.title + ' - тэмдэглэл.txt'); };
    $('textbookRestoreDraft').onclick = restoreBackup;
    $('textbookLoadRemote').onclick = async function () { rememberDraft(); if (!state.csrf) { chooseStudent(); return; } await loadWork(); };
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && state.expanded) closeExpanded(); });
    window.addEventListener('beforeunload', function (event) { if (state.dirty || state.saving) { rememberDraft(); event.preventDefault(); event.returnValue = ''; } });
  }
  C.Textbooks = { show: initialize, onHide: function () { rememberDraft(); closeExpanded(); if (state.dirty) saveWork(false); } };
})();

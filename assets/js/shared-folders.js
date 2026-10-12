/* Shared folders: token-scoped previews/downloads and explicitly permitted uploads. */
(function () {
  'use strict';
  var C = window.C122, app = document.getElementById('sharedFolderApp');
  if (!C || !app) return;
  var $ = function (id) { return document.getElementById(id); };
  var token = app.getAttribute('data-token') || '';
  var state = { files: [], directories: [], breadcrumbs: [], parent: '', scope: 'folder', selected: Object.create(null), seq: 0, loading: false, allowUpload: false, upload: null, preview: null, maxBytes: 512 * 1024 * 1024, chunkBytes: 4 * 1024 * 1024 };
  function url(action, query) {
    var result = 'api.php?action=' + encodeURIComponent(action);
    Object.keys(query || {}).forEach(function (key) { result += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(query[key]); });
    return result;
  }
  async function api(action, opts) {
    opts = opts || {};
    var controller = new AbortController(), timedOut = false;
    var init = { method: opts.raw !== undefined || opts.body !== undefined ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: { 'X-Share-Token': token }, signal: controller.signal };
    if (opts.raw !== undefined) { init.body = opts.raw; init.headers['Content-Type'] = 'application/octet-stream'; }
    else if (opts.body !== undefined) { init.body = JSON.stringify(Object.assign({ token: token }, opts.body)); init.headers['Content-Type'] = 'application/json'; }
    function abort() { controller.abort(); }
    if (opts.signal) { if (opts.signal.aborted) controller.abort(); else opts.signal.addEventListener('abort', abort, { once: true }); }
    var timer = setTimeout(function () { timedOut = true; controller.abort(); }, opts.timeout || 60000);
    try {
      var response = await fetch(url(action, Object.assign({ token: token }, opts.query || {})), init);
      var data;
      try { data = await response.json(); } catch (error) { data = null; }
      if (!response.ok || !data || data.ok === false) { var ex = new Error(data && data.error || 'Холбоосыг ашиглах боломжгүй байна.'); ex.status = response.status; throw ex; }
      return data;
    } catch (error) {
      if (error.name === 'AbortError' && !timedOut) throw error;
      if (error instanceof TypeError || timedOut) { var networkError = new Error(timedOut ? 'Серверийн хариу удаж байна. Дахин оролдоно уу.' : 'Интернэт холболтоо шалгана уу.'); networkError.status = 0; throw networkError; }
      throw error;
    } finally { clearTimeout(timer); if (opts.signal) opts.signal.removeEventListener('abort', abort); }
  }
  function icon(name) { return name === 'image' ? 'images' : name === 'doc' ? 'file' : ['folder', 'book', 'star', 'heart', 'code', 'music'].indexOf(name) >= 0 ? name : 'folder'; }
  function fileUrl(file, download) { return url('share_file', { token: token, file: file.id, download: download ? '1' : '0' }); }
  function permissionText(text) { var footer = document.querySelector('footer.foot > span:last-child'); if (footer) footer.textContent = text; }
  function visibleFiles() { var query = $('sharedFolderSearch') ? $('sharedFolderSearch').value.trim().toLocaleLowerCase() : ''; return state.files.filter(function (file) { return file.name.toLocaleLowerCase().indexOf(query) !== -1; }); }
  function zipBytes(ids) { var encoder = new TextEncoder(); return state.files.reduce(function (total, file) { return ids.indexOf(String(file.id)) < 0 ? total : total + Number(file.size || 0) + encoder.encode(file.name).length * 2 + 256; }, 22); }
  function controls() {
    var selected = Object.keys(state.selected), visible = visibleFiles(), count = visible.filter(function (file) { return !!state.selected[String(file.id)]; }).length;
    if ($('sharedFolderSelectAll')) { $('sharedFolderSelectAll').checked = visible.length > 0 && count === visible.length; $('sharedFolderSelectAll').indeterminate = count > 0 && count < visible.length; $('sharedFolderSelectAll').disabled = !visible.length || state.loading; }
    if ($('sharedFolderSelectionCount')) $('sharedFolderSelectionCount').textContent = selected.length ? selected.length + ' файл сонгосон' : 'Файл сонгоогүй';
    if ($('sharedFolderDownloadSelected')) $('sharedFolderDownloadSelected').disabled = !selected.length || selected.length > 200 || zipBytes(selected) >= 0xFFFFFFFF || state.loading;
    if ($('sharedFolderUploadBtn')) { $('sharedFolderUploadBtn').hidden = !state.allowUpload || state.scope !== 'folder'; $('sharedFolderUploadBtn').disabled = state.loading || !!state.upload; }
    if ($('sharedFolderBreadcrumbs')) C.$$('button', $('sharedFolderBreadcrumbs')).forEach(function (button) { button.disabled = !!state.upload || state.loading; });
    if ($('sharedFolderDirectories')) C.$$('button', $('sharedFolderDirectories')).forEach(function (button) { button.disabled = !!state.upload || state.loading; });
  }
  function render() {
    var query = $('sharedFolderSearch') ? $('sharedFolderSearch').value.trim().toLocaleLowerCase() : '';
    if ($('sharedFolderBreadcrumbs')) $('sharedFolderBreadcrumbs').innerHTML = state.breadcrumbs.map(function (item, index) { return (index ? '<span aria-hidden="true"> / </span>' : '') + '<button class="btn btn-ghost btn-sm" type="button" data-parent="' + C.esc(item.id || '') + '"' + (String(item.id || '') === state.parent ? ' aria-current="page"' : '') + '>' + C.esc(item.name) + '</button>'; }).join('');
    if ($('sharedFolderDirectories')) $('sharedFolderDirectories').innerHTML = state.directories.filter(function (item) { return item.name.toLocaleLowerCase().indexOf(query) !== -1; }).map(function (item) {
      return '<div class="folder-directory glass"><span class="folder-directory-icon">' + C.icon(icon(item.icon)) + '</span><div class="folder-directory-info"><button class="folder-directory-name" type="button" data-parent="' + C.esc(item.id) + '">' + C.esc(item.name) + '</button>' + (item.description ? '<p class="folder-directory-description">' + C.esc(item.description) + '</p>' : '') + '</div>' + C.icon('right') + '</div>';
    }).join('');
    var files = visibleFiles();
    $('sharedFolderFiles').innerHTML = files.map(function (file) {
      return '<div class="folder-file' + (state.selected[String(file.id)] ? ' picked' : '') + '" data-file="' + C.esc(file.id) + '"><input class="folder-file-check" type="checkbox" data-select' + (state.selected[String(file.id)] ? ' checked' : '') + ' aria-label="' + C.esc(file.name + ' сонгох') + '"><span class="folder-file-icon">' + C.icon(file.preview === 'image' ? 'images' : file.preview === 'video' ? 'video' : 'file') + '</span><div class="folder-file-info"><button class="folder-file-name" type="button" data-preview>' + C.esc(file.name) + '</button><div class="folder-file-meta">' + C.esc(C.fmtBytes(file.size)) + '</div></div><div class="folder-file-actions"><button class="btn btn-ghost btn-icon btn-sm" type="button" data-preview title="Урьдчилан үзэх" aria-label="Урьдчилан үзэх">' + C.icon('eye') + '</button><a class="btn btn-ghost btn-icon btn-sm" data-download href="' + C.esc(fileUrl(file, true)) + '" download="' + C.esc(file.name) + '" title="Татах" aria-label="Татах">' + C.icon('download') + '</a></div></div>';
    }).join('');
    $('sharedFolderStatus').textContent = !files.length && !state.directories.length ? query ? 'Хайлтанд тохирох файл олдсонгүй.' : 'Хавтас хоосон байна.' : '';
    controls();
  }
  function unavailable(message) {
    state.seq++; state.loading = false;
    state.files = []; state.directories = []; state.breadcrumbs = []; state.selected = Object.create(null); state.allowUpload = false;
    if (state.preview) state.preview.close();
    if (state.upload) { state.upload.cancelled = true; if (state.upload.controller) state.upload.controller.abort(); }
    render();
    if ($('sharedFolderTitle')) $('sharedFolderTitle').textContent = 'Холбоосыг нээж чадсангүй';
    ['sharedFolderDescription', 'sharedFolderMeta', 'sharedFolderPermission'].forEach(function (id) { if ($(id)) $(id).textContent = ''; });
    permissionText('Холбоосыг ашиглах боломжгүй байна.');
    $('sharedFolderStatus').textContent = message || 'Энэ холбоос устсан эсвэл хүчингүй байна.';
  }
  async function load(parent) {
    if (state.upload) return;
    var seq = ++state.seq;
    state.loading = true; controls(); $('sharedFolderStatus').textContent = 'Хавтас ачаалж байна…';
    try {
      var data = await api('share_info', { query: { parent: parent || '' } });
      if (seq !== state.seq) return;
      state.parent = String(data.parent || ''); state.files = data.files || []; state.directories = data.directories || []; state.breadcrumbs = data.breadcrumbs || []; state.scope = data.scope || 'folder'; state.allowUpload = !!data.allowUpload;
      if (data.limits) { if (Number(data.limits.maxFileBytes) > 0) state.maxBytes = Number(data.limits.maxFileBytes); if (Number(data.limits.chunkBytes) > 0) state.chunkBytes = Number(data.limits.chunkBytes); }
      state.selected = Object.create(null);
      var current = data.currentDirectory || data.folder || {};
      if ($('sharedFolderTitle')) $('sharedFolderTitle').textContent = state.scope === 'file' && state.files[0] ? state.files[0].name : current.name || 'Хуваалцсан хавтас';
      var heroIcon = app.querySelector('.folder-hero-icon'); if (heroIcon) heroIcon.innerHTML = C.icon(icon(current.icon), 'i-lg');
      if ($('sharedFolderDescription')) $('sharedFolderDescription').textContent = current.description || '';
      if ($('sharedFolderPermission')) $('sharedFolderPermission').textContent = state.allowUpload ? 'Урьдчилан үзэх, татах, файл нэмэх боломжтой' : 'Урьдчилан үзэх, татах боломжтой';
      permissionText(state.allowUpload ? 'Холбоостой хүн файл үзэх, татах, нэмэх боломжтой.' : 'Холбоостой хүн файл үзэх, татах боломжтой.');
      state.loading = false; render();
    } catch (error) { if (seq === state.seq) { state.loading = false; unavailable(error.message); var retry = C.el('<button class="btn btn-ghost btn-sm" type="button">Дахин оролдох</button>'); retry.onclick = function () { load(error.status === 404 ? '' : parent); }; $('sharedFolderStatus').appendChild(document.createTextNode(' ')); $('sharedFolderStatus').appendChild(retry); } }
  }
  function preview(file) {
    if (!C.FilePreview) return;
    if (state.preview) state.preview.close();
    var seq = state.seq;
    C.FilePreview.open(file, { url: function (download) { return fileUrl(file, download); }, check: function (signal) { return api('share_info', { query: { parent: state.parent }, signal: signal }); }, alive: function () { return seq === state.seq; }, onUnauthorized: function () { unavailable(); }, onError: function (error) { if ([401, 403, 404, 410].indexOf(error.status) !== -1) unavailable(error.message); }, onOpen: function (modal) { state.preview = modal; }, onClose: function () { state.preview = null; } });
  }
  async function downloadSelected() {
    var ids = Object.keys(state.selected), seq = state.seq;
    if (!ids.length) return;
    if (ids.length > 200 || zipBytes(ids) >= 0xFFFFFFFF) { C.toast('Нэг ZIP таталтад 200 хүртэл файл, нийт 4 ГБ-аас бага хэмжээ сонгоно уу.', 'error'); return; }
    try { await api('share_info', { query: { parent: state.parent } }); if (seq !== state.seq) return; var link = document.createElement('a'); link.href = url('share_download', { token: token, files: ids.join(',') }); link.download = 'shared-folder.zip'; document.body.appendChild(link); link.click(); link.remove(); }
    catch (error) { unavailable(error.message); }
  }
  async function cancelRemote(upload) { if (!upload) return; try { await api('share_upload_cancel', { body: { upload: upload }, timeout: 10000 }); } catch (error) { /* Server expires abandoned uploads. */ } }
  async function upload(inputFiles) {
    if (!state.allowUpload || state.scope !== 'folder' || state.upload || state.loading) return;
    var files = Array.prototype.slice.call(inputFiles || []); if (!files.length) return;
    var parent = state.parent, job = { cancelled: false, id: null, controller: null }, successes = 0, failures = [], completedBytes = 0;
    var totalBytes = files.reduce(function (total, file) { return total + (file.size <= state.maxBytes ? file.size : 0); }, 0);
    state.upload = job; controls();
    if ($('sharedFolderUploadProgress')) $('sharedFolderUploadProgress').hidden = false;
    if ($('sharedFolderCancelUpload')) $('sharedFolderCancelUpload').disabled = false;
    function message(text) { if ($('sharedFolderUploadMessage')) $('sharedFolderUploadMessage').textContent = text; }
    function progress(file, index, offset) { if ($('sharedFolderProgressBar')) { $('sharedFolderProgressBar').max = 100; $('sharedFolderProgressBar').value = totalBytes ? Math.min(100, Math.round((completedBytes + offset) / totalBytes * 100)) : 0; } message((index + 1) + '/' + files.length + ' · ' + file.name + ' · ' + C.fmtBytes(offset) + ' / ' + C.fmtBytes(file.size)); }
    try {
      for (var i = 0; i < files.length && !job.cancelled; i++) {
        var file = files[i];
        if (file.size > state.maxBytes) { failures.push(file.name + ': Нэг файл ' + C.fmtBytes(state.maxBytes) + ' хүртэл байна.'); continue; }
        try {
          job.controller = new AbortController(); progress(file, i, 0);
          var started = await api('share_upload_init', { body: { parent: parent, name: file.name, size: file.size }, signal: job.controller.signal });
          job.id = started.upload;
          var offset = 0, chunkBytes = Math.max(1, Math.min(Number(started.chunkBytes) || state.chunkBytes, state.chunkBytes));
          while (offset < file.size && !job.cancelled) {
            var chunk = file.slice(offset, Math.min(file.size, offset + chunkBytes)), received, retries = 0;
            while (true) {
              try { var part = await api('share_upload_chunk', { query: { upload: job.id, offset: offset }, raw: chunk, signal: job.controller.signal }); received = Number(part.received); break; }
              catch (error) {
                if (job.cancelled || error.name === 'AbortError') throw error;
                if (error.status === 413 && chunkBytes > 65536) { chunkBytes = Math.max(65536, Math.floor(chunkBytes / 2)); chunk = file.slice(offset, Math.min(file.size, offset + chunkBytes)); continue; }
                if ((error.status === 0 || error.status >= 500) && retries < 2) { retries++; message(file.name + ' · Холболтыг дахин оролдож байна…'); await new Promise(function (resolve) { setTimeout(resolve, retries * 600); }); continue; }
                throw error;
              }
            }
            if (!isFinite(received) || received !== offset + chunk.size) throw new Error('Файл оруулалтын хэмжээ таарахгүй байна.');
            offset = received; progress(file, i, offset);
          }
          if (job.cancelled) break;
          await api('share_upload_finish', { body: { upload: job.id }, signal: job.controller.signal }); job.id = null; successes++; completedBytes += file.size;
        } catch (error) {
          if (job.cancelled || error.name === 'AbortError') break;
          failures.push(file.name + ': ' + error.message);
          await cancelRemote(job.id); job.id = null; completedBytes += file.size;
          if (error.status === 401 || error.status === 403 || error.status === 404 || error.status === 410) { job.cancelled = true; break; }
        }
      }
    } finally {
      await cancelRemote(job.id); state.upload = null;
      if ($('sharedFolderCancelUpload')) $('sharedFolderCancelUpload').disabled = true;
      if ($('sharedFolderProgressBar') && !job.cancelled) $('sharedFolderProgressBar').value = 100;
      message((job.cancelled ? 'Оруулалтыг цуцаллаа. ' : '') + successes + ' файл нэмэгдлээ.' + (failures.length ? ' ' + failures.join(' ') : ''));
      if (successes) C.toast(successes + ' файл нэмэгдлээ.');
      controls(); await load(parent);
    }
  }
  if ($('sharedFolderSearch')) $('sharedFolderSearch').oninput = render;
  if ($('sharedFolderSelectAll')) $('sharedFolderSelectAll').onchange = function () { var checked = this.checked; visibleFiles().forEach(function (file) { if (checked) state.selected[String(file.id)] = true; else delete state.selected[String(file.id)]; }); render(); };
  if ($('sharedFolderDownloadSelected')) $('sharedFolderDownloadSelected').onclick = downloadSelected;
  app.addEventListener('click', function (event) {
    var parent = event.target.closest('[data-parent]'); if (parent && !state.upload && !state.loading) { if (state.preview) state.preview.close(); load(parent.getAttribute('data-parent')); return; }
    var row = event.target.closest('[data-file]'); if (!row) return;
    var file = state.files.filter(function (item) { return String(item.id) === row.getAttribute('data-file'); })[0];
    if (file && event.target.closest('[data-preview]')) preview(file);
  });
  $('sharedFolderFiles').addEventListener('change', function (event) { if (!event.target.matches('[data-select]')) return; var id = event.target.closest('[data-file]').getAttribute('data-file'); if (event.target.checked) state.selected[id] = true; else delete state.selected[id]; event.target.closest('[data-file]').classList.toggle('picked', !!state.selected[id]); controls(); });
  if ($('sharedFolderUploadBtn')) $('sharedFolderUploadBtn').onclick = function () { if (state.allowUpload && !state.upload) $('sharedFolderFileInput').click(); };
  if ($('sharedFolderFileInput')) $('sharedFolderFileInput').onchange = function () { upload(this.files); this.value = ''; };
  if ($('sharedFolderCancelUpload')) $('sharedFolderCancelUpload').onclick = function () { if (!state.upload) return; state.upload.cancelled = true; this.disabled = true; if (state.upload.controller) state.upload.controller.abort(); };
  window.addEventListener('beforeunload', function (event) { if (!state.upload) return; event.preventDefault(); event.returnValue = ''; });
  load('');
})();

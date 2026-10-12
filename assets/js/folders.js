/* 12-2 анги — сурагчдын нууц үгтэй хувийн хавтас */
(function () {
  'use strict';
  var C = window.C122;
  var view = document.getElementById('view-folders');
  if (!C || !view) return;
  var $ = function (id) { return document.getElementById(id); };
  var home = $('foldersHome'), body = $('folderBody'), grid = $('folderGrid');
  var state = {
    folders: [], files: [], directories: [], breadcrumbs: [], parent: '', currentDirectory: null, active: null, csrf: null, selected: Object.create(null), shareUrls: Object.create(null),
    maxBytes: 512 * 1024 * 1024, chunkBytes: 4 * 1024 * 1024,
    homeSeq: 0, fileSeq: 0, context: 0, loading: false, mutating: false,
    upload: null, unlocking: false, preview: null, unlockModal: null
  };

  function url(action, query) {
    var result = 'api.php?action=' + encodeURIComponent(action);
    Object.keys(query || {}).forEach(function (key) {
      result += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(query[key]);
    });
    return result;
  }
  function applyLimits(data) {
    if (data.csrf) state.csrf = data.csrf;
    if (data.limits) {
      if (Number(data.limits.maxFileBytes) > 0) state.maxBytes = Number(data.limits.maxFileBytes);
      if (Number(data.limits.chunkBytes) > 0) state.chunkBytes = Number(data.limits.chunkBytes);
    }
  }

  // Folder access and CSRF are independent of the album/admin session.
  async function api(action, opts, retried) {
    opts = opts || {};
    var init = {
      method: opts.method || (opts.body !== undefined || opts.raw !== undefined ? 'POST' : 'GET'),
      credentials: 'same-origin', cache: 'no-store', headers: {}
    };
    if (state.csrf) init.headers['X-Folder-CSRF'] = state.csrf;
    var controller = new AbortController(), timedOut = false;
    function abortRequest() { controller.abort(); }
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', abortRequest, { once: true });
    }
    init.signal = controller.signal;
    if (opts.raw !== undefined) {
      init.body = opts.raw;
      init.headers['Content-Type'] = 'application/octet-stream';
    } else if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
      init.headers['Content-Type'] = 'application/json';
    }
    var res, data;
    var timer = setTimeout(function () { timedOut = true; controller.abort(); }, opts.timeout || 60000);
    try {
      res = await fetch(url(action, opts.query), init);
      var responseText = await res.text();
      try { data = JSON.parse(responseText); } catch (error) { data = null; }
    }
    catch (error) {
      if (error.name === 'AbortError' && !timedOut) throw error;
      var networkError = new Error(timedOut ? 'Серверийн хариу удаж байна. Дахин оролдоно уу.' : 'Сүлжээний алдаа. Интернэт холболтоо шалгана уу.');
      networkError.status = 0;
      throw networkError;
    } finally {
      clearTimeout(timer);
      if (opts.signal) opts.signal.removeEventListener('abort', abortRequest);
    }
    if (!res.ok || !data || data.ok === false) {
      var folder = (opts.query && opts.query.folder) || (opts.body && opts.body.folder);
      if (res.status === 403 && data && data.csrfInvalid && folder && !retried && action !== 'folder_files') {
        var refreshed = await api('folder_files', { query: { folder: folder }, signal: opts.signal, timeout: opts.timeout }, true);
        applyLimits(refreshed);
        return api(action, opts, true);
      }
      var ex = new Error((data && data.error) || ('Серверийн алдаа (' + res.status + ')'));
      ex.status = res.status;
      ex.data = data;
      if (action !== 'folder_unlock' && (res.status === 401 || (res.status === 403 && data && data.csrfInvalid))) {
        if (!folder || (state.active && String(folder) === String(state.active.id))) invalidateAccess();
      }
      throw ex;
    }
    applyLimits(data);
    return data;
  }

  function isBusy() { return !!state.upload || state.mutating; }
  function busyNotice() { C.toast('Эхлээд одоогийн үйлдлийг дуусгах эсвэл файл оруулалтыг цуцална уу.'); }
  function status(el, message, retry) {
    el.textContent = message || '';
    if (retry) {
      var btn = C.el('<button class="btn btn-ghost btn-sm" type="button">Дахин оролдох</button>');
      btn.onclick = retry;
      el.appendChild(document.createTextNode(' '));
      el.appendChild(btn);
    }
  }
  function invalidateAccess() {
    if (state.upload) {
      state.upload.cancelled = true;
      if (state.upload.controller) state.upload.controller.abort();
    }
    if (state.active) state.folders.forEach(function (folder) {
      if (String(folder.id) === String(state.active.id)) folder.unlocked = false;
    });
    resetActive();
    renderFolders();
    status($('foldersStatus'), 'Хавтасны эрх дууссан байна. Нууц үгээ дахин оруулна уу.');
  }
  function resetActive() {
    closePreview();
    state.context++;
    state.fileSeq++;
    state.active = null;
    state.files = [];
    state.directories = [];
    state.breadcrumbs = [];
    state.parent = '';
    state.currentDirectory = null;
    state.selected = Object.create(null);
    state.loading = false;
    $('folderFiles').innerHTML = '';
    if ($('folderDirectories')) $('folderDirectories').innerHTML = '';
    if ($('folderBreadcrumbs')) $('folderBreadcrumbs').innerHTML = '';
    if ($('folderDescription')) $('folderDescription').textContent = '';
    $('folderFileSearch').value = '';
    body.hidden = true;
    home.hidden = false;
    updateControls();
    window.scrollTo(0, 0);
  }
  function renderFolders() {
    var query = $('folderSearch').value.trim().toLocaleLowerCase();
    var folders = state.folders.filter(function (folder) { return folder.name.toLocaleLowerCase().indexOf(query) !== -1; });
    grid.innerHTML = folders.map(function (folder) {
      return '<button type="button" class="folder-card glass" data-folder="' + C.esc(folder.id) + '"' +
        ' aria-label="' + C.esc(folder.name + ' — хавтас нээх') + '">' +
        '<span class="folder-card-icon">' + C.icon(folderIcon(folder.icon)) + '</span>' +
        '<span class="folder-card-name">' + C.esc(folder.name) + '</span>' +
        (folder.description ? '<span class="folder-card-description">' + C.esc(folder.description) + '</span>' : '') +
        '<span class="folder-card-state">' + C.icon(folder.unlocked ? 'check' : 'lock', 'i-sm') +
        (folder.unlocked ? 'Нээгдсэн' : '4 оронтой нууц үг') + '</span>' + C.icon('right') + '</button>';
    }).join('');
    if (!folders.length) status($('foldersStatus'), query ? 'Энэ нэртэй хавтас олдсонгүй.' : 'Хавтас байхгүй байна.');
    else status($('foldersStatus'), folders.length + ' сурагчийн хавтас');
  }
  async function loadFolders() {
    var seq = ++state.homeSeq;
    status($('foldersStatus'), 'Хавтаснуудыг ачаалж байна…');
    try {
      var data = await api('folders');
      if (seq !== state.homeSeq) return;
      state.folders = data.folders || [];
      renderFolders();
    } catch (error) {
      if (seq === state.homeSeq) status($('foldersStatus'), error.message, loadFolders);
    }
  }
  function show() {
    if (state.active) { if (!isBusy()) loadFiles(); }
    else loadFolders();
  }
  async function openFolder(folder) {
    if (isBusy()) return busyNotice();
    if (state.unlocking) return;
    if (!folder.unlocked && !(await unlock(folder))) return;
    if (isBusy()) return;
    closePreview();
    state.context++;
    state.active = folder;
    state.files = [];
    state.parent = '';
    state.directories = [];
    state.currentDirectory = null;
    state.selected = Object.create(null);
    $('folderFileSearch').value = '';
    $('folderTitle').textContent = folder.name;
    $('folderUploadProgress').hidden = true;
    $('folderUploadMessage').textContent = '';
    home.hidden = true;
    body.hidden = false;
    window.scrollTo(0, 0);
    loadFiles();
  }
  function unlock(folder) {
    state.unlocking = true;
    return new Promise(function (resolve) {
      var alive = true;
      var modal = C.openModal(
        '<div class="modal-icon">' + C.icon('lock', 'i-lg') + '</div>' +
        '<h3>' + C.esc(folder.name) + '</h3><p class="lead">Хавтсаа нээхийн тулд өөрийн 4 оронтой нууц үгээ оруулна уу.</p>' +
        '<form novalidate><div class="field"><label for="folderPin">4 оронтой нууц үг</label>' +
        '<input class="input folder-pin" id="folderPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="••••" autofocus></div>' +
        '<div class="err" role="status" aria-live="polite"></div><div class="actions">' +
        '<button type="button" class="btn btn-ghost" data-close>Цуцлах</button><button type="submit" class="btn btn-primary">' + C.icon('folder') + 'Нээх</button></div></form>',
        { onClose: function (value) {
          alive = false;
          state.unlocking = false;
          state.unlockModal = null;
          resolve(!!value);
        } }
      );
      state.unlockModal = modal;
      var input = modal.el.querySelector('input'), form = modal.el.querySelector('form');
      var errorBox = modal.el.querySelector('.err'), submit = form.querySelector('[type=submit]');
      input.addEventListener('input', function () { input.value = input.value.replace(/[^0-9]/g, '').slice(0, 4); });
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (submit.disabled) return;
        // Keep the PIN as a string so codes beginning with zero are preserved.
        var pin = input.value;
        if (!/^[0-9]{4}$/.test(pin)) { errorBox.textContent = 'Нууц үг яг 4 цифртэй байх ёстой.'; input.focus(); return; }
        submit.disabled = true;
        input.disabled = true;
        errorBox.textContent = 'Нууц үгийг шалгаж байна…';
        try {
          await api('folder_unlock', { body: { folder: folder.id, pin: pin } });
          folder.unlocked = true;
          if (alive) modal.close(true);
        } catch (error) {
          if (!alive) return;
          errorBox.textContent = error.data && error.data.wrongPin ? 'Нууц үг буруу байна. Дахин оролдоно уу.' : error.message;
          input.disabled = false;
          submit.disabled = false;
          input.value = '';
          input.focus();
        }
      });
    });
  }
  async function loadFiles() {
    if (!state.active) return;
    var folderId = state.active.id, parent = state.parent, context = state.context, seq = ++state.fileSeq;
    state.loading = true;
    updateControls();
    status($('folderFilesStatus'), 'Файлуудыг ачаалж байна…');
    try {
      var data = await api('folder_files', { query: { folder: folderId, parent: parent } });
      if (context !== state.context || seq !== state.fileSeq) return;
      state.files = (data.files || []).map(function (file) { file._folder = folderId; return file; });
      state.directories = data.directories || [];
      state.breadcrumbs = data.breadcrumbs || [];
      state.currentDirectory = data.currentDirectory || (parent ? state.breadcrumbs[state.breadcrumbs.length - 1] : null);
      if (data.folder) Object.assign(state.active, data.folder);
      Object.keys(state.selected).forEach(function (id) {
        if (!state.files.some(function (file) { return String(file.id) === id; })) delete state.selected[id];
      });
      state.loading = false;
      renderDirectories();
      renderFiles();
    } catch (error) {
      if (context !== state.context || seq !== state.fileSeq) return;
      state.loading = false;
      updateControls();
      status($('folderFilesStatus'), error.message, loadFiles);
    }
  }
  function visibleFiles() {
    var query = $('folderFileSearch').value.trim().toLocaleLowerCase();
    return state.files.filter(function (file) { return file.name.toLocaleLowerCase().indexOf(query) !== -1; });
  }
  function dateText(time) {
    var date = typeof time === 'number' || /^[0-9]+$/.test(String(time)) ? new Date(Number(time) * 1000) : new Date(time);
    if (isNaN(date.getTime())) return '';
    try { return new Intl.DateTimeFormat('mn-MN', { timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date); }
    catch (error) { return date.toLocaleString(); }
  }
  function fileUrl(file, download) {
    return url('folder_file', { folder: state.active.id, file: file.id, download: download ? '1' : '0' });
  }
  function fileAction(attr, title, icon) {
    return '<button class="btn btn-ghost btn-icon btn-sm" type="button" ' + attr + ' aria-label="' + C.esc(title) + '" title="' + C.esc(title) + '">' + C.icon(icon) + '</button>';
  }
  var ICONS = [ ['folder', 'Хавтас'], ['book', 'Хичээл'], ['star', 'Од'], ['heart', 'Дуртай'], ['image', 'Зураг'], ['code', 'Код'], ['music', 'Хөгжим'], ['doc', 'Баримт'] ];
  function folderIcon(icon) {
    if (!ICONS.some(function (item) { return item[0] === icon; })) return 'folder';
    return icon === 'image' ? 'images' : icon === 'doc' ? 'file' : icon;
  }
  function renderDirectories() {
    if (!state.active) return;
    var current = state.currentDirectory || state.active;
    $('folderTitle').textContent = current.name || state.active.name;
    var heroIcon = body.querySelector('.folder-hero-icon');
    if (heroIcon) heroIcon.innerHTML = C.icon(folderIcon(current.icon), 'i-lg');
    if ($('folderDescription')) $('folderDescription').textContent = current.description || '';
    var crumbs = state.breadcrumbs.length ? state.breadcrumbs : [{ id: '', name: state.active.name }];
    if ($('folderBreadcrumbs')) $('folderBreadcrumbs').innerHTML = crumbs.map(function (item, index) {
      return (index ? '<span aria-hidden="true"> / </span>' : '') + '<button type="button" class="btn btn-ghost btn-sm" data-parent="' + C.esc(item.id || '') + '"' + (String(item.id || '') === state.parent ? ' aria-current="page"' : '') + '>' + C.esc(item.name) + '</button>';
    }).join('');
    var query = $('folderFileSearch').value.trim().toLocaleLowerCase();
    var directories = state.directories.filter(function (dir) { return dir.name.toLocaleLowerCase().indexOf(query) !== -1; });
    if ($('folderDirectories')) $('folderDirectories').innerHTML = directories.map(function (dir) {
      return '<div class="folder-directory glass" data-directory="' + C.esc(dir.id) + '"><span class="folder-directory-icon">' + C.icon(folderIcon(dir.icon)) + '</span>' +
        '<div class="folder-directory-info"><button class="folder-directory-name" type="button" data-dir-open>' + C.esc(dir.name) + '</button>' +
        (dir.description ? '<p class="folder-directory-description">' + C.esc(dir.description) + '</p>' : '') + '</div>' +
        '<div class="folder-directory-actions">' + fileAction('data-dir-edit', 'Хавтас засах', 'edit') + fileAction('data-dir-share', 'Хавтас хуваалцах', 'link') +
        '<button class="btn btn-danger-ghost btn-icon btn-sm" type="button" data-dir-delete title="Хавтас устгах" aria-label="Хавтас устгах">' + C.icon('trash') + '</button></div></div>';
    }).join('');
  }
  function navigate(parent) {
    if (!state.active || isBusy() || state.loading) return;
    closePreview();
    state.context++;
    state.parent = String(parent || '');
    state.files = [];
    state.directories = [];
    state.selected = Object.create(null);
    $('folderFiles').innerHTML = '';
    if ($('folderDirectories')) $('folderDirectories').innerHTML = '';
    $('folderFileSearch').value = '';
    loadFiles();
  }
  function metadataModal(directory, create) {
    if (!state.active || isBusy() || state.loading) return;
    var folderId = state.active.id, parent = state.parent, context = state.context;
    var value = directory || state.currentDirectory || state.active;
    var isRoot = !create && !directory && !parent;
    var icon = create ? 'folder' : value.icon || 'folder', alive = true;
    if (!ICONS.some(function (entry) { return entry[0] === icon; })) icon = 'folder';
    var modal = C.openModal('<h3>' + (create ? 'Шинэ хавтас' : 'Хавтас засах') + '</h3><form>' +
      (!isRoot ? '<div class="field"><label for="directoryName">Хавтасны нэр</label><input class="input" id="directoryName" name="name" maxlength="120" required autofocus value="' + C.esc(create ? '' : value.name || '') + '"></div>' : '<p class="lead">' + C.esc(state.active.name) + '</p>') +
      '<div class="field"><label for="directoryDescription">Тайлбар</label><textarea class="input" id="directoryDescription" name="description" maxlength="500" rows="3" placeholder="Энд юу хадгалах вэ?">' + C.esc(create ? '' : value.description || '') + '</textarea></div>' +
      '<div class="field"><label>Дүрс</label><div class="folder-icon-picker">' + ICONS.map(function (entry) { return '<button class="folder-icon-choice btn btn-ghost" type="button" data-icon="' + entry[0] + '" aria-label="' + entry[1] + '" title="' + entry[1] + '" aria-pressed="' + (icon === entry[0] ? 'true' : 'false') + '">' + C.icon(folderIcon(entry[0])) + '</button>'; }).join('') + '</div></div>' +
      '<div class="err" role="status" aria-live="polite"></div><div class="actions"><button class="btn btn-ghost" type="button" data-close>Цуцлах</button><button class="btn btn-primary" type="submit">' + (create ? 'Үүсгэх' : 'Хадгалах') + '</button></div></form>',
      { onClose: function () { alive = false; } });
    var form = modal.el.querySelector('form'), errorBox = form.querySelector('.err'), submit = form.querySelector('[type=submit]');
    C.$$('[data-icon]', form).forEach(function (button) {
      button.onclick = function () { icon = button.getAttribute('data-icon'); C.$$('[data-icon]', form).forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); }); };
    });
    form.onsubmit = async function (event) {
      event.preventDefault();
      if (submit.disabled || context !== state.context || isBusy()) return;
      var payload = { folder: folderId, description: form.elements.description.value.trim(), icon: icon };
      var action = isRoot ? 'folder_meta' : create ? 'directory_create' : 'directory_update';
      if (!isRoot) payload.name = form.elements.name.value.trim();
      if (!isRoot && !payload.name) { errorBox.textContent = 'Хавтасны нэр оруулна уу.'; return; }
      if (create) payload.parent = parent; else if (!isRoot) payload.directory = value.id || parent;
      state.mutating = true; updateControls(); submit.disabled = true;
      try {
        await api(action, { body: payload });
        if (context !== state.context) return;
        if (alive) modal.close();
        C.toast(create ? 'Шинэ хавтас үүсгэлээ.' : 'Хавтасны мэдээллийг хадгаллаа.');
        await loadFiles();
      } catch (error) { if (alive) errorBox.textContent = error.message; else C.toast(error.message, 'error'); }
      finally { state.mutating = false; updateControls(); if (alive) submit.disabled = false; }
    };
  }
  async function deleteDirectory(directory) {
    if (!state.active || isBusy() || state.loading) return;
    var context = state.context, folderId = state.active.id;
    var confirmed = await C.confirm({ title: 'Хавтас болон доторх файлуудыг устгах уу?', text: '«' + directory.name + '» хавтас, доторх бүх файл болон дэд хавтсыг бүрмөсөн устгана. Хуваалцсан холбоосууд мөн ажиллахаа болино.', danger: true, ok: 'Бүгдийг устгах' });
    if (!confirmed || context !== state.context || isBusy()) return;
    state.mutating = true; updateControls();
    try { await api('directory_delete', { body: { folder: folderId, directory: directory.id } }); if (context === state.context) { await loadFiles(); C.toast('Хавтсыг устгалаа.'); } }
    catch (error) { C.toast(error.message, 'error'); }
    finally { state.mutating = false; updateControls(); }
  }
  function renameFile(file) {
    if (!state.active || isBusy() || state.loading) return;
    var context = state.context, folderId = state.active.id, alive = true;
    var modal = C.openModal('<h3>Файлын нэр өөрчлөх</h3><form><div class="field"><label for="renameFilename">Файлын нэр</label><input class="input" id="renameFilename" name="name" maxlength="200" value="' + C.esc(file.name) + '" required autofocus></div><p class="hint">Файлын өргөтгөлийг хэвээр үлдээнэ үү. Нэр солих нь файлын төрлийг хөрвүүлэхгүй.</p><div class="err" role="status"></div><div class="actions"><button class="btn btn-ghost" type="button" data-close>Цуцлах</button><button class="btn btn-primary" type="submit">Хадгалах</button></div></form>', { onClose: function () { alive = false; } });
    var form = modal.el.querySelector('form'), button = form.querySelector('[type=submit]'), errorBox = form.querySelector('.err');
    form.onsubmit = async function (event) {
      event.preventDefault();
      if (button.disabled || isBusy() || context !== state.context) return;
      var name = form.elements.name.value.trim();
      if (!name) { errorBox.textContent = 'Файлын нэр оруулна уу.'; return; }
      state.mutating = true; updateControls(); button.disabled = true;
      try { await api('folder_rename', { body: { folder: folderId, file: file.id, name: name, version: file.version } }); if (context === state.context) { if (alive) modal.close(); await loadFiles(); C.toast('Файлын нэрийг өөрчиллөө.'); } }
      catch (error) { if (alive) errorBox.textContent = error.status === 409 ? 'Файлыг өөр цонхонд өөрчилсөн байна. Цонхыг хааж файлуудаа шинэчлээд дахин оролдоно уу.' : error.message; else C.toast(error.message, 'error'); }
      finally { state.mutating = false; updateControls(); if (alive) button.disabled = false; }
    };
  }
  function shareModal(file, directory) {
    if (!state.active || isBusy() || state.loading) return;
    var context = state.context, alive = true, working = false;
    var scope = { folder: state.active.id, target: file ? 'file' : 'folder' };
    if (file) scope.file = file.id; else scope.directory = directory ? directory.id : state.parent;
    var name = file ? file.name : directory ? directory.name : (state.currentDirectory || state.active).name;
    var cacheKey = scope.folder + ':' + scope.target + ':' + (scope.file || scope.directory || '');
    var active = false, link = state.shareUrls[cacheKey] || '';
    var modal = C.openModal('<h3>Хуваалцах холбоос</h3><p class="lead">' + C.esc(name) + '</p><p class="hint">Холбоостой хүн нууц үггүйгээр урьдчилан үзэж, татаж авч чадна. Файлыг өөрчлөх, устгах эрх олгохгүй.</p>' +
      (!file ? '<label class="folder-share-permission"><input type="checkbox" data-share-upload checked> Холбоостой хүн файл нэмж болно</label>' : '') +
      '<p class="folder-share-status" role="status" aria-live="polite">Холбоосыг шалгаж байна…</p><div class="folder-share-link" hidden><input class="input" type="url" readonly aria-label="Хуваалцах холбоос"><button class="btn btn-primary" type="button" data-copy>Хуулах</button></div>' +
      '<div class="actions"><button class="btn btn-ghost" type="button" data-close>Хаах</button><button class="btn btn-danger-ghost" type="button" data-revoke disabled>Холбоос устгах</button><button class="btn btn-primary" type="button" data-create disabled>Холбоос үүсгэх</button></div>',
      { onClose: function () { alive = false; } });
    var statusBox = modal.el.querySelector('.folder-share-status'), linkBox = modal.el.querySelector('.folder-share-link');
    var input = linkBox.querySelector('input'), create = modal.el.querySelector('[data-create]'), revoke = modal.el.querySelector('[data-revoke]'), copy = modal.el.querySelector('[data-copy]');
    var uploadOption = modal.el.querySelector('[data-share-upload]');
    function sync() {
      create.disabled = working; revoke.disabled = working || !active; copy.disabled = working;
      if (uploadOption) uploadOption.disabled = working;
      create.textContent = active ? 'Шинэ холбоос үүсгэх' : 'Холбоос үүсгэх';
      linkBox.hidden = !link; input.value = link;
    }
    api('share_status', { query: scope }).then(function (data) {
      if (!alive || context !== state.context) return;
      active = !!data.active;
      if (!active) { link = ''; delete state.shareUrls[cacheKey]; }
      if (uploadOption && active && data.allowUpload !== undefined) uploadOption.checked = !!data.allowUpload;
      statusBox.textContent = active ? link ? 'Холбоос идэвхтэй байна.' : 'Холбоос идэвхтэй байна. Хуулах шинэ холбоос авахын тулд дахин үүсгээрэй.' : 'Идэвхтэй холбоос байхгүй байна.';
      sync();
    }).catch(function (error) { if (alive) { statusBox.textContent = error.message; create.disabled = false; } });
    create.onclick = async function () {
      if (working || context !== state.context) return;
      if (active) {
        var confirmed = await C.confirm({ title: 'Холбоосыг дахин үүсгэх үү?', text: 'Өмнөх холбоос ажиллахаа болино. Шинэ холбоосоо дахин хуваалцаарай.', ok: 'Шинэ холбоос үүсгэх' });
        if (!confirmed || !alive || context !== state.context) return;
      }
      working = true; sync(); statusBox.textContent = 'Холбоос үүсгэж байна…';
      try {
        var payload = Object.assign({}, scope, { allowUpload: !!(uploadOption && uploadOption.checked) });
        var data = await api('share_create', { body: payload });
        if (!alive || context !== state.context) return;
        link = new URL(data.url, document.baseURI).href; state.shareUrls[cacheKey] = link; active = true;
        statusBox.textContent = 'Холбоос бэлэн боллоо. Хуулаад найзууддаа явуулаарай.';
      } catch (error) { if (alive) statusBox.textContent = error.message; }
      finally { working = false; if (alive) sync(); }
    };
    revoke.onclick = async function () {
      if (working || !active || context !== state.context) return;
      working = true; sync();
      try { await api('share_revoke', { body: scope }); delete state.shareUrls[cacheKey]; if (alive && context === state.context) { active = false; link = ''; statusBox.textContent = 'Холбоос устлаа. Өмнөх холбоосоор нэвтрэх боломжгүй.'; } }
      catch (error) { if (alive) statusBox.textContent = error.message; }
      finally { working = false; if (alive) sync(); }
    };
    copy.onclick = async function () {
      try { if (!navigator.clipboard || !window.isSecureContext) throw new Error('manual'); await navigator.clipboard.writeText(link); C.toast('Холбоосыг хууллаа.'); }
      catch (error) { input.focus(); input.select(); statusBox.textContent = 'Холбоос сонгогдлоо. Ctrl+C (Mac: ⌘C) дарж хуулна уу.'; }
    };
  }
  function moveFiles(ids) {
    if (!state.active || !ids.length || isBusy() || state.loading || ids.length > 200) return;
    var context = state.context, folderId = state.active.id, currentParent = state.parent, destination = '', alive = true, seq = 0, moving = false;
    var modal = C.openModal('<h3>' + ids.length + ' файлыг зөөх</h3><p class="hint">Зөөх хавтсаа сонгоно уу.</p><div class="folder-breadcrumbs"></div><div class="folder-move-list"></div><p class="err" role="status"></p><div class="actions"><button class="btn btn-ghost" type="button" data-close>Цуцлах</button><button class="btn btn-primary" type="button" data-move disabled>Энэ хавтас руу зөөх</button></div>', { onClose: function () { alive = false; } });
    var list = modal.el.querySelector('.folder-move-list'), crumbs = modal.el.querySelector('.folder-breadcrumbs'), errorBox = modal.el.querySelector('.err'), button = modal.el.querySelector('[data-move]');
    async function load(parent) {
      if (moving) return;
      var request = ++seq; button.disabled = true; errorBox.textContent = 'Хавтаснуудыг ачаалж байна…';
      try {
        var data = await api('folder_files', { query: { folder: folderId, parent: parent } });
        if (!alive || request !== seq || context !== state.context) return;
        destination = String(parent || '');
        crumbs.innerHTML = (data.breadcrumbs || [{ id: '', name: state.active.name }]).map(function (item) { return '<button class="btn btn-ghost btn-sm" type="button" data-destination="' + C.esc(item.id || '') + '">' + C.esc(item.name) + '</button>'; }).join(' / ');
        list.innerHTML = (data.directories || []).map(function (item) { return '<button class="btn btn-ghost" type="button" data-destination="' + C.esc(item.id) + '">' + C.icon(folderIcon(item.icon)) + C.esc(item.name) + C.icon('right') + '</button>'; }).join('');
        errorBox.textContent = destination === currentParent ? 'Файлууд одоо энэ хавтсанд байна.' : '';
        button.disabled = destination === currentParent;
      } catch (error) { if (alive) errorBox.textContent = error.message; }
    }
    modal.el.addEventListener('click', function (event) { var item = event.target.closest('[data-destination]'); if (item) load(item.getAttribute('data-destination')); });
    button.onclick = async function () {
      if (moving || isBusy() || context !== state.context || destination === currentParent) return;
      moving = true; state.mutating = true; updateControls(); button.disabled = true;
      try { await api('file_move', { body: { folder: folderId, ids: ids, parent: destination } }); if (context === state.context) { if (alive) modal.close(); state.selected = Object.create(null); await loadFiles(); C.toast(ids.length + ' файлыг зөөлөө.'); } }
      catch (error) { if (alive) errorBox.textContent = error.message; }
      finally { state.mutating = false; moving = false; updateControls(); if (alive) button.disabled = false; }
    };
    load('');
  }

  function renderFiles() {
    var files = visibleFiles();
    $('folderFiles').innerHTML = files.map(function (file) {
      var id = String(file.id);
      return '<div class="folder-file' + (state.selected[id] ? ' picked' : '') + '" data-file="' + C.esc(id) + '">' +
        '<input class="folder-file-check" type="checkbox" data-select' + (state.selected[id] ? ' checked' : '') + ' aria-label="' + C.esc(file.name + ' сонгох') + '">' +
        '<span class="folder-file-icon">' + C.icon(file.preview === 'image' ? 'images' : file.preview === 'video' ? 'video' : 'file') + '</span>' +
        '<div class="folder-file-info"><button type="button" class="folder-file-name" data-preview>' + C.esc(file.name) + '</button>' +
        '<div class="folder-file-meta">' + C.esc(C.fmtBytes(file.size) + (file.time ? ' · ' + dateText(file.time) : '')) + '</div></div>' +
        '<div class="folder-file-actions"><button class="btn btn-ghost btn-icon btn-sm" type="button" data-preview aria-label="' + C.esc(file.name + ' урьдчилан үзэх') + '" title="Урьдчилан үзэх">' + C.icon('eye') + '</button>' +
        '<a class="btn btn-ghost btn-icon btn-sm" data-download href="' + C.esc(fileUrl(file, true)) + '" download="' + C.esc(file.name) + '" aria-label="' + C.esc(file.name + ' татах') + '" title="Татах">' + C.icon('download') + '</a>' +
        ((C.FileEditors && C.FileEditors.canEdit(file)) ? fileAction('data-edit', 'Файл засах', 'edit') : '') +
        ((C.FileConverter && (!C.FileConverter.canConvert || C.FileConverter.canConvert(file))) ? fileAction('data-convert', 'Файл хөрвүүлэх', 'refresh') : '') +
        fileAction('data-rename', 'Нэр өөрчлөх', 'settings') + fileAction('data-share', 'Хуваалцах холбоос', 'link') +
        '<button class="btn btn-danger-ghost btn-icon btn-sm" type="button" data-delete aria-label="' + C.esc(file.name + ' устгах') + '" title="Устгах">' + C.icon('trash') + '</button></div></div>';
    }).join('');
    $('folderStats').textContent = state.directories.length + ' хавтас · ' + state.files.length + ' файл · ' + C.fmtBytes(state.files.reduce(function (total, file) { return total + Number(file.size || 0); }, 0)) +
      ' · Нэг файл ' + C.fmtBytes(state.maxBytes) + ' хүртэл';
    status($('folderFilesStatus'), !files.length ? (state.files.length ? 'Хайлтанд тохирох файл олдсонгүй.' : !state.directories.length ? 'Хавтас хоосон байна. Файл эсвэл шинэ хавтас нэмээрэй.' : '') : '');
    updateControls();
  }
  function updateControls() {
    var selected = Object.keys(state.selected), visible = visibleFiles();
    var count = visible.filter(function (file) { return !!state.selected[String(file.id)]; }).length;
    var overCount = selected.length > 200, overZip = estimatedZipBytes(selected) >= 0xFFFFFFFF;
    $('folderSelectAll').checked = visible.length > 0 && count === visible.length;
    $('folderSelectAll').indeterminate = count > 0 && count < visible.length;
    $('folderSelectAll').disabled = !visible.length || state.loading || state.mutating;
    $('folderSelectionCount').textContent = (selected.length ? selected.length + ' файл сонгосон' : 'Файл сонгоогүй') +
      (overCount ? ' · Нэг удаад 200 хүртэл файл сонгоно уу.' : overZip ? ' · ZIP татахад нийт хэмжээ 4 ГБ-аас бага байх ёстой.' : '');
    $('folderDownloadSelected').disabled = !selected.length || overCount || overZip || state.loading || state.mutating;
    $('folderDeleteSelected').disabled = !selected.length || overCount || state.loading || isBusy();
    $('folderUploadBtn').disabled = !state.active || isBusy();
    $('folderUploadBtn').title = 'Нэг файл ' + C.fmtBytes(state.maxBytes) + ' хүртэл';
    $('folderBack').disabled = isBusy();
    $('folderLockBtn').disabled = !state.active || isBusy();
    ['folderMetaBtn', 'folderNewDirBtn', 'folderShareBtn'].forEach(function (id) { if ($(id)) $(id).disabled = !state.active || isBusy() || state.loading; });
    if ($('folderMoveSelected')) $('folderMoveSelected').disabled = !selected.length || overCount || state.loading || isBusy();
    C.$$('button[data-delete],button[data-edit],button[data-convert],button[data-rename],button[data-share]', $('folderFiles')).forEach(function (btn) { btn.disabled = isBusy() || state.loading; });
    if ($('folderDirectories')) C.$$('button', $('folderDirectories')).forEach(function (btn) { btn.disabled = isBusy() || state.loading; });
    if ($('folderBreadcrumbs')) C.$$('button', $('folderBreadcrumbs')).forEach(function (btn) { btn.disabled = isBusy() || state.loading; });
    C.$$('[data-select]', $('folderFiles')).forEach(function (input) { input.disabled = state.mutating || state.loading; });
  }
  function estimatedZipBytes(ids) {
    var encoder = new TextEncoder();
    return state.files.reduce(function (total, file) {
      if (ids.indexOf(String(file.id)) === -1) return total;
      // ZIP headers repeat UTF-8 names; allow extra room for duplicate-name suffixes.
      return total + Number(file.size || 0) + encoder.encode(file.name).length * 2 + 256;
    }, 22);
  }

  async function deleteFiles(ids) {
    if (!state.active || !ids.length || isBusy() || state.loading) return;
    if (ids.length > 200) { C.toast('Нэг удаад 200 хүртэл файл устгах боломжтой.', 'error'); return; }
    var folderId = state.active.id, context = state.context;
    var name = ids.length === 1 ? (state.files.filter(function (file) { return String(file.id) === String(ids[0]); })[0] || {}).name : null;
    var confirmed = await C.confirm({
      title: ids.length === 1 ? 'Файлыг устгах уу?' : ids.length + ' файлыг устгах уу?',
      text: name ? '«' + name + '» файлыг бүрмөсөн устгана.' : 'Сонгосон файлуудыг бүрмөсөн устгана. Энэ үйлдлийг буцаах боломжгүй.',
      danger: true, ok: 'Устгах'
    });
    if (!confirmed || context !== state.context || isBusy()) return;
    state.mutating = true;
    updateControls();
    try {
      var data = await api('folder_delete', { body: { folder: folderId, ids: ids } });
      if (context !== state.context) return;
      var deleted = (data.deleted || ids).map(String);
      state.files = state.files.filter(function (file) { return deleted.indexOf(String(file.id)) === -1; });
      deleted.forEach(function (id) { delete state.selected[id]; });
      if (state.preview && deleted.indexOf(String(state.preview.file.id)) !== -1) closePreview();
      renderFiles();
      C.toast(deleted.length + ' файл устгалаа.');
    } catch (error) { C.toast(error.message, 'error'); }
    finally { state.mutating = false; updateControls(); }
  }
  async function downloadFiles(ids) {
    if (!state.active || !ids.length) return;
    if (ids.length > 200) { C.toast('Нэг удаад 200 хүртэл файл татах боломжтой.', 'error'); return; }
    if (estimatedZipBytes(ids) >= 0xFFFFFFFF) { C.toast('ZIP татахад сонгосон файлуудын нийт хэмжээ 4 ГБ-аас бага байх ёстой.', 'error'); return; }
    var folderId = state.active.id, context = state.context;
    try {
      // Check the session before starting a normal streamed browser download.
      await api('folder_files', { query: { folder: folderId } });
      if (context !== state.context) return;
      var link = document.createElement('a');
      link.href = url('folder_download', { folder: folderId, files: ids.join(',') });
      link.download = state.active.name + '.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      C.toast(ids.length + ' файлын ZIP таталтыг эхлүүллээ.');
    } catch (error) { C.toast(error.message, 'error'); }
  }
  async function downloadFile(file) {
    if (!state.active) return;
    var folderId = state.active.id, context = state.context;
    try {
      await api('folder_files', { query: { folder: folderId } });
      if (context !== state.context) return;
      var link = document.createElement('a');
      link.href = fileUrl(file, true);
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) { C.toast(error.message, 'error'); }
  }

  async function uploadFiles(inputFiles) {
    if (!state.active) { C.toast('Файл нэмэхийн өмнө өөрийн хавтсыг сонгож, нууц үгээ оруулна уу.'); return; }
    if (isBusy()) return busyNotice();
    var files = Array.prototype.slice.call(inputFiles || []);
    if (!files.length) return;
    var folderId = state.active.id, parent = state.parent, context = state.context;
    var job = { cancelled: false, controller: null, id: null };
    state.upload = job;
    $('folderUploadProgress').hidden = false;
    $('folderCancelUpload').disabled = false;
    updateControls();
    var progress = $('folderProgressBar'), message = $('folderUploadMessage');
    progress.max = 100;
    progress.value = 0;
    var completedBytes = 0, totalBytes = files.reduce(function (sum, file) { return sum + (file.size <= state.maxBytes ? file.size : 0); }, 0);
    var successes = 0, failures = [], uploaded = [];
    function updateProgress(file, index, offset) {
      progress.value = totalBytes ? Math.min(100, Math.round((completedBytes + offset) / totalBytes * 100)) : 0;
      message.textContent = (index + 1) + '/' + files.length + ' · ' + file.name + ' · ' + C.fmtBytes(offset) + ' / ' + C.fmtBytes(file.size);
    }
    try {
      for (var i = 0; i < files.length; i++) {
        if (job.cancelled || context !== state.context) break;
        var file = files[i];
        if (file.size > state.maxBytes) {
          failures.push(file.name + ': Нэг файлын хэмжээ ' + C.fmtBytes(state.maxBytes) + '-аас их байж болохгүй.');
          continue;
        }
        try {
          job.controller = new AbortController();
          updateProgress(file, i, 0);
          var started = await api('folder_upload_init', { body: { folder: folderId, parent: parent, name: file.name, size: file.size }, signal: job.controller.signal });
          job.id = started.upload;
          var chunkBytes = Math.max(1, Math.min(Number(started.chunkBytes) || state.chunkBytes, state.chunkBytes)), offset = 0;
          while (offset < file.size && !job.cancelled && context === state.context) {
            var chunk = file.slice(offset, Math.min(file.size, offset + chunkBytes));
            var part, retries = 0;
            while (true) {
              try {
                part = await api('folder_upload_chunk', {
                  query: { folder: folderId, upload: job.id, offset: offset }, raw: chunk, signal: job.controller.signal
                });
                break;
              } catch (error) {
                if (job.cancelled || context !== state.context || error.name === 'AbortError') throw error;
                if (error.status === 413 && chunkBytes > 65536) {
                  chunkBytes = Math.max(65536, Math.floor(chunkBytes / 2));
                  state.chunkBytes = Math.min(state.chunkBytes, chunkBytes);
                  chunk = file.slice(offset, Math.min(file.size, offset + chunkBytes));
                  message.textContent = file.name + ' · Серверт тохируулан бага хэсгээр оруулж байна…';
                  continue;
                }
                // The server compares replayed bytes at the same offset, so a lost response is safe to retry.
                if ((error.status === 0 || error.status >= 500) && retries < 2) {
                  retries++;
                  message.textContent = file.name + ' · Холболтыг дахин оролдож байна (' + retries + '/2)…';
                  await new Promise(function (resolve) { setTimeout(resolve, retries * 600); });
                  continue;
                }
                throw error;
              }
            }
            var received = Number(part.received);
            if (!isFinite(received) || received !== offset + chunk.size) throw new Error('Файл оруулалтын хэмжээ таарахгүй байна. Дахин оролдоно уу.');
            offset = received;
            updateProgress(file, i, offset);
          }
          if (job.cancelled || context !== state.context) break;
          message.textContent = file.name + ' · Файлыг хадгалж байна…';
          var finished = await api('folder_upload_finish', { body: { folder: folderId, upload: job.id }, signal: job.controller.signal });
          if (finished.file) { finished.file._folder = folderId; uploaded.push(finished.file); }
          job.id = null;
          successes++;
          updateProgress(file, i, file.size);
          completedBytes += file.size;
        } catch (error) {
          if (job.cancelled || error.name === 'AbortError' || context !== state.context) break;
          failures.push(file.name + ': ' + error.message);
          if (error.status === 401 || error.status === 403) { job.cancelled = true; break; }
          await cancelRemoteUpload(folderId, job.id);
          job.id = null;
          completedBytes += file.size;
        }
      }
    } finally {
      await cancelRemoteUpload(folderId, job.id);
      state.upload = null;
      $('folderCancelUpload').disabled = true;
      updateControls();
      if (context === state.context && state.active) {
        progress.value = job.cancelled ? progress.value : 100;
        message.textContent = (job.cancelled ? 'Оруулалтыг цуцаллаа. ' : '') + successes + ' файл нэмэгдлээ.' +
          (failures.length ? ' ' + failures.join(' ') : '');
        if (!job.cancelled && !failures.length) C.toast(successes + ' файл нэмэгдлээ.');
        await loadFiles();
      }
    }
    return { files: uploaded, failures: failures, cancelled: job.cancelled };
  }
  async function cancelRemoteUpload(folderId, id) {
    if (!id) return;
    try { await api('folder_upload_cancel', { body: { folder: folderId, upload: id }, timeout: 10000 }); } catch (error) { /* Server also expires abandoned uploads. */ }
  }
  function cancelUpload() {
    if (!state.upload) return;
    state.upload.cancelled = true;
    $('folderCancelUpload').disabled = true;
    $('folderUploadMessage').textContent = 'Файл оруулалтыг цуцалж байна…';
    if (state.upload.controller) state.upload.controller.abort();
  }

  function closePreview() { if (state.preview) state.preview.modal.close(); }
  function openPreview(file) {
    if (!state.active || !C.FilePreview) return;
    closePreview();
    var folderId = state.active.id, context = state.context;
    C.FilePreview.open(file, {
      url: function (download) { return url('folder_file', { folder: folderId, file: file.id, download: download ? '1' : '0' }); },
      check: function (signal) { return api('folder_files', { query: { folder: folderId, parent: state.parent }, signal: signal }); },
      alive: function () { return context === state.context; },
      download: function () { downloadFile(file); },
      onUnauthorized: invalidateAccess,
      onOpen: function (modal) { state.preview = { modal: modal, file: file }; },
      onClose: function () { state.preview = null; }
    });
  }

  grid.addEventListener('click', function (event) {
    var card = event.target.closest('[data-folder]');
    if (!card) return;
    var id = card.getAttribute('data-folder');
    var folder = state.folders.filter(function (item) { return String(item.id) === id; })[0];
    if (folder) openFolder(folder);
  });
  $('folderSearch').addEventListener('input', renderFolders);
  $('folderFileSearch').addEventListener('input', function () { renderDirectories(); renderFiles(); });
  if ($('folderMetaBtn')) $('folderMetaBtn').onclick = function () { metadataModal(); };
  if ($('folderNewDirBtn')) $('folderNewDirBtn').onclick = function () { metadataModal(null, true); };
  if ($('folderShareBtn')) $('folderShareBtn').onclick = function () { shareModal(); };
  if ($('folderMoveSelected')) $('folderMoveSelected').onclick = function () { moveFiles(Object.keys(state.selected)); };
  if ($('folderBreadcrumbs')) $('folderBreadcrumbs').addEventListener('click', function (event) {
    var item = event.target.closest('[data-parent]'); if (item) navigate(item.getAttribute('data-parent'));
  });
  if ($('folderDirectories')) $('folderDirectories').addEventListener('click', function (event) {
    var row = event.target.closest('[data-directory]'); if (!row) return;
    var directory = state.directories.filter(function (item) { return String(item.id) === row.getAttribute('data-directory'); })[0];
    if (!directory) return;
    if (event.target.closest('[data-dir-open]')) navigate(directory.id);
    else if (event.target.closest('[data-dir-edit]')) metadataModal(directory);
    else if (event.target.closest('[data-dir-share]')) shareModal(null, directory);
    else if (event.target.closest('[data-dir-delete]')) deleteDirectory(directory);
  });
  $('folderBack').onclick = function () {
    if (isBusy()) return busyNotice();
    resetActive();
    loadFolders();
  };
  $('folderLockBtn').onclick = async function () {
    if (!state.active || isBusy()) return;
    var folder = state.active, context = state.context;
    state.mutating = true;
    updateControls();
    try {
      await api('folder_lock', { body: { folder: folder.id } });
      if (context !== state.context) return;
      folder.unlocked = false;
      state.folders.forEach(function (item) { if (String(item.id) === String(folder.id)) item.unlocked = false; });
      resetActive();
      renderFolders();
      C.toast('Хавтсыг түгжлээ.');
    } catch (error) { C.toast(error.message, 'error'); }
    finally { state.mutating = false; updateControls(); }
  };
  $('folderUploadBtn').onclick = function () {
    if (!state.active || isBusy()) return;
    $('folderFileInput').click();
  };
  $('folderFileInput').addEventListener('change', function () {
    uploadFiles(this.files);
    this.value = '';
  });
  $('folderCancelUpload').onclick = cancelUpload;
  $('folderSelectAll').addEventListener('change', function () {
    var checked = this.checked;
    visibleFiles().forEach(function (file) {
      if (checked) state.selected[String(file.id)] = true;
      else delete state.selected[String(file.id)];
    });
    renderFiles();
  });
  $('folderDownloadSelected').onclick = function () { downloadFiles(Object.keys(state.selected)); };
  $('folderDeleteSelected').onclick = function () { deleteFiles(Object.keys(state.selected)); };
  $('folderFiles').addEventListener('change', function (event) {
    if (!event.target.matches('[data-select]')) return;
    var row = event.target.closest('[data-file]'), id = row.getAttribute('data-file');
    if (event.target.checked) state.selected[id] = true;
    else delete state.selected[id];
    row.classList.toggle('picked', !!state.selected[id]);
    updateControls();
  });
  $('folderFiles').addEventListener('click', function (event) {
    var row = event.target.closest('[data-file]');
    if (!row) return;
    var id = row.getAttribute('data-file');
    var file = state.files.filter(function (item) { return String(item.id) === id; })[0];
    if (!file) return;
    if (event.target.closest('[data-preview]')) openPreview(file);
    else if (event.target.closest('[data-edit]') && !isBusy() && C.FileEditors) { closePreview(); Promise.resolve(C.FileEditors.open(file)).catch(function (error) { C.toast(error.message || 'Засварлагч нээгдсэнгүй.', 'error'); }); }
    else if (event.target.closest('[data-convert]') && !isBusy() && C.FileConverter) { closePreview(); Promise.resolve(C.FileConverter.open(file)).catch(function (error) { C.toast(error.message || 'Хөрвүүлэлт амжилтгүй.', 'error'); }); }
    else if (event.target.closest('[data-rename]')) renameFile(file);
    else if (event.target.closest('[data-share]')) shareModal(file);
    else if (event.target.closest('[data-delete]')) deleteFiles([id]);
    else if (event.target.closest('[data-download]')) { event.preventDefault(); downloadFile(file); }
  });
  window.addEventListener('beforeunload', function (event) {
    if (!state.upload) return;
    event.preventDefault();
    event.returnValue = '';
  });
  function requireCurrent(file) {
    if (!state.active || (file && file._folder && String(file._folder) !== String(state.active.id))) throw new Error('Хавтас өөрчлөгдсөн байна. Файлаа дахин нээнэ үү.');
    if (file && !state.files.some(function (item) { return String(item.id) === String(file.id); })) throw new Error('Файл энэ хавтсанд байхгүй байна. Файлаа дахин нээнэ үү.');
  }
  async function readFile(file) {
    requireCurrent(file);
    if (Number(file.size) > 32 * 1024 * 1024) throw new Error('Вэб засварлагч 32 МБ хүртэл файлыг нээнэ.');
    var context = state.context, folderId = state.active.id;
    var response = await fetch(url('folder_file', { folder: folderId, file: file.id }), { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) { if (context === state.context && (response.status === 401 || response.status === 403)) invalidateAccess(); throw new Error('Файлыг ачаалж чадсангүй.'); }
    var blob = await response.blob();
    if (context !== state.context) throw new Error('Хавтас өөрчлөгдсөн байна. Файлаа дахин нээнэ үү.');
    return blob;
  }
  async function saveFile(file, blob) {
    requireCurrent(file);
    if (isBusy()) throw new Error('Одоогийн үйлдлийг дуусгаад дахин оролдоно уу.');
    if (!(blob instanceof Blob) || blob.size > 32 * 1024 * 1024) throw new Error('Хадгалах файлын хэмжээ 32 МБ хүртэл байна.');
    var folderId = state.active.id, context = state.context;
    state.mutating = true; updateControls();
    try {
      var data = await api('folder_file_save', { query: { folder: folderId, file: file.id, version: file.version }, raw: blob });
      if (context !== state.context) throw new Error('Хавтас өөрчлөгдсөн байна. Файлаа дахин нээнэ үү.');
      if (data.file) { data.file._folder = folderId; Object.assign(file, data.file); }
      await loadFiles();
      return data.file || file;
    } finally { state.mutating = false; updateControls(); }
  }
  async function uploadBlob(blob, name) {
    requireCurrent();
    if (isBusy()) throw new Error('Одоогийн үйлдлийг дуусгаад дахин оролдоно уу.');
    if (!(blob instanceof Blob)) throw new Error('Хөрвүүлсэн файл олдсонгүй.');
    var result = await uploadFiles([new File([blob], name, { type: blob.type || 'application/octet-stream' })]);
    if (!result || result.cancelled) throw new Error('Файл нэмэхийг цуцаллаа.');
    if (result.failures.length) throw new Error(result.failures.join(' '));
    if (!result.files.length) throw new Error('Файлыг хадгалж чадсангүй.');
    return result.files[0];
  }
  C.Folders = {
    show: show, drop: uploadFiles, refresh: loadFiles, request: api, readFile: readFile, saveFile: saveFile, uploadBlob: uploadBlob,
    context: function () { return { folder: state.active ? state.active.id : null, parent: state.parent, csrf: state.csrf, readOnly: false }; },
    preview: openPreview
  };
  updateControls();
})();

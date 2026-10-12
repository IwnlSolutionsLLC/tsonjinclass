/* Teacher's note (admin): write a note, choose Яаралтай / Энхийн / Мэдээлэл, see exactly how it will look on the board, send it
   to the listening boards, and keep a short history (resend / delete). The card preview uses the same markup and styles as the board. */
(function () {
  'use strict';
  var C = window.C122;
  var panel = document.getElementById('teacherNote');
  if (!C || !panel || !C.state || !C.state.admin) return;

  var form = document.getElementById('tnForm');
  var titleInput = document.getElementById('tnTitleInput');
  var textInput = document.getElementById('tnText');
  var countEl = document.getElementById('tnCount');
  var sendBtn = document.getElementById('tnSend');
  var sendLabel = document.getElementById('tnSendLabel');
  var errorEl = document.getElementById('tnError');
  var boardsBadge = document.getElementById('tnBoards');
  var boardsHint = document.getElementById('tnBoardsHint');
  var soundWarn = document.getElementById('tnSoundWarn');
  var listEl = document.getElementById('tnList');
  var clearBtn = document.getElementById('tnClear');
  var frame = document.getElementById('tnPreviewFrame');
  var pStage = document.getElementById('tnPreviewStage');
  if (!form || !titleInput || !textInput || !countEl || !sendBtn || !listEl || !frame || !pStage) return;
  var card = pStage.querySelector('.nb-stage');
  var pTitle = pStage.querySelector('.nb-title');
  var pText = pStage.querySelector('.nb-text');
  var pBody = pStage.querySelector('.nb-body');
  var pTime = pStage.querySelector('.nb-time');
  var radios = form.querySelectorAll('input[name="tnType"]');

  var API = 'note.php';
  var MAX_TEXT = 600, NEAR = 540, REFRESH_MS = 5000;
  var STAGE_W = 1280, STAGE_H = 720;
  var ICONS = {
    urgent: '<svg class="tn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    normal: '<svg class="tn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.6A8 8 0 1 1 21 12Z"/></svg>',
    info: '<svg class="tn-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'
  };
  var TYPE_FALLBACK = { urgent: 'Яаралтай', normal: 'Энхийн', info: 'Мэдээлэл' };

  var sending = false, busyId = '', lastData = null, skew = 0, listKey = '', refreshing = false, timer = 0;

  function T(key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  }
  function typeName(type) { return T('note.type.' + type, TYPE_FALLBACK[type] || TYPE_FALLBACK.normal); }
  function setText(node, text) { if (node && node.textContent !== text) node.textContent = text; }
  function currentType() {
    for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value;
    return 'normal';
  }
  /* Same length rule as the server (characters, not UTF-16 units). */
  function chars(value) {
    var count = 0;
    for (var i = 0; i < value.length; i++) { var code = value.charCodeAt(i); if (code >= 0xD800 && code <= 0xDBFF) i++; count++; }
    return count;
  }
  function clock(seconds, withDate) {
    var date = new Date(seconds * 1000);
    var options = withDate ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false } : { hour: '2-digit', minute: '2-digit', hour12: false };
    if (window.C122I18n) return window.C122I18n.formatDate(date, options);
    try { options.timeZone = 'Asia/Ulaanbaatar'; return new Intl.DateTimeFormat('en-GB', options).format(date); } catch (_) { return ''; }
  }
  function nowSeconds() { return Date.now() / 1000 + skew; }

  /* ---------- errors ---------- */
  var ERRORS = {
    csrf: ['note.errAuth', 'Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.'],
    teacher_required: ['note.errAuth', 'Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.'],
    rate_limited: ['note.errRate', 'Хэт олон тэмдэглэл илгээлээ. Нэг минут хүлээгээд дахин оролдоно уу.'],
    too_long: ['note.errTooLong', 'Тэмдэглэл хэт урт байна.'],
    too_large: ['note.errTooLong', 'Тэмдэглэл хэт урт байна.'],
    empty: ['note.errEmpty', 'Тэмдэглэлийн текст оруулна уу.'],
    title_too_long: ['note.errTitleLong', 'Гарчиг хэт урт байна.'],
    not_found: ['note.errGone', 'Тэмдэглэл олдсонгүй. Жагсаалтыг шинэчиллээ.'],
    storage_unavailable: ['note.errServer', 'Серверийн алдаа. Түр хүлээгээд дахин оролдоно уу.'],
    server_error: ['note.errServer', 'Серверийн алдаа. Түр хүлээгээд дахин оролдоно уу.']
  };
  function errorText(error) {
    var known = error && ERRORS[error.code];
    if (known) return T(known[0], known[1]);
    if (error && error.network) return T('note.errNetwork', 'Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоно уу.');
    return T('note.errGeneric', 'Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.');
  }
  function showError(error) { errorEl.textContent = errorText(error); }
  function clearError() { errorEl.textContent = ''; }

  /* ---------- tiny fetch helper: JSON in/out, errors carry the server's code ---------- */
  function api(url, options, timeoutMs) {
    options = options || {};
    options.credentials = 'same-origin';
    options.cache = 'no-store';
    options.headers = options.headers || {};
    var controller = window.AbortController ? new AbortController() : null;
    var timeout = 0;
    if (controller) { options.signal = controller.signal; timeout = setTimeout(function () { controller.abort(); }, timeoutMs || 15000); }
    return fetch(url, options).then(function (response) {
      return response.text().then(function (text) {
        var data = null;
        try { data = JSON.parse(text); } catch (_) {}
        if (!response.ok || !data || data.ok === false) {
          var failure = new Error((data && data.error) || ('Серверийн алдаа (' + response.status + ')'));
          failure.code = (data && data.code) || '';
          failure.status = response.status;
          throw failure;
        }
        return data;
      });
    }, function (error) {
      var failure = new Error(error && error.name === 'AbortError' ? 'timeout' : 'network');
      failure.network = true;
      throw failure;
    }).then(function (data) { clearTimeout(timeout); return data; }, function (error) { clearTimeout(timeout); throw error; });
  }
  function post(action, body) {
    return api(API + '?action=' + action, { method: 'POST', headers: { 'X-CSRF': C.state.csrf || '', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  /* ---------- live preview (the board card, scaled down) ---------- */
  function fitPreview() {
    var base = parseFloat(window.getComputedStyle(card).fontSize) || 18;
    var lo = base * 0.8, hi = base * 4.4, size = hi, i;
    pText.style.fontSize = hi + 'px';
    if (pText.offsetHeight > pBody.clientHeight + 1) {
      for (i = 0; i < 10; i++) {
        size = (lo + hi) / 2;
        pText.style.fontSize = size + 'px';
        if (pText.offsetHeight > pBody.clientHeight + 1) hi = size; else lo = size;
      }
      pText.style.fontSize = lo + 'px';
    }
    pBody.classList.toggle('is-scroll', pText.offsetHeight > pBody.clientHeight + 1);
    pText.classList.toggle('is-centered', pText.textContent.length <= 150 && pText.textContent.indexOf('\n') < 0);
  }
  function scalePreview() {
    var width = frame.clientWidth;
    if (!width) return;
    var k = width / STAGE_W;
    pStage.style.transform = 'scale(' + k + ')';
    frame.style.height = Math.round(STAGE_H * k) + 'px';
  }
  function renderPreview() {
    var type = currentType(), title = titleInput.value.replace(/\s+/g, ' ').trim(), text = textInput.value.replace(/\r\n?/g, '\n').trim();
    card.setAttribute('data-type', type);
    form.setAttribute('data-type', type);
    pTitle.hidden = !title;
    pTitle.textContent = title;
    pText.textContent = text || T('note.previewEmpty', 'Тэмдэглэлийн текст энд харагдана…');
    pText.classList.toggle('is-empty', !text);
    pTime.textContent = clock(Date.now() / 1000, false);
    fitPreview();
  }

  /* ---------- the form ---------- */
  function paintCount() {
    var used = chars(textInput.value);
    setText(countEl, used + ' / ' + MAX_TEXT);
    countEl.classList.toggle('is-near', used >= NEAR && used < MAX_TEXT);
    countEl.classList.toggle('is-full', used >= MAX_TEXT);
  }
  function canSend() {
    var text = textInput.value.replace(/\s+/g, '');
    return !sending && text.length > 0 && chars(textInput.value) <= MAX_TEXT;
  }
  function paintSend() {
    sendBtn.disabled = !canSend();
    sendBtn.setAttribute('aria-busy', String(sending));
    setText(sendLabel, sending ? T('note.sending', 'Илгээж байна…') : T('note.send', 'Илгээх'));
    sendLabel.removeAttribute('data-i18n');                   // the text is managed here (it changes while sending)
  }
  function onInput() { clearError(); paintCount(); paintSend(); renderPreview(); }

  function send() {
    if (!canSend()) return;
    sending = true;
    clearError();
    paintSend();
    post('send', { type: currentType(), title: titleInput.value, text: textInput.value }).then(function (data) {
      sending = false;
      textInput.value = '';
      titleInput.value = '';
      onInput();
      C.toast(data.boards > 0 ? T('note.sent', 'Тэмдэглэл илгээгдлээ.') : T('note.sentNone', 'Тэмдэглэл хадгалагдлаа, гэхдээ одоогоор холбогдсон самбар алга.'));
      try { textInput.focus(); } catch (_) {}
      return refresh();
    }).catch(function (error) {
      sending = false;
      paintSend();
      showError(error);                                       // the draft stays in the form
    });
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); send(); });
  textInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send(); }
  });
  textInput.addEventListener('input', onInput);
  titleInput.addEventListener('input', onInput);
  Array.prototype.forEach.call(radios, function (radio) { radio.addEventListener('change', renderPreview); });

  /* ---------- status: boards online + history ---------- */
  function paintBoards() {
    var data = lastData, count = data ? data.boards : -1;
    var text = !data ? T('note.boards.checking', 'Самбарын төлөвийг шалгаж байна…')
      : count > 0 ? T('note.boards.some', '{count} самбар холбогдсон', { count: count }) : T('note.boards.none', 'Холбогдсон самбар алга');
    setText(boardsBadge.querySelector('span'), text);
    boardsBadge.classList.toggle('is-live', count > 0);
    boardsBadge.classList.toggle('is-warn', !!data && count === 0);
    if (boardsHint) boardsHint.hidden = !data || count > 0;
    if (soundWarn) soundWarn.hidden = !data || data.soundOk !== false;
  }
  function rowHtml(item, index, data) {
    var type = ICONS[item.type] ? item.type : 'normal';
    var old = nowSeconds() - item.at > 12 * 3600;
    var delivered = '';
    if (index === 0 && data.boards > 0) delivered = '<span class="tn-item-delivered">' + C.esc(T('note.delivered', '{done}/{total} самбар хүлээн авсан', { done: data.delivered, total: data.boards })) + '</span>';
    var busy = busyId === item.id ? ' disabled' : '';
    return '<li class="tn-item" data-type="' + type + '" data-id="' + C.esc(item.id) + '">' +
      '<span class="tn-item-dot" aria-hidden="true">' + ICONS[type] + '</span>' +
      '<div class="tn-item-main">' +
        '<div class="tn-item-top"><b class="tn-item-type">' + C.esc(typeName(type)) + '</b><time class="tn-item-time">' + C.esc(clock(item.at, old)) + '</time>' + delivered + '</div>' +
        (item.title ? '<p class="tn-item-title" data-user-content>' + C.esc(item.title) + '</p>' : '') +
        '<p class="tn-item-text" data-user-content>' + C.esc(item.text) + '</p>' +
      '</div>' +
      '<div class="tn-item-actions">' +
        '<button class="btn btn-ghost btn-sm" type="button" data-act="resend"' + busy + '>' + C.icon('refresh', 'i-sm') + '<span>' + C.esc(T('note.resend', 'Дахин илгээх')) + '</span></button>' +
        '<button class="btn btn-danger-ghost btn-sm" type="button" data-act="delete"' + busy + '>' + C.icon('trash', 'i-sm') + '<span>' + C.esc(T('note.delete', 'Устгах')) + '</span></button>' +
      '</div></li>';
  }
  function paintList() {
    var data = lastData;
    if (!data) return;
    var lang = window.C122I18n ? window.C122I18n.language() : 'mn';
    var key = lang + '|' + busyId + '|' + data.boards + '|' + data.delivered + '|' + data.items.map(function (item) { return item.id; }).join(',');
    clearBtn.hidden = !data.items.length;
    if (key === listKey) return;
    listKey = key;
    if (!data.items.length) {
      listEl.innerHTML = '<li class="tn-empty">' + C.icon('chat') + '<span>' + C.esc(T('note.historyEmpty', 'Одоогоор тэмдэглэл илгээгээгүй байна.')) + '</span></li>';
      return;
    }
    listEl.innerHTML = data.items.map(function (item, index) { return rowHtml(item, index, data); }).join('');
  }
  function paintAll() { paintBoards(); paintList(); }
  function refresh() {
    if (refreshing) return Promise.resolve();
    refreshing = true;
    return api(API + '?action=status', {}, 10000).then(function (data) {
      refreshing = false;
      lastData = data;
      skew = (Number(data.now) || 0) - Date.now() / 1000;
      paintAll();
    }).catch(function (error) {
      refreshing = false;
      if (error && (error.code === 'teacher_required' || error.code === 'csrf')) showError(error);
    });
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (document.hidden) { schedule(); return; }
      refresh().then(schedule, schedule);
    }, REFRESH_MS);
  }

  function rowAction(action, id) {
    if (busyId) return;
    busyId = id;
    listKey = '';
    clearError();
    paintList();
    post(action, { id: id }).then(function () {
      C.toast(action === 'resend' ? T('note.resent', 'Тэмдэглэл дахин илгээгдлээ.') : T('note.deleted', 'Тэмдэглэл устгагдлаа.'));
    }).catch(showError).then(function () {
      busyId = '';
      listKey = '';
      return refresh();
    }).then(paintList);
  }
  listEl.addEventListener('click', function (event) {
    var button = event.target.closest ? event.target.closest('[data-act]') : null;
    var row = button && button.closest('.tn-item');
    if (!button || !row || button.disabled) return;
    rowAction(button.getAttribute('data-act'), row.getAttribute('data-id'));
  });
  clearBtn.addEventListener('click', function () {
    C.confirm({ title: T('note.confirmClearTitle', 'Бүх тэмдэглэлийг устгах уу?'), text: T('note.confirmClearText', 'Түүхэнд хадгалагдсан бүх тэмдэглэл устна. Самбар дээр харагдаж буй тэмдэглэл хаагдахгүй.'), ok: T('note.clear', 'Бүгдийг устгах'), danger: true }).then(function (yes) {
      if (!yes) return;
      clearError();
      return post('clear', {}).then(function () { C.toast(T('note.cleared', 'Бүх тэмдэглэл устгагдлаа.')); }).catch(showError).then(refresh);
    });
  });

  document.addEventListener('c122:language', function () { listKey = ''; paintAll(); paintSend(); renderPreview(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  if (window.ResizeObserver) { try { new ResizeObserver(scalePreview).observe(frame); } catch (_) { window.addEventListener('resize', scalePreview); } }
  else window.addEventListener('resize', scalePreview);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', renderPreview);

  paintCount();
  paintSend();
  renderPreview();
  scalePreview();
  paintBoards();
  refresh().then(schedule, schedule);
})();

/* 12-2 анги — нийтлэг JS: API, мэдэгдэл, модал, хуваарь зурах */
(function () {
  'use strict';
  var C = (window.C122 = window.C122 || {});

  function ui(key, fallback, params) { if (window.C122I18n) return window.C122I18n.t(key, fallback, params); return fallback.replace(/\{(\w+)\}/g,function(_,name){return params && params[name] != null ? params[name] : '';}); }

  C.DAYS = ['', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
  C.state = { admin: false, member: false, csrf: null, setup: false, chunkMax: 8 * 1024 * 1024 };

  C.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  C.icon = function (name, cls) {
    return '<svg class="i ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  };
  C.$ = function (sel, root) { return (root || document).querySelector(sel); };
  C.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  C.el = function (html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  /* ---------- API ---------- */
  C.api = function (action, opts) {
    opts = opts || {};
    var url = 'api.php?action=' + encodeURIComponent(action);
    if (opts.query) {
      Object.keys(opts.query).forEach(function (k) {
        url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(opts.query[k]);
      });
    }
    var init = { method: opts.method || (opts.body !== undefined || opts.raw !== undefined ? 'POST' : 'GET'), headers: {}, credentials: 'same-origin', cache: 'no-store' };
    if (C.state.csrf) init.headers['X-CSRF'] = C.state.csrf;
    if (opts.raw !== undefined) {
      init.body = opts.raw;
      init.headers['Content-Type'] = opts.type || 'application/octet-stream';
    } else if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
      init.headers['Content-Type'] = 'application/json';
    }
    return fetch(url, init).catch(function () {
      var ne = new Error('Сүлжээний алдаа. Интернэт холболтоо шалгана уу.');
      ne.status = 0;
      throw ne;
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = JSON.parse(txt); } catch (e) { /* JSON биш */ }
        if (!res.ok || !data || data.ok === false) {
          var err = new Error((data && data.error) || ('Серверийн алдаа (' + res.status + ')'));
          err.status = res.status;
          err.data = data;
          // Нэвтрэх хугацаа дууссан бол төлөвийг цэвэрлэнэ (нэвтрэх оролдлого өөрөө 401 буцаах нь хэвийн)
          if (res.status === 401 && action !== 'login' && action !== 'setup') {
            if (data && data.locked) C.state.member = C.state.admin = false;
            else C.state.admin = false;
            document.documentElement.classList.toggle('is-admin', C.state.admin);
            document.documentElement.classList.toggle('is-member', C.state.member);
            document.dispatchEvent(new CustomEvent('c122:auth'));
          }
          throw err;
        }
        return data;
      });
    });
  };

  C.applyStatus = function (s) {
    C.state.admin = !!s.admin;
    C.state.member = !!(s.member || s.admin);
    C.state.setup = !!s.setup;
    C.state.csrf = s.csrf || null;
    if (s.chunkMax) C.state.chunkMax = s.chunkMax;
    if (s.quota) C.state.quota = s.quota;
    if (s.used != null) C.state.used = s.used;
    if (s.free != null) C.state.free = s.free;
    if (s.limits) C.state.limits = s.limits;
    if (s.gd != null) C.state.gd = !!s.gd;
    document.documentElement.classList.toggle('is-admin', C.state.admin);
    document.documentElement.classList.toggle('is-member', C.state.member);
    document.dispatchEvent(new CustomEvent('c122:auth'));
    return s;
  };

  C.refreshStatus = function () {
    return C.api('status').then(C.applyStatus);
  };

  /* ---------- Toast ---------- */
  C.toast = function (msg, type) {
    var box = C.$('.toasts');
    if (!box) { box = C.el('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(box); }
    var t = C.el('<div class="toast ' + (type || '') + '">' + C.icon(type === 'error' ? 'alert' : 'check') + '<span></span></div>');
    t.querySelector('span').textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 320); }, type === 'error' ? 5200 : 3000);
  };

  /* ---------- Модал ---------- */
  C.openModal = function (html, opts) {
    opts = opts || {};
    var back = C.el('<div class="modal-back"><div class="modal glass ' + (opts.wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>');
    document.body.appendChild(back);
    var modal = back.firstElementChild;
    var prevFocus = document.activeElement;
    function close(v) {
      if (!back.parentNode) return;
      back.remove();
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (opts.onClose) opts.onClose(v);
    }
    function onKey(e) { if (e.key === 'Escape' && !opts.sticky) close(); }
    document.addEventListener('keydown', onKey);
    back.addEventListener('mousedown', function (e) { if (e.target === back && !opts.sticky) close(); });
    C.$$('[data-close]', modal).forEach(function (b) { b.addEventListener('click', function () { close(); }); });
    setTimeout(function () {
      var f = modal.querySelector('[autofocus]') || modal.querySelector('input,button.btn-primary');
      if (f) f.focus();
    }, 30);
    return { el: modal, close: close };
  };

  C.confirm = function (o) {
    return new Promise(function (resolve) {
      var m = C.openModal(
        '<div class="modal-icon ' + (o.danger ? 'danger' : '') + '">' + C.icon(o.icon || (o.danger ? 'trash' : 'alert'), 'i-lg') + '</div>' +
        '<h3>' + C.esc(o.title) + '</h3>' + (o.text ? '<p class="lead">' + C.esc(o.text) + '</p>' : '') +
        '<div class="actions"><button class="btn btn-ghost" data-no>Цуцлах</button><button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-yes>' + C.esc(o.ok || 'Тийм') + '</button></div>',
        { onClose: function (v) { resolve(!!v); } }
      );
      m.el.querySelector('[data-no]').onclick = function () { m.close(false); };
      m.el.querySelector('[data-yes]').onclick = function () { m.close(true); };
      setTimeout(function () { m.el.querySelector('[data-yes]').focus(); }, 40);
    });
  };

  /* Нэвтрэх / анх нууц үг үүсгэх цонх. Амжилттай бол Promise(true). */
  C.MIN_PASSWORD = 8;
  C.isAdminPage = function () { return document.body.getAttribute('data-page') === 'admin'; };

  C.login = function (options) {
    options = options || {};
    return new Promise(function (resolve) {
      var setup = C.state.setup;
      if (setup && !C.isAdminPage()) {
        // Анхны тохиргоог зөвхөн удирдлагын хуудсанд хийнэ
        var s = C.openModal(
          '<div class="modal-icon">' + C.icon('shield', 'i-lg') + '</div><h3>Сайтыг тохируулаагүй байна</h3>' +
          '<p class="lead">Зураг нэмэхийн өмнө сайтын эзэн «Удирдлага» хэсэгт админ нууц үгээ үүсгэх хэрэгтэй.</p>' +
          '<div class="actions"><button class="btn btn-ghost" data-close>Хаах</button><a class="btn btn-primary" href="admin.php">' + C.icon('settings', 'i-sm') + 'Удирдлага руу очих</a></div>',
          { onClose: function () { resolve(false); } }
        );
        return s;
      }
      var m = C.openModal(
        '<div class="modal-icon">' + C.icon(setup ? 'shield' : 'lock', 'i-lg') + '</div>' +
        '<h3>' + C.esc(setup ? 'Админ нууц үг үүсгэх' : options.title || 'Админ нэвтрэх') + '</h3>' +
        '<p class="lead">' + (setup
          ? 'Pterodactyl-ийн File Manager-ээс <b>database/setup.php</b> файлыг нээгээд, доторх <b>"code"</b>-ийн утгыг доор оруулна уу. Дараа нь зураг нэмэх, хуваарь засахад ашиглах нууц үгээ үүсгэнэ.'
          : C.esc(options.message || 'Зураг нэмэх, хуваарь засахын тулд нууц үгээ оруулна уу.')) + '</p>' +
        '<form novalidate>' +
        (setup ? '<div class="field"><label for="pwCode">Тохиргооны код</label><input class="input" id="pwCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="жишээ нь K7Q2MX9A" autofocus></div>' : '') +
        '<div class="field"><label for="pw1">' + (setup ? 'Шинэ нууц үг' : 'Нууц үг') + '</label><input class="input" id="pw1" type="password" autocomplete="' + (setup ? 'new-password' : 'current-password') + '"' + (setup ? '' : ' autofocus') + '></div>' +
        (setup ? '<div class="field"><label for="pw2">Нууц үг давтах</label><input class="input" id="pw2" type="password" autocomplete="new-password"></div>' : '') +
        '<div class="err" aria-live="polite"></div>' +
        '<div class="actions"><button type="button" class="btn btn-ghost" data-close>Цуцлах</button><button class="btn btn-primary" type="submit">' + (setup ? 'Үүсгэх' : 'Нэвтрэх') + '</button></div>' +
        '</form>',
        { onClose: function (v) { resolve(!!v); } }
      );
      var form = m.el.querySelector('form');
      var err = m.el.querySelector('.err');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var pw = m.el.querySelector('#pw1').value;
        err.textContent = '';
        var body = { password: pw };
        if (setup) {
          body.code = m.el.querySelector('#pwCode').value.trim();
          if (!body.code) { err.textContent = 'Тохиргооны кодоо оруулна уу'; return; }
          if (pw.length < C.MIN_PASSWORD) { err.textContent = 'Нууц үг хамгийн багадаа ' + C.MIN_PASSWORD + ' тэмдэгт байх ёстой'; return; }
          if (pw !== m.el.querySelector('#pw2').value) { err.textContent = 'Нууц үг таарахгүй байна'; return; }
        } else if (!pw) { err.textContent = 'Нууц үгээ оруулна уу'; return; }
        var btn = form.querySelector('[type=submit]');
        btn.disabled = true;
        C.api(setup ? 'setup' : 'login', { body: body })
          .then(function (s) {
            C.applyStatus(s);
            C.toast(setup ? 'Нууц үг үүслээ. Тавтай морил!' : 'Амжилттай нэвтэрлээ');
            m.close(true);
          })
          .catch(function (ex) {
            if (ex.data && ex.data.setup) { C.state.setup = true; }
            err.textContent = ex.message;
            btn.disabled = false;
          });
      });
    });
  };

  C.ensureAdmin = function () {
    if (C.state.admin) return Promise.resolve(true);
    return C.login();
  };

  /* ---------- Цомгийн 4 оронтой код ---------- */
  /*
   * box дотор цэг + товчлуурын самбар зурна. opts: { onSuccess(), autofocus }
   * Буцаах: { destroy() } — гарын товчлуурын сонсогчийг арилгана.
   */
  C.pinPad = function (box, opts) {
    opts = opts || {};
    var keys = '';
    for (var n = 1; n <= 9; n++) keys += '<button type="button" class="pin-key" data-k="' + n + '">' + n + '</button>';
    keys += '<span></span><button type="button" class="pin-key" data-k="0">0</button>' +
      '<button type="button" class="pin-key pin-back" data-k="back" aria-label="Арилгах">' + C.icon('left') + '</button>';
    box.innerHTML = '<div class="pin-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<div class="pin-msg" role="status" aria-live="polite"></div>' +
      '<div class="pin-keys" role="group" aria-label="4 оронтой код">' + keys + '</div>';
    var dots = C.$$('.pin-dots i', box), msg = box.querySelector('.pin-msg'), pad = box.querySelector('.pin-keys');
    var code = '', busy = false, alive = true;

    function draw() {
      dots.forEach(function (d, i) { d.classList.toggle('on', i < code.length); });
    }
    function setMsg(t, cls) { msg.textContent = t || ''; msg.className = 'pin-msg ' + (cls || ''); }
    function press(k) {
      if (busy || !alive) return;
      if (k === 'back') { code = code.slice(0, -1); setMsg(''); draw(); return; }
      if (code.length >= 4) return;
      code += k;
      draw();
      if (code.length === 4) submit();
    }
    function submit() {
      busy = true;
      box.classList.remove('err', 'ok');
      setMsg('Шалгаж байна…');
      C.api('album_unlock', { body: { pin: code } }).then(function (s) {
        C.applyStatus(s);
        box.classList.add('ok');
        setMsg('Нээгдлээ', 'ok');
        setTimeout(function () { if (opts.onSuccess) opts.onSuccess(); }, 380);
      }).catch(function (e) {
        box.classList.remove('err');
        void box.offsetWidth;          // shake хөдөлгөөнийг дахин эхлүүлнэ
        box.classList.add('err');
        setMsg(e.data && e.data.wrongPin ? 'Код буруу байна. Дахин оролдоно уу.' : e.message, 'bad');
        setTimeout(function () {
          code = '';
          draw();
          busy = false;
          box.classList.remove('err');
        }, e.status === 429 ? 4000 : 650);
      });
    }
    pad.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]');
      if (b) press(b.getAttribute('data-k'));
    });
    function onKey(e) {
      if (!alive || !box.offsetParent || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('.modal-back') && !box.closest('.modal-back')) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('back'); }
    }
    document.addEventListener('keydown', onKey);
    draw();
    // Товчлуур биш, самбарыг өөрийг нь фокуслана (Enter дарахад «1» бичигдэхээс сэргийлнэ)
    box.setAttribute('tabindex', '-1');
    if (opts.autofocus) setTimeout(function () { if (alive) box.focus({ preventScroll: true }); }, 60);
    return {
      destroy: function () { alive = false; document.removeEventListener('keydown', onKey); },
      reset: function () { code = ''; busy = false; setMsg(''); box.classList.remove('err', 'ok'); draw(); },
    };
  };

  /* Цомгийн эрх хэрэгтэй үйлдлийн өмнө: эрхгүй бол код асууна. */
  C.ensureMember = function () {
    if (C.state.member) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var ok = false, pp = null;
      var m = C.openModal(
        '<div class="lock-modal"><div class="lock-icon">' + C.icon('lock', 'i-lg') + '</div><h3>Цомгийн код</h3>' +
        '<p class="lead">Үргэлжлүүлэхийн тулд 4 оронтой кодоо оруулна уу.</p><div class="pin"></div>' +
        '<div class="actions" style="justify-content:center"><button class="btn btn-ghost" data-close>Цуцлах</button></div></div>',
        { onClose: function () { if (pp) pp.destroy(); resolve(ok); } }
      );
      pp = C.pinPad(m.el.querySelector('.pin'), { autofocus: true, onSuccess: function () { ok = true; m.close(); } });
    });
  };

  C.logout = function () {
    var ready = C.state.csrf ? Promise.resolve() : C.refreshStatus().catch(function () {});
    return ready.then(function () { return C.api('logout', { body: {} }); }).then(C.applyStatus);
  };

  /* ---------- Формат ---------- */
  C.fmtBytes = function (n) {
    n = Number(n) || 0;
    var u = window.C122I18n && window.C122I18n.language() !== 'mn' ? ['B','KB','MB','GB','TB'] : ['Б','КБ','МБ','ГБ','ТБ'];
    var i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(n < 10 ? 1 : 0)) + ' ' + u[i];
  };
  C.fmtDuration = function (s) {
    s = Math.max(0, Math.round(Number(s) || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    var mm = h ? String(m).padStart(2, '0') : m;
    return (h ? h + ':' : '') + mm + ':' + String(x).padStart(2, '0');
  };
  C.fmtEta = function (s) {
    if (!isFinite(s) || s <= 0) return '';
    if (s < 60) return Math.ceil(s) + ' сек';
    if (s < 3600) return Math.ceil(s / 60) + ' мин';
    return Math.floor(s / 3600) + ' цаг ' + Math.ceil((s % 3600) / 60) + ' мин';
  };
  C.fmtDate = function (ts) {
    var d = new Date(ts * 1000);
    if (window.C122I18n && window.C122I18n.language() !== 'mn') return window.C122I18n.formatDate(d, {timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };

  /* Улаанбаатарын цаг: { day: 1-7 (Даваа=1), min: өдрийн минут, hms } */
  C.ubNow = function () {
    var parts = {};
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        .formatToParts(new Date())
        .forEach(function (p) { parts[p.type] = p.value; });
    } catch (e) {
      var d = new Date();
      parts = { weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], hour: String(d.getHours()), minute: String(d.getMinutes()), second: String(d.getSeconds()) };
    }
    var map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    var h = parseInt(parts.hour, 10) % 24, mi = parseInt(parts.minute, 10), s = parseInt(parts.second, 10);
    return { day: map[parts.weekday] || 1, min: h * 60 + mi, sec: s, hm: String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') };
  };

  /* ---------- Хуваарь ---------- */
  C.toMin = function (t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
  };

  C.tone = function (subject) {
    var s = String(subject || '').toLowerCase(), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 'tone-' + (h % 8);
  };

  C.periodMap = function (sch) {
    var m = {};
    (sch.periods || []).forEach(function (p) { m[p.n] = p; });
    return m;
  };

  C.daysOf = function (sch) {
    var days = [1, 2, 3, 4, 5];
    (sch.lessons || []).forEach(function (l) { if (l.day > 5 && days.indexOf(l.day) < 0) days.push(l.day); });
    return days.sort();
  };

  function sig(ls) {
    return ls.map(function (l) { return [l.subject, l.teacher, l.group, l.room, l.note].join('|'); }).sort().join('||');
  }

  /* Нэг өдрийн хичээлүүдийг дараалсан ижил цагуудаар нь нэгтгэж блок болгоно. */
  C.dayBlocks = function (sch, day) {
    var pm = C.periodMap(sch);
    var bySlot = {};
    (sch.lessons || []).forEach(function (l) {
      if (l.day !== day) return;
      (bySlot[l.period] = bySlot[l.period] || []).push(l);
    });
    var periods = (sch.periods || []).slice().sort(function (a, b) { return a.n - b.n; });
    var blocks = [];
    periods.forEach(function (p) {
      var ls = bySlot[p.n];
      if (!ls) return;
      ls.sort(function (a, b) { return (a.group || '').localeCompare(b.group || '') || (a.teacher || '').localeCompare(b.teacher || ''); });
      var last = blocks[blocks.length - 1];
      var prevP = last ? pm[last.to] : null;
      if (last && last.to === p.n - 1 && prevP && C.toMin(p.start) - C.toMin(prevP.end) <= 10 && last.sig === sig(ls)) {
        last.to = p.n;
        last.end = p.end;
      } else {
        blocks.push({ from: p.n, to: p.n, start: p.start, end: p.end, lessons: ls, sig: sig(ls) });
      }
    });
    // Өмнө нь тодорхойлогдоогүй цагтай хичээл (periods-д байхгүй) — алгасахгүй
    Object.keys(bySlot).forEach(function (k) {
      var n = +k;
      if (!pm[n]) blocks.push({ from: n, to: n, start: '', end: '', lessons: bySlot[k], sig: sig(bySlot[k]) });
    });
    return blocks.sort(function (a, b) { return a.from - b.from; });
  };

  /* Нэг блок (нэг эсвэл хэд хэдэн хичээл) -> HTML */
  C.lessonHtml = function (block, opts) {
    opts = opts || {};
    var ls = block.lessons;
    var subjects = [];
    ls.forEach(function (l) { if (subjects.indexOf(l.subject) < 0) subjects.push(l.subject); });
    var tone = C.tone(subjects[0]);
    var html = '<div class="lesson ' + tone + (opts.cls ? ' ' + opts.cls : '') + '"' + (opts.attrs || '') + '>';
    if (opts.now) html += '<span class="now-badge">Одоо</span>';
    html += '<div class="subj" data-i18n-skip>' + C.esc(subjects.join(' / ') || 'Хичээл') + '</div>';
    if (ls.length === 1 && !ls[0].group) {
      var l = ls[0];
      var bits = [];
      if (l.teacher) bits.push(C.esc(l.teacher));
      if (l.room) bits.push(C.esc(l.room) + ' тоот');
      if (bits.length) html += '<div class="who" data-i18n-skip>' + bits.join(' · ') + '</div>';
      if (l.note) html += '<div class="who" data-i18n-skip>' + C.esc(l.note) + '</div>';
    } else {
      html += '<div class="rows" data-i18n-skip>';
      ls.forEach(function (l) {
        var right = [l.teacher, l.room ? l.room + ' тоот' : '', l.note].filter(Boolean).map(C.esc).join(' · ');
        html += '<div class="row">' + (l.group ? '<span class="gtag">' + C.esc(l.group) + '</span>' : '') + '<span>' + (right || '—') + '</span></div>';
      });
      html += '</div>';
    }
    if (opts.showSpan && block.to > block.from) html += '<div class="span-t">' + (block.to - block.from + 1) + ' цаг</div>';
    return html + '</div>';
  };

  /* Хоёр цагийн хоорондох завсарлага 15+ минут бол "Завсарлага" мөр гаргана. */
  C.breakBetween = function (a, b) {
    if (!a || !b) return 0;
    var gap = C.toMin(b.start) - C.toMin(a.end);
    return gap >= 15 ? gap : 0;
  };

  /* 7 хоногийн хүснэгт.  opts: { editable, today, nowMin, allPeriods, onSlot(day, period) } */
  C.renderWeek = function (container, sch, opts) {
    opts = opts || {};
    var days = C.daysOf(sch);
    var periods = (sch.periods || []).slice().sort(function (a, b) { return a.n - b.n; });
    var used = {};
    (sch.lessons || []).forEach(function (l) { used[l.period] = true; });
    if (!opts.allPeriods) {
      var maxUsed = 0;
      periods.forEach(function (p) { if (used[p.n]) maxUsed = p.n; });
      periods = periods.filter(function (p) { return p.n <= Math.max(maxUsed, 6); });
    }
    var html = '<div class="week" style="--days:' + days.length + '">';
    html += '<div class="wk-head wk-corner"></div>';
    days.forEach(function (d) {
      html += '<div class="wk-head' + (d === opts.today ? ' today' : '') + '">' + C.DAYS[d] + (d === opts.today ? '<small>Өнөөдөр</small>' : '') + '</div>';
    });

    // Мөрийн дугаар: 1 = толгой
    var row = 2, rowOf = {};
    var items = [];
    periods.forEach(function (p, i) {
      var br = C.breakBetween(periods[i - 1], p);
      if (i > 0 && br) {
        items.push('<div class="wk-break" style="grid-row:' + row + '">' + C.icon('coffee') + (br >= 20 ? 'Үдийн завсарлага' : 'Завсарлага') + ' · ' + periods[i - 1].end + '–' + p.start + '</div>');
        row++;
      }
      rowOf[p.n] = row;
      var isNow = opts.nowMin != null && days.indexOf(opts.today) >= 0 && opts.nowMin >= C.toMin(p.start) && opts.nowMin < C.toMin(p.end);
      items.push('<div class="wk-time' + (isNow ? ' now' : '') + '" style="grid-row:' + row + ';grid-column:1"><b>' + C.esc(ui('schedule.period','{number}-р цаг',{number:p.n})) + '</b>' + p.start + '–' + p.end + '</div>');
      row++;
    });

    days.forEach(function (d, di) {
      var col = di + 2;
      var blocks = C.dayBlocks(sch, d).filter(function (b) { return rowOf[b.from]; });
      var covered = {};
      blocks.forEach(function (b) {
        var span = 0;
        for (var n = b.from; n <= b.to; n++) if (rowOf[n]) { covered[n] = true; span = rowOf[n] - rowOf[b.from] + 1; }
        var isNow = d === opts.today && opts.nowMin != null && opts.nowMin >= C.toMin(b.start) && opts.nowMin < C.toMin(b.end);
        var isPast = d === opts.today && opts.nowMin != null && opts.nowMin >= C.toMin(b.end);
        items.push(C.lessonHtml(b, {
          now: isNow,
          showSpan: true,
          cls: (isNow ? 'now' : '') + (isPast && !opts.editable ? ' past' : ''),
          attrs: ' style="grid-row:' + rowOf[b.from] + ' / span ' + span + ';grid-column:' + col + '" data-day="' + d + '" data-period="' + b.from + '" data-to="' + b.to + '"' + (opts.editable ? ' tabindex="0" role="button"' : ''),
        }));
      });
      periods.forEach(function (p) {
        if (covered[p.n]) return;
        items.push('<div class="wk-empty' + (d === opts.today ? ' today' : '') + '" style="grid-row:' + rowOf[p.n] + ';grid-column:' + col + '" data-day="' + d + '" data-period="' + p.n + '"' +
          (opts.editable ? ' tabindex="0" role="button" aria-label="' + C.DAYS[d] + ' ' + p.n + '-р цагт хичээл нэмэх">' + C.icon('plus') : '>') + '</div>');
      });
    });
    html += items.join('') + '</div>';
    var oldScroll = container.querySelector('.week-scroll');
    var keepLeft = oldScroll ? oldScroll.scrollLeft : 0;
    container.innerHTML = '<div class="week-scroll">' + html + '</div>';
    if (keepLeft) container.querySelector('.week-scroll').scrollLeft = keepLeft;

    if (opts.onSlot) {
      C.$$('[data-day]', container).forEach(function (el) {
        var go = function () { opts.onSlot(+el.getAttribute('data-day'), +el.getAttribute('data-period'), +(el.getAttribute('data-to') || el.getAttribute('data-period'))); };
        el.addEventListener('click', go);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
    }
  };

  /* Нэг өдрийн жагсаалт (гар утсанд) */
  C.renderDay = function (container, sch, day, opts) {
    opts = opts || {};
    var blocks = C.dayBlocks(sch, day);
    if (!blocks.length) {
      container.innerHTML = '<div class="day-empty">' + C.icon('sparkle') + (day > 5 ? 'Амралтын өдөр — хичээлгүй' : 'Энэ өдөр хичээл алга') + '</div>';
      return;
    }
    var pm = C.periodMap(sch);
    var html = '<div class="day-list">';
    blocks.forEach(function (b, i) {
      var prev = blocks[i - 1];
      if (prev && pm[prev.to] && pm[b.from]) {
        // Өмнөх блокоос энэ блок хүртэлх завсарлага, чөлөөт цагууд
        var chain = [pm[prev.to]];
        for (var n = prev.to + 1; n < b.from; n++) if (pm[n]) chain.push(pm[n]);
        chain.push(pm[b.from]);
        var freeRun = [];
        var flushFree = function () {
          if (!freeRun.length) return;
          var a = freeRun[0], z = freeRun[freeRun.length - 1];
          html += '<div class="day-item"><div class="when"><b>' + a.start + '</b>' + z.end + '<span class="p">' + C.esc(ui('schedule.period','{number}-р цаг',{number:a.n === z.n ? a.n : a.n + '–' + z.n})) + '</span></div><div class="day-free">Чөлөөт цаг</div></div>';
          freeRun = [];
        };
        for (var k = 1; k < chain.length; k++) {
          var br = C.breakBetween(chain[k - 1], chain[k]);
          if (br) {
            flushFree();
            html += '<div class="wk-break">' + C.icon('coffee') + (br >= 20 ? 'Үдийн завсарлага' : 'Завсарлага') + ' · ' + chain[k - 1].end + '–' + chain[k].start + '</div>';
          }
          if (k < chain.length - 1) freeRun.push(chain[k]);
        }
        flushFree();
      }
      var isNow = day === opts.today && opts.nowMin != null && opts.nowMin >= C.toMin(b.start) && opts.nowMin < C.toMin(b.end);
      var isPast = day === opts.today && opts.nowMin != null && opts.nowMin >= C.toMin(b.end);
      html += '<div class="day-item"><div class="when"><b>' + C.esc(b.start) + '</b>' + C.esc(b.end) + '<span class="p">' + C.esc(ui('schedule.period','{number}-р цаг',{number:b.to > b.from ? b.from + '–' + b.to : b.from})) + '</span></div>' +
        C.lessonHtml(b, { now: isNow, cls: (isNow ? 'now' : '') + (isPast ? ' past' : '') }) + '</div>';
    });
    container.innerHTML = html + '</div>';
  };
})();

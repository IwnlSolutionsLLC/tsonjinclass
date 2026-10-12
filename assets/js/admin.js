/* 12-2 анги — удирдлагын хуудас */
(function () {
  'use strict';
  var C = window.C122;
  var boot = JSON.parse(document.getElementById('boot').textContent);
  C.state.admin = !!boot.admin;
  C.state.setup = !!boot.setup;
  C.state.csrf = boot.csrf || null;

  if (!boot.admin) {
    var lb = C.$('#loginBtn');
    var go = function () { C.login().then(function (ok) { if (ok) location.reload(); }); };
    if (lb) lb.onclick = go;
    go();
    return;
  }

  C.refreshStatus().then(function () { renderStorage(); renderThumbTool(); }).catch(function (e) { C.toast(e.message, 'error'); });

  var saved = boot.schedule;
  var draft = clone(saved);
  var pdfInfo = boot.pdf;
  var dirty = false;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid() { return 'L' + Math.random().toString(16).slice(2, 10); }
  function pm() { return C.periodMap(draft); }

  function setDirty(v) {
    dirty = v;
    C.$('#saveBar').hidden = !v;
  }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; return ''; } });

  C.$('#logoutBtn').onclick = function () {
    var go = function () {
      C.logout().then(function () { location.href = './'; }).catch(function (e) { C.toast(e.message, 'error'); });
    };
    if (dirty) C.confirm({ title: 'Хадгалаагүй өөрчлөлт байна', text: 'Гарвал өөрчлөлт алга болно.', ok: 'Гарах', danger: true }).then(function (y) { if (y) { dirty = false; go(); } });
    else go();
  };

  /* ================= Хуваарийн засварлагч ================= */
  function renderGrid() {
    C.renderWeek(C.$('#editGrid'), draft, { editable: true, allPeriods: true, onSlot: openSlot });
    if (!draft.lessons.length) {
      var hint = C.el('<div class="day-empty" style="padding:18px 10px 6px">' + C.icon('calendar') + 'Хуваарь хоосон байна. «Хуваарь оруулах» дарж PDF, JSON эсвэл CSV файлаа оруулна уу, эсвэл нүд дээр дарж гараар нэмнэ үү.</div>');
      C.$('#editGrid').insertBefore(hint, C.$('#editGrid').firstChild);
    }
  }

  function lessonsAt(day, period) {
    return draft.lessons.filter(function (l) { return l.day === day && l.period === period; });
  }

  function suggestions() {
    var s = {}, t = {}, g = {};
    draft.lessons.forEach(function (l) { if (l.subject) s[l.subject] = 1; if (l.teacher) t[l.teacher] = 1; if (l.group) g[l.group] = 1; });
    var dl = function (id, o) { return '<datalist id="' + id + '">' + Object.keys(o).sort().map(function (v) { return '<option value="' + C.esc(v) + '">'; }).join('') + '</datalist>'; };
    return dl('dlSubj', s) + dl('dlTeacher', t) + dl('dlGroup', g);
  }

  function lessonCard(l, i) {
    return '<div class="slot-card" data-i="' + i + '">' +
      '<div class="head"><span>Хичээл ' + (i + 1) + '</span><button type="button" class="btn btn-danger-ghost btn-sm" data-rm>' + C.icon('trash', 'i-sm') + 'Хасах</button></div>' +
      '<div class="grid-2">' +
      '<div class="field"><label>Хичээл</label><input class="input" data-k="subject" list="dlSubj" maxlength="80" value="' + C.esc(l.subject) + '"></div>' +
      '<div class="field"><label>Багш</label><input class="input" data-k="teacher" list="dlTeacher" maxlength="80" value="' + C.esc(l.teacher) + '"></div>' +
      '<div class="field"><label>Бүлэг <span class="hint">(заавал биш)</span></label><input class="input" data-k="group" list="dlGroup" maxlength="60" placeholder="жишээ нь 12A, HSK1" value="' + C.esc(l.group) + '"></div>' +
      '<div class="field"><label>Танхим <span class="hint">(заавал биш)</span></label><input class="input" data-k="room" maxlength="40" value="' + C.esc(l.room) + '"></div>' +
      '</div>' +
      '<div class="field" style="margin-bottom:0"><label>Тэмдэглэл <span class="hint">(заавал биш)</span></label><input class="input" data-k="note" maxlength="120" value="' + C.esc(l.note) + '"></div>' +
      '</div>';
  }

  /* Нэг цагийн (эсвэл дараалсан хэд хэдэн цагийн) хичээлүүдийг засах */
  function openSlot(day, from, to) {
    to = to || from;
    var len0 = to - from + 1;
    var work = lessonsAt(day, from).map(function (l) { return clone(l); });
    if (!work.length) work.push({ subject: '', teacher: '', group: '', room: '', note: '' });
    var periods = draft.periods.slice().sort(function (a, b) { return a.n - b.n; });
    var dayOpts = [1, 2, 3, 4, 5, 6, 7].map(function (d) { return '<option value="' + d + '"' + (d === day ? ' selected' : '') + '>' + C.DAYS[d] + '</option>'; }).join('');
    var perOpts = periods.map(function (p) { return '<option value="' + p.n + '"' + (p.n === from ? ' selected' : '') + '>' + p.n + '-р цаг (' + p.start + '–' + p.end + ')</option>'; }).join('');
    var lens = [];
    for (var ln = 1; ln <= Math.max(4, len0); ln++) lens.push(ln);
    var lenOpts = lens.map(function (n) { return '<option value="' + n + '"' + (n === len0 ? ' selected' : '') + '>' + n + ' цаг</option>'; }).join('');
    var existed = lessonsAt(day, from).length > 0;

    var m = C.openModal(
      '<h3>' + (existed ? 'Хичээл засах' : 'Хичээл нэмэх') + '</h3>' +
      '<p class="lead">Нэг цагт хэд хэдэн бүлэг (жишээ нь 12A, 12B) хичээллэдэг бол «Бүлэг нэмэх» дарна.</p>' +
      '<div class="grid-3">' +
      '<div class="field"><label>Гараг</label><select class="input" id="sDay">' + dayOpts + '</select></div>' +
      '<div class="field"><label>Эхлэх цаг</label><select class="input" id="sPer">' + perOpts + '</select></div>' +
      '<div class="field"><label>Үргэлжлэх</label><select class="input" id="sLen">' + lenOpts + '</select></div>' +
      '</div>' +
      '<div class="slot-lessons" id="sList"></div>' + suggestions() +
      '<div class="toolbar" style="margin-top:12px"><button type="button" class="btn btn-ghost btn-sm" id="sAdd">' + C.icon('plus', 'i-sm') + 'Бүлэг нэмэх</button></div>' +
      '<div class="err" id="sErr"></div>' +
      '<div class="actions">' +
      (existed ? '<button type="button" class="btn btn-danger-ghost" id="sClear" style="margin-right:auto">' + C.icon('trash', 'i-sm') + 'Цагийг хоослох</button>' : '') +
      '<button type="button" class="btn btn-ghost" data-close>Цуцлах</button><button type="button" class="btn btn-primary" id="sOk">' + C.icon('check', 'i-sm') + 'Болсон</button></div>',
      { wide: true }
    );
    var list = m.el.querySelector('#sList');
    function readCards() {
      C.$$('.slot-card', list).forEach(function (card) {
        var i = +card.getAttribute('data-i');
        C.$$('[data-k]', card).forEach(function (inp) { work[i][inp.getAttribute('data-k')] = inp.value.trim(); });
      });
    }
    function draw() {
      list.innerHTML = work.map(lessonCard).join('');
      C.$$('[data-rm]', list).forEach(function (b) {
        b.onclick = function () {
          readCards();
          work.splice(+b.closest('.slot-card').getAttribute('data-i'), 1);
          draw();
        };
      });
    }
    draw();
    m.el.querySelector('#sAdd').onclick = function () {
      readCards();
      var base = work[0] || {};
      work.push({ subject: base.subject || '', teacher: '', group: '', room: '', note: '' });
      draw();
      var cards = C.$$('.slot-card', list);
      var last = cards[cards.length - 1];
      last.scrollIntoView({ block: 'nearest' });
      last.querySelector('[data-k="teacher"]').focus();
    };
    function removeRange(d, f, n) {
      draft.lessons = draft.lessons.filter(function (l) { return !(l.day === d && l.period >= f && l.period < f + n); });
    }
    function refocus(d, p) {
      // Хүснэгт дахин зурагдсан тул гарнаас ажиллаж буй хэрэглэгчийн фокусыг тухайн нүдэнд буцаана
      setTimeout(function () {
        var c = C.$('#editGrid [data-day="' + d + '"][data-period="' + p + '"]');
        if (c) c.focus();
      }, 0);
    }
    var clr = m.el.querySelector('#sClear');
    if (clr) clr.onclick = function () {
      removeRange(day, from, len0);
      setDirty(true);
      renderGrid();
      m.close();
      refocus(day, from);
    };
    m.el.querySelector('#sOk').onclick = function () {
      readCards();
      var keep = work.filter(function (l) { return l.subject || l.teacher; });
      var d = +m.el.querySelector('#sDay').value, f = +m.el.querySelector('#sPer').value, n = +m.el.querySelector('#sLen').value;
      var pmap = pm();
      for (var k = 0; k < n; k++) {
        if (!pmap[f + k]) { m.el.querySelector('#sErr').textContent = (f + k) + '-р цаг хонхны цагт байхгүй байна. Эхлээд «Хонхны цаг» хэсэгт нэмнэ үү.'; return; }
      }
      if (existed) removeRange(day, from, len0);
      removeRange(d, f, n);
      for (k = 0; k < n; k++) {
        keep.forEach(function (l) {
          draft.lessons.push({ id: uid(), day: d, period: f + k, subject: l.subject, teacher: l.teacher, group: l.group, room: l.room, note: l.note });
        });
      }
      setDirty(true);
      renderGrid();
      m.close();
      refocus(d, f);
    };
  }

  C.$('#addLessonBtn').onclick = function () {
    var used = {};
    draft.lessons.forEach(function (l) { used[l.day + ':' + l.period] = 1; });
    var first = null;
    [1, 2, 3, 4, 5].some(function (d) {
      return draft.periods.some(function (p) { if (!used[d + ':' + p.n]) { first = [d, p.n]; return true; } return false; });
    });
    first = first || [1, 1];
    openSlot(first[0], first[1], first[1]);
  };

  /* ================= Ангийн мэдээлэл ================= */
  var infoFields = { fClass: 'className', fSchool: 'school', fTerm: 'term' };
  function renderInfo() {
    Object.keys(infoFields).forEach(function (id) { C.$('#' + id).value = draft[infoFields[id]] || ''; });
    C.$('#fTeacher').value = draft.homeroom.teacher || '';
    C.$('#fRoom').value = draft.homeroom.room || '';
  }
  Object.keys(infoFields).forEach(function (id) {
    C.$('#' + id).addEventListener('input', function () { draft[infoFields[id]] = this.value; setDirty(true); });
  });
  C.$('#fTeacher').addEventListener('input', function () { draft.homeroom.teacher = this.value; setDirty(true); });
  C.$('#fRoom').addEventListener('input', function () { draft.homeroom.room = this.value; setDirty(true); });

  /* ================= Хонхны цаг ================= */
  function renderPeriods() {
    var t = C.$('#periodsTable');
    t.innerHTML = draft.periods.map(function (p, i) {
      return '<tr><td>' + p.n + '-р цаг</td>' +
        '<td><input class="input" type="time" data-i="' + i + '" data-k="start" value="' + C.esc(p.start) + '" aria-label="' + p.n + '-р цаг эхлэх"></td>' +
        '<td><input class="input" type="time" data-i="' + i + '" data-k="end" value="' + C.esc(p.end) + '" aria-label="' + p.n + '-р цаг дуусах"></td></tr>';
    }).join('');
    C.$$('input', t).forEach(function (inp) {
      inp.addEventListener('change', function () {
        if (!/^\d{2}:\d{2}$/.test(inp.value)) return;
        draft.periods[+inp.getAttribute('data-i')][inp.getAttribute('data-k')] = inp.value;
        setDirty(true);
        renderGrid();
      });
    });
  }
  C.$('#addPeriod').onclick = function () {
    var last = draft.periods[draft.periods.length - 1];
    if (last && last.n >= 20) return C.toast('Хамгийн ихдээ 20 цаг', 'error');
    var s = last ? C.toMin(last.end) + 5 : 480;
    var f = function (m) { return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
    draft.periods.push({ n: last ? last.n + 1 : 1, start: f(s), end: f(s + 40) });
    setDirty(true);
    renderPeriods();
    renderGrid();
  };
  C.$('#removePeriod').onclick = function () {
    var last = draft.periods[draft.periods.length - 1];
    if (!last || draft.periods.length <= 1) return;
    var n = draft.lessons.filter(function (l) { return l.period === last.n; }).length;
    var go = function () {
      draft.periods.pop();
      draft.lessons = draft.lessons.filter(function (l) { return l.period !== last.n; });
      setDirty(true);
      renderPeriods();
      renderGrid();
    };
    if (n) C.confirm({ title: last.n + '-р цагийг хасах уу?', text: 'Энэ цагт байгаа ' + n + ' хичээл хамт устна.', ok: 'Хасах', danger: true }).then(function (y) { if (y) go(); });
    else go();
  };

  /* ================= Хадгалах ================= */
  function applySaved(s) {
    saved = s;
    draft = clone(s);
    setDirty(false);
    renderAll();
  }
  function save() {
    var btn = C.$('#saveBtn');
    btn.disabled = true;
    return C.api('schedule_save', { body: { schedule: draft } })
      .then(function (r) { applySaved(r.schedule); C.toast('Хуваарь хадгалагдлаа'); })
      .catch(function (e) { C.toast(e.message, 'error'); })
      .then(function () { btn.disabled = false; });
  }
  C.$('#saveBtn').onclick = save;
  C.$('#discardBtn').onclick = function () {
    C.confirm({ title: 'Өөрчлөлтийг буцаах уу?', text: 'Хадгалаагүй бүх өөрчлөлт алга болно.', ok: 'Буцаах', danger: true }).then(function (y) {
      if (y) applySaved(saved);
    });
  };
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && dirty) { e.preventDefault(); save(); }
  });

  /* ================= Устгах, нөөц, экспорт ================= */
  C.$('#clearBtn').onclick = function () {
    C.confirm({
      title: 'Хуваарийг бүхэлд нь устгах уу?',
      text: 'Бүх хичээл устна. Устгахаас өмнө нөөц хадгалагдах тул «Нөөц» хэсгээс сэргээх боломжтой.',
      ok: 'Устгах', danger: true,
    }).then(function (y) {
      if (!y) return;
      C.api('schedule_clear', { body: {} })
        .then(function (r) { applySaved(r.schedule); C.toast('Хуваарь устгагдлаа. Шинэ хуваариа «Хуваарь оруулах»-аар оруулна уу.'); })
        .catch(function (e) { C.toast(e.message, 'error'); });
    });
  };

  C.$('#backupsBtn').onclick = function () {
    var m = C.openModal('<h3>Хуваарийн нөөц</h3><p class="lead">Хадгалах, устгах бүрт өмнөх хувилбар автоматаар нөөцлөгддөг (сүүлийн 40).</p><div class="backup-list" id="bkList"><div class="spinner dark"></div></div><div class="actions"><button class="btn btn-ghost" data-close>Хаах</button></div>', { wide: true });
    C.api('schedule_backups').then(function (r) {
      var box = m.el.querySelector('#bkList');
      if (!r.backups.length) { box.innerHTML = '<div class="hint">Нөөц алга байна.</div>'; return; }
      box.innerHTML = r.backups.map(function (b) {
        return '<div class="backup-row"><span>' + C.fmtDate(b.time) + '<br><small>' + C.esc(b.className || '') + ' · ' + b.lessons + ' хичээл</small></span>' +
          '<button class="btn btn-ghost btn-sm" data-n="' + C.esc(b.name) + '">' + C.icon('refresh', 'i-sm') + 'Сэргээх</button></div>';
      }).join('');
      C.$$('[data-n]', box).forEach(function (b) {
        b.onclick = function () {
          C.confirm({ title: 'Энэ нөөцийг сэргээх үү?', text: 'Одоогийн хуваарь мөн нөөцлөгдөнө.', ok: 'Сэргээх' }).then(function (y) {
            if (!y) return;
            C.api('schedule_restore', { body: { name: b.getAttribute('data-n') } })
              .then(function (r) { applySaved(r.schedule); m.close(); C.toast('Нөөцөөс сэргээлээ'); })
              .catch(function (e) { C.toast(e.message, 'error'); });
          });
        };
      });
    }).catch(function (e) { m.el.querySelector('#bkList').innerHTML = '<div class="err">' + C.esc(e.message) + '</div>'; });
  };

  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function fname(ext) { return 'huvaari-' + (draft.className || 'angi').replace(/[^0-9A-Za-z-]/g, '') + '.' + ext; }
  C.$('#exportJson').onclick = function () { download(fname('json'), JSON.stringify(draft, null, 2), 'application/json'); };
  C.$('#exportCsv').onclick = function () { download(fname('csv'), C.scheduleToCsv(draft), 'text/csv;charset=utf-8'); };

  /* ================= Хуваарь оруулах (PDF / JSON / CSV) ================= */
  C.$('#importBtn').onclick = function () {
    var m = C.openModal(
      '<div class="modal-icon">' + C.icon('upload', 'i-lg') + '</div>' +
      '<h3>Хуваарь оруулах</h3>' +
      '<p class="lead">Сургуулийн PDF хуваарь оруулбал зөвхөн таны ангийн хичээлүүдийг автоматаар ялгаж авна. Мөн өмнө нь татаж авсан JSON эсвэл CSV (Excel) файл оруулж болно.</p>' +
      '<div class="grid-2">' +
      '<div class="field"><label for="iClass">Анги</label><input class="input" id="iClass" maxlength="20" value="' + C.esc(draft.className || '12-2') + '"></div>' +
      '<div class="field"><label>&nbsp;</label><label class="check" style="margin:8px 0 0"><input type="checkbox" id="iGrade" checked><span>Түвшний нийтлэг хичээлүүд</span></label></div>' +
      '</div>' +
      '<p class="hint" style="margin:-6px 0 12px">Түвшний нийтлэг: англи хэлний 12A/12B бүлэг, хятад хэлний HSK бүлэг, «12 сонгон» г.м.</p>' +
      '<div class="dropzone" id="iDrop" tabindex="0" role="button">' + C.icon('file') + 'PDF, JSON эсвэл CSV файл сонгох<small>эсвэл энд чирж оруулна уу</small></div>' +
      '<label class="check"><input type="checkbox" id="iKeepPdf" checked><span>PDF-г нүүр хуудсанд «эх хуваарь» болгон хадгалах</span></label>' +
      '<div class="err" id="iErr"></div>' +
      '<div id="iPreview"></div>' +
      '<div class="actions"><button class="btn btn-ghost" data-close>Цуцлах</button><button class="btn btn-primary" id="iApply" disabled>' + C.icon('check', 'i-sm') + 'Хуваарийг солих</button></div>',
      { wide: true }
    );
    var drop = m.el.querySelector('#iDrop'), err = m.el.querySelector('#iErr'), prev = m.el.querySelector('#iPreview'), apply = m.el.querySelector('#iApply');
    var result = null, pdfFile = null, lastFile = null;

    function pick() {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.pdf,.json,.csv,.txt,application/pdf,application/json,text/csv';
      inp.onchange = function () { if (inp.files[0]) handle(inp.files[0]); };
      inp.click();
    }
    drop.onclick = pick;
    drop.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
    m.el.querySelector('#iGrade').onchange = function () { if (lastFile && pdfFile) handle(lastFile); };
    m.el.querySelector('#iClass').onchange = function () { if (lastFile && pdfFile) handle(lastFile); };

    function handle(file) {
      lastFile = file;
      err.textContent = '';
      prev.innerHTML = '<div style="display:flex;gap:10px;align-items:center;font-weight:700;color:var(--ink-3)"><span class="spinner dark"></span>Уншиж байна…</div>';
      apply.disabled = true;
      result = null;
      pdfFile = null;
      var ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
      ext = ext ? ext.toLowerCase() : '';
      var className = m.el.querySelector('#iClass').value.trim() || draft.className;
      var p;
      if (ext === 'pdf' || file.type === 'application/pdf') {
        pdfFile = file;
        if (!C.parseClassName(className)) { prev.innerHTML = ''; err.textContent = 'Ангийн нэрийг «12-2» хэлбэрээр оруулна уу'; return; }
        p = file.arrayBuffer().then(function (buf) {
          return C.parseSchedulePdf(buf, { className: className, includeGrade: m.el.querySelector('#iGrade').checked, current: saved });
        }).then(function (r) {
          var next = clone(draft);
          next.className = className;
          next.lessons = r.lessons;
          if (r.periods.length >= 3) next.periods = r.periods;
          if (r.homeroom) next.homeroom = { teacher: r.homeroom.teacher || next.homeroom.teacher, room: r.homeroom.room || next.homeroom.room };
          if (r.school) next.school = r.school;
          if (r.term) next.term = r.term;
          next.source = { file: file.name, importedAt: new Date().toISOString() };
          return { sch: next, info: r };
        });
      } else if (ext === 'json') {
        p = file.text().then(function (t) {
          var d;
          try { d = JSON.parse(t.replace(/^\uFEFF/, '')); } catch (x) { throw new Error('JSON файл буруу бүтэцтэй байна'); }
          var next = clone(draft);
          if (Array.isArray(d)) next.lessons = d;
          else if (d && Array.isArray(d.lessons)) { next = Object.assign(next, d); }
          else throw new Error('JSON файлд «lessons» жагсаалт алга');
          next.source = { file: file.name, importedAt: new Date().toISOString() };
          return { sch: next };
        });
      } else if (ext === 'csv' || ext === 'txt') {
        p = file.text().then(function (t) {
          var r = C.scheduleFromCsv(t);
          var next = clone(draft);
          next.lessons = r.lessons;
          if (r.periods.length) {
            var map = C.periodMap(next);
            r.periods.forEach(function (x) { map[x.n] = x; });
            next.periods = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.n - b.n; });
          }
          next.source = { file: file.name, importedAt: new Date().toISOString() };
          return { sch: next };
        });
      } else {
        prev.innerHTML = '';
        err.textContent = 'Зөвхөн PDF, JSON, CSV файл оруулна';
        return;
      }
      p.then(function (res) {
        res.sch.lessons = (res.sch.lessons || []).map(function (l) {
          return { id: uid(), day: +l.day, period: +l.period, subject: String(l.subject || ''), teacher: String(l.teacher || ''), group: String(l.group || ''), room: String(l.room || ''), note: String(l.note || '') };
        }).filter(function (l) { return l.day >= 1 && l.day <= 7 && l.period >= 1 && (l.subject || l.teacher); });
        result = res;
        renderPreview(res);
        apply.disabled = !res.sch.lessons.length;
        if (!res.sch.lessons.length) err.textContent = className + ' ангийн хичээл олдсонгүй. Ангийн нэрээ шалгана уу.';
      }).catch(function (e) {
        prev.innerHTML = '';
        err.textContent = e.message || 'Файлыг уншиж чадсангүй';
      });
    }

    function renderPreview(res) {
      var s = res.sch, info = res.info;
      var slots = {};
      s.lessons.forEach(function (l) { slots[l.day + ':' + l.period] = 1; });
      var chips = '<div class="summary-chips">' +
        '<span class="chip">' + C.icon('book') + '<b>' + Object.keys(slots).length + '</b> цаг / 7 хоног</span>' +
        (info ? '<span class="chip">' + C.icon('check') + C.esc(s.className) + ': <b>' + info.stats.own + '</b></span><span class="chip">' + C.icon('user') + 'Нийтлэг: <b>' + info.stats.grade + '</b></span>' : '<span class="chip">' + C.icon('check') + '<b>' + s.lessons.length + '</b> мөр</span>') +
        (s.homeroom && s.homeroom.teacher ? '<span class="chip">' + C.icon('user') + 'Даасан: <b>' + C.esc(s.homeroom.teacher) + '</b></span>' : '') +
        (s.term ? '<span class="chip">' + C.icon('calendar') + C.esc(s.term) + '</span>' : '') +
        '</div>';
      var byDay = {};
      s.lessons.forEach(function (l) { (byDay[l.day] = byDay[l.day] || []).push(l); });
      var body = Object.keys(byDay).sort().map(function (d) {
        return '<div class="preview-day"><h4>' + C.DAYS[d] + '</h4>' + byDay[d].sort(function (a, b) { return a.period - b.period; }).map(function (l) {
          return '<div class="preview-row"><b>' + l.period + '-р</b><span>' + C.esc(l.subject) + (l.group ? ' <span class="gtag">' + C.esc(l.group) + '</span>' : '') + ' · ' + C.esc(l.teacher) + (l.note ? ' · ' + C.esc(l.note) : '') + '</span></div>';
        }).join('') + '</div>';
      }).join('');
      var warn = info && info.warnings.length ? '<p class="hint" style="color:var(--warn)">' + info.warnings.map(C.esc).join('<br>') + '</p>' : '';
      prev.innerHTML = chips + warn + (body ? '<div class="preview-box">' + body + '</div>' : '');
    }

    apply.onclick = function () {
      if (!result) return;
      apply.disabled = true;
      apply.innerHTML = '<span class="spinner"></span>Хадгалж байна…';
      var keepPdf = pdfFile && m.el.querySelector('#iKeepPdf').checked;
      C.api('schedule_save', { body: { schedule: result.sch } })
        .then(function (r) {
          applySaved(r.schedule);
          if (!keepPdf) return;
          return C.api('schedule_pdf', { raw: pdfFile, type: 'application/pdf' }).then(function (x) { pdfInfo = x.pdf; renderPdf(); });
        })
        .then(function () { m.close(); C.toast('Шинэ хуваарь хадгалагдлаа'); })
        .catch(function (e) {
          err.textContent = e.message;
          apply.disabled = false;
          apply.innerHTML = C.icon('check', 'i-sm') + 'Хуваарийг солих';
        });
    };
  };

  /* ================= Эх PDF ================= */
  function renderPdf() {
    var box = C.$('#pdfBox');
    box.innerHTML = (pdfInfo
      ? '<div class="backup-row" style="margin-bottom:12px"><span>' + C.icon('file', 'i-sm') + ' schedule.pdf<br><small>' + C.fmtBytes(pdfInfo.size) + ' · ' + C.fmtDate(pdfInfo.time) + '</small></span>' +
        '<a class="btn btn-ghost btn-sm" href="' + C.esc(pdfInfo.url) + '" target="_blank" rel="noopener">Нээх</a></div>'
      : '<p class="hint">PDF оруулаагүй байна.</p>') +
      '<div class="toolbar"><button class="btn btn-ghost btn-sm" id="pdfUp">' + C.icon('upload', 'i-sm') + (pdfInfo ? 'Солих' : 'PDF оруулах') + '</button>' +
      (pdfInfo ? '<button class="btn btn-danger-ghost btn-sm" id="pdfDel">' + C.icon('trash', 'i-sm') + 'Устгах</button>' : '') + '</div>';
    box.querySelector('#pdfUp').onclick = function () {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'application/pdf,.pdf';
      inp.onchange = function () {
        var f = inp.files[0];
        if (!f) return;
        C.api('schedule_pdf', { raw: f, type: 'application/pdf' })
          .then(function (r) { pdfInfo = r.pdf; renderPdf(); C.toast('PDF хадгалагдлаа'); })
          .catch(function (e) { C.toast(e.message, 'error'); });
      };
      inp.click();
    };
    var del = box.querySelector('#pdfDel');
    if (del) del.onclick = function () {
      C.confirm({ title: 'PDF-г устгах уу?', ok: 'Устгах', danger: true }).then(function (y) {
        if (!y) return;
        C.api('schedule_pdf_delete', { body: {} }).then(function () { pdfInfo = null; renderPdf(); C.toast('PDF устгагдлаа'); }).catch(function (e) { C.toast(e.message, 'error'); });
      });
    };
  }

  /* ================= Зургийн сан ================= */
  function renderStorage() {
    var s = C.state;
    var box = C.$('#storageBox');
    var pct = s.quota ? Math.min(100, (s.used / s.quota) * 100) : 0;
    box.innerHTML =
      '<div class="stat-row">' +
      '<div class="stat"><small>Ашигласан</small><b>' + C.fmtBytes(s.used) + '</b></div>' +
      '<div class="stat"><small>Хязгаар</small><b>' + C.fmtBytes(s.quota) + '</b></div>' +
      '<div class="stat"><small>Серверийн сул зай</small><b>' + (s.free != null ? C.fmtBytes(s.free) : '—') + '</b></div>' +
      '</div>' +
      '<div class="meter"><i style="width:' + pct.toFixed(2) + '%"></i></div>' +
      '<p class="hint">' + pct.toFixed(1) + '% ашигласан. Байршуулалт нэг удаад ' + C.fmtBytes(s.chunkMax) + ' хэсгээр явна (Cloudflare-ийн 100 МБ хязгаараас бага).</p>' +
      '<form id="quotaForm" class="toolbar" style="margin-top:10px" novalidate>' +
      '<div class="field" style="margin:0;flex:1;min-width:160px"><label for="quotaGb">Нийт багтаамж (ГБ)</label><input class="input" id="quotaGb" type="number" min="1" max="100000" step="1" value="' + Math.round(s.quota / 1073741824) + '"></div>' +
      '<button class="btn btn-ghost" type="submit" style="align-self:flex-end">' + C.icon('save', 'i-sm') + 'Хадгалах</button></form>';
    box.querySelector('#quotaForm').onsubmit = function (e) {
      e.preventDefault();
      C.api('settings', { body: { quotaGb: +box.querySelector('#quotaGb').value } })
        .then(function (r) { C.applyStatus(r); renderStorage(); C.toast('Багтаамж хадгалагдлаа'); })
        .catch(function (ex) { C.toast(ex.message, 'error'); });
    };
  }

  /* ================= Цомгийн 4 оронтой код ================= */
  C.$('#albumPinHint').textContent += boot.albumPinCustom ? '' : ' Одоогийн код: анхдагч (4200).';
  C.$('#pinNew').addEventListener('input', function () { this.value = this.value.replace(/\D+/g, '').slice(0, 4); });
  C.$('#pinForm').onsubmit = function (e) {
    e.preventDefault();
    var err = C.$('#pinErr'), v = C.$('#pinNew').value;
    err.textContent = '';
    if (!/^\d{4}$/.test(v)) { err.textContent = 'Яг 4 оронтой тоо оруулна уу'; return; }
    C.confirm({ title: 'Цомгийн кодыг солих уу?', text: 'Бүх хүн цомгоос гарч, шинэ кодоор дахин нэвтэрнэ.', ok: 'Солих', icon: 'lock' }).then(function (y) {
      if (!y) return;
      C.api('album_pin', { body: { pin: v } })
        .then(function (r) {
          C.applyStatus(r);
          C.$('#pinForm').reset();
          C.$('#albumPinHint').textContent = C.$('#albumPinHint').textContent.replace(' Одоогийн код: анхдагч (4200).', '');
          C.toast('Цомгийн код солигдлоо');
        })
        .catch(function (ex) { err.textContent = ex.message; });
    });
  };

  /* ================= Хуучин зургийн жижиг хувилбар ================= */
  var tool = { running: false, stop: false };
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function renderThumbTool() {
    var box = C.$('#thumbTool');
    if (!box || tool.running) return;
    box.innerHTML = '<h3>' + C.icon('images', 'i-sm') + 'Хуучин зургийн жижиг хувилбар</h3><p class="hint" id="tmHint">Шалгаж байна…</p>';
    C.api('media', { query: { missing: 1, limit: 1 } }).then(function (d) {
      var n = d.total;
      if (!n) {
        box.innerHTML = '<h3>' + C.icon('check', 'i-sm') + 'Бүх зураг, видео жижиг хувилбартай</h3><p class="hint">Цомог хурдан ачаална.</p>';
        return;
      }
      box.innerHTML = '<h3>' + C.icon('images', 'i-sm') + 'Хуучин зургийн жижиг хувилбар</h3>' +
        '<p class="hint"><b>' + n + '</b> файлд жижиг хувилбар (preview) алга. Эдгээр нь цомогт удаан ачаалдаг. ' +
        (C.state.gd ? 'Зургийг сервер, видеог энэ хөтөч үүсгэнэ.' : 'Сервер дээр GD алга тул бүгдийг энэ хөтөч үүсгэнэ (удаан байж болно).') +
        ' Дуустал хуудсаа хаалгүй байна уу.</p>' +
        '<div class="meter" id="tmMeter" hidden><i></i></div><p class="hint" id="tmText"></p>' +
        '<div class="toolbar"><button class="btn btn-primary btn-sm" id="tmStart">' + C.icon('refresh', 'i-sm') + 'Бүгдийг үүсгэх</button>' +
        '<button class="btn btn-ghost btn-sm" id="tmStop" hidden>Зогсоох</button></div>';
      box.querySelector('#tmStart').onclick = runThumbTool;
      box.querySelector('#tmStop').onclick = function () { tool.stop = true; this.disabled = true; };
    }).catch(function (e) { box.querySelector('#tmHint').textContent = e.message; });
  }

  async function runThumbTool() {
    var box = C.$('#thumbTool');
    var meter = box.querySelector('#tmMeter'), text = box.querySelector('#tmText');
    tool.running = true;
    tool.stop = false;
    box.querySelector('#tmStart').hidden = true;
    box.querySelector('#tmStop').hidden = false;
    meter.hidden = false;
    text.textContent = 'Жагсаалт бэлтгэж байна…';
    var list = [];
    try {
      for (var off = 0; ; ) {
        var d = await C.api('media', { query: { missing: 1, offset: off, limit: 200 } });
        list = list.concat(d.items);
        off += d.items.length;
        if (!d.items.length || off >= d.total) break;
      }
    } catch (e) { text.textContent = e.message; tool.running = false; return; }
    var total = list.length, done = 0, failed = 0, serverBusy = 0;
    var serverQ = C.state.gd ? list.filter(function (i) { return i.type === 'image'; }) : [];
    var browserQ = list.filter(function (i) { return serverQ.indexOf(i) < 0; });
    function update() {
      meter.querySelector('i').style.width = (total ? ((done + failed) / total) * 100 : 100).toFixed(1) + '%';
      text.textContent = done + ' / ' + total + ' бэлэн' + (failed ? ' · ' + failed + ' үүсгэх боломжгүй (жишээ нь HEIC)' : '');
    }
    async function serverWorker() {
      while (serverQ.length && !tool.stop) {
        var it = serverQ.shift();
        serverBusy++;
        try {
          var r = await C.api('thumb_gen', { body: { name: it.name } });
          if (r.done) done++; else browserQ.push(it);   // сервер чадахгүй бол хөтөч оролдоно
        } catch (e) { browserQ.push(it); }
        serverBusy--;
        update();
      }
    }
    async function browserWorker() {
      while (!tool.stop && (browserQ.length || serverQ.length || serverBusy)) {
        if (!browserQ.length) { await sleep(300); continue; }
        var it = browserQ.shift();
        try {
          var th = await C.makeThumb(it.url, it.type);
          if (th) { await C.uploadThumb(it.name, th); done++; } else failed++;
        } catch (e) { failed++; }
        update();
      }
    }
    update();
    await Promise.all([serverWorker(), serverWorker(), browserWorker(), browserWorker()]);
    tool.running = false;
    C.toast(tool.stop ? 'Зогсоолоо — дахин дарвал үлдсэнээс нь үргэлжилнэ' : done + ' файлын жижиг хувилбар бэлэн боллоо');
    renderThumbTool();
  }

  /* ================= Нууц үг ================= */
  C.$('#pwForm').onsubmit = function (e) {
    e.preventDefault();
    var err = C.$('#pwErr');
    var cur = C.$('#pwCur').value, n1 = C.$('#pwNew').value, n2 = C.$('#pwNew2').value;
    err.textContent = '';
    if (n1.length < C.MIN_PASSWORD) { err.textContent = 'Шинэ нууц үг хамгийн багадаа ' + C.MIN_PASSWORD + ' тэмдэгт байх ёстой'; return; }
    if (n1 !== n2) { err.textContent = 'Шинэ нууц үг таарахгүй байна'; return; }
    C.api('password', { body: { current: cur, next: n1 } })
      .then(function (r) {
        C.applyStatus(r);
        C.$('#pwForm').reset();
        C.toast('Нууц үг солигдлоо');
      })
      .catch(function (ex) { err.textContent = ex.message; });
  };

  function renderAll() {
    renderGrid();
    renderInfo();
    renderPeriods();
  }
  renderAll();
  renderPdf();
  if (location.hash === '#schedule') setTimeout(function () { C.$('#schedule').scrollIntoView(); }, 50);

  /* ================= FlashCards word lists ================= */
  (function () {
    var sel = document.getElementById('fcAdminDeck'); if (!sel) return;
    var text = document.getElementById('fcAdminText'), status = document.getElementById('fcAdminStatus'), err = document.getElementById('fcAdminError'), countEl = document.getElementById('fcAdminCount');
    var decks = [], cache = {};
    function cardLine(c) { return c.p ? c.f + ' | ' + c.p + ' | ' + c.b : c.f + ' | ' + c.b; }
    function parseLines(raw) {
      var cards = [];
      raw.split(/\r?\n/).forEach(function (line) {
        if (!line.trim()) return;
        var parts = line.split(line.indexOf('|') >= 0 ? '|' : '\t').map(function (p) { return p.trim(); });
        if (parts.length >= 3) { if (parts[0] && parts[2]) cards.push({ f: parts[0], p: parts[1], b: parts[2] }); }
        else if (parts.length === 2) { if (parts[0] && parts[1]) cards.push({ f: parts[0], b: parts[1] }); }
      });
      return cards;
    }
    function showDeck(key) {
      var d = null; decks.forEach(function (x) { if (x.key === key) d = x; });
      if (!d) return;
      text.value = (cache[key] || d.cards || []).map(cardLine).join('\n');
      countEl.textContent = (d.count || 0) + ' үг';
    }
    function load() {
      C.api('flashcards_get').then(function (data) {
        decks = data.decks || [];
        sel.innerHTML = decks.map(function (d) { return '<option value="' + C.esc(d.key) + '">' + C.esc(d.label) + '</option>'; }).join('');
        showDeck(sel.value || (decks[0] && decks[0].key));
      }).catch(function (e) { err.textContent = e.message; });
    }
    sel.onchange = function () { showDeck(this.value); };
    document.getElementById('fcAdminSave').onclick = function () {
      err.textContent = ''; status.textContent = 'Хадгалж байна…';
      var key = sel.value, cards = parseLines(text.value);
      cache[key] = cards;
      C.api('flashcards_save', { body: { deck: key, cards: cards } }).then(function (r) {
        status.textContent = r.count + ' үг хадгалагдлаа ✓';
        decks.forEach(function (d) { if (d.key === key) { d.count = r.count; d.cards = cards; } });
        countEl.textContent = r.count + ' үг';
        if (C.toast) C.toast('FlashCards багц хадгалагдлаа');
      }).catch(function (e) { status.textContent = ''; err.textContent = e.message; });
    };
    load();
  })();
})();

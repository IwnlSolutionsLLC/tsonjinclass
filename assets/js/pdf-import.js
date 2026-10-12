/*
 * Хуваарь импортлох: сургуулийн PDF (багш × өдөр/цаг хүснэгт), JSON, CSV.
 * PDF-ийг хөтөч дээр pdf.js-ээр уншиж, текстийн байрлалаар нь хүснэгтийг сэргээнэ.
 * Зөвхөн тухайн анги (жишээ нь 12-2) болон тэр түвшний нийтлэг (12A, 12 HSK1, 11-12, 12 сонгон)
 * хичээлүүдийг авна.
 */
(function () {
  'use strict';
  var C = window.C122;
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var DAYN = { 'даваа': 1, 'мягмар': 2, 'лхагва': 3, 'пүрэв': 4, 'баасан': 5, 'бямба': 6, 'ням': 7 };

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
        res(window.pdfjsLib);
      };
      s.onerror = function () { rej(new Error('PDF уншигч ачаалж чадсангүй. Интернэт холболтоо шалгана уу.')); };
      document.head.appendChild(s);
    });
  }

  function median(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    return s[Math.floor(s.length / 2)];
  }

  function cluster(arr, key, tol) {
    var s = arr.slice().sort(function (a, b) { return key(a) - key(b); });
    var groups = [];
    s.forEach(function (it) {
      var g = groups[groups.length - 1];
      if (g && key(it) - g.last <= tol) { g.items.push(it); g.last = key(it); }
      else groups.push({ items: [it], last: key(it) });
    });
    return groups.map(function (g) { return g.items; });
  }

  function nearest(arr, v, key) {
    var best = null, bd = Infinity;
    arr.forEach(function (a) { var d = Math.abs(key(a) - v); if (d < bd) { bd = d; best = a; } });
    return best;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }
  function sentence(s) { s = String(s || '').trim().toLowerCase(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function titleWords(s) { return String(s || '').toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function tidy(t) { return String(t).replace(/\s*,\s*/g, ',').replace(/,+$/, '').replace(/\s+/g, ' ').trim(); }

  /* "12-2" -> { grade: '12', section: '2' } */
  C.parseClassName = function (cn) {
    var m = /^\s*(\d{1,2})\s*[-\/.–]?\s*([0-9A-Za-zА-Яа-яӨөҮүЁё]{1,3})\s*$/.exec(cn || '');
    return m ? { grade: m[1], section: m[2] } : null;
  };
  function normClass(s) { return String(s || '').toUpperCase().replace(/\s+/g, '').replace(/[\/.–]/g, '-'); }

  /* Нүдний текстийг ангилна: өөрийн анги / тухайн түвшний нийтлэг / хамааралгүй */
  C.classifyCell = function (text, cls) {
    var t = String(text).replace(/\s+/g, ' ').trim();
    var G = cls.grade, S = cls.section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var sep = /^\d+$/.test(cls.section) ? '\\s*[\\/\\-–.]\\s*' : '\\s*[\\/\\-–.]?\\s*';
    var own = new RegExp('(^|[^\\d])' + G + sep + S + '(?![\\dA-Za-zА-Яа-яӨөҮү])', 'i');
    if (own.test(t)) return { kind: 'class', note: tidy(t.replace(own, '$1')) };
    var other = new RegExp('(^|[^\\d\\-–])' + G + '\\s*[\\/\\-–.]\\s*\\d{1,2}(?!\\d)');
    if (other.test(t)) return null;
    var rng = new RegExp('(^|[^\\d])(\\d{1,2})\\s*[-–]\\s*' + G + '(?![\\d\\/])');
    var m = rng.exec(t);
    if (m && +m[2] < +G) return { kind: 'grade', group: tidy(t) };
    var only = new RegExp('(^|[^\\d\\/\\-–.])' + G + '(?![\\d\\/\\-–.])');
    if (only.test(t)) return { kind: 'grade', group: tidy(t) };
    return null;
  };

  var DEPT = [
    [/мазан|математ/i, 'Математик'],
    [/програм|график|дизайн|мэдээлэл/i, 'Програм хангамж, график дизайн'],
    [/англи/i, 'Англи хэл'],
    [/хятад/i, 'Хятад хэл'],
    [/солонгос/i, 'Солонгос хэл'],
    [/япон/i, 'Япон хэл'],
    [/орос/i, 'Орос хэл'],
    [/бузан|байгал/i, 'Байгалийн ухаан'],
    [/нузан|нийгм/i, 'Нийгмийн ухаан'],
    [/сэтгэл/i, 'Сэтгэл зүй'],
    [/монгол|уран зохиол|хэл бичиг/i, 'Монгол хэл, уран зохиол'],
    [/биеийн|спорт/i, 'Биеийн тамир'],
    [/урлаг|хөгжим/i, 'Урлаг'],
  ];
  C.deptSubject = function (label) {
    for (var i = 0; i < DEPT.length; i++) if (DEPT[i][0].test(label || '')) return DEPT[i][1];
    return sentence(label) || 'Хичээл';
  };

  /* Одоогийн хуваарьт багш бүр ямар хичээл заадаг вэ (засварласан нэрийг хадгалахын тулд) */
  function teacherSubjects(sch) {
    var cnt = {};
    var base = (sch && sch.teacherSubjects && !Array.isArray(sch.teacherSubjects)) ? sch.teacherSubjects : {};
    ((sch && sch.lessons) || []).forEach(function (l) {
      if (!l.teacher || !l.subject || /сонгон/i.test(l.subject) || /^Багш #\d+$/.test(l.teacher)) return;
      var m = (cnt[l.teacher] = cnt[l.teacher] || {});
      m[l.subject] = (m[l.subject] || 0) + 1;
    });
    var out = {};
    Object.keys(base).forEach(function (t) { if (!/^Багш #\d+$/.test(t)) out[t] = base[t]; });
    Object.keys(cnt).forEach(function (t) {
      out[t] = Object.keys(cnt[t]).sort(function (a, b) { return cnt[t][b] - cnt[t][a]; })[0];
    });
    return out;
  }

  function pageItems(pdfjsLib, page) {
    var vp = page.getViewport({ scale: 1 });
    return page.getTextContent().then(function (tc) {
      var out = [];
      tc.items.forEach(function (it) {
        var s = String(it.str || '').replace(/\s+/g, ' ').trim();
        if (!s) return;
        var m = pdfjsLib.Util.transform(vp.transform, it.transform);
        var fh = Math.hypot(m[2], m[3]) || Math.hypot(m[0], m[1]) || 3;
        var rot = Math.abs(it.transform[1]) > 0.01 || Math.abs(it.transform[2]) > 0.01;
        var len = it.width || fh * s.length * 0.5;
        var x0, x1, y0, y1, cy;
        if (!rot) {
          x0 = m[4]; x1 = m[4] + len; y1 = m[5]; y0 = m[5] - fh;
          cy = m[5] - fh * 0.35;
        } else {
          var up = it.transform[1] > 0;
          x0 = up ? m[4] - fh : m[4]; x1 = up ? m[4] : m[4] + fh;
          y0 = up ? m[5] - len : m[5]; y1 = up ? m[5] : m[5] + len;
          cy = (y0 + y1) / 2;
        }
        out.push({ s: s, x0: x0, x1: x1, y0: y0, y1: y1, cx: (x0 + x1) / 2, cy: cy, h: fh, rot: rot });
      });
      return out;
    });
  }

  /* Нэг хуудсыг задлана. Хүснэгт олдохгүй бол null. */
  function parsePage(items, cls, opts, known) {
    var res = { lessons: [], periods: {}, homeroom: null, school: '', term: '', warnings: [] };

    // 1) Цагийн дугаарын мөр: 1 2 3 … 14 1 2 3 … (өдөр бүрээр давтагдана)
    var ints = items.filter(function (i) { return !i.rot && /^\d{1,2}$/.test(i.s); });
    var header = null;
    cluster(ints, function (i) { return i.cy; }, 1.5).forEach(function (g) {
      if (g.length < 6) return;
      g.sort(function (a, b) { return a.cx - b.cx; });
      if (+g[0].s !== 1) return;
      var ok = 0;
      for (var k = 1; k < g.length; k++) {
        var a = +g[k - 1].s, b = +g[k].s;
        if (b === a + 1 || (b === 1 && a >= 3)) ok++;
      }
      if (ok / (g.length - 1) < 0.9) return;
      if (!header || g.length > header.length) header = g;
    });
    if (!header) return null;
    var headerY = header[0].cy;

    var cols = [], seg = 0, prev = 0;
    header.forEach(function (it) {
      var v = +it.s;
      if (v <= prev) seg++;
      prev = v;
      cols.push({ cx: it.cx, period: v, seg: seg });
    });
    cols.forEach(function (c, k) {
      var wl = k > 0 ? c.cx - cols[k - 1].cx : (cols[1] ? cols[1].cx - c.cx : 10);
      var wr = k < cols.length - 1 ? cols[k + 1].cx - c.cx : wl;
      c.left = c.cx - wl / 2;
      c.right = c.cx + wr / 2;
    });
    function colAt(x) {
      var c = nearest(cols, x, function (c) { return c.cx; });
      return c && x >= c.left - 0.8 && x <= c.right + 0.8 ? c : null;
    }

    // 2) Өдрийн нэрс (Даваа, Мягмар …) — хэсэг бүрийн дээр
    var heads = items.filter(function (i) {
      return i.cy < headerY && DAYN[i.s.toLowerCase().replace(/[^а-яөүё]/g, '')];
    });
    for (var sIdx = 0; sIdx <= seg; sIdx++) {
      var sc = cols.filter(function (c) { return c.seg === sIdx; });
      var L = sc[0].left, R = sc[sc.length - 1].right;
      var hd = heads.filter(function (h) { return h.cx >= L && h.cx <= R; })[0];
      var day = hd ? DAYN[hd.s.toLowerCase().replace(/[^а-яөүё]/g, '')] : sIdx + 1;
      sc.forEach(function (c) { c.day = day; });
    }

    // 3) Хонхны цаг (08:00-08:40) — толгойн дээд хэсэгт
    var tre = /(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})/;
    items.forEach(function (i) {
      if (i.cy > headerY + 0.5) return;
      var m = tre.exec(i.s);
      if (!m) return;
      var c = colAt(i.cx);
      if (!c) return;
      if (!res.periods[c.period]) res.periods[c.period] = { n: c.period, start: pad2(m[1]) + ':' + m[2], end: pad2(m[3]) + ':' + m[4] };
    });

    // 4) Мөрийн дугаар (д/д) — хүснэгтийн хамгийн зүүн багана
    var firstLeft = cols[0].left;
    var leftInts = items.filter(function (i) { return !i.rot && /^\d{1,3}$/.test(i.s) && i.cx < firstLeft && i.cy > headerY + 0.5; });
    var xg = cluster(leftInts, function (i) { return i.cx; }, 3)
      .map(function (g) { return g.sort(function (a, b) { return a.cy - b.cy; }); })
      .filter(function (g) { return g.length >= 3; })
      .sort(function (a, b) { return a[0].cx - b[0].cx; });
    var rowNums = xg.filter(function (g) {
      var ok = 0;
      for (var k = 1; k < g.length; k++) if (+g[k].s === +g[k - 1].s + 1) ok++;
      return ok / (g.length - 1) >= 0.8;
    })[0];
    if (!rowNums) { res.warnings.push('Мөрийн дугаар (д/д) олдсонгүй'); return res; }
    var rows = rowNums.map(function (i) { return { n: +i.s, cy: i.cy, x: i.cx }; });
    var diffs = [];
    for (var k = 1; k < rows.length; k++) diffs.push(rows[k].cy - rows[k - 1].cy);
    var pitch = median(diffs) || 6;
    var lastRow = rows[rows.length - 1];

    // 5) Зүүн талын баганууд: нэгдэл, багш, даасан анги, танхим
    var hdrs = items.filter(function (i) { return i.cy < headerY + 0.5 && i.cx < firstLeft; });
    function hx(re) { var h = hdrs.filter(function (i) { return re.test(i.s.toLowerCase()); })[0]; return h ? h.cx : null; }
    var lc = [
      { k: 'num', x: rowNums[0].cx },
      { k: 'dept', x: hx(/нэгдэл|заах арга|тэнхим|секц/) },
      { k: 'teacher', x: hx(/багш/) },
      { k: 'homeroom', x: hx(/даасан/) },
      { k: 'room', x: hx(/танхим/) },
      { k: 'hours', x: hx(/нийт/) },
    ].filter(function (c) { return c.x != null; });
    var leftItems = items.filter(function (i) {
      return !i.rot && i.cx < firstLeft && i.cx > rowNums[0].cx + 1 && i.cy > headerY + 0.5 && i.cy < lastRow.cy + pitch * 0.9;
    });
    if (!lc.some(function (c) { return c.k === 'teacher'; })) {
      // Толгой олдсонгүй: хамгийн олон мөртэй текст баганыг багш гэж үзнэ
      var textCols = cluster(leftItems.filter(function (i) { return !/^\d+$/.test(i.s); }), function (i) { return i.cx; }, 6)
        .sort(function (a, b) { return b.length - a.length; });
      if (textCols[0]) lc.push({ k: 'teacher', x: median(textCols[0].map(function (i) { return i.cx; })) });
      res.warnings.push('«Багшийн нэрс» баганын толгой олдсонгүй — ойролцоогоор тодорхойллоо');
    }
    leftItems.forEach(function (i) { i.col = nearest(lc, i.cx, function (c) { return c.x; }).k; });
    function rowText(r, col) {
      return leftItems.filter(function (i) { return i.col === col && Math.abs(i.cy - r.cy) < pitch * 0.55; })
        .sort(function (a, b) { return a.cx - b.cx; }).map(function (i) { return i.s; }).join(' ').trim();
    }
    rows.forEach(function (r) {
      r.teacher = rowText(r, 'teacher');
      r.homeroom = rowText(r, 'homeroom');
      r.room = rowText(r, 'room');
      r.dept = '';
    });

    // Нэгдлийн нэр нь нэгтгэсэн (merged) нүдэнд, блокийнхоо голд байрладаг
    var deptItems = leftItems.filter(function (i) { return i.col === 'dept'; });
    var labels = cluster(deptItems, function (i) { return i.cy; }, 4).map(function (g) {
      g.sort(function (a, b) { return a.cy - b.cy || a.cx - b.cx; });
      return { text: g.map(function (i) { return i.s; }).join(' '), cy: (g[0].cy + g[g.length - 1].cy) / 2 };
    });
    var ri = 0;
    labels.forEach(function (lab) {
      if (ri >= rows.length) return;
      var a = ri, target = 2 * lab.cy - rows[a].cy, b = a;
      for (var k = a; k < rows.length; k++) if (Math.abs(rows[k].cy - target) < Math.abs(rows[b].cy - target)) b = k;
      for (k = a; k <= b; k++) rows[k].dept = lab.text;
      ri = b + 1;
    });

    // 6) Даасан анги
    rows.forEach(function (r) {
      if (!res.homeroom && r.homeroom && normClass(r.homeroom) === normClass(cls.grade + '-' + cls.section)) {
        res.homeroom = { teacher: r.teacher, room: r.room };
      }
    });

    // 7) Нүднүүд
    var cells = {};
    items.forEach(function (i) {
      if (i.rot || i.cy <= headerY + 0.5 || i.cy < rows[0].cy - pitch * 0.9 || i.cy > lastRow.cy + pitch * 0.9) return;
      var c = colAt(i.cx);
      if (!c) return;
      var r = nearest(rows, i.cy, function (r) { return r.cy; });
      if (!r || Math.abs(r.cy - i.cy) > pitch * 0.95) return;
      var key = r.n + ':' + c.day + ':' + c.period;
      (cells[key] = cells[key] || { row: r, col: c, parts: [] }).parts.push(i);
    });

    Object.keys(cells).forEach(function (key) {
      var cell = cells[key];
      var lineH = median(cell.parts.map(function (p) { return p.h; })) || 3;
      var text = cell.parts.slice().sort(function (a, b) {
        return Math.round(a.cy / (lineH * 0.6)) - Math.round(b.cy / (lineH * 0.6)) || a.cx - b.cx;
      }).map(function (p) { return p.s; }).join(' ');
      var cl = C.classifyCell(text, cls);
      if (!cl || (cl.kind === 'grade' && !opts.includeGrade)) return;
      var r = cell.row;
      var teacher = r.teacher || ('Багш #' + r.n);
      var base = known[teacher] || C.deptSubject(r.dept);
      var subject = base, group = '', note = '';
      if (cl.kind === 'class') {
        note = cl.note;
        if (/сонгон/i.test(note)) { subject = 'Сонгон хичээл'; group = base; note = tidy(note.replace(/сонгон/i, '')); }
      } else if (/сонгон/i.test(text)) {
        subject = 'Сонгон хичээл';
        group = base;
      } else {
        if (/hsk/i.test(text) && !/хятад/i.test(subject)) subject = 'Хятад хэл';
        if (/ielts/i.test(text)) subject = 'IELTS';
        group = cl.group;
      }
      res.lessons.push({
        day: cell.col.day, period: cell.col.period, subject: subject, teacher: teacher,
        group: group, room: '', note: note, kind: cl.kind,
      });
    });

    // 8) Гарчиг: сургууль, хичээлийн жил, улирал
    var top = items.filter(function (i) { return i.cy < headerY - pitch * 2 && !i.rot; });
    var lines = cluster(top, function (i) { return i.cy; }, 1.5).map(function (g) {
      return g.sort(function (a, b) { return a.cx - b.cx; }).map(function (i) { return i.s; }).join(' ');
    });
    lines.forEach(function (ln) {
      var sm = /^(.*?)\s*СУРГУУЛ/i.exec(ln);
      if (sm && !res.school && sm[1].trim()) res.school = titleWords(sm[1].trim()) + ' сургууль';
      var ym = /(\d{4})\s*[-–]\s*(\d{4})/.exec(ln);
      if (ym && !res.term) {
        var rm = /\b([IVX]{1,4})\s*УЛИР/i.exec(ln);
        res.term = ym[1] + '–' + ym[2] + ' оны хичээлийн жил' + (rm ? ' · ' + rm[1].toUpperCase() + ' улирал' : '');
      }
    });
    return res;
  }

  /* PDF -> { lessons, periods, homeroom, school, term, stats, warnings } */
  C.parseSchedulePdf = function (buf, opts) {
    opts = opts || {};
    var cls = C.parseClassName(opts.className || '12-2');
    if (!cls) return Promise.reject(new Error('Ангийн нэр буруу байна (жишээ нь 12-2)'));
    var known = teacherSubjects(opts.current);
    return loadPdfJs().then(function (pdfjsLib) {
      return pdfjsLib.getDocument({ data: buf }).promise.catch(function () {
        throw new Error('PDF файлыг уншиж чадсангүй (эвдэрсэн эсвэл нууц үгтэй байж магадгүй)');
      }).then(function (pdf) {
        var out = { lessons: [], periods: [], homeroom: null, school: '', term: '', warnings: [], pages: pdf.numPages, tables: 0 };
        var chain = Promise.resolve();
        var periods = {};
        for (var p = 1; p <= pdf.numPages; p++) {
          (function (pn) {
            chain = chain.then(function () {
              return pdf.getPage(pn).then(function (page) { return pageItems(pdfjsLib, page); }).then(function (items) {
                var r = parsePage(items, cls, { includeGrade: opts.includeGrade !== false }, known);
                if (!r) return;
                out.tables++;
                out.lessons = out.lessons.concat(r.lessons);
                Object.keys(r.periods).forEach(function (n) { if (!periods[n]) periods[n] = r.periods[n]; });
                if (!out.homeroom && r.homeroom) out.homeroom = r.homeroom;
                if (!out.school && r.school) out.school = r.school;
                if (!out.term && r.term) out.term = r.term;
                out.warnings = out.warnings.concat(r.warnings);
              });
            });
          })(p);
        }
        return chain.then(function () {
          if (!out.tables) throw new Error('PDF-ээс хуваарийн хүснэгт олдсонгүй. Сургуулийн «багш × өдөр/цаг» хэлбэрийн хуваарь эсэхийг шалгана уу.');
          var seen = {};
          out.lessons = out.lessons.filter(function (l) {
            var k = [l.day, l.period, l.teacher, l.group].join('|');
            if (seen[k]) return false;
            seen[k] = 1;
            return true;
          }).sort(function (a, b) { return a.day - b.day || a.period - b.period || (a.group || '').localeCompare(b.group || ''); });
          out.periods = Object.keys(periods).map(function (n) { return periods[n]; }).sort(function (a, b) { return a.n - b.n; });
          out.stats = {
            own: out.lessons.filter(function (l) { return l.kind === 'class'; }).length,
            grade: out.lessons.filter(function (l) { return l.kind === 'grade'; }).length,
          };
          out.lessons.forEach(function (l) { delete l.kind; });
          return out;
        });
      });
    });
  };

  /* ---------- CSV ---------- */
  C.parseCsv = function (text) {
    text = String(text).replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '';
    var delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.indexOf('\t') >= 0 && first.indexOf(',') < 0 ? '\t' : ',');
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); rows.push(row); row = []; cur = '';
      } else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  };

  var HEAD = {
    'гараг': 'day', 'өдөр': 'day', 'day': 'day', 'цаг': 'period', 'period': 'period', 'хичээл': 'subject', 'subject': 'subject',
    'багш': 'teacher', 'teacher': 'teacher', 'бүлэг': 'group', 'group': 'group', 'танхим': 'room', 'room': 'room',
    'тэмдэглэл': 'note', 'note': 'note', 'эхлэх': 'start', 'start': 'start', 'дуусах': 'end', 'end': 'end',
  };
  function dayOf(v) {
    var s = String(v || '').trim().toLowerCase();
    if (/^\d$/.test(s)) return +s;
    var keys = Object.keys(DAYN);
    for (var i = 0; i < keys.length; i++) if (s && keys[i].indexOf(s.slice(0, 2)) === 0) return DAYN[keys[i]];
    return 0;
  }

  C.scheduleFromCsv = function (text) {
    var rows = C.parseCsv(text);
    if (rows.length < 2) throw new Error('CSV файлд мөр алга');
    var map = rows[0].map(function (h) { return HEAD[String(h).trim().toLowerCase()] || ''; });
    if (map.indexOf('day') < 0 || map.indexOf('period') < 0) throw new Error('CSV-ийн эхний мөрөнд «Гараг» болон «Цаг» багана байх ёстой');
    var lessons = [], periods = {};
    rows.slice(1).forEach(function (r) {
      var o = {};
      map.forEach(function (k, i) { if (k) o[k] = String(r[i] == null ? '' : r[i]).trim(); });
      var day = dayOf(o.day), per = parseInt(o.period, 10);
      if (!day || !per) return;
      if (/^\d{1,2}:\d{2}$/.test(o.start || '') && /^\d{1,2}:\d{2}$/.test(o.end || '')) periods[per] = { n: per, start: o.start.padStart(5, '0'), end: o.end.padStart(5, '0') };
      if (!o.subject && !o.teacher) return;
      lessons.push({ day: day, period: per, subject: o.subject || '', teacher: o.teacher || '', group: o.group || '', room: o.room || '', note: o.note || '' });
    });
    return { lessons: lessons, periods: Object.keys(periods).map(function (k) { return periods[k]; }) };
  };

  C.scheduleToCsv = function (sch) {
    var pm = C.periodMap(sch);
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var out = [['Гараг', 'Цаг', 'Эхлэх', 'Дуусах', 'Хичээл', 'Багш', 'Бүлэг', 'Танхим', 'Тэмдэглэл'].join(',')];
    sch.lessons.slice().sort(function (a, b) { return a.day - b.day || a.period - b.period; }).forEach(function (l) {
      var p = pm[l.period] || {};
      out.push([C.DAYS[l.day], l.period, p.start || '', p.end || '', l.subject, l.teacher, l.group, l.room, l.note].map(q).join(','));
    });
    return '﻿' + out.join('\r\n') + '\r\n';
  };
})();

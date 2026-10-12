/* САМБАР: the classroom whiteboard (front end of inc/board.php).
   Everything on a page is a vector object (pen stroke or album image), so the eraser, select and delete work on
   individual items. Live strokes are painted incrementally; selection, ruler and cursors live on an overlay canvas.
   While a board is open the editor is IMMERSIVE: body.board-immersive hides the site chrome, the editor fills the screen
   (like an interactive-panel whiteboard app) and the browser Fullscreen API is tried on the click that opened the board. */
(function () {
  'use strict';
  var C = (window.C122 = window.C122 || {});
  var root = document.getElementById('view-board');
  if (!root) { C.Board = C.Board || { show: function () {}, hide: function () {} }; return; }

  var DEF_W = 1600, DEF_H = 900;         // paper of boards that store no size (matches inc/board.php)
  var W = DEF_W, H = DEF_H;              // logical paper size of the OPEN board: a new board takes the shape of the screen it was made on
  var MIN_SIDE = 320, MAX_SIDE = 4096, MAX_PX = 8.4e6, MAX_CANVAS = 4096;   // limits of inc/board.php; canvas memory cap (a 4K panel)
  var LEN = 1000, RTH = 96, CM = 40;     // ruler: 25 cm long, 1 cm = 40 paper units
  var MAX_JSON = 5.8 * 1024 * 1024;
  var COLORS = ['#182d25', '#000000', '#ffffff', '#d9363e', '#f08a24', '#f2c61d', '#2f9e5b', '#1aa6a6', '#2563eb', '#7c3aed', '#e8559d', '#8a5a3c'];
  var IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  var ACCENT = '#2d7359';

  var $ = function (id) { return document.getElementById(id); };
  var cvBg = $('boardBackgroundCanvas'), cvMain = $('boardCanvas'), cvOv = $('boardOverlayCanvas');
  var bgx = cvBg.getContext('2d'), mx = cvMain.getContext('2d'), ox = cvOv.getContext('2d');
  var shell = $('boardCanvasShell'), stage = $('boardCanvasStage');

  var S = {
    list: [], search: '', board: null, cur: 0, tool: 'pen', color: '#182d25', width: 5, eraseSize: 36, eraseMode: 'area',
    scale: 1, fit: true, res: 0, sel: [], hist: [], redo: [], dirty: false, saving: false, savePromise: null, saveTimer: 0, retryTimer: 0, retryDelay: 4000,
    req: null, conflict: false, conflictBoard: null, errorText: '', mode: '', pointer: null, live: null, liveDone: [], draft: null, draftChanged: false,
    drag: null, hide: null, cursor: null, snap: null, gesture: null, pin: null, raf: 0, dirtyMain: false, dirtyBg: false, dirtyOv: false, dirtyThumbs: false,
    thumbTimer: 0, ruler: { x: 800, y: 740, a: 0, visible: false }, rulerSaved: false, gen: 0, picker: null, fitMode: '', statusHidden: '', statusShown: '',
    immersive: false, windowed: false, fsMine: false, gestureAt: 0, drawer: '', touchPan: false, pan: null, penDown: false, penAt: 0, clockTimer: 0, tbH: 72, deskBg: '', layoutRaf: 0, focusBack: null
  };
  var A = {};   // data-board-act buttons by action name (filled by build())
  var touches = {}, imgs = {}, bboxCache = (window.WeakMap ? new WeakMap() : null), thumbCache = (window.WeakMap ? new WeakMap() : null), uidN = 0;

  /* ---------- small helpers ---------- */
  function T(key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (m, k) { return params && params[k] != null ? params[k] : m; });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function noop() {}
  function uid() {
    uidN = (uidN + 1) % 1679616;
    var rnd = '';
    try { var a = new Uint8Array(8); crypto.getRandomValues(a); for (var i = 0; i < a.length; i++) rnd += (a[i] % 36).toString(36); } catch (_) { rnd = Math.random().toString(36).slice(2, 10); }
    return 'b' + Date.now().toString(36) + uidN.toString(36) + rnd;
  }
  function pref(save) {
    try {
      if (save) localStorage.setItem('c122:board-prefs', JSON.stringify({ color: S.color, width: S.width, eraseSize: S.eraseSize, eraseMode: S.eraseMode }));
      else {
        var p = JSON.parse(localStorage.getItem('c122:board-prefs') || 'null');
        if (p) {
          if (/^#[0-9a-f]{6}$/i.test(p.color)) S.color = p.color.toLowerCase();
          if (p.width >= 1 && p.width <= 40) S.width = Math.round(p.width);
          if (p.eraseSize >= 8 && p.eraseSize <= 160) S.eraseSize = Math.round(p.eraseSize);
          if (p.eraseMode === 'area' || p.eraseMode === 'stroke') S.eraseMode = p.eraseMode;
        }
        var q = JSON.parse(localStorage.getItem('c122:board-ruler') || 'null');
        if (q && isFinite(q.x) && isFinite(q.y) && isFinite(q.a)) { S.ruler.x = clamp(q.x, 0, MAX_SIDE); S.ruler.y = clamp(q.y, 0, MAX_SIDE); S.ruler.a = q.a; S.rulerSaved = true; }
      }
    } catch (_) { /* private mode: preferences stay in memory */ }
  }
  function saveRuler() { try { localStorage.setItem('c122:board-ruler', JSON.stringify({ x: S.ruler.x, y: S.ruler.y, a: S.ruler.a })); } catch (_) {} }
  function announce(msg) { var el = $('boardAnnounce'); el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 20); }
  function api(action, opts, retry) {
    return C.api(action, opts).catch(function (error) {
      if (error.status === 403 && !retry && C.state.member) return C.refreshStatus().then(function () { return api(action, opts, true); });
      throw error;
    });
  }
  function visible() { return !root.hidden && C.state.member; }
  function editing() { return !!S.board && !$('boardEditor').hidden; }
  function page() { return S.board.pages[S.cur]; }
  function objects() { return S.draft || page().objects; }

  /* ---------- geometry ---------- */
  function bbox(o) {
    var c = bboxCache && bboxCache.get(o);
    if (c) return c;
    var b;
    if (o.type === 'stroke') {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, p = o.points;
      for (var i = 0; i < p.length; i++) { if (p[i][0] < x0) x0 = p[i][0]; if (p[i][0] > x1) x1 = p[i][0]; if (p[i][1] < y0) y0 = p[i][1]; if (p[i][1] > y1) y1 = p[i][1]; }
      b = { x0: x0, y0: y0, x1: x1, y1: y1 };
    } else b = { x0: o.x, y0: o.y, x1: o.x + o.width, y1: o.y + o.height };
    if (bboxCache) bboxCache.set(o, b);
    return b;
  }
  function union(list) {
    var u = null;
    for (var i = 0; i < list.length; i++) {
      var b = bbox(list[i]);
      if (!u) u = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
      else { u.x0 = Math.min(u.x0, b.x0); u.y0 = Math.min(u.y0, b.y0); u.x1 = Math.max(u.x1, b.x1); u.y1 = Math.max(u.y1, b.y1); }
    }
    return u;
  }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    var qx = ax + t * dx - px, qy = ay + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  function polyDist(o, px, py) {
    var p = o.points, best = 1e9;
    if (p.length === 1) return Math.sqrt(Math.pow(p[0][0] - px, 2) + Math.pow(p[0][1] - py, 2));
    for (var i = 1; i < p.length; i++) { var d = segDist(px, py, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]); if (d < best) best = d; }
    return best;
  }
  function segHitsRect(ax, ay, bx, by, r) {   // Liang-Barsky
    var t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay, pp = [-dx, dx, -dy, dy], qq = [ax - r.x0, r.x1 - ax, ay - r.y0, r.y1 - ay];
    for (var i = 0; i < 4; i++) {
      if (pp[i] === 0) { if (qq[i] < 0) return false; }
      else { var t = qq[i] / pp[i]; if (pp[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
    }
    return true;
  }
  function simplify(pts, eps) {
    var n = pts.length;
    if (n < 3) return pts;
    var keep = new Uint8Array(n), stack = [[0, n - 1]];
    keep[0] = keep[n - 1] = 1;
    while (stack.length) {
      var s = stack.pop(), a = s[0], b = s[1], max = 0, idx = -1;
      for (var i = a + 1; i < b; i++) { var d = segDist(pts[i][0], pts[i][1], pts[a][0], pts[a][1], pts[b][0], pts[b][1]); if (d > max) { max = d; idx = i; } }
      if (idx > 0 && max > eps) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    var out = [];
    for (var j = 0; j < n; j++) if (keep[j]) out.push(pts[j]);
    return out;
  }
  function xf(o, t) {   // returns a transformed copy; objects are never mutated once committed
    var n = { id: o.id, type: o.type };
    function fx(x) { return (x - t.ox) * t.s + t.ox + t.dx; }
    function fy(y) { return (y - t.oy) * t.s + t.oy + t.dy; }
    if (o.type === 'stroke') {
      n.tool = o.tool; n.color = o.color; n.width = o.width; n.points = [];
      for (var i = 0; i < o.points.length; i++) n.points.push([r1(clamp(fx(o.points[i][0]), 0, W)), r1(clamp(fy(o.points[i][1]), 0, H))]);
    } else {
      n.name = o.name; n.url = o.url; n.thumb = o.thumb; n.missing = o.missing;
      n.x = r1(fx(o.x)); n.y = r1(fy(o.y)); n.width = Math.max(20, r1(o.width * t.s)); n.height = Math.max(20, r1(o.height * t.s));
    }
    return n;
  }

  /* ---------- painting ---------- */
  function setCtx(ctx) { ctx.setTransform(S.res, 0, 0, S.res, 0, 0); }
  function applyRes(force) {
    var dpr = window.devicePixelRatio || 1;
    var r = clamp(Math.ceil(S.scale * dpr * 4 - 0.02) / 4, 1, 3);   // one canvas pixel per screen pixel (rounded up to 1/4), never blurry
    r = Math.max(0.5, Math.floor(Math.min(r, Math.sqrt(MAX_PX / (W * H)), MAX_CANVAS / Math.max(W, H)) * 4) / 4);   // bounded memory: about one 4K screen per canvas
    if (!force && r === S.res) return;
    S.res = r;
    var w = Math.round(W * r), h = Math.round(H * r);
    [cvBg, cvMain, cvOv].forEach(function (c) { c.width = w; c.height = h; });
    S.dirtyBg = S.dirtyMain = S.dirtyOv = true;
    schedule();
  }
  function paintBackground(ctx, name) {
    ctx.fillStyle = name === 'dark' ? '#1f3a2e' : '#fffdf8';
    ctx.fillRect(0, 0, W, H);
    if (name !== 'grid' && name !== 'ruled') return;
    ctx.lineWidth = 1; ctx.beginPath(); ctx.strokeStyle = name === 'grid' ? '#d9e2d6' : '#c9d8cf';
    var i;
    if (name === 'grid') { for (i = 40; i < W; i += 40) { ctx.moveTo(i + .5, 0); ctx.lineTo(i + .5, H); } for (i = 40; i < H; i += 40) { ctx.moveTo(0, i + .5); ctx.lineTo(W, i + .5); } }
    else for (i = 90; i < H; i += 50) { ctx.moveTo(0, i + .5); ctx.lineTo(W, i + .5); }
    ctx.stroke();
    if (name === 'ruled') { ctx.beginPath(); ctx.strokeStyle = '#e8b8b4'; ctx.moveTo(120.5, 0); ctx.lineTo(120.5, H); ctx.stroke(); }
  }
  function drawStroke(ctx, o) {
    var p = o.points, n = p.length;
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = o.color; ctx.lineWidth = o.width;
    if (o.tool === 'highlight') ctx.globalAlpha = 0.35;
    if (o.tool === 'erase') ctx.globalCompositeOperation = 'destination-out';
    var dot = n === 1 || (n === 2 && p[0][0] === p[1][0] && p[0][1] === p[1][1]);
    if (dot) { ctx.beginPath(); ctx.arc(p[0][0], p[0][1], o.width / 2, 0, Math.PI * 2); ctx.fill(); }
    else {
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      if (n === 2) ctx.lineTo(p[1][0], p[1][1]);
      else {
        for (var i = 1; i < n - 1; i++) ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
        ctx.lineTo(p[n - 1][0], p[n - 1][1]);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function imgItem(o) {
    if (!o.url) return null;
    var it = imgs[o.url];
    if (it) return it;
    var img = new Image();
    it = imgs[o.url] = { img: img, ok: false, err: false };
    img.onload = function () { it.ok = true; S.dirtyMain = S.dirtyThumbs = true; schedule(); };
    img.onerror = function () { it.err = true; S.dirtyMain = true; schedule(); };
    img.src = o.url;
    return it;
  }
  function drawImageObject(ctx, o, exporting) {
    var it = imgItem(o);
    if (it && it.ok) { ctx.drawImage(it.img, o.x, o.y, o.width, o.height); return; }
    if (exporting) return;
    ctx.save();
    ctx.fillStyle = 'rgba(120,130,125,.14)'; ctx.fillRect(o.x, o.y, o.width, o.height);
    ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(90,100,95,.55)'; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y, o.width, o.height);
    if (o.missing || (it && it.err) || !o.url) {
      ctx.setLineDash([]); ctx.fillStyle = 'rgba(70,80,75,.85)'; ctx.font = '600 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(T('board.imageMissing', 'Зураг олдсонгүй'), o.x + o.width / 2, o.y + o.height / 2, Math.max(40, o.width - 16));
    }
    ctx.restore();
  }
  function drawObject(ctx, o, exporting) { if (o.type === 'stroke') drawStroke(ctx, o); else if (o.type === 'image') drawImageObject(ctx, o, exporting); }
  function renderBackground() { setCtx(bgx); paintBackground(bgx, page().background); }
  function renderMain() {
    setCtx(mx); mx.clearRect(0, 0, W, H);
    var list = objects(), hide = S.hide, i;
    for (i = 0; i < list.length; i++) { if (hide && hide[list[i].id]) continue; drawObject(mx, list[i]); }
    for (i = 0; i < S.liveDone.length; i++) drawStroke(mx, S.liveDone[i]);
    if (S.live) drawStroke(mx, S.live);
  }
  function liveSegment(o, tail) {   // incremental pen painting, consistent with drawStroke's midpoint smoothing
    var p = o.points, n = p.length;
    setCtx(mx);
    mx.save(); mx.lineCap = mx.lineJoin = 'round'; mx.strokeStyle = mx.fillStyle = o.color; mx.lineWidth = o.width;
    mx.beginPath();
    if (n === 1) { mx.arc(p[0][0], p[0][1], o.width / 2, 0, Math.PI * 2); mx.fill(); }
    else if (tail) {
      if (n === 2) { mx.moveTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2); mx.lineTo(p[1][0], p[1][1]); }
      else { mx.moveTo((p[n - 2][0] + p[n - 1][0]) / 2, (p[n - 2][1] + p[n - 1][1]) / 2); mx.lineTo(p[n - 1][0], p[n - 1][1]); }
      mx.stroke();
    } else if (n === 2) { mx.moveTo(p[0][0], p[0][1]); mx.lineTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2); mx.stroke(); }
    else {
      mx.moveTo((p[n - 3][0] + p[n - 2][0]) / 2, (p[n - 3][1] + p[n - 2][1]) / 2);
      mx.quadraticCurveTo(p[n - 2][0], p[n - 2][1], (p[n - 2][0] + p[n - 1][0]) / 2, (p[n - 2][1] + p[n - 1][1]) / 2);
      mx.stroke();
    }
    mx.restore();
  }

  /* ruler geometry: local x runs along the ruler, local y across it (y = -RTH/2 is the numbered edge) */
  function rulerLocal(p) {
    var r = S.ruler, c = Math.cos(r.a), s = Math.sin(r.a), dx = p.x - r.x, dy = p.y - r.y;
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  }
  function rulerWorld(lx, ly) {
    var r = S.ruler, c = Math.cos(r.a), s = Math.sin(r.a);
    return { x: r.x + lx * c - ly * s, y: r.y + lx * s + ly * c };
  }
  function rulerEdgeAt(p) {
    if (!S.ruler.visible) return null;
    var l = rulerLocal(p), tol = Math.max(18, 30 / S.scale) + S.width / 2;
    if (Math.abs(l.x) > LEN / 2 + 24) return null;
    var e = Math.abs(l.y - RTH / 2) <= tol ? 1 : Math.abs(l.y + RTH / 2) <= tol ? -1 : 0;
    return e ? { edge: e, pt: rulerEdgePoint(e, l.x) } : null;
  }
  function rulerEdgePoint(edge, lx) {
    var w = rulerWorld(clamp(lx, -LEN / 2, LEN / 2), edge * (RTH / 2 + S.width / 2));
    return { x: r1(clamp(w.x, 0, W)), y: r1(clamp(w.y, 0, H)) };
  }
  function rulerAngleDeg() { return ((S.ruler.a * 180 / Math.PI) % 180 + 180) % 180; }
  function cmText(units) { return (Math.round(units / CM * 10) / 10) + ' ' + T('board.unitCm', 'см'); }

  function drawRuler(ctx) {
    var r = S.ruler, active = S.tool === 'ruler', i;
    ctx.save();
    ctx.translate(r.x, r.y); ctx.rotate(r.a);
    var g = ctx.createLinearGradient(0, -RTH / 2, 0, RTH / 2);
    g.addColorStop(0, 'rgba(255,229,140,.88)'); g.addColorStop(1, 'rgba(255,205,92,.78)');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(122,88,16,.85)'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-LEN / 2, -RTH / 2, LEN, RTH, 10); else ctx.rect(-LEN / 2, -RTH / 2, LEN, RTH);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,48,6,.9)'; ctx.fillStyle = 'rgba(70,48,6,.95)'; ctx.lineWidth = 1.4;
    ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.beginPath();
    for (i = 0; i <= LEN / 4; i++) {
      var x = -LEN / 2 + i * 4, len = i % 10 === 0 ? 26 : i % 5 === 0 ? 17 : 9;
      ctx.moveTo(x, -RTH / 2); ctx.lineTo(x, -RTH / 2 + len);
    }
    ctx.stroke();
    for (i = 0; i <= LEN / CM; i++) if (i > 0 && i < LEN / CM) ctx.fillText(String(i), -LEN / 2 + i * CM, -RTH / 2 + 30);
    // end grips (rotate)
    ctx.globalAlpha = active ? 1 : 0.45;
    [-1, 1].forEach(function (side) {
      ctx.beginPath(); ctx.arc(side * (LEN / 2 - 48), 14, 24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(122,88,16,.85)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(70,48,6,.95)'; ctx.font = '700 28px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText('↻', side * (LEN / 2 - 48), 15);
    });
    ctx.globalAlpha = 1;
    if (active || S.mode === 'snap') {
      ctx.save();
      if (Math.cos(r.a) < 0) ctx.rotate(Math.PI);
      ctx.fillStyle = 'rgba(40,28,4,.85)'; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-52, 6, 104, 34, 17); else ctx.rect(-52, 6, 104, 34);
      ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 19px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((Math.round(rulerAngleDeg() * 10) / 10) + '°', 0, 24);
      ctx.restore();
    }
    ctx.restore();
  }
  function selection() {
    if (!S.sel.length || !S.board) return [];
    var ids = {}, out = [], list = objects();
    S.sel.forEach(function (id) { ids[id] = true; });
    for (var i = 0; i < list.length; i++) if (ids[list[i].id]) out.push(list[i]);
    return out;
  }
  function selBox(list) {
    var u = union(list);
    if (!u) return null;
    var pad = 8 / S.scale + 4;
    list.forEach(function (o) { if (o.type === 'stroke') pad = Math.max(pad, o.width / 2 + 6 / S.scale); });
    return { x0: u.x0 - pad, y0: u.y0 - pad, x1: u.x1 + pad, y1: u.y1 + pad };
  }
  function corners(b) { return [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 }]; }
  function renderOverlay() {
    setCtx(ox); ox.clearRect(0, 0, W, H);
    var inv = 1 / S.scale, d = S.drag, i;
    var sel = selection(), shown = sel;
    if (d && (d.type === 'move' || d.type === 'scale')) {
      shown = sel.map(function (o) { return xf(o, d.t); });
      for (i = 0; i < shown.length; i++) drawObject(ox, shown[i]);
    }
    if (S.ruler.visible) drawRuler(ox);
    if (S.snap) {
      var o = { points: [[S.snap.a.x, S.snap.a.y], [S.snap.b.x, S.snap.b.y]], color: S.color, width: S.width, tool: 'pen' };
      drawStroke(ox, o);
      var len = Math.sqrt(Math.pow(S.snap.b.x - S.snap.a.x, 2) + Math.pow(S.snap.b.y - S.snap.a.y, 2));
      pill(ox, cmText(len), S.snap.b.x, S.snap.b.y - (28 + S.width) * inv, inv);
    }
    if (shown.length && S.tool === 'select') {
      var b = selBox(shown);
      ox.save(); ox.lineWidth = 2 * inv; ox.setLineDash([8 * inv, 6 * inv]); ox.strokeStyle = ACCENT;
      ox.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ox.setLineDash([]);
      corners(b).forEach(function (c) { ox.beginPath(); ox.arc(c.x, c.y, 11 * inv, 0, Math.PI * 2); ox.fillStyle = '#fff'; ox.fill(); ox.lineWidth = 3 * inv; ox.stroke(); });
      ox.restore();
    }
    if (d && d.type === 'band') {
      var x = Math.min(d.a.x, d.b.x), y = Math.min(d.a.y, d.b.y), w = Math.abs(d.b.x - d.a.x), h = Math.abs(d.b.y - d.a.y);
      ox.save(); ox.fillStyle = 'rgba(45,115,89,.12)'; ox.strokeStyle = ACCENT; ox.lineWidth = 2 * inv; ox.setLineDash([6 * inv, 5 * inv]);
      ox.fillRect(x, y, w, h); ox.strokeRect(x, y, w, h); ox.restore();
    }
    if (S.tool === 'erase' && S.cursor) {
      ox.save(); ox.beginPath(); ox.arc(S.cursor.x, S.cursor.y, S.eraseSize / 2, 0, Math.PI * 2);
      ox.fillStyle = 'rgba(255,255,255,.35)'; ox.fill(); ox.lineWidth = 2 * inv; ox.strokeStyle = 'rgba(30,40,35,.8)'; ox.stroke();
      ox.lineWidth = 1 * inv; ox.strokeStyle = 'rgba(255,255,255,.9)'; ox.beginPath(); ox.arc(S.cursor.x, S.cursor.y, S.eraseSize / 2 - 2 * inv, 0, Math.PI * 2); ox.stroke(); ox.restore();
    }
  }
  function pill(ctx, text, x, y, inv) {
    ctx.save(); ctx.font = '700 ' + (15 * inv) + 'px system-ui, sans-serif';
    var w = ctx.measureText(text).width + 22 * inv, h = 28 * inv;
    var px = clamp(x - w / 2, 4, W - w - 4), py = clamp(y - h / 2, 4, H - h - 4);
    ctx.fillStyle = 'rgba(25,35,30,.88)'; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, w, h, h / 2); else ctx.rect(px, py, w, h);
    ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, px + w / 2, py + h / 2 + inv); ctx.restore();
  }
  function schedule() { if (!S.raf) S.raf = requestAnimationFrame(frame); }
  function frame() {
    S.raf = 0;
    if (!editing()) return;
    if (S.dirtyBg) { S.dirtyBg = false; renderBackground(); }
    if (S.dirtyMain) { S.dirtyMain = false; renderMain(); }
    if (S.dirtyOv) { S.dirtyOv = false; renderOverlay(); }
    if (S.dirtyThumbs && S.drawer === 'pages' && !S.thumbTimer) { S.thumbTimer = setTimeout(function () { S.thumbTimer = 0; if (S.dirtyThumbs && S.drawer === 'pages') { S.dirtyThumbs = false; renderPages(); } }, 450); }
  }
  function paintPage(ctx, rec, exporting) {
    paintBackground(ctx, rec.background);
    for (var i = 0; i < rec.objects.length; i++) drawObject(ctx, rec.objects[i], exporting);
  }

  /* ---------- status and controls ---------- */
  /* The screen carries NO passive status text: only a tiny dot (green saved, amber saving, red error). Text appears for an
     error or an offline wait, compact and dismissible, top-left and clear of the toolbar and the side handles; the full
     status line lives in the Menu drawer. A conflict is explained by the banner (board-conflict). */
  function setStatus() {
    var el = $('boardSaveStatus'), st, text, show = '';
    if (S.conflict) { st = 'error'; text = T('board.conflictStatus', 'Өөр төхөөрөмж өөрчилсөн'); }
    else if (S.errorText) { st = 'error'; text = T('board.saveError', 'Хадгалж чадсангүй') + ': ' + S.errorText; show = text; }
    else if (S.saving) { st = 'saving'; text = T('board.saving', 'Хадгалж байна…'); }
    else if (S.dirty) {
      st = 'pending';
      if (navigator.onLine === false) { text = T('board.offline', 'Холболтгүй · Холбогдмогц хадгална'); show = text; }
      else text = T('board.unsaved', 'Автоматаар хадгална…');
    }
    else { st = 'saved'; text = T('board.saved', 'Вэбсайтад хадгалагдсан'); }
    if (!show) S.statusHidden = '';
    S.statusShown = show;
    var on = !!show && S.statusHidden !== show;
    el.textContent = on ? show : ''; el.hidden = !on; $('boardStatusClose').hidden = !on;
    el.dataset.state = st; $('boardTitlePill').dataset.state = st; $('boardTitlePill').classList.toggle('has-text', on);
    $('boardMenuStatus').textContent = text;
  }
  function setDis(name, v) { var l = A[name] || []; for (var i = 0; i < l.length; i++) l[i].disabled = !!v; }
  function pressed(b, on) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  function updateUI() {
    if (!S.board) return;
    var multi = S.board.pages.length > 1, total = S.board.pages.length;
    setDis('undo', !S.hist.length || !!S.mode); setDis('redo', !S.redo.length || !!S.mode);
    setDis('clear', !page().objects.length); setDis('delPage', !multi);
    setDis('prev', S.cur <= 0); setDis('next', S.cur >= total - 1);
    setDis('save', S.saving);
    var num = $('boardPageNum');
    num.textContent = (S.cur + 1) + '/' + total;
    num.parentNode.setAttribute('aria-label', T('board.pageOf', 'Хуудас {n} / {m}', { n: S.cur + 1, m: total }));
    $('boardMenuTitle').textContent = S.board.title; $('boardPageTitle').textContent = page().title;
    var bg = page().background;
    $('boardCanvasShell').dataset.bg = bg;
    if (S.deskBg !== bg) { S.deskBg = bg; syncDesk(); }
    C.$$('[data-board-bg]', root).forEach(function (b) { pressed(b, b.dataset.boardBg === bg); });
    $('boardZoomValue').textContent = Math.round(S.scale * 100) + '%';
    var sel = selection();
    $('boardSelectionBar').hidden = !(S.tool === 'select' && sel.length);
    $('boardSelCount').textContent = sel.length ? T('board.selected', '{count} зүйл сонгосон', { count: sel.length }) : '';
    C.$$('[data-board-tool]', root).forEach(function (b) { pressed(b, b.dataset.boardTool === S.tool); });
    C.$$('[data-board-erase]', root).forEach(function (b) { pressed(b, b.dataset.boardErase === S.eraseMode); });
    $('boardOptions').dataset.tool = S.tool;
    var erase = S.tool === 'erase', range = $('boardWidth');
    range.min = erase ? 8 : 1; range.max = erase ? 160 : 40;
    range.value = erase ? S.eraseSize : S.width;
    $('boardWidthValue').textContent = range.value;
    $('boardWidthLabel').textContent = erase ? T('board.eraserSize', 'Баллуурын хэмжээ') : T('board.width', 'Хэмжээ');
    C.$$('.board-swatch', root).forEach(function (b) { pressed(b, b.dataset.color === S.color); });
    $('boardColor').value = S.color; $('boardPenDot').style.background = S.color;
    var touchName = S.touchPan ? T('board.touchPan', 'Хөдөлгөх') : T('board.touchDraw', 'Бичих');
    C.$$('.board-touch-name', root).forEach(function (n) { n.textContent = touchName; });
    (A.touch || []).forEach(function (b) { pressed(b, S.touchPan); });
    var rulerOn = S.ruler.visible;
    (A.rulerToggle || []).forEach(function (b) { b.setAttribute('aria-pressed', String(rulerOn)); b.classList.toggle('on', rulerOn); });
    $('boardRulerToggleLabel').textContent = rulerOn ? T('board.rulerHide', 'Шугам нуух') : T('board.rulerShow', 'Шугам харуулах');
    syncModeUI();
    shell.style.cursor = S.tool === 'erase' ? 'none' : S.tool === 'select' ? 'default' : S.tool === 'ruler' ? 'grab' : 'crosshair';
    setStatus();
  }

  /* ---------- history ---------- */
  function afterChange(noMain) {
    if (!noMain) S.dirtyMain = true;
    S.dirtyOv = S.dirtyThumbs = true;
    planSave(); updateUI(); schedule();
  }
  function commit(pages, cur, keepSel, noMain) {
    S.hist.push({ pages: S.board.pages, cur: S.cur });
    if (S.hist.length > 100) S.hist.shift();
    S.redo = [];
    S.board.pages = pages;
    if (cur != null) { S.cur = cur; S.dirtyBg = true; }
    if (!keepSel) S.sel = [];
    afterChange(noMain);
  }
  function setObjects(list, keepSel, noMain) {
    var pages = S.board.pages.slice(), p = pages[S.cur];
    pages[S.cur] = { id: p.id, title: p.title, background: p.background, objects: list };
    commit(pages, null, keepSel, noMain);
  }
  function restoreState(h) {
    var prev = S.cur;
    S.board.pages = h.pages; S.cur = clamp(h.cur, 0, h.pages.length - 1); S.sel = [];
    S.dirtyBg = true; afterChange();
    if (prev !== S.cur) S.dirtyThumbs = true;
  }
  function undo() {
    if (!S.hist.length || S.mode) return;
    S.redo.push({ pages: S.board.pages, cur: S.cur }); restoreState(S.hist.pop()); announce(T('board.undone', 'Буцаалаа'));
  }
  function redo() {
    if (!S.redo.length || S.mode) return;
    S.hist.push({ pages: S.board.pages, cur: S.cur }); restoreState(S.redo.pop()); announce(T('board.redone', 'Дахин хийлээ'));
  }

  /* ---------- saving (revisions, retries, conflicts) ---------- */
  function serialize(pages) {
    return pages.map(function (p) {
      return {
        id: p.id, title: p.title, background: p.background,
        objects: p.objects.map(function (o) {
          if (o.type === 'stroke') return { id: o.id, type: 'stroke', tool: o.tool, color: o.color, width: o.width, points: o.points };
          return { id: o.id, type: 'image', name: o.name, x: o.x, y: o.y, width: o.width, height: o.height };
        })
      };
    });
  }
  function planSave() {
    S.dirty = true; S.errorText = '';
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(function () { save().catch(noop); }, 1200);
  }
  function save() {
    var b = S.board;
    if (!b || S.conflict) return Promise.resolve();
    if (S.saving) return S.savePromise;
    if (!S.dirty) return Promise.resolve();
    clearTimeout(S.saveTimer); clearTimeout(S.retryTimer);
    var pages = b.pages, title = b.title, revision = b.revision;
    var payload = { id: b.id, revision: revision, title: title, pages: serialize(pages) };
    if (JSON.stringify(payload).length > MAX_JSON) {
      S.errorText = T('board.tooLarge', 'Самбар хэт том байна. Хуудас устгах эсвэл шинэ самбар нээнэ үү.'); setStatus();
      return Promise.reject(new Error(S.errorText));
    }
    if (!S.req || S.req.pages !== pages || S.req.title !== title || S.req.revision !== revision) S.req = { id: uid() + uid(), pages: pages, title: title, revision: revision };
    payload.requestId = S.req.id;
    S.saving = true; S.errorText = ''; updateUI();
    S.savePromise = api('board_save', { body: payload }).then(function (d) {
      if (S.board !== b) return;
      b.revision = d.board.revision; S.req = null; S.retryDelay = 4000;
      if (b.pages === pages && b.title === title) S.dirty = false; else planSave();
      var row = null; S.list.forEach(function (x) { if (x.id === b.id) row = x; });
      if (row) { row.title = b.title; row.revision = b.revision; row.updated = d.board.updated; row.pageCount = b.pages.length; }
    }).catch(function (e) {
      if (S.board !== b) throw e;
      if (e.status === 409 && e.data && e.data.conflict) { onConflict(e.data.board); throw e; }
      if (e.status === 401) { throw e; }
      S.errorText = e.message || '';
      if ((e.status === 0 || e.status >= 500) && visible()) {
        S.retryTimer = setTimeout(function () { save().catch(noop); }, S.retryDelay); S.retryDelay = Math.min(60000, S.retryDelay * 2);
      }
      throw e;
    }).then(function (v) { S.saving = false; S.savePromise = null; updateUI(); return v; }, function (e) { S.saving = false; S.savePromise = null; updateUI(); throw e; });
    return S.savePromise;
  }
  function flush() {
    return save().then(function () { return S.dirty && !S.conflict && !S.errorText ? flush() : null; }, noop);
  }
  function onConflict(serverBoard) {
    S.conflict = true; S.conflictBoard = serverBoard; $('boardConflict').hidden = false; setStatus();
  }

  /* ---------- tools ---------- */
  function setTool(tool) {
    if (S.mode) cancelDrawing();
    if (tool === 'ruler') {
      if (S.tool === 'ruler' && S.ruler.visible) { S.ruler.visible = false; tool = 'pen'; announce(T('board.rulerHidden', 'Шугам нуугдлаа')); }
      else { S.ruler.visible = true; announce(T('board.rulerShown', 'Шугам гарлаа')); }
    }
    if (tool !== 'select') S.sel = [];
    S.tool = tool; S.cursor = null; S.dirtyOv = true; updateUI(); schedule();
  }
  function cancelDrawing() {
    if (S.mode === 'pen') { S.live = null; S.liveDone = []; S.dirtyMain = true; }
    if (S.mode === 'erase') { S.draft = null; S.draftChanged = false; S.dirtyMain = true; }
    if (S.mode === 'move' || S.mode === 'scale') { S.hide = null; S.dirtyMain = true; }
    S.mode = ''; S.drag = null; S.snap = null; S.pointer = null; S.dirtyOv = true; schedule(); updateUI();
  }
  function toCanvas(e, rect) {
    rect = rect || cvMain.getBoundingClientRect();
    return { x: clamp((e.clientX - rect.left) * W / rect.width, 0, W), y: clamp((e.clientY - rect.top) * H / rect.height, 0, H) };
  }
  function tolerance() { return Math.max(10, 16 / S.scale); }

  /* pen */
  function startPen(p) {
    var snap = rulerEdgeAt(p);
    if (snap) { S.mode = 'snap'; S.snap = { edge: snap.edge, a: snap.pt, b: snap.pt }; S.dirtyOv = true; schedule(); return; }
    S.mode = 'pen'; S.liveDone = [];
    S.live = { id: uid(), type: 'stroke', tool: 'pen', color: S.color, width: S.width, points: [[r1(p.x), r1(p.y)]] };
    liveSegment(S.live);
  }
  function addPenPoint(p) {
    var pts = S.live.points, last = pts[pts.length - 1], dx = p.x - last[0], dy = p.y - last[1];
    if (dx * dx + dy * dy < 0.64) return;
    pts.push([r1(p.x), r1(p.y)]);
    if (pts.length >= 3500) { S.liveDone.push(S.live); S.live = { id: uid(), type: 'stroke', tool: 'pen', color: S.color, width: S.width, points: [pts[pts.length - 1]] }; }
    else liveSegment(S.live);
  }
  function finishPen(p) {
    if (p) addPenPoint(p);
    if (S.live.points.length > 1) liveSegment(S.live, true);
    var parts = S.liveDone.concat([S.live]).map(function (o) { return { id: o.id, type: 'stroke', tool: 'pen', color: o.color, width: o.width, points: simplify(o.points, 0.45) }; });
    S.live = null; S.liveDone = [];
    setObjects(objects().concat(parts), false, true);
  }
  function finishSnap() {
    var s = S.snap, pts = Math.abs(s.a.x - s.b.x) + Math.abs(s.a.y - s.b.y) < 0.6 ? [[s.a.x, s.a.y]] : [[s.a.x, s.a.y], [s.b.x, s.b.y]];
    var o = { id: uid(), type: 'stroke', tool: 'pen', color: S.color, width: S.width, points: pts };
    S.snap = null;
    setObjects(objects().concat([o]));
  }

  /* eraser: removes parts of strokes (area) or whole strokes */
  function startErase(p) {
    S.mode = 'erase'; S.draft = page().objects.slice(); S.draftChanged = false; S.eLast = p; S.sel = [];
    eraseAt(p.x, p.y);
  }
  function eraseTo(p) {
    var r = S.eraseSize / 2, dx = p.x - S.eLast.x, dy = p.y - S.eLast.y, dist = Math.sqrt(dx * dx + dy * dy), n = Math.max(1, Math.ceil(dist / Math.max(2, r * 0.5)));
    for (var i = 1; i <= n; i++) eraseAt(S.eLast.x + dx * i / n, S.eLast.y + dy * i / n);
    S.eLast = p;
  }
  function eraseAt(qx, qy) {
    var r = S.eraseSize / 2, list = S.draft, next = null, i, o;
    for (i = 0; i < list.length; i++) {
      o = list[i];
      if (o.type === 'stroke') {
        var b = bbox(o), rad = r + o.width / 2;
        if (!(qx < b.x0 - rad || qx > b.x1 + rad || qy < b.y0 - rad || qy > b.y1 + rad) && polyDist(o, qx, qy) <= rad) {
          if (!next) next = list.slice(0, i);
          if (S.eraseMode === 'area') { var pieces = splitStroke(o, qx, qy, rad); for (var k = 0; k < pieces.length; k++) next.push(pieces[k]); }
          continue;
        }
      }
      if (next) next.push(o);
    }
    if (!next) return;
    S.draft = next; S.draftChanged = true; S.dirtyMain = true; schedule();
  }
  function splitStroke(o, qx, qy, rad) {
    var p = o.points, total = 0, i;
    for (i = 1; i < p.length; i++) total += Math.sqrt(Math.pow(p[i][0] - p[i - 1][0], 2) + Math.pow(p[i][1] - p[i - 1][1], 2));
    var step = Math.max(rad * 0.4, 1.5, total / 6000), dense = [p[0]];
    for (i = 1; i < p.length; i++) {
      var a = p[i - 1], b = p[i], len = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)), n = Math.ceil(len / step);
      for (var k = 1; k < n; k++) dense.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
      dense.push(b);
    }
    var pieces = [], run = [], r2 = rad * rad * 1.08;
    function flushRun() {
      if (!run.length) return;
      var pts = simplify(run, 0.35).map(function (q) { return [r1(q[0]), r1(q[1])]; });
      pieces.push({ id: uid(), type: 'stroke', tool: o.tool, color: o.color, width: o.width, points: pts.slice(0, 8192) });
      run = [];
    }
    for (i = 0; i < dense.length; i++) {
      var dx = dense[i][0] - qx, dy = dense[i][1] - qy;
      if (dx * dx + dy * dy < r2) flushRun(); else run.push(dense[i]);
    }
    flushRun();
    return pieces;
  }
  function finishErase() {
    var draft = S.draft, changed = S.draftChanged;
    S.draft = null; S.draftChanged = false;
    if (changed) setObjects(draft); else { S.dirtyMain = true; schedule(); }
  }

  /* select / move / resize / delete */
  function hitTest(p) {
    var list = objects(), tol = tolerance();
    for (var i = list.length - 1; i >= 0; i--) {
      var o = list[i], b = bbox(o);
      if (o.type === 'image') { if (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1) return o; continue; }
      var rad = tol + o.width / 2;
      if (p.x < b.x0 - rad || p.x > b.x1 + rad || p.y < b.y0 - rad || p.y > b.y1 + rad) continue;
      if (polyDist(o, p.x, p.y) <= rad) return o;
    }
    return null;
  }
  function bandHits(r) {
    var ids = [], list = objects();
    list.forEach(function (o) {
      var b = bbox(o);
      if (b.x1 < r.x0 || b.x0 > r.x1 || b.y1 < r.y0 || b.y0 > r.y1) return;
      if (o.type === 'image') { ids.push(o.id); return; }
      var p = o.points, hit = false;
      if (p.length === 1) hit = p[0][0] >= r.x0 && p[0][0] <= r.x1 && p[0][1] >= r.y0 && p[0][1] <= r.y1;
      else for (var i = 1; i < p.length && !hit; i++) hit = segHitsRect(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1], r);
      if (hit) ids.push(o.id);
    });
    return ids;
  }
  function handleAt(p) {
    var box = selBox(selection());
    if (!box) return -1;
    var cs = corners(box), rad = Math.max(22, 26 / S.scale);
    for (var i = 0; i < 4; i++) if (Math.abs(p.x - cs[i].x) <= rad && Math.abs(p.y - cs[i].y) <= rad) return i;
    return -1;
  }
  function startSelect(p, e) {
    var multi = e.shiftKey || e.ctrlKey || e.metaKey, sel = selection(), h = sel.length ? handleAt(p) : -1, hit;
    if (h >= 0) {
      var box = selBox(sel), cs = corners(box), anchor = cs[(h + 2) % 4], handle = cs[h];
      S.mode = 'scale'; S.hide = idSet(S.sel);
      S.drag = { type: 'scale', anchor: anchor, handle: handle, t: { s: 1, ox: anchor.x, oy: anchor.y, dx: 0, dy: 0 }, geo: union(sel), minS: minScale(sel), moved: false };
      S.dirtyMain = true; schedule(); return;
    }
    hit = hitTest(p);
    if (hit) {
      if (multi) {
        var at = S.sel.indexOf(hit.id);
        if (at >= 0) S.sel.splice(at, 1); else S.sel.push(hit.id);
        updateUI(); S.dirtyOv = true; schedule();
        if (at >= 0) return;
      } else if (S.sel.indexOf(hit.id) < 0) S.sel = [hit.id];
      var chosen = selection();
      S.mode = 'move'; S.hide = idSet(S.sel);
      S.drag = { type: 'move', start: p, geo: union(chosen), t: { s: 1, ox: 0, oy: 0, dx: 0, dy: 0 }, moved: false };
      S.dirtyMain = true; updateUI(); schedule(); return;
    }
    if (!multi) S.sel = [];
    S.mode = 'band';
    S.drag = { type: 'band', a: p, b: p, base: multi ? S.sel.slice() : [] };
    updateUI(); S.dirtyOv = true; schedule();
  }
  function idSet(ids) { var s = {}; ids.forEach(function (id) { s[id] = true; }); return s; }
  function minScale(list) {
    var m = 0.05;
    list.forEach(function (o) { if (o.type === 'image') m = Math.max(m, 20 / Math.min(o.width, o.height)); });
    return m;
  }
  function moveSelect(p) {
    var d = S.drag;
    if (d.type === 'move') {
      var dx = p.x - d.start.x, dy = p.y - d.start.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3 / S.scale) return;
      d.moved = true;
      if (d.geo.x1 - d.geo.x0 <= W) dx = clamp(dx, -d.geo.x0, W - d.geo.x1);
      if (d.geo.y1 - d.geo.y0 <= H) dy = clamp(dy, -d.geo.y0, H - d.geo.y1);
      d.t = { s: 1, ox: 0, oy: 0, dx: dx, dy: dy };
    } else if (d.type === 'scale') {
      var ax = d.anchor.x, ay = d.anchor.y, vx = d.handle.x - ax, vy = d.handle.y - ay, l2 = vx * vx + vy * vy || 1;
      var s = ((p.x - ax) * vx + (p.y - ay) * vy) / l2, g = d.geo, max = 1e9;
      var lim = function (a, lo, hi, size) { if (hi > a) max = Math.min(max, (size - a) / (hi - a)); if (lo < a) max = Math.min(max, a / (a - lo)); };
      lim(ax, g.x0, g.x1, W); lim(ay, g.y0, g.y1, H);
      s = clamp(s, d.minS, Math.max(d.minS, max));
      d.moved = true; d.t = { s: s, ox: ax, oy: ay, dx: 0, dy: 0 };
    } else if (d.type === 'band') {
      d.b = p;
      var rect = { x0: Math.min(d.a.x, p.x), y0: Math.min(d.a.y, p.y), x1: Math.max(d.a.x, p.x), y1: Math.max(d.a.y, p.y) };
      var ids = bandHits(rect);
      d.base.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
      S.sel = ids; updateUI();
    }
    S.dirtyOv = true; schedule();
  }
  function finishSelect() {
    var d = S.drag, sel = selection();
    S.mode = ''; S.drag = null; S.hide = null;
    if ((d.type === 'move' || d.type === 'scale') && d.moved && !(d.type === 'move' && !d.t.dx && !d.t.dy) && !(d.type === 'scale' && d.t.s === 1)) {
      var ids = idSet(S.sel), t = d.t, next = objects().map(function (o) { return ids[o.id] ? xf(o, t) : o; });
      setObjects(next, true);
    } else { S.dirtyMain = true; S.dirtyOv = true; schedule(); }
    updateUI();
    if (d.type === 'band' && S.sel.length) announce(T('board.selected', '{count} зүйл сонгосон', { count: S.sel.length }));
  }
  function deleteSelected() {
    if (!S.sel.length) return;
    var ids = idSet(S.sel), count = S.sel.length;
    setObjects(objects().filter(function (o) { return !ids[o.id]; }));
    announce(T('board.deleted', '{count} зүйл устгагдлаа', { count: count }));
  }

  /* ruler dragging */
  function startRuler(p) {
    var l = rulerLocal(p);
    if (Math.abs(l.x) > LEN / 2 + 30 || Math.abs(l.y) > RTH / 2 + 24) return;
    if (Math.abs(l.x) > LEN / 2 - 120) { S.mode = 'ruler-rot'; S.drag = { grab: l.x > 0 ? 0 : Math.PI }; }
    else { S.mode = 'ruler-move'; S.drag = { dx: S.ruler.x - p.x, dy: S.ruler.y - p.y }; }
    shell.style.cursor = 'grabbing';
  }
  function moveRuler(p) {
    var r = S.ruler;
    if (S.mode === 'ruler-move') { r.x = clamp(p.x + S.drag.dx, 0, W); r.y = clamp(p.y + S.drag.dy, 0, H); }
    else {
      var a = Math.atan2(p.y - r.y, p.x - r.x) - S.drag.grab, deg = a * 180 / Math.PI, near = Math.round(deg / 15) * 15;
      if (Math.abs(deg - near) < 2.5) a = near * Math.PI / 180;
      r.a = Math.atan2(Math.sin(a), Math.cos(a));
    }
    S.dirtyOv = true; schedule();
  }

  /* ---------- pointer input (mouse, touch and pen) ---------- */
  function touchCount() { return Object.keys(touches).length; }
  function beginGesture() {
    cancelDrawing(); S.pan = null;
    var ids = Object.keys(touches), a = touches[ids[0]], b = touches[ids[1]];
    S.gesture = { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)) };
  }
  function doGesture() {
    var ids = Object.keys(touches), a = touches[ids[0]], b = touches[ids[1]];
    if (!a || !b || !S.gesture) return;
    var g = S.gesture, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
    if (Math.abs(d / g.d - 1) > 0.02) { setScale(S.scale * d / g.d, cx, cy); S.fit = false; g.d = d; }
    shell.scrollLeft -= cx - g.cx; shell.scrollTop -= cy - g.cy;
    g.cx = cx; g.cy = cy;
  }
  function onDown(e) {
    if (!editing()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (S.drawer) closeDrawers(true);                   // starting to draw always clears the drawers away
    if (e.pointerType === 'pen') { S.penDown = true; S.penAt = Date.now(); }
    else if (e.pointerType === 'touch') {
      if (S.penDown || Date.now() - S.penAt < 450) return;   // palm rejection: a resting hand never draws while the stylus works
      touches[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (touchCount() === 2) { e.preventDefault(); beginGesture(); return; }
      if (S.gesture) return;
      if (S.touchPan) {                                  // "Хөдөлгөх": one finger pans the paper, two fingers zoom
        if (S.mode) return;
        e.preventDefault();
        try { cvMain.setPointerCapture(e.pointerId); } catch (_) {}
        S.pan = { id: e.pointerId, x: e.clientX, y: e.clientY, sl: shell.scrollLeft, st: shell.scrollTop };
        return;
      }
    }
    if (S.mode) return;
    e.preventDefault();
    cvMain.focus({ preventScroll: true });
    try { cvMain.setPointerCapture(e.pointerId); } catch (_) {}
    S.pointer = e.pointerId;
    var p = toCanvas(e);
    S.cursor = p;
    if (S.tool === 'pen') startPen(p);
    else if (S.tool === 'erase') startErase(p);
    else if (S.tool === 'select') startSelect(p, e);
    else if (S.tool === 'ruler') startRuler(p);
    if (!S.mode) S.pointer = null; else updateUI();
    S.dirtyOv = true; schedule();
  }
  function onMove(e) {
    if (!editing()) return;
    if (e.pointerType === 'touch' && touches[e.pointerId]) {
      touches[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (S.gesture) { e.preventDefault(); doGesture(); return; }
      if (S.pan && S.pan.id === e.pointerId) {
        e.preventDefault();
        shell.scrollLeft = S.pan.sl - (e.clientX - S.pan.x); shell.scrollTop = S.pan.st - (e.clientY - S.pan.y);
        return;
      }
    }
    var rect = cvMain.getBoundingClientRect();
    if (S.tool === 'erase') { S.cursor = toCanvas(e, rect); S.dirtyOv = true; schedule(); }
    if (!S.mode || e.pointerId !== S.pointer) return;
    e.preventDefault();
    var p;
    if (S.mode === 'pen') {
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (!evs || !evs.length) evs = [e];
      for (var i = 0; i < evs.length; i++) addPenPoint(toCanvas(evs[i], rect));
      return;
    }
    p = toCanvas(e, rect);
    if (S.mode === 'snap') { var l = rulerLocal(p); S.snap.b = rulerEdgePoint(S.snap.edge, l.x); S.dirtyOv = true; schedule(); }
    else if (S.mode === 'erase') eraseTo(p);
    else if (S.mode === 'move' || S.mode === 'scale' || S.mode === 'band') moveSelect(p);
    else if (S.mode === 'ruler-move' || S.mode === 'ruler-rot') moveRuler(p);
  }
  function onUp(e) {
    if (e.pointerType === 'pen') { S.penDown = false; S.penAt = Date.now(); }
    if (e.pointerType === 'touch') {
      delete touches[e.pointerId];
      if (S.pan && S.pan.id === e.pointerId) { S.pan = null; try { cvMain.releasePointerCapture(e.pointerId); } catch (_) {} return; }
      if (S.gesture) { if (touchCount() < 2) S.gesture = null; return; }
    }
    if (!S.mode || e.pointerId !== S.pointer) return;
    var mode = S.mode, p = e.type === 'pointercancel' ? null : toCanvas(e);
    S.pointer = null;
    try { cvMain.releasePointerCapture(e.pointerId); } catch (_) {}
    if (e.type === 'pointercancel' && mode !== 'move' && mode !== 'scale') { cancelDrawing(); return; }
    if (mode === 'pen') { S.mode = ''; finishPen(p); }
    else if (mode === 'snap') { S.mode = ''; if (p) { var l = rulerLocal(p); S.snap.b = rulerEdgePoint(S.snap.edge, l.x); } finishSnap(); }
    else if (mode === 'erase') { S.mode = ''; finishErase(); }
    else if (mode === 'move' || mode === 'scale' || mode === 'band') { if (e.type === 'pointercancel') { S.drag.moved = false; } finishSelect(); }
    else if (mode === 'ruler-move' || mode === 'ruler-rot') { S.mode = ''; S.drag = null; saveRuler(); shell.style.cursor = 'grab'; }
    S.dirtyOv = true; updateUI(); schedule();
  }
  // the whole screen is the drawing surface: the margins around the paper accept the pen too (strokes clamp to the paper edge)
  shell.addEventListener('pointerdown', onDown);
  shell.addEventListener('pointermove', onMove);
  shell.addEventListener('pointerup', onUp);
  shell.addEventListener('pointercancel', onUp);
  shell.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && S.tool === 'erase' && !S.mode) { S.cursor = null; S.dirtyOv = true; schedule(); } });
  shell.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  shell.addEventListener('dblclick', function (e) { e.preventDefault(); });

  /* ---------- zoom and layout ---------- */
  /* The drawing area (the shell) is the whole screen above the toolbar. In immersive mode the paper COVERS it edge to edge:
     a board made on this screen has the screen's shape, so the paper is exactly the area; an older 1600 x 900 sheet (or one made
     on another screen) is scaled up until it covers the area and the overflow is reached by panning (wheel, two fingers, "Хөдөлгөх").
     "Бүтнээр харах" shows the whole sheet instead. */
  function stageSize(w, h) {
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
  }
  function setScale(s, cx, cy) {
    s = clamp(Math.round(s * 100) / 100, 0.2, 3);
    var rect = cvMain.getBoundingClientRect(), ax = cx != null ? (cx - rect.left) / S.scale : null, ay = cy != null ? (cy - rect.top) / S.scale : null;
    S.scale = s;
    stageSize(Math.round(W * s), Math.round(H * s));
    if (ax != null) { var r2 = cvMain.getBoundingClientRect(); shell.scrollLeft += r2.left + ax * s - cx; shell.scrollTop += r2.top + ay * s - cy; }
    applyRes(); S.dirtyOv = true; schedule(); syncDesk();
    $('boardZoomValue').textContent = Math.round(s * 100) + '%';
  }
  function fitMetrics() {
    var cs = getComputedStyle(shell);
    return { aw: shell.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah: shell.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) };
  }
  function fit(mode) {                           // mode: 'cover' | 'contain'; none = what suits the window (cover when immersive)
    if (!editing()) return;
    var m = mode || S.fitMode || (S.immersive ? 'cover' : 'contain'), a = fitMetrics(), aw = a.aw, ah = a.ah;
    if (aw < 50 || ah < 50) return;
    var kx = aw / W, ky = ah / H, k, sw, sh;
    if (m === 'cover') {
      k = Math.max(kx, ky);
      if (Math.abs(kx / ky - 1) <= 0.012) { sw = aw; sh = ah; }            // same shape as the screen: the paper IS the area (scale differs by < 1.2 %)
      else { sw = Math.max(aw, Math.ceil(W * k - 0.01)); sh = Math.max(ah, Math.ceil(H * k - 0.01)); }
    } else { k = Math.floor(Math.min(kx, ky) * 100) / 100; sw = Math.round(W * k); sh = Math.round(H * k); }
    k = clamp(k, 0.1, 6);
    S.fit = true; S.fitMode = mode || S.fitMode;
    S.scale = k; stageSize(sw, sh);
    if (m === 'cover') { shell.scrollLeft = Math.max(0, (shell.scrollWidth - shell.clientWidth) / 2); shell.scrollTop = Math.max(0, (shell.scrollHeight - shell.clientHeight) / 2); }
    applyRes(); S.dirtyOv = true; schedule(); syncDesk();
    $('boardZoomValue').textContent = Math.round(k * 100) + '%';
  }
  function zoomBy(f) { S.fit = false; var r = shell.getBoundingClientRect(); setScale(S.scale * f, r.left + r.width / 2, r.top + r.height / 2); }
  /* The area around the paper is painted with the same grid / lines / colour as the paper (CSS pattern aligned to the stage),
     so the board reads as one surface that fills the whole screen. */
  function syncDesk() {
    if (!stage.isConnected) return;
    var sr = shell.getBoundingClientRect(), gr = stage.getBoundingClientRect();
    shell.style.setProperty('--bd-s', String(S.scale));
    shell.style.setProperty('--bd-x', r1(gr.left - sr.left + shell.scrollLeft) + 'px');
    shell.style.setProperty('--bd-y', r1(gr.top - sr.top + shell.scrollTop) + 'px');
  }
  function fitToolbar() {                       // one row when the three groups fit side by side (centre group truly centred), otherwise two rows
    var tb = $('boardToolbar'), ed = $('boardEditor'), g = tb.children;
    if (g.length < 3) return;
    ed.classList.remove('tb-two');
    var cs = getComputedStyle(tb), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), gap = parseFloat(cs.columnGap) || 10;
    var need = Math.max(g[0].scrollWidth, g[2].scrollWidth) * 2 + g[1].scrollWidth + gap * 2 + pad;
    if (need > ed.clientWidth + 0.5) ed.classList.add('tb-two');
  }
  function measureToolbar() {
    fitToolbar();
    var h = Math.ceil($('boardToolbar').getBoundingClientRect().height) || 0;
    if (h && h !== S.tbH) { S.tbH = h; $('boardEditor').style.setProperty('--bt-h', h + 'px'); }
  }
  function relayout() {
    if (!editing()) return;
    measureToolbar();
    if (S.fit) fit(); else syncDesk();
  }
  function relayoutSoon() {
    if (S.layoutRaf) return;
    S.layoutRaf = requestAnimationFrame(function () { S.layoutRaf = 0; relayout(); });
  }

  /* ---------- pages ---------- */
  function goPage(i) {
    if (!S.board || i < 0 || i >= S.board.pages.length || i === S.cur || S.mode) return;
    S.cur = i; S.sel = []; S.dirtyBg = S.dirtyMain = S.dirtyOv = S.dirtyThumbs = true; updateUI(); schedule();
    announce(page().title);
  }
  function addPage() {
    if (S.mode) return;
    if (S.board.pages.length >= (S.limits ? S.limits.maxPages : 100)) { C.toast(T('board.maxPages', 'Хуудасны тоо дээд хязгаарт хүрсэн байна'), 'error'); return; }
    var pages = S.board.pages.slice();
    pages.splice(S.cur + 1, 0, { id: uid(), title: T('board.pageName', 'Хуудас {n}', { n: pages.length + 1 }), background: page().background, objects: [] });
    commit(pages, S.cur + 1);
  }
  function deletePage() {
    if (S.board.pages.length < 2 || S.mode) return;
    var go = function () {
      var pages = S.board.pages.slice(); pages.splice(S.cur, 1);
      commit(pages, Math.min(S.cur, pages.length - 1));
    };
    if (!page().objects.length) { go(); return; }
    C.confirm({ title: T('board.deletePageTitle', 'Энэ хуудсыг устгах уу?'), text: T('board.deletePageText', 'Хуудасны бүх зураглал устна. «Буцаах» товчоор сэргээж болно.'), ok: T('board.delete', 'Устгах'), danger: true }).then(function (yes) { if (yes) go(); });
  }
  function setBackground(name) {
    if (name === page().background) return;
    var pages = S.board.pages.slice(), p = pages[S.cur];
    pages[S.cur] = { id: p.id, title: p.title, background: name, objects: p.objects };
    if (name === 'dark' && S.color === '#182d25') { S.color = '#ffffff'; pref(true); }
    else if (name !== 'dark' && S.color === '#ffffff' && p.background === 'dark') { S.color = '#182d25'; pref(true); }
    commit(pages, null, true); S.dirtyBg = true; schedule(); updateUI();
  }
  function thumbFor(rec) {
    var cached = thumbCache && thumbCache.get(rec);
    if (cached) return cached;
    var cv = document.createElement('canvas'), ready = true;
    cv.width = 214; cv.height = 120; cv.setAttribute('aria-hidden', 'true');
    var c = cv.getContext('2d'), k = Math.min(214 / W, 120 / H), tx = (214 - W * k) / 2, ty = (120 - H * k) / 2;
    if (tx > 0.5 || ty > 0.5) { c.fillStyle = '#cfd6cb'; c.fillRect(0, 0, 214, 120); }   // paper of another shape: centred in the thumbnail box
    c.translate(tx, ty); c.scale(k, k); c.beginPath(); c.rect(0, 0, W, H); c.clip(); paintPage(c, rec, true);
    rec.objects.forEach(function (o) { if (o.type === 'image') { var it = imgItem(o); if (it && !it.ok && !it.err) ready = false; } });
    if (ready && thumbCache) thumbCache.set(rec, cv);
    return cv;
  }
  function renderPages() {
    if (!editing()) return;
    var box = $('boardPages'), frag = document.createDocumentFragment();
    S.board.pages.forEach(function (rec, i) {
      var b = document.createElement('button'), label = document.createElement('span');
      b.type = 'button'; b.className = 'board-page-thumb' + (i === S.cur ? ' on' : ''); b.setAttribute('aria-pressed', String(i === S.cur));
      label.setAttribute('data-user-content', ''); label.setAttribute('translate', 'no'); label.textContent = (i + 1) + '. ' + rec.title;
      b.appendChild(thumbFor(rec)); b.appendChild(label);
      b.onclick = function () { goPage(i); };
      frag.appendChild(b);
    });
    box.innerHTML = ''; box.appendChild(frag);
    var on = box.querySelector('.on');   // keep the active page visible inside the strip only (never scroll the window)
    if (on) {
      var br = box.getBoundingClientRect(), tr = on.getBoundingClientRect();
      if (tr.left < br.left) box.scrollLeft -= br.left - tr.left + 16; else if (tr.right > br.right) box.scrollLeft += tr.right - br.right + 16;
    }
  }

  /* ---------- album images ---------- */
  function placeImage(item) {
    var finish = function (nw, nh) {
      var k = Math.min(3, Math.min(700, W * 0.44) / nw, Math.min(460, H * 0.51) / nh), w = Math.max(20, r1(nw * k)), h = Math.max(20, r1(nh * k));
      var rect = stage.getBoundingClientRect(), srect = shell.getBoundingClientRect();
      var cx = (srect.left + srect.width / 2 - rect.left) / S.scale, cy = (srect.top + srect.height / 2 - rect.top) / S.scale;
      var o = { id: uid(), type: 'image', name: item.name, url: item.url, thumb: item.thumb, missing: false, x: r1(clamp(cx - w / 2, 0, Math.max(0, W - w))), y: r1(clamp(cy - h / 2, 0, Math.max(0, H - h))), width: w, height: h };
      S.tool = 'select';
      setObjects(objects().concat([o]), true);
      S.sel = [o.id]; updateUI(); S.dirtyOv = true; schedule();
      announce(T('board.imageAdded', 'Зураг нэмэгдлээ'));
    };
    if (item.w > 0 && item.h > 0) { finish(item.w, item.h); return; }
    var im = new Image();
    im.onload = function () { finish(im.naturalWidth || 400, im.naturalHeight || 300); };
    im.onerror = function () { finish(400, 300); };
    im.src = item.url;
  }
  function openPicker() {
    if (!C.state.member) { gate(); return; }
    if (S.picker) return;
    var m = C.openModal('<div class="board-picker"><h3 data-i18n="board.pickTitle">Цомгоос зураг сонгох</h3><label class="board-search"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input type="search" autocomplete="off" placeholder="Зургийн нэрээр хайх" data-i18n-placeholder="board.pickSearch" aria-label="Зургийн нэрээр хайх" data-i18n-aria-label="board.pickSearch" autofocus></label><p class="board-picker-note" role="status" aria-live="polite"></p><div class="board-picker-grid"></div><div class="actions"><button type="button" class="btn btn-ghost" data-close data-i18n="board.cancel">Цуцлах</button></div></div>', { wide: true, onClose: function () { S.picker = null; } });
    S.picker = m;
    var note = m.el.querySelector('.board-picker-note'), grid = m.el.querySelector('.board-picker-grid'), input = m.el.querySelector('input'), items = [], gen = ++S.gen, total = 0, done = false;
    note.textContent = T('board.pickLoading', 'Цомгийн зургийг ачаалж байна…');
    function card(item) {
      var b = document.createElement('button'), im = document.createElement('img'), sp = document.createElement('span');
      b.type = 'button'; b.className = 'board-pick-image'; im.alt = ''; im.loading = 'lazy'; im.src = item.thumb || item.url;
      sp.setAttribute('data-user-content', ''); sp.setAttribute('translate', 'no'); sp.textContent = item.original || item.name; b.title = item.original || item.name;
      b.appendChild(im); b.appendChild(sp);
      b.onclick = function () { m.close(); placeImage(item); };
      item._el = b; return b;
    }
    function filter() {
      var q = input.value.trim().toLowerCase(), shown = 0;
      items.forEach(function (it) { var on = !q || (it.original || it.name).toLowerCase().indexOf(q) >= 0; it._el.hidden = !on; if (on) shown++; });
      if (done) note.textContent = !items.length ? T('board.pickEmpty', 'Цомогт зураг алга. Эхлээд цомогт зураг нэмнэ үү.') : !shown ? T('board.pickNone', 'Тохирох зураг олдсонгүй') : T('board.pickCount', '{count} зураг', { count: shown });
    }
    input.oninput = filter;
    (function load(offset) {
      api('media', { query: { type: 'image', limit: 200, offset: offset } }).then(function (d) {
        if (S.picker !== m || gen !== S.gen) return;
        total = d.total || 0;
        (d.items || []).forEach(function (it) {
          if (IMAGE_EXT.indexOf(String(it.ext || '').toLowerCase()) < 0) return;
          items.push(it); grid.appendChild(card(it));
        });
        if ((d.items || []).length && offset + d.items.length < total && items.length < 2000) { filter(); load(offset + d.items.length); }
        else { done = true; filter(); }
      }).catch(function (e) { if (S.picker !== m) return; if (e.status === 401) { m.close(); gate(); return; } note.textContent = e.message; });
    })(0);
  }

  /* ---------- export ---------- */
  function exportPng() {
    if (!editing()) return;
    var cv = document.createElement('canvas'), rec = { background: page().background, objects: objects() };
    var k = Math.min(2, MAX_CANVAS / Math.max(W, H), Math.sqrt(MAX_PX * 2 / (W * H)));
    cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    var c = cv.getContext('2d'); c.scale(cv.width / W, cv.height / H); paintPage(c, rec, true);
    var name = (S.board.title + ' - ' + page().title).replace(/[\\\/:*?"<>|\u0000-\u001f]+/g, '-').slice(0, 80) + '.png';
    cv.toBlob(function (blob) {
      if (!blob) { C.toast(T('board.exportFail', 'PNG үүсгэж чадсангүй'), 'error'); return; }
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }, 'image/png');
  }

  /* ---------- dialogs ---------- */
  function askText(o) {
    var m = C.openModal('<form class="board-title-form" novalidate><h3></h3><input class="input" type="text" autocomplete="off" autofocus><p class="board-form-error" role="alert"></p><div class="actions"><button type="button" class="btn btn-ghost" data-close data-i18n="board.cancel">Цуцлах</button><button type="submit" class="btn btn-primary" data-i18n="board.ok">Болсон</button></div></form>');
    var form = m.el.querySelector('form'), input = form.querySelector('input'), err = form.querySelector('.board-form-error'), btn = form.querySelector('[type=submit]');
    form.querySelector('h3').textContent = o.title; input.value = o.value || ''; input.maxLength = o.max || 120; input.setAttribute('aria-label', o.title);
    setTimeout(function () { input.focus(); input.select(); }, 40);
    form.onsubmit = function (ev) {
      ev.preventDefault();
      var v = input.value.trim();
      if (!v && !o.allowEmpty) { err.textContent = T('board.nameRequired', 'Нэрээ бичнэ үү'); input.focus(); return; }
      btn.disabled = true; err.textContent = '';
      Promise.resolve(o.onSubmit(v)).then(function () { m.close(); }).catch(function (e) { err.textContent = e.message || String(e); btn.disabled = false; });
    };
  }

  /* ---------- boards: list, open, create, delete ---------- */
  function listStatus(text, error) { var el = $('boardCollectionStatus'); el.textContent = text || ''; el.style.color = error ? 'var(--danger,#ba4743)' : ''; }
  function dateText(ts) {
    var d = new Date(ts * 1000);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(window.C122I18n ? window.C122I18n.locale() : 'mn-MN', { timeZone: 'Asia/Ulaanbaatar', month: 'short', day: 'numeric' });
  }
  function renderCards() {
    var box = $('boardCards'), q = S.search.trim().toLowerCase(), rows = S.list.filter(function (b) { return !q || b.title.toLowerCase().indexOf(q) >= 0; });
    box.innerHTML = '';
    if (!rows.length) {
      var e = document.createElement('div'); e.className = 'board-empty';
      e.innerHTML = '<b></b><span></span>';
      e.firstChild.textContent = S.list.length ? T('board.noMatch', 'Тохирох самбар олдсонгүй') : T('board.emptyTitle', 'Одоогоор самбар алга');
      e.lastChild.textContent = S.list.length ? '' : T('board.emptyText', '«Шинэ самбар» товчийг дарж эхлээрэй.');
      box.appendChild(e); return;
    }
    rows.forEach(function (b) {
      var el = document.createElement('button'); el.type = 'button'; el.className = 'board-card';
      el.innerHTML = '<div class="board-card-paper" aria-hidden="true"><span></span></div><div class="board-card-info"><h3 data-user-content translate="no"></h3><p><span class="pc"></span><span class="dt"></span></p></div>';
      el.querySelector('.board-card-paper span').textContent = (Array.from(b.title)[0] || '✎').toUpperCase();
      el.querySelector('h3').textContent = b.title;
      el.querySelector('.pc').textContent = T('board.pageCount', '{count} хуудас', { count: b.pageCount });
      el.querySelector('.dt').textContent = dateText(b.updated);
      el.onclick = function () { S.gestureAt = Date.now(); openById(b.id); };
      box.appendChild(el);
    });
  }
  function loadList() {
    listStatus(T('board.loading', 'Ачаалж байна…'));
    $('boardRefresh').disabled = true;
    return api('board_list').then(function (d) {
      S.list = d.boards || []; S.limits = d.limits || null; listStatus(''); renderCards();
    }).catch(function (e) { if (e.status === 401) { gate(); return; } listStatus(e.message, true); }).then(function () { $('boardRefresh').disabled = false; });
  }
  function paperSide(v, def) { v = Math.round(Number(v)); return v >= MIN_SIDE && v <= MAX_SIDE ? v : def; }
  /* The paper of a NEW board takes the shape of the drawing area the editor will have on this screen: short side 900 logical units
     (like the 1600 x 900 sheets), long side from the screen's aspect ratio (limited to 1 : 2 ... 2.4 : 1). */
  function paperFor(aw, ah) {
    var a = clamp(aw / Math.max(1, ah), 0.5, 2.4);
    return a >= 1 ? { w: Math.round(900 * a), h: 900 } : { w: 900, h: Math.round(900 / a) };
  }
  function probeArea() {   // lays the editor out immersive for one synchronous moment (nothing is painted) to measure the real area above the toolbar
    var ed = $('boardEditor'), wasHidden = ed.hidden, hadBody = BODY.classList.contains('board-immersive'), hadRoot = DOC.classList.contains('board-immersive-root'), w = 0, h = 0, sy = window.pageYOffset || 0;
    try {
      ed.hidden = false; BODY.classList.add('board-immersive'); DOC.classList.add('board-immersive-root');
      measureToolbar();
      w = ed.clientWidth; h = ed.clientHeight - (S.tbH || 72);
    } catch (_) { w = 0; }
    ed.hidden = wasHidden;
    if (!hadBody) BODY.classList.remove('board-immersive');
    if (!hadRoot) DOC.classList.remove('board-immersive-root');
    if (sy && (window.pageYOffset || 0) !== sy) { try { window.scrollTo(0, sy); } catch (_) {} }
    if (!(w >= 200 && h >= 150)) { w = window.innerWidth; h = window.innerHeight - 76; }
    return paperFor(w, h);
  }
  function normalize(b) {
    return {
      id: b.id, title: b.title, revision: b.revision, width: paperSide(b.width, DEF_W), height: paperSide(b.height, DEF_H),
      pages: b.pages.map(function (p) {
        return {
          id: p.id, title: p.title, background: p.background || 'plain',
          objects: p.objects.map(function (o) {
            if (o.type === 'stroke') return { id: o.id, type: 'stroke', tool: o.tool || 'pen', color: o.color, width: o.width, points: o.points.map(function (q) { return [q[0], q[1]]; }) };
            return { id: o.id, type: 'image', name: o.name, url: o.url || null, thumb: o.thumb || null, missing: !!o.missing, x: o.x, y: o.y, width: o.width, height: o.height };
          }).filter(function (o) { return o.type === 'stroke' || o.type === 'image'; })
        };
      })
    };
  }
  function openBoard(data) {
    var reopen = editing();                     // "reload from server" / "save a copy" keep whatever mode the person chose
    try {
      S.board = normalize(data); W = S.board.width; H = S.board.height; S.res = 0;
      if (S.rulerSaved) { S.ruler.x = clamp(S.ruler.x, 0, W); S.ruler.y = clamp(S.ruler.y, 0, H); } else { S.ruler.x = Math.round(W / 2); S.ruler.y = Math.round(H * 0.82); }
      S.cur = 0; S.hist = []; S.redo = []; S.sel = []; S.dirty = false; S.saving = false; S.conflict = false; S.conflictBoard = null; S.errorText = ''; S.req = null;
      S.draft = null; S.live = null; S.liveDone = []; S.mode = ''; S.drag = null; S.hide = null; S.snap = null; S.gen++;
      closeDrawers(true);
      $('boardConflict').hidden = true; $('boardHome').hidden = true; $('boardEditor').hidden = false;
      S.dirtyBg = S.dirtyMain = S.dirtyOv = S.dirtyThumbs = true;
      if (!reopen) S.windowed = false;
      S.fit = true; S.fitMode = '';
      if (!S.windowed) setImmersive(true);      // site header / footer / paddings disappear, the editor fills the screen
      if (!reopen && activationOk()) requestFs();   // best effort: browser fullscreen on the click that opened the board
      updateUI(); startClock(); relayout();
      requestAnimationFrame(function () { relayout(); applyRes(true); fit(); renderPages(); S.dirtyThumbs = false; try { cvMain.focus({ preventScroll: true }); } catch (_) {} });
    } catch (err) {                             // never leave the site stuck without its header
      try { endEditing(); } catch (_) {}
      listStatus(T('board.openFailed', 'Самбарыг нээж чадсангүй'), true);
      if (window.console) console.error(err);
    }
  }
  function openById(id) {
    listStatus(T('board.opening', 'Самбарыг нээж байна…'));
    api('board_get', { query: { id: id } }).then(function (d) { listStatus(''); openBoard(d.board); }).catch(function (e) { listStatus(e.message, true); });
  }
  function endEditing() {                       // back to the board list: the normal site chrome returns
    closeDrawers(true); stopClock();
    S.windowed = false; S.board = null;
    leaveImmersive();
    $('boardEditor').hidden = true; $('boardHome').hidden = false; $('boardConflict').hidden = true;
  }
  function closeBoard() {
    flush().then(function () {
      if (S.dirty && !S.conflict) { C.toast(T('board.stillUnsaved', 'Хадгалагдаагүй өөрчлөлт байна. Дахин оролдоно уу.'), 'error'); return; }
      endEditing(); loadList();
    });
  }
  function newBoard() {
    askText({ title: T('board.newBoardTitle', 'Шинэ самбарын нэр'), value: T('board.defaultTitle', 'Самбар'), max: 160, onSubmit: function (title) {
      S.gestureAt = Date.now();
      return settleFullscreen().then(function () {
        var paper = probeArea();
        return api('board_create', { body: { requestId: uid() + uid(), title: title, width: paper.w, height: paper.h } });
      }).then(function (d) { openBoard(d.board); }, function (e) { if (!editing()) exitFs(); throw e; });
    } });
  }
  function settleFullscreen() {                 // the board asks for browser fullscreen: wait until the screen has its final shape before the paper is sized
    if (fsElement() || !fsSupported() || !activationOk()) return Promise.resolve();
    return requestFs(true).then(function (ok) { return ok ? new Promise(function (done) { setTimeout(done, 280); }) : null; });
  }
  function renameBoard() {
    askText({ title: T('board.renameBoard', 'Самбарын нэрийг өөрчлөх'), value: S.board.title, max: 160, onSubmit: function (title) { S.board.title = title; planSave(); updateUI(); return Promise.resolve(); } });
  }
  function renamePage() {
    askText({ title: T('board.renamePage', 'Хуудасны нэрийг өөрчлөх'), value: page().title, max: 120, onSubmit: function (title) {
      var pages = S.board.pages.slice(), p = pages[S.cur];
      pages[S.cur] = { id: p.id, title: title, background: p.background, objects: p.objects };
      commit(pages, null, true); S.dirtyThumbs = true; return Promise.resolve();
    } });
  }
  function deleteBoard() {
    C.confirm({ title: T('board.deleteBoardTitle', 'Энэ самбарыг устгах уу?'), text: T('board.deleteBoardText', 'Бүх хуудас бүрмөсөн устах бөгөөд сэргээх боломжгүй.'), ok: T('board.delete', 'Устгах'), danger: true }).then(function (yes) {
      if (!yes || !S.board) return;
      var b = S.board;
      api('board_delete', { body: { id: b.id, revision: b.revision } }).then(function () {
        clearTimeout(S.saveTimer); S.dirty = false; endEditing();
        loadList(); C.toast(T('board.deletedBoard', 'Самбар устгагдлаа'));
      }).catch(function (e) {
        if (e.status === 409 && e.data && e.data.conflict) onConflict(e.data.board); else C.toast(e.message, 'error');
      });
    });
  }
  function clearPage() {
    if (!page().objects.length || S.mode) return;
    C.confirm({ title: T('board.clearTitle', 'Хуудсыг цэвэрлэх үү?'), text: T('board.clearText', 'Хуудасны бүх зураглал арилна. «Буцаах» товчоор сэргээж болно.'), ok: T('board.clear', 'Цэвэрлэх'), danger: true }).then(function (yes) { if (yes && S.board) setObjects([]); });
  }
  function reloadFromServer() {
    var sb = S.conflictBoard;
    if (!sb) { var id = S.board.id; api('board_get', { query: { id: id } }).then(function (d) { openBoard(d.board); }).catch(function (e) { C.toast(e.message, 'error'); }); return; }
    openBoard(sb);
  }
  function saveCopy() {
    if (!S.board) return;
    var b = S.board, pages = serialize(b.pages), btn = (A.saveCopy || [])[0] || { disabled: false };
    btn.disabled = true;
    api('board_create', { body: { requestId: uid() + uid(), title: (b.title + ' (' + T('board.copy', 'хуулбар') + ')').slice(0, 160), width: b.width, height: b.height } }).then(function (d) {
      return api('board_save', { body: { id: d.board.id, revision: d.board.revision, requestId: uid() + uid(), title: d.board.title, pages: pages } });
    }).then(function (d) { C.toast(T('board.copySaved', 'Хуулбар хадгалагдлаа')); openBoard(d.board); loadList(); })
      .catch(function (e) { C.toast(e.message, 'error'); }).then(function () { btn.disabled = false; });
  }

  /* ---------- immersive (edge-to-edge) mode and browser fullscreen ---------- */
  var DOC = document.documentElement, BODY = document.body;
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function fsSupported() { return !!((DOC.requestFullscreen || DOC.webkitRequestFullscreen) && document.fullscreenEnabled !== false); }
  function activationOk() {
    try { if (navigator.userActivation) return !!navigator.userActivation.isActive; } catch (_) {}
    return Date.now() - S.gestureAt < 3500;
  }
  function requestFs(keep) {                    // resolves true when the page is fullscreen afterwards; refusal is silent. keep = a board is about to open
    if (fsElement() || !fsSupported()) return Promise.resolve(!!fsElement());
    var fn = DOC.requestFullscreen || DOC.webkitRequestFullscreen;
    try {
      return Promise.resolve(fn.call(DOC, { navigationUI: 'hide' })).then(function () {
        S.fsMine = true;
        if (!keep && !S.immersive && !S.windowed && !editing()) exitFs();   // the board was closed while the browser was deciding
        return true;
      }, function () { return false; });
    } catch (_) { return Promise.resolve(false); }
  }
  function exitFs() {                           // only leaves fullscreen when this editor entered it
    if (!S.fsMine) return;
    S.fsMine = false;
    if (!fsElement()) return;
    var fn = document.exitFullscreen || document.webkitExitFullscreen;
    try { var pr = fn && fn.call(document); if (pr && pr.catch) pr.catch(noop); } catch (_) {}
  }
  function toggleFs() {                         // the Menu toggle: the person explicitly asked, so any fullscreen can be left
    if (fsElement()) { S.fsMine = true; exitFs(); return; }
    requestFs().then(function (ok) { if (!ok) C.toast(T('board.fullscreenFail', 'Бүтэн дэлгэц нээгдсэнгүй. Дахин оролдоно уу.'), 'error'); });
  }
  function onFsChange() {
    if (!fsElement()) S.fsMine = false;
    syncModeUI();
    setTimeout(relayoutSoon, 90);
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (n) { document.addEventListener(n, onFsChange); });

  function setImmersive(on) {
    on = !!on;
    S.immersive = on;
    BODY.classList.toggle('board-immersive', on);
    DOC.classList.toggle('board-immersive-root', on);
    if (on) { try { window.scrollTo(0, 0); } catch (_) {} }
    S.fit = true; S.fitMode = '';
    syncModeUI();
    if (editing()) { relayoutSoon(); setTimeout(relayoutSoon, 120); }
  }
  function leaveImmersive() {                   // closing the editor / leaving the tab: site chrome back, browser fullscreen off
    if (S.immersive || BODY.classList.contains('board-immersive')) setImmersive(false);
    exitFs();
  }
  function toggleImmersive() {                  // Menu: "back to the site" shows the normal header with the board still open
    if (S.immersive) { S.windowed = true; setImmersive(false); }
    else { S.windowed = false; setImmersive(true); }
  }
  function syncModeUI() {
    var fs = !!fsElement(), imm = S.immersive;
    var fb = $('boardFullscreen'), use = fb.querySelector('use');
    fb.setAttribute('aria-pressed', String(fs));
    $('boardFullscreenLabel').textContent = fs ? T('board.exitFullscreen', 'Бүтэн дэлгэцээс гарах') : T('board.fullscreen', 'Бүтэн дэлгэц');
    if (use) use.setAttribute('href', fs ? '#i-compress' : '#i-expand');
    fb.hidden = !fsSupported() && !fs;
    $('boardImmersiveLabel').textContent = imm ? T('board.backToSite', 'Сайт руу буцах') : T('board.fillScreen', 'Самбарыг дэлгэц дүүрэн болгох');
    $('boardEditor').dataset.immersive = imm ? '1' : '0';
  }

  /* ---------- clock ---------- */
  var clockFmt = null;
  try { clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Ulaanbaatar' }); } catch (_) { clockFmt = null; }
  function tickClock() {
    var el = $('boardClock'), d = new Date(), txt;
    try { txt = clockFmt ? clockFmt.format(d) : ''; } catch (_) { txt = ''; }
    if (!/^\d\d:\d\d$/.test(txt)) txt = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (el.textContent !== txt) el.textContent = txt;
    el.setAttribute('datetime', txt);
    el.setAttribute('aria-label', T('board.clock', 'Цаг') + ' ' + txt);
  }
  function startClock() { tickClock(); if (!S.clockTimer) S.clockTimer = setInterval(tickClock, 20000); }
  function stopClock() { clearInterval(S.clockTimer); S.clockTimer = 0; }

  /* ---------- drawers (menu, tool settings, view settings, page list) ---------- */
  var DRAWERS = { menu: 'boardMenuDrawer', tools: 'boardToolDrawer', view: 'boardViewDrawer', pages: 'boardPagesSheet' };
  function syncToggles() {
    C.$$('[data-board-drawer-toggle]', root).forEach(function (b) { var on = b.dataset.boardDrawerToggle === S.drawer; b.setAttribute('aria-expanded', String(on)); b.classList.toggle('open', on); });
    $('boardEditor').dataset.drawer = S.drawer;
  }
  function openDrawer(name, byKeyboard, from) {
    if (!DRAWERS[name] || !editing()) return;
    if (S.drawer === name) return;
    closeDrawers(true);
    S.drawer = name; S.focusBack = from || null;
    var el = $(DRAWERS[name]);
    el.classList.add('open');
    if (name === 'pages') { renderPages(); S.dirtyThumbs = false; }
    syncToggles();
    if (byKeyboard) { var f = el.querySelector('button:not([disabled]), input, [tabindex]'); if (f) setTimeout(function () { try { f.focus(); } catch (_) {} }, 30); }
  }
  function closeDrawers(silent) {               // silent = no focus restore (outside tap, drawing started)
    if (!S.drawer) return;
    var back = S.focusBack;
    $(DRAWERS[S.drawer]).classList.remove('open');
    S.drawer = ''; S.focusBack = null;
    syncToggles();
    if (!silent && back && back.focus) { try { back.focus(); } catch (_) {} }
  }
  function toggleDrawer(name, byKeyboard, from) { if (S.drawer === name) closeDrawers(); else openDrawer(name, byKeyboard, from); }
  document.addEventListener('pointerdown', function (e) {   // a tap outside the drawers puts them away; the canvas keeps getting the stroke
    if (!S.drawer || !editing()) return;
    var t = e.target;
    if (t && t.closest && t.closest('.board-drawer, .board-sheet, .board-edge, .board-toolbar, .modal-back')) return;
    closeDrawers(true);
  }, true);

  /* ---------- lock screen, show / hide ---------- */
  function gate() {
    var ok = C.state.member;
    $('boardLock').hidden = ok; $('boardBody').hidden = !ok;
    if (ok) { if (S.pin) { S.pin.destroy(); S.pin = null; } return true; }
    if (!S.pin) S.pin = C.pinPad($('boardPin'), { onSuccess: function () { show(); } });
    return false;
  }
  function show() {
    if (!gate()) return;
    if (S.board) {
      if (!S.windowed) setImmersive(true);
      startClock(); applyRes(true); relayout();
      setTimeout(relayoutSoon, 60);
      S.dirtyBg = S.dirtyMain = S.dirtyOv = true; schedule();
    } else loadList();
  }
  function hide() {
    if (S.mode) cancelDrawing();
    clearTimeout(S.saveTimer);
    if (S.board && S.dirty && C.state.member) save().catch(noop);
    closeDrawers(true); stopClock();
    leaveImmersive();
    if (S.pin) { S.pin.destroy(); S.pin = null; }
  }

  /* ---------- actions ---------- */
  function manualSave() {
    S.dirty = true;
    save().then(function () { C.toast(T('board.savedShort', 'Хадгалагдлаа')); }).catch(function (e) { if (e && e.message) C.toast(e.message, 'error'); });
  }
  function toggleRuler() {
    if (S.ruler.visible) {
      if (S.mode) cancelDrawing();
      S.ruler.visible = false; if (S.tool === 'ruler') S.tool = 'pen';
      announce(T('board.rulerHidden', 'Шугам нуугдлаа')); S.dirtyOv = true; updateUI(); schedule();
    } else setTool('ruler');
  }
  function toggleTouch() {
    if (S.mode) cancelDrawing();
    S.touchPan = !S.touchPan; S.pan = null; updateUI();
    announce(S.touchPan ? T('board.touchPan', 'Хөдөлгөх') : T('board.touchDraw', 'Бичих'));
  }
  function deselect() { S.sel = []; S.dirtyOv = true; updateUI(); schedule(); }
  var ACTS = {
    rename: renameBoard, renamePage: renamePage, save: manualSave, back: closeBoard, album: openPicker, png: exportPng,
    fullscreen: toggleFs, immersive: toggleImmersive, clear: clearPage, delPage: deletePage, delBoard: deleteBoard,
    rulerToggle: toggleRuler, touch: toggleTouch, undo: undo, redo: redo, newPage: addPage,
    prev: function () { goPage(S.cur - 1); }, next: function () { goPage(S.cur + 1); },
    zoomIn: function () { zoomBy(1.25); }, zoomOut: function () { zoomBy(0.8); }, fit: function () { fit('contain'); }, fill: function () { fit('cover'); },
    deselect: deselect, deleteObject: deleteSelected, saveCopy: saveCopy, reload: reloadFromServer,
    closeDrawers: function () { closeDrawers(); }
  };
  var KEEP_OPEN = { fullscreen: 1, rulerToggle: 1, touch: 1, zoomIn: 1, zoomOut: 1, fit: 1, fill: 1, undo: 1, redo: 1, deselect: 1, deleteObject: 1, closeDrawers: 1 };

  /* ---------- wiring ---------- */
  function build() {
    var box = $('boardColors');
    COLORS.forEach(function (color) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'board-swatch'; b.dataset.color = color; b.style.background = color;
      b.setAttribute('aria-label', color); b.title = color; b.setAttribute('aria-pressed', 'false');
      b.onclick = function () { S.color = color; pref(true); updateUI(); };
      box.appendChild(b);
    });
    $('boardColor').oninput = function (e) { S.color = e.target.value.toLowerCase(); pref(true); updateUI(); };
    $('boardWidth').oninput = function (e) {
      var v = Math.round(Number(e.target.value)) || 1;
      if (S.tool === 'erase') S.eraseSize = v; else S.width = v;
      pref(true); $('boardWidthValue').textContent = v; S.dirtyOv = true; schedule();
    };
    C.$$('[data-board-tool]', root).forEach(function (b) {
      b.onclick = function (e) {
        var t = b.dataset.boardTool;
        if (t === S.tool && (t === 'pen' || t === 'erase')) { toggleDrawer('tools', e.detail === 0, b); return; }   // a second tap on the active tool opens its options
        setTool(t);
      };
    });
    C.$$('[data-board-erase]', root).forEach(function (b) { b.onclick = function () { S.eraseMode = b.dataset.boardErase; pref(true); updateUI(); }; });
    C.$$('[data-board-bg]', root).forEach(function (b) { b.onclick = function () { setBackground(b.dataset.boardBg); }; });
    C.$$('[data-board-drawer-toggle]', root).forEach(function (b) { b.onclick = function (e) { toggleDrawer(b.dataset.boardDrawerToggle, e.detail === 0, b); }; });
    C.$$('[data-board-act]', root).forEach(function (b) {
      var name = b.dataset.boardAct, fn = ACTS[name];
      (A[name] = A[name] || []).push(b);
      if (!fn) return;
      b.onclick = function () {
        if (S.drawer === 'menu' && !KEEP_OPEN[name] && b.closest('#boardMenuDrawer')) closeDrawers(true);   // a menu action puts the menu away
        fn();
      };
    });
    $('boardStatusClose').onclick = function () { S.statusHidden = S.statusShown; setStatus(); };
    $('boardNew').onclick = newBoard;
    $('boardRefresh').onclick = loadList;
    $('boardSearch').oninput = function (e) { S.search = e.target.value; renderCards(); };
    shell.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); S.fit = false; setScale(S.scale * (e.deltaY < 0 ? 1.1 : 0.9), e.clientX, e.clientY); } }, { passive: false });
    $('boardEditor').addEventListener('contextmenu', function (e) { var tg = e.target && e.target.tagName; if (tg !== 'INPUT' && tg !== 'TEXTAREA') e.preventDefault(); });
    $('boardEditor').addEventListener('selectstart', function (e) { var tg = e.target && e.target.tagName; if (tg !== 'INPUT' && tg !== 'TEXTAREA') e.preventDefault(); });
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { if (editing() && visible()) relayoutSoon(); }); ro.observe(shell); ro.observe($('boardToolbar')); }
    window.addEventListener('resize', function () { if (editing() && visible()) relayoutSoon(); });
    window.addEventListener('orientationchange', function () { setTimeout(relayoutSoon, 200); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (editing()) relayoutSoon(); });
  }
  document.addEventListener('keydown', function (e) {
    if (!visible() || !editing() || e.defaultPrevented) return;
    if (document.querySelector('.modal-back')) return;
    var t = e.target, tag = t && t.tagName;
    if (e.key === 'Escape' && S.drawer) { e.preventDefault(); closeDrawers(); return; }
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    var key = e.key, low = key.length === 1 ? key.toLowerCase() : key, mod = e.ctrlKey || e.metaKey;
    if (mod) {
      if (low === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (low === 'y') { e.preventDefault(); redo(); }
      else if (low === 's') { e.preventDefault(); manualSave(); }
      else if (low === 'a' && S.tool === 'select') { e.preventDefault(); S.sel = objects().map(function (o) { return o.id; }); S.dirtyOv = true; updateUI(); schedule(); }
      return;
    }
    if ((key === 'Delete' || key === 'Backspace') && S.sel.length && !S.mode) { e.preventDefault(); deleteSelected(); }
    else if (key === 'Escape') { if (S.mode) cancelDrawing(); else if (S.sel.length) deselect(); }
    else if (S.mode) return;
    else if (low === 'p') setTool('pen'); else if (low === 'e') setTool('erase'); else if (low === 'v') setTool('select'); else if (low === 'r') setTool('ruler');
    else if (low === '+' || low === '=') zoomBy(1.25); else if (low === '-') zoomBy(0.8); else if (low === '0') { S.fitMode = ''; fit(); }
  });
  document.addEventListener('c122:auth', function () {
    if (!C.state.member) {
      if (S.mode) cancelDrawing();
      clearTimeout(S.saveTimer); clearTimeout(S.retryTimer);
      S.saving = false; S.dirty = false; S.gen++; S.list = [];
      if (S.picker) S.picker.close();
      endEditing(); $('boardCards').innerHTML = '';
    }
    if (!root.hidden) { gate(); if (C.state.member && !S.board) loadList(); }
  });
  document.addEventListener('c122:tab', function (e) { if (e && e.detail && e.detail.name !== 'board' && (S.immersive || BODY.classList.contains('board-immersive'))) { stopClock(); leaveImmersive(); } });
  document.addEventListener('c122:language', function () { syncModeUI(); if (S.board) { updateUI(); renderPages(); tickClock(); relayoutSoon(); setTimeout(relayoutSoon, 150); } else renderCards(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && S.board && S.dirty && C.state.member) { if (S.mode === 'pen') { /* keep the live stroke */ } save().catch(noop); } });
  window.addEventListener('online', function () { if (S.board && S.dirty && visible()) save().catch(noop); else if (S.board) setStatus(); });
  window.addEventListener('offline', function () { if (S.board) setStatus(); });
  window.addEventListener('beforeunload', function (e) { if (S.board && (S.dirty || S.saving) && !S.conflict) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('pagehide', function () { if (S.immersive) setImmersive(false); });
  window.addEventListener('error', function (e) {   // a crash inside the editor must never leave the site without its header
    var file = String((e && e.filename) || '');
    if ((S.immersive || BODY.classList.contains('board-immersive')) && /board\.js/.test(file)) { try { stopClock(); leaveImmersive(); } catch (_) { BODY.classList.remove('board-immersive'); DOC.classList.remove('board-immersive-root'); } }
  });

  pref(false);
  build();
  C.Board = { show: show, hide: hide, immersive: function () { return S.immersive; } };
})();

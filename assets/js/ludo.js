/* LUDO — local pass-and-play, 2–4 players with their own names and colors.
   Standard rules: roll 6 to leave base, capture on shared non-safe cells, exact roll to finish,
   extra turn on a 6 / capture / finishing a token, three sixes in a row lose the turn.
   Tokens hop cell by cell; the game is autosaved so a reload or tab switch never loses it. */
(function () {
  'use strict';
  var C = window.C122; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var T = function (key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  };
  var sfx = function (n, o) { if (state.visible && !document.hidden && C.SFX) C.SFX.play(n, o); };
  var SETUP_KEY = 'c122:ludo-setup', SAVE_KEY = 'c122:ludo-game';
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function write(key, value) { try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  // 52-cell main track as [row,col] on a 15x15 grid (0 = seat 0 start, clockwise).
  var PATH = [
    [6,1],[6,2],[6,3],[6,4],[6,5],
    [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
    [0,7],
    [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
    [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
    [7,14],
    [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
    [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
    [14,7],
    [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
    [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
    [7,0],
    [6,0]
  ];
  // Seats: 0 = top-left (enters the hub from the left), 1 = top-right (top), 2 = bottom-right (right), 3 = bottom-left (bottom).
  var START = [0, 13, 26, 39];
  var HOME = [
    [[7,1],[7,2],[7,3],[7,4],[7,5]],
    [[1,7],[2,7],[3,7],[4,7],[5,7]],
    [[7,13],[7,12],[7,11],[7,10],[7,9]],
    [[13,7],[12,7],[11,7],[10,7],[9,7]]
  ];
  var CENTER = [[7,6],[6,7],[7,8],[8,7]];   // finished tokens rest in their own triangle
  var YARD_AREA = [[0,0],[0,9],[9,9],[9,0]];
  // Token spots match the four .ludo-nest circles drawn inside each 6x6 yard (see ludo.css padding/gap).
  var NEST = [1.365, 3.635];
  var YARD = YARD_AREA.map(function (a) { return [[a[0] + NEST[0], a[1] + NEST[0]], [a[0] + NEST[0], a[1] + NEST[1]], [a[0] + NEST[1], a[1] + NEST[0]], [a[0] + NEST[1], a[1] + NEST[1]]]; });
  var TRI = ['left','top','right','bottom'];
  var ARROW = ['→','↓','←','↑'];
  var SAFE = { 0:1, 8:1, 13:1, 21:1, 26:1, 34:1, 39:1, 47:1 };
  var SEATS_FOR = { 2:[0,2], 3:[0,1,2], 4:[0,1,2,3] };
  var FINISH = 56;   // progress 0..50 main, 51..55 home column, 56 = center
  var COLORS = [
    { id:'red', hex:'#e5484d', label:'Улаан' },
    { id:'green', hex:'#30a46c', label:'Ногоон' },
    { id:'yellow', hex:'#f0a90b', label:'Шар' },
    { id:'blue', hex:'#3b82f6', label:'Цэнхэр' },
    { id:'purple', hex:'#8e4ec6', label:'Нил ягаан' },
    { id:'pink', hex:'#e93d82', label:'Ягаан' },
    { id:'orange', hex:'#f76b15', label:'Улбар шар' },
    { id:'teal', hex:'#12a594', label:'Оюу' }
  ];
  var MEDALS = ['🏆','🥈','🥉','🎖️'];
  function colorOf(id) { for (var i = 0; i < COLORS.length; i++) if (COLORS[i].id === id) return COLORS[i]; return COLORS[0]; }
  function colorName(id) { return T('ludo.color.' + id, colorOf(id).label); }

  var setup = loadSetup();
  var state = { visible:false, bound:false, started:false, gen:0, players:[], turn:0, dice:0, rolling:false, canRoll:false, sixes:0, movable:[], awaiting:false, animating:false, finished:[], over:false, tokens:{} };

  function loadSetup() {
    var saved = read(SETUP_KEY), out = { count:4, players:[] };
    if (saved && SEATS_FOR[saved.count]) out.count = saved.count;
    for (var i = 0; i < 4; i++) {
      var p = saved && saved.players && saved.players[i] || {};
      out.players.push({ name: typeof p.name === 'string' ? p.name.slice(0, 16) : '', color: COLORS.some(function (c) { return c.id === p.color; }) ? p.color : COLORS[i].id });
    }
    // Repair duplicates (e.g. from an older save).
    out.players.forEach(function (p, i) { if (out.players.slice(0, i).some(function (q) { return q.color === p.color; })) p.color = COLORS.filter(function (c) { return !out.players.some(function (q) { return q.color === c.id; }); })[0].id; });
    return out;
  }
  function saveSetup() { write(SETUP_KEY, setup); }
  function defaultName(i) { return T('ludo.playerN', 'Тоглогч {n}', { n:i + 1 }); }

  /* ---------- geometry ---------- */
  function cellOf(seat, progress) {
    if (progress <= 50) return PATH[(START[seat] + progress) % 52];
    if (progress <= 55) return HOME[seat][progress - 51];
    return CENTER[seat];
  }
  function mainIndex(seat, progress) { return progress >= 0 && progress <= 50 ? (START[seat] + progress) % 52 : -1; }
  function posOf(p, ti) { var prog = p.tokens[ti]; return prog < 0 ? YARD[p.seat][ti] : cellOf(p.seat, prog); }
  function pct(v) { return (v + 0.5) / 15 * 100 + '%'; }

  /* ---------- board ---------- */
  function buildBoard() {
    var board = $('ludoBoard'); if (!board || board.dataset.built) return;
    board.dataset.built = '1';
    YARD_AREA.forEach(function (a, seat) {
      var yard = document.createElement('div');
      yard.className = 'ludo-yard ludo-s' + seat;
      yard.style.gridArea = (a[0] + 1) + ' / ' + (a[1] + 1) + ' / span 6 / span 6';
      yard.innerHTML = '<div class="ludo-yard-inner"><span class="ludo-nest"></span><span class="ludo-nest"></span><span class="ludo-nest"></span><span class="ludo-nest"></span></div><span class="ludo-yard-name" data-i18n-skip></span>';
      board.appendChild(yard);
    });
    PATH.forEach(function (rc, i) {
      var seat = START.indexOf(i), cls = 'ludo-path';
      if (seat >= 0) cls += ' ludo-start ludo-s' + seat; else if (SAFE[i]) cls += ' ludo-safe';
      var cell = addCell(board, rc[0], rc[1], cls);
      if (seat >= 0) cell.setAttribute('data-arrow', ARROW[seat]);
    });
    HOME.forEach(function (cells, seat) { cells.forEach(function (rc) { addCell(board, rc[0], rc[1], 'ludo-path ludo-home ludo-s' + seat); }); });
    var hub = document.createElement('div'); hub.className = 'ludo-center'; hub.style.gridArea = '7 / 7 / span 3 / span 3';
    hub.innerHTML = TRI.map(function (side, seat) { return '<span class="ludo-tri ludo-tri-' + side + ' ludo-s' + seat + '"></span>'; }).join('') + '<span class="ludo-hub-star" aria-hidden="true">★</span>';
    board.appendChild(hub);
    var dest = document.createElement('div'); dest.className = 'ludo-dest'; dest.id = 'ludoDest'; dest.hidden = true; board.appendChild(dest);
    var layer = document.createElement('div'); layer.className = 'ludo-tokens'; layer.id = 'ludoTokens'; board.appendChild(layer);
    var fx = document.createElement('div'); fx.className = 'ludo-fx'; fx.id = 'ludoFx'; fx.setAttribute('aria-hidden', 'true'); board.appendChild(fx);
  }
  function addCell(board, r, c, cls) { var d = document.createElement('div'); d.className = 'ludo-cell ' + cls; d.style.gridArea = (r + 1) + ' / ' + (c + 1) + ' / span 1 / span 1'; board.appendChild(d); return d; }

  function paintBoard() {
    var board = $('ludoBoard'), used = {};
    state.players.forEach(function (p) { used[p.seat] = p; });
    for (var seat = 0; seat < 4; seat++) {
      var p = used[seat];
      board.style.setProperty('--s' + seat, p ? colorOf(p.color).hex : '#a9b4ae');
      var yard = board.querySelector('.ludo-yard.ludo-s' + seat);
      yard.classList.toggle('is-empty', !p);
      yard.querySelector('.ludo-yard-name').textContent = p ? p.name : '';
    }
  }

  function buildTokens() {
    var layer = $('ludoTokens'); layer.innerHTML = ''; state.tokens = {};
    state.players.forEach(function (p, pi) {
      p.tokens.forEach(function (_, ti) {
        var tok = document.createElement('button');
        tok.type = 'button'; tok.className = 'ludo-token'; tok.dataset.move = pi + ':' + ti;
        tok.style.setProperty('--pc', colorOf(p.color).hex);
        tok.setAttribute('aria-label', p.name + ' · ' + (ti + 1));
        tok.setAttribute('data-i18n-skip', '');
        tok.innerHTML = '<span class="ludo-token-face">' + (ti + 1) + '</span>';
        layer.appendChild(tok); state.tokens[pi + ':' + ti] = tok;
      });
    });
  }

  function layoutTokens() {
    var byCell = {}, entries = [];
    state.players.forEach(function (p, pi) {
      p.tokens.forEach(function (prog, ti) {
        var pos = posOf(p, ti), key = pos[0] + ',' + pos[1];
        (byCell[key] = byCell[key] || []).push(pi + ':' + ti);
        entries.push({ id:pi + ':' + ti, pos:pos, key:key, home:prog === FINISH });
      });
    });
    var OFFS = [[0,0],[0.2,-0.14],[-0.2,0.14],[0.2,0.14],[-0.2,-0.14],[0,0.22],[0,-0.22],[0.24,0]];
    entries.forEach(function (e) {
      var tok = state.tokens[e.id]; if (!tok) return;
      var group = byCell[e.key], idx = group.indexOf(e.id), off = group.length > 1 ? OFFS[idx % OFFS.length] : [0,0];
      tok.style.left = pct(e.pos[1] + off[0]);
      tok.style.top = pct(e.pos[0] + off[1]);
      tok.classList.toggle('is-stacked', group.length > 1);
      tok.classList.toggle('is-home', e.home);
      var movable = state.movable.indexOf(e.id) >= 0;
      tok.classList.toggle('is-movable', movable);
      tok.disabled = !movable; tok.tabIndex = movable ? 0 : -1;
      tok.style.zIndex = movable ? 6 : 2 + idx;
    });
  }
  function hop(id) { var tok = state.tokens[id]; if (!tok) return; tok.classList.remove('is-hopping'); void tok.offsetWidth; tok.classList.add('is-hopping'); }

  function showDest(id) {
    var dest = $('ludoDest'); if (!dest) return;
    if (!id || state.movable.indexOf(id) < 0) { dest.hidden = true; return; }
    var parts = id.split(':'), p = state.players[+parts[0]], prog = p.tokens[+parts[1]], target = prog < 0 ? 0 : prog + state.dice, rc = cellOf(p.seat, target);
    dest.style.left = pct(rc[1]); dest.style.top = pct(rc[0]); dest.style.setProperty('--pc', colorOf(p.color).hex); dest.hidden = false;
  }
  function burst(rc, text) {
    var fx = $('ludoFx'); if (!fx) return;
    var el = document.createElement('span'); el.className = 'ludo-pow'; el.textContent = text;
    el.style.left = pct(rc[1]); el.style.top = pct(rc[0]);
    fx.appendChild(el); setTimeout(function () { el.remove(); }, 1300);
  }

  /* ---------- UI ---------- */
  function cur() { return state.players[state.turn]; }
  function setStatus(msg, cls) { var el = $('ludoStatus'); if (el) { el.textContent = msg; el.className = 'ludo-status' + (cls ? ' ' + cls : ''); } }
  function homeCount(p) { return p.tokens.filter(function (t) { return t === FINISH; }).length; }
  function renderScores() {
    var box = $('ludoScores'); if (!box) return;
    box.innerHTML = state.players.map(function (p, pi) {
      var place = state.finished.indexOf(pi), active = pi === state.turn && !state.over;
      return '<div class="ludo-score' + (active ? ' is-active' : '') + (place >= 0 ? ' is-done' : '') + '" style="--pc:' + colorOf(p.color).hex + '">' +
        '<span class="ludo-score-dot" aria-hidden="true">' + (place >= 0 ? MEDALS[place] : '') + '</span>' +
        '<span class="ludo-score-copy"><b data-i18n-skip>' + C.esc(p.name) + '</b><small>' + homeCount(p) + '/4 ' + C.esc(T('ludo.home', 'төвд')) + '</small></span></div>';
    }).join('');
  }
  function updateTurnUI() {
    var p = cur(); if (!p) return;
    var hex = colorOf(p.color).hex, die = $('ludoDie');
    $('ludoGame').style.setProperty('--turn', hex);
    $('ludoTurnName').textContent = p.name;
    die.classList.toggle('is-rolling', state.rolling);
    die.classList.toggle('is-ready', state.canRoll && !state.rolling && !state.over && !state.animating);
    die.disabled = !state.canRoll || state.rolling || state.animating || state.over;
    die.setAttribute('data-face', state.dice || '');
    renderScores();
  }

  function computeMovable() {
    var p = cur(), list = [];
    p.tokens.forEach(function (prog, ti) {
      if (prog === FINISH) return;
      if (prog < 0) { if (state.dice === 6) list.push(state.turn + ':' + ti); return; }
      if (prog + state.dice <= FINISH) list.push(state.turn + ':' + ti);
    });
    return list;
  }

  /* ---------- turn flow ---------- */
  function wait(ms) { var gen = state.gen; return new Promise(function (resolve, reject) { setTimeout(function () { if (gen === state.gen) resolve(); else reject(new Error('stale')); }, ms); }); }

  function roll() {
    if (!state.canRoll || state.rolling || state.animating || state.over) return;
    state.rolling = true; showDest(null); updateTurnUI(); sfx('dice');
    var ticks = 0, gen = state.gen, iv = setInterval(function () {
      if (gen !== state.gen) { clearInterval(iv); return; }
      state.dice = 1 + Math.floor(Math.random() * 6); $('ludoDie').setAttribute('data-face', state.dice);
      if (++ticks >= 9) { clearInterval(iv); finalizeRoll(); }
    }, 55);
  }
  function finalizeRoll() {
    state.rolling = false; state.canRoll = false;
    var p = cur();
    if (state.dice === 6) { state.sixes++; flashSix(); } else state.sixes = 0;
    if (state.sixes === 3) {
      setStatus(T('ludo.threeSixes', 'Гурван зургаа! {name}-ийн ээлж шатлаа 🙈', { name:p.name }), 'warn'); sfx('oops');
      state.movable = []; layoutTokens(); updateTurnUI();
      wait(1300).then(nextTurn, function () {}); return;
    }
    state.movable = computeMovable();
    updateTurnUI();
    if (!state.movable.length) {
      layoutTokens();
      if (state.dice === 6) { state.canRoll = true; updateTurnUI(); setStatus(T('ludo.sixAgain', 'Зургаа! {name} дахин шиднэ.', { name:p.name }), 'good'); return; }
      setStatus(T('ludo.noMove', 'Явах боломжгүй — дараагийн тоглогч.'), ''); sfx('noMove');
      wait(1000).then(nextTurn, function () {});
      return;
    }
    state.awaiting = true; layoutTokens();
    // Auto-move when every choice ends in the same place (one token, or all tokens still in the yard).
    var outcomes = {};
    state.movable.forEach(function (id) { outcomes[p.tokens[+id.split(':')[1]]] = 1; });
    if (Object.keys(outcomes).length === 1) {
      setStatus(T('ludo.autoMove', 'Явуулж байна…'), '');
      wait(450).then(function () { applyMove(state.movable[0]); }, function () {});
    } else setStatus(T('ludo.pick', '{name}, явуулах хүүгээ сонго.', { name:p.name }), '');
  }
  function flashSix() {
    sfx('six');
    var el = $('ludoSixFlash'); if (!el) return;
    el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
  }

  function applyMove(moveId) {
    if (!state.awaiting || state.animating || state.movable.indexOf(moveId) < 0) return;
    state.awaiting = false; state.movable = []; state.animating = true; showDest(null);
    var parts = moveId.split(':'), pi = +parts[0], ti = +parts[1], p = state.players[pi], from = p.tokens[ti];
    layoutTokens(); updateTurnUI();
    var steps = Promise.resolve();
    if (from < 0) {
      p.tokens[ti] = 0; layoutTokens(); hop(moveId); sfx('leave');
      steps = wait(420);
    } else {
      for (var k = 1; k <= state.dice; k++) (function (k) {
        steps = steps.then(function () { p.tokens[ti] = from + k; layoutTokens(); hop(moveId); sfx('hop', { step:k - 1 }); return wait(165); });
      })(k);
    }
    steps.then(function () { return settle(pi, ti); }).catch(function () {});
  }

  function settle(pi, ti) {
    var p = state.players[pi], prog = p.tokens[ti], finished = prog === FINISH, victims = [];
    var mi = mainIndex(p.seat, prog);
    if (mi >= 0 && !SAFE[mi]) {
      state.players.forEach(function (op, oi) {
        if (oi === pi) return;
        op.tokens.forEach(function (oprog, ok) {
          if (oprog >= 0 && oprog <= 50 && mainIndex(op.seat, oprog) === mi) { op.tokens[ok] = -1; victims.push({ p:op, id:oi + ':' + ok }); }
        });
      });
    }
    var after = Promise.resolve();
    if (victims.length) {
      burst(cellOf(p.seat, prog), T('ludo.pow', 'БАМ!'));
      victims.forEach(function (v) { var tok = state.tokens[v.id]; if (tok) { tok.classList.remove('is-captured'); void tok.offsetWidth; tok.classList.add('is-captured'); } });
      layoutTokens(); sfx('capture');
      setStatus(T('ludo.capture', 'БАМ! {name} {victim}-г гэрт нь буцаалаа!', { name:p.name, victim:victims[0].p.name }), 'good');
      after = wait(700);
    } else if (finished) {
      burst(cellOf(p.seat, prog), '⭐'); sfx('home');
      setStatus(T('ludo.homeOne', 'Нэг хүү төвд хүрлээ! Дахин шид.'), 'good');
    } else layoutTokens();
    return after.then(function () {
      state.animating = false;
      save();
      if (finished && homeCount(p) === 4) { playerFinished(pi); return; }
      var extra = state.dice === 6 || victims.length > 0 || finished;
      if (extra) {
        if (!victims.length && !finished) setStatus(T('ludo.sixAgain', 'Зургаа! {name} дахин шиднэ.', { name:p.name }), 'good');
        state.canRoll = true; state.dice = 0; layoutTokens(); updateTurnUI();
      } else wait(450).then(nextTurn, function () {});
    });
  }

  function remaining() { return state.players.map(function (_, i) { return i; }).filter(function (i) { return state.finished.indexOf(i) < 0; }); }
  function playerFinished(pi) {
    state.finished.push(pi);
    var left = remaining();
    if (left.length <= 1) { left.forEach(function (i) { state.finished.push(i); }); state.over = true; }
    state.canRoll = false; state.movable = []; layoutTokens(); updateTurnUI();
    showResult(pi);
    if (state.over) write(SAVE_KEY, null); else save();
  }
  function showResult(pi) {
    var p = state.players[pi], place = state.finished.indexOf(pi), box = $('ludoWinner');
    box.style.setProperty('--pc', colorOf(p.color).hex);
    $('ludoWinnerMedal').textContent = MEDALS[place] || '🎉';
    $('ludoWinnerPlace').textContent = T('ludo.place', '{place}-р байр', { place:place + 1 });
    $('ludoWinnerName').textContent = p.name;
    var list = $('ludoStandings');
    list.hidden = !state.over;
    list.innerHTML = state.over ? state.finished.map(function (i, n) { var q = state.players[i]; return '<li style="--pc:' + colorOf(q.color).hex + '"><span>' + MEDALS[n] + '</span><b>' + C.esc(q.name) + '</b></li>'; }).join('') : '';
    $('ludoContinue').hidden = state.over;
    if (!box.open) { if (box.showModal) box.showModal(); else box.setAttribute('open', ''); }
    confetti();
    sfx(place === 0 ? 'win' : 'home');
    setStatus(p.name + ' ' + T('ludo.wins', 'яллаа! 🎉'), 'win');
    setTimeout(function () { var b = state.over ? $('ludoWinnerNew') : $('ludoContinue'); if (b) b.focus(); }, 60);
  }
  function resultOpen() { return !!$('ludoWinner').open; }
  function closeResult() { var box = $('ludoWinner'); if (!box.open) return; if (box.close) box.close(); else box.removeAttribute('open'); }
  function confetti() {
    var layer = $('ludoConfetti'); if (!layer) return; layer.innerHTML = '';
    var colors = state.players.map(function (p) { return colorOf(p.color).hex; }).concat(['#ffffff', '#ffd23f']);
    for (var i = 0; i < 70; i++) {
      var s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%'; s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.5) + 's'; s.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      s.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg'); s.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
      layer.appendChild(s);
    }
  }

  function nextTurn() {
    if (state.over) return;
    state.sixes = 0; state.dice = 0; state.movable = []; state.awaiting = false;
    var n = state.players.length;
    for (var i = 1; i <= n; i++) { var next = (state.turn + i) % n; if (state.finished.indexOf(next) < 0) { state.turn = next; break; } }
    state.canRoll = true;
    updateTurnUI(); layoutTokens(); save(); sfx('turn');
    setStatus(T('ludo.yourRoll', '{name} — шидэх ээлж!', { name:cur().name }), '');
  }

  /* ---------- save / resume ---------- */
  function save() {
    if (!state.started || state.over) return;
    write(SAVE_KEY, { v:1, players:state.players.map(function (p) { return { seat:p.seat, name:p.name, color:p.color, tokens:p.tokens.slice() }; }), turn:state.turn, finished:state.finished.slice() });
  }
  function validSave(s) {
    if (!s || s.v !== 1 || !Array.isArray(s.players) || s.players.length < 2 || s.players.length > 4) return false;
    return s.players.every(function (p) { return p && START[p.seat] != null && typeof p.name === 'string' && Array.isArray(p.tokens) && p.tokens.length === 4 && p.tokens.every(function (t) { return t === -1 || (t >= 0 && t <= FINISH && t === Math.floor(t)); }); }) && s.turn >= 0 && s.turn < s.players.length;
  }

  /* ---------- setup ---------- */
  function renderSetup() {
    C.$$('[data-ludo-count]', $('ludoSetup')).forEach(function (b) { var on = +b.dataset.ludoCount === setup.count; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    var list = $('ludoPlayerList'), active = document.activeElement, focusKey = active && active.dataset ? active.dataset.ludoColor : null;
    list.innerHTML = setup.players.slice(0, setup.count).map(function (p, i) {
      var c = colorOf(p.color);
      return '<div class="ludo-player-row" style="--pc:' + c.hex + '">' +
        '<span class="ludo-player-badge" aria-hidden="true">' + (i + 1) + '</span>' +
        '<label class="ludo-name-field"><span class="sr-only">' + C.esc(T('ludo.nameLabel', '{n}-р тоглогчийн нэр', { n:i + 1 })) + '</span>' +
        '<input class="input" type="text" maxlength="16" autocomplete="off" spellcheck="false" data-ludo-name="' + i + '" value="' + C.esc(p.name) + '" placeholder="' + C.esc(defaultName(i)) + '"></label>' +
        '<div class="ludo-swatches" role="radiogroup" aria-label="' + C.esc(T('ludo.colorLabel', 'Өнгө')) + '">' +
        COLORS.map(function (col) {
          var owner = -1; setup.players.slice(0, setup.count).forEach(function (q, j) { if (j !== i && q.color === col.id) owner = j; });
          var on = col.id === p.color;
          return '<button type="button" role="radio" class="ludo-swatch' + (owner >= 0 ? ' is-taken' : '') + '" style="--sw:' + col.hex + '" data-ludo-color="' + i + ':' + col.id + '" aria-checked="' + on + '" aria-label="' + C.esc(colorName(col.id)) + '" title="' + C.esc(colorName(col.id)) + '">' + (owner >= 0 ? '<span>' + (owner + 1) + '</span>' : '') + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    if (focusKey) { var again = list.querySelector('[data-ludo-color="' + focusKey + '"]'); if (again) again.focus(); }
    $('ludoResume').hidden = !validSave(read(SAVE_KEY));
  }
  function pickColor(i, id) {
    var me = setup.players[i], other = -1;
    setup.players.slice(0, setup.count).forEach(function (q, j) { if (j !== i && q.color === id) other = j; });
    if (other >= 0) setup.players[other].color = me.color;   // swap with whoever had it
    me.color = id; saveSetup(); renderSetup(); sfx('pop');
  }
  function setCount(n) {
    if (!SEATS_FOR[n]) return; setup.count = n;
    // Players that become active must not share a color with someone already in the game.
    for (var i = 0; i < n; i++) if (setup.players.slice(0, i).some(function (q) { return q.color === setup.players[i].color; })) setup.players[i].color = COLORS.filter(function (c) { return !setup.players.slice(0, n).some(function (q) { return q.color === c.id; }); })[0].id;
    saveSetup(); renderSetup(); sfx('pop');
  }

  function begin(players, turn, finished) {
    buildBoard();
    state.gen++;
    state.players = players; state.turn = turn || 0; state.finished = finished || [];
    // A resumed game may have been saved while a finished player's result card was open: skip them.
    for (var i = 0; i < players.length && state.finished.indexOf(state.turn) >= 0; i++) state.turn = (state.turn + 1) % players.length;
    state.dice = 0; state.rolling = false; state.canRoll = true; state.sixes = 0; state.movable = []; state.awaiting = false; state.animating = false; state.over = false; state.started = true;
    $('ludoSetup').hidden = true; $('ludoGame').hidden = false; closeResult();
    paintBoard(); buildTokens(); layoutTokens(); updateTurnUI(); save();
    setStatus(T('ludo.yourRoll', '{name} — шидэх ээлж!', { name:cur().name }), '');
  }
  function startFromSetup() {
    var seats = SEATS_FOR[setup.count];
    begin(setup.players.slice(0, setup.count).map(function (p, i) {
      return { seat:seats[i], name:(p.name || '').trim() || defaultName(i), color:p.color, tokens:[-1,-1,-1,-1] };
    }), 0, []);
    sfx('horn');
  }
  function rematch() {
    begin(state.players.map(function (p) { return { seat:p.seat, name:p.name, color:p.color, tokens:[-1,-1,-1,-1] }; }), 0, []);
    sfx('horn');
  }
  function resume() {
    var s = read(SAVE_KEY); if (!validSave(s)) { renderSetup(); return; }
    begin(s.players.map(function (p) { return { seat:p.seat, name:p.name.slice(0, 16), color:colorOf(p.color).id, tokens:p.tokens.slice() }; }), s.turn, (s.finished || []).filter(function (i) { return i >= 0 && i < s.players.length; }));
  }
  function toSetup() {
    state.gen++; state.started = false; state.over = false;
    $('ludoGame').hidden = true; closeResult(); $('ludoSetup').hidden = false;
    renderSetup();
  }
  function confirmNew() {
    if (!state.started || state.over) { toSetup(); return; }
    var ask = C.confirm ? C.confirm({ title:T('ludo.confirmTitle', 'Шинэ тоглоом эхлүүлэх үү?'), text:T('ludo.confirmText', 'Одоогийн тоглоомын явц устна.'), ok:T('ludo.confirmOk', 'Тийм, шинээр эхлэх'), icon:'refresh' }) : Promise.resolve(window.confirm(T('ludo.confirmTitle', 'Шинэ тоглоом эхлүүлэх үү?')));
    ask.then(function (yes) { if (!yes) return; write(SAVE_KEY, null); toSetup(); });
  }

  function bind() {
    if (state.bound) return; state.bound = true;
    var view = $('view-ludo');
    view.querySelector('.ludo-count').addEventListener('click', function (e) { var b = e.target.closest('[data-ludo-count]'); if (b) setCount(+b.dataset.ludoCount); });
    view.querySelector('.ludo-count').addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
      e.preventDefault(); var n = Math.max(2, Math.min(4, setup.count + d)); setCount(n); var b = view.querySelector('[data-ludo-count="' + n + '"]'); if (b) b.focus();
    });
    $('ludoPlayerList').addEventListener('input', function (e) { var f = e.target.closest('[data-ludo-name]'); if (!f) return; setup.players[+f.dataset.ludoName].name = f.value.slice(0, 16); saveSetup(); });
    $('ludoPlayerList').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest('[data-ludo-name]')) { e.preventDefault(); startFromSetup(); } });
    $('ludoPlayerList').addEventListener('click', function (e) { var b = e.target.closest('[data-ludo-color]'); if (!b) return; var parts = b.dataset.ludoColor.split(':'); pickColor(+parts[0], parts[1]); });
    $('ludoStart').onclick = startFromSetup;
    $('ludoResume').onclick = resume;
    $('ludoDie').onclick = roll;
    // Tokens are created per game inside the static board, so delegate from the board.
    var board = $('ludoBoard');
    board.addEventListener('click', function (e) { var t = e.target.closest('[data-move]'); if (t && state.awaiting) applyMove(t.getAttribute('data-move')); });
    board.addEventListener('pointerover', function (e) { var t = e.target.closest('[data-move]'); showDest(t && state.awaiting ? t.dataset.move : null); });
    board.addEventListener('pointerleave', function () { showDest(null); });
    board.addEventListener('focusin', function (e) { var t = e.target.closest('[data-move]'); showDest(t && state.awaiting ? t.dataset.move : null); });
    board.addEventListener('focusout', function () { showDest(null); });
    $('ludoNew').onclick = confirmNew;
    $('ludoWinnerNew').onclick = rematch;
    $('ludoWinnerSetup').onclick = function () { write(SAVE_KEY, state.over ? null : read(SAVE_KEY)); toSetup(); };
    $('ludoContinue').onclick = function () { closeResult(); nextTurn(); };
    // Esc on the result card: continue the game, or simply look at the final board.
    $('ludoWinner').addEventListener('cancel', function (e) { e.preventDefault(); if (state.over) closeResult(); else $('ludoContinue').click(); });
    document.addEventListener('keydown', function (e) {
      if (!state.visible || !state.started || $('ludoGame').hidden) return;
      if (e.target.closest && e.target.closest('button,input,textarea,select,a,[contenteditable],dialog,.modal-back')) return;
      if ((e.key === ' ' || e.key === 'Enter') && state.canRoll && !state.over && !resultOpen()) { e.preventDefault(); roll(); }
    });
    document.addEventListener('c122:language', function () { if (!$('ludoSetup').hidden) renderSetup(); else if (state.started) renderScores(); });
  }

  C.Ludo = {
    show:function () { state.visible = true; bind(); if (!state.started) toSetup(); },
    hide:function () { state.visible = false; }
  };
})();

/* LUDO — local pass-and-play, 2–4 players. Standard rules: roll 6 to leave base, capture on
   shared non-safe cells, exact roll to finish, extra turn on a 6 / capture / finishing a token. */
(function () {
  'use strict';
  var C = window.C122; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var T = function (key, fallback) { return window.C122I18n ? window.C122I18n.t(key, fallback) : fallback; };
  var sfx = function (n) { if (state.visible && !document.hidden && C.SFX) C.SFX.play(n); };

  // 52-cell main track as [row,col] on a 15x15 grid (0 = red start, clockwise).
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
  var START = { red:0, green:13, yellow:26, blue:39 };
  var HOME = {
    red:    [[7,1],[7,2],[7,3],[7,4],[7,5]],
    green:  [[1,7],[2,7],[3,7],[4,7],[5,7]],
    yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
    blue:   [[13,7],[12,7],[11,7],[10,7],[9,7]]
  };
  var CENTER = { red:[7,6], green:[6,7], yellow:[7,8], blue:[8,7] };   // finished tokens rest around the hub
  var YARD = {
    red:    [[1.5,1.5],[1.5,3.5],[3.5,1.5],[3.5,3.5]],
    green:  [[1.5,10.5],[1.5,12.5],[3.5,10.5],[3.5,12.5]],
    yellow: [[10.5,10.5],[10.5,12.5],[12.5,10.5],[12.5,12.5]],
    blue:   [[10.5,1.5],[10.5,3.5],[12.5,1.5],[12.5,3.5]]
  };
  var SAFE = { 0:1, 8:1, 13:1, 21:1, 26:1, 34:1, 39:1, 47:1 };
  var LABEL = { red:'Улаан', green:'Ногоон', yellow:'Шар', blue:'Цэнхэр' };
  var SETUPS = { 2:['red','yellow'], 3:['red','green','yellow'], 4:['red','green','yellow','blue'] };
  var FINISH = 56;   // progress 0..50 main, 51..55 home column, 56 = center

  var state = { visible:false, started:false, players:[], order:[], turn:0, dice:0, rolling:false, canRoll:true, sixes:0, movable:[], awaiting:false, winner:null };

  /* ---------- geometry ---------- */
  function cellOf(color, progress) {
    if (progress < 0) return null;                 // in base (handled separately)
    if (progress <= 50) return PATH[(START[color] + progress) % 52];
    if (progress <= 55) return HOME[color][progress - 51];
    return CENTER[color];
  }
  function mainIndex(color, progress) { return progress >= 0 && progress <= 50 ? (START[color] + progress) % 52 : -1; }

  /* ---------- build board ---------- */
  function buildBoard() {
    var board = $('ludoBoard'); if (!board || board.dataset.built) return;
    board.dataset.built = '1';
    var yardMap = { red:[0,0], green:[0,9], yellow:[9,9], blue:[9,0] };
    Object.keys(yardMap).forEach(function (color) {
      var y = yardMap[color], yard = document.createElement('div');
      yard.className = 'ludo-yard ludo-' + color;
      yard.style.gridArea = (y[0] + 1) + ' / ' + (y[1] + 1) + ' / span 6 / span 6';
      yard.innerHTML = '<div class="ludo-yard-inner"></div>';
      board.appendChild(yard);
    });
    // path + home cells
    PATH.forEach(function (rc, i) { addCell(board, rc[0], rc[1], 'ludo-path' + (SAFE[i] ? ' ludo-safe' : '') + startClass(i)); });
    Object.keys(HOME).forEach(function (color) { HOME[color].forEach(function (rc) { addCell(board, rc[0], rc[1], 'ludo-path ludo-home ludo-home-' + color); }); });
    // center hub
    var hub = document.createElement('div'); hub.className = 'ludo-center'; hub.style.gridArea = '7 / 7 / span 3 / span 3';
    hub.innerHTML = '<span class="ludo-tri red"></span><span class="ludo-tri green"></span><span class="ludo-tri yellow"></span><span class="ludo-tri blue"></span>';
    board.appendChild(hub);
    var layer = document.createElement('div'); layer.className = 'ludo-tokens'; layer.id = 'ludoTokens'; board.appendChild(layer);
  }
  function startClass(i) { for (var c in START) if (START[c] === i) return ' ludo-start ludo-start-' + c; return ''; }
  function addCell(board, r, c, cls) { var d = document.createElement('div'); d.className = 'ludo-cell ' + cls; d.style.gridArea = (r + 1) + ' / ' + (c + 1) + ' / span 1 / span 1'; board.appendChild(d); }

  /* ---------- render tokens ---------- */
  function renderTokens() {
    var layer = $('ludoTokens'); if (!layer) return;
    layer.innerHTML = '';
    // group tokens by cell for stacking offsets (main-track only)
    var byCell = {};
    state.players.forEach(function (pl) {
      pl.tokens.forEach(function (prog, ti) {
        var pos;
        if (prog < 0) pos = YARD[pl.color][ti];
        else { var rc = cellOf(pl.color, prog); pos = [rc[0], rc[1]]; }
        var key = pos[0] + ',' + pos[1], idx = byCell[key] || 0; byCell[key] = idx + 1;
        var tok = document.createElement('button');
        tok.type = 'button';
        tok.className = 'ludo-token ludo-' + pl.color + (state.movable.indexOf(pl.color + ':' + ti) >= 0 ? ' is-movable' : '');
        var r = pos[0], c = pos[1];
        var jitter = idx ? (idx % 2 ? 0.16 : -0.16) : 0, jv = idx >= 2 ? 0.16 : -0.02;
        tok.style.left = ((c + 0.5 + jitter) / 15 * 100) + '%';
        tok.style.top = ((r + 0.5 + jv) / 15 * 100) + '%';
        tok.dataset.move = pl.color + ':' + ti;
        if (prog === FINISH) tok.classList.add('is-home');
        layer.appendChild(tok);
      });
    });
  }

  /* ---------- turn flow ---------- */
  function cur() { return state.players[state.turn]; }
  function setStatus(msg, cls) { var el = $('ludoStatus'); if (el) { el.textContent = msg; el.className = 'ludo-status' + (cls ? ' ' + cls : ''); } }
  function updateTurnUI() {
    var p = cur();
    $('ludoTurn').className = 'ludo-turn ludo-chip-' + p.color;
    $('ludoTurnName').textContent = LABEL[p.color];
    $('ludoDie').className = 'ludo-die ludo-die-' + p.color + (state.rolling ? ' is-rolling' : '');
    $('ludoDie').disabled = !state.canRoll || state.rolling || !!state.winner;
    $('ludoDie').setAttribute('data-face', state.dice || '');
  }

  function computeMovable() {
    var p = cur(), list = [];
    p.tokens.forEach(function (prog, ti) {
      if (prog === FINISH) return;
      if (prog < 0) { if (state.dice === 6) list.push(p.color + ':' + ti); return; }
      if (prog + state.dice <= FINISH) list.push(p.color + ':' + ti);
    });
    return list;
  }

  function roll() {
    if (!state.canRoll || state.rolling || state.winner) return;
    state.rolling = true; updateTurnUI(); sfx('dice');
    var ticks = 0, iv = setInterval(function () {
      state.dice = 1 + Math.floor(Math.random() * 6); $('ludoDie').setAttribute('data-face', state.dice);
      if (++ticks >= 8) { clearInterval(iv); finalizeRoll(); }
    }, 60);
  }
  function finalizeRoll() {
    state.rolling = false;
    if (state.dice === 6) state.sixes++; else state.sixes = 0;
    if (state.sixes === 3) { setStatus(T('ludo.threeSixes','Гурван зургаа! Ээлж өнгөрлөө.'), 'warn'); state.dice = 0; state.canRoll = true; state.movable = []; renderTokens(); updateTurnUI(); setTimeout(nextTurn, 900); return; }
    state.movable = computeMovable();
    updateTurnUI();
    if (!state.movable.length) {
      setStatus(T('ludo.noMove','Явах боломжгүй — ээлж дараагийн тоглогчид.'), '');
      state.canRoll = false; renderTokens();
      setTimeout(function () { if (state.dice === 6) { state.canRoll = true; updateTurnUI(); setStatus(T('ludo.sixAgain','Зургаа! Дахин шид.'), 'good'); } else nextTurn(); }, 900);
      return;
    }
    state.canRoll = false; state.awaiting = true;
    setStatus(state.movable.length === 1 ? T('ludo.autoMove','Явуулж байна…') : T('ludo.pick','Явуулах хүүгээ сонго.'), '');
    renderTokens();
    if (state.movable.length === 1) setTimeout(function () { applyMove(state.movable[0]); }, 420);
  }

  function applyMove(moveId) {
    if (!state.awaiting || state.movable.indexOf(moveId) < 0) return;
    state.awaiting = false; state.movable = [];
    var parts = moveId.split(':'), color = parts[0], ti = +parts[1], p = cur();
    var captured = false, finished = false;
    if (p.tokens[ti] < 0) p.tokens[ti] = 0;               // leave base onto start
    else p.tokens[ti] += state.dice;
    if (p.tokens[ti] === FINISH) finished = true;
    // capture: opponents on the same main cell (not safe)
    var mi = mainIndex(color, p.tokens[ti]);
    if (mi >= 0 && !SAFE[mi]) {
      state.players.forEach(function (op) {
        if (op.color === color) return;
        op.tokens.forEach(function (oprog, oi) {
          if (oprog >= 0 && oprog <= 50 && mainIndex(op.color, oprog) === mi) { op.tokens[oi] = -1; captured = true; }
        });
      });
    }
    renderTokens();
    sfx(captured ? 'capture' : (finished ? 'home' : 'move'));
    if (checkWin(p)) return;
    var extra = state.dice === 6 || captured || finished;
    if (captured) setStatus(T('ludo.capture','Цохилоо! Дахин шид.'), 'good');
    else if (finished) setStatus(T('ludo.homeOne','Нэг хүү гэртээ оров! Дахин шид.'), 'good');
    else if (state.dice === 6) setStatus(T('ludo.sixAgain','Зургаа! Дахин шид.'), 'good');
    if (extra) { state.canRoll = true; state.dice = 0; updateTurnUI(); }
    else setTimeout(nextTurn, 500);
  }

  function checkWin(p) {
    if (p.tokens.every(function (t) { return t === FINISH; })) {
      state.winner = p.color;
      sfx('win');
      setStatus((LABEL[p.color]) + ' ' + T('ludo.wins','яллаа! 🎉'), 'win');
      $('ludoWinner').hidden = false; $('ludoWinner').className = 'ludo-winner ludo-chip-' + p.color;
      $('ludoWinnerName').textContent = LABEL[p.color];
      updateTurnUI();
      return true;
    }
    return false;
  }

  function nextTurn() {
    if (state.winner) return;
    state.sixes = 0; state.dice = 0;
    state.turn = (state.turn + 1) % state.players.length;
    state.canRoll = true; state.movable = [];
    updateTurnUI(); renderTokens();
    setStatus(LABEL[cur().color] + ' ' + T('ludo.yourRoll','— шидэх ээлж.'), '');
  }

  /* ---------- game setup ---------- */
  function startGame(count) {
    buildBoard();
    state.order = SETUPS[count];
    state.players = state.order.map(function (color) { return { color:color, tokens:[-1,-1,-1,-1] }; });
    state.turn = 0; state.dice = 0; state.rolling = false; state.canRoll = true; state.sixes = 0; state.movable = []; state.awaiting = false; state.winner = null; state.started = true;
    $('ludoSetup').hidden = true; $('ludoGame').hidden = false; $('ludoWinner').hidden = true;
    updateTurnUI(); renderTokens();
    setStatus(LABEL[cur().color] + ' ' + T('ludo.yourRoll','— шидэх ээлж.'), '');
  }

  function bind() {
    if (state.bound) return;
    C.$$('[data-ludo-players]', $('view-ludo')).forEach(function (b) { b.onclick = function () { startGame(+b.getAttribute('data-ludo-players')); }; });
    $('ludoDie').onclick = roll;
    // Tokens live inside the static board and are added dynamically, so delegate from the board.
    $('ludoBoard').addEventListener('click', function (e) { var t = e.target.closest('[data-move]'); if (t && state.awaiting) applyMove(t.getAttribute('data-move')); });
    $('ludoNew').onclick = function () { state.started = false; $('ludoGame').hidden = true; $('ludoWinner').hidden = true; $('ludoSetup').hidden = false; };
    $('ludoWinnerNew').onclick = function () { $('ludoWinner').hidden = true; $('ludoGame').hidden = true; $('ludoSetup').hidden = false; };
    document.addEventListener('keydown', function (e) { if (e.target.closest && e.target.closest('button,input,textarea,select,a,[contenteditable]')) return; if (state.visible && state.started && !state.winner && (e.key === ' ' || e.key === 'Enter') && state.canRoll && document.activeElement && document.activeElement.id !== 'ludoDie') { e.preventDefault(); roll(); } });
    state.bound = true;
  }

  C.Ludo = {
    show:function () { state.visible = true; bind(); if (!state.started) { $('ludoSetup').hidden = false; $('ludoGame').hidden = true; $('ludoWinner').hidden = true; } },
    hide:function () { state.visible = false; }
  };
})();

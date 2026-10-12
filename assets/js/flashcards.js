/* FlashCards — English + HSK word trainer. Left = know, Right = don't know. Local only. */
(function () {
  'use strict';
  var C = window.C122; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var T = function (key, fallback) { return window.C122I18n ? window.C122I18n.t(key, fallback) : fallback; };
  var esc = function (v) { return C.esc ? C.esc(v) : String(v == null ? '' : v); };
  var sfx = function (n) { if (state.visible && !document.hidden && C.SFX) C.SFX.play(n); };
  var state = {loaded:false, loading:false, visible:false, decks:[], deck:null, order:[], idx:0, known:0, unknown:0, missed:[], flipped:false, drag:null, locked:false};

  function deckColor(key) { return key === 'english' ? 'eng' : 'hsk'; }

  function renderDecks() {
    var host = $('fcDecks');
    if (state.loading) { host.innerHTML = '<div class="fc-loading"><span class="spinner dark"></span></div>'; return; }
    host.innerHTML = state.decks.map(function (d) {
      return '<button type="button" class="fc-deck fc-deck-' + deckColor(d.key) + '" data-fc-deck="' + esc(d.key) + '">' +
        '<span class="fc-deck-glyph" aria-hidden="true">' + (d.key === 'english' ? 'A' : '汉') + '</span>' +
        '<strong>' + esc(d.label) + '</strong><small>' + d.count + ' ' + T('flashcards.cards','үг') + '</small></button>';
    }).join('');
  }

  function shuffle(arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

  function startDeck(key, cardsOverride) {
    var deck = null; state.decks.forEach(function (d) { if (d.key === key) deck = d; });
    if (!deck) return;
    state.deck = deck;
    var cards = cardsOverride || deck.cards;
    if (!cards.length) { C.toast ? C.toast(T('flashcards.empty','Энэ багцад үг алга. Удирдлагаас нэмээрэй.'),'error') : 0; return; }
    state.pool = cards.slice();
    state.order = shuffle(state.pool.map(function (_, i) { return i; }));
    state.idx = 0; state.known = 0; state.unknown = 0; state.missed = []; state.flipped = false;
    $('fcDecks').hidden = true; $('fcSummary').hidden = true; $('fcPlay').hidden = false;
    $('fcDeckName').textContent = deck.label;
    renderCard();
  }

  function current() { return state.pool[state.order[state.idx]]; }

  function renderCard() {
    updateProgress();
    var stage = $('fcStage'); var card = current();
    if (!card) { finish(); return; }
    state.flipped = false; state.locked = false;
    var isCn = state.deck.key !== 'english';
    var front = '<div class="fc-card ' + (isCn ? 'fc-card-cn' : '') + '" id="fcCard">' +
      '<div class="fc-card-inner">' +
        '<div class="fc-face fc-front"><span class="fc-face-kicker">' + esc(state.deck.label) + '</span><span class="fc-word">' + esc(card.f) + '</span><span class="fc-tap-hint">' + T('flashcards.tapReveal','Дарж утгыг хар') + '</span></div>' +
        '<div class="fc-face fc-back">' + (card.p ? '<span class="fc-pinyin">' + esc(card.p) + '</span>' : '') + '<span class="fc-meaning">' + esc(card.b) + '</span><span class="fc-word-sub">' + esc(card.f) + '</span></div>' +
      '</div></div>';
    stage.innerHTML = front;
    var el = $('fcCard');
    el.addEventListener('click', function (e) { if (!state.drag || !state.drag.moved) flip(); });
    bindDrag(el);
    requestAnimationFrame(function () { el.classList.add('fc-enter'); });
  }

  function flip() { state.flipped = !state.flipped; var el = $('fcCard'); if (el) el.classList.toggle('is-flipped', state.flipped); sfx('flip'); }

  function updateProgress() {
    var total = state.order.length;
    $('fcProgress').textContent = Math.min(state.idx + 1, total) + ' / ' + total + '  ·  ' + T('flashcards.know','Мэднэ') + ' ' + state.known + '  ·  ' + T('flashcards.dontKnow','Мэдэхгүй') + ' ' + state.unknown;
  }

  function decide(know) {
    if (state.locked) return; state.locked = true;
    var card = current();
    if (know) state.known++; else { state.unknown++; state.missed.push(card); }
    sfx(know ? 'know' : 'nope');
    var el = $('fcCard');
    if (el) { el.classList.add(know ? 'fc-fly-left' : 'fc-fly-right'); el.style.pointerEvents = 'none'; }
    setTimeout(function () { state.idx++; renderCard(); }, 300);
  }

  function finish() {
    $('fcPlay').hidden = true; $('fcSummary').hidden = false;
    $('fcKnownCount').textContent = state.known; $('fcUnknownCount').textContent = state.unknown;
    var ratio = state.known + state.unknown ? state.known / (state.known + state.unknown) : 0;
    $('fcSummaryTitle').textContent = ratio === 1 ? T('flashcards.perfect','Бүгдийг мэдлээ! 🎉') : ratio >= 0.6 ? T('flashcards.good','Сайн байна!') : T('flashcards.keep','Үргэлжлүүлээрэй!');
    $('fcRepeat').hidden = !state.missed.length;
    $('fcSummaryBadge').classList.toggle('is-perfect', ratio === 1);
    sfx(ratio === 1 ? 'win' : 'home');
  }

  /* ---- drag / swipe ---- */
  function bindDrag(el) {
    el.addEventListener('pointerdown', function (e) {
      if (state.locked) return;
      state.drag = {x:e.clientX, y:e.clientY, dx:0, moved:false, id:e.pointerId};
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });
    el.addEventListener('pointermove', function (e) {
      if (!state.drag || state.drag.id !== e.pointerId) return;
      state.drag.dx = e.clientX - state.drag.x;
      if (Math.abs(state.drag.dx) > 6) state.drag.moved = true;
      var rot = state.drag.dx / 18;
      el.style.transform = 'translateX(' + state.drag.dx + 'px) rotate(' + rot + 'deg)';
      var t = Math.min(1, Math.abs(state.drag.dx) / 120);
      el.classList.toggle('fc-hint-know', state.drag.dx < -24);
      el.classList.toggle('fc-hint-dont', state.drag.dx > 24);
      el.style.setProperty('--fc-hint', t);
    });
    function end(e) {
      if (!state.drag || state.drag.id !== e.pointerId) return;
      var dx = state.drag.dx, moved = state.drag.moved; state.drag = null;
      el.classList.remove('fc-hint-know','fc-hint-dont'); el.style.removeProperty('--fc-hint');
      if (Math.abs(dx) > 110) { decide(dx < 0); return; }   // left = know, right = don't know
      el.style.transform = '';
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function onKey(e) {
    if (e.target.closest && e.target.closest('button,input,textarea,select,a,[contenteditable]')) return;
    if (!state.visible || $('fcPlay').hidden) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); decide(true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); decide(false); }
    else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); flip(); }
  }

  function load() {
    if (state.loading) return;
    state.loading = true; renderDecks();
    C.api('flashcards_get').then(function (data) {
      state.decks = data.decks || []; state.loaded = true; state.loading = false; renderDecks();
    }).catch(function (error) {
      state.loading = false; $('fcDecks').innerHTML = '<p class="fc-error">' + esc(error.message) + '</p>';
    });
  }

  function bind() {
    if (state.bound) return; state.bound = true;
    $('fcDecks').addEventListener('click', function (e) { var b = e.target.closest('[data-fc-deck]'); if (b) startDeck(b.getAttribute('data-fc-deck')); });
    $('fcBack').onclick = toDecks; $('fcToDecks').onclick = toDecks;
    $('fcKnow').onclick = function () { decide(true); }; $('fcDont').onclick = function () { decide(false); }; $('fcFlip').onclick = flip;
    $('fcShuffle').onclick = function () { if (state.deck) startDeck(state.deck.key); };
    $('fcRestart').onclick = function () { if (state.deck) startDeck(state.deck.key); };
    $('fcAgain').onclick = function () { if (state.deck) startDeck(state.deck.key); };
    $('fcRepeat').onclick = function () { if (state.missed.length) startDeck(state.deck.key, state.missed.slice()); };
    document.addEventListener('keydown', onKey);
  }
  function toDecks() { $('fcPlay').hidden = true; $('fcSummary').hidden = true; $('fcDecks').hidden = false; }

  C.Flashcards = {
    show:function () { state.visible = true; bind(); $('fcPlay').hidden = true; $('fcSummary').hidden = true; $('fcDecks').hidden = false; if (!state.loaded) load(); },
    hide:function () { state.visible = false; }
  };
})();

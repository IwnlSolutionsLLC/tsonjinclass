/* GOOGLE — a small in-site browser: Google search (SafeSearch on), quick links to learning sites
   and games, and favorites/recent kept on this device. Sites that refuse to be embedded open in a new tab;
   YouTube links go to the YouTube section. The frame is sandboxed so a page can never take over the class site. */
(function () {
  'use strict';
  var C = window.C122, view = document.getElementById('view-google'); if (!C || !view) return;
  var $ = function (id) { return document.getElementById(id); };
  var T = function (key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  };
  var FAV_KEY = 'c122:google-favs', RECENT_KEY = 'c122:google-recent', HOME_URL = 'https://www.google.com/webhp?igu=1&safe=active';
  function read(key) { try { var v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  var LEARN = [
    { name:'Google', url:HOME_URL, icon:'G', color:'#4285f4' },
    { name:'Википедиа', url:'https://mn.wikipedia.org/', icon:'W', color:'#3a3a3a' },
    { name:'Wikipedia', url:'https://en.wikipedia.org/wiki/Main_Page', icon:'W', color:'#5b5b5b' },
    { name:'Газрын зураг', key:'google.site.maps', url:'https://www.google.com/maps?output=embed&q=Ulaanbaatar', icon:'🗺️', color:'#34a853' },
    { name:'Desmos', url:'https://www.desmos.com/calculator', icon:'📈', color:'#2f72b8' },
    { name:'PhET Atom', url:'https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_all.html', icon:'⚛️', color:'#f2a33a' },
    { name:'Орчуулга', key:'google.site.translate', url:'https://translate.google.com/?sl=en&tl=mn', icon:'🌐', color:'#1a73e8' },
    { name:'Khan Academy', url:'https://www.khanacademy.org/', icon:'🎓', color:'#14bf96' }
  ];
  var PLAY = [
    { name:'Chess puzzle', key:'google.site.chessPuzzle', url:'https://lichess.org/training/frame?theme=brown&bg=light', icon:'♞', color:'#8b5a2b' },
    { name:'Chess TV', url:'https://lichess.org/tv/frame?theme=brown&bg=light', icon:'♛', color:'#5d4037' },
    { name:'Dino', url:'https://chromedino.com/', icon:'🦖', color:'#535353' },
    { name:'2048', url:'https://play2048.co/', icon:'🔢', color:'#edc22e' },
    { name:'Quick, Draw!', url:'https://quickdraw.withgoogle.com/', icon:'✏️', color:'#ea4335' },
    { name:'Scratch', url:'https://scratch.mit.edu/projects/editor/', icon:'🐱', color:'#ff8c1a' },
    { name:'Typing', key:'google.site.typing', url:'https://monkeytype.com/', icon:'⌨️', color:'#e2b714' },
    { name:'Kahoot!', url:'https://kahoot.it/', icon:'🟣', color:'#46178f' }
  ];
  // Sites that send "do not embed" headers: open them in a new tab instead of showing an error page.
  var TAB_ONLY = ['facebook.com', 'messenger.com', 'instagram.com', 'threads.net', 'tiktok.com', 'twitter.com', 'x.com', 'reddit.com', 'discord.com', 'linkedin.com', 'pinterest.com',
    'github.com', 'gitlab.com', 'stackoverflow.com', 'amazon.com', 'ebay.com', 'netflix.com', 'spotify.com', 'twitch.tv', 'chatgpt.com', 'openai.com', 'claude.ai', 'anthropic.com', 'gemini.google.com',
    'roblox.com', 'minecraft.net', 'apple.com', 'icloud.com', 'microsoft.com', 'office.com', 'live.com', 'outlook.com', 'bing.com', 'zoom.us', 'canva.com', 'telegram.org', 'whatsapp.com',
    'duolingo.com', 'khanacademy.org', 'coursera.org', 'quickdraw.withgoogle.com', 'scratch.mit.edu', 'kahoot.it', 'kahoot.com', 'translate.google.com', 'monkeytype.com'];
  var state = { visible:false, bound:false, stack:[], index:-1, loading:false, loadTimer:0 };

  /* ---------- address handling ---------- */
  function googleSearch(q) { return 'https://www.google.com/search?igu=1&safe=active&q=' + encodeURIComponent(q); }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function onList(host, list) { return list.some(function (d) { return host === d || host.slice(-(d.length + 1)) === '.' + d; }); }
  function resolve(input) {
    var q = String(input || '').trim(); if (!q) return null;
    if (/^(javascript|data|file|vbscript|blob|about|chrome|chrome-extension|view-source):/i.test(q)) return { kind:'blocked' };
    var hasScheme = /^https?:\/\//i.test(q);
    var looksLikeUrl = hasScheme || (!/\s/.test(q) && /^[^\s\/?#@]+\.[a-z]{2,}(:\d{1,5})?([\/?#].*)?$/i.test(q));
    if (!looksLikeUrl) return { kind:'frame', url:googleSearch(q), label:q, search:true };
    var url; try { url = new URL(hasScheme ? q : 'https://' + q); } catch (e) { return { kind:'frame', url:googleSearch(q), label:q, search:true }; }
    if (url.protocol === 'http:') url.protocol = 'https:';   // an https page cannot frame plain http
    var host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (/^(m\.|music\.)?youtube\.com$|^youtu\.be$|^youtube-nocookie\.com$/.test(host)) return { kind:'youtube', url:url.href, query:url.searchParams.get('search_query') || '' };
    if (/^google\.[a-z.]{2,6}$/.test(host)) {
      if (url.pathname === '/' || url.pathname === '/webhp' || url.pathname === '/search') {
        url.hostname = 'www.google.com'; if (url.pathname === '/') url.pathname = '/webhp';
        url.searchParams.set('igu', '1'); url.searchParams.set('safe', 'active');
        return { kind:'frame', url:url.href, label:url.searchParams.get('q') || '', search:url.pathname === '/search' };
      }
      if (url.pathname.indexOf('/maps') === 0 && url.searchParams.get('output') === 'embed') return { kind:'frame', url:url.href };
      return { kind:'tab', url:url.href };
    }
    if (onList(host, TAB_ONLY)) return { kind:'tab', url:url.href };
    return { kind:'frame', url:url.href };
  }

  /* ---------- navigation ---------- */
  function go(input, options) {
    options = options || {};
    var target = typeof input === 'string' ? resolve(input) : input;
    if (!target) return;
    if (target.kind === 'blocked') { C.toast(T('google.badUrl', 'Ийм хаягийг нээх боломжгүй.'), 'error'); syncAddress(); return; }
    if (target.kind === 'youtube') { syncAddress(); openYouTube(target); return; }
    remember(target);
    if (target.kind === 'tab') { openTab(target.url, true); syncAddress(); renderShelves(); return; }
    if (!options.fromHistory) { state.stack = state.stack.slice(0, state.index + 1); state.stack.push(target); state.index = state.stack.length - 1; }
    load(target);
  }
  function load(target) {
    var frame = $('googleFrame');
    $('googleStart').hidden = true; frame.hidden = false;
    frame.src = target.url;
    setLoading(true);
    $('googleAddress').value = target.search ? target.label : target.url;
    renderChrome();
  }
  function setLoading(on) {
    state.loading = on; clearTimeout(state.loadTimer);
    $('googleProgress').classList.toggle('is-loading', on);
    if (on) state.loadTimer = setTimeout(function () { setLoading(false); }, 15000);
  }
  function syncAddress() { var cur = current(); $('googleAddress').value = cur ? (cur.search ? cur.label : cur.url) : ''; }
  function current() { return state.index >= 0 && !$('googleFrame').hidden ? state.stack[state.index] : null; }
  function home() {
    var frame = $('googleFrame');
    frame.removeAttribute('src'); frame.hidden = true; $('googleStart').hidden = false;
    setLoading(false); $('googleAddress').value = '';
    state.index = Math.min(state.index, state.stack.length - 1);
    renderChrome(); renderShelves();
  }
  function back() {
    if (!current()) { if (state.index >= 0) load(state.stack[state.index]); return; }
    if (state.index > 0) { state.index--; load(state.stack[state.index]); } else home();
  }
  function forward() { if (state.index < state.stack.length - 1) { if (current()) state.index++; load(state.stack[state.index]); } }
  function openTab(url, announce) {
    window.open(url, '_blank', 'noopener,noreferrer');
    if (announce) C.toast(T('google.openedTab', '{site} шинэ табд нээгдлээ.', { site:hostOf(url) || url }));
  }
  function standalone(url) { try { var u = new URL(url); u.searchParams.delete('igu'); return u.href; } catch (e) { return url; } }
  function openYouTube(target) {
    var tab = document.getElementById('tab-youtube');
    if (!tab || !C.YouTube || !C.YouTube.open) { openTab(target.url, true); return; }
    tab.click();
    var q = target.query || (/(?:watch\?v=|shorts\/|live\/|embed\/|youtu\.be\/)/.test(target.url) ? target.url : '');
    if (q) C.YouTube.open(q);
    C.toast(T('google.toYouTube', 'YouTube хэсэгт нээлээ.'));
  }

  /* ---------- favorites + recent ---------- */
  function labelFor(target) { return target.search ? target.label : hostOf(target.url) || target.url; }
  function remember(target) {
    var list = read(RECENT_KEY).filter(function (item) { return item.url !== target.url; });
    list.unshift({ url:target.url, label:labelFor(target), search:!!target.search, at:Date.now() });
    write(RECENT_KEY, list.slice(0, 12));
  }
  function isFav(url) { return read(FAV_KEY).some(function (f) { return f.url === url; }); }
  function toggleFav() {
    var cur = current(); if (!cur) return;
    var list = read(FAV_KEY), had = list.some(function (f) { return f.url === cur.url; });
    list = had ? list.filter(function (f) { return f.url !== cur.url; }) : [{ url:cur.url, label:labelFor(cur) }].concat(list).slice(0, 24);
    write(FAV_KEY, list); renderChrome();
    C.toast(had ? T('google.unstarred', 'Миний сайтуудаас хаслаа.') : T('google.starred', 'Миний сайтуудад нэмлээ ⭐'));
    if (C.SFX) C.SFX.play('pop');
  }

  /* ---------- rendering ---------- */
  function tile(site, extra) {
    var name = site.key ? T(site.key, site.name) : site.name, url = site.url, kind = resolve(url).kind;
    return '<button type="button" class="google-tile" data-google-url="' + C.esc(url) + '" style="--tile:' + C.esc(site.color || '#4285f4') + '">' +
      '<span class="google-tile-icon" aria-hidden="true">' + C.esc(site.icon || (name || '?').charAt(0).toUpperCase()) + '</span>' +
      '<span class="google-tile-copy"><b data-i18n-skip>' + C.esc(name) + '</b><small data-i18n-skip>' + C.esc(hostOf(url)) + '</small></span>' +
      (kind === 'tab' ? '<span class="google-tile-badge" title="' + C.esc(T('google.newTab', 'Шинэ табд нээх')) + '">' + C.icon('external', 'i-sm') + '</span>' : '') +
      (extra || '') + '</button>';
  }
  function renderShelves() {
    $('googleLearn').innerHTML = LEARN.map(function (s) { return tile(s); }).join('');
    $('googlePlay').innerHTML = PLAY.map(function (s) { return tile(s); }).join('');
    var favs = read(FAV_KEY);
    $('googleFavsShelf').hidden = !favs.length;
    $('googleFavs').innerHTML = favs.map(function (f) {
      return tile({ name:f.label, url:f.url, icon:'⭐', color:'#f4b400' }, '<span class="google-tile-remove" role="button" tabindex="0" data-google-unfav="' + C.esc(f.url) + '" aria-label="' + C.esc(T('google.remove', 'Хасах')) + '">' + C.icon('x', 'i-sm') + '</span>');
    }).join('');
    var recent = read(RECENT_KEY);
    $('googleRecentShelf').hidden = !recent.length;
    $('googleRecent').innerHTML = recent.map(function (r) {
      return '<button type="button" class="google-recent-item" data-google-url="' + C.esc(r.url) + '">' + C.icon(r.search ? 'search' : 'globe', 'i-sm') + '<span>' + C.esc(r.label) + '</span></button>';
    }).join('');
  }
  function renderChrome() {
    var cur = current();
    $('googleBack').disabled = !cur && state.index < 0;
    $('googleForward').disabled = state.index >= state.stack.length - 1 || state.index < 0 || (!cur && state.index < 0);
    $('googleReload').disabled = !cur;
    $('googleExternal').disabled = !cur;
    $('googleStar').disabled = !cur;
    var fav = !!cur && isFav(cur.url);
    $('googleStar').setAttribute('aria-pressed', String(fav)); $('googleStar').classList.toggle('is-on', fav);
    $('googleCurrent').textContent = cur ? (cur.search ? 'Google · ' + cur.label : cur.url) : T('google.ready', 'Хайх зүйлээ бичээрэй, эсвэл доорх сайтаас сонгоорой.');
    $('googleHint').hidden = !cur || !!cur.search;
  }

  function fullscreen() {
    var box = $('googleBrowser'), on = document.fullscreenElement || document.webkitFullscreenElement;
    if (on) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    var enter = box.requestFullscreen || box.webkitRequestFullscreen;
    if (enter) Promise.resolve(enter.call(box)).catch(function () { C.toast(T('nav.fullscreenBlocked', 'Бүтэн дэлгэц нээгдсэнгүй. Дахин оролдоно уу.'), 'error'); });
  }

  function bind() {
    if (state.bound) return; state.bound = true;
    $('googleBar').addEventListener('submit', function (e) { e.preventDefault(); var v = $('googleAddress').value; go(v); $('googleAddress').blur(); });
    $('googleBigSearch').addEventListener('submit', function (e) { e.preventDefault(); var v = $('googleBigInput').value; if (!v.trim()) { $('googleBigInput').focus(); return; } $('googleBigInput').value = ''; go(v); });
    $('googleAddress').addEventListener('focus', function () { this.select(); });
    $('googleBack').onclick = back; $('googleForward').onclick = forward; $('googleHome').onclick = home;
    $('googleReload').onclick = function () { var cur = current(); if (cur) load(cur); };
    $('googleExternal').onclick = function () { var cur = current(); if (cur) openTab(standalone(cur.url), false); };
    $('googleHintOpen').onclick = function () { $('googleExternal').click(); };
    $('googleStar').onclick = toggleFav;
    $('googleFullscreen').onclick = fullscreen;
    $('googleClearRecent').onclick = function () { write(RECENT_KEY, []); renderShelves(); };
    $('googleFrame').addEventListener('load', function () { if (!this.hidden && this.getAttribute('src')) setLoading(false); });
    view.addEventListener('click', function (e) {
      var unfav = e.target.closest('[data-google-unfav]');
      if (unfav) { e.preventDefault(); e.stopPropagation(); write(FAV_KEY, read(FAV_KEY).filter(function (f) { return f.url !== unfav.dataset.googleUnfav; })); renderShelves(); return; }
      var link = e.target.closest('[data-google-url]'); if (link) go(link.dataset.googleUrl);
    });
    view.addEventListener('keydown', function (e) {
      var unfav = e.target.closest && e.target.closest('[data-google-unfav]');
      if (unfav && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); unfav.click(); }
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (n) { document.addEventListener(n, function () {
      var on = (document.fullscreenElement || document.webkitFullscreenElement) === $('googleBrowser');
      $('googleFullscreen').querySelector('use').setAttribute('href', on ? '#i-compress' : '#i-expand');
    }); });
    document.addEventListener('c122:language', function () { if (state.visible) { renderShelves(); renderChrome(); } });
  }

  C.Google = {
    show:function () { state.visible = true; bind(); renderShelves(); renderChrome(); if (!current()) setTimeout(function () { var f = $('googleBigInput'); if (f && state.visible && window.matchMedia('(pointer:fine)').matches) f.focus({ preventScroll:true }); }, 60); },
    hide:function () { state.visible = false; },
    go:go
  };
})();

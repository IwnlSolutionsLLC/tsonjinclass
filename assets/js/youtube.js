/* YouTube tab — search and watch together. Uses the official IFrame player (no downloads). */
(function () {
  'use strict';
  var C = window.C122; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var T = function (key, fallback) { return window.C122I18n ? window.C122I18n.t(key, fallback) : fallback; };
  var state = {initialized:false,visible:false,player:null,ready:false,readyWaiters:[],seq:0,results:[],current:null,apiLoading:false};

  /* ---- IFrame Player API (loaded once, on demand) ---- */
  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    return new Promise(function (resolve, reject) {
      state.readyWaiters.push(resolve);
      if (state.apiLoading) return;
      state.apiLoading = true;
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (typeof prev === 'function') try { prev(); } catch (e) {} state.readyWaiters.splice(0).forEach(function (fn) { fn(window.YT); }); };
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api'; tag.async = true;
      tag.onerror = function () { state.apiLoading = false; state.readyWaiters.splice(0).forEach(function () {}); reject(new Error(T('youtube.apiFail','YouTube тоглуулагч ачаалж чадсангүй. Интернэтээ шалгаарай.'))); };
      document.head.appendChild(tag);
    });
  }

  function ensurePlayer() {
    return loadApi().then(function (YT) {
      if (state.player) return state.player;
      return new Promise(function (resolve) {
        var host = $('ytPlayerMount'); host.innerHTML = '<div id="ytPlayerInner"></div>';
        state.player = new YT.Player('ytPlayerInner', {
          host:'https://www.youtube-nocookie.com', width:'100%', height:'100%',
          playerVars:{rel:0, modestbranding:1, playsinline:1, iv_load_policy:3, origin:location.origin},
          events:{
            onReady:function () { state.ready = true; resolve(state.player); },
            onStateChange:function (event) { if (event.data === 1 && C.Music && C.Music.pause) C.Music.pause(); }  // playing → stop Spotify so audio never doubles
          }
        });
      });
    });
  }

  function escattr(value) { return C.esc ? C.esc(value) : String(value == null ? '' : value); }

  function play(track) {
    if (!track || !track.videoId) return;
    state.current = track;
    $('ytPlayerEmpty').hidden = true;
    $('ytNow').hidden = false;
    $('ytNowTitle').textContent = track.title || '';
    $('ytNowChannel').textContent = track.artist || '';
    markActive();
    if (C.Music && C.Music.pause) C.Music.pause();
    ensurePlayer().then(function (player) { try { player.loadVideoById(track.videoId); } catch (e) {} })
      .catch(function (error) { $('ytSearchStatus').textContent = error.message; });
    try { $('ytStage').scrollIntoView({behavior:'smooth', block:'start'}); } catch (e) {}
  }

  function markActive() {
    C.$$('[data-yt-card]', $('ytResults')).forEach(function (card) {
      card.classList.toggle('is-playing', !!state.current && card.getAttribute('data-yt-card') === state.current.videoId);
    });
  }

  function renderResults() {
    var host = $('ytResults');
    if (!state.results.length) { host.innerHTML = ''; return; }
    host.innerHTML = state.results.map(function (track) {
      var thumb = track.thumbnail || ('https://i.ytimg.com/vi/' + track.videoId + '/hqdefault.jpg');
      return '<button type="button" class="yt-card" data-yt-card="' + escattr(track.videoId) + '">' +
        '<span class="yt-card-thumb"><img src="' + escattr(thumb) + '" alt="" loading="lazy"><span class="yt-card-play">' + C.icon('play') + '</span></span>' +
        '<span class="yt-card-copy"><strong>' + escattr(track.title || '') + '</strong><small>' + escattr(track.artist || '') + '</small></span></button>';
    }).join('');
    markActive();
  }

  var URL_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  function search() {
    var q = $('ytSearchInput').value.trim(); if (!q) return;
    var seq = ++state.seq, link = URL_RE.exec(q);
    $('ytSearchStatus').textContent = T('youtube.searching','Хайж байна…'); state.results = []; renderResults();
    var request = link
      ? C.api('music_resolve', {query:{url:q}}).then(function (data) { return {results:[data.track]}; })
      : C.api('music_search', {query:{q:q}});
    request.then(function (data) {
      if (seq !== state.seq) return;
      state.results = (data.results || []).filter(function (t) { return t && t.videoId; });
      renderResults();
      if (!state.results.length) {
        if (data.searchConfigured === false) $('ytSearchStatus').innerHTML = escattr(T('youtube.needKey','Нэрээр хайхын тулд Удирдлага → Music хэсэгт YouTube Data API түлхүүрээ нэг удаа холбоно уу. Одоохондоо холбоос буулгаж үзээрэй.'));
        else $('ytSearchStatus').textContent = T('youtube.noResults','Илэрц олдсонгүй. Өөр үгээр хайгаарай.');
      } else {
        $('ytSearchStatus').textContent = state.results.length + ' ' + T('youtube.found','илэрц');
        if (link) play(state.results[0]);
      }
    }).catch(function (error) {
      if (seq !== state.seq) return;
      var data = error.data || {};
      if (data.youtubeSearchUrl) $('ytSearchStatus').innerHTML = escattr(error.message) + ' <a href="' + escattr(data.youtubeSearchUrl) + '" target="_blank" rel="noopener noreferrer">' + T('youtube.searchOnYt','YouTube дээр хайх') + '</a>';
      else $('ytSearchStatus').textContent = error.message;
    });
  }

  function pause() { if (state.player && state.ready) try { state.player.pauseVideo(); } catch (e) {} }

  function initialize() {
    if (state.initialized) return; state.initialized = true;
    $('ytSearchForm').onsubmit = function (event) { event.preventDefault(); search(); };
    $('ytResults').addEventListener('click', function (event) {
      var card = event.target.closest('[data-yt-card]'); if (!card) return;
      var id = card.getAttribute('data-yt-card'), track = state.results.filter(function (t) { return t.videoId === id; })[0];
      if (track) play(track);
    });
  }

  C.YouTube = {
    show:function () { state.visible = true; initialize(); },
    hide:function () { state.visible = false; pause(); },
    pause:pause,
    // Search for (or play, when it is a video link) something sent from another section, e.g. GOOGLE.
    open:function (query) { initialize(); $('ytSearchInput').value = String(query || '').slice(0, 180); search(); }
  };
})();

/* Shared classroom playlists with Spotify search and playback. */
(function () {
  'use strict';
  var C = window.C122, view = document.getElementById('view-music'), boot = window.C122_SPOTIFY || {};
  if (!C || !view) return;
  var $ = function (id) { return document.getElementById(id); };
  var state = {initialized:false,visible:false,loaded:false,students:[],lists:[],owner:'',filter:'all',playlist:null,csrf:Object.create(null),limits:{},loading:false,busy:false,statusSeq:0,playlistSeq:0,searchSeq:0,searchController:null,results:[],player:null,playerState:null,playingPlaylist:null,trackPage:0,playingBusy:false,seeking:false,progressTimer:null,spotifyConnected:false,spotifyStatusKnown:false,spotifyCsrf:'',spotifyBusy:false,spotifyLoading:false,spotifyEpoch:0,spotifyControllers:new Set(),cooldownUntil:0,cooldownTimer:null};
  function T(key,fallback,params) {
    if (window.C122I18n) return window.C122I18n.t(key,fallback,params);
    return String(fallback).replace(/\{(\w+)\}/g,function (_,name) { return params && params[name] != null ? params[name] : ''; });
  }
  function read(key) { try { return localStorage.getItem(key); } catch (error) { return null; } }
  function write(key,value) { try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key,String(value)); } catch (error) {} }
  function owner() { return state.students.find(function (s) { return s.id === state.owner; }) || null; }
  function editable(playlist) { var s = owner(); return !!s && !!s.unlocked && !!playlist && playlist.folder === s.id; }
  function mine(playlist) { return !!playlist && !!owner() && playlist.folder === owner().id; }
  async function canEdit(playlist) { return mine(playlist) && (editable(playlist) || await unlock()); }
  function notice(message) { $('musicStatus').textContent = message || ''; }
  function errorNotice(error) { if (error.name !== 'AbortError') { notice(error.message); C.toast(error.message,'error'); } }
  function requestUrl(action,query) { var result = 'api.php?action=' + encodeURIComponent(action); Object.keys(query || {}).forEach(function (key) { result += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(query[key]); }); return result; }
  async function request(action,options,retried) {
    options = options || {}; var folder = options.body && options.body.folder || options.query && options.query.folder, post = options.body !== undefined, headers = {};
    if (post) headers['Content-Type'] = 'application/json'; if (folder && state.csrf[folder]) headers['X-Folder-CSRF'] = state.csrf[folder];
    var response; try { response = await fetch(requestUrl(action,options.query),{method:post ? 'POST' : 'GET',credentials:'same-origin',cache:'no-store',headers:headers,body:post ? JSON.stringify(options.body) : undefined,signal:options.signal}); }
    catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоорой.'); }
    var data; try { data = await response.json(); } catch (error) { data = null; }
    if (!response.ok || !data || data.ok === false) {
      if (response.status === 403 && data && data.csrfInvalid && folder && !retried && action !== 'music_session') { var sessionData = await request('music_session',{query:{folder:folder}},true); state.csrf[folder] = sessionData.csrf; return request(action,options,true); }
      var failure = new Error(data && data.error || 'Серверийн алдаа (' + response.status + ')'); failure.status = response.status; failure.data = data;
      if (folder && response.status === 401 && action !== 'folder_unlock') { delete state.csrf[folder]; var student = state.students.find(function (s) { return s.id === folder; }); if (student) student.unlocked = false; renderAccount(); renderPlaylist(); } throw failure;
    }
    if (data.csrf && folder) state.csrf[folder] = data.csrf; return data;
  }
  state.source = 'spotify';   // songs are searched on Spotify only
  state.activeProvider = null; state.nativePlayer = null; state.spotifyPlayer = null;
  function trackKey(track) { return track && (track.uri || track.audioId || track.id) || ''; }
  function playable(track) {
    return !!track && !track.disabled && track.playable !== false &&
      (track.kind === 'audio' ? !!track.audioId && /^api\.php\?action=music_audio_stream&audio=[a-f0-9]{32}$/.test(track.url || '') : track.kind === 'spotify' && /^spotify:track:[A-Za-z0-9]{22}$/.test(track.uri || ''));
  }
  function canPlay(track) { return playable(track) && (track.kind === 'audio' || readyToPlay()); }
  function artwork(track) { return track && track.kind === 'audio' ? 'assets/img/music-cover.svg' : track && C.SpotifyPlayback ? C.SpotifyPlayback.imageUrl(track.image || track.thumbnail || '') : ''; }

  function trackArtwork(track) {
    var image = artwork(track);
    return '<span class="music-track-art" aria-hidden="true">' + (image ? '<img src="' + C.esc(image) + '" alt="" loading="lazy">' : '♪') + '</span>';
  }
  function renderAccount() {
    var student = owner(), open = !!student && !!student.unlocked;
    $('musicUnlock').hidden = !student || open; $('musicLock').hidden = !open; $('musicTrash').hidden = !open;
    ['musicCreate','musicUnlock','musicLock'].forEach(function (id) { $(id).disabled = state.busy; });
    $('musicAccountStatus').textContent = !student ? 'Нэрээрээ плейлист үүсгээрэй. Дуу нь энэ дэлгэц дээр тоглоно.' : open ? student.name + ' · өөрийн плейлистүүдийг засах эрхтэй.' : student.name + ' · плейлист үүсгэх, засахдаа хавтасны кодоо оруулна.';
  }
  function renderLists() {
    var filtered = state.lists.filter(function (list) { return state.filter !== 'mine' || list.folder === state.owner; });
    $('musicPlaylists').innerHTML = filtered.length ? filtered.map(function (list) { return '<button type="button" class="music-playlist-card' + (state.playlist && state.playlist.id === list.id ? ' on' : '') + '" data-music-playlist="' + C.esc(list.id) + '" aria-pressed="' + !!(state.playlist && state.playlist.id === list.id) + '"><span class="music-playlist-card-top"><span aria-hidden="true">♪</span><small>' + Number(list.trackCount || 0) + ' дуу</small></span><strong>' + C.esc(list.name) + '</strong><small>' + C.esc(list.ownerName) + '</small></button>'; }).join('') : state.filter === 'mine' ? '<p class="music-empty-message">' + (state.owner ? 'Чиний плейлист хараахан алга. «Шинэ плейлист» дарж эхлээрэй.' : 'Өөрийн плейлистүүдийг харахын тулд нэрээ сонгоорой.') + '</p>' : '';
    $('musicLibraryEmpty').hidden = !!state.lists.length;
    C.$$('[data-music-filter]',view).forEach(function (button) { var on = button.dataset.musicFilter === state.filter; button.classList.toggle('on',on); button.setAttribute('aria-pressed',String(on)); });
  }
  function trackCopy(track) { return '<div class="music-track-copy"><strong>' + C.esc(track.title || T('music.song','Дуу')) + '</strong><small>' + C.esc(track.artist || (track.kind === 'audio' ? (track.ownerName || T('music.audioTrack','Аудио')) : track.kind === 'spotify' ? '' : 'YouTube хэсэгт үзээрэй')) + '</small></div>'; }
  function readyToPlay() { return state.spotifyConnected && !!state.spotifyPlayer && state.spotifyPlayer.getState().ready && !state.playingBusy && !cooldown(); }
  function renderPlaylist() {
    var p = state.playlist, allowed = mine(p); $('musicPlaylistDetail').hidden = !p; if (!p) return;
    $('musicPlaylistOwner').textContent = p.ownerName + ' · плейлист'; $('musicPlaylistTitle').textContent = p.name; $('musicPlaylistDescription').textContent = p.description || ''; $('musicPlaylistCount').textContent = (p.tracks || []).length + ' дуу';
    $('musicPlaylistPlay').disabled = !(p.tracks || []).some(canPlay) || state.playingBusy;
    ['musicPlaylistEdit','musicPlaylistDelete'].forEach(function (id) { $(id).hidden = !allowed; $(id).disabled = state.busy; });
    $('musicPlaylistEditHint').textContent = allowed ? 'Плейлист сайт дээр хадгалагдана. Дуу нэмэх, хасах, дарааллыг өөрчилж болно.' : 'Нэрээ сонгоод өөрийн плейлистээ үүсгээрэй. Бүгдийн плейлист энэ дэлгэц дээр тоглоно.';
    var tracks = p.tracks || []; state.trackPage = Math.min(state.trackPage,Math.max(0,Math.ceil(tracks.length / 20) - 1));
    $('musicTracks').innerHTML = tracks.length ? tracks.slice(state.trackPage * 20,(state.trackPage + 1) * 20).map(function (track,offset) {
      var index = state.trackPage * 20 + offset, canPlay = playable(track);
      return '<div class="music-track-row" data-music-track-row="' + C.esc(trackKey(track)) + '"><span class="music-track-number">' + (index + 1) + '</span>' + trackArtwork(track) + trackCopy(track) + '<div class="music-track-buttons"><button class="btn btn-ghost btn-sm" type="button" data-music-track-play="' + index + '"' + (!canPlay || (track.kind === 'spotify' && !readyToPlay()) ? ' disabled' : '') + '>Сонсох</button></div>' + (allowed ? '<div class="music-track-owner-tools"><button type="button" data-music-move="' + index + '" data-direction="-1" aria-label="Дууг дээш зөөх"' + (index === 0 || state.busy ? ' disabled' : '') + '>↑</button><button type="button" data-music-move="' + index + '" data-direction="1" aria-label="Дууг доош зөөх"' + (index === tracks.length - 1 || state.busy ? ' disabled' : '') + '>↓</button><button class="music-remove-track" type="button" data-music-remove="' + C.esc(track.id) + '"' + (state.busy ? ' disabled' : '') + '>Хасах</button></div>' : '') + '</div>';
    }).join('') : '<p class="music-empty-message">Дуу хайж энэ плейлистэд нэмээрэй.</p>';
    if (tracks.length > 20) $('musicTracks').innerHTML += '<div class="music-pagination"><button class="btn btn-ghost btn-sm" type="button" data-music-page="' + (state.trackPage - 1) + '"' + (!state.trackPage ? ' disabled' : '') + '>← Өмнөх</button><span>' + (state.trackPage * 20 + 1) + '–' + Math.min(tracks.length,(state.trackPage + 1) * 20) + ' / ' + tracks.length + '</span><button class="btn btn-ghost btn-sm" type="button" data-music-page="' + (state.trackPage + 1) + '"' + ((state.trackPage + 1) * 20 >= tracks.length ? ' disabled' : '') + '>Дараагийн 20 →</button></div>';
    markCurrent();
  }
  function summary(p) { return {id:p.id,folder:p.folder,ownerName:p.ownerName,name:p.name,description:p.description,trackCount:(p.tracks || []).length,version:p.version,updated:p.updated}; }
  function acceptPlaylist(p,select) { if (!p) return; var index = state.lists.findIndex(function (item) { return item.id === p.id; }); if (index < 0) state.lists.unshift(summary(p)); else state.lists[index] = summary(p); if (select !== false) { if (!state.playlist || state.playlist.id !== p.id) state.trackPage = 0; state.playlist = p; } if (state.nativePlayer && state.playingPlaylist === p.id) state.nativePlayer.raw.updateQueue((p.tracks || []).filter(function (t) { return t.kind === 'audio' && playable(t); })); renderLists(); renderPlaylist(); }
  async function loadStatus(selectFirst) {
    var seq = ++state.statusSeq; state.loading = true; notice('Плейлистүүдийг нээж байна…');
    try {
      var data = await request('music_status'); if (seq !== state.statusSeq) return; state.students = data.students || []; state.lists = data.playlists || []; state.limits = data.limits || {}; state.loaded = true;
      var oldOwner = state.owner || read('c122:music-owner') || ''; state.owner = state.students.some(function (s) { return s.id === oldOwner; }) ? oldOwner : '';
      $('musicStudent').innerHTML = '<option value="">Нэрээ сонгоорой</option>' + state.students.map(function (s) { return '<option value="' + C.esc(s.id) + '">' + C.esc(s.name) + '</option>'; }).join(''); $('musicStudent').value = state.owner;
      if (state.playlist && !state.lists.some(function (p) { return p.id === state.playlist.id; })) state.playlist = null;
      renderAccount(); renderLists(); renderPlaylist(); notice(''); if (state.playlist) await loadPlaylist(state.playlist.id); else if (selectFirst && state.lists.length) await loadPlaylist(state.lists[0].id);
    } catch (error) { if (seq === state.statusSeq) errorNotice(error); } finally { if (seq === state.statusSeq) state.loading = false; }
  }
  async function loadPlaylist(id) { var seq = ++state.playlistSeq; notice('Плейлистийг нээж байна…'); try { var data = await request('music_playlist',{query:{id:id}}); if (seq !== state.playlistSeq) return; acceptPlaylist(data.playlist); notice(''); } catch (error) { if (seq === state.playlistSeq) errorNotice(error); } }
  async function session(folder) { if (state.csrf[folder]) return; var data = await request('music_session', { query:{folder:folder} }); state.csrf[folder] = data.csrf; }
  async function unlock() {
    var student = owner();
    if (!student) { notice('Эхлээд өөрийн нэрээ сонгоорой.'); $('musicStudent').focus(); return false; }
    if (student.unlocked) { try { await session(student.id); return true; } catch (error) { if (error.status !== 401) { errorNotice(error); return false; } student.unlocked = false; } }
    return new Promise(function (resolve) {
      var modal = C.openModal('<h3>' + C.esc(student.name) + '-ийн Music</h3><p class="lead">Хувийн хавтасны 4 оронтой кодоо оруулаад плейлистээ үүсгэж, засаарай.</p><form><div class="field"><label for="musicOwnerPin">Хавтасны код</label><input class="input" id="musicOwnerPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required autofocus></div><div class="err" aria-live="polite"></div><div class="actions"><button class="btn btn-ghost" type="button" data-close>Болих</button><button class="btn btn-primary" type="submit">Нээх</button></div></form>', { onClose:function (result) { resolve(!!result); } }); modal.el.classList.add('music-modal');
      var field = modal.el.querySelector('input'); field.oninput = function () { field.value = field.value.replace(/[^0-9]/g,'').slice(0,4); };
      modal.el.querySelector('form').onsubmit = async function (event) {
        event.preventDefault(); if (!/^\d{4}$/.test(field.value)) return; var button = modal.el.querySelector('[type=submit]'); button.disabled = true;
        try { var data = await request('folder_unlock', { body:{folder:student.id,pin:field.value} }); state.csrf[student.id] = data.csrf; student.unlocked = true; field.value = ''; renderAccount(); renderPlaylist(); modal.close(true); }
        catch (error) { field.value = ''; modal.el.querySelector('.err').textContent = error.message; button.disabled = false; }
      };
    });
  }
  async function lock() {
    var student = owner(); if (!student || state.busy) return;
    try { await session(student.id); await request('folder_lock', { body:{folder:student.id} }); student.unlocked = false; delete state.csrf[student.id]; renderAccount(); renderPlaylist(); notice('Плейлист засах эрхийг түгжлээ. Сонсож болно.'); }
    catch (error) { errorNotice(error); }
  }
  async function mutate(action, p, fields, options) {
    options = options || {}; if (state.busy) throw new Error('Одоогийн үйлдлийг дуусгахыг хүлээгээрэй.');
    state.busy = true; var context = state.playlistSeq; state.statusSeq++; state.loading = false; renderAccount(); renderPlaylist();
    try {
      await session(p.folder); var body = Object.assign({ folder:p.folder, id:p.id, version:p.version }, fields || {}); var data = await request(action, { body:body });
      if (data.playlist) acceptPlaylist(data.playlist, context === state.playlistSeq);
      if (options.message) notice(options.message); return data;
    } catch (error) {
      if (error.status === 409 && error.data && error.data.conflict) { if (context === state.playlistSeq) await loadPlaylist(p.id); error.message = 'Энэ плейлист өөр төхөөрөмж дээр өөрчлөгджээ. Шинэ хувилбарыг нээлээ; үйлдлээ дахин хийгээрэй.'; }
      throw error;
    } finally { state.busy = false; renderAccount(); renderPlaylist(); }
  }
  function playlistForm(existing) {
    return new Promise(function (resolve) {
      var modal = C.openModal('<h3>' + (existing ? 'Плейлист засах' : 'Шинэ плейлист') + '</h3><form><div class="field"><label for="musicListName">Нэр</label><input class="input" id="musicListName" maxlength="80" required autofocus value="' + C.esc(existing && existing.name || '') + '" placeholder="Жишээ нь: Оройн аялгуу"></div><div class="field"><label for="musicListDescription">Тайлбар</label><textarea class="input" id="musicListDescription" maxlength="500" placeholder="Энэ плейлистийн мэдрэмж…">' + C.esc(existing && existing.description || '') + '</textarea></div><div class="err" aria-live="polite"></div><div class="actions"><button type="button" class="btn btn-ghost" data-close>Болих</button><button type="submit" class="btn btn-primary">Хадгалах</button></div></form>', { onClose:function (value) { resolve(value || null); } }); modal.el.classList.add('music-modal');
      modal.el.querySelector('form').onsubmit = function (event) { event.preventDefault(); var name = modal.el.querySelector('#musicListName').value.trim(); if (!name) return; modal.close({ name:name, description:modal.el.querySelector('#musicListDescription').value.trim() }); };
    });
  }
  async function createPlaylist() {
    if (state.busy || !await unlock()) return null;
    var student = owner(); if (!student) return null;
    var fields = await playlistForm(null); if (!fields) return null;
    try { var data = await mutate('music_playlist_create', { folder:student.id }, fields, {message:'Плейлист үүслээ. Дуугаа нэмээрэй.'}); state.filter = 'mine'; renderLists(); return data.playlist; }
    catch (error) { errorNotice(error); return null; }
  }
  async function editPlaylist() { var p = state.playlist; if (state.busy || !await canEdit(p)) return; var fields = await playlistForm(p); if (!fields) return; try { await mutate('music_playlist_update', p, fields, {message:'Плейлист хадгалагдлаа.'}); } catch (error) { errorNotice(error); } }
  async function deletePlaylist() {
    var p = state.playlist; if (state.busy || !await canEdit(p)) return;
    if (!await C.confirm({title:'«' + p.name + '» плейлистийг хасах уу?',text:'Хогийн савнаас буцааж сэргээж болно.',ok:'Хогийн саванд хийх',danger:true})) return;
    try { await mutate('music_playlist_delete', p); if (state.playingPlaylist === p.id) { pausePlayback(); state.playingPlaylist = null; } state.playlist = null; state.lists = state.lists.filter(function (list) { return list.id !== p.id; }); renderLists(); renderPlaylist(); notice('Плейлист хогийн саванд орлоо.'); }
    catch (error) { errorNotice(error); }
  }
  async function trash() {
    var student = owner(); if (!student || !await unlock()) return;
    var alive = true, modal = C.openModal('<h3>Миний хогийн сав</h3><div class="music-trash-items">Нээж байна…</div><div class="err" aria-live="polite"></div><div class="actions"><button class="btn btn-ghost" type="button" data-close>Хаах</button></div>', {onClose:function () { alive = false; }}); modal.el.classList.add('music-modal');
    try {
      var data = await request('music_trash', {query:{folder:student.id}}); if (!alive) return;
      var lists = data.playlists || [];
      modal.el.querySelector('.music-trash-items').innerHTML = lists.length ? lists.map(function (p) { return '<div class="music-trash-row"><span>' + C.esc(p.name) + '<small>' + Number(p.trackCount || 0) + ' дуу</small></span><button class="btn btn-ghost btn-sm" type="button" data-music-restore="' + C.esc(p.id) + '">Сэргээх</button></div>'; }).join('') : '<p class="music-help">Хогийн сав хоосон байна.</p>';
      modal.el.querySelector('.music-trash-items').onclick = async function (event) { var button = event.target.closest('[data-music-restore]'); if (!button) return; var p = lists.find(function (list) { return list.id === button.dataset.musicRestore; }); if (!p) return; button.disabled = true; try { await mutate('music_playlist_restore', p, {}, {message:'Плейлист сэргээгдлээ.'}); if (alive) { button.closest('.music-trash-row').remove(); if (!modal.el.querySelector('.music-trash-row')) modal.el.querySelector('.music-trash-items').textContent = 'Хогийн сав хоосон байна.'; } } catch (error) { if (alive) { modal.el.querySelector('.err').textContent = error.message; button.disabled = false; } } };
    } catch (error) { if (alive) { modal.el.querySelector('.music-trash-items').textContent = ''; modal.el.querySelector('.err').textContent = error.message; } }
  }
  async function chooseAddPlaylist() {
    if (!await unlock()) return null;
    var student = owner(); if (!student) return null;
    var lists = state.lists.filter(function (p) { return p.folder === student.id; });
    if (!lists.length) return createPlaylist();
    return new Promise(function (resolve) {
      var modal = C.openModal('<h3>Аль плейлистэд нэмэх вэ?</h3><form><div class="field"><label for="musicAddTarget">' + C.esc(student.name) + '-ийн плейлист</label><select class="input" id="musicAddTarget">' + lists.map(function (p) { return '<option value="' + C.esc(p.id) + '"' + (state.playlist && state.playlist.id === p.id ? ' selected' : '') + '>' + C.esc(p.name) + '</option>'; }).join('') + '</select></div><div class="actions"><button type="button" class="btn btn-ghost" data-close>Болих</button><button type="submit" class="btn btn-primary">Энд нэмэх</button></div></form>', {onClose:function (id) { resolve(id || null); }}); modal.el.classList.add('music-modal'); modal.el.querySelector('form').onsubmit = function (event) { event.preventDefault(); modal.close(modal.el.querySelector('select').value); };
    }).then(async function (id) { if (!id) return null; var data = await request('music_playlist',{query:{id:id}}); return data.playlist; });
  }
  async function addResult(index) {
    var track = state.results[index]; if (!track || state.busy) return;
    try { var p = await chooseAddPlaylist(); if (!p) return; await mutate('music_track_add',p,track.kind === 'audio' ? {kind:'audio',audioId:track.audioId} : {kind:'spotify',spotifyId:track.spotifyId || track.id},{message:'Дуу плейлистэд нэмэгдлээ.'}); }
    catch (error) { errorNotice(error); }
  }
  async function removeTrack(id) { var p = state.playlist; if (state.busy || !await canEdit(p)) return; try { await mutate('music_track_remove',p,{trackId:id},{message:'Дуу плейлистээс хасагдлаа.'}); } catch (error) { errorNotice(error); } }
  async function moveTrack(index,direction) {
    var p = state.playlist; if (state.busy || !await canEdit(p)) return; var target = index + direction; if (target < 0 || target >= p.tracks.length) return;
    var ids = p.tracks.map(function (track) { return track.id; }), temp = ids[index]; ids[index] = ids[target]; ids[target] = temp;
    try { await mutate('music_track_reorder',p,{trackIds:ids},{message:'Дууны дараалал хадгалагдлаа.'}); } catch (error) { errorNotice(error); }
  }
  function cooldown() { return Math.max(0,state.cooldownUntil - Date.now()); }
  function spotifyNotice(message,error) { $('musicSpotifyNotice').textContent = message || ''; $('musicSpotifyNotice').classList.toggle('is-error',!!error); }
  function setCooldown(seconds) {
    seconds = Math.max(1,Math.min(86400,Number(seconds) || 30)); state.cooldownUntil = Date.now() + seconds * 1000; clearTimeout(state.cooldownTimer);
    state.cooldownTimer = setTimeout(function () { renderSpotifyAccount(); renderResults(); renderPlaylist(); if (state.player) playerChanged(state.player.getState()); },seconds * 1000);
    renderSpotifyAccount(); renderResults(); renderPlaylist();
  }
  function stopSpotify() {
    state.spotifyEpoch++; state.searchSeq++; state.spotifyControllers.forEach(function (controller) { controller.abort(); }); state.spotifyControllers.clear();
    if (state.spotifyPlayer) state.spotifyPlayer.disconnect();
    state.spotifyConnected = false; state.spotifyStatusKnown = true; state.spotifyLoading = false; state.playingBusy = false; state.searchController = null; state.results = []; if (state.activeProvider === 'spotify') state.playingPlaylist = null;
    $('musicSearchStatus').textContent = '';
    clearInterval(state.progressTimer); state.progressTimer = null; renderSpotifyAccount(); renderResults(); renderPlaylist();
  }
  async function spotifyRequest(action,options) {
    options = options || {};
    if (cooldown() && action !== 'disconnect') { var wait = new Error(T('music.rateLimited','Түр хязгаарлалаа. {seconds} секундын дараа оролдоорой.',{seconds:Math.ceil(cooldown() / 1000)})); wait.status = 429; throw wait; }
    var post = options.body !== undefined, controller = new AbortController(), url = boot.apiUrl || 'spotify.php', headers = {}, timedOut = false;
    url += (url.indexOf('?') < 0 ? '?' : '&') + 'action=' + encodeURIComponent(action);
    Object.keys(options.query || {}).forEach(function (key) { url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(options.query[key]); });
    if (post) { headers['Content-Type'] = 'application/json'; headers['X-CSRF'] = state.spotifyCsrf; }
    function abort() { controller.abort(); }
    if (options.signal) { if (options.signal.aborted) controller.abort(); else options.signal.addEventListener('abort',abort,{once:true}); }
    state.spotifyControllers.add(controller); var timer = setTimeout(function () { timedOut = true; controller.abort(); },30000);
    try {
      var response = await fetch(url,{method:post ? 'POST' : 'GET',credentials:'same-origin',cache:'no-store',headers:headers,body:post ? JSON.stringify(options.body) : undefined,signal:controller.signal});
      var data; try { data = await response.json(); } catch (error) { data = null; }
      if (!response.ok || !data || data.ok === false) {
        var fallback = [502,503,504].indexOf(response.status) >= 0 ? T('music.gatewayDown','Холболтын сервер хариу өгсөнгүй. Хэдэн секунд хүлээгээд дахин оролдоорой.') : T('music.actionFailed','Үйлдэл амжилтгүй боллоо ({status}).',{status:response.status});
        var failure = new Error(data && data.error ? T(data.error,data.error) : fallback); failure.status = response.status; failure.code = data && data.code || ''; failure.action = action;
        if (response.status === 429) { var seconds = Number(data && data.retryAfter || response.headers.get('Retry-After')) || 30; setCooldown(seconds); failure.message += ' ' + T('music.retryIn','{seconds} секундын дараа дахин оролдоорой.',{seconds:Math.ceil(seconds)}); }
        if (response.status === 401) { stopSpotify(); failure.message = T('music.sessionExpired','Энэ дэлгэцийн холболтын хугацаа дууслаа. Дахин холбоорой.'); spotifyNotice(failure.message,true); } throw failure;
      }
      if (data.csrf) state.spotifyCsrf = data.csrf; return data;
    } catch (error) {
      if (error.name === 'AbortError') { if (timedOut) throw new Error(T('music.serverSlow','Серверийн хариу удаж байна. Дахин оролдоорой.')); throw error; }
      if (error.status) throw error; throw new Error('Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоорой.');
    } finally { clearTimeout(timer); state.spotifyControllers.delete(controller); if (options.signal) options.signal.removeEventListener('abort',abort); }
  }
  function renderSpotifyAccount() {
    var showStreaming = true;
    $('musicSpotifyAccount').hidden = !showStreaming || state.spotifyConnected || !state.spotifyStatusKnown;
    $('musicSpotifyNotice').hidden = !showStreaming; if (!showStreaming) $('musicSpotifyHelp').hidden = true;
    $('musicSpotifyConnect').disabled = state.spotifyLoading || state.spotifyBusy || !state.spotifyCsrf || !!cooldown();
    $('musicSpotifyRetry').disabled = state.spotifyLoading || state.spotifyBusy || !!cooldown();
    $('musicSearchInput').disabled = !state.spotifyConnected || !!cooldown(); $('musicSearchButton').disabled = !!state.searchController || !state.spotifyConnected || !!cooldown();
  }
  async function loadSpotifyStatus() {
    if (state.spotifyLoading || cooldown()) return; var epoch = state.spotifyEpoch; state.spotifyLoading = true; renderSpotifyAccount();
    try {
      var data = await spotifyRequest('status'); if (epoch !== state.spotifyEpoch) return;
      if (!data.connected && state.spotifyConnected) { stopSpotify(); spotifyNotice(data.notice || T('music.reconnect','Энэ дэлгэцийн тоглуулагчийг дахин холбоорой.')); return; }
      state.spotifyConnected = !!data.connected; state.spotifyStatusKnown = true;
      if (data.retryAfter) setCooldown(data.retryAfter);
      var noticeError = !!data.notice && (!data.connected || !data.profile);
      spotifyNotice(data.notice || (data.connected ? '' : T('music.connectFirst','Дуу тоглуулахын өмнө тоглуулагчийг холбоорой.')),noticeError);
      $('musicSpotifyHelp').hidden = !noticeError; state.spotifyLoading = false; renderSpotifyAccount();
      if (state.spotifyConnected && !cooldown()) startPlayer();
    } catch (error) { if (epoch === state.spotifyEpoch && error.name !== 'AbortError') { state.spotifyStatusKnown = true; spotifyNotice(error.message,true); $('musicSpotifyHelp').hidden = false; } }
    finally { if (epoch === state.spotifyEpoch) { state.spotifyLoading = false; renderSpotifyAccount(); } }
  }
  async function connectSpotify() {
    if (state.spotifyBusy || state.spotifyLoading || cooldown()) return; state.spotifyBusy = true; renderSpotifyAccount();
    try { var data = await spotifyRequest('connect',{body:{}}), destination = new URL(data.url); if (destination.protocol !== 'https:' || destination.hostname !== 'accounts.spotify.com') throw new Error(T('music.badConnectUrl','Холболтын хаяг буруу байна.')); window.location.assign(destination.href); }
    catch (error) { if (error.name !== 'AbortError') spotifyNotice(error.message,true); state.spotifyBusy = false; renderSpotifyAccount(); }
  }
  function playerError(message,kind) {
    $('musicPlayerError').textContent = message; $('musicSpotifyHelp').hidden = ['authentication','account','permissions','initialization','offline'].indexOf(kind) < 0;
    if (kind === 'authentication') stopSpotify(); renderSpotifyAccount(); renderResults(); renderPlaylist();
  }
  function startPlayer() {
    if (!state.spotifyConnected || cooldown()) return;
    if (!C.SpotifyPlayback) { playerError(T('music.playerMissing','Тоглуулагч ачаалагдсангүй. Хуудсыг дахин нээнэ үү.'),'initialization'); return; }
    if (!state.spotifyPlayer) state.spotifyPlayer = C.SpotifyPlayback.create({request:spotifyRequest,volume:Number($('musicVolume').value) / 100,onState:function (snapshot) { if (state.activeProvider !== 'audio') { state.player = state.spotifyPlayer; playerChanged(snapshot); } renderResults(); renderPlaylist(); },onError:playerError});
    if (state.activeProvider !== 'audio') state.player = state.spotifyPlayer;
    return state.spotifyPlayer.connect();
  }
  function clockTime(milliseconds) { var seconds = Math.max(0,Math.floor(Number(milliseconds) / 1000 || 0)); return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0'); }
  function markCurrent() { var track = state.playerState && state.playerState.track; C.$$('[data-music-track-row]',view).forEach(function (row) { row.classList.toggle('is-current',!!track && row.dataset.musicTrackRow === trackKey(track)); }); }
  function playerChanged(snapshot) {
    state.playerState = snapshot; var track = snapshot.track, restricted = snapshot.disallows || {}, ready = snapshot.provider === 'audio' ? !state.playingBusy : readyToPlay();
    $('musicNowTitle').textContent = track ? track.title : 'Өнөөдрийн аялгуу'; $('musicNowArtist').textContent = track ? track.artist || '' : 'Дуу хайж эсвэл ангийн плейлистээ сонгоорой.';
    $('musicNowKicker').textContent = track ? 'NOW PLAYING' : 'Дуугаа сонгоорой'; $('musicNowKicker').hidden = false;
    $('musicPlayerPlaceholder').hidden = !!track && !!track.image; $('musicCoverLink').hidden = !track || !track.image;
    if (track && track.image && $('musicCover').src !== track.image) $('musicCover').src = track.image;
    $('musicPlay').disabled = !ready || !track || (snapshot.paused ? restricted.resuming : restricted.pausing); $('musicPlay').innerHTML = C.icon(snapshot.paused ? 'play' : 'pause'); $('musicPlay').setAttribute('aria-label',snapshot.paused ? 'Тоглуулах' : 'Түр зогсоох');
    $('musicPrevious').disabled = !ready || !track || !!restricted.skipping_prev; $('musicNext').disabled = !ready || !track || !!restricted.skipping_next;
    if (!state.seeking) $('musicPosition').textContent = clockTime(snapshot.positionMs);
    $('musicDuration').textContent = clockTime(snapshot.durationMs); $('musicSeek').disabled = !ready || !track || !snapshot.durationMs || !!restricted.seeking;
    if (!state.seeking) $('musicSeek').value = snapshot.durationMs ? Math.min(100,snapshot.positionMs / snapshot.durationMs * 100) : 0;
    $('musicVolume').disabled = !snapshot.ready || (snapshot.provider !== 'audio' && isIos());
    var deck = view.querySelector('.music-player'); if (deck) { deck.classList.toggle('is-playing',!!track && !snapshot.paused); }
    markCurrent(); renderSpotifyAccount();
    // Keep the clock running whenever audio plays, even in the background, so the mini-player stays in sync.
    if (!state.progressTimer && !snapshot.paused) state.progressTimer = setInterval(updateProgress,400);   // re-anchor lyrics ~2.5x/s so they don't drift ahead/behind
    if (state.progressTimer && snapshot.paused) { clearInterval(state.progressTimer); state.progressTimer = null; }
    updateMediaSession(snapshot); updateMiniBar(snapshot); renderQueueState(snapshot);
    emitState(snapshot);
  }
  function updateProgress() {
    if (!state.player) return; var snapshot = state.player.getState();
    if (state.visible && !state.seeking) { $('musicPosition').textContent = clockTime(snapshot.positionMs); $('musicSeek').value = snapshot.durationMs ? snapshot.positionMs / snapshot.durationMs * 100 : 0; }
    updateMediaSession(snapshot); updateMiniBar(snapshot); renderQueueState(snapshot);
    emitState(snapshot);
  }
  function isIos() { return /iPad|iPhone|iPod/.test(navigator.userAgent || '') || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; }
  function renderNote() { $('musicPlaybackNote').textContent = isIos() ? T('music.noteIos','Дууны чангыг төхөөрөмжийн товчоор тааруулна.') : T('music.note','Ангийн плейлистүүд сайт дээр хадгалагдана.'); }
  /* Lets the lyrics view follow playback: positionMs was true at `at` (performance.now()); extrapolate while !paused. */
  function emitState(snapshot) {
    snapshot = snapshot || {}; var track = snapshot.track || null, now = window.performance && performance.now ? performance.now() : Date.now();
    var detail = {track:track ? {uri:trackKey(track),title:track.title || '',artist:track.artist || '',album:track.album || '',durationMs:Number(track.durationMs || snapshot.durationMs) || 0,image:track.image || ''} : null,
      positionMs:Math.max(0,Number(snapshot.positionMs) || 0),paused:snapshot.paused !== false,ready:!!snapshot.ready,at:now};
    try { document.dispatchEvent(new CustomEvent('c122:music-state',{detail:detail})); } catch (error) {}
  }
  function seekTo(ms) {
    var player = state.player, snapshot = player && player.getState(), target = Number(ms);
    if (!snapshot || !snapshot.track || !snapshot.ready || !isFinite(target) || snapshot.disallows && snapshot.disallows.seeking || !player.activate()) return Promise.resolve(null);
    target = Math.round(Math.max(0,Math.min(target,snapshot.durationMs || target)));
    var pending = player.command('seek',target);
    pending.then(function () { if (player === state.player) emitState(player.getState()); },function (error) { if (player === state.player && error.name !== 'AbortError') playerError(error.message,'playback'); });
    return pending;
  }
  function pausePlayback() { if (state.player && state.player.getState().ready && !state.player.getState().paused) state.player.command('pause').catch(function () {}); }
  function playbackFailure(error) {
    if (error.name === 'AbortError') return;
    if (error.status === 429) setCooldown(error.retryAfter || 30);
    var kind = error.status === 401 ? 'authentication' : error.status === 403 ? 'permissions' : error.status === 429 ? 'rate' : error.status === 404 || error.code === 'spotify_network' ? 'offline' : 'playback';
    playerError(error.message,kind);
  }
  /* Older playlists may still hold saved audio tracks; they play back-to-back, without mixing. */
  function userVolume() { var v = Number($('musicVolume').value) / 100; return Math.max(0,Math.min(1,isFinite(v) ? v : 0.8)); }
  function applyVolume(v) { if (state.player) state.player.command('setVolume',v).catch(function () {}); }
  function nativeSnapshot(raw) {
    var t = raw.track ? Object.assign({},raw.track,{uri:trackKey(raw.track),image:artwork(raw.track)}) : null;
    return Object.assign({},raw,{track:t,provider:'audio',ready:true,paused:!raw.isPlaying,positionMs:raw.position * 1000,durationMs:raw.duration * 1000,disallows:{}});
  }
  function ensureNative() {
    if (state.nativePlayer) return state.nativePlayer;
    if (!C.MusicPlayer) throw new Error('Аудио тоглуулагч ачаалагдсангүй. Хуудсыг дахин нээнэ үү.');
    var raw = C.MusicPlayer.create({audioElementA:'#musicAudioA',audioElementB:'#musicAudioB',youtubeContainer:'#musicUnusedVideo',
      onChange:function (value) { if (state.activeProvider === 'audio') { playerChanged(nativeSnapshot(value)); renderResults(); } },
      onError:function (message) { if (state.activeProvider === 'audio') playerError(message,'playback'); }});
    var adapter = {raw:raw,activate:function () { return true; },getState:function () { return nativeSnapshot(raw.getState()); },refresh:function () { var value = this.getState(); if (state.activeProvider === 'audio') playerChanged(value); return Promise.resolve(value); },
      command:function (method,value) { try { var result;
        if (method === 'togglePlay') result = raw.toggle(); else if (method === 'pause') result = raw.pause(); else if (method === 'resume') result = raw.play();
        else if (method === 'seek') result = raw.seek(value / 1000); else if (method === 'nextTrack') result = raw.next(); else if (method === 'previousTrack') result = raw.previous();
        else if (method === 'setVolume') result = raw.setVolume(value); return Promise.resolve(result);
      } catch (error) { return Promise.reject(error); } }};
    state.nativePlayer = adapter; raw.setVolume(userVolume()); raw.setMix(false,8);
    raw.setShuffle(read('c122:music-shuffle') === '1'); raw.setRepeat(read('c122:music-repeat') || 'off');
    return adapter;
  }
  async function playQueue(tracks,index,playlistId) {
    var selected = tracks[Math.max(0,Number(index) || 0)]; if (!playable(selected)) return;
    if (C.YouTube && C.YouTube.pause) C.YouTube.pause();
    $('musicPlayerError').textContent = '';
    if (selected.kind === 'audio') {
      try {
        var native = ensureNative(), wasNative = state.activeProvider === 'audio';
        if (state.spotifyPlayer && state.activeProvider === 'spotify') await state.spotifyPlayer.command('pause');
        state.activeProvider = 'audio'; state.player = native; state.playingPlaylist = playlistId || null;
        var queue = tracks.filter(function (item) { return item.kind === 'audio' && playable(item); });
        if (!playlistId && wasNative && native.getState().track) await native.raw.transitionTo(selected);
        else await native.raw.playQueue(queue,queue.indexOf(selected));
        playerChanged(native.getState()); renderPlaylist(); renderResults();
      } catch (error) { playbackFailure(error); }
      return;
    }
    if (state.playingBusy) return;
    if (!state.spotifyConnected) { spotifyNotice('Эхлээд энэ дэлгэцийн тоглуулагчийг холбоорой.',true); $('musicSpotifyConnect').focus(); return; }
    var spotify = state.spotifyPlayer;
    if (!spotify || !spotify.activate()) { playerError('Тоглуулагч бэлэн болсны дараа Сонсох товчийг дахин дарна уу.','offline'); startPlayer(); return; }
    var queue = tracks.slice(Math.max(0,Number(index) || 0)).filter(function (item) { return item.kind === 'spotify' && playable(item); });
    if (state.nativePlayer) state.nativePlayer.raw.pause(); state.activeProvider = 'spotify'; state.player = spotify;
    var epoch = state.spotifyEpoch; state.playingBusy = true; state.queue = queue; renderPlaylist(); renderResults();
    try { await spotify.play({uris:queue.map(function (item) { return item.uri; }),positionMs:0}); if (epoch === state.spotifyEpoch) state.playingPlaylist = playlistId || null; }
    catch (error) { if (epoch === state.spotifyEpoch) playbackFailure(error); }
    finally { if (epoch === state.spotifyEpoch) { state.playingBusy = false; renderPlaylist(); renderResults(); playerChanged(spotify.getState()); } }
  }
  function sdkCommand(method,value) { if (!state.player || !state.player.activate()) return; state.player.command(method,value).then(function () { $('musicPlayerError').textContent = ''; }).catch(function (error) { playerError(error.message,'playback'); }); }
  function togglePlay() { if (C.YouTube && C.YouTube.pause) C.YouTube.pause(); sdkCommand('togglePlay'); }
  function skipNext() { sdkCommand('nextTrack'); }
  function skipPrevious() { sdkCommand('previousTrack'); }
  function renderQueueState(snapshot) {
    var native = snapshot.provider === 'audio';
    $('musicShuffle').disabled = !native; $('musicRepeat').disabled = !native;
    $('musicShuffle').setAttribute('aria-pressed',String(!!snapshot.shuffle));
    $('musicRepeat').textContent = snapshot.repeat === 'one' ? '↻ 1' : snapshot.repeat === 'all' ? '↻ Бүгд' : '↻';
    $('musicRepeat').setAttribute('aria-label','Давтах: ' + (snapshot.repeat || 'off'));
    $('musicRepeat').setAttribute('aria-pressed',String(!!snapshot.repeat && snapshot.repeat !== 'off'));
    var queue = $('musicQueue');
    if (!native || !snapshot.queue || !snapshot.queue.length) { queue.hidden = true; return; }
    queue.hidden = false; var signature = snapshot.queue.map(trackKey).join(',') + ':' + snapshot.index;
    if (queue.dataset.signature === signature) return; queue.dataset.signature = signature;
    $('musicQueueCount').textContent = snapshot.queue.length + ' дуу';
    $('musicQueueTracks').innerHTML = snapshot.queue.map(function (item,i) { return '<button type="button" data-music-queue-play="' + i + '" class="music-queue-row' + (i === snapshot.index ? ' on' : '') + '" aria-current="' + (i === snapshot.index ? 'true' : 'false') + '"><span>' + (i === snapshot.index ? '♪' : i + 1) + '</span><strong>' + C.esc(item.title) + '</strong><small>' + C.esc(item.artist || '') + '</small></button>'; }).join('');
  }
  function renderResults() {
    $('musicSearchResults').innerHTML = state.results.slice(0,20).map(function (track,index) { return '<div class="music-track-row">' + trackArtwork(track) + trackCopy(track) + '<div class="music-track-buttons"><button class="btn btn-ghost btn-sm" type="button" data-music-result-play="' + index + '"' + (!canPlay(track) ? ' disabled' : '') + '>Сонсох</button><button class="btn btn-ghost btn-sm" type="button" data-music-result-add="' + index + '"' + (state.busy || (track.kind === 'spotify' && (!state.spotifyConnected || !!cooldown())) ? ' disabled' : '') + '>Нэмэх</button></div></div>'; }).join('');
  }
  async function search() {
    var q = $('musicSearchInput').value.trim(); if (!q) return;
    if (!state.spotifyConnected || cooldown()) return;
    if (state.searchController) state.searchController.abort(); var controller = new AbortController(), seq = ++state.searchSeq;
    state.searchController = controller; renderSpotifyAccount(); $('musicSearchStatus').textContent = 'Дуу хайж байна…'; state.results = []; renderResults();
    try {
      var data = await spotifyRequest('search',{query:{q:q},signal:controller.signal});
      if (seq !== state.searchSeq) return;
      state.results = (data.tracks || []).map(function (item) { return Object.assign({},item,{kind:'spotify',spotifyId:item.spotifyId || item.id}); });
      renderResults(); $('musicSearchStatus').textContent = state.results.length ? state.results.length + ' дуу олдлоо.' : 'Илэрц олдсонгүй. Өөр нэрээр хайгаарай.';
    } catch (error) { if (seq === state.searchSeq && error.name !== 'AbortError') $('musicSearchStatus').textContent = error.message; }
    finally { if (seq === state.searchSeq) { state.searchController = null; renderSpotifyAccount(); } }
  }
  function initialize() {
    if (state.initialized) return; state.initialized = true;
    renderNote(); document.addEventListener('c122:language',function () { renderNote(); renderResults(); renderPlaylist(); });
    var volume = Number(read('c122:music-volume')); $('musicVolume').value = Math.round(read('c122:music-volume') == null || !Number.isFinite(volume) ? 80 : Math.max(0,Math.min(1,volume)) * 100);
    $('musicStudent').onchange = function () { state.owner = this.value; write('c122:music-owner',state.owner); renderAccount(); renderLists(); renderPlaylist(); notice(''); };
    $('musicUnlock').onclick = unlock; $('musicLock').onclick = lock; $('musicCreate').onclick = createPlaylist; $('musicRefresh').onclick = function () { loadStatus(true); }; $('musicTrash').onclick = trash;
    $('musicPlaylistEdit').onclick = editPlaylist; $('musicPlaylistDelete').onclick = deletePlaylist; $('musicPlaylistPlay').onclick = function () { if (state.playlist) playQueue(state.playlist.tracks || [],0,state.playlist.id); };
    $('musicSpotifyConnect').onclick = connectSpotify; $('musicSpotifyRetry').onclick = function () { if (state.spotifyPlayer && !state.spotifyPlayer.getState().ready) state.spotifyPlayer.disconnect(); loadSpotifyStatus(); };
    $('musicSearchForm').onsubmit = function (event) { event.preventDefault(); search(); };
    $('musicPlay').onclick = togglePlay; $('musicNext').onclick = skipNext; $('musicPrevious').onclick = skipPrevious;
    setupMediaSession(); buildMiniBar();
    var seekRevision = 0, seekOwner = null, seekTrack = '', seekCommitting = false;
    $('musicSeek').oninput = function () {
      var snapshot = state.player && state.player.getState(); if (!snapshot || !snapshot.track) return;
      if (!state.seeking || seekCommitting) { seekOwner = state.player; seekTrack = trackKey(snapshot.track); }
      seekRevision++; seekCommitting = false;
      state.seeking = true; $('musicPosition').textContent = clockTime(Number(this.value) / 100 * snapshot.durationMs);
      this.setAttribute('aria-valuetext',$('musicPosition').textContent + ' / ' + clockTime(snapshot.durationMs));
    };
    $('musicSeek').onchange = async function () {
      var player = state.player, snapshot = player && player.getState(), revision = ++seekRevision, epoch = state.spotifyEpoch; seekCommitting = true;
      try {
        if (!snapshot || !snapshot.track || !snapshot.ready || snapshot.disallows && snapshot.disallows.seeking || (seekOwner && (seekOwner !== player || seekTrack !== trackKey(snapshot.track)))) return;
        state.seeking = true;
        if (!player.activate()) throw new Error(T('music.playerNotReady','Тоглуулагч хараахан бэлэн болоогүй байна.'));
        await player.command('seek',Math.round(Number(this.value) / 100 * snapshot.durationMs));
        if (revision === seekRevision && player === state.player && epoch === state.spotifyEpoch) $('musicPlayerError').textContent = '';
      } catch (error) { if (revision === seekRevision && player === state.player && epoch === state.spotifyEpoch && error.name !== 'AbortError') playerError(error.message,'playback'); }
      finally { if (revision === seekRevision) { seekCommitting = false; state.seeking = false; seekOwner = null; seekTrack = ''; if (state.player) playerChanged(state.player.getState()); } }
    };
    $('musicSeek').onpointercancel = function () { seekRevision++; seekCommitting = false; state.seeking = false; seekOwner = null; seekTrack = ''; if (state.player) playerChanged(state.player.getState()); };
    $('musicSeek').onblur = function () { if (!seekCommitting) { state.seeking = false; seekOwner = null; seekTrack = ''; if (state.player) playerChanged(state.player.getState()); } };
    $('musicVolume').onchange = function () { var volume = Math.max(0,Math.min(1,Number(this.value) / 100)); write('c122:music-volume',volume); applyVolume(volume); };
    $('musicShuffle').onclick = function () { if (!state.nativePlayer) return; var enabled = !state.nativePlayer.raw.getState().shuffle; write('c122:music-shuffle',enabled ? '1' : '0'); state.nativePlayer.raw.setShuffle(enabled); };
    $('musicRepeat').onclick = function () { if (!state.nativePlayer) return; var values = ['off','all','one'], next = values[(values.indexOf(state.nativePlayer.raw.getState().repeat) + 1) % 3]; write('c122:music-repeat',next); state.nativePlayer.raw.setRepeat(next); };
    renderSpotifyAccount(); renderResults();
    view.addEventListener('click',function (event) {
      var queued = event.target.closest('[data-music-queue-play]'); if (queued && state.nativePlayer) { state.nativePlayer.raw.transitionIndex(Number(queued.dataset.musicQueuePlay)); return; }
      var filter = event.target.closest('[data-music-filter]'); if (filter) { state.filter = filter.dataset.musicFilter; renderLists(); return; }
      var list = event.target.closest('[data-music-playlist]'); if (list) { loadPlaylist(list.dataset.musicPlaylist); return; }
      var page = event.target.closest('[data-music-page]'); if (page && !page.disabled) { state.trackPage = Math.max(0,Number(page.dataset.musicPage)); renderPlaylist(); return; }
      var play = event.target.closest('[data-music-track-play]'); if (play && !play.disabled && state.playlist) { playQueue(state.playlist.tracks || [],Number(play.dataset.musicTrackPlay),state.playlist.id); return; }
      var result = event.target.closest('[data-music-result-play]'); if (result && !result.disabled) { playQueue([state.results[Number(result.dataset.musicResultPlay)]],0,null); return; }
      var add = event.target.closest('[data-music-result-add]'); if (add && !add.disabled) { addResult(Number(add.dataset.musicResultAdd)); return; }
      var move = event.target.closest('[data-music-move]'); if (move && !move.disabled) { moveTrack(Number(move.dataset.musicMove),Number(move.dataset.direction)); return; }
      var remove = event.target.closest('[data-music-remove]'); if (remove && !remove.disabled) removeTrack(remove.dataset.musicRemove);
    });
    // Keep playing while the browser tab is hidden; just resync when it comes back.
    document.addEventListener('visibilitychange',function () { if (!document.hidden && state.player) state.player.refresh(); });
    window.addEventListener('pagehide',function (event) { state.spotifyControllers.forEach(function (controller) { controller.abort(); }); if (state.spotifyPlayer) state.spotifyPlayer.disconnect(); if (state.nativePlayer) { if (event.persisted) state.nativePlayer.raw.pause(); else state.nativePlayer.raw.destroy(); } clearInterval(state.progressTimer); clearTimeout(state.cooldownTimer); });
  }
  /* ---------- OS media controls (lock screen / notification) ---------- */
  function setupMediaSession() {
    if (state.mediaReady || !('mediaSession' in navigator)) return; state.mediaReady = true;
    var ms = navigator.mediaSession;
    function set(action,fn) { try { ms.setActionHandler(action,fn); } catch (error) {} }
    set('play',function () { if (state.player && state.player.getState().paused) togglePlay(); });
    set('pause',function () { if (state.player && !state.player.getState().paused) togglePlay(); });
    set('previoustrack',skipPrevious);
    set('nexttrack',skipNext);
    set('seekto',function (details) { if (details && details.seekTime != null) seekTo(details.seekTime * 1000); });
    set('stop',pausePlayback);
  }
  function updateMediaSession(snapshot) {
    if (!('mediaSession' in navigator)) return; var ms = navigator.mediaSession, track = snapshot && snapshot.track;
    if (!track) { try { ms.metadata = null; ms.playbackState = 'none'; } catch (error) {} state.mediaTrack = ''; return; }
    if (state.mediaTrack !== trackKey(track) && window.MediaMetadata) {
      state.mediaTrack = trackKey(track);
      try { ms.metadata = new MediaMetadata({title:track.title || '',artist:track.artist || '',album:track.album || '12–2',artwork:track.image ? [{src:new URL(track.image,location.href).href}] : []}); } catch (error) {}
    }
    try { ms.playbackState = snapshot.paused ? 'paused' : 'playing'; } catch (error) {}
    if (snapshot.durationMs > 0 && 'setPositionState' in ms) {
      try { ms.setPositionState({duration:snapshot.durationMs / 1000,position:Math.min(snapshot.positionMs,snapshot.durationMs) / 1000,playbackRate:1}); } catch (error) {}
    }
  }
  /* ---------- Floating mini-player (shows on every other tab) ---------- */
  function buildMiniBar() {
    if (state.miniBar) return;
    var bar = document.createElement('div'); bar.id = 'musicMiniBar'; bar.className = 'music-mini'; bar.hidden = true;
    bar.innerHTML = '<button class="music-mini-open" type="button" aria-label="' + C.esc(T('music.open','Хөгжим нээх')) + '"><span class="music-mini-art" id="musicMiniArt" aria-hidden="true">♪</span><span class="music-mini-copy"><strong id="musicMiniTitle"></strong><small id="musicMiniArtist"></small></span></button>' +
      '<span class="music-mini-equalizer" id="musicMiniEq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      '<button class="music-mini-btn" id="musicMiniPlay" type="button" aria-label="' + C.esc(T('music.playPause','Тоглуулах')) + '">' + C.icon('play') + '</button>' +
      '<button class="music-mini-btn" id="musicMiniNext" type="button" aria-label="' + C.esc(T('music.next','Дараагийн')) + '">' + C.icon('skip-forward') + '</button>' +
      '<span class="music-mini-progress"><i id="musicMiniFill"></i></span>';
    document.body.appendChild(bar); state.miniBar = bar;
    bar.querySelector('.music-mini-open').onclick = function () { var tab = document.getElementById('tab-music'); if (tab) tab.click(); };
    $('musicMiniPlay').onclick = togglePlay; $('musicMiniNext').onclick = skipNext;
  }
  function updateMiniBar(snapshot) {
    if (!state.miniBar) return; snapshot = snapshot || state.playerState || {}; var track = snapshot.track;
    var onMusic = document.body.getAttribute('data-tab') === 'music';
    var show = !!track && !onMusic;
    state.miniBar.hidden = !show; document.body.classList.toggle('has-mini-player',show);
    if (!show) return;
    var art = $('musicMiniArt'); if (track.image) { if (art.dataset.src !== track.image) { art.dataset.src = track.image; art.innerHTML = '<img src="' + C.esc(track.image) + '" alt="">'; } } else if (art.dataset.src) { art.dataset.src = ''; art.textContent = '♪'; }
    $('musicMiniTitle').textContent = track.title || ''; $('musicMiniArtist').textContent = track.artist || '';
    $('musicMiniPlay').innerHTML = C.icon(snapshot.paused ? 'play' : 'pause'); $('musicMiniPlay').setAttribute('aria-label',snapshot.paused ? 'Тоглуулах' : 'Түр зогсоох'); $('musicMiniNext').disabled = snapshot.provider === 'audio' && snapshot.nextIndex < 0;
    state.miniBar.classList.toggle('is-paused',!!snapshot.paused);
    $('musicMiniFill').style.width = snapshot.durationMs ? Math.min(100,snapshot.positionMs / snapshot.durationMs * 100) + '%' : '0%';
  }

  C.Music = {
    getState:function () { return state.player ? state.player.getState() : null; },
    pause:pausePlayback,
    seek:seekTo,
    toggle:function () { togglePlay(); },
    next:function () { skipNext(); },
    previous:function () { skipPrevious(); },
    show:function () { state.visible = true; initialize(); updateMiniBar(); if (!state.loading) loadStatus(!state.loaded); if (!state.spotifyLoading) loadSpotifyStatus(); if (state.player) state.player.refresh(); },
    // Keep playing in the background when the user leaves the Music tab; only stop the UI-side work.
    hide:function () { state.visible = false; if (state.searchController) { state.searchController.abort(); state.searchController = null; state.searchSeq++; $('musicSearchStatus').textContent = ''; renderSpotifyAccount(); } setTimeout(updateMiniBar,0); }
  };
})();

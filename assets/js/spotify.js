/* Streaming-only player. OAuth refresh stays on the server; no local audio mixing. */
(function () {
  'use strict';
  var C = (window.C122 = window.C122 || {}), sdkPromise = null;
  function T(key, fallback, params) {
    if (window.C122I18n) return window.C122I18n.t(key, fallback, params);
    return String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; });
  }
  function clamp(value, low, high) { value = Number(value); return isFinite(value) ? Math.max(low,Math.min(high,value)) : low; }
  function imageUrl(url) {
    try { var parsed = new URL(url); return parsed.protocol === 'https:' && (parsed.hostname === 'i.scdn.co' || parsed.hostname.endsWith('.scdn.co') || parsed.hostname.endsWith('.spotifycdn.com')) ? parsed.href : ''; }
    catch (error) { return ''; }
  }
  function normalizeTrack(item) {
    item = item || {};
    var artists = Array.isArray(item.artists) ? item.artists.map(function (a) { return a.name; }).join(', ') : '';
    var images = item.album && item.album.images || item.images || [];
    return {id:item.id || '',uri:item.uri || '',title:item.title || item.name || T('music.song','Дуу'),artist:item.artist || artists,
      album:typeof item.album === 'string' ? item.album : item.album && item.album.name || '',
      image:imageUrl(item.image || images[0] && images[0].url || ''),durationMs:Number(item.durationMs || item.duration_ms) || 0,playable:item.playable !== false};
  }
  function loadSdk() {
    if (window.Spotify && window.Spotify.Player) return Promise.resolve(window.Spotify);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve,reject) {
      var previous = window.onSpotifyWebPlaybackSDKReady, script = document.createElement('script'), finished = false;
      var timer = setTimeout(fail,18000);
      function fail() { if (finished) return; finished = true; clearTimeout(timer); sdkPromise = null; script.remove(); reject(new Error(T('music.sp.sdkLoad','Тоглуулагч ачаалагдсангүй. Холболтоо шалгаад дахин оролдоорой.'))); }
      window.onSpotifyWebPlaybackSDKReady = function () { if (typeof previous === 'function') { try { previous(); } catch (error) {} } if (finished) return; finished = true; clearTimeout(timer); resolve(window.Spotify); };
      script.src = 'https://sdk.scdn.co/spotify-player.js'; script.async = true; script.onerror = fail; document.head.appendChild(script);
    });
    return sdkPromise;
  }
  function createPlayback(options) {
    var player = null, deviceId = null, current = null, sampledAt = 0, epoch = 0, connecting = null, readyTimer = null, readyResolve = null, listeners = [], disposed = false;
    var accessToken = '', accessExpiresAt = 0, tokenPending = null, playPending = false, requests = new Set();
    var seekOverride = null, seekQueue = Promise.resolve(), stateRevision = 0;
    function trackKey(value) { var track = value && value.track_window && value.track_window.current_track; return track && (track.uri || track.id) || ''; }
    function receiveState(value) {
      var now = Date.now();
      if (seekOverride) {
        var expected = seekOverride.position + (seekOverride.paused ? 0 : Math.max(0,now - seekOverride.at));
        if (!value || trackKey(value) !== seekOverride.track || now >= seekOverride.expires || Math.abs(Number(value.position) - expected) < 1500 || value.disallows && value.disallows.seeking) seekOverride = null;
        else value = Object.assign({},value,{position:clamp(expected,0,Number(value.duration) || 0)});
      }
      stateRevision++; current = value; sampledAt = now; publish();
    }
    function valid(local, token) { return !disposed && local === player && token === epoch; }
    function snapshot() {
      var duration = current ? Math.max(0,Number(current.duration) || 0) : 0;
      var position = current ? Math.max(0,Number(current.position) || 0) : 0;
      if (current && !current.paused) position += Math.max(0,Date.now() - sampledAt);
      return {track:current && current.track_window && current.track_window.current_track ? normalizeTrack(current.track_window.current_track) : null,
        paused:!current || !!current.paused,positionMs:clamp(position,0,duration),durationMs:duration,disallows:current && current.disallows || {},deviceId:deviceId,ready:!!deviceId};
    }
    function publish() { if (!disposed && options.onState) options.onState(snapshot()); }
    function finishReady(ready) { clearTimeout(readyTimer); readyTimer = null; if (readyResolve) { var done = readyResolve; readyResolve = null; done(ready); } }
    function report(message,kind) { if (!disposed && options.onError) options.onError(message,kind); }
    function interrupted() { var error = new Error('Тоглуулагчийн холболт өөрчлөгдлөө.'); error.name = 'AbortError'; return error; }
    function oauth(local, generation, force) {
      if (!valid(local,generation)) return Promise.reject(interrupted());
      if (!force && accessToken && accessExpiresAt > Date.now() + 10000) return Promise.resolve(accessToken);
      if (tokenPending) return tokenPending;
      var pending = options.request('token',{body:force ? {forceRefresh:true} : {}}).then(function (data) {
        if (!valid(local,generation)) throw interrupted();
        if (typeof data.accessToken !== 'string' || !data.accessToken || data.accessToken.length > 8192 || /\s/.test(data.accessToken)) throw new Error(T('music.sp.tokenBad','Нэвтрэлтийн хариу хүчингүй байна.'));
        accessToken = data.accessToken;
        accessExpiresAt = Date.now() + clamp(data.expiresIn == null ? 60 : data.expiresIn,0,86400) * 1000;
        return accessToken;
      });
      tokenPending = pending;
      pending.then(function () { if (tokenPending === pending) tokenPending = null; },function () { if (tokenPending === pending) tokenPending = null; });
      return pending;
    }
    function playbackError(status, data, retryAfter) {
      var reason = data && data.error && data.error.reason || '', message;
      if (status === 401) message = T('music.sp.pb401','Нэвтрэлт дууссан байна. Дахин холбоорой.');
      else if (status === 403) message = T('music.sp.pb403','Тоглуулах эрх хүрэлцэхгүй байна. Premium болон аппын зөвшөөрлөө шалгана уу.');
      else if (status === 404) message = T('music.sp.pb404','Тоглуулагч хараахан бэлэн биш байна. Хэдэн секунд хүлээгээд дахин Сонсох дарна уу.');
      else if (status === 429) message = T('music.sp.pb429','Түр хязгаарлалаа. Түр хүлээгээд дахин оролдоорой.');
      else if (status >= 500) message = T('music.sp.pb5xx','Дуу тоглуулах хүсэлтэд хариу өгсөнгүй. Тоглож байгаа эсэхийг шалгаад дахин оролдоорой.');
      else if (reason === 'RESTRICTION_VIOLATED') message = T('music.sp.pbRestricted','Энэ дууг энэ бүртгэл дээр тоглуулах боломжгүй байна. Өөр дуу сонгоорой.');
      else message = T('music.sp.pbDefault','Энэ дууг тоглуулж чадсангүй. Өөр дуу сонгох эсвэл дахин оролдоорой.');
      var error = new Error(message); error.status = status; error.code = 'spotify_playback'; error.reason = reason;
      error.retryAfter = clamp(retryAfter,0,3600); return error;
    }
    async function playbackRequest(path, body, local, generation, deadline, force, retried) {
      var auth = await oauth(local,generation,!!force);
      if (!valid(local,generation)) throw interrupted();
      var remaining = deadline - Date.now();
      if (remaining <= 0) throw playbackError(504);
      var controller = new AbortController(), timeout = false;
      requests.add(controller);
      var timer = setTimeout(function () { timeout = true; controller.abort(); },Math.min(8000,remaining));
      var response, data = null;
      try {
        // Only short-lived access tokens reach this fixed streaming endpoint. Refresh tokens stay in PHP.
        response = await fetch('https://api.spotify.com/v1/' + path,{
          method:'PUT',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal,
          headers:{Authorization:'Bearer ' + auth,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)
        });
        if (response.status !== 204) { try { data = await response.json(); } catch (_) {} }
      } catch (error) {
        if (!valid(local,generation)) throw interrupted();
        if (timeout) throw playbackError(504);
        var offline = new Error(T('music.sp.offline','Энэ дэлгэц холбогдсонгүй. Интернет холболтоо шалгаад дахин оролдоорой.')); offline.code = 'spotify_network'; throw offline;
      } finally { clearTimeout(timer); requests.delete(controller); }
      if (!valid(local,generation)) throw interrupted();
      if (response.status === 401 && !retried) { accessToken = ''; accessExpiresAt = 0; return playbackRequest(path,body,local,generation,deadline,true,true); }
      if (!response.ok) throw playbackError(response.status,data,response.headers.get('Retry-After'));
      return {ok:true};
    }
    function disconnect() {
      epoch++; finishReady(false); connecting = null;
      requests.forEach(function (controller) { controller.abort(); }); requests.clear();
      accessToken = ''; accessExpiresAt = 0; tokenPending = null; playPending = false;
      seekOverride = null; seekQueue = Promise.resolve();
      if (player) { listeners.forEach(function (entry) { player.removeListener(entry[0],entry[1]); }); player.disconnect(); }
      listeners = []; player = null; deviceId = null; current = null; publish();
    }
    function refresh() {
      if (!player || !deviceId) return Promise.resolve(null);
      var local = player, token = epoch, revision = stateRevision;
      return local.getCurrentState().then(function (value) { if (!valid(local,token)) return null; if (revision === stateRevision) receiveState(value); return snapshot(); }).catch(function () { return null; });
    }
    function connect() {
      if (disposed) return Promise.resolve(false);
      if (deviceId) return Promise.resolve(true);
      if (connecting) return connecting;
      if (player) disconnect();
      var token = ++epoch;
      connecting = loadSdk().then(function (Spotify) {
        if (disposed || token !== epoch) return false;
        return new Promise(function (resolve) {
          readyResolve = resolve;
          var local = new Spotify.Player({name:'12–2 Listening Room',volume:options.volume == null ? 0.75 : options.volume,enableMediaSession:true,
            getOAuthToken:function (callback) {
              if (!valid(local,token)) return;
              oauth(local,token,false).then(function (auth) { if (valid(local,token)) callback(auth); }).catch(function (error) { if (!valid(local,token)) return; finishReady(false); report(error.message,error.status === 403 ? 'permissions' : error.status === 429 ? 'rate' : error.status === 401 ? 'authentication' : 'offline'); });
            }});
          player = local;
          function add(name,fn) { var guarded = function (event) { if (valid(local,token)) fn(event || {}); }; listeners.push([name,guarded]); local.addListener(name,guarded); }
          add('ready',function (event) { deviceId = event.device_id; finishReady(!!deviceId); publish(); refresh(); });
          add('not_ready',function (event) { if (!event.device_id || event.device_id === deviceId) { deviceId = null; current = null; stateRevision++; publish(); report(T('music.sp.deviceLost','Төхөөрөмжийн холболт тасарлаа. Тоглуулагчийг дахин нээнэ үү.'),'offline'); } });
          add('player_state_changed',function (event) { receiveState(event && event.track_window ? event : null); });
          add('autoplay_failed',function () { stateRevision++; if (current) { current = Object.assign({},current,{paused:true}); sampledAt = Date.now(); } publish(); report('Хөтөч тоглуулахыг зогсоолоо. Тоглуулах товчийг дахин дарна уу.','autoplay'); });
          add('initialization_error',function () { finishReady(false); report(T('music.sp.initFail','Энэ хөтөч хамгаалалттай тоглуулагчийг нээж чадсангүй. Шинэ Chrome, Edge эсвэл Safari ашиглана уу.'),'initialization'); });
          add('authentication_error',function () { finishReady(false); deviceId = null; current = null; stateRevision++; publish(); report(T('music.sp.authExpired','Холболтын эрх дууссан байна. Дахин холбоорой.'),'authentication'); });
          add('account_error',function () { finishReady(false); deviceId = null; current = null; stateRevision++; publish(); report(T('music.sp.accountPremium','Энд дуу тоглуулахад Premium бүртгэл хэрэгтэй.'),'account'); });
          add('playback_error',function () { report(T('music.sp.playbackError','Энэ дууг тоглуулж чадсангүй. Өөр дуу сонгоорой.'),'playback'); });
          readyTimer = setTimeout(function () { if (!valid(local,token) || deviceId) return; finishReady(false); report(T('music.sp.deviceTimeout','Төхөөрөмж бэлэн болсонгүй. Дахин нээж үзнэ үү.'),'offline'); },20000);
          local.connect().then(function (success) { if (valid(local,token) && !success) { finishReady(false); report(T('music.sp.connectFail','Тоглуулагчтай холбогдсонгүй. Дахин нээнэ үү.'),'offline'); } }).catch(function () { if (valid(local,token)) { finishReady(false); report(T('music.sp.connectFail','Тоглуулагчтай холбогдсонгүй. Дахин нээнэ үү.'),'offline'); } });
        });
      }).catch(function (error) { if (token === epoch) report(error.message,'initialization'); return false; }).then(function (result) { if (token === epoch) connecting = null; return result; });
      return connecting;
    }
    function activate() { if (!player || !deviceId) return false; try { var result = player.activateElement(); if (result && result.catch) result.catch(function () {}); return true; } catch (error) { return false; } }
    async function play(body) {
      if (!player || !deviceId) throw new Error('Тоглуулагч бэлэн болсны дараа Тоглуулах товчийг дарна уу.');
      if (playPending) throw new Error('Өмнөх дууны хүсэлт дуусахыг хүлээнэ үү.');
      body = body || {}; var value = {position_ms:Math.floor(clamp(body.positionMs || 0,0,86400000))};
      if (/^spotify:playlist:[A-Za-z0-9]{22}$/.test(body.contextUri || '')) {
        value.context_uri = body.contextUri;
        if (body.offsetUri) {
          if (!/^spotify:track:[A-Za-z0-9]{22}$/.test(body.offsetUri)) throw new Error(T('music.sp.badTrack','Дуу хүчингүй байна.'));
          value.offset = {uri:body.offsetUri};
        }
      } else if (Array.isArray(body.uris) && body.uris.length > 0 && body.uris.length <= 250 && body.uris.every(function (uri) { return /^spotify:track:[A-Za-z0-9]{22}$/.test(uri); })) value.uris = body.uris.slice();
      else throw new Error(T('music.sp.pickTrack','Эхлээд дуу сонгоорой.'));
      var local = player, generation = epoch, target = deviceId, deadline = Date.now() + 22000;
      playPending = true;
      try {
        try { return await playbackRequest('me/player/play?device_id=' + encodeURIComponent(target),value,local,generation,deadline); }
        catch (error) {
          // A rejected request did not start a track. Activate only when the service explicitly says there is no active device.
          if (error.status !== 404 || error.reason !== 'NO_ACTIVE_DEVICE') throw error;
          await playbackRequest('me/player',{device_ids:[target],play:false},local,generation,deadline);
          return await playbackRequest('me/player/play?device_id=' + encodeURIComponent(target),value,local,generation,deadline);
        }
      } finally { if (valid(local,generation)) playPending = false; }
    }
    function command(method,value) {
      if (!player || !deviceId || typeof player[method] !== 'function') return Promise.reject(new Error(T('music.sp.notReady','Тоглуулагч бэлэн биш байна.')));
      var local = player, token = epoch;
      if (method === 'seek') {
        var track = trackKey(current), duration = Number(current && current.duration), target = Number(value);
        if (!track || !duration || !isFinite(target)) return Promise.reject(new Error('Эхлээд дуугаа тоглуулаад цагийг сонгоорой.'));
        if (current.disallows && current.disallows.seeking) return Promise.reject(new Error(T('music.sp.seekDenied','Энэ дууны цагийг шилжүүлэхийг зөвшөөрөхгүй байна.')));
        target = Math.round(clamp(target,0,Math.max(0,duration - 1)));
        var pending = seekQueue.catch(function () {}).then(function () {
          if (!valid(local,token) || trackKey(current) !== track) throw interrupted();
          if (current.disallows && current.disallows.seeking) throw new Error(T('music.sp.seekDenied','Энэ дууны цагийг шилжүүлэхийг зөвшөөрөхгүй байна.'));
          var operation = local.seek(target);
          var bounded = new Promise(function (resolve,reject) {
            var timer = setTimeout(function () { reject(new Error(T('music.sp.seekTimeout','Цаг шилжүүлэх хүсэлтэд хариу өгсөнгүй. Холболтоо шалгаад дахин оролдоорой.'))); },12000);
            Promise.resolve(operation).then(function (result) { clearTimeout(timer); resolve(result); },function (error) { clearTimeout(timer); reject(error); });
          });
          return bounded.then(function () {
            if (!valid(local,token) || trackKey(current) !== track) throw interrupted();
            var now = Date.now();
            seekOverride = {track:track,position:target,at:now,paused:!!current.paused,expires:now + 5000};
            stateRevision++; current = Object.assign({},current,{position:target}); sampledAt = now; publish();
            return snapshot();
          });
        });
        seekQueue = pending; return pending;
      }
      try { return Promise.resolve(value === undefined ? local[method]() : local[method](value)).then(function () { return valid(local,token) ? refresh() : null; }); }
      catch (error) { return Promise.reject(error); }
    }
    function destroy() { disconnect(); disposed = true; }
    return {connect:connect,disconnect:disconnect,destroy:destroy,activate:activate,play:play,command:command,refresh:refresh,getState:snapshot};
  }
  C.SpotifyPlayback = {create:createPlayback,normalizeTrack:normalizeTrack,imageUrl:imageUrl};

})();

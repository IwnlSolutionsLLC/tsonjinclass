/* Music playback: one visible YouTube embed, or two local audio decks for MIX. */
(function () {
  'use strict';
  var C = (window.C122 = window.C122 || {});
  var youtubeApiPromise = null;

  function clamp(value, low, high) {
    value = Number(value);
    return isFinite(value) ? Math.max(low, Math.min(high, value)) : low;
  }
  function resolveElement(value) { return typeof value === 'string' ? document.querySelector(value) : value; }
  function finiteTime(value) { return isFinite(value) && value >= 0 ? value : 0; }
  function playableTracks(tracks) {
    return (Array.isArray(tracks) ? tracks : []).filter(function (item) {
      return item && ((item.kind === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(item.videoId || '')) ||
        (item.kind === 'audio' && typeof item.url === 'string' && item.url));
    }).slice();
  }
  function equalPower(progress) {
    progress = clamp(progress, 0, 1);
    return [Math.cos(progress * Math.PI / 2), Math.sin(progress * Math.PI / 2)];
  }
  function loadYouTubeApi() {
    if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve(window.YT);
    if (youtubeApiPromise) return youtubeApiPromise;
    youtubeApiPromise = new Promise(function (resolve, reject) {
      var previousReady = window.onYouTubeIframeAPIReady;
      var settled = false;
      var script = document.createElement('script');
      var timeout = setTimeout(function () { fail(); }, 18000);
      function fail() {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (script.parentNode) script.parentNode.removeChild(script);
        youtubeApiPromise = null;
        reject(new Error('YouTube ачаалагдсангүй. Интернэтээ шалгаад дахин тоглуулна уу.'));
      }
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previousReady === 'function') {
          try { previousReady(); } catch (e) { /* Another embed does not block Music. */ }
        }
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(window.YT);
      };
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = fail;
      document.head.appendChild(script);
    });
    return youtubeApiPromise;
  }

  function create(options) {
    options = options || {};
    var youtubeContainer = resolveElement(options.youtubeContainer);
    var audioA = resolveElement(options.audioElementA);
    var audioB = resolveElement(options.audioElementB);
    if (!audioA || !audioB || !youtubeContainer) throw new Error('Music player elements are missing.');
    var decks = [audioA, audioB];
    var activeDeck = 0;
    var queue = [];
    var index = -1;
    var volume = 0.8;
    var mixEnabled = true;
    var mixSeconds = 8;
    var shuffle = false;
    var repeat = 'off';
    var isPlaying = false;
    var error = null;
    var youtubeLoading = false;
    var visible = true;
    var youtubeVisible = true;
    var destroyed = false;
    var generation = 0;
    var history = [];
    var plannedNext = null;
    var preloadedIndex = -1;
    var preloadedKey = '';
    var fade = null;
    var fadePending = false;
    var fadeAttempt = 0;
    var fadeLoadTimer = null;
    var pendingTransition = null;
    var fadeFailedGeneration = -1;
    var transitioning = false;
    var audioContext = null;
    var audioGraphAttempted = false;
    var gains = null;
    var youtube = null;
    var youtubeReadyPromise = null;
    var youtubeEndedArmed = false;
    var observer = null;
    var listeners = [];
    var tickTimer = null;
    var lastProgressPublish = 0;
    var analysisService = C.MusicAnalysis ? C.MusicAnalysis.create() : null;
    var analyses = Object.create(null);
    var analysisEpoch = 0;
    var rateRamp = null;

    decks.forEach(function (deck) { deck.preload = 'metadata'; deck.volume = volume; deck.loop = false; });
    function track() { return index >= 0 && index < queue.length ? queue[index] : null; }
    function isYouTube() { return !!track() && track().kind === 'youtube'; }
    function analysisKey(item) { return item ? (item.audioId || item.id || '') + ':' + item.url : ''; }
    function analysisFor(item) { var entry = analyses[analysisKey(item)]; return entry && entry.result || null; }
    function requestAnalysis(item, duration) {
      if (!analysisService || !audioContext || !item || item.kind !== 'audio' || !duration || destroyed) return Promise.resolve(null);
      var key = analysisKey(item);
      if (analyses[key]) return analyses[key].promise || Promise.resolve(analyses[key].result);
      var epoch = analysisEpoch;
      var entry = analyses[key] = { status:'analyzing', result:null };
      entry.promise = analysisService.analyze(item,audioContext,duration).then(function (result) {
        if (destroyed || epoch !== analysisEpoch) return;
        analyses[key] = { status:result ? 'ready' : 'standard', result:result };
        tick();
        publish();
        return result;
      }).catch(function () {
        if (destroyed || epoch !== analysisEpoch) return;
        analyses[key] = { status:'standard', result:null };
        publish();
        return null;
      });
      return entry.promise;
    }
    function cancelAnalysis() {
      analysisEpoch++;
      if (analysisService) analysisService.cancel();
      Object.keys(analyses).forEach(function (key) { if (analyses[key].status === 'analyzing') delete analyses[key]; });
    }
    function setDeckRate(deckIndex, value) {
      var deck = decks[deckIndex], pitchSafe = false;
      ['preservesPitch','webkitPreservesPitch','mozPreservesPitch'].forEach(function (key) {
        if (key in deck) { deck[key] = true; pitchSafe = true; }
      });
      deck.playbackRate = pitchSafe ? clamp(value,0.96,1.04) : 1;
      return deck.playbackRate;
    }
    function safeYoutube(method, arg) {
      if (!youtube || typeof youtube[method] !== 'function') return undefined;
      try { return arg === undefined ? youtube[method]() : youtube[method](arg); } catch (e) { return undefined; }
    }
    function getState() {
      var current = track(), analyzed = analysisFor(current), entry = analyses[analysisKey(current)];
      return {
        track: current, index: index, queue: queue.slice(), isPlaying: isPlaying,
        position: current ? finiteTime(isYouTube() ? safeYoutube('getCurrentTime') : decks[activeDeck].currentTime) : 0,
        duration: current ? finiteTime(isYouTube() ? safeYoutube('getDuration') : decks[activeDeck].duration) : 0,
        volume: volume, mixEnabled: mixEnabled, mixSeconds: mixSeconds,
        mixActive: !!fade, incomingTrack: fade ? fade.nextTrack : pendingTransition ? pendingTransition.nextTrack : null,
        transitionPending: !!pendingTransition || fadePending,
        mixProgress: fade ? fadeProgress() : 0, mixMode: fade ? fade.mode : null,
        analysisStatus: current && current.kind === 'audio' ? entry ? entry.status : 'idle' : 'idle',
        bpm: analyzed && analyzed.confidence >= 0.45 ? analyzed.bpm : null,
        nextIndex: chooseNext(false),
        shuffle: shuffle, repeat: repeat, error: error,
        provider: current ? current.kind : null, youtubeLoading: youtubeLoading
      };
    }
    function refreshTimer() {
      var needed = !destroyed && (isPlaying || youtubeLoading || !!fade || fadePending || !!pendingTransition);
      if (needed && !tickTimer) tickTimer = setInterval(tick, 100);
      else if (!needed && tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    }
    function publish() {
      refreshTimer();
      if (!destroyed && typeof options.onChange === 'function') options.onChange(getState());
    }
    function publishProgress() {
      if (Date.now() - lastProgressPublish < 1000) return;
      lastProgressPublish = Date.now();
      publish();
    }
    function report(message, detail) {
      error = message;
      publish();
      if (!destroyed && typeof options.onError === 'function') options.onError(message, detail || {});
    }
    function listen(target, type, fn) {
      target.addEventListener(type, fn);
      listeners.push(function () { target.removeEventListener(type, fn); });
    }
    function deckGain(deckIndex, value) {
      value = clamp(value, 0, 1);
      if (gains && audioContext) {
        var gain = gains[deckIndex].gain;
        gain.cancelScheduledValues(audioContext.currentTime);
        gain.setValueAtTime(value, audioContext.currentTime);
        decks[deckIndex].volume = 1;
      } else decks[deckIndex].volume = value;
    }
    function resetGains() {
      deckGain(activeDeck, volume);
      deckGain(1 - activeDeck, 0);
    }
    function enableAudioGraph() {
      if (!audioGraphAttempted) {
        audioGraphAttempted = true;
        var Context = window.AudioContext || window.webkitAudioContext;
        if (Context) {
          var createdContext = null;
          var createdGains = [];
          try {
            createdContext = new Context();
            audioContext = createdContext;
            decks.forEach(function (deck) {
              var gain = createdContext.createGain();
              var source = createdContext.createMediaElementSource(deck);
              source.connect(gain);
              gain.connect(createdContext.destination);
              createdGains.push(gain);
            });
            gains = createdGains;
            resetGains();
          } catch (e) {
            // A media element can only be attached once. Keep any partial graph
            // connected, and control both decks with their native volume instead.
            gains = null;
            createdGains.forEach(function (gain) { gain.gain.value = 1; });
            resetGains();
          }
        }
      }
      if (audioContext && audioContext.state === 'suspended') {
        var resumed = audioContext.resume();
        if (resumed && resumed.catch) resumed.catch(function () {});
      }
    }
    function fadeProgress() {
      if (!fade) return 0;
      var elapsed = audioContext && gains ? audioContext.currentTime - fade.contextStart : (Date.now() - fade.wallStart) / 1000;
      return clamp(elapsed / fade.seconds, 0, 1);
    }
    function scheduleFadeGains() {
      if (!fade) return;
      var progress = fadeProgress();
      if (!(audioContext && gains)) {
        var levels = equalPower(progress);
        deckGain(fade.outgoingDeck, levels[0] * volume);
        deckGain(fade.incomingDeck, levels[1] * volume);
        return;
      }
      var remaining = Math.max(0.01, fade.seconds * (1 - progress));
      var outgoingCurve = new Float32Array(128);
      var incomingCurve = new Float32Array(128);
      for (var i = 0; i < 128; i++) {
        var level = equalPower(progress + (1 - progress) * i / 127);
        outgoingCurve[i] = level[0] * volume;
        incomingCurve[i] = level[1] * volume;
      }
      [fade.outgoingDeck, fade.incomingDeck].forEach(function (deckIndex) {
        gains[deckIndex].gain.cancelScheduledValues(audioContext.currentTime);
      });
      gains[fade.outgoingDeck].gain.setValueCurveAtTime(outgoingCurve, audioContext.currentTime, remaining);
      gains[fade.incomingDeck].gain.setValueCurveAtTime(incomingCurve, audioContext.currentTime, remaining);
    }
    function stopFade() {
      fadeAttempt++;
      clearTimeout(fadeLoadTimer);
      fadeLoadTimer = null;
      fadePending = false;
      if (pendingTransition) {
        var canceled = pendingTransition;
        pendingTransition = null;
        canceled.resolve(false);
      }
      if (fade) {
        var incoming = decks[fade.incomingDeck];
        incoming.pause();
        try { incoming.currentTime = 0; } catch (e) { /* Not loaded yet. */ }
        fade = null;
      } else decks[1 - activeDeck].pause();
      rateRamp = null;
      decks.forEach(function (deck, deckIndex) { setDeckRate(deckIndex,1); });
      resetGains();
    }
    function pauseAll() {
      transitioning = true;
      stopFade();
      decks.forEach(function (deck) { deck.pause(); });
      safeYoutube('pauseVideo');
      youtubeEndedArmed = false;
      isPlaying = false;
      youtubeLoading = false;
      transitioning = false;
    }
    function remember(nextIndex) {
      if (history[history.length - 1] !== nextIndex) history.push(nextIndex);
      if (history.length > 100) history.shift();
    }
    function chooseNext(naturalEnd) {
      if (!queue.length || index < 0) return -1;
      if (naturalEnd && repeat === 'one') return index;
      if (shuffle && queue.length > 1) {
        if (plannedNext == null || plannedNext === index || plannedNext >= queue.length) {
          var random = Math.floor(Math.random() * (queue.length - 1));
          plannedNext = random >= index ? random + 1 : random;
        }
        return plannedNext;
      }
      if (index + 1 < queue.length) return index + 1;
      return repeat === 'all' ? 0 : -1;
    }
    function prepareDeck(deckIndex, nextIndex, nextTrack) {
      nextTrack = nextTrack || queue[nextIndex];
      if (!nextTrack || nextTrack.kind !== 'audio') return;
      var deck = decks[deckIndex];
      deck.pause();
      setDeckRate(deckIndex,1);
      deck.src = nextTrack.url;
      deck.preload = 'auto';
      deck.load();
      try { deck.currentTime = 0; } catch (e) { /* Seek becomes possible after metadata. */ }
    }
    function completeFade() {
      if (!fade) return;
      var completed = fade;
      fade = null;
      transitioning = true;
      decks[completed.outgoingDeck].pause();
      activeDeck = completed.incomingDeck;
      if (completed.queueAfter) { queue = completed.queueAfter; history = []; }
      index = completed.nextIndex;
      generation++;
      fadeFailedGeneration = -1;
      preloadedIndex = -1;
      preloadedKey = '';
      plannedNext = null;
      remember(index);
      setDeckRate(completed.outgoingDeck,1);
      var incomingRate = decks[activeDeck].playbackRate || 1;
      rateRamp = incomingRate !== 1 ? { deck:activeDeck, rate:incomingRate, start:Date.now(), seconds:2 } : null;
      resetGains();
      isPlaying = !decks[activeDeck].paused;
      transitioning = false;
      publish();
    }
    function attemptFade(nextIndex, seconds, plan, manual) {
      var outgoingDeck = activeDeck;
      var incomingDeck = 1 - activeDeck;
      var nextTrack = manual ? manual.nextTrack : queue[nextIndex];
      if (!nextTrack || nextTrack.kind !== 'audio') return;
      if (preloadedIndex !== nextIndex || preloadedKey !== analysisKey(nextTrack)) {
        prepareDeck(incomingDeck, nextIndex, nextTrack);
        preloadedIndex = nextIndex;
        preloadedKey = analysisKey(nextTrack);
      }
      var token = generation;
      var attempt = ++fadeAttempt;
      fadePending = true;
      deckGain(incomingDeck, 0);
      var incomingRate = setDeckRate(incomingDeck,plan ? plan.rate : 1);
      try { decks[incomingDeck].currentTime = plan ? plan.incomingOffset : 0; } catch (e) { /* Metadata may still be loading. */ }
      var result;
      try { result = decks[incomingDeck].play(); } catch (e) { result = Promise.reject(e); }
      function failed() {
        if (token !== generation || attempt !== fadeAttempt || destroyed) return;
        clearTimeout(fadeLoadTimer);
        fadeLoadTimer = null;
        fadeAttempt++;
        fadePending = false;
        fadeFailedGeneration = generation;
        decks[incomingDeck].pause();
        setDeckRate(incomingDeck,1);
        if (manual && pendingTransition === manual) { pendingTransition = null; manual.resolve(false); }
        resetGains();
        report('Дараагийн дуу ачаалагдсангүй. Одоогийн дуу үргэлжилнэ; дахин тоглуулж болно.', { code: 'mix_blocked' });
      }
      fadeLoadTimer = setTimeout(failed, 12000);
      Promise.resolve(result).then(function () {
        if (destroyed || token !== generation || attempt !== fadeAttempt || !fadePending) {
          return;
        }
        clearTimeout(fadeLoadTimer);
        fadeLoadTimer = null;
        if (decks[outgoingDeck].paused && !decks[outgoingDeck].ended) { failed(); return; }
        fadePending = false;
        var remaining = finiteTime(decks[outgoingDeck].duration) - finiteTime(decks[outgoingDeck].currentTime);
        var duration = Math.min(seconds, remaining);
        fade = { outgoingDeck: outgoingDeck, incomingDeck: incomingDeck, nextIndex: nextIndex,
          nextTrack: nextTrack, queueAfter: manual && manual.queueAfter,
          seconds: Math.max(0.001,duration / (decks[outgoingDeck].playbackRate || 1)), mode:plan ? plan.mode : 'crossfade',
          rate:incomingRate, wallStart: Date.now(), contextStart: audioContext ? audioContext.currentTime : 0 };
        if (manual && pendingTransition === manual) { pendingTransition = null; manual.resolve(true); }
        if (duration <= 0.15) { completeFade(); return; }
        scheduleFadeGains();
        publish();
      }).catch(failed);
    }
    function tick() {
      if (destroyed || !track()) return;
      if (isYouTube()) {
        if (isPlaying && (!visible || document.hidden || !youtubeVisible)) pause();
        if (isPlaying || youtubeLoading) publishProgress();
        return;
      }
      if (rateRamp && isPlaying) {
        var rateProgress = clamp((Date.now() - rateRamp.start) / (rateRamp.seconds * 1000),0,1);
        setDeckRate(rateRamp.deck,rateRamp.rate + (1 - rateRamp.rate) * rateProgress);
        if (rateProgress >= 1) rateRamp = null;
      }
      if (fade) {
        if (!(audioContext && gains)) scheduleFadeGains();
        if (fadeProgress() >= 1 || decks[fade.outgoingDeck].ended) completeFade();
      }
      if (pendingTransition && !fade && !fadePending) {
        var pending = pendingTransition;
        var outgoing = decks[activeDeck];
        var incoming = decks[1 - activeDeck];
        var outgoingDuration = finiteTime(outgoing.duration);
        var nextDuration = finiteTime(incoming.duration);
        if (pending.token !== generation || (!isPlaying && !outgoing.ended)) {
          stopFade(); publish(); return;
        }
        if (outgoingDuration > 0 && nextDuration > 0 && incoming.readyState >= 1) {
          requestAnalysis(track(),outgoingDuration);
          requestAnalysis(pending.nextTrack,nextDuration);
          var elapsed = Date.now() - pending.createdAt;
          // Give existing analysis a short opportunity to improve the timing,
          // while the outgoing track keeps playing at its original volume.
          if (pending.plan || elapsed >= 1100 || analysisFor(pending.nextTrack) || outgoing.ended) {
            if (!pending.plan) pending.plan = C.MusicAnalysis ? C.MusicAnalysis.plan(analysisFor(track()),analysisFor(pending.nextTrack),{
              duration:outgoingDuration,position:outgoing.currentTime,mixSeconds:mixSeconds,
              incomingDuration:nextDuration,manual:true,maxWait:1.8
            }) : { startAt:outgoing.currentTime,seconds:Math.min(mixSeconds,outgoingDuration - outgoing.currentTime,nextDuration / 2),incomingOffset:0,rate:1,mode:'crossfade' };
            if (outgoing.currentTime >= pending.plan.startAt - 0.025 || outgoing.ended) {
              attemptFade(pending.nextIndex,pending.plan.seconds,pending.plan,pending);
            }
          }
        } else if (Date.now() - pending.createdAt > 12000) {
          stopFade();
          report('Дараагийн аудио файлыг ачаалж чадсангүй. Одоогийн дуу үргэлжилнэ.', { code:'audio_mix_file' });
        }
        publishProgress();
        return;
      }
      if (isPlaying && !decks[activeDeck].paused) {
        var duration = finiteTime(decks[activeDeck].duration);
        var remaining = duration - finiteTime(decks[activeDeck].currentTime);
        var nextIndex = chooseNext(true);
        var nextTrack = queue[nextIndex];
        var seconds = Math.min(mixSeconds, duration / 2);
        requestAnalysis(track(),duration);
        if (mixEnabled && repeat !== 'one' && !fade && !fadePending && fadeFailedGeneration !== generation &&
            nextIndex !== index && nextTrack && nextTrack.kind === 'audio' && duration > 0) {
          if (remaining > 0 && (preloadedIndex !== nextIndex || preloadedKey !== analysisKey(nextTrack))) {
            prepareDeck(1 - activeDeck, nextIndex);
            preloadedIndex = nextIndex;
            preloadedKey = analysisKey(nextTrack);
            deckGain(1 - activeDeck, 0);
          }
          var incomingDuration = finiteTime(decks[1 - activeDeck].duration);
          if (incomingDuration > 0) seconds = Math.min(seconds, incomingDuration / 2);
          requestAnalysis(nextTrack,incomingDuration);
          var plan = C.MusicAnalysis ? C.MusicAnalysis.plan(analysisFor(track()),analysisFor(nextTrack),{
            duration:duration,position:decks[activeDeck].currentTime,mixSeconds:seconds,incomingDuration:incomingDuration || undefined
          }) : { startAt:duration - seconds,seconds:seconds,incomingOffset:0,rate:1,mode:'crossfade' };
          if (decks[activeDeck].currentTime >= plan.startAt && plan.seconds > 0.2 && remaining > 0.2) attemptFade(nextIndex,plan.seconds,plan);
        }
        publishProgress();
      }
    }
    function youtubePlaybackAllowed() {
      if (!visible || document.hidden) return false;
      var rect = youtubeContainer.getBoundingClientRect();
      if (typeof window.innerHeight === 'number' && typeof window.innerWidth === 'number') {
        var height = Math.max(0,Math.min(rect.bottom,window.innerHeight) - Math.max(rect.top,0));
        var width = Math.max(0,Math.min(rect.right,window.innerWidth) - Math.max(rect.left,0));
        youtubeVisible = rect.width * rect.height > 0 && height * width / (rect.width * rect.height) >= 0.5;
      }
      return youtubeVisible && rect.width >= 200 && rect.height >= 200 && rect.bottom > 0 && rect.right > 0;
    }
    function youtubeError(code) {
      youtubeLoading = false;
      isPlaying = false;
      youtubeEndedArmed = false;
      var messages = {
        2: 'YouTube холбоосын ID буруу байна.',
        5: 'Энэ хөтчөөр YouTube дууг тоглуулж чадсангүй.',
        100: 'Энэ YouTube дуу устсан эсвэл хувийн болсон байна.',
        101: 'Энэ дууг өөр сайтад тоглуулахыг эзэмшигч нь зөвшөөрөөгүй байна.',
        150: 'Энэ дууг өөр сайтад тоглуулахыг эзэмшигч нь зөвшөөрөөгүй байна.',
        153: 'YouTube энэ сайтад тоглуулахыг баталгаажуулж чадсангүй. Дууг YouTube дээр нээж сонсож болно.'
      };
      report(messages[code] || 'YouTube дууг тоглуулж чадсангүй.', {
        code: 'youtube_' + code, url: track() && track().videoId ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(track().videoId) : null
      });
    }
    function ensureYouTube() {
      if (youtubeReadyPromise) return youtubeReadyPromise;
      youtubeReadyPromise = loadYouTubeApi().then(function (YT) {
        if (destroyed) throw new Error('Music player closed.');
        if (!isYouTube() || !youtubePlaybackAllowed()) throw new Error('YouTube тоглуулахын тулд Music хэсгийг дахин нээнэ үү.');
        return new Promise(function (resolve, reject) {
          var settled = false;
          var iframe = document.createElement('iframe');
          iframe.title = 'YouTube Music player';
          iframe.width = '480';
          iframe.height = '270';
          iframe.style.width = '100%';
          iframe.style.height = '270px';
          iframe.style.minWidth = '200px';
          iframe.style.minHeight = '200px';
          iframe.style.border = '0';
          iframe.referrerPolicy = 'strict-origin-when-cross-origin';
          iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          iframe.allowFullscreen = true;
          iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(track().videoId) +
            '?enablejsapi=1&origin=' + encodeURIComponent(window.location.origin) + '&controls=1&playsinline=1&autoplay=0&rel=0';
          youtubeContainer.appendChild(iframe);
          var readyTimeout = setTimeout(function () {
            if (settled) return;
            settled = true;
            safeYoutube('destroy');
            youtube = null;
            youtubeReadyPromise = null;
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            reject(new Error('YouTube тоглуулагч ачаалагдсангүй. Дахин оролдоно уу.'));
          }, 18000);
          youtube = new YT.Player(iframe, {
            events: {
              onReady: function () {
                if (settled) return;
                settled = true;
                clearTimeout(readyTimeout);
                safeYoutube('setVolume', Math.round(volume * 100));
                resolve(youtube);
              },
              onStateChange: function (event) {
                if (destroyed || !isYouTube()) return;
                var data = safeYoutube('getVideoData');
                if (data && data.video_id && data.video_id !== track().videoId) return;
                if (event.data === 1) {
                  if (!youtubePlaybackAllowed()) { pause(); return; }
                  isPlaying = true;
                  youtubeLoading = false;
                  youtubeEndedArmed = true;
                  error = null;
                } else if (event.data === 2) {
                  isPlaying = false;
                  youtubeLoading = false;
                  youtubeEndedArmed = false;
                } else if (event.data === 0) {
                  var advance = youtubeEndedArmed && visible && !document.hidden && youtubeVisible;
                  isPlaying = false;
                  youtubeLoading = false;
                  youtubeEndedArmed = false;
                  publish();
                  if (advance) advanceAfterEnd();
                  return;
                } else if (event.data === 3) youtubeLoading = true;
                else if (event.data === 5 || event.data === -1) youtubeLoading = false;
                publish();
              },
              onError: function (event) { if (isYouTube()) youtubeError(event.data); },
              onAutoplayBlocked: function () {
                if (!isYouTube()) return;
                isPlaying = false;
                youtubeLoading = false;
                report('Хөтөч автоматаар тоглуулахыг зогсоолоо. YouTube тоглуулагчийн Play товчийг дарна уу.', { code: 'autoplay_blocked' });
              }
            }
          });
        });
      }).catch(function (failure) { youtubeReadyPromise = null; throw failure; });
      return youtubeReadyPromise;
    }
    function select(nextIndex) {
      if (!queue.length || !isFinite(nextIndex) || Math.floor(nextIndex) !== nextIndex || nextIndex < 0 || nextIndex >= queue.length || destroyed) return false;
      generation++;
      cancelAnalysis();
      pauseAll();
      safeYoutube('stopVideo');
      index = nextIndex;
      plannedNext = null;
      preloadedIndex = -1;
      preloadedKey = '';
      fadeFailedGeneration = -1;
      error = null;
      remember(index);
      if (track().kind === 'audio') {
        prepareDeck(activeDeck, index);
        resetGains();
      }
      publish();
      return true;
    }
    function playCurrent() {
      if (destroyed || !track()) return Promise.resolve(false);
      error = null;
      var token = generation;
      if (isYouTube()) {
        if (!youtubePlaybackAllowed()) {
          report('YouTube тоглуулахын тулд Music хэсгийн тоглуулагчийг дэлгэц дээр нээнэ үү.', { code: 'youtube_not_visible' });
          return Promise.resolve(false);
        }
        youtubeLoading = true;
        publish();
        return ensureYouTube().then(function () {
          if (destroyed || token !== generation || !isYouTube()) return false;
          if (!youtubePlaybackAllowed()) { pause(); return false; }
          safeYoutube('setVolume', Math.round(volume * 100));
          var data = safeYoutube('getVideoData');
          if (!data || data.video_id !== track().videoId || safeYoutube('getPlayerState') === 0) {
            youtubeEndedArmed = false;
            safeYoutube('loadVideoById', track().videoId);
          } else safeYoutube('playVideo');
          return true;
        }).catch(function (failure) {
          if (token !== generation || destroyed) return false;
          isPlaying = false;
          youtubeLoading = false;
          report(failure.message, { code: 'youtube_load', url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(track().videoId) });
          return false;
        });
      }
      enableAudioGraph();
      requestAnalysis(track(),finiteTime(decks[activeDeck].duration));
      var result;
      try { result = decks[activeDeck].play(); } catch (failure) { result = Promise.reject(failure); }
      return Promise.resolve(result).then(function () {
        if (token !== generation || destroyed) return false;
        isPlaying = true;
        publish();
        return true;
      }).catch(function (failure) {
        if (token !== generation || destroyed) return false;
        isPlaying = false;
        report(failure && failure.name === 'NotAllowedError' ? 'Хөтөч тоглуулахыг зогсоолоо. Тоглуулах товчийг дахин дарна уу.' :
          'Дууг ачаалж чадсангүй. Файлын эрх эсвэл форматыг шалгаад дахин оролдоно уу.', { code: 'audio_playback' });
        return false;
      });
    }
    function playDirectIndex(nextIndex) { return select(Number(nextIndex)) ? playCurrent() : Promise.resolve(false); }
    function startTransition(nextTrack, nextIndex, queueAfter) {
      if (destroyed || !nextTrack) return Promise.resolve(false);
      // A fresh selection during a fade starts from the louder deck, so there
      // is never a silent third-deck gap or two overlapping transition plans.
      if (fade && fadeProgress() >= 0.5) completeFade();
      if (!queueAfter && queue[nextIndex] !== nextTrack) {
        nextIndex = queue.indexOf(nextTrack);
        if (nextIndex < 0) { queue.push(nextTrack); nextIndex = queue.length - 1; }
      }
      if (!isPlaying || !track() || track().kind !== 'audio' || nextTrack.kind !== 'audio' || !mixEnabled) {
        return queueAfter ? setQueue(queueAfter,nextIndex,true) : playDirectIndex(nextIndex);
      }
      generation++;
      stopFade();
      error = null;
      fadeFailedGeneration = -1;
      enableAudioGraph();
      var promise = new Promise(function (resolve) {
        pendingTransition = { token:generation,nextTrack:nextTrack,nextIndex:nextIndex,
          queueAfter:queueAfter || null,createdAt:Date.now(),plan:null,resolve:resolve };
      });
      prepareDeck(1 - activeDeck,nextIndex,nextTrack);
      preloadedIndex = nextIndex;
      preloadedKey = analysisKey(nextTrack);
      deckGain(1 - activeDeck,0);
      tick();
      publish();
      return promise;
    }
    function transitionIndex(nextIndex) {
      nextIndex = Number(nextIndex);
      if (!isFinite(nextIndex) || Math.floor(nextIndex) !== nextIndex || nextIndex < 0 || nextIndex >= queue.length) return Promise.resolve(false);
      if (nextIndex === index && !fade && !pendingTransition) return playCurrent();
      return startTransition(queue[nextIndex],nextIndex,null);
    }
    function transitionTo(nextTrack) {
      if (!playableTracks([nextTrack]).length || destroyed) return Promise.resolve(false);
      var found = queue.findIndex(function (item) {
        return item === nextTrack || (item.id && item.id === nextTrack.id && item.kind === nextTrack.kind);
      });
      if (found < 0) { queue.push(nextTrack); found = queue.length - 1; }
      return transitionIndex(found);
    }
    function playIndex(nextIndex) { return transitionIndex(nextIndex); }
    function playQueue(tracks, startIndex) {
      var nextQueue = playableTracks(tracks);
      if (!nextQueue.length) return setQueue([],0,false);
      startIndex = Math.floor(clamp(startIndex || 0,0,nextQueue.length - 1));
      return startTransition(nextQueue[startIndex],startIndex,nextQueue);
    }
    function play(nextTrack) {
      if (nextTrack) return transitionTo(nextTrack);
      return playCurrent();
    }
    function pause() {
      if (fade && fadeProgress() >= 0.5) completeFade();
      generation++;
      cancelAnalysis();
      pauseAll();
      publish();
    }
    function advanceAfterEnd() {
      var nextIndex = chooseNext(true);
      if (nextIndex < 0) { isPlaying = false; publish(); return; }
      playDirectIndex(nextIndex);
    }
    function next() {
      var nextIndex = chooseNext(false);
      if (nextIndex < 0) { pause(); return Promise.resolve(false); }
      return playIndex(nextIndex);
    }
    function previous() {
      if (getState().position > 3) { seek(0); return Promise.resolve(true); }
      var previousIndex = index > 0 ? index - 1 : (repeat === 'all' ? queue.length - 1 : 0);
      if (shuffle && history.length > 1) { history.pop(); previousIndex = history.pop(); }
      return playIndex(previousIndex);
    }
    function seek(seconds) {
      if (!track()) return;
      generation++;
      cancelAnalysis();
      stopFade();
      fadeFailedGeneration = -1;
      var duration = getState().duration;
      seconds = clamp(seconds, 0, duration || Number.MAX_SAFE_INTEGER);
      if (isYouTube()) safeYoutube('seekTo', seconds);
      else { try { decks[activeDeck].currentTime = seconds; } catch (e) { /* Wait for metadata. */ } }
      publish();
    }
    function setQueue(tracks, startIndex, autoplay) {
      queue = playableTracks(tracks);
      history = [];
      if (!queue.length) {
        generation++;
        cancelAnalysis();
        pauseAll();
        index = -1;
        error = null;
        publish();
        return Promise.resolve(false);
      }
      startIndex = Math.floor(clamp(startIndex || 0, 0, queue.length - 1));
      if (!select(startIndex)) return Promise.resolve(false);
      return autoplay ? playCurrent() : Promise.resolve(true);
    }
    function updateQueue(tracks) {
      var previousQueue = queue;
      var current = track();
      var nextQueue = playableTracks(tracks);
      function matchingIndex(item) {
        return nextQueue.findIndex(function (candidate) {
          return item && ((item.id && candidate.id === item.id && candidate.kind === item.kind) || candidate === item);
        });
      }
      var nextIndex = matchingIndex(current);
      if (nextIndex < 0) return setQueue(nextQueue, 0, false);
      generation++;
      cancelAnalysis();
      stopFade();
      history = history.map(function (oldIndex) { return matchingIndex(previousQueue[oldIndex]); }).filter(function (item) { return item >= 0; });
      queue = nextQueue;
      index = nextIndex;
      preloadedIndex = -1;
      preloadedKey = '';
      plannedNext = null;
      fadeFailedGeneration = -1;
      publish();
      return Promise.resolve(true);
    }
    function setVolume(value) {
      volume = clamp(value, 0, 1);
      if (fade) scheduleFadeGains();
      else resetGains();
      safeYoutube('setVolume', Math.round(volume * 100));
      publish();
    }
    function setMix(enabled, seconds) {
      mixEnabled = !!enabled;
      if (seconds !== undefined) mixSeconds = clamp(seconds, 3, 12);
      if (!mixEnabled) { generation++; stopFade(); }
      fadeFailedGeneration = -1;
      publish();
    }
    function setShuffle(enabled) { shuffle = !!enabled; plannedNext = null; if (!fade && !fadePending && !pendingTransition) { preloadedIndex = -1; preloadedKey = ''; } publish(); }
    function setRepeat(value) { repeat = ['off', 'all', 'one'].indexOf(value) >= 0 ? value : 'off'; plannedNext = null; publish(); }
    function show() { visible = true; publish(); }
    function hide() { visible = false; if (isYouTube()) pause(); else publish(); }
    function stop() { pause(); seek(0); }
    function destroy() {
      if (destroyed) return;
      pause();
      destroyed = true;
      clearInterval(tickTimer);
      listeners.forEach(function (remove) { remove(); });
      if (observer) observer.disconnect();
      if (analysisService) analysisService.destroy();
      safeYoutube('destroy');
      if (audioContext && audioContext.close) audioContext.close().catch(function () {});
    }

    decks.forEach(function (deck, deckIndex) {
      listen(deck, 'play', function () { if (!transitioning && !isYouTube() && deckIndex === activeDeck) { isPlaying = true; publish(); } });
      listen(deck, 'pause', function () {
        if (transitioning || isYouTube() || deckIndex !== activeDeck || deck.ended) return;
        // A platform or native media-control pause is a pause of the whole
        // player. Otherwise the other deck and its scheduled gains would keep
        // advancing after the user had stopped the audible track.
        if (fade || fadePending || pendingTransition) pause();
        else { isPlaying = false; publish(); }
      });
      listen(deck, 'loadedmetadata', function () {
        if (!isYouTube() && deckIndex === activeDeck) { if (isPlaying) requestAnalysis(track(),finiteTime(deck.duration)); publish(); }
        if (!isYouTube() && isPlaying) tick();
      });
      // Media events remain available while browser interval timers are throttled.
      // Once a fade starts, its gains run on the AudioContext clock itself.
      listen(deck, 'timeupdate', function () { if (!isYouTube() && deckIndex === activeDeck) tick(); });
      listen(deck, 'canplay', function () { if (!isYouTube() && pendingTransition) tick(); });
      listen(deck, 'durationchange', function () { if (!isYouTube() && deckIndex === activeDeck) publish(); });
      listen(deck, 'seeked', function () { if (!isYouTube() && deckIndex === activeDeck) publish(); });
      listen(deck, 'ended', function () {
        if (destroyed || transitioning || isYouTube() || deckIndex !== activeDeck || !deck.ended) return;
        if (fade) { completeFade(); return; }
        if (pendingTransition || fadePending) { tick(); return; }
        isPlaying = false;
        publish();
        advanceAfterEnd();
      });
      listen(deck, 'error', function () {
        if (destroyed || transitioning || isYouTube()) return;
        if (deckIndex !== activeDeck) {
          if (fade || fadePending || pendingTransition) {
            stopFade();
            fadeFailedGeneration = generation;
            report('Дараагийн аудио файл ачаалагдсангүй. Одоогийн дуу үргэлжилнэ.', { code: 'audio_mix_file' });
          }
          return;
        }
        isPlaying = false;
        report('Аудио файл олдсонгүй эсвэл энэ хөтөч форматыг нь тоглуулахгүй байна.', { code: 'audio_file' });
      });
    });
    listen(document, 'visibilitychange', function () { if (document.hidden && isYouTube()) pause(); });
    if (typeof window.IntersectionObserver === 'function') {
      observer = new window.IntersectionObserver(function (entries) {
        if (!entries.length) return;
        youtubeVisible = entries[entries.length - 1].intersectionRatio >= 0.5;
        if (!youtubeVisible && isYouTube() && (isPlaying || youtubeLoading)) pause();
      }, { threshold: [0, 0.5, 1] });
      observer.observe(youtubeContainer);
    }
    resetGains();
    return {
      setQueue: setQueue, playQueue:playQueue, updateQueue: updateQueue, play: play, playIndex: playIndex,
      transitionTo:transitionTo, transitionIndex:transitionIndex,
      toggle: function () { return isPlaying || youtubeLoading ? (pause(), Promise.resolve(false)) : playCurrent(); },
      pause: pause, stop:stop, next: next, previous: previous, seek: seek,
      setVolume: setVolume, setMix: setMix, setShuffle: setShuffle, setRepeat: setRepeat,
      show: show, hide: hide, destroy: destroy, getState: getState
    };
  }
  C.MusicPlayer = { create: create, equalPower: equalPower };
})();

/* Bounded, local Web Audio analysis. No audio or analysis leaves this origin. */
(function (root) {
  'use strict';
  var C = (root.C122 = root.C122 || {});
  var MAX_BYTES = 30 * 1024 * 1024;
  var MAX_DECODED_BYTES = 100 * 1024 * 1024;
  var MAX_SECONDS = 480;
  var SAMPLE_RATE = 11025;
  var scriptURL = root.document && root.document.currentScript ? root.document.currentScript.src : '';

  function finite(value) { return typeof value === 'number' && isFinite(value); }
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function mean(values, from, to) {
    var sum = 0;
    from = Math.max(0, from || 0);
    to = Math.min(values.length, to == null ? values.length : to);
    for (var i = from; i < to; i++) sum += values[i];
    return to > from ? sum / (to - from) : 0;
  }
  function percentile(values, fraction) {
    if (!values.length) return 0;
    var sorted = Array.prototype.slice.call(values).sort(function (a, b) { return a - b; });
    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
  }

  function envelope(segment) {
    var samples = segment.samples;
    var rate = segment.sampleRate;
    var frame = Math.max(1, Math.round(rate * 0.02));
    var count = Math.ceil(samples.length / frame);
    var energy = new Float32Array(count);
    var maximum = 0;
    for (var i = 0; i < count; i++) {
      var sum = 0;
      var end = Math.min(samples.length, (i + 1) * frame);
      for (var j = i * frame; j < end; j++) {
        var value = finite(samples[j]) ? samples[j] : 0;
        sum += value * value;
      }
      energy[i] = Math.sqrt(sum / Math.max(1, end - i * frame));
      maximum = Math.max(maximum, energy[i]);
    }
    return { start: segment.start || 0, step: frame / rate, values: energy, max: maximum, mean: mean(energy) };
  }

  function onsets(energy) {
    var values = energy.values;
    var flux = new Float32Array(values.length);
    var rawMean = 0;
    var peak = 0;
    for (var i = 1; i < values.length; i++) {
      flux[i] = Math.max(0, values[i] - values[i - 1]);
      rawMean += flux[i];
      peak = Math.max(peak, flux[i]);
    }
    rawMean /= Math.max(1, values.length);
    var floor = Math.max(0.000002, energy.max * 0.015, rawMean * 0.7);
    var threshold = Math.max(floor, rawMean * 2.5, peak * 0.13);
    var peaks = [];
    var minimumGap = Math.ceil(0.18 / energy.step);
    for (var k = 0; k < flux.length; k++) if (flux[k] < floor) flux[k] = 0;
    for (var n = 1; n < flux.length - 1; n++) {
      if (flux[n] < threshold || flux[n] < flux[n - 1] || flux[n] <= flux[n + 1]) continue;
      var item = { time: energy.start + n * energy.step, strength: flux[n], frame: n };
      var last = peaks[peaks.length - 1];
      if (last && n - last.frame < minimumGap) {
        if (item.strength > last.strength) peaks[peaks.length - 1] = item;
      } else peaks.push(item);
    }
    return { flux: flux, peaks: peaks };
  }

  function estimateBeat(energy, onset) {
    var values = energy.values;
    var variance = 0;
    for (var i = 0; i < values.length; i++) variance += Math.pow(values[i] - energy.mean, 2);
    var variation = Math.sqrt(variance / Math.max(1, values.length)) / Math.max(energy.mean, 0.000001);
    if (energy.max < 0.0001 || variation < 0.06 || onset.peaks.length < 5) {
      return { bpm: 0, confidence: 0, beatOffset: 0 };
    }
    var flux = onset.flux;
    var low = Math.max(1, Math.floor(60 / 180 / energy.step));
    var high = Math.min(flux.length - 2, Math.ceil(60 / 70 / energy.step));
    var correlations = [];
    var bestLag = 0;
    var best = 0;
    for (var lag = low; lag <= high; lag++) {
      var product = 0;
      var a = 0;
      var b = 0;
      for (var n = lag; n < flux.length; n++) {
        product += flux[n] * flux[n - lag];
        a += flux[n] * flux[n];
        b += flux[n - lag] * flux[n - lag];
      }
      var score = a && b ? product / Math.sqrt(a * b) : 0;
      correlations[lag] = score;
      if (score > best) { best = score; bestLag = lag; }
    }
    if (!bestLag || best < 0.18) return { bpm: 0, confidence: 0, beatOffset: 0 };
    var refined = bestLag;
    var left = correlations[bestLag - 1] || 0;
    var right = correlations[bestLag + 1] || 0;
    var divisor = left - 2 * best + right;
    if (divisor) refined += clamp(0.5 * (left - right) / divisor, -0.5, 0.5);
    var period = refined * energy.step;
    var intervals = [];
    for (var p = 1; p < onset.peaks.length; p++) {
      var interval = onset.peaks[p].time - onset.peaks[p - 1].time;
      if (interval > period * 0.75 && interval < period * 1.25) intervals.push(interval);
    }
    // Averaging matched intervals preserves sub-frame timing; a median alone would
    // quantize tempo to the 20ms envelope and can exceed the narrow rate limit.
    if (intervals.length >= 3) period = mean(intervals);
    var bpm = 60 / period;
    if (bpm < 70 || bpm > 180) return { bpm: 0, confidence: 0, beatOffset: 0 };
    var x = 0;
    var y = 0;
    var weight = 0;
    for (var q = 0; q < onset.peaks.length; q++) {
      var angle = onset.peaks[q].time / period * Math.PI * 2;
      var strength = onset.peaks[q].strength;
      x += Math.cos(angle) * strength;
      y += Math.sin(angle) * strength;
      weight += strength;
    }
    var regularity = weight ? Math.sqrt(x * x + y * y) / weight : 0;
    var confidence = clamp(best * 0.65 + regularity * 0.35, 0, 1);
    confidence *= Math.min(1, onset.peaks.length / 10);
    if (regularity < 0.3) confidence *= 0.5;
    var phase = Math.atan2(y, x) / (Math.PI * 2) * period;
    if (phase < 0) phase += period;
    return { bpm: Math.round(bpm * 10) / 10, confidence: Math.round(confidence * 1000) / 1000, beatOffset: phase };
  }

  // Require a sustained energy drop, so gaps between drum hits do not count as an outro.
  function quietWindow(energy, duration, mixSeconds) {
    if (!energy || !energy.values || !energy.values.length || !finite(energy.step) || energy.step <= 0) return null;
    var lower = Math.max(0, duration - 12, duration - mixSeconds - 3, energy.start);
    var upper = duration - Math.min(0.5, duration / 4);
    if (upper <= lower) return null;
    var values = energy.values;
    var reference = Math.max(energy.mean || mean(values), percentile(values, 0.65));
    if (reference < 0.0001) return null;
    var windowSize = Math.max(1, Math.ceil(0.7 / energy.step));
    var first = Math.max(0, Math.ceil((lower - energy.start) / energy.step));
    var last = Math.min(values.length - windowSize, Math.floor((upper - energy.start) / energy.step));
    for (var i = first; i <= last; i++) {
      if (mean(values, i, i + windowSize) <= reference * 0.4) return energy.start + i * energy.step;
    }
    return null;
  }

  /**
   * Worker payload: {duration, segments:[{start, sampleRate, samples:Float32Array}]}.
   * Only the opening 90s and final 45s are copied from the decoded buffer.
   * Result: seconds-based introStart/outroStart/beatOffset/beats, BPM/confidence,
   * and a compact RMS tail envelope {start, step, values, mean, max} for planning.
   * A BPM estimate is a heuristic; confidence 0 means silence, a steady tone, or
   * insufficient rhythmic evidence. Original audio and decoded buffers are never cached.
   */
  function analyzeCompact(payload) {
    if (!payload || !finite(payload.duration) || payload.duration <= 0 || payload.duration > MAX_SECONDS ||
      !Array.isArray(payload.segments) || !payload.segments.length) return null;
    var segments = payload.segments.filter(function (segment) {
      return segment && segment.samples && segment.samples.length && finite(segment.sampleRate) &&
        segment.sampleRate >= 1000 && segment.sampleRate <= 192000 && finite(segment.start) && segment.start >= 0;
    });
    if (!segments.length) return null;
    var opening = envelope(segments[0]);
    var openingOnsets = onsets(opening);
    var beat = estimateBeat(opening, openingOnsets);
    var tail = segments.length > 1 ? envelope(segments[segments.length - 1]) : opening;
    var tailOnsets = segments.length > 1 ? onsets(tail) : openingOnsets;
    var silenceThreshold = Math.max(0.0000001, Math.min(0.00003, opening.max * 0.0001));
    var introStart = 0;
    for (var i = 0; i < opening.values.length && i * opening.step < 2; i++) {
      if (opening.values[i] > silenceThreshold) break;
      introStart = Math.min(2, (i + 1) * opening.step);
    }
    var beats = openingOnsets.peaks.concat(tailOnsets === openingOnsets ? [] : tailOnsets.peaks)
      .map(function (peak) { return peak.time; }).sort(function (a, b) { return a - b; })
      .filter(function (time, index, all) { return !index || time - all[index - 1] > 0.08; });
    var introBeat = null;
    for (var b = 0; b < beats.length; b++) {
      if (beats[b] >= introStart && beats[b] <= introStart + 0.5) { introBeat = beats[b]; break; }
    }
    var quiet = quietWindow(tail, payload.duration, 5);
    return {
      bpm: beat.bpm, confidence: beat.confidence, beatOffset: beat.beatOffset,
      introStart: introStart, introBeat: introBeat, outroStart: quiet,
      beats: beats, duration: payload.duration, energy: tail,
      // The opening and tail can also guide a user-requested change mid-song.
      energySegments: tail === opening ? [opening] : [opening, tail]
    };
  }

  // Pure test entry point; compact production samples are built by create().
  function analyzeSamples(samples, sampleRate) {
    if (!samples || !finite(sampleRate) || sampleRate <= 0 || !samples.length) return null;
    return analyzeCompact({ duration: samples.length / sampleRate,
      segments: [{ samples: samples, sampleRate: sampleRate, start: 0 }] });
  }

  function plan(outgoing, incoming, options) {
    options = options || {};
    var duration = finite(options.duration) ? options.duration : outgoing && outgoing.duration;
    duration = finite(duration) && duration > 0 ? duration : 0;
    var requested = finite(options.mixSeconds) ? Math.max(0, options.mixSeconds) : 5;
    var seconds = Math.min(requested, duration / 2);
    var position = finite(options.position) ? clamp(options.position, 0, duration) : 0;
    var incomingDuration = finite(options.incomingDuration) ? options.incomingDuration : incoming && incoming.duration;
    var incomingOffset = incoming && finite(incoming.introStart) ? clamp(incoming.introStart, 0, 2) : 0;
    var outgoingBeat = outgoing && outgoing.confidence >= 0.45 && finite(outgoing.bpm) && outgoing.bpm >= 70 && outgoing.bpm <= 180;
    var incomingBeat = incoming && incoming.confidence >= 0.45 && finite(incoming.bpm) && incoming.bpm >= 70 && incoming.bpm <= 180;
    if (incomingBeat && finite(incoming.introBeat) && incoming.introBeat >= incomingOffset &&
      incoming.introBeat <= incomingOffset + 0.5) incomingOffset = incoming.introBeat;
    if (finite(incomingDuration) && incomingDuration >= 0) incomingOffset = Math.min(incomingOffset, incomingDuration / 2);
    var manual = options.manual === true;
    var maxWait = finite(options.maxWait) ? clamp(options.maxWait, 0, 3) : 1.8;
    var startAt = manual ? position : duration - seconds;
    var mode = 'crossfade';
    var quiet = !manual && outgoing ? quietWindow(outgoing.energy, duration, requested) : null;
    if (quiet !== null) { startAt = quiet; mode = 'energy'; }
    if (manual && outgoing) {
      var segments = outgoing.energySegments || (outgoing.energy ? [outgoing.energy] : []);
      var latest = Math.min(position + maxWait, Math.max(position, duration - Math.min(seconds, 1)));
      var quietest = Infinity;
      segments.forEach(function (energy) {
        if (!energy || !energy.values || !finite(energy.step) || energy.step <= 0) return;
        var reference = Math.max(energy.mean || mean(energy.values), percentile(energy.values, 0.65));
        if (reference < 0.0001) return;
        var span = Math.max(1, Math.ceil(0.45 / energy.step));
        var first = Math.max(0, Math.ceil((position - energy.start) / energy.step));
        var last = Math.min(energy.values.length - span, Math.floor((latest - energy.start) / energy.step));
        for (var n = first; n <= last; n++) {
          var level = mean(energy.values, n, n + span) / reference;
          if (level < 0.48 && level < quietest) {
            quietest = level;
            startAt = energy.start + n * energy.step;
            mode = 'energy';
          }
        }
      });
    }
    if (outgoingBeat && incomingBeat && seconds > 0) {
      var lower = manual ? position : Math.max(0, duration - 12, duration - requested - 3);
      var upper = manual ? Math.min(position + maxWait, duration - 0.2) :
        Math.min(duration - Math.min(0.5, duration / 4), duration - seconds + 1.5);
      var nearest = null;
      var distance = Infinity;
      var beats = Array.isArray(outgoing.beats) ? outgoing.beats : [];
      for (var i = 0; i < beats.length; i++) {
        var time = beats[i];
        if (!finite(time) || time < lower || time > upper) continue;
        if (Math.abs(time - startAt) < distance) { nearest = time; distance = Math.abs(time - startAt); }
      }
      // If the compact excerpts do not cover the playhead, project the measured
      // beat phase. This remains a confidence-gated heuristic, never a claimed DJ grid.
      if (manual && nearest === null && finite(outgoing.beatOffset)) {
        var period = 60 / outgoing.bpm;
        var projected = outgoing.beatOffset + Math.ceil((position - outgoing.beatOffset) / period) * period;
        if (projected >= lower && projected <= upper) { nearest = projected; distance = Math.abs(projected - startAt); }
      }
      if (nearest !== null && (manual || distance <= 0.6)) { startAt = nearest; mode = 'beat'; }
    }
    startAt = clamp(Math.max(position, startAt), 0, duration);
    seconds = Math.min(seconds, duration - startAt);
    if (finite(incomingDuration) && incomingDuration >= 0) seconds = Math.min(seconds, (incomingDuration - incomingOffset) / 2);
    var rate = 1;
    if (outgoingBeat && incomingBeat) {
      var ratio = outgoing.bpm / incoming.bpm;
      if (ratio >= 0.96 && ratio <= 1.04) rate = ratio;
    }
    return { startAt: startAt, seconds: Math.max(0, seconds), incomingOffset: incomingOffset, rate: rate, mode: mode };
  }

  function create(options) {
    options = options || {};
    var limit = finite(options.maxBytes) && options.maxBytes > 0 ? Math.min(MAX_BYTES, options.maxBytes) : MAX_BYTES;
    var cache = new Map();
    var generation = 0;
    var destroyed = false;
    var controller = null;
    var serial = Promise.resolve();
    var decodeInFlight = null;
    var stopWaits = new Set();
    var worker = null;
    var workerReady = null;
    var workerReadyStop = null;
    var workerRequests = new Map();
    var requestId = 0;

    function current(token) { return !destroyed && token === generation; }
    function waitFor(promise, milliseconds, token) {
      return new Promise(function (resolve) {
        var done = false;
        var timer;
        function finish(value) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          stopWaits.delete(stop);
          resolve(current(token) ? value : null);
        }
        function stop() { finish(null); }
        stopWaits.add(stop);
        timer = setTimeout(stop, milliseconds);
        Promise.resolve(promise).then(finish, stop);
        if (!current(token)) stop();
      });
    }
    function stopWorker() {
      if (workerReadyStop) workerReadyStop(false);
      workerReadyStop = null;
      if (worker) worker.terminate();
      worker = null;
      workerReady = null;
      workerRequests.forEach(function (resolve) { resolve(null); });
      workerRequests.clear();
    }
    function prepareWorker(token) {
      if (!root.Worker || !scriptURL) return Promise.resolve(false);
      if (workerReady) return workerReady;
      workerReady = new Promise(function (resolve) {
        var ready = false;
        var timer;
        function finish(value) {
          if (ready) return;
          ready = true;
          clearTimeout(timer);
          workerReadyStop = null;
          resolve(value);
        }
        workerReadyStop = finish;
        try {
          worker = new root.Worker(new URL('music-analysis-worker.js', scriptURL).href);
          worker.onmessage = function (event) {
            var data = event.data || {};
            if (data.type === 'ready') { finish(true); return; }
            var callback = workerRequests.get(data.id);
            if (callback) { workerRequests.delete(data.id); callback(data.result || null); }
          };
          worker.onerror = function () { finish(false); stopWorker(); };
          timer = setTimeout(function () { finish(false); stopWorker(); }, 1500);
        } catch (e) { finish(false); stopWorker(); }
      });
      return waitFor(workerReady, 1700, token);
    }
    function scheduled(task, token, useIdle) {
      return new Promise(function (resolve) {
        var done = false;
        var handle;
        var idle = useIdle !== false && typeof root.requestIdleCallback === 'function';
        function stop() {
          if (done) return;
          done = true;
          if (idle && root.cancelIdleCallback) root.cancelIdleCallback(handle);
          else clearTimeout(handle);
          stopWaits.delete(stop);
          resolve(null);
        }
        function run() {
          if (done) return;
          done = true;
          stopWaits.delete(stop);
          if (!current(token)) { resolve(null); return; }
          try { resolve(task()); } catch (e) { resolve(null); }
        }
        stopWaits.add(stop);
        handle = idle ? root.requestIdleCallback(run, { timeout: 500 }) : setTimeout(run, 0);
        if (!current(token)) stop();
      });
    }
    async function readBounded(response, aborter, token) {
      var stated = response.headers && response.headers.get('content-length');
      if (stated && /^\d+$/.test(stated) && Number(stated) > limit) { aborter.abort(); return null; }
      // Streaming is required to enforce the byte cap when servers omit or misstate length.
      if (!response.body || !response.body.getReader) { aborter.abort(); return null; }
      var reader = response.body.getReader();
      var chunks = [];
      var bytes = 0;
      try {
        while (current(token)) {
          var part = await reader.read();
          if (part.done) break;
          if (!part.value || !part.value.byteLength) continue;
          bytes += part.value.byteLength;
          if (bytes > limit) { aborter.abort(); await reader.cancel().catch(function () {}); return null; }
          chunks.push(part.value);
        }
        if (!current(token) || !bytes) { aborter.abort(); return null; }
        var joined = new Uint8Array(bytes);
        var at = 0;
        chunks.forEach(function (chunk) { joined.set(chunk, at); at += chunk.byteLength; });
        return joined.buffer;
      } finally {
        try { reader.releaseLock(); } catch (e) { /* An aborted stream may already be unlocked. */ }
      }
    }
    function decode(context, bytes) {
      var promise = new Promise(function (resolve, reject) {
        try {
          var returned = context.decodeAudioData(bytes, resolve, reject);
          if (returned && returned.then) returned.then(resolve, reject);
        } catch (error) { reject(error); }
      });
      decodeInFlight = promise;
      function released() { if (decodeInFlight === promise) decodeInFlight = null; }
      promise.then(released, released);
      return promise;
    }
    async function compact(buffer, token) {
      var duration = buffer.duration;
      var rate = buffer.sampleRate;
      var channels = [];
      for (var c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
      var spans = [{ start: 0, end: Math.min(duration, 90) }];
      if (duration > 90) spans.push({ start: Math.max(0, duration - 45), end: duration });
      var segments = [];
      for (var s = 0; s < spans.length; s++) {
        var span = spans[s];
        var samples = new Float32Array(Math.ceil((span.end - span.start) * SAMPLE_RATE));
        // Yield between short copy chunks; the expensive rhythmic work runs in the worker.
        for (var chunk = 0; chunk < samples.length; chunk += 32768) {
          var copied = await scheduled((function (offset, stop, begin, target) {
            return function () {
              for (var i = offset; i < stop; i++) {
                var first = Math.floor((begin + i / SAMPLE_RATE) * rate);
                var last = Math.min(buffer.length, Math.max(first + 1, Math.floor((begin + (i + 1) / SAMPLE_RATE) * rate)));
                var total = 0;
                for (var channel = 0; channel < channels.length; channel++) {
                  for (var n = first; n < last; n++) total += channels[channel][n] || 0;
                }
                target[i] = total / Math.max(1, (last - first) * channels.length);
              }
              return true;
            };
          })(chunk, Math.min(samples.length, chunk + 32768), span.start, samples), token, false);
          if (!copied || !current(token)) return null;
        }
        segments.push({ start: span.start, sampleRate: SAMPLE_RATE, samples: samples });
      }
      return { duration: duration, segments: segments };
    }
    async function compute(payload, token) {
      if (await prepareWorker(token)) {
        if (!current(token) || !worker) return null;
        var id = ++requestId;
        var pending = new Promise(function (resolve) {
          workerRequests.set(id, resolve);
          try {
            worker.postMessage({ type: 'analyze', id: id, payload: payload }, payload.segments.map(function (segment) { return segment.samples.buffer; }));
          } catch (e) { workerRequests.delete(id); resolve(null); }
        });
        var result = await waitFor(pending, 5000, token);
        workerRequests.delete(id);
        if (!result) stopWorker();
        return result;
      }
      return scheduled(function () { return analyzeCompact(payload); }, token);
    }
    function analyze(track, audioContext, durationHint) {
      if (destroyed || !track || track.kind !== 'audio' || typeof track.url !== 'string' ||
        !finite(durationHint) || durationHint <= 0 || durationHint > MAX_SECONDS ||
        !audioContext || typeof audioContext.decodeAudioData !== 'function' || !root.fetch || !root.AbortController) return Promise.resolve(null);
      var url;
      try {
        url = new URL(track.url, root.location.href);
        if (!/^https?:$/.test(url.protocol) || url.origin !== root.location.origin) return Promise.resolve(null);
      } catch (e) { return Promise.resolve(null); }
      if (finite(track.size) && track.size > limit) return Promise.resolve(null);
      var key = url.href + '|' + String(track.audioId || track.id || '');
      var token = generation;
      async function work() {
        if (!current(token)) return null;
        if (cache.has(key)) {
          var found = cache.get(key);
          cache.delete(key);
          cache.set(key, found);
          return found;
        }
        // A timed-out native decode cannot be aborted. Do not accumulate more decodes.
        if (decodeInFlight) return null;
        var aborter = new root.AbortController();
        controller = aborter;
        try {
          var response = await root.fetch(url.href, { credentials: 'same-origin', mode: 'same-origin', signal: aborter.signal, cache: 'force-cache' });
          if (!response.ok || !current(token) || (response.url && new URL(response.url, url.href).origin !== url.origin)) { aborter.abort(); return null; }
          var bytes = await readBounded(response, aborter, token);
          if (!bytes || !current(token)) return null;
          var buffer = await waitFor(decode(audioContext, bytes), 12000, token);
          bytes = null;
          if (!buffer || !current(token) || !finite(buffer.duration) || buffer.duration <= 0 || buffer.duration > MAX_SECONDS ||
            !finite(buffer.sampleRate) || buffer.sampleRate < 1000 || buffer.sampleRate > 192000 || !finite(buffer.length) || buffer.length < 1 ||
            !finite(buffer.numberOfChannels) || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 32 ||
            buffer.length * buffer.numberOfChannels * 4 > MAX_DECODED_BYTES) return null;
          var payload = await compact(buffer, token);
          buffer = null;
          if (!payload || !current(token)) return null;
          var result = await compute(payload, token);
          if (!result || !current(token)) return null;
          cache.set(key, result);
          while (cache.size > 12) cache.delete(cache.keys().next().value);
          return result;
        } catch (e) { return null; }
        finally { if (controller === aborter) controller = null; }
      }
      var result = serial.then(work, work);
      serial = result.then(function () {}, function () {});
      return result;
    }
    function cancel() {
      generation++;
      if (controller) controller.abort();
      controller = null;
      stopWaits.forEach(function (stop) { stop(); });
      stopWaits.clear();
      stopWorker();
    }
    function destroy() { cancel(); destroyed = true; cache.clear(); }
    return { analyze: analyze, cancel: cancel, destroy: destroy };
  }

  C.MusicAnalysis = { create: create, plan: plan, analyzeSamples: analyzeSamples, analyzeCompact: analyzeCompact };
  if (typeof module !== 'undefined' && module.exports) module.exports = C.MusicAnalysis;
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis);

/* Tiny Web Audio sound effects — generated in the browser (no files). Shared by the games + chooser.
   Cartoon-style on purpose: boings, bonks, sad trombones, party horns, drum rolls and applause. */
(function () {
  'use strict';
  var C = window.C122 || (window.C122 = {});
  var KEY = 'c122:sfx';
  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var voices = new Set();
  var ctx = null, master = null, enabled = sget(KEY) !== '0';

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = enabled ? 0.32 : 0; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && ctx.resume) { var pending = ctx.resume(); if (pending && pending.catch) pending.catch(function () {}); }
    return ctx;
  }

  function register(source, nodes) {
    voices.add(source); source.onended = function () { voices.delete(source); nodes.forEach(function (node) { try { node.disconnect(); } catch (_) {} }); };
  }
  function stop() { voices.forEach(function (source) { try { source.stop(); } catch (_) {} }); voices.clear(); }
  function now() { return ctx.currentTime; }

  /* One oscillator voice.
     o.type, o.when, o.gain, o.attack, o.hold (seconds at full gain), o.slideTo (+o.slideTime),
     o.curve [[offset, freq], ...] for pitch shapes, o.vibrato [rate, depth, decayTo?], o.filter [type, freq, q, slideTo?] */
  function tone(freq, dur, o) {
    o = o || {}; var t = o.when != null ? o.when : now();
    var osc = ctx.createOscillator(), g = ctx.createGain(), nodes = [osc, g], out = osc;
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    if (o.curve) o.curve.forEach(function (pt) { osc.frequency.exponentialRampToValueAtTime(Math.max(1, pt[1]), t + pt[0]); });
    else if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t + (o.slideTime || dur));
    if (o.vibrato) {
      var lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.setValueAtTime(o.vibrato[0], t); depth.gain.setValueAtTime(o.vibrato[1], t);
      if (o.vibrato[2] != null) depth.gain.exponentialRampToValueAtTime(Math.max(0.01, o.vibrato[2]), t + dur);
      lfo.connect(depth); depth.connect(osc.frequency); register(lfo, [lfo, depth]); lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    if (o.filter) {
      var f = ctx.createBiquadFilter(); f.type = o.filter[0]; f.frequency.setValueAtTime(o.filter[1], t);
      if (o.filter[2]) f.Q.value = o.filter[2];
      if (o.filter[3]) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.filter[3]), t + dur);
      osc.connect(f); out = f; nodes.push(f);
    }
    var gain = o.gain == null ? 0.3 : o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + (o.attack || 0.01));
    if (o.hold) g.gain.setValueAtTime(gain, t + Math.max(o.attack || 0.01, o.hold));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(g); g.connect(master); register(osc, nodes); osc.start(t); osc.stop(t + dur + 0.03);
  }
  function noise(dur, o) {
    o = o || {}; var t = o.when != null ? o.when : now();
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var filt = ctx.createBiquadFilter(); filt.type = o.filter || 'bandpass'; filt.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.slideTo) filt.frequency.exponentialRampToValueAtTime(Math.max(40, o.slideTo), t + dur);
    filt.Q.value = o.q || 1;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain == null ? 0.2 : o.gain, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(master); register(src, [src, filt, g]); src.start(t); src.stop(t + dur + 0.03);
  }
  function arp(freqs, step, dur, o) { o = o || {}; var base = o.when != null ? o.when : now(); freqs.forEach(function (f, i) { tone(f, dur, { when: base + i * step, type: o.type || 'triangle', gain: o.gain == null ? 0.26 : o.gain }); }); }

  /* ---- building blocks ---- */
  function boing(t, low) {
    var f = low ? 110 : 150;
    tone(f, 0.55, { when: t, type: 'sine', curve: [[0.07, f * 3.6], [0.55, f * 2.2]], vibrato: [16, f * 0.9, 2], gain: 0.3 });
    tone(f / 2, 0.22, { when: t, type: 'triangle', slideTo: f, gain: 0.14 });
  }
  function bonk(t) {
    tone(260, 0.2, { when: t, type: 'triangle', slideTo: 70, gain: 0.4 });
    tone(1450, 0.05, { when: t, type: 'square', gain: 0.05 });
    noise(0.07, { when: t, filter: 'lowpass', freq: 1900, gain: 0.25 });
  }
  function sadTrombone(t) {   // wah wah wah waaaah
    var notes = [293.66, 277.18, 261.63, 246.94], lens = [0.32, 0.32, 0.32, 1.05], at = t;
    notes.forEach(function (f, i) {
      var last = i === notes.length - 1;
      tone(f, lens[i], { when: at, type: 'sawtooth', attack: 0.04, hold: lens[i] * 0.55, gain: 0.15, filter: ['lowpass', 900, 4, last ? 500 : 0], vibrato: last ? [5.5, 8] : null });
      tone(f / 2, lens[i], { when: at, type: 'triangle', attack: 0.04, hold: lens[i] * 0.55, gain: 0.09 });
      at += lens[i] + 0.02;
    });
  }
  function partyHorn(t) {
    tone(380, 0.6, { when: t, type: 'sawtooth', curve: [[0.07, 620], [0.6, 590]], vibrato: [28, 14], filter: ['bandpass', 1500, 1.4], attack: 0.02, hold: 0.42, gain: 0.3 });
    tone(760, 0.6, { when: t, type: 'square', curve: [[0.07, 1240], [0.6, 1180]], filter: ['lowpass', 2600], attack: 0.02, hold: 0.42, gain: 0.05 });
    noise(0.32, { when: t + 0.02, filter: 'highpass', freq: 4200, gain: 0.05 });
  }
  function airhorn(t) {
    [[0, 0.13], [0.17, 0.13], [0.34, 0.55]].forEach(function (b) {
      [466, 470, 233].forEach(function (f, i) { tone(f, b[1], { when: t + b[0], type: i === 2 ? 'square' : 'sawtooth', filter: ['lowpass', 2800], attack: 0.015, hold: b[1] * 0.75, gain: i === 2 ? 0.07 : 0.13 }); });
    });
  }
  function drumRoll(t, seconds) {
    var steps = Math.max(4, Math.floor(seconds / 0.045));
    for (var i = 0; i < steps; i++) {
      var p = i / steps;
      noise(0.05, { when: t + i * 0.045, filter: 'highpass', freq: 1300 + Math.random() * 500, gain: 0.04 + p * 0.16 });
      if (i % 2 === 0) tone(150, 0.05, { when: t + i * 0.045, type: 'triangle', slideTo: 90, gain: 0.03 + p * 0.07 });
    }
  }
  function crash(t) {
    noise(1.3, { when: t, filter: 'highpass', freq: 5200, gain: 0.24 });
    noise(0.5, { when: t, filter: 'bandpass', freq: 2400, q: 0.7, gain: 0.12 });
    tone(120, 0.35, { when: t, type: 'sine', slideTo: 42, gain: 0.45 });
  }
  function tada(t) {
    [523.25, 659.25, 783.99].forEach(function (f) { tone(f, 0.14, { when: t, type: 'sawtooth', filter: ['lowpass', 2600], gain: 0.07 }); });
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f) { tone(f, 0.85, { when: t + 0.16, type: 'sawtooth', filter: ['lowpass', 3000, 1, 1400], attack: 0.03, hold: 0.35, gain: 0.07, vibrato: [5, 4] }); });
  }
  function applause(t, seconds) {
    for (var i = 0; i < 140; i++) {
      var at = t + Math.pow(Math.random(), 0.8) * seconds;
      noise(0.018 + Math.random() * 0.02, { when: at, filter: 'bandpass', freq: 900 + Math.random() * 2600, q: 1.2, gain: 0.04 + Math.random() * 0.06 });
    }
  }
  function coin(t) { tone(987.77, 0.08, { when: t, type: 'square', gain: 0.1 }); tone(1318.5, 0.38, { when: t + 0.08, type: 'square', gain: 0.1 }); }
  function pop(t, pitch) { tone(pitch || 380, 0.09, { when: t, type: 'sine', slideTo: (pitch || 380) * 3.4, attack: 0.003, gain: 0.3 }); }
  function squeak(t) {
    tone(1500, 0.16, { when: t, type: 'sine', curve: [[0.05, 2600], [0.16, 1700]], gain: 0.16 });
    tone(1600, 0.14, { when: t + 0.2, type: 'sine', curve: [[0.04, 2800], [0.14, 1900]], gain: 0.14 });
  }
  function whoosh(t) { noise(0.3, { when: t, filter: 'bandpass', freq: 450, slideTo: 3400, q: 1.3, attack: 0.12, gain: 0.2 }); }
  var SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];

  var S = {
    /* --- Ludo --- */
    dice: function () {
      var t = now();
      for (var i = 0; i < 7; i++) noise(0.045, { when: t + i * 0.05, gain: 0.12, filter: 'bandpass', freq: 1400 + Math.random() * 1800, q: 2.5 });
      tone(190, 0.13, { when: t + 0.38, type: 'triangle', gain: 0.26, slideTo: 110 });
    },
    six: function () { coin(now()); },
    hop: function (o) {   // one step of a token walking; o.step raises the pitch
      var step = Math.max(0, (o && o.step) | 0) % SCALE.length, f = 392 * Math.pow(2, SCALE[step] / 12), t = now();
      tone(f, 0.09, { when: t, type: 'triangle', slideTo: f * 1.45, attack: 0.004, gain: 0.2 });
      noise(0.02, { when: t, filter: 'highpass', freq: 3500, gain: 0.04 });
    },
    move: function () { pop(now(), 520); },
    leave: function () { boing(now()); },
    capture: function () { var t = now(); bonk(t); squeak(t + 0.12); sadTrombone(t + 0.45); },
    home: function () { var t = now(); tada(t); pop(t + 0.05, 700); },
    oops: function () { var t = now(); tone(1400, 0.65, { when: t, type: 'sine', slideTo: 200, vibrato: [7, 18], gain: 0.22 }); tone(110, 0.4, { when: t + 0.6, type: 'square', filter: ['lowpass', 800], hold: 0.3, gain: 0.1 }); },
    noMove: function () { var t = now(); tone(330, 0.16, { when: t, type: 'sine', slideTo: 260, gain: 0.16 }); tone(250, 0.28, { when: t + 0.17, type: 'sine', slideTo: 160, gain: 0.16 }); },
    turn: function () { pop(now(), 300); },
    win: function () {
      var t = now();
      arp([523, 659, 784, 1047, 1319], 0.11, 0.17, { gain: 0.24 });
      tone(130, 0.5, { when: t + 0.02, type: 'triangle', gain: 0.16 });
      partyHorn(t + 0.6); applause(t + 0.4, 2.4); crash(t + 0.55);
    },
    /* --- FlashCards --- */
    flip: function () { whoosh(now()); },
    know: function () { var t = now(); coin(t); pop(t + 0.28, 600); },
    nope: function () { var t = now(); tone(196, 0.18, { when: t, type: 'sawtooth', filter: ['lowpass', 700], gain: 0.16 }); tone(147, 0.34, { when: t + 0.17, type: 'sawtooth', filter: ['lowpass', 600], vibrato: [9, 5], gain: 0.16 }); },
    /* --- Chooser --- */
    scanStart: function (o) { var t = now(); tone(280, 0.6, { when: t, type: 'sawtooth', gain: 0.08, slideTo: 1400, filter: ['lowpass', 2400] }); drumRoll(t + 0.1, (o && o.seconds) || 3); },
    tick: function () { tone(900 + Math.random() * 700, 0.035, { type: 'square', gain: 0.07 }); },
    chosen: function () { var t = now(); crash(t); airhorn(t + 0.05); tada(t + 0.75); applause(t + 0.3, 2.2); },
    /* --- shared --- */
    boing: function () { boing(now()); },
    bonk: function () { bonk(now()); },
    sad: function () { sadTrombone(now()); },
    horn: function () { partyHorn(now()); },
    pop: function () { pop(now()); },
    click: function () { tone(800, 0.04, { type: 'square', gain: 0.09 }); }
  };

  function play(name, opts) {
    if (!enabled) return; var c = ensure(); if (!c) return;
    var fn = S[name]; if (fn) try { fn(opts); } catch (e) {}
  }

  function refresh() {
    document.querySelectorAll('[data-sfx-toggle]').forEach(function (b) {
      b.classList.toggle('is-muted', !enabled);
      b.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      b.title = enabled ? (window.C122I18n ? window.C122I18n.t('sfx.on', 'Дуу: асаалттай') : 'Дуу: асаалттай') : (window.C122I18n ? window.C122I18n.t('sfx.off', 'Дуу: унтраалттай') : 'Дуу: унтраалттай');
      b.setAttribute('aria-label',b.title);
    });
  }
  function setEnabled(v, silent) { enabled = !!v; sset(KEY, enabled ? '1' : '0'); if (!enabled) stop(); if (master) master.gain.setValueAtTime(enabled ? 0.32 : 0,ctx.currentTime); refresh(); if (enabled && !silent) play('boing'); }

  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-sfx-toggle]'); if (b) { e.preventDefault(); setEnabled(!enabled); } });
  if (document.readyState !== 'loading') refresh(); else document.addEventListener('DOMContentLoaded', refresh);

  document.addEventListener('c122:language',refresh);
  window.addEventListener('storage',function (event) { if (event.key === KEY) setEnabled(event.newValue !== '0',true); });
  document.addEventListener('visibilitychange',function () { if (document.hidden) stop(); });
  C.SFX = { stop:stop, play: play, enabled: function () { return enabled; }, setEnabled: setEnabled, refresh: refresh };
})();

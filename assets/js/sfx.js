/* Tiny Web Audio sound effects — generated in the browser (no files). Shared by the games + chooser. */
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
  function tone(freq, dur, o) {
    o = o || {}; var t = o.when || ctx.currentTime;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t + dur);
    var gain = o.gain == null ? 0.3 : o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master); register(osc,[osc,g]); osc.start(t); osc.stop(t + dur + 0.03);
  }
  function noise(dur, o) {
    o = o || {}; var t = o.when || ctx.currentTime;
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var filt = ctx.createBiquadFilter(); filt.type = o.filter || 'bandpass'; filt.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.slideTo) filt.frequency.exponentialRampToValueAtTime(Math.max(40, o.slideTo), t + dur);
    filt.Q.value = o.q || 1;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain == null ? 0.2 : o.gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(master); register(src,[src,filt,g]); src.start(t); src.stop(t + dur + 0.03);
  }
  function arp(freqs, step, dur, o) { o = o || {}; var base = ctx.currentTime; freqs.forEach(function (f, i) { tone(f, dur, Object.assign({ when: base + i * step, type: o.type || 'triangle', gain: o.gain == null ? 0.26 : o.gain }, {})); }); }

  var S = {
    dice: function () { for (var i = 0; i < 6; i++) noise(0.05, { when: ctx.currentTime + i * 0.055, gain: 0.11, filter: 'bandpass', freq: 1400 + Math.random() * 1800, q: 2.5 }); tone(190, 0.13, { when: ctx.currentTime + 0.36, type: 'triangle', gain: 0.26, slideTo: 110 }); },
    move: function () { tone(620, 0.1, { type: 'sine', gain: 0.22, slideTo: 880 }); noise(0.025, { gain: 0.06, filter: 'highpass', freq: 3000 }); },
    capture: function () { noise(0.2, { filter: 'highpass', freq: 3200, slideTo: 400, gain: 0.2 }); tone(520, 0.22, { type: 'sawtooth', gain: 0.22, slideTo: 110 }); },
    home: function () { tone(660, 0.12, { gain: 0.24 }); tone(990, 0.2, { when: ctx.currentTime + 0.1, gain: 0.24, type: 'triangle' }); },
    win: function () { arp([523, 659, 784, 1047, 1319], 0.11, 0.17, { gain: 0.26 }); tone(130, 0.5, { when: ctx.currentTime + 0.02, type: 'triangle', gain: 0.16 }); for (var i = 0; i < 6; i++) noise(0.05, { when: ctx.currentTime + 0.5 + i * 0.07, gain: 0.07, filter: 'highpass', freq: 5000 + Math.random() * 3000 }); },
    flip: function () { noise(0.055, { filter: 'highpass', freq: 2200, gain: 0.13 }); tone(900, 0.05, { type: 'square', gain: 0.05 }); },
    know: function () { tone(600, 0.1, { gain: 0.2, slideTo: 900 }); tone(920, 0.13, { when: ctx.currentTime + 0.08, gain: 0.2, type: 'triangle' }); },
    nope: function () { tone(330, 0.15, { type: 'sine', gain: 0.17, slideTo: 210 }); },
    scanStart: function () { tone(280, 0.6, { type: 'sawtooth', gain: 0.11, slideTo: 1400 }); },
    tick: function () { tone(1250, 0.03, { type: 'square', gain: 0.09 }); },
    chosen: function () { arp([523, 659, 784, 1047, 1319, 1568], 0.075, 0.16, { gain: 0.26 }); tone(110, 0.5, { when: ctx.currentTime + 0.02, type: 'triangle', gain: 0.18 }); for (var i = 0; i < 10; i++) noise(0.05, { when: ctx.currentTime + 0.35 + i * 0.05, gain: 0.07, filter: 'highpass', freq: 5000 + Math.random() * 4000 }); },
    click: function () { tone(800, 0.04, { type: 'square', gain: 0.09 }); }
  };

  function play(name) {
    if (!enabled) return; var c = ensure(); if (!c) return;
    var fn = S[name]; if (fn) try { fn(); } catch (e) {}
  }

  function refresh() {
    document.querySelectorAll('[data-sfx-toggle]').forEach(function (b) {
      b.classList.toggle('is-muted', !enabled);
      b.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      b.title = enabled ? (window.C122I18n ? window.C122I18n.t('sfx.on', 'Дуу: асаалттай') : 'Дуу: асаалттай') : (window.C122I18n ? window.C122I18n.t('sfx.off', 'Дуу: унтраалттай') : 'Дуу: унтраалттай');
      b.setAttribute('aria-label',b.title);
    });
  }
  function setEnabled(v, silent) { enabled = !!v; sset(KEY, enabled ? '1' : '0'); if (!enabled) stop(); if (master) master.gain.setValueAtTime(enabled ? 0.32 : 0,ctx.currentTime); refresh(); if (enabled && !silent) play('click'); }

  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-sfx-toggle]'); if (b) { e.preventDefault(); setEnabled(!enabled); } });
  if (document.readyState !== 'loading') refresh(); else document.addEventListener('DOMContentLoaded', refresh);

  document.addEventListener('c122:language',refresh);
  window.addEventListener('storage',function (event) { if (event.key === KEY) setEnabled(event.newValue !== '0',true); });
  document.addEventListener('visibilitychange',function () { if (document.hidden) stop(); });
  C.SFX = { stop:stop, play: play, enabled: function () { return enabled; }, setEnabled: setEnabled, refresh: refresh };
})();

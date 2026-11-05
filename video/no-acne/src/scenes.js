'use strict';
/* Fixed 70 s timeline from the brief, shots, compositor, audio cues. */

const BUF = {};
function bufInit() {
  if (BUF.scene) return;
  BUF.scene = makeCanvas();
  BUF.small = makeCanvas(W / 4, H / 4);
  const v = makeCanvas(), x = v.getContext('2d');
  let g = x.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  BUF.vignette = v;
  const s = makeCanvas(), y = s.getContext('2d');
  g = y.createLinearGradient(0, 0, 0, 560);
  g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  y.fillStyle = g; y.fillRect(0, 0, W, 560);
  BUF.scrim = s;
}
function resetCtx(c) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.shadowBlur = 0; c.shadowColor = 'transparent'; c.letterSpacing = '0px'; c.setLineDash([]);
}
function shot(lt, D, cuts) {
  const b = [0, ...cuts.map((c) => c * D), D];
  for (let i = 0; i < b.length - 1; i++) if (lt < b[i + 1] || i === b.length - 2) return { i, t: lt - b[i], d: b[i + 1] - b[i], f: (lt - b[i]) / (b[i + 1] - b[i]) };
}
function pushCam(ctx, z, fx = W / 2, fy = H / 2) { ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy); }

/* 0:00 perfect, glass-smooth skin */
function shotHook(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.0 + 0.1 * E.sine(lt / D), W / 2, 950);
  drawBathroom(ctx, T, (c) => drawFace(c, W / 2, 900, 700, T, { gloss: 1, smile: 0.4 }));
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const sx = lerp(-200, W + 200, seg(lt, 1.0, 3.0));
  const g = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  hudLabel(ctx, W / 2, 200, 'ХЭРВЭЭ БАТГА', { size: 72, weight: 900, color: '#ffffff', align: 'center', ls: 4, alpha: seg(lt, 2.4, 3.0), glow: 'rgba(0,0,0,0.6)' });
  hudLabel(ctx, W / 2, 300, 'ҮҮРД АЛГА БОЛБОЛ?', { size: 80, weight: 900, color: '#ff6b8a', align: 'center', ls: 4, alpha: seg(lt, 2.8, 3.4), glow: 'rgba(0,0,0,0.6)' });
}
/* 0:06 one second: products in the bin, market crashes */
function shotS1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.55]);
  if (s.i === 0) {
    drawProducts(ctx, T, seg(s.t, 0.3, s.d - 0.2));
    hudChip(ctx, W / 2, 1840, 'ХОГИЙН САВ РУУ!', '#ff6b8a', seg(s.t, 0.4, 0.8), 30);
  } else {
    drawCrashChart(ctx, T, seg(s.t, 0.1, s.d - 0.3));
  }
}
/* 0:13 one hour: into the pore, the oil gland freezes */
function shotH1(ctx, lt, T, D) {
  const z = seg(lt, 0, 1.6);
  if (z < 1) {
    ctx.save(); pushCam(ctx, Math.pow(9, E.in(z)), W / 2 + 168, 998);
    drawBathroom(ctx, T, (c) => drawFace(c, W / 2, 900, 700, T, { gloss: 1, pores: 1 }));
    ctx.restore();
    if (z > 0.7) { ctx.fillStyle = `rgba(255,255,255,${(z - 0.7) / 0.3})`; ctx.fillRect(0, 0, W, H); }
  } else {
    drawSkinSection(ctx, T, { frozen: E.inOut(seg(lt, 3.0, 5.0)) });
    if (lt < 1.9) { ctx.fillStyle = `rgba(255,255,255,${1 - seg(lt, 1.6, 1.9)})`; ctx.fillRect(0, 0, W, H); }
    hudChip(ctx, W / 2, 1840, 'СЕБУМ ЗОГССОН', '#9fd0ff', seg(lt, 5.0, 5.5), 30);
    // microscope ring
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 140; ellipse(ctx, W / 2, 1060, 620, 760); ctx.stroke();
  }
}
/* 0:21 eight hours: skin dries and cracks */
function shotH8(ctx, lt, T, D) {
  const s = shot(lt, D, [0.55]);
  if (s.i === 0) {
    const k = E.inOut(seg(s.t, 0.2, s.d));
    ctx.save(); pushCam(ctx, 1.25 + 0.15 * s.f, W / 2, 920);
    drawBathroom(ctx, T, (c) => drawFace(c, W / 2, 900, 700, T, { cracks: k, dry: k, smile: -0.4 * k }));
    ctx.restore();
    hudChip(ctx, W / 2, 1840, 'АРЬС ХАТАЖ ЦУУРНА', '#e0a070', seg(s.t, 0.6, 1.0), 30);
  } else {
    drawSkinSection(ctx, T, { frozen: 1, dry: 1, crack: E.inOut(seg(s.t, 0.2, s.d)) });
    hudChip(ctx, W / 2, 1840, 'ЧИЙГ УУРШИЖ БАЙНА', '#82c8ff', seg(s.t, 0.3, 0.7), 30);
  }
}
/* 0:29 24 hours: germs get in through the cracks */
function shotD1(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.0 + 0.08 * (lt / D), W / 2, 900);
  drawSkinSection(ctx, T, { frozen: 1, dry: 0.6, crack: 1, bact: E.out(seg(lt, 0.5, 3.0)) });
  ctx.restore();
  hudChip(ctx, W / 2, 1840, 'НЯН НЭВТЭРЧ БАЙНА', '#ff4d5e', seg(lt, 1.2, 1.7), 32);
}
/* 0:38 back to reality: one small red spot, a smile */
function shotEnd(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.35 - 0.2 * E.inOut(seg(lt, 0, D)), W / 2 + 120, 1000);
  drawBathroom(ctx, T, (c) => drawFace(c, W / 2, 900, 700, T, { pores: 0.6, spot: E.out(seg(lt, 0.8, 2.0)), smile: E.inOut(seg(lt, 2.6, 3.6)), look: 0.5 }));
  ctx.restore();
  const a = seg(lt, D - 3.2, D - 2.4);
  ctx.fillStyle = `rgba(10,14,20,${0.45 * a})`; ctx.fillRect(0, 0, W, H);
  hudLabel(ctx, W / 2, 820, 'БАТГА —', { size: 70, weight: 800, color: '#ffffff', align: 'center', ls: 6, alpha: a, glow: 'rgba(0,0,0,0.8)' });
  hudLabel(ctx, W / 2, 940, 'АМЬД БАЙГААГИЙН', { size: 92, weight: 900, color: '#ff8fa8', align: 'center', ls: 2, alpha: a, glow: 'rgba(255,80,120,0.5)', blur: 30 });
  hudLabel(ctx, W / 2, 1050, 'БАТАЛГАА', { size: 92, weight: 900, color: '#ff8fa8', align: 'center', ls: 2, alpha: a, glow: 'rgba(255,80,120,0.5)', blur: 30 });
}

const SCENES = [
  { id: 'hook', t0: 0, t1: 6, fn: shotHook, grade: [1.08, 1.04] },
  { id: 's1', t0: 6, t1: 13, val: 1, l1: '1 СЕКУНД', l2: 'СЭНСААЦИ', fn: shotS1, grade: [1.05, 1.05] },
  { id: 'h1', t0: 13, t1: 21, val: 3600, l1: '3,600 СЕКУНД · 1 ЦАГ', l2: 'НУУЦ ДАВХАРГА', fn: shotH1, grade: [1.0, 1.06] },
  { id: 'h8', t0: 21, t1: 29, val: 28800, l1: '28,800 СЕКУНД · 8 ЦАГ', l2: 'ХУУРАЙШИЛТ', fn: shotH8, grade: [0.9, 1.08] },
  { id: 'd1', t0: 29, t1: 38, val: 86400, l1: '86,400 СЕКУНД · 24 ЦАГ', l2: 'БАКТЕРИЙН ДАЙРАЛТ', fn: shotD1, grade: [0.95, 1.1] },
  { id: 'end', t0: 38, t1: 46, fn: shotEnd, grade: [1.08, 1.04] },
];
const DURATION = 46;
const ROLL = 0.7;
(function attachVoice() {
  const lines = (window.VOICE && window.VOICE.lines) || [];
  SCENES.forEach((s, i) => { const v = lines[i]; s.vfile = v ? v.file : null; s.vstart = v ? v.start : null; s.flash = i > 0; });
})();
function sceneIndex(T) { for (let i = SCENES.length - 1; i >= 0; i--) if (T >= SCENES[i].t0) return i; return 0; }
function dispValue(i, lt) {
  const S = SCENES[i], nx = SCENES[i + 1];
  if (S.val == null) return null;
  const rate = nx && nx.val ? Math.min(1, ((nx.val - S.val) * 0.85) / (S.t1 - S.t0)) : 1;
  return S.val + Math.floor(Math.max(0, lt - ROLL) * rate);
}
function timerState(T) {
  const i = sceneIndex(T), S = SCENES[i], lt = T - S.t0;
  if (S.val == null) return null;
  const st = { color: '#ffffff', l1: S.l1, l2: S.l2, rolling: false };
  if (i === 1) { st.val = dispValue(1, lt); }
  else {
    const prev = dispValue(i - 1, SCENES[i - 1].t1 - SCENES[i - 1].t0 - 1e-6);
    if (lt < ROLL) { st.val = Math.floor(Math.exp(lerp(Math.log(prev + 1), Math.log(S.val + 1), E.inOut(lt / ROLL))) - 1); st.rolling = true; }
    else st.val = dispValue(i, lt);
  }
  st.alpha = i === 1 ? seg(lt, 0.1, 0.4) : 1;
  st.l1a = seg(lt, ROLL - 0.1, ROLL + 0.25); st.l2a = seg(lt, ROLL + 0.05, ROLL + 0.4);
  if (false) { st.alpha *= 1 - seg(lt, 6.5, 7.3); st.l1a *= 1 - seg(lt, 6.5, 7.3); st.l2a *= 1 - seg(lt, 6.5, 7.3); }
  return st;
}
function drawTimerHUD(ctx, T) {
  const st = timerState(T);
  if (!st) return;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
  ctx.globalAlpha = st.alpha;
  ctx.font = '800 128px "JetBrains Mono"'; ctx.fillStyle = st.color;
  const jit = st.rolling ? (hash(Math.floor(T * 60)) - 0.5) * 6 : 0;
  ctx.fillText(fmtClock(st.val), W / 2 + jit, 250);
  ctx.globalAlpha = st.alpha * st.l1a;
  ctx.font = '700 36px Inter'; ctx.letterSpacing = '6px'; ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(st.l1, W / 2, 322 + (1 - st.l1a) * 16);
  ctx.globalAlpha = st.alpha * st.l2a;
  ctx.font = '800 44px Inter'; ctx.letterSpacing = '7px'; ctx.fillStyle = '#ffcf6e';
  ctx.fillText(st.l2, W / 2, 388 + (1 - st.l2a) * 16);
  ctx.restore();
}

let MAIN = null;
function renderAt(T) {
  bufInit();
  const main = MAIN;
  const i = sceneIndex(T), S = SCENES[i], lt = T - S.t0, D = S.t1 - S.t0;
  const sc = BUF.scene.getContext('2d');
  resetCtx(sc); sc.fillStyle = '#000'; sc.fillRect(0, 0, W, H);
  S.fn(sc, lt, T, D);
  resetCtx(sc);
  resetCtx(main); main.fillStyle = '#000'; main.fillRect(0, 0, W, H);
  const punch = S.flash ? 1 + 0.05 * (1 - E.out(seg(lt, 0, 0.45))) : 1;
  main.save(); pushCam(main, punch);
  main.filter = `saturate(${S.grade[0]}) contrast(${S.grade[1]})`;
  main.drawImage(BUF.scene, 0, 0);
  main.restore(); resetCtx(main);
  main.globalAlpha = 0.85; main.drawImage(BUF.vignette, 0, 0);
  main.globalAlpha = 1; main.drawImage(BUF.scrim, 0, 0);
  drawTimerHUD(main, T); resetCtx(main);
  const gt = grainTiles();
  main.globalCompositeOperation = 'overlay'; main.globalAlpha = 0.07;
  main.drawImage(gt[Math.floor(T * 15) % gt.length], 0, 0, W, H);
  resetCtx(main);
  if (S.flash && lt < 0.25) { main.fillStyle = `rgba(255,250,240,${0.35 * (1 - E.out(lt / 0.25))})`; main.fillRect(0, 0, W, H); }
  let black = 0;
  if (T < 0.4) black = 1 - T / 0.4;
  if (T > DURATION - 0.5) black = Math.max(black, seg(T, DURATION - 0.5, DURATION - 0.02));
  if (black > 0) { main.fillStyle = `rgba(0,0,0,${black})`; main.fillRect(0, 0, W, H); }
}

function exportCues() {
  const C = { duration: DURATION, scenes: SCENES.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 })) };
  C.voice = SCENES.filter((s) => s.vfile).map((s) => ({ file: s.vfile, start: s.vstart }));
  C.flashes = SCENES.filter((s) => s.flash).map((s) => s.t0);
  C.ticks = [];
  let prev = null;
  for (let T = 6; T < 38; T += 1 / 240) {
    const st = timerState(T);
    if (!st || st.alpha < 0.05) { prev = null; continue; }
    if (prev !== null && st.val !== prev) C.ticks.push({ t: +T.toFixed(4), roll: st.rolling });
    prev = st.val;
  }
  const D1 = 7;
  C.throws = [0, 1, 2, 3, 4].map((i) => 6 + 0.3 + (0.16 * i + 0.3) * (0.55 * D1 - 0.5));
  C.crash = 6 + 0.55 * D1 + 0.1 + 0.72 * (0.45 * D1 - 0.4);
  C.zoom = [13, 14.6];
  C.freeze = 16.0;
  C.cracks = [21, 29];
  C.bact = [29, 38];
  C.spot = 38.8;
  C.endText = 46 - 3.2;
  return C;
}

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

/* hook: the question over gathering clouds */
function shotHook(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.08 - 0.08 * (lt / D), W / 2, 900);
  drawVirga(ctx, T, lt * 0.55, true);
  ctx.restore();
  ctx.fillStyle = 'rgba(10,14,20,0.35)'; ctx.fillRect(0, 0, W, H);
  hudLabel(ctx, W / 2, 700, 'ХЭРВЭЭ ДЭЛХИЙ ДЭЭР', { size: 64, weight: 900, color: '#ffffff', align: 'center', ls: 3, alpha: seg(lt, 0.2, 0.7), glow: 'rgba(0,0,0,0.85)' });
  hudLabel(ctx, W / 2, 800, 'ДАХИН ХЭЗЭЭ Ч', { size: 64, weight: 900, color: '#ffffff', align: 'center', ls: 3, alpha: seg(lt, 0.6, 1.1), glow: 'rgba(0,0,0,0.85)' });
  hudLabel(ctx, W / 2, 940, 'БОРОО ОРОХГҮЙ', { size: 96, weight: 900, color: '#9fdcff', align: 'center', ls: 3, alpha: seg(lt, 1.1, 1.6), glow: 'rgba(60,160,255,0.6)', blur: 30 });
  hudLabel(ctx, W / 2, 1060, 'БОЛБОЛ?', { size: 96, weight: 900, color: '#9fdcff', align: 'center', ls: 3, alpha: seg(lt, 1.5, 2.0), glow: 'rgba(60,160,255,0.6)', blur: 30 });
}
/* one second: clouds gather, rain never lands */
function shotS1(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.0 + 0.06 * (lt / D), W / 2, 900);
  drawVirga(ctx, T, lt + 2.5);
  ctx.restore();
  const a = 0;
  hudLabel(ctx, W / 2, 1520, 'ХЭРВЭЭ ДАХИН ХЭЗЭЭ Ч', { size: 56, weight: 900, color: '#ffffff', align: 'center', ls: 3, alpha: a, glow: 'rgba(0,0,0,0.85)' });
  hudLabel(ctx, W / 2, 1620, 'БОРОО ОРОХГҮЙ БОЛБОЛ?', { size: 72, weight: 900, color: '#9fdcff', align: 'center', ls: 3, alpha: a, glow: 'rgba(0,0,0,0.85)' });
  hudChip(ctx, W / 2, 1780, 'ДУСАЛ ГАЗАРТ ХҮРЭХГҮЙ', '#9fdcff', seg(lt, 4.2, 4.7), 30);
}
/* 0:06 day 1: parks and steppe turn yellow, soil cracks */
function shotD1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.55]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.0 + 0.05 * s.f, W / 2, 1100);
    drawPark(ctx, T, E.inOut(seg(s.t, 0.2, s.d)));
    ctx.restore();
  } else {
    drawLandscape(ctx, { t: T, d: lerp(0.5, 1, s.f), hy: 1080, sun: { x: 840, y: 600, r: 70 }, harsh: 0.6, gers: [{ x: 300, w: 60 }, { x: 760, w: 46 }], grass: 0.6, wind: 1 });
    hudChip(ctx, W / 2, 1800, 'ХӨРС ХАТАЖ БАЙНА', '#e0b060', seg(s.t, 0.3, 0.7), 30);
  }
}
/* 0:13 day 7: the dust storm */
function shotD7(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.0 + 0.06 * (lt / D), W / 2, 1000);
  drawDustStorm(ctx, T, seg(lt, 0.3, D - 1.5));
  ctx.restore();
  hudChip(ctx, W / 2, 1800, 'ШОРООН ШУУРГА', '#d08a4a', seg(lt, 1.0, 1.5), 32);
}
/* 0:22 day 30: rivers run dry, dams stop */
function shotD30(ctx, lt, T, D) {
  const s = shot(lt, D, [0.6]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.0 + 0.05 * s.f, W / 2, 1100);
    drawRiverBed(ctx, T, E.inOut(seg(s.t, 0.2, s.d - 0.3)));
    ctx.restore();
  } else {
    drawDam(ctx, T, E.inOut(seg(s.t, 0.1, 1.6)));
    hudChip(ctx, W / 2, 1830, 'УСАН ЦАХИЛГААН СТАНЦ ЗОГСЛОО', '#ffb020', seg(s.t, 1.2, 1.6), 28);
  }
}
/* 0:31 one year: forest fires, famine */
function shotY1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.4, 0.7]);
  if (s.i === 0) {
    drawTaigaFire(ctx, T, E.out(seg(s.t, 0, s.d)));
    hudChip(ctx, W / 2, 1840, 'ТАЙГА ШАТАЖ БАЙНА', '#ff7a2a', seg(s.t, 0.4, 0.8), 30);
  } else if (s.i === 1) {
    drawEarth(ctx, T, 0.35, { fires: 1, r: 440 });
    hudChip(ctx, W / 2, 1720, 'САНСРААС ХАРАГДАХ ТҮЙМЭР', '#ff7a2a', seg(s.t, 0.3, 0.7), 28);
  } else {
    drawAisle(ctx, T, 1, { flicker: 0.3 });
    hudChip(ctx, W / 2, 1780, 'ӨЛСГӨЛӨН', '#ef4444', seg(s.t, 0.3, 0.7), 40);
  }
}
/* 0:40 the end: Earth like Mars, one clear drop */
function shotEnd(ctx, lt, T, D) {
  const red = E.inOut(seg(lt, 0.2, 3.5));
  drawEarth(ctx, T, red, { r: lerp(440, 380, seg(lt, 3, 7)), cy: 1080 });
  const da = seg(lt, 4.0, 5.0);
  drawDrop(ctx, W / 2, 520, 60, T, da);
  const a = seg(lt, D - 3.0, D - 2.3);
  hudLabel(ctx, W / 2, 1650, 'БОРОО —', { size: 64, weight: 800, color: '#ffffff', align: 'center', ls: 6, alpha: a, glow: 'rgba(0,0,0,0.8)' });
  hudLabel(ctx, W / 2, 1760, 'ДЭЛХИЙН ЗҮРХНИЙ ЦОХИЛТ', { size: 64, weight: 900, color: '#9fdcff', align: 'center', ls: 2, alpha: a, glow: 'rgba(80,180,255,0.5)', blur: 30 });
}

const SCENES = [
  { id: 'hook', t0: 0, t1: 4.5, fn: shotHook, grade: [1.05, 1.06] },
  { id: 's1', t0: 4.5, t1: 10.5, val: 1, l1: '1 СЕКУНД', l2: 'ТАСАЛДСАН ЦИКЛ', fn: shotS1, grade: [1.08, 1.04] },
  { id: 'd1', t0: 10.5, t1: 17.5, val: 86400, l1: '86,400 СЕКУНД · 1 ДЭХ ӨДӨР', l2: 'ХӨРСНИЙ АН ЦАВ', fn: shotD1, grade: [1.0, 1.05] },
  { id: 'd7', t0: 17.5, t1: 26.5, val: 604800, l1: '604,800 СЕКУНД · 7 ДАХЬ ӨДӨР', l2: 'ШУУРГАНЫ ЭХЛЭЛ', fn: shotD7, grade: [0.85, 1.08] },
  { id: 'd30', t0: 26.5, t1: 35.5, val: 2592000, l1: '2,592,000 СЕКУНД · 30 ДАХЬ ӨДӨР', l2: 'ГОЛ МӨРНИЙ СҮЙРЭЛ', fn: shotD30, grade: [0.8, 1.1] },
  { id: 'y1', t0: 35.5, t1: 44.5, val: 31536000, l1: '31,536,000 СЕКУНД · 1 ЖИЛ', l2: 'ОЙН ТҮЙМЭР & ӨЛСГӨЛӨН', fn: shotY1, grade: [0.85, 1.12] },
  { id: 'end', t0: 44.5, t1: 52.5, l2: 'АНГАРАГ ГАРАГ МЭТ ДЭЛХИЙ', fn: shotEnd, grade: [1.0, 1.08] },
];
const DURATION = 52.5;
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
  for (let T = 4.5; T < 44.5; T += 1 / 240) {
    const st = timerState(T);
    if (!st || st.alpha < 0.05) { prev = null; continue; }
    if (prev !== null && st.val !== prev) C.ticks.push({ t: +T.toFixed(4), roll: st.rolling });
    prev = st.val;
  }
  const O = 4.5; C.hookThunder = 1.6; C.thunder = 1.5 + O; C.storm = [13 + O, 22 + O]; C.river = [22 + O, 27.4 + O]; C.dam = 27.4 + O; C.fire = [31 + O, 37.3 + O]; C.drop = 44.0 + O; C.endText = 45.0 + O;
  return C;
}

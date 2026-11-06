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

function hudChip(ctx, x, y, text, colr, alpha = 1, size = 30) {
  if (alpha <= 0.01) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = `800 ${size}px Inter`; ctx.letterSpacing = '3px';
  const w = ctx.measureText(text).width + size * 1.6, h = size * 1.9;
  rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = css(mixc(colr, '#000000', 0.6), 0.8); ctx.fill();
  ctx.strokeStyle = css(colr, 0.95); ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = css(mixc(colr, '#ffffff', 0.25)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 2);
  ctx.restore();
}
/* hook: the question over the smoggy jam */
function shotHook(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.08 - 0.06 * (lt / D), W / 2, 1000);
  drawTraffic(ctx, T, 0);
  ctx.restore();
  ctx.fillStyle = 'rgba(10,8,6,0.35)'; ctx.fillRect(0, 0, W, H);
  hudLabel(ctx, W / 2, 560, 'ХЭРВЭЭ УЛААНБААТАР', { size: 64, weight: 900, color: '#ffffff', align: 'center', ls: 3, alpha: seg(lt, 0.2, 0.7), glow: 'rgba(0,0,0,0.85)' });
  hudLabel(ctx, W / 2, 700, 'МЕТРОТОЙ', { size: 120, weight: 900, color: '#3ad4ff', align: 'center', ls: 4, alpha: seg(lt, 0.7, 1.2), glow: 'rgba(58,212,255,0.7)', blur: 30 });
  hudLabel(ctx, W / 2, 810, 'БОЛБОЛ?', { size: 96, weight: 900, color: '#3ad4ff', align: 'center', ls: 4, alpha: seg(lt, 1.1, 1.6), glow: 'rgba(58,212,255,0.7)', blur: 30 });
}
/* 1 sec: doors open */
function shotS1(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.0 + 0.07 * (lt / D), W / 2, 1400);
  drawEntrance(ctx, T, seg(lt, 1.2, 3.0));
  ctx.restore();
  hudChip(ctx, W / 2, 1800, 'АНХНЫ МЕТРО', '#3ad4ff', seg(lt, 2.4, 2.9), 34);
}
/* 1 min: the jam melts */
function shotM1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.35]);
  if (s.i === 0) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    drawStation(ctx, T, E.out(seg(s.t, 0.1, 2.2)));
  } else {
    drawTraffic(ctx, T, E.inOut(seg(s.t, 0.3, s.d - 0.6)), { map: seg(s.t, 0.2, 0.6), smog: 0.8 });
  }
}
/* 10 min: across the city */
function shotM10(ctx, lt, T, D) {
  drawTrainRide(ctx, T, E.inOut(seg(lt, 0.4, D - 0.6)));
}
/* 24 h: underground shopping */
function shotH24(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.0 + 0.06 * (lt / D), W / 2, 1000);
  drawMall(ctx, T);
  ctx.restore();
  hudChip(ctx, W / 2, 1820, 'ШАТАХУУНЫ ЗАРДАЛ ХЭМНЭГДЭНЭ', '#ffcf8a', seg(lt, 1.0, 1.5), 28);
}
/* 1 month: cleaner sky (partly) */
function shotMo1(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.06 - 0.06 * (lt / D), W / 2, 1100);
  drawSmogCity(ctx, T, E.inOut(seg(lt, 0.5, D - 1)));
  ctx.restore();
  hudChip(ctx, W / 2, 1820, 'ЯНДАНГИЙН УТАА БУУРНА', '#7fd0ff', seg(lt, 1.0, 1.5), 30);
}
/* end: smiling reflection, the train leaves */
function shotEnd(ctx, lt, T, D) {
  const leave = E.in(seg(lt, 4.2, 6.2));
  ctx.save(); ctx.translate(-leave * 1400, 0);
  drawEntrance(ctx, T, 1);
  ctx.fillStyle = 'rgba(10,24,40,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.6; drawFace(ctx, W / 2, 900, 640, T, { smile: E.inOut(seg(lt, 0.4, 1.6)), look: 0.3 }); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#c9d6df'; ctx.lineWidth = 40; rrect(ctx, 20, 220, W - 40, 1500, 80); ctx.stroke();
  ctx.fillStyle = '#d8dee6'; ctx.fillRect(-60, 1720, W + 120, 400);
  ctx.fillStyle = '#5ab8ff'; ctx.fillRect(-60, 1760, W + 120, 30);
  ctx.restore();
  if (leave > 0) { drawStation(ctx, T, 0); ctx.save(); ctx.globalAlpha = 1; ctx.translate(W - leave * 1400 + 40, 0); ctx.restore(); }
  const a = seg(lt, D - 2.8, D - 2.1);
  hudLabel(ctx, W / 2, 1500, 'АЛДАГДСАН ЦАГ', { size: 70, weight: 900, color: '#ffffff', align: 'center', ls: 4, alpha: a, glow: 'rgba(0,0,0,0.8)' });
  hudLabel(ctx, W / 2, 1610, 'ЭРГЭЭД ИРНЭ', { size: 90, weight: 900, color: '#3ad4ff', align: 'center', ls: 4, alpha: a, glow: 'rgba(58,212,255,0.6)', blur: 30 });
}

const SCENES = [
  { id: 'hook', t0: 0, t1: 4.5, fn: shotHook, grade: [0.85, 1.06] },
  { id: 's1', t0: 4.5, t1: 10.5, val: 1, l1: '1 СЕКУНД', l2: 'ХААЛГА НЭЭГДЭХ МӨЧ', fn: shotS1, grade: [1.0, 1.05] },
  { id: 'm1', t0: 10.5, t1: 18.5, val: 60, l1: '60 СЕКУНД · 1 МИНУТ', l2: 'ТҮГЖРЭЛИЙН ХАЙЛАЛТ', fn: shotM1, grade: [1.05, 1.06] },
  { id: 'm10', t0: 18.5, t1: 27.5, val: 600, l1: '600 СЕКУНД · 10 МИНУТ', l2: 'ХОТЫН ХЯЗГААРЫН УУЛЗВАР', fn: shotM10, grade: [1.05, 1.05] },
  { id: 'h24', t0: 27.5, t1: 36.5, val: 86400, l1: '86,400 СЕКУНД · 24 ЦАГ', l2: 'ЭДИЙН ЗАСГИЙН ДЭЛБЭРЭЛТ', fn: shotH24, grade: [1.08, 1.04] },
  { id: 'mo1', t0: 36.5, t1: 45.5, val: 2592000, l1: '2,592,000 СЕКУНД · 1 САР', l2: 'ЦЭВЭР ТЭНГЭР', fn: shotMo1, grade: [1.05, 1.05] },
  { id: 'end', t0: 45.5, t1: 53.5, fn: shotEnd, grade: [1.05, 1.05] },
];
const DURATION = 53.5;
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
  for (let T = 4.5; T < 45.5; T += 1 / 240) {
    const st = timerState(T);
    if (!st || st.alpha < 0.05) { prev = null; continue; }
    if (prev !== null && st.val !== prev) C.ticks.push({ t: +T.toFixed(4), roll: st.rolling });
    prev = st.val;
  }
  C.jam = [0, 4.5]; C.doors = 4.5 + 1.2; C.arrive = 10.5 + 0.1; C.clear = [10.5 + 2.8, 18.5]; C.ride = [18.5, 27.5];
  C.mall = [27.5, 36.5]; C.city = [36.5, 45.5]; C.leave = 45.5 + 4.2; C.endText = 53.5 - 2.8;
  return C;
}

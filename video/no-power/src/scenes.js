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
const BLACKOUT = 3.2;

/* 0:00 hook: the city crackles off */
function shotHook(ctx, lt, T) {
  const L = lightsAt(lt, BLACKOUT);
  ctx.save(); pushCam(ctx, 1.18 - 0.1 * E.sine(seg(lt, 0, 8)), W / 2, 1100);
  squareCity(ctx, T, L, { stars: seg(lt, BLACKOUT + 1, 8) });
  ctx.restore();
  if (lt > BLACKOUT && lt < BLACKOUT + 0.9 && hash(Math.floor(T * 30) + 3) > 0.7) { ctx.fillStyle = 'rgba(200,230,255,0.25)'; ctx.fillRect(0, 0, W, H); }
  const a = seg(lt, 4.6, 5.3);
  hudLabel(ctx, W / 2, 560, 'ХЭРВЭЭ ТОГ ЦАХИЛГААН', { size: 62, weight: 900, color: '#ffffff', align: 'center', ls: 4, alpha: a, glow: 'rgba(0,0,0,0.9)' });
  hudLabel(ctx, W / 2, 660, 'ҮҮРД АЛГА БОЛБОЛ?', { size: 84, weight: 900, color: '#ffd24a', align: 'center', ls: 4, alpha: seg(lt, 5.0, 5.7), glow: 'rgba(255,180,40,0.6)' });
}

/* 0:08 one second: phone dies, antennas off, crashes */
function shotS1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.34, 0.64]);
  if (s.i === 0) {
    ctx.fillStyle = '#04060b'; ctx.fillRect(0, 0, W, H);
    const off = seg(s.t, 0.9, 1.1);
    drawPhone(ctx, W / 2, 1100, 1060, (c, w, h) => {
      const u = w / 100;
      if (off >= 1) { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); return; }
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2a3a8a'); g.addColorStop(1, '#0a0f2a');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      hudLabel(c, 50 * u, 40 * u, '18:42', { size: 24 * u, weight: 300, color: '#fff', align: 'center', ls: 0 });
      hudLabel(c, 50 * u, 56 * u, 'Мягмар, 11-р сарын 3', { size: 4.5 * u, weight: 600, color: '#cdd6ff', align: 'center', ls: 0 });
      hudLabel(c, 92 * u, 6 * u, '5G ▮▮▮▮', { size: 4 * u, color: '#fff', align: 'right', ls: 0 });
      if (off > 0) { c.fillStyle = `rgba(255,255,255,${off})`; c.fillRect(0, h * 0.49, w, h * 0.02 * (1 - off) + 2); }
    }, {});
    hudChip(ctx, W / 2, 1750, 'СҮЛЖЭЭ БАЙХГҮЙ', '#ff4d4d', seg(s.t, 1.2, 1.6), 32);
  } else if (s.i === 1) {
    drawAntenna(ctx, T, s.t < 0.6 ? 1 : 0);
    hudChip(ctx, W / 2, 1720, '8 ТЭРБУМ ХҮН · ХОЛБОО ТАСАРЛАА', '#ff4d4d', seg(s.t, 0.8, 1.2), 30);
  } else {
    drawCrash(ctx, T, E.inOut(seg(s.t, 0.2, 1.4)));
    for (const [x, y] of [[300, 700], [780, 1220]]) { ctx.fillStyle = '#111'; rrect(ctx, x - 20, y - 60, 40, 110, 8); ctx.fill(); for (let k = 0; k < 3; k++) { ctx.fillStyle = '#262626'; ellipse(ctx, x, y - 40 + k * 32, 11, 11); ctx.fill(); } }
  }
}

/* 0:17 one hour: elevators stuck, taps run dry */
function shotH1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.5]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.02 + 0.06 * s.f, W / 2, 900);
    drawElevator(ctx, T);
    ctx.restore();
    hudChip(ctx, W / 2, 1720, 'ЦАХИЛГААН ШАТАНД ГАЦЛАА', '#ffb020', seg(s.t, 0.5, 1.0), 30);
  } else {
    const flow = s.t < 1.2 ? 1 - seg(s.t, 0.6, 1.2) : s.t < 3.6 ? -0.2 : -1;
    ctx.save(); pushCam(ctx, 1.0 + 0.05 * s.f, 760, 900);
    drawTap(ctx, T, flow);
    ctx.restore();
    hudChip(ctx, W / 2, 1760, 'УС ТАСАРЛАА', '#4cc9ff', seg(s.t, 1.6, 2.1), 34);
  }
}

/* 0:27 24 hours: ICU loses backup power */
function shotD1(ctx, lt, T, D) {
  const power = 1 - seg(lt, 2.0, 2.6);
  ctx.save(); pushCam(ctx, 1.0 + 0.07 * (lt / D), W / 2, 1100);
  drawICU(ctx, lt, T, power);
  ctx.restore();
  if (lt > 2.0 && lt < 2.6) { ctx.fillStyle = `rgba(0,0,0,${0.5 * bell(seg(lt, 2.0, 2.6))})`; ctx.fillRect(0, 0, W, H); }
  hudChip(ctx, W / 2, 1720, 'НӨӨЦ ГЕНЕРАТОРЫН ТҮЛШ ДУУСЛАА', '#ff4d4d', seg(lt, 2.6, 3.1), 28);
}

/* 0:37 day 3: freezers thaw, looting */
function shotD3(ctx, lt, T, D) {
  const s = shot(lt, D, [0.5]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.0 + 0.06 * s.f, W / 2, 1000);
    drawFreezers(ctx, T, E.inOut(seg(s.t, 0.2, s.d - 0.3)));
    ctx.restore();
    hudChip(ctx, W / 2, 1780, 'ХӨРГӨГЧ ГЭСЛЭЭ', '#9adf6a', seg(s.t, 0.6, 1.1), 32);
  } else {
    drawBrokenDoor(ctx, T);
    hudChip(ctx, W / 2, 1780, 'ХҮНСНИЙ ТӨЛӨӨ ҮЙМЭЭН', '#ff4d4d', seg(s.t, 0.5, 1.0), 32);
  }
}

/* 0:47 day 7: cold towers, exodus, the stove */
function shotD7(ctx, lt, T, D) {
  const s = shot(lt, D, [0.3, 0.64]);
  if (s.i === 0) {
    drawTower(ctx, T, 1);
    ctx.fillStyle = 'rgba(20,16,14,0.55)';
    for (let i = 0; i < 9; i++) { const x = 320 + hash(i) * 440, y = 500 + hash(i + 3) * 700; ctx.beginPath(); ctx.ellipse(x, y, 30, 120 + hash(i + 5) * 80, 0, 0, TAU); ctx.fill(); }
    hudChip(ctx, W / 2, 1760, 'ХҮЙТЭН БЕТОН ШОРОН', '#9aa4b2', seg(s.t, 0.4, 0.9), 32);
  } else if (s.i === 1) {
    ctx.save(); pushCam(ctx, 1.06 - 0.05 * s.f, W / 2, 1000);
    drawExodus(ctx, T, { cars: false });
    ctx.restore();
  } else {
    ctx.save(); pushCam(ctx, 1.08 - 0.06 * s.f, W / 2, 1300);
    drawStove(ctx, T);
    ctx.restore();
    hudChip(ctx, W / 2, 1830, 'ГАЛ · ХУДАГ · ГЭР', '#ffb45a', seg(s.t, 0.5, 1.0), 32);
  }
}

/* 0:58 one month: stars over the palace, people around a fire */
function shotM1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.45]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.0 + 0.06 * s.f, W / 2, 1000);
    const m = MOODS.night;
    drawSky(ctx, 1260, m, T, { stars: 1 });
    milkyWay(ctx, T);
    drawPalace(ctx, W / 2, 1270, 900, { night: 1, t: T });
    drawPlaza(ctx, 1270, { night: 1 });
    ctx.restore();
  } else {
    const m = MOODS.night;
    drawSky(ctx, 1500, m, T, { stars: 1 });
    milkyWay(ctx, T);
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 1500, W, H);
    ctx.fillStyle = '#0a0e18'; ctx.beginPath(); ctx.moveTo(0, 1500); ctx.quadraticCurveTo(300, 1400, 600, 1470); ctx.quadraticCurveTo(850, 1420, W, 1480); ctx.lineTo(W, 1510); ctx.lineTo(0, 1510); ctx.closePath(); ctx.fill();
    drawCampfire(ctx, T);
    const a = seg(s.t, s.d - 4.2, s.d - 3.4);
    hudLabel(ctx, W / 2, 700, 'СОЁЛ ИРГЭНШИЛ', { size: 64, weight: 800, color: '#e5e7eb', align: 'center', ls: 6, alpha: a, glow: 'rgba(0,0,0,0.8)' });
    hudLabel(ctx, W / 2, 810, 'ЭМЗЭГ СИСТЕМ', { size: 104, weight: 900, color: '#ffd24a', align: 'center', ls: 4, alpha: a, glow: 'rgba(255,170,40,0.5)', blur: 30 });
  }
}
function milkyWay(ctx, t) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 40; i++) {
    const q = i / 40, x = lerp(-100, W + 100, q), y = lerp(200, 1100, q) + Math.sin(q * 6) * 60;
    spr(ctx, softSprite(i % 3 ? '#8aa0ff' : '#d8c8ff'), x, y, 160 + hash(i) * 120, 0.08);
  }
  const r = rng(77);
  for (let i = 0; i < 500; i++) {
    const q = r(), x = lerp(-100, W + 100, q) + (r() - 0.5) * 300, y = lerp(200, 1100, q) + (r() - 0.5) * 260;
    ctx.fillStyle = `rgba(240,240,255,${0.3 + 0.6 * r() * (0.7 + 0.3 * Math.sin(t * 2 + i))})`;
    ctx.fillRect(x, y, r() < 0.1 ? 3 : 1.5, r() < 0.1 ? 3 : 1.5);
  }
  ctx.restore();
}

/* ---------- timeline (fixed, from the brief) ---------- */
const SCENES = [
  { id: 'hook', t0: 0, t1: 8, fn: shotHook, grade: [1.1, 1.05] },
  { id: 's1', t0: 8, t1: 17, val: 1, l1: '1 СЕКУНД', l2: 'СҮЛЖЭЭНИЙ ТЭГ ЗОГСОЛТ', fn: shotS1, grade: [1.0, 1.08] },
  { id: 'h1', t0: 17, t1: 27, val: 3600, l1: '3,600 СЕКУНД · 1 ЦАГ', l2: 'ДЭД БҮТЦИЙН ТҮГЖРЭЛ', fn: shotH1, grade: [0.9, 1.08] },
  { id: 'd1', t0: 27, t1: 37, val: 86400, l1: '86,400 СЕКУНД · 24 ЦАГ', l2: 'АМЬ НАСНЫ ЭМЗЭГ БАЙДАЛ', fn: shotD1, grade: [0.85, 1.1] },
  { id: 'd3', t0: 37, t1: 47, val: 259200, l1: '259,200 СЕКУНД · 3 ДАХЬ ӨДӨР', l2: 'ХҮНСНИЙ ЗОГСОЛТ', fn: shotD3, grade: [0.8, 1.12] },
  { id: 'd7', t0: 47, t1: 58, val: 604800, l1: '604,800 СЕКУНД · 7 ДАХЬ ӨДӨР', l2: 'ИРГЭНШЛИЙН ШИЛЖИЛТ', fn: shotD7, grade: [0.95, 1.08] },
  { id: 'm1', t0: 58, t1: 70, val: 2592000, l1: '1 САР', l2: 'ШИНЭ ЭХЛЭЛ', fn: shotM1, grade: [1.05, 1.08] },
];
const DURATION = 70;
const ROLL = 0.7;
(function attachVoice() {
  const lines = (window.VOICE && window.VOICE.lines) || [];
  SCENES.forEach((s, i) => { const v = lines[i]; s.vfile = v ? v.file : null; s.vstart = v ? v.start : null; s.flash = i > 0; });
})();
function sceneIndex(T) { for (let i = SCENES.length - 1; i >= 0; i--) if (T >= SCENES[i].t0) return i; return 0; }
function dispValue(i, lt) {
  const S = SCENES[i], nx = SCENES[i + 1];
  if (S.val == null) return null;
  const rate = nx ? Math.min(1, ((nx.val - S.val) * 0.85) / (S.t1 - S.t0)) : 1;
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
  if (S.id === 'm1') { st.alpha *= 1 - seg(lt, 6.5, 7.3); st.l1a *= 1 - seg(lt, 6.5, 7.3); st.l2a *= 1 - seg(lt, 6.5, 7.3); }
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
  if (T > DURATION - 0.9) black = Math.max(black, seg(T, DURATION - 0.9, DURATION - 0.05));
  if (black > 0) { main.fillStyle = `rgba(0,0,0,${black})`; main.fillRect(0, 0, W, H); }
}

function exportCues() {
  const sc = (id) => SCENES.find((x) => x.id === id);
  const C = { duration: DURATION, scenes: SCENES.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 })) };
  C.voice = SCENES.filter((s) => s.vfile).map((s) => ({ file: s.vfile, start: s.vstart }));
  C.flashes = SCENES.filter((s) => s.flash).map((s) => s.t0);
  C.ticks = [];
  let prev = null;
  for (let T = 8; T < 70; T += 1 / 240) {
    const st = timerState(T);
    if (!st || st.alpha < 0.05) { prev = null; continue; }
    if (prev !== null && st.val !== prev) C.ticks.push({ t: +T.toFixed(4), roll: st.rolling });
    prev = st.val;
  }
  C.blackout = BLACKOUT;
  const s1 = sc('s1'), D1 = s1.t1 - s1.t0;
  C.phoneOff = s1.t0 + 0.9;
  C.antennaOff = s1.t0 + 0.34 * D1 + 0.6;
  C.crash = s1.t0 + 0.64 * D1 + 0.9;
  C.elevator = [sc('h1').t0, sc('h1').t0 + 5];
  C.tap = [sc('h1').t0 + 5, sc('h1').t1];
  C.icuOff = sc('d1').t0 + 2.0;
  C.icu = [sc('d1').t0, sc('d1').t1];
  C.loot = [sc('d3').t0 + 5, sc('d3').t1];
  C.drips = [sc('d3').t0, sc('d3').t0 + 5];
  C.fire = [sc('d7').t0 + 0.64 * 11, 70];
  C.exodus = [sc('d7').t0 + 0.3 * 11, sc('d7').t0 + 0.64 * 11];
  C.endText = 70 - 4.2;
  return C;
}

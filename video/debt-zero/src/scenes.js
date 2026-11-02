'use strict';
/* Timeline (driven by the voice-over durations), shots, compositor, audio cue sheet. */

const BUF = {};
function bufInit() {
  if (BUF.scene) return;
  BUF.scene = makeCanvas();
  BUF.small = makeCanvas(W / 4, H / 4);
  const v = makeCanvas(), x = v.getContext('2d');
  let g = x.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  BUF.vignette = v;
  const s = makeCanvas(), y = s.getContext('2d');
  g = y.createLinearGradient(0, 0, 0, 560);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  y.fillStyle = g; y.fillRect(0, 0, W, 560);
  BUF.scrim = s;
}
function resetCtx(c) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.shadowBlur = 0; c.shadowColor = 'transparent'; c.letterSpacing = '0px'; c.setLineDash([]);
}
/* which sub-shot is active: cuts are fractions of the scene */
function shot(lt, D, cuts) {
  const b = [0, ...cuts.map((c) => c * D), D];
  for (let i = 0; i < b.length - 1; i++) if (lt < b[i + 1] || i === b.length - 2) return { i, t: lt - b[i], d: b[i + 1] - b[i], f: (lt - b[i]) / (b[i + 1] - b[i]) };
}
function pushCam(ctx, z, fx = W / 2, fy = H / 2) { ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy); }
/* render a scene function blurred into the background (cheap depth of field) */
function blurred(ctx, fn) {
  const sc = BUF.small.getContext('2d'); resetCtx(sc);
  sc.setTransform(0.25, 0, 0, 0.25, 0, 0);
  fn(sc);
  resetCtx(sc);
  ctx.drawImage(BUF.small, 0, 0, W, H);
}

/* ---------- reusable wide: square + palace ---------- */
function squareWide(ctx, t, o = {}) {
  const hy = o.hy || 1080;
  const m = o.mood || MOODS.day;
  drawSky(ctx, hy, m, t, { sun: o.sun, clouds: o.clouds, stars: o.stars, cloudColor: o.cloudColor });
  drawSkyline(ctx, hy, m, { seed: 2, tall: 260, lit: o.lit || 0 });
  drawPalace(ctx, W / 2, hy + 10, o.pw || 1000, { board: o.board, boardColor: o.boardColor, glitch: o.glitch, t, night: o.night, gray: o.gray, windows: o.windows });
  drawPlaza(ctx, hy + 10, { night: o.night, gray: o.gray });
  if (o.statue !== false) drawSukhbaatar(ctx, W / 2, hy + 300, 300, css(mixc('#3c2f22', '#04060b', o.night || 0)), css(mixc('#8b8f92', '#0a0e16', o.night || 0)));
  if (o.crowd) drawCrowd(ctx, t, { hy: hy + 10, mode: o.crowd, density: o.density, y0: hy + 60, hFar: 40, hNear: o.hNear || 300, night: o.night, tint: o.tint });
}

/* ---------- 01 SEC: debt wiped ---------- */
function shotS1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.36, 0.7]);
  if (s.i === 0) {
    const wipe = s.t > 3.2;
    const debt = 315e12 + (s.t * 1.7e9);
    const board = wipe ? '$0' : 'ДЭЛХИЙН ӨР $' + fmtNum(debt);
    ctx.save(); pushCam(ctx, 1 + 0.08 * E.sine(s.f), W / 2, 900);
    squareWide(ctx, T, { sun: [860, 560, 50], board, boardColor: wipe ? '#3dff8f' : '#ff4d4d', glitch: bell(seg(s.t, 2.8, 3.6)) * 1.5, crowd: 'phone', density: 0.75, hNear: 260 });
    ctx.restore();
    if (s.t > 2.8 && s.t < 3.6) { ctx.fillStyle = `rgba(120,255,200,${0.25 * bell(seg(s.t, 2.8, 3.6))})`; ctx.fillRect(0, 0, W, H); }
  } else if (s.i === 1) {
    blurred(ctx, (c) => squareWide(c, T, { sun: [860, 560, 50], board: '$0', boardColor: '#3dff8f', crowd: 'phone', density: 0.5 }));
    const p = seg(s.t, 1.6, 2.3);
    drawPhone(ctx, W / 2, 1120 + Math.sin(s.t * 1.3) * 8, 1080, appLoan({ amount: 48500000, kind: 'ИПОТЕКИЙН ЗЭЭЛ', p, glitch: bell(seg(s.t, 1.3, 2.4)), t: T }), { rot: -0.04 });
  } else {
    blurred(ctx, (c) => squareWide(c, T, { sun: [860, 560, 50], board: '$0', boardColor: '#3dff8f', crowd: 'phone', density: 0.5 }));
    const L = [['АВТО ЛИЗИНГ', 35000000, 'Үлдсэн: 3 жил'], ['ЦАЛИНГИЙН ЗЭЭЛ', 8200000, 'Үлдсэн: 18 сар'], ['КРЕДИТ КАРТ', 2300000, 'Хүү: 2.8%']];
    L.forEach(([kind, amount, sub], i) => {
      const p = seg(s.t, 0.8 + i * 0.7, 1.3 + i * 0.7);
      drawPhone(ctx, 190 + i * 350, 1180 + (i === 1 ? -60 : 40), 640, appLoan({ amount, kind, sub, p, glitch: bell(seg(s.t, 0.6 + i * 0.7, 1.5 + i * 0.7)), t: T + i }), { rot: (i - 1) * 0.08, skin: ['#c48a62', '#a87050', '#d29a72'][i] });
    });
  }
}

/* ---------- 10 SEC: celebration, then the calm before the storm ---------- */
function shotS10(ctx, lt, T, D) {
  const s = shot(lt, D, [0.45, 0.74]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.25 + 0.08 * s.f, W / 2, 1300);
    squareWide(ctx, T, { sun: [860, 560, 50], board: '$0', boardColor: '#3dff8f', crowd: 'cheer', density: 1, hNear: 420 });
    ctx.restore();
  } else if (s.i === 1) {
    squareWide(ctx, T, { sun: [860, 560, 50], board: '$0', boardColor: '#3dff8f', crowd: 'cheer', density: 0.8 });
    const a = seg(s.t, 0.2, 0.8), ev = seg(s.t, 1.6, s.d - 0.3);
    ctx.save();
    ctx.globalAlpha = a * (1 - ev);
    hudLabel(ctx, W / 2, 640, '$315', { size: 230, weight: 900, color: '#ffffff', align: 'center', ls: 0, glow: 'rgba(0,0,0,0.5)', blur: 30 });
    hudLabel(ctx, W / 2, 790, 'ИХ НАЯД', { size: 96, weight: 900, color: '#ffe08a', align: 'center', ls: 10, glow: 'rgba(0,0,0,0.5)', blur: 30 });
    hudLabel(ctx, W / 2, 870, 'дэлхийн нийт өр', { size: 40, weight: 700, color: '#ffffff', align: 'center', ls: 2, glow: 'rgba(0,0,0,0.6)' });
    ctx.restore();
    if (ev > 0) {
      for (let i = 0; i < 260; i++) {
        const q = ev * 1.5 - hash(i) * 0.5;
        if (q <= 0 || q > 1) continue;
        const x = W / 2 + (hash(i + 1) - 0.5) * 760 + (hash(i + 2) - 0.5) * 300 * q;
        const y = 560 + hash(i + 3) * 340 - q * 520;
        ctx.fillStyle = `rgba(255,236,170,${(1 - q) * 0.9})`;
        ctx.fillRect(x, y, 8, 8);
      }
    }
  } else {
    const k = E.inOut(seg(s.t, 0, s.d * 0.8));
    ctx.save(); pushCam(ctx, 1 + 0.05 * s.f, W / 2, 1000);
    squareWide(ctx, T, { mood: moodMix('day', 'storm', k), clouds: k, cloudColor: '#2a2e36', board: '$0', boardColor: '#3dff8f', gray: k, crowd: 'idle', density: 0.8, tint: ['#30343c', k * 0.4] });
    ctx.restore();
  }
}

/* ---------- 60 SEC: banks collapse ---------- */
function shotS60(ctx, lt, T, D) {
  const s = shot(lt, D, [0.33, 0.76]);
  if (s.i === 0) {
    // colonnade close-up with officials running
    const m = MOODS.gray;
    ctx.fillStyle = '#3c4650'; ctx.fillRect(0, 0, W, H);
    for (let i = -1; i < 6; i++) {
      const x = i * 230 + 60 - s.t * 30;
      const g = ctx.createLinearGradient(x, 0, x + 120, 0);
      g.addColorStop(0, '#7f878d'); g.addColorStop(0.5, '#c9cdd0'); g.addColorStop(1, '#8a9196');
      ctx.fillStyle = g; ctx.fillRect(x, 0, 120, 1640);
    }
    ctx.fillStyle = '#a9aeb2'; ctx.fillRect(0, 1640, W, 40);
    ctx.fillStyle = '#8d9296'; ctx.fillRect(0, 1680, W, H);
    for (let k = 0; k < 6; k++) {
      const st = k * 0.55, sp = 520 + hash(k) * 200;
      const x = ((s.t - st) * sp) % (W + 400) - 200;
      if (s.t < st) continue;
      runner(ctx, x, 1680 + (k % 2) * 60, 360 + (k % 3) * 40, s.t * 11 + k, ['#1f2329', '#2b3240', '#30261f'][k % 3]);
    }
    hudChip(ctx, W / 2, 1820, 'ТӨРИЙН ОРДОН', '#cbd5e1', seg(s.t, 0.3, 0.8), 28);
  } else if (s.i === 1) {
    drawBalance(ctx, T, seg(s.t, 0.2, s.d - 0.2));
  } else {
    // bank facade with guards and alarm light
    const m = MOODS.gray;
    drawSky(ctx, 800, m, T, { clouds: 0.5, cloudColor: '#4a4f58' });
    ctx.fillStyle = '#6b6e73'; ctx.fillRect(0, 700, W, 900);
    ctx.fillStyle = '#5d6065'; for (let i = 0; i < 12; i++) ctx.fillRect(i * 95 + 10, 760, 50, 70);
    ctx.fillStyle = '#b8b2a6'; ctx.fillRect(80, 420, 920, 1180);
    ctx.fillStyle = '#9a9488'; for (let i = 0; i < 6; i++) ctx.fillRect(120 + i * 150, 640, 70, 820);
    ctx.fillStyle = '#7c766a'; ctx.fillRect(80, 420, 920, 150);
    hudLabel(ctx, W / 2, 495, 'БАНК', { size: 110, weight: 900, color: '#f5f0e6', align: 'center', ls: 30 });
    ctx.fillStyle = '#1d2228'; ctx.fillRect(400, 1080, 280, 520);
    ctx.fillStyle = 'rgba(160,190,210,0.25)'; ctx.fillRect(410, 1090, 125, 500); ctx.fillRect(545, 1090, 125, 500);
    ctx.fillStyle = '#6f6a62'; ctx.fillRect(0, 1600, W, H);
    for (let k = 0; k < 4; k++) {
      const x = 540 + Math.sin(s.t * 1.4 + k * 1.7) * 380, dir = Math.cos(s.t * 1.4 + k * 1.7);
      mini(ctx, x, 1660 + k * 60, 300 + k * 20, { c: '#1e2a44', hat: '#0f1626', aL: 0.3 + 0.3 * Math.sin(s.t * 8 + k), aR: 0.3 - 0.3 * Math.sin(s.t * 8 + k), walk: s.t * 8 + k });
    }
    const a = 0.5 + 0.5 * Math.sin(s.t * 9);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    spr(ctx, softSprite('#ff2020'), 900, 380, 600, 0.45 * a); spr(ctx, softSprite('#ff2020'), 180, 380, 600, 0.45 * (1 - a));
    ctx.restore(); ctx.globalAlpha = 1;
    hudChip(ctx, W / 2, 1830, 'ТЕХНИКИЙН ДАМПУУРАЛ', '#ef4444', seg(s.t, 0.4, 0.9), 32);
  }
}

/* ---------- 1 HOUR: accounts frozen ---------- */
function shotH1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.38, 0.66]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.05 + 0.06 * s.f, W / 2, 1200);
    drawSky(ctx, 760, MOODS.morning, T, { sun: [200, 520, 60], sunColor: '#ffe0b0' });
    drawSkyline(ctx, 760, MOODS.morning, { seed: 7, tall: 200 });
    drawGerDistrict(ctx, T, {});
    for (let i = 0; i < 7; i++) {
      const q = clamp(s.t * 0.18 - i * 0.08);
      if (q <= 0) continue;
      const x = 120 + i * 150 + Math.sin(i * 3) * 40, y = 1500 + i % 3 * 120 + q * 220;
      mini(ctx, x, y, 260 + (i % 3) * 30, { c: DEELS[i % 6], deel: true, hat: i % 2 ? '#2a2a2a' : null, aL: 0.25, aR: 0.25 + (i % 2) * 0.5, walk: s.t * 5 + i });
    }
    ctx.restore();
  } else if (s.i === 1) {
    ctx.fillStyle = '#3a2a20'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 1100, 0, H); g.addColorStop(0, '#8a6a4a'); g.addColorStop(1, '#5a4030');
    ctx.fillStyle = g; ctx.fillRect(0, 1100, W, H - 1100);
    blurredShelfGlow(ctx);
    const state = s.t < 0.9 ? 0 : s.t < 2.3 ? 1 : 2;
    drawTerminal(ctx, W / 2 - 60, 1180, 760, state, T);
    const tap = E.inOut(seg(s.t, 0.4, 0.9));
    drawCard(ctx, lerp(W + 200, W / 2 + 170, tap), lerp(1500, 900, tap), 420, lerp(0.6, 0.15, tap));
  } else {
    blurred(ctx, (c) => { drawSky(c, 760, MOODS.morning, T, {}); drawGerDistrict(c, T, {}); });
    drawPhone(ctx, W / 2, 1140, 1100, appLocked({ p: seg(s.t, 0.3, s.d - 0.6) }));
  }
}
function blurredShelfGlow(ctx) {
  for (let i = 0; i < 18; i++) spr(ctx, softSprite(['#ffcc66', '#ff8a5a', '#9ad1ff'][i % 3]), hash(i) * W, 200 + hash(i + 3) * 700, 80 + hash(i + 5) * 120, 0.25);
  ctx.globalAlpha = 1;
}

/* ---------- 8 HOURS: ATMs dead, cash only ---------- */
function shotH8(ctx, lt, T, D) {
  const s = shot(lt, D, [0.5]);
  if (s.i === 0) {
    const m = MOODS.dusk;
    drawSky(ctx, 560, m, T, {});
    drawATMs(ctx, T, { y: 640, off: seg(s.t, 1.2, s.d - 0.8), empty: s.t > 0.6 });
    ctx.fillStyle = '#3a3438'; ctx.fillRect(0, 1020, W, H);
    // queue in perspective
    for (let i = 14; i >= 0; i--) {
      const z = i / 14, y = lerp(1900, 1060, Math.pow(z, 0.7)), h = lerp(420, 110, Math.pow(z, 0.7));
      const x = lerp(560, 300 + (i % 2) * 40, z) + Math.sin(i * 1.7) * 30 * (1 - z);
      const angry = s.f > 0.6 && i % 3 === 0;
      mini(ctx, x + (i % 2 ? 90 : -90) * (1 - z), y, h, { c: COATS[i % 12], hat: i % 4 ? null : '#333', aL: angry ? 2.6 + 0.3 * Math.sin(T * 8 + i) : 0.15, aR: 0.15, night: 1 });
    }
  } else {
    // store window with CASH ONLY sign, angry people
    ctx.fillStyle = '#1b1d22'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0e2030'; ctx.fillRect(90, 420, 900, 760);
    blurredShelfGlow(ctx);
    rrect(ctx, 170, 560, 740, 300, 20); ctx.fillStyle = '#fbbf24'; ctx.fill();
    hudLabel(ctx, W / 2, 660, 'ЗӨВХӨН', { size: 90, weight: 900, color: '#111', align: 'center', ls: 8 });
    hudLabel(ctx, W / 2, 770, 'БЭЛЭН МӨНГӨ', { size: 90, weight: 900, color: '#b91c1c', align: 'center', ls: 4 });
    hudLabel(ctx, W / 2, 1000, 'Карт уншихгүй байна', { size: 42, weight: 700, color: '#ff6b6b', align: 'center', ls: 1, alpha: 0.6 + 0.4 * Math.sin(T * 6) });
    ctx.fillStyle = '#2a2c30'; ctx.fillRect(0, 1180, W, H);
    drawCrowd(ctx, T, { hy: 1180, mode: 'angry', density: 0.55, y0: 1360, y1: H + 260, hFar: 220, hNear: 560, spreadFar: 560, spreadNear: 900, night: 1 });
  }
}

/* ---------- DAY 1: shelves empty, work stops ---------- */
function shotD1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.4, 0.68]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1 + 0.06 * s.f, W / 2, 900);
    drawAisle(ctx, T, E.in2(seg(s.t, 0.8, s.d * 0.78)), { flicker: seg(s.t, 2, s.d), shutter: E.inOut(seg(s.t, s.d * 0.8, s.d - 0.15)) });
    ctx.restore();
  } else if (s.i === 1) {
    ctx.save(); pushCam(ctx, 1.04 - 0.04 * s.f, W / 2, 1100);
    drawConstruction(ctx, T);
    ctx.restore();
    hudChip(ctx, W / 2, 1780, 'ЦАЛИН ТАВЬЖ ЧАДАХГҮЙ', '#f59e0b', seg(s.t, 0.5, 1.0), 32);
  } else {
    drawChain(ctx, T, seg(s.t, 0.3, s.d - 0.3));
  }
}

/* ---------- DAY 3: unrest, empty treasury, hyperinflation ---------- */
function shotD3(ctx, lt, T, D) {
  const s = shot(lt, D, [0.4, 0.7]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.12 + 0.05 * s.f, W / 2, 1150);
    const m = MOODS.storm;
    drawSky(ctx, 1000, m, T, { clouds: 0.8, cloudColor: '#22252c' });
    drawSkyline(ctx, 1000, m, { seed: 2, tall: 260 });
    drawPalace(ctx, W / 2, 1010, 1000, { gray: 1, t: T, board: 'ТӨГРӨГ ↓ 99%', boardColor: '#ff3b3b', glitch: 0.3 });
    drawPlaza(ctx, 1010, { gray: 1 });
    drawPolice(ctx, T, 1150, 190);
    drawCrowd(ctx, T, { hy: 1010, mode: 'riot', density: 0.9, y0: 1260, y1: H + 200, hFar: 160, hNear: 480, spreadFar: 560, spreadNear: 900 });
    ctx.restore();
    flashLights(ctx, T, 1);
    drawBills(ctx, T, 0.5, { y0: 560, h: 1300 });
  } else if (s.i === 1) {
    ctx.fillStyle = '#2b2320'; ctx.fillRect(0, 0, W, H);
    drawBills(ctx, T, 1, { y0: 520, h: 1400 });
    drawPriceTag(ctx, T, seg(s.t, 0.4, s.d - 0.4));
    hudChip(ctx, W / 2, 1640, 'ГИПЕРИНФЛЯЦИ', '#ef4444', seg(s.t, 0.8, 1.3), 40);
  } else {
    drawTreasury(ctx, T, seg(s.t, 0.2, s.d - 0.3));
  }
}

/* ---------- DAY 7: back to physical wealth ---------- */
function shotD7(ctx, lt, T, D) {
  const s = shot(lt, D, [0.32, 0.64]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1 + 0.05 * s.f, W / 2, 900);
    drawTower(ctx, T, E.inOut(seg(s.t, 0.6, s.d - 0.4)));
    ctx.restore();
  } else if (s.i === 1) {
    ctx.save(); pushCam(ctx, 1.06 - 0.06 * s.f, W / 2, 1000);
    drawExodus(ctx, T);
    ctx.restore();
  } else {
    drawBarter(ctx, T, seg(s.t, 0.2, s.d) * 0.999);
  }
}

/* ---------- END: trust erased ---------- */
function shotEnd(ctx, lt, T, D) {
  const s = shot(lt, D, [0.42]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.12 - 0.1 * s.f, W / 2, 1000);
    squareWide(ctx, T, { mood: MOODS.night, night: 1, stars: 1, board: '', boardColor: '#000', crowd: false, statue: true });
    ctx.restore();
  } else {
    ctx.save(); pushCam(ctx, 1.08 - 0.06 * s.f, W / 2, 1100);
    drawSky(ctx, 760, MOODS.night, T, { stars: 1 });
    drawGerDistrict(ctx, T, { night: 0.92, glow: E.out(seg(s.t, 0.3, 4.5)), smoke: 0.5, ground: '#4a4a52' });
    ctx.restore();
    const a = E.out(seg(s.t, s.d - 7.5, s.d - 6.3));
    if (a > 0) {
      ctx.fillStyle = `rgba(2,4,10,${0.55 * a})`; ctx.fillRect(0, 0, W, H);
      hudLabel(ctx, W / 2, 820 + (1 - a) * 30, 'ӨР БОЛ', { size: 64, weight: 800, color: '#e5e7eb', align: 'center', ls: 10, alpha: a });
      hudLabel(ctx, W / 2, 940 + (1 - a) * 30, 'ИТГЭЛЦЛИЙН', { size: 108, weight: 900, color: '#fbbf24', align: 'center', ls: 2, alpha: a, glow: 'rgba(251,191,36,0.4)', blur: 30 });
      hudLabel(ctx, W / 2, 1060 + (1 - a) * 30, 'ХЭЛХЭЭ', { size: 108, weight: 900, color: '#fbbf24', align: 'center', ls: 2, alpha: a, glow: 'rgba(251,191,36,0.4)', blur: 30 });
    }
  }
}

/* ---------- timeline ---------- */
const SCENES = [
  { id: 's1', val: 1, l1: '1 СЕКУНД', l2: 'ӨР АРЧИГДЛАА', fn: shotS1, grade: [1.08, 1.02] },
  { id: 's10', val: 10, l1: '10 СЕКУНД', l2: 'ГАЙХАМШИГ УУ?', fn: shotS10, grade: [1.05, 1.03] },
  { id: 's60', val: 60, l1: '60 СЕКУНД · 1 МИНУТ', l2: 'БАНКНЫ ДАМПУУРАЛ', fn: shotS60, grade: [0.92, 1.06] },
  { id: 'h1', val: 3600, l1: '3,600 СЕКУНД · 1 ЦАГ', l2: 'ДАНС ТҮГЖИГДЭВ', fn: shotH1, grade: [0.92, 1.05] },
  { id: 'h8', val: 28800, l1: '28,800 СЕКУНД · 8 ЦАГ', l2: 'БЭЛЭН МӨНГӨНИЙ ХОМСДОЛ', fn: shotH8, grade: [0.88, 1.1] },
  { id: 'd1', val: 86400, l1: '86,400 СЕКУНД · 1 ДЭХ ӨДӨР', l2: 'ҮЙЛДВЭРЛЭЛ ГАЦЛАА', fn: shotD1, grade: [0.82, 1.08] },
  { id: 'd3', val: 259200, l1: '259,200 СЕКУНД · 3 ДАХЬ ӨДӨР', l2: 'ТӨРИЙН САН ХООСОРЛОО', fn: shotD3, grade: [0.78, 1.16] },
  { id: 'd7', val: 604800, l1: '604,800 СЕКУНД · 7 ДАХЬ ӨДӨР', l2: 'БИЕТ ХӨРӨНГИЙН ЭРИН', fn: shotD7, grade: [0.9, 1.08] },
  { id: 'end', l2: 'ТӨГСГӨЛ', fn: shotEnd, grade: [0.9, 1.05] },
];
let DURATION = 0;
const ROLL = 0.7;
(function buildTimeline() {
  const lines = (window.VOICE && window.VOICE.lines) || [];
  let t = 0;
  SCENES.forEach((s, i) => {
    const v = lines[i];
    const lead = i === 0 ? 1.4 : 0.9, tail = i === SCENES.length - 1 ? 3.4 : 0.6;
    s.t0 = t; s.vstart = t + lead; s.vfile = v ? v.file : null;
    s.t1 = t + lead + (v ? v.dur : 15) + tail;
    s.flash = i > 0;
    t = s.t1;
  });
  DURATION = Math.round(t * 30) / 30;
})();

function sceneIndex(T) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (T >= SCENES[i].t0) return i;
  return 0;
}
function dispValue(i, lt) {
  const S = SCENES[i], nx = SCENES[i + 1];
  if (S.val == null) return null;
  const D = S.t1 - S.t0;
  const rate = nx && nx.val ? Math.min(1, ((nx.val - S.val) * 0.85) / D) : 1;
  return S.val + Math.floor(Math.max(0, lt - (i === 0 ? 0.6 : ROLL)) * rate);
}
function timerState(T) {
  const i = sceneIndex(T), S = SCENES[i], lt = T - S.t0;
  const st = { alpha: 1, color: '#ffffff', l1: S.l1, l2: S.l2, rolling: false };
  if (S.val == null) {
    st.val = null; st.alpha = 0; st.l2a = seg(lt, 0.3, 1.0) * (1 - seg(lt, 5, 6)); st.l1a = 0;
    return st;
  }
  if (i === 0) { st.val = dispValue(0, lt); st.alpha = seg(lt, 0.2, 0.6); st.l1a = seg(lt, 0.6, 1.0); st.l2a = seg(lt, 0.75, 1.15); }
  else {
    const prev = dispValue(i - 1, SCENES[i - 1].t1 - SCENES[i - 1].t0 - 1e-6);
    if (lt < ROLL) { st.val = Math.floor(Math.exp(lerp(Math.log(prev + 1), Math.log(S.val + 1), E.inOut(lt / ROLL))) - 1); st.rolling = true; }
    else st.val = dispValue(i, lt);
    st.l1a = seg(lt, ROLL - 0.1, ROLL + 0.25); st.l2a = seg(lt, ROLL + 0.05, ROLL + 0.4);
  }
  if (i >= 6) st.color = '#ffd2c2';
  return st;
}
function drawTimerHUD(ctx, T) {
  const st = timerState(T);
  if (!st) return;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24;
  if (st.val != null && st.alpha > 0.01) {
    ctx.globalAlpha = st.alpha;
    ctx.font = '800 128px "JetBrains Mono"';
    ctx.fillStyle = st.color;
    const jit = st.rolling ? (hash(Math.floor(T * 60)) - 0.5) * 6 : 0;
    ctx.fillText(fmtClock(st.val), W / 2 + jit, 250);
    ctx.globalAlpha = st.alpha * (st.l1a || 0);
    ctx.font = '700 36px Inter'; ctx.letterSpacing = '6px'; ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(st.l1, W / 2, 322 + (1 - (st.l1a || 0)) * 16);
  }
  ctx.globalAlpha = st.l2a || 0;
  ctx.font = '800 44px Inter'; ctx.letterSpacing = '7px'; ctx.fillStyle = '#ffcf6e';
  ctx.fillText(st.l2, W / 2, st.val == null ? 250 : 388 + (1 - (st.l2a || 0)) * 16);
  ctx.restore();
}

let MAIN = null;
function renderAt(T) {
  bufInit();
  const main = MAIN;
  const i = sceneIndex(T), S = SCENES[i], lt = T - S.t0, D = S.t1 - S.t0;
  const sc = BUF.scene.getContext('2d');
  resetCtx(sc);
  sc.fillStyle = '#000'; sc.fillRect(0, 0, W, H);
  S.fn(sc, lt, T, D);
  resetCtx(sc);
  resetCtx(main);
  main.fillStyle = '#000'; main.fillRect(0, 0, W, H);
  const punch = S.flash ? 1 + 0.05 * (1 - E.out(seg(lt, 0, 0.45))) : 1;
  main.save();
  pushCam(main, punch);
  main.filter = `saturate(${S.grade[0]}) contrast(${S.grade[1]})`;
  main.drawImage(BUF.scene, 0, 0);
  main.restore();
  resetCtx(main);
  main.globalAlpha = 0.85; main.drawImage(BUF.vignette, 0, 0);
  main.globalAlpha = 1; main.drawImage(BUF.scrim, 0, 0);
  drawTimerHUD(main, T); resetCtx(main);
  const gt = grainTiles();
  main.globalCompositeOperation = 'overlay'; main.globalAlpha = 0.07;
  main.drawImage(gt[Math.floor(T * 15) % gt.length], 0, 0, W, H);
  resetCtx(main);
  if (S.flash && lt < 0.3) { main.fillStyle = `rgba(255,250,240,${0.45 * (1 - E.out(lt / 0.3))})`; main.fillRect(0, 0, W, H); }
  let black = 0;
  if (T < 0.5) black = 1 - T / 0.5;
  if (T > DURATION - 1.2) black = Math.max(black, seg(T, DURATION - 1.2, DURATION - 0.05));
  if (black > 0) { main.fillStyle = `rgba(0,0,0,${black})`; main.fillRect(0, 0, W, H); }
}

/* ---------- audio cue sheet ---------- */
function exportCues() {
  const at = (id, frac) => { const s = SCENES.find((x) => x.id === id); return s.t0 + frac * (s.t1 - s.t0); };
  const sc = (id) => SCENES.find((x) => x.id === id);
  const C = { duration: DURATION, scenes: SCENES.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 })) };
  C.voice = SCENES.filter((s) => s.vfile).map((s) => ({ file: s.vfile, start: +s.vstart.toFixed(3) }));
  C.flashes = SCENES.filter((s) => s.flash).map((s) => s.t0);
  C.ticks = [];
  let prev = null;
  for (let T = 0; T < sc('end').t0; T += 1 / 240) {
    const st = timerState(T);
    if (!st || st.val == null || st.alpha < 0.05) { prev = null; continue; }
    if (prev !== null && st.val !== prev) C.ticks.push({ t: +T.toFixed(4), roll: st.rolling });
    prev = st.val;
  }
  const s1 = sc('s1'), D1 = s1.t1 - s1.t0;
  C.glitches = [s1.t0 + 2.8, s1.t0 + 0.36 * D1 + 1.3, ...[0, 1, 2].map((i) => s1.t0 + 0.7 * D1 + 0.6 + i * 0.7)];
  C.chimes = [s1.t0 + 3.2, s1.t0 + 0.36 * D1 + 1.6, ...[0, 1, 2].map((i) => s1.t0 + 0.7 * D1 + 0.8 + i * 0.7)];
  C.cheer = [sc('s10').t0, at('s10', 0.74)];
  C.storm = [at('s10', 0.74), sc('s10').t1];
  C.alarm = [at('s60', 0.76), sc('s60').t1];
  C.runners = [sc('s60').t0, at('s60', 0.33)];
  const h1 = sc('h1'), Dh = h1.t1 - h1.t0;
  C.terminalError = h1.t0 + 0.38 * Dh + 2.3;
  C.lockError = h1.t0 + 0.66 * Dh + 0.3 + 0.86 * (0.34 * Dh - 0.9);
  const h8 = sc('h8'), D8 = h8.t1 - h8.t0;
  C.atmOff = [0, 1, 2, 3, 4].map((i) => h8.t0 + 1.2 + ((i + 1) / 6) * (0.5 * D8 - 2.0));
  C.angry = [at('h8', 0.5), h8.t1];
  const d1 = sc('d1'), Dd = d1.t1 - d1.t0;
  C.shutter = [d1.t0 + 0.4 * Dd * 0.8, d1.t0 + 0.4 * Dd - 0.15];
  C.riot = [sc('d3').t0, at('d3', 0.4)];
  C.bills = [sc('d3').t0, at('d3', 0.7)];
  C.fire = [at('d7', 0.32), sc('end').t1];
  C.night = [sc('end').t0, sc('end').t1];
  C.endText = sc('end').t1 - 7.5;
  return C;
}

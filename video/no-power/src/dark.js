'use strict';
/* Blackout set pieces: lit city that crackles off, phone, antenna, crash, elevator, tap, ICU, freezers, fire. */

/* lights level with a crackling cut-off at tb */
function lightsAt(t, tb) {
  if (t < tb) return 1;
  const k = t - tb;
  if (k > 0.9) return 0;
  return (hash(Math.floor(t * 30)) > 0.45 ? 1 : 0.1) * (1 - k / 0.9);
}

/* the square at dusk with glass towers, street lights and traffic lights */
function squareCity(ctx, t, L, o = {}) {
  const hy = 1060;
  const m = moodMix('dusk', 'night', o.night == null ? 0.65 : o.night);
  drawSky(ctx, hy, m, t, { stars: (1 - L) * (o.stars || 0.6) });
  // glass towers with lit windows
  const r = rng(12);
  for (let i = 0; i < 9; i++) {
    const x = -60 + i * 135 + r() * 30, w = 90 + r() * 70, h = 300 + r() * 520;
    if (Math.abs(x + w / 2 - W / 2) < 300 && h > 420) continue;
    ctx.fillStyle = css(mixc('#1b2840', '#0a0f1a', 1 - L * 0.6)); ctx.fillRect(x, hy - h, w, h);
    for (let yy = hy - h + 12; yy < hy - 10; yy += 18) for (let xx = x + 8; xx < x + w - 8; xx += 14) {
      if (hash(xx * 3.7 + yy * 1.3) < 0.6 * L) { ctx.fillStyle = hash(xx + yy) < 0.5 ? 'rgba(160,210,255,0.85)' : 'rgba(255,214,150,0.85)'; ctx.fillRect(xx, yy, 8, 10); }
    }
    if (i % 3 === 0 && L > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite(i % 2 ? '#ff2d75' : '#2dd4ff'), x + w / 2, hy - h + 40, 90, 0.7 * L); ctx.restore(); ctx.globalAlpha = 1; }
  }
  drawPalace(ctx, W / 2, hy + 10, 980, { night: 1 - L * 0.55, windows: L * 0.9, t, board: L > 0.3 ? '18:42' : '', boardColor: '#ffb020' });
  if (L > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#ffd08a'), W / 2, hy - 150, 520, 0.35 * L); ctx.restore(); ctx.globalAlpha = 1; }
  drawPlaza(ctx, hy + 10, { night: 1 - L * 0.5 });
  drawSukhbaatar(ctx, W / 2, hy + 300, 300, css(mixc('#3c2f22', '#04060b', 1 - L * 0.5)), css(mixc('#8b8f92', '#0a0e16', 1 - L * 0.5)));
  // street lamps + traffic lights
  for (const [x, y, s] of [[90, 1300, 1], [990, 1300, 1], [40, 1600, 1.4], [1040, 1600, 1.4]]) {
    ctx.strokeStyle = '#1a1d24'; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 260 * s); ctx.stroke();
    if (L > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#ffcf80'), x, y - 260 * s, 120 * s, 0.9 * L); spr(ctx, softSprite('#ffcf80'), x, y, 160 * s, 0.25 * L); ctx.restore(); ctx.globalAlpha = 1; }
  }
  for (const [x, y] of [[230, 1400], [850, 1400]]) {
    ctx.fillStyle = '#111'; rrect(ctx, x - 22, y - 160, 44, 120, 8); ctx.fill();
    ctx.fillRect(x - 4, y - 40, 8, 120);
    const ph = Math.floor(t / 2) % 3;
    ['#ff3030', '#ffb020', '#30ff70'].forEach((c, k) => { ctx.fillStyle = L > 0.02 && k === ph ? c : '#222'; ellipse(ctx, x, y - 140 + k * 38, 13, 13); ctx.fill(); if (L > 0.02 && k === ph) { ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite(c), x, y - 140 + k * 38, 60, 0.7 * L); ctx.restore(); ctx.globalAlpha = 1; } });
  }
  drawCrowd(ctx, t, { hy: hy + 10, mode: L > 0.3 ? 'phone' : 'idle', density: 0.6, y0: hy + 60, hFar: 36, hNear: 240, night: 1, tint: ['#05070c', 0.55 * (1 - L)] });
}

/* lattice antenna tower */
function drawAntenna(ctx, t, L) {
  const m = MOODS.night;
  drawSky(ctx, 1500, m, t, { stars: 0.8 });
  drawSkyline(ctx, 1500, m, { seed: 4, tall: 260, lit: 0 });
  ctx.strokeStyle = '#2a3140'; ctx.lineWidth = 6;
  const top = 380, bx = W / 2;
  ctx.beginPath(); ctx.moveTo(bx - 160, 1500); ctx.lineTo(bx - 14, top); ctx.lineTo(bx + 14, top); ctx.lineTo(bx + 160, 1500); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath();
  for (let y = top + 60; y < 1500; y += 80) { const w0 = lerp(14, 160, (y - top) / (1500 - top)), w1 = lerp(14, 160, (y + 80 - top) / (1500 - top)); ctx.moveTo(bx - w0, y); ctx.lineTo(bx + w1, y + 80); ctx.moveTo(bx + w0, y); ctx.lineTo(bx - w1, y + 80); }
  ctx.stroke();
  for (const [y, s] of [[top + 80, 1], [top + 300, 0.8]]) { ctx.fillStyle = '#3a4050'; ctx.fillRect(bx - 60 * s, y, 26 * s, 90 * s); ctx.fillRect(bx + 34 * s, y, 26 * s, 90 * s); }
  const blink = L * (Math.sin(t * 5) > 0 ? 1 : 0.2);
  for (const y of [top - 10, top + 500, top + 900]) {
    ctx.fillStyle = blink > 0.3 ? '#ff2020' : '#401010'; ellipse(ctx, bx, y, 12, 12); ctx.fill();
    if (blink > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#ff2020'), bx, y, 90, 0.8); ctx.restore(); ctx.globalAlpha = 1; }
  }
  if (L > 0.05) for (let k = 1; k <= 3; k++) {
    const rr = ((t * 260 + k * 120) % 360) + 40;
    ctx.strokeStyle = `rgba(120,200,255,${0.5 * L * (1 - rr / 400)})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(bx, top + 120, rr, -2.4, -0.7); ctx.stroke();
  }
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 1500, W, H);
}

/* intersection seen from above: cars stream, then pile up */
function drawCrash(ctx, t, crash) {
  ctx.fillStyle = '#20232a'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#34373e'; ctx.fillRect(340, 0, 400, H); ctx.fillRect(0, 760, W, 400);
  ctx.strokeStyle = 'rgba(240,220,140,0.5)'; ctx.lineWidth = 6; ctx.setLineDash([40, 40]);
  ctx.beginPath(); ctx.moveTo(540, 0); ctx.lineTo(540, 760); ctx.moveTo(540, 1160); ctx.lineTo(540, H); ctx.moveTo(0, 960); ctx.lineTo(340, 960); ctx.moveTo(740, 960); ctx.lineTo(W, 960); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 8; i++) { ctx.fillRect(350 + i * 48, 700, 30, 50); ctx.fillRect(350 + i * 48, 1170, 30, 50); }
  const cars = [[440, -1, '#c0392b'], [640, 1, '#2c6fbb'], [460, -1, '#e0b030'], [620, 1, '#7a7a80']];
  const k = E.out(crash);
  cars.forEach(([x, dir, c], i) => {
    const run = (t * 300 + i * 500) % 2400 - 400;
    let y = dir > 0 ? run : H - run;
    const stopY = 960 + (i - 1.5) * 70;
    y = lerp(y, stopY, k);
    ctx.save(); ctx.translate(x + (i % 2 ? -30 : 30) * k, y); ctx.rotate(k * (i - 1.5) * 0.5);
    ctx.fillStyle = c; rrect(ctx, -45, -80, 90, 160, 18); ctx.fill();
    ctx.fillStyle = 'rgba(160,200,230,0.6)'; ctx.fillRect(-35, dir > 0 ? 20 : -60, 70, 40);
    ctx.restore();
  });
  for (let i = 0; i < 2; i++) {
    const run = (t * 340 + i * 900) % 2400 - 400;
    const x = lerp(i ? W - run : run, 540 + (i ? 150 : -150), k);
    ctx.save(); ctx.translate(x, i ? 1060 : 860); ctx.rotate(Math.PI / 2 + k * (i ? 0.6 : -0.5));
    ctx.fillStyle = i ? '#2f8f5f' : '#ffffff'; rrect(ctx, -45, -80, 90, 160, 18); ctx.fill();
    ctx.restore();
  }
  if (crash > 0.6) for (let i = 0; i < 14; i++) spr(ctx, softSprite('#9aa0a8'), 540 + Math.sin(i * 2) * 120, 960 - (t * 40 + i * 40) % 300, 70, 0.18);
  ctx.globalAlpha = 1;
}

/* elevator stuck between floors (cross-section) */
function drawElevator(ctx, t) {
  ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#151922'; ctx.fillRect(240, 0, 600, H);
  ctx.strokeStyle = '#2a303c'; ctx.lineWidth = 6;
  for (const y of [520, 1000, 1480]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); hudLabel(ctx, 120, y - 40, (Math.round((1480 - y) / 480) + 11) + '', { size: 40, weight: 800, color: '#3a4250', align: 'center', ls: 0 }); }
  ctx.strokeStyle = '#3a404c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(520, 0); ctx.lineTo(520, 640); ctx.moveTo(560, 0); ctx.lineTo(560, 640); ctx.stroke();
  const cy = 640 + Math.sin(t * 13) * 2;
  rrect(ctx, 290, cy, 500, 620, 10); ctx.fillStyle = '#2a2f38'; ctx.fill();
  ctx.save(); rrect(ctx, 300, cy + 10, 480, 600, 8); ctx.clip();
  ctx.fillStyle = '#12151b'; ctx.fillRect(300, cy + 10, 480, 600);
  for (let i = 0; i < 3; i++) {
    const bang = Math.sin(t * 7 + i * 2);
    mini(ctx, 400 + i * 140, cy + 590, 420, { c: ['#3a4a6a', '#6a3a3a', '#4a5a3a'][i], aL: i === 1 ? 2.6 + 0.3 * bang : 0.3, aR: 2.4 + 0.4 * bang, night: 1 });
  }
  ctx.fillStyle = 'rgba(0,0,10,0.45)'; ctx.fillRect(300, cy, 480, 620);
  ctx.restore();
  for (let k = 0; k < 4; k++) { const a = Math.max(0, Math.sin(t * 6 + k * 1.7)); hudLabel(ctx, 540 + (k - 1.5) * 200, cy - 60 - k * 20, '!', { size: 80, weight: 900, color: '#ff6b6b', align: 'center', ls: 0, alpha: a * 0.8 }); }
}

/* chrome tap: stream -> drips -> nothing */
function drawTap(ctx, t, flow) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#20262e'); g.addColorStop(1, '#0c0f13');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // sink
  ctx.fillStyle = '#c9ced4'; ctx.beginPath(); ctx.ellipse(W / 2, 1500, 460, 140, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8f969e'; ctx.beginPath(); ctx.ellipse(W / 2, 1520, 380, 100, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a2e34'; ellipse(ctx, W / 2, 1530, 30, 12); ctx.fill();
  // tap
  const cg = ctx.createLinearGradient(380, 0, 700, 0); cg.addColorStop(0, '#6f7780'); cg.addColorStop(0.5, '#f0f4f8'); cg.addColorStop(1, '#5a626c');
  ctx.fillStyle = cg; rrect(ctx, 470, 560, 140, 420, 30); ctx.fill();
  rrect(ctx, 470, 560, 330, 110, 55); ctx.fill();
  rrect(ctx, 720, 600, 80, 170, 30); ctx.fill();
  ctx.fillStyle = '#d8dde2'; rrect(ctx, 430, 500, 220, 70, 30); ctx.fill();
  const nx = 760, ny = 770;
  if (flow > 0.05) {
    ctx.fillStyle = `rgba(170,215,255,${0.75 * flow})`;
    ctx.fillRect(nx - 14 * flow, ny, 28 * flow, 1500 - ny);
    ctx.fillStyle = `rgba(255,255,255,${0.5 * flow})`; ctx.fillRect(nx - 4 * flow, ny, 5, 1500 - ny);
  } else {
    const period = flow > -0.5 ? 0.7 : 1e9;
    const q = (t % period) / period;
    if (q < 0.25) { ctx.fillStyle = 'rgba(170,215,255,0.9)'; ellipse(ctx, nx, ny + 10 + q * 40, 10, 14); ctx.fill(); }
    else if (period < 1e8) { const y = lerp(ny + 20, 1500, (q - 0.25) / 0.75); ctx.fillStyle = 'rgba(170,215,255,0.9)'; ellipse(ctx, nx, y, 10, 16); ctx.fill(); }
  }
}

/* ICU */
function drawICU(ctx, t, T, power) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a3238'); g.addColorStop(1, '#14191d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5a6a74'; ctx.fillRect(700, 420, 300, 500);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#9fb8c8'), 850, 670, 420, 0.4); ctx.restore(); ctx.globalAlpha = 1;
  // monitor
  rrect(ctx, 90, 470, 460, 330, 20); ctx.fillStyle = '#0d1014'; ctx.fill();
  if (power > 0.02) {
    ctx.save(); ctx.globalAlpha = power;
    drawECG(ctx, T, 110, 490, 420, 290, { compact: true });
    ctx.restore();
  }
  // ventilator
  rrect(ctx, 120, 860, 220, 380, 20); ctx.fillStyle = '#c9ced2'; ctx.fill();
  rrect(ctx, 150, 890, 160, 110, 10); ctx.fillStyle = power > 0.02 ? `rgba(40,200,255,${0.8 * power})` : '#1a1e22'; ctx.fill();
  // doctor behind the bed, squeezing the bag by hand
  const sq = power > 0.1 ? 0 : 0.5 + 0.5 * Math.sin(t * 5.5);
  if (power < 0.5) mini(ctx, 640, 1330, 600, { c: '#4fa7a0', pants: '#3f8780', hat: '#4fa7a0', aL: 1.2 + 0.08 * sq, aR: 0.9 + 0.08 * sq });
  // bed + patient
  ctx.fillStyle = '#8a9298'; ctx.fillRect(200, 1380, 760, 40);
  ctx.fillStyle = '#e8ecef'; rrect(ctx, 180, 1270, 800, 130, 30); ctx.fill();
  ctx.fillStyle = '#c48a62'; ellipse(ctx, 270, 1250, 60, 50); ctx.fill();
  ctx.fillStyle = '#7fa8c8'; rrect(ctx, 320, 1220, 640, 90, 40); ctx.fill();
  // tube + bag
  ctx.strokeStyle = 'rgba(200,220,235,0.8)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(250, 1235); ctx.quadraticCurveTo(270, 1060, 360, 960); ctx.stroke();
  ctx.fillStyle = '#4a9fd8'; ellipse(ctx, 385, 945, 75 - 22 * sq, 46 - 7 * sq, -0.5); ctx.fill();
  if (power < 0.5) { ctx.fillStyle = '#c48a62'; ellipse(ctx, 372, 935, 26, 26); ctx.fill(); }
}

/* freezer row thawing */
function drawFreezers(ctx, t, thaw) {
  ctx.fillStyle = '#1c2026'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * 245;
    rrect(ctx, x, 480, 225, 980, 14); ctx.fillStyle = '#d9dde0'; ctx.fill();
    rrect(ctx, x + 14, 500, 197, 940, 8); ctx.fillStyle = css(mixc('#bfe6ff', '#4a5a50', thaw)); ctx.fill();
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      ctx.fillStyle = css(mixc(['#e63946', '#f1faee', '#a8dadc', '#ffb703'][(r + c + i) % 4], '#6a7a3a', thaw * 0.7));
      ctx.fillRect(x + 26 + c * 62, 540 + r * 180, 52, 120);
    }
    ctx.fillStyle = `rgba(255,255,255,${0.25 * (1 - thaw)})`; ctx.fillRect(x + 20, 505, 40, 930);
    if (thaw > 0.3) for (let k = 0; k < 3; k++) {
      const q = (t * 0.8 + k / 3 + i * 0.2) % 1;
      ctx.fillStyle = 'rgba(160,200,230,0.8)'; ellipse(ctx, x + 50 + k * 60, lerp(1460, 1700, q), 6, 9); ctx.fill();
    }
  }
  ctx.fillStyle = css(mixc('#2a2e34', '#3a4a5a', thaw)); ctx.fillRect(0, 1460, W, H);
  if (thaw > 0.2) { ctx.fillStyle = `rgba(120,160,200,${0.35 * thaw})`; ctx.beginPath(); ctx.ellipse(540, 1720, 520 * thaw, 70 * thaw, 0, 0, TAU); ctx.fill(); }
  if (thaw > 0.5) for (let i = 0; i < 6; i++) spr(ctx, softSprite('#6a7a3a'), 160 + i * 160, 900 + Math.sin(t + i) * 100, 120, 0.12 * thaw);
  ctx.globalAlpha = 1;
}
function drawBrokenDoor(ctx, t) {
  ctx.fillStyle = '#121418'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a3038'; ctx.fillRect(120, 400, 840, 1100);
  ctx.strokeStyle = 'rgba(200,230,255,0.75)'; ctx.lineWidth = 3;
  const cx = 540, cy = 900;
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; ctx.beginPath(); ctx.moveTo(cx, cy); let x = cx, y = cy; for (let k = 0; k < 4; k++) { x += Math.cos(a + (hash(i * 7 + k) - 0.5)) * 110; y += Math.sin(a + (hash(i * 3 + k) - 0.5)) * 110; ctx.lineTo(x, y); } ctx.stroke(); }
  for (let r = 1; r < 4; r++) { ctx.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU; const rr = r * 110 + hash(i + r * 9) * 30; i ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.stroke(); }
  ctx.fillStyle = '#1a1c20'; ctx.fillRect(0, 1500, W, H);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(200,230,255,0.6)'; const x = hash(i) * W, y = 1520 + hash(i + 5) * 380; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20, y + 6); ctx.lineTo(x + 6, y + 18); ctx.closePath(); ctx.fill(); }
  drawCrowd(ctx, t, { hy: 1400, mode: 'angry', density: 0.5, y0: 1500, y1: H + 260, hFar: 260, hNear: 600, spreadFar: 560, spreadNear: 900, night: 1 });
}

/* procedural fire */
function drawFire(ctx, x, y, s, t, a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  spr(ctx, softSprite('#ff8a2a'), x, y - s * 0.4, s * 3.2, 0.55 * a * (0.85 + 0.15 * Math.sin(t * 9)));
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let layer = 0; layer < 3; layer++) {
    const c = ['rgba(255,80,20,', 'rgba(255,160,40,', 'rgba(255,240,180,'][layer];
    const sc = [1, 0.7, 0.4][layer];
    for (let i = 0; i < 5; i++) {
      const fx = x + (i - 2) * s * 0.18 * sc + noise(t * 3 + i * 7, layer) * s * 0.06;
      const fh = s * sc * (0.8 + 0.4 * (noise(t * 4 + i * 3, 9 + layer) * 0.5 + 0.5));
      ctx.fillStyle = c + (0.55 * a) + ')';
      ctx.beginPath(); ctx.moveTo(fx - s * 0.13 * sc, y);
      ctx.quadraticCurveTo(fx - s * 0.16 * sc, y - fh * 0.5, fx + noise(t * 6 + i, 3) * s * 0.08, y - fh);
      ctx.quadraticCurveTo(fx + s * 0.16 * sc, y - fh * 0.5, fx + s * 0.13 * sc, y); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  for (let i = 0; i < 10; i++) {
    const q = (t * 0.6 + i / 10) % 1;
    ctx.fillStyle = `rgba(255,190,90,${a * (1 - q)})`;
    ctx.fillRect(x + noise(i * 5 + t, 4) * s * 0.4, y - s * 0.6 - q * s * 1.6, 3, 3);
  }
}

/* iron stove in a ger */
function drawStove(ctx, t) {
  ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#ff7a2a'), W / 2, 1200, 900, 0.35); ctx.restore(); ctx.globalAlpha = 1;
  // lattice wall (хана)
  ctx.strokeStyle = 'rgba(160,110,60,0.35)'; ctx.lineWidth = 6;
  ctx.beginPath(); for (let x = -400; x < W + 400; x += 70) { ctx.moveTo(x, 300); ctx.lineTo(x + 500, 1100); ctx.moveTo(x + 500, 300); ctx.lineTo(x, 1100); } ctx.stroke();
  // stove
  ctx.fillStyle = '#2a2624'; rrect(ctx, 240, 1060, 600, 460, 20); ctx.fill();
  ctx.fillStyle = '#3a3532'; ctx.fillRect(220, 1040, 640, 40);
  ctx.fillStyle = '#3a3532'; ctx.fillRect(470, 200, 80, 840);
  rrect(ctx, 360, 1160, 360, 240, 14); ctx.fillStyle = '#120804'; ctx.fill();
  ctx.save(); rrect(ctx, 360, 1160, 360, 240, 14); ctx.clip();
  drawFire(ctx, 540, 1400, 240, t, 1);
  ctx.restore();
  // dung / wood pile
  for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#6a4a2a' : '#5a3e24'; ellipse(ctx, 120 + (i % 3) * 70, 1700 - Math.floor(i / 3) * 40, 50, 22); ctx.fill(); }
  for (let i = 0; i < 5; i++) { ctx.fillStyle = '#8a5a32'; rrect(ctx, 760, 1680 - i * 34, 260, 28, 14); ctx.fill(); }
  ctx.fillStyle = '#2a1c12'; ctx.fillRect(0, 1760, W, H);
}

/* gathering around a fire under the stars */
function drawCampfire(ctx, t) {
  const fx = W / 2, fy = 1560;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    const x = fx + Math.cos(a) * 330, y = fy + 40 + Math.sin(a) * -60 + (i % 2) * 20;
    mini(ctx, x, y + 40, 300, { c: DEELS[i % 6], deel: i % 2 === 0, aL: -0.55, aR: -0.55 });
    if (i % 3 !== 2) {
      ctx.fillStyle = ['#e9dcc0', '#d8c9a8'][i % 2];
      rrect(ctx, x - 44, y - 150, 88, 60, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,140,60,0.4)'; ctx.fillRect(x - 44, y - 150, 88, 60);
      ctx.fillStyle = 'rgba(90,60,40,0.5)'; ctx.fillRect(x - 1, y - 150, 2, 60);
    }
  }
  ctx.fillStyle = '#3a2416'; for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(fx, fy + 10); ctx.rotate((i - 2) * 0.5); ctx.fillRect(-90, -10, 180, 20); ctx.restore(); }
  drawFire(ctx, fx, fy, 200, t, 1);
}

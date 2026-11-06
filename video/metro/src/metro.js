'use strict';
/* UB metro set pieces: smoggy traffic, metro entrance, station, train, route map, underground mall, skyline smog. */

const NEON = '#3ad4ff';

/* Peace Avenue in winter smog, jammed (k: 0 jam .. 1 cleared) */
function drawTraffic(ctx, t, k, o = {}) {
  const hy = 900;
  let g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, '#3a3530'); g.addColorStop(1, '#8a7a66');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy);
  // buildings both sides
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const z = 1 - i / 7, x0 = W / 2 + side * lerp(70, 560, z * z), w = lerp(30, 260, z * z), h = lerp(120, 900, z * z);
    ctx.fillStyle = css(mixc('#4a443e', '#2a2622', z)); ctx.fillRect(side < 0 ? x0 - w : x0, hy + lerp(4, 300, z * z) - h, w, h);
    for (let y = 0; y < 8; y++) for (let c = 0; c < 3; c++) if (hash(i * 31 + y * 7 + c + side) < 0.5) { ctx.fillStyle = 'rgba(255,200,120,0.6)'; ctx.fillRect((side < 0 ? x0 - w : x0) + w * (0.15 + c * 0.28), hy + lerp(4, 300, z * z) - h + h * (0.1 + y * 0.1), w * 0.14, h * 0.05); }
  }
  // road
  ctx.fillStyle = '#2a2826';
  ctx.beginPath(); ctx.moveTo(W / 2 - 50, hy); ctx.lineTo(W / 2 + 50, hy); ctx.lineTo(W + 300, H); ctx.lineTo(-300, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(230,220,180,0.5)'; ctx.lineWidth = 6; ctx.setLineDash([50, 50]); ctx.lineDashOffset = -t * 300 * k;
  for (const f of [-0.33, 0.33]) { ctx.beginPath(); ctx.moveTo(W / 2 + f * 100, hy); ctx.lineTo(W / 2 + f * 1600, H); ctx.stroke(); }
  ctx.setLineDash([]);
  // cars: dense jam fading out as k -> 1
  for (let i = 40; i >= 0; i--) {
    const lane = i % 3 - 1, row = Math.floor(i / 3);
    if (hash(i + 3) < k) continue;
    const z = 1 - (row / 14 + ((t * 0.02 * k) % 1)) % 1, zz = z * z;
    const y = lerp(hy + 8, H + 40, zz), s = lerp(14, 280, zz), x = W / 2 + lane * lerp(30, 560, zz);
    ctx.fillStyle = ['#5a6068', '#7a2e2a', '#2f4560', '#8a8478', '#3a3a3c'][i % 5];
    rrect(ctx, x - s / 2, y - s * 0.6, s, s * 0.6, s * 0.1); ctx.fill();
    ctx.fillStyle = 'rgba(40,40,40,0.8)'; ctx.fillRect(x - s * 0.36, y - s * 0.52, s * 0.72, s * 0.18);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    spr(ctx, softSprite('#ff2020'), x - s * 0.38, y - s * 0.24, s * 0.22, 0.8); spr(ctx, softSprite('#ff2020'), x + s * 0.38, y - s * 0.24, s * 0.22, 0.8);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // smog
  for (let i = 0; i < 22; i++) spr(ctx, softSprite('#8a7c6a'), ((hash(i) * 1500 + t * 15) % 1500) - 200, 300 + hash(i + 3) * 900, 260 + hash(i + 5) * 200, 0.3 * (o.smog == null ? 1 : o.smog));
  ctx.globalAlpha = 1;
  // traffic map card
  if (o.map) drawTrafficMap(ctx, t, k, o.map);
}
function drawTrafficMap(ctx, t, k, a) {
  ctx.save(); ctx.globalAlpha = a;
  rrect(ctx, 90, 1380, 900, 380, 30); ctx.fillStyle = 'rgba(10,14,20,0.82)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.stroke();
  hudLabel(ctx, 140, 1430, 'ЭНХТАЙВНЫ ӨРГӨН ЧӨЛӨӨ', { size: 26, weight: 800, color: '#cbd5e1', ls: 3 });
  const pts = [[150, 1660], [300, 1600], [460, 1640], [620, 1560], [780, 1600], [930, 1520]];
  for (let i = 0; i < pts.length - 1; i++) {
    const local = clamp(k * 1.6 - i * 0.12);
    ctx.strokeStyle = css(mixc('#ef4444', '#22c55e', local)); ctx.lineWidth = 18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
  }
  hudLabel(ctx, 940, 1430, k > 0.5 ? 'ЧӨЛӨӨТЭЙ' : 'ТҮГЖРЭЛ', { size: 30, weight: 900, color: k > 0.5 ? '#22c55e' : '#ef4444', align: 'right', ls: 2 });
  ctx.restore();
}

/* glass metro entrance in front of the square */
function drawEntrance(ctx, t, open) {
  const hy = 1150;
  drawSky(ctx, hy, moodMix('gray', 'dusk', 0.4), t, {});
  drawPalace(ctx, W / 2, hy, 760, { t, gray: 0.5, night: 0.2, windows: 0.5 });
  drawPlaza(ctx, hy, { gray: 0.5 });
  // snow on the plaza
  ctx.fillStyle = 'rgba(240,245,250,0.35)'; ctx.fillRect(0, hy, W, H - hy);
  // pavilion
  const x0 = 210, x1 = 870, top = 1080, bot = 1640;
  ctx.fillStyle = 'rgba(160,200,230,0.28)'; ctx.fillRect(x0, top, x1 - x0, bot - top);
  ctx.strokeStyle = '#c9d6df'; ctx.lineWidth = 10; ctx.strokeRect(x0, top, x1 - x0, bot - top);
  ctx.lineWidth = 5; ctx.beginPath(); for (let x = x0 + 110; x < x1; x += 110) { ctx.moveTo(x, top); ctx.lineTo(x, bot); } ctx.stroke();
  ctx.fillStyle = '#d8e2e8'; ctx.beginPath(); ctx.moveTo(x0 - 40, top); ctx.lineTo(W / 2, top - 110); ctx.lineTo(x1 + 40, top); ctx.closePath(); ctx.fill();
  // warm light inside + doors sliding open
  const dw = 230, dx = W / 2, op = E.inOut(open) * dw * 0.48;
  ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#ffcf8a'), dx, bot - 200, 260 + 200 * open, 0.4 + 0.4 * open); ctx.restore(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffdca0'; ctx.fillRect(dx - dw / 2 + 6, bot - 380, dw - 12, 380);
  ctx.fillStyle = 'rgba(190,220,240,0.7)'; ctx.fillRect(dx - dw / 2, bot - 380, dw / 2 - op, 380); ctx.fillRect(dx + op, bot - 380, dw / 2 - op, 380);
  // M sign
  rrect(ctx, W / 2 - 70, top - 260, 140, 120, 24); ctx.fillStyle = '#0b4fa8'; ctx.fill();
  hudLabel(ctx, W / 2, top - 198, 'М', { size: 90, weight: 900, color: '#ffffff', align: 'center', ls: 0 });
  hudLabel(ctx, W / 2, top - 30, 'СҮХБААТАРЫН ТАЛБАЙ', { size: 34, weight: 900, color: '#ffffff', align: 'center', ls: 3, glow: 'rgba(58,212,255,0.8)' });
  // steam
  for (let i = 0; i < 14; i++) { const q = (t * 0.25 + i / 14) % 1; spr(ctx, softSprite('#ffffff'), W / 2 + (hash(i) - 0.5) * 500 + Math.sin(q * 5 + i) * 40, top - 120 - q * 520, 60 + q * 160, 0.22 * (1 - q)); }
  ctx.globalAlpha = 1;
}

/* futuristic underground platform; train arrival 0..1 */
function drawStation(ctx, t, arrive, name = 'СҮХБААТАРЫН ТАЛБАЙ') {
  ctx.fillStyle = '#05080f'; ctx.fillRect(0, 0, W, H);
  // vaulted ceiling with LED lines
  for (let i = 0; i < 10; i++) {
    const f = Math.pow(0.8, i), y = 900 - 600 * f, w = 1400 * f;
    ctx.strokeStyle = css(NEON, 0.7 * f + 0.1); ctx.lineWidth = 6 * f + 1;
    ctx.beginPath(); ctx.ellipse(W / 2, 900, w / 2, 900 - y, 0, Math.PI, TAU); ctx.stroke();
  }
  // platform floor
  let g = ctx.createLinearGradient(0, 1100, 0, H); g.addColorStop(0, '#1a2230'); g.addColorStop(1, '#3a4658');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(W / 2 - 40, 900); ctx.lineTo(W / 2 + 120, 900); ctx.lineTo(W + 200, H); ctx.lineTo(-100, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(W / 2 - 30, 905); ctx.lineTo(60, H); ctx.stroke();
  // track pit
  ctx.fillStyle = '#020306'; ctx.beginPath(); ctx.moveTo(W / 2 - 40, 900); ctx.lineTo(W / 2 - 20, 900); ctx.lineTo(40, H); ctx.lineTo(-300, H); ctx.closePath(); ctx.fill();
  // station sign
  rrect(ctx, 520, 560, 500, 110, 20); ctx.fillStyle = '#0b1830'; ctx.fill(); ctx.strokeStyle = NEON; ctx.lineWidth = 4; ctx.stroke();
  hudLabel(ctx, 770, 615, name, { size: 30, weight: 900, color: '#e6fbff', align: 'center', ls: 2, glow: css(NEON, 0.9) });
  // people waiting
  for (let i = 0; i < 6; i++) mini(ctx, 520 + i * 90 + (i % 2) * 30, 1300 + i * 70, 220 + i * 40, { c: COATS[i * 2 % 12], hat: i % 2 ? '#222' : null, aL: 0.15, aR: 0.15 });
  // train sliding in
  if (arrive > 0) {
    const k = E.out(arrive);
    const nose = lerp(-1400, 0, k);
    ctx.save(); ctx.translate(nose, 0);
    ctx.fillStyle = '#d8dee6';
    ctx.beginPath(); ctx.moveTo(W / 2 - 30, 760); ctx.lineTo(W / 2 - 20, 900); ctx.lineTo(60, H + 40); ctx.lineTo(-900, H + 40); ctx.lineTo(-900, 300); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5ab8ff'; ctx.beginPath(); ctx.moveTo(W / 2 - 34, 820); ctx.lineTo(-900, 900); ctx.lineTo(-900, 960); ctx.lineTo(W / 2 - 30, 840); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(20,40,70,0.85)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); const x = W / 2 - 120 - i * 260; ctx.moveTo(x, 640 + i * 60); ctx.lineTo(x - 180, 600 + i * 90); ctx.lineTo(x - 180, 820 + i * 50); ctx.lineTo(x, 800 + i * 30); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (arrive < 1) for (let i = 0; i < 18; i++) { ctx.strokeStyle = `rgba(160,220,255,${0.4 * (1 - arrive)})`; ctx.lineWidth = 3; const y = 600 + hash(i) * 900; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(500, y - 40); ctx.stroke(); }
  }
}

/* inside the speeding train: windows with neon signs flashing past + route progress */
function drawTrainRide(ctx, t, p) {
  ctx.fillStyle = '#c9d2dc'; ctx.fillRect(0, 0, W, H);
  // windows (tunnel outside)
  for (const y of [520, 1080]) {
    rrect(ctx, 80, y, 920, 360, 40); ctx.fillStyle = '#06090f'; ctx.fill();
    ctx.save(); rrect(ctx, 80, y, 920, 360, 40); ctx.clip();
    const tg = ctx.createLinearGradient(0, y, 0, y + 360); tg.addColorStop(0, '#0a1a30'); tg.addColorStop(0.5, '#123a66'); tg.addColorStop(1, '#0a1a30'); ctx.fillStyle = tg; ctx.fillRect(80, y, 920, 360);
    for (let i = 0; i < 30; i++) { const x = ((hash(i) * 1600 - t * 2600) % 1300 + 1300) % 1300 - 100; ctx.fillStyle = `rgba(160,220,255,${0.4 + 0.5 * hash(i + 9)})`; ctx.fillRect(x, y + 30 + hash(i + 2) * 300, 220, 5); }
    for (let i = 0; i < 5; i++) { const x = ((i * 300 - t * 2600) % 1500 + 1500) % 1500 - 200; ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#9fdcff'), x, y + 180, 160, 0.5); ctx.restore(); ctx.globalAlpha = 1; }
    const sx = ((t * 1800) % 2400) - 600;
    if (sx > -400 && sx < 1200) { ctx.fillStyle = '#0b1830'; ctx.fillRect(1100 - sx, y + 130, 420, 100); hudLabel(ctx, 1310 - sx, y + 180, ['АМГАЛАН', 'ЗУУН АЙЛ', 'СҮХБААТАР', 'БАРУУН 4 ЗАМ', 'ТАВАН ШАР'][Math.floor(t * 0.75) % 5], { size: 34, weight: 900, color: '#e6fbff', align: 'center', ls: 2, glow: css(NEON, 0.9) }); }
    ctx.restore();
  }
  // handrail + seats
  ctx.fillStyle = '#9aa6b2'; ctx.fillRect(0, 470, W, 14);
  ctx.fillStyle = '#2f6db5'; rrect(ctx, 60, 1500, 960, 140, 30); ctx.fill();
  // route map strip
  rrect(ctx, 60, 1680, 960, 170, 26); ctx.fillStyle = '#0b1220'; ctx.fill();
  const xs = [130, 330, 540, 750, 950], names = ['АМГАЛАН', 'ЗУУН АЙЛ', 'СҮХБААТАР', '4 ЗАМ', 'ТАВАН ШАР'];
  ctx.strokeStyle = 'rgba(58,212,255,0.4)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(130, 1745); ctx.lineTo(950, 1745); ctx.stroke();
  ctx.strokeStyle = NEON; ctx.beginPath(); ctx.moveTo(130, 1745); ctx.lineTo(lerp(130, 950, p), 1745); ctx.stroke();
  xs.forEach((x, i) => { ctx.fillStyle = lerp(130, 950, p) >= x - 2 ? NEON : '#3a4658'; ellipse(ctx, x, 1745, 16, 16); ctx.fill(); hudLabel(ctx, x, 1800, names[i], { size: 18, weight: 800, color: '#cbd5e1', align: 'center', ls: 1 }); });
  hudLabel(ctx, W / 2, 1610 - 40, Math.round(lerp(0, 15, p)) + ' МИНУТ', { size: 64, weight: 900, color: '#ffffff', align: 'center', font: '"JetBrains Mono"', ls: 0 });
}

/* underground shopping street */
function drawMall(ctx, t) {
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1410'); g.addColorStop(1, '#3a2a20');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // shopfronts in perspective
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    const f = Math.pow(0.75, i), x = W / 2 + side * 540 * f, w = 220 * f, top = 900 - 520 * f, bot = 900 + 680 * f;
    const xa = side < 0 ? x : x - w;
    ctx.fillStyle = ['#ffcf8a', '#9fe0ff', '#ffb0c8', '#b8ffcf'][(i + (side > 0)) % 4];
    ctx.globalAlpha = 0.85; ctx.fillRect(xa, top + 80 * f, w, bot - top - 80 * f); ctx.globalAlpha = 1;
    ctx.fillStyle = '#2a201a'; ctx.fillRect(xa, top, w, 80 * f);
    hudLabel(ctx, xa + w / 2, top + 40 * f, ['КОФЕ', 'НОМ', 'ХУВЦАС', 'ХООЛ', 'ГАР УТАС', 'ЦЭЦЭГ'][(i * 2 + (side > 0)) % 6], { size: 34 * f, weight: 900, color: '#fff3d8', align: 'center', ls: 1 });
  }
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 8; i++) spr(ctx, softSprite('#ffd08a'), W / 2, 420 + i * 30 * Math.pow(0.8, i), 200 * Math.pow(0.8, i), 0.25);
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#4a3a2e'; ctx.beginPath(); ctx.moveTo(W / 2 - 30, 900); ctx.lineTo(W / 2 + 30, 900); ctx.lineTo(W + 300, H); ctx.lineTo(-300, H); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 16; i++) {
    const q = ((t * 0.06 + i / 16) % 1), z = i % 2 ? q : 1 - q, zz = z * z;
    const y = lerp(910, H + 60, zz), h = lerp(30, 380, zz), x = W / 2 + (hash(i) - 0.5) * lerp(60, 900, zz);
    mini(ctx, x, y, h, { c: COATS[(i * 5) % 12], aL: 0.2, aR: i % 3 === 0 ? -0.9 : 0.2, walk: t * 5 + i, phone: i % 4 === 0 ? 1 : 0 });
  }
}

/* city from above, smog layer thinning (k 0..1) */
function drawSmogCity(ctx, t, k) {
  const hy = 1250;
  let g = ctx.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, css(mixc('#6a6050', '#3d7ed0', k))); g.addColorStop(1, css(mixc('#a89070', '#cfe6f5', k)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy);
  ctx.fillStyle = css(mixc('#6a6a60', '#8aa0b4', k)); ctx.beginPath(); ctx.moveTo(0, hy); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, hy - 120 - 80 * (fbm(x * 0.003, 2) * 0.5 + 0.5)); ctx.lineTo(W, hy); ctx.closePath(); ctx.fill();
  drawSkyline(ctx, hy, MOODS.day, { seed: 3, tall: 480 });
  drawPalace(ctx, W / 2, hy + 4, 520, { t, gray: 1 - k });
  ctx.fillStyle = '#d8dee4'; ctx.fillRect(0, hy, W, H - hy);
  for (let i = 0; i < 40; i++) spr(ctx, softSprite('#8a7a62'), ((hash(i) * 1500 + t * 12) % 1500) - 200, 500 + hash(i + 3) * 900, 260 + hash(i + 5) * 220, 0.45 * (1 - 0.65 * k));
  ctx.globalAlpha = 1;
  // a few chimney plumes remain (ger districts)
  for (const x of [90, 180, 960]) for (let j = 0; j < 6; j++) { const q = (t * 0.2 + j / 6) % 1; spr(ctx, softSprite('#9a9080'), x + q * 40, hy - 30 - q * 260, 30 + q * 80, 0.3 * (1 - q)); }
  ctx.globalAlpha = 1;
}

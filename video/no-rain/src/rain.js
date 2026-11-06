'use strict';
/* No-rain set pieces: virga clouds, drying park/steppe, dust storm, dry river + dam, taiga fire, Earth from space. */

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

/* storm clouds whose rain evaporates before reaching the ground (virga) */
function drawVirga(ctx, t, lt, norain) {
  const hy = 1400;
  let g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, '#5a6b7a'); g.addColorStop(1, '#e8d6b0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#fff0c0'), 880, 1100, 420, 0.6); ctx.restore(); ctx.globalAlpha = 1;
  drawSkyline(ctx, hy, MOODS.day, { seed: 2, tall: 300 });
  ctx.fillStyle = '#b8a070'; ctx.fillRect(0, hy, W, H - hy);
  // cloud bank gathering
  const k = seg(lt, 0, 2.5);
  for (let i = 0; i < 46; i++) {
    const x = hash(i) * 1400 - 160 + Math.sin(t * 0.3 + i) * 20, y = 520 + hash(i + 3) * 260;
    spr(ctx, softSprite(i % 3 ? '#5f6872' : '#7d868f'), lerp(x < W / 2 ? x - 500 : x + 500, x, E.out(k)), y, 160 + hash(i + 5) * 160, 0.75);
  }
  ctx.globalAlpha = 1;
  // rain streaks fading out half way down
  ctx.lineWidth = 3;
  for (let i = 0; i < 220; i++) {
    const x = 80 + hash(i * 2.1) * 920, q = (t * 1.6 + hash(i * 3.7)) % 1;
    const y0 = 760 + q * 520, len = 60;
    const a = norain ? 0 : 0.6 * (1 - q) * seg(lt, 1.2, 2.2);
    if (a <= 0.01) continue;
    ctx.strokeStyle = `rgba(200,220,240,${a})`;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x - 8, y0 + len); ctx.stroke();
  }
  // rising heat haze
  for (let i = 0; i < 16; i++) spr(ctx, softSprite('#fff4d8'), hash(i) * W, 1300 - ((t * 60 + i * 50) % 300), 120, 0.08);
  ctx.globalAlpha = 1;
}

/* park beside the square, greenery drying out */
let PARK_CRACKS = null;
function drawPark(ctx, t, dry) {
  const hy = 980;
  const m = moodMix('day', 'gray', dry * 0.4);
  drawSky(ctx, hy, m, t, { sun: [850, 520, 60] });
  drawPalace(ctx, W / 2, hy + 6, 760, { t, gray: dry * 0.3 });
  const grass = mixc(mixc('#5f9a3a', '#c8b04a', clamp(dry * 1.6)), '#9a8460', clamp(dry * 1.6 - 0.6));
  let g = ctx.createLinearGradient(0, hy, 0, H);
  g.addColorStop(0, css(mixc(grass, '#ffffff', 0.15))); g.addColorStop(1, css(mixc(grass, '#000000', 0.2)));
  ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
  // path
  ctx.fillStyle = '#c9c2b4'; ctx.beginPath(); ctx.moveTo(W / 2 - 20, hy); ctx.lineTo(W / 2 + 20, hy); ctx.lineTo(W / 2 + 260, H); ctx.lineTo(W / 2 - 260, H); ctx.closePath(); ctx.fill();
  // trees
  const leaf = mixc(mixc('#3f7f2f', '#c9a23a', clamp(dry * 1.4)), '#7a5a3a', clamp(dry * 1.4 - 0.5));
  for (const [x, y, s] of [[120, 1180, 1], [330, 1080, 0.7], [760, 1080, 0.7], [960, 1200, 1.1], [60, 1500, 1.6], [1010, 1560, 1.7]]) {
    ctx.fillStyle = '#5a4030'; ctx.fillRect(x - 10 * s, y - 20 * s, 20 * s, 140 * s);
    for (let k = 0; k < 5; k++) { ctx.fillStyle = css(mixc(leaf, k % 2 ? '#000000' : '#ffffff', 0.1)); ellipse(ctx, x + (k - 2) * 26 * s, y - 60 * s - (k % 2) * 30 * s, 70 * s, 60 * s); ctx.fill(); }
  }
  // falling leaves
  if (dry > 0.4) for (let i = 0; i < 20; i++) {
    const q = (t * 0.3 + hash(i)) % 1;
    ctx.fillStyle = css(leaf); ellipse(ctx, hash(i + 2) * W + Math.sin(q * 8 + i) * 30, 1000 + q * 800, 8, 5, q * 6); ctx.fill();
  }
  // soil cracks
  if (!PARK_CRACKS) {
    const r = rng(3); PARK_CRACKS = [];
    for (let i = 0; i < 60; i++) { let x = r() * W, y = 1250 + r() * 650; const pts = [[x, y]]; for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 40; pts.push([x, y]); } PARK_CRACKS.push({ pts, k: r() }); }
  }
  ctx.strokeStyle = 'rgba(60,40,20,0.75)'; ctx.lineWidth = 3;
  for (const c of PARK_CRACKS) { if (c.k > dry * 1.3 - 0.3) continue; ctx.beginPath(); ctx.moveTo(c.pts[0][0], c.pts[0][1]); for (const p of c.pts) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
}

/* dust storm wall rolling over the city */
function drawDustStorm(ctx, t, k) {
  const hy = 1300;
  const m = moodMix('gray', 'storm', k * 0.5);
  drawSky(ctx, hy, m, t, {});
  drawSkyline(ctx, hy, m, { seed: 6, tall: 520 });
  drawPalace(ctx, W / 2, hy + 6, 700, { t, gray: 1 });
  ctx.fillStyle = '#9a8460'; ctx.fillRect(0, hy, W, H - hy);
  const front = lerp(-500, W + 900, E.inOut(k));
  for (let i = 0; i < 90; i++) {
    const x = front - hash(i) * 1400, y = hy + 200 - hash(i + 3) * 1500 * Math.pow(hash(i + 7), 0.6);
    spr(ctx, softSprite(['#a4733a', '#8a5a2a', '#c08a4a'][i % 3]), x + Math.sin(t + i) * 30, y, 220 + hash(i + 5) * 260, 0.6);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(160,100,40,${0.55 * seg(front, 0, W + 400)})`; ctx.fillRect(0, 0, W, H);
  drawDust(ctx, t, k, '#c08a4a', 7, 2.2, 0);
}

/* Tuul river drying out */
function drawRiverBed(ctx, t, dry) {
  ctx.fillStyle = '#a89a78'; ctx.fillRect(0, 0, W, H);
  let g = ctx.createLinearGradient(0, 0, 0, 700); g.addColorStop(0, '#9fb8c8'); g.addColorStop(1, '#e8d8b8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 700);
  ctx.fillStyle = '#7a8a6a'; ctx.beginPath(); ctx.moveTo(0, 700); ctx.quadraticCurveTo(300, 620, 600, 680); ctx.quadraticCurveTo(850, 640, W, 690); ctx.lineTo(W, 720); ctx.lineTo(0, 720); ctx.closePath(); ctx.fill();
  // riverbed channel
  const bank = (y, side) => W / 2 + side * lerp(60, 520, (y - 700) / (H - 700)) + Math.sin(y * 0.01) * 80;
  ctx.fillStyle = '#c9b48a';
  ctx.beginPath(); ctx.moveTo(bank(700, -1), 700);
  for (let y = 700; y <= H; y += 40) ctx.lineTo(bank(y, -1), y);
  for (let y = H; y >= 700; y -= 40) ctx.lineTo(bank(y, 1), y);
  ctx.closePath(); ctx.fill();
  // stones
  const r = rng(8);
  for (let i = 0; i < 160; i++) {
    const y = 720 + Math.pow(r(), 0.8) * (H - 720), x = lerp(bank(y, -1), bank(y, 1), r());
    const s = lerp(4, 30, (y - 700) / (H - 700)) * (0.6 + r());
    ctx.fillStyle = ['#8a8070', '#a69a88', '#6f675c'][i % 3]; ellipse(ctx, x, y, s * 1.4, s * 0.8); ctx.fill();
  }
  // water band shrinking to puddles
  const wk = 1 - dry;
  if (wk > 0.02) {
    ctx.save(); ctx.beginPath();
    for (let y = 700; y <= H; y += 40) { const c = (bank(y, -1) + bank(y, 1)) / 2, w = (bank(y, 1) - bank(y, -1)) / 2 * wk * (0.75 + 0.25 * Math.sin(y * 0.02 + 1)); if (y === 700) ctx.moveTo(c - w, y); else ctx.lineTo(c - w, y); }
    for (let y = H; y >= 700; y -= 40) { const c = (bank(y, -1) + bank(y, 1)) / 2, w = (bank(y, 1) - bank(y, -1)) / 2 * wk * (0.75 + 0.25 * Math.sin(y * 0.02 + 1)); ctx.lineTo(c + w, y); }
    ctx.closePath();
    g = ctx.createLinearGradient(0, 700, 0, H); g.addColorStop(0, '#a8cce0'); g.addColorStop(1, '#3f7fa8');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3;
    for (let i = 0; i < 30; i++) { const y = 720 + ((hash(i) * (H - 700) + t * 120) % (H - 700)); ctx.beginPath(); ctx.moveTo(W / 2 - 80 + hash(i + 1) * 160, y); ctx.lineTo(W / 2 - 40 + hash(i + 1) * 160, y + 4); ctx.stroke(); }
    ctx.restore();
  }
  // dead fish on the gravel
  if (dry > 0.6) {
    const a = seg(dry, 0.6, 0.9);
    for (const [x, y, s, rot] of [[430, 1500, 1.4, 0.3], [640, 1680, 1.7, -0.4], [520, 1260, 1.0, 1.2], [700, 1380, 1.2, 2.6]]) {
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      ctx.fillStyle = '#b8c0c4'; ellipse(ctx, 0, 0, 50, 16); ctx.fill();
      ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(74, -16); ctx.lineTo(74, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8eef0'; ellipse(ctx, -6, 4, 36, 6); ctx.fill();
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-36, -6); ctx.lineTo(-30, 0); ctx.moveTo(-36, 0); ctx.lineTo(-30, -6); ctx.stroke();
      ctx.restore();
    }
  }
  hudLabel(ctx, W / 2, 740, 'ТУУЛ ГОЛ', { size: 34, weight: 800, color: '#3a3020', align: 'center', ls: 8, alpha: 0.7 });
}

/* hydro dam with an empty reservoir */
function drawDam(ctx, t, dry) {
  let g = ctx.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, '#8fb0c8'); g.addColorStop(1, '#e0d0b0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#8a7a5a'; ctx.beginPath(); ctx.moveTo(0, 820); ctx.lineTo(260, 560); ctx.lineTo(380, 900); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, 820); ctx.lineTo(820, 560); ctx.lineTo(700, 900); ctx.closePath(); ctx.fill();
  // dam wall
  ctx.fillStyle = '#b8b4aa'; ctx.beginPath(); ctx.moveTo(200, 800); ctx.lineTo(880, 800); ctx.lineTo(960, 1500); ctx.lineTo(120, 1500); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(80,80,80,0.3)'; ctx.lineWidth = 4;
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(200 + i * 113, 800); ctx.lineTo(120 + i * 140, 1500); ctx.stroke(); }
  // water line marks on the wall
  ctx.fillStyle = 'rgba(90,110,120,0.4)'; ctx.fillRect(190, 800 + 520 * dry - 8, 700, 8);
  // spillway: water then dry
  const flow = 1 - dry;
  if (flow > 0.05) { ctx.fillStyle = `rgba(200,230,250,${0.8 * flow})`; ctx.fillRect(470, 1100, 140, 400); for (let i = 0; i < 10; i++) spr(ctx, softSprite('#ffffff'), 540 + (hash(i) - 0.5) * 160, 1500 - ((t * 200 + i * 40) % 100), 60, 0.4 * flow); ctx.globalAlpha = 1; }
  ctx.fillStyle = '#5a5a58'; ctx.fillRect(0, 1500, W, H);
  ctx.fillStyle = '#3a3e44'; ctx.fillRect(330, 1560, 420, 200);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = flow > 0.2 ? '#ffd27a' : '#1e2024'; ctx.fillRect(360 + i * 78, 1600, 50, 60); }
}

/* taiga burning */
function drawTaigaFire(ctx, t, k) {
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1a14'); g.addColorStop(0.6, '#a0441a'); g.addColorStop(1, '#2a140a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) spr(ctx, softSprite('#3a2a24'), ((hash(i) * 1400 + t * 40) % 1400) - 160, 300 + hash(i + 2) * 700, 260, 0.5);
  ctx.globalAlpha = 1;
  for (let row = 0; row < 3; row++) {
    const yb = 1200 + row * 260, s = 0.6 + row * 0.35;
    for (let i = 0; i < 12; i++) {
      const x = i * 100 + (row % 2) * 50 + hash(i + row * 20) * 30;
      ctx.fillStyle = css(mixc('#1a2a14', '#0a0604', k));
      ctx.beginPath(); ctx.moveTo(x, yb - 300 * s); ctx.lineTo(x - 60 * s, yb); ctx.lineTo(x + 60 * s, yb); ctx.closePath(); ctx.fill();
      if (hash(i * 3 + row) < 0.3 + 0.7 * k) drawFire(ctx, x, yb, 140 * s, t + i, 0.9);
    }
  }
  ctx.fillStyle = '#120804'; ctx.fillRect(0, 1780, W, H);
}

/* Earth from space, blue -> red */
let EARTH = null;
function earthTex() {
  if (EARTH) return EARTH;
  const S = 700, mk = (ocean, land1, land2, cloud) => {
    const c = makeCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u = (i / S) * 2 - 1, v = (j / S) * 2 - 1, d = u * u + v * v;
      const o = (j * S + i) * 4;
      if (d > 1) { img.data[o + 3] = 0; continue; }
      const n = noise2(u * 3.2 + 7, v * 3.2 + 3, 5) * 0.6 + noise2(u * 7, v * 7, 9) * 0.3;
      const cl = Math.max(0, noise2(u * 5 + 2, v * 9 + 1, 21));
      let col = n > 0.08 ? mixc(land1, land2, clamp(n * 1.5)) : ocean;
      col = mixc(col, cloud, sstep(clamp(cl * 1.4)) * 0.28);
      const shade = 0.35 + 0.65 * Math.sqrt(1 - d) * (0.7 + 0.3 * (-u * 0.5 - v * 0.5 + 0.5));
      img.data[o] = col[0] * shade; img.data[o + 1] = col[1] * shade; img.data[o + 2] = col[2] * shade; img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  };
  EARTH = { blue: mk(col('#1f5fa8'), col('#4f8a3a'), col('#c8b47a'), col('#ffffff')), red: mk(col('#7a3a24'), col('#c0602a'), col('#e09050'), col('#e8b890')) };
  return EARTH;
}
function drawEarth(ctx, t, red, o = {}) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const r = rng(5);
  for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.6 * r()})`; ctx.fillRect(r() * W, r() * H, 2, 2); }
  const E2 = earthTex(), R = o.r || 420, cx = W / 2, cy = o.cy || 1050;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  spr(ctx, softSprite(red > 0.5 ? '#ff8a50' : '#6ab8ff'), cx, cy, R * 1.35, 0.5);
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.03);
  ctx.drawImage(E2.blue, -R, -R, 2 * R, 2 * R);
  if (red > 0) { ctx.globalAlpha = red; ctx.drawImage(E2.red, -R, -R, 2 * R, 2 * R); ctx.globalAlpha = 1; }
  ctx.restore();
  if (o.fires) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const a = hash(i) * TAU, d = Math.sqrt(hash(i + 3)) * R * 0.85;
      spr(ctx, softSprite('#ff6a20'), cx + Math.cos(a) * d, cy + Math.sin(a) * d, 18 + 10 * Math.sin(t * 5 + i), 0.9 * o.fires);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
function drawDrop(ctx, x, y, s, t, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#9fdcff'), x, y, s * 2.6, 0.7 * (0.8 + 0.2 * Math.sin(t * 4))); ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath(); ctx.moveTo(x, y - s * 1.3); ctx.bezierCurveTo(x + s * 0.9, y - s * 0.2, x + s * 0.8, y + s * 0.8, x, y + s * 0.8); ctx.bezierCurveTo(x - s * 0.8, y + s * 0.8, x - s * 0.9, y - s * 0.2, x, y - s * 1.3); ctx.closePath();
  const g = ctx.createRadialGradient(x - s * 0.3, y, s * 0.1, x, y, s * 1.2); g.addColorStop(0, '#e8f8ff'); g.addColorStop(1, '#3f9fe0');
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ellipse(ctx, x - s * 0.3, y - s * 0.1, s * 0.12, s * 0.22, -0.4); ctx.fill();
  ctx.restore();
}

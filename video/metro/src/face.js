'use strict';
/* Stylised face in a mirror, skin cross-section, bacteria, products + trash, market crash. */

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

/* bathroom wall + mirror frame; content drawn by fn inside the mirror */
function drawBathroom(ctx, t, fn, o = {}) {
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#dfe7ea'); g.addColorStop(1, '#b9c6cc');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,140,150,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath(); for (let x = 0; x <= W; x += 120) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y <= H; y += 120) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
  // mirror
  const mx = 120, my = 360, mw = 840, mh = 1180;
  rrect(ctx, mx - 22, my - 22, mw + 44, mh + 44, 70); ctx.fillStyle = '#c9b48a'; ctx.fill();
  ctx.save(); rrect(ctx, mx, my, mw, mh, 54); ctx.clip();
  g = ctx.createLinearGradient(0, my, 0, my + mh); g.addColorStop(0, '#cfdde3'); g.addColorStop(1, '#93a9b2');
  ctx.fillStyle = g; ctx.fillRect(mx, my, mw, mh);
  fn(ctx);
  g = ctx.createLinearGradient(mx, my, mx + mw, my + mh); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(mx, my, mw, mh);
  ctx.restore();
  // sink counter
  ctx.fillStyle = '#eef2f3'; ctx.fillRect(0, 1600, W, 320);
  ctx.fillStyle = '#d4dadc'; ctx.fillRect(0, 1600, W, 18);
}

/* front face: o = { smile, gloss, pores, cracks (0..1), spot (0..1), dry, look } */
function drawFace(ctx, cx, cy, s, t, o = {}) {
  const skin = mixc('#e2b08e', '#cdb6a6', (o.dry || 0) * 0.8), shade = mixc('#b98263', '#a58d80', (o.dry || 0) * 0.8);
  // neck + shoulders
  ctx.fillStyle = css(shade); rrect(ctx, cx - s * 0.18, cy + s * 0.55, s * 0.36, s * 0.5, s * 0.1); ctx.fill();
  ctx.fillStyle = '#3d6f8f'; ctx.beginPath(); ctx.moveTo(cx - s * 0.75, cy + s * 1.4); ctx.quadraticCurveTo(cx - s * 0.7, cy + s * 0.85, cx - s * 0.2, cy + s * 0.82); ctx.lineTo(cx + s * 0.2, cy + s * 0.82); ctx.quadraticCurveTo(cx + s * 0.7, cy + s * 0.85, cx + s * 0.75, cy + s * 1.4); ctx.closePath(); ctx.fill();
  // ears
  ctx.fillStyle = css(shade); ellipse(ctx, cx - s * 0.47, cy + s * 0.02, s * 0.07, s * 0.13); ctx.fill(); ellipse(ctx, cx + s * 0.47, cy + s * 0.02, s * 0.07, s * 0.13); ctx.fill();
  // head
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.46, s * 0.6, 0, 0, TAU);
  const g = ctx.createRadialGradient(cx - s * 0.12, cy - s * 0.15, s * 0.1, cx, cy, s * 0.7);
  g.addColorStop(0, css(mixc(skin, '#ffffff', 0.12))); g.addColorStop(0.7, css(skin)); g.addColorStop(1, css(shade));
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  // pores
  if (o.pores > 0) {
    const r = rng(41);
    ctx.fillStyle = `rgba(120,70,50,${0.25 * o.pores})`;
    for (let i = 0; i < 400; i++) { const x = cx + (r() - 0.5) * s * 0.9, y = cy + (r() - 0.3) * s * 0.9; ctx.fillRect(x, y, 2, 2); }
  }
  // dryness cracks
  if (o.cracks > 0) {
    const r = rng(7);
    ctx.strokeStyle = `rgba(140,90,70,${0.7 * o.cracks})`; ctx.lineWidth = 2.2;
    for (let k = 0; k < 40 * o.cracks; k++) {
      let x = cx + (r() - 0.5) * s * 0.85, y = cy + (r() - 0.55) * s * 1.0;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (r() - 0.5) * s * 0.08; y += (r() - 0.5) * s * 0.08; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,245,235,${0.35 * o.cracks})`;
    for (let k = 0; k < 120 * o.cracks; k++) { const x = cx + (r() - 0.5) * s * 0.85, y = cy + (r() - 0.55) * s * 1.0; ctx.fillRect(x, y, 4 + r() * 6, 2); }
  }
  // glass-like gloss
  if (o.gloss > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    spr(ctx, softSprite('#ffffff'), cx - s * 0.2, cy + s * 0.08, s * 0.16, 0.6 * o.gloss);
    spr(ctx, softSprite('#ffffff'), cx + s * 0.22, cy + s * 0.08, s * 0.14, 0.5 * o.gloss);
    spr(ctx, softSprite('#ffffff'), cx, cy - s * 0.32, s * 0.2, 0.45 * o.gloss);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  ctx.restore();
  // hair
  ctx.fillStyle = '#1d1410';
  ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.25, s * 0.5, s * 0.42, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(cx + s * 0.35, cy - s * 0.28, cx + s * 0.1, cy - s * 0.33); ctx.quadraticCurveTo(cx - s * 0.2, cy - s * 0.24, cx - s * 0.49, cy - s * 0.18); ctx.closePath(); ctx.fill();
  // brows, eyes
  const lk = o.look || 0;
  ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = s * 0.022; ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + sd * s * 0.1, cy - s * 0.17); ctx.quadraticCurveTo(cx + sd * s * 0.19, cy - s * 0.21 - (o.smile || 0) * s * 0.01, cx + sd * s * 0.28, cy - s * 0.17); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ellipse(ctx, cx + sd * s * 0.19, cy - s * 0.07, s * 0.075, s * 0.045); ctx.fill();
    ctx.fillStyle = '#3a2416'; ellipse(ctx, cx + sd * s * 0.19 + lk * s * 0.02, cy - s * 0.07, s * 0.035, s * 0.04); ctx.fill();
    ctx.fillStyle = '#ffffff'; ellipse(ctx, cx + sd * s * 0.19 + s * 0.012, cy - s * 0.083, s * 0.01, s * 0.01); ctx.fill();
  }
  // nose
  ctx.strokeStyle = css(mixc(shade, '#000000', 0.15)); ctx.lineWidth = s * 0.012;
  ctx.beginPath(); ctx.moveTo(cx - s * 0.01, cy - s * 0.02); ctx.quadraticCurveTo(cx - s * 0.05, cy + s * 0.12, cx - s * 0.045, cy + s * 0.15); ctx.quadraticCurveTo(cx, cy + s * 0.18, cx + s * 0.05, cy + s * 0.15); ctx.stroke();
  // mouth
  const sm = o.smile || 0;
  ctx.strokeStyle = '#9a4a48'; ctx.lineWidth = s * 0.02;
  ctx.beginPath(); ctx.moveTo(cx - s * 0.11, cy + s * 0.29 - sm * s * 0.03); ctx.quadraticCurveTo(cx, cy + s * 0.31 + sm * s * 0.06, cx + s * 0.11, cy + s * 0.29 - sm * s * 0.03); ctx.stroke();
  // pimple
  if (o.spot > 0) {
    const px = cx + s * 0.24, py = cy + s * 0.14;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    spr(ctx, softSprite('#e05a5a'), px, py, s * 0.05 * o.spot, 0.9);
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.fillStyle = css('#d04848', 0.9 * o.spot); ellipse(ctx, px, py, s * 0.012 * o.spot + 1, s * 0.012 * o.spot + 1); ctx.fill();
    ctx.fillStyle = `rgba(255,220,210,${0.7 * o.spot})`; ellipse(ctx, px - s * 0.004, py - s * 0.004, s * 0.004, s * 0.004); ctx.fill();
  }
}

/* skin cross-section with hair follicle + sebaceous gland */
function drawSkinSection(ctx, t, o = {}) {
  const frozen = o.frozen || 0, dry = o.dry || 0, crack = o.crack || 0;
  ctx.fillStyle = '#1a0c10'; ctx.fillRect(0, 0, W, H);
  const top = 760;
  // air
  let g = ctx.createLinearGradient(0, 380, 0, top); g.addColorStop(0, '#0e1a26'); g.addColorStop(1, '#1d2d3a');
  ctx.fillStyle = g; ctx.fillRect(0, 380, W, top - 380);
  // layers
  const surf = (x) => top + Math.sin(x * 0.02) * 10;
  ctx.fillStyle = css(mixc('#f0c4a8', '#d8c0b0', dry));
  ctx.beginPath(); ctx.moveTo(0, surf(0)); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, surf(x)); ctx.lineTo(W, top + 120); ctx.lineTo(0, top + 120); ctx.closePath(); ctx.fill();
  ctx.fillStyle = css(mixc('#e09a8a', '#c9a49a', dry)); ctx.fillRect(0, top + 120, W, 520);
  ctx.fillStyle = '#f2dc9c'; ctx.fillRect(0, top + 640, W, 520);
  for (let i = 0; i < 18; i++) { ctx.strokeStyle = 'rgba(200,170,90,0.6)'; ctx.lineWidth = 3; ellipse(ctx, hash(i) * W, top + 700 + hash(i + 3) * 400, 50, 34); ctx.stroke(); }
  // capillaries
  ctx.strokeStyle = 'rgba(200,40,60,0.6)'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(0, top + 520); ctx.bezierCurveTo(300, top + 420, 700, top + 640, W, top + 500); ctx.stroke();
  // cracks in the surface
  if (crack > 0) {
    ctx.fillStyle = '#1d2d3a';
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 180 + hash(i) * 40, d = 120 * crack * (0.6 + hash(i + 5) * 0.6);
      ctx.beginPath(); ctx.moveTo(x - 18 * crack, surf(x)); ctx.lineTo(x, surf(x) + d); ctx.lineTo(x + 18 * crack, surf(x)); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,240,230,0.7)';
    for (let i = 0; i < 40; i++) { const x = hash(i * 3) * W; ctx.fillRect(x, surf(x) - 6 - hash(i) * 8 * crack, 18, 4); }
  }
  // follicle + hair
  const fx = 540;
  ctx.fillStyle = css(mixc('#c97a6a', '#a99088', dry));
  ctx.beginPath(); ctx.moveTo(fx - 40, surf(fx)); ctx.lineTo(fx - 26, top + 560); ctx.quadraticCurveTo(fx, top + 640, fx + 26, top + 560); ctx.lineTo(fx + 40, surf(fx)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(fx, top + 600); ctx.quadraticCurveTo(fx + 10, top + 200, fx + 60, 420); ctx.stroke();
  // sebaceous glands
  for (const sd of [-1, 1]) {
    const gx = fx + sd * 120, gy = top + 330;
    const col = mixc('#ffd75a', '#a8b4c0', frozen);
    ctx.fillStyle = css(col);
    for (let k = 0; k < 4; k++) { ellipse(ctx, gx + sd * (k % 2) * 40, gy + (k - 1.5) * 44, 50, 36); ctx.fill(); }
    ctx.strokeStyle = css(mixc('#e0a020', '#d8e6f0', frozen)); ctx.lineWidth = 4; ellipse(ctx, gx + sd * 20, gy, 90, 110); ctx.stroke();
    if (frozen > 0.3) {
      ctx.strokeStyle = `rgba(230,245,255,${frozen})`; ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.beginPath(); ctx.moveTo(gx + sd * 20, gy); ctx.lineTo(gx + sd * 20 + Math.cos(a) * 70, gy + Math.sin(a) * 80); ctx.stroke(); }
    }
    // sebum flowing up the follicle (stops when frozen)
    if (frozen < 0.9) for (let k = 0; k < 6; k++) {
      const q = (t * 0.4 + k / 6) % 1;
      const x = lerp(gx, fx + sd * 18, Math.min(1, q * 2)), y = q < 0.5 ? gy : lerp(gy, surf(fx) - 20, (q - 0.5) * 2);
      ctx.fillStyle = `rgba(255,220,90,${(1 - frozen) * 0.9})`; ellipse(ctx, x, y, 12, 12); ctx.fill();
    }
  }
  // sebum film on the surface
  ctx.fillStyle = `rgba(255,220,90,${0.35 * (1 - frozen)})`;
  ctx.beginPath(); ctx.moveTo(0, surf(0) - 10); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, surf(x) - 10); ctx.lineTo(W, surf(W)); ctx.lineTo(0, surf(0)); ctx.closePath(); ctx.fill();
  // evaporating moisture
  if (dry > 0) for (let i = 0; i < 40; i++) {
    const q = (t * 0.5 + hash(i)) % 1;
    const x = hash(i + 7) * W, y = surf(x) - q * 340;
    ctx.fillStyle = `rgba(130,200,255,${dry * (1 - q)})`; ellipse(ctx, x + Math.sin(q * 6 + i) * 10, y, 7, 9); ctx.fill();
  }
  // bacteria drifting in through the cracks
  if (o.bact > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) {
      if (hash(i + 30) > o.bact) continue;
      const tgt = 100 + (i % 6) * 180 + hash(i % 6) * 40;
      const q = (t * 0.22 + hash(i)) % 1;
      const x = lerp(hash(i + 3) * W, tgt, Math.min(1, q * 1.4)), y = q < 0.7 ? lerp(420 + hash(i + 9) * 300, surf(tgt) - 10, q / 0.7) : lerp(surf(tgt), surf(tgt) + 220, (q - 0.7) / 0.3);
      spr(ctx, softSprite('#ff2d40'), x, y, 26, 0.7);
      ctx.save(); ctx.translate(x, y); ctx.rotate(i);
      ctx.fillStyle = 'rgba(255,90,90,0.9)'; rrect(ctx, -14, -6, 28, 12, 6); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(180,160,130,0.6)'; ctx.fillRect(((hash(i) * W + t * 40) % W), 420 + hash(i + 2) * 320, 4, 4); }
  }
  // labels
  hudLabel(ctx, 60, top + 60, 'ЭПИДЕРМИС', { size: 24, weight: 800, color: 'rgba(80,30,30,0.7)', ls: 4 });
  hudLabel(ctx, fx + 230, top + 330, frozen > 0.5 ? 'ТОСНЫ БУЛЧИРХАЙ · ЦАРЦСАН' : 'ТОСНЫ БУЛЧИРХАЙ', { size: 26, weight: 800, color: frozen > 0.5 ? '#cfe6ff' : '#ffe08a', ls: 2, glow: 'rgba(0,0,0,0.6)' });
}

/* skincare products flying into a trash bin */
function drawProducts(ctx, t, p) {
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#e6eef0'); g.addColorStop(1, '#c7d3d8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#eef2f3'; ctx.fillRect(0, 1180, W, 740);
  // bin
  ctx.fillStyle = '#5a6670'; ctx.beginPath(); ctx.moveTo(620, 1250); ctx.lineTo(960, 1250); ctx.lineTo(920, 1780); ctx.lineTo(660, 1780); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#46515a'; rrect(ctx, 600, 1220, 380, 50, 14); ctx.fill();
  const items = [['#ffffff', '#e86a8a', 'SERUM'], ['#9fd8c8', '#2f8f7a', 'CLEAN'], ['#ffe0a0', '#d08a2a', 'GEL'], ['#e0d8ff', '#6a5acd', 'PATCH'], ['#ffd0d0', '#c0392b', 'CREAM']];
  items.forEach(([c1, c2, label], i) => {
    const t0 = i * 0.16, q = clamp((p - t0) / 0.3);
    const sx = 140 + i * 110, sy = 1120;
    const x = lerp(sx, 790, q), y = lerp(sy, 1300, q) - Math.sin(Math.PI * q) * 380;
    ctx.save(); ctx.translate(x, y); ctx.rotate(q * 4 * (i % 2 ? 1 : -1));
    if (q < 1) {
      rrect(ctx, -34, -90, 68, 180, 16); ctx.fillStyle = c1; ctx.fill();
      ctx.fillStyle = c2; ctx.fillRect(-34, -40, 68, 60);
      rrect(ctx, -20, -120, 40, 34, 8); ctx.fill();
      ctx.font = '800 16px Inter'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(label, 0, -4);
    }
    ctx.restore();
  });
}
/* market crash line chart */
function drawCrashChart(ctx, t, p) {
  ctx.fillStyle = '#0b0f17'; ctx.fillRect(0, 0, W, H);
  hudLabel(ctx, W / 2, 560, 'БАТГАНЫ ЭМЧИЛГЭЭНИЙ ЗАХ ЗЭЭЛ', { size: 40, weight: 900, color: '#e5e7eb', align: 'center', ls: 2 });
  const x0 = 120, x1 = 960, yb = 1450, yt = 760;
  ctx.strokeStyle = 'rgba(120,160,255,0.15)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let k = 0; k <= 5; k++) { const y = lerp(yb, yt, k / 5); ctx.moveTo(x0, y); ctx.lineTo(x1, y); } ctx.stroke();
  const n = 80, cut = 0.72;
  ctx.lineWidth = 8; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const q = i / n;
    if (q > Math.max(0.05, p)) break;
    let v = 0.55 + 0.3 * q + 0.04 * Math.sin(q * 30);
    if (q > cut) v = lerp(v, 0.03, E.out(clamp((q - cut) / 0.06)));
    const x = lerp(x0, x1, q), y = lerp(yb, yt, v);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.strokeStyle = p > cut ? '#ef4444' : '#22c55e'; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 20; ctx.stroke(); ctx.shadowBlur = 0;
  const val = p > cut ? lerp(10, 0, E.out(clamp((p - cut) / 0.08))) : 10 + 2 * p;
  hudLabel(ctx, W / 2, 1600, '$' + val.toFixed(1) + ' ТЭРБУМ', { size: 84, weight: 900, color: p > cut ? '#ef4444' : '#22c55e', align: 'center', font: '"JetBrains Mono"', ls: 0 });
}

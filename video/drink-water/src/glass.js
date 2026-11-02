'use strict';
/* CTA: macro of a cold, sweating glass of water with melting ice. */

const GL = { ready: false, cx: W / 2, top: 760, bot: 1490, tw: 252, bw: 214, lvl: 880 };

function glInit() {
  if (GL.ready) return;
  const r = rng(303);
  // background: bright window light, soft bokeh
  const c = makeCanvas(), x = c.getContext('2d');
  let g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#e2f1f9'); g.addColorStop(0.5, '#b4d8ea'); g.addColorStop(0.74, '#8fbfd8'); g.addColorStop(1, '#7eb0ca');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const cl = ['#ffffff', '#cdeeff', '#d9f2dc', '#ffffff', '#b8e4ff'][i % 5];
    spr(x, softSprite(cl), r() * W, 200 + r() * 1100, 80 + r() * 260, 0.25 + r() * 0.35);
  }
  x.globalAlpha = 1;
  // table
  g = x.createLinearGradient(0, 1440, 0, H);
  g.addColorStop(0, '#e9eff2'); g.addColorStop(0.08, '#f7f9fa'); g.addColorStop(1, '#cfd9df');
  x.fillStyle = g; x.fillRect(0, 1452, W, H - 1452);
  g = x.createLinearGradient(0, 1400, 0, 1470);
  g.addColorStop(0, 'rgba(160,190,205,0)'); g.addColorStop(1, 'rgba(160,190,205,0.45)');
  x.fillStyle = g; x.fillRect(0, 1400, W, 60);
  // marble veins
  x.strokeStyle = 'rgba(150,165,175,0.18)'; x.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    let px = r() * W, py = 1470 + r() * 450; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 8; k++) { px += 60 + r() * 80; py += (r() - 0.5) * 50; x.lineTo(px, py); }
    x.stroke();
  }
  GL.bg = c;
  // flipped / magnified copy for refraction through the water
  const f = makeCanvas(), fx = f.getContext('2d');
  fx.translate(GL.cx, 0); fx.scale(-1.35, 1); fx.translate(-GL.cx, 0);
  fx.drawImage(c, 0, -90);
  GL.flip = f;
  // condensation droplets in glass surface coords (u -1..1, v 0..1)
  GL.drops = [];
  for (let i = 0; i < 1100; i++) {
    const big = r() < 0.06;
    GL.drops.push({ u: r() * 2 - 1, v: r(), r: big ? 6 + r() * 7 : 1.4 + r() * r() * 4.5 });
  }
  GL.runs = [];
  for (let i = 0; i < 5; i++) GL.runs.push({ u: -0.7 + i * 0.33 + (r() - 0.5) * 0.1, start: 0.6 + i * 0.9 + r() * 0.5, sp: 0.09 + r() * 0.07, r: 9 + r() * 4 });
  GL.bub = [];
  for (let i = 0; i < 40; i++) GL.bub.push({ u: r() * 1.6 - 0.8, ph: r(), r: 2 + r() * 6, sp: 0.15 + r() * 0.2 });
  GL.ready = true;
}

function glHalfW(y) { return lerp(GL.tw, GL.bw, (y - GL.top) / (GL.bot - GL.top)); }
function glBodyPath(ctx) {
  const { cx, top, bot, tw, bw } = GL;
  ctx.beginPath();
  ctx.moveTo(cx - tw, top);
  ctx.lineTo(cx - bw, bot);
  ctx.ellipse(cx, bot, bw, 30, 0, Math.PI, 0, true);
  ctx.lineTo(cx + tw, top);
  ctx.ellipse(cx, top, tw, 34, 0, 0, Math.PI, true);
  ctx.closePath();
}
function glSurf(u, v) {
  const y = lerp(GL.lvl + 10, GL.bot - 10, v);
  const hw = glHalfW(y);
  return [GL.cx + u * hw * 0.97, y + Math.sqrt(1 - u * u) * 28 * 0.9];
}

function drawIce(ctx, x, y, s, rot, melt, sub) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const rr = s * lerp(0.16, 0.34, melt), hs = s / 2;
  // body
  rrect(ctx, -hs, -hs, s, s, rr);
  let g = ctx.createLinearGradient(-hs, -hs, hs, hs);
  g.addColorStop(0, 'rgba(255,255,255,0.62)'); g.addColorStop(0.5, 'rgba(225,245,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
  // top face
  ctx.beginPath();
  ctx.moveTo(-hs + rr, -hs); ctx.lineTo(hs - rr, -hs); ctx.lineTo(hs - rr * 0.4 - s * 0.12, -hs - s * 0.2); ctx.lineTo(-hs + rr * 1.2 + s * 0.08, -hs - s * 0.2); ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
  // inner cracks / bubbles
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-hs * 0.4, -hs * 0.2); ctx.lineTo(hs * 0.1, hs * 0.15); ctx.lineTo(hs * 0.45, hs * 0.05);
  ctx.moveTo(hs * 0.1, hs * 0.15); ctx.lineTo(-hs * 0.05, hs * 0.55);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const [a, b, c] of [[-0.3, 0.3, 3], [0.25, -0.35, 2.5], [0.35, 0.4, 2]]) { ellipse(ctx, a * hs, b * hs, c, c); ctx.fill(); }
  // submerged part darker/bluer
  if (sub > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(90,170,210,0.18)';
    ctx.fillRect(-s, -hs + s * (1 - sub), 2 * s, 2 * s);
  }
  ctx.restore();
}

function drawGlassScene(ctx, t) {
  glInit();
  const { cx, top, bot, lvl } = GL;
  ctx.drawImage(GL.bg, 0, 0);
  // caustic light on the table
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  let g = ctx.createRadialGradient(cx + 210, 1560, 10, cx + 210, 1560, 300);
  g.addColorStop(0, 'rgba(170,240,255,0.9)'); g.addColorStop(0.5, 'rgba(120,210,255,0.35)'); g.addColorStop(1, 'rgba(120,210,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx + 210, 1560, 300, 62, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const xx = cx + 30 + i * 12, yy = 1530 + k * 14 + Math.sin(i * 0.6 + t * 2 + k) * 6;
      i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  // contact shadow
  ctx.fillStyle = 'rgba(40,70,90,0.22)';
  ellipse(ctx, cx - 30, bot + 14, 250, 26); ctx.fill();
  // ---- glass body
  ctx.save();
  glBodyPath(ctx); ctx.clip();
  // air part
  ctx.drawImage(GL.bg, 0, 0);
  ctx.fillStyle = 'rgba(200,230,245,0.12)'; ctx.fillRect(0, 0, W, H);
  // water part: refracted, flipped background
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, lvl, glHalfW(lvl), 31, 0, Math.PI, 0, true); ctx.lineTo(cx + 400, H); ctx.lineTo(cx - 400, H); ctx.closePath();
  ctx.clip();
  ctx.drawImage(GL.flip, Math.sin(t * 1.2) * 4, 0);
  g = ctx.createLinearGradient(cx - 260, 0, cx + 260, 0);
  g.addColorStop(0, 'rgba(20,100,150,0.55)'); g.addColorStop(0.2, 'rgba(60,165,215,0.24)'); g.addColorStop(0.75, 'rgba(90,185,230,0.18)'); g.addColorStop(1, 'rgba(20,90,140,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createLinearGradient(0, lvl, 0, bot);
  g.addColorStop(0, 'rgba(160,225,250,0.12)'); g.addColorStop(1, 'rgba(40,120,160,0.22)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // bubbles
  for (const b of GL.bub) {
    const ph = (b.ph + t * b.sp) % 1;
    const y = lerp(bot - 40, lvl + 20, ph);
    const x = cx + b.u * glHalfW(y) * 0.85 + Math.sin(t * 3 + b.ph * 9) * 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.4;
    ellipse(ctx, x, y, b.r, b.r); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ellipse(ctx, x - b.r * 0.35, y - b.r * 0.35, b.r * 0.3, b.r * 0.3); ctx.fill();
  }
  ctx.restore();
  // ice cubes
  const melt = seg(t, 0, 7);
  const ice = [[cx - 95, lvl + 18, 150, 0.32], [cx + 85, lvl + 4, 138, -0.22], [cx - 5, lvl + 95, 128, 0.7]];
  for (let i = 0; i < ice.length; i++) {
    const [x, y, s, r0] = ice[i];
    const bob = Math.sin(t * 1.4 + i * 2) * 5;
    drawIce(ctx, x, y + bob, s * (1 - 0.1 * melt), r0 + Math.sin(t * 0.6 + i) * 0.04, melt, i === 2 ? 1 : 0.55);
  }
  // water surface
  ctx.beginPath(); ctx.ellipse(cx, lvl, glHalfW(lvl) - 2, 31, 0, 0, TAU);
  ctx.fillStyle = 'rgba(210,240,252,0.32)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.stroke();
  // frost haze from condensation (cleared along running-drop trails)
  ctx.fillStyle = 'rgba(245,252,255,0.16)';
  ctx.fillRect(0, lvl + 20, W, H);
  ctx.restore();
  // ---- condensation droplets (outside surface)
  ctx.save();
  glBodyPath(ctx); ctx.clip();
  for (const d of GL.drops) {
    const [x, y] = glSurf(d.u, d.v);
    const fs = Math.sqrt(1 - d.u * d.u);
    const r = d.r * (0.4 + 0.6 * fs);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ellipse(ctx, x, y, r * fs + 0.4, r); ctx.fill();
    ctx.strokeStyle = 'rgba(30,80,110,0.32)'; ctx.lineWidth = Math.max(0.8, r * 0.22);
    ctx.beginPath(); ctx.ellipse(x, y, r * fs + 0.4, r, 0, 0.1 * Math.PI, 0.95 * Math.PI); ctx.stroke();
    if (r > 1.6) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; ellipse(ctx, x - r * 0.35 * fs, y - r * 0.4, Math.max(0.6, r * 0.28), Math.max(0.6, r * 0.28)); ctx.fill(); }
  }
  // running drops with clear trails
  for (const rd of GL.runs) {
    const p = clamp((t - rd.start) * rd.sp * (1 + (t - rd.start) * 0.3));
    if (p <= 0) continue;
    const [x0, y0] = glSurf(rd.u, 0.02), [x1, y1] = glSurf(rd.u, 0.02 + p * 0.95);
    const fs = Math.sqrt(1 - rd.u * rd.u);
    g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0.3)');
    ctx.strokeStyle = g; ctx.lineWidth = rd.r * 1.1 * fs; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1 - rd.r); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ellipse(ctx, x1, y1, rd.r * fs, rd.r * 1.25); ctx.fill();
    ctx.strokeStyle = 'rgba(20,70,100,0.45)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(x1, y1, rd.r * fs, rd.r * 1.25, 0, 0.05 * Math.PI, 0.95 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ellipse(ctx, x1 - rd.r * 0.35 * fs, y1 - rd.r * 0.5, rd.r * 0.3, rd.r * 0.3); ctx.fill();
  }
  ctx.restore();
  // ---- glass walls, highlights, rim, base
  ctx.save();
  ctx.lineCap = 'round';
  const side = (sgn) => { ctx.beginPath(); ctx.moveTo(cx + sgn * (GL.tw - 6), top + 6); ctx.lineTo(cx + sgn * (GL.bw - 6), bot - 6); };
  ctx.strokeStyle = 'rgba(40,90,120,0.32)'; ctx.lineWidth = 16; side(-1); ctx.stroke(); side(1); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; side(-1); ctx.stroke(); side(1); ctx.stroke();
  // vertical light strips
  const strip = (u, w, a) => {
    const x0 = cx + u * GL.tw, x1 = cx + u * GL.bw;
    const gg = ctx.createLinearGradient(x0 - w, 0, x0 + w, 0);
    gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, `rgba(255,255,255,${a})`); gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.moveTo(x0 - w, top + 30); ctx.lineTo(x0 + w, top + 30); ctx.lineTo(x1 + w, bot - 40); ctx.lineTo(x1 - w, bot - 40); ctx.closePath(); ctx.fill();
  };
  strip(-0.68, 24, 0.75); strip(-0.52, 6, 0.5); strip(0.8, 7, 0.85);
  // rim
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, top, GL.tw, 34, 0, Math.PI, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(cx, top, GL.tw, 34, 0, 0, Math.PI); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,110,140,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx, top + 4, GL.tw - 6, 31, 0, 0, Math.PI); ctx.stroke();
  // thick base
  ctx.beginPath(); ctx.ellipse(cx, bot - 26, GL.bw - 4, 26, 0, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
  ctx.strokeStyle = 'rgba(40,90,120,0.35)'; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, bot, GL.bw, 30, 0, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  ctx.restore();
  // cold vapour curling off the rim
  const vs = softSprite('#ffffff');
  for (let i = 0; i < 14; i++) {
    const ph = (t * 0.18 + i / 14) % 1;
    const x = cx - 200 + hash(i) * 400 + Math.sin(ph * 5 + i) * 30;
    const y = top - 10 - ph * 220;
    spr(ctx, vs, x, y, 40 + ph * 110, 0.1 * Math.sin(Math.PI * ph));
  }
  ctx.globalAlpha = 1;
}

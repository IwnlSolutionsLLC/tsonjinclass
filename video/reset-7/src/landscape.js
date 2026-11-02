'use strict';
/* Mongolian steppe: sky, sun, distant hills, ground, grass, gers, smoke, dust, mirage. */

const LAND = { ready: false };

function landInit() {
  if (LAND.ready) return;
  const r = rng(7);
  LAND.stripes = [];
  for (let i = 0; i < 150; i++) LAND.stripes.push({ v: r(), tint: r() * 2 - 1, th: 0.4 + r() * 1.4 });
  LAND.patches = [];
  for (let i = 0; i < 70; i++) LAND.patches.push({ u: r() * 1.8 - 0.4, v: Math.pow(r(), 0.8), s: 0.5 + r(), tint: r() });
  LAND.grass = [];
  for (let i = 0; i < 1500; i++) {
    const v = Math.pow(r(), 0.75);
    LAND.grass.push({
      x: -260 + r() * (W + 520), v, len: 0.6 + r() * 0.8, lean: (r() - 0.5) * 0.5,
      ph: r() * TAU, c: (r() * 4) | 0, wb: v < 0.33 ? 0 : v < 0.66 ? 1 : 2,
    });
  }
  LAND.stones = [];
  for (let i = 0; i < 90; i++) LAND.stones.push({ x: r() * W * 1.4 - W * 0.2, v: Math.pow(r(), 0.7), s: 0.5 + r() });
  LAND.dust = [];
  for (let i = 0; i < 120; i++) LAND.dust.push({ x0: r(), y: r(), s: r(), sp: r(), ph: r() * TAU });
  LAND.ready = true;
}

/* palette for a given dryness d (0 fresh summer .. 1 burnt) and sunset amount */
function landPalette(d, sunset = 0) {
  const p = {};
  p.top = mixc(mixc('#1b5fc4', '#7d8792', d), '#1f2440', sunset);
  p.mid = mixc(mixc('#4d97e6', '#b5b2a6', d), '#8c4636', sunset);
  p.hor = mixc(mixc('#d2ebfb', '#f1e4c6', d), '#ff9248', sunset);
  p.mount = mixc(mixc('#7e9fbe', '#b6ab95', d), '#5a2f2c', sunset);
  p.far = mixc(mixc('#bcc27c', '#d6c49a', d), '#7a3d2a', sunset);
  p.near = mixc(mixc('#6d8a34', '#a4865a', d), '#24150f', sunset);
  p.grass = [
    mixc(mixc('#8ea33f', '#b89f6d', d), '#2a1812', sunset),
    mixc(mixc('#c2b45a', '#cdb486', d), '#3b2116', sunset),
    mixc(mixc('#5f7d2c', '#93784f', d), '#1c100b', sunset),
    mixc(mixc('#d8c46e', '#dcc79c', d), '#4a2a1a', sunset),
  ];
  p.sun = mixc(mixc('#ffd36a', '#fff6e2', d), '#ff6a2a', sunset);
  p.gerLit = mixc(mixc('#fbf8f0', '#efe8da', d), '#c9805a', sunset);
  p.gerShade = mixc(mixc('#c4c3bd', '#bdb2a0', d), '#3b2422', sunset);
  p.door = mixc(mixc('#c4572a', '#a8603e', d), '#3a1a12', sunset);
  return p;
}

function applyCam(ctx, cam) {
  if (!cam) return;
  ctx.translate(cam.fx, cam.fy);
  if (cam.rot) ctx.rotate(cam.rot);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.fx + (cam.dx || 0), -cam.fy + (cam.dy || 0));
}
function camPt(cam, x, y) {
  if (!cam) return [x, y];
  let X = (x - cam.fx + (cam.dx || 0)) * cam.z, Y = (y - cam.fy + (cam.dy || 0)) * cam.z;
  if (cam.rot) { const c = Math.cos(cam.rot), s = Math.sin(cam.rot); [X, Y] = [X * c - Y * s, X * s + Y * c]; }
  return [X + cam.fx, Y + cam.fy];
}

function drawSun(ctx, P, pal) {
  const s = P.sun; if (!s) return;
  const harsh = P.harsh || 0, ss = P.sunset || 0;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const R = s.r * (10 + harsh * 7);
  let g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
  g.addColorStop(0, css(pal.sun, 1));
  g.addColorStop(0.1, css(pal.sun, 0.7 + harsh * 0.2));
  g.addColorStop(0.3, css(pal.sun, 0.25 + harsh * 0.2));
  g.addColorStop(0.65, css(pal.sun, 0.07 + harsh * 0.08));
  g.addColorStop(1, css(pal.sun, 0));
  ctx.fillStyle = g;
  ctx.fillRect(s.x - R, s.y - R, R * 2, R * 2);
  ctx.restore();
  ctx.fillStyle = css(mixc(pal.sun, '#ffffff', (0.75 + harsh * 0.2) * (1 - 0.65 * ss)));
  ellipse(ctx, s.x, s.y, s.r, s.r); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  g = ctx.createRadialGradient(s.x, s.y, s.r * 0.6, s.x, s.y, s.r * 2.2);
  g.addColorStop(0, css('#ffffff', 0.55 * (1 - 0.7 * ss))); g.addColorStop(1, css(pal.sun, 0));
  ctx.fillStyle = g; ctx.fillRect(s.x - s.r * 2.2, s.y - s.r * 2.2, s.r * 4.4, s.r * 4.4);
  ctx.restore();
}

function hillY(x, hy, seed, amp, base) {
  const n = fbm(x * 0.0021 + seed, seed, 4) * 0.5 + 0.5;
  return hy - base - amp * n * n;
}

function drawGer(ctx, x, yb, w, pal, o = {}) {
  const hw = w / 2, wallH = w * 0.40, roofH = w * 0.27, topW = w * 0.085;
  const a = o.alpha == null ? 1 : o.alpha;
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  // contact shadow
  ctx.fillStyle = 'rgba(30,20,12,0.28)';
  ellipse(ctx, x + w * 0.16, yb + w * 0.012, w * 0.66, w * 0.055); ctx.fill();
  // wall
  let g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
  g.addColorStop(0, css(pal.gerShade)); g.addColorStop(0.62, css(pal.gerLit)); g.addColorStop(1, css(mixc(pal.gerLit, pal.gerShade, 0.25)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - hw, yb - wallH);
  ctx.lineTo(x + hw, yb - wallH);
  ctx.lineTo(x + hw, yb - w * 0.01);
  ctx.quadraticCurveTo(x, yb + w * 0.05, x - hw, yb - w * 0.01);
  ctx.closePath(); ctx.fill();
  // roof
  g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
  g.addColorStop(0, css(mixc(pal.gerShade, '#000000', 0.08))); g.addColorStop(0.6, css(mixc(pal.gerLit, pal.gerShade, 0.12))); g.addColorStop(1, css(pal.gerShade));
  ctx.fillStyle = g;
  const ry = yb - wallH;
  ctx.beginPath();
  ctx.moveTo(x - hw * 1.05, ry + w * 0.02);
  ctx.quadraticCurveTo(x - hw * 0.55, ry - roofH * 0.7, x - topW, ry - roofH);
  ctx.lineTo(x + topW, ry - roofH);
  ctx.quadraticCurveTo(x + hw * 0.55, ry - roofH * 0.7, x + hw * 1.05, ry + w * 0.02);
  ctx.quadraticCurveTo(x, ry + w * 0.06, x - hw * 1.05, ry + w * 0.02);
  ctx.closePath(); ctx.fill();
  // toono (crown) + ropes
  ctx.fillStyle = css(mixc(pal.gerShade, '#3a2a20', 0.45));
  ellipse(ctx, x, ry - roofH, topW * 1.05, w * 0.018); ctx.fill();
  if (w > 18) {
    ctx.strokeStyle = css(mixc(pal.gerShade, '#5a4430', 0.5), 0.55);
    ctx.lineWidth = Math.max(0.6, w * 0.012);
    for (const f of [0.28, 0.66]) {
      ctx.beginPath(); ctx.moveTo(x - hw, yb - wallH * f); ctx.quadraticCurveTo(x, yb - wallH * f + w * 0.035, x + hw, yb - wallH * f); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x - hw * 0.98, ry + w * 0.015); ctx.quadraticCurveTo(x, ry + w * 0.055, x + hw * 0.98, ry + w * 0.015); ctx.stroke();
  }
  // door
  const dw = w * 0.15, dh = wallH * 0.74;
  ctx.fillStyle = css(o.doorColor || pal.door);
  ctx.fillRect(x - dw / 2 + w * 0.04, yb - dh, dw, dh);
  if (w > 30) {
    ctx.strokeStyle = 'rgba(80,30,10,0.6)'; ctx.lineWidth = w * 0.01;
    ctx.strokeRect(x - dw / 2 + w * 0.04, yb - dh, dw, dh);
  }
  // chimney
  ctx.fillStyle = css(mixc(pal.gerShade, '#202020', 0.5));
  ctx.fillRect(x + w * 0.13, ry - roofH * 0.95, Math.max(1, w * 0.022), roofH * 0.55);
  ctx.restore();
}

function gerSmoke(ctx, x, yTop, w, t, amount, wind = 1, seed = 0) {
  if (amount <= 0.01) return;
  const s = softSprite('#e9e6e0');
  for (let k = 0; k < 16; k++) {
    const ph = (t * 0.22 + k / 16 + hash(seed + k) * 0.05) % 1;
    const xx = x + w * 0.14 - Math.pow(ph, 1.4) * w * 1.6 * wind + Math.sin(ph * 6 + k) * w * 0.05;
    const yy = yTop - ph * w * 1.3;
    spr(ctx, s, xx, yy, w * (0.05 + ph * 0.32), amount * 0.32 * Math.sin(Math.PI * ph));
  }
  ctx.globalAlpha = 1;
}

function roofDust(ctx, x, yTop, w, t, amount, seed = 0) {
  if (amount <= 0.01) return;
  const s = softSprite('#d2b98d');
  for (let k = 0; k < 22; k++) {
    const ph = (t * 0.85 + k / 22 + hash(seed * 3 + k) * 0.3) % 1;
    const xx = x - Math.pow(ph, 1.1) * w * 4.2 + (hash(k + seed) - 0.5) * w * 0.6;
    const yy = yTop + w * 0.05 - ph * w * 0.55 - Math.sin(ph * 3.5) * w * 0.25;
    spr(ctx, s, xx, yy, w * (0.16 + ph * 1.0), amount * 0.62 * Math.sin(Math.PI * Math.min(1, ph * 1.3)));
  }
  ctx.globalAlpha = 1;
}

/* Airborne dust / sand in screen space. dir -1 = blowing left. */
function drawDust(ctx, t, amount, colr = '#cdb187', seed = 0, speed = 1, yMin = 0) {
  if (amount <= 0.01) return;
  landInit();
  const s = softSprite(colr);
  for (let i = 0; i < LAND.dust.length; i++) {
    const p = LAND.dust[i];
    const sp = (220 + p.sp * 800) * speed;
    const span = W + 700;
    const x = ((((p.x0 + seed * 0.37) * span - t * sp) % span) + span) % span - 350;
    const y = yMin + p.y * (H - yMin) + Math.sin(t * 1.3 + p.ph) * 60;
    const r = 30 + p.s * p.s * 220;
    spr(ctx, s, x, y, r, amount * (0.05 + 0.13 * (1 - p.s)));
  }
  // grit streaks
  ctx.globalAlpha = 1;
  ctx.strokeStyle = css(colr, 0.35 * amount);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const p = LAND.dust[i];
    const sp = (900 + p.sp * 1400) * speed;
    const span = W + 400;
    const x = ((((p.ph * 97 + seed) * span - t * sp) % span) + span) % span - 200;
    const y = yMin + ((p.y * 1.7 + 0.31) % 1) * (H - yMin);
    const l = 20 + p.s * 70;
    ctx.moveTo(x, y); ctx.lineTo(x + l, y - l * 0.06);
  }
  ctx.stroke();
}

/*
 P = { t, d, sunset, hy, cam, sun:{x,y,r}, harsh, gers:[{x,w,smoke}], gerAlpha, smoke,
       roofDust, grass (0..1), wind, groundOnly }
*/
function drawLandscape(ctx, P) {
  landInit();
  const pal = landPalette(P.d || 0, P.sunset || 0);
  const hy = P.hy, t = P.t || 0, wind = P.wind == null ? 1 : P.wind;
  ctx.save();
  applyCam(ctx, P.cam);
  // sky
  let g = ctx.createLinearGradient(0, hy - 1200, 0, hy);
  g.addColorStop(0, css(pal.top)); g.addColorStop(0.6, css(pal.mid)); g.addColorStop(1, css(pal.hor));
  ctx.fillStyle = g;
  ctx.fillRect(-W, -H, W * 3, hy + H + 2);
  drawSun(ctx, P, pal);
  // haze band
  g = ctx.createLinearGradient(0, hy - 220, 0, hy + 40);
  g.addColorStop(0, css(pal.hor, 0)); g.addColorStop(1, css(pal.hor, 0.55 + (P.d || 0) * 0.3));
  ctx.fillStyle = g; ctx.fillRect(-W, hy - 220, W * 3, 262);
  // distant hills (two ranges)
  for (let k = 0; k < 2; k++) {
    const colr = mixc(pal.hor, pal.mount, k === 0 ? 0.32 : 0.55);
    ctx.fillStyle = css(colr);
    ctx.beginPath(); ctx.moveTo(-W, hy + 2);
    for (let x = -W; x <= W * 2; x += 14) ctx.lineTo(x, hillY(x, hy, k * 5.3 + 1, k === 0 ? 90 : 46, k === 0 ? 6 : 2));
    ctx.lineTo(W * 2, hy + 2); ctx.closePath(); ctx.fill();
  }
  // ground
  g = ctx.createLinearGradient(0, hy, 0, H + 200);
  g.addColorStop(0, css(mixc(pal.far, pal.hor, 0.35))); g.addColorStop(0.18, css(pal.far)); g.addColorStop(1, css(pal.near));
  ctx.fillStyle = g;
  ctx.fillRect(-W, hy, W * 3, H * 2);
  // ground stripes + patches (perspective texture)
  const gh = H + 220 - hy;
  for (const s of LAND.stripes) {
    const y = hy + gh * Math.pow(s.v, 2.1);
    const th = (2 + 26 * Math.pow(s.v, 1.2)) * s.th;
    ctx.fillStyle = s.tint > 0 ? `rgba(255,240,200,${0.05 * s.tint})` : `rgba(40,30,10,${-0.07 * s.tint})`;
    ctx.fillRect(-W, y, W * 3, th);
  }
  for (const p of LAND.patches) {
    const y = hy + gh * Math.pow(p.v, 2.0);
    const rx = (30 + 420 * p.v * p.v) * p.s, ry = rx * (0.05 + 0.1 * p.v);
    ctx.fillStyle = p.tint > 0.5 ? css(pal.grass[1], 0.22) : css(pal.grass[2], 0.22);
    ellipse(ctx, p.u * W, y, rx, ry); ctx.fill();
  }
  // gers
  if (P.gers) {
    for (let i = 0; i < P.gers.length; i++) {
      const gr = P.gers[i];
      const yb = hy + gr.w * 0.1 + (gr.dy || 0);
      drawGer(ctx, gr.x, yb, gr.w, pal, { alpha: P.gerAlpha == null ? 1 : P.gerAlpha });
      const top = yb - gr.w * 0.67;
      gerSmoke(ctx, gr.x, top, gr.w, t, (gr.smoke == null ? 1 : gr.smoke) * (P.smoke == null ? 1 : P.smoke) * (P.gerAlpha == null ? 1 : P.gerAlpha), wind, i);
      if (P.roofDust) roofDust(ctx, gr.x, yb - gr.w * 0.62, gr.w, t, P.roofDust, i + 1);
    }
  }
  // stones
  ctx.fillStyle = css(mixc(pal.near, '#000000', 0.25), 0.5);
  for (const s of LAND.stones) {
    const y = hy + gh * Math.pow(s.v, 2.0);
    const r = (1 + 9 * s.v * s.v) * s.s;
    ellipse(ctx, s.x, y, r * 1.6, r * 0.6); ctx.fill();
  }
  // grass blades, batched by colour+width
  const gd = P.grass == null ? 1 : P.grass;
  if (gd > 0.01) {
    const wb = [1.1, 2.2, 3.6];
    for (let c = 0; c < 4; c++) {
      for (let b = 0; b < 3; b++) {
        ctx.strokeStyle = css(pal.grass[c], 0.9);
        ctx.lineWidth = wb[b];
        ctx.beginPath();
        for (let i = 0; i < LAND.grass.length; i++) {
          const gb = LAND.grass[i];
          if (gb.c !== c || gb.wb !== b || (i % 100) / 100 > gd) continue;
          const y = hy + (gh - 120) * Math.pow(gb.v, 1.7) + 4;
          const L = (5 + 95 * Math.pow(gb.v, 1.7)) * gb.len;
          const sway = (Math.sin(t * 2.2 + gb.ph + gb.x * 0.004) * 0.25 + noise(t * 0.7 + gb.x * 0.002, 3) * 0.35) * wind;
          const tipX = gb.x + (gb.lean - sway * 0.8) * L, tipY = y - L * (1 - Math.abs(gb.lean) * 0.3);
          ctx.moveTo(gb.x, y);
          ctx.quadraticCurveTo(gb.x + (gb.lean * 0.2 - sway * 0.15) * L, y - L * 0.55, tipX, tipY);
        }
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  return pal;
}

/* Heat shimmer + inferior-mirage reflection, copying src canvas into dctx. */
function mirageCopy(dctx, src, o) {
  dctx.drawImage(src, 0, 0);
  const hy = o.hy, t = o.t;
  if (o.amp > 0.05) {
    const y0 = Math.max(0, Math.floor(hy - o.up)), y1 = Math.min(H, Math.ceil(hy + o.down));
    for (let y = y0; y < y1; y += 2) {
      const k = y < hy ? 1 - (hy - y) / o.up : 1 - (y - hy) / o.down;
      const kk = sstep(clamp(k));
      const dx = o.amp * kk * (Math.sin(y * 0.21 + t * 7.0) + 0.6 * Math.sin(y * 0.073 - t * 4.3));
      const dy = (o.vamp || 0) * kk * Math.sin(y * 0.05 + t * 5.0);
      dctx.drawImage(src, 0, clamp(y + dy, 0, H - 2), W, 2, dx, y, W, 2);
    }
  }
  if (o.refl > 0.01) {
    const rh = o.reflH || 60;
    for (let r = 0; r < rh; r += 2) {
      const a = o.refl * Math.pow(1 - r / rh, 1.3);
      const sy = hy - 3 - r * 0.85;
      if (sy < 0) break;
      const dx = o.amp * 1.5 * Math.sin(r * 0.33 + t * 9) + (o.vamp || 0) * Math.sin(r * 0.11 - t * 3);
      dctx.globalAlpha = a;
      dctx.drawImage(src, 0, sy, W, 2, dx, hy + r, W, 2);
    }
    dctx.globalAlpha = 1;
  }
}

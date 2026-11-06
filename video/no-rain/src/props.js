'use strict';
/* Close-ups and explainer graphics. */

/* ---------- phone + banking app ---------- */
function drawPhone(ctx, cx, cy, s, screen, o = {}) {
  // s = phone height in px; hand from below
  const w = s * 0.49, h = s, r = s * 0.07;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(o.rot || 0);
  // hand
  if (o.hand !== false) {
    const skin = o.skin || '#c48a62';
    ctx.fillStyle = css(mixc(skin, '#000000', 0.12));
    ctx.beginPath(); ctx.moveTo(-w * 0.62, h * 0.18); ctx.quadraticCurveTo(-w * 0.75, h * 0.6, -w * 0.4, h * 1.2); ctx.lineTo(w * 0.55, h * 1.2); ctx.quadraticCurveTo(w * 0.7, h * 0.5, w * 0.56, h * 0.2); ctx.closePath(); ctx.fill();
  }
  // body
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = s * 0.06; ctx.shadowOffsetY = s * 0.02;
  rrect(ctx, -w / 2, -h / 2, w, h, r); ctx.fillStyle = '#111317'; ctx.fill();
  ctx.shadowColor = 'transparent';
  const pad = s * 0.018;
  rrect(ctx, -w / 2 + pad, -h / 2 + pad, w - 2 * pad, h - 2 * pad, r * 0.8);
  ctx.save(); ctx.clip();
  ctx.translate(-w / 2 + pad, -h / 2 + pad);
  screen(ctx, w - 2 * pad, h - 2 * pad);
  ctx.restore();
  // notch + glare
  rrect(ctx, -w * 0.14, -h / 2 + pad * 1.6, w * 0.28, s * 0.022, s * 0.011); ctx.fillStyle = '#0a0b0d'; ctx.fill();
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; rrect(ctx, -w / 2, -h / 2, w, h, r); ctx.fill();
  // thumb
  if (o.hand !== false) {
    ctx.fillStyle = o.skin || '#c48a62';
    ctx.beginPath(); ctx.ellipse(-w * 0.52, h * 0.22, w * 0.12, h * 0.16, -0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.55, h * 0.12, w * 0.08, h * 0.09, 0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.56, h * 0.28, w * 0.08, h * 0.09, 0.3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* banking app screen; p: 0 = original balance, 1 = wiped. kind label/amount */
function appLoan(o) {
  return (ctx, w, h) => {
    const u = w / 100, p = o.p || 0, glitch = o.glitch || 0;
    let g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0f1b2d'); g.addColorStop(1, '#060a12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    hudLabel(ctx, 8 * u, 7 * u, '12:00', { size: 4.6 * u, color: '#dfe6ef', ls: 0 });
    hudLabel(ctx, 92 * u, 7 * u, '5G ▮▮▮', { size: 4 * u, color: '#dfe6ef', ls: 0, align: 'right' });
    hudLabel(ctx, 8 * u, 20 * u, 'БАНК', { size: 8 * u, weight: 900, color: '#ffffff', ls: 1 });
    hudLabel(ctx, 8 * u, 28 * u, 'Миний зээл', { size: 5 * u, weight: 600, color: '#8fa3bb', ls: 0 });
    // card
    rrect(ctx, 6 * u, 36 * u, 88 * u, 66 * u, 5 * u);
    g = ctx.createLinearGradient(0, 36 * u, 0, 102 * u);
    const ok = p > 0.5;
    g.addColorStop(0, ok ? '#0f5132' : '#3a1420'); g.addColorStop(1, ok ? '#0a2e1f' : '#1e0b12');
    ctx.fillStyle = g; ctx.fill();
    hudLabel(ctx, 12 * u, 46 * u, o.kind || 'ЗЭЭЛИЙН ҮЛДЭГДЭЛ', { size: 4.4 * u, weight: 800, color: '#c9d4e2', ls: 1 });
    const amount = ok ? 0 : o.amount;
    const txt = (ok ? '' : '−') + fmtNum(amount) + ' ₮';
    let size = 13 * u;
    ctx.save(); ctx.font = `800 ${size}px Inter`; const tw = ctx.measureText(txt).width; ctx.restore();
    if (tw > 76 * u) size *= (76 * u) / tw;
    const gx = glitch ? (hash(Math.floor(o.t * 50)) - 0.5) * 8 * u * glitch : 0;
    if (glitch) {
      hudLabel(ctx, 12 * u + gx + 1.5 * u, 66 * u, txt, { size, weight: 900, color: 'rgba(255,0,80,0.7)', ls: 0 });
      hudLabel(ctx, 12 * u - gx - 1.5 * u, 66 * u, txt, { size, weight: 900, color: 'rgba(0,220,255,0.7)', ls: 0 });
    }
    hudLabel(ctx, 12 * u + gx, 66 * u, txt, { size, weight: 900, color: ok ? '#4dff9a' : '#ff6b7d', ls: 0, glow: ok ? 'rgba(77,255,154,0.6)' : null });
    hudLabel(ctx, 12 * u, 80 * u, ok ? 'Өр төлбөргүй' : (o.sub || 'Төлөх хугацаа: 20 жил'), { size: 4.4 * u, weight: 600, color: ok ? '#a9f5c9' : '#c99aa4', ls: 0 });
    // progress bar
    rrect(ctx, 12 * u, 88 * u, 76 * u, 3 * u, 1.5 * u); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    rrect(ctx, 12 * u, 88 * u, 76 * u * (ok ? 1 : 0.18), 3 * u, 1.5 * u); ctx.fillStyle = ok ? '#4dff9a' : '#ff6b7d'; ctx.fill();
    if (ok) {
      const a = seg(p, 0.5, 0.8);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#4dff9a'; ellipse(ctx, 50 * u, 130 * u, 14 * u * E.back(a), 14 * u * E.back(a)); ctx.fill();
      ctx.strokeStyle = '#06210f'; ctx.lineWidth = 3 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(43 * u, 130 * u); ctx.lineTo(48 * u, 135 * u); ctx.lineTo(58 * u, 124 * u); ctx.stroke();
      ctx.restore();
      hudLabel(ctx, 50 * u, 155 * u, 'ЗЭЭЛ ХААГДЛАА', { size: 6 * u, weight: 900, color: '#ffffff', align: 'center', alpha: a, ls: 1 });
    } else {
      for (let i = 0; i < 4; i++) {
        rrect(ctx, 6 * u, (112 + i * 18) * u, 88 * u, 14 * u, 3 * u); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
        hudLabel(ctx, 12 * u, (119 + i * 18) * u, ['Сарын төлбөр', 'Хүү', 'Дараагийн төлбөр', 'Торгууль'][i], { size: 4 * u, color: '#8fa3bb', ls: 0 });
        hudLabel(ctx, 88 * u, (119 + i * 18) * u, ['1,250,000 ₮', '1.5%', '25-нд', '0 ₮'][i], { size: 4 * u, weight: 700, color: '#dfe6ef', ls: 0, align: 'right' });
      }
    }
    if (glitch > 0.05) {
      for (let i = 0; i < 6; i++) {
        const y = hash(Math.floor(o.t * 30) + i * 7) * h;
        ctx.fillStyle = `rgba(${i % 2 ? '0,255,200' : '255,40,90'},${0.25 * glitch})`;
        ctx.fillRect(0, y, w, 2 + hash(i + o.t) * 10);
      }
    }
  };
}
/* account locked screen */
function appLocked(o) {
  return (ctx, w, h) => {
    const u = w / 100, a = o.p || 0;
    ctx.fillStyle = '#0d1018'; ctx.fillRect(0, 0, w, h);
    hudLabel(ctx, 8 * u, 7 * u, '13:04', { size: 4.6 * u, color: '#dfe6ef', ls: 0 });
    hudLabel(ctx, 8 * u, 20 * u, 'БАНК', { size: 8 * u, weight: 900, color: '#ffffff', ls: 1 });
    const rows = [['Харилцах данс', '2,840,000 ₮'], ['Хадгаламж', '12,400,000 ₮'], ['Тэтгэврийн хуримтлал', '31,800,000 ₮']];
    rows.forEach(([k, v], i) => {
      const y = (36 + i * 26) * u;
      rrect(ctx, 6 * u, y, 88 * u, 22 * u, 4 * u); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
      hudLabel(ctx, 12 * u, y + 7 * u, k, { size: 4.2 * u, color: '#8fa3bb', ls: 0 });
      const locked = a > 0.25 + i * 0.18;
      hudLabel(ctx, 12 * u, y + 15 * u, v, { size: 7 * u, weight: 800, color: locked ? '#6b7280' : '#ffffff', ls: 0 });
      if (locked) lockIcon(ctx, 84 * u, y + 11 * u, 4.5 * u, '#ff5a5a');
    });
    // withdraw button + error
    const by = 118 * u;
    rrect(ctx, 6 * u, by, 88 * u, 15 * u, 7.5 * u); ctx.fillStyle = a > 0.8 ? '#3a3f4a' : '#2563eb'; ctx.fill();
    hudLabel(ctx, 50 * u, by + 7.5 * u, 'МӨНГӨ ТАТАХ', { size: 5 * u, weight: 800, color: a > 0.8 ? '#8b93a1' : '#ffffff', align: 'center', ls: 1 });
    const ea = seg(a, 0.82, 0.92);
    if (ea > 0) {
      ctx.save(); ctx.globalAlpha = ea;
      rrect(ctx, 6 * u, 145 * u, 88 * u, 40 * u, 5 * u); ctx.fillStyle = '#3a0e14'; ctx.fill();
      ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 0.6 * u; ctx.stroke();
      lockIcon(ctx, 50 * u, 158 * u, 6 * u, '#ff5a5a');
      ctx.restore();
      hudLabel(ctx, 50 * u, 173 * u, 'ДАНС ТҮГЖИГДСЭН', { size: 6 * u, weight: 900, color: '#ff8080', align: 'center', alpha: ea, ls: 1 });
    }
  };
}
function lockIcon(ctx, x, y, s, c) {
  ctx.save();
  ctx.strokeStyle = c; ctx.lineWidth = s * 0.28;
  ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * 0.55, Math.PI, TAU); ctx.stroke();
  ctx.fillStyle = c; rrect(ctx, x - s * 0.85, y - s * 0.3, s * 1.7, s * 1.3, s * 0.2); ctx.fill();
  ctx.restore();
}

/* ---------- card terminal ---------- */
function drawTerminal(ctx, cx, cy, s, state, t) {
  // state: 0 idle, 1 reading, 2 error
  ctx.save(); ctx.translate(cx, cy);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = s * 0.08; ctx.shadowOffsetY = s * 0.03;
  rrect(ctx, -s * 0.32, -s * 0.5, s * 0.64, s, s * 0.08); ctx.fillStyle = '#1e2127'; ctx.fill();
  ctx.shadowColor = 'transparent';
  rrect(ctx, -s * 0.26, -s * 0.44, s * 0.52, s * 0.34, s * 0.03);
  ctx.fillStyle = state === 2 ? '#2a0608' : '#0c1a24'; ctx.fill();
  const u = s / 100;
  if (state === 0) hudLabel(ctx, 0, -s * 0.27, 'КАРТАА УНШУУЛНА УУ', { size: 3.4 * u, weight: 700, color: '#9fd6ff', align: 'center', ls: 0 });
  if (state === 1) {
    hudLabel(ctx, 0, -s * 0.3, 'Холбогдож байна', { size: 3.6 * u, weight: 700, color: '#9fd6ff', align: 'center', ls: 0 });
    for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(159,214,255,${0.3 + 0.7 * (Math.floor(t * 4) % 3 === i)})`; ellipse(ctx, (i - 1) * 5 * u, -s * 0.2, 1.4 * u, 1.4 * u); ctx.fill(); }
  }
  if (state === 2) {
    const bl = Math.sin(t * 10) > -0.3 ? 1 : 0.4;
    ctx.globalAlpha = bl;
    ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 2.2 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5 * u, -s * 0.36); ctx.lineTo(5 * u, -s * 0.26); ctx.moveTo(5 * u, -s * 0.36); ctx.lineTo(-5 * u, -s * 0.26); ctx.stroke();
    hudLabel(ctx, 0, -s * 0.18, 'Сүлжээ тасарсан', { size: 4.4 * u, weight: 900, color: '#ff4d4d', align: 'center', ls: 0, glow: 'rgba(255,60,60,0.7)' });
    ctx.globalAlpha = 1;
  }
  // keypad
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    rrect(ctx, (-17 + c * 12) * u, (-4 + r * 10) * u, 10 * u, 7.5 * u, 1.5 * u);
    ctx.fillStyle = r === 3 && c === 0 ? '#9b2c2c' : r === 3 && c === 2 ? '#2f7d4a' : '#3a3e46'; ctx.fill();
  }
  ctx.restore();
}
function drawCard(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  rrect(ctx, -s / 2, -s * 0.315, s, s * 0.63, s * 0.05);
  const g = ctx.createLinearGradient(-s / 2, 0, s / 2, 0);
  g.addColorStop(0, '#1e40af'); g.addColorStop(1, '#0ea5e9');
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = '#e8c35a'; rrect(ctx, -s * 0.36, -s * 0.12, s * 0.14, s * 0.11, s * 0.015); ctx.fill();
  hudLabel(ctx, -s * 0.38, s * 0.12, '•••• 4821', { size: s * 0.07, color: '#e6f0ff', ls: 2 });
  ctx.restore();
}

/* ---------- ATM wall ---------- */
function drawATMs(ctx, t, o) {
  const n = 5, y = o.y || 640, w = 150, h = 260, gap = 40;
  const x0 = W / 2 - (n * w + (n - 1) * gap) / 2;
  ctx.fillStyle = '#2a2d33'; ctx.fillRect(0, y - 120, W, h + 200);
  ctx.fillStyle = '#1c1e22'; ctx.fillRect(0, y - 120, W, 70);
  hudLabel(ctx, W / 2, y - 85, 'АТМ · 24 ЦАГ', { size: 34, weight: 900, color: o.off > 0.9 ? '#3a3d44' : '#7fd0ff', align: 'center', ls: 6, glow: o.off > 0.9 ? null : 'rgba(127,208,255,0.6)' });
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (w + gap);
    rrect(ctx, x, y, w, h, 12); ctx.fillStyle = '#4a4f58'; ctx.fill();
    const dark = o.off > (i + 1) / (n + 1);
    const flick = !dark && o.off > i / (n + 1) && Math.sin(t * 40 + i) > 0.3;
    rrect(ctx, x + 18, y + 22, w - 36, 100, 6);
    ctx.fillStyle = dark || flick ? '#07080a' : '#1d6fb8'; ctx.fill();
    if (!dark && !flick) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      spr(ctx, softSprite('#4fa8ff'), x + w / 2, y + 72, 120, 0.35); ctx.restore(); ctx.globalAlpha = 1;
      hudLabel(ctx, x + w / 2, y + 72, o.empty ? 'БЭЛЭН МӨНГӨ ДУУССАН' : 'ТАВТАЙ МОРИЛ', { size: 11, weight: 800, color: '#e6f3ff', align: 'center', ls: 0 });
    }
    ctx.fillStyle = '#2a2e34'; ctx.fillRect(x + 30, y + 150, w - 60, 10);
    for (let k = 0; k < 9; k++) { ctx.fillStyle = '#6a707a'; ctx.fillRect(x + 40 + (k % 3) * 24, y + 175 + Math.floor(k / 3) * 20, 18, 12); }
  }
}

/* ---------- supermarket aisle ---------- */
let SHELF = null;
function drawAisle(ctx, t, empty, o = {}) {
  if (!SHELF) {
    const r = rng(66); SHELF = [];
    for (let side = 0; side < 2; side++) for (let row = 0; row < 5; row++) for (let k = 0; k < 14; k++)
      SHELF.push({ side, row, k, c: ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#457b9d', '#8ecae6', '#ffb703', '#6a4c93'][(r() * 8) | 0], gone: r(), h: 0.6 + r() * 0.4 });
  }
  const vx = W / 2, vy = 820;
  ctx.fillStyle = '#e8ecef'; ctx.fillRect(0, 0, W, H);
  // ceiling lights
  for (let i = 0; i < 8; i++) {
    const f = Math.pow(0.78, i), y = vy - 760 * f, ww = 300 * f;
    const on = !(o.flicker && hash(i + Math.floor(t * 12)) < o.flicker * 0.5);
    ctx.fillStyle = on ? 'rgba(255,255,250,0.95)' : 'rgba(120,120,120,0.6)';
    ctx.fillRect(vx - ww / 2, y, ww, 14 * f);
  }
  // floor
  ctx.fillStyle = '#cfd4d8';
  ctx.beginPath(); ctx.moveTo(vx - 30, vy); ctx.lineTo(vx + 30, vy); ctx.lineTo(W + 400, H); ctx.lineTo(-400, H); ctx.closePath(); ctx.fill();
  // shelves: each side is a perspective wall
  for (const side of [-1, 1]) {
    const nearX = side < 0 ? -40 : W + 40, farX = vx + side * 70;
    ctx.fillStyle = '#9aa4ad';
    ctx.beginPath(); ctx.moveTo(nearX, 120); ctx.lineTo(farX, vy - 200); ctx.lineTo(farX, vy + 40); ctx.lineTo(nearX, H - 120); ctx.closePath(); ctx.fill();
    for (let row = 0; row < 5; row++) {
      const fr0 = row / 5, fr1 = (row + 1) / 5;
      for (let k = 0; k < 14; k++) {
        const it = SHELF[(side < 0 ? 0 : 70) + row * 14 + k];
        if (it.gone < empty) continue;
        const a = k / 14, b = (k + 0.8) / 14;
        const P = (q, fr) => {
          const x = lerp(nearX, farX, 1 - Math.pow(1 - q, 1.8));
          const yt = lerp(120, vy - 200, 1 - Math.pow(1 - q, 1.8)), yb = lerp(H - 120, vy + 40, 1 - Math.pow(1 - q, 1.8));
          return [x, lerp(yt, yb, fr)];
        };
        const p1 = P(a, fr1 - 0.02), p2 = P(b, fr1 - 0.02), p3 = P(b, fr1 - 0.02 - 0.15 * it.h), p4 = P(a, fr1 - 0.02 - 0.15 * it.h);
        ctx.fillStyle = it.c; poly(ctx, [p1, p2, p3, p4]); ctx.fill();
      }
      ctx.strokeStyle = '#5d666f'; ctx.lineWidth = 6;
      const s0 = [nearX, lerp(120, H - 120, fr1)], s1 = [farX, lerp(vy - 200, vy + 40, fr1)];
      ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke();
    }
  }
  // shutter coming down
  if (o.shutter > 0) {
    const sh = H * o.shutter;
    ctx.fillStyle = '#7d858c'; ctx.fillRect(0, 0, W, sh);
    ctx.strokeStyle = '#5d646b'; ctx.lineWidth = 4;
    ctx.beginPath(); for (let y = 0; y < sh; y += 26) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
    if (o.shutter > 0.55) {
      const y = sh - 520;
      rrect(ctx, W / 2 - 260, y, 520, 150, 16); ctx.fillStyle = '#b91c1c'; ctx.fill();
      hudLabel(ctx, W / 2, y + 75, 'ХААЛТТАЙ', { size: 76, weight: 900, color: '#ffffff', align: 'center', ls: 6 });
    }
  }
}

/* ---------- construction site ---------- */
function drawConstruction(ctx, t, o = {}) {
  const m = MOODS.gray, hy = 1350;
  drawSky(ctx, hy, m, t, { clouds: 0.4, cloudColor: '#8d9299' });
  drawSkyline(ctx, hy, m, { seed: 9, tall: 240 });
  ctx.fillStyle = '#7d7468'; ctx.fillRect(0, hy, W, H - hy);
  // building skeleton
  const bx = 200, bw = 520, floors = 14, fh = 58;
  ctx.strokeStyle = '#4b5056'; ctx.lineWidth = 10;
  for (let f = 0; f <= floors; f++) { ctx.beginPath(); ctx.moveTo(bx, hy - f * fh); ctx.lineTo(bx + bw, hy - f * fh); ctx.stroke(); }
  for (let c = 0; c <= 6; c++) { ctx.beginPath(); ctx.moveTo(bx + c * bw / 6, hy); ctx.lineTo(bx + c * bw / 6, hy - floors * fh); ctx.stroke(); }
  ctx.fillStyle = 'rgba(160,160,155,0.5)'; ctx.fillRect(bx, hy - 6 * fh, bw, 6 * fh);
  // tower crane
  const cx = 820, top = hy - 1050;
  ctx.strokeStyle = '#e0a020'; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(cx, top); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); for (let y = hy; y > top; y -= 50) { ctx.moveTo(cx - 14, y); ctx.lineTo(cx + 14, y - 50); } ctx.stroke();
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(cx - 640, top); ctx.lineTo(cx + 180, top); ctx.stroke();
  ctx.fillStyle = '#3a3d42'; ctx.fillRect(cx + 100, top - 10, 80, 60);
  const sw = Math.sin(t * 0.8) * 10;
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 400, top); ctx.lineTo(cx - 400 + sw, top + 420); ctx.stroke();
  ctx.fillStyle = '#222'; ctx.fillRect(cx - 412 + sw, top + 420, 24, 30);
  // parked trucks
  for (const [x, c] of [[120, '#c0392b'], [560, '#2c6fbb']]) {
    ctx.fillStyle = c; ctx.fillRect(x, hy + 120, 260, 110); ctx.fillRect(x + 260, hy + 150, 110, 80);
    ctx.fillStyle = '#9fd0ff'; ctx.fillRect(x + 285, hy + 160, 60, 35);
    ctx.fillStyle = '#111'; for (const wx of [x + 50, x + 200, x + 320]) { ellipse(ctx, wx, hy + 240, 30, 30); ctx.fill(); }
  }
}

/* ---------- explainer: bank balance sheet ---------- */
function drawBalance(ctx, t, p) {
  // p 0..1 animation progress
  ctx.fillStyle = '#0b0f17'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,160,255,0.06)'; ctx.lineWidth = 1;
  ctx.beginPath(); for (let x = 0; x < W; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y < H; y += 60) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
  hudLabel(ctx, W / 2, 560, 'БАНКНЫ БАЛАНС', { size: 54, weight: 900, color: '#ffffff', align: 'center', ls: 6 });
  hudLabel(ctx, W / 2, 625, 'Нэг хүний өр = нөгөө хүний хөрөнгө', { size: 32, weight: 600, color: '#9fb3d1', align: 'center', ls: 1 });
  const top = 720, full = 860, bw = 330;
  const loan = 0.85 * (1 - E.inOut(seg(p, 0.15, 0.45)));
  const col = (x, title, segs) => {
    hudLabel(ctx, x + bw / 2, top - 40, title, { size: 34, weight: 800, color: '#cfd8e6', align: 'center', ls: 4 });
    let y = top + full;
    for (const [frac, c, label] of segs) {
      const hgt = Math.abs(frac) * full;
      if (frac >= 0) { y -= hgt; rrect(ctx, x, y, bw, hgt, 10); ctx.fillStyle = c; ctx.fill(); if (hgt > 60) hudLabel(ctx, x + bw / 2, y + hgt / 2, label, { size: 30, weight: 800, color: '#ffffff', align: 'center', ls: 1 }); }
      else { rrect(ctx, x, top + full, bw, hgt, 10); ctx.fillStyle = c; ctx.fill(); hudLabel(ctx, x + bw / 2, top + full + hgt / 2, label, { size: 30, weight: 800, color: '#ffffff', align: 'center', ls: 1 }); }
    }
  };
  col(130, 'ХӨРӨНГӨ', [[0.15, '#64748b', 'Бэлэн · бусад'], [loan, '#2563eb', loan > 0.1 ? 'Олгосон зээл' : '']]);
  // particles: loans evaporating
  const ev = seg(p, 0.15, 0.55);
  if (ev > 0 && ev < 1) {
    for (let i = 0; i < 120; i++) {
      const q = (ev * 1.4 - hash(i) * 0.4);
      if (q <= 0 || q > 1) continue;
      const x = 130 + hash(i + 3) * bw, y = top + full * 0.15 + hash(i + 7) * full * 0.6 - q * 500;
      ctx.fillStyle = `rgba(96,165,250,${1 - q})`; ctx.fillRect(x, y, 10, 10);
    }
  }
  const neg = E.inOut(seg(p, 0.5, 0.7));
  const equity = lerp(0.1, -0.6, neg);
  col(620, 'ӨР ТӨЛБӨР', [[0.9, '#ea580c', 'Хадгаламж'], ...(equity >= 0 ? [[equity, '#16a34a', '']] : [])]);
  if (equity < 0) {
    rrect(ctx, 620, top + full + 20, bw, -equity * 300, 10); ctx.fillStyle = '#b91c1c'; ctx.fill();
    hudLabel(ctx, 620 + bw / 2, top + full + 20 - equity * 150, 'Өөрийн хөрөнгө < 0', { size: 26, weight: 800, color: '#fff', align: 'center', ls: 0 });
  }
  const st = seg(p, 0.72, 0.8);
  if (st > 0) {
    ctx.save(); ctx.translate(W / 2, 1330); ctx.rotate(-0.18); ctx.scale(lerp(1.8, 1, E.out(st)), lerp(1.8, 1, E.out(st))); ctx.globalAlpha = st;
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 12; rrect(ctx, -330, -85, 660, 170, 18); ctx.stroke();
    hudLabel(ctx, 0, 4, 'ДАМПУУРАЛ', { size: 104, weight: 900, color: '#ef4444', align: 'center', ls: 8 });
    ctx.restore();
  }
}

/* ---------- explainer: supply chain breaking ---------- */
function drawChain(ctx, t, p) {
  ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
  const nodes = [['ЗЭЭЛИЙН ШУГАМ', 560], ['ЦАЛИН · ТҮЛШ · ТҮҮХИЙ ЭД', 820], ['ҮЙЛДВЭРЛЭЛ', 1080], ['ТЭЭВЭР · ЛОГИСТИК', 1340], ['ДЭЛГҮҮРИЙН ЛАНГУУ', 1600]];
  nodes.forEach(([label, y], i) => {
    const broken = p > 0.12 + i * 0.16;
    if (i < nodes.length - 1) {
      const y2 = nodes[i + 1][1];
      ctx.strokeStyle = broken ? 'rgba(239,68,68,0.35)' : '#38bdf8'; ctx.lineWidth = 8; ctx.setLineDash(broken ? [14, 18] : []);
      ctx.beginPath(); ctx.moveTo(W / 2, y + 60); ctx.lineTo(W / 2, y2 - 60); ctx.stroke(); ctx.setLineDash([]);
      if (!broken) {
        const fy = lerp(y + 60, y2 - 60, (t * 1.5 + i * 0.3) % 1);
        ctx.fillStyle = '#e0f2fe'; ellipse(ctx, W / 2, fy, 10, 10); ctx.fill();
      } else {
        const my = (y + y2) / 2, s = 26;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(W / 2 - s, my - s); ctx.lineTo(W / 2 + s, my + s); ctx.moveTo(W / 2 + s, my - s); ctx.lineTo(W / 2 - s, my + s); ctx.stroke();
      }
    }
    const dead = p > 0.06 + i * 0.16;
    rrect(ctx, 150, y - 60, W - 300, 120, 24);
    ctx.fillStyle = dead ? '#1f2329' : (i === 0 ? '#1d4ed8' : '#0f2a44'); ctx.fill();
    ctx.strokeStyle = dead ? '#3b3f46' : '#38bdf8'; ctx.lineWidth = 3; ctx.stroke();
    hudLabel(ctx, W / 2, y, label, { size: 38, weight: 800, color: dead ? '#5b616b' : '#ffffff', align: 'center', ls: 2 });
  });
}

/* ---------- treasury + funding ---------- */
function drawTreasury(ctx, t, p) {
  ctx.fillStyle = '#0f0d0c'; ctx.fillRect(0, 0, W, H);
  hudLabel(ctx, W / 2, 560, 'ТӨРИЙН САН', { size: 60, weight: 900, color: '#f5e7c8', align: 'center', ls: 8 });
  const lvl = 1 - E.inOut(seg(p, 0.05, 0.5));
  rrect(ctx, 290, 640, 500, 520, 30); ctx.fillStyle = '#1d1a17'; ctx.fill(); ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 6; ctx.stroke();
  const fh = 480 * lvl;
  rrect(ctx, 310, 1140 - fh, 460, fh, 20); ctx.fillStyle = '#c9a227'; ctx.fill();
  hudLabel(ctx, W / 2, 900, Math.round(lvl * 100) + '%', { size: 110, weight: 900, color: lvl > 0.3 ? '#1d1a17' : '#ef4444', align: 'center', font: '"JetBrains Mono"', ls: 0 });
  const items = [['ЦАГДАА', '#3b82f6'], ['ЭМНЭЛЭГ', '#ef4444'], ['ТӨРИЙН АЛБАН ХААГЧ', '#a3a3a3']];
  items.forEach(([label, c], i) => {
    const y = 1280 + i * 130, cut = p > 0.5 + i * 0.1;
    rrect(ctx, 130, y, W - 260, 104, 20); ctx.fillStyle = cut ? '#2a1214' : '#1c1f24'; ctx.fill();
    ctx.fillStyle = c; ellipse(ctx, 200, y + 52, 26, 26); ctx.fill();
    hudLabel(ctx, 250, y + 52, label, { size: 32, weight: 800, color: '#e5e7eb', ls: 2 });
    if (cut) hudLabel(ctx, W - 160, y + 52, 'ТАСАРСАН', { size: 30, weight: 900, color: '#ef4444', align: 'right', ls: 2 });
    else hudLabel(ctx, W - 160, y + 52, 'санхүүжилт', { size: 26, weight: 600, color: '#9ca3af', align: 'right', ls: 0 });
  });
}

/* ---------- banknotes in the wind ---------- */
function drawBills(ctx, t, amount, o = {}) {
  if (amount <= 0.01) return;
  for (let i = 0; i < 60; i++) {
    const sp = 120 + hash(i) * 320;
    const x = ((hash(i + 1) * 1600 - t * sp) % 1500 + 1500) % 1500 - 200;
    const y = (o.y0 || 300) + hash(i + 2) * (o.h || 1500) + Math.sin(t * 2 + i) * 60;
    if (hash(i + 9) > amount) continue;
    const s = 60 + hash(i + 3) * 70;
    const rot = t * (1 + hash(i + 4) * 2) + i;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, Math.abs(Math.cos(t * 2 + i)) * 0.8 + 0.2);
    ctx.fillStyle = ['#7c9a6a', '#b38a5a', '#6a86a8', '#a86a7a'][i % 4];
    ctx.fillRect(-s / 2, -s * 0.24, s, s * 0.48);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(-s / 2 + 4, -s * 0.24 + 4, s - 8, s * 0.48 - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `800 ${s * 0.2}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(['1000 ₮', '5000 ₮', '10000 ₮', '20000 ₮'][i % 4], 0, 0);
    ctx.restore();
  }
}
function drawPriceTag(ctx, t, p) {
  const price = 2500 * Math.pow(10, E.in2(p) * 4);
  ctx.save();
  ctx.translate(W / 2, 1180); ctx.rotate(-0.05 + Math.sin(t * 3) * 0.01);
  rrect(ctx, -380, -230, 760, 460, 30); ctx.fillStyle = '#fde68a'; ctx.fill();
  ctx.strokeStyle = '#92400e'; ctx.lineWidth = 8; ctx.stroke();
  hudLabel(ctx, 0, -130, 'ТАЛХ · 1 ШИРХЭГ', { size: 46, weight: 900, color: '#78350f', align: 'center', ls: 4 });
  let size = 120;
  const txt = fmtNum(price) + ' ₮';
  ctx.font = `900 ${size}px "JetBrains Mono"`;
  const tw = ctx.measureText(txt).width; if (tw > 680) size *= 680 / tw;
  hudLabel(ctx, 0, 40, txt, { size, weight: 800, color: p > 0.4 ? '#b91c1c' : '#1c1917', align: 'center', font: '"JetBrains Mono"', ls: 0 });
  hudLabel(ctx, 0, 160, p > 0.25 ? 'ҮНЭ ӨДӨР БҮР 10 ДАХИН' : 'өчигдрийн үнэ', { size: 34, weight: 800, color: '#92400e', align: 'center', ls: 2 });
  ctx.restore();
}

/* ---------- police line + flashing lights ---------- */
function drawPolice(ctx, t, y, h) {
  for (let i = -1; i < 12; i++) {
    const x = i * 100 + 30 + Math.sin(t * 2 + i) * 3;
    mini(ctx, x, y, h, { c: '#1e2a44', pants: '#141b2c', hat: '#0f1626', aL: 0.5, aR: 0.5 });
    ctx.fillStyle = 'rgba(160,190,220,0.55)'; rrect(ctx, x - h * 0.2, y - h * 0.72, h * 0.4, h * 0.55, h * 0.04); ctx.fill();
    ctx.strokeStyle = 'rgba(220,235,255,0.8)'; ctx.lineWidth = 3; ctx.stroke();
    hudLabel(ctx, x, y - h * 0.45, 'ЦАГДАА', { size: h * 0.07, weight: 900, color: '#ffffff', align: 'center', ls: 0 });
  }
}
function flashLights(ctx, t, a) {
  if (a <= 0.01) return;
  const ph = Math.floor(t * 4) % 2;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  spr(ctx, softSprite(ph ? '#ff2030' : '#2050ff'), ph ? 120 : W - 120, 900, 900, 0.32 * a);
  ctx.restore(); ctx.globalAlpha = 1;
}

/* ---------- glass office tower ---------- */
function drawTower(ctx, t, off) {
  const m = MOODS.dusk, hy = 1600;
  drawSky(ctx, hy, m, t, {});
  drawSkyline(ctx, hy, m, { seed: 5, tall: 500, lit: 1 - off });
  const x = 290, w = 500, top = 380, floors = 34, fh = (hy - top) / floors;
  let g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#1d2a3a'); g.addColorStop(1, '#2d3f55');
  ctx.fillStyle = g; ctx.fillRect(x, top, w, hy - top);
  for (let f = 0; f < floors; f++) {
    const lit = (1 - f / floors) > off;
    for (let c = 0; c < 8; c++) {
      const on = lit && hash(f * 11 + c) < 0.85;
      ctx.fillStyle = on ? 'rgba(255,224,160,0.9)' : 'rgba(60,80,100,0.6)';
      ctx.fillRect(x + 14 + c * 60, top + f * fh + 6, 50, fh - 12);
    }
  }
  ctx.fillStyle = '#0d1520'; ctx.fillRect(0, hy, W, H - hy);
}

/* ---------- exodus road toward the hills ---------- */
function drawExodus(ctx, t, o = {}) {
  const hy = 980, m = MOODS.dusk;
  drawSky(ctx, hy, m, t, { sun: [760, hy - 40, 70], sunColor: '#ffb070' });
  // hills with gers
  ctx.fillStyle = '#3a2c34';
  ctx.beginPath(); ctx.moveTo(0, hy); ctx.quadraticCurveTo(300, hy - 90, 600, hy - 30); ctx.quadraticCurveTo(850, hy - 100, W, hy - 20); ctx.lineTo(W, hy + 10); ctx.lineTo(0, hy + 10); ctx.closePath(); ctx.fill();
  const pal = { gerLit: mixc('#f4ebe0', '#c99a7a', 0.4), gerShade: '#7a5a5a', door: '#7a2e1a' };
  for (const [x, w] of [[180, 34], [240, 26], [700, 30], [760, 40], [820, 28], [930, 32]]) {
    drawGer(ctx, x, hy - 40 + Math.abs(x - 600) * 0.02, w, pal);
    gerSmoke(ctx, x, hy - 40 - w * 0.67, w, t, 1, 0.7, x);
    glowGer(ctx, x, hy - 40, w, 0.6, t, x);
  }
  ctx.fillStyle = '#4a3a34'; ctx.fillRect(0, hy, W, H - hy);
  // road
  ctx.fillStyle = '#2a2628';
  ctx.beginPath(); ctx.moveTo(W / 2 - 14, hy); ctx.lineTo(W / 2 + 14, hy); ctx.lineTo(W / 2 + 520, H); ctx.lineTo(W / 2 - 520, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(240,220,160,0.6)'; ctx.lineWidth = 6; ctx.setLineDash([60, 60]); ctx.lineDashOffset = -t * 200;
  ctx.beginPath(); ctx.moveTo(W / 2, hy); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
  // cars driving away (tail lights)
  for (let i = 0; i < (o.cars === false ? 0 : 9); i++) {
    const q = ((t * 0.12 + i / 9) % 1);
    const z = 1 - q;
    const y = lerp(hy + 6, H - 100, z * z), s = lerp(14, 240, z * z);
    const x = W / 2 + lerp(4, 230, z * z) * (i % 2 ? 1 : 0.35);
    ctx.fillStyle = ['#5a6370', '#8a3a30', '#2f4f6f', '#6f6a5a'][i % 4];
    rrect(ctx, x - s / 2, y - s * 0.55, s, s * 0.55, s * 0.1); ctx.fill();
    ctx.fillStyle = '#ff3030';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    spr(ctx, softSprite('#ff2020'), x - s * 0.38, y - s * 0.25, s * 0.25, 0.8); spr(ctx, softSprite('#ff2020'), x + s * 0.38, y - s * 0.25, s * 0.25, 0.8);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // people walking with bundles on the roadside
  const nw = o.cars === false ? 26 : 14;
  for (let i = 0; i < nw; i++) {
    const q = ((t * 0.05 + i / nw) % 1), z = 1 - q;
    const y = lerp(hy + 10, H + 40, z * z), h = lerp(10, 300, z * z);
    const x = W / 2 + (i % 2 ? -1 : 1) * lerp(30, o.cars === false ? 380 * (0.3 + hash(i) * 0.9) : 640, z * z);
    mini(ctx, x, y, h, { c: DEELS[i % 6], deel: i % 3 === 0, aL: 0.3, aR: 0.3, walk: t * 5 + i });
    ctx.fillStyle = '#c8b28a'; rrect(ctx, x - h * 0.2, y - h * 0.82, h * 0.4, h * 0.3, h * 0.06); ctx.fill();
  }
}

/* ---------- barter ---------- */
function drawBarter(ctx, t, p) {
  ctx.fillStyle = '#2a1d16'; ctx.fillRect(0, 0, W, H);
  // felt mat
  const g = ctx.createRadialGradient(W / 2, 1100, 100, W / 2, 1100, 900);
  g.addColorStop(0, '#8a6a4a'); g.addColorStop(1, '#3a2a1e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  spr(ctx, softSprite('#ffb060'), W / 2, 700, 700, 0.35); ctx.restore(); ctx.globalAlpha = 1;
  // three people's hands reaching in from the edges (under the goods)
  const slots = [[300, 860], [790, 960], [540, 1460]];
  for (const [x, y, tx, ty, sl] of [[-80, 760, 230, 860, '#5a3a6a'], [W + 80, 860, 860, 960, '#2f4f6f'], [540, H + 80, 540, 1520, '#6a3a2a']]) {
    const ang = Math.atan2(ty - y, tx - x);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const len = Math.hypot(tx - x, ty - y);
    ctx.fillStyle = sl; rrect(ctx, -40, -75, len * 0.55, 150, 40); ctx.fill();
    ctx.fillStyle = '#b98060'; rrect(ctx, len * 0.45, -55, len * 0.55 + 30, 110, 50); ctx.fill();
    ctx.restore();
  }
  // goods change hands in turn
  const sh = Math.floor(p * 3) % 3, k = E.inOut(clamp((p * 3) % 1 * 1.6 - 0.3));
  const items = [['meat', 'МАХ'], ['flour', 'ГУРИЛ'], ['wood', 'ТҮЛЭЭ']];
  items.forEach(([it, label], i) => {
    const a = slots[(i + sh) % 3], b = slots[(i + sh + 1) % 3];
    const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k) - Math.sin(Math.PI * k) * 90;
    drawItem(ctx, it, x, y);
    hudChip(ctx, x, y - 200, label, '#fbbf24', seg(p, 0, 0.06), 30);
  });
  hudLabel(ctx, W / 2, 1830, 'БАРАА СОЛИЛЦОО', { size: 40, weight: 900, color: '#fde68a', align: 'center', ls: 8, alpha: seg(p, 0.05, 0.15) });
}
function drawItem(ctx, it, x, y) {
  ctx.save(); ctx.translate(x, y);
  if (it === 'meat') {
    ctx.fillStyle = '#b3373a'; ellipse(ctx, 0, 0, 120, 80); ctx.fill();
    ctx.fillStyle = '#e8c9b0'; ellipse(ctx, -20, -10, 60, 30, 0.3); ctx.fill();
    ctx.strokeStyle = '#f1e6d6'; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(90, 30); ctx.lineTo(170, 70); ctx.stroke();
  } else if (it === 'flour') {
    ctx.fillStyle = '#efe9dc'; rrect(ctx, -110, -140, 220, 280, 40); ctx.fill();
    ctx.strokeStyle = '#cfc6b2'; ctx.lineWidth = 4; ctx.stroke();
    hudLabel(ctx, 0, 10, 'ГУРИЛ', { size: 46, weight: 900, color: '#7a5a2a', align: 'center', ls: 2 });
    hudLabel(ctx, 0, 60, '25 кг', { size: 30, weight: 700, color: '#9a7a4a', align: 'center', ls: 0 });
  } else {
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#8a5a32' : '#a06a3a'; rrect(ctx, -150, -70 + i * 24, 300, 30, 15); ctx.fill(); ctx.fillStyle = '#e0c090'; ellipse(ctx, 150, -55 + i * 24, 14, 14); ctx.fill(); }
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-40, -80); ctx.lineTo(-40, 90); ctx.moveTo(60, -80); ctx.lineTo(60, 90); ctx.stroke();
  }
  ctx.restore();
}

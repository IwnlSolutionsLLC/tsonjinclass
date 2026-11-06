'use strict';
/* Ulaanbaatar set pieces: sky, Government Palace, Sukhbaatar Square, crowds, people, ger district. */

/* ---------- HUD text ---------- */
function hudLabel(ctx, x, y, text, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 700} ${o.size || 30}px ${o.font || 'Inter'}`;
  ctx.letterSpacing = (o.ls == null ? 3 : o.ls) + 'px';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'middle';
  ctx.fillStyle = o.color || '#ffffff';
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 18; }
  ctx.fillText(text, x, y);
  ctx.restore();
}
function hudChip(ctx, x, y, text, colr, alpha = 1, size = 30) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${size}px Inter`; ctx.letterSpacing = '3px';
  const w = ctx.measureText(text).width + size * 1.6, h = size * 1.9;
  rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = css(mixc(colr, '#000000', 0.55), 0.75); ctx.fill();
  ctx.strokeStyle = css(colr, 0.95); ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = css(mixc(colr, '#ffffff', 0.25)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 2);
  ctx.restore();
}
function fmtNum(n) { return Math.round(n).toLocaleString('en-US'); }

/* ---------- sky + Bogd Khan mountain ---------- */
const MOODS = {
  day: { top: '#2d6fcf', mid: '#7fb3ea', hor: '#e6eef2', mtn: '#7e93a6', city: '#9aa7b2', sun: '#fff2c6' },
  gray: { top: '#59626d', mid: '#8b939b', hor: '#c9c6bd', mtn: '#6f777e', city: '#868b8f', sun: '#f1ece0' },
  storm: { top: '#2b2f38', mid: '#4f5560', hor: '#8d8d88', mtn: '#4b5057', city: '#5c6066', sun: '#d8d2c4' },
  dusk: { top: '#1d2340', mid: '#7a4a5a', hor: '#f08a4b', mtn: '#3a2e3e', city: '#40303a', sun: '#ffb070' },
  night: { top: '#03060f', mid: '#0b1326', hor: '#1a2238', mtn: '#0a0f1c', city: '#0c1220', sun: '#cfd8ff' },
  morning: { top: '#3b78c9', mid: '#9cc2e6', hor: '#f4e6cf', mtn: '#8a96a4', city: '#a7aeb6', sun: '#fff0cf' },
};
function moodMix(a, b, t) {
  const A = MOODS[a], B = MOODS[b], o = {};
  for (const k in A) o[k] = mixc(A[k], B[k], t);
  return o;
}
function drawSky(ctx, hy, m, t, o = {}) {
  let g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, css(m.top)); g.addColorStop(0.65, css(m.mid)); g.addColorStop(1, css(m.hor));
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, hy + 202);
  if (o.stars) {
    const r = rng(17);
    for (let i = 0; i < 220; i++) {
      const x = r() * W, y = r() * hy * 0.9, tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2) + i);
      ctx.fillStyle = `rgba(230,236,255,${o.stars * (0.25 + 0.6 * r()) * tw})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  if (o.sun) {
    const s = softSprite(o.sunColor || '#fff0c8');
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    spr(ctx, s, o.sun[0], o.sun[1], o.sun[2] * 9, 0.55);
    spr(ctx, s, o.sun[0], o.sun[1], o.sun[2] * 2.2, 0.9);
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.fillStyle = css(mixc(m.sun, '#ffffff', 0.5));
    ellipse(ctx, o.sun[0], o.sun[1], o.sun[2], o.sun[2]); ctx.fill();
  }
  if (o.clouds) {
    const cs = softSprite(o.cloudColor || '#3c414b');
    for (let i = 0; i < 26; i++) {
      const x = ((hash(i) * 1600 + t * (12 + hash(i + 3) * 20)) % 1700) - 300;
      const y = hy * (0.08 + hash(i + 7) * 0.55);
      spr(ctx, cs, x, y, 160 + hash(i + 9) * 260, o.clouds * 0.55);
    }
    ctx.globalAlpha = 1;
  }
  // Bogd Khan mountain range behind the city
  ctx.fillStyle = css(m.mtn);
  ctx.beginPath(); ctx.moveTo(-200, hy);
  for (let x = -200; x <= W + 200; x += 16) ctx.lineTo(x, hy - 60 - 120 * Math.pow(Math.max(0, fbm(x * 0.0016 + 4.1, 3, 4) * 0.5 + 0.55), 2));
  ctx.lineTo(W + 200, hy); ctx.closePath(); ctx.fill();
}

/* distant skyline (towers) */
function drawSkyline(ctx, hy, m, o = {}) {
  const r = rng(o.seed || 3);
  const lit = o.lit || 0;
  let x = -100;
  while (x < W + 100) {
    const w = 40 + r() * 90, h = 60 + Math.pow(r(), 2) * (o.tall || 300);
    const c = mixc(m.city, '#000000', r() * 0.18);
    ctx.fillStyle = css(c);
    ctx.fillRect(x, hy - h, w, h);
    if (lit > 0.01) {
      for (let yy = hy - h + 10; yy < hy - 8; yy += 14) {
        for (let xx = x + 6; xx < x + w - 6; xx += 12) {
          if (hash(xx * 7.1 + yy * 3.3) < 0.45 * lit) { ctx.fillStyle = 'rgba(255,214,140,0.85)'; ctx.fillRect(xx, yy, 6, 7); }
        }
      }
    }
    x += w + r() * 10;
  }
}

/* ---------- Government Palace (front elevation) ---------- */
function drawPalace(ctx, cx, by, w, o = {}) {
  const u = w / 100;
  const night = o.night || 0;
  const stone = mixc(mixc('#d9dcdd', '#9da3a8', o.gray || 0), '#141a26', night);
  const shade = mixc(mixc('#a9b0b5', '#7b8389', o.gray || 0), '#0b0f18', night);
  const gap = mixc('#46525e', '#04060b', night);
  // wings
  ctx.fillStyle = css(shade); ctx.fillRect(cx - 50 * u, by - 23 * u, 100 * u, 23 * u);
  ctx.fillStyle = css(stone); ctx.fillRect(cx - 50 * u, by - 24.5 * u, 100 * u, 2 * u);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 26; i++) {
      const x = cx - 48.5 * u + i * 3.75 * u;
      if (Math.abs(x - cx) < 24 * u) continue;
      const lit = night > 0.5 && o.windows && hash(i * 13 + row * 7) < o.windows;
      ctx.fillStyle = lit ? 'rgba(255,200,120,0.9)' : css(gap, 0.85);
      ctx.fillRect(x, by - (20 - row * 6.2) * u, 1.8 * u, 3.6 * u);
    }
  }
  // central block + attic
  ctx.fillStyle = css(stone); ctx.fillRect(cx - 24 * u, by - 36 * u, 48 * u, 36 * u);
  ctx.fillStyle = css(shade); ctx.fillRect(cx - 24 * u, by - 30.5 * u, 48 * u, 2.2 * u);
  // colonnade
  ctx.fillStyle = css(gap); ctx.fillRect(cx - 22 * u, by - 28.3 * u, 44 * u, 27 * u);
  const ncol = 12;
  for (let i = 0; i < ncol; i++) {
    const x = cx - 21.6 * u + i * (43.2 * u / (ncol - 1));
    const g = ctx.createLinearGradient(x - 0.9 * u, 0, x + 0.9 * u, 0);
    g.addColorStop(0, css(shade)); g.addColorStop(0.55, css(stone)); g.addColorStop(1, css(shade));
    ctx.fillStyle = g; ctx.fillRect(x - 0.9 * u, by - 28.3 * u, 1.8 * u, 27.3 * u);
  }
  // steps
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = css(mixc(stone, shade, k * 0.2));
    ctx.fillRect(cx - (26 + k * 1.6) * u, by - (1.2 - k * 0.4) * u + k * 0.8 * u, (52 + k * 3.2) * u, 0.9 * u);
  }
  // statues: Chinggis (centre) and two seated khans, bronze silhouettes
  const bronze = mixc('#4e3c2a', '#05070c', night);
  const seated = (x, s) => {
    ctx.fillStyle = css(mixc(stone, shade, 0.4)); ctx.fillRect(x - 2.6 * s * u, by - 4 * s * u, 5.2 * s * u, 3.6 * s * u);
    ctx.fillStyle = css(bronze);
    ctx.beginPath();
    ctx.moveTo(x - 2.2 * s * u, by - 4 * s * u); ctx.lineTo(x - 2.4 * s * u, by - 7.5 * s * u); ctx.lineTo(x - 1.4 * s * u, by - 11 * s * u);
    ctx.lineTo(x + 1.4 * s * u, by - 11 * s * u); ctx.lineTo(x + 2.4 * s * u, by - 7.5 * s * u); ctx.lineTo(x + 2.2 * s * u, by - 4 * s * u); ctx.closePath(); ctx.fill();
    ellipse(ctx, x, by - 12.2 * s * u, 1.05 * s * u, 1.25 * s * u); ctx.fill();
    ctx.fillRect(x - 1.4 * s * u, by - 13.6 * s * u, 2.8 * s * u, 0.7 * s * u);
  };
  seated(cx, 1.25);
  seated(cx - 16 * u, 0.8);
  seated(cx + 16 * u, 0.8);
  // digital board on the roof
  const bx = cx - 15 * u, bw = 30 * u, byy = by - 43 * u, bh = 6 * u;
  ctx.fillStyle = css(mixc('#1a2028', '#020306', night)); ctx.fillRect(cx - 16 * u, byy - 0.8 * u, 32 * u, bh + 1.6 * u);
  ctx.fillStyle = '#05080c'; ctx.fillRect(bx, byy, bw, bh);
  if (o.board) {
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, byy, bw, bh); ctx.clip();
    ctx.font = `800 ${3.4 * u}px "JetBrains Mono"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = o.boardColor || '#ff4d4d'; ctx.shadowBlur = 2 * u;
    ctx.fillStyle = o.boardColor || '#ff4d4d';
    const gx = o.glitch ? (hash(Math.floor((o.t || 0) * 40)) - 0.5) * 2 * u * o.glitch : 0;
    ctx.fillText(o.board, cx + gx, byy + bh / 2 + 0.2 * u);
    if (o.glitch) { ctx.fillStyle = 'rgba(80,220,255,0.5)'; ctx.fillText(o.board, cx - gx * 1.5, byy + bh / 2); }
    ctx.restore();
  }
  // flags
  for (const fx of [cx - 20 * u, cx + 20 * u]) {
    ctx.strokeStyle = css(shade); ctx.lineWidth = 0.35 * u;
    ctx.beginPath(); ctx.moveTo(fx, by - 36 * u); ctx.lineTo(fx, by - 46 * u); ctx.stroke();
    const wv = Math.sin((o.t || 0) * 3 + fx) * 0.4 * u;
    const fl = [mixc('#c4272f', '#100306', night), mixc('#015197', '#020610', night), mixc('#c4272f', '#100306', night)];
    for (let k = 0; k < 3; k++) { ctx.fillStyle = css(fl[k]); ctx.fillRect(fx + k * 1.6 * u, by - 46 * u + wv * k * 0.3, 1.6 * u, 3.4 * u); }
  }
}

/* ---------- Sukhbaatar equestrian statue ---------- */
function drawSukhbaatar(ctx, x, by, s, colr = '#3c2f22', ped = '#8b8f92') {
  ctx.fillStyle = css(ped);
  ctx.fillRect(x - 0.32 * s, by - 0.42 * s, 0.64 * s, 0.42 * s);
  ctx.fillRect(x - 0.38 * s, by - 0.06 * s, 0.76 * s, 0.06 * s);
  ctx.fillStyle = css(colr); ctx.strokeStyle = css(colr); ctx.lineCap = 'round';
  const y0 = by - 0.42 * s;
  // horse body
  ellipse(ctx, x, y0 - 0.33 * s, 0.32 * s, 0.13 * s); ctx.fill();
  // legs (front left raised)
  ctx.lineWidth = 0.05 * s;
  ctx.beginPath();
  ctx.moveTo(x - 0.2 * s, y0 - 0.25 * s); ctx.lineTo(x - 0.22 * s, y0);
  ctx.moveTo(x + 0.18 * s, y0 - 0.25 * s); ctx.lineTo(x + 0.2 * s, y0);
  ctx.moveTo(x + 0.25 * s, y0 - 0.25 * s); ctx.lineTo(x + 0.36 * s, y0 - 0.2 * s); ctx.lineTo(x + 0.33 * s, y0 - 0.1 * s);
  ctx.moveTo(x - 0.12 * s, y0 - 0.25 * s); ctx.lineTo(x - 0.1 * s, y0);
  ctx.stroke();
  // neck + head
  ctx.lineWidth = 0.1 * s;
  ctx.beginPath(); ctx.moveTo(x + 0.22 * s, y0 - 0.38 * s); ctx.lineTo(x + 0.34 * s, y0 - 0.58 * s); ctx.stroke();
  ctx.lineWidth = 0.07 * s;
  ctx.beginPath(); ctx.moveTo(x + 0.34 * s, y0 - 0.58 * s); ctx.lineTo(x + 0.46 * s, y0 - 0.5 * s); ctx.stroke();
  // tail
  ctx.lineWidth = 0.04 * s;
  ctx.beginPath(); ctx.moveTo(x - 0.3 * s, y0 - 0.38 * s); ctx.quadraticCurveTo(x - 0.45 * s, y0 - 0.3 * s, x - 0.42 * s, y0 - 0.1 * s); ctx.stroke();
  // rider with raised arm
  ctx.lineWidth = 0.09 * s;
  ctx.beginPath(); ctx.moveTo(x + 0.02 * s, y0 - 0.42 * s); ctx.lineTo(x + 0.04 * s, y0 - 0.66 * s); ctx.stroke();
  ellipse(ctx, x + 0.05 * s, y0 - 0.74 * s, 0.05 * s, 0.055 * s); ctx.fill();
  ctx.lineWidth = 0.035 * s;
  ctx.beginPath(); ctx.moveTo(x + 0.06 * s, y0 - 0.62 * s); ctx.lineTo(x + 0.2 * s, y0 - 0.8 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 0.06 * s, y0 - 0.42 * s); ctx.lineTo(x - 0.03 * s, y0 - 0.3 * s); ctx.stroke();
}

/* ---------- plaza ground ---------- */
function drawPlaza(ctx, hy, o = {}) {
  const night = o.night || 0, wet = o.gray || 0;
  let g = ctx.createLinearGradient(0, hy, 0, H);
  g.addColorStop(0, css(mixc(mixc('#c9c4ba', '#9a978f', wet), '#0e131d', night)));
  g.addColorStop(1, css(mixc(mixc('#8f8a80', '#6b6863', wet), '#05080d', night)));
  ctx.fillStyle = g; ctx.fillRect(-200, hy, W + 400, H - hy + 200);
  ctx.strokeStyle = css(mixc('#6e6a62', '#03050a', night), 0.35); ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = -20; i <= 20; i++) { ctx.moveTo(W / 2 + i * 14, hy); ctx.lineTo(W / 2 + i * 260, H + 200); }
  for (let k = 1; k < 22; k++) { const y = hy + (H - hy + 200) * Math.pow(k / 22, 2.2); ctx.moveTo(-200, y); ctx.lineTo(W + 200, y); }
  ctx.stroke();
}

/* ---------- small people ---------- */
const COATS = ['#2f4f7f', '#7a2e3a', '#3d5f45', '#5b4a7a', '#8a6a3a', '#2c2c34', '#a0473a', '#3f6f8f', '#6f6f6f', '#b08a4a', '#4a3a30', '#1f6f6f'];
const DEELS = ['#1f4f9f', '#7a1f3a', '#2f6f4f', '#8f3a1f', '#4a2f7a', '#9f7a1f'];
function mini(ctx, x, y, h, o = {}) {
  const s = h, side = (a, d) => [Math.sin(a) * d, Math.cos(a) * d];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const coat = o.c || '#2f4f7f', skin = o.skin || '#c48a62', dark = o.night ? 1 : 0;
  const shY = y - 0.79 * s;
  // legs
  if (o.deel) {
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.moveTo(x - 0.13 * s, shY); ctx.lineTo(x + 0.13 * s, shY); ctx.lineTo(x + 0.17 * s, y - 0.08 * s); ctx.lineTo(x - 0.17 * s, y - 0.08 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0b040'; ctx.fillRect(x - 0.13 * s, y - 0.52 * s, 0.26 * s, 0.05 * s);
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 0.08 * s;
    ctx.beginPath(); ctx.moveTo(x - 0.06 * s, y - 0.1 * s); ctx.lineTo(x - 0.07 * s, y - 0.01 * s); ctx.moveTo(x + 0.06 * s, y - 0.1 * s); ctx.lineTo(x + 0.07 * s, y - 0.01 * s); ctx.stroke();
  } else {
    const sw = o.walk ? Math.sin(o.walk) * 0.06 * s : 0;
    ctx.strokeStyle = o.pants || '#22283a'; ctx.lineWidth = 0.1 * s;
    ctx.beginPath(); ctx.moveTo(x - 0.05 * s, y - 0.46 * s); ctx.lineTo(x - 0.055 * s + sw, y - 0.01 * s);
    ctx.moveTo(x + 0.05 * s, y - 0.46 * s); ctx.lineTo(x + 0.055 * s - sw, y - 0.01 * s); ctx.stroke();
    ctx.fillStyle = coat;
    rrect(ctx, x - 0.135 * s, shY - 0.02 * s, 0.27 * s, 0.4 * s, 0.07 * s); ctx.fill();
  }
  // arms
  ctx.strokeStyle = coat; ctx.lineWidth = 0.075 * s;
  const aL = o.aL == null ? 0.12 : o.aL, aR = o.aR == null ? 0.12 : o.aR;
  const L = 0.36 * s;
  const ends = [];
  for (const [sd, a] of [[-1, aL], [1, aR]]) {
    const sx = x + sd * 0.12 * s, sy = shY + 0.03 * s;
    const [dx, dy] = side(a, L);
    const ex = sx + sd * dx, ey = sy + dy;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ends.push([ex, ey]);
  }
  ctx.fillStyle = skin;
  for (const [ex, ey] of ends) { ellipse(ctx, ex, ey, 0.04 * s, 0.04 * s); ctx.fill(); }
  // head
  ellipse(ctx, x, y - 0.9 * s, 0.085 * s, 0.095 * s); ctx.fill();
  ctx.fillStyle = o.hair || '#17110d';
  ctx.beginPath(); ctx.ellipse(x, y - 0.92 * s, 0.09 * s, 0.085 * s, 0, Math.PI, TAU); ctx.fill();
  if (o.hat) { ctx.fillStyle = o.hat; ctx.beginPath(); ctx.ellipse(x, y - 0.97 * s, 0.1 * s, 0.06 * s, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(x - 0.12 * s, y - 0.975 * s, 0.24 * s, 0.025 * s); }
  // phone glow in the right hand
  if (o.phone) {
    const [ex, ey] = ends[1];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    spr(ctx, softSprite(o.phoneColor || '#7fd0ff'), ex, ey - 0.06 * s, 0.22 * s, 0.6 * o.phone);
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.fillStyle = o.phoneColor || '#bfe8ff';
    ctx.fillRect(ex - 0.035 * s, ey - 0.12 * s, 0.07 * s, 0.11 * s);
  }
  if (o.dim) { ctx.fillStyle = `rgba(0,0,0,${o.dim})`; }
}

/* deterministic crowd on a plaza; mode: idle | phone | cheer | angry | riot */
let CROWD = null;
function crowdInit() {
  if (CROWD) return CROWD;
  const r = rng(404);
  CROWD = [];
  for (let i = 0; i < 300; i++) {
    CROWD.push({ u: r() * 2.2 - 1.1, v: Math.pow(r(), 0.8), c: COATS[(r() * COATS.length) | 0], ph: r() * TAU, sp: 0.7 + r() * 0.8, hug: r() < 0.12, k: r(), hat: r() < 0.25 ? COATS[(r() * 12) | 0] : null, deel: r() < 0.12 });
  }
  CROWD.sort((a, b) => a.v - b.v);
  return CROWD;
}
function drawCrowd(ctx, t, o) {
  const cr = crowdInit();
  const hy = o.hy, y0 = o.y0 || hy + 30, y1 = o.y1 || H + 120;
  const n = Math.round(cr.length * (o.density == null ? 1 : o.density));
  for (let i = 0; i < cr.length; i++) {
    const p = cr[i];
    if (p.k > n / cr.length) continue;
    const y = lerp(y0, y1, Math.pow(p.v, 1.6));
    const h = lerp(o.hFar || 26, o.hNear || 260, Math.pow(p.v, 1.6));
    const x = W / 2 + p.u * lerp(o.spreadFar || 420, o.spreadNear || 900, p.v) + (o.drift || 0) * Math.sin(t * 0.4 + p.ph) * h * 0.1;
    if (x < -h || x > W + h) continue;
    const op = { c: p.deel ? DEELS[(p.k * 6) | 0] : p.c, hat: p.hat, deel: p.deel, night: o.night };
    const m = o.mode || 'idle';
    const ph = t * 6 * p.sp + p.ph;
    let yy = y;
    if (m === 'phone') { op.phone = 1; op.aR = -0.9 + 0.1 * Math.sin(ph * 0.3); op.aL = 0.15; }
    else if (m === 'cheer') {
      const j = Math.max(0, Math.sin(ph)); yy -= j * h * 0.08;
      op.aL = 2.6 + 0.35 * Math.sin(ph); op.aR = 2.6 + 0.35 * Math.sin(ph + 1); op.phone = p.k < 0.5 ? 1 : 0;
      if (p.hug && p.k > 0.5) { op.aL = 0.15; op.aR = -1.5; }
    } else if (m === 'angry' || m === 'riot') {
      const pump = Math.sin(ph * 1.3);
      op.aR = 2.7 + 0.35 * pump; op.aL = p.k < 0.5 ? 0.25 : 2.5 - 0.3 * pump;
      yy -= Math.max(0, pump) * h * 0.03;
    } else if (m === 'queue') { op.aL = 0.1; op.aR = 0.1 + (p.k < 0.3 ? 0.6 : 0); }
    if (o.tint) op.c = css(mixc(op.c, o.tint[0], o.tint[1]));
    mini(ctx, x, yy, h, op);
    if (m === 'cheer' && p.hug && p.k > 0.5) mini(ctx, x + h * 0.22, yy, h * 0.97, { c: COATS[(p.k * 11) | 0], aL: -1.5, aR: 0.15 });
  }
}

/* side-view runner with a briefcase (facing right) */
function runner(ctx, x, y, h, ph, c = '#22252c') {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const s = h, lean = 0.22;
  const hip = [x, y - 0.5 * s], sh = [x + Math.sin(lean) * 0.32 * s, y - 0.82 * s];
  const leg = (a, k) => {
    const knee = [hip[0] + Math.sin(a) * 0.25 * s, hip[1] + Math.cos(a) * 0.25 * s];
    const b = a - (k > 0 ? 0.9 : 0.1);
    const foot = [knee[0] + Math.sin(b) * 0.25 * s, knee[1] + Math.cos(b) * 0.25 * s];
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
  };
  ctx.strokeStyle = mixcss(c, -0.15); ctx.lineWidth = 0.1 * s;
  leg(Math.sin(ph) * 0.8, Math.cos(ph)); leg(-Math.sin(ph) * 0.8, -Math.cos(ph));
  ctx.strokeStyle = c; ctx.lineWidth = 0.17 * s;
  ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(sh[0], sh[1]); ctx.stroke();
  ctx.lineWidth = 0.07 * s;
  const arm = (a) => { const e = [sh[0] + Math.sin(a) * 0.32 * s, sh[1] + Math.cos(a) * 0.32 * s]; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); return e; };
  arm(Math.sin(ph) * 0.9);
  const hnd = arm(-Math.sin(ph) * 0.9);
  ctx.fillStyle = '#3a2416';
  rrect(ctx, hnd[0] - 0.1 * s, hnd[1], 0.2 * s, 0.14 * s, 0.02 * s); ctx.fill();
  ctx.fillStyle = '#e6e8ea'; ctx.fillRect(sh[0] - 0.02 * s, sh[1] - 0.01 * s, 0.05 * s, 0.12 * s);
  ctx.fillStyle = '#c48a62'; ellipse(ctx, sh[0] + 0.05 * s, sh[1] - 0.1 * s, 0.075 * s, 0.085 * s); ctx.fill();
  ctx.fillStyle = '#15100c'; ctx.beginPath(); ctx.ellipse(sh[0] + 0.04 * s, sh[1] - 0.12 * s, 0.08 * s, 0.07 * s, 0, Math.PI, TAU); ctx.fill();
}
function mixcss(c, k) { return css(k < 0 ? mixc(c, '#000000', -k) : mixc(c, '#ffffff', k)); }

/* ---------- ger district on a hillside ---------- */
let GERD = null;
function gerDistrictInit() {
  if (GERD) return GERD;
  const r = rng(808);
  GERD = [];
  for (let row = 0; row < 7; row++) {
    const y = 760 + row * 170 + row * row * 12;
    const sc = 0.45 + row * 0.16;
    let x = -120 + r() * 80;
    while (x < W + 120) {
      const w = (190 + r() * 110) * sc;
      GERD.push({ row, x, y, w, sc, kind: r() < 0.55 ? 'ger' : 'house', roof: ['#2f7f4f', '#a03a2f', '#2f5f9f', '#6f6f2f'][(r() * 4) | 0], ph: r() * TAU, gate: r() });
      x += w + 10 * sc;
    }
  }
  return GERD;
}
function drawGerDistrict(ctx, t, o = {}) {
  const pl = gerDistrictInit();
  const night = o.night || 0, smoke = o.smoke == null ? 1 : o.smoke;
  const pal = {
    gerLit: mixc('#f4f0e6', '#1c2232', night), gerShade: mixc('#bdb6a8', '#0f1420', night), door: mixc('#c4572a', '#1a0d08', night),
  };
  // hillside ground
  let g = ctx.createLinearGradient(0, 640, 0, H);
  g.addColorStop(0, css(mixc(o.ground || '#a99c80', '#0b0e15', night))); g.addColorStop(1, css(mixc('#6f6450', '#06080c', night)));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-100, 700); ctx.quadraticCurveTo(W * 0.5, 600, W + 100, 660); ctx.lineTo(W + 100, H + 100); ctx.lineTo(-100, H + 100); ctx.closePath(); ctx.fill();
  // power line
  ctx.strokeStyle = css(mixc('#3a3530', '#000000', night), 0.7); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-50, 820); ctx.quadraticCurveTo(W * 0.5, 880, W + 50, 800); ctx.stroke();
  for (const row of [0, 1, 2, 3, 4, 5, 6]) {
    const items = pl.filter((p) => p.row === row);
    for (const p of items) {
      const fenceH = 70 * p.sc, plotY = p.y;
      // building inside plot
      if (p.kind === 'ger') {
        drawGer(ctx, p.x + p.w * 0.45, plotY - 8 * p.sc, 120 * p.sc, pal);
        const top = plotY - 8 * p.sc - 120 * p.sc * 0.67;
        gerSmoke(ctx, p.x + p.w * 0.45, top, 120 * p.sc, t, smoke, 0.8, p.ph * 10);
        if (o.glow) glowGer(ctx, p.x + p.w * 0.45, plotY - 8 * p.sc, 120 * p.sc, o.glow * (0.5 + 0.5 * hash(p.ph * 9)), t, p.ph);
      } else {
        const hx = p.x + p.w * 0.25, hw = 130 * p.sc, hh = 80 * p.sc;
        ctx.fillStyle = css(mixc('#d8cfc0', '#121722', night)); ctx.fillRect(hx, plotY - hh - 6 * p.sc, hw, hh);
        ctx.fillStyle = css(mixc(p.roof, '#05070c', night));
        ctx.beginPath(); ctx.moveTo(hx - 10 * p.sc, plotY - hh - 6 * p.sc); ctx.lineTo(hx + hw / 2, plotY - hh - 50 * p.sc); ctx.lineTo(hx + hw + 10 * p.sc, plotY - hh - 6 * p.sc); ctx.closePath(); ctx.fill();
        const lit = o.glow && hash(p.ph * 5) < 0.7;
        ctx.fillStyle = lit ? `rgba(255,170,80,${0.55 + 0.35 * o.glow * (0.8 + 0.2 * Math.sin(t * 7 + p.ph))})` : css(mixc('#4a5560', '#05070c', night));
        ctx.fillRect(hx + hw * 0.2, plotY - hh * 0.75, hw * 0.22, hh * 0.3); ctx.fillRect(hx + hw * 0.6, plotY - hh * 0.75, hw * 0.22, hh * 0.3);
        ctx.fillStyle = css(mixc('#5a5048', '#05070c', night)); ctx.fillRect(hx + hw * 0.7, plotY - hh - 46 * p.sc, 8 * p.sc, 30 * p.sc);
        gerSmoke(ctx, hx + hw * 0.66, plotY - hh - 50 * p.sc, 100 * p.sc, t, smoke, 0.8, p.ph * 7);
      }
      // wooden fence (хашаа)
      ctx.fillStyle = css(mixc('#8a6a48', '#0d0f15', night));
      ctx.fillRect(p.x, plotY - fenceH, p.w, fenceH);
      ctx.strokeStyle = css(mixc('#5d4630', '#05070b', night), 0.8); ctx.lineWidth = Math.max(1, 2 * p.sc);
      ctx.beginPath();
      for (let k = p.x; k < p.x + p.w; k += 16 * p.sc) { ctx.moveTo(k, plotY - fenceH); ctx.lineTo(k, plotY); }
      ctx.stroke();
      // gate
      ctx.fillStyle = css(mixc(p.gate < 0.5 ? '#3f6f9f' : '#9f3f2f', '#05070b', night));
      ctx.fillRect(p.x + p.w * 0.66, plotY - fenceH * 1.05, p.w * 0.16, fenceH * 1.05);
    }
  }
}
function glowGer(ctx, x, yb, w, a, t, ph) {
  if (a <= 0.01) return;
  const fl = 0.8 + 0.2 * Math.sin(t * 9 + ph * 5) * Math.sin(t * 5.3 + ph);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  spr(ctx, softSprite('#ff9a3a'), x + w * 0.04, yb - w * 0.2, w * 0.55, 0.5 * a * fl);
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(255,190,90,${0.85 * a * fl})`;
  ctx.fillRect(x - w * 0.075 + w * 0.04, yb - w * 0.3, w * 0.15, w * 0.29);
}

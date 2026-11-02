'use strict';
/* Macro blood vessel, holographic kidney + brain, ECG monitor. */

/* ---------------- blood vessel ---------------- */
const VES = { ready: false, R: 330 };
const VP = [[-300, 360], [380, 470], [620, 1500], [1380, 1560]];
function vesPt(s) {
  const u = 1 - s;
  const a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
  return [a * VP[0][0] + b * VP[1][0] + c * VP[2][0] + d * VP[3][0], a * VP[0][1] + b * VP[1][1] + c * VP[2][1] + d * VP[3][1]];
}
function vesTan(s) {
  const p = vesPt(s - 0.002), q = vesPt(s + 0.002);
  const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy);
  return [dx / l, dy / l];
}

function rbcSprite(blur) {
  const key = 'rbc' + blur;
  if (_spr[key]) return _spr[key];
  const S = 160, c = makeCanvas(S, S), x = c.getContext('2d'), r = S / 2 - 10;
  x.translate(S / 2, S / 2);
  if (blur) x.filter = `blur(${blur}px)`;
  let g = x.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ff6b6b'); g.addColorStop(0.55, '#d01c2c'); g.addColorStop(0.86, '#a30d1d'); g.addColorStop(1, '#5c0610');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
  // concave centre
  g = x.createRadialGradient(r * 0.05, r * 0.08, 0, 0, 0, r * 0.55);
  g.addColorStop(0, 'rgba(90,0,12,0.75)'); g.addColorStop(0.7, 'rgba(120,5,20,0.25)'); g.addColorStop(1, 'rgba(120,5,20,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, r * 0.6, 0, TAU); x.fill();
  // rim highlight
  x.strokeStyle = 'rgba(255,170,160,0.55)'; x.lineWidth = r * 0.1;
  x.beginPath(); x.arc(0, 0, r * 0.78, Math.PI * 1.05, Math.PI * 1.6); x.stroke();
  x.strokeStyle = 'rgba(255,200,190,0.35)'; x.lineWidth = r * 0.05;
  x.beginPath(); x.arc(0, 0, r * 0.4, Math.PI * 0.1, Math.PI * 0.6); x.stroke();
  return (_spr[key] = c);
}

function vesInit() {
  if (VES.ready) return;
  const r = rng(21);
  VES.cells = [];
  for (let i = 0; i < 330; i++) {
    VES.cells.push({
      s0: r() * 1.25 - 0.12, rr: (r() * 2 - 1) * 0.9, z: r(), ph: r() * TAU, tw: 0.5 + r() * 1.6,
      grp: (i / 6) | 0, gi: i % 6, sz: 0.85 + r() * 0.3, keep: r(),
    });
  }
  for (const c of VES.cells) c.lead = VES.cells[c.grp * 6];
  VES.cells.sort((a, b) => a.z - b.z);
  VES.mol = [];
  for (let i = 0; i < 46; i++) VES.mol.push({ s0: r(), rr: (r() * 2 - 1) * 0.85, ph: r() * TAU, rot: r() * TAU, z: r() });
  VES.bok = [];
  for (let i = 0; i < 40; i++) VES.bok.push({ x: r() * W, y: r() * H, r: 30 + r() * 160, a: 0.04 + r() * 0.1, c: r() });
  VES.bg = {};
  VES.ready = true;
}

function vesBackground(thick) {
  const key = thick ? 'thick' : 'norm';
  if (VES.bg[key]) return VES.bg[key];
  const c = makeCanvas(), x = c.getContext('2d');
  let g = x.createRadialGradient(W * 0.55, H * 0.45, 50, W / 2, H / 2, H * 0.8);
  g.addColorStop(0, thick ? '#3a0c0a' : '#4a0916'); g.addColorStop(1, thick ? '#0c0302' : '#0d0105');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // tissue bokeh
  for (const b of VES.bok) {
    const s = softSprite(b.c < 0.5 ? '#ff4060' : '#ff9a7a');
    spr(x, s, b.x, b.y, b.r, b.a);
  }
  x.globalAlpha = 1;
  // background capillaries
  const r = rng(4);
  x.lineCap = 'round';
  for (let k = 0; k < 7; k++) {
    let px = r() * W, py = r() * H, a = r() * TAU;
    const pts = [[px, py]];
    for (let i = 0; i < 9; i++) { a += (r() - 0.5) * 0.9; px += Math.cos(a) * 120; py += Math.sin(a) * 120; pts.push([px, py]); }
    x.strokeStyle = 'rgba(200,40,60,0.18)'; x.lineWidth = 34 + r() * 30;
    smoothPath(x, pts, false); x.stroke();
    x.strokeStyle = 'rgba(255,120,120,0.08)'; x.lineWidth = 10;
    smoothPath(x, pts, false); x.stroke();
  }
  // vessel wall + lumen (layered strokes give a cylindrical look)
  const path = () => { x.beginPath(); x.moveTo(VP[0][0], VP[0][1]); x.bezierCurveTo(VP[1][0], VP[1][1], VP[2][0], VP[2][1], VP[3][0], VP[3][1]); };
  const R = VES.R;
  const layers = thick
    ? [[2 * R + 90, 'rgba(150,55,50,0.55)'], [2 * R + 40, 'rgba(190,90,80,0.7)'], [2 * R, '#4a120c'], [1.6 * R, '#5e180e'], [1.0 * R, '#6a2212'], [0.45 * R, '#74301a']]
    : [[2 * R + 90, 'rgba(210,70,95,0.5)'], [2 * R + 40, 'rgba(240,130,140,0.65)'], [2 * R, '#7a0c1c'], [1.6 * R, '#8e1424'], [1.0 * R, '#a01e2c'], [0.45 * R, '#ad2a34']];
  for (const [w, cl] of layers) { x.strokeStyle = cl; x.lineWidth = w; path(); x.stroke(); }
  // endothelial nuclei along walls
  for (let i = 0; i < 70; i++) {
    const s = i / 70, p = vesPt(s), t = vesTan(s);
    for (const side of [-1, 1]) {
      const d = (R + 18) * side;
      x.fillStyle = thick ? 'rgba(220,140,110,0.35)' : 'rgba(255,170,170,0.35)';
      ellipse(x, p[0] - t[1] * d, p[1] + t[0] * d, 22, 8, Math.atan2(t[1], t[0])); x.fill();
    }
  }
  return (VES.bg[key] = c);
}

/* thick: 0 healthy flow .. 1 dehydrated (dense, clumped, slow) */
function drawVessel(ctx, t, o = {}) {
  vesInit();
  const thick = o.thick || 0, R = VES.R;
  ctx.drawImage(vesBackground(thick > 0.5), 0, 0);
  const n = Math.round(lerp(150, 330, thick));
  const sharp = rbcSprite(0), soft = rbcSprite(7), vsoft = rbcSprite(14);
  const speed = lerp(0.075, 0.012, thick);
  const flow = o.flow == null ? speed * t : o.flow;
  for (let i = 0; i < VES.cells.length; i++) {
    const c = VES.cells[i];
    if (c.keep * 330 >= n) continue;
    const lam = 1 - 0.55 * c.rr * c.rr;
    let s = c.s0 + flow * lam;
    let rr = c.rr;
    if (thick > 0.01) {
      // rouleaux: cells of one group slide onto their leader and stack
      const lead = c.lead;
      const k = clamp(thick * 1.3 - 0.1);
      s = lerp(s, lead.s0 + flow + c.gi * 0.012, k);
      rr = lerp(rr, lead.rr * 0.9, k);
    }
    s = ((s + 0.15) % 1.35 + 1.35) % 1.35 - 0.15;
    const p = vesPt(s), tg = vesTan(s);
    const wob = Math.sin(t * c.tw + c.ph) * 10 * (1 - thick);
    const d = rr * R * 0.92 + wob;
    const x = p[0] - tg[1] * d, y = p[1] + tg[0] * d;
    const size = 56 * c.sz * (0.62 + 0.75 * c.z) * (o.scale || 1);
    const ang = Math.atan2(tg[1], tg[0]);
    let flip = Math.abs(Math.cos(c.ph + t * c.tw * (1 - thick * 0.9)));
    flip = lerp(0.3 + 0.7 * flip, 0.3, clamp(thick * 1.2));
    const sp = c.z < 0.12 || c.z > 0.94 ? vsoft : c.z < 0.25 || c.z > 0.85 ? soft : sharp;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang + (thick > 0.4 ? 0 : c.ph));
    ctx.scale(thick > 0.4 ? flip : 1, thick > 0.4 ? 1 : flip);
    ctx.globalAlpha = lerp(0.55, 1, c.z) * (thick > 0.5 ? 0.92 : 1);
    ctx.drawImage(sp, -size, -size, size * 2, size * 2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // water molecules
  const nm = Math.round(lerp(46, 8, thick));
  const glow = softSprite('#5fe0ff');
  for (let i = 0; i < nm; i++) {
    const m = VES.mol[i];
    const s = ((m.s0 + flow * 0.8) % 1.2) - 0.1;
    const p = vesPt(s), tg = vesTan(s);
    const d = m.rr * R * 0.85 + Math.sin(t * 1.7 + m.ph) * 25;
    const x = p[0] - tg[1] * d + Math.sin(t * 2.3 + m.ph * 3) * 12, y = p[1] + tg[0] * d + Math.cos(t * 1.9 + m.ph) * 12;
    const sc = 0.8 + m.z * 0.7, a = lerp(0.9, 0.35, thick);
    spr(ctx, glow, x, y, 38 * sc, 0.35 * a);
    const rot = m.rot + t * 0.8;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#bff3ff';
    for (const k of [-1, 1]) {
      const aa = rot + k * 0.91;
      ellipse(ctx, x + Math.cos(aa) * 15 * sc, y + Math.sin(aa) * 15 * sc, 6 * sc, 6 * sc); ctx.fill();
    }
    ctx.fillStyle = '#39c6ff';
    ellipse(ctx, x, y, 10 * sc, 10 * sc); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ellipse(ctx, x - 3 * sc, y - 3 * sc, 3 * sc, 3 * sc); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // murky plasma overlay when thick
  if (thick > 0.01) {
    ctx.fillStyle = `rgba(70,30,10,${0.22 * thick})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ---------------- hologram backdrop ---------------- */
function holoBg(ctx, t, tint = '#0affd6', warn = 0) {
  let g = ctx.createRadialGradient(W / 2, H * 0.5, 60, W / 2, H * 0.5, H * 0.75);
  g.addColorStop(0, css(mixc('#062a36', '#2a0a0e', warn))); g.addColorStop(1, css(mixc('#01070c', '#080102', warn)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = css(tint, 0.06); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 60) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = 0; y <= H; y += 60) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke();
  // scan bar
  const sy = ((t * 520) % (H + 400)) - 200;
  g = ctx.createLinearGradient(0, sy - 120, 0, sy + 10);
  g.addColorStop(0, css(tint, 0)); g.addColorStop(1, css(tint, 0.08));
  ctx.fillStyle = g; ctx.fillRect(0, sy - 120, W, 130);
  // specks
  const r = rng(12);
  ctx.fillStyle = css(tint, 0.25);
  for (let i = 0; i < 80; i++) {
    const x = r() * W, y = (r() * H - t * (10 + r() * 30) + H) % H;
    ctx.fillRect(x, y, 2, 2);
  }
}

function hudLabel(ctx, x, y, text, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 700} ${o.size || 30}px Inter`;
  ctx.letterSpacing = (o.ls == null ? 4 : o.ls) + 'px';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color || '#bffcf0';
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 18; }
  ctx.fillText(text, x, y);
  ctx.restore();
}
function hudChip(ctx, x, y, text, colr, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '800 28px Inter'; ctx.letterSpacing = '3px';
  const w = ctx.measureText(text).width + 44;
  rrect(ctx, x - w / 2, y - 26, w, 52, 26);
  ctx.fillStyle = css(colr, 0.16); ctx.fill();
  ctx.strokeStyle = css(colr, 0.9); ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = css(colr); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

/* ---------------- kidney ---------------- */
function kidneyPath(ctx, cx, cy, s, flip) {
  const f = flip ? -1 : 1;
  const P = (x, y) => [cx + x * s * f, cy + y * s];
  ctx.beginPath();
  let p = P(0.05, -1); ctx.moveTo(p[0], p[1]);
  const C = (a, b, c, d, e, g) => { const A = P(a, b), B = P(c, d), D = P(e, g); ctx.bezierCurveTo(A[0], A[1], B[0], B[1], D[0], D[1]); };
  C(-0.55, -1.02, -0.74, -0.3, -0.69, 0.05);
  C(-0.64, 0.56, -0.4, 1.0, 0.05, 0.98);
  C(0.36, 0.96, 0.43, 0.6, 0.3, 0.32);
  C(0.17, 0.12, 0.17, -0.12, 0.3, -0.3);
  C(0.45, -0.62, 0.38, -0.98, 0.05, -1);
  ctx.closePath();
}
function drawKidney(ctx, cx, cy, s, flip, t, o) {
  const colr = o.color;
  const f = flip ? -1 : 1;
  ctx.save();
  // body glow
  kidneyPath(ctx, cx, cy, s, flip);
  let g = ctx.createRadialGradient(cx - 0.2 * s * f, cy - 0.3 * s, s * 0.1, cx, cy, s * 1.1);
  g.addColorStop(0, css(colr, 0.55)); g.addColorStop(0.7, css(colr, 0.2)); g.addColorStop(1, css(colr, 0.08));
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = css(colr); ctx.shadowBlur = 30;
  ctx.strokeStyle = css(mixc(colr, '#ffffff', 0.35)); ctx.lineWidth = 4; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.clip();
  // rotating wireframe: latitude ellipses + moving meridians
  ctx.strokeStyle = css(colr, 0.45); ctx.lineWidth = 1.6;
  const rot = t * 0.9;
  for (let k = -5; k <= 5; k++) {
    const y = cy + k * s * 0.18;
    ctx.beginPath(); ctx.ellipse(cx, y, s * 0.8, s * 0.07 * (0.4 + 0.6 * Math.abs(Math.cos(rot))), 0, 0, TAU); ctx.stroke();
  }
  for (let m = 0; m < 7; m++) {
    const u = ((m / 7 + rot * 0.12) % 1) * 2 - 1;
    const x = cx + u * s * 0.75;
    ctx.globalAlpha = 1 - Math.abs(u) * 0.7;
    ctx.beginPath(); ctx.moveTo(x, cy - s); ctx.quadraticCurveTo(x - u * s * 0.35, cy, x, cy + s); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // pyramids
  ctx.fillStyle = css(colr, 0.22);
  ctx.strokeStyle = css(colr, 0.7); ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = -1.25 + i * 0.5;
    const ox = cx + (-0.42 * Math.cos(a)) * s * f, oy = cy + Math.sin(a) * 0.72 * s;
    const ix = cx + 0.12 * s * f, iy = cy + Math.sin(a) * 0.2 * s;
    ctx.beginPath();
    ctx.moveTo(ox - 0.06 * s * f, oy - 0.1 * s); ctx.lineTo(ix, iy); ctx.lineTo(ox + 0.04 * s * f, oy + 0.12 * s); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // renal pelvis + ureter
  ctx.strokeStyle = css(colr, 0.85); ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + 0.2 * s * f, cy); ctx.quadraticCurveTo(cx + 0.45 * s * f, cy + 0.2 * s, cx + 0.4 * s * f, cy + 0.6 * s);
  ctx.lineTo(cx + 0.55 * s * f, cy + 2.2 * s); ctx.stroke();
}

function drawKidneyScene(ctx, t, o = {}) {
  const warn = o.warn || 0;
  holoBg(ctx, t, '#2af5ff', warn * 0.3);
  const cx = W / 2, cy = 1060;
  const cyan = '#3ff4ff', amber = '#ffb02e';
  // torso outline
  ctx.save();
  ctx.strokeStyle = 'rgba(80,240,255,0.22)'; ctx.lineWidth = 3;
  smoothPath(ctx, [[cx - 330, 520], [cx - 300, 760], [cx - 255, 1080], [cx - 290, 1380], [cx - 320, 1560]], false); ctx.stroke();
  smoothPath(ctx, [[cx + 330, 520], [cx + 300, 760], [cx + 255, 1080], [cx + 290, 1380], [cx + 320, 1560]], false); ctx.stroke();
  // ribs
  ctx.strokeStyle = 'rgba(80,240,255,0.12)'; ctx.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    const y = 600 + i * 62;
    ctx.beginPath(); ctx.moveTo(cx - 20, y); ctx.quadraticCurveTo(cx - 300, y + 10, cx - 270 + i * 6, y + 120); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 20, y); ctx.quadraticCurveTo(cx + 300, y + 10, cx + 270 - i * 6, y + 120); ctx.stroke();
  }
  // spine
  for (let i = 0; i < 16; i++) {
    const y = 560 + i * 62;
    rrect(ctx, cx - 28, y, 56, 46, 12);
    ctx.fillStyle = 'rgba(80,240,255,0.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(80,240,255,0.32)'; ctx.lineWidth = 2; ctx.stroke();
  }
  // aorta (red) + vena cava (blue) + renal vessels
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,70,90,0.7)'; ctx.lineWidth = 20;
  ctx.beginPath(); ctx.moveTo(cx - 52, 520); ctx.lineTo(cx - 52, 1600); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,140,255,0.7)';
  ctx.beginPath(); ctx.moveTo(cx + 52, 520); ctx.lineTo(cx + 52, 1600); ctx.stroke();
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(255,70,90,0.7)';
  ctx.beginPath(); ctx.moveTo(cx - 52, cy + 6); ctx.lineTo(cx - 175, cy + 20); ctx.moveTo(cx - 52, cy - 20); ctx.lineTo(cx + 140, cy - 18); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,140,255,0.7)';
  ctx.beginPath(); ctx.moveTo(cx + 52, cy + 26); ctx.lineTo(cx - 170, cy + 40); ctx.moveTo(cx + 52, cy - 2); ctx.lineTo(cx + 175, cy - 4); ctx.stroke();
  ctx.restore();
  // bladder
  ctx.save();
  ctx.strokeStyle = 'rgba(80,240,255,0.6)'; ctx.lineWidth = 3;
  ellipse(ctx, cx, 1500, 110, 70); ctx.stroke();
  ctx.fillStyle = `rgba(255,214,80,${0.12 + 0.2 * (o.urine || 0)})`; ctx.fill();
  ctx.restore();
  // kidneys
  const blink = warn * (0.5 + 0.5 * Math.sign(Math.sin(t * TAU * 3)));
  const kc = mixc(cyan, amber, blink);
  const sc = 1 + 0.03 * Math.sin(t * 6) * warn;
  drawKidney(ctx, cx - 250, cy + 30, 165 * sc, false, t, { color: kc });
  drawKidney(ctx, cx + 250, cy, 165 * sc, true, t, { color: kc });
  // water drops pulled into the kidneys
  const pull = o.pull || 0;
  if (pull > 0.01) {
    const glow = softSprite('#4fd2ff');
    for (let i = 0; i < 70; i++) {
      const side = i % 2 ? 1 : -1;
      const ph = (t * 0.55 + hash(i) * 1.0) % 1;
      const ang = hash(i + 50) * TAU;
      const rad = lerp(520, 40, E.in2(ph));
      const tx = cx + side * 250, ty = cy + (side < 0 ? 30 : 0);
      const x = tx + Math.cos(ang) * rad, y = ty + Math.sin(ang) * rad * 0.9;
      const a = pull * Math.sin(Math.PI * ph);
      spr(ctx, glow, x, y, 26, a * 0.6);
      ctx.globalAlpha = a; ctx.fillStyle = '#bff2ff';
      ellipse(ctx, x, y, 6, 6); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // labels
  const la = o.labels || 0;
  ctx.save();
  ctx.globalAlpha = la;
  ctx.strokeStyle = css(kc, 0.9); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 330, cy - 120); ctx.lineTo(cx - 400, cy - 260); ctx.lineTo(cx - 470, cy - 260); ctx.stroke();
  ctx.fillStyle = css(kc); ellipse(ctx, cx - 330, cy - 120, 6, 6); ctx.fill();
  ctx.restore();
  hudLabel(ctx, cx - 470, cy - 300, 'БӨӨР', { size: 44, weight: 800, color: css(kc), alpha: la, glow: css(kc, 0.6) });
  hudLabel(ctx, cx - 470, cy - 250, 'KIDNEY · 3D SCAN', { size: 20, weight: 600, color: 'rgba(190,250,255,0.6)', alpha: la, ls: 5 });
  if (o.chip > 0) hudChip(ctx, cx, 1720, 'УС ХЭМНЭХ ГОРИМ', blink > 0.5 ? amber : cyan, o.chip);
}

/* ---------------- brain ---------------- */
const HEAD_PROFILE = [
  [-170, 470], [-185, 300], [-245, 170], [-300, 20], [-305, -170], [-250, -330], [-120, -420], [40, -420], [180, -350],
  [262, -220], [285, -110], [278, -60], [330, 30], [350, 55], [300, 92], [306, 140], [292, 168], [300, 205], [282, 250],
  [262, 300], [180, 330], [120, 360], [110, 470],
];
let BRAIN_GYRI = null;
function brainGyri() {
  if (BRAIN_GYRI) return BRAIN_GYRI;
  const r = rng(8); BRAIN_GYRI = [];
  for (let i = 0; i < 46; i++) {
    let x = -260 + r() * 500, y = -340 + r() * 380, a = r() * TAU;
    const pts = [[x, y]];
    for (let k = 0; k < 7; k++) { a += (r() - 0.5) * 2.4; x += Math.cos(a) * 38; y += Math.sin(a) * 38; pts.push([x, y]); }
    BRAIN_GYRI.push(pts);
  }
  return BRAIN_GYRI;
}
function brainPath(ctx) {
  smoothPath(ctx, [[-250, -60], [-262, -190], [-200, -310], [-70, -372], [80, -366], [195, -295], [245, -170], [235, -50], [170, 20], [40, 30], [-60, 20], [-150, 40], [-225, 10]]);
}
function drawBrainScene(ctx, t, o = {}) {
  const shrink = o.shrink || 0, warn = o.warn || 0;
  holoBg(ctx, t, '#ff7ad9', 0.35 + warn * 0.4);
  const cx = W / 2 + 10, cy = 1110, S = 1.15;
  const pink = '#ff6ec7', cyan = '#58f0ff', red = '#ff3a4a';
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(S, S);
  // head
  ctx.strokeStyle = 'rgba(88,240,255,0.45)'; ctx.lineWidth = 3;
  smoothPath(ctx, HEAD_PROFILE, false); ctx.stroke();
  ctx.fillStyle = 'rgba(88,240,255,0.04)'; ctx.fill();
  // skull
  ctx.strokeStyle = 'rgba(220,250,255,0.55)'; ctx.lineWidth = 12;
  smoothPath(ctx, [[-268, -40], [-280, -200], [-215, -340], [-75, -400], [85, -394], [210, -318], [262, -180], [255, -40], [180, 40], [40, 55], [-80, 50], [-180, 70], [-252, 40]]);
  ctx.stroke();
  // gap glow (brain pulling away from the skull)
  if (shrink > 0.01) {
    ctx.save();
    ctx.shadowColor = red; ctx.shadowBlur = 40;
    ctx.strokeStyle = css(red, 0.5 * shrink + 0.3 * warn * (0.5 + 0.5 * Math.sin(t * 14))); ctx.lineWidth = 10 + 30 * shrink;
    smoothPath(ctx, [[-245, -45], [-255, -195], [-195, -320], [-70, -380], [80, -374], [195, -300], [245, -170], [238, -50], [170, 28], [40, 40], [-60, 32], [-155, 52], [-230, 22]]);
    ctx.stroke();
    ctx.restore();
  }
  // brain
  const bs = 1 - 0.12 * shrink;
  ctx.save();
  ctx.translate(-5, -170); ctx.scale(bs, bs); ctx.translate(5, 170);
  brainPath(ctx);
  let g = ctx.createRadialGradient(-30, -220, 20, -10, -160, 300);
  g.addColorStop(0, css(pink, 0.5)); g.addColorStop(1, css(pink, 0.12));
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = pink; ctx.shadowBlur = 24;
  ctx.strokeStyle = css(mixc(pink, '#ffffff', 0.3)); ctx.lineWidth = 3.5; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.save(); ctx.clip();
  ctx.strokeStyle = css(pink, 0.6 - shrink * 0.15); ctx.lineWidth = 3;
  for (const pts of brainGyri()) { smoothPath(ctx, pts, false); ctx.stroke(); }
  ctx.restore();
  // cerebellum
  ctx.beginPath(); ctx.ellipse(-170, 70, 85, 55, 0.25, 0, TAU);
  ctx.fillStyle = css(pink, 0.22); ctx.fill(); ctx.strokeStyle = css(pink, 0.8); ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = css(pink, 0.45); ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(-170, 70 + i * 16, 75 - Math.abs(i) * 10, 8, 0.25, 0, Math.PI); ctx.stroke(); }
  // brain stem
  ctx.strokeStyle = css(pink, 0.6); ctx.lineWidth = 34; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-60, 40); ctx.quadraticCurveTo(-80, 150, -110, 300); ctx.stroke();
  ctx.restore();
  // inward arrows
  if (shrink > 0.05) {
    ctx.strokeStyle = css(red, 0.85 * Math.min(1, shrink * 2)); ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (const [x, y, a] of [[-330, -180, 0], [330, -170, Math.PI], [0, -470, Math.PI / 2], [-240, -390, Math.PI / 4], [240, -380, Math.PI * 0.75]]) {
      const k = 18 * Math.sin(t * 6);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.translate(k, 0);
      ctx.beginPath(); ctx.moveTo(-30, -18); ctx.lineTo(0, 0); ctx.lineTo(-30, 18); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
  // microscope inset: brain cells losing water
  const ia = o.inset || 0;
  if (ia > 0.01) {
    const ix = 800, iy = 1600, ir = 170;
    ctx.save();
    ctx.globalAlpha = ia;
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU);
    ctx.fillStyle = 'rgba(30,5,20,0.85)'; ctx.fill();
    ctx.save(); ctx.clip();
    const cells = [[-70, -50], [60, -70], [0, 40], [-95, 85], [100, 60], [20, -150], [-140, -20]];
    for (let i = 0; i < cells.length; i++) {
      const [x, y] = cells[i];
      const rr = 62 * (1 - 0.38 * shrink);
      ctx.beginPath();
      for (let k = 0; k <= 28; k++) {
        const a = (k / 28) * TAU;
        const bump = 1 + shrink * 0.16 * Math.sin(a * 7 + i * 2) + shrink * 0.08 * Math.sin(a * 11 + i);
        const px = ix + x + Math.cos(a) * rr * bump, py = iy + y + Math.sin(a) * rr * bump;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = css(mixc('#ff8fd8', '#c0607a', shrink), 0.35); ctx.fill();
      ctx.strokeStyle = css(pink, 0.9); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = css(mixc('#ffc4ef', '#ff6080', shrink), 0.85);
      ellipse(ctx, ix + x + 6, iy + y - 4, 16 * (1 - 0.2 * shrink), 14 * (1 - 0.2 * shrink)); ctx.fill();
      // water leaving the cell
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.8 + k / 3 + i * 0.13) % 1;
        const a = i * 1.7 + k * 2.1;
        const d = rr + ph * 70;
        ctx.globalAlpha = ia * shrink * Math.sin(Math.PI * ph);
        ctx.fillStyle = '#7fe6ff';
        ellipse(ctx, ix + x + Math.cos(a) * d, iy + y + Math.sin(a) * d, 6, 6); ctx.fill();
      }
      ctx.globalAlpha = ia;
    }
    ctx.restore();
    ctx.strokeStyle = css(cyan, 0.85); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.stroke();
    ctx.restore();
    hudLabel(ctx, ix, iy + ir + 40, 'ЭС УСГҮЙЖИЖ АГШИНА', { size: 24, color: css(cyan), alpha: ia, align: 'center', ls: 3 });
  }
  const la = o.labels || 0;
  hudLabel(ctx, 80, 1470, 'ТАРХИ', { size: 46, weight: 800, color: css(pink), alpha: la, glow: css(pink, 0.6) });
  hudLabel(ctx, 80, 1518, 'BRAIN · VOLUME SCAN', { size: 20, weight: 600, color: 'rgba(255,210,240,0.6)', alpha: la, ls: 5 });
  if (la > 0) {
    const pct = (100 - 6 * shrink).toFixed(1);
    hudLabel(ctx, 80, 1610, 'ЭЗЛЭХҮҮН', { size: 22, color: 'rgba(255,210,240,0.7)', alpha: la, ls: 4 });
    hudLabel(ctx, 80, 1662, pct + '%', { size: 54, weight: 800, color: shrink > 0.3 ? red : '#ffd1f0', alpha: la });
  }
}

/* ---------------- ECG ---------------- */
const BPM_KEYS = [[0, 72], [19.9, 74], [20.0, 92], [27.0, 118], [30, 124], [34, 128], [41.5, 120], [43.2, 92], [44.8, 60], [45.8, 40], [46.3, 30]];
const FLAT_T = 46.35;
function bpmAt(t) {
  if (t <= BPM_KEYS[0][0]) return BPM_KEYS[0][1];
  for (let i = 1; i < BPM_KEYS.length; i++) {
    if (t <= BPM_KEYS[i][0]) {
      const [t0, b0] = BPM_KEYS[i - 1], [t1, b1] = BPM_KEYS[i];
      return lerp(b0, b1, (t - t0) / (t1 - t0));
    }
  }
  return BPM_KEYS[BPM_KEYS.length - 1][1];
}
const ECG = { dt: 1 / 600, ph: null };
function ecgTable() {
  if (ECG.ph) return ECG.ph;
  const n = Math.ceil(70 / ECG.dt);
  const ph = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) ph[i] = ph[i - 1] + (bpmAt((i - 1) * ECG.dt) / 60) * ECG.dt;
  return (ECG.ph = ph);
}
function beatPhase(t) {
  const ph = ecgTable();
  const f = clamp(t / ECG.dt, 0, ph.length - 2), i = Math.floor(f);
  return lerp(ph[i], ph[i + 1], f - i);
}
function pqrst(f) {
  const g = (c, w, a) => a * Math.exp(-(((f - c) / w) ** 2));
  return g(0.1, 0.025, 0.12) + g(0.2, 0.01, -0.12) + g(0.235, 0.012, 1) + g(0.27, 0.012, -0.28) + g(0.47, 0.045, 0.3);
}
function ecgVal(t) {
  if (t >= FLAT_T) return (noise(t * 40, 9) * 0.008);
  const ph = beatPhase(t);
  const amp = t > 43 ? lerp(1, 0.55, seg(t, 43, FLAT_T)) : 1;
  return pqrst(ph - Math.floor(ph)) * amp;
}
function beatTimes(t0, t1) {
  const out = [];
  for (let t = t0; t < Math.min(t1, FLAT_T); t += ECG.dt) {
    const a = beatPhase(t) - 0.235, b = beatPhase(t + ECG.dt) - 0.235;
    if (Math.floor(b) > Math.floor(a)) out.push(t + ECG.dt);
  }
  return out;
}
function beatPulse(t) {
  if (t >= FLAT_T) return 0;
  const ph = beatPhase(t) - 0.235;
  const f = ph - Math.floor(ph);
  return Math.exp(-f * 9);
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.0, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.0, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
  ctx.closePath();
}

function drawECG(ctx, t, x, y, w, h, o = {}) {
  const a = o.alpha == null ? 1 : o.alpha;
  if (a <= 0.01) return;
  const flat = t >= FLAT_T;
  const green = flat ? '#ff3b3b' : '#3dff8f';
  ctx.save();
  ctx.globalAlpha = a;
  rrect(ctx, x, y, w, h, 26);
  ctx.fillStyle = 'rgba(2,10,8,0.62)'; ctx.fill();
  ctx.strokeStyle = css(green, 0.35); ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); rrect(ctx, x, y, w, h, 26); ctx.clip();
  ctx.strokeStyle = css(green, 0.08); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = x; gx < x + w; gx += 30) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let gy = y; gy < y + h; gy += 30) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  // trace
  const tx = x + 24, tw = w - (o.compact ? 200 : 240), base = y + h * 0.62, amp = h * 0.42;
  const span = 2.6, N = 220;
  ctx.strokeStyle = green; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.shadowColor = green; ctx.shadowBlur = 14;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const tau = t - span * (1 - i / N);
    const yy = base - ecgVal(tau) * amp;
    const xx = tx + (tw * i) / N;
    i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
  }
  ctx.stroke();
  ctx.fillStyle = '#eafff2';
  ellipse(ctx, tx + tw, base - ecgVal(t) * amp, 6, 6); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  // readout
  const rx = x + w - (o.compact ? 160 : 190);
  const bp = beatPulse(t);
  ctx.fillStyle = css(flat ? '#ff3b3b' : '#ff4d5e');
  heartPath(ctx, rx + 22, y + 52, 18 * (1 + 0.25 * bp)); ctx.fill();
  ctx.font = '800 22px Inter'; ctx.letterSpacing = '3px'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(220,255,235,0.75)';
  ctx.fillText('BPM', rx + 52, y + 52);
  ctx.font = `800 ${o.compact ? 76 : 92}px "JetBrains Mono"`; ctx.letterSpacing = '0px';
  ctx.fillStyle = flat ? '#ff3b3b' : (bpmAt(t) > 105 ? '#ffd24a' : '#eafff2');
  const v = flat ? '0' : String(Math.round(bpmAt(t)));
  if (!flat || Math.sin(t * TAU * 1.6) > -0.2) ctx.fillText(v, rx, y + h * 0.62);
  ctx.restore();
}

'use strict';
/* Bedroom, neuron network, dopamine gauge, eye macro, bed (top view), café profiles, walking, synapse. */

function hudChip(ctx, x, y, text, colr, alpha = 1, size = 30) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${size}px Inter`; ctx.letterSpacing = '3px';
  const w = ctx.measureText(text).width + size * 1.6, h = size * 1.9;
  rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = css(mixc(colr, '#000000', 0.6), 0.78); ctx.fill();
  ctx.strokeStyle = css(colr, 0.95); ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = css(mixc(colr, '#ffffff', 0.25)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 2);
  ctx.restore();
}
function neonText(ctx, x, y, text, size, colr, alpha = 1, weight = 900) {
  hudLabel(ctx, x, y, text, { size, weight, color: css(mixc(colr, '#ffffff', 0.35)), align: 'center', ls: 2, alpha, glow: css(colr, 0.9) });
}

/* ---------- bedroom ---------- */
// o: day (0 night .. 1 morning), curtain (0 closed .. 1 open), phone (glow 0..1), lamp
function drawRoom(ctx, t, o = {}) {
  const day = o.day || 0;
  const wall = mixc('#0b1020', '#d9cbb8', day), wall2 = mixc('#05070f', '#b8a996', day);
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, css(wall)); g.addColorStop(1, css(wall2));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // window
  const wx = 560, wy = 470, ww = 420, wh = 560;
  g = ctx.createLinearGradient(0, wy, 0, wy + wh);
  g.addColorStop(0, css(mixc('#07122a', '#9fd0ff', day))); g.addColorStop(1, css(mixc('#141c38', '#ffe2b0', day)));
  ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
  if (day < 0.5) {
    const r = rng(3);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${(1 - day * 2) * 0.6 * r()})`; ctx.fillRect(wx + r() * ww, wy + r() * wh * 0.7, 2, 2); }
    ctx.fillStyle = `rgba(30,40,70,${1 - day * 2})`;
    for (let i = 0; i < 6; i++) { const bh = 80 + hash(i) * 200; ctx.fillRect(wx + i * 72, wy + wh - bh, 60, bh); }
    for (let i = 0; i < 30; i++) { if (hash(i * 3) < 0.5) { ctx.fillStyle = `rgba(255,200,120,${0.7 * (1 - day * 2)})`; ctx.fillRect(wx + (i % 6) * 72 + 10 + (i % 3) * 14, wy + wh - 40 - Math.floor(i / 6) * 30, 8, 10); } }
  } else {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    spr(ctx, softSprite('#fff1c8'), wx + ww * 0.7, wy + 120, 260, (day - 0.5) * 2);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = css(mixc('#1a2034', '#f4efe6', day)); ctx.lineWidth = 16;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh * 0.45); ctx.lineTo(wx + ww, wy + wh * 0.45); ctx.stroke();
  // curtains
  const open = o.curtain == null ? 0.25 : o.curtain;
  const cw = lerp(ww * 0.52, ww * 0.12, open);
  ctx.fillStyle = css(mixc('#141a34', '#6a7fa8', day));
  for (const [x0, dir] of [[wx - 40, 1], [wx + ww + 40, -1]]) {
    ctx.beginPath(); ctx.moveTo(x0, wy - 50);
    ctx.lineTo(x0 + dir * (cw + 40), wy - 50);
    for (let k = 0; k <= 10; k++) ctx.lineTo(x0 + dir * (cw + 40) + Math.sin(k * 1.3 + t) * 8, wy - 50 + k * (wh + 120) / 10);
    ctx.lineTo(x0, wy + wh + 70); ctx.closePath(); ctx.fill();
  }
  // sun shafts in the morning
  if (day > 0.5) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const a = (day - 0.5) * 2 * (0.4 + 0.6 * open);
    for (let i = 0; i < 4; i++) {
      g = ctx.createLinearGradient(wx, wy, wx - 400, H);
      g.addColorStop(0, `rgba(255,220,150,${0.22 * a})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(wx + 40 + i * 90, wy + 20); ctx.lineTo(wx + 100 + i * 90, wy + 20); ctx.lineTo(wx - 300 + i * 140, H); ctx.lineTo(wx - 420 + i * 140, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // poster + shelf
  ctx.fillStyle = css(mixc('#141a2a', '#8a5a4a', day)); ctx.fillRect(110, 560, 260, 340);
  ctx.fillStyle = css(mixc('#1c2236', '#e0b070', day)); ctx.fillRect(130, 580, 220, 300);
  ctx.fillStyle = css(mixc('#0e1322', '#7a6450', day)); ctx.fillRect(90, 1000, 360, 18);
  for (let i = 0; i < 7; i++) { ctx.fillStyle = css(mixc('#141a2a', ['#a0473a', '#2f5f9f', '#e0b040', '#3f7f4f'][i % 4], day)); ctx.fillRect(110 + i * 40, 900 + (i % 2) * 12, 30, 100 - (i % 2) * 12); }
  // bed
  ctx.fillStyle = css(mixc('#0c1122', '#5a4a3a', day)); ctx.fillRect(0, 1480, W, 440);
  ctx.fillStyle = css(mixc('#1a2240', '#e8e4dc', day)); rrect(ctx, -40, 1420, W + 80, 220, 40); ctx.fill();
  ctx.fillStyle = css(mixc('#22305a', '#7f9fcf', day)); rrect(ctx, -40, 1530, W + 80, 420, 60); ctx.fill();
}

/* ---------- neuron network inside a side-view brain ---------- */
let NEU = null;
function neuInit() {
  if (NEU) return NEU;
  const r = rng(91), nodes = [];
  const inside = (x, y) => ((x + 5) / 255) ** 2 + ((y + 170) / 200) ** 2 < 1 && y < 30;
  while (nodes.length < 90) {
    const x = -250 + r() * 500, y = -380 + r() * 420;
    if (inside(x, y)) nodes.push({ x, y, ph: r() * TAU, k: r() });
  }
  const edges = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
    if (d < 85) edges.push({ a: i, b: j, k: r(), extra: d > 62 });
  }
  return (NEU = { nodes, edges });
}
// o: color, activity 0..1, links (new-link glow 0..1), alert (red flashes), cx, cy, s, regions {reward, pfc}
function drawBrainNet(ctx, t, o = {}) {
  const { nodes, edges } = neuInit();
  const cx = o.cx || W / 2, cy = o.cy || 1150, s = o.s || 1.6;
  const colr = o.color || '#4cc9ff';
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  // outline
  brainPath(ctx);
  ctx.fillStyle = css(colr, 0.06); ctx.fill();
  ctx.strokeStyle = css(colr, 0.55); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = css(colr, 0.12); ctx.lineWidth = 2;
  for (const pts of brainGyri()) { smoothPath(ctx, pts, false); ctx.stroke(); }
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(-170, 70, 85, 55, 0.25, 0, TAU); ctx.strokeStyle = css(colr, 0.4); ctx.stroke();
  // region glows
  if (o.regions) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (o.regions.reward) spr(ctx, softSprite('#ff2d55'), -10, -110, 120 + 30 * Math.sin(t * 6), 0.7 * o.regions.reward);
    if (o.regions.pfc) spr(ctx, softSprite('#3db7ff'), 170, -210, 120, 0.7 * o.regions.pfc);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // edges
  for (const e of edges) {
    const A = nodes[e.a], B = nodes[e.b];
    const isNew = e.extra;
    let a = isNew ? (o.links || 0) : 0.35;
    if (a <= 0.01) continue;
    const c = isNew ? (o.linkColor || '#4dffb0') : colr;
    ctx.strokeStyle = css(c, a * (isNew ? 0.9 : 0.5)); ctx.lineWidth = isNew ? 2.5 : 1.5;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  // signals travelling along edges
  const act = o.activity == null ? 0.5 : o.activity;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const glow = softSprite(colr);
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (e.k > act) continue;
    if (e.extra && (o.links || 0) < 0.3) continue;
    const A = nodes[e.a], B = nodes[e.b];
    const q = (t * (0.4 + e.k) + e.k * 7) % 1;
    spr(ctx, e.extra ? softSprite(o.linkColor || '#4dffb0') : glow, lerp(A.x, B.x, q), lerp(A.y, B.y, q), 9, 0.9);
  }
  // nodes
  for (const n of nodes) {
    const fl = 0.5 + 0.5 * Math.sin(t * 3 + n.ph);
    const alert = o.alert ? o.alert * (Math.sin(t * 10 + n.ph) > 0.6 ? 1 : 0) * (n.k < 0.5 ? 1 : 0) : 0;
    spr(ctx, alert ? softSprite('#ff2d40') : glow, n.x, n.y, 12 + 6 * fl + alert * 14, 0.5 + 0.4 * fl * act + alert * 0.5);
  }
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  for (const n of nodes) { ellipse(ctx, n.x, n.y, 2.5, 2.5); ctx.fill(); }
  ctx.restore();
}

/* neon vertical gauge */
function drawMeter(ctx, x, y, h, v, label, colr, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save(); ctx.globalAlpha = alpha;
  rrect(ctx, x - 34, y, 68, h, 34); ctx.fillStyle = 'rgba(5,10,20,0.7)'; ctx.fill();
  ctx.strokeStyle = css(colr, 0.6); ctx.lineWidth = 3; ctx.stroke();
  const fh = (h - 16) * clamp(v);
  rrect(ctx, x - 26, y + h - 8 - fh, 52, fh, 26);
  const g = ctx.createLinearGradient(0, y + h, 0, y);
  g.addColorStop(0, css(colr, 0.6)); g.addColorStop(1, css(mixc(colr, '#ffffff', 0.4)));
  ctx.shadowColor = css(colr); ctx.shadowBlur = 24; ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  hudLabel(ctx, x, y - 34, label, { size: 24, weight: 800, color: css(mixc(colr, '#ffffff', 0.3)), align: 'center', ls: 3, alpha });
  hudLabel(ctx, x, y + h + 36, Math.round(v * 100) + '%', { size: 30, weight: 800, color: '#ffffff', align: 'center', font: '"JetBrains Mono"', ls: 0, alpha });
}

/* ---------- eye macro ---------- */
function drawEye(ctx, cx, cy, r, t, o = {}) {
  ctx.fillStyle = '#c99274'; ctx.fillRect(0, 0, W, H);
  const sk = softSprite('#5a3020');
  ctx.globalAlpha = 0.5; ctx.drawImage(sk, cx - r * 2.6, cy - r * 1.7, r * 5.2, r * 3.4); ctx.globalAlpha = 1;
  // eye white (almond)
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx - r * 2.1, cy); ctx.quadraticCurveTo(cx, cy - r * 1.45, cx + r * 2.1, cy); ctx.quadraticCurveTo(cx, cy + r * 1.2, cx - r * 2.1, cy); ctx.closePath();
  const g0 = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.2);
  g0.addColorStop(0, '#f6efe8'); g0.addColorStop(1, '#c9a9a0');
  ctx.fillStyle = g0; ctx.fill(); ctx.clip();
  // iris
  let g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
  g.addColorStop(0, '#6b4a2a'); g.addColorStop(0.6, '#3a2414'); g.addColorStop(1, '#140a05');
  ctx.fillStyle = g; ellipse(ctx, cx, cy, r, r); ctx.fill();
  ctx.strokeStyle = 'rgba(200,150,90,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU + Math.sin(i) * 0.05;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42); ctx.lineTo(cx + Math.cos(a + 0.05) * r * 0.95, cy + Math.sin(a + 0.05) * r * 0.95); ctx.stroke();
  }
  const pr = r * (o.pupil || 0.38);
  ctx.fillStyle = '#050304'; ellipse(ctx, cx, cy, pr, pr); ctx.fill();
  if (o.screen) { ctx.fillStyle = `rgba(80,150,255,${0.5 * o.screen})`; rrect(ctx, cx - r * 0.18, cy - r * 0.3, r * 0.22, r * 0.36, r * 0.04); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ellipse(ctx, cx + r * 0.28, cy - r * 0.32, r * 0.12, r * 0.1); ctx.fill();
  ctx.restore();
  // lids
  ctx.strokeStyle = '#3a2016'; ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.moveTo(cx - r * 2.1, cy); ctx.quadraticCurveTo(cx, cy - r * 1.45, cx + r * 2.1, cy); ctx.stroke();
}

/* ---------- synapse with dopamine receptors ---------- */
function drawSynapse(ctx, t, sens) {
  holoBg(ctx, t, '#4cc9ff', 0);
  const top = 760, bot = 1260;
  // presynaptic terminal (top bulb) and postsynaptic membrane (bottom)
  ctx.fillStyle = 'rgba(80,140,255,0.18)'; ctx.strokeStyle = 'rgba(120,180,255,0.8)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(120, 380); ctx.quadraticCurveTo(140, top + 40, W / 2, top + 40); ctx.quadraticCurveTo(W - 140, top + 40, W - 120, 380); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(60, bot); ctx.quadraticCurveTo(W / 2, bot - 60, W - 60, bot); ctx.lineTo(W - 60, H - 380); ctx.lineTo(60, H - 380); ctx.closePath(); ctx.fill(); ctx.stroke();
  // vesicles
  for (let i = 0; i < 9; i++) { ctx.strokeStyle = 'rgba(160,200,255,0.7)'; ellipse(ctx, 260 + i * 70, 640 + Math.sin(i * 2) * 40, 26, 26); ctx.stroke(); }
  // receptors (cups) on the membrane; brightness = sensitivity
  for (let i = 0; i < 9; i++) {
    const x = 160 + i * 95, y = bot - 54 + Math.abs(i - 4) * 6;
    const lit = sens * (0.7 + 0.3 * Math.sin(t * 3 + i));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    spr(ctx, softSprite('#4dffb0'), x, y - 20, 50, 0.6 * lit);
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.strokeStyle = css(mixc('#4a5a70', '#4dffb0', lit)); ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 22, y - 40); ctx.quadraticCurveTo(x - 22, y, x, y); ctx.quadraticCurveTo(x + 22, y, x + 22, y - 40); ctx.stroke();
  }
  // a few dopamine molecules drifting down and docking
  for (let i = 0; i < 12; i++) {
    const q = (t * 0.25 + i / 12) % 1;
    const x = 160 + (i % 9) * 95, y = lerp(top + 70, bot - 90, q);
    ctx.fillStyle = `rgba(255,214,80,${0.9 * Math.sin(Math.PI * q)})`;
    ellipse(ctx, x + Math.sin(q * 9 + i) * 10, y, 9, 9); ctx.fill();
  }
  hudLabel(ctx, W / 2, top + 140, 'СИНАПС', { size: 26, weight: 800, color: 'rgba(190,230,255,0.7)', align: 'center', ls: 8 });
  hudLabel(ctx, W / 2, bot + 120, 'ДОПАМИНЫ ХҮЛЭЭН АВАГЧИД', { size: 34, weight: 900, color: '#bdfbe0', align: 'center', ls: 3 });
}

/* ---------- bed seen from above, tossing ---------- */
function drawBedTop(ctx, t, toss) {
  ctx.fillStyle = '#070a14'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, 1150); ctx.rotate(-0.08);
  rrect(ctx, -380, -720, 760, 1440, 40); ctx.fillStyle = '#18213e'; ctx.fill();
  rrect(ctx, -300, -660, 600, 180, 50); ctx.fillStyle = '#2a3560'; ctx.fill();
  const rot = Math.sin(t * 1.8) * 0.35 * toss + Math.sin(t * 4.1) * 0.08 * toss;
  ctx.rotate(rot);
  // head
  ctx.fillStyle = '#9a6a52'; ellipse(ctx, 0, -520, 70, 80); ctx.fill();
  ctx.fillStyle = '#120c0a'; ellipse(ctx, 0, -560, 74, 56); ctx.fill();
  // body under blanket
  ctx.fillStyle = '#334a8a';
  ctx.beginPath(); ctx.moveTo(-230, -430); ctx.quadraticCurveTo(-280, 100, -200, 640); ctx.lineTo(220, 640); ctx.quadraticCurveTo(300, 100, 230, -430); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 6;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-200 + i * 20, -300 + i * 140); ctx.quadraticCurveTo(0, -260 + i * 140 + Math.sin(t + i) * 20, 210 - i * 10, -310 + i * 140); ctx.stroke(); }
  ctx.fillStyle = '#9a6a52'; ellipse(ctx, 250 * Math.cos(rot * 3), -330, 40, 60, 0.4); ctx.fill();
  ctx.restore();
  // phone glow on the nightstand, face down
  rrect(ctx, 820, 330, 200, 220, 20); ctx.fillStyle = '#121626'; ctx.fill();
  rrect(ctx, 870, 390, 100, 160, 14); ctx.fillStyle = '#05070c'; ctx.fill();
}
/* abstract memory flashes (non-figurative blurred light shapes) */
function drawFlashes(ctx, t, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 7; i++) {
    const on = Math.sin(t * (2 + i * 0.7) + i * 4) > 0.55;
    if (!on) continue;
    const x = hash(i * 3.3 + Math.floor(t * 2)) * W, y = 300 + hash(i * 5.1 + Math.floor(t * 2)) * 1300;
    spr(ctx, softSprite(['#ff3b6b', '#ff9a3b', '#b04bff'][i % 3]), x, y, 180 + hash(i) * 200, 0.35 * a);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

/* ---------- 3D-ish beating heart ---------- */
function drawHeart3D(ctx, t, T, bpmScale = 1) {
  holoBg(ctx, t, '#ff4d6d', 0.6);
  const beat = beatPulse(T);
  const s = 260 * (1 + 0.12 * beat);
  ctx.save(); ctx.translate(W / 2, 1000);
  const g = ctx.createRadialGradient(-s * 0.3, -s * 0.4, s * 0.1, 0, 0, s * 1.2);
  g.addColorStop(0, '#ff7a8a'); g.addColorStop(0.6, '#c81e3a'); g.addColorStop(1, '#5a0614');
  ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 60 * beat + 20;
  heartPath(ctx, 0, 0, s); ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,200,210,0.35)'; ctx.lineWidth = 3;
  for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(0, -s * 0.15 + k * s * 0.13, s * 0.75 * Math.cos(k * 0.3), s * 0.06, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

/* ---------- café: two profiles, eye contact ---------- */
function drawCafe(ctx, t, look) {
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#3a2418'); g.addColorStop(1, '#1c120c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 22; i++) spr(ctx, softSprite(['#ffb45a', '#ffd38a', '#ff8a4a'][i % 3]), hash(i) * W, 250 + hash(i + 4) * 900, 40 + hash(i + 7) * 90, 0.35);
  ctx.globalAlpha = 1;
  // table
  ctx.fillStyle = '#5a3a24'; ctx.fillRect(0, 1500, W, 420);
  ctx.fillStyle = '#7a5234'; ctx.fillRect(0, 1490, W, 20);
  // cups
  for (const x of [330, 760]) { ctx.fillStyle = '#efe9e0'; rrect(ctx, x - 50, 1400, 100, 100, 18); ctx.fill(); ctx.strokeStyle = '#efe9e0'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(x + 58, 1445, 26, -1.2, 1.2); ctx.stroke(); }
  // profiles
  const head = (x, y, s, flip, skin, hair) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip * s, s);
    smoothPath(ctx, HEAD_PROFILE, false); ctx.lineTo(-170, 470); ctx.closePath();
    ctx.fillStyle = skin; ctx.fill();
    ctx.fillStyle = hair;
    smoothPath(ctx, [[-170, 160], [-300, 20], [-305, -170], [-250, -330], [-120, -420], [40, -430], [190, -360], [250, -260], [120, -300], [-40, -280], [-140, -150], [-150, 40]]); ctx.fill();
    // eye
    ctx.fillStyle = '#1a0f0a'; ellipse(ctx, 215, -95, 16, 9); ctx.fill();
    ctx.restore();
  };
  head(250, 1060, 0.62, 1, '#c48a62', '#16100c');
  head(830, 1050, 0.6, -1, '#d8a07c', '#3a2214');
  // eye-contact line
  if (look > 0) {
    const x0 = 250 + 215 * 0.62, y0 = 1060 - 95 * 0.62, x1 = 830 - 215 * 0.6, y1 = 1050 - 95 * 0.6;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,214,140,${0.7 * look})`; ctx.lineWidth = 3; ctx.setLineDash([10, 14]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, look), lerp(y0, y1, look)); ctx.stroke();
    ctx.setLineDash([]);
    spr(ctx, softSprite('#ffd08a'), (x0 + x1) / 2, (y0 + y1) / 2 - 10, 140, 0.35 * look);
    ctx.restore(); ctx.globalAlpha = 1;
  }
}

/* ---------- confident walk (side view) ---------- */
function walker(ctx, x, y, h, ph) {
  const s = h;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const hip = [x, y - 0.5 * s], sh = [x + 0.02 * s, y - 0.82 * s];
  const leg = (a, front) => {
    const knee = [hip[0] + Math.sin(a) * 0.25 * s, hip[1] + Math.cos(a) * 0.25 * s];
    const b = a - (front ? 0.05 : 0.45 * Math.max(0, -Math.sin(ph)));
    const foot = [knee[0] + Math.sin(b) * 0.25 * s, knee[1] + Math.cos(b) * 0.25 * s];
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
    ctx.fillStyle = '#f2f2f2'; ellipse(ctx, foot[0] + 0.04 * s, foot[1], 0.06 * s, 0.025 * s); ctx.fill();
  };
  ctx.strokeStyle = '#1e2a40'; ctx.lineWidth = 0.1 * s;
  leg(-Math.sin(ph) * 0.45, false); leg(Math.sin(ph) * 0.45, true);
  ctx.strokeStyle = '#2f6db5'; ctx.lineWidth = 0.19 * s;
  ctx.beginPath(); ctx.moveTo(hip[0], hip[1] - 0.04 * s); ctx.lineTo(sh[0], sh[1]); ctx.stroke();
  ctx.lineWidth = 0.07 * s; ctx.strokeStyle = '#c48a62';
  for (const a of [Math.sin(ph) * 0.5, -Math.sin(ph) * 0.5]) { ctx.beginPath(); ctx.moveTo(sh[0], sh[1] + 0.02 * s); ctx.lineTo(sh[0] + Math.sin(a) * 0.32 * s, sh[1] + Math.cos(a) * 0.32 * s); ctx.stroke(); }
  ctx.fillStyle = '#c48a62'; ellipse(ctx, sh[0] + 0.03 * s, sh[1] - 0.11 * s, 0.075 * s, 0.085 * s); ctx.fill();
  ctx.fillStyle = '#15100c'; ctx.beginPath(); ctx.ellipse(sh[0] + 0.02 * s, sh[1] - 0.14 * s, 0.08 * s, 0.065 * s, 0, Math.PI, TAU); ctx.fill();
}
function drawStreet(ctx, t, o = {}) {
  let g = ctx.createLinearGradient(0, 0, 0, 1300);
  g.addColorStop(0, '#5aa0e8'); g.addColorStop(1, '#ffe6c0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#fff0c0'), 860, 520, 520, 0.8); ctx.restore(); ctx.globalAlpha = 1;
  const off = (t * 220) % 240;
  for (let i = -1; i < 7; i++) {
    const x = i * 240 - off, h = 380 + hash(i + Math.floor(t * 220 / 240)) * 400;
    ctx.fillStyle = ['#c9b8a0', '#a8b4c0', '#d8c0a0', '#b0a090'][(i + 8 + Math.floor(t * 220 / 240)) % 4];
    ctx.fillRect(x, 1300 - h, 230, h);
    ctx.fillStyle = 'rgba(80,110,140,0.5)';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x + 25 + c * 70, 1300 - h + 40 + r * 60, 40, 36);
  }
  ctx.fillStyle = '#8a8a86'; ctx.fillRect(0, 1300, W, 120);
  ctx.fillStyle = '#4a4a4c'; ctx.fillRect(0, 1420, W, H);
  ctx.strokeStyle = '#6a6a68'; ctx.lineWidth = 4;
  ctx.beginPath(); for (let x = -((t * 400) % 160); x < W; x += 160) { ctx.moveTo(x, 1300); ctx.lineTo(x - 40, 1420); } ctx.stroke();
  walker(ctx, 470, 1400, 760, t * 6);
}

/* energy / testosterone line chart */
function drawEnergyChart(ctx, t, p) {
  ctx.fillStyle = '#071018'; ctx.fillRect(0, 0, W, H);
  const x0 = 140, x1 = 960, y0 = 1400, y1 = 700;
  ctx.strokeStyle = 'rgba(120,200,255,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let i = 0; i <= 6; i++) { const x = lerp(x0, x1, i / 6); ctx.moveTo(x, y1); ctx.lineTo(x, y0); } ctx.stroke();
  for (let i = 0; i < 7; i++) hudLabel(ctx, lerp(x0, x1, i / 6), y0 + 44, String(i + 1), { size: 30, weight: 800, color: '#9fc8e8', align: 'center', ls: 0 });
  hudLabel(ctx, W / 2, y0 + 100, 'ӨДӨР', { size: 26, weight: 700, color: '#6f94b4', align: 'center', ls: 6 });
  // study-shaped curve: flat, then a peak on day 7
  const vals = [0.18, 0.2, 0.22, 0.25, 0.3, 0.42, 0.95];
  const n = Math.max(1, Math.floor(lerp(1, 7, E.inOut(p)) * 10) / 10);
  ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 20;
  ctx.beginPath();
  for (let k = 0; k <= 60; k++) {
    const f = (k / 60) * (n - 1);
    const i = Math.floor(f), q = f - i;
    const v = lerp(vals[i], vals[Math.min(6, i + 1)], sstep(q));
    const x = lerp(x0, x1, f / 6), y = lerp(y0, y1, v);
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke(); ctx.shadowBlur = 0;
  hudLabel(ctx, W / 2, 560, 'ТЕСТОСТЕРОН', { size: 56, weight: 900, color: '#ffe08a', align: 'center', ls: 6 });
  hudLabel(ctx, W / 2, 625, 'нэгэн судалгааны дүн · түр зуурын оргил', { size: 28, weight: 600, color: '#c9b37a', align: 'center', ls: 1 });
  if (p > 0.95) hudChip(ctx, x1 - 40, y1 - 50, 'ОРГИЛ', '#ffd24a', seg(p, 0.95, 1), 28);
}

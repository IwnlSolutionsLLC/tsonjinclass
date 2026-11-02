'use strict';
/* Young person (front view, joint-based poses), macro lips, POV hand. */

const POSE = {
  stand: {
    head: [0, -0.905], neck: [0, -0.838], sL: [-0.112, -0.8], sR: [0.112, -0.8],
    eL: [-0.15, -0.635], eR: [0.15, -0.635], hL: [-0.162, -0.478], hR: [0.162, -0.478],
    wL: [-0.088, -0.56], wR: [0.088, -0.56], pL: [-0.064, -0.49], pR: [0.064, -0.49],
    kL: [-0.068, -0.262], kR: [0.068, -0.262], fL: [-0.074, -0.022], fR: [0.074, -0.022],
  },
  slump: {
    head: [0.006, -0.872], neck: [0.004, -0.816], sL: [-0.106, -0.778], sR: [0.108, -0.782],
    eL: [-0.138, -0.615], eR: [0.14, -0.618], hL: [-0.142, -0.458], hR: [0.146, -0.46],
    wL: [-0.086, -0.545], wR: [0.086, -0.545], pL: [-0.063, -0.476], pR: [0.063, -0.476],
    kL: [-0.074, -0.25], kR: [0.07, -0.252], fL: [-0.078, -0.022], fR: [0.078, -0.022],
  },
  kneel: {
    head: [0, -0.505], neck: [0, -0.472], sL: [-0.118, -0.445], sR: [0.118, -0.445],
    eL: [-0.21, -0.555], eR: [0.21, -0.555], hL: [-0.058, -0.572], hR: [0.058, -0.572],
    wL: [-0.094, -0.245], wR: [0.094, -0.245], pL: [-0.072, -0.178], pR: [0.072, -0.178],
    kL: [-0.118, -0.04], kR: [0.118, -0.04], fL: [-0.16, -0.016], fR: [0.16, -0.016],
  },
  kneelLimp: {
    head: [0.012, -0.49], neck: [0.008, -0.47], sL: [-0.114, -0.448], sR: [0.114, -0.448],
    eL: [-0.135, -0.31], eR: [0.138, -0.312], hL: [-0.112, -0.17], hR: [0.12, -0.172],
    wL: [-0.094, -0.245], wR: [0.094, -0.245], pL: [-0.072, -0.178], pR: [0.072, -0.178],
    kL: [-0.118, -0.04], kR: [0.118, -0.04], fL: [-0.16, -0.016], fR: [0.16, -0.016],
  },
};

function poseLerp(a, b, t) {
  const o = {};
  for (const k in a) o[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
  return o;
}
function poseMap(p, f) { const o = {}; for (const k in p) o[k] = f(p[k], k); return o; }
function poseRotate(p, cx, cy, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return poseMap(p, ([x, y]) => { const dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; });
}
function poseBreath(p, b) {
  return poseMap(p, ([x, y], k) => {
    if (k === 'sL') return [x - 0.007 * b, y - 0.016 * b];
    if (k === 'sR') return [x + 0.007 * b, y - 0.016 * b];
    if (k === 'neck' || k === 'head') return [x, y - 0.013 * b];
    if (k[0] === 'e') return [x + (x < 0 ? -0.004 : 0.004) * b, y - 0.01 * b];
    if (k[0] === 'h') return [x, y - 0.006 * b];
    if (k === 'wL') return [x - 0.008 * b, y];
    if (k === 'wR') return [x + 0.008 * b, y];
    return [x, y];
  });
}
function poseLift(p) {
  let maxY = -9;
  for (const k in p) maxY = Math.max(maxY, p[k][1]);
  const d = -0.012 - maxY;
  return poseMap(p, ([x, y]) => [x, y + d]);
}

const PERSON_C = { shirt: '#b5322a', shirt2: '#8d231e', pants: '#253048', skin: '#c58a62', skin2: '#9a6446', hair: '#1a1210', shoe: '#1b1b1d' };

function drawFigure(ctx, p, C, o = {}) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (pts, w, c) => {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };
  const mid = (a, b, t = 0.5) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  // shoes
  ctx.fillStyle = C.shoe;
  for (const f of [p.fL, p.fR]) { ellipse(ctx, f[0] + (f[0] < 0 ? -0.006 : 0.006), f[1] + 0.006, 0.043, 0.022); ctx.fill(); }
  // legs
  const lw = 0.084 + clamp((-0.3 - p.pL[1]) * 0.12, 0, 0.02);
  line([p.pL, p.kL, p.fL], lw, C.pants);
  line([p.pR, p.kR, p.fR], lw, C.pants);
  // pelvis
  ctx.fillStyle = C.pants;
  poly(ctx, [[p.pL[0] - 0.04, p.pL[1] - 0.035], [p.pR[0] + 0.04, p.pR[1] - 0.035], [p.pR[0] + 0.03, p.pR[1] + 0.05], [p.pL[0] - 0.03, p.pL[1] + 0.05]]);
  ctx.fill();
  // knee folds
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.006;
  for (const k of [p.kL, p.kR]) { ctx.beginPath(); ctx.moveTo(k[0] - 0.025, k[1] - 0.01); ctx.quadraticCurveTo(k[0], k[1] + 0.006, k[0] + 0.025, k[1] - 0.01); ctx.stroke(); }
  // neck
  const sm = mid(p.sL, p.sR);
  line([p.neck, [sm[0], sm[1] + 0.01]], 0.05, C.skin2);
  // torso (t-shirt)
  const torso = [p.sL, p.sR, p.wR, [p.pR[0] + 0.032, p.pR[1] + 0.012], [p.pL[0] - 0.032, p.pL[1] + 0.012], p.wL];
  ctx.fillStyle = C.shirt; ctx.strokeStyle = C.shirt; ctx.lineWidth = 0.04;
  poly(ctx, torso); ctx.fill(); ctx.stroke();
  // collar
  ctx.strokeStyle = C.shirt2; ctx.lineWidth = 0.009;
  ctx.beginPath(); ctx.moveTo(sm[0] - 0.035, sm[1] - 0.006); ctx.quadraticCurveTo(sm[0], sm[1] + 0.04, sm[0] + 0.035, sm[1] - 0.006); ctx.stroke();
  // shirt folds
  ctx.strokeStyle = 'rgba(60,8,8,0.28)'; ctx.lineWidth = 0.006;
  const wm = mid(p.wL, p.wR);
  ctx.beginPath();
  ctx.moveTo(p.wL[0] + 0.02, p.wL[1] - 0.05); ctx.quadraticCurveTo(wm[0] - 0.02, wm[1] - 0.01, wm[0] - 0.005, wm[1] + 0.045);
  ctx.moveTo(p.wR[0] - 0.015, p.wR[1] - 0.09); ctx.quadraticCurveTo(wm[0] + 0.03, wm[1] - 0.03, wm[0] + 0.02, wm[1] + 0.05);
  ctx.stroke();
  // heart glow (x-ray hint)
  if (o.heart != null) {
    const hx = lerp(sm[0], p.sR[0], 0.32), hy = sm[1] + 0.088;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    spr(ctx, softSprite('#ff2a3a'), hx, hy, 0.075 + 0.045 * o.heart, 0.3 + 0.55 * o.heart);
    ctx.globalAlpha = 0.3 + 0.6 * o.heart; ctx.fillStyle = '#ff6a70';
    heartPath(ctx, hx, hy + 0.008, 0.024 * (1 + 0.28 * o.heart)); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // head
  const hd = p.head, hdDown = o.headDown || 0;
  ctx.fillStyle = C.skin;
  ellipse(ctx, hd[0], hd[1], 0.055, 0.066); ctx.fill();
  // ears
  ellipse(ctx, hd[0] - 0.054, hd[1] + 0.004, 0.011, 0.019); ctx.fill();
  ellipse(ctx, hd[0] + 0.054, hd[1] + 0.004, 0.011, 0.019); ctx.fill();
  // face (subtle)
  const fa = (o.face == null ? 1 : o.face) * (1 - hdDown);
  if (fa > 0.02) {
    ctx.globalAlpha = fa * 0.75;
    ctx.fillStyle = '#2a1712';
    const ey = o.mouth > 0 ? 0.0026 : 0.0045;
    ellipse(ctx, hd[0] - 0.021, hd[1] + 0.005, 0.0065, ey); ctx.fill();
    ellipse(ctx, hd[0] + 0.021, hd[1] + 0.005, 0.0065, ey); ctx.fill();
    ctx.strokeStyle = '#2a1712'; ctx.lineWidth = 0.004;
    ctx.beginPath(); ctx.moveTo(hd[0] - 0.031, hd[1] - 0.012); ctx.lineTo(hd[0] - 0.012, hd[1] - 0.014);
    ctx.moveTo(hd[0] + 0.031, hd[1] - 0.012); ctx.lineTo(hd[0] + 0.012, hd[1] - 0.014); ctx.stroke();
    if (o.mouth > 0) {
      ctx.fillStyle = '#3a1210';
      ellipse(ctx, hd[0], hd[1] + 0.039, 0.011, 0.004 + 0.007 * o.mouth); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(120,50,40,0.8)'; ctx.lineWidth = 0.0045;
      ctx.beginPath(); ctx.moveTo(hd[0] - 0.012, hd[1] + 0.036); ctx.quadraticCurveTo(hd[0], hd[1] + 0.039, hd[0] + 0.012, hd[1] + 0.036); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(90,45,30,0.45)';
    ctx.beginPath(); ctx.moveTo(hd[0] + 0.002, hd[1] + 0.008); ctx.lineTo(hd[0] - 0.003, hd[1] + 0.022); ctx.lineTo(hd[0] + 0.005, hd[1] + 0.023); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // hair
  ctx.fillStyle = C.hair;
  const hl = lerp(-0.018, 0.035, hdDown);
  ctx.beginPath();
  ctx.ellipse(hd[0], hd[1] - 0.006, 0.06, 0.066, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(hd[0] + 0.04, hd[1] + hl - 0.012, hd[0] + 0.012, hd[1] + hl - 0.004);
  ctx.quadraticCurveTo(hd[0] - 0.02, hd[1] + hl + 0.004, hd[0] - 0.058, hd[1] + hl * 0.4);
  ctx.closePath(); ctx.fill();
  // arms
  for (const [s, e, h] of [[p.sL, p.eL, p.hL], [p.sR, p.eR, p.hR]]) {
    line([s, e, h], 0.05, C.skin);
    line([s, mid(s, e, 0.48)], 0.072, C.shirt);
    ctx.fillStyle = C.skin;
    ellipse(ctx, h[0], h[1] + 0.012, 0.027, 0.034); ctx.fill();
    if (o.veins > 0) {
      ctx.strokeStyle = `rgba(70,80,150,${0.55 * o.veins})`; ctx.lineWidth = 0.0035;
      const a = mid(e, h, 0.15), b = mid(e, h, 0.92);
      ctx.beginPath(); ctx.moveTo(a[0] - 0.006, a[1]);
      ctx.bezierCurveTo(a[0] + 0.01, lerp(a[1], b[1], 0.35), b[0] - 0.012, lerp(a[1], b[1], 0.6), b[0] + 0.004, b[1]);
      ctx.moveTo(lerp(a[0], b[0], 0.45) + 0.002, lerp(a[1], b[1], 0.45)); ctx.quadraticCurveTo(b[0] + 0.012, lerp(a[1], b[1], 0.75), b[0] + 0.013, b[1] - 0.005);
      ctx.stroke();
    }
  }
}

/* Renders a figure into the person layer with lighting, then onto dst. */
function renderPerson(dst, p, x, y, h, o = {}) {
  const L = BUF.person, lc = L.getContext('2d');
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, W, H);
  lc.save();
  applyCam(lc, o.cam);
  lc.translate(x, y); lc.scale(h, h);
  drawFigure(lc, p, o.C || PERSON_C, o);
  lc.restore();
  const [sx, sy] = camPt(o.cam, x, y);
  const sh = h * (o.cam ? o.cam.z : 1);
  lc.globalCompositeOperation = 'source-atop';
  if (o.sil) {
    lc.fillStyle = o.sil; lc.fillRect(0, 0, W, H);
  } else {
    let g = lc.createLinearGradient(sx - sh * 0.22, 0, sx + sh * 0.22, 0);
    g.addColorStop(0, 'rgba(25,10,30,0.42)'); g.addColorStop(0.5, 'rgba(0,0,0,0.04)'); g.addColorStop(1, 'rgba(255,215,150,0.16)');
    lc.fillStyle = g; lc.fillRect(0, 0, W, H);
    g = lc.createLinearGradient(0, sy - sh * 0.5, 0, sy);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,5,15,0.32)');
    lc.fillStyle = g; lc.fillRect(0, 0, W, H);
    if (o.tint) { lc.fillStyle = o.tint; lc.fillRect(0, 0, W, H); }
  }
  lc.globalCompositeOperation = 'source-over';
  if (o.rim > 0) {
    // rim light: silhouette minus shifted silhouette
    const R = BUF.rim, rc = R.getContext('2d');
    rc.setTransform(1, 0, 0, 1, 0, 0); rc.clearRect(0, 0, W, H);
    rc.drawImage(L, 0, 0);
    rc.globalCompositeOperation = 'source-in';
    rc.fillStyle = o.rimColor || 'rgba(255,225,160,1)'; rc.fillRect(0, 0, W, H);
    rc.globalCompositeOperation = 'destination-out';
    const off = Math.max(2, sh * 0.006);
    rc.drawImage(L, -off, off * 0.7);
    rc.globalCompositeOperation = 'source-over';
    lc.globalAlpha = o.rim; lc.globalCompositeOperation = 'source-atop';
    lc.drawImage(R, 0, 0);
    lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over';
  }
  dst.globalAlpha = o.alpha == null ? 1 : o.alpha;
  dst.drawImage(L, 0, 0);
  dst.globalAlpha = 1;
}

/* ---------- macro lips ---------- */
function lipsUpperPath(ctx, cx, cy, s, o) {
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.bezierCurveTo(cx - 0.8 * s, cy - 0.1 * s, cx - 0.58 * s, cy - 0.34 * s, cx - 0.26 * s, cy - 0.35 * s);
  ctx.bezierCurveTo(cx - 0.14 * s, cy - 0.355 * s, cx - 0.07 * s, cy - 0.29 * s, cx, cy - 0.265 * s);
  ctx.bezierCurveTo(cx + 0.07 * s, cy - 0.29 * s, cx + 0.14 * s, cy - 0.355 * s, cx + 0.26 * s, cy - 0.35 * s);
  ctx.bezierCurveTo(cx + 0.58 * s, cy - 0.34 * s, cx + 0.8 * s, cy - 0.1 * s, cx + s, cy);
  ctx.bezierCurveTo(cx + 0.7 * s, cy - 0.02 * s - o, cx + 0.3 * s, cy + 0.01 * s - o, cx, cy + 0.045 * s - o);
  ctx.bezierCurveTo(cx - 0.3 * s, cy + 0.01 * s - o, cx - 0.7 * s, cy - 0.02 * s - o, cx - s, cy);
  ctx.closePath();
}
function lipsLowerPath(ctx, cx, cy, s, o) {
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.bezierCurveTo(cx - 0.7 * s, cy + 0.02 * s + o, cx - 0.3 * s, cy + 0.05 * s + o, cx, cy + 0.055 * s + o);
  ctx.bezierCurveTo(cx + 0.3 * s, cy + 0.05 * s + o, cx + 0.7 * s, cy + 0.02 * s + o, cx + s, cy);
  ctx.bezierCurveTo(cx + 0.8 * s, cy + 0.24 * s, cx + 0.45 * s, cy + 0.5 * s, cx, cy + 0.5 * s);
  ctx.bezierCurveTo(cx - 0.45 * s, cy + 0.5 * s, cx - 0.8 * s, cy + 0.24 * s, cx - s, cy);
  ctx.closePath();
}
function mouthPath(ctx, cx, cy, s, o) {
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.bezierCurveTo(cx - 0.7 * s, cy - 0.02 * s - o, cx - 0.3 * s, cy + 0.01 * s - o, cx, cy + 0.045 * s - o);
  ctx.bezierCurveTo(cx + 0.3 * s, cy + 0.01 * s - o, cx + 0.7 * s, cy - 0.02 * s - o, cx + s, cy);
  ctx.bezierCurveTo(cx + 0.7 * s, cy + 0.02 * s + o, cx + 0.3 * s, cy + 0.05 * s + o, cx, cy + 0.055 * s + o);
  ctx.bezierCurveTo(cx - 0.3 * s, cy + 0.05 * s + o, cx - 0.7 * s, cy + 0.02 * s + o, cx - s, cy);
  ctx.closePath();
}

let SKIN_TEX = null;
function skinTexture() {
  if (SKIN_TEX) return SKIN_TEX;
  const c = makeCanvas(540, 960), x = c.getContext('2d'), r = rng(31);
  for (let i = 0; i < 9000; i++) {
    const a = r() * 0.5;
    x.fillStyle = r() < 0.5 ? `rgba(60,25,15,${a * 0.5})` : `rgba(255,220,200,${a * 0.35})`;
    const rr = 0.5 + r() * 1.6;
    x.beginPath(); x.arc(r() * 540, r() * 960, rr, 0, TAU); x.fill();
  }
  return (SKIN_TEX = c);
}

/* o: { dry 0..1, open (px), t } */
function drawLipsScene(ctx, cx, cy, w, o) {
  const s = w / 2, dry = o.dry || 0, op = o.open || 0;
  // skin
  const sk1 = mixc('#c98c66', '#cfae98', dry), sk2 = mixc('#87513a', '#a68670', dry), sk3 = mixc('#2e170f', '#5a4236', dry);
  let g = ctx.createRadialGradient(cx + 0.35 * s, cy - 1.1 * s, 0, cx + 0.1 * s, cy - 0.2 * s, 2.4 * s);
  g.addColorStop(0, css(sk1)); g.addColorStop(0.45, css(sk2)); g.addColorStop(1, css(sk3));
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  // nose shadow at top, chin shading
  g = ctx.createLinearGradient(0, cy - 2.2 * s, 0, cy - 0.9 * s);
  g.addColorStop(0, 'rgba(25,10,6,0.75)'); g.addColorStop(1, 'rgba(25,10,6,0)');
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, cy - 0.9 * s + 200);
  const sp = softSprite('#2a1008');
  ctx.save();
  ctx.globalAlpha = 0.28; ctx.drawImage(sp, cx - 0.8 * s, cy + 0.42 * s, 1.6 * s, 0.4 * s);
  ctx.globalAlpha = 0.3; ctx.drawImage(sp, cx - s * 1.25, cy - 0.25 * s, 0.5 * s, 0.5 * s);
  ctx.drawImage(sp, cx + s * 0.75, cy - 0.25 * s, 0.5 * s, 0.5 * s);
  // philtrum
  ctx.globalAlpha = 0.18; ctx.drawImage(sp, cx - 0.07 * s, cy - 0.95 * s, 0.14 * s, 0.7 * s);
  const lt = softSprite('#ffe0c8');
  ctx.globalAlpha = 0.13; ctx.drawImage(lt, cx - 0.22 * s, cy - 0.95 * s, 0.12 * s, 0.68 * s);
  ctx.drawImage(lt, cx + 0.1 * s, cy - 0.95 * s, 0.12 * s, 0.68 * s);
  ctx.globalAlpha = 0.2; ctx.drawImage(lt, cx - 0.5 * s, cy + 0.85 * s, s, 0.5 * s);
  ctx.restore();
  // pores
  ctx.globalAlpha = 0.5 + dry * 0.4;
  ctx.drawImage(skinTexture(), 0, 0, W, H);
  ctx.globalAlpha = 1;
  // dry flaky skin
  if (dry > 0.05) {
    const r = rng(5);
    ctx.fillStyle = `rgba(245,230,215,${0.35 * dry})`;
    for (let i = 0; i < 160 * dry; i++) {
      const a = r() * TAU, d = s * (0.95 + r() * 0.5);
      const x = cx + Math.cos(a) * d * 1.05, y = cy + Math.sin(a) * d * 0.55;
      ctx.beginPath(); ctx.ellipse(x, y, 2 + r() * 7, 1 + r() * 3, r() * 3, 0, TAU); ctx.fill();
    }
  }
  // mouth interior
  ctx.fillStyle = '#2a0b0d';
  mouthPath(ctx, cx, cy, s, op); ctx.fill();
  if (op > 4) {
    ctx.save(); mouthPath(ctx, cx, cy, s, op); ctx.clip();
    const tg = ctx.createLinearGradient(0, cy - op, 0, cy + op * 0.2);
    tg.addColorStop(0, 'rgba(120,95,85,0.0)'); tg.addColorStop(0.5, 'rgba(205,190,175,0.5)'); tg.addColorStop(1, 'rgba(120,95,85,0.0)');
    ctx.fillStyle = tg;
    for (let i = -3; i <= 2; i++) { rrect(ctx, cx + i * 0.15 * s + 4, cy - op, 0.15 * s - 8, op * 1.05 + 0.04 * s, 10); ctx.fill(); }
    const sh = ctx.createLinearGradient(0, cy - op, 0, cy);
    sh.addColorStop(0, 'rgba(20,4,6,0.8)'); sh.addColorStop(1, 'rgba(20,4,6,0)');
    ctx.fillStyle = sh; ctx.fillRect(cx - s, cy - op - 0.05 * s, 2 * s, op + 0.05 * s);
    ctx.restore();
  }
  const lipA = mixc('#a63f4c', '#9c6e6a', dry * 0.85), lipB = mixc('#c85d66', '#b28680', dry * 0.85), lipC = mixc('#e3888b', '#c49c94', dry * 0.85);
  // upper lip
  g = ctx.createLinearGradient(0, cy - 0.36 * s, 0, cy);
  g.addColorStop(0, css(lipB)); g.addColorStop(0.55, css(lipA)); g.addColorStop(1, css(mixc(lipA, '#3a0f14', 0.45)));
  ctx.fillStyle = g; lipsUpperPath(ctx, cx, cy, s, op); ctx.fill();
  // lower lip
  g = ctx.createLinearGradient(0, cy, 0, cy + 0.5 * s);
  g.addColorStop(0, css(mixc(lipA, '#3a0f14', 0.4))); g.addColorStop(0.3, css(lipB)); g.addColorStop(0.62, css(lipC)); g.addColorStop(1, css(mixc(lipA, '#5a2025', 0.3)));
  ctx.fillStyle = g; lipsLowerPath(ctx, cx, cy, s, op); ctx.fill();
  // texture lines, flakes, cracks clipped to lips
  ctx.save();
  ctx.beginPath();
  lipsUpperPath(ctx, cx, cy, s, op);
  ctx.save(); ctx.clip();
  lipLines(ctx, cx, cy - 0.36 * s, cy, s, dry, 11);
  ctx.restore();
  lipsLowerPath(ctx, cx, cy, s, op);
  ctx.clip();
  lipLines(ctx, cx, cy, cy + 0.5 * s, s, dry, 23);
  // vermilion border light
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = `rgba(255,220,210,${0.22 - dry * 0.1})`; ctx.lineWidth = 3;
  lipsUpperPath(ctx, cx, cy, s, op); ctx.stroke();
  ctx.restore();
  // gloss
  const gl = (1 - dry) * (o.gloss == null ? 1 : o.gloss);
  if (gl > 0.02) {
    const ws = softSprite('#ffffff');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.42 * gl; ctx.drawImage(ws, cx - 0.42 * s, cy + 0.17 * s, 0.6 * s, 0.14 * s);
    ctx.globalAlpha = 0.3 * gl; ctx.drawImage(ws, cx + 0.12 * s, cy + 0.2 * s, 0.32 * s, 0.1 * s);
    ctx.globalAlpha = 0.22 * gl; ctx.drawImage(ws, cx - 0.3 * s, cy - 0.27 * s, 0.22 * s, 0.07 * s);
    ctx.drawImage(ws, cx + 0.12 * s, cy - 0.27 * s, 0.22 * s, 0.07 * s);
    ctx.restore();
  }
}

function lipLines(ctx, cx, y0, y1, s, dry, seed) {
  const r = rng(seed);
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(80,15,25,${0.16 + dry * 0.18})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 70; i++) {
    const x = cx - s + (2 * s * i) / 70 + (r() - 0.5) * 8;
    const bend = (x - cx) / s * 18;
    ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + bend, (y0 + y1) / 2, x + bend * 0.3, y1);
  }
  ctx.stroke();
  if (dry > 0.05) {
    // flakes
    ctx.fillStyle = `rgba(240,225,215,${0.55 * dry})`;
    for (let i = 0; i < 70 * dry; i++) {
      const x = cx - s * 0.9 + r() * s * 1.8, y = lerp(y0, y1, r());
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + 4 + r() * 12, y + (r() - 0.5) * 6); ctx.lineTo(x + 2 + r() * 6, y + 3 + r() * 6); ctx.closePath(); ctx.fill();
    }
    // cracks
    for (let i = 0; i < 14 * dry; i++) {
      let x = cx - s * 0.85 + r() * s * 1.7, y = y0 + (y1 - y0) * (0.1 + r() * 0.2);
      ctx.strokeStyle = `rgba(70,8,14,${0.75 * dry})`;
      ctx.lineWidth = 2 + r() * 3.5;
      ctx.beginPath(); ctx.moveTo(x, y);
      const n = 4 + ((r() * 4) | 0);
      for (let k = 0; k < n; k++) { x += (r() - 0.5) * 14; y += (y1 - y0) * 0.12; ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.strokeStyle = `rgba(180,40,45,${0.35 * dry})`; ctx.lineWidth = 1; ctx.stroke();
    }
  }
}

/* ---------- POV hand (right hand, palm down, seen from behind) ---------- */
const FINGERS = [
  { x: -0.36, len: 0.9, w: 0.225, a: -0.12 },
  { x: -0.12, len: 1.02, w: 0.235, a: -0.035 },
  { x: 0.12, len: 0.96, w: 0.225, a: 0.04 },
  { x: 0.35, len: 0.74, w: 0.195, a: 0.13 },
];
function drawHand(ctx, x, y, s, ang, grip, o = {}) {
  const skin = o.skin || '#c08460', dark = o.dark || '#7c4a32', lightc = o.light || '#e2ad86';
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // forearm
  let g = ctx.createLinearGradient(-0.6, 0, 0.6, 0);
  g.addColorStop(0, css(dark)); g.addColorStop(0.6, css(skin)); g.addColorStop(1, css(mixc(skin, dark, 0.4)));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-0.42, -0.4); ctx.lineTo(-0.62, 5); ctx.lineTo(0.66, 5); ctx.lineTo(0.44, -0.4); ctx.closePath(); ctx.fill();
  // tendons / veins on forearm
  ctx.strokeStyle = 'rgba(90,60,90,0.18)'; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(0.05, 0.2); ctx.quadraticCurveTo(0.12, 1.2, 0.02, 2.4); ctx.stroke();
  // thumb
  const tA = lerp(-0.95, -0.28, grip), tL = lerp(0.72, 0.46, grip);
  ctx.save(); ctx.translate(-0.4, -0.28); ctx.rotate(tA);
  ctx.strokeStyle = css(mixc(skin, dark, 0.15)); ctx.lineWidth = 0.27;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -tL); ctx.stroke();
  ctx.fillStyle = css(mixc(lightc, '#f0d0c0', 0.3), 0.8);
  ellipse(ctx, 0.01, -tL + 0.06, 0.07, 0.09); ctx.fill();
  ctx.restore();
  // palm (back of hand)
  g = ctx.createLinearGradient(-0.5, 0, 0.5, 0);
  g.addColorStop(0, css(mixc(skin, dark, 0.45))); g.addColorStop(0.55, css(skin)); g.addColorStop(1, css(mixc(skin, dark, 0.3)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-0.4, 0.04); ctx.lineTo(0.41, 0.04);
  ctx.bezierCurveTo(0.47, -0.4, 0.51, -0.78, 0.47, -1.0);
  ctx.quadraticCurveTo(0, -1.12, -0.49, -1.0);
  ctx.bezierCurveTo(-0.53, -0.7, -0.48, -0.3, -0.4, 0.04);
  ctx.closePath(); ctx.fill();
  // tendons on back of hand
  ctx.strokeStyle = 'rgba(255,220,190,0.06)'; ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (const f of FINGERS) { ctx.moveTo(f.x * 0.45, -0.1); ctx.lineTo(f.x, -0.92); }
  ctx.stroke();
  // fingers
  for (let i = 0; i < 4; i++) {
    const f = FINGERS[i];
    const tremble = (o.tremble || 0) * noise((o.t || 0) * 9 + i * 3, 11) * 0.06;
    const fa = f.a * (1 - grip * 0.8) + tremble;
    const L = f.len * lerp(1, 0.3, grip);
    ctx.save(); ctx.translate(f.x, -0.98); ctx.rotate(fa);
    g = ctx.createLinearGradient(-f.w / 2, 0, f.w / 2, 0);
    g.addColorStop(0, css(mixc(skin, dark, 0.5))); g.addColorStop(0.55, css(skin)); g.addColorStop(1, css(mixc(skin, dark, 0.35)));
    ctx.strokeStyle = g; ctx.lineWidth = f.w * lerp(1, 1.12, grip);
    ctx.beginPath(); ctx.moveTo(0, 0.02); ctx.lineTo(0, -L); ctx.stroke();
    if (grip < 0.65) {
      // nail + knuckle creases
      ctx.fillStyle = css(mixc('#e8b9a6', '#d8c0b0', o.dusty || 0), 0.85);
      ellipse(ctx, 0, -L + 0.11, f.w * 0.3, 0.1); ctx.fill();
      ctx.strokeStyle = 'rgba(90,50,35,0.35)'; ctx.lineWidth = 0.012;
      for (const q of [0.38, 0.68]) { ctx.beginPath(); ctx.moveTo(-f.w * 0.3, -L * q); ctx.quadraticCurveTo(0, -L * q + 0.02, f.w * 0.3, -L * q); ctx.stroke(); }
    } else {
      // curled: knuckle highlight and shadowed tip
      ctx.fillStyle = 'rgba(60,30,20,0.35)';
      ellipse(ctx, 0, -L, f.w * 0.48, f.w * 0.3); ctx.fill();
    }
    ctx.fillStyle = css(lightc, 0.35);
    ellipse(ctx, 0.01, 0, f.w * 0.32, f.w * 0.2); ctx.fill();
    ctx.restore();
  }
  // soil in fist
  if (o.soil > 0) {
    const r = rng(77);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = r() < 0.5 ? `rgba(110,82,55,${o.soil})` : `rgba(150,120,85,${o.soil})`;
      const xx = -0.45 + r() * 0.9, yy = -1.18 + r() * 0.16;
      ellipse(ctx, xx, yy, 0.03 + r() * 0.05, 0.02 + r() * 0.04, r() * 3); ctx.fill();
    }
  }
  if (o.dusty > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(200,175,140,${0.25 * o.dusty})`;
    ctx.fillRect(-1, -2.2, 2, 7.5);
  }
  ctx.restore();
}

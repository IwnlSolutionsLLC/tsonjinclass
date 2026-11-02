'use strict';
/* First-person ground plane: cracking earth + hallucinated river. */

const POV = { hy: 600, f: 900, hc: 1.25, cx: W / 2, ready: false };
function gproj(X, Z) { return [POV.cx + (X * POV.f) / Z, POV.hy + (POV.hc * POV.f) / Z]; }

function povInit() {
  if (POV.ready) return;
  const r = rng(55);
  const sp = 0.5, cols = Math.ceil(30 / sp), rows = Math.ceil(25 / sp);
  const P = [];
  for (let j = 0; j <= rows; j++) {
    P[j] = [];
    for (let i = 0; i <= cols; i++) {
      P[j][i] = [-15 + i * sp + (r() - 0.5) * sp * 0.7, 0.7 + j * sp + (r() - 0.5) * sp * 0.7];
    }
  }
  const origin = [0.4, 2.6];
  POV.edges = [];
  const vis = (p) => Math.abs(p[0]) < 0.66 * p[1] + 1.2;
  const addEdge = (a, b) => {
    if (!vis(a) || !vis(b)) return;
    const m = [(a[0] + b[0]) / 2 + (r() - 0.5) * 0.12, (a[1] + b[1]) / 2 + (r() - 0.5) * 0.12];
    const d = Math.hypot(m[0] - origin[0], (m[1] - origin[1]) * 0.8);
    POV.edges.push({ pa: gproj(a[0], a[1]), pm: gproj(m[0], m[1]), pb: gproj(b[0], b[1]), birth: d / 6.5 + r() * 0.25, z: m[1] });
  };
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      if (i < cols && r() > 0.06) addEdge(P[j][i], P[j][i + 1]);
      if (j < rows && r() > 0.06) addEdge(P[j][i], P[j + 1][i]);
      if (i < cols && j < rows && r() < 0.2) addEdge(P[j][i], P[j + 1][i + 1]);
    }
  }
  // cell tint canvas
  const c = makeCanvas(), x = c.getContext('2d');
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!vis(P[j][i]) || !vis(P[j + 1][i + 1])) continue;
      const q = [P[j][i], P[j][i + 1], P[j + 1][i + 1], P[j + 1][i]].map((p) => gproj(p[0], p[1]));
      const v = r();
      x.fillStyle = v < 0.5 ? `rgba(255,235,200,${0.05 + v * 0.1})` : `rgba(60,35,15,${0.04 + (v - 0.5) * 0.14})`;
      poly(x, q); x.fill();
      // plate edge curl highlight
      const cpt = gproj((P[j][i][0] + P[j + 1][i + 1][0]) / 2, (P[j][i][1] + P[j + 1][i + 1][1]) / 2);
      const rad = clamp(0.25 * POV.f / P[j][i][1], 2, 120);
      spr(x, softSprite('#fff1d8'), cpt[0], cpt[1] - rad * 0.2, rad, 0.06);
      x.globalAlpha = 1;
    }
  }
  POV.cellTex = c;
  // river centreline (ground plane)
  const ctrl = [[3, 46], [5.5, 26], [1.5, 14], [-3.2, 8.2], [-2.6, 5.0], [0.8, 3.45], [5, 2.85], [12, 2.65]];
  POV.river = [];
  const n = ctrl.length;
  for (let k = 0; k < n - 1; k++) {
    const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(n - 1, k + 2)];
    for (let s = 0; s < 1; s += 1 / 14) {
      const s2 = s * s, s3 = s2 * s;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
      POV.river.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  POV.river.push(ctrl[n - 1]);
  POV.flow = [];
  for (let i = 0; i < 140; i++) POV.flow.push({ u: r(), l: r() * 2 - 1, sp: 0.6 + r() * 0.6, sz: 0.5 + r() });
  POV.ready = true;
}

function drawCracks(ctx, lt, amount) {
  povInit();
  if (amount <= 0 || lt <= 0) return;
  ctx.save();
  // tint of the plates, revealed with the crack front
  const front = lt * 6.5;
  const o = gproj(0.4, 2.6);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(o[0], o[1], front * 260 + 1, front * 120 + 1, 0, 0, TAU);
  ctx.clip();
  ctx.globalAlpha = amount;
  ctx.drawImage(POV.cellTex, 0, 0);
  ctx.restore();
  // crack lines in width buckets
  const buckets = [[], [], [], [], [], []];
  for (const e of POV.edges) {
    const p = clamp((lt - e.birth) / 0.3);
    if (p <= 0 || e.z > 24) continue;
    const w = clamp((0.03 * POV.f) / e.z, 0.5, 6.5);
    const bi = Math.min(5, Math.floor(Math.log2(w + 1) * 1.6));
    buckets[bi].push([e, p]);
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let bi = 0; bi < 6; bi++) {
      const wb = Math.pow(2, (bi + 0.5) / 1.6) - 1;
      ctx.lineWidth = pass ? Math.max(0.6, wb * 0.35) : wb;
      ctx.strokeStyle = pass ? `rgba(255,238,210,${0.4 * amount})` : `rgba(52,32,16,${0.78 * amount})`;
      ctx.beginPath();
      for (const [e, p] of buckets[bi]) {
        const a = e.pa, m = e.pm, b = e.pb;
        const dy = pass ? -Math.max(1, wb * 0.6) : 0;
        ctx.moveTo(a[0], a[1] + dy);
        if (p < 0.5) {
          const q = p * 2;
          ctx.lineTo(lerp(a[0], m[0], q), lerp(a[1], m[1], q) + dy);
        } else {
          ctx.lineTo(m[0], m[1] + dy);
          const q = (p - 0.5) * 2;
          ctx.lineTo(lerp(m[0], b[0], q), lerp(m[1], b[1], q) + dy);
        }
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function riverEdges(t, wob) {
  const L = [], R = [], C = [];
  const pts = POV.river, hw = 1.25;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const l = Math.hypot(tx, tz); tx /= l; tz /= l;
    const nx = -tz, nz = tx;
    const p = pts[i];
    const w1 = hw * (1 + wob * 0.25 * Math.sin(t * 3 + i * 0.7));
    const w2 = hw * (1 + wob * 0.25 * Math.sin(t * 2.6 + i * 0.9 + 2));
    L.push(gproj(p[0] + nx * w1, Math.max(0.6, p[1] + nz * w1)));
    R.push(gproj(p[0] - nx * w2, Math.max(0.6, p[1] - nz * w2)));
    C.push([p, [tx, tz], [nx, nz]]);
  }
  return { L, R, C };
}

function drawRiver(ctx, t, alpha, distort = 0) {
  povInit();
  if (alpha <= 0.01) return;
  const { L, R, C } = riverEdges(t, 1 + distort * 3);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L) ctx.lineTo(p[0], p[1]);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, POV.hy, 0, POV.hy + 520);
  g.addColorStop(0, '#d6eef6'); g.addColorStop(0.35, '#7cc2dc'); g.addColorStop(1, '#2f86ad');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(140,220,255,0.9)'; ctx.shadowBlur = 30;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  // sky reflection streaks
  ctx.globalCompositeOperation = 'screen';
  const n = C.length;
  for (const f of POV.flow) {
    const u = (f.u + t * 0.035 * f.sp) % 1;
    const fi = u * (n - 1), i = Math.floor(fi), k = fi - i;
    const a = C[i], b = C[Math.min(n - 1, i + 1)];
    const X = lerp(a[0][0], b[0][0], k) + a[2][0] * f.l * 1.1, Z = lerp(a[0][1], b[0][1], k) + a[2][1] * f.l * 1.1;
    if (Z < 0.8) continue;
    const p = gproj(X, Z);
    const rx = (0.32 * POV.f * f.sz) / Z;
    ctx.globalAlpha = alpha * 0.5 * Math.sin(Math.PI * u);
    ctx.fillStyle = '#ffffff';
    ellipse(ctx, p[0], p[1], rx, rx * 0.12, Math.atan2(a[1][1], a[1][0]) * 0.15); ctx.fill();
  }
  // glints
  for (let i = 0; i < 60; i++) {
    const u = hash(i * 3.1), l = hash(i * 7.7) * 2 - 1;
    const fi = u * (n - 1), j = Math.floor(fi);
    const a = C[j];
    const Z = a[0][1] + a[2][1] * l;
    if (Z < 0.8) continue;
    const p = gproj(a[0][0] + a[2][0] * l, Z);
    const tw = Math.max(0, Math.sin(t * 7 + i * 1.7));
    spr(ctx, softSprite('#ffffff'), p[0], p[1], (40 / Z) * 6 * tw + 2, alpha * 0.8 * tw);
  }
  ctx.restore();
}

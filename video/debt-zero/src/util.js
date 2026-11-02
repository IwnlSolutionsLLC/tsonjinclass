'use strict';
/* Shared helpers: frame size, deterministic randomness, easing, colour, sprites. */

const W = 1080, H = 1920, FPS = 30;
const TAU = Math.PI * 2;

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const sstep = (t) => t * t * (3 - 2 * t);
const bell = (t) => Math.sin(Math.PI * clamp(t));
const E = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  out5: (t) => 1 - Math.pow(1 - t, 5),
  in: (t) => t * t * t,
  in2: (t) => t * t,
  expoIn: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  back: (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
};

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 1013.7), hash(i + 1 + seed * 1013.7), u) * 2 - 1;
}
function fbm(x, seed = 0, oct = 3) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x * f, seed + i * 7); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
function hash2(x, y, seed) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
}
function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}

/* colours: '#rrggbb' or [r,g,b] */
const _cc = {};
function col(h) {
  if (Array.isArray(h)) return h;
  if (_cc[h]) return _cc[h];
  const n = parseInt(h.slice(1), 16);
  return (_cc[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
function mixc(a, b, t) {
  a = col(a); b = col(b);
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
function css(c, a = 1) {
  c = col(c);
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

function makeCanvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* soft round sprite, cached by colour/hardness */
const _spr = {};
function softSprite(color = '#ffffff', hard = 0, size = 128) {
  const key = color + '|' + hard + '|' + size;
  if (_spr[key]) return _spr[key];
  const c = makeCanvas(size, size), x = c.getContext('2d'), r = size / 2;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, css(color, 1));
  g.addColorStop(clamp(hard, 0, 0.98), css(color, hard > 0 ? 1 : 0.6));
  g.addColorStop(1, css(color, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return (_spr[key] = c);
}
function spr(ctx, s, x, y, r, a = 1) {
  if (a <= 0.002 || r <= 0.2) return;
  ctx.globalAlpha = a;
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function poly(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
/* smooth closed/open curve through points (Catmull-Rom -> bezier) */
function smoothPath(ctx, pts, close = true, move = true) {
  const n = pts.length;
  const P = (i) => (close ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  if (move) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); }
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1]);
  }
  if (close) ctx.closePath();
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtClock(v) {
  v = Math.max(0, Math.floor(v));
  const h = Math.floor(v / 3600), m = Math.floor((v % 3600) / 60), s = v % 60;
  return pad2(h) + ':' + pad2(m) + ':' + pad2(s);
}

/* film grain tiles, generated once */
let GRAIN = null;
function grainTiles() {
  if (GRAIN) return GRAIN;
  GRAIN = [];
  const r = rng(99);
  for (let k = 0; k < 6; k++) {
    const c = makeCanvas(360, 640), x = c.getContext('2d');
    const img = x.createImageData(360, 640);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (r() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    GRAIN.push(c);
  }
  return GRAIN;
}

'use strict';
/* Timeline (from the voice-over), shots, compositor, audio cues. */

const BUF = {};
function bufInit() {
  if (BUF.scene) return;
  for (const k of ['scene', 'person', 'rim', 'tmp']) BUF[k] = makeCanvas();
  const v = makeCanvas(), x = v.getContext('2d');
  let g = x.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  BUF.vignette = v;
  const s = makeCanvas(), y = s.getContext('2d');
  g = y.createLinearGradient(0, 0, 0, 520);
  g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  y.fillStyle = g; y.fillRect(0, 0, W, 520);
  BUF.scrim = s;
}
function resetCtx(c) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.shadowBlur = 0; c.shadowColor = 'transparent'; c.letterSpacing = '0px'; c.setLineDash([]);
}
function shot(lt, D, cuts) {
  const b = [0, ...cuts.map((c) => c * D), D];
  for (let i = 0; i < b.length - 1; i++) if (lt < b[i + 1] || i === b.length - 2) return { i, t: lt - b[i], d: b[i + 1] - b[i], f: (lt - b[i]) / (b[i + 1] - b[i]) };
}
function pushCam(ctx, z, fx = W / 2, fy = H / 2) { ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy); }

const SIT = poseMap(POSE.slump, ([x, y]) => [x, y]);
const PROP = Object.assign({}, POSE.slump, { eR: [0.15, -0.68], hR: [0.055, -0.86] });
const GUY = { shirt: '#3a3f4a', shirt2: '#2a2e36', pants: '#22283a', skin: '#c48a62', skin2: '#9a6446', hair: '#16100c', shoe: '#1b1b1d' };

/* guy on the bed at night, face lit by the phone */
function guyNight(ctx, t, glow = 1) {
  drawRoom(ctx, t, { day: 0, curtain: 0.2 });
  const p = poseBreath(Object.assign({}, POSE.slump, { eR: [0.13, -0.66], hR: [0.03, -0.74], eL: [-0.13, -0.66], hL: [-0.02, -0.73] }), 0.3 + 0.3 * Math.sin(t * 1.5));
  renderPerson(ctx, p, 540, 2050, 1500, { C: GUY, face: 1, tint: `rgba(40,110,255,${0.32 * glow})`, rim: 0.5, rimColor: 'rgba(90,160,255,1)' });
  // phone glow
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  spr(ctx, softSprite('#4f8dff'), 545, 950, 360, 0.55 * glow);
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(150,200,255,${0.9 * glow})`; rrect(ctx, 505, 935, 80, 120, 10); ctx.fill();
}

/* ---------- HOOK ---------- */
function shotHook(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.1 - 0.06 * (lt / D), W / 2, 900);
  guyNight(ctx, T, 1);
  ctx.restore();
  ctx.fillStyle = 'rgba(2,4,12,0.45)'; ctx.fillRect(0, 0, W, H);
  const a = E.out(seg(lt, 0.3, 1.0));
  neonText(ctx, W / 2, 470, 'ХЭРВЭЭ ТА', 64, '#4cc9ff', a, 800);
  neonText(ctx, W / 2, 640, '7 ХОНОГ', 190, '#ff2d75', E.out(seg(lt, 0.6, 1.3)));
  hudLabel(ctx, W / 2, 790, 'насанд хүрэгчдийн контент үзэхээ больвол', { size: 40, weight: 700, color: '#e6ecff', align: 'center', ls: 1, alpha: seg(lt, 1.2, 1.8), glow: 'rgba(0,0,0,0.8)' });
  neonText(ctx, W / 2, 900, 'ТАРХИНД ТАНЬ', 76, '#4cc9ff', seg(lt, 2.4, 3.0));
  neonText(ctx, W / 2, 1000, 'ЮУ БОЛОХ ВЭ?', 96, '#ffd24a', seg(lt, 3.0, 3.6));
}

/* ---------- DAY 1: withdrawal ---------- */
function shotD1(ctx, lt, T, D) {
  const s = shot(lt, D, [0.38, 0.66]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.0 + 0.08 * s.f, W / 2, 1000);
    guyNight(ctx, T, 1);
    ctx.restore();
    // bedside clock
    rrect(ctx, 70, 1300, 260, 120, 18); ctx.fillStyle = '#05070c'; ctx.fill();
    hudLabel(ctx, 200, 1362, '01:00', { size: 70, weight: 800, color: '#ff4d4d', align: 'center', font: '"JetBrains Mono"', ls: 0, glow: 'rgba(255,60,60,0.8)' });
  } else if (s.i === 1) {
    // close-up: thumb drifts to the app, then the phone is turned face down
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#141a2c'; ctx.fillRect(0, 1250, W, 700);
    const flip = E.inOut(seg(s.t, s.d * 0.62, s.d * 0.92));
    const sy = Math.cos(flip * Math.PI);
    ctx.save();
    ctx.translate(W / 2, lerp(980, 1330, flip)); ctx.scale(1, Math.max(0.02, Math.abs(sy))); ctx.translate(-W / 2, -lerp(980, 1330, flip));
    drawPhone(ctx, W / 2, lerp(980, 1330, flip), 1000, sy > 0 ? homeScreen(T, seg(s.t, 0.4, s.d * 0.55)) : backSide, { hand: flip < 0.5 });
    ctx.restore();
    if (sy > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; spr(ctx, softSprite('#3f7dff'), W / 2, 980, 700, 0.35 * sy); ctx.restore(); ctx.globalAlpha = 1; }
    hudChip(ctx, W / 2, 1700, 'УТСАА ДООШ ХАРУУЛЖ ТАВИНА', '#4cc9ff', seg(s.t, s.d * 0.8, s.d * 0.95), 30);
  } else {
    holoBg(ctx, T, '#ff2d55', 0.6);
    const v = lerp(0.85, 0.22, E.inOut(seg(s.t, 0.4, s.d - 0.5)));
    drawBrainNet(ctx, T, { color: '#ff4d6d', activity: 0.35, alert: 1, cx: 480, cy: 1180, s: 1.4, regions: { reward: 0.8 } });
    drawMeter(ctx, 960, 760, 760, v, 'ДОПАМИН', '#ff4d6d');
    hudChip(ctx, W / 2 - 60, 1680, 'ШУНАЛ · БУХИМДАЛ · ХООСОН МЭДРЭМЖ', '#ff4d6d', seg(s.t, 0.8, 1.3), 28);
  }
}
function homeScreen(T, p) {
  return (ctx, w, h) => {
    const u = w / 100;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1b2a6b'); g.addColorStop(1, '#0a0f2a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    hudLabel(ctx, 50 * u, 22 * u, '01:00', { size: 18 * u, weight: 300, color: '#ffffff', align: 'center', ls: 0 });
    const cols = ['#ff9f43', '#10ac84', '#5f27cd', '#2e86de', '#ee5253', '#48dbfb', '#feca57', '#1dd1a1'];
    for (let i = 0; i < 16; i++) {
      const x = 10 * u + (i % 4) * 21 * u, y = 50 * u + Math.floor(i / 4) * 24 * u;
      const target = i === 6;
      rrect(ctx, x, y, 16 * u, 16 * u, 4 * u); ctx.fillStyle = target ? '#e11d48' : cols[i % 8]; ctx.fill();
      if (target) {
        const pul = 0.5 + 0.5 * Math.sin(T * 8);
        ctx.strokeStyle = `rgba(255,80,120,${0.6 + 0.4 * pul})`; ctx.lineWidth = 1.2 * u; rrect(ctx, x - 1.5 * u, y - 1.5 * u, 19 * u, 19 * u, 5 * u); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 6 * u, y + 4.5 * u); ctx.lineTo(x + 11.5 * u, y + 8 * u); ctx.lineTo(x + 6 * u, y + 11.5 * u); ctx.closePath(); ctx.fill();
      }
    }
    // thumb drifting toward the app
    const tx = lerp(80 * u, 10 * u + 2 * 21 * u + 8 * u, E.inOut(p)), ty = lerp(170 * u, 50 * u + 24 * u + 8 * u, E.inOut(p));
    ctx.fillStyle = 'rgba(200,140,100,0.92)'; ellipse(ctx, tx, ty + 8 * u, 9 * u, 13 * u, -0.4); ctx.fill();
  };
}
function backSide(ctx, w, h) {
  ctx.fillStyle = '#1a1c22'; ctx.fillRect(0, 0, w, h);
  rrect(ctx, w * 0.08, h * 0.04, w * 0.36, w * 0.36, w * 0.06); ctx.fillStyle = '#0c0d10'; ctx.fill();
}

/* ---------- DAY 2: flatline / brain fog ---------- */
function shotD2(ctx, lt, T, D) {
  const s = shot(lt, D, [0.36, 0.58]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.02 + 0.05 * s.f, W / 2, 1100);
    drawClassroom(ctx, T);
    const sway = Math.sin(T * 0.9) * 0.02;
    renderPerson(ctx, poseRotate(PROP, 0, -0.5, sway), 540, 2200, 1650, { C: Object.assign({}, GUY, { shirt: '#5a6a7a', shirt2: '#47535f' }), face: 1, headDown: 0.25, rim: 0.2 });
    // desk + coffee
    ctx.fillStyle = '#6a5240'; ctx.fillRect(0, 1500, W, 420); ctx.fillStyle = '#7d6250'; ctx.fillRect(0, 1490, W, 22);
    ctx.fillStyle = '#e8e2d8'; rrect(ctx, 760, 1360, 120, 140, 16); ctx.fill();
    ctx.strokeStyle = '#e8e2d8'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(890, 1420, 32, -1.2, 1.2); ctx.stroke();
    for (let i = 0; i < 4; i++) spr(ctx, softSprite('#ffffff'), 820 + Math.sin(T * 2 + i) * 14, 1330 - ((T * 40 + i * 30) % 120), 26, 0.15);
    ctx.fillStyle = '#e9e4d6'; ctx.fillRect(160, 1420, 420, 70);
    ctx.restore();
    // fog
    const fs = softSprite('#c9ccd2');
    for (let i = 0; i < 16; i++) spr(ctx, fs, ((hash(i) * 1400 + T * 30) % 1500) - 200, 300 + hash(i + 2) * 1500, 260 + hash(i + 4) * 260, 0.22);
    ctx.globalAlpha = 1;
    hudChip(ctx, W / 2, 1720, 'ТОЛГОЙ МАНАНТАЙ', '#9aa4b2', seg(s.t, 0.8, 1.3), 32);
  } else if (s.i === 1) {
    const z = Math.pow(7, E.in(s.f));
    ctx.save(); pushCam(ctx, z, W / 2, 1000);
    drawEye(ctx, W / 2, 1000, 230, T, { pupil: 0.32 + 0.1 * s.f });
    ctx.restore();
    if (s.f > 0.75) { ctx.fillStyle = `rgba(0,0,0,${seg(s.f, 0.75, 1)})`; ctx.fillRect(0, 0, W, H); }
  } else {
    drawSynapse(ctx, T, lerp(0.15, 0.85, E.inOut(seg(s.t, 0.5, s.d - 0.5))));
    hudChip(ctx, W / 2, 1680, 'АМАРЧ, ДАХИН МЭДРЭМТГИЙ БОЛНО', '#4dffb0', seg(s.t, 1.2, 1.7), 30);
  }
}
function drawClassroom(ctx, t) {
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#b9c0c4'); g.addColorStop(1, '#8e969a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2f4a3a'; ctx.fillRect(80, 420, 920, 460);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(140, 520); ctx.lineTo(520, 520); ctx.moveTo(140, 600); ctx.lineTo(700, 600); ctx.moveTo(140, 680); ctx.lineTo(430, 680); ctx.stroke();
  hudLabel(ctx, 560, 780, 'f(x) = ?', { size: 60, weight: 600, color: 'rgba(255,255,255,0.6)', ls: 0 });
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 900, W, 40);
}

/* ---------- DAY 3: peak urge ---------- */
function shotD3(ctx, lt, T, D) {
  const s = shot(lt, D, [0.4, 0.66]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.05 + 0.05 * s.f, W / 2, 1150);
    drawBedTop(ctx, T, 1);
    ctx.restore();
    drawFlashes(ctx, T, 1);
    const wa = seg(s.t, 2.0, 2.6) * (1 - seg(s.t, s.d - 0.6, s.d));
    hudLabel(ctx, W / 2, 1760, '«Ганцхан удаа…»', { size: 64, weight: 600, color: '#ff8fb0', align: 'center', ls: 2, alpha: wa * (0.7 + 0.3 * Math.sin(T * 5)), glow: 'rgba(255,40,100,0.8)' });
  } else if (s.i === 1) {
    drawHeart3D(ctx, s.t, T);
    drawECG(ctx, T, 90, 1450, 900, 260, { alpha: seg(s.t, 0.2, 0.6) });
  } else {
    holoBg(ctx, T, '#8a7dff', 0.3);
    const fight = E.inOut(seg(s.t, 0.4, s.d - 0.6));
    drawBrainNet(ctx, T, { color: '#a9a3ff', activity: 0.6, cx: W / 2, cy: 1200, s: 1.25, regions: { reward: 1 - 0.5 * fight, pfc: 0.4 + 0.6 * fight } });
    hudChip(ctx, 300, 1640, 'ШАГНАЛЫН ТӨВ', '#ff2d55', seg(s.t, 0.3, 0.7), 28);
    hudChip(ctx, 790, 760, 'ӨӨРИЙГӨӨ ХЯНАХ ТӨВ', '#3db7ff', seg(s.t, 0.9, 1.3), 28);
    drawMeter(ctx, 120, 820, 620, lerp(0.95, 0.55, fight), 'ХҮСЭЛ', '#ff2d55', seg(s.t, 0.3, 0.7));
    drawMeter(ctx, 960, 960, 620, lerp(0.35, 0.85, fight), 'ХЯНАЛТ', '#3db7ff', seg(s.t, 0.9, 1.3));
  }
}

/* ---------- DAY 4: fog clears ---------- */
function shotD4(ctx, lt, T, D) {
  const s = shot(lt, D, [0.55]);
  if (s.i === 0) {
    ctx.save(); pushCam(ctx, 1.08 - 0.06 * s.f, W / 2, 1000);
    drawRoom(ctx, T, { day: 1, curtain: lerp(0.3, 0.75, E.inOut(seg(s.t, 0.3, 3))) });
    renderPerson(ctx, poseBreath(POSE.stand, 0.3 + 0.3 * Math.sin(T)), 610, 2050, 1500, { C: GUY, face: 0, headDown: 1, sil: '#2a1f1c', rim: 0.9, rimColor: 'rgba(255,214,150,1)' });
    ctx.restore();
  } else {
    holoBg(ctx, T, '#4cc9ff', 0);
    drawBrainNet(ctx, T, { color: '#4cc9ff', activity: lerp(0.3, 0.75, s.f), cx: W / 2, cy: 1120, s: 1.55 });
    const icons = [['♪', 220, 1640], ['📖', 540, 1700], ['♫', 860, 1640]];
    for (const [ch, x, y] of icons) hudLabel(ctx, x, y + Math.sin(T * 2 + x) * 14, ch, { size: 90, weight: 400, color: '#bfefff', align: 'center', ls: 0, alpha: seg(s.t, 0.6, 1.2), font: 'Inter, "Noto Color Emoji"' });
    hudChip(ctx, W / 2, 1830, 'ТӨВЛӨРӨЛ ↑', '#4cc9ff', seg(s.t, 0.4, 0.9), 34);
  }
}

/* ---------- DAY 5: hormonal shift ---------- */
function shotD5(ctx, lt, T, D) {
  const s = shot(lt, D, [0.5]);
  if (s.i === 0) {
    drawStreet(ctx, T);
    hudChip(ctx, W / 2, 1720, 'ЭРЧ ХҮЧ ↑', '#ffd24a', seg(s.t, 0.6, 1.1), 36);
  } else {
    drawEnergyChart(ctx, T, seg(s.t, 0.3, s.d - 0.8));
  }
}

/* ---------- DAY 6: human connection ---------- */
function shotD6(ctx, lt, T, D) {
  ctx.save(); pushCam(ctx, 1.0 + 0.07 * (lt / D), W / 2, 1000);
  drawCafe(ctx, T, E.inOut(seg(lt, 1.5, 4.0)));
  ctx.restore();
  hudChip(ctx, W / 2, 1720, 'БОДИТ ХАРЬЦ · ӨРӨВДӨЛ', '#ffb45a', seg(lt, 4.0, 4.6), 32);
}

/* ---------- DAY 7: reset ---------- */
function shotD7(ctx, lt, T, D) {
  const s = shot(lt, D, [0.38, 0.76]);
  if (s.i === 0) {
    const open = E.inOut(seg(s.t, 1.6, 3.6));
    ctx.save(); pushCam(ctx, 1.04, W / 2, 1000);
    drawRoom(ctx, T, { day: 0.55 + 0.45 * open, curtain: lerp(0.05, 1, open) });
    const stand = E.inOut(seg(s.t, 0.3, 1.4));
    renderPerson(ctx, poseLerp(POSE.slump, POSE.stand, stand), 600, lerp(2250, 2050, stand), 1500, { C: GUY, face: 0, headDown: 1, sil: '#2a1f1c', rim: 0.6 + 0.4 * open, rimColor: 'rgba(255,220,160,1)' });
    ctx.restore();
    rrect(ctx, 70, 1300, 260, 120, 18); ctx.fillStyle = '#05070c'; ctx.fill();
    hudLabel(ctx, 200, 1362, '06:00', { size: 70, weight: 800, color: '#4dffb0', align: 'center', font: '"JetBrains Mono"', ls: 0, glow: 'rgba(60,255,170,0.7)' });
    hudChip(ctx, W / 2, 1720, 'СЭРҮҮЛЭГГҮЙ, ЭРЧ ХҮЧТЭЙ', '#4dffb0', seg(s.t, 1.0, 1.5), 30);
  } else if (s.i === 1) {
    holoBg(ctx, T, '#4dffb0', 0);
    drawBrainNet(ctx, T, { color: '#4cc9ff', activity: 0.85, links: E.inOut(seg(s.t, 0.4, s.d - 0.8)), linkColor: '#4dffb0', cx: W / 2, cy: 1150, s: 1.6 });
    hudChip(ctx, W / 2, 1720, 'ШИНЭ МЭДРЭЛИЙН ХОЛБООС', '#4dffb0', seg(s.t, 0.8, 1.3), 30);
  } else {
    ctx.fillStyle = '#050a10'; ctx.fillRect(0, 0, W, H);
    drawBrainNet(ctx, T, { color: '#2a6a8a', activity: 0.5, links: 0.5, linkColor: '#2a8a6a', cx: W / 2, cy: 1250, s: 1.6 });
    ctx.fillStyle = 'rgba(5,10,16,0.55)'; ctx.fillRect(0, 0, W, H);
    const a = E.out(seg(s.t, 0.2, 0.9));
    neonText(ctx, W / 2, 820, 'ЭНЭ БОЛ ТӨГСГӨЛ БИШ —', 54, '#4cc9ff', a, 800);
    neonText(ctx, W / 2, 960, 'ЭХЛЭЛ.', 170, '#4dffb0', E.out(seg(s.t, 0.8, 1.5)));
    hudLabel(ctx, W / 2, 1130, '7 хоногийн сорилтыг хэн давах вэ?', { size: 40, weight: 700, color: '#e6f6ff', align: 'center', ls: 1, alpha: seg(s.t, 1.6, 2.2) });
  }
}

/* ---------- timeline ---------- */
const SCENES = [
  { id: 'hook', fn: shotHook, grade: [1.05, 1.05] },
  { id: 'd1', day: 1, l1: '01 ДЭХ ӨДӨР', l2: 'ДОПАМИНЫ ШУНАЛ', fn: shotD1, grade: [0.95, 1.08] },
  { id: 'd2', day: 2, l1: '02 ДАХЬ ӨДӨР', l2: 'ХАВТГАЙ ШУГАМ', fn: shotD2, grade: [0.7, 1.0] },
  { id: 'd3', day: 3, l1: '03 ДАХЬ ӨДӨР', l2: 'СЭТГЭЛ ЗҮЙН ТУЛААН', fn: shotD3, grade: [0.95, 1.12] },
  { id: 'd4', day: 4, l1: '04 ДЭХ ӨДӨР', l2: 'МАНАН САРНИХ ҮЕ', fn: shotD4, grade: [1.1, 1.04] },
  { id: 'd5', day: 5, l1: '05 ДАХЬ ӨДӨР', l2: 'ДААВРЫН ӨӨРЧЛӨЛТ', fn: shotD5, grade: [1.12, 1.05] },
  { id: 'd6', day: 6, l1: '06 ДАХЬ ӨДӨР', l2: 'БОДИТ ХАРИЛЦАА', fn: shotD6, grade: [1.1, 1.04] },
  { id: 'd7', day: 7, l1: '07 ДАХЬ ӨДӨР', l2: 'ДАХИН АЧААЛАЛТ', fn: shotD7, grade: [1.15, 1.05] },
];
let DURATION = 0;
(function buildTimeline() {
  const lines = (window.VOICE && window.VOICE.lines) || [];
  let t = 0;
  SCENES.forEach((s, i) => {
    const v = lines[i];
    const lead = i === 0 ? 0.6 : 0.9, tail = i === SCENES.length - 1 ? 4.2 : 0.6;
    s.t0 = t; s.vstart = t + lead; s.vfile = v ? v.file : null;
    s.t1 = t + lead + (v ? v.dur : 10) + tail;
    s.flash = i > 0;
    t = s.t1;
  });
  DURATION = Math.round(t * 30) / 30;
  // racing heart on day 3
  const d3 = SCENES[3];
  BPM_KEYS = [[0, 68], [d3.t0, 70], [d3.t0 + 3, 112], [d3.t1, 118], [d3.t1 + 1, 72], [300, 68]];
  ECG.ph = null;
})();

function sceneIndex(T) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (T >= SCENES[i].t0) return i;
  return 0;
}
function drawDayHUD(ctx, T) {
  const i = sceneIndex(T), S = SCENES[i], lt = T - S.t0;
  if (!S.day) return;
  const a = seg(lt, 0.2, 0.6);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20;
  ctx.globalAlpha = a;
  ctx.font = '900 96px Inter'; ctx.letterSpacing = '4px'; ctx.fillStyle = '#ffffff';
  ctx.fillText(S.l1, W / 2, 230 + (1 - a) * 20);
  ctx.globalAlpha = seg(lt, 0.4, 0.8);
  ctx.font = '800 42px Inter'; ctx.letterSpacing = '8px'; ctx.fillStyle = '#4cc9ff';
  ctx.fillText(S.l2, W / 2, 300);
  ctx.restore();
  // 7-step progress
  for (let k = 1; k <= 7; k++) {
    const x = W / 2 + (k - 4) * 74, done = k < S.day, cur = k === S.day;
    const fill = cur ? seg(lt, 0.3, 1.0) : done ? 1 : 0;
    rrect(ctx, x - 28, 340, 56, 10, 5); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
    if (fill > 0) { rrect(ctx, x - 28, 340, 56 * fill, 10, 5); ctx.fillStyle = S.day === 7 ? '#4dffb0' : '#4cc9ff'; ctx.fill(); }
  }
}

let MAIN = null;
function renderAt(T) {
  bufInit();
  const main = MAIN;
  const i = sceneIndex(T), S = SCENES[i], lt = T - S.t0, D = S.t1 - S.t0;
  const sc = BUF.scene.getContext('2d');
  resetCtx(sc); sc.fillStyle = '#000'; sc.fillRect(0, 0, W, H);
  S.fn(sc, lt, T, D);
  resetCtx(sc);
  resetCtx(main); main.fillStyle = '#000'; main.fillRect(0, 0, W, H);
  const punch = S.flash ? 1 + 0.05 * (1 - E.out(seg(lt, 0, 0.45))) : 1;
  main.save(); pushCam(main, punch);
  main.filter = `saturate(${S.grade[0]}) contrast(${S.grade[1]})`;
  main.drawImage(BUF.scene, 0, 0);
  main.restore(); resetCtx(main);
  main.globalAlpha = 0.85; main.drawImage(BUF.vignette, 0, 0);
  main.globalAlpha = 1; main.drawImage(BUF.scrim, 0, 0);
  drawDayHUD(main, T); resetCtx(main);
  const gt = grainTiles();
  main.globalCompositeOperation = 'overlay'; main.globalAlpha = 0.06;
  main.drawImage(gt[Math.floor(T * 15) % gt.length], 0, 0, W, H);
  resetCtx(main);
  if (S.flash && lt < 0.3) { main.fillStyle = `rgba(200,230,255,${0.4 * (1 - E.out(lt / 0.3))})`; main.fillRect(0, 0, W, H); }
  let black = 0;
  if (T < 0.4) black = 1 - T / 0.4;
  if (T > DURATION - 1.0) black = Math.max(black, seg(T, DURATION - 1.0, DURATION - 0.05));
  if (black > 0) { main.fillStyle = `rgba(0,0,0,${black})`; main.fillRect(0, 0, W, H); }
}

function exportCues() {
  const sc = (id) => SCENES.find((x) => x.id === id);
  const at = (id, f) => { const s = sc(id); return s.t0 + f * (s.t1 - s.t0); };
  const C = { duration: DURATION, scenes: SCENES.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 })) };
  C.voice = SCENES.filter((s) => s.vfile).map((s) => ({ file: s.vfile, start: +s.vstart.toFixed(3) }));
  C.flashes = SCENES.filter((s) => s.flash).map((s) => s.t0);
  C.beats = beatTimes(sc('d3').t0 + 0.4 * (sc('d3').t1 - sc('d3').t0), at('d3', 0.66)).map((t) => +t.toFixed(4));
  C.night = [0, at('d1', 0.66)];
  const d1 = sc('d1'), D1 = d1.t1 - d1.t0, s1 = 0.28 * D1;
  C.phoneFlip = d1.t0 + 0.38 * D1 + s1 * 0.9;
  C.alert = [at('d1', 0.66), d1.t1];
  C.fog = [sc('d2').t0, at('d2', 0.36)];
  C.zoomEye = [at('d2', 0.36), at('d2', 0.58)];
  C.toss = [sc('d3').t0, at('d3', 0.4)];
  C.morning = [sc('d4').t0, at('d4', 0.55)];
  C.street = [sc('d5').t0, at('d5', 0.5)];
  C.cafe = [sc('d6').t0, sc('d6').t1];
  C.windowOpen = sc('d7').t0 + 1.6;
  C.endCard = at('d7', 0.76);
  return C;
}

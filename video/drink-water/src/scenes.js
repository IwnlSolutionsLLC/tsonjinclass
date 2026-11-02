'use strict';
/* Storyboard timeline -> shots, plus the compositor and the audio cue sheet. */

const BUF = {};
function bufInit() {
  if (BUF.scene) return;
  for (const k of ['scene', 'land', 'person', 'rim', 'tmp', 'tmp2']) BUF[k] = makeCanvas();
  BUF.small = makeCanvas(W / 4, H / 4);
  // vignette + top scrim
  const v = makeCanvas(), x = v.getContext('2d');
  let g = x.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  BUF.vignette = v;
  const s = makeCanvas(), y = s.getContext('2d');
  g = y.createLinearGradient(0, 0, 0, 560);
  g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  y.fillStyle = g; y.fillRect(0, 0, W, 560);
  BUF.scrim = s;
}
const cx2d = (k) => BUF[k].getContext('2d');
function resetCtx(c) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.shadowBlur = 0; c.letterSpacing = '0px';
}

const GERS_FAR = [{ x: 150, w: 30 }, { x: 724, w: 36 }, { x: 770, w: 26 }, { x: 808, w: 32 }, { x: 962, w: 22 }];

/* ---------- 01 SEC: summer steppe, zoom into the body ---------- */
function shotIntro(ctx, lt, T) {
  const hy = 1080, px = 540, py = 1660, ph = 760;
  const zp = seg(lt, 3.5, 4.9);
  const pose = poseBreath(POSE.stand, 0.35 * (0.5 + 0.5 * Math.sin(lt * 1.7)));
  const fj = [lerp(pose.eR[0], pose.hR[0], 0.55), lerp(pose.eR[1], pose.hR[1], 0.55)];
  const ax = px + fj[0] * ph, ay = py + fj[1] * ph;
  const z = (1 + 0.014 * lt) * Math.pow(30, E.in(zp));
  const k = E.inOut(seg(lt, 3.2, 4.5));
  const cam = { fx: W / 2, fy: H / 2, z, dx: (W / 2 - ax) * k, dy: (H / 2 - ay) * k };
  if (lt < 4.9) {
    const lc = cx2d('land'); resetCtx(lc);
    drawLandscape(lc, { t: T, d: 0, hy, cam, sun: { x: 835, y: 600, r: 60 }, gers: GERS_FAR, grass: 1, wind: 1 });
    const shy = camPt(cam, 0, hy)[1];
    const mz = z < 3 ? 1 : 0;
    mirageCopy(ctx, BUF.land, { hy: shy, up: 90 * z, down: 70 * z, amp: 3.2 * mz, t: T, refl: 0.3 * mz, reflH: 40 });
    // contact shadow
    ctx.save(); applyCam(ctx, cam);
    ctx.fillStyle = 'rgba(40,40,10,0.35)'; ellipse(ctx, px + 30, py + 4, 120, 18); ctx.fill();
    ctx.restore();
    renderPerson(ctx, pose, px, py, ph, { cam, rim: 0.55, veins: seg(z, 2.2, 6) });
    if (zp > 0.08) {
      const tc = cx2d('tmp'); resetCtx(tc); tc.drawImage(BUF.scene, 0, 0);
      for (let i = 1; i <= 4; i++) {
        const s = 1 + i * 0.035 * zp;
        ctx.globalAlpha = 0.22 * zp;
        ctx.drawImage(BUF.tmp, W / 2 - (W * s) / 2, H / 2 - (H * s) / 2, W * s, H * s);
      }
      ctx.globalAlpha = 1;
    }
    const skin = seg(z, 7, 24);
    if (skin > 0) {
      ctx.globalAlpha = skin * 0.8; ctx.drawImage(skinTexture(), 0, 0, W, H);
      ctx.globalAlpha = skin * 0.45; ctx.fillStyle = '#7a1424'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
  if (lt > 4.45) {
    const mix = seg(lt, 4.45, 4.9);
    const mc = mix < 1 ? cx2d('tmp2') : ctx;
    if (mix < 1) resetCtx(mc);
    mc.save();
    const ms = lerp(1.9, 1.0, E.out(seg(lt, 4.45, 6.6)));
    mc.translate(W / 2, H / 2); mc.scale(ms, ms); mc.rotate(lerp(-0.1, 0, E.out(seg(lt, 4.45, 6.6)))); mc.translate(-W / 2, -H / 2);
    drawVessel(mc, lt - 4.45, { thick: 0, flow: 0.07 * (lt - 4.45) });
    mc.restore();
    if (mix < 1) { ctx.globalAlpha = mix; ctx.drawImage(BUF.tmp2, 0, 0); ctx.globalAlpha = 1; }
  }
}
function hudIntro(ctx, lt) {
  const a = seg(lt, 5.1, 5.5);
  if (a <= 0) return;
  hudLabel(ctx, 70, 1740, 'МАКРО  ×400', { size: 26, color: 'rgba(255,220,220,0.9)', alpha: a, ls: 6 });
  hudLabel(ctx, 70, 1788, 'ЦУСНЫ СУДАС · УС БА ЦУСНЫ ЭС', { size: 24, weight: 600, color: 'rgba(255,200,200,0.7)', alpha: a, ls: 4 });
}

/* ---------- 60 SEC: lips, breath vapour in slow motion ---------- */
function shotBreath(ctx, lt, T) {
  const z = 1 + 0.06 * E.sine(seg(lt, 0, 5.5));
  ctx.save();
  ctx.translate(W / 2, 1180); ctx.scale(z, z); ctx.translate(-W / 2, -1180);
  const open = 4 + 22 * E.out(seg(lt, 0.4, 1.3)) - 18 * E.inOut(seg(lt, 3.7, 5.3));
  drawLipsScene(ctx, 540, 1200, 940, { dry: 0.06, open });
  ctx.restore();
  // golden backlight
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  let g = ctx.createRadialGradient(W * 0.95, 80, 10, W * 0.9, 120, 1300);
  g.addColorStop(0, 'rgba(255,200,110,0.4)'); g.addColorStop(0.5, 'rgba(255,170,80,0.08)'); g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // vapour
  const vs = softSprite('#fff4e4');
  for (let i = 0; i < 150; i++) {
    const te = 0.8 + hash(i) * 3.1, life = 3.6;
    const age = lt - te;
    if (age < 0 || age > life) continue;
    const p = age / life;
    const x = 540 + (hash(i + 1) - 0.5) * 420 + (hash(i + 2) - 0.5) * 620 * p + Math.sin(age * 1.3 + i) * 30;
    const y = 1170 - p * (420 + hash(i + 3) * 560);
    spr(ctx, vs, x, y, 60 + 270 * p, 0.3 * Math.sin(Math.PI * Math.min(1, p * 1.4)) * (0.6 + hash(i + 4) * 0.6));
  }
  // micro droplets catching the light
  const dg = softSprite('#fff0c8');
  for (let i = 0; i < 240; i++) {
    const te = 0.85 + hash(i * 1.37) * 3.4, life = 2.6;
    const age = lt - te;
    if (age < 0 || age > life) continue;
    const p = age / life;
    const x = 540 + (hash(i * 2.1) - 0.5) * 360 + (hash(i * 3.3) - 0.5) * 900 * p;
    const y = 1175 - p * (300 + hash(i * 4.4) * 900) + Math.sin(age * 2 + i) * 10;
    const tw = 0.5 + 0.5 * Math.sin(lt * 9 + i);
    const a = Math.sin(Math.PI * p) * (0.4 + 0.6 * tw);
    spr(ctx, dg, x, y, 7 + 5 * tw, a * 0.55);
    ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
  }
  ctx.globalAlpha = 1;
}

/* ---------- 4 HOURS: dust off the gers, cracked lips, kidneys ---------- */
function shotDry(ctx, lt, T) {
  if (lt < 2.5) {
    const cam = { fx: W / 2, fy: H / 2, z: 1.0 + 0.02 * lt, dx: -18 * lt, dy: 0 };
    const lc = cx2d('land'); resetCtx(lc);
    const gers = [{ x: 230, w: 150, smoke: 0.25 }, { x: 520, w: 235, smoke: 0.35 }, { x: 810, w: 170, smoke: 0.2 }, { x: 1040, w: 120, smoke: 0.2 }];
    drawLandscape(lc, { t: T, d: 0.32, hy: 1150, cam, sun: { x: 880, y: 590, r: 70 }, harsh: 0.45, gers, grass: 0.55, wind: 2.2, roofDust: 1 });
    mirageCopy(ctx, BUF.land, { hy: camPt(cam, 0, 1150)[1], up: 120, down: 90, amp: 4.5, t: T, refl: 0.25, reflH: 40 });
    drawDust(ctx, T, 0.9, '#cfb488', 1, 1.3, 600);
  } else if (lt < 4.8) {
    const u = lt - 2.5;
    const sh = 5 * noise(T * 11, 3), sv = 4 * noise(T * 13, 4);
    ctx.save();
    const z = 1.04 + 0.05 * u;
    ctx.translate(W / 2 + sh, 1200 + sv); ctx.scale(z, z); ctx.translate(-W / 2, -1200);
    drawLipsScene(ctx, 540, 1200, 940, { dry: 0.9, open: 2 + 2 * Math.sin(u * 2), gloss: 0 });
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(W, 0, 10, W, 0, 1500);
    g.addColorStop(0, 'rgba(255,240,200,0.45)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    drawDust(ctx, T, 0.6, '#d8c09a', 2, 1.6, 0);
  } else {
    const u = lt - 4.8;
    drawKidneyScene(ctx, T, { warn: seg(u, 0.5, 0.8), pull: seg(u, 0.9, 1.4), labels: seg(u, 0.15, 0.5), chip: seg(u, 1.1, 1.4), urine: 1 - 0.6 * seg(u, 0, 2.7) });
    return { holo: true };
  }
}

/* ---------- 8 HOURS: heaving chest, racing heart, thick blood ---------- */
function vesselFlow(lt0, lt) {
  // integrated flow distance while the blood thickens and slows
  let f = 0; const n = 40, dt = (lt - lt0) / n;
  for (let i = 0; i < n; i++) f += lerp(0.03, 0.004, seg(lt0 + (i + 0.5) * dt, lt0, lt0 + 3.4)) * dt;
  return f;
}
function shotHeart(ctx, lt, T) {
  if (lt < 3.3) {
    const sc = BUF.small.getContext('2d'); resetCtx(sc);
    sc.setTransform(0.25, 0, 0, 0.25, 0, 0);
    drawLandscape(sc, { t: T, d: 0.46, hy: 1150, sun: { x: 860, y: 620, r: 75 }, harsh: 0.5, gers: [{ x: 160, w: 90, smoke: 0.3 }, { x: 900, w: 120, smoke: 0.3 }], grass: 0.5, wind: 1.6, roofDust: 0.5 });
    ctx.drawImage(BUF.small, 0, 0, W, H);
    const br = 0.5 + 0.5 * Math.sin(lt * TAU * 1.05);
    const pose = poseBreath(POSE.slump, br * 1.8);
    const beat = beatPulse(T);
    const z = 1 + 0.06 * E.sine(seg(lt, 0, 3.3));
    const cam = { fx: 540, fy: 1500, z };
    ctx.save();
    ctx.translate(3 * noise(T * 7, 1) + beat * 2, 3 * noise(T * 8, 2) + beat * 4);
    renderPerson(ctx, pose, 540, 2290, 1450, { cam, heart: beat, rim: 0.55, face: 1, mouth: 0.4 + 0.6 * br });
    ctx.restore();
    drawDust(ctx, T, 0.35, '#d8c09a', 3, 1.2, 0);
  } else {
    drawVessel(ctx, T, { thick: lerp(0.55, 1, seg(lt, 3.3, 6.2)), flow: 0.4 + vesselFlow(3.3, lt) });
  }
}
function hudHeart(ctx, lt, T) {
  drawECG(ctx, T, 48, 1550, 650, 300, { alpha: seg(lt, 0.15, 0.5), compact: true });
  if (lt > 3.3) hudChip(ctx, W / 2, 1460, 'ЦУС ӨТГӨРЧ, УРСГАЛ УДААШИРНА', '#ffb02e', seg(lt, 3.7, 4.1));
}

/* ---------- 12 HOURS: kneeling, mirage, shrinking brain ---------- */
function shotBrain(ctx, lt, T) {
  if (lt < 3.8) {
    const cam = { fx: 540, fy: 1250, z: 1 + 0.08 * E.sine(seg(lt, 0, 3.8)), rot: -0.03 * seg(lt, 0, 3.8) };
    const lc = cx2d('land'); resetCtx(lc);
    const gers = [{ x: 170, w: 40 }, { x: 760, w: 48 }, { x: 815, w: 34 }, { x: 862, w: 42 }];
    drawLandscape(lc, { t: T, d: 0.62, hy: 1020, cam, sun: { x: 790, y: 590, r: 82 }, harsh: 0.85, gers, gerAlpha: 1 - 0.75 * seg(lt, 0.4, 3.6), grass: 0.35, wind: 1.4, smoke: 0.4 });
    mirageCopy(ctx, BUF.land, { hy: camPt(cam, 0, 1020)[1], up: 170, down: 140, amp: 5 + 10 * seg(lt, 0, 3.8), vamp: 7, t: T, refl: 0.45, reflH: 70 });
    const drop = E.inOut(seg(lt, 0.05, 0.95));
    let p = poseLerp(POSE.slump, POSE.kneel, drop);
    p = poseRotate(p, 0, -0.03, 0.035 * Math.sin(lt * 2.1) * seg(lt, 0.9, 1.5));
    ctx.save(); applyCam(ctx, cam);
    ctx.fillStyle = 'rgba(40,30,10,0.32)'; ellipse(ctx, 560, 1584, 200, 24); ctx.fill();
    ctx.restore();
    renderPerson(ctx, p, 540, 1580, 1100, { cam, rim: 0.6, headDown: seg(lt, 0.3, 1.0), face: 1 });
  } else {
    const u = lt - 3.8;
    drawBrainScene(ctx, T, { shrink: E.inOut(seg(u, 0.4, 2.8)), warn: seg(u, 1.2, 1.6), labels: seg(u, 0.1, 0.5), inset: seg(u, 0.8, 1.2) });
    return { holo: true };
  }
}

/* ---------- 48 HOURS: cracking ground, river mirage, fistful of dust ---------- */
function handState(lt) {
  const hIn = E.out(seg(lt, 3.3, 4.7));
  let wx = lerp(1000, 735, hIn), wy = lerp(2300, 1335, hIn), s = lerp(340, 205, hIn), ang = lerp(-0.6, -0.2, hIn);
  const press = E.inOut(seg(lt, 4.7, 5.15));
  wy += press * 34; s -= press * 8;
  const grip = E.inOut(seg(lt, 4.95, 5.45));
  const lift = E.inOut(seg(lt, 5.45, 6.5));
  wx = lerp(wx, 790, lift); wy = lerp(wy, 1170, lift); s = lerp(s, 265, lift); ang = lerp(ang, -1.25, lift);
  return { wx, wy, s, ang, grip, lift, on: lt > 3.3 };
}
function soilPoint(h) {
  const lx = -0.42, ly = -0.92;
  const c = Math.cos(h.ang), sn = Math.sin(h.ang);
  return [h.wx + (lx * c - ly * sn) * h.s, h.wy + (lx * sn + ly * c) * h.s];
}
function shotMirage(ctx, lt, T) {
  const lc = cx2d('land'); resetCtx(lc);
  drawLandscape(lc, { t: T, d: 0.78, hy: POV.hy, sun: { x: 860, y: 470, r: 80 }, harsh: 1, gers: [{ x: 170, w: 26 }, { x: 640, w: 30 }, { x: 688, w: 22 }, { x: 880, w: 26 }], grass: 0.16, wind: 1.8, smoke: 0 });
  drawCracks(lc, lt - 0.15, 1);
  const rv = seg(lt, 1.5, 2.7) * (1 - seg(lt, 5.0, 5.6)) * (0.86 + 0.14 * Math.sin(lt * 11));
  drawRiver(lc, T, rv, seg(lt, 5.0, 5.6));
  ctx.save();
  const sw = { x: noise(lt * 0.6, 2) * 16, y: noise(lt * 0.5, 5) * 12, r: noise(lt * 0.4, 8) * 0.014 };
  ctx.translate(W / 2 + sw.x, H / 2 + sw.y); ctx.rotate(sw.r); ctx.scale(1.04, 1.04); ctx.translate(-W / 2, -H / 2);
  mirageCopy(ctx, BUF.land, { hy: POV.hy, up: 160, down: 230, amp: 9 + 5 * Math.sin(lt * 1.3), vamp: 10, t: T, refl: 0.55, reflH: 90 });
  // hand
  const h = handState(lt);
  if (h.on) {
    // shadow of the hand on the ground
    ctx.fillStyle = `rgba(30,18,8,${0.25 * (1 - h.lift)})`;
    ellipse(ctx, h.wx - 60, h.wy - h.s * 0.8 + 120, h.s * 0.9, h.s * 0.25); ctx.fill();
    const L = BUF.person, hc = L.getContext('2d'); resetCtx(hc); hc.clearRect(0, 0, W, H);
    drawHand(hc, h.wx, h.wy, h.s, h.ang, h.grip, { t: lt, tremble: 1, soil: seg(lt, 5.3, 5.5) * 0.9, dusty: 0.6 });
    ctx.drawImage(L, 0, 0);
  }
  // dust puff where the "water" was
  const puff = seg(lt, 5.0, 6.2);
  if (puff > 0 && puff < 1) {
    const s = softSprite('#d6bf98');
    for (let i = 0; i < 26; i++) {
      const a = hash(i) * TAU, d = puff * (80 + hash(i + 9) * 260);
      spr(ctx, s, 640 + Math.cos(a) * d * 1.6 - puff * 120, 1010 + Math.sin(a) * d * 0.4 - puff * 60, 40 + puff * 120, 0.35 * (1 - puff));
    }
  }
  // soil pouring from the fist
  if (lt > 5.55) {
    const s = softSprite('#c9ad84');
    for (let i = 0; i < 190; i++) {
      const ts = 5.55 + (i / 190) * 1.95;
      const age = lt - ts;
      if (age < 0) continue;
      const hs = handState(ts);
      const [x0, y0] = soilPoint(hs);
      const jx = (hash(i * 1.3) - 0.5) * 40, vx = (hash(i * 2.7) - 0.5) * 60;
      const x = x0 + jx + vx * age - 170 * age * age, y = y0 + 30 * age + 700 * age * age;
      if (y > H + 20) continue;
      const big = hash(i * 5.1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = big < 0.5 ? '#7a5a3a' : '#a9875d';
      const r = 2 + big * 5;
      ellipse(ctx, x, y, r, r * 0.8, i); ctx.fill();
      if (i % 4 === 0) spr(ctx, s, x - age * 180, y - age * 80, 20 + age * 90, 0.18 * Math.max(0, 1 - age * 0.9));
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawDust(ctx, T, 0.5 + 0.3 * seg(lt, 5, 7), '#d8c09a', 4, 1.4, 300);
}

/* ---------- DAY 5: cold sunset, collapse, flatline ---------- */
function shotEnd(ctx, lt, T) {
  const hy = 1180;
  const lc = cx2d('land'); resetCtx(lc);
  const gers = [{ x: 150, w: 34, smoke: 0 }, { x: 858, w: 40, smoke: 0 }, { x: 908, w: 28, smoke: 0 }, { x: 958, w: 34, smoke: 0 }];
  drawLandscape(lc, { t: T, d: 0.85, sunset: 1, hy, sun: { x: 610, y: hy - 64 + lt * 7, r: 104 }, harsh: 0.15, gers, smoke: 0, grass: 0.55, wind: lerp(1, 0.15, seg(lt, 3, 6.5)) });
  mirageCopy(ctx, BUF.land, { hy, up: 60, down: 50, amp: 2.2, t: T, refl: 0.35, reflH: 46 });
  // pose: weak sway -> drop to knees -> fall
  let p;
  if (lt < 1.6) p = poseRotate(POSE.slump, 0, 0, 0.03 * Math.sin(lt * 2.4));
  else p = poseLerp(POSE.slump, POSE.kneelLimp, E.inOut(seg(lt, 1.6, 2.6)));
  const fall = E.in2(seg(lt, 3.4, 4.3));
  if (fall > 0) {
    const rp = poseRotate(p, 0.03, -0.03, fall * 1.42);
    p = poseLerp(rp, poseLift(rp), fall);
  }
  const px = 540, py = 1340, ph = 700;
  // long shadow toward the camera
  const R = BUF.rim, rc = R.getContext('2d'); resetCtx(rc); rc.clearRect(0, 0, W, H);
  rc.setTransform(1.25 * ph, 0, 0.32 * ph, -0.95 * ph, px, py + 4);
  const dk = { shirt: '#000', shirt2: '#000', pants: '#000', skin: '#000', skin2: '#000', hair: '#000', shoe: '#000' };
  drawFigure(rc, p, dk, { face: 0 });
  resetCtx(rc);
  ctx.globalAlpha = 0.5; ctx.drawImage(R, 0, 0); ctx.globalAlpha = 0.25; ctx.drawImage(R, 3, 2); ctx.globalAlpha = 1;
  renderPerson(ctx, p, px, py, ph, { sil: '#160c0d', rim: 0.8, rimColor: 'rgba(255,140,70,1)', face: 0 });
  // dust settling
  drawDust(ctx, T, 0.25 * (1 - seg(lt, 4, 7)), '#c98a5a', 5, 0.6, 700);
  return { sunset: true };
}
function hudEnd(ctx, lt, T) {
  drawECG(ctx, T, 90, 450, 900, 250, { alpha: seg(lt, 0.2, 0.6) * (1 - seg(lt, 7.0, 7.8)) });
}

/* ---------- CTA: back to reality ---------- */
function shotWater(ctx, lt) {
  const z = 1.36 + 0.07 * E.sine(seg(lt, 0, 6.5));
  ctx.save();
  ctx.translate(W / 2, 1230); ctx.scale(z, z); ctx.translate(-W / 2, -1150);
  drawGlassScene(ctx, lt);
  ctx.restore();
  return { cta: true };
}
function hudWater(ctx, lt) {
  const a = E.out(seg(lt, 1.5, 2.3));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const ls = lerp(14, 0, E.out(seg(lt, 1.5, 2.6)));
  ctx.letterSpacing = ls + 'px';
  let size = 140;
  ctx.font = `900 ${size}px "Inter Display", Inter`;
  const wdt = ctx.measureText('Ус уугаарай.').width;
  if (wdt > 940) { size = Math.floor((size * 940) / wdt); ctx.font = `900 ${size}px "Inter Display", Inter`; }
  const y = 400 + (1 - a) * 40;
  ctx.fillStyle = '#0a2b4c';
  ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 30;
  ctx.fillText('Ус уугаарай.', W / 2, y);
  ctx.restore();
}

/* ---------- timeline ---------- */
const SCENES = [
  { id: 'intro', t0: 0.0, t1: 7.0, val: 0, d: 0.0, l1: '1 СЕКУНД', l2: 'ЭХЛЭЛ', fn: shotIntro, hud: hudIntro },
  { id: 'breath', t0: 7.0, t1: 12.5, val: 60, d: 0.12, l1: '60 СЕКУНД · 1 МИНУТ', l2: 'ЧИЙГ УУРШИХ', fn: shotBreath, flash: true },
  { id: 'dry', t0: 12.5, t1: 20.0, val: 14400, d: 0.3, l1: '14,400 СЕКУНД · 4 ЦАГ', l2: 'ХУУРАЙШИЛТ', fn: shotDry, flash: true },
  { id: 'heart', t0: 20.0, t1: 27.0, val: 28800, d: 0.46, l1: '28,800 СЕКУНД · 8 ЦАГ', l2: 'ЗҮРХНИЙ ЦОХИЛТ', fn: shotHeart, hud: hudHeart, flash: true },
  { id: 'brain', t0: 27.0, t1: 34.0, val: 43200, d: 0.6, l1: '43,200 СЕКУНД · 12 ЦАГ', l2: 'ТАРХИНЫ АГШИЛТ', fn: shotBrain, flash: true },
  { id: 'mirage', t0: 34.0, t1: 41.5, val: 172800, d: 0.74, l1: '172,800 СЕКУНД · 48 ЦАГ', l2: '2 ДАХЬ ӨДӨР · ГАЛЛЮЦИНАЦИ', fn: shotMirage, flash: true },
  { id: 'end', t0: 41.5, t1: 50.5, val: 432000, d: 0.82, l1: '432,000 СЕКУНД · 5 ДАХЬ ӨДӨР', l2: 'ТӨГСГӨЛ', fn: shotEnd, hud: hudEnd, flash: true },
  { id: 'cta', t0: 50.5, t1: 57.0, fn: shotWater, hud: hudWater },
];
const DURATION = 57.0;
const ROLL = 0.7;

function sceneIndex(T) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (T >= SCENES[i].t0) return i;
  return 0;
}
function dispValue(i, lt) {
  const S = SCENES[i];
  if (i === 0) return lt < 1 ? 0 : Math.floor(lt);
  return S.val + Math.max(0, Math.floor(lt - ROLL));
}
function timerState(T) {
  const i = sceneIndex(T), S = SCENES[i];
  if (S.id === 'cta') return null;
  const lt = T - S.t0;
  const st = { alpha: 1, color: '#ffffff', l1: S.l1, l2: S.l2, rolling: false, frozen: false };
  if (i === 0) {
    st.val = dispValue(0, lt);
    st.alpha = seg(lt, 0.25, 0.7);
    st.l1a = seg(lt, 1.0, 1.4); st.l2a = seg(lt, 1.15, 1.55);
  } else {
    const prev = dispValue(i - 1, SCENES[i - 1].t1 - SCENES[i - 1].t0 - 1e-6);
    if (lt < ROLL) {
      const p = E.inOut(lt / ROLL);
      st.val = Math.floor(Math.exp(lerp(Math.log(prev + 1), Math.log(S.val + 1), p)) - 1);
      st.rolling = true;
    } else st.val = dispValue(i, lt);
    st.l1a = seg(lt, ROLL - 0.1, ROLL + 0.25); st.l2a = seg(lt, ROLL + 0.05, ROLL + 0.4);
  }
  if (S.id === 'mirage') st.color = '#ffeccc';
  if (S.id === 'end') {
    st.color = '#ffd6bd';
    if (T >= FLAT_T) {
      st.frozen = true;
      st.val = dispValue(i, FLAT_T - S.t0);
      st.color = Math.sin((T - FLAT_T) * TAU * 1.6) > -0.2 ? '#ff4040' : 'rgba(255,64,64,0.25)';
    }
    const f = 1 - seg(lt, 7.1, 8.0);
    st.alpha *= f; st.l1a *= f; st.l2a *= f;
  }
  return st;
}

function drawTimerHUD(ctx, T) {
  const st = timerState(T);
  if (!st || st.alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = st.alpha;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = '800 136px "JetBrains Mono"';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 26;
  ctx.fillStyle = st.color;
  const jit = st.rolling ? (hash(Math.floor(T * 60)) - 0.5) * 6 : 0;
  ctx.fillText(fmtClock(st.val), W / 2 + jit, 268);
  ctx.shadowBlur = 12;
  ctx.globalAlpha = st.alpha * (st.l1a || 0);
  ctx.font = '700 38px Inter'; ctx.letterSpacing = '6px';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(st.l1, W / 2, 344 + (1 - (st.l1a || 0)) * 16);
  ctx.globalAlpha = st.alpha * (st.l2a || 0);
  ctx.font = '800 46px Inter'; ctx.letterSpacing = '8px';
  ctx.fillStyle = st.frozen ? '#ff5050' : '#ffcf6e';
  ctx.fillText(st.l2, W / 2, 410 + (1 - (st.l2a || 0)) * 16);
  ctx.restore();
}

function gradeFilter(S, lt, info) {
  if (info && info.cta) {
    const b = (1 - seg(lt, 0, 0.3)) * 16;
    return `blur(${b.toFixed(2)}px) saturate(1.12) contrast(1.04)`;
  }
  if (info && info.sunset) return 'saturate(0.8) contrast(1.22) brightness(0.97)';
  const nxt = SCENES[Math.min(SCENES.length - 1, SCENES.indexOf(S) + 1)];
  let d = lerp(S.d, nxt.d == null ? S.d : nxt.d, 0.5 * (lt / (S.t1 - S.t0)));
  if (info && info.holo) d *= 0.35;
  return `saturate(${(1 - 0.55 * d).toFixed(3)}) contrast(${(1 + 0.32 * d).toFixed(3)}) sepia(${(0.22 * d).toFixed(3)}) brightness(${(1 + 0.05 * d).toFixed(3)})`;
}

let MAIN = null;
function renderAt(T) {
  bufInit();
  const main = MAIN;
  const i = sceneIndex(T), S = SCENES[i], lt = T - S.t0;
  const sc = cx2d('scene');
  resetCtx(sc);
  sc.fillStyle = '#000'; sc.fillRect(0, 0, W, H);
  const info = S.fn(sc, lt, T) || {};
  resetCtx(sc);
  resetCtx(main);
  main.fillStyle = '#000'; main.fillRect(0, 0, W, H);
  const punch = S.flash ? 1 + 0.06 * (1 - E.out(seg(lt, 0, 0.45))) : 1;
  main.save();
  main.translate(W / 2, H / 2); main.scale(punch, punch); main.translate(-W / 2, -H / 2);
  main.filter = gradeFilter(S, lt, info);
  main.drawImage(BUF.scene, 0, 0);
  main.restore();
  resetCtx(main);
  // overlays
  main.globalAlpha = info.cta ? 0.35 : 0.9; main.drawImage(BUF.vignette, 0, 0);
  if (!info.cta) { main.globalAlpha = 1; main.drawImage(BUF.scrim, 0, 0); }
  main.globalAlpha = 1;
  if (S.hud) { S.hud(main, lt, T); resetCtx(main); }
  drawTimerHUD(main, T); resetCtx(main);
  // grain
  const gt = grainTiles();
  main.globalCompositeOperation = 'overlay';
  main.globalAlpha = info.cta ? 0.05 : 0.085;
  main.drawImage(gt[Math.floor(T * FPS / 2) % gt.length], 0, 0, W, H);
  resetCtx(main);
  // flash + fades
  if (S.flash && lt < 0.3) { main.fillStyle = `rgba(255,250,240,${0.55 * (1 - E.out(lt / 0.3))})`; main.fillRect(0, 0, W, H); }
  let black = 0;
  if (T < 0.6) black = 1 - T / 0.6;
  if (S.id === 'end') black = Math.max(black, seg(lt, 7.1, 8.0));
  if (black > 0) { main.fillStyle = `rgba(0,0,0,${black})`; main.fillRect(0, 0, W, H); }
}

/* ---------- audio cue sheet (consumed by audio.py) ---------- */
function exportCues() {
  const C = { duration: DURATION, fps: FPS, flat: FLAT_T };
  C.scenes = SCENES.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 }));
  C.ticks = [];
  let prev = null;
  for (let T = 0; T < 50.5; T += 1 / 240) {
    const st = timerState(T);
    if (!st || st.alpha < 0.05) { prev = null; continue; }
    if (prev !== null && st.val !== prev && !st.frozen) C.ticks.push({ t: +T.toFixed(4), roll: st.rolling });
    prev = st.val;
  }
  const amp = (t) => {
    const id = SCENES[sceneIndex(t)].id;
    const lt = t - SCENES[sceneIndex(t)].t0;
    return { intro: lt > 4.6 ? 0.55 : 0, breath: 0.12, dry: 0.25, heart: 1, brain: 0.7, mirage: 0.6, end: 0.95, cta: 0 }[id];
  };
  C.beats = beatTimes(0, FLAT_T).map((t) => ({ t: +t.toFixed(4), amp: amp(t), bpm: +bpmAt(t).toFixed(1) }));
  C.ecg = C.beats.filter((b) => (b.t > 20.2 && b.t < 27) || (b.t > 41.7)).map((b) => b.t);
  C.flashes = SCENES.filter((s) => s.flash).map((s) => s.t0);
  C.zoom = [3.5, 4.9];
  C.macro = [4.6, 7.0];
  C.breath = [7.0 + 0.85, 7.0 + 4.6];
  C.crackle = [15.0, 17.3];
  C.blips = [];
  for (let k = Math.ceil((17.3 + 0.5) * 3); k / 3 < 20.0; k++) C.blips.push(+(k / 3).toFixed(4));
  C.holo = [[17.3, 20.0], [30.8, 34.0]];
  C.tinnitus = [27.0, 34.0];
  C.river = [34 + 1.5, 34 + 5.0];
  C.grab = 34 + 5.0;
  C.pour = [34 + 5.55, 34 + 7.5];
  C.thud = 41.5 + 4.25;
  C.flatline = [FLAT_T, 41.5 + 7.6];
  C.black = [41.5 + 8.0, 50.5];
  C.cta = 50.5;
  C.clinks = [50.5 + 0.08, 50.5 + 1.45, 50.5 + 3.9];
  C.text = 50.5 + 1.5;
  return C;
}

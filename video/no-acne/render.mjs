#!/usr/bin/env node
/*
 * Renders index.html frame by frame in headless Chromium and encodes an MP4.
 *
 *   node render.mjs                 # full video -> build/us-uugaarai.mp4
 *   node render.mjs --stills 0.5,8,15   # PNG stills -> build/stills/
 *   node render.mjs --from 20 --to 27   # partial render (preview)
 *   node render.mjs --cues          # only write build/cues.json
 *   node render.mjs --audio         # re-mix audio (incl. voice/manifest.json) onto build/video-only.mp4
 *
 * Audio is synthesised by audio.py from build/cues.json (timeline exported by the page).
 */
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const build = path.join(here, 'build');
fs.mkdirSync(build, { recursive: true });

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes(k);
const FPS = +opt('--fps', 30);

const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => { console.error('[page error]', e.message); process.exitCode = 1; });
await page.goto(pathToFileURL(path.join(here, 'index.html')).href + '?render');
await page.evaluate(() => window.READY);

const cues = await page.evaluate(() => window.exportCues());
fs.writeFileSync(path.join(build, 'cues.json'), JSON.stringify(cues, null, 1));
const DURATION = cues.duration;

const grab = (t, type = 'jpeg') => page.evaluate(([t, type]) => {
  window.renderAt(t);
  return document.getElementById('c').toDataURL(type === 'png' ? 'image/png' : 'image/jpeg', 0.95);
}, [t, type]);

if (has('--cues')) { await browser.close(); process.exit(0); }

if (has('--stills')) {
  const dir = path.join(build, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const s of opt('--stills').split(',')) {
    const t = +s;
    const t0 = Date.now();
    const url = await grab(t, 'png');
    fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log(`still ${t}s  (${Date.now() - t0} ms)`);
  }
  await browser.close();
  process.exit(process.exitCode || 0);
}

const from = +opt('--from', 0), to = +opt('--to', DURATION);
const partial = from > 0 || to < DURATION;
const silent = path.join(build, 'video-only.mp4');
const audioOnly = has('--audio');
if (audioOnly && !fs.existsSync(silent)) {
  // fresh checkout: reuse the picture from the committed MP4 instead of re-rendering
  const src = path.join(here, 'batga-ugui-bol.mp4');
  if (!fs.existsSync(src)) throw new Error('no build/video-only.mp4 or us-uugaarai.mp4: run a full render first');
  spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-map', '0:v:0', '-c', 'copy', silent], { stdio: 'inherit' });
}
if (!audioOnly) {
const out = partial ? path.join(build, `preview-${from}-${to}.mp4`) : path.join(build, 'video-preview.mp4');
const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', partial ? 'veryfast' : 'slow', '-crf', partial ? '23' : '18', '-maxrate', '12M', '-bufsize', '24M',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', partial ? out : silent], { stdio: ['pipe', 'inherit', 'inherit'] });

const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
const tStart = Date.now();
for (let n = n0; n < n1; n++) {
  const url = await grab(n / FPS);
  const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if ((n - n0) % 60 === 0) {
    const el = (Date.now() - tStart) / 1000, done = n - n0 + 1;
    process.stdout.write(`frame ${n}/${n1}  ${(el / done * 1000).toFixed(0)} ms/frame  eta ${((n1 - n) * el / done).toFixed(0)}s\n`);
  }
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
}
await browser.close();

if (!partial) {
  // audio + mux
  const py = spawnSync('python3', [path.join(here, 'audio.py'), path.join(build, 'cues.json'), path.join(build, 'audio.wav')], { stdio: 'inherit' });
  if (py.status !== 0) throw new Error('audio.py failed');
  const final = path.join(here, 'batga-ugui-bol.mp4');
  // two-pass 3.6 Mbps: clean on the crowd shots and under GitHub's 100 MB file limit for ~3 minutes
  const plog = path.join(build, 'x264pass');
  spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', silent, '-c:v', 'libx264', '-preset', 'slow', '-b:v', '3600k',
    '-pass', '1', '-passlogfile', plog, '-pix_fmt', 'yuv420p', '-an', '-f', 'mp4', '/dev/null'], { stdio: 'inherit' });
  const mux = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', silent, '-i', path.join(build, 'audio.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-b:v', '3600k', '-maxrate', '6000k', '-bufsize', '8000k', '-pass', '2', '-passlogfile', plog,
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' });
  if (mux.status !== 0) throw new Error('mux failed');
  console.log('wrote', final);
}

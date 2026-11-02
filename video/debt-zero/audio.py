#!/usr/bin/env python3
"""Soundtrack for "Өр алга болсон өдөр": synthesised city/crowd sound design + the voice-over.

    python3 audio.py build/cues.json build/audio.wav

Voice clips come from voice/<file> at the start times in cues["voice"]; music and
effects are ducked ~9 dB under the voice.
"""
import json
import pathlib
import subprocess
import sys
import wave

import numpy as np

SR = 48000
HERE = pathlib.Path(__file__).resolve().parent
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
D = cues["duration"]
N = int(D * SR)
t = np.arange(N) / SR
L = np.zeros(N)
R = np.zeros(N)
VL = np.zeros(N)
VR = np.zeros(N)
r = np.random.default_rng(77)
SC = {s["id"]: s for s in cues["scenes"]}
E = 0.012


def band(n, lo, hi, seed, order=2):
    x = np.random.default_rng(seed).standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    Hf = np.ones_like(f)
    if lo > 0:
        Hf *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi:
        Hf *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    y = np.fft.irfft(X * Hf, n)
    return y / (np.std(y) + 1e-12)


def keys(pts, tt=t):
    xs, ys = zip(*pts)
    return np.interp(tt, xs, ys)


def env_on(intervals, att=0.3, rel=0.6, tt=t):
    """1 inside the intervals with soft edges."""
    e = np.zeros(len(tt))
    for a, b in intervals:
        e = np.maximum(e, keys([(0, 0), (max(0, a - att), 0), (a, 1), (b, 1), (b + rel, 0), (D + 5, 0)], tt))
    return e


def place(sig, t0, gain=1.0, pan=0.0, send=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or len(sig) == 0:
        return
    if i0 < 0:
        sig, i0 = sig[-i0:], 0
    s = sig[: N - i0]
    gl, gr = np.cos((pan + 1) * np.pi / 4) * gain, np.sin((pan + 1) * np.pi / 4) * gain
    L[i0 : i0 + len(s)] += s * gl
    R[i0 : i0 + len(s)] += s * gr
    if send:
        VL[i0 : i0 + len(s)] += s * gl * send
        VR[i0 : i0 + len(s)] += s * gr * send


def tone(freq, dur, decay=None, attack=0.002, fend=None):
    n = max(1, int(dur * SR))
    tt = np.arange(n) / SR
    ph = 2 * np.pi * (np.cumsum(freq * (fend / freq) ** (tt / dur)) / SR if fend else freq * tt)
    env = np.minimum(1.0, tt / max(attack, 1e-4))
    if decay:
        env = env * np.exp(-tt / decay)
    return np.sin(ph) * env


def fade(sig, a=0.005, rr=0.01):
    n = len(sig)
    na, nr = min(n, int(a * SR)), min(n, int(rr * SR))
    if na:
        sig[:na] *= np.linspace(0, 1, na)
    if nr:
        sig[-nr:] *= np.linspace(1, 0, nr)
    return sig


def pad(freqs, t0, t1, env_pts, partials=6, detune=0.004, bright=1.6, seed=0):
    n = int((t1 - t0) * SR)
    tt = np.arange(n) / SR
    rr = np.random.default_rng(seed)
    y = np.zeros(n)
    for f in freqs:
        for dd in (-detune, 0.0, detune):
            for k in range(1, partials + 1):
                y += np.sin(2 * np.pi * f * (1 + dd) * k * tt + rr.uniform(0, 2 * np.pi)) / k**bright
    y /= np.max(np.abs(y)) + 1e-9
    return y * keys(env_pts, tt + t0)


def reverb(sig, secs, seed):
    n = int(secs * SR)
    k = np.arange(n) / SR
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-k * 6.9 / secs)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    ir /= np.sqrt(np.sum(ir**2))
    m = len(sig) + n - 1
    nf = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(sig, nf) * np.fft.rfft(ir, nf), nf)[: len(sig)]


def step_env(levels):
    """per-scene levels with short crossfades at the cuts"""
    pts = [(0, levels[0])]
    for i, s in enumerate(cues["scenes"]):
        if i:
            pts += [(s["t0"] - E, levels[i - 1]), (s["t0"] + E, levels[i])]
    pts += [(D, levels[-1])]
    return keys(pts)


# order: s1 s10 s60 h1 h8 d1 d3 d7 end
city = step_env([0.22, 0.2, 0.1, 0.1, 0.2, 0.1, 0.22, 0.07, 0.03])
wind = step_env([0.03, 0.08, 0.1, 0.12, 0.08, 0.1, 0.12, 0.2, 0.12])
murmur = step_env([0.12, 0.05, 0.03, 0.04, 0.14, 0.02, 0.06, 0.02, 0.0])
gust = np.clip(1 + 0.45 * band(N, 0.04, 0.7, 11, 1), 0.3, 1.9)
for seed, ch in ((1, L), (2, R)):
    ch += band(N, 40, 380, seed) * city * 0.9
    ch += band(N, 300, 1600, seed + 5) * city * 0.25
    ch += band(N, 120, 800, seed + 10) * wind * gust * 0.7
    babble = sum(band(N, 300 + 300 * k, 900 + 500 * k, seed + 20 + k) * np.clip(band(N, 2, 7, seed + 30 + k, 1), 0, None) for k in range(4))
    ch += babble * murmur * 0.35

# cheering crowd (10 s scene) and anger / riot
c0, c1 = cues["cheer"]
cheer = env_on([(c0, c1)], 0.2, 1.5) * keys([(0, 0), (c0, 0), (c0 + 1.0, 1), (c1 - 2, 0.75), (c1, 0.5), (D, 0)])
for seed, ch in ((40, L), (41, R)):
    ch += band(N, 400, 4200, seed) * (0.6 + 0.4 * np.clip(band(N, 1, 6, seed + 2, 1), 0, None)) * cheer * 0.3
for k in range(40):
    tt0 = r.uniform(c0 + 0.3, c1 - 1.0)
    place(fade(tone(r.uniform(1800, 2600), 0.35, attack=0.02, fend=r.uniform(2800, 3600))), tt0, 0.03, pan=r.uniform(-0.8, 0.8))
for k in range(400):
    tt0 = r.uniform(c0 + 0.2, c1 - 0.5)
    nn = int(0.012 * SR)
    place(band(nn, 800, 6000, 900 + k % 40) * np.exp(-np.arange(nn) / SR / 0.003), tt0, 0.05 * cheer[int(tt0 * SR)], pan=r.uniform(-0.9, 0.9))
a0, a1 = cues["angry"]
r0, r1 = cues["riot"]
anger = env_on([(a0, a1)], 0.3, 0.4) * 0.6 + env_on([(r0, r1)], 0.3, 0.5)
chant = 0.5 + 0.5 * np.clip(np.sin(2 * np.pi * t / 0.9), 0, None) ** 2
for seed, ch in ((50, L), (51, R)):
    ch += band(N, 250, 2500, seed) * (0.5 + 0.5 * chant) * anger * 0.3

# siren in the riot
nr = int((r1 - r0) * SR)
kr = np.arange(nr) / SR
siren = np.sin(2 * np.pi * np.cumsum(900 + 450 * np.sin(2 * np.pi * kr / 2.4)) / SR)
siren *= keys([(0, 0), (0.6, 1), (r1 - r0 - 0.4, 1), (r1 - r0, 0)], kr)
place(siren, r0, 0.035, pan=-0.4, send=0.5)

# ---------------------------------------------------------------- events
for g in cues["glitches"]:
    n = int(0.5 * SR)
    k = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * np.cumsum(np.repeat(r.uniform(200, 2000, 25), n // 25 + 1)[:n]) / SR))
    gl = (sq * 0.5 + band(n, 2000, 9000, 60) * 0.5) * (np.abs(np.sin(2 * np.pi * 23 * k)) > 0.4)
    place(fade(gl * keys([(0, 0), (0.03, 1), (0.42, 1), (0.5, 0)], k)), g, 0.09, pan=r.uniform(-0.3, 0.3))
for c in cues["chimes"]:
    place(tone(1318.5, 1.2, decay=0.35) + 0.7 * tone(1975.5, 1.2, decay=0.3), c, 0.07, send=0.4)
    place(tone(1975.5, 1.0, decay=0.3), c + 0.12, 0.05, send=0.4)
s0, s1 = cues["storm"]
place(band(int(3.5 * SR), 25, 160, 70) * keys([(0, 0), (0.3, 1), (3.5, 0)], np.arange(int(3.5 * SR)) / SR), s0 + 0.6, 0.45, send=0.3)
ru0, ru1 = cues["runners"]
tt0 = ru0 + 0.3
while tt0 < ru1:
    nn = int(0.06 * SR)
    place(band(nn, 60, 900, 80) * np.exp(-np.arange(nn) / SR / 0.012), tt0, 0.12, pan=r.uniform(-0.6, 0.6))
    tt0 += r.uniform(0.09, 0.16)
al0, al1 = cues["alarm"]
na = int((al1 - al0) * SR)
ka = np.arange(na) / SR
alarm = np.sin(2 * np.pi * np.where((ka % 1.0) < 0.5, 960, 770) * ka) * keys([(0, 0), (0.1, 1), (al1 - al0 - 0.2, 1), (al1 - al0, 0)], ka)
place(alarm, al0, 0.03, pan=0.3, send=0.4)
for k, f in enumerate((1100, 900, 700)):
    place(fade(tone(f, 0.16, attack=0.003)), cues["terminalError"] + k * 0.2, 0.07)
place(fade(tone(180, 0.45, attack=0.01) + 0.4 * tone(360, 0.45, attack=0.01)), cues["lockError"], 0.08)
for k, ta in enumerate(cues["atmOff"]):
    place(fade(tone(900, 0.5, attack=0.003, fend=120), 0.003, 0.05), ta, 0.06, pan=-0.6 + k * 0.3)
    place(band(int(0.03 * SR), 1000, 6000, 90 + k) * np.exp(-np.arange(int(0.03 * SR)) / SR / 0.006), ta + 0.5, 0.1)
sh0, sh1 = cues["shutter"]
nsh = int((sh1 - sh0) * SR)
rattle = band(nsh, 300, 5000, 95) * (0.4 + 0.6 * (np.sin(2 * np.pi * 28 * np.arange(nsh) / SR) > 0.6))
place(rattle * 0.5, sh0, 0.12, pan=0.1)
place(band(int(0.4 * SR), 60, 3000, 96) * np.exp(-np.arange(int(0.4 * SR)) / SR / 0.08), sh1, 0.3)
b0, b1 = cues["bills"]
flutter = band(N, 2500, 9000, 97) * np.clip(band(N, 4, 18, 98, 1), 0, None) * env_on([(b0, b1)], 0.5, 0.5)
L += flutter * 0.04
R += band(N, 2500, 9000, 99) * np.clip(band(N, 4, 18, 100, 1), 0, None) * env_on([(b0, b1)], 0.5, 0.5) * 0.04
f0, f1 = cues["fire"]
for k in range(int((f1 - f0) * 14)):
    tt0 = r.uniform(f0, f1 - 0.05)
    nn = int(0.008 * SR)
    place(band(nn, 1200, 7000, 200 + k % 50) * np.exp(-np.arange(nn) / SR / 0.002), tt0, r.uniform(0.01, 0.05), pan=r.uniform(-0.5, 0.5))
L += band(N, 80, 600, 201) * env_on([(f0, f1)], 1, 1) * 0.02
R += band(N, 80, 600, 202) * env_on([(f0, f1)], 1, 1) * 0.02

# timer ticks + transitions
last = -1
for tk in cues["ticks"]:
    if tk["roll"]:
        if tk["t"] - last < 0.028:
            continue
        place(fade(tone(3300, 0.012, decay=0.003)), tk["t"], 0.05)
    else:
        n = int(0.05 * SR)
        k = np.arange(n) / SR
        click = np.sin(2 * np.pi * 2100 * k) * np.exp(-k / 0.005) + 0.6 * np.sin(2 * np.pi * 950 * k) * np.exp(-k / 0.012)
        place(click, tk["t"], 0.09, pan=-0.1, send=0.1)
    last = tk["t"]
for i, ft in enumerate(cues["flashes"]):
    nin, nout = int(0.42 * SR), int(0.6 * SR)
    x = band(nin + nout, 350, 6000, 300 + i)
    env = np.concatenate([np.linspace(0, 1, nin) ** 3, np.exp(-np.arange(nout) / SR / 0.1)])
    place(x * env, ft - 0.42, 0.2, send=0.3)
    place(tone(60, 1.2, decay=0.3, attack=0.003, fend=30), ft, 0.45)

# ---------------------------------------------------------------- music
sc = cues["scenes"]
hope = pad([261.63, 329.63, 392.0, 523.25], 0, SC["s10"]["t1"],
           [(0, 0), (1.5, 0.11), (SC["s10"]["t0"] + 6, 0.13), (SC["s10"]["t0"] + 0.74 * (SC["s10"]["t1"] - SC["s10"]["t0"]), 0.0), (SC["s10"]["t1"], 0)], seed=1)
place(hope, 0, 1.0, send=0.4)
dk0 = SC["s10"]["t0"] + 0.7 * (SC["s10"]["t1"] - SC["s10"]["t0"])
dark = pad([43.65, 65.41, 87.31, 103.83], dk0, SC["end"]["t0"] + 2,
           [(dk0, 0), (dk0 + 2, 0.1), (SC["d3"]["t0"], 0.16), (SC["d3"]["t1"], 0.17), (SC["d7"]["t0"] + 2, 0.1), (SC["end"]["t0"] + 2, 0.0)],
           partials=7, detune=0.006, bright=1.3, seed=2)
place(dark, dk0, 1.0, send=0.25)
pulse = np.zeros(N)
p0, p1 = SC["h8"]["t0"], SC["d3"]["t1"]
pk = (t >= p0) & (t < p1)
pulse[pk] = np.sin(2 * np.pi * 55 * t[pk]) * np.exp(-((t[pk] - p0) % 0.75) / 0.12) * np.clip((t[pk] - p0) / (p1 - p0) * 1.4, 0, 1)
L += pulse * 0.18
R += pulse * 0.18
end0 = SC["end"]["t0"]
sad = pad([110.0, 130.81, 164.81, 220.0], end0 - 1, D,
          [(end0 - 1, 0), (end0 + 2, 0.12), (cues["endText"], 0.12), (cues["endText"] + 1.5, 0.17), (D - 1.5, 0.15), (D, 0)], partials=5, bright=1.9, seed=3)
place(sad, end0 - 1, 1.0, send=0.5)

# ---------------------------------------------------------------- mix + voice
L += reverb(VL, 2.4, 901) * 0.8
R += reverb(VR, 2.4, 902) * 0.8
mix = np.stack([L, R], axis=1)
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.15) / np.tanh(1.15) * 0.93
vo = np.zeros(N)
duck = np.zeros(N)
for v in cues["voice"]:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "voice" / v["file"]), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    voiced = x[np.abs(x) > 0.01]
    x *= 10 ** (-15 / 20) / (np.sqrt(np.mean(voiced**2)) + 1e-9)
    x = fade(x, 0.01, 0.05)
    i0 = int(v["start"] * SR)
    n = min(len(x), N - i0)
    vo[i0 : i0 + n] += x[:n]
    duck[max(0, i0 - int(0.2 * SR)) : min(N, i0 + n + int(0.35 * SR))] = 1
k = int(0.15 * SR)
duck = np.convolve(duck, np.ones(k) / k, mode="same")
mix *= (1 - 0.65 * duck)[:, None]
room = reverb(vo, 0.6, 903) * 0.06
mix[:, 0] += vo + room
mix[:, 1] += vo + room
pk = np.max(np.abs(mix))
if pk > 0.95:
    mix = np.tanh(mix * (1.1 / pk)) / np.tanh(1.1) * 0.95
mix *= keys([(0, 0), (0.3, 1), (D - 1.2, 1), (D, 0)])[:, None]
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {OUT}  ({D:.1f}s, {len(cues['voice'])} voice lines)")

#!/usr/bin/env python3
"""Soundtrack for "Тог алга болбол": synthesised blackout sound design + the voice-over.

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



BO = cues["blackout"]
# city hum + traffic until the blackout, then the hum is gone
city = keys([(0, 0), (0.4, 0.25), (BO, 0.25), (BO + 0.05, 0.0), (D, 0)])
for seed, ch in ((1, L), (2, R)):
    ch += band(N, 40, 400, seed) * city * 0.9
    ch += np.sin(2 * np.pi * 50 * t) * city * 0.05
    ch += band(N, 300, 1600, seed + 5) * city * 0.25
# electrical crackle + power-down sweep at the blackout
for k in range(26):
    nn = int(0.02 * SR)
    place(band(nn, 1500, 9000, 600 + k) * np.exp(-np.arange(nn) / SR / 0.004), BO + r.uniform(0, 0.9), r.uniform(0.08, 0.25), pan=r.uniform(-0.8, 0.8))
place(fade(tone(420, 1.2, attack=0.003, fend=40), 0.003, 0.2), BO + 0.1, 0.18, send=0.4)
place(tone(55, 2.0, decay=0.6, fend=28), BO + 0.9, 0.5, send=0.4)
# wind after the blackout (stronger in the cold week)
wind = keys([(0, 0), (BO + 0.5, 0.0), (BO + 2, 0.06), (47, 0.08), (48, 0.14), (58, 0.12), (70, 0.08)])
gust = np.clip(1 + 0.45 * band(N, 0.04, 0.7, 11, 1), 0.3, 1.9)
L += band(N, 120, 800, 610) * wind * gust * 0.7
R += band(N, 120, 800, 611) * wind * gust * 0.7
# crowd gasp / murmur on the dark square
mur = keys([(0, 0), (BO + 0.8, 0), (BO + 1.4, 0.16), (8, 0.08), (8.05, 0), (D, 0)])
for seed, ch in ((620, L), (621, R)):
    babble = sum(band(N, 300 + 300 * k, 900 + 500 * k, seed + k) * np.clip(band(N, 2, 7, seed + 10 + k, 1), 0, None) for k in range(4))
    ch += babble * mur * 0.4
# 1 s: phone dies, antenna static fades, crash
place(fade(tone(880, 0.12, attack=0.003, fend=220), 0.003, 0.05), cues["phoneOff"], 0.15)
ao = cues["antennaOff"]
nst = int(1.6 * SR)
place(band(nst, 800, 7000, 630) * keys([(0, 0.6), (0.6, 0.6), (0.7, 0), (1.6, 0)], np.arange(nst) / SR), ao - 0.6, 0.08)
cr = cues["crash"]
nc = int(1.2 * SR)
place(band(nc, 80, 6000, 640) * np.exp(-np.arange(nc) / SR / 0.18), cr, 0.45)
for k in range(10):
    place(tone(r.uniform(600, 2200), 0.5, decay=0.12), cr + r.uniform(0, 0.4), 0.06, pan=r.uniform(-0.6, 0.6), send=0.3)
for k in range(3):
    place(fade(tone(420, 0.45, attack=0.02)), cr + 1.6 + k * 0.6, 0.03, pan=-0.5 + k * 0.5, send=0.5)
# 1 h: banging in the elevator, then the tap runs dry
e0, e1 = cues["elevator"]
bt = e0 + 0.6
while bt < e1 - 0.2:
    place(band(int(0.12 * SR), 50, 500, 650) * np.exp(-np.arange(int(0.12 * SR)) / SR / 0.03), bt, 0.3, send=0.3)
    bt += r.uniform(0.25, 0.5)
L += sum(band(N, 300 + 300 * k, 900 + 500 * k, 660 + k) * np.clip(band(N, 2, 7, 670 + k, 1), 0, None) for k in range(3)) * env_on([(e0, e1)], 0.3, 0.3) * 0.08
tp0, tp1 = cues["tap"]
wat = band(N, 800, 7000, 680) * keys([(0, 0), (tp0, 0), (tp0 + 0.1, 1), (tp0 + 0.6, 1), (tp0 + 1.2, 0), (D, 0)])
L += wat * 0.1
R += wat * 0.1
for k in range(4):
    place(fade(tone(1500, 0.25, decay=0.06, fend=900)), tp0 + 1.2 + 0.25 + k * 0.7, 0.08, send=0.6)
# 24 h: ICU monitor until power fails, then the hand-squeezed bag
i0, i1 = cues["icu"]
io = cues["icuOff"]
b = i0 + 0.3
while b < io:
    place(fade(tone(1000, 0.09, attack=0.003), 0.003, 0.02), b, 0.07)
    b += 0.8
nv = int((io - i0) * SR)
vent = band(nv, 300, 3000, 690) * (0.5 + 0.5 * np.sin(2 * np.pi * np.arange(nv) / SR / 3.0)) ** 2
place(vent, i0, 0.05)
place(fade(tone(700, 0.6, attack=0.003, fend=90), 0.003, 0.1), io, 0.12)
sqz = io + 0.8
while sqz < i1:
    nn = int(0.5 * SR)
    place(band(nn, 300, 2500, 700) * np.sin(np.pi * np.arange(nn) / nn) ** 2, sqz, 0.07)
    sqz += 1.14
# day 3: drips, then looting with glass
d0, d1_ = cues["drips"]
for k in range(16):
    place(fade(tone(r.uniform(1200, 2000), 0.2, decay=0.05, fend=700)), r.uniform(d0, d1_), 0.06, pan=r.uniform(-0.7, 0.7), send=0.5)
l0, l1 = cues["loot"]
for seed, ch in ((710, L), (711, R)):
    ch += band(N, 250, 2500, seed) * (0.5 + 0.5 * np.clip(band(N, 1, 5, seed + 2, 1), 0, None)) * env_on([(l0, l1)], 0.2, 0.4) * 0.25
for k in range(8):
    tt0 = l0 + r.uniform(0, 3)
    for j in range(6):
        place(tone(r.uniform(3000, 8000), 0.3, decay=0.05), tt0 + j * 0.02, 0.05, pan=r.uniform(-0.6, 0.6))
# day 7: footsteps on the road, then fire crackle
x0, x1 = cues["exodus"]
st = x0 + 0.2
while st < x1:
    place(band(int(0.05 * SR), 100, 1500, 720) * np.exp(-np.arange(int(0.05 * SR)) / SR / 0.012), st, r.uniform(0.04, 0.09), pan=r.uniform(-0.6, 0.6))
    st += r.uniform(0.12, 0.3)
f0, f1 = cues["fire"]
for k in range(int((f1 - f0) * 18)):
    nn = int(0.008 * SR)
    place(band(nn, 1200, 7000, 730 + k % 50) * np.exp(-np.arange(nn) / SR / 0.002), r.uniform(f0, f1 - 0.05), r.uniform(0.02, 0.09), pan=r.uniform(-0.5, 0.5))
L += band(N, 60, 500, 740) * env_on([(f0, f1)], 0.6, 0.6) * 0.05
R += band(N, 60, 500, 741) * env_on([(f0, f1)], 0.6, 0.6) * 0.05
# timer ticks + transitions
last = -1
for tk in cues["ticks"]:
    if tk["roll"]:
        if tk["t"] - last < 0.028:
            continue
        place(fade(tone(3300, 0.012, decay=0.003)), tk["t"], 0.05)
    else:
        n = int(0.05 * SR); k = np.arange(n) / SR
        place(np.sin(2 * np.pi * 2100 * k) * np.exp(-k / 0.005) + 0.6 * np.sin(2 * np.pi * 950 * k) * np.exp(-k / 0.012), tk["t"], 0.08, pan=-0.1, send=0.1)
    last = tk["t"]
for i, ft in enumerate(cues["flashes"]):
    nin, nout = int(0.4 * SR), int(0.5 * SR)
    x = band(nin + nout, 350, 6000, 750 + i)
    env = np.concatenate([np.linspace(0, 1, nin) ** 3, np.exp(-np.arange(nout) / SR / 0.1)])
    place(x * env, ft - 0.4, 0.18, send=0.3)
    place(tone(60, 1.1, decay=0.28, attack=0.003, fend=30), ft, 0.4)
# music: neon pulse before, cold drone after, warm pad at the end
neon = pad([220.0, 277.18, 329.63], 0, BO + 0.3, [(0, 0), (0.5, 0.1), (BO, 0.1), (BO + 0.3, 0)], partials=4, bright=1.2, seed=1)
place(neon, 0, 1.0, send=0.3)
cold = pad([41.2, 61.74, 82.41, 98.0], BO + 1, 60, [(BO + 1, 0), (10, 0.1), (37, 0.15), (47, 0.16), (56, 0.08), (60, 0)], partials=7, detune=0.006, bright=1.3, seed=2)
place(cold, BO + 1, 1.0, send=0.25)
pk = (t >= 17) & (t < 47)
pulse = np.zeros(N); pulse[pk] = np.sin(2 * np.pi * 55 * t[pk]) * np.exp(-((t[pk] - 17) % 0.8) / 0.12) * np.clip((t[pk] - 17) / 30 * 1.3, 0, 1)
L += pulse * 0.16; R += pulse * 0.16
warm = pad([98.0, 146.83, 196.0, 246.94, 293.66], 55, D, [(55, 0), (58.5, 0.12), (cues["endText"], 0.14), (cues["endText"] + 1.5, 0.19), (D - 1, 0.17), (D, 0)], partials=5, bright=1.8, seed=3)
place(warm, 55, 1.0, send=0.5)

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
    x *= 10 ** (-13 / 20) / (np.sqrt(np.mean(voiced**2)) + 1e-9)
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
mix = np.tanh(mix * 1.25) / np.tanh(1.25) * 0.95
mix *= keys([(0, 0), (0.3, 1), (D - 1.0, 1), (D, 0)])[:, None]
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {OUT}  ({D:.1f}s, {len(cues['voice'])} voice lines)")

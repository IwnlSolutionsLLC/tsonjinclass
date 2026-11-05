#!/usr/bin/env python3
"""Soundtrack for "Батгагүй бол": synthesised bathroom/skin sound design + the voice-over.

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




# soft bathroom room tone
room = keys([(0, 0), (0.3, 0.05), (13, 0.05), (13.05, 0.0), (38, 0.0), (38.05, 0.05), (D, 0.05)])
L += band(N, 60, 900, 1) * room; R += band(N, 60, 900, 2) * room
# sparkle on the glass-smooth skin
for k in range(14):
    place(fade(tone(r.uniform(3000, 6500), 0.6, decay=0.15)), 1.0 + k * 0.14 + r.uniform(0, 0.05), 0.03, pan=-0.8 + k * 0.12, send=0.6)
# products thrown in the bin
for k, tt0 in enumerate(cues["throws"]):
    place(fade(band(int(0.3 * SR), 800, 6000, 10 + k) * np.linspace(0, 1, int(0.3 * SR)) ** 2), tt0 - 0.3, 0.05)
    place(band(int(0.25 * SR), 80, 1800, 20 + k) * np.exp(-np.arange(int(0.25 * SR)) / SR / 0.05), tt0, 0.35, pan=0.4)
    place(tone(r.uniform(300, 600), 0.4, decay=0.08), tt0, 0.08, pan=0.4)
# market crash sting
cr = cues["crash"]
place(fade(tone(880, 1.0, attack=0.005, fend=110), 0.005, 0.3), cr, 0.12, send=0.4)
place(tone(55, 1.6, decay=0.5, fend=30), cr + 0.05, 0.5)
# zoom into the pore + microscope hum
z0, z1 = cues["zoom"]
nz = int((z1 - z0) * SR); kz = np.arange(nz) / SR / (z1 - z0)
place(fade(band(nz, 300, 6000, 30) * kz ** 3, 0.05, 0.05), z0, 0.3, send=0.3)
hum = env_on([(z1, 38)], 0.3, 0.4)
L += (np.sin(2 * np.pi * 120 * t) * 0.03 + band(N, 2000, 6000, 31) * 0.01) * hum
R += (np.sin(2 * np.pi * 120 * t) * 0.03 + band(N, 2000, 6000, 32) * 0.01) * hum
# sebum bubbling, then freezing crackle
for k in range(10):
    place(fade(tone(r.uniform(200, 500), 0.12, decay=0.04, fend=r.uniform(600, 900))), z1 + 0.3 + k * 0.14, 0.05, pan=r.uniform(-0.5, 0.5))
fz = cues["freeze"]
for k in range(40):
    place(tone(r.uniform(4000, 9000), 0.08, decay=0.01), fz + r.uniform(0, 2.0), r.uniform(0.02, 0.06), pan=r.uniform(-0.7, 0.7), send=0.4)
# dry cracking
c0, c1 = cues["cracks"]
for k in range(60):
    nn = int(0.01 * SR)
    place(band(nn, 1500, 8000, 40 + k % 30) * np.exp(-np.arange(nn) / SR / 0.002), r.uniform(c0 + 0.5, c1), r.uniform(0.03, 0.1), pan=r.uniform(-0.6, 0.6))
# bacteria swarm
b0, b1 = cues["bact"]
sw = env_on([(b0 + 0.5, b1)], 1.5, 0.5)
L += band(N, 300, 1400, 50) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * sw * 0.07
R += band(N, 300, 1400, 51) * (0.5 + 0.5 * np.sin(2 * np.pi * 9.7 * t)) * sw * 0.07
# the little red spot: soft chime
place(tone(1318.5, 1.4, decay=0.4) + 0.6 * tone(1975.5, 1.4, decay=0.35), cues["spot"], 0.06, send=0.5)
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
    x = band(nin + nout, 350, 6000, 60 + i)
    env = np.concatenate([np.linspace(0, 1, nin) ** 3, np.exp(-np.arange(nout) / SR / 0.1)])
    place(x * env, ft - 0.4, 0.18, send=0.3)
    place(tone(60, 1.1, decay=0.28, attack=0.003, fend=30), ft, 0.38)
# music: airy major at the start, tense through the science, warm at the end
light = pad([261.63, 329.63, 392.0, 523.25], 0, 13.5, [(0, 0), (0.6, 0.12), (12.5, 0.1), (13.5, 0)], partials=4, bright=1.8, seed=1)
place(light, 0, 1.0, send=0.4)
tense = pad([46.25, 69.3, 92.5, 110.0], 12.5, 39, [(12.5, 0), (14, 0.09), (29, 0.14), (37.5, 0.16), (39, 0)], partials=7, detune=0.006, bright=1.3, seed=2)
place(tense, 12.5, 1.0, send=0.25)
warm = pad([196.0, 246.94, 293.66, 392.0], 37.5, D, [(37.5, 0), (39, 0.12), (cues["endText"], 0.13), (cues["endText"] + 1.2, 0.18), (D - 0.5, 0.17), (D, 0)], partials=5, bright=1.8, seed=3)
place(warm, 37.5, 1.0, send=0.5)

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
    x *= 10 ** (-14.5 / 20) / (np.sqrt(np.mean(voiced**2)) + 1e-9)
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
mix = np.tanh(mix * 1.25) / np.tanh(1.25) * 0.95 * 0.82
mix *= keys([(0, 0), (0.3, 1), (D - 0.45, 1), (D, 0)])[:, None]
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {OUT}  ({D:.1f}s, {len(cues['voice'])} voice lines)")

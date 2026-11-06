#!/usr/bin/env python3
"""Soundtrack for "Бороо үгүй бол": synthesised drought sound design + the voice-over.

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





gust = np.clip(1 + 0.45 * band(N, 0.04, 0.7, 11, 1), 0.3, 1.9)
# wind bed: warm breeze -> roaring dust storm -> dry wind -> fire roar -> silence of space
O = 4.5
wind = keys([(0, 0), (0.4, 0.1), (O + 6, 0.08), (O + 6.05, 0.1), (O + 13, 0.12), (O + 13.05, 0.2), (O + 16, 0.55), (O + 21.9, 0.6), (O + 22.0, 0.08), (O + 31, 0.06), (O + 31.05, 0.1), (O + 40, 0.1), (O + 40.05, 0.0), (D, 0)])
L += band(N, 80, 900, 1) * wind * gust * 0.7; R += band(N, 80, 900, 2) * wind * gust * 0.7
grit = keys([(0, 0), (O + 13, 0), (O + 14, 0.15), (O + 21.9, 0.2), (O + 22, 0), (D, 0)])
L += band(N, 2500, 9000, 3) * grit * gust * 0.4; R += band(N, 2500, 9000, 4) * grit * gust * 0.4
# dry thunder, no rain
for th in (cues["hookThunder"], cues["thunder"]):
    place(band(int(3.0 * SR), 25, 220, 5) * keys([(0, 0), (0.15, 1), (3.0, 0)], np.arange(int(3.0 * SR)) / SR), th, 0.5, send=0.4)
# cicadas / heat in the drying park and steppe
cic = env_on([(O + 6.2, O + 13)], 0.4, 0.3)
L += np.sin(2 * np.pi * 5200 * t) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 38 * t))) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t)) * cic * 0.012
R += np.sin(2 * np.pi * 5600 * t) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 41 * t))) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.6 * t + 1)) * cic * 0.012
for k in range(18):
    nn = int(0.01 * SR)
    place(band(nn, 1500, 8000, 10 + k) * np.exp(-np.arange(nn) / SR / 0.002), r.uniform(O + 7.5, O + 9.8), r.uniform(0.03, 0.07), pan=r.uniform(-0.6, 0.6))
# river: water fading out, then flies; dam powers down
r0, r1 = cues["river"]
wv = band(N, 300, 3500, 20) * keys([(0, 0), (r0, 0), (r0 + 0.2, 1), (r0 + 1.5, 0.7), (r1 - 0.8, 0.0), (D, 0)])
L += wv * 0.08; R += band(N, 300, 3500, 21) * keys([(0, 0), (r0, 0), (r0 + 0.2, 1), (r0 + 1.5, 0.7), (r1 - 0.8, 0.0), (D, 0)]) * 0.08
fly = env_on([(r1 - 1.6, r1)], 0.3, 0.2)
L += np.sin(2 * np.pi * np.cumsum(190 + 30 * np.sin(2 * np.pi * 3 * t)) / SR) * fly * 0.02
place(fade(tone(330, 1.6, attack=0.01, fend=60), 0.01, 0.3), cues["dam"] + 1.2, 0.12, send=0.3)
# fire roar + crackle
f0, f1 = cues["fire"]
roar = env_on([(f0, f1)], 0.5, 0.6)
L += band(N, 40, 600, 30) * roar * gust * 0.35; R += band(N, 40, 600, 31) * roar * gust * 0.35
for k in range(int((f1 - f0) * 30)):
    nn = int(0.008 * SR)
    place(band(nn, 1200, 7000, 40 + k % 50) * np.exp(-np.arange(nn) / SR / 0.002), r.uniform(f0, f1), r.uniform(0.03, 0.12), pan=r.uniform(-0.8, 0.8))
# the last clear drop
place(tone(1568, 2.0, decay=0.6) + 0.5 * tone(2349, 2.0, decay=0.5), cues["drop"], 0.08, send=0.6)
place(fade(tone(900, 0.25, attack=0.002, fend=1800)), cues["drop"] - 0.05, 0.05, send=0.5)
# slow low pulse in space (heartbeat-like)
pk = t >= O + 40.5
pulse = np.zeros(N); pulse[pk] = np.sin(2 * np.pi * 50 * t[pk]) * np.exp(-((t[pk] - O - 40.5) % 1.4) / 0.12)
L += pulse * 0.2; R += pulse * 0.2
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
# music: grey tension that grows, sparse sad pad in space
tense = pad([43.65, 65.41, 87.31, 103.83], 0, O + 41, [(0, 0), (1, 0.1), (O + 13, 0.11), (O + 31, 0.15), (O + 39.5, 0.17), (O + 41, 0)], partials=7, detune=0.006, bright=1.3, seed=2)
place(tense, 0, 1.0, send=0.25)
sad = pad([110.0, 130.81, 164.81, 220.0], O + 39.5, D, [(O + 39.5, 0), (O + 41, 0.11), (cues["endText"], 0.12), (cues["endText"] + 1.2, 0.17), (D - 0.5, 0.16), (D, 0)], partials=5, bright=1.9, seed=3)
place(sad, O + 39.5, 1.0, send=0.5)

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

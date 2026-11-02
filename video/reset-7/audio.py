#!/usr/bin/env python3
"""Soundtrack for "7 хоног · тархи": synthesised room/brain sound design + the voice-over.

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



# order: hook d1 d2 d3 d4 d5 d6 d7
room = step_env([0.05, 0.05, 0.06, 0.04, 0.05, 0.02, 0.03, 0.05])
for seed, ch in ((1, L), (2, R)):
    ch += band(N, 40, 300, seed) * room * 0.8
night0, night1 = cues["night"]
tk = night0 + 0.5
while tk < night1:
    nn = int(0.03 * SR); k = np.arange(nn) / SR
    place(np.sin(2 * np.pi * 2600 * k) * np.exp(-k / 0.004) + 0.5 * np.sin(2 * np.pi * 1200 * k) * np.exp(-k / 0.008), tk, 0.05, pan=-0.5)
    tk += 1.0
# phone set face down: soft tap + thud
pf = cues["phoneFlip"]
place(band(int(0.12 * SR), 80, 2500, 400) * np.exp(-np.arange(int(0.12 * SR)) / SR / 0.02), pf, 0.35)
place(tone(110, 0.3, decay=0.06, fend=70), pf, 0.4)
# red alert pulses
a0, a1 = cues["alert"]
k0 = a0 + 0.3
while k0 < a1 - 0.3:
    place(fade(tone(220, 0.35, attack=0.02) + 0.5 * tone(330, 0.35, attack=0.02), 0.02, 0.15), k0, 0.07, send=0.4)
    k0 += 0.75
# brain fog: muffled low drone
f0, f1 = cues["fog"]
fog = band(N, 60, 400, 410) * env_on([(f0, f1)], 0.5, 0.8)
L += fog * 0.12
R += band(N, 60, 400, 411) * env_on([(f0, f1)], 0.5, 0.8) * 0.12
# zoom into the eye: rising whoosh, then synapse sparkles
z0, z1 = cues["zoomEye"]
nz = int((z1 - z0) * SR); kz = np.arange(nz) / SR / (z1 - z0)
place(fade(band(nz, 300, 5000, 420) * kz ** 3, 0.05, 0.05), z0, 0.3, send=0.3)
for k in range(30):
    place(fade(tone(r.uniform(1800, 4200), 0.4, decay=0.1)), r.uniform(z1, cues["scenes"][2]["t1"]), 0.02, pan=r.uniform(-0.8, 0.8), send=0.7)
# tossing: sheet rustles
t0_, t1_ = cues["toss"]
for k in range(16):
    tt0 = t0_ + 0.4 + k * (t1_ - t0_ - 1) / 16
    nn = int(r.uniform(0.3, 0.7) * SR)
    place(band(nn, 1500, 8000, 430 + k) * np.sin(np.pi * np.arange(nn) / nn) ** 2, tt0, 0.09, pan=r.uniform(-0.4, 0.4))
# heartbeat in sync with the monitor
for b in cues["beats"]:
    for off, f0h, f1h, g in ((0.0, 58, 38, 1.0), (0.24, 74, 48, 0.6)):
        n = int(0.3 * SR)
        th = tone(f0h, 0.3, decay=0.075, attack=0.004, fend=f1h) + 0.45 * tone(f0h * 2.1, 0.3, decay=0.04, fend=f1h * 2)
        place(np.tanh(th * 1.8), b + off, 0.55 * g)
    place(fade(tone(1000, 0.08, attack=0.003), 0.003, 0.02), b, 0.05)
# morning birds (day 4 + day 7 window)
def birds(s0, s1, gain):
    tt0 = s0 + 0.3
    while tt0 < s1:
        for j in range(int(r.integers(2, 5))):
            f = r.uniform(2800, 4200)
            place(fade(tone(f, 0.07, attack=0.005, fend=f * r.uniform(1.1, 1.5))), tt0 + j * 0.09, gain, pan=r.uniform(-0.7, 0.7), send=0.5)
        tt0 += r.uniform(0.5, 1.4)
m0, m1 = cues["morning"]
birds(m0, m1, 0.05)
wo = cues["windowOpen"]
place(band(int(0.8 * SR), 200, 3000, 440) * np.exp(-np.arange(int(0.8 * SR)) / SR / 0.25), wo, 0.15)
birds(wo + 0.5, cues["endCard"], 0.06)
# street: traffic + footsteps
s0, s1 = cues["street"]
L += band(N, 50, 900, 450) * env_on([(s0, s1)], 0.3, 0.3) * 0.12
R += band(N, 50, 900, 451) * env_on([(s0, s1)], 0.3, 0.3) * 0.12
st = s0 + 0.2
while st < s1:
    place(band(int(0.05 * SR), 100, 1500, 460) * np.exp(-np.arange(int(0.05 * SR)) / SR / 0.01), st, 0.15)
    st += 0.52
# café murmur + cup clinks
c0, c1 = cues["cafe"]
for seed, ch in ((470, L), (471, R)):
    babble = sum(band(N, 300 + 300 * k, 900 + 500 * k, seed + k) * np.clip(band(N, 2, 7, seed + 10 + k, 1), 0, None) for k in range(4))
    ch += babble * env_on([(c0, c1)], 0.3, 0.4) * 0.06
for k in range(4):
    place(tone(2600 * r.uniform(0.95, 1.05), 0.5, decay=0.12) + 0.5 * tone(4100, 0.5, decay=0.08), r.uniform(c0 + 0.5, c1 - 0.5), 0.04, pan=r.uniform(-0.6, 0.6), send=0.3)
# transitions
for i, ft in enumerate(cues["flashes"]):
    nin, nout = int(0.4 * SR), int(0.5 * SR)
    x = band(nin + nout, 400, 7000, 480 + i)
    env = np.concatenate([np.linspace(0, 1, nin) ** 3, np.exp(-np.arange(nout) / SR / 0.09)])
    place(x * env, ft - 0.4, 0.16, send=0.3)
    place(tone(65, 1.0, decay=0.25, attack=0.003, fend=35), ft, 0.32)
# music: dark minor pad -> bright major, uplifting end
SCn = {s["id"]: s for s in cues["scenes"]}
d4 = SCn["d4"]["t0"]
darkp = pad([55.0, 82.41, 110.0, 130.81], 0, d4 + 2, [(0, 0), (1.0, 0.12), (SCn["d3"]["t0"], 0.14), (SCn["d3"]["t1"], 0.17), (d4 + 2, 0)], partials=6, detune=0.006, bright=1.4, seed=2)
place(darkp, 0, 1.0, send=0.35)
bright = pad([130.81, 196.0, 261.63, 329.63, 392.0], d4 - 1, D, [(d4 - 1, 0), (d4 + 2, 0.12), (SCn["d7"]["t0"], 0.15), (cues["endCard"], 0.2), (D - 1.0, 0.2), (D, 0)], partials=5, bright=1.8, seed=3)
place(bright, d4 - 1, 1.0, send=0.45)
ar0 = SCn["d7"]["t0"] + 0.5
notes = [523.25, 659.25, 783.99, 1046.5]
k = 0
while ar0 < D - 1.2:
    place(fade(tone(notes[k % 4], 0.5, decay=0.18, attack=0.004)), ar0, 0.035 * min(1, (ar0 - SCn["d7"]["t0"]) / 6), pan=0.3 * np.sin(k), send=0.5)
    ar0 += 0.25; k += 1

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
mix = np.tanh(mix * 1.25) / np.tanh(1.25) * 0.95  # gentle saturation: +~2.5 dB loudness for phone speakers
mix *= keys([(0, 0), (0.3, 1), (D - 1.2, 1), (D, 0)])[:, None]
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {OUT}  ({D:.1f}s, {len(cues['voice'])} voice lines)")

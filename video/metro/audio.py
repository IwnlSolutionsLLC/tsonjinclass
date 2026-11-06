#!/usr/bin/env python3
"""Soundtrack for "УБ метро": synthesised traffic/metro sound design + the voice-over.

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






# traffic jam: engine rumble + horns, fades as roads clear
jam = keys([(0, 0), (0.3, 0.3), (4.5, 0.3), (4.55, 0.06), (10.5, 0.06), (10.5 + 2.8, 0.06), (10.5 + 2.85, 0.3), (15, 0.12), (18.5, 0.05), (18.55, 0), (D, 0)])
L += band(N, 40, 500, 1) * jam * 0.8; R += band(N, 40, 500, 2) * jam * 0.8
for tt0 in (0.8, 1.9, 2.6, 3.7, 13.6, 14.4):
    place(fade(tone(r.uniform(380, 460), 0.4, attack=0.01) + 0.6 * tone(r.uniform(480, 560), 0.4, attack=0.01), 0.01, 0.08), tt0, 0.05 if tt0 < 5 else 0.03, pan=r.uniform(-0.7, 0.7))
# winter wind outside at the entrance + doors sliding
w = env_on([(4.5, 10.5)], 0.1, 0.2)
L += band(N, 150, 900, 3) * w * 0.06; R += band(N, 150, 900, 4) * w * 0.06
place(fade(band(int(0.9 * SR), 300, 3000, 5) * np.sin(np.pi * np.arange(int(0.9 * SR)) / int(0.9 * SR)), 0.02, 0.1), cues["doors"], 0.12)
place(tone(1318.5, 1.2, decay=0.4) + 0.6 * tone(1760, 1.2, decay=0.35), cues["doors"] + 0.6, 0.06, send=0.5)
# station: train arrives (rising whoosh + brakes), chime
a0 = cues["arrive"]
na = int(2.6 * SR); ka = np.arange(na) / SR
place(band(na, 100, 2500, 6) * keys([(0, 0), (1.6, 1), (2.6, 0)], ka), a0, 0.3, send=0.3)
place(fade(tone(2600, 0.6, attack=0.05, fend=1900), 0.05, 0.2), a0 + 1.7, 0.03)
for k, f in enumerate((784, 659.25, 523.25)):
    place(tone(f, 0.9, decay=0.35), a0 + 2.3 + k * 0.28, 0.05, send=0.5)
# riding: rail clatter + tunnel rumble
r0, r1 = cues["ride"]
ride = env_on([(r0, r1)], 0.2, 0.3)
L += band(N, 40, 400, 7) * ride * 0.35; R += band(N, 40, 400, 8) * ride * 0.35
ct = r0 + 0.2
while ct < r1:
    for j in (0, 0.11):
        place(band(int(0.04 * SR), 200, 3000, 9) * np.exp(-np.arange(int(0.04 * SR)) / SR / 0.01), ct + j, 0.08)
    ct += 0.62
for k in range(6):
    place(fade(band(int(0.5 * SR), 600, 6000, 10 + k) * np.sin(np.pi * np.arange(int(0.5 * SR)) / int(0.5 * SR)), 0.01, 0.05), r0 + 0.8 + k * 1.33, 0.06)
# mall: murmur, footsteps, a coffee machine hiss
m0, m1 = cues["mall"]
mall = env_on([(m0, m1)], 0.3, 0.3)
for seed, ch in ((20, L), (21, R)):
    babble = sum(band(N, 300 + 300 * k, 900 + 500 * k, seed + k) * np.clip(band(N, 2, 7, seed + 10 + k, 1), 0, None) for k in range(4))
    ch += babble * mall * 0.12
place(fade(band(int(1.2 * SR), 2000, 8000, 30), 0.1, 0.3), m0 + 3.0, 0.04, pan=0.5)
# city from above: wind, birds as the air clears
c0, c1 = cues["city"]
cw = env_on([(c0, c1)], 0.3, 0.3)
L += band(N, 100, 800, 40) * cw * 0.08; R += band(N, 100, 800, 41) * cw * 0.08
for k in range(10):
    f = r.uniform(2800, 4200)
    place(fade(tone(f, 0.08, attack=0.005, fend=f * 1.3)), r.uniform(c0 + 4, c1 - 0.3), 0.04, pan=r.uniform(-0.7, 0.7), send=0.5)
# end: train leaves
lv = cues["leave"]
nl = int(2.4 * SR); kl = np.arange(nl) / SR
place(band(nl, 80, 2000, 50) * keys([(0, 0.2), (0.6, 1), (2.4, 0)], kl), lv - 0.2, 0.3, send=0.3)
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
# music: grey drone in the jam, then an upbeat, hopeful pad + pulse underground
grey = pad([55.0, 82.41, 110.0], 0, 5.0, [(0, 0), (0.5, 0.1), (4.4, 0.1), (5.0, 0)], partials=6, bright=1.3, seed=2)
place(grey, 0, 1.0, send=0.25)
bright = pad([261.63, 329.63, 392.0, 493.88], 4.5, D, [(4.5, 0), (6, 0.1), (18.5, 0.13), (45.5, 0.14), (cues["endText"], 0.15), (cues["endText"] + 1.2, 0.19), (D - 0.5, 0.17), (D, 0)], partials=5, bright=1.7, seed=3)
place(bright, 4.5, 1.0, send=0.45)
pk = (t >= 10.5) & (t < 45.5)
pulse = np.zeros(N); pulse[pk] = np.sin(2 * np.pi * 65.4 * t[pk]) * np.exp(-((t[pk] - 10.5) % 0.5) / 0.08)
L += pulse * 0.12; R += pulse * 0.12
notes = [523.25, 659.25, 783.99, 659.25]
k = 0; at = 18.5
while at < 45.3:
    place(fade(tone(notes[k % 4], 0.3, decay=0.12, attack=0.004)), at, 0.025, pan=0.3 * np.sin(k), send=0.4)
    at += 0.25; k += 1

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

#!/usr/bin/env python3
"""Synthesises the soundtrack for "Ус уугаарай" from build/cues.json.

    python3 audio.py build/cues.json build/audio.wav

Everything is generated (no samples): steppe wind, crickets/lark, clock ticks,
whooshes, breath, heartbeat + ECG beeps synced to the on-screen monitor, tinnitus,
hallucinated river, pouring soil, body fall, flatline, then ice + a warm pad.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
D = cues["duration"]
N = int(D * SR)
t = np.arange(N) / SR
L = np.zeros(N)
R = np.zeros(N)
VL = np.zeros(N)  # reverb send bus
VR = np.zeros(N)
RNG = np.random.default_rng(2026)


def band(n, lo, hi, seed, order=2):
    """Band-limited noise (FFT-shaped), unit RMS."""
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


def place(sig, t0, gain=1.0, pan=0.0, send=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N or len(sig) == 0:
        return
    if i0 < 0:
        sig = sig[-i0:]
        i0 = 0
    s = sig[: N - i0]
    gl, gr = np.cos((pan + 1) * np.pi / 4) * gain, np.sin((pan + 1) * np.pi / 4) * gain
    L[i0 : i0 + len(s)] += s * gl
    R[i0 : i0 + len(s)] += s * gr
    if send:
        VL[i0 : i0 + len(s)] += s * gl * send
        VR[i0 : i0 + len(s)] += s * gr * send


def place_st(sl, sr, t0, gain=1.0, send=0.0):
    i0 = int(round(t0 * SR))
    n = min(len(sl), N - i0)
    L[i0 : i0 + n] += sl[:n] * gain
    R[i0 : i0 + n] += sr[:n] * gain
    if send:
        VL[i0 : i0 + n] += sl[:n] * gain * send
        VR[i0 : i0 + n] += sr[:n] * gain * send


def tone(freq, dur, decay=None, attack=0.002, fend=None, phase=0.0):
    n = max(1, int(dur * SR))
    tt = np.arange(n) / SR
    if fend:
        f = freq * (fend / freq) ** (tt / dur)
        ph = 2 * np.pi * np.cumsum(f) / SR
    else:
        ph = 2 * np.pi * freq * tt
    env = np.minimum(1.0, tt / max(attack, 1e-4))
    if decay:
        env = env * np.exp(-tt / decay)
    return np.sin(ph + phase) * env


def fade(sig, a=0.005, r=0.01):
    n = len(sig)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        sig[:na] *= np.linspace(0, 1, na)
    if nr:
        sig[-nr:] *= np.linspace(1, 0, nr)
    return sig


def pad(freqs, t0, t1, env_pts, partials=6, detune=0.0035, bright=1.6, seed=0):
    """Additive pad over [t0, t1]; env_pts in absolute seconds."""
    n = int((t1 - t0) * SR)
    tt = np.arange(n) / SR
    r = np.random.default_rng(seed)
    y = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0.0, detune):
            for k in range(1, partials + 1):
                y += np.sin(2 * np.pi * f * (1 + d) * k * tt + r.uniform(0, 2 * np.pi)) / k**bright
    y /= np.max(np.abs(y)) + 1e-9
    return y * keys(env_pts, tt + t0)


SC = {s["id"]: s for s in cues["scenes"]}
ST = lambda k: SC[k]["t0"]  # noqa: E731
FLAT = cues["flat"]
E = 0.012  # step width for envelope cuts

# ---------------------------------------------------------------- wind bed
gust = np.clip(1 + 0.45 * band(N, 0.04, 0.7, 11, 1), 0.3, 1.9)
wind_env = keys([
    (0, 0), (0.6, 0.17), (3.5, 0.18), (4.6, 0.03), (7.0, 0.0),
    (7.0 + E, 0.05), (12.5, 0.06),
    (12.5 + E, 0.42), (15.0, 0.46), (15.0 + E, 0.26), (17.3, 0.28), (17.3 + E, 0.05), (20.0, 0.05),
    (20.0 + E, 0.28), (23.3, 0.3), (23.3 + E, 0.08), (27.0, 0.08),
    (27.0 + E, 0.3), (30.8, 0.32), (30.8 + E, 0.06), (34.0, 0.06),
    (34.0 + E, 0.34), (41.5, 0.38), (41.5 + E, 0.22), (44.5, 0.15), (47.0, 0.05), (49.3, 0.0), (D, 0.0),
])
for seed, ch in ((1, L), (2, R)):
    w = band(N, 110, 750, seed) + 0.35 * band(N, 650, 1400, seed + 10) * np.clip(band(N, 0.1, 0.9, seed + 20, 1), 0, None)
    ch += w * wind_env * gust * 0.55
sand_env = keys([(0, 0), (12.5, 0), (12.5 + E, 0.16), (17.3, 0.14), (17.3 + E, 0), (20.0, 0), (20.0 + E, 0.07), (23.3, 0.07), (23.3 + E, 0),
                 (34.0, 0), (34.0 + E, 0.08), (41.5, 0.1), (41.5 + E, 0.03), (47, 0), (D, 0)])
L += band(N, 2600, 8500, 5) * sand_env * gust * 0.5
R += band(N, 2600, 8500, 6) * sand_env * gust * 0.5
rumble_env = keys([(0, 0), (12.5, 0), (12.5 + E, 0.3), (15.0, 0.3), (15.0 + E, 0), (34.0, 0), (34.0 + E, 0.18), (41.5, 0.2), (41.5 + E, 0.1), (47, 0), (D, 0)])
rum = band(N, 25, 110, 7) * rumble_env * 0.6
L += rum
R += rum

# inside-the-body ambience (macro shots) + hologram hum
body_env = keys([(0, 0), (4.5, 0), (4.9, 0.32), (6.95, 0.3), (7.0, 0), (23.3, 0), (23.3 + E, 0.36), (27.0, 0.36), (27.0 + E, 0), (D, 0)])
bod = band(N, 25, 240, 8) * body_env
L += bod
R += band(N, 25, 240, 9) * body_env
holo_env = np.zeros(N)
for a, b in cues["holo"]:
    holo_env += keys([(0, 0), (a, 0), (a + 0.05, 1), (b - 0.02, 1), (b, 0), (D, 0)])
hum = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 110 * t) + 0.25 * np.sin(2 * np.pi * 165.3 * t)) * 0.08
data = band(N, 3000, 7000, 12) * np.clip(band(N, 3, 14, 13, 1), 0, None) * 0.015
L += (hum + data) * holo_env
R += (hum + data * 0.7) * holo_env

# ---------------------------------------------------------------- summer life (intro only)
r = np.random.default_rng(31)
tc = 0.4
while tc < 3.6:
    for k in range(3):
        place(fade(tone(4400 + r.uniform(-60, 60), 0.018, attack=0.002)), tc + k * 0.035, 0.06, pan=r.uniform(-0.8, 0.8))
    tc += r.uniform(0.35, 0.6)
for tl in (0.9, 1.15, 2.1, 2.3, 2.45, 3.0):
    place(fade(tone(2900, 0.07, attack=0.005, fend=4300 + r.uniform(-300, 300))), tl, 0.08, pan=0.5, send=0.5)

# ---------------------------------------------------------------- music beds
warm = pad([110.0, 164.81, 220.0, 277.18], 0.0, 5.2, [(0, 0), (1.2, 0.17), (3.4, 0.17), (5.0, 0.0), (5.2, 0)], seed=1)
place(warm, 0.0, 1.0, send=0.35)
dark = pad([36.71, 55.0, 73.42, 77.78], 7.0, 49.5,
           [(7.0, 0.0), (8.0, 0.035), (20.0, 0.06), (34.0, 0.09), (41.5, 0.1), (FLAT, 0.08), (48.6, 0.0), (49.5, 0.0)],
           partials=7, detune=0.006, bright=1.3, seed=2)
place(dark, 7.0, 1.0, send=0.25)
# rising tension tone in the hallucination
ten = np.zeros(int(7.5 * SR))
tt = np.arange(len(ten)) / SR
for f in (440.0, 466.16, 659.25):
    ten += np.sin(2 * np.pi * np.cumsum(f * (1 + 0.035 * tt / 7.5)) / SR)
ten *= keys([(0, 0), (1.5, 0.012), (5.0, 0.03), (5.02, 0.004), (7.5, 0.0)], tt) * (0.75 + 0.25 * np.sin(2 * np.pi * 6 * tt))
place(ten, ST("mirage"), 1.0, send=0.6)

# ---------------------------------------------------------------- clock ticks
last = -1
for tk in cues["ticks"]:
    if tk["roll"]:
        if tk["t"] - last < 0.028:
            continue
        place(fade(tone(3300, 0.012, decay=0.003)) + 0.4 * band(int(0.012 * SR), 2000, 9000, 40) * np.exp(-np.arange(int(0.012 * SR)) / SR / 0.002), tk["t"], 0.05)
    else:
        n = int(0.05 * SR)
        k = np.arange(n) / SR
        click = np.sin(2 * np.pi * 2100 * k) * np.exp(-k / 0.005) + 0.6 * np.sin(2 * np.pi * 950 * k) * np.exp(-k / 0.012)
        click += 0.5 * band(n, 1500, 9000, 41) * np.exp(-k / 0.0015)
        place(click, tk["t"], 0.16, pan=-0.1, send=0.15)
    last = tk["t"]

# ---------------------------------------------------------------- transitions
for i, ft in enumerate(cues["flashes"]):
    nin, nout = int(0.42 * SR), int(0.6 * SR)
    x = band(nin + nout, 350, 6000, 50 + i)
    env = np.concatenate([np.linspace(0, 1, nin) ** 3, np.exp(-np.arange(nout) / SR / 0.1)])
    place(x * env, ft - 0.42, 0.22, send=0.3)
    place(tone(62, 1.2, decay=0.3, attack=0.003, fend=30), ft, 0.55)
    place(band(int(0.3 * SR), 40, 600, 60 + i) * np.exp(-np.arange(int(0.3 * SR)) / SR / 0.05), ft, 0.25)

# zoom into the body (S1)
z0, z1 = cues["zoom"]
nz = int((z1 - z0) * SR)
kz = np.arange(nz) / SR / (z1 - z0)
zw = band(nz, 300, 4000, 70) * kz**2.5 + 0.6 * band(nz, 2000, 9000, 71) * kz**4
zw += 0.25 * np.sin(2 * np.pi * np.cumsum(180 * (7 ** kz)) / SR) * kz**2
place(fade(zw, 0.05, 0.03), z0, 0.35, send=0.3)
place(tone(70, 1.4, decay=0.4, attack=0.005, fend=38), z1 - 0.05, 0.6, send=0.2)
for k in range(10):
    place(fade(tone(r.uniform(300, 700), 0.06, decay=0.02, fend=r.uniform(900, 1600))), z1 + 0.2 + k * r.uniform(0.12, 0.25), 0.05, pan=r.uniform(-0.6, 0.6), send=0.4)

# ---------------------------------------------------------------- 60 s: slow-motion exhale
b0, b1 = cues["breath"]
nb = int(4.2 * SR)
kb = np.arange(nb) / SR
benv = np.where(kb < 0.6, np.sin(np.pi / 2 * kb / 0.6), np.exp(-(kb - 0.6) / 1.4))
place(band(nb, 220, 1700, 80) * benv, b0, 0.34, send=0.35)
place(band(nb, 60, 380, 81) * benv, b0, 0.12)
for k in range(22):
    place(tone(r.uniform(3200, 6200), 0.6, decay=0.12, attack=0.004), b0 + 0.3 + r.uniform(0, 3.2), 0.012, pan=r.uniform(-0.9, 0.9), send=0.8)

# ---------------------------------------------------------------- 4 h: lip crackle, kidney blips
c0, c1 = cues["crackle"]
for k in range(70):
    n = int(0.004 * SR)
    place(band(n, 2500, 9000, 100 + k) * np.exp(-np.arange(n) / SR / 0.0008), r.uniform(c0, c1), r.uniform(0.03, 0.09), pan=r.uniform(-0.5, 0.5))
for bt in cues["blips"]:
    s = tone(1320, 0.09, decay=0.03, attack=0.002) + 0.3 * tone(1980, 0.09, decay=0.02)
    place(fade(s), bt, 0.07, pan=0.1, send=0.25)

# ---------------------------------------------------------------- heartbeat + ECG
for b in cues["beats"]:
    if b["amp"] <= 0:
        continue
    period = 60.0 / b["bpm"]
    dub = max(0.2, min(0.34, 0.33 - 0.0013 * (b["bpm"] - 70)))
    for off, f0, f1, g in ((0.0, 58, 38, 1.0), (dub * min(1, period / 0.6), 74, 48, 0.62)):
        n = int(0.32 * SR)
        k = np.arange(n) / SR
        th = tone(f0, 0.32, decay=0.075, attack=0.004, fend=f1) + 0.45 * tone(f0 * 2.1, 0.32, decay=0.04, fend=f1 * 2)
        th += 0.18 * band(n, 20, 380, 200) * np.exp(-k / 0.02)
        place(np.tanh(th * 1.8), b["t"] + off, 0.62 * b["amp"] * g)
for et in cues["ecg"]:
    s = tone(1000, 0.1, attack=0.003) + 0.15 * tone(2000, 0.1, attack=0.003)
    place(fade(s, 0.003, 0.03), et, 0.1, send=0.1)
fl0, fl1 = cues["flatline"]
nf = int((fl1 - fl0) * SR)
flat = tone(1000, fl1 - fl0, attack=0.003) + 0.15 * tone(2000, fl1 - fl0, attack=0.003)
place(fade(flat, 0.003, 0.6), fl0, 0.2, send=0.15)

# ---------------------------------------------------------------- 12 h: tinnitus
ta, tb = cues["tinnitus"]
nt = int((tb - ta) * SR)
kt = np.arange(nt) / SR
tin = np.sin(2 * np.pi * np.cumsum(7040 * (1 + 0.002 * np.sin(2 * np.pi * 5 * kt))) / SR)
tin *= keys([(0, 0), (0.5, 0.01), (3.0, 0.03), (6.6, 0.045), (tb - ta - 0.02, 0.045), (tb - ta, 0)], kt)
place(tin, ta, 1.0)

# ---------------------------------------------------------------- 48 h: river mirage, grab, soil
r0, r1 = cues["river"]
nr = int((r1 - r0) * SR)
kr = np.arange(nr) / SR
bub = np.clip(band(nr, 2, 16, 300, 1), 0, None)
for seed, pan in ((301, -0.4), (302, 0.4)):
    wv = band(nr, 260, 3400, seed) * (0.45 + 0.8 * bub)
    wv *= keys([(0, 0), (1.2, 0.8), (r1 - r0 - 0.03, 1.0), (r1 - r0, 0)], kr)
    place(wv, r0, 0.16, pan=pan, send=0.75)
shim = sum(np.sin(2 * np.pi * f * kr) for f in (880, 1318.5, 1760)) * keys([(0, 0), (1.5, 0.012), (r1 - r0 - 0.03, 0.02), (r1 - r0, 0)], kr)
place(shim * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * kr)), r0, 1.0, send=0.9)
g0 = cues["grab"]
ng = int(0.35 * SR)
crunch = band(ng, 180, 4200, 310) * np.exp(-np.arange(ng) / SR / 0.07)
for k in range(30):
    i = int(r.uniform(0, 0.25) * SR)
    crunch[i : i + 120] += band(120, 2000, 8000, 320 + k) * r.uniform(0.5, 1.5)
place(crunch, g0, 0.4, pan=0.2)
p0, p1 = cues["pour"]
npr = int((p1 - p0) * SR)
pour = band(npr, 3000, 9000, 330) * 0.25
for k in range(int((p1 - p0) * 140)):
    i = int(r.uniform(0, p1 - p0 - 0.01) * SR)
    pour[i : i + 96] += band(96, 1500, 7000, 400 + (k % 50)) * np.exp(-np.arange(96) / 30) * r.uniform(0.2, 1.0)
pour *= keys([(0, 0), (0.15, 1), (p1 - p0 - 0.4, 0.8), (p1 - p0, 0)], np.arange(npr) / SR)
place(pour, p0, 0.13, pan=0.35)

# ---------------------------------------------------------------- day 5: body fall
th0 = cues["thud"]
place(tone(62, 1.3, decay=0.28, attack=0.004, fend=33), th0, 0.75)
place(band(int(0.25 * SR), 40, 500, 500) * np.exp(-np.arange(int(0.25 * SR)) / SR / 0.04), th0, 0.4)
place(band(int(1.2 * SR), 1500, 7000, 501) * np.exp(-np.arange(int(1.2 * SR)) / SR / 0.35), th0 + 0.05, 0.05, send=0.3)

# ---------------------------------------------------------------- CTA: back to reality
ct = cues["cta"]
for ci, ck in enumerate(cues["clinks"]):
    s = np.zeros(int(0.9 * SR))
    for f, dcy, a in ((2250, 0.5, 1.0), (3620, 0.35, 0.6), (5110, 0.25, 0.45), (6830, 0.18, 0.3), (8900, 0.1, 0.2)):
        s += a * tone(f * r.uniform(0.97, 1.03), 0.9, decay=dcy, attack=0.0008)
    place(s, ck, 0.36 if ci else 0.46, pan=r.uniform(-0.3, 0.3), send=0.35)
nrm = int((D - ct) * SR)
room = band(nrm, 80, 1200, 600) * 0.03
for k in range(int((D - ct) * 22)):
    tt0 = r.uniform(0, D - ct - 0.05)
    f = r.uniform(1400, 4800)
    pop = fade(tone(f, 0.014, decay=0.004, fend=f * 1.35), 0.0005, 0.002)
    i = int(tt0 * SR)
    room[i : i + len(pop)] += pop * r.uniform(0.03, 0.09)
place(room * keys([(0, 0), (0.05, 1), (D - ct - 0.6, 1), (D - ct, 0)], np.arange(nrm) / SR), ct, 1.0, send=0.2)
tx = cues["text"]
warm2 = pad([261.63, 329.63, 392.0, 587.33, 659.26], tx - 0.2, D,
            [(tx - 0.2, 0), (tx + 1.3, 0.22), (D - 0.9, 0.22), (D, 0)], partials=5, bright=1.8, seed=3)
place(warm2, tx - 0.2, 1.0, send=0.5)

# ---------------------------------------------------------------- reverb + master
def reverb(sig, secs, seed):
    n = int(secs * SR)
    k = np.arange(n) / SR
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-k * 6.9 / secs)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    ir /= np.sqrt(np.sum(ir**2))
    m = len(sig) + n - 1
    nf = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(sig, nf) * np.fft.rfft(ir, nf), nf)[: len(sig)]


L += reverb(VL, 2.6, 901) * 0.8
R += reverb(VR, 2.6, 902) * 0.8
# silence for the black beat before the CTA
b0, b1 = cues["black"]
gate = keys([(0, 1), (b0 - 0.3, 1), (b0 + 0.4, 0.0), (b1 - 0.001, 0.0), (b1, 1), (D, 1)])
L *= gate
R *= gate
mix = np.stack([L, R], axis=1)
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.15) / np.tanh(1.15) * 0.93
pcm = (mix * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {OUT}  ({D:.1f}s, peak-normalised)")

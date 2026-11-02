#!/usr/bin/env python3
"""Generates the Mongolian voice-over with the ElevenLabs API.

    ELEVENLABS_API_KEY=... python3 voiceover.py            # all lines
    ELEVENLABS_API_KEY=... python3 voiceover.py --only 03,07
    python3 voiceover.py --fit                              # re-fit existing clips, no API calls

Reads voice/script.json (text + timing per line) and writes voice/<id>.mp3 plus
voice/manifest.json, which audio.py mixes into the soundtrack (music is ducked
under the voice). Clips are trimmed of edge silence; a clip longer than its time
slot is sped up slightly (ffmpeg atempo, pitch preserved, at most 1.18x).

The API key is read only from the environment. Never commit it.
"""
import argparse
import json
import os
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
VDIR = HERE / "voice"
API = "https://api.elevenlabs.io/v1"
MAX_TEMPO = 1.18


def call(method, path, key, body=None, accept="application/json"):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        "xi-api-key": key, "Content-Type": "application/json", "Accept": accept})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {path}: {e.read().decode(errors='replace')[:400]}") from None


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], check=True)


def duration(p):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                         check=True, capture_output=True, text=True).stdout
    return float(out.strip())


def fit(raw, dst, slot):
    """Trim edge silence, then speed up gently if the clip overruns its slot."""
    trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03," \
           "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse"
    tmp = dst.with_suffix(".trim.wav")
    ffmpeg("-i", str(raw), "-af", trim, "-ar", "44100", str(tmp))
    d = duration(tmp)
    tempo = 1.0
    if d > slot:
        tempo = min(MAX_TEMPO, d / slot)
    af = f"atempo={tempo:.4f}" if tempo > 1.001 else "anull"
    ffmpeg("-i", str(tmp), "-af", af, "-c:a", "libmp3lame", "-q:a", "2", str(dst))
    tmp.unlink()
    return duration(dst), tempo


def tts(key, voice_id, model, text, lang):
    settings = {"stability": 0.5, "similarity_boost": 0.8, "style": 0.15, "use_speaker_boost": True}
    attempts = [
        {"text": text, "model_id": model, "language_code": lang, "voice_settings": settings},
        {"text": text, "model_id": model, "voice_settings": settings},
        {"text": text, "model_id": model},
    ]
    last = None
    for body in attempts:
        try:
            return call("POST", f"/text-to-speech/{voice_id}?output_format=mp3_44100_192", key, body, "audio/mpeg")
        except RuntimeError as e:
            last = e
            if "HTTP 400" not in str(e) and "HTTP 422" not in str(e):
                raise
    raise last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated line ids")
    ap.add_argument("--voice")
    ap.add_argument("--model")
    ap.add_argument("--fit", action="store_true", help="only re-trim/fit the raw clips already downloaded")
    a = ap.parse_args()
    script = json.loads((VDIR / "script.json").read_text())
    voice_id = a.voice or script["voice_id"]
    model = a.model or script["model"]
    lang = script.get("language", "mn")
    only = set(a.only.split(",")) if a.only else None
    raw_dir = VDIR / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not a.fit:
        if not key:
            sys.exit("Set ELEVENLABS_API_KEY in the environment.")
        models = json.loads(call("GET", "/models", key))
        info = next((m for m in models if m["model_id"] == model), None)
        langs = [l["language_id"] for l in (info or {}).get("languages", [])]
        mn_models = [m["model_id"] for m in models if any(l["language_id"] == lang for l in m.get("languages", []))]
        print(f"model {model}: {'supports' if lang in langs else 'does NOT list'} '{lang}'. Models listing '{lang}': {mn_models or 'none'}")

    manifest_path = VDIR / "manifest.json"
    manifest = {l["id"]: l for l in json.loads(manifest_path.read_text())["lines"]} if manifest_path.exists() else {}
    for line in script["lines"]:
        if only and line["id"] not in only:
            continue
        raw = raw_dir / f"{line['id']}.mp3"
        if not a.fit:
            raw.write_bytes(tts(key, voice_id, model, line["text"], lang))
        if not raw.exists():
            print(f"{line['id']}: no raw clip, skipped")
            continue
        slot = line["end"] - line["start"]
        dst = VDIR / f"{line['id']}.mp3"
        d, tempo = fit(raw, dst, slot)
        flag = "" if d <= slot + 0.05 else f"  !! still {d - slot:.2f}s over its slot, shorten the text"
        print(f"{line['id']}  {d:5.2f}s / slot {slot:4.2f}s  tempo {tempo:.2f}{flag}  {line['text']}")
        manifest[line["id"]] = {**line, "file": dst.name, "dur": round(d, 3), "tempo": round(tempo, 3), "model": model, "voice_id": voice_id}
    lines = [manifest[l["id"]] for l in script["lines"] if l["id"] in manifest]
    manifest_path.write_text(json.dumps({"lines": lines}, ensure_ascii=False, indent=1))
    print(f"wrote {manifest_path.relative_to(HERE)} ({len(lines)} lines)")


if __name__ == "__main__":
    main()

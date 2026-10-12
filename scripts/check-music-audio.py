#!/usr/bin/env python3
"""Check native Music publication, access controls, and byte ranges in an isolated fixture."""
import http.cookiejar
import io
import json
import math
from pathlib import Path
import shutil
import socket
import struct
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import wave


ROOT = Path(__file__).resolve().parents[1]
PHP = shutil.which("php")
if not PHP:
    raise SystemExit("PHP CLI is required.")

ROUTER = r'''<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/folders.php';
require __DIR__ . '/inc/music.php';
function json_out($data, $code = 200) { http_response_code($code); header('Content-Type: application/json'); echo json_encode($data); exit; }
function fail($message, $code = 400, $extra = array()) { json_out(array_merge(array('ok' => false, 'error' => $message), $extra), $code); }
function require_post() { if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST required', 405); }
function require_admin() { if (!is_admin() || !csrf_ok()) fail('Admin required', 403); }
function body_json() { $data = json_decode(file_get_contents('php://input'), true); return is_array($data) ? $data : array(); }
try { $action = $_GET['action'] ?? ''; if (handle_music_action($action) || handle_folder_action($action)) exit; fail('Unknown action', 404); }
catch (Throwable $error) { fail($error->getMessage(), 500); }
'''

SETUP = r'''<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/folders.php';
require __DIR__ . '/inc/music.php';
ensure_dirs(); @mkdir(FOLDER_DIR, 0750, true);
$config = array();
for ($n = 1; $n <= 18; $n++) $config[sprintf('student-%02d', $n)] = array('name' => 'Fixture Student ' . $n, 'hash' => password_hash('8642', PASSWORD_DEFAULT), 'version' => 1);
folder_write_private(FOLDER_CONFIG, $config); music_prepare();
$state = folder_state(); folder_bucket($state, 'student-01');
foreach (array('a' => 'fixture.wav', 'b' => 'fake.mp3') as $letter => $name) {
    $id = str_repeat($letter, 32); $bytes = file_get_contents(__DIR__ . '/' . $name);
    file_put_contents(folder_blob('student-01', $id), FOLDER_GUARD . $bytes);
    $state['folders']['student-01']['files'][$id] = array('id' => $id, 'name' => $name, 'size' => strlen($bytes), 'mime' => $letter === 'a' ? 'audio/wav' : 'audio/mpeg', 'preview' => 'audio', 'time' => date('c'), 'parent' => '');
}
folder_save($state);
'''


def fixture_wav():
    out = io.BytesIO()
    with wave.open(out, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"".join(struct.pack("<h", int(5000 * math.sin(2 * math.pi * 440 * n / 8000))) for n in range(8000)))
    return out.getvalue()


with tempfile.TemporaryDirectory(prefix="c122-music-check-") as temporary:
    folder = Path(temporary)
    (folder / "inc").mkdir()
    for name in ("core.php", "folders.php", "folder-workspace.php", "music.php", "music-audio.php"):
        shutil.copy2(ROOT / "inc" / name, folder / "inc" / name)
    (folder / "api.php").write_text(ROUTER)
    (folder / "setup.php").write_text(SETUP)
    payload = fixture_wav()
    (folder / "fixture.wav").write_bytes(payload)
    (folder / "fake.mp3").write_text("This is a text file, not music.")
    subprocess.run([PHP, str(folder / "setup.php")], check=True, capture_output=True)
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    server = subprocess.Popen([PHP, "-S", f"127.0.0.1:{port}", "-t", str(folder)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f"http://127.0.0.1:{port}/api.php"
    anonymous = urllib.request.build_opener()
    first = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    second = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    checks = []

    def request(client, action, body=None, query=None, headers=None, method=None):
        params = {"action": action, **(query or {})}
        data = json.dumps(body).encode() if body is not None else None
        request_headers = dict(headers or {})
        if data is not None:
            request_headers["Content-Type"] = "application/json"
        req = urllib.request.Request(base + "?" + urllib.parse.urlencode(params), data=data, headers=request_headers, method=method)
        try:
            response = client.open(req, timeout=5)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        return response.code, dict(response.headers), raw

    def api(client, action, expected=200, **options):
        status, headers, raw = request(client, action, **options)
        assert status == expected, (action, status, raw.decode(errors="replace"))
        return json.loads(raw)

    def check(label, expression):
        assert expression, label
        checks.append(label)

    try:
        for _ in range(50):
            try:
                api(anonymous, "music_status")
                break
            except (OSError, urllib.error.URLError):
                time.sleep(0.05)
        else:
            raise AssertionError("Fixture server did not start")

        api(anonymous, "music_audio_files", expected=401, query={"folder": "student-01"})
        api(anonymous, "music_playlist_create", expected=401, body={"folder": "student-01", "name": "Denied"})
        first_unlock = api(first, "folder_unlock", body={"folder": "student-01", "pin": "8642"})
        second_unlock = api(second, "folder_unlock", body={"folder": "student-02", "pin": "8642"})
        first_csrf = {"X-Folder-CSRF": first_unlock["csrf"]}
        second_csrf = {"X-Folder-CSRF": second_unlock["csrf"]}
        listing = api(first, "music_audio_files", query={"folder": "student-01"})
        check("Owner file listing and publication notice", listing["publishedAudioIsPublic"] and any(file["id"] == "a" * 32 for file in listing["files"]))
        playlist = api(first, "music_playlist_create", body={"folder": "student-01", "name": "Mix Test"}, headers=first_csrf)["playlist"]

        def mutate(client, action, current, csrf, expected=200, **values):
            return api(client, action, expected=expected, headers=csrf, body={"folder": current["folder"], "id": current["id"], "version": current["version"], **values})

        mutate(first, "music_audio_import", playlist, {}, expected=403, fileId="a" * 32)
        mutate(second, "music_audio_import", playlist, second_csrf, expected=401, fileId="a" * 32)
        mutate(first, "music_audio_import", playlist, first_csrf, expected=415, fileId="b" * 32)
        mutate(first, "music_audio_import", playlist, first_csrf, expected=404, fileId="../secret")
        updated = mutate(first, "music_audio_import", playlist, first_csrf, fileId="a" * 32, title="Шилжилт Fixture", artist="Test Artist")["playlist"]
        check("Import creates a playable native track and increments version", updated["version"] == playlist["version"] + 1 and updated["tracks"][0]["playable"])
        track = updated["tracks"][0]
        audio_id = track["audioId"]
        query = {"audio": audio_id}
        blob = folder / "database" / "music" / "audio" / (audio_id + ".php")
        mutate(first, "music_audio_import", updated, first_csrf, expected=409, fileId="a" * 32)
        mutate(first, "music_audio_import", playlist, first_csrf, expected=409, fileId="a" * 32)
        check("Duplicate/stale imports create no additional blobs", len(list(blob.parent.glob("*.php"))) == 1)
        status, headers, raw = request(anonymous, "music_audio_stream", query=query)
        check("Anonymous shared stream omits the PHP guard", status == 200 and raw == payload and headers["Content-Type"] == "audio/wav")
        status, headers, raw = request(anonymous, "music_audio_stream", query=query, method="HEAD")
        check("HEAD returns the exact audio length without a body", status == 200 and raw == b"" and int(headers["Content-Length"]) == len(payload))
        status, headers, raw = request(anonymous, "music_audio_stream", query=query, headers={"Range": "bytes=5-15"})
        check("Byte range returns 206 and exact bytes", status == 206 and raw == payload[5:16] and headers["Content-Range"] == f"bytes 5-15/{len(payload)}")
        status, _, raw = request(anonymous, "music_audio_stream", query=query, headers={"Range": "bytes=-12"})
        check("Suffix range", status == 206 and raw == payload[-12:])
        api(anonymous, "music_audio_stream", expected=416, query=query, headers={"Range": "bytes=999999-"})
        api(anonymous, "music_audio_stream", expected=416, query=query, headers={"Range": "bytes=1-2,5-6"})
        api(anonymous, "music_audio_stream", expected=404, query={"audio": "../secret"})
        api(anonymous, "music_audio_stream", expected=405, body={}, query=query)
        found = api(anonymous, "music_audio_library", query={"q": "ШИЛЖИЛТ"})["results"]
        check("Public library finds published audio with Unicode case folding", len(found) == 1 and found[0]["audioId"] == audio_id)

        target = api(second, "music_playlist_create", body={"folder": "student-02", "name": "Shared Mix"}, headers=second_csrf)["playlist"]
        target = mutate(second, "music_track_add", target, second_csrf, kind="audio", audioId=audio_id)["playlist"]
        check("Another owner can add an already published reference", target["tracks"][0]["audioId"] == audio_id)
        denied = {**updated, "folder": "student-02"}
        mutate(second, "music_playlist_update", denied, second_csrf, expected=403, name="Not mine")
        mutate(first, "music_playlist_delete", updated, first_csrf)
        status, _, raw = request(anonymous, "music_audio_stream", query=query)
        check("Other shared references retain playback after one playlist is deleted", status == 200 and raw == payload)
        check("Library deduplicates shared audio", len(api(anonymous, "music_audio_library")["results"]) == 1)
        mutate(second, "music_playlist_delete", target, second_csrf)
        api(anonymous, "music_audio_stream", expected=404, query=query)
        check("Unpublished/deleted audio disappears from the library", api(anonymous, "music_audio_library")["results"] == [])
        updated["version"] += 1
        restored = mutate(first, "music_playlist_restore", updated, first_csrf)["playlist"]
        status, _, raw = request(anonymous, "music_audio_stream", query=query)
        check("Restoring a playlist restores native playback", status == 200 and raw == payload)
        api(first, "folder_delete", body={"folder": "student-01", "files": ["a" * 32]}, headers=first_csrf)
        status, _, raw = request(anonymous, "music_audio_stream", query=query)
        check("Deleting the original private file preserves explicit shared import", status == 200 and raw == payload)
        original_blob = blob.read_bytes()
        blob.write_bytes(b"!" + original_blob[1:])
        api(anonymous, "music_audio_stream", expected=404, query=query)
        check("Corrupt guards are never streamed or advertised as playable", api(anonymous, "music_audio_library")["results"] == [] and not api(anonymous, "music_playlist", query={"id": restored["id"]})["playlist"]["tracks"][0]["playable"])
        blob.write_bytes(original_blob[:-1])
        api(anonymous, "music_audio_stream", expected=404, query=query)
        check("Length corruption is rejected", api(anonymous, "music_audio_library")["results"] == [])
        print(f"PASS: {len(checks)} native Music checks; access, MIME validation, versions, ranges, publication, deletion, and corrupt files.")
    finally:
        server.terminate()
        server.wait(timeout=5)

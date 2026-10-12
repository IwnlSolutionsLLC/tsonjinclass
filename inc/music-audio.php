<?php
/* Native mixing uses audio the owner explicitly publishes from a private folder. */
if (!defined('C122')) { http_response_code(404); exit; }

define('MUSIC_AUDIO_MAX_FILE', 128 * 1024 * 1024);
define('MUSIC_AUDIO_OWNER_QUOTA', 1024 * 1024 * 1024);
define('MUSIC_AUDIO_GLOBAL_QUOTA', 10 * 1024 * 1024 * 1024);

function music_audio_path($id)
{
    if (music_identifier($id) === '') throw new RuntimeException('Invalid audio identifier');
    return MUSIC_DIR . '/audio/' . $id . '.php';
}

function music_audio_mime($name, $mime)
{
    $formats = array(
        'mp3' => array('audio/mpeg'),
        'wav' => array('audio/wav', 'audio/x-wav', 'audio/vnd.wave'),
        'ogg' => array('audio/ogg', 'application/ogg'),
        'opus' => array('audio/ogg', 'application/ogg'),
        'flac' => array('audio/flac', 'audio/x-flac'),
        'm4a' => array('audio/mp4', 'audio/x-m4a', 'video/mp4'),
        'aac' => array('audio/aac', 'audio/x-aac', 'audio/x-hx-aac-adts'),
    );
    $extension = strtolower(pathinfo((string)$name, PATHINFO_EXTENSION));
    if (!isset($formats[$extension]) || !in_array($mime, $formats[$extension], true)) return '';
    if ($extension === 'ogg' || $extension === 'opus') return 'audio/ogg';
    if ($extension === 'm4a') return 'audio/mp4';
    if ($extension === 'wav') return 'audio/wav';
    if ($extension === 'flac') return 'audio/flac';
    if ($extension === 'aac') return 'audio/aac';
    return 'audio/mpeg';
}

function music_audio_record($state, $id)
{
    $id = music_identifier($id); $audio = $id !== '' ? ($state['audios'][$id] ?? null) : null;
    if (!is_array($audio) || (int)($audio['size'] ?? 0) < 1 || (int)$audio['size'] > MUSIC_AUDIO_MAX_FILE) return null;
    if (music_audio_mime($audio['name'] ?? '', $audio['mime'] ?? '') === '') return null;
    $path = music_audio_path($id);
    if (is_link($path) || !is_file($path) || (int)@filesize($path) !== (int)$audio['size'] + strlen(FOLDER_GUARD)) return null;
    $fp = @fopen($path, 'rb'); if (!$fp) return null;
    $guarded = fread($fp, strlen(FOLDER_GUARD)) === FOLDER_GUARD; fclose($fp);
    if (!$guarded) return null;
    return $audio;
}

function music_audio_public_track($track, $state = null)
{
    if ($state === null) $state = music_state();
    $id = music_identifier($track['audioId'] ?? ''); $audio = music_audio_record($state, $id);
    return array(
        'id' => (string)($track['id'] ?? ''), 'kind' => 'audio', 'audioId' => $id,
        'title' => clean_str($track['title'] ?? 'Дуу', 180), 'artist' => clean_str($track['artist'] ?? '', 120),
        'url' => $audio ? 'api.php?action=music_audio_stream&audio=' . rawurlencode($id) : '',
        'thumbnail' => '', 'customLabel' => true, 'disabled' => !$audio, 'playable' => (bool)$audio,
        'size' => $audio ? (int)$audio['size'] : 0, 'mime' => $audio ? $audio['mime'] : '',
    );
}

function music_audio_files($folder)
{
    $lock = folder_storage_lock(false);
    try {
        $state = folder_state(); $files = array();
        foreach (($state['folders'][$folder]['files'] ?? array()) as $file) {
            if ((int)($file['size'] ?? 0) < 1 || (int)$file['size'] > MUSIC_AUDIO_MAX_FILE) continue;
            $mime = music_audio_mime($file['name'] ?? '', $file['mime'] ?? '');
            // Older Folder versions did not classify AAC/OPUS; inspect those candidates safely.
            if ($mime === '' && in_array(strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION)), array('aac', 'opus'), true) && class_exists('finfo')) {
                $path = folder_blob($folder, $file['id']);
                if (is_link($path) || !is_file($path)) continue;
                $fp = folder_open_blob($folder, $file);
                try { $sample = fread($fp, min(128 * 1024, (int)$file['size'])); $mime = music_audio_mime($file['name'], (new finfo(FILEINFO_MIME_TYPE))->buffer($sample === false ? '' : $sample)); }
                finally { fclose($fp); }
            }
            if ($mime === '') continue;
            $files[] = array('id' => $file['id'], 'name' => $file['name'], 'size' => (int)$file['size'], 'mime' => $file['mime'], 'time' => $file['time']);
        }
        usort($files, function ($a, $b) { return strcmp($b['time'], $a['time']) ?: strcmp($a['name'], $b['name']); });
        return array('ok' => true, 'files' => $files, 'csrf' => folder_csrf($folder), 'limits' => music_limits(), 'publishedAudioIsPublic' => true);
    } finally { folder_storage_unlock($lock); }
}

function music_audio_shared_reference($state, $id, $targetPlaylist)
{
    $id = music_identifier($id);
    if (!music_audio_record($state, $id)) fail('Нийтэд хуваалцсан аудио олдсонгүй.', 404);
    foreach ($targetPlaylist['tracks'] as $track) if (($track['kind'] ?? '') === 'audio' && ($track['audioId'] ?? '') === $id) fail('Энэ дуу playlist-д аль хэдийн байна.', 409);
    foreach ($state['playlists'] as $playlist) {
        if (!empty($playlist['deleted'])) continue;
        foreach ($playlist['tracks'] as $track) {
            if (($track['kind'] ?? '') !== 'audio' || ($track['audioId'] ?? '') !== $id) continue;
            return array('id' => bin2hex(random_bytes(16)), 'kind' => 'audio', 'audioId' => $id, 'title' => clean_str($track['title'] ?? 'Дуу', 180), 'artist' => clean_str($track['artist'] ?? '', 120), 'customLabel' => true, 'added' => date('c'));
        }
    }
    fail('Нийтэд хуваалцсан аудио олдсонгүй.', 404);
}

function music_audio_library($query)
{
    $lock = folder_storage_lock(false);
    try {
        $state = music_state(); $playlists = array_values($state['playlists']); $tracks = array(); $seen = array(); $cfg = folder_config();
        usort($playlists, function ($a, $b) { return strcmp($b['updated'], $a['updated']); });
        $fold = function ($value) { return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value); };
        $needle = $fold($query);
        foreach ($playlists as $playlist) {
            if (!empty($playlist['deleted'])) continue;
            foreach ($playlist['tracks'] as $track) {
                if (($track['kind'] ?? '') !== 'audio' || isset($seen[$track['audioId'] ?? ''])) continue;
                $public = music_audio_public_track($track, $state); if (!$public['playable']) continue;
                $public['ownerName'] = (string)($cfg[$playlist['folder']]['name'] ?? '');
                if ($needle !== '' && strpos($fold($public['title'] . ' ' . $public['artist'] . ' ' . $public['ownerName']), $needle) === false) continue;
                $seen[$public['audioId']] = true; $public['playlistId'] = $playlist['id']; $tracks[] = $public;
                if (count($tracks) >= 100) break 2;
            }
        }
        return array('ok' => true, 'tracks' => $tracks, 'results' => $tracks, 'source' => 'local', 'limit' => 100);
    } finally { folder_storage_unlock($lock); }
}

/** Called under the shared storage write lock after ownership, CSRF, and version checks. */
function music_audio_import(&$state, &$playlist, $folder, $body)
{
    if (count($playlist['tracks']) >= MUSIC_MAX_TRACKS) fail('Нэг playlist 250 дуу хүртэл байна.');
    $fileId = folder_token_id($body['fileId'] ?? $body['file'] ?? '');
    $folderState = folder_state(); $file = $folderState['folders'][$folder]['files'][$fileId] ?? null;
    if ($fileId === '' || !is_array($file)) fail('Хавтасны аудио файл олдсонгүй.', 404);
    $size = (int)($file['size'] ?? 0);
    if ($size < 1 || $size > MUSIC_AUDIO_MAX_FILE) fail('Нэг аудио файл 128 МБ хүртэл байна.', 413);
    $source = folder_blob($folder, $fileId);
    $expectedDirectory = FOLDER_DIR . '/' . $folder . '/files';
    $directory = realpath($expectedDirectory);
    if (is_link(FOLDER_DIR . '/' . $folder) || is_link($expectedDirectory) || is_link($source) || $directory === false || $directory !== $expectedDirectory || realpath($source) !== $directory . '/' . $fileId . '.php') fail('Аудио файл олдсонгүй.', 404);
    $input = folder_open_blob($folder, $file);
    try {
        $sample = fread($input, min(1024 * 1024, $size));
        $detected = class_exists('finfo') ? (new finfo(FILEINFO_MIME_TYPE))->buffer($sample === false ? '' : $sample) : '';
        $mime = music_audio_mime($file['name'], $detected);
        if ($mime === '') { fclose($input); $input = null; fail('MP3, WAV, OGG, FLAC, M4A, AAC эсвэл OPUS аудио файл сонгоно уу.', 415); }
        $sourceHash = hash_init('sha256'); fseek($input, strlen(FOLDER_GUARD));
        if (hash_update_stream($sourceHash, $input, $size) !== $size) throw new RuntimeException('Cannot verify complete local audio');
        $hash = hash_final($sourceHash); $audioId = '';
        foreach ($state['audios'] as $id => $audio) {
            if (($audio['folder'] ?? '') === $folder && ($audio['sha256'] ?? '') === $hash && (int)($audio['size'] ?? 0) === $size && music_audio_record($state, $id)) { $audioId = $id; break; }
        }
        if ($audioId !== '') foreach ($playlist['tracks'] as $track) {
            if (($track['kind'] ?? '') === 'audio' && ($track['audioId'] ?? '') === $audioId) { fclose($input); $input = null; fail('Энэ дуу playlist-д аль хэдийн байна.', 409); }
        }
        $createdId = null;
        if ($audioId === '') {
            $mine = 0; $global = 0;
            foreach ($state['audios'] as $audio) { $global += (int)($audio['size'] ?? 0); if (($audio['folder'] ?? '') === $folder) $mine += (int)($audio['size'] ?? 0); }
            if ($mine + $size > MUSIC_AUDIO_OWNER_QUOTA || $global + $size > MUSIC_AUDIO_GLOBAL_QUOTA || media_used_bytes() + tmp_reserved_bytes() + folder_used_bytes() + (function_exists('doodle_used_bytes') ? doodle_used_bytes() : 0) + $size + strlen(FOLDER_GUARD) + 16384 > quota_bytes()) { fclose($input); $input = null; fail('Music хадгалах багтаамж хүрэлцэхгүй байна.', 507); }
            folder_check_disk($size + strlen(FOLDER_GUARD) + 16384);
            $audioId = bin2hex(random_bytes(16)); $path = music_audio_path($audioId); $output = @fopen($path, 'xb');
            if (!$output) throw new RuntimeException('Cannot create private audio');
            try {
                if (fwrite($output, FOLDER_GUARD) !== strlen(FOLDER_GUARD)) throw new RuntimeException('Cannot protect private audio');
                fseek($input, strlen(FOLDER_GUARD));
                if (stream_copy_to_stream($input, $output, $size) !== $size || !fflush($output)) throw new RuntimeException('Cannot copy complete local audio');
            } catch (Throwable $error) { fclose($output); @unlink($path); throw $error; }
            fclose($output); @chmod($path, 0640); $createdId = $audioId;
            $state['audios'][$audioId] = array('id' => $audioId, 'folder' => $folder, 'name' => folder_filename($file['name']), 'mime' => $mime, 'size' => $size, 'sha256' => $hash, 'sourceFileId' => $fileId, 'created' => date('c'));
        }
        $title = clean_str($body['title'] ?? pathinfo($file['name'], PATHINFO_FILENAME), 180);
        if ($title === '') $title = 'Дуу';
        $playlist['tracks'][] = array('id' => bin2hex(random_bytes(16)), 'kind' => 'audio', 'audioId' => $audioId, 'title' => $title, 'artist' => clean_str($body['artist'] ?? '', 120), 'customLabel' => true, 'added' => date('c'));
        return $createdId;
    } finally { if (is_resource($input)) fclose($input); }
}

/** Public playback is authorized by an active shared playlist; raw folders stay private. */
function music_audio_stream($id)
{
    $lock = folder_storage_lock(false); $fp = null;
    try {
        $state = music_state(); $id = music_identifier($id); $audio = music_audio_record($state, $id); $published = false;
        if ($audio) foreach ($state['playlists'] as $playlist) {
            if (!empty($playlist['deleted'])) continue;
            foreach ($playlist['tracks'] as $track) if (($track['kind'] ?? '') === 'audio' && ($track['audioId'] ?? '') === $id) { $published = true; break 2; }
        }
        if (!$published) fail('Нийтэд хуваалцсан аудио олдсонгүй.', 404);
        $fp = @fopen(music_audio_path($id), 'rb');
        if (!$fp || fread($fp, strlen(FOLDER_GUARD)) !== FOLDER_GUARD) { if ($fp) fclose($fp); fail('Аудио файл олдсонгүй.', 404); }
        $stat = fstat($fp); if (!$stat || (int)$stat['size'] !== (int)$audio['size'] + strlen(FOLDER_GUARD)) { fclose($fp); throw new RuntimeException('Audio blob length differs from index'); }
    } finally { folder_storage_unlock($lock); }
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    // Reuse the folder streamer's strict single-range and HEAD implementation.
    $file = array('size' => (int)$audio['size'], 'mime' => $audio['mime'], 'name' => $audio['name'], 'preview' => 'audio');
    folder_stream_file('', $file, $fp);
}

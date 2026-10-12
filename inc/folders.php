<?php
/* Personal class folders. No folder credential or physical storage path is public. */
if (!defined('C122')) { http_response_code(404); exit; }

define('FOLDER_DIR', DB_DIR . '/folders');
define('FOLDER_CONFIG', FOLDER_DIR . '/credentials.php');
define('FOLDER_STATE', FOLDER_DIR . '/index.php');
define('FOLDER_GUARD', "<?php http_response_code(404); exit; __halt_compiler();\n");
define('FOLDER_MAX_FILE', 512 * 1024 * 1024);
define('FOLDER_QUOTA', 10 * 1024 * 1024 * 1024);
define('FOLDER_GLOBAL_QUOTA', 100 * 1024 * 1024 * 1024);
define('FOLDER_DISK_MARGIN', 64 * 1024 * 1024);
define('FOLDER_TTL', 12 * 3600);

function folder_seed()
{
    // Independently salted password hashes; the original four-digit PINs are never stored.
    $rows = array(
        array('Амгаланзаяа', '$2y$10$NwshEAtvQgWlOE0Pge4v3ON7LJA7gJjiQnAvD7xI4aMGtuGlTpaX.'),
        array('Анар-Эрдэнэ', '$2y$10$8mmPNZFfAMJlG7IQaQVmlejJDRJF2C3KgkJq4BxVXLkKOQ7PaoXG6'),
        array('Азжаргал', '$2y$10$rT30ueo0foNSmrOTbdWTpOxw.AY9dcXsa0DA9XJZobsPex9Hg18Nm'),
        array('Ган-Эрдэнэ', '$2y$10$Wc9knf4DcjI7tIocBvxiY.UAFPlqBW1inapmhIbuIynUDcXS2681q'),
        array('Гэрэлтуяа', '$2y$10$A5.f5nUOyKUjlDucdTtGquqBXJkBaaJsOC2jhMI1aHXRfJ4hmfoiq'),
        array('Дөлгөөн-Од', '$2y$10$THVBn5w7GnwgrVK51J/XMew6I4C/DFPBJ8EEzko20ZFalu2r3mau6'),
        array('Дөлгөөн-Эрдэнэ', '$2y$10$nRpYe/r/28Lc/7fqcg8tcOYMM1zHyjVjfe2DU6Tw1TOhi5eJqocEa'),
        array('Мишээл', '$2y$10$KCOlqRX7bCJnI2.nCmLYyenVpJYzte/LnFNisZ8j/PA2JvH.hmN1y'),
        array('Мөнгөнзаяа', '$2y$10$z04lA0At7Za2frRpC7rd9uooPphkENyHYZa.6bg8/r1G72S9LU.zi'),
        array('Номин', '$2y$10$Nv.H1nTRE0SyDOj.1hxwreKTIrzk0S.LKrEf7rIGFcvTUy6adars6'),
        array('Эрхэс', '$2y$10$.oR6c7kM.j9WVurQtMLlMeyqpka9PBPaHsqTbR6IDytn6b4XfZo/K'),
        array('Энхжавхлан', '$2y$10$2O1Q03sRipMEqDDLZbs4i.tJCVloXAEP3lyHkxbE7YAlxMq/laIb2'),
        array('Энэрэл', '$2y$10$yCxmJnQ7UfPo1/mHsopQze/ynE2Ja6nvaN7ce1IvI7C1Kz4429QOC'),
        array('Энхсоёлоо', '$2y$10$lVKcYhzNNSzCBncEqzEqsOK4OLYho0WdNbcIqjbPg5APghuOQafw2'),
        array('Төгсбүрд', '$2y$10$kzZ4xOM0s6YE9CFOrBiPNOnmVXeiJLXdAdPLXqZ3RmiHRRXZWttVS'),
        array('Содцэцэг', '$2y$10$3ZxqK9SIhu/vyPmZcK573OeF0uitXJmL.GYJj8NpLKg33j/r.0dVm'),
        array('Ерөөлт', '$2y$10$/GO747MUOgASpc9bQZibtu0aaEkx/fcM9yj0A2k33eWkTN2Zl5awe'),
        array('Маргад-Эрдэнэ', '$2y$10$6TqrMnI6VWO5kOcXbornm.Vtm8DvZxJRYx8pygnq.fX5L8lN/b0kO'),
    );
    $out = array();
    foreach ($rows as $n => $row) $out[sprintf('student-%02d', $n + 1)] = array('name' => $row[0], 'hash' => $row[1], 'version' => 1);
    return $out;
}

/** All sensitive files, including atomic temporary files, remain executable 404 stubs on nginx. */
function folder_write_private($path, $data)
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false) return false;
    $tmp = $path . '.' . bin2hex(random_bytes(8)) . '.tmp.php';
    if (@file_put_contents($tmp, FOLDER_GUARD . $json . "\n", LOCK_EX) === false) { @unlink($tmp); return false; }
    @chmod($tmp, 0640);
    if (!@rename($tmp, $path)) { @unlink($tmp); return false; }
    return true;
}

function folder_storage_lock($exclusive = true)
{
    if (!is_dir(FOLDER_DIR) && !@mkdir(FOLDER_DIR, 0750, true) && !is_dir(FOLDER_DIR)) throw new RuntimeException('Cannot create private folder storage');
    $fp = @fopen(FOLDER_DIR . '/.storage-lock.php', 'c');
    if (!$fp || !flock($fp, $exclusive ? LOCK_EX : LOCK_SH)) throw new RuntimeException('Cannot lock private folder storage');
    return $fp;
}

function folder_storage_unlock($fp)
{
    if ($fp) { flock($fp, LOCK_UN); fclose($fp); }
}

function folder_prepare()
{
    static $ready = false;
    if ($ready) return;
    $lk = folder_storage_lock();
    try {
        if (!is_file(FOLDER_DIR . '/.htaccess') && @file_put_contents(FOLDER_DIR . '/.htaccess', "Options -Indexes\nRequire all denied\nDeny from all\n") === false) throw new RuntimeException('Cannot protect folder directory');
        if (!is_file(FOLDER_CONFIG) && !folder_write_private(FOLDER_CONFIG, folder_seed())) throw new RuntimeException('Cannot initialize folder credentials');
        $cfg = read_guarded(FOLDER_CONFIG);
        if (!is_array($cfg) || count($cfg) !== 18) throw new RuntimeException('Invalid folder credential configuration');
        if (!is_file(FOLDER_STATE) && !folder_write_private(FOLDER_STATE, array('version' => 1, 'folders' => array()))) throw new RuntimeException('Cannot initialize folder index');
        foreach (array_keys($cfg) as $id) {
            if (!preg_match('/^student-(0[1-9]|1[0-8])$/', $id)) throw new RuntimeException('Invalid folder ID in configuration');
            foreach (array(FOLDER_DIR . '/' . $id, FOLDER_DIR . '/' . $id . '/files', FOLDER_DIR . '/' . $id . '/uploads') as $dir) {
                if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException('Cannot create child folder directory');
            }
        }
        $ready = true;
    } finally { folder_storage_unlock($lk); }
}

function folder_config()
{
    static $cfg = null;
    if ($cfg === null) { folder_prepare(); $cfg = read_guarded(FOLDER_CONFIG); }
    return $cfg;
}

function folder_id($value)
{
    if (!is_string($value) || !preg_match('/^student-(0[1-9]|1[0-8])$/D', $value) || !isset(folder_config()[$value])) fail('Хавтас олдсонгүй', 404);
    return $value;
}

function folder_object($id)
{
    $cfg = folder_config();
    $state = folder_state(); $bucket = $state['folders'][$id] ?? array();
    return array('id' => $id, 'name' => $cfg[$id]['name'], 'description' => (string)($bucket['description'] ?? ''), 'icon' => (string)($bucket['icon'] ?? '📁'));
}

function folder_chunk_bytes()
{
    $cap = 4 * 1024 * 1024;
    $post = ini_bytes(ini_get('post_max_size'));
    if ($post > 0) $cap = min($cap, max(1, $post - min(64 * 1024, (int)($post / 10))));
    return $cap;
}

function folder_limits()
{
    return array('maxFileBytes' => FOLDER_MAX_FILE, 'chunkBytes' => folder_chunk_bytes(), 'maxEditBytes' => 32 * 1024 * 1024);
}

function folder_cookie_name($id)
{
    return 'c122_folder_' . str_replace('-', '_', $id);
}

function folder_unlocked($id)
{
    $token = cookie_val(folder_cookie_name($id));
    if ($token === '' || strlen($token) > 1024 || strpos($token, '.') === false) return false;
    $sec = site_secret();
    if ($sec === '') return false;
    list($payload, $sig) = explode('.', $token, 2);
    $want = b64u_enc(hash_hmac('sha256', 'folder|' . $payload, $sec, true));
    if (!hash_equals($want, $sig)) return false;
    $p = json_decode(b64u_dec($payload), true);
    $cfg = folder_config();
    return is_array($p) && ($p['f'] ?? '') === $id && (int)($p['v'] ?? 0) === (int)$cfg[$id]['version'] && (int)($p['exp'] ?? 0) > time();
}

function folder_login($id)
{
    $sec = site_secret();
    if ($sec === '') throw new RuntimeException('Cannot initialize folder signing key');
    $cfg = folder_config();
    $payload = b64u_enc(json_encode(array('f' => $id, 'v' => (int)$cfg[$id]['version'], 'exp' => time() + FOLDER_TTL, 'n' => bin2hex(random_bytes(12)))));
    set_cookie_value(folder_cookie_name($id), $payload . '.' . b64u_enc(hash_hmac('sha256', 'folder|' . $payload, $sec, true)), 0);
}

function folder_csrf($id)
{
    return b64u_enc(hash_hmac('sha256', 'folder-csrf|' . $id . '|' . cookie_val(folder_cookie_name($id)), site_secret(), true));
}

function folder_require_access($id, $mutate = false)
{
    if (!folder_unlocked($id)) fail('Хавтасны 4 оронтой нууц үгээ оруулна уу', 401, array('locked' => true));
    if ($mutate) {
        $token = isset($_SERVER['HTTP_X_FOLDER_CSRF']) ? (string)$_SERVER['HTTP_X_FOLDER_CSRF'] : '';
        if ($token === '' || !hash_equals(folder_csrf($id), $token)) fail('Хүсэлт хүчингүй байна. Хавтсаа дахин нээнэ үү.', 403, array('csrfInvalid' => true));
    }
}

function folder_ip_key()
{
    // Four-digit credentials group IPv6 addresses by /48, like the existing album PIN limiter.
    return 'folders|' . substr(throttle_key('pin'), 4);
}

function folder_pin_wait($id)
{
    $scope = 'folder:' . $id;
    $wait = throttle_locked_for($scope);
    $state = throttle_state();
    foreach (array($scope . '|*', folder_ip_key(), 'folders|*') as $key) {
        $until = (int)($state[$key]['until'] ?? 0);
        $wait = max($wait, $until - time());
    }
    return max(0, $wait);
}

function folder_pin_fail($id)
{
    throttle_fail('folder:' . $id);
    $state = throttle_state();
    throttle_bump($state, folder_ip_key(), 12, time());
    throttle_bump($state, 'folders|*', 60, time());
    if (!write_guarded(SECURITY_FILE, $state)) throw new RuntimeException('Cannot save folder PIN rate limit');
}

function folder_state()
{
    $state = read_guarded(FOLDER_STATE);
    if (!is_array($state) || !isset($state['folders']) || !is_array($state['folders'])) throw new RuntimeException('Invalid private folder index');
    return $state;
}

function folder_bucket(&$state, $id)
{
    if (!isset($state['folders'][$id])) $state['folders'][$id] = array('files' => array(), 'uploads' => array());
    if (!isset($state['folders'][$id]['directories'])) $state['folders'][$id]['directories'] = array();
    if (!is_array($state['folders'][$id]['directories'])) throw new RuntimeException('Invalid folder directories');
    if (!isset($state['folders'][$id]['files']) || !is_array($state['folders'][$id]['files']) || !isset($state['folders'][$id]['uploads']) || !is_array($state['folders'][$id]['uploads'])) throw new RuntimeException('Invalid child folder index');
}

function folder_save($state)
{
    if (!folder_write_private(FOLDER_STATE, $state)) throw new RuntimeException('Cannot save private folder index');
}

function folder_token_id($value)
{
    return is_string($value) && preg_match('/^[a-f0-9]{32}$/D', $value) ? $value : '';
}

function folder_blob($folder, $id, $upload = false)
{
    // Callers have already validated both identifiers. User file names never become paths.
    return FOLDER_DIR . '/' . $folder . ($upload ? '/uploads/' : '/files/') . $id . '.php';
}

function folder_filename($value)
{
    $name = clean_str($value, 180);
    $name = str_replace(array('/', '\\'), '_', $name);
    if ($name === '' || $name === '.' || $name === '..') fail('Файлын нэр буруу байна');
    return $name;
}

function folder_cleanup(&$state)
{
    $changed = false;
    foreach ($state['folders'] as $id => &$bucket) {
        foreach (($bucket['uploads'] ?? array()) as $upload => $meta) {
            if ((int)($meta['updated'] ?? 0) < time() - 86400) {
                // Expired reservations cannot accumulate indefinitely.
                if (folder_token_id($upload) !== '' && preg_match('/^student-(0[1-9]|1[0-8])$/D', $id)) @unlink(folder_blob($id, $upload, true));
                unset($bucket['uploads'][$upload]);
                $changed = true;
            }
        }
    }
    unset($bucket);
    return $changed;
}

function folder_usage($state, $id)
{
    $mine = 0; $global = 0; $remaining = 0; $uploads = 0;
    foreach ($state['folders'] as $folder => $bucket) {
        foreach (($bucket['files'] ?? array()) as $file) {
            $n = (int)$file['size']; $global += $n; if ($folder === $id) $mine += $n;
        }
        foreach (($bucket['uploads'] ?? array()) as $upload) {
            if (!empty($upload['done'])) continue;
            $n = (int)$upload['size']; $global += $n; if ($folder === $id) $mine += $n;
            $remaining += max(0, $n - (int)$upload['received']); $uploads++;
        }
    }
    return array('folder' => $mine, 'global' => $global, 'remaining' => $remaining, 'uploads' => $uploads);
}

function folder_check_disk($required)
{
    $free = @disk_free_space(FOLDER_DIR);
    if ($free !== false && $free < $required + FOLDER_DISK_MARGIN) fail('Серверийн сул зай хүрэлцэхгүй байна', 507);
}

/** Shared website quota helpers. Atomic index reads are safe without an extra lock. */
function folder_used_bytes($includeReservations = true)
{
    if (!is_file(FOLDER_STATE)) return 0;
    $state = folder_state(); $sum = 0;
    foreach ($state['folders'] as $bucket) {
        foreach (($bucket['files'] ?? array()) as $file) $sum += (int)$file['size'];
        if ($includeReservations) foreach (($bucket['uploads'] ?? array()) as $upload) {
            if (empty($upload['done']) && (int)($upload['updated'] ?? 0) >= time() - 86400) $sum += (int)$upload['size'];
        }
    }
    return $sum;
}

function folder_remaining_bytes()
{
    if (!is_file(FOLDER_STATE)) return 0;
    $state = folder_state(); $sum = 0;
    foreach ($state['folders'] as $bucket) foreach (($bucket['uploads'] ?? array()) as $upload) {
        if (empty($upload['done']) && (int)($upload['updated'] ?? 0) >= time() - 86400) $sum += max(0, (int)$upload['size'] - (int)$upload['received']);
    }
    return $sum;
}

function folder_public_file($folder, $file)
{
    $query = 'api.php?action=folder_file&folder=' . rawurlencode($folder) . '&file=' . rawurlencode($file['id']);
    return array('id' => $file['id'], 'name' => $file['name'], 'size' => (int)$file['size'], 'mime' => $file['mime'], 'preview' => $file['preview'], 'time' => $file['time'], 'url' => $query, 'downloadUrl' => $query . '&download=1', 'parent' => (string)($file['parent'] ?? ''), 'version' => folder_file_version($file));
}

function folder_detect_preview($path, $name)
{
    $fp = @fopen($path, 'rb');
    if (!$fp) throw new RuntimeException('Cannot inspect uploaded file');
    fseek($fp, strlen(FOLDER_GUARD)); $sample = fread($fp, 1024 * 1024); fclose($fp);
    $mime = 'application/octet-stream';
    if (class_exists('finfo')) { $fi = new finfo(FILEINFO_MIME_TYPE); $detected = $fi->buffer($sample); if (is_string($detected)) $mime = $detected; }
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $types = array(
        'image' => array('jpg' => array('image/jpeg'), 'jpeg' => array('image/jpeg'), 'png' => array('image/png'), 'gif' => array('image/gif'), 'webp' => array('image/webp'), 'avif' => array('image/avif')),
        'pdf' => array('pdf' => array('application/pdf')),
        'text' => array('txt' => array('text/plain'), 'log' => array('text/plain'), 'csv' => array('text/plain', 'text/csv'), 'md' => array('text/plain', 'text/markdown')),
        'audio' => array('mp3' => array('audio/mpeg'), 'wav' => array('audio/wav', 'audio/x-wav', 'audio/vnd.wave'), 'ogg' => array('audio/ogg'), 'flac' => array('audio/flac', 'audio/x-flac'), 'm4a' => array('audio/mp4', 'video/mp4')),
        'video' => array('mp4' => array('video/mp4'), 'webm' => array('video/webm'), 'ogv' => array('video/ogg'), 'mov' => array('video/quicktime')),
    );
    foreach ($types as $kind => $extensions) {
        if (isset($extensions[$ext]) && in_array($mime, $extensions[$ext], true)) {
            if ($kind === 'text') $mime = 'text/plain';
            return array($mime, $kind);
        }
    }
    return array('application/octet-stream', null);
}

function folder_disposition($name, $attachment = true)
{
    $fallback = preg_replace('/[^A-Za-z0-9._ -]/', '_', $name);
    $fallback = str_replace(array('"', '\\'), '_', $fallback);
    if ($fallback === '') $fallback = 'file';
    return ($attachment ? 'attachment' : 'inline') . '; filename="' . $fallback . '"; filename*=UTF-8\'\'' . rawurlencode($name);
}

function folder_stream_headers($mime, $name, $download)
{
    header('Content-Type: ' . $mime);
    header('Content-Disposition: ' . folder_disposition($name, $download));
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header('Content-Security-Policy: sandbox; default-src \'none\'; script-src \'none\'');
    header('X-Frame-Options: SAMEORIGIN');
    header('Cross-Origin-Resource-Policy: same-origin');
    header('Vary: Cookie');
}

function folder_open_blob($folder, $file)
{
    $fp = @fopen(folder_blob($folder, $file['id']), 'rb');
    if (!$fp || fread($fp, strlen(FOLDER_GUARD)) !== FOLDER_GUARD) { if ($fp) fclose($fp); fail('Файл олдсонгүй', 404); }
    $stat = fstat($fp);
    if (!$stat || (int)$stat['size'] !== (int)$file['size'] + strlen(FOLDER_GUARD)) { fclose($fp); throw new RuntimeException('Private blob length differs from index'); }
    return $fp;
}

function folder_stream_file($folder, $file, $fp)
{
    $size = (int)$file['size']; $start = 0; $end = $size > 0 ? $size - 1 : -1; $partial = false;
    $range = isset($_SERVER['HTTP_RANGE']) ? trim((string)$_SERVER['HTTP_RANGE']) : '';
    if ($range !== '') {
        if ($size === 0 || !preg_match('/^bytes=(\d*)-(\d*)$/D', $range, $matches) || ($matches[1] === '' && $matches[2] === '')) {
            fclose($fp); header('Content-Range: bytes */' . $size); fail('Файлын хэсгийн хүсэлт буруу байна', 416);
        }
        if ($matches[1] === '') { $length = (int)$matches[2]; if ($length <= 0) { fclose($fp); header('Content-Range: bytes */' . $size); fail('Файлын хэсэг олдсонгүй', 416); } $start = max(0, $size - $length); }
        else { $start = (int)$matches[1]; if ($matches[2] !== '') $end = min($size - 1, (int)$matches[2]); }
        if ($start >= $size || $start > $end) { fclose($fp); header('Content-Range: bytes */' . $size); fail('Файлын хэсэг олдсонгүй', 416); }
        $partial = true;
    }
    $download = isset($_GET['download']) && $_GET['download'] === '1';
    if ($file['preview'] === null) $download = true;
    folder_stream_headers($file['mime'], $file['name'], $download);
    header('Accept-Ranges: bytes');
    $length = max(0, $end - $start + 1);
    header('Content-Length: ' . $length);
    if ($partial) { http_response_code(206); header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size); }
    if ($_SERVER['REQUEST_METHOD'] === 'HEAD') { fclose($fp); exit; }
    @set_time_limit(0); @ini_set('zlib.output_compression', '0');
    fseek($fp, strlen(FOLDER_GUARD) + $start);
    while ($length > 0 && !feof($fp)) { $chunk = fread($fp, min(256 * 1024, $length)); if ($chunk === false || $chunk === '') break; echo $chunk; $length -= strlen($chunk); if (connection_aborted()) break; }
    fclose($fp); exit;
}

/** Stream a standards-compliant, uncompressed ZIP without ZipArchive or temporary public files. */
function folder_stream_zip($folder, $files, $handles, $archiveName = null)
{
    $entries = array(); $seen = array(); $length = 22;
    foreach ($files as $i => $file) {
        $base = $file['name']; $name = $base; $n = 1;
        while (isset($seen[$name])) { $n++; $ext = pathinfo($base, PATHINFO_EXTENSION); $stem = $ext !== '' ? substr($base, 0, -strlen($ext) - 1) : $base; $name = $stem . ' (' . $n . ')' . ($ext !== '' ? '.' . $ext : ''); }
        $seen[$name] = true;
        $length += 30 + strlen($name) + (int)$file['size'] + 16 + 46 + strlen($name);
        $entries[] = array('name' => $name, 'size' => (int)$file['size'], 'handle' => $handles[$i], 'time' => strtotime($file['time']));
    }
    // ZIP32 offsets and sizes are unsigned 32-bit. Reject before sending any archive bytes.
    if ($length >= 0xFFFFFFFF) { foreach ($handles as $fp) fclose($fp); fail('Сонгосон файлуудын хэмжээ 4 ГБ-аас бага байх ёстой', 413); }
    folder_stream_headers('application/zip', ($archiveName === null ? folder_object($folder)['name'] : $archiveName) . '.zip', true);
    header('Content-Length: ' . $length);
    if ($_SERVER['REQUEST_METHOD'] === 'HEAD') { foreach ($handles as $fp) fclose($fp); exit; }
    @set_time_limit(0); @ini_set('zlib.output_compression', '0');
    $central = ''; $offset = 0;
    foreach ($entries as $entry) {
        $date = getdate($entry['time'] ?: time());
        $dosTime = ($date['hours'] << 11) | ($date['minutes'] << 5) | intdiv($date['seconds'], 2);
        $dosDate = ((max(1980, min(2107, $date['year'])) - 1980) << 9) | ($date['mon'] << 5) | $date['mday'];
        $name = $entry['name']; $size = $entry['size'];
        // UTF-8 + data-descriptor flags; compression method 0 (stored).
        echo pack('VvvvvvVVVvv', 0x04034b50, 20, 0x0808, 0, $dosTime, $dosDate, 0, 0, 0, strlen($name), 0) . $name;
        $crc = hash_init('crc32b'); $remaining = $size; $fp = $entry['handle'];
        while ($remaining > 0) { $chunk = fread($fp, min(256 * 1024, $remaining)); if ($chunk === false || $chunk === '') throw new RuntimeException('Cannot read ZIP source file'); hash_update($crc, $chunk); echo $chunk; $remaining -= strlen($chunk); }
        fclose($fp);
        $checksum = (int)hexdec(hash_final($crc));
        echo pack('VVVV', 0x08074b50, $checksum, $size, $size);
        $central .= pack('VvvvvvvVVVvvvvvVV', 0x02014b50, 20, 20, 0x0808, 0, $dosTime, $dosDate, $checksum, $size, $size, strlen($name), 0, 0, 0, 0, 0, $offset) . $name;
        $offset += 30 + strlen($name) + $size + 16;
    }
    echo $central . pack('VvvvvVVv', 0x06054b50, 0, 0, count($entries), count($entries), strlen($central), $offset, 0);
    exit;
}

function handle_folder_action($action)
{
    if (handle_folder_workspace_action($action)) return true;
    $sharedUpload = in_array($action, array('share_upload_init', 'share_upload_chunk', 'share_upload_finish', 'share_upload_cancel'), true);
    if ($sharedUpload) $action = str_replace('share_upload_', 'folder_upload_', $action);
    $actions = array('folders', 'folder_unlock', 'folder_files', 'folder_lock', 'folder_upload_init', 'folder_upload_chunk', 'folder_upload_finish', 'folder_upload_cancel', 'folder_delete', 'folder_file', 'folder_download');
    if (!in_array($action, $actions, true)) return false;
    folder_prepare();
    if ($action === 'folders') {
        if (!in_array($_SERVER['REQUEST_METHOD'], array('GET', 'HEAD'), true)) fail('GET хүсэлт шаардлагатай', 405);
        $folders = array();
        foreach (folder_config() as $id => $cfg) $folders[] = array_merge(folder_object($id), array('unlocked' => folder_unlocked($id)));
        json_out(array('ok' => true, 'folders' => $folders, 'limits' => folder_limits()));
    }
    $read = in_array($action, array('folder_files', 'folder_file', 'folder_download'), true);
    if ($read && !in_array($_SERVER['REQUEST_METHOD'], array('GET', 'HEAD'), true)) fail('GET хүсэлт шаардлагатай', 405);
    if (!$read) require_post();
    $body = (!$read && $action !== 'folder_upload_chunk') ? body_json() : array();
    $shareToken = '';
    if ($sharedUpload) {
        $shareToken = folder_share_upload_token($action === 'folder_upload_chunk' ? $_GET : $body);
        $shareLock = folder_storage_lock(false);
        try { $shareState = folder_state(); $uploadShare = folder_share_lookup($shareState, $shareToken); $id = $uploadShare['folder']; folder_share_require_upload($uploadShare); } finally { folder_storage_unlock($shareLock); }
    } else $id = folder_id($read || $action === 'folder_upload_chunk' ? ($_GET['folder'] ?? '') : ($body['folder'] ?? ''));

    if ($action === 'folder_unlock') {
        $pin = isset($body['pin']) && is_string($body['pin']) ? $body['pin'] : '';
        $lock = login_lock();
        if (!$lock) throw new RuntimeException('Cannot lock folder PIN verification');
        $wait = folder_pin_wait($id);
        if ($wait > 0) { login_unlock($lock); fail('Хэт олон удаа буруу оруулсан байна. ' . ceil($wait / 60) . ' минутын дараа дахин оролдоно уу.', 429, array('retryAfter' => $wait)); }
        $cfg = folder_config();
        $valid = preg_match('/^[0-9]{4}$/D', $pin) && password_verify($pin, $cfg[$id]['hash']);
        if (!$valid) { folder_pin_fail($id); login_unlock($lock); usleep(150000); fail('Нууц үг буруу байна', 400, array('wrongPin' => true)); }
        throttle_clear('folder:' . $id); login_unlock($lock);
        folder_login($id);
        json_out(array('ok' => true, 'csrf' => folder_csrf($id), 'folder' => folder_object($id), 'limits' => folder_limits()));
    }

    if (!$sharedUpload) folder_require_access($id, !$read);
    if ($action === 'folder_lock') { set_cookie_value(folder_cookie_name($id), '', time() - 3600); json_out(array('ok' => true)); }

    if ($read) {
        $lock = folder_storage_lock(false);
        $state = folder_state(); folder_bucket($state, $id); $bucket = $state['folders'][$id];
        if ($action === 'folder_files') {
            $parent = folder_parent($bucket, $_GET['parent'] ?? '');
            $files = array(); foreach ($bucket['files'] as $file) if (($file['parent'] ?? '') === $parent) $files[] = folder_public_file($id, $file);
            $directories = folder_child_directories($bucket, $parent);
            $breadcrumbs = folder_breadcrumbs($bucket, $parent, folder_object($id)['name']);
            $currentDirectory = $parent === '' ? null : folder_directory_object($bucket['directories'][$parent]);
            usort($files, function ($a, $b) { return strcmp($b['time'], $a['time']) ?: strcmp($a['name'], $b['name']); });
            folder_storage_unlock($lock);
            json_out(array('ok' => true, 'csrf' => folder_csrf($id), 'folder' => folder_object($id), 'files' => $files, 'directories' => $directories, 'breadcrumbs' => $breadcrumbs, 'parent' => $parent, 'readonly' => false, 'currentDirectory' => $currentDirectory, 'limits' => folder_limits()));
        }
        if ($action === 'folder_file') {
            $fileId = folder_token_id($_GET['file'] ?? '');
            if ($fileId === '' || !isset($bucket['files'][$fileId])) { folder_storage_unlock($lock); fail('Файл олдсонгүй', 404); }
            $file = $bucket['files'][$fileId]; $fp = folder_open_blob($id, $file); folder_storage_unlock($lock);
            folder_stream_file($id, $file, $fp);
        }
        $rawIds = isset($_GET['files']) && is_string($_GET['files']) ? $_GET['files'] : '';
        $ids = array_values(array_unique(explode(',', $rawIds)));
        if (!$rawIds || count($ids) > 200) { folder_storage_unlock($lock); fail('1–200 файл сонгоно уу'); }
        $files = array(); $handles = array();
        foreach ($ids as $fileId) {
            if (folder_token_id($fileId) === '' || !isset($bucket['files'][$fileId])) { foreach ($handles as $fp) fclose($fp); folder_storage_unlock($lock); fail('Сонгосон файл олдсонгүй', 404); }
            $file = $bucket['files'][$fileId]; $files[] = $file; $handles[] = folder_open_blob($id, $file);
        }
        folder_storage_unlock($lock); folder_stream_zip($id, $files, $handles);
    }

    $lock = folder_storage_lock();
    try {
        $state = folder_state(); folder_bucket($state, $id);
        if (folder_cleanup($state)) folder_save($state);
        $bucket =& $state['folders'][$id];
        if ($sharedUpload) {
            $uploadShare = folder_share_lookup($state, $shareToken); folder_share_require_upload($uploadShare);
            if ($uploadShare['folder'] !== $id) fail('Хуваалцах холбоос хүчингүй байна', 404);
            if ($action === 'folder_upload_init') {
                $actualParent = ($body['parent'] ?? '') === '' ? $uploadShare['directory'] : folder_parent($bucket, $body['parent']);
                if (!folder_in_subtree($bucket, $actualParent, $uploadShare['directory'])) fail('Дэд хавтас олдсонгүй', 404);
                $body['parent'] = $actualParent;
            } else {
                $shareUploadId = folder_token_id($action === 'folder_upload_chunk' ? ($_GET['upload'] ?? '') : ($body['upload'] ?? ''));
                $shareMeta = $bucket['uploads'][$shareUploadId] ?? null;
                if (!$shareMeta || ($shareMeta['share'] ?? '') !== hash('sha256', $shareToken) || !folder_in_subtree($bucket, $shareMeta['parent'] ?? '', $uploadShare['directory'])) fail('Байршуулалт олдсонгүй', 404);
                if (!empty($shareMeta['done']) && !folder_share_contains($bucket, $uploadShare, $shareMeta['done'])) fail('Байршуулалт олдсонгүй', 404);
            }
        }
        if ($action === 'folder_upload_init') {
            $parent = folder_parent($bucket, $body['parent'] ?? '');
            $name = folder_filename($body['name'] ?? '');
            $size = $body['size'] ?? null;
            if (!is_int($size) || $size < 0 || $size > FOLDER_MAX_FILE) fail('Файлын хэмжээ 512 МБ-аас бага байх ёстой', 413);
            $usage = folder_usage($state, $id);
            $myUploads = 0; foreach ($bucket['uploads'] as $up) if (empty($up['done'])) $myUploads++;
            if ($myUploads >= 8 || $usage['uploads'] >= 64) fail('Олон файл зэрэг байршуулж байна. Одоогийн байршуулалтаа дуусгана уу.', 429);
            if (count($bucket['files']) + $myUploads >= 5000) fail('Хавтасны файлын тооны хязгаарт хүрсэн байна', 507);
            if ($usage['folder'] + $size > FOLDER_QUOTA || $usage['global'] + $size > FOLDER_GLOBAL_QUOTA || media_used_bytes() + tmp_reserved_bytes() + $usage['global'] + (function_exists('doodle_used_bytes') ? doodle_used_bytes() : 0) + $size > quota_bytes()) fail('Хавтасны хадгалах багтаамж хүрэлцэхгүй байна', 507);
            folder_check_disk($usage['remaining'] + $size + 1024 * 1024);
            $upload = bin2hex(random_bytes(16)); $path = folder_blob($id, $upload, true);
            $fp = @fopen($path, 'x+b');
            if (!$fp) throw new RuntimeException('Cannot create private upload');
            if (fwrite($fp, FOLDER_GUARD) !== strlen(FOLDER_GUARD)) { fclose($fp); @unlink($path); throw new RuntimeException('Cannot initialize private upload'); }
            fclose($fp); @chmod($path, 0640);
            $bucket['uploads'][$upload] = array('name' => $name, 'parent' => $parent, 'size' => $size, 'received' => 0, 'updated' => time());
            if ($sharedUpload) $bucket['uploads'][$upload]['share'] = hash('sha256', $shareToken);
            try { folder_save($state); } catch (Throwable $e) { @unlink($path); throw $e; }
            folder_storage_unlock($lock); $lock = null;
            json_out(array('ok' => true, 'upload' => $upload, 'chunkBytes' => folder_chunk_bytes()));
        }
        if ($action === 'folder_delete') {
            $ids = isset($body['ids']) && is_array($body['ids']) ? array_values(array_unique($body['ids'], SORT_REGULAR)) : array();
            if (count($ids) < 1 || count($ids) > 200) fail('1–200 файл сонгоно уу');
            foreach ($ids as $fileId) if (folder_token_id($fileId) === '' || !isset($bucket['files'][$fileId])) fail('Сонгосон файл олдсонгүй', 404);
            foreach ($ids as $fileId) unset($bucket['files'][$fileId]);
            foreach ($bucket['uploads'] as $upload => $meta) if (isset($meta['done']) && in_array($meta['done'], $ids, true)) unset($bucket['uploads'][$upload]);
            folder_save($state);
            foreach ($ids as $fileId) @unlink(folder_blob($id, $fileId));
            folder_storage_unlock($lock); $lock = null; json_out(array('ok' => true, 'deleted' => $ids));
        }
        $upload = folder_token_id($action === 'folder_upload_chunk' ? ($_GET['upload'] ?? '') : ($body['upload'] ?? ''));
        if ($upload === '' || !isset($bucket['uploads'][$upload])) fail('Байршуулалт олдсонгүй эсвэл хугацаа нь дууссан байна', 404);
        $meta =& $bucket['uploads'][$upload];
        $path = folder_blob($id, $upload, true);
        if ($action === 'folder_upload_cancel') {
            if (empty($meta['done'])) { unset($bucket['uploads'][$upload]); folder_save($state); @unlink($path); }
            folder_storage_unlock($lock); $lock = null; json_out(array('ok' => true));
        }
        if (!empty($meta['done'])) {
            if (!isset($bucket['files'][$meta['done']])) fail('Файл олдсонгүй', 404);
            $file = $bucket['files'][$meta['done']];
            folder_storage_unlock($lock); $lock = null;
            if ($action === 'folder_upload_finish') json_out(array('ok' => true, 'file' => ($sharedUpload ? folder_share_public_file($shareToken, $file) : folder_public_file($id, $file))));
            json_out(array('ok' => true, 'received' => (int)$file['size']));
        }
        if (!is_file($path)) throw new RuntimeException('Private upload data missing');
        if ($action === 'folder_upload_chunk') {
            $rawOffset = $_GET['offset'] ?? '';
            if (!is_string($rawOffset) || !preg_match('/^[0-9]{1,12}$/D', $rawOffset)) fail('Байршуулалтын хэсгийн байрлал буруу байна');
            $offset = (int)$rawOffset; $len = content_length();
            if ($len < 0) fail('Content-Length шаардлагатай', 411);
            if ($len < 1 || $len > folder_chunk_bytes() || $offset + $len > (int)$meta['size']) fail('Байршуулалтын хэсгийн хэмжээ буруу байна', 413);
            if ($offset > (int)$meta['received']) fail('Байршуулалтын хэсгийн дараалал буруу байна', 409, array('received' => (int)$meta['received']));
            $data = file_get_contents('php://input', false, null, 0, folder_chunk_bytes() + 1);
            if ($data === false || strlen($data) !== $len) fail('Байршуулалтын хэсэг бүрэн ирсэнгүй', 400);
            $fp = @fopen($path, 'r+b');
            if (!$fp || fread($fp, strlen(FOLDER_GUARD)) !== FOLDER_GUARD) { if ($fp) fclose($fp); throw new RuntimeException('Cannot open private upload'); }
            if ($offset < (int)$meta['received']) {
                if ($offset + $len > (int)$meta['received']) { fclose($fp); fail('Байршуулалтын хэсгийн дараалал буруу байна', 409, array('received' => (int)$meta['received'])); }
                fseek($fp, strlen(FOLDER_GUARD) + $offset); $prior = fread($fp, $len); fclose($fp);
                if ($prior !== $data) fail('Давтан ирсэн хэсгийн өгөгдөл зөрүүтэй байна', 409);
            } else {
                folder_check_disk($len + 1024 * 1024);
                fseek($fp, strlen(FOLDER_GUARD) + $offset);
                $written = 0;
                while ($written < $len) { $count = fwrite($fp, substr($data, $written)); if ($count === false || $count === 0) break; $written += $count; }
                if ($written !== $len || !fflush($fp)) { ftruncate($fp, strlen(FOLDER_GUARD) + $offset); fclose($fp); throw new RuntimeException('Cannot write complete upload chunk'); }
                $meta['received'] = $offset + $len; $meta['updated'] = time();
                try { folder_save($state); } catch (Throwable $e) { ftruncate($fp, strlen(FOLDER_GUARD) + $offset); fclose($fp); throw $e; }
                fclose($fp);
            }
            $received = (int)$meta['received']; folder_storage_unlock($lock); $lock = null; json_out(array('ok' => true, 'received' => $received));
        }
        if ((int)$meta['received'] !== (int)$meta['size']) fail('Файл бүрэн байршуулагдаагүй байна', 409, array('received' => (int)$meta['received']));
        $actual = @filesize($path);
        if ($actual !== (int)$meta['size'] + strlen(FOLDER_GUARD)) throw new RuntimeException('Upload length differs from reservation');
        list($mime, $preview) = folder_detect_preview($path, $meta['name']);
        $parent = folder_parent($bucket, $meta['parent'] ?? '');
        $fileId = bin2hex(random_bytes(16)); $destination = folder_blob($id, $fileId);
        $file = array('id' => $fileId, 'name' => $meta['name'], 'size' => (int)$meta['size'], 'mime' => $mime, 'preview' => $preview, 'time' => date('c'), 'parent' => $parent, 'version' => bin2hex(random_bytes(16)));
        if (!@rename($path, $destination)) throw new RuntimeException('Cannot finish private upload');
        $bucket['files'][$fileId] = $file; $meta['done'] = $fileId; $meta['updated'] = time();
        try { folder_save($state); } catch (Throwable $e) { @rename($destination, $path); throw $e; }
        folder_storage_unlock($lock); $lock = null; json_out(array('ok' => true, 'file' => ($sharedUpload ? folder_share_public_file($shareToken, $file) : folder_public_file($id, $file))));
    } finally { folder_storage_unlock($lock); }
}

require __DIR__ . '/folder-workspace.php';

<?php
/* User-started Photobooth exports; public tokens grant access to one capture only. */
if (!defined('C122')) { http_response_code(404); exit; }

define('PHOTOBOOTH_STATE', DB_DIR . '/photobooth.php');
define('PHOTOBOOTH_MAX_STATE', 16 * 1024 * 1024);
define('PHOTOBOOTH_MAX_PHOTO', 12 * 1024 * 1024);
define('PHOTOBOOTH_MAX_MOTION', 20 * 1024 * 1024);

function photobooth_error($message, $status = 400)
{
    throw new RuntimeException($message, $status);
}

function photobooth_state()
{
    if (!is_file(PHOTOBOOTH_STATE)) return array('version' => 1, 'items' => array(), 'shares' => array());
    if ((int)@filesize(PHOTOBOOTH_STATE) > PHOTOBOOTH_MAX_STATE) photobooth_error('Photobooth хадгалалт түр боломжгүй байна.', 503);
    $state = read_guarded(PHOTOBOOTH_STATE);
    if (!is_array($state) || !isset($state['items'], $state['shares']) || !is_array($state['items']) || !is_array($state['shares'])) photobooth_error('Photobooth хадгалалтыг уншиж чадсангүй.', 503);
    return $state;
}

function photobooth_write_state($state)
{
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false || strlen($json) > PHOTOBOOTH_MAX_STATE || count($state['items']) > 10000) photobooth_error('Photobooth хадгалах хэмжээ дүүрсэн байна.', 507);
    if (!folder_write_private(PHOTOBOOTH_STATE, $state)) photobooth_error('Photobooth мэдээллийг хадгалж чадсангүй.', 500);
}

function photobooth_limits()
{
    $photo = PHOTOBOOTH_MAX_PHOTO; $motion = PHOTOBOOTH_MAX_MOTION;
    $upload = ini_bytes(ini_get('upload_max_filesize')); $post = ini_bytes(ini_get('post_max_size'));
    $total = $photo + $motion;
    if ($upload > 0) { $photo = min($photo, $upload); $motion = min($motion, $upload); }
    if ($post > 0) $total = min($total, max(0, $post - 64 * 1024));
    return array('maxPhotoBytes' => min($photo, $total), 'maxMotionBytes' => min($motion, $total), 'maxTotalBytes' => $total);
}

function photobooth_upload($field, $required, $limit)
{
    $file = $_FILES[$field] ?? null;
    if ($file === null || (is_array($file) && ($file['error'] ?? null) === UPLOAD_ERR_NO_FILE)) {
        if ($required) photobooth_error('Зургаа сонгоно уу. Файл серверийн upload хязгаараас их байж болзошгүй.', 400);
        return null;
    }
    if (!is_array($file) || !is_string($file['tmp_name'] ?? null) || !is_int($file['error'] ?? null)) photobooth_error('Файлын хүсэлт буруу байна.');
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) photobooth_error('Файл серверийн upload хэмжээнээс их байна.', 413);
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) photobooth_error('Файл бүрэн ирсэнгүй. Дахин хадгална уу.');
    $size = (int)@filesize($file['tmp_name']);
    if ($size < 1 || $size > $limit || $size !== (int)($file['size'] ?? -1)) photobooth_error('Файлын хэмжээ буруу эсвэл хэт том байна.', 413);
    return array('path' => $file['tmp_name'], 'size' => $size);
}

/** Verify PNG chunk boundaries and CRCs before accepting a canvas export. */
function photobooth_png_info($path)
{
    $info = @getimagesize($path);
    if (!$info || ($info[2] ?? null) !== IMAGETYPE_PNG || $info[0] < 1 || $info[1] < 1 || $info[0] > 8192 || $info[1] > 20000 || $info[0] * $info[1] > 40000000) photobooth_error('PNG зургийн формат эсвэл хэмжээ буруу байна.', 415);
    $fp = @fopen($path, 'rb'); $valid = false; $seenData = false; $first = true;
    if (!$fp || fread($fp, 8) !== "\x89PNG\r\n\x1a\n") { if ($fp) fclose($fp); photobooth_error('Зөвхөн PNG зураг хадгална.', 415); }
    try {
        $size = (int)filesize($path);
        while (!feof($fp)) {
            $head = fread($fp, 8);
            if (strlen($head) !== 8) break;
            $length = unpack('Nlength', substr($head, 0, 4))['length']; $type = substr($head, 4, 4);
            if (!preg_match('/^[A-Za-z]{4}$/D', $type) || $length > $size || ftell($fp) + $length + 4 > $size || ($first && ($type !== 'IHDR' || $length !== 13)) || (!$first && $type === 'IHDR')) break;
            $first = false; $crc = hash_init('crc32b'); hash_update($crc, $type); $remaining = $length;
            while ($remaining > 0) { $chunk = fread($fp, min(65536, $remaining)); if ($chunk === false || $chunk === '') break 2; hash_update($crc, $chunk); $remaining -= strlen($chunk); }
            if (!hash_equals(hash_final($crc, true), fread($fp, 4))) break;
            if ($type === 'IDAT') $seenData = true;
            if ($type === 'IEND') { $valid = $length === 0 && $seenData && ftell($fp) === $size; break; }
        }
    } finally { fclose($fp); }
    if (!$valid) photobooth_error('PNG зураг гэмтсэн байна. Зургаа дахин үүсгэнэ үү.', 415);
    return array('w' => (int)$info[0], 'h' => (int)$info[1]);
}

function photobooth_gif_info($path)
{
    $data = @file_get_contents($path); $size = strlen((string)$data);
    $info = @getimagesize($path);
    if (!$info || ($info[2] ?? null) !== IMAGETYPE_GIF || $info[0] < 1 || $info[1] < 1 || $info[0] > 8192 || $info[1] > 20000 || $info[0] * $info[1] > 8000000 || $size < 14 || !in_array(substr($data, 0, 6), array('GIF87a', 'GIF89a'), true)) photobooth_error('Live GIF зургийн хэмжээ эсвэл формат буруу байна.', 415);
    $offset = 13; $packed = ord($data[10]); $frames = 0; $complete = false;
    if ($packed & 128) $offset += 3 * (2 << ($packed & 7));
    $skipBlocks = function () use (&$offset, $data, $size) {
        while ($offset < $size) { $length = ord($data[$offset++]); if ($length === 0) return true; if ($offset + $length > $size) return false; $offset += $length; }
        return false;
    };
    while ($offset < $size) {
        $marker = ord($data[$offset++]);
        if ($marker === 0x3b) { $complete = $offset === $size; break; }
        if ($marker === 0x21) { if ($offset >= $size) break; $offset++; if (!$skipBlocks()) break; continue; }
        if ($marker !== 0x2c || $offset + 9 > $size) break;
        $rect = unpack('vleft/vtop/vwidth/vheight/Cflags', substr($data, $offset, 9)); $offset += 9;
        if ($rect['width'] < 1 || $rect['height'] < 1 || $rect['left'] + $rect['width'] > $info[0] || $rect['top'] + $rect['height'] > $info[1]) break;
        if ($rect['flags'] & 128) $offset += 3 * (2 << ($rect['flags'] & 7));
        if ($offset >= $size || ord($data[$offset]) < 2 || ord($data[$offset]) > 8) break;
        $offset++; if (!$skipBlocks()) break;
        if (++$frames > 160) break;
    }
    if (!$complete || $frames < 2 || $frames > 160) photobooth_error('Live GIF зураг гэмтсэн эсвэл хөдөлгөөнгүй байна.', 415);
    return array('w' => (int)$info[0], 'h' => (int)$info[1], 'frames' => $frames);
}

function photobooth_motion_type($path)
{
    $fp = @fopen($path, 'rb'); if (!$fp) photobooth_error('Live зургийг уншиж чадсангүй.');
    $head = fread($fp, 65536); fclose($fp);
    $mime = function_exists('finfo_open') ? (new finfo(FILEINFO_MIME_TYPE))->file($path) : '';
    if (in_array(substr($head, 0, 6), array('GIF87a', 'GIF89a'), true) && ($mime === '' || $mime === 'image/gif')) return array_merge(array('ext' => 'gif', 'mime' => 'image/gif'), photobooth_gif_info($path));
    if (substr($head, 0, 4) === "\x1a\x45\xdf\xa3" && strpos(substr($head, 0, 4096), 'webm') !== false && ($mime === '' || in_array($mime, array('video/webm', 'video/x-matroska', 'application/octet-stream'), true))) return array('ext' => 'webm', 'mime' => 'video/webm');
    if (strlen($head) >= 16 && substr($head, 4, 4) === 'ftyp') {
        $length = unpack('Nlength', substr($head, 0, 4))['length'];
        $brands = $length >= 16 && $length <= strlen($head) ? substr($head, 8, $length - 8) : '';
        if (preg_match('/(?:isom|iso[2-9]|mp4[12]|avc1|dash|M4V )/', $brands) && ($mime === '' || in_array($mime, array('video/mp4', 'application/octet-stream'), true))) return array('ext' => 'mp4', 'mime' => 'video/mp4');
    }
    photobooth_error('Live зураг хөдөлгөөнт GIF, WebM эсвэл MP4 байна.', 415);
}

function photobooth_token($row)
{
    if (empty($row['shareNonce'])) return '';
    $secret = site_secret(); if ($secret === '') photobooth_error('Холбоос үүсгэх хамгаалалт боломжгүй байна.', 500);
    return hash_hmac('sha256', 'photobooth|' . $row['id'] . '|' . $row['shareNonce'], $secret);
}

function photobooth_rotate_share(&$state, &$row)
{
    if (!empty($row['shareHash'])) unset($state['shares'][$row['shareHash']]);
    $row['shareNonce'] = bin2hex(random_bytes(32));
    $row['shareHash'] = hash('sha256', photobooth_token($row));
    $state['shares'][$row['shareHash']] = $row['id'];
}

function photobooth_member_item($row)
{
    $query = 'api.php?action=photobooth_asset&id=' . rawurlencode($row['id']);
    $motion = !empty($row['motion']) && valid_media_name($row['motion']) !== '';
    $token = photobooth_token($row);
    return array(
        'item' => array('id' => $row['id'], 'name' => $row['title'], 'frame' => $row['frame'], 'time' => (int)$row['created'], 'url' => $query . '&kind=photo', 'download' => $query . '&kind=photo&download=1', 'motionUrl' => $motion ? $query . '&kind=motion' : null, 'motionDownload' => $motion ? $query . '&kind=motion&download=1' : null, 'motionExt' => $motion ? strtolower(pathinfo($row['motion'], PATHINFO_EXTENSION)) : null),
        'photo' => upload_item($row['id']),
        'motion' => $motion ? media_item($row['motion']) : null,
        'share' => $token !== '' ? array('url' => 'photobooth.php?token=' . rawurlencode($token)) : null,
    );
}

function photobooth_save_capture()
{
    $limits = photobooth_limits(); $length = content_length();
    $post = ini_bytes(ini_get('post_max_size'));
    if (($post > 0 && $length > $post) || $length > PHOTOBOOTH_MAX_PHOTO + PHOTOBOOTH_MAX_MOTION + 64 * 1024) photobooth_error('Зураг ба Live файлын нийлбэр хэмжээ серверийн хязгаараас их байна.', 413);
    $photo = photobooth_upload('photo', true, $limits['maxPhotoBytes']);
    $motion = photobooth_upload('motion', false, $limits['maxMotionBytes']);
    if ($photo['size'] + ($motion ? $motion['size'] : 0) > $limits['maxTotalBytes']) photobooth_error('Зураг ба Live файлын нийлбэр хэмжээ хэт том байна.', 413);
    $info = photobooth_png_info($photo['path']);
    $motionType = $motion ? photobooth_motion_type($motion['path']) : null;
    $title = clean_str($_POST['title'] ?? 'IwnlX Photobooth', 120); if ($title === '') $title = 'IwnlX Photobooth';
    $frame = clean_str($_POST['frame'] ?? 'retro', 60);
    $lock = folder_storage_lock(); $created = array(); $committed = false;
    try {
        $state = photobooth_state();
        $required = $photo['size'] + ($motion ? $motion['size'] : 0);
        $stateBytes = is_file(PHOTOBOOTH_STATE) ? (int)filesize(PHOTOBOOTH_STATE) : 0;
        if (media_used_bytes() + tmp_reserved_bytes() + folder_used_bytes() + (function_exists('doodle_used_bytes') ? doodle_used_bytes() : 0) + $stateBytes + $required + 1024 * 1024 > quota_bytes()) photobooth_error('Сайтын хадгалах багтаамж хүрэлцэхгүй байна.', 507);
        $free = @disk_free_space(PHOTOS_DIR);
        if ($free !== false && $free < $required + folder_remaining_bytes() + 64 * 1024 * 1024) photobooth_error('Серверийн сул зай хүрэлцэхгүй байна.', 507);
        $name = make_media_name('photobooth-' . $title, 'png');
        $motionName = $motion ? make_media_name('photobooth-live-' . $title, $motionType['ext']) : null;
        $row = array('id' => $name, 'title' => $title, 'frame' => $frame, 'created' => time(), 'motion' => $motionName);
        photobooth_rotate_share($state, $row);
        if (!move_uploaded_file($photo['path'], PHOTOS_DIR . '/' . $name)) photobooth_error('Зураг хадгалж чадсангүй.', 500);
        $created[] = $name; @chmod(PHOTOS_DIR . '/' . $name, 0644);
        $side = array_merge($info, array('original' => $title . '.png', 'uploaded' => $row['created'], 'size' => $photo['size'], 'photobooth' => true, 'frame' => $frame, 'motion' => $motionName));
        if (!write_json(THUMBS_DIR . '/' . $name . '.json', $side)) photobooth_error('Зургийн мэдээлэл хадгалж чадсангүй.', 500);
        if ($motion) {
            if (!move_uploaded_file($motion['path'], PHOTOS_DIR . '/' . $motionName)) photobooth_error('Live зураг хадгалж чадсангүй.', 500);
            $created[] = $motionName; @chmod(PHOTOS_DIR . '/' . $motionName, 0644);
            $motionSide = array('original' => $title . '-live.' . $motionType['ext'], 'uploaded' => $row['created'], 'size' => $motion['size'], 'photobooth' => true, 'photo' => $name);
            foreach (array('w', 'h', 'frames') as $field) if (isset($motionType[$field])) $motionSide[$field] = $motionType[$field];
            if (!write_json(THUMBS_DIR . '/' . $motionName . '.json', $motionSide)) photobooth_error('Live зургийн мэдээллийг хадгалж чадсангүй.', 500);
        }
        $state['items'][$name] = $row; photobooth_write_state($state); $committed = true;
        // Thumbnail failure is harmless: album can fall back to the accepted PNG.
        server_thumb($name); media_index_put($name);
        if ($motionName) media_index_put($motionName);
        return array_merge(array('ok' => true, 'csrf' => csrf_token()), photobooth_member_item($row));
    } finally {
        if (!$committed) foreach ($created as $name) { @unlink(PHOTOS_DIR . '/' . $name); foreach (array('json', 'webp', 'jpg', 'png') as $ext) @unlink(THUMBS_DIR . '/' . $name . '.' . $ext); }
        folder_storage_unlock($lock);
    }
}

function photobooth_public_record($token)
{
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) photobooth_error('Холбоос олдсонгүй эсвэл хүчингүй болсон байна.', 404);
    $state = photobooth_state(); $hash = hash('sha256', $token); $id = $state['shares'][$hash] ?? '';
    $row = is_string($id) ? ($state['items'][$id] ?? null) : null;
    if (!is_array($row) || empty($row['shareHash']) || !hash_equals($row['shareHash'], $hash) || valid_media_name($row['id']) === '') photobooth_error('Холбоос олдсонгүй эсвэл хүчингүй болсон байна.', 404);
    return $row;
}

function photobooth_public_info($row, $token)
{
    $query = 'photobooth.php?token=' . rawurlencode($token); $photo = media_item($row['id']);
    $motion = !empty($row['motion']) && valid_media_name($row['motion']) !== '' ? media_item($row['motion']) : null;
    return array('ok' => true, 'title' => $row['title'], 'frame' => $row['frame'], 'time' => (int)$row['created'], 'photo' => array('url' => $query . '&asset=photo', 'download' => $query . '&asset=photo&download=1', 'size' => $photo['size'], 'w' => $photo['w'], 'h' => $photo['h']), 'motion' => $motion ? array('url' => $query . '&asset=motion', 'download' => $query . '&asset=motion&download=1', 'size' => $motion['size'], 'ext' => $motion['ext']) : null);
}

/** Serve only the already authorized pair, including browser video byte ranges. */
function photobooth_stream_asset($row, $kind)
{
    if ($kind !== 'photo' && $kind !== 'motion') photobooth_error('Файл олдсонгүй.', 404);
    $name = $kind === 'photo' ? $row['id'] : ($row['motion'] ?? '');
    if (!is_string($name) || valid_media_name($name) === '') photobooth_error('Файл олдсонгүй.', 404);
    $path = PHOTOS_DIR . '/' . $name; $fp = @fopen($path, 'rb');
    if (!$fp) photobooth_error('Файл олдсонгүй.', 404);
    $stat = fstat($fp); $size = $stat ? (int)$stat['size'] : 0; $start = 0; $end = $size - 1; $partial = false;
    $range = $_SERVER['HTTP_RANGE'] ?? '';
    if ($range !== '') {
        if (!preg_match('/^bytes=(\d*)-(\d*)$/D', trim((string)$range), $matches) || ($matches[1] === '' && $matches[2] === '')) { fclose($fp); header('Content-Range: bytes */' . $size); photobooth_error('Файлын хэсэг буруу байна.', 416); }
        if ($matches[1] === '') { $length = (int)$matches[2]; if ($length <= 0) { fclose($fp); header('Content-Range: bytes */' . $size); photobooth_error('Файлын хэсэг буруу байна.', 416); } $start = max(0, $size - $length); }
        else { $start = (int)$matches[1]; if ($matches[2] !== '') $end = min($end, (int)$matches[2]); }
        if ($start >= $size || $start > $end) { fclose($fp); header('Content-Range: bytes */' . $size); photobooth_error('Файлын хэсэг олдсонгүй.', 416); }
        $partial = true;
    }
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION)); $mime = $kind === 'photo' ? 'image/png' : ($ext === 'gif' ? 'image/gif' : ($ext === 'webm' ? 'video/webm' : 'video/mp4'));
    $downloadName = clean_str($row['title'], 120) . ($kind === 'motion' ? '-live' : '') . '.' . $ext;
    header('Content-Type: ' . $mime); header('Content-Disposition: ' . folder_disposition($downloadName, ($_GET['download'] ?? '') === '1'));
    header('Cache-Control: private, no-store'); header('Referrer-Policy: no-referrer'); header('X-Robots-Tag: noindex, nofollow'); header('X-Content-Type-Options: nosniff'); header('Accept-Ranges: bytes');
    header("Content-Security-Policy: sandbox; default-src 'none'");
    $remaining = $end - $start + 1; header('Content-Length: ' . $remaining);
    if ($partial) { http_response_code(206); header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size); }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') { fclose($fp); exit; }
    @set_time_limit(0); @ini_set('zlib.output_compression', '0'); fseek($fp, $start);
    while ($remaining > 0 && !feof($fp)) { $chunk = fread($fp, min(256 * 1024, $remaining)); if ($chunk === false || $chunk === '') break; echo $chunk; $remaining -= strlen($chunk); if (connection_aborted()) break; }
    fclose($fp); exit;
}

/** Caller holds the global storage lock; album deletion also clears the companion. */
function photobooth_album_deleted($deleted)
{
    if (!$deleted || !is_file(PHOTOBOOTH_STATE)) return array();
    $state = photobooth_state(); $extra = array(); $changed = false;
    foreach ($state['items'] as $id => &$row) {
        if (in_array($id, $deleted, true)) {
            if (!empty($row['shareHash'])) unset($state['shares'][$row['shareHash']]);
            $motion = $row['motion'] ?? '';
            if ($motion && valid_media_name($motion) !== '' && @unlink(PHOTOS_DIR . '/' . $motion)) { foreach (array('json', 'webp', 'jpg', 'png') as $ext) @unlink(THUMBS_DIR . '/' . $motion . '.' . $ext); $extra[] = $motion; }
            unset($state['items'][$id]); $changed = true;
        } elseif (!empty($row['motion']) && in_array($row['motion'], $deleted, true)) { $row['motion'] = null; $changed = true; }
    }
    unset($row);
    if ($changed) photobooth_write_state($state);
    return $extra;
}

function handle_photobooth_action($action)
{
    $actions = array('photobooth_save', 'photobooth_list', 'photobooth_share', 'photobooth_revoke', 'photobooth_asset');
    if (!in_array($action, $actions, true)) return false;
    $write = in_array($action, array('photobooth_save', 'photobooth_share', 'photobooth_revoke'), true);
    if ($write) { require_post(); require_member(); }
    else { if (!in_array($_SERVER['REQUEST_METHOD'], $action === 'photobooth_asset' ? array('GET', 'HEAD') : array('GET'), true)) fail('GET хүсэлт шаардлагатай.', 405); require_member(false); }
    try {
        if ($action === 'photobooth_save') json_out(photobooth_save_capture());
        if ($action === 'photobooth_asset') { $state = photobooth_state(); $row = is_string($_GET['id'] ?? null) ? ($state['items'][$_GET['id']] ?? null) : null; if (!$row || valid_media_name($row['id']) === '') photobooth_error('Зураг олдсонгүй.', 404); photobooth_stream_asset($row, $_GET['kind'] ?? 'photo'); }
        $lock = folder_storage_lock($write);
        try {
            $state = photobooth_state();
            if ($action === 'photobooth_list') {
                $rows = array_filter(array_values($state['items']), function ($row) { return is_array($row) && valid_media_name($row['id']) !== ''; });
                usort($rows, function ($a, $b) { return $b['created'] <=> $a['created'] ?: strcmp($b['id'], $a['id']); });
                $offset = max(0, (int)($_GET['offset'] ?? 0)); $limit = min(200, max(1, (int)($_GET['limit'] ?? 40))); $items = array();
                foreach (array_slice($rows, $offset, $limit) as $row) $items[] = photobooth_member_item($row);
                $result = array('ok' => true, 'items' => $items, 'total' => count($rows), 'limits' => photobooth_limits(), 'csrf' => csrf_token());
            } else {
                $body = body_json(); $id = is_string($body['id'] ?? null) ? $body['id'] : ''; $row = $state['items'][$id] ?? null;
                if (!$row || valid_media_name($id) === '') photobooth_error('Зураг олдсонгүй.', 404);
                $operation = $action === 'photobooth_revoke' ? 'revoke' : ($body['operation'] ?? 'recreate');
                if ($operation === 'revoke') { if (!empty($row['shareHash'])) unset($state['shares'][$row['shareHash']]); $row['shareNonce'] = null; $row['shareHash'] = null; }
                elseif ($operation === 'recreate') photobooth_rotate_share($state, $row);
                else photobooth_error('Холбоосын үйлдэл буруу байна.');
                $state['items'][$id] = $row; photobooth_write_state($state);
                $result = array_merge(array('ok' => true, 'revoked' => $operation === 'revoke', 'csrf' => csrf_token()), photobooth_member_item($row));
            }
        } finally { folder_storage_unlock($lock); }
        json_out($result);
    } catch (RuntimeException $error) {
        $code = (int)$error->getCode(); fail($code >= 400 && $code <= 599 ? $error->getMessage() : 'Photobooth түр боломжгүй байна.', $code >= 400 && $code <= 599 ? $code : 500);
    }
}

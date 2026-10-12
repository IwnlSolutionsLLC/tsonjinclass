<?php
/* Permanent class memory boards. Saved marks and sealed pages have no removal API. */
if (!defined('C122')) { http_response_code(404); exit; }

define('DOODLE_DIR', DB_DIR . '/doodle');
define('DOODLE_INDEX', DOODLE_DIR . '/index.php');
define('DOODLE_MAX_PAGES', 5000);
define('DOODLE_MAX_OPS', 10000);
define('DOODLE_MAX_POINTS', 100000);
define('DOODLE_MAX_PAGE_BYTES', 16 * 1024 * 1024);
define('DOODLE_MAX_ASSET', 8 * 1024 * 1024);
define('DOODLE_QUOTA', 8 * 1024 * 1024 * 1024);
define('DOODLE_WIDTH', 1600);
define('DOODLE_HEIGHT', 1000);

function doodle_prepare()
{
    static $ready = false;
    if ($ready) return;
    $lock = folder_storage_lock();
    try {
        foreach (array(DOODLE_DIR, DOODLE_DIR . '/pages', DOODLE_DIR . '/assets') as $dir) {
            if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException('Cannot create memory board storage');
        }
        if (!is_file(DOODLE_DIR . '/.htaccess') && @file_put_contents(DOODLE_DIR . '/.htaccess', "Options -Indexes\nRequire all denied\nDeny from all\n") === false) throw new RuntimeException('Cannot protect memory board storage');
        if (!is_file(DOODLE_INDEX) && !folder_write_private(DOODLE_INDEX, array('version' => 1, 'sequence' => 0, 'used' => 0, 'assets' => 0, 'pages' => array(), 'creates' => array()))) throw new RuntimeException('Cannot initialize memory boards');
        $ready = true;
    } finally { folder_storage_unlock($lock); }
}

function doodle_index()
{
    $state = read_guarded(DOODLE_INDEX);
    if (!is_array($state) || !isset($state['pages'], $state['creates']) || !is_array($state['pages']) || !is_array($state['creates'])) throw new RuntimeException('Invalid memory board index');
    return $state;
}

/** Read by gallery/folder quota checks while holding the shared storage lock. */
function doodle_used_bytes()
{
    if (!is_file(DOODLE_INDEX)) return 0;
    $state = doodle_index();
    return max(0, (int)($state['used'] ?? 0)) + max(0, (int)@filesize(DOODLE_INDEX));
}

function doodle_json_bytes($data)
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false) throw new RuntimeException('Cannot encode memory board');
    return strlen(FOLDER_GUARD) + strlen($json) + 1;
}

function doodle_check_quota($state, $next, $delta)
{
    // The global folder lock makes these decisions atomic with album/folder uploads.
    $growth = $delta + doodle_json_bytes($next) - (int)@filesize(DOODLE_INDEX);
    if ((int)($next['used'] ?? 0) + doodle_json_bytes($next) > DOODLE_QUOTA || media_used_bytes() + tmp_reserved_bytes() + folder_used_bytes() + doodle_used_bytes() + $growth > quota_bytes()) fail('Дурсамжийн самбарын хадгалах зай хүрэлцэхгүй байна', 507);
    $free = @disk_free_space(DOODLE_DIR);
    if ($growth > 0 && $free !== false && $free < $growth + FOLDER_DISK_MARGIN) fail('Серверийн сул зай хүрэлцэхгүй байна', 507);
}

function doodle_lock($resource, $exclusive = true)
{
    $fp = @fopen(DOODLE_DIR . '/.' . $resource . '-lock.php', 'c+b');
    if (!$fp || !flock($fp, $exclusive ? LOCK_EX : LOCK_SH)) throw new RuntimeException('Cannot lock memory board');
    if ($exclusive && fstat($fp)['size'] === 0) { fwrite($fp, FOLDER_GUARD); fflush($fp); @chmod(DOODLE_DIR . '/.' . $resource . '-lock.php', 0640); }
    return $fp;
}

function doodle_unlock($fp) { if ($fp) { flock($fp, LOCK_UN); fclose($fp); } }

function doodle_id($value)
{
    if (!is_string($value) || !preg_match('/^[a-f0-9]{32}$/D', $value)) fail('Дурсамжийн хуудас олдсонгүй', 404);
    return $value;
}

function doodle_request_id($value)
{
    if (!is_string($value) || !preg_match('/^[A-Za-z0-9._:-]{8,100}$/D', $value)) fail('Хадгалалтын хүсэлтийн дугаар буруу байна');
    return hash('sha256', $value);
}

function doodle_page_path($id) { return DOODLE_DIR . '/pages/' . $id . '.php'; }
function doodle_asset_path($id) { return DOODLE_DIR . '/assets/' . $id . '.php'; }
function doodle_asset_meta_path($id) { return DOODLE_DIR . '/assets/' . $id . '.meta.php'; }

function doodle_read_page($id)
{
    $page = read_guarded(doodle_page_path($id));
    if (!is_array($page) || ($page['id'] ?? '') !== $id || !isset($page['ops'], $page['requests']) || !is_array($page['ops']) || !is_array($page['requests'])) fail('Дурсамжийн хуудас олдсонгүй', 404);
    return $page;
}

function doodle_summary($page)
{
    return array('id' => $page['id'], 'title' => $page['title'], 'background' => $page['background'], 'width' => DOODLE_WIDTH, 'height' => DOODLE_HEIGHT, 'created' => (int)$page['created'], 'author' => $page['author'], 'count' => count($page['ops']), 'version' => (int)$page['version'], 'sealed' => !empty($page['sealed']), 'sealedAt' => (int)($page['sealedAt'] ?? 0), 'sequence' => (int)$page['sequence']);
}

function doodle_asset_meta($id)
{
    static $cache = array();
    if (isset($cache[$id])) return $cache[$id];
    $asset = read_guarded(doodle_asset_meta_path($id));
    if (!is_array($asset) || ($asset['id'] ?? '') !== $id || !is_file(doodle_asset_path($id))) fail('Зураг олдсонгүй', 404);
    return $cache[$id] = $asset;
}

function doodle_public_asset($asset)
{
    return array('id' => $asset['id'], 'url' => 'api.php?action=doodle_asset&asset=' . $asset['id'], 'name' => $asset['name'], 'mime' => $asset['mime'], 'width' => (int)$asset['width'], 'height' => (int)$asset['height'], 'size' => (int)$asset['size']);
}

function doodle_public_op($op)
{
    if ($op['type'] === 'image') {
        $asset = doodle_asset_meta($op['asset']);
        $op['assetUrl'] = 'api.php?action=doodle_asset&asset=' . $asset['id'];
        $op['assetMime'] = $asset['mime']; $op['assetWidth'] = $asset['width']; $op['assetHeight'] = $asset['height'];
    }
    return $op;
}

function doodle_number($value, $min, $max)
{
    if ((!is_int($value) && !is_float($value)) || !is_finite((float)$value) || $value < $min || $value > $max) fail('Самбарын хэмжээ эсвэл байрлал буруу байна');
    return round((float)$value, 3);
}

function doodle_color($value)
{
    if (!is_string($value) || !preg_match('/^#[a-fA-F0-9]{6}$/D', $value)) fail('Өнгийн код буруу байна');
    return strtolower($value);
}

function doodle_text($value, $max)
{
    if (!is_string($value) || !preg_match('//u', $value)) fail('Текст буруу байна');
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
    if (cut($value, $max) !== $value) fail('Текст хэт урт байна');
    return trim($value);
}

function doodle_validate_ops($input, $author)
{
    if (!is_array($input) || !is_list_array($input) || count($input) < 1 || count($input) > 64) fail('Нэг удаад 1–64 зураглал хадгална');
    $out = array(); $pointCount = 0;
    $stickers = array('smile', 'heart', 'star', 'sparkles', 'party', 'sun', 'flower', 'graduate', 'coffee', 'cat', 'rocket', 'rainbow', 'clap', 'fire', 'dancing-heart', 'twinkle-star', 'party-confetti');
    foreach ($input as $raw) {
        if (!is_array($raw) || !isset($raw['type']) || !is_string($raw['type'])) fail('Зураглалын төрөл буруу байна');
        $type = $raw['type']; $op = array('type' => $type);
        if ($type === 'stroke') {
            $points = $raw['points'] ?? null;
            if (!is_array($points) || !is_list_array($points) || count($points) < 1 || count($points) > 8192) fail('Зураас хэт урт байна. Богино зураасаар зурна уу.');
            $op['points'] = array();
            foreach ($points as $point) {
                if (!is_array($point) || !is_list_array($point) || count($point) !== 2) fail('Зураасны цэг буруу байна');
                $op['points'][] = array(doodle_number($point[0], 0, DOODLE_WIDTH), doodle_number($point[1], 0, DOODLE_HEIGHT));
            }
            $pointCount += count($points);
            if ($pointCount > 20000) fail('Нэг хадгалалтад хэт олон цэг байна');
            $op['color'] = doodle_color($raw['color'] ?? null); $op['width'] = doodle_number($raw['width'] ?? null, 1, 64);
            $op['tool'] = $raw['tool'] ?? 'pen';
            if (!in_array($op['tool'], array('pen', 'highlight'), true)) fail('Зурах хэрэгсэл буруу байна');
        } elseif ($type === 'text') {
            $op['x'] = doodle_number($raw['x'] ?? null, 0, DOODLE_WIDTH); $op['y'] = doodle_number($raw['y'] ?? null, 0, DOODLE_HEIGHT);
            $op['text'] = doodle_text($raw['text'] ?? null, 2000);
            if ($op['text'] === '') fail('Текстээ оруулна уу');
            $op['fontSize'] = doodle_number($raw['fontSize'] ?? null, 12, 120); $op['color'] = doodle_color($raw['color'] ?? null);
        } elseif ($type === 'image' || $type === 'sticker') {
            $op['x'] = doodle_number($raw['x'] ?? null, 0, DOODLE_WIDTH); $op['y'] = doodle_number($raw['y'] ?? null, 0, DOODLE_HEIGHT);
            $op['width'] = doodle_number($raw['width'] ?? null, 20, DOODLE_WIDTH); $op['height'] = doodle_number($raw['height'] ?? null, 20, DOODLE_HEIGHT);
            if ($type === 'image') { $op['asset'] = doodle_id($raw['asset'] ?? null); doodle_asset_meta($op['asset']); }
            else { $op['sticker'] = $raw['sticker'] ?? null; if (!in_array($op['sticker'], $stickers, true)) fail('Наалт олдсонгүй'); }
        } else fail('Дурсамжийн самбарт зөвхөн шинэ зураглал нэмнэ');
        $op['author'] = $author;
        $out[] = $op;
    }
    return array($out, $pointCount);
}

/** Write quota/index first: an interrupted commit can overcount, but never undercount saved data. */
function doodle_commit_page($state, $next, $page)
{
    if (!folder_write_private(DOODLE_INDEX, $next)) throw new RuntimeException('Cannot save memory board index');
    if (!folder_write_private(doodle_page_path($page['id']), $page)) {
        folder_write_private(DOODLE_INDEX, $state);
        throw new RuntimeException('Cannot save memory board page');
    }
}

function doodle_store_asset($bytes, $name)
{
    $size = strlen($bytes);
    if ($size < 1 || $size > DOODLE_MAX_ASSET) fail('Зураг эсвэл GIF хамгийн ихдээ 8 МБ байна', 413);
    if (!class_exists('finfo') || !function_exists('getimagesizefromstring')) fail('Серверт зураг шалгах өргөтгөл шаардлагатай', 503);
    $image = @getimagesizefromstring($bytes);
    $fi = new finfo(FILEINFO_MIME_TYPE); $mime = $fi->buffer($bytes);
    $allowed = array('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif');
    if (!$image || !in_array($mime, $allowed, true) || ($image['mime'] ?? '') !== $mime || $image[0] < 1 || $image[1] < 1 || $image[0] > 12000 || $image[1] > 12000 || $image[0] * $image[1] > 40000000) fail('JPG, PNG, GIF, WebP эсвэл AVIF зураг сонгоно уу');
    $state = doodle_index();
    if ((int)($state['assets'] ?? 0) >= 50000) fail('Самбарын зургийн тоо дээд хязгаарт хүрсэн байна', 507);
    $id = bin2hex(random_bytes(16));
    $asset = array('id' => $id, 'name' => clean_str($name, 180) ?: 'Дурсамж', 'mime' => $mime, 'width' => $image[0], 'height' => $image[1], 'size' => $size, 'created' => time());
    $delta = strlen(FOLDER_GUARD) + $size + doodle_json_bytes($asset);
    $next = $state; $next['used'] = (int)$state['used'] + $delta; $next['assets'] = (int)$state['assets'] + 1;
    doodle_check_quota($state, $next, $delta);
    $tmp = DOODLE_DIR . '/assets/.pending-' . $id . '.php';
    if (@file_put_contents($tmp, FOLDER_GUARD . $bytes, LOCK_EX) !== strlen(FOLDER_GUARD) + $size) { @unlink($tmp); throw new RuntimeException('Cannot save memory photo'); }
    @chmod($tmp, 0640);
    if (!folder_write_private(doodle_asset_meta_path($id), $asset)) { @unlink($tmp); throw new RuntimeException('Cannot save memory photo information'); }
    if (!folder_write_private(DOODLE_INDEX, $next)) { @unlink($tmp); @unlink(doodle_asset_meta_path($id)); throw new RuntimeException('Cannot save memory photo index'); }
    if (!@rename($tmp, doodle_asset_path($id))) {
        folder_write_private(DOODLE_INDEX, $state); @unlink($tmp); @unlink(doodle_asset_meta_path($id)); throw new RuntimeException('Cannot finish saving memory photo');
    }
    return $asset;
}

function handle_doodle_action($action)
{
    $actions = array('doodle_pages', 'doodle_page', 'doodle_create', 'doodle_append', 'doodle_finalize', 'doodle_import', 'doodle_upload', 'doodle_asset');
    if (!in_array($action, $actions, true)) return;
    $read = in_array($action, array('doodle_pages', 'doodle_page', 'doodle_asset'), true);
    if ($read) {
        if (!in_array($_SERVER['REQUEST_METHOD'], array('GET', 'HEAD'), true)) fail('GET хүсэлт шаардлагатай', 405);
        require_member(false);
    } else { require_post(); require_member(); }
    doodle_prepare();
    if ($action === 'doodle_pages') {
        $state = doodle_index(); $before = PHP_INT_MAX;
        if (!empty($_GET['cursor'])) {
            $cursor = json_decode(b64u_dec((string)$_GET['cursor']), true);
            if (!is_array($cursor) || !isset($cursor['before']) || !is_int($cursor['before']) || $cursor['before'] < 1) fail('Хуудасны дараалал буруу байна');
            $before = $cursor['before'];
        }
        $pages = array_filter(array_values($state['pages']), function ($page) use ($before) { return $page['sequence'] < $before; });
        usort($pages, function ($a, $b) { return $b['sequence'] <=> $a['sequence']; });
        $limit = max(1, min(60, (int)($_GET['limit'] ?? 24))); $more = count($pages) > $limit; $pages = array_slice($pages, 0, $limit);
        json_out(array('ok' => true, 'pages' => $pages, 'nextCursor' => $more ? b64u_enc(json_encode(array('before' => $pages[count($pages) - 1]['sequence']))) : null, 'total' => count($state['pages']), 'limits' => array('pages' => DOODLE_MAX_PAGES, 'operations' => DOODLE_MAX_OPS, 'points' => DOODLE_MAX_POINTS, 'assetBytes' => DOODLE_MAX_ASSET)));
    }
    if ($action === 'doodle_page') {
        $id = doodle_id($_GET['page'] ?? $_GET['id'] ?? null);
        if (!is_file(doodle_page_path($id))) fail('Дурсамжийн хуудас олдсонгүй', 404);
        $lock = doodle_lock('page-' . $id, false);
        try { $page = doodle_read_page($id); } finally { doodle_unlock($lock); }
        $afterRaw = $_GET['after'] ?? '0';
        if (!is_string($afterRaw) || !preg_match('/^\d{1,10}$/D', $afterRaw)) fail('Зураглалын дараалал буруу байна');
        $after = (int)$afterRaw; $ops = array(); $more = false;
        foreach ($page['ops'] as $op) if ((int)$op['revision'] > $after) {
            if (count($ops) >= 1000) { $more = true; break; }
            $ops[] = doodle_public_op($op);
        }
        json_out(array('ok' => true, 'page' => doodle_summary($page), 'ops' => $ops, 'version' => $page['version'], 'hasMore' => $more, 'nextAfter' => $more ? $ops[count($ops) - 1]['revision'] : $page['version']));
    }
    if ($action === 'doodle_asset') {
        $id = doodle_id($_GET['asset'] ?? null); $asset = doodle_asset_meta($id);
        $fp = @fopen(doodle_asset_path($id), 'rb');
        if (!$fp || fread($fp, strlen(FOLDER_GUARD)) !== FOLDER_GUARD || (int)@filesize(doodle_asset_path($id)) !== (int)$asset['size'] + strlen(FOLDER_GUARD)) { if ($fp) fclose($fp); fail('Зураг уншиж чадсангүй', 500); }
        header('Content-Type: ' . $asset['mime']); header('Content-Length: ' . (int)$asset['size']);
        header('Content-Disposition: inline'); header('Cache-Control: private, no-store'); header('Content-Security-Policy: sandbox; default-src \'none\'');
        if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') fpassthru($fp);
        fclose($fp); exit;
    }
    // JSON requests are bounded separately from binary image uploads.
    if ($action !== 'doodle_upload' && content_length() > 2 * 1024 * 1024) fail('Хадгалалтын хүсэлт хэт том байна', 413);
    $body = $action === 'doodle_upload' ? array() : body_json();
    // Folder authentication/initialization must happen before acquiring its non-reentrant storage lock.
    $importFolder = null;
    if ($action === 'doodle_import' && ($body['source'] ?? '') === 'folder') { $importFolder = folder_id($body['folder'] ?? null); folder_require_access($importFolder, true); }
    $storageLock = folder_storage_lock(); $indexLock = doodle_lock('index'); $pageLock = null;
    try {
        if ($action === 'doodle_create') {
            $requestId = doodle_request_id($body['requestId'] ?? null); $title = clean_str($body['title'] ?? '', 100);
            if ($title === '') $title = 'Манай дурсамж';
            $background = $body['background'] ?? 'paper';
            if (!in_array($background, array('paper', 'grid', 'dots', 'dark'), true)) fail('Самбарын дэвсгэр буруу байна');
            $author = clean_str($body['author'] ?? '', 50); $hash = hash('sha256', json_encode(array($title, $background, $author)));
            $state = doodle_index();
            if (isset($state['creates'][$requestId])) {
                $old = $state['creates'][$requestId];
                if (!hash_equals($old['hash'], $hash)) fail('Хадгалалтын дугаарыг дахин ашигласан байна', 409);
                json_out(array('ok' => true, 'page' => doodle_summary(doodle_read_page($old['page'])), 'duplicate' => true));
            }
            if (count($state['pages']) >= DOODLE_MAX_PAGES) fail('Дурсамжийн хуудасны тоо дээд хязгаарт хүрсэн байна', 507);
            $id = bin2hex(random_bytes(16)); $page = array('id' => $id, 'title' => $title, 'background' => $background, 'author' => $author, 'created' => time(), 'sequence' => (int)$state['sequence'] + 1, 'version' => 0, 'sealed' => false, 'sealedAt' => 0, 'points' => 0, 'ops' => array(), 'requests' => array());
            $next = $state; $next['sequence'] = $page['sequence']; $next['pages'][$id] = doodle_summary($page); $next['creates'][$requestId] = array('hash' => $hash, 'page' => $id);
            $delta = doodle_json_bytes($page); $next['used'] = (int)$state['used'] + $delta; $next['pages'][$id]['storageBytes'] = $delta;
            doodle_check_quota($state, $next, $delta); doodle_commit_page($state, $next, $page);
            json_out(array('ok' => true, 'page' => doodle_summary($page), 'duplicate' => false));
        }
        if ($action === 'doodle_append' || $action === 'doodle_finalize') {
            $id = doodle_id($body['page'] ?? $body['id'] ?? null); $requestId = doodle_request_id($body['requestId'] ?? null); $state = doodle_index();
            if (!isset($state['pages'][$id])) fail('Дурсамжийн хуудас олдсонгүй', 404);
            $pageLock = doodle_lock('page-' . $id); $page = doodle_read_page($id);
            $incoming = array(); $points = 0;
            if ($action === 'doodle_append') list($incoming, $points) = doodle_validate_ops($body['ops'] ?? null, clean_str($body['author'] ?? '', 50));
            $hash = hash('sha256', json_encode(array($action, $incoming)));
            if (isset($page['requests'][$requestId])) {
                $old = $page['requests'][$requestId];
                if (!hash_equals($old['hash'], $hash)) fail('Хадгалалтын дугаарыг өөр зураглалд ашигласан байна', 409);
                if ($action === 'doodle_finalize') json_out(array('ok' => true, 'page' => doodle_summary($page), 'duplicate' => true));
                $accepted = array_slice($page['ops'], $old['start'], $old['count']);
                json_out(array('ok' => true, 'version' => $page['version'], 'count' => count($page['ops']), 'ops' => array_map('doodle_public_op', $accepted), 'duplicate' => true));
            }
            if (!empty($page['sealed'])) fail('Энэ дурсамж хадгалагдсан байна. Шинэ хуудас нээгээд дахин зураарай.', 409, array('sealed' => true));
            if (count($page['ops']) + count($incoming) > DOODLE_MAX_OPS || (int)$page['points'] + $points > DOODLE_MAX_POINTS) fail('Энэ хуудас дүүрсэн байна. Шинэ хуудас нээгээд үргэлжлүүлээрэй.', 413, array('pageFull' => true));
            $start = count($page['ops']); $accepted = array();
            foreach ($incoming as $op) { $op['id'] = bin2hex(random_bytes(16)); $op['revision'] = ++$page['version']; $op['created'] = time(); $page['ops'][] = $op; $accepted[] = $op; }
            $page['points'] += $points;
            if ($action === 'doodle_finalize') { $page['sealed'] = true; $page['sealedAt'] = time(); $page['version']++; }
            $page['requests'][$requestId] = array('hash' => $hash, 'start' => $start, 'count' => count($accepted));
            $next = $state; $next['pages'][$id] = doodle_summary($page);
            $oldBytes = (int)($state['pages'][$id]['storageBytes'] ?? @filesize(doodle_page_path($id))); $newBytes = doodle_json_bytes($page); $delta = $newBytes - $oldBytes;
            if ($action === 'doodle_append' && $newBytes > DOODLE_MAX_PAGE_BYTES) fail('Энэ хуудас дүүрсэн байна. Шинэ хуудас нээгээд үргэлжлүүлээрэй.', 413, array('pageFull' => true));
            $next['pages'][$id]['storageBytes'] = $newBytes; $next['used'] = (int)$state['used'] + $delta;
            doodle_check_quota($state, $next, $delta); doodle_commit_page($state, $next, $page);
            if ($action === 'doodle_finalize') json_out(array('ok' => true, 'page' => doodle_summary($page), 'duplicate' => false));
            json_out(array('ok' => true, 'version' => $page['version'], 'count' => count($page['ops']), 'ops' => array_map('doodle_public_op', $accepted), 'duplicate' => false));
        }
        if ($action === 'doodle_import') {
            $source = $body['source'] ?? '';
            if ($source === 'album') {
                $name = valid_media_name($body['name'] ?? '');
                if ($name === '' || media_types()[media_ext($name)] !== 'image') fail('Цомгийн зураг олдсонгүй', 404);
                $path = PHOTOS_DIR . '/' . $name; $size = @filesize($path);
                if ($size === false || $size < 1 || $size > DOODLE_MAX_ASSET) fail('Зураг хамгийн ихдээ 8 МБ байна', 413);
                $bytes = @file_get_contents($path, false, null, 0, DOODLE_MAX_ASSET + 1);
                if ($bytes === false) fail('Цомгийн зураг уншиж чадсангүй', 500);
                $label = media_item($name)['original'];
            } elseif ($source === 'folder' && $importFolder !== null) {
                $fileId = folder_token_id($body['file'] ?? null); $state = folder_state();
                $file = $state['folders'][$importFolder]['files'][$fileId] ?? null;
                if (!$file || $fileId === '') fail('Хавтасны зураг олдсонгүй', 404);
                if ((int)$file['size'] > DOODLE_MAX_ASSET) fail('Зураг хамгийн ихдээ 8 МБ байна', 413);
                $fp = folder_open_blob($importFolder, $file); $bytes = stream_get_contents($fp, DOODLE_MAX_ASSET + 1); fclose($fp); $label = $file['name'];
            } elseif ($source === 'builtin') {
                $name = $body['name'] ?? '';
                if (!is_string($name) || !in_array($name, array('heart.gif', 'star.gif', 'confetti.gif', 'rainbow.gif', 'flower.gif', 'smile.gif'), true)) fail('GIF наалт олдсонгүй', 404);
                $path = C122_ROOT . '/assets/img/doodle/' . $name;
                if (!is_file($path)) fail('GIF наалт олдсонгүй', 404);
                $bytes = @file_get_contents($path, false, null, 0, DOODLE_MAX_ASSET + 1);
                if (!is_string($bytes)) fail('GIF наалт уншиж чадсангүй', 500);
                $label = $name;
            } else fail('Цомог, өөрийн хавтас эсвэл GIF наалт сонгоно уу');
            $asset = doodle_store_asset($bytes, $label); json_out(array('ok' => true, 'asset' => doodle_public_asset($asset)));
        }
        if ($action === 'doodle_upload') {
            if (content_length() > DOODLE_MAX_ASSET) fail('Зураг эсвэл GIF хамгийн ихдээ 8 МБ байна', 413);
            $bytes = @file_get_contents('php://input', false, null, 0, DOODLE_MAX_ASSET + 1);
            if (!is_string($bytes)) fail('Зураг уншиж чадсангүй');
            $asset = doodle_store_asset($bytes, $_GET['name'] ?? 'Дурсамж'); json_out(array('ok' => true, 'asset' => doodle_public_asset($asset)));
        }
    } finally { doodle_unlock($pageLock); doodle_unlock($indexLock); folder_storage_unlock($storageLock); }
}

<?php
/* Editable class smartboards. Permanent DOODLE pages are a separate feature. */
if (!defined('C122')) { http_response_code(404); exit; }

define('BOARD_DIR', DB_DIR . '/board');
define('BOARD_INDEX', BOARD_DIR . '/index.php');
define('BOARD_WIDTH', 1600);
define('BOARD_HEIGHT', 900);
// A board's paper follows the screen it was created on: any whole-number size inside these limits is stored with the board.
// Boards without a stored size (older ones) are 1600 x 900.
define('BOARD_MIN_SIDE', 320);
define('BOARD_MAX_SIDE', 4096);
define('BOARD_MIN_RATIO', 0.25);
define('BOARD_MAX_RATIO', 4.0);
define('BOARD_MAX_BYTES', 6 * 1024 * 1024);
define('BOARD_MAX_PAGES', 100);
define('BOARD_MAX_PAGE_OBJECTS', 3000);
define('BOARD_MAX_OBJECTS', 10000);
define('BOARD_MAX_POINTS', 150000);
define('BOARD_MAX_BOARDS', 500);
define('BOARD_REQUEST_HISTORY', 128);

function board_prepare()
{
    static $ready = false;
    if ($ready) return;
    $lock = folder_storage_lock();
    try {
        foreach (array(BOARD_DIR, BOARD_DIR . '/boards') as $dir) {
            if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException('Cannot create smartboard storage');
        }
        if (!is_file(BOARD_DIR . '/.htaccess') && @file_put_contents(BOARD_DIR . '/.htaccess', "Options -Indexes\nRequire all denied\nDeny from all\n") === false) throw new RuntimeException('Cannot protect smartboard storage');
        if (!is_file(BOARD_INDEX) && !folder_write_private(BOARD_INDEX, array('version' => 1, 'used' => 0, 'boards' => array(), 'creates' => array(), 'pending' => null))) throw new RuntimeException('Cannot initialize smartboard index');
        $ready = true;
    } finally { folder_storage_unlock($lock); }
}

function board_json_bytes($value)
{
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) throw new RuntimeException('Cannot encode smartboard');
    return strlen(FOLDER_GUARD) + strlen($json) + 1;
}

function board_path($id) { return BOARD_DIR . '/boards/' . $id . '.php'; }

function board_id($value)
{
    if (!is_string($value) || !preg_match('/^[A-Za-z0-9_-]{8,64}$/D', $value) || in_array($value, array('__proto__', 'prototype', 'constructor'), true)) fail('Самбарын дугаар буруу байна');
    return $value;
}

function board_request_id($value)
{
    if (!is_string($value) || !preg_match('/^[A-Za-z0-9._:-]{8,100}$/D', $value)) fail('Хадгалалтын хүсэлтийн дугаар буруу байна');
    return hash('sha256', $value);
}

function board_revision($value)
{
    if (!is_int($value) || $value < 1 || $value > 2147483646) fail('Самбарын хувилбар буруу байна');
    return $value;
}

function board_text($value, $max, $trim = true)
{
    if (!is_string($value) || !preg_match('//u', $value) || cut($value, $max) !== $value) fail('Текст буруу эсвэл хэт урт байна');
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
    return $trim ? trim($value) : $value;
}

function board_number($value, $min, $max)
{
    if ((!is_int($value) && !is_float($value)) || !is_finite((float)$value) || $value < $min || $value > $max) fail('Самбарын хэмжээ эсвэл байрлал буруу байна');
    return round((float)$value, 3);
}

function board_color($value)
{
    if (!is_string($value) || !preg_match('/^#[0-9a-fA-F]{6}$/D', $value)) fail('Өнгийн код буруу байна');
    return strtolower($value);
}

/** The paper size of a new board: both values are whole numbers, each side within limits and the shape not extreme. */
function board_paper_size($width, $height)
{
    if ($width === null && $height === null) return array(BOARD_WIDTH, BOARD_HEIGHT);
    if (!is_int($width) || !is_int($height) || $width < BOARD_MIN_SIDE || $width > BOARD_MAX_SIDE || $height < BOARD_MIN_SIDE || $height > BOARD_MAX_SIDE) fail('Самбарын хэмжээ буруу байна');
    $ratio = $width / $height;
    if ($ratio < BOARD_MIN_RATIO || $ratio > BOARD_MAX_RATIO) fail('Самбарын хэмжээ буруу байна');
    return array($width, $height);
}

/** The paper size stored with a board (1600 x 900 when an older board has none). */
function board_dims($board)
{
    $width = $board['width'] ?? null; $height = $board['height'] ?? null;
    if (!is_int($width) || !is_int($height) || $width < BOARD_MIN_SIDE || $width > BOARD_MAX_SIDE || $height < BOARD_MIN_SIDE || $height > BOARD_MAX_SIDE) return array(BOARD_WIDTH, BOARD_HEIGHT);
    return array($width, $height);
}

function board_boolean($value)
{
    if (!is_bool($value)) fail('Самбарын тохиргоо буруу байна');
    return $value;
}

function board_reject_unsafe_keys($value)
{
    if (!is_array($value)) return;
    foreach ($value as $key => $child) {
        if (in_array((string)$key, array('__proto__', 'prototype', 'constructor'), true)) fail('Самбарын өгөгдөл буруу байна');
        if (is_array($child)) board_reject_unsafe_keys($child);
    }
}

function board_body()
{
    if (isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > BOARD_MAX_BYTES) fail('Нэг самбар хамгийн ихдээ 6 МБ байна', 413);
    $raw = file_get_contents('php://input', false, null, 0, BOARD_MAX_BYTES + 1);
    if ($raw === false || strlen($raw) > BOARD_MAX_BYTES) fail('Нэг самбар хамгийн ихдээ 6 МБ байна', 413);
    $body = json_decode($raw, true, 64);
    if (!is_array($body) || is_list_array($body) || json_last_error() !== JSON_ERROR_NONE) fail('Самбарын өгөгдөл буруу байна');
    board_reject_unsafe_keys($body);
    return $body;
}

function board_album_name($value)
{
    if (!is_string($value) || $value === '' || strlen($value) > 200 || !preg_match('//u', $value) || $value !== basename($value) || $value[0] === '.' || preg_match('#[/\\\\:\x00-\x1F\x7F]#', $value)) fail('Цомгийн зургийн нэр буруу байна');
    if (!in_array(strtolower(pathinfo($value, PATHINFO_EXTENSION)), array('jpg', 'jpeg', 'png', 'gif', 'webp'), true)) fail('Самбарт JPG, PNG, GIF эсвэл WebP зураг нэмнэ. HEIC зургийг эхлээд JPG болгоно уу.');
    return $value;
}

/** Normalize geometry first; album references are checked after replay detection. */
function board_validate_pages($input, $paperWidth = BOARD_WIDTH, $paperHeight = BOARD_HEIGHT)
{
    if (!is_array($input) || !is_list_array($input) || count($input) < 1 || count($input) > BOARD_MAX_PAGES) fail('Самбар 1–100 хуудастай байна');
    $pages = array(); $pageIds = array(); $objectIds = array(); $images = array(); $pointCount = 0; $objectCount = 0;
    foreach ($input as $pageIndex => $rawPage) {
        if (!is_array($rawPage) || is_list_array($rawPage)) fail('Самбарын хуудас буруу байна');
        $pageId = board_id($rawPage['id'] ?? null);
        if (isset($pageIds[$pageId])) fail('Хуудасны дугаар давхардсан байна');
        $pageIds[$pageId] = true;
        $background = $rawPage['background'] ?? 'plain';
        if (!in_array($background, array('plain', 'grid', 'ruled', 'dark'), true)) fail('Самбарын дэвсгэр буруу байна');
        $title = board_text($rawPage['title'] ?? '', 120);
        $objects = $rawPage['objects'] ?? null;
        if (!is_array($objects) || !is_list_array($objects) || count($objects) > BOARD_MAX_PAGE_OBJECTS) fail('Нэг хуудсанд 3000 хүртэл зураглал байна');
        $objectCount += count($objects);
        if ($objectCount > BOARD_MAX_OBJECTS) fail('Самбарт хэт олон зураглал байна');
        $page = array('id' => $pageId, 'title' => $title === '' ? 'Хуудас ' . ($pageIndex + 1) : $title, 'background' => $background, 'objects' => array());
        foreach ($objects as $raw) {
            if (!is_array($raw) || is_list_array($raw)) fail('Самбарын зураглал буруу байна');
            $objectId = board_id($raw['id'] ?? null);
            if (isset($objectIds[$objectId])) fail('Зураглалын дугаар давхардсан байна');
            $objectIds[$objectId] = true;
            $type = $raw['type'] ?? null;
            $object = array('id' => $objectId, 'type' => $type);
            if ($type === 'stroke') {
                $tool = $raw['tool'] ?? 'pen';
                if (!in_array($tool, array('pen', 'highlight', 'erase'), true)) fail('Зурах хэрэгсэл буруу байна');
                $points = $raw['points'] ?? null;
                if (!is_array($points) || !is_list_array($points) || count($points) < 1 || count($points) > 8192) fail('Зураас хэт урт байна. Богино зураасаар зурна уу.');
                $pointCount += count($points);
                if ($pointCount > BOARD_MAX_POINTS) fail('Самбарт хэт олон зураасны цэг байна');
                $object['tool'] = $tool;
                $object['color'] = board_color($raw['color'] ?? null);
                $object['width'] = board_number($raw['width'] ?? null, 1, 80);
                $object['points'] = array();
                foreach ($points as $point) {
                    if (!is_array($point) || !is_list_array($point) || (count($point) !== 2 && count($point) !== 3)) fail('Зураасны цэг буруу байна');
                    $clean = array(board_number($point[0], 0, $paperWidth), board_number($point[1], 0, $paperHeight));
                    if (count($point) === 3) $clean[] = board_number($point[2], 0, 1);
                    $object['points'][] = $clean;
                }
            } elseif (in_array($type, array('shape', 'text', 'image'), true)) {
                $object['x'] = board_number($raw['x'] ?? null, -$paperWidth, $paperWidth * 2);
                $object['y'] = board_number($raw['y'] ?? null, -$paperHeight, $paperHeight * 2);
                $object['width'] = board_number($raw['width'] ?? null, $type === 'shape' ? -$paperWidth * 2 : 20, $paperWidth * 2);
                $object['height'] = board_number($raw['height'] ?? null, $type === 'shape' ? -$paperHeight * 2 : 20, $paperHeight * 2);
                if ($type === 'shape') {
                    $shape = $raw['shape'] ?? null;
                    if (!in_array($shape, array('rect', 'ellipse', 'line', 'arrow'), true)) fail('Дүрсний төрөл буруу байна');
                    $object['shape'] = $shape;
                    $object['color'] = board_color($raw['color'] ?? null);
                    $object['lineWidth'] = board_number($raw['lineWidth'] ?? null, 1, 40);
                    $object['fill'] = board_boolean($raw['fill'] ?? false);
                } elseif ($type === 'text') {
                    $object['text'] = board_text($raw['text'] ?? null, 20000, false);
                    $object['fontSize'] = board_number($raw['fontSize'] ?? null, 12, 120);
                    $object['color'] = board_color($raw['color'] ?? null);
                    $object['bold'] = board_boolean($raw['bold'] ?? false);
                } else {
                    // Responses carry derived URLs; never persist a client-provided URL.
                    foreach (array('url', 'thumb') as $key) if (isset($raw[$key]) && (!is_string($raw[$key]) || preg_match('/^\s*(?:javascript|data|vbscript|file):/i', $raw[$key]))) fail('Цомгийн зургийн холбоос буруу байна');
                    $object['name'] = board_album_name($raw['name'] ?? null);
                    $images[$object['name']] = true;
                }
            } else fail('Самбарын зураглалын төрөл буруу байна');
            $page['objects'][] = $object;
        }
        $pages[] = $page;
    }
    return array($pages, array_keys($images));
}

function board_validate_album_refs($names, $previous)
{
    $oldNames = array();
    if ($previous) foreach ($previous['pages'] as $page) foreach ($page['objects'] as $object) if (($object['type'] ?? '') === 'image') $oldNames[$object['name']] = true;
    foreach ($names as $name) {
        // Removing a photo from the album leaves an editable placeholder on old boards.
        if (isset($oldNames[$name]) && !is_file(PHOTOS_DIR . '/' . $name)) continue;
        if (valid_media_name($name) !== $name) fail('Цомгийн зураг олдсонгүй. Өөр зураг сонгоно уу.', 404);
        $real = realpath(PHOTOS_DIR . '/' . $name); $album = realpath(PHOTOS_DIR);
        if ($real === false || $album === false || strpos($real, $album . DIRECTORY_SEPARATOR) !== 0) fail('Цомгийн зургийн нэр буруу байна');
        $size = @getimagesize($real);
        if (!$size || !in_array($size['mime'] ?? '', array('image/jpeg', 'image/png', 'image/gif', 'image/webp'), true)) fail('Цомгийн файл нээх боломжтой зураг биш байна');
    }
}

function board_summary($board)
{
    return array('id' => $board['id'], 'title' => $board['title'], 'revision' => (int)$board['revision'], 'created' => (int)$board['created'], 'updated' => (int)$board['updated'], 'pageCount' => count($board['pages']));
}

function board_read($id)
{
    $board = read_guarded(board_path($id));
    if (!is_array($board) || ($board['id'] ?? '') !== $id || !is_int($board['revision'] ?? null) || !is_array($board['pages'] ?? null) || !is_array($board['requests'] ?? null)) fail('Самбар олдсонгүй', 404);
    return $board;
}

function board_public($board)
{
    $out = board_summary($board); unset($out['pageCount']);
    list($out['width'], $out['height']) = board_dims($board);
    $out['pages'] = $board['pages'];
    foreach ($out['pages'] as &$page) foreach ($page['objects'] as &$object) if ($object['type'] === 'image') {
        $name = $object['name']; $exists = is_file(PHOTOS_DIR . '/' . $name);
        if ($exists) {
            $media = media_item($name);
            $object['url'] = $media['url']; $object['thumb'] = $media['thumb'];
            $object['missing'] = false;
        } else {
            $object['url'] = null; $object['thumb'] = null; $object['missing'] = true;
        }
    }
    unset($page, $object);
    return $out;
}

function board_state_used($state)
{
    $used = 0;
    foreach ($state['boards'] as $row) $used += max(0, (int)($row['bytes'] ?? 0));
    return $used;
}

/** Called only while holding the shared exclusive storage lock. */
function board_index()
{
    $state = read_guarded(BOARD_INDEX);
    if (!is_array($state) || !is_array($state['boards'] ?? null) || !is_array($state['creates'] ?? null)) throw new RuntimeException('Invalid smartboard index');
    $pending = $state['pending'] ?? null;
    if ($pending !== null) {
        if (!is_array($pending) || !is_string($pending['id'] ?? null) || !preg_match('/^[A-Za-z0-9_-]{8,64}$/D', $pending['id'])) throw new RuntimeException('Invalid smartboard transaction');
        $id = $pending['id'];
        if ($pending['operation'] === 'write') {
            $saved = read_guarded(board_path($id));
            $committed = is_array($saved) && ($saved['id'] ?? null) === $id && ($saved['revision'] ?? null) === ($pending['revision'] ?? null);
            if (!$committed) {
                if ($pending['previous'] === null) unset($state['boards'][$id]);
                else $state['boards'][$id] = $pending['previous'];
                if (isset($pending['createRequest'])) unset($state['creates'][$pending['createRequest']]);
            }
        } elseif ($pending['operation'] === 'delete') {
            if (!is_file(board_path($id))) unset($state['boards'][$id]);
        } else throw new RuntimeException('Invalid smartboard transaction operation');
        $state['pending'] = null; $state['used'] = board_state_used($state);
        if (!folder_write_private(BOARD_INDEX, $state)) throw new RuntimeException('Cannot recover smartboard index');
        clearstatcache(true, BOARD_INDEX);
    }
    return $state;
}

/** Includes executable guards and the index; safe inside another storage transaction. */
function board_used_bytes()
{
    if (!is_file(BOARD_INDEX)) return 0;
    $state = read_guarded(BOARD_INDEX);
    if (!is_array($state) || !is_array($state['boards'] ?? null)) throw new RuntimeException('Invalid smartboard index');
    clearstatcache(true, BOARD_INDEX); clearstatcache(true, BOARD_DIR . '/.htaccess');
    return board_state_used($state) + max(0, (int)@filesize(BOARD_INDEX)) + max(0, (int)@filesize(BOARD_DIR . '/.htaccess'));
}

function board_check_quota($state, $pendingState, $documentGrowth)
{
    clearstatcache(true, BOARD_INDEX);
    $growth = $documentGrowth + board_json_bytes($pendingState) - (int)@filesize(BOARD_INDEX);
    // media_used_bytes includes board_used_bytes once; all writers share this lock.
    if (media_used_bytes() + tmp_reserved_bytes() + folder_used_bytes() + doodle_used_bytes() + $growth > quota_bytes()) fail('Самбар хадгалах зай хүрэлцэхгүй байна', 507);
    $free = @disk_free_space(BOARD_DIR);
    if ($growth > 0 && $free !== false && $free < $growth + FOLDER_DISK_MARGIN) fail('Серверийн сул зай хүрэлцэхгүй байна', 507);
}

/** Index first reserves quota. Its pending record reconciles either atomic outcome. */
function board_commit($state, $board, $createRequest = null, $createFingerprint = null)
{
    $id = $board['id']; $bytes = board_json_bytes($board);
    if ($bytes > BOARD_MAX_BYTES) fail('Нэг самбар хамгийн ихдээ 6 МБ байна', 413);
    $next = $state;
    $next['boards'][$id] = array_merge(board_summary($board), array('bytes' => $bytes));
    if ($createRequest !== null) {
        $next['creates'][$createRequest] = array('id' => $id, 'fingerprint' => $createFingerprint);
        if (count($next['creates']) > 256) $next['creates'] = array_slice($next['creates'], -256, null, true);
    }
    $next['used'] = board_state_used($next);
    $next['pending'] = array('operation' => 'write', 'id' => $id, 'revision' => $board['revision'], 'previous' => $state['boards'][$id] ?? null);
    if ($createRequest !== null) $next['pending']['createRequest'] = $createRequest;
    board_check_quota($state, $next, $bytes - (int)($state['boards'][$id]['bytes'] ?? 0));
    if (!folder_write_private(BOARD_INDEX, $next)) throw new RuntimeException('Cannot reserve smartboard storage');
    clearstatcache(true, BOARD_INDEX);
    if (!folder_write_private(board_path($id), $board)) {
        folder_write_private(BOARD_INDEX, $state);
        clearstatcache(true, BOARD_INDEX);
        throw new RuntimeException('Cannot save smartboard');
    }
    clearstatcache(true, board_path($id));
    $next['pending'] = null;
    if (!folder_write_private(BOARD_INDEX, $next)) throw new RuntimeException('Cannot finish smartboard index');
    clearstatcache(true, BOARD_INDEX);
}

function board_conflict($board)
{
    fail('Самбар өөр төхөөрөмж дээр өөрчлөгдсөн байна. Шинэ хувилбарыг ачаална уу.', 409, array('conflict' => true, 'board' => board_public($board)));
}

function handle_board_action($action)
{
    if (strncmp($action, 'board_', 6) !== 0) return;
    if (!in_array($action, array('board_list', 'board_get', 'board_create', 'board_save', 'board_delete'), true)) fail('Самбарын үйлдэл олдсонгүй', 404);
    $read = in_array($action, array('board_list', 'board_get'), true);
    if ($read) {
        if (!in_array($_SERVER['REQUEST_METHOD'], array('GET', 'HEAD'), true)) fail('GET хүсэлт шаардлагатай', 405);
        require_member(false);
    } else { require_post(); require_member(); }
    $body = $read ? $_GET : board_body();
    board_prepare();
    $lock = folder_storage_lock();
    try {
        $state = board_index();
        if ($action === 'board_list') {
            $boards = array_values($state['boards']);
            foreach ($boards as &$row) unset($row['bytes']);
            unset($row);
            usort($boards, function ($a, $b) { return $b['updated'] === $a['updated'] ? strcmp($a['id'], $b['id']) : $b['updated'] <=> $a['updated']; });
            json_out(array('ok' => true, 'boards' => $boards, 'limits' => array('maxPages' => BOARD_MAX_PAGES, 'maxObjectsPerPage' => BOARD_MAX_PAGE_OBJECTS, 'maxBytes' => BOARD_MAX_BYTES, 'width' => BOARD_WIDTH, 'height' => BOARD_HEIGHT, 'minSide' => BOARD_MIN_SIDE, 'maxSide' => BOARD_MAX_SIDE)));
        }
        if ($action === 'board_create') {
            $request = board_request_id($body['requestId'] ?? null);
            $title = board_text($body['title'] ?? '', 160); if ($title === '') $title = 'Самбар';
            list($paperWidth, $paperHeight) = board_paper_size($body['width'] ?? null, $body['height'] ?? null);
            $fingerprint = hash('sha256', $title . '|' . $paperWidth . 'x' . $paperHeight);
            if (isset($state['creates'][$request])) {
                $entry = $state['creates'][$request];
                if (!hash_equals($entry['fingerprint'], $fingerprint)) fail('Хадгалалтын хүсэлтийн дугаар давхардсан байна', 409);
                if (!isset($state['boards'][$entry['id']])) fail('Энэ хүсэлтээр үүсгэсэн самбар устсан байна. Шинэ самбар үүсгэнэ үү.', 409);
                json_out(array('ok' => true, 'board' => board_public(board_read($entry['id'])), 'replayed' => true));
            }
            if (count($state['boards']) >= BOARD_MAX_BOARDS) fail('Самбарын тоо дээд хязгаарт хүрсэн байна', 507);
            $board = array('id' => bin2hex(random_bytes(16)), 'title' => $title, 'revision' => 1, 'created' => time(), 'updated' => time(), 'width' => $paperWidth, 'height' => $paperHeight, 'pages' => array(array('id' => bin2hex(random_bytes(16)), 'title' => 'Хуудас 1', 'background' => 'plain', 'objects' => array())), 'requests' => array());
            board_commit($state, $board, $request, $fingerprint);
            json_out(array('ok' => true, 'board' => board_public($board)));
        }
        $id = board_id($body['id'] ?? null);
        if (!isset($state['boards'][$id])) fail('Самбар олдсонгүй', 404);
        $board = board_read($id);
        if ($action === 'board_get') json_out(array('ok' => true, 'board' => board_public($board)));
        $revision = board_revision($body['revision'] ?? null);
        if ($action === 'board_save') {
            $request = board_request_id($body['requestId'] ?? null);
            $title = board_text($body['title'] ?? $board['title'], 160); if ($title === '') $title = 'Самбар';
            list($paperWidth, $paperHeight) = board_dims($board);
            list($pages, $images) = board_validate_pages($body['pages'] ?? null, $paperWidth, $paperHeight);
            $fingerprint = hash('sha256', json_encode(array($revision, $title, $pages), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            if (isset($board['requests'][$request])) {
                $entry = $board['requests'][$request];
                if (!hash_equals($entry['fingerprint'], $fingerprint)) fail('Хадгалалтын хүсэлтийн дугаар давхардсан байна', 409, array('conflict' => true, 'board' => board_public($board)));
                json_out(array('ok' => true, 'board' => board_public($board), 'replayed' => true, 'savedRevision' => $entry['revision']));
            }
            if ($revision !== $board['revision']) board_conflict($board);
            board_validate_album_refs($images, $board);
            $board['title'] = $title; $board['pages'] = $pages; $board['revision']++; $board['updated'] = time();
            $board['requests'][$request] = array('fingerprint' => $fingerprint, 'revision' => $board['revision']);
            if (count($board['requests']) > BOARD_REQUEST_HISTORY) $board['requests'] = array_slice($board['requests'], -BOARD_REQUEST_HISTORY, null, true);
            board_commit($state, $board);
            json_out(array('ok' => true, 'board' => board_public($board)));
        }
        if ($revision !== $board['revision']) board_conflict($board);
        $next = $state;
        $next['pending'] = array('operation' => 'delete', 'id' => $id);
        if (!folder_write_private(BOARD_INDEX, $next)) throw new RuntimeException('Cannot prepare smartboard deletion');
        if (!@unlink(board_path($id)) && is_file(board_path($id))) {
            folder_write_private(BOARD_INDEX, $state);
            throw new RuntimeException('Cannot delete smartboard');
        }
        unset($next['boards'][$id]); $next['used'] = board_state_used($next); $next['pending'] = null;
        if (!folder_write_private(BOARD_INDEX, $next)) throw new RuntimeException('Cannot finish smartboard deletion');
        clearstatcache(true, BOARD_INDEX); clearstatcache(true, board_path($id));
        json_out(array('ok' => true, 'id' => $id));
    } finally { folder_storage_unlock($lock); }
}

<?php
/*
 * Intercom: the teacher records a short announcement (or replays an earlier one). Every listening display first plays the
 * intercom chime (assets/audio/music.mp3) all the way to its end and only then the teacher's recording.
 * The server stores the newest recordings, tells the displays which one is the latest (poll) and tells the teacher how many
 * displays are listening and whether the chime file is present (status -> chimeOk).
 */
if (!defined('C122')) { http_response_code(404); exit; }

define('IC_DIR', DB_DIR . '/intercom');
define('IC_STATE_FILE', DB_DIR . '/intercom-state.php');
define('IC_LOCK_FILE', DB_DIR . '/intercom-lock.php');
define('IC_COOKIE', 'c122_intercom');
define('IC_COOKIE_TTL', 30 * 86400);     // a paired display stays paired for 30 days after its last poll
define('IC_MAX_BYTES', 8 * 1024 * 1024);
define('IC_MAX_SECONDS', 120);
define('IC_KEEP', 5);                    // newest recordings kept on the server
define('IC_ONLINE', 12);                 // seconds a display counts as listening after its last poll
define('IC_CHIME_FILE', 'assets/audio/music.mp3');   // played before every announcement; always lowercase (Linux is case-sensitive)

class IntercomException extends RuntimeException
{
    public $httpStatus;
    public $errorId;
    public function __construct($message, $status = 400, $id = 'invalid_request')
    {
        parent::__construct($message);
        $this->httpStatus = $status;
        $this->errorId = $id;
    }
}

function ic_fail($message, $status = 400, $id = 'invalid_request')
{
    throw new IntercomException($message, $status, $id);
}

/* ---------- who may listen ---------- */

function ic_token_new()
{
    $secret = site_secret();
    if ($secret === '') return '';
    $album = album_cfg();
    $payload = b64u_enc(json_encode(array('v' => (int)($album['version'] ?? 1), 'exp' => time() + IC_COOKIE_TTL, 'n' => bin2hex(random_bytes(8)))));
    return $payload . '.' . b64u_enc(hash_hmac('sha256', 'intercom|' . $payload, $secret, true));
}

/** Returns the token's expiry timestamp, or 0 when the token is not valid. */
function ic_token_exp($token)
{
    $secret = site_secret();
    if ($secret === '' || !is_string($token) || strlen($token) > 512 || substr_count($token, '.') !== 1) return 0;
    list($payload, $sig) = explode('.', $token, 2);
    if (!hash_equals(b64u_enc(hash_hmac('sha256', 'intercom|' . $payload, $secret, true)), $sig)) return 0;
    $claims = json_decode(b64u_dec($payload), true);
    if (!is_array($claims)) return 0;
    $album = album_cfg();
    if ((int)($claims['v'] ?? -1) !== (int)($album['version'] ?? 1)) return 0;   // a new album code unpairs old displays
    $exp = (int)($claims['exp'] ?? 0);
    return $exp > time() ? $exp : 0;
}

function ic_listener_ok()
{
    return is_admin() || ic_token_exp(cookie_val(IC_COOKIE)) > 0;
}

function ic_admin_required($post = false)
{
    if (!is_admin()) ic_fail('Багшийн удирдлагын нэвтрэлт шаардлагатай.', 403, 'teacher_required');
    if ($post && !csrf_ok()) ic_fail('Хамгаалалтын токен буруу байна. Хуудсаа дахин ачаална уу.', 403, 'csrf');
}

function ic_listener_id($value)
{
    $value = is_string($value) ? $value : '';
    return preg_match('/^[a-f0-9]{8,32}$/D', $value) ? $value : '';
}

/* ---------- state ---------- */

function ic_state_default()
{
    return array('v' => 1, 'seq' => 0, 'items' => array(), 'listeners' => array());
}

function ic_state_read()
{
    $state = read_guarded(IC_STATE_FILE);
    if (!is_array($state) || ($state['v'] ?? 0) !== 1) return ic_state_default();
    if (!isset($state['items']) || !is_array($state['items'])) $state['items'] = array();
    if (!isset($state['listeners']) || !is_array($state['listeners'])) $state['listeners'] = array();
    return $state;
}

function ic_locked($callback)
{
    if (!is_dir(DB_DIR) && !@mkdir(DB_DIR, 0775, true)) ic_fail('Серверийн хадгалах хавтас бичигдэхгүй байна.', 503, 'storage_unavailable');
    $handle = @fopen(IC_LOCK_FILE, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) ic_fail('Intercom түр завгүй байна. Дахин оролдоно уу.', 503, 'storage_unavailable');
    try {
        $stat = fstat($handle);
        if (($stat['size'] ?? 0) === 0) { fwrite($handle, GUARD_LINE . "\n"); fflush($handle); }
        @chmod(IC_LOCK_FILE, 0600);
        $state = ic_state_read();
        $original = $state;
        $result = $callback($state);
        if ($state !== $original) {
            if (!write_guarded(IC_STATE_FILE, $state)) ic_fail('Intercom-ийн төлөв хадгалагдсангүй.', 503, 'storage_unavailable');
            @chmod(IC_STATE_FILE, 0600);
        }
        return $result;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function ic_prune_listeners(&$state, $now)
{
    foreach ($state['listeners'] as $id => $row) {
        if (!is_array($row) || (int)($row['t'] ?? 0) < $now - 600) unset($state['listeners'][$id]);
    }
}

function ic_file($id)
{
    return IC_DIR . '/' . $id . '.bin';
}

function ic_item_public($item, $now)
{
    return array(
        'seq' => (int)$item['seq'],
        'id' => (string)$item['id'],
        'mime' => (string)$item['mime'],
        'bytes' => (int)$item['bytes'],
        'duration' => (float)$item['duration'],
        'at' => (int)$item['at'],
        'age' => max(0, $now - (int)$item['at']),
    );
}

/** Identify the audio container from its first bytes; the browser-supplied type is never trusted. */
function ic_sniff($raw)
{
    if (strlen($raw) < 16) return '';
    if (substr($raw, 0, 4) === "\x1A\x45\xDF\xA3") return 'audio/webm';
    if (substr($raw, 0, 4) === 'OggS') return 'audio/ogg';
    if (substr($raw, 4, 4) === 'ftyp') return 'audio/mp4';
    if (substr($raw, 0, 4) === 'RIFF' && substr($raw, 8, 4) === 'WAVE') return 'audio/wav';
    if (substr($raw, 0, 3) === 'ID3' || (ord($raw[0]) === 0xFF && (ord($raw[1]) & 0xE0) === 0xE0)) return 'audio/mpeg';
    return '';
}

/* ---------- actions ---------- */

/** Stores one recording as the newest item (caller holds the lock and has already written the file). */
function ic_commit(&$state, $id, $mime, $bytes, $duration, $now)
{
    $state['seq'] = (int)$state['seq'] + 1;
    $state['items'][] = array('seq' => $state['seq'], 'id' => $id, 'mime' => $mime, 'bytes' => (int)$bytes, 'duration' => round((float)$duration, 1), 'at' => $now);
    while (count($state['items']) > IC_KEEP) {
        $old = array_shift($state['items']);
        @unlink(ic_file($old['id']));
    }
    ic_prune_listeners($state, $now);
    // Recordings that no longer have a state row (interrupted sends) are removed after an hour.
    $known = array();
    foreach ($state['items'] as $item) $known[$item['id'] . '.bin'] = true;
    foreach ((array)@scandir(IC_DIR) as $name) {
        if (!preg_match('/^[a-f0-9]{32}\.bin$/D', $name) || isset($known[$name])) continue;
        $path = IC_DIR . '/' . $name;
        if (@filemtime($path) < $now - 3600) @unlink($path);
    }
    return array('ok' => true, 'seq' => $state['seq'], 'item' => ic_item_public(end($state['items']), $now), 'listening' => ic_count_online($state, $now));
}

function ic_send()
{
    ic_admin_required(true);
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > IC_MAX_BYTES) ic_fail('Бичлэг хэт урт байна.', 413, 'too_large');
    $input = fopen('php://input', 'rb');
    $raw = $input ? stream_get_contents($input, IC_MAX_BYTES + 1) : false;
    if ($input) fclose($input);
    if ($raw === false || $raw === '') ic_fail('Бичлэг хоосон байна.', 400, 'empty');
    if (strlen($raw) > IC_MAX_BYTES) ic_fail('Бичлэг хэт урт байна.', 413, 'too_large');
    $mime = ic_sniff($raw);
    if ($mime === '') ic_fail('Энэ дууны формат дэмжигдэхгүй байна.', 415, 'unsupported_type');
    $duration = max(0.0, min((float)IC_MAX_SECONDS, (float)($_GET['duration'] ?? 0)));
    ensure_dirs();
    if (!is_dir(IC_DIR) && !@mkdir(IC_DIR, 0775, true)) ic_fail('Серверийн хадгалах хавтас бичигдэхгүй байна.', 503, 'storage_unavailable');
    $id = bin2hex(random_bytes(16));
    if (!write_file_atomic(ic_file($id), $raw)) ic_fail('Бичлэг хадгалагдсангүй.', 503, 'storage_unavailable');
    $now = time();
    try {
        return ic_locked(function (&$state) use ($id, $mime, $raw, $duration, $now) {
            return ic_commit($state, $id, $mime, strlen($raw), $duration, $now);
        });
    } catch (Throwable $error) {
        @unlink(ic_file($id));
        throw $error;
    }
}

/** Plays an earlier announcement again: its stored file is copied to a brand-new item, so every display treats it as fresh. */
function ic_resend()
{
    ic_admin_required(true);
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > 4096) ic_fail('Хүсэлт хэт том байна.', 413, 'too_large');
    $input = fopen('php://input', 'rb');
    $raw = $input ? stream_get_contents($input, 4097) : false;
    if ($input) fclose($input);
    if ($raw === false || $raw === '' || strlen($raw) > 4096) ic_fail('Хүсэлтийн агуулга буруу байна.', 400, 'invalid_request');
    $body = json_decode($raw, true);
    $source = is_array($body) && is_string($body['id'] ?? null) ? $body['id'] : '';
    if (!preg_match('/^[a-f0-9]{32}$/D', $source)) ic_fail('Бичлэг олдсонгүй.', 404, 'not_found');
    ensure_dirs();
    if (!is_dir(IC_DIR) && !@mkdir(IC_DIR, 0775, true)) ic_fail('Серверийн хадгалах хавтас бичигдэхгүй байна.', 503, 'storage_unavailable');
    $id = bin2hex(random_bytes(16));
    $now = time();
    try {
        return ic_locked(function (&$state) use ($source, $id, $now) {
            $found = null;
            foreach ($state['items'] as $row) if ($row['id'] === $source) { $found = $row; break; }
            $path = ic_file($source);
            if (!$found || !is_file($path)) ic_fail('Бичлэг олдсонгүй.', 404, 'not_found');
            $raw = @file_get_contents($path);
            if ($raw === false || $raw === '' || strlen($raw) > IC_MAX_BYTES || ic_sniff($raw) === '') ic_fail('Бичлэг уншигдсангүй.', 503, 'storage_unavailable');
            if (!write_file_atomic(ic_file($id), $raw)) ic_fail('Бичлэг хадгалагдсангүй.', 503, 'storage_unavailable');
            return ic_commit($state, $id, (string)$found['mime'], strlen($raw), (float)$found['duration'], $now);
        });
    } catch (Throwable $error) {
        @unlink(ic_file($id));
        throw $error;
    }
}

function ic_count_online($state, $now)
{
    $count = 0;
    foreach ($state['listeners'] as $row) if (is_array($row) && (int)($row['t'] ?? 0) >= $now - IC_ONLINE) $count++;
    return $count;
}

function ic_poll()
{
    if (!ic_listener_ok()) ic_fail('Intercom сонсохын тулд цомгийн кодоор нэвтэрнэ үү.', 403, 'listener_required');
    $listener = ic_listener_id($_GET['l'] ?? '');
    $ready = !empty($_GET['r']);
    $ack = max(0, (int)($_GET['ack'] ?? 0));
    $now = time();
    $state = ic_state_read();
    if ($listener !== '') {
        $mine = isset($state['listeners'][$listener]) && is_array($state['listeners'][$listener]) ? $state['listeners'][$listener] : null;
        $ack = max($ack, (int)($mine['ack'] ?? 0));
        $stale = !$mine || $now - (int)($mine['t'] ?? 0) >= 5 || (bool)($mine['ready'] ?? false) !== $ready || (int)($mine['ack'] ?? 0) !== $ack;
        if ($stale) {
            $state = ic_locked(function (&$locked) use ($listener, $ready, $ack, $now) {
                $locked['listeners'][$listener] = array('t' => $now, 'ready' => $ready, 'ack' => $ack);
                ic_prune_listeners($locked, $now);
                return $locked;
            });
        }
    }
    // Sliding pairing: a display that keeps polling keeps its 30 days.
    $exp = ic_token_exp(cookie_val(IC_COOKIE));
    if ($exp > 0 && $exp - time() < IC_COOKIE_TTL - 86400) {
        $token = ic_token_new();
        if ($token !== '') set_cookie_value(IC_COOKIE, $token, time() + IC_COOKIE_TTL);
    }
    $latest = $state['items'] ? ic_item_public(end($state['items']), $now) : null;
    return array('ok' => true, 'seq' => (int)$state['seq'], 'now' => $now, 'latest' => $latest);
}

function ic_status()
{
    ic_admin_required(false);
    $now = time();
    $state = ic_state_read();
    $latest = $state['items'] ? end($state['items']) : null;
    $online = 0; $ready = 0; $delivered = 0;
    foreach ($state['listeners'] as $row) {
        if (!is_array($row)) continue;
        $isOnline = (int)($row['t'] ?? 0) >= $now - IC_ONLINE;
        if ($isOnline) { $online++; if (!empty($row['ready'])) $ready++; }
        if ($latest && (int)($row['ack'] ?? 0) >= (int)$latest['seq'] && (int)($row['t'] ?? 0) >= (int)$latest['at']) $delivered++;
    }
    $items = array();
    foreach (array_reverse($state['items']) as $item) $items[] = ic_item_public($item, $now);
    return array('ok' => true, 'now' => $now, 'seq' => (int)$state['seq'], 'listening' => $online, 'ready' => $ready, 'delivered' => $delivered, 'items' => $items, 'maxSeconds' => IC_MAX_SECONDS, 'chime' => IC_CHIME_FILE, 'chimeOk' => is_file(C122_ROOT . '/' . IC_CHIME_FILE));
}

function ic_clear()
{
    ic_admin_required(true);
    return ic_locked(function (&$state) {
        foreach ($state['items'] as $item) @unlink(ic_file($item['id']));
        $state['items'] = array();
        return array('ok' => true);
    });
}

/** Pairs this browser as a display: needs the album code (or the teacher's login) once. */
function ic_enable()
{
    if (!is_member()) ic_fail('Эхлээд Цомгийн кодоор нэвтэрнэ үү.', 403, 'member_required');
    if (!csrf_ok()) ic_fail('Хамгаалалтын токен буруу байна. Хуудсаа дахин ачаална уу.', 403, 'csrf');
    $token = ic_token_new();
    if ($token === '') ic_fail('Intercom-ийн хамгаалалт бэлэн биш байна.', 503, 'storage_unavailable');
    set_cookie_value(IC_COOKIE, $token, time() + IC_COOKIE_TTL);
    return array('ok' => true);
}

function ic_stream($id)
{
    if (!ic_listener_ok()) ic_fail('Intercom сонсохын тулд цомгийн кодоор нэвтэрнэ үү.', 403, 'listener_required');
    if (!is_string($id) || !preg_match('/^[a-f0-9]{32}$/D', $id)) ic_fail('Бичлэг олдсонгүй.', 404, 'not_found');
    $item = null;
    foreach (ic_state_read()['items'] as $row) if ($row['id'] === $id) { $item = $row; break; }
    $file = ic_file($id);
    if (!$item || !is_file($file)) ic_fail('Бичлэг олдсонгүй.', 404, 'not_found');
    $size = (int)filesize($file);
    $start = 0; $end = $size - 1; $status = 200;
    if (isset($_SERVER['HTTP_RANGE']) && preg_match('/^bytes=(\d*)-(\d*)$/D', trim($_SERVER['HTTP_RANGE']), $m) && ($m[1] !== '' || $m[2] !== '')) {
        if ($m[1] === '') $start = max(0, $size - (int)$m[2]);
        else { $start = (int)$m[1]; if ($m[2] !== '') $end = min($end, (int)$m[2]); }
        if ($start > $end || $start >= $size) { http_response_code(416); header('Content-Range: bytes */' . $size); exit; }
        $status = 206;
    }
    http_response_code($status);
    header('Content-Type: ' . $item['mime']);
    header('Accept-Ranges: bytes');
    header('Content-Length: ' . ($end - $start + 1));
    header('Cache-Control: private, max-age=600');
    header('Content-Disposition: inline; filename="intercom"');
    if ($status === 206) header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
    $handle = fopen($file, 'rb');
    if (!$handle) exit;
    fseek($handle, $start);
    $left = $end - $start + 1;
    while ($left > 0 && !feof($handle)) {
        $chunk = fread($handle, min(65536, $left));
        if ($chunk === false || $chunk === '') break;
        echo $chunk;
        $left -= strlen($chunk);
    }
    fclose($handle);
    exit;
}

function ic_dispatch($action, $method)
{
    if ($action === 'poll' && $method === 'GET') return ic_poll();
    if ($action === 'status' && $method === 'GET') return ic_status();
    if ($action === 'send' && $method === 'POST') return ic_send();
    if ($action === 'resend' && $method === 'POST') return ic_resend();
    if ($action === 'clear' && $method === 'POST') return ic_clear();
    if ($action === 'enable' && $method === 'POST') return ic_enable();
    ic_fail('Үйлдэл олдсонгүй.', $method === 'GET' || $method === 'POST' ? 404 : 405, 'not_found');
}

<?php
/*
 * Teacher's note (Багшийн тэмдэглэл): the teacher writes a short note in the admin panel and picks its kind
 * (urgent / regular / info). Every classroom board that is listening plays assets/audio/teacher.mp3 and then shows the note
 * full screen. This file keeps the newest notes, tells the boards which one is the latest (poll) and tells the teacher how
 * many boards are online and how many of them have received the latest note.
 *
 * One small guarded JSON state (database/note-state.php) behind one flock, same idea as inc/intercom.php.
 * Boards are the paired displays of the intercom feature (ic_listener_ok()); the teacher is is_admin() + X-CSRF.
 */
if (!defined('C122')) { http_response_code(404); exit; }

require_once __DIR__ . '/intercom.php';   // ic_listener_ok(), ic_listener_id()

define('NOTE_STATE_FILE', DB_DIR . '/note-state.php');
define('NOTE_LOCK_FILE', DB_DIR . '/note-lock.php');
define('NOTE_KEEP', 20);                  // newest notes kept on the server
define('NOTE_ONLINE', 12);                // seconds a board counts as online after its last poll
define('NOTE_BOARD_KEEP', 600);           // forget boards that were silent this long
define('NOTE_MAX_BOARDS', 64);
define('NOTE_TEXT_MAX', 600);             // characters
define('NOTE_TITLE_MAX', 80);
define('NOTE_BODY_MAX', 16384);           // bytes of a request body
define('NOTE_SENDS_PER_MIN', 10);
define('NOTE_SOUND_FILE', 'assets/audio/teacher.mp3');   // always lowercase (Linux is case-sensitive)

class NoteException extends RuntimeException
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

function note_fail($message, $status = 400, $id = 'invalid_request')
{
    throw new NoteException($message, $status, $id);
}

/* ---------- who may do what ---------- */

function note_admin_required($post = false)
{
    if (!is_admin()) note_fail('Багшийн удирдлагын нэвтрэлт шаардлагатай.', 403, 'teacher_required');
    if ($post && !csrf_ok()) note_fail('Хамгаалалтын токен буруу байна. Хуудсаа дахин ачаална уу.', 403, 'csrf');
}

function note_types()
{
    return array('urgent', 'normal', 'info');
}

/* ---------- input ---------- */

function note_body()
{
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > NOTE_BODY_MAX) note_fail('Хүсэлт хэт том байна.', 413, 'too_large');
    $input = fopen('php://input', 'rb');
    $raw = $input ? stream_get_contents($input, NOTE_BODY_MAX + 1) : false;
    if ($input) fclose($input);
    if ($raw === false || $raw === '') note_fail('Хүсэлтийн агуулга хоосон байна.', 400, 'invalid_request');
    if (strlen($raw) > NOTE_BODY_MAX) note_fail('Хүсэлт хэт том байна.', 413, 'too_large');
    $data = json_decode($raw, true, 8);
    if (!is_array($data) || is_list_array($data)) note_fail('Хүсэлтийн агуулга буруу байна.', 400, 'invalid_request');
    return $data;
}

function note_len($s)
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen(utf8_decode($s));
}

/** Keeps line breaks (at most one empty line in a row) but drops control characters and runs of spaces. */
function note_clean_text($value)
{
    if (!is_string($value)) return '';
    if (!preg_match('//u', $value)) return '';
    $s = str_replace(array("\r\n", "\r"), "\n", $value);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $s);
    if ($s === null) return '';
    $s = preg_replace('/[ \t\x{00A0}]+/u', ' ', $s);
    if ($s === null) return '';
    $s = preg_replace('/ ?\n ?/u', "\n", $s);
    if ($s === null) return '';
    $s = preg_replace('/\n{3,}/', "\n\n", $s);
    if ($s === null) return '';
    return trim($s);
}

function note_title_arg($value)
{
    if ($value === null || $value === '') return '';
    if (!is_string($value) || !preg_match('//u', $value)) note_fail('Гарчиг буруу байна.', 400, 'bad_title');
    $title = clean_str($value, 400);
    if (note_len($title) > NOTE_TITLE_MAX) note_fail('Гарчиг хэт урт байна (' . NOTE_TITLE_MAX . ' тэмдэгтээс хэтрэхгүй).', 400, 'title_too_long');
    return $title;
}

function note_text_arg($value)
{
    if (!is_string($value)) note_fail('Тэмдэглэлийн текст оруулна уу.', 400, 'empty');
    if (!preg_match('//u', $value)) note_fail('Тэмдэглэлийн текст буруу байна.', 400, 'bad_text');
    $text = note_clean_text($value);
    if ($text === '') note_fail('Тэмдэглэлийн текст оруулна уу.', 400, 'empty');
    if (note_len($text) > NOTE_TEXT_MAX) note_fail('Тэмдэглэл хэт урт байна (' . NOTE_TEXT_MAX . ' тэмдэгтээс хэтрэхгүй).', 400, 'too_long');
    return $text;
}

function note_type_arg($value)
{
    if (!is_string($value) || !in_array($value, note_types(), true)) note_fail('Тэмдэглэлийн төрөл буруу байна.', 400, 'bad_type');
    return $value;
}

function note_id_arg($value)
{
    return is_string($value) && preg_match('/^[a-f0-9]{32}$/D', $value) ? $value : '';
}

/* ---------- state ---------- */

function note_state_default()
{
    return array('v' => 1, 'seq' => 0, 'items' => array(), 'boards' => array(), 'sends' => array());
}

/** Fills missing fields and drops damaged rows, so a hand-edited file can never crash a request. */
function note_state_read()
{
    $state = read_guarded(NOTE_STATE_FILE);
    if (!is_array($state) || ($state['v'] ?? 0) !== 1) return note_state_default();
    $items = array();
    if (isset($state['items']) && is_array($state['items'])) {
        foreach ($state['items'] as $row) {
            if (!is_array($row) || !note_id_arg($row['id'] ?? '') || !in_array($row['type'] ?? '', note_types(), true)) continue;
            if (!is_string($row['text'] ?? null) || $row['text'] === '') continue;
            $items[] = array(
                'seq' => (int)($row['seq'] ?? 0),
                'id' => $row['id'],
                'type' => $row['type'],
                'title' => is_string($row['title'] ?? null) ? $row['title'] : '',
                'text' => $row['text'],
                'at' => (int)($row['at'] ?? 0),
            );
        }
    }
    $state['items'] = $items;
    $state['seq'] = max((int)($state['seq'] ?? 0), $items ? (int)end($items)['seq'] : 0);
    $state['boards'] = isset($state['boards']) && is_array($state['boards']) ? $state['boards'] : array();
    $state['sends'] = isset($state['sends']) && is_array($state['sends']) ? array_values(array_map('intval', $state['sends'])) : array();
    return $state;
}

function note_locked($callback)
{
    if (!is_dir(DB_DIR) && !@mkdir(DB_DIR, 0775, true)) note_fail('Серверийн хадгалах хавтас бичигдэхгүй байна.', 503, 'storage_unavailable');
    $handle = @fopen(NOTE_LOCK_FILE, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) note_fail('Тэмдэглэл түр завгүй байна. Дахин оролдоно уу.', 503, 'storage_unavailable');
    try {
        $stat = fstat($handle);
        if (($stat['size'] ?? 0) === 0) { fwrite($handle, GUARD_LINE . "\n"); fflush($handle); }
        @chmod(NOTE_LOCK_FILE, 0600);
        $state = note_state_read();
        $original = $state;
        $result = $callback($state);
        if ($state !== $original) {
            if (!write_guarded(NOTE_STATE_FILE, $state)) note_fail('Тэмдэглэл хадгалагдсангүй.', 503, 'storage_unavailable');
            @chmod(NOTE_STATE_FILE, 0600);
        }
        return $result;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function note_prune_boards(&$state, $now)
{
    foreach ($state['boards'] as $id => $row) {
        if (!is_array($row) || (int)($row['t'] ?? 0) < $now - NOTE_BOARD_KEEP) unset($state['boards'][$id]);
    }
    if (count($state['boards']) > NOTE_MAX_BOARDS) {
        uasort($state['boards'], function ($a, $b) { return (int)($b['t'] ?? 0) <=> (int)($a['t'] ?? 0); });
        $state['boards'] = array_slice($state['boards'], 0, NOTE_MAX_BOARDS, true);
    }
}

function note_count_online($state, $now)
{
    $count = 0;
    foreach ($state['boards'] as $row) if (is_array($row) && (int)($row['t'] ?? 0) >= $now - NOTE_ONLINE) $count++;
    return $count;
}

function note_public($item, $now)
{
    return array(
        'seq' => (int)$item['seq'],
        'id' => (string)$item['id'],
        'type' => (string)$item['type'],
        'title' => (string)$item['title'],
        'text' => (string)$item['text'],
        'at' => (int)$item['at'],
        'age' => max(0, $now - (int)$item['at']),
    );
}

/* ---------- actions ---------- */

/** Stores one note as the newest one. The caller holds the lock; this also enforces the send rate. */
function note_commit(&$state, $type, $title, $text, $now)
{
    $recent = array();
    foreach ($state['sends'] as $t) if ($t > $now - 60) $recent[] = $t;
    if (count($recent) >= NOTE_SENDS_PER_MIN) {
        note_fail('Хэт олон тэмдэглэл илгээлээ. Нэг минут хүлээгээд дахин оролдоно уу.', 429, 'rate_limited');
    }
    $recent[] = $now;
    $state['sends'] = $recent;
    $state['seq'] = (int)$state['seq'] + 1;
    $state['items'][] = array(
        'seq' => $state['seq'],
        'id' => bin2hex(random_bytes(16)),
        'type' => $type,
        'title' => $title,
        'text' => $text,
        'at' => $now,
    );
    while (count($state['items']) > NOTE_KEEP) array_shift($state['items']);
    note_prune_boards($state, $now);
    return array('ok' => true, 'seq' => $state['seq'], 'item' => note_public(end($state['items']), $now), 'boards' => note_count_online($state, $now));
}

function note_send()
{
    note_admin_required(true);
    $body = note_body();
    $type = note_type_arg($body['type'] ?? null);
    $title = note_title_arg($body['title'] ?? '');
    $text = note_text_arg($body['text'] ?? null);
    $now = time();
    return note_locked(function (&$state) use ($type, $title, $text, $now) {
        return note_commit($state, $type, $title, $text, $now);
    });
}

/** Shows an earlier note again: its content becomes a brand-new item, so every board treats it as fresh. */
function note_resend()
{
    note_admin_required(true);
    $body = note_body();
    $source = note_id_arg($body['id'] ?? '');
    if ($source === '') note_fail('Тэмдэглэл олдсонгүй.', 404, 'not_found');
    $now = time();
    return note_locked(function (&$state) use ($source, $now) {
        $found = null;
        foreach ($state['items'] as $row) if ($row['id'] === $source) { $found = $row; break; }
        if (!$found) note_fail('Тэмдэглэл олдсонгүй.', 404, 'not_found');
        return note_commit($state, $found['type'], $found['title'], $found['text'], $now);
    });
}

function note_delete()
{
    note_admin_required(true);
    $body = note_body();
    $id = note_id_arg($body['id'] ?? '');
    if ($id === '') note_fail('Тэмдэглэл олдсонгүй.', 404, 'not_found');
    return note_locked(function (&$state) use ($id) {
        $kept = array();
        $found = false;
        foreach ($state['items'] as $row) {
            if ($row['id'] === $id) { $found = true; continue; }
            $kept[] = $row;
        }
        if (!$found) note_fail('Тэмдэглэл олдсонгүй.', 404, 'not_found');
        $state['items'] = $kept;
        return array('ok' => true);
    });
}

function note_clear()
{
    note_admin_required(true);
    return note_locked(function (&$state) {
        $state['items'] = array();
        return array('ok' => true);
    });
}

/** Teacher: newest notes first, how many boards are online and how many of them already received the latest note. */
function note_status()
{
    note_admin_required(false);
    $now = time();
    $state = note_state_read();
    $latest = $state['items'] ? end($state['items']) : null;
    $online = 0;
    $delivered = 0;
    foreach ($state['boards'] as $row) {
        if (!is_array($row) || (int)($row['t'] ?? 0) < $now - NOTE_ONLINE) continue;
        $online++;
        if ($latest && (int)($row['ack'] ?? 0) >= (int)$latest['seq']) $delivered++;
    }
    $items = array();
    foreach (array_reverse($state['items']) as $item) $items[] = note_public($item, $now);
    return array(
        'ok' => true, 'now' => $now, 'seq' => (int)$state['seq'], 'boards' => $online, 'delivered' => $delivered, 'items' => $items,
        'maxText' => NOTE_TEXT_MAX, 'maxTitle' => NOTE_TITLE_MAX, 'sound' => NOTE_SOUND_FILE, 'soundOk' => is_file(C122_ROOT . '/' . NOTE_SOUND_FILE),
    );
}

/** Board: registers that this board is online (and which note it has handled) and returns the latest note. */
function note_poll()
{
    if (!ic_listener_ok()) note_fail('Тэмдэглэл хүлээн авахын тулд цомгийн кодоор нэвтэрнэ үү.', 403, 'listener_required');
    $listener = ic_listener_id($_GET['l'] ?? '');
    $ack = max(0, (int)($_GET['ack'] ?? 0));
    $now = time();
    $state = note_state_read();
    if ($listener !== '') {
        $mine = isset($state['boards'][$listener]) && is_array($state['boards'][$listener]) ? $state['boards'][$listener] : null;
        $ack = max($ack, (int)($mine['ack'] ?? 0));
        // Only touch the file when something changed or the presence is about to look stale (not on every 3 s poll).
        if (!$mine || $now - (int)($mine['t'] ?? 0) >= 5 || (int)($mine['ack'] ?? 0) !== $ack) {
            $state = note_locked(function (&$locked) use ($listener, $ack, $now) {
                $locked['boards'][$listener] = array('t' => $now, 'ack' => $ack);
                note_prune_boards($locked, $now);
                return $locked;
            });
        }
    }
    $latest = $state['items'] ? note_public(end($state['items']), $now) : null;
    return array('ok' => true, 'now' => $now, 'seq' => (int)$state['seq'], 'latest' => $latest);
}

function note_dispatch($action, $method)
{
    if ($action === 'poll' && $method === 'GET') return note_poll();
    if (($action === 'status' || $action === 'list') && $method === 'GET') return note_status();
    if ($action === 'send' && $method === 'POST') return note_send();
    if ($action === 'resend' && $method === 'POST') return note_resend();
    if ($action === 'delete' && $method === 'POST') return note_delete();
    if ($action === 'clear' && $method === 'POST') return note_clear();
    note_fail('Үйлдэл олдсонгүй.', $method === 'GET' || $method === 'POST' ? 404 : 405, 'not_found');
}

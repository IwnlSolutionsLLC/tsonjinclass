<?php
/*
 * Call: the teacher rings the classroom board (WebRTC, audio only). The board plays its ringtone, accepts by itself
 * and both sides talk. This file only relays signaling (SDP + ICE) through a small guarded JSON state; no audio ever
 * reaches the server and nothing is recorded.
 *
 * One call at a time. Every request that touches the state takes the same flock and first expires whatever is overdue
 * (ring, connect, lost peer, hard cap), so there is no background job. The teacher uses X-CSRF (csrf_ok()), a board uses
 * X-Call-CSRF (call_board_csrf()); the teacher and board share the action names signal/connected/mute/hangup and the
 * role is told apart by that header.
 */
if (!defined('C122')) { http_response_code(404); exit; }

require_once __DIR__ . '/cctv.php';       // cctv_ice_config()
require_once __DIR__ . '/intercom.php';   // ic_listener_ok(), ic_listener_id(), IC_COOKIE

define('CALL_STATE_FILE', DB_DIR . '/call-state.php');
define('CALL_LOCK_FILE', DB_DIR . '/call-lock.php');

/* Timing in seconds. The guards only let a test harness shorten them from an auto-prepended file; production never defines them first. */
if (!defined('CALL_RING_TTL')) define('CALL_RING_TTL', 45);          // ringing with no answer -> 'missed'
if (!defined('CALL_CONNECT_TTL')) define('CALL_CONNECT_TTL', 30);    // answered but never connected -> 'failed'
if (!defined('CALL_PEER_LOST')) define('CALL_PEER_LOST', 20);        // the other side stopped polling -> 'lost'
if (!defined('CALL_MAX')) define('CALL_MAX', 1800);                  // hard cap of a live call -> 'timeout'
if (!defined('CALL_BOARD_ONLINE')) define('CALL_BOARD_ONLINE', 12);  // a board counts as online this long after its last poll
if (!defined('CALL_ENDED_KEEP')) define('CALL_ENDED_KEEP', 60);      // an ended call stays readable so both sides learn why
define('CALL_BOARD_KEEP', 600);                                      // forget boards that were silent this long
define('CALL_MAX_BOARDS', 64);

define('CALL_MAX_BODY', 65536);
define('CALL_MAX_SDP', 20000);
define('CALL_MAX_CANDIDATE', 2000);
define('CALL_PER_SIGNAL', 20);        // candidates accepted per request
define('CALL_SIGNAL_CAP', 100);       // candidates kept per side and call
define('CALL_START_PER_MIN', 6);

define('CALL_CALLER_NAME', 'Багш');
define('CALL_CALLER_AVATAR', 'assets/img/teacher.jpg');
define('CALL_RING_FILE', 'assets/audio/1006.mp3');

class CallException extends RuntimeException
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

function call_fail($message, $status = 400, $id = 'invalid_request')
{
    throw new CallException($message, $status, $id);
}

/* ---------- who may do what ---------- */

function call_admin_required($post = false)
{
    if (!is_admin()) call_fail('Багшийн удирдлагын нэвтрэлт шаардлагатай.', 403, 'teacher_required');
    if ($post && !csrf_ok()) call_fail('Хамгаалалтын токен буруу байна. Хуудсаа дахин ачаална уу.', 403, 'csrf');
}

/** The board's CSRF value: bound to its pairing cookie, so another site or another browser cannot guess it. */
function call_board_csrf()
{
    $secret = site_secret();
    if ($secret === '') return '';
    return b64u_enc(hash_hmac('sha256', 'call-board-csrf|' . cookie_val(IC_COOKIE), $secret, true));
}

function call_board_required($post = false)
{
    if (!ic_listener_ok()) call_fail('Дуудлага хүлээн авахын тулд цомгийн кодоор нэвтэрнэ үү.', 403, 'listener_required');
    $want = call_board_csrf();
    if ($want === '') call_fail('Серверийн хамгаалалт бэлэн биш байна.', 503, 'storage_unavailable');
    if ($post) {
        $given = isset($_SERVER['HTTP_X_CALL_CSRF']) ? (string)$_SERVER['HTTP_X_CALL_CSRF'] : '';
        if (!hash_equals($want, $given)) call_fail('Хамгаалалтын токен буруу байна. Дахин оролдоно уу.', 403, 'csrf');
    }
}

/* ---------- input ---------- */

function call_body()
{
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > CALL_MAX_BODY) call_fail('Хүсэлт хэт том байна.', 413, 'too_large');
    $input = fopen('php://input', 'rb');
    $raw = $input ? stream_get_contents($input, CALL_MAX_BODY + 1) : false;
    if ($input) fclose($input);
    if ($raw === false || $raw === '') call_fail('Хүсэлтийн агуулга хоосон байна.', 400, 'invalid_request');
    if (strlen($raw) > CALL_MAX_BODY) call_fail('Хүсэлт хэт том байна.', 413, 'too_large');
    $data = json_decode($raw, true, 12);
    if (!is_array($data) || is_list_array($data)) call_fail('Хүсэлтийн агуулга буруу байна.', 400, 'invalid_request');
    return $data;
}

function call_id_arg($value)
{
    return is_string($value) && preg_match('/^[a-f0-9]{32}$/D', $value) ? $value : '';
}

function call_need_id($body)
{
    $id = call_id_arg($body['id'] ?? '');
    if ($id === '') call_fail('Дуудлагын дугаар буруу байна.', 400, 'invalid_request');
    return $id;
}

function call_since($value)
{
    return is_string($value) && preg_match('/^\d{1,9}$/D', $value) ? (int)$value : 0;
}

function call_sdp($value, $type)
{
    if (!is_array($value) || ($value['type'] ?? null) !== $type || !is_string($value['sdp'] ?? null)) call_fail('SDP дохио буруу байна.', 400, 'bad_sdp');
    $sdp = $value['sdp'];
    if (strlen($sdp) < 20 || strlen($sdp) > CALL_MAX_SDP) call_fail('SDP дохио буруу эсвэл хэт том байна.', 400, 'bad_sdp');
    if (strpos($sdp, 'v=0') !== 0 || strpos($sdp, 'm=audio') === false || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $sdp)) call_fail('SDP дохио буруу байна.', 400, 'bad_sdp');
    return array('type' => $type, 'sdp' => $sdp);
}

/** Returns the cleaned RTCIceCandidateInit, or null when it is not one. Only the four standard fields are kept. */
function call_candidate($value)
{
    if (!is_array($value) || !is_string($value['candidate'] ?? null)) return null;
    $line = $value['candidate'];
    if (strlen($line) > 1500 || ($line !== '' && !preg_match('/^candidate:[\x21-\x7E ]+$/D', $line))) return null;
    $out = array('candidate' => $line, 'sdpMid' => null, 'sdpMLineIndex' => null, 'usernameFragment' => null);
    if (isset($value['sdpMid'])) {
        if (!is_string($value['sdpMid']) || strlen($value['sdpMid']) > 64 || preg_match('/[\x00-\x1F\x7F]/', $value['sdpMid'])) return null;
        $out['sdpMid'] = $value['sdpMid'];
    }
    if (isset($value['sdpMLineIndex'])) {
        if (!is_int($value['sdpMLineIndex']) || $value['sdpMLineIndex'] < 0 || $value['sdpMLineIndex'] > 16) return null;
        $out['sdpMLineIndex'] = $value['sdpMLineIndex'];
    }
    if (isset($value['usernameFragment'])) {
        if (!is_string($value['usernameFragment']) || strlen($value['usernameFragment']) > 256 || preg_match('/[\x00-\x1F\x7F]/', $value['usernameFragment'])) return null;
        $out['usernameFragment'] = $value['usernameFragment'];
    }
    if ($out['sdpMid'] === null && $out['sdpMLineIndex'] === null && $line !== '') return null;
    $json = json_encode($out);
    if ($json === false || strlen($json) > CALL_MAX_CANDIDATE) return null;
    return $out;
}

function call_candidates_arg($body)
{
    $list = $body['candidates'] ?? null;
    if (!is_array($list) || !is_list_array($list) || count($list) < 1 || count($list) > CALL_PER_SIGNAL) call_fail('ICE дохионы жагсаалт буруу байна.', 400, 'bad_candidate');
    $clean = array();
    foreach ($list as $item) {
        $one = call_candidate($item);
        if ($one === null) call_fail('ICE дохио буруу байна.', 400, 'bad_candidate');
        $clean[] = $one;
    }
    return $clean;
}

/* ---------- state ---------- */

function call_state_default()
{
    return array('v' => 1, 'seq' => 0, 'boards' => array(), 'call' => null, 'starts' => array());
}

/** Fills missing fields so a damaged or hand-edited file can never crash a request. Returns null for a row that is not a call. */
function call_normalize($call)
{
    if (!is_array($call) || !call_id_arg($call['id'] ?? '')) return null;
    $states = array('ringing', 'connecting', 'active', 'ended');
    if (!in_array($call['state'] ?? '', $states, true)) return null;
    $sig = isset($call['sig']) && is_array($call['sig']) ? $call['sig'] : array();
    return array(
        'id' => $call['id'],
        'state' => $call['state'],
        'createdAt' => (int)($call['createdAt'] ?? 0),
        'answeredAt' => (int)($call['answeredAt'] ?? 0),
        'endedAt' => (int)($call['endedAt'] ?? 0),
        'endReason' => is_string($call['endReason'] ?? null) ? $call['endReason'] : '',
        'offer' => isset($call['offer']) && is_array($call['offer']) ? $call['offer'] : null,
        'answer' => isset($call['answer']) && is_array($call['answer']) ? $call['answer'] : null,
        'boardId' => is_string($call['boardId'] ?? null) ? $call['boardId'] : '',
        'connectingAt' => (int)($call['connectingAt'] ?? 0),
        'teacherMuted' => !empty($call['teacherMuted']),
        'boardMuted' => !empty($call['boardMuted']),
        'teacherSeen' => (int)($call['teacherSeen'] ?? 0),
        'boardSeen' => (int)($call['boardSeen'] ?? 0),
        'sig' => array(
            'teacher' => isset($sig['teacher']) && is_array($sig['teacher']) ? array_values($sig['teacher']) : array(),
            'board' => isset($sig['board']) && is_array($sig['board']) ? array_values($sig['board']) : array(),
        ),
    );
}

function call_state_read()
{
    $state = read_guarded(CALL_STATE_FILE);
    if (!is_array($state) || ($state['v'] ?? 0) !== 1) return call_state_default();
    $state['seq'] = (int)($state['seq'] ?? 0);
    if (!isset($state['boards']) || !is_array($state['boards'])) $state['boards'] = array();
    if (!isset($state['starts']) || !is_array($state['starts'])) $state['starts'] = array();
    $state['call'] = call_normalize($state['call'] ?? null);
    return $state;
}

function call_end(&$call, $reason, $now)
{
    if ($call['state'] === 'ended') return;
    $call['state'] = 'ended';
    $call['endReason'] = $reason;
    $call['endedAt'] = $now;
    $call['offer'] = null;       // nothing needs the session descriptions or candidates once the call is over
    $call['answer'] = null;
    $call['sig'] = array('teacher' => array(), 'board' => array());
}

/** Applies every overdue transition. Safe to run any number of times. */
function call_expire(&$state, $now)
{
    if (!is_array($state['call'])) { $state['call'] = null; return; }
    $call =& $state['call'];
    if ($call['state'] === 'ended') {
        if ($now - $call['endedAt'] >= CALL_ENDED_KEEP) $state['call'] = null;
        return;
    }
    $reason = '';
    $since = $call['answeredAt'] > 0 ? $call['answeredAt'] : $call['createdAt'];
    $teacherLost = $now - $call['teacherSeen'] >= CALL_PEER_LOST;
    $boardLost = $call['boardId'] !== '' && $now - $call['boardSeen'] >= CALL_PEER_LOST;
    if ($now - $since >= CALL_MAX) $reason = 'timeout';
    elseif ($call['state'] === 'ringing') {
        if ($now - $call['createdAt'] >= CALL_RING_TTL) $reason = 'missed';
        elseif ($teacherLost) $reason = 'lost';
    } elseif ($call['state'] === 'connecting') {
        if ($teacherLost || $boardLost) $reason = 'lost';
        elseif ($now - $call['connectingAt'] >= CALL_CONNECT_TTL) $reason = 'failed';
    } elseif ($teacherLost || $boardLost) {
        $reason = 'lost';
    }
    if ($reason !== '') call_end($call, $reason, $now);
}

function call_prune(&$state, $now)
{
    call_expire($state, $now);
    foreach ($state['boards'] as $id => $row) {
        if (!is_array($row) || (int)($row['t'] ?? 0) < $now - CALL_BOARD_KEEP || !ic_listener_id((string)$id)) unset($state['boards'][$id]);
    }
    if (count($state['boards']) > CALL_MAX_BOARDS) {
        uasort($state['boards'], function ($a, $b) { return (int)$b['t'] <=> (int)$a['t']; });
        $state['boards'] = array_slice($state['boards'], 0, CALL_MAX_BOARDS, true);
    }
    $starts = array();
    foreach ($state['starts'] as $at) if (is_int($at) && $at >= $now - 60) $starts[] = $at;
    $state['starts'] = $starts;
}

/** Everything mutating the state runs here, under one lock. Overdue transitions are saved even when the callback refuses. */
function call_locked($callback)
{
    if (!is_dir(DB_DIR) && !@mkdir(DB_DIR, 0775, true)) call_fail('Серверийн хадгалах хавтас бичигдэхгүй байна.', 503, 'storage_unavailable');
    $handle = @fopen(CALL_LOCK_FILE, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) call_fail('Дуудлагын систем түр завгүй байна. Дахин оролдоно уу.', 503, 'storage_unavailable');
    try {
        $stat = fstat($handle);
        if (($stat['size'] ?? 0) === 0) { fwrite($handle, GUARD_LINE . "\n"); fflush($handle); }
        @chmod(CALL_LOCK_FILE, 0600);
        $state = call_state_read();
        $original = $state;
        call_prune($state, time());
        $refusal = null;
        $result = null;
        try { $result = $callback($state); } catch (CallException $error) { $refusal = $error; }
        if ($state !== $original) {
            if (!write_guarded(CALL_STATE_FILE, $state)) call_fail('Дуудлагын төлөв хадгалагдсангүй.', 503, 'storage_unavailable');
            @chmod(CALL_STATE_FILE, 0600);
        }
        if ($refusal) throw $refusal;
        return $result;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

/**
 * Read-mostly requests (polling) avoid the lock and the disk unless something really has to change:
 * $touch(&$state, $now) refreshes presence only when it is stale, $build($state, $now) makes the answer.
 */
function call_view($touch, $build)
{
    $state = call_state_read();
    $probe = $state;
    $now = time();
    call_prune($probe, $now);
    $touch($probe, $now);
    if ($probe === $state) return $build($state, $now);
    return call_locked(function (&$locked) use ($touch, $build) {
        $now = time();
        $touch($locked, $now);
        return $build($locked, $now);
    });
}

/* ---------- views ---------- */

function call_boards_online($state, $now)
{
    $online = 0; $mic = 0;
    foreach ($state['boards'] as $row) {
        if (!is_array($row) || (int)($row['t'] ?? 0) < $now - CALL_BOARD_ONLINE) continue;
        $online++;
        if (!empty($row['mic'])) $mic++;
    }
    return array($online, $mic);
}

/** The public call object. It never carries a session description. */
function call_pub($call, $now)
{
    return array(
        'id' => $call['id'],
        'state' => $call['state'],
        'endReason' => (string)$call['endReason'],
        'age' => max(0, $now - $call['createdAt']),
        'createdAt' => $call['createdAt'],
        'answeredAt' => $call['answeredAt'],
        'teacherMuted' => (bool)$call['teacherMuted'],
        'boardMuted' => (bool)$call['boardMuted'],
        'caller' => array('name' => CALL_CALLER_NAME, 'avatar' => CALL_CALLER_AVATAR),
    );
}

/** What one board is allowed to see: a board that lost the race is told the call was 'taken'. */
function call_pub_for_board($call, $board, $now)
{
    $pub = call_pub($call, $now);
    if ($call['state'] === 'ringing') {
        $pub['offer'] = $call['offer'];
        return $pub;
    }
    if ($call['boardId'] !== '' && $call['boardId'] !== $board) {
        $pub['state'] = 'ended';
        $pub['endReason'] = 'taken';
    }
    return $pub;
}

function call_sig_since($call, $side, $since)
{
    $out = array();
    foreach ($call['sig'][$side] as $row) if ((int)$row['n'] > $since) $out[] = array('n' => (int)$row['n'], 'c' => $row['c']);
    return array($out, count($call['sig'][$side]));
}

function call_sig_add(&$call, $side, $candidates)
{
    $accepted = 0;
    foreach ($candidates as $candidate) {
        $count = count($call['sig'][$side]);
        if ($count >= CALL_SIGNAL_CAP) break;
        $call['sig'][$side][] = array('n' => $count + 1, 'c' => $candidate);
        $accepted++;
    }
    return array($accepted, count($candidates) - $accepted);
}

function call_live($call, $id)
{
    return is_array($call) && $call['id'] === $id && $call['state'] !== 'ended';
}

function call_ring_ok()
{
    return is_file(C122_ROOT . '/' . CALL_RING_FILE);
}

/* ---------- teacher actions ---------- */

function call_teacher_body()
{
    $body = call_body();
    // A board request that lost its X-Call-CSRF header must not be mistaken for the teacher's.
    if (array_key_exists('l', $body)) call_fail('Самбарын хүсэлтэд X-Call-CSRF толгой шаардлагатай.', 403, 'csrf');
    return $body;
}

function call_status()
{
    call_admin_required(false);
    $result = call_view(
        function (&$state, $now) {},
        function ($state, $now) {
            list($online, $mic) = call_boards_online($state, $now);
            return array(
                'ok' => true,
                'now' => $now,
                'boards' => $online,
                'micBoards' => $mic,
                'call' => is_array($state['call']) ? call_pub($state['call'], $now) : null,
                'ringOk' => call_ring_ok(),
            );
        }
    );
    $result['ice'] = cctv_ice_config('call-teacher', time() + 3600);
    return $result;
}

function call_start()
{
    call_admin_required(true);
    $body = call_teacher_body();
    $offer = call_sdp($body['offer'] ?? null, 'offer');
    return call_locked(function (&$state) use ($offer) {
        $now = time();
        if (is_array($state['call']) && $state['call']['state'] !== 'ended') call_fail('Өөр дуудлага явагдаж байна. Дуусахыг хүлээнэ үү.', 409, 'busy');
        list($online) = call_boards_online($state, $now);
        if ($online < 1) call_fail('Одоогоор холбогдсон самбар алга. Самбар дээр сайтыг нээж «Intercom сонсох» товчийг дарна уу.', 409, 'no_board');
        if (count($state['starts']) >= CALL_START_PER_MIN) call_fail('Хэт олон удаа дуудлаа. Нэг минут хүлээгээд дахин оролдоно уу.', 429, 'rate_limited');
        $state['seq'] = (int)$state['seq'] + 1;
        $call = array(
            'id' => bin2hex(random_bytes(16)),
            'state' => 'ringing',
            'createdAt' => $now,
            'answeredAt' => 0,
            'endedAt' => 0,
            'endReason' => '',
            'offer' => $offer,
            'answer' => null,
            'boardId' => '',
            'connectingAt' => 0,
            'teacherMuted' => false,
            'boardMuted' => false,
            'teacherSeen' => $now,
            'boardSeen' => 0,
            'sig' => array('teacher' => array(), 'board' => array()),
        );
        $state['call'] = $call;
        $state['starts'][] = $now;
        return array('ok' => true, 'call' => call_pub($call, $now), 'ice' => cctv_ice_config($call['id'], $now + 3600));
    });
}

function call_poll()
{
    call_admin_required(false);
    $id = call_id_arg($_GET['id'] ?? '');
    if ($id === '') call_fail('Дуудлагын дугаар буруу байна.', 400, 'invalid_request');
    $since = call_since($_GET['since'] ?? '0');
    return call_view(
        function (&$state, $now) use ($id) {
            if (call_live($state['call'], $id) && $now - $state['call']['teacherSeen'] >= 2) $state['call']['teacherSeen'] = $now;
        },
        function ($state, $now) use ($id, $since) {
            $call = $state['call'];
            if (!is_array($call) || $call['id'] !== $id) return array('ok' => true, 'now' => $now, 'call' => null, 'answer' => null, 'candidates' => array(), 'cursor' => $since);
            $live = $call['state'] !== 'ended';
            list($candidates, $cursor) = $live ? call_sig_since($call, 'board', $since) : array(array(), $since);
            return array('ok' => true, 'now' => $now, 'call' => call_pub($call, $now), 'answer' => $live ? $call['answer'] : null, 'candidates' => $candidates, 'cursor' => $cursor);
        }
    );
}

function call_signal()
{
    call_admin_required(true);
    $body = call_teacher_body();
    $id = call_need_id($body);
    $candidates = call_candidates_arg($body);
    return call_locked(function (&$state) use ($id, $candidates) {
        if (!call_live($state['call'], $id)) return array('ok' => true, 'ended' => true, 'accepted' => 0, 'dropped' => 0);
        $state['call']['teacherSeen'] = time();
        list($accepted, $dropped) = call_sig_add($state['call'], 'teacher', $candidates);
        return array('ok' => true, 'accepted' => $accepted, 'dropped' => $dropped);
    });
}

function call_connect(&$state, $id, $now)
{
    if (!call_live($state['call'], $id)) return array('ok' => true, 'ended' => true);
    $call =& $state['call'];
    if ($call['state'] === 'ringing') call_fail('Дуудлагад хараахан хариулаагүй байна.', 409, 'bad_state');
    if ($call['state'] === 'connecting') {
        $call['state'] = 'active';
        if ($call['answeredAt'] === 0) $call['answeredAt'] = $now;
    }
    return array('ok' => true);
}

function call_connected()
{
    call_admin_required(true);
    $id = call_need_id(call_teacher_body());
    return call_locked(function (&$state) use ($id) {
        $now = time();
        $result = call_connect($state, $id, $now);
        if (call_live($state['call'], $id)) $state['call']['teacherSeen'] = $now;
        return $result;
    });
}

function call_mute_arg($body)
{
    if (!array_key_exists('muted', $body) || !is_bool($body['muted'])) call_fail('Микрофоны төлөв буруу байна.', 400, 'invalid_request');
    return $body['muted'];
}

function call_mute()
{
    call_admin_required(true);
    $body = call_teacher_body();
    $id = call_need_id($body);
    $muted = call_mute_arg($body);
    return call_locked(function (&$state) use ($id, $muted) {
        if (!call_live($state['call'], $id)) return array('ok' => true, 'ended' => true);
        $state['call']['teacherMuted'] = $muted;
        $state['call']['teacherSeen'] = time();
        return array('ok' => true);
    });
}

function call_hangup()
{
    call_admin_required(true);
    $id = call_need_id(call_teacher_body());
    return call_locked(function (&$state) use ($id) {
        if (!call_live($state['call'], $id)) return array('ok' => true);
        call_end($state['call'], $state['call']['state'] === 'ringing' ? 'cancelled' : 'hangup_teacher', time());
        return array('ok' => true);
    });
}

/* ---------- board actions ---------- */

function call_board_body()
{
    $body = call_body();
    $listener = ic_listener_id($body['l'] ?? '');
    if ($listener === '') call_fail('Самбарын дугаар буруу байна.', 400, 'invalid_request');
    return array($body, $listener);
}

/** Registers or refreshes a board. $mic null keeps the microphone flag it already reported. */
function call_board_touch(&$state, $board, $mic, $now)
{
    $row = isset($state['boards'][$board]) && is_array($state['boards'][$board]) ? $state['boards'][$board] : null;
    if ($mic === null) $mic = $row ? (bool)($row['mic'] ?? false) : false;
    if (!$row || $now - (int)($row['t'] ?? 0) >= 3 || (bool)($row['mic'] ?? false) !== $mic) $state['boards'][$board] = array('t' => $now, 'mic' => $mic);
}

function call_boardpoll()
{
    call_board_required(false);
    $board = ic_listener_id($_GET['l'] ?? '');
    if ($board === '') call_fail('Самбарын дугаар буруу байна.', 400, 'invalid_request');
    $mic = isset($_GET['mic']) && $_GET['mic'] === '1';
    $id = call_id_arg($_GET['id'] ?? '');
    $since = call_since($_GET['since'] ?? '0');
    return call_view(
        function (&$state, $now) use ($board, $mic) {
            call_board_touch($state, $board, $mic, $now);
            $call = $state['call'];
            if (is_array($call) && $call['state'] !== 'ended' && $call['boardId'] === $board && $now - $call['boardSeen'] >= 2) $state['call']['boardSeen'] = $now;
        },
        function ($state, $now) use ($board, $id, $since) {
            $call = $state['call'];
            $ice = cctv_ice_config(is_array($call) ? $call['id'] : 'call-board', $now + 3600);
            $out = array(
                'ok' => true,
                'csrf' => call_board_csrf(),
                'now' => $now,
                'ice' => array('iceServers' => $ice['iceServers'], 'iceExpiresAt' => $ice['iceExpiresAt']),
                'call' => null,
                'candidates' => array(),
                'cursor' => 0,
            );
            if (!is_array($call)) return $out;
            $out['call'] = call_pub_for_board($call, $board, $now);
            // The cursor belongs to one call: a board that has not tracked this call yet starts from the beginning.
            $from = $id === $call['id'] ? $since : 0;
            $out['cursor'] = $from;
            $mine = $call['state'] === 'ringing' || ($call['state'] !== 'ended' && $call['boardId'] === $board);
            if ($mine) list($out['candidates'], $out['cursor']) = call_sig_since($call, 'teacher', $from);
            return $out;
        }
    );
}

function call_answer()
{
    call_board_required(true);
    list($body, $board) = call_board_body();
    $id = call_need_id($body);
    $answer = call_sdp($body['answer'] ?? null, 'answer');
    return call_locked(function (&$state) use ($id, $board, $answer) {
        $now = time();
        $call = $state['call'];
        if (!is_array($call) || $call['id'] !== $id || $call['state'] !== 'ringing') call_fail('Дуудлага аль хэдийн хариулагдсан эсвэл дууссан байна.', 409, 'taken');
        $state['call']['state'] = 'connecting';
        $state['call']['answer'] = $answer;
        $state['call']['boardId'] = $board;
        $state['call']['connectingAt'] = $now;
        $state['call']['boardSeen'] = $now;
        call_board_touch($state, $board, null, $now);
        return array('ok' => true);
    });
}

function call_decline()
{
    call_board_required(true);
    list($body) = call_board_body();
    $id = call_need_id($body);
    return call_locked(function (&$state) use ($id) {
        if (call_live($state['call'], $id) && $state['call']['state'] === 'ringing') call_end($state['call'], 'declined', time());
        return array('ok' => true);
    });
}

/** Only the board that answered may speak for the call. */
function call_owned_by($state, $id, $board)
{
    if (!call_live($state['call'], $id)) return false;
    if ($state['call']['boardId'] !== $board) call_fail('Дуудлагад өөр самбар хариулсан байна.', 409, 'taken');
    return true;
}

function call_board_signal()
{
    call_board_required(true);
    list($body, $board) = call_board_body();
    $id = call_need_id($body);
    $candidates = call_candidates_arg($body);
    return call_locked(function (&$state) use ($id, $board, $candidates) {
        if (!call_owned_by($state, $id, $board)) return array('ok' => true, 'ended' => true, 'accepted' => 0, 'dropped' => 0);
        $state['call']['boardSeen'] = time();
        list($accepted, $dropped) = call_sig_add($state['call'], 'board', $candidates);
        return array('ok' => true, 'accepted' => $accepted, 'dropped' => $dropped);
    });
}

function call_board_connected()
{
    call_board_required(true);
    list($body, $board) = call_board_body();
    $id = call_need_id($body);
    return call_locked(function (&$state) use ($id, $board) {
        $now = time();
        if (!call_owned_by($state, $id, $board)) return array('ok' => true, 'ended' => true);
        $result = call_connect($state, $id, $now);
        if (call_live($state['call'], $id)) $state['call']['boardSeen'] = $now;
        return $result;
    });
}

function call_board_mute()
{
    call_board_required(true);
    list($body, $board) = call_board_body();
    $id = call_need_id($body);
    $muted = call_mute_arg($body);
    return call_locked(function (&$state) use ($id, $board, $muted) {
        if (!call_owned_by($state, $id, $board)) return array('ok' => true, 'ended' => true);
        $state['call']['boardMuted'] = $muted;
        $state['call']['boardSeen'] = time();
        return array('ok' => true);
    });
}

function call_board_hangup()
{
    call_board_required(true);
    list($body, $board) = call_board_body();
    $id = call_need_id($body);
    return call_locked(function (&$state) use ($id, $board) {
        if (!call_live($state['call'], $id)) return array('ok' => true);
        if ($state['call']['state'] === 'ringing') call_end($state['call'], 'declined', time());
        elseif ($state['call']['boardId'] === $board) call_end($state['call'], 'hangup_board', time());
        return array('ok' => true);
    });
}

/* ---------- routing ---------- */

function call_dispatch($action, $method)
{
    $routes = array(
        'status' => 'GET', 'poll' => 'GET', 'boardpoll' => 'GET',
        'start' => 'POST', 'signal' => 'POST', 'connected' => 'POST', 'mute' => 'POST', 'hangup' => 'POST',
        'answer' => 'POST', 'decline' => 'POST',
    );
    if (!isset($routes[$action])) call_fail('Үйлдэл олдсонгүй.', 404, 'not_found');
    if ($routes[$action] !== $method) call_fail('Хүсэлтийн арга зөвшөөрөгдөхгүй.', 405, 'method_not_allowed');
    $board = isset($_SERVER['HTTP_X_CALL_CSRF']);
    switch ($action) {
        case 'status': return call_status();
        case 'poll': return call_poll();
        case 'boardpoll': return call_boardpoll();
        case 'start': return call_start();
        case 'signal': return $board ? call_board_signal() : call_signal();
        case 'connected': return $board ? call_board_connected() : call_connected();
        case 'mute': return $board ? call_board_mute() : call_mute();
        case 'hangup': return $board ? call_board_hangup() : call_hangup();
        case 'answer': return call_answer();
        case 'decline': return call_decline();
    }
    call_fail('Үйлдэл олдсонгүй.', 404, 'not_found');
}

<?php
/* Live classroom signaling only. No camera frames or audio are stored here. */
if (!defined('C122')) { http_response_code(404); exit; }

define('CCTV_COOKIE', 'c122_cctv_display');
define('CCTV_STATE_FILE', DB_DIR . '/cctv-state.php');
define('CCTV_LOCK_FILE', DB_DIR . '/cctv-lock.php');
// A hidden Chrome tab may batch timers once per minute before a teacher connects.
define('CCTV_DISPLAY_TTL', 180);

class CctvApiException extends RuntimeException
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

function cctv_fail($message, $status = 400, $id = 'invalid_request')
{
    throw new CctvApiException($message, $status, $id);
}

function cctv_empty_state()
{
    return array('v' => 1, 'pair' => null, 'session' => null);
}

function cctv_secret($create = false)
{
    $cfg = read_guarded(SECRET_FILE);
    if ($cfg && is_string($cfg['secret'] ?? null) && strlen($cfg['secret']) >= 32) return $cfg['secret'];
    return $create ? site_secret() : '';
}

function cctv_cookie_token()
{
    $token = cookie_val(CCTV_COOKIE);
    return strlen($token) <= 1024 ? $token : '';
}

function cctv_cookie_claims($token)
{
    $secret = cctv_secret();
    if (!$secret || !is_string($token) || strlen($token) > 1024 || substr_count($token, '.') !== 1) return null;
    list($payload, $sig) = explode('.', $token, 2);
    if (!hash_equals(b64u_enc(hash_hmac('sha256', 'cctv-display|' . $payload, $secret, true)), $sig)) return null;
    $claims = json_decode(b64u_dec($payload), true);
    if (!is_array($claims) || !preg_match('/^[a-f0-9]{32}$/D', $claims['id'] ?? '') || !preg_match('/^[a-f0-9]{64}$/D', $claims['nonce'] ?? '') || (int)($claims['exp'] ?? 0) <= time()) return null;
    return $claims;
}

function cctv_paired($state, $token = null)
{
    $token = $token === null ? cctv_cookie_token() : $token;
    $claims = cctv_cookie_claims($token);
    $pair = $state['pair'] ?? null;
    return $claims && is_array($pair) && (int)($pair['expires'] ?? 0) > time()
        && hash_equals((string)($pair['id'] ?? ''), $claims['id'])
        && hash_equals((string)($pair['tokenHash'] ?? ''), hash('sha256', $token));
}

function cctv_publisher_csrf($token = null)
{
    $secret = cctv_secret();
    $token = $token === null ? cctv_cookie_token() : $token;
    return $secret && $token ? b64u_enc(hash_hmac('sha256', 'cctv-csrf|' . $token, $secret, true)) : '';
}

function cctv_admin_required($post = false, $body = array())
{
    if (!is_admin()) cctv_fail('Багшийн удирдлагын нэвтрэлт шаардлагатай.', 403, 'teacher_required');
    if ($post) {
        $want = csrf_token();
        $provided = (string)($_SERVER['HTTP_X_CSRF'] ?? ($body['csrf'] ?? ''));
        if (!$want || !hash_equals($want, $provided)) cctv_fail('Хүсэлтийн хамгаалалт хүчингүй. Хуудсаа шинэчилнэ үү.', 403, 'csrf_invalid');
    }
}

function cctv_publisher_required($state, $post = false, $body = array())
{
    if (!cctv_paired($state)) cctv_fail('Энэ төхөөрөмжийг багш эхлээд холбоно уу.', 403, 'display_not_paired');
    if ($post) {
        $want = cctv_publisher_csrf();
        $provided = (string)($_SERVER['HTTP_X_CCTV_CSRF'] ?? ($body['publisherCsrf'] ?? ''));
        if (!$want || !hash_equals($want, $provided)) cctv_fail('Дэлгэцийн хүсэлтийн хамгаалалт хүчингүй.', 403, 'csrf_invalid');
    }
}

function cctv_event(&$session, $target, $viewerId, $type, $data = null, $now = null)
{
    $now = $now === null ? time() : $now;
    $session['cursor'] = (int)($session['cursor'] ?? 0) + 1;
    $session['events'][] = array('id' => $session['cursor'], 'target' => $target, 'viewerId' => $viewerId, 'type' => $type, 'data' => $data, 'at' => $now);
}

function cctv_prune(&$state, $now = null)
{
    $now = $now === null ? time() : $now;
    if (is_array($state['pair'] ?? null) && (int)($state['pair']['expires'] ?? 0) <= $now) {
        $state['pair'] = null;
        $state['session'] = null;
    }
    if (!is_array($state['session'] ?? null)) return;
    $session =& $state['session'];
    if (!is_array($state['pair'] ?? null) || ($session['pairId'] ?? '') !== ($state['pair']['id'] ?? '') || (int)($session['lastHeartbeat'] ?? 0) < $now - CCTV_DISPLAY_TTL) {
        $state['session'] = null;
        return;
    }
    foreach ($session['viewers'] as $id => $viewer) {
        if ((int)($viewer['lastSeen'] ?? 0) < $now - 45) {
            unset($session['viewers'][$id]);
            cctv_event($session, 'publisher', $id, 'viewer-left', null, $now);
        }
    }
    $session['events'] = array_values(array_filter($session['events'], function ($event) use ($now, &$session) {
        return (int)($event['at'] ?? 0) >= $now - 90 &&
            (($event['type'] ?? '') === 'viewer-left' || isset($session['viewers'][$event['viewerId'] ?? '']));
    }));
    if (count($session['events']) > 512) $session['events'] = array_slice($session['events'], -512);
}

/* Every authenticated mutation uses the same lock, including cleanup and revocation. */
function cctv_locked($callback)
{
    if (!is_dir(DB_DIR) && !@mkdir(DB_DIR, 0775, true)) cctv_fail('Серверийн хадгалах хавтас бичигдэхгүй байна.', 503, 'storage_unavailable');
    $handle = @fopen(CCTV_LOCK_FILE, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) cctv_fail('Дамжуулалтын төлөв түр завгүй байна.', 503, 'storage_unavailable');
    try {
        $stat = fstat($handle);
        if (($stat['size'] ?? 0) === 0) { fwrite($handle, GUARD_LINE . "\n"); fflush($handle); }
        @chmod(CCTV_LOCK_FILE, 0600);
        $state = read_guarded(CCTV_STATE_FILE);
        if (!is_array($state) || (int)($state['v'] ?? 0) !== 1) $state = cctv_empty_state();
        $original = $state;
        cctv_prune($state);
        $result = $callback($state);
        if ($state !== $original) {
            if (strlen((string)json_encode($state)) > 1572864) cctv_fail('Дохионы дараалал дүүрсэн. Дахин холбоно уу.', 429, 'signal_limit');
            if (!write_guarded(CCTV_STATE_FILE, $state)) cctv_fail('Дамжуулалтын төлөв хадгалагдсангүй.', 503, 'storage_unavailable');
            @chmod(CCTV_STATE_FILE, 0600);
        }
        return $result;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function cctv_session_required($state, $body)
{
    $id = (string)($body['sessionId'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/D', $id)) cctv_fail('Дамжуулалтын дугаар буруу байна.');
    if (!is_array($state['session'] ?? null) || !hash_equals($state['session']['id'], $id)) cctv_fail('Шууд дамжуулалт дууссан эсвэл дахин эхэлсэн.', 409, 'session_ended');
    return $id;
}

function cctv_viewer_required($state, $body)
{
    cctv_admin_required();
    $id = (string)($body['viewerId'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/D', $id)) cctv_fail('Үзэгчийн дугаар буруу байна.');
    $viewer = $state['session']['viewers'][$id] ?? null;
    if (!$viewer || !hash_equals($viewer['ownerHash'], hash('sha256', auth_token()))) cctv_fail('Энэ үзэгчийн холболт хүчингүй.', 403, 'viewer_not_owned');
    return $id;
}

function cctv_ice_config($sessionId = '', $expiresAt = null)
{
    $settings = read_guarded(DB_DIR . '/cctv-settings.php') ?: array();
    $turnEnv = getenv('C122_CCTV_TURN_URLS');
    $stunEnv = getenv('C122_CCTV_STUN_URLS');
    $turn = $turnEnv !== false ? explode(',', $turnEnv) : ($settings['turnUrls'] ?? array());
    $stun = $stunEnv !== false ? explode(',', $stunEnv) : ($settings['stunUrls'] ?? array('stun:stun.l.google.com:19302'));
    $secretEnv = getenv('C122_CCTV_TURN_SECRET');
    $secret = $secretEnv !== false ? $secretEnv : (string)($settings['turnSecret'] ?? '');
    if (!is_array($turn)) $turn = array();
    if (!is_array($stun)) $stun = array();
    $valid = function ($url, $kind) {
        return is_string($url) && strlen($url) <= 300 && preg_match($kind === 'turn' ? '/^turns?:[a-z0-9.\-\[\]:]+(?:\?transport=(?:udp|tcp))?$/iD' : '/^stuns?:[a-z0-9.\-\[\]:]+$/iD', trim($url));
    };
    $stun = array_values(array_filter(array_map('trim', array_filter($stun, 'is_string')), function ($u) use ($valid) { return $valid($u, 'stun'); }));
    $turn = array_values(array_filter(array_map('trim', array_filter($turn, 'is_string')), function ($u) use ($valid) { return $valid($u, 'turn'); }));
    $expiresAt = $expiresAt === null ? time() + 3600 : (int)$expiresAt;
    $servers = array();
    if ($stun) $servers[] = array('urls' => array_slice($stun, 0, 3));
    if ($turn && strlen($secret) >= 16) {
        $username = $expiresAt . ':c122:' . substr(hash('sha256', $sessionId), 0, 16);
        $servers[] = array('urls' => array_slice($turn, 0, 4), 'username' => $username, 'credential' => base64_encode(hash_hmac('sha1', $username, $secret, true)));
    }
    return array('iceServers' => $servers, 'iceExpiresAt' => $expiresAt, 'turnConfigured' => count($servers) > ($stun ? 1 : 0));
}

function cctv_set_cookie($token, $expires)
{
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', array('127.0.0.1', '::1'), true) && preg_match('/^(?:127\.0\.0\.1|\[::1\])(?::\d+)?$/D', $host);
    setcookie(CCTV_COOKIE, $token, array('expires' => $expires, 'path' => '/', 'secure' => is_https() || !$local, 'httponly' => true, 'samesite' => 'Lax'));
}

function cctv_signal_data($type, $data)
{
    if ($type === 'offer' || $type === 'answer') {
        if (!is_array($data) || ($data['type'] ?? '') !== $type || !is_string($data['sdp'] ?? null) || strlen($data['sdp']) < 4 || strlen($data['sdp']) > 32768 || strpos($data['sdp'], "v=0") !== 0) cctv_fail('SDP дохио буруу эсвэл хэт том байна.');
        return array('type' => $type, 'sdp' => $data['sdp']);
    }
    if ($data === null) return null;
    if (!is_array($data) || !is_string($data['candidate'] ?? null) || strlen($data['candidate']) > 2048) cctv_fail('ICE дохио буруу байна.');
    $out = array('candidate' => $data['candidate']);
    foreach (array('sdpMid', 'usernameFragment') as $field) {
        if (isset($data[$field]) && (!is_string($data[$field]) || strlen($data[$field]) > 256)) cctv_fail('ICE дохио буруу байна.');
        $out[$field] = $data[$field] ?? null;
    }
    if (isset($data['sdpMLineIndex']) && (!is_int($data['sdpMLineIndex']) || $data['sdpMLineIndex'] < 0 || $data['sdpMLineIndex'] > 16)) cctv_fail('ICE сувгийн дугаар буруу байна.');
    $out['sdpMLineIndex'] = $data['sdpMLineIndex'] ?? null;
    return $out;
}

function cctv_dispatch($action, $method, $body = array())
{
    $role = $type = $data = null;
    $getActions = array('status', 'dashboard', 'poll');
    if (!in_array($action, array_merge($getActions, array('pair', 'revoke', 'unpair', 'start', 'heartbeat', 'end', 'join', 'leave', 'signal')), true)) cctv_fail('Үйлдэл олдсонгүй.', 404, 'not_found');
    if ($method !== (in_array($action, $getActions, true) ? 'GET' : 'POST')) cctv_fail('Хүсэлтийн арга зөвшөөрөгдөхгүй.', 405, 'method_not_allowed');
    if ($action === 'status') {
        $state = read_guarded(CCTV_STATE_FILE) ?: cctv_empty_state();
        $paired = cctv_paired($state);
        return array('ok' => true, 'enrolled' => (bool)$paired, 'publisherCsrf' => $paired ? cctv_publisher_csrf() : '', 'deviceId' => $paired ? $state['pair']['id'] : null);
    }
    if (in_array($action, array('dashboard', 'pair', 'revoke', 'unpair', 'join', 'leave'), true)) cctv_admin_required($method === 'POST', $body);
    if ($action === 'poll' && ($body['role'] ?? '') === 'viewer') cctv_admin_required();
    if ($action === 'signal') {
        $type = (string)($body['type'] ?? '');
        if (!in_array($type, array('offer', 'answer', 'candidate'), true)) cctv_fail('Дохионы төрөл буруу байна.');
        $data = cctv_signal_data($type, $body['data'] ?? null);
        /* Explicit role avoids treating a paired teacher browser as the publisher by accident. */
        $role = (string)($body['role'] ?? '');
        if ($role === '') $role = isset($_SERVER['HTTP_X_CCTV_CSRF']) || isset($body['publisherCsrf']) ? 'publisher' : 'viewer';
        if (!in_array($role, array('publisher', 'viewer'), true)) cctv_fail('Дохионы чиглэл буруу байна.');
        if ($role === 'viewer') cctv_admin_required(true, $body);
    }
    /* Do not create a database for unauthenticated requests. Publisher checks repeat under lock. */
    $publisherAction = in_array($action, array('start', 'heartbeat', 'end'), true) || ($action === 'poll' && ($body['role'] ?? '') === 'publisher') || ($action === 'signal' && $role === 'publisher');
    if ($publisherAction) cctv_publisher_required(read_guarded(CCTV_STATE_FILE) ?: cctv_empty_state(), $method === 'POST', $body);
    if ($action === 'poll' && !in_array($body['role'] ?? '', array('publisher', 'viewer'), true)) cctv_fail('Дохионы чиглэл буруу байна.');

    return cctv_locked(function (&$state) use ($action, $body, $method, $publisherAction, $role, $type, $data) {
        if ($publisherAction) cctv_publisher_required($state, $method === 'POST', $body);
        if ($action === 'dashboard') {
            $session = $state['session'];
            $ice = cctv_ice_config($session['id'] ?? '');
            return array('ok' => true, 'csrf' => csrf_token(), 'paired' => is_array($state['pair']), 'deviceLabel' => $state['pair']['label'] ?? '',
                'deviceRegisteredAt' => $state['pair']['createdAt'] ?? null, 'deviceExpiresAt' => $state['pair']['expires'] ?? null, 'deviceLastSeenAt' => $state['pair']['lastSeenAt'] ?? null,
                'live' => is_array($session), 'sessionId' => $session['id'] ?? null, 'startedAt' => $session['startedAt'] ?? null, 'lastHeartbeat' => $session['lastHeartbeat'] ?? null,
                'viewers' => $session ? count($session['viewers']) : 0, 'turnConfigured' => $ice['turnConfigured']);
        }
        if ($action === 'pair') {
            $secret = cctv_secret(true);
            if (!$secret) cctv_fail('Серверийн хамгаалалтын түлхүүр бэлэн биш байна.', 503, 'storage_unavailable');
            $id = bin2hex(random_bytes(16));
            $expires = time() + 180 * 86400;
            $payload = b64u_enc(json_encode(array('id' => $id, 'nonce' => bin2hex(random_bytes(32)), 'exp' => $expires)));
            $token = $payload . '.' . b64u_enc(hash_hmac('sha256', 'cctv-display|' . $payload, $secret, true));
            $state['pair'] = array('id' => $id, 'tokenHash' => hash('sha256', $token), 'label' => clean_str($body['label'] ?? 'Ангийн том дэлгэц', 80), 'createdAt' => time(), 'expires' => $expires, 'lastSeenAt' => null);
            $state['session'] = null;
            cctv_set_cookie($token, $expires);
            return array('ok' => true, 'enrolled' => true, 'publisherCsrf' => cctv_publisher_csrf($token), 'deviceId' => $id);
        }
        if ($action === 'revoke' || $action === 'unpair') {
            $state['pair'] = null;
            $state['session'] = null;
            cctv_set_cookie('', time() - 3600);
            return array('ok' => true);
        }
        if ($action === 'start') {
            $id = bin2hex(random_bytes(16));
            $state['pair']['lastSeenAt'] = time();
            $state['session'] = array('id' => $id, 'pairId' => $state['pair']['id'], 'startedAt' => time(), 'lastHeartbeat' => time(), 'iceExpiresAt' => time() + 3600, 'cursor' => 0, 'events' => array(), 'viewers' => array());
            $ice = cctv_ice_config($id, $state['session']['iceExpiresAt']);
            return array('ok' => true, 'sessionId' => $id, 'iceServers' => $ice['iceServers'], 'iceExpiresAt' => $ice['iceExpiresAt']);
        }
        cctv_session_required($state, $body);
        $session =& $state['session'];
        if ($action === 'heartbeat') {
            $session['lastHeartbeat'] = time();
            $state['pair']['lastSeenAt'] = time();
            if ((int)($session['iceExpiresAt'] ?? 0) <= time() + 180) $session['iceExpiresAt'] = time() + 3600;
            $ice = cctv_ice_config($session['id'], $session['iceExpiresAt']);
            return array('ok' => true, 'iceServers' => $ice['iceServers'], 'iceExpiresAt' => $ice['iceExpiresAt']);
        }
        if ($action === 'end') { $state['session'] = null; return array('ok' => true); }
        if ($action === 'join') {
            if (count($session['viewers']) >= 4) cctv_fail('Одоогоор 4 багш үзэж байна. Нэг холболт дуусахыг хүлээнэ үү.', 429, 'viewer_limit');
            $id = bin2hex(random_bytes(16));
            $session['viewers'][$id] = array('ownerHash' => hash('sha256', auth_token()), 'lastSeen' => time(), 'joinedAt' => time(), 'iceSentAt' => time(), 'signals' => array('publisher' => array(), 'viewer' => array()));
            cctv_event($session, 'publisher', $id, 'viewer-joined');
            $ice = cctv_ice_config($session['id'], $session['iceExpiresAt']);
            return array('ok' => true, 'viewerId' => $id, 'iceServers' => $ice['iceServers'], 'iceExpiresAt' => $ice['iceExpiresAt']);
        }
        if ($action === 'leave') {
            $id = cctv_viewer_required($state, $body);
            unset($session['viewers'][$id]);
            cctv_event($session, 'publisher', $id, 'viewer-left');
            return array('ok' => true);
        }
        if ($action === 'poll') {
            $pollRole = $body['role'];
            $id = $pollRole === 'viewer' ? cctv_viewer_required($state, $body) : null;
            if ($id) $session['viewers'][$id]['lastSeen'] = time();
            $since = (string)($body['since'] ?? '0');
            if (!preg_match('/^\d{1,12}$/D', $since)) cctv_fail('Дохионы дарааллын дугаар буруу байна.');
            $since = (int)$since;
            if ($since > $session['cursor']) cctv_fail('Дохионы дараалал шинэчлэгдсэн. Дахин холбоно уу.', 409, 'cursor_invalid');
            $events = array();
            foreach ($session['events'] as $event) {
                if ($event['id'] > $since && $event['target'] === $pollRole && ($pollRole === 'publisher' || $event['viewerId'] === $id)) {
                    unset($event['target']);
                    $events[] = $event;
                }
            }
            $result = array('ok' => true, 'events' => $events, 'cursor' => $session['cursor'], 'viewers' => count($session['viewers']));
            $hasOffer = false;
            foreach ($events as $event) if ($event['type'] === 'offer') { $hasOffer = true; break; }
            if ($id && ($hasOffer || (int)($session['viewers'][$id]['iceSentAt'] ?? 0) <= time() - 60)) {
                $viewer =& $session['viewers'][$id];
                $viewer['iceSentAt'] = time();
                $ice = cctv_ice_config($session['id'], $session['iceExpiresAt']);
                $result['iceServers'] = $ice['iceServers'];
                $result['iceExpiresAt'] = $ice['iceExpiresAt'];
            }
            return $result;
        }
        if ($action === 'signal') {
            $id = (string)($body['viewerId'] ?? '');
            if ($role === 'viewer') cctv_viewer_required($state, $body);
            elseif (!preg_match('/^[a-f0-9]{32}$/D', $id) || !isset($session['viewers'][$id])) cctv_fail('Үзэгчийн холболт дууссан.', 409, 'viewer_ended');
            if (($type === 'offer' && $role !== 'publisher') || ($type === 'answer' && $role !== 'viewer')) cctv_fail('Дохионы чиглэл зөвшөөрөгдөхгүй.', 403, 'role_forbidden');
            $counts =& $session['viewers'][$id]['signals'][$role];
            if ((int)($counts['windowAt'] ?? 0) <= time() - 60) $counts = array('windowAt' => time());
            $counts[$type] = (int)($counts[$type] ?? 0) + 1;
            if ($counts[$type] > ($type === 'candidate' ? 100 : 12)) cctv_fail('Дохионы хүсэлт хэт ойрхон байна. Түр хүлээгээд дахин оролдоно уу.', 429, 'signal_limit');
            cctv_event($session, $role === 'publisher' ? 'viewer' : 'publisher', $id, $type, $data);
            return array('ok' => true);
        }
        cctv_fail('Үйлдэл олдсонгүй.', 404, 'not_found');
    });
}

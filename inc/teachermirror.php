<?php
/* TeacherMirror transports WebRTC descriptions only, never media or recordings. */
if (!defined('C122')) { http_response_code(404); exit; }
require_once __DIR__ . '/cctv.php';

define('TM_COOKIE', 'c122_mirror_board');
define('TM_STATE_FILE', DB_DIR . '/teachermirror-state.php');
define('TM_LOCK_FILE', DB_DIR . '/teachermirror-lock.php');
define('TM_PUBLISHER_TTL', 180);
define('TM_VIEWER_TTL', 90);

class TeacherMirrorException extends RuntimeException
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

function tm_fail($message, $status = 400, $id = 'invalid_request')
{
    throw new TeacherMirrorException($message, $status, $id);
}

function tm_cookie_token()
{
    $token = cookie_val(TM_COOKIE);
    return strlen($token) <= 1024 ? $token : '';
}

function tm_board_cookie_valid($token = null)
{
    $token = $token === null ? tm_cookie_token() : $token;
    $secret = cctv_secret();
    if (!$secret || !$token || substr_count($token, '.') !== 1) return false;
    list($payload, $sig) = explode('.', $token, 2);
    if (!hash_equals(b64u_enc(hash_hmac('sha256', 'teacher-mirror-board|' . $payload, $secret, true)), $sig)) return false;
    $claims = json_decode(b64u_dec($payload), true);
    return is_array($claims) && is_string($claims['nonce'] ?? null) && preg_match('/^[a-f0-9]{64}$/D', $claims['nonce']) && (int)($claims['exp'] ?? 0) > time();
}

function tm_board_csrf($token = null)
{
    $token = $token === null ? tm_cookie_token() : $token;
    $secret = cctv_secret();
    return $secret && $token ? b64u_enc(hash_hmac('sha256', 'teacher-mirror-csrf|' . $token, $secret, true)) : '';
}

function tm_board_prepare()
{
    $token = tm_cookie_token();
    if (tm_board_cookie_valid($token)) return tm_board_csrf($token);
    $secret = cctv_secret(true);
    if (!$secret) tm_fail('Холболтын хамгаалалт бэлэн биш байна.', 503, 'storage_unavailable');
    $expires = time() + 7 * 86400;
    $payload = b64u_enc(json_encode(array('nonce' => bin2hex(random_bytes(32)), 'exp' => $expires)));
    $token = $payload . '.' . b64u_enc(hash_hmac('sha256', 'teacher-mirror-board|' . $payload, $secret, true));
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', array('127.0.0.1', '::1'), true) && preg_match('/^(?:127\.0\.0\.1|\[::1\])(?::\d+)?$/D', $host);
    setcookie(TM_COOKIE, $token, array('expires' => $expires, 'path' => '/', 'secure' => is_https() || !$local, 'httponly' => true, 'samesite' => 'Lax'));
    return tm_board_csrf($token);
}

function tm_teacher_required($post = false, $body = array())
{
    if (!is_admin()) tm_fail('Багшийн удирдлагын нэвтрэлт шаардлагатай.', 403, 'teacher_required');
    if ($post) {
        $want = csrf_token();
        $provided = (string)($_SERVER['HTTP_X_CSRF'] ?? ($body['csrf'] ?? ''));
        if (!$want || !hash_equals($want, $provided)) tm_fail('Хүсэлтийн хамгаалалт хүчингүй. Хуудсаа шинэчилнэ үү.', 403, 'csrf_invalid');
    }
}

function tm_board_required($post = false, $body = array())
{
    if (!tm_board_cookie_valid()) tm_fail('Самбарын хуудсыг шинэчлээд дахин холбогдоно уу.', 403, 'board_required');
    if ($post) {
        $provided = (string)($_SERVER['HTTP_X_MIRROR_CSRF'] ?? ($body['viewerCsrf'] ?? ''));
        if (!hash_equals(tm_board_csrf(), $provided)) tm_fail('Самбарын хүсэлтийн хамгаалалт хүчингүй.', 403, 'csrf_invalid');
    }
}

function tm_event(&$session, $target, $viewerId, $type, $data = null, $now = null)
{
    $session['cursor']++;
    $session['events'][] = array('id' => $session['cursor'], 'target' => $target, 'viewerId' => $viewerId, 'type' => $type, 'data' => $data, 'at' => $now === null ? time() : $now);
}

function tm_prune(&$state, $now = null)
{
    $now = $now === null ? time() : $now;
    if (!is_array($state['session'] ?? null)) return;
    $session =& $state['session'];
    if ((int)($session['lastHeartbeat'] ?? 0) < $now - TM_PUBLISHER_TTL) { $state['session'] = null; return; }
    foreach ($session['viewers'] as $id => $viewer) {
        if ((int)$viewer['lastSeen'] < $now - TM_VIEWER_TTL) {
            unset($session['viewers'][$id]);
            tm_event($session, 'publisher', $id, 'viewer-left', null, $now);
        }
    }
    $session['events'] = array_values(array_filter($session['events'], function ($event) use ($now, &$session) {
        return $event['at'] >= $now - 90 && ($event['type'] === 'viewer-left' || isset($session['viewers'][$event['viewerId']]));
    }));
    if (count($session['events']) > 512) $session['events'] = array_slice($session['events'], -512);
}

function tm_locked($callback)
{
    if (!is_dir(DB_DIR) && !@mkdir(DB_DIR, 0775, true)) tm_fail('Серверийн хадгалах хавтас бичигдэхгүй байна.', 503, 'storage_unavailable');
    $handle = @fopen(TM_LOCK_FILE, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) tm_fail('Холболтын төлөв түр завгүй байна.', 503, 'storage_unavailable');
    try {
        $stat = fstat($handle);
        if (($stat['size'] ?? 0) === 0) { fwrite($handle, GUARD_LINE . "\n"); fflush($handle); }
        @chmod(TM_LOCK_FILE, 0600);
        $state = read_guarded(TM_STATE_FILE);
        if (!is_array($state) || ($state['v'] ?? 0) !== 1) $state = array('v' => 1, 'session' => null);
        $original = $state;
        tm_prune($state);
        $result = $callback($state);
        if ($state !== $original) {
            if (strlen((string)json_encode($state)) > 2097152) tm_fail('Дохионы дараалал дүүрсэн. Түр хүлээгээд дахин холбоно уу.', 429, 'signal_limit');
            if (!write_guarded(TM_STATE_FILE, $state)) tm_fail('Холболтын төлөв хадгалагдсангүй.', 503, 'storage_unavailable');
            @chmod(TM_STATE_FILE, 0600);
        }
        return $result;
    } finally { flock($handle, LOCK_UN); fclose($handle); }
}

function tm_session_required($state, $body)
{
    $id = (string)($body['sessionId'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/D', $id)) tm_fail('Дамжуулалтын дугаар буруу байна.');
    if (!is_array($state['session'] ?? null) || !hash_equals($state['session']['id'], $id)) tm_fail('Багшийн шууд дамжуулалт дууссан.', 409, 'session_ended');
}

function tm_publisher_owned($state)
{
    if (!hash_equals($state['session']['ownerHash'], hash('sha256', auth_token()))) tm_fail('Энэ дамжуулалт өөр багшийн холболт байна.', 403, 'publisher_not_owned');
}

function tm_viewer_owned($state, $body)
{
    $id = (string)($body['viewerId'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/D', $id)) tm_fail('Самбарын холболтын дугаар буруу байна.');
    $viewer = $state['session']['viewers'][$id] ?? null;
    if (!$viewer || !hash_equals($viewer['ownerHash'], hash('sha256', tm_cookie_token()))) tm_fail('Самбарын холболт хүчингүй болсон.', 403, 'viewer_not_owned');
    return $id;
}

function tm_ice($session)
{
    return cctv_ice_config('teacher-mirror:' . $session['id'], $session['iceExpiresAt']);
}

function tm_dispatch($action, $method, $body = array())
{
    $get = array('status', 'poll');
    if (!in_array($action, array_merge($get, array('start', 'heartbeat', 'end', 'join', 'leave', 'signal')), true)) tm_fail('Үйлдэл олдсонгүй.', 404, 'not_found');
    if ($method !== (in_array($action, $get, true) ? 'GET' : 'POST')) tm_fail('Хүсэлтийн арга зөвшөөрөгдөхгүй.', 405, 'method_not_allowed');
    $role = $type = $data = null;
    if ($action === 'status') {
        $csrf = tm_board_prepare();
        $summary = function ($state) use ($csrf) {
            $session = $state['session'];
            /* Expose capability only; TURN URLs, shared secrets and credentials stay out of public status. */
            $ice = cctv_ice_config('teacher-mirror:' . ($session['id'] ?? 'status'), $session['iceExpiresAt'] ?? null);
            return array('ok' => true, 'live' => is_array($session), 'sessionId' => $session['id'] ?? null, 'label' => $session['label'] ?? '', 'viewerCsrf' => $csrf, 'turnConfigured' => (bool)$ice['turnConfigured']);
        };
        /* Persist expired-description cleanup when a room exists; idle visitors create no room. */
        if (is_file(TM_STATE_FILE)) return tm_locked(function (&$state) use ($summary) { return $summary($state); });
        return $summary(array('v' => 1, 'session' => null));
    }
    if (in_array($action, array('start', 'heartbeat', 'end'), true)) tm_teacher_required(true, $body);
    elseif (in_array($action, array('join', 'leave'), true)) tm_board_required(true, $body);
    else {
        $role = (string)($body['role'] ?? '');
        if (!in_array($role, array('publisher', 'viewer'), true)) tm_fail('Холболтын чиглэл буруу байна.');
        if ($role === 'publisher') tm_teacher_required(true, $body);
        else tm_board_required($method === 'POST', $body);
        if ($action === 'signal') {
            $type = (string)($body['type'] ?? '');
            if (!in_array($type, array('offer', 'answer', 'candidate'), true)) tm_fail('Дохионы төрөл буруу байна.');
            try { $data = cctv_signal_data($type, $body['data'] ?? null); }
            catch (CctvApiException $error) { tm_fail($error->getMessage(), $error->httpStatus, $error->errorId); }
        }
    }
    return tm_locked(function (&$state) use ($action, $body, $role, $type, $data) {
        if ($action === 'start') {
            if (is_array($state['session'])) {
                if (($body['sessionId'] ?? '') === $state['session']['id'] && hash_equals($state['session']['ownerHash'], hash('sha256', auth_token()))) {
                    $state['session']['lastHeartbeat'] = time();
                    if ($state['session']['iceExpiresAt'] <= time() + 180) $state['session']['iceExpiresAt'] = time() + 3600;
                    $ice = tm_ice($state['session']);
                    return array('ok' => true, 'sessionId' => $state['session']['id'], 'iceServers' => $ice['iceServers'], 'iceExpiresAt' => $ice['iceExpiresAt'], 'turnConfigured' => (bool)$ice['turnConfigured'], 'recovered' => true);
                }
                tm_fail('Өөр шууд дамжуулалт ажиллаж байна. Дуусахыг хүлээнэ үү.', 409, 'room_busy');
            }
            $id = bin2hex(random_bytes(16));
            $state['session'] = array('id' => $id, 'ownerHash' => hash('sha256', auth_token()), 'label' => clean_str($body['label'] ?? '12-2 · Багшийн дэлгэц', 80), 'startedAt' => time(), 'lastHeartbeat' => time(), 'iceExpiresAt' => time() + 3600, 'cursor' => 0, 'events' => array(), 'viewers' => array());
            $ice = tm_ice($state['session']);
            return array('ok' => true, 'sessionId' => $id, 'iceServers' => $ice['iceServers'], 'iceExpiresAt' => $ice['iceExpiresAt'], 'turnConfigured' => (bool)$ice['turnConfigured']);
        }
        tm_session_required($state, $body);
        $session =& $state['session'];
        if (in_array($action, array('heartbeat', 'end'), true) || $role === 'publisher') tm_publisher_owned($state);
        if ($action === 'heartbeat') {
            $session['lastHeartbeat'] = time();
            if ($session['iceExpiresAt'] <= time() + 180) $session['iceExpiresAt'] = time() + 3600;
            $ice = tm_ice($session);
            return array('ok' => true, 'iceServers' => $ice['iceServers'], 'iceExpiresAt' => $ice['iceExpiresAt'], 'turnConfigured' => (bool)$ice['turnConfigured']);
        }
        if ($action === 'end') { $state['session'] = null; return array('ok' => true); }
        if ($action === 'join') {
            if (count($session['viewers']) >= 8) tm_fail('Одоогоор 8 самбар холбогдсон байна. Түр хүлээнэ үү.', 429, 'viewer_limit');
            $id = bin2hex(random_bytes(16));
            $session['viewers'][$id] = array('ownerHash' => hash('sha256', tm_cookie_token()), 'lastSeen' => time(), 'iceSentAt' => time(), 'signals' => array('publisher' => array(), 'viewer' => array()));
            tm_event($session, 'publisher', $id, 'viewer-joined');
            $ice = tm_ice($session);
            return array('ok' => true, 'viewerId' => $id, 'iceServers' => $ice['iceServers'], 'iceExpiresAt' => $ice['iceExpiresAt'], 'turnConfigured' => (bool)$ice['turnConfigured']);
        }
        if ($action === 'leave') {
            $id = tm_viewer_owned($state, $body);
            unset($session['viewers'][$id]);
            tm_event($session, 'publisher', $id, 'viewer-left');
            return array('ok' => true);
        }
        if ($action === 'poll') {
            $id = $role === 'viewer' ? tm_viewer_owned($state, $body) : null;
            if ($id) $session['viewers'][$id]['lastSeen'] = time();
            $since = (string)($body['since'] ?? '0');
            if (!preg_match('/^\d{1,12}$/D', $since) || (int)$since > $session['cursor']) tm_fail('Дохионы дараалал шинэчлэгдсэн. Дахин холбоно уу.', 409, 'cursor_invalid');
            $events = array(); $hasOffer = false;
            foreach ($session['events'] as $event) {
                if ($event['id'] > (int)$since && $event['target'] === $role && ($role === 'publisher' || $event['viewerId'] === $id)) {
                    unset($event['target']);
                    $hasOffer = $hasOffer || $event['type'] === 'offer';
                    $events[] = $event;
                }
            }
            $ice = tm_ice($session);
            $result = array('ok' => true, 'events' => $events, 'cursor' => $session['cursor'], 'viewers' => count($session['viewers']), 'turnConfigured' => (bool)$ice['turnConfigured']);
            if ($role === 'publisher') $result['viewerIds'] = array_keys($session['viewers']);
            if ($id && ($hasOffer || $session['viewers'][$id]['iceSentAt'] <= time() - 60)) {
                $session['viewers'][$id]['iceSentAt'] = time();
                $result['iceServers'] = $ice['iceServers'];
                $result['iceExpiresAt'] = $ice['iceExpiresAt'];
            }
            return $result;
        }
        if ($action === 'signal') {
            $id = (string)($body['viewerId'] ?? '');
            if ($role === 'viewer') tm_viewer_owned($state, $body);
            elseif (!preg_match('/^[a-f0-9]{32}$/D', $id) || !isset($session['viewers'][$id])) tm_fail('Самбарын холболт дууссан.', 409, 'viewer_ended');
            if (($type === 'offer' && $role !== 'publisher') || ($type === 'answer' && $role !== 'viewer')) tm_fail('Дохионы чиглэл зөвшөөрөгдөхгүй.', 403, 'role_forbidden');
            $counts =& $session['viewers'][$id]['signals'][$role];
            if ((int)($counts['windowAt'] ?? 0) <= time() - 60) $counts = array('windowAt' => time());
            $counts[$type] = (int)($counts[$type] ?? 0) + 1;
            if ($counts[$type] > ($type === 'candidate' ? 100 : 12)) tm_fail('Дохионы хүсэлт хэт ойрхон байна. Түр хүлээнэ үү.', 429, 'signal_limit');
            tm_event($session, $role === 'publisher' ? 'viewer' : 'publisher', $id, $type, $data);
            return array('ok' => true);
        }
        tm_fail('Үйлдэл олдсонгүй.', 404, 'not_found');
    });
}

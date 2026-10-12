<?php
/* Streaming playback on the listening-room display. No audio extraction or mixing. */
if (!defined('C122')) { http_response_code(404); exit; }

class SpotifySiteException extends RuntimeException
{
    public $retryAfter;
    public function __construct($message, $status = 400, $retryAfter = 0) { parent::__construct($message, $status); $this->retryAfter = $retryAfter; }
}

/* A shared deadline keeps a refresh + provider request below hosting gateway timeouts. */
function sp_http_budget()
{
    static $deadline = null;
    if ($deadline === null) $deadline = microtime(true) + 18;
    $remaining = $deadline - microtime(true);
    if ($remaining <= 0.1) throw new SpotifySiteException('Холболт удааширлаа. Хэдэн секунд хүлээгээд дахин оролдоорой.', 504);
    return min(8, $remaining);
}

function sp_config()
{
    $id = getenv('C122_SPOTIFY_CLIENT_ID') ?: 'a28a50caaee3482e81d1e5fd2cf68277';
    $redirect = getenv('C122_SPOTIFY_REDIRECT_URI') ?: 'https://12-2.lol/spotify-callback.php';
    $parts = parse_url($redirect);
    $loopback = is_array($parts) && in_array($parts['host'] ?? '', array('127.0.0.1', '[::1]', '::1'), true);
    if (!preg_match('/^[a-f0-9]{32}$/D', $id) || !is_array($parts) || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment']) ||
        !isset($parts['host'], $parts['path']) || !in_array($parts['scheme'] ?? '', $loopback ? array('http', 'https') : array('https'), true) ||
        substr($parts['path'], -strlen('/spotify-callback.php')) !== '/spotify-callback.php') throw new SpotifySiteException('Тоглуулагчийн тохиргоо хүчингүй байна.', 503);
    return array('clientId' => $id, 'redirectUri' => $redirect, 'pageUrl' => substr($redirect, 0, -strlen('spotify-callback.php')) . '#music',
        'scopes' => 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state');
}

function sp_session()
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    @ini_set('session.use_strict_mode', '1');
    @ini_set('session.use_only_cookies', '1');
    @ini_set('session.gc_maxlifetime', '86400');
    session_name('c122_spotify');
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', array('127.0.0.1', '::1'), true) && preg_match('/^(?:127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/D', $host);
    session_set_cookie_params(array('lifetime' => 0, 'path' => '/', 'secure' => !$local || is_https(), 'httponly' => true, 'samesite' => 'Lax'));
    if (!session_start()) throw new SpotifySiteException('Нэвтрэлтийг хадгалах боломжгүй байна.', 503);
    if (empty($_SESSION['sp_csrf'])) $_SESSION['sp_csrf'] = bin2hex(random_bytes(32));
}

function sp_csrf() { return $_SESSION['sp_csrf']; }
function sp_signed_in() { return !empty($_SESSION['sp_access']) && !empty($_SESSION['sp_refresh']); }
function sp_clear_auth() { foreach (array('sp_access', 'sp_refresh', 'sp_expires', 'sp_profile', 'sp_profile_time', 'sp_flow') as $key) unset($_SESSION[$key]); }
function sp_id($value) { return is_string($value) && preg_match('/^[A-Za-z0-9]{22}$/D', $value) ? $value : ''; }
function sp_uri($value, $type = 'track') { return is_string($value) && preg_match('/^spotify:' . preg_quote($type, '/') . ':[A-Za-z0-9]{22}$/D', $value) ? $value : ''; }

function sp_require_post()
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') throw new SpotifySiteException('POST хүсэлт шаардлагатай.', 405);
    $csrf = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!is_string($csrf) || !hash_equals(sp_csrf(), $csrf)) throw new SpotifySiteException('Хуудсаа дахин ачаалаад оролдоорой.', 403);
}

/** Fixed provider endpoints, bounded responses, HTTPS verification and no redirects. */
function sp_http($url, $method, $headers, $body = null)
{
    if ($url !== 'https://accounts.spotify.com/api/token' && strpos($url, 'https://api.spotify.com/v1/') !== 0) throw new SpotifySiteException('Хүсэлт хүчингүй байна.');
    $raw = ''; $status = 0; $retry = 0; $seconds = sp_http_budget();
    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl, array(CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT_MS => (int)(min(4, $seconds) * 1000), CURLOPT_TIMEOUT_MS => (int)($seconds * 1000), CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_RETURNTRANSFER => false, CURLOPT_HEADERFUNCTION => function ($handle, $line) use (&$retry) { if (preg_match('/^Retry-After:\s*([0-9]+)/i', $line, $m)) $retry = min(3600, (int)$m[1]); return strlen($line); },
            CURLOPT_WRITEFUNCTION => function ($handle, $chunk) use (&$raw) { if (strlen($raw) + strlen($chunk) > 1048576) return 0; $raw .= $chunk; return strlen($chunk); }));
        if ($body !== null) curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
        if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_HTTPS')) curl_setopt($curl, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        $done = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
        if ($done === false) $status = 0;
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        $opts = array('method' => $method, 'header' => implode("\r\n", $headers), 'timeout' => $seconds, 'follow_location' => 0, 'max_redirects' => 0, 'ignore_errors' => true);
        if ($body !== null) $opts['content'] = $body;
        $context = stream_context_create(array('http' => $opts, 'ssl' => array('verify_peer' => true, 'verify_peer_name' => true)));
        $fp = @fopen($url, 'rb', false, $context);
        if ($fp) {
            $raw = stream_get_contents($fp, 1048577); fclose($fp);
            foreach ($http_response_header ?? array() as $line) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) $status = (int)$m[1];
                if (preg_match('/^Retry-After:\s*([0-9]+)/i', $line, $m)) $retry = min(3600, (int)$m[1]);
            }
            if ($raw === false || strlen($raw) > 1048576) { $status = 0; $raw = ''; }
        }
    }
    $data = json_decode($raw, true);
    return array('status' => $status, 'data' => is_array($data) ? $data : array(), 'retryAfter' => $retry);
}

function sp_provider_error($response)
{
    $status = (int)($response['status'] ?? 0); $retry = (int)($response['retryAfter'] ?? 0);
    if ($status === 401) { sp_clear_auth(); throw new SpotifySiteException('Дахин нэвтэрнэ үү.', 401); }
    if ($status === 403) throw new SpotifySiteException('Зөвшөөрөл хүрэлцэхгүй байна. Premium эрх болон аппын зөвшөөрлийг шалгана уу.', 403);
    if ($status === 429) throw new SpotifySiteException('Хүсэлтийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоорой.', 429, max(1, $retry));
    if ($status === 404) throw new SpotifySiteException('Дуу, плейлист эсвэл тоглуулагч олдсонгүй.', 404);
    throw new SpotifySiteException('Дуу тоглуулах үйлчилгээ одоогоор хариу өгөхгүй байна. Дахин оролдоорой.', 502);
}

function sp_tokens($data)
{
    $access = $data['access_token'] ?? ''; $refresh = $data['refresh_token'] ?? ($_SESSION['sp_refresh'] ?? '');
    if (!is_string($access) || !is_string($refresh) || $access === '' || $refresh === '' || strlen($access) > 8192 || strlen($refresh) > 8192 || preg_match('/\s/', $access . $refresh)) throw new SpotifySiteException('Нэвтрэлтийн хариу хүчингүй байна.', 502);
    $_SESSION['sp_access'] = $access; $_SESSION['sp_refresh'] = $refresh;
    $_SESSION['sp_expires'] = time() + max(30, min(86400, (int)($data['expires_in'] ?? 3600))) - 20;
}

function sp_access_token($force = false, $http = null)
{
    if (!sp_signed_in()) throw new SpotifySiteException('Эхлээд тоглуулагчийг холбоорой.', 401);
    if (!$force && (int)$_SESSION['sp_expires'] > time()) return $_SESSION['sp_access'];
    $config = sp_config();
    $response = ($http ?: 'sp_http')('https://accounts.spotify.com/api/token', 'POST', array('Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'),
        http_build_query(array('grant_type' => 'refresh_token', 'refresh_token' => $_SESSION['sp_refresh'], 'client_id' => $config['clientId']), '', '&', PHP_QUERY_RFC3986));
    if ($response['status'] !== 200) {
        if (in_array($response['status'], array(400, 401), true)) { sp_clear_auth(); throw new SpotifySiteException('Нэвтрэлт дууссан байна. Дахин холбогдоорой.', 401); }
        sp_provider_error($response);
    }
    sp_tokens($response['data']);
    return $_SESSION['sp_access'];
}

function sp_request($method, $path, $query = array(), $body = null, $http = null)
{
    $token = sp_access_token(false, $http);
    $url = 'https://api.spotify.com/v1/' . $path . ($query ? '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986) : '');
    $encoded = $body === null ? null : json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $response = ($http ?: 'sp_http')($url, $method, array('Authorization: Bearer ' . $token, 'Content-Type: application/json', 'Accept: application/json'), $encoded);
    // Retry only a rejected access token; mutations are never retried for ambiguous network errors.
    if ($response['status'] === 401) {
        $token = sp_access_token(true, $http);
        $response = ($http ?: 'sp_http')($url, $method, array('Authorization: Bearer ' . $token, 'Content-Type: application/json', 'Accept: application/json'), $encoded);
    }
    if ($response['status'] < 200 || $response['status'] >= 300) sp_provider_error($response);
    return $response['data'];
}

function sp_profile($http = null)
{
    if (isset($_SESSION['sp_profile']) && time() - (int)($_SESSION['sp_profile_time'] ?? 0) < 120) return $_SESSION['sp_profile'];
    $data = sp_request('GET', 'me', array(), null, $http);
    $profile = array('id' => (string)($data['id'] ?? ''), 'displayName' => clean_str($data['display_name'] ?? '', 120), 'product' => clean_str($data['product'] ?? '', 30));
    $_SESSION['sp_profile'] = $profile; $_SESSION['sp_profile_time'] = time(); return $profile;
}

function sp_image($images)
{
    foreach (is_array($images) ? $images : array() as $image) {
        $url = $image['url'] ?? ''; $parts = is_string($url) ? parse_url($url) : false; $host = strtolower($parts['host'] ?? '');
        if ($parts && ($parts['scheme'] ?? '') === 'https' && !isset($parts['user']) && !isset($parts['pass']) && (preg_match('/(?:^|\.)scdn\.co$/D', $host) || preg_match('/(?:^|\.)spotifycdn\.com$/D', $host))) return $url;
    }
    return '';
}

function sp_track($data)
{
    if (!is_array($data) || !sp_id($data['id'] ?? '') || ($data['type'] ?? 'track') !== 'track') return null;
    $artists = array(); foreach ($data['artists'] ?? array() as $artist) $artists[] = clean_str($artist['name'] ?? '', 100);
    return array('id' => $data['id'], 'uri' => 'spotify:track:' . $data['id'], 'title' => clean_str($data['name'] ?? 'Дуу', 180), 'artist' => implode(', ', $artists),
        'album' => clean_str($data['album']['name'] ?? '', 180), 'image' => sp_image($data['album']['images'] ?? array()), 'url' => 'https://open.spotify.com/track/' . $data['id'],
        'durationMs' => max(0, (int)($data['duration_ms'] ?? 0)), 'playable' => ($data['is_playable'] ?? true) !== false);
}

function sp_playlist($data, $profileId)
{
    $id = sp_id($data['id'] ?? '');
    return array('id' => $id, 'uri' => 'spotify:playlist:' . $id, 'name' => clean_str($data['name'] ?? 'Плейлист', 100), 'description' => clean_str($data['description'] ?? '', 500),
        'image' => sp_image($data['images'] ?? array()), 'url' => 'https://open.spotify.com/playlist/' . $id, 'ownerId' => (string)($data['owner']['id'] ?? ''),
        'editable' => $profileId !== '' && (string)($data['owner']['id'] ?? '') === $profileId,
        'trackCount' => (int)($data['items']['total'] ?? $data['tracks']['total'] ?? 0), 'snapshotId' => (string)($data['snapshot_id'] ?? ''));
}

function sp_oauth_begin()
{
    $config = sp_config(); $state = bin2hex(random_bytes(32)); $verifier = b64u_enc(random_bytes(64));
    $_SESSION['sp_flow'] = array('state' => $state, 'verifier' => $verifier, 'time' => time(), 'redirect' => $config['redirectUri']);
    return 'https://accounts.spotify.com/authorize?' . http_build_query(array('client_id' => $config['clientId'], 'response_type' => 'code', 'redirect_uri' => $config['redirectUri'],
        'scope' => $config['scopes'], 'state' => $state, 'code_challenge_method' => 'S256', 'code_challenge' => b64u_enc(hash('sha256', $verifier, true))), '', '&', PHP_QUERY_RFC3986);
}

function sp_oauth_complete($query, $http = null)
{
    $flow = $_SESSION['sp_flow'] ?? null; $state = $query['state'] ?? ''; $config = sp_config();
    if (!is_array($flow) || !is_string($state) || !hash_equals($flow['state'], $state) || time() - $flow['time'] > 600 || $flow['redirect'] !== $config['redirectUri']) throw new SpotifySiteException('Нэвтрэлтийн холбоос дууссан эсвэл хүчингүй байна. Дахин холбогдоорой.', 400);
    unset($_SESSION['sp_flow']);
    if (isset($query['error'])) throw new SpotifySiteException('Нэвтрэлтийг цуцаллаа. Хүсвэл дахин холбогдоорой.', 400);
    $code = $query['code'] ?? '';
    if (!is_string($code) || $code === '' || strlen($code) > 4096 || preg_match('/[\x00-\x20\x7f]/', $code)) throw new SpotifySiteException('Нэвтрэлтийн код хүчингүй байна.', 400);
    $response = ($http ?: 'sp_http')('https://accounts.spotify.com/api/token', 'POST', array('Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'),
        http_build_query(array('grant_type' => 'authorization_code', 'client_id' => $config['clientId'], 'code' => $code, 'redirect_uri' => $flow['redirect'], 'code_verifier' => $flow['verifier']), '', '&', PHP_QUERY_RFC3986));
    if ($response['status'] !== 200) { sp_provider_error($response); }
    // Initial authorization must not borrow another account's old refresh token.
    if (!is_string($response['data']['refresh_token'] ?? null) || $response['data']['refresh_token'] === '') throw new SpotifySiteException('Нэвтрэлтийн хариу хүчингүй байна. Дахин холбогдоорой.', 502);
    sp_tokens($response['data']); unset($_SESSION['sp_profile'], $_SESSION['sp_profile_time']);
    if (session_status() === PHP_SESSION_ACTIVE) session_regenerate_id(true);
}

/* ---------- Smart Mix: AI (Anthropic) song ordering ---------- */
function sp_ai_settings()
{
    $file = is_file(C122_ROOT . '/ai-settings.php') ? C122_ROOT . '/ai-settings.php' : DB_DIR . '/ai-settings.php';
    $saved = read_guarded($file);
    return is_array($saved) ? $saved : array();
}
function sp_anthropic_key()
{
    $env = getenv('C122_ANTHROPIC_API_KEY');
    if (is_string($env) && trim($env) !== '') return trim($env);
    $saved = sp_ai_settings();
    $key = trim((string)($saved['anthropicApiKey'] ?? ''));
    return preg_match('#^sk-ant-[A-Za-z0-9_-]{20,250}$#D', $key) ? $key : '';
}
function sp_automix_model()
{
    $saved = sp_ai_settings();
    $m = trim((string)($saved['automixModel'] ?? ''));
    return preg_match('#^[A-Za-z0-9._-]{3,60}$#D', $m) ? $m : 'claude-haiku-5-5';
}
/** Approximate per-day cap so AI ordering cannot run away on credits. */
function sp_automix_allowed()
{
    $cap = 500; $saved = sp_ai_settings();
    if (isset($saved['automixDaily'])) $cap = max(0, min(100000, (int)$saved['automixDaily']));
    if ($cap <= 0) return false;
    $file = DB_DIR . '/automix.php'; $today = date('Y-m-d');
    $state = read_guarded($file); if (!is_array($state) || ($state['day'] ?? '') !== $today) $state = array('day' => $today, 'count' => 0);
    if ((int)$state['count'] >= $cap) return false;
    $state['count'] = (int)$state['count'] + 1; write_guarded($file, $state);
    return true;
}
function sp_anthropic_http($key, $payload)
{
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $headers = array('content-type: application/json', 'x-api-key: ' . $key, 'anthropic-version: 2023-06-01');
    $raw = ''; $status = 0;
    if (function_exists('curl_init')) {
        $curl = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($curl, array(CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_HTTPHEADER => $headers, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 12, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_RETURNTRANSFER => false,
            CURLOPT_WRITEFUNCTION => function ($h, $chunk) use (&$raw) { if (strlen($raw) + strlen($chunk) > 262144) return 0; $raw .= $chunk; return strlen($chunk); }));
        if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_HTTPS')) curl_setopt($curl, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        $done = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
        if ($done === false) return array('status' => 0, 'data' => null);
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        $context = stream_context_create(array('http' => array('method' => 'POST', 'header' => implode("\r\n", $headers), 'content' => $body, 'timeout' => 12, 'follow_location' => 0, 'max_redirects' => 0, 'ignore_errors' => true), 'ssl' => array('verify_peer' => true, 'verify_peer_name' => true)));
        $fp = @fopen('https://api.anthropic.com/v1/messages', 'rb', false, $context);
        if (!$fp) return array('status' => 0, 'data' => null);
        $raw = stream_get_contents($fp, 262145); fclose($fp);
        foreach ($http_response_header ?? array() as $line) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) $status = (int)$m[1];
    } else return array('status' => 0, 'data' => null);
    $data = json_decode((string)$raw, true);
    return array('status' => $status, 'data' => is_array($data) ? $data : null);
}
/** $tracks: list of {t:title, a:artist, bpm?, e?, k?}. Returns a validated permutation (0 first) or null. */
function sp_anthropic_order($tracks)
{
    $key = sp_anthropic_key(); if ($key === '') return null;
    $n = count($tracks); if ($n < 3 || $n > 50) return null;
    if (!sp_automix_allowed()) return null;
    $lines = array();
    foreach ($tracks as $i => $t) {
        $meta = array();
        if (isset($t['bpm']) && (float)$t['bpm'] > 0) $meta[] = round((float)$t['bpm']) . ' BPM';
        if (isset($t['e'])) $meta[] = 'energy ' . round((float)$t['e'], 2);
        if (isset($t['k']) && (int)$t['k'] >= 0) $meta[] = 'key ' . (int)$t['k'];
        $lines[] = $i . ': "' . clean_str($t['t'] ?? '', 120) . '" — ' . clean_str($t['a'] ?? '', 120) . ($meta ? ' [' . implode(', ', $meta) . ']' : '');
    }
    $system = 'You are an expert DJ sequencing a playlist so each song flows smoothly into the next by tempo, energy, key and mood. Song 0 is already playing and must stay first. Respond with ONLY a JSON array of integers: a permutation of 0..' . ($n - 1) . ' that starts with 0. No words, no code fences.';
    $user = "Order these " . $n . " songs for the smoothest set:\n" . implode("\n", $lines);
    $payload = array('model' => sp_automix_model(), 'max_tokens' => 512, 'system' => $system, 'messages' => array(array('role' => 'user', 'content' => $user)), 'thinking' => array('type' => 'disabled'));
    $response = sp_anthropic_http($key, $payload);
    if ($response['status'] === 400) { unset($payload['thinking']); $response = sp_anthropic_http($key, $payload); }   // some models reject the thinking param
    if ($response['status'] !== 200 || !is_array($response['data']['content'] ?? null)) return null;
    $text = '';
    foreach ($response['data']['content'] as $block) { if (is_array($block) && ($block['type'] ?? '') === 'text' && isset($block['text'])) $text .= (string)$block['text']; }
    if ($text === '') return null;
    if (!preg_match('/\[[\s0-9,]*\]/', $text, $m)) return null;
    $order = json_decode($m[0], true); if (!is_array($order) || count($order) !== $n) return null;
    $seen = array(); $clean = array();
    foreach ($order as $idx) { $idx = (int)$idx; if ($idx < 0 || $idx >= $n || isset($seen[$idx])) return null; $seen[$idx] = true; $clean[] = $idx; }
    if (count($clean) !== $n || $clean[0] !== 0) return null;   // must be a full permutation starting at the seed
    return $clean;
}

function sp_dispatch($action)
{
    $config = sp_config();
    if ($action === 'status') {
        $flash = $_SESSION['sp_flash'] ?? ''; unset($_SESSION['sp_flash']);
        $profile = null; $retry = 0;
        if (sp_signed_in()) {
            try { $profile = sp_profile(); }
            catch (SpotifySiteException $e) { $flash = $e->getMessage(); $retry = $e->retryAfter; }
        }
        return array('ok' => true, 'connected' => sp_signed_in(), 'csrf' => sp_csrf(), 'clientId' => $config['clientId'], 'redirectUri' => $config['redirectUri'],
            'profile' => $profile, 'notice' => $flash, 'retryAfter' => $retry);
    }
    $writes = array('connect', 'disconnect', 'token', 'play', 'aimix');
    if (in_array($action, $writes, true)) sp_require_post();
    $body = array();
    if (in_array($action, $writes, true)) {
        $raw = file_get_contents('php://input', false, null, 0, 32769);
        if (strlen($raw) > 32768) throw new SpotifySiteException('Хүсэлт хэт том байна.', 413);
        $body = json_decode($raw, true) ?: array(); if (!is_array($body)) throw new SpotifySiteException('Хүсэлт хүчингүй байна.');
    }
    if ($action === 'connect') return array('ok' => true, 'url' => sp_oauth_begin());
    if ($action === 'disconnect') { sp_clear_auth(); return array('ok' => true); }
    if (!sp_signed_in()) throw new SpotifySiteException('Эхлээд тоглуулагчийг холбоорой.', 401);
    if ($action === 'token') return array('ok' => true, 'accessToken' => sp_access_token(($body['forceRefresh'] ?? false) === true), 'expiresIn' => max(0, (int)$_SESSION['sp_expires'] - time()));
    $minute = (int)floor(time() / 60);
    if (($_SESSION['sp_rate']['minute'] ?? 0) !== $minute) $_SESSION['sp_rate'] = array('minute' => $minute, 'count' => 0);
    if (++$_SESSION['sp_rate']['count'] > 90) throw new SpotifySiteException('Түр хүлээгээд дахин оролдоорой.', 429, 60);
    if ($action === 'profile') return array('ok' => true, 'profile' => sp_profile());
    if ($action === 'search') {
        $q = clean_str($_GET['q'] ?? '', 200); if ($q === '') return array('ok' => true, 'tracks' => array());
        $data = sp_request('GET', 'search', array('q' => $q, 'type' => 'track', 'limit' => 10)); $tracks = array();
        foreach ($data['tracks']['items'] ?? array() as $item) { $track = sp_track($item); if ($track) $tracks[] = $track; }
        return array('ok' => true, 'tracks' => $tracks);
    }
    if ($action === 'play') {
        $device = $body['deviceId'] ?? ''; if (!is_string($device) || !preg_match('/^[A-Za-z0-9_-]{1,128}$/D', $device)) throw new SpotifySiteException('Тоглуулагч бэлэн болохыг хүлээнэ үү.');
        $play = array('position_ms' => max(0, min(86400000, (int)($body['positionMs'] ?? 0))));
        if (!empty($body['contextUri']) && sp_uri($body['contextUri'], 'playlist')) {
            $play['context_uri'] = $body['contextUri'];
            if (!empty($body['offsetUri'])) {
                if (!sp_uri($body['offsetUri'])) throw new SpotifySiteException('Дуу хүчингүй байна.');
                $play['offset'] = array('uri' => $body['offsetUri']);
            }
        }
        elseif (is_array($body['uris'] ?? null) && count($body['uris']) > 0 && count($body['uris']) <= 250) {
            foreach ($body['uris'] as $uri) if (!sp_uri($uri)) throw new SpotifySiteException('Дуу хүчингүй байна.');
            $play['uris'] = array_values($body['uris']);
        } else throw new SpotifySiteException('Эхлээд дуу сонгоорой.');
        // A targeted play request selects the SDK device without a redundant transfer on every song.
        sp_request('PUT', 'me/player/play', array('device_id' => $device), $play);
        return array('ok' => true);
    }
    if ($action === 'aimix') {
        // AI (Anthropic) playlist ordering for Smart Mix. Returns a permutation or null → client falls back locally.
        $tracks = array();
        if (is_array($body['tracks'] ?? null)) {
            foreach ($body['tracks'] as $t) {
                if (!is_array($t)) continue;
                $entry = array('t' => clean_str($t['t'] ?? '', 120), 'a' => clean_str($t['a'] ?? '', 120));
                if (isset($t['bpm']) && is_numeric($t['bpm'])) $entry['bpm'] = (float)$t['bpm'];
                if (isset($t['e']) && is_numeric($t['e'])) $entry['e'] = (float)$t['e'];
                if (isset($t['k']) && is_numeric($t['k'])) $entry['k'] = (int)$t['k'];
                $tracks[] = $entry;
                if (count($tracks) >= 50) break;
            }
        }
        $order = null;
        try { $order = sp_anthropic_order($tracks); } catch (Throwable $e) { $order = null; }
        return array('ok' => true, 'order' => $order, 'configured' => sp_anthropic_key() !== '');
    }
    if ($action === 'features') {
        // Audio features for Smart Mix ordering (tempo / energy / key). Read-only, up to 50 ids.
        $ids = array();
        foreach (explode(',', (string)($_GET['ids'] ?? '')) as $raw) { $id = sp_id(trim($raw)); if ($id !== '' && !in_array($id, $ids, true)) $ids[] = $id; if (count($ids) >= 50) break; }
        if (!$ids) return array('ok' => true, 'features' => array());
        $data = sp_request('GET', 'audio-features', array('ids' => implode(',', $ids)));
        $out = array();
        foreach ($data['audio_features'] ?? array() as $f) {
            if (!is_array($f) || empty($f['id'])) continue;
            $out[$f['id']] = array('tempo' => (float)($f['tempo'] ?? 0), 'energy' => (float)($f['energy'] ?? 0), 'valence' => (float)($f['valence'] ?? 0), 'danceability' => (float)($f['danceability'] ?? 0), 'key' => (int)($f['key'] ?? -1), 'mode' => (int)($f['mode'] ?? 0));
        }
        return array('ok' => true, 'features' => $out);
    }
    throw new SpotifySiteException('Үйлдэл олдсонгүй.', 404);
}

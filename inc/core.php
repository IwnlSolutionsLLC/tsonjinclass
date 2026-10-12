<?php
/*
 * 12-2 ангийн вэб — нийтлэг функцууд.
 * index.php, admin.php, api.php гурвуулаа үүнийг ашиглана.
 * Шууд хандвал 404 буцаана.
 */
if (!defined('C122')) { http_response_code(404); exit; }

date_default_timezone_set('Asia/Ulaanbaatar');
@ini_set('display_errors', '0');

define('C122_ROOT', dirname(__DIR__));
define('DB_DIR', C122_ROOT . '/database');
define('PHOTOS_DIR', DB_DIR . '/photos');      // эх зураг, видео
define('THUMBS_DIR', DB_DIR . '/thumbs');      // жижиг зураг + мэдээлэл (.json)
define('TMP_DIR', DB_DIR . '/tmp');            // хэсэгчлэн байршуулж буй файлууд
define('BACKUP_DIR', DB_DIR . '/backups');     // хуваарийн нөөц
define('SCHEDULE_FILE', DB_DIR . '/datas.json');
define('SCHEDULE_PDF', DB_DIR . '/schedule.pdf');
define('ADMIN_FILE', DB_DIR . '/admin.php');   // нууц үгийн hash (PHP хамгаалалттай)
define('SECURITY_FILE', DB_DIR . '/security.php');
define('SETUP_FILE', DB_DIR . '/setup.php');      // анхны тохиргооны код (PHP хамгаалалттай)
define('MIN_PASSWORD', 8);
define('PHOTOS_URL', 'database/photos/');
define('THUMBS_URL', 'database/thumbs/');
define('AUTH_COOKIE', 'c122_admin');
define('ALBUM_FILE', DB_DIR . '/album.php');     // цомгийн 4 оронтой кодын hash
define('SECRET_FILE', DB_DIR . '/secret.php');   // cookie гарын үсгийн нууц түлхүүр
define('ALBUM_COOKIE', 'c122_album');
define('DEFAULT_ALBUM_PIN', '4200');             // админ «Удирдлага» хэсгээс сольж болно
define('ALBUM_TTL', 12 * 3600);                  // цомгийн нэвтрэлт 12 цаг (хөтөч хаахад мөн дуусна)
define('DEFAULT_QUOTA_GB', 500);
define('CHUNK_CAP', 48 * 1024 * 1024);         // Cloudflare-ийн 100MB хязгаараас доош
define('CHUNK_FLOOR', 512 * 1024);
define('GUARD_LINE', '<?php http_response_code(404); exit; ?>');

/* ---------- Жижиг туслахууд ---------- */

/** Keep JSON list validation compatible with hosts older than PHP 8.1. */
function is_list_array($value)
{
    if (!is_array($value)) return false;
    $index = 0;
    foreach ($value as $key => $_) if ($key !== $index++) return false;
    return true;
}

function cut($s, $max)
{
    if (function_exists('mb_substr')) return mb_substr($s, 0, $max, 'UTF-8');
    if (preg_match('/^.{0,' . (int)$max . '}/us', $s, $m)) return $m[0];
    return substr($s, 0, $max);
}

function clean_str($v, $max = 120)
{
    if (!is_string($v) && !is_int($v) && !is_float($v)) return '';
    $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string)$v);
    if ($s === null) return '';
    $s = preg_replace('/\s+/u', ' ', $s);
    if ($s === null) return '';
    return cut(trim($s), $max);
}

function b64u_enc($bin)
{
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function b64u_dec($s)
{
    $r = base64_decode(strtr($s, '-_', '+/'), true);
    return $r === false ? '' : $r;
}

function ensure_dirs()
{
    foreach (array(DB_DIR, PHOTOS_DIR, THUMBS_DIR, TMP_DIR, BACKUP_DIR) as $d) {
        if (!is_dir($d)) @mkdir($d, 0775, true);
    }
}

function ini_bytes($v)
{
    $v = trim((string)$v);
    if ($v === '') return 0;
    $n = (float)$v;
    $u = strtolower(substr($v, -1));
    if ($u === 'g') $n *= 1024 * 1024 * 1024;
    elseif ($u === 'm') $n *= 1024 * 1024;
    elseif ($u === 'k') $n *= 1024;
    return (int)$n;
}

/* ---------- Файл унших / бичих ---------- */

/** JSON-г атомаар бичнэ: эхлээд encode, дараа нь түр файлд, эцэст нь rename. */
function write_file_atomic($file, $contents)
{
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, $contents, LOCK_EX) === false) return false;
    @chmod($tmp, 0664);
    if (!@rename($tmp, $file)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

function json_encode_pretty($data)
{
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
}

function read_json($file, $default = null)
{
    if (!is_file($file)) return $default;
    $raw = @file_get_contents($file);
    if ($raw === false || $raw === '') return $default;
    $d = json_decode($raw, true);
    return is_array($d) ? $d : $default;
}

function write_json($file, $data)
{
    $json = json_encode_pretty($data);
    if ($json === false) return false;
    return write_file_atomic($file, $json . "\n");
}

/** PHP хамгаалалттай JSON: эхний мөр нь <?php ... exit; ?> учраас вэбээс уншигдахгүй. */
function read_guarded($file)
{
    if (!is_file($file)) return null;
    $raw = @file_get_contents($file);
    if ($raw === false) return null;
    $nl = strpos($raw, "\n");
    if (substr($raw, 0, 5) === '<?php' && $nl !== false) $raw = substr($raw, $nl + 1);
    $d = json_decode($raw, true);
    return is_array($d) ? $d : null;
}

function write_guarded($file, $data)
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false) return false;
    return write_file_atomic($file, GUARD_LINE . "\n" . $json . "\n");
}

/* ---------- Админ, нэвтрэлт ---------- */

function admin_cfg($reload = false)
{
    static $cfg = null, $loaded = false;
    if (!$loaded || $reload) {
        $cfg = read_guarded(ADMIN_FILE);
        $loaded = true;
    }
    return $cfg;
}

function setup_needed()
{
    $c = admin_cfg();
    return !$c || empty($c['hash']) || empty($c['secret']);
}

function quota_bytes()
{
    $c = admin_cfg();
    $gb = ($c && isset($c['quotaGb'])) ? (float)$c['quotaGb'] : DEFAULT_QUOTA_GB;
    if ($gb <= 0) $gb = DEFAULT_QUOTA_GB;
    return (int)($gb * 1024 * 1024 * 1024);
}

function is_https()
{
    if (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') return true;
    if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') return true;
    if (isset($_SERVER['HTTP_CF_VISITOR']) && strpos($_SERVER['HTTP_CF_VISITOR'], 'https') !== false) return true;
    return false;
}

function issue_token($cfg)
{
    $payload = b64u_enc(json_encode(array(
        'v' => (int)$cfg['version'],
        'exp' => time() + 30 * 86400,
        'n' => bin2hex(random_bytes(8)),
    )));
    return $payload . '.' . b64u_enc(hash_hmac('sha256', $payload, $cfg['secret'], true));
}

function token_ok($tok, $cfg)
{
    if (!$cfg || !is_string($tok) || strpos($tok, '.') === false) return false;
    list($payload, $sig) = explode('.', $tok, 2);
    $want = b64u_enc(hash_hmac('sha256', $payload, $cfg['secret'], true));
    if (!hash_equals($want, $sig)) return false;
    $p = json_decode(b64u_dec($payload), true);
    if (!is_array($p)) return false;
    if ((int)($p['v'] ?? -1) !== (int)$cfg['version']) return false;
    return (int)($p['exp'] ?? 0) > time();
}

function auth_token()
{
    return isset($_COOKIE[AUTH_COOKIE]) ? (string)$_COOKIE[AUTH_COOKIE] : '';
}

function is_admin()
{
    $c = admin_cfg();
    return !setup_needed() && token_ok(auth_token(), $c);
}

/** Сайтын нууц түлхүүр (цомгийн cookie, CSRF). Анх хэрэгтэй үед database/secret.php-д үүснэ. */
function site_secret()
{
    static $secret = null;
    if ($secret !== null) return $secret;
    for ($i = 0; $i < 20; $i++) {
        $d = read_guarded(SECRET_FILE);
        if ($d && !empty($d['secret'])) return $secret = (string)$d['secret'];
        ensure_dirs();
        // 'x' горим: хоёр хүсэлт зэрэг ирвэл зөвхөн нэг нь үүсгэнэ
        $fp = @fopen(SECRET_FILE, 'x');
        if ($fp) {
            fwrite($fp, GUARD_LINE . "\n" . json_encode(array('secret' => bin2hex(random_bytes(32)), 'created' => date('c'))) . "\n");
            fclose($fp);
            @chmod(SECRET_FILE, 0664);
            continue;
        }
        if (!is_file(SECRET_FILE)) return $secret = '';   // бичих эрхгүй
        usleep(50000);                                     // нөгөө хүсэлт бичиж дуусахыг хүлээнэ
    }
    return $secret = '';
}

function cookie_val($name)
{
    return isset($_COOKIE[$name]) ? (string)$_COOKIE[$name] : '';
}

/** CSRF токен нь тухайн хөтчийн admin + цомгийн cookie-оос гарган авсан HMAC. X-CSRF толгойгоор ирнэ. */
function csrf_token()
{
    $sec = site_secret();
    $a = cookie_val(AUTH_COOKIE);
    $b = cookie_val(ALBUM_COOKIE);
    if ($sec === '' || ($a === '' && $b === '')) return '';
    return b64u_enc(hash_hmac('sha256', 'csrf|' . $a . '|' . $b, $sec, true));
}

function csrf_ok()
{
    $want = csrf_token();
    $hdr = isset($_SERVER['HTTP_X_CSRF']) ? (string)$_SERVER['HTTP_X_CSRF'] : '';
    return $want !== '' && hash_equals($want, $hdr);
}

function set_cookie_value($name, $value, $expires)
{
    setcookie($name, $value, array(
        'expires' => $expires,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ));
    if ($value !== '' && ($expires === 0 || $expires > time())) $_COOKIE[$name] = $value;
    else unset($_COOKIE[$name]);
}

function set_auth_cookie($value, $expires)
{
    set_cookie_value(AUTH_COOKIE, $value, $expires);
}

/* ---------- Цомог (4 оронтой код) ---------- */

function album_cfg()
{
    $c = read_guarded(ALBUM_FILE);
    return is_array($c) ? $c : array('version' => 1);
}

function album_pin_ok($pin)
{
    if (!is_string($pin) || !preg_match('/^\d{4}$/', $pin)) return false;
    $c = album_cfg();
    if (!empty($c['hash'])) return password_verify($pin, $c['hash']);
    return hash_equals(DEFAULT_ALBUM_PIN, $pin);
}

function album_token_ok($tok)
{
    $sec = site_secret();
    if ($sec === '' || !is_string($tok) || strpos($tok, '.') === false) return false;
    list($payload, $sig) = explode('.', $tok, 2);
    if (!hash_equals(b64u_enc(hash_hmac('sha256', 'album|' . $payload, $sec, true)), $sig)) return false;
    $p = json_decode(b64u_dec($payload), true);
    if (!is_array($p)) return false;
    $c = album_cfg();
    return (int)($p['v'] ?? -1) === (int)($c['version'] ?? 1) && (int)($p['exp'] ?? 0) > time();
}

/** Цомгийг нээнэ: хөтөч хаахад дуусах session cookie, сервер талдаа 12 цагийн хугацаатай. */
function album_unlock_now()
{
    $c = album_cfg();
    $payload = b64u_enc(json_encode(array('v' => (int)($c['version'] ?? 1), 'exp' => time() + ALBUM_TTL, 'n' => bin2hex(random_bytes(8)))));
    $tok = $payload . '.' . b64u_enc(hash_hmac('sha256', 'album|' . $payload, site_secret(), true));
    set_cookie_value(ALBUM_COOKIE, $tok, 0);
}

/** Цомог үзэх, зураг нэмэх эрх: цомгийн код оруулсан эсвэл админ. */
function is_member()
{
    return is_admin() || album_token_ok(cookie_val(ALBUM_COOKIE));
}

function login_now()
{
    $cfg = admin_cfg(true);
    $tok = issue_token($cfg);
    set_auth_cookie($tok, time() + 30 * 86400);
    return $tok;
}

/** Cloudflare-ийн IP хүрээ (https://www.cloudflare.com/ips/). Зөвхөн эдгээрээс ирсэн CF-Connecting-IP-д итгэнэ. */
function cloudflare_ranges()
{
    return array(
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
        '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
        '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
        '2a06:98c0::/29', '2c0f:f248::/32',
    );
}

function ip_in_cidr($ip, $cidr)
{
    list($net, $bits) = explode('/', $cidr);
    $a = @inet_pton($ip);
    $b = @inet_pton($net);
    if ($a === false || $b === false || strlen($a) !== strlen($b)) return false;
    $bits = (int)$bits;
    $full = intdiv($bits, 8);
    $rem = $bits % 8;
    if ($full && substr($a, 0, $full) !== substr($b, 0, $full)) return false;
    if ($rem) {
        $mask = (0xFF << (8 - $rem)) & 0xFF;
        if ((ord($a[$full]) & $mask) !== (ord($b[$full]) & $mask)) return false;
    }
    return true;
}

/** ::ffff:1.2.3.4 (dual-stack socket) хэлбэрийг энгийн IPv4 болгоно. */
function normalize_ip($ip)
{
    $b = @inet_pton($ip);
    if ($b !== false && strlen($b) === 16 && substr($b, 0, 12) === str_repeat("\0", 10) . "\xff\xff") {
        return inet_ntop(substr($b, 12));
    }
    return $ip;
}

function client_ip()
{
    $remote = isset($_SERVER['REMOTE_ADDR']) && filter_var($_SERVER['REMOTE_ADDR'], FILTER_VALIDATE_IP) ? normalize_ip($_SERVER['REMOTE_ADDR']) : '0.0.0.0';
    $cf = isset($_SERVER['HTTP_CF_CONNECTING_IP']) ? trim((string)$_SERVER['HTTP_CF_CONNECTING_IP']) : '';
    if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP)) {
        foreach (cloudflare_ranges() as $r) {
            if (ip_in_cidr($remote, $r)) return normalize_ip($cf);
        }
    }
    return $remote;
}

/** Хязгаарлалтын түлхүүр: IPv4 бүтнээр, IPv6-г /64 сүлжээгээр нь. */
function throttle_key($scope = 'login')
{
    $ip = client_ip();
    if (strpos($ip, ':') !== false) {
        $bin = @inet_pton($ip);
        // Цомгийн код (10 000 л хувилбартай) бол IPv6-г /48-аар бүлэглэнэ
        $n = $scope === 'pin' ? 6 : 8;
        if ($bin !== false && strlen($bin) === 16) $ip = bin2hex(substr($bin, 0, $n)) . ($n === 6 ? '::/48' : '::/64');
    }
    return $scope . '|' . $ip;
}

/*
 * Нууц үг буруу оруулалтын хязгаар (10 минутын цонх):
 *   нэг IP — 5 удаа алдвал 10 минут түгжинэ;
 *   бүх сайт — 30 удаа алдвал 10 минут түгжинэ (олон IP-ээс оролдохоос хамгаална).
 * Дуудагч нь login_lock()-ийг барьсан байх ёстой.
 */
function throttle_state()
{
    $s = read_guarded(SECURITY_FILE);
    return is_array($s) ? $s : array();
}

function login_lock()
{
    $fp = @fopen(DB_DIR . '/.login.lock', 'c');
    if ($fp) flock($fp, LOCK_EX);
    return $fp;
}

function login_unlock($fp)
{
    if ($fp) {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

function throttle_locked_for($scope = 'login')
{
    $s = throttle_state();
    $now = time();
    $k = throttle_key($scope);
    $all = $scope . '|*';
    $mine = isset($s[$k]) && is_array($s[$k]) ? $s[$k] : array();
    $wait = 0;
    if (isset($mine['until']) && $mine['until'] > $now) $wait = $mine['until'] - $now;
    // Сайт даяарх түгжээ зөвхөн энэ цонхонд аль хэдийн алдсан IP-д үйлчилнэ.
    // Ингэснээр олон IP-ээс халдсан ч жинхэнэ эзэн шинэ IP-ээс нэвтэрч чадна.
    // Цомгийн кодын хувьд сайт даяарх түгжээ хүн бүрт үйлчилнэ (олон IP-ээс таахаас хамгаална)
    $failedHere = $scope === 'pin' || ((int)($mine['fails'] ?? 0) > 0 && (int)($mine['start'] ?? 0) >= $now - 600);
    if ($failedHere && isset($s[$all]['until']) && $s[$all]['until'] > $now) $wait = max($wait, $s[$all]['until'] - $now);
    return $wait;
}

function throttle_bump(&$s, $key, $max, $now)
{
    $e = isset($s[$key]) && is_array($s[$key]) ? $s[$key] : array();
    if ((int)($e['start'] ?? 0) < $now - 600) {
        $e['start'] = $now;
        $e['fails'] = 0;
    }
    $e['fails'] = (int)($e['fails'] ?? 0) + 1;
    $e['last'] = $now;
    if ($e['fails'] >= $max) {
        $e['until'] = $now + 600;
        $e['fails'] = 0;
        $e['start'] = $now;
    }
    $s[$key] = $e;
}

function throttle_fail($scope = 'login')
{
    $s = throttle_state();
    $now = time();
    foreach ($s as $k => $v) {
        if (!is_array($v) || (int)($v['last'] ?? 0) < $now - 86400) unset($s[$k]);
    }
    if (count($s) > 500) {
        uasort($s, function ($a, $b) { return (int)($b['last'] ?? 0) <=> (int)($a['last'] ?? 0); });
        $s = array_slice($s, 0, 500, true);
    }
    throttle_bump($s, throttle_key($scope), 5, $now);
    throttle_bump($s, $scope . '|*', 30, $now);
    write_guarded(SECURITY_FILE, $s);
}

function throttle_clear($scope = 'login')
{
    $s = throttle_state();
    $k = throttle_key($scope);
    if (isset($s[$k])) {
        unset($s[$k]);
        write_guarded(SECURITY_FILE, $s);
    }
}

/*
 * Анхны тохиргооны код: нууц үг үүсээгүй үед database/setup.php файлд үүснэ.
 * Сайт эзэмшигч Pterodactyl-ийн File Manager-ээс уг файлыг нээж кодыг хуулна.
 * Ингэснээр сайт руу орсон санамсаргүй хүн админ болж чадахгүй.
 */
function setup_code()
{
    $s = read_guarded(SETUP_FILE);
    if ($s && !empty($s['code'])) return (string)$s['code'];
    $abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 8; $i++) $code .= $abc[random_int(0, strlen($abc) - 1)];
    ensure_dirs();
    $ok = write_guarded(SETUP_FILE, array(
        'code' => $code,
        'note' => 'Энэ кодыг admin.php дээрх «Тохиргооны код» талбарт оруулна. Нууц үг үүссэний дараа энэ файл автоматаар устна.',
        'created' => date('c'),
    ));
    return $ok ? $code : '';   // '' = database/ руу бичих эрхгүй
}

/* ---------- Хуваарь ---------- */

function default_periods()
{
    $t = array('08:00-08:40', '08:45-09:25', '09:30-10:10', '10:15-10:55', '11:00-11:40', '11:45-12:25', '12:50-13:30',
        '13:35-14:15', '14:20-15:00', '15:05-15:45', '15:50-16:30', '16:35-17:15', '17:20-18:00', '18:05-18:45');
    $out = array();
    foreach ($t as $i => $r) {
        list($a, $b) = explode('-', $r);
        $out[] = array('n' => $i + 1, 'start' => $a, 'end' => $b);
    }
    return $out;
}

function default_schedule()
{
    return array(
        'version' => 1,
        'className' => '12-2',
        'school' => '',
        'term' => '',
        'homeroom' => array('teacher' => '', 'room' => ''),
        'periods' => default_periods(),
        'lessons' => array(),
        'teacherSubjects' => array(),   // багш -> хичээл (PDF дахин оруулахад засварласан нэрийг хадгална)
        'source' => null,
        'updatedAt' => null,
    );
}

function valid_time($t)
{
    if (!is_string($t) || !preg_match('/^(\d{1,2}):(\d{2})$/', trim($t), $m)) return null;
    $h = (int)$m[1];
    $mi = (int)$m[2];
    if ($h > 23 || $mi > 59) return null;
    return sprintf('%02d:%02d', $h, $mi);
}

/** Орж ирсэн хуваарийг шалгаж, цэвэрлэнэ. Буруу мөрүүдийг алгасна. */
function normalize_schedule($in)
{
    $d = default_schedule();
    if (!is_array($in)) return $d;

    $cn = clean_str($in['className'] ?? '', 20);
    $d['className'] = $cn !== '' ? $cn : '12-2';
    $d['school'] = clean_str($in['school'] ?? '', 160);
    $d['term'] = clean_str($in['term'] ?? '', 160);
    $hr = isset($in['homeroom']) && is_array($in['homeroom']) ? $in['homeroom'] : array();
    $d['homeroom'] = array(
        'teacher' => clean_str($hr['teacher'] ?? '', 80),
        'room' => clean_str($hr['room'] ?? '', 40),
    );

    $periods = array();
    if (isset($in['periods']) && is_array($in['periods'])) {
        foreach ($in['periods'] as $p) {
            if (!is_array($p)) continue;
            $n = (int)($p['n'] ?? 0);
            $s = valid_time($p['start'] ?? '');
            $e = valid_time($p['end'] ?? '');
            if ($n < 1 || $n > 20 || !$s || !$e || isset($periods[$n])) continue;
            $periods[$n] = array('n' => $n, 'start' => $s, 'end' => $e);
        }
    }
    ksort($periods);
    $d['periods'] = $periods ? array_values($periods) : default_periods();

    $lessons = array();
    $ids = array();
    if (isset($in['lessons']) && is_array($in['lessons'])) {
        foreach ($in['lessons'] as $l) {
            if (!is_array($l) || count($lessons) >= 1500) continue;
            $day = (int)($l['day'] ?? 0);
            $per = (int)($l['period'] ?? 0);
            if ($day < 1 || $day > 7 || $per < 1 || $per > 20) continue;
            $subject = clean_str($l['subject'] ?? '', 80);
            $teacher = clean_str($l['teacher'] ?? '', 80);
            if ($subject === '' && $teacher === '') continue;
            $id = isset($l['id']) && is_string($l['id']) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $l['id']) ? $l['id'] : '';
            if ($id === '' || isset($ids[$id])) $id = 'L' . bin2hex(random_bytes(4));
            $ids[$id] = true;
            $lessons[] = array(
                'id' => $id,
                'day' => $day,
                'period' => $per,
                'subject' => $subject,
                'teacher' => $teacher,
                'group' => clean_str($l['group'] ?? '', 60),
                'room' => clean_str($l['room'] ?? '', 40),
                'note' => clean_str($l['note'] ?? '', 120),
            );
        }
    }
    usort($lessons, function ($a, $b) {
        return array($a['day'], $a['period'], $a['group'], $a['teacher']) <=> array($b['day'], $b['period'], $b['group'], $b['teacher']);
    });
    $d['lessons'] = $lessons;

    $ts = array();
    if (isset($in['teacherSubjects']) && is_array($in['teacherSubjects'])) {
        foreach ($in['teacherSubjects'] as $t => $sub) {
            $t = clean_str((string)$t, 80);
            $sub = clean_str($sub, 80);
            if ($t !== '' && $sub !== '' && count($ts) < 400 && !preg_match('/^Багш #\d+$/u', $t)) $ts[$t] = $sub;
        }
    }
    $d['teacherSubjects'] = $ts;

    if (isset($in['source']) && is_array($in['source'])) {
        $d['source'] = array(
            'file' => clean_str($in['source']['file'] ?? '', 160),
            'importedAt' => clean_str($in['source']['importedAt'] ?? '', 40),
        );
    }
    $d['updatedAt'] = clean_str($in['updatedAt'] ?? '', 40) ?: null;
    return $d;
}

function load_schedule()
{
    return normalize_schedule(read_json(SCHEDULE_FILE, default_schedule()));
}

/** Багш бүрийн хамгийн их заадаг хичээлийг өмнөх жагсаалт дээр нэмж шинэчилнэ. */
function derive_teacher_subjects($lessons, $prev)
{
    $cnt = array();
    foreach ($lessons as $l) {
        if ($l['teacher'] === '' || $l['subject'] === '' || preg_match('/сонгон/iu', $l['subject']) || preg_match('/^Багш #\d+$/u', $l['teacher'])) continue;
        if (!isset($cnt[$l['teacher']][$l['subject']])) $cnt[$l['teacher']][$l['subject']] = 0;
        $cnt[$l['teacher']][$l['subject']]++;
    }
    $out = is_array($prev) ? $prev : array();
    foreach ($cnt as $t => $m) {
        arsort($m);
        $out[$t] = (string)key($m);
    }
    return array_slice($out, 0, 400, true);
}

function save_schedule($data)
{
    $data = normalize_schedule($data);
    $data['teacherSubjects'] = derive_teacher_subjects($data['lessons'], $data['teacherSubjects']);
    $data['updatedAt'] = date('c');
    ensure_dirs();
    backup_schedule();
    if (!write_json(SCHEDULE_FILE, $data)) return false;
    return $data;
}

function backup_schedule()
{
    if (!is_file(SCHEDULE_FILE)) return;
    ensure_dirs();
    $name = 'datas-' . date('Ymd-His') . '-' . bin2hex(random_bytes(2)) . '.json';
    @copy(SCHEDULE_FILE, BACKUP_DIR . '/' . $name);
    $all = list_backups();
    foreach (array_slice($all, 40) as $old) @unlink(BACKUP_DIR . '/' . $old['name']);
}

function list_backups()
{
    $out = array();
    foreach ((array)@scandir(BACKUP_DIR) as $f) {
        if (!preg_match('/^datas-(\d{8})-(\d{6})-[0-9a-f]{4}\.json$/', (string)$f, $m)) continue;
        $d = read_json(BACKUP_DIR . '/' . $f, array());
        $ts = DateTime::createFromFormat('Ymd His', $m[1] . ' ' . $m[2]);
        $out[] = array(
            'name' => $f,
            'time' => $ts ? $ts->getTimestamp() : filemtime(BACKUP_DIR . '/' . $f),
            'lessons' => isset($d['lessons']) && is_array($d['lessons']) ? count($d['lessons']) : 0,
            'className' => isset($d['className']) ? clean_str($d['className'], 20) : '',
        );
    }
    usort($out, function ($a, $b) { return $b['time'] <=> $a['time'] ?: strcmp($b['name'], $a['name']); });
    return $out;
}

function schedule_pdf_info()
{
    if (!is_file(SCHEDULE_PDF)) return null;
    return array('url' => 'database/schedule.pdf?v=' . filemtime(SCHEDULE_PDF), 'size' => filesize(SCHEDULE_PDF), 'time' => filemtime(SCHEDULE_PDF));
}

/* ---------- Зураг, видео ---------- */

function media_types()
{
    return array(
        'jpg' => 'image', 'jpeg' => 'image', 'png' => 'image', 'gif' => 'image', 'webp' => 'image',
        'avif' => 'image', 'heic' => 'image', 'heif' => 'image', 'bmp' => 'image',
        'mp4' => 'video', 'm4v' => 'video', 'mov' => 'video', 'webm' => 'video', 'mkv' => 'video',
        'avi' => 'video', '3gp' => 'video', 'mts' => 'video', 'm2ts' => 'video', 'mpg' => 'video', 'mpeg' => 'video', 'wmv' => 'video',
    );
}

function media_ext($name)
{
    $ext = strtolower(pathinfo((string)$name, PATHINFO_EXTENSION));
    $t = media_types();
    return isset($t[$ext]) ? $ext : '';
}

/** Монгол кирилл үсгийг латин болгож, файлын нэрийг аюулгүй болгоно. */
function translit($s)
{
    static $map = array(
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'ye', 'ё' => 'yo', 'ж' => 'j', 'з' => 'z',
        'и' => 'i', 'й' => 'i', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n', 'о' => 'o', 'ө' => 'u', 'п' => 'p',
        'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u', 'ү' => 'u', 'ф' => 'f', 'х' => 'kh', 'ц' => 'ts', 'ч' => 'ch',
        'ш' => 'sh', 'щ' => 'sh', 'ъ' => '', 'ы' => 'y', 'ь' => '', 'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
    );
    $s = function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
    return strtr($s, $map);
}

function make_media_name($original, $ext)
{
    $base = translit(pathinfo((string)$original, PATHINFO_FILENAME));
    $base = preg_replace('/[^a-z0-9_-]+/', '-', $base);
    $base = trim((string)$base, '-_');
    $base = substr($base, 0, 50);
    if ($base === '') $base = 'file';
    do {
        // 64 бит санамсаргүй хэсэг: цомгийн жагсаалтгүйгээр файлын холбоосыг таах боломжгүй
        $name = date('Ymd-His') . '-' . bin2hex(random_bytes(8)) . '-' . $base . '.' . $ext;
    } while (file_exists(PHOTOS_DIR . '/' . $name));
    return $name;
}

/** Зөвхөн database/photos доторх, зөвшөөрөгдсөн өргөтгөлтэй файлын нэрийг хүлээж авна. */
function valid_media_name($name)
{
    $name = (string)$name;
    if ($name === '' || $name !== basename($name) || $name[0] === '.' || strlen($name) > 200) return '';
    if (!preg_match('/^[A-Za-z0-9._() -]+$/', $name)) {
        // SFTP-ээр оруулсан юникод нэртэй файлыг ч зөвшөөрнө, гэхдээ зам тэмдэгтгүй
        if (preg_match('#[/\\\\\x00]#', $name)) return '';
    }
    if (media_ext($name) === '') return '';
    return is_file(PHOTOS_DIR . '/' . $name) ? $name : '';
}

function thumb_file($name)
{
    foreach (array('webp', 'jpg', 'png') as $e) {
        $p = THUMBS_DIR . '/' . $name . '.' . $e;
        if (is_file($p)) return $p;
    }
    return '';
}

/** Жижиг зураг тавих түлхүүр: зөвхөн тухайн файлыг байршуулсан хүнд өгнө. */
function thumb_key($name)
{
    return b64u_enc(hash_hmac('sha256', 'thumb|' . $name, site_secret(), true));
}

/** Байршуулалтын хариу: жижиг зураггүй бол байршуулагчид түлхүүр өгнө. */
function upload_item($name)
{
    $it = media_item($name);
    if (!$it['thumb']) $it['thumbKey'] = thumb_key($name);
    return $it;
}

/* ---------- Сервер дээр жижиг зураг үүсгэх (хуучин зургуудад) ---------- */

function gd_ok()
{
    return function_exists('imagecreatetruecolor') && function_exists('imagecopyresampled');
}

/** JPEG-ийн EXIF чиглэл (1–8). exif өргөтгөл шаардлагагүй, өөрөө уншина. */
function jpeg_orientation($path)
{
    $f = @fopen($path, 'rb');
    if (!$f) return 1;
    $data = (string)fread($f, 262144);
    fclose($f);
    $n = strlen($data);
    if ($n < 4 || substr($data, 0, 2) !== "\xFF\xD8") return 1;
    $p = 2;
    while ($p + 4 <= $n) {
        if (ord($data[$p]) !== 0xFF) return 1;
        $m = ord($data[$p + 1]);
        if ($m === 0xFF) { $p++; continue; }
        if ($m === 0xD8 || ($m >= 0xD0 && $m <= 0xD7)) { $p += 2; continue; }
        if ($m === 0xDA || $m === 0xD9) return 1;
        $len = unpack('n', substr($data, $p + 2, 2))[1];
        if ($m === 0xE1 && substr($data, $p + 4, 6) === "Exif\0\0") {
            $t = $p + 10;
            if ($t + 8 > $n) return 1;
            $le = substr($data, $t, 2) === 'II';
            $u16 = function ($o) use ($data, $le) { return unpack($le ? 'v' : 'n', substr($data, $o, 2))[1]; };
            $u32 = function ($o) use ($data, $le) { return unpack($le ? 'V' : 'N', substr($data, $o, 4))[1]; };
            $ifd = $t + $u32($t + 4);
            if ($ifd + 2 > $n) return 1;
            $cnt = $u16($ifd);
            for ($i = 0; $i < $cnt; $i++) {
                $e = $ifd + 2 + $i * 12;
                if ($e + 12 > $n) break;
                if ($u16($e) === 0x0112) {
                    $v = $u16($e + 8);
                    return ($v >= 1 && $v <= 8) ? $v : 1;
                }
            }
            return 1;
        }
        $p += 2 + $len;
    }
    return 1;
}

/**
 * Хуучин (жижиг зураггүй) зургийн жижиг хувилбарыг серверт үүсгэнэ. GD байхгүй, эсвэл
 * HEIC зэрэг унших боломжгүй формат бол false. Амжилттай бол media_item буцаана.
 */
function server_thumb($name)
{
    $src = PHOTOS_DIR . '/' . $name;
    $ext = media_ext($name);
    $loaders = array('jpg' => 'imagecreatefromjpeg', 'jpeg' => 'imagecreatefromjpeg', 'png' => 'imagecreatefrompng',
        'gif' => 'imagecreatefromgif', 'webp' => 'imagecreatefromwebp', 'bmp' => 'imagecreatefrombmp');
    if (!gd_ok() || !isset($loaders[$ext]) || !function_exists($loaders[$ext]) || !is_file($src)) return false;
    $info = @getimagesize($src);
    if (!$info || $info[0] < 1 || $info[1] < 1) return false;
    list($w, $h) = $info;
    if ($w * $h > 120000000) return false;   // 120 МП-ээс том бол алгасна
    // GD зургийг бүтнээр нь санах ойд задалдаг (пиксел бүрт ~5 байт)
    $need = (int)($w * $h * 5.5) + 48 * 1024 * 1024 + memory_get_usage();
    $limit = ini_bytes(ini_get('memory_limit'));
    if ($limit > 0 && $limit < $need) {
        @ini_set('memory_limit', (string)min(1536 * 1024 * 1024, $need + 64 * 1024 * 1024));
        $limit = ini_bytes(ini_get('memory_limit'));
        if ($limit > 0 && $limit < $need) return false;
    }
    @set_time_limit(120);
    $img = @call_user_func($loaders[$ext], $src);
    if (!$img) return false;
    $s = min(1, 720 / max($w, $h));
    $tw = max(1, (int)round($w * $s));
    $th = max(1, (int)round($h * $s));
    $dst = imagecreatetruecolor($tw, $th);
    if ($ext === 'png' || $ext === 'gif' || $ext === 'webp') {   // ил тод хэсгийг цагаан болгоно
        imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
    }
    imagecopyresampled($dst, $img, 0, 0, 0, 0, $tw, $th, $w, $h);
    imagedestroy($img);
    // Утасны зургийн эргэлтийг (EXIF) засна
    $o = ($ext === 'jpg' || $ext === 'jpeg') ? jpeg_orientation($src) : 1;
    if ($o > 1 && function_exists('imagerotate')) {
        $flip = function_exists('imageflip');
        if ($o === 2 && $flip) imageflip($dst, IMG_FLIP_HORIZONTAL);
        elseif ($o === 3) $dst = imagerotate($dst, 180, 0);
        elseif ($o === 4 && $flip) imageflip($dst, IMG_FLIP_VERTICAL);
        elseif ($o === 5) { $dst = imagerotate($dst, -90, 0); if ($flip) imageflip($dst, IMG_FLIP_HORIZONTAL); }
        elseif ($o === 6) $dst = imagerotate($dst, -90, 0);
        elseif ($o === 7) { $dst = imagerotate($dst, 90, 0); if ($flip) imageflip($dst, IMG_FLIP_HORIZONTAL); }
        elseif ($o === 8) $dst = imagerotate($dst, 90, 0);
        if ($o >= 5) { $tmpw = $w; $w = $h; $h = $tmpw; }
    }
    $useWebp = function_exists('imagewebp');
    $out = THUMBS_DIR . '/' . $name . ($useWebp ? '.webp' : '.jpg');
    $tmp = $out . '.' . bin2hex(random_bytes(3)) . '.tmp';
    $ok = $useWebp ? @imagewebp($dst, $tmp, 80) : @imagejpeg($dst, $tmp, 82);
    imagedestroy($dst);
    if (!$ok || !@rename($tmp, $out)) { @unlink($tmp); return false; }
    @chmod($out, 0644);
    foreach (array('webp', 'jpg', 'png') as $e) {
        if (THUMBS_DIR . '/' . $name . '.' . $e !== $out) @unlink(THUMBS_DIR . '/' . $name . '.' . $e);
    }
    $side = media_sidecar($name);
    $side['w'] = $w;
    $side['h'] = $h;
    if (!isset($side['uploaded'])) $side['uploaded'] = (int)@filemtime($src);
    write_json(THUMBS_DIR . '/' . $name . '.json', $side);
    media_index_put($name);
    return media_item($name);
}

/** Нэг файлд зэрэг хоёр удаа үүсгэхгүйн тулд түгжээ дор ажиллуулна. */
function server_thumb_locked($name)
{
    $lk = @fopen(TMP_DIR . '/thumb-' . md5($name) . '.lock', 'c');
    if ($lk) flock($lk, LOCK_EX);
    $res = thumb_file($name) !== '' ? media_item($name) : server_thumb($name);
    if ($lk) { flock($lk, LOCK_UN); fclose($lk); @unlink(TMP_DIR . '/thumb-' . md5($name) . '.lock'); }
    return $res;
}

function media_sidecar($name)
{
    return read_json(THUMBS_DIR . '/' . $name . '.json', array());
}

function media_item($name)
{
    $p = PHOTOS_DIR . '/' . $name;
    $types = media_types();
    $ext = media_ext($name);
    $meta = media_sidecar($name);
    $thumb = thumb_file($name);
    $time = isset($meta['uploaded']) ? (int)$meta['uploaded'] : (int)@filemtime($p);
    return array(
        'name' => $name,
        'url' => PHOTOS_URL . rawurlencode($name),
        'thumb' => $thumb ? THUMBS_URL . rawurlencode(basename($thumb)) . '?v=' . filemtime($thumb) : null,
        'type' => $types[$ext],
        'ext' => $ext,
        'size' => (int)@filesize($p),
        'time' => $time,
        'original' => isset($meta['original']) ? clean_str($meta['original'], 200) : $name,
        'w' => isset($meta['w']) ? (int)$meta['w'] : 0,
        'h' => isset($meta['h']) ? (int)$meta['h'] : 0,
        'duration' => isset($meta['duration']) ? (float)$meta['duration'] : 0,
    );
}

/*
 * Зургийн индекс: database/media-index.php (PHP хамгаалалттай JSON).
 * Мянга мянган файлтай үед хүсэлт бүрт хавтас уншиж, файл бүрийн .json-г нээхгүйн тулд.
 * Хавтас гаднаас өөрчлөгдвөл (SFTP г.м) photos/ хавтасны mtime өөрчлөгдөх тул дахин бүтээнэ.
 */
define('MEDIA_INDEX', DB_DIR . '/media-index.php');      // бүтэн хуулбар
define('MEDIA_JOURNAL', DB_DIR . '/media-journal.php');  // түүнээс хойшхи өөрчлөлтүүд (мөр бүр JSON)

function media_scan()
{
    $out = array();
    $dh = @opendir(PHOTOS_DIR);
    if (!$dh) return $out;
    while (($f = readdir($dh)) !== false) {
        if ($f === '.' || $f === '..' || $f[0] === '.') continue;
        if (media_ext($f) === '' || !is_file(PHOTOS_DIR . '/' . $f)) continue;
        $out[$f] = media_item($f);
    }
    closedir($dh);
    return $out;
}

function media_lock($mode)
{
    $fp = @fopen(DB_DIR . '/.media.lock', 'c');
    if ($fp) flock($fp, $mode);
    return $fp;
}

function media_unlock($fp)
{
    if ($fp) {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

function photos_mtime()
{
    clearstatcache(true, PHOTOS_DIR);
    return (int)@filemtime(PHOTOS_DIR);
}

/** Хуулбар + журналаас одоогийн төлөвийг гаргана. null = эвдэрсэн эсвэл хуучирсан. */
function media_state_read()
{
    $snap = read_guarded(MEDIA_INDEX);
    if (!is_array($snap) || !isset($snap['items']) || !is_array($snap['items'])) return null;
    $items = $snap['items'];
    $pm = (int)($snap['photosMtime'] ?? -1);
    $lines = 0;
    $raw = is_file(MEDIA_JOURNAL) ? (string)@file_get_contents(MEDIA_JOURNAL) : '';
    foreach (explode("\n", $raw) as $ln) {
        if ($ln === '' || $ln[0] !== '{') continue;
        $e = json_decode($ln, true);
        if (!is_array($e) || empty($e['name'])) continue;
        $lines++;
        if (($e['op'] ?? '') === 'put' && isset($e['item'])) $items[$e['name']] = $e['item'];
        elseif (($e['op'] ?? '') === 'del') unset($items[$e['name']]);
        if (isset($e['pm'])) $pm = (int)$e['pm'];
    }
    if ($pm !== photos_mtime() || (int)($snap['built'] ?? 0) < time() - 900) return null;
    return array('items' => $items, 'lines' => $lines);
}

/**
 * Цоожтой болохоос өмнөх (24 бит санамсаргүй) эсвэл SFTP-ээр нэмсэн (IMG_0001.jpg г.м) файлын
 * нэрийг таах боломжгүй шинэ нэрээр солино. Жижиг зураг, мэдээллийг нь хамт зөөнө.
 */
function media_migrate_names()
{
    $dh = @opendir(PHOTOS_DIR);
    if (!$dh) return;
    $old = array();
    while (($f = readdir($dh)) !== false) {
        if ($f === '.' || $f === '..' || $f[0] === '.' || media_ext($f) === '') continue;
        if (!preg_match('/^\d{8}-\d{6}-[0-9a-f]{16}-/', $f) && is_file(PHOTOS_DIR . '/' . $f)) $old[] = $f;
    }
    closedir($dh);
    @set_time_limit(300);
    // Нэг удаад 3000 хүртэл (үлдсэнийг дараагийн хүсэлтээр — хавтасны mtime өөрчлөгдсөн тул дахин бүтээгдэнэ)
    foreach (array_slice($old, 0, 3000) as $f) {
        $side = media_sidecar($f);
        $orig = isset($side['original']) ? (string)$side['original'] : $f;
        $mtime = (int)@filemtime(PHOTOS_DIR . '/' . $f);
        $new = make_media_name($orig, media_ext($f));
        if (!@rename(PHOTOS_DIR . '/' . $f, PHOTOS_DIR . '/' . $new)) continue;
        foreach (array('webp', 'jpg', 'png', 'json') as $e) {
            if (is_file(THUMBS_DIR . '/' . $f . '.' . $e)) @rename(THUMBS_DIR . '/' . $f . '.' . $e, THUMBS_DIR . '/' . $new . '.' . $e);
        }
        if (!isset($side['uploaded']) && $mtime) {   // огноог хадгална
            $side['uploaded'] = $mtime;
            if (!isset($side['original'])) $side['original'] = $f;
            write_json(THUMBS_DIR . '/' . $new . '.json', $side);
        }
    }
}

/** Бүрэн дахин бүтээнэ. Дуудагч LOCK_EX барьсан байх ёстой. */
function media_rebuild_locked()
{
    media_migrate_names();
    $items = media_scan();
    write_guarded(MEDIA_INDEX, array('items' => $items, 'photosMtime' => photos_mtime(), 'built' => time()));
    @file_put_contents(MEDIA_JOURNAL, GUARD_LINE . "\n");
    return array('items' => $items, 'lines' => 0);
}

/** Бүх файлын жагсаалт (шинээс хуучин руу). */
function media_list()
{
    static $cache = null;
    if ($cache !== null) return $cache;
    $lk = media_lock(LOCK_SH);
    $st = media_state_read();
    media_unlock($lk);
    if ($st === null) {
        $lk = media_lock(LOCK_EX);
        $st = media_state_read();
        if ($st === null) $st = media_rebuild_locked();
        media_unlock($lk);
    }
    $out = array_values($st['items']);
    usort($out, function ($a, $b) { return $b['time'] <=> $a['time'] ?: strcmp($b['name'], $a['name']); });
    return $cache = $out;
}

/**
 * Журналд мөр нэмнэ (байршуулалт бүрт хэдхэн зуун байт). Журнал 256 КБ хүрвэл хуулбар болгон шахна.
 * Хуулбар хуучирсан бол уншихад дахин бүтээгддэг тул энд шалгахгүй.
 */
function media_journal_append($entries)
{
    $lk = media_lock(LOCK_EX);
    $buf = is_file(MEDIA_JOURNAL) ? '' : GUARD_LINE . "\n";
    $pm = photos_mtime();
    foreach ($entries as $e) {
        $e['pm'] = $pm;
        $buf .= json_encode($e, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE) . "\n";
    }
    @file_put_contents(MEDIA_JOURNAL, $buf, FILE_APPEND);
    clearstatcache(true, MEDIA_JOURNAL);
    if ((int)@filesize(MEDIA_JOURNAL) > 256 * 1024) {
        $st = media_state_read();
        if ($st === null) media_rebuild_locked();
        else {
            write_guarded(MEDIA_INDEX, array('items' => $st['items'], 'photosMtime' => $pm, 'built' => time()));
            @file_put_contents(MEDIA_JOURNAL, GUARD_LINE . "\n");
        }
    }
    media_unlock($lk);
}

/** Нэг файлын мэдээллийг индекст нэмэх/шинэчлэх. */
function media_index_put($name)
{
    if (!is_file(PHOTOS_DIR . '/' . $name)) return;
    media_journal_append(array(array('op' => 'put', 'name' => $name, 'item' => media_item($name))));
}

function media_index_remove($names)
{
    $e = array();
    foreach ($names as $n) $e[] = array('op' => 'del', 'name' => $n);
    if ($e) media_journal_append($e);
}

function media_used_bytes()
{
    $sum = 0;
    foreach (media_list() as $it) $sum += (int)$it['size'];
    if (function_exists('music_used_bytes')) $sum += music_used_bytes();
    if (function_exists('ai_chat_used_bytes')) $sum += ai_chat_used_bytes();
    if (function_exists('board_used_bytes')) $sum += board_used_bytes();
    return $sum;
}

/* ---------- Хэсэгчилсэн байршуулалт ---------- */

function chunk_max()
{
    $post = ini_bytes(ini_get('post_max_size'));
    $max = CHUNK_CAP;
    if ($post > 0) $max = min($max, $post - 256 * 1024);
    return max(CHUNK_FLOOR, $max);
}

function upload_meta_file($id)
{
    return TMP_DIR . '/' . $id . '.meta.php';
}

function upload_part_file($id)
{
    return TMP_DIR . '/' . $id . '.part';
}

function upload_lock_file($id)
{
    return TMP_DIR . '/' . $id . '.lock';
}

/** Дууссан байршуулалтын тэмдэг: хариу алдагдаж давтан илгээвэл ижил файлыг буцаана. */
function upload_done_file($id)
{
    return TMP_DIR . '/' . $id . '.done.php';
}

function valid_upload_id($id)
{
    return is_string($id) && preg_match('/^[a-f0-9]{32}$/', $id) ? $id : '';
}

function upload_id_for($name, $size, $lm)
{
    return substr(hash_hmac('sha256', 'upload|' . $name . '|' . $size . '|' . $lm, site_secret()), 0, 32);
}

/** Өмнө нь дууссан бол тухайн файлын нэрийг буцаана. */
function upload_done_name($id)
{
    $d = read_guarded(upload_done_file($id));
    if ($d && !empty($d['final']) && is_file(PHOTOS_DIR . '/' . $d['final'])) return (string)$d['final'];
    $m = read_guarded(upload_meta_file($id));   // өмнөх хувилбарын тэмдэглэгээ
    if ($m && !empty($m['final']) && is_file(PHOTOS_DIR . '/' . $m['final'])) return (string)$m['final'];
    return '';
}

/*
 * Хүлээн авсан байтын мужууд [[эхлэл, төгсгөл), ...] — хэсгүүд зэрэг, дараалалгүй ирж болно.
 */
function ranges_add($ranges, $s, $e)
{
    $ranges[] = array((int)$s, (int)$e);
    usort($ranges, function ($a, $b) { return $a[0] <=> $b[0]; });
    $out = array();
    foreach ($ranges as $r) {
        $n = count($out);
        if ($n && $r[0] <= $out[$n - 1][1]) {
            if ($r[1] > $out[$n - 1][1]) $out[$n - 1][1] = (int)$r[1];
        } else {
            $out[] = array((int)$r[0], (int)$r[1]);
        }
    }
    return $out;
}

function ranges_total($ranges)
{
    $t = 0;
    foreach ($ranges as $r) $t += $r[1] - $r[0];
    return $t;
}

function upload_ranges($meta, $id)
{
    if (isset($meta['ranges']) && is_array($meta['ranges'])) return $meta['ranges'];
    clearstatcache(true, upload_part_file($id));
    $sz = (int)@filesize(upload_part_file($id));   // өмнөх хувилбар: дараалсан бичлэг
    return $sz > 0 ? array(array(0, $sz)) : array();
}

/** Түр файлыг database/photos руу зөөж, мэдээллийг нь бичнэ. */
function finalize_upload($id, $src, $original, $ext, $size)
{
    $final = make_media_name($original, $ext);
    if (!@rename($src, PHOTOS_DIR . '/' . $final)) return '';
    @chmod(PHOTOS_DIR . '/' . $final, 0644);
    write_json(THUMBS_DIR . '/' . $final . '.json', array('original' => $original, 'uploaded' => time(), 'size' => (int)$size));
    write_guarded(upload_done_file($id), array('final' => $final, 'time' => time()));
    media_index_put($final);
    return $final;
}

/**
 * Дуусаагүй байршуулалтын дискэнд бичигдсэн бодит хэмжээ.
 * Зарласан хэмжээг тооцвол хэн нэгэн байт илгээлгүйгээр багтаамжийг «захиалж» бүгдийг хаах боломжтой байсан.
 */
function tmp_reserved_bytes($exceptId = '')
{
    $sum = 0;
    foreach (array_merge((array)@glob(TMP_DIR . '/*.part'), (array)@glob(TMP_DIR . '/*.small')) as $p) {
        if ($exceptId !== '' && strpos(basename($p), $exceptId) === 0) continue;
        $sum += (int)@filesize($p);
    }
    return $sum;
}

/** 7 хоногоос дээш хөндөгдөөгүй тасарсан байршуулалт, хуучин тэмдгүүдийг устгана (цагт нэг удаа). */
function cleanup_stale_uploads()
{
    $mark = TMP_DIR . '/.cleanup';
    if (is_file($mark) && filemtime($mark) > time() - 3600) return;
    @touch($mark);
    $limit = time() - 7 * 86400;
    foreach ((array)@glob(TMP_DIR . '/*.meta.php') as $f) {
        $id = basename($f, '.meta.php');
        $part = upload_part_file($id);
        $t = max((int)@filemtime($f), is_file($part) ? (int)@filemtime($part) : 0);
        if ($t < $limit) {
            @unlink($part);
            @unlink($f);
            @unlink(upload_lock_file($id));
        }
    }
    foreach ((array)@glob(TMP_DIR . '/*.done.php') as $f) {
        if ((int)@filemtime($f) < $limit) @unlink($f);
    }
    foreach ((array)@glob(TMP_DIR . '/*.small') as $f) {
        if ((int)@filemtime($f) < time() - 86400) @unlink($f);
    }
    // Цуцлагдсаны дараа бичигдсэн, мэдээлэлгүй үлдсэн хэсгүүд
    foreach ((array)@glob(TMP_DIR . '/*.part') as $f) {
        $id = basename($f, '.part');
        if (!is_file(upload_meta_file($id)) && (int)@filemtime($f) < time() - 86400) {
            @unlink($f);
            @unlink(upload_lock_file($id));
        }
    }
}

<?php
/*
 * Synced lyrics for the Music player. A small, strict proxy to the free community LRCLIB API (https://lrclib.net):
 * nothing is sent to the browser except the parsed lines, and the browser never talks to the provider itself.
 *
 *   GET lyrics.php?title=&artist=&album=&duration=<seconds>
 *   -> {ok, found, instrumental, synced:[{t:<ms>, text}], plain:string|''}
 *
 * Results live in guarded files under database/lyrics/ (found: 7 days, not found: 6 hours, size-capped and pruned).
 * Only real lookups are rate limited (per IP and for the whole site); a provider outage is remembered for a few seconds
 * so the board never waits on a dead service.
 */
if (!defined('C122')) { http_response_code(404); exit; }

define('LYRICS_DIR', DB_DIR . '/lyrics');
define('LYRICS_LOCK_FILE', LYRICS_DIR . '/lock.php');
define('LYRICS_RATE_FILE', LYRICS_DIR . '/rate.php');
define('LYRICS_DOWN_FILE', LYRICS_DIR . '/down.php');
define('LYRICS_HOST', 'https://lrclib.net');
define('LYRICS_AGENT', 'ClassroomLyrics/1.0 (https://12-2.lol)');
define('LYRICS_TTL', 7 * 86400);            // found
define('LYRICS_NEG_TTL', 6 * 3600);         // not found
define('LYRICS_DOWN_TTL', 20);              // provider unreachable: do not retry for this long
define('LYRICS_MAX_FILES', 400);
define('LYRICS_MAX_BYTES', 12 * 1024 * 1024);
define('LYRICS_MAX_ENTRY', 262144);
define('LYRICS_MAX_BODY', 700000);          // provider response cap (a 20 result search is about 400 KB)
define('LYRICS_DEADLINE', 6.0);             // seconds for everything the request does upstream
define('LYRICS_IP_PER_MIN', 12);            // real lookups per IP and minute
define('LYRICS_ALL_PER_MIN', 60);           // real lookups per minute for the whole site
define('LYRICS_MAX_LINES', 1500);
define('LYRICS_MAX_LINE', 300);
define('LYRICS_MAX_PLAIN', 20000);

/* ---------- who may ask ---------- */

/** Admin or an unlocked album, or the browser that is connected to the music player (the gateway's own session). */
function lyrics_access_ok()
{
    if (is_member()) return true;
    $sid = isset($_COOKIE['c122_spotify']) && is_string($_COOKIE['c122_spotify']) ? $_COOKIE['c122_spotify'] : '';
    if ($sid === '' || !preg_match('/^[A-Za-z0-9,-]{16,128}$/D', $sid) || !function_exists('sp_session')) return false;
    $ok = false;
    try { sp_session(); $ok = sp_signed_in(); } catch (Throwable $e) { $ok = false; }
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    return $ok;
}

/* ---------- input ---------- */

function lyrics_input()
{
    $title = clean_str(isset($_GET['title']) ? $_GET['title'] : '', 200);
    $artist = clean_str(isset($_GET['artist']) ? $_GET['artist'] : '', 200);
    $album = clean_str(isset($_GET['album']) ? $_GET['album'] : '', 200);
    $d = isset($_GET['duration']) && is_string($_GET['duration']) && preg_match('/^\d{1,5}(?:\.\d{1,3})?$/D', $_GET['duration']) ? (float)$_GET['duration'] : 0.0;
    if ($title === '') return null;
    return array('title' => $title, 'artist' => $artist, 'album' => $album, 'duration' => min(7200.0, $d));
}

function lyrics_lower($s) { return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s); }

/** Comparison form: lower case, letters and digits only. */
function lyrics_norm($s)
{
    $s = preg_replace('/[^\p{L}\p{N}]+/u', ' ', lyrics_lower((string)$s));
    return $s === null ? '' : trim($s);
}

/** "Song (feat. X) - Remastered 2011" -> "Song". Falls back to the original when nothing is left. */
function lyrics_clean_title($s)
{
    $c = preg_replace('/\s*[\(\[][^\)\]]*[\)\]]/u', '', (string)$s);
    $c = preg_replace('/\s+-\s+.*$/u', '', (string)$c);
    $c = preg_replace('/\s+(?:feat\.?|ft\.?|featuring)\s+.*$/iu', '', (string)$c);
    $c = clean_str($c, 200);
    return $c === '' ? clean_str($s, 200) : $c;
}

function lyrics_first_artist($s)
{
    $parts = preg_split('/\s*(?:,|;|&|\bfeat\.?|\bft\.?|\bx\b|\bwith\b)\s*/iu', (string)$s, 2);
    $first = clean_str(is_array($parts) && isset($parts[0]) ? $parts[0] : $s, 200);
    return $first === '' ? clean_str($s, 200) : $first;
}

function lyrics_key($in)
{
    return sha1(lyrics_norm($in['title']) . '|' . lyrics_norm($in['artist']) . '|' . lyrics_norm($in['album']) . '|' . (int)round($in['duration']));
}

/* ---------- LRC parsing ---------- */

function lyrics_clean_line($s)
{
    $s = preg_replace('/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/', '', (string)$s);       // enhanced per-word stamps
    $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string)$s);
    $s = preg_replace('/\s+/u', ' ', (string)$s);
    $s = trim((string)$s);
    if ($s !== '' && preg_match('#(?:https?:|ftp:)?//|\bwww\.|[a-z0-9-]{2,}\.(?:com|net|org|ru|cn|info|io)\b#iu', $s)) return '';   // no external links in the output
    return cut($s, LYRICS_MAX_LINE);
}

/**
 * LRC text -> list of array('t' => ms, 'text' => string). Handles several stamps per line ([00:10.00][00:42.50]text),
 * 1 to 3 fraction digits, an [offset:+/-ms] tag, metadata tags and enhanced word stamps. Blank text is kept: it marks a break.
 */
function lyrics_parse_lrc($lrc)
{
    $lrc = str_replace(array("\r\n", "\r"), "\n", (string)$lrc);
    $lrc = str_replace("\xEF\xBB\xBF", '', $lrc);
    $lines = explode("\n", (string)$lrc, 6001);
    $offset = 0;
    $rows = array();
    $n = 0;
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] !== '[') continue;
        if (preg_match('/^\[offset:\s*([+-]?\d{1,7})\s*\]/i', $line, $o)) { $offset = max(-600000, min(600000, (int)$o[1])); continue; }
        if (!preg_match('/^((?:\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]\s*)+)(.*)$/su', $line, $m)) continue;
        if (!preg_match_all('/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/', $m[1], $stamps, PREG_SET_ORDER)) continue;
        $text = lyrics_clean_line($m[2]);
        foreach ($stamps as $s) {
            $frac = isset($s[3]) && $s[3] !== '' ? (int)str_pad(substr($s[3], 0, 3), 3, '0') : 0;
            $ms = ((int)$s[1] * 60 + (int)$s[2]) * 1000 + $frac;
            $rows[] = array('t' => $ms, 'text' => $text, 'n' => $n++);
            if ($n > LYRICS_MAX_LINES * 2) break 2;
        }
    }
    usort($rows, function ($a, $b) { return $a['t'] === $b['t'] ? $a['n'] <=> $b['n'] : $a['t'] <=> $b['t']; });
    $out = array();
    foreach ($rows as $r) {
        $t = max(0, $r['t'] - $offset);          // a positive LRC offset shows the lines earlier
        $prev = count($out) ? $out[count($out) - 1] : null;
        if ($r['text'] === '' && $prev !== null && $prev['text'] === '') continue;
        $out[] = array('t' => $t, 'text' => $r['text']);
        if (count($out) >= LYRICS_MAX_LINES) break;
    }
    $hasText = false;
    foreach ($out as $r) if ($r['text'] !== '') { $hasText = true; break; }
    return $hasText ? $out : array();
}

function lyrics_clean_plain($s)
{
    $s = str_replace(array("\r\n", "\r"), "\n", (string)$s);
    $s = preg_replace('/[\x00-\x09\x0B-\x1F\x7F]+/u', ' ', $s);
    $keep = array();
    foreach (explode("\n", (string)$s, 2001) as $line) {
        $line = rtrim((string)$line);
        $line = lyrics_clean_line($line) === '' && trim($line) !== '' ? '' : cut($line, LYRICS_MAX_LINE);
        $keep[] = $line;
    }
    $s = trim(preg_replace('/\n{3,}/', "\n\n", implode("\n", $keep)));
    return cut((string)$s, LYRICS_MAX_PLAIN);
}

/** One provider record -> a normal result (or null when it has nothing to show). */
function lyrics_from_record($rec)
{
    if (!is_array($rec)) return null;
    if (!empty($rec['instrumental'])) return array('instrumental' => true, 'synced' => array(), 'plain' => '');
    $synced = is_string($rec['syncedLyrics'] ?? null) ? lyrics_parse_lrc($rec['syncedLyrics']) : array();
    $plain = !$synced && is_string($rec['plainLyrics'] ?? null) ? lyrics_clean_plain($rec['plainLyrics']) : '';
    if (!$synced && $plain === '') return null;
    return array('instrumental' => false, 'synced' => $synced, 'plain' => $plain);
}

/* ---------- provider ---------- */

function lyrics_budget($want)
{
    static $start = null;
    if ($start === null) $start = microtime(true);
    $left = $start + LYRICS_DEADLINE - microtime(true);
    return $left < 0.4 ? 0.0 : min($want, $left);
}

/** Fixed host, https only (curl), no redirects, bounded body. Without curl the provider counts as unreachable. Returns array('status' => int, 'data' => mixed). */
function lyrics_http($path, $params, $seconds)
{
    $url = LYRICS_HOST . $path . '?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    $raw = '';
    $status = 0;
    if ($seconds <= 0) return array('status' => 0, 'data' => null);     // 0 would mean "no timeout" to curl
    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        $opts = array(
            CURLOPT_HTTPHEADER => array('Accept: application/json'), CURLOPT_USERAGENT => LYRICS_AGENT, CURLOPT_ENCODING => '',
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_CONNECTTIMEOUT_MS => (int)(min(2.5, $seconds) * 1000), CURLOPT_TIMEOUT_MS => (int)($seconds * 1000),
            CURLOPT_RETURNTRANSFER => false, CURLOPT_NOSIGNAL => true,
            CURLOPT_WRITEFUNCTION => function ($h, $chunk) use (&$raw) { if (strlen($raw) + strlen($chunk) > LYRICS_MAX_BODY) return 0; $raw .= $chunk; return strlen($chunk); },
        );
        if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_HTTPS')) $opts[CURLOPT_PROTOCOLS] = CURLPROTO_HTTPS;
        curl_setopt_array($curl, $opts);
        $done = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if (PHP_VERSION_ID < 80000) curl_close($curl);     // a no-op (and deprecated) from PHP 8
        if ($done === false) $status = 0;
    }
    return array('status' => $status, 'data' => $raw === '' ? null : json_decode($raw, true));
}

/** One provider call inside the shared deadline; a "server busy" 503 is retried once right away. */
function lyrics_call($path, $params, $want)
{
    $r = lyrics_http($path, $params, lyrics_budget($want));
    if ($r['status'] === 503 && lyrics_budget(1.0) >= 1.0) {
        usleep(250000);
        $r = lyrics_http($path, $params, lyrics_budget($want));
    }
    return $r;
}

/** Best search hit: same song (title and artist agree), duration within 3 s, synced preferred. */
function lyrics_pick($list, $in)
{
    if (!is_array($list)) return null;
    $title = lyrics_norm(lyrics_clean_title($in['title']));
    if ($title === '') $title = lyrics_lower(clean_str($in['title'], 200));
    $artist = lyrics_norm(lyrics_first_artist($in['artist']));
    $album = lyrics_norm($in['album']);
    $best = null;
    $bestScore = -100000;
    foreach ($list as $rec) {
        if (!is_array($rec) || lyrics_from_record($rec) === null) continue;
        $d = isset($rec['duration']) && is_numeric($rec['duration']) ? (float)$rec['duration'] : 0.0;
        if ($in['duration'] > 0 && $d > 0 && abs($d - $in['duration']) > 3.0) continue;
        $t = lyrics_norm(lyrics_clean_title(is_string($rec['trackName'] ?? null) ? $rec['trackName'] : ''));
        $a = lyrics_norm(is_string($rec['artistName'] ?? null) ? $rec['artistName'] : '');
        $b = lyrics_norm(is_string($rec['albumName'] ?? null) ? $rec['albumName'] : '');
        if ($t === '' || ($t !== $title && strpos($t, $title) === false && strpos($title, $t) === false)) continue;
        if ($artist !== '' && $a !== '' && strpos($a, $artist) === false && strpos($artist, $a) === false) continue;
        $score = (!empty($rec['syncedLyrics']) ? 100 : 0) + ($t === $title ? 30 : 0) + ($a === $artist ? 20 : 0) + ($album !== '' && $b === $album ? 10 : 0)
            - ($in['duration'] > 0 && $d > 0 ? abs($d - $in['duration']) * 3 : 0);
        if ($score > $bestScore) { $bestScore = $score; $best = $rec; }
    }
    return $best;
}

/**
 * -> array('state' => 'found'|'none'|'down', 'result' => array|null).
 * Exact lookup first, then a search for the closest duration. Never throws.
 */
function lyrics_lookup($in)
{
    $result = null;        // a record that only has plain text, kept while we look for a synced one
    if ($in['artist'] !== '' && $in['album'] !== '' && $in['duration'] > 0) {
        $r = lyrics_call('/api/get', array('artist_name' => $in['artist'], 'track_name' => $in['title'], 'album_name' => $in['album'], 'duration' => (int)round($in['duration'])), 3.2);
        if ($r['status'] === 200 && is_array($r['data'])) {
            $result = lyrics_from_record($r['data']);
            if ($result !== null && ($result['instrumental'] || $result['synced'])) return array('state' => 'found', 'result' => $result);
        }
        // a busy provider (timeout, 429, 5xx) still gets the search below as a second chance
    }
    $title = lyrics_clean_title($in['title']);
    $artist = lyrics_first_artist($in['artist']);
    $searches = $artist === '' ? array(array('track_name' => $title), array('q' => $title)) : array(array('track_name' => $title, 'artist_name' => $artist), array('q' => trim($title . ' ' . $artist)));
    $searched = false;
    foreach ($searches as $params) {
        $r = lyrics_call('/api/search', $params, 3.5);
        if ($r['status'] !== 200 || !is_array($r['data'])) {
            if ($r['status'] >= 400 && $r['status'] < 500 && $r['status'] !== 429) { $searched = true; continue; }   // refused for this input: nothing to find
            if ($result !== null) return array('state' => 'found', 'result' => $result);
            return array('state' => $searched ? 'none' : 'down', 'result' => null);
        }
        $searched = true;
        $hit = lyrics_pick($r['data'], $in);
        if ($hit === null) continue;
        $found = lyrics_from_record($hit);
        if ($found === null) continue;
        if ($found['instrumental'] || $found['synced']) return array('state' => 'found', 'result' => $found);
        if ($result === null) $result = $found;
    }
    return $result !== null ? array('state' => 'found', 'result' => $result) : array('state' => 'none', 'result' => null);
}

/* ---------- cache, outage marker, rate limit ---------- */

function lyrics_prepare_dir()
{
    if (!is_dir(LYRICS_DIR)) {
        if (!is_dir(DB_DIR)) ensure_dirs();
        @mkdir(LYRICS_DIR, 0775, true);
    }
    return is_dir(LYRICS_DIR) && is_writable(LYRICS_DIR);
}

function lyrics_cache_file($key) { return LYRICS_DIR . '/c-' . $key . '.php'; }

/** -> null (miss), or the stored entry array('neg' => bool, 'instrumental', 'synced', 'plain'). */
function lyrics_cache_get($key)
{
    $e = read_guarded(lyrics_cache_file($key));
    if (!is_array($e) || !isset($e['at'])) return null;
    $age = time() - (int)$e['at'];
    if ($age < 0 || $age > (empty($e['neg']) ? LYRICS_TTL : LYRICS_NEG_TTL)) return null;
    return $e;
}

function lyrics_cache_put($key, $entry)
{
    if (!lyrics_prepare_dir()) return;
    $entry['at'] = time();
    $json = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false || strlen($json) > LYRICS_MAX_ENTRY) return;
    if (!write_guarded(lyrics_cache_file($key), $entry)) return;
    $fp = @fopen(LYRICS_LOCK_FILE, 'c');
    if ($fp && flock($fp, LOCK_EX | LOCK_NB)) { lyrics_prune(); flock($fp, LOCK_UN); }
    if ($fp) fclose($fp);
}

/** Drop expired entries, then the oldest ones until the folder is back under its caps. */
function lyrics_prune()
{
    $files = glob(LYRICS_DIR . '/c-*.php');
    if (!$files) return;
    $now = time();
    $list = array();
    $total = 0;
    foreach ($files as $f) {
        $mt = @filemtime($f);
        if ($mt === false) continue;
        if ($now - $mt > LYRICS_TTL) { @unlink($f); continue; }
        $sz = (int)@filesize($f);
        $list[] = array($f, $mt, $sz);
        $total += $sz;
    }
    if (count($list) <= LYRICS_MAX_FILES && $total <= LYRICS_MAX_BYTES) return;
    usort($list, function ($a, $b) { return $a[1] <=> $b[1]; });
    foreach ($list as $item) {
        if (count($list) <= LYRICS_MAX_FILES && $total <= LYRICS_MAX_BYTES) break;
        @unlink($item[0]);
        $total -= $item[2];
        array_shift($list);
    }
}

function lyrics_down_now()
{
    $d = read_guarded(LYRICS_DOWN_FILE);
    return is_array($d) && (int)($d['until'] ?? 0) > time();
}

function lyrics_mark_down()
{
    if (lyrics_prepare_dir()) write_guarded(LYRICS_DOWN_FILE, array('until' => time() + LYRICS_DOWN_TTL));
}

/** Count one real lookup. Returns 0 when allowed, otherwise the seconds to wait. */
function lyrics_rate_take()
{
    if (!lyrics_prepare_dir()) return 0;
    $fp = @fopen(LYRICS_LOCK_FILE, 'c');
    if ($fp) flock($fp, LOCK_EX);
    $now = time();
    $minute = (int)floor($now / 60);
    $s = read_guarded(LYRICS_RATE_FILE);
    if (!is_array($s) || (int)($s['m'] ?? 0) !== $minute || !is_array($s['ip'] ?? null)) $s = array('m' => $minute, 'all' => 0, 'ip' => array());
    $key = substr(sha1(throttle_key('lyrics')), 0, 16);
    $mine = (int)($s['ip'][$key] ?? 0);
    $ok = $mine < LYRICS_IP_PER_MIN && (int)$s['all'] < LYRICS_ALL_PER_MIN;
    if ($ok) {
        $s['ip'][$key] = $mine + 1;
        $s['all'] = (int)$s['all'] + 1;
        write_guarded(LYRICS_RATE_FILE, $s);
    }
    if ($fp) { flock($fp, LOCK_UN); fclose($fp); }
    return $ok ? 0 : max(1, 60 - ($now % 60));
}

/* ---------- request ---------- */

function lyrics_payload($found, $instrumental, $synced, $plain)
{
    return array('ok' => true, 'found' => (bool)$found, 'instrumental' => (bool)$instrumental, 'synced' => array_values($synced), 'plain' => (string)$plain);
}

/** -> array($httpStatus, $body, $extraHeaders) */
function lyrics_handle()
{
    $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
    if ($method !== 'GET' && $method !== 'HEAD') return array(405, array('ok' => false, 'error' => 'GET хүсэлт шаардлагатай.'), array());
    if (!lyrics_access_ok()) return array(401, array('ok' => false, 'error' => 'Цомгийн кодоо оруулна уу.', 'locked' => true), array());
    $in = lyrics_input();
    if ($in === null) return array(400, array('ok' => false, 'error' => 'Дууны нэр шаардлагатай.'), array());

    $key = lyrics_key($in);
    $hit = lyrics_cache_get($key);
    if ($hit !== null) {
        if (!empty($hit['neg'])) return array(200, lyrics_payload(false, false, array(), ''), array());
        $syn = is_array($hit['synced'] ?? null) ? $hit['synced'] : array();
        $plain = is_string($hit['plain'] ?? null) ? $hit['plain'] : '';
        $ins = !empty($hit['instrumental']);
        return array(200, lyrics_payload($ins || $syn || $plain !== '', $ins, $syn, $plain), array());
    }
    $unavailable = array(200, array('ok' => true, 'found' => false, 'instrumental' => false, 'synced' => array(), 'plain' => '', 'error' => 'unavailable'), array());
    if (lyrics_down_now()) return $unavailable;
    $wait = lyrics_rate_take();
    if ($wait > 0) return array(429, array('ok' => false, 'error' => 'Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоорой.', 'retryAfter' => $wait), array('Retry-After: ' . $wait));

    $r = lyrics_lookup($in);
    if ($r['state'] === 'down') { lyrics_mark_down(); return $unavailable; }
    if ($r['state'] === 'none') {
        lyrics_cache_put($key, array('neg' => true));
        return array(200, lyrics_payload(false, false, array(), ''), array());
    }
    $res = $r['result'];
    lyrics_cache_put($key, array('neg' => false, 'instrumental' => $res['instrumental'], 'synced' => $res['synced'], 'plain' => $res['plain']));
    return array(200, lyrics_payload(true, $res['instrumental'], $res['synced'], $res['plain']), array());
}

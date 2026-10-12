<?php
/* Shared playlists keep catalog references and explicitly published local audio. */
if (!defined('C122')) { http_response_code(404); exit; }

define('MUSIC_DIR', DB_DIR . '/music');
define('MUSIC_STATE', MUSIC_DIR . '/index.php');
define('MUSIC_CACHE', MUSIC_DIR . '/cache.php');
define('MUSIC_CONFIG', DB_DIR . '/music-settings.php');
define('MUSIC_MAX_PLAYLISTS', 30);
define('MUSIC_MAX_TRACKS', 250);
define('MUSIC_METADATA_TTL', 30 * 86400);
define('MUSIC_MAX_INDEX', 16 * 1024 * 1024);
require_once __DIR__ . '/music-audio.php';

function music_limits()
{
    return array('maxPlaylists' => MUSIC_MAX_PLAYLISTS, 'maxTracks' => MUSIC_MAX_TRACKS, 'audioEnabled' => true, 'maxAudioBytes' => MUSIC_AUDIO_MAX_FILE, 'audioOwnerQuotaBytes' => MUSIC_AUDIO_OWNER_QUOTA, 'maxName' => 80, 'maxDescription' => 500);
}

function music_state()
{
    if (!is_file(MUSIC_STATE) || @filesize(MUSIC_STATE) > MUSIC_MAX_INDEX + 4096) throw new RuntimeException('Invalid music index length');
    $state = read_guarded(MUSIC_STATE);
    if (!is_array($state) || !isset($state['playlists'], $state['audios']) || !is_array($state['playlists']) || !is_array($state['audios'])) throw new RuntimeException('Invalid music index');
    return $state;
}

function music_save($state)
{
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false || strlen($json) > MUSIC_MAX_INDEX) throw new RuntimeException('Music мэдээллийн хадгалах хэмжээ хүрэлцэхгүй байна.', 507);
    if (!folder_write_private(MUSIC_STATE, $state)) throw new RuntimeException('Cannot save music index');
}

function music_cache_state()
{
    $cache = read_guarded(MUSIC_CACHE);
    if (!is_array($cache) || !is_array($cache['entries'] ?? null) || !is_array($cache['rates'] ?? null)) return array('entries' => array(), 'rates' => array());
    return $cache;
}

function music_cache_save($cache)
{
    $now = time();
    foreach ($cache['entries'] as $key => $entry) if ((int)($entry['expires'] ?? 0) <= $now) unset($cache['entries'][$key]);
    foreach ($cache['rates'] as $key => $rate) if ((int)($rate['expires'] ?? 0) <= $now) unset($cache['rates'][$key]);
    uasort($cache['entries'], function ($a, $b) { return (int)($a['time'] ?? 0) <=> (int)($b['time'] ?? 0); });
    while (count($cache['entries']) > 600) array_shift($cache['entries']);
    while (count($cache['rates']) > 1000) array_shift($cache['rates']);
    while (strlen((string)json_encode($cache)) > 5 * 1024 * 1024 && $cache['entries']) array_shift($cache['entries']);
    if (!folder_write_private(MUSIC_CACHE, $cache)) throw new RuntimeException('Cannot save music provider cache');
}

function music_prepare()
{
    static $ready = false;
    if ($ready) return;
    folder_prepare();
    $lock = folder_storage_lock();
    try {
        foreach (array(MUSIC_DIR, MUSIC_DIR . '/audio') as $dir) {
            if (is_link($dir)) throw new RuntimeException('Invalid music storage directory');
            if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException('Cannot create music storage');
            if (!is_file($dir . '/.htaccess') && @file_put_contents($dir . '/.htaccess', "Options -Indexes\nRequire all denied\nDeny from all\n") === false) throw new RuntimeException('Cannot protect music storage');
        }
        if (!is_file(MUSIC_STATE) && !folder_write_private(MUSIC_STATE, array('format' => 'c122-music-v1', 'playlists' => array(), 'audios' => array()))) throw new RuntimeException('Cannot initialize music index');
        if (!is_file(MUSIC_CACHE) && !folder_write_private(MUSIC_CACHE, array('entries' => array(), 'rates' => array()))) throw new RuntimeException('Cannot initialize music cache');
        // API-derived metadata is refreshed or discarded within YouTube's 30-day window.
        $state = music_state(); $changed = false;
        foreach ($state['playlists'] as &$playlist) foreach ($playlist['tracks'] as &$track) {
            if (($track['kind'] ?? '') === 'youtube' && isset($track['providerExpires']) && (int)$track['providerExpires'] <= time()) {
                if (empty($track['customLabel'])) unset($track['title'], $track['artist']);
                unset($track['thumbnail'], $track['providerExpires']); $changed = true;
            }
        }
        unset($playlist, $track);
        if ($changed) music_save($state);
        music_cache_save(music_cache_state());
        $ready = true;
    } finally { folder_storage_unlock($lock); }
}

/** Count native Music storage without initializing directories, for every global quota path. */
function music_used_bytes()
{
    if (!is_dir(MUSIC_DIR)) return 0;
    $sum = 0;
    foreach (array(MUSIC_STATE, MUSIC_CACHE, MUSIC_CONFIG) as $file) if (is_file($file)) $sum += max(0, (int)@filesize($file));
    if (is_dir(MUSIC_DIR . '/audio')) foreach (new DirectoryIterator(MUSIC_DIR . '/audio') as $entry) {
        if (!$entry->isDot() && $entry->isFile() && !$entry->isLink() && preg_match('/^[a-f0-9]{32}(?:\.php\.[a-f0-9]{16}\.tmp)?\.php$/D', $entry->getFilename())) $sum += max(0, (int)@filesize($entry->getPathname()));
    }
    return $sum;
}

function music_identifier($value)
{
    return is_string($value) && preg_match('/^[a-f0-9]{32}$/D', $value) ? $value : '';
}

function music_video_id($input)
{
    if (!is_string($input) || strlen($input) > 2048) return '';
    $input = trim($input);
    if (preg_match('/^[A-Za-z0-9_-]{11}$/D', $input)) return $input;
    if (preg_match('/^(?:(?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\//i', $input)) $input = 'https://' . $input;
    $parts = @parse_url($input);
    if (!is_array($parts) || !in_array(strtolower((string)($parts['scheme'] ?? '')), array('http', 'https'), true) || isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) return '';
    $host = strtolower((string)($parts['host'] ?? '')); $path = (string)($parts['path'] ?? ''); $id = '';
    if ($host === 'youtu.be' || $host === 'www.youtu.be') $id = trim($path, '/');
    elseif (in_array($host, array('youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'), true)) {
        if ($path === '/watch' || $path === '/watch/') { $query = array(); parse_str((string)($parts['query'] ?? ''), $query); $id = is_string($query['v'] ?? null) ? $query['v'] : ''; }
        elseif (preg_match('#^/(?:shorts|embed|v)/([A-Za-z0-9_-]{11})/?$#D', $path, $matches)) $id = $matches[1];
    }
    return preg_match('/^[A-Za-z0-9_-]{11}$/D', $id) ? $id : '';
}

function music_provider_text($text, $limit)
{
    return clean_str(html_entity_decode(is_string($text) ? $text : '', ENT_QUOTES | ENT_HTML5, 'UTF-8'), $limit);
}

function music_youtube_track($id, $title = '', $artist = '', $thumbnail = '')
{
    return array('kind' => 'youtube', 'videoId' => $id, 'title' => $title !== '' ? $title : 'YouTube · ' . $id, 'artist' => $artist, 'thumbnail' => $thumbnail, 'url' => 'https://www.youtube.com/watch?v=' . rawurlencode($id));
}

function music_key_config()
{
    $environment = getenv('C122_YOUTUBE_API_KEY');
    if (is_string($environment) && trim($environment) !== '') return array('key' => trim($environment), 'source' => 'environment');
    $config = read_guarded(MUSIC_CONFIG);
    $key = is_string($config['apiKey'] ?? null) ? trim($config['apiKey']) : '';
    return array('key' => $key, 'source' => $key !== '' ? 'settings' : 'none');
}

function music_key_valid($key)
{
    return is_string($key) && preg_match('/^[A-Za-z0-9_-]{20,200}$/D', $key);
}

function music_settings_public()
{
    $config = music_key_config();
    return array('configured' => (bool)music_key_valid($config['key']), 'source' => $config['source']);
}

/** Only the two fixed official endpoints may be fetched, with no redirects or arbitrary hosts. */
function music_provider_json($url)
{
    if (strpos($url, 'https://www.youtube.com/oembed?') !== 0 && strpos($url, 'https://www.googleapis.com/youtube/v3/search?') !== 0) throw new RuntimeException('Invalid provider endpoint');
    $raw = ''; $status = 0;
    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl, array(CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 9, CURLOPT_RETURNTRANSFER => false, CURLOPT_USERAGENT => 'C122Music/1.0', CURLOPT_HTTPHEADER => array('Accept: application/json'), CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2));
        if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_HTTPS')) curl_setopt($curl, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        curl_setopt($curl, CURLOPT_WRITEFUNCTION, function ($handle, $chunk) use (&$raw) { if (strlen($raw) + strlen($chunk) > 1048576) return 0; $raw .= $chunk; return strlen($chunk); });
        $success = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
        if ($success === false) return array('status' => $status, 'data' => null);
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        $context = stream_context_create(array('http' => array('method' => 'GET', 'header' => "Accept: application/json\r\nUser-Agent: C122Music/1.0\r\n", 'timeout' => 9, 'follow_location' => 0, 'max_redirects' => 0, 'ignore_errors' => true), 'ssl' => array('verify_peer' => true, 'verify_peer_name' => true)));
        $fp = @fopen($url, 'rb', false, $context);
        if (!$fp) return array('status' => 0, 'data' => null);
        $raw = stream_get_contents($fp, 1048577); fclose($fp);
        foreach ($http_response_header ?? array() as $line) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $matches)) $status = (int)$matches[1];
        if ($raw === false || strlen($raw) > 1048576) return array('status' => $status, 'data' => null);
    }
    $data = json_decode($raw, true);
    return array('status' => $status, 'data' => is_array($data) ? $data : null);
}

function music_rate_reserve(&$cache, $scope)
{
    $now = time(); $ip = hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $limits = $scope === 'search' ? array(array('site', 86400, 80), array($ip, 3600, 20), array($ip, 2, 1)) : array(array('site', 86400, 1000), array($ip, 3600, 120), array($ip, 1, 1));
    foreach ($limits as $limit) {
        list($who, $window, $maximum) = $limit; $key = $scope . ':' . $who . ':' . $window; $rate = $cache['rates'][$key] ?? array('count' => 0, 'expires' => $now + $window);
        if ((int)$rate['expires'] <= $now) $rate = array('count' => 0, 'expires' => $now + $window);
        if ((int)$rate['count'] >= $maximum) fail('Түр хүлээгээд дахин хайна уу. YouTube хүсэлтийн хязгаарт хүрсэн байна.', 429, array('retryAfter' => max(1, (int)$rate['expires'] - $now)));
    }
    foreach ($limits as $limit) {
        list($who, $window, $maximum) = $limit; $key = $scope . ':' . $who . ':' . $window; $rate = $cache['rates'][$key] ?? array('count' => 0, 'expires' => $now + $window);
        if ((int)$rate['expires'] <= $now) $rate = array('count' => 0, 'expires' => $now + $window);
        $rate['count']++; $cache['rates'][$key] = $rate;
    }
}

function music_cache_get($cache, $key)
{
    $entry = $cache['entries'][$key] ?? null;
    return is_array($entry) && (int)($entry['expires'] ?? 0) > time() ? $entry['data'] : null;
}

function music_resolve_track($id)
{
    $key = 'video:' . $id; $lock = folder_storage_lock();
    try {
        $cache = music_cache_state(); $cached = music_cache_get($cache, $key);
        if (is_array($cached)) return $cached;
        music_rate_reserve($cache, 'resolve'); music_cache_save($cache);
    } finally { folder_storage_unlock($lock); }
    $response = music_provider_json('https://www.youtube.com/oembed?' . http_build_query(array('url' => 'https://www.youtube.com/watch?v=' . $id, 'format' => 'json'), '', '&', PHP_QUERY_RFC3986));
    $data = $response['status'] === 200 ? $response['data'] : null;
    $title = is_array($data) ? music_provider_text($data['title'] ?? '', 180) : '';
    $artist = is_array($data) ? music_provider_text($data['author_name'] ?? '', 120) : '';
    $track = music_youtube_track($id, $title, $artist, $title !== '' ? 'https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg' : '');
    $track['metadataAvailable'] = $title !== ''; $track['metadataExpires'] = time() + ($title !== '' ? MUSIC_METADATA_TTL : 300);
    $lock = folder_storage_lock();
    try { $cache = music_cache_state(); $cache['entries'][$key] = array('time' => time(), 'expires' => $track['metadataExpires'], 'data' => $track); music_cache_save($cache); }
    finally { folder_storage_unlock($lock); }
    return $track;
}

function music_search_results($query)
{
    $config = music_key_config(); $searchUrl = 'https://www.youtube.com/results?search_query=' . rawurlencode($query);
    if (!music_key_valid($config['key'])) return array('ok' => true, 'results' => array(), 'searchConfigured' => false, 'youtubeSearchUrl' => $searchUrl);
    $key = 'search:' . hash('sha256', $query); $lock = folder_storage_lock();
    try {
        $cache = music_cache_state(); $cached = music_cache_get($cache, $key);
        if (is_array($cached)) return array('ok' => true, 'results' => $cached, 'searchConfigured' => true, 'youtubeSearchUrl' => $searchUrl);
        music_rate_reserve($cache, 'search'); music_cache_save($cache);
    } finally { folder_storage_unlock($lock); }
    $params = array('key' => $config['key'], 'part' => 'snippet', 'type' => 'video', 'videoEmbeddable' => 'true', 'videoSyndicated' => 'true', 'safeSearch' => 'moderate', 'maxResults' => 12, 'q' => $query);
    $response = music_provider_json('https://www.googleapis.com/youtube/v3/search?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986));
    if ($response['status'] !== 200 || !is_array($response['data']['items'] ?? null)) fail('YouTube хайлт одоогоор ажиллахгүй байна. YouTube дээр хайж, дууны холбоосыг энд оруулж болно.', 503, array('searchConfigured' => true, 'youtubeSearchUrl' => $searchUrl));
    $results = array(); $now = time();
    foreach ($response['data']['items'] as $item) {
        $id = music_video_id($item['id']['videoId'] ?? ''); if ($id === '') continue;
        $snippet = $item['snippet'] ?? array(); $title = music_provider_text($snippet['title'] ?? '', 180); $artist = music_provider_text($snippet['channelTitle'] ?? '', 120);
        $track = music_youtube_track($id, $title, $artist, 'https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg'); $track['metadataExpires'] = $now + MUSIC_METADATA_TTL; $results[] = $track;
    }
    $lock = folder_storage_lock();
    try {
        $cache = music_cache_state(); $cache['entries'][$key] = array('time' => $now, 'expires' => $now + 3600, 'data' => $results);
        foreach ($results as $track) $cache['entries']['video:' . $track['videoId']] = array('time' => $now, 'expires' => $now + MUSIC_METADATA_TTL, 'data' => $track);
        music_cache_save($cache);
    } finally { folder_storage_unlock($lock); }
    return array('ok' => true, 'results' => $results, 'searchConfigured' => true, 'youtubeSearchUrl' => $searchUrl);
}

function music_playlist_meta($playlist)
{
    $cfg = folder_config();
    return array('id' => $playlist['id'], 'folder' => $playlist['folder'], 'ownerName' => (string)($cfg[$playlist['folder']]['name'] ?? ''), 'name' => $playlist['name'], 'description' => $playlist['description'], 'trackCount' => count($playlist['tracks']), 'version' => (int)$playlist['version'], 'updated' => $playlist['updated'], 'deleted' => $playlist['deleted'] ?? null);
}

function music_public_track($track, $cache, $state = null)
{
    if ($track['kind'] === 'audio') return music_audio_public_track($track, $state);
    if ($track['kind'] === 'spotify') {
        require_once __DIR__ . '/spotify.php';
        $id = sp_id($track['spotifyId'] ?? '');
        $image = sp_image(array(array('url' => $track['image'] ?? $track['thumbnail'] ?? '')));
        return array('id' => $track['id'], 'kind' => 'spotify', 'spotifyId' => $id, 'uri' => $id !== '' ? 'spotify:track:' . $id : '',
            'title' => clean_str($track['title'] ?? 'Дуу', 180), 'artist' => clean_str($track['artist'] ?? '', 600), 'album' => clean_str($track['album'] ?? '', 180),
            'thumbnail' => $image, 'image' => $image, 'url' => $id !== '' ? 'https://open.spotify.com/track/' . $id : '',
            'durationMs' => max(0, (int)($track['durationMs'] ?? 0)), 'playable' => $id !== '' && ($track['playable'] ?? true) !== false, 'customLabel' => false);
    }
    $metadata = music_cache_get($cache, 'video:' . $track['videoId']);
    $validStored = !empty($track['customLabel']) || (int)($track['providerExpires'] ?? 0) > time();
    $title = $validStored ? (string)($track['title'] ?? '') : (string)($metadata['title'] ?? '');
    $artist = $validStored ? (string)($track['artist'] ?? '') : (string)($metadata['artist'] ?? '');
    $thumbnail = (int)($track['providerExpires'] ?? 0) > time() ? (string)($track['thumbnail'] ?? '') : (string)($metadata['thumbnail'] ?? '');
    $public = music_youtube_track($track['videoId'], $title, $artist, $thumbnail); $public['id'] = $track['id']; $public['customLabel'] = !empty($track['customLabel']);
    return $public;
}

function music_public_playlist($playlist, $cache, $state = null)
{
    $public = music_playlist_meta($playlist); $public['tracks'] = array();
    foreach ($playlist['tracks'] as $track) $public['tracks'][] = music_public_track($track, $cache, $state);
    return $public;
}

function music_require_playlist($state, $id, $folder = null, $includeDeleted = false)
{
    $id = music_identifier($id); $playlist = $id !== '' ? ($state['playlists'][$id] ?? null) : null;
    if (!is_array($playlist) || (!$includeDeleted && !empty($playlist['deleted']))) fail('Playlist олдсонгүй.', 404);
    if ($folder !== null && $playlist['folder'] !== $folder) fail('Энэ playlist-ийг зөвхөн эзэмшигч нь өөрчилж болно.', 403);
    return $playlist;
}

function music_require_version($playlist, $version)
{
    if ((!is_int($version) && !is_string($version)) || !preg_match('/^[1-9][0-9]{0,9}$/D', (string)$version) || !hash_equals((string)$playlist['version'], (string)$version)) fail('Playlist өөр төхөөрөмж дээр өөрчлөгдсөн байна. Шинэ хувилбарыг ачаалаад үргэлжлүүлнэ үү.', 409, array('conflict' => true, 'version' => (int)$playlist['version']));
}

function music_playlist_labels($body, $previous = null)
{
    $name = array_key_exists('name', $body) ? clean_str($body['name'], 80) : (string)($previous['name'] ?? '');
    $description = array_key_exists('description', $body) ? clean_str($body['description'], 500) : (string)($previous['description'] ?? '');
    if ($name === '') fail('Playlist-ийн нэрээ оруулна уу.');
    return array($name, $description);
}

/** Resolve only catalog metadata through this display's own authenticated Spotify session. */
function music_resolve_spotify_track($spotifyId, $http = null)
{
    require_once __DIR__ . '/spotify.php';
    $spotifyId = sp_id($spotifyId);
    if ($spotifyId === '') throw new SpotifySiteException('Дууны ID буруу байна.');
    $ownsSession = session_status() !== PHP_SESSION_ACTIVE || session_name() !== 'c122_spotify';
    $oldActive = session_status() === PHP_SESSION_ACTIVE;
    $oldName = session_name(); $oldId = session_id(); $oldCookie = session_get_cookie_params(); $oldData = $_SESSION ?? array();
    if ($ownsSession) {
        if ($oldActive) session_write_close();
        // A previous session ID must not be reused under the Spotify cookie name.
        $spotifyCookie = $_COOKIE['c122_spotify'] ?? '';
        session_id(is_string($spotifyCookie) && preg_match('/^[A-Za-z0-9,-]{16,128}$/D', $spotifyCookie) ? $spotifyCookie : '');
    }
    try {
        sp_session();
        if (!sp_signed_in()) throw new SpotifySiteException('Том дэлгэц дээр эхлээд тоглуулагчийг холбоорой.', 401);
        $minute = (int)floor(time() / 60);
        if (($_SESSION['sp_rate']['minute'] ?? 0) !== $minute) $_SESSION['sp_rate'] = array('minute' => $minute, 'count' => 0);
        if (++$_SESSION['sp_rate']['count'] > 90) throw new SpotifySiteException('Түр хүлээгээд дахин оролдоорой.', 429, 60);
        $track = sp_track(sp_request('GET', 'tracks/' . $spotifyId, array(), null, $http));
        if (!$track) throw new SpotifySiteException('Дууны мэдээлэл олдсонгүй.', 404);
        return array('kind' => 'spotify', 'spotifyId' => $track['id'], 'uri' => $track['uri'], 'title' => $track['title'],
            'artist' => clean_str($track['artist'], 600), 'album' => $track['album'], 'thumbnail' => $track['image'], 'image' => $track['image'],
            'url' => $track['url'], 'durationMs' => $track['durationMs'], 'playable' => $track['playable']);
    } finally {
        if ($ownsSession) {
            if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
            session_name($oldName); session_id($oldId); session_set_cookie_params($oldCookie);
            if ($oldActive) session_start(); else $_SESSION = $oldData;
        }
    }
}

function handle_music_action($action)
{
    $reads = array('music_status', 'music_session', 'music_playlist', 'music_trash', 'music_search', 'music_resolve', 'music_stream', 'music_audio_stream', 'music_audio_files', 'music_audio_library', 'music_settings');
    $writes = array('music_playlist_create', 'music_playlist_update', 'music_playlist_delete', 'music_playlist_restore', 'music_track_add', 'music_track_update', 'music_track_remove', 'music_track_reorder', 'music_import', 'music_audio_import', 'music_settings_save');
    if (!in_array($action, $reads, true) && !in_array($action, $writes, true)) return false;
    $write = in_array($action, $writes, true);
    if ($write) require_post(); elseif (!in_array($_SERVER['REQUEST_METHOD'], array('GET', 'HEAD'), true)) fail('GET хүсэлт шаардлагатай.', 405);
    // The audio library (Smart Mix) was removed: songs come from Spotify search. Saved audio can still stream.
    if (in_array($action, array('music_audio_library', 'music_audio_files', 'music_import', 'music_audio_import'), true)) fail('Аудио сан хасагдсан. Spotify-оос дуу хайна уу.', 410);
    music_prepare();
    if (in_array($action, array('music_stream', 'music_audio_stream'), true)) music_audio_stream($_GET['audio'] ?? $_GET['audioId'] ?? '');
    if ($action === 'music_audio_library') json_out(music_audio_library(clean_str($_GET['q'] ?? '', 180)));
    if ($action === 'music_search') { $query = clean_str($_GET['q'] ?? '', 180); if ($query === '') fail('Хайх дууныхаа нэрийг оруулна уу.'); json_out(music_search_results($query)); }
    if ($action === 'music_resolve') { $video = music_video_id($_GET['url'] ?? ''); if ($video === '') fail('YouTube дууны зөв холбоос оруулна уу.'); json_out(array('ok' => true, 'track' => music_resolve_track($video))); }
    if ($action === 'music_settings') { if (!is_admin()) fail('Эхлээд нэвтэрнэ үү.', 401); json_out(array_merge(array('ok' => true), music_settings_public())); }
    if ($action === 'music_settings_save') {
        require_admin(); $body = body_json(); $clear = ($body['clear'] ?? false) === true; $key = is_string($body['apiKey'] ?? null) ? trim($body['apiKey']) : '';
        if (!$clear && $key !== '' && !music_key_valid($key)) fail('YouTube API key-ийн бүтэц буруу байна.');
        $lock = folder_storage_lock();
        try { $saved = read_guarded(MUSIC_CONFIG) ?: array(); if ($clear) unset($saved['apiKey']); elseif ($key !== '') $saved['apiKey'] = $key; $saved['updated'] = date('c'); if (!folder_write_private(MUSIC_CONFIG, $saved)) throw new RuntimeException('Cannot save music settings'); }
        finally { folder_storage_unlock($lock); }
        json_out(array_merge(array('ok' => true), music_settings_public()));
    }
    $body = $write ? body_json() : $_GET; $folder = null;
    if ($write || in_array($action, array('music_session', 'music_trash', 'music_audio_files'), true)) { $folder = folder_id($body['folder'] ?? ''); folder_require_access($folder, $write); }
    if ($action === 'music_session') json_out(array('ok' => true, 'folder' => array('id' => $folder, 'name' => folder_config()[$folder]['name']), 'csrf' => folder_csrf($folder)));
    if ($action === 'music_audio_files') json_out(music_audio_files($folder));
    $spotifyTrack = null;
    if ($action === 'music_track_add' && ($body['kind'] ?? '') === 'spotify') {
        // Check ownership/version before a provider request, then recheck under the write lock.
        $checkLock = folder_storage_lock(false);
        try {
            $checkPlaylist = music_require_playlist(music_state(), $body['id'] ?? '', $folder);
            music_require_version($checkPlaylist, $body['version'] ?? null);
            if (count($checkPlaylist['tracks']) >= MUSIC_MAX_TRACKS) fail('Нэг playlist 250 дуу хүртэл байна.');
            foreach ($checkPlaylist['tracks'] as $existing) if (($existing['kind'] ?? '') === 'spotify' && ($existing['spotifyId'] ?? '') === ($body['spotifyId'] ?? '')) fail('Энэ дуу playlist-д аль хэдийн байна.', 409);
        } finally { folder_storage_unlock($checkLock); }
        try { $spotifyTrack = music_resolve_spotify_track($body['spotifyId'] ?? ''); }
        catch (SpotifySiteException $e) { fail($e->getMessage(), $e->getCode(), $e->retryAfter ? array('retryAfter' => $e->retryAfter) : array()); }
    }
    $lock = folder_storage_lock($write); $result = null; $createdAudioId = null;
    try {
        $state = music_state(); $cache = music_cache_state();
        if ($action === 'music_status') {
            $students = array(); foreach (folder_config() as $id => $cfg) $students[] = array('id' => $id, 'name' => $cfg['name'], 'unlocked' => folder_unlocked($id));
            $playlists = array(); foreach ($state['playlists'] as $playlist) if (empty($playlist['deleted'])) $playlists[] = music_playlist_meta($playlist);
            usort($playlists, function ($a, $b) { return strcmp($b['updated'], $a['updated']) ?: strcmp($a['name'], $b['name']); });
            $result = array('ok' => true, 'students' => $students, 'playlists' => $playlists, 'searchConfigured' => music_settings_public()['configured'], 'limits' => music_limits());
        } elseif ($action === 'music_playlist') {
            $playlist = music_require_playlist($state, $body['id'] ?? ''); $result = array('ok' => true, 'playlist' => music_public_playlist($playlist, $cache, $state));
        } elseif ($action === 'music_trash') {
            $playlists = array(); foreach ($state['playlists'] as $playlist) if ($playlist['folder'] === $folder && !empty($playlist['deleted'])) $playlists[] = music_playlist_meta($playlist);
            usort($playlists, function ($a, $b) { return strcmp($b['deleted'], $a['deleted']); }); $result = array('ok' => true, 'playlists' => $playlists, 'csrf' => folder_csrf($folder));
        } else {
            if ($action === 'music_playlist_create') {
                $count = 0; foreach ($state['playlists'] as $existing) if ($existing['folder'] === $folder) $count++;
                if ($count >= MUSIC_MAX_PLAYLISTS) fail('Нэг сурагч сэргээх боломжтой playlist-тайгаа нийлээд 30 playlist хүртэл үүсгэж болно.');
                list($name, $description) = music_playlist_labels($body); $id = bin2hex(random_bytes(16));
                $playlist = array('id' => $id, 'folder' => $folder, 'name' => $name, 'description' => $description, 'tracks' => array(), 'version' => 1, 'created' => date('c'), 'updated' => date('c'), 'deleted' => null);
            } else {
                $playlist = music_require_playlist($state, $body['id'] ?? '', $folder, $action === 'music_playlist_restore'); $id = $playlist['id']; music_require_version($playlist, $body['version'] ?? null);
                if ($action === 'music_playlist_update') { list($playlist['name'], $playlist['description']) = music_playlist_labels($body, $playlist); }
                elseif ($action === 'music_playlist_delete') $playlist['deleted'] = date('c');
                elseif ($action === 'music_playlist_restore') { if (empty($playlist['deleted'])) fail('Энэ playlist аль хэдийн сэргэсэн байна.', 409); $playlist['deleted'] = null; }
                elseif (in_array($action, array('music_import', 'music_audio_import'), true)) $createdAudioId = music_audio_import($state, $playlist, $folder, $body);
                elseif ($action === 'music_track_add') {
                    if (count($playlist['tracks']) >= MUSIC_MAX_TRACKS) fail('Нэг playlist 250 дуу хүртэл байна.');
                    if ($spotifyTrack !== null) {
                        foreach ($playlist['tracks'] as $existing) if (($existing['kind'] ?? '') === 'spotify' && ($existing['spotifyId'] ?? '') === $spotifyTrack['spotifyId']) fail('Энэ дуу playlist-д аль хэдийн байна.', 409);
                        $spotifyTrack['id'] = bin2hex(random_bytes(16)); $spotifyTrack['added'] = date('c');
                        $playlist['tracks'][] = $spotifyTrack;
                    } elseif (($body['kind'] ?? '') === 'audio') {
                        fail('Аудио сан хасагдсан. Spotify-оос дуу хайна уу.', 410);
                    } else {
                        if (!in_array($body['kind'] ?? '', array('', 'youtube'), true)) fail('Аудио файл нэмэх боломжгүй. Хайлтаас дуу сонгоно уу.', 410);
                        $videoId = music_video_id($body['videoId'] ?? ''); if ($videoId === '' || !preg_match('/^[A-Za-z0-9_-]{11}$/D', (string)($body['videoId'] ?? ''))) fail('YouTube video ID буруу байна.');
                        foreach ($playlist['tracks'] as $existing) if ($existing['kind'] === 'youtube' && $existing['videoId'] === $videoId) fail('Энэ дуу playlist-д аль хэдийн байна.', 409);
                        $provider = music_cache_get($cache, 'video:' . $videoId); $custom = ($body['customLabel'] ?? false) === true;
                        $title = clean_str($body['title'] ?? ($provider['title'] ?? ''), 180); $artist = clean_str($body['artist'] ?? ($provider['artist'] ?? ''), 120);
                        if ($title === '') $title = 'YouTube · ' . $videoId;
                        $track = array('id' => bin2hex(random_bytes(16)), 'kind' => 'youtube', 'videoId' => $videoId, 'title' => $title, 'artist' => $artist, 'customLabel' => $custom, 'added' => date('c'));
                        if (!$custom) $track['providerExpires'] = min(time() + MUSIC_METADATA_TTL, (int)($provider['metadataExpires'] ?? time() + MUSIC_METADATA_TTL));
                        if (is_array($provider) && !empty($provider['thumbnail'])) { $track['thumbnail'] = $provider['thumbnail']; if ($custom) $track['providerExpires'] = min(time() + MUSIC_METADATA_TTL, (int)($provider['metadataExpires'] ?? time() + MUSIC_METADATA_TTL)); }
                        $playlist['tracks'][] = $track;
                    }
                } elseif ($action === 'music_track_update') {
                    $trackId = music_identifier($body['trackId'] ?? ''); $found = false;
                    $title = clean_str($body['title'] ?? '', 180); $artist = clean_str($body['artist'] ?? '', 120);
                    if ($title === '') fail('Дууны нэрийг оруулна уу.');
                    foreach ($playlist['tracks'] as &$track) if ($track['id'] === $trackId) {
                        if ($track['kind'] === 'spotify') fail('Дууны нэр болон уран бүтээлчийн мэдээллийг өөрчлөх боломжгүй.', 400);
                        $track['title'] = $title; $track['artist'] = $artist;
                        if ($track['kind'] === 'youtube') $track['customLabel'] = true;
                        $found = true; break;
                    }
                    unset($track);
                    if (!$found) fail('Дуу олдсонгүй.', 404);
                } elseif ($action === 'music_track_remove') {
                    $trackId = music_identifier($body['trackId'] ?? ''); $found = false;
                    foreach ($playlist['tracks'] as $n => $track) if ($track['id'] === $trackId) { array_splice($playlist['tracks'], $n, 1); $found = true; break; }
                    if (!$found) fail('Дуу олдсонгүй.', 404);
                } elseif ($action === 'music_track_reorder') {
                    $ids = $body['trackIds'] ?? null; if (!is_array($ids) || !is_list_array($ids) || count($ids) !== count($playlist['tracks']) || count(array_unique($ids, SORT_REGULAR)) !== count($ids)) fail('Дууны дарааллын жагсаалт буруу байна.');
                    $tracks = array(); foreach ($playlist['tracks'] as $track) $tracks[$track['id']] = $track; $ordered = array();
                    foreach ($ids as $trackId) { if (music_identifier($trackId) === '' || !isset($tracks[$trackId])) fail('Дууны дараалал playlist-тай таарахгүй байна.'); $ordered[] = $tracks[$trackId]; }
                    $playlist['tracks'] = $ordered;
                }
                $playlist['version']++; $playlist['updated'] = date('c');
            }
            $state['playlists'][$id] = $playlist; music_save($state); $createdAudioId = null;
            $result = $action === 'music_playlist_delete' ? array('ok' => true, 'deleted' => true, 'id' => $id, 'csrf' => folder_csrf($folder)) : array('ok' => true, 'playlist' => music_public_playlist($playlist, $cache, $state), 'csrf' => folder_csrf($folder));
        }
    } catch (Throwable $e) { if ($createdAudioId !== null) @unlink(music_audio_path($createdAudioId)); if ($e instanceof RuntimeException && $e->getCode() === 507) fail($e->getMessage(), 507); throw $e; }
    finally { folder_storage_unlock($lock); }
    json_out($result);
}

<?php
/* ONLYOFFICE bridge. Documents remain guarded; expiring tickets grant one-file access. */
if (!defined('C122')) { http_response_code(404); exit; }
define('OFFICE_CONFIG', DB_DIR . '/office.php');
define('OFFICE_SESSIONS', FOLDER_DIR . '/office-sessions.php');
define('OFFICE_MAX', 64 * 1024 * 1024);

function office_config()
{
    $cfg = read_guarded(OFFICE_CONFIG);
    return is_array($cfg) ? $cfg : array('enabled' => false, 'serverUrl' => '', 'serverInternalUrl' => '', 'siteUrl' => '', 'jwtSecret' => '');
}
function office_enabled($cfg) { return !empty($cfg['enabled']) && !empty($cfg['serverUrl']) && !empty($cfg['siteUrl']) && strlen($cfg['jwtSecret'] ?? '') >= 32; }
function office_config_id($cfg) { return hash('sha256', ($cfg['serverUrl'] ?? '') . '|' . ($cfg['serverInternalUrl'] ?? '') . '|' . ($cfg['siteUrl'] ?? '') . '|' . ($cfg['jwtSecret'] ?? '')); }
function office_url($value, $optional = false)
{
    $value = rtrim(trim((string)$value), '/');
    if ($value === '' && $optional) return '';
    $p = parse_url($value);
    if (strlen($value) > 500 || !$p || !in_array(strtolower($p['scheme'] ?? ''), array('http', 'https'), true) || empty($p['host']) || isset($p['user']) || isset($p['pass']) || isset($p['query']) || isset($p['fragment']) || preg_match('/[\x00-\x20\\\\]/', $value)) throw new RuntimeException('HTTP эсвэл HTTPS серверийн зөв хаяг оруулна уу.', 400);
    return $value;
}
function office_jwt($payload, $secret)
{
    $head = b64u_enc('{"alg":"HS256","typ":"JWT"}');
    $body = b64u_enc(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    return $head . '.' . $body . '.' . b64u_enc(hash_hmac('sha256', $head . '.' . $body, $secret, true));
}
function office_verify_jwt($token, $secret)
{
    if (!is_string($token) || strlen($token) > 262144) throw new RuntimeException('Invalid document-server signature', 403);
    $parts = explode('.', $token);
    if (count($parts) !== 3) throw new RuntimeException('Missing document-server signature', 403);
    $head = json_decode(b64u_dec($parts[0]), true); $data = json_decode(b64u_dec($parts[1]), true);
    $sig = b64u_enc(hash_hmac('sha256', $parts[0] . '.' . $parts[1], $secret, true));
    if (!is_array($head) || ($head['alg'] ?? '') !== 'HS256' || !is_array($data) || !hash_equals($sig, $parts[2]) || (isset($data['exp']) && (int)$data['exp'] <= time()) || (isset($data['nbf']) && (int)$data['nbf'] > time() + 30)) throw new RuntimeException('Invalid document-server signature', 403);
    return $data;
}
function office_sessions($state = null)
{
    if ($state === null) $state = folder_state();
    if (isset($state['officeSessions']) && is_array($state['officeSessions'])) return $state['officeSessions'];
    // Migrate sessions from the first release on the next guarded index commit.
    $rows = read_guarded(OFFICE_SESSIONS);
    return is_array($rows) ? $rows : array();
}
function office_save_sessions($rows, $state = null)
{
    if ($state === null) $state = folder_state();
    $state['officeSessions'] = $rows;
    folder_save($state);
}
function office_ticket($id, $row)
{
    $payload = b64u_enc(json_encode(array('id' => $id, 'exp' => $row['expires'])));
    return $payload . '.' . b64u_enc(hash_hmac('sha256', 'office|' . $payload, site_secret(), true));
}
function office_ticket_id($ticket)
{
    if (!is_string($ticket) || strlen($ticket) > 512) throw new RuntimeException('Document link expired', 403);
    $parts = explode('.', $ticket);
    if (count($parts) !== 2 || !hash_equals(b64u_enc(hash_hmac('sha256', 'office|' . $parts[0], site_secret(), true)), $parts[1])) throw new RuntimeException('Document link expired', 403);
    $data = json_decode(b64u_dec($parts[0]), true);
    if (!is_array($data) || folder_token_id($data['id'] ?? '') === '' || (int)($data['exp'] ?? 0) <= time()) throw new RuntimeException('Document link expired', 403);
    return $data['id'];
}
function office_session($id, $cfg, $rows = null)
{
    if ($rows === null) $rows = office_sessions();
    $row = $rows[$id] ?? null;
    if (!office_enabled($cfg) || !is_array($row) || (int)$row['expires'] <= time() || !hash_equals($row['config'], office_config_id($cfg))) throw new RuntimeException('Document editor is disabled or link expired', 403);
    return $row;
}
function office_extension($name) { return strtolower(pathinfo($name, PATHINFO_EXTENSION)); }
function office_type($ext)
{
    if (in_array($ext, array('doc', 'docx', 'odt', 'rtf', 'txt'), true)) return 'word';
    if (in_array($ext, array('xls', 'xlsx', 'ods', 'csv'), true)) return 'cell';
    if (in_array($ext, array('ppt', 'pptx', 'odp'), true)) return 'slide';
    if ($ext === 'pdf') return 'pdf';
    throw new RuntimeException('Энэ төрлийн файл Office засварлагчид дэмжигдээгүй.', 400);
}
/** Caller holds the global storage lock. */
function office_new_session($cfg, $folder, $file, $mode)
{
    $rows = office_sessions(); $version = folder_file_version($file);
    foreach ($rows as $id => $row) {
        if ((int)($row['expires'] ?? 0) <= time()) { unset($rows[$id]); continue; }
        if ($mode === 'edit' && ($row['mode'] ?? '') === 'edit' && empty($row['closed']) && $row['folder'] === $folder && $row['file'] === $file['id'] && $row['currentVersion'] === $version && $row['config'] === office_config_id($cfg) && $row['expires'] > time() + 3600) return array($id, $row);
    }
    if (count($rows) >= 1000) throw new RuntimeException('Хэт олон Office засвар нээлттэй байна. Дараа дахин оролдоно уу.', 429);
    $id = bin2hex(random_bytes(16));
    $row = array('folder' => $folder, 'file' => $file['id'], 'parent' => $file['parent'] ?? '', 'title' => $file['name'], 'key' => hash('sha256', $folder . '|' . $file['id'] . '|' . $version . '|' . $id), 'currentVersion' => $version, 'expires' => time() + ($mode === 'edit' ? 43200 : 1800), 'mode' => $mode, 'config' => office_config_id($cfg), 'lastSave' => null, 'status' => 0, 'closed' => false);
    $rows[$id] = $row; office_save_sessions($rows);
    return array($id, $row);
}
function office_endpoint($cfg, $action, $ticket) { return $cfg['siteUrl'] . '/office.php?action=' . rawurlencode($action) . '&ticket=' . rawurlencode($ticket); }
function office_editor_config($cfg, $id, $row)
{
    $ticket = office_ticket($id, $row); $ext = office_extension($row['title']);
    $config = array('documentType' => office_type($ext), 'width' => '100%', 'height' => '100%', 'document' => array('fileType' => $ext, 'key' => $row['key'], 'title' => $row['title'], 'url' => office_endpoint($cfg, 'file', $ticket), 'permissions' => array('edit' => true, 'download' => true, 'print' => true)), 'editorConfig' => array('mode' => 'edit', 'lang' => 'en', 'callbackUrl' => office_endpoint($cfg, 'callback', $ticket), 'user' => array('id' => $row['folder'], 'name' => folder_object($row['folder'])['name']), 'customization' => array('forcesave' => true)));
    $config['token'] = office_jwt($config, $cfg['jwtSecret']);
    return $config;
}
function office_origin($url)
{
    $p = parse_url($url);
    if (!$p || !in_array(strtolower($p['scheme'] ?? ''), array('http', 'https'), true) || empty($p['host']) || isset($p['user']) || isset($p['pass']) || isset($p['fragment']) || preg_match('/[\x00-\x20\\\\]/', $url)) return '';
    return strtolower($p['scheme']) . '://' . strtolower($p['host']) . ':' . ($p['port'] ?? (strtolower($p['scheme']) === 'https' ? 443 : 80));
}
function office_output_url($cfg, $url)
{
    if (!is_string($url) || strlen($url) > 4096 || office_origin($url) === '') throw new RuntimeException('Document server returned an invalid download URL', 502);
    $allowed = array(office_origin($cfg['serverUrl']));
    if (!empty($cfg['serverInternalUrl'])) $allowed[] = office_origin($cfg['serverInternalUrl']);
    if (!in_array(office_origin($url), $allowed, true)) throw new RuntimeException('Document download must come from the configured server', 502);
    return $url;
}
function office_download($cfg, $url)
{
    $url = office_output_url($cfg, $url);
    if (!function_exists('curl_init')) throw new RuntimeException('PHP cURL шаардлагатай.', 503);
    folder_check_disk(OFFICE_MAX);
    $path = FOLDER_DIR . '/.office-output-' . bin2hex(random_bytes(16)) . '.php';
    $fp = @fopen($path, 'xb');
    if (!$fp) throw new RuntimeException('Cannot save Office output', 500);
    @chmod($path, 0640); fwrite($fp, FOLDER_GUARD); $size = 0;
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 90, CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_HTTPHEADER => array('Authorization: Bearer ' . office_jwt(array('payload' => array('url' => $url)), $cfg['jwtSecret'])), CURLOPT_WRITEFUNCTION => function ($curl, $chunk) use ($fp, &$size) { $size += strlen($chunk); if ($size > OFFICE_MAX) return 0; return fwrite($fp, $chunk); }));
    $ok = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); fclose($fp);
    if (!$ok || $code !== 200 || $size === 0) { @unlink($path); throw new RuntimeException('Office серверээс файл татаж чадсангүй. Серверийн хаяг, холболтыг шалгана уу.', 502); }
    return $path;
}
function office_convert_file($cfg, $folder, $fileId, $target)
{
    $lock = folder_storage_lock();
    try {
        $state = folder_state(); $file = $state['folders'][$folder]['files'][$fileId] ?? null;
        if (!$file) throw new RuntimeException('Файл олдсонгүй.', 404);
        if ($file['size'] > OFFICE_MAX) throw new RuntimeException('Office хөрвүүлэгч 64 МБ хүртэл файлыг нээнэ.', 413);
        $ext = office_extension($file['name']); $type = office_type($ext);
        $targets = array('word' => array('docx', 'pdf', 'txt', 'odt', 'rtf'), 'cell' => array('xlsx', 'pdf', 'csv', 'ods'), 'slide' => array('pptx', 'pdf', 'odp'), 'pdf' => array('docx'));
        if (!in_array($target, $targets[$type], true) || $target === $ext) throw new RuntimeException('Хөрвүүлэх төрөл буруу байна.', 400);
        list($id, $row) = office_new_session($cfg, $folder, $file, 'convert');
    } finally { folder_storage_unlock($lock); }
    $ticket = office_ticket($id, $row);
    $job = array('async' => false, 'filetype' => $ext, 'outputtype' => $target, 'key' => $row['key'], 'title' => $file['name'], 'url' => office_endpoint($cfg, 'file', $ticket), 'codePage' => 65001, 'delimiter' => 4);
    $jobAuthorization = office_jwt(array('payload' => $job), $cfg['jwtSecret']);
    $job['token'] = office_jwt($job, $cfg['jwtSecret']);
    $ch = curl_init(($cfg['serverInternalUrl'] ?: $cfg['serverUrl']) . '/converter?shardkey=' . rawurlencode($row['key']));
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($job), CURLOPT_HTTPHEADER => array('Content-Type: application/json', 'Authorization: Bearer ' . $jobAuthorization), CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 120, CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS));
    $raw = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $result = $raw === false || strlen($raw) > 1048576 ? null : json_decode($raw, true);
    if ($code !== 200 || !is_array($result) || empty($result['endConvert']) || !empty($result['error']) || empty($result['fileUrl'])) throw new RuntimeException('Office хөрвүүлэлт амжилтгүй. Document Server болон файлын төрлийг шалгана уу.', 502);
    $temp = office_download($cfg, $result['fileUrl']);
    $lock = folder_storage_lock();
    try {
        // A folder switch or original-file edit cannot move the resulting copy elsewhere.
        $state = folder_state(); office_session($id, office_config(), office_sessions($state));
        $current = $state['folders'][$folder]['files'][$fileId] ?? null;
        if (!$current || folder_file_version($current) !== $row['currentVersion']) throw new RuntimeException('Эх файл өөрчлөгдсөн байна. Дахин хөрвүүлнэ үү.', 409);
        $name = pathinfo($file['name'], PATHINFO_FILENAME) . '-converted.' . $target;
        $rows = office_sessions($state); unset($rows[$id]);
        $saved = folder_add_blob($state, $folder, $row['parent'], $name, $temp, function (&$commitState, $file) use ($rows) { $commitState['officeSessions'] = $rows; });
        return $saved;
    } finally { folder_storage_unlock($lock); @unlink($temp); }
}
function office_callback_receipt($signed)
{
    // JWT expiry timestamps can change when a server retries an identical save.
    foreach (array('iat', 'exp', 'nbf', 'iss', 'aud', 'token') as $key) unset($signed[$key]);
    $canonical = function ($value) use (&$canonical) {
        if (!is_array($value)) return $value;
        if (array_keys($value) !== range(0, count($value) - 1)) ksort($value);
        foreach ($value as $key => $item) $value[$key] = $canonical($item);
        return $value;
    };
    return hash('sha256', json_encode($canonical($signed), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}
function office_callback($cfg, $id, $body)
{
    $token = $body['token'] ?? '';
    if ($token === '' && preg_match('/^Bearer\s+(.+)$/i', $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '', $m)) $token = $m[1];
    $claims = office_verify_jwt($token, $cfg['jwtSecret']);
    $signed = isset($claims['payload']) && is_array($claims['payload']) ? $claims['payload'] : $claims;
    foreach (array('key', 'status', 'url') as $field) if (isset($body[$field]) && (!isset($signed[$field]) || $body[$field] !== $signed[$field])) throw new RuntimeException('Unsigned callback parameters', 403);
    $row = office_session($id, $cfg);
    if ($row['mode'] !== 'edit' || !hash_equals($row['key'], (string)($signed['key'] ?? ''))) throw new RuntimeException('Wrong document key', 403);
    $status = (int)($signed['status'] ?? 0);
    if (!in_array($status, array(1, 2, 3, 4, 6, 7), true)) throw new RuntimeException('Invalid callback status', 400);
    $temp = null; $receipt = null; $knownReceipt = false;
    if ($status === 2 || $status === 6) {
        $extension = office_extension($row['title']);
        if (isset($signed['filetype']) && $signed['filetype'] !== $extension) throw new RuntimeException('Unexpected document output format', 409);
        $url = office_output_url($cfg, $signed['url'] ?? '');
        $receipt = office_callback_receipt($signed);
        $knownReceipt = isset($row['saveReceipts'][$receipt]);
        if (!$knownReceipt) $temp = office_download($cfg, $url);
    }
    $lock = folder_storage_lock();
    try {
        $state = folder_state(); $rows = office_sessions($state); $current = office_session($id, office_config(), $rows);
        // A successful callback is idempotent even after a later inline or Office edit.
        if ($receipt !== null && ($knownReceipt || isset($current['saveReceipts'][$receipt]))) return;
        // ONLYOFFICE may report closed-with-no-changes on a temporary disconnect,
        // then resume the same document when the user reconnects within 100 seconds.
        if ($status === 1 && !empty($current['closed']) && (int)($current['closedStatus'] ?? 0) === 4 && (int)($current['closedAt'] ?? 0) >= time() - 120) {
            $file = $state['folders'][$current['folder']]['files'][$current['file']] ?? null;
            if (!$file || !hash_equals($current['currentVersion'], folder_file_version($file))) throw new RuntimeException('Document changed while disconnected', 409);
            $current['closed'] = false;
        }
        $current['status'] = $status;
        if ($status === 2 || $status === 4) { $current['closed'] = true; $current['closedStatus'] = $status; $current['closedAt'] = time(); }
        if ($temp !== null) {
            if (!empty($rows[$id]['closed'])) throw new RuntimeException('This editing session has already closed', 409);
            // Keep the revision captured before the network request. Loading it again
            // here could silently overwrite a concurrent inline edit.
            folder_replace_blob($state, $row['folder'], $row['file'], $temp, $row['currentVersion'], function (&$commitState, $saved) use ($id, $receipt, &$current, $rows) {
                $current['currentVersion'] = $saved['version']; $current['lastSave'] = date('c');
                if (!isset($current['saveReceipts']) || !is_array($current['saveReceipts'])) $current['saveReceipts'] = array();
                $current['saveReceipts'][$receipt] = time();
                while (count($current['saveReceipts']) > 64) { reset($current['saveReceipts']); unset($current['saveReceipts'][key($current['saveReceipts'])]); }
                $rows[$id] = $current; $commitState['officeSessions'] = $rows;
            });
        } else { $rows[$id] = $current; office_save_sessions($rows, $state); }
    } finally { folder_storage_unlock($lock); if ($temp !== null) @unlink($temp); }
}

function handle_office_action($action)
{
    if (!in_array($action, array('office_status', 'office_settings', 'office_open', 'office_convert'), true)) return;
    folder_prepare(); $cfg = office_config();
    if ($action === 'office_status') json_out(array('ok' => true, 'enabled' => office_enabled($cfg)));
    if ($action === 'office_settings') {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            require_admin(); $body = body_json();
            try { $next = array('enabled' => !empty($body['enabled']), 'serverUrl' => office_url($body['serverUrl'] ?? '', true), 'serverInternalUrl' => office_url($body['serverInternalUrl'] ?? '', true), 'siteUrl' => office_url($body['siteUrl'] ?? '', true), 'jwtSecret' => trim((string)($body['jwtSecret'] ?? '')) ?: ($cfg['jwtSecret'] ?? '')); }
            catch (RuntimeException $e) { fail($e->getMessage(), 400); }
            if ($next['enabled'] && !office_enabled($next)) fail('Сервер, сайтын хаяг болон 32-с дээш тэмдэгттэй JWT түлхүүр оруулна уу.');
            if (strlen($next['jwtSecret']) > 1024 || preg_match('/[\x00-\x1f]/', $next['jwtSecret'])) fail('JWT түлхүүр буруу байна.');
            $lock = folder_storage_lock(); try { if (!folder_write_private(OFFICE_CONFIG, $next)) throw new RuntimeException('Cannot save Office settings', 500); } finally { folder_storage_unlock($lock); }
            $cfg = $next;
        } else if (!is_admin()) fail('Админ нэвтрэх шаардлагатай.', 401);
        json_out(array('ok' => true, 'settings' => array('enabled' => !empty($cfg['enabled']), 'serverUrl' => $cfg['serverUrl'], 'serverInternalUrl' => $cfg['serverInternalUrl'] ?? '', 'siteUrl' => $cfg['siteUrl'], 'hasSecret' => !empty($cfg['jwtSecret']))));
    }
    require_post(); $body = body_json(); $folder = folder_id($body['folder'] ?? '');
    folder_require_access($folder, true);
    if (!office_enabled($cfg)) fail('Бүрэн Office засварлагчийг админ тохиргооноос Document Server-тэй холбоно уу.', 503, array('officeSetup' => true));
    if (!function_exists('curl_init')) fail('Office сервертэй холбогдоход PHP cURL шаардлагатай.', 503);
    $fileId = folder_token_id($body['file'] ?? '');
    try {
        if ($action === 'office_convert') json_out(array('ok' => true, 'file' => office_convert_file($cfg, $folder, $fileId, strtolower((string)($body['target'] ?? '')))));
        $lock = folder_storage_lock();
        try {
            $state = folder_state(); $file = $state['folders'][$folder]['files'][$fileId] ?? null;
            if (!$file) throw new RuntimeException('Файл олдсонгүй.', 404);
            if ($file['size'] > OFFICE_MAX) throw new RuntimeException('Бүрэн Office засварлагч 64 МБ хүртэл файлыг нээнэ.', 413);
            $ext = office_extension($file['name']); $type = office_type($ext);
        } finally { folder_storage_unlock($lock); }
        if (!in_array($ext, array('docx', 'xlsx', 'pptx', 'pdf'), true)) {
            $modern = array('word' => 'docx', 'cell' => 'xlsx', 'slide' => 'pptx');
            $copy = office_convert_file($cfg, $folder, $fileId, $modern[$type]); $fileId = $copy['id'];
        }
        $lock = folder_storage_lock();
        try { $state = folder_state(); $file = $state['folders'][$folder]['files'][$fileId] ?? null; if (!$file) throw new RuntimeException('Файл олдсонгүй.', 404); list($id, $row) = office_new_session($cfg, $folder, $file, 'edit'); } finally { folder_storage_unlock($lock); }
        // Relative navigation keeps the editor on the same origin as the folder UI.
        json_out(array('ok' => true, 'editorUrl' => 'office.php?action=editor&ticket=' . rawurlencode(office_ticket($id, $row)), 'file' => folder_public_file($folder, $file), 'converted' => isset($copy)));
    } catch (RuntimeException $e) { $code = $e->getCode(); fail($e->getMessage(), $code >= 400 && $code <= 599 ? $code : 500); }
}

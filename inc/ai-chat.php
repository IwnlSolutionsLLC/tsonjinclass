<?php
/* Private, PIN-protected Egune conversations. Provider credentials never reach the browser. */
if (!defined('C122')) { http_response_code(404); exit; }
define('AI_CHAT_DIR', DB_DIR . '/ai-chat');
define('AI_CHAT_STATE', AI_CHAT_DIR . '/index.php');
define('AI_CHAT_CONFIG', C122_ROOT . '/ai-settings.php');
define('AI_CHAT_LEGACY_CONFIG', DB_DIR . '/ai-settings.php');
define('AI_CHAT_MAX_STATE', 32 * 1024 * 1024);

function ai_settings_saved()
{
    // A present root file is authoritative, including an intentionally empty key.
    $file = is_file(AI_CHAT_CONFIG) ? AI_CHAT_CONFIG : AI_CHAT_LEGACY_CONFIG;
    return read_guarded($file) ?: array();
}

function ai_settings_config()
{
    $saved = ai_settings_saved();
    $env = getenv('C122_EGUNE_API_KEY');
    $key = is_string($env) && trim($env) !== '' ? trim($env) : trim((string)($saved['eguneApiKey'] ?? ''));
    return array('key' => $key, 'source' => is_string($env) && trim($env) !== '' ? 'environment' : ($key !== '' ? 'settings' : 'none'),
        'maxOutput' => max(100, min(1200, (int)($saved['maxOutput'] ?? 500))),
        'maxDaily' => max(1, min(200, (int)($saved['maxDaily'] ?? 20))),
        'siteDaily' => max(1, min(200, (int)($saved['siteDaily'] ?? 80))),
        'budgetMnt' => max(0, min(1000000, (float)($saved['budgetMnt'] ?? 0))));
}

function ai_key_valid($key)
{
    return is_string($key) && preg_match('/^[A-Za-z0-9_-]{20,250}$/D', $key);
}

function ai_limits($config = null)
{
    $config = $config ?: ai_settings_config();
    return array('maxMessage' => 4000, 'maxChats' => 30, 'maxMessages' => 200, 'contextCharacters' => 8000,
        'maxOutput' => $config['maxOutput'], 'longOutput' => 1200, 'maxDaily' => $config['maxDaily'], 'siteDaily' => $config['siteDaily']);
}

function ai_settings_public()
{
    $config = ai_settings_config(); $saved = ai_settings_saved();
    return array('configured' => (bool)ai_key_valid($config['key']), 'source' => $config['source'], 'model' => 'egune-nano',
        'anthropicConfigured' => !empty($saved['anthropicApiKey']), 'anthropicUsed' => false,
        'maxOutput' => $config['maxOutput'], 'maxDaily' => $config['maxDaily'], 'siteDaily' => $config['siteDaily'],
        'budgetMnt' => $config['budgetMnt'], 'settingsFile' => 'ai-settings.php',
        'legacyFallback' => !is_file(AI_CHAT_CONFIG) && is_file(AI_CHAT_LEGACY_CONFIG),
        'pricing' => array('inputMntPerMillion' => 900, 'outputMntPerMillion' => 4900));
}

function ai_prepare()
{
    static $ready = false;
    if ($ready) return;
    folder_prepare(); $lock = folder_storage_lock();
    try {
        if (!is_dir(AI_CHAT_DIR) && !@mkdir(AI_CHAT_DIR, 0750, true) && !is_dir(AI_CHAT_DIR)) throw new RuntimeException('Cannot create private AI storage');
        if (!is_file(AI_CHAT_DIR . '/.htaccess') && @file_put_contents(AI_CHAT_DIR . '/.htaccess', "Options -Indexes\nRequire all denied\nDeny from all\n") === false) throw new RuntimeException('Cannot protect AI storage');
        if (!is_file(AI_CHAT_STATE) && !folder_write_private(AI_CHAT_STATE, array('format' => 'c122-ai-chat-v1', 'chats' => array(), 'requests' => array(), 'daily' => array(), 'totals' => array('input' => 0, 'output' => 0, 'costMnt' => 0)))) throw new RuntimeException('Cannot initialize AI storage');
        $ready = true;
    } finally { folder_storage_unlock($lock); }
}

function ai_state()
{
    if (!is_file(AI_CHAT_STATE) || @filesize(AI_CHAT_STATE) > AI_CHAT_MAX_STATE + 4096) throw new RuntimeException('Invalid AI storage length');
    $state = read_guarded(AI_CHAT_STATE);
    if (!is_array($state) || !is_array($state['chats'] ?? null) || !is_array($state['requests'] ?? null) || !is_array($state['daily'] ?? null)) throw new RuntimeException('Invalid AI storage');
    return $state;
}

function ai_save($state)
{
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false || strlen($json) > AI_CHAT_MAX_STATE) throw new RuntimeException('Чатын хадгалах хэмжээ дүүрсэн байна. Сайтын админтай холбогдоно уу.', 507);
    if (!folder_write_private(AI_CHAT_STATE, $state)) throw new RuntimeException('Cannot save private AI conversation');
}

function ai_used_bytes()
{
    $sum = 0;
    foreach (array(AI_CHAT_STATE, AI_CHAT_CONFIG, AI_CHAT_LEGACY_CONFIG) as $file) if (is_file($file)) $sum += max(0, (int)@filesize($file));
    return $sum;
}

function ai_chat_used_bytes()
{
    return ai_used_bytes();
}

function ai_id($value)
{
    return is_string($value) && preg_match('/^[a-f0-9]{32}$/D', $value) ? $value : '';
}

function ai_require_chat($state, $id, $folder, $deleted = false)
{
    $id = ai_id($id); $chat = $id !== '' ? ($state['chats'][$id] ?? null) : null;
    if (!is_array($chat) || $chat['folder'] !== $folder || (!$deleted && !empty($chat['deleted']))) fail('Чат олдсонгүй.', 404);
    return $chat;
}

function ai_version($chat, $version)
{
    if ((!is_int($version) && !is_string($version)) || !ctype_digit((string)$version) || (int)$version !== (int)$chat['version']) fail('Чат өөр төхөөрөмж дээр шинэчлэгдсэн байна. Дахин нээгээд үргэлжлүүлээрэй.', 409, array('conflict' => true));
}

function ai_chat_meta($chat)
{
    return array('id' => $chat['id'], 'title' => $chat['title'], 'version' => $chat['version'], 'created' => $chat['created'], 'updated' => $chat['updated'], 'deleted' => $chat['deleted'], 'messageCount' => count($chat['messages']));
}

function ai_public_chat($chat)
{
    $out = ai_chat_meta($chat); $out['messages'] = array();
    foreach ($chat['messages'] as $message) $out['messages'][] = array('id' => $message['id'], 'role' => $message['role'], 'content' => $message['role'] === 'assistant' ? ai_strip_think($message['content']) : $message['content'], 'time' => $message['time']);
    return $out;
}

/** Remove complete, escaped, nested and unterminated reasoning regions before storage or display. */
function ai_strip_think($text)
{
    if (!is_string($text)) return '';
    // Recognize entity escaped tags without decoding unrelated user-visible HTML.
    for ($i = 0; $i < 3; $i++) $text = preg_replace_callback('/&(?:amp;)*lt;\s*(\/?)\s*think\b[^\r\n]*?&(?:amp;)*gt;/i', function ($m) { return '<' . $m[1] . 'think>'; }, $text);
    $text = preg_replace('/\\\\([<>])/', '$1', $text);
    $parts = preg_split('/(<\s*\/?\s*think\b[^>]*>)/i', $text, -1, PREG_SPLIT_DELIM_CAPTURE);
    $out = ''; $depth = 0;
    foreach ($parts as $part) {
        if (preg_match('/^<\s*\/\s*think\b[^>]*>$/i', $part)) { if ($depth > 0) $depth--; }
        elseif (preg_match('/^<\s*think\b[^>]*>$/i', $part)) $depth++;
        elseif ($depth === 0) $out .= $part;
    }
    return trim($out);
}

function ai_answer_text($text)
{
    $text = ai_strip_think($text);
    // Honor the configured no-emoji voice even if the provider overlooks that instruction.
    return trim(preg_replace('/[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0E}\x{FE0F}\x{200D}\x{20E3}]/u', '', $text) ?? '');
}

function ai_system_prompt($name)
{
    $original = str_replace('USERNAME', $name, 'Та бол IwnlX AI — хэрэглэгчийн хамгийн дотны, ухаалаг бөгөөд найрсаг туслах юм. Таны гол зорилго бол хэрэглэгчтэй яг л найзтайгаа ярилцаж байгаа мэт халуун дулаан уур амьсгалаар харилцах. Танитай чатлаж байгаа хүний нэр: USERNAME. Чинии нэр: IwnlX Ai. Та өмнөх яриаг маш сайн санаж, түүнд нь тулгуурлан илүү хувийн, дотно зөвлөгөө өгнө. Үргэлж эелдэг байж, яриаг сонирхолтой өрнүүлэхийг хичээ. Тэр хүн ямар хэлээр яриж байна тэр хэлээр хариу өгнө. Таныг Iwnl Solutions LLC бүтээсэн бөгөөд таны суурь LLM бол IwnlXv1.0-Beta юм. Товч бөгөөд тодорхой хариулт өг. Хэрв хэрэглэгч асуувал маш урт хариу өгч болно.АНХААРУУЛГА! Эможи битгий ашгил. Хэзээч эможи битгий ашгилаарай!!!Think and give correct and great answer.');
    return $original . "\n\n" . 'Сүүлийн асуултад шууд хариул; өмнөх яриаг ашигла. “yu bn”, “snu” зэрэг латинаар бичсэн монголыг утгаар нь ойлго. Мэндчилгээ, нэр, “Юугаар туслах вэ?”-г зурвас бүрт бүү давт. Ярианд байхгүй огноо, цаг, дурсамж бүү зохио.';
}

function ai_text_length($text)
{
    if (function_exists('mb_strlen')) return mb_strlen($text, 'UTF-8');
    return preg_match_all('/./us', $text, $matches);
}

function ai_context($chat, $message, $name)
{
    $recent = array(); $used = ai_text_length($message);
    for ($i = count($chat['messages']) - 1; $i >= 0; $i--) {
        $entry = $chat['messages'][$i]; $length = ai_text_length($entry['content']);
        if ($used + $length > 8000 || count($recent) >= 20) break;
        array_unshift($recent, array('role' => $entry['role'], 'content' => $entry['content'])); $used += $length;
    }
    while ($recent && $recent[0]['role'] !== 'user') array_shift($recent);
    array_unshift($recent, array('role' => 'system', 'content' => ai_system_prompt($name)));
    $recent[] = array('role' => 'user', 'content' => $message);
    return $recent;
}

function ai_cost($input, $output)
{
    // Estimate only; provider prices and account balance may change.
    return round(max(0, $input) * 900 / 1000000 + max(0, $output) * 4900 / 1000000, 6);
}

function ai_busy($state, $folder)
{
    foreach ($state['requests'] as $request) if ($request['folder'] === $folder && $request['status'] === 'calling' && (int)$request['expires'] > time()) return true;
    return false;
}

function ai_day()
{
    return (new DateTimeImmutable('now', new DateTimeZone('Asia/Ulaanbaatar')))->format('Y-m-d');
}

function ai_usage($state, $folder, $config)
{
    $day = $state['daily'][ai_day()] ?? array('site' => 0, 'students' => array());
    $totals = array('input' => 0, 'output' => 0, 'costMnt' => 0);
    foreach ($state['requests'] as $request) if ($request['folder'] === $folder && isset($request['usage'])) {
        $totals['input'] += (int)$request['usage']['input']; $totals['output'] += (int)$request['usage']['output']; $totals['costMnt'] += (float)$request['usage']['costMnt'];
    }
    return array('date' => ai_day(), 'requestsToday' => (int)($day['students'][$folder] ?? 0), 'remainingToday' => max(0, $config['maxDaily'] - (int)($day['students'][$folder] ?? 0)), 'siteRemainingToday' => max(0, $config['siteDaily'] - (int)$day['site']), 'busy' => ai_busy($state, $folder), 'recentInputTokens' => $totals['input'], 'recentOutputTokens' => $totals['output'], 'recentEstimatedMnt' => round($totals['costMnt'], 4));
}

/** Fixed HTTPS provider, no redirects, tools, background requests or automatic retries. */
function ai_provider_request($payload, $key)
{
    $raw = ''; $status = 0; $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (function_exists('curl_init')) {
        $curl = curl_init('https://api.egune.com/v1/chat/completions');
        curl_setopt_array($curl, array(CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 55, CURLOPT_RETURNTRANSFER => false, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => array('Content-Type: application/json', 'Accept: application/json', 'Authorization: Bearer ' . $key)));
        if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_HTTPS')) curl_setopt($curl, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        curl_setopt($curl, CURLOPT_WRITEFUNCTION, function ($handle, $chunk) use (&$raw) { if (strlen($raw) + strlen($chunk) > 1048576) return 0; $raw .= $chunk; return strlen($chunk); });
        $success = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
        if ($success === false) return array('status' => 0, 'data' => null);
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        $context = stream_context_create(array('http' => array('method' => 'POST', 'header' => "Content-Type: application/json\r\nAccept: application/json\r\nAuthorization: Bearer " . $key . "\r\n", 'content' => $body, 'timeout' => 55, 'follow_location' => 0, 'max_redirects' => 0, 'ignore_errors' => true), 'ssl' => array('verify_peer' => true, 'verify_peer_name' => true)));
        $fp = @fopen('https://api.egune.com/v1/chat/completions', 'rb', false, $context);
        if (!$fp) return array('status' => 0, 'data' => null);
        $raw = stream_get_contents($fp, 1048577); fclose($fp);
        foreach ($http_response_header ?? array() as $line) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $matches)) $status = (int)$matches[1];
        if ($raw === false || strlen($raw) > 1048576) return array('status' => 0, 'data' => null);
    }
    $decoded = json_decode($raw, true);
    return array('status' => $status, 'data' => is_array($decoded) ? $decoded : null);
}

function ai_provider_error($status)
{
    if ($status === 401 || $status === 403) return 'AI API түлхүүр ажиллахгүй байна. Сайтын админ түлхүүрээ шалгана уу.';
    if ($status === 429) return 'AI үйлчилгээний хязгаар эсвэл үлдэгдэл хүрэлцэхгүй байна. Дараа дахин оролдоорой.';
    if ($status === 0) return 'AI хариу хугацаандаа ирсэнгүй. Яриаг дахин нээж шалгаарай. Хүсэлтийг автоматаар дахин илгээгээгүй.';
    return 'AI үйлчилгээ одоогоор хариу өгөхгүй байна. Дараа дахин оролдоорой.';
}

function ai_send($folder, $body, $config, $provider = null)
{
    $requestId = ai_id($body['requestId'] ?? '');
    if ($requestId === '') fail('Хүсэлтийн дугаар хүчингүй байна.');
    $message = is_string($body['message'] ?? null) ? trim($body['message']) : '';
    if ($message === '' || !preg_match('//u', $message) || ai_text_length($message) > 4000 || strlen($message) > 16000) fail('Асуултаа 1–4000 тэмдэгтээр бичнэ үү.');
    $id = ai_id($body['id'] ?? ''); $hash = hash('sha256', $id . '|' . $message . '|' . (!empty($body['longReply']) ? 'long' : 'short')); $requestKey = $folder . ':' . $requestId;
    if (!ai_key_valid($config['key'])) fail('AI тохиргоо хараахан хийгдээгүй байна. Сайтын админ Egune түлхүүрээ оруулна уу.', 503);
    $lock = folder_storage_lock(); $existing = null; $payload = null;
    try {
        $state = ai_state(); $chat = ai_require_chat($state, $id, $folder);
        if (isset($state['requests'][$requestKey])) {
            $existing = $state['requests'][$requestKey];
            if (!hash_equals($existing['hash'], $hash)) fail('Энэ хүсэлтийн дугаар өмнө нь ашиглагдсан байна.', 409);
            if ($existing['status'] === 'done') { $result = array('ok' => true, 'chat' => ai_public_chat($chat), 'usage' => ai_usage($state, $folder, $config), 'csrf' => folder_csrf($folder), 'reused' => true); }
            elseif ($existing['status'] === 'calling') fail('Өмнөх хүсэлт хариугаа хүлээж байна. Яриаг дахин нээж шалгаарай.', 409, array('pending' => true));
            else fail($existing['error'] ?? 'Энэ хүсэлт амжилтгүй болсон. Шинэ хүсэлтээр дахин оролдоорой.', 409);
        } else {
            ai_version($chat, $body['version'] ?? null);
            if (ai_busy($state, $folder)) fail('Өмнөх асуултынхаа хариуг хүлээнэ үү.', 409, array('pending' => true));
            if (count($chat['messages']) >= 198) fail('Энэ яриа 200 зурваст хүрсэн байна. Шинэ чат нээгээрэй.', 409);
            $day = ai_day(); $daily = $state['daily'][$day] ?? array('site' => 0, 'students' => array());
            if ((int)($daily['students'][$folder] ?? 0) >= $config['maxDaily'] || (int)$daily['site'] >= $config['siteDaily']) fail('Өнөөдрийн AI хүсэлтийн хязгаарт хүрсэн байна. Маргааш үргэлжлүүлээрэй.', 429);
            $messages = ai_context($chat, $message, folder_config()[$folder]['name']); $maxOutput = ($body['longReply'] ?? false) === true ? 1200 : $config['maxOutput'];
            $inputBound = 0; foreach ($messages as $entry) $inputBound += strlen($entry['content']) + 20;
            $reserve = ai_cost($inputBound, $maxOutput); $reserved = 0;
            foreach ($state['requests'] as $entry) if ($entry['status'] === 'calling') $reserved += (float)$entry['reservedMnt'];
            if ($config['budgetMnt'] > 0 && (float)$state['totals']['costMnt'] + $reserved + $reserve > $config['budgetMnt']) fail('Сайтын AI төсвийн хязгаарт хүрсэн байна. Админтай холбогдоорой.', 429);
            foreach ($state['daily'] as $date => $_) if ($date < date('Y-m-d', time() - 35 * 86400)) unset($state['daily'][$date]);
            foreach ($state['requests'] as $key => $entry) if ((int)$entry['time'] < time() - 30 * 86400 && $entry['status'] !== 'calling') unset($state['requests'][$key]);
            // Expired calls stay accounted at their reservation until a late response reconciles them.
            foreach ($state['requests'] as &$entry) if ($entry['status'] === 'calling' && (int)$entry['expires'] <= time()) {
                $entry['status'] = 'failed'; $entry['error'] = 'Хүсэлтийн хугацаа дууссан. Яриаг дахин шалгаарай.';
                $entry['usage'] = array('input' => 0, 'output' => 0, 'costMnt' => $entry['reservedMnt'], 'estimated' => true); $state['totals']['costMnt'] += $entry['reservedMnt'];
            }
            unset($entry);
            $daily['site']++; $daily['students'][$folder] = (int)($daily['students'][$folder] ?? 0) + 1; $state['daily'][$day] = $daily;
            $state['requests'][$requestKey] = array('folder' => $folder, 'chat' => $id, 'hash' => $hash, 'status' => 'calling', 'time' => time(), 'expires' => time() + 120, 'reservedMnt' => $reserve, 'inputBound' => $inputBound, 'outputBound' => $maxOutput);
            ai_save($state);
            $payload = array('model' => 'egune-nano', 'messages' => $messages, 'max_tokens' => $maxOutput, 'stream' => false, 'chat_template_kwargs' => array('enable_thinking' => false));
        }
    } finally { folder_storage_unlock($lock); }
    if ($existing) json_out($result);
    @set_time_limit(90); ignore_user_abort(true);
    try { $response = $provider ? $provider($payload, $config['key']) : ai_provider_request($payload, $config['key']); }
    catch (Throwable $exception) { $response = array('status' => 0, 'data' => null); }
    $data = $response['data'];
    $answer = $response['status'] === 200 ? ai_answer_text($data['choices'][0]['message']['content'] ?? '') : '';
    $error = $answer !== '' ? '' : ai_provider_error($response['status']);
    $providerUsage = is_array($data['usage'] ?? null) ? $data['usage'] : array();
    $input = isset($providerUsage['prompt_tokens']) && is_numeric($providerUsage['prompt_tokens']) ? max(0, (int)$providerUsage['prompt_tokens']) : $inputBound;
    $output = isset($providerUsage['completion_tokens']) && is_numeric($providerUsage['completion_tokens']) ? max(0, (int)$providerUsage['completion_tokens']) : $maxOutput;
    // Network failures may still be billed; retain the conservative reservation when usage is unavailable.
    $usage = array('input' => $input, 'output' => $output, 'costMnt' => ai_cost($input, $output), 'estimated' => !isset($providerUsage['prompt_tokens'], $providerUsage['completion_tokens']));
    $lock = folder_storage_lock();
    try {
        $state = ai_state(); $request = $state['requests'][$requestKey]; $chat = ai_require_chat($state, $id, $folder, true);
        if (isset($request['usage'])) $state['totals']['costMnt'] -= (float)$request['usage']['costMnt'];
        $state['totals']['input'] += $input; $state['totals']['output'] += $output; $state['totals']['costMnt'] += $usage['costMnt'];
        $request['usage'] = $usage; $request['status'] = $error === '' ? 'done' : 'failed'; $request['completed'] = time();
        if ($error !== '') $request['error'] = $error;
        else {
            $chat['messages'][] = array('id' => bin2hex(random_bytes(8)), 'role' => 'user', 'content' => $message, 'time' => date('c'));
            $chat['messages'][] = array('id' => bin2hex(random_bytes(8)), 'role' => 'assistant', 'content' => cut($answer, 24000), 'time' => date('c'));
            if (count($chat['messages']) === 2 && $chat['title'] === 'Шинэ яриа') $chat['title'] = clean_str($message, 60);
            $chat['updated'] = date('c'); $chat['version']++; $state['chats'][$id] = $chat;
        }
        $state['requests'][$requestKey] = $request; ai_save($state);
        $result = array('ok' => true, 'chat' => ai_public_chat($chat), 'usage' => ai_usage($state, $folder, $config), 'csrf' => folder_csrf($folder));
    } finally { folder_storage_unlock($lock); }
    if ($error !== '') fail($error, 502, array('usage' => $result['usage'], 'requestFailed' => true));
    json_out($result);
}

function handle_ai_chat_action($action)
{
    $reads = array('ai_status', 'ai_session', 'ai_chat', 'ai_trash', 'ai_settings');
    $writes = array('ai_chat_create', 'ai_chat_update', 'ai_chat_delete', 'ai_chat_restore', 'ai_send', 'ai_settings_save');
    if (!in_array($action, $reads, true) && !in_array($action, $writes, true)) return false;
    $write = in_array($action, $writes, true); if ($write) require_post(); elseif ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('GET хүсэлт шаардлагатай.', 405);
    ai_prepare(); $config = ai_settings_config();
    if ($action === 'ai_settings') {
        if (!is_admin()) fail('Эхлээд нэвтэрнэ үү.', 401);
        $lock = folder_storage_lock(false); try { $state = ai_state(); $settings = ai_settings_public(); $settings['totals'] = $state['totals']; } finally { folder_storage_unlock($lock); }
        json_out(array_merge(array('ok' => true), $settings));
    }
    if ($action === 'ai_settings_save') {
        require_admin(); $body = body_json(); $lock = folder_storage_lock();
        try {
            $saved = ai_settings_saved();
            foreach (array('eguneApiKey' => 'clearEgune', 'anthropicApiKey' => 'clearAnthropic') as $field => $clear) {
                $key = is_string($body[$field] ?? null) ? trim($body[$field]) : '';
                if (($body[$clear] ?? false) === true) unset($saved[$field]);
                elseif ($key !== '') { if (!ai_key_valid($key)) fail('API түлхүүрийн бүтэц буруу байна.'); $saved[$field] = $key; }
            }
            foreach (array('maxOutput' => array(100, 1200), 'maxDaily' => array(1, 200), 'siteDaily' => array(1, 200)) as $field => $bounds) if (isset($body[$field])) {
                if (!is_numeric($body[$field]) || (int)$body[$field] < $bounds[0] || (int)$body[$field] > $bounds[1]) fail('AI хязгаарын утга буруу байна.'); $saved[$field] = (int)$body[$field];
            }
            if (isset($body['budgetMnt'])) { if (!is_numeric($body['budgetMnt']) || (float)$body['budgetMnt'] < 0 || (float)$body['budgetMnt'] > 1000000) fail('Төсвийн утга буруу байна.'); $saved['budgetMnt'] = (float)$body['budgetMnt']; }
            $saved['updated'] = date('c');
            if (!folder_write_private(AI_CHAT_CONFIG, $saved)) fail('Үндсэн хавтасны ai-settings.php файлд хадгалж чадсангүй. Сайтын үндсэн хавтас болон ai-settings.php файлын бичих эрхийг шалгана уу.', 500);
        } finally { folder_storage_unlock($lock); }
        json_out(array_merge(array('ok' => true), ai_settings_public()));
    }
    if ($action === 'ai_status') {
        $students = array(); foreach (folder_config() as $id => $cfg) $students[] = array('id' => $id, 'name' => $cfg['name'], 'unlocked' => folder_unlocked($id));
        json_out(array('ok' => true, 'students' => $students, 'configured' => (bool)ai_key_valid($config['key']), 'model' => 'egune-nano', 'limits' => ai_limits($config)));
    }
    $body = $write ? body_json() : $_GET; $folder = folder_id($body['folder'] ?? ''); folder_require_access($folder, $write);
    if ($action === 'ai_send') ai_send($folder, $body, $config);
    $lock = folder_storage_lock($write);
    try {
        $state = ai_state();
        if ($action === 'ai_session' || $action === 'ai_trash') {
            $chats = array(); foreach ($state['chats'] as $chat) if ($chat['folder'] === $folder && (($action === 'ai_trash') === !empty($chat['deleted']))) $chats[] = ai_chat_meta($chat);
            usort($chats, function ($a, $b) { return strcmp($b['updated'], $a['updated']); });
            $result = array('ok' => true, 'folder' => array('id' => $folder, 'name' => folder_config()[$folder]['name']), 'csrf' => folder_csrf($folder), 'chats' => $chats, 'usage' => ai_usage($state, $folder, $config), 'limits' => ai_limits($config));
        } elseif ($action === 'ai_chat') $result = array('ok' => true, 'chat' => ai_public_chat(ai_require_chat($state, $body['id'] ?? '', $folder)), 'usage' => ai_usage($state, $folder, $config), 'csrf' => folder_csrf($folder));
        else {
            if (ai_busy($state, $folder)) fail('AI хариугаа хүлээж байна. Хариу ирсний дараа өөрчлөөрэй.', 409, array('pending' => true));
            if ($action === 'ai_chat_create') {
                $count = 0; foreach ($state['chats'] as $entry) if ($entry['folder'] === $folder) $count++;
                if ($count >= 30) fail('Сэргээх боломжтой чатуудтайгаа нийлээд 30 яриа хадгалж болно. Өмнөх яриагаа үргэлжлүүлээрэй.');
                $id = bin2hex(random_bytes(16)); $title = clean_str($body['title'] ?? '', 80);
                $chat = array('id' => $id, 'folder' => $folder, 'title' => $title !== '' ? $title : 'Шинэ яриа', 'version' => 1, 'messages' => array(), 'created' => date('c'), 'updated' => date('c'), 'deleted' => null);
            } else {
                $chat = ai_require_chat($state, $body['id'] ?? '', $folder, $action === 'ai_chat_restore'); $id = $chat['id']; ai_version($chat, $body['version'] ?? null);
                if ($action === 'ai_chat_update') { $title = clean_str($body['title'] ?? '', 80); if ($title === '') fail('Ярианыхаа нэрийг бичнэ үү.'); $chat['title'] = $title; }
                elseif ($action === 'ai_chat_delete') $chat['deleted'] = date('c');
                elseif ($action === 'ai_chat_restore') { if (empty($chat['deleted'])) fail('Яриа аль хэдийн сэргэсэн байна.', 409); $chat['deleted'] = null; }
                $chat['version']++; $chat['updated'] = date('c');
            }
            $state['chats'][$id] = $chat; ai_save($state);
            $result = array('ok' => true, 'chat' => ai_public_chat($chat), 'csrf' => folder_csrf($folder), 'usage' => ai_usage($state, $folder, $config));
        }
    } finally { folder_storage_unlock($lock); }
    json_out($result);
}

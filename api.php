<?php
/*
 * 12-2 ангийн вэбийн API.  api.php?action=...
 * Нийтэд нээлттэй: status, schedule, media
 * Админ (cookie + X-CSRF толгой шаардана): бусад бүх үйлдэл
 */
define('C122', true);
require __DIR__ . '/inc/core.php';
require __DIR__ . '/inc/folders.php';
require __DIR__ . '/inc/doodle.php';
require __DIR__ . '/inc/board.php';
require __DIR__ . '/inc/study.php';
require __DIR__ . '/inc/music.php';
require __DIR__ . '/inc/ai-chat.php';
require __DIR__ . '/inc/photobooth.php';
require __DIR__ . '/inc/flashcards.php';
if (is_file(__DIR__ . '/inc/office.php')) require __DIR__ . '/inc/office.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function json_out($data, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail($msg, $code = 400, $extra = array())
{
    json_out(array_merge(array('ok' => false, 'error' => $msg), $extra), $code);
}

function require_post()
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST хүсэлт шаардлагатай', 405);
}

function require_admin()
{
    if (!is_admin()) fail('Эхлээд нэвтэрнэ үү', 401);
    if (!csrf_ok()) fail('Хүсэлт хүчингүй байна. Хуудсаа дахин ачаална уу.', 403);
}

/** Цомгийн код оруулсан хүн (эсвэл админ). */
function require_member($checkCsrf = true)
{
    if (!is_member()) fail('Цомгийн кодоо оруулна уу', 401, array('locked' => true));
    if ($checkCsrf && !csrf_ok()) fail('Хүсэлт хүчингүй байна. Хуудсаа дахин ачаална уу.', 403);
}

function body_json()
{
    $raw = file_get_contents('php://input', false, null, 0, 8 * 1024 * 1024);
    $d = json_decode((string)$raw, true);
    return is_array($d) ? $d : array();
}

function content_length()
{
    return isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : -1;
}

function status_payload()
{
    $admin = is_admin();
    $member = $admin || is_member();
    $out = array(
        'ok' => true,
        'admin' => $admin,
        'member' => $member,
        'setup' => setup_needed(),
        'csrf' => ($admin || $member) ? csrf_token() : null,
    );
    if ($member) $out['chunkMax'] = chunk_max();
    if ($admin) $out['gd'] = gd_ok();
    if ($admin) {
        $free = @disk_free_space(DB_DIR);
        $out['chunkMax'] = chunk_max();
        $out['quota'] = quota_bytes();
        $out['used'] = media_used_bytes() + folder_used_bytes(false) + doodle_used_bytes();
        $out['free'] = $free === false ? null : (int)$free;
        $out['limits'] = array(
            'post_max_size' => ini_get('post_max_size'),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'max_execution_time' => ini_get('max_execution_time'),
        );
    }
    return $out;
}

/** «Дэлгэц хуваалцах» хэсгээс авсан screenshot: эх нэр нь «screenshot-» гэж эхэлсэн зураг. */
function media_is_screenshot($it)
{
    return is_array($it) && isset($it['type'], $it['original']) && $it['type'] === 'image' && stripos((string)$it['original'], 'screenshot-') === 0;
}

ensure_dirs();
$action = isset($_GET['action']) ? (string)$_GET['action'] : '';

try {
    // Gallery and child-folder quota decisions share one mandatory storage lock.
    if (in_array($action, array('upload_init', 'upload_small', 'upload_chunk', 'upload_finish', 'upload_cancel', 'media_delete'), true)) {
        $sharedFolderStorageLock = folder_storage_lock();
    }
    if (function_exists('handle_office_action')) handle_office_action($action);
    handle_music_action($action);
    handle_ai_chat_action($action);
    handle_photobooth_action($action);
    handle_flashcards_action($action);
    handle_doodle_action($action);
    handle_board_action($action);
    handle_study_action($action);
    handle_folder_action($action);
    switch ($action) {

        /* ---------- Нэвтрэлт ---------- */

        case 'status':
            json_out(status_payload());

        case 'setup':
            require_post();
            if (!setup_needed()) fail('Нууц үг аль хэдийн үүссэн байна', 403);
            $b = body_json();
            $lk = login_lock();
            $wait = throttle_locked_for();
            if ($wait > 0) { login_unlock($lk); fail('Хэт олон удаа буруу оруулсан байна. ' . ceil($wait / 60) . ' минутын дараа дахин оролдоно уу.', 429); }
            $code = strtoupper(preg_replace('/\s+/', '', (string)($b['code'] ?? '')));
            $want = setup_code();
            if ($want === '') {
                login_unlock($lk);
                fail('database/ хавтас руу бичих эрхгүй байна. Хавтасны эрхийг шалгана уу.', 500);
            }
            if ($code === '' || !hash_equals($want, $code)) {
                throttle_fail();
                login_unlock($lk);
                fail('Тохиргооны код буруу байна. database/setup.php файлаас кодоо шалгана уу.', 403);
            }
            login_unlock($lk);
            $pw = isset($b['password']) ? (string)$b['password'] : '';
            if (strlen($pw) < MIN_PASSWORD) fail('Нууц үг хамгийн багадаа ' . MIN_PASSWORD . ' тэмдэгт байх ёстой');
            $cfg = array(
                'hash' => password_hash($pw, PASSWORD_DEFAULT),
                'secret' => bin2hex(random_bytes(32)),
                'version' => 1,
                'quotaGb' => DEFAULT_QUOTA_GB,
                'created' => date('c'),
            );
            // Хоёр хүн зэрэг үүсгэхээс сэргийлж түгжинэ
            $lock = @fopen(DB_DIR . '/.setup.lock', 'c');
            if ($lock) flock($lock, LOCK_EX);
            admin_cfg(true);
            if (!setup_needed()) {
                if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
                fail('Нууц үг аль хэдийн үүссэн байна', 403);
            }
            $okw = write_guarded(ADMIN_FILE, $cfg);
            if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
            if (!$okw) fail('database/ хавтас руу бичих эрхгүй байна', 500);
            @unlink(SETUP_FILE);
            login_now();
            json_out(status_payload());

        case 'login':
            require_post();
            if (setup_needed()) fail('Эхлээд нууц үг үүсгэнэ үү', 409, array('setup' => true));
            $b = body_json();
            $pw = isset($b['password']) ? (string)$b['password'] : '';
            // Шалгалт + тоолуурыг нэг түгжээн дотор хийж, зэрэг илгээсэн оролдлогыг зөв тоолно
            $lk = login_lock();
            $wait = throttle_locked_for();
            if ($wait > 0) {
                login_unlock($lk);
                fail('Хэт олон удаа буруу оруулсан байна. ' . ceil($wait / 60) . ' минутын дараа дахин оролдоно уу.', 429);
            }
            $cfg = admin_cfg();
            if (!password_verify($pw, $cfg['hash'])) {
                throttle_fail();
                login_unlock($lk);
                usleep(400000);
                fail('Нууц үг буруу байна', 401);
            }
            throttle_clear();
            login_unlock($lk);
            login_now();
            json_out(status_payload());

        case 'logout':
            require_post();
            if (is_admin() && !csrf_ok()) fail('Хүсэлт хүчингүй байна', 403);
            set_auth_cookie('', time() - 3600);
            json_out(status_payload());

        /* ---------- Цомгийн код ---------- */

        case 'album_unlock':
            require_post();
            $b = body_json();
            $pin = preg_replace('/\D+/', '', (string)($b['pin'] ?? ''));
            $lk = login_lock();
            $wait = throttle_locked_for('pin');
            if ($wait > 0) {
                login_unlock($lk);
                fail('Хэт олон удаа буруу оруулсан байна. ' . ceil($wait / 60) . ' минутын дараа дахин оролдоно уу.', 429);
            }
            if (!album_pin_ok($pin)) {
                throttle_fail('pin');
                login_unlock($lk);
                usleep(300000);
                fail('Код буруу байна', 400, array('wrongPin' => true));
            }
            throttle_clear('pin');
            login_unlock($lk);
            if (site_secret() === '') fail('database/ хавтас руу бичих эрхгүй байна', 500);
            album_unlock_now();
            json_out(status_payload());

        case 'album_lock':
            require_post();
            if (cookie_val(ALBUM_COOKIE) !== '' && !csrf_ok()) fail('Хүсэлт хүчингүй байна', 403);
            set_cookie_value(ALBUM_COOKIE, '', time() - 3600);
            json_out(status_payload());

        case 'album_pin':
            require_post();
            require_admin();
            $b = body_json();
            $pin = (string)($b['pin'] ?? '');
            if (!preg_match('/^\d{4}$/', $pin)) fail('Код яг 4 оронтой тоо байх ёстой');
            $c = album_cfg();
            $c['hash'] = password_hash($pin, PASSWORD_DEFAULT);
            $c['version'] = (int)($c['version'] ?? 1) + 1;   // бүх хүний цомгийн нэвтрэлт дуусна
            $c['changed'] = date('c');
            if (!write_guarded(ALBUM_FILE, $c)) fail('Хадгалж чадсангүй', 500);
            json_out(status_payload());

        case 'password':
            require_post();
            require_admin();
            $b = body_json();
            $cfg = admin_cfg();
            // 401 биш: нэвтэрсэн төлөв хэвээр тул клиент CSRF-ээ алдах ёсгүй
            if (!password_verify((string)($b['current'] ?? ''), $cfg['hash'])) fail('Одоогийн нууц үг буруу байна', 400);
            $next = (string)($b['next'] ?? '');
            if (strlen($next) < MIN_PASSWORD) fail('Шинэ нууц үг хамгийн багадаа ' . MIN_PASSWORD . ' тэмдэгт байх ёстой');
            $cfg['hash'] = password_hash($next, PASSWORD_DEFAULT);
            $cfg['version'] = (int)$cfg['version'] + 1;   // бусад төхөөрөмжөөс гаргана
            if (!write_guarded(ADMIN_FILE, $cfg)) fail('Хадгалж чадсангүй', 500);
            login_now();
            json_out(status_payload());

        case 'settings':
            require_post();
            require_admin();
            $b = body_json();
            $cfg = admin_cfg();
            if (isset($b['quotaGb'])) {
                $q = (float)$b['quotaGb'];
                if ($q < 1 || $q > 100000) fail('Багтаамж 1–100000 ГБ-ын хооронд байх ёстой');
                $cfg['quotaGb'] = $q;
            }
            if (!write_guarded(ADMIN_FILE, $cfg)) fail('Хадгалж чадсангүй', 500);
            admin_cfg(true);
            json_out(status_payload());

        /* ---------- Хуваарь ---------- */

        case 'schedule':
            json_out(array('ok' => true, 'schedule' => load_schedule(), 'pdf' => schedule_pdf_info()));

        case 'schedule_save':
            require_post();
            require_admin();
            $b = body_json();
            if (!isset($b['schedule']) || !is_array($b['schedule'])) fail('Хуваарийн өгөгдөл алга');
            $saved = save_schedule($b['schedule']);
            if (!$saved) fail('database/datas.json файлд бичиж чадсангүй', 500);
            json_out(array('ok' => true, 'schedule' => $saved));

        case 'schedule_clear':
            require_post();
            require_admin();
            $cur = load_schedule();
            $cur['lessons'] = array();
            $cur['source'] = null;
            $saved = save_schedule($cur);
            if (!$saved) fail('Устгаж чадсангүй', 500);
            json_out(array('ok' => true, 'schedule' => $saved));

        case 'schedule_backups':
            require_admin();
            json_out(array('ok' => true, 'backups' => list_backups()));

        case 'schedule_restore':
            require_post();
            require_admin();
            $b = body_json();
            $name = (string)($b['name'] ?? '');
            if (!preg_match('/^datas-\d{8}-\d{6}-[0-9a-f]{4}\.json$/', $name) || !is_file(BACKUP_DIR . '/' . $name)) fail('Нөөц олдсонгүй', 404);
            $d = read_json(BACKUP_DIR . '/' . $name, null);
            if (!$d) fail('Нөөц файл эвдэрсэн байна');
            $saved = save_schedule($d);
            if (!$saved) fail('Сэргээж чадсангүй', 500);
            json_out(array('ok' => true, 'schedule' => $saved));

        case 'schedule_pdf':
            require_post();
            require_admin();
            $len = content_length();
            if ($len <= 0) fail('Файл хоосон байна');
            if ($len > 40 * 1024 * 1024) fail('PDF файл 40 МБ-аас их байна', 413);
            $in = fopen('php://input', 'rb');
            $head = fread($in, 5);
            if ($head !== '%PDF-') fail('Зөвхөн PDF файл оруулна уу', 415);
            $tmp = SCHEDULE_PDF . '.' . bin2hex(random_bytes(4)) . '.tmp';
            $out = fopen($tmp, 'wb');
            fwrite($out, $head);
            stream_copy_to_stream($in, $out);
            fclose($out);
            fclose($in);
            if (filesize($tmp) !== $len || !@rename($tmp, SCHEDULE_PDF)) {
                @unlink($tmp);
                fail('PDF хадгалж чадсангүй', 500);
            }
            json_out(array('ok' => true, 'pdf' => schedule_pdf_info()));

        case 'schedule_pdf_delete':
            require_post();
            require_admin();
            @unlink(SCHEDULE_PDF);
            json_out(array('ok' => true, 'pdf' => null));

        /* ---------- Зургийн цомог ---------- */

        case 'media':
            require_member(false);
            $all = media_list();
            $counts = array('all' => count($all), 'image' => 0, 'video' => 0, 'screenshot' => 0);
            $bytes = 0;
            foreach ($all as $it) {
                $counts[$it['type']]++;
                if (media_is_screenshot($it)) $counts['screenshot']++;
                $bytes += $it['size'];
            }
            $type = isset($_GET['type']) ? (string)$_GET['type'] : 'all';
            if ($type === 'image' || $type === 'video') {
                $all = array_values(array_filter($all, function ($it) use ($type) { return $it['type'] === $type; }));
            } elseif ($type === 'screenshot') {   // Бүгд, Зураг хэсэгт мөн харагдсан хэвээр
                $all = array_values(array_filter($all, 'media_is_screenshot'));
            }
            if (!empty($_GET['missing'])) {   // жижиг зураггүйг нь л
                $all = array_values(array_filter($all, function ($it) { return !$it['thumb']; }));
            }
            $offset = max(0, (int)($_GET['offset'] ?? 0));
            $limit = min(200, max(1, (int)($_GET['limit'] ?? 60)));
            json_out(array(
                'ok' => true,
                'items' => array_slice($all, $offset, $limit),
                'total' => count($all),
                'counts' => $counts,
                'bytes' => $bytes,
            ));

        case 'upload_init':
            require_post();
            require_member();
            $b = body_json();
            $name = clean_str($b['name'] ?? '', 200);
            $size = isset($b['size']) && is_numeric($b['size']) ? (int)$b['size'] : 0;
            $lm = clean_str($b['lastModified'] ?? '', 30);
            $ext = media_ext($name);
            if ($name === '' || $size <= 0) fail('Файлын мэдээлэл буруу байна');
            if ($ext === '') fail('Зөвхөн зураг эсвэл видео файл байршуулна (' . $name . ')', 415);
            cleanup_stale_uploads();
            $id = upload_id_for($name, $size, $lm);
            $done = upload_done_name($id);
            if ($done !== '') {
                // Өмнө нь дууссан (хариу нь алдагдсан) байршуулалт — дахин илгээхгүй
                json_out(array('ok' => true, 'id' => $id, 'received' => $size, 'size' => $size, 'ranges' => array(array(0, $size)), 'chunkMax' => chunk_max(), 'resumed' => true, 'item' => upload_item($done)));
            }
            $metaF = upload_meta_file($id);
            $meta = read_guarded($metaF);
            if ($meta && empty($meta['final']) && (int)$meta['size'] === $size) {
                $ranges = upload_ranges($meta, $id);
                json_out(array('ok' => true, 'id' => $id, 'received' => ranges_total($ranges), 'size' => $size, 'ranges' => $ranges, 'chunkMax' => chunk_max(), 'resumed' => ranges_total($ranges) > 0));
            }
            if (media_used_bytes() + tmp_reserved_bytes($id) + folder_used_bytes() + doodle_used_bytes() + $size > quota_bytes()) {
                fail('Хадгалах багтаамж хүрэлцэхгүй байна (' . round(quota_bytes() / 1073741824) . ' ГБ хязгаар)', 507);
            }
            $free = @disk_free_space(TMP_DIR);
            if ($free !== false && $free < $size + folder_remaining_bytes() + 200 * 1024 * 1024) fail('Серверийн дискэнд хангалттай зай алга', 507);
            if (!write_guarded($metaF, array('name' => $name, 'size' => $size, 'ext' => $ext, 'lastModified' => $lm, 'created' => time(), 'ranges' => array()))) {
                fail('database/tmp хавтас руу бичих эрхгүй байна', 500);
            }
            @touch(upload_part_file($id));
            json_out(array('ok' => true, 'id' => $id, 'received' => 0, 'size' => $size, 'ranges' => array(), 'chunkMax' => chunk_max(), 'resumed' => false));

        /* Жижиг файлыг (≤ chunkMax) нэг хүсэлтээр: init + chunk + finish-ийн оронд */
        case 'upload_small':
            require_post();
            require_member();
            $name = clean_str($_GET['name'] ?? '', 200);
            $lm = clean_str($_GET['lm'] ?? '', 30);
            $sizeRaw = (string)($_GET['size'] ?? '');
            $ext = media_ext($name);
            $len = content_length();
            if ($name === '' || !ctype_digit($sizeRaw) || (int)$sizeRaw <= 0) fail('Файлын мэдээлэл буруу байна');
            if ($ext === '') fail('Зөвхөн зураг эсвэл видео файл байршуулна (' . $name . ')', 415);
            $size = (int)$sizeRaw;
            if ($len !== $size) fail('Файлын хэмжээ таарахгүй байна');
            $post = ini_bytes(ini_get('post_max_size'));
            if ($len > chunk_max() || ($post > 0 && $len > $post)) fail('Файл хэт том байна', 413, array('chunkMax' => chunk_max()));
            $id = upload_id_for($name, $size, $lm);
            $done = upload_done_name($id);
            if ($done !== '') json_out(array('ok' => true, 'item' => upload_item($done), 'existing' => true));
            cleanup_stale_uploads();
            if (media_used_bytes() + tmp_reserved_bytes() + folder_used_bytes() + doodle_used_bytes() + $size > quota_bytes()) {
                fail('Хадгалах багтаамж хүрэлцэхгүй байна (' . round(quota_bytes() / 1073741824) . ' ГБ хязгаар)', 507);
            }
            $free = @disk_free_space(TMP_DIR);
            if ($free !== false && $free < $size + folder_remaining_bytes() + 50 * 1024 * 1024) fail('Серверийн дискэнд хангалттай зай алга', 507);
            $tmp = TMP_DIR . '/' . $id . '.' . bin2hex(random_bytes(4)) . '.small';
            $in = fopen('php://input', 'rb');
            $out = @fopen($tmp, 'wb');
            if (!$out) fail('database/tmp хавтас руу бичих эрхгүй байна', 500);
            $written = stream_copy_to_stream($in, $out);
            fclose($in);
            fclose($out);
            if ($written !== $size) {
                @unlink($tmp);
                fail('Файл бүрэн ирсэнгүй', 400);
            }
            $lk = @fopen(upload_lock_file($id), 'c');
            if ($lk) flock($lk, LOCK_EX);
            $done = upload_done_name($id);   // зэрэг давтан илгээсэн бол
            $final = $done !== '' ? $done : finalize_upload($id, $tmp, $name, $ext, $size);
            if ($lk) { flock($lk, LOCK_UN); fclose($lk); }
            @unlink(upload_lock_file($id));
            if ($done !== '') @unlink($tmp);
            if ($final === '') { @unlink($tmp); fail('database/photos руу зөөж чадсангүй', 500); }
            json_out(array('ok' => true, 'item' => upload_item($final), 'existing' => $done !== ''));

        case 'upload_status':
            require_member();
            $id = valid_upload_id($_GET['id'] ?? '');
            if ($id && ($done = upload_done_name($id)) !== '') {
                $sz = (int)@filesize(PHOTOS_DIR . '/' . $done);
                json_out(array('ok' => true, 'received' => $sz, 'size' => $sz, 'ranges' => array(array(0, $sz)), 'done' => true));
            }
            $meta = $id ? read_guarded(upload_meta_file($id)) : null;
            if (!$meta) fail('Байршуулалт олдсонгүй', 404);
            $ranges = upload_ranges($meta, $id);
            json_out(array('ok' => true, 'received' => ranges_total($ranges), 'size' => (int)$meta['size'], 'ranges' => $ranges));

        /*
         * Нэг файлын хэсгүүд зэрэг (параллель), ямар ч дарааллаар ирж болно.
         * Өгөгдлийг offset дээр нь бичээд, хүлээн авсан мужийг түгжээн дор тэмдэглэнэ.
         */
        case 'upload_chunk':
            require_post();
            require_member();
            $id = valid_upload_id($_GET['id'] ?? '');
            $metaF = $id ? upload_meta_file($id) : '';
            $meta = $id ? read_guarded($metaF) : null;
            if (!$meta || !empty($meta['final'])) fail('Байршуулалт олдсонгүй. Дахин эхлүүлнэ үү.', 404);
            $offRaw = (string)($_GET['offset'] ?? '');
            if (!ctype_digit($offRaw)) fail('offset буруу');
            $offset = (int)$offRaw;
            $len = content_length();
            if ($len <= 0) fail('Хоосон хэсэг ирлээ');
            $post = ini_bytes(ini_get('post_max_size'));
            if ($post > 0 && $len > $post) fail('Хэсэг хэт том байна', 413, array('chunkMax' => chunk_max()));
            if ($offset + $len > (int)$meta['size']) fail('Файлын хэмжээ таарахгүй байна');
            $free = @disk_free_space(TMP_DIR);
            if ($free !== false && $free < $len + folder_remaining_bytes() + 50 * 1024 * 1024) fail('Серверийн дискэнд зай дууссан байна', 507);
            clearstatcache(true, upload_part_file($id));
            $grow = max(0, $offset + $len - (int)@filesize(upload_part_file($id)));
            if ($grow > 0 && media_used_bytes() + tmp_reserved_bytes() + folder_used_bytes() + doodle_used_bytes() + $grow > quota_bytes()) {
                fail('Хадгалах багтаамж хүрэлцэхгүй байна (' . round(quota_bytes() / 1073741824) . ' ГБ хязгаар)', 507);
            }

            $fp = @fopen(upload_part_file($id), 'c+b');
            if (!$fp) fail('Түр файл нээж чадсангүй', 500);
            fseek($fp, $offset);
            $in = fopen('php://input', 'rb');
            $written = stream_copy_to_stream($in, $fp);
            fclose($in);
            fflush($fp);
            fclose($fp);
            if ($written !== $len) fail('Хэсэг бүрэн ирсэнгүй', 400);

            $lk = @fopen(upload_lock_file($id), 'c');
            if ($lk) flock($lk, LOCK_EX);
            $meta = read_guarded($metaF);
            if (!$meta) {
                if ($lk) { flock($lk, LOCK_UN); fclose($lk); }
                fail('Байршуулалт цуцлагдсан байна', 404);
            }
            $ranges = ranges_add(upload_ranges($meta, $id), $offset, $offset + $len);
            $meta['ranges'] = $ranges;
            write_guarded($metaF, $meta);
            if ($lk) { flock($lk, LOCK_UN); fclose($lk); }
            json_out(array('ok' => true, 'received' => ranges_total($ranges)));

        case 'upload_finish':
            require_post();
            require_member();
            $b = body_json();
            $id = valid_upload_id($b['id'] ?? '');
            if (!$id) fail('Байршуулалт олдсонгүй', 404);
            $lk = @fopen(upload_lock_file($id), 'c');
            if ($lk) flock($lk, LOCK_EX);
            $release = function () use ($lk) { if ($lk) { flock($lk, LOCK_UN); fclose($lk); } };
            $done = upload_done_name($id);
            if ($done !== '') { $release(); @unlink(upload_lock_file($id)); json_out(array('ok' => true, 'item' => upload_item($done))); }   // давтан дуудсан
            $metaF = upload_meta_file($id);
            $meta = read_guarded($metaF);
            if (!$meta) { $release(); fail('Байршуулалт олдсонгүй', 404); }
            $ranges = upload_ranges($meta, $id);
            $size = (int)$meta['size'];
            if (count($ranges) !== 1 || $ranges[0][0] !== 0 || $ranges[0][1] !== $size) {
                $release();
                fail('Файл бүрэн ирээгүй байна', 409, array('received' => ranges_total($ranges), 'ranges' => $ranges));
            }
            $final = finalize_upload($id, upload_part_file($id), $meta['name'], $meta['ext'], $size);
            if ($final === '') { $release(); fail('database/photos руу зөөж чадсангүй', 500); }
            @unlink($metaF);
            $release();
            @unlink(upload_lock_file($id));
            json_out(array('ok' => true, 'item' => upload_item($final)));

        case 'upload_cancel':
            require_post();
            require_member();
            $b = body_json();
            $id = valid_upload_id($b['id'] ?? '');
            if ($id && upload_done_name($id) === '') {
                @unlink(upload_part_file($id));
                @unlink(upload_meta_file($id));
                @unlink(upload_lock_file($id));
            }
            json_out(array('ok' => true));

        case 'media_thumb':
            require_post();
            require_member();
            $name = valid_media_name($_GET['name'] ?? '');
            if ($name === '') fail('Файл олдсонгүй', 404);
            // Гишүүн зөвхөн өөрийн байршуулсан, жижиг зураггүй файлд (байршуулалтын хариунд ирсэн түлхүүрээр) зураг тавина
            if (!is_admin() && (thumb_file($name) !== '' || !hash_equals(thumb_key($name), (string)($_GET['key'] ?? '')))) {
                fail('Жижиг зураг солих эрхгүй', 403);
            }
            $len = content_length();
            if ($len <= 0 || $len > 5 * 1024 * 1024) fail('Жижиг зураг буруу хэмжээтэй', 413);
            $data = file_get_contents('php://input', false, null, 0, 5 * 1024 * 1024);
            if (substr($data, 0, 3) === "\xFF\xD8\xFF") $te = 'jpg';
            elseif (substr($data, 0, 4) === 'RIFF' && substr($data, 8, 4) === 'WEBP') $te = 'webp';
            elseif (substr($data, 0, 8) === "\x89PNG\r\n\x1a\n") $te = 'png';
            else fail('Жижиг зургийн формат буруу', 415);
            foreach (array('webp', 'jpg', 'png') as $e) @unlink(THUMBS_DIR . '/' . $name . '.' . $e);
            if (!write_file_atomic(THUMBS_DIR . '/' . $name . '.' . $te, $data)) fail('Хадгалж чадсангүй', 500);
            $side = media_sidecar($name);
            $w = (int)($_GET['w'] ?? 0);
            $h = (int)($_GET['h'] ?? 0);
            $dur = (float)($_GET['duration'] ?? 0);
            if ($w > 0 && $w < 100000) $side['w'] = $w;
            if ($h > 0 && $h < 100000) $side['h'] = $h;
            if ($dur > 0 && $dur < 1000000) $side['duration'] = round($dur, 2);
            write_json(THUMBS_DIR . '/' . $name . '.json', $side);
            media_index_put($name);
            json_out(array('ok' => true, 'item' => media_item($name)));

        /* Жижиг зураггүй хуучин зураг: серверт үүсгээд тэр рүү, чадахгүй бол эх файл руу чиглүүлнэ */
        case 'thumb':
            require_member(false);
            $name = valid_media_name($_GET['name'] ?? '');
            if ($name === '') { http_response_code(404); exit; }
            $it = thumb_file($name) !== '' ? media_item($name) : server_thumb_locked($name);
            header('Cache-Control: no-store');
            header('Location: ' . ($it && $it['thumb'] ? $it['thumb'] : PHOTOS_URL . rawurlencode($name)), true, 302);
            exit;

        /* Удирдлагын «бүх хуучин зурагт жижиг зураг үүсгэх» */
        case 'thumb_gen':
            require_post();
            require_admin();
            $b = body_json();
            $name = valid_media_name($b['name'] ?? '');
            if ($name === '') fail('Файл олдсонгүй', 404);
            $it = server_thumb_locked($name);
            json_out(array('ok' => true, 'done' => (bool)($it && $it['thumb']), 'item' => $it ?: media_item($name)));

        case 'media_delete':
            require_post();
            require_admin();
            $b = body_json();
            $names = isset($b['names']) && is_array($b['names']) ? array_slice($b['names'], 0, 1000) : array();
            $deleted = array();
            foreach ($names as $n) {
                $n = valid_media_name(is_string($n) ? $n : '');
                if ($n === '') continue;
                if (@unlink(PHOTOS_DIR . '/' . $n)) {
                    foreach (array('webp', 'jpg', 'png', 'json') as $e) @unlink(THUMBS_DIR . '/' . $n . '.' . $e);
                    $deleted[] = $n;
                }
            }
            if ($deleted) {
                $deleted = array_merge($deleted, photobooth_album_deleted($deleted));
                media_index_remove($deleted);
            }
            json_out(array('ok' => true, 'deleted' => $deleted));

        default:
            fail('Үйлдэл олдсонгүй', 404);
    }
} catch (Throwable $e) {
    error_log('[12-2 api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    fail('Серверт алдаа гарлаа', 500);
}

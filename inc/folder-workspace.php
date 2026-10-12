<?php
/* Tree organization, guarded in-place edits, and revocable read-only bearer shares. */
if (!defined('C122')) { http_response_code(404); exit; }

function folder_file_version($file)
{
    // Older installations get a deterministic revision without modifying their files.
    return (string)($file['version'] ?? hash('sha256', $file['id'] . '|' . $file['size'] . '|' . $file['time'] . '|' . $file['name']));
}

function folder_parent($bucket, $value)
{
    if ($value === '') return '';
    $id = folder_token_id($value);
    if ($id === '' || !isset($bucket['directories'][$id])) fail('Дэд хавтас олдсонгүй', 404);
    return $id;
}

function folder_directory_name($value)
{
    $name = clean_str($value, 120);
    if ($name === '' || $name === '.' || $name === '..' || strpos($name, '/') !== false || strpos($name, '\\') !== false) fail('Хавтасны нэр буруу байна');
    return $name;
}

function folder_metadata($body)
{
    return array('description' => clean_str($body['description'] ?? '', 500), 'icon' => clean_str($body['icon'] ?? '📁', 16) ?: '📁');
}

function folder_directory_object($directory)
{
    return array('id' => $directory['id'], 'name' => $directory['name'], 'parent' => (string)($directory['parent'] ?? ''), 'description' => (string)($directory['description'] ?? ''), 'icon' => (string)($directory['icon'] ?? '📁'), 'time' => (string)($directory['time'] ?? ''));
}

function folder_child_directories($bucket, $parent)
{
    $dirs = array();
    foreach ($bucket['directories'] as $dir) if (($dir['parent'] ?? '') === $parent) $dirs[] = folder_directory_object($dir);
    usort($dirs, function ($a, $b) { return strnatcasecmp($a['name'], $b['name']); });
    return $dirs;
}

function folder_breadcrumbs($bucket, $parent, $rootName, $scopeRoot = '')
{
    $path = array(); $seen = array();
    while ($parent !== $scopeRoot) {
        if ($parent === '' || isset($seen[$parent]) || !isset($bucket['directories'][$parent]) || count($seen) >= 32) fail('Хавтасны зам буруу байна', 404);
        $seen[$parent] = true; $dir = $bucket['directories'][$parent];
        array_unshift($path, array('id' => $parent, 'name' => $dir['name']));
        $parent = $dir['parent'] ?? '';
    }
    array_unshift($path, array('id' => '', 'name' => $rootName));
    return $path;
}

function folder_in_subtree($bucket, $parent, $scopeRoot)
{
    $seen = array();
    while (true) {
        if ($parent === $scopeRoot) return true;
        if ($parent === '' || isset($seen[$parent]) || !isset($bucket['directories'][$parent]) || count($seen) >= 32) return false;
        $seen[$parent] = true; $parent = $bucket['directories'][$parent]['parent'] ?? '';
    }
}

function folder_check_revision($file, $version)
{
    if (!is_string($version) || $version === '' || !hash_equals(folder_file_version($file), $version)) fail('Файл өөр цонхонд шинэчлэгдсэн байна. Шинэ хувилбарыг нээгээд дахин оролдоно уу.', 409, array('conflict' => true));
}

/** Internal office/editor helpers. Callers MUST hold folder_storage_lock(). */
function folder_candidate_size($guardedTemp)
{
    $fp = @fopen($guardedTemp, 'rb');
    if (!$fp || fread($fp, strlen(FOLDER_GUARD)) !== FOLDER_GUARD) { if ($fp) fclose($fp); throw new RuntimeException('Invalid guarded output', 400); }
    $stat = fstat($fp); fclose($fp);
    $size = $stat ? (int)$stat['size'] - strlen(FOLDER_GUARD) : -1;
    if ($size < 0 || $size > FOLDER_MAX_FILE) throw new RuntimeException('Output exceeds file size limit', 413);
    return $size;
}

function folder_candidate_quota($state, $folder, $size, $replacedBytes = 0)
{
    $usage = folder_usage($state, $folder); $delta = $size - $replacedBytes;
    if ($usage['folder'] + $delta > FOLDER_QUOTA || $usage['global'] + $delta > FOLDER_GLOBAL_QUOTA || media_used_bytes() + tmp_reserved_bytes() + $usage['global'] + (function_exists('doodle_used_bytes') ? doodle_used_bytes() : 0) + $delta > quota_bytes()) throw new RuntimeException('Folder storage quota exceeded', 507);
    $free = @disk_free_space(FOLDER_DIR);
    if ($free !== false && $free < $usage['remaining'] + FOLDER_DISK_MARGIN) throw new RuntimeException('Insufficient disk space', 507);
}

function folder_detached_index($value)
{
    if (!is_array($value)) return $value;
    $copy = array();
    // Callers may hold bucket references. A plain array copy would retain those
    // references and could not roll metadata back after an index write failure.
    foreach ($value as $key => $item) $copy[$key] = folder_detached_index($item);
    return $copy;
}

function folder_replace_blob(&$state, $folder, $fileId, $guardedTemp, $version, $beforeSave = null)
{
    folder_bucket($state, $folder);
    if (folder_token_id($fileId) === '' || !isset($state['folders'][$folder]['files'][$fileId])) throw new RuntimeException('File no longer exists', 404);
    $file = $state['folders'][$folder]['files'][$fileId];
    if (!is_string($version) || $version === '' || !hash_equals(folder_file_version($file), $version)) throw new RuntimeException('File was changed by another editor', 409);
    $size = folder_candidate_size($guardedTemp); folder_candidate_quota($state, $folder, $size, (int)$file['size']);
    list($mime, $preview) = folder_detect_preview($guardedTemp, $file['name']);
    $file['size'] = $size; $file['mime'] = $mime; $file['preview'] = $preview; $file['time'] = date('c'); $file['version'] = bin2hex(random_bytes(16));
    $path = folder_blob($folder, $fileId); $backup = $path . '.' . bin2hex(random_bytes(12)) . '.backup.php';
    if (!@rename($path, $backup)) throw new RuntimeException('Cannot preserve original file', 500);
    if (!@rename($guardedTemp, $path)) { @rename($backup, $path); throw new RuntimeException('Cannot replace guarded file', 500); }
    $before = folder_detached_index($state); $state['folders'][$folder]['files'][$fileId] = $file;
    try {
        if ($beforeSave !== null) $beforeSave($state, folder_public_file($folder, $file));
        folder_save($state);
    } catch (Throwable $e) { $state = $before; @unlink($path); @rename($backup, $path); throw $e; }
    @unlink($backup);
    return folder_public_file($folder, $file);
}

function folder_add_blob(&$state, $folder, $parent, $name, $guardedTemp, $beforeSave = null)
{
    folder_bucket($state, $folder); $bucket =& $state['folders'][$folder];
    if ($parent !== '' && (folder_token_id($parent) === '' || !isset($bucket['directories'][$parent]))) throw new RuntimeException('Parent folder no longer exists', 404);
    $name = folder_filename($name); $size = folder_candidate_size($guardedTemp); folder_candidate_quota($state, $folder, $size);
    $pending = 0; foreach ($bucket['uploads'] as $upload) if (empty($upload['done'])) $pending++;
    if (count($bucket['files']) + $pending >= 5000) throw new RuntimeException('Folder file count exceeded', 507);
    list($mime, $preview) = folder_detect_preview($guardedTemp, $name);
    $id = bin2hex(random_bytes(16)); $path = folder_blob($folder, $id);
    $file = array('id' => $id, 'name' => $name, 'size' => $size, 'mime' => $mime, 'preview' => $preview, 'time' => date('c'), 'parent' => $parent, 'version' => bin2hex(random_bytes(16)));
    if (!@rename($guardedTemp, $path)) throw new RuntimeException('Cannot save guarded output', 500);
    $before = folder_detached_index($state); $bucket['files'][$id] = $file;
    try {
        if ($beforeSave !== null) $beforeSave($state, folder_public_file($folder, $file));
        folder_save($state);
    } catch (Throwable $e) { $state = $before; @rename($path, $guardedTemp); throw $e; }
    return folder_public_file($folder, $file);
}

function folder_share_scope($bucket, $body)
{
    $target = $body['target'] ?? 'folder';
    if ($target === 'file') {
        $file = folder_token_id($body['file'] ?? '');
        if ($file === '' || !isset($bucket['files'][$file])) fail('Файл олдсонгүй', 404);
        return array('target' => 'file', 'file' => $file, 'directory' => '');
    }
    if ($target !== 'folder') fail('Хуваалцах сонголт буруу байна');
    return array('target' => 'folder', 'file' => '', 'directory' => folder_parent($bucket, $body['directory'] ?? ''));
}

function folder_share_same($share, $folder, $scope)
{
    return ($share['folder'] ?? '') === $folder && ($share['target'] ?? '') === $scope['target'] && ($share['file'] ?? '') === $scope['file'] && ($share['directory'] ?? '') === $scope['directory'];
}

function folder_share_lookup($state, $token)
{
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) fail('Хуваалцах холбоос хүчингүй эсвэл устгагдсан байна', 404);
    $hash = hash('sha256', $token);
    if (!isset($state['shares'][$hash])) fail('Хуваалцах холбоос хүчингүй эсвэл устгагдсан байна', 404);
    $share = $state['shares'][$hash];
    if (!isset($state['folders'][$share['folder']])) fail('Хуваалцах холбоос хүчингүй эсвэл устгагдсан байна', 404);
    $bucket = $state['folders'][$share['folder']];
    if ($share['target'] === 'file' && !isset($bucket['files'][$share['file']])) fail('Хуваалцсан файл устгагдсан байна', 404);
    if ($share['target'] === 'folder' && $share['directory'] !== '' && !isset($bucket['directories'][$share['directory']])) fail('Хуваалцсан хавтас устгагдсан байна', 404);
    return $share;
}

function folder_share_caption($bucket, $share)
{
    if ($share['target'] === 'file') return array('name' => $bucket['files'][$share['file']]['name'], 'description' => '', 'icon' => '📄');
    if ($share['directory'] !== '') { $dir = $bucket['directories'][$share['directory']]; return array('name' => $dir['name'], 'description' => $dir['description'] ?? '', 'icon' => $dir['icon'] ?? '📁'); }
    $root = folder_object($share['folder']); unset($root['id']); return $root;
}

function folder_share_contains($bucket, $share, $fileId)
{
    if (!isset($bucket['files'][$fileId])) return false;
    return $share['target'] === 'file' ? $share['file'] === $fileId : folder_in_subtree($bucket, $bucket['files'][$fileId]['parent'] ?? '', $share['directory']);
}

function folder_share_upload_token($body)
{
    $token = $_SERVER['HTTP_X_SHARE_TOKEN'] ?? '';
    $supplied = $body['token'] ?? $token;
    // Custom bearer header prevents form and cross-origin simple-request mutations.
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token) || !is_string($supplied) || !hash_equals($token, $supplied)) fail('Хуваалцах хүсэлт хүчингүй байна', 403);
    return $token;
}

function folder_share_require_upload($share)
{
    if ($share['target'] !== 'folder' || empty($share['allowUpload'])) fail('Энэ холбоос файл нэмэх эрхгүй байна', 403);
}

function folder_share_public_file($token, $file)
{
    $query = 'api.php?action=share_file&token=' . rawurlencode($token) . '&file=' . rawurlencode($file['id']);
    return array('id' => $file['id'], 'name' => $file['name'], 'size' => (int)$file['size'], 'mime' => $file['mime'], 'preview' => $file['preview'], 'time' => $file['time'], 'parent' => (string)($file['parent'] ?? ''), 'version' => folder_file_version($file), 'url' => $query, 'downloadUrl' => $query . '&download=1');
}

function handle_folder_share_read($action)
{
    if (!in_array($_SERVER['REQUEST_METHOD'], array('GET', 'HEAD'), true)) fail('GET хүсэлт шаардлагатай', 405);
    $token = $_GET['token'] ?? '';
    $lock = folder_storage_lock(false); $handles = array();
    try {
        $state = folder_state(); $share = folder_share_lookup($state, $token); $id = $share['folder'];
        folder_bucket($state, $id); $bucket = $state['folders'][$id]; $caption = folder_share_caption($bucket, $share);
        if ($action === 'share_info') {
            $files = array(); $directories = array(); $currentDirectory = null; $breadcrumbs = array(array('id' => '', 'name' => $caption['name']));
            $parent = $_GET['parent'] ?? '';
            if ($share['target'] === 'file') {
                if ($parent !== '') fail('Дэд хавтас олдсонгүй', 404);
                $files[] = folder_share_public_file($token, $bucket['files'][$share['file']]);
            } else {
                $scopeRoot = $share['directory']; $actualParent = $parent === '' ? $scopeRoot : folder_parent($bucket, $parent);
                if (!folder_in_subtree($bucket, $actualParent, $scopeRoot)) fail('Дэд хавтас олдсонгүй', 404);
                foreach ($bucket['files'] as $file) if (($file['parent'] ?? '') === $actualParent) $files[] = folder_share_public_file($token, $file);
                $directories = folder_child_directories($bucket, $actualParent);
                $breadcrumbs = folder_breadcrumbs($bucket, $actualParent, $caption['name'], $scopeRoot);
                $parent = $actualParent === $scopeRoot ? '' : $actualParent;
                if ($parent !== '') $currentDirectory = folder_directory_object($bucket['directories'][$actualParent]);
            }
            usort($files, function ($a, $b) { return strcmp($b['time'], $a['time']) ?: strcmp($a['name'], $b['name']); });
            folder_storage_unlock($lock); $lock = null;
            json_out(array('ok' => true, 'folder' => $caption, 'files' => $files, 'directories' => $directories, 'breadcrumbs' => $breadcrumbs, 'parent' => $parent, 'currentDirectory' => $currentDirectory, 'readonly' => true, 'allowUpload' => !empty($share['allowUpload']) && $share['target'] === 'folder', 'scope' => $share['target'], 'limits' => folder_limits()));
        }
        if ($action === 'share_file') {
            $fileId = folder_token_id($_GET['file'] ?? '');
            if ($fileId === '' || !folder_share_contains($bucket, $share, $fileId)) fail('Файл олдсонгүй', 404);
            $file = $bucket['files'][$fileId]; $fp = folder_open_blob($id, $file);
            folder_storage_unlock($lock); $lock = null; folder_stream_file($id, $file, $fp);
        }
        $raw = isset($_GET['files']) && is_string($_GET['files']) ? $_GET['files'] : '';
        $ids = array_values(array_unique(explode(',', $raw)));
        if ($raw === '' || count($ids) > 200) fail('1–200 файл сонгоно уу');
        $files = array();
        foreach ($ids as $fileId) {
            if (folder_token_id($fileId) === '' || !folder_share_contains($bucket, $share, $fileId)) fail('Сонгосон файл олдсонгүй', 404);
            $files[] = $bucket['files'][$fileId]; $handles[] = folder_open_blob($id, $bucket['files'][$fileId]);
        }
        folder_storage_unlock($lock); $lock = null; folder_stream_zip($id, $files, $handles, $caption['name']);
    } finally { folder_storage_unlock($lock); foreach ($handles as $fp) if (is_resource($fp)) fclose($fp); }
}

function handle_folder_workspace_action($action)
{
    $actions = array('folder_meta', 'directory_create', 'directory_update', 'directory_delete', 'file_move', 'folder_rename', 'folder_file_save', 'share_create', 'share_status', 'share_revoke', 'share_info', 'share_file', 'share_download');
    if (!in_array($action, $actions, true)) return false;
    folder_prepare();
    if (in_array($action, array('share_info', 'share_file', 'share_download'), true)) handle_folder_share_read($action);
    $read = $action === 'share_status';
    if ($read) { if (!in_array($_SERVER['REQUEST_METHOD'], array('GET', 'HEAD'), true)) fail('GET хүсэлт шаардлагатай', 405); }
    else require_post();
    $rawSave = $action === 'folder_file_save';
    $body = $read || $rawSave ? $_GET : body_json();
    $id = folder_id($body['folder'] ?? ''); folder_require_access($id, !$read);
    $lock = folder_storage_lock(!$read);
    try {
        $state = folder_state(); folder_bucket($state, $id); $bucket =& $state['folders'][$id];
        if (!$read && folder_cleanup($state)) folder_save($state);
        if ($action === 'folder_meta') {
            $metadata = folder_metadata($body); foreach ($metadata as $key => $value) $bucket[$key] = $value;
            folder_save($state); $result = array('ok' => true, 'folder' => folder_object($id));
        } elseif ($action === 'directory_create' || $action === 'directory_update') {
            $name = folder_directory_name($body['name'] ?? ''); $metadata = folder_metadata($body);
            if ($action === 'directory_create') {
                $parent = folder_parent($bucket, $body['parent'] ?? '');
                if (count($bucket['directories']) >= 1000) fail('Дэд хавтасны тооны хязгаарт хүрсэн байна', 507);
                if (count(folder_breadcrumbs($bucket, $parent, '')) >= 32) fail('Хавтас 32 түвшнээс гүн байх боломжгүй');
                $directory = bin2hex(random_bytes(16)); $dir = array_merge(array('id' => $directory, 'name' => $name, 'parent' => $parent, 'time' => date('c')), $metadata);
            } else {
                $directory = folder_parent($bucket, $body['directory'] ?? null);
                if ($directory === '') fail('Үндсэн хавтасны нэрийг солих боломжгүй');
                $dir = array_merge($bucket['directories'][$directory], array('name' => $name), $metadata);
            }
            foreach ($bucket['directories'] as $existingId => $existing) if ($existingId !== $directory && ($existing['parent'] ?? '') === $dir['parent'] && $existing['name'] === $name) fail('Ижил нэртэй дэд хавтас байна', 409);
            $bucket['directories'][$directory] = $dir; folder_save($state); $result = array('ok' => true, 'directory' => folder_directory_object($dir));
        } elseif ($action === 'directory_delete') {
            $directory = folder_parent($bucket, $body['directory'] ?? null);
            if ($directory === '') fail('Үндсэн хавтсыг устгах боломжгүй');
            $deletedDirs = array(); $deletedFiles = array(); $deletedUploads = array();
            foreach ($bucket['directories'] as $dirId => $dir) if (folder_in_subtree($bucket, $dirId, $directory)) $deletedDirs[] = $dirId;
            foreach ($bucket['files'] as $fileId => $file) if (folder_in_subtree($bucket, $file['parent'] ?? '', $directory)) $deletedFiles[] = $fileId;
            foreach ($bucket['uploads'] as $upId => $up) if (folder_in_subtree($bucket, $up['parent'] ?? '', $directory)) $deletedUploads[] = $upId;
            foreach ($deletedDirs as $dirId) unset($bucket['directories'][$dirId]);
            foreach ($deletedFiles as $fileId) unset($bucket['files'][$fileId]);
            foreach ($deletedUploads as $upId) unset($bucket['uploads'][$upId]);
            foreach (($state['shares'] ?? array()) as $hash => $share) if ($share['folder'] === $id && (in_array($share['file'], $deletedFiles, true) || in_array($share['directory'], $deletedDirs, true))) unset($state['shares'][$hash]);
            folder_save($state);
            foreach ($deletedFiles as $fileId) @unlink(folder_blob($id, $fileId));
            foreach ($deletedUploads as $upId) @unlink(folder_blob($id, $upId, true));
            $result = array('ok' => true, 'deleted' => $deletedDirs, 'deletedFiles' => $deletedFiles);
        } elseif ($action === 'file_move') {
            $parent = folder_parent($bucket, $body['parent'] ?? '');
            $ids = isset($body['ids']) && is_array($body['ids']) ? array_values(array_unique($body['ids'], SORT_REGULAR)) : array();
            if (count($ids) < 1 || count($ids) > 200) fail('1–200 файл сонгоно уу');
            foreach ($ids as $fileId) if (folder_token_id($fileId) === '' || !isset($bucket['files'][$fileId])) fail('Сонгосон файл олдсонгүй', 404);
            foreach ($ids as $fileId) { $bucket['files'][$fileId]['parent'] = $parent; $bucket['files'][$fileId]['version'] = bin2hex(random_bytes(16)); }
            folder_save($state); $result = array('ok' => true, 'moved' => $ids, 'parent' => $parent);
        } elseif ($action === 'folder_rename') {
            $fileId = folder_token_id($body['file'] ?? '');
            if ($fileId === '' || !isset($bucket['files'][$fileId])) fail('Файл олдсонгүй', 404);
            if (isset($body['version'])) folder_check_revision($bucket['files'][$fileId], $body['version']);
            $name = folder_filename($body['name'] ?? '');
            list($mime, $preview) = folder_detect_preview(folder_blob($id, $fileId), $name);
            $file =& $bucket['files'][$fileId]; $file['name'] = $name; $file['mime'] = $mime; $file['preview'] = $preview; $file['version'] = bin2hex(random_bytes(16));
            folder_save($state); $result = array('ok' => true, 'file' => folder_public_file($id, $file));
        } elseif ($action === 'folder_file_save') {
            $fileId = folder_token_id($body['file'] ?? '');
            if ($fileId === '' || !isset($bucket['files'][$fileId])) fail('Файл олдсонгүй', 404);
            $file = $bucket['files'][$fileId]; folder_check_revision($file, $body['version'] ?? null);
            $len = content_length();
            if ($len < 0) fail('Content-Length шаардлагатай', 411);
            if ($len > 32 * 1024 * 1024) fail('Засах файл 32 МБ-аас бага байх ёстой', 413);
            $post = ini_bytes(ini_get('post_max_size'));
            if ($post > 0 && $len > $post) fail('Серверийн нэг хүсэлтийн хэмжээ хүрэлцэхгүй байна. Файлаа татаж хадгалаад дахин байршуулна уу.', 413);
            $usage = folder_usage($state, $id); $delta = $len - (int)$file['size'];
            if ($usage['folder'] + $delta > FOLDER_QUOTA || $usage['global'] + $delta > FOLDER_GLOBAL_QUOTA || media_used_bytes() + tmp_reserved_bytes() + $usage['global'] + (function_exists('doodle_used_bytes') ? doodle_used_bytes() : 0) + $delta > quota_bytes()) fail('Хавтасны хадгалах багтаамж хүрэлцэхгүй байна', 507);
            folder_check_disk($usage['remaining'] + $len + 1024 * 1024);
            $path = folder_blob($id, $fileId); $tmp = $path . '.' . bin2hex(random_bytes(12)) . '.edit.php';
            $in = @fopen('php://input', 'rb'); $out = @fopen($tmp, 'x+b');
            if (!$in || !$out) { if ($in) fclose($in); if ($out) fclose($out); @unlink($tmp); throw new RuntimeException('Cannot create guarded edit'); }
            $guarded = fwrite($out, FOLDER_GUARD) === strlen(FOLDER_GUARD); $written = $guarded ? stream_copy_to_stream($in, $out, $len + 1) : false;
            $flushed = fflush($out); fclose($in); fclose($out); @chmod($tmp, 0640);
            if (!$guarded || !$flushed || $written !== $len) { @unlink($tmp); fail('Файл бүрэн ирсэнгүй'); }
            try { $updatedFile = folder_replace_blob($state, $id, $fileId, $tmp, $body['version']); }
            finally { @unlink($tmp); }
            $result = array('ok' => true, 'file' => $updatedFile);
        } else {
            $scope = folder_share_scope($bucket, $body); $active = null;
            foreach (($state['shares'] ?? array()) as $hash => $share) if (folder_share_same($share, $id, $scope)) {
                $active = $share;
                if (!$read) unset($state['shares'][$hash]);
            }
            if ($action === 'share_create') {
                $token = bin2hex(random_bytes(32)); $share = array_merge($scope, array('folder' => $id, 'created' => date('c'), 'allowUpload' => $scope['target'] === 'folder' && (($body['allowUpload'] ?? true) === true)));
                if (!isset($state['shares'])) $state['shares'] = array();
                $state['shares'][hash('sha256', $token)] = $share; folder_save($state);
                $result = array('ok' => true, 'active' => true, 'created' => $share['created'], 'url' => 'share.php?token=' . $token, 'token' => $token, 'readonly' => true, 'allowUpload' => $share['allowUpload']);
            } elseif ($action === 'share_revoke') { folder_save($state); $result = array('ok' => true, 'active' => false); }
            else $result = array('ok' => true, 'active' => $active !== null, 'created' => $active['created'] ?? null, 'readonly' => true, 'allowUpload' => !empty($active['allowUpload']) && $scope['target'] === 'folder');
        }
        folder_storage_unlock($lock); $lock = null; json_out($result);
    } finally { folder_storage_unlock($lock); }
}

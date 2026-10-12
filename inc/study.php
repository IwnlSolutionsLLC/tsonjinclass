<?php
/* Private textbook work, stored as guarded files in each student's own folder. */
if (!defined('C122')) { http_response_code(404); exit; }

function study_book($id)
{
    if (!is_string($id) || !preg_match('/^[a-zA-Z0-9_-]{1,64}$/D', $id)) fail('Сурах бичиг буруу байна.');
    $catalog = read_json(C122_ROOT . '/assets/data/textbooks.json', array());
    $books = isset($catalog['books']) && is_array($catalog['books']) ? $catalog['books'] : $catalog;
    foreach ($books as $book) if (is_array($book) && (string)($book['id'] ?? '') === $id) return $book;
    fail('Сурах бичиг олдсонгүй.', 404);
}
function study_drawing($value)
{
    if (!is_array($value)) $value = array();
    $strokes = $value['strokes'] ?? array();
    if (!is_array($strokes) || !is_list_array($strokes) || count($strokes) > 2000) fail('Зургийн хэмжээ хэт их байна.');
    $drawing = array('width' => 1200, 'height' => 800, 'strokes' => array()); $total = 0;
    foreach ($strokes as $stroke) {
        if (!is_array($stroke) || !preg_match('/^#[0-9a-fA-F]{6}$/D', (string)($stroke['color'] ?? '')) || !is_numeric($stroke['width'] ?? null)) fail('Зургийн бүтэц буруу байна.');
        $points = $stroke['points'] ?? array(); $width = (float)$stroke['width'];
        if ($width < 1 || $width > 24 || !is_array($points) || !is_list_array($points) || count($points) < 1 || count($points) > 3000) fail('Зураасны бүтэц буруу байна.');
        $total += count($points); if ($total > 40000) fail('Зургийн хэмжээ хэт их байна.');
        $clean = array();
        foreach ($points as $point) {
            if (!is_array($point) || count($point) !== 2 || !isset($point[0], $point[1]) || !is_numeric($point[0]) || !is_numeric($point[1])) fail('Зургийн цэг буруу байна.');
            $x = (float)$point[0]; $y = (float)$point[1];
            if (!is_finite($x) || !is_finite($y) || $x < 0 || $x > 1200 || $y < 0 || $y > 800) fail('Зургийн цэг хүрээнээс гарсан байна.');
            $clean[] = array(round($x, 2), round($y, 2));
        }
        $drawing['strokes'][] = array('color' => strtolower($stroke['color']), 'width' => $width, 'points' => $clean);
    }
    return $drawing;
}
function study_work($folder, $file)
{
    $fp = folder_open_blob($folder, $file); $raw = stream_get_contents($fp, 1048577); fclose($fp);
    if ($raw === false || strlen($raw) > 1048576) fail('Хадгалсан ажлын хэмжээ хэт их байна.', 409);
    $work = json_decode($raw, true);
    if (!is_array($work) || ($work['format'] ?? '') !== 'c122-study-v1' || !is_string($work['text'] ?? null) || !isset($work['drawing']['strokes'])) fail('Хадгалсан ажлын файл өөрчлөгдсөн байна. Хавтсаасаа нээж шалгана уу.', 409);
    return $work;
}
function study_public_note($work, $folder, $file)
{
    return array('text' => $work['text'], 'page' => $work['page'] ?? '', 'drawing' => $work['drawing'], 'version' => folder_file_version($file), 'file' => folder_public_file($folder, $file), 'updated' => $work['updated'] ?? $file['time']);
}
function handle_study_action($action)
{
    if (!in_array($action, array('study_note', 'study_note_save'), true)) return;
    folder_prepare(); $write = $action === 'study_note_save';
    if ($write) require_post();
    elseif (!in_array($_SERVER['REQUEST_METHOD'], array('GET', 'HEAD'), true)) fail('GET хүсэлт шаардлагатай.', 405);
    $body = $write ? body_json() : $_GET;
    $folder = folder_id($body['folder'] ?? ''); folder_require_access($folder, $write);
    $book = study_book($body['book'] ?? ''); $bookId = (string)$book['id'];
    $temp = null; $lock = folder_storage_lock();
    try {
        $state = folder_state(); folder_bucket($state, $folder);
        $fileId = $state['folders'][$folder]['studyNotes'][$bookId] ?? '';
        $file = $state['folders'][$folder]['files'][$fileId] ?? null;
        $previous = $file ? study_work($folder, $file) : null;
        if (!$write) json_out(array('ok' => true, 'note' => $file ? study_public_note($previous, $folder, $file) : null, 'csrf' => folder_csrf($folder)));
        $version = $body['version'] ?? null;
        if (($file && (!is_string($version) || !hash_equals(folder_file_version($file), $version))) || (!$file && $version !== null && $version !== '')) fail('Ажил өөр төхөөрөмж дээр өөрчлөгдсөн байна. Шинэ хувилбарыг ачаалаад үргэлжлүүлнэ үү.', 409, array('conflict' => true));
        $text = $body['text'] ?? '';
        if (!is_string($text) || strlen($text) > 65536 || !preg_match('//u', $text)) fail('Тэмдэглэл 64 КБ хүртэл байна.');
        $drawing = study_drawing($body['drawing'] ?? array());
        if ($previous) {
            $old = $previous['drawing']['strokes'];
            if (count($drawing['strokes']) < count($old)) fail('Хадгалсан зураасыг арилгах боломжгүй. Шинэ зураас нэмж болно.', 409);
            foreach ($old as $i => $stroke) if ($stroke != $drawing['strokes'][$i]) fail('Хадгалсан зураасыг өөрчлөх боломжгүй. Шинэ зураас нэмж болно.', 409);
        }
        $work = array('format' => 'c122-study-v1', 'book' => $bookId, 'title' => (string)($book['title'] ?? $book['name'] ?? $bookId), 'sourceUrl' => (string)($book['medleUrl'] ?? $book['url'] ?? $book['viewerUrl'] ?? ''), 'page' => clean_str($body['page'] ?? '', 80), 'text' => $text, 'drawing' => $drawing, 'updated' => date('c'));
        $json = json_encode($work, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($json === false || strlen($json) > 1048576) fail('Ажлын нийт хэмжээ 1 МБ хүртэл байна.');
        $temp = FOLDER_DIR . '/.study-output-' . bin2hex(random_bytes(16)) . '.php';
        if (@file_put_contents($temp, FOLDER_GUARD . $json, LOCK_EX) === false) throw new RuntimeException('Cannot write study work');
        @chmod($temp, 0640);
        if ($file) $saved = folder_replace_blob($state, $folder, $file['id'], $temp, $version);
        else $saved = folder_add_blob($state, $folder, '', 'Сурах бичиг - ' . $work['title'] . '.json', $temp, function (&$updatedState, $publicFile) use ($folder, $bookId) { $updatedState['folders'][$folder]['studyNotes'][$bookId] = $publicFile['id']; });
        $file = $state['folders'][$folder]['files'][$saved['id']];
        json_out(array('ok' => true, 'file' => $saved, 'note' => study_public_note($work, $folder, $file), 'csrf' => folder_csrf($folder)));
    } catch (RuntimeException $e) { $code = $e->getCode(); if ($temp !== null) @unlink($temp); fail('Ажлыг хадгалж чадсангүй. ' . $e->getMessage(), $code >= 400 && $code <= 599 ? $code : 500); }
    finally { folder_storage_unlock($lock); if ($temp !== null) @unlink($temp); }
}

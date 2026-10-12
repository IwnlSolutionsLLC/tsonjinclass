<?php
/* FlashCards: English + Chinese (HSK 1–5) word decks. Admin edits the lists; kids study know / don't-know. */
if (!defined('C122')) { http_response_code(404); exit; }

define('FLASHCARDS_FILE', DB_DIR . '/flashcards.php');
define('FLASHCARDS_MAX', 2000);                 // cards per deck

function flashcards_decks()
{
    return array(
        'english' => 'Англи хэл',
        'hsk1' => 'HSK 1', 'hsk2' => 'HSK 2', 'hsk3' => 'HSK 3', 'hsk4' => 'HSK 4', 'hsk5' => 'HSK 5',
    );
}

function flashcards_clean_card($raw)
{
    if (!is_array($raw)) return null;
    $front = clean_str($raw['f'] ?? ($raw['front'] ?? ''), 80);
    $back = clean_str($raw['b'] ?? ($raw['back'] ?? ''), 200);
    $pinyin = clean_str($raw['p'] ?? ($raw['pinyin'] ?? ''), 120);
    if ($front === '' || $back === '') return null;
    $card = array('f' => $front, 'b' => $back);
    if ($pinyin !== '') $card['p'] = $pinyin;
    return $card;
}

/* Starter words so a deck is playable before the admin fills it; a saved deck (even empty) overrides its seed. */
function flashcards_seed()
{
    return array(
        'english' => array(
            array('f' => 'friend', 'b' => 'найз'), array('f' => 'school', 'b' => 'сургууль'), array('f' => 'teacher', 'b' => 'багш'),
            array('f' => 'student', 'b' => 'сурагч'), array('f' => 'book', 'b' => 'ном'), array('f' => 'happy', 'b' => 'аз жаргалтай'),
            array('f' => 'water', 'b' => 'ус'), array('f' => 'family', 'b' => 'гэр бүл'), array('f' => 'beautiful', 'b' => 'үзэсгэлэнтэй'),
            array('f' => 'future', 'b' => 'ирээдүй'), array('f' => 'dream', 'b' => 'мөрөөдөл'), array('f' => 'together', 'b' => 'хамтдаа'),
        ),
        'hsk1' => array(
            array('f' => '你好', 'p' => 'nǐ hǎo', 'b' => 'сайн уу'), array('f' => '谢谢', 'p' => 'xiè xie', 'b' => 'баярлалаа'),
            array('f' => '老师', 'p' => 'lǎo shī', 'b' => 'багш'), array('f' => '学生', 'p' => 'xué sheng', 'b' => 'сурагч'),
            array('f' => '朋友', 'p' => 'péng you', 'b' => 'найз'), array('f' => '学校', 'p' => 'xué xiào', 'b' => 'сургууль'),
            array('f' => '水', 'p' => 'shuǐ', 'b' => 'ус'), array('f' => '家', 'p' => 'jiā', 'b' => 'гэр'),
            array('f' => '爱', 'p' => 'ài', 'b' => 'хайр'), array('f' => '好', 'p' => 'hǎo', 'b' => 'сайн'),
            array('f' => '大', 'p' => 'dà', 'b' => 'том'), array('f' => '小', 'p' => 'xiǎo', 'b' => 'жижиг'),
        ),
    );
}

function flashcards_load()
{
    $saved = read_guarded(FLASHCARDS_FILE);
    $seed = flashcards_seed();
    $decks = flashcards_decks();
    $out = array();
    foreach ($decks as $key => $label) {
        $list = array();
        $source = (is_array($saved) && isset($saved['decks'][$key]) && is_array($saved['decks'][$key])) ? $saved['decks'][$key]
            : (isset($seed[$key]) ? $seed[$key] : array());
        foreach ($source as $card) {
            $clean = flashcards_clean_card($card);
            if ($clean) $list[] = $clean;
            if (count($list) >= FLASHCARDS_MAX) break;
        }
        $out[$key] = $list;
    }
    return $out;
}

function flashcards_public()
{
    $decks = flashcards_load();
    $meta = array();
    foreach (flashcards_decks() as $key => $label) {
        $meta[] = array('key' => $key, 'label' => $label, 'count' => count($decks[$key]), 'cards' => $decks[$key]);
    }
    return array('ok' => true, 'decks' => $meta, 'updated' => (read_guarded(FLASHCARDS_FILE)['updated'] ?? null));
}

function handle_flashcards_action($action)
{
    if ($action === 'flashcards_get') {
        json_out(flashcards_public());
    }
    if ($action === 'flashcards_save') {
        require_admin();
        $body = body_json();
        $deck = is_string($body['deck'] ?? null) ? $body['deck'] : '';
        if (!array_key_exists($deck, flashcards_decks())) fail('Багц буруу байна.');
        if (!is_array($body['cards'] ?? null)) fail('Картуудын жагсаалт алга.');
        $cards = array();
        foreach ($body['cards'] as $card) {
            $clean = flashcards_clean_card($card);
            if ($clean) $cards[] = $clean;
            if (count($cards) >= FLASHCARDS_MAX) break;
        }
        $saved = read_guarded(FLASHCARDS_FILE);
        if (!is_array($saved)) $saved = array('decks' => array());
        if (!isset($saved['decks']) || !is_array($saved['decks'])) $saved['decks'] = array();
        $saved['decks'][$deck] = $cards;
        $saved['updated'] = date('c');
        if (!write_guarded(FLASHCARDS_FILE, $saved)) fail('Хадгалж чадсангүй.', 500);
        json_out(array('ok' => true, 'deck' => $deck, 'count' => count($cards)));
    }
}

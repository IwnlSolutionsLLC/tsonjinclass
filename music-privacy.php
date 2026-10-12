<?php
define('C122', true);
require __DIR__ . '/inc/core.php';
function h($value) { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); }
function asset($path) { return $path . '?v=' . (is_file(__DIR__ . '/' . $path) ? filemtime(__DIR__ . '/' . $path) : '1'); }
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
?><!doctype html>
<html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Music · Өгөгдөл ба үйлчилгээ</title>
<script src="<?= h(asset('assets/js/theme.js')) ?>"></script><script src="<?= h(asset('assets/js/i18n.js')) ?>"></script><link rel="stylesheet" href="<?= h(asset('assets/css/navigation.css')) ?>">
<link rel="stylesheet" href="<?= h(asset('assets/css/style.css')) ?>"><link rel="stylesheet" href="<?= h(asset('assets/css/senior.css')) ?>"><link rel="stylesheet" href="<?= h(asset('assets/css/themes.css')) ?>">
</head><body><?php include __DIR__ . '/inc/icons.php'; ?><main class="wrap" style="max-width:800px;padding-top:32px">
<a class="btn btn-ghost btn-sm" href="./#music">← Music рүү</a>
<section class="panel glass" style="margin-top:24px;line-height:1.8"><h1>Music · Өгөгдөл ба үйлчилгээ</h1>
<p>Music нь Spotify-ийн албан Web Playback SDK ашиглан том дэлгэцийн хөтөч дээр дуу тоглуулна. Дэлгэц нэг Spotify Premium бүртгэлээр холбогдоно. Сурагчийн плейлистүүд энэ вэб сайтад хадгалагдана.</p>
<h2>Сайт дээр хадгалах зүйлс</h2>
<p>Сурагчийн нэр, плейлистийн нэр/тайлбар, Spotify дууны ID, нэр, уран бүтээлч, цомог, artwork холбоос болон дууны дарааллыг серверт хадгална. Ангийнхан эдгээр жагсаалтыг харж болно. Жагсаалт үүсгэх, өөрчлөхөд өөрийн хувийн хавтасны код шаардлагатай. Устгасан плейлистийг хогийн савнаас сэргээж болно.</p>
<p>Хавтаснаасаа «Аудио нэмэх» сонгоход тухайн аудионы тусдаа хамгаалагдсан хуулбарыг Music санд хадгална. Идэвхтэй ангийн плейлистэд нэмсэн аудиог бүх зочин сонсож болно. Хавтасны эх файлыг түгжих эсвэл устгах нь Music-ийн нийтэд хуваалцсан хуулбарыг арилгахгүй. Аудиог агуулсан бүх идэвхтэй плейлистээс хасахад нийтэд тоглуулах эрх хаагдана. Spotify болон YouTube аудиог татаж хадгалахгүй.</p>
<h2>Smart Mix</h2><p>Smart Mix нь Music санд нийтэд хуваалцсан аудиог хөтөч дээр шинжилж, хэмнэл эсвэл аяны нам хэсгийг ашиглан зөөлөн холино. Шинжилгээний аудио гуравдагч тал болон AI үйлчилгээнд илгээгдэхгүй. Шинжилгээ боломжгүй үед энгийн зөөлөн шилжилт хэрэглэнэ. Spotify дуунууд эх үйлчилгээний тоглуулах горимоор явна.</p><h2>YouTube</h2><p>YouTube хэсэг нь албан хайлт болон харагдах видео тоглуулагч ашиглана. Хайсан үг YouTube-ийн үйлчилгээнд очно. Видео сонгоход тоглуулагч YouTube-тэй холбогдоно. Сүүлийн үзсэн видео, үзэх дарааллыг энэ хөтөч дээр хадгалж болно. YouTube видеог өөр хэсэг рүү шилжихэд түр зогсооно. <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">YouTube-ийн нөхцөл</a> болон <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google-ийн нууцлалын бодлого</a> үйлчилнэ.</p><h2>Spotify холболт</h2>
<p>Spotify-ийн өөрийн нэвтрэх хуудсаар зөвшөөрөл өгнө. Сайт Spotify-ийн нууц үгийг асуухгүй. Үйлчилгээний төрөл болон хайлтын дууны мэдээллийг Spotify-оос авна. Холбогдсон бүртгэлийн нэрийг Music хэсэгт харуулахгүй. Тоглуулагчид хэрэгтэй email эрхийг хүсдэг ч таны email хаягийг хадгалж, бусад сурагчдад харуулахгүй.</p>
<p>Хайсан үг, тоглуулах команд, дууны мэдээлэл авах хүсэлт Spotify руу очно. Ангийн плейлист үүсгэх, нэр солих, дуу нэмэх/хасах үйлдэл сайтын плейлистэд хадгалагдана; Spotify бүртгэлийн плейлистийг автоматаар өөрчлөхгүй. Spotify тоглуулагч нь сүлжээний хаяг, хөтчийн мэдээллийг өөрийн <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener">нууцлалын бодлогын</a> дагуу ашиглана.</p>
<p>Холболтын түлхүүр, бүртгэлийн товч мэдээллийг серверийн түр нэвтрэлтийн сессэд хадгална. Refresh token хөтөч рүү буцаахгүй; тоглуулагчийн access token хөтчийн санах ойд хэрэглэгдэнэ. Дуу тоглуулах команд браузераас Spotify руу шууд очно. Spotify-ийн өгсөн зөвшөөрлийг бүрэн цуцлах бол өөрийн Spotify бүртгэлийн Apps хэсгээс энэ аппыг хасна.</p>
<h2>Төхөөрөмж дээр</h2>
<p>Сонгосон нэр, харагдац, дууны чанга сул зэрэг тохиргоог хөтчийн localStorage-д хадгалж болно. Хавтасны нэвтрэлт болон Spotify холболт хамгаалагдсан cookie хэрэглэнэ. Хөтчийн сайтын мэдээллийг цэвэрлэхэд төхөөрөмжийн тохиргоо, нэвтрэлт арилна; серверт хадгалсан ангийн плейлист хэвээр үлдэнэ.</p>
<p>Нэмэлт мэдээлэл устгах, экспортлох хүсэлтийг сайтын эзэн эсвэл ангийн хариуцсан хүнд өгнө.</p>
</section></main></body></html>

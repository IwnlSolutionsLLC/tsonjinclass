<?php if (!defined('C122')) { http_response_code(404); exit; } if (empty($admin)) return; ?>
<details class="cctv-camera-setup" id="camera-setup"<?= $admin ? '' : ' hidden' ?>>
  <summary><span>Том дэлгэцийн камер</span><small>Багшийн тохиргоо</small></summary>
  <div class="cctv-camera-setup-body">
    <p class="cctv-camera-intro">Samsung дэлгэцийн Chrome дээр камер, микрофоноо нэг удаа холбоод энэ сайтыг нээлттэй байлгана. Сайтын хэсэг солих эсвэл өөр Chrome таб үзэхэд камер үргэлжлүүлэн ажиллана.</p>
    <div id="cctvDisplaySetup" aria-label="Том дэлгэцийн камер, микрофоны тохиргоо">
      <p id="cctvSetupLoading" class="cctv-setup-load" role="status">Камерын тохиргоог ачаалж байна. «Энэ дэлгэцийг холбох» товч харагдахгүй бол шинэчлэлтийн ZIP доторх <code>assets/js/cctv-display.js</code>, <code>assets/js/cctv-peer.js</code> файлуудыг бусад application файлтай хамт байрлуулаад Chrome-ийн хуудсыг дахин ачаална уу.</p>
      <noscript><p class="cctv-setup-load">Төхөөрөмж бүртгэх болон камер ашиглахын тулд Chrome-д JavaScript-ийг зөвшөөрнө үү.</p></noscript>
    </div>
    <p class="cctv-camera-teacher-link"><a href="./">Ангийн сайт руу буцах</a><a href="#cctv">Багшийн шууд хяналт руу очих</a></p>
  </div>
</details>

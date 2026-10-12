<?php
/* Teacher CCTV now shares the site's existing administration page. */
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('Location: ../admin.php#cctv', true, 303);
exit;

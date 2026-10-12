<?php
/* Legacy setup links now open the authenticated administration controls. */
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Robots-Tag: noindex, nofollow');
header('Location: ../admin.php#camera-setup', true, 303);
exit;

<?php
$content = file_get_contents(ABSPATH . 'homepage-v2.html');
if (!$content) { echo "ERROR: Could not read homepage-v2.html\n"; exit(1); }
$result = wp_update_post([
    'ID' => 13,
    'post_content' => $content,
]);
if (is_wp_error($result)) { echo "ERROR: " . $result->get_error_message() . "\n"; exit(1); }
echo "OK: Homepage updated (post $result), " . strlen($content) . " bytes\n";
unlink(ABSPATH . 'homepage-v2.html');

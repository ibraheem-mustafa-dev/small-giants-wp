<?php
$content = file_get_contents(ABSPATH . 'tmp-homepage-content.txt');
// Strip BOM if present
$content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
$content = trim($content);
wp_update_post(array(
    'ID' => 13,
    'post_content' => $content,
));
echo "Updated post 13 with " . strlen($content) . " chars\n";
echo "First 100: " . substr($content, 0, 100) . "\n";

<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
$post = get_post(13);
$content = $post->post_content;

// Try to render just the hero block
preg_match('/<!-- wp:sgs\/hero .+? \/-->/', $content, $matches);
if ($matches) {
    echo "Found hero block markup (" . strlen($matches[0]) . " chars)\n";
    $result = do_blocks($matches[0]);
    echo "Rendered length: " . strlen($result) . "\n";
    echo substr($result, 0, 500) . "\n";
} else {
    echo "No hero block found in content\n";
    echo "First 200 chars: " . substr($content, 0, 200) . "\n";
}

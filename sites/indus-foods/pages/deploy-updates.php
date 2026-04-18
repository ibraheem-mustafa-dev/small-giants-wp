<?php
function load_content($file) {
    $content = file_get_contents(ABSPATH . $file);
    $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
    return trim($content);
}

// Update Manufacturing (ID 66)
$mfg = load_content('tmp-manufacturing.html');
wp_update_post(array('ID' => 66, 'post_content' => $mfg));
echo "Manufacturing updated: " . strlen($mfg) . " chars\n";

// Update Retail (ID 67)
$retail = load_content('tmp-retail.html');
wp_update_post(array('ID' => 67, 'post_content' => $retail));
echo "Retail updated: " . strlen($retail) . " chars\n";

// Update Wholesale (ID 68)
$wholesale = load_content('tmp-wholesale.html');
wp_update_post(array('ID' => 68, 'post_content' => $wholesale));
echo "Wholesale updated: " . strlen($wholesale) . " chars\n";

// Cleanup
foreach (glob(ABSPATH . 'tmp-*.html') as $f) unlink($f);
unlink(ABSPATH . 'deploy-updates.php');
echo "DONE\n";

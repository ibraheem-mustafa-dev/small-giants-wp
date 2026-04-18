<?php
// Create Food Service page
$food_service_content = file_get_contents(ABSPATH . 'tmp-food-service.html');
$food_service_content = preg_replace('/^\xEF\xBB\xBF/', '', $food_service_content);
$food_service_content = trim($food_service_content);

$fs_id = wp_insert_post(array(
    'post_title'   => 'Food Service',
    'post_name'    => 'food-service',
    'post_content' => $food_service_content,
    'post_status'  => 'publish',
    'post_type'    => 'page',
));
echo "Food Service page created: ID $fs_id (" . strlen($food_service_content) . " chars)\n";

// Create Manufacturing page (clone of food service with different title for now)
$mfg_id = wp_insert_post(array(
    'post_title'   => 'Manufacturing',
    'post_name'    => 'manufacturing',
    'post_content' => str_replace(
        array('Food Service', 'food service', 'Your kitchen\'s secret to authentic flavour'),
        array('Manufacturing', 'manufacturing', 'Quality food manufacturing you can trust'),
        $food_service_content
    ),
    'post_status'  => 'publish',
    'post_type'    => 'page',
));
echo "Manufacturing page created: ID $mfg_id\n";

// Create Retail page
$retail_id = wp_insert_post(array(
    'post_title'   => 'Retail',
    'post_name'    => 'retail',
    'post_content' => str_replace(
        array('Food Service', 'food service', 'Your kitchen\'s secret to authentic flavour'),
        array('Retail', 'retail', 'Retail-ready products your customers will love'),
        $food_service_content
    ),
    'post_status'  => 'publish',
    'post_type'    => 'page',
));
echo "Retail page created: ID $retail_id\n";

// Create Wholesale page
$wholesale_id = wp_insert_post(array(
    'post_title'   => 'Wholesale',
    'post_name'    => 'wholesale',
    'post_content' => str_replace(
        array('Food Service', 'food service', 'Your kitchen\'s secret to authentic flavour'),
        array('Wholesale', 'wholesale', 'Reliable wholesale supply for your business'),
        $food_service_content
    ),
    'post_status'  => 'publish',
    'post_type'    => 'page',
));
echo "Wholesale page created: ID $wholesale_id\n";

// Update Trade Application page (ID 58)
$trade_content = file_get_contents(ABSPATH . 'tmp-trade-application.html');
$trade_content = preg_replace('/^\xEF\xBB\xBF/', '', $trade_content);
$trade_content = trim($trade_content);

wp_update_post(array(
    'ID'           => 58,
    'post_content' => $trade_content,
));
echo "Trade Application page updated: ID 58 (" . strlen($trade_content) . " chars)\n";

// Clean up
unlink(ABSPATH . 'tmp-food-service.html');
unlink(ABSPATH . 'tmp-trade-application.html');
unlink(ABSPATH . 'deploy-pages.php');
echo "DONE\n";

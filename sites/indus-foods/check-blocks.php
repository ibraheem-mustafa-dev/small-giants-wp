<?php
$r = WP_Block_Type_Registry::get_instance();
$sgs_blocks = array_filter(
    array_keys($r->get_all_registered()),
    function($name) { return str_starts_with($name, 'sgs/'); }
);
echo "SGS blocks registered: " . count($sgs_blocks) . "\n";
foreach ($sgs_blocks as $name) {
    $block = $r->get_registered($name);
    echo "$name => render: " . ($block->render_callback ? 'callback' : (isset($block->render) ? 'file' : 'none')) . "\n";
}

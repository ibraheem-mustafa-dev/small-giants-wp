<?php
$uid = 'sgs-b2-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
echo '<style>' . sgs_typography_css_rule( $attributes, 'title', '.' . $uid . ' h2' ) . '</style>';

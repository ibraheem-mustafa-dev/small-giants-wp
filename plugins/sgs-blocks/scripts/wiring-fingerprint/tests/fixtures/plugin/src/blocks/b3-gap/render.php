<?php
$bg  = $attributes['cellBackground'] ?? '';
$uid = 'sgs-b3-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$css = '.' . $uid . ' > .sgs-b3-gap{background:' . esc_attr( $bg ) . '}';
echo '<style>' . $css . '</style>';

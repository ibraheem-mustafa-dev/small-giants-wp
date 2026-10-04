<?php
$bg  = $attributes['cellBackground'] ?? '';
$uid = 'sgs-b3-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$css = '.' . $uid . ' > .sgs-b3-ok,.' . $uid . ' > .sgs-b3-ok__inner > .sgs-b3-ok{background:' . esc_attr( $bg ) . '}';
echo '<style>' . $css . '</style>';

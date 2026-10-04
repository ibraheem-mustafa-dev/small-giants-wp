<?php
$h   = $attributes['textColourHover'] ?? '';
$uid = 'sgs-h-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
echo '<style>.' . $uid . ':hover{color:' . esc_attr( $h ) . '}</style>';

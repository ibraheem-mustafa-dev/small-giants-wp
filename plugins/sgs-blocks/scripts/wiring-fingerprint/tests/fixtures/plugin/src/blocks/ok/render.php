<?php
$colour = $attributes['textColour'] ?? '';
$uid    = 'sgs-x-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$css    = '.' . $uid . '{color:' . esc_attr( $colour ) . '}';
echo '<style>' . $css . '</style><div class="' . esc_attr( $uid ) . '"></div>';

<?php
$ctx = $block->context['sgs/parentColour'] ?? '';
$uid = 'sgs-b1-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
echo '<style>.' . $uid . '{color:' . esc_attr( $ctx ) . ';background:' . esc_attr( $attributes['textColour'] ?? '' ) . '}</style>';

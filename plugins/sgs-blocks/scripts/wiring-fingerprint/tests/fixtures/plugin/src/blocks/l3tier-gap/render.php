<?php
$p   = $attributes['padding'] ?? array();
$uid = 'sgs-t-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
echo '<style>.' . $uid . '{padding:' . esc_attr( $p['desktop'] ?? '' ) . '}@media (max-width:600px){.' . $uid . '{padding:' . esc_attr( $p['mobile'] ?? '' ) . '}}</style>';

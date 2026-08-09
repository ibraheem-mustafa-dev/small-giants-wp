<?php
// One width layer, correctly named. Block-private, no band, and that is fine —
// this block never claims to have an inner band.
$uid = 'sgs-' . wp_unique_id();
echo '<style>.' . $uid . '{max-width:' . $attributes['maxWidth'] . '}</style>'
	. '<div class="' . $uid . '">' . $content . '</div>';

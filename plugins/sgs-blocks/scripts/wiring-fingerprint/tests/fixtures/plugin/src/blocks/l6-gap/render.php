<?php
$c = $attributes['textColour'] ?? '';
echo '<div style="--sgs-l6-unread:' . esc_attr( $c ) . '"></div>';

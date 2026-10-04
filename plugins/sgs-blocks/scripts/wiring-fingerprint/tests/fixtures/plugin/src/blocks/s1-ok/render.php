<?php
$b = $attributes['borderColour'] ?? '';
echo '<div style="--sgs-s1-edge:' . esc_attr( $b ) . '"></div>';

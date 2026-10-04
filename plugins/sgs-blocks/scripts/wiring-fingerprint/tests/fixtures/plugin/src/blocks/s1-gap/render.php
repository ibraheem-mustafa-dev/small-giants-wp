<?php
$b = $attributes['borderColour'] ?? '';
echo '<div style="--sgs-s1-border:' . esc_attr( $b ) . '"></div>';

<?php
$shadow = isset( $attributes['shadowHover'] ) ? $attributes['shadowHover'] : '';
echo '<style>.fixture:hover{box-shadow:' . esc_attr( $shadow ) . ';}</style>';

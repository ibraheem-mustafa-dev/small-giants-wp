<?php
/**
 * Fixture render surface. Paints BOTH attributes; only one of them has a
 * control in edit.js.
 */

$heading = isset( $attributes['headingText'] ) ? $attributes['headingText'] : '';
$shadow  = isset( $attributes['shadowHover'] ) ? $attributes['shadowHover'] : '';

echo '<style>.fixture:hover{box-shadow:' . esc_attr( $shadow ) . ';}</style>';
echo '<h2>' . esc_html( $heading ) . '</h2>';

<?php
/**
 * Fixture render surface. Paints all three core-registered attributes, so the
 * ONLY thing that can suppress a finding here is the core-supports exclusion.
 */

$anchor     = isset( $attributes['anchor'] ) ? $attributes['anchor'] : '';
$background = isset( $attributes['backgroundColor'] ) ? $attributes['backgroundColor'] : '';
$text       = isset( $attributes['textColor'] ) ? $attributes['textColor'] : '';

printf(
	'<div id="%s" class="has-%s-background-color has-%s-color"></div>',
	esc_attr( $anchor ),
	esc_attr( $background ),
	esc_attr( $text )
);

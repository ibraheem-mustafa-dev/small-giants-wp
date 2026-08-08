<?php
/**
 * Identical render surface to `core-supports-provided-control`. Only the
 * absent `supports` block in this fixture's block.json separates the two.
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

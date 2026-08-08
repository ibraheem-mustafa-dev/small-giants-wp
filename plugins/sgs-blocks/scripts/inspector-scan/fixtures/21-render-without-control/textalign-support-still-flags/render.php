<?php
/**
 * Paints both attributes. `fontSize` must be excluded (core registers a named
 * fontSize attribute); `textAlign` must FLAG (core keeps that value in
 * style.typography.textAlign, never in a named attribute).
 */

$font_size  = isset( $attributes['fontSize'] ) ? $attributes['fontSize'] : '';
$text_align = isset( $attributes['textAlign'] ) ? $attributes['textAlign'] : '';

printf(
	'<p class="has-%s-font-size" style="text-align:%s"></p>',
	esc_attr( $font_size ),
	esc_attr( $text_align )
);

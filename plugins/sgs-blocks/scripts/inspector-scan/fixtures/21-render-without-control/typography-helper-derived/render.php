<?php
$weight  = isset( $attributes['captionFontWeight'] ) ? $attributes['captionFontWeight'] : '';
$spacing = isset( $attributes['captionLetterSpacing'] ) ? $attributes['captionLetterSpacing'] : '';

printf(
	'<style>.fixture-caption{font-weight:%s;letter-spacing:%spx}</style>',
	esc_attr( $weight ),
	esc_attr( $spacing )
);

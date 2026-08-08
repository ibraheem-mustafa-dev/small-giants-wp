<?php
/**
 * Fixture render surface. Paints EVERY core-registered attribute, so the only
 * thing that can suppress a finding here is the core-supports exclusion. One
 * attribute per mapped branch, so a regression in any single branch surfaces
 * as a finding rather than hiding behind a sibling that still works.
 */

$anchor      = isset( $attributes['anchor'] ) ? $attributes['anchor'] : '';
$align       = isset( $attributes['align'] ) ? $attributes['align'] : '';
$layout      = isset( $attributes['layout'] ) ? $attributes['layout'] : array();
$class_name  = isset( $attributes['className'] ) ? $attributes['className'] : '';
$background  = isset( $attributes['backgroundColor'] ) ? $attributes['backgroundColor'] : '';
$text        = isset( $attributes['textColor'] ) ? $attributes['textColor'] : '';
$gradient    = isset( $attributes['gradient'] ) ? $attributes['gradient'] : '';
$font_size   = isset( $attributes['fontSize'] ) ? $attributes['fontSize'] : '';
$font_family = isset( $attributes['fontFamily'] ) ? $attributes['fontFamily'] : '';

printf(
	'<div id="%s" class="align%s %s has-%s-background-color has-%s-color has-%s-gradient-background has-%s-font-size has-%s-font-family" data-layout="%s"></div>',
	esc_attr( $anchor ),
	esc_attr( $align ),
	esc_attr( $class_name ),
	esc_attr( $background ),
	esc_attr( $text ),
	esc_attr( $gradient ),
	esc_attr( $font_size ),
	esc_attr( $font_family ),
	esc_attr( wp_json_encode( $layout ) )
);

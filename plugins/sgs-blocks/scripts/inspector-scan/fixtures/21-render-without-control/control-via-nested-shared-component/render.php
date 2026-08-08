<?php
/**
 * Paints all five overlay attributes, so each one is a live candidate and only
 * transitive component resolution can clear it.
 */

$overlay  = isset( $attributes['backgroundOverlayColour'] ) ? $attributes['backgroundOverlayColour'] : '';
$gradient = isset( $attributes['overlayGradient'] ) ? $attributes['overlayGradient'] : false;
$angle    = isset( $attributes['overlayGradientAngle'] ) ? $attributes['overlayGradientAngle'] : 180;
$from     = isset( $attributes['overlayGradientFrom'] ) ? $attributes['overlayGradientFrom'] : '';
$to       = isset( $attributes['overlayGradientTo'] ) ? $attributes['overlayGradientTo'] : '';

$css = $gradient
	? sprintf( 'linear-gradient(%ddeg, %s, %s)', (int) $angle, $from, $to )
	: $overlay;

printf( '<div style="background:%s"></div>', esc_attr( $css ) );

<?php
/**
 * Fixture: mirrors the real hover-only pattern in helpers-colour-variants.php and
 * sgs-header-float-css.php — a raw composed value written straight to box-shadow, but
 * carrying the real "sgs-shadow-fallback:" exemption comment convention (the resting
 * rule elsewhere on the same selector already carries the forced-colours fallback).
 * Must PASS: sink=box-shadow, exempt=True, forced_colours_reached=True.
 *
 * @package SGS\Blocks
 */

$fixture_hover_shadow = sgs_shadow_value_composed( $fixture_hover_shape, $fixture_hover_colour );
if ( '' !== $fixture_hover_shadow ) {
	// sgs-shadow-fallback: hover state only; the resting rule carries the forced-colours fallback
	$out['hover'][] = 'box-shadow:' . $fixture_hover_shadow;
}

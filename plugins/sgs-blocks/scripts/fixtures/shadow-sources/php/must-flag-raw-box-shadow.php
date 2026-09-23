<?php
/**
 * Fixture: a raw sgs_shadow_value_composed() result written straight to box-shadow, with
 * no forced-colours fallback call nearby and no sgs-shadow-fallback: exemption comment.
 * Must be flagged: sink=box-shadow, forced_colours_reached=False, exempt=False.
 *
 * @package SGS\Blocks
 */

$fixture_shadow = sgs_shadow_value_composed(
	(string) ( $attributes['fixtureShadow'] ?? '' ),
	(string) ( $attributes['fixtureShadowColour'] ?? '' )
);
if ( '' !== $fixture_shadow ) {
	$css .= '.sgs-fixture{box-shadow:' . $fixture_shadow . ';}';
}

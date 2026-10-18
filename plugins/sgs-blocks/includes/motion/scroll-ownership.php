<?php
/**
 * Scroll ownership: whether an effect owns transform and opacity across a scroll range (Spec 38 §4.3, Spec 38A §10
 * "Scroll effects win").
 *
 * Read by the motion renderer (`includes/motion/class-sgs-motion-renderer.php`), which suppresses an element's entrance when one of
 * its effect layers owns the scroll range. The `owns_scroll_transform` flag comes from the generated registry map
 * (`SGS_Motion_Registry::effects()`, projected from the `fx_effects` DB table), never a hardcoded list: a
 * load-triggered effect (DrawSVG, ScrambleText) does not own the scroll range and never suppresses an entrance.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Whether one effect slug owns transform and opacity across a scroll range.
 *
 * @param string $effect An `fx_effects` slug.
 * @return bool
 */
function sgs_effect_owns_scroll_transform( string $effect ): bool {
	if ( '' === $effect || ! \class_exists( __NAMESPACE__ . '\\SGS_Motion_Registry' ) ) {
		return false;
	}
	$effects = SGS_Motion_Registry::effects();
	return ! empty( $effects[ $effect ]['owns_scroll_transform'] );
}

/**
 * Whether this block carries an fx effect that owns transform/opacity across a scroll range (Spec 38 §4.3).
 *
 * Reads both signals, because either alone has a blind spot: the parsed attribute is absent on a block whose fx
 * arrived pre-baked in stored markup (a converter clone or pattern), and the markup scan is absent on a dynamic block
 * being evaluated before its data attributes are injected.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $attrs         Parsed block attributes.
 * @return bool True when the entrance animation must be suppressed.
 */
function sgs_fx_owns_scroll_transform( string $block_content, array $attrs ): bool {
	$effect = $attrs['fx'] ?? '';
	if ( \is_string( $effect ) && '' !== $effect ) {
		return sgs_effect_owns_scroll_transform( $effect );
	}

	// One element can list several effects, space-separated (`Sgs_Motion_Fx_Emitter`); any owner counts.
	if ( ! \preg_match_all( '/data-sgs-fx="([a-z0-9-]+(?: [a-z0-9-]+)*)"/i', $block_content, $m ) ) {
		return false;
	}
	foreach ( \explode( ' ', \implode( ' ', $m[1] ) ) as $listed ) {
		if ( sgs_effect_owns_scroll_transform( $listed ) ) {
			return true;
		}
	}
	return false;
}

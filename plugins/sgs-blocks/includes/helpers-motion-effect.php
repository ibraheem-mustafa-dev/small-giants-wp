<?php
/**
 * Read a block's stored motion effect layers in a render (Spec 38A FR-38A-44).
 *
 * A block whose markup depends on an effect (the marquee needs its items inside a set the runtime clones) asks
 * whether the effect is stored on the block, rather than reading any legacy attribute.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_motion_root_has_effect' ) ) {
	/**
	 * Whether the block's root element stores an effect layer of the given slug.
	 *
	 * @param array<string,mixed> $attributes The block's attributes.
	 * @param string              $effect     Effect slug, for example `marquee`.
	 * @return bool
	 */
	function sgs_motion_root_has_effect( array $attributes, string $effect ): bool {
		$layers = $attributes['sgsMotion']['elements']['root']['effects'] ?? null;
		if ( ! is_array( $layers ) ) {
			return false;
		}
		foreach ( $layers as $layer ) {
			if ( is_array( $layer ) && ( $layer['effect'] ?? null ) === $effect ) {
				return true;
			}
		}
		return false;
	}
}

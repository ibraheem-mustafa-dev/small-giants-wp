<?php
/**
 * Force-solid header background — the merge entry for sgs/site-header.
 *
 * "Force solid" (`contrastSafe` = `force-solid` at a tier) means the header is
 * a SOLID colour at that tier: its own resting background, or the theme's
 * surface token when it has none. It is one more behaviour in
 * `sgs_merge_tri_state_declarations()`, the single writer of `background`, not a
 * competing rule: an emission outside that merge loses to its `!important`
 * declarations, and a wider tier's transparent `background` is cancelled there
 * with `background:revert !important`, which would otherwise wipe the block's
 * own fill at the force-solid tier and leave the page showing through.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-responsive.php';

if ( ! function_exists( 'sgs_header_force_solid_tiers' ) ) {
	/**
	 * Per-tier 'on' / 'off' for force-solid, through the canonical tier cascade.
	 *
	 * @param array $contrast_safe The `contrastSafe` attribute (a per-tier object).
	 * @return array<string,string> desktop|tablet|mobile => 'on'|'off'.
	 */
	function sgs_header_force_solid_tiers( $contrast_safe ) {
		$tiers = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$resolved       = sgs_resolve_tier( $contrast_safe, $tier, 'none' );
			$tiers[ $tier ] = ( 'force-solid' === $resolved['value'] ) ? 'on' : 'off';
		}
		return $tiers;
	}
}

if ( ! function_exists( 'sgs_header_force_solid_background' ) ) {
	/**
	 * The `background` shorthand a force-solid tier paints.
	 *
	 * The header's own colour when set, else the theme surface token, so the
	 * result is never transparent. A gradient the header carries is layered
	 * over that colour (the colour stays as the final layer).
	 *
	 * @param array       $attributes        Block attributes.
	 * @param string|null $resolved_gradient The header's own resting gradient,
	 *                     already resolved by render.php via
	 *                     `sgs_css_gradient_value()`/`sgs_background_paint_value()`
	 *                     (empty string when none/invalid). Passing it in avoids
	 *                     resolving the same attribute twice; omitting it (the
	 *                     default) reproduces this function's original, standalone
	 *                     resolution exactly — no behaviour change either way.
	 * @return string A value for the CSS `background` shorthand.
	 */
	function sgs_header_force_solid_background( $attributes, $resolved_gradient = null ) {
		$colour = isset( $attributes['backgroundColour'] )
			? sgs_colour_value( (string) $attributes['backgroundColour'] )
			: '';
		if ( '' === $colour ) {
			$colour = 'var(--wp--preset--color--surface,#ffffff)';
		}
		$gradient = null !== $resolved_gradient
			? $resolved_gradient
			: ( isset( $attributes['backgroundColourGradient'] )
				? sgs_css_gradient_value( (string) $attributes['backgroundColourGradient'] )
				: '' );
		return '' !== $gradient ? $gradient . ',' . $colour : $colour;
	}
}

if ( ! function_exists( 'sgs_header_force_solid_entry' ) ) {
	/**
	 * The `sgs_merge_tri_state_declarations()` entry for force-solid.
	 *
	 * @param array       $attributes        Block attributes.
	 * @param string|null $resolved_gradient See `sgs_header_force_solid_background()`.
	 * @return array{raw: array<string,string>, props: array<string,string>}
	 */
	function sgs_header_force_solid_entry( $attributes, $resolved_gradient = null ) {
		$contrast = isset( $attributes['contrastSafe'] ) ? $attributes['contrastSafe'] : array();
		return array(
			'raw'   => sgs_header_force_solid_tiers( $contrast ),
			'props' => array( 'background' => sgs_header_force_solid_background( $attributes, $resolved_gradient ) ),
		);
	}
}

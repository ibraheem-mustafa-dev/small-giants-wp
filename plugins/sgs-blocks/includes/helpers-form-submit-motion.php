<?php
/**
 * The sgs/form submit button's resting shadow, hover shadow and hover lift.
 *
 * Three settings on the form block, all empty by default (an untouched form prints nothing here):
 * `submitShadow` (+ `submitShadowColour`) the resting shadow, `submitShadowHover` /
 * `submitShadowColourHover` and `submitShadowLiftOnHover` the hover
 * shadow (an explicit hover shadow, or the automatic lift of the resting one), and
 * `submitLiftHover` the hover lift in px. The shadow goes through the shared composers
 * (sgs_shadow_decls) and the lift through sgs_hover_lift_rule(), the same two helpers sgs/button
 * uses. JS twin for the editor preview: src/blocks/form/submit-motion-preview.js.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-hover-lift.php';
require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-shadow-hover.php';
require_once __DIR__ . '/helpers-colour-variants.php';

if ( ! function_exists( 'sgs_form_submit_shadow_map' ) ) {
	/**
	 * The submit button's shadow attribute names for sgs_shadow_decls().
	 *
	 * @return array<string,string> The map.
	 */
	function sgs_form_submit_shadow_map(): array {
		return array(
			'base'         => 'submitShadow',
			'colour'       => 'submitShadowColour',
			'hover'        => 'submitShadowHover',
			'hover_colour' => 'submitShadowColourHover',
			'lift_prefix'  => 'submit',
		);
	}
}

if ( ! function_exists( 'sgs_form_submit_motion_css' ) ) {
	/**
	 * The scoped CSS for the submit button's shadow and lift.
	 *
	 * @param string $selector   The submit button's scoped selector.
	 * @param array  $attributes Block attributes (verbatim).
	 * @param string $block_name Registered block name, for the type-level shadow-lift gate.
	 * @return string CSS rules, or '' when no shadow and no lift is set.
	 */
	function sgs_form_submit_motion_css( string $selector, array $attributes, string $block_name = '' ): string {
		$shadow = sgs_shadow_decls( $attributes, sgs_form_submit_shadow_map(), $block_name );
		$lift   = sgs_hover_lift_px( $attributes['submitLiftHover'] ?? 0 );
		if ( ! $shadow['normal'] && ! $shadow['hover'] && $lift <= 0 ) {
			return '';
		}

		// The stylesheet's own transition covers colour and opacity only; add the two properties
		// this motion paints, and drop the transition for visitors who ask for reduced motion (the
		// lift rule itself only prints for visitors who have not).
		$css  = $selector . '{transition:background-color .2s,opacity .2s,translate .2s,box-shadow .2s;}';
		$css .= '@media (prefers-reduced-motion:reduce){' . $selector . '{transition:none;}}';
		if ( $shadow['normal'] ) {
			$css .= $selector . '{' . implode( ';', $shadow['normal'] ) . ';}';
		}
		if ( $shadow['hover'] ) {
			$css .= sgs_hover_state_rules( $selector, implode( ';', $shadow['hover'] ) );
		}
		return $css . sgs_hover_lift_rule( $selector, $lift );
	}
}

<?php
/**
 * The pressed look of an sgs/button (Spec 32 FR-32-19): `buttonPresets.{variant}.active-transform` and
 * `buttonPresets.{variant}.active-shadow`.
 *
 * While the button is pressed (`:active`) it takes its variant's `active-transform` and `active-shadow`, else the
 * `default` variant's. The `link` style never presses (it ignores the site-wide default lift too); a preset-less
 * button takes the `default` variant only.
 *
 * Why render.php prints this rather than style.css: a var() fallback cannot say "keep the value the button already
 * has". A preset that sets no `active-shadow` must keep the button's resting or hover shadow while pressed (a
 * per-instance shadow the stylesheet never sees), so the declaration exists only when the token does. This reads the
 * token's PRESENCE from the global settings; the value itself is painted through the token's own custom property
 * (`--wp--custom--button-presets--{variant}--{role}`), so the CSS never carries a raw snapshot string.
 *
 * Touch: WebKit applies `:active` on a tap only when the document has a touch-related listener; the always-on
 * `assets/js/touch-input.js` window `pointerdown` listener is one (WebKit `EventNames.json` puts `pointerdown` in the
 * TouchRelated category), and Chromium applies `:active` on a tap by itself.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-global-settings.php';
require_once __DIR__ . '/helpers-shadow-hover.php';

/** The variants whose own press tokens a button reads (style.css `.sgs-button--{variant}`). */
const SGS_BUTTON_PRESS_VARIANTS = array( 'primary', 'secondary', 'outline' );

if ( ! function_exists( 'sgs_button_press_token' ) ) {
	/**
	 * The custom property that carries one press role for a button style, or `''` when no preset sets it.
	 *
	 * @param string $variant The button's style (`inheritStyle`): a preset slug, `link`, or anything else (custom).
	 * @param string $role    `active-transform` or `active-shadow`.
	 * @return string e.g. `--wp--custom--button-presets--primary--active-shadow`, or `''`.
	 */
	function sgs_button_press_token( string $variant, string $role ): string {
		static $presets = null;
		if ( null === $presets ) {
			$presets = function_exists( 'sgs_global_custom_setting' ) ? sgs_global_custom_setting( 'buttonPresets' ) : array();
			$presets = is_array( $presets ) ? $presets : array();
		}
		if ( 'link' === $variant ) {
			return '';
		}
		$candidates = in_array( $variant, SGS_BUTTON_PRESS_VARIANTS, true ) ? array( $variant, 'default' ) : array( 'default' );
		foreach ( $candidates as $slug ) {
			$value = $presets[ $slug ][ $role ] ?? null;
			if ( is_string( $value ) && '' !== trim( $value ) ) {
				return '--wp--custom--button-presets--' . $slug . '--' . $role;
			}
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_button_press_rule_for' ) ) {
	/**
	 * The `:active` rule for one button-shaped element, or `''` when no preset sets a press role for its style.
	 *
	 * The caller passes a selector that already out-ranks the element's own hover and `:focus-visible` rules and the
	 * stylesheet's hover rule (double the instance class: `.uid.uid .element`, so the press is 0,4,0 with `:active`),
	 * whatever the document order. The pressed shadow is also handed to the focus system as `--sgs-focus-under`, so a
	 * ring drawn while the element is pressed composes over the pressed shadow. Reduced motion suppresses the pressed
	 * transform and keeps the pressed shadow: sgs/button does it with a per-instance rule (`transform:none !important`),
	 * every other caller passes `$reduced_motion_twin` so the rule carries its own.
	 *
	 * @param string $selector            The element's selector, without the `:active` state.
	 * @param string $variant             The element's style (a preset slug, `link`, or anything else for custom).
	 * @param string $guard               Pseudo-classes appended after `:active` (for example `:not([disabled])`).
	 * @param bool   $reduced_motion_twin Append a `prefers-reduced-motion` rule that removes the pressed transform.
	 * @return string
	 */
	function sgs_button_press_rule_for( string $selector, string $variant, string $guard = '', bool $reduced_motion_twin = false ): string {
		$decls     = array();
		$transform = sgs_button_press_token( $variant, 'active-transform' );
		if ( '' !== $transform ) {
			$decls[] = 'transform:var(' . $transform . ')';
		}
		$shadow = sgs_button_press_token( $variant, 'active-shadow' );
		if ( '' !== $shadow ) {
			// sgs-shadow-fallback: a momentary pressed state; the resting shadow rule (sgs_shadow_decls) carries the forced-colours outline.
			$decls = array_merge( $decls, sgs_focus_under_decls( array( 'box-shadow:var(' . $shadow . ')' ) ) );
		}
		if ( ! $decls || '' === trim( $selector ) ) {
			return '';
		}
		$rule = $selector . ':active' . $guard . '{' . implode( ';', $decls ) . ';}';
		if ( $reduced_motion_twin && '' !== $transform ) {
			$rule .= '@media(prefers-reduced-motion:reduce){' . $selector . ':active' . $guard . '{transform:none;}}';
		}
		return $rule;
	}
}

if ( ! function_exists( 'sgs_button_press_rule' ) ) {
	/**
	 * The `:active` rule for one sgs/button, or `''` when no preset sets a press role for its style.
	 *
	 * The selector doubles the instance class (0,4,0 with `:active`), so the press out-ranks the button's own
	 * per-instance hover and `:focus-visible` rules (0,3,0) and the stylesheet's hover rule (0,2,0) whatever the
	 * document order. See sgs_button_press_rule_for() for the pressed shadow and reduced-motion behaviour.
	 *
	 * @param string $uid     The button's instance class.
	 * @param string $variant The button's style (`inheritStyle`).
	 * @return string
	 */
	function sgs_button_press_rule( string $uid, string $variant ): string {
		$uid = sanitize_html_class( $uid );
		return sgs_button_press_rule_for( ".{$uid}.{$uid}.sgs-button", $variant );
	}
}

if ( ! function_exists( 'sgs_button_press_rules_by_variant' ) ) {
	/**
	 * The `:active` rules for every `.sgs-button--{variant}` inside a scope, one per variant whose preset sets a press role.
	 *
	 * For a block whose CTA variant is chosen by class (product-card's two CTAs carry `sgs-button--primary`,
	 * `--secondary` or `--outline`), so the render does not need to know which variant each CTA wears.
	 *
	 * @param string $scope The instance class (without the dot); the selector doubles it.
	 * @return string
	 */
	function sgs_button_press_rules_by_variant( string $scope ): string {
		$scope = sanitize_html_class( $scope );
		$css   = '';
		foreach ( SGS_BUTTON_PRESS_VARIANTS as $variant ) {
			$css .= sgs_button_press_rule_for( ".{$scope}.{$scope} .sgs-button--{$variant}", $variant, '', true );
		}
		return $css;
	}
}

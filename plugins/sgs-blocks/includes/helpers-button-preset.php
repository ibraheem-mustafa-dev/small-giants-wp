<?php
/**
 * One button preset as scoped CSS: the resting look, the hover colours, the hover lift and the timing.
 *
 * WooCommerce's buttons are plain `<button>` and `.wp-element-button` elements, not `sgs/button`, so
 * `Sgs_Button_Hover_Parts` and the button stylesheet never reach them. Every place that paints a WooCommerce button from
 * a preset (the account forms, the cart and checkout buttons) prints it through this helper, so all of them get the same
 * colours, 3px lift and 0.25s timing, each token falling back to that default when the site's preset leaves it unset.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_button_preset_css' ) ) {
	/**
	 * The CSS for one preset on one selector.
	 *
	 * @param string $selector  Fully scoped selector (a comma list is allowed).
	 * @param string $preset    'primary' or 'secondary'; anything else prints nothing.
	 * @param bool   $resting   True to print the resting look too; false when the theme already paints it.
	 * @param bool   $colours   True to print the hover colours too; false for the lift and timing alone.
	 * @return string CSS text; '' for an unknown preset.
	 */
	function sgs_button_preset_css( string $selector, string $preset, bool $resting = true, bool $colours = true ): string {
		if ( '' === $selector || ! in_array( $preset, array( 'primary', 'secondary' ), true ) ) {
			return '';
		}
		$v     = '--wp--custom--button-presets--' . $preset . '--';
		$time  = 'var(' . $v . 'hover-transition,0.25s) var(' . $v . 'hover-easing,ease)';
		$parts = array( 'background-color', 'color', 'border-color', 'box-shadow', 'transform', 'scale', 'rotate' );
		$trans = array();
		foreach ( $parts as $part ) {
			$trans[] = $part . ' ' . $time;
		}
		$hover = implode( ',', array_map( static fn( string $one ): string => trim( $one ) . ':hover', explode( ',', $selector ) ) );
		$css   = '';
		if ( $resting ) {
			$css .= $selector . '{background:var(' . $v . 'background);color:var(' . $v . 'text);border-style:solid;'
				. 'border-width:var(' . $v . 'border-width,1px);border-color:var(' . $v . 'border,transparent);'
				. 'border-radius:var(' . $v . 'border-radius,0);font-weight:var(' . $v . 'font-weight,inherit);'
				. 'text-transform:var(' . $v . 'text-transform,none);letter-spacing:var(' . $v . 'letter-spacing,normal);}';
		}
		$css .= $selector . '{transition:' . implode( ',', $trans ) . ';}';
		$hover_colours = $colours
			? 'background:var(' . $v . 'hover-background,var(' . $v . 'background));'
				. 'color:var(' . $v . 'hover-text,var(' . $v . 'text));'
				. 'border-color:var(' . $v . 'hover-border,var(' . $v . 'border,transparent));'
			: '';
		if ( '' !== $hover_colours ) {
			$css .= $hover . '{' . $hover_colours . '}';
		}
		// The lift is motion: the touch guard keeps it off touch screens when the site chose "Desktop only".
		$lift = 'transform:var(' . $v . 'hover-lift,translateY(-3px));scale:var(' . $v . 'hover-scale,none);rotate:var(' . $v . 'hover-rotate,none);';
		$css .= function_exists( 'sgs_hover_guarded_rule' ) ? sgs_hover_guarded_rule( $hover, $lift ) : $hover . '{' . $lift . '}';
		$css .= '@media (prefers-reduced-motion: reduce){' . $selector . '{transition:none;}' . $hover . '{transform:none;scale:none;rotate:none;}}';
		return $css;
	}
}

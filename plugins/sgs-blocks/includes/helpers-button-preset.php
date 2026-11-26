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

require_once __DIR__ . '/helpers-button-preset-names.php';

if ( ! function_exists( 'sgs_button_preset_kit_rules' ) ) {
	/**
	 * The rules of one preset for the built-in button kit, without the reduced-motion twin (`sgs_button_preset_css( ..., $kit )` adds it).
	 *
	 * Every role prints through its own custom property, `--wp--custom--button-presets--{preset}--{role}`. The resting look is the
	 * starters' set (colours, border, radius, weight, case, letter spacing) plus the roles a button's own CSS can carry and a preset
	 * may leave unset, which print only where the site sets them (`sgs_button_preset_sets()`): padding, font size, min height and
	 * the shadow, the shadow also as `--sgs-focus-under` (the focus ring replaces `box-shadow`). One hover rule holds the hover
	 * colours, the hover shadow and the lift, behind the touch guard, with a `:focus-visible` twin (`sgs_hover_state_rules()`).
	 * The lift and the timing follow Spec 32 FR-32-19: the preset's token, then `default`'s, then none for the lift, `0.18s` and
	 * `ease` for the timing, each colour and shadow easing falling back to the move easing; the timing is set once in the custom
	 * properties `sgs/button`'s preset classes use (`--sgs-btn-transition-duration`, `-easing`, `-easing-colour`, `-easing-shadow`).
	 *
	 * @param string $selector Scoped selector (a comma list is allowed).
	 * @param string $preset   A resolved preset slug.
	 * @param bool   $resting  Print the resting look.
	 * @param bool   $colours  Print the hover colours.
	 * @return string CSS text.
	 */
	function sgs_button_preset_kit_rules( string $selector, string $preset, bool $resting, bool $colours ): string {
		require_once __DIR__ . '/helpers-hover-state.php';
		require_once __DIR__ . '/helpers-shadow-hover.php';
		$v     = '--wp--custom--button-presets--' . $preset . '--';
		$d     = '--wp--custom--button-presets--default--';
		// The timing, resolved once into the custom properties `sgs/button`'s own preset classes set (button/style.css), so the
		// seven transitions read a short name and not the whole fallback chain each.
		$decls = array(
			'--sgs-btn-transition-duration:var(' . $v . 'hover-transition,var(' . $d . 'hover-transition,0.18s))',
			'--sgs-btn-transition-easing:var(' . $v . 'hover-easing,var(' . $d . 'hover-easing,var(--wp--custom--easing--ease,ease)))',
			'--sgs-btn-transition-easing-colour:var(' . $v . 'hover-easing-colour,var(' . $d . 'hover-easing-colour,var(--sgs-btn-transition-easing)))',
			'--sgs-btn-transition-easing-shadow:var(' . $v . 'hover-easing-shadow,var(' . $d . 'hover-easing-shadow,var(--sgs-btn-transition-easing)))',
		);
		$trans = array();
		foreach ( array( 'background-color', 'color', 'border-color' ) as $part ) {
			$trans[] = $part . ' var(--sgs-btn-transition-duration) var(--sgs-btn-transition-easing-colour)';
		}
		$trans[] = 'box-shadow var(--sgs-btn-transition-duration) var(--sgs-btn-transition-easing-shadow)';
		foreach ( array( 'transform', 'scale', 'rotate' ) as $part ) {
			$trans[] = $part . ' var(--sgs-btn-transition-duration) var(--sgs-btn-transition-easing)';
		}
		$decls[] = 'transition:' . implode( ',', $trans );
		if ( $resting ) {
			$decls = array_merge(
				array(
					'background:var(' . $v . 'background)',
					'color:var(' . $v . 'text)',
					'border-style:solid;border-width:var(' . $v . 'border-width,1px)',
					'border-color:var(' . $v . 'border,transparent)',
					'border-radius:var(' . $v . 'border-radius,0)',
					'font-weight:var(' . $v . 'font-weight,inherit)',
					'text-transform:var(' . $v . 'text-transform,none)',
					'letter-spacing:var(' . $v . 'letter-spacing,normal)',
				),
				$decls
			);
			// Roles a button's own stylesheet carries: printed only where the site sets them, so an unset role keeps the button's value.
			foreach ( array( 'padding', 'font-size', 'min-height' ) as $role ) {
				if ( sgs_button_preset_sets( $preset, $role ) ) {
					$decls[] = $role . ':var(' . $v . $role . ')';
				}
			}
			if ( sgs_button_preset_sets( $preset, 'shadow' ) ) {
				// sgs-shadow-fallback: printed only where the site sets the token, so no fallback shadow exists.
				$decls = array_merge( $decls, sgs_focus_under_decls( array( 'box-shadow:var(' . $v . 'shadow)' ) ) );
			}
		}
		$css = $selector . '{' . implode( ';', $decls ) . ';}';
		$hover = '';
		if ( $colours ) {
			$hover = 'background:var(' . $v . 'hover-background,var(' . $v . 'background));'
				. 'color:var(' . $v . 'hover-text,var(' . $v . 'text));'
				. 'border-color:var(' . $v . 'hover-border,var(' . $v . 'border,transparent));';
			if ( sgs_button_preset_sets( $preset, 'hover-shadow' ) ) {
				// sgs-shadow-fallback: printed only where the site sets the token, so no fallback shadow exists.
				$hover .= implode( ';', sgs_focus_under_decls( array( 'box-shadow:var(' . $v . 'hover-shadow)' ) ) ) . ';';
			}
		}
		// The lift is motion, so it shares the hover rule and its touch guard: the preset's token, then `default`'s, then none.
		$hover .= 'transform:var(' . $v . 'hover-lift,var(' . $d . 'hover-lift,none));'
			. 'scale:var(' . $v . 'hover-scale,var(' . $d . 'hover-scale,none));'
			. 'rotate:var(' . $v . 'hover-rotate,var(' . $d . 'hover-rotate,none));';
		return $css . sgs_hover_state_rules( $selector, $hover );
	}
}

if ( ! function_exists( 'sgs_button_preset_css' ) ) {
	/**
	 * The CSS for one preset on one selector.
	 *
	 * @param string $selector  Fully scoped selector (a comma list is allowed).
	 * @param string $preset    'primary' or 'secondary'; on a site that opted in to named presets (`sgs_button_presets_open`), any name its snapshot carries too; anything else prints nothing.
	 * @param bool   $resting   True to print the resting look too; false when the theme already paints it.
	 * @param bool   $colours   True to print the hover colours too; false for the lift and timing alone.
	 * @param bool   $outline   True to print `outline` too (the built-in button kit, `sgs_button_kit_css`, asks for it). False keeps the WooCommerce callers' output as it always was: `outline` prints nothing.
	 * @param bool   $kit       True for the built-in button kit (`sgs_button_kit_shared()`): the key set `sgs/button`'s variant class paints, and its motion rules (`sgs_button_preset_kit_rules()`). False keeps every other caller byte for byte as it was.
	 * @return string CSS text; '' for an unknown preset.
	 */
	function sgs_button_preset_css( string $selector, string $preset, bool $resting = true, bool $colours = true, bool $outline = false, bool $kit = false ): string {
		// `outline` prints only when the caller asks ($outline): the WooCommerce callers never printed it, so a site that
		// opts in with only the starters renders exactly as before.
		$named = sgs_button_presets_open() ? sgs_button_preset_resolve( $preset ) : '';
		if ( '' !== $named && ( 'outline' !== $named || $outline ) ) {
			$preset = $named;
		} elseif ( ! in_array( $preset, $outline ? array( 'primary', 'secondary', 'outline' ) : array( 'primary', 'secondary' ), true ) ) {
			return '';
		}
		if ( '' === $selector ) {
			return '';
		}
		$v     = '--wp--custom--button-presets--' . $preset . '--';
		if ( $kit ) {
			// Reduced motion drops the transition and the lift, on hover and on keyboard focus (the lift shares both).
			return sgs_button_preset_kit_rules( $selector, $preset, $resting, $colours )
				. '@media (prefers-reduced-motion: reduce){' . $selector . '{transition:none;}' . sgs_hover_state_rules( $selector, 'transform:none;scale:none;rotate:none;' ) . '}';
		}
		$time  ='var(' . $v . 'hover-transition,0.25s) var(' . $v . 'hover-easing,ease)';
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
				. 'text-transform:var(' . $v . 'text-transform,none);letter-spacing:var(' . $v . 'letter-spacing,normal);'
				// sgs-shadow-fallback: printed only where the opted-in snapshot sets the token, so no fallback shadow exists.
				. ( sgs_button_preset_has_role( $preset, 'shadow' ) ? 'box-shadow:var(' . $v . 'shadow);' : '' ) . '}';
		}
		$css .= $selector . '{transition:' . implode( ',', $trans ) . ';}';
		$hover_colours = $colours
			? 'background:var(' . $v . 'hover-background,var(' . $v . 'background));'
				. 'color:var(' . $v . 'hover-text,var(' . $v . 'text));'
				. 'border-color:var(' . $v . 'hover-border,var(' . $v . 'border,transparent));'
				// sgs-shadow-fallback: printed only where the opted-in snapshot sets the token, so no fallback shadow exists.
				. ( sgs_button_preset_has_role( $preset, 'hover-shadow' ) ? 'box-shadow:var(' . $v . 'hover-shadow);' : '' )
			: '';
		if ( '' !== $hover_colours ) {
			$css .= sgs_hover_guarded_rule( $hover, $hover_colours );
		}
		// The colours and the lift follow the hover-on-touch contract (Spec 38A FR-38A-17): a mouse hover, or a finger on
		// the button.
		$lift = 'transform:var(' . $v . 'hover-lift,translateY(-3px));scale:var(' . $v . 'hover-scale,none);rotate:var(' . $v . 'hover-rotate,none);';
		$css .= function_exists( 'sgs_hover_guarded_rule' ) ? sgs_hover_guarded_rule( $hover, $lift ) : $hover . '{' . $lift . '}';
		$css .= '@media (prefers-reduced-motion: reduce){' . $selector . '{transition:none;}' . $hover . '{transform:none;scale:none;rotate:none;}}';
		return $css;
	}
}

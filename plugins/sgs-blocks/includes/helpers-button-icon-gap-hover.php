<?php
/**
 * The hover gap of an sgs/button (`iconGapHover`): the flex gap between the label and the icon grows (or shrinks) on
 * hover, so the arrow slides along the row and the button's own box, which carries a bottom border or a background,
 * widens with it. A text link whose underline is the button's bottom border therefore stretches under the whole
 * content, label and arrow, as the gap changes.
 *
 * Per device, like `iconGap`: tablet takes desktop's value and mobile takes tablet's unless set. Each tier prints a
 * touch-safe hover and focus pair (sgs_hover_state_rules), wrapped in the shared tier query.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-hover-state.php';

if ( ! function_exists( 'sgs_button_icon_gap_hover_values' ) ) {
	/**
	 * The effective hover gap per tier, sanitised; a tier that equals the one above it is dropped.
	 *
	 * @param mixed $tiers The `iconGapHover` attribute: {desktop,tablet,mobile} of CSS lengths (a bare number is px).
	 * @return array<string,string> Tier name => CSS length, only for tiers that print a rule.
	 */
	function sgs_button_icon_gap_hover_values( $tiers ): array {
		if ( ! is_array( $tiers ) ) {
			return array();
		}
		$out       = array();
		$effective = null;
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$raw   = $tiers[ $tier ] ?? null;
			$value = sgs_responsive_format_atom_value( $raw, 'px', 'float', null );
			if ( null === $value ) {
				continue;
			}
			if ( $value !== $effective ) {
				$out[ $tier ] = $value;
			}
			$effective = $value;
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_button_icon_gap_hover_css' ) ) {
	/**
	 * The hover gap rules for one button.
	 *
	 * @param string $selector The button's scoped selector (`.{uid}.sgs-button`).
	 * @param mixed  $tiers    The `iconGapHover` attribute.
	 * @return string CSS text; '' when no tier is set.
	 */
	function sgs_button_icon_gap_hover_css( string $selector, $tiers ): string {
		$css = '';
		foreach ( sgs_button_icon_gap_hover_values( $tiers ) as $tier => $value ) {
			$rule = sgs_hover_state_rules( $selector, 'gap:' . $value );
			$css .= 'desktop' === $tier ? $rule : SGS_Breakpoints::media( $tier ) . '{' . $rule . '}';
		}
		return $css;
	}
}

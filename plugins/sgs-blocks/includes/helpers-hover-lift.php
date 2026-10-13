<?php
/**
 * The hover lift: raise an element by N px on hover and keyboard focus.
 *
 * One owner for the `translate:0 -Npx` declaration that sgs/button and the sgs/form submit
 * button both print, so the clamp (0 to 24 px; 0 is off) and the declaration shape live in one
 * place. The lift paints the independent `translate` property rather than `transform`, so it
 * composes with a hover scale. The whole lift sits inside `@media (prefers-reduced-motion:no-preference)`,
 * so a visitor who asks for reduced motion gets no lift in any state (hover, keyboard focus or group
 * hover); a reduced-motion reset printed elsewhere cannot out-rank the more specific `:hover` and
 * `:focus-visible` rules, so the gate lives here. JS twin for the editor previews:
 * src/utils/hover-lift.js.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-hover-state.php';

const SGS_HOVER_LIFT_MAX_PX = 24;

/** The media query every lift rule sits inside. */
const SGS_HOVER_LIFT_MOTION_MEDIA = '@media (prefers-reduced-motion:no-preference)';

if ( ! function_exists( 'sgs_hover_lift_px' ) ) {
	/**
	 * The lift distance as a whole number of pixels, clamped to 0..SGS_HOVER_LIFT_MAX_PX.
	 *
	 * @param mixed $raw Stored attribute value (a number, a numeric string or nothing).
	 * @return int Pixels; 0 means no lift.
	 */
	function sgs_hover_lift_px( $raw ): int {
		return min( SGS_HOVER_LIFT_MAX_PX, max( 0, (int) $raw ) );
	}
}

if ( ! function_exists( 'sgs_hover_lift_decls' ) ) {
	/**
	 * The declarations a lift paints on hover and focus.
	 *
	 * @param int  $px              Whole pixels from sgs_hover_lift_px(); 0 returns ''.
	 * @param bool $reset_transform Also print `transform:none`, so an inherited default lift token
	 *                              (a preset's `transform`) does not stack with this explicit lift.
	 * @return string Semicolon-joined declarations, or '' when there is no lift.
	 */
	function sgs_hover_lift_decls( int $px, bool $reset_transform = false ): string {
		if ( $px <= 0 ) {
			return '';
		}
		$decls = 'translate:0 -' . $px . 'px';
		return $reset_transform ? $decls . ';transform:none' : $decls;
	}
}

if ( ! function_exists( 'sgs_hover_lift_rule' ) ) {
	/**
	 * The complete touch-safe hover and focus rule pair for a lift, gated on motion being allowed.
	 *
	 * @param string $selector        Base selector (no `:hover` suffix).
	 * @param mixed  $raw             Stored lift attribute value.
	 * @param bool   $reset_transform See sgs_hover_lift_decls().
	 * @return string The rule pair from sgs_hover_state_rules() inside the no-preference media query,
	 *                or '' when the lift is 0.
	 */
	function sgs_hover_lift_rule( string $selector, $raw, bool $reset_transform = false ): string {
		$rules = sgs_hover_state_rules( $selector, sgs_hover_lift_decls( sgs_hover_lift_px( $raw ), $reset_transform ) );
		return '' === $rules ? '' : SGS_HOVER_LIFT_MOTION_MEDIA . '{' . $rules . '}';
	}
}

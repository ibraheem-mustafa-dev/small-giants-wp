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

if ( ! function_exists( 'sgs_hover_lift_distance_px' ) ) {
	/**
	 * A built-in button's lift distance setting (`{prefix}HoverLiftDistance`) as whole pixels.
	 *
	 * The setting is one length in px, stored as a string (`2px`; a bare `2` and a number read the same). Unset (null, ''), a
	 * negative value, another unit or anything else unreadable is null, so a stored value this does not understand prints nothing
	 * and the site's own lift stands. A set value is clamped to 0..SGS_HOVER_LIFT_MAX_PX; 0 is a real answer (no movement).
	 *
	 * @param mixed $raw Stored attribute value.
	 * @return int|null Pixels, or null when the setting is unset or unreadable.
	 */
	function sgs_hover_lift_distance_px( $raw ): ?int {
		if ( is_int( $raw ) || is_float( $raw ) ) {
			$raw = (string) $raw;
		}
		if ( ! is_string( $raw ) || 1 !== preg_match( '/^\s*(\d+(?:\.\d+)?)\s*(?:px)?\s*$/i', $raw, $m ) ) {
			return null;
		}
		return sgs_hover_lift_px( (int) floor( (float) $m[1] ) );
	}
}

if ( ! function_exists( 'sgs_hover_lift_distance_rule' ) ) {
	/**
	 * The hover and keyboard-focus rule that makes a button's total movement exactly the setting, whatever lift the site's button
	 * token adds.
	 *
	 * A distance above 0 prints two rules on the same selector. `transform:none` cancels the stylesheet's own hover `transform` (a
	 * site's `hover-transform` token, a preset's lift), which would otherwise add to the movement; it is not gated on motion, so a
	 * visitor who asks for reduced motion gets no movement at all, the site's own included. `translate:0 -Npx` carries the movement,
	 * inside the no-preference motion media query as every lift does (it uses `translate`, which composes with a hover scale). A
	 * distance of 0 prints `transform:none;translate:none`, so the button does not move even where the site lifts it. The hover
	 * half stays behind the touch guard (`sgs_hover_state_rules()`), as the kit's other hover rules do.
	 *
	 * @param string $selector Base selector or comma list, with any state guard already chained (no `:hover` suffix).
	 * @param mixed  $raw      Stored `{prefix}HoverLiftDistance` value.
	 * @return string The rule pair, or '' when the setting is unset or unreadable.
	 */
	function sgs_hover_lift_distance_rule( string $selector, $raw ): string {
		$px = sgs_hover_lift_distance_px( $raw );
		if ( null === $px ) {
			return '';
		}
		if ( 0 === $px ) {
			return sgs_hover_state_rules( $selector, 'transform:none;translate:none;' );
		}
		return sgs_hover_state_rules( $selector, 'transform:none;' ) . sgs_hover_lift_rule( $selector, $px );
	}
}

<?php
/**
 * Shared motion easing vocabulary (Wave 3C U-5).
 *
 * One list of named speed curves read by every nav motion control: the burger
 * morph (`burgerMorphEasing`), the drawer entry and exit (`entryEasing`) and the
 * dropdown and mega panels (`submenuAnimationEasing`). The editor mirror is
 * `src/components/motion-easing.js`; both sides validate a custom curve the same
 * way, so a value the editor accepts is never refused server-side.
 *
 * Design: `.claude/reports/2026-09-24-u5-motion-design.md` section 3.3.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_motion_easing_values' ) ) {
	/**
	 * Every named easing value, in editor order. Mirrors the JSON enums.
	 *
	 * @return array<int,string>
	 */
	function sgs_motion_easing_values(): array {
		return array( 'ease', 'ease-out-css', 'ease-in-out', 'default', 'ease-out', 'quart-out', 'standard', 'drafts', 'ease-in', 'spring', 'linear', 'custom' );
	}
}

if ( ! function_exists( 'sgs_motion_valid_cubic_bezier' ) ) {
	/**
	 * Validate a hand-typed `cubic-bezier(x1, y1, x2, y2)` curve.
	 *
	 * Anchored end to end so a declaration breakout cannot slip past the four
	 * captured groups; `-?\d*\.?\d+` never matches an exponent. x1 and x2 (CSS's
	 * own constraint) are clamped to 0 to 1; y1 and y2 are free, because a spring
	 * overshoot legitimately exceeds 1.
	 *
	 * @param string $value The candidate curve string, verbatim.
	 * @return bool True when it is a real, in-range cubic-bezier() curve.
	 */
	function sgs_motion_valid_cubic_bezier( string $value ): bool {
		$pattern = '/^cubic-bezier\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/';
		if ( 1 !== preg_match( $pattern, trim( $value ), $matches ) ) {
			return false;
		}
		$x1 = (float) $matches[1];
		$x2 = (float) $matches[3];
		return $x1 >= 0.0 && $x1 <= 1.0 && $x2 >= 0.0 && $x2 <= 1.0;
	}
}

if ( ! function_exists( 'sgs_motion_easing_css' ) ) {
	/**
	 * Resolve a named easing (plus its custom curve) to a CSS easing function.
	 *
	 * `default`, `ease-out`, `ease-in` and `spring` are theme tokens
	 * (`--wp--custom--easing--*`); the rest are literals. An unknown value, or
	 * `custom` with an invalid curve, falls back to `$fallback`, never to a raw
	 * string reaching CSS.
	 *
	 * @param string $value    The named easing.
	 * @param string $custom   The custom curve, read only when `$value` is `custom`.
	 * @param string $fallback The CSS value for an unknown or invalid input.
	 * @return string A CSS `<easing-function>` value. Never empty.
	 */
	function sgs_motion_easing_css( string $value, string $custom = '', string $fallback = 'ease' ): string {
		$tokens = array( 'default', 'ease-out', 'ease-in', 'spring' );
		if ( in_array( $value, $tokens, true ) ) {
			return 'var(--wp--custom--easing--' . $value . ')';
		}
		$literals = array(
			'ease'         => 'ease',
			'ease-out-css' => 'ease-out',
			'ease-in-out'  => 'ease-in-out',
			'linear'       => 'linear',
			'quart-out'    => 'cubic-bezier(0.165, 0.84, 0.44, 1)',
			'standard'     => 'cubic-bezier(0.4, 0, 0.2, 1)',
			'drafts'       => 'cubic-bezier(0.16, 0.84, 0.32, 1)',
		);
		if ( isset( $literals[ $value ] ) ) {
			return $literals[ $value ];
		}
		if ( 'custom' === $value ) {
			$custom = trim( $custom );
			return sgs_motion_valid_cubic_bezier( $custom ) ? $custom : $fallback;
		}
		return $fallback;
	}
}

if ( ! function_exists( 'sgs_motion_ms' ) ) {
	/**
	 * Clamp a duration attribute to 0..$max whole milliseconds.
	 *
	 * @param mixed $raw     Raw attribute value.
	 * @param int   $default Value for a non-numeric input.
	 * @param int   $max     Upper bound.
	 * @return int
	 */
	function sgs_motion_ms( $raw, int $default, int $max = 3000 ): int {
		if ( ! is_numeric( $raw ) ) {
			return $default;
		}
		return (int) max( 0, min( $max, round( (float) $raw ) ) );
	}
}

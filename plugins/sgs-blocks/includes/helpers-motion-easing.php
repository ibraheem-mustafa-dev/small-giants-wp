<?php
/**
 * Shared motion easing vocabulary (Wave 3C U-5).
 *
 * One list of named speed curves read by every nav motion control: the burger
 * morph (`burgerMorphEasing`), the drawer entry and exit (`entryEasing`) and the
 * dropdown and mega panels (`submenuAnimationEasing`). A custom curve is validated
 * by the easing field type (`Sgs_Motion_Field_Types::is_valid_cubic_bezier()`);
 * the editor mirror is `src/components/MotionEasingControl.js`, which re-exports
 * `isValidCubicBezier` from `src/components/motion/field-types.js`, so a value
 * the editor accepts is never refused server-side.
 *
 * Design: `.claude/reports/2026-09-24-u5-motion-design.md` section 3.3.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// The motion field types (Spec 38A FR-38A-55), so every file that requires this one, standalone tests included, has them.
// The class check keeps a re-read of this file's text from another directory (an eval'd copy) from requiring a path
// relative to the wrong directory once the class is loaded.
if ( ! class_exists( '\SGS\Blocks\Motion\Sgs_Motion_Field_Types', false ) ) {
	require_once __DIR__ . '/motion/class-sgs-motion-field-types.php';
}

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
			return \SGS\Blocks\Motion\Sgs_Motion_Field_Types::is_valid_cubic_bezier( $custom ) ? $custom : $fallback;
		}
		return $fallback;
	}
}

if ( ! function_exists( 'sgs_flat_duration_ms' ) ) {
	/**
	 * Read a flat millisecond attribute (a nav, cart, icon or header duration) as whole milliseconds.
	 *
	 * A non-numeric value gives `$default`. A numeric value is rounded and held to 0..`$max`, so an out-of-range
	 * number is clamped, never dropped: the flat attributes have always painted their nearest legal value. The result
	 * is then checked against the duration field type narrowed to the same range
	 * (`Sgs_Motion_Field_Types::sanitise( 'duration', ... )`), the one definition of what a duration is.
	 *
	 * @param mixed $raw     Raw attribute value.
	 * @param int   $default Value for a non-numeric input.
	 * @param int   $max     Upper bound in milliseconds.
	 * @return int
	 */
	function sgs_flat_duration_ms( $raw, int $default, int $max = 3000 ): int {
		if ( ! is_numeric( $raw ) ) {
			return $default;
		}
		$ms   = (int) max( 0, min( $max, round( (float) $raw ) ) );
		$node = array(
			'minimum'     => 0,
			'maximum'     => $max,
			'x-sgs-range' => array(
				'min'  => 0,
				'max'  => $max,
				'unit' => 'ms',
			),
		);
		$kept = \SGS\Blocks\Motion\Sgs_Motion_Field_Types::sanitise( 'duration', $ms, $node );
		return is_int( $kept ) ? $kept : $default;
	}
}

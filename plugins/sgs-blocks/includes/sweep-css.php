<?php
/**
 * Directional sweep effect — shared angle-driven hover-wipe primitive.
 *
 * FR-41-37 follow-up (2026-09-13, design doc:
 * `.claude/reports/2026-09-13-directional-sweep-effect-design.md`, Approach A).
 * Generalises the hard-edge 2-colour "sweep" wipe (previously hard-coded to a
 * horizontal, bottom-glued band in `nav-menu-css.php`) to ANY angle, driven by
 * one server-computed CSS custom function — `linear-gradient(<angle>deg, …)`
 * at `background-size:200% 200%` — with the two `background-position`
 * endpoints computed here from `sin()`/`cos()` of the angle. Zero client JS.
 *
 * ⛔ NOT nav-menu-specific. This is a generic hover-effect primitive callable
 * by ANY block that wants a directional hard-edge wipe on a pseudo-element or
 * a border-colour band (button, card-grid border, etc.) — nav-menu is just
 * the first caller. Sibling to `includes/nav-menu-treatments.php` (the
 * TEXT-sweep emitter, which clips to glyphs via `background-clip:text` and is
 * therefore a different mechanism, deliberately not merged with this one).
 *
 * ── Angle convention — standard CSS gradient angle, degrees. ─────────────────
 * 0 = "to top", 90 = "to right", 180 = "to bottom", 270 = "to left" — the same
 * convention `@wordpress/components`' `AnglePickerControl` already uses for
 * gradient pickers, so the value round-trips unchanged from the inspector to
 * this function to the emitted CSS (`linear-gradient($angle deg, …)`).
 *
 * ── Backward-compatibility proof (verified by construction, not assumed). ────
 * The pre-existing bottom-edge border-sweep hard-coded `linear-gradient(to
 * right, …)` (== 90deg) with a swapped stop order + swapped position pair for
 * the `right-to-left` variant. This helper reproduces BOTH cardinal cases
 * pixel-for-pixel WITHOUT any stop-order swap, because the CSS angle itself
 * already encodes the direction: at 90deg (to right) the gradient's 0%-stop
 * (hover) sits on the image's LEFT half and its 100%-stop (normal) sits on
 * the RIGHT half; at 270deg (to left) that flips — the SAME fixed stop order
 * (hover first, normal last) now paints hover on the RIGHT and normal on the
 * LEFT. Combined with `sgs_directional_sweep_positions()`'s sign-derived
 * `rest`/`hover` position pair, 90deg reproduces the old `left-to-right`
 * output exactly (rest `100% 0`, hover `0 0`) and 270deg reproduces the old
 * `right-to-left` output exactly (rest `0 0`, hover `100% 0`) — verified by
 * hand-tracing the CSS gradient spec's stop-placement rule for both angles,
 * not by visual inspection alone.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_directional_sweep_positions' ) ) {
	/**
	 * Compute the two `background-position` endpoints for a directional sweep
	 * at the given CSS gradient angle, against a `background-size:200% 200%`
	 * doubled image.
	 *
	 * Only axis-aligned angles (0/90/180/270) are given a real sweep — an
	 * off-axis angle collapses to whichever axis has the larger trig
	 * component (a true diagonal wipe needs a filled shape, not an edge band;
	 * out of scope here per the design doc's Approach A).
	 *
	 * @param float $angle_deg CSS gradient angle in degrees (0 = to top).
	 * @return array{rest:string,hover:string} Two `"X% Y%"` position strings.
	 */
	function sgs_directional_sweep_positions( float $angle_deg ): array {
		$rad = deg2rad( $angle_deg );
		$dx  = round( sin( $rad ), 6 );
		$dy  = round( -cos( $rad ), 6 );

		$x_rest  = '0%';
		$x_hover = '0%';
		$y_rest  = '0%';
		$y_hover = '0%';

		if ( abs( $dx ) >= abs( $dy ) && 0.0 !== $dx ) {
			if ( $dx > 0 ) {
				$x_rest  = '100%';
				$x_hover = '0%';
			} else {
				$x_rest  = '0%';
				$x_hover = '100%';
			}
		} elseif ( 0.0 !== $dy ) {
			if ( $dy > 0 ) {
				$y_rest  = '100%';
				$y_hover = '0%';
			} else {
				$y_rest  = '0%';
				$y_hover = '100%';
			}
		}

		return array(
			'rest'  => $x_rest . ' ' . $y_rest,
			'hover' => $x_hover . ' ' . $y_hover,
		);
	}
}

if ( ! function_exists( 'sgs_directional_sweep_css' ) ) {
	/**
	 * Build the angle-driven directional-sweep gradient pieces.
	 *
	 * The caller owns the selector/pseudo-element and the transition —
	 * this function only computes the paint (gradient + size + the two
	 * position endpoints), exactly as `sgs_background_paint_decl()` and
	 * siblings own paint-only concerns elsewhere in this codebase.
	 *
	 * @param float  $angle_deg    CSS gradient angle in degrees.
	 * @param string $colour_rest  The resting-state colour (CSS colour value,
	 *                             already resolved — e.g. via sgs_colour_value()).
	 * @param string $colour_hover The hover-state colour, already resolved.
	 * @return array{gradient:string,background_size:string,rest_position:string,hover_position:string}
	 */
	function sgs_directional_sweep_css( float $angle_deg, string $colour_rest, string $colour_hover ): array {
		$positions = sgs_directional_sweep_positions( $angle_deg );

		return array(
			'gradient'        => 'linear-gradient(' . $angle_deg . 'deg,' . $colour_hover . ' 50%,' . $colour_rest . ' 50%)',
			'background_size' => '200% 200%',
			'rest_position'   => $positions['rest'],
			'hover_position'  => $positions['hover'],
		);
	}
}

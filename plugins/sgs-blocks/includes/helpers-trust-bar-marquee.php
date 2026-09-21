<?php
/**
 * Trust bar marquee: run the auto-scroll only below a device-tier breakpoint.
 *
 * `autoScroll` alone makes the badge row scroll at every viewport width. A draft
 * that shows a static, wrapping row on desktop and a marquee on phones needs the
 * scroll to switch on below a breakpoint. The breakpoint is one of the two
 * device-tier standards (768 / 1024), never a bespoke value; 0 keeps today's
 * behaviour (scroll at every width).
 *
 * Above the breakpoint the track wrapper becomes `display: contents`, so the
 * badges are laid out by the block's own wrapper (the same flex / grid / gap /
 * alignment attributes a non-scrolling trust bar uses) and the cloned tracks the
 * runtime adds are hidden. Below it the track is a `nowrap` flex row that view.js
 * animates. Everything is a media query in the block's scoped stylesheet; the
 * runtime only clones the track.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// The clamps and sgs_trust_bar_finite_number() live in helpers-trust-bar-item.php.
require_once __DIR__ . '/helpers-trust-bar-item.php';

if ( ! function_exists( 'sgs_trust_bar_marquee_below' ) ) {
	/**
	 * Normalise the `autoScrollBelow` attribute to one of the device-tier standards.
	 *
	 * @param mixed $raw Stored attribute value.
	 * @return int 0 (marquee at every width), 768 or 1024. Anything else is 0.
	 */
	function sgs_trust_bar_marquee_below( $raw ): int {
		$value = sgs_trust_bar_finite_number( $raw ) ? (int) $raw : 0;

		return in_array( $value, array( 768, 1024 ), true ) ? $value : 0;
	}
}

if ( ! function_exists( 'sgs_trust_bar_marquee_duration' ) ) {
	/**
	 * Normalise the custom marquee duration in seconds.
	 *
	 * @param mixed $raw Stored attribute value.
	 * @return float 0.0 when unset (the slow/medium/fast preset applies), else 2 to 300 seconds.
	 */
	function sgs_trust_bar_marquee_duration( $raw ): float {
		if ( ! sgs_trust_bar_finite_number( $raw ) || (float) $raw <= 0 ) {
			return 0.0;
		}

		return max( SGS_TRUST_BAR_SCROLL_DURATION_MIN, min( SGS_TRUST_BAR_SCROLL_DURATION_MAX, (float) $raw ) );
	}
}

if ( ! function_exists( 'sgs_trust_bar_seconds' ) ) {
	/**
	 * Format a duration in seconds for CSS ("30s", "12.5s"); locale-independent.
	 *
	 * @param float $seconds Duration.
	 * @return string CSS time value.
	 */
	function sgs_trust_bar_seconds( float $seconds ): string {
		return rtrim( rtrim( sprintf( '%.2F', $seconds ), '0' ), '.' ) . 's';
	}
}

if ( ! function_exists( 'sgs_trust_bar_marquee_css' ) ) {
	/**
	 * Scoped CSS for the marquee options. Empty when neither option is set, so a
	 * default block's output is unchanged.
	 *
	 * @param string $uid_scope Scoped selector for this instance, e.g. ".sgs-tb-3".
	 * @param int    $below     Normalised breakpoint (0, 768 or 1024).
	 * @param float  $duration  Normalised custom duration in seconds (0.0 = use the preset).
	 * @return string CSS text (no <style> wrapper).
	 */
	function sgs_trust_bar_marquee_css( string $uid_scope, int $below, float $duration ): string {
		$css  = '';
		$root = $uid_scope . '.sgs-trust-bar';

		// A custom duration beats the slow/medium/fast preset rules in style.css
		// ((0,3,0) there; (0,4,0) here).
		if ( $duration > 0 ) {
			$css .= $root . '[data-auto-scroll="true"] .sgs-trust-bar__track--ready{animation-duration:' . sgs_trust_bar_seconds( $duration ) . ';}';
		}

		if ( $below <= 0 ) {
			return $css;
		}

		$track = $root . ' .sgs-trust-bar__track';
		$row   = $root . '[data-auto-scroll="true"] .sgs-trust-bar__marquee-row,' . $root . '.sgs-trust-bar__marquee-row';
		// The track's own marquee declarations apply ONLY while view.js has put the row
		// class on its parent (the wrapper, or the content band). The class is added
		// before measuring and removed again when the badges do not overflow, so a bar
		// that does not scroll (no overflow, reduced motion, no JavaScript) keeps the
		// stylesheet's own badge gap instead of inheriting the parent's.
		$row_track = $root . ' .sgs-trust-bar__marquee-row > .sgs-trust-bar__track,' . $root . '.sgs-trust-bar__marquee-row > .sgs-trust-bar__track';

		// At and above the breakpoint: static. The track box disappears so the
		// badges are laid out by the block wrapper; cloned tracks are hidden and
		// the clipping the auto-scroll needs is lifted.
		$css .= '@media (min-width:' . $below . 'px){'
			. $root . '[data-auto-scroll="true"]{overflow:visible;}'
			. $track . '{display:contents;}'
			. $track . '[aria-hidden="true"]{display:none;}'
			. '}';

		// Below the breakpoint: one nowrap row (the track plus its clones side by
		// side, set by view.js's marquee-row class) that the animation slides. The
		// track takes its gap from that row so the seam between two copies is the
		// same width as the gap between badges.
		// Motion-gated: with reduced motion view.js never runs the scroll, so these
		// rules must not survive (the reduced-motion block below owns that case).
		$css .= '@media (max-width:' . ( $below - 1 ) . 'px) and (prefers-reduced-motion:no-preference){'
			. $row . '{display:flex;flex-wrap:nowrap;justify-content:flex-start;overflow:hidden;}'
			. $row_track . '{flex:0 0 auto;gap:inherit;}'
			. '}';

		// Reduced motion: view.js does not start the scroll, so let the badges
		// wrap and centre instead of being clipped in a single row.
		$css .= '@media (max-width:' . ( $below - 1 ) . 'px) and (prefers-reduced-motion:reduce){'
			. $root . '[data-auto-scroll="true"]{overflow:visible;}'
			. $track . '{flex-wrap:wrap;justify-content:center;grid-column:1/-1;width:100%;}'
			. '}';

		return $css;
	}
}

<?php
/**
 * Trust bar marquee range: the device-tier breakpoint `autoScrollBelow` names.
 *
 * The marquee itself is the shared runtime (src/shared/effects/fx-marquee.js). The only caller of this helper is
 * render.php, which passes the range on to overflow-drop.js (it hides the badges that do not fit outside the range).
 * The breakpoint is one of the two device-tier standards (768 / 1024); 0 means every width.
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

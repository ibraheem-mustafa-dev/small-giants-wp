<?php
/**
 * When free delivery applies, offer no paid delivery beside it.
 *
 * WooCommerce lists every method a zone has and pre-selects the first, so a
 * £139 order on a shop with "free delivery over £75" arrived at checkout with
 * paid "Tracked UK delivery £3.95" chosen and Free beside it (found on
 * eye-care-test, 2026-09-25): the shopper pays unless they notice. Once a
 * free_shipping rate is available, every rate that costs money is dropped;
 * free options (free delivery, free collection) stay. A shop that wants its
 * paid options shown anyway returns false from `sgs_hide_paid_rates_when_free`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Drop paid rates from a package when free delivery is one of its rates.
 *
 * @param array $rates Package rates, keyed by rate ID (WC_Shipping_Rate values).
 * @return array
 */
function sgs_hide_paid_rates_when_free( $rates ) {
	/**
	 * Whether paid delivery options are hidden while free delivery applies.
	 *
	 * @param bool $hide Default true.
	 */
	if ( ! is_array( $rates ) || ! apply_filters( 'sgs_hide_paid_rates_when_free', true ) ) {
		return $rates;
	}
	$has_free = false;
	foreach ( $rates as $rate ) {
		if ( is_object( $rate ) && method_exists( $rate, 'get_method_id' ) && 'free_shipping' === $rate->get_method_id() ) {
			$has_free = true;
			break;
		}
	}
	if ( ! $has_free ) {
		return $rates;
	}
	return array_filter(
		$rates,
		static function ( $rate ) {
			return ! is_object( $rate ) || ! method_exists( $rate, 'get_cost' ) || (float) $rate->get_cost() <= 0;
		}
	);
}
add_filter( 'woocommerce_package_rates', __NAMESPACE__ . '\sgs_hide_paid_rates_when_free', 100 );

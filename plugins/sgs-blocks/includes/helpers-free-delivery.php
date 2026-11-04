<?php
/**
 * Free-delivery threshold resolver, shared by sgs/cart (the drawer's progress bar) and sgs/free-delivery-bar.
 *
 * Functions:
 *   sgs_free_delivery_threshold() — a manual override wins outright; otherwise the minimum order amount of the
 *                                   enabled `free_shipping` method in the shipping zone that matches the STORE'S OWN
 *                                   base country (never the visitor's: the bar is generic chrome, not a per-visitor
 *                                   shipping quote, and the Store API does not expose the zone match before checkout)
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_free_delivery_threshold' ) ) {
	/**
	 * Resolve the free-delivery threshold.
	 *
	 * @param mixed $override The block's threshold override (a numeric string or number); anything else is "none".
	 * @return float|null The threshold in the shop currency's major unit, or null when none resolves.
	 */
	function sgs_free_delivery_threshold( $override ): ?float {
		$override = is_scalar( $override ) ? trim( (string) $override ) : '';
		if ( '' !== $override && is_numeric( $override ) ) {
			return (float) $override;
		}
		if ( ! class_exists( 'WC_Shipping_Zones' ) || ! function_exists( 'wc_get_base_location' ) ) {
			return null;
		}
		$base_location = wc_get_base_location();
		$package       = array(
			'destination' => array(
				'country'  => is_array( $base_location ) ? (string) ( $base_location['country'] ?? '' ) : '',
				'state'    => is_array( $base_location ) ? (string) ( $base_location['state'] ?? '' ) : '',
				'postcode' => '',
			),
		);
		$zone          = WC_Shipping_Zones::get_zone_matching_package( $package );
		if ( ! $zone ) {
			return null;
		}
		foreach ( $zone->get_shipping_methods( true ) as $method ) {
			if ( 'free_shipping' !== $method->id || ! $method->is_enabled() ) {
				continue;
			}
			$min_amount = $method->get_option( 'min_amount', '' );
			if ( is_numeric( $min_amount ) && (float) $min_amount > 0 ) {
				return (float) $min_amount;
			}
		}
		return null;
	}
}

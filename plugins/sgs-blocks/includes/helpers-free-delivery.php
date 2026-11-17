<?php
/**
 * Free-delivery threshold resolver, shared by sgs/cart (the drawer's progress bar) and sgs/free-delivery-bar.
 *
 * Functions:
 *   sgs_free_delivery_threshold() — a manual override wins outright; otherwise the minimum order amount of the
 *                                   enabled `free_shipping` method in the shipping zone that matches the STORE'S OWN
 *                                   base country (never the visitor's: the bar is generic chrome, not a per-visitor
 *                                   shipping quote, and the Store API does not expose the zone match before checkout)
 *   sgs_delivery_costs_nothing()  — whether the basket's delivery already costs nothing (needs shipping, rates calculated, the
 *                                   chosen rate, else the cheapest, costs 0 in every package); the pure decision
 *   sgs_cart_delivery_costs_nothing() — the same decision read from WooCommerce's cart, packages and chosen methods
 *   sgs_free_delivery_progress()  — the meter's state (fill, remaining, complete) from a subtotal, a threshold and that decision
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

if ( ! function_exists( 'sgs_delivery_costs_nothing' ) ) {
	/**
	 * Whether the basket's delivery already costs nothing, whatever the basket total.
	 *
	 * True only when the basket needs shipping, at least one package has rates, and in every package the chosen rate (the
	 * cheapest available one while none is chosen) costs 0. Anything unknown (no rates yet) is false.
	 *
	 * @param bool                     $needs_shipping Whether the basket needs shipping.
	 * @param array<int,mixed>         $packages       Shipping packages; each has a `rates` array of objects with `get_cost()`.
	 * @param array<int|string,string> $chosen         Chosen rate ids, indexed by package.
	 * @return bool
	 */
	function sgs_delivery_costs_nothing( bool $needs_shipping, array $packages, array $chosen ): bool {
		if ( ! $needs_shipping || array() === $packages ) {
			return false;
		}
		foreach ( $packages as $index => $package ) {
			$rates = is_array( $package ) && is_array( $package['rates'] ?? null ) ? $package['rates'] : array();
			if ( array() === $rates ) {
				return false;
			}
			$chosen_id = isset( $chosen[ $index ] ) ? (string) $chosen[ $index ] : '';
			if ( '' !== $chosen_id && isset( $rates[ $chosen_id ] ) ) {
				$cost = (float) $rates[ $chosen_id ]->get_cost();
			} else {
				$costs = array();
				foreach ( $rates as $rate ) {
					$costs[] = (float) $rate->get_cost();
				}
				$cost = min( $costs );
			}
			if ( $cost > 0.0 ) {
				return false;
			}
		}
		return true;
	}
}

if ( ! function_exists( 'sgs_cart_delivery_costs_nothing' ) ) {
	/**
	 * The same decision, read from WooCommerce's cart: its needs-shipping flag, its calculated packages and the session's
	 * chosen methods. False where WooCommerce or its cart is absent.
	 *
	 * @return bool
	 */
	function sgs_cart_delivery_costs_nothing(): bool {
		if ( ! function_exists( 'WC' ) || ! WC() || ! WC()->cart || ! WC()->cart->needs_shipping() ) {
			return false;
		}
		$packages = WC()->shipping() ? WC()->shipping()->get_packages() : array();
		if ( array() === $packages ) {
			WC()->cart->calculate_shipping();
			$packages = WC()->shipping()->get_packages();
		}
		$chosen = WC()->session ? WC()->session->get( 'chosen_shipping_methods', array() ) : array();
		return sgs_delivery_costs_nothing( true, is_array( $packages ) ? $packages : array(), is_array( $chosen ) ? $chosen : array() );
	}
}

if ( ! function_exists( 'sgs_free_delivery_progress' ) ) {
	/**
	 * The meter's state for a basket.
	 *
	 * @param float $subtotal      The items' subtotal plus tax.
	 * @param float $threshold     The free-delivery minimum (above 0).
	 * @param bool  $costs_nothing Whether delivery already costs nothing (see sgs_delivery_costs_nothing()).
	 * @return array{pct: float, remaining: float, complete: bool}
	 */
	function sgs_free_delivery_progress( float $subtotal, float $threshold, bool $costs_nothing ): array {
		$remaining = $costs_nothing ? 0.0 : max( 0.0, $threshold - $subtotal );
		return array(
			'pct'       => $costs_nothing ? 100.0 : max( 0.0, min( 100.0, ( $subtotal / $threshold ) * 100 ) ),
			'remaining' => $remaining,
			'complete'  => $remaining <= 0.0,
		);
	}
}

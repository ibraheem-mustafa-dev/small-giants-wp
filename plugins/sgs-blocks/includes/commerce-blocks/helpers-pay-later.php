<?php
/**
 * Pay later message: whether the Stripe plugin offers a payment method.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * True when WooCommerce's gateway list holds the Stripe gateway `stripe_<method>` (for example
 * `stripe_klarna`) and it is enabled. The account's Payment Method Configuration decides which
 * of these are enabled, so the plugin's legacy accepted-payments option is not consulted.
 *
 * @param string     $method   Stripe payment method id, for example `klarna`.
 * @param array|null $gateways Gateway objects keyed by id; null reads WooCommerce's own list.
 * @return bool Whether the method is offered.
 */
function sgs_pay_later_method_enabled( string $method, ?array $gateways = null ): bool {
	if ( null === $gateways ) {
		if ( ! function_exists( 'WC' ) || ! WC() || ! WC()->payment_gateways() ) {
			return false;
		}
		$gateways = WC()->payment_gateways()->payment_gateways();
	}
	$id = 'stripe_' . $method;
	return isset( $gateways[ $id ] ) && 'yes' === ( $gateways[ $id ]->enabled ?? '' );
}

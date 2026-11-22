<?php
/**
 * Whether an order is collected rather than delivered: the one test the account's order page (its pickup step labels and
 * address box) and the order Show-to rules (`order-collect`, `order-delivery`) share.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_order_is_pickup' ) ) {
	/**
	 * Whether the order's shipping line is a local pickup method: WooCommerce's block `pickup_location`, the classic
	 * `local_pickup`, or an id that starts with either and carries its own suffix (`local_pickup_plus`). A method whose
	 * id only contains the word (`no_pickup_delivery`) is not a pickup.
	 *
	 * @param object $order WC_Order.
	 * @return bool
	 */
	function sgs_order_is_pickup( $order ): bool {
		foreach ( $order->get_shipping_methods() as $method ) {
			if ( 1 === preg_match( '/^(?:pickup_location|local_pickup)(?:_|$)/', (string) $method->get_method_id() ) ) {
				return true;
			}
		}
		return false;
	}
}

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
	 * Whether the order's shipping line is a local pickup method (WooCommerce's block `pickup_location` or the classic
	 * `local_pickup`).
	 *
	 * @param object $order WC_Order.
	 * @return bool
	 */
	function sgs_order_is_pickup( $order ): bool {
		foreach ( $order->get_shipping_methods() as $method ) {
			if ( false !== strpos( (string) $method->get_method_id(), 'pickup' ) ) {
				return true;
			}
		}
		return false;
	}
}

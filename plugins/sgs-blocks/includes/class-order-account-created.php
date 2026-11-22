<?php
/**
 * Marks an order whose customer account was made in the same checkout, so an order confirmation can tell "your account
 * is ready" from "it is all in one place" (the `order-account-created` and `order-account-existing` Show-to rules).
 *
 * WooCommerce keeps no record of this on the order. Both checkouts make the account through `wc_create_new_customer()`
 * (its `woocommerce_created_customer` action) before they finish the order, so the id of an account made in this request
 * is remembered, and when the order is processed (`woocommerce_store_api_checkout_order_processed` for the block
 * checkout, `woocommerce_checkout_order_processed` for the classic one) an order on that account gets the meta
 * `_sgs_account_created` = `yes`. An account made any other way (the My account form, an admin) is never in the same
 * request as an order, so its orders stay unmarked.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Records "this order's account was made with it".
 */
final class Order_Account_Created {

	/** The order meta key, `yes` when the account was made with the order. */
	const META = '_sgs_account_created';

	/**
	 * The customer account made earlier in this request, 0 for none.
	 *
	 * @var int
	 */
	private static $created = 0;

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'woocommerce_created_customer', array( __CLASS__, 'remember' ), 10, 1 );
		\add_action( 'woocommerce_store_api_checkout_order_processed', array( __CLASS__, 'mark_store_api' ), 10, 1 );
		\add_action( 'woocommerce_checkout_order_processed', array( __CLASS__, 'mark_classic' ), 10, 3 );
	}

	/**
	 * Remember the account WooCommerce just made.
	 *
	 * @param mixed $customer_id The new customer's user id.
	 * @return void
	 */
	public static function remember( $customer_id ): void {
		self::$created = (int) $customer_id;
	}

	/**
	 * Forget the remembered account (tests; a new request starts with none).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$created = 0;
	}

	/**
	 * The block checkout's processed order.
	 *
	 * @param mixed $order WC_Order.
	 * @return void
	 */
	public static function mark_store_api( $order ): void {
		self::mark( $order );
	}

	/**
	 * The classic checkout's processed order.
	 *
	 * @param mixed $order_id    Order id.
	 * @param mixed $posted_data Checkout fields (unused).
	 * @param mixed $order       WC_Order, when WooCommerce passes it.
	 * @return void
	 */
	public static function mark_classic( $order_id, $posted_data = array(), $order = null ): void {
		unset( $posted_data );
		if ( ! \is_object( $order ) && \function_exists( 'wc_get_order' ) ) {
			$order = \wc_get_order( (int) $order_id );
		}
		self::mark( $order );
	}

	/**
	 * Whether the order's account was made with it.
	 *
	 * @param object $order WC_Order.
	 * @return bool
	 */
	public static function is_created( $order ): bool {
		return (int) $order->get_customer_id() > 0 && 'yes' === (string) $order->get_meta( self::META, true );
	}

	/**
	 * Mark the order when its customer is the account made earlier in this request.
	 *
	 * @param mixed $order WC_Order.
	 * @return void
	 */
	private static function mark( $order ): void {
		if ( self::$created <= 0 || ! \is_object( $order ) || ! \method_exists( $order, 'get_customer_id' ) ) {
			return;
		}
		if ( (int) $order->get_customer_id() !== self::$created ) {
			return;
		}
		$order->update_meta_data( self::META, 'yes' );
		$order->save();
	}
}

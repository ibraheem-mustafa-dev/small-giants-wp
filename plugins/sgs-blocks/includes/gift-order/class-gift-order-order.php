<?php
/**
 * Gift order: the order record (Spec 27, FR-30-21).
 *
 * When WooCommerce creates an order (the Cart and Checkout blocks, or the classic
 * checkout), the session value is copied into order meta through the CRUD
 * methods, so it works with HPOS and with the legacy posts table. The session
 * key is cleared once the order exists.
 *
 * A session with no key at all leaves an existing order's meta alone: a payment
 * retry reuses the same draft order after the key was cleared. A session that
 * holds `on` false removes the meta, so switching the gift off and then paying
 * leaves no gift meta.
 *
 * @package SGS\Blocks\Gift_Order
 */

namespace SGS\Blocks\Gift_Order;

defined( 'ABSPATH' ) || exit;

/**
 * Copies the session value onto the order and reads it back.
 */
final class Gift_Order_Order {

	/** Order meta: the order is a gift ("yes"). */
	const META_FLAG = '_sgs_gift';

	/** Order meta: recipient name. */
	const META_TO = '_sgs_gift_to';

	/** Order meta: gift note. */
	const META_MESSAGE = '_sgs_gift_message';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'copy_to_order' ), 10, 1 );
		\add_action( 'woocommerce_store_api_checkout_update_order_meta', array( __CLASS__, 'copy_to_order' ), 10, 1 );
		\add_action( 'woocommerce_checkout_order_processed', array( __CLASS__, 'forget_session' ), 10, 0 );
		\add_action( 'woocommerce_store_api_checkout_order_processed', array( __CLASS__, 'forget_session' ), 10, 0 );
	}

	/**
	 * Copy the session value onto the order (a WC_Order; saved by the caller).
	 *
	 * @param mixed $order The order being created.
	 * @return void
	 */
	public static function copy_to_order( $order ): void {
		if ( ! $order instanceof \WC_Order || ! Gift_Order_Session::is_set() ) {
			return;
		}
		$value = Gift_Order_Session::get();
		if ( ! $value['on'] ) {
			$order->delete_meta_data( self::META_FLAG );
			$order->delete_meta_data( self::META_TO );
			$order->delete_meta_data( self::META_MESSAGE );
			return;
		}
		$order->update_meta_data( self::META_FLAG, 'yes' );
		$order->update_meta_data( self::META_TO, $value['to'] );
		$order->update_meta_data( self::META_MESSAGE, $value['message'] );
	}

	/**
	 * Forget the session value once the order exists.
	 *
	 * @return void
	 */
	public static function forget_session(): void {
		Gift_Order_Session::clear();
	}

	/**
	 * The gift on an order, or null when the order is not a gift.
	 *
	 * @param \WC_Order $order Order.
	 * @return array{to:string,message:string}|null
	 */
	public static function for_order( \WC_Order $order ): ?array {
		if ( 'yes' !== (string) $order->get_meta( self::META_FLAG, true ) ) {
			return null;
		}
		return array(
			'to'      => (string) $order->get_meta( self::META_TO, true ),
			'message' => (string) $order->get_meta( self::META_MESSAGE, true ),
		);
	}
}

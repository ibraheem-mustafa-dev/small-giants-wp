<?php
/**
 * SGS Stock Notify Dispatch — sends the back-in-stock webhook (Spec 30 P5).
 *
 * `Stock_Notify` captures {email, ts} subscribers in `_sgs_stock_notify`
 * post-meta but never sends anything. This class watches WooCommerce's
 * stock-status hooks and, the moment a product (or one of its variations)
 * goes back in stock, queues an async job that reads the subscriber list,
 * sends ONE `sgs_back_in_stock` webhook event, and — only once the webhook
 * send succeeds — clears the list so each request is answered once.
 *
 * @package SGS\Blocks
 * @since   1.19.0 (FR-30-14/15 Spec 30 P5)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Hooks WooCommerce stock-status changes and dispatches the back-in-stock webhook. */
final class Stock_Notify_Dispatch {

	/** Action Scheduler hook name for the async dispatch job. */
	const ACTION_HOOK = 'sgs_back_in_stock_dispatch';

	/** Action Scheduler group. */
	const ACTION_GROUP = 'sgs';

	/**
	 * Product IDs already queued this request, so a product and its parent
	 * variation firing the same hook in one request don't double-queue.
	 *
	 * @var array<int, bool>
	 */
	private static $queued = array();

	// -- Registration ----------------------------------------------------

	/**
	 * Wire WordPress/WooCommerce hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'woocommerce_product_set_stock_status', array( __CLASS__, 'on_stock_status_changed' ), 10, 3 );
		\add_action( 'woocommerce_variation_set_stock_status', array( __CLASS__, 'on_stock_status_changed' ), 10, 3 );
		\add_action( self::ACTION_HOOK, array( __CLASS__, 'dispatch' ) );
	}

	// -- Hook handler ------------------------------------------------------

	/**
	 * Fired on `woocommerce_product_set_stock_status` and
	 * `woocommerce_variation_set_stock_status`. Core passes these
	 * untyped — never add parameter type hints here (a typed hook
	 * callback parameter can fatal on a hook where core passes null).
	 *
	 * @param mixed $product_id Post ID of the product or variation.
	 * @param mixed $status     New stock status ('instock', 'outofstock', …).
	 * @param mixed $product    The WC_Product/WC_Product_Variation instance.
	 */
	public static function on_stock_status_changed( $product_id, $status, $product ): void {
		if ( 'instock' !== $status ) {
			return;
		}

		$product_id = \absint( $product_id );
		if ( ! $product_id ) {
			return;
		}

		// For a variation, both the variation's own meta and its parent's
		// meta can hold a subscriber list (a shopper may have asked to be
		// notified on either). Check both ids.
		$candidate_ids = array( $product_id );

		if ( \is_object( $product ) && \method_exists( $product, 'get_parent_id' ) ) {
			$parent_id = \absint( $product->get_parent_id() );
			if ( $parent_id ) {
				$candidate_ids[] = $parent_id;
			}
		}

		foreach ( $candidate_ids as $candidate_id ) {
			self::maybe_queue( $candidate_id );
		}
	}

	/**
	 * Queue the async dispatch job for one product id, once per request,
	 * only when it holds a non-empty subscriber list and is published.
	 *
	 * @param int $product_id Post ID holding the `_sgs_stock_notify` meta.
	 */
	private static function maybe_queue( int $product_id ): void {
		if ( isset( self::$queued[ $product_id ] ) ) {
			return;
		}

		if ( 'publish' !== \get_post_status( $product_id ) ) {
			return;
		}

		if ( ! self::has_subscribers( $product_id ) ) {
			return;
		}

		self::$queued[ $product_id ] = true;

		if ( \function_exists( 'as_enqueue_async_action' ) ) {
			\as_enqueue_async_action( self::ACTION_HOOK, array( $product_id ), self::ACTION_GROUP );
		} else {
			self::dispatch( $product_id );
		}
	}

	/**
	 * Whether `$product_id`'s `_sgs_stock_notify` meta decodes to a
	 * non-empty subscriber list.
	 *
	 * @param int $product_id Post ID to check.
	 * @return bool
	 */
	private static function has_subscribers( int $product_id ): bool {
		$list = self::read_subscribers( $product_id );
		return ! empty( $list );
	}

	/**
	 * Read and decode `$product_id`'s `_sgs_stock_notify` meta.
	 *
	 * @param int $product_id Post ID holding the meta.
	 * @return array List of {email, ts} subscribers, or empty array.
	 */
	private static function read_subscribers( int $product_id ): array {
		$raw = \get_post_meta( $product_id, Stock_Notify::META_KEY, true );

		if ( ! \is_string( $raw ) || '' === $raw ) {
			return array();
		}

		$decoded = \json_decode( $raw, true );

		return \is_array( $decoded ) ? $decoded : array();
	}

	// -- Async handler -----------------------------------------------------

	/**
	 * Action Scheduler (or direct-fallback) handler: read the subscriber
	 * list, send one webhook event, and clear the list only when the send
	 * succeeded — so a failed send leaves the list intact for the next
	 * stock-status change to retry.
	 *
	 * @param mixed $product_id Post ID holding the subscriber list.
	 */
	public static function dispatch( $product_id ): void {
		$product_id = \absint( $product_id );
		if ( ! $product_id ) {
			return;
		}

		if ( 'publish' !== \get_post_status( $product_id ) ) {
			return;
		}

		$subscribers = self::read_subscribers( $product_id );
		if ( empty( $subscribers ) ) {
			return;
		}

		$emails = array();
		foreach ( $subscribers as $entry ) {
			if ( isset( $entry['email'] ) && \is_string( $entry['email'] ) ) {
				$emails[] = array( 'email' => $entry['email'] );
			}
		}

		if ( empty( $emails ) ) {
			return;
		}

		$payload = array(
			'product_id'  => $product_id,
			'name'        => \get_the_title( $product_id ),
			'url'         => \get_permalink( $product_id ),
			'subscribers' => $emails,
		);

		$sent = Sgs_Webhook::send( 'sgs_back_in_stock', $payload );

		if ( $sent ) {
			\delete_post_meta( $product_id, Stock_Notify::META_KEY );
		}
	}
}

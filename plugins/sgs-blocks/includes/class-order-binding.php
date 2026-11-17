<?php
/**
 * Block binding source: sgs/order (the order on the thank-you page).
 *
 * Lets a heading or text block show a fact about the order on WooCommerce's
 * order-received endpoint: bind `content` (sgs/heading) or `text` (sgs/text) to
 * `{ "source": "sgs/order", "args": { "key": "number" } }`. Keys: `number`, `email` (billing email),
 * `delivery_method` (shipping method title or titles), `total` (formatted total), `date` (order date in the site's
 * date format), `view_url` (the account's view-order link, for the order's owner only), `gift_to` and `gift_message`
 * (the gift note saved by sgs/gift-order) and `item_count` (items bought). A fact the order does not have is ''.
 *
 * The order is read the way WooCommerce's own order-confirmation blocks read it
 * (AbstractOrderConfirmationBlock::get_view_order_permissions): the order id from
 * the `order-received` query var, the `key` query argument checked with
 * `WC_Order::key_is_valid()`, a customer's order shown only to that customer
 * while they are logged in, and a guest order shown inside the email-verification
 * grace period, with the order in the shopper's session, or after the shopper
 * verified their billing email. Anything else resolves to null, so the block keeps
 * its authored text and no order data shows.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and resolves the sgs/order binding source.
 */
final class Order_Binding {

	/** Keys the source resolves. */
	const KEYS = array( 'number', 'email', 'delivery_method', 'total', 'date', 'view_url', 'gift_to', 'gift_message', 'item_count' );

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_source' ) );
	}

	/**
	 * Register the source with core.
	 *
	 * @return void
	 */
	public static function register_source(): void {
		if ( ! \function_exists( 'register_block_bindings_source' ) ) {
			return;
		}
		\register_block_bindings_source(
			'sgs/order',
			array(
				'label'              => \__( 'SGS Order', 'sgs-blocks' ),
				'get_value_callback' => array( __CLASS__, 'get_value' ),
				'uses_context'       => array(),
			)
		);
	}

	/**
	 * The bound value, or null when the visitor may not see this order (the block then keeps its saved text).
	 *
	 * An optional `format` arg places the value inside a sentence: its first `%s` becomes the value, e.g.
	 * `{"key":"number","format":"Thank you, order %s."}`. A format without `%s` is ignored.
	 *
	 * @param mixed $source_args Binding args (`key`, optional `format`).
	 * @return string|null
	 */
	public static function get_value( $source_args ): ?string {
		$key = \is_array( $source_args ) && isset( $source_args['key'] ) ? \sanitize_key( (string) $source_args['key'] ) : '';
		if ( ! \in_array( $key, self::KEYS, true ) ) {
			return null;
		}
		$order = self::viewable_order();
		if ( null === $order ) {
			return null;
		}
		$value  = self::value_for( $key, $order );
		if ( '' === $value ) {
			return '';
		}
		$format = isset( $source_args['format'] ) ? \sanitize_text_field( (string) $source_args['format'] ) : '';
		$at     = '' !== $format ? \strpos( $format, '%s' ) : false;
		if ( false === $at ) {
			return $value;
		}
		return \substr( $format, 0, $at ) . $value . \substr( $format, $at + 2 );
	}

	/**
	 * One key's plain-text value for an order ('' when the order has none). Output is escaped by core when printed.
	 *
	 * @param string    $key   One of self::KEYS.
	 * @param \WC_Order $order The viewable order.
	 * @return string
	 */
	private static function value_for( string $key, \WC_Order $order ): string {
		switch ( $key ) {
			case 'email':
				return \sanitize_email( (string) $order->get_billing_email() );
			case 'delivery_method':
				return \sanitize_text_field( (string) $order->get_shipping_method() );
			case 'total':
				return \sanitize_text_field( \html_entity_decode( \wp_strip_all_tags( (string) $order->get_formatted_order_total() ), ENT_QUOTES, 'UTF-8' ) );
			case 'date':
				$created = $order->get_date_created();
				return $created instanceof \WC_DateTime ? \sanitize_text_field( (string) \wc_format_datetime( $created ) ) : '';
			case 'view_url':
				// Only the signed-in owner: a guest holds the order key, which is not an account.
				$owner = (int) $order->get_customer_id();
				return $owner > 0 && \get_current_user_id() === $owner ? \esc_url_raw( (string) $order->get_view_order_url() ) : '';
			case 'gift_to':
			case 'gift_message':
				$gift = \class_exists( '\SGS\Blocks\Gift_Order\Gift_Order_Order' ) ? \SGS\Blocks\Gift_Order\Gift_Order_Order::for_order( $order ) : null;
				return null === $gift ? '' : \sanitize_text_field( \html_entity_decode( (string) $gift['gift_to' === $key ? 'to' : 'message'], ENT_QUOTES, 'UTF-8' ) );
			case 'item_count':
				return (string) (int) $order->get_item_count();
			default:
				return \sanitize_text_field( (string) $order->get_order_number() );
		}
	}

	/**
	 * The order on the order-received endpoint when this visitor may view it. Public so the Show-to rules and
	 * sgs/order-items apply the very same check.
	 *
	 * @return \WC_Order|null
	 */
	public static function viewable_order(): ?\WC_Order {
		if ( ! \function_exists( 'wc_get_order' ) ) {
			return null;
		}
		$order_id = \absint( \get_query_var( 'order-received' ) );
		if ( $order_id <= 0 ) {
			return null;
		}
		$order = \wc_get_order( $order_id );
		if ( ! $order instanceof \WC_Order ) {
			return null;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- the order key is the capability, checked with key_is_valid() exactly as WooCommerce does.
		$given = isset( $_GET['key'] ) ? \wc_clean( \wp_unslash( $_GET['key'] ) ) : '';
		if ( ! \is_string( $given ) || '' === $given || ! $order->key_is_valid( $given ) ) {
			return null;
		}
		if ( $order->get_user_id() > 0 ) {
			// phpcs:ignore WooCommerce.Commenting.CommentHooks.MissingSinceComment, WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own filter, honoured as WooCommerce does.
			$verify_known = (bool) \apply_filters( 'woocommerce_order_received_verify_known_shoppers', true );
			return ( ! $verify_known || $order->get_user_id() === \get_current_user_id() ) ? $order : null;
		}
		return self::guest_may_view( $order ) ? $order : null;
	}

	/**
	 * Whether a guest order may be shown: in the shopper's session, inside the grace period, or email-verified.
	 *
	 * @param \WC_Order $order The order.
	 * @return bool
	 */
	private static function guest_may_view( \WC_Order $order ): bool {
		$session = \function_exists( 'WC' ) ? \WC()->session : null;
		if ( $session instanceof \WC_Session && $order->get_id() === (int) $session->get( 'store_api_draft_order' ) ) {
			return true;
		}
		// phpcs:ignore WooCommerce.Commenting.CommentHooks.MissingSinceComment, WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own filter, honoured as WooCommerce does.
		$grace   = (int) \apply_filters( 'woocommerce_order_email_verification_grace_period', 10 * MINUTE_IN_SECONDS, $order, 'order-received' );
		$created = $order->get_date_created();
		if ( $created instanceof \WC_DateTime && \time() - $created->getTimestamp() <= $grace ) {
			return true;
		}
		// phpcs:ignore WooCommerce.Commenting.CommentHooks.MissingSinceComment, WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own filter, honoured as WooCommerce does.
		if ( ! (bool) \apply_filters( 'woocommerce_order_email_verification_required', true, $order, 'order-received' ) ) {
			return true;
		}
		return self::email_verified( $order );
	}

	/**
	 * Whether the shopper posted the order's billing email with a valid WooCommerce verification nonce.
	 *
	 * @param \WC_Order $order The order.
	 * @return bool
	 */
	private static function email_verified( \WC_Order $order ): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- the nonce is verified on the next lines.
		if ( ! isset( $_POST['email'], $_POST['_wpnonce'] ) ) {
			return false;
		}
		$nonce = \sanitize_key( \wp_unslash( $_POST['_wpnonce'] ) );
		if ( ! \wp_verify_nonce( $nonce, 'wc_verify_email' ) && ! \wp_verify_nonce( $nonce, 'wc_create_account' ) ) {
			return false;
		}
		$billing = (string) $order->get_billing_email();
		return '' !== $billing && \sanitize_email( \wp_unslash( $_POST['email'] ) ) === $billing;
	}
}

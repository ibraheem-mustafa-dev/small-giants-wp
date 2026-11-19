<?php
/**
 * Block binding source: sgs/order (the order on the thank-you page).
 *
 * Lets a heading or text block show a fact about the order on WooCommerce's
 * order-received endpoint: bind `content` (sgs/heading) or `text` (sgs/text) to
 * `{ "source": "sgs/order", "args": { "key": "number" } }`. Keys: `number`, `email` (billing email),
 * `delivery_method` (shipping method title or titles), `total` (formatted total), `date` (order date in the site's
 * date format), `view_url` (the account's view-order link, for the order's owner only), `gift_to` and `gift_message`
 * (the gift note saved by sgs/gift-order), `item_count` (items bought), `shipping_name` and `shipping_address` (who
 * the order goes to and where, shown as WooCommerce's own shipping address block shows them: only when the order needs
 * delivery and has a shipping address), `billing_name` and `billing_address`, `phone` (billing phone, else shipping)
 * and `payment_method` (the payment method's title). An address is one line in the format of its country, its parts
 * joined by a comma, without the name. A fact the order does not have is ''.
 *
 * Site-supplied facts: a fact about the order that WooCommerce holds no field for (a bake date, an arrival date) is bound
 * with the key `fact:<name>` (the name a lower-case key: letters, digits, `_` and `-`), e.g.
 * `{ "source": "sgs/order", "args": { "key": "fact:bake_date" } }`. The site answers through the `sgs_order_fact` filter:
 *
 *     add_filter( 'sgs_order_fact', function ( $value, $name, $order ) {
 *         return 'bake_date' === $name ? my_bake_date_for( $order ) : $value;
 *     }, 10, 3 );
 *
 * `$value` is '' (nothing supplied), `$name` the fact's name and `$order` the viewable `WC_Order`. The answer is plain text
 * (sanitised like every other key); a site that supplies nothing leaves the fact '' and the bound block renders nothing. The
 * filter is called only for an order the visitor may view. A `format` may place further facts beside the value: each
 * `{fact:<name>}` in it is replaced by that fact, and the whole sentence is '' when any of them is empty, so a line
 * built from several facts shows nothing until every one is supplied.
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
	const KEYS = array( 'number', 'email', 'delivery_method', 'total', 'date', 'view_url', 'gift_to', 'gift_message', 'item_count', 'shipping_name', 'shipping_address', 'billing_name', 'billing_address', 'phone', 'payment_method' );

	/** The prefix of a key that names a site-supplied fact (`fact:<name>`). */
	const FACT_PREFIX = 'fact:';

	/** The filter a site answers a site-supplied fact through: ( '', name, WC_Order ) returns the fact's text. */
	const FACT_FILTER = 'sgs_order_fact';

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
	 * `{"key":"number","format":"Thank you, order %s."}`. A format without `%s` is ignored. Each `{fact:<name>}` in the
	 * format is replaced by that site-supplied fact; when any is empty the whole value is ''.
	 *
	 * @param mixed $source_args Binding args (`key`, optional `format`).
	 * @return string|null
	 */
	public static function get_value( $source_args ): ?string {
		$raw  = \is_array( $source_args ) && isset( $source_args['key'] ) && \is_string( $source_args['key'] ) ? $source_args['key'] : '';
		$fact = self::fact_name( $raw );
		$key  = null === $fact ? \sanitize_key( $raw ) : '';
		if ( null === $fact && ! \in_array( $key, self::KEYS, true ) ) {
			return null;
		}
		$order = self::viewable_order();
		if ( null === $order ) {
			return null;
		}
		$value = null === $fact ? self::value_for( $key, $order ) : self::fact_value( $fact, $order );
		if ( '' === $value ) {
			return '';
		}
		$format = isset( $source_args['format'] ) ? \sanitize_text_field( (string) $source_args['format'] ) : '';
		$at     = '' !== $format ? \strpos( $format, '%s' ) : false;
		if ( false === $at ) {
			return $value;
		}
		// The facts named in the format are read from the format's own words, before the value goes in, so text inside a value is never expanded.
		$before = self::with_facts( \substr( $format, 0, $at ), $order );
		$after  = self::with_facts( \substr( $format, $at + 2 ), $order );
		return null === $before || null === $after ? '' : $before . $value . $after;
	}

	/**
	 * The fact name in a `fact:<name>` key (sanitised as a key), or null when the key does not name a fact.
	 *
	 * @param string $raw The binding's key as authored.
	 * @return string|null
	 */
	private static function fact_name( string $raw ): ?string {
		if ( 0 !== \strpos( $raw, self::FACT_PREFIX ) ) {
			return null;
		}
		$name = \sanitize_key( \substr( $raw, \strlen( self::FACT_PREFIX ) ) );
		return '' === $name ? null : $name;
	}

	/**
	 * One site-supplied fact's plain-text value for an order ('' when no filter supplies it). Output is escaped by core when printed.
	 *
	 * @param string    $name  The fact's name.
	 * @param \WC_Order $order The viewable order.
	 * @return string
	 */
	private static function fact_value( string $name, \WC_Order $order ): string {
		// phpcs:ignore WooCommerce.Commenting.CommentHooks.MissingSinceComment, WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- the hook is self::FACT_FILTER, `sgs_order_fact`.
		$answer = \apply_filters( self::FACT_FILTER, '', $name, $order );
		return \is_scalar( $answer ) ? \sanitize_text_field( (string) $answer ) : '';
	}

	/**
	 * Part of a format with each `{fact:<name>}` replaced by that fact; null when one of them is empty.
	 *
	 * @param string    $part  Part of a format.
	 * @param \WC_Order $order The viewable order.
	 * @return string|null
	 */
	private static function with_facts( string $part, \WC_Order $order ): ?string {
		$missing = false;
		$out     = (string) \preg_replace_callback(
			'/\{fact:([a-z0-9_-]+)\}/',
			static function ( array $m ) use ( $order, &$missing ): string {
				$value   = self::fact_value( $m[1], $order );
				$missing = $missing || '' === $value;
				return $value;
			},
			$part
		);
		return $missing ? null : $out;
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
			case 'shipping_name':
				return self::has_address( $order, 'shipping' ) ? \sanitize_text_field( (string) $order->get_formatted_shipping_full_name() ) : '';
			case 'billing_name':
				return self::has_address( $order, 'billing' ) ? \sanitize_text_field( (string) $order->get_formatted_billing_full_name() ) : '';
			case 'shipping_address':
				return self::address_line( $order, 'shipping' );
			case 'billing_address':
				return self::address_line( $order, 'billing' );
			case 'phone':
				$phone = (string) $order->get_billing_phone();
				return \sanitize_text_field( '' !== $phone ? $phone : (string) $order->get_shipping_phone() );
			case 'payment_method':
				return \sanitize_text_field( \html_entity_decode( (string) $order->get_payment_method_title(), ENT_QUOTES, 'UTF-8' ) );
			default:
				return \sanitize_text_field( (string) $order->get_order_number() );
		}
	}

	/**
	 * Whether the order shows an address of this kind, by WooCommerce's own order-confirmation rule: a shipping address
	 * only on an order that needs delivery and has one, a billing address only when it has one.
	 *
	 * @param \WC_Order $order The viewable order.
	 * @param string    $type  'shipping' or 'billing'.
	 * @return bool
	 */
	private static function has_address( \WC_Order $order, string $type ): bool {
		return 'shipping' === $type ? $order->needs_shipping_address() && $order->has_shipping_address() : $order->has_billing_address();
	}

	/**
	 * One address on a single line: WooCommerce's format for the address's country, without the name, parts joined by
	 * a comma ('' when the order shows no address of this kind).
	 *
	 * @param \WC_Order $order The viewable order.
	 * @param string    $type  'shipping' or 'billing'.
	 * @return string
	 */
	private static function address_line( \WC_Order $order, string $type ): string {
		$countries = \function_exists( 'WC' ) ? ( \WC()->countries ?? null ) : null;
		if ( ! self::has_address( $order, $type ) || ! \is_object( $countries ) ) {
			return '';
		}
		$address = (array) $order->get_address( $type );
		unset( $address['first_name'], $address['last_name'] );
		$parts = \array_map( 'sanitize_text_field', \explode( "\n", (string) $countries->get_formatted_address( $address, "\n" ) ) );
		return \implode( ', ', \array_values( \array_filter( $parts, 'strlen' ) ) );
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

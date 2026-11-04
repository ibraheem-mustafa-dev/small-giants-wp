<?php
/**
 * Gift order: Store API endpoint data on namespace `sgs_gift` (Spec 27, FR-30-21).
 *
 * The namespace is `sgs_gift`, not `sgs`: a second registration on the same
 * endpoint and namespace replaces the first (see includes/cart-item-extensions.php).
 *
 * The data is added to cart responses only for a page that holds `sgs/gift-order`:
 * the block's own render calls `ensure_registered()` (which runs before
 * WooCommerce preloads the cart into the page), and the block's script sends the
 * `X-SGS-Gift: 1` header on the Store API requests it makes, which
 * `register_for_flagged_request()` honours. A page without the block and a
 * request without the header get the cart response WooCommerce builds today.
 *
 * @package SGS\Blocks\Gift_Order
 */

namespace SGS\Blocks\Gift_Order;

defined( 'ABSPATH' ) || exit;

/**
 * Store API wiring.
 */
final class Gift_Order_Store_Api {

	/** Endpoint-data namespace. */
	const NAMESPACE_KEY = 'sgs_gift';

	/** Header the block's script adds to its Store API requests. */
	const FLAG_HEADER = 'HTTP_X_SGS_GIFT';

	/**
	 * Whether the registration has run in this request.
	 *
	 * @var bool
	 */
	private static $registered = false;

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'woocommerce_blocks_loaded', array( __CLASS__, 'register_for_flagged_request' ) );
	}

	/**
	 * Register when the request carries the block's header.
	 *
	 * @return void
	 */
	public static function register_for_flagged_request(): void {
		if ( isset( $_SERVER[ self::FLAG_HEADER ] ) && '1' === (string) $_SERVER[ self::FLAG_HEADER ] ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- compared to a literal, read-only flag.
			self::ensure_registered();
		}
	}

	/**
	 * Register the endpoint data once.
	 *
	 * @return void
	 */
	public static function ensure_registered(): void {
		if ( self::$registered || ! \function_exists( 'woocommerce_store_api_register_endpoint_data' ) ) {
			return;
		}
		if ( ! \class_exists( '\Automattic\WooCommerce\StoreApi\Schemas\V1\CartSchema' ) ) {
			return;
		}
		self::$registered = true;
		\woocommerce_store_api_register_endpoint_data(
			array(
				'endpoint'        => \Automattic\WooCommerce\StoreApi\Schemas\V1\CartSchema::IDENTIFIER,
				'namespace'       => self::NAMESPACE_KEY,
				'data_callback'   => array( __CLASS__, 'data' ),
				'schema_callback' => array( __CLASS__, 'schema' ),
				'schema_type'     => ARRAY_A,
			)
		);
	}

	/**
	 * Extension data for the cart response.
	 *
	 * @return array<string,mixed>
	 */
	public static function data(): array {
		$value           = Gift_Order_Session::get();
		$value['limits'] = Gift_Order_Session::limits();
		return $value;
	}

	/**
	 * Schema for the extension data.
	 *
	 * @return array<string,mixed>
	 */
	public static function schema(): array {
		return array(
			'on'      => array(
				'description' => \__( 'Whether the order is a gift.', 'sgs-blocks' ),
				'type'        => 'boolean',
				'readonly'    => true,
			),
			'to'      => array(
				'description' => \__( 'Recipient name.', 'sgs-blocks' ),
				'type'        => 'string',
				'readonly'    => true,
			),
			'message' => array(
				'description' => \__( 'Gift note.', 'sgs-blocks' ),
				'type'        => 'string',
				'readonly'    => true,
			),
			'limits'  => array(
				'description' => \__( 'Server caps on the name and the note.', 'sgs-blocks' ),
				'type'        => 'object',
				'readonly'    => true,
				'properties'  => array(
					'to'      => array( 'type' => 'integer' ),
					'message' => array( 'type' => 'integer' ),
				),
			),
		);
	}
}

<?php
/**
 * Express basket isolation: a product-page Apple Pay or Google Pay payment charges only the product shown.
 *
 * Payment Plugins for Stripe WooCommerce (woo-stripe-payment 4.x) pays from a product page by POSTing
 * `wc-stripe/v1/cart/item`, which adds the product to the shopper's real basket, and then `wc-stripe/v1/cart/checkout`,
 * which charges the whole basket. A cancelled wallet sheet sends DELETE `cart/item`; a failed payment or a failed
 * checkout validation sends nothing, so the product stays in the basket and the next tap adds it again. The plugin's
 * own de-duplication (`remove_cart_item( generate_cart_id(...) )`) misses a line that carries SGS picks, so a repeat
 * tap raised the quantity. A shopper meaning to buy one 40-pack was charged for two plus an earlier failed 20-pack.
 *
 * This class gives the product-page payment its own basket:
 * 1. Before the plugin handles POST `cart/item` (`rest_pre_dispatch`, which also fires for the plugin's
 *    `?wc-ajax=wc_stripe_frontend_request&path=...` route because that handler calls `rest_api_loaded()`), the
 *    shopper's lines and coupons go to a WooCommerce session key and the basket is emptied. A repeat tap finds the
 *    stash already there and only empties the basket again, so a failed attempt never accumulates.
 * 2. The stash is restored and cleared after DELETE `cart/item` (cancel), after a failed POST `cart/item`, once the
 *    order from POST `cart/checkout` (context `product`) exists (at `shutdown`, after the plugin has emptied the
 *    basket it just paid for), and on the next ordinary page request.
 *
 * Product page versus cart and checkout page: only the product-page controller calls `cart/item`; the cart, mini-cart
 * and checkout wallet buttons call `cart/checkout` alone, with `context` `cart` or `checkout` (`context` `product`
 * is the product page). So a stash exists only after a product-page tap, and a `cart/checkout` request with another
 * context never touches it: those buttons pay for the real basket.
 *
 * This corrects an overcharge, so it is on for every site that runs that plugin and has no setting.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Express_Basket_Isolation
 */
final class Express_Basket_Isolation {

	/** WooCommerce session key holding the stashed basket. */
	public const STASH_KEY = 'sgs_express_basket_stash';

	/** The plugin's add-to-basket route (POST adds, DELETE removes). */
	public const ITEM_ROUTE = '/wc-stripe/v1/cart/item';

	/** The plugin's pay route. */
	public const CHECKOUT_ROUTE = '/wc-stripe/v1/cart/checkout';

	/** True once the order for a product-page payment exists in this request: restore at shutdown. */
	private static bool $restore_at_shutdown = false;

	/** The `context` of the POST `cart/checkout` being handled (`product`, `cart` or `checkout`); empty otherwise. */
	private static string $checkout_context = '';

	/**
	 * Hook in once every plugin has loaded, and only when Payment Plugins for Stripe is present.
	 */
	public static function register(): void {
		\add_action( 'plugins_loaded', array( __CLASS__, 'maybe_hook' ), 20 );
	}

	/**
	 * Add the hooks when the Stripe plugin runs.
	 */
	public static function maybe_hook(): void {
		if ( ! \function_exists( 'stripe_wc' ) && ! \class_exists( 'WC_Stripe_Rest_API', false ) ) {
			return;
		}
		\add_filter( 'rest_pre_dispatch', array( __CLASS__, 'before_dispatch' ), 5, 3 );
		\add_filter( 'rest_post_dispatch', array( __CLASS__, 'after_dispatch' ), 5, 3 );
		\add_action( 'woocommerce_checkout_order_processed', array( __CLASS__, 'order_created' ), 10, 0 );
		\add_action( 'template_redirect', array( __CLASS__, 'restore_on_page_load' ), 1 );
	}

	/**
	 * `rest_pre_dispatch`: stash and empty the basket before POST `cart/item` runs; note a product-page `cart/checkout`.
	 *
	 * @param mixed            $result  Pre-dispatch result (returned unchanged).
	 * @param \WP_REST_Server  $server  Server.
	 * @param \WP_REST_Request $request Request.
	 * @return mixed
	 */
	public static function before_dispatch( $result, $server = null, $request = null ) {
		if ( ! $request instanceof \WP_REST_Request || ! self::cart_ready() ) {
			return $result;
		}
		if ( 'POST' === self::method( $request ) && self::is_route( $request, self::ITEM_ROUTE ) ) {
			self::stash_and_empty();
		} elseif ( 'POST' === self::method( $request ) && self::is_route( $request, self::CHECKOUT_ROUTE ) ) {
			self::$checkout_context = (string) $request->get_param( 'context' );
		}
		return $result;
	}

	/**
	 * `rest_post_dispatch`: restore after a cancel (DELETE `cart/item`) or a failed add (POST `cart/item`).
	 *
	 * @param mixed            $response Response (returned unchanged).
	 * @param \WP_REST_Server  $server   Server.
	 * @param \WP_REST_Request $request  Request.
	 * @return mixed
	 */
	public static function after_dispatch( $response, $server = null, $request = null ) {
		if ( ! $request instanceof \WP_REST_Request || ! self::cart_ready() || ! self::is_route( $request, self::ITEM_ROUTE ) ) {
			return $response;
		}
		$method = self::method( $request );
		if ( 'DELETE' === $method ) {
			self::restore();
		} elseif ( 'POST' === $method && self::is_error_response( $response ) ) {
			self::restore();
		}
		return $response;
	}

	/**
	 * `woocommerce_checkout_order_processed`: the order for a product-page payment now holds only the express
	 * product. Restore the shopper's other lines once the request has finished with the basket.
	 */
	public static function order_created(): void {
		if ( ! self::has_stash() || self::$restore_at_shutdown ) {
			return;
		}
		if ( 'product' !== self::$checkout_context ) {
			return;
		}
		self::$restore_at_shutdown = true;
		\add_action( 'shutdown', array( __CLASS__, 'restore' ), 5 );
	}

	/**
	 * `template_redirect`: a stash left by an abandoned tap returns on the next ordinary page.
	 */
	public static function restore_on_page_load(): void {
		if ( ! self::cart_ready() || ! self::has_stash() || self::is_skipped_request() ) {
			return;
		}
		self::restore();
	}

	/**
	 * Save the shopper's basket on the first tap, then empty it.
	 */
	public static function stash_and_empty(): void {
		if ( ! self::has_stash() ) {
			$cart = \WC()->cart;
			\WC()->session->set(
				self::STASH_KEY,
				array(
					'cart'    => $cart->get_cart_for_session(),
					'coupons' => $cart->get_applied_coupons(),
				)
			);
		}
		\WC()->cart->empty_cart( false );
	}

	/**
	 * Put the stashed basket back, then clear the stash. The session's own cart format is replayed through
	 * WooCommerce's load-from-session path, so picks, fields, quantities and coupons return as a page load builds them.
	 */
	public static function restore(): void {
		if ( ! self::cart_ready() ) {
			return;
		}
		$stash = \WC()->session->get( self::STASH_KEY );
		if ( ! \is_array( $stash ) ) {
			return;
		}
		// Clear first: a second call in the same request must find nothing to restore.
		\WC()->session->set( self::STASH_KEY, null );
		$cart = \WC()->cart;
		$cart->empty_cart( false );
		\WC()->session->set( 'cart', (array) ( $stash['cart'] ?? array() ) );
		\WC()->session->set( 'applied_coupons', (array) ( $stash['coupons'] ?? array() ) );
		$cart->get_cart_from_session();
		$cart->calculate_totals();
		$cart->set_session();
	}

	/**
	 * Whether a stash is waiting in the session.
	 */
	public static function has_stash(): bool {
		return self::cart_ready() && \is_array( \WC()->session->get( self::STASH_KEY ) );
	}

	/**
	 * Requests that must not restore: the plugin's own ajax calls, REST (Store API too) and the checkout and
	 * order-received pages, where the order-review step still needs the express product.
	 */
	private static function is_skipped_request(): bool {
		if ( \defined( 'REST_REQUEST' ) || \defined( 'DOING_AJAX' ) || \defined( 'WC_DOING_AJAX' ) ) {
			return true;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only route check.
		if ( isset( $_GET['wc-ajax'] ) ) {
			return true;
		}
		return \function_exists( 'is_checkout' ) && \is_checkout();
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 */
	private static function method( $request ): string {
		return \strtoupper( (string) $request->get_method() );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @param string           $route   Route to match.
	 */
	private static function is_route( $request, string $route ): bool {
		return \rtrim( (string) $request->get_route(), '/' ) === $route;
	}

	/**
	 * @param mixed $response A REST response or a WP_Error.
	 */
	private static function is_error_response( $response ): bool {
		if ( \is_wp_error( $response ) ) {
			return true;
		}
		return \is_object( $response ) && \method_exists( $response, 'is_error' ) && $response->is_error();
	}

	/**
	 * WooCommerce's session and basket exist (not true on every request, e.g. admin ajax).
	 */
	private static function cart_ready(): bool {
		return \function_exists( 'WC' ) && \WC() && \WC()->session && \WC()->cart;
	}
}

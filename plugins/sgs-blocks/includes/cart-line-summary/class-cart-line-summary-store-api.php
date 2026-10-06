<?php
/**
 * Cart line summary — the Store API cart RESPONSE shape.
 *
 * The summary already says a line's size and colour, so WooCommerce's own
 * `variation` rows underneath it would repeat every one of them. This class
 * empties `variation` in the RESPONSE for the lines that carry a summary.
 *
 * ⛔ NEVER at cart level. Emptying `$cart_item['variation']` through
 * `woocommerce_add_cart_item` or `woocommerce_get_cart_item_from_session`
 * would strip the variation from the ORDER line item too, and the client
 * would lose the real measurements they need to fulfil the order. The cart
 * keeps every value; only what the cart and checkout blocks are handed to
 * PAINT is reshaped.
 *
 * TWO filters, not one, and both are required:
 *   - `rest_request_after_callbacks` — WP core's, used by every LIVE fetch
 *     (the drawer opening, a quantity change, add-to-cart);
 *   - `woocommerce_hydration_request_after_callbacks` — WooCommerce's own, in
 *     Hydration::get_response_from_controller(), used for the FIRST-PAINT
 *     payload embedded in the page.
 * Hooking only one leaves a visible flash of duplicated rows, either on first
 * paint or on the first interaction.
 *
 * Both callbacks are scoped to `/wc/store/v1/cart*` and FAIL OPEN: any
 * response that is not the familiar `{ items: [ ... ] }` shape is returned
 * exactly as it arrived, so a WooCommerce release that changes the payload
 * degrades to duplicate rows rather than an empty cart.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Cart_Line_Summary_Store_API
 */
final class Cart_Line_Summary_Store_API {

	/** The Store API cart route prefix this class will touch, and no other. */
	const ROUTE_PREFIX = '/wc/store/v1/cart';

	/** Wire the two response filters. */
	public static function register(): void {
		\add_filter( 'rest_request_after_callbacks', array( __CLASS__, 'filter_response' ), 10, 3 );
		\add_filter( 'woocommerce_hydration_request_after_callbacks', array( __CLASS__, 'filter_response' ), 10, 3 );
	}

	/**
	 * Empty `variation` on every response cart line that carries a summary.
	 *
	 * A line WITHOUT a summary keeps its variation rows untouched — that is
	 * what leaves a plain variable product, on a site with no summary wording
	 * set, rendering exactly as WooCommerce intends.
	 *
	 * @param \WP_REST_Response|\WP_HTTP_Response|\WP_Error|mixed $response The response so far.
	 * @param array|mixed                                         $handler  The matched route handler.
	 * @param \WP_REST_Request|mixed                              $request  The request.
	 * @return \WP_REST_Response|\WP_HTTP_Response|\WP_Error|mixed
	 */
	public static function filter_response( $response, $handler, $request ) {
		unset( $handler );

		if ( \is_wp_error( $response ) || ! \is_object( $response ) || ! \method_exists( $response, 'get_data' ) ) {
			return $response;
		}
		if ( ! \is_object( $request ) || ! \method_exists( $request, 'get_route' ) ) {
			return $response;
		}
		if ( 0 !== \strpos( (string) $request->get_route(), self::ROUTE_PREFIX ) ) {
			return $response;
		}

		$data = $response->get_data();
		if ( ! \is_array( $data ) || ! isset( $data['items'] ) || ! \is_array( $data['items'] ) ) {
			return $response;
		}

		$changed = false;
		foreach ( $data['items'] as $index => $item ) {
			if ( ! \is_array( $item ) || ! isset( $item['variation'] ) || ! \is_array( $item['variation'] ) ) {
				continue;
			}
			if ( empty( $item['variation'] ) ) {
				continue;
			}
			$summary = self::line_summary_of( $item );
			if ( empty( $summary ) ) {
				continue;
			}
			$data['items'][ $index ]['variation'] = array();
			$changed                              = true;
		}

		if ( $changed ) {
			$response->set_data( $data );
		}

		return $response;
	}

	/**
	 * This line's summary, whatever shape the Store API serialised it in.
	 *
	 * `extensions` arrives as a stdClass, not an array: WooCommerce casts it so
	 * that a line with no extension data serialises as `{}` rather than `[]`.
	 * Reaching into it with array syntax therefore raised
	 * "Cannot use object of type stdClass as array" on EVERY Store API cart
	 * request that carried a variation — which took the bag count, the bag
	 * panel and the whole add-to-bag journey down with it. The namespace below
	 * it can be either shape for the same reason, so both levels are
	 * normalised rather than assumed.
	 *
	 * @param array $item One cart item from the response payload.
	 * @return array<int, string> The summary lines, or an empty array.
	 */
	private static function line_summary_of( array $item ): array {
		$extensions = $item['extensions'] ?? null;
		if ( \is_object( $extensions ) ) {
			$extensions = (array) $extensions;
		}
		if ( ! \is_array( $extensions ) ) {
			return array();
		}

		$namespaced = $extensions['sgs'] ?? null;
		if ( \is_object( $namespaced ) ) {
			$namespaced = (array) $namespaced;
		}
		if ( ! \is_array( $namespaced ) ) {
			return array();
		}

		$summary = $namespaced['lineSummary'] ?? null;

		return \is_array( $summary ) ? $summary : array();
	}
}

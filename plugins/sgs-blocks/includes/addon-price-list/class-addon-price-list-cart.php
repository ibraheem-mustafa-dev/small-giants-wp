<?php
/**
 * SGS Add-on price list — WooCommerce cart/order integration (Spec 43 FR-43-18).
 *
 * The add-on price list (functions.php) is the only price authority: the
 * browser sends only {group, key} pairs, never a price or a label. This
 * class is where those pairs get resolved, priced, carried through the
 * cart/session, applied to the line total, and copied to the order.
 *
 * Registered only when WooCommerce is active (see load.php).
 *
 * @package SGS\Blocks
 * @since   1.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Addon_Price_List_Cart
 */
final class Addon_Price_List_Cart {

	/** Cart-item-data key holding the shopper's raw {group,key} choices. */
	const PAIRS_KEY = 'sgs_addon_pairs';

	/** Cart-item-data / order-item-meta key holding the resolved, priced lines. */
	const LINES_KEY = 'sgs_addons';

	/** Wire WC hooks. */
	public static function register(): void {
		\add_filter( 'woocommerce_add_cart_item_data', array( __CLASS__, 'add_cart_item_data' ), 10, 3 );
		\add_action( 'woocommerce_before_calculate_totals', array( __CLASS__, 'calculate_totals' ), 20, 1 );
		\add_filter( 'woocommerce_get_item_data', array( __CLASS__, 'get_item_data' ), 10, 2 );
		\add_action( 'woocommerce_checkout_create_order_line_item', array( __CLASS__, 'copy_to_order_line_item' ), 10, 4 );
		\add_filter( 'woocommerce_get_cart_item_from_session', array( __CLASS__, 'restore_from_session' ), 10, 2 );
		\add_filter( 'woocommerce_store_api_add_to_cart_data', array( __CLASS__, 'store_api_add_to_cart_data' ), 10, 2 );
	}

	/**
	 * (a) Resolve {group,key} pairs at add-to-cart time and store the priced
	 * lines on the cart item. Throws on an invalid pair so both the classic
	 * `/sgs/v1/cart/add-item` proxy path and the Store API path (which both
	 * end up inside `WC_Cart::add_to_cart()`, see that method's try/catch)
	 * abort the add cleanly with the shopper-facing WC error notice.
	 *
	 * @param array $cart_item_data Existing cart item data.
	 * @param int   $product_id     Product ID.
	 * @param int   $variation_id   Variation ID.
	 * @return array
	 * @throws \Exception When the submitted pairs do not resolve. Caught by
	 *                    WC_Cart::add_to_cart()'s own try/catch, which turns
	 *                    it into a wc_add_notice() + a `false` return.
	 */
	public static function add_cart_item_data( array $cart_item_data, int $product_id, int $variation_id ): array {
		unset( $product_id, $variation_id );

		if ( empty( $cart_item_data[ self::PAIRS_KEY ] ) || ! \is_array( $cart_item_data[ self::PAIRS_KEY ] ) ) {
			return $cart_item_data;
		}

		$resolved = sgs_addon_resolve( $cart_item_data[ self::PAIRS_KEY ] );
		if ( \is_wp_error( $resolved ) ) {
			throw new \Exception( \esc_html( $resolved->get_error_message() ) );
		}

		$cart_item_data[ self::LINES_KEY ] = $resolved['lines'];

		return $cart_item_data;
	}

	/**
	 * (b) Re-resolve every cart line's stored {group,key} pairs against the
	 * CURRENT price list and set the item's price to product price + add-on
	 * total, so a price change on the settings page applies from the next
	 * recalculation. If an option has since been deleted, the stored price
	 * is kept and the mismatch is logged rather than silently re-priced —
	 * never trusting client-sent numbers either way.
	 *
	 * Guarded against non-cart admin contexts (the well-known WooCommerce
	 * recipe) — this hook otherwise fires on every admin order-edit screen
	 * load too, where there is no shopper cart to reprice.
	 *
	 * @param \WC_Cart $cart The cart being totalled.
	 */
	public static function calculate_totals( \WC_Cart $cart ): void {
		if ( \is_admin() && ! \defined( 'DOING_AJAX' ) ) {
			return;
		}

		foreach ( $cart->get_cart() as $cart_item ) {
			if ( empty( $cart_item[ self::PAIRS_KEY ] ) || ! \is_array( $cart_item[ self::PAIRS_KEY ] ) ) {
				continue;
			}
			if ( ! isset( $cart_item['data'] ) || ! ( $cart_item['data'] instanceof \WC_Product ) ) {
				continue;
			}

			$resolved = sgs_addon_resolve( $cart_item[ self::PAIRS_KEY ] );
			if ( \is_wp_error( $resolved ) ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- deliberate: a deleted add-on option must surface somewhere, and this is a re-price, not a request, so there is no REST response to carry the warning.
				\error_log(
					\sprintf(
						'SGS add-on price list: %s — keeping the price stored on the cart line.',
						$resolved->get_error_message()
					)
				);
				$lines       = \is_array( $cart_item[ self::LINES_KEY ] ?? null ) ? $cart_item[ self::LINES_KEY ] : array();
				$addon_total = \array_sum( \wp_list_pluck( $lines, 'price' ) );
			} else {
				$cart_item[ self::LINES_KEY ] = $resolved['lines'];
				$addon_total                  = $resolved['total'];
			}

			$base_price = (float) $cart_item['data']->get_price( 'edit' );
			$cart_item['data']->set_price( $base_price + (float) $addon_total );
		}
	}

	/**
	 * (c) One display row in the cart/checkout item list — the group labels
	 * are client-specific, so the row's own label comes from a filterable
	 * default rather than a hardcoded name like "Lenses".
	 *
	 * @param array $item_data Existing display rows.
	 * @param array $cart_item The cart item.
	 * @return array
	 */
	public static function get_item_data( array $item_data, array $cart_item ): array {
		if ( empty( $cart_item[ self::LINES_KEY ] ) || ! \is_array( $cart_item[ self::LINES_KEY ] ) ) {
			return $item_data;
		}

		$summary = sgs_addon_summary( $cart_item[ self::LINES_KEY ] );
		if ( '' === $summary ) {
			return $item_data;
		}

		$item_data[] = array(
			'name'  => \apply_filters( 'sgs_addon_cart_label', \__( 'Options', 'sgs-blocks' ) ),
			'value' => $summary,
		);

		return $item_data;
	}

	/**
	 * (d) Copy the summary and each individual line to order item meta —
	 * visible to both staff (admin order screen) and the customer (order
	 * emails, My Account order view).
	 *
	 * @param \WC_Order_Item_Product $item          Order line item.
	 * @param string                 $cart_item_key Cart item key.
	 * @param array                  $values        Cart item values.
	 * @param \WC_Order              $order         The order.
	 */
	public static function copy_to_order_line_item( \WC_Order_Item_Product $item, string $cart_item_key, array $values, \WC_Order $order ): void {
		unset( $cart_item_key, $order );

		if ( empty( $values[ self::LINES_KEY ] ) || ! \is_array( $values[ self::LINES_KEY ] ) ) {
			return;
		}

		$summary = sgs_addon_summary( $values[ self::LINES_KEY ] );
		if ( '' !== $summary ) {
			$item->add_meta_data( \apply_filters( 'sgs_addon_cart_label', \__( 'Options', 'sgs-blocks' ) ), $summary, true );
		}

		foreach ( $values[ self::LINES_KEY ] as $line ) {
			$group_label = (string) ( $line['group_label'] ?? '' );
			$label       = (string) ( $line['label'] ?? '' );
			$price       = (float) ( $line['price'] ?? 0 );
			if ( '' === $group_label ) {
				continue;
			}
			$item->add_meta_data( $group_label, \wc_price( $price ) === '' ? $label : $label . ' (' . \wp_strip_all_tags( \wc_price( $price ) ) . ')', true );
		}
	}

	/**
	 * (e) Restore the resolved lines and raw pairs on session restore
	 * (browser reload with an existing cart) — otherwise they are dropped
	 * the moment `WC()->cart` is rebuilt from the session.
	 *
	 * @param array $cart_item Cart item being restored.
	 * @param array $values    Raw session values for that item.
	 * @return array
	 */
	public static function restore_from_session( array $cart_item, array $values ): array {
		if ( isset( $values[ self::PAIRS_KEY ] ) ) {
			$cart_item[ self::PAIRS_KEY ] = $values[ self::PAIRS_KEY ];
		}
		if ( isset( $values[ self::LINES_KEY ] ) ) {
			$cart_item[ self::LINES_KEY ] = $values[ self::LINES_KEY ];
		}
		return $cart_item;
	}

	/**
	 * Store API bridge: a block-based add-to-cart (or any direct Store API
	 * caller) sends the same {group,key} pairs as the classic proxy, under
	 * a top-level `sgs_addons` request param; thread them into
	 * `cart_item_data` so (a) above picks them up identically either way.
	 *
	 * @param array            $add_to_cart_data Data about to reach CartController::add_to_cart().
	 * @param \WP_REST_Request $request          The incoming Store API request.
	 * @return array
	 */
	public static function store_api_add_to_cart_data( array $add_to_cart_data, \WP_REST_Request $request ): array {
		$pairs = $request->get_param( 'sgs_addons' );
		if ( empty( $pairs ) || ! \is_array( $pairs ) ) {
			return $add_to_cart_data;
		}

		$sanitised = self::sanitise_pairs( $pairs );
		if ( empty( $sanitised ) ) {
			return $add_to_cart_data;
		}

		$add_to_cart_data['cart_item_data']                    = (array) ( $add_to_cart_data['cart_item_data'] ?? array() );
		$add_to_cart_data['cart_item_data'][ self::PAIRS_KEY ] = $sanitised;

		return $add_to_cart_data;
	}

	/**
	 * Sanitise a raw {group,key} pair list from a REST request into the
	 * plain shape sgs_addon_resolve() expects. Shared by the Store API
	 * bridge above; the classic proxy's own `addons` REST arg carries its
	 * own sanitize_callback (see Cart_Proxy::register_route()).
	 *
	 * @param array $pairs Raw pairs.
	 * @return array<int,array{group:string,key:string}>
	 */
	public static function sanitise_pairs( array $pairs ): array {
		$out = array();
		foreach ( $pairs as $pair ) {
			if ( ! \is_array( $pair ) || ! isset( $pair['group'], $pair['key'] )
				|| ! \is_scalar( $pair['group'] ) || ! \is_scalar( $pair['key'] ) ) {
				continue;
			}
			$out[] = array(
				'group' => \sanitize_key( (string) $pair['group'] ),
				'key'   => \sanitize_key( (string) $pair['key'] ),
			);
		}
		return $out;
	}
}

<?php
/**
 * Everything this framework adds to each cart line of the WooCommerce Store API.
 *
 * The Store API's cart item carries no brand and no summary, so this adds
 * them as extension data under the `sgs` namespace:
 *   - `items[].extensions.sgs.brand`       the first `product_brand` term's name, or ''
 *   - `items[].extensions.sgs.lineSummary` the line's summary lines (0, 1 or 2)
 *   - `items[].extensions.sgs.hasLenses`   whether the line carries priced add-ons
 *
 * ⚠️ ONE registration carries ALL of them, and it has to.
 * ExtendSchema::register_endpoint_data() stores each registration as
 * `$extend_data[ $endpoint ][ $namespace ]` — a plain assignment keyed on the
 * namespace. A SECOND registration naming `sgs` on the same endpoint does not
 * merge and does not raise an error: it silently REPLACES the first, and
 * whichever registered last is the only one the response carries. Splitting
 * these fields across two files would therefore drop one set with no warning.
 * Verified against the installed WooCommerce (11.1.0) at
 * src/StoreApi/Schemas/ExtendSchema.php.
 *
 * `hasLenses` is named for the shopper-facing QUESTION the bag asks, not for
 * any trade: it is true when the line has resolved priced add-ons, and the bag
 * drawer uses it to stop offering an action the shopper has already taken.
 *
 * Read-only data on WooCommerce's own endpoint: no new route, nothing written.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * The brand name for one cart line.
 *
 * @param array $cart_item A WooCommerce cart item.
 * @return string
 */
function sgs_cart_item_brand_name( $cart_item ) {
	$product_id = absint( $cart_item['product_id'] ?? 0 );
	if ( ! $product_id || ! taxonomy_exists( 'product_brand' ) ) {
		return '';
	}
	$names = wp_get_post_terms( $product_id, 'product_brand', array( 'fields' => 'names' ) );
	return ( is_array( $names ) && $names ) ? (string) reset( $names ) : '';
}

/**
 * All of this framework's extension data for one cart line.
 *
 * @param array $cart_item A WooCommerce cart item.
 * @return array{brand:string,lineSummary:array<int,string>,hasLenses:bool}
 */
function sgs_cart_item_extension_data( $cart_item ) {
	$cart_item = is_array( $cart_item ) ? $cart_item : array();

	// The summary builder loads from includes/cart-line-summary/load.php. This
	// callback runs inside a REST response, where a missing function would
	// fatal the whole cart rather than one row, so an absent builder degrades
	// to no summary — the bag then falls back to WooCommerce's own rows.
	$has_builder = function_exists( '\SGS\Blocks\sgs_cart_line_summary_for_cart_item' );

	return array(
		'brand'       => sgs_cart_item_brand_name( $cart_item ),
		'lineSummary' => $has_builder ? \SGS\Blocks\sgs_cart_line_summary_for_cart_item( $cart_item ) : array(),
		'hasLenses'   => $has_builder && \SGS\Blocks\sgs_cart_line_summary_has_addons( $cart_item ),
	);
}

/**
 * Register the extension data once the Store API is loaded.
 */
function sgs_register_cart_item_extensions() {
	if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' ) || ! class_exists( '\Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema' ) ) {
		return;
	}
	woocommerce_store_api_register_endpoint_data(
		array(
			'endpoint'        => \Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema::IDENTIFIER,
			'namespace'       => 'sgs',
			'data_callback'   => 'sgs_cart_item_extension_data',
			'schema_callback' => static function () {
				return array(
					'brand'       => array(
						'description' => __( 'The product brand name.', 'sgs-blocks' ),
						'type'        => 'string',
						'readonly'    => true,
					),
					'lineSummary' => array(
						'description' => __( 'The line summary, one entry per display line.', 'sgs-blocks' ),
						'type'        => 'array',
						'items'       => array( 'type' => 'string' ),
						'readonly'    => true,
					),
					'hasLenses'   => array(
						'description' => __( 'Whether this line already carries priced add-ons.', 'sgs-blocks' ),
						'type'        => 'boolean',
						'readonly'    => true,
					),
				);
			},
			'schema_type'     => ARRAY_A,
		)
	);
}
add_action( 'woocommerce_blocks_loaded', 'sgs_register_cart_item_extensions' );

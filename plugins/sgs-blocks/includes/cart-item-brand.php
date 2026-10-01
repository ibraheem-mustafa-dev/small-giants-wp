<?php
/**
 * The product's brand on each cart line of the WooCommerce Store API.
 *
 * The mini-cart panel (sgs/cart, item-row-template.js) shows a line's brand
 * above its name. The Store API's cart item carries no brand, so this adds it
 * as extension data under the `sgs` namespace:
 * `items[].extensions.sgs.brand` (the first `product_brand` term's name, or
 * '' when the product has none or the taxonomy does not exist).
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
 * @return array{brand:string}
 */
function sgs_cart_item_brand_data( $cart_item ) {
	$product_id = absint( $cart_item['product_id'] ?? 0 );
	if ( ! $product_id || ! taxonomy_exists( 'product_brand' ) ) {
		return array( 'brand' => '' );
	}
	$names = wp_get_post_terms( $product_id, 'product_brand', array( 'fields' => 'names' ) );
	return array( 'brand' => ( is_array( $names ) && $names ) ? (string) reset( $names ) : '' );
}

/**
 * Register the extension data once the Store API is loaded.
 */
function sgs_register_cart_item_brand() {
	if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' ) || ! class_exists( '\Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema' ) ) {
		return;
	}
	woocommerce_store_api_register_endpoint_data(
		array(
			'endpoint'        => \Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema::IDENTIFIER,
			'namespace'       => 'sgs',
			'data_callback'   => 'sgs_cart_item_brand_data',
			'schema_callback' => static function () {
				return array(
					'brand' => array(
						'description' => __( 'The product brand name.', 'sgs-blocks' ),
						'type'        => 'string',
						'readonly'    => true,
					),
				);
			},
			'schema_type'     => ARRAY_A,
		)
	);
}
add_action( 'woocommerce_blocks_loaded', 'sgs_register_cart_item_brand' );

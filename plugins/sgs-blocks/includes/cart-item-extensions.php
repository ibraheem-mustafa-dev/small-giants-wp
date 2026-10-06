<?php
/**
 * Everything this framework adds to each cart line of the WooCommerce Store API.
 *
 * The Store API's cart item carries no brand and no summary, so this adds
 * them as extension data under the `sgs` namespace:
 *   - `items[].extensions.sgs.brand`       the first brand term's name, or ''
 *   - `items[].extensions.sgs.brandLogo`   that brand's logo {url,width,height}
 *   - `items[].extensions.sgs.lineSummary` the line's summary lines (0, 1 or 2)
 *   - `items[].extensions.sgs.hasLenses`   whether the line carries priced add-ons
 *
 * ⚠️ A brand LOGO can only be drawn where this framework owns the renderer —
 * the bag drawer (src/blocks/cart/item-row-template.js). WooCommerce's own
 * cart and checkout line items run every value through their `ProductDetails`
 * component, which sanitises to `a, b, em, i, strong, br, abbr, span`: an
 * `<img>` is silently stripped there, with no warning and no error. Those two
 * surfaces can therefore only ever show the brand NAME. That is a documented
 * WooCommerce ceiling, not an unfinished edge — do not "fix" it by injecting
 * markup into a cart-item-data filter, which cannot work.
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

// The shared brand lookup. Required HERE rather than relying on
// render-helpers.php: this file is loaded from the plugin bootstrap, and its
// data callback runs inside a Store API response where a missing function
// would fatal the whole cart rather than one line.
require_once __DIR__ . '/helpers-brand-logo.php';

/**
 * The brand name and logo for one cart line, from the framework's shared
 * brand lookup (includes/helpers-brand-logo.php) — so a bag line, a product
 * card and the brand strip all resolve a brand the same way, through the
 * `sgs_product_card_brand_taxonomy` filter rather than a hardcoded taxonomy.
 *
 * @param array $cart_item A WooCommerce cart item.
 * @return array{name:string,url:string,width:int,height:int}
 */
function sgs_cart_item_brand( $cart_item ) {
	$brand = sgs_brand_logo_for_product( absint( $cart_item['product_id'] ?? 0 ) );

	return array(
		'name'   => $brand['name'],
		'url'    => $brand['url'],
		'width'  => $brand['width'],
		'height' => $brand['height'],
	);
}

/**
 * All of this framework's extension data for one cart line.
 *
 * @param array $cart_item A WooCommerce cart item.
 * @return array{brand:string,brandLogo:array,lineSummary:array<int,string>,hasLenses:bool}
 */
function sgs_cart_item_extension_data( $cart_item ) {
	$cart_item = is_array( $cart_item ) ? $cart_item : array();
	$brand     = sgs_cart_item_brand( $cart_item );

	// The summary builder loads from includes/cart-line-summary/load.php. This
	// callback runs inside a REST response, where a missing function would
	// fatal the whole cart rather than one row, so an absent builder degrades
	// to no summary — the bag then falls back to WooCommerce's own rows.
	$has_builder = function_exists( '\SGS\Blocks\sgs_cart_line_summary_for_cart_item' );

	return array(
		'brand'       => $brand['name'],
		'brandLogo'   => array(
			'url'    => $brand['url'],
			'width'  => $brand['width'],
			'height' => $brand['height'],
		),
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
					'brandLogo'   => array(
						'description' => __( 'The brand logo, when the brand has one. `url` is empty otherwise, and the bag line shows the brand name instead. The logo is always labelled with the brand name, never with the attachment alt text.', 'sgs-blocks' ),
						'type'        => 'object',
						'readonly'    => true,
						'properties'  => array(
							'url'    => array( 'type' => 'string' ),
							'width'  => array( 'type' => 'integer' ),
							'height' => array( 'type' => 'integer' ),
						),
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

<?php
/**
 * Price display option for a connected sgs/product-card: the "From <lowest price>"
 * display of a variable or ranged product (priceFromLowest, read with the card's
 * "From each product" mode). Whole-pound ".00" trimming is the shop-wide setting in
 * includes/price-trim-zeros.php, not a card setting.
 *
 * The lowest price is Product_Bindings::get_product_data()'s price_from_html (the
 * minimum variation price through wc_get_price_to_display(), empty when every
 * variation costs the same), the value the read-only and non-configurator branches
 * already print under the "From" label.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_card_from_lowest' ) ) {
	/**
	 * Whether a variable card prints "From <lowest price>" instead of the default variation's price.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param mixed               $data       Product data.
	 * @return bool
	 */
	function sgs_product_card_from_lowest( array $attributes, $data ): bool {
		return 'product' === ( $attributes['cardContentSource'] ?? 'typed' )
			&& ! empty( $attributes['priceFromLowest'] )
			&& is_array( $data )
			&& ! empty( $data['is_variable'] )
			&& ! empty( $data['price_from_html'] );
	}
}

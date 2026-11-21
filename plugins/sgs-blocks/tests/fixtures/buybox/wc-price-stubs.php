<?php
/**
 * The WooCommerce price and attachment functions a simple product's buy box manifest reads
 * (includes/class-product-manifest.php::build_simple), answering from the --product-file product with no tax: the display,
 * excluding and including prices are all the price asked for (`price` in the args) or the product's own price. Loaded only by
 * the buy box test wrappers (flow-render-wrapper.php), so no other harness render sees these functions.
 *
 * Test scaffolding only; nothing here is shipped.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

function wc_get_price_decimals() {
	return 2;
}

function get_woocommerce_currency_symbol( $currency = '' ) {
	return '&pound;';
}

function wc_get_price_to_display( $product, $args = array() ) {
	return (float) ( $args['price'] ?? $product->get_price() );
}

function wc_get_price_excluding_tax( $product, $args = array() ) {
	return wc_get_price_to_display( $product, $args );
}

function wc_get_price_including_tax( $product, $args = array() ) {
	return wc_get_price_to_display( $product, $args );
}

/** An attachment is an image when the harness can name its URL (the product's `image_id`, or an --attachments-file entry). */
function wp_attachment_is_image( $id = 0 ) {
	return '' !== wp_get_attachment_image_url( $id );
}

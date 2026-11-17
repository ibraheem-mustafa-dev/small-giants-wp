<?php
/**
 * sgs/button's `add-to-basket` link source: resolve the product, its one-tap add and the `{price}` label.
 *
 * The button is always a real link to the product's page, so it works with no JavaScript. When the product can be added
 * in one tap, the link also carries the data the view module needs: the request body for the SGS cart proxy
 * (`POST /sgs/v1/cart/add-item`, the route the buy box and the cart drawer's empty state add through), the route's URL and
 * its nonce. The default variation and default picks come from `sgs_cart_empty_product()`
 * (includes/helpers-cart-panel-extras.php), the one resolver the drawer's empty-state button uses.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_button_add_to_basket' ) ) {
	/**
	 * What an add-to-basket button does for a product.
	 *
	 * @param int        $product_id The chosen WooCommerce product ID.
	 * @param string     $after      'stay' or 'basket': where the shopper goes after a successful add.
	 * @param array|null $deps       Test seams: `get_product` ( int $id ), `status` ( int $id ): string|false, `resolve` ( object $product ): array, `price_text` ( float $price ): string, `rest_url` ( string $path ): string, `nonce` (): string, `basket_url` (): string, `on_basket_page` (): bool. Default: WordPress and WooCommerce.
	 * @return array{url:string,price_text:string,attrs:array<string,string>}|null Null when the product is missing, unpublished or cannot be bought: the caller keeps the typed URL and the plain label. `url` is the product page (unescaped); `attrs` are the data attributes of a one-tap add, empty when the product can only be linked to; `price_text` is the price as plain text.
	 */
	function sgs_button_add_to_basket( int $product_id, string $after = 'stay', ?array $deps = null ): ?array {
		$deps = (array) $deps;
		if ( $product_id <= 0 ) {
			return null;
		}
		$get_product = $deps['get_product'] ?? ( function_exists( 'wc_get_product' ) ? 'wc_get_product' : null );
		if ( null === $get_product ) {
			return null;
		}
		$status = isset( $deps['status'] ) ? $deps['status']( $product_id ) : get_post_status( $product_id );
		if ( 'publish' !== $status ) {
			return null;
		}
		$product = $get_product( $product_id );
		if ( ! $product || ! $product->is_purchasable() ) {
			return null;
		}

		$resolved   = isset( $deps['resolve'] ) ? $deps['resolve']( $product ) : sgs_cart_empty_product( $product );
		$price_text = isset( $deps['price_text'] )
			? $deps['price_text']( (float) $resolved['price'] )
			: html_entity_decode( wp_strip_all_tags( wc_price( (float) $resolved['price'] ) ), ENT_QUOTES, 'UTF-8' );
		$out        = array(
			'url'        => (string) $resolved['url'],
			'price_text' => $price_text,
			'attrs'      => array(),
		);
		if ( (int) $resolved['add_id'] <= 0 ) {
			// No complete default to add (a variable product with no default choice, or out of stock): link to the page.
			return $out;
		}

		$body = is_array( $resolved['body'] )
			? $resolved['body']
			: array(
				'id'       => (int) $resolved['add_id'],
				'quantity' => 1,
			);
		$on_basket_page = isset( $deps['on_basket_page'] )
			? (bool) $deps['on_basket_page']()
			: ( ( function_exists( 'is_cart' ) && is_cart() ) || ( function_exists( 'is_checkout' ) && is_checkout() ) );
		$rest_url       = isset( $deps['rest_url'] ) ? $deps['rest_url']( 'sgs/v1/cart/add-item' ) : rest_url( 'sgs/v1/cart/add-item' );
		$nonce          = isset( $deps['nonce'] ) ? (string) $deps['nonce']() : wp_create_nonce( 'wp_rest' );
		$basket_url     = isset( $deps['basket_url'] ) ? (string) $deps['basket_url']() : ( function_exists( 'wc_get_cart_url' ) ? (string) wc_get_cart_url() : '' );

		$out['attrs'] = array(
			'data-sgs-add-body'  => (string) wp_json_encode( $body ),
			'data-sgs-add-url'   => esc_url_raw( $rest_url ),
			'data-sgs-add-nonce' => $nonce,
			'data-sgs-add-after' => 'basket' === $after ? 'basket' : 'stay',
		);
		if ( 'basket' === $after && '' !== $basket_url ) {
			$out['attrs']['data-sgs-add-basket-url'] = esc_url_raw( $basket_url );
		}
		if ( $on_basket_page ) {
			// The basket and checkout pages draw their own contents once, so the page reloads to show the new line.
			$out['attrs']['data-sgs-add-reload'] = '1';
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_button_add_label' ) ) {
	/**
	 * Replace `{price}` in an add-to-basket label with the product's price as plain text.
	 *
	 * With no price (the product is unavailable) the placeholder and any separator dangling before it are dropped, so the
	 * label never prints a raw `{price}`.
	 *
	 * @param string $label      The label (rich text).
	 * @param string $price_text The price as plain text, '' when there is none.
	 * @return string
	 */
	function sgs_button_add_label( string $label, string $price_text ): string {
		if ( false === strpos( $label, '{price}' ) ) {
			return $label;
		}
		if ( '' !== $price_text ) {
			return str_replace( '{price}', esc_html( $price_text ), $label );
		}
		$label = (string) preg_replace( '/\s*[·|\-–—:]?\s*\{price\}/u', '', $label );
		return trim( str_replace( '{price}', '', $label ) );
	}
}

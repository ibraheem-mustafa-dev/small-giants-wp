<?php
/**
 * Sgs/wishlist-panel — URL resolution (Wave 3C FR-30-14/15).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_wishlist_panel_shop_url' ) ) {
	/**
	 * Resolve the shop page URL.
	 *
	 * @return string The shop page URL, or the home page when WooCommerce is inactive.
	 */
	function sgs_wishlist_panel_shop_url() {
		return ( class_exists( 'WooCommerce' ) && function_exists( 'wc_get_page_permalink' ) )
			? wc_get_page_permalink( 'shop' )
			: home_url( '/' );
	}
}

if ( ! function_exists( 'sgs_wishlist_panel_saved_items_url' ) ) {
	/**
	 * The Saved items page permalink (`woocommerce_saved_items_page_id`,
	 * WooCommerce's own `woocommerce_{key}_page_id` option naming —
	 * `wc_get_page_permalink( 'saved_items' )` reads it automatically).
	 *
	 * @return string The permalink, or '' if the page is not set/published.
	 */
	function sgs_wishlist_panel_saved_items_url() {
		if ( ! function_exists( 'wc_get_page_id' ) || ! function_exists( 'wc_get_page_permalink' ) ) {
			return '';
		}
		$page_id = wc_get_page_id( 'saved_items' );
		if ( $page_id <= 0 || 'publish' !== get_post_status( $page_id ) ) {
			return '';
		}
		return wc_get_page_permalink( 'saved_items' );
	}
}

if ( ! function_exists( 'sgs_wishlist_panel_view_all_url' ) ) {
	/**
	 * Resolve the "View all saved items" URL.
	 *
	 * @param array $attributes Block attributes.
	 * @return string The explicit attribute, else the Saved items page, else the shop.
	 */
	function sgs_wishlist_panel_view_all_url( $attributes ) {
		$explicit = esc_url_raw( trim( (string) ( $attributes['viewAllUrl'] ?? '' ) ) );
		if ( '' !== $explicit ) {
			return $explicit;
		}
		$saved_items_url = sgs_wishlist_panel_saved_items_url();
		return '' !== $saved_items_url ? $saved_items_url : sgs_wishlist_panel_shop_url();
	}
}

if ( ! function_exists( 'sgs_wishlist_panel_sign_in_url' ) ) {
	/**
	 * Resolve the sign-in URL.
	 *
	 * @return string The My account page, else `wp_login_url()`.
	 */
	function sgs_wishlist_panel_sign_in_url() {
		return ( class_exists( 'WooCommerce' ) && function_exists( 'wc_get_page_permalink' ) )
			? wc_get_page_permalink( 'myaccount' )
			: wp_login_url();
	}
}

<?php
/**
 * Whole-pound card prices: "£139", not "£139.00", on sgs/product-card only.
 *
 * When the `sgs_card_price_trim_zeros` filter returns true (the theme's Shop
 * setting "Hide .00 on whole-pound savings and card prices"), WooCommerce's own
 * `woocommerce_price_trim_zeros` is switched on while each product card renders
 * and off again afterwards. Every price the card formats through wc_price()
 * (the variable price, the struck-through RRP, a simple product's price HTML,
 * "From £X") then drops ".00"; a price with pennies keeps them (£59.50), since
 * wc_trim_zeros() strips the decimals only when they are all zero. The cart,
 * checkout and product page never see the switch.
 *
 * The card seeds the same flag into its Interactivity context (`trimZeros`),
 * so view.js formats a variation swap the same way.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_card_price_trim_zeros_enabled' ) ) {
	/**
	 * Whether product cards drop ".00" from whole-pound prices.
	 *
	 * @return bool
	 */
	function sgs_card_price_trim_zeros_enabled(): bool {
		/**
		 * Whether sgs/product-card prices drop ".00" on whole amounts.
		 *
		 * @param bool $trim Default false.
		 */
		return (bool) apply_filters( 'sgs_card_price_trim_zeros', false );
	}
}

if ( ! function_exists( 'sgs_card_price_trim_start' ) ) {
	/**
	 * Switch wc_price() trimming on as a product card starts to render.
	 *
	 * @param string|null $pre_render   The pre-rendered content (passed through).
	 * @param array       $parsed_block The block being rendered.
	 * @return string|null
	 */
	function sgs_card_price_trim_start( $pre_render, $parsed_block ) {
		if ( null === $pre_render
			&& is_array( $parsed_block )
			&& 'sgs/product-card' === ( $parsed_block['blockName'] ?? '' )
			&& sgs_card_price_trim_zeros_enabled() ) {
			add_filter( 'woocommerce_price_trim_zeros', '__return_true' );
		}
		return $pre_render;
	}
	add_filter( 'pre_render_block', 'sgs_card_price_trim_start', 10, 2 );
}

if ( ! function_exists( 'sgs_card_price_trim_end' ) ) {
	/**
	 * Switch wc_price() trimming off once the product card has rendered.
	 *
	 * @param string $content The card's rendered HTML (passed through).
	 * @return string
	 */
	function sgs_card_price_trim_end( $content ) {
		remove_filter( 'woocommerce_price_trim_zeros', '__return_true' );
		return $content;
	}
	add_filter( 'render_block_sgs/product-card', 'sgs_card_price_trim_end' );
}

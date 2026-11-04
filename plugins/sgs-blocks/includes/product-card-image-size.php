<?php
/**
 * Image size choice for a connected sgs/product-card (imageSize).
 *
 * The product data carries the photo at WooCommerce's "woocommerce_thumbnail" size
 * (about 300px), which looks soft when the card is wider. imageSize names a larger
 * registered size; empty keeps today's output.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_card_image_size' ) ) {
	/**
	 * The card's chosen image size, checked against the sizes the setting offers.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return string A size name, or '' for the default.
	 */
	function sgs_product_card_image_size( array $attributes ): string {
		$size = (string) ( $attributes['imageSize'] ?? '' );
		return in_array( $size, array( 'thumbnail', 'medium', 'medium_large', 'large', 'full' ), true ) ? $size : '';
	}
}

if ( ! function_exists( 'sgs_product_card_image_url_at_size' ) ) {
	/**
	 * The same attachment as a given image URL, at the chosen size.
	 *
	 * @param string $url  An attachment image URL (any size).
	 * @param string $size    Size name from sgs_product_card_image_size().
	 * @param int    $post_id The product whose featured image the URL is (0 when unknown).
	 * @return string The sized URL, or the original when it cannot be resolved.
	 */
	function sgs_product_card_image_url_at_size( string $url, string $size, int $post_id = 0 ): string {
		if ( '' === $url || '' === $size ) {
			return $url;
		}
		// The product's own featured image is known by ID, so a URL stored at an intermediate size (-300x300) resolves
		// without a guess; any other URL is mapped back to its attachment.
		$id = $post_id > 0 ? (int) get_post_thumbnail_id( $post_id ) : 0;
		if ( $id <= 0 ) {
			$id = (int) attachment_url_to_postid( $url );
		}
		if ( $id <= 0 ) {
			return $url;
		}
		$sized = wp_get_attachment_image_url( $id, $size );
		return $sized ? (string) $sized : $url;
	}
}

if ( ! function_exists( 'sgs_product_card_image_size_apply' ) ) {
	/**
	 * Swap the product data's photo URL for the chosen size.
	 *
	 * @param mixed               $data       Product data (array or null).
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return mixed The data.
	 */
	function sgs_product_card_image_size_apply( $data, array $attributes ) {
		$size = sgs_product_card_image_size( $attributes );
		if ( '' === $size || ! is_array( $data ) || empty( $data['image_url'] ) || empty( $data['wc_id'] ) ) {
			return $data;
		}
		$data['image_url'] = esc_url( sgs_product_card_image_url_at_size( (string) $data['image_url'], $size, (int) $data['wc_id'] ) );
		return $data;
	}
}

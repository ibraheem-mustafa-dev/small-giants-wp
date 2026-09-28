<?php
/**
 * The product card's "no photo" state.
 *
 * A product has no real photo when its image is empty, WooCommerce's own
 * placeholder, or the site's chosen placeholder image (WooCommerce > Settings >
 * Products > Placeholder image). The card then shows its no-photo box: the
 * `noImageLabel` text when set ("Photo to come"), styled by its own Typography
 * target and colour, or a picture icon when not. The cart, checkout and product
 * page keep showing WooCommerce's placeholder image for the same products.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_card_has_real_image' ) ) {
	/**
	 * Whether an image URL is a real product photo, not a placeholder.
	 *
	 * @param string $src Image URL the card would show.
	 * @return bool
	 */
	function sgs_product_card_has_real_image( string $src ): bool {
		if ( '' === $src || false !== strpos( $src, 'woocommerce-placeholder' ) ) {
			return false;
		}
		$placeholder_id = absint( get_option( 'woocommerce_placeholder_image', 0 ) );
		if ( $placeholder_id ) {
			$file = (string) get_attached_file( $placeholder_id );
			// The file name without its extension also matches the resized copies (photo-to-come-300x300.png).
			$stem = '' !== $file ? pathinfo( $file, PATHINFO_FILENAME ) : '';
			if ( '' !== $stem && false !== strpos( wp_basename( (string) wp_parse_url( $src, PHP_URL_PATH ) ), $stem ) ) {
				return false;
			}
		}
		return true;
	}
}

if ( ! function_exists( 'sgs_product_card_no_photo_markup' ) ) {
	/**
	 * The no-photo box: the label when set, else the picture icon.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	function sgs_product_card_no_photo_markup( array $attributes ): string {
		$label = trim( (string) ( $attributes['noImageLabel'] ?? '' ) );
		$inner = '' !== $label
			? '<span class="product-card__no-image-label">' . esc_html( $label ) . '</span>'
			: '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>';
		return '<div class="product-card__no-image" aria-hidden="true">' . $inner . '</div>';
	}
}

if ( ! function_exists( 'sgs_product_card_no_photo_css' ) ) {
	/**
	 * The label's scoped type and colour, and the space above the price row.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $uid        The card's scoping class.
	 * @return string
	 */
	function sgs_product_card_no_photo_css( array $attributes, string $uid ): string {
		$css    = sgs_typography_css_rule( $attributes, 'noImageLabel', '.' . $uid . ' .product-card__no-image-label' );
		$colour = sgs_colour_value( $attributes['noImageLabelColour'] ?? '' );
		if ( '' !== $colour ) {
			$css .= '.' . $uid . ' .product-card__no-image-label{color:' . $colour . ';}';
		}
		// A CSS length ("6px") added above the price row, over the body's own gap between rows.
		$space = trim( (string) ( $attributes['priceRowSpaceAbove'] ?? '' ) );
		if ( preg_match( '/^\d+(\.\d+)?(px|em|rem)$/', $space ) ) {
			$css .= '.' . $uid . ' .price-row,.' . $uid . ' .sgs-product-card__price-row{margin-top:' . $space . ';}';
		}
		return $css;
	}
}

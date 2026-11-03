<?php
/**
 * Price display options for a connected sgs/product-card: trailing ".00" trimming
 * (priceTrimZeros) and the "From <lowest price>" display of a variable or ranged
 * product (priceFromLowest, read with the card's "From each product" mode).
 *
 * The lowest price is Product_Bindings::get_product_data()'s price_from_html (the
 * minimum variation price through wc_get_price_to_display(), empty when every
 * variation costs the same), the value the read-only and non-configurator branches
 * already print under the "From" label.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_card_trim_price_zeros' ) ) {
	/**
	 * Drop a trailing run of zeros after the decimal separator: 5.00 reads 5, 9.50 stays.
	 * Works on plain text ("£21.50") and on WooCommerce price markup (the zeros sit before the closing tag).
	 *
	 * @param string $price     Price text or markup.
	 * @param string $separator The shop's decimal separator.
	 * @return string The price without trailing zero decimals.
	 */
	function sgs_product_card_trim_price_zeros( string $price, string $separator = '.' ): string {
		if ( '' === $price || '' === $separator ) {
			return $price;
		}
		return (string) preg_replace( '/(?<=\d)' . preg_quote( $separator, '/' ) . '0+(?!\d)/', '', $price );
	}
}

if ( ! function_exists( 'sgs_product_card_price_text' ) ) {
	/**
	 * A price string as the card's settings want it to read.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $price      Price text or markup.
	 * @return string The price, trimmed when priceTrimZeros is on, else untouched.
	 */
	function sgs_product_card_price_text( array $attributes, string $price ): string {
		if ( empty( $attributes['priceTrimZeros'] ) ) {
			return $price;
		}
		$separator = function_exists( 'wc_get_price_decimal_separator' ) ? (string) wc_get_price_decimal_separator() : '.';
		return sgs_product_card_trim_price_zeros( $price, $separator );
	}
}

if ( ! function_exists( 'sgs_product_card_price_data_apply' ) ) {
	/**
	 * Apply priceTrimZeros to the product data's price markup.
	 *
	 * @param mixed               $data       Product_Bindings::get_product_data() result (array or null).
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return mixed The data.
	 */
	function sgs_product_card_price_data_apply( $data, array $attributes ) {
		if ( ! is_array( $data ) || empty( $attributes['priceTrimZeros'] ) ) {
			return $data;
		}
		foreach ( array( 'price_html', 'price_from_html' ) as $key ) {
			if ( isset( $data[ $key ] ) && is_string( $data[ $key ] ) ) {
				$data[ $key ] = sgs_product_card_price_text( $attributes, $data[ $key ] );
			}
		}
		return $data;
	}
}

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

<?php
/**
 * Checkout address fields for UK shops.
 *
 * UK addresses need no county (Royal Mail sorts on the postcode), and
 * WooCommerce's block checkout (11.1) silently refuses to place an order when
 * the optional County is left empty: Place order does nothing and the only
 * message is "Please enter a valid state/county" on a field nobody has to
 * fill (reproduced on eye-care-test with Cash on Delivery; reported upstream
 * as woocommerce/woocommerce-gateway-stripe#5974). Hiding the field for GB
 * removes both the needless question and the block. A shop that wants the
 * County back returns false from `sgs_checkout_hide_uk_county`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Hide the County field for United Kingdom addresses.
 *
 * @param array $locale Per-country address field overrides.
 * @return array
 */
function sgs_checkout_uk_county_locale( $locale ) {
	/**
	 * Whether UK addresses skip the County field.
	 *
	 * @param bool $hide Default true.
	 */
	if ( ! is_array( $locale ) || ! apply_filters( 'sgs_checkout_hide_uk_county', true ) ) {
		return $locale;
	}
	$locale['GB']['state'] = array_merge(
		isset( $locale['GB']['state'] ) && is_array( $locale['GB']['state'] ) ? $locale['GB']['state'] : array(),
		array(
			'required' => false,
			'hidden'   => true,
		)
	);
	return $locale;
}
add_filter( 'woocommerce_get_country_locale', __NAMESPACE__ . '\sgs_checkout_uk_county_locale' );

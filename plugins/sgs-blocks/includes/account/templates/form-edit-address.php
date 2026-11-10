<?php
/**
 * SGS Account address form page: replaces WooCommerce's `myaccount/form-edit-address.php`. The edit-address URL of one
 * type (also where a save that failed validation lands) prints the same Addresses view as the list, with that type's
 * card open, so WooCommerce's notices sit above it and the posted values are kept. Swapped in by
 * `Account_Extras::maybe_swap_address_template()` only while an sgs/account block renders with `addressEditor` on.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$sgs_attrs = is_array( \SGS\Blocks\Account_Endpoints::$active ) ? \SGS\Blocks\Account_Endpoints::$active : array();
$sgs_open  = isset( $load_address ) ? sanitize_key( (string) $load_address ) : '';

do_action( 'woocommerce_before_edit_account_address_form' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own hook.
if ( '' !== $sgs_open ) {
	// The Addresses heading and helper line print from the endpoint hooks only on the list; the form page prints them here.
	\SGS\Blocks\Account_Endpoints::render_addresses_heading( '' );
	echo sgs_account_addresses_html( $sgs_attrs, $sgs_open, isset( $address ) && is_array( $address ) ? $address : array() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in sgs_account_addresses_html().
	\SGS\Blocks\Account_Extras::address_helper_line( '' );
} else {
	wc_get_template( 'myaccount/my-address.php' );
}
do_action( 'woocommerce_after_edit_account_address_form' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own hook.

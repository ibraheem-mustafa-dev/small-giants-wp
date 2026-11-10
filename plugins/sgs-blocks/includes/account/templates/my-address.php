<?php
/**
 * SGS Account address list: replaces WooCommerce's `myaccount/my-address.php` with one card per address type, each with
 * its own inline edit form. Swapped in by `Account_Extras::maybe_swap_address_template()` only while an sgs/account
 * block renders with `addressEditor` on.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$sgs_attrs = is_array( \SGS\Blocks\Account_Endpoints::$active ) ? \SGS\Blocks\Account_Endpoints::$active : array();
echo sgs_account_addresses_html( $sgs_attrs ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in sgs_account_addresses_html().

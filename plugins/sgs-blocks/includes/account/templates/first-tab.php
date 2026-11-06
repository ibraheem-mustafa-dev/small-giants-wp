<?php
/**
 * SGS Account root template for a block with the Dashboard hidden: it shows the first visible tab's own content in
 * place, by running that endpoint's WooCommerce action (swapped in by `Account_Dashboard::maybe_swap_dashboard_template()`
 * only while an sgs/account block renders). No redirect: the root URL stays the address of the account.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$sgs_first_tab = \SGS\Blocks\Account_Dashboard::first_visible_endpoint();
if ( '' !== $sgs_first_tab ) {
	do_action( 'woocommerce_account_' . $sgs_first_tab . '_endpoint', '' );
} elseif ( function_exists( 'wc_locate_template' ) ) {
	// No visible tab: show WooCommerce's own dashboard content rather than nothing. The file is included directly,
	// not through wc_get_template(), so this swap does not run again.
	$current_user = wp_get_current_user();
	include wc_locate_template( 'myaccount/dashboard.php' );
}

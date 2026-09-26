<?php
/**
 * Standalone test: sgs/account's PHP surface —
 * includes/account/class-account-endpoints.php,
 * includes/account/class-account-dashboard.php,
 * includes/account/class-account-pages.php,
 * includes/account/helpers-account-defaults.php.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

// -- Minimal WordPress stand-ins (only what the code paths under test call) --
function __( $text, $domain = null ) {
	return $text;
}
function _x( $text, $context, $domain = null ) {
	return $text;
}
function sanitize_key( $key ) {
	$key = strtolower( (string) $key );
	return preg_replace( '/[^a-z0-9_\-]/', '', $key );
}

require dirname( __DIR__, 2 ) . '/includes/account/helpers-account-defaults.php';
require dirname( __DIR__, 2 ) . '/includes/account/class-account-endpoints.php';
require dirname( __DIR__, 2 ) . '/includes/account/class-account-dashboard.php';
require dirname( __DIR__, 2 ) . '/includes/account/class-account-pages.php';

use SGS\Blocks\Account_Endpoints;
use SGS\Blocks\Account_Dashboard;
use SGS\Blocks\Account_Pages;

$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}\n";
	}
}

// ---------------------------------------------------------------------------
// 1) filter_menu_items(): saved-items inserted right after orders, with no
//    active block instance (flag unset — must still insert the item; only
//    HIDING depends on the flag).
// ---------------------------------------------------------------------------
Account_Endpoints::$active = null;
$base_items = array(
	'dashboard'       => 'Dashboard',
	'orders'          => 'Orders',
	'downloads'       => 'Downloads',
	'edit-account'    => 'Account details',
	'customer-logout' => 'Log out',
);
$with_saved = Account_Endpoints::filter_menu_items( $base_items );
$keys       = array_keys( $with_saved );
$orders_pos = array_search( 'orders', $keys, true );
$saved_pos  = array_search( 'saved-items', $keys, true );
ok( false !== $saved_pos, 'saved-items is present in the menu' );
ok( $saved_pos === $orders_pos + 1, 'saved-items sits immediately after orders' );

// ---------------------------------------------------------------------------
// 2) filter_menu_items(): a hidden endpoint disappears, dashboard and
//    customer-logout NEVER do — even when the caller asks for it.
// ---------------------------------------------------------------------------
Account_Endpoints::$active = array(
	'hiddenEndpoints' => array( 'downloads', 'dashboard', 'customer-logout' ),
);
$filtered = Account_Endpoints::filter_menu_items( $base_items );
ok( ! isset( $filtered['downloads'] ), 'a hidden endpoint (downloads) is removed' );
ok( isset( $filtered['dashboard'] ), 'dashboard is never hidden, even when requested' );
ok( isset( $filtered['customer-logout'] ), 'customer-logout is never hidden, even when requested' );
Account_Endpoints::$active = null;

// ---------------------------------------------------------------------------
// 3) Order-status → progress-step mapping.
// ---------------------------------------------------------------------------
ok( 'processing' === sgs_account_map_order_status_to_step( 'processing' ), 'processing maps to the processing step' );
ok( 'delivered' === sgs_account_map_order_status_to_step( 'completed' ), 'completed maps to the delivered step' );
ok( 'placed' === sgs_account_map_order_status_to_step( 'pending' ), 'pending maps to the placed step' );
ok( 'dispatched' === sgs_account_map_order_status_to_step( 'dispatched' ), 'dispatched maps to the dispatched step' );
ok( '' === sgs_account_map_order_status_to_step( 'cancelled' ), 'cancelled has no step (chip only, no track)' );
ok( '' === sgs_account_map_order_status_to_step( 'refunded' ), 'refunded has no step' );
ok( '' === sgs_account_map_order_status_to_step( 'failed' ), 'failed has no step' );

// ---------------------------------------------------------------------------
// 4) wc_get_template swap — ONLY while the flag is set.
// ---------------------------------------------------------------------------
$core_template = '/wp-content/plugins/woocommerce/templates/myaccount/dashboard.php';

Account_Endpoints::$active = array( 'greeting' => 'Hello, {name}' );
$swapped = Account_Dashboard::maybe_swap_dashboard_template( $core_template, 'myaccount/dashboard.php', array(), '', '' );
ok(
	$swapped !== $core_template && 'dashboard.php' === basename( $swapped ) && false !== strpos( str_replace( '\\', '/', $swapped ), '/templates/dashboard.php' ),
	'the flag is set: the block\'s own dashboard template is used'
);

Account_Endpoints::$active = null;
$unswapped = Account_Dashboard::maybe_swap_dashboard_template( $core_template, 'myaccount/dashboard.php', array(), '', '' );
ok( $unswapped === $core_template, 'the flag is unset: WooCommerce\'s own core template is used unchanged' );

// A different template_name is never swapped even while the flag is set.
Account_Endpoints::$active = array();
$other = Account_Dashboard::maybe_swap_dashboard_template( '/x/myaccount/orders.php', 'myaccount/orders.php', array(), '', '' );
ok( '/x/myaccount/orders.php' === $other, 'a different template name is never swapped' );
Account_Endpoints::$active = null;

// NEGATIVE CONTROL: the shape of the swap WITHOUT the `Account_Endpoints::$active`
// guard — the exact defect the real method must not have. If this control did
// NOT diverge from the real method above, the guard would be proven inert.
function sgs_test_swap_without_guard( $template, $template_name ) {
	if ( 'myaccount/dashboard.php' !== $template_name ) {
		return $template;
	}
	return __DIR__ . '/templates/dashboard.php'; // no `is_array( Account_Endpoints::$active )` check.
}
$negative_control = sgs_test_swap_without_guard( $core_template, 'myaccount/dashboard.php' );
ok(
	$negative_control !== $core_template && $unswapped === $core_template,
	'NEGATIVE CONTROL: without the flag guard, an out-of-block request would wrongly get the block\'s template — the real method does not'
);

// ---------------------------------------------------------------------------
// 5) woocommerce_create_pages: both the My Account content swap and the new
//    Saved items page.
// ---------------------------------------------------------------------------
$create_pages_input = array(
	'shop'      => array( 'name' => 'shop', 'title' => 'Shop', 'content' => '' ),
	'myaccount' => array( 'name' => 'my-account', 'title' => 'My account', 'content' => '<!-- wp:shortcode -->[woocommerce_my_account]<!-- /wp:shortcode -->' ),
);
$pages_out = Account_Pages::add_pages( $create_pages_input );
ok( '<!-- wp:sgs/account /-->' === $pages_out['myaccount']['content'], 'the My Account page content becomes wp:sgs/account' );
ok( isset( $pages_out['saved_items'] ), 'a saved_items page entry is added' );
ok(
	false !== strpos( $pages_out['saved_items']['content'] ?? '', 'sgs/wishlist-panel' ),
	'the saved_items page content embeds sgs/wishlist-panel'
);

// Settings > Advanced > Page setup — the field is inserted right after Checkout.
$settings_input = array(
	array( 'id' => 'woocommerce_cart_page_id', 'title' => 'Cart page' ),
	array( 'id' => 'woocommerce_checkout_page_id', 'title' => 'Checkout page' ),
	array( 'id' => 'woocommerce_myaccount_page_id', 'title' => 'My account page' ),
);
$settings_out = Account_Pages::add_page_setting( $settings_input );
$ids          = array_map( static fn( $s ) => $s['id'] ?? '', $settings_out );
$checkout_pos = array_search( 'woocommerce_checkout_page_id', $ids, true );
$saved_pos2   = array_search( 'woocommerce_saved_items_page_id', $ids, true );
ok( false !== $saved_pos2, 'the Saved items page field is added to Page setup' );
ok( $saved_pos2 === $checkout_pos + 1, 'the Saved items page field sits immediately after Checkout' );
ok( 'single_select_page_with_search' === $settings_out[ $saved_pos2 ]['type'], 'the field uses the same control type WooCommerce uses for Cart/Checkout/My account' );

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );

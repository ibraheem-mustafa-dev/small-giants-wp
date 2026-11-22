<?php
/**
 * Standalone test: sgs/account's `hideUnofferedTabs` setting leaves the Downloads tab out of the menu while the shop
 * sells no downloadable product and the customer holds none, and changes nothing while the setting is off.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-hide-unoffered-tabs-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
define( 'DAY_IN_SECONDS', 86400 );

$GLOBALS['sgs_tabs_transients'] = array();
$GLOBALS['sgs_tabs_hooks']      = array();
$GLOBALS['sgs_tabs_user']       = 0;
$GLOBALS['sgs_tabs_downloads']  = array();

function __( $text, $domain = null ) { return $text; }
function _x( $text, $context, $domain = null ) { return $text; }
function sanitize_key( $key ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) ); }
function add_filter() {}
function add_action( $hook, $callback ) { $GLOBALS['sgs_tabs_hooks'][ $hook ][] = $callback; }
function get_transient( $key ) { return $GLOBALS['sgs_tabs_transients'][ $key ] ?? false; }
function set_transient( $key, $value, $ttl ) { $GLOBALS['sgs_tabs_transients'][ $key ] = $value; return true; }
function delete_transient( $key ) { unset( $GLOBALS['sgs_tabs_transients'][ $key ] ); return true; }
function get_current_user_id() { return $GLOBALS['sgs_tabs_user']; }
function wc_get_customer_available_downloads( $user_id ) { return $GLOBALS['sgs_tabs_downloads']; }

/** Stand-in for $wpdb: answers the existence query from a flag and records each lookup. */
class Sgs_Tabs_Wpdb {
	public $posts    = 'wp_posts';
	public $postmeta = 'wp_postmeta';
	public $sells    = false;
	public $queries  = array();
	public function prepare( $sql, ...$args ) {
		foreach ( $args as $a ) {
			$sql = preg_replace( '/%s/', "'" . $a . "'", $sql, 1 );
		}
		return $sql;
	}
	public function get_var( $sql ) {
		$this->queries[] = $sql;
		return $this->sells ? '42' : null;
	}
}
$wpdb = new Sgs_Tabs_Wpdb();

require dirname( __DIR__, 2 ) . '/includes/account/helpers-account-defaults.php';
require dirname( __DIR__, 2 ) . '/includes/account/class-account-endpoints.php';
use SGS\Blocks\Account_Endpoints;

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}
function reset_state(): void {
	global $wpdb;
	$GLOBALS['sgs_tabs_transients'] = array();
	$GLOBALS['sgs_tabs_user']       = 0;
	$GLOBALS['sgs_tabs_downloads']  = array();
	$GLOBALS['wpdb']                = $wpdb;
	$wpdb->sells                    = false;
	$wpdb->queries                  = array();
	Account_Endpoints::$active      = null;
}

$menu = array(
	'dashboard'       => 'Dashboard',
	'orders'          => 'Orders',
	'downloads'       => 'Downloads',
	'edit-address'    => 'Addresses',
	'payment-methods' => 'Payment methods',
	'edit-account'    => 'Account details',
	'customer-logout' => 'Log out',
);

// 1) Setting on, no downloadable product, no customer downloads: Downloads goes, nothing else does.
reset_state();
Account_Endpoints::$active = array( 'hideUnofferedTabs' => true );
$out = Account_Endpoints::filter_menu_items( $menu );
ok( ! isset( $out['downloads'] ), 'on, no downloadable product: Downloads is left out' );
ok( isset( $out['payment-methods'] ) && isset( $out['orders'] ) && isset( $out['edit-account'] ) && isset( $out['customer-logout'] ), 'on: Payment methods (WooCommerce decides it) and every other tab stay' );

// 2) Negative control: setting off or unset, same shop: the menu is as before and the shop is never queried.
reset_state();
Account_Endpoints::$active = array( 'hideUnofferedTabs' => false );
ok( isset( Account_Endpoints::filter_menu_items( $menu )['downloads'] ), 'off: Downloads stays' );
Account_Endpoints::$active = array();
ok( isset( Account_Endpoints::filter_menu_items( $menu )['downloads'] ), 'unset: Downloads stays' );
ok( 0 === count( $wpdb->queries ), 'off or unset: the shop is never queried' );

// 3) Negative control: a shop with a downloadable product keeps Downloads.
reset_state();
$wpdb->sells               = true;
Account_Endpoints::$active = array( 'hideUnofferedTabs' => true );
ok( isset( Account_Endpoints::filter_menu_items( $menu )['downloads'] ), 'on, shop sells a download: Downloads stays' );

// 4) Negative control: a customer who holds a download keeps the tab.
reset_state();
$GLOBALS['sgs_tabs_user']      = 7;
$GLOBALS['sgs_tabs_downloads'] = array( array( 'download_id' => 'x' ) );
Account_Endpoints::$active     = array( 'hideUnofferedTabs' => true );
ok( isset( Account_Endpoints::filter_menu_items( $menu )['downloads'] ), 'on, no product sells one but the customer holds one: Downloads stays' );
$GLOBALS['sgs_tabs_downloads'] = array();
ok( ! isset( Account_Endpoints::filter_menu_items( $menu )['downloads'] ), 'on, the customer holds none: Downloads goes' );

// 5) A menu WooCommerce already left Downloads out of gains none.
reset_state();
Account_Endpoints::$active = array( 'hideUnofferedTabs' => true );
$no_dl = $menu;
unset( $no_dl['downloads'] );
ok( ! isset( Account_Endpoints::filter_menu_items( $no_dl )['downloads'] ), 'a menu without Downloads gains none' );

// 6) hiddenEndpoints and menuOrder keep working beside the setting.
reset_state();
Account_Endpoints::$active = array( 'hideUnofferedTabs' => true, 'hiddenEndpoints' => array( 'edit-address' ), 'menuOrder' => array( 'edit-account', 'orders' ) );
$out  = Account_Endpoints::filter_menu_items( $menu );
$keys = array_keys( $out );
ok( ! isset( $out['edit-address'] ) && ! isset( $out['downloads'] ), 'hiddenEndpoints still removes its tabs while the setting is on' );
ok( 'edit-account' === $keys[0] && 'orders' === $keys[1] && 'customer-logout' === end( $keys ), 'menuOrder still orders the menu while the setting is on' );

// 7) The answer is cached, and a product save forgets it.
reset_state();
Account_Endpoints::$active = array( 'hideUnofferedTabs' => true );
Account_Endpoints::filter_menu_items( $menu );
Account_Endpoints::filter_menu_items( $menu );
ok( 1 === count( $wpdb->queries ), 'two renders query the shop once' );
ok( false !== strpos( $wpdb->queries[0], "'_downloadable'" ) && false !== strpos( $wpdb->queries[0], "'yes'" ) && false !== strpos( $wpdb->queries[0], 'product_variation' ), 'the query asks for _downloadable = yes on products and variations' );
$wpdb->sells = true;
Account_Endpoints::register();
foreach ( array( 'save_post_product', 'save_post_product_variation', 'trashed_post', 'untrashed_post', 'deleted_post' ) as $hook ) {
	ok( isset( $GLOBALS['sgs_tabs_hooks'][ $hook ] ) && in_array( array( Account_Endpoints::class, 'forget_sells_downloads' ), $GLOBALS['sgs_tabs_hooks'][ $hook ], true ), "{$hook} forgets the answer" );
}
ok( ! isset( Account_Endpoints::filter_menu_items( $menu )['downloads'] ), 'before the save the cached answer (no download) still holds' );
call_user_func( $GLOBALS['sgs_tabs_hooks']['save_post_product'][0], 99 );
ok( isset( Account_Endpoints::filter_menu_items( $menu )['downloads'] ), 'after a product save the shop is asked again and Downloads returns' );

// 8) With no database object the tab stays.
reset_state();
$GLOBALS['wpdb']           = null;
Account_Endpoints::$active = array( 'hideUnofferedTabs' => true );
ok( isset( Account_Endpoints::filter_menu_items( $menu )['downloads'] ), 'no database: Downloads stays' );

// 9) The dashboard's first-visible-tab lookup keys on the setting too (the menu it reads is filtered by it).
$dash = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/account/class-account-dashboard.php' );
ok( false !== strpos( $dash, 'hideUnofferedTabs' ), 'the first-visible-tab cache key includes hideUnofferedTabs' );

echo $failures ? "\n{$failures} FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );

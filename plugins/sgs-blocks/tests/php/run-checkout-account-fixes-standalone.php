<?php
/**
 * Standalone test: pickup details hook, gift-card panel gate, sgs/account render safety (try/finally, own buffer,
 * back-reference-safe replacements, aria-describedby, orders hooks, cached first endpoint).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-checkout-account-fixes-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
define( 'DAY_IN_SECONDS', 86400 );

$GLOBALS['hooks']      = array();
$GLOBALS['transients'] = array();
$GLOBALS['actions']    = array();
$GLOBALS['logged_in']  = true;

function add_filter( $tag, $cb, $prio = 10, $args = 1 ) { $GLOBALS['hooks'][ $tag ][] = $cb; }
function add_action( $tag, $cb, $prio = 10, $args = 1 ) { add_filter( $tag, $cb ); }
function do_action( $tag, ...$args ) { $GLOBALS['actions'][] = array( $tag, $args ); }
function __( $t, $d = null ) { return $t; }
function sanitize_text_field( $t ) { return trim( strip_tags( (string) $t ) ); }
function sanitize_key( $k ) { return preg_replace( '/[^a-z0-9_-]/', '', strtolower( (string) $k ) ); }
function remove_filter( $tag, $cb, $prio = 10 ) { unset( $GLOBALS['hooks'][ $tag ] ); }
function esc_html__( $t, $d = null ) { return $t; }
function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES ); }
function esc_url_raw( $t ) { return (string) $t; }
function wp_kses_post( $t ) { return (string) $t; }
function wp_json_encode( $v ) { return json_encode( $v ); }
function is_user_logged_in() { return $GLOBALS['logged_in']; }
function get_current_user_id() { return 7; }
function get_user_meta( $id, $k, $s = false ) { return '07700 900123'; }
function wp_get_current_user() { return (object) array( 'display_name' => 'Bob $1 \1 ${1} \0' ); }
function get_option( $k, $d = false ) { return $GLOBALS['options'][ $k ] ?? $d; }
function get_transient( $k ) { return $GLOBALS['transients'][ $k ] ?? false; }
function set_transient( $k, $v, $e = 0 ) { $GLOBALS['transients'][ $k ] = $v; return true; }
function delete_transient( $k ) { unset( $GLOBALS['transients'][ $k ] ); return true; }
function get_posts( $args ) { return $GLOBALS['products'] ?? array(); }
function wc_get_page_permalink( $p ) { return '/shop/'; }
function wc_get_account_menu_items() { ++$GLOBALS['menu_calls']; return $GLOBALS['menu_items']; }
function wc_locate_template( $n ) { return $GLOBALS['dash_file']; }

class WP_Post {}
eval( 'namespace SGS\Blocks\Gift_Card; final class Gift_Card_Product_Type { const TYPE = "sgs_gift_card"; }' );
class wpdb {
	public $prefix = 'wp_';
	public $var_calls = 0;
	public $var_result = null;
	public $last_sql = '';
	public $insert_id = 41;
	public function prepare( $sql, ...$args ) { $this->last_sql = $sql; return vsprintf( str_replace( '%s', "'%s'", $sql ), $args ); }
	public function get_var( $sql ) { ++$this->var_calls; return $this->var_result; }
	public function insert( $t, $row ) { return 1; }
}
class WC_Shipping_Rate {
	public $meta = array();
	public function __construct( private string $method, private int $instance ) {}
	public function get_method_id() { return $this->method; }
	public function get_instance_id() { return $this->instance; }
	public function get_meta_data() { return $this->meta; }
	public function add_meta_data( $k, $v ) { $this->meta[ $k ] = $v; }
}

$root = dirname( __DIR__, 2 ) . '/includes';
require $root . '/class-shipping-method-description.php';
require $root . '/gift-card/interface-gift-card-store.php';
require $root . '/gift-card/trait-gift-card-ledger-operations.php';
require $root . '/gift-card/class-gift-card-ledger.php';
require $root . '/gift-card/class-gift-card-wpdb-store.php';
require $root . '/gift-card/class-gift-card-checkout-assets.php';
require $root . '/account/helpers-account-defaults.php';
require $root . '/account/helpers-account-edit-account.php';
require $root . '/account/helpers-account-register.php';
require $root . '/account/class-account-strings.php';
require $root . '/account/class-account-endpoints.php';
require $root . '/account/class-account-dashboard.php';
require $root . '/account/class-account-extras.php';

namespace\run();

function ok( bool $c, string $l ): void {
	static $fail = 0;
	echo ( $c ? 'PASS  ' : 'FAIL  ' ) . $l . "\n";
	if ( ! $c ) {
		$GLOBALS['failed'] = true;
	}
}

function run(): void {
	global $wpdb;
	$wpdb = new \wpdb();
	$root = dirname( __DIR__, 2 );

	// 1) Pickup details.
	\SGS\Blocks\Shipping_Method_Description::register();
	ok( in_array( array( \SGS\Blocks\Shipping_Method_Description::class, 'add_pickup_details' ), $GLOBALS['hooks']['woocommerce_package_rates'] ?? array(), true ), '1 add_pickup_details is hooked on woocommerce_package_rates' );
	$GLOBALS['options'] = array(
		'woocommerce_local_pickup_5_settings' => array( 'sgs_description' => 'Ready in 2 hours' ),
		'woocommerce_local_pickup_6_settings' => array(),
		'woocommerce_flat_rate_8_settings'    => array( 'sgs_description' => 'Two days' ),
	);
	$pickup = new \WC_Shipping_Rate( 'local_pickup', 5 );
	$empty  = new \WC_Shipping_Rate( 'local_pickup', 6 );
	$flat   = new \WC_Shipping_Rate( 'flat_rate', 8 );
	$own    = new \WC_Shipping_Rate( 'local_pickup', 5 );
	$own->add_meta_data( 'pickup_details', 'Own text' );
	foreach ( $GLOBALS['hooks']['woocommerce_package_rates'] as $cb ) {
		$rates = call_user_func( $cb, array( 'a' => $pickup, 'b' => $empty, 'c' => $flat, 'd' => $own ) );
	}
	ok( 'Ready in 2 hours' === ( $pickup->meta['pickup_details'] ?? '' ), '1 local pickup rate gets pickup_details from its description' );
	ok( ! isset( $empty->meta['pickup_details'] ), '1 negative: pickup with no description gets none' );
	ok( ! isset( $flat->meta['pickup_details'] ), '1 negative: flat rate gets none' );
	ok( 'Own text' === $own->meta['pickup_details'], '1 negative: an existing pickup_details is kept' );

	// 2) Gift-card gate.
	$A = \SGS\Blocks\Gift_Card\Gift_Card_Checkout_Assets::class;
	$A::register();
	ok( isset( $GLOBALS['hooks']['sgs_gift_card_issued'] ) && isset( $GLOBALS['hooks']['set_object_terms'] ), '2 issue action and set_object_terms are hooked' );
	$GLOBALS['products'] = array();
	$wpdb->var_result    = '12';
	ok( true === $A::shop_sells_gift_cards(), '2 no product but a redeemable card row: panel shows' );
	ok( str_contains( $wpdb->last_sql, 'status = %s' ) && str_contains( $wpdb->last_sql, 'balance_pence > 0' ) && str_contains( $wpdb->last_sql, 'expires_at' ), '2 card query is prepared and counts only redeemable cards' );
	$A::shop_sells_gift_cards();
	ok( 1 === $wpdb->var_calls, '2 second call is served from the transient (one query)' );
	$A::forget_on_type_change( 3, array(), array(), 'category' );
	ok( isset( $GLOBALS['transients'][ $A::TRANSIENT ] ), '2 negative: a non product_type term change keeps the cache' );
	$A::forget_on_type_change( 3, array(), array(), 'product_type' );
	ok( ! isset( $GLOBALS['transients'][ $A::TRANSIENT ] ), '2 product_type change clears the cache' );
	$wpdb->var_result = null;
	ok( false === $A::shop_sells_gift_cards(), '2 negative: no product and no card: panel hidden' );
	$GLOBALS['products'] = array( 9 );
	$A::forget_sells_gift_cards();
	ok( true === $A::shop_sells_gift_cards(), '2 a published product still shows the panel' );
	$GLOBALS['actions'] = array();
	( new \SGS\Blocks\Gift_Card\Gift_Card_Wpdb_Store() )->insert( array( 'status' => 'active' ) );
	ok( array( array( 'sgs_gift_card_issued', array( 41 ) ) ) === $GLOBALS['actions'], '2 every card insert fires sgs_gift_card_issued' );

	// 3) Render safety.
	$render = (string) file_get_contents( $root . '/src/blocks/account/render.php' );
	ok( 1 === preg_match( '/try \{.*Account_Strings::begin.*\} finally \{.*ob_end_clean.*Account_Strings::end\(\);.*Account_Endpoints::\$active = null;.*\}/s', $render ), '3 render.php sets the filter, flag and buffer inside try and clears all three in finally' );
	\SGS\Blocks\Account_Strings::begin( array( 'strings' => array( 'orders' => 'My orders' ) ) );
	try {
		throw new \RuntimeException( 'x' );
	} catch ( \RuntimeException $e ) {
	} finally {
		\SGS\Blocks\Account_Strings::end();
	}
	ok( 'Orders' === \SGS\Blocks\Account_Strings::filter( 'Orders', 'Orders', 'woocommerce' ), '3 after end() the wording filter is inert' );
	\SGS\Blocks\Account_Endpoints::$active = array( 'menuOrdersCount' => true );
	$base = ob_get_level();
	ob_start(); // a foreign buffer opened before the menu
	\SGS\Blocks\Account_Extras::start_menu_buffer();
	echo '<li class="woocommerce-MyAccount-navigation-link--orders"><a href="#">Orders</a></li>';
	ob_start(); // another buffer left open above ours
	\SGS\Blocks\Account_Extras::end_menu_buffer();
	$lvl_a = ob_get_level();
	ob_end_clean();
	\SGS\Blocks\Account_Extras::end_menu_buffer(); // state was reset: a stray end must not close the foreign buffer
	$lvl_b = ob_get_level();
	ob_end_clean();
	ob_end_clean();
	ok( $lvl_a === $base + 3, '3 negative: with a foreign buffer above, end_menu_buffer closes nothing' );
	ok( $lvl_b === $base + 2, '3 an end call with no own open buffer closes nothing' );
	\SGS\Blocks\Account_Endpoints::$active = array( 'menuOrdersCount' => true );
	ob_start();
	\SGS\Blocks\Account_Extras::start_menu_buffer();
	echo '<li class="woocommerce-MyAccount-navigation-link--orders"><a href="#">Orders</a></li>';
	\SGS\Blocks\Account_Extras::end_menu_buffer();
	$out = (string) ob_get_clean();
	ok( ob_get_level() === $base && str_contains( $out, 'sgs-account__menu-count' ) === false && str_contains( $out, 'Orders' ), '3 own buffer is closed and its markup passed on (zero orders: no count span)' );
	\SGS\Blocks\Account_Endpoints::$active = null;

	// 4/5) Replacement text with back-references, and aria-describedby.
	$form = '<form class="woocommerce-EditAccountForm"><p><input id="account_display_name" /></p><p><input id="account_email" /></p><fieldset><legend>Password change</legend><input id="x" /></fieldset></form>';
	$attrs = array( 'accountDisplayFromNames' => true, 'accountShowMobile' => true, 'accountMobileLabel' => 'Mob $1 \1', 'accountPasswordHelper' => 'Use $1 and \1 and ${1}' );
	$html  = sgs_account_edit_account_markup( $form, $attrs );
	ok( str_contains( $html, 'value="Bob $1 \1 ${1} \0"' ) && str_contains( $html, 'sgs_display_from_names' ), '4 display name with $1, \1 and ${1} is kept literally' );
	ok( str_contains( $html, 'Mob $1 \1' ), '4 mobile label with back-references is kept literally' );
	ok( str_contains( $html, 'Use $1 and \1 and ${1}</p>' ), '4 password helper with back-references is kept literally' );
	$old = preg_replace( '#(<legend>)#', '$1' . str_replace( '$', '\$', 'a\1b' ), '<legend>' );
	ok( '<legend>a<legend>b' === $old, '4 negative control: the old preg_replace form does expand \1' );
	ok( str_contains( $html, '<fieldset aria-describedby="sgs-account-password-helper">' ) && str_contains( $html, 'id="sgs-account-password-helper"' ), '5 password helper has an id and the fieldset points at it' );
	$reg = sgs_account_register_markup( '<p><input type="password" id="reg_password" name="password" /></p>', array( 'registerPasswordHint' => 'Min $1 \1 chars' ) );
	ok( str_contains( $reg, 'Min $1 \1 chars' ), '4 register hint with back-references is kept literally' );
	ok( str_contains( $reg, 'aria-describedby="sgs-account-register-hint" />' ) && str_contains( $reg, 'id="sgs-account-register-hint"' ), '5 register hint has an id and the password field points at it' );
	ok( str_contains( sgs_account_add_describedby( '<input id="a" aria-describedby="other">', 'h' ), 'aria-describedby="other h"' ), '5 an existing aria-describedby keeps its ids' );
	ok( 'x' === sgs_account_register_markup( 'x', array( 'registerPasswordHint' => 'Hint' ) ), '5 negative: markup without the password field is returned unchanged' );
	ob_start();
	\SGS\Blocks\Account_Endpoints::$active = array( 'registerShowFirstName' => true );
	\SGS\Blocks\Account_Extras::register_first_name_field();
	$fn = (string) ob_get_clean();
	\SGS\Blocks\Account_Endpoints::$active = null;
	ok( str_contains( $fn, '<label for="reg_first_name">' ) && str_contains( $fn, 'id="reg_first_name"' ) && str_contains( $fn, ' required aria-required="true"' ), '5 First name field: label for/id pairing, required and aria-required' );

	// 6) Orders empty hooks.
	$GLOBALS['actions'] = array();
	$has_orders         = false;
	ob_start();
	include $root . '/includes/account/templates/orders-empty.php';
	ob_end_clean();
	$tags = array_column( $GLOBALS['actions'], 0 );
	ok( array( 'woocommerce_before_account_orders', 'woocommerce_after_account_orders' ) === $tags && array( false ) === $GLOBALS['actions'][0][1], '6 empty-orders template fires before and after hooks with has_orders, in order' );

	// 7) First visible endpoint cache and fallback.
	$GLOBALS['menu_calls'] = 0;
	$GLOBALS['menu_items'] = array( 'dashboard' => 'D', 'orders' => 'O', 'customer-logout' => 'L' );
	\SGS\Blocks\Account_Endpoints::$active = array( 'hiddenEndpoints' => array( 'dashboard' ) );
	for ( $i = 0; $i < 6; $i++ ) {
		$first = \SGS\Blocks\Account_Dashboard::first_visible_endpoint();
	}
	ok( 'orders' === $first && 1 === $GLOBALS['menu_calls'], '7 six lookups cost one menu query' );
	\SGS\Blocks\Account_Endpoints::$active = array( 'hiddenEndpoints' => array( 'dashboard', 'orders' ) );
	\SGS\Blocks\Account_Dashboard::first_visible_endpoint();
	ok( 2 === $GLOBALS['menu_calls'], '7 negative: a different hidden-items setting is looked up afresh' );
	$GLOBALS['dash_file'] = sys_get_temp_dir() . '/sgs-dash-' . getmypid() . '.php';
	file_put_contents( $GLOBALS['dash_file'], '<?php echo "WC-DASH " . $current_user->display_name;' );
	$GLOBALS['menu_items'] = array( 'dashboard' => 'D', 'customer-logout' => 'L' );
	\SGS\Blocks\Account_Endpoints::$active = array( 'hiddenEndpoints' => array( 'dashboard', 'x' ) );
	ob_start();
	include $root . '/includes/account/templates/first-tab.php';
	$none = (string) ob_get_clean();
	ok( str_contains( $none, 'WC-DASH' ), '7 no visible tab: WooCommerce dashboard content is printed' );
	$GLOBALS['menu_items'] = array( 'dashboard' => 'D', 'orders' => 'O' );
	\SGS\Blocks\Account_Endpoints::$active = array( 'hiddenEndpoints' => array( 'dashboard', 'y' ) );
	$GLOBALS['actions'] = array();
	ob_start();
	include $root . '/includes/account/templates/first-tab.php';
	$some = (string) ob_get_clean();
	ok( '' === $some && 'woocommerce_account_orders_endpoint' === $GLOBALS['actions'][0][0], '7 negative: with a visible tab the fallback is not printed' );
	unlink( $GLOBALS['dash_file'] );

	echo ! empty( $GLOBALS['failed'] ) ? "\nFAILED\n" : "\nALL PASSED\n";
	exit( ! empty( $GLOBALS['failed'] ) ? 1 : 0 );
}

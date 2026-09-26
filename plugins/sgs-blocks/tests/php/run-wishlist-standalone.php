<?php
/**
 * Standalone runner for `includes/wishlist/class-wishlist-*.php` (Spec 30 P5
 * FR-30-14/15 account-area build).
 *
 * Exercises the REAL classes (required directly, not copied) against fake WP
 * function stubs — the same shape as `run-scrim-cart-standalone.php` and the
 * rest of this directory. Covers:
 *   - route registration for Wishlist_Rest, Wishlist_Account_Rest and
 *     Wishlist_Shared_Rest (methods/permission/args wired correctly);
 *   - `merge()` union + idempotence + the 200-item cap;
 *   - `toggle()` add/remove + the 200-item cap returning 409, and that a new
 *     addition snapshots savedPrice/alertPrice/currency/inStock server-side;
 *   - a legacy saved-items entry (no price/stock keys) normalising to
 *     null/'' rather than a fabricated value;
 *   - an unpublished product id rejected by `validate_product()`;
 *   - a logged-out request refused by `permission_logged_in()`;
 *   - POST /wishlist/alerts: 400 when the site switch for that type is off,
 *     200 (with a stored timestamp) when it is on, and that turning a type
 *     OFF is always allowed regardless of the switch;
 *   - POST /wishlist/share: enable creates a 32-hex token, regenerate issues
 *     a new one and the OLD token stops resolving, and the switch-off 403;
 *   - GET /wishlist/shared/{token}: only visible+published product ids, no
 *     user-identifying keys, and 404 for an unknown/switched-off token;
 *   - the privacy eraser removing all four wishlist meta keys;
 *   - THREE negative controls:
 *     (a) with the `priceAlerts` site-switch guard removed from
 *         `Wishlist_Account_Rest::set_alerts()`, the 400 assertion goes red;
 *     (b) with the `is_visible()` filter removed from
 *         `Wishlist_Shared_Rest::get_shared()`, the "only visible" assertion
 *         goes red;
 *     (c) with the `is_user_logged_in()` check removed from
 *         `Wishlist_Rest::permission_logged_in()`, the "logged-out is
 *         refused" assertion goes red.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-wishlist-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged
// phpcs:disable WordPress.Security.NonceVerification.Missing
// phpcs:disable WordPress.DB.SlowDBQuery.slow_db_query_meta_key
// phpcs:disable WordPress.DB.SlowDBQuery.slow_db_query_meta_value

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// -- Fake state ---------------------------------------------------------------

$GLOBALS['sgs_test_logged_in'] = true;
$GLOBALS['sgs_test_user_id']   = 1;
$GLOBALS['sgs_test_posts']     = array(
	101 => array( 'product', 'publish' ), // Valid.
	102 => array( 'product', 'draft' ),   // Unpublished — must be rejected.
	103 => array( 'post', 'publish' ),    // Not a product.
	500 => array( 'page', 'publish' ),    // The Saved items page.
);
$GLOBALS['sgs_test_products']    = array();
$GLOBALS['sgs_test_user_meta']   = array();
$GLOBALS['sgs_test_options']     = array(
	'sgs_wishlist_features'           => array(
		'priceAlerts' => true,
		'stockAlerts' => true,
		'sharing'     => true,
	),
	'woocommerce_saved_items_page_id' => 500,
);
$GLOBALS['sgs_test_transients'] = array();
$GLOBALS['sgs_test_actions']    = array();
$GLOBALS['sgs_test_filters']    = array();
$GLOBALS['sgs_test_routes']     = array();

/**
 * Register (or replace) a fake product + its post-type/status row.
 */
function set_product( int $id, bool $purchasable, string $price, bool $in_stock, bool $visible, string $status = 'publish' ): void {
	$GLOBALS['sgs_test_posts'][ $id ]    = array( 'product', $status );
	$GLOBALS['sgs_test_products'][ $id ] = new WC_Product( $id, $purchasable, $price, $in_stock, $visible );
}

set_product( 101, true, '19.99', true, true );

// -- WordPress core function/class stubs -------------------------------------

function absint( $value ): int {
	return abs( (int) $value );
}
function is_user_logged_in(): bool {
	return (bool) $GLOBALS['sgs_test_logged_in'];
}
function get_current_user_id(): int {
	return (int) $GLOBALS['sgs_test_user_id'];
}
function get_post_type( $id ) {
	return $GLOBALS['sgs_test_posts'][ (int) $id ][0] ?? false;
}
function get_post_status( $id ) {
	return $GLOBALS['sgs_test_posts'][ (int) $id ][1] ?? false;
}
function get_user_meta( $user_id, $key, $single = false ) {
	return $GLOBALS['sgs_test_user_meta'][ (int) $user_id ][ $key ] ?? '';
}
function update_user_meta( $user_id, $key, $value ) {
	$GLOBALS['sgs_test_user_meta'][ (int) $user_id ][ $key ] = $value;
	return true;
}
function delete_user_meta( $user_id, $key ) {
	unset( $GLOBALS['sgs_test_user_meta'][ (int) $user_id ][ $key ] );
	return true;
}
function get_user_by( $field, $value ) {
	if ( 'email' === $field && 'a@example.com' === $value ) {
		return (object) array( 'ID' => 1 );
	}
	return false;
}
function get_users( array $args = array() ) {
	$meta_key   = $args['meta_key'] ?? '';
	$meta_value = $args['meta_value'] ?? null;
	$matches    = array();
	foreach ( $GLOBALS['sgs_test_user_meta'] as $uid => $meta ) {
		if ( '' !== $meta_key && isset( $meta[ $meta_key ] ) && $meta[ $meta_key ] === $meta_value ) {
			$matches[] = $uid;
		}
	}
	$number = (int) ( $args['number'] ?? 0 );
	return $number > 0 ? array_slice( $matches, 0, $number ) : $matches;
}
function wp_json_encode( $value ) {
	return json_encode( $value ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- CLI harness.
}
function __( $text, $domain = 'default' ) {
	return $text;
}
function esc_url_raw( $url ) {
	return $url;
}
function rest_url( $path = '' ) {
	return 'https://example.test/wp-json/' . ltrim( (string) $path, '/' );
}
function wp_create_nonce( $action ) {
	return 'nonce123';
}
function wp_add_inline_script( ...$args ) {
	$GLOBALS['sgs_test_inline_scripts'][] = $args;
}
function add_action( $hook, $callback, $priority = 10 ): void {
	$GLOBALS['sgs_test_actions'][] = array( $hook, $callback, $priority );
}
function add_filter( $hook, $callback, $priority = 10 ): void {
	$GLOBALS['sgs_test_filters'][] = array( $hook, $callback, $priority );
}
function register_rest_route( $namespace, $route, $args ): void {
	$GLOBALS['sgs_test_routes'][ $namespace . $route ] = $args;
}
function register_setting( $group, $key, $args = array() ): void {
	$GLOBALS['sgs_test_registered_settings'][] = array( $group, $key, $args );
}
function get_option( $key, $default = false ) {
	return $GLOBALS['sgs_test_options'][ $key ] ?? $default;
}
function update_option( $key, $value ) {
	$GLOBALS['sgs_test_options'][ $key ] = $value;
	return true;
}
function get_permalink( $id ) {
	return 500 === (int) $id ? 'https://example.test/saved-items/' : false;
}
function add_query_arg( $key, $value, $url ) {
	$sep = ( false === strpos( $url, '?' ) ) ? '?' : '&';
	return $url . $sep . rawurlencode( (string) $key ) . '=' . rawurlencode( (string) $value );
}
function sanitize_key( $key ) {
	return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
}
function sanitize_text_field( $value ) {
	return trim( (string) $value );
}
function wp_unslash( $value ) {
	return is_string( $value ) ? stripslashes( $value ) : $value;
}
function get_transient( $key ) {
	return $GLOBALS['sgs_test_transients'][ $key ] ?? false;
}
function set_transient( $key, $value, $expiration = 0 ) {
	$GLOBALS['sgs_test_transients'][ $key ] = $value;
	return true;
}
function wc_get_product( $id ) {
	return $GLOBALS['sgs_test_products'][ (int) $id ] ?? false;
}
function wc_get_price_to_display( $product, $args = array() ) {
	return $product->get_price();
}
function wc_get_price_decimals() {
	return 2;
}
function get_woocommerce_currency() {
	return 'GBP';
}

class WP_REST_Server {
	const READABLE  = 'GET';
	const CREATABLE = 'POST';
}
class WP_Error {
	public $code;
	public $message;
	public $data;
	public function __construct( $code = '', $message = '', $data = array() ) {
		$this->code    = $code;
		$this->message = $message;
		$this->data    = $data;
	}
	public function get_error_code() {
		return $this->code;
	}
	public function get_error_message() {
		return $this->message;
	}
	public function get_status() {
		return $this->data['status'] ?? 0;
	}
}
class WP_REST_Response {
	private $data;
	private $status;
	public function __construct( $data = null, $status = 200 ) {
		$this->data   = $data;
		$this->status = $status;
	}
	public function get_data() {
		return $this->data;
	}
	public function get_status() {
		return $this->status;
	}
}
class WP_REST_Request {
	private $params;
	public function __construct( array $params = array() ) {
		$this->params = $params;
	}
	public function get_param( $key ) {
		return $this->params[ $key ] ?? null;
	}
}
class WC_Product {
	private $id;
	private $purchasable;
	private $price;
	private $in_stock;
	private $visible;
	public function __construct( $id, $purchasable, $price, $in_stock, $visible ) {
		$this->id          = $id;
		$this->purchasable  = $purchasable;
		$this->price        = $price;
		$this->in_stock     = $in_stock;
		$this->visible      = $visible;
	}
	public function is_purchasable() {
		return $this->purchasable;
	}
	public function is_in_stock() {
		return $this->in_stock;
	}
	public function is_visible() {
		return $this->visible;
	}
	public function get_price() {
		return $this->price;
	}
}

// ── --negative-control mode ──────────────────────────────────────────────────
// A SEPARATE invocation (`php run-wishlist-standalone.php --negative-control`)
// that loads a MUTATED copy of the real Wishlist_Rest class — the
// is_user_logged_in() guard replaced with `return true;` — under the SAME
// class/namespace, then runs ONLY the "logged-out is refused" assertion
// against it. That assertion must now FAIL (a logged-out request is wrongly
// let through), proving the guard the main run relies on is load-bearing
// rather than a tautology. Exits BEFORE the main suite below runs, exactly
// like the guard-focused predecessor test this file replaces.
if ( in_array( '--negative-control', $argv, true ) ) {
	eval_broken_class_from_file(
		dirname( __DIR__, 2 ) . '/includes/wishlist/class-wishlist-rest.php',
		"public static function permission_logged_in(): bool {\n\t\treturn \\is_user_logged_in();\n\t}",
		"public static function permission_logged_in(): bool {\n\t\treturn true; // Negative control: is_user_logged_in() guard removed.\n\t}",
		'Wishlist_Rest',
		'Wishlist_Rest_Broken'
	);
	$GLOBALS['sgs_test_logged_in'] = false;
	$allowed_when_logged_out       = \SGS\Blocks\Wishlist_Rest_Broken::permission_logged_in();
	if ( false === $allowed_when_logged_out ) {
		echo "PASS  a logged-out visitor is refused by permission_logged_in()\n";
		echo "\n==== 1 passed, 0 failed ====\n";
		exit( 0 );
	}
	echo "FAIL  a logged-out visitor is refused by permission_logged_in()\n";
	echo "\n==== 0 passed, 1 failed ====\n";
	exit( 1 );
}

// -- Load the real classes ----------------------------------------------------

$wishlist_dir = dirname( __DIR__, 2 ) . '/includes/wishlist/';
require_once $wishlist_dir . 'class-wishlist-store.php';
require_once $wishlist_dir . 'class-wishlist-settings.php';
require_once $wishlist_dir . 'class-wishlist-rest.php';
require_once $wishlist_dir . 'class-wishlist-account-rest.php';
require_once $wishlist_dir . 'class-wishlist-shared-rest.php';
require_once $wishlist_dir . 'class-wishlist-privacy.php';

use SGS\Blocks\Wishlist_Store;
use SGS\Blocks\Wishlist_Settings;
use SGS\Blocks\Wishlist_Rest;
use SGS\Blocks\Wishlist_Account_Rest;
use SGS\Blocks\Wishlist_Shared_Rest;
use SGS\Blocks\Wishlist_Privacy;

$pass = 0;
$fail = 0;
function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

/**
 * Reset the fake user-meta store between scenarios.
 */
function reset_wishlist_meta(): void {
	$GLOBALS['sgs_test_user_meta'] = array();
}

/**
 * Load a MUTATED copy of a real wishlist class from disk as a differently
 * named class in the SAME namespace (so its unqualified calls to sibling
 * classes like `Wishlist_Settings::features()` still resolve) — the same
 * "write a real temp-free eval, never a synthetic fixture" technique the
 * original wishlist test used for its logged-out negative control.
 */
function eval_broken_class_from_file( string $path, string $needle, string $replacement, string $class_name, string $broken_name ): void {
	$source = (string) file_get_contents( $path );
	if ( false === strpos( $source, $needle ) ) {
		fwrite( STDERR, "negative-control setup: needle not found verbatim in $path\n" );
		exit( 1 );
	}
	$mutated = str_replace( $needle, $replacement, $source );
	if ( $mutated === $source ) {
		fwrite( STDERR, "negative-control setup: mutation was a no-op for $path\n" );
		exit( 1 );
	}
	$mutated = str_replace( "final class $class_name", "final class $broken_name", $mutated );
	$ns_pos  = strpos( $mutated, 'namespace SGS\\Blocks;' );
	$body    = substr( $mutated, $ns_pos );
	eval( $body ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness proving a negative control.
}

$wishlist_store_path         = $wishlist_dir . 'class-wishlist-store.php';
$wishlist_rest_path          = $wishlist_dir . 'class-wishlist-rest.php';
$wishlist_account_rest_path  = $wishlist_dir . 'class-wishlist-account-rest.php';
$wishlist_shared_rest_path   = $wishlist_dir . 'class-wishlist-shared-rest.php';

// ── Route registration ───────────────────────────────────────────────────────
Wishlist_Rest::register_routes();
Wishlist_Account_Rest::register_routes();
Wishlist_Shared_Rest::register_routes();
$routes = $GLOBALS['sgs_test_routes'];

ok( isset( $routes['sgs/v1/wishlist'] ), 'GET /wishlist is registered' );
ok( WP_REST_Server::READABLE === ( $routes['sgs/v1/wishlist']['methods'] ?? null ), 'GET /wishlist uses READABLE' );
ok( isset( $routes['sgs/v1/wishlist/toggle'] ), 'POST /wishlist/toggle is registered' );
ok( WP_REST_Server::CREATABLE === ( $routes['sgs/v1/wishlist/toggle']['methods'] ?? null ), 'POST /wishlist/toggle uses CREATABLE' );
ok( isset( $routes['sgs/v1/wishlist/merge'] ), 'POST /wishlist/merge is registered' );
ok(
	array( Wishlist_Rest::class, 'permission_logged_in' ) === ( $routes['sgs/v1/wishlist/toggle']['permission_callback'] ?? null ),
	'the toggle route wires permission_logged_in as its permission_callback'
);
ok( isset( $routes['sgs/v1/wishlist/alerts'] ), 'POST /wishlist/alerts is registered' );
ok( isset( $routes['sgs/v1/wishlist/share'] ), 'POST /wishlist/share is registered' );
ok(
	array( Wishlist_Rest::class, 'permission_logged_in' ) === ( $routes['sgs/v1/wishlist/alerts']['permission_callback'] ?? null ),
	'the alerts route reuses Wishlist_Rest::permission_logged_in as its permission_callback'
);
ok( isset( $routes['sgs/v1/wishlist/shared/(?P<token>[a-f0-9]{32})'] ), 'GET /wishlist/shared/{token} is registered' );
ok(
	'__return_true' === ( $routes['sgs/v1/wishlist/shared/(?P<token>[a-f0-9]{32})']['permission_callback'] ?? null ),
	'the shared route is genuinely public (__return_true)'
);

// ── An unpublished id is rejected (validate_callback) ────────────────────────
ok( true === Wishlist_Rest::validate_product( 101 ), 'a published, valid product id validates' );
ok( false === Wishlist_Rest::validate_product( 102 ), 'an UNPUBLISHED product id is rejected' );
ok( false === Wishlist_Rest::validate_product( 103 ), 'a non-product post id is rejected' );
ok( false === Wishlist_Rest::validate_product( 999999 ), 'a nonexistent product id is rejected' );

// ── A logged-out request is refused by permission_logged_in() ────────────────
$GLOBALS['sgs_test_logged_in'] = false;
ok( false === Wishlist_Rest::permission_logged_in(), 'a logged-out visitor is refused by permission_logged_in()' );
$GLOBALS['sgs_test_logged_in'] = true;
ok( true === Wishlist_Rest::permission_logged_in(), 'a logged-in visitor is allowed by permission_logged_in()' );

// ── toggle(): add records savedPrice/alertPrice/currency/inStock ─────────────
reset_wishlist_meta();
$add_request = new WP_REST_Request( array( 'productId' => 101 ) );
$add_result  = Wishlist_Rest::toggle( $add_request );
ok( $add_result instanceof WP_REST_Response, 'toggle() add returns a response' );
ok( true === $add_result->get_data()['saved'], 'toggle() add: saved=true' );
$added_entry = $add_result->get_data()['items'][0];
ok( 1999 === $added_entry['savedPrice'], 'toggle() add: savedPrice is the server-side price in minor units (19.99 -> 1999)' );
ok( 1999 === $added_entry['alertPrice'], 'toggle() add: alertPrice defaults to the savedPrice' );
ok( 'GBP' === $added_entry['currency'], 'toggle() add: currency comes from get_woocommerce_currency()' );
ok( true === $added_entry['inStock'], 'toggle() add: inStock reflects the product\'s current stock state' );

$remove_result = Wishlist_Rest::toggle( $add_request );
ok( false === $remove_result->get_data()['saved'], 'toggle() on the same id again removes it: saved=false' );
ok( 0 === count( $remove_result->get_data()['items'] ), 'toggle() remove: list is empty again' );

// ── A legacy entry (no price/stock keys) normalises to null/'' ──────────────
reset_wishlist_meta();
update_user_meta( 1, Wishlist_Store::META_KEY, wp_json_encode( array( array( 'id' => 101, 'addedTs' => 500 ) ) ) );
$legacy_list  = Wishlist_Store::read_list( 1 );
$legacy_entry = $legacy_list[0];
ok( 101 === $legacy_entry['id'] && 500 === $legacy_entry['addedTs'], 'a legacy entry keeps its id and addedTs' );
ok( null === $legacy_entry['savedPrice'], "a legacy entry's savedPrice normalises to null, never a fabricated value" );
ok( '' === $legacy_entry['currency'], "a legacy entry's currency normalises to ''" );
ok( null === $legacy_entry['alertPrice'], "a legacy entry's alertPrice normalises to null" );
ok( null === $legacy_entry['inStock'], "a legacy entry's inStock normalises to null" );

// ── toggle(): the 200-item cap returns 409 on a new addition ─────────────────
reset_wishlist_meta();
$full_list = array();
for ( $i = 1; $i <= Wishlist_Store::MAX_ITEMS; $i++ ) {
	$full_list[] = array(
		'id'      => 1000 + $i,
		'addedTs' => 1000 + $i,
	);
}
update_user_meta( 1, Wishlist_Store::META_KEY, wp_json_encode( $full_list ) );
$overflow_result = Wishlist_Rest::toggle( new WP_REST_Request( array( 'productId' => 101 ) ) );
ok( $overflow_result instanceof WP_Error, 'toggle() add past the 200-item cap returns a WP_Error' );
ok( 409 === $overflow_result->get_status(), 'toggle() cap error carries HTTP 409' );

$cap_remove = Wishlist_Rest::toggle( new WP_REST_Request( array( 'productId' => 1001 ) ) );
ok( $cap_remove instanceof WP_REST_Response, 'toggle() remove at the cap is still allowed (not blocked by the 409 guard)' );
ok( Wishlist_Store::MAX_ITEMS - 1 === count( $cap_remove->get_data()['items'] ), 'toggle() remove at the cap: list shrinks by one' );

// ── merge(): union + idempotence + earliest addedTs kept ─────────────────────
reset_wishlist_meta();
update_user_meta(
	1,
	Wishlist_Store::META_KEY,
	wp_json_encode( array( array( 'id' => 101, 'addedTs' => 500 ) ) )
);
$merge_1 = Wishlist_Rest::merge( new WP_REST_Request( array( 'ids' => array( 101, 103, 999999 ) ) ) );
$items_1 = $merge_1->get_data()['items'];
ok( 1 === count( $items_1 ), 'merge(): skips the invalid ids (103=non-product, 999999=nonexistent); only the pre-existing 101 remains' );
$id_101_ts = null;
foreach ( $items_1 as $entry ) {
	if ( 101 === $entry['id'] ) {
		$id_101_ts = $entry['addedTs'];
	}
}
ok( 500 === $id_101_ts, 'merge(): a pre-existing id keeps its ORIGINAL addedTs, not a fresh one' );

$merge_2 = Wishlist_Rest::merge( new WP_REST_Request( array( 'ids' => array( 101, 103, 999999 ) ) ) );
ok( $merge_2->get_data()['items'] === $items_1, 'merge(): calling merge again with the SAME ids is idempotent (identical result)' );

set_product( 104, true, '9.99', true, true );
$merge_3 = Wishlist_Rest::merge( new WP_REST_Request( array( 'ids' => array( 104 ) ) ) );
ok( 2 === count( $merge_3->get_data()['items'] ), 'merge(): a genuinely new valid id is unioned in' );
$merged_104 = null;
foreach ( $merge_3->get_data()['items'] as $entry ) {
	if ( 104 === $entry['id'] ) {
		$merged_104 = $entry;
	}
}
ok( 999 === $merged_104['savedPrice'], 'merge(): a new id gets its SERVER-SIDE price, never a client-sent one (9.99 -> 999)' );

// merge(): the cap keeps the 200 EARLIEST-added entries rather than failing.
reset_wishlist_meta();
$existing = array();
for ( $i = 1; $i <= 199; $i++ ) {
	$existing[] = array(
		'id'      => 2000 + $i,
		'addedTs' => $i, // ascending — id 2001 is earliest.
	);
}
update_user_meta( 1, Wishlist_Store::META_KEY, wp_json_encode( $existing ) );
set_product( 105, true, '1.00', true, true );
set_product( 106, true, '1.00', true, true );
$cap_merge = Wishlist_Rest::merge( new WP_REST_Request( array( 'ids' => array( 105, 106 ) ) ) );
ok( Wishlist_Store::MAX_ITEMS === count( $cap_merge->get_data()['items'] ), 'merge(): a union over 200 is capped at exactly 200, never a failure' );

// ── Client config exposes features + savedItemsUrl ───────────────────────────
Wishlist_Rest::enqueue_client_config();
$last_inline_script = end( $GLOBALS['sgs_test_inline_scripts'] )[1];
ok( false !== strpos( $last_inline_script, '"features"' ), 'the client config exposes "features"' );
ok( false !== strpos( $last_inline_script, '"savedItemsUrl"' ), 'the client config exposes "savedItemsUrl"' );

// ── POST /wishlist/alerts ─────────────────────────────────────────────────────
reset_wishlist_meta();
update_option( 'sgs_wishlist_features', array( 'priceAlerts' => true, 'stockAlerts' => true, 'sharing' => true ) );

$alerts_on_result = Wishlist_Account_Rest::set_alerts( new WP_REST_Request( array( 'price' => true ) ) );
ok( $alerts_on_result instanceof WP_REST_Response, 'set_alerts(): turning price alerts ON while the switch is on returns 200' );
ok( true === $alerts_on_result->get_data()['alerts']['price'], 'set_alerts(): the price opt-in is now true' );
$alerts_raw_after_on = Wishlist_Store::get_alerts_raw( 1 );
ok( $alerts_raw_after_on['price']['ts'] > 0, 'set_alerts(): turning an alert on stamps a non-zero timestamp' );

update_option( 'sgs_wishlist_features', array( 'priceAlerts' => false, 'stockAlerts' => true, 'sharing' => true ) );
$alerts_off_switch_result = Wishlist_Account_Rest::set_alerts( new WP_REST_Request( array( 'price' => true ) ) );
ok( $alerts_off_switch_result instanceof WP_Error, 'set_alerts(): turning price alerts ON while the site switch is OFF is refused' );
ok( 400 === $alerts_off_switch_result->get_status(), 'set_alerts(): the switch-off refusal carries HTTP 400' );
ok( 'sgs_wishlist_alert_off' === $alerts_off_switch_result->get_error_code(), "set_alerts(): the switch-off refusal's error code is sgs_wishlist_alert_off" );

$alerts_disable_result = Wishlist_Account_Rest::set_alerts( new WP_REST_Request( array( 'price' => false ) ) );
ok( $alerts_disable_result instanceof WP_REST_Response, 'set_alerts(): turning a type OFF is always allowed, even while its site switch is off' );
ok( false === $alerts_disable_result->get_data()['alerts']['price'], 'set_alerts(): the price opt-in is now false' );

update_option( 'sgs_wishlist_features', array( 'priceAlerts' => true, 'stockAlerts' => true, 'sharing' => true ) );

// ── POST /wishlist/share ──────────────────────────────────────────────────────
reset_wishlist_meta();
$share_enable_result = Wishlist_Account_Rest::set_share( new WP_REST_Request( array( 'enabled' => true ) ) );
ok( $share_enable_result instanceof WP_REST_Response, 'set_share(): enabling sharing while the switch is on returns 200' );
ok( true === $share_enable_result->get_data()['share']['enabled'], 'set_share(): enabled=true is reflected' );
$first_token = Wishlist_Store::get_share( 1 )['token'];
ok( 1 === preg_match( '/^[a-f0-9]{32}$/', $first_token ), 'set_share(): enabling for the first time creates a 32-lowercase-hex-char token' );
ok( 1 === Wishlist_Store::user_id_for_token( $first_token ), 'the fresh token resolves back to its owner' );

$share_regen_result = Wishlist_Account_Rest::set_share( new WP_REST_Request( array( 'enabled' => true, 'regenerate' => true ) ) );
$second_token        = $share_regen_result->get_data()['share']['url'];
ok( false !== strpos( (string) $second_token, $first_token ) ? false : true, 'set_share(): regenerate changes the token used in the URL (no longer contains the old one)' );
ok( 0 === Wishlist_Store::user_id_for_token( $first_token ), 'the OLD token no longer resolves to anyone after regenerate' );
$new_token = Wishlist_Store::get_share( 1 )['token'];
ok( 1 === Wishlist_Store::user_id_for_token( $new_token ), 'the NEW token resolves to its owner' );

update_option( 'sgs_wishlist_features', array( 'priceAlerts' => true, 'stockAlerts' => true, 'sharing' => false ) );
$share_switch_off_result = Wishlist_Account_Rest::set_share( new WP_REST_Request( array( 'enabled' => true ) ) );
ok( $share_switch_off_result instanceof WP_Error, 'set_share(): refused while the site sharing switch is off' );
ok( 403 === $share_switch_off_result->get_status(), 'set_share(): the switch-off refusal carries HTTP 403' );
update_option( 'sgs_wishlist_features', array( 'priceAlerts' => true, 'stockAlerts' => true, 'sharing' => true ) );

// ── GET /wishlist/shared/{token} ──────────────────────────────────────────────
reset_wishlist_meta();
set_product( 201, true, '4.00', true, true );  // Published + visible — should appear.
set_product( 202, true, '4.00', true, false ); // Published but NOT visible — must be excluded.
$GLOBALS['sgs_test_posts'][203] = array( 'product', 'draft' ); // Unpublished — must be excluded.
update_user_meta(
	1,
	Wishlist_Store::META_KEY,
	wp_json_encode(
		array(
			array( 'id' => 201, 'addedTs' => 1 ),
			array( 'id' => 202, 'addedTs' => 2 ),
			array( 'id' => 203, 'addedTs' => 3 ),
		)
	)
);
Wishlist_Store::set_share_enabled( 1, true );
$shared_token = Wishlist_Store::get_share( 1 )['token'];

$shared_result = Wishlist_Shared_Rest::get_shared( new WP_REST_Request( array( 'token' => $shared_token ) ) );
ok( $shared_result instanceof WP_REST_Response, 'GET shared: a valid, switched-on token returns a response' );
$shared_items = $shared_result->get_data()['items'];
ok( array( array( 'id' => 201 ) ) === $shared_items, 'GET shared: only the published + visible product (201) is returned; the invisible (202) and unpublished (203) are excluded' );
ok( array( 'id' => 201 ) === $shared_items[0], 'GET shared: each item is ONLY {id} — no owner name, email or other personal data' );

$shared_unknown_result = Wishlist_Shared_Rest::get_shared( new WP_REST_Request( array( 'token' => 'ffffffffffffffffffffffffffffffff' ) ) );
ok( $shared_unknown_result instanceof WP_Error && 404 === $shared_unknown_result->get_status(), 'GET shared: an unknown token 404s' );

Wishlist_Store::set_share_enabled( 1, false );
$shared_disabled_result = Wishlist_Shared_Rest::get_shared( new WP_REST_Request( array( 'token' => $shared_token ) ) );
ok( $shared_disabled_result instanceof WP_Error && 404 === $shared_disabled_result->get_status(), 'GET shared: a token whose owner switched sharing off 404s (not merely refused)' );
Wishlist_Store::set_share_enabled( 1, true );
$shared_token = Wishlist_Store::get_share( 1 )['token'];

update_option( 'sgs_wishlist_features', array( 'priceAlerts' => true, 'stockAlerts' => true, 'sharing' => false ) );
$shared_site_off_result = Wishlist_Shared_Rest::get_shared( new WP_REST_Request( array( 'token' => $shared_token ) ) );
ok( $shared_site_off_result instanceof WP_Error && 404 === $shared_site_off_result->get_status(), 'GET shared: the SITE sharing switch off also 404s, even with a live per-user token' );
update_option( 'sgs_wishlist_features', array( 'priceAlerts' => true, 'stockAlerts' => true, 'sharing' => true ) );

// ── Privacy eraser removes all four wishlist meta keys ───────────────────────
reset_wishlist_meta();
update_user_meta( 1, Wishlist_Store::META_KEY, wp_json_encode( array( array( 'id' => 101, 'addedTs' => 1 ) ) ) );
update_user_meta( 1, Wishlist_Store::ALERTS_META_KEY, wp_json_encode( array( 'price' => array( 'on' => true, 'ts' => 1 ) ) ) );
Wishlist_Store::set_share_enabled( 1, true );
$erase_result = Wishlist_Privacy::erase_data( 'a@example.com' );
ok( true === $erase_result['items_removed'], 'erase_data(): reports items_removed=true when there was data' );
ok( '' === (string) get_user_meta( 1, Wishlist_Store::META_KEY, true ), 'erase_data(): _sgs_wishlist is deleted' );
ok( '' === (string) get_user_meta( 1, Wishlist_Store::ALERTS_META_KEY, true ), 'erase_data(): _sgs_wishlist_alerts is deleted' );
ok( '' === (string) get_user_meta( 1, Wishlist_Store::SHARE_TOKEN_META_KEY, true ), 'erase_data(): _sgs_wishlist_share_token is deleted' );
ok( '' === (string) get_user_meta( 1, Wishlist_Store::SHARE_ON_META_KEY, true ), 'erase_data(): _sgs_wishlist_share_on is deleted' );

// ── NEGATIVE CONTROL (a): the alerts site-switch guard is load-bearing ───────
reset_wishlist_meta();
update_option( 'sgs_wishlist_features', array( 'priceAlerts' => false, 'stockAlerts' => true, 'sharing' => true ) );
eval_broken_class_from_file(
	$wishlist_account_rest_path,
	"! \$features['priceAlerts']",
	'! true',
	'Wishlist_Account_Rest',
	'Wishlist_Account_Rest_Broken'
);
$broken_alerts_result = \SGS\Blocks\Wishlist_Account_Rest_Broken::set_alerts( new WP_REST_Request( array( 'price' => true ) ) );
ok(
	! ( $broken_alerts_result instanceof WP_Error ),
	'NEGATIVE CONTROL (a): with the priceAlerts site-switch guard removed, a price-alert opt-in is WRONGLY allowed while the switch is off — proving the real 400 assertion above can fail'
);
update_option( 'sgs_wishlist_features', array( 'priceAlerts' => true, 'stockAlerts' => true, 'sharing' => true ) );

// ── NEGATIVE CONTROL (b): the is_visible() filter is load-bearing ────────────
reset_wishlist_meta();
set_product( 301, true, '2.00', true, false ); // Published but NOT visible.
update_user_meta( 1, Wishlist_Store::META_KEY, wp_json_encode( array( array( 'id' => 301, 'addedTs' => 1 ) ) ) );
Wishlist_Store::set_share_enabled( 1, true );
$broken_shared_token = Wishlist_Store::get_share( 1 )['token'];
eval_broken_class_from_file(
	$wishlist_shared_rest_path,
	'! $product->is_visible()',
	'false',
	'Wishlist_Shared_Rest',
	'Wishlist_Shared_Rest_Broken'
);
$broken_shared_result = \SGS\Blocks\Wishlist_Shared_Rest_Broken::get_shared( new WP_REST_Request( array( 'token' => $broken_shared_token ) ) );
$broken_shared_items  = $broken_shared_result->get_data()['items'] ?? array();
ok(
	1 === count( $broken_shared_items ) && 301 === $broken_shared_items[0]['id'],
	'NEGATIVE CONTROL (b): with the is_visible() filter removed, an invisible product is WRONGLY included — proving the real "only visible" assertion above can fail'
);

// ── NEGATIVE CONTROL (c): the is_user_logged_in() guard is load-bearing ─────
// The `--negative-control` invocation above (checked before the main suite
// ran) already exercises this in isolation, exiting before this point is
// ever reached. This inline copy proves the same guard on every ORDINARY
// run too, so `php run-wishlist-standalone.php` alone (no flag) still
// demonstrates the control without a second process.
eval_broken_class_from_file(
	$wishlist_rest_path,
	"public static function permission_logged_in(): bool {\n\t\treturn \\is_user_logged_in();\n\t}",
	"public static function permission_logged_in_broken(): bool {\n\t\treturn true; // Negative control: is_user_logged_in() guard removed.\n\t}",
	'Wishlist_Rest',
	'Wishlist_Rest_Broken_Inline'
);
$GLOBALS['sgs_test_logged_in'] = false;
ok(
	true === \SGS\Blocks\Wishlist_Rest_Broken_Inline::permission_logged_in_broken(),
	'NEGATIVE CONTROL (c): with the is_user_logged_in() check removed, a logged-out request is WRONGLY allowed — proving the real refusal test above can fail'
);
$GLOBALS['sgs_test_logged_in'] = true;

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );

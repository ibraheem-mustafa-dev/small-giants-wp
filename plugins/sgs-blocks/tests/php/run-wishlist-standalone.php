<?php
/**
 * Standalone runner for `includes/class-sgs-wishlist-rest.php` (Wave 3C U-12 §E).
 *
 * Exercises the REAL class (required directly, not copied) against fake WP
 * function stubs — the same shape as `run-scrim-cart-standalone.php` and the
 * rest of this directory. Covers:
 *   - route registration (methods/permission/args wired correctly);
 *   - `merge()` union + idempotence + the 200-item cap;
 *   - `toggle()` add/remove + the 200-item cap returning 409;
 *   - an unpublished product id rejected by `validate_product()`;
 *   - a logged-out request refused by `permission_logged_in()`;
 *   - NEGATIVE CONTROL: with the `is_user_logged_in()` check removed from a
 *     patched copy of `permission_logged_in()`, the refusal test's assertion
 *     goes red (proving the real test can actually fail).
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

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// -- WordPress core function/class stubs -------------------------------------

$GLOBALS['sgs_test_logged_in'] = true;
$GLOBALS['sgs_test_user_id']   = 1;
$GLOBALS['sgs_test_posts']     = array(
	101 => array( 'product', 'publish' ), // Valid.
	102 => array( 'product', 'draft' ),   // Unpublished — must be rejected.
	103 => array( 'post', 'publish' ),    // Not a product.
);
$GLOBALS['sgs_test_user_meta'] = array();
$GLOBALS['sgs_test_actions']   = array();
$GLOBALS['sgs_test_filters']   = array();
$GLOBALS['sgs_test_routes']    = array();

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

// ── --negative-control mode ──────────────────────────────────────────────────
// A SEPARATE invocation (`php run-wishlist-standalone.php --negative-control`)
// that loads a MUTATED copy of the real class — the is_user_logged_in() guard
// replaced with `return true;` — under the SAME class/namespace, then runs
// ONLY the "logged-out is refused" assertion against it. That assertion must
// now FAIL (a logged-out request is wrongly let through), proving the guard
// this test relies on is load-bearing rather than a tautology. Writing the
// mutated source to a real temp file (not eval()) is the only way to load a
// second same-named class definition as a drop-in replacement.
if ( in_array( '--negative-control', $argv, true ) ) {
	$real_source  = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-sgs-wishlist-rest.php' );
	$guard_needle = "public static function permission_logged_in(): bool {\n\t\treturn \\is_user_logged_in();\n\t}";
	if ( false === strpos( $real_source, $guard_needle ) ) {
		fwrite( STDERR, "FAIL  negative-control setup: the guard text was not found verbatim in the real source (test is stale)\n" );
		exit( 1 );
	}
	$mutated_source = str_replace(
		$guard_needle,
		"public static function permission_logged_in(): bool {\n\t\treturn true; // Negative control: is_user_logged_in() guard removed.\n\t}",
		$real_source
	);
	$tmp_path = sys_get_temp_dir() . '/sgs-wishlist-rest-negative-control.php';
	file_put_contents( $tmp_path, $mutated_source );
	require_once $tmp_path;

	$GLOBALS['sgs_test_logged_in'] = false;
	$allowed_when_logged_out       = \SGS\Blocks\Sgs_Wishlist_Rest::permission_logged_in();
	if ( false === $allowed_when_logged_out ) {
		echo "PASS  a logged-out visitor is refused by permission_logged_in()\n";
		echo "\n==== 1 passed, 0 failed ====\n";
		exit( 0 );
	}
	echo "FAIL  a logged-out visitor is refused by permission_logged_in()\n";
	echo "\n==== 0 passed, 1 failed ====\n";
	exit( 1 );
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-wishlist-rest.php';

use SGS\Blocks\Sgs_Wishlist_Rest;

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

// ── Route registration ───────────────────────────────────────────────────────
Sgs_Wishlist_Rest::register_routes();
$routes = $GLOBALS['sgs_test_routes'];
ok( isset( $routes['sgs/v1/wishlist'] ), 'GET /wishlist is registered' );
ok( WP_REST_Server::READABLE === ( $routes['sgs/v1/wishlist']['methods'] ?? null ), 'GET /wishlist uses READABLE' );
ok( isset( $routes['sgs/v1/wishlist/toggle'] ), 'POST /wishlist/toggle is registered' );
ok( WP_REST_Server::CREATABLE === ( $routes['sgs/v1/wishlist/toggle']['methods'] ?? null ), 'POST /wishlist/toggle uses CREATABLE' );
ok( isset( $routes['sgs/v1/wishlist/merge'] ), 'POST /wishlist/merge is registered' );
ok(
	array( Sgs_Wishlist_Rest::class, 'permission_logged_in' ) === ( $routes['sgs/v1/wishlist/toggle']['permission_callback'] ?? null ),
	'the toggle route wires permission_logged_in as its permission_callback'
);

// ── An unpublished id is rejected (validate_callback) ────────────────────────
ok( true === Sgs_Wishlist_Rest::validate_product( 101 ), 'a published, valid product id validates' );
ok( false === Sgs_Wishlist_Rest::validate_product( 102 ), 'an UNPUBLISHED product id is rejected' );
ok( false === Sgs_Wishlist_Rest::validate_product( 103 ), 'a non-product post id is rejected' );
ok( false === Sgs_Wishlist_Rest::validate_product( 999999 ), 'a nonexistent product id is rejected' );

// ── A logged-out request is refused by permission_logged_in() ────────────────
$GLOBALS['sgs_test_logged_in'] = false;
ok( false === Sgs_Wishlist_Rest::permission_logged_in(), 'a logged-out visitor is refused by permission_logged_in()' );
$GLOBALS['sgs_test_logged_in'] = true;
ok( true === Sgs_Wishlist_Rest::permission_logged_in(), 'a logged-in visitor is allowed by permission_logged_in()' );

// ── toggle(): add, then remove (round trip) ───────────────────────────────────
reset_wishlist_meta();
$add_request = new WP_REST_Request( array( 'productId' => 101 ) );
$add_result  = Sgs_Wishlist_Rest::toggle( $add_request );
ok( $add_result instanceof WP_REST_Response, 'toggle() add returns a response' );
ok( true === $add_result->get_data()['saved'], 'toggle() add: saved=true' );
ok( 1 === count( $add_result->get_data()['items'] ), 'toggle() add: one item stored' );

$remove_result = Sgs_Wishlist_Rest::toggle( $add_request );
ok( false === $remove_result->get_data()['saved'], 'toggle() on the same id again removes it: saved=false' );
ok( 0 === count( $remove_result->get_data()['items'] ), 'toggle() remove: list is empty again' );

// ── toggle(): the 200-item cap returns 409 on a new addition ─────────────────
reset_wishlist_meta();
$full_list = array();
for ( $i = 1; $i <= Sgs_Wishlist_Rest::MAX_ITEMS; $i++ ) {
	$full_list[] = array(
		'id'      => 1000 + $i,
		'addedTs' => 1000 + $i,
	);
}
update_user_meta( 1, Sgs_Wishlist_Rest::META_KEY, wp_json_encode( $full_list ) );
$overflow_result = Sgs_Wishlist_Rest::toggle( new WP_REST_Request( array( 'productId' => 101 ) ) );
ok( $overflow_result instanceof WP_Error, 'toggle() add past the 200-item cap returns a WP_Error' );
ok( 409 === $overflow_result->get_status(), 'toggle() cap error carries HTTP 409' );

// A REMOVE at the cap is still allowed (it shrinks the list, never blocked).
$cap_remove = Sgs_Wishlist_Rest::toggle( new WP_REST_Request( array( 'productId' => 1001 ) ) );
ok( $cap_remove instanceof WP_REST_Response, 'toggle() remove at the cap is still allowed (not blocked by the 409 guard)' );
ok( Sgs_Wishlist_Rest::MAX_ITEMS - 1 === count( $cap_remove->get_data()['items'] ), 'toggle() remove at the cap: list shrinks by one' );

// ── merge(): union + idempotence + earliest addedTs kept ─────────────────────
reset_wishlist_meta();
update_user_meta(
	1,
	Sgs_Wishlist_Rest::META_KEY,
	wp_json_encode( array( array( 'id' => 101, 'addedTs' => 500 ) ) )
);
$merge_1 = Sgs_Wishlist_Rest::merge( new WP_REST_Request( array( 'ids' => array( 101, 103, 999999 ) ) ) );
$items_1 = $merge_1->get_data()['items'];
ok( 1 === count( $items_1 ), 'merge(): skips the invalid ids (103=non-product, 999999=nonexistent); only the pre-existing 101 remains' );
$id_101_ts = null;
foreach ( $items_1 as $entry ) {
	if ( 101 === $entry['id'] ) {
		$id_101_ts = $entry['addedTs'];
	}
}
ok( 500 === $id_101_ts, 'merge(): a pre-existing id keeps its ORIGINAL addedTs, not a fresh one' );

$merge_2 = Sgs_Wishlist_Rest::merge( new WP_REST_Request( array( 'ids' => array( 101, 103, 999999 ) ) ) );
ok( $merge_2->get_data()['items'] === $items_1, 'merge(): calling merge again with the SAME ids is idempotent (identical result)' );

// merge() with a genuinely new valid id.
$GLOBALS['sgs_test_posts'][104] = array( 'product', 'publish' );
$merge_3 = Sgs_Wishlist_Rest::merge( new WP_REST_Request( array( 'ids' => array( 104 ) ) ) );
ok( 2 === count( $merge_3->get_data()['items'] ), 'merge(): a genuinely new valid id is unioned in' );

// merge(): the cap keeps the 200 EARLIEST-added entries rather than failing.
reset_wishlist_meta();
$existing = array();
for ( $i = 1; $i <= 199; $i++ ) {
	$existing[] = array(
		'id'      => 2000 + $i,
		'addedTs' => $i, // ascending — id 2001 is earliest.
	);
}
update_user_meta( 1, Sgs_Wishlist_Rest::META_KEY, wp_json_encode( $existing ) );
$GLOBALS['sgs_test_posts'][105] = array( 'product', 'publish' );
$GLOBALS['sgs_test_posts'][106] = array( 'product', 'publish' );
$cap_merge = Sgs_Wishlist_Rest::merge( new WP_REST_Request( array( 'ids' => array( 105, 106 ) ) ) );
ok( Sgs_Wishlist_Rest::MAX_ITEMS === count( $cap_merge->get_data()['items'] ), 'merge(): a union over 200 is capped at exactly 200, never a failure' );

// ── Negative control ─────────────────────────────────────────────────────────
// Prove the "logged-out is refused" assertion above is a REAL test: patch a
// copy of the source with the is_user_logged_in() check removed, and show
// that patched copy WRONGLY allows a logged-out request through.
$source        = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-sgs-wishlist-rest.php' );
$guard_needle  = "public static function permission_logged_in(): bool {\n\t\treturn \\is_user_logged_in();\n\t}";
ok( false !== strpos( $source, $guard_needle ), 'the is_user_logged_in() guard is found verbatim in the real source (so the patch below is a real mutation)' );
$broken_source = str_replace( $guard_needle, "public static function permission_logged_in_broken(): bool {\n\t\treturn true; // Negative control: guard removed.\n\t}", $source );
ok( $broken_source !== $source, 'negative control: the guard was actually mutated' );
$broken_source = str_replace( 'class Sgs_Wishlist_Rest', 'class Sgs_Wishlist_Rest_Broken', $broken_source );
// Strip the require-free body down to just the one broken method, to avoid
// redeclaring the whole (already-loaded) class under a different name.
$fn_start = strpos( $broken_source, 'public static function permission_logged_in_broken' );
$fn_end   = strpos( $broken_source, "\n\t}", $fn_start ) + 3;
$fn_text  = substr( $broken_source, $fn_start, $fn_end - $fn_start );
eval( 'class Sgs_Wishlist_Rest_Broken { ' . $fn_text . ' }' ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness proving the negative control.
$GLOBALS['sgs_test_logged_in'] = false;
ok( true === Sgs_Wishlist_Rest_Broken::permission_logged_in_broken(), 'NEGATIVE CONTROL: with the is_user_logged_in() check removed, a logged-out request is WRONGLY allowed — proving the real refusal test above can fail' );
$GLOBALS['sgs_test_logged_in'] = true;

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );

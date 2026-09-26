<?php
/**
 * Standalone runner for `Wishlist_Alerts_Scan::evaluate()`, `Sgs_Webhook::send()`
 * and `Stock_Notify_Dispatch::dispatch()` (Spec 30 P5, FR-30-14/15).
 *
 * Exercises the REAL classes (required directly, not copied) against fake WP
 * function stubs — the same shape as `run-wishlist-standalone.php` and the
 * rest of this directory. Covers:
 *   - evaluate(): price drop/rise/re-drop, null baseline, stock out->in/in->out,
 *     disabled type;
 *   - Sgs_Webhook::send(): non-https and empty URLs both refused;
 *   - Stock_Notify_Dispatch::dispatch(): meta cleared only when send() succeeds;
 *   - NEGATIVE CONTROLS: a patched evaluate() that never lowers the baseline
 *     makes the "second run yields zero items" assertion go red, and a
 *     patched dispatch that deletes before checking send() makes the "list
 *     kept on failure" assertion go red — proving both real assertions can
 *     actually fail.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-wishlist-alerts-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! defined( 'HOUR_IN_SECONDS' ) ) {
	define( 'HOUR_IN_SECONDS', 3600 );
}

// -- WordPress core function/class stubs -------------------------------------

$GLOBALS['sgs_test_options']    = array();
$GLOBALS['sgs_test_post_meta']  = array();
$GLOBALS['sgs_test_post_data']  = array();
$GLOBALS['sgs_test_remote_log'] = array();

function add_action( ...$args ) {} // phpcs:ignore
function absint( $value ): int {
	return abs( (int) $value );
}
function get_option( $key, $default = false ) {
	return $GLOBALS['sgs_test_options'][ $key ] ?? $default;
}
function apply_filters( $tag, $value, ...$args ) {
	return $value;
}
function wp_parse_url( $url, $component = -1 ) {
	return parse_url( $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}
function wp_json_encode( $data ) {
	return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}
function get_site_url() {
	return 'https://example.test';
}
function wp_safe_remote_post( $url, $args ) {
	$GLOBALS['sgs_test_remote_log'][] = array( 'url' => $url, 'args' => $args );
	return array( 'response' => array( 'code' => 200 ) );
}
function get_post_status( $id ) {
	return $GLOBALS['sgs_test_post_data'][ (int) $id ]['status'] ?? false;
}
function get_the_title( $id ) {
	return $GLOBALS['sgs_test_post_data'][ (int) $id ]['title'] ?? '';
}
function get_permalink( $id ) {
	return $GLOBALS['sgs_test_post_data'][ (int) $id ]['url'] ?? '';
}
function get_post_meta( $id, $key, $single = false ) {
	return $GLOBALS['sgs_test_post_meta'][ (int) $id ][ $key ] ?? '';
}
function delete_post_meta( $id, $key ) {
	unset( $GLOBALS['sgs_test_post_meta'][ (int) $id ][ $key ] );
	return true;
}

require dirname( __DIR__, 2 ) . '/includes/class-sgs-webhook.php';
require dirname( __DIR__, 2 ) . '/includes/class-stock-notify.php';
require dirname( __DIR__, 2 ) . '/includes/class-stock-notify-dispatch.php';
require __DIR__ . '/../../includes/wishlist/class-wishlist-alerts-scan.php';

use SGS\Blocks\Sgs_Webhook;
use SGS\Blocks\Stock_Notify;
use SGS\Blocks\Stock_Notify_Dispatch;
use SGS\Blocks\Wishlist_Alerts_Scan;

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

// -- evaluate(): fixed lookup table, keyed by product id ---------------------

$GLOBALS['sgs_lookup_table'] = array();
function test_lookup( int $id ): ?array {
	return $GLOBALS['sgs_lookup_table'][ $id ] ?? null;
}

function make_entry( int $id, ?int $alert_price, ?bool $in_stock ): array {
	return array(
		'id'         => $id,
		'addedTs'    => 1000,
		'savedPrice' => $alert_price,
		'currency'   => 'GBP',
		'alertPrice' => $alert_price,
		'inStock'    => $in_stock,
	);
}

// 1. Drop below alertPrice: one price_drop item, alertPrice lowered.
$GLOBALS['sgs_lookup_table'][1] = array( 'price' => 800, 'in_stock' => true, 'name' => 'Widget', 'url' => 'https://x/1', 'decimals' => 2 );
$list1   = array( make_entry( 1, 1000, null ) );
$result1 = Wishlist_Alerts_Scan::evaluate( $list1, 'test_lookup', array( 'price' => true, 'stock' => false ) );
ok( 1 === count( $result1['items'] ) && 'price_drop' === $result1['items'][0]['type'], 'a drop below alertPrice yields exactly one price_drop item' );
ok( 800 === $result1['list'][0]['alertPrice'], 'a drop lowers alertPrice to the current price' );

// 2. Running evaluate again on the returned list (price unchanged) yields zero items.
$result2 = Wishlist_Alerts_Scan::evaluate( $result1['list'], 'test_lookup', array( 'price' => true, 'stock' => false ) );
ok( empty( $result2['items'] ), 'running evaluate again with no further drop yields zero items' );

// 3. A rise yields nothing and keeps alertPrice.
$GLOBALS['sgs_lookup_table'][1]['price'] = 900;
$result3                                 = Wishlist_Alerts_Scan::evaluate( $result1['list'], 'test_lookup', array( 'price' => true, 'stock' => false ) );
ok( empty( $result3['items'] ) && 800 === $result3['list'][0]['alertPrice'], 'a rise yields nothing and keeps alertPrice' );

// 4. A second drop below the new (lower) baseline alerts again.
$GLOBALS['sgs_lookup_table'][1]['price'] = 500;
$result4                                 = Wishlist_Alerts_Scan::evaluate( $result3['list'], 'test_lookup', array( 'price' => true, 'stock' => false ) );
ok( 1 === count( $result4['items'] ) && 500 === $result4['list'][0]['alertPrice'], 'a second drop below the new baseline alerts again' );

// 5. Null baseline sets baseline without alert.
$GLOBALS['sgs_lookup_table'][2] = array( 'price' => 700, 'in_stock' => true, 'name' => 'Gadget', 'url' => 'https://x/2', 'decimals' => 2 );
$list5                          = array( make_entry( 2, null, null ) );
$result5                        = Wishlist_Alerts_Scan::evaluate( $list5, 'test_lookup', array( 'price' => true, 'stock' => false ) );
ok( empty( $result5['items'] ) && 700 === $result5['list'][0]['alertPrice'], 'null baseline sets baseline without alert' );

// 6. Out-of-stock turning in-stock yields one back_in_stock item.
$GLOBALS['sgs_lookup_table'][3] = array( 'price' => null, 'in_stock' => true, 'name' => 'Chair', 'url' => 'https://x/3', 'decimals' => 2 );
$list6                          = array( make_entry( 3, null, false ) );
$result6                        = Wishlist_Alerts_Scan::evaluate( $list6, 'test_lookup', array( 'price' => false, 'stock' => true ) );
ok( 1 === count( $result6['items'] ) && 'back_in_stock' === $result6['items'][0]['type'], 'out->in yields one back_in_stock item' );

// 7. In-stock turning out-of-stock yields nothing but stores false.
$GLOBALS['sgs_lookup_table'][4] = array( 'price' => null, 'in_stock' => false, 'name' => 'Table', 'url' => 'https://x/4', 'decimals' => 2 );
$list7                          = array( make_entry( 4, null, true ) );
$result7                        = Wishlist_Alerts_Scan::evaluate( $list7, 'test_lookup', array( 'price' => false, 'stock' => true ) );
ok( empty( $result7['items'] ) && false === $result7['list'][0]['inStock'], 'in->out yields nothing but stores false' );

// 8. A disabled type yields nothing (and leaves the entry untouched).
$GLOBALS['sgs_lookup_table'][5] = array( 'price' => 100, 'in_stock' => true, 'name' => 'Lamp', 'url' => 'https://x/5', 'decimals' => 2 );
$list8                          = array( make_entry( 5, 1000, false ) );
$result8                        = Wishlist_Alerts_Scan::evaluate( $list8, 'test_lookup', array( 'price' => false, 'stock' => false ) );
ok( empty( $result8['items'] ) && $list8 === $result8['list'], 'a disabled type yields nothing and leaves the entry untouched' );

// -- Sgs_Webhook::send() -------------------------------------------------

$GLOBALS['sgs_test_options']['sgs_n8n_webhook_url'] = 'http://not-https.example.com/hook';
ok( false === Sgs_Webhook::send( 'sgs_test_event', array() ), 'a non-https webhook URL returns false' );

$GLOBALS['sgs_test_options']['sgs_n8n_webhook_url'] = '';
ok( false === Sgs_Webhook::send( 'sgs_test_event', array() ), 'an empty webhook URL returns false' );

// -- Stock_Notify_Dispatch::dispatch() -----------------------------------

$GLOBALS['sgs_test_post_data'][10]              = array( 'status' => 'publish', 'title' => 'Back-in-stock widget', 'url' => 'https://x/10' );
$GLOBALS['sgs_test_post_meta'][10][ Stock_Notify::META_KEY ] = wp_json_encode(
	array( array( 'email' => 'a@example.com', 'ts' => 1000 ) )
);

$GLOBALS['sgs_test_options']['sgs_n8n_webhook_url'] = 'https://n8n.example.com/hook';
Stock_Notify_Dispatch::dispatch( 10 );
ok( '' === get_post_meta( 10, Stock_Notify::META_KEY ), 'meta is deleted once send() succeeds (valid https URL)' );

$GLOBALS['sgs_test_post_data'][11]              = array( 'status' => 'publish', 'title' => 'Still out-of-stock widget', 'url' => 'https://x/11' );
$GLOBALS['sgs_test_post_meta'][11][ Stock_Notify::META_KEY ] = wp_json_encode(
	array( array( 'email' => 'b@example.com', 'ts' => 1000 ) )
);
$GLOBALS['sgs_test_options']['sgs_n8n_webhook_url'] = ''; // send() will fail.
Stock_Notify_Dispatch::dispatch( 11 );
ok( '' !== get_post_meta( 11, Stock_Notify::META_KEY ), 'the list is kept when send() fails (no webhook configured)' );

// -- NEGATIVE CONTROLS ----------------------------------------------------

// (a) A patched evaluate() that never lowers the baseline on a drop.
function broken_evaluate_no_lower( array $list, callable $lookup ): array {
	$out   = array();
	$items = array();
	foreach ( $list as $entry ) {
		$data = $lookup( $entry['id'] );
		if ( $data && null !== $entry['alertPrice'] && $data['price'] < $entry['alertPrice'] ) {
			$items[] = array( 'type' => 'price_drop' );
			// BUG: alertPrice deliberately NOT updated here.
		}
		$out[] = $entry;
	}
	return array( 'list' => $out, 'items' => $items );
}
$GLOBALS['sgs_lookup_table'][1]['price'] = 800;
$broken_first                            = broken_evaluate_no_lower( array( make_entry( 1, 1000, null ) ), 'test_lookup' );
$broken_second                           = broken_evaluate_no_lower( $broken_first['list'], 'test_lookup' );
ok( ! empty( $broken_second['items'] ), 'NEGATIVE CONTROL: a patched evaluate() that never lowers the baseline re-alerts on the second run (proves the real "zero items" assertion can fail)' );

// (b) A patched dispatch that deletes the list before checking send().
function broken_dispatch_delete_first( int $product_id ): void {
	delete_post_meta( $product_id, Stock_Notify::META_KEY );
	Sgs_Webhook::send( 'sgs_back_in_stock', array() ); // Result ignored — the bug.
}
$GLOBALS['sgs_test_post_data'][12]              = array( 'status' => 'publish', 'title' => 'X', 'url' => 'https://x/12' );
$GLOBALS['sgs_test_post_meta'][12][ Stock_Notify::META_KEY ] = wp_json_encode( array( array( 'email' => 'c@example.com', 'ts' => 1 ) ) );
$GLOBALS['sgs_test_options']['sgs_n8n_webhook_url'] = ''; // send() will fail.
broken_dispatch_delete_first( 12 );
ok( '' === get_post_meta( 12, Stock_Notify::META_KEY ), 'NEGATIVE CONTROL: a patched dispatch that deletes before checking send() loses the list on failure (proves the real "list kept" assertion can fail)' );

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );

<?php
/**
 * Standalone runner for `Wishlist_Alerts_Scan::evaluate()`, `Sgs_Webhook::send()`,
 * `Wishlist_Alert_Mailer::send()`, `Stock_Notify_Mailer::send()` and
 * `Stock_Notify_Dispatch::dispatch()` (Spec 30 P5, FR-30-14/15, unified-email
 * plan phase 3).
 *
 * Exercises the REAL classes (required directly, not copied) against fake WP
 * function stubs — the same shape as `run-wishlist-standalone.php` and the
 * rest of this directory. A minimal `WC_Email` stand-in and a controllable
 * `Fake_Shop_Email` double (same pattern as `run-mailer-standalone.php`'s
 * WC_Email stub) let the real `Wishlist_Alert_Mailer` and
 * `Stock_Notify_Mailer` classes run against a fake WooCommerce mailer, with
 * `trigger()` calls captured and their return value controllable per test.
 *
 * Covers:
 *   - evaluate(): price drop/rise/re-drop, null baseline, stock out->in/in->out,
 *     disabled type;
 *   - Sgs_Webhook::send(): non-https and empty URLs both refused;
 *   - Wishlist_Alert_Mailer::send(): a real send moves baselines, a failed
 *     send (email enabled) does not, a switched-off email moves baselines
 *     without calling trigger(), the optional webhook fires regardless;
 *   - Stock_Notify_Mailer::send(): partial per-subscriber failure keeps only
 *     the failed entries, a switched-off email clears the whole list,
 *     duplicates and malformed entries are dropped;
 *   - Stock_Notify_Dispatch::dispatch(): the same partial-failure behaviour
 *     end to end through post meta;
 *   - NEGATIVE CONTROLS: a patched evaluate() that never lowers the baseline
 *     makes the "second run yields zero items" assertion go red; a patched
 *     alert-send that moves the baseline even when the email is enabled and
 *     the send failed makes the "failed send blocks the baseline" assertion
 *     go red; a patched per-subscriber send that clears the whole list on any
 *     partial failure makes the "only failures remain" assertion go red.
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
function update_post_meta( $id, $key, $value ) {
	$GLOBALS['sgs_test_post_meta'][ (int) $id ][ $key ] = $value;
	return true;
}
function sanitize_email( $value ) {
	return trim( (string) $value );
}

// Minimal WP_User stand-in: Wishlist_Alert_Mailer type-hints \WP_User.
if ( ! class_exists( 'WP_User' ) ) {
	class WP_User {
		public $user_email;
		public $first_name;
	}
}

// Minimal WC_Email stand-in — same pattern as run-mailer-standalone.php's
// WC_Email stub. Sgs_Shop_Emails::get_email() only ever type-checks
// `instanceof \WC_Email` and calls is_enabled()/trigger(); nothing here needs
// the real WooCommerce settings API.
if ( ! class_exists( 'WC_Email' ) ) {
	class WC_Email {}
}

/**
 * Controllable WC_Email double: `is_enabled()` and `trigger()` are scripted
 * per test, and every `trigger()` call is captured for assertions.
 */
class Fake_Shop_Email extends WC_Email {
	public $enabled_flag         = true;
	public $trigger_result       = true;
	public $trigger_results_by_to = array();
	public $calls                = array();

	public function is_enabled() {
		return $this->enabled_flag;
	}

	public function trigger( $to, ...$rest ) {
		$this->calls[] = array_merge( array( $to ), $rest );
		if ( array_key_exists( $to, $this->trigger_results_by_to ) ) {
			return $this->trigger_results_by_to[ $to ];
		}
		return $this->trigger_result;
	}
}

$GLOBALS['sgs_test_emails'] = array();
function WC() { // phpcs:ignore WordPress.NamingConventions.ValidFunctionName.FunctionNameInvalid, PSR1.Methods.CamelCapsMethodName.NotCamelCaps -- matches WooCommerce's own global WC() accessor.
	return new class {
		public function mailer() {
			return new class {
				public function get_emails() {
					return $GLOBALS['sgs_test_emails'];
				}
			};
		}
	};
}

require dirname( __DIR__, 2 ) . '/includes/class-sgs-webhook.php';
require dirname( __DIR__, 2 ) . '/includes/class-stock-notify.php';
require dirname( __DIR__, 2 ) . '/includes/class-stock-notify-mailer.php';
require dirname( __DIR__, 2 ) . '/includes/class-stock-notify-dispatch.php';
require dirname( __DIR__, 2 ) . '/includes/wishlist/class-wishlist-settings.php';
require dirname( __DIR__, 2 ) . '/includes/wishlist/emails/class-sgs-shop-emails.php';
require dirname( __DIR__, 2 ) . '/includes/wishlist/class-wishlist-alert-mailer.php';
require __DIR__ . '/../../includes/wishlist/class-wishlist-alerts-scan.php';

use SGS\Blocks\Sgs_Shop_Emails;
use SGS\Blocks\Sgs_Webhook;
use SGS\Blocks\Stock_Notify;
use SGS\Blocks\Stock_Notify_Dispatch;
use SGS\Blocks\Stock_Notify_Mailer;
use SGS\Blocks\Wishlist_Alert_Mailer;
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

// -- Wishlist_Alert_Mailer::send() ---------------------------------------

$fake_saved_items = new Fake_Shop_Email();
$GLOBALS['sgs_test_emails'][ Sgs_Shop_Emails::SAVED_ITEMS_KEY ] = $fake_saved_items;

$shopper             = new WP_User();
$shopper->user_email = 'shopper@example.com';
$shopper->first_name = 'Sam';
$alert_items          = array( array( 'type' => 'price_drop', 'name' => 'Widget', 'url' => 'https://x/1' ) );

$GLOBALS['sgs_test_options']['sgs_n8n_webhook_url'] = 'https://n8n.example.com/hook';

// (a) Email enabled, send succeeds: baseline should move, trigger() called with the shopper's data.
$fake_saved_items->enabled_flag   = true;
$fake_saved_items->trigger_result = true;
$fake_saved_items->calls          = array();
$GLOBALS['sgs_test_remote_log']   = array();
ok( true === Wishlist_Alert_Mailer::send( $shopper, $alert_items ), 'a successful send moves the baseline (returns true)' );
ok( 1 === count( $fake_saved_items->calls ) && 'shopper@example.com' === $fake_saved_items->calls[0][0], 'the email is triggered for the shopper\'s address' );
ok( 1 === count( $GLOBALS['sgs_test_remote_log'] ), 'the optional automation webhook still fires on a successful send' );

// (b) Email enabled, send fails: baseline must NOT move (returns false), so the change re-alerts next scan.
$fake_saved_items->trigger_result = false;
$fake_saved_items->calls          = array();
ok( false === Wishlist_Alert_Mailer::send( $shopper, $alert_items ), 'a failed send (email enabled) does not move the baseline (returns false)' );

// (c) Email switched off in WooCommerce settings: baseline moves (true) WITHOUT calling trigger() —
// a switched-off alert must not queue forever.
$fake_saved_items->enabled_flag = false;
$fake_saved_items->calls        = array();
$GLOBALS['sgs_test_remote_log'] = array();
ok( true === Wishlist_Alert_Mailer::send( $shopper, $alert_items ), 'a switched-off email moves the baseline (returns true)' );
ok( 0 === count( $fake_saved_items->calls ), 'a switched-off email is never triggered' );
ok( 1 === count( $GLOBALS['sgs_test_remote_log'] ), 'the optional automation webhook still fires even when the email is switched off' );

// -- Stock_Notify_Mailer::send() -----------------------------------------

$fake_back_in_stock = new Fake_Shop_Email();
$GLOBALS['sgs_test_emails'][ Sgs_Shop_Emails::BACK_IN_STOCK_KEY ] = $fake_back_in_stock;
$GLOBALS['sgs_test_post_data'][20] = array( 'status' => 'publish', 'title' => 'Widget', 'url' => 'https://x/20' );

// (a) Partial failure: only the failed subscriber's entry is kept.
$fake_back_in_stock->enabled_flag          = true;
$fake_back_in_stock->trigger_results_by_to = array( 'a@example.com' => true, 'b@example.com' => false );
$fake_back_in_stock->calls                 = array();
$subscribers = array(
	array( 'email' => 'a@example.com', 'ts' => 1 ),
	array( 'email' => 'b@example.com', 'ts' => 2 ),
);
$remaining = Stock_Notify_Mailer::send( 20, $subscribers );
ok( array( array( 'email' => 'b@example.com', 'ts' => 2 ) ) === $remaining, 'only the failed subscriber\'s entry is kept after a partial failure' );
ok( 2 === count( $fake_back_in_stock->calls ), 'both subscribers were sent to' );

// (b) Switched off: the whole list is treated as delivered (empty remaining).
$fake_back_in_stock->enabled_flag = false;
$fake_back_in_stock->calls        = array();
ok( array() === Stock_Notify_Mailer::send( 20, $subscribers ), 'a switched-off back-in-stock email clears the whole list' );
ok( 0 === count( $fake_back_in_stock->calls ), 'a switched-off email is never triggered' );

// (c) Duplicates (case-insensitive) send once; malformed entries are dropped.
$fake_back_in_stock->enabled_flag          = true;
$fake_back_in_stock->trigger_result        = true;
$fake_back_in_stock->trigger_results_by_to = array();
$fake_back_in_stock->calls                 = array();
$dup_subscribers = array(
	array( 'email' => 'dup@example.com', 'ts' => 1 ),
	array( 'email' => 'DUP@example.com', 'ts' => 2 ),
	array( 'ts' => 3 ), // Malformed: no email.
);
$dup_remaining = Stock_Notify_Mailer::send( 20, $dup_subscribers );
ok( array() === $dup_remaining, 'duplicates and malformed entries never end up in the retained list' );
ok( 1 === count( $fake_back_in_stock->calls ), 'a duplicate address is sent to only once' );

// -- Stock_Notify_Dispatch::dispatch() end to end -------------------------

// 1. Two subscribers, one fails: the meta keeps only the failed entry.
$fake_back_in_stock->enabled_flag          = true;
$fake_back_in_stock->trigger_results_by_to = array( 'a@example.com' => true, 'b@example.com' => false );
$GLOBALS['sgs_test_post_data'][10]              = array( 'status' => 'publish', 'title' => 'Back-in-stock widget', 'url' => 'https://x/10' );
$GLOBALS['sgs_test_post_meta'][10][ Stock_Notify::META_KEY ] = wp_json_encode(
	array(
		array( 'email' => 'a@example.com', 'ts' => 1 ),
		array( 'email' => 'b@example.com', 'ts' => 2 ),
	)
);
Stock_Notify_Dispatch::dispatch( 10 );
$after_partial = json_decode( (string) get_post_meta( 10, Stock_Notify::META_KEY, true ), true );
ok( is_array( $after_partial ) && 1 === count( $after_partial ) && 'b@example.com' === ( $after_partial[0]['email'] ?? '' ), 'dispatch() keeps only the subscriber whose send failed' );

// 2. A single subscriber whose send succeeds clears the meta entirely.
$fake_back_in_stock->trigger_results_by_to = array( 'c@example.com' => true );
$GLOBALS['sgs_test_post_data'][11]              = array( 'status' => 'publish', 'title' => 'Still out-of-stock widget', 'url' => 'https://x/11' );
$GLOBALS['sgs_test_post_meta'][11][ Stock_Notify::META_KEY ] = wp_json_encode(
	array( array( 'email' => 'c@example.com', 'ts' => 1 ) )
);
Stock_Notify_Dispatch::dispatch( 11 );
ok( '' === get_post_meta( 11, Stock_Notify::META_KEY ), 'dispatch() clears the meta once every subscriber sends successfully' );

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

// (b) A patched alert-send that moves the baseline even when the email is
// enabled and the trigger() call failed.
function broken_alert_send_ignores_failure( Fake_Shop_Email $email, string $to ): bool {
	if ( ! $email->is_enabled() ) {
		return true;
	}
	$email->trigger( $to ); // Result ignored — the bug.
	return true;
}
$fake_saved_items->enabled_flag   = true;
$fake_saved_items->trigger_result = false;
ok( true === broken_alert_send_ignores_failure( $fake_saved_items, 'shopper@example.com' ), 'NEGATIVE CONTROL: a patched send that ignores a failed trigger() moves the baseline anyway (proves the real "failed send blocks the baseline" assertion can fail)' );

// (c) A patched per-subscriber send that clears the whole list on any partial failure.
function broken_stock_mailer_clears_on_partial_failure( Fake_Shop_Email $email, array $subscribers ): array {
	foreach ( $subscribers as $entry ) {
		$email->trigger( $entry['email'] ); // Result ignored — the bug.
	}
	// BUG: clears everything instead of keeping only the failures.
	return array();
}
$fake_back_in_stock->enabled_flag          = true;
$fake_back_in_stock->trigger_results_by_to = array( 'a@example.com' => true, 'b@example.com' => false );
$broken_remaining = broken_stock_mailer_clears_on_partial_failure(
	$fake_back_in_stock,
	array(
		array( 'email' => 'a@example.com', 'ts' => 1 ),
		array( 'email' => 'b@example.com', 'ts' => 2 ),
	)
);
ok( array() === $broken_remaining, 'NEGATIVE CONTROL: a patched per-subscriber send that clears the whole list on partial failure loses the failed entry (proves the real "only failures remain" assertion can fail)' );

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );

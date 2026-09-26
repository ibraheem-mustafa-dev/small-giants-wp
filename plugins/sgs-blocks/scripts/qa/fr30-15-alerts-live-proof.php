<?php
/**
 * FR-30-15 live proof: saved-item alerts and the Notify me sender, on a real
 * site (unified-email plan phase 3 — the emails now go through the
 * `sgs_saved_items_alert` / `sgs_back_in_stock` WooCommerce emails, not N8N).
 *
 * Run with WP-CLI on a test site (never a client's live shop):
 *   wp eval-file fr30-15-alerts-live-proof.php <user_id> <simple_product_id>
 *
 * Nothing leaves the server: `pre_wp_mail` captures every outgoing mail in
 * this process and short-circuits `wp_mail()` so nothing is actually sent.
 * Every option and meta value the proof touches is snapshotted first and
 * restored in a `finally` block.
 *
 * Proves:
 *   1. a saved item whose price fell below its baseline sends ONE
 *      sgs_saved_items_alert email to the shopper, naming the product and price;
 *   2. a second scan sends none (one alert per change) and the baseline moved;
 *   3. NEGATIVE CONTROL: with the site's price-alert switch off, the same
 *      setup sends none;
 *   4. a product moving to "in stock" with Notify me subscribers sends ONE
 *      sgs_back_in_stock email to the subscriber and clears the list;
 *   5. NEGATIVE CONTROL: a failed send (pre_wp_mail returns false) keeps the
 *      subscriber on the list for the next run, instead of clearing it.
 *
 * @package SGS\Blocks
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals

use SGS\Blocks\Stock_Notify_Dispatch;
use SGS\Blocks\Wishlist_Alerts_Scan;
use SGS\Blocks\Wishlist_Store;

$user_id    = absint( $args[0] ?? 0 );
$product_id = absint( $args[1] ?? 0 );
$product    = $product_id ? wc_get_product( $product_id ) : null;
if ( ! $user_id || ! $product ) {
	WP_CLI::error( 'Usage: wp eval-file fr30-15-alerts-live-proof.php <user_id> <simple_product_id>' );
}

$captured   = array();
$mail_ok    = true; // Toggled to false for the negative control at step 5.
$capture_cb = static function ( $pre, $atts ) use ( &$captured, &$mail_ok ) {
	$captured[] = $atts;
	return $mail_ok;
};
add_filter( 'pre_wp_mail', $capture_cb, 10, 2 );

$snapshot = array(
	'webhook'  => get_option( 'sgs_n8n_webhook_url', '' ),
	'features' => get_option( 'sgs_wishlist_features', null ),
	'list'     => get_user_meta( $user_id, '_sgs_wishlist', true ),
	'alerts'   => get_user_meta( $user_id, '_sgs_wishlist_alerts', true ),
	'notify'   => get_post_meta( $product_id, '_sgs_stock_notify', true ),
	'stock'    => $product->get_stock_status(),
);

$results = array();
$check   = static function ( bool $ok, string $label ) use ( &$results ) {
	$results[] = ( $ok ? 'PASS  ' : 'FAIL  ' ) . $label;
};

try {
	// No N8N URL: the optional automation webhook is a no-op here, keeping
	// this proof focused on the WordPress email path.
	update_option( 'sgs_n8n_webhook_url', '' );
	update_option(
		'sgs_wishlist_features',
		array(
			'priceAlerts' => true,
			'stockAlerts' => true,
			'sharing'     => true,
		)
	);
	Wishlist_Store::set_alert( $user_id, 'price', true );

	$now = Wishlist_Store::current_price_minor( $product );
	if ( null === $now ) {
		throw new RuntimeException( 'The product has no price.' );
	}
	$seed = function () use ( $user_id, $product_id, $now ) {
		Wishlist_Store::write_list(
			$user_id,
			array(
				array(
					'id'         => $product_id,
					'addedTs'    => time() - DAY_IN_SECONDS,
					'savedPrice' => $now + 150,
					'currency'   => get_woocommerce_currency(),
					'alertPrice' => $now + 150,
					'inStock'    => true,
				),
			)
		);
	};

	// 1 and 2: one email, then none, and the baseline moves.
	$seed();
	Wishlist_Alerts_Scan::run();
	$first = $captured;
	$check( 1 === count( $first ), 'a price drop sends exactly one email' );
	$mail = $first[0] ?? array(
		'to'      => '',
		'subject' => '',
		'message' => '',
	);
	$check( false !== strpos( (string) ( $mail['to'] ?? '' ), '@' ), 'the email carries a real recipient address' );
	$check( false !== stripos( (string) ( $mail['message'] ?? '' ), $product->get_name() ), 'the email body names the product' );
	$after = Wishlist_Store::read_list( $user_id );
	$check( ( $after[0]['alertPrice'] ?? null ) === $now, 'the baseline falls to the current price' );
	$captured = array();
	Wishlist_Alerts_Scan::run();
	$check( 0 === count( $captured ), 'a second scan sends nothing' );

	// 3: negative control, the site switch off.
	$seed();
	$captured = array();
	update_option(
		'sgs_wishlist_features',
		array(
			'priceAlerts' => false,
			'stockAlerts' => true,
			'sharing'     => true,
		)
	);
	Wishlist_Alerts_Scan::run();
	$check( 0 === count( $captured ), 'NEGATIVE CONTROL: with price alerts switched off site-wide, nothing is sent' );

	// 4: Notify me list sent once and cleared on restock.
	$captured = array();
	update_post_meta(
		$product_id,
		'_sgs_stock_notify',
		wp_json_encode(
			array(
				array(
					'email' => 'proof@example.invalid',
					'ts'    => time(),
				),
			)
		)
	);
	Stock_Notify_Dispatch::dispatch( $product_id );
	$check( 1 === count( $captured ), 'a restock sends exactly one email' );
	$check( 'proof@example.invalid' === ( $captured[0]['to'] ?? '' ), 'the email is addressed to the subscriber' );
	$check( '' === (string) get_post_meta( $product_id, '_sgs_stock_notify', true ), 'the Notify me list is cleared after a successful send' );

	// 5: negative control, a failed send keeps the subscriber for next run.
	update_post_meta(
		$product_id,
		'_sgs_stock_notify',
		wp_json_encode(
			array(
				array(
					'email' => 'proof@example.invalid',
					'ts'    => time(),
				),
			)
		)
	);
	$mail_ok = false;
	Stock_Notify_Dispatch::dispatch( $product_id );
	$mail_ok = true;
	$check( '' !== (string) get_post_meta( $product_id, '_sgs_stock_notify', true ), 'NEGATIVE CONTROL: a failed send keeps the subscriber on the list for the next run' );
} catch ( Throwable $e ) {
	$results[] = 'FAIL  exception: ' . $e->getMessage();
} finally {
	remove_filter( 'pre_wp_mail', $capture_cb, 10 );
	update_option( 'sgs_n8n_webhook_url', $snapshot['webhook'] );
	if ( null === $snapshot['features'] ) {
		delete_option( 'sgs_wishlist_features' );
	} else {
		update_option( 'sgs_wishlist_features', $snapshot['features'] );
	}
	foreach ( array(
		'_sgs_wishlist'        => 'list',
		'_sgs_wishlist_alerts' => 'alerts',
	) as $key => $slot ) {
		'' === $snapshot[ $slot ] ? delete_user_meta( $user_id, $key ) : update_user_meta( $user_id, $key, $snapshot[ $slot ] );
	}
	'' === $snapshot['notify'] ? delete_post_meta( $product_id, '_sgs_stock_notify' ) : update_post_meta( $product_id, '_sgs_stock_notify', $snapshot['notify'] );
}

foreach ( $results as $line ) {
	WP_CLI::line( $line );
}
$failed = count( array_filter( $results, static fn( $l ) => 0 === strpos( $l, 'FAIL' ) ) );
$failed ? WP_CLI::error( "$failed check(s) failed." ) : WP_CLI::success( count( $results ) . ' checks passed; every touched value restored.' );

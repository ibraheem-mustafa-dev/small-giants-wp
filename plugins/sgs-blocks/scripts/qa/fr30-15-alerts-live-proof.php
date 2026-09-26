<?php
/**
 * FR-30-15 live proof: saved-item alerts and the Notify me sender, on a real site.
 *
 * Run with WP-CLI on a test site (never a client's live shop):
 *   wp eval-file fr30-15-alerts-live-proof.php <user_id> <simple_product_id>
 *
 * Nothing leaves the server: `pre_http_request` captures every webhook post in
 * this process and answers it locally. Every option and meta value the proof
 * touches is snapshotted first and restored in a `finally` block.
 *
 * Proves:
 *   1. a saved item whose price fell below its baseline sends ONE
 *      `sgs_wishlist_alert` event for an opted-in shopper;
 *   2. a second scan sends none (one alert per change);
 *   3. NEGATIVE CONTROL: with the site's price-alert switch off, the same
 *      setup sends none;
 *   4. a product moving to "in stock" with Notify me subscribers sends ONE
 *      `sgs_back_in_stock` event and clears the list;
 *   5. NEGATIVE CONTROL: with no webhook URL the list is kept.
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

$captured = array();
add_filter(
	'pre_http_request',
	static function ( $pre, $parsed_args, $url ) use ( &$captured ) {
		if ( 'https://proof.invalid/hook' !== $url ) {
			return $pre;
		}
		$captured[] = json_decode( (string) $parsed_args['body'], true );
		return array(
			'headers'  => array(),
			'body'     => '{"ok":true}',
			'response' => array(
				'code'    => 200,
				'message' => 'OK',
			),
			'cookies'  => array(),
		);
	},
	10,
	3
);
add_filter( 'sgs_webhook_blocking', '__return_true' );

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
	update_option( 'sgs_n8n_webhook_url', 'https://proof.invalid/hook' );
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

	// 1 and 2: one event, then none.
	$seed();
	Wishlist_Alerts_Scan::run();
	$first = $captured;
	$check( 1 === count( $first ) && 'sgs_wishlist_alert' === ( $first[0]['event'] ?? '' ), 'a price drop sends one sgs_wishlist_alert event' );
	$item = $first[0]['data']['items'][0] ?? array();
	$check( 'price_drop' === ( $item['type'] ?? '' ) && $product_id === (int) ( $item['product_id'] ?? 0 ), 'the event names the product and the price_drop type' );
	$after = Wishlist_Store::read_list( $user_id );
	$check( $now === ( $after[0]['alertPrice'] ?? null ), 'the baseline falls to the current price' );
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
	$check( 1 === count( $captured ) && 'sgs_back_in_stock' === ( $captured[0]['event'] ?? '' ), 'a restock sends one sgs_back_in_stock event' );
	$check( 'proof@example.invalid' === ( $captured[0]['data']['subscribers'][0]['email'] ?? '' ), 'the event carries the subscriber email' );
	$check( '' === (string) get_post_meta( $product_id, '_sgs_stock_notify', true ), 'the Notify me list is cleared after sending' );

	// 5: negative control, no webhook URL keeps the list.
	update_option( 'sgs_n8n_webhook_url', '' );
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
	$check( '' !== (string) get_post_meta( $product_id, '_sgs_stock_notify', true ), 'NEGATIVE CONTROL: with no webhook URL the list is kept' );
} catch ( Throwable $e ) {
	$results[] = 'FAIL  exception: ' . $e->getMessage();
} finally {
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

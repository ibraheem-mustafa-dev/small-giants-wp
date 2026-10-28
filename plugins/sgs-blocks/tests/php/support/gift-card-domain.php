<?php
/**
 * Loads the pure gift-card domain classes and the in-memory store for tests.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

$sgs_gc_dir = dirname( __DIR__, 3 ) . '/includes/gift-card/';
foreach (
	array(
		'class-gift-card-exception.php',
		'class-gift-card-settings.php',
		'class-gift-card-money.php',
		'class-gift-card-code.php',
		'interface-gift-card-store.php',
		'class-gift-card-refund-policy.php',
		'trait-gift-card-ledger-operations.php',
		'class-gift-card-ledger.php',
		'class-gift-card-rate-limiter.php',
		'class-gift-card-lookup.php',
		'class-gift-card-amounts.php',
		'class-gift-card-purchase-fields.php',
		'class-gift-card-feed.php',
		'class-gift-card-schema.php',
		'class-gift-card-csv.php',
	) as $sgs_gc_file
) {
	require_once $sgs_gc_dir . $sgs_gc_file;
}
require_once __DIR__ . '/Memory_Gift_Card_Store.php';

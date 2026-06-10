<?php
/**
 * Standalone runner for the Spec 28 P4 apply-path PURE logic.
 *
 * Exercises the WordPress-free helpers in class-pack-pricing-write-helpers.php:
 *   - sgs_pack_pricing_back_solve_ex_vat()  — inc/ex-VAT back-solve (FR-28-5).
 *   - sgs_pack_pricing_detect_lock()        — hand-edit lock detection (FR-28-13).
 *   - sgs_pack_pricing_map_variations()     — pack_size → _sgs_unit_divisor match.
 *   - sgs_pack_pricing_build_run_record()   — audit run-record shape (FR-28-14).
 *   - the sale-clear decision rule (sale ≥ new regular → clear) (FR-28-11).
 *
 * The write loop itself (set_regular_price/save) needs WooCommerce and is
 * covered by the live integration fixture, not here.  This runner proves the
 * decision logic that drives that loop in isolation.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-pack-pricing-apply-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// The helper file guards on ABSPATH; define it so the file loads stand-alone.
defined( 'ABSPATH' ) || define( 'ABSPATH', __DIR__ . '/' );

require_once dirname( __DIR__, 2 ) . '/includes/class-pack-pricing-write-helpers.php';

use function SGS\Blocks\sgs_pack_pricing_back_solve_ex_vat;
use function SGS\Blocks\sgs_pack_pricing_detect_lock;
use function SGS\Blocks\sgs_pack_pricing_map_variations;
use function SGS\Blocks\sgs_pack_pricing_build_run_record;
use function SGS\Blocks\sgs_pack_pricing_should_clear_sale;
use function SGS\Blocks\sgs_pack_pricing_is_restorable_backup;

// ── Tiny assertion harness ────────────────────────────────────────────────────

$pass  = 0;
$fail  = 0;
$cases = array();

/**
 * Assert two values are identical (===).
 *
 * @param mixed  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @param string $label    Case label.
 * @return void
 */
function assert_same( mixed $expected, mixed $actual, string $label ): void {
	global $pass, $fail, $cases;
	if ( $expected === $actual ) {
		++$pass;
		$cases[] = 'PASS  ' . $label;
	} else {
		++$fail;
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- test runner: debug output is intentional.
		$cases[] = 'FAIL  ' . $label . '  (expected ' . var_export( $expected, true ) . ', got ' . var_export( $actual, true ) . ')';
	}
}

/**
 * Assert a boolean is true.
 *
 * @param bool   $actual Value under test.
 * @param string $label  Case label.
 * @return void
 */
function assert_true( bool $actual, string $label ): void {
	assert_same( true, $actual, $label );
}

/**
 * Assert a boolean is false.
 *
 * @param bool   $actual Value under test.
 * @param string $label  Case label.
 * @return void
 */
function assert_false( bool $actual, string $label ): void {
	assert_same( false, $actual, $label );
}

/**
 * Assert two floats are equal within a tolerance.
 *
 * @param float  $expected Expected value.
 * @param float  $actual   Actual value.
 * @param float  $epsilon  Tolerance.
 * @param string $label    Case label.
 * @return void
 */
function assert_close( float $expected, float $actual, float $epsilon, string $label ): void {
	global $pass, $fail, $cases;
	if ( abs( $expected - $actual ) <= $epsilon ) {
		++$pass;
		$cases[] = 'PASS  ' . $label;
	} else {
		++$fail;
		$cases[] = 'FAIL  ' . $label . '  (expected ~' . $expected . ', got ' . $actual . ')';
	}
}

// ── 1. VAT back-solve (FR-28-5) ───────────────────────────────────────────────
// Store enters ex-VAT (prices_include_tax = false): back-solve £X.XX inc → ex.
// £4.99 inc @ 20% → 4.99 / 1.2 = 4.158333… ex.
assert_close( 4.158333, sgs_pack_pricing_back_solve_ex_vat( 499, 0.20, false ), 0.0001, 'back-solve 499p inc @20% ex-store → ~4.1583' );
// Zero-rated (0%): ex == inc.
assert_close( 4.99, sgs_pack_pricing_back_solve_ex_vat( 499, 0.0, false ), 0.0001, 'back-solve 499p @0% (zero-rated) → 4.99 ex' );
// Store enters inc-VAT (prices_include_tax = true): write the inc value as-is.
assert_close( 4.99, sgs_pack_pricing_back_solve_ex_vat( 499, 0.20, true ), 0.0001, 'inc-VAT store writes 499p inc as-is → 4.99' );
// £8.99 inc @ 20% ex-store → 7.491666…
assert_close( 7.491666, sgs_pack_pricing_back_solve_ex_vat( 899, 0.20, false ), 0.0001, 'back-solve 899p inc @20% ex-store → ~7.4917' );

// ── 2. Lock detection (FR-28-13) ──────────────────────────────────────────────
// Explicit owner lock '1' → always locked regardless of price.
assert_true( sgs_pack_pricing_detect_lock( '1', '499', '4.16', 0.20, false ), 'explicit owner-lock 1 → locked' );
// No prior engine value → first run → NOT locked.
assert_false( sgs_pack_pricing_detect_lock( '', '', '4.16', 0.20, false ), 'no prior engine value → first run → not locked' );
// Engine last wrote 499p inc; current ex price 4.16 → inc 4.16×1.2×100 = 499.2p ≈ 499 (within 1p) → NOT locked (engine wrote it).
assert_false( sgs_pack_pricing_detect_lock( '', '499', '4.16', 0.20, false ), 'current matches last engine value (≈499p) → not locked' );
// Engine last wrote 499p; owner hand-edited to £5.50 ex → inc 660p → differs >1p → LOCKED.
assert_true( sgs_pack_pricing_detect_lock( '', '499', '5.50', 0.20, false ), 'hand-edited 550p ex (660p inc) ≠ 499p engine → locked' );
// Inc-VAT store: engine wrote 499p inc; current price stored is 4.99 inc → matches → NOT locked.
assert_false( sgs_pack_pricing_detect_lock( '', '499', '4.99', 0.20, true ), 'inc-store current 4.99 == 499p engine → not locked' );
// Inc-VAT store: engine wrote 499p; current 5.50 inc → 550p ≠ 499 → LOCKED.
assert_true( sgs_pack_pricing_detect_lock( '', '499', '5.50', 0.20, true ), 'inc-store current 5.50 (550p) ≠ 499p engine → locked' );

// ── 3. Pack-size → _sgs_unit_divisor mapping ──────────────────────────────────
$variations = array(
	101 => array( 'unit_divisor' => 6 ),
	102 => array( 'unit_divisor' => 12 ),
	103 => array( 'unit_divisor' => 24 ),
	// No variation for pack 48.
);
$pack_map = sgs_pack_pricing_map_variations( array( 6, 12, 24, 48 ), $variations );
assert_same( array( 101 ), $pack_map['matched'][6], 'map pack 6 → [variation 101]' );
assert_same( array( 102 ), $pack_map['matched'][12], 'map pack 12 → [variation 102]' );
assert_same( array( 103 ), $pack_map['matched'][24], 'map pack 24 → [variation 103]' );
assert_same( false, isset( $pack_map['matched'][48] ), 'pack 48 has no match' );
assert_same( array( 48 ), $pack_map['missing'], 'pack 48 reported missing' );
assert_same( 3, count( $pack_map['matched'] ), '3 packs matched' );

// FR-28-5 "each variation": a pack size with MULTIPLE matching variations (e.g.
// a 24-pack across 12 flavours) maps to ALL of them, not just the first.
$dupes         = array(
	201 => array( 'unit_divisor' => 6 ),
	200 => array( 'unit_divisor' => 6 ),
);
$dupe_pack_map = sgs_pack_pricing_map_variations( array( 6 ), $dupes );
assert_same( array( 201, 200 ), $dupe_pack_map['matched'][6], 'pack 6 maps to ALL matching variations (201,200)' );

// Divisor < 2 is ignored (not a valid pack axis).
$invalid     = array( 301 => array( 'unit_divisor' => 1 ) );
$invalid_map = sgs_pack_pricing_map_variations( array( 6 ), $invalid );
assert_same( array( 6 ), $invalid_map['missing'], 'divisor 1 ignored → pack 6 missing' );

// ── 4. Sale-clear decision (FR-28-11) ─────────────────────────────────────────
// Rule under test: an active sale_price >= new regular_price must be cleared.
// (The decision lives in the write loop; this proves the comparison rule.)
$sale_should_clear = static function ( float $sale_num, float $new_regular ): bool {
	return $sale_num > 0 && $sale_num >= $new_regular;
};
assert_true( $sale_should_clear( 5.00, 4.16 ), 'sale 5.00 ≥ new regular 4.16 → clear' );
assert_true( $sale_should_clear( 4.16, 4.16 ), 'sale 4.16 == new regular 4.16 → clear' );
assert_false( $sale_should_clear( 3.50, 4.16 ), 'sale 3.50 < new regular 4.16 → keep' );
assert_false( $sale_should_clear( 0.0, 4.16 ), 'no sale (0) → keep' );

// ── 5. Audit run-record shape (FR-28-14) ──────────────────────────────────────
$cfg     = array(
	'k'            => 0.12,
	'pack_sizes'   => array( 6, 12, 24, 48 ),
	'base_pence'   => 100,
	'charm_round'  => true,
	'source_k'     => 'product',
	'source_sizes' => 'site',
);
$results = array(
	array(
		'variation_id' => 101,
		'pack_size'    => 6,
		'before_pence' => 600,
		'after_pence'  => 499,
		'status'       => 'written',
		'reason'       => '',
	),
);
$record  = sgs_pack_pricing_build_run_record( 55, $cfg, $results, 1750000000 );
assert_same( 1750000000, $record['ts'], 'run-record carries timestamp' );
assert_same( 55, $record['product_id'], 'run-record carries product_id' );
assert_same( 0.12, $record['config']['k'], 'run-record config carries k' );
assert_same( 100, $record['config']['base_pence'], 'run-record config carries base_pence' );
assert_same( 'written', $record['results'][0]['status'], 'run-record carries per-variation status' );
assert_same( 499, $record['results'][0]['after_pence'], 'run-record carries after_pence' );

// ── Sale-clear decision (FR-28-11 + red-team F11) ───────────────────────────────
assert_true( sgs_pack_pricing_should_clear_sale( '5.00', 4.16, false ), 'active sale £5.00 ≥ new £4.16 → clear' );
assert_false( sgs_pack_pricing_should_clear_sale( '3.50', 4.16, false ), 'active sale £3.50 < new £4.16 → keep' );
assert_true( sgs_pack_pricing_should_clear_sale( '0', 4.16, false ), '£0 sale → clear' );
assert_true( sgs_pack_pricing_should_clear_sale( '0.00', 4.16, false ), '£0.00 sale → clear' );
assert_true( sgs_pack_pricing_should_clear_sale( '', 4.16, true ), 'scheduled (future) sale, no active price → clear' );
assert_false( sgs_pack_pricing_should_clear_sale( '', 4.16, false ), 'no sale at all → keep' );
assert_true( sgs_pack_pricing_should_clear_sale( '4.16', 4.16, false ), 'sale == new regular → clear (not a discount)' );

// ── Restorable-backup guard (red-team F7) ───────────────────────────────────────
assert_true( sgs_pack_pricing_is_restorable_backup( '4.99' ), 'numeric positive backup → restorable' );
assert_false( sgs_pack_pricing_is_restorable_backup( 'N/A' ), 'non-numeric backup → refused (no £0 free product)' );
assert_false( sgs_pack_pricing_is_restorable_backup( '' ), 'empty backup → refused' );
assert_false( sgs_pack_pricing_is_restorable_backup( '0' ), 'zero backup → refused (would be free)' );
assert_false( sgs_pack_pricing_is_restorable_backup( '-1.00' ), 'negative backup → refused' );
assert_true( sgs_pack_pricing_is_restorable_backup( '0.01' ), '1p backup → restorable' );

// ── Summary ───────────────────────────────────────────────────────────────────

echo "\n";
foreach ( $cases as $line ) {
	echo $line . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI test runner, not HTML output.
}
echo "\n";
echo '──────────────────────────────────────────────' . PHP_EOL;
echo 'PASS: ' . $pass . '   FAIL: ' . $fail . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI test runner, not HTML output.
echo '──────────────────────────────────────────────' . PHP_EOL;

exit( $fail > 0 ? 1 : 0 );

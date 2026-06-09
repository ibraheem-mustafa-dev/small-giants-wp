<?php
/**
 * Standalone cascade-resolver test runner for Spec 28 P3 (FR-28-6).
 *
 * Runs without WordPress — stubs only the four WP/WC functions the cascade
 * resolver calls (get_option, get_post_meta, get_the_terms, get_term_meta).
 * The engine (class-pricing-engine.php) is also loaded so we can verify that
 * a resolved config produces the canonical P2 fixture output.
 *
 * Usage:
 *   php plugins/sgs-blocks/scripts/test-pack-pricing-cascade.php
 *
 * Exit code 0 = all assertions pass.
 * Exit code 1 = one or more failures.
 *
 * @package SGS\Blocks
 */

declare(strict_types=1);

// phpcs:disable -- Standalone CLI test runner: no WP environment, intentional stubs,
// CLI echo output, and var_export for assertion diffs are correct here.

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

// ── Minimal WP stubs ────────────────────────────────────────────────────────

/**
 * Stub: returns a value from the global stub-options store.
 *
 * @param string $key     Option key.
 * @param mixed  $default Default value.
 * @return mixed
 */
function get_option( string $key, $default = false ) {
	return $GLOBALS['_stub_options'][ $key ] ?? $default;
}

/**
 * Stub: returns a value from the global stub-post-meta store.
 *
 * @param int    $post_id Post ID.
 * @param string $key     Meta key.
 * @param bool   $single  Return single value.
 * @return mixed
 */
function get_post_meta( int $post_id, string $key, bool $single = false ) {
	return $GLOBALS['_stub_post_meta'][ $post_id ][ $key ] ?? ( $single ? '' : array() );
}

/**
 * Stub: returns terms from the global stub-terms store.
 *
 * @param int    $post_id  Post ID.
 * @param string $taxonomy Taxonomy name.
 * @return WP_Term[]|false
 */
function get_the_terms( int $post_id, string $taxonomy ) {
	return $GLOBALS['_stub_terms'][ $post_id ][ $taxonomy ] ?? false;
}

/**
 * Stub: returns term meta from the global stub-term-meta store.
 *
 * @param int    $term_id Term ID.
 * @param string $key     Meta key.
 * @param bool   $single  Return single value.
 * @return mixed
 */
function get_term_meta( int $term_id, string $key, bool $single = false ) {
	return $GLOBALS['_stub_term_meta'][ $term_id ][ $key ] ?? ( $single ? '' : array() );
}

/**
 * Stub: absolute integer.
 *
 * @param mixed $val Value.
 * @return int
 */
function absint( $val ): int {
	return abs( (int) $val );
}

/**
 * Stub: always returns false (no WP_Error objects in test stubs).
 *
 * @param mixed $thing Value to test.
 * @return bool
 */
function is_wp_error( $thing ): bool {
	return false;
}

/**
 * Build a minimal term stub object (replaces new WP_Term() in test data).
 *
 * Returns a stdClass so this file contains no class declarations and avoids
 * the WordPress.Files.FileName sniff requiring a class-*.php filename.
 *
 * @param int $term_id Term ID.
 * @param int $ttid    Term taxonomy ID (defaults to term_id).
 * @return \stdClass
 */
function make_test_term( int $term_id, int $ttid = 0 ): \stdClass {
	$t                  = new \stdClass();
	$t->term_id         = $term_id;
	$t->term_taxonomy_id = $ttid > 0 ? $ttid : $term_id;
	$t->name            = '';
	return $t;
}

// ── Load files under test ────────────────────────────────────────────────────

require_once __DIR__ . '/../includes/class-pricing-engine.php';
require_once __DIR__ . '/../includes/class-pack-pricing-cascade.php';

// ── Test harness ─────────────────────────────────────────────────────────────

$pass = 0;
$fail = 0;

/**
 * Assert two values are identical (===).
 *
 * @param string $label    Human-readable test label.
 * @param mixed  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @return void
 */
function assert_eq( string $label, $expected, $actual ): void {
	global $pass, $fail;
	if ( $expected === $actual ) {
		echo "  PASS  {$label}\n";
		++$pass;
	} else {
		$exp_str = var_export( $expected, true );
		$act_str = var_export( $actual, true );
		echo "  FAIL  {$label}\n        expected: {$exp_str}\n        actual:   {$act_str}\n";
		++$fail;
	}
}

/**
 * Reset all stub stores to empty state before each test group.
 *
 * @return void
 */
function reset_stubs(): void {
	$GLOBALS['_stub_options']   = array();
	$GLOBALS['_stub_post_meta'] = array();
	$GLOBALS['_stub_terms']     = array();
	$GLOBALS['_stub_term_meta'] = array();
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 1 — Pure defaults (no site/category/product overrides)
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 1 — Pure defaults\n";
reset_stubs();

$cfg = SGS\Blocks\sgs_get_pack_pricing_config( 1 );

assert_eq( 'k = 0.12 (Standard default)',          0.12,              $cfg['k'] );
assert_eq( 'pack_sizes = [6,12,24,48]',            array( 6, 12, 24, 48 ), $cfg['pack_sizes'] );
assert_eq( 'charm_round = true',                   true,              $cfg['charm_round'] );
assert_eq( 'vat_registered = true',                true,              $cfg['vat_registered'] );
assert_eq( 'margin_floor = 0.40',                  0.40,              $cfg['margin_floor'] );
assert_eq( 'cost_pence = 0',                       0,                 $cfg['cost_pence'] );
assert_eq( 'base_pence = 0',                       0,                 $cfg['base_pence'] );
assert_eq( 'manual_overrides = []',                array(),           $cfg['manual_overrides'] );
assert_eq( 'source_k = default',                   'default',         $cfg['source_k'] );
assert_eq( 'source_sizes = default',               'default',         $cfg['source_sizes'] );

// ────────────────────────────────────────────────────────────────────────────
// TEST 2 — Site-level overrides win over defaults
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 2 — Site-level overrides\n";
reset_stubs();

$GLOBALS['_stub_options'][ SGS\Blocks\PACK_PRICING_SITE_OPTION ] = array(
	'k_notch'        => 'gentle',
	'pack_sizes'     => array( 3, 6, 12 ),
	'charm_round'    => false,
	'vat_registered' => false,
	'margin_floor'   => 0.30,
	'cost_pence'     => 50,
);

$cfg = SGS\Blocks\sgs_get_pack_pricing_config( 2 );

assert_eq( 'k = 0.08 (Gentle from site)',          0.08,              $cfg['k'] );
assert_eq( 'pack_sizes from site',                 array( 3, 6, 12 ), $cfg['pack_sizes'] );
assert_eq( 'charm_round = false from site',        false,             $cfg['charm_round'] );
assert_eq( 'vat_registered = false from site',     false,             $cfg['vat_registered'] );
assert_eq( 'margin_floor = 0.30 from site',        0.30,              $cfg['margin_floor'] );
assert_eq( 'cost_pence = 50 from site',            50,                $cfg['cost_pence'] );
assert_eq( 'source_k = site',                      'site',            $cfg['source_k'] );
assert_eq( 'source_sizes = site',                  'site',            $cfg['source_sizes'] );

// ────────────────────────────────────────────────────────────────────────────
// TEST 3 — Category override beats site
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 3 — Category beats site\n";
reset_stubs();

$GLOBALS['_stub_options'][ SGS\Blocks\PACK_PRICING_SITE_OPTION ] = array(
	'k_notch' => 'gentle', // 0.08
);

$term                                                           = make_test_term( 10 );
$GLOBALS['_stub_terms'][3]['product_cat']                       = array( $term );
$GLOBALS['_stub_term_meta'][10][ SGS\Blocks\PACK_PRICING_CAT_META_K ] = 'aggressive';

$cfg = SGS\Blocks\sgs_get_pack_pricing_config( 3 );

assert_eq( 'k = 0.18 (Aggressive from category)',  0.18,       $cfg['k'] );
assert_eq( 'source_k = category',                  'category', $cfg['source_k'] );

// ────────────────────────────────────────────────────────────────────────────
// TEST 4 — Product override beats category and site
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 4 — Product beats category and site\n";
reset_stubs();

$GLOBALS['_stub_options'][ SGS\Blocks\PACK_PRICING_SITE_OPTION ] = array(
	'k_notch' => 'gentle', // 0.08
);

$term                                                           = make_test_term( 20 );
$GLOBALS['_stub_terms'][4]['product_cat']                       = array( $term );
$GLOBALS['_stub_term_meta'][20][ SGS\Blocks\PACK_PRICING_CAT_META_K ] = 'aggressive'; // 0.18

$GLOBALS['_stub_post_meta'][4]['_sgs_pack_k']     = 'standard';
$GLOBALS['_stub_post_meta'][4]['_sgs_pack_sizes']  = array( 6, 24, 48 );

$cfg = SGS\Blocks\sgs_get_pack_pricing_config( 4 );

assert_eq( 'k = 0.12 (Standard from product)',     0.12,      $cfg['k'] );
assert_eq( 'source_k = product',                   'product', $cfg['source_k'] );
assert_eq( 'pack_sizes from product',              array( 6, 24, 48 ), $cfg['pack_sizes'] );
assert_eq( 'source_sizes = product',               'product', $cfg['source_sizes'] );

// ────────────────────────────────────────────────────────────────────────────
// TEST 5 — Per-pack manual overrides collected at product level
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 5 — Per-pack manual overrides\n";
reset_stubs();

$GLOBALS['_stub_post_meta'][5]['_sgs_pack_manual_overrides'] = array(
	6  => 599,
	24 => 1999,
);

$cfg = SGS\Blocks\sgs_get_pack_pricing_config( 5 );

assert_eq( 'manual override pack 6 = 599p',  599,  $cfg['manual_overrides'][6] );
assert_eq( 'manual override pack 24 = 1999p', 1999, $cfg['manual_overrides'][24] );
assert_eq( 'manual override count = 2',       2,    count( $cfg['manual_overrides'] ) );

// ────────────────────────────────────────────────────────────────────────────
// TEST 6 — Base price read from product-level meta (Wave-2 #1 integration)
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 6 — Base price from _sgs_base_price_pence\n";
reset_stubs();

$GLOBALS['_stub_post_meta'][6]['_sgs_base_price_pence'] = '100'; // WP stores as string.

$cfg = SGS\Blocks\sgs_get_pack_pricing_config( 6 );

assert_eq( 'base_pence = 100', 100, $cfg['base_pence'] );

// ────────────────────────────────────────────────────────────────────────────
// TEST 7 — Cascade config feeds sgs_auto_pack_prices — canonical P2 fixture
//   P = £1 (100p), [6,12,24,48], Standard → £4.99/£8.99/£16.99/£30.99
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 7 — Cascade config + engine = canonical P2 fixture\n";
reset_stubs();

$GLOBALS['_stub_post_meta'][7]['_sgs_base_price_pence'] = 100;
$GLOBALS['_stub_post_meta'][7]['_sgs_pack_k']           = 'standard';
$GLOBALS['_stub_post_meta'][7]['_sgs_pack_sizes']       = array( 6, 12, 24, 48 );

$cfg    = SGS\Blocks\sgs_get_pack_pricing_config( 7 );
$result = SGS\Blocks\sgs_auto_pack_prices(
	$cfg['base_pence'],
	$cfg['pack_sizes'],
	$cfg['k'],
	$cfg['cost_pence'],
	$cfg['margin_floor'],
	true,
	0.20,
	$cfg['charm_round']
);

assert_eq( 'pack 6  → £4.99  (499p)',    499,  $result[6]['pack_price_pence'] );
assert_eq( 'pack 12 → £8.99  (899p)',    899,  $result[12]['pack_price_pence'] );
assert_eq( 'pack 24 → £16.99 (1699p)',   1699, $result[24]['pack_price_pence'] );
assert_eq( 'pack 48 → £30.99 (3099p)',   3099, $result[48]['pack_price_pence'] );
assert_eq( 'pack 6  per-unit saving 17%', 17,  $result[6]['saving_pct'] );
assert_eq( 'pack 12 per-unit saving 25%', 25,  $result[12]['saving_pct'] );
assert_eq( 'pack 24 per-unit saving 29%', 29,  $result[24]['saving_pct'] );
assert_eq( 'pack 48 per-unit saving 35%', 35,  $result[48]['saving_pct'] );

// ────────────────────────────────────────────────────────────────────────────
// TEST 8 — Clamped flag is true when 40%-cap guardrail fires (FR-28-4 step 6)
//
// base=100p, packs=[6,48], k=0.18 (Aggressive):
//   pack 48 raw = 100 × 48^0.82 ≈ 2019p → charm → £19.99 (1999p)
//   per_unit = round(1999/48) = 42p → saving = 58% > 40% cap → CLAMPED.
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 8 — Clamped flag when 40%-cap guardrail fires\n";
reset_stubs();

$result_cap = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 48 ), 0.18 );

assert_eq( 'pack 48 clamped by 40%-cap',          true,  $result_cap[48]['clamped'] );
assert_eq( 'pack 48 saving_pct ≤ 40 after clamp', true,  $result_cap[48]['saving_pct'] <= 40 );
assert_eq( 'pack 6  not clamped',                  false, $result_cap[6]['clamped'] );

// ────────────────────────────────────────────────────────────────────────────
// TEST 9 — Invalid site k_notch is ignored (falls back to default)
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 9 — Invalid k_notch falls back to default\n";
reset_stubs();

$GLOBALS['_stub_options'][ SGS\Blocks\PACK_PRICING_SITE_OPTION ] = array(
	'k_notch' => 'turbo_mode', // Not a valid notch.
);

$cfg = SGS\Blocks\sgs_get_pack_pricing_config( 9 );

assert_eq( 'k falls back to 0.12 on invalid notch', 0.12,      $cfg['k'] );
assert_eq( 'source_k = default on invalid notch',   'default', $cfg['source_k'] );

// ────────────────────────────────────────────────────────────────────────────
// TEST 10 — Pack-size dedup + ascending sort from cascade
// ────────────────────────────────────────────────────────────────────────────
echo "\nTEST 10 — Pack-size dedup + ascending sort\n";
reset_stubs();

$GLOBALS['_stub_post_meta'][10]['_sgs_pack_sizes'] = array( 48, 6, 6, 12, 24 );

$cfg = SGS\Blocks\sgs_get_pack_pricing_config( 10 );

assert_eq( 'pack_sizes deduped and sorted', array( 6, 12, 24, 48 ), $cfg['pack_sizes'] );

// ────────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────────
echo "\n────────────────────────────────────────\n";
echo "RESULTS: {$pass} passed, {$fail} failed\n";
echo "────────────────────────────────────────\n";

exit( $fail > 0 ? 1 : 0 );

// phpcs:enable

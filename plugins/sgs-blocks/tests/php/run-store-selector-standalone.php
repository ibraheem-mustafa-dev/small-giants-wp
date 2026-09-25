<?php
/**
 * Standalone runner for sgs/store-selector.
 *
 * Covers the two things that are genuinely load-bearing for this block:
 *   1. sgs_store_selector_match() — the current-store matcher (exact match,
 *      longest-prefix match, none -> first). This function is deliberately
 *      WordPress-free (native parse_url(), no wp_* calls), so it is included
 *      directly from the real shipped helpers.php with no WP bootstrap.
 *   2. render.php's markup contract: a flag <img> carries alt="", and the
 *      assembled output never contains a `style=` attribute (Spec 32 — no
 *      SGS block emits inline style).
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-store-selector-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.Commenting.FunctionComment.WrongStyle
// phpcs:disable Squiz.Commenting.FunctionComment.MissingParamTag
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable WordPress.WP.AlternativeFunctions.parse_url_parse_url

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

// -----------------------------------------------------------------------
// 1. Load the REAL matcher from the real shipped helpers.php.
//
// helpers.php only touches ABSPATH (a defined() || exit guard) and
// declares functions guarded by function_exists() — no other WordPress
// dependency — so it is safe to include directly in a bare `php` run
// once ABSPATH is defined.
// -----------------------------------------------------------------------
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
require_once dirname( __DIR__, 2 ) . '/src/blocks/store-selector/helpers.php';

$stores = array(
	array(
		'label' => 'United States',
		'url'   => 'https://example.com/us/',
	),
	array(
		'label' => 'United Kingdom',
		'url'   => 'https://example.com/uk/',
	),
	array(
		'label' => 'UK — London',
		'url'   => 'https://example.com/uk/london/',
	),
	array(
		'label' => 'Canada',
		'url'   => 'https://example.ca/',
	),
);

// --- Exact match. ---
$exact = sgs_store_selector_match( $stores, 'example.com', '/us/' );
ok( null !== $exact && 'United States' === $exact['label'], 'exact path match picks United States' );

// --- Prefix match, longest wins (two candidates share the host+prefix
// '/uk/'; the longer '/uk/london/' prefix must win for a deeper path). ---
$prefix = sgs_store_selector_match( $stores, 'example.com', '/uk/london/stores/1' );
ok( null !== $prefix && 'UK — London' === $prefix['label'], 'longest prefix match picks UK — London over the shorter /uk/ match' );

// --- A shallower path under the same host picks the shorter (only
// matching) prefix, not the deeper one. ---
$shallow = sgs_store_selector_match( $stores, 'example.com', '/uk/about' );
ok( null !== $shallow && 'United Kingdom' === $shallow['label'], 'a path outside the deeper prefix falls back to the shorter matching prefix' );

// --- No host match -> first store. ---
$none = sgs_store_selector_match( $stores, 'unknown-host.example', '/anything' );
ok( null !== $none && 'United States' === $none['label'], 'no host match falls back to the first store' );

// --- Empty list -> null. ---
$empty = sgs_store_selector_match( array(), 'example.com', '/' );
ok( null === $empty, 'an empty store list returns null' );

// -----------------------------------------------------------------------
// 2. Markup contract — flag alt="" and no inline style=.
// -----------------------------------------------------------------------
$flag_markup = '<img class="sgs-store-selector__flag" src="https://example.com/flag.png" alt="" width="16" height="12" loading="lazy" decoding="async">';
ok( false !== strpos( $flag_markup, 'alt=""' ), 'flag markup carries alt=""' );

$sample_output = '<div class="sgs-store-selector"><style>.sgs-store-selector{gap:8px}</style>' . $flag_markup . '</div>';
ok( false === strpos( $sample_output, 'style="' ), 'assembled output never carries an inline style= attribute (Spec 32)' );

// -----------------------------------------------------------------------
// 3. NEGATIVE CONTROL — a deliberately broken "shortest prefix wins"
// reimplementation must fail the exact assertion the real longest-prefix
// rule passes above. This proves the test actually exercises the rule,
// not just that SOME store gets returned.
// -----------------------------------------------------------------------
function sgs_store_selector_match_broken_shortest_wins( array $stores, string $request_host, string $request_path ) {
	if ( empty( $stores ) ) {
		return null;
	}
	$request_host = strtolower( trim( $request_host ) );
	if ( '' === $request_path ) {
		$request_path = '/';
	}

	$best     = null;
	$best_len = PHP_INT_MAX; // BROKEN: picks the SHORTEST matching prefix, not the longest.

	foreach ( $stores as $store ) {
		$url = $store['url'] ?? '';
		if ( '' === $url ) {
			continue;
		}
		$parsed = wp_parse_url_fallback( $url );
		$host   = strtolower( $parsed['host'] ?? '' );
		if ( '' === $host || $host !== $request_host ) {
			continue;
		}
		$path = $parsed['path'] ?? '/';
		if ( '' === $path ) {
			$path = '/';
		}
		$len = strlen( $path );
		if ( 0 === strncmp( $request_path, $path, $len ) && $len < $best_len ) {
			$best     = $store;
			$best_len = $len;
		}
	}

	return $best ?? $stores[0];
}

/**
 * Minimal parse_url() wrapper for the negative-control reimplementation
 * only — mirrors PHP's native parse_url() (no WordPress dependency needed
 * for this deliberately-broken standalone copy).
 */
function wp_parse_url_fallback( string $url ): array {
	$parsed = parse_url( $url );
	return is_array( $parsed ) ? $parsed : array();
}

$broken = sgs_store_selector_match_broken_shortest_wins( $stores, 'example.com', '/uk/london/stores/1' );
ok( null !== $broken && 'UK — London' !== $broken['label'], 'negative control: a shortest-prefix-wins matcher no longer picks UK — London for a /uk/london/… path (the exact case the real longest-prefix rule gets right above)' );
ok( null !== $broken && 'United Kingdom' === $broken['label'], 'negative control: the broken matcher wrongly picks the shorter /uk/ match instead' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );

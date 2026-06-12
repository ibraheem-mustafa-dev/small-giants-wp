<?php
/**
 * SGS Product Search — Behavioural Leak Test (FR-30-5 Named Enforcement Runner).
 *
 * This is the REAL gate. The static JS grep (check-product-search-guards.js) is
 * a tripwire that catches obvious deletions; this script proves the LIVE endpoint
 * honours each security invariant by seeding real products and hitting the real
 * REST route.
 *
 * HOW THE ORCHESTRATOR RUNS THIS
 * ──────────────────────────────
 * Option A — WP-CLI eval-file (preferred on the canary):
 *   wp eval-file plugins/sgs-blocks/scripts/product-search-leak-check.php \
 *       --base-url=https://sandybrown-nightingale-600381.hostingersite.com \
 *       --skip-plugins=sgs-booking,sgs-client-notes --allow-root
 *
 * Option B — Token-gated webroot one-shot (when eval-file is guard-blocked):
 *   1. SCP this file to {webroot}/sgs-leak-check.php
 *   2. Set SGS_LEAK_CHECK_TOKEN env var on the server, then:
 *      curl "https://{site}/sgs-leak-check.php?token={TOKEN}&base_url={URL}"
 *   3. rm {webroot}/sgs-leak-check.php immediately after
 *
 * Seeded products (all share a unique title stem — ZZLEAKTEST):
 *   Negative controls (MUST NOT appear in results):
 *     1. draft                — post_status=draft
 *     2. private              — post_status=private
 *     3. password-protected   — post_status=publish, post_password set
 *     4. exclude-from-search  — publish, product_visibility term applied
 *     5. outofstock           — publish, stock_status=outofstock
 *   Positive control (MUST appear in results):
 *     6. publish + visible    — no restrictions
 *
 * Exit code 0 = all checks passed. Exit code 1 = one or more failures.
 *
 * NOTE: The wp_remote_get() call to the endpoint is intentional — this is a
 * test script that must hit the live REST API over HTTP to verify real
 * middleware behaviour (CDN headers, WP REST bootstrap, etc.).  The
 * "uncached external HTTP request" performance warning does not apply to a
 * one-shot test runner; suppress it if wired into a performance scanner.
 *
 * @package SGS\Blocks
 * @since   1.15.0
 *
 * @phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI/test output, not HTML.
 * @phpcs:disable WordPress.WP.AlternativeFunctions -- CLI runner; direct output is intentional.
 */

// ── Token-gated webroot mode ──────────────────────────────────────────────────
// Used for Option B when WP-CLI eval-file is guard-blocked.
if ( 'cli' !== PHP_SAPI ) {
	$expected_token = defined( 'SGS_LEAK_CHECK_TOKEN' )
		? SGS_LEAK_CHECK_TOKEN
		: (string) getenv( 'SGS_LEAK_CHECK_TOKEN' );

	if ( '' === $expected_token ) {
		http_response_code( 403 );
		exit( 'Token not configured.' );
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput
	$supplied = isset( $_GET['token'] ) ? sanitize_text_field( wp_unslash( $_GET['token'] ) ) : '';
	if ( ! hash_equals( $expected_token, $supplied ) ) {
		http_response_code( 403 );
		exit( 'Forbidden.' );
	}

	// Load WordPress.
	$sgs_wp_load = dirname( __DIR__, 4 ) . '/wp-load.php';
	if ( ! file_exists( $sgs_wp_load ) ) {
		http_response_code( 500 );
		exit( 'wp-load.php not found.' );
	}
	require_once $sgs_wp_load; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable

	header( 'Content-Type: text/plain; charset=utf-8' );
}

// ── Resolve base URL ──────────────────────────────────────────────────────────
// WP-CLI: pass --base-url=https://... as an extra positional arg.
// Webroot mode: pass ?base_url=https://... as a query param.
// Fallback: home_url() (requires WP to be loaded).
if ( 'cli' === PHP_SAPI ) {
	$sgs_base_url = '';
	foreach ( $GLOBALS['argv'] ?? array() as $sgs_arg ) {
		if ( str_starts_with( (string) $sgs_arg, '--base-url=' ) ) {
			$sgs_base_url = rtrim( substr( (string) $sgs_arg, strlen( '--base-url=' ) ), '/' );
		}
	}
	if ( '' === $sgs_base_url && function_exists( 'home_url' ) ) {
		$sgs_base_url = rtrim( home_url(), '/' );
	}
} else {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$sgs_base_url_raw = isset( $_GET['base_url'] ) ? sanitize_text_field( wp_unslash( $_GET['base_url'] ) ) : '';
	$sgs_base_url     = rtrim( $sgs_base_url_raw, '/' );
	if ( '' === $sgs_base_url && function_exists( 'home_url' ) ) {
		$sgs_base_url = rtrim( home_url(), '/' );
	}
}

if ( '' === $sgs_base_url ) {
	echo "FAIL  Could not determine base URL. Pass --base-url=https://... or ?base_url=...\n";
	exit( 1 );
}

$sgs_endpoint = $sgs_base_url . '/wp-json/sgs/v1/product-search';

// ── Unique title stem ─────────────────────────────────────────────────────────
$sgs_stem = 'ZZLEAKTEST';

// ── Seed helper ───────────────────────────────────────────────────────────────

/**
 * Create a minimal WooCommerce simple product for leak testing.
 *
 * @param string $title      Product title.
 * @param string $status     post_status (publish / draft / private).
 * @param string $password   Post password — empty means none.
 * @param bool   $exclude    Set product_visibility to exclude-from-search.
 * @param bool   $outofstock Mark stock_status as outofstock.
 * @return int Product ID on success, 0 on failure.
 */
function sgs_lc_seed( string $title, string $status, string $password = '', bool $exclude = false, bool $outofstock = false ): int {
	if ( ! class_exists( 'WC_Product_Simple' ) ) {
		echo "SKIP  WooCommerce not available — cannot seed '{$title}'.\n";
		return 0;
	}

	$product = new WC_Product_Simple();
	$product->set_name( $title );
	$product->set_status( $status );
	$product->set_regular_price( '9.99' );
	$product->set_catalog_visibility( 'visible' );

	if ( '' !== $password ) {
		// post_password is set via the underlying post data — use wp_update_post after save.
		$product->set_status( $status );
	}

	if ( $outofstock ) {
		$product->set_stock_status( 'outofstock' );
		$product->set_manage_stock( false );
	} else {
		$product->set_stock_status( 'instock' );
	}

	$product_id = $product->save();

	if ( ! $product_id ) {
		return 0;
	}

	// Apply post password (no WC setter — go through wp_update_post).
	if ( '' !== $password ) {
		wp_update_post(
			array(
				'ID'            => $product_id,
				'post_password' => $password,
			)
		);
	}

	// Apply exclude-from-search visibility term.
	if ( $exclude ) {
		$term = get_term_by( 'slug', 'exclude-from-search', 'product_visibility' );
		if ( $term instanceof WP_Term ) {
			wp_set_object_terms( $product_id, array( $term->term_id ), 'product_visibility', true );
		}
	}

	return $product_id;
}

/**
 * Hard-delete a list of product IDs (cleanup after the test run).
 *
 * @param int[] $product_ids Product IDs to delete.
 */
function sgs_lc_cleanup( array $product_ids ): void {
	foreach ( $product_ids as $product_id ) {
		if ( $product_id > 0 ) {
			wp_delete_post( $product_id, true );
		}
	}
}

// ── Seed the six test products ────────────────────────────────────────────────
echo "── SGS Product Search Leak Check ──────────────────────────────────────\n";
echo 'Endpoint: ' . $sgs_endpoint . "\n";
echo 'Stem:     ' . $sgs_stem . "\n\n";

$sgs_id_draft      = sgs_lc_seed( "{$sgs_stem} Draft", 'draft' );
$sgs_id_private    = sgs_lc_seed( "{$sgs_stem} Private", 'private' );
$sgs_id_password   = sgs_lc_seed( "{$sgs_stem} Password", 'publish', 'testpassword123' );
$sgs_id_excluded   = sgs_lc_seed( "{$sgs_stem} Excluded", 'publish', '', true );
$sgs_id_outofstock = sgs_lc_seed( "{$sgs_stem} OutOfStock", 'publish', '', false, true );
$sgs_id_positive   = sgs_lc_seed( "{$sgs_stem} VisibleGood", 'publish' );

$sgs_negative_ids = array_filter(
	array( $sgs_id_draft, $sgs_id_private, $sgs_id_password, $sgs_id_excluded, $sgs_id_outofstock )
);
$sgs_labels       = array(
	$sgs_id_draft      => 'draft',
	$sgs_id_private    => 'private',
	$sgs_id_password   => 'password-protected',
	$sgs_id_excluded   => 'exclude-from-search',
	$sgs_id_outofstock => 'outofstock',
);

$sgs_all_ids = array_merge( array_values( $sgs_negative_ids ), array( $sgs_id_positive ) );

echo "Seeded products:\n";
echo '  Positive control (publish+visible): ' . $sgs_id_positive . "\n";
foreach ( $sgs_labels as $sgs_neg_id => $sgs_label ) {
	echo '  Negative control (' . $sgs_label . '): ' . $sgs_neg_id . "\n";
}
echo "\n";

// ── Hit the live endpoint ─────────────────────────────────────────────────────
// wp_remote_get() is intentional here — this test script must exercise the real
// REST bootstrap path including CDN headers and WP middleware.
// phpcs:ignore WordPressVIPMinimum.Performance.RemoteRequestTimeout.timeout_timeout
$sgs_response = wp_remote_get(
	$sgs_endpoint . '?q=' . rawurlencode( $sgs_stem ),
	array(
		'timeout'    => 15,
		'user-agent' => 'SGS-LeakCheck/1.0',
	)
);

if ( is_wp_error( $sgs_response ) ) {
	echo 'FAIL  HTTP request failed: ' . $sgs_response->get_error_message() . "\n";
	sgs_lc_cleanup( $sgs_all_ids );
	exit( 1 );
}

$sgs_http_code = wp_remote_retrieve_response_code( $sgs_response );
$sgs_body      = wp_remote_retrieve_body( $sgs_response );
$sgs_data      = json_decode( $sgs_body, true );

echo 'HTTP status: ' . $sgs_http_code . "\n";
echo 'Raw body (first 500 chars): ' . substr( $sgs_body, 0, 500 ) . "\n\n";

// ── Assertions ────────────────────────────────────────────────────────────────
$sgs_pass    = true;
$sgs_results = is_array( $sgs_data ) ? ( $sgs_data['results'] ?? null ) : null;

// Check 1: HTTP 200.
$sgs_c1 = ( 200 === $sgs_http_code );
echo ( $sgs_c1 ? 'PASS' : 'FAIL' ) . '  HTTP 200 (got ' . $sgs_http_code . ")\n";
$sgs_pass = $sgs_pass && $sgs_c1;

// Check 2: results key is an array.
$sgs_c2 = is_array( $sgs_results );
echo ( $sgs_c2 ? 'PASS' : 'FAIL' ) . "  Response has a 'results' array\n";
$sgs_pass = $sgs_pass && $sgs_c2;

if ( $sgs_c2 ) {
	$sgs_result_ids = array_column( $sgs_results, 'id' );

	// Check 3: positive control MUST appear (empty ≠ pass — a broken
	// visibility call returning 503 would show no results at all, which must
	// not be treated as a successful security outcome).
	$sgs_c3 = ( $sgs_id_positive > 0 ) && in_array( $sgs_id_positive, $sgs_result_ids, true );
	echo ( $sgs_c3 ? 'PASS' : 'FAIL' ) . '  Positive control (id:' . $sgs_id_positive . ") IS in results\n";
	$sgs_pass = $sgs_pass && $sgs_c3;

	// Checks 4–8: each negative control MUST NOT appear.
	foreach ( $sgs_labels as $sgs_neg_id => $sgs_label ) {
		if ( 0 === $sgs_neg_id ) {
			echo 'SKIP  Negative control (' . $sgs_label . ") — seed failed, skipping\n";
			continue;
		}
		$sgs_cn = ! in_array( $sgs_neg_id, $sgs_result_ids, true );
		echo ( $sgs_cn ? 'PASS' : 'FAIL' ) . '  Negative control (' . $sgs_label . ', id:' . $sgs_neg_id . ") NOT in results\n";
		$sgs_pass = $sgs_pass && $sgs_cn;
	}

	// Check 9: every result object has EXACTLY {id, title, permalink, thumbnail}.
	$sgs_allowed_keys = array( 'id', 'title', 'permalink', 'thumbnail' );
	$sgs_keys_clean   = true;
	foreach ( $sgs_results as $sgs_i => $sgs_row ) {
		if ( ! is_array( $sgs_row ) ) {
			$sgs_keys_clean = false;
			echo 'FAIL  Result[' . $sgs_i . "] is not an array\n";
			continue;
		}
		$sgs_extra   = array_diff( array_keys( $sgs_row ), $sgs_allowed_keys );
		$sgs_missing = array_diff( $sgs_allowed_keys, array_keys( $sgs_row ) );
		if ( ! empty( $sgs_extra ) ) {
			$sgs_keys_clean = false;
			echo 'FAIL  Result[' . $sgs_i . '] has extra keys: ' . implode( ', ', $sgs_extra ) . "\n";
		}
		if ( ! empty( $sgs_missing ) ) {
			$sgs_keys_clean = false;
			echo 'FAIL  Result[' . $sgs_i . '] missing keys: ' . implode( ', ', $sgs_missing ) . "\n";
		}
	}
	if ( $sgs_keys_clean ) {
		echo "PASS  All result objects have exactly {id, title, permalink, thumbnail}\n";
	}
	$sgs_pass = $sgs_pass && $sgs_keys_clean;

	// Check 10: Cache-Control: no-store must be present on every response.
	$sgs_cc  = (string) wp_remote_retrieve_header( $sgs_response, 'cache-control' );
	$sgs_c10 = false !== stripos( $sgs_cc, 'no-store' );
	echo ( $sgs_c10 ? 'PASS' : 'FAIL' ) . "  Cache-Control contains no-store (got: '" . $sgs_cc . "')\n";
	$sgs_pass = $sgs_pass && $sgs_c10;
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
sgs_lc_cleanup( $sgs_all_ids );
echo "\nSeeded products deleted.\n\n";

// ── Final verdict ─────────────────────────────────────────────────────────────
if ( $sgs_pass ) {
	echo "══ ALL CHECKS PASSED ══\n";
	exit( 0 );
} else {
	echo "══ ONE OR MORE CHECKS FAILED — do NOT commit ══\n";
	exit( 1 );
}

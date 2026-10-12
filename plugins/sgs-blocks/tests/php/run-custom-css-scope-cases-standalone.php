<?php
/**
 * Shared input-to-output table for the custom-CSS scoper, read by BOTH twins (Spec 32 FR-32-20).
 *
 * Run: php tests/php/run-custom-css-scope-cases-standalone.php
 *
 * Asserts `includes/class-custom-css-scoper.php::Custom_Css_Scoper::scope` against
 * tests/shared/custom-css-scope-cases.json. The JS twin (src/utils/custom-css-scope.js) is checked against
 * the same file by scripts/tests/test-custom-css-scope-js.mjs, so the page and the canvas cannot drift.
 * A negative control proves the comparison fails for a scoper that emits the CSS unscoped.
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable WordPress.WP.AlternativeFunctions

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
require_once dirname( __DIR__, 2 ) . '/includes/class-custom-css-scoper.php';

use SGS\Blocks\Custom_Css_Scoper;

$table = json_decode( (string) file_get_contents( __DIR__ . '/../shared/custom-css-scope-cases.json' ), true );
if ( ! is_array( $table ) || empty( $table['cases'] ) ) {
	fwrite( STDERR, "FAIL: the shared case table is missing or empty\n" );
	exit( 1 );
}

/**
 * Count rows where the scoper disagrees with the table.
 *
 * @param array    $table  Decoded table.
 * @param callable $scoper fn( string $css, string $scope ): array{css:string,refused:string[]}.
 * @param bool     $report Print each failure.
 * @return int
 */
function sgs_scope_case_failures( array $table, callable $scoper, bool $report ): int {
	$failed = 0;
	foreach ( $table['cases'] as $row ) {
		$got = $scoper( $row['css'], $table['scope'] );
		if ( $got['css'] !== $row['out'] || $got['refused'] !== $row['refused'] ) {
			++$failed;
			if ( $report ) {
				fwrite( STDERR, "FAIL {$row['name']}\n  expected: {$row['out']} " . json_encode( $row['refused'] ) . "\n  actual:   {$got['css']} " . json_encode( $got['refused'] ) . "\n" );
			}
		}
	}
	return $failed;
}

$failed = sgs_scope_case_failures( $table, array( Custom_Css_Scoper::class, 'scope' ), true );

// Negative control: a scoper that only swaps `&selector` (the pre-FR-32-20 behaviour) must fail many rows.
$caught = sgs_scope_case_failures(
	$table,
	static function ( string $css, string $scope ): array {
		return array(
			'css'     => str_replace( '&selector', $scope, $css ),
			'refused' => array(),
		);
	},
	false
);
if ( $caught < 10 ) {
	fwrite( STDERR, "FAIL negative control: a string-replace scoper failed only {$caught} rows\n" );
	++$failed;
}

// One reader: only includes/custom-css.php may read sgsCustomCss on the server, so no block or shared
// CSS builder emits it outside the scoper.
$plugin_dir = dirname( __DIR__, 2 );
$readers    = array();
$files      = array_merge(
	(array) glob( $plugin_dir . '/includes/*.php' ),
	(array) glob( $plugin_dir . '/includes/*/*.php' ),
	(array) glob( $plugin_dir . '/src/blocks/*/*.php' )
);
foreach ( $files as $file ) {
	if ( 'custom-css.php' === basename( $file ) || 'extension-attributes.generated.php' === basename( $file ) ) {
		continue;
	}
	if ( preg_match( '/\[\s*[\'"]sgsCustomCss[\'"]\s*\]/', (string) file_get_contents( $file ) ) ) {
		$readers[] = substr( $file, strlen( $plugin_dir ) + 1 );
	}
}
if ( $readers ) {
	fwrite( STDERR, 'FAIL sgsCustomCss is read outside includes/custom-css.php: ' . implode( ', ', $readers ) . "\n" );
	++$failed;
}
if ( count( $files ) < 100 ) {
	fwrite( STDERR, 'FAIL the one-reader scan saw only ' . count( $files ) . " PHP files; its globs no longer match the tree\n" );
	++$failed;
}

$total = count( $table['cases'] );
if ( $failed ) {
	fwrite( STDERR, "custom-css scope (PHP): {$failed} failure(s) of {$total}\n" );
	exit( 1 );
}
echo "custom-css scope (PHP): {$total} cases pass; negative control caught {$caught}\n";

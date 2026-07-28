<?php
/**
 * Tests for sgs_resolve_tier() — canonical tier resolver for responsive values.
 *
 * Standalone test runner. Usage: php tests/php/resolve-tier.php
 *
 * Verifies that the PHP implementation matches the contract exactly:
 *   - Tri-state enums ('inherit'/'on'/'off')
 *   - Scalar/null-marker values
 *   - Desktop coercion to default (§6b guard)
 *   - Tablet/mobile inherit upward
 *   - Non-array junk input defence (D328)
 *
 * @package SGS\Blocks\Tests
 */

// Define ABSPATH to satisfy WordPress safety checks in included files.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/../../' );
}

// Load the fixtures.
$fixtures_path = __DIR__ . '/../fixtures/resolve-tier-fixtures.json';
if ( ! file_exists( $fixtures_path ) ) {
	fwrite( STDERR, 'Error: Fixtures file not found at ' . $fixtures_path . "\n" );
	exit( 1 );
}
$fixtures_json = (string) file_get_contents( $fixtures_path );
$fixtures      = (array) json_decode( $fixtures_json, true );

if ( ! is_array( $fixtures ) ) {
	fwrite( STDERR, "Error: Could not decode fixtures JSON\n" );
	exit( 1 );
}

// Load the function under test.
require_once __DIR__ . '/../../includes/class-sgs-breakpoints.php';
require_once __DIR__ . '/../../includes/helpers-responsive.php';

// Verify the function exists.
if ( ! function_exists( 'sgs_resolve_tier' ) ) {
	fwrite( STDERR, "Error: sgs_resolve_tier() not found\n" );
	exit( 1 );
}

// ─── Test runner ────────────────────────────────────────────────────────────

$passed = 0;
$failed = 0;

foreach ( $fixtures as $idx => $fixture ) {
	$name          = isset( $fixture['name'] ) ? $fixture['name'] : 'Case ' . ( $idx + 1 );
	$value         = isset( $fixture['value'] ) ? $fixture['value'] : null;
	$tier          = isset( $fixture['tier'] ) ? $fixture['tier'] : 'desktop';
	$default_value = isset( $fixture['default'] ) ? $fixture['default'] : null;
	$expect        = isset( $fixture['expect'] ) ? $fixture['expect'] : array();

	$result = sgs_resolve_tier( $value, $tier, $default_value );

	// Check both value and inherited flag.
	$value_match     = $result['value'] === $expect['value'];
	$inherited_match = (bool) $result['inherited'] === (bool) $expect['inherited'];

	if ( $value_match && $inherited_match ) {
		fwrite( STDOUT, '✓ Case ' . ( $idx + 1 ) . ': ' . $name . "\n" );
		++$passed;
	} else {
		fwrite( STDOUT, '✗ Case ' . ( $idx + 1 ) . ': ' . $name . "\n" );
		if ( ! $value_match ) {
			// phpcs:disable WordPress.WP.AlternativeFunctions.json_encode_json_encode
			$exp_val = (string) json_encode( $expect['value'] );
			$got_val = (string) json_encode( $result['value'] );
			// phpcs:enable WordPress.WP.AlternativeFunctions.json_encode_json_encode
			fwrite( STDOUT, '  Value mismatch: expected ' . $exp_val . ', got ' . $got_val . "\n" );
		}
		if ( ! $inherited_match ) {
			$exp_inh = $expect['inherited'] ? 'true' : 'false';
			$got_inh = $result['inherited'] ? 'true' : 'false';
			fwrite( STDOUT, '  Inherited mismatch: expected ' . $exp_inh . ', got ' . $got_inh . "\n" );
		}
		++$failed;
	}
}

// Summary.
fwrite( STDOUT, "\n" . $passed . '/' . count( $fixtures ) . " passed\n" );
if ( $failed > 0 ) {
	fwrite( STDOUT, $failed . " failed\n" );
	exit( 1 );
}

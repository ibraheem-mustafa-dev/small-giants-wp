<?php
/**
 * Tests for sgs_emit_tier_rules() — scoped per-tier CSS emission helper.
 *
 * Standalone test runner. Usage: php tests/php/emit-tier-rules.php
 *
 * Verifies that the PHP implementation matches the contract exactly:
 *   - Base rule always uses the resolved desktop state
 *   - Tablet/mobile rules emit ONLY when their resolved state differs from
 *     the tier immediately above (minimal output)
 *   - A tier whose resolved CSS text is empty emits no rule at all
 *   - Rules are scoped to the caller-supplied selector, never a body class
 *   - Breakpoints match SGS_Breakpoints (1023px tablet / 767px mobile)
 *   - Non-object/junk value input defends via sgs_resolve_tier() (D328)
 *
 * @package SGS\Blocks\Tests
 */

// Define ABSPATH to satisfy WordPress safety checks in included files.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/../../' );
}

// Load the fixtures.
$fixtures_path = __DIR__ . '/../fixtures/emit-tier-rules-fixtures.json';
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

// Load the functions under test.
require_once __DIR__ . '/../../includes/class-sgs-breakpoints.php';
require_once __DIR__ . '/../../includes/helpers-responsive.php';

// Verify the function exists.
if ( ! function_exists( 'sgs_emit_tier_rules' ) ) {
	fwrite( STDERR, "Error: sgs_emit_tier_rules() not found\n" );
	exit( 1 );
}

// ─── Test runner ────────────────────────────────────────────────────────────

$passed = 0;
$failed = 0;

foreach ( $fixtures as $idx => $fixture ) {
	$name          = isset( $fixture['name'] ) ? $fixture['name'] : 'Case ' . ( $idx + 1 );
	$uid_selector  = isset( $fixture['uidSelector'] ) ? $fixture['uidSelector'] : '#sgs-test';
	$value         = isset( $fixture['value'] ) ? $fixture['value'] : null;
	$css_on        = isset( $fixture['cssOn'] ) ? $fixture['cssOn'] : '';
	$css_off       = isset( $fixture['cssOff'] ) ? $fixture['cssOff'] : '';
	$default_value = isset( $fixture['default'] ) ? $fixture['default'] : 'off';
	$expect        = isset( $fixture['expect'] ) ? $fixture['expect'] : '';

	$result = sgs_emit_tier_rules( $uid_selector, $value, $css_on, $css_off, $default_value );

	// Whitespace-normalised equality (design gate §T1.3 contract).
	$normalise = function ( $s ) {
		return trim( preg_replace( '/\s+/', ' ', (string) $s ) );
	};

	if ( $normalise( $result ) === $normalise( $expect ) ) {
		fwrite( STDOUT, '✓ Case ' . ( $idx + 1 ) . ': ' . $name . "\n" );
		++$passed;
	} else {
		fwrite( STDOUT, '✗ Case ' . ( $idx + 1 ) . ': ' . $name . "\n" );
		fwrite( STDOUT, '  Expected: ' . $normalise( $expect ) . "\n" );
		fwrite( STDOUT, '  Got:      ' . $normalise( $result ) . "\n" );
		++$failed;
	}
}

// Summary.
fwrite( STDOUT, "\n" . $passed . '/' . count( $fixtures ) . " passed\n" );
if ( $failed > 0 ) {
	fwrite( STDOUT, $failed . " failed\n" );
	exit( 1 );
}

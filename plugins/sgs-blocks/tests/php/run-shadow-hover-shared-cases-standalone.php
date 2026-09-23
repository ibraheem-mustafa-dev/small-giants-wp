<?php
/**
 * Shared input-to-output table for the hover resolver, read by BOTH twins.
 *
 * Usage:
 *
 *   php tests/php/run-shadow-hover-shared-cases-standalone.php              assert the PHP resolver against the table
 *   php tests/php/run-shadow-hover-shared-cases-standalone.php --generate   rewrite the table from the PHP resolver
 *
 * The JS twin (src/utils/shadow-hover.js) is checked against the SAME file by
 * scripts/tests/test-shadow-hover-js.mjs, so the two resolvers cannot drift apart. Precedent:
 * tests/php/run-shadow-shared-cases-standalone.php for the composer itself.
 *
 * Each row carries its own `map` (the resolver reads `settings.custom.shadowHover` via
 * `wp_get_global_settings()`, so the PHP runner installs `map` into a stub before calling; the JS
 * twin takes `map` as a plain third argument).
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable WordPress.WP.AlternativeFunctions
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
$GLOBALS['sgs_test_hover_map'] = array();
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		if ( 'custom' === $path[0] && 'shadowHover' === ( $path[1] ?? null ) ) {
			return $GLOBALS['sgs_test_hover_map'];
		}
		return null;
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';

const CASES_FILE = __DIR__ . '/../shared/shadow-hover-cases.json';

$soft_lifted = array( 'soft' => 'lifted' );
$one_literal = array( 'floating' => '0px 3px 5px 0px #000000' );
$cases       = array(
	// Map lookup: preset -> preset.
	array( 'preset to preset', 'soft', null, $soft_lifted ),
	array( 'preset to preset is case-insensitive', 'Soft', '#FF0000', $soft_lifted ),
	// Map lookup: preset -> literal.
	array( 'preset to literal', 'floating', null, $one_literal ),
	// Map lookup: no entry.
	array( 'no map entry', 'floating', null, $soft_lifted ),
	array( 'unknown preset slug', 'nonexistent', null, $soft_lifted ),
	// none / empty / whitespace / inset alone.
	array( 'none', 'none', null, $soft_lifted ),
	array( 'NONE uppercase', 'NONE', null, $soft_lifted ),
	array( 'empty shape', '', null, $soft_lifted ),
	array( 'null shape', null, null, $soft_lifted ),
	array( 'whitespace shape', '   ', null, $soft_lifted ),
	array( 'inset alone', 'inset', null, $soft_lifted ),
	// A hostile map literal is validated before being trusted.
	array( 'hostile map literal (comment opener)', 'soft', null, array( 'soft' => '0px 0px 0px 0px /* #000' ) ),
	array( 'empty-string map entry', 'soft', null, array( 'soft' => '' ) ),
	// Custom layered shape: the procedural lift.
	array( 'one outer layer lifts', '0px 4px 12px 0px', '#000000', array() ),
	array( 'inset layer is untouched, outer layer lifts', '0px 4px 12px 0px, inset 0px 2px 4px 0px', '#000000', array() ),
	array( 'spread is never touched; y and blur round to the nearest whole pixel', '0px 1px 2px -3px', '#000000', array() ),
	array( 'an embedded colour rides through the lift unchanged, ignoring the colour argument', '0px 4px 12px 0px red', null, array() ),
	array( 'two-layer ratio (the real floating preset shape) with the default colour', '0px 2px 4px 0px, 0px 8px 16px 0px', null, array() ),
	// Grammar rejection.
	array( 'negative blur is not a layer', '0px 0px -4px 0px', '#000000', array() ),
	array( 'inset in the middle is not a layer', '0 2px inset 4px', '#000000', array() ),
	array( 'nine layers exceed the layer cap', implode( ', ', array_fill( 0, 9, '0px 1px 2px 0px' ) ), '#000000', array() ),
	array( 'filter smuggle leaves nothing to draw', '0px 0px 0px red) blur(9999px', '#000000', array() ),
);

$rows = array();
foreach ( $cases as $case ) {
	$GLOBALS['sgs_test_hover_map'] = $case[3];
	$rows[]                        = array(
		'name'     => $case[0],
		'shape'    => $case[1],
		'colour'   => $case[2],
		'map'      => $case[3],
		'expected' => sgs_shadow_hover_value( $case[1], $case[2] ),
	);
}

if ( in_array( '--generate', $argv, true ) ) {
	file_put_contents( CASES_FILE, json_encode( $rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n" );
	echo 'Wrote ' . count( $rows ) . " cases to tests/shared/shadow-hover-cases.json\n";
	exit( 0 );
}

$stored = json_decode( (string) file_get_contents( CASES_FILE ), true );
if ( ! is_array( $stored ) || count( $stored ) !== count( $rows ) ) {
	fwrite( STDERR, "FAIL the table is missing or has a different number of cases; run with --generate\n" );
	exit( 1 );
}

/**
 * Compare the resolver against the table.
 *
 * @param array    $table    Cases.
 * @param callable $resolver fn( ?string $shape, ?string $colour, array $map ): string.
 * @param bool     $report   Print each mismatch.
 * @return int Number of mismatches.
 */
function sgs_hover_shared_cases_failures( array $table, callable $resolver, bool $report ): int {
	$failed = 0;
	foreach ( $table as $row ) {
		$actual = $resolver( $row['shape'], $row['colour'], $row['map'] );
		if ( $actual !== $row['expected'] ) {
			++$failed;
			if ( $report ) {
				fwrite( STDERR, "FAIL {$row['name']}\n  expected: {$row['expected']}\n  actual:   {$actual}\n" );
			}
		}
	}
	return $failed;
}

$failed = sgs_hover_shared_cases_failures(
	$stored,
	static function ( $shape, $colour, $map ) {
		$GLOBALS['sgs_test_hover_map'] = $map;
		return sgs_shadow_hover_value( $shape, $colour );
	},
	true
);

// Negative control: the same comparison must catch a resolver that never lifts (just composes
// the resting value unchanged) and never resolves the map (always treats every slug as unknown).
$caught = sgs_hover_shared_cases_failures(
	$stored,
	static function ( $shape, $colour ) {
		return sgs_shadow_layers( $shape, $colour );
	},
	false
);
if ( $caught < 5 ) {
	++$failed;
	fwrite( STDERR, "FAIL negative control: a resolver with no map lookup and no lift was caught by only {$caught} cases\n" );
}

echo 'Shared shadow hover cases: ' . count( $stored ) . ' checked, ' . $failed . " failures (negative control caught {$caught})\n";
exit( $failed > 0 ? 1 : 0 );

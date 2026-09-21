<?php
/**
 * Golden-output test for the shared shadow composer (Wave 3C U-1 commit 4f-1).
 *
 * `sgs_shadow_value_composed()` sits under every block that renders a shadow.
 * Before the layered rewrite, this records what it emits today for every shape
 * the editor control can produce (plus slugs and empties), and afterwards proves
 * those outputs are byte-identical. Entries marked `must_match: false` are known
 * defects or draft-style values that the rewrite changes on purpose; their
 * recorded output is kept as evidence of the old behaviour only.
 *
 *   php plugins/sgs-blocks/tests/php/run-shadow-golden-standalone.php            # assert
 *   php plugins/sgs-blocks/tests/php/run-shadow-golden-standalone.php --generate # re-record (do this ONLY against the pre-rewrite code)
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
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

require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';

$fixture = __DIR__ . '/fixtures/shadow-golden.json';

/**
 * The corpus: [ id, shape, colour, must_match, note ].
 *
 * @return array<int, array{0:string,1:?string,2:?string,3:bool,4:string}>
 */
function sgs_shadow_golden_corpus(): array {
	$rows = array();

	// Control-built single layers x every colour form the control writes.
	$shapes  = array( '0px 4px 12px 0px', '2px 2px 0px 0px', '0px 0px 20px 4px', 'inset 0px 2px 4px 0px', '0px 1px 2px -1px' );
	$colours = array( null, '', '#000000', '#0000001A', 'primary', 'accent', 'rgba(0,0,0,0.1)', 'red', 'var(--wp--preset--color--primary)' );
	foreach ( $shapes as $shape ) {
		foreach ( $colours as $colour ) {
			$rows[] = array( "control:{$shape}|" . ( $colour ?? 'null' ), $shape, $colour, true, 'control-built single layer' );
		}
	}

	// Bare theme preset slugs (colour is ignored for a slug).
	foreach ( array( 'subtle', 'raised', 'floating', 'glow' ) as $slug ) {
		$rows[] = array( "slug:{$slug}", $slug, null, true, 'theme preset slug' );
		$rows[] = array( "slug:{$slug}|colour", $slug, '#ff0000', true, 'slug ignores colour' );
	}

	// Empties.
	foreach ( array( 'null' => null, 'blank' => '', 'spaces' => '   ' ) as $label => $empty ) {
		$rows[] = array( "empty:{$label}", $empty, '#000000', true, 'empty shape' );
	}

	// Known defects and draft-style values the rewrite changes on purpose.
	$rows[] = array( 'defect:negative-x', '-2px 4px 8px 0px', '#000000', false, 'negative first offset: mangled into a slug today' );
	$rows[] = array( 'defect:unitless-zero', '0 4px 12px 0', '#000000', false, 'unitless first length: colour ignored today' );
	$rows[] = array( 'defect:none', 'none', null, false, '"none" is treated as a slug today' );
	$rows[] = array( 'draft:rgba-single', '0 2px 4px rgba(0,0,0,.1)', null, false, 'draft-style, canonicalised by the rewrite' );
	$rows[] = array( 'draft:two-layer', '0 30px 80px -30px rgba(0,0,0,.28), 0 2px 8px -2px rgba(0,0,0,.08)', null, false, 'two-layer literal, canonicalised by the rewrite' );
	$rows[] = array( 'defect:two-layer-control', '0px 1px 2px 0px, 0px 8px 24px 0px', '#00000033', false, 'colour appended to the last layer only today' );

	return $rows;
}

if ( in_array( '--generate', $argv, true ) ) {
	$out = array();
	foreach ( sgs_shadow_golden_corpus() as $row ) {
		$out[] = array(
			'id'         => $row[0],
			'shape'      => $row[1],
			'colour'     => $row[2],
			'must_match' => $row[3],
			'note'       => $row[4],
			'output'     => sgs_shadow_value_composed( $row[1], $row[2] ),
		);
	}
	if ( ! is_dir( dirname( $fixture ) ) ) {
		mkdir( dirname( $fixture ), 0777, true );
	}
	file_put_contents( $fixture, json_encode( $out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n" );
	echo 'Recorded ' . count( $out ) . " entries to {$fixture}\n";
	exit( 0 );
}

if ( ! is_file( $fixture ) ) {
	fwrite( STDERR, "FAIL: fixture missing: {$fixture}\n" );
	exit( 1 );
}

/**
 * Compare every must_match entry against a composer callable.
 *
 * @param array<int, array<string, mixed>> $entries  Recorded entries.
 * @param callable                         $composer Composer under test.
 * @param bool                             $report   Print each failure.
 * @return array{0:int,1:int} Checked count, failure count.
 */
function sgs_shadow_golden_compare( array $entries, callable $composer, bool $report ): array {
	$checked  = 0;
	$failures = 0;
	foreach ( $entries as $entry ) {
		if ( ! $entry['must_match'] ) {
			continue;
		}
		++$checked;
		$now = $composer( $entry['shape'], $entry['colour'] );
		if ( $now !== $entry['output'] ) {
			++$failures;
			if ( $report ) {
				fwrite( STDERR, "FAIL {$entry['id']}\n  expected: {$entry['output']}\n  actual:   {$now}\n" );
			}
		}
	}
	return array( $checked, $failures );
}

$golden = json_decode( (string) file_get_contents( $fixture ), true );

list( $checked, $failures ) = sgs_shadow_golden_compare( $golden, 'sgs_shadow_value_composed', true );

// Negative control: the same comparison run against a deliberately broken composer
// MUST report failures, otherwise this test would pass against anything.
list( , $broken_failures ) = sgs_shadow_golden_compare(
	$golden,
	static function ( $shape, $colour ): string {
		return 'broken';
	},
	false
);
if ( 0 === $broken_failures ) {
	++$failures;
	fwrite( STDERR, "FAIL negative control: a broken composer was not detected\n" );
}

echo "Golden entries checked: {$checked}, failures: {$failures} (negative control caught {$broken_failures})\n";
exit( $failures > 0 ? 1 : 0 );

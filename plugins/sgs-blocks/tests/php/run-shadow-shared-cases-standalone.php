<?php
/**
 * Shared input-to-output table for the shadow composer, read by BOTH twins.
 *
 * Usage:
 *
 *   php tests/php/run-shadow-shared-cases-standalone.php              assert the PHP composer against the table
 *   php tests/php/run-shadow-shared-cases-standalone.php --generate   rewrite the table from the PHP composer
 *
 * The JS twin (src/utils/shadow-layers.js) is checked against the SAME file by
 * scripts/tests/test-shadow-layers-js.mjs, so the two composers cannot drift apart. A case
 * marked `phpOnly` is one the JS twin deliberately does not reproduce (PHP normalises
 * rgb()/hsl() colours to hex; the canvas has no such filter).
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
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';

const CASES_FILE = __DIR__ . '/../shared/shadow-compose-cases.json';

$one   = '0px 4px 12px 0px';
$two   = '0px 1px 2px 0px, 0px 8px 24px 0px';
$nine  = implode( ', ', array_fill( 0, 9, '0px 1px 2px 0px' ) );
$cases = array(
	// Shape and colour.
	array( 'one layer, hex colour', '0 4px 12px 0', '#000000' ),
	array( 'negative first offset', '-2px 4px 8px 0px', '#000000' ),
	array( 'no colour uses the default', $one, null ),
	array( 'none', 'none', null ),
	array( 'a preset slug ignores colour', 'raised', '#FF0000' ),
	array( 'a preset slug is lower-cased', 'Raised', null ),
	array( 'empty shape', '', '#000000' ),
	array( 'null shape', null, '#000000' ),
	array( 'whitespace shape', '   ', '#000000' ),
	array( 'one colour for every layer', $two, '#00000033' ),
	array( 'a colour list matches the layers', $two, '#FF0000, #00FF00' ),
	array( 'a short list repeats its last entry', $two, '#FF0000' ),
	array( 'extra colour entries are ignored', $two, '#FF0000, #00FF00, #0000FF' ),
	array( 'an empty first entry means the default', $two, ', #00FF00' ),
	array( 'an empty later entry inherits', $two, '#FF0000, ' ),
	array( 'a layer keeps its own colour', '0px 1px 2px 0px, 0px 8px 24px 0px red', '#FF0000, #00FF00' ),
	array( 'embedded named colour', '0 2px 4px red', null ),
	// Colour entries.
	array( 'site colour', $one, 'site' ),
	array( 'site colour with opacity', $one, 'site 12%' ),
	array( 'palette slug with opacity', $one, 'primary 8%' ),
	array( 'palette slug', $one, 'primary' ),
	array( '100% opacity adds no colour-mix', $one, '#FF0000 100%' ),
	array( 'fractional opacity', $one, 'site 12.5%' ),
	array( 'var() colour', $one, 'var(--wp--preset--color--accent)' ),
	// A theme preset's layers carry one strict color-mix(); any other color-mix() is not a colour.
	array( 'a preset color-mix on the site colour', '0 1px 2px color-mix(in srgb, var(--wp--custom--shadow-colour) 10%, transparent)', null ),
	array( 'a preset color-mix on a palette variable', '0 0 16px color-mix(in srgb, var(--wp--preset--color--primary) 55%, transparent)', null ),
	array( 'a color-mix in the colour list', $one, 'color-mix(in srgb, #112233 40%, transparent)' ),
	array( 'a color-mix with a hostile inner value is rejected', '0 1px 2px color-mix(in srgb, red;}body{x:y 10%, transparent)', null ),
	array( 'a color-mix that is not against transparent is rejected', '0 1px 2px color-mix(in srgb, #112233 10%, red)', null ),
	// Grammar.
	array( 'inset first', 'INSET 0 2px 4px', null ),
	array( 'inset last', '0 2px 4px inset', null ),
	array( 'inset in the middle is rejected', '0 2px inset 4px', null ),
	array( 'the word inset alone', 'inset', null ),
	array( 'blur clamps to 100', '0px 0px 999px 0px', null ),
	array( 'offsets clamp to 200', '999px -999px 0px', null ),
	array( 'negative blur is rejected', '0px 0px -4px 0px', null ),
	array( 'decimals and bare numbers', '0 .5 1', null ),
	array( 'spread', '0 4px 12px -3px', '#000000' ),
	// Limits.
	array( 'nine layers are rejected', $nine, null ),
	array( 'eight layers are allowed', implode( ', ', array_fill( 0, 8, '0px 1px 2px 0px' ) ), null ),
	// Hostile input: nothing that can break out of a rule survives.
	array( 'breakout in a shape', '0px 0px 0px red;}body{display:none}.x{y:z', null ),
	array( 'comment opener', '0px 0px 0px 0px /* #000', null ),
	array( 'filter smuggle', '0px 0px 0px 0px red) blur(9999px', null ),
	array( 'important', '0px 0px 0px 0px red!important', null ),
	array( 'exponent length', '0px 0px 1e9999px 0px', null ),
	array( 'url in a colour', $one, 'url(http://x)' ),
	array( 'brace in a colour', $one, '#000}body{x:y' ),
	array( 'unclosed paren in a colour', $one, 'var(--x #000' ),
	array( 'at-rule in a layer', '0px 0px 0px 0px @import', null ),
	array( 'quote in a layer', '0px 0px 0px 0px "x"', null ),
);

$rows = array();
foreach ( $cases as $case ) {
	$rows[] = array(
		'name'     => $case[0],
		'shape'    => $case[1],
		'colour'   => $case[2],
		'expected' => sgs_shadow_layers( $case[1], $case[2] ),
	);
}
// PHP-only: rgb()/hsl() are normalised to hex by sgs_colour_value().
foreach ( array( array( 'embedded rgb colour is normalised to hex', '0 2px 4px rgba(0,0,0,.1)', null ) ) as $case ) {
	$rows[] = array(
		'name'     => $case[0],
		'shape'    => $case[1],
		'colour'   => $case[2],
		'expected' => sgs_shadow_layers( $case[1], $case[2] ),
		'phpOnly'  => true,
	);
}

if ( in_array( '--generate', $argv, true ) ) {
	file_put_contents( CASES_FILE, json_encode( $rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n" );
	echo 'Wrote ' . count( $rows ) . " cases to tests/shared/shadow-compose-cases.json\n";
	exit( 0 );
}

$stored = json_decode( (string) file_get_contents( CASES_FILE ), true );
if ( ! is_array( $stored ) || count( $stored ) !== count( $rows ) ) {
	fwrite( STDERR, "FAIL the table is missing or has a different number of cases; run with --generate\n" );
	exit( 1 );
}

/**
 * Compare a composer against the table.
 *
 * @param array    $table    Cases.
 * @param callable $composer fn( ?string $shape, ?string $colour ): string.
 * @param bool     $report   Print each mismatch.
 * @return int Number of mismatches.
 */
function sgs_shared_cases_failures( array $table, callable $composer, bool $report ): int {
	$failed = 0;
	foreach ( $table as $row ) {
		$actual = $composer( $row['shape'], $row['colour'] );
		if ( $actual !== $row['expected'] ) {
			++$failed;
			if ( $report ) {
				fwrite( STDERR, "FAIL {$row['name']}\n  expected: {$row['expected']}\n  actual:   {$actual}\n" );
			}
		}
	}
	return $failed;
}

$failed = sgs_shared_cases_failures( $stored, 'sgs_shadow_layers', true );

// Negative control: the same comparison must catch a composer that ignores the colour.
$caught = sgs_shared_cases_failures(
	$stored,
	static function ( $shape, $colour ) {
		return sgs_shadow_layers( $shape, null );
	},
	false
);
if ( $caught < 5 ) {
	++$failed;
	fwrite( STDERR, "FAIL negative control: a composer that ignores colour was caught by only {$caught} cases\n" );
}

// The media atom composes through the shared composer: nothing that can leave a declaration
// survives it (it used to have no sanitiser at all).
require_once dirname( __DIR__, 2 ) . '/includes/media/atoms/shadow.php';
$atom_out = sgs_media_atom_shadow_resolve( '0px 0px 0px red;}body{display:none}', null );
if ( 1 === preg_match( '/[;{}<>"' . "'" . '`]/', $atom_out ) || '' === $atom_out ) {
	++$failed;
	fwrite( STDERR, 'FAIL media atom passed a declaration breakout or dropped a valid layer: ' . $atom_out . "\n" );
}
if ( sgs_media_atom_shadow_resolve( '0px 4px 12px 0px', '#000000' ) !== sgs_shadow_layers( '0px 4px 12px 0px', '#000000' ) ) {
	++$failed;
	fwrite( STDERR, "FAIL media atom does not agree with the shared composer\n" );
}

echo 'Shared shadow cases: ' . count( $stored ) . ' checked, ' . $failed . " failures (negative control caught {$caught})\n";
exit( $failed > 0 ? 1 : 0 );

<?php
/**
 * Standalone tests for the background tone test: sgs_colour_background_tone() and
 * sgs_colour_is_dark_background() in includes/helpers-colour-wcag.php.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-colour-dark-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// The theme's own palette, as wp_get_global_settings( array( 'color', 'palette' ) ) returns it
// (keyed by origin). 'gradient-slug' proves a resolved non-hex value degrades to false.
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		return array(
			'theme' => array(
				array(
					'slug'  => 'footer-bg',
					'color' => '#0F172A',
				),
				array(
					'slug'  => 'surface',
					'color' => '#FAF9F6',
				),
				array(
					'slug'  => 'gradient-slug',
					'color' => 'linear-gradient(#000,#111)',
				),
			),
		);
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-colour-wcag.php';

$fail  = 0;
$total = 0;
function t_eq( $expected, $actual, string $label ): void {
	global $fail, $total;
	++$total;
	if ( $expected !== $actual ) {
		++$fail;
		fwrite( STDERR, "FAIL {$label}\n  expected: " . json_encode( $expected ) . "\n  actual:   " . json_encode( $actual ) . "\n" );
	}
}

// Each case: input => expected tone. Comments give the computed WCAG luminance where it is a real decision.
// Dark means luminance below SGS_COLOUR_DARK_LUMINANCE (0.05); '' means not one solid known colour.
$cases = array(
	'#000000'                             => 'dark',   // L 0.
	'#111'                                => 'dark',   // L 0.0056.
	'#121212'                             => 'dark',   // L 0.0060.
	'#3F3F3F'                             => 'dark',   // L 0.0497: just under the cut.
	'#404040'                             => 'light',  // L 0.0513: just over the cut.
	'#1F7A7A'                             => 'light',  // Teal, L 0.1562: a black shadow still shows on it.
	'#FFFFFF'                             => 'light',
	'#F5C2C8'                             => 'light',
	'#777777'                             => 'light',  // Mid-grey, L 0.1845.
	'footer-bg'                           => 'dark',   // Palette slug, #0F172A, L 0.0088.
	'surface'                             => 'light',  // Palette slug, #FAF9F6.
	'var(--wp--preset--color--footer-bg)' => 'dark',
	'var(--wp--preset--color--surface)'   => 'light',
	'  #000  '                            => 'dark',   // Whitespace is trimmed.
	'no-such-slug'                        => '',
	'gradient-slug'                       => '',       // Resolves to a gradient, not a hex.
	''                                    => '',
	'transparent'                         => '',
	'inherit'                             => '',
	'currentColor'                        => '',
	'linear-gradient(#000,#111)'          => '',
	'rgb(0,0,0)'                          => '',
	'#00000080'                           => '',       // 8-digit hex is refused.
	'<script>alert(1)</script>'           => '',
	'var(--wp--preset--color--Bad Slug)'  => '',
);

// Print the real numbers behind the decisions.
foreach ( array( '#3F3F3F', '#404040', '#1F7A7A', '#777777', '#0F172A', '#FAF9F6' ) as $probe ) {
	printf( "INFO %s luminance %.4f text %s
", $probe, sgs_wcag_relative_luminance( $probe ), sgs_wcag_text_colour_for_bg( $probe ) );
}

$dark_count  = 0;
$light_count = 0;
foreach ( $cases as $input => $expected ) {
	$input = (string) $input;
	t_eq( $expected, sgs_colour_background_tone( $input ), 'tone(' . $input . ')' );
	t_eq( 'dark' === $expected, sgs_colour_is_dark_background( $input ), 'dark(' . $input . ')' );
	if ( 'dark' === $expected ) {
		++$dark_count;
	} elseif ( 'light' === $expected ) {
		++$light_count;
	}
}

// The threshold is its own decision, not the text-legibility crossover: #1F7A7A is one where they differ.
t_eq( '#fff', sgs_wcag_text_colour_for_bg( '#1F7A7A' ), 'text helper still picks white text on #1F7A7A' );
t_eq( false, sgs_colour_is_dark_background( '#1F7A7A' ), 'yet #1F7A7A is not a dark background for shadows' );
t_eq( 0.05, SGS_COLOUR_DARK_LUMINANCE, 'the luminance cut is the documented 0.05' );

// Negative controls: the helper is neither "any non-empty string is dark" nor the text-legibility test.
$stub_mismatches = 0;
$legible_misses  = 0;
foreach ( $cases as $input => $expected ) {
	$input = (string) $input;
	if ( ( '' !== $input ? 'dark' : '' ) !== $expected ) {
		++$stub_mismatches;
	}
	$legible = '' === sgs_colour_background_tone( $input ) ? '' : ( '#fff' === sgs_wcag_text_colour_for_bg( sgs_resolve_palette_hex( $input, $input ) ) ? 'dark' : 'light' );
	if ( $legible !== $expected ) {
		++$legible_misses;
	}
}
t_eq( true, $stub_mismatches >= 5, 'negative control: a strlen>0 stub is caught by >= 5 cases (caught by ' . $stub_mismatches . ')' );
t_eq( true, $legible_misses >= 1, 'negative control: the text-legibility test is caught by >= 1 case (caught by ' . $legible_misses . ')' );
t_eq( true, $dark_count >= 3, 'positive control: at least 3 cases are expected dark (' . $dark_count . ')' );
t_eq( true, $light_count >= 4, 'positive control: at least 4 cases are expected light (' . $light_count . ')' );

echo ( $fail > 0 ? "FAILED: {$fail} of {$total}" : "OK: {$total} assertions passed" ) . "
";
exit( $fail > 0 ? 1 : 0 );

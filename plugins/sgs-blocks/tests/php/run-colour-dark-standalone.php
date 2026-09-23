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
// sgs_colour_background_tone() depends on sgs_colour_resolve_hex_alpha(), which lives here
// (D2, 2026-09-23) — both files are always loaded together via render-helpers.php.
require_once dirname( __DIR__, 2 ) . '/includes/helpers-surface-tone.php';

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
//
// D1 (2026-09-23): dark/light is now ONE rule shared with text legibility — dark when
// sgs_wcag_text_colour_for_bg() would pick white ('#fff'), light when it would pick black.
// SGS_COLOUR_DARK_LUMINANCE (a separate flat 0.05 cut) is deleted; every use is gone (grepped
// the repo). CHANGED under D1 vs the old fixed 0.05 cut, and why:
// '#404040'    light -> dark  (L 0.0513, just over the old 0.05 cut, but white still wins contrast)
// '#1F7A7A'    light -> dark  (L 0.1562: white text already won here per the text helper — the
// old test even asserted this teal was "not a dark background for
// shadows" specifically BECAUSE the two rules diverged; D1 unifies
// them, so that divergence is gone and the teal is dark like its text)
// 'rgb(0,0,0)' ''   -> dark   (D1 now accepts rgb()/rgba(), commas or spaces, alpha ignored here)
// '#00000080'  ''   -> dark   (D1 now accepts an 8-digit hex; alpha is ignored for tone)
// ADDED under D1: 'black'/'white' keywords, plain 'rgb(...)', and 8-digit-hex cases.
$cases = array(
	'#000000'                             => 'dark',   // L 0.
	'#111'                                => 'dark',   // L 0.0056.
	'#121212'                             => 'dark',   // L 0.0060.
	'#3F3F3F'                             => 'dark',   // L 0.0497.
	'#404040'                             => 'dark',   // L 0.0513: white still wins contrast (D1).
	'#1F7A7A'                             => 'dark',   // Teal, L 0.1562: white wins contrast (D1).
	'#FFFFFF'                             => 'light',
	'#F5C2C8'                             => 'light',
	'#777777'                             => 'light',  // Mid-grey, L 0.1845: black still wins (>=4.5:1).
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
	'rgb(0,0,0)'                          => 'dark',   // D1: rgb() accepted.
	'rgb(7 94 128)'                       => 'dark',   // D1: space-separated channels accepted.
	'rgba(0,0,0,.9)'                      => 'dark',   // D1: rgba() accepted, alpha ignored for tone.
	'#00000080'                           => 'dark',   // D1: 8-digit hex accepted, alpha ignored.
	'black'                               => 'dark',   // D1: named keyword.
	'white'                               => 'light',  // D1: named keyword.
	'<script>alert(1)</script>'           => '',
	'var(--wp--preset--color--Bad Slug)'  => '',
);

// Print the real numbers behind the decisions.
foreach ( array( '#3F3F3F', '#404040', '#1F7A7A', '#777777', '#0F172A', '#FAF9F6' ) as $probe ) {
	printf(
		'INFO %s luminance %.4f text %s
',
		$probe,
		sgs_wcag_relative_luminance( $probe ),
		sgs_wcag_text_colour_for_bg( $probe )
	);
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

// D1 is now IDENTICAL to the text-legibility rule by construction (it delegates to
// sgs_wcag_white_wins_for_luminance() — see helpers-colour-wcag.php). Assert that identity
// directly rather than the old "these two rules diverge" negative control, which D1 retires.
foreach ( array( '#1F7A7A', '#404040', '#777777', '#075E80' ) as $probe ) {
	$expect_dark = '#fff' === sgs_wcag_text_colour_for_bg( $probe );
	t_eq( $expect_dark, sgs_colour_is_dark_background( $probe ), 'tone(' . $probe . ') matches the text-legibility rule exactly' );
}

// Negative control: the helper is not "any non-empty string is dark".
$stub_mismatches = 0;
foreach ( $cases as $input => $expected ) {
	$input = (string) $input;
	if ( ( '' !== $input ? 'dark' : '' ) !== $expected ) {
		++$stub_mismatches;
	}
}
t_eq( true, $stub_mismatches >= 5, 'negative control: a strlen>0 stub is caught by >= 5 cases (caught by ' . $stub_mismatches . ')' );

// Negative control: the OLD fixed 0.05 luminance cut would misjudge P1 colours (e.g. #075E80,
// L 0.0961) as light, proving the rule genuinely changed rather than the test just being relabelled.
$old_cutoff_tone = sgs_wcag_relative_luminance( '#075E80' ) < 0.05 ? 'dark' : 'light';
t_eq( 'light', $old_cutoff_tone, 'negative control: the retired fixed 0.05 cut would call #075E80 light' );
t_eq( 'dark', sgs_colour_background_tone( '#075E80' ), 'the live D1 rule calls #075E80 dark' );

t_eq( true, $dark_count >= 3, 'positive control: at least 3 cases are expected dark (' . $dark_count . ')' );
t_eq( true, $light_count >= 4, 'positive control: at least 4 cases are expected light (' . $light_count . ')' );

echo ( $fail > 0 ? "FAILED: {$fail} of {$total}" : "OK: {$total} assertions passed" ) . '
';
exit( $fail > 0 ? 1 : 0 );

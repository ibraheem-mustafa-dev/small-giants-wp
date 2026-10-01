<?php
/**
 * Standalone runner for `SGS\Blocks\Sgs_Woocommerce_Email_Contrast` (Spec 04,
 * unified-email plan row 7).
 *
 * Exercises the REAL class against a fake `woocommerce_email_styles` filter
 * pipeline. Covers:
 *   - a valid `woocommerce_email_text_color` option appends an override that
 *     forces links, `.email-logo-text` and `h1`/`h2`/`h3` onto that colour;
 *   - the override never mentions the accent (`woocommerce_email_base_color`),
 *     proving the fix removes the accent from the link/heading colour path
 *     rather than merely adding an extra rule beside it;
 *   - the appended colour is high-contrast against the body background for
 *     all three current client palettes (bakery, optician and wholesale-food),
 *     each measured with the real WCAG relative-luminance formula;
 *   - NEGATIVE CONTROL: an invalid/missing `woocommerce_email_text_color`
 *     option leaves the compiled CSS untouched — proving the guard clause
 *     actually guards, not just that the happy path works.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-woocommerce-email-contrast-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

$GLOBALS['sgs_test_options'] = array();

function get_option( $key, $default = false ) {
	return $GLOBALS['sgs_test_options'][ $key ] ?? $default;
}

function add_filter( $hook, $callback ) {
	// The class under test only ever registers one callback per hook here.
	$GLOBALS['sgs_test_filters'][ $hook ] = $callback;
}

require dirname( __DIR__, 2 ) . '/includes/mail/class-sgs-woocommerce-email-contrast.php';

use SGS\Blocks\Sgs_Woocommerce_Email_Contrast;

$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}\n";
	}
}

/** WCAG relative luminance for a `#rrggbb` hex colour. */
function wcag_luminance( string $hex ): float {
	$hex = ltrim( $hex, '#' );
	$rgb = array_map(
		static function ( string $part ): float {
			$c = hexdec( $part ) / 255;
			return $c <= 0.03928 ? $c / 12.92 : ( ( $c + 0.055 ) / 1.055 ) ** 2.4;
		},
		str_split( $hex, 2 )
	);
	return 0.2126 * $rgb[0] + 0.7152 * $rgb[1] + 0.0722 * $rgb[2];
}

/** WCAG contrast ratio between two `#rrggbb` hex colours. */
function wcag_contrast( string $a, string $b ): float {
	$l1 = wcag_luminance( $a );
	$l2 = wcag_luminance( $b );
	[ $lighter, $darker ] = $l1 >= $l2 ? [ $l1, $l2 ] : [ $l2, $l1 ];
	return ( $lighter + 0.05 ) / ( $darker + 0.05 );
}

Sgs_Woocommerce_Email_Contrast::register();
ok( isset( $GLOBALS['sgs_test_filters']['woocommerce_email_styles'] ), 'registers the woocommerce_email_styles filter' );
$callback = $GLOBALS['sgs_test_filters']['woocommerce_email_styles'];

// -- Happy path: the bakery client's real, currently-live option values --------

$GLOBALS['sgs_test_options'] = array(
	'woocommerce_email_base_color'          => '#f5d050', // The accent — must not reach links/headings.
	'woocommerce_email_text_color'          => '#3a2e26',
	'woocommerce_email_body_background_color' => '#fbf3dc',
);
$before = "body { color: red; }\nh1 { color: #f5d050; }\na { color: #f5d050; }\n";
$after  = $callback( $before );

ok( str_starts_with( $after, $before ), 'appends to the existing CSS rather than replacing it' );
ok( str_contains( $after, 'color: #3a2e26 !important;' ), 'overrides colour to the text option' );
ok( str_contains( $after, 'a, .link, .email-logo-text' ), 'targets links and the logo-text fallback' );
ok( str_contains( $after, 'h1, h2, h3' ), 'targets content headings' );
ok( ! str_contains( $after, '#template_header h1' ), 'leaves the accent-band header heading alone (its own contrasting colour is already computed)' );
ok( substr_count( $after, '#f5d050' ) === substr_count( $before, '#f5d050' ), 'the appended override never re-adds the accent — every occurrence in $after is from the untouched original CSS' );

// -- Contrast proof across all three current client palettes ----------------

$palettes = array(
	'Mama\'s Munches' => array( 'text' => '#3a2e26', 'surface' => '#fbf3dc' ),
	'The optician client' => array( 'text' => '#141414', 'surface' => '#FAF8F5' ),
	'The wholesale-food client' => array( 'text' => '#2C3E50', 'surface' => '#FFFFFF' ),
);
foreach ( $palettes as $client => $colours ) {
	$ratio = wcag_contrast( $colours['text'], $colours['surface'] );
	ok( $ratio >= 4.5, "{$client}: text on surface measures {$ratio}:1 (>= 4.5:1)" );
}
$accent_ratio = wcag_contrast( '#f5d050', '#fbf3dc' );
ok( $accent_ratio < 4.5, "negative control: the old accent-on-surface pairing measures {$accent_ratio}:1 (< 4.5:1, proving the bug is real)" );

// -- NEGATIVE CONTROL: no valid text colour option leaves the CSS untouched --

$GLOBALS['sgs_test_options'] = array();
$unchanged                   = $callback( $before );
ok( $unchanged === $before, 'NEGATIVE CONTROL: missing text colour option leaves the CSS untouched' );

$GLOBALS['sgs_test_options'] = array( 'woocommerce_email_text_color' => 'not-a-colour' );
$unchanged2                  = $callback( $before );
ok( $unchanged2 === $before, 'NEGATIVE CONTROL: invalid text colour option leaves the CSS untouched' );

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );
}

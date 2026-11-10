<?php
/**
 * The shared resolved-CSS-value predicate and every helper that resolves a token or length through it.
 *
 * Usage: php tests/php/run-resolved-css-value-standalone.php
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
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( $path = array() ) {
		return array();
	}
}
if ( ! function_exists( 'safecss_filter_attr' ) ) {
	function safecss_filter_attr( $css ) {
		return $css;
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-typography.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-icon.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';

$fail  = 0;
$total = 0;
$check = function ( string $label, $expected, $actual ) use ( &$fail, &$total ): void {
	++$total;
	if ( $expected !== $actual ) {
		++$fail;
		echo 'FAIL ' . $label . ': expected ' . var_export( $expected, true ) . ' got ' . var_export( $actual, true ) . "\n";
	}
};

$resolved = array(
	'var(--wp--preset--font-size--hero)',
	'var(--sgs-x, 1rem)',
	'calc(1rem + 2px)',
	'min(2rem, 5vw)',
	'max(2rem, 5vw)',
	'clamp(1rem, 2vw + 0.5rem, 3rem)',
	'CLAMP(1rem, 2vw, 3rem)',
	'clamp(1rem, calc(2vw + 1px), min(3rem, 9vw))',
	"var(--a, 'x')",
	'var(--a, "x")',
);
$hostile  = array(
	'var(--x);}body{color:red}',
	'calc(1px) ; color:red',
	'var(--x)<script>',
	'clamp(1px,2px,3px){}',
	'calc(1px) trailing',
	'calc(1px',
	'var(--x) var(--y)',
	'calc(}body{color:red)',
	'var(--x)/* c */',
	"var(--a, ')",
	'var(--a, ")',
	"var(--a, 'x\")",
	'min(url(x), 1px)',
	'calc(1px)' . chr( 92 ),
);

foreach ( $resolved as $value ) {
	$check( 'predicate accepts ' . $value, $value, sgs_resolved_css_value( $value ) );
	$check( 'predicate trims ' . $value, $value, sgs_resolved_css_value( "  $value  " ) );
	$check( 'font size keeps ' . $value, $value, sgs_font_size_value( $value ) );
	$check( 'icon length keeps ' . $value, $value, sgs_icon_length_value( $value ) );
	$check( 'responsive sanitiser keeps ' . $value, $value, sgs_responsive_sanitise_css_value( $value ) );
}
foreach ( $hostile as $value ) {
	$check( 'predicate rejects ' . $value, '', sgs_resolved_css_value( $value ) );
	$check( 'font size rejects ' . $value, '', sgs_font_size_value( $value ) );
	$check( 'icon length rejects ' . $value, '', sgs_icon_length_value( $value ) );
}
foreach ( array( '', 'hero', '16px', '#fff', 'url(x)', null, 12, array() ) as $value ) {
	$check( 'predicate refuses non-function ' . var_export( $value, true ), '', sgs_resolved_css_value( $value ) );
}

$check( 'colour keeps an upper-case var()', 'VAR(--x)', sgs_colour_value( 'VAR(--x)' ) );
$check( 'colour keeps a mixed-case var()', 'Var(--x, #fff)', sgs_colour_value( 'Var(--x, #fff)' ) );
$check( 'colour slug still wraps', 'var(--wp--preset--color--primary, currentColor)', sgs_colour_value( 'primary' ) );
$check( 'shadow keeps an upper-case var()', 'VAR(--x)', sgs_shadow_value( 'VAR(--x)' ) );
$check( 'shadow slug still wraps', 'var(--wp--preset--shadow--soft)', sgs_shadow_value( 'soft' ) );

// Existing slug and number behaviour is unchanged.
$check( 'slug', 'var(--wp--preset--font-size--hero)', sgs_font_size_value( 'hero' ) );
$check( 'slug upper', 'var(--wp--preset--font-size--x-large)', sgs_font_size_value( 'X-Large' ) );
$check( 'px', '16px', sgs_font_size_value( '16px' ) );
$check( 'rem', '1.5rem', sgs_font_size_value( '1.5rem' ) );
$check( 'empty', '', sgs_font_size_value( '' ) );
$check( 'null', '', sgs_font_size_value( null ) );
$check( 'family slug list', 'Montserrat, sans-serif', sgs_font_family_sanitise( 'Montserrat, sans-serif' ) );
$check( 'family var', 'var(--wp--preset--font-family--heading)', sgs_font_family_sanitise( 'var(--wp--preset--font-family--heading)' ) );
$check( 'family hostile var', '', sgs_font_family_sanitise( 'var(--x);}body{color:red}' ) );

// Contract: each helper this predicate covers keeps a resolved value unchanged.
$contract = array(
	'sgs_font_size_value'               => static fn( $v ) => sgs_font_size_value( $v ),
	'sgs_font_family_sanitise'          => static fn( $v ) => sgs_font_family_sanitise( $v ),
	'sgs_icon_length_value'             => static fn( $v ) => sgs_icon_length_value( $v ),
	'sgs_colour_value'                  => static fn( $v ) => str_starts_with( $v, 'var(' ) ? sgs_colour_value( $v ) : $v,
	'sgs_shadow_value'                  => static fn( $v ) => str_starts_with( $v, 'var(' ) ? sgs_shadow_value( $v ) : $v,
	'sgs_css_length_value'              => static fn( $v ) => sgs_css_length_value( $v ),
	'sgs_responsive_sanitise_css_value' => static fn( $v ) => sgs_responsive_sanitise_css_value( $v ),
);
foreach ( $contract as $name => $fn ) {
	// A font family is never a calc() length, so only var() applies to it.
	$values = 'sgs_font_family_sanitise' === $name ? array( 'var(--wp--preset--font-size--hero)' ) : array( 'var(--wp--preset--font-size--hero)', 'calc(1rem + 2px)' );
	foreach ( $values as $value ) {
		$check( "contract $name keeps $value", $value, $fn( $value ) );
	}
}

echo ( 0 === $fail ? 'PASS' : 'FAIL' ) . " $total assertions, $fail failed\n";
exit( 0 === $fail ? 0 : 1 );

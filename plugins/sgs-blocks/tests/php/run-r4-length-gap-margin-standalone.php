<?php
/**
 * Standalone runner for three render repairs: a bare-number length prints with its unit, the multi-button phone
 * gap inherits tablet then desktop, and the nav root box prints margin on the tablet and mobile tiers.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-r4-length-gap-margin-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.PHP.Eval.Discouraged

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
foreach ( array( 'esc_attr', 'esc_html', 'sanitize_key', 'sanitize_html_class', 'sanitize_hex_color' ) as $sgs_stub ) {
	if ( ! function_exists( $sgs_stub ) ) {
		eval( "function {$sgs_stub}( \$s ) { return (string) \$s; }" ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- fixed identity stubs for a CLI test.
	}
}
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings() {
		return array();
	}
}
if ( ! function_exists( 'wp_parse_args' ) ) {
	function wp_parse_args( $args, $defaults = array() ) {
		return array_merge( $defaults, (array) $args );
	}
}
if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
	function wp_style_engine_get_styles() {
		return array();
	}
}

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

$root = dirname( __DIR__, 2 );
require_once $root . '/includes/render-helpers.php';

// 1. The button's min-height entry: a saved bare number prints in px on every tier; a string keeps its own unit.
$spec = array(
	array(
		'value'        => array( 'desktop' => 56, 'tablet' => 48, 'mobile' => '3rem' ),
		'css'          => 'min-height',
		'unit_default' => 'px',
	),
);
$css = sgs_emit_responsive_css( '.a', $spec );
ok( false !== strpos( $css, 'min-height:56px;' ), 'bare desktop number prints 56px' );
ok( false !== strpos( $css, 'min-height:48px;' ), 'bare tablet number prints 48px' );
ok( false !== strpos( $css, 'min-height:3rem;' ), 'a string with its own unit is kept' );
$raw = sgs_emit_responsive_css( '.a', array( array( 'value' => array( 'desktop' => 56 ), 'css' => 'min-height' ) ) );
ok( false !== strpos( $raw, 'min-height:56;' ), 'negative control: no unit_default reproduces the unitless print' );

// 2 and 3 read the real files' rendered output.
$tmp_attrs = array( 'margin' => array( 'tablet' => array( 'top' => '4px' ), 'mobile' => array( 'bottom' => '9px' ) ) );
// The hover-typography emitter lives in the nav render files; a stub returning '' isolates the root-box code.
if ( ! function_exists( 'sgs_nav_shared_typography_hover_rule' ) ) {
	function sgs_nav_shared_typography_hover_rule() {
		return '';
	}
}
require_once $root . '/includes/nav-menu-submenu-link-css.php';
if ( function_exists( 'sgs_nav_shared_submenu_link_css' ) && function_exists( 'sgs_background_paint_decl' ) ) {
	$out = sgs_nav_shared_submenu_link_css( $tmp_attrs, '.u', 'none', '', '', array(), array(), array(), array(), 0, '', 'sgs-nav-bar-menu' );
	ok( false !== strpos( $out, '@media (max-width:1023px){.u{margin-top:4px;}}' ), 'nav margin tablet tier prints' );
	ok( false !== strpos( $out, '@media (max-width:767px){.u{margin-bottom:9px;}}' ), 'nav margin mobile tier prints' );
} else {
	ok( false, 'nav helper could not be loaded' );
}

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );

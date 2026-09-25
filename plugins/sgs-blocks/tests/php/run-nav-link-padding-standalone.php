<?php
/**
 * Standalone runner for `itemPadding` on sgs/nav-bar-menu (the top-level link
 * padding, handed to lane A by the Eye Care build: 8px 12px was hardcoded).
 *
 * Calls the REAL includes/nav-menu-css.php::sgs_nav_shared_item_state_css()
 * and checks: per-side padding per tier on the link, the left side published
 * as --sgs-nav-link-pad-start, the hover padding shift adding to it (12px
 * fallback when unset), and no padding rule at all when itemPadding is empty.
 * Negative control: the pre-change file (d95f232c0, the parent of the change)
 * emits no padding rule and a hover shift hardcoded to 12px.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-nav-link-padding-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// ── Minimal WordPress function stubs ────────────────────────────────────────
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
// Defined in each menu block's render.php (not loadable here); it builds the
// typography hover rule, which this test does not assert on.
if ( ! function_exists( 'sgs_nav_shared_typography_hover_rule' ) ) {
	function sgs_nav_shared_typography_hover_rule( ...$args ) {
		return '';
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
require_once $root . '/includes/nav-menu-item-border-featured-css.php';
require_once $root . '/includes/nav-menu-treatments.php';
require_once $root . '/includes/nav-menu-css.php';

$link  = '.u .sgs-nav-bar-menu__link';
$attrs = array(
	'itemPadding'           => array(
		'desktop' => array(
			'top'    => '10px',
			'right'  => '20px',
			'bottom' => '10px',
			'left'   => '20px',
		),
		'mobile'  => array( 'left' => 'var(--wp--preset--spacing--20)' ),
	),
	'itemPaddingShiftHover' => '8px',
);
$css   = sgs_nav_shared_item_state_css( $attrs, '.u', 'sgs-nav-bar-menu', array() );

ok( false !== strpos( $css, $link . '{padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;--sgs-nav-link-pad-start:20px;}' ), 'desktop: four sides on the link, the left side published as --sgs-nav-link-pad-start' );
ok( false !== strpos( $css, '@media (max-width:767px){' . $link . '{padding-left:var(--wp--preset--spacing--20);--sgs-nav-link-pad-start:var(--wp--preset--spacing--20);}}' ), 'mobile: a spacing preset on one side overrides only that side, and the variable follows it' );
ok( false === strpos( $css, '@media (max-width:1023px){' . $link . '{padding' ), 'tablet: unset, so no tablet padding rule (desktop carries through)' );
ok( false !== strpos( $css, 'padding-inline-start:calc(var(--sgs-nav-link-pad-start, 12px) + 8px)' ), 'the hover shift adds to the resting left padding, with the 12px default as fallback' );

$empty = sgs_nav_shared_item_state_css( array( 'itemPadding' => array() ), '.u', 'sgs-nav-bar-menu', array() );
ok( false === strpos( $empty, 'padding' ), 'an empty itemPadding emits no padding rule, so style.css keeps 8px 12px' );

// ── Negative control: the pre-change file ───────────────────────────────────
$old = shell_exec( 'git show d95f232c0:plugins/sgs-blocks/includes/nav-menu-css.php' );
ok( is_string( $old ) && '' !== trim( $old ), 'negative control: the pre-change nav-menu-css.php was read from git (d95f232c0)' );
if ( is_string( $old ) && '' !== trim( $old ) ) {
	$old = str_replace( 'sgs_nav_shared_item_state_css', 'sgs_old_nav_shared_item_state_css', $old );
	$old = preg_replace( '/^<\?php/', '', $old );
	// Safe: the evaluated text is this repository's own committed file at a pinned commit, never input.
	eval( $old );
	$old_css = sgs_old_nav_shared_item_state_css( $attrs, '.u', 'sgs-nav-bar-menu', array() );
	ok( false === strpos( $old_css, 'padding-top:10px' ) && false !== strpos( $old_css, 'calc(12px + 8px)' ), 'negative control: the pre-change file ignores itemPadding and hardcodes the shift to 12px (so the tests above can fail)' );
}

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

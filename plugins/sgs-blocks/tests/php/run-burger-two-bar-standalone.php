<?php
/**
 * Standalone runner for the two-bar burger (`burgerBarCount`, M-27 residue).
 * See `.claude/reports/2026-09-25-two-bar-burger-design.md`.
 *
 * Calls the REAL `sgs_nav_bar_menu_burger_toggle_markup()` and compares it
 * with the pre-change function read from git (commit 35e94bde1, the parent of
 * the change), so the three-bar default is proven byte-identical and the
 * two-bar assertions are proven able to fail.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-burger-two-bar-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// ── Minimal WordPress function stubs ────────────────────────────────────────
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ): string {
		$filtered = filter_var( (string) $url, FILTER_SANITIZE_URL );
		return $filtered ? $filtered : '';
	}
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( $text, $domain = 'default' ): string {
		return esc_attr( $text );
	}
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( $text, $domain = 'default' ): string {
		return esc_html( $text );
	}
}
if ( ! function_exists( '__' ) ) {
	function __( $text, $domain = 'default' ): string {
		return $text;
	}
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $val ): int {
		return abs( (int) $val );
	}
}
if ( ! function_exists( 'wp_parse_url' ) ) {
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url -- CLI stub.
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

require_once dirname( __DIR__, 2 ) . '/includes/helpers-item-effects.php';
require_once dirname( __DIR__, 2 ) . '/includes/nav-menu-markup.php';

// The pre-change function, renamed so both can be called side by side.
$old_source = shell_exec( 'git show 35e94bde1:plugins/sgs-blocks/includes/nav-menu-markup.php' );
ok( is_string( $old_source ) && '' !== trim( $old_source ), 'negative control: the pre-change nav-menu-markup.php was read from git (35e94bde1)' );
$old_start = is_string( $old_source ) ? strpos( $old_source, "if ( ! function_exists( 'sgs_nav_bar_menu_burger_toggle_markup' ) ) {" ) : false;
ok( false !== $old_start, 'negative control: the pre-change burger toggle function is found (the last block in that file)' );
if ( false === $old_start ) {
	echo "\n$pass passed, $fail failed\n";
	exit( 1 );
}
// Safe: the evaluated text is this repository's own committed file at a pinned commit, never input.
eval( str_replace( 'sgs_nav_bar_menu_burger_toggle_markup', 'sgs_old_nav_bar_menu_burger_toggle_markup', substr( $old_source, $old_start ) ) );

// ── Three bars: byte-identical to the pre-change output ─────────────────────
$roll  = array(
	'roll'  => 'slide',
	'hover' => 'Hover',
	'open'  => 'Close',
);
$calls = array(
	'icon, default glyph, x'            => array( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', true, 768, 'x' ),
	'icon, default glyph, x-rotate'     => array( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', true, 1024, 'x-rotate' ),
	'icon-and-text, default glyph, roll' => array( '', 'sgs-nav-drawer', '<svg></svg>', 'icon-and-text', 'Menu', '', '', true, 768, 'line', 'before', $roll ),
	'icon, custom glyph'                => array( '', 'sgs-nav-drawer', '<svg class="custom"></svg>', 'icon', '', '', '', false, 768, 'x' ),
	'text only'                         => array( '', 'sgs-nav-drawer', '<svg></svg>', 'text', 'Menu', '', '', true, 768, 'none', 'after', array() ),
);
foreach ( $calls as $label => $args ) {
	$old     = sgs_old_nav_bar_menu_burger_toggle_markup( ...$args );
	$default = sgs_nav_bar_menu_burger_toggle_markup( ...$args );
	$full    = $args + array( 10 => 'after', 11 => array() );
	$three   = sgs_nav_bar_menu_burger_toggle_markup( ...array_merge( $full, array( 3 ) ) );
	ok( $old === $default, "three bars byte-identical, count omitted: $label" );
	ok( $old === $three, "three bars byte-identical, count 3 passed: $label" );
}

// ── Two bars ────────────────────────────────────────────────────────────────
$two_args = array( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', true, 768, 'x', 'after', array(), 2 );
$two      = sgs_nav_bar_menu_burger_toggle_markup( ...$two_args );
ok( 2 === substr_count( $two, '<span class="sgs-nav-bar-menu__burger-bar"></span>' ), 'two bars: exactly two bar spans' );
ok( false !== strpos( $two, 'class="sgs-nav-bar-menu__burger-icon sgs-nav-bar-menu__burger-icon--two-bar"' ), 'two bars: the icon carries the --two-bar modifier' );
ok( false !== strpos( $two, 'data-sgs-nav-burger-morph="x"' ), 'two bars: the morph attribute still rides on the button' );

$off_list = sgs_nav_bar_menu_burger_toggle_markup( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', true, 768, 'x', 'after', array(), 5 );
ok( 3 === substr_count( $off_list, 'sgs-nav-bar-menu__burger-bar' ) && false === strpos( $off_list, '--two-bar' ), 'an off-list count (5) falls back to three bars' );

$custom_two = sgs_nav_bar_menu_burger_toggle_markup( '', 'sgs-nav-drawer', '<svg class="custom"></svg>', 'icon', '', '', '', false, 768, 'x', 'after', array(), 2 );
ok( false === strpos( $custom_two, 'burger-bar' ) && false !== strpos( $custom_two, '<svg class="custom"></svg>' ), 'a custom icon ignores the count and keeps its own glyph' );

// Negative control: the pre-change function given a count of 2 still draws three.
$old_two = sgs_old_nav_bar_menu_burger_toggle_markup( ...$two_args );
ok( 3 === substr_count( $old_two, 'sgs-nav-bar-menu__burger-bar' ) && false === strpos( $old_two, '--two-bar' ), 'negative control: the pre-change function ignores the count and draws three bars (so the two-bar tests can fail)' );

// ── render.php resolves the attribute and hands it to the helper ────────────
$render_source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-bar-menu/render.php' );
ok( false !== strpos( $render_source, "\$sgs_nm_burger_bar_count = 2 === (int) ( \$attributes['burgerBarCount'] ?? 3 ) ? 2 : 3;" ), 'render.php resolves burgerBarCount to 2 or 3' );
ok( 1 === preg_match( '/\$sgs_nm_burger_bar_count\s*\)\s*:\s*\'\';/', $render_source ), 'render.php passes the resolved count as the helper\'s last argument' );

// ── style.css carries a two-bar pose for every moving morph ─────────────────
$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-bar-menu/style.css' );
foreach ( array( 'x', 'x-rotate', 'line' ) as $morph ) {
	ok( false !== strpos( $css, '[data-sgs-nav-burger-morph="' . $morph . '"][aria-expanded="true"] .sgs-nav-bar-menu__burger-icon--two-bar .sgs-nav-bar-menu__burger-bar:nth-child(2)' ), "style.css: a two-bar pose for the bottom bar under $morph" );
}

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

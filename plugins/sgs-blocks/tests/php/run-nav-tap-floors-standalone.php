<?php
/**
 * Standalone runner for ruling 11 on the shared nav helpers: a size the client set lifts the 44px tap floor.
 *
 * Calls the real helpers and checks what they print: the burger's size rule carries --sgs-burger-tap-min:0px, a caret
 * size prints --sgs-nav-caret-tap-min:0px, caretBoxSize prints --sgs-ndm-caret-tap-min:0px per tier, itemMinHeight also
 * prints --sgs-nav-item-min-h (which the link-bearing sub-toggle reads), and nothing set prints none of them.
 * The tap areas themselves are measured by tests/playwright/tap-area-cases/tapFix.mjs.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-nav-tap-floors-standalone.php
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
require_once $root . '/includes/nav-menu-item-padding-css.php';
require_once $root . '/includes/nav-menu-caret-css.php';
require_once $root . '/includes/nav-drawer-menu-caret-box-css.php';
require_once $root . '/includes/nav-menu-trigger-css.php';

// Burger: the size rule carries the flag in every tier it prints.
$burger = sgs_nav_bar_menu_trigger_css( array( 'burgerSize' => '30px' ), '.u' );
ok( false !== strpos( $burger, '.u .sgs-nav-bar-menu__burger{width:30px;height:30px;min-width:30px;min-height:30px;--sgs-burger-tap-min:0px;}' ), 'burger: a set size prints width, height, min-width, min-height and the hit-area flag in one rule' );
$burger_default = sgs_nav_bar_menu_trigger_css( array(), '.u' );
ok( false !== strpos( $burger_default, 'width:44px;height:44px;min-width:44px;min-height:44px;--sgs-burger-tap-min:0px;' ), 'burger: the 44px default prints its own size, so the hit area is the 44px box' );
$burger_tier = sgs_nav_bar_menu_trigger_css( array( 'burgerWidth' => array( 'mobile' => '30px' ) ), '.u' );
ok( false !== strpos( $burger_tier, '@media (max-width:767px){.u .sgs-nav-bar-menu__burger{width:30px;height:44px;min-width:30px;min-height:44px;--sgs-burger-tap-min:0px;}}' ), 'burger: a mobile-only width prints the flag with that tier\'s rule' );

// Caret size: the sub-toggle hit area flag follows it.
$caret = sgs_nav_menu_caret_css( '.u', 'sgs-nav-bar-menu', array( 'submenuCaretSize' => '12px' ) );
ok( false !== strpos( $caret, '.u{--sgs-nav-caret-tap-min:0px;}' ), 'caret: a set submenuCaretSize prints --sgs-nav-caret-tap-min:0px' );
ok( false === strpos( sgs_nav_menu_caret_css( '.u', 'sgs-nav-bar-menu', array() ), 'tap-min' ), 'caret: no size, no flag' );

// Drawer expander: caretBoxSize prints the flag only in the tiers it is set.
$box_mobile = sgs_nav_drawer_menu_caret_box_css( array( 'caretBoxSize' => array( 'mobile' => '30px' ) ), '.u' );
ok( 1 === preg_match( '/@media \(max-width:767px\)\{\.u\{--sgs-ndm-caret-tap-min:0px;\}\}/', $box_mobile ) && 1 === substr_count( $box_mobile, '--sgs-ndm-caret-tap-min' ), 'drawer expander: a mobile-only caretBoxSize lifts the floor at mobile only' );
$box_desktop = sgs_nav_drawer_menu_caret_box_css( array( 'caretBoxSize' => array( 'desktop' => '30px' ) ), '.u' );
ok( false !== strpos( $box_desktop, '.u{--sgs-ndm-caret-tap-min:0px;}' ), 'drawer expander: a desktop caretBoxSize prints the flag outside any media query' );
ok( false === strpos( sgs_nav_drawer_menu_caret_box_css( array( 'caretBoxBg' => 'primary' ), '.u' ), 'tap-min' ), 'drawer expander: a fill without a size keeps the floor' );

// itemMinHeight: the link rule and the property the link-bearing sub-toggle reads.
$padding = sgs_nav_item_padding_css( '.u', 'sgs-nav-bar-menu', array( 'itemMinHeight' => array( 'desktop' => 30 ) ) );
ok( false !== strpos( $padding, '.u .sgs-nav-bar-menu__link{min-height:30px;--sgs-nav-item-min-h:30px;}' ), 'item height: itemMinHeight prints min-height and --sgs-nav-item-min-h' );
ok( false === strpos( sgs_nav_item_padding_css( '.u', 'sgs-nav-bar-menu', array() ), 'min-h' ), 'item height: unset prints neither' );

// The link-bearing sub-toggle reads that property with 44px as the fallback.
$submenu_link = (string) file_get_contents( $root . '/includes/nav-menu-submenu-link-css.php' );
ok( false !== strpos( $submenu_link, "__link{min-width:44px;min-height:var(--sgs-nav-item-min-h, 44px);padding:0;}" ), 'sub-toggle link: min-height reads --sgs-nav-item-min-h, 44px when unset' );

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

<?php
/**
 * Standalone runner for the nav drawer's itemTrailingIconPosition and the accordion expander height
 * (includes/nav-drawer-menu-parity-css.php). Unset gives no new CSS (negative control); 'row-end' and
 * itemMinHeight give the new rules.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-nav-drawer-trailing-position-standalone.php
 * Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
$inc = dirname( __DIR__, 2 ) . '/includes/';
require_once $inc . 'helpers-tokens.php';
require_once $inc . 'helpers-responsive.php';
require_once $inc . 'nav-drawer-menu-parity-css.php';

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

$scope = '#u1';
$link  = $scope . ' .sgs-nav-drawer-menu__link';

$base = sgs_nav_drawer_menu_parity_css( array(), $scope, $link );
ok( false === strpos( $base, 'trailing-icon{margin-inline-start:auto' ), 'unset position: icon keeps its after-label margin' );
ok( false === strpos( $base, 'accordion-summary:not(' ), 'unset itemMinHeight: no expander height rule' );
ok( $base === sgs_nav_drawer_menu_parity_css( array( 'itemTrailingIconPosition' => 'after-label' ), $scope, $link ), 'after-label output equals unset output' );

$row_end = sgs_nav_drawer_menu_parity_css( array( 'itemTrailingIconPosition' => 'row-end' ), $scope, $link );
ok( false !== strpos( $row_end, '#u1 .sgs-nav-drawer-menu__trailing-icon{margin-inline-start:auto;}' ), 'row-end pushes the icon to the row end' );
ok( false !== strpos( $row_end, '--sgs-ndm-caret-tap-min,44px) - var(--sgs-ndm-trail-w,1em)) / 2)' ), 'row-end centres the icon on the expander line' );
ok( false !== strpos( $row_end, ':not(.sgs-nav-drawer-menu__item--has-submenu) > .sgs-nav-drawer-menu__link:has(> .sgs-nav-drawer-menu__trailing-icon){padding-inline-end:0;}' ), 'row-end drops the leaf row end padding' );
ok( false === strpos( $row_end, '--sgs-ndm-trail-w:' ), 'no circle: no trail-w variable' );

$ring = sgs_nav_drawer_menu_parity_css( array( 'itemTrailingIconPosition' => 'row-end', 'caretBoxOnTrailingIcon' => true, 'caretBoxSize' => array( 'desktop' => '40px', 'mobile' => '36px' ) ), $scope, $link );
ok( false !== strpos( $ring, '#u1{--sgs-ndm-trail-w:40px;}' ) && false !== strpos( $ring, '--sgs-ndm-trail-w:36px' ), 'ringed trailing icon publishes its circle width per tier' );

$min = sgs_nav_drawer_menu_parity_css( array( 'itemMinHeight' => array( 'desktop' => '72', 'mobile' => '72' ) ), $scope, $link );
ok( false !== strpos( $min, '#u1 .sgs-nav-drawer-menu__accordion-summary:not(.sgs-nav-drawer-menu__accordion-summary--row){height:72px' ), 'itemMinHeight gives the expander the link height' );

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

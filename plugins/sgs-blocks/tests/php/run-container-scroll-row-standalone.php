<?php
/**
 * Standalone runner for sgs/container's "Scroll sideways" setting
 * (includes/container-scroll-row-css.php::sgs_container_scroll_row_css).
 *
 * Checks: mobile-only ON emits the row inside (max-width:767px) only; the
 * item width is used, 80% when unset, and an unsafe width falls back to 80%;
 * off everywhere and the empty default emit nothing (every existing container
 * byte-identical); container queries add the @container twin; an empty
 * selector emits nothing; the row gets 8px of block room for a focus ring,
 * added to any band padding and margin. Negative control: the parent commit has no such
 * file, so the runner fails at its first check.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-container-scroll-row-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
function wp_get_global_settings() {
	return array();
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
if ( ! is_file( $root . '/includes/container-scroll-row-css.php' ) ) {
	ok( false, 'includes/container-scroll-row-css.php exists' );
	echo "\n$pass passed, $fail failed\n";
	exit( 1 );
}
require_once $root . '/includes/container-scroll-row-css.php';

$row = '.c>.sgs-container__inner';
$css = sgs_container_scroll_row_css( $row, array( 'scrollSideways' => array( 'desktop' => 'off', 'mobile' => 'on' ), 'scrollItemWidth' => array( 'mobile' => '236px' ) ) );
ok( 0 === strpos( $css, '@media (max-width:767px){' . $row . '{display:flex;flex-direction:row;flex-wrap:nowrap;justify-content:flex-start;align-items:stretch;overflow-x:auto;' ), '1 mobile-only: a left-to-right row from the first item, inside the mobile range' );
ok( 1 === substr_count( $css, '@media' ) && false === strpos( $css, '1024px' ) && false === strpos( $css, '768px' ), '2 nothing for desktop or tablet' );
ok( false !== strpos( $css, 'scroll-snap-type:x mandatory' ) && false !== strpos( $css, $row . '>*{flex:0 0 236px;min-width:0;scroll-snap-align:start;}' ), '3 snap row, items 236px' );
$default = sgs_container_scroll_row_css( $row, array( 'scrollSideways' => array( 'mobile' => 'on' ) ) );
ok( false !== strpos( $default, 'flex:0 0 80%' ), '4 an unset item width is 80%' );
$unsafe = sgs_container_scroll_row_css( $row, array( 'scrollSideways' => array( 'mobile' => 'on' ), 'scrollItemWidth' => array( 'mobile' => '1px;}body{display:none' ) ) );
ok( false !== strpos( $unsafe, 'flex:0 0 80%' ) && false === strpos( $unsafe, 'body{' ), '5 an unsafe width falls back to 80%' );
ok( '' === sgs_container_scroll_row_css( $row, array() ) && '' === sgs_container_scroll_row_css( $row, array( 'scrollSideways' => array( 'desktop' => 'off' ) ) ), '6 off or unset emits nothing' );
$cq = sgs_container_scroll_row_css( $row, array( 'scrollSideways' => array( 'mobile' => 'on' ) ), true );
ok( false !== strpos( $cq, '@container (max-width:767px){' ), '7 container queries add the @container twin' );
ok( '' === sgs_container_scroll_row_css( '', array( 'scrollSideways' => array( 'mobile' => 'on' ) ) ), '8 no selector, nothing' );
$padded = sgs_container_scroll_row_css( $row, array( 'scrollSideways' => array( 'mobile' => 'on' ) ), false, array( 'desktop' => array( 'left' => '24px', 'right' => 'var:preset|spacing|30' ) ) );
ok( false !== strpos( $padded, 'scroll-padding-inline-start:24px;scroll-padding-inline-end:var(--wp--preset--spacing--30);' ), '9 band side padding becomes scroll padding (preset resolved)' );
$ring = sgs_container_scroll_row_css( $row, array( 'scrollSideways' => array( 'mobile' => 'on' ) ) );
ok( false !== strpos( $ring, 'padding-block-start:8px;margin-block-start:-8px;padding-block-end:8px;margin-block-end:-8px;' ), '10 8px of block room for a focus ring, taken back by a negative margin' );
$banded = sgs_container_scroll_row_css( $row, array( 'scrollSideways' => array( 'mobile' => 'on' ) ), false, array( 'mobile' => array( 'top' => '20px' ) ), array( 'mobile' => array( 'bottom' => 'var:preset|spacing|20' ) ) );
ok( false !== strpos( $banded, 'padding-block-start:calc(20px + 8px);margin-block-start:-8px;padding-block-end:8px;margin-block-end:calc(var(--wp--preset--spacing--20) - 8px);' ), '11 band padding and band margin are added to, not replaced' );

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

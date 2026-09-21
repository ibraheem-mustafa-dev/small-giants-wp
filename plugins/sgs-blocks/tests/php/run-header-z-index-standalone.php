<?php
/**
 * Standalone runner for the per-tier header z-index (Wave 3C U-1).
 *
 * Exercises includes/sgs-header-z-index.php with plain PHP, no PHPUnit. Exits
 * non-zero on any failure.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-header-z-index-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators and direct echo are
// the established run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $data ) {
		return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- CLI stub.
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 2 ) . '/includes/sgs-header-z-index.php';

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

$sel = '.hdr';

// Nothing authored: byte-identical CSS (the base rule carries the 100).
ok( '' === sgs_header_z_index_css( $sel, array() ), 'no zIndex: emits nothing' );
ok( '' === sgs_header_z_index_css( $sel, array( 'zIndex' => array() ) ), 'empty zIndex object: emits nothing' );
ok( '' === sgs_header_z_index_css( $sel, array( 'zIndex' => array( 'desktop' => 100 ) ) ), 'desktop equal to the default: emits nothing' );

// Desktop only: tablet and mobile inherit, so no media queries.
$css = sgs_header_z_index_css( $sel, array( 'zIndex' => array( 'desktop' => 10 ) ), true );
ok( '.hdr{z-index:10;}:root{--sgs-header-z:10;}' === $css, 'desktop 10: one rule plus the published variable, no media query' );

// Mobile only.
$css = sgs_header_z_index_css( $sel, array( 'zIndex' => array( 'mobile' => 999 ) ), true );
ok( '@media (max-width:767px){.hdr{z-index:999;}:root{--sgs-header-z:999;}}' === $css, 'mobile 999 only: a mobile media rule and nothing else' );

// wearecollins: 999 at mobile, 9 above.
$css = sgs_header_z_index_css( $sel, array( 'zIndex' => array( 'desktop' => 9, 'mobile' => 999 ) ), true );
ok( false !== strpos( $css, '.hdr{z-index:9;}' ) && false !== strpos( $css, '@media (max-width:767px){.hdr{z-index:999;}' ), 'desktop 9, mobile 999 (wearecollins)' );

// A narrower tier set back to the default still emits (it differs from the wider tier).
$css = sgs_header_z_index_css( $sel, array( 'zIndex' => array( 'desktop' => 10, 'mobile' => 100 ) ), true );
ok( false !== strpos( $css, '@media (max-width:767px){.hdr{z-index:100;}' ), 'mobile set back to 100 after desktop 10 still emits' );

// Values are clamped, never emitted raw.
ok( array( 'desktop' => 99998, 'tablet' => 99998, 'mobile' => 99998 ) === sgs_header_z_index_tiers( array( 'zIndex' => array( 'desktop' => 999999 ) ) ), 'above the ceiling clamps to 99998' );
ok( 0 === sgs_header_z_index_tiers( array( 'zIndex' => array( 'desktop' => -5 ) ) )['desktop'], 'negative clamps to 0' );
ok( null === sgs_header_z_index_tiers( array( 'zIndex' => array( 'desktop' => 'auto' ) ) )['desktop'], 'a non-numeric value (auto) is dropped, not emitted' );
$css = sgs_header_z_index_css( $sel, array( 'zIndex' => array( 'desktop' => 'expression(x)' ) ) );
ok( '' === $css, 'a junk string emits nothing' );

// A header that may not publish still sets its own z-index.
$css = sgs_header_z_index_css( $sel, array( 'zIndex' => array( 'desktop' => 10 ) ), false );
ok( '.hdr{z-index:10;}' === $css, 'a non-first header emits its z-index without publishing the variable' );

// The publisher slot is claimed only by a header that has a value to publish.
// (Each case below runs in the same request, in order.)
$empty_header  = sgs_header_z_index_css( '.a', array() );
$first_pub     = sgs_header_z_index_css( '.b', array( 'zIndex' => array( 'desktop' => 10 ) ) );
$second_pub    = sgs_header_z_index_css( '.c', array( 'zIndex' => array( 'desktop' => 20 ) ) );
ok( '' === $empty_header, 'a header with nothing authored emits nothing' );
ok( false !== strpos( $first_pub, ':root{--sgs-header-z:10;}' ), 'the first header WITH a value publishes, even after an empty one' );
ok( '.c{z-index:20;}' === $second_pub, 'a later header keeps its own z-index but does not publish' );
// NEGATIVE CONTROL: an empty header must not have used up the slot.
ok( false === sgs_header_z_index_may_publish(), 'the slot is now taken' );

// The merge no longer carries z-index, so a tier cancel cannot revert it.
$props_with_z = array( 'position' => 'sticky', 'top' => '0', 'z-index' => '100' );
$props_no_z   = array( 'position' => 'sticky', 'top' => '0' );
$sticky_desktop_only = array( 'desktop' => 'on', 'tablet' => 'on', 'mobile' => 'off' );

$old = sgs_merge_tri_state_declarations( $sel, array( array( 'raw' => $sticky_desktop_only, 'props' => $props_with_z ) ), 'off' );
$new = sgs_merge_tri_state_declarations( $sel, array( array( 'raw' => $sticky_desktop_only, 'props' => $props_no_z ) ), 'off' );
ok( false !== strpos( $old, 'z-index:revert !important' ), 'NEGATIVE CONTROL: with z-index inside the merge, the off tier reverts it' );
ok( false === strpos( $new, 'z-index' ), 'without z-index in the merge, no tier can revert it' );
ok( false !== strpos( $new, 'position:revert !important' ), 'position is still cancelled by the merge (unchanged behaviour)' );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );

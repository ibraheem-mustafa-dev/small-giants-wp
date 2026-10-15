<?php
/**
 * Standalone test for `Sgs_Motion_Draw_Asset` (Spec 38A FR-38A-52; build unit M5.14): which SVG and trigger a part's
 * `draw` layer holds, as `sgs/responsive-logo/render.php` reads them.
 *
 * Run it with:
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-draw-asset-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace SGS\Blocks\Motion {

	define( 'ABSPATH', sys_get_temp_dir() . DIRECTORY_SEPARATOR );
	require_once dirname( __DIR__, 2 ) . '/includes/motion/class-sgs-motion-draw-asset.php';

	$pass = 0;
	$fail = 0;

	function ok( bool $cond, string $label, string $detail = '' ): void {
		global $pass, $fail;
		if ( $cond ) {
			++$pass;
			echo "PASS  $label\n";
		} else {
			++$fail;
			echo "FAIL  $label" . ( '' !== $detail ? "  => $detail" : '' ) . "\n";
		}
	}

	$load  = array( 'entrance' => array( 'text' => array( array( 'id' => 'draw', 'effect' => 'draw', 'trigger' => 'load', 'values' => array( 'asset' => 12 ) ) ) ) );
	$hover = array( 'effects' => array( array( 'id' => 'draw', 'effect' => 'draw', 'trigger' => 'hover', 'values' => array( 'asset' => 13 ) ) ) );

	ok( array( 'asset' => 12, 'trigger' => 'load' ) === Sgs_Motion_Draw_Asset::find( $load ), 'an entrance.text draw layer gives its asset and load trigger' );
	ok( array( 'asset' => 13, 'trigger' => 'hover' ) === Sgs_Motion_Draw_Asset::find( $hover ), 'an effects draw layer gives its asset and hover trigger' );
	$no_trigger = array( 'entrance' => array( 'text' => array( array( 'id' => 'draw', 'effect' => 'draw', 'values' => array( 'asset' => 5 ) ) ) ) );
	ok( array( 'asset' => 5, 'trigger' => 'scroll' ) === Sgs_Motion_Draw_Asset::find( $no_trigger ), 'a layer with no trigger draws on scroll, as fx-draw.js does' );
	$state = array( 'entrance' => array( 'text' => array( array( 'id' => 'draw', 'effect' => 'draw', 'trigger' => 'state', 'values' => array( 'asset' => 5 ) ) ) ) );
	ok( 'scroll' === Sgs_Motion_Draw_Asset::find( $state )['trigger'], 'a trigger the draw runtime does not take falls back to scroll' );

	// Negative controls: nothing to draw.
	ok( null === Sgs_Motion_Draw_Asset::find( null ) && null === Sgs_Motion_Draw_Asset::find( array() ), 'negative control: no element, or an element with no layers, gives null' );
	$split = array( 'entrance' => array( 'text' => array( array( 'id' => 'split-reveal', 'effect' => 'split-reveal', 'values' => array( 'asset' => 12 ) ) ) ) );
	ok( null === Sgs_Motion_Draw_Asset::find( $split ), 'negative control: a layer of another effect gives null' );
	$bad = array( 'effects' => array( array( 'effect' => 'draw', 'values' => array( 'asset' => 0 ) ), array( 'effect' => 'draw', 'values' => array( 'asset' => '12' ) ), array( 'effect' => 'draw', 'values' => array() ), 'x' ) );
	ok( null === Sgs_Motion_Draw_Asset::find( $bad ), 'negative control: a draw layer with no usable asset (0, a string, none) gives null' );

	echo "\nRESULT  $pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}

<?php
/**
 * Tests: the saved-content sweep that stores the trust bar's default ticker (`scripts/migrate-trust-bar-ticker.php`).
 *
 * Every fixture's expected block is the one the render-time filter produced (`Sgs_Motion_Ticker_Default::apply`,
 * retired by this sweep; each expectation was asserted against the filter itself in the commit that added this sweep, before the filter was deleted), so a migrated page renders exactly as it did: a bar that took the default stores the same
 * layer in the same place, and every bar that did not take it (a stored marquee under any id with `touchPause` or the
 * older `pauseOnTouch`, `wrap`, `drop`, a motion value or root effects that are not a list) is left as saved.
 *
 * Run with:
 *   vendor/bin/phpunit --filter TrustBarTickerMigrationTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

if ( ! defined( 'SGS_TRUST_BAR_TICKER_LIBRARY' ) ) {
	define( 'SGS_TRUST_BAR_TICKER_LIBRARY', true );
}
require_once dirname( __DIR__, 2 ) . '/scripts/migrate-trust-bar-ticker.php';

final class TrustBarTickerMigrationTest extends TestCase {

	private static function layer(): array {
		$layer = sgs_trust_bar_ticker_layer( dirname( __DIR__, 2 ) . '/includes/motion/data/trust-bar-default-ticker.json' );
		self::assertIsArray( $layer );
		return $layer;
	}

	private static function bar( array $attrs ): array {
		return array( 'blockName' => 'sgs/trust-bar', 'attrs' => $attrs, 'innerBlocks' => array() );
	}

	private static function motion( array $effects, array $extra = array() ): array {
		return array_merge( array( 'v' => 1, 'elements' => array( 'root' => array( 'effects' => $effects ) ) ), $extra );
	}

	/**
	 * Each case: the saved block and the block the render-time filter produced from it.
	 *
	 * @return array<string,array{0:array,1:array}>
	 */
	public static function cases(): array {
		$layer   = self::layer();
		$tilt    = array( 'id' => 'tilt-1', 'effect' => 'tilt', 'values' => array() );
		$mm_tag  = array( 'id' => 'mmtag', 'effect' => 'marquee', 'values' => array( 'speed' => 58.8, 'pauseOnTouch' => true, 'belowBreakpoint' => 'always' ) );
		$mobile  = array( 'id' => 'marquee', 'effect' => 'marquee', 'values' => array( 'touchPause' => 'hold', 'belowBreakpoint' => 'mobile' ) );
		$no_id   = array( 'effect' => 'marquee', 'values' => array() );
		$with    = static fn( array $attrs ): array => self::bar( $attrs );
		return array(
			'no setting takes the default'              => array( $with( array() ), $with( array( 'sgsMotion' => self::motion( array( $layer ) ) ) ) ),
			'an explicit ticker takes the default'      => array( $with( array( 'overflowMode' => 'ticker' ) ), $with( array( 'overflowMode' => 'ticker', 'sgsMotion' => self::motion( array( $layer ) ) ) ) ),
			'a mode in capitals counts as ticker'       => array( $with( array( 'overflowMode' => 'TICKER' ) ), $with( array( 'overflowMode' => 'TICKER', 'sgsMotion' => self::motion( array( $layer ) ) ) ) ),
			'an unknown mode counts as ticker'          => array( $with( array( 'overflowMode' => 'bogus' ) ), $with( array( 'overflowMode' => 'bogus', 'sgsMotion' => self::motion( array( $layer ) ) ) ) ),
			'wrap takes none'                           => array( $with( array( 'overflowMode' => 'wrap' ) ), $with( array( 'overflowMode' => 'wrap' ) ) ),
			'wrap in capitals takes none'               => array( $with( array( 'overflowMode' => 'WRAP' ) ), $with( array( 'overflowMode' => 'WRAP' ) ) ),
			'drop takes none'                           => array( $with( array( 'overflowMode' => 'drop' ) ), $with( array( 'overflowMode' => 'drop' ) ) ),
			'a marquee under another id, pauseOnTouch'  => array( $with( array( 'sgsMotion' => self::motion( array( $mm_tag ) ) ) ), $with( array( 'sgsMotion' => self::motion( array( $mm_tag ) ) ) ) ),
			'a mobile marquee with touchPause and drop' => array( $with( array( 'overflowMode' => 'drop', 'sgsMotion' => self::motion( array( $mobile ) ) ) ), $with( array( 'overflowMode' => 'drop', 'sgsMotion' => self::motion( array( $mobile ) ) ) ) ),
			'a mobile marquee with touchPause, ticker'  => array( $with( array( 'sgsMotion' => self::motion( array( $mobile ) ) ) ), $with( array( 'sgsMotion' => self::motion( array( $mobile ) ) ) ) ),
			'a marquee saved without an id'             => array( $with( array( 'sgsMotion' => self::motion( array( $no_id ) ) ) ), $with( array( 'sgsMotion' => self::motion( array( $no_id ) ) ) ) ),
			'another effect is kept, marquee after it'  => array( $with( array( 'sgsMotion' => self::motion( array( $tilt ) ) ) ), $with( array( 'sgsMotion' => self::motion( array( $tilt, $layer ) ) ) ) ),
			'a stored version stays'                    => array( $with( array( 'sgsMotion' => array( 'v' => 2 ) ) ), $with( array( 'sgsMotion' => array( 'v' => 2, 'elements' => array( 'root' => array( 'effects' => array( $layer ) ) ) ) ) ) ),
			'a hover on root stays beside the effects'  => array( $with( array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.02 ) ) ) ) ) ) ) ), $with( array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.02 ) ) ), 'effects' => array( $layer ) ) ) ) ) ) ),
			'elements that are not a list are replaced' => array( $with( array( 'sgsMotion' => array( 'elements' => 'x' ) ) ), $with( array( 'sgsMotion' => array( 'elements' => array( 'root' => array( 'effects' => array( $layer ) ) ), 'v' => 1 ) ) ) ),
			'a motion value that is not a list stays'   => array( $with( array( 'sgsMotion' => 'x' ) ), $with( array( 'sgsMotion' => 'x' ) ) ),
			'root effects that are not a list stay'     => array( $with( array( 'sgsMotion' => self::motion( array() , array( 'elements' => array( 'root' => array( 'effects' => 'x' ) ) ) ) ) ), $with( array( 'sgsMotion' => self::motion( array(), array( 'elements' => array( 'root' => array( 'effects' => 'x' ) ) ) ) ) ) ),
			'another block is untouched'                => array( array( 'blockName' => 'sgs/hero', 'attrs' => array() ), array( 'blockName' => 'sgs/hero', 'attrs' => array() ) ),
		);
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'cases' )]
	public function test_the_stored_block_is_the_one_the_render_filter_produced( array $saved, array $rendered ): void {
		$this->assertSame( $rendered, sgs_trust_bar_ticker_stored( $saved, self::layer() ) ?? $saved );
	}

	public function test_a_bar_at_any_depth_is_converted_and_counted(): void {
		$layer  = self::layer();
		$tree   = array(
			array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array( self::bar( array() ), self::bar( array( 'overflowMode' => 'wrap' ) ) ) ),
			self::bar( array( 'sgsMotion' => self::motion( array( array( 'id' => 'mmtag', 'effect' => 'marquee', 'values' => array( 'touchPause' => 'hold' ) ) ) ) ) ),
		);
		$found  = array();
		$out    = sgs_trust_bar_ticker_migrate( $tree, $layer, $found );
		$this->assertCount( 1, $found );
		$this->assertSame( array( $layer ), $out[0]['innerBlocks'][0]['attrs']['sgsMotion']['elements']['root']['effects'] );
		$this->assertSame( $tree[0]['innerBlocks'][1], $out[0]['innerBlocks'][1] );
		$this->assertSame( $tree[1], $out[1] );
		$again = array();
		sgs_trust_bar_ticker_migrate( $out, $layer, $again );
		$this->assertSame( array(), $again, 'a second run finds nothing' );
	}

	public function test_a_missing_or_wrong_data_file_refuses(): void {
		$this->assertNull( sgs_trust_bar_ticker_layer( __DIR__ . '/no-such-file.json' ) );
		$tmp = tempnam( sys_get_temp_dir(), 'tb' );
		file_put_contents( $tmp, '{"effect":"tilt"}' );
		$this->assertNull( sgs_trust_bar_ticker_layer( $tmp ) );
		unlink( $tmp );
	}
}

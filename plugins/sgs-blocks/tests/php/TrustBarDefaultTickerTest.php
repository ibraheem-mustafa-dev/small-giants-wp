<?php
/**
 * Tests: the trust bar's default ticker (`includes/motion/class-sgs-motion-ticker-default.php`).
 *
 * A trust bar with `overflowMode` ticker (the default) and no marquee layer of its own is given the overflow-only
 * marquee before the motion renderer and render.php read it, so it scrolls when its items do not fit. A bar that
 * stores its own layer, or `overflowMode` wrap or drop, is left as saved.
 *
 * The WordPress stand-ins load in setUp(), so every test runs in its own process.
 *
 * Run with:
 *   vendor/bin/phpunit --filter TrustBarDefaultTickerTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;
use SGS\Blocks\Motion\Sgs_Motion_Ticker_Default;

require_once __DIR__ . '/TrustBarRenderTrait.php';

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class TrustBarDefaultTickerTest extends TestCase {

	use TrustBarRenderTrait;

	private const BAR = '<div class="wp-block-sgs-trust-bar sgs-trust-bar"><div class="sgs-trust-bar__lane"><div class="sgs-trust-bar__track" data-sgs-marquee-set><span>a</span></div></div></div>';

	protected function setUp(): void {
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		if ( ! function_exists( 'sanitize_key' ) ) {
			function sanitize_key( $key ) {
				return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
			}
		}
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_is_admin'] = false;
		$GLOBALS['sgs_test_in_loop']  = false;
		$GLOBALS['sgs_test_actions']  = array();
		$GLOBALS['sgs_test_enqueued'] = array();
	}

	private function bar( array $attrs ): array {
		return Sgs_Motion_Ticker_Default::apply( array( 'blockName' => 'sgs/trust-bar', 'attrs' => $attrs, 'innerBlocks' => array() ) );
	}

	private function layers( array $block ): array {
		return $block['attrs']['sgsMotion']['elements']['root']['effects'] ?? array();
	}

	public function test_a_bar_with_no_layer_gets_the_overflow_only_marquee(): void {
		$block  = $this->bar( array() );
		$layers = $this->layers( $block );
		$this->assertCount( 1, $layers );
		$this->assertSame( 'marquee', $layers[0]['effect'] );
		$this->assertSame( 'overflow', $layers[0]['values']['belowBreakpoint'] );
		$this->assertSame( 1, $block['attrs']['sgsMotion']['v'] );
	}

	public function test_the_default_layer_is_the_one_in_the_shared_data_file(): void {
		$file = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/motion/data/trust-bar-default-ticker.json' ), true );
		$this->assertSame( $file, $this->layers( $this->bar( array() ) )[0] );
	}

	public function test_an_explicit_ticker_mode_takes_the_default_too(): void {
		$this->assertCount( 1, $this->layers( $this->bar( array( 'overflowMode' => 'ticker' ) ) ) );
	}

	public function test_a_saved_marquee_layer_is_left_exactly_as_saved(): void {
		$motion = array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'effects' => array( array( 'effect' => 'marquee', 'values' => array( 'speed' => 40, 'belowBreakpoint' => 'mobile' ) ) ) ) ),
		);
		$this->assertSame( $motion, $this->bar( array( 'sgsMotion' => $motion ) )['attrs']['sgsMotion'] );
		$with_drop = $this->bar( array( 'sgsMotion' => $motion, 'overflowMode' => 'drop' ) );
		$this->assertSame( $motion, $with_drop['attrs']['sgsMotion'] );
	}

	public function test_a_saved_drop_or_wrap_takes_no_default(): void {
		$this->assertSame( array(), $this->layers( $this->bar( array( 'overflowMode' => 'drop' ) ) ) );
		$this->assertSame( array(), $this->layers( $this->bar( array( 'overflowMode' => 'wrap' ) ) ) );
	}

	public function test_another_root_effect_is_kept_and_the_marquee_added_after_it(): void {
		$other  = array( 'effect' => 'tilt', 'values' => array() );
		$layers = $this->layers( $this->bar( array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'effects' => array( $other ) ) ) ) ) ) );
		$this->assertSame( array( 'tilt', 'marquee' ), array_column( $layers, 'effect' ) );
	}

	public function test_another_block_is_untouched(): void {
		$hero = array( 'blockName' => 'sgs/hero', 'attrs' => array() );
		$this->assertSame( $hero, Sgs_Motion_Ticker_Default::apply( $hero ) );
	}

	public function test_the_filter_runs_before_the_motion_renderer_reads_the_block(): void {
		$this->assertArrayHasKey( 5, $GLOBALS['sgs_test_filters']['render_block_data'], 'the default is added at priority 5, ahead of the renderer at 10' );
		$this->assertContains( array( Sgs_Motion_Ticker_Default::class, 'apply' ), array_column( $GLOBALS['sgs_test_filters']['render_block_data'][5], 0 ) );
	}

	public function test_a_default_ticker_prints_the_marquee_marker_the_runtime_loads_from(): void {
		$with = sgs_test_render_motion_block( $this->bar( array() ), self::BAR );
		$this->assertStringContainsString( 'data-sgs-fx="marquee"', $with );
		// The marquee runtime loads from this marker: `SGS_Motion_Registry::sniff_block` (render_block, 99) enqueues the
		// effect's modules for every `data-sgs-fx` token a block prints.

		Sgs_Motion_Renderer::reset();
		$wrap = sgs_test_render_motion_block( $this->bar( array( 'overflowMode' => 'wrap' ) ), self::BAR );
		$this->assertStringNotContainsString( 'data-sgs-fx', $wrap, 'control: a wrap bar prints no marquee marker' );
	}

	public function test_render_php_prints_the_track_for_the_default_layer_and_none_for_wrap(): void {
		$base = array( 'badgeStyle' => 'icon-circle', 'items' => $this->two_items(), 'title' => '' );
		$out  = $this->render( $this->bar( $base )['attrs'] );
		$this->assertStringContainsString( 'data-sgs-marquee-set', $out['html'] );
		$this->assertStringNotContainsString( 'data-overflow-mode', $out['html'] );

		$wrap = $this->render( $this->bar( $base + array( 'overflowMode' => 'wrap' ) )['attrs'] );
		$this->assertStringNotContainsString( 'data-sgs-marquee-set', $wrap['html'] );
	}

	public function test_render_php_keeps_drop_for_a_saved_drop_bar(): void {
		$out = $this->render( array( 'badgeStyle' => 'icon-circle', 'items' => $this->two_items(), 'overflowMode' => 'drop' ) );
		$this->assertStringContainsString( 'data-overflow-mode="drop"', $out['html'] );
	}

	public function test_a_ticker_bar_whose_saved_layer_is_range_limited_wraps_outside_the_range(): void {
		$layer = array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'effects' => array( array( 'effect' => 'marquee', 'values' => array( 'belowBreakpoint' => 'mobile' ) ) ) ) ),
		);
		$out   = $this->render( array( 'badgeStyle' => 'icon-circle', 'items' => $this->two_items(), 'sgsMotion' => $layer, 'overflowMode' => 'ticker' ) );
		$this->assertStringNotContainsString( 'data-overflow-mode', $out['html'] );
	}
}

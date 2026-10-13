<?php
/**
 * Tests: which motion assets a rendered block enqueues (Spec 38A FR-38A-16 to 21; the asset-guard rule).
 *
 * Renders fixture blocks through the shipped renderer and `includes/motion/class-sgs-motion-assets.php`, with
 * recording stand-ins for the WordPress registration and enqueue functions, and asserts the enqueued handles: a scroll
 * entrance loads the stylesheet and the reveal script, a keyframes entrance loads the stylesheet and the keyframes
 * script, a block with no motion loads nothing, and the editor hook enqueues the stylesheet only in the admin.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionAssetsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Assets;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

// The stand-ins define global WordPress functions, so every test runs in its own process.
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionAssetsTest extends TestCase {

	private const CARD = '<div class="wp-block-sgs-hero"><div class="sgs-hero__content"><p>Hi</p></div></div>';

	protected function setUp(): void {
		if ( ! defined( 'SGS_BLOCKS_URL' ) ) {
			define( 'SGS_BLOCKS_URL', 'https://example.test/sgs-blocks/' );
		}
		$this->define_stand_ins();
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css']   = array();
		$GLOBALS['sgs_test_is_admin']   = false;
		$GLOBALS['sgs_test_rest']       = false;
		$GLOBALS['sgs_test_in_loop']    = false;
		$GLOBALS['sgs_test_actions']    = array();
		$GLOBALS['sgs_test_registered'] = array();
		$GLOBALS['sgs_test_enqueued']   = array();
	}

	private function define_stand_ins(): void {
		if ( ! function_exists( 'wp_style_is' ) ) {
			function wp_style_is( $handle, $status = 'enqueued' ) {
				return in_array( $handle, $GLOBALS['sgs_test_enqueued_styles'] ?? array(), true );
			}
			function wp_script_is( $handle, $status = 'enqueued' ) {
				return isset( $GLOBALS['sgs_test_enqueued'][ 'script:' . $handle ] );
			}
		}
		$GLOBALS['sgs_test_enqueued_styles'] = array();
	}

	private function render( array $motion ): string {
		return sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/hero',
				'attrs'     => array( 'sgsMotion' => $motion ),
			),
			self::CARD
		);
	}

	private static function entrance( string $trigger, array $extra = array() ): array {
		$values = array( 'from' => array( 'opacity' => 0, 'translateY' => 24 ), 'duration' => 600 ) + $extra;
		return array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => $trigger, 'values' => $values ) ) ) ),
		);
	}

	private function assert_loaded( bool $style, bool $reveal, bool $keyframes, bool $driver, string $why ): void {
		$this->assertSame( $style, wp_style_is( 'sgs-motion', 'enqueued' ), $why . ': motion.css' );
		$this->assertSame( $reveal, wp_script_is( 'sgs-motion-reveal', 'enqueued' ), $why . ': motion-reveal.js' );
		$this->assertSame( $keyframes, wp_script_is( 'sgs-motion-keyframes', 'enqueued' ), $why . ': motion-keyframes.js' );
		$this->assertSame( $driver, isset( $GLOBALS['sgs_test_enqueued']['module:@sgs/scroll-driver'] ), $why . ': scroll driver' );
	}

	public function test_happy_scroll_entrance_loads_stylesheet_and_reveal_only(): void {
		$out = $this->render( self::entrance( 'scroll' ) );
		$this->assertStringContainsString( 'data-sgs-me="scroll', $out );
		$this->assert_loaded( true, true, false, false, 'scroll entrance' );
	}

	public function test_happy_keyframes_entrance_loads_stylesheet_and_keyframes_script(): void {
		$keyframes = array(
			array( 'offset' => 0, 'opacity' => 0 ),
			array( 'offset' => 50, 'opacity' => 1, 'translateY' => -8 ),
			array( 'offset' => 100, 'opacity' => 1, 'translateY' => 0 ),
		);
		$out       = $this->render( self::entrance( 'load', array( 'keyframes' => $keyframes ) ) );
		$this->assertStringContainsString( 'data-sgs-me-keyframes', $out );
		$this->assert_loaded( true, false, true, false, 'keyframes entrance on load' );
	}

	public function test_edge_load_entrance_loads_stylesheet_without_reveal(): void {
		$this->render( self::entrance( 'load' ) );
		$this->assert_loaded( true, false, false, false, 'load entrance' );
	}

	public function test_edge_block_without_motion_loads_nothing(): void {
		$out = sgs_test_render_motion_block( array( 'blockName' => 'sgs/hero', 'attrs' => array() ), self::CARD );
		$this->assertSame( self::CARD, $out );
		$this->assert_loaded( false, false, false, false, 'no motion' );
		$this->assertSame( array(), Sgs_Motion_Renderer::used_features() );
	}

	public function test_edge_whole_block_link_loads_stylesheet_for_the_hover_group(): void {
		sgs_test_render_motion_block( array( 'blockName' => 'sgs/hero', 'attrs' => array( 'sgsBlockLink' => 'x' ) ), self::CARD );
		$this->assert_loaded( true, false, false, false, 'hover group' );
	}

	public function test_fail_rest_preview_enqueues_nothing(): void {
		$GLOBALS['sgs_test_is_admin'] = true;
		$this->render( self::entrance( 'scroll' ) );
		$this->assert_loaded( false, false, false, false, 'admin render' );
	}

	public function test_fail_rest_request_enqueues_nothing(): void {
		$GLOBALS['sgs_test_rest'] = true;
		$this->assertTrue( wp_is_serving_rest_request(), 'the switch reaches the stand-in' );
		$this->render( self::entrance( 'scroll', array( 'keyframes' => array( array( 'offset' => 0, 'opacity' => 0 ), array( 'offset' => 100, 'opacity' => 1 ) ) ) ) );
		$reflection = new ReflectionMethod( Sgs_Motion_Renderer::class, 'note_features' );
		$reflection->invoke( null, array( 'data-sgs-scroll' => '' ), false );
		Sgs_Motion_Assets::enqueue_used();
		$this->assert_loaded( false, false, false, false, 'REST block preview' );
		$GLOBALS['sgs_test_rest'] = false;
		Sgs_Motion_Assets::enqueue_used();
		$this->assert_loaded( true, true, true, true, 'the same recorded features on a front-end request' );
	}

	public function test_edge_scroll_driver_module_follows_data_sgs_scroll(): void {
		$reflection = new ReflectionMethod( Sgs_Motion_Renderer::class, 'note_features' );
		$reflection->invoke( null, array( 'data-sgs-scroll' => '' ), false );
		Sgs_Motion_Assets::enqueue_used();
		$this->assert_loaded( false, false, false, true, 'data-sgs-scroll' );
	}

	public function test_happy_editor_hook_enqueues_stylesheet_in_admin_only(): void {
		Sgs_Motion_Assets::enqueue_editor_style();
		$this->assertFalse( wp_style_is( 'sgs-motion', 'enqueued' ), 'front end: the block-assets hook enqueues nothing' );
		$GLOBALS['sgs_test_is_admin'] = true;
		Sgs_Motion_Assets::enqueue_editor_style();
		$this->assertTrue( wp_style_is( 'sgs-motion', 'enqueued' ), 'editor: the stylesheet loads' );
	}

	public function test_happy_assets_are_registered(): void {
		$driver = SGS_BLOCKS_PATH . 'build/shared/effects/scroll-driver.js';
		$made   = ! file_exists( $driver );
		if ( $made ) {
			@mkdir( dirname( $driver ), 0777, true );
			file_put_contents( $driver, '' );
		}
		try {
			Sgs_Motion_Assets::register_assets();
		} finally {
			if ( $made ) {
				@unlink( $driver );
			}
		}
		$registered = $GLOBALS['sgs_test_registered'];
		$this->assertArrayHasKey( 'style:sgs-motion', $registered );
		foreach ( array( 'sgs-motion-reveal', 'sgs-motion-keyframes' ) as $handle ) {
			$this->assertArrayHasKey( 'script:' . $handle, $registered );
			$this->assertSame( array( 'strategy' => 'defer', 'in_footer' => true ), $registered[ 'script:' . $handle ]['args'], $handle . ' loads deferred in the footer' );
			$this->assertStringStartsWith( 'https://example.test/sgs-blocks/assets/js/', $registered[ 'script:' . $handle ]['src'] );
		}
		$this->assertArrayHasKey( 'module:@sgs/scroll-driver', $registered, 'the scroll driver registers as a script module' );
		$this->assertArrayNotHasKey( 'script:@sgs/scroll-driver', $registered );
		$this->assertStringEndsWith( 'build/shared/effects/scroll-driver.js', $registered['module:@sgs/scroll-driver']['src'] );
	}
}

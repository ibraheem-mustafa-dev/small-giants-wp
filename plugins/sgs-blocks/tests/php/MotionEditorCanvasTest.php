<?php
/**
 * Tests: the editor canvas's motion assets (Spec 38A §11, FR-38A-28; the editor and frontend asset-guard rule).
 *
 * `includes/motion/class-sgs-motion-editor-canvas.php` adds the final-state rule to `sgs-motion` and loads the preset
 * thumbnails stylesheet, in the admin only. With recording stand-ins for the WordPress asset functions, these tests
 * prove the front end never receives either, the editor receives both, and the rule is scoped so Replay wins.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionEditorCanvasTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Assets;
use SGS\Blocks\Motion\Sgs_Motion_Editor_Canvas;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

// The stand-ins define global WordPress functions, so every test runs in its own process.
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionEditorCanvasTest extends TestCase {

	protected function setUp(): void {
		if ( ! defined( 'SGS_BLOCKS_URL' ) ) {
			define( 'SGS_BLOCKS_URL', 'https://example.test/sgs-blocks/' );
		}
		if ( ! defined( 'SGS_BLOCKS_VERSION' ) ) {
			define( 'SGS_BLOCKS_VERSION', '0.0.0-test' );
		}
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		if ( ! function_exists( 'wp_add_inline_style' ) ) {
			function wp_add_inline_style( $handle, $css ) {
				$GLOBALS['sgs_test_inline_styles'][ $handle ][] = $css;
				return true;
			}
		}
		require_once SGS_BLOCKS_PATH . 'includes/motion/class-sgs-motion-renderer.php';
		require_once SGS_BLOCKS_PATH . 'includes/motion/class-sgs-motion-assets.php';
		require_once SGS_BLOCKS_PATH . 'includes/motion/class-sgs-motion-editor-canvas.php';
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css']        = array();
		$GLOBALS['sgs_test_is_admin']        = false;
		$GLOBALS['sgs_test_rest']            = false;
		$GLOBALS['sgs_test_registered']      = array();
		$GLOBALS['sgs_test_enqueued']        = array();
		$GLOBALS['sgs_test_enqueued_styles'] = array();
		$GLOBALS['sgs_test_inline_styles']   = array();
		Sgs_Motion_Assets::register_assets();
		Sgs_Motion_Editor_Canvas::register_assets();
	}

	public function test_happy_the_class_hooks_enqueue_block_assets_after_the_motion_assets(): void {
		$hooked = $GLOBALS['sgs_test_filters']['enqueue_block_assets'] ?? array();
		$this->assertArrayHasKey( 20, $hooked, 'priority 20, after Sgs_Motion_Assets at 10' );
		$this->assertSame( array( Sgs_Motion_Editor_Canvas::class, 'enqueue_editor_assets' ), $hooked[20][0][0] );
	}

	public function test_happy_thumbnails_stylesheet_is_registered_from_the_shipped_file(): void {
		$this->assertFileExists( SGS_BLOCKS_PATH . Sgs_Motion_Editor_Canvas::THUMBNAILS_PATH );
		$registered = $GLOBALS['sgs_test_registered'];
		$this->assertArrayHasKey( 'style:sgs-motion-thumbnails', $registered );
		$this->assertSame( 'https://example.test/sgs-blocks/assets/css/motion-thumbnails.css', $registered['style:sgs-motion-thumbnails']['src'] );
	}

	public function test_happy_editor_gets_the_final_state_rule_and_the_thumbnails(): void {
		$GLOBALS['sgs_test_is_admin'] = true;
		Sgs_Motion_Editor_Canvas::enqueue_editor_assets();
		$this->assertSame( array( Sgs_Motion_Editor_Canvas::final_state_css() ), $GLOBALS['sgs_test_inline_styles']['sgs-motion'] ?? null );
		$this->assertContains( 'sgs-motion-thumbnails', $GLOBALS['sgs_test_enqueued_styles'] );
	}

	public function test_edge_the_rule_prints_once_per_request(): void {
		$GLOBALS['sgs_test_is_admin'] = true;
		Sgs_Motion_Editor_Canvas::enqueue_editor_assets();
		Sgs_Motion_Editor_Canvas::enqueue_editor_assets();
		$this->assertCount( 1, $GLOBALS['sgs_test_inline_styles']['sgs-motion'], 'a second pass adds nothing' );
	}

	public function test_fail_front_end_gets_neither_the_rule_nor_the_thumbnails(): void {
		Sgs_Motion_Editor_Canvas::enqueue_editor_assets();
		$this->assertSame( array(), $GLOBALS['sgs_test_inline_styles'], 'front end: no inline rule' );
		$this->assertNotContains( 'sgs-motion-thumbnails', $GLOBALS['sgs_test_enqueued_styles'], 'front end: no thumbnails' );
	}

	public function test_fail_a_front_end_render_that_uses_motion_never_carries_the_rule(): void {
		$out = sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/hero',
				'attrs'     => array(
					'sgsMotion' => array(
						'v'        => 1,
						'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => 'scroll', 'values' => array( 'from' => array( 'opacity' => 0 ), 'duration' => 600 ) ) ) ) ),
					),
				),
			),
			'<div class="wp-block-sgs-hero"><p>Hi</p></div>'
		);
		$this->assertStringContainsString( 'data-sgs-me="scroll', $out );
		Sgs_Motion_Editor_Canvas::enqueue_editor_assets(); // The block-assets hook also fires on a front-end request.
		$this->assertContains( 'sgs-motion', $GLOBALS['sgs_test_enqueued_styles'], 'the stylesheet itself loads on the front end' );
		$this->assertSame( array(), $GLOBALS['sgs_test_inline_styles'], 'but the final-state rule does not' );
		$this->assertNotContains( 'sgs-motion-thumbnails', $GLOBALS['sgs_test_enqueued_styles'] );
	}

	public function test_edge_the_rule_resets_every_from_value_outside_a_replay_and_only_there(): void {
		$css = Sgs_Motion_Editor_Canvas::final_state_css();
		$this->assertStringStartsWith( '[data-sgs-me]:not([data-sgs-in]){', $css, 'Replay sets data-sgs-in, so Replay is outside the rule' );
		$motion = (string) file_get_contents( SGS_BLOCKS_PATH . Sgs_Motion_Assets::CSS_PATH );
		preg_match_all( '/var\(--sgs-me-from-([a-z]+(?:-[a-z])?),/', $motion, $read ); // The clip reveal's edge holders too (clip-t, clip-r, clip-b, clip-l).
		$channels = array_unique( $read[1] );
		$this->assertNotEmpty( $channels );
		foreach ( $channels as $channel ) {
			$this->assertMatchesRegularExpression( '/--sgs-me-from-' . $channel . ':[^;]+ !important;/', $css, "the {$channel} from-value is reset" );
		}
	}
}

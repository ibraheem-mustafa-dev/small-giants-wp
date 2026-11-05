<?php
/**
 * Tests: the main photo of sgs/buybox runs its hover scale on the photo, clipped by its frame.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionBuyboxMainPhotoHoverTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionBuyboxMainPhotoHoverTest extends TestCase {

	private const MARKUP = '<div class="sgs-buybox wp-block-sgs-buybox"><div class="product-card__media"><img src="a.jpg" alt="" class="product-card-img sgs-buybox__main-photo" /></div></div>';

	protected function setUp(): void {
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		SGS\Blocks\Motion\Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_is_admin'] = false;
		$GLOBALS['sgs_test_actions']  = array();
	}

	private function render( array $elements ): string {
		sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/buybox',
				'attrs'     => array( 'sgsMotion' => array( 'v' => 1, 'elements' => $elements ) ),
			),
			self::MARKUP
		);
		return implode( '', $GLOBALS['sgs_collected_css'] );
	}

	public function test_the_main_photo_hover_scale_lands_on_the_photo(): void {
		$css = $this->render(
			array( 'main-photo' => array( 'hover' => array( 'state' => array( 'source' => 'self', 'values' => array( 'scale' => 1.04 ) ) ) ) )
		);
		$this->assertStringContainsString( '--sgs-mh-to-s:1.04;', $css, 'the main photo scale is printed' );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__main-photo\{[^}]*--sgs-mh-to-s:1\.04;/', $css, 'on the photo' );
	}

	public function test_the_photo_keeps_its_crossfade_entry_beside_the_hover_timing(): void {
		$css = $this->render(
			array( 'main-photo' => array( 'hover' => array( 'state' => array( 'source' => 'self', 'values' => array( 'scale' => 1.04 ) ) ) ) )
		);
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__main-photo\{[^}]*transition:[^;}]*opacity 0\.2s/', $css, 'the stylesheet opacity entry is appended to the emitted transition' );
		$style = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/buybox/style.css' );
		$this->assertDoesNotMatchRegularExpression( '/\.product-card-img\s*\{[^}]*transition:\s*opacity/', $style, 'no heavier rule replaces the emitted transition' );
	}

	public function test_negative_control_a_root_scale_does_not_land_on_the_photo(): void {
		$css = $this->render( array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.04 ) ) ) ) ) );
		$this->assertDoesNotMatchRegularExpression( '/\.sgs-buybox__main-photo\{[^}]*--sgs-mh-to-s:1\.04;/', $css );
	}

	public function test_the_frame_clips_the_zoom(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/buybox/style.css' );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox \.product-card__media\s*\{[^}]*overflow:\s*hidden/', $css );
	}
}

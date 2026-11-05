<?php
/**
 * Tests: the media part of sgs/media runs its hover scale on the replaced element, not the figure.
 *
 * sgs/media declares its `media` part as a wrapper (the figure carries the box: border, shadow, radius), so the part
 * resolved to the same element as `root`, lost the shared-element contest and dropped its hover scale. The part now
 * declares the replaced element as its motion target (`motionSelector`), so the scale lands on the image while the
 * root keeps its own hover timing.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionMediaPartHoverTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionMediaPartHoverTest extends TestCase {

	private const FIGURE = '<figure class="sgs-media sgs-media-box wp-block-sgs-media"><img src="a.jpg" alt="" class="sgs-media__img sgs-media-el" /></figure>';

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
				'blockName' => 'sgs/media',
				'attrs'     => array( 'sgsMotion' => array( 'v' => 1, 'elements' => $elements ) ),
			),
			self::FIGURE
		);
		return implode( '', $GLOBALS['sgs_collected_css'] );
	}

	public function test_the_media_part_scale_reaches_the_image_and_the_root_keeps_its_timing(): void {
		$css = $this->render(
			array(
				'root'  => array( 'hover' => array( 'state' => array( 'values' => array( 'easing' => 'cubic-bezier(0.2, 0.7, 0.2, 1)' ) ) ) ),
				'media' => array( 'hover' => array( 'state' => array( 'source' => 'root', 'values' => array( 'scale' => 1.05, 'easing' => 'cubic-bezier(0.2, 0.7, 0.2, 1)' ) ) ) ),
			)
		);
		$this->assertStringContainsString( '--sgs-mh-to-s:1.05;', $css, 'the media part scale is printed' );
		$this->assertMatchesRegularExpression( '/\.sgs-m-[a-z0-9]+ \.sgs-media-el\{[^}]*--sgs-mh-to-s:1\.05;/', $css, 'on the image, not the figure' );
		$this->assertDoesNotMatchRegularExpression( '/\.sgs-m-[a-z0-9]+\{[^}]*--sgs-mh-to-s:1\.05;/', $css, 'the figure itself is not scaled' );
		$layer_drops = array_filter( $GLOBALS['sgs_test_actions'], static fn( $a ) => is_array( $a ) && 'sgs_motion_layer_dropped' === ( $a[0] ?? '' ) );
		$this->assertSame( array(), array_values( $layer_drops ), 'nothing is dropped as a shared element' );
	}

	public function test_negative_control_the_root_scale_still_lands_on_the_figure(): void {
		$css = $this->render( array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.05 ) ) ) ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-m-[a-z0-9]+\{[^}]*--sgs-mh-to-s:1\.05;/', $css );
	}
}

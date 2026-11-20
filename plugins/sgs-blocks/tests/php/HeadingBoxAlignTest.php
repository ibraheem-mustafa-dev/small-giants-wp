<?php
/**
 * sgs/heading: boxAlign shrinks the heading to its text and places the box (margin-inline) per device.
 *
 * Run with: vendor/bin/phpunit --filter HeadingBoxAlignTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class HeadingBoxAlignTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function css( array $extra ): string {
		return $this->render_block( 'sgs/heading', array_merge( array( 'content' => 'Our Brands' ), $extra ) )['css'];
	}

	public function test_centre_prints_auto_margins_and_a_shrunk_width(): void {
		$css = $this->css( array( 'boxAlign' => array( 'desktop' => 'centre' ) ) );

		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-heading\{width:fit-content;?\}/', $css );
		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-heading\{margin-inline:auto;?\}/', $css );
	}

	public function test_left_and_right_hold_one_side(): void {
		$this->assertStringContainsString( 'margin-inline:0 auto', $this->css( array( 'boxAlign' => array( 'desktop' => 'left' ) ) ) );
		$this->assertStringContainsString( 'margin-inline:auto 0', $this->css( array( 'boxAlign' => array( 'desktop' => 'right' ) ) ) );
	}

	public function test_a_device_can_place_the_box_differently(): void {
		$css = $this->css( array( 'boxAlign' => array( 'desktop' => 'centre', 'mobile' => 'left' ) ) );

		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^}]*margin-inline:0 auto/', $css );
	}

	public function test_a_custom_width_still_wins_over_the_shrink(): void {
		$css = $this->css( array( 'boxAlign' => array( 'desktop' => 'centre' ), 'customWidth' => array( 'desktop' => '300px' ) ) );

		$this->assertLessThan( strpos( $css, 'width:300px' ), strpos( $css, 'width:fit-content' ), 'the shrink prints before the custom width, so the custom width wins by source order' );
	}

	public function test_unset_or_unknown_prints_nothing(): void {
		foreach ( array( array(), array( 'boxAlign' => array() ), array( 'boxAlign' => array( 'desktop' => 'middle' ) ) ) as $attrs ) {
			$css = $this->css( $attrs );
			$this->assertStringNotContainsString( 'margin-inline', $css );
			$this->assertStringNotContainsString( 'fit-content', $css );
		}
	}
}

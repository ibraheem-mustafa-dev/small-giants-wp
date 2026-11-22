<?php
/**
 * The icon circle's ring on sgs/icon-list (`iconBoxBorderWidth`, `iconBoxBorderColour`). A ring draws round the circle,
 * alone it draws the circle without a fill, and a list with neither setting prints the circle as before.
 *
 * Run with: vendor/bin/phpunit --filter IconListIconRingTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class IconListIconRingTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function css( array $extra ): string {
		$items = array( array( 'text' => 'Free delivery' ) );
		return $this->render_block( 'sgs/icon-list', array_merge( array( 'items' => $items ), $extra ) )['css'];
	}

	public function test_a_ring_draws_round_the_filled_circle(): void {
		$css = $this->css(
			array(
				'iconBackgroundColour' => '#f5efe6',
				'iconBoxBorderWidth'   => '2px',
				'iconBoxBorderColour'  => '#3a2a22',
			)
		);
		$this->assertStringContainsString( '{background-color:#f5efe6;border-radius:50%;width:26px;height:26px;box-sizing:border-box;border:2px solid #3a2a22;}', $css );
	}

	public function test_a_ring_alone_draws_the_circle_in_the_icon_colour(): void {
		$css = $this->css(
			array(
				'iconBoxBorderWidth' => '1.5px',
				'iconBoxSize'        => '40px',
			)
		);
		$this->assertStringContainsString( '{border-radius:50%;width:40px;height:40px;box-sizing:border-box;border:1.5px solid currentColor;}', $css );
		$this->assertStringNotContainsString( 'background-color', $css );
	}

	public function test_a_fill_alone_prints_the_circle_as_before(): void {
		$css = $this->css( array( 'iconBackgroundColour' => '#f5efe6' ) );
		$this->assertStringContainsString( '{background-color:#f5efe6;border-radius:50%;width:26px;height:26px;}', $css );
		$this->assertStringNotContainsString( 'border:', $css );
	}

	public function test_no_setting_prints_no_circle(): void {
		$this->assertStringNotContainsString( 'border-radius:50%', $this->css( array( 'iconBoxBorderColour' => '#3a2a22' ) ) );
	}
}

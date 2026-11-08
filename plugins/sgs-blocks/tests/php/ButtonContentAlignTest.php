<?php
/**
 * Tests: sgs/button `contentAlign` spreads the label and icon to the button's two ends with `space-between`, so an
 * arrow sits at the far end at every width (a fixed `iconGap` only lands there at one width); an unlisted value prints
 * nothing.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ButtonContentAlignTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_space_between_reaches_justify_content_per_device(): void {
		$out = $this->render_block( 'sgs/button', array( 'text' => 'Go', 'contentAlign' => array( 'desktop' => 'space-between', 'mobile' => 'flex-start' ) ) );
		$this->assertStringContainsString( 'justify-content:space-between', $out['css'] );
		$this->assertStringContainsString( 'justify-content:flex-start', $out['css'] );
	}

	public function test_an_unlisted_value_prints_nothing(): void {
		$out = $this->render_block( 'sgs/button', array( 'text' => 'Go', 'contentAlign' => array( 'desktop' => 'space-around' ) ) );
		$this->assertStringNotContainsString( 'justify-content:space-around', $out['css'] );
	}
}

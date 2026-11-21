<?php
/**
 * sgs/button: the minimum width per device.
 *
 * Run with: vendor/bin/phpunit --filter ButtonMinWidthTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ButtonMinWidthTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_min_width_prints_per_device_on_the_doubled_uid_selector(): void {
		$css = $this->render_block( 'sgs/button', array( 'label' => 'Go', 'url' => '#', 'minWidth' => array( 'desktop' => '160px', 'mobile' => '120px' ) ) )['css'];

		$this->assertMatchesRegularExpression( '/\.(sgs-btn-[0-9a-f]{8})\.\1\.sgs-button\{min-width:160px;?\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^}]*\.(sgs-btn-[0-9a-f]{8})\.\1\.sgs-button\{min-width:120px/', $css );
	}

	public function test_unset_prints_no_min_width(): void {
		$css = $this->render_block( 'sgs/button', array( 'label' => 'Go', 'url' => '#' ) )['css'];

		$this->assertStringNotContainsString( 'min-width', $css );
	}
}

<?php
/**
 * sgs/container `order`: a per-device flex/grid item position.
 *
 * Run with: vendor/bin/phpunit --filter ContainerOrderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerOrderTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_unset_order_prints_no_order_rule(): void {
		$out = $this->render_block( 'sgs/container', array() );

		$this->assertStringNotContainsString( 'order:', $out['css'] );
	}

	public function test_empty_order_object_prints_no_order_rule(): void {
		$out = $this->render_block( 'sgs/container', array( 'order' => array() ) );

		$this->assertStringNotContainsString( 'order:', $out['css'] );
	}

	public function test_desktop_and_mobile_tiers_print_with_tablet_inheriting_desktop(): void {
		$out = $this->render_block( 'sgs/container', array( 'order' => array( 'desktop' => -1, 'mobile' => 0 ) ) );

		$this->assertMatchesRegularExpression( '/\.sgs-container-[0-9a-f]{8}\{order:-1\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media \(max-width:767px\)\{\.sgs-container-[0-9a-f]{8}\{order:0\}\}/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/max-width:1023px\)\{\.sgs-container-[0-9a-f]{8}\{order:/', $out['css'] );
	}

	public function test_tablet_tier_prints_its_own_media_rule(): void {
		$out = $this->render_block( 'sgs/container', array( 'order' => array( 'tablet' => 2 ) ) );

		$this->assertMatchesRegularExpression( '/@media \(max-width:1023px\)\{\.sgs-container-[0-9a-f]{8}\{order:2\}\}/', $out['css'] );
	}
}

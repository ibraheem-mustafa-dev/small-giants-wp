<?php
/**
 * Tests: a container's overflow clip leaves room for children that grow on hover when the container paints neither a
 * rounded corner nor a fill (the clip then only hides overflow); a rounded or filled container keeps its true crop.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerHoverRoomTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_a_plain_clipping_container_leaves_room_for_hover_growth(): void {
		$css = $this->render_block( 'sgs/container', array( 'overflow' => 'hidden', 'layout' => 'grid' ) )['css'];
		$this->assertStringContainsString( 'overflow:clip', $css );
		$this->assertStringContainsString( 'overflow-clip-margin:var(--sgs-hover-room, 12px)', $css );
	}

	public function test_a_rounded_container_keeps_its_true_crop(): void {
		$css = $this->render_block( 'sgs/container', array( 'overflow' => 'hidden', 'borderRadius' => array( 'desktop' => array( 'topLeft' => '16px', 'topRight' => '16px', 'bottomRight' => '16px', 'bottomLeft' => '16px' ) ) ) )['css'];
		$this->assertStringContainsString( 'overflow:hidden', $css );
		$this->assertStringNotContainsString( 'overflow-clip-margin', $css );
	}

	public function test_a_filled_container_keeps_its_true_crop(): void {
		$css = $this->render_block( 'sgs/container', array( 'overflow' => 'hidden', 'backgroundColour' => '#123456' ) )['css'];
		$this->assertStringNotContainsString( 'overflow-clip-margin', $css );
	}
}

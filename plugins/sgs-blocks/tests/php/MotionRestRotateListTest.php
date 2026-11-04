<?php
/**
 * Tests: the hover state's rest rotation as a list of angles cycled per repeated item (FW-D), and its rotation pivot (FW-G).
 *
 * Renders a hero through the shipped motion renderer (`tests/php/stubs/motion-render-stubs.php`) and reads the collected
 * CSS. Positive controls: a list gives one `:nth-child(Ln+k of .cls)` rule per angle, the hover to-value reads the item's
 * own rest angle, a narrower tier that follows a list replaces the positions, a pivot prints `transform-origin`.
 * Negative controls: a scalar rest rotation prints no per-item rule and the literal hover difference (today's output), an
 * unset pivot prints no `transform-origin`, a list on the root is refused to its first angle.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionRestRotateListTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Field_Types;

require_once __DIR__ . '/MotionRendererTestTrait.php';

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionRestRotateListTest extends TestCase {

	use MotionRendererTestTrait;

	private function emit( array $values, array $devices = array() ): string {
		$this->render( self::media_hover( $values, $devices ) );
		return $this->css();
	}

	public function test_a_list_gives_every_position_its_own_rest_angle(): void {
		$css = $this->emit( array( 'restRotate' => array( -2, 1.5, -1, 2, -1.5, 1 ), 'rotate' => 0 ) );

		$this->assertSame( 6, preg_match_all( '/:nth-child\(6n\+[1-6] of \.sgs-hero__media\)\{--sgs-rot-rest:/', $css ) );
		$this->assertStringContainsString( ':nth-child(6n+2 of .sgs-hero__media){--sgs-rot-rest:1.5deg;}', $css );
		$this->assertStringContainsString( '{--sgs-rot-rest:-2deg;--sgs-mh-to-rot:calc(0deg - var(--sgs-rot-rest));', $css, 'base is the first angle; the hover reads each item\'s own rest angle' );
	}

	public function test_a_scalar_prints_no_per_item_rule(): void {
		$css = $this->emit( array( 'restRotate' => -2, 'rotate' => 0 ) );

		$this->assertStringNotContainsString( 'nth-child', $css );
		$this->assertStringContainsString( '--sgs-rot-rest:-2deg;--sgs-mh-to-rot:2deg;', $css, 'negative control: the literal difference, as before' );
	}

	public function test_a_narrower_tier_replaces_the_wider_lists_positions(): void {
		$css = $this->emit( array( 'restRotate' => array( 1, 2, 3 ) ), array( 'tablet' => array( 'restRotate' => array( 4, 5 ) ), 'mobile' => array( 'restRotate' => 0 ) ) );

		$this->assertStringContainsString( '@media(max-width:1023px){', $css );
		$this->assertStringContainsString( ':nth-child(2n+2 of .sgs-hero__media){--sgs-rot-rest:5deg;}', $css );
		$this->assertStringContainsString( ':nth-child(n of .sgs-hero__media){--sgs-rot-rest:0deg;}', $css, 'a single angle after a list replaces every position' );
	}

	public function test_a_list_is_clamped_dropped_and_capped(): void {
		$list = Sgs_Motion_Field_Types::sanitise( 'angleList', array( 999, 'x', -999, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ) );

		$this->assertCount( 12, $list );
		$this->assertSame( array( 360, -360, 1 ), array_slice( $list, 0, 3 ) );
		$this->assertSame( 5, Sgs_Motion_Field_Types::sanitise( 'angleList', array( 5, 'nope' ) ), 'a one-angle list collapses to the angle' );
		$this->assertNull( Sgs_Motion_Field_Types::sanitise( 'angleList', array( 'a', 'b' ) ) );
	}

	public function test_a_pivot_prints_transform_origin_per_tier_and_unset_prints_none(): void {
		$set = $this->emit( array( 'restRotate' => -2, 'restOrigin' => 'left' ), array( 'tablet' => array( 'restOrigin' => 'custom', 'restOriginCustom' => '10% 90%' ), 'mobile' => array( 'restOrigin' => 'centre' ) ) );
		$this->assertStringContainsString( 'transform-origin:left;', $set );
		$this->assertStringContainsString( '@media(max-width:1023px){', $set );
		$this->assertStringContainsString( 'transform-origin:10% 90%;', $set );
		$this->assertStringContainsString( 'transform-origin:center;', $set );

		$this->setUp();
		$this->assertStringNotContainsString( 'transform-origin', $this->emit( array( 'restRotate' => -2 ) ), 'negative control: unset prints nothing' );

		$this->setUp();
		$this->assertStringNotContainsString( 'transform-origin', $this->emit( array( 'restRotate' => -2, 'restOrigin' => 'custom' ) ), 'a custom pivot with no point prints nothing' );
	}
}

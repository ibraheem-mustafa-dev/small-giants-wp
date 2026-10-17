<?php
/**
 * Tests: the motion renderer's entrance emission: the first-section LCP guard and keyframe entrances (Spec 38A §6.5, §9; FR-38A-16, FR-38A-41).
 *
 * Renders fixture blocks through the shipped renderer (`includes/motion/class-sgs-motion-renderer.php`) with the
 * WordPress stand-ins in `stubs/motion-render-stubs.php` (block types come from the real block.json files) and reads
 * the collected CSS and the returned markup.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionRendererEntranceTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

require_once __DIR__ . '/MotionRendererTestTrait.php';

// The stand-ins define global WordPress functions and load the CSS collector, which would change other test files'
// behaviour in the shared suite process, so every test here runs in its own process and loads them in setUp().
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionRendererEntranceTest extends TestCase {

	use MotionRendererTestTrait;

	private function render_as_first_section( array $motion ): string {
		$GLOBALS['sgs_test_in_loop'] = true;
		Sgs_Motion_Renderer::arm_first_section( '' );
		return $this->render( $motion );
	}

	public function test_edge_first_section_load_fade_keeps_from_opacity_1(): void {
		$out = $this->render_as_first_section( self::load_fade() );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-op:1;', $css );
		$this->assertStringContainsString( '--sgs-me-from-ty:24px;', $css, 'movement still plays' );
		$this->assertStringContainsString( 'data-sgs-me="load translate opacity"', $out );
	}

	public function test_edge_first_section_scroll_fade_keeps_from_opacity_1(): void {
		$out = $this->render_as_first_section( self::load_fade( false, 'scroll' ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-op:1;', $css, 'the ready gate hides a scroll entrance from first paint, so the LCP rule holds its opacity' );
		$this->assertStringContainsString( '--sgs-me-from-ty:24px;', $css, 'movement still plays' );
		$this->assertStringContainsString( 'data-sgs-me="scroll translate opacity"', $out );
	}

	public function test_edge_first_section_scroll_fade_with_allow_lcp_fade_fades(): void {
		$this->render_as_first_section( self::load_fade( true, 'scroll' ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
	}

	public function test_edge_second_section_scroll_fade_fades(): void {
		$GLOBALS['sgs_test_in_loop'] = true;
		Sgs_Motion_Renderer::arm_first_section( '' );
		$this->render( array( 'v' => 1, 'elements' => array( 'media' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.1 ) ) ) ) ) ) );
		$GLOBALS['sgs_collected_css'] = array();
		$this->render( self::load_fade( false, 'scroll' ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
	}

	public function test_edge_first_section_with_allow_lcp_fade_fades(): void {
		$this->render_as_first_section( self::load_fade( true ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
	}

	public function test_edge_second_section_load_fade_fades(): void {
		$GLOBALS['sgs_test_in_loop'] = true;
		Sgs_Motion_Renderer::arm_first_section( '' );
		$this->render( array( 'v' => 1, 'elements' => array( 'media' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.1 ) ) ) ) ) ) );
		$GLOBALS['sgs_collected_css'] = array();
		$this->render( self::load_fade() );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
	}

	public function test_edge_priority_image_keeps_from_opacity_1(): void {
		$html = '<div class="wp-block-sgs-hero"><div class="sgs-hero__media"><img src="a.jpg" alt="" fetchpriority="high"></div></div>';
		$this->render( self::load_fade(), $html );
		$this->assertStringContainsString( '--sgs-me-from-op:1;', $this->css() );
	}

	private static function keyframe_entrance( string $trigger ): array {
		return self::keyframe_entrance_from(
			$trigger,
			array(
				array( 'offset' => 0, 'opacity' => 0, 'translateY' => 40 ),
				array( 'offset' => 60, 'opacity' => 1, 'translateY' => -6 ),
				array( 'offset' => 100, 'opacity' => 1, 'translateY' => 0 ),
			)
		);
	}

	/**
	 * A one-element keyframe entrance.
	 *
	 * @param string                         $trigger Entrance trigger.
	 * @param array<int,array<string,mixed>> $frames  Stored frames.
	 * @return array<string,mixed>
	 */
	private static function keyframe_entrance_from( string $trigger, array $frames ): array {
		$values = array( 'keyframes' => $frames );
		return array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => $trigger, 'values' => $values ) ) ) ),
		);
	}

	public function test_edge_scroll_keyframes_without_from_hide_the_start_state_from_frame_zero(): void {
		$out = $this->render( self::keyframe_entrance( 'scroll' ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $css, 'frame 0 opacity is the hidden start' );
		$this->assertStringContainsString( '--sgs-me-from-ty:40px;', $css, 'frame 0 translate is the hidden start' );
		$this->assertStringContainsString( 'data-sgs-me-keyframes', $out );
		$this->assertStringNotContainsString( '@media', $css, 'desktop-only values stay out of the tablet and mobile tiers' );
	}

	public function test_edge_reversed_keyframes_are_ordered_by_offset_and_frame_zero_is_the_lowest_offset(): void {
		$frames = array(
			array( 'offset' => 100, 'opacity' => 1, 'translateY' => 0 ),
			array( 'offset' => 60, 'opacity' => 1, 'translateY' => -6 ),
			array( 'offset' => 0, 'opacity' => 0, 'translateY' => 40 ),
		);
		$out    = $this->render( self::keyframe_entrance_from( 'scroll', $frames ) );
		$css    = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $css );
		$this->assertStringContainsString( '--sgs-me-from-ty:40px;', $css );
		$this->assertSame( array( 0, 0.6, 1 ), array_column( $this->emitted_frames( $out ), 'offset' ) );
	}

	public function test_edge_first_keyframe_above_offset_zero_is_emitted_at_zero(): void {
		$frames = array(
			array( 'offset' => 20, 'opacity' => 0, 'translateY' => 40 ),
			array( 'offset' => 100, 'opacity' => 1, 'translateY' => 0 ),
		);
		$out    = $this->render( self::keyframe_entrance_from( 'scroll', $frames ) );
		$this->assertSame( array( 0, 1 ), array_column( $this->emitted_frames( $out ), 'offset' ) );
	}

	public function test_keyframe_entrance_emits_x_and_y_angles_per_frame_under_the_default_perspective(): void {
		$frames = array(
			array( 'offset' => 0, 'rotateX' => 0, 'opacity' => 0 ),
			array( 'offset' => 50, 'rotateX' => 20, 'rotateY' => -10, 'opacity' => 1 ),
			array( 'offset' => 100, 'rotateX' => 0, 'opacity' => 1 ),
		);
		$out    = $this->render( self::keyframe_entrance_from( 'scroll', $frames ) );
		$css    = $this->css();
		$emit   = $this->emitted_frames( $out );
		$this->assertSame( array( '0deg', '20deg', '0deg' ), array_column( $emit, '--sgs-me-rx' ), 'rotateX per frame' );
		$this->assertSame( '-10deg', $emit[1]['--sgs-me-ry'] ?? null, 'rotateY on the middle frame' );
		$this->assertStringContainsString( '--sgs-me-from-rx:0deg;', $css, 'frame 0 is the hidden start state' );
		$this->assertStringContainsString( '--sgs-persp-self:800px;', $css, 'a keyframe X or Y owner gets the default perspective' );
		$this->assertStringContainsString( 'transform', $out, 'the transform channel is declared' );
		$this->assertSame( 1, preg_match( '/data-sgs-me=([\'"])[^\'"]*\btransform\b/', $out ), 'data-sgs-me lists the transform channel' );
	}

	public function test_keyframe_entrance_drops_an_out_of_range_angle(): void {
		$frames = array(
			array( 'offset' => 0, 'rotateX' => 0, 'opacity' => 0 ),
			array( 'offset' => 100, 'rotateX' => 720, 'rotateY' => 15, 'opacity' => 1 ),
		);
		$emit = $this->emitted_frames( $this->render( self::keyframe_entrance_from( 'scroll', $frames ) ) );
		$this->assertArrayNotHasKey( '--sgs-me-rx', $emit[1], 'a 720deg angle is dropped' );
		$this->assertSame( '15deg', $emit[1]['--sgs-me-ry'] ?? null, 'the valid sibling angle stays' );
	}

	/**
	 * The decoded `data-sgs-me-keyframes` frames.
	 *
	 * @param string $html Rendered markup.
	 * @return array<int,array<string,mixed>>
	 */
	private function emitted_frames( string $html ): array {
		$this->assertSame( 1, preg_match( '/data-sgs-me-keyframes=([\'"])(.*?)\1/s', $html, $m ), 'keyframes attribute present' );
		$frames = json_decode( html_entity_decode( $m[2], ENT_QUOTES ), true );
		$this->assertIsArray( $frames );
		return $frames;
	}

	public function test_edge_first_section_load_keyframes_keep_from_opacity_1(): void {
		$this->render_as_first_section( self::keyframe_entrance( 'load' ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-op:1;', $css );
		$this->assertStringContainsString( '--sgs-me-from-ty:40px;', $css, 'movement still plays' );
	}
}

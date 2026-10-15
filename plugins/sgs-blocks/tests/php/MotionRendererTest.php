<?php
/**
 * Tests: the motion renderer's emission (Spec 38A §6.5, §9, §10; FR-38A-16, FR-38A-18, FR-38A-49, FR-38A-7 group
 * source).
 *
 * Renders fixture blocks through the shipped renderer (`includes/motion/class-sgs-motion-renderer.php`) with the
 * WordPress stand-ins in `stubs/motion-render-stubs.php` (block types come from the real block.json files) and reads
 * the collected CSS and the returned markup.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionRendererTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

// The stand-ins define global WordPress functions and load the CSS collector, which would change other test files'
// behaviour in the shared suite process, so every test here runs in its own process and loads them in setUp().
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionRendererTest extends TestCase {

	private const CARD = '<div class="wp-block-sgs-hero"><div class="sgs-hero__media"><img src="a.jpg" alt=""></div><div class="sgs-hero__content"><p class="lede">Hi</p></div></div>';

	protected function setUp(): void {
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_is_admin'] = false;
		$GLOBALS['sgs_test_in_loop']  = false;
		$GLOBALS['sgs_test_actions']  = array();
	}

	private function render( array $motion, string $html = self::CARD, array $extra_attrs = array() ): string {
		return sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/hero',
				'attrs'     => array( 'sgsMotion' => $motion ) + $extra_attrs,
			),
			$html
		);
	}

	private function css(): string {
		return implode( '', $GLOBALS['sgs_collected_css'] );
	}

	private function scope( string $html ): string {
		$this->assertSame( 1, preg_match( '/\b(sgs-m-[0-9a-f]{10})\b/', $html, $m ), 'the root carries the scope class' );
		return $m[1];
	}

	private static function media_hover( array $values, array $devices = array(), string $source = 'self' ): array {
		$state = array(
			'source' => $source,
			'values' => $values,
		);
		if ( array() !== $devices ) {
			$state['devices'] = $devices;
		}
		return array(
			'v'        => 1,
			'elements' => array( 'media' => array( 'hover' => array( 'state' => $state ) ) ),
		);
	}

	public function test_happy_media_part_hover_state_emits_one_scoped_rule_per_device(): void {
		$out   = $this->render(
			self::media_hover(
				array( 'scale' => 1.04, 'translateY' => -6, 'duration' => 250 ),
				array( 'tablet' => array( 'scale' => 1.02 ), 'mobile' => array( 'translateY' => -3 ) )
			)
		);
		$scope = $this->scope( $out );
		$css   = $this->css();
		$sel   = '.' . $scope . ' .sgs-hero__media';

		$this->assertSame( 1, substr_count( $css, $sel . '{--sgs-mh-to-s:1.04;--sgs-mh-to-ty:-6px;transition:' ), $css );
		$this->assertSame( 1, substr_count( $css, '@media (max-width:1023px){' . $sel . '{--sgs-mh-to-s:1.02;}}' ), $css );
		$this->assertSame( 1, substr_count( $css, '@media (max-width:767px){' . $sel . '{--sgs-mh-to-ty:-3px;}}' ), $css );
		$this->assertSame( 1, substr_count( $css, 'transition:' ) );
		$this->assertStringContainsString( 'transition:--sgs-mh-s 250ms var(--wp--custom--easing--ease-out) 0ms, --sgs-mh-ty 250ms', $css );
		$this->assertStringContainsString( 'box-shadow 250ms', $css );
		$this->assertStringNotContainsString( 'transition:all', str_replace( ' ', '', $css ) );
		$this->assertStringNotContainsString( '--sgs-mh-rot', $css, 'only the owners present are listed' );
		$this->assertStringNotContainsString( ' style=', $out );
		$this->assertStringNotContainsString( '<style', $out, 'the front end sends the CSS through the collector' );
		$this->assertStringContainsString( '<div data-sgs-mc="translate scale" data-sgs-mh="self" class="sgs-hero__media">', $out );
		$this->assertStringNotContainsString( 'data-sgs-mroot', $out );
	}

	public function test_indent_hover_writes_its_to_value_owner_transition_and_channel(): void {
		$out = $this->render( self::media_hover( array( 'indent' => 8 ), array() ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-mh-to-indent:8px;', $css );
		$this->assertStringContainsString( 'transition:--sgs-mh-indent ', $css, 'the indent owner transitions, not padding-inline-start itself' );
		$this->assertStringContainsString( 'data-sgs-mc="padding-inline-start"', $out, 'the shared stylesheet composes padding-inline-start only where the channel is named' );
	}

	public function test_edge_tablet_only_override_writes_only_the_1023px_block(): void {
		$this->render( self::media_hover( array( 'scale' => 1.04 ), array( 'tablet' => array( 'scale' => 1.1 ) ) ) );
		$css = $this->css();
		$this->assertStringContainsString( '@media (max-width:1023px)', $css );
		$this->assertStringNotContainsString( '@media (max-width:767px)', $css, 'a blank Mobile tier inherits; no block' );
	}

	public function test_edge_blank_devices_write_no_media_block(): void {
		$this->render( self::media_hover( array( 'scale' => 1.04 ) ) );
		$this->assertStringNotContainsString( '@media', $this->css() );
	}

	public function test_edge_custom_target_selector_is_prefixed_by_the_scoped_root(): void {
		$motion = array(
			'v'        => 1,
			'elements' => array(
				'custom:1' => array(
					'selector' => 'p.lede',
					'review'   => array( 'draftNode' => 'hero lede', 'reason' => 'no declared part for the lede' ),
					'hover'    => array( 'state' => array( 'values' => array( 'translateX' => 4 ) ) ),
				),
			),
		);
		$out    = $this->render( $motion );
		$scope  = $this->scope( $out );
		$this->assertStringContainsString( '.' . $scope . ' p.lede{--sgs-mh-to-tx:4px;', $this->css() );
		$this->assertStringContainsString( '<p data-sgs-mc="translate" data-sgs-mh="self" class="lede">', $out );
	}

	public function test_happy_declared_part_selector_finds_the_real_element(): void {
		$html   = '<div class="wp-block-sgs-testimonial"><blockquote class="sgs-testimonial__quote">Great</blockquote><cite class="sgs-testimonial__name">Ann</cite></div>';
		$motion = array(
			'v'        => 1,
			'elements' => array( 'quote-text' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ),
		);
		$out    = sgs_test_render_motion_block( array( 'blockName' => 'sgs/testimonial', 'attrs' => array( 'sgsMotion' => $motion ) ), $html );
		$scope  = $this->scope( $out );
		$this->assertStringContainsString( '.' . $scope . ' .sgs-testimonial__quote{--sgs-mh-to-ty:-4px;', $this->css(), 'the part resolves to its declared selector' );
		$this->assertStringNotContainsString( 'sgs-testimonial__quote-text', $this->css(), 'not the part key as a class' );
		$this->assertStringContainsString( '<blockquote data-sgs-mc="translate" data-sgs-mh="self" class="sgs-testimonial__quote">', $out, 'data-sgs-mh lands on the real element' );
		$this->assertStringNotContainsString( '<cite data-sgs-mh', $out, 'the sibling is untouched' );
	}

	public function test_edge_band_part_reaches_only_its_own_band_not_a_nested_containers(): void {
		$band   = 'sgs-container__inner sgs-container__content-band';
		$html   = '<div class="wp-block-sgs-container"><div class="' . $band . '"><div class="wp-block-sgs-container"><div class="' . $band . '"><p>Hi</p></div></div><br><img src="a.jpg" alt=""></div></div>';
		$motion = array(
			'v'        => 1,
			'elements' => array( 'content-band' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ),
		);
		$out    = sgs_test_render_motion_block( array( 'blockName' => 'sgs/container', 'attrs' => array( 'sgsMotion' => $motion ) ), $html );
		$scope  = $this->scope( $out );
		$this->assertSame( 1, substr_count( $out, 'data-sgs-mh=' ), 'exactly one element is stamped' );
		$this->assertStringContainsString( '.' . $scope . ' > .sgs-container__content-band{--sgs-mh-to-ty:-4px;', $this->css(), 'the band rule uses the child combinator' );
		$this->assertStringNotContainsString( '.' . $scope . ' .sgs-container__content-band{', $this->css(), 'no descendant-form rule' );
		$this->assertStringContainsString( '"><div data-sgs-mc="translate" data-sgs-mh="self" class="' . $band . '"><div class="wp-block-sgs-container"><div class="' . $band . '"><p>', $out, 'the outer band is stamped and the nested band is not' );
	}

	public function test_edge_container_inner_part_is_its_own_band_only(): void {
		$band   = 'sgs-container__inner sgs-container__content-band';
		$html   = '<div class="wp-block-sgs-container"><div class="' . $band . '"><div class="wp-block-sgs-container"><div class="' . $band . '"><p>Hi</p></div></div></div></div>';
		$motion = array(
			'v'        => 1,
			'elements' => array( 'inner' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ),
		);
		$out    = sgs_test_render_motion_block( array( 'blockName' => 'sgs/container', 'attrs' => array( 'sgsMotion' => $motion ) ), $html );
		$scope  = $this->scope( $out );
		$this->assertSame( 1, substr_count( $out, 'data-sgs-mh=' ), 'exactly one element is stamped' );
		$this->assertStringContainsString( '.' . $scope . ' > .sgs-container__inner{', $this->css() );
	}

	public function test_refusal_part_marked_motion_false_is_not_a_target(): void {
		// sgs/hero's `headline` is a child sgs/heading (block.json "motion": false), even when that child carries the BEM class.
		$html   = '<section class="wp-block-sgs-hero"><div class="sgs-hero__content"><h1 class="sgs-hero__headline">Hi</h1></div></section>';
		$motion = array(
			'v'        => 1,
			'elements' => array( 'headline' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ),
		);
		$out    = sgs_test_render_motion_block( array( 'blockName' => 'sgs/hero', 'attrs' => array( 'sgsMotion' => $motion ) ), $html );
		$this->assertStringNotContainsString( 'sgs-hero__headline{', $this->css(), 'no rule for an excluded part' );
		$this->assertStringNotContainsString( 'data-sgs-mh', $out, 'no element is stamped' );
	}

	private static function load_fade( bool $allow = false, string $trigger = 'load' ): array {
		$values = array( 'from' => array( 'opacity' => 0, 'translateY' => 24 ), 'duration' => 600 );
		if ( $allow ) {
			$values['allowLcpFade'] = true;
		}
		return array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => $trigger, 'values' => $values ) ) ) ),
		);
	}

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

	public function test_tokens_resolve_to_theme_custom_properties(): void {
		$this->render(
			self::media_hover( array( 'translateY' => 'token:distance.sm', 'duration' => 'token:duration.fast', 'easing' => 'token:easing.spring' ) )
		);
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-mh-to-ty:var(--wp--custom--distance--sm);', $css );
		$this->assertStringContainsString( '--sgs-mh-ty var(--wp--custom--duration--fast) var(--wp--custom--easing--spring) 0ms', $css );
		$this->assertStringNotContainsString( 'token:', $css );
	}

	public function test_rest_rotate_is_direct_and_hover_rotate_is_stored_minus_rest(): void {
		$this->render( self::media_hover( array( 'rotate' => 8, 'restRotate' => 2 ), array( 'mobile' => array( 'restRotate' => 5 ) ) ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-rot-rest:2deg;--sgs-mh-to-rot:6deg;', $css );
		$this->assertStringContainsString( '{--sgs-rot-rest:5deg;--sgs-mh-to-rot:3deg;}}', $css );
	}

	public function test_root_source_marks_the_root(): void {
		$out = $this->render( self::media_hover( array( 'scale' => 1.04 ), array(), 'root' ) );
		$this->assertMatchesRegularExpression( '/^<div[^>]*\bdata-sgs-mroot\b[^>]*class="wp-block-sgs-hero sgs-m-/', $out );
		$this->assertStringContainsString( 'data-sgs-mh="root"', $out );
	}

	public function test_hover_group_marking_and_group_hover_colours(): void {
		$group = $this->render( array(), self::CARD, array( 'sgsBlockLink' => 'https://example.test/' ) );
		$this->assertStringContainsString( 'data-sgs-hover-group', $group, 'a whole-block link makes the block a hover group' );

		$rules = '';
		$out   = sgs_test_render_motion_block(
			array( 'blockName' => 'sgs/hero', 'attrs' => array( 'sgsMotion' => self::media_hover( array( 'scale' => 1.04 ), array(), 'group' ) ) ),
			self::CARD,
			null,
			static function () use ( &$rules ) {
				$rules = sgs_hover_state_rules( '.x', 'color:red', ':focus-visible' );
			}
		);
		$this->assertStringContainsString( 'data-sgs-mh="group"', $out );
		$this->assertStringContainsString( '[data-sgs-hover-group]:hover .x', $rules );
		$this->assertStringContainsString( '[data-sgs-hover-group]:focus-within .x', $rules );
		$this->assertStringNotContainsString( 'data-sgs-hover-group', sgs_hover_state_rules( '.x', 'color:red' ), 'only while the group block renders' );
	}

	public function test_scroll_owning_effect_suppresses_the_entrance(): void {
		$motion                                        = self::load_fade( false, 'scroll' );
		$motion['elements']['root']['effects']         = array( array( 'id' => 'e1', 'effect' => 'horizontal-panel', 'trigger' => 'scroll', 'values' => array() ) );
		$out                                           = $this->render( $motion );
		$this->assertStringNotContainsString( 'data-sgs-me', $out );
		$this->assertStringNotContainsString( '--sgs-me-', $this->css() );
		$control = $this->render( self::load_fade( false, 'scroll' ) );
		$this->assertStringContainsString( 'data-sgs-me="scroll translate opacity"', $control, 'negative control: no effect, entrance kept' );
	}

	public function test_injected_layers_are_appended_hidden(): void {
		$motion = array(
			'v'        => 1,
			'elements' => array(
				'root' => array(
					'hover' => array(
						'effects' => array(
							array( 'id' => 'h1', 'effect' => 'glare', 'values' => array( 'glareOpacity' => 0.4 ) ),
							array( 'id' => 'h2', 'effect' => 'sheen', 'values' => array( 'opacity' => 0.4 ) ),
						),
					),
				),
			),
		);
		$out    = $this->render( $motion );
		$this->assertStringEndsWith(
			'<span class="sgs-motion-layer" data-sgs-layer="glare" aria-hidden="true"></span><span class="sgs-motion-layer" data-sgs-layer="sheen" aria-hidden="true"></span></div>',
			$out
		);
		$this->assertStringContainsString( 'data-sgs-mc="injected"', $out, 'glare paints a layer and drives no transform' );
		$this->assertStringNotContainsString( 'data-sgs-ml-mark', $out );
	}

	public function test_x_and_y_owners_compose_the_transform_channel_under_one_perspective(): void {
		$motion = array(
			'v'        => 1,
			'elements' => array(
				'root' => array(
					'hover'    => array(
						'state' => array(
							'values'  => array(
								'restRotate'    => -1,
								'restRotateX'   => 10,
								'rotateX'       => 4,
								'rotateY'       => 5,
								'perspective'   => 800,
								'followPointer' => true,
								'maxAngle'      => 8,
								'resetDuration' => 600,
								'resetEasing'   => 'token:easing.spring',
							),
							'devices' => array( 'mobile' => array( 'restRotateX' => 6, 'perspective' => 500 ) ),
						),
					),
					'entrance' => array(
						'base' => array(
							'trigger' => 'scroll',
							'values'  => array(
								'from' => array( 'opacity' => 0, 'rotateX' => 90 ),
								'to'   => array( 'rotateY' => 0 ),
							),
						),
					),
				),
			),
		);
		$out    = $this->render( $motion );
		$css    = $this->css();
		$this->assertStringContainsString( 'data-sgs-mc="rotate transform"', $out, 'Z on the rotate channel, X and Y on the transform channel' );
		$this->assertStringContainsString( 'data-sgs-me="scroll transform opacity"', $out, 'the entrance animates the transform channel for its X angle' );
		$this->assertStringContainsString( '--sgs-rot-rest:-1deg;', $css );
		$this->assertStringContainsString( '--sgs-rx-rest:10deg;--sgs-mh-to-rx:-6deg;', $css, 'the hover X is stored minus the rest X' );
		$this->assertStringContainsString( '--sgs-mh-to-ry:5deg;', $css, 'no rest Y, so the hover Y is stored as is' );
		$this->assertStringContainsString( '--sgs-persp-self:800px;', $css, 'the one perspective is written directly' );
		$this->assertStringContainsString( '{--sgs-persp-self:500px;--sgs-rx-rest:6deg;--sgs-mh-to-rx:-2deg;}}', $css, 'the mobile rest X and perspective' );
		$this->assertStringContainsString( '--sgs-me-from-rx:90deg;', $css );
		$this->assertStringContainsString( '--sgs-me-to-ry:0deg;', $css );
		$this->assertStringContainsString( '--sgs-mh-rx ', $css, 'the hover X transitions on the hover timing' );
		$this->assertStringContainsString( '--sgs-tilt-x calc(600ms * (1 - var(--sgs-mh-on, 0))) var(--wp--custom--easing--spring) 0ms, --sgs-tilt-y calc(600ms * (1 - var(--sgs-mh-on, 0)))', $css, 'Follow pointer settles on its own timing, and only while disengaged (on leave)' );
		$this->assertStringNotContainsString( '--sgs-tilt-x 600ms', $css, 'no plain settle duration that would lag the pointer while hovered' );
		$this->assertStringNotContainsString( '--sgs-mh-to-rest', $css, 'rest values never become to-values' );
		$this->assertStringNotContainsString( '--sgs-mh-to-perspective', $css );
		$this->assertStringNotContainsString( ' style=', $out );

		$flat = $this->render( self::media_hover( array( 'scale' => 1.04 ) ) );
		$this->assertStringNotContainsString( 'transform', $flat, 'negative control: no X or Y owner, no transform channel' );
	}

	public function test_sheen_return_transition_uses_its_own_duration_and_easing(): void {
		$motion = array(
			'v'        => 1,
			'elements' => array(
				'root' => array(
					'hover' => array(
						'effects' => array(
							array( 'id' => 'h1', 'effect' => 'sheen', 'values' => array( 'duration' => 750, 'easing' => 'cubic-bezier(0.2, 0.8, 0.2, 1)' ) ),
						),
					),
				),
			),
		);
		$this->render( $motion );
		$css = $this->css();
		$this->assertMatchesRegularExpression( '/--sgs-sheen-x 750ms cubic-bezier\(0\.2,\s*0\.8,\s*0\.2,\s*1\) 0ms/', $css );
		$this->assertStringNotContainsString( '--sgs-sheen-x var(--wp--custom--duration--medium)', $css, 'the sheen no longer falls back to the medium token' );
	}

	public function test_editor_preview_keeps_the_css_in_the_block(): void {
		$GLOBALS['sgs_test_is_admin'] = true;
		$out                          = $this->render( self::media_hover( array( 'scale' => 1.04 ) ) );
		$this->assertStringStartsWith( '<style id="sgs-m-', $out );
		$this->assertSame( array(), $GLOBALS['sgs_collected_css'] );
	}

	public function test_a_block_without_the_support_is_untouched(): void {
		$out = sgs_test_render_motion_block( array( 'blockName' => 'core/paragraph', 'attrs' => array( 'sgsMotion' => self::media_hover( array( 'scale' => 2 ) ) ) ), '<p>x</p>' );
		$this->assertSame( '<p>x</p>', $out );
	}

	public function test_legacy_entrance_injector_skips_a_block_with_the_new_attribute(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/animation-timing-clamp.php';
		require_once dirname( __DIR__, 2 ) . '/includes/animation-attributes.php';
		$html  = '<div class="wp-block-sgs-info-box" data-sgs-animation="fade-up">x</div>';
		$both  = \SGS\Blocks\inject_animation_attributes( $html, array( 'blockName' => 'sgs/info-box', 'attrs' => array( 'sgsAnimation' => 'fade-up', 'sgsMotion' => self::load_fade() ) ) );
		$this->assertStringNotContainsString( 'data-sgs-animation', $both );
		$old = \SGS\Blocks\inject_animation_attributes( '<div class="a">x</div>', array( 'blockName' => 'sgs/info-box', 'attrs' => array( 'sgsAnimation' => 'fade-up' ) ) );
		$this->assertStringContainsString( 'data-sgs-animation="fade-up"', $old, 'negative control: the old model alone still renders' );
	}

	public function test_an_x_or_y_owner_without_a_perspective_gets_the_default(): void {
		$this->render( self::media_hover( array( 'rotateY' => 5 ) ) );
		$this->assertStringContainsString( '--sgs-persp-self:800px;', $this->css(), 'a hover Y angle with no perspective gets 800px, never none' );

		$GLOBALS['sgs_collected_css'] = array();
		$entrance = array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => 'load', 'values' => array( 'from' => array( 'rotateX' => 90 ), 'to' => array( 'rotateX' => 0 ) ) ) ) ) ),
		);
		$out      = $this->render( $entrance );
		$this->assertStringContainsString( 'data-sgs-me="load transform"', $out );
		$this->assertStringContainsString( '--sgs-persp-self:800px;', $this->css(), 'an entrance flip gets the default too' );

		$GLOBALS['sgs_collected_css'] = array();
		$this->render( self::media_hover( array( 'rotateY' => 5, 'perspective' => 1200 ) ) );
		$this->assertStringContainsString( '--sgs-persp-self:1200px;', $this->css() );
		$this->assertStringNotContainsString( '800px', $this->css(), 'a set perspective is not overwritten' );

		$GLOBALS['sgs_collected_css'] = array();
		$this->render( self::media_hover( array( 'scale' => 1.04 ) ) );
		$this->assertStringNotContainsString( '--sgs-persp-self', $this->css(), 'negative control: no X or Y owner, no perspective' );
	}

	public function test_a_perspective_alone_adds_no_transform_channel(): void {
		$out = $this->render( self::media_hover( array( 'scale' => 1.04, 'perspective' => 900 ) ) );
		$this->assertStringContainsString( '--sgs-persp-self:900px;', $this->css(), 'the perspective is still written' );
		$this->assertStringContainsString( 'data-sgs-mc="scale"', $out, 'but it declares no transform channel' );

		$control = $this->render( self::media_hover( array( 'scale' => 1.04, 'perspective' => 900, 'restRotateX' => 4 ) ) );
		$this->assertStringContainsString( 'data-sgs-mc="scale transform"', $control, 'negative control: an X angle does' );
	}

	public function test_follow_pointer_presets_switch_follow_pointer_on(): void {
		$presets = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/scripts/data/motion-presets.json' ), true )['presets'];
		$family  = array_values( array_filter( $presets, static fn ( array $p ): bool => 'follow-pointer' === $p['family'] ) );
		$base    = array_values( array_filter( $family, static fn ( array $p ): bool => 'preset' === $p['kind'] ) );
		$rows    = array_values( array_filter( $family, static fn ( array $p ): bool => 'intensity' === $p['kind'] ) );
		$this->assertCount( 1, $base, 'one Follow pointer preset turns it on' );
		$this->assertCount( 3, $rows, 'Subtle, Standard and Bold restamp its angle' );
		$this->assertTrue( \SGS\Blocks\Motion\Sgs_Motion_Rotation::follows( $base[0]['values'] ) );
		foreach ( $rows as $row ) {
			$values = array_merge( $base[0]['values'], $row['values'] );
			$this->assertTrue( \SGS\Blocks\Motion\Sgs_Motion_Rotation::follows( $values ), $row['slug'] . ' applied over the preset keeps Follow pointer on' );
			$out = $this->render( self::media_hover( $values ) );
			$this->assertStringContainsString( 'data-sgs-mc="transform"', $out, $row['slug'] . ' renders the transform channel' );
			$this->assertFalse( \SGS\Blocks\Motion\Sgs_Motion_Rotation::follows( $row['values'] ), 'negative control: an intensity row alone only restamps the angle' );
		}
	}
}

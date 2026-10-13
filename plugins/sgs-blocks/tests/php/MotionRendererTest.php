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

	private const CARD = '<div class="wp-block-sgs-info-box"><div class="sgs-info-box__media"><img src="a.jpg" alt=""></div><div class="sgs-info-box__body"><p class="lede">Hi</p></div></div>';

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
				'blockName' => 'sgs/info-box',
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
		$sel   = '.' . $scope . ' .sgs-info-box__media';

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
		$this->assertStringContainsString( '<div data-sgs-mc="translate scale" data-sgs-mh="self" class="sgs-info-box__media">', $out );
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
		$html = '<div class="wp-block-sgs-info-box"><div class="sgs-info-box__media"><img src="a.jpg" alt="" fetchpriority="high"></div></div>';
		$this->render( self::load_fade(), $html );
		$this->assertStringContainsString( '--sgs-me-from-op:1;', $this->css() );
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
		$this->assertMatchesRegularExpression( '/^<div[^>]*\bdata-sgs-mroot\b[^>]*class="wp-block-sgs-info-box sgs-m-/', $out );
		$this->assertStringContainsString( 'data-sgs-mh="root"', $out );
	}

	public function test_hover_group_marking_and_group_hover_colours(): void {
		$group = $this->render( array(), self::CARD, array( 'sgsBlockLink' => 'https://example.test/' ) );
		$this->assertStringContainsString( 'data-sgs-hover-group', $group, 'a whole-block link makes the block a hover group' );

		$rules = '';
		$out   = sgs_test_render_motion_block(
			array( 'blockName' => 'sgs/info-box', 'attrs' => array( 'sgsMotion' => self::media_hover( array( 'scale' => 1.04 ), array(), 'group' ) ) ),
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
							array( 'id' => 'h1', 'effect' => 'tilt', 'values' => array( 'maxAngle' => 8, 'glare' => true ) ),
							array( 'id' => 'h2', 'effect' => 'sheen', 'values' => array( 'opacity' => 0.4 ) ),
						),
					),
				),
			),
		);
		$out    = $this->render( $motion );
		$this->assertStringEndsWith(
			'<span class="sgs-motion-layer" data-sgs-layer="tilt-glare" aria-hidden="true"></span><span class="sgs-motion-layer" data-sgs-layer="sheen" aria-hidden="true"></span></div>',
			$out
		);
		$this->assertStringContainsString( 'data-sgs-mc="transform injected"', $out );
		$this->assertStringNotContainsString( 'data-sgs-ml-mark', $out );
		$this->assertStringContainsString( '--sgs-tilt-x', $this->css(), 'tilt keeps its own return timing' );
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
}

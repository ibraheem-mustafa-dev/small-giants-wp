<?php
/**
 * Tests: the motion renderer's layers and transform channels: injected layers, composed x/y/rotate owners, sheen transition, editor preview and the unsupported-block guard (Spec 38A §6.5, §9, §10; FR-38A-16, FR-38A-49).
 *
 * Renders fixture blocks through the shipped renderer (`includes/motion/class-sgs-motion-renderer.php`) with the
 * WordPress stand-ins in `stubs/motion-render-stubs.php` (block types come from the real block.json files) and reads
 * the collected CSS and the returned markup.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionRendererChannelsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/MotionRendererTestTrait.php';

// The stand-ins define global WordPress functions and load the CSS collector, which would change other test files'
// behaviour in the shared suite process, so every test here runs in its own process and loads them in setUp().
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionRendererChannelsTest extends TestCase {

	use MotionRendererTestTrait;

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

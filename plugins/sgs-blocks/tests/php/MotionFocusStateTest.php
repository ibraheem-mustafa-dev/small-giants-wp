<?php
/**
 * Tests: the form Focus state's emission (Spec 38A §5.1; build plan M3.4).
 *
 * Renders `sgs/form` fixtures through the shipped motion renderer with the WordPress stand-ins in
 * `stubs/motion-render-stubs.php` and reads the collected CSS: the field controls' one transition list, the
 * `:focus-visible` look (border and background colour), the timing per device, the reduced-motion flip, no `outline`
 * and no `box-shadow` (the focus system stays the accessible indicator), a saved form rendered through a linking
 * `sgs/form` block, and the `focus-not-form` refusal off the form root. The values are the Indus enquiry form's
 * (`.claude/reports/2026-10-13-motion-council/forms.md`): border #0A7EA8, background #FFFFFF, 200ms ease.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionFocusStateTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

// The stand-ins define global WordPress functions, so every test runs in its own process (as MotionRendererTest).
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionFocusStateTest extends TestCase {

	private const FORM = '<div class="wp-block-sgs-form sgs-form"><form class="sgs-form__form"><div class="sgs-form-field sgs-form-field--text"><input type="text" class="sgs-form-field__input" /></div><button class="sgs-form__button" type="submit">Send</button></form></div>';

	private const HERO = '<div class="wp-block-sgs-hero"><div class="sgs-hero__content"><p>Hi</p></div></div>';

	private const FOCUS = ':focus-visible:not(:is([aria-invalid="true"],:user-invalid))';

	protected function setUp(): void {
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_is_admin'] = false;
		$GLOBALS['sgs_test_in_loop']  = false;
		$GLOBALS['sgs_test_actions']  = array();
	}

	private static function focus_motion( string $target = 'root' ): array {
		return array(
			'v'        => 1,
			'elements' => array(
				$target => array(
					'hover' => array(
						'focus' => array(
							'values'  => array(
								'borderColour'     => '#0A7EA8',
								'backgroundColour' => '#FFFFFF',
								'duration'         => 200,
								'easing'           => 'ease',
							),
							'devices' => array(
								'tablet' => array( 'duration' => 180 ),
								'mobile' => array( 'duration' => 150 ),
							),
						),
					),
				),
			),
		);
	}

	private function render( string $block, array $motion, string $html ): string {
		return sgs_test_render_motion_block(
			array(
				'blockName' => $block,
				'attrs'     => array( 'sgsMotion' => $motion ),
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

	private function drops(): array {
		return array_values(
			array_filter(
				$GLOBALS['sgs_test_actions'],
				static fn( $a ) => 'sgs_motion_layer_dropped' === $a[0]
			)
		);
	}

	public function test_form_root_focus_emits_field_transition_focus_look_and_reduced_motion(): void {
		$out   = $this->render( 'sgs/form', self::focus_motion(), self::FORM );
		$scope = $this->scope( $out );
		$field = '.' . $scope . ' .sgs-form-field__input';
		$css   = $this->css();

		$this->assertStringContainsString( $field . '{transition:border-color 200ms ease 0ms, background-color 200ms ease 0ms;}', $css );
		$this->assertStringContainsString( $field . self::FOCUS . '{border-color:#0A7EA8;background-color:#FFFFFF;}', $css );
		$this->assertStringContainsString( '@media (max-width:1023px){' . $field . '{transition:border-color 180ms ease 0ms, background-color 180ms ease 0ms;}}', $css );
		$this->assertStringContainsString( '@media (max-width:767px){' . $field . '{transition:border-color 150ms ease 0ms, background-color 150ms ease 0ms;}}', $css );
		$this->assertStringNotContainsString( 'box-shadow', $css, 'the focus system owns a focused field box-shadow' );
		$this->assertStringContainsString( '@media (prefers-reduced-motion: reduce){' . $field . '{transition-duration:var(--wp--custom--duration--instant, 0ms);transition-delay:initial;}}', $css );
		$this->assertStringNotContainsString( 'outline', $css, 'the form keeps its own focus outline' );
		$this->assertStringNotContainsString( 'transition:all', str_replace( ' ', '', $css ) );
		$this->assertSame( array(), $this->drops() );
	}

	public function test_saved_form_rendered_through_a_linking_form_block_gets_the_focus_rules(): void {
		$definition = array(
			'blockName' => 'sgs/form',
			'attrs'     => array(
				'formId'    => 'enquiry',
				'sgsMotion' => self::focus_motion(),
			),
		);
		$inner_out  = '';
		$outer      = array(
			'blockName' => 'sgs/form',
			'attrs'     => array(
				'formId'       => 'enquiry',
				'formIsLinked' => true,
			),
		);
		$outer_html = sgs_test_render_motion_block(
			$outer,
			self::FORM,
			null,
			function () use ( $definition, &$inner_out ) {
				$inner_out = sgs_test_render_motion_block( $definition, self::FORM, new \stdClass() );
			}
		);
		$scope = $this->scope( $inner_out );
		$this->assertStringNotContainsString( 'sgs-m-', $outer_html, 'the linking block carries no motion of its own' );
		$this->assertStringContainsString( '.' . $scope . ' .sgs-form-field__input' . self::FOCUS . '{border-color:#0A7EA8;', $this->css() );
	}

	public function test_refusal_focus_on_a_non_form_block_is_dropped_and_reported(): void {
		$motion                                         = self::focus_motion();
		$motion['elements']['root']['hover']['state'] = array( 'values' => array( 'scale' => 1.03 ) );
		$out                                            = $this->render( 'sgs/hero', $motion, self::HERO );
		$css                                            = $this->css();

		$this->scope( $out );
		$this->assertStringNotContainsString( 'sgs-form-field__input', $css );
		$this->assertStringContainsString( '--sgs-mh-to-s:1.03', $css, 'the rest of the element still emits' );
		$drops = $this->drops();
		$this->assertCount( 1, $drops );
		$this->assertSame( 'sgs/hero', $drops[0][1][0] );
		$this->assertSame( 'root', $drops[0][1][1] );
		$this->assertSame( 'focus-not-form', $drops[0][1][2]['id'] );
		$this->assertSame( 'hover.focus', $drops[0][1][2]['layer'] );
	}

	public function test_refusal_focus_on_a_form_part_is_dropped(): void {
		$this->render( 'sgs/form', self::focus_motion( 'submit-button' ), self::FORM );
		$this->assertStringNotContainsString( 'sgs-form-field__input', $this->css() );
		$drops = $this->drops();
		$this->assertCount( 1, $drops );
		$this->assertSame( 'submit-button', $drops[0][1][1] );
		$this->assertSame( 'focus-not-form', $drops[0][1][2]['id'] );
	}

	public function test_negative_control_a_form_without_focus_writes_no_field_rule(): void {
		$motion = array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.02 ) ) ) ) ),
		);
		$this->render( 'sgs/form', $motion, self::FORM );
		$css = $this->css();
		$this->assertNotSame( '', $css, 'the form still emits its hover state' );
		$this->assertStringNotContainsString( 'sgs-form-field__input', $css );
		$this->assertSame( array(), $this->drops() );
	}

	public function test_a_stored_ring_paints_nothing(): void {
		$motion = array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'hover' => array( 'focus' => array( 'values' => array( 'ringSpread' => 4, 'ringColour' => '#0A7EA824' ) ) ) ) ),
		);
		$this->render( 'sgs/form', $motion, self::FORM );
		$css = $this->css();
		$this->assertStringNotContainsString( 'sgs-form-field__input', $css );
		$this->assertStringNotContainsString( 'box-shadow', $css );
	}

	public function test_a_focus_state_with_no_look_value_emits_nothing(): void {
		$motion = array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'hover' => array( 'focus' => array( 'values' => array( 'duration' => 300 ) ) ) ) ),
		);
		$this->render( 'sgs/form', $motion, self::FORM );
		$this->assertStringNotContainsString( 'sgs-form-field__input', $this->css() );
	}
}

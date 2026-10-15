<?php
/**
 * Tests: the hover state's Grayscale to colour and Border accent fields (Spec 38A §5.1, §10; FR-38A-7; build plan M3.9
 * (b) and (c)).
 *
 * Grayscale to colour rests grey: `restGrayscale` is a resting styling value written to `--sgs-gray-rest`, and the hover
 * grayscale is stored as the hover amount minus the rest amount (`--sgs-mh-to-gray`), so the `filter` channel's
 * `grayscale(calc(var(--sgs-gray-rest) + var(--sgs-mh-gray)))` reads the rest amount at rest and the hover amount on
 * hover. Border accent is an accent line along the element's bottom edge on hover: `accentWidth` and `accentColour`
 * write `--sgs-mh-to-accent` and `--sgs-mh-to-accent-c`, which the `box-shadow` channel paints as an inset shadow
 * beside the ring, on the state's one transition list. Like the ring it is a `box-shadow`, so an element whose block
 * sets a shadow refuses it (`Sgs_Motion_Ring_Guard`), and an accent with no width or no colour is dropped on its own.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionHoverPresetFieldsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;
use SGS\Blocks\Motion\Sgs_Motion_Ring_Guard;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionHoverPresetFieldsTest extends TestCase {

	private const TEXT = '<div class="wp-block-sgs-text"><p class="sgs-text__body">Hi</p></div>';

	private const HERO = '<div class="wp-block-sgs-hero"><div class="sgs-hero__content"><p>Hi</p></div></div>';

	protected function setUp(): void {
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_is_admin'] = false;
		$GLOBALS['sgs_test_in_loop']  = false;
		$GLOBALS['sgs_test_actions']  = array();
	}

	private static function state( array $values, array $devices = array(), string $target = 'root' ): array {
		return array(
			'v'        => 1,
			'elements' => array(
				$target => array(
					'hover' => array(
						'state' => array(
							'values'  => $values,
							'devices' => $devices,
						),
					),
				),
			),
		);
	}

	private function render( string $block, array $motion, string $html, array $attrs = array() ): string {
		return sgs_test_render_motion_block(
			array(
				'blockName' => $block,
				'attrs'     => array_merge( $attrs, array( 'sgsMotion' => $motion ) ),
			),
			$html
		);
	}

	private function css(): string {
		return implode( '', $GLOBALS['sgs_collected_css'] );
	}

	private function drops(): array {
		return array_values(
			array_filter(
				$GLOBALS['sgs_test_actions'],
				static fn( $a ) => 'sgs_motion_layer_dropped' === $a[0] && Sgs_Motion_Ring_Guard::REFUSAL === ( $a[1][2]['id'] ?? '' )
			)
		);
	}

	public function test_grayscale_to_colour_rests_grey_and_stores_the_hover_amount_minus_the_rest(): void {
		$out = $this->render( 'sgs/text', self::state( array( 'restGrayscale' => 1, 'grayscale' => 0, 'duration' => 400 ) ), self::TEXT );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-gray-rest:1;', $css, 'the rest amount is a resting styling value' );
		$this->assertStringContainsString( '--sgs-mh-to-gray:calc(0 - 1);', $css, 'hover 0 minus rest 1, outside the stored 0 to 1 range, so the pair writes a calc' );
		$this->assertMatchesRegularExpression( '/data-sgs-mc="[^"]*\\bfilter\\b/', $out, 'the filter channel is switched on' );
		$this->assertMatchesRegularExpression( '/transition:[^;}]*--sgs-mh-gray 400ms /', $css, 'the change runs on the state\'s timing' );
		$this->assertStringNotContainsString( 'style="', $out, 'no inline style (Spec 32)' );
	}

	public function test_a_rest_grayscale_alone_switches_the_filter_channel_on_with_no_hover_value(): void {
		$out = $this->render( 'sgs/text', self::state( array( 'restGrayscale' => 0.6 ) ), self::TEXT );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-gray-rest:0.6;', $css );
		$this->assertStringNotContainsString( '--sgs-mh-to-gray', $css );
		$this->assertMatchesRegularExpression( '/data-sgs-mc="[^"]*\\bfilter\\b/', $out );
	}

	public function test_a_device_rest_grayscale_rewrites_that_tiers_hover_amount(): void {
		$this->render( 'sgs/text', self::state( array( 'restGrayscale' => 1, 'grayscale' => 0 ), array( 'mobile' => array( 'restGrayscale' => 0.5 ) ) ), self::TEXT );
		$this->assertMatchesRegularExpression( '/@media \\(max-width:767px\\)\\{[^}]*--sgs-gray-rest:0\\.5;--sgs-mh-to-gray:calc\\(0 - 0\\.5\\);/', $this->css() );
	}

	public function test_border_accent_writes_its_owner_values_the_box_shadow_channel_and_its_transition(): void {
		$out = $this->render( 'sgs/text', self::state( array( 'accentWidth' => 3, 'accentColour' => 'accent', 'duration' => 250 ) ), self::TEXT );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-mh-to-accent:3px;', $css );
		$this->assertStringContainsString( '--sgs-mh-to-accent-c:var(--wp--preset--color--accent, currentColor);', $css );
		$this->assertMatchesRegularExpression( '/data-sgs-mc="[^"]*\\bbox-shadow\\b/', $out );
		$this->assertMatchesRegularExpression( '/transition:[^;}]*--sgs-mh-accent 250ms /', $css );
		$this->assertStringNotContainsString( 'outline', $css, 'the keyboard focus outline is never touched' );
		$this->assertStringNotContainsString( '--sgs-mh-to-ring', $css );
		$this->assertSame( array(), $this->drops() );
	}

	public function test_a_shadowed_block_refuses_the_accent_and_keeps_the_rest_of_the_state(): void {
		$out = $this->render(
			'sgs/hero',
			self::state( array( 'accentWidth' => 3, 'accentColour' => '#0A7EA8', 'translateY' => -4 ), array( 'tablet' => array( 'accentWidth' => 2 ) ), 'wrapper' ),
			self::HERO,
			array( 'shadow' => 'md' )
		);
		$css = $this->css();
		$this->assertStringNotContainsString( '--sgs-mh-to-accent', $css );
		$this->assertDoesNotMatchRegularExpression( '/data-sgs-mc="[^"]*\\bbox-shadow\\b/', $out );
		$this->assertStringContainsString( '--sgs-mh-to-ty:', $css, 'the lift is still written' );
		$this->assertCount( 1, $this->drops(), 'the refusal is reported once' );
	}

	public function test_an_invisible_ring_is_dropped_on_its_own_and_a_painting_accent_stays(): void {
		$out = $this->render( 'sgs/text', self::state( array( 'ringSpread' => 4, 'accentWidth' => 3, 'accentColour' => '#0A7EA8' ) ), self::TEXT );
		$css = $this->css();
		$this->assertStringNotContainsString( '--sgs-mh-to-ring', $css, 'a ring with no colour is dropped' );
		$this->assertStringContainsString( '--sgs-mh-to-accent:3px;', $css, 'the accent is not dropped with it' );
		$this->assertMatchesRegularExpression( '/data-sgs-mc="[^"]*\\bbox-shadow\\b/', $out );
		$this->assertSame( array(), $this->drops(), 'an invisible ring is not a refusal' );
	}

	public function test_an_accent_with_no_width_or_no_colour_is_dropped_and_a_ring_stays(): void {
		foreach (
			array(
				'zero width' => array( 'accentWidth' => 0, 'accentColour' => '#0A7EA8' ),
				'no colour'  => array( 'accentWidth' => 3 ),
			) as $label => $values
		) {
			$GLOBALS['sgs_collected_css'] = array();
			Sgs_Motion_Renderer::reset();
			$this->render( 'sgs/text', self::state( $values + array( 'ringSpread' => 2, 'ringColour' => '#0A7EA8' ) ), self::TEXT );
			$this->assertStringNotContainsString( '--sgs-mh-to-accent', $this->css(), $label );
			$this->assertStringContainsString( '--sgs-mh-to-ring:2px;', $this->css(), $label . ': the ring is kept' );
		}
	}
}

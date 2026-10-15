<?php
/**
 * Tests: the hover ring (Spec 38A §5.1; FR-38A-42's ring clause; build plan M3.9).
 *
 * Renders fixtures through the shipped motion renderer with the WordPress stand-ins in `stubs/motion-render-stubs.php`
 * and reads the collected CSS. The ring is two owner values (`--sgs-mh-to-ring`, `--sgs-mh-to-ring-c`) on the element
 * plus the stylesheet's `box-shadow` channel (`data-sgs-mc`), on the hover state's one transition list; it is dropped
 * where the block sets a shadow of its own (`Sgs_Motion_Ring_Guard`, read from `block.json`'s
 * `attrMap["css:box-shadow"]`), at a zero spread and with no colour, and it never writes `outline`.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionRingTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;
use SGS\Blocks\Motion\Sgs_Motion_Ring_Guard;

// The stand-ins define global WordPress functions, so every test runs in its own process (as MotionRendererTest).
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionRingTest extends TestCase {

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

	private static function ring_motion( array $values, array $devices = array(), string $target = 'root' ): array {
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

	public function test_ring_on_an_unshadowed_block_writes_the_owner_values_the_channel_and_a_box_shadow_transition(): void {
		$out = $this->render( 'sgs/text', self::ring_motion( array( 'ringSpread' => 4, 'ringColour' => '#0A7EA8', 'duration' => 250 ) ), self::TEXT );
		$css = $this->css();

		$this->assertStringContainsString( '--sgs-mh-to-ring:4px;', $css );
		$this->assertStringContainsString( '--sgs-mh-to-ring-c:#0A7EA8;', $css );
		$this->assertMatchesRegularExpression( '/transition:[^;}]*box-shadow 250ms [^;}]*\\b0ms\\b/', $css, 'box-shadow is in the state\'s one transition list' );
		$this->assertMatchesRegularExpression( '/data-sgs-mc="[^"]*\\bbox-shadow\\b/', $out, 'the stylesheet\'s box-shadow channel is switched on' );
		$this->assertStringContainsString( 'data-sgs-mh="self"', $out );
		$this->assertStringNotContainsString( 'outline', $css, 'the keyboard focus outline is never touched' );
		$this->assertStringNotContainsString( 'style="', $out, 'no inline style (Spec 32)' );
		$this->assertSame( array(), $this->drops() );
	}

	public function test_ring_colour_forms_preset_slug_hex_and_alpha_hex(): void {
		foreach (
			array(
				'accent'    => 'var(--wp--preset--color--accent, currentColor)',
				'#0A7EA8'   => '#0A7EA8',
				'#0A7EA824' => '#0A7EA824',
			) as $stored => $expected
		) {
			$GLOBALS['sgs_collected_css'] = array();
			Sgs_Motion_Renderer::reset();
			$this->render( 'sgs/text', self::ring_motion( array( 'ringSpread' => 3, 'ringColour' => $stored ) ), self::TEXT );
			$this->assertStringContainsString( '--sgs-mh-to-ring-c:' . $expected . ';', $this->css(), 'colour ' . $stored );
		}
	}

	public function test_ring_spread_per_device_override_is_kept_when_the_desktop_ring_paints(): void {
		$this->render( 'sgs/text', self::ring_motion( array( 'ringSpread' => 4, 'ringColour' => '#0A7EA8' ), array( 'mobile' => array( 'ringSpread' => 0 ) ) ), self::TEXT );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-mh-to-ring:4px;', $css );
		$this->assertStringContainsString( '@media (max-width:767px){', $css );
		$this->assertMatchesRegularExpression( '/@media \\(max-width:767px\\)\\{[^}]*--sgs-mh-to-ring:0px;/', $css, 'a tier can turn the ring off' );
	}

	public function test_zero_spread_and_a_missing_colour_write_no_ring(): void {
		foreach (
			array(
				'zero spread'  => array( 'ringSpread' => 0, 'ringColour' => '#0A7EA8' ),
				'no colour'    => array( 'ringSpread' => 4 ),
				'colour only'  => array( 'ringColour' => '#0A7EA8', 'translateY' => -4 ),
			) as $label => $values
		) {
			$GLOBALS['sgs_collected_css'] = array();
			Sgs_Motion_Renderer::reset();
			$out = $this->render( 'sgs/text', self::ring_motion( $values ), self::TEXT );
			$this->assertStringNotContainsString( '--sgs-mh-to-ring', $this->css(), $label );
			$this->assertDoesNotMatchRegularExpression( '/data-sgs-mc="[^"]*\\bbox-shadow\\b/', $out, $label );
			$this->assertSame( array(), $this->drops(), $label . ': a missing ring is not a refusal' );
		}
	}

	public function test_a_block_that_sets_a_shadow_refuses_the_ring_and_keeps_the_rest_of_the_state(): void {
		$out = $this->render(
			'sgs/hero',
			self::ring_motion( array( 'ringSpread' => 4, 'ringColour' => '#0A7EA8', 'translateY' => -4 ), array( 'tablet' => array( 'ringSpread' => 2 ) ), 'wrapper' ),
			self::HERO,
			array( 'shadow' => 'md' )
		);
		$css = $this->css();
		$this->assertStringNotContainsString( '--sgs-mh-to-ring', $css );
		$this->assertDoesNotMatchRegularExpression( '/data-sgs-mc="[^"]*\\bbox-shadow\\b/', $out );
		$this->assertStringContainsString( '--sgs-mh-to-ty:', $css, 'the lift is still written' );
		$this->assertCount( 1, $this->drops(), 'the refusal is reported once' );
		$this->assertSame( array( 'sgs/hero', 'wrapper' ), array( $this->drops()[0][1][0], $this->drops()[0][1][1] ) );
	}

	public function test_the_same_block_with_no_shadow_set_gets_the_ring(): void {
		foreach ( array( array(), array( 'shadow' => '' ), array( 'shadow' => 'none' ) ) as $attrs ) {
			$GLOBALS['sgs_collected_css'] = array();
			Sgs_Motion_Renderer::reset();
			$this->render( 'sgs/hero', self::ring_motion( array( 'ringSpread' => 4, 'ringColour' => '#0A7EA8' ), array(), 'wrapper' ), self::HERO, $attrs );
			$this->assertStringContainsString( '--sgs-mh-to-ring:4px;', $this->css(), wp_json_encode( $attrs ) );
		}
	}

	public function test_a_shadowed_default_refuses_the_ring_without_a_stored_value(): void {
		// sgs/mega-panel's `shadow` defaults to "floating" in block.json, so an unsaved attribute still means a shadow.
		$this->assertTrue( Sgs_Motion_Ring_Guard::refused( 'sgs/mega-panel', 'panel', array() ) );
		$this->assertFalse( Sgs_Motion_Ring_Guard::refused( 'sgs/mega-panel', 'panel', array( 'shadow' => 'none' ) ) );
	}

	public function test_a_hover_shadow_and_the_native_shadow_support_count_as_a_shadow(): void {
		$this->assertTrue( Sgs_Motion_Ring_Guard::refused( 'sgs/text', 'text', array( 'boxShadowHover' => 'lg' ) ), 'a hover shadow clashes with the ring' );
		$this->assertTrue( Sgs_Motion_Ring_Guard::refused( 'sgs/info-box', 'box', array( 'style' => array( 'shadow' => 'var(--wp--preset--shadow--natural)' ) ) ), 'native style.shadow' );
		$this->assertTrue( Sgs_Motion_Ring_Guard::refused( 'sgs/info-box', 'box', array() ), 'its elevated variant paints a stylesheet shadow, so the box is refused in every variant' );
		$this->assertFalse( Sgs_Motion_Ring_Guard::refused( 'sgs/info-box', 'title', array() ) );
	}

	public function test_root_target_is_refused_through_the_blocks_wrapper_element(): void {
		$this->assertContains( 'shadow', Sgs_Motion_Ring_Guard::shadow_attributes( 'sgs/hero', 'root' ) );
		$this->assertTrue( Sgs_Motion_Ring_Guard::refused( 'sgs/hero', 'root', array( 'shadow' => 'md' ) ) );
		$this->assertSame( array(), Sgs_Motion_Ring_Guard::shadow_attributes( 'sgs/hero', 'media' ), 'an element with no box-shadow attribute is never refused' );
	}

	public function test_a_stylesheet_shadow_with_no_attribute_refuses_the_ring_on_product_card(): void {
		// The card's boundary shadow comes from style.css (`.product-card`, WCAG 1.4.11) and no attribute names it, so the
		// attrMap alone cannot see it; the element's `restingShadow` marker (migrate-motion-resting-shadows.py) does.
		$this->assertSame( array(), Sgs_Motion_Ring_Guard::shadow_attributes( 'sgs/product-card', 'root' ), 'no attribute paints it' );
		$this->assertTrue( Sgs_Motion_Ring_Guard::refused( 'sgs/product-card', 'root', array() ) );
		$out = $this->render( 'sgs/product-card', self::ring_motion( array( 'ringSpread' => 4, 'ringColour' => '#0A7EA8', 'translateY' => -4 ) ), '<div class="wp-block-sgs-product-card product-card"><p>Card</p></div>' );
		$this->assertStringNotContainsString( '--sgs-mh-to-ring', $this->css() );
		$this->assertDoesNotMatchRegularExpression( '/data-sgs-mc="[^"]*\bbox-shadow\b/', $out );
		$this->assertStringContainsString( '--sgs-mh-to-ty:', $this->css(), 'the lift is still written' );
		$this->assertCount( 1, $this->drops() );
	}

	public function test_a_part_with_no_resting_shadow_still_gets_the_ring_on_a_block_that_has_one_elsewhere(): void {
		$this->assertFalse( Sgs_Motion_Ring_Guard::refused( 'sgs/product-card', 'title', array() ) );
		$this->assertTrue( Sgs_Motion_Ring_Guard::refused( 'sgs/product-card', 'box', array() ), 'the marked wrapper part' );
	}

	public function test_a_delegating_block_is_refused_when_the_child_it_prints_has_a_shadow(): void {
		$GLOBALS['sgs_test_block_types']['sgs/fake-grid'] = array(
			'supports' => array(
				'sgs' => array(
					'elements'       => array( 'item' => new \stdClass() ),
					'motionDelegate' => array(
						'attribute' => 'source',
						'values'    => array( 'cards' ),
						'block'     => 'sgs/product-card',
						'parts'     => array( 'item' => 'root', 'title' => 'title' ),
					),
				),
			),
		);
		$this->assertTrue( Sgs_Motion_Ring_Guard::refused( 'sgs/fake-grid', 'item', array( 'source' => 'cards' ) ), 'its item is the product card root' );
		$this->assertFalse( Sgs_Motion_Ring_Guard::refused( 'sgs/fake-grid', 'item', array( 'source' => 'manual' ) ), 'not delegating: its own item has no shadow' );
		$this->assertFalse( Sgs_Motion_Ring_Guard::refused( 'sgs/fake-grid', 'title', array( 'source' => 'cards' ) ), 'a mapped part with no shadow' );
	}
}

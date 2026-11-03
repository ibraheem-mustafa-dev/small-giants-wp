<?php
/**
 * sgs/accordion-item: the header follows a rounded item's corners, and the
 * toggle icon takes an optional ring (iconCircle* from the parent accordion).
 *
 * Run with: vendor/bin/phpunit --filter AccordionItemHeaderRingTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class AccordionItemHeaderRingTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const ITEM = array( 'title' => 'A question' );

	public function test_no_radius_prints_no_header_radius(): void {
		$out = $this->render_block( 'sgs/accordion-item', self::ITEM );

		$this->assertStringNotContainsString( 'radius', $out['css'] );
	}

	public function test_radius_follows_onto_the_header_with_open_state_squaring(): void {
		$box = array( 'topLeft' => '999px', 'topRight' => '999px', 'bottomRight' => '999px', 'bottomLeft' => '999px' );
		$out = $this->render_block( 'sgs/accordion-item', self::ITEM + array( 'borderRadius' => array( 'desktop' => $box, 'mobile' => $box ) ) );

		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-accordion-item > \.sgs-accordion-item__header\{[^}]*radius[^}]*999px/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{[^{]*> \.sgs-accordion-item__header\{[^}]*radius/', $out['css'] );
		$this->assertStringContainsString( '[open] > .sgs-accordion-item__header{border-bottom-left-radius:0;border-bottom-right-radius:0}', $out['css'] );
		$this->assertStringNotContainsString( 'overflow', $out['css'] );
	}

	public function test_no_ring_attributes_print_no_ring_rule(): void {
		$out = $this->render_block( 'sgs/accordion-item', self::ITEM );

		$this->assertStringNotContainsString( '__icons{', $out['css'] );
	}

	public function test_ring_prints_size_border_background_and_open_state(): void {
		$out = $this->render_block(
			'sgs/accordion-item',
			self::ITEM,
			array(
				'sgs/accordionIconCircleSize'            => array( 'desktop' => 32 ),
				'sgs/accordionIconCircleBorderWidth'     => array( 'top' => '1.5px', 'right' => '1.5px', 'bottom' => '1.5px', 'left' => '1.5px' ),
				'sgs/accordionIconCircleBorderColour'    => 'rgba(30,42,60,.2)',
				'sgs/accordionIconCircleBorderColourOpen' => '#0A7EA8',
				'sgs/accordionIconCircleBackgroundOpen'  => 'rgba(10,126,168,.08)',
			)
		);

		$this->assertStringContainsString( 'box-sizing:border-box;border-radius:50%;display:grid;place-items:center', $out['css'] );
		$this->assertStringContainsString( 'border-width:1.5px 1.5px 1.5px 1.5px', $out['css'] );
		$this->assertStringContainsString( 'border-color:#1E2A3C33', $out['css'] );
		$this->assertStringContainsString( '__icons{width:32px;height:32px;}', $out['css'] );
		$this->assertMatchesRegularExpression( '/\[open\] > \.sgs-accordion-item__header \.sgs-accordion-item__icons\{border-color:#0A7EA8;background-color:#0A7EA814;\}/', $out['css'] );
	}

	public function test_no_header_paint_prints_no_tone_marker(): void {
		$out = $this->render_block( 'sgs/accordion-item', self::ITEM );

		$this->assertStringContainsString( '<summary class="sgs-accordion-item__header"', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-on-dark', $out['html'] );
	}

	public function test_dark_header_background_marks_the_summary_on_dark(): void {
		$out = $this->render_block( 'sgs/accordion-item', self::ITEM, array( 'sgs/accordionHeaderBackground' => '#0b1f3a' ) );

		$this->assertStringContainsString( '<summary class="sgs-accordion-item__header sgs-on-dark"', $out['html'] );
	}

	public function test_light_header_background_marks_the_summary_on_light(): void {
		$out = $this->render_block( 'sgs/accordion-item', self::ITEM, array( 'sgs/accordionHeaderBackground' => '#ffffff' ) );

		$this->assertStringContainsString( '<summary class="sgs-accordion-item__header sgs-on-light"', $out['html'] );
	}

	public function test_dark_header_gradient_marks_the_summary_on_dark(): void {
		$out = $this->render_block( 'sgs/accordion-item', self::ITEM, array( 'sgs/accordionHeaderBackgroundGradient' => 'linear-gradient(90deg,#0b1f3a,#14325c)' ) );

		$this->assertStringContainsString( 'sgs-accordion-item__header sgs-on-dark"', $out['html'] );
	}

	public function test_open_background_decides_when_there_is_no_resting_paint(): void {
		$out = $this->render_block( 'sgs/accordion-item', self::ITEM, array( 'sgs/accordionHeaderBackgroundOpen' => '#0b1f3a' ) );

		$this->assertStringContainsString( 'sgs-accordion-item__header sgs-on-dark"', $out['html'] );
	}
}

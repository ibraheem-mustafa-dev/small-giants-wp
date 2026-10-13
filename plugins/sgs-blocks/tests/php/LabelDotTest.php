<?php
/**
 * Sgs/label: the opt-in leading dot paints as a decorative `::before` on the label root, from
 * dotColour/dotColourGradient, dotSize and dotGap, and stays out of the label's text.
 *
 * Run with: vendor/bin/phpunit --filter LabelDotTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Leading dot on sgs/label.
 */
final class LabelDotTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Render a label with the given extra attributes.
	 *
	 * @param array $extra Attributes merged over the label text.
	 * @return array{html:string,css:string}
	 */
	private function label( array $extra ): array {
		return $this->render_block( 'sgs/label', array_merge( array( 'text' => 'Halal certified' ), $extra ) );
	}

	/**
	 * The draft's 7px #0A7EA8 dot with an 8px gap.
	 */
	public function test_dot_paints_size_colour_and_gap_on_the_before_layer(): void {
		$out = $this->label(
			array(
				'dot'       => true,
				'dotColour' => '#0A7EA8',
				'dotSize'   => '7px',
				'dotGap'    => '8px',
			)
		);

		$this->assertMatchesRegularExpression(
			'/\.sgs-lbl-[0-9a-f]{8}\.wp-block-sgs-label::before\{content:"";display:inline-block;flex-shrink:0;width:7px;height:7px;border-radius:50%;vertical-align:middle;margin-inline-end:8px;background-color:#0A7EA8;\}/',
			$out['css']
		);
		$this->assertStringContainsString( '>Halal certified</span>', $out['html'], 'the label text stays the accessible text' );
	}

	/**
	 * The defaults give a 7px dot, an 8px (spacing preset 20) gap and the text colour.
	 */
	public function test_defaults_paint_a_current_colour_dot(): void {
		$out = $this->label( array( 'dot' => true ) );

		$this->assertMatchesRegularExpression( '/::before\{content:"";[^}]*width:7px;height:7px;[^}]*margin-inline-end:8px;background-color:currentColor;\}/', $out['css'] );
	}

	/**
	 * A gradient wins over the flat colour.
	 */
	public function test_gradient_paints_background_image(): void {
		$out = $this->label(
			array(
				'dot'               => true,
				'dotColour'         => '#0A7EA8',
				'dotColourGradient' => 'linear-gradient(90deg,#0A7EA8 0%,#2C3E50 100%)',
			)
		);

		$this->assertStringContainsString( 'background-image:linear-gradient(90deg,#0A7EA8 0%,#2C3E50 100%);}', $out['css'] );
	}

	/**
	 * A size or gap that is not a CSS length cannot carry CSS out of the rule.
	 */
	public function test_unsafe_lengths_fall_back(): void {
		$out = $this->label(
			array(
				'dot'     => true,
				'dotSize' => '7px;}body{display:none',
				'dotGap'  => '8px}body{color:red',
			)
		);

		$this->assertStringNotContainsString( 'body{', $out['css'] );
		$this->assertStringContainsString( 'width:7px;height:7px;', $out['css'] );
	}

	/**
	 * Off by default: an existing label prints no dot.
	 */
	public function test_no_dot_unless_switched_on(): void {
		$out = $this->label( array( 'dotColour' => '#0A7EA8' ) );

		$this->assertStringContainsString( 'Halal certified', $out['html'], 'positive control: the label rendered' );
		$this->assertStringNotContainsString( '::before', $out['css'], 'negative control: no dot when the switch is off' );
	}
}

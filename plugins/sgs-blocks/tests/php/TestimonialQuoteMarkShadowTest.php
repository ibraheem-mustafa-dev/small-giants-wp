<?php
/**
 * sgs/testimonial: the decorative quote mark and the resting card shadow.
 *
 * Run with: vendor/bin/phpunit --filter TestimonialQuoteMarkShadowTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TestimonialQuoteMarkShadowTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function block( array $extra ): array {
		return $this->render_block( 'sgs/testimonial', array_merge( array( 'quote' => 'Brilliant.', 'reviewerName' => 'A. Client' ), $extra ) );
	}

	public function test_the_glyph_prints_first_inside_the_card_and_is_hidden_from_screen_readers(): void {
		$out = $this->block( array( 'quoteMarkGlyph' => "\u{201C}", 'variant' => 'classic-card' ) );

		$this->assertMatchesRegularExpression( '/<div [^>]*>\s*<span class="sgs-testimonial__mark" aria-hidden="true">\x{201C}<\/span>/u', $out['html'] );
	}

	public function test_colour_and_a_size_per_device_print_on_the_mark(): void {
		$out = $this->block( array( 'quoteMarkGlyph' => "\u{201C}", 'quoteMarkColour' => '#0a7ea8', 'quoteMarkSize' => array( 'desktop' => '60px', 'mobile' => '36px' ) ) );

		$this->assertMatchesRegularExpression( '/\.sgs-testimonial__mark\{color:#0a7ea8;\}/i', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-testimonial__mark\{font-size:60px;?\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^}]*\.sgs-testimonial__mark\{font-size:36px/', $out['css'] );
	}

	public function test_the_glyph_is_cut_to_eight_characters_and_stripped_of_tags(): void {
		$out = $this->block( array( 'quoteMarkGlyph' => '<b>123456789</b>' ) );

		$this->assertStringContainsString( '>12345678<', $out['html'] );
		$this->assertStringNotContainsString( '<b>', $out['html'] );
	}

	public function test_no_glyph_prints_no_mark_and_no_mark_rule(): void {
		foreach ( array( array(), array( 'quoteMarkGlyph' => '' ), array( 'quoteMarkGlyph' => '  ', 'quoteMarkColour' => '#f00', 'quoteMarkSize' => array( 'desktop' => '60px' ) ) ) as $attrs ) {
			$out = $this->block( $attrs );
			$this->assertStringNotContainsString( 'sgs-testimonial__mark', $out['html'] );
			$this->assertStringNotContainsString( 'sgs-testimonial__mark', $out['css'] );
		}
	}

	public function test_the_resting_shadow_prints_on_the_card_with_its_colour_and_lifts_on_hover(): void {
		$out = $this->block( array( 'boxShadow' => '0 26px 44px -26px', 'boxShadowColour' => 'rgba(0,0,0,0.55)' ) );

		$this->assertMatchesRegularExpression( '/wp-block-sgs-testimonial\{[^}]*box-shadow:0px 26px 44px -26px #0000008C/', $out['css'] );
		$this->assertMatchesRegularExpression( '/wp-block-sgs-testimonial:hover[^{]*\{[^}]*box-shadow:/', $out['css'], 'the shared automatic lift joins the hover rule' );
	}

	public function test_an_explicit_hover_shadow_keeps_its_own_path_and_gets_no_second_hover_rule(): void {
		$out = $this->block( array( 'boxShadow' => '0 8px 20px 0', 'boxShadowColour' => 'rgba(0,0,0,0.3)', 'shadowHover' => '0 14px 30px 0', 'shadowColourHover' => 'rgba(0,0,0,0.4)' ) );

		$this->assertStringContainsString( '--sgs-hover-shadow:', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/wp-block-sgs-testimonial:hover[^{]*\{[^}]*box-shadow:/', $out['css'] );
	}

	public function test_unset_resting_shadow_prints_no_box_shadow(): void {
		$out = $this->block( array() );

		$this->assertStringNotContainsString( 'box-shadow', $out['css'] );
	}

	public function test_the_resting_shadow_replaces_the_native_shadow_value(): void {
		$native = $this->block( array( 'style' => array( 'shadow' => '0 1px 2px 0 #000' ) ) );
		$this->assertStringContainsString( 'box-shadow:0 1px 2px 0 #000', $native['css'], 'positive control: the native value paints alone' );

		$both = $this->block( array( 'style' => array( 'shadow' => '0 1px 2px 0 #000' ), 'boxShadow' => '0 8px 20px 0', 'boxShadowColour' => '#123456' ) );
		$this->assertStringNotContainsString( '0 1px 2px 0 #000', $both['css'] );
		$this->assertStringContainsString( '0px 8px 20px 0px #123456', $both['css'] );
	}
}

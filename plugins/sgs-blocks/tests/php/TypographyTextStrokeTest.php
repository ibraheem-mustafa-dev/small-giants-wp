<?php
/**
 * Hollow outlined lettering (includes/helpers-typography.php::sgs_typography_css_rule): an outline width per
 * device tier, an outline colour and a hover colour on the block's own text.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter TypographyTextStrokeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TypographyTextStrokeTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function text( array $attrs ): array {
		return $this->render_block( 'sgs/text', array_merge( array( 'text' => 'Since 1998' ), $attrs ) );
	}

	public function test_width_and_colour_print_per_tier_with_a_guarded_hover(): void {
		$out = $this->text(
			array(
				'textStrokeWidth'       => array( 'desktop' => 2, 'mobile' => 1.5 ),
				'textStrokeColour'      => '#0A7EA8',
				'textStrokeColourHover' => '#D8CA50',
			)
		);
		$css = $out['css'];

		$this->assertStringContainsString( 'Since 1998', $out['html'], 'positive control: the block rendered' );
		$this->assertMatchesRegularExpression( '/\{[^}]*-webkit-text-stroke-width:2px;[^}]*\}/', $css, 'base width' );
		$this->assertMatchesRegularExpression( '/\{[^}]*-webkit-text-stroke-color:#0A7EA8;[^}]*\}/', $css, 'base colour' );
		$this->assertMatchesRegularExpression( '/@media \(max-width:\s*767px\)\s*\{[^{}]*\{[^}]*-webkit-text-stroke-width:1\.5px/', $css, 'mobile width' );
		$this->assertMatchesRegularExpression( '/@media \(hover: hover\)[^{]*\{[^{]*:hover\{[^}]*-webkit-text-stroke-color:#D8CA50/', $css, 'hover sits behind the touch guard' );
	}

	public function test_a_colour_slug_resolves_through_the_colour_helper(): void {
		$css = $this->text( array( 'textStrokeColour' => 'primary' ) )['css'];

		$this->assertStringContainsString( '-webkit-text-stroke-color:var(--wp--preset--color--primary', $css );
	}

	public function test_a_width_with_no_colour_prints_no_colour(): void {
		$css = $this->text( array( 'textStrokeWidth' => array( 'desktop' => 2 ) ) )['css'];

		$this->assertStringContainsString( '-webkit-text-stroke-width:2px', $css );
		$this->assertStringNotContainsString( '-webkit-text-stroke-color', $css, 'the stroke then takes the text colour' );
	}

	public function test_a_hostile_colour_cannot_break_out_of_the_declaration(): void {
		$css = $this->text( array( 'textStrokeColour' => 'red;} body{display:none' ) )['css'];

		$this->assertStringNotContainsString( 'display:none', $css );
		$this->assertStringNotContainsString( 'body{', $css );
	}

	public function test_nothing_set_prints_no_text_stroke(): void {
		$out = $this->text( array( 'fontWeight' => '700' ) );

		$this->assertStringContainsString( 'font-weight:700', $out['css'], 'positive control: the typography rule printed' );
		$this->assertStringNotContainsString( 'text-stroke', $out['css'] );
	}
}

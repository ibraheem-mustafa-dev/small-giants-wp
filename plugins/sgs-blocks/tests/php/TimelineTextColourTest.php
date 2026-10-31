<?php
/**
 * sgs/timeline: the shared text colour control (flat, gradient, hover, hover gradient) reaches the entry title and description.
 *
 * The title and description paint their own `color` in style.scss, so a colour set only on the root never reached them.
 *
 * Run with: vendor/bin/phpunit --filter TimelineTextColourTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TimelineTextColourTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const GRADIENT = 'linear-gradient(90deg,#f00,#00f)';

	private function block( array $extra ): array {
		$out = $this->render_block(
			'sgs/timeline',
			array_merge( array( 'entries' => array( array( 'date' => '2020', 'title' => 'Opened', 'description' => 'We opened', 'icon' => '', 'image' => 0 ) ) ), $extra )
		);
		$this->assertStringContainsString( 'sgs-timeline__title', $out['html'], 'positive control: the entry rendered' );
		return $out;
	}

	public function test_flat_colour_reaches_title_and_description(): void {
		$css = $this->block( array( 'textColour' => '#112233' ) )['css'];

		foreach ( array( 'title', 'description' ) as $el ) {
			$this->assertMatchesRegularExpression( '/\.sgs-tl-[0-9a-f]{8}\.sgs-timeline \.sgs-timeline__' . $el . '\{color:#112233;\}/', $css, "flat colour on the $el" );
		}
	}

	public function test_gradient_reaches_title_and_description(): void {
		$css = $this->block( array( 'textColourGradient' => self::GRADIENT ) )['css'];

		foreach ( array( 'title', 'description' ) as $el ) {
			$this->assertMatchesRegularExpression( '/\.sgs-tl-[0-9a-f]{8}\.sgs-timeline \.sgs-timeline__' . $el . '\{background-image:linear-gradient\(90deg,#f00,#00f\);-webkit-background-clip:text;background-clip:text;color:transparent;\}/', $css, "gradient on the $el" );
		}
	}

	public function test_hover_colour_reaches_title_and_description_without_a_resting_colour(): void {
		$css = $this->block( array( 'textColourHover' => '#445566' ) )['css'];

		foreach ( array( 'title', 'description' ) as $el ) {
			$this->assertMatchesRegularExpression( '/\.sgs-tl-[0-9a-f]{8}\.sgs-timeline:hover \.sgs-timeline__' . $el . '\{color:#445566\}/', $css, "hover colour on the $el" );
		}
	}

	public function test_hover_gradient_reaches_title_and_description_without_a_resting_colour(): void {
		$css = $this->block( array( 'textColourHoverGradient' => self::GRADIENT ) )['css'];

		foreach ( array( 'title', 'description' ) as $el ) {
			$this->assertMatchesRegularExpression( '/\.sgs-tl-[0-9a-f]{8}\.sgs-timeline:hover \.sgs-timeline__' . $el . '\{background-image:linear-gradient\(90deg,#f00,#00f\);-webkit-background-clip:text;background-clip:text;color:transparent\}/', $css, "hover gradient on the $el" );
		}
	}

	public function test_nothing_is_printed_when_no_text_colour_is_set(): void {
		$css = $this->block( array() )['css'];

		$this->assertDoesNotMatchRegularExpression( '/\.sgs-timeline__(title|description)\{color:/', $css, 'negative control' );
		$this->assertStringNotContainsString( 'sgs-timeline:hover .sgs-timeline__title', $css );
	}
}

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

		foreach ( array( 'title', 'date', 'description' ) as $el ) {
			$this->assertMatchesRegularExpression( '/\.sgs-tl-[0-9a-f]{8}\.sgs-timeline \.sgs-timeline__' . $el . '\{color:#112233;\}/', $css, "flat colour on the $el" );
		}
	}

	public function test_gradient_reaches_title_and_description(): void {
		$css = $this->block( array( 'textColourGradient' => self::GRADIENT ) )['css'];

		foreach ( array( 'title', 'date', 'description' ) as $el ) {
			$this->assertMatchesRegularExpression( '/\.sgs-tl-[0-9a-f]{8}\.sgs-timeline \.sgs-timeline__' . $el . '\{background-image:linear-gradient\(90deg,#f00,#00f\);-webkit-background-clip:text;background-clip:text;color:transparent;[^}]*\}/', $css, "gradient on the $el" );
		}
	}

	public function test_hover_colour_reaches_title_and_description_without_a_resting_colour(): void {
		$css = $this->block( array( 'textColourHover' => '#445566' ) )['css'];

		foreach ( array( 'title', 'date', 'description' ) as $el ) {
			$this->assertMatchesRegularExpression( '/\.sgs-tl-[0-9a-f]{8}\.sgs-timeline:hover \.sgs-timeline__' . $el . '\{color:#445566\}/', $css, "hover colour on the $el" );
		}
	}

	public function test_hover_gradient_reaches_title_and_description_without_a_resting_colour(): void {
		$css = $this->block( array( 'textColourHoverGradient' => self::GRADIENT ) )['css'];

		foreach ( array( 'title', 'date', 'description' ) as $el ) {
			$this->assertMatchesRegularExpression( '/\.sgs-tl-[0-9a-f]{8}\.sgs-timeline:hover \.sgs-timeline__' . $el . '\{background-image:linear-gradient\(90deg,#f00,#00f\);-webkit-background-clip:text;background-clip:text;color:transparent[^}]*\}/', $css, "hover gradient on the $el" );
		}
	}

	public function test_nothing_is_printed_when_no_text_colour_is_set(): void {
		$css = $this->block( array() )['css'];

		$this->assertDoesNotMatchRegularExpression( '/\.sgs-timeline__(title|description)\{color:/', $css, 'negative control' );
		$this->assertStringNotContainsString( 'sgs-timeline:hover .sgs-timeline__title', $css );
	}

	public function test_own_colour_replaces_the_generic_one_per_element(): void {
		$css = $this->block(
			array(
				'textColour'                 => '#112233',
				'titleColour'                => '#aa0000',
				'dateColourGradient'         => self::GRADIENT,
				'descriptionTextColourHover' => '#00aa00',
				'textColourHover'            => '#445566',
			)
		)['css'];

		$this->assertStringContainsString( '.sgs-timeline .sgs-timeline__title{color:#aa0000;}', $css, 'own title colour' );
		$this->assertStringNotContainsString( '.sgs-timeline__title{color:#112233', $css, 'the generic colour does not paint the title' );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__date\{background-image:linear-gradient/', $css, 'own date gradient' );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__description\{color:#112233;\}/', $css, 'description keeps the generic resting colour' );
		$this->assertMatchesRegularExpression( '/:hover \.sgs-timeline__description\{color:#00aa00\}/', $css, 'own description hover' );
		$this->assertMatchesRegularExpression( '/:hover \.sgs-timeline__title\{color:#445566\}/', $css, 'generic hover on the title' );
	}

	public function test_the_date_has_no_colour_of_its_own_by_default(): void {
		$css = $this->block( array() )['css'];

		$this->assertStringNotContainsString( '--sgs-date-colour', $css, 'no accent default' );
		$this->assertDoesNotMatchRegularExpression( '/\.sgs-timeline__date\{color:/', $css );
	}

	public function test_a_gradient_gets_its_own_box_and_keeps_its_alignment(): void {
		$centre = $this->block( array( 'titleColourGradient' => self::GRADIENT, 'titleTextAlign' => array( 'desktop' => 'center' ) ) )['css'];
		$this->assertMatchesRegularExpression( '/__title\{[^}]*width:fit-content;max-width:100%;-webkit-box-decoration-break:clone;box-decoration-break:clone;margin-inline:auto;?\}/', $centre );

		$right = $this->block( array( 'titleColourGradient' => self::GRADIENT, 'titleTextAlign' => array( 'desktop' => 'right' ) ) )['css'];
		$this->assertMatchesRegularExpression( '/__title\{[^}]*margin-inline-start:auto;margin-inline-end:0;?\}/', $right );

		$flat = $this->block( array( 'titleColour' => '#aa0000', 'titleTextAlign' => array( 'desktop' => 'center' ) ) )['css'];
		$this->assertStringNotContainsString( 'fit-content', $flat, 'negative control: a flat colour is never resized' );
	}
}

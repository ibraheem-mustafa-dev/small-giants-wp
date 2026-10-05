<?php
/**
 * sgs/card-grid: textColourHoverGradient reaches the front end.
 *
 * A hover text gradient paints the card's title and subtitle (a gradient text paint clips the
 * element's background to the glyphs, so it never goes on the card itself); a flat
 * textColourHover keeps painting the card's own colour.
 *
 * Run with: vendor/bin/phpunit --filter CardGridHoverTextGradientTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class CardGridHoverTextGradientTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const ITEMS = array(
		array(
			'title'    => 'One',
			'subtitle' => 'Sub',
		),
	);

	public function test_hover_text_gradient_paints_title_and_subtitle_on_item_hover(): void {
		$out = $this->render_block(
			'sgs/card-grid',
			array(
				'items'                   => self::ITEMS,
				'textColourHoverGradient' => 'linear-gradient(90deg,#ff0000,#0000ff)',
			)
		);

		$this->assertStringContainsString( '.sgs-card-grid__item:hover .sgs-card-grid__title', $out['css'] );
		$this->assertStringContainsString( '.sgs-card-grid__item:hover .sgs-card-grid__subtitle', $out['css'] );
		$this->assertStringContainsString( 'background-image:linear-gradient(90deg,#ff0000,#0000ff)', $out['css'] );
		$this->assertStringContainsString( 'background-clip:text', $out['css'] );
		$this->assertStringContainsString( '@supports not ((background-clip:text)', $out['css'] );
	}

	public function test_flat_hover_text_colour_still_paints_the_item(): void {
		$out = $this->render_block(
			'sgs/card-grid',
			array(
				'items'           => self::ITEMS,
				'textColourHover' => '#112233',
			)
		);

		$this->assertStringContainsString( 'color:#112233', $out['css'] );
		$this->assertStringNotContainsString( 'background-clip:text', $out['css'] );
	}
}

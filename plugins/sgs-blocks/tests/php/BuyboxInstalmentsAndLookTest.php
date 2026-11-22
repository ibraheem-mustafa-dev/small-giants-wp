<?php
/**
 * Tests: sgs/buybox's instalments note under the add-to-cart button (instalmentsNote, instalmentsCount, the twin of
 * sgs/cart's panelInstalmentsNote; Bean's D-8 answer), the add-to-cart price separator, the pick a set badge's font size
 * and the photo sticker's product source (shop investigation F-65). Every setting is off by default (negative
 * controls). The real render.php runs in the QA harness child process, as BuyboxSnapshotTest does; the priced fixture
 * is the standard one with its default variation at £139 and one other at £60.
 *
 * Run with: vendor/bin/phpunit --filter BuyboxInstalmentsAndLookTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BuyboxSnapshotTest.php';

final class BuyboxInstalmentsAndLookTest extends TestCase {

	private const NOTE = 'Or 3 payments of %s with <strong>Klarna</strong>';

	private function priced( array $attrs = array(), array $product = array() ): string {
		return BuyboxSnapshotTest::render_fixture( '../buybox-instalments/priced', $attrs, null, $product, true );
	}

	/** The JSON the buy box seeds as its interactivity context. */
	private function context( string $html ): array {
		$this->assertSame( 1, preg_match( "/data-wp-context='([^']*)'/", $html, $m ), 'context printed' );
		return json_decode( html_entity_decode( $m[1], ENT_QUOTES ), true );
	}

	public function test_the_shared_maths_gives_one_instalment_of_139_over_3(): void {
		$this->assertSame( 4633, sgs_instalment_minor( 13900, 3 ) );
		$this->assertSame( 13900, sgs_instalment_minor( 13900, 0 ) );
	}

	public function test_the_note_shows_46_33_for_139_over_3_under_the_button(): void {
		$html = $this->priced( array( 'instalmentsNote' => self::NOTE, 'instalmentsCount' => 3 ) );
		$this->assertMatchesRegularExpression(
			'#<p class="sgs-buybox__instalments" data-wp-bind--hidden="!context.inStock">Or 3 payments of <span class="sgs-buybox__instalments-amount" data-wp-text="context.instalmentsDisplay">[^<]*46\.33</span> with <strong>Klarna</strong></p>#',
			$html
		);
		$this->assertLessThan( strpos( $html, 'sgs-buybox__instalments"' ), strpos( $html, '</form>' ), 'printed after the add-to-cart form' );
		$ctx = $this->context( $html );
		$this->assertSame( 3, $ctx['instalmentsCount'] );
		$this->assertStringEndsWith( '46.33', $ctx['instalmentsDisplay'] );
	}

	public function test_the_count_divides_the_price(): void {
		$ctx = $this->context( $this->priced( array( 'instalmentsNote' => self::NOTE, 'instalmentsCount' => 4 ) ) );
		$this->assertStringEndsWith( '34.75', $ctx['instalmentsDisplay'] );
	}

	public function test_a_note_with_no_placeholder_takes_the_amount_after_it(): void {
		$html = $this->priced( array( 'instalmentsNote' => 'Pay in 3:', 'instalmentsCount' => 3 ) );
		$this->assertMatchesRegularExpression( '#>Pay in 3: <span class="sgs-buybox__instalments-amount"#', $html );
	}

	public function test_no_note_prints_nothing_and_seeds_no_key(): void {
		$html = $this->priced();
		$this->assertStringContainsString( '</form>', $html, 'the form rendered, so the negative control is not vacuous' );
		$this->assertStringNotContainsString( 'sgs-buybox__instalments', $html );
		$this->assertArrayNotHasKey( 'instalmentsCount', $this->context( $html ) );
		$this->assertArrayNotHasKey( 'instalmentsDisplay', $this->context( $html ) );
	}

	public function test_the_note_takes_its_colour_and_type(): void {
		$html = $this->priced(
			array(
				'instalmentsNote'          => self::NOTE,
				'instalmentsLineColour'    => '#5a4a3a',
				'instalmentsLineFontSize'  => array( 'desktop' => 13 ),
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__instalments\{color:#5a4a3a;\}/', $html );
		$this->assertMatchesRegularExpression( '#\.sgs-buybox__instalments\{[^}]*font-size:13px#', $html );
	}

	public function test_the_separator_prints_between_label_and_price(): void {
		$html = $this->priced( array( 'addToCartShowPrice' => true, 'addToCartPriceSeparator' => '·' ) );
		$this->assertMatchesRegularExpression( '#</span>\s*<span class="buybox__cart-separator" aria-hidden="true">·</span>\s*<span class="buybox__cart-price"#', $html );
	}

	public function test_no_separator_by_default(): void {
		$html = $this->priced( array( 'addToCartShowPrice' => true ) );
		$this->assertStringContainsString( 'buybox__cart-price', $html, 'the price printed, so the negative control is not vacuous' );
		$this->assertStringNotContainsString( 'buybox__cart-separator', $html );
	}

	public function test_the_badge_font_size_prints_on_both_badges(): void {
		$html = $this->priced( array( 'pickBadgeFontSize' => array( 'desktop' => 11 ) ) );
		$this->assertMatchesRegularExpression( '#\.sgs-buybox__pick-box \.sgs-option-picker__term-badge,[^{]*\.sgs-buybox__pick-box \.sgs-buybox-pick__option-badge\{[^}]*font-size:11px#', $html );
		$this->assertDoesNotMatchRegularExpression( '#term-badge[^{]*\{[^}]*font-size#', $this->priced() );
	}

	public function test_the_sticker_reads_the_product_badge(): void {
		$html = $this->priced( array( 'galleryStickerSource' => 'product', 'galleryStickerText' => 'Typed' ), array( 'meta' => array( '_sgs_card_badge' => 'Best seller' ) ) );
		$this->assertMatchesRegularExpression( '#class="sgs-buybox__gallery-sticker[^"]*"[^>]*>Best seller</span>#', $html );
		$this->assertStringNotContainsString( '>Typed</span>', $html );
	}

	public function test_a_product_without_a_badge_shows_no_sticker(): void {
		$html = $this->priced( array( 'galleryStickerSource' => 'product', 'galleryStickerText' => 'Typed' ) );
		$this->assertStringNotContainsString( 'sgs-buybox__gallery-sticker', $html );
	}

	public function test_typed_source_keeps_the_typed_words(): void {
		$html = $this->priced( array( 'galleryStickerText' => 'Typed' ), array( 'meta' => array( '_sgs_card_badge' => 'Best seller' ) ) );
		$this->assertMatchesRegularExpression( '#class="sgs-buybox__gallery-sticker[^"]*"[^>]*>Typed</span>#', $html );
	}
}

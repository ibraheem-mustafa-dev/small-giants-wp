<?php
/**
 * Per-device slides visible and peek on sgs/testimonial-slider, the review-card layout on sgs/testimonial, and the
 * open-state fill and item shadows on sgs/accordion-item. Each setting is off by default and prints nothing then.
 *
 * Run with: vendor/bin/phpunit --filter SlidersAndAccordionSettingsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class SlidersAndAccordionSettingsTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Render the slider with one testimonial inside it.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return string Rendered HTML and CSS.
	 */
	private function render_slider( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$attrs_f = tempnam( sys_get_temp_dir(), 'sgsat' );
		$inner_f = tempnam( sys_get_temp_dir(), 'sgsin' );
		file_put_contents( $attrs_f, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		file_put_contents( $inner_f, json_encode( array( array( 'name' => 'sgs/testimonial', 'attributes' => array(), 'html' => '<div>Quote</div>' ) ), JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( 'sgs/testimonial-slider' )
				. ' --attrs-file ' . escapeshellarg( $attrs_f )
				. ' --inner-blocks-file ' . escapeshellarg( $inner_f ) . ' 2>&1'
			);
		} finally {
			@unlink( $attrs_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			@unlink( $inner_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'] . (string) $decoded['css'];
	}

	/**
	 * Replace the per-instance hash so two renders compare on content.
	 *
	 * @param string $html Rendered output.
	 * @return string Output with hashes replaced.
	 */
	private function unhash( string $html ): string {
		return (string) preg_replace( '/-[0-9a-f]{8}/', '-H', $html );
	}

	public function test_slider_unset_tiers_print_nothing_extra(): void {
		$scalar = $this->render_slider( array( 'slidesVisible' => 3 ) );
		$tiered = $this->render_slider( array( 'slidesVisible' => array( 'desktop' => 3 ) ) );

		$this->assertStringNotContainsString( 'slides-visible-mobile', $scalar );
		$this->assertStringNotContainsString( 'data-slides-mobile', $scalar );
		$this->assertStringNotContainsString( 'data-slides-tablet', $scalar );
		$this->assertStringNotContainsString( '--sgs-slide-peek', $scalar );
		$this->assertStringContainsString( '--sgs-slides-visible:3', $scalar );
		$this->assertSame( $this->unhash( $scalar ), $this->unhash( $tiered ), 'a saved scalar and a desktop-only tier object render alike' );
	}

	public function test_slider_tiers_and_peek_print_per_device(): void {
		$html = $this->render_slider(
			array(
				'slidesVisible' => array( 'desktop' => 3, 'tablet' => 2, 'mobile' => 1 ),
				'slidePeek'     => array( 'mobile' => '40px' ),
			)
		);

		$this->assertStringContainsString( '--sgs-slides-visible:2', $html );
		$this->assertStringContainsString( '--sgs-slides-visible-mobile:1', $html );
		$this->assertStringContainsString( 'data-slides-tablet="2"', $html );
		$this->assertStringContainsString( 'data-slides-mobile="1"', $html );
		$this->assertStringContainsString( '--sgs-slide-peek:40px', $html );
	}

	public function test_slider_slide_gap_prints_per_device_and_is_absent_when_unset(): void {
		$unset = $this->render_slider( array( 'slidesVisible' => 3 ) );
		$empty = $this->render_slider( array( 'slidesVisible' => 3, 'slideGap' => array() ) );
		$set   = $this->render_slider( array( 'slidesVisible' => 3, 'slideGap' => array( 'desktop' => '20px', 'mobile' => '12px' ) ) );

		$this->assertStringNotContainsString( 'slide-gap', $unset );
		$this->assertSame( $this->unhash( $unset ), $this->unhash( $empty ), 'an empty gap renders byte-identically to an unset one' );
		$this->assertStringContainsString( 'gap:20px', $set );
		$this->assertStringContainsString( '--sgs-slide-gap:20px', $set );
		$this->assertStringContainsString( '--sgs-slide-gap:12px', $set );
	}

	public function test_testimonial_default_layout_is_unchanged_by_the_new_attribute(): void {
		$attrs   = array( 'quote' => 'Great', 'reviewerName' => 'Ann', 'reviewDate' => 'May 2026' );
		$without = $this->render_block( 'sgs/testimonial', $attrs );
		$with    = $this->render_block( 'sgs/testimonial', $attrs + array( 'reviewFooterBorder' => array() ) );

		$this->assertSame( $this->unhash( $without['html'] ), $this->unhash( $with['html'] ) );
		$this->assertStringNotContainsString( 'footer--review', $without['html'] );
	}

	public function test_testimonial_review_card_orders_title_quote_then_name_and_date_with_a_dashed_rule(): void {
		$out = $this->render_block(
			'sgs/testimonial',
			array(
				'variant'            => 'review-card',
				'showRating'         => true,
				'ratingStars'        => 5,
				'summaryPhrase'      => 'Lovely',
				'quote'              => 'Great',
				'reviewerName'       => 'Ann',
				'reviewDate'         => 'May 2026',
				'reviewFooterBorder' => array( 'desktop' => array( 'width' => '1px', 'style' => 'dashed', 'colour' => '#000000' ) ),
			)
		);
		$html = $out['html'];

		$stars   = strpos( $html, 'sgs-testimonial__stars' );
		$summary = strpos( $html, 'sgs-testimonial__summary' );
		$quote   = strpos( $html, 'sgs-testimonial__quote' );
		$name    = strpos( $html, 'sgs-testimonial__name' );
		$date    = strpos( $html, 'sgs-testimonial__date' );
		$this->assertTrue( $stars < $summary && $summary < $quote && $quote < $name && $name < $date, 'order: stars, title, quote, name, date' );
		$this->assertStringContainsString( 'sgs-testimonial__footer--review', $html );
		$this->assertStringContainsString( 'border-top-style:dashed', $out['css'] );
		$this->assertStringContainsString( 'border-top-width:1px', $out['css'] );
	}

	public function test_accordion_item_unset_prints_no_fill_or_shadow(): void {
		$base = $this->render_block( 'sgs/accordion-item', array( 'title' => 'Q' ) );
		$same = $this->render_block(
			'sgs/accordion-item',
			array( 'title' => 'Q' ),
			array( 'sgs/accordionItemBackgroundOpen' => '', 'sgs/accordionItemShadow' => '', 'sgs/accordionItemShadowOpen' => '' )
		);

		$this->assertStringNotContainsString( 'box-shadow', $base['css'] );
		$this->assertStringNotContainsString( '[open]{', $base['css'] );
		$this->assertSame( $this->unhash( $base['html'] . $base['css'] ), $this->unhash( $same['html'] . $same['css'] ) );
	}

	public function test_accordion_item_open_fill_and_shadows_print(): void {
		$out = $this->render_block(
			'sgs/accordion-item',
			array( 'title' => 'Q' ),
			array(
				'sgs/accordionItemBackgroundOpen' => '#ffd400',
				'sgs/accordionItemShadow'         => '2px 2px 0 0',
				'sgs/accordionItemShadowColour'   => '#000000',
				'sgs/accordionItemShadowOpen'     => '4px 4px 0 0',
			)
		);

		$this->assertMatchesRegularExpression( '/\[open\]\{background-color:#ffd400;box-shadow:/', $out['css'] );
		$this->assertStringContainsString( '4px 4px 0', $out['css'] );
		$this->assertStringContainsString( '2px 2px 0', $out['css'] );
	}
}

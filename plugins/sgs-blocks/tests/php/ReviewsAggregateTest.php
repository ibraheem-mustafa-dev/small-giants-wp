<?php
/**
 * Tests: sgs/google-reviews default display type and honest aggregate.
 *
 * 1. The default variant is `slider` (block.json AND render.php's own fallback), and a block saved
 *    without a variant renders the slider markup: slider wrapper, prev/next arrows, dots, autoplay off.
 * 2. The aggregate rating never prints "0.0" or an empty-star bar when there is no rating to show:
 *      - an explicit averageRating wins;
 *      - otherwise the mean of the rated written reviews (derived from what is visible, not invented);
 *      - otherwise no figure and no stars at all (the count may still show).
 *    showAggregate = false hides all of it. No schema is emitted from a derived figure.
 *
 * The render tests run the REAL src/blocks/google-reviews/render.php through the QA harness in a
 * child PHP process (see ReviewsPlaceholderTest for the mechanism); the `unrated` fetch mode is
 * supplied by tests/php/stubs/google-reviews-render-prepend.php.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ReviewsAggregateTest extends TestCase {

	private const BLOCK = __DIR__ . '/../../src/blocks/google-reviews';

	/**
	 * Render the real block in a child process.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @param string               $mode  live | error | empty | unrated: what the Google fetch returns.
	 * @return string The block's rendered HTML.
	 */
	private function render( array $attrs, string $mode = 'live' ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$prepend = __DIR__ . '/stubs/google-reviews-render-prepend.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsga' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );

		putenv( 'SGS_GR_TEST_MODE=' . $mode );
		putenv( 'SGS_GR_TEST_SETTINGS_PLACE=' );
		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' -d auto_prepend_file=' . escapeshellarg( $prepend )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/google-reviews --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			putenv( 'SGS_GR_TEST_MODE' );
			putenv( 'SGS_GR_TEST_SETTINGS_PLACE' );
			unlink( $file );
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'the harness must print one JSON object, got: ' . substr( $out, 0, 400 ) );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php must not fatal: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	/** A written review as the block stores it. */
	private function review( string $author, ?int $rating ): array {
		$item = array(
			'author' => $author,
			'text'   => 'Body of ' . $author . '.',
		);
		if ( null !== $rating ) {
			$item['rating'] = $rating;
		}
		return $item;
	}

	/**
	 * Number of star icons drawn in the aggregate row (its star run sits between the rating figure and the
	 * review count, inside the row's text block) or in the badge (before its text block).
	 */
	private function aggregateStars( string $html ): int {
		if ( preg_match( '#<div class="sgs-google-reviews__aggregate">(.*?)<div class="sgs-google-reviews__aggregate-text">.*?(?:sgs-google-reviews__cta|sgs-google-reviews__google-logo|</div>\s*</div>)#s', $html, $m ) ) {
			$row = substr( $m[0], strpos( $m[0], 'sgs-google-reviews__aggregate-text' ) );
			return substr_count( $row, 'sgs-google-reviews__star ' );
		}
		if ( ! preg_match( '#<div class="sgs-google-reviews__badge">(.*?)<div class="sgs-google-reviews__badge-text">#s', $html, $m ) ) {
			return 0;
		}
		return substr_count( $m[1], 'sgs-google-reviews__star ' );
	}

	// ── 1. Default variant ─────────────────────────────────────────────────────

	public function test_the_default_variant_is_the_slider_in_block_json_and_in_the_render_fallback(): void {
		$json = json_decode( (string) file_get_contents( self::BLOCK . '/block.json' ), true, 512, JSON_THROW_ON_ERROR );
		$this->assertSame( 'slider', $json['attributes']['variant']['default'] );
		$this->assertContains( 'slider', $json['attributes']['variant']['enum'] );
		$this->assertStringContainsString( "\$variant            = \$attributes['variant'] ?? 'slider';", (string) file_get_contents( self::BLOCK . '/render.php' ) );
	}

	public function test_a_block_saved_without_a_variant_renders_the_slider_markup(): void {
		$html = $this->render( array( 'dataSource' => 'inline', 'reviews' => array( $this->review( 'A', 5 ), $this->review( 'B', 4 ) ) ) );

		$this->assertStringContainsString( 'sgs-google-reviews--slider', $html );
		$this->assertStringNotContainsString( 'sgs-google-reviews--grid', $html, 'no variant must not fall back to the grid' );
		// 2026-09-23: the slider wrapper also carries the shared navigation's classes; the default placement is
		// below-end and the default progress indicator is the scrollbar, so there are no dots.
		$this->assertStringContainsString( 'class="sgs-google-reviews__slider sgs-slider-nav sgs-slider-nav--below-end sgs-slider-nav--pagination-scrollbar"', $html, 'the slider wrapper' );
		$this->assertStringContainsString( 'sgs-google-reviews__arrow--prev', $html, 'arrows are on by default' );
		$this->assertStringContainsString( 'sgs-google-reviews__arrow--next', $html );
		$this->assertStringNotContainsString( 'sgs-google-reviews__dots', $html, 'the scrollbar, not dots, by default' );
		$this->assertStringContainsString( '&quot;autoplay&quot;:false', $html, 'autoplay is off by default' );
		$this->assertStringNotContainsString( 'data-sgs-fx="draggable"', $html, 'drag and loop stay opt-in' );
	}

	public function test_an_explicit_variant_is_still_honoured(): void {
		$html = $this->render( array( 'variant' => 'grid', 'dataSource' => 'inline', 'reviews' => array( $this->review( 'A', 5 ), $this->review( 'B', 4 ) ) ) );
		$this->assertStringContainsString( 'sgs-google-reviews--grid', $html );
		$this->assertStringNotContainsString( 'sgs-google-reviews--slider', $html );
	}

	// ── 2. The aggregate never prints an invented 0.0 ──────────────────────────

	public function test_an_explicit_average_rating_wins(): void {
		$html = $this->render(
			array(
				'reviews'       => array( $this->review( 'A', 5 ), $this->review( 'B', 4 ) ),
				'averageRating' => 4.9,
				'reviewCount'   => 15,
			)
		);
		$this->assertStringContainsString( '<strong class="sgs-google-reviews__score">4.9</strong>', $html );
		$this->assertStringContainsString( '15 reviews', $html );
		$this->assertStringNotContainsString( '<strong class="sgs-google-reviews__score">4.5</strong>', $html, 'the derived mean must not override a set figure' );
		$this->assertSame( 5, $this->aggregateStars( $html ) );
	}

	public function test_with_no_average_it_is_the_mean_of_the_rated_written_reviews(): void {
		$html = $this->render( array( 'reviews' => array( $this->review( 'A', 5 ), $this->review( 'B', 4 ), $this->review( 'C', null ) ) ) );
		$this->assertStringContainsString( '<strong class="sgs-google-reviews__score">4.5</strong>', $html, 'mean of the two rated reviews, the unrated one ignored' );
		$this->assertStringContainsString( '3 reviews', $html );
		$this->assertStringNotContainsString( 'ld+json', $html, 'no schema from a figure derived from the visible reviews' );
	}

	public function test_no_rating_anywhere_prints_no_figure_and_no_stars_but_keeps_the_written_count(): void {
		$html = $this->render( array( 'reviews' => array( $this->review( 'A', null ), $this->review( 'B', null ), $this->review( 'C', null ) ) ) );

		$this->assertStringNotContainsString( '0.0', $html, 'never an invented 0.0' );
		$this->assertStringNotContainsString( 'out of 5', $html );
		$this->assertStringNotContainsString( 'sgs-google-reviews__star', $html, 'no stars at all: not the aggregate, and no review carries a rating' );
		$this->assertStringContainsString( '<span class="sgs-google-reviews__count">3 reviews</span>', $html, 'the count of written reviews still shows' );
		$this->assertStringContainsString( 'Body of A.', $html, 'the reviews themselves still render' );
	}

	public function test_a_set_count_shows_and_a_zero_average_is_still_treated_as_no_rating(): void {
		$html = $this->render( array( 'reviews' => array( $this->review( 'A', null ) ), 'averageRating' => 0, 'reviewCount' => 13 ) );
		$this->assertStringNotContainsString( '0.0', $html );
		$this->assertSame( 0, $this->aggregateStars( $html ) );
		$this->assertStringContainsString( '13 reviews', $html );
	}

	public function test_neither_a_rating_nor_a_count_omits_the_whole_aggregate_row(): void {
		// Google returned written reviews with no rating and no count: nothing to aggregate.
		$html = $this->render( array( 'dataSource' => 'synced', 'placeId' => 'ChIJblock' ), 'unrated' );
		$this->assertStringContainsString( 'Unrated Google Reviewer', $html, 'the review still renders' );
		$this->assertStringNotContainsString( 'sgs-google-reviews__aggregate', $html );
		$this->assertStringNotContainsString( '0.0', $html );
		$this->assertStringNotContainsString( 'ld+json', $html, 'no complete aggregate, so no schema' );
	}

	public function test_the_badge_variants_follow_the_same_rule(): void {
		$html = $this->render( array( 'variant' => 'badge', 'reviews' => array( $this->review( 'A', null ) ) ) );
		$this->assertStringNotContainsString( '0.0', $html );
		$this->assertSame( 0, $this->aggregateStars( $html ) );
		$this->assertStringContainsString( '1 review', $html );

		$rated = $this->render( array( 'variant' => 'badge', 'reviews' => array( $this->review( 'A', 4 ) ) ) );
		$this->assertStringContainsString( '<strong>4.0</strong>', $rated );
		$this->assertSame( 5, $this->aggregateStars( $rated ) );
	}

	public function test_show_aggregate_off_hides_all_of_it(): void {
		$html = $this->render( array( 'showAggregate' => false, 'reviews' => array( $this->review( 'A', 5 ) ) ) );
		$this->assertStringNotContainsString( 'sgs-google-reviews__aggregate', $html );
		$this->assertStringNotContainsString( '<strong class="sgs-google-reviews__score">5.0</strong>', $html );
	}
}

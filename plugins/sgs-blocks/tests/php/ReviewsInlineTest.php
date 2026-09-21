<?php
/**
 * Tests: written ("inline") reviews for sgs/google-reviews.
 *
 * Covers includes/helpers-reviews-inline.php (the items -> Places-API shape mapping and the
 * aggregate), the block.json contract (dataSource enum, the item schema the converter's array
 * resolver reads, the arrayContentLift opt-in) and the render.php guarantees that matter for
 * honesty (no review schema, no demo reviews, no Google fetch in written mode).
 *
 * Self-contained: WordPress functions are stubbed, no WordPress install needed.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
	/** Stub for WP sanitize_text_field(). */
	function sanitize_text_field( $value ) {
		return trim( strip_tags( (string) $value ) );
	}
}
if ( ! function_exists( 'sanitize_textarea_field' ) ) {
	/** Stub for WP sanitize_textarea_field(). */
	function sanitize_textarea_field( $value ) {
		return trim( strip_tags( (string) $value ) );
	}
}
if ( ! function_exists( 'esc_url_raw' ) ) {
	/** Stub for WP esc_url_raw(): accepts http(s) only. */
	function esc_url_raw( $value ) {
		return preg_match( '#^https?://#i', (string) $value ) ? (string) $value : '';
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-reviews-inline.php';

final class ReviewsInlineTest extends TestCase {

	private const BLOCK = __DIR__ . '/../../src/blocks/google-reviews';

	/** A written review as the block stores it. */
	private function review( array $over = array() ): array {
		return array_merge(
			array(
				'author' => 'Neelum Mushtaq',
				'text'   => 'Took my mum as an emergency appointment. Highly recommended.',
				'rating' => 5,
				'date'   => 'a year ago',
				'meta'   => 'Local Guide · 11 reviews',
			),
			$over
		);
	}

	public function test_items_become_places_shaped_rows(): void {
		$rows = sgs_reviews_inline_normalise(
			array( $this->review( array( 'photo' => array( 'url' => 'https://example.com/a.jpg' ), 'url' => 'https://g.page/r/x', 'avatarColour' => 'accent' ) ) )
		);
		$this->assertCount( 1, $rows );
		$this->assertSame( 'Neelum Mushtaq', $rows[0]['authorAttribution']['displayName'] );
		$this->assertSame( 'https://example.com/a.jpg', $rows[0]['authorAttribution']['photoUri'] );
		$this->assertSame( 'Took my mum as an emergency appointment. Highly recommended.', $rows[0]['text']['text'] );
		$this->assertSame( 5.0, $rows[0]['rating'] );
		$this->assertSame( 'a year ago', $rows[0]['dateLabel'] );
		$this->assertSame( 'Local Guide · 11 reviews', $rows[0]['meta'] );
		$this->assertSame( 'accent', $rows[0]['avatarColour'] );
		$this->assertSame( 'https://g.page/r/x', $rows[0]['reviewUrl'] );
	}

	public function test_an_item_with_no_author_and_no_text_is_skipped(): void {
		$rows = sgs_reviews_inline_normalise( array( array( 'rating' => 5 ), 'not an item', $this->review() ) );
		$this->assertCount( 1, $rows );
	}

	public function test_a_review_without_a_rating_has_no_rating_key_and_an_out_of_range_one_is_dropped(): void {
		$rows = sgs_reviews_inline_normalise(
			array( $this->review( array( 'rating' => null ) ), $this->review( array( 'rating' => 9 ) ), $this->review( array( 'rating' => '4.5' ) ) )
		);
		$this->assertArrayNotHasKey( 'rating', $rows[0] );
		$this->assertArrayNotHasKey( 'rating', $rows[1] );
		$this->assertSame( 4.5, $rows[2]['rating'] );
	}

	public function test_only_an_iso_date_becomes_a_publish_time_and_free_text_stays_a_label(): void {
		$rows = sgs_reviews_inline_normalise(
			array( $this->review( array( 'datePublished' => '2026-03-14' ) ), $this->review( array( 'date' => 'a year ago' ) ) )
		);
		$this->assertStringStartsWith( '2026-03-14', $rows[0]['publishTime'] );
		// strtotime( 'a year ago' ) is about NOW, not a year back: free text must never be parsed as a date.
		$this->assertArrayNotHasKey( 'publishTime', $rows[1] );
		$this->assertSame( 'a year ago', $rows[1]['dateLabel'] );
	}

	public function test_review_body_is_read_as_an_alias_of_text(): void {
		$rows = sgs_reviews_inline_normalise( array( array( 'author' => 'A', 'reviewBody' => 'From a trustpilot-shaped item.' ) ) );
		$this->assertSame( 'From a trustpilot-shaped item.', $rows[0]['text']['text'] );
	}

	public function test_markup_is_stripped_and_a_non_http_url_is_refused(): void {
		$rows = sgs_reviews_inline_normalise( array( $this->review( array( 'author' => '<b>Ann</b>', 'url' => 'javascript:alert(1)' ) ) ) );
		$this->assertSame( 'Ann', $rows[0]['authorAttribution']['displayName'] );
		// The URL must go through esc_url_raw() (source-level, so it holds whichever stub is loaded)...
		$helper = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/helpers-reviews-inline.php' );
		$this->assertStringContainsString( "esc_url_raw( (string) ( \$item['url'] ?? '' ) )", $helper );
		// ...and the refusal itself is only meaningful when esc_url_raw() is the strict stub declared above. A
		// looser one from another test file (SiteInfoTest's filter_var stub) is defined first when the whole
		// suite loads, and lets `javascript:` through: found 2026-09-21, failing under `--filter Reviews` yet
		// passing alone. Real WordPress refuses it, so this guard only skips the stub-dependent line.
		if ( '' === esc_url_raw( 'javascript:alert(1)' ) ) {
			$this->assertArrayNotHasKey( 'reviewUrl', $rows[0] );
		}
	}

	public function test_the_average_and_count_come_from_the_reviews_unless_set(): void {
		$data = sgs_reviews_inline_data( array( 'reviews' => array( $this->review( array( 'rating' => 5 ) ), $this->review( array( 'rating' => 4 ) ) ) ) );
		$this->assertSame( 4.5, $data['rating'] );
		$this->assertSame( 2, $data['userRatingCount'] );

		$set = sgs_reviews_inline_data( array( 'reviews' => array( $this->review() ), 'averageRating' => 4.9, 'reviewCount' => 15, 'businessName' => 'Ward End Eye Care' ) );
		$this->assertSame( 4.9, $set['rating'] );
		$this->assertSame( 15, $set['userRatingCount'] );
		$this->assertSame( 'Ward End Eye Care', $set['displayName']['text'] );
	}

	public function test_unrated_reviews_do_not_drag_the_average_towards_zero(): void {
		$data = sgs_reviews_inline_data( array( 'reviews' => array( $this->review( array( 'rating' => 5 ) ), $this->review( array( 'rating' => null ) ) ) ) );
		$this->assertSame( 5.0, $data['rating'] );
		$this->assertSame( 2, $data['userRatingCount'] );
	}

	public function test_no_reviews_gives_an_empty_set_not_demo_content(): void {
		$data = sgs_reviews_inline_data( array( 'reviews' => array() ) );
		$this->assertSame( array(), $data['reviews'] );
		$this->assertSame( 0.0, (float) $data['rating'] );
	}

	// ── block.json contract ────────────────────────────────────────────────────

	private function blockJson(): array {
		return json_decode( (string) file_get_contents( self::BLOCK . '/block.json' ), true, 512, JSON_THROW_ON_ERROR );
	}

	public function test_block_json_declares_the_source_choice_and_the_item_schema(): void {
		$attrs = $this->blockJson()['attributes'];
		$this->assertSame( 'auto', $attrs['dataSource']['default'], 'automatic: written reviews when there are any, otherwise Google' );
		$this->assertSame( array( 'auto', 'synced', 'inline', 'placeholder' ), $attrs['dataSource']['enum'] );
		$props = $attrs['reviews']['items']['properties'];
		foreach ( array( 'author', 'text', 'rating', 'date', 'datePublished', 'photo', 'meta', 'url', 'avatarColour' ) as $field ) {
			$this->assertArrayHasKey( $field, $props, "review item field $field" );
		}
		$this->assertSame( 'image-object', $props['photo']['role'] );
		$this->assertSame( 'url-href', $props['url']['role'] );
		// The array resolver only lifts a field that declares a role; without these the author and the
		// reviewer detail line were silently dropped when the converter lifted the cards.
		foreach ( array( 'author', 'text', 'date', 'meta' ) as $field ) {
			$this->assertSame( 'text-content', $props[ $field ]['role'], "review item field $field" );
		}
		$this->assertSame( 'rating', $props['rating']['role'] );
	}

	public function test_automatic_means_written_reviews_when_there_are_any_and_never_beats_an_explicit_choice(): void {
		$src = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/helpers-reviews-inline.php' );
		// Written when told to, or when not told to use Google and the block holds reviews.
		$this->assertStringContainsString( '\'inline\' === $attr || ( \'synced\' !== $attr && ! empty( $attributes[\'reviews\'] ) )', $src );
	}

	// ── render.php honesty guarantees ──────────────────────────────────────────

	public function test_written_mode_emits_no_review_schema_and_never_reaches_the_sample_or_google_branches(): void {
		$src = (string) file_get_contents( self::BLOCK . '/render.php' );
		$this->assertStringContainsString( 'sgs_reviews_resolve( $attributes, $place_id )', $src, 'render.php takes its data from the one resolver' );
		$this->assertMatchesRegularExpression( "/if \\( null === \\\$sgs_gr_resolved \\) \\{\\s*return;/", $src, 'no data: render nothing' );
		$this->assertMatchesRegularExpression( "/if \\( sgs_reviews_may_emit_schema\\( \\\$data_source, \\\$data \\) \\) \\{\\s*\\\$schema = array\\(/", $src, 'schema only for real Google data' );

		// In the resolver, written mode is decided BEFORE the Google fetch, and the sample set is only
		// reachable through the explicit `placeholder` choice.
		$helper = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/helpers-reviews-inline.php' );
		$this->assertLessThan( strpos( $helper, '$data = $fetcher( $place_id );' ), strpos( $helper, "'inline' === \$attr" ), 'written is decided before the Google fetch' );
		$this->assertMatchesRegularExpression( "/if \\( 'placeholder' === \\\$attr \\) \\{\\s*return array\\(\\s*'source' => 'placeholder'/", $helper );
	}

	public function test_written_reviews_are_neither_capped_nor_re_sorted(): void {
		$src = (string) file_get_contents( self::BLOCK . '/render.php' );
		// Found live: the default cap of 10 silently dropped 3 of 13 typed reviews.
		$this->assertStringContainsString( '\'inline\' === $data_source ? array_values( $filtered_reviews ) : array_slice( $filtered_reviews, 0, $max_reviews )', $src );
		$this->assertMatchesRegularExpression( '/use \( \$sort_by, \$data_source \) \{\s*if \( \'inline\' === \$data_source \) \{\s*return 0;/', $src, 'the client\'s order is kept' );
	}

	public function test_an_unrated_review_is_not_removed_by_the_minimum_rating_filter(): void {
		$src = (string) file_get_contents( self::BLOCK . '/render.php' );
		$this->assertStringContainsString( 'null !== $review_rating && $review_rating < $min_rating', $src );
	}
}

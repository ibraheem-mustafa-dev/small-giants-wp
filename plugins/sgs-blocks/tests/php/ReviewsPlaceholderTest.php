<?php
/**
 * Tests: sgs/google-reviews never shows invented reviews or invented schema.
 *
 * Bean-approved behaviour (2026-09-21, DMCC Act 2024 + structured-data spam):
 *  1. Sample reviews appear ONLY when an author explicitly picks dataSource "placeholder".
 *  2. With no live data (no written reviews, no place ID, or a Google error with nothing cached)
 *     the front end renders NOTHING: no wrapper, no reviews, no schema.
 *  3. LocalBusiness / AggregateRating JSON-LD is printed ONLY for real Google data, never for
 *     written reviews, never for the sample set.
 *
 * The render tests run the REAL src/blocks/google-reviews/render.php through the QA harness
 * (scripts/qa/lib/render-css-harness.php) in a child PHP process, with
 * tests/php/stubs/google-reviews-render-prepend.php supplying a controllable Google fetch. A child
 * process keeps render.php's top-level state out of the PHPUnit process and out of every other test.
 *
 * The resolver tests call includes/helpers-reviews-inline.php directly with an injected fetcher.
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

final class ReviewsPlaceholderTest extends TestCase {

	private const BLOCK = __DIR__ . '/../../src/blocks/google-reviews';

	/** The names of the invented sample reviewers. */
	private const SAMPLE_NAMES = array( 'Sarah Patel', 'James Wright', 'Aisha Khan' );

	/**
	 * Render the real block in a child process.
	 *
	 * @param array<string, mixed> $attrs          Block attributes.
	 * @param string               $mode           live | error | empty: what the Google fetch returns.
	 * @param string               $settings_place The site-wide place ID in the plugin settings.
	 * @return string The block's rendered HTML (an empty string when the block renders nothing).
	 */
	private function render( array $attrs, string $mode = 'live', string $settings_place = '' ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$prepend = __DIR__ . '/stubs/google-reviews-render-prepend.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsgr' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );

		putenv( 'SGS_GR_TEST_MODE=' . $mode );
		putenv( 'SGS_GR_TEST_SETTINGS_PLACE=' . $settings_place );
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

	/** @return array<int, array<string, mixed>> The parsed JSON-LD objects in the HTML. */
	private function schemas( string $html ): array {
		preg_match_all( '#<script type="application/ld\+json">(.*?)</script>#s', $html, $m );
		return array_map( static fn( string $j ): array => json_decode( $j, true, 512, JSON_THROW_ON_ERROR ), $m[1] );
	}

	private function assertNoSampleReviewer( string $html ): void {
		foreach ( self::SAMPLE_NAMES as $name ) {
			$this->assertStringNotContainsString( $name, $html, "the invented reviewer $name must not be shown" );
		}
	}

	/** Three written reviews, as the block stores them. */
	private function written(): array {
		return array(
			array( 'author' => 'Written Author A', 'text' => 'Written review body A.', 'rating' => 5 ),
			array( 'author' => 'Written Author B', 'text' => 'Written review body B.', 'rating' => 4 ),
			array( 'author' => 'Written Author C', 'text' => 'Written review body C.', 'rating' => 5 ),
		);
	}

	// ── (a) no data + auto: nothing at all ─────────────────────────────────────

	public function test_auto_with_no_data_renders_nothing_at_all(): void {
		// No written reviews, no place ID anywhere, Google would have data if asked: it is never asked.
		$html = $this->render( array(), 'live' );
		$this->assertSame( '', $html, 'no wrapper, no reviews, no schema' );
	}

	public function test_synced_with_no_place_id_renders_nothing(): void {
		$html = $this->render( array( 'dataSource' => 'synced' ), 'live' );
		$this->assertSame( '', $html );
	}

	public function test_inline_with_no_written_reviews_renders_nothing(): void {
		$this->assertSame( '', $this->render( array( 'dataSource' => 'inline', 'reviews' => array() ), 'live', 'ChIJsettings' ) );
	}

	// ── (b) placeholder: the three samples, and no schema ──────────────────────

	public function test_placeholder_renders_the_three_samples_and_no_schema(): void {
		$html = $this->render( array( 'dataSource' => 'placeholder' ), 'live', 'ChIJsettings' );
		foreach ( self::SAMPLE_NAMES as $name ) {
			$this->assertStringContainsString( $name, $html, "$name is shown when Sample reviews is chosen" );
		}
		$this->assertStringNotContainsString( 'ld+json', $html, 'invented reviews never feed schema' );
		$this->assertStringNotContainsString( 'Ward End Eye Care', $html, 'placeholder never reads Google' );
	}

	// ── (c) written reviews: rendered, still no schema ─────────────────────────

	public function test_written_reviews_render_all_of_them_with_no_schema_and_no_google_data(): void {
		// A business name, average and count are set so the aggregate is complete: only the source, not
		// missing data, is what keeps schema out of written mode.
		$html = $this->render(
			array(
				'reviews'       => $this->written(),
				'businessName'  => 'Written Biz',
				'averageRating' => 4.8,
				'reviewCount'   => 15,
			),
			'live',
			'ChIJsettings'
		);
		foreach ( array( 'Written Author A', 'Written Author B', 'Written Author C' ) as $author ) {
			$this->assertStringContainsString( $author, $html );
		}
		$this->assertStringNotContainsString( 'ld+json', $html );
		$this->assertNoSampleReviewer( $html );
		$this->assertStringNotContainsString( 'Live Reviewer', $html, 'written mode never fetches Google' );
	}

	// ── (d) synced live data: schema carries the live numbers ──────────────────

	public function test_synced_live_data_emits_schema_with_the_live_rating_and_count(): void {
		$html    = $this->render( array( 'dataSource' => 'synced', 'placeId' => 'ChIJblock' ), 'live' );
		$schemas = $this->schemas( $html );
		$this->assertCount( 1, $schemas, 'exactly one JSON-LD block for live Google data' );
		$this->assertSame( 'LocalBusiness', $schemas[0]['@type'] );
		$this->assertSame( 'Ward End Eye Care', $schemas[0]['name'] );
		$this->assertEquals( 4.7, $schemas[0]['aggregateRating']['ratingValue'] );
		$this->assertEquals( 132, $schemas[0]['aggregateRating']['reviewCount'] );
		$this->assertStringContainsString( 'Live Reviewer One', $html );
		$this->assertNoSampleReviewer( $html );
	}

	public function test_auto_with_only_the_site_wide_place_id_uses_it_and_emits_schema(): void {
		// The block's placeId attribute defaults to "", which `??` does not treat as missing.
		$html = $this->render( array( 'placeId' => '' ), 'live', 'ChIJsettings' );
		$this->assertCount( 1, $this->schemas( $html ) );
		$this->assertStringContainsString( 'Live Reviewer Two', $html );
	}

	// ── (e) Google failing with nothing cached: nothing, not invented data ─────

	public function test_api_error_with_nothing_cached_renders_nothing(): void {
		$html = $this->render( array( 'dataSource' => 'synced', 'placeId' => 'ChIJblock' ), 'error' );
		$this->assertSame( '', $html, 'no wrapper, no invented reviews, no schema' );
	}

	public function test_an_empty_google_response_renders_nothing(): void {
		$this->assertSame( '', $this->render( array( 'placeId' => 'ChIJblock' ), 'empty' ) );
	}

	// ── Resolver + schema gate, called directly ────────────────────────────────

	public function test_resolver_picks_written_then_google_then_placeholder_then_nothing(): void {
		$live    = static fn( string $id ): array => array(
			'displayName'     => array( 'text' => 'Biz' ),
			'rating'          => 4.5,
			'userRatingCount' => 10,
			'reviews'         => array( array( 'rating' => 5 ) ),
		);
		$boom    = static function ( string $id ): array {
			throw new RuntimeException( 'Google must not be asked' );
		};
		$written = array( array( 'author' => 'A', 'text' => 'T', 'rating' => 5 ) );

		$this->assertSame( 'inline', sgs_reviews_resolve( array( 'reviews' => $written ), 'ChIJ', $boom )['source'] );
		$this->assertSame( 'inline', sgs_reviews_resolve( array( 'dataSource' => 'inline', 'reviews' => $written ), '', $boom )['source'] );
		$this->assertSame( 'synced', sgs_reviews_resolve( array( 'dataSource' => 'synced', 'reviews' => $written ), 'ChIJ', $live )['source'], 'an explicit Google choice beats written reviews' );
		$this->assertSame( 'synced', sgs_reviews_resolve( array(), 'ChIJ', $live )['source'] );
		$this->assertSame( 'placeholder', sgs_reviews_resolve( array( 'dataSource' => 'placeholder' ), 'ChIJ', $boom )['source'] );

		$this->assertNull( sgs_reviews_resolve( array(), '', $boom ), 'no place ID: nothing, and Google is not asked' );
		$this->assertNull( sgs_reviews_resolve( array( 'dataSource' => 'inline' ), 'ChIJ', $boom ) );
		$this->assertNull( sgs_reviews_resolve( array(), 'ChIJ', static fn( string $id ): array => array() ), 'empty response' );
		$this->assertNull( sgs_reviews_resolve( array(), 'ChIJ', static fn( string $id ) => new stdClass() ), 'a WP_Error-like return is not data' );
	}

	public function test_the_placeholder_set_is_the_three_samples_with_honest_aggregate_numbers(): void {
		$data = sgs_reviews_placeholder_data();
		$this->assertCount( 3, $data['reviews'] );
		$this->assertSame( 3, $data['userRatingCount'], 'the count describes the sample set, not an invented business' );
		$this->assertSame( 5.0, $data['rating'] );
	}

	public function test_schema_is_allowed_only_for_complete_live_google_data(): void {
		$full = array(
			'displayName'     => array( 'text' => 'Biz' ),
			'rating'          => 4.7,
			'userRatingCount' => 132,
		);
		$this->assertTrue( sgs_reviews_may_emit_schema( 'synced', $full ) );
		$this->assertFalse( sgs_reviews_may_emit_schema( 'inline', $full ), 'written reviews: never' );
		$this->assertFalse( sgs_reviews_may_emit_schema( 'placeholder', sgs_reviews_placeholder_data() ), 'sample reviews: never' );
		$this->assertFalse( sgs_reviews_may_emit_schema( 'synced', array_merge( $full, array( 'displayName' => array( 'text' => '' ) ) ) ), 'no business name' );
		$this->assertFalse( sgs_reviews_may_emit_schema( 'synced', array_merge( $full, array( 'rating' => 0 ) ) ), 'no rating' );
		$this->assertFalse( sgs_reviews_may_emit_schema( 'synced', array_merge( $full, array( 'userRatingCount' => 0 ) ) ), 'no count' );
	}

	public function test_the_block_place_id_wins_and_an_empty_one_falls_back_to_the_settings(): void {
		$this->assertSame( 'ChIJblock', sgs_reviews_place_id( array( 'placeId' => ' ChIJblock ' ), 'ChIJsettings' ) );
		$this->assertSame( 'ChIJsettings', sgs_reviews_place_id( array( 'placeId' => '' ), 'ChIJsettings' ) );
		$this->assertSame( 'ChIJsettings', sgs_reviews_place_id( array(), 'ChIJsettings' ) );
		$this->assertSame( '', sgs_reviews_place_id( array( 'placeId' => '  ' ), '' ) );
	}

	// ── Contract + source guards ───────────────────────────────────────────────

	public function test_block_json_offers_the_sample_reviews_choice_and_keeps_auto_as_the_default(): void {
		$attrs = json_decode( (string) file_get_contents( self::BLOCK . '/block.json' ), true, 512, JSON_THROW_ON_ERROR )['attributes'];
		$this->assertSame( 'auto', $attrs['dataSource']['default'] );
		$this->assertContains( 'placeholder', $attrs['dataSource']['enum'], 'WordPress coerces an out-of-enum value back to the default' );
	}

	public function test_render_php_holds_no_invented_reviews_and_no_unconditional_schema(): void {
		$src = (string) file_get_contents( self::BLOCK . '/render.php' );
		foreach ( self::SAMPLE_NAMES as $name ) {
			$this->assertStringNotContainsString( $name, $src, "$name lives only in the explicit placeholder helper" );
		}
		$this->assertStringNotContainsString( "'inline' !== \$data_source", $src, 'schema is gated on real Google data, not on "not written"' );
		$this->assertStringContainsString( 'if ( sgs_reviews_may_emit_schema( $data_source, $data ) ) {', $src );
	}
}

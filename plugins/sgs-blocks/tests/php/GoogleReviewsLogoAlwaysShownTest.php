<?php
/**
 * Tests: sgs/google-reviews meets the Google Places API attribution policy.
 *
 * The Google Maps logo (16-19px high) prints on every render of every variant, whatever the aggregate
 * settings; each review shows its author's avatar, name and profile link and links to Google Maps; the
 * place links to Google Maps. A cache that lacks a link field renders no broken anchor and logs once.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class GoogleReviewsLogoAlwaysShownTest extends TestCase {

	private const BLOCK = __DIR__ . '/../../src/blocks/google-reviews';

	/** @var string What error_log() received during the last render_full() call. */
	private string $error_log = '';

	/**
	 * Render the real block in a child process.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @param string               $mode  live | error | empty | unrated | nolinks: what the Google fetch returns.
	 * @return string The block's rendered HTML.
	 */
	private function render( array $attrs, string $mode = 'live' ): string {
		return $this->render_full( $attrs, $mode )['html'];
	}

	/**
	 * Render the real block and return both the markup and the generated CSS.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @param string               $mode  What the Google fetch returns.
	 * @return array{html: string, css: string}
	 */
	private function render_full( array $attrs, string $mode = 'live' ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$prepend = __DIR__ . '/stubs/google-reviews-render-prepend.php';
		$attrs  += array( 'placeId' => 'ChIJtestplace' );
		$file    = tempnam( sys_get_temp_dir(), 'sgsga' );
		$logfile = tempnam( sys_get_temp_dir(), 'sgsgl' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );

		putenv( 'SGS_GR_TEST_MODE=' . $mode );
		putenv( 'SGS_GR_TEST_SETTINGS_PLACE=' );
		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' -d auto_prepend_file=' . escapeshellarg( $prepend )
				. ' -d log_errors=1 -d error_log=' . escapeshellarg( $logfile )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/google-reviews --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			putenv( 'SGS_GR_TEST_MODE' );
			putenv( 'SGS_GR_TEST_SETTINGS_PLACE' );
			unlink( $file );
			$this->error_log = (string) file_get_contents( $logfile );
			unlink( $logfile );
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'the harness must print one JSON object, got: ' . substr( $out, 0, 400 ) );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php must not fatal: ' . ( $decoded['error'] ?? $out ) );
		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) ( $decoded['css'] ?? '' ),
		);
	}

	/** @return array<string, array{0: array<string, mixed>}> */
	public static function variants(): array {
		$base = array(
			'dataSource' => 'inline',
			'reviews'    => array( array( 'author' => 'A', 'text' => 'Body.', 'rating' => 5 ) ),
		);
		return array(
			'default header'       => array( $base ),
			'badge'                => array( $base + array( 'variant' => 'badge' ) ),
			'floating badge'       => array( $base + array( 'variant' => 'floating-badge' ) ),
			'retired false'        => array( $base + array( 'showGoogleLogo' => false ) ),
			'badge, retired false' => array( $base + array( 'variant' => 'badge', 'showGoogleLogo' => false ) ),
		);
	}

	/**
	 * @dataProvider variants
	 * @param array<string, mixed> $attrs Block attributes.
	 */
	public function test_logo_always_rendered( array $attrs ): void {
		$html = $this->render( $attrs );
		$this->assertMatchesRegularExpression( '#<img[^>]*src="[^"]*assets/google-maps-logo-(?:dark|light)\.svg"[^>]*alt="Google Maps"#', $html );
		// Negative control: the old "G" never stands in for the attribution.
		$this->assertDoesNotMatchRegularExpression( '#<img[^>]*src="[^"]*assets/google-logo\.svg"[^>]*alt="Google"#', $html );
	}

	public function test_block_json_has_no_logo_toggle(): void {
		$json = json_decode( (string) file_get_contents( self::BLOCK . '/block.json' ), true );
		$this->assertArrayNotHasKey( 'showGoogleLogo', $json['attributes'] );
	}

	/** @return array<string, array{0: string}> Every variant in block.json. */
	public static function every_variant(): array {
		$json = json_decode( (string) file_get_contents( self::BLOCK . '/block.json' ), true );
		$out  = array();
		foreach ( $json['attributes']['variant']['enum'] as $variant ) {
			$out[ $variant ] = array( $variant );
		}
		return $out;
	}

	/**
	 * Attribution renders once for every variant, with the aggregate switched off and the data inline.
	 *
	 * @dataProvider every_variant
	 */
	public function test_attribution_renders_for_every_variant_without_aggregate( string $variant ): void {
		$html = $this->render(
			array(
				'dataSource'    => 'inline',
				'variant'       => $variant,
				'showAggregate' => false,
				'reviews'       => array( array( 'author' => 'A', 'text' => 'Body.' ) ),
			)
		);
		$this->assertSame( 1, substr_count( $html, 'class="sgs-google-reviews__attribution' ), "one attribution element for {$variant}" );
		$this->assertMatchesRegularExpression( '#sgs-google-reviews__attribution.*?google-maps-logo-#s', $html );
	}

	/** @dataProvider every_variant */
	public function test_attribution_renders_once_with_the_aggregate_on( string $variant ): void {
		$html = $this->render( array( 'variant' => $variant ), 'live' );
		$this->assertSame( 1, substr_count( $html, 'class="sgs-google-reviews__attribution' ), "one attribution element for {$variant}" );
	}

	public function test_attribution_survives_a_rating_less_block(): void {
		$html = $this->render( array( 'variant' => 'grid' ), 'unrated' );
		$this->assertSame( 1, substr_count( $html, 'class="sgs-google-reviews__attribution' ) );
	}

	public function test_logo_height_is_fixed_inside_the_policy_range(): void {
		$json = json_decode( (string) file_get_contents( self::BLOCK . '/block.json' ), true );
		$this->assertArrayNotHasKey( 'logoSize', $json['attributes'] );
		$this->assertArrayNotHasKey( 'logoOpacity', $json['attributes'] );
		$this->assertArrayNotHasKey( 'google-logo', $json['supports']['sgs']['elements'] );

		// Stored values from the removed settings must paint nothing.
		$out = $this->render_full(
			array(
				'variant'     => 'grid',
				'logoSize'    => array( 'desktop' => '60px' ),
				'logoOpacity' => 0.3,
			),
			'live'
		);
		$this->assertStringNotContainsString( '60px', $out['css'] );
		$this->assertStringNotContainsString( 'opacity:0.3', $out['css'] );

		preg_match_all( '#<img[^>]*google-maps-logo-[^>]*>#', $out['html'], $imgs );
		$this->assertNotEmpty( $imgs[0] );
		foreach ( $imgs[0] as $img ) {
			$this->assertSame( 1, preg_match( '#\sheight="(\d+)"#', $img, $m ), 'every Maps logo declares its height' );
			$this->assertGreaterThanOrEqual( 16, (int) $m[1] );
			$this->assertLessThanOrEqual( 19, (int) $m[1] );
		}

		// The stylesheet sizes the logo to the same fixed height, with the policy's clear space.
		$css = (string) file_get_contents( self::BLOCK . '/style.css' );
		$this->assertMatchesRegularExpression( '#__maps-logo[^{]*\{[^}]*height:\s*18px#', $css );
		preg_match_all( '#__(?:maps-logo|google-logo)[^{]*\{[^}]*\bheight:\s*(\d+)px#', $css, $heights );
		foreach ( $heights[1] as $h ) {
			$this->assertGreaterThanOrEqual( 16, (int) $h );
			$this->assertLessThanOrEqual( 19, (int) $h );
		}
		$this->assertMatchesRegularExpression( '#__attribution[^{]*\{[^}]*padding:\s*10px 10px 5px 10px#', $css, 'clear space: 10px sides and top, 5px bottom' );
	}

	public function test_avatar_has_no_toggle_and_always_renders(): void {
		$json = json_decode( (string) file_get_contents( self::BLOCK . '/block.json' ), true );
		$this->assertArrayNotHasKey( 'showAvatar', $json['attributes'] );
		$this->assertStringNotContainsString( 'showAvatar', (string) file_get_contents( self::BLOCK . '/render.php' ) );

		$html = $this->render( array( 'showAvatar' => false, 'variant' => 'grid' ), 'live' );
		// Reviewer Two has a photo, Reviewer One falls back to the initial.
		$this->assertSame( 2, substr_count( $html, 'class="sgs-google-reviews__avatar"' ) );
		$this->assertStringContainsString( 'lh3.googleusercontent.com/a/two', $html );
		$this->assertMatchesRegularExpression( '#sgs-google-reviews__avatar-initials">\s*L\s*<#', $html );
	}

	public function test_author_links_to_profile_in_a_new_tab(): void {
		$html = $this->render( array( 'variant' => 'grid' ), 'live' );
		$this->assertMatchesRegularExpression(
			'#<a href="https://www\.google\.com/maps/contrib/1"[^>]*class="sgs-google-reviews__author"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>Live Reviewer One<span class="sgs-sr-only">[^<]*opens in a new tab[^<]*</span></a>#',
			$html
		);
	}

	public function test_each_review_and_the_place_link_to_google_maps(): void {
		$html = $this->render( array( 'variant' => 'grid' ), 'live' );
		$this->assertSame( 2, preg_match_all( '#<a href="https://www\.google\.com/maps/reviews/data=\d"[^>]*class="sgs-google-reviews__maps-link"[^>]*rel="noopener noreferrer"#', $html ) );
		$this->assertMatchesRegularExpression( '#<a href="https://maps\.google\.com/\?cid=111"[^>]*class="sgs-google-reviews__maps-link sgs-google-reviews__maps-link--place"[^>]*rel="noopener noreferrer"[^>]*>View on Google Maps#', $html );
		$this->assertSame( 3, substr_count( $html, 'View on Google Maps' ), 'one place link and one per review' );
		$this->assertStringContainsString( 'opens in a new tab', $html );
	}

	public function test_a_cache_without_the_link_fields_renders_no_broken_anchor_and_logs_once(): void {
		$html = $this->render( array( 'variant' => 'grid' ), 'nolinks' );
		$this->assertStringNotContainsString( 'View on Google Maps', $html );
		$this->assertDoesNotMatchRegularExpression( '#<a[^>]*href=""#', $html );
		$this->assertDoesNotMatchRegularExpression( '#<a[^>]*class="sgs-google-reviews__author"#', $html );
		$this->assertStringContainsString( 'Old Cache Reviewer', $html );
		$this->assertMatchesRegularExpression( '#sgs-google-reviews__attribution.*?google-maps-logo-#s', $html );
		$this->assertSame( 1, substr_count( $this->error_log, 'sgs/google-reviews' ), 'logged once per request, got: ' . $this->error_log );
	}

	public function test_complete_data_logs_nothing(): void {
		$this->render( array( 'variant' => 'grid' ), 'live' );
		$this->assertSame( '', trim( $this->error_log ) );
	}

	public function test_inline_reviews_log_nothing_and_have_no_google_links(): void {
		$html = $this->render(
			array(
				'dataSource' => 'inline',
				'reviews'    => array( array( 'author' => 'A', 'text' => 'Body.' ) ),
			)
		);
		$this->assertSame( '', trim( $this->error_log ) );
		$this->assertStringNotContainsString( 'View on Google Maps', $html );
	}

	/** Place Details (New) is a GET with googleMapsUri in the mask, and a cache written under the old mask is never served. */
	public function test_the_places_fetch_is_a_get_with_the_new_mask_and_a_mask_versioned_cache(): void {
		$src = (string) file_get_contents( __DIR__ . '/../../includes/google-reviews-settings.php' );
		$this->assertStringContainsString( 'wp_remote_get(', $src );
		$this->assertStringNotContainsString( 'wp_remote_post(', $src );
		$this->assertMatchesRegularExpression( "#const FIELD_MASK = '[^']*googleMapsUri[^']*';#", $src );
		$this->assertStringContainsString( "'X-Goog-FieldMask'  => self::FIELD_MASK", $src );
		$this->assertMatchesRegularExpression( '#\$cache_key = self::CACHE_KEY_PREFIX \. md5\( [^;]*FIELD_MASK#', $src );
	}

	/**
	 * The logo is a fixed 98x18 box that cannot shrink: at 375px a shrinking flex row squeezed it to 3px high
	 * (found on the live page), so the rule must pin width, height and flex.
	 */
	public function test_the_maps_logo_is_a_fixed_box_that_no_flex_row_can_squeeze(): void {
		$css = (string) file_get_contents( __DIR__ . '/../../src/blocks/google-reviews/style.css' );
		$this->assertSame( 1, preg_match( '#\.sgs-google-reviews__maps-logo \{([^}]*)\}#', $css, $m ) );
		$this->assertMatchesRegularExpression( '#flex:\s*none#', $m[1] );
		$this->assertMatchesRegularExpression( '#width:\s*98px#', $m[1] );
		$this->assertMatchesRegularExpression( '#height:\s*18px#', $m[1] );
		$this->assertMatchesRegularExpression( '#min-height:\s*18px#', $m[1] );
		$this->assertSame( 1, preg_match( '#\.sgs-google-reviews__attribution \{([^}]*)\}#', $css, $a ) );
		$this->assertMatchesRegularExpression( '#flex:\s*none#', $a[1] );
	}

	/**
	 * The block's defaults are Google's own colours, not the site theme's presets: a theme that defines `accent`,
	 * `text` or `primary` must not recolour the stars, text, borders or buttons of a Google review.
	 */
	public function test_default_colours_are_googles_not_the_themes(): void {
		$css = (string) file_get_contents( __DIR__ . '/../../src/blocks/google-reviews/style.css' );
		$this->assertSame( 1, preg_match( '~
\.sgs-google-reviews \{\s*--sgs-gr-star: #fbbc04;([^}]*)\}~i', $css, $m ) );
		$this->assertStringContainsString( '--sgs-gr-ink: #202124;', $m[1] );
		$this->assertStringContainsString( '--sgs-gr-blue: #1a73e8;', $m[1] );
		$this->assertStringContainsString( '--sgs-gr-line: #dadce0;', $m[1] );
		preg_match_all( '#--wp--preset--color--([a-z-]+)#', $css, $presets );
		$this->assertEqualsCanonicalizing(
			array( 'primary', 'success' ),
			array_values( array_unique( $presets[1] ) ),
			'Only the opt-in primary and success star variants may read the theme palette.'
		);
		$this->assertMatchesRegularExpression( '#\.sgs-google-reviews__star--full \{[^}]*fill: var\( --sgs-gr-star \)#', $css );
	}
}

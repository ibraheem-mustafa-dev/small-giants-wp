<?php
/**
 * Tests: sgs/google-rating-badge.
 *
 * Renders the REAL src/blocks/google-rating-badge/render.php in a child PHP process through the QA
 * harness (scripts/qa/lib/render-css-harness.php), the same way GoogleReviewsLogoAlwaysShownTest does.
 * Live Google data is faked by tests/php/stubs/google-reviews-render-prepend.php (SGS_GR_TEST_MODE); the
 * site-wide Site Info store is faked by a temporary prepend file written here (SGS_GRB_SITE_INFO).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class GoogleRatingBadgeTest extends TestCase {

	/**
	 * The defaults block.json declares: WordPress fills them in before render.php runs, the QA harness does not.
	 *
	 * @return array<string, mixed>
	 */
	private static function block_defaults(): array {
		$meta     = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/google-rating-badge/block.json' ), true );
		$defaults = array();
		foreach ( (array) ( $meta['attributes'] ?? array() ) as $name => $schema ) {
			if ( array_key_exists( 'default', $schema ) ) {
				$defaults[ $name ] = $schema['default'];
			}
		}
		return $defaults;
	}

	/**
	 * Render the real block and return the markup and the generated CSS.
	 *
	 * @param array<string, mixed>  $attrs     Block attributes.
	 * @param string                $mode      live | error | empty: what the Google fetch returns.
	 * @param array<string, mixed>  $site_info Site Info values keyed by dot-notation key.
	 * @return array{html: string, css: string}
	 */
	private function render_full( array $attrs, string $mode = 'live', array $site_info = array() ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$base    = __DIR__ . '/stubs/google-reviews-render-prepend.php';
		$attrs  += array( 'placeId' => 'ChIJtestplace' ) + self::block_defaults();
		$file    = tempnam( sys_get_temp_dir(), 'sgsgb' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );

		// The harness loads the REAL Sgs_Site_Info; its option store is seeded through SGS_QA_OPTIONS.
		$store = array();
		foreach ( $site_info as $key => $value ) {
			$parts = explode( '.', $key );
			if ( 2 === count( $parts ) ) {
				$store[ $parts[0] ][ $parts[1] ] = $value;
			} else {
				$store[ $key ] = $value;
			}
		}

		putenv( 'SGS_GR_TEST_MODE=' . $mode );
		putenv( 'SGS_GR_TEST_SETTINGS_PLACE=' );
		putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => $store ), JSON_THROW_ON_ERROR ) );
		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' -d auto_prepend_file=' . escapeshellarg( $base )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/google-rating-badge --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			putenv( 'SGS_GR_TEST_MODE' );
			putenv( 'SGS_GR_TEST_SETTINGS_PLACE' );
			putenv( 'SGS_QA_OPTIONS' );
			unlink( $file );
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'the harness must print one JSON object, got: ' . substr( $out, 0, 400 ) );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php must not fatal: ' . ( $decoded['error'] ?? $out ) );
		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) ( $decoded['css'] ?? '' ),
		);
	}

	/**
	 * Render and return the markup only.
	 *
	 * @param array<string, mixed> $attrs     Block attributes.
	 * @param string               $mode      What the Google fetch returns.
	 * @param array<string, mixed> $site_info Site Info values.
	 */
	private function render( array $attrs, string $mode = 'live', array $site_info = array() ): string {
		return $this->render_full( $attrs, $mode, $site_info )['html'];
	}

	/** Written figures: 4.7 from 15 reviews, no live data involved. */
	private const MANUAL = array(
		'dataSource'  => 'manual',
		'rating'      => 4.7,
		'reviewCount' => 15,
	);

	/** @return array<string, array{0: string}> */
	public static function presets(): array {
		return array(
			'pill'    => array( 'pill' ),
			'card'    => array( 'card' ),
			'stacked' => array( 'stacked' ),
		);
	}

	/** @dataProvider presets */
	public function test_each_preset_renders_its_modifier_class( string $preset ): void {
		$html = $this->render( self::MANUAL + array( 'badgeStyle' => $preset ) );
		$this->assertStringContainsString( 'sgs-google-rating-badge--' . $preset, $html );
		// Negative control: the other two presets' modifiers are absent.
		foreach ( array( 'pill', 'card', 'stacked' ) as $other ) {
			if ( $other !== $preset ) {
				$this->assertStringNotContainsString( 'sgs-google-rating-badge--' . $other, $html );
			}
		}
	}

	public function test_full_width_adds_its_modifier_and_the_stylesheet_stretches_the_frame(): void {
		$this->assertStringContainsString( 'sgs-google-rating-badge--full-width', $this->render( self::MANUAL + array( 'fullWidth' => true ) ) );
		// Negative control: off by default.
		$this->assertStringNotContainsString( 'sgs-google-rating-badge--full-width', $this->render( self::MANUAL ) );
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/google-rating-badge/style.css' );
		$this->assertMatchesRegularExpression( '#--full-width \.sgs-google-rating-badge__link\s*\{[^}]*width:\s*100%#', $css );
	}

	public function test_council_fixes_hover_focus_stripe_and_compact_default(): void {
		$css  = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/google-rating-badge/style.css' );
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/google-rating-badge/block.json' ), true );
		// Hover brightens only; the lift is the shadow system's (shadowLiftOnHover), never a hard-coded transform.
		$this->assertStringNotContainsString( 'translateY', $css );
		$this->assertMatchesRegularExpression( '#__link:hover\s*\{[^}]*brightness#', $css );
		// Focus: the theme's universal ring applies; the block draws no narrower one of its own.
		$this->assertDoesNotMatchRegularExpression( '#__link:focus-visible\s*\{[^}]*outline#', $css );
		// Card stripe: inside the border box and clipped by the frame's own corners.
		$this->assertMatchesRegularExpression( '#--card \.sgs-google-rating-badge__link\s*\{[^}]*overflow:\s*hidden#', $css );
		$this->assertDoesNotMatchRegularExpression( '#::before\s*\{[^}]*inset-inline-start:\s*-1px#', $css );
		// Compact mode is opt-in: off by default, so a footer or body badge never compacts on its own.
		$this->assertSame( 0, $json['attributes']['compactBelow']['default'] );
		$this->assertStringNotContainsString( '@media (max-width:', $this->render_full( self::MANUAL )['css'] );
		// Negative control: an explicit breakpoint still emits the compact rule.
		$this->assertStringContainsString( '@media (max-width:1199.98px)', $this->render_full( self::MANUAL + array( 'compactBelow' => 1200 ) )['css'] );
	}

	public function test_the_link_text_colour_outranks_the_theme_link_colour(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/google-rating-badge/style.css' );
		// Two classes beat global styles' a:where(:not(.wp-element-button)) (0,0,1); a :where() default would lose to it.
		$this->assertMatchesRegularExpression( '#\.sgs-google-rating-badge \.sgs-google-rating-badge__link\s*\{[^}]*color:\s*var\(--wp--preset--color--text#', $css );
		$this->assertDoesNotMatchRegularExpression( '#:where\(\.sgs-google-rating-badge__link\)\s*\{[^}]*(?<!-)color:#', $css );
	}

	public function test_hide_below_hides_the_badge_under_the_chosen_width(): void {
		$css = $this->render_full( self::MANUAL + array( 'hideBelow' => 1290 ) )['css'];
		$this->assertMatchesRegularExpression( '#@media \(max-width:1289\.98px\)\{\.sgs-grb-[0-9a-f]+\.wp-block-sgs-google-rating-badge\{display:none;\}\}#', $css );
		// Negative control: off by default.
		$this->assertStringNotContainsString( 'display:none;}}', $this->render_full( self::MANUAL )['css'] );
	}

	public function test_the_tap_target_stays_44px_whatever_the_visible_height(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/google-rating-badge/style.css' );
		$this->assertMatchesRegularExpression( '#a\.sgs-google-rating-badge__link::after\s*\{[^}]*width:\s*max\(100%,\s*44px\)[^}]*height:\s*max\(100%,\s*44px\)#', $css );
		// The link is the containing block for that box.
		$this->assertMatchesRegularExpression( '#\.sgs-google-rating-badge__link\s*\{[^}]*position:\s*relative#', $css );
	}

	public function test_the_stars_keep_their_colours_beside_a_reviews_block(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/google-rating-badge/style.css' );
		// google-reviews/style.css paints `.sgs-google-reviews__star--half .sgs-google-reviews__star-fill` (two classes)
		// through --sgs-gr-star, undefined outside a reviews block: computed black (measured live, 2026-10-08).
		$this->assertStringContainsString( '.sgs-google-rating-badge .sgs-google-rating-badge__stars .sgs-google-reviews__star-fill', $css );
		$this->assertStringContainsString( '.sgs-google-rating-badge .sgs-google-rating-badge__stars .sgs-google-reviews__star-outline', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-google-rating-badge__stars\s*\{[^}]*--sgs-gr-star:\s*var\(--sgs-grb-star#', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-google-rating-badge__stars\s*\{[^}]*--sgs-gr-line:#', $css );
	}

	public function test_the_stars_wrapper_is_a_div_so_the_helper_div_nests_validly(): void {
		$html = $this->render( self::MANUAL );
		$this->assertStringContainsString( '<div class="sgs-google-rating-badge__stars" aria-hidden="true">', $html );
		$this->assertStringNotContainsString( '<span class="sgs-google-rating-badge__stars"', $html );
	}

	public function test_the_default_preset_is_pill(): void {
		$this->assertStringContainsString( 'sgs-google-rating-badge--pill', $this->render( self::MANUAL ) );
	}

	public function test_manual_data_renders_score_and_review_count(): void {
		$html = $this->render( self::MANUAL );
		$this->assertStringContainsString( '>4.7<', $html );
		$this->assertStringContainsString( '__count">15 reviews<', $html );
		// Negative controls: the count can be switched off, and one review is singular.
		$this->assertStringNotContainsString( '__count">', $this->render( self::MANUAL + array( 'showCount' => false ) ) );
		$this->assertStringContainsString( '__count">1 review<', $this->render( array( 'reviewCount' => 1 ) + self::MANUAL ) );
	}

	public function test_no_rating_renders_nothing(): void {
		// Auto with no written figures, no Site Info and a failed fetch: nothing real to show.
		$this->assertSame( '', trim( $this->render( array( 'dataSource' => 'auto' ), 'error' ) ) );
		$this->assertSame( '', trim( $this->render( array( 'dataSource' => 'manual' ), 'live' ) ), 'manual never fetches' );
		$this->assertSame( '', trim( $this->render( array( 'dataSource' => 'synced' ), 'error' ) ) );
		// Negative control: a real rating renders.
		$this->assertNotSame( '', trim( $this->render( self::MANUAL, 'error' ) ) );
	}

	public function test_synced_data_says_google_maps_and_keeps_it(): void {
		$html = $this->render( array( 'dataSource' => 'synced' ) );
		$this->assertStringContainsString( '>4.7<', $html );
		$this->assertStringContainsString( '__count">132 reviews<', $html );
		$this->assertStringContainsString( '__source"> on Google Maps<', $html );

		// The source text cannot be hidden, and compact mode keeps it.
		$hidden = $this->render_full( array( 'dataSource' => 'synced', 'showSource' => false, 'badgeStyle' => 'pill' ) );
		$this->assertStringContainsString( '__source"> on Google Maps<', $hidden['html'] );
		$this->assertStringNotContainsString( 'sgs-google-rating-badge__caption{display:none', $hidden['css'] );

		// Negative control: written data hides the source on a pill when asked to.
		$this->assertStringNotContainsString( '__source">', $this->render( self::MANUAL + array( 'showSource' => false ) ) );
	}

	public function test_auto_uses_live_data_when_nothing_is_typed(): void {
		$html = $this->render( array( 'dataSource' => 'auto' ) );
		$this->assertStringContainsString( '__source"> on Google Maps<', $html );
		// Negative control: typed figures win over live data in auto.
		$typed = $this->render( self::MANUAL + array( 'dataSource' => 'auto' ) );
		$this->assertStringContainsString( '__count">15 reviews<', $typed );
		$this->assertStringNotContainsString( '132 reviews', $typed );
	}

	public function test_manual_data_never_says_google_maps(): void {
		foreach ( array( 'pill', 'card', 'stacked' ) as $preset ) {
			$html = $this->render( self::MANUAL + array( 'badgeStyle' => $preset ) );
			$this->assertStringNotContainsString( 'Google Maps', $html, $preset );
		}
		// Negative control: the same check does find it on live data.
		$this->assertStringContainsString( 'Google Maps', $this->render( array( 'dataSource' => 'synced' ) ) );
	}

	public function test_source_default_follows_the_preset(): void {
		$this->assertStringNotContainsString( '__source">', $this->render( self::MANUAL + array( 'badgeStyle' => 'pill' ) ) );
		$this->assertStringContainsString( '__source"> on Google<', $this->render( self::MANUAL + array( 'badgeStyle' => 'card' ) ) );
		$this->assertStringContainsString( '__source"> on Google<', $this->render( self::MANUAL + array( 'badgeStyle' => 'stacked' ) ) );
		$this->assertStringContainsString( '__source"> on Google<', $this->render( self::MANUAL + array( 'badgeStyle' => 'pill', 'showSource' => true ) ) );
	}

	/** @return array<string, array{0: string}> */
	public static function unsafe_urls(): array {
		return array(
			'javascript:' => array( 'javascript:alert(1)' ),
			'http:'       => array( 'http://example.com/reviews' ),
			'relative'    => array( '/reviews' ),
			'data:'       => array( 'data:text/html,x' ),
		);
	}

	/** @dataProvider unsafe_urls */
	public function test_the_anchor_is_https_only( string $url ): void {
		$html = $this->render( self::MANUAL + array( 'listingUrl' => $url ) );
		$this->assertStringNotContainsString( 'href=', $html );
		$this->assertStringNotContainsString( '<a ', $html );
		$this->assertStringContainsString( '<span class="sgs-google-rating-badge__link"', $html );
	}

	public function test_an_https_listing_url_makes_an_anchor_that_opens_in_a_new_tab(): void {
		$html = $this->render( self::MANUAL + array( 'listingUrl' => 'https://example.com/reviews' ) );
		$this->assertStringContainsString( '<a class="sgs-google-rating-badge__link" href="https://example.com/reviews" target="_blank" rel="noopener noreferrer">', $html );
		$this->assertStringContainsString( '<span class="sgs-sr-only"> (opens in a new tab)</span>', $html );

		$same_tab = $this->render( self::MANUAL + array( 'listingUrl' => 'https://example.com/reviews', 'openInNewTab' => false ) );
		$this->assertStringNotContainsString( 'target=', $same_tab );
		$this->assertStringNotContainsString( 'opens in a new tab', $same_tab );
	}

	public function test_link_order_listing_url_then_google_maps_then_site_info(): void {
		$info = array( 'socials.google' => 'https://g.page/r/siteinfo' );

		// 1. The block's own URL wins over everything.
		$own = $this->render( array( 'dataSource' => 'synced', 'listingUrl' => 'https://example.com/own' ), 'live', $info );
		$this->assertStringContainsString( 'href="https://example.com/own"', $own );

		// 2. Live data's googleMapsUri beats Site Info; an unsafe block URL falls through to it.
		$maps = $this->render( array( 'dataSource' => 'synced', 'listingUrl' => 'javascript:alert(1)' ), 'live', $info );
		$this->assertStringContainsString( 'href="https://maps.google.com/?cid=111"', $maps );

		// 3. Written data has no googleMapsUri, so Site Info's Google link is used.
		$site = $this->render( self::MANUAL, 'live', $info );
		$this->assertStringContainsString( 'href="https://g.page/r/siteinfo"', $site );

		// Negative control: an http Site Info link is refused, so there is no anchor.
		$http = $this->render( self::MANUAL, 'live', array( 'socials.google' => 'http://g.page/r/siteinfo' ) );
		$this->assertStringNotContainsString( 'href=', $http );
	}

	public function test_accessible_name_is_read_once(): void {
		$html = $this->render( self::MANUAL );
		$this->assertStringContainsString( '<span class="sgs-sr-only">Rated 4.7 out of 5 on Google from 15 reviews</span>', $html );
		$this->assertSame( 1, substr_count( $html, 'Rated 4.7 out of 5' ), 'the name appears once' );
		// The visible pieces are hidden from assistive technology so nothing is read twice.
		$this->assertStringContainsString( '<span class="sgs-google-rating-badge__score" aria-hidden="true">4.7</span>', $html );
		$this->assertStringContainsString( '<div class="sgs-google-rating-badge__stars" aria-hidden="true">', $html );
		$this->assertStringContainsString( '<span class="sgs-google-rating-badge__caption" aria-hidden="true">', $html );
		// Negative control: a custom label replaces the automatic name.
		$custom = $this->render( self::MANUAL + array( 'linkLabel' => 'Our reviews' ) );
		$this->assertStringContainsString( '<span class="sgs-sr-only">Our reviews</span>', $custom );
		$this->assertStringNotContainsString( 'Rated 4.7', $custom );
	}

	public function test_the_google_g_comes_first_then_score_then_stars_then_caption(): void {
		$html = $this->render( self::MANUAL + array( 'badgeStyle' => 'card' ) );
		$this->assertMatchesRegularExpression( '#<img class="sgs-google-rating-badge__logo" src="[^"]*assets/google-logo\.svg" alt="" aria-hidden="true"#', $html );
		$logo    = strpos( $html, 'sgs-google-rating-badge__logo' );
		$score   = strpos( $html, 'sgs-google-rating-badge__score"' );
		$stars   = strpos( $html, 'sgs-google-rating-badge__stars"' );
		$caption = strpos( $html, 'sgs-google-rating-badge__caption"' );
		$this->assertTrue( $logo < $score && $score < $stars && $stars < $caption, 'order is G, score, stars, caption' );
		// Negative control: the logo carries no alt text a screen reader would read.
		$this->assertDoesNotMatchRegularExpression( '#<img[^>]*alt="Google"#', $html );
	}

	public function test_no_inline_style_attribute(): void {
		$pattern = '/\sstyle\s*=/i';
		foreach ( array( 'pill', 'card', 'stacked' ) as $preset ) {
			$out = $this->render_full(
				self::MANUAL + array(
					'badgeStyle'      => $preset,
					'backgroundColour' => '#ffeecc',
					'starColour'       => '#ff0000',
					'position'         => 'floating',
					'padding'          => array( 'desktop' => array( 'top' => '10px' ) ),
				)
			);
			$this->assertDoesNotMatchRegularExpression( $pattern, $out['html'], $preset );
			// The per-instance values live in the scoped <style> block instead.
			$this->assertStringContainsString( '<style>', $out['html'] );
			$this->assertStringContainsString( '--sgs-grb-star:#ff0000', $out['css'] );
		}
		// Negative control: the pattern does catch an inline style.
		$this->assertSame( 1, preg_match( $pattern, '<div class="x" style="color:red">' ) );
	}

	public function test_compact_rule_uses_the_breakpoint_and_can_be_switched_off(): void {
		$css = $this->render_full( self::MANUAL + array( 'compactBelow' => 1200 ) )['css'];
		$this->assertStringContainsString( '@media (max-width:1199.98px){', $css );
		$this->assertStringContainsString( 'sgs-google-rating-badge__count{display:none;}', $css );
		$this->assertStringContainsString( 'sgs-google-rating-badge__stars svg:nth-child(n+2){display:none;}', $css );
		$this->assertStringNotContainsString( 'container-type', $css );
		$this->assertStringNotContainsString( '@container', $css );

		$custom = $this->render_full( self::MANUAL + array( 'compactBelow' => 768 ) )['css'];
		$this->assertStringContainsString( '@media (max-width:767.98px){', $custom );

		// Negative control: 0 turns it off.
		$off = $this->render_full( self::MANUAL + array( 'compactBelow' => 0 ) )['css'];
		$this->assertStringNotContainsString( 'sgs-google-rating-badge__count{display:none;}', $off );
		$this->assertStringNotContainsString( 'nth-child(n+2)', $off );
	}

	public function test_google_rating_wording_never_appears(): void {
		foreach ( array(
			self::MANUAL,
			self::MANUAL + array( 'badgeStyle' => 'card', 'showSource' => true ),
			array( 'dataSource' => 'synced' ),
			self::MANUAL + array( 'listingUrl' => 'https://example.com/r' ),
		) as $attrs ) {
			$this->assertDoesNotMatchRegularExpression( '/google\s+rating/i', $this->render( $attrs ) );
		}
		// Negative control: the checker would flag the wording if it were there.
		$this->assertSame( 1, preg_match( '/google\s+rating/i', 'Google rating 4.7' ) );
	}

	public function test_site_info_figures_are_used_when_the_block_has_none(): void {
		$info = array(
			'google_rating'       => '4.6',
			'google_review_count' => '89',
		);
		$html = $this->render( array( 'dataSource' => 'auto' ), 'error', $info );
		$this->assertStringContainsString( '>4.6<', $html );
		$this->assertStringContainsString( '__count">89 reviews<', $html );
		$this->assertStringNotContainsString( 'Google Maps', $html, 'Site Info figures are written data' );

		// manual reads Site Info too; synced does not.
		$this->assertStringContainsString( '>4.6<', $this->render( array( 'dataSource' => 'manual' ), 'live', $info ) );
		$this->assertSame( '', trim( $this->render( array( 'dataSource' => 'synced' ), 'error', $info ) ) );
	}

	public function test_block_figures_win_over_site_info(): void {
		$info = array(
			'google_rating'       => '4.6',
			'google_review_count' => '89',
		);
		$html = $this->render( array( 'dataSource' => 'auto', 'rating' => 4.9, 'reviewCount' => 12 ), 'live', $info );
		$this->assertStringContainsString( '>4.9<', $html );
		$this->assertStringContainsString( '__count">12 reviews<', $html );
		$this->assertStringNotContainsString( '>4.6<', $html );
		$this->assertStringNotContainsString( '89 reviews', $html );

		// Each figure falls back on its own: a typed rating with no typed count takes the Site Info count.
		$mixed = $this->render( array( 'dataSource' => 'auto', 'rating' => 4.9 ), 'live', $info );
		$this->assertStringContainsString( '>4.9<', $mixed );
		$this->assertStringContainsString( '__count">89 reviews<', $mixed );

		// Site Info wins over live data in auto (the manual chain runs first).
		$this->assertStringNotContainsString( '132 reviews', $this->render( array( 'dataSource' => 'auto' ), 'live', $info ) );
	}

	public function test_site_info_ratings_are_clamped_and_empty_values_are_ignored(): void {
		$this->assertSame( '', trim( $this->render( array( 'dataSource' => 'manual' ), 'live', array( 'google_rating' => '' ) ) ) );
		$this->assertSame( '', trim( $this->render( array( 'dataSource' => 'manual' ), 'live', array( 'google_rating' => 'abc' ) ) ) );
		$this->assertStringContainsString( '>5.0<', $this->render( array( 'dataSource' => 'manual' ), 'live', array( 'google_rating' => '7.2' ) ) );
	}

	public function test_floating_position_adds_the_corner_classes_and_offset(): void {
		$out = $this->render_full(
			self::MANUAL + array(
				'position'       => 'floating',
				'floatingCorner' => 'top-left',
				'floatingOffset' => array( 'desktop' => '16px', 'mobile' => '8px' ),
			)
		);
		$this->assertStringContainsString( 'sgs-google-rating-badge--floating', $out['html'] );
		$this->assertStringContainsString( 'sgs-google-rating-badge--corner-top-left', $out['html'] );
		$this->assertStringContainsString( '--sgs-grb-offset:16px', $out['css'] );
		$this->assertStringContainsString( '--sgs-grb-offset:8px', $out['css'] );

		// Negative control: in the flow of the page there is none of it.
		$static = $this->render_full( self::MANUAL + array( 'floatingOffset' => array( 'desktop' => '16px' ) ) );
		$this->assertStringNotContainsString( '--floating', $static['html'] );
		$this->assertStringNotContainsString( '--sgs-grb-offset', $static['css'] );
	}

	public function test_hover_colours_are_touch_guarded(): void {
		$css = $this->render_full( self::MANUAL + array( 'backgroundColour' => '#ffffff', 'backgroundColourHover' => '#fafafa' ) )['css'];
		$this->assertStringContainsString( '#fafafa', $css );
		$this->assertStringContainsString( '@media (hover: hover)', $css );
		// Negative control: no hover colour, no hover rule for it.
		$none = $this->render_full( self::MANUAL + array( 'backgroundColour' => '#ffffff' ) )['css'];
		$this->assertStringNotContainsString( '#fafafa', $none );
	}

	public function test_card_stripe_is_a_fill_and_only_on_the_card(): void {
		$card = $this->render_full( self::MANUAL + array( 'badgeStyle' => 'card', 'accentStripeColour' => '#123456' ) )['css'];
		$this->assertStringContainsString( '__link::before{background-color:#123456}', $card );
		$grad = $this->render_full( self::MANUAL + array( 'badgeStyle' => 'card', 'accentStripeColourGradient' => 'linear-gradient(90deg,#111,#222)' ) )['css'];
		$this->assertStringContainsString( '__link::before{background-image:linear-gradient', $grad );
		// Negative control: no stripe rule on the other presets.
		$pill = $this->render_full( self::MANUAL + array( 'badgeStyle' => 'pill', 'accentStripeColour' => '#123456' ) )['css'];
		$this->assertStringNotContainsString( '::before', $pill );
	}

	public function test_star_gradient_defs_and_rule(): void {
		$out = $this->render_full( self::MANUAL + array( 'starColourGradient' => 'linear-gradient(90deg,#ff0000,#0000ff)' ) );
		$this->assertStringContainsString( '<linearGradient', $out['html'] );
		$this->assertMatchesRegularExpression( '#sgs-google-reviews__star--full path[^{]*\{fill:url\(\#sgs-grb-[0-9a-f]+-star-grad\)#', $out['css'] );
		// Negative control: a flat star colour injects no gradient.
		$flat = $this->render_full( self::MANUAL + array( 'starColour' => '#ff0000' ) );
		$this->assertStringNotContainsString( '<linearGradient', $flat['html'] );
	}
}

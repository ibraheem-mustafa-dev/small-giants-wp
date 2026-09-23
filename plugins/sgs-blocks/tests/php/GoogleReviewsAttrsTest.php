<?php
/**
 * Tests: sgs/google-reviews redesign (server render + stylesheet).
 *
 * Every attribute group is rendered through the REAL src/blocks/google-reviews/render.php (QA harness, child
 * process, see ReviewsAggregateTest) and the emitted scoped CSS is asserted. Each group carries a NEGATIVE
 * CONTROL: the same attributes under a broken name must emit nothing, proving the positive assertion depends
 * on the mapping and is not vacuous.
 *
 * Also proves the precedence contract: a ready-made look (`cardStyle`) is written at TWO classes in style.css,
 * a value the author set is written at THREE, so the author's value always wins.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class GoogleReviewsAttrsTest extends TestCase {

	private const BLOCK = __DIR__ . '/../../src/blocks/google-reviews';

	/** Scoped selector prefix once the per-instance uid is normalised. */
	private const R = '.UID.wp-block-sgs-google-reviews';

	/**
	 * Render the real block in a child process and return its HTML and its scoped CSS (uid normalised to UID).
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return array{html: string, css: string}
	 */
	private function render( array $attrs ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$prepend = __DIR__ . '/stubs/google-reviews-render-prepend.php';
		$attrs   = array_merge(
			array(
				'dataSource' => 'inline',
				'reviews'    => array(
					array(
						'author'       => 'Anonymous M.',
						'avatarColour' => '#1A73E8',
						'date'         => '2 years ago',
						'meta'         => '6 reviews',
						'rating'       => 5,
						'text'         => 'Had a lovely experience.',
						'url'          => 'https://example.com/review-1',
					),
					array(
						'author' => 'Sadia K',
						'rating' => 4,
						'text'   => 'Very kind.',
					),
				),
			),
			$attrs
		);
		$file    = tempnam( sys_get_temp_dir(), 'sgsgr' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );
		putenv( 'SGS_GR_TEST_MODE=live' );
		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' -d auto_prepend_file=' . escapeshellarg( $prepend )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/google-reviews --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			putenv( 'SGS_GR_TEST_MODE' );
			unlink( $file );
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'the harness must print one JSON object, got: ' . substr( $out, 0, 400 ) );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php must not fatal: ' . ( $decoded['error'] ?? $out ) );

		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) preg_replace( '/\.sgs-gr-[a-f0-9]{8}/', '.UID', (string) $decoded['css'] ),
		);
	}

	/** Tier-object box value with one length on every side. */
	private function box( string $len ): array {
		return array(
			'desktop' => array(
				'top'    => $len,
				'right'  => $len,
				'bottom' => $len,
				'left'   => $len,
			),
		);
	}

	/** Corner-object radius value with one length on every corner. */
	private function corners( string $len ): array {
		return array(
			'desktop' => array(
				'topLeft'     => $len,
				'topRight'    => $len,
				'bottomRight' => $len,
				'bottomLeft'  => $len,
			),
		);
	}

	/**
	 * The attribute groups: name => [attributes, CSS fragments each must emit].
	 *
	 * @return array<string, array{0: array<string, mixed>, 1: array<int, string>}>
	 */
	public static function attributeGroups(): array {
		$r  = self::R;
		$b4 = static fn( string $l ): array => array(
			'desktop' => array(
				'top'    => $l,
				'right'  => $l,
				'bottom' => $l,
				'left'   => $l,
			),
		);
		$c4 = static fn( string $l ): array => array(
			'desktop' => array(
				'topLeft'     => $l,
				'topRight'    => $l,
				'bottomRight' => $l,
				'bottomLeft'  => $l,
			),
		);

		return array(
			'header'  => array(
				array(
					'headerGap'           => array( 'desktop' => 22 ),
					'headerPadding'       => $b4( '0' ),
					'headerDividerColour' => '#E8EAED',
					'headerDividerWidth'  => '1px',
				),
				array(
					"{$r} .sgs-google-reviews__aggregate{gap:22px;}",
					"{$r} .sgs-google-reviews__aggregate{padding:0px 0px 0px 0px;}",
					"{$r} .sgs-google-reviews__aggregate{border-bottom-color:#E8EAED;}",
					"{$r} .sgs-google-reviews__aggregate{border-bottom-width:1px;}",
				),
			),
			'logo'    => array(
				array(
					'logoSize'    => array( 'desktop' => '30px' ),
					// 2026-09-23: the default opacity is 1 (the Google baseline), so the group moves it off the default.
					'logoOpacity' => 0.8,
				),
				array(
					"{$r} .sgs-google-reviews__google-logo{width:30px;height:30px;}",
					"{$r} .sgs-google-reviews__google-logo{opacity:0.8;}",
				),
			),
			'colours' => array(
				array(
					'sourceLabelColour' => '#5F6368',
					'scoreColour'       => '#202124',
					'countColour'       => '#5F6368',
					'authorColour'      => '#202124',
					'metaColour'        => '#70757A',
					'dateColour'        => '#70757A',
					'textColour'        => '#3C4043',
					'reviewLinkColour'  => '#1A73E8',
					'footnoteColour'    => '#5F6368',
					'avatarTextColour'  => '#ffffff',
				),
				array(
					"{$r} .sgs-google-reviews__source-label{color:#5F6368;}",
					"{$r} .sgs-google-reviews__score{color:#202124;}",
					"{$r} .sgs-google-reviews__count{color:#5F6368;}",
					"{$r} .sgs-google-reviews__author{color:#202124;}",
					"{$r} .sgs-google-reviews__meta{color:#70757A;}",
					"{$r} .sgs-google-reviews__date{color:#70757A;}",
					"{$r} .sgs-google-reviews__text{color:#3C4043;}",
					"{$r} .sgs-google-reviews__review-link{color:#1A73E8;}",
					"{$r} .sgs-google-reviews__footnote{color:#5F6368;}",
					"{$r} .sgs-google-reviews__avatar-initials{color:#ffffff;}",
				),
			),
			'stars'   => array(
				array(
					'starSize'          => array( 'desktop' => 15 ),
					'aggregateStarSize' => array( 'desktop' => 18 ),
					'starColour'        => '#FBBC04',
					'starEmptyColour'   => '#DADCE0',
				),
				array(
					"{$r} .sgs-google-reviews__stars{--sgs-gr-star-size:15px;}",
					"{$r} .sgs-google-reviews__aggregate-stars{--sgs-gr-star-size:18px;}",
					"{$r} .sgs-google-reviews__star--full,{$r} .sgs-google-reviews__star--half .sgs-google-reviews__star-fill{fill:#FBBC04;}",
					"{$r} .sgs-google-reviews__star--empty,{$r} .sgs-google-reviews__star--half .sgs-google-reviews__star-outline{fill:#DADCE0;}",
				),
			),
			'card'    => array(
				array(
					'cardPadding'      => $b4( '20px' ),
					'cardBorderWidth'  => array(
						'top'    => '1px',
						'right'  => '1px',
						'bottom' => '1px',
						'left'   => '1px',
					),
					'cardBorderColour' => '#E8EAED',
					'cardBorderRadius' => $c4( '8px' ),
					'cardBackground'   => '#ffffff',
					'cardGap'          => array( 'desktop' => 12 ),
					'cardWidth'        => array(
						'desktop' => 340,
						'mobile'  => 270,
					),
				),
				array(
					"{$r} .sgs-google-reviews__review{padding:20px 20px 20px 20px;}",
					"{$r} .sgs-google-reviews__review{border-width:1px 1px 1px 1px;}",
					"{$r} .sgs-google-reviews__review{border-style:solid;}",
					"{$r} .sgs-google-reviews__review{border-color:#E8EAED;}",
					"{$r} .sgs-google-reviews__review{border-radius:8px 8px 8px 8px;}",
					"{$r} .sgs-google-reviews__review{background-color:#ffffff;}",
					"{$r} .sgs-google-reviews__review{gap:12px;}",
					"{$r} .sgs-google-reviews__review{flex-basis:340px;}",
					'@media (max-width:767px){' . "{$r} .sgs-google-reviews__review{flex-basis:270px;}}",
				),
			),
			'avatar'  => array(
				array(
					'avatarSize'         => array( 'desktop' => 40 ),
					'avatarBorderRadius' => $c4( '50%' ),
				),
				array(
					"{$r} .sgs-google-reviews__avatar{width:40px;height:40px;}",
					"{$r} .sgs-google-reviews__avatar{border-radius:50% 50% 50% 50%;}",
				),
			),
			'text'    => array(
				array( 'textClampLines' => 6 ),
				array( "{$r} .sgs-google-reviews__text{-webkit-line-clamp:6;}" ),
			),
			'rail'    => array(
				array(
					'railPadding'     => $b4( '10px' ),
					'gap'             => array( 'desktop' => 16 ),
					// 2026-09-23: `scrollbar` was replaced by `pagination` (default scrollbar) + `scrollbarStyle` (default
					// thin); `standard` is the value that moves off the default.
					'scrollbarStyle'  => 'standard',
					'scrollbarColour' => '#DADCE0',
				),
				array(
					"{$r} .sgs-google-reviews__list{padding:10px 10px 10px 10px;}",
					"{$r} .sgs-google-reviews__list{gap:16px;}",
					"{$r} .sgs-google-reviews__list{scrollbar-width:auto;}",
					"{$r} .sgs-google-reviews__list{scrollbar-color:#DADCE0 transparent;}",
				),
			),
			'buttons' => array(
				array(
					'reviewRequestUrl'      => 'https://example.com/write',
					'seeAllUrl'             => 'https://example.com/all',
					'seeAllColourBackground' => '#1A73E8',
					'seeAllColourText'      => '#ffffff',
					'seeAllBorderRadius'    => $c4( '20px' ),
					'seeAllPadding'         => $b4( '22px' ),
					'seeAllMinHeight'       => array( 'desktop' => 40 ),
					'writeReviewColourBorder' => '#DADCE0',
					'writeReviewBorderWidth'  => array(
						'top'    => '1px',
						'right'  => '1px',
						'bottom' => '1px',
						'left'   => '1px',
					),
					'writeReviewBorderRadius' => $c4( '20px' ),
					'writeReviewMinHeight'    => array( 'desktop' => 40 ),
					'arrowSize'               => array( 'desktop' => 40 ),
					'arrowBorderRadius'       => $c4( '50%' ),
				),
				array(
					"{$r} .sgs-google-reviews__see-all::after{content:\"\";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-color:#1A73E8;}",
					"{$r} .sgs-google-reviews__see-all{color:#ffffff;}",
					"{$r} .sgs-google-reviews__see-all{padding:22px 22px 22px 22px;}",
					"{$r} .sgs-google-reviews__see-all{border-radius:20px 20px 20px 20px;}",
					"{$r} .sgs-google-reviews__see-all{min-height:40px;}",
					"{$r} .sgs-google-reviews__write-review{border-color:#DADCE0;}",
					"{$r} .sgs-google-reviews__write-review{border-width:1px 1px 1px 1px;}",
					"{$r} .sgs-google-reviews__write-review{border-radius:20px 20px 20px 20px;}",
					"{$r} .sgs-google-reviews__write-review{min-height:40px;}",
					"{$r} .sgs-google-reviews__arrow{width:40px;height:40px;}",
					"{$r} .sgs-google-reviews__arrow{border-radius:50% 50% 50% 50%;}",
				),
			),
		);
	}

	/**
	 * @dataProvider attributeGroups
	 *
	 * @param array<string, mixed> $attrs   Attributes for the group.
	 * @param array<int, string>   $needles CSS fragments each must be emitted.
	 */
	public function test_each_attribute_group_emits_its_scoped_css( array $attrs, array $needles ): void {
		$css = $this->render( $attrs )['css'];
		foreach ( $needles as $needle ) {
			$this->assertStringContainsString( $needle, $css );
		}
	}

	/**
	 * NEGATIVE CONTROL: the same attributes under a broken name emit none of the fragments. A green run of the
	 * test above therefore proves the mapping from the attribute to the rule, not the mere presence of CSS.
	 *
	 * @dataProvider attributeGroups
	 *
	 * @param array<string, mixed> $attrs   Attributes for the group.
	 * @param array<int, string>   $needles CSS fragments each must be emitted.
	 */
	public function test_negative_control_a_broken_attribute_name_emits_none_of_the_fragments( array $attrs, array $needles ): void {
		$broken = array();
		foreach ( $attrs as $key => $value ) {
			$broken[ 'x' . $key ] = $value;
		}
		$css = $this->render( $broken )['css'];
		foreach ( $needles as $needle ) {
			$this->assertStringNotContainsString( $needle, $css, 'a broken attribute name must not reach the stylesheet' );
		}
	}

	// ── Defaults emit nothing, so the stylesheet (or a look) supplies the value ────────────────────────────

	public function test_an_attribute_left_at_its_default_emits_nothing(): void {
		$css = $this->render( array() )['css'];
		foreach ( array( 'google-logo', '__stars', 'avatar{', '__review{', '__list{', '__text{', '__aggregate{', 'see-all', '.sgs-google-reviews{padding' ) as $fragment ) {
			$this->assertStringNotContainsString( $fragment, preg_replace( '/nth-child\(\d+\) \.sgs-google-reviews__avatar-initials\{[^}]*\}/', '', $css ), "nothing for {$fragment}" );
		}
	}

	public function test_the_logo_opacity_and_scrollbar_defaults_do_not_beat_a_look(): void {
		// 2026-09-23 defaults: logoOpacity 1, pagination scrollbar, scrollbarStyle thin (the Google baseline).
		$css = $this->render(
			array(
				'logoOpacity'    => 1,
				'pagination'     => 'scrollbar',
				'scrollbarStyle' => 'thin',
				'textClampLines' => 8,
			)
		)['css'];
		$this->assertStringNotContainsString( 'opacity:', $css );
		$this->assertStringNotContainsString( 'scrollbar-width', $css );
		$this->assertStringNotContainsString( 'line-clamp', $css );
	}

	public function test_the_scrollbar_settings_are_written_only_while_the_scrollbar_is_the_indicator(): void {
		$attrs = array(
			'scrollbarStyle'  => 'standard',
			'scrollbarColour' => '#123456',
		);
		$css   = $this->render( $attrs )['css'];
		$this->assertStringContainsString( 'scrollbar-width:auto', $css );
		$this->assertStringContainsString( 'scrollbar-color:#123456', $css );
		// NEGATIVE CONTROL: with dots (or nothing) the shared layer hides the scrollbar, so its settings emit nothing.
		foreach ( array( 'dots', 'none' ) as $pagination ) {
			$css = $this->render( array_merge( $attrs, array( 'pagination' => $pagination ) ) )['css'];
			$this->assertStringNotContainsString( 'scrollbar-width', $css, $pagination );
			$this->assertStringNotContainsString( 'scrollbar-color', $css, $pagination );
		}
	}

	// ── Typography: 12 element families + the block's own ───────────────────────────────────────────────────

	public function test_every_typography_family_writes_its_own_selector(): void {
		$families = array(
			'sourceLabel' => '__source-label',
			'score'       => '__score',
			'count'       => '__count',
			'author'      => '__author',
			'meta'        => '__meta',
			'date'        => '__date',
			'text'        => '__text',
			'avatar'      => '__avatar-initials',
			'footnote'    => '__footnote',
			'reviewLink'  => '__review-link',
			'writeReview' => '__write-review',
			'seeAll'      => '__see-all',
		);
		$attrs    = array();
		foreach ( array_keys( $families ) as $i => $prefix ) {
			$attrs[ $prefix . 'FontSize' ] = array( 'desktop' => 11 + $i );
		}
		$attrs['fontSize'] = array( 'desktop' => 30 );
		$css               = $this->render( $attrs )['css'];
		$i                 = 0;
		foreach ( $families as $prefix => $element ) {
			$this->assertStringContainsString( self::R . ' .sgs-google-reviews' . $element . '{font-size:' . ( 11 + $i ) . 'px;}', $css, "{$prefix} family" );
			++$i;
		}
		$this->assertStringContainsString( self::R . '.sgs-google-reviews{font-size:30px;}', $css, 'the block\'s own type' );

		// NEGATIVE CONTROL.
		$broken = array();
		foreach ( $attrs as $key => $value ) {
			$broken[ 'x' . $key ] = $value;
		}
		$this->assertStringNotContainsString( 'font-size', $this->render( $broken )['css'] );
	}

	public function test_a_tier_object_font_size_on_a_button_is_never_read_as_a_number(): void {
		// The button helper runs absint() on a font size; an object would print font-size:0px / 1px.
		$css = $this->render(
			array(
				'reviewRequestUrl'  => 'https://example.com/w',
				'writeReviewFontSize' => array( 'desktop' => 14 ),
				'seeAllUrl'         => 'https://example.com/a',
				'seeAllFontSize'    => array(),
			)
		)['css'];
		$this->assertStringContainsString( self::R . ' .sgs-google-reviews__write-review{font-size:14px;}', $css );
		$this->assertStringNotContainsString( 'font-size:0px', $css );
		$this->assertStringNotContainsString( 'font-size:1px', $css );
	}

	// ── Wrapper root ───────────────────────────────────────────────────────────────────────────────────────

	public function test_the_root_background_and_padding_are_written_at_three_classes(): void {
		$css = $this->render(
			array(
				'backgroundColour' => '#ffffff',
				'padding'          => $this->box( '28px' ),
			)
		)['css'];
		$this->assertStringContainsString( self::R . '.sgs-google-reviews{background-color:#ffffff;}', $css );
		$this->assertStringContainsString( self::R . '.sgs-google-reviews{padding:28px 28px 28px 28px;}', $css );
		$this->assertSame( 3, $this->classCount( self::R . '.sgs-google-reviews' ) );

		// NEGATIVE CONTROL.
		$css = $this->render( array( 'xbackgroundColour' => '#ffffff' ) )['css'];
		$this->assertStringNotContainsString( 'background-color:#ffffff', $css );
	}

	// ── Content and presence ───────────────────────────────────────────────────────────────────────────────

	public function test_the_new_elements_are_drawn_with_their_bem_classes(): void {
		$html = $this->render(
			array(
				'averageRating'    => 4.7,
				'reviewCount'      => 15,
				'sourceLabel'      => 'Google Reviews',
				'footnote'         => 'Scroll for more',
				'seeAllUrl'        => 'https://example.com/all',
				'seeAllLabel'      => 'See all reviews',
				'reviewRequestUrl' => 'https://example.com/write',
				'writeReviewLabel' => 'Write a review',
				'showCardLogo'     => true,
				'showReviewLink'   => true,
			)
		)['html'];
		foreach ( array( '__source-label', '__score', '__aggregate-stars', '__count', '__footnote', '__see-all', '__write-review', '__card-logo', '__review-link', '__cta' ) as $class ) {
			$this->assertStringContainsString( 'sgs-google-reviews' . $class, $html, $class );
		}
		$this->assertStringContainsString( '>Google Reviews</span>', $html );
		$this->assertStringContainsString( '>See all reviews</a>', $html );
		$this->assertStringContainsString( '>Write a review</a>', $html );
		$this->assertStringContainsString( '>Scroll for more</p>', $html );
		$this->assertStringContainsString( 'href="https://example.com/review-1"', $html, 'the per-review link is drawn' );
		$this->assertSame( 1, substr_count( $html, 'sgs-google-reviews__review-link' ), 'only the review that carries a url gets one' );
		$this->assertSame( 2, substr_count( $html, 'class="sgs-google-reviews__card-logo"' ), 'one small logo per review' );
		$this->assertStringContainsString( 'sgs-google-reviews__aggregate-stars', $html );
	}

	public function test_the_new_elements_are_absent_by_default(): void {
		$html = $this->render( array( 'averageRating' => 4.7 ) )['html'];
		foreach ( array( '__source-label', '__footnote', '__see-all', '__review-link' ) as $class ) {
			$this->assertStringNotContainsString( 'sgs-google-reviews' . $class, $html, $class );
		}
	}

	public function test_the_per_card_google_mark_is_on_by_default_and_the_switch_removes_it(): void {
		// 2026-09-23: showCardLogo defaults to true (the Google baseline shows a G on every card).
		$this->assertSame( 2, substr_count( $this->render( array() )['html'], 'class="sgs-google-reviews__card-logo"' ) );
		// NEGATIVE CONTROL: switched off, no card carries it.
		$this->assertStringNotContainsString( 'sgs-google-reviews__card-logo', $this->render( array( 'showCardLogo' => false ) )['html'] );
	}

	public function test_a_review_link_needs_both_the_switch_and_a_url(): void {
		$off = $this->render( array( 'showReviewLink' => false ) )['html'];
		$this->assertStringNotContainsString( 'sgs-google-reviews__review-link', $off, 'switch off, url present' );
		$no_url = $this->render(
			array(
				'showReviewLink' => true,
				'reviews'        => array(
					array(
						'author' => 'A',
						'text'   => 'No link here.',
						'rating' => 5,
					),
				),
			)
		)['html'];
		$this->assertStringNotContainsString( 'sgs-google-reviews__review-link', $no_url, 'switch on, no url' );
	}

	public function test_the_buttons_have_a_default_label_and_the_author_label_wins(): void {
		$default = $this->render(
			array(
				'averageRating'    => 4.7,
				'reviewRequestUrl' => 'https://example.com/w',
				'seeAllUrl'        => 'https://example.com/a',
			)
		)['html'];
		$this->assertStringContainsString( '>Write a review</a>', $default );
		$this->assertStringContainsString( '>See all reviews</a>', $default );
		$custom = $this->render(
			array(
				'averageRating'    => 4.7,
				'reviewRequestUrl' => 'https://example.com/w',
				'writeReviewLabel' => 'Leave feedback',
			)
		)['html'];
		$this->assertStringContainsString( '>Leave feedback</a>', $custom );
		$this->assertStringNotContainsString( '>Write a review</a>', $custom );
	}

	public function test_the_header_buttons_sit_in_the_header_row_and_fall_back_below_the_reviews(): void {
		$with_header = $this->render(
			array(
				'averageRating'    => 4.7,
				'reviewRequestUrl' => 'https://example.com/w',
			)
		)['html'];
		// The rail also carries the shared navigation's class, so match the class attribute's opening.
		$this->assertLessThan( strpos( $with_header, 'class="sgs-google-reviews__list' ), strpos( $with_header, 'class="sgs-google-reviews__cta"' ), 'inside the header row, before the list' );
		$no_header = $this->render(
			array(
				'showAggregate'    => false,
				'reviewRequestUrl' => 'https://example.com/w',
			)
		)['html'];
		$this->assertGreaterThan( strpos( $no_header, 'class="sgs-google-reviews__list' ), strpos( $no_header, 'class="sgs-google-reviews__cta"' ), 'no header row: below the reviews' );
	}

	public function test_everything_printed_is_escaped(): void {
		$html = $this->render(
			array(
				'averageRating'    => 4.7,
				'sourceLabel'      => '<script>alert(1)</script>',
				'footnote'         => '"><img src=x onerror=alert(1)>',
				'seeAllUrl'        => 'javascript:alert(1)',
				'seeAllLabel'      => '<b>bold</b>',
				'reviewRequestUrl' => 'https://example.com/w',
				'writeReviewLabel' => '<i>x</i>',
			)
		)['html'];
		$this->assertStringNotContainsString( '<script>alert(1)', $html );
		$this->assertStringNotContainsString( '<img src=x', $html );
		$this->assertStringNotContainsString( '<b>bold</b>', $html );
		$this->assertStringNotContainsString( '<i>x</i>', $html );
		// (The href itself goes through WordPress's own esc_url(), which the QA harness stubs, so the
		// javascript: scheme strip is WordPress's to prove, not this test's.)
	}

	public function test_the_structural_choices_are_classes_written_only_when_made(): void {
		// 2026-09-23: leading is the default logo position, so trailing is the choice that writes a class.
		$made = $this->render( array( 'logoPosition' => 'trailing' ) )['html'];
		$this->assertStringContainsString( 'sgs-google-reviews--logo-trailing', $made );
		$default = $this->render( array( 'logoPosition' => 'leading' ) )['html'];
		$this->assertStringNotContainsString( 'sgs-google-reviews--logo-', $default );
		// The arrow placement is no longer a root modifier: the slider wrapper carries the shared layer's class.
		$this->assertStringNotContainsString( 'sgs-google-reviews--nav-', $default );
		$this->assertStringContainsString( 'sgs-slider-nav--below-end', $default );
	}

	public function test_switching_the_text_clamp_off_releases_the_box(): void {
		$css = $this->render( array( 'textClamp' => false ) )['css'];
		$this->assertStringContainsString( self::R . ' .sgs-google-reviews__text{display:block;-webkit-line-clamp:unset;overflow:visible;}', $css );
	}

	public function test_a_standard_scrollbar_is_written_when_the_author_chose_it(): void {
		$css = $this->render( array( 'scrollbarStyle' => 'standard' ) )['css'];
		$this->assertStringContainsString( 'scrollbar-width:auto', $css );
	}

	// ── No inline styling, every variant still renders the real reviews ────────────────────────────────────

	public function test_no_variant_renders_an_inline_style_and_every_variant_keeps_the_reviews(): void {
		$rich = array(
			'averageRating'    => 4.7,
			'reviewCount'      => 15,
			'sourceLabel'      => 'Google Reviews',
			'seeAllUrl'        => 'https://example.com/a',
			'reviewRequestUrl' => 'https://example.com/w',
			'showCardLogo'     => true,
			'showReviewLink'   => true,
			'cardPadding'      => $this->box( '20px' ),
			'starColour'       => '#FBBC04',
		);
		foreach ( array( 'slider', 'grid', 'list', 'wall' ) as $variant ) {
			$html = $this->render( array_merge( $rich, array( 'variant' => $variant ) ) )['html'];
			$this->assertStringContainsString( 'sgs-google-reviews--' . $variant, $html );
			$this->assertStringContainsString( 'Anonymous M.', $html, "{$variant} keeps the first review" );
			$this->assertStringContainsString( 'Sadia K', $html, "{$variant} keeps the second review" );
			$this->assertSame( 0, preg_match( '/<[a-z][^>]*\sstyle="/i', $html ), "{$variant}: no inline style attribute" );
		}
		foreach ( array( 'badge', 'floating-badge' ) as $variant ) {
			$html = $this->render( array_merge( $rich, array( 'variant' => $variant ) ) )['html'];
			$this->assertStringContainsString( 'sgs-google-reviews__badge', $html );
			$this->assertStringContainsString( '4.7', $html, "{$variant} shows the rating" );
			$this->assertSame( 0, preg_match( '/<[a-z][^>]*\sstyle="/i', $html ), "{$variant}: no inline style attribute" );
		}
	}

	// ── Precedence: a look is two classes, an author's value is three ──────────────────────────────────────

	/** Number of classes in a selector (pseudo-classes and pseudo-elements do not count). */
	private function classCount( string $selector ): int {
		return (int) preg_match_all( '/\.[A-Za-z_][\w-]*/', $selector );
	}

	public function test_every_look_selector_has_exactly_two_classes(): void {
		$css = (string) file_get_contents( self::BLOCK . '/style.css' );
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
		$this->assertGreaterThan( 0, preg_match_all( '/([^{}]+)\{[^{}]*\}/', $css, $rules ) );
		$found = array();
		foreach ( $rules[1] as $selector_list ) {
			foreach ( explode( ',', $selector_list ) as $selector ) {
				if ( ! preg_match( '/--card-(google-card|quote-minimal|boxed|bubble|wall-tile)\b/', $selector, $m ) ) {
					continue;
				}
				$found[ $m[1] ] = true;
				$this->assertSame( 2, $this->classCount( trim( $selector ) ), 'a look selector must have two classes: ' . trim( $selector ) );
			}
		}
		ksort( $found );
		$this->assertSame( array( 'boxed', 'bubble', 'google-card', 'quote-minimal', 'wall-tile' ), array_keys( $found ), 'all five looks exist in style.css' );
	}

	public function test_an_authors_value_beats_a_look_by_class_count(): void {
		$css = $this->render(
			array(
				'cardStyle'        => 'elevated',
				'cardBorderRadius' => $this->corners( '8px' ),
			)
		)['css'];
		$attr_rule = self::R . ' .sgs-google-reviews__review{border-radius:8px 8px 8px 8px;}';
		$this->assertStringContainsString( $attr_rule, $css );
		$attr_selector = self::R . ' .sgs-google-reviews__review';
		$look_selector = '.sgs-google-reviews--card-elevated .sgs-google-reviews__review';
		$this->assertSame( 3, $this->classCount( $attr_selector ) );
		$this->assertSame( 2, $this->classCount( $look_selector ) );
		$this->assertGreaterThan( $this->classCount( $look_selector ), $this->classCount( $attr_selector ), 'the attribute rule must out-rank the look' );
		$this->assertStringContainsString( $look_selector . ' {', (string) file_get_contents( self::BLOCK . '/style.css' ), 'the look rule the attribute out-ranks exists' );

		// NEGATIVE CONTROL: without the attribute there is no attribute rule, so only the look paints.
		$plain = $this->render( array( 'cardStyle' => 'elevated' ) )['css'];
		$this->assertStringNotContainsString( 'border-radius:8px', $plain );
	}

	public function test_the_root_rule_also_out_ranks_a_look_root_rule(): void {
		$this->assertSame( 3, $this->classCount( self::R . '.sgs-google-reviews' ) );
		$this->assertSame( 2, $this->classCount( '.sgs-google-reviews.sgs-google-reviews--card-google-card' ) );
		$css = $this->render(
			array(
				'cardStyle'    => 'google-card',
				'borderColour' => '#123456',
				'borderStyle'  => 'solid',
				'borderWidth'  => array(
					'top'    => '2px',
					'right'  => '2px',
					'bottom' => '2px',
					'left'   => '2px',
				),
			)
		)['css'];
		$this->assertStringContainsString( self::R . '.sgs-google-reviews{border-color:#123456;}', $css );
		$this->assertStringContainsString( self::R . '.sgs-google-reviews{border-style:solid;border-width:2px 2px 2px 2px;}', $css );
	}

	// ── The stylesheet no longer hardcodes what an attribute owns ──────────────────────────────────────────

	/**
	 * Bodies of every rule whose whole selector is exactly `$selector` (a `:where()`-wrapped selector is a
	 * different string and is the allowed zero-specificity default).
	 *
	 * @param string $css      Stylesheet with comments removed.
	 * @param string $selector Exact selector.
	 * @return array<int, string>
	 */
	private function bareRuleBodies( string $css, string $selector ): array {
		preg_match_all( '/([^{}]+)\{([^{}]*)\}/', $css, $rules, PREG_SET_ORDER );
		$bodies = array();
		foreach ( $rules as $rule ) {
			if ( trim( preg_replace( '/\s+/', ' ', $rule[1] ) ) === $selector ) {
				$bodies[] = $rule[2];
			}
		}
		return $bodies;
	}

	public function test_the_named_hardcodes_are_gone_from_the_stylesheet(): void {
		$css = (string) file_get_contents( self::BLOCK . '/style.css' );
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );

		$named = array(
			'.sgs-google-reviews__google-logo'                                    => array( 'width: 30px', 'opacity: 1' ),
			'.sgs-google-reviews__avatar'                                         => array( 'width: 40px', 'height: 40px', 'border-radius: 50%' ),
			'.sgs-google-reviews__avatar-initials'                                => array( 'border-radius: 50%', 'font-weight: 700' ),
			'.sgs-google-reviews__text'                                           => array( '-webkit-line-clamp: 8' ),
			'.sgs-google-reviews--slider .sgs-google-reviews__list'               => array( 'scrollbar-width' ),
			'.sgs-google-reviews--slider .sgs-google-reviews__list::-webkit-scrollbar' => array( 'display: none' ),
			'.sgs-google-reviews__arrow'                                          => array( 'width:', 'height:', 'border-radius: 50%' ),
			'.sgs-google-reviews__write-review'                                   => array( 'padding: 0 22px', 'font-weight: 500' ),
			'.sgs-google-reviews__review'                                         => array( 'padding: 20px', 'border-radius: 8px', 'gap: 12px' ),
		);
		foreach ( $named as $selector => $literals ) {
			foreach ( $this->bareRuleBodies( $css, $selector ) as $body ) {
				foreach ( $literals as $literal ) {
					$this->assertStringNotContainsString( $literal, $body, "{$selector} must not hardcode {$literal} outside :where()" );
				}
			}
		}
		// The replacement: each literal survives ONLY as a zero-specificity default.
		foreach ( array( '.sgs-google-reviews__google-logo', '.sgs-google-reviews__avatar', '.sgs-google-reviews__text', '.sgs-google-reviews__arrow' ) as $selector ) {
			$this->assertStringContainsString( ':where( ' . $selector . ' )', $css, "{$selector} keeps a :where() default" );
		}
		$this->assertStringContainsString( ':where( .sgs-google-reviews--slider .sgs-google-reviews__list )', $css );
	}
}

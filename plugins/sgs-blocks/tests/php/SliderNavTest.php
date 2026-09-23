<?php
/**
 * Tests: the shared slider navigation (includes/helpers-slider-nav.php + assets/css/slider-nav.css), as
 * sgs/google-reviews adopts it.
 *
 * 1. Every placement renders its own modifier class, in the DOM order that matches what is seen, and an
 *    unknown or missing placement falls back to below-end (NEGATIVE CONTROL per placement: the same value
 *    under a broken attribute name renders below-end, never that placement).
 * 2. The progress indicator: dots draw one button per review and wire the scroll sync; scrollbar and none
 *    draw no dots and no sync. Arrows switched off draw no buttons.
 * 3. The helper itself: only `data-wp-*` directive names pass, and every value is escaped.
 * 4. The stylesheet: every placement has a grid template; sides moves its arrows below at the 767px device
 *    tier; overlay-inset insets the rail with a MARGIN (a padding would let cards scroll under the arrows).
 *
 * Renders run the REAL render.php through the QA harness in a child process (see ReviewsAggregateTest).
 * The overlap itself is proven in a real browser (the block's local render proof), not here.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class SliderNavTest extends TestCase {

	private const PLUGIN = __DIR__ . '/../..';

	/** The placements, default first. */
	private const PLACEMENTS = array( 'below-end', 'below-center', 'below-split', 'sides', 'overlay-inset' );

	/**
	 * Render sgs/google-reviews (three written reviews) and return its HTML.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return string
	 */
	private function render( array $attrs ): string {
		$harness = self::PLUGIN . '/scripts/qa/lib/render-css-harness.php';
		$prepend = __DIR__ . '/stubs/google-reviews-render-prepend.php';
		$attrs   = array_merge(
			array(
				'dataSource' => 'inline',
				'reviews'    => array(
					array(
						'author' => 'Ann',
						'rating' => 5,
						'text'   => 'One.',
					),
					array(
						'author' => 'Bea',
						'rating' => 4,
						'text'   => 'Two.',
					),
					array(
						'author' => 'Cal',
						'rating' => 5,
						'text'   => 'Three.',
					),
				),
			),
			$attrs
		);
		$file    = tempnam( sys_get_temp_dir(), 'sgssn' );
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
		return (string) $decoded['html'];
	}

	/** Byte offset of a class token's first occurrence, or -1. */
	private function at( string $html, string $needle ): int {
		$pos = strpos( $html, $needle );
		return false === $pos ? -1 : $pos;
	}

	/** @return array<string, array{0: string}> */
	public static function placements(): array {
		$out = array();
		foreach ( self::PLACEMENTS as $placement ) {
			$out[ $placement ] = array( $placement );
		}
		return $out;
	}

	/**
	 * @dataProvider placements
	 *
	 * @param string $placement A placement.
	 */
	public function test_each_placement_renders_its_class_in_reading_order( string $placement ): void {
		$html = $this->render( array( 'navPosition' => $placement ) );
		$this->assertStringContainsString( 'sgs-slider-nav--' . $placement . ' ', $html );
		foreach ( array_diff( self::PLACEMENTS, array( $placement ) ) as $other ) {
			$this->assertStringNotContainsString( 'sgs-slider-nav--' . $other . ' ', $html, "only {$placement}" );
		}

		$prev = $this->at( $html, 'sgs-slider-nav__arrow--prev' );
		$rail = $this->at( $html, 'sgs-slider-nav__rail' );
		$next = $this->at( $html, 'sgs-slider-nav__arrow--next' );
		$this->assertGreaterThan( -1, $prev );
		$this->assertGreaterThan( -1, $rail );
		$this->assertLessThan( $next, $prev, 'previous before next' );
		if ( in_array( $placement, array( 'sides', 'overlay-inset' ), true ) ) {
			$this->assertLessThan( $rail, $prev, "{$placement}: the previous button comes before the rail" );
		} else {
			$this->assertLessThan( $prev, $rail, "{$placement}: the rail comes before the buttons under it" );
		}
	}

	/**
	 * NEGATIVE CONTROL: the same value under a broken attribute name (or the retired `overlay` value)
	 * renders the default below-end, never the placement, so the positive test depends on the mapping.
	 *
	 * @dataProvider placements
	 *
	 * @param string $placement A placement.
	 */
	public function test_negative_control_a_broken_name_or_retired_value_falls_back_to_below_end( string $placement ): void {
		$html = $this->render( array( 'xnavPosition' => $placement ) );
		$this->assertStringContainsString( 'sgs-slider-nav--below-end ', $html );
		if ( 'below-end' !== $placement ) {
			$this->assertStringNotContainsString( 'sgs-slider-nav--' . $placement . ' ', $html );
		}
		$retired = $this->render( array( 'navPosition' => 'overlay' ) );
		$this->assertStringContainsString( 'sgs-slider-nav--below-end ', $retired, 'the retired overlay value is not a placement' );
	}

	public function test_dots_draw_one_button_per_review_and_wire_the_scroll_sync(): void {
		$html = $this->render( array( 'pagination' => 'dots' ) );
		$this->assertStringContainsString( 'sgs-slider-nav--pagination-dots', $html );
		$this->assertSame( 3, substr_count( $html, 'sgs-slider-nav__dot' ) - substr_count( $html, 'sgs-slider-nav__dots' ) );
		$this->assertSame( 1, substr_count( $html, 'aria-current="true"' ), 'the first dot is current' );
		$this->assertStringContainsString( 'data-wp-on--scroll="actions.syncActiveDot"', $html );
		$this->assertStringContainsString( 'data-wp-on--click="actions.goToSlide"', $html );

		// NEGATIVE CONTROL: the scrollbar and none draw no dots and wire no sync.
		foreach ( array( 'scrollbar', 'none' ) as $pagination ) {
			$other = $this->render( array( 'pagination' => $pagination ) );
			$this->assertStringContainsString( 'sgs-slider-nav--pagination-' . $pagination, $other );
			$this->assertStringNotContainsString( '__dot', $other, "{$pagination}: no dots" );
			$this->assertStringNotContainsString( 'syncActiveDot', $other, "{$pagination}: no sync" );
		}
	}

	public function test_arrows_off_draws_no_buttons_and_on_draws_both_with_their_actions(): void {
		$on = $this->render( array() );
		$this->assertStringContainsString( 'data-wp-on--click="actions.prevSlide"', $on );
		$this->assertStringContainsString( 'data-wp-on--click="actions.nextSlide"', $on );
		$this->assertStringContainsString( 'aria-label="Previous review"', $on );
		// NEGATIVE CONTROL.
		$off = $this->render( array( 'showArrows' => false ) );
		$this->assertStringNotContainsString( '__arrow', $off );
		$this->assertStringContainsString( 'sgs-slider-nav--no-arrows', $off );
	}

	public function test_a_single_review_or_another_display_type_renders_no_navigation(): void {
		$one = $this->render(
			array(
				'reviews' => array(
					array(
						'author' => 'Solo',
						'rating' => 5,
						'text'   => 'Only.',
					),
				),
			)
		);
		$this->assertStringNotContainsString( 'sgs-slider-nav', $one );
		$grid = $this->render( array( 'variant' => 'grid' ) );
		$this->assertStringNotContainsString( 'sgs-slider-nav', $grid );
		$this->assertStringContainsString( 'Cal', $grid, 'the grid still renders the reviews' );
	}

	public function test_the_helper_passes_only_data_wp_directives_and_escapes_every_value(): void {
		$script = tempnam( sys_get_temp_dir(), 'sgssnh' ) . '.php';
		file_put_contents(
			$script,
			'<?php define( "ABSPATH", ' . var_export( self::PLUGIN . '/', true ) . ' ); define( "SGS_BLOCKS_PATH", ABSPATH );'
			. ' require ' . var_export( self::PLUGIN . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( self::PLUGIN . '/includes/helpers-slider-nav.php', true ) . ';'
			. ' echo sgs_slider_nav_render( array( "block" => "sgs-x", "placement" => "sides", "pagination" => "dots", "show_arrows" => true, "count" => 2,'
			. ' "rail_html" => "<div class=\"sgs-slider-nav__rail\"></div>",'
			. ' "labels" => array( "prev" => "P\"><script>x</script>", "next" => "N", "dots" => "D", "dot" => "Dot %d" ),'
			. ' "prev_directives" => array( "data-wp-on--click" => "a\"b", "onclick" => "evil()", "data-wp-bad name" => "z" ) ) );'
		);
		$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		unlink( $script );
		$this->assertStringContainsString( 'sgs-slider-nav--sides', $out );
		$this->assertStringContainsString( 'data-wp-on--click="a&quot;b"', $out, 'the directive value is escaped' );
		$this->assertStringNotContainsString( 'onclick', $out, 'a non data-wp attribute never passes' );
		$this->assertStringNotContainsString( 'bad name', $out );
		$this->assertStringNotContainsString( '<script>', $out, 'the label is escaped' );
		$this->assertSame( 2, substr_count( $out, 'role="tab"' ) );
		$this->assertStringContainsString( 'aria-label="Dot 2"', $out );
	}

	/**
	 * Rule bodies of the stylesheet keyed by selector, with the @media block they sit in ('' for none).
	 *
	 * @return array<int, array{media: string, selector: string, body: string}>
	 */
	private function rules(): array {
		$css = (string) file_get_contents( self::PLUGIN . '/assets/css/slider-nav.css' );
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
		$out = array();
		// Top-level rules and one level of @media nesting.
		$len   = strlen( $css );
		$depth = 0;
		$media = '';
		$buf   = '';
		for ( $i = 0; $i < $len; $i++ ) {
			$ch = $css[ $i ];
			if ( '{' === $ch ) {
				$head = trim( $buf );
				$buf  = '';
				if ( 0 === $depth && str_starts_with( $head, '@media' ) ) {
					$media = $head;
					$depth = 1;
					continue;
				}
				$end   = strpos( $css, '}', $i );
				$out[] = array(
					'media'    => $media,
					'selector' => preg_replace( '/\s+/', ' ', $head ),
					'body'     => substr( $css, $i + 1, $end - $i - 1 ),
				);
				$i     = $end;
				continue;
			}
			if ( '}' === $ch && 1 === $depth ) {
				$depth = 0;
				$media = '';
				$buf   = '';
				continue;
			}
			$buf .= $ch;
		}
		return $out;
	}

	/** Bodies of rules whose selector list contains `$needle`, optionally inside a matching @media. */
	private function bodies( string $needle, ?string $media = null ): string {
		$found = '';
		foreach ( $this->rules() as $rule ) {
			if ( str_contains( $rule['selector'], $needle ) && ( null === $media ? '' === $rule['media'] : str_contains( $rule['media'], $media ) ) ) {
				$found .= $rule['body'];
			}
		}
		return $found;
	}

	/**
	 * @dataProvider placements
	 *
	 * @param string $placement A placement.
	 */
	public function test_every_placement_has_a_grid_template_in_the_stylesheet( string $placement ): void {
		$selector = 'below-end' === $placement ? '.sgs-slider-nav' : '.sgs-slider-nav--' . $placement;
		$body     = '';
		foreach ( $this->rules() as $rule ) {
			if ( '' === $rule['media'] && $rule['selector'] === $selector ) {
				$body .= $rule['body'];
			}
		}
		$this->assertStringContainsString( 'grid-template-areas', $body, "{$placement} lays out its own areas" );
		$this->assertStringContainsString( 'rail', $body );
	}

	public function test_negative_control_an_unknown_placement_has_no_rules(): void {
		$this->assertSame( '', $this->bodies( '.sgs-slider-nav--overlay ' ), 'the retired overlay placement is gone' );
		$this->assertSame( '', $this->bodies( '.sgs-slider-nav--nowhere' ) );
	}

	public function test_sides_moves_the_arrows_below_at_the_mobile_tier_only(): void {
		$side = '';
		foreach ( $this->rules() as $rule ) {
			if ( '' === $rule['media'] && '.sgs-slider-nav--sides' === $rule['selector'] ) {
				$side .= $rule['body'];
			}
		}
		$this->assertStringContainsString( '"prev rail next"', $side );
		$mobile = $this->bodies( '.sgs-slider-nav--sides', 'max-width: 767px' );
		$this->assertStringContainsString( '"lead prev next"', $mobile, 'under 768px the arrows sit under the rail' );
		$this->assertStringNotContainsString( '"prev rail next"', $mobile );
	}

	public function test_overlay_inset_insets_the_rail_with_a_margin_and_puts_the_arrows_in_its_cell(): void {
		$rail = $this->bodies( '.sgs-slider-nav--overlay-inset .sgs-slider-nav__rail' );
		$this->assertStringContainsString( 'margin-inline: calc( var( --sgs-slider-nav-arrow-size, 40px ) + var( --sgs-slider-nav-gap, 8px ) )', $rail );
		$this->assertStringNotContainsString( 'padding', $rail, 'a padding would let cards scroll under the arrows' );
		$this->assertStringContainsString( 'grid-area: rail', $this->bodies( '.sgs-slider-nav--overlay-inset .sgs-slider-nav__arrow' ) );
	}

	public function test_the_arrows_are_never_hidden_at_any_width(): void {
		foreach ( $this->rules() as $rule ) {
			if ( str_contains( $rule['selector'], 'arrow' ) ) {
				$this->assertStringNotContainsString( 'display: none', $rule['body'], $rule['selector'] . ' ' . $rule['media'] );
			}
		}
		$block = (string) file_get_contents( self::PLUGIN . '/src/blocks/google-reviews/style.css' );
		$this->assertSame( 0, preg_match( '/__arrow[^{]*\{[^}]*display:\s*none/', $block ), 'the block no longer hides its arrows on a phone' );
	}
}

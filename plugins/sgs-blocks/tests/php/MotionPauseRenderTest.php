<?php
/**
 * Tests: every auto-moving block prints the shared pause / play button (WCAG 2.2.2) when its motion
 * is on AND its pause-button option is on, and prints none by default (the option is off by default
 * on every block) or when the motion is off.
 *
 * Renders run the REAL render.php through the QA harness in a child process. The harness applies
 * no block.json defaults, so an absent attribute here is exactly an existing block saved before
 * the option existed: it must not gain the button.
 *
 * Negative control: set SGS_TEST_RENDER_FILE to the absolute path of another render.php (for
 * example a copy of the pre-change file saved beside the real one, so its relative requires
 * resolve) and run one test with --filter; the "printed by default" assertion must then fail.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class MotionPauseRenderTest extends TestCase {

	/**
	 * Render a block and return its HTML.
	 *
	 * @param string                           $slug  Block slug.
	 * @param array<string, mixed>             $attrs Block attributes.
	 * @param array<int, array<string, mixed>> $inner Inner blocks: {name, attributes, html}.
	 * @param string                           $prepend Optional auto_prepend_file (test stubs).
	 * @return string
	 */
	private function html( string $slug, array $attrs, array $inner = array(), string $prepend = '' ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsmp' );
		$inner_f = tempnam( sys_get_temp_dir(), 'sgsmi' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		file_put_contents( $inner_f, json_encode( $inner, JSON_THROW_ON_ERROR ) );
		$override = (string) getenv( 'SGS_TEST_RENDER_FILE' );

		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ( '' !== $prepend ? ' -d auto_prepend_file=' . escapeshellarg( $prepend ) : '' )
				. ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( $slug )
				. ( '' !== $override ? ' --render-file ' . escapeshellarg( $override ) : '' )
				. ' --attrs-file ' . escapeshellarg( $file )
				. ' --inner-blocks-file ' . escapeshellarg( $inner_f ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			@unlink( $inner_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	/**
	 * The one pause button in the markup, or '' when there is none.
	 *
	 * @param string $html Rendered HTML.
	 * @return string
	 */
	private function pause_button( string $html ): string {
		$this->assertLessThanOrEqual( 1, substr_count( $html, 'data-sgs-motion-pause' ), 'one pause control per block' );
		return preg_match( '#<button[^>]*data-sgs-motion-pause[^>]*>#', $html, $m ) ? $m[0] : '';
	}

	/**
	 * Assert the shared button is printed with the block's class and accessible name.
	 *
	 * @param string $html  Rendered HTML.
	 * @param string $block BEM root.
	 * @param string $label Expected accessible name.
	 */
	private function assert_button( string $html, string $block, string $label ): void {
		$button = $this->pause_button( $html );
		$this->assertNotSame( '', $button, 'the shared pause button is printed' );
		$this->assertStringContainsString( 'sgs-motion-pause', $button );
		$this->assertStringContainsString( $block . '__pause', $button );
		$this->assertStringContainsString( 'aria-label="' . $label . '"', $button );
		$this->assertStringContainsString( 'aria-pressed="false"', $button );
		$this->assertMatchesRegularExpression( '#\shidden>$#', $button, 'hidden until the motion runs' );
	}

	/** @return array<int, array<string, string>> */
	private function trust_items(): array {
		return array(
			array(
				'icon'  => 'truck',
				'label' => 'Fast delivery',
			),
			array(
				'icon'  => 'check',
				'label' => 'Certified quality',
			),
		);
	}

	/** @return array<int, array<string, mixed>> */
	private function brand_logos(): array {
		return array(
			array(
				'media' => 'https://example.test/one.png',
				'alt'   => 'One',
			),
			array(
				'media' => 'https://example.test/two.png',
				'alt'   => 'Two',
			),
		);
	}

	public function test_brand_strip_prints_no_button_when_static(): void {
		$this->assertSame( '', $this->pause_button( $this->html( 'sgs/brand-strip', array( 'logos' => $this->brand_logos() ) ) ) );
	}

	/**
	 * Testimonial children for the slider.
	 *
	 * @param int $count How many.
	 * @return array<int, array<string, mixed>>
	 */
	private function testimonials( int $count ): array {
		$out = array();
		for ( $i = 1; $i <= $count; $i++ ) {
			$out[] = array(
				'name'       => 'sgs/testimonial',
				'attributes' => array( 'name' => 'Person ' . $i ),
				'html'       => '<div class="sgs-testimonial">Quote ' . $i . '</div>',
			);
		}
		return $out;
	}

	public function test_testimonial_slider_prints_the_button_when_its_option_is_on(): void {
		$html = $this->html(
			'sgs/testimonial-slider',
			array(
				'autoplay'    => true,
				'pauseButton' => true,
			),
			$this->testimonials( 3 )
		);
		$this->assert_button( $html, 'sgs-testimonial-slider', 'Pause testimonials' );
		$this->assertMatchesRegularExpression( '#sgs-testimonial-slider__controls">.*data-sgs-motion-pause#s', $html, 'in the controls bar' );
	}

	public function test_testimonial_slider_prints_no_button_without_autoplay_or_with_one_slide(): void {
		$this->assertSame( '', $this->pause_button( $this->html( 'sgs/testimonial-slider', array( 'autoplay' => false ), $this->testimonials( 3 ) ) ) );
		$this->assertSame(
			'',
			$this->pause_button(
				$this->html(
					'sgs/testimonial-slider',
					array(
						'autoplay'    => true,
						'pauseButton' => true,
					),
					$this->testimonials( 1 )
				)
			)
		);
	}

	/** @return array<int, array<string, string>> */
	private function gallery_items(): array {
		return array(
			array(
				'url' => 'https://example.test/a.jpg',
				'alt' => 'A',
			),
			array(
				'url' => 'https://example.test/b.jpg',
				'alt' => 'B',
			),
		);
	}

	public function test_gallery_carousel_prints_the_button_when_its_option_is_on(): void {
		$html = $this->html(
			'sgs/gallery',
			array(
				'layout'              => 'carousel',
				'carouselAutoplay'    => true,
				'carouselPauseButton' => true,
				'mediaItems'          => $this->gallery_items(),
			)
		);
		$this->assert_button( $html, 'sgs-gallery', 'Pause slideshow' );
	}

	public function test_gallery_prints_no_button_without_autoplay_or_outside_the_carousel(): void {
		$items = $this->gallery_items();
		$this->assertSame( '', $this->pause_button( $this->html( 'sgs/gallery', array( 'layout' => 'carousel', 'mediaItems' => $items ) ) ) );
		$this->assertSame(
			'',
			$this->pause_button(
				$this->html(
					'sgs/gallery',
					array(
						'layout'              => 'grid',
						'carouselAutoplay'    => true,
						'carouselPauseButton' => true,
						'mediaItems'          => $items,
					)
				)
			)
		);
	}

	public function test_post_grid_carousel_prints_the_button_when_its_option_is_on(): void {
		$html = $this->html(
			'sgs/post-grid',
			array(
				'layout'              => 'carousel',
				'carouselAutoplay'    => true,
				'carouselPauseButton' => true,
			)
		);
		$this->assert_button( $html, 'sgs-post-grid', 'Pause carousel' );
	}

	public function test_post_grid_prints_no_button_without_autoplay_or_outside_the_carousel(): void {
		$this->assertSame( '', $this->pause_button( $this->html( 'sgs/post-grid', array( 'layout' => 'carousel' ) ) ) );
		$this->assertSame(
			'',
			$this->pause_button(
				$this->html(
					'sgs/post-grid',
					array(
						'layout'              => 'grid',
						'carouselAutoplay'    => true,
						'carouselPauseButton' => true,
					)
				)
			)
		);
	}

	public function test_trustpilot_carousel_prints_the_button_when_its_option_is_on(): void {
		$html = $this->html(
			'sgs/trustpilot-reviews',
			array(
				'variant'     => 'carousel',
				'autoplay'    => true,
				'pauseButton' => true,
				'dataSource'  => 'placeholder',
			)
		);
		$this->assert_button( $html, 'sgs-trustpilot-reviews', 'Pause reviews' );
	}

	public function test_trustpilot_prints_no_button_without_autoplay_or_outside_a_carousel(): void {
		$this->assertSame(
			'',
			$this->pause_button(
				$this->html(
					'sgs/trustpilot-reviews',
					array(
						'variant'    => 'carousel',
						'dataSource' => 'placeholder',
					)
				)
			)
		);
		$this->assertSame(
			'',
			$this->pause_button(
				$this->html(
					'sgs/trustpilot-reviews',
					array(
						'variant'     => 'grid',
						'autoplay'    => true,
						'pauseButton' => true,
						'dataSource'  => 'placeholder',
					)
				)
			)
		);
	}

	/**
	 * Render sgs/google-reviews with three written reviews (stubs: tests/php/stubs/google-reviews-render-prepend.php).
	 *
	 * @param array<string, mixed> $attrs Extra attributes.
	 * @return string
	 */
	private function google_reviews( array $attrs ): string {
		$reviews = array();
		foreach ( array( 'Ann', 'Bea', 'Cal' ) as $author ) {
			$reviews[] = array(
				'author' => $author,
				'rating' => 5,
				'text'   => 'Good.',
			);
		}
		$base = array(
			'dataSource' => 'inline',
			'reviews'    => $reviews,
			'variant'    => 'slider',
		);
		putenv( 'SGS_GR_TEST_MODE=live' );
		try {
			return $this->html( 'sgs/google-reviews', array_merge( $base, $attrs ), array(), __DIR__ . '/stubs/google-reviews-render-prepend.php' );
		} finally {
			putenv( 'SGS_GR_TEST_MODE' );
		}
	}

	public function test_google_reviews_slider_prints_the_button_when_its_option_is_on(): void {
		$html = $this->google_reviews(
			array(
				'autoplay'    => true,
				'pauseButton' => true,
			)
		);
		$this->assert_button( $html, 'sgs-google-reviews', 'Pause reviews' );
		$this->assertMatchesRegularExpression( '#class="sgs-google-reviews__lead sgs-slider-nav__lead"><button[^>]*data-sgs-motion-pause#', $html, 'in the navigation\'s leading slot' );
	}

	public function test_google_reviews_prints_no_button_without_autoplay_or_outside_the_slider(): void {
		$this->assertSame( '', $this->pause_button( $this->google_reviews( array() ) ) );
		$this->assertSame(
			'',
			$this->pause_button(
				$this->google_reviews(
					array(
						'autoplay'    => true,
						'pauseButton' => true,
						'variant'     => 'grid',
					)
				)
			)
		);
	}

	/**
	 * Motion on, the option untouched: a block saved before the option existed gains no button.
	 * The pause option is off by default on every block.
	 */
	public function test_no_block_prints_the_button_by_default_when_its_motion_is_on(): void {
		$cases = array(
			'trust-bar'          => $this->html( 'sgs/trust-bar', array_merge( $this->marquee_layer(), array( 'items' => $this->trust_items() ) ) ),
			'brand-strip'        => $this->html( 'sgs/brand-strip', array_merge( $this->marquee_layer(), array( 'logos' => $this->brand_logos() ) ) ),
			'testimonial-slider' => $this->html( 'sgs/testimonial-slider', array( 'autoplay' => true ), $this->testimonials( 3 ) ),
			'gallery'            => $this->html( 'sgs/gallery', array( 'layout' => 'carousel', 'carouselAutoplay' => true, 'mediaItems' => $this->gallery_items() ) ),
			'post-grid'          => $this->html( 'sgs/post-grid', array( 'layout' => 'carousel', 'carouselAutoplay' => true ) ),
			'trustpilot-reviews' => $this->html( 'sgs/trustpilot-reviews', array( 'variant' => 'carousel', 'autoplay' => true, 'dataSource' => 'placeholder' ) ),
			'google-reviews'     => $this->google_reviews( array( 'autoplay' => true ) ),
		);
		foreach ( $cases as $block => $html ) {
			$this->assertSame( '', $this->pause_button( $html ), $block );
		}
	}

	/**
	 * A root marquee effect layer with no pause control: the runtime, not the server, prints a marquee's pause button.
	 *
	 * @return array<string, mixed>
	 */
	private function marquee_layer(): array {
		return array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'effects' => array( array( 'id' => 'marquee', 'effect' => 'marquee', 'values' => array() ) ) ) ) ) );
	}

	public function test_trust_bar_prints_no_button_when_nothing_scrolls_or_the_layer_has_no_pause_control(): void {
		$this->assertSame( '', $this->pause_button( $this->html( 'sgs/trust-bar', array( 'items' => $this->trust_items() ) ) ) );
		$this->assertSame(
			'',
			$this->pause_button(
				$this->html(
					'sgs/trust-bar',
					array_merge( $this->marquee_layer(), array( 'items' => $this->trust_items() ) )
				)
			)
		);
	}
}

<?php
/**
 * Pins what sgs/testimonial-slider, sgs/container and sgs/gallery render for their carousel arrows, dots and pause button
 * while none of the look settings for those parts is set.
 *
 * Each case renders the real render.php in a child process (scripts/qa/lib/render-css-harness.php) with every control on
 * and compares the HTML and the scoped CSS with the stored copy in tests/fixtures/carousel-controls-pin/. The look settings
 * the button kit (`arrow`, `pause`) and the carousel dots kit (`dot`) add are all optional, so unset they must leave these
 * strings byte for byte the same: that is the proof the blocks moved onto the kits without changing any site's look.
 * To re-record after a deliberate render change: SGS_PIN_WRITE=1 php vendor/phpunit/phpunit/phpunit --filter CarouselControlsRenderPinTest
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CarouselControlsRenderPinTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CarouselControlsRenderPinTest extends TestCase {

	private const DIR = __DIR__ . '/../fixtures/carousel-controls-pin/';

	/**
	 * One case per block: the slug, its attributes (every carousel control on), the rendered inner content and any inner blocks.
	 *
	 * @return array<string, array{0: string, 1: array<string, mixed>, 2: string, 3: array<int, array<string, mixed>>}>
	 */
	public static function cases(): array {
		$image = static fn ( string $name ): array => array(
			'source' => array( 'desktop' => array( 'kind' => 'image', 'url' => 'https://example.test/' . $name . '.jpg', 'width' => 800, 'height' => 600 ) ),
			'alt'    => $name,
		);
		return array(
			'testimonial-slider'             => array(
				'sgs/testimonial-slider',
				array( 'showArrows' => true, 'showDots' => true, 'autoplay' => true, 'pauseButton' => true ),
				'',
				array(
					array( 'name' => 'sgs/testimonial', 'attributes' => array(), 'html' => '<div>One</div>' ),
					array( 'name' => 'sgs/testimonial', 'attributes' => array(), 'html' => '<div>Two</div>' ),
					array( 'name' => 'sgs/testimonial', 'attributes' => array(), 'html' => '<div>Three</div>' ),
				),
			),
			'container-scroll-row'           => array(
				'sgs/container',
				array( 'scrollSideways' => array( 'mobile' => 'on', 'tablet' => 'on' ), 'scrollArrows' => true, 'scrollDots' => true, 'scrollDrag' => true ),
				'<p>A</p><p>B</p>',
				array(),
			),
			'gallery-carousel'               => array(
				'sgs/gallery',
				array(
					'layout'              => array( 'desktop' => 'carousel', 'tablet' => 'carousel', 'mobile' => 'carousel' ),
					'carouselShowArrows'  => true,
					'carouselShowDots'    => true,
					'carouselAutoplay'    => true,
					'carouselPauseButton' => true,
					'mediaItems'          => array( $image( 'a' ), $image( 'b' ), $image( 'c' ) ),
				),
				'',
				array(),
			),
		);
	}

	/**
	 * Render a block through the QA harness.
	 *
	 * @param string                           $slug    Block name.
	 * @param array<string, mixed>             $attrs   Attributes.
	 * @param string                           $content Rendered inner content.
	 * @param array<int, array<string, mixed>> $inner   Inner blocks the render iterates.
	 * @return array{html: string, css: string}
	 */
	private function render( string $slug, array $attrs, string $content, array $inner ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$attrs_f = (string) tempnam( sys_get_temp_dir(), 'sgsat' );
		$inner_f = (string) tempnam( sys_get_temp_dir(), 'sgsin' );
		file_put_contents( $attrs_f, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		file_put_contents( $inner_f, json_encode( $inner, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( $slug )
				. ' --attrs-file ' . escapeshellarg( $attrs_f )
				. ( array() !== $inner ? ' --inner-blocks-file ' . escapeshellarg( $inner_f ) : '' )
				. ( '' !== $content ? ' --content ' . escapeshellarg( $content ) : '' ) . ' 2>&1'
			);
		} finally {
			@unlink( $attrs_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			@unlink( $inner_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) $decoded['css'],
		);
	}

	/**
	 * @param string                           $slug    Block name.
	 * @param array<string, mixed>             $attrs   Attributes.
	 * @param string                           $content Rendered inner content.
	 * @param array<int, array<string, mixed>> $inner   Inner blocks.
	 */
	#[DataProvider( 'cases' )]
	public function test_unset_look_settings_render_exactly_what_the_block_rendered_before( string $slug, array $attrs, string $content, array $inner ): void {
		$name = str_replace( 'sgs/', '', $slug );
		$name = 'container' === $name ? 'container-scroll-row' : ( 'gallery' === $name ? 'gallery-carousel' : $name );
		$file = self::DIR . $name . '.json';
		$now  = $this->render( $slug, $attrs, $content, $inner );

		if ( '1' === getenv( 'SGS_PIN_WRITE' ) ) {
			if ( ! is_dir( self::DIR ) ) {
				mkdir( self::DIR, 0777, true );
			}
			file_put_contents( $file, json_encode( $now, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
		}

		$this->assertFileExists( $file, 'no recorded render: run with SGS_PIN_WRITE=1 once, on the code before the change' );
		$pinned = json_decode( (string) file_get_contents( $file ), true );
		$this->assertSame( $pinned['html'], $now['html'], $name . ' HTML changed' );
		$this->assertSame( $pinned['css'], $now['css'], $name . ' scoped CSS changed' );
		// The pin must hold the controls it guards: arrows, dots and a pause button where the block draws one.
		$this->assertStringContainsString( '<button', $now['html'] );
		$this->assertStringContainsString( 'dot', $now['html'] );
	}

	/** Negative control: a render that differs is not equal to the pin, so the comparison can fail. */
	public function test_the_pin_can_fail(): void {
		$file   = self::DIR . 'testimonial-slider.json';
		$pinned = json_decode( (string) file_get_contents( $file ), true );
		$this->assertNotSame( $pinned['html'], str_replace( 'sgs-testimonial-slider__arrow', 'sgs-testimonial-slider__arrowX', $pinned['html'] ) );
	}

	/**
	 * Per block: the look settings to set, and the rules the scoped CSS must then hold.
	 *
	 * @return array<string, array{0: string, 1: array<string, mixed>, 2: array<int, string>}>
	 */
	public static function set_looks(): array {
		$look = array(
			'arrowColourBackground' => '#112233',
			'arrowColourText'       => '#ffffff',
			'arrowSize'             => array( 'desktop' => 36, 'mobile' => 28 ),
			'arrowBorderRadius'     => array( 'desktop' => array( 'topLeft' => '4px', 'topRight' => '4px', 'bottomRight' => '4px', 'bottomLeft' => '4px' ) ),
			'dotSize'               => array( 'desktop' => 8 ),
			'dotGap'                => array( 'desktop' => 12 ),
			'dotColour'             => '#cccccc',
			'dotColourActive'       => '#112233',
			'dotActiveWidth'        => array( 'desktop' => 24 ),
		);
		return array(
			'testimonial-slider' => array(
				'testimonial-slider',
				$look,
				array(
					'.wp-block-sgs-testimonial-slider .sgs-testimonial-slider__arrow, ',
					'.sgs-testimonial-slider__pause{background-color:#112233;',
					'.sgs-testimonial-slider__arrow, ', // the arrows and the pause button are one comma list.
					'width:36px;height:36px;',
					'border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-left-radius:4px;border-bottom-right-radius:4px;', // the per-device corners the panel writes, printed by the kit's radius rule.
					'--sgs-carousel-arrow-size:36px;',
					'.sgs-testimonial-slider__dot:not(.sgs-testimonial-slider__dot--active)::before{background-color:#cccccc;}',
					'.sgs-testimonial-slider__dot--active::before{background-color:#112233;}',
					'.sgs-testimonial-slider__dots{gap:12px;}',
					'.sgs-testimonial-slider__dot::before{width:8px;height:8px;',
					'.sgs-testimonial-slider__dot--active::before{width:24px;min-width:24px;}',
				),
			),
			'container-scroll-row' => array(
				'container-scroll-row',
				$look,
				array(
					'.sgs-container__arrow{background-color:#112233;',
					'.sgs-container__arrow{width:36px;height:36px;}',
					'border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-left-radius:4px;border-bottom-right-radius:4px;',
					'.sgs-container__dot:not(.sgs-container__dot--active)::before{background-color:#cccccc;}',
					'.sgs-container__dots{gap:12px;}',
					'.sgs-container__dot--active::before{width:24px;min-width:24px;}',
				),
			),
			'gallery-carousel' => array(
				'gallery-carousel',
				$look,
				array(
					'.sgs-gallery__carousel-prev, ',
					'.sgs-gallery__pause{background-color:#112233;',
					'width:36px;height:36px;',
					'border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-left-radius:4px;border-bottom-right-radius:4px;',
					'.sgs-gallery__dot:not(.sgs-gallery__dot--active){background-color:#cccccc;}',
					'.sgs-gallery__dot--active{background-color:#112233;}',
					'.sgs-gallery__carousel-dots{gap:12px;}',
					'.sgs-gallery__dot--active{width:24px;min-width:24px;}',
				),
			),
		);
	}

	/**
	 * @param string                $name     Pin case name.
	 * @param array<string, mixed>  $look     Look settings to add.
	 * @param array<int, string>    $expected Strings the scoped CSS must contain.
	 */
	#[DataProvider( 'set_looks' )]
	public function test_set_look_settings_print_scoped_rules_and_never_an_inline_style( string $name, array $look, array $expected ): void {
		$case = self::cases()[ $name ];
		$now  = $this->render( $case[0], array_merge( $case[1], $look ), $case[2], $case[3] );
		foreach ( $expected as $snippet ) {
			$this->assertStringContainsString( $snippet, $now['css'], $name . ' scoped CSS lacks ' . $snippet );
		}
		$this->assertStringNotContainsString( 'style="', $now['html'], $name . ' prints no inline style attribute' );
		$pinned = json_decode( (string) file_get_contents( self::DIR . $name . '.json' ), true );
		$this->assertNotSame( $pinned['css'], $now['css'], 'a set look changes the CSS: the pin guards the unset case only' );
	}
}

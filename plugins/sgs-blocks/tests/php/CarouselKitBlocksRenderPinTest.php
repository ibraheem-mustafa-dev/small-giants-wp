<?php
/**
 * Pins what sgs/trustpilot-reviews, sgs/post-grid and sgs/google-reviews render for their carousel arrows, dots and pause
 * button, and proves the kit settings those blocks gained print their rules.
 *
 * Part 1 (the pin): each case renders the real render.php in a child process (scripts/qa/lib/render-css-harness.php) with every
 * carousel control on and no arrow or dot look setting, and compares the HTML and the scoped CSS with the copy recorded on the
 * code before the blocks moved onto the shared package (tests/fixtures/carousel-kit-blocks-pin/). The look settings the button kit
 * and the dots kit add are optional, so unset they must leave these strings byte for byte the same.
 * To re-record after a deliberate render change: SGS_PIN_WRITE=1 php vendor/phpunit/phpunit/phpunit --filter CarouselKitBlocksRenderPinTest
 *
 * Part 2 (the kits print): the same blocks with a look setting set print the shared emitter's rules on the block's own classes.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CarouselKitBlocksRenderPinTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CarouselKitBlocksRenderPinTest extends TestCase {

	private const DIR = __DIR__ . '/../fixtures/carousel-kit-blocks-pin/';

	/**
	 * @return array<string, array{0: string, 1: array<string, mixed>}>
	 */
	public static function cases(): array {
		$reviews = array(
			array( 'author' => 'A', 'rating' => 5, 'title' => 'T', 'body' => 'Body one', 'text' => 'Body one', 'date' => '2026-01-01' ),
			array( 'author' => 'B', 'rating' => 4, 'title' => 'T2', 'body' => 'Body two', 'text' => 'Body two', 'date' => '2026-01-02' ),
			array( 'author' => 'C', 'rating' => 5, 'title' => 'T3', 'body' => 'Body three', 'text' => 'Body three', 'date' => '2026-01-03' ),
		);
		return array(
			'trustpilot-reviews' => array(
				'sgs/trustpilot-reviews',
				array(
					'variant'      => 'carousel',
					'dataSource'   => 'inline',
					'showArrows'   => true,
					'showDots'     => true,
					'autoplay'     => true,
					'pauseButton'  => true,
					'loopCarousel' => true,
					'reviews'      => $reviews,
				),
			),
			'post-grid'          => array(
				'sgs/post-grid',
				array(
					'layout'             => 'carousel',
					'carouselShowArrows' => true,
					'carouselShowDots'   => true,
					'carouselAutoplay'   => true,
					'carouselPauseButton' => true,
					'loopCarousel'       => true,
				),
			),
			'google-reviews'     => array(
				'sgs/google-reviews',
				array(
					'variant'            => 'slider',
					'dataSource'         => 'inline',
					'pagination'         => 'dots',
					'showArrows'         => true,
					'autoplay'           => true,
					'pauseButton'        => true,
					'arrowColourBackground' => 'primary',
					'arrowColourText'    => '#ffffff',
					'reviews'            => $reviews,
				),
			),
		);
	}

	/**
	 * Render a block through the QA harness.
	 *
	 * @param string               $slug  Block name.
	 * @param array<string, mixed> $attrs Attributes.
	 * @return array{html: string, css: string}
	 */
	private function render( string $slug, array $attrs ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$attrs_f = (string) tempnam( sys_get_temp_dir(), 'sgsck' );
		file_put_contents( $attrs_f, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( $slug )
				. ' --attrs-file ' . escapeshellarg( $attrs_f )
				. ( 'sgs/post-grid' === $slug ? ' --motion-targets' : '' ) . ' 2>&1'
			);
		} finally {
			@unlink( $attrs_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
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
	 * @param string               $slug  Block name.
	 * @param array<string, mixed> $attrs Attributes.
	 */
	#[DataProvider( 'cases' )]
	public function test_unset_look_settings_render_exactly_what_the_block_rendered_before( string $slug, array $attrs ): void {
		$name = str_replace( 'sgs/', '', $slug );
		$file = self::DIR . $name . '.json';
		$now  = $this->render( $slug, $attrs );

		if ( '1' === getenv( 'SGS_PIN_WRITE' ) ) {
			if ( ! is_dir( self::DIR ) ) {
				mkdir( self::DIR, 0777, true );
			}
			// The scope class carries a per-render hash: the pin keeps its shape, not the hash.
			file_put_contents( $file, json_encode( $this->normalise( $now ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
		}

		$this->assertFileExists( $file, 'no recorded render: run with SGS_PIN_WRITE=1 once, on the code before the change' );
		$pinned = json_decode( (string) file_get_contents( $file ), true );
		$now    = $this->normalise( $now );
		$this->assertSame( $pinned['html'], $now['html'], $name . ' HTML changed' );
		$this->assertSame( $pinned['css'], $now['css'], $name . ' scoped CSS changed' );
		$this->assertStringContainsString( '<button', $now['html'], 'the pin must hold the arrows and dots it guards' );
		$this->assertStringContainsString( 'dot', $now['html'] );
	}

	/**
	 * The per-render scope hash (`sgs-<block>-xxxxxxxx`) replaced by a fixed token, so a render compares with a recording.
	 *
	 * @param array{html: string, css: string} $out Rendered output.
	 * @return array{html: string, css: string}
	 */
	private function normalise( array $out ): array {
		$strip = static fn ( string $text ): string => (string) preg_replace( '/\b(sgs-[a-z-]+)-[0-9a-f]{8}\b/', '$1-HASH', $text );
		return array(
			'html' => $strip( $out['html'] ),
			'css'  => $strip( $out['css'] ),
		);
	}

	/** Negative control: a render that differs is not equal to the pin, so the comparison can fail. */
	public function test_the_pin_can_fail(): void {
		$file   = self::DIR . 'trustpilot-reviews.json';
		$pinned = json_decode( (string) file_get_contents( $file ), true );
		$this->assertNotSame( $pinned['html'], str_replace( 'sgs-trustpilot-reviews__arrow', 'sgs-trustpilot-reviews__arrowX', $pinned['html'] ) );
	}

	/** The kit settings the two blocks gained print on the block's own arrow, pause and dot classes. */
	public function test_trustpilot_arrow_and_dot_settings_print_on_its_own_classes(): void {
		[ , $attrs ] = self::cases()['trustpilot-reviews'];
		$css         = $this->render(
			'sgs/trustpilot-reviews',
			$attrs + array(
				'arrowColourBackground' => '#112233',
				'dotColourActive'       => '#445566',
				'dotSize'               => array( 'desktop' => '14px' ),
			)
		)['css'];
		$this->assertStringContainsString( '.sgs-trustpilot-reviews__arrow', $css );
		$this->assertStringContainsString( '#112233', $css );
		$this->assertStringContainsString( '.sgs-trustpilot-reviews__dot.is-active', $css );
		$this->assertStringContainsString( '#445566', $css );
		$this->assertStringContainsString( 'width:14px', $css );
	}

	public function test_post_grid_arrow_and_dot_settings_print_on_its_own_classes(): void {
		[ , $attrs ] = self::cases()['post-grid'];
		$css         = $this->render(
			'sgs/post-grid',
			$attrs + array(
				'arrowColourBackground' => '#112233',
				'dotColourActive'       => '#445566',
				'dotGap'                => array( 'desktop' => '9px' ),
			)
		)['css'];
		$this->assertStringContainsString( '.sgs-post-grid__carousel-prev', $css );
		$this->assertStringContainsString( '#112233', $css );
		$this->assertStringContainsString( '.sgs-post-grid__dot--active', $css );
		$this->assertStringContainsString( '#445566', $css );
		$this->assertStringContainsString( 'gap:9px', $css );
	}
}

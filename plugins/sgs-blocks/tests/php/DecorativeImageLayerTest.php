<?php
/**
 * sgs/decorative-image as the Floating layer (Spec 02 FR-2-6).
 *
 * Runs the REAL render.php through the QA harness (scripts/qa/lib/render-css-harness.php) in a child PHP process.
 * The harness applies no block.json defaults, so each test passes exactly the attributes it means to. Inner content
 * reaches the render through the harness's `--content` option from this file's own helper.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class DecorativeImageLayerTest extends TestCase {

	private const CONTENT = '<p class=sgs-test-copy>Baked to order</p>';

	private const IMAGE = array(
		'imageUrl' => 'https://example.test/uploads/photo.jpg',
		'imageId'  => 0,
	);

	/**
	 * Render the real block with optional inner content.
	 *
	 * @param array<string, mixed> $attrs   Block attributes.
	 * @param string               $content Rendered inner blocks.
	 * @return array{html: string, css: string}
	 */
	private function render_layer( array $attrs, string $content = '' ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsdi' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );

		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/decorative-image'
				. ' --attrs-file ' . escapeshellarg( $file );
			if ( '' !== $content ) {
				$cmd .= ' --content ' . escapeshellarg( $content );
			}
			$out = (string) shell_exec( $cmd . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );

		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) $decoded['css'],
		);
	}

	public function test_content_only_renders_a_layer_div_with_the_content_and_no_hiding(): void {
		$out = $this->render_layer(
			array(
				'rotation'  => array( 'desktop' => 12 ),
				'widthUnit' => 'auto',
			),
			self::CONTENT
		);

		$this->assertMatchesRegularExpression( '/<div class="sgs-decorative-image sgs-decorative-image--layer sgs-di-/', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-decorative-image--over-image', $out['html'] );
		$this->assertStringContainsString( '<div class="sgs-decorative-image__content">' . self::CONTENT . '</div>', $out['html'] );
		$this->assertStringNotContainsString( 'aria-hidden', $out['html'] );
		$this->assertStringNotContainsString( 'role=', $out['html'] );
		$this->assertStringContainsString( 'rotate(12deg)', $out['css'] );
	}

	public function test_image_plus_content_marks_over_image_and_hides_only_the_img(): void {
		$out = $this->render_layer( self::IMAGE + array( 'imageDecorative' => true ), self::CONTENT );

		$this->assertStringContainsString( 'sgs-decorative-image--layer', $out['html'] );
		$this->assertStringContainsString( 'sgs-decorative-image--over-image', $out['html'] );
		$this->assertSame( 1, substr_count( $out['html'], 'aria-hidden' ), 'only the <img> is hidden' );
		$this->assertMatchesRegularExpression( '/<img [^>]*aria-hidden="true"/', $out['html'] );
		$this->assertMatchesRegularExpression( '/<img [^>]*class="sgs-decorative-image__media sgs-media-el"/', $out['html'] );
		$this->assertMatchesRegularExpression( '/<img [^>]*alt=""/', $out['html'] );
		$this->assertStringContainsString( self::CONTENT, $out['html'] );
		$this->assertLessThan(
			strpos( $out['html'], 'sgs-decorative-image__content' ),
			strpos( $out['html'], '<img' ),
			'the content box follows the image'
		);
	}

	public function test_a_meaningful_image_keeps_its_alt_and_stays_readable(): void {
		$out = $this->render_layer(
			self::IMAGE + array(
				'imageDecorative' => false,
				'imageAlt'        => 'A tray of cookies',
			),
			self::CONTENT
		);

		$this->assertStringNotContainsString( 'aria-hidden', $out['html'] );
		$this->assertMatchesRegularExpression( '/<img [^>]*alt="A tray of cookies"/', $out['html'] );
	}

	public function test_nothing_at_all_renders_nothing(): void {
		$out = $this->render_layer( array( 'widthUnit' => 'auto' ) );

		$this->assertSame( '', trim( $out['html'] ) );
	}

	public function test_image_only_keeps_the_naked_img_root(): void {
		$out = $this->render_layer( self::IMAGE );

		$this->assertMatchesRegularExpression( '/<img [^>]*class="sgs-decorative-image sgs-media-el sgs-di-/', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-decorative-image--layer', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-decorative-image__content', $out['html'] );
		$this->assertStringContainsString( 'aria-hidden="true"', $out['html'] );
	}

	public function test_fit_the_content_width_is_max_content_and_ignores_tiers(): void {
		$out = $this->render_layer(
			array(
				'widthUnit' => 'auto',
				'width'     => array(
					'desktop' => 300,
					'tablet'  => 180,
				),
			),
			self::CONTENT
		);

		$this->assertStringContainsString( 'width:max-content;max-width:100%', $out['css'] );
		$this->assertStringNotContainsString( 'width:300px', $out['css'] );
		$this->assertStringNotContainsString( 'width:180', $out['css'] );
	}

	public function test_percentage_width_uses_the_unit_at_every_tier(): void {
		$out = $this->render_layer(
			array(
				'widthUnit' => '%',
				'width'     => array(
					'desktop' => 60,
					'tablet'  => 40,
				),
			),
			self::CONTENT
		);

		$this->assertMatchesRegularExpression( '/\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{[^}]*width:60%;/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media \(max-width:1023px\)\{\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{[^}]*width:40%;/', $out['css'] );
		$this->assertStringNotContainsString( 'width:60px', $out['css'] );
	}

	public function test_fixed_width_stays_in_pixels_with_the_max_width_cap(): void {
		$out = $this->render_layer(
			self::IMAGE + array(
				'width'           => array( 'desktop' => 240 ),
				'maxWidthPercent' => 30,
			)
		);

		$this->assertStringContainsString( 'width:240px', $out['css'] );
		$this->assertStringContainsString( 'max-width:30%', $out['css'] );
	}

	public function test_opacity_falls_back_to_fully_opaque(): void {
		$out = $this->render_layer( array(), self::CONTENT );

		$this->assertStringContainsString( 'opacity:var(--sgs-di-op, 1)', $out['css'] );
	}
}

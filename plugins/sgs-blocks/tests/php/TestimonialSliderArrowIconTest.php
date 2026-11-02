<?php
/**
 * sgs/testimonial-slider arrow icons (arrowIconPrev / arrowIconNext).
 *
 * Run with: vendor/bin/phpunit --filter TestimonialSliderArrowIconTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class TestimonialSliderArrowIconTest extends TestCase {

	/**
	 * Render the slider with one testimonial inside it.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return string Rendered HTML.
	 */
	private function render_slider( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$attrs_f = tempnam( sys_get_temp_dir(), 'sgsat' );
		$inner_f = tempnam( sys_get_temp_dir(), 'sgsin' );
		file_put_contents( $attrs_f, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		file_put_contents( $inner_f, json_encode( array( array( 'name' => 'sgs/testimonial', 'attributes' => array(), 'html' => '<div>Quote</div>' ) ), JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( 'sgs/testimonial-slider' )
				. ' --attrs-file ' . escapeshellarg( $attrs_f )
				. ' --inner-blocks-file ' . escapeshellarg( $inner_f ) . ' 2>&1'
			);
		} finally {
			@unlink( $attrs_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			@unlink( $inner_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	/**
	 * The SVG inside one arrow button.
	 *
	 * @param string $html Rendered HTML.
	 * @param string $dir  'prev' or 'next'.
	 * @return string Button inner HTML.
	 */
	private function arrow( string $html, string $dir ): string {
		$this->assertSame( 1, preg_match( '/sgs-testimonial-slider__arrow--' . $dir . '".*?<\/button>/s', $html, $m ), 'arrow button missing: ' . $dir );
		return $m[0];
	}

	public function test_unset_keeps_the_chevrons(): void {
		$html = $this->render_slider( array( 'showArrows' => true ) );

		$this->assertSame( $this->arrow( $html, 'prev' ), $this->arrow( $this->render_slider( array( 'showArrows' => true, 'arrowIconPrev' => 'chevron-left' ) ), 'prev' ) );
		$this->assertSame( $this->arrow( $html, 'next' ), $this->arrow( $this->render_slider( array( 'showArrows' => true, 'arrowIconNext' => 'chevron-right' ) ), 'next' ) );
	}

	public function test_set_icons_replace_the_chevrons(): void {
		$default = $this->render_slider( array( 'showArrows' => true ) );
		$html    = $this->render_slider( array( 'showArrows' => true, 'arrowIconPrev' => 'arrow-left', 'arrowIconNext' => 'arrow-right' ) );

		$this->assertNotSame( $this->arrow( $default, 'prev' ), $this->arrow( $html, 'prev' ) );
		$this->assertNotSame( $this->arrow( $default, 'next' ), $this->arrow( $html, 'next' ) );
		$this->assertStringContainsString( '<svg', $this->arrow( $html, 'prev' ) );
		$this->assertStringContainsString( '<svg', $this->arrow( $html, 'next' ) );
	}

	public function test_an_unknown_slug_falls_back_to_the_chevron(): void {
		$default = $this->render_slider( array( 'showArrows' => true ) );
		$html    = $this->render_slider( array( 'showArrows' => true, 'arrowIconPrev' => 'no-such-icon' ) );

		$this->assertSame( $this->arrow( $default, 'prev' ), $this->arrow( $html, 'prev' ) );
	}
}

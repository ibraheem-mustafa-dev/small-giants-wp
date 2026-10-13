<?php
/**
 * Tests: every auto-moving block prints the shared pause / play button (WCAG 2.2.2) when its
 * automatic motion is on, by default (no attribute needed), and prints none when it is off.
 *
 * Renders run the REAL render.php through the QA harness in a child process. The harness applies
 * no block.json defaults, so an absent attribute here is exactly an existing block saved before
 * the control existed: it must gain the button without a resave.
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
	 * @param string               $slug  Block slug.
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return string
	 */
	private function html( string $slug, array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsmp' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		$override = (string) getenv( 'SGS_TEST_RENDER_FILE' );

		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( $slug )
				. ( '' !== $override ? ' --render-file ' . escapeshellarg( $override ) : '' )
				. ' --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
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

	public function test_trust_bar_prints_the_button_by_default_when_auto_scroll_is_on(): void {
		$html = $this->html(
			'sgs/trust-bar',
			array(
				'autoScroll' => true,
				'items'      => $this->trust_items(),
			)
		);
		$this->assert_button( $html, 'sgs-trust-bar', 'Pause scrolling' );
		$this->assertStringContainsString( 'sgs-motion-pause--overlay-end', $this->pause_button( $html ) );
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

	public function test_brand_strip_prints_the_button_when_scrolling(): void {
		$html = $this->html(
			'sgs/brand-strip',
			array(
				'scrolling' => true,
				'logos'     => $this->brand_logos(),
			)
		);
		$this->assert_button( $html, 'sgs-brand-strip', 'Pause scrolling' );
	}

	public function test_brand_strip_prints_no_button_when_static(): void {
		$this->assertSame( '', $this->pause_button( $this->html( 'sgs/brand-strip', array( 'logos' => $this->brand_logos() ) ) ) );
	}

	public function test_trust_bar_prints_no_button_when_nothing_scrolls_or_it_is_switched_off(): void {
		$this->assertSame( '', $this->pause_button( $this->html( 'sgs/trust-bar', array( 'items' => $this->trust_items() ) ) ) );
		$this->assertSame(
			'',
			$this->pause_button(
				$this->html(
					'sgs/trust-bar',
					array(
						'autoScroll'            => true,
						'autoScrollPauseButton' => false,
						'items'                 => $this->trust_items(),
					)
				)
			)
		);
	}
}

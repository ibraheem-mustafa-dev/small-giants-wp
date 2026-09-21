<?php
/**
 * Shared harness for the sgs/trust-bar render tests.
 *
 * Runs the REAL src/blocks/trust-bar/render.php through the QA harness
 * (scripts/qa/lib/render-css-harness.php) in a child PHP process, the same way
 * ReviewsPlaceholderTest does, so render.php's top-level state stays out of the PHPUnit
 * process. The harness applies no block.json defaults, so each test passes exactly the
 * attributes it means to.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

trait TrustBarRenderTrait {

	/**
	 * Render the real block in a child process.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return array{html: string, css: string} Rendered HTML and the concatenated <style> CSS.
	 */
	private function render( array $attrs ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgstb' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );

		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/trust-bar --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
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

	/**
	 * Replace the attribute-hash uid so two renders with different attribute sets can be compared.
	 *
	 * @param string $html Rendered HTML.
	 * @return string HTML with the wrapper uid normalised.
	 */
	private function normalise_uid( string $html ): string {
		return (string) preg_replace( '/sgs-container-[0-9a-f]{8}/', 'sgs-container-UID', $html );
	}

	/** @return array<int, array<string, string>> */
	private function two_items(): array {
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

	/** @return array<string, mixed> */
	private function scroll_attrs(): array {
		return array(
			'badgeStyle'             => 'icon-circle',
			'autoScroll'             => true,
			'autoScrollSpeed'        => 'medium',
			'autoScrollPauseOnHover' => true,
			'items'                  => $this->two_items(),
			'title'                  => 'Hello',
		);
	}
}

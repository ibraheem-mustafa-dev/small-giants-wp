<?php
/**
 * Shared harness for render tests of any block.
 *
 * Runs the REAL src/blocks/<slug>/render.php through the QA harness
 * (scripts/qa/lib/render-css-harness.php) in a child PHP process, so the
 * render file's top-level state stays out of the PHPUnit process. The harness
 * applies no block.json defaults, so each test passes exactly the attributes
 * (and ancestor block context) it means to.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

trait BlockHarnessRenderTrait {

	/**
	 * Render a real block in a child process.
	 *
	 * @param string               $slug    Block slug, e.g. 'sgs/accordion-item'.
	 * @param array<string, mixed> $attrs   Block attributes.
	 * @param array<string, mixed> $context Ancestor block context.
	 * @param array<string, mixed> $global_settings Tree wp_get_global_settings() returns (e.g. a derived dark palette).
	 * @return array{html: string, css: string} Rendered HTML and the concatenated <style> CSS.
	 */
	private function render_block( string $slug, array $attrs, array $context = array(), array $global_settings = array() ): array {
		$harness  = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$attrs_f  = tempnam( sys_get_temp_dir(), 'sgsat' );
		$context_f = tempnam( sys_get_temp_dir(), 'sgsct' );
		$settings_f = tempnam( sys_get_temp_dir(), 'sgsgs' );
		file_put_contents( $attrs_f, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		file_put_contents( $context_f, json_encode( (object) $context, JSON_THROW_ON_ERROR ) );
		file_put_contents( $settings_f, json_encode( (object) $global_settings, JSON_THROW_ON_ERROR ) );

		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( $slug )
				. ' --attrs-file ' . escapeshellarg( $attrs_f )
				. ' --context-file ' . escapeshellarg( $context_f )
				. ' --global-settings-file ' . escapeshellarg( $settings_f ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			@unlink( $attrs_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			@unlink( $context_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			@unlink( $settings_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );

		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) $decoded['css'],
		);
	}
}

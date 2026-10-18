<?php
/**
 * Tests: a google-reviews block with nothing to show renders NO bytes, front end and editor.
 *
 * Found in the real editor (2026-09-21): the block with no data returned bytes from /wp/v2/block-renderer, so
 * ServerSideRender's response was not empty and its empty-state placeholder never showed (blank canvas). render.php,
 * run through the QA harness in a child process, must return exactly '' with no data, and a sample render must be intact.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ReviewsEmptyRenderTest extends TestCase {

	/**
	 * Render the real block through the QA harness.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return string Rendered HTML.
	 */
	private function render( array $attrs ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgsge' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );
		putenv( 'SGS_GR_TEST_MODE=live' );
		putenv( 'SGS_GR_TEST_SETTINGS_PLACE=' );
		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' -d auto_prepend_file=' . escapeshellarg( __DIR__ . '/stubs/google-reviews-render-prepend.php' )
				. ' ' . escapeshellarg( dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php' )
				. ' --slug sgs/google-reviews --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			putenv( 'SGS_GR_TEST_MODE' );
			putenv( 'SGS_GR_TEST_SETTINGS_PLACE' );
			unlink( $file );
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'the harness must print one JSON object, got: ' . substr( $out, 0, 400 ) );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php must not fatal: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	public function test_render_php_returns_zero_bytes_when_there_is_no_data(): void {
		$this->assertSame( 0, strlen( $this->render( array( 'dataSource' => 'auto' ) ) ) );
		$this->assertSame( 0, strlen( $this->render( array( 'dataSource' => 'inline', 'reviews' => array() ) ) ) );
	}

	public function test_a_sample_render_is_intact(): void {
		$html = $this->render( array( 'dataSource' => 'placeholder' ) );
		$this->assertStringContainsString( 'Sarah Patel', $html );
		$this->assertStringContainsString( 'sgs-google-reviews--slider', $html );
	}
}

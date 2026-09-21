<?php
/**
 * Tests: a google-reviews block with nothing to show renders NO bytes, front end and editor.
 *
 * Found in the real editor (2026-09-21): the block with no data returned ~222 bytes from
 * /wp/v2/block-renderer, a hover `<style>` tag with no element to style, so ServerSideRender's
 * response was not empty and its empty-state placeholder never showed (blank canvas).
 *
 * render.php itself already returns '' in that case. The junk came from the `render_block` filter
 * `inject_hover_effects()` (includes/hover-effects.php): google-reviews declares hover defaults, so
 * the filter passed its "nothing active" bail-out and appended a scoped `<style>` to the empty
 * string. A filter that decorates a block has nothing to decorate when the block rendered nothing.
 *
 * Two layers are asserted:
 *  1. render.php, run through the QA harness in a child process, returns exactly '' with no data.
 *  2. the real `inject_hover_effects()`, run in a child process against the block type's real
 *     `supports.sgs` (tests/php/stubs/hover-effects-probe.php), returns '' for empty or
 *     whitespace-only content and still decorates real markup exactly as before.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ReviewsEmptyRenderTest extends TestCase {

	/**
	 * Run the real hover filter on some content, in a child process.
	 *
	 * @param string $content Rendered block content going into the filter.
	 * @return string The content coming out.
	 */
	private function hover( string $content ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgshv' );
		file_put_contents( $file, $content );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/stubs/hover-effects-probe.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			unlink( $file );
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'the probe must print one JSON object, got: ' . substr( $out, 0, 400 ) );
		return (string) $decoded['out'];
	}

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

	public function test_the_hover_filter_adds_nothing_to_a_block_that_rendered_nothing(): void {
		$this->assertSame( 0, strlen( $this->hover( '' ) ), 'empty in, empty out: no junk <style> for an element that does not exist' );
		$this->assertSame( "  \n\t ", $this->hover( "  \n\t " ), 'whitespace-only content is returned untouched, nothing appended' );
	}

	public function test_the_hover_filter_still_decorates_a_block_that_rendered_something(): void {
		$out = $this->hover( '<div class="sgs-google-reviews sgs-gr-abc">x</div>' );
		$this->assertStringContainsString( 'sgs-has-hover', $out );
		$this->assertStringContainsString( 'sgs-has-focus-ring', $out );
		$this->assertStringContainsString( '<style>.sgs-hover-', $out );
		$this->assertStringContainsString( '--sgs-hover-scale:1.02', $out );
		$this->assertStringContainsString( '>x</div>', $out );
	}

	public function test_a_sample_render_is_unchanged_by_the_filter_guard(): void {
		$html = $this->render( array( 'dataSource' => 'placeholder' ) );
		$this->assertStringContainsString( 'Sarah Patel', $html );
		$this->assertStringContainsString( 'sgs-google-reviews--slider', $html );
	}
}

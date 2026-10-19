<?php
/**
 * Tests: sgs/google-reviews keeps the browser's own scrollbar when no scrollbar colour is set.
 *
 * The theme paints every scroller with the brand scrollbar colour (theme scrollbars.css). A rail with
 * pagination "scrollbar" and an empty `scrollbarColour` prints the opt-out class `sgs-scrollbar-native`
 * on its root; a rail with a colour set does not, so its own colour wins.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class GoogleReviewsScrollbarNativeTest extends TestCase {

	/**
	 * Render the real block in a child process and return its markup.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return string The block's rendered HTML.
	 */
	private function render( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$prepend = __DIR__ . '/stubs/google-reviews-render-prepend.php';
		$attrs  += array(
			'placeId'    => 'ChIJtestplace',
			'dataSource' => 'inline',
			'reviews'    => array( array( 'author' => 'A', 'text' => 'Body.', 'rating' => 5 ) ),
		);
		$file    = tempnam( sys_get_temp_dir(), 'sgsgs' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );

		putenv( 'SGS_GR_TEST_MODE=live' );
		putenv( 'SGS_GR_TEST_SETTINGS_PLACE=' );
		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' -d auto_prepend_file=' . escapeshellarg( $prepend )
				. ' ' . escapeshellarg( $harness )
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

	public function test_empty_scrollbar_colour_keeps_the_native_bar(): void {
		$html = $this->render( array( 'layout' => 'slider', 'pagination' => 'scrollbar', 'scrollbarColour' => '' ) );
		$this->assertMatchesRegularExpression( '/class="[^"]*\bsgs-scrollbar-native\b/', $html );
	}

	public function test_a_set_scrollbar_colour_drops_the_opt_out(): void {
		$html = $this->render( array( 'layout' => 'slider', 'pagination' => 'scrollbar', 'scrollbarColour' => '#e7d768' ) );
		$this->assertStringNotContainsString( 'sgs-scrollbar-native', $html );
	}

	public function test_a_rail_without_a_scrollbar_indicator_has_no_opt_out(): void {
		$html = $this->render( array( 'layout' => 'slider', 'pagination' => 'dots', 'scrollbarColour' => '' ) );
		$this->assertStringNotContainsString( 'sgs-scrollbar-native', $html );
	}
}

<?php
/**
 * Tests: sgs/google-reviews' rail wears the site's scrollbar (Spec 02 FR-2-35).
 *
 * The rail's bar goes through the shared scrollbar choice, so it is the site's slim bar (theme scrollbars.css) whether
 * or not a bar colour is set: the block never prints the opt-out class `sgs-scrollbar-native`. A set `scrollbarColour`
 * replaces the site's thumb colour on the rail only (--sgs-scrollbar-thumb). Only the scrollbar takes the site's look:
 * the block's own colours stay Google's (the avatar colour below is unchanged).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class GoogleReviewsScrollbarSiteBarTest extends TestCase {

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

	public function test_empty_scrollbar_colour_wears_the_sites_bar(): void {
		$html = $this->render( array( 'layout' => 'slider', 'pagination' => 'scrollbar', 'scrollbarColour' => '' ) );
		$this->assertStringNotContainsString( 'sgs-scrollbar-native', $html );
		$this->assertStringNotContainsString( '--sgs-scrollbar-thumb', $html );
		$this->assertStringContainsString( '.sgs-google-reviews__list::-webkit-scrollbar{width:var(--wp--custom--scrollbar--thin-width,10px);', $html );
	}

	public function test_a_set_scrollbar_colour_paints_only_the_rails_thumb(): void {
		$html = $this->render( array( 'layout' => 'slider', 'pagination' => 'scrollbar', 'scrollbarColour' => '#e7d768' ) );
		$this->assertStringNotContainsString( 'sgs-scrollbar-native', $html );
		$this->assertMatchesRegularExpression( '/\.sgs-google-reviews__list\{--sgs-scrollbar-thumb:#e7d768;\}/', $html );
	}

	public function test_a_rail_without_a_scrollbar_indicator_hides_the_bar(): void {
		$html = $this->render( array( 'layout' => 'slider', 'pagination' => 'dots', 'scrollbarColour' => '' ) );
		$this->assertStringNotContainsString( 'sgs-scrollbar-native', $html );
		$this->assertStringContainsString( '.sgs-google-reviews__list{scrollbar-width:none;}', $html );
	}

	public function test_the_blocks_own_colours_stay_googles(): void {
		$html = $this->render( array( 'layout' => 'slider', 'pagination' => 'scrollbar', 'reviews' => array( array( 'author' => 'A', 'text' => 'Body.', 'rating' => 5, 'avatarColour' => '#1A73E8' ) ) ) );
		$this->assertStringContainsString( '#1A73E8', $html );
	}
}

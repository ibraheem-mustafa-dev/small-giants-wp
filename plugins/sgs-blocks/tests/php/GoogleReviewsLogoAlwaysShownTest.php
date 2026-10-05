<?php
/**
 * Tests: sgs/google-reviews always prints the Google logo (Google Places API attribution policy).
 *
 * The block has no setting that hides the logo; a block saved with the retired `showGoogleLogo: false`
 * attribute still renders it, in the aggregate header and in the badge variants.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class GoogleReviewsLogoAlwaysShownTest extends TestCase {

	private const BLOCK = __DIR__ . '/../../src/blocks/google-reviews';

	/**
	 * Render the real block in a child process.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @param string               $mode  live | error | empty | unrated: what the Google fetch returns.
	 * @return string The block's rendered HTML.
	 */
	private function render( array $attrs, string $mode = 'live' ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$prepend = __DIR__ . '/stubs/google-reviews-render-prepend.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsga' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );

		putenv( 'SGS_GR_TEST_MODE=' . $mode );
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

	/** @return array<string, array{0: array<string, mixed>}> */
	public static function variants(): array {
		$base = array(
			'dataSource' => 'inline',
			'reviews'    => array( array( 'author' => 'A', 'text' => 'Body.', 'rating' => 5 ) ),
		);
		return array(
			'default header'  => array( $base ),
			'badge'           => array( $base + array( 'variant' => 'badge' ) ),
			'floating badge'  => array( $base + array( 'variant' => 'floating-badge' ) ),
			'retired false'   => array( $base + array( 'showGoogleLogo' => false ) ),
			'badge, retired false' => array( $base + array( 'variant' => 'badge', 'showGoogleLogo' => false ) ),
		);
	}

	/**
	 * @dataProvider variants
	 * @param array<string, mixed> $attrs Block attributes.
	 */
	public function test_logo_always_rendered( array $attrs ): void {
		$html = $this->render( $attrs );
		$this->assertMatchesRegularExpression( '#<img[^>]*src="[^"]*assets/google-logo\.svg"[^>]*alt="Google"#', $html );
	}

	public function test_block_json_has_no_logo_toggle(): void {
		$json = json_decode( (string) file_get_contents( self::BLOCK . '/block.json' ), true );
		$this->assertArrayNotHasKey( 'showGoogleLogo', $json['attributes'] );
	}
}

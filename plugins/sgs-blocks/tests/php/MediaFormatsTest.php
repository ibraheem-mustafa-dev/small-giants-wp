<?php
/**
 * Tests: `Sgs_Media_Formats` (Spec 49 FR-49-42) and the dry run of `wp sgs media modernise`.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MediaFormatsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MediaFormatsTest extends TestCase {

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		$GLOBALS['sgs_test_filters']  = array();
		$GLOBALS['sgs_test_supports'] = array( 'image/avif' => true, 'image/webp' => true );
		$GLOBALS['sgs_test_log']      = array();
		if ( ! function_exists( 'apply_filters' ) ) {
			function apply_filters( string $hook, $value, ...$args ) {
				$cb = $GLOBALS['sgs_test_filters'][ $hook ] ?? null;
				return null === $cb ? $value : $cb( $value, ...$args );
			}
			function add_filter(): void {}
			function wp_image_editor_supports( array $args ): bool {
				return ! empty( $GLOBALS['sgs_test_supports'][ $args['mime_type'] ] );
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-formats.php';
		Sgs_Media_Formats::reset();
	}

	private function map( string $source, ?string $file = null ): array {
		return Sgs_Media_Formats::output_format( array(), $file, $source );
	}

	public function test_avif_supported_maps_jpeg_and_png_to_avif(): void {
		$this->assertSame( array( 'image/jpeg' => 'image/avif' ), $this->map( 'image/jpeg' ) );
		$this->assertSame( array( 'image/png' => 'image/avif' ), $this->map( 'image/png' ) );
	}

	public function test_only_webp_supported_maps_to_webp(): void {
		$GLOBALS['sgs_test_supports'] = array( 'image/avif' => false, 'image/webp' => true );
		$this->assertSame( array( 'image/jpeg' => 'image/webp' ), $this->map( 'image/jpeg' ) );
		$this->assertSame( array( 'image/png' => 'image/webp' ), $this->map( 'image/png' ) );
	}

	public function test_neither_supported_leaves_the_map_unchanged(): void {
		$GLOBALS['sgs_test_supports'] = array( 'image/avif' => false, 'image/webp' => false );
		$this->assertSame( array(), $this->map( 'image/jpeg' ) );
		$this->assertSame( array( 'image/gif' => 'image/gif' ), Sgs_Media_Formats::output_format( array( 'image/gif' => 'image/gif' ), '/up/a.png', 'image/png' ) );
	}

	public function test_other_types_keep_their_format(): void {
		$this->assertSame( array(), $this->map( 'image/gif' ) );
	}

	public function test_the_full_size_the_scaled_copy_and_the_conversion_check_keep_the_upload_format(): void {
		$this->assertSame( array(), $this->map( 'image/jpeg', '/up/photo.jpg' ), 'full-size save and the early conversion check carry the original path' );
		$this->assertSame( array(), $this->map( 'image/jpeg', '/up/photo-scaled.jpg' ) );
		$this->assertSame( array(), $this->map( 'image/png', '/up/photo-rotated.png' ) );
		$this->assertSame( array( 'image/png' => 'image/avif' ), $this->map( 'image/png', null ), 'a sub-size is saved without a name' );
	}

	public function test_existing_map_entries_are_kept(): void {
		$out = Sgs_Media_Formats::output_format( array( 'image/gif' => 'image/png' ), null, 'image/jpeg' );
		$this->assertSame( array( 'image/gif' => 'image/png', 'image/jpeg' => 'image/avif' ), $out );
	}

	public function test_quality_per_mime_type(): void {
		$this->assertSame( 60, Sgs_Media_Formats::quality( 82, 'image/avif' ) );
		$this->assertSame( 82, Sgs_Media_Formats::quality( 70, 'image/webp' ) );
		$this->assertSame( 75, Sgs_Media_Formats::quality( 75, 'image/jpeg' ), 'JPEG is unchanged' );
	}

	public function test_quality_filters_override_the_defaults(): void {
		$GLOBALS['sgs_test_filters']['sgs_media_avif_quality'] = static fn(): int => 45;
		$GLOBALS['sgs_test_filters']['sgs_media_webp_quality'] = static fn(): int => 70;
		$this->assertSame( 45, Sgs_Media_Formats::quality( 82, 'image/avif' ) );
		$this->assertSame( 70, Sgs_Media_Formats::quality( 82, 'image/webp' ) );
	}

	public function test_the_switch_off_filter_disables_mapping_and_quality(): void {
		$GLOBALS['sgs_test_filters']['sgs_media_modern_formats'] = static fn(): bool => false;
		$this->assertSame( array(), $this->map( 'image/jpeg' ) );
		$this->assertSame( 82, Sgs_Media_Formats::quality( 82, 'image/avif' ) );
		$this->assertSame( 91, Sgs_Media_Formats::quality( 91, 'image/webp' ) );
	}

	public function test_alpha_survives_the_conversion(): void {
		if ( ! class_exists( 'Imagick' ) ) {
			$this->markTestSkipped( 'Imagick is not installed here; the mirror proof covers alpha.' );
		}
		$formats = \Imagick::queryFormats();
		$target  = in_array( 'AVIF', $formats, true ) ? 'avif' : ( in_array( 'WEBP', $formats, true ) ? 'webp' : '' );
		if ( '' === $target ) {
			$this->markTestSkipped( 'Imagick has neither AVIF nor WebP.' );
		}
		$img = new \Imagick();
		$img->newImage( 8, 8, new \ImagickPixel( 'transparent' ), 'png' );
		$img->setImageAlphaChannel( \Imagick::ALPHACHANNEL_ACTIVATE );
		$img->setImageFormat( $target );
		$out = new \Imagick();
		$out->readImageBlob( $img->getImageBlob() );
		$this->assertTrue( $out->getImageAlphaChannel() > 0 );
		$this->assertSame( 0.0, $out->getImagePixelColor( 4, 4 )->getColorValue( \Imagick::COLOR_ALPHA ) );
	}

	public function test_modernise_dry_run_lists_and_writes_nothing(): void {
		// The WP-CLI class does not exist outside WP-CLI; a minimal stand-in records what the command prints.
		eval( 'class WP_CLI { public static function log( $m ) { $GLOBALS["sgs_test_log"][] = $m; } public static function success( $m ) { $GLOBALS["sgs_test_log"][] = "OK " . $m; } public static function warning( $m ) { $GLOBALS["sgs_test_log"][] = "W " . $m; } public static function error( $m ) { throw new \RuntimeException( $m ); } }' );
		function add_action(): void {}
		function get_attached_file( $id ) { return '/up/img-' . $id . '.jpg'; }
		function wp_get_attachment_metadata( $id ) { return array( 'sizes' => array( 'thumbnail' => array( 'mime-type' => 'image/jpeg' ) ) ); }
		function wp_update_attachment_metadata(): void { $GLOBALS['sgs_test_log'][] = 'WROTE'; }
		function is_wp_error( $v ): bool { return false; }
		$GLOBALS['wpdb'] = new class() {
			public string $posts = 'wp_posts';
			public int $calls    = 0;
			public function prepare( string $q, ...$a ): string { return $q; }
			public function get_col( string $q ): array { return 1 === ++$this->calls ? array( '11', '12', '13' ) : array(); }
		};
		require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-media-cli-commands.php';
		( new \SGS\Blocks\Sgs_Media_Cli_Commands() )->modernise( array(), array( 'batch' => '2', 'after' => '10', 'dry-run' => true ) );
		$this->assertSame(
			array( 'Would regenerate attachment 11 (/up/img-11.jpg)', 'Would regenerate attachment 12 (/up/img-12.jpg)', 'OK Would regenerate 2, failed 0. Resume with --after=12.' ),
			$GLOBALS['sgs_test_log']
		);
	}
}

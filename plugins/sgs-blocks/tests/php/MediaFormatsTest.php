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

	/** Stubs for the full-size copy: a main file of `$main_bytes` and an editor whose save writes `$copy_bytes` as `$copy_mime`. */
	private function full_copy_world( string $source_mime, int $main_bytes, int $copy_bytes, string $copy_mime ): string {
		$dir = sys_get_temp_dir() . '/sgs-full-copy-' . getmypid();
		@mkdir( $dir );
		file_put_contents( $dir . '/photo.jpg', str_repeat( 'j', $main_bytes ) );
		$GLOBALS['sgs_fc'] = array( 'dir' => $dir, 'mime' => $source_mime, 'bytes' => $copy_bytes, 'out' => $copy_mime, 'deleted' => array() );
		function get_post_mime_type( $id ) { return $GLOBALS['sgs_fc']['mime']; }
		function get_attached_file( $id ) { return $GLOBALS['sgs_fc']['dir'] . '/photo.jpg'; }
		function wp_basename( $p ) { return basename( (string) $p ); }
		function trailingslashit( $p ) { return rtrim( $p, '/' ) . '/'; }
		function wp_filesize( $p ) { clearstatcache(); return file_exists( $p ) ? (int) filesize( $p ) : 0; }
		function wp_delete_file( $p ) { $GLOBALS['sgs_fc']['deleted'][] = basename( $p ); @unlink( $p ); }
		function is_wp_error( $v ): bool { return false; }
		function wp_get_image_editor( $f ) {
			return new class() {
				public function save( $name, $mime ) {
					$w    = $GLOBALS['sgs_fc'];
					$GLOBALS['sgs_fc']['asked'] = array( $name, $mime );
					if ( 'fail' === $w['out'] ) {
						return array();
					}
					$ext  = array( 'image/avif' => 'avif', 'image/webp' => 'webp', 'image/jpeg' => 'jpg' )[ $w['out'] ];
					$path = $w['dir'] . '/photo-438x694.' . $ext;
					file_put_contents( $path, str_repeat( 'a', $w['bytes'] ) );
					return array( 'path' => $path, 'file' => basename( $path ), 'width' => 438, 'height' => 694, 'mime-type' => $w['out'] );
				}
			};
		}
		return $dir;
	}

	private function meta(): array {
		return array( 'file' => '2026/10/photo.jpg', 'width' => 438, 'height' => 694, 'sizes' => array( 'medium' => array( 'file' => 'photo-189x300.avif', 'mime-type' => 'image/avif' ) ) );
	}

	public function test_a_smaller_full_size_copy_is_kept_as_its_own_size(): void {
		$this->full_copy_world( 'image/jpeg', 50000, 15000, 'image/avif' );
		$out = Sgs_Media_Formats::add_full_copy( $this->meta(), 7 );
		$this->assertSame( array( null, 'image/avif' ), $GLOBALS['sgs_fc']['asked'], 'saved like a resized copy, in the modern format' );
		$this->assertSame(
			array( 'file' => 'photo-438x694.avif', 'width' => 438, 'height' => 694, 'mime-type' => 'image/avif', 'filesize' => 15000, 'source' => 'photo.jpg' ),
			$out[ Sgs_Media_Formats::FULL_COPY ]
		);
		$this->assertSame( 'image/avif', $out['sizes']['medium']['mime-type'], 'the other sizes are untouched' );
		$this->assertSame( array(), $GLOBALS['sgs_fc']['deleted'] );
	}

	public function test_a_copy_that_is_not_smaller_is_deleted_and_the_check_is_recorded(): void {
		$this->full_copy_world( 'image/jpeg', 50000, 50000, 'image/avif' );
		$out = Sgs_Media_Formats::add_full_copy( $this->meta(), 7 );
		$this->assertArrayNotHasKey( Sgs_Media_Formats::FULL_COPY, $out );
		$this->assertSame( array( 'photo-438x694.avif' ), $GLOBALS['sgs_fc']['deleted'] );
		$this->assertSame( 'photo.jpg', $out['sgs_full_copy_checked'] );
	}

	public function test_a_copy_that_fell_back_to_the_source_format_is_deleted(): void {
		$this->full_copy_world( 'image/jpeg', 50000, 20000, 'image/jpeg' );
		$out = Sgs_Media_Formats::add_full_copy( $this->meta(), 7 );
		$this->assertArrayNotHasKey( Sgs_Media_Formats::FULL_COPY, $out );
		$this->assertSame( array( 'photo-438x694.jpg' ), $GLOBALS['sgs_fc']['deleted'] );
	}

	public function test_a_webp_fallback_copy_is_kept(): void {
		$this->full_copy_world( 'image/png', 90000, 30000, 'image/webp' );
		$out = Sgs_Media_Formats::add_full_copy( $this->meta(), 7 );
		$this->assertSame( 'image/webp', $out[ Sgs_Media_Formats::FULL_COPY ]['mime-type'] );
	}

	public function test_other_types_and_the_switch_off_get_no_copy(): void {
		$this->full_copy_world( 'image/gif', 50000, 15000, 'image/avif' );
		$this->assertSame( $this->meta(), Sgs_Media_Formats::add_full_copy( $this->meta(), 7 ) );
		$GLOBALS['sgs_fc']['mime']                               = 'image/jpeg';
		$GLOBALS['sgs_test_filters']['sgs_media_modern_formats'] = static fn() => false;
		$this->assertSame( $this->meta(), Sgs_Media_Formats::add_full_copy( $this->meta(), 7 ) );
		$this->assertArrayNotHasKey( 'asked', $GLOBALS['sgs_fc'] );
	}

	public function test_a_copy_of_the_current_main_file_is_not_made_again(): void {
		$this->full_copy_world( 'image/jpeg', 50000, 15000, 'image/avif' );
		$meta = Sgs_Media_Formats::add_full_copy( $this->meta(), 7 );
		unset( $GLOBALS['sgs_fc']['asked'] );
		$this->assertSame( $meta, Sgs_Media_Formats::add_full_copy( $meta, 7 ) );
		$this->assertArrayNotHasKey( 'asked', $GLOBALS['sgs_fc'] );
	}

	private static function sources(): array {
		return array(
			438 => array( 'url' => 'https://x.test/up/2026/10/photo.jpg', 'descriptor' => 'w', 'value' => 438 ),
			189 => array( 'url' => 'https://x.test/up/2026/10/photo-189x300.avif', 'descriptor' => 'w', 'value' => 189 ),
		);
	}

	public function test_the_main_file_entry_in_the_srcset_points_at_its_copy(): void {
		function wp_basename( $p ) { return basename( (string) $p ); }
		$meta                                           = $this->meta();
		$meta[ Sgs_Media_Formats::FULL_COPY ] = array( 'file' => 'photo-438x694.avif', 'width' => 438, 'height' => 694, 'source' => 'photo.jpg' );
		$out = Sgs_Media_Formats::srcset_full_copy( self::sources(), array( 438, 694 ), 'https://x.test/up/2026/10/photo.jpg', $meta, 7 );
		$this->assertSame( 'https://x.test/up/2026/10/photo-438x694.avif', $out[438]['url'] );
		$this->assertSame( self::sources()[189], $out[189], 'any other candidate is unchanged' );
		$this->assertSame( array( 438, 189 ), array_keys( $out ), 'order kept (the src first)' );

		$meta[ Sgs_Media_Formats::FULL_COPY ]['source'] = 'photo-e1700000000000.jpg';
		$this->assertSame( self::sources(), Sgs_Media_Formats::srcset_full_copy( self::sources(), array(), '', $meta, 7 ), 'a copy of an older main file is not used' );
		$this->assertSame( self::sources(), Sgs_Media_Formats::srcset_full_copy( self::sources(), array(), '', $this->meta(), 7 ), 'no copy, no change' );
	}

	public function test_modernise_selects_an_attachment_without_a_checked_full_copy(): void {
		function wp_basename( $p ) { return basename( (string) $p ); }
		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-modernise.php';
		$modern = $this->meta();
		$this->assertFalse( Sgs_Media_Modernise::needs_subsizes( $modern ) );
		$this->assertTrue( Sgs_Media_Modernise::needs_full_copy( $modern ), 'no copy yet' );
		$modern['sgs_full_copy_checked'] = 'photo.jpg';
		$this->assertFalse( Sgs_Media_Modernise::needs_full_copy( $modern ), 'checked, copy not kept: skipped' );
		$modern['sgs_full_copy_checked']                 = '';
		$modern[ Sgs_Media_Formats::FULL_COPY ]          = array( 'source' => 'photo.jpg' );
		$this->assertFalse( Sgs_Media_Modernise::needs_full_copy( $modern ), 'copy present' );
		$modern['file'] = '2026/10/photo-e1700000000000.jpg';
		$this->assertTrue( Sgs_Media_Modernise::needs_full_copy( $modern ), 'edited since: a new copy is due' );
		$this->assertTrue( Sgs_Media_Modernise::needs_subsizes( array( 'sizes' => array( 'thumbnail' => array( 'mime-type' => 'image/jpeg' ) ) ) ) );
	}

	public function test_a_copy_kept_in_the_source_format_is_marked_and_not_selected_again(): void {
		$dir = sys_get_temp_dir() . '/sgs-kept-' . getmypid();
		@mkdir( $dir );
		file_put_contents( $dir . '/icon.png', str_repeat( 'p', 900 ) );
		file_put_contents( $dir . '/icon-150x150.avif', str_repeat( 'a', 800 ) );
		$GLOBALS['sgs_kept'] = $dir;
		function get_post_mime_type( $id ) { return 'image/png'; }
		function get_attached_file( $id ) { return $GLOBALS['sgs_kept'] . '/icon.png'; }
		function wp_get_original_image_path( $id ) { return $GLOBALS['sgs_kept'] . '/icon.png'; }
		function trailingslashit( $p ) { return rtrim( $p, '/' ) . '/'; }
		function wp_basename( $p ) { return basename( (string) $p ); }
		function wp_filesize( $p ) { clearstatcache(); return file_exists( $p ) ? (int) filesize( $p ) : 0; }
		function wp_delete_file( $p ) { @unlink( $p ); }
		function is_wp_error( $v ): bool { return false; }
		function wp_get_image_editor( $f ) {
			return new class() {
				public function resize( $w, $h, $c ) { return true; }
				public function generate_filename( $s, $d, $ext ) { return $GLOBALS['sgs_kept'] . '/icon-150x150.' . $ext; }
				public function save( $path, $mime ) { file_put_contents( $path, str_repeat( 'p', 300 ) ); return array( 'path' => $path ); }
			};
		}
		$meta = array( 'file' => '2026/09/icon.png', 'sizes' => array( 'thumbnail' => array( 'file' => 'icon-150x150.avif', 'width' => 150, 'height' => 150, 'mime-type' => 'image/avif' ) ) );
		$out  = Sgs_Media_Formats::discard_oversized( $meta, 9 );
		$this->assertSame( 'image/png', $out['sizes']['thumbnail']['mime-type'], 'the PNG twin is smaller, so it is kept' );
		$this->assertTrue( $out['sizes']['thumbnail']['sgs_source_kept'], 'MUST FAIL without the mark' );

		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-modernise.php';
		$this->assertFalse( Sgs_Media_Modernise::needs_subsizes( $out ), 'a copy kept on purpose is not converted again' );
		unset( $out['sizes']['thumbnail']['sgs_source_kept'] );
		$this->assertTrue( Sgs_Media_Modernise::needs_subsizes( $out ), 'an unmarked PNG copy is still due' );
	}

	public function test_a_failed_save_is_not_marked_so_the_next_run_tries_again(): void {
		$this->full_copy_world( 'image/jpeg', 50000, 15000, 'fail' );
		$out = Sgs_Media_Formats::add_full_copy( $this->meta(), 7 );
		$this->assertArrayNotHasKey( Sgs_Media_Formats::FULL_COPY, $out );
		$this->assertArrayNotHasKey( 'sgs_full_copy_checked', $out, 'MUST FAIL if a failure counts as checked' );
	}

	public function test_a_copy_recorded_in_the_size_list_moves_to_its_own_key_without_a_new_encode(): void {
		$dir = $this->full_copy_world( 'image/jpeg', 50000, 15000, 'image/avif' );
		file_put_contents( $dir . '/photo-438x694.avif', 'a' );
		$meta                    = $this->meta();
		$meta['sizes']['sgs-full-modern'] = array( 'file' => 'photo-438x694.avif', 'width' => 438, 'height' => 694, 'mime-type' => 'image/avif', 'source' => 'photo.jpg' );
		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-modernise.php';
		$this->assertTrue( Sgs_Media_Modernise::needs_full_copy( $meta ), 'an entry in the size list is selected to move' );
		$out = Sgs_Media_Formats::add_full_copy( $meta, 7 );
		$this->assertArrayNotHasKey( 'sgs-full-modern', $out['sizes'], 'no size lookup can return the AVIF' );
		$this->assertSame( 'photo-438x694.avif', $out[ Sgs_Media_Formats::FULL_COPY ]['file'] );
		$this->assertArrayNotHasKey( 'asked', $GLOBALS['sgs_fc'], 'moved, not encoded again' );
		$this->assertFalse( Sgs_Media_Modernise::needs_full_copy( $out ) );
	}

	public function test_a_copy_of_an_older_main_file_is_deleted_when_replaced(): void {
		$dir = $this->full_copy_world( 'image/jpeg', 50000, 15000, 'image/avif' );
		file_put_contents( $dir . '/photo-old-438x694.avif', 'a' );
		$meta                                   = $this->meta();
		$meta[ Sgs_Media_Formats::FULL_COPY ] = array( 'file' => 'photo-old-438x694.avif', 'source' => 'photo-old.jpg' );
		$out = Sgs_Media_Formats::add_full_copy( $meta, 7 );
		$this->assertContains( 'photo-old-438x694.avif', $GLOBALS['sgs_fc']['deleted'] );
		$this->assertSame( 'photo.jpg', $out[ Sgs_Media_Formats::FULL_COPY ]['source'] );
	}

	public function test_an_entry_with_no_mime_type_does_not_count_as_unconverted(): void {
		function wp_basename( $p ) { return basename( (string) $p ); }
		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-modernise.php';
		$meta                          = $this->meta();
		$meta['sizes']['plugin-thing'] = array( 'file' => 'photo-plugin.jpg' );
		$this->assertFalse( Sgs_Media_Modernise::needs_subsizes( $meta ) );
	}
}

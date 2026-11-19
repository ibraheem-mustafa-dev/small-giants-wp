<?php
/**
 * Tests: the save fallback and the repair selector of FR-49-42 (`Sgs_Media_Save_Fallback`, `Sgs_Media_Modernise::repair_*`).
 *
 * A stub of core's Imagick editor throws the host's AVIF tile-thread error, or writes 0 bytes, for widths of 600 and more.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MediaSaveFallbackTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MediaSaveFallbackTest extends TestCase {

	private string $dir;

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		$this->dir                    = sys_get_temp_dir() . '/sgs-fallback-' . bin2hex( random_bytes( 4 ) ) . '/';
		mkdir( $this->dir, 0777, true );
		$GLOBALS['sgs_test_dir']      = $this->dir;
		$GLOBALS['sgs_test_supports'] = array( 'image/avif' => true, 'image/webp' => true, 'image/png' => true, 'image/jpeg' => true );
		$GLOBALS['sgs_test_mode']     = 'throw';
		$GLOBALS['sgs_test_failing']  = array( 'image/avif' );
		$GLOBALS['sgs_test_calls']    = array();
		require_once __DIR__ . '/fixtures/media-editor-stubs.php';
		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-formats.php';
		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-editors.php';
		Sgs_Media_Formats::reset();
	}

	protected function tearDown(): void {
		foreach ( (array) glob( $this->dir . '*' ) as $f ) {
			@unlink( $f );
		}
		@rmdir( $this->dir );
	}

	/** Save one resized copy of a PNG upload at `$width` through the real editor subclass. */
	private function save( int $width ) {
		$editor = new Sgs_Media_Imagick_Editor();
		$editor->width = $width;
		$ref = new ReflectionMethod( $editor, '_save' );
		return $ref->invoke( $editor, null );
	}

	private function assertNoEmptyFiles(): void {
		foreach ( (array) glob( $this->dir . '*' ) as $f ) {
			$this->assertGreaterThan( 0, filesize( $f ), basename( $f ) . ' is 0 bytes' );
		}
	}

	public function test_a_size_that_encodes_fine_stays_avif(): void {
		$saved = $this->save( 300 );
		$this->assertSame( 'image/avif', $saved['mime-type'] );
		$this->assertSame( array( 'image/avif' ), $GLOBALS['sgs_test_calls'] );
	}

	public function test_the_tile_thread_error_falls_back_to_webp_with_a_real_file(): void {
		foreach ( array( 600, 768 ) as $w ) {
			$saved = $this->save( $w );
			$this->assertSame( 'image/webp', $saved['mime-type'] );
			$this->assertSame( "photo-{$w}x{$w}.webp", $saved['file'] );
			$this->assertSame( 100, $saved['filesize'] );
			$this->assertFileExists( $this->dir . $saved['file'] );
			$this->assertFileDoesNotExist( $this->dir . "photo-{$w}x{$w}.avif" );
		}
		$this->assertNoEmptyFiles();
	}

	public function test_a_zero_byte_avif_without_an_error_also_falls_back(): void {
		$GLOBALS['sgs_test_mode'] = 'zero';
		$saved                    = $this->save( 768 );
		$this->assertSame( 'image/webp', $saved['mime-type'] );
		$this->assertNoEmptyFiles();
	}

	public function test_webp_failing_too_falls_back_to_the_upload_format(): void {
		$GLOBALS['sgs_test_failing'] = array( 'image/avif', 'image/webp' );
		$saved                       = $this->save( 768 );
		$this->assertSame( 'image/png', $saved['mime-type'], 'the retry in the source format must not be converted back to AVIF' );
		$this->assertSame( 'photo-768x768.png', $saved['file'] );
		$this->assertSame( array( 'image/avif', 'image/webp', 'image/png' ), $GLOBALS['sgs_test_calls'] );
		$this->assertNoEmptyFiles();
	}

	public function test_every_format_failing_returns_the_error_and_leaves_no_empty_file(): void {
		$GLOBALS['sgs_test_failing'] = array( 'image/avif', 'image/webp', 'image/png' );
		$this->assertInstanceOf( WP_Error::class, $this->save( 768 ) );
		$this->assertSame( array(), (array) glob( $this->dir . '*' ) );
	}

	public function test_a_named_save_is_not_retried(): void {
		$editor        = new Sgs_Media_Imagick_Editor();
		$editor->width = 768;
		$saved         = ( new ReflectionMethod( $editor, '_save' ) )->invoke( $editor, null, '/x/a.avif', 'image/avif' );
		$this->assertCount( 1, $GLOBALS['sgs_test_calls'] );
	}

	public function test_the_editors_filter_swaps_in_the_fallback_classes(): void {
		$this->assertSame(
			array( 'Sgs_Media_Imagick_Editor', 'Sgs_Media_Gd_Editor', 'Other_Editor' ),
			Sgs_Media_Formats::editors( array( 'WP_Image_Editor_Imagick', 'WP_Image_Editor_GD', 'Other_Editor' ) )
		);
	}

	/** Plant three attachments: healthy, a 0-byte copy named in the metadata, and an orphan 0-byte file with a size missing. */
	private function plant(): void {
		$d = $this->dir;
		foreach ( array( 'ok-150x150.avif', 'ok-300x300.avif', 'bad-150x150.avif', 'orph-150x150.avif' ) as $f ) {
			file_put_contents( $d . $f, 'x' );
		}
		file_put_contents( $d . 'bad-768x810.avif', '' );
		file_put_contents( $d . 'orph-600x633.avif', '' );
		foreach ( array( 'ok', 'bad', 'orph' ) as $b ) {
			file_put_contents( $d . $b . '.png', 'orig' );
		}
		$meta = array(
			1 => array( 'sizes' => array( 'thumbnail' => array( 'file' => 'ok-150x150.avif' ), 'medium' => array( 'file' => 'ok-300x300.avif' ) ) ),
			2 => array( 'sizes' => array( 'thumbnail' => array( 'file' => 'bad-150x150.avif' ), 'medium_large' => array( 'file' => 'bad-768x810.avif' ) ) ),
			3 => array( 'sizes' => array( 'thumbnail' => array( 'file' => 'orph-150x150.avif' ) ) ),
		);
		$GLOBALS['sgs_test_meta']  = $meta;
		$GLOBALS['sgs_test_names'] = array( 1 => 'ok', 2 => 'bad', 3 => 'orph' );
		function get_attached_file( $id ) { return $GLOBALS['sgs_test_dir'] . $GLOBALS['sgs_test_names'][ $id ] . '.png'; }
		function wp_get_original_image_path( $id ) { return get_attached_file( $id ); }
		function wp_get_attachment_metadata( $id ) { return $GLOBALS['sgs_test_meta'][ $id ]; }
		function wp_update_attachment_metadata( $id, $m ) { $GLOBALS['sgs_test_meta'][ $id ] = $m; }
		function wp_get_missing_image_subsizes( $id ) { return 3 === $id ? array( 'medium_large' => array() ) : array(); }
		function wp_update_image_subsizes( $id ) {
			$GLOBALS['sgs_test_regen'][] = array_keys( $GLOBALS['sgs_test_meta'][ $id ]['sizes'] );
			$GLOBALS['sgs_test_meta'][ $id ]['sizes']['medium_large'] = array( 'file' => 'new.webp', 'mime-type' => 'image/webp', 'filesize' => 9 );
			return $GLOBALS['sgs_test_meta'][ $id ];
		}
		$GLOBALS['wpdb'] = new class() {
			public string $posts = 'wp_posts';
			public int $calls    = 0;
			public function prepare( string $q, ...$a ): string { return $q; }
			public function get_col( string $q ): array { return 1 === ++$this->calls ? array( '1', '2', '3' ) : array(); }
		};
		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-modernise.php';
	}

	public function test_the_repair_selector_finds_the_empty_copy_and_the_missing_size(): void {
		$this->plant();
		$this->assertSame( array( 2, 3 ), Sgs_Media_Modernise::repair_ids( 0, 10 ) );
		$bad = Sgs_Media_Modernise::repair_problems( 2 );
		$this->assertSame( array( $this->dir . 'bad-768x810.avif' ), $bad['empty'] );
		$this->assertSame( array( 'medium_large' ), $bad['missing'] );
		$orph = Sgs_Media_Modernise::repair_problems( 3 );
		$this->assertSame( array( wp_normalize_path( $this->dir . 'orph-600x633.avif' ) ), array_map( 'wp_normalize_path', $orph['empty'] ) );
		$this->assertSame( array( 'medium_large' ), $orph['missing'] );
		$this->assertSame( array( 'empty' => array(), 'missing' => array() ), Sgs_Media_Modernise::repair_problems( 1 ) );
	}

	public function test_the_repair_selector_respects_the_batch_limit(): void {
		$this->plant();
		$this->assertSame( array( 2 ), Sgs_Media_Modernise::repair_ids( 0, 1 ) );
	}

	public function test_repair_deletes_the_empty_file_and_regenerates_only_the_broken_size(): void {
		$this->plant();
		$GLOBALS['sgs_test_regen'] = array();
		$out                       = Sgs_Media_Modernise::repair( 2 );
		$this->assertFileDoesNotExist( $this->dir . 'bad-768x810.avif' );
		$this->assertSame( array( array( 'thumbnail' ) ), $GLOBALS['sgs_test_regen'], 'the healthy thumbnail stays; only the broken size is asked for again' );
		$this->assertSame( 'image/webp', $out['medium_large']['mime'] );
		$this->assertSame( array(), Sgs_Media_Modernise::repair_problems( 2 )['empty'] );
	}
}

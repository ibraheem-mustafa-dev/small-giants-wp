<?php
/**
 * Tests: a printed <img> carries the image's real width and height (includes/helpers-image-dimensions.php).
 *
 * Covers the lookup order: an attachment's metadata (the file's own size, resized copies included), the file header
 * on disk for an image that is not an attachment, an SVG's viewBox, and no attributes at all for an SVG without a
 * viewBox or for a remote URL. Also covers sgs_render_media(), the printer brand-strip and card-grid share.
 *
 * Run with:
 *   vendor/bin/phpunit --filter ImageIntrinsicSizeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

if ( ! defined( 'WP_CONTENT_DIR' ) ) {
	define( 'WP_CONTENT_DIR', sys_get_temp_dir() . '/sgs-intrinsic-' . getmypid() );
}
if ( ! function_exists( 'content_url' ) ) {
	function content_url( $path = '' ) { return 'https://example.test/wp-content'; }
}
if ( ! function_exists( 'trailingslashit' ) ) {
	function trailingslashit( $v ) { return rtrim( (string) $v, "/\\" ) . '/'; }
}
if ( ! function_exists( 'wp_basename' ) ) {
	function wp_basename( $p ) { return basename( (string) $p ); }
}
if ( ! function_exists( 'wp_parse_url' ) ) {
	function wp_parse_url( $u, $c = -1 ) { return parse_url( $u, $c ); }
}
if ( ! function_exists( 'get_transient' ) ) {
	function get_transient( $k ) { return false; }
}
if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( $k, $v, $e = 0 ) { return true; }
}
if ( ! function_exists( 'wp_getimagesize' ) ) {
	function wp_getimagesize( $p ) { return getimagesize( $p ); }
}
if ( ! function_exists( 'attachment_url_to_postid' ) ) {
	function attachment_url_to_postid( $url ) { return (int) ( $GLOBALS['sgs_test_attachment_ids'][ $url ] ?? 0 ); }
}
if ( ! function_exists( 'wp_get_attachment_metadata' ) ) {
	function wp_get_attachment_metadata( $id ) {
		return 7 === $id ? array( 'width' => 1200, 'height' => 600, 'sizes' => array( 'medium' => array( 'file' => 'library-300x150.jpg', 'width' => 300, 'height' => 150 ) ) ) : false;
	}
}
if ( ! defined( 'HOUR_IN_SECONDS' ) ) {
	define( 'HOUR_IN_SECONDS', 3600 );
}
if ( ! defined( 'DAY_IN_SECONDS' ) ) {
	define( 'DAY_IN_SECONDS', 86400 );
}
foreach ( array( 'esc_url', 'esc_attr' ) as $sgs_fn ) {
	if ( ! function_exists( $sgs_fn ) ) {
		eval( "function {$sgs_fn}( \$v ) { return htmlspecialchars( (string) \$v, ENT_QUOTES ); }" );
	}
}

final class ImageIntrinsicSizeTest extends TestCase {

	public static function setUpBeforeClass(): void {
		// Only this URL is a media-library file (attachment 7); every other URL is not an attachment.
		$GLOBALS['sgs_test_attachment_ids']['https://example.test/wp-content/uploads/library-300x150.jpg'] = 7;
		$dir = WP_CONTENT_DIR . '/uploads';
		mkdir( $dir, 0777, true );
		$png = imagecreatetruecolor( 40, 20 );
		imagepng( $png, $dir . '/plain.png' );
		file_put_contents( $dir . '/boxed.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 272 92"><path d="M0 0"/></svg>' );
		file_put_contents( $dir . '/bare.svg', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>' );
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-image-dimensions.php';
	}

	public function test_attachment_copy_reports_the_size_of_that_file(): void {
		$this->assertSame( array( 300, 150 ), sgs_image_intrinsic_size( 'https://example.test/wp-content/uploads/library-300x150.jpg' ) );
	}

	public function test_non_attachment_image_reads_its_file_header(): void {
		$this->assertSame( array( 40, 20 ), sgs_image_intrinsic_size( 'https://example.test/wp-content/uploads/plain.png' ) );
		$this->assertSame( ' width="40" height="20"', sgs_image_size_attrs( 'https://example.test/wp-content/uploads/plain.png' ) );
	}

	public function test_svg_uses_its_viewbox_and_never_a_guess(): void {
		$this->assertSame( array( 272, 92 ), sgs_image_intrinsic_size( 'https://example.test/wp-content/uploads/boxed.svg' ) );
		$this->assertNull( sgs_image_intrinsic_size( 'https://example.test/wp-content/uploads/bare.svg' ) );
		$this->assertSame( '', sgs_image_size_attrs( 'https://example.test/wp-content/uploads/bare.svg' ) );
	}

	public function test_remote_url_and_path_escape_get_no_attributes(): void {
		$this->assertSame( '', sgs_image_size_attrs( 'https://cdn.example.org/a.jpg' ) );
		$this->assertSame( '', sgs_image_size_attrs( 'https://example.test/wp-content/../wp-config.php' ) );
	}

	public function test_render_media_prints_both_attributes_for_a_non_attachment_url(): void {
		if ( ! class_exists( 'SGS_Breakpoints' ) ) {
			require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
		}
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-media.php';
		$html = sgs_render_media( array( 'url' => 'https://example.test/wp-content/uploads/plain.png', 'alt' => 'x' ), 'sgs-brand-strip' );
		$this->assertStringContainsString( ' width="40" height="20"', $html );
	}
}

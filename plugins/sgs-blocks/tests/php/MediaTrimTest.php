<?php
/**
 * "Trim empty edges": Sgs_Media_Trim::trim_file() crops transparent and near-white margins with Imagick.
 *
 * Needs the Imagick extension (skipped without it: the Windows PHP has only GD; the WSL PHP of the local mirrors has it).
 * Run with: vendor/bin/phpunit --filter MediaTrimTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

if ( ! class_exists( 'WP_Error' ) ) {
	/** Minimal stand-in for the WordPress error class. */
	class WP_Error {
		/** @var string */
		private $code;

		/**
		 * @param string $code Error code.
		 */
		public function __construct( $code = '' ) {
			$this->code = $code;
		}

		/** @return string */
		public function get_error_code() {
			return $this->code;
		}
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-media-trim.php';

use SGS\Blocks\Sgs_Media_Trim;

/**
 * Trim behaviour.
 */
final class MediaTrimTest extends TestCase {

	/** @var string[] Files to remove. */
	private array $files = array();

	protected function setUp(): void {
		if ( ! Sgs_Media_Trim::available() ) {
			$this->markTestSkipped( 'Imagick is not loaded on this PHP.' );
		}
	}

	protected function tearDown(): void {
		foreach ( $this->files as $file ) {
			if ( is_file( $file ) ) {
				unlink( $file );
			}
		}
	}

	/**
	 * A file path in the temp folder that is removed after the test.
	 *
	 * @param string $ext Extension.
	 * @return string
	 */
	private function tmp( string $ext ): string {
		$path          = sys_get_temp_dir() . '/sgs-trim-' . uniqid( '', true ) . '.' . $ext;
		$this->files[] = $path;
		return $path;
	}

	/**
	 * A picture: a dark block on a margin of one colour.
	 *
	 * @param string $format Image format ('png' or 'jpg').
	 * @param string $margin Margin colour (e.g. 'none' or '#fbfbfb').
	 * @param int    $w      Picture width.
	 * @param int    $h      Picture height.
	 * @param int    $pad    Margin on every side.
	 * @return string The file.
	 */
	private function picture( string $format, string $margin, int $w, int $h, int $pad ): string {
		$im = new Imagick();
		$im->newImage( $w, $h, new ImagickPixel( $margin ), $format );
		$block = new ImagickDraw();
		$block->setFillColor( new ImagickPixel( '#1b2a41' ) );
		$block->rectangle( $pad, $pad, $w - $pad - 1, $h - $pad - 1 );
		$im->drawImage( $block );
		$file = $this->tmp( $format );
		$im->writeImage( $file );
		$im->clear();
		return $file;
	}

	public function test_a_transparent_margin_is_trimmed_to_the_picture(): void {
		$out = $this->tmp( 'png' );
		$res = Sgs_Media_Trim::trim_file( $this->picture( 'png', 'none', 100, 60, 20 ), $out );

		$this->assertIsArray( $res );
		$this->assertSame( 60, $res['width'], 'a 100 x 60 file with a 20px margin keeps its 60 x 20 block' );
		$this->assertSame( 20, $res['height'] );
		$this->assertSame( 100, $res['from_width'] );
		$this->assertSame( array( 20, 20 ), array( $res['left'], $res['top'] ), 'where the kept part started in the original, so a focal point can follow it' );
		$this->assertSame( array( 60, 20 ), array_slice( getimagesize( $out ), 0, 2 ), 'the copy on disk is the cropped size' );
	}

	public function test_a_near_white_margin_is_trimmed_through_the_fuzz(): void {
		$out = $this->tmp( 'jpg' );
		$res = Sgs_Media_Trim::trim_file( $this->picture( 'jpg', '#fbfbfb', 120, 80, 25 ), $out );

		$this->assertIsArray( $res );
		$this->assertEqualsWithDelta( 70, $res['width'], 3, 'JPEG noise around the margin does not stop the trim' );
		$this->assertEqualsWithDelta( 30, $res['height'], 3 );
	}

	public function test_a_picture_with_no_margin_is_refused_and_no_copy_is_written(): void {
		// A checkerboard reaches every edge with contrast: nothing at the border is empty.
		$im = new Imagick();
		$im->newPseudoImage( 60, 40, 'pattern:checkerboard' );
		$im->setImageFormat( 'png' );
		$file = $this->tmp( 'png' );
		$im->writeImage( $file );
		$out = $this->tmp( 'png' );
		$res = Sgs_Media_Trim::trim_file( $file, $out );

		$this->assertInstanceOf( WP_Error::class, $res );
		$this->assertSame( 'sgs_trim_nothing', $res->get_error_code() );
		$this->assertFileDoesNotExist( $out );
	}

	public function test_a_picture_that_is_all_margin_is_refused(): void {
		$im = new Imagick();
		$im->newImage( 40, 40, new ImagickPixel( 'white' ), 'png' );
		$file = $this->tmp( 'png' );
		$im->writeImage( $file );
		$out = $this->tmp( 'png' );
		$res = Sgs_Media_Trim::trim_file( $file, $out );

		$this->assertInstanceOf( WP_Error::class, $res );
		$this->assertSame( 'sgs_trim_blank', $res->get_error_code() );
		$this->assertFileDoesNotExist( $out );
	}

	public function test_a_pale_logo_is_not_trimmed_away(): void {
		// A light grey block (#d8d8d8) on white is 15% from white: well outside the 3% fuzz.
		$im = new Imagick();
		$im->newImage( 80, 60, new ImagickPixel( '#ffffff' ), 'png' );
		$block = new ImagickDraw();
		$block->setFillColor( new ImagickPixel( '#d8d8d8' ) );
		$block->rectangle( 10, 10, 69, 49 );
		$im->drawImage( $block );
		$file = $this->tmp( 'png' );
		$im->writeImage( $file );
		$res = Sgs_Media_Trim::trim_file( $file, $this->tmp( 'png' ) );

		$this->assertIsArray( $res );
		$this->assertSame( array( 60, 40 ), array( $res['width'], $res['height'] ) );
	}
}

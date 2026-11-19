<?php
/**
 * Stand-ins for the WordPress functions and core's Imagick editor that MediaSaveFallbackTest needs (no WordPress runs).
 *
 * @package SGS\Blocks\Tests
 */

// PHPUnit fixture, not shipped code.
// phpcs:disable

	function apply_filters( string $hook, $value ) { return $value; }
	function add_filter(): void {}
	function wp_image_editor_supports( array $args ): bool { return ! empty( $GLOBALS['sgs_test_supports'][ $args['mime_type'] ] ); }
	function is_wp_error( $v ): bool { return $v instanceof WP_Error; }
	function wp_filesize( string $p ): int { return file_exists( $p ) ? (int) filesize( $p ) : 0; }
	function wp_delete_file( string $p ): void { @unlink( $p ); }
	function wp_normalize_path( string $p ): string { return str_replace( '\\', '/', $p ); }
	function trailingslashit( string $p ): string { return rtrim( $p, '/\\' ) . '/'; }
	class WP_Error {
		public function __construct( private string $code = '', private string $message = '', private $data = '' ) {}
		public function get_error_message(): string { return $this->message; }
		public function get_error_data() { return $this->data; }
	}
	// Core's Imagick editor, reduced to what the fallback touches.
	class WP_Image_Editor_Imagick {
		public string $mime_type = 'image/png';
		public int $width        = 0;
		protected function supports_mime_type( string $m ): bool { return ! empty( $GLOBALS['sgs_test_supports'][ $m ] ); }
		protected function get_output_format( $filename = null, $mime_type = null ): array {
			$mime = $mime_type ?: $this->mime_type;
			$map  = Sgs_Media_Formats::output_format( array(), $filename, $mime );
			if ( isset( $map[ $mime ] ) ) {
				$mime = $map[ $mime ];
			}
			$ext = array( 'image/avif' => 'avif', 'image/webp' => 'webp', 'image/png' => 'png', 'image/jpeg' => 'jpg' )[ $mime ];
			return array( $filename, $ext, $mime );
		}
		protected function _save( $image, $filename = null, $mime_type = null ) {
			list( , $ext, $mime ) = $this->get_output_format( $filename, $mime_type );
			$GLOBALS['sgs_test_calls'][] = $mime;
			$path = $GLOBALS['sgs_test_dir'] . 'photo-' . $this->width . 'x' . $this->width . '.' . $ext;
			if ( $this->width >= 600 && in_array( $mime, $GLOBALS['sgs_test_failing'], true ) ) {
				file_put_contents( $path, '' );
				if ( 'throw' === $GLOBALS['sgs_test_mode'] ) {
					return new WP_Error( 'image_save_error', 'Encoder plugin generated an error: Encoding problem: Tile encoder thread creation failed (8.5002)', $path );
				}
			} else {
				file_put_contents( $path, str_repeat( 'x', 100 ) );
			}
			return array( 'path' => $path, 'file' => basename( $path ), 'width' => $this->width, 'height' => $this->width, 'mime-type' => $mime, 'filesize' => wp_filesize( $path ) );
		}
	}
	class WP_Image_Editor_GD extends WP_Image_Editor_Imagick {}

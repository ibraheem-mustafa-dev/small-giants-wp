<?php
/**
 * Modern image formats for uploads (Spec 49 FR-49-42).
 *
 * Every resized copy WordPress makes of an uploaded JPEG or PNG is saved as AVIF (quality 60) where the server's image
 * editor supports AVIF, else WebP (quality 82), through core's `image_editor_output_format` and `wp_editor_set_quality`
 * filters. The original upload, the attachment's main (full-size) file and the big-image `-scaled` copy keep their format, because
 * social previews, email clients and outside tools do not accept AVIF. A converted copy that is larger than
 * its source is replaced by a copy in the source format: a JPEG source is compared with the original file's bytes; a PNG
 * source is compared with the same size encoded as PNG (growth is common for flat graphics).
 *
 * Filters: `sgs_media_modern_formats` (bool, default true; false switches the feature off), `sgs_media_avif_quality`
 * (default 60), `sgs_media_webp_quality` (default 82).
 *
 * @package SGS\Blocks
 */

declare( strict_types=1 );

defined( 'ABSPATH' ) || exit;

/**
 * Format mapping, quality and the larger-than-source discard.
 */
final class Sgs_Media_Formats {

	private const AVIF_QUALITY = 60;
	private const WEBP_QUALITY = 82;
	private const SOURCES      = array( 'image/jpeg', 'image/png' );

	/**
	 * True while a source-format twin is being written, so the mapping stays out of the way.
	 *
	 * @var bool
	 */
	private static bool $bypass = false;

	/**
	 * Editor support per MIME type, for this request.
	 *
	 * @var array<string, bool>
	 */
	private static array $supports = array();

	/**
	 * Hook the feature into core.
	 */
	public static function register(): void {
		add_filter( 'image_editor_output_format', array( self::class, 'output_format' ), 10, 3 );
		add_filter( 'wp_editor_set_quality', array( self::class, 'quality' ), 10, 2 );
		add_filter( 'wp_generate_attachment_metadata', array( self::class, 'discard_oversized' ), 20, 2 );
	}

	/**
	 * Whether the feature is on.
	 */
	public static function enabled(): bool {
		return (bool) apply_filters( 'sgs_media_modern_formats', true );
	}

	/**
	 * The modern MIME type this server can write, or '' when none.
	 */
	public static function target_mime(): string {
		foreach ( array( 'image/avif', 'image/webp' ) as $mime ) {
			if ( ! isset( self::$supports[ $mime ] ) ) {
				self::$supports[ $mime ] = (bool) wp_image_editor_supports( array( 'mime_type' => $mime ) );
			}
			if ( self::$supports[ $mime ] ) {
				return $mime;
			}
		}
		return '';
	}

	/**
	 * Forget the per-request support cache.
	 */
	public static function reset(): void {
		self::$supports = array();
		self::$bypass   = false;
	}

	/**
	 * `image_editor_output_format`: JPEG and PNG resized sub-sizes (saved without a destination name) become AVIF, else WebP.
	 *
	 * @param mixed       $map       Existing source to output MIME map.
	 * @param string|null $filename  Destination path.
	 * @param string|null $mime_type Source MIME type.
	 * @return array<string, string>
	 */
	public static function output_format( $map, $filename = null, $mime_type = null ): array {
		$map = is_array( $map ) ? $map : array();
		if ( self::$bypass || ! self::enabled() || ! in_array( $mime_type, self::SOURCES, true ) ) {
			return $map;
		}
		// Resized sub-sizes are saved without a destination name; the full-size copy, the `-scaled` copy and the
		// conversion check carry one. Only the unnamed saves convert.
		if ( null !== $filename ) {
			return $map;
		}
		$target = self::target_mime();
		if ( '' !== $target ) {
			$map[ $mime_type ] = $target;
		}
		return $map;
	}

	/**
	 * `wp_editor_set_quality`: per output MIME type.
	 *
	 * @param mixed  $quality   Current quality.
	 * @param string $mime_type Output MIME type.
	 * @return int
	 */
	public static function quality( $quality, $mime_type = '' ): int {
		$quality = (int) $quality;
		if ( ! self::enabled() ) {
			return $quality;
		}
		if ( 'image/avif' === $mime_type ) {
			return (int) apply_filters( 'sgs_media_avif_quality', self::AVIF_QUALITY );
		}
		if ( 'image/webp' === $mime_type ) {
			return (int) apply_filters( 'sgs_media_webp_quality', self::WEBP_QUALITY );
		}
		return $quality;
	}

	/**
	 * `wp_generate_attachment_metadata`: replace a converted copy that is larger than its source.
	 *
	 * @param mixed $metadata      Attachment metadata.
	 * @param int   $attachment_id Attachment ID.
	 * @return mixed
	 */
	public static function discard_oversized( $metadata, $attachment_id = 0 ) {
		if ( ! is_array( $metadata ) || empty( $metadata['sizes'] ) || ! self::enabled() ) {
			return $metadata;
		}
		$source_mime = (string) get_post_mime_type( (int) $attachment_id );
		$original    = (string) get_attached_file( (int) $attachment_id );
		if ( ! in_array( $source_mime, self::SOURCES, true ) || '' === $original ) {
			return $metadata;
		}
		$dir         = trailingslashit( dirname( $original ) );
		$source_path = (string) wp_get_original_image_path( (int) $attachment_id );
		if ( '' === $source_path ) {
			$source_path = $original;
		}
		$source_size = (int) wp_filesize( $source_path );
		$registered  = function_exists( 'wp_get_registered_image_subsizes' ) ? wp_get_registered_image_subsizes() : array();

		foreach ( $metadata['sizes'] as $name => $size ) {
			$mime = (string) ( $size['mime-type'] ?? '' );
			if ( $mime === $source_mime || empty( $size['file'] ) || ! in_array( $mime, array( 'image/avif', 'image/webp' ), true ) ) {
				continue;
			}
			$converted_path = $dir . $size['file'];
			$converted_size = (int) wp_filesize( $converted_path );
			$crop           = $registered[ $name ]['crop'] ?? false;
			$twin           = null;
			$grew           = false;
			if ( 'image/png' === $source_mime ) {
				$twin = self::source_twin( $source_path, $source_mime, $size, $crop );
				$grew = null !== $twin && $twin['bytes'] < $converted_size;
			} elseif ( $source_size > 0 && $converted_size > $source_size ) {
				$twin = self::source_twin( $source_path, $source_mime, $size, $crop );
				$grew = null !== $twin;
			}
			if ( $grew ) {
				wp_delete_file( $converted_path );
				$metadata['sizes'][ $name ]['file']      = $twin['file'];
				$metadata['sizes'][ $name ]['mime-type'] = $source_mime;
				$metadata['sizes'][ $name ]['filesize']  = $twin['bytes'];
			} elseif ( null !== $twin ) {
				wp_delete_file( $twin['path'] );
			}
		}
		return $metadata;
	}

	/**
	 * Write one size in the source format, next to the converted copy.
	 *
	 * @param string                  $original Source image path.
	 * @param string                  $mime     Source MIME type.
	 * @param array<string, mixed>    $size     The metadata entry (width, height).
	 * @param bool|array<int, string> $crop     The size's crop setting.
	 * @return array{file: string, path: string, bytes: int}|null
	 */
	private static function source_twin( string $original, string $mime, array $size, $crop ): ?array {
		self::$bypass = true;
		try {
			$editor = wp_get_image_editor( $original );
			if ( is_wp_error( $editor ) || is_wp_error( $editor->resize( (int) $size['width'], (int) $size['height'], $crop ) ) ) {
				return null;
			}
			$ext   = 'image/png' === $mime ? 'png' : 'jpg';
			$saved = $editor->save( $editor->generate_filename( null, null, $ext ), $mime );
		} finally {
			self::$bypass = false;
		}
		if ( is_wp_error( $saved ) || empty( $saved['path'] ) ) {
			return null;
		}
		return array(
			'file'  => wp_basename( $saved['path'] ),
			'path'  => $saved['path'],
			'bytes' => (int) wp_filesize( $saved['path'] ),
		);
	}
}

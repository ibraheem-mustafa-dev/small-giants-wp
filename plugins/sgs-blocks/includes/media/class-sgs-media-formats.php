<?php
/**
 * Modern image formats for uploads (Spec 49 FR-49-42).
 *
 * Every resized copy WordPress makes of an uploaded JPEG or PNG is saved as AVIF (quality 60) where the server's image
 * editor supports AVIF, else WebP (quality 82), through core's `image_editor_output_format` and `wp_editor_set_quality`
 * filters. The original upload, the attachment's main (full-size) file and the big-image `-scaled` copy keep their format, because
 * social previews, email clients and outside tools do not accept AVIF, and every address saved outside the site keeps working.
 *
 * The main file also gets a copy in the modern format at its own size (`add_full_copy`), held under its own metadata key
 * `sgs-full-modern` with the name of the file it was made from, and kept only when it is smaller. It is not in `sizes`, so
 * no size lookup (`image_get_intermediate_size`, used by social-preview and email plugins) is handed the AVIF. Core's srcset
 * ends with the main file at its own width, so `srcset_full_copy` points that entry at the copy: a phone that wants the
 * widest candidate downloads the AVIF, not the JPEG. `delete_full_copy` deletes it with the attachment. A converted copy that is larger than
 * its source is replaced by a copy in the source format: a JPEG source is compared with the original file's bytes; a PNG
 * source is compared with the same size encoded as PNG (growth is common for flat graphics).
 *
 * A copy whose save fails (an encoder error, or a file of 0 bytes) is saved again as WebP, then in the source format, by the editor
 * subclasses in `class-sgs-media-editors.php` (`Sgs_Media_Save_Fallback::_save`); `editors()` swaps them in.
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

	/** The metadata key that holds the main file's copy in the modern format (outside `sizes`, so no size lookup returns it). */
	public const FULL_COPY = 'sgs-full-modern';

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
		add_filter( 'wp_generate_attachment_metadata', array( self::class, 'add_full_copy' ), 30, 2 );
		add_filter( 'wp_calculate_image_srcset', array( self::class, 'srcset_full_copy' ), 10, 5 );
		add_action( 'delete_attachment', array( self::class, 'delete_full_copy' ) );
		add_filter( 'wp_image_editors', array( self::class, 'editors' ), 99 );
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
	 * `wp_image_editors`: use the editor subclasses that fall back when a resized copy fails to save.
	 *
	 * @param mixed $editors Editor class names, in order of preference.
	 * @return mixed
	 */
	public static function editors( $editors ) {
		if ( ! is_array( $editors ) || ! self::enabled() ) {
			return $editors;
		}
		require_once __DIR__ . '/class-sgs-media-editors.php';
		$swap = array(
			'WP_Image_Editor_Imagick' => 'Sgs_Media_Imagick_Editor',
			'WP_Image_Editor_GD'      => 'Sgs_Media_Gd_Editor',
		);
		foreach ( $editors as $i => $class ) {
			if ( isset( $swap[ $class ] ) && class_exists( $swap[ $class ], false ) ) {
				$editors[ $i ] = $swap[ $class ];
			}
		}
		return $editors;
	}

	/**
	 * Switch the format mapping off or on (the fallback's retry in the source format must not convert again).
	 *
	 * @param bool $on True to bypass the mapping.
	 */
	public static function bypass( bool $on ): void {
		self::$bypass = $on;
	}

	/**
	 * Whether an editor save left no usable copy: an error, no path, or an empty or missing file.
	 *
	 * @param mixed $saved The editor's `_save()` result.
	 */
	public static function save_failed( $saved ): bool {
		if ( is_wp_error( $saved ) || ! is_array( $saved ) || empty( $saved['path'] ) ) {
			return true;
		}
		clearstatcache( true, (string) $saved['path'] );
		return (int) wp_filesize( (string) $saved['path'] ) <= 0;
	}

	/**
	 * Delete the file a failed save left behind when it is empty (the error's data or the result's path names it).
	 *
	 * @param mixed $saved The editor's `_save()` result.
	 */
	public static function remove_empty( $saved ): void {
		$path = '';
		if ( is_wp_error( $saved ) ) {
			$data = $saved->get_error_data();
			$path = is_string( $data ) ? $data : '';
		} elseif ( is_array( $saved ) && ! empty( $saved['path'] ) ) {
			$path = (string) $saved['path'];
		}
		clearstatcache( true, $path );
		if ( '' !== $path && file_exists( $path ) && 0 === (int) filesize( $path ) ) {
			wp_delete_file( $path );
		}
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
				// Kept in the source format on purpose, so `wp sgs media modernise` does not convert it again.
				$metadata['sizes'][ $name ]['sgs_source_kept'] = true;
			} elseif ( null !== $twin ) {
				wp_delete_file( $twin['path'] );
			}
		}
		return $metadata;
	}

	/**
	 * `wp_generate_attachment_metadata`: save the main (full-size) file again in the modern format, as the size
	 * `sgs-full-modern`, when the copy is smaller than the main file.
	 *
	 * The copy is saved like a resized copy (no destination name, so it is named `<name>-<width>x<height>.<ext>` and an
	 * AVIF encoder failure falls back to WebP); a copy that comes back in the source format, fails, or is not smaller is
	 * deleted. `sgs_full_copy_checked` records the main file the decision was made for, so `wp sgs media modernise` skips an
	 * attachment whose copy was not kept.
	 *
	 * @param mixed $metadata      Attachment metadata.
	 * @param int   $attachment_id Attachment ID.
	 * @return mixed
	 */
	public static function add_full_copy( $metadata, $attachment_id = 0 ) {
		if ( ! is_array( $metadata ) || ! self::enabled() || empty( $metadata['file'] ) ) {
			return $metadata;
		}
		$id          = (int) $attachment_id;
		$source_mime = (string) get_post_mime_type( $id );
		$main        = (string) get_attached_file( $id );
		$target      = self::target_mime();
		if ( ! in_array( $source_mime, self::SOURCES, true ) || '' === $main || '' === $target || ! file_exists( $main ) ) {
			return $metadata;
		}
		$base = wp_basename( $main );
		$dir  = trailingslashit( dirname( $main ) );
		// A copy recorded in the size list (before 2026-11-21) moves to its own key.
		if ( isset( $metadata['sizes'][ self::FULL_COPY ] ) ) {
			$metadata[ self::FULL_COPY ] = $metadata[ self::FULL_COPY ] ?? $metadata['sizes'][ self::FULL_COPY ];
			unset( $metadata['sizes'][ self::FULL_COPY ] );
		}
		$copy = $metadata[ self::FULL_COPY ] ?? null;
		if ( is_array( $copy ) && ! empty( $copy['file'] ) ) {
			if ( ( $copy['source'] ?? '' ) === $base && file_exists( $dir . wp_basename( (string) $copy['file'] ) ) ) {
				return $metadata;
			}
			// A copy of an older main file (the image was edited since): nothing points at it once replaced.
			if ( ( $copy['source'] ?? '' ) !== $base ) {
				wp_delete_file( $dir . wp_basename( (string) $copy['file'] ) );
			}
		}
		unset( $metadata[ self::FULL_COPY ] );

		$editor = wp_get_image_editor( $main );
		if ( is_wp_error( $editor ) ) {
			return $metadata; // Not marked as checked: the next modernise run tries again.
		}
		$saved = $editor->save( null, $target );
		if ( self::save_failed( $saved ) ) {
			self::remove_empty( $saved );
			return $metadata;
		}
		$path                              = (string) $saved['path'];
		$mime                              = (string) ( $saved['mime-type'] ?? '' );
		$bytes                             = (int) wp_filesize( $path );
		$metadata['sgs_full_copy_checked'] = $base;
		if ( ! in_array( $mime, array( 'image/avif', 'image/webp' ), true ) || $bytes >= (int) wp_filesize( $main ) ) {
			wp_delete_file( $path );
			return $metadata;
		}
		$metadata[ self::FULL_COPY ] = array(
			'file'      => wp_basename( $path ),
			'width'     => (int) ( $saved['width'] ?? 0 ),
			'height'    => (int) ( $saved['height'] ?? 0 ),
			'mime-type' => $mime,
			'filesize'  => $bytes,
			'source'    => $base,
		);
		return $metadata;
	}

	/**
	 * `delete_attachment`: delete the main file's modern-format copy with the attachment (it is not a registered size, so
	 * core does not know it).
	 *
	 * @param mixed $post_id Attachment ID.
	 */
	public static function delete_full_copy( $post_id ): void {
		$meta = wp_get_attachment_metadata( (int) $post_id );
		$copy = is_array( $meta ) ? ( $meta[ self::FULL_COPY ] ?? ( $meta['sizes'][ self::FULL_COPY ] ?? null ) ) : null;
		$main = (string) get_attached_file( (int) $post_id );
		if ( ! is_array( $copy ) || empty( $copy['file'] ) || '' === $main ) {
			return;
		}
		wp_delete_file( trailingslashit( dirname( $main ) ) . wp_basename( (string) $copy['file'] ) );
	}

	/**
	 * `wp_calculate_image_srcset`: the main file's entry points at its modern-format copy.
	 *
	 * Core adds the main file last and lets it win its width, so the copy (same width) never shows on its own. Only a copy
	 * made from the current main file is used (an image edited since has a new main file).
	 *
	 * @param mixed $sources       Candidates by width: array( url, descriptor, value ).
	 * @param mixed $size_array    Requested width and height.
	 * @param mixed $image_src     The `src`.
	 * @param mixed $image_meta    Attachment metadata.
	 * @param int   $attachment_id Attachment ID.
	 * @return mixed
	 */
	public static function srcset_full_copy( $sources, $size_array = array(), $image_src = '', $image_meta = array(), $attachment_id = 0 ) {
		unset( $size_array, $image_src, $attachment_id );
		if ( ! is_array( $sources ) || ! is_array( $image_meta ) || empty( $image_meta['file'] ) || ! self::enabled() ) {
			return $sources;
		}
		$copy = $image_meta[ self::FULL_COPY ] ?? null;
		$base = wp_basename( (string) $image_meta['file'] );
		if ( ! is_array( $copy ) || empty( $copy['file'] ) || ( $copy['source'] ?? '' ) !== $base ) {
			return $sources;
		}
		foreach ( $sources as $width => $source ) {
			$url = (string) ( $source['url'] ?? '' );
			if ( str_ends_with( $url, '/' . $base ) ) {
				$sources[ $width ]['url'] = substr( $url, 0, -strlen( $base ) ) . $copy['file'];
			}
		}
		return $sources;
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

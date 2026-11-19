<?php
/**
 * Save fallback for resized copies (Spec 49 FR-49-42).
 *
 * Used by the image editor subclasses in `class-sgs-media-editors.php`. A resized copy whose save fails (the encoder throws,
 * or the file is empty) is saved again as WebP, then in the upload's own format. A file of 0 bytes is never left on disk, and
 * the editor returns the real file, MIME type and size, so core's metadata always names a file that exists.
 *
 * On shared hosting the AVIF encoder (libheif with libaom) can fail at 600px and wider with "Tile encoder thread creation
 * failed" when the account's thread limit is reached. ImageMagick passes only `heic:speed` and `heic:chroma` to the encoder,
 * so its thread count cannot be capped from PHP; the fallback is the fix.
 *
 * @package SGS\Blocks
 */

declare( strict_types=1 );

defined( 'ABSPATH' ) || exit;

/**
 * Wraps `_save()` of a core image editor.
 */
trait Sgs_Media_Save_Fallback {

	/**
	 * Save an image; a resized copy that fails to save is retried as WebP, then in the source format.
	 *
	 * @param mixed       $image     The editor's image object or resource.
	 * @param string|null $filename  Destination path; null for a resized copy.
	 * @param string|null $mime_type Requested MIME type.
	 * @return array<string, mixed>|WP_Error
	 */
	protected function _save( $image, $filename = null, $mime_type = null ) { // phpcs:ignore PSR2.Methods.MethodDeclaration.Underscore
		$saved = parent::_save( $image, $filename, $mime_type );
		if ( null !== $filename || ! Sgs_Media_Formats::enabled() || ! Sgs_Media_Formats::save_failed( $saved ) ) {
			return $saved;
		}
		Sgs_Media_Formats::remove_empty( $saved );

		list( , , $attempted ) = $this->get_output_format( null, $mime_type );
		foreach ( array_unique( array( 'image/webp', (string) $this->mime_type ) ) as $candidate ) {
			if ( $candidate === $attempted || ! $this->supports_mime_type( $candidate ) ) {
				continue;
			}
			Sgs_Media_Formats::bypass( true );
			try {
				$retry = parent::_save( $image, null, $candidate );
			} finally {
				Sgs_Media_Formats::bypass( false );
			}
			if ( ! Sgs_Media_Formats::save_failed( $retry ) ) {
				return $retry;
			}
			Sgs_Media_Formats::remove_empty( $retry );
		}
		return $saved;
	}
}

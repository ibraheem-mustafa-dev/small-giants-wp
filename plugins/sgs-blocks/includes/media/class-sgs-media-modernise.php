<?php
/**
 * Regenerates existing attachments' resized copies in the modern formats (Spec 49 FR-49-42).
 *
 * Behind `wp sgs media modernise`. Old resized files stay on disk (the `--skip-delete` behaviour of `wp media regenerate`),
 * so saved URLs that name one still resolve. Work runs on one thread, in batches, ordered by attachment ID and resumable
 * through `--after=<id>`.
 *
 * @package SGS\Blocks
 */

declare( strict_types=1 );

defined( 'ABSPATH' ) || exit;

/**
 * Selection and regeneration for the modernise command.
 */
final class Sgs_Media_Modernise {

	/**
	 * Attachment IDs that still hold JPEG or PNG resized copies, after `$after`, oldest first.
	 *
	 * @param int $after Last ID already handled.
	 * @param int $limit Batch size.
	 * @return int[]
	 */
	public static function pending_ids( int $after, int $limit ): array {
		global $wpdb;
		$ids     = array();
		$last    = $after;
		$chunk   = max( 50, $limit * 5 );
		$targets = array( 'image/avif', 'image/webp' );
		$found   = 0;
		while ( $found < $limit ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$rows = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT ID FROM {$wpdb->posts} WHERE post_type = 'attachment' AND post_mime_type IN ('image/jpeg','image/png') AND ID > %d ORDER BY ID ASC LIMIT %d",
					$last,
					$chunk
				)
			);
			if ( empty( $rows ) ) {
				break;
			}
			foreach ( $rows as $row ) {
				$last = (int) $row;
				$meta = wp_get_attachment_metadata( $last );
				if ( ! is_array( $meta ) || empty( $meta['sizes'] ) ) {
					continue;
				}
				$mimes = array_unique( array_column( $meta['sizes'], 'mime-type' ) );
				if ( array_diff( $mimes, $targets ) ) {
					$ids[] = $last;
					++$found;
					if ( $found >= $limit ) {
						break 2;
					}
				}
			}
		}
		return $ids;
	}

	/**
	 * Limit the encoder to one thread.
	 */
	public static function single_thread(): void {
		putenv( 'MAGICK_THREAD_LIMIT=1' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.runtime_configuration_putenv
		if ( class_exists( 'Imagick' ) ) {
			\Imagick::setResourceLimit( \Imagick::RESOURCETYPE_THREAD, 1 );
		}
	}

	/**
	 * Rebuild one attachment's resized copies; old files are kept.
	 *
	 * @param int $id Attachment ID.
	 * @return array<string, mixed>|WP_Error The new sizes: name => array( mime, bytes ).
	 */
	public static function regenerate( int $id ) {
		$file = get_attached_file( $id );
		if ( ! is_string( $file ) || ! file_exists( $file ) ) {
			return new WP_Error( 'sgs_media_missing_file', 'The attached file is missing on disk.' );
		}
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$meta = wp_get_attachment_metadata( $id );
		if ( ! is_array( $meta ) ) {
			return new WP_Error( 'sgs_media_no_meta', 'The attachment has no image metadata.' );
		}
		$meta['sizes'] = array();
		wp_update_attachment_metadata( $id, $meta );
		$new = wp_create_image_subsizes( $file, $id );
		if ( ! is_array( $new ) ) {
			return new WP_Error( 'sgs_media_regenerate_failed', 'WordPress could not make the resized copies.' );
		}
		$new = Sgs_Media_Formats::discard_oversized( $new, $id );
		wp_update_attachment_metadata( $id, $new );
		$out = array();
		foreach ( (array) ( $new['sizes'] ?? array() ) as $name => $size ) {
			$out[ $name ] = array(
				'mime'  => (string) ( $size['mime-type'] ?? '' ),
				'bytes' => (int) ( $size['filesize'] ?? 0 ),
			);
		}
		return $out;
	}
}

<?php
/**
 * Regenerates existing attachments' resized copies in the modern formats (Spec 49 FR-49-42).
 *
 * Behind `wp sgs media modernise`. Old resized files stay on disk (the `--skip-delete` behaviour of `wp media regenerate`),
 * so saved URLs that name one still resolve. Work runs on one thread, in batches, ordered by attachment ID and resumable
 * through `--after=<id>`. With `--repair` it selects only attachments that hold a 0-byte or missing resized copy, or lack a
 * registered size, and regenerates just those sizes (`repair_ids`, `repair`).
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

	/**
	 * What is wrong with one attachment's resized copies: 0-byte or missing files, and registered sizes absent from the metadata.
	 *
	 * @param int $id Attachment ID.
	 * @return array{empty: string[], missing: string[]} `empty`: paths of 0-byte files (named in the metadata or left beside
	 *         the original by a failed save); `missing`: size names with no usable file.
	 */
	public static function repair_problems( int $id ): array {
		$out  = array(
			'empty'   => array(),
			'missing' => array(),
		);
		$meta = wp_get_attachment_metadata( $id );
		$file = get_attached_file( $id );
		if ( ! is_array( $meta ) || ! is_string( $file ) || '' === $file ) {
			return $out;
		}
		$dir      = trailingslashit( dirname( $file ) );
		$original = (string) wp_get_original_image_path( $id );
		$base     = pathinfo( '' !== $original ? $original : $file, PATHINFO_FILENAME );
		clearstatcache();
		foreach ( (array) ( $meta['sizes'] ?? array() ) as $name => $size ) {
			$path = $dir . (string) ( $size['file'] ?? '' );
			if ( empty( $size['file'] ) || ! file_exists( $path ) ) {
				$out['missing'][] = (string) $name;
			} elseif ( 0 === (int) filesize( $path ) ) {
				$out['empty'][]   = $path;
				$out['missing'][] = (string) $name;
			}
		}
		// The glob also finds another upload's copies when its name starts with this one's ("photo-2-300x200.jpg" for
		// "photo.jpg"), so a file counts only when nothing but "<width>x<height>.<ext>" follows the name.
		$pattern = addcslashes( wp_normalize_path( $dir . $base ), '[]*?' ) . '-*x*.*';
		$own     = '/^' . preg_quote( $base, '/' ) . '-\d+x\d+\.[a-z0-9]+$/i';
		$known   = array_map( 'wp_normalize_path', $out['empty'] );
		foreach ( (array) glob( $pattern ) as $path ) {
			if ( 1 !== preg_match( $own, basename( (string) $path ) ) ) {
				continue;
			}
			if ( is_file( $path ) && 0 === (int) filesize( $path ) && ! in_array( wp_normalize_path( $path ), $known, true ) ) {
				$out['empty'][] = $path;
			}
		}
		if ( ! function_exists( 'wp_get_missing_image_subsizes' ) ) {
			require_once ABSPATH . 'wp-admin/includes/image.php';
		}
		foreach ( array_keys( (array) wp_get_missing_image_subsizes( $id ) ) as $name ) {
			if ( ! in_array( (string) $name, $out['missing'], true ) ) {
				$out['missing'][] = (string) $name;
			}
		}
		return $out;
	}

	/**
	 * Attachment IDs with a 0-byte or missing resized copy, or a registered size absent from their metadata, after `$after`.
	 *
	 * @param int $after Last ID already handled.
	 * @param int $limit Batch size.
	 * @return int[]
	 */
	public static function repair_ids( int $after, int $limit ): array {
		global $wpdb;
		$ids   = array();
		$last  = $after;
		$chunk = max( 50, $limit * 5 );
		$found = 0;
		while ( $found < $limit ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$rows = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT ID FROM {$wpdb->posts} WHERE post_type = 'attachment' AND post_mime_type IN ('image/jpeg','image/png','image/webp','image/avif') AND ID > %d ORDER BY ID ASC LIMIT %d",
					$last,
					$chunk
				)
			);
			if ( empty( $rows ) ) {
				break;
			}
			foreach ( $rows as $row ) {
				$last    = (int) $row;
				$problem = self::repair_problems( $last );
				if ( $problem['empty'] || $problem['missing'] ) {
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
	 * Repair one attachment: delete its 0-byte files, drop the broken sizes from the metadata and make just those sizes again.
	 *
	 * @param int $id Attachment ID.
	 * @return array<string, mixed>|WP_Error The sizes now in the metadata: name => array( mime, bytes ).
	 */
	public static function repair( int $id ) {
		$file = get_attached_file( $id );
		if ( ! is_string( $file ) || ! file_exists( $file ) ) {
			return new WP_Error( 'sgs_media_missing_file', 'The attached file is missing on disk.' );
		}
		if ( ! function_exists( 'wp_update_image_subsizes' ) ) {
			require_once ABSPATH . 'wp-admin/includes/image.php';
		}
		$meta = wp_get_attachment_metadata( $id );
		if ( ! is_array( $meta ) ) {
			return new WP_Error( 'sgs_media_no_meta', 'The attachment has no image metadata.' );
		}
		$problem = self::repair_problems( $id );
		foreach ( $problem['empty'] as $path ) {
			wp_delete_file( $path );
		}
		foreach ( $problem['missing'] as $name ) {
			unset( $meta['sizes'][ $name ] );
		}
		wp_update_attachment_metadata( $id, $meta );
		$new = wp_update_image_subsizes( $id );
		if ( ! is_array( $new ) ) {
			return is_wp_error( $new ) ? $new : new WP_Error( 'sgs_media_regenerate_failed', 'WordPress could not make the resized copies.' );
		}
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

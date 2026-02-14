<?php
/**
 * Handle file uploads for form fields.
 *
 * Validates file size and MIME type, then creates a private
 * attachment post. Returns attachment ID for later reference.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

class Form_Upload {

	/**
	 * Handle file upload from REST request.
	 *
	 * @param \WP_REST_Request $request REST API request object.
	 * @return array|\WP_Error Upload result with id, name, url, size — or error.
	 */
	public static function handle( \WP_REST_Request $request ) {
		$files = $request->get_file_params();

		if ( empty( $files['file'] ) ) {
			return new \WP_Error( 'no_file', __( 'No file was uploaded.', 'sgs-blocks' ) );
		}

		$file = $files['file'];

		// Validate file size.
		$max_size = self::get_max_upload_size();

		if ( $file['size'] > $max_size ) {
			return new \WP_Error(
				'file_too_large',
				sprintf(
					/* translators: %s: maximum file size in MB */
					__( 'File size exceeds maximum allowed (%s MB).', 'sgs-blocks' ),
					size_format( $max_size )
				)
			);
		}

		// Validate MIME type.
		$allowed_types = self::get_allowed_mime_types();
		$file_type     = wp_check_filetype( $file['name'] );

		if ( ! in_array( $file_type['type'], $allowed_types, true ) ) {
			return new \WP_Error(
				'invalid_file_type',
				__( 'File type is not allowed.', 'sgs-blocks' )
			);
		}

		// Upload file using WordPress handler.
		$upload = wp_handle_upload(
			$file,
			[
				'test_form' => false,
			]
		);

		if ( isset( $upload['error'] ) ) {
			return new \WP_Error( 'upload_failed', $upload['error'] );
		}

		// Create attachment post (private so it's not publicly listed).
		$attachment_id = wp_insert_attachment(
			[
				'post_mime_type' => $upload['type'],
				'post_title'     => sanitize_file_name( basename( $upload['file'] ) ),
				'post_content'   => '',
				'post_status'    => 'private',
			],
			$upload['file']
		);

		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}

		// Generate attachment metadata.
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$attach_data = wp_generate_attachment_metadata( $attachment_id, $upload['file'] );
		wp_update_attachment_metadata( $attachment_id, $attach_data );

		return [
			'id'   => $attachment_id,
			'name' => basename( $upload['file'] ),
			'url'  => $upload['url'],
			'size' => filesize( $upload['file'] ),
		];
	}

	/**
	 * Get maximum upload size in bytes.
	 *
	 * @return int Maximum upload size (default 10MB).
	 */
	private static function get_max_upload_size(): int {
		/**
		 * Filter the maximum file upload size for forms.
		 *
		 * @param int $max_size Maximum size in bytes (default 10485760 = 10MB).
		 */
		return apply_filters( 'sgs_form_max_upload_size', 10 * 1024 * 1024 );
	}

	/**
	 * Get allowed MIME types for uploads.
	 *
	 * @return array Allowed MIME types.
	 */
	private static function get_allowed_mime_types(): array {
		/**
		 * Filter allowed MIME types for form uploads.
		 *
		 * @param array $mime_types Allowed MIME types.
		 */
		return apply_filters(
			'sgs_form_allowed_mime_types',
			[
				'image/jpeg',
				'image/png',
				'image/gif',
				'image/webp',
				'application/pdf',
			]
		);
	}
}

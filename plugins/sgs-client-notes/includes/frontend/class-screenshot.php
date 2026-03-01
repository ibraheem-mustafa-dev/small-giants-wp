<?php
/**
 * Frontend: Screenshot Processing
 *
 * @package SGS\ClientNotes
 *
 * @since 1.0.0
 */

namespace SGS\ClientNotes\Frontend;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Screenshot class.
 *
 * @since 1.0.0
 */
class Screenshot {

	/**
	 * Initialise screenshot handling.
	 *
	 * @since 1.0.0
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_upload_endpoint' ) );
	}

	/**
	 * Register REST API endpoint for screenshot upload.
	 *
	 * @since 1.0.0
	 */
	public static function register_upload_endpoint() {
		register_rest_route(
			'sgs-client-notes/v1',
			'/screenshot/upload',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'upload_screenshot' ),
				'permission_callback' => array( __CLASS__, 'upload_permission_check' ),
			)
		);
	}

	/**
	 * Upload screenshot to media library.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public static function upload_screenshot( $request ) {
		$data_uri = $request->get_param( 'image' );

		if ( ! $data_uri ) {
			return new \WP_Error(
				'missing_image',
				__( 'No image data provided.', 'sgs-client-notes' ),
				array( 'status' => 400 )
			);
		}

		// Parse data URI.
		if ( ! preg_match( '/^data:image\/(png|jpeg|jpg);base64,(.+)$/', $data_uri, $matches ) ) {
			return new \WP_Error(
				'invalid_image',
				__( 'Invalid image format. Only PNG and JPEG are supported.', 'sgs-client-notes' ),
				array( 'status' => 400 )
			);
		}

		$image_type = $matches[1];
		$image_data = base64_decode( $matches[2] );

		if ( false === $image_data ) {
			return new \WP_Error(
				'decode_error',
				__( 'Failed to decode image data.', 'sgs-client-notes' ),
				array( 'status' => 400 )
			);
		}

		// Check file size (max 5MB).
		if ( strlen( $image_data ) > 5 * 1024 * 1024 ) {
			return new \WP_Error(
				'file_too_large',
				__( 'Screenshot file size exceeds 5MB limit.', 'sgs-client-notes' ),
				array( 'status' => 413 )
			);
		}

		// Generate filename.
		$filename = sprintf(
			'client-note-%d-%s.%s',
			get_current_user_id(),
			wp_generate_password( 8, false ),
			'jpeg' === $image_type ? 'jpg' : $image_type
		);

		// Upload to WordPress.
		$upload = wp_upload_bits( $filename, null, $image_data );

		if ( $upload['error'] ) {
			return new \WP_Error(
				'upload_error',
				$upload['error'],
				array( 'status' => 500 )
			);
		}

		// Create attachment.
		$attachment_id = wp_insert_attachment(
			array(
				'post_mime_type' => 'image/' . ( 'jpg' === $image_type ? 'jpeg' : $image_type ),
				'post_title'     => sanitize_file_name( $filename ),
				'post_content'   => '',
				'post_status'    => 'private',
				'post_author'    => get_current_user_id(),
			),
			$upload['file']
		);

		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}

		// Generate metadata.
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$attach_data = wp_generate_attachment_metadata( $attachment_id, $upload['file'] );
		wp_update_attachment_metadata( $attachment_id, $attach_data );

		return rest_ensure_response(
			array(
				'success'        => true,
				'attachment_id'  => $attachment_id,
				'url'            => wp_get_attachment_url( $attachment_id ),
			)
		);
	}

	/**
	 * Permission check for screenshot upload.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public static function upload_permission_check( $request ) {
		return current_user_can( 'sgs_create_notes' );
	}
}

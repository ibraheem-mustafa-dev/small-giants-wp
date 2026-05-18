<?php
/**
 * File upload REST handler.
 *
 * Owns the POST /sgs-forms/v1/upload callback. Rate-limits via
 * Form_REST_Submission::check_rate_limit() then delegates to
 * Form_Upload::handle().
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

/**
 * File upload REST handler.
 */
class Form_REST_Upload {

	/**
	 * Handle file upload request.
	 *
	 * @param \WP_REST_Request $request REST API request.
	 * @return \WP_REST_Response|\WP_Error Upload result or error.
	 */
	public static function handle_upload( \WP_REST_Request $request ) {
		// Rate limiting: 10 uploads per IP per hour (max is bumped inside check_rate_limit()).
		$rate_limit_check = Form_REST_Submission::check_rate_limit( 'upload' );

		if ( is_wp_error( $rate_limit_check ) ) {
			return $rate_limit_check;
		}

		$result = Form_Upload::handle( $request );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new \WP_REST_Response( $result, 200 );
	}
}

<?php
/**
 * `POST /sgs/v1/cart/upload` — a file for a choice-flow purchase (Spec 43 FR-43-21).
 *
 * The same private uploader, nonce and rate limit as form uploads
 * (Forms\Form_Upload, Forms\Form_REST_API::verify_form_nonce, the forms
 * 'upload' rate limit), plus one stamp: the shopper's cart session ID on the
 * attachment, which the add-to-bag check requires before it will attach the
 * file to a cart line. Returns the attachment ID and original name, never a
 * URL (the file is not web-servable).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Flow_Fields_Upload
 */
final class Flow_Fields_Upload {

	/** Register the route. */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
	}

	/** Route definition. */
	public static function register_route(): void {
		\register_rest_route(
			'sgs/v1',
			'/cart/upload',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => array( Forms\Form_REST_API::class, 'verify_form_nonce' ),
			)
		);
	}

	/**
	 * Store the file privately and stamp it with the cart session.
	 *
	 * @param \WP_REST_Request $request The request (multipart, field `file`).
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( \WP_REST_Request $request ) {
		$limited = Forms\Form_REST_Submission::check_rate_limit( 'upload' );
		if ( \is_wp_error( $limited ) ) {
			return $limited;
		}

		$owner = sgs_flow_cart_session_owner( true );
		if ( '' === $owner ) {
			return new \WP_Error( 'sgs_no_cart_session', \__( 'Your bag could not be opened. Please refresh the page and try again.', 'sgs-blocks' ), array( 'status' => 503 ) );
		}

		$result = Forms\Form_Upload::handle( $request );
		if ( \is_wp_error( $result ) ) {
			$result->add_data( array( 'status' => 400 ) );
			return $result;
		}

		\update_post_meta( (int) $result['id'], SGS_FLOW_FILE_OWNER_META, $owner );

		return new \WP_REST_Response(
			array(
				'id'   => (int) $result['id'],
				'name' => (string) $result['name'],
			),
			200
		);
	}
}

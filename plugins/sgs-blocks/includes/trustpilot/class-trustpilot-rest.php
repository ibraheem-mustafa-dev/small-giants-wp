<?php
/**
 * Trustpilot Sync — REST endpoint.
 *
 * Exposes POST /wp-json/sgs/v1/trustpilot-sync — the single entry point used by
 * both the admin "Sync now" button and the WP-cron handler.
 *
 * @package SGS\Blocks\Trustpilot
 */

namespace SGS\Blocks\Trustpilot;

defined( 'ABSPATH' ) || exit;

class Trustpilot_REST {

	const NAMESPACE_KEY = 'sgs/v1';
	const ROUTE         = '/trustpilot-sync';

	public static function register(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes(): void {
		register_rest_route(
			self::NAMESPACE_KEY,
			self::ROUTE,
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle_sync' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
				'args'                => array(),
			)
		);
	}

	/**
	 * Only operators who can manage options may trigger a sync.
	 */
	public static function permission_check(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Run a sync and return a JSON response.
	 */
	public static function handle_sync( \WP_REST_Request $request ): \WP_REST_Response {
		$result = Trustpilot_Sync::run_sync();

		if ( is_wp_error( $result ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'code'    => $result->get_error_code(),
					'message' => $result->get_error_message(),
				),
				400
			);
		}

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $result,
			),
			200
		);
	}
}

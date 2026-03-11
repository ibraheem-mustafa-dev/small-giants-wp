<?php
/**
 * Global Block Defaults - stores per-block default attributes in wp_options.
 *
 * Admins can save current block settings as defaults via the inspector.
 * New block instances are seeded with saved defaults on the client side.
 *
 * REST endpoints:
 *   GET    /sgs-blocks/v1/defaults/{block_name}
 *   POST   /sgs-blocks/v1/defaults/{block_name}  (admin only)
 *   DELETE /sgs-blocks/v1/defaults/{block_name}/reset  (admin only)
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register REST endpoints for block defaults.
 */
function register_defaults_endpoints(): void {
	register_rest_route(
		'sgs-blocks/v1',
		'/defaults/(?P<block>[a-z0-9\-\/]+)',
		[
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\get_block_defaults',
				'permission_callback' => '__return_true',
				'args'                => [
					'block' => [
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					],
				],
			],
			[
				'methods'             => 'POST',
				'callback'            => __NAMESPACE__ . '\save_block_defaults',
				'permission_callback' => fn() => current_user_can( 'manage_options' ),
				'args'                => [
					'block'      => [
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					],
					'attributes' => [ 'required' => true ],
				],
			],
		]
	);

	register_rest_route(
		'sgs-blocks/v1',
		'/defaults/(?P<block>[a-z0-9\-\/]+)/reset',
		[
			'methods'             => 'DELETE',
			'callback'            => __NAMESPACE__ . '\reset_block_defaults',
			'permission_callback' => fn() => current_user_can( 'manage_options' ),
		]
	);
}
add_action( 'rest_api_init', __NAMESPACE__ . '\register_defaults_endpoints' );

/**
 * Build the wp_options key from a block name.
 *
 * @param string $block Block name (e.g. sgs/hero).
 * @return string
 */
function defaults_option_key( string $block ): string {
	return 'sgs_block_defaults_' . str_replace( '/', '_', $block );
}

/**
 * GET handler - retrieve saved defaults.
 *
 * @param \WP_REST_Request $request Request object.
 * @return \WP_REST_Response
 */
function get_block_defaults( \WP_REST_Request $request ): \WP_REST_Response {
	$defaults = get_option( defaults_option_key( $request['block'] ), [] );
	return rest_ensure_response( $defaults );
}

/**
 * POST handler - save block defaults.
 *
 * @param \WP_REST_Request $request Request object.
 * @return \WP_REST_Response|\WP_Error
 */
function save_block_defaults( \WP_REST_Request $request ) {
	$attributes = $request->get_param( 'attributes' );
	if ( ! is_array( $attributes ) ) {
		return new \WP_Error(
			'invalid_attributes',
			'Attributes must be an object.',
			[ 'status' => 400 ]
		);
	}
	update_option( defaults_option_key( $request['block'] ), $attributes, false );
	return rest_ensure_response( [ 'saved' => true ] );
}

/**
 * DELETE handler - reset block defaults.
 *
 * @param \WP_REST_Request $request Request object.
 * @return \WP_REST_Response
 */
function reset_block_defaults( \WP_REST_Request $request ): \WP_REST_Response {
	delete_option( defaults_option_key( $request['block'] ) );
	return rest_ensure_response( [ 'reset' => true ] );
}

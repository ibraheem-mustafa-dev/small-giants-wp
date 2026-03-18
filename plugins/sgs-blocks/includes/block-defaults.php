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
 * Output all saved block defaults as a JS global on editor load.
 *
 * Runs before the editor scripts so window.sgsBlockDefaults is available
 * when blocks.registerBlockType fires and merges defaults on the client.
 */
function enqueue_block_defaults_data(): void {
	global $wpdb;

	$prefix  = 'sgs_block_defaults_';
	$rows    = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s",
			$wpdb->esc_like( $prefix ) . '%'
		)
	);

	$defaults = [];
	foreach ( $rows as $row ) {
		// Reconstruct block name: "sgs_block_defaults_sgs_hero" → "sgs/hero".
		$key        = str_replace( $prefix, '', $row->option_name );
		$block_name = preg_replace( '/^([a-z0-9]+)_/', '$1/', $key, 1 );
		$decoded    = json_decode( $row->option_value, true );
		if ( is_array( $decoded ) ) {
			$defaults[ $block_name ] = $decoded;
		}
	}

	if ( empty( $defaults ) ) {
		return;
	}

	wp_add_inline_script(
		'sgs-block-extensions',
		'window.sgsBlockDefaults = ' . wp_json_encode( $defaults ) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\enqueue_block_defaults_data' );

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
 * Accepts a flat or shallow attributes array. Values are sanitised as text
 * to prevent persistent XSS via block default injection. Maximum payload
 * size is enforced to prevent storage abuse.
 *
 * @param \WP_REST_Request $request Request object.
 * @return \WP_REST_Response|\WP_Error
 */
function save_block_defaults( \WP_REST_Request $request ) {
	$attributes = $request->get_param( 'attributes' );

	if ( ! is_array( $attributes ) ) {
		return new \WP_Error(
			'invalid_attributes',
			__( 'Attributes must be an object.', 'sgs-blocks' ),
			[ 'status' => 400 ]
		);
	}

	// Cap the number of keys to prevent unbounded storage growth.
	if ( count( $attributes ) > 100 ) {
		return new \WP_Error(
			'too_many_attributes',
			__( 'Attributes object exceeds maximum allowed keys.', 'sgs-blocks' ),
			[ 'status' => 400 ]
		);
	}

	// Sanitise every scalar value. Arrays (e.g. repeated option lists) are
	// sanitised element-by-element. Nested objects are rejected.
	$sanitised = [];
	foreach ( $attributes as $key => $value ) {
		$safe_key = sanitize_key( $key );
		if ( ! $safe_key ) {
			continue;
		}
		if ( is_array( $value ) ) {
			$sanitised[ $safe_key ] = array_map( 'sanitize_text_field', $value );
		} elseif ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
			// Preserve typed primitives — they drive block controls, not output.
			$sanitised[ $safe_key ] = $value;
		} elseif ( is_string( $value ) ) {
			$sanitised[ $safe_key ] = sanitize_text_field( $value );
		}
		// Silently drop nested objects — block attributes should never need them.
	}

	update_option( defaults_option_key( $request['block'] ), $sanitised, false );
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

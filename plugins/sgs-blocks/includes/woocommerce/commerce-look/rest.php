<?php
/**
 * `GET /sgs/v1/commerce-look/css`: the Cart and Checkout look rules for the editor canvas.
 *
 * WooCommerce draws these two blocks in React in the editor, so `render_block` never runs for them there. The canvas
 * asks this route with the block's current attributes and prints the CSS it gets back. The CSS is built by the same
 * writer the front end uses (sgs_commerce_look_css()); the editor has no second implementation.
 *
 * Security: the REST cookie nonce (`X-WP-Nonce`, checked by core before this callback runs) and the `edit_posts`
 * capability. Attributes are decoded from JSON and kept only when their name is in the extension's attribute schema
 * (extension-attributes.generated.php, generated from the extension roster's JS) and their value matches the
 * schema type.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/writer.php';

/** The scope class the editor canvas wrapper carries. */
const SGS_COMMERCE_LOOK_EDITOR_SCOPE = 'sgs-commerce-look-editor';

add_action( 'rest_api_init', __NAMESPACE__ . '\sgs_commerce_look_register_route' );

/**
 * Register the route.
 *
 * @return void
 */
function sgs_commerce_look_register_route(): void {
	register_rest_route(
		'sgs/v1',
		'/commerce-look/css',
		array(
			'methods'             => \WP_REST_Server::READABLE,
			'callback'            => __NAMESPACE__ . '\sgs_commerce_look_rest_css',
			'permission_callback' => static fn(): bool => current_user_can( 'edit_posts' ),
			'args'                => array(
				'block'      => array(
					'type'     => 'string',
					'required' => true,
					'enum'     => array_keys( SGS_COMMERCE_LOOK_BLOCKS ),
				),
				'attributes' => array(
					'type'     => 'string',
					'required' => true,
				),
			),
		)
	);
}

/**
 * Keep only the attributes the extension schema declares, with values of the declared type.
 *
 * @param mixed $decoded Decoded JSON.
 * @return array<string, mixed>
 */
function sgs_commerce_look_validate_attrs( $decoded ): array {
	if ( ! is_array( $decoded ) ) {
		return array();
	}
	$schema = sgs_extension_attribute_schema();
	$clean  = array();
	foreach ( $decoded as $name => $value ) {
		$type = $schema[ $name ]['type'] ?? '';
		if ( ! is_string( $name ) || '' === $type ) {
			continue;
		}
		switch ( $type ) {
			case 'string':
				$ok = is_string( $value );
				break;
			case 'number':
				$ok = is_int( $value ) || is_float( $value );
				break;
			case 'boolean':
				$ok = is_bool( $value );
				break;
			case 'object':
				$ok = is_array( $value );
				break;
			default:
				$ok = false;
		}
		if ( $ok ) {
			$clean[ $name ] = $value;
		}
	}
	return $clean;
}

/**
 * Route callback.
 *
 * @param \WP_REST_Request $request Request.
 * @return \WP_REST_Response
 */
function sgs_commerce_look_rest_css( \WP_REST_Request $request ): \WP_REST_Response {
	$which = SGS_COMMERCE_LOOK_BLOCKS[ (string) $request->get_param( 'block' ) ] ?? '';
	$attrs = sgs_commerce_look_validate_attrs( json_decode( (string) $request->get_param( 'attributes' ), true ) );
	$css   = '' === $which ? '' : sgs_commerce_look_css( $attrs, $which, SGS_COMMERCE_LOOK_EDITOR_SCOPE );
	return rest_ensure_response( array( 'css' => wp_strip_all_tags( $css ) ) );
}

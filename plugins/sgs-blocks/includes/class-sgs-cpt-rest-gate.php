<?php
/**
 * REST authentication gate for sgs_header and sgs_footer CPTs.
 *
 * Council M1 (Spec 17 §S3-4) requires `edit_theme_options` for any REST access
 * to these CPTs — including unauthenticated reads. The CPT `capabilities` array
 * remaps `read` to `edit_theme_options`, but the WP REST controller's
 * `get_items_permissions_check()` for `publish`-status posts on a REST-exposed
 * CPT bypasses the `read` capability check entirely (it treats published posts
 * as publicly readable when `show_in_rest => true`).
 *
 * This filter closes the gap: any /wp/v2/sgs_header* or /wp/v2/sgs_footer* REST
 * route returns 403 to users without `edit_theme_options`, matching the spec.
 *
 * Captured 2026-05-20 — sandybrown smoke test showed anonymous GET returning
 * 200 with full post data before this gate was added.
 *
 * @package SGS\Blocks
 * @since   0.1.1
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Cpt_Rest_Gate
 *
 * Hooks `rest_pre_dispatch` to short-circuit any REST request targeting
 * sgs_header or sgs_footer routes when the user lacks `edit_theme_options`.
 */
final class Sgs_Cpt_Rest_Gate {

	/** REST namespace + post-type prefixes we gate. */
	private const GATED_ROUTE_PREFIXES = array(
		'/wp/v2/' . Sgs_Block_CPTs::HEADER_CPT,
		'/wp/v2/' . Sgs_Block_CPTs::FOOTER_CPT,
	);

	/**
	 * Wire the filter. Call once from the plugin bootstrap after
	 * Sgs_Block_CPTs::register() so the post-type constants resolve.
	 */
	public static function register(): void {
		\add_filter( 'rest_pre_dispatch', array( __CLASS__, 'maybe_block' ), 10, 3 );
	}

	/**
	 * Return a WP_Error with HTTP 403 if the request targets a gated route and
	 * the current user lacks `edit_theme_options`.
	 *
	 * @param mixed            $result  Existing pre-dispatch result. Non-null
	 *                                  means an earlier filter short-circuited;
	 *                                  pass it through unchanged.
	 * @param \WP_REST_Server  $server  REST server instance (unused).
	 * @param \WP_REST_Request $request Inbound REST request.
	 * @return mixed Original $result, or WP_Error when blocking.
	 */
	public static function maybe_block( $result, $server, $request ) {
		if ( null !== $result ) {
			return $result;
		}

		$route = (string) $request->get_route();

		foreach ( self::GATED_ROUTE_PREFIXES as $prefix ) {
			if ( 0 === strpos( $route, $prefix ) ) {
				if ( \current_user_can( 'edit_theme_options' ) ) {
					return $result;
				}

				return new \WP_Error(
					'rest_forbidden',
					\__( 'Sorry, you are not allowed to access this resource.', 'sgs-blocks' ),
					array( 'status' => 403 )
				);
			}
		}

		return $result;
	}
}

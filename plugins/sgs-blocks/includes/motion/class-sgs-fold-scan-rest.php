<?php
/**
 * POST /sgs/v1/fold-scan/<id>: stores the section count the block editor measured for a saved page (Spec 38A §9).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-fold-scan.php';

/**
 * The fold-scan route.
 */
final class Sgs_Fold_Scan_Rest {

	/** REST namespace. */
	public const REST_NAMESPACE = 'sgs/v1';

	/** LiteSpeed's documented single-post purge action. */
	public const PURGE_HOOK = 'litespeed_purge_post';

	/**
	 * Wire the route.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
	}

	/**
	 * Register POST /sgs/v1/fold-scan/<id>.
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/fold-scan/(?P<id>\d+)',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => array( __CLASS__, 'permission' ),
				'args'                => array(
					'id'       => array(
						'required'          => true,
						'sanitize_callback' => 'absint',
					),
					'sections' => array(
						'required'          => true,
						'validate_callback' => array( __CLASS__, 'valid_sections' ),
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
	}

	/**
	 * A valid REST nonce and the right to edit the post.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return bool
	 */
	public static function permission( $request ): bool {
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( '' === $nonce || ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return false;
		}
		return \current_user_can( 'edit_post', (int) $request->get_param( 'id' ) );
	}

	/**
	 * Whether a value is a whole number from 1 to 20.
	 *
	 * @param mixed $value Raw value.
	 * @return bool
	 */
	public static function valid_sections( $value ): bool {
		if ( \is_int( $value ) ) {
			$number = $value;
		} elseif ( \is_string( $value ) && 1 === \preg_match( '/^\d+$/', $value ) ) {
			$number = (int) $value;
		} else {
			return false;
		}
		return $number >= Sgs_Fold_Scan::MIN_SECTIONS && $number <= Sgs_Fold_Scan::MAX_SECTIONS;
	}

	/**
	 * Store the count and purge the post's page cache.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function handle( $request ) {
		$post_id  = (int) $request->get_param( 'id' );
		$sections = \absint( $request->get_param( 'sections' ) );
		\update_post_meta( $post_id, Sgs_Fold_Scan::META_KEY, $sections );
		if ( \has_action( self::PURGE_HOOK ) ) {
			\do_action( self::PURGE_HOOK, $post_id );
		}
		return \rest_ensure_response( array( 'sections' => $sections ) );
	}
}

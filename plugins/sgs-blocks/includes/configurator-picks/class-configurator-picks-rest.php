<?php
/**
 * The buy box editor's "Pick a set" setup checklist: one read-only REST route that says what the product has and what is
 * missing, from the same resolver the page render and the cart checks use.
 *
 * GET /sgs/v1/buybox/checklist?product=ID, for a user who can edit that product.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Configurator_Picks_Rest
 */
final class Configurator_Picks_Rest {

	/** Wire the route. */
	public static function register(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
	}

	/** Register the route. */
	public static function register_route(): void {
		register_rest_route(
			'sgs/v1',
			'/buybox/checklist',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => array( __CLASS__, 'can_read' ),
				'args'                => array(
					'product' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => static fn( $value ): bool => is_numeric( $value ) && (int) $value > 0,
					),
				),
			)
		);
	}

	/**
	 * Only someone who may edit the product sees its setup.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return bool
	 */
	public static function can_read( $request ): bool {
		return current_user_can( 'edit_post', absint( $request->get_param( 'product' ) ) );
	}

	/**
	 * Handle the request.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( $request ) {
		$product_id = absint( $request->get_param( 'product' ) );
		if ( 'product' !== get_post_type( $product_id ) ) {
			return new \WP_Error( 'sgs_not_a_product', __( 'That is not a product.', 'sgs-blocks' ), array( 'status' => 404 ) );
		}
		return new \WP_REST_Response( self::checklist( $product_id ), 200 );
	}

	/**
	 * The checklist for a product.
	 *
	 * @param int $product_id Product ID.
	 * @return array{pack:array,groups:array,headingGroups:array,issues:array,editUrl:string}
	 */
	public static function checklist( int $product_id ): array {
		$all    = Configurator_Groups::for_product( $product_id );
		$pack   = Configurator_Groups::pack( $product_id, $all );
		$active = sgs_picks_active_groups( $all );
		$groups = array();
		foreach ( $all as $group ) {
			if ( 'answer' === $group['role'] && ! empty( $group['flags']['multi'] ) ) {
				$groups[] = array(
					'key'     => (string) $group['key'],
					'label'   => wp_strip_all_tags( (string) $group['label'] ),
					'options' => count( $group['terms'] ),
					'active'  => isset( $active[ $group['key'] ] ),
					'share'   => sgs_picks_share_mode( $group['flags']['share'] ?? 'none' ),
				);
			}
		}
		return array(
			'pack'    => array(
				'axis'        => $pack['key'],
				'found'       => '' !== $pack['key'] && array() !== $pack['units'] && array() === $pack['unparseable'],
				'sizes'       => array_values( $pack['units'] ),
				'unparseable' => array_map( 'wp_strip_all_tags', $pack['unparseable'] ),
			),
			'groups'  => $groups,
			'headingGroups' => array_map(
				static fn( array $group ): array => array(
					'key'   => (string) $group['key'],
					'label' => wp_strip_all_tags( (string) $group['label'] ),
				),
				$all
			),
			'issues'  => array_column( sgs_picks_preflight_issues( $all, $pack ), 'message' ),
			'editUrl' => (string) get_edit_post_link( $product_id, 'raw' ),
		);
	}
}

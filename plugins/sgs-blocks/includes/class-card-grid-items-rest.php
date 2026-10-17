<?php
/**
 * POST /sgs/v1/card-grid-items: the results a products-mode sgs/card-grid shows, for the editor canvas, which
 * previews each one as the grid's template card under that product's block context, with the grid's first-page
 * pagination (inert buttons) and the empty-state message the page prints (Card_Grid_Results).
 *
 * The results come from the same queries the grid's render runs (Card_Grid_Products, CPT_Collection_Query), so the
 * editor shows the products the page will. Editors only: the route answers with unpublished handpicked IDs too, as
 * the grid's own editor preview did.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-card-grid-template.php';
require_once __DIR__ . '/class-card-grid-results.php';
require_once __DIR__ . '/class-card-grid-products.php';
require_once __DIR__ . '/class-cpt-collection-query.php';

/**
 * The editor's products-mode result list.
 */
final class Card_Grid_Items_Rest {

	/** REST namespace. */
	public const REST_NAMESPACE = 'sgs/v1';

	/** REST route (without leading slash). */
	public const REST_ROUTE = 'card-grid-items';

	/**
	 * Wire the route.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
	}

	/**
	 * Register POST /sgs/v1/card-grid-items.
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_ROUTE,
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => static function (): bool {
					return \current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'attributes' => array(
						'required'          => true,
						'type'              => 'object',
						'validate_callback' => static function ( $value ): bool {
							return \is_array( $value ) && Card_Grid_Template::is_product_source( (string) ( $value['source'] ?? '' ) );
						},
						'sanitize_callback' => static function ( $value ): array {
							return \is_array( $value ) ? $value : array();
						},
					),
				),
			)
		);
	}

	/**
	 * The grid's first page: each result's ID, post type and the source mode its card binds with, in display order, its
	 * pagination markup and its empty-state message.
	 *
	 * @param \WP_REST_Request $request The request.
	 * @return \WP_REST_Response
	 */
	public static function handle( \WP_REST_Request $request ): \WP_REST_Response {
		$attributes  = (array) $request->get_param( 'attributes' );
		$items       = array();
		$total_pages = 1;

		if ( 'cpt-collection' === $attributes['source'] ) {
			$paginates = 'none' !== \sanitize_key( (string) ( $attributes['pagination'] ?? 'none' ) );
			// The query helper sanitises every attribute it reads; the first page is what the canvas shows.
			$result      = CPT_Collection_Query::get_results( $attributes, array( 'paged' => $paginates ? 1 : 0 ) );
			$total_pages = (int) $result['max_num_pages'];
			$has_wc      = \function_exists( 'WC' );
			foreach ( $result['posts'] as $post ) {
				$items[] = array(
					'id'         => \absint( $post->ID ),
					'postType'   => \sanitize_key( $post->post_type ),
					'sourceMode' => ( $has_wc && 'product' === $post->post_type ) ? 'wc-product' : 'sgs-cpt',
				);
			}
		} else {
			foreach ( Card_Grid_Products::get_product_ids( $attributes ) as $product_id ) {
				$items[] = array(
					'id'         => \absint( $product_id ),
					'postType'   => 'product',
					'sourceMode' => 'wc-product',
				);
			}
		}

		return new \WP_REST_Response(
			array(
				'items'          => $items,
				'paginationHtml' => Card_Grid_Results::pagination( $attributes, 'sgs-cg-editor', $total_pages, 1, Grid_Pagination::MODE_AJAX ),
				'emptyMessage'   => array() === $items ? Card_Grid_Results::empty_message( $attributes, false ) : '',
			),
			200
		);
	}
}

<?php
/**
 * CPT Collection Query — the meta-driven, WooCommerce-INDEPENDENT collection engine.
 *
 * This is the single home for the seven meta-driven selection rules that were
 * originally implemented inline in `sgs/content-collection`'s render.php:
 *
 *   newest         — date DESC
 *   featured       — meta_query: sgs_featured = '1', date DESC tiebreak
 *   most-expensive — meta_key sgs_price, meta_value_num DESC
 *   cheapest       — meta_key sgs_price, meta_value_num ASC
 *   most-popular   — meta_key sgs_views, meta_value_num DESC (date DESC tiebreak)
 *   handpicked     — post__in array, ordered by the operator's array order
 *   category       — tax_query on {post_type}_cat, date DESC
 *
 * WHY THIS CLASS EXISTS (2026-08-01 fold):
 * `sgs/content-collection` was folded into `sgs/card-grid`. `card-grid`'s product
 * path (includes/class-card-grid-products.php) hard-gates on `wc_get_products()`
 * and returns an empty array when WooCommerce is inactive. `content-collection`
 * had NO such gate — it queried the `sgs_product` custom post type through plain
 * WP_Query and worked on every install. Folding without porting that path would
 * have deleted a working capability from every non-WooCommerce site.
 *
 * So the rules live HERE, once, and BOTH blocks call this class:
 *   - sgs/content-collection  (legacy block, still registered, still renders)
 *   - sgs/card-grid           (source = 'cpt-collection')
 *
 * There is deliberately no WooCommerce reference anywhere in this file. It runs
 * on a bare WordPress install. WooCommerce-specific querying stays in
 * Card_Grid_Products, which is a different engine for a different data source.
 *
 * R-31-1 / R-22-1: query args are derived from the selection rule and the CPT
 * meta registered in class-product-cpt.php — no hardcoded per-product logic.
 *
 * @package SGS\Blocks
 * @since   1.16.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * CPT_Collection_Query
 *
 * Public API — one entry point:
 *
 *   $result = CPT_Collection_Query::get_results( $attributes, array( 'paged' => 2 ) );
 *   // $result['posts']         WP_Post[]  (meta cache already primed)
 *   // $result['max_num_pages'] int        (1 when pagination is not requested)
 *   // $result['paged']         int        (the page actually queried)
 *
 * Pure static. Renders nothing — presentation stays in each block's render.php.
 */
final class CPT_Collection_Query {

	/**
	 * Maximum number of items ever returned per page (server-side hard cap).
	 * Mirrors the inspector RangeControl max and Card_Grid_Products::MAX_LIMIT.
	 */
	public const MAX_COUNT = 24;

	/**
	 * The seven recognised selection rules, in inspector order.
	 *
	 * Exposed so block.json enums, editors and validators can be checked
	 * against ONE list rather than three drifting copies.
	 *
	 * @var string[]
	 */
	public const SELECTION_RULES = array(
		'newest',
		'featured',
		'most-expensive',
		'cheapest',
		'most-popular',
		'handpicked',
		'category',
	);

	// ── Public entry point ───────────────────────────────────────────────────

	/**
	 * Run the collection query and return the resolved posts.
	 *
	 * @param array $attributes Block attributes. Reads: contentType, selectionRule,
	 *                          count, handpickedIds, categoryTerm.
	 * @param array $opts       Optional. Accepts one key, `paged` (int): the page
	 *                          number to fetch. 0 (default) disables pagination
	 *                          entirely and keeps the `no_found_rows` fast path.
	 * @return array{posts: \WP_Post[], max_num_pages: int, paged: int}
	 */
	public static function get_results( array $attributes, array $opts = array() ): array {
		$paged = isset( $opts['paged'] ) ? \absint( $opts['paged'] ) : 0;

		$selection_rule = \sanitize_key( $attributes['selectionRule'] ?? 'newest' );

		// Hand-picked is an explicit, operator-ordered list — paginating it would
		// silently hide items the operator deliberately chose. Force page 1.
		if ( 'handpicked' === $selection_rule ) {
			$paged = 0;
		}

		$query_args = self::build_query_args( $attributes, $selection_rule );

		if ( $paged > 0 ) {
			// Pagination needs FOUND_ROWS() to compute max_num_pages, so the
			// no_found_rows fast path is switched off for this branch ONLY.
			$query_args['no_found_rows'] = false;
			$query_args['paged']         = $paged;
		}

		$query        = new \WP_Query( $query_args );
		$result_posts = $query->posts;

		/*
		 * N+1 GUARD (ported verbatim from content-collection/render.php:167).
		 * Prime the meta cache for all result posts in ONE DB round-trip.
		 * Without this, each card's get_product_data() call triggers individual
		 * get_post_meta() queries — one extra query per card. update_meta_cache()
		 * batch-loads all meta for these post IDs so subsequent get_post_meta()
		 * calls are served from the in-memory object cache.
		 *
		 * It lives inside this method (not in the callers) precisely so a future
		 * caller cannot forget it.
		 */
		if ( ! empty( $result_posts ) ) {
			\update_meta_cache( 'post', \wp_list_pluck( $result_posts, 'ID' ) );
		}

		$max_pages = $paged > 0 ? (int) $query->max_num_pages : 1;

		// Reset post data after the manual WP_Query (defensive — render_block()
		// sets up its own post context; this guard keeps the outer template safe).
		\wp_reset_postdata();

		return array(
			'posts'         => $result_posts,
			'max_num_pages' => \max( 1, $max_pages ),
			'paged'         => \max( 1, $paged ),
		);
	}

	/**
	 * Resolve the post type for a set of attributes, through the allowlist.
	 *
	 * Exposed publicly because render.php needs the SAME resolved value when
	 * deciding each item's product-card source mode.
	 *
	 * B2 (QC): the raw attribute is whitelisted before it can reach
	 * WP_Query['post_type'] — sanitize_key alone is insufficient, since an
	 * attacker-controlled post_type could expose private CPTs. The filter hook
	 * lets themes/plugins extend the list.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Safe post type slug.
	 */
	public static function resolve_post_type( array $attributes ): string {
		$raw     = \sanitize_key( $attributes['contentType'] ?? 'sgs_product' );
		$allowed = \apply_filters( 'sgs_content_collection_post_types', array( 'sgs_product', 'product' ) );

		return \in_array( $raw, (array) $allowed, true ) ? $raw : 'sgs_product';
	}

	/**
	 * Resolve the per-page item count, clamped to the server-side cap.
	 *
	 * @param array $attributes Block attributes.
	 * @return int Count between 1 and MAX_COUNT.
	 */
	public static function resolve_count( array $attributes ): int {
		$count = \absint( $attributes['count'] ?? 12 );

		return \min( \max( 1, $count ), self::MAX_COUNT );
	}

	// ── Private helpers ──────────────────────────────────────────────────────

	/**
	 * Build the WP_Query args for a selection rule.
	 *
	 * @param array  $attributes     Block attributes.
	 * @param string $selection_rule Already-sanitised rule slug.
	 * @return array WP_Query args.
	 */
	private static function build_query_args( array $attributes, string $selection_rule ): array {
		$content_type   = self::resolve_post_type( $attributes );
		$count          = self::resolve_count( $attributes );
		$handpicked_ids = \array_map( 'absint', (array) ( $attributes['handpickedIds'] ?? array() ) );
		$category_term  = \absint( $attributes['categoryTerm'] ?? 0 );

		$query_args = array(
			'post_type'              => $content_type,
			'post_status'            => 'publish',
			'posts_per_page'         => $count,
			'no_found_rows'          => true,   // Perf: skip FOUND_ROWS() unless paginating.
			'ignore_sticky_posts'    => true,
			'update_post_term_cache' => false,
			'update_post_meta_cache' => true,   // Meta needed for featured/price/views.
		);

		switch ( $selection_rule ) {
			case 'featured':
				// Filter to items where the sgs_featured boolean meta is truthy.
				// Stored as '1' (true) or '' / '0' (false) by WP's sanitise_callback.
				$query_args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- intentional; meta-filtered preset is the entire purpose of this rule.
					array(
						'key'     => 'sgs_featured',
						'value'   => '1',
						'compare' => '=',
					),
				);
				$query_args['orderby']    = 'date';
				$query_args['order']      = 'DESC';
				break;

			case 'most-expensive':
				$query_args['meta_key'] = 'sgs_price'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- intentional; price sort is the entire purpose of this rule.
				$query_args['orderby']  = 'meta_value_num';
				$query_args['order']    = 'DESC';
				break;

			case 'cheapest':
				$query_args['meta_key'] = 'sgs_price'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- intentional; price sort is the entire purpose of this rule.
				$query_args['orderby']  = 'meta_value_num';
				$query_args['order']    = 'ASC';
				break;

			case 'most-popular':
				// Sort by view counter; fall back to date if no views meta exists.
				$query_args['meta_key']   = 'sgs_views'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- intentional; view-count sort is the entire purpose of this rule.
				$query_args['orderby']    = array(
					'meta_value_num' => 'DESC',
					'date'           => 'DESC',
				);
				$query_args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- intentional fallback.
					array(
						'key'     => 'sgs_views',
						'compare' => 'EXISTS',
					),
				);
				break;

			case 'handpicked':
				// Respect the exact order the operator chose (post__in ordering).
				if ( ! empty( $handpicked_ids ) ) {
					$query_args['post__in']       = $handpicked_ids;
					$query_args['orderby']        = 'post__in';
					$query_args['posts_per_page'] = \count( $handpicked_ids );
				} else {
					// No IDs chosen yet — show nothing (triggers the empty state).
					$query_args['post__in']       = array( 0 );
					$query_args['posts_per_page'] = 0;
				}
				break;

			case 'category':
				if ( $category_term > 0 ) {
					// Taxonomy associated with this content type by convention:
					// sgs_product → sgs_product_cat. Generalises to future types
					// via the {post_type}_cat naming pattern (R-22-9).
					$tax_slug                = $content_type . '_cat';
					$query_args['tax_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- intentional; taxonomy filter is the purpose of this rule.
						array(
							'taxonomy' => $tax_slug,
							'field'    => 'term_id',
							'terms'    => $category_term,
						),
					);
				}
				$query_args['orderby'] = 'date';
				$query_args['order']   = 'DESC';
				break;

			case 'newest':
			default:
				$query_args['orderby'] = 'date';
				$query_args['order']   = 'DESC';
				break;
		}

		return $query_args;
	}
}

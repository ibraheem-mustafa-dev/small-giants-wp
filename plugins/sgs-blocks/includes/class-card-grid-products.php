<?php
/**
 * Card Grid — WooCommerce product query builder (FP-E).
 *
 * Converts the `sgs/card-grid` WC-product-mode block attributes into a
 * WC_Product_Query args array and returns the matching product IDs.
 *
 * Design constraints:
 * - Never uses WP_Query / meta_query for price or stock — those break at
 *   scale and on HPOS. Everything routes through wc_get_products() /
 *   WC_Product_Query (the WC-canonical path).
 * - On-sale filter uses wc_get_product_ids_on_sale() (transient-backed index)
 *   then intersects with the main query result — the efficient, HPOS-safe path.
 *   The base query over-fetches 4× (capped 96) so the intersection can refill
 *   to the requested limit; fewer are returned only when fewer on-sale
 *   products exist.
 * - No transients in v1 (explicit non-goal — transient layer can be added later
 *   without changing the public interface).
 * - No WC class is extended or instantiated at file scope (lazy-load lesson:
 *   file_scope_wc_class_extends_must_load_lazily — memory 2026-06-09).
 * - ABSPATH guard at top. Namespace SGS\Blocks. Pure static helpers only.
 *
 * @package SGS\Blocks
 * @since   1.15.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Card_Grid_Products
 *
 * Public API — one entry point called by render.php:
 *
 *   $ids = Card_Grid_Products::get_product_ids( $attributes );
 *
 * Returns an ordered array of int product IDs (may be empty).
 * Renders nothing itself — presentation stays in render.php.
 */
final class Card_Grid_Products {

	/**
	 * Maximum number of products ever returned (server-side hard cap).
	 * Matches the inspector RangeControl max and mirrors the content-collection cap.
	 */
	private const MAX_LIMIT = 24;

	// ── Public entry point ───────────────────────────────────────────────────

	/**
	 * Build the WC_Product_Query args from block attributes and return
	 * an ordered list of matching product IDs.
	 *
	 * @param array $attributes Raw block attributes (from render.php $attributes).
	 * @return int[]            Ordered product IDs. Empty array when WC is inactive
	 *                          or the query matches nothing.
	 */
	public static function get_product_ids( array $attributes ): array {
		if ( ! \function_exists( 'wc_get_products' ) ) {
			return array();
		}

		// FIX-3 perf: per-request static memo keyed on a hash of $attributes.
		// The ItemList walker re-runs this query after render.php already ran it
		// for the same block; the memo makes the second (and any further) call
		// free for the duration of the request. The cache is intentionally
		// request-scoped (static variable) — no cross-request stale data risk.
		// ~5 lines; keyed on md5(wp_json_encode) so any attribute change busts it.
		static $memo = array();
		$memo_key    = \md5( (string) \wp_json_encode( $attributes ) );
		if ( isset( $memo[ $memo_key ] ) ) {
			return $memo[ $memo_key ];
		}

		$product_source = isset( $attributes['productSource'] )
			? \sanitize_key( $attributes['productSource'] )
			: 'collection';

		// ── Handpick mode: return the exact IDs the operator chose ──────────
		if ( 'handpick' === $product_source ) {
			$ids = array_map( 'absint', (array) ( $attributes['productIds'] ?? array() ) );
			$ids = array_filter( $ids ); // Remove any 0 values.
			// SEC: gate — handpick stores IDs at authoring time; a product may be
			// drafted, made private, or set catalog_visibility=hidden AFTER saving.
			// Filter through the single shared gate so draft/hidden product URLs
			// never appear in public grids or the ItemList/ProductGroup schema.
			// Leak class: non-public products' URLs in public JSON-LD / grids.
			require_once __DIR__ . '/class-product-item-list.php';
			$ids = array_values(
				array_filter(
					$ids,
					static function ( int $id ): bool {
						return \SGS\Blocks\Product_Item_List::is_publicly_listable( $id );
					}
				)
			);
			return $ids;
		}

		// ── Collection mode: smart preset + filters ─────────────────────────
		$limit = \absint( $attributes['productLimit'] ?? 6 );
		$limit = \min( \max( 1, $limit ), self::MAX_LIMIT );

		$query_args = self::build_collection_args( $attributes, $limit );

		// Run the query. wc_get_products() returns WC_Product objects when
		// return='objects' (default); we only need IDs for performance.
		$query_args['return'] = 'ids';

		// on_sale is not a native wc_get_products argument — it is handled
		// via post-query intersection (HPOS-safe indexed path).
		$on_sale = ! empty( $attributes['productOnSale'] );
		if ( $on_sale ) {
			// Refill headroom: the on-sale intersection happens AFTER the base
			// query, so fetching only $limit rows would under-fill the grid
			// whenever non-sale items occupy the top of the result order.
			// Over-fetch 4× (a sale rate of >=25% in the fetched window fills
			// the grid), hard-capped at 96 rows to bound the query cost. If
			// fewer on-sale products EXIST than the limit, fewer are returned
			// — that is correct behaviour, not a gap.
			$query_args['limit'] = \min( $limit * 4, 96 );
		}

		$ids = \wc_get_products( $query_args );
		if ( ! is_array( $ids ) ) {
			$ids = array();
		}
		$ids = array_map( 'absint', $ids );

		// Intersect with on-sale index (transient-backed, HPOS-safe), then
		// slice the over-fetched window back down to the requested limit.
		if ( $on_sale ) {
			$sale_ids = \wc_get_product_ids_on_sale();
			$ids      = \array_values( \array_intersect( $ids, $sale_ids ) );
			$ids      = \array_slice( $ids, 0, $limit );
		}

		return $ids;
	}

	/**
	 * Build the ItemList JSON-LD node for a set of product IDs.
	 *
	 * Google carousels-beta summary-page pattern: ListItems carry url +
	 * position ONLY — no name, no price, no offers. Full Product schema
	 * lives on each canonical product page (class-product-schema.php),
	 * never duplicated here.
	 *
	 * Pure static builder (unit-testable): returns the array shape;
	 * render.php json-encodes + prints it. Returns an empty array when no
	 * product resolves a permalink — caller skips the emit.
	 *
	 * @param int[] $product_ids Ordered product IDs (render order; positions 1-based).
	 * @return array JSON-LD node, or empty array when nothing to emit.
	 */
	public static function build_item_list_schema( array $product_ids ): array {
		$list_items = array();
		$position   = 1;

		foreach ( $product_ids as $product_id ) {
			// SEC: belt-and-braces gate — ids may arrive from the handpick branch
			// (pre-filtered above) or from the ItemList walker (also gated), but
			// build_item_list_schema() is a public static and may be called
			// independently. Re-check here so no draft/hidden URL ever lands in
			// the emitted JSON-LD regardless of call path.
			// Leak class: non-public products' URLs in public ItemList JSON-LD.
			require_once __DIR__ . '/class-product-item-list.php';
			if ( ! \SGS\Blocks\Product_Item_List::is_publicly_listable( \absint( $product_id ) ) ) {
				continue;
			}
			$url = \get_permalink( \absint( $product_id ) );
			if ( ! $url ) {
				continue;
			}
			$list_items[] = array(
				'@type'    => 'ListItem',
				'position' => $position,
				'url'      => \esc_url_raw( $url ),
			);
			++$position;
		}

		if ( empty( $list_items ) ) {
			return array();
		}

		return array(
			'@context'        => 'https://schema.org',
			'@type'           => 'ItemList',
			'itemListElement' => $list_items,
		);
	}

	// ── Private helpers ──────────────────────────────────────────────────────

	/**
	 * Build the wc_get_products() args array for collection mode.
	 *
	 * Smart collection → orderby/order mapping:
	 *   best-selling → orderby 'popularity'  (WC total_sales meta, indexed)
	 *   price-high   → orderby 'price'       order DESC (WC price meta index)
	 *   price-low    → orderby 'price'       order ASC
	 *   top-rated    → orderby 'rating'      (WC average_rating meta, indexed)
	 *   latest       → orderby 'date'        order DESC (default)
	 *
	 * All orderby slugs are WC_Product_Query natives — no raw meta_query.
	 *
	 * @param array $attributes Block attributes.
	 * @param int   $limit      Resolved, capped product limit.
	 * @return array wc_get_products() args (without 'return' key — caller sets it).
	 */
	private static function build_collection_args( array $attributes, int $limit ): array {
		$collection = isset( $attributes['productCollection'] )
			? \sanitize_key( $attributes['productCollection'] )
			: 'latest';

		$args = array(
			'status'  => 'publish',
			'limit'   => $limit,
			'orderby' => 'date',
			'order'   => 'DESC',
		);

		// Apply smart collection preset ordering.
		switch ( $collection ) {
			case 'best-selling':
				// WC maps 'popularity' to total_sales meta sort (indexed).
				$args['orderby'] = 'popularity';
				$args['order']   = 'DESC';
				break;

			case 'price-high':
				// WC maps 'price' to _price meta (keyed index on HPOS + classic).
				$args['orderby'] = 'price';
				$args['order']   = 'DESC';
				break;

			case 'price-low':
				$args['orderby'] = 'price';
				$args['order']   = 'ASC';
				break;

			case 'top-rated':
				// WC maps 'rating' to average_rating meta sort.
				$args['orderby'] = 'rating';
				$args['order']   = 'DESC';
				break;

			case 'latest':
			default:
				$args['orderby'] = 'date';
				$args['order']   = 'DESC';
				break;
		}

		// ── Category filter ──────────────────────────────────────────────────
		$category_ids = array_map( 'absint', (array) ( $attributes['productCategories'] ?? array() ) );
		$category_ids = array_filter( $category_ids );
		if ( ! empty( $category_ids ) ) {
			// wc_get_products() accepts 'category' as an array of term slugs.
			// We have IDs — resolve to slugs (WC_Product_Query requires slugs for
			// the 'category' arg; using term_id requires the 'tax_query' arg which
			// bypasses HPOS). Use get_term() to convert, filter out invalid terms.
			$category_slugs = array();
			foreach ( $category_ids as $term_id ) {
				$term = \get_term( $term_id, 'product_cat' );
				if ( $term instanceof \WP_Term && ! \is_wp_error( $term ) ) {
					$category_slugs[] = $term->slug;
				}
			}
			if ( ! empty( $category_slugs ) ) {
				$args['category'] = $category_slugs;
			}
		}

		// ── Tag filter ───────────────────────────────────────────────────────
		$tag_ids = array_map( 'absint', (array) ( $attributes['productTags'] ?? array() ) );
		$tag_ids = array_filter( $tag_ids );
		if ( ! empty( $tag_ids ) ) {
			// Same ID→slug conversion for 'tag' arg.
			$tag_slugs = array();
			foreach ( $tag_ids as $term_id ) {
				$term = \get_term( $term_id, 'product_tag' );
				if ( $term instanceof \WP_Term && ! \is_wp_error( $term ) ) {
					$tag_slugs[] = $term->slug;
				}
			}
			if ( ! empty( $tag_slugs ) ) {
				$args['tag'] = $tag_slugs;
			}
		}

		// ── Featured filter ──────────────────────────────────────────────────
		if ( ! empty( $attributes['productFeatured'] ) ) {
			// WC_Product_Query native: maps to a product_visibility tax_query
			// filtering for the 'featured' term.
			$args['featured'] = true;
		}

		// ── In-stock filter ──────────────────────────────────────────────────
		// Default ON (productInStock defaults to true in block.json).
		if ( ! empty( $attributes['productInStock'] ) ) {
			$args['stock_status'] = 'instock';
		}

		return $args;
	}
}

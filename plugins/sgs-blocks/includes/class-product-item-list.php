<?php
/**
 * Page-level ItemList JSON-LD emitter (FP-E follow-up).
 *
 * Emits ONE ItemList node per singular front-end page, collecting every
 * WooCommerce product surfaced by SGS blocks in the post content — both
 * wc-product card-grids and loose wc-product product-cards — in document
 * order. Single source of truth: the per-block render paths do NOT emit
 * (prevents double-emission when a grid and loose cards share a page).
 *
 * Google carousels-beta summary-page pattern: ListItems carry url +
 * position ONLY — Product schema lives on the canonical product pages
 * (class-product-schema.php), never duplicated here.
 *
 * SEC-9 detect-and-defer: an active Yoast / RankMath owns structured data
 * (same check as class-product-canonical.php:55 / class-llms-txt.php:110).
 *
 * v1 limitation: only the queried post's post_content is scanned. Blocks
 * living in template parts or synced patterns outside post_content are
 * not seen by this walker.
 *
 * @package SGS\Blocks
 * @since   1.15.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// Own dependencies (shared-helper-must-require-its-own-deps): the product
// query builder + the ItemList schema builder both live here.
require_once __DIR__ . '/class-card-grid-products.php';

/**
 * Class Product_Item_List
 *
 * Static-only. register() wires the wp_footer hook; emit() walks the
 * queried post's blocks and prints at most one JSON-LD node.
 */
final class Product_Item_List {

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'wp_footer', array( __CLASS__, 'emit' ) );
	}

	/**
	 * Emit the page-level ItemList node (or nothing).
	 *
	 * Runs on wp_footer — front-end only by definition, but is_admin() is
	 * kept as a cheap belt-and-braces guard.
	 */
	public static function emit(): void {
		if ( \is_admin() || ! \is_singular() ) {
			return;
		}

		// SEC-9 detect-and-defer: Yoast / RankMath own structured data.
		if ( \defined( 'WPSEO_VERSION' ) || \class_exists( 'RankMath' ) || \defined( 'RANK_MATH_VERSION' ) ) {
			return;
		}

		// WC inactive — no products can resolve; skip entirely.
		if ( ! \function_exists( 'wc_get_products' ) ) {
			return;
		}

		$page             = self::collect_page_product_ids();
		$product_ids      = $page['ids'];
		$grid_contributed = $page['grid_contributed'];

		/*
		 * Emit threshold (deliberate asymmetry):
		 *  - >= 2 entries: a list of products is a listing, however assembled.
		 *  - >= 1 entry AND a grid contributed: a query-driven grid that
		 *    happens to match one product is still a listing surface (the
		 *    operator declared "show products here"); a single LOOSE card is
		 *    editorial product mention, not a listing — no ItemList for it.
		 */
		$count = \count( $product_ids );
		if ( $count < 2 && ! ( $count >= 1 && $grid_contributed ) ) {
			return;
		}

		$schema = Card_Grid_Products::build_item_list_schema( $product_ids );
		if ( empty( $schema ) ) {
			return;
		}

		\printf(
			'<script type="application/ld+json">%s</script>' . "\n",
			\wp_json_encode( $schema ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode output is safe; JSON encoding is the escape mechanism for JSON-LD.
		);
	}

	/**
	 * Collect every connected product ID on the queried page, deduped.
	 *
	 * PUBLIC shared API — the single walk used by BOTH the ItemList emitter
	 * (emit(), above) and the ProductGroup single-product-focus gate in
	 * configurator-head.php. One walker, one truth (duplicated-calculation
	 * drift is a known failure class in this codebase — never re-implement
	 * this walk at a call site).
	 *
	 * @return array {
	 *     @type int[] $ids              Distinct product IDs, document order,
	 *                                   first occurrence kept.
	 *     @type bool  $grid_contributed True when a wc-product card-grid
	 *                                   contributed at least one ID.
	 * }
	 */
	public static function collect_page_product_ids(): array {
		$result = array(
			'ids'              => array(),
			'grid_contributed' => false,
		);

		$post = \get_post( \get_queried_object_id() );
		if ( ! $post || '' === $post->post_content ) {
			return $result;
		}

		$product_ids      = array();
		$grid_contributed = false;
		self::collect( \parse_blocks( $post->post_content ), $product_ids, $grid_contributed );

		// Dedupe preserving FIRST position (array_unique keeps the first
		// occurrence; array_values re-indexes for 1-based schema positions).
		$result['ids']              = \array_values( \array_unique( $product_ids ) );
		$result['grid_contributed'] = $grid_contributed;

		return $result;
	}

	// ── Public gate helper ──────────────────────────────────────────────────

	/**
	 * Whether a product ID is safe to surface on a public-facing listing or
	 * schema emit.
	 *
	 * A product is publicly listable only when:
	 *   1. Its post status is 'publish' (not draft / pending / private).
	 *   2. When WooCommerce is active, wc_get_product() resolves a product
	 *      object AND that product's catalog visibility is NOT 'hidden'
	 *      (is_visible() returns false for catalog_visibility='hidden' and
	 *      also for private/password-protected posts — the two checks are
	 *      belt-and-braces rather than redundant).
	 *
	 * Single source — call this at EVERY collection/emission boundary so
	 * draft/private/hidden products never reach public ItemList JSON-LD,
	 * ProductGroup schema, OG tags, or grid "View product" links.
	 * (Lesson: duplicated-calculation-drifts — one helper, zero divergence.)
	 *
	 * @param int $id Product post ID.
	 * @return bool True when the product may appear in public listings.
	 */
	public static function is_publicly_listable( int $id ): bool {
		if ( $id <= 0 ) {
			return false;
		}
		// Belt 1: post status must be publish (catches draft/pending/private
		// before touching the WC object layer — cheapest check first).
		if ( 'publish' !== \get_post_status( $id ) ) {
			return false;
		}
		// Belt 2: when WC is active, the product must resolve AND be visible
		// in the catalogue (is_visible() returns false for
		// catalog_visibility='hidden', password-protected, and private).
		// NOTE: is_visible() EXCLUDES catalog_visibility=hidden — that is
		// intended; hidden products must not appear in any public listing.
		if ( \function_exists( 'wc_get_product' ) ) {
			$p = \wc_get_product( $id );
			if ( ! $p || ! $p->is_visible() ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Recursively collect product IDs from a parsed block tree, in document
	 * order, descending into innerBlocks at any depth.
	 *
	 * Sources collected:
	 *  - sgs/card-grid with source='wc-product' → Card_Grid_Products::
	 *    get_product_ids( attrs ). NOTE: this re-runs the same WC query the
	 *    block's render ran earlier in the request. Acceptable v1 cost —
	 *    wc_get_products is cheap at limit<=24 and the result set is small;
	 *    a per-request memo can be added later without interface changes.
	 *  - sgs/product-card with sourceMode='wc-product' and productId>0 →
	 *    that single ID.
	 *
	 * @param array $blocks           parse_blocks() output (or innerBlocks).
	 * @param int[] $product_ids      Accumulator — appended in document order.
	 * @param bool  $grid_contributed Set true when any wc-product grid contributed.
	 */
	private static function collect( array $blocks, array &$product_ids, bool &$grid_contributed ): void {
		foreach ( $blocks as $block ) {
			$name  = $block['blockName'] ?? '';
			$attrs = ( isset( $block['attrs'] ) && \is_array( $block['attrs'] ) ) ? $block['attrs'] : array();

			if ( 'sgs/card-grid' === $name && 'wc-product' === ( $attrs['source'] ?? '' ) ) {
				$grid_ids = Card_Grid_Products::get_product_ids( $attrs );
				if ( ! empty( $grid_ids ) ) {
					$grid_contributed = true;
					foreach ( $grid_ids as $grid_product_id ) {
						// SEC: gate — handpick mode may include draft/hidden IDs;
						// is_publicly_listable() is the single source of truth
						// (duplicated-calculation-drifts). Collection mode already
						// passes status=>'publish' to wc_get_products, but the gate
						// adds is_visible() for catalog_visibility=hidden defence.
						if ( self::is_publicly_listable( \absint( $grid_product_id ) ) ) {
							$product_ids[] = \absint( $grid_product_id );
						}
					}
				}
			} elseif ( 'sgs/product-card' === $name && 'wc-product' === ( $attrs['sourceMode'] ?? '' ) ) {
				$card_product_id = \absint( $attrs['productId'] ?? 0 );
				// SEC: gate — a loose card's connected product may have been drafted
				// or hidden after the block was saved; suppress from the ItemList.
				if ( $card_product_id > 0 && self::is_publicly_listable( $card_product_id ) ) {
					$product_ids[] = $card_product_id;
				}
			}

			if ( ! empty( $block['innerBlocks'] ) && \is_array( $block['innerBlocks'] ) ) {
				self::collect( $block['innerBlocks'], $product_ids, $grid_contributed );
			}
		}
	}
}

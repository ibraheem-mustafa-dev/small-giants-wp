<?php
/**
 * Product Collection empty-detection registry.
 *
 * Records whether a `woocommerce/product-collection` block's FRONTEND query
 * actually returned any products, keyed by the block's `queryId` attribute —
 * feeding conditional-visibility.php's condition 9 ("hide this block when the
 * related product collection it names has no products").
 *
 * Why this hook pair, not a guess at WooCommerce's query result:
 *
 * 1. `query_loop_block_query_vars` (documented in
 *    product-collection-same-term.php's docblock, confirmed on the
 *    WooCommerce 11 source 2026-09-25) is the filter WooCommerce's Product
 *    Collection Controller uses to build the FULL final `WP_Query` args array
 *    for the block — that array is what gets handed to `new WP_Query()`.
 *    Nothing downstream drops unknown keys from it, so this file's priority
 *    30 handler (after same-term's priority 20) stashes the block's own
 *    `queryId` context value into that array under a private query var,
 *    `sgs_collection_query_id`. `usesContext: ["queryId"]` on the descendant
 *    query blocks is real, publicly documented WooCommerce/Core Query-block
 *    API — `woocommerce/product-results-count` already reads the identical
 *    context key in this codebase's own product templates (see
 *    `theme/sgs-theme/templates/archive-product.html`'s docblock comment).
 * 2. `the_posts` is core WordPress, fired by EVERY `WP_Query` (main or
 *    secondary) once its DB query has actually run, with the executed
 *    `WP_Query` object passed by reference as the second argument. Reading
 *    the private query var back off that object at this point tells us the
 *    REAL result of the REAL query — not a query-args prediction — with no
 *    dependency on WooCommerce internals beyond the one filter already
 *    relied on elsewhere in this codebase.
 *
 * This is more reliable than trying to detect emptiness from the rendered
 * HTML (a `render_block_woocommerce/product-collection` filter would still
 * need to guess at "no products" markup, which WooCommerce is free to change)
 * and needs no per-block opt-in: it runs for every Product Collection query
 * that carries a non-zero `queryId`, which every collection has by default
 * once placed in the editor.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const SGS_COLLECTION_QUERY_ID_VAR = 'sgs_collection_query_id';

/**
 * The registry itself: query ID => whether that query's last run on this
 * request returned any posts. Returned by reference so the two functions
 * below share one array without a class or a global.
 *
 * @return array<int, bool>
 */
function &sgs_collection_results_registry(): array {
	static $registry = array();
	return $registry;
}

/**
 * Record a Product Collection query's result.
 *
 * @param int  $query_id    The collection's `queryId` attribute.
 * @param bool $has_results Whether its last executed query returned any posts.
 * @return void
 */
function sgs_collection_record_has_results( int $query_id, bool $has_results ): void {
	if ( $query_id <= 0 ) {
		return;
	}
	$registry              = &sgs_collection_results_registry();
	$registry[ $query_id ] = $has_results;
}

/**
 * Look up whether a Product Collection query has run yet this request, and
 * if so, whether it returned any products.
 *
 * @param int $query_id The collection's `queryId` attribute.
 * @return bool|null True/false when known, null when that collection has not
 *                    executed its query yet on this request (e.g. it renders
 *                    after the block asking the question, or nothing on the
 *                    page carries that queryId).
 */
function sgs_collection_has_results( int $query_id ): ?bool {
	if ( $query_id <= 0 ) {
		return null;
	}
	$registry = &sgs_collection_results_registry();
	return $registry[ $query_id ] ?? null;
}

/**
 * Stash the block's `queryId` context into its own frontend query args, so
 * the `the_posts` handler below can identify which query just ran.
 *
 * Runs at priority 30 — after product-collection-same-term.php's priority 20
 * same-term narrowing — but order relative to that filter does not matter
 * here: this handler only ADDS a private query var, never touches any
 * WooCommerce-owned key.
 *
 * @param array     $query WooCommerce's already-built frontend query args.
 * @param \WP_Block $block The block being rendered (the product-template
 *                          descendant, per product-collection-same-term.php).
 * @param int       $page  Unused — required by the filter signature.
 * @return array Query args, with the private marker added when eligible.
 */
function sgs_stash_collection_query_id( $query, $block, $page ) { // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
	$is_product_collection = $block->context['query']['isProductCollectionBlock'] ?? false;
	if ( ! $is_product_collection ) {
		return $query;
	}

	$query_id = absint( $block->context['queryId'] ?? 0 );
	if ( $query_id > 0 ) {
		$query[ SGS_COLLECTION_QUERY_ID_VAR ] = $query_id;
	}

	return $query;
}
add_filter( 'query_loop_block_query_vars', __NAMESPACE__ . '\\sgs_stash_collection_query_id', 30, 3 );

/**
 * After any `WP_Query` has actually run, record whether a marked Product
 * Collection query returned any posts.
 *
 * `the_posts` fires for every `WP_Query` on the request (main and secondary),
 * after the DB query has executed and `found_posts` has already been set —
 * `$posts` here is the query's real result, not a prediction from its args.
 *
 * @param array     $posts The query's resulting posts.
 * @param \WP_Query $query The query instance that just ran.
 * @return array The unmodified $posts — this handler only observes.
 */
function sgs_record_collection_query_results( $posts, $query ) {
	if ( ! ( $query instanceof \WP_Query ) ) {
		return $posts;
	}

	$query_id = absint( $query->get( SGS_COLLECTION_QUERY_ID_VAR ) );
	if ( $query_id > 0 ) {
		sgs_collection_record_has_results( $query_id, ! empty( $posts ) );
	}

	return $posts;
}
add_filter( 'the_posts', __NAMESPACE__ . '\\sgs_record_collection_query_results', 10, 2 );

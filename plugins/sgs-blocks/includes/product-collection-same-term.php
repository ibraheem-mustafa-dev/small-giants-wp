<?php
/**
 * WooCommerce Product Collection extension — "Show products that share this
 * product's <taxonomy>" (the `sgsSameTermAs` attribute).
 *
 * On a single-product template, a `woocommerce/product-collection` block
 * whose `sgsSameTermAs` attribute names a taxonomy registered on the
 * `product` post type lists other products sharing at least one of the
 * current product's terms in that taxonomy, excluding the current product
 * itself. Works for any shop: `product_brand` ("More from Ray-Ban"),
 * `pa_shape` ("Similar shapes"), or a bakery's own `product_cat`.
 *
 * The attribute is registered server-side via `register_block_type_args` so
 * it survives the editor's undeclared-attribute strip and reaches this file's
 * render-time filter (see extension-attrs-rest-register.php's docblock for
 * why an undeclared `sgs*` attribute never reaches PHP from the editor).
 *
 * The query change hooks `query_loop_block_query_vars` — the same WordPress
 * core filter WooCommerce's own
 * `Automattic\WooCommerce\Blocks\BlockTypes\ProductCollection\Controller::build_frontend_query()`
 * uses to build the block's frontend query (confirmed by reading that class
 * on the WooCommerce 11 source, 2026-09-25). WooCommerce hooks it at
 * priority 10 and returns the collection's FULL final WP_Query args (tax_query,
 * post__in, posts_per_page, stock-status meta_query, etc.) as this filter's
 * return value. This file hooks the SAME filter at priority 20 so it runs
 * after WooCommerce's own handler, and only ADDS a same-term tax_query clause
 * and a post__not_in exclusion on top of whatever WooCommerce already built —
 * every other WooCommerce arg (per page, order, stock visibility) is left
 * untouched. There is no public per-collection handler registry to extend
 * instead (`HandlerRegistry` is a private WooCommerce class), so this is the
 * only extension point available without patching WooCommerce.
 *
 * Editor preview: WooCommerce's editor ServerSideRender preview fetches
 * products via a REST request whose query params
 * (`update_rest_query_in_editor()` on `rest_product_query`) only recognise
 * WooCommerce's own fixed set — orderby, on_sale, stock_status, attributes,
 * handpicked, featured, timeFrame, priceRange, tax_query,
 * productCollectionLocation, productCollectionQueryContext. An arbitrary
 * custom block attribute such as `sgsSameTermAs` is never serialised into
 * that request by WooCommerce's own query-building JS, so the editor preview
 * cannot respect it without patching WooCommerce's client-side query-args
 * builder. Left as WooCommerce's own (unfiltered) preview — acceptable per
 * the build brief.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const SGS_SAME_TERM_BLOCK_NAME = 'woocommerce/product-collection';
const SGS_SAME_TERM_ATTR       = 'sgsSameTermAs';

/**
 * Register the `sgsSameTermAs` attribute server-side, Product Collection only.
 *
 * @param array  $args       register_block_type args.
 * @param string $block_name Block name.
 * @return array
 */
function sgs_register_same_term_attribute( array $args, string $block_name ): array {
	if ( SGS_SAME_TERM_BLOCK_NAME !== $block_name ) {
		return $args;
	}

	$existing = isset( $args['attributes'] ) && is_array( $args['attributes'] ) ? $args['attributes'] : array();
	if ( ! isset( $existing[ SGS_SAME_TERM_ATTR ] ) ) {
		$existing[ SGS_SAME_TERM_ATTR ] = array(
			'type'    => 'string',
			'default' => '',
		);
	}
	$args['attributes'] = $existing;
	return $args;
}
add_filter( 'register_block_type_args', __NAMESPACE__ . '\\sgs_register_same_term_attribute', 20, 2 );

/**
 * Taxonomies eligible for "same as" grouping: `product_brand` (only when
 * registered), `product_cat`, `product_tag`, and every `pa_*` product
 * attribute taxonomy (label from `wc_get_attribute_taxonomies()`).
 *
 * @return array<int, array{value: string, label: string}> SelectControl options, "None" first.
 */
function sgs_same_term_taxonomy_options(): array {
	$options = array(
		array(
			'value' => '',
			'label' => __( 'None', 'sgs-blocks' ),
		),
	);

	if ( taxonomy_exists( 'product_brand' ) ) {
		$options[] = array(
			'value' => 'product_brand',
			'label' => __( 'Brand', 'sgs-blocks' ),
		);
	}

	if ( taxonomy_exists( 'product_cat' ) ) {
		$options[] = array(
			'value' => 'product_cat',
			'label' => __( 'Category', 'sgs-blocks' ),
		);
	}

	if ( taxonomy_exists( 'product_tag' ) ) {
		$options[] = array(
			'value' => 'product_tag',
			'label' => __( 'Tag', 'sgs-blocks' ),
		);
	}

	if ( function_exists( 'wc_get_attribute_taxonomies' ) && function_exists( 'wc_attribute_taxonomy_name' ) ) {
		foreach ( wc_get_attribute_taxonomies() as $attribute ) {
			$taxonomy = wc_attribute_taxonomy_name( $attribute->attribute_name );
			if ( taxonomy_exists( $taxonomy ) ) {
				$options[] = array(
					'value' => $taxonomy,
					'label' => $attribute->attribute_label,
				);
			}
		}
	}

	return $options;
}

/**
 * Expose the taxonomy list to the editor on the always-present 'wp-blocks'
 * handle — the same inline-script channel class-sgs-blocks.php and
 * conditional-visibility.php already use, so it is readable regardless of
 * bundle load order.
 */
function sgs_enqueue_same_term_editor_data(): void {
	wp_add_inline_script(
		'wp-blocks',
		'window.sgsBlocksData = window.sgsBlocksData || {};' .
		'window.sgsBlocksData.sameTermTaxonomies = ' . wp_json_encode( sgs_same_term_taxonomy_options() ) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\sgs_enqueue_same_term_editor_data' );

/**
 * Sanitise a requested taxonomy slug: it must exist and be attached to the
 * `product` post type. Anything else — empty, unknown, or a non-product
 * taxonomy — returns ''.
 *
 * @param string $taxonomy Requested taxonomy slug.
 * @return string Sanitised taxonomy slug, or ''.
 */
function sgs_same_term_sanitise_taxonomy( string $taxonomy ): string {
	if ( '' === $taxonomy ) {
		return '';
	}
	if ( ! taxonomy_exists( $taxonomy ) || ! is_object_in_taxonomy( 'product', $taxonomy ) ) {
		return '';
	}
	return $taxonomy;
}

/**
 * Resolve the product being viewed for the current render.
 *
 * Resolution order: the block's `postId` context (WordPress core supplies
 * this automatically on any singular template render, and Product
 * Collection's block.json declares `usesContext: [ "templateSlug", "postId" ]`
 * — confirmed on the WooCommerce 11 source, 2026-09-25) falling back to
 * `get_queried_object_id()` on a singular product page.
 *
 * @param \WP_Block $block The block instance.
 * @return int Product post ID, or 0 when none can be resolved.
 */
function sgs_same_term_current_product_id( \WP_Block $block ): int {
	$context_id = $block->context['postId'] ?? 0;
	if ( $context_id ) {
		return absint( $context_id );
	}

	if ( is_singular( 'product' ) ) {
		return absint( get_queried_object_id() );
	}

	return 0;
}

/**
 * Add a same-term `tax_query` clause and exclude the current product from a
 * Product Collection block's frontend query, when `sgsSameTermAs` names a
 * valid product taxonomy and a current product can be resolved.
 *
 * Runs at `query_loop_block_query_vars` priority 20 — after WooCommerce's own
 * handler (priority 10) has already produced the collection's full query
 * args — so every other WooCommerce arg (per page, order, stock visibility,
 * the collection's own filters) is preserved untouched.
 *
 * @param array     $query WooCommerce's already-built frontend query args.
 * @param \WP_Block $block The block being rendered.
 * @param int       $page  Current page number (unused — pagination is
 *                          already resolved into $query by WooCommerce).
 * @return array Query args, with the same-term clause added when eligible.
 */
function sgs_apply_same_term_query( $query, $block, $page ) { // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
	$is_product_collection = $block->context['query']['isProductCollectionBlock'] ?? false;
	if ( ! $is_product_collection ) {
		return $query;
	}

	$taxonomy = sgs_same_term_sanitise_taxonomy( (string) ( $block->attributes[ SGS_SAME_TERM_ATTR ] ?? '' ) );
	if ( '' === $taxonomy ) {
		return $query;
	}

	$product_id = sgs_same_term_current_product_id( $block );
	if ( ! $product_id ) {
		return $query;
	}

	$terms = wp_get_post_terms( $product_id, $taxonomy, array( 'fields' => 'ids' ) );
	if ( is_wp_error( $terms ) || empty( $terms ) ) {
		// No terms in this taxonomy on this product — show nothing rather
		// than silently falling back to the collection's unfiltered results.
		$query['post__in'] = array( -1 );
		return $query;
	}

	$tax_query          = isset( $query['tax_query'] ) && is_array( $query['tax_query'] ) ? $query['tax_query'] : array();
	$tax_query[]        = array(
		'taxonomy' => $taxonomy,
		'field'    => 'term_id',
		'terms'    => $terms,
		'operator' => 'IN',
	);
	$query['tax_query'] = $tax_query; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query

	$exclude               = isset( $query['post__not_in'] ) && is_array( $query['post__not_in'] ) ? $query['post__not_in'] : array();
	$exclude[]             = $product_id;
	$query['post__not_in'] = array_values( array_unique( $exclude ) );

	return $query;
}
add_filter( 'query_loop_block_query_vars', __NAMESPACE__ . '\\sgs_apply_same_term_query', 20, 3 );

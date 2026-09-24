<?php
/**
 * Taxonomy-terms mode resolver for sgs/filter-search.
 *
 * Split out of render.php (PHP file-length limit, 300 lines) — this is the
 * ONLY place that builds the searchable term list markup for the
 * 'taxonomy-terms' searchMode. See render.php's own docblock for the mode
 * overview and the WooCommerce query-string contract this reuses.
 *
 * Loaded via require_once from render.php, so — like render-helpers.php —
 * its top-level function declaration is deduplicated by PHP's own
 * require_once bookkeeping even though render.php is `include`d fresh for
 * every block instance on the page; it is NOT itself a render.php, so this
 * is safe (mirrors includes/render-helpers.php).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve a taxonomy-terms mode block instance into everything render.php
 * needs to output: the term count, a human label for aria wiring, and the
 * pre-escaped `<ul>` markup of toggle links.
 *
 * @param array $attributes Block attributes.
 * @return array{total:int,attribute_label:string,terms_markup:string}|null
 *               Null means "render nothing" (mirrors render.php's own guards).
 */
function sgs_filter_search_resolve_taxonomy_terms( array $attributes ) {

	$fs_taxonomy = sanitize_key( $attributes['taxonomy'] ?? '' );

	// Guard: no taxonomy chosen, unregistered, or not attached to products —
	// render nothing (mirrors the attribute-chips "no attribute yet" guard).
	if ( '' === $fs_taxonomy || ! taxonomy_exists( $fs_taxonomy ) || ! in_array( $fs_taxonomy, get_object_taxonomies( 'product' ), true ) ) {
		return null;
	}

	$terms = get_terms(
		array(
			'taxonomy'   => $fs_taxonomy,
			'hide_empty' => true,
		)
	);

	if ( is_wp_error( $terms ) || ! is_array( $terms ) || empty( $terms ) ) {
		return null;
	}

	$fs_taxonomy_object = get_taxonomy( $fs_taxonomy );
	$attribute_label    = ( $fs_taxonomy_object && ! empty( $fs_taxonomy_object->labels->singular_name ) )
		? $fs_taxonomy_object->labels->singular_name
		: $fs_taxonomy;

	// WooCommerce's own query-string contract: attribute taxonomies
	// (pa_*) drop the `pa_` prefix (`pa_brand` -> `filter_brand`); every
	// other product taxonomy keeps its full name (`product_cat` ->
	// `filter_product_cat`, a custom `product_brand` -> `filter_product_brand`).
	$query_param = 'filter_' . ( 0 === strpos( $fs_taxonomy, 'pa_' ) ? substr( $fs_taxonomy, 3 ) : $fs_taxonomy );

	$raw_selected   = isset( $_GET[ $query_param ] ) ? sanitize_text_field( wp_unslash( $_GET[ $query_param ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only display state (which terms are already selected), not a state-changing action; matches WC's own filter widgets.
	$selected_slugs = array_values( array_filter( array_map( 'sanitize_title', explode( ',', $raw_selected ) ) ) );

	// Base URL for building each toggle link: the current request with
	// pagination stripped (selecting a filter resets to page 1, matching
	// WooCommerce's own filter blocks).
	$base_url = remove_query_arg( array( 'paged', 'product-page' ) );

	$show_counts = ! empty( $attributes['showCounts'] );

	$term_rows = array();
	foreach ( $terms as $fs_term ) {
		$is_selected = in_array( $fs_term->slug, $selected_slugs, true );
		$next_slugs  = $is_selected
			? array_values( array_diff( $selected_slugs, array( $fs_term->slug ) ) )
			: array_merge( $selected_slugs, array( $fs_term->slug ) );

		$term_url = empty( $next_slugs )
			? remove_query_arg( $query_param, $base_url )
			: add_query_arg( $query_param, implode( ',', $next_slugs ), $base_url );

		$row  = '<li class="sgs-filter-search__term-item" data-term-label="' . esc_attr( strtolower( $fs_term->name ) ) . '">';
		$row .= '<a href="' . esc_url( $term_url ) . '" class="sgs-filter-search__term-link" aria-pressed="' . ( $is_selected ? 'true' : 'false' ) . '">';
		$row .= '<span class="sgs-filter-search__term-check" aria-hidden="true"></span>';
		$row .= '<span class="sgs-filter-search__term-name">' . esc_html( $fs_term->name ) . '</span>';
		if ( $show_counts ) {
			$row .= '<span class="sgs-filter-search__term-count">' . esc_html( (string) $fs_term->count ) . '</span>';
		}
		$row .= '</a></li>';

		$term_rows[] = $row;
	}

	return array(
		'total'           => count( $terms ),
		'attribute_label' => $attribute_label,
		'terms_markup'    => '<ul class="sgs-filter-search__terms">' . implode( '', $term_rows ) . '</ul>',
	);
}

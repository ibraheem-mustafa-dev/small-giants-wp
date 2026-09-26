<?php
/**
 * Attribute-chips mode resolver for sgs/filter-search.
 *
 * The search box narrows the options of the core filter block it sits in:
 * a WooCommerce attribute filter (chosen by `attributeId`) or, when
 * `attributeId` is 0, a core taxonomy filter such as brand or category
 * (chosen by `taxonomy`). Filtering itself stays with the core block and
 * its own query string (`?filter_colour=`, `?brands=`), so ticking an
 * option behaves exactly as it does without this block.
 *
 * Loaded via require_once from render.php, so its top-level function is
 * declared once however many instances the page renders (mirrors
 * resolve-taxonomy-terms.php).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve the taxonomy an attribute-chips instance searches, and how many
 * options it holds.
 *
 * Visibility scoping: get_terms( hide_empty=true ) counts only terms
 * attached to a published product, so draft-only terms are excluded.
 *
 * @param array $attributes Block attributes.
 * @return array{total:int,attribute_label:string}|null Null means "render nothing".
 */
function sgs_filter_search_resolve_chip_taxonomy( array $attributes ) {

	$attribute_id = absint( $attributes['attributeId'] ?? 0 );

	if ( $attribute_id > 0 ) {
		$taxonomy = function_exists( 'wc_attribute_taxonomy_name_by_id' )
			? wc_attribute_taxonomy_name_by_id( $attribute_id )
			: '';
		if ( empty( $taxonomy ) || ! taxonomy_exists( $taxonomy ) ) {
			return null;
		}
		$label = function_exists( 'wc_attribute_label' ) ? wc_attribute_label( $taxonomy ) : $taxonomy;
	} else {
		$taxonomy = sanitize_key( $attributes['taxonomy'] ?? '' );
		// Guard: nothing chosen yet, or not a product taxonomy — render nothing.
		if ( '' === $taxonomy || ! taxonomy_exists( $taxonomy ) || ! in_array( $taxonomy, get_object_taxonomies( 'product' ), true ) ) {
			return null;
		}
		$taxonomy_object = get_taxonomy( $taxonomy );
		$label           = ( $taxonomy_object && ! empty( $taxonomy_object->labels->singular_name ) )
			? $taxonomy_object->labels->singular_name
			: $taxonomy;
	}

	$terms = get_terms(
		array(
			'taxonomy'   => $taxonomy,
			'hide_empty' => true,
			'fields'     => 'ids',
		)
	);

	if ( is_wp_error( $terms ) || ! is_array( $terms ) ) {
		return null;
	}

	return array(
		'total'           => count( $terms ),
		'attribute_label' => $label,
	);
}

<?php
/**
 * Chosen-chip look and the All chip's count for `woocommerce/product-filter-chips`.
 *
 * Part of the filter look extension (product-filter-look.php); each setting is empty or off by default and prints
 * nothing until set.
 *
 * Chosen chip (`sgsChipSelectedShadow`, `sgsChipSelectedShadowColour`, `sgsChipSelectedOffsetX`, `sgsChipSelectedOffsetY`):
 * the shared layered shadow and an offset on the chip WooCommerce marks `aria-checked="true"` and on the All chip while it is
 * current. The offset prints through the individual `translate` property, the same mapping sgs/accordion's filter and
 * sgs/form-field-tiles use, so a hover `transform` is untouched.
 *
 * All count (`sgsChipAllCount`): the All chip carries a count span like the other chips, holding the number of distinct
 * visible products in the shop, not the sum of the terms' counts (a product in two terms is counted once).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Declarations for a chosen chip: the shared shadow and the offset.
 *
 * @param array<string, mixed> $attrs Stored block attributes.
 * @return string[] Declarations without semicolons; empty when none is set.
 */
function sgs_filter_look_chosen_decls( array $attrs ): array {
	require_once __DIR__ . '/render-helpers.php';
	require_once __DIR__ . '/helpers-colour-variants.php';
	$decls    = sgs_shadow_decls(
		$attrs,
		array(
			'base'   => 'sgsChipSelectedShadow',
			'colour' => 'sgsChipSelectedShadowColour',
		)
	)['normal'];
	$offset_x = sgs_css_length_value( (string) ( $attrs['sgsChipSelectedOffsetX'] ?? '' ) );
	$offset_y = sgs_css_length_value( (string) ( $attrs['sgsChipSelectedOffsetY'] ?? '' ) );
	if ( '' !== $offset_x || '' !== $offset_y ) {
		$decls[] = 'translate:' . ( '' !== $offset_x ? $offset_x : '0' ) . ' ' . ( '' !== $offset_y ? $offset_y : '0' );
	}
	return $decls;
}

/**
 * The number of distinct products the shop lists: published, not hidden from the catalogue, and in stock when the store hides
 * out-of-stock products.
 *
 * @return int Product count.
 */
function sgs_filter_look_all_count(): int {
	static $count = null;
	if ( null !== $count ) {
		return $count;
	}
	if ( ! function_exists( 'wc_get_product_visibility_term_ids' ) ) {
		return 0;
	}
	$hidden = array( wc_get_product_visibility_term_ids()['exclude-from-catalog'] ?? 0 );
	if ( 'yes' === get_option( 'woocommerce_hide_out_of_stock_items' ) ) {
		$hidden[] = wc_get_product_visibility_term_ids()['outofstock'] ?? 0;
	}
	$query = new \WP_Query(
		array(
			'post_type'              => 'product',
			'post_status'            => 'publish',
			'fields'                 => 'ids',
			'posts_per_page'         => 1,
			'no_found_rows'          => false,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
			'tax_query'              => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- the catalogue's own visibility rule.
				array(
					'taxonomy' => 'product_visibility',
					'field'    => 'term_taxonomy_id',
					'terms'    => array_values( array_filter( array_map( 'intval', $hidden ) ) ),
					'operator' => 'NOT IN',
				),
			),
		)
	);
	$count = (int) $query->found_posts;
	return $count;
}

/**
 * The All chip's count span, shaped like the other chips' (bare number when the count pill is on, bracketed otherwise).
 *
 * @param int  $count Product count.
 * @param bool $pill  True when the count pill setting is on.
 * @return string Markup.
 */
function sgs_filter_look_all_count_markup( int $count, bool $pill ): string {
	$number = (string) $count;
	return '<span class="wc-block-product-filter-chips__count">' . ( $pill ? $number : '(' . $number . ')' ) . '</span>';
}

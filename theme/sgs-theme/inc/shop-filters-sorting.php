<?php
/**
 * SGS Shop Filters — extra catalog sort options.
 *
 * Two additional, opt-in "Sort by" options for any WooCommerce shop: "Biggest
 * saving" (by RRP minus current price, RRP meta key configurable) and "Brand
 * A-Z" (by the `product_brand` taxonomy term name). Both are OFF until a
 * client enables them in the Customizer (sgs_shop_filters_settings.php), so
 * an existing site's sort dropdown is unchanged by default.
 *
 * Uses WooCommerce's own documented extension points for adding a custom
 * catalog sort option — `woocommerce_catalog_orderby` (adds the dropdown
 * label) + `woocommerce_get_catalog_ordering_args` (maps the chosen value to
 * WP_Query args) — the same mechanism WooCommerce itself uses for its
 * built-in "Price", "Popularity" etc. options, so it works for the classic
 * catalog-ordering dropdown and for `woocommerce_get_catalog_ordering_args()`
 * calls the block-based catalog-sorting surface also relies on. Neither sort
 * can be expressed as a plain `orderby`/`meta_key`, so the actual ORDER BY is
 * built in `posts_clauses`, gated to the current sort choice only.
 *
 * REQUIRE LINE NEEDED (functions.php is a shared loader — not edited by this
 * task; add next to shop-filters-settings.php's require):
 *
 *   require_once __DIR__ . '/inc/shop-filters-sorting.php';
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

const BIGGEST_SAVING_ORDERBY = 'sgs_biggest_saving';
const BRAND_AZ_ORDERBY       = 'sgs_brand_az';

/**
 * Add the enabled custom sort option(s) to the "Sort by" dropdown.
 *
 * @param array<string,string> $options Existing orderby value => label pairs.
 * @return array<string,string>
 */
function add_catalog_orderby_options( array $options ): array {
	if ( get_theme_mod( 'sgs_shop_sort_biggest_saving_enabled', false ) ) {
		$options[ BIGGEST_SAVING_ORDERBY ] = __( 'Biggest saving', 'sgs-theme' );
	}
	if ( get_theme_mod( 'sgs_shop_sort_brand_az_enabled', false ) ) {
		$options[ BRAND_AZ_ORDERBY ] = __( 'Brand: A-Z', 'sgs-theme' );
	}
	return $options;
}
add_filter( 'woocommerce_catalog_orderby', __NAMESPACE__ . '\add_catalog_orderby_options' );
add_filter( 'woocommerce_default_catalog_orderby_options', __NAMESPACE__ . '\add_catalog_orderby_options' );

/**
 * Map the chosen custom orderby onto WP_Query ordering args.
 *
 * WP_Query does not understand `sgs_biggest_saving`/`sgs_brand_az` as
 * built-in orderby values; they only need to survive onto `$query->query_vars`
 * unchanged so `filter_shop_query_clauses()` below can recognise them and
 * build the real ORDER BY itself.
 *
 * @param array<string,string> $args Existing ordering args (orderby/order).
 * @return array<string,string>
 */
function filter_catalog_ordering_args( array $args ): array {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only sort choice, same GET param WooCommerce's own catalog ordering reads unguarded.
	$chosen = isset( $_GET['orderby'] ) ? sanitize_text_field( wp_unslash( $_GET['orderby'] ) ) : '';

	if ( BIGGEST_SAVING_ORDERBY === $chosen && get_theme_mod( 'sgs_shop_sort_biggest_saving_enabled', false ) ) {
		$args['orderby'] = BIGGEST_SAVING_ORDERBY;
		$args['order']   = 'DESC';
	} elseif ( BRAND_AZ_ORDERBY === $chosen && get_theme_mod( 'sgs_shop_sort_brand_az_enabled', false ) ) {
		$args['orderby'] = BRAND_AZ_ORDERBY;
		$args['order']   = 'ASC';
	}

	return $args;
}
add_filter( 'woocommerce_get_catalog_ordering_args', __NAMESPACE__ . '\filter_catalog_ordering_args' );

/**
 * Build the real ORDER BY (and any JOIN it needs) for the two custom sorts.
 *
 * Scoped to the main shop/product-archive query only — never touches any
 * other query on the request, including admin queries or unrelated
 * product_shortcode/product_collection queries that happen not to inherit.
 *
 * @param array<string,string> $clauses SQL clause pieces (where/groupby/join/having/orderby/distinct/fields).
 * @param \WP_Query            $query   The query being filtered.
 * @return array<string,string>
 */
function filter_shop_query_clauses( array $clauses, \WP_Query $query ): array {
	global $wpdb;

	if ( is_admin() || ! $query->is_main_query() ) {
		return $clauses;
	}
	if ( 'product' !== $query->get( 'post_type' ) && ! ( function_exists( 'is_shop' ) && is_shop() ) ) {
		return $clauses;
	}

	$orderby = $query->get( 'orderby' );

	// Each lookup is a scalar sub-query that returns ONE value per product, so the
	// result set is never multiplied: a join on term_relationships would return a
	// row per term the product carries (categories, tags, attributes), and a join
	// on `_price` would return two rows for a variable product (WooCommerce stores
	// its min and max price as separate `_price` rows).
	if ( BIGGEST_SAVING_ORDERBY === $orderby && get_theme_mod( 'sgs_shop_sort_biggest_saving_enabled', false ) ) {
		$rrp_meta_key = sanitize_key( (string) get_theme_mod( 'sgs_shop_sort_rrp_meta_key', '' ) );
		if ( '' === $rrp_meta_key ) {
			return $clauses;
		}
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table names only; the meta key is a placeholder.
		$saving_sql         = $wpdb->prepare(
			"( SELECT CAST( MAX( sgs_rrp.meta_value ) AS DECIMAL(10,2) ) FROM {$wpdb->postmeta} AS sgs_rrp WHERE sgs_rrp.post_id = {$wpdb->posts}.ID AND sgs_rrp.meta_key = %s )"
			. " - ( SELECT CAST( MIN( sgs_price.meta_value ) AS DECIMAL(10,2) ) FROM {$wpdb->postmeta} AS sgs_price WHERE sgs_price.post_id = {$wpdb->posts}.ID AND sgs_price.meta_key = '_price' )",
			$rrp_meta_key
		);
		$clauses['orderby'] = "( {$saving_sql} ) DESC, " . $clauses['orderby'];
	} elseif ( BRAND_AZ_ORDERBY === $orderby && get_theme_mod( 'sgs_shop_sort_brand_az_enabled', false ) && taxonomy_exists( 'product_brand' ) ) {
		$brand_sql          = "( SELECT MIN( sgs_brand_term.name ) FROM {$wpdb->term_relationships} AS sgs_brand_tr"
			. " INNER JOIN {$wpdb->term_taxonomy} AS sgs_brand_tt ON sgs_brand_tt.term_taxonomy_id = sgs_brand_tr.term_taxonomy_id AND sgs_brand_tt.taxonomy = 'product_brand'"
			. " INNER JOIN {$wpdb->terms} AS sgs_brand_term ON sgs_brand_term.term_id = sgs_brand_tt.term_id"
			. " WHERE sgs_brand_tr.object_id = {$wpdb->posts}.ID )";
		// Products with no brand sort last rather than first.
		$clauses['orderby'] = "( {$brand_sql} IS NULL ) ASC, {$brand_sql} ASC, " . $clauses['orderby'];
	}

	return $clauses;
}
add_filter( 'posts_clauses', __NAMESPACE__ . '\filter_shop_query_clauses', 10, 2 );

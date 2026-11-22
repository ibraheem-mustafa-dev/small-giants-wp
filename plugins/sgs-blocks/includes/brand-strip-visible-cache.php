<?php
/**
 * The cache of which brands the shop lists a product for, read by sgs/brand-strip's "product-brands" source with
 * "hide empty brands" on (src/blocks/brand-strip/product-brands-source.php::sgs_brand_strip_brand_ids_with_visible_products).
 *
 * That lookup loads the id of every listed product carrying one of the candidate brands, so it runs once and its answer
 * is kept in one transient, a map from the lookup's key (the candidate brand ids and the visibility terms the shop hides,
 * which follow `woocommerce_hide_out_of_stock_items`) to the brand ids found. The transient is deleted whenever a product
 * changes in a way that can change the answer: a product saved, published, trashed or deleted, or a product's brand or
 * catalogue visibility terms set (WooCommerce stores out-of-stock and hidden-from-catalogue as `product_visibility` terms,
 * so a stock status change sets them). It also expires after a day.
 *
 * Loaded on every request (includes/class-sgs-blocks.php) so the clearing hooks are in place where products are saved,
 * and by the block's source, which reads and writes the map.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'SGS_BRAND_STRIP_VISIBLE_CACHE' ) ) {
	define( 'SGS_BRAND_STRIP_VISIBLE_CACHE', 'sgs_brand_strip_visible_brands' );
}

if ( ! function_exists( 'sgs_brand_strip_visible_cache_key' ) ) {
	/**
	 * The map key for one lookup.
	 *
	 * @param int[]    $brand_ids Candidate brand ids (sorted, unique).
	 * @param string[] $hidden    Visibility terms the shop hides.
	 * @return string
	 */
	function sgs_brand_strip_visible_cache_key( array $brand_ids, array $hidden ) {
		sort( $brand_ids );
		sort( $hidden );
		return md5( implode( ',', $brand_ids ) . '|' . implode( ',', $hidden ) );
	}
}

if ( ! function_exists( 'sgs_brand_strip_visible_cache_get' ) ) {
	/**
	 * The cached answer for a lookup.
	 *
	 * @param string $key Map key.
	 * @return array<int,true>|null The brand ids as keys, or null when the cache does not hold the lookup.
	 */
	function sgs_brand_strip_visible_cache_get( $key ) {
		$map = get_transient( SGS_BRAND_STRIP_VISIBLE_CACHE );
		return is_array( $map ) && isset( $map[ $key ] ) && is_array( $map[ $key ] ) ? $map[ $key ] : null;
	}
}

if ( ! function_exists( 'sgs_brand_strip_visible_cache_set' ) ) {
	/**
	 * Keep a lookup's answer. The map holds at most 20 lookups (a site's strips ask a handful); the oldest goes first.
	 *
	 * @param string          $key     Map key.
	 * @param array<int,true> $visible The brand ids as keys.
	 */
	function sgs_brand_strip_visible_cache_set( $key, array $visible ) {
		$map = get_transient( SGS_BRAND_STRIP_VISIBLE_CACHE );
		$map = is_array( $map ) ? $map : array();
		unset( $map[ $key ] );
		$map[ $key ] = $visible;
		$map         = array_slice( $map, -20, null, true );
		set_transient( SGS_BRAND_STRIP_VISIBLE_CACHE, $map, DAY_IN_SECONDS );
	}
}

if ( ! function_exists( 'sgs_brand_strip_visible_cache_flush' ) ) {
	/**
	 * Clear the cache.
	 */
	function sgs_brand_strip_visible_cache_flush() {
		delete_transient( SGS_BRAND_STRIP_VISIBLE_CACHE );
	}
}

if ( ! function_exists( 'sgs_brand_strip_visible_cache_on_post' ) ) {
	/**
	 * Clear the cache when the post is a product (`deleted_post`, `trashed_post`, `untrashed_post` pass any post).
	 *
	 * @param int $post_id Post id.
	 */
	function sgs_brand_strip_visible_cache_on_post( $post_id ) {
		if ( 'product' === get_post_type( $post_id ) ) {
			sgs_brand_strip_visible_cache_flush();
		}
	}
}

if ( ! function_exists( 'sgs_brand_strip_visible_cache_on_terms' ) ) {
	/**
	 * Clear the cache when a post's brand or catalogue visibility terms are set (`set_object_terms`).
	 *
	 * @param int    $object_id Object id.
	 * @param array  $terms     Terms given.
	 * @param array  $tt_ids    Term taxonomy ids.
	 * @param string $taxonomy  Taxonomy.
	 */
	function sgs_brand_strip_visible_cache_on_terms( $object_id, $terms, $tt_ids, $taxonomy ) {
		if ( in_array( $taxonomy, array( 'product_brand', 'product_visibility' ), true ) ) {
			sgs_brand_strip_visible_cache_flush();
		}
	}
}

if ( ! defined( 'SGS_BRAND_STRIP_VISIBLE_CACHE_HOOKED' ) ) {
	define( 'SGS_BRAND_STRIP_VISIBLE_CACHE_HOOKED', true );
	add_action( 'save_post_product', 'sgs_brand_strip_visible_cache_flush', 10, 0 );
	add_action( 'deleted_post', 'sgs_brand_strip_visible_cache_on_post', 10, 1 );
	add_action( 'trashed_post', 'sgs_brand_strip_visible_cache_on_post', 10, 1 );
	add_action( 'untrashed_post', 'sgs_brand_strip_visible_cache_on_post', 10, 1 );
	add_action( 'set_object_terms', 'sgs_brand_strip_visible_cache_on_terms', 10, 4 );
	add_action( 'woocommerce_product_set_stock_status', 'sgs_brand_strip_visible_cache_flush', 10, 0 );
	add_action( 'woocommerce_variation_set_stock_status', 'sgs_brand_strip_visible_cache_flush', 10, 0 );
}

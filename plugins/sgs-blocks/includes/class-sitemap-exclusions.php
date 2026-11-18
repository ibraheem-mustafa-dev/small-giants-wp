<?php
/**
 * Core sitemap exclusions: what must never be listed in `wp-sitemap.xml`.
 *
 * - A page the framework marks `noindex` ({@see Noindex_Store_Pages::noindexed_page_ids()}: cart,
 *   checkout, account and sign-in pages, plus anything added with `sgs_noindex_page_ids`) is left
 *   out, so the sitemap and the robots meta tag come from one list and cannot drift.
 * - A product WooCommerce marks hidden (catalogue visibility "Hidden") is left out of the products sitemap.
 * - The users sitemap is off: it lists `/author/<username>/` for every author, which exposes an
 *   administrator's username. A site that wants it returns true from `sgs_sitemap_include_users`.
 * - Product tag archives are left out: they are thin lists. A site that wants them returns true
 *   from `sgs_sitemap_include_product_tags`.
 *
 * The filters are core's (`wp_sitemaps_posts_query_args`, `wp_sitemaps_add_provider`,
 * `wp_sitemaps_taxonomies`), so a site whose SEO plugin replaces the core sitemap is unaffected.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-noindex-store-pages.php';

/**
 * Class Sitemap_Exclusions
 */
final class Sitemap_Exclusions {

	/**
	 * Register the core sitemap filters.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'wp_sitemaps_posts_query_args', array( __CLASS__, 'exclude_noindexed_pages' ), 10, 2 );
		\add_filter( 'wp_sitemaps_add_provider', array( __CLASS__, 'filter_provider' ), 10, 2 );
		\add_filter( 'wp_sitemaps_taxonomies', array( __CLASS__, 'filter_taxonomies' ) );
	}

	/**
	 * Keep the noindexed pages out of the pages sitemap.
	 *
	 * @param array<string,mixed> $args      Query arguments for the sitemap's posts.
	 * @param string              $post_type Post type being listed.
	 * @return array<string,mixed>
	 */
	public static function exclude_noindexed_pages( $args, $post_type ) {
		$args = (array) $args;
		if ( 'product' === $post_type ) {
			return self::exclude_hidden_products( $args );
		}
		if ( 'page' !== $post_type ) {
			return $args;
		}
		$ids = Noindex_Store_Pages::noindexed_page_ids();
		if ( ! empty( $ids ) ) {
			$args['post__not_in'] = \array_values( \array_unique( \array_merge( (array) ( $args['post__not_in'] ?? array() ), $ids ) ) );
		}
		return $args;
	}

	/**
	 * Keep products WooCommerce hides from both the catalogue and search out of the products sitemap.
	 *
	 * Such a product (catalogue visibility "Hidden") prints no `Product` node ({@see Product_Item_List::is_publicly_listable()})
	 * and is not for sale in the shop, so it has no place in the sitemap. The condition is "lacks at least one of the
	 * two exclusion terms", which is every visibility but hidden.
	 *
	 * @param array<string,mixed> $args Query arguments for the sitemap's posts.
	 * @return array<string,mixed>
	 */
	private static function exclude_hidden_products( array $args ): array {
		$visibility = array(
			'relation' => 'OR',
			array(
				'taxonomy' => 'product_visibility',
				'field'    => 'name',
				'terms'    => array( 'exclude-from-catalog' ),
				'operator' => 'NOT IN',
			),
			array(
				'taxonomy' => 'product_visibility',
				'field'    => 'name',
				'terms'    => array( 'exclude-from-search' ),
				'operator' => 'NOT IN',
			),
		);
		$existing   = isset( $args['tax_query'] ) && \is_array( $args['tax_query'] ) ? $args['tax_query'] : array();
		$args['tax_query'] = array_merge( array( 'relation' => 'AND' ), $existing ? array( $existing ) : array(), array( $visibility ) );
		return $args;
	}

	/**
	 * Drop the users sitemap unless the site opts in.
	 *
	 * @param \WP_Sitemaps_Provider|false $provider Provider object.
	 * @param string                      $name     Provider name (`posts`, `taxonomies`, `users`).
	 * @return \WP_Sitemaps_Provider|false
	 */
	public static function filter_provider( $provider, $name ) {
		if ( 'users' === $name && ! \apply_filters( 'sgs_sitemap_include_users', false ) ) {
			return false;
		}
		return $provider;
	}

	/**
	 * Drop the product tag taxonomy unless the site opts in.
	 *
	 * @param array<string,\WP_Taxonomy> $taxonomies Taxonomies the sitemap lists.
	 * @return array<string,\WP_Taxonomy>
	 */
	public static function filter_taxonomies( $taxonomies ) {
		$taxonomies = (array) $taxonomies;
		if ( isset( $taxonomies['product_tag'] ) && ! \apply_filters( 'sgs_sitemap_include_product_tags', false ) ) {
			unset( $taxonomies['product_tag'] );
		}
		return $taxonomies;
	}
}

<?php
/**
 * WooCommerce "product_brand" taxonomy source for sgs/brand-strip.
 *
 * The block's `source` attribute picks between the existing hand-typed
 * `logos[]` repeater ("manual", unchanged default) and this file's query
 * ("product-brands"), which pulls WooCommerce's core `product_brand`
 * taxonomy terms and maps each one to the SAME logo-item shape the manual
 * repeater already uses — so render.php's existing tile-building loop needs
 * no source-specific branching to draw each tile, only to source the array.
 *
 * WooCommerce-INDEPENDENT gate: every entry point checks taxonomy_exists()
 * first and returns an empty array when it doesn't exist (WooCommerce off,
 * or a WooCommerce version without core Product Brands) — the block then
 * renders nothing on the front end, matching the "any-client" rule that new
 * behaviour must degrade gracefully rather than fatal or assume WooCommerce.
 * The editor surfaces a notice for this case (see source-controls.js);
 * render.php stays silent, since a missing taxonomy on the LIVE site is not
 * an error to show visitors.
 *
 * Term thumbnail: the lookup is the framework's shared one,
 * `includes/helpers-brand-logo.php::sgs_brand_logo_media`, so this block, the
 * product card's brand overlay, the product-page brand binding and the bag
 * drawer's cart lines all read a brand's logo through one implementation.
 * When a brand has no thumbnail, the returned entry's `media` is null and
 * render.php's own Display setting decides whether to fall back to text.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_brand_strip_product_brands_available' ) ) {
	/**
	 * Whether the WooCommerce core "product_brand" taxonomy is registered on
	 * this site. Shared gate for the render path.
	 *
	 * @return bool
	 */
	function sgs_brand_strip_product_brands_available() {
		return taxonomy_exists( 'product_brand' );
	}
}

if ( ! function_exists( 'sgs_brand_strip_get_product_brand_logos' ) ) {
	/**
	 * Query `product_brand` terms per the block's brand* attributes and
	 * return an ordered list of logo-shaped entries.
	 *
	 * @param array $attributes Block attributes (render.php's $attributes).
	 * @return array Logo-shaped entries (media/alt/name/linkUrl/linkTarget/
	 *               linkRel/_key/objectFit). Empty when the taxonomy is
	 *               missing or the query matches nothing.
	 */
	function sgs_brand_strip_get_product_brand_logos( array $attributes ) {
		if ( ! sgs_brand_strip_product_brands_available() ) {
			return array();
		}

		$order_raw     = isset( $attributes['brandOrder'] ) ? sanitize_key( $attributes['brandOrder'] ) : 'name';
		$allowed_order = array( 'name', 'count', 'term_order' );
		$orderby       = in_array( $order_raw, $allowed_order, true ) ? $order_raw : 'name';
		$order         = ( 'count' === $orderby ) ? 'DESC' : 'ASC';

		$max_items = isset( $attributes['brandMaxItems'] ) ? absint( $attributes['brandMaxItems'] ) : 20;
		$max_items = min( max( 1, $max_items ), 100 );

		$hide_empty = ! isset( $attributes['brandHideEmpty'] ) || (bool) $attributes['brandHideEmpty'];
		$link_terms = ! isset( $attributes['brandLinkToShop'] ) || (bool) $attributes['brandLinkToShop'];

		$default_fit = ( isset( $attributes['logoFit'] ) && in_array( $attributes['logoFit'], array( 'contain', 'cover' ), true ) )
			? $attributes['logoFit']
			: 'contain';

		$query = array(
			'taxonomy'   => 'product_brand',
			'orderby'    => $orderby,
			'order'      => $order,
			'hide_empty' => $hide_empty,
			'number'     => $max_items,
		);
		// "Taxonomy order" is WooCommerce's own brand order: the drag-and-drop position
		// it stores as term meta `order` (Products > Brands; `menu_order` over its REST
		// API). Core's `term_order` orderby only means anything alongside object_ids,
		// so on its own it silently fell back to the default order. Brands with no
		// stored position are still listed (the NOT EXISTS clause); MySQL puts a
		// missing value first, so give every brand a position when using this order.
		if ( 'term_order' === $orderby ) {
			$query['meta_query'] = array(
				'relation'     => 'OR',
				'brand_order'  => array(
					'key'  => 'order',
					'type' => 'NUMERIC',
				),
				'no_order'     => array(
					'key'     => 'order',
					'compare' => 'NOT EXISTS',
				),
			);
			// WP_Term_Query takes ONE orderby string: a named meta_query clause is
			// supported, an array of them (WP_Query's form) is not. It is passed to
			// strtolower(), a TypeError fatal on PHP 8 (it took the page down,
			// 2026-09-29).
			$query['orderby'] = 'brand_order';
			$query['order']   = 'ASC';
		}

		$terms = get_terms( $query );

		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return array();
		}

		$logos = array();
		foreach ( $terms as $term ) {
			$link_url = '';
			if ( $link_terms ) {
				$term_link = get_term_link( $term );
				$link_url  = is_wp_error( $term_link ) ? '' : (string) $term_link;
			}

			$logos[] = array(
				'media'      => sgs_brand_logo_media( $term->term_id ),
				'alt'        => '',
				'decorative' => false,
				'name'       => $term->name,
				'linkUrl'    => $link_url,
				'linkTarget' => '_self',
				'linkRel'    => '',
				'_key'       => 'pb-' . $term->term_id,
				'objectFit'  => $default_fit,
			);
		}

		return $logos;
	}
}

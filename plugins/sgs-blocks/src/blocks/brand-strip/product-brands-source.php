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
 * Term thumbnail: WooCommerce core stores a brand's image the same way it
 * stores a product-CATEGORY image — as an attachment ID in the term meta
 * key `thumbnail_id` (see WC_Admin_Taxonomies's category/brand thumbnail
 * meta box, both taxonomies share the identical mechanism). When a brand
 * has no thumbnail, the returned entry's `media` is null and render.php's
 * own Display setting decides whether to fall back to text.
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

if ( ! function_exists( 'sgs_brand_strip_product_brand_media' ) ) {
	/**
	 * Resolve a brand term's thumbnail (WooCommerce core `thumbnail_id` term
	 * meta) into the unified media-slot shape `logos[]` items already use.
	 *
	 * @param int $term_id Brand term ID.
	 * @return array|null Media shape, or null when the term has no usable image.
	 */
	function sgs_brand_strip_product_brand_media( $term_id ) {
		$thumbnail_id = absint( get_term_meta( $term_id, 'thumbnail_id', true ) );
		if ( ! $thumbnail_id ) {
			return null;
		}

		$url = wp_get_attachment_image_url( $thumbnail_id, 'medium' );
		if ( ! $url ) {
			return null;
		}

		$meta = wp_get_attachment_metadata( $thumbnail_id );

		return array(
			'url'    => $url,
			'type'   => 'image',
			'id'     => $thumbnail_id,
			'alt'    => (string) get_post_meta( $thumbnail_id, '_wp_attachment_image_alt', true ),
			'mime'   => (string) get_post_mime_type( $thumbnail_id ),
			'width'  => isset( $meta['width'] ) ? absint( $meta['width'] ) : 0,
			'height' => isset( $meta['height'] ) ? absint( $meta['height'] ) : 0,
		);
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

		$terms = get_terms(
			array(
				'taxonomy'   => 'product_brand',
				'orderby'    => $orderby,
				'order'      => $order,
				'hide_empty' => $hide_empty,
				'number'     => $max_items,
			)
		);

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
				'media'      => sgs_brand_strip_product_brand_media( $term->term_id ),
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

<?php
/**
 * The ONE brand-logo lookup every surface prints a brand through.
 *
 * A brand is a term of WooCommerce's native brand taxonomy, and its logo is
 * that term's `thumbnail_id` term meta (an attachment ID) — the identical
 * mechanism WooCommerce uses for a product-CATEGORY image.
 *
 * Callers:
 *   - `sgs/brand-strip`            src/blocks/brand-strip/product-brands-source.php
 *   - `sgs/product-card`           includes/product-card-live-fill.php (card overlay)
 *   - the product-page binding     includes/product-field-values.php (`brand_logo`)
 *   - the bag drawer's cart lines  includes/cart-item-extensions.php
 *
 * ⚠️ The text alternative is the BRAND NAME, never the attachment's own alt
 * text. An attachment's `_wp_attachment_image_alt` is frequently empty, and a
 * logo that replaces a printed brand name must never land with an empty
 * accessible name. `sgs_brand_logo_img_markup()` therefore refuses to emit an
 * `<img>` at all unless it has a non-empty brand name to put in `alt`.
 *
 * ⚠️ The taxonomy is resolved through the `sgs_product_card_brand_taxonomy`
 * filter, the same filter the card's live fill and the product-field binding
 * already honour. Nothing here hardcodes the taxonomy name.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_brand_logo_taxonomy' ) ) {
	/**
	 * The brand taxonomy's name, filterable so a site can point every brand
	 * surface at its own taxonomy in one place.
	 *
	 * @return string Taxonomy name.
	 */
	function sgs_brand_logo_taxonomy() {
		return (string) apply_filters( 'sgs_product_card_brand_taxonomy', 'product_brand' );
	}
}

if ( ! function_exists( 'sgs_brand_logo_taxonomy_available' ) ) {
	/**
	 * Whether the brand taxonomy is registered on this site. False when
	 * WooCommerce is off, or on a WooCommerce without core Product Brands —
	 * every brand surface then degrades to text rather than fatalling.
	 *
	 * @return bool
	 */
	function sgs_brand_logo_taxonomy_available() {
		return taxonomy_exists( sgs_brand_logo_taxonomy() );
	}
}

if ( ! function_exists( 'sgs_brand_logo_media' ) ) {
	/**
	 * Resolve a brand term's thumbnail into the unified media-slot shape that
	 * `sgs/brand-strip`'s `logos[]` items already use.
	 *
	 * The returned `alt` is the ATTACHMENT's own alt text and is frequently
	 * empty: it exists for brand-strip's media slot, and is NOT the text
	 * alternative a printed logo should use. Use the brand name for that.
	 *
	 * @param int $term_id Brand term ID.
	 * @return array|null Media shape, or null when the term has no usable image.
	 */
	function sgs_brand_logo_media( $term_id ) {
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

if ( ! function_exists( 'sgs_brand_logo_term_for_product' ) ) {
	/**
	 * A product's first brand term.
	 *
	 * @param int $product_id Product post ID.
	 * @return \WP_Term|null The term, or null when the product has no brand.
	 */
	function sgs_brand_logo_term_for_product( $product_id ) {
		$product_id = absint( $product_id );
		if ( ! $product_id || ! sgs_brand_logo_taxonomy_available() ) {
			return null;
		}

		$terms = get_the_terms( $product_id, sgs_brand_logo_taxonomy() );
		if ( ! is_array( $terms ) || empty( $terms ) ) {
			return null;
		}

		$term = reset( $terms );
		return ( $term instanceof \WP_Term ) ? $term : null;
	}
}

if ( ! function_exists( 'sgs_brand_logo_for_product' ) ) {
	/**
	 * Everything a surface needs to print one product's brand: the name, its
	 * logo when the brand has one, and the brand archive URL.
	 *
	 * `url` is '' when the brand has no logo, when its `thumbnail_id` points
	 * at a deleted attachment, or when the taxonomy is absent — which is the
	 * name-only fallback path every caller takes.
	 *
	 * @param int $product_id Product post ID.
	 * @return array{name:string,url:string,width:int,height:int,link:string}
	 */
	function sgs_brand_logo_for_product( $product_id ) {
		$empty = array(
			'name'   => '',
			'url'    => '',
			'width'  => 0,
			'height' => 0,
			'link'   => '',
		);

		$term = sgs_brand_logo_term_for_product( $product_id );
		if ( null === $term ) {
			return $empty;
		}

		$link  = get_term_link( $term );
		$media = sgs_brand_logo_media( $term->term_id );

		return array(
			'name'   => (string) $term->name,
			'url'    => is_array( $media ) ? (string) $media['url'] : '',
			'width'  => is_array( $media ) ? absint( $media['width'] ) : 0,
			'height' => is_array( $media ) ? absint( $media['height'] ) : 0,
			'link'   => is_wp_error( $link ) ? '' : (string) $link,
		);
	}
}

if ( ! function_exists( 'sgs_brand_logo_img_markup' ) ) {
	/**
	 * One brand logo as an `<img>`, with the BRAND NAME as its text
	 * alternative.
	 *
	 * Returns '' — so the caller prints the brand name as text instead —
	 * whenever there is no logo URL, or no brand name to name it with. That
	 * second guard is what makes an empty accessible name unreachable.
	 *
	 * Intrinsic `width`/`height` attributes are emitted when known, so the
	 * logo reserves its space and cannot shift the layout as it loads. They
	 * are HTML attributes, not an inline `style` declaration (Spec 32); the
	 * rendered size is CSS's, set by the caller's class.
	 *
	 * @param array  $logo       A `sgs_brand_logo_for_product()` shape.
	 * @param string $class_name The `<img>` element's class.
	 * @return string Safe HTML, or '' when no logo can be printed.
	 */
	function sgs_brand_logo_img_markup( array $logo, string $class_name ) {
		$url  = isset( $logo['url'] ) ? (string) $logo['url'] : '';
		$name = isset( $logo['name'] ) ? trim( (string) $logo['name'] ) : '';

		if ( '' === $url || '' === $name ) {
			return '';
		}

		$dimensions = '';
		$width      = isset( $logo['width'] ) ? absint( $logo['width'] ) : 0;
		$height     = isset( $logo['height'] ) ? absint( $logo['height'] ) : 0;
		if ( $width && $height ) {
			$dimensions = ' width="' . $width . '" height="' . $height . '"';
		}

		return '<img class="' . esc_attr( $class_name ) . '" src="' . esc_url( $url ) . '"'
			. ' alt="' . esc_attr( $name ) . '"' . $dimensions
			. ' loading="lazy" decoding="async" />';
	}
}

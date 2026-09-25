<?php
/**
 * Product card live-data fill for sgs/product-card: the Frame Card elements (brand, rating,
 * saving badge, struck-through RRP, colour dots, wishlist heart) read from the
 * live WooCommerce product.
 *
 * The block's render.php calls sgs_product_card_live_fill() once, after the product
 * resolves, and every live branch then renders through the same element
 * helpers as typed mode (includes/product-card-builtin-render.php). A typed
 * value the operator set still wins; an empty one is filled from the product.
 *
 * Keys starting with an underscore are render-time only (never block
 * attributes): _sgsLiveProductId, _sgsLiveTitle and _sgsRrpDisplay.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/product-rrp.php';

if ( ! function_exists( 'sgs_product_card_live_fill' ) ) {
	/**
	 * Fill the Frame Card element attributes from a live WooCommerce product.
	 *
	 * @param array  $attributes  Block attributes.
	 * @param int    $product_id  Resolved product ID.
	 * @param string $source_mode The card's sourceMode.
	 * @return array Attributes with the empty Frame Card values filled.
	 */
	function sgs_product_card_live_fill( array $attributes, int $product_id, string $source_mode ): array {
		$attributes['_sgsLiveProductId'] = $product_id;

		if ( 'wc-product' !== $source_mode || $product_id <= 0 || ! function_exists( 'wc_get_product' ) ) {
			return $attributes;
		}
		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return $attributes;
		}
		$attributes['_sgsLiveTitle'] = $product->get_name();

		// Brand: the product's first term in WooCommerce's brand taxonomy.
		$brand_taxonomy = (string) apply_filters( 'sgs_product_card_brand_taxonomy', 'product_brand' );
		if ( ! empty( $attributes['showBrandOverlay'] ) && '' === trim( (string) ( $attributes['brandName'] ?? '' ) ) && taxonomy_exists( $brand_taxonomy ) ) {
			$brands = get_the_terms( $product_id, $brand_taxonomy );
			if ( is_array( $brands ) && ! empty( $brands ) ) {
				$attributes['brandName'] = $brands[0]->name;
			}
		}

		// Rating: always the product's own reviews in live mode.
		if ( ! empty( $attributes['showRating'] ) ) {
			$attributes['ratingValue'] = (float) $product->get_average_rating();
			$attributes['reviewCount'] = (int) $product->get_review_count();
		}

		// RRP: struck-through price and, when the badge label is empty, the saving.
		$rrp_key = (string) ( $attributes['rrpMetaKey'] ?? '' );
		if ( '' !== $rrp_key ) {
			$decimals = function_exists( 'wc_get_price_decimals' ) ? (int) wc_get_price_decimals() : 2;
			$price    = function_exists( 'wc_get_price_to_display' ) ? (float) wc_get_price_to_display( $product ) : (float) $product->get_price();
			$format   = 'percentage' === ( $attributes['rrpSavingFormat'] ?? 'amount' ) ? 'percentage' : 'amount';
			$rrp      = sgs_product_rrp_saving( $product_id, $rrp_key, (int) round( $price * ( 10 ** $decimals ) ), $decimals, $format );
			if ( ! $rrp['hidden'] ) {
				$attributes['_sgsRrpDisplay'] = $rrp['rrp_display'];
				if ( '' === trim( (string) ( $attributes['savingLabel'] ?? '' ) ) ) {
					$attributes['savingLabel'] = $rrp['text'];
				}
			}
		}

		// Colour dots: the chosen (or first colour-carrying) variation attribute.
		if ( empty( $attributes['colourSwatches'] ) && $product->is_type( 'variable' ) ) {
			$attributes['colourSwatches'] = sgs_product_card_live_swatches( $product, (string) ( $attributes['swatchAttribute'] ?? '' ) );
		}

		return $attributes;
	}
}

if ( ! function_exists( 'sgs_product_card_live_swatches' ) ) {
	/**
	 * Colour swatches from a variable product's attribute terms, in the
	 * product's own term order. A term without `_sgs_swatch_color` is skipped.
	 *
	 * @param \WC_Product $product   A variable product.
	 * @param string      $taxonomy  Attribute taxonomy to read; '' = auto.
	 * @return array<int, array{key: string, label: string, colour: string}>
	 */
	function sgs_product_card_live_swatches( $product, string $taxonomy ): array {
		$taxonomy   = sanitize_key( $taxonomy );
		$candidates = array();
		foreach ( $product->get_attributes() as $attr ) {
			if ( ! is_object( $attr ) || ! $attr->is_taxonomy() || ! $attr->get_variation() ) {
				continue;
			}
			if ( '' !== $taxonomy && $taxonomy !== $attr->get_name() ) {
				continue;
			}
			$candidates[] = $attr;
		}

		foreach ( $candidates as $attr ) {
			$swatches = array();
			foreach ( $attr->get_options() as $term_id ) {
				$term = get_term( (int) $term_id, $attr->get_name() );
				if ( ! $term instanceof \WP_Term ) {
					continue;
				}
				$hex = sanitize_hex_color( (string) get_term_meta( $term->term_id, '_sgs_swatch_color', true ) );
				if ( ! $hex ) {
					continue;
				}
				$swatches[] = array(
					'key'    => $term->slug,
					'label'  => $term->name,
					'colour' => $hex,
				);
			}
			if ( ! empty( $swatches ) ) {
				return $swatches;
			}
		}
		return array();
	}
}

if ( ! function_exists( 'sgs_product_card_rrp_markup' ) ) {
	/**
	 * The struck-through RRP beside the price (live mode, rrpMetaKey set, and
	 * the RRP above the price).
	 *
	 * @param array $attributes Attributes after sgs_product_card_live_fill().
	 * @return string Safe HTML or ''.
	 */
	function sgs_product_card_rrp_markup( array $attributes ): string {
		$rrp = (string) ( $attributes['_sgsRrpDisplay'] ?? '' );
		if ( '' === $rrp ) {
			return '';
		}
		return '<s class="sgs-product-card__rrp"><span class="sgs-sr-only">' . esc_html__( 'Recommended retail price:', 'sgs-blocks' ) . ' </span>' . esc_html( $rrp ) . '</s>';
	}
}

if ( ! function_exists( 'sgs_product_card_wishlist_markup' ) ) {
	/**
	 * The wishlist heart on the card image. The saved state lives in the
	 * visitor's browser (store `sgs/wishlist`, src/blocks/product-card/wishlist.js),
	 * so the server always renders it unsaved and the store syncs it on load.
	 *
	 * @param array $attributes Attributes after sgs_product_card_live_fill().
	 * @return string Safe HTML or ''.
	 */
	function sgs_product_card_wishlist_markup( array $attributes ): string {
		$product_id = (int) ( $attributes['_sgsLiveProductId'] ?? 0 );
		if ( empty( $attributes['showWishlist'] ) || $product_id <= 0 ) {
			return '';
		}
		$title = (string) ( $attributes['_sgsLiveTitle'] ?? '' );
		$label = '' !== $title
			/* translators: %s is the product name. */
			? sprintf( __( 'Save %s to your wishlist', 'sgs-blocks' ), $title )
			: __( 'Save to your wishlist', 'sgs-blocks' );

		return '<button type="button" class="sgs-product-card__wishlist" aria-pressed="false" aria-label="' . esc_attr( $label ) . '"'
			. ' data-wp-interactive="sgs/wishlist"'
			. ' ' . wp_interactivity_data_wp_context(
				array(
					'id'    => $product_id,
					'saved' => false,
				)
			)
			. ' data-wp-init="callbacks.sync"'
			. ' data-wp-on--click="actions.toggle"'
			. ' data-wp-bind--aria-pressed="context.saved">'
			. '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20s-7-4.6-7-9.6A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.4c0 5-7 9.6-7 9.6z"></path></svg>'
			. '</button>';
	}
}

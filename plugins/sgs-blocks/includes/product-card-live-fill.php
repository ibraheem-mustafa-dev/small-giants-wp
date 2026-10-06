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
 * attributes): _sgsLiveProductId, _sgsLiveTitle, _sgsRrpDisplay and
 * _sgsBrandLogo.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/product-rrp.php';
// Required HERE, not only via render-helpers.php: this file is reached through
// render.php, but a caller that loads it directly must still resolve the brand
// lookup rather than silently filling no logo.
require_once __DIR__ . '/helpers-brand-logo.php';

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

		// Brand: the product's first term in WooCommerce's brand taxonomy, and
		// that brand's logo when it has one. Both come from the shared lookup
		// (includes/helpers-brand-logo.php), which honours the
		// `sgs_product_card_brand_taxonomy` filter.
		//
		// `_sgsBrandLogo` is a render-time key, not a stored attribute: it is
		// live product data, so it is resolved per render exactly as
		// `_sgsLiveTitle` and `_sgsRrpDisplay` are. A typed-mode card never
		// reaches here and so has no logo — it prints its typed brand name.
		if ( ! empty( $attributes['showBrandOverlay'] ) ) {
			$brand = sgs_brand_logo_for_product( $product_id );

			if ( '' === trim( (string) ( $attributes['brandName'] ?? '' ) ) && '' !== $brand['name'] ) {
				$attributes['brandName'] = $brand['name'];
			}

			// The logo stands in for the brand NAME, so its text alternative
			// is the name the card would otherwise have printed — never the
			// attachment's own alt text, which is frequently empty.
			if ( '' !== $brand['url'] ) {
				$attributes['_sgsBrandLogo'] = array(
					'url'    => $brand['url'],
					'name'   => '' !== $brand['name'] ? $brand['name'] : (string) ( $attributes['brandName'] ?? '' ),
					'width'  => $brand['width'],
					'height' => $brand['height'],
				);
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
		// The taxonomy the dots came from travels with them in
		// `_sgsSwatchTaxonomy` (a runtime key, never a stored attribute): it is
		// what turns a dot into a real control rather than a decoration, because
		// it names the axis a click selects and the `attribute_{taxonomy}` query
		// parameter the product link carries — see
		// includes/product-card-swatches.php.
		if ( empty( $attributes['colourSwatches'] ) && $product->is_type( 'variable' ) ) {
			$sgs_swatch_taxonomy          = '';
			$attributes['colourSwatches'] = sgs_product_card_live_swatches(
				$product,
				(string) ( $attributes['swatchAttribute'] ?? '' ),
				$sgs_swatch_taxonomy
			);
			if ( ! empty( $attributes['colourSwatches'] ) && '' !== $sgs_swatch_taxonomy ) {
				$attributes['_sgsSwatchTaxonomy'] = $sgs_swatch_taxonomy;
			}
		}

		return $attributes;
	}
}

if ( ! function_exists( 'sgs_product_card_live_swatches' ) ) {
	/**
	 * Colour swatches from a variable product's attribute terms, in the shop's
	 * own term order (the order the option pickers use). A term without
	 * `_sgs_swatch_color` is skipped.
	 *
	 * @param \WC_Product $product  A variable product.
	 * @param string      $taxonomy Attribute taxonomy to read; '' = auto.
	 * @param string      $resolved Receives the taxonomy the returned dots came
	 *                              from, so the caller can name the axis a dot
	 *                              selects without re-running the auto-pick.
	 * @return array<int, array{key: string, label: string, colour: string}>
	 */
	function sgs_product_card_live_swatches( $product, string $taxonomy, &$resolved = null ): array {
		$resolved = '';
		$taxonomy = sanitize_key( $taxonomy );
		foreach ( $product->get_variation_attributes() as $attr_taxonomy => $slugs ) {
			if ( ! taxonomy_exists( $attr_taxonomy ) || ( '' !== $taxonomy && $taxonomy !== $attr_taxonomy ) ) {
				continue;
			}
			$swatches = array();
			foreach ( (array) $slugs as $slug ) {
				$term = get_term_by( 'slug', (string) $slug, $attr_taxonomy );
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
				$resolved = $attr_taxonomy;
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

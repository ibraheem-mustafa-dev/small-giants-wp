<?php
/**
 * Product card (sgs/product-card): the colour-swatch row.
 *
 * Kept in its own file (both includes/product-card-builtin-render.php and
 * src/blocks/product-card/render.php are over the PHP file-length limit);
 * required by both, so the function is declared once however many cards the
 * page renders.
 *
 * Two shapes come out of one function, decided per dot by the DATA:
 *
 *  - A dot that knows its own attribute TERM (a `key` slug, a `label` and a
 *    resolved `_sgsSwatchTaxonomy`) renders as a real `<button type="button">`.
 *    It is focusable, keyboard-operable and carries the term name as its
 *    accessible name. src/blocks/product-card/view.js::selectSwatch picks it up
 *    by `.sgs-product-card__swatch--button`, swaps that one card's photo through
 *    the existing applyPillSelection() path, and rewrites that card's product
 *    links to carry `attribute_{taxonomy}={slug}` so sgs/buybox opens on the
 *    chosen colour (includes/helpers-preselect-url.php).
 *  - A dot an operator typed by hand (a colour with no term behind it) renders
 *    as the decorative `<span role="img">` it has always been: there is no
 *    variation to select, so there is nothing for a button to do, and a
 *    focusable control that does nothing is worse than a swatch that is
 *    honestly decorative.
 *
 * The '+N' overflow pill is non-interactive in both shapes — it is a count, not
 * a control.
 *
 * Each dot's hue is DATA (colourSwatches[].colour), carried as scoped CSS
 * custom-property VALUES, never inline `style=` (Spec 32) — the same colour-chip
 * technique as sgs/option-picker's own swatch chip. The '+N' pill has no
 * background fill (border + muted text only — style.css
 * .sgs-product-card__swatch-more), so there is no colour-on-colour contrast to
 * solve here and sgs_wcag_text_colour_for_bg() is not called.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_card_swatch_param' ) ) {
	/**
	 * The query-parameter name a swatch deep-link uses for one attribute
	 * taxonomy. WooCommerce's own variation-form convention, so the parameter
	 * reads the same whether sgs/buybox or Woo's core form renders the product.
	 *
	 * @param string $taxonomy Attribute taxonomy (e.g. 'pa_colour').
	 * @return string Parameter name, or '' when the taxonomy is empty.
	 */
	function sgs_product_card_swatch_param( string $taxonomy ): string {
		$taxonomy = sanitize_key( $taxonomy );
		return '' === $taxonomy ? '' : 'attribute_' . $taxonomy;
	}
}

if ( ! function_exists( 'sgs_product_card_swatches_markup' ) ) {

	/**
	 * The colour-swatch row for one card instance, capped at swatchMaxVisible
	 * then collapsed into a '+N' pill. Called from every render branch.
	 *
	 * @param array  $attributes Block attributes (after sgs_product_card_live_fill()).
	 * @param string $card_uid   Per-instance uid (also on the wrapper) — used to
	 *                           build unique, collision-free per-swatch scoped
	 *                           CSS anchors across multiple cards on one page.
	 * @return string Safe HTML, or '' when colourSwatches is empty.
	 */
	function sgs_product_card_swatches_markup( array $attributes, string $card_uid = '' ) {
		$items = isset( $attributes['colourSwatches'] ) && is_array( $attributes['colourSwatches'] ) ? $attributes['colourSwatches'] : array();
		if ( empty( $items ) ) {
			return '';
		}

		$max_visible = isset( $attributes['swatchMaxVisible'] ) ? max( 1, absint( $attributes['swatchMaxVisible'] ) ) : 4;
		$visible     = array_slice( $items, 0, $max_visible );
		$hidden      = max( 0, count( $items ) - count( $visible ) );

		// The taxonomy sgs_product_card_live_swatches() actually read. Without
		// it a dot has no attribute to select, so it stays decorative.
		$taxonomy = sanitize_key( (string) ( $attributes['_sgsSwatchTaxonomy'] ?? '' ) );
		$param    = sgs_product_card_swatch_param( $taxonomy );

		// The product the deep-link points at. '' in typed/designed mode, which
		// simply leaves the link untouched.
		$product_id  = (int) ( $attributes['_sgsLiveProductId'] ?? 0 );
		$product_url = $product_id > 0 ? (string) get_permalink( $product_id ) : '';

		$scoped_css  = '';
		$dots_html   = '';
		$i           = 0;
		$interactive = false;

		foreach ( $visible as $item ) {
			$colour = isset( $item['colour'] ) ? sanitize_hex_color( (string) $item['colour'] ) : '';
			if ( '' === $colour ) {
				continue;
			}
			$label  = isset( $item['label'] ) ? sanitize_text_field( (string) $item['label'] ) : '';
			$key    = isset( $item['key'] ) ? sanitize_title( (string) $item['key'] ) : '';
			$dot_id = ( '' !== $card_uid ? $card_uid : 'sgs-pc' ) . '-swatch-' . (int) $i;
			$i++;

			$scoped_css .= '#' . $dot_id . '{--sgs-pc-swatch-bg:' . esc_attr( $colour ) . ';}';

			// A button needs something to select AND an accessible name — both
			// come from the term. Missing either leaves the dot decorative.
			if ( '' !== $param && '' !== $key && '' !== $label ) {
				$interactive = true;
				$dots_html  .= '<button type="button" id="' . esc_attr( $dot_id ) . '"'
					. ' class="sgs-product-card__swatch sgs-product-card__swatch--button"'
					. ' data-sgs-swatch-taxonomy="' . esc_attr( $taxonomy ) . '"'
					. ' data-sgs-swatch-param="' . esc_attr( $param ) . '"'
					. ' data-sgs-swatch-key="' . esc_attr( $key ) . '"'
					. ' aria-pressed="false"'
					. ' title="' . esc_attr( $label ) . '"'
					. ' aria-label="' . esc_attr( $label ) . '"'
					. '></button>';
				continue;
			}

			$dots_html .= '<span id="' . esc_attr( $dot_id ) . '" class="sgs-product-card__swatch"'
				. ( '' !== $label ? ' role="img" title="' . esc_attr( $label ) . '" aria-label="' . esc_attr( $label ) . '"' : ' aria-hidden="true"' )
				. '></span>';
		}

		if ( '' === $dots_html ) {
			return '';
		}

		$more_html = '';
		if ( $hidden > 0 ) {
			/* translators: %d is the number of additional colour options not shown as swatches. */
			$more_label = sprintf( __( '+%d more colours', 'sgs-blocks' ), $hidden );
			$more_html  = '<span class="sgs-product-card__swatch-more" role="img" aria-label="' . esc_attr( $more_label ) . '">+' . (int) $hidden . '</span>';
		}

		// A row of buttons is one named group of controls; a row of decorative
		// dots is not, so the role and the deep-link base appear only when at
		// least one dot is a real control.
		$wrap_attrs = '';
		if ( $interactive ) {
			$wrap_attrs = ' role="group" aria-label="' . esc_attr__( 'Colour options', 'sgs-blocks' ) . '"';
			if ( '' !== $product_url ) {
				$wrap_attrs .= ' data-sgs-swatch-product-url="' . esc_url( $product_url ) . '"';
			}
		}

		$style_tag = '' !== $scoped_css ? '<style>' . wp_strip_all_tags( $scoped_css ) . '</style>' : '';

		return $style_tag . '<div class="sgs-product-card__swatches"' . $wrap_attrs . '>' . $dots_html . $more_html . '</div>';
	}
}

<?php
/**
 * Frame Card component: generic "attribute tag" beside the product title.
 *
 * Shows a small bordered chip next to the title when the resolved product
 * carries an operator-chosen WooCommerce product-attribute term (e.g. an
 * optician's "Polarised" lens attribute) or an operator-chosen product tag.
 * Nothing here is hardcoded to one client's vocabulary — the taxonomy/term
 * (or tag) is picked per-instance via attributeTagTaxonomy/attributeTagTerm.
 *
 * ⚠ BLOCK-DIRECTORY-PRIVATE FILE, not includes/product-card-builtin-render.php.
 * The typed-mode title element (`<h2..h4|p class="sgs-product-card__title">`)
 * is rendered by that SHARED include's sgs_product_card_builtin_render(), and
 * this feature was built under a touch-only-this-block-directory constraint
 * that forbids editing plugins/sgs-blocks/includes/. Rather than skip typed
 * mode, sgs_product_card_wrap_title_with_attribute_tag() below post-processes
 * the shared function's own returned HTML (a plain string) to splice the tag
 * in — see that function's docblock. The 3 bound-mode branches render their
 * title markup directly inside src/blocks/product-card/render.php (this
 * block's own file), so those call the markup function directly instead.
 *
 * Recommended follow-up for whoever next has includes/ in scope: move this
 * wiring into sgs_product_card_builtin_render()'s own title markup so typed
 * mode no longer depends on a regex splice.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_card_attribute_tag_matches' ) ) {

	/**
	 * Whether the resolved product carries the configured term/tag.
	 *
	 * Typed mode (no live product to check, $product_id === 0 or
	 * $source_mode === 'typed') has nothing to verify against — presence of a
	 * configured term slug is itself the trigger, matching the operator-
	 * authored precedent every other Frame Card element already uses
	 * (rating/brand/saving-badge/swatches are not derived from live data).
	 *
	 * @param int    $product_id  Resolved product ID (0 = none / typed mode).
	 * @param string $source_mode Block's sourceMode attribute.
	 * @param string $mode        'attribute' or 'tag'.
	 * @param string $taxonomy    Attribute taxonomy slug (ignored for 'tag').
	 * @param string $term_slug   Term slug (attribute mode) or product_tag slug (tag mode).
	 * @return bool
	 */
	function sgs_product_card_attribute_tag_matches( int $product_id, string $source_mode, string $mode, string $taxonomy, string $term_slug ): bool {
		if ( 0 === $product_id || 'typed' === $source_mode ) {
			return true;
		}
		if ( 'tag' === $mode ) {
			return (bool) has_term( $term_slug, 'product_tag', $product_id );
		}
		$taxonomy = sanitize_key( $taxonomy );
		if ( '' === $taxonomy || ! taxonomy_exists( $taxonomy ) ) {
			return false;
		}
		return (bool) has_term( $term_slug, $taxonomy, $product_id );
	}
}

if ( ! function_exists( 'sgs_product_card_attribute_tag_term_label' ) ) {

	/**
	 * Resolve a term's own display name, for the "empty text = term name" default.
	 *
	 * @param string $mode      'attribute' or 'tag'.
	 * @param string $taxonomy  Attribute taxonomy slug (ignored for 'tag').
	 * @param string $term_slug Term slug or product_tag slug.
	 * @return string Term name, or '' when it cannot be resolved.
	 */
	function sgs_product_card_attribute_tag_term_label( string $mode, string $taxonomy, string $term_slug ): string {
		$tax = ( 'tag' === $mode ) ? 'product_tag' : sanitize_key( $taxonomy );
		if ( '' === $tax || ! taxonomy_exists( $tax ) ) {
			return '';
		}
		$term = get_term_by( 'slug', $term_slug, $tax );
		return ( $term && ! is_wp_error( $term ) ) ? $term->name : '';
	}
}

if ( ! function_exists( 'sgs_product_card_attribute_tag_resolve_text' ) ) {

	/**
	 * Resolve the tag's display text, or '' when it should not render.
	 *
	 * @param array  $attributes  Block attributes.
	 * @param int    $product_id  Resolved product ID (0 = none / typed mode).
	 * @param string $source_mode Block's sourceMode attribute.
	 * @return string
	 */
	function sgs_product_card_attribute_tag_resolve_text( array $attributes, int $product_id, string $source_mode ): string {
		if ( empty( $attributes['showAttributeTag'] ) ) {
			return '';
		}

		$mode = in_array( $attributes['attributeTagSource'] ?? 'attribute', array( 'attribute', 'tag' ), true )
			? $attributes['attributeTagSource']
			: 'attribute';

		$taxonomy  = sanitize_key( (string) ( $attributes['attributeTagTaxonomy'] ?? '' ) );
		$term_slug = sanitize_title( (string) ( $attributes['attributeTagTerm'] ?? '' ) );

		if ( '' === $term_slug || ( 'attribute' === $mode && '' === $taxonomy ) ) {
			return '';
		}

		if ( ! sgs_product_card_attribute_tag_matches( $product_id, $source_mode, $mode, $taxonomy, $term_slug ) ) {
			return '';
		}

		$custom_text = sanitize_text_field( (string) ( $attributes['attributeTagText'] ?? '' ) );
		if ( '' !== $custom_text ) {
			return $custom_text;
		}

		$term_label = sgs_product_card_attribute_tag_term_label( $mode, $taxonomy, $term_slug );
		return '' !== $term_label ? $term_label : ucwords( str_replace( array( '-', '_' ), ' ', $term_slug ) );
	}
}

if ( ! function_exists( 'sgs_product_card_attribute_tag_markup' ) ) {

	/**
	 * Full tag markup, or '' when it should not render.
	 *
	 * @param array  $attributes  Block attributes.
	 * @param int    $product_id  Resolved product ID (0 = none / typed mode).
	 * @param string $source_mode Block's sourceMode attribute.
	 * @return string Safe HTML.
	 */
	function sgs_product_card_attribute_tag_markup( array $attributes, int $product_id, string $source_mode ): string {
		$text = sgs_product_card_attribute_tag_resolve_text( $attributes, $product_id, $source_mode );
		if ( '' === $text ) {
			return '';
		}
		return '<span class="sgs-product-card__attribute-tag">' . esc_html( $text ) . '</span>';
	}
}

if ( ! function_exists( 'sgs_product_card_wrap_title_with_attribute_tag' ) ) {

	/**
	 * Splice the attribute-tag markup next to the title inside an already-
	 * rendered HTML fragment (used ONLY for the typed branch — see this
	 * file's own docblock for why). Wraps the matched title element and the
	 * tag together in a new `.sgs-product-card__title-row` div so both sit on
	 * one flex row, matching Frame Card.dc.html's real title-row markup.
	 *
	 * Matches on the stable `class="sgs-product-card__title"` marker rather
	 * than a specific heading tag, so it works for every headingLevel value
	 * (h2/h3/h4/p) without needing to know which one was used.
	 *
	 * @param string $html        Already-rendered card HTML containing the title element.
	 * @param array  $attributes  Block attributes.
	 * @param int    $product_id  Resolved product ID (0 = none / typed mode).
	 * @param string $source_mode Block's sourceMode attribute.
	 * @return string The HTML, with the title wrapped and tag inserted when applicable.
	 */
	function sgs_product_card_wrap_title_with_attribute_tag( string $html, array $attributes, int $product_id, string $source_mode ): string {
		$tag_markup = sgs_product_card_attribute_tag_markup( $attributes, $product_id, $source_mode );
		if ( '' === $tag_markup ) {
			return $html;
		}

		$wrapped = preg_replace_callback(
			'/<(h2|h3|h4|p) class="sgs-product-card__title">.*?<\/\1>/s',
			static function ( array $matches ) use ( $tag_markup ) {
				return '<div class="sgs-product-card__title-row">' . $matches[0] . $tag_markup . '</div>';
			},
			$html,
			1
		);

		return null !== $wrapped ? $wrapped : $html;
	}
}

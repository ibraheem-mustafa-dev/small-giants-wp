<?php
/**
 * Choice-flow product-option step fallback — a term's own badge + description.
 *
 * Spec 43 FR-43-25: "each option's image, badge and one-line description are
 * attribute-term fields beside the existing swatch fields (`_sgs_swatch_image_id`,
 * `_sgs_term_badge`, `_sgs_term_description`), set once per term and shown
 * everywhere: buybox pickers, the guided buybox, and flow product-option steps
 * that don't override them." `sgs_choice_flow_merge_option_extras()`
 * (`choice-flow-product-attribute-step.php`) already merges a flow's own
 * per-option `badge`/`description` (empty string when the operator never set
 * one); this file supplies the SAME term fallback `sgs/option-picker` already
 * reads, for the one merged row that came back empty.
 *
 * Not wired into a render.php here — `choice-flow-question/render.php` and
 * `choice-flow-chrome.php` are owned by another agent this session. The one
 * line for the main thread to add, in `choice-flow-question/render.php`
 * right after `$description = (string) $merged['description'];` (it already
 * has `$value` = the term slug and `$product_attribute` = the taxonomy in
 * scope at that point):
 *
 *   if ( '' === $badge && '' === $description ) {
 *       $term_fallback = sgs_choice_flow_term_details( $product_attribute, $value );
 *       $badge         = $term_fallback['badge'];
 *       $description   = $term_fallback['description'];
 *   }
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_term_details' ) ) {
	/**
	 * A term's own badge + short description, by taxonomy + slug.
	 *
	 * Reads the SAME term_meta keys `sgs/option-picker` reads
	 * (`_sgs_term_badge`, `_sgs_term_description` — registered + saved by
	 * `configurator-term-badge-fields.php`), so a badge/description set once
	 * on the attribute term appears in the standard buybox, the guided
	 * buybox and here identically. Empty taxonomy, empty slug, or no such
	 * term all return the empty-string default — never a fatal.
	 *
	 * @param string $taxonomy WooCommerce attribute taxonomy (e.g. 'pa_topping').
	 * @param string $slug     Term slug.
	 * @return array{badge:string,description:string}
	 */
	function sgs_choice_flow_term_details( string $taxonomy, string $slug ): array {
		$empty = array(
			'badge'       => '',
			'description' => '',
		);

		if ( '' === $taxonomy || '' === $slug || ! taxonomy_exists( $taxonomy ) ) {
			return $empty;
		}

		$term = get_term_by( 'slug', $slug, $taxonomy );
		if ( ! $term instanceof \WP_Term ) {
			return $empty;
		}

		return array(
			'badge'       => (string) get_term_meta( $term->term_id, '_sgs_term_badge', true ),
			'description' => (string) get_term_meta( $term->term_id, '_sgs_term_description', true ),
		);
	}
}

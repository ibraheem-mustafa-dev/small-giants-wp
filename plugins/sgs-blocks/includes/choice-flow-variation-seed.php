<?php
/**
 * Root combo seed for `sgs/choice-flow` — Spec 43 Phase 3/4 §2.
 *
 * `sgs_choice_flow_variation_seed_attr()` walks a flow's already-parsed
 * InnerBlocks tree (from `parse_blocks()`) for a `sgs/choice-flow-question`
 * step whose `productAttribute` is a VARIATION-mode attribute on the flow's
 * product, and if one exists, seeds the full sparse variations manifest as a
 * `data-flow-combos` attribute string — so `choice-flow/variation.js`
 * (client-side resolution) never needs a second server round-trip to find
 * the matching variation once every variation-mode step has a choice.
 *
 * This file is intentionally standalone (function_exists-guarded, its own
 * `require_once` of the one helper it reuses) rather than folded into
 * `choice-flow-product-attribute-step.php` — that file is
 * scoped to one block's render path; this one is called from the ROOT
 * `sgs/choice-flow` block's render.php (main-thread wiring, not built by
 * this file).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/choice-flow-product-attribute-step.php';
require_once __DIR__ . '/class-product-manifest.php';

if ( ! function_exists( 'sgs_choice_flow_variation_seed_walk_for_product_attributes' ) ) {
	/**
	 * Collect every non-empty `productAttribute` value from a parsed block
	 * tree's `sgs/choice-flow-question` descendants, recursing through
	 * InnerBlocks (a question step can sit inside sgs/form-step, itself
	 * inside the flow root).
	 *
	 * @param array $parsed_blocks parse_blocks() output (or an InnerBlocks slice of it).
	 * @return string[] Unique taxonomy names, e.g. ['pa_size', 'pa_colour'].
	 */
	function sgs_choice_flow_variation_seed_walk_for_product_attributes( array $parsed_blocks ): array {
		$found = array();

		foreach ( $parsed_blocks as $parsed_block ) {
			if ( ! is_array( $parsed_block ) ) {
				continue;
			}

			if ( 'sgs/choice-flow-question' === ( $parsed_block['blockName'] ?? '' ) ) {
				$attribute = isset( $parsed_block['attrs']['productAttribute'] ) ? (string) $parsed_block['attrs']['productAttribute'] : '';
				if ( '' !== $attribute ) {
					$found[] = $attribute;
				}
			}

			if ( ! empty( $parsed_block['innerBlocks'] ) && is_array( $parsed_block['innerBlocks'] ) ) {
				$found = array_merge( $found, sgs_choice_flow_variation_seed_walk_for_product_attributes( $parsed_block['innerBlocks'] ) );
			}
		}

		return array_values( array_unique( $found ) );
	}
}

if ( ! function_exists( 'sgs_choice_flow_variation_seed_attr' ) ) {
	/**
	 * Build the root `data-flow-combos` attribute string for a choice flow.
	 *
	 * @param array $parsed_inner_blocks The flow's InnerBlocks, already run
	 *                                    through `parse_blocks()` by the caller.
	 * @param int   $product_id          The flow's resolved product ID (same
	 *                                    resolution `choice-flow/render.php`
	 *                                    already performs — page product first,
	 *                                    then `flowProductId`).
	 * @return string ' data-flow-combos="…"' (pre-escaped, ready to echo
	 *                straight into the wrapper tag), or '' when no
	 *                variation-mode product-option step is present, WC/the
	 *                product/its manifest can't resolve, or the encoded
	 *                payload exceeds the 24,576-byte cap.
	 */
	function sgs_choice_flow_variation_seed_attr( array $parsed_inner_blocks, int $product_id ): string {
		if ( $product_id <= 0 || ! function_exists( 'wc_get_product' ) ) {
			return '';
		}

		$candidate_taxonomies = sgs_choice_flow_variation_seed_walk_for_product_attributes( $parsed_inner_blocks );
		if ( empty( $candidate_taxonomies ) ) {
			return '';
		}

		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return '';
		}

		$has_variation_step = false;
		foreach ( $candidate_taxonomies as $taxonomy ) {
			if ( 'variation' === sgs_choice_flow_product_attribute_mode( $product, $taxonomy ) ) {
				$has_variation_step = true;
				break;
			}
		}
		if ( ! $has_variation_step ) {
			return '';
		}

		if ( ! class_exists( '\SGS\Blocks\Product_Manifest' ) ) {
			return '';
		}
		$manifest = \SGS\Blocks\Product_Manifest::build( $product_id );
		if ( ! is_array( $manifest ) || empty( $manifest['combos'] ) ) {
			return '';
		}

		$seed = array();
		foreach ( $manifest['combos'] as $combo_key => $combo ) {
			$seed[ (string) $combo_key ] = array(
				'v' => isset( $combo['variationId'] ) ? (int) $combo['variationId'] : 0,
				'p' => isset( $combo['priceMinor'] ) ? (int) $combo['priceMinor'] : 0,
				's' => ! empty( $combo['inStock'] ) ? 1 : 0,
				// D4 (Spec 43 v1.8.0) — the summary panel's own image, read
				// by `choice-flow/summary.js` once this combo's variation
				// resolves. Already resolved by Product_Manifest::build()
				// (variation image, falling back to the parent product's).
				'i' => isset( $combo['imageUrl'] ) ? (string) $combo['imageUrl'] : '',
			);
		}

		$json = wp_json_encode( $seed );
		if ( ! is_string( $json ) || strlen( $json ) > 24576 ) {
			return '';
		}

		return ' data-flow-combos="' . esc_attr( $json ) . '"';
	}
}

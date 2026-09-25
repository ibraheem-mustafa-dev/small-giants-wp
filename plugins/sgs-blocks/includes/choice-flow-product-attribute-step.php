<?php
/**
 * Product-option step helpers — Spec 43 Phase 3/4 §1 (FR-43-10/10a).
 *
 * Pure, side-effect-free lookups that turn a WooCommerce product attribute
 * into an options list for `sgs/choice-flow-question` when its
 * `productAttribute` attribute names a `pa_*` taxonomy. Two modes, decided
 * on the product's own attribute object (never guessed by the caller):
 *
 *   - `variation` mode (the attribute creates variations): options, prices
 *     and stock come from `SGS\Blocks\Product_Manifest::build()`.
 *   - `answer` mode (it doesn't): options are the taxonomy's terms, no price.
 *
 * None of these functions merge in the per-term extras (`nextStepId`,
 * `tags`, `image`, `helpText`, `isDefault`, `badge`, `description`) stored
 * in the block's own `options[]` attribute — that merge is render.php's job,
 * since it alone holds both this function's output and the stored attribute.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_resolve_flow_product_id' ) ) {
	/**
	 * Resolve the product a product-option step reads its attribute from.
	 *
	 * Mirrors `choice-flow/render.php`'s own resolution order (the page's own
	 * product wins on a single product page, falling back to the flow's
	 * configured product otherwise). The root's `flowProductId` reaches this
	 * child through block context (`sgs/choice-flow/productId`).
	 *
	 * @param \WP_Block $block Block instance (for its resolved context).
	 * @return int Product ID, or 0 when it can't be resolved.
	 */
	function sgs_choice_flow_resolve_flow_product_id( \WP_Block $block ): int {
		if ( is_singular( 'product' ) ) {
			return absint( get_queried_object_id() );
		}

		return isset( $block->context['sgs/choice-flow/productId'] )
			? absint( $block->context['sgs/choice-flow/productId'] )
			: 0;
	}
}

if ( ! function_exists( 'sgs_choice_flow_product_attribute_mode' ) ) {
	/**
	 * Decide a product attribute's mode from the product's OWN attribute
	 * object — never guessed, never read from the block's stored attributes.
	 *
	 * @param \WC_Product $product  Resolved WooCommerce product.
	 * @param string      $taxonomy A `pa_*` attribute taxonomy name.
	 * @return string 'variation', 'answer', or '' when the product doesn't
	 *                carry this attribute at all.
	 */
	function sgs_choice_flow_product_attribute_mode( $product, string $taxonomy ): string {
		if ( ! is_object( $product ) || ! method_exists( $product, 'get_attributes' ) ) {
			return '';
		}

		$attributes = $product->get_attributes();
		if ( ! isset( $attributes[ $taxonomy ] ) ) {
			return '';
		}

		$attribute = $attributes[ $taxonomy ];
		if ( ! is_object( $attribute ) || ! method_exists( $attribute, 'get_variation' ) ) {
			return '';
		}

		return $attribute->get_variation() ? 'variation' : 'answer';
	}
}

if ( ! function_exists( 'sgs_choice_flow_variation_option_price_label' ) ) {
	/**
	 * One term's price label within a variation-mode product-option step.
	 *
	 * When the product's manifest has only one variation axis, this
	 * taxonomy is the only price-determining attribute on the product, so
	 * the term's own combo price is exact. Otherwise the label is the
	 * minimum in-stock price among combos containing this term ("from £X") —
	 * the contract's "only variation attribute in the flow" is approximated
	 * here as "only variation axis on the product", since this render-time
	 * helper has no view of sibling step blocks elsewhere in the flow; a
	 * product with more than one variation axis but only one exposed as a
	 * flow step would still show "from £X" here (documented simplification,
	 * flagged in this feature's build report for Wave 2 to revisit if it
	 * matters in practice).
	 *
	 * @param array  $manifest Product_Manifest::build() return value.
	 * @param string $taxonomy This attribute's taxonomy.
	 * @param string $slug     This term's slug.
	 * @param int    $decimals Currency decimals.
	 * @return array{label: string, disabled: bool} Price label ('' when no
	 *         in-stock combo contains this term) and whether to disable it.
	 */
	function sgs_choice_flow_variation_option_price_label( array $manifest, string $taxonomy, string $slug, int $decimals ): array {
		$token        = $taxonomy . ':' . $slug;
		$combos       = isset( $manifest['combos'] ) && is_array( $manifest['combos'] ) ? $manifest['combos'] : array();
		$axis_count   = isset( $manifest['axes'] ) && is_array( $manifest['axes'] ) ? count( $manifest['axes'] ) : 0;
		$is_only_axis = 1 === $axis_count;
		$exact_key    = $token; // Single-axis combo keys are just "tax:slug".
		$min_in_stock = null;
		$any_in_stock = false;

		foreach ( $combos as $combo_key => $combo ) {
			$parts = explode( '|', (string) $combo_key );
			if ( ! in_array( $token, $parts, true ) ) {
				continue;
			}
			if ( empty( $combo['inStock'] ) ) {
				continue;
			}
			$any_in_stock = true;
			$price_minor  = isset( $combo['priceMinor'] ) ? (int) $combo['priceMinor'] : 0;
			if ( null === $min_in_stock || $price_minor < $min_in_stock ) {
				$min_in_stock = $price_minor;
			}
		}

		if ( ! $any_in_stock ) {
			return array(
				'label'    => '',
				'disabled' => true,
			);
		}

		if ( $is_only_axis && isset( $combos[ $exact_key ] ) && ! empty( $combos[ $exact_key ]['inStock'] ) ) {
			$exact_minor = (int) $combos[ $exact_key ]['priceMinor'];
			return array(
				'label'    => sgs_configurator_format_minor( $exact_minor, $decimals ),
				'disabled' => false,
			);
		}

		return array(
			'label'    => sprintf(
				/* translators: %s: formatted "from" price, e.g. "£6.00". */
				__( 'from %s', 'sgs-blocks' ),
				sgs_configurator_format_minor( (int) $min_in_stock, $decimals )
			),
			'disabled' => false,
		);
	}
}

if ( ! function_exists( 'sgs_choice_flow_variation_mode_options' ) ) {
	/**
	 * Build the options list for a variation-mode product-option step.
	 *
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $taxonomy   The attribute taxonomy this step exposes.
	 * @return array<int, array{value:string,label:string,priceLabel:string,disabled:bool}>
	 *         Empty when the manifest can't be built or this taxonomy isn't
	 *         one of its axes.
	 */
	function sgs_choice_flow_variation_mode_options( int $product_id, string $taxonomy ): array {
		if ( ! class_exists( '\SGS\Blocks\Product_Manifest' ) ) {
			return array();
		}

		$manifest = \SGS\Blocks\Product_Manifest::build( $product_id );
		if ( ! is_array( $manifest ) || empty( $manifest['axes'] ) ) {
			return array();
		}

		$decimals = isset( $manifest['decimals'] ) ? (int) $manifest['decimals'] : 2;
		$options  = array();

		foreach ( $manifest['axes'] as $axis ) {
			if ( ! isset( $axis['taxonomy'] ) || $axis['taxonomy'] !== $taxonomy ) {
				continue;
			}
			foreach ( $axis['terms'] as $term ) {
				$slug   = isset( $term['slug'] ) ? (string) $term['slug'] : '';
				$label  = isset( $term['label'] ) ? (string) $term['label'] : $slug;
				$priced = sgs_choice_flow_variation_option_price_label( $manifest, $taxonomy, $slug, $decimals );

				$options[] = array(
					'value'      => $slug,
					'label'      => $label,
					'priceLabel' => $priced['label'],
					'disabled'   => $priced['disabled'],
				);
			}
			break; // Taxonomy matched — no need to keep scanning axes.
		}

		return $options;
	}
}

if ( ! function_exists( 'sgs_choice_flow_answer_mode_options' ) ) {
	/**
	 * Build the options list for an answer-mode product-option step: the
	 * taxonomy's own terms, no price (the choice is recorded as a plain
	 * answer, not a variation selection).
	 *
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $taxonomy   The attribute taxonomy this step exposes.
	 * @return array<int, array{value:string,label:string,priceLabel:string,disabled:bool}>
	 */
	function sgs_choice_flow_answer_mode_options( int $product_id, string $taxonomy ): array {
		if ( ! function_exists( 'wc_get_product_terms' ) ) {
			return array();
		}

		$terms = wc_get_product_terms( $product_id, $taxonomy, array( 'fields' => 'all' ) );
		if ( ! is_array( $terms ) || is_wp_error( $terms ) ) {
			return array();
		}

		$options = array();
		foreach ( $terms as $term ) {
			if ( ! is_object( $term ) || ! isset( $term->slug, $term->name ) ) {
				continue;
			}
			$options[] = array(
				'value'      => (string) $term->slug,
				'label'      => (string) $term->name,
				'priceLabel' => '',
				'disabled'   => false,
			);
		}

		return $options;
	}
}

if ( ! function_exists( 'sgs_choice_flow_merge_option_extras' ) ) {
	/**
	 * Merge a product-generated option row with the per-term extras an
	 * operator has stored in the block's own `options[]` attribute (keyed by
	 * `value` = term slug) — `nextStepId`, `tags`, `image`, `helpText`,
	 * `isDefault`, `badge`, `description`. A term with no matching stored row
	 * gets sensible empty defaults (advances to the next step, no tags, no
	 * image, no help text, not default, no badge, no description).
	 *
	 * @param array $generated_option One row from the variation/answer builders.
	 * @param array $stored_options   The block's own `options[]` attribute.
	 * @return array Merged row, ready for render.php to read.
	 */
	function sgs_choice_flow_merge_option_extras( array $generated_option, array $stored_options ): array {
		$match = array();
		foreach ( $stored_options as $stored ) {
			if ( isset( $stored['value'] ) && (string) $stored['value'] === $generated_option['value'] ) {
				$match = $stored;
				break;
			}
		}

		return array_merge(
			$generated_option,
			array(
				'nextStepId'  => isset( $match['nextStepId'] ) ? (string) $match['nextStepId'] : '',
				'tags'        => isset( $match['tags'] ) && is_array( $match['tags'] ) ? array_map( 'strval', $match['tags'] ) : array(),
				'image'       => isset( $match['image'] ) && is_array( $match['image'] ) ? $match['image'] : array(),
				'helpText'    => isset( $match['helpText'] ) ? (string) $match['helpText'] : '',
				'isDefault'   => ! empty( $match['isDefault'] ),
				'badge'       => isset( $match['badge'] ) ? (string) $match['badge'] : '',
				'description' => isset( $match['description'] ) ? (string) $match['description'] : '',
			)
		);
	}
}

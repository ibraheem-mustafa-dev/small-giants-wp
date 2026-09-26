<?php
/**
 * Server-side render for sgs/choice-flow-question.
 *
 * A CONTENT-kind leaf — question text + an options list, no grid/section
 * machinery — so it renders fully block-private (`get_block_wrapper_attributes()`
 * directly, no `SGS_Container_Wrapper` call), the same pattern as
 * `sgs/notice-banner`.
 *
 * Carries no colour/typography attrs beyond `questionFontWeight` (a class,
 * never inline style) and `intro` (a plain paragraph under the title, both
 * layouts — built by `includes/choice-flow-showcase.php`'s helper, this file
 * being at this codebase's 300-line cap) — no scoped `<style>` tag needed.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32.
 *
 * Client-side navigation is NOT built here — each option carries plain
 * `data-value`/`data-next-step-id` attributes, not `data-wp-on--click`, for
 * `sgs/choice-flow`'s own view.js/store to read.
 *
 * Priced add-on step: when `priceGroup` names a group in the site-wide
 * add-on price list, each option's price (read from the list, never typed
 * in) renders next to its label, and the button carries
 * `data-price-group`/`data-price`/`data-price-label` for view.js's price
 * panel and add-to-bag payload. An option whose `value` isn't in the group
 * renders with no price (editor-flagged only).
 *
 * @var array     $attributes Block attributes (sanitised by block.json defaults).
 * @var string    $content    Inner block content (unused — this block has no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// render-helpers.php: needed for the shared sgs_render_info_toggle() call
// (includes/helpers-info-toggle.php) the help-text toggle markup uses below.
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-product-manifest.php';
require_once __DIR__ . '/helpers-addon-pricing.php';
require_once dirname( __DIR__, 3 ) . '/includes/choice-flow-product-attribute-step.php';
// D5/D7: option-image + title-weight helpers below live in the chrome file
// (this file was already at the 300-line cap) — required explicitly.
require_once dirname( __DIR__, 3 ) . '/includes/choice-flow-chrome.php';
// FR-43-24: the intro-paragraph helper (this file is at the 300-line cap).
require_once dirname( __DIR__, 3 ) . '/includes/choice-flow-showcase.php';

$question       = isset( $attributes['question'] ) ? (string) $attributes['question'] : '';
$options        = isset( $attributes['options'] ) && is_array( $attributes['options'] ) ? $attributes['options'] : array();
$options_layout = isset( $attributes['layout'] ) && 'list' === $attributes['layout'] ? 'list' : 'grid';

// FR-43-17: this question is a priced add-on step when `priceGroup` names a
// real group in the site-wide list. `$group_options` is empty (no prices
// render) when unset, the price-list API doesn't exist yet, or the named
// group is gone — the question still works as a plain multiple-choice step.
$price_group   = isset( $attributes['priceGroup'] ) ? (string) $attributes['priceGroup'] : '';
$group_options = sgs_choice_flow_addon_group_options( $price_group );
$group_label   = '' !== $price_group ? sgs_choice_flow_addon_group_label( $price_group ) : '';

// Spec 43 Phase 3/4 §1 (FR-43-10/10a): `productAttribute` names a `pa_*`
// taxonomy on the flow's own product, making this a product-option step —
// its options are GENERATED from the product's attribute terms rather than
// typed, merged with any per-term extras stored in `options[]` (keyed by
// value = term slug). `productAttribute` wins over `priceGroup` when both
// are set (the editor is responsible for clearing `priceGroup` when this is
// chosen — see ProductAttributePanel.js).
$product_attribute = isset( $attributes['productAttribute'] ) ? (string) $attributes['productAttribute'] : '';
$attribute_mode    = '';
$generated_options = array();
if ( '' !== $product_attribute && function_exists( 'wc_get_product' ) ) {
	$flow_product_id = sgs_choice_flow_resolve_flow_product_id( $block );
	$flow_product    = $flow_product_id > 0 ? wc_get_product( $flow_product_id ) : false;

	if ( $flow_product ) {
		$attribute_mode = sgs_choice_flow_product_attribute_mode( $flow_product, $product_attribute );

		if ( 'variation' === $attribute_mode ) {
			$generated_options = sgs_choice_flow_variation_mode_options( $flow_product_id, $product_attribute );
		} elseif ( 'answer' === $attribute_mode ) {
			$generated_options = sgs_choice_flow_answer_mode_options( $flow_product_id, $product_attribute );
		}
	}
}
$is_product_attribute_step = '' !== $product_attribute && '' !== $attribute_mode && ! empty( $generated_options );

$wrapper_args = array( 'class' => 'sgs-choice-flow-question' );
if ( $is_product_attribute_step ) {
	$wrapper_args['data-product-attribute'] = $product_attribute;
	$wrapper_args['data-attribute-mode']    = $attribute_mode;
}
$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

echo '<div ' . $wrapper_attributes . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped markup.

if ( '' !== $question ) {
	// D7: heading font-weight, emitted as a class (TitlePanel.js's control).
	$question_weight_class = sgs_choice_flow_question_title_weight_class( $attributes );
	echo '<h3 class="sgs-choice-flow-question__title sgs-choice-flow-question__title--w' . esc_attr( $question_weight_class ) . '">' . esc_html( $question ) . '</h3>';
}

echo sgs_choice_flow_question_intro_html( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- helper escapes internally.

// Option polish (Spec 43 §5): `isDefault` pre-selects one option per step
// (client-side, view.js reads data-default — choice-flow/defaults.js)
// without auto-advancing. Only the FIRST flagged option renders
// data-default="1" — a second flagged option is a stored data mistake.
$default_rendered = false;

if ( $is_product_attribute_step ) {
	echo '<ul class="sgs-choice-flow-question__options sgs-choice-flow-question__options--' . esc_attr( $options_layout ) . '">';
	foreach ( $generated_options as $generated_option ) {
		$merged       = sgs_choice_flow_merge_option_extras( $generated_option, $options, $product_attribute );
		$label        = (string) $merged['label'];
		$value        = (string) $merged['value'];
		$next_step_id = (string) $merged['nextStepId'];
		$tags         = $merged['tags'];
		$price_label  = (string) $merged['priceLabel'];
		$disabled     = ! empty( $merged['disabled'] );
		$badge        = (string) $merged['badge'];
		$description  = (string) $merged['description'];
		$is_default   = ! empty( $merged['isDefault'] ) && ! $default_rendered;

		// D5: own image first, else the term's swatch image (option-picker's).
		$option_image = sgs_choice_flow_resolve_option_image( $merged, $product_attribute );

		if ( '' === $label ) {
			continue;
		}

		if ( $is_default ) {
			$default_rendered = true;
		}

		echo '<li class="sgs-choice-flow-question__option">';
		echo '<button type="button" class="sgs-choice-flow-question__option-button"';
		echo ' data-value="' . esc_attr( $value ) . '"';
		echo ' data-product-attribute="' . esc_attr( $product_attribute ) . '"';
		echo ' data-term="' . esc_attr( $value ) . '"';
		echo ' data-attribute-mode="' . esc_attr( $attribute_mode ) . '"';
		echo ' data-next-step-id="' . esc_attr( $next_step_id ) . '"';
		echo ' data-tags="' . esc_attr( implode( ',', $tags ) ) . '"';
		if ( '' !== $price_label ) {
			echo ' data-price-label="' . esc_attr( $price_label ) . '"';
		}
		if ( $is_default ) {
			echo ' data-default="1"';
		}
		if ( $disabled ) {
			echo ' disabled aria-disabled="true"';
		}
		echo '>';
		if ( '' !== $badge ) {
			echo '<span class="sgs-choice-flow-question__option-badge">' . esc_html( $badge ) . '</span>';
		}
		if ( '' !== $option_image['url'] ) {
			echo '<span class="sgs-choice-flow-question__option-media">';
			echo '<img src="' . esc_url( $option_image['url'] ) . '" alt="' . esc_attr( $option_image['alt'] ) . '" loading="lazy" />';
			echo '</span>';
		}
		echo '<span class="sgs-choice-flow-question__option-label">' . esc_html( $label ) . '</span>';
		if ( '' !== $description ) {
			echo '<span class="sgs-choice-flow-question__option-description">' . esc_html( $description ) . '</span>';
		}
		if ( '' !== $price_label ) {
			echo '<span class="sgs-choice-flow-question__option-price">' . esc_html( $price_label ) . '</span>';
		}
		echo '</button>';
		echo '</li>';
	}
	echo '</ul>';
} elseif ( ! empty( $options ) ) {
	echo '<ul class="sgs-choice-flow-question__options sgs-choice-flow-question__options--' . esc_attr( $options_layout ) . '"';
	if ( '' !== $price_group ) {
		echo ' data-price-group="' . esc_attr( $price_group ) . '" data-price-group-label="' . esc_attr( $group_label ) . '"';
	}
	echo '>';
	foreach ( $options as $option ) {
		$label        = isset( $option['label'] ) ? (string) $option['label'] : '';
		$value        = isset( $option['value'] ) ? (string) $option['value'] : '';
		$next_step_id = isset( $option['nextStepId'] ) ? (string) $option['nextStepId'] : '';
		$tags         = isset( $option['tags'] ) && is_array( $option['tags'] ) ? array_map( 'strval', $option['tags'] ) : array();

		// FR-43-15: optional per-option image. Only render the media zone
		// when a real URL is present — an empty/absent `image` object keeps
		// this option rendering exactly as before (no broken layout, no
		// empty box).
		$image     = isset( $option['image'] ) && is_array( $option['image'] ) ? $option['image'] : array();
		$image_url = isset( $image['url'] ) ? (string) $image['url'] : '';
		$image_alt = isset( $image['alt'] ) ? (string) $image['alt'] : '';

		// FR-43-16: optional per-option help text. Only render the toggle +
		// panel when non-empty — an option with no helpText gets no '?'
		// button at all, not a disabled one.
		$help_text = isset( $option['helpText'] ) ? (string) $option['helpText'] : '';

		// FR-43-20: this option ends the flow adding the product with no
		// add-ons. A plain boolean data flag — the actual "end the flow"
		// behaviour is the operator's own `nextStepId` routing (usually the
		// add-to-bag terminal); this only tells view.js to clear any add-ons
		// already accumulated on this path before it gets there.
		$add_to_bag_now = ! empty( $option['addToBagNow'] );

		// FR-43-17/18: this option's price, read from the list — never from
		// the option's own stored data. Absent (no price rendered) when this
		// question isn't a priced step, or this option's value isn't one of
		// the group's option keys (editor-flagged, not a frontend error).
		$addon_price_decimal = null;
		if ( ! empty( $group_options ) ) {
			$addon_option = sgs_choice_flow_addon_option_by_key( $group_options, $value );
			if ( null !== $addon_option && isset( $addon_option['price'] ) ) {
				$addon_price_decimal = (string) $addon_option['price'];
			}
		}

		// Option polish (Spec 43 §5): only the first option flagged
		// isDefault renders data-default="1" -- see the matching comment on
		// the product-attribute branch above.
		$badge       = isset( $option['badge'] ) ? (string) $option['badge'] : '';
		$description = isset( $option['description'] ) ? (string) $option['description'] : '';
		$is_default  = ! empty( $option['isDefault'] ) && ! $default_rendered;

		if ( '' === $label ) {
			continue;
		}

		if ( $is_default ) {
			$default_rendered = true;
		}

		echo '<li class="sgs-choice-flow-question__option">';

		echo '<button type="button" class="sgs-choice-flow-question__option-button"';
		echo ' data-value="' . esc_attr( $value ) . '"';
		echo ' data-next-step-id="' . esc_attr( $next_step_id ) . '"';
		echo ' data-tags="' . esc_attr( implode( ',', $tags ) ) . '"';
		if ( $add_to_bag_now ) {
			echo ' data-add-to-bag-now="1"';
		}
		if ( null !== $addon_price_decimal ) {
			echo ' data-price-group="' . esc_attr( $price_group ) . '"';
			echo ' data-price="' . esc_attr( $addon_price_decimal ) . '"';
			echo ' data-price-label="' . esc_attr( $label ) . '"';
		}
		if ( $is_default ) {
			echo ' data-default="1"';
		}
		echo '>';

		if ( '' !== $badge ) {
			echo '<span class="sgs-choice-flow-question__option-badge">' . esc_html( $badge ) . '</span>';
		}

		if ( '' !== $image_url ) {
			echo '<span class="sgs-choice-flow-question__option-media">';
			echo '<img src="' . esc_url( $image_url ) . '" alt="' . esc_attr( $image_alt ) . '" loading="lazy" />';
			echo '</span>';
		}

		echo '<span class="sgs-choice-flow-question__option-label">' . esc_html( $label ) . '</span>';

		if ( '' !== $description ) {
			echo '<span class="sgs-choice-flow-question__option-description">' . esc_html( $description ) . '</span>';
		}

		if ( null !== $addon_price_decimal ) {
			echo '<span class="sgs-choice-flow-question__option-price">' . esc_html( sgs_choice_flow_format_addon_price( $addon_price_decimal ) ) . '</span>';
		}

		echo '</button>';

		if ( '' !== $help_text ) {
			// A SIBLING of the option button, deliberately outside it (see
			// this file's Phase 2b docblock note + style.css's own comment
			// on `position:relative` living one level up) — so a screen
			// reader or keyboard user can reach the help toggle independently
			// of the option's own click target, matching the real reference
			// flow's DOM shape rather than nesting an interactive control
			// inside another interactive control.
			// Renders via the shared `sgs_render_info_toggle()` helper
			// (`includes/helpers-info-toggle.php`) rather than bespoke
			// markup here — the SAME toggle-and-panel pattern any other
			// block can now adopt.
			echo sgs_render_info_toggle( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_render_info_toggle() escapes internally.
				$help_text,
				sprintf(
					/* translators: %s: option label */
					__( 'More information about %s', 'sgs-blocks' ),
					$label
				)
			);
		}

		echo '</li>';
	}
	echo '</ul>';
}

echo '</div>';

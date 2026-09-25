<?php
/**
 * Server-side render for sgs/choice-flow-question.
 *
 * Spec 43 (§2, FR-43-1 plain-question step type + FR-43-2 per-option
 * routing). This block is a CONTENT-kind leaf — question text + an options
 * list, no grid/section machinery — so per D294 it renders fully
 * block-private (get_block_wrapper_attributes() directly, no
 * SGS_Container_Wrapper call), the same pattern as sgs/notice-banner.
 *
 * v1 (Spec 43 Phase 2) carries no colour/typography attrs of its own, so
 * there is no scoped <style> to emit here yet — a later pass adding a
 * SgsColourPanel would follow the same uid-scoped <style> pattern already
 * used by sibling form-field-* blocks (see form-field-tiles/render.php).
 *
 * Phase 2b (2026-09-15) adds FR-43-15 (per-option image) and FR-43-16
 * (per-option help-text toggle) — both purely additive per-option markup,
 * styled entirely by this block's new static style.css (no scoped <style>
 * needed here either, since neither capability carries a colour/typography
 * attribute of its own).
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32.
 *
 * Client-side navigation (FR-43-2's nextStepMap resolution + FR-43-9's own
 * Interactivity API store) is NOT built here — this block only emits the
 * data an as-yet-unbuilt view.js/store will read. Each option carries plain
 * data-* attributes (data-value / data-next-step-id) rather than
 * data-wp-on--click, because no sgs/choice-flow Interactivity store exists
 * yet to bind an action to — inventing a data-wp-interactive contract ahead
 * of that store would be a guess, not a reuse of an existing convention.
 *
 * Priced add-on step (FR-43-17, v1.4.0): when `priceGroup` names a group in
 * the site-wide add-on price list, each option's price (read from the list,
 * never typed into the block — FR-43-18) renders next to its label, and the
 * button carries `data-price-group` / `data-price` / `data-price-label` so
 * `sgs/choice-flow`'s own view.js can build the FR-43-19 live price panel
 * and FR-43-20's add-to-bag payload without a second server round-trip. An
 * option whose `value` isn't in the group renders with no price (flagged in
 * the editor only — see edit.js).
 *
 * @var array     $attributes Block attributes (sanitised by block.json defaults).
 * @var string    $content    Inner block content (unused — this block has no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// This block previously called no shared helper of its own, so it never
// needed render-helpers.php — added when the help-toggle markup moved to
// the shared sgs_render_info_toggle() (includes/helpers-info-toggle.php).
// Without this require, that call is an undefined-function FATAL the
// moment any option carries help text (caught live, 2026-09-15).
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once __DIR__ . '/helpers-addon-pricing.php';

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

$wrapper_attributes = get_block_wrapper_attributes(
	array( 'class' => 'sgs-choice-flow-question' )
);

echo '<div ' . $wrapper_attributes . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped markup.

if ( '' !== $question ) {
	echo '<h3 class="sgs-choice-flow-question__title">' . esc_html( $question ) . '</h3>';
}

if ( ! empty( $options ) ) {
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

		if ( '' === $label ) {
			continue;
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
		echo '>';

		if ( '' !== $image_url ) {
			echo '<span class="sgs-choice-flow-question__option-media">';
			echo '<img src="' . esc_url( $image_url ) . '" alt="' . esc_attr( $image_alt ) . '" loading="lazy" />';
			echo '</span>';
		}

		echo '<span class="sgs-choice-flow-question__option-label">' . esc_html( $label ) . '</span>';

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

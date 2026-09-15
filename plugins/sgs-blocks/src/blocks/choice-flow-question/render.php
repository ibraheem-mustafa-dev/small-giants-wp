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
 * @var array     $attributes Block attributes (sanitised by block.json defaults).
 * @var string    $content    Inner block content (unused — this block has no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$question = isset( $attributes['question'] ) ? (string) $attributes['question'] : '';
$options  = isset( $attributes['options'] ) && is_array( $attributes['options'] ) ? $attributes['options'] : array();

$wrapper_attributes = get_block_wrapper_attributes(
	array( 'class' => 'sgs-choice-flow-question' )
);

echo '<div ' . $wrapper_attributes . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped markup.

if ( '' !== $question ) {
	echo '<h3 class="sgs-choice-flow-question__title">' . esc_html( $question ) . '</h3>';
}

if ( ! empty( $options ) ) {
	echo '<ul class="sgs-choice-flow-question__options">';
	foreach ( $options as $option ) {
		$label        = isset( $option['label'] ) ? (string) $option['label'] : '';
		$value        = isset( $option['value'] ) ? (string) $option['value'] : '';
		$next_step_id = isset( $option['nextStepId'] ) ? (string) $option['nextStepId'] : '';
		$tags         = isset( $option['tags'] ) && is_array( $option['tags'] ) ? array_map( 'strval', $option['tags'] ) : array();

		if ( '' === $label ) {
			continue;
		}

		echo '<li class="sgs-choice-flow-question__option">';
		echo '<button type="button" class="sgs-choice-flow-question__option-button"';
		echo ' data-value="' . esc_attr( $value ) . '"';
		echo ' data-next-step-id="' . esc_attr( $next_step_id ) . '"';
		echo ' data-tags="' . esc_attr( implode( ',', $tags ) ) . '"';
		echo '>';
		echo esc_html( $label );
		echo '</button>';
		echo '</li>';
	}
	echo '</ul>';
}

echo '</div>';

<?php
/**
 * Server-side render for sgs/choice-flow-result.
 *
 * The recommendation terminal for a `sgs/choice-flow` step wizard (Spec 43
 * §3 FR-43-3, §8 FR-43-12). This block owns only its own data shape + editor
 * UI for the simple weighted-tag match described in FR-43-12 — the actual
 * accumulation/matching logic (which result wins for a given path) lives in
 * a separately-built Interactivity API store belonging to `sgs/choice-flow`,
 * not here. This render only needs to:
 *
 * 1. Render heading + body (RichText HTML content, already sanitised on save
 *    by the block editor — wp_kses_post() applied defensively on output,
 *    matching sgs/quote's `attribution` RichText convention).
 * 2. Expose this instance's `matchTags` as a `data-match-tags` attribute so
 *    the IAPI store can read it client-side without a second data source.
 *
 * Content model: if a flow has exactly one `sgs/choice-flow-result` step and
 * it carries no tags, it is the flow's only/default result and always shows
 * (FR-43-12). If a flow has multiple result steps with tags, whichever
 * result's tags overlap most with the tags accumulated along the path taken
 * wins — decided entirely client-side by the IAPI store, not here.
 *
 * NO-INLINE (Spec 32): this block emits zero inline `style` property
 * declarations. No per-instance colour/typography attribute exists on this
 * block this phase (task-scoped: "keep minimal, no colour panel needed this
 * phase") — heading/body are styled entirely by shared framework CSS, same
 * as sgs/form-review's heading/intro.
 *
 * @var array $attributes Block attributes.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$heading    = isset( $attributes['heading'] ) ? (string) $attributes['heading'] : '';
$body       = isset( $attributes['body'] ) ? (string) $attributes['body'] : '';
$match_tags = isset( $attributes['matchTags'] ) && is_array( $attributes['matchTags'] )
	? array_values( array_filter( array_map( 'sanitize_text_field', $attributes['matchTags'] ) ) )
	: array();

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'           => 'sgs-choice-flow-result',
		'data-match-tags' => implode( ',', $match_tags ),
	)
);

echo '<div ' . $wrapper_attributes . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() pre-escapes.

if ( '' !== trim( wp_strip_all_tags( $heading ) ) ) {
	echo '<h3 class="sgs-choice-flow-result__heading">' . wp_kses_post( $heading ) . '</h3>';
}

if ( '' !== trim( wp_strip_all_tags( $body ) ) ) {
	echo '<div class="sgs-choice-flow-result__body">' . wp_kses_post( $body ) . '</div>';
}

echo '</div>';

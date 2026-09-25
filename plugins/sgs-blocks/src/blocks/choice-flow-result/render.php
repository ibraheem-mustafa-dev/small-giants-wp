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
 * FR-43-20 (v1.4.0) `action: "add-to-bag"`: this terminal instead shows a
 * summary of the priced add-ons chosen along the path taken + an "Add to
 * bag" button. The summary text and the actual POST to
 * `/sgs/v1/cart/add-item` are built entirely client-side by
 * `sgs/choice-flow`'s own pricing module (it alone knows the path taken) —
 * this file only renders the button + empty summary/status containers, plus
 * the REST nonce + endpoint URL the button needs (same "embed server-known
 * values as data-*, never guess them in JS" pattern `sgs/product-card`'s own
 * render.php uses for `restNonce`).
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

$heading       = isset( $attributes['heading'] ) ? (string) $attributes['heading'] : '';
$body          = isset( $attributes['body'] ) ? (string) $attributes['body'] : '';
$match_tags    = isset( $attributes['matchTags'] ) && is_array( $attributes['matchTags'] )
	? array_values( array_filter( array_map( 'sanitize_text_field', $attributes['matchTags'] ) ) )
	: array();
$result_action = isset( $attributes['action'] ) && 'add-to-bag' === $attributes['action'] ? 'add-to-bag' : 'recommend';

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'           => 'sgs-choice-flow-result',
		'data-match-tags' => implode( ',', $match_tags ),
		'data-action'     => $result_action,
	)
);

echo '<div ' . $wrapper_attributes . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() pre-escapes.

if ( '' !== trim( wp_strip_all_tags( $heading ) ) ) {
	echo '<h3 class="sgs-choice-flow-result__heading">' . wp_kses_post( $heading ) . '</h3>';
}

if ( '' !== trim( wp_strip_all_tags( $body ) ) ) {
	echo '<div class="sgs-choice-flow-result__body">' . wp_kses_post( $body ) . '</div>';
}

if ( 'add-to-bag' === $result_action ) {
	echo '<div class="sgs-choice-flow-result__addon-summary"></div>';
	echo '<button type="button" class="sgs-choice-flow-result__add-to-bag"';
	echo ' data-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) ) . '"';
	echo ' data-endpoint="' . esc_url( rest_url( 'sgs/v1/cart/add-item' ) ) . '"';
	echo '>' . esc_html__( 'Add to bag', 'sgs-blocks' ) . '</button>';
	echo '<div class="sgs-choice-flow-result__cart-status" role="status" aria-live="polite"></div>';
}

echo '</div>';

<?php
/**
 * Server-side render for sgs/collapsible-text.
 *
 * SEO discipline: the FULL text is ALWAYS emitted into the page HTML so
 * crawlers index every word. Collapse is visual only.
 *
 * Chosen approach (FR-30-3(e)): a <button aria-expanded aria-controls> toggle +
 * a line-clamped body container + a small view.js ES module.
 *   - No-JS state: the body is NOT clamped (full text visible) and the button
 *     carries the `hidden` attribute, so no-JS visitors get the full text and
 *     no broken control. This satisfies "no-JS full text reachable".
 *   - With JS: view.js adds `is-collapsed` to the body (applies the CSS
 *     line-clamp to --sgs-collapsible-text-collapsed-lines lines), removes
 *     `hidden` from the button, and wires the toggle (aria-expanded flip +
 *     label swap).
 *   - The body text stays in the DOM and crawlable in EVERY state — collapsed
 *     uses only overflow:hidden + line-clamp, never display:none/visibility:hidden.
 *   - When collapsible=false: plain wrapper, no button, no clamp.
 *
 * Typography: sgs_typography_css_rule() (includes/helpers-typography.php)
 * emits a scoped <style> block for font-size/weight/style/line-height.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — text is a scalar attr).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-typography.php';

$text            = $attributes['text'] ?? '';
$collapsible     = ! empty( $attributes['collapsible'] );
$collapsed_lines = isset( $attributes['collapsedLines'] ) ? max( 1, (int) $attributes['collapsedLines'] ) : 4;

// Nothing to render if the operator hasn't entered any copy yet.
if ( '' === $text ) {
	return;
}

// -------------------------------------------------------------------------
// Typography scoped style.
// wp_unique_id() gives a stable-per-request id for scoping the CSS rule to
// THIS instance when multiple collapsible-text blocks appear on one page.
// -------------------------------------------------------------------------
$uid            = wp_unique_id( 'sgs-collapsible-text-' );
$selector       = '#' . esc_attr( $uid ) . ' .sgs-collapsible-text__body';
$typography_css = sgs_typography_css_rule( $attributes, '', $selector );

// -------------------------------------------------------------------------
// Wrapper classes — BEM root + collapsible modifier.
// -------------------------------------------------------------------------
$wrapper_classes = array( 'sgs-collapsible-text' );
if ( $collapsible ) {
	$wrapper_classes[] = 'sgs-collapsible-text--collapsible';
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'    => $uid,
		'class' => implode( ' ', $wrapper_classes ),
	)
);

// Sanitise the rich-text copy. wp_kses_post() is the correct pass for
// operator-entered HTML (allows p, strong, em, a, ul, ol, li, br — keeps
// the full post subset while stripping any unsafe tags).
$safe_text = wp_kses_post( $text );

// -------------------------------------------------------------------------
// Build output.
// -------------------------------------------------------------------------
$output = '';

if ( '' !== $typography_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS string from sgs_typography_css_rule(), no user input.
	$output .= '<style>' . $typography_css . '</style>';
}

if ( $collapsible ) {
	/*
	 * Collapse mechanism (FR-30-3(e)) — button + line-clamp body + view.js.
	 *
	 * DOM shape:
	 *   <div class="sgs-collapsible-text sgs-collapsible-text--collapsible" id="{uid}" ...>
	 *     <div class="sgs-collapsible-text__body" id="{uid}-body"
	 *          style="--sgs-collapsible-text-collapsed-lines:N">
	 *       {full text — always in HTML, never hidden from crawlers}
	 *     </div>
	 *     <button type="button" class="sgs-collapsible-text__toggle"
	 *             aria-expanded="false" aria-controls="{uid}-body" hidden>
	 *       Read more
	 *     </button>
	 *   </div>
	 *
	 * No-JS default: body has NO `is-collapsed` class (full text visible) and
	 * the button is `hidden`. view.js adds `is-collapsed` + un-hides the button.
	 *
	 * The text is NEVER display:none / visibility:hidden — collapsed uses ONLY
	 * overflow:hidden + line-clamp (visual clipping; the text stays in the
	 * accessibility tree and is indexed by crawlers) in every state.
	 */
	$collapsed_lines_attr = esc_attr( (string) $collapsed_lines );
	$body_id              = esc_attr( $uid . '-body' );

	$output .= '<div ' . $wrapper_attrs . '>';

	// Text body — always present + unclamped by default (no-JS shows full text).
	$output .= '<div class="sgs-collapsible-text__body" id="' . $body_id . '" style="--sgs-collapsible-text-collapsed-lines:' . $collapsed_lines_attr . '">';
	$output .= $safe_text; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised by wp_kses_post() above.
	$output .= '</div>';

	// Toggle — `hidden` by default; view.js un-hides it. aria-controls points
	// at the body so assistive tech announces the controlled region.
	$output .= '<button type="button" class="sgs-collapsible-text__toggle" aria-expanded="false" aria-controls="' . $body_id . '" hidden>';
	$output .= esc_html__( 'Read more', 'sgs-blocks' );
	$output .= '</button>';

	$output .= '</div>';
} else {
	// Non-collapsible: plain wrapper.
	$output .= '<div ' . $wrapper_attrs . '>';
	$output .= '<div class="sgs-collapsible-text__body">';
	$output .= $safe_text; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised by wp_kses_post() above.
	$output .= '</div>';
	$output .= '</div>';
}

echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from get_block_wrapper_attributes(), wp_kses_post(), esc_attr(), and first-party CSS.

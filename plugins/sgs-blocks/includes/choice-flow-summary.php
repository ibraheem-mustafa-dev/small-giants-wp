<?php
/**
 * Summary panel shell for `sgs/choice-flow` — Spec 43 FR-43-19 + D4 (v1.8.0),
 * FR-43-24 (v1.8.0) — the same markup is the `showcase` layout's sticky
 * "stage" aside; only compact styling belongs to this file/task, not the
 * showcase treatment (a later pass owns that CSS against the same classes).
 *
 * Reserves the markup `choice-flow/summary.js` fills in at first paint and
 * on every answer change: the resolved product/variation image (or the
 * product's own featured image before any variation resolves), the product
 * name, a one-line "chosen options" summary, the running priced lines (base
 * price then each add-on), the total, and an optional help note. Every one
 * of those is DISPLAY ONLY client-side; FR-43-18's price list stays the sole
 * price authority for what is actually charged.
 *
 * Standalone (function_exists-guarded) rather than folded into
 * `choice-flow-variation-seed.php` — that file seeds combo pricing data for
 * `variation.js`'s resolution; this one only builds a markup shell for the
 * root block's own render.php, so a future change to either doesn't ripple
 * into the other.
 *
 * NO-INLINE: this helper emits zero inline `style` property declarations
 * (Spec 32) — the `<img>` carries no inline sizing, only `src`/`alt`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_summary_panel_html' ) ) {
	/**
	 * Build the summary panel's markup shell.
	 *
	 * @param array $attributes Block attributes (pricePanelTitle, summaryShowImage, summaryPosition, stageNote, stageNoteLink).
	 * @param int   $product_id The flow's resolved product ID (0 = none — no fallback image, no product name).
	 * @return string Pre-escaped HTML.
	 */
	function sgs_choice_flow_summary_panel_html( array $attributes, int $product_id ): string {
		$title           = isset( $attributes['pricePanelTitle'] ) ? (string) $attributes['pricePanelTitle'] : '';
		$show_image      = ! isset( $attributes['summaryShowImage'] ) || ! empty( $attributes['summaryShowImage'] );
		$position        = isset( $attributes['summaryPosition'] ) && 'end' === $attributes['summaryPosition'] ? 'end' : 'start';
		$stage_note      = isset( $attributes['stageNote'] ) ? (string) $attributes['stageNote'] : '';
		$stage_note_link = isset( $attributes['stageNoteLink'] ) && is_array( $attributes['stageNoteLink'] ) ? $attributes['stageNoteLink'] : array();
		$note_link_url   = isset( $stage_note_link['url'] ) ? (string) $stage_note_link['url'] : '';
		$note_link_text  = isset( $stage_note_link['text'] ) ? (string) $stage_note_link['text'] : '';

		// The variation client-side (`summary.js`'s `data-flow-combos` lookup,
		// `choice-flow-variation-seed.php`'s 'i' field) always wins once one
		// resolves; this is only the value before any variation-mode
		// product-option step has a choice, and the value when a flow has none.
		$product_name   = '';
		$fallback_image = '';
		if ( $product_id > 0 && function_exists( 'wc_get_product' ) ) {
			$product = wc_get_product( $product_id );
			if ( $product ) {
				$product_name = $product->get_name();
				$image_id     = $product->get_image_id();
				if ( $image_id ) {
					$fallback_image = (string) wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
				}
			}
		}
		// Hidden until either the fallback URL above or `summary.js`'s combo
		// lookup gives an `<img>` a `src` — never a broken-image icon.
		$img_hidden = '' === $fallback_image ? ' hidden' : '';
		$image_tag  = '<img class="sgs-choice-flow__summary-image" src="' . esc_url( $fallback_image ) . '" alt="' . esc_attr( $product_name ) . '" loading="lazy"' . $img_hidden . ' />';

		$out  = '<aside class="sgs-choice-flow__summary sgs-choice-flow__summary--position-' . esc_attr( $position ) . '" aria-live="polite" data-fallback-image="' . esc_attr( $fallback_image ) . '" data-product-name="' . esc_attr( $product_name ) . '">';
		$out .= '<details class="sgs-choice-flow__summary-toggle" open>';

		// The collapsed mobile/compact row (D4): a 72px thumbnail, the
		// product name, and the running total — `summary.js` keeps both this
		// image and the stage's own one below in sync (same class, both
		// matched by `querySelectorAll`).
		$out .= '<summary class="sgs-choice-flow__summary-summary">';
		if ( $show_image ) {
			$out .= '<span class="sgs-choice-flow__summary-summary-media">' . $image_tag . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $image_tag is built from esc_url()/esc_attr() above.
		}
		$out .= '<span class="sgs-choice-flow__summary-summary-name">' . esc_html( $product_name ) . '</span>';
		$out .= '<span class="sgs-choice-flow__summary-summary-total"></span>';
		$out .= '</summary>';

		// The full stage (FR-43-24): large square image, product name, the
		// chosen-options one-liner, the priced lines, the total, then an
		// optional help note. Same classes serve `compact` (this task's
		// styling) and `showcase` (a later pass's styling) alike.
		$out .= '<div class="sgs-choice-flow__summary-body">';
		if ( $show_image ) {
			$out .= '<div class="sgs-choice-flow__summary-media">' . $image_tag . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $image_tag is built from esc_url()/esc_attr() above.
		}
		if ( '' !== $title ) {
			$out .= '<h4 class="sgs-choice-flow__summary-title">' . esc_html( $title ) . '</h4>';
		}
		$out .= '<p class="sgs-choice-flow__summary-product">' . esc_html( $product_name ) . '</p>';
		$out .= '<p class="sgs-choice-flow__summary-meta"></p>';
		$out .= '<ul class="sgs-choice-flow__summary-lines"></ul>';
		$out .= '<div class="sgs-choice-flow__summary-total">';
		$out .= '<span class="sgs-choice-flow__summary-total-label">' . esc_html__( 'Total', 'sgs-blocks' ) . '</span>';
		$out .= '<span class="sgs-choice-flow__summary-total-value"></span>';
		$out .= '</div>';
		if ( '' !== $stage_note ) {
			$out .= '<p class="sgs-choice-flow__summary-note">' . esc_html( $stage_note );
			if ( '' !== $note_link_url && '' !== $note_link_text ) {
				$out .= ' <a class="sgs-choice-flow__summary-note-link" href="' . esc_url( $note_link_url ) . '">' . esc_html( $note_link_text ) . '</a>';
			}
			$out .= '</p>';
		}
		$out .= '</div>';
		$out .= '</details>';
		$out .= '</aside>';

		return $out;
	}
}

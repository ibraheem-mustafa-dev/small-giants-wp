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
 * FIXES item 4 (2026-09-26 Eye Care/showcase pass): the base row's label is
 * an operator control (`summaryBaseLabel`, default "Base price") rather than
 * a hardcoded string — Eye Care sets it to "Frame". Carried to `summary.js`
 * via `data-base-label` on the `<aside>`, the same seed-attribute pattern
 * `data-fallback-image`/`data-product-name` already use here.
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
		$title          = isset( $attributes['pricePanelTitle'] ) ? (string) $attributes['pricePanelTitle'] : '';
		$show_image     = ! isset( $attributes['summaryShowImage'] ) || ! empty( $attributes['summaryShowImage'] );
		$position       = isset( $attributes['summaryPosition'] ) && 'end' === $attributes['summaryPosition'] ? 'end' : 'start';
		$pending_label  = isset( $attributes['summaryPendingLabel'] ) ? sanitize_text_field( (string) $attributes['summaryPendingLabel'] ) : '';
		$pending_text   = isset( $attributes['summaryPendingText'] ) ? sanitize_text_field( (string) $attributes['summaryPendingText'] ) : '';
		$details        = function_exists( 'sgs_choice_flow_product_details' ) ? sgs_choice_flow_product_details( $product_id ) : array(
			'brand' => '',
			'axes'  => array(),
		);
		$base_label_raw = isset( $attributes['summaryBaseLabel'] ) ? trim( (string) $attributes['summaryBaseLabel'] ) : '';
		$base_label     = '' !== $base_label_raw ? sanitize_text_field( $base_label_raw ) : __( 'Base price', 'sgs-blocks' );

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

		// data-axes: the product's variation attributes (label and term names), so
		// summary.js can name the buybox's chosen colour and size; data-pending-*:
		// the "Lenses · not chosen yet" placeholder line (FR-43-19).
		$out  = '<aside class="sgs-choice-flow__summary sgs-choice-flow__summary--position-' . esc_attr( $position ) . '" aria-live="polite" data-fallback-image="' . esc_attr( $fallback_image ) . '" data-product-name="' . esc_attr( $product_name ) . '" data-base-label="' . esc_attr( $base_label ) . '"';
		$out .= ' data-axes="' . esc_attr( (string) wp_json_encode( $details['axes'] ) ) . '" data-pending-label="' . esc_attr( $pending_label ) . '" data-pending-text="' . esc_attr( $pending_text ) . '">';
		$out .= '<details class="sgs-choice-flow__summary-toggle" open>';

		// The collapsed mobile/compact row (D4): a 72px thumbnail, the
		// product name, and the running total — `summary.js` keeps both this
		// image and the stage's own one below in sync (same class, both
		// matched by `querySelectorAll`).
		$out .= '<summary class="sgs-choice-flow__summary-summary">';
		if ( $show_image ) {
			$out .= '<span class="sgs-choice-flow__summary-summary-media">' . $image_tag . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $image_tag is built from esc_url()/esc_attr() above.
		}
		// The narrow row names the product the way the stage does: brand, name, chosen options.
		$out .= '<span class="sgs-choice-flow__summary-summary-name">' . sgs_choice_flow_summary_identity_html( $details['brand'], $product_name ) . '</span>';
		// FIXES item 6: the collapsed/narrow row's total gets its own "Total"
		// label (stacked above, right-aligned, in `showcase` — style.css's own
		// narrow-row rules); `summary.js` fills only the value span.
		$out .= '<span class="sgs-choice-flow__summary-summary-total">';
		$out .= '<span class="sgs-choice-flow__summary-summary-total-label">' . esc_html__( 'Total', 'sgs-blocks' ) . '</span>';
		$out .= '<span class="sgs-choice-flow__summary-summary-total-value"></span>';
		$out .= '</span>';
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
		$out .= '<div class="sgs-choice-flow__summary-identity">' . sgs_choice_flow_summary_identity_html( $details['brand'], $product_name ) . '</div>';
		$out .= '<ul class="sgs-choice-flow__summary-lines"></ul>';
		$out .= '<div class="sgs-choice-flow__summary-total">';
		$out .= '<span class="sgs-choice-flow__summary-total-label">' . esc_html__( 'Total', 'sgs-blocks' ) . '</span>';
		$out .= '<span class="sgs-choice-flow__summary-total-value"></span>';
		$out .= '</div>';
		if ( function_exists( 'sgs_choice_flow_stage_note_html' ) ) {
			$out .= sgs_choice_flow_stage_note_html( $attributes, 'stage' );
		}
		$out .= '</div>';
		$out .= '</details>';
		$out .= '</aside>';

		return $out;
	}
}

if ( ! function_exists( 'sgs_choice_flow_summary_identity_html' ) ) {
	/**
	 * The product's identity lines, shared by the stage and the narrow row:
	 * an optional brand line, the product name, and an empty chosen-options
	 * line `summary.js` fills ("Ivory · Frame size 56").
	 *
	 * @param string $brand        The product's brand, '' for none.
	 * @param string $product_name The product's name.
	 * @return string Escaped HTML.
	 */
	function sgs_choice_flow_summary_identity_html( string $brand, string $product_name ): string {
		$out = '' !== $brand ? '<span class="sgs-choice-flow__summary-brand">' . esc_html( $brand ) . '</span>' : '';
		return $out . '<span class="sgs-choice-flow__summary-product">' . esc_html( $product_name ) . '</span>'
			. '<span class="sgs-choice-flow__summary-meta"></span>';
	}
}

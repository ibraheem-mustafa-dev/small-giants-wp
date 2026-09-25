<?php
/**
 * Sgs/buybox — "open a modal" Add to Cart mode (Spec 43 Phase 3/4, plan
 * .claude/plans/2026-09-25-choice-flow-phase3-4-contract.md §5a: Mama's
 * journey B, "Choose your flavours").
 *
 * Builds the CTA markup rendered instead of the cart-submitting `<form>` when
 * the block's `addToCartAction` attribute is 'modal'. The button opens an
 * sgs/modal through that block's OWN existing "open from anywhere" mechanism
 * (src/blocks/modal/open-anywhere.js's delegated document click listener,
 * which matches `[data-sgs-modal-open="<anchor>"]`) — no second open
 * mechanism is invented here. The button never submits the cart form and
 * fires no add-to-cart request itself; the modal's own contents (typically
 * an sgs/choice-flow) finish the purchase. The wrapping element keeps the
 * SAME `data-wp-bind--hidden="!context.inStock"` gate the cart-mode `<form>`
 * uses, so an out-of-stock selection hides the button exactly as before —
 * that gate is what keeps this "disabled" for an unpurchasable selection,
 * since a hidden control cannot be opened.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_modal_cta_html' ) ) {
	/**
	 * Build the "open a modal" CTA markup for the buybox Add to Cart button.
	 *
	 * @param string $add_to_cart_label Sanitised button label (already run through sanitize_text_field()).
	 * @param string $button_classes    Space-separated CSS classes — the SAME classes the cart-mode button uses (already run through esc_attr()-safe sanitisation upstream).
	 * @param bool   $show_price        Whether to show the live price alongside the label.
	 * @param string $price_display     The SSR price seed string (escaped here).
	 * @param string $modal_open_id     The sgs/modal HTML anchor this button opens (escaped here).
	 * @return string Fully escaped HTML — safe to echo directly.
	 */
	function sgs_buybox_modal_cta_html( string $add_to_cart_label, string $button_classes, bool $show_price, string $price_display, string $modal_open_id ): string {
		$cart_icon = '<svg class="buybox__cart-icon" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';

		if ( $show_price ) {
			// Same layout as the cart-mode button's price variant (8d in
			// render.php) — label on the left, live price on the right, bound
			// to the SAME context.priceDisplay path the price row (8a) reads,
			// so a variation swap on the page keeps this in sync for free.
			$inner = '<span class="buybox__add-to-cart-content">' . $cart_icon
				. '<span class="buybox__cart-label">' . esc_html( $add_to_cart_label ) . '</span></span>'
				. '<span class="buybox__cart-price" data-wp-text="context.priceDisplay">' . esc_html( $price_display ) . '</span>';
		} else {
			$inner = $cart_icon . '<span class="buybox__cart-label">' . esc_html( $add_to_cart_label ) . '</span>';
		}

		return sprintf(
			'<div class="buybox__cart-form buybox__cart-form--modal" data-wp-bind--hidden="!context.inStock"><button type="button" class="%1$s" aria-haspopup="dialog" data-sgs-modal-open="%2$s">%3$s</button></div>',
			esc_attr( $button_classes ),
			esc_attr( $modal_open_id ),
			$inner
		);
	}
}

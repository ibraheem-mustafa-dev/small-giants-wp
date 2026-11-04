/**
 * SGS Cart — free-delivery progress bar (Wave B, U-2).
 *
 * "You're £X away from free delivery" + a bar, and a success message once
 * reached. Split out of `panel-render.js` to keep each file under the
 * project's 250-line JS budget.
 *
 * The threshold is resolved server-side (render.php — manual override, else
 * the WooCommerce free-shipping method's `min_amount` for the store's base
 * country) and passed here via the block wrapper's `data-free-delivery-*`
 * attributes (threaded through by view.js). Both empty → the bar never
 * renders at all. Everything else — the bar's element, its live percentage,
 * and the message text — is built and updated HERE, client-side, against the
 * Store API's live cart totals, because the panel BODY markup itself lives in
 * the shared `includes/helpers-cart-panel.php` (outside this build's file
 * scope) and the totals only exist after a fetch.
 *
 * The live update (`updateFreeDeliveryProgress`) lives in `src/shared/cart-live/free-delivery-progress.js`, shared with
 * sgs/free-delivery-bar; it formats the remaining amount with the shared `formatMoney()`, the client-side equivalent of
 * `wc_price()` over the Store API's currency metadata.
 *
 * @package
 */

/**
 * Build the free-delivery element once (if a threshold is configured) and
 * insert it into the panel skeleton, before the item list.
 *
 * @param {HTMLElement} panelRoot      The `[data-sgs-cart-panel]` element.
 * @param {HTMLElement} itemsEl        The `[data-sgs-cart-items]` element (insertion anchor).
 * @param {Object}      [freeDelivery] `{ threshold, message, successMessage, placement, hideWhenEmpty }` from view.js.
 * @return {HTMLElement|null} The inserted element, or null when no threshold is configured.
 */
export function initFreeDeliveryElement( panelRoot, itemsEl, freeDelivery ) {
	const threshold = Number( freeDelivery?.threshold );
	if ( ! freeDelivery || ! Number.isFinite( threshold ) || threshold <= 0 ) {
		return null;
	}

	const el = document.createElement( 'div' );
	el.className = 'sgs-cart__free-delivery';
	el.setAttribute( 'data-sgs-cart-free-delivery', '' );
	el.hidden = true;
	el.innerHTML =
		'<p class="sgs-cart__free-delivery-text" data-sgs-cart-free-delivery-text></p>' +
		'<div class="sgs-cart__free-delivery-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Progress toward free delivery" data-sgs-cart-free-delivery-track>' +
		'<div class="sgs-cart__free-delivery-fill" data-sgs-cart-free-delivery-fill></div>' +
		'</div>';

	// 'footer' sits under the subtotal (and so hides with the footer while the
	// cart is empty); the default sits above the item list.
	const subtotalEl = panelRoot.querySelector( '.sgs-cart__panel-subtotal' );
	if ( 'footer' === freeDelivery.placement && subtotalEl ) {
		el.classList.add( 'sgs-cart__free-delivery--footer' );
		subtotalEl.insertAdjacentElement( 'afterend', el );
	} else {
		itemsEl.insertAdjacentElement( 'beforebegin', el );
	}
	return el;
}

export { updateFreeDeliveryProgress } from '../../shared/cart-live/free-delivery-progress';

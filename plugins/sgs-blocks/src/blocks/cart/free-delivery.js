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
 * The remaining-amount text is formatted via `formatMoney()` (store-api.js) —
 * the same currency-aware formatter this panel already uses for the
 * subtotal — because `wc_price()` is PHP-only and cannot re-run on every
 * live cart change; this is its client-side equivalent (both read the same
 * Store API currency metadata).
 *
 * @package
 */

import { formatMoney } from './store-api';

/**
 * Build the free-delivery element once (if a threshold is configured) and
 * insert it into the panel skeleton, before the item list.
 *
 * @param {HTMLElement} panelRoot     The `[data-sgs-cart-panel]` element.
 * @param {HTMLElement} itemsEl       The `[data-sgs-cart-items]` element (insertion anchor).
 * @param {Object}      [freeDelivery] `{ threshold, message, successMessage }` from view.js.
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

	itemsEl.insertAdjacentElement( 'beforebegin', el );
	return el;
}

/**
 * Recompute and render the free-delivery progress bar against a freshly
 * fetched cart. A no-op when the element wasn't created (no threshold).
 *
 * @param {HTMLElement|null} el            The element from `initFreeDeliveryElement()`.
 * @param {Object}           [cart]        The Store API cart response.
 * @param {Object}           [freeDelivery] `{ threshold, message, successMessage }`.
 */
export function updateFreeDeliveryProgress( el, cart, freeDelivery ) {
	if ( ! el ) {
		return;
	}

	const threshold = Number( freeDelivery?.threshold );
	if ( ! Number.isFinite( threshold ) || threshold <= 0 ) {
		el.hidden = true;
		return;
	}

	const totals = cart?.totals || {};
	const minorUnit = Number( totals.currency_minor_unit ?? 2 );
	const subtotalMinor =
		Number( totals.total_items ?? 0 ) + Number( totals.total_items_tax ?? 0 );
	const subtotal = subtotalMinor / 10 ** minorUnit;
	const remaining = Math.max( 0, threshold - subtotal );
	const pct = Math.max( 0, Math.min( 100, ( subtotal / threshold ) * 100 ) );

	el.hidden = false;
	el.style.setProperty( '--sgs-cart-free-delivery-pct', `${ pct }%` );
	el.classList.toggle( 'sgs-cart__free-delivery--complete', remaining <= 0 );

	const track = el.querySelector( '[data-sgs-cart-free-delivery-track]' );
	if ( track ) {
		track.setAttribute( 'aria-valuenow', String( Math.round( pct ) ) );
	}

	const textEl = el.querySelector( '[data-sgs-cart-free-delivery-text]' );
	if ( ! textEl ) {
		return;
	}

	if ( remaining <= 0 ) {
		textEl.textContent =
			freeDelivery.successMessage || "You've unlocked free delivery!";
		return;
	}

	const remainingMinor = Math.round( remaining * 10 ** minorUnit );
	const formattedRemaining = formatMoney( remainingMinor, totals );
	const template =
		freeDelivery.message || "You're %s away from free delivery";
	textEl.textContent = template.includes( '%s' )
		? template.replace( '%s', formattedRemaining )
		: `${ template } ${ formattedRemaining }`;
}

/**
 * SGS Cart — mini-cart panel rendering + mutation wiring (FR-36-19 Phase 2).
 *
 * Populates the server-rendered panel skeleton (loading state only — the
 * item list is exactly as cache-sensitive as the badge count, see
 * render.php) with live Store API data: thumbnail/name/qty/line-price per
 * item, inline qty-edit + remove with NO redirect, subtotal + a shipping/tax
 * transparency note, and a distinct actionable empty-cart state.
 *
 * @package
 */

import {
	fetchCart,
	updateCartItem,
	removeCartItem,
	formatMoney,
} from './store-api';
import { escapeHtml, itemRowHtml } from './item-row-template';

/**
 * Wire one panel instance against the Store API.
 *
 * @param {HTMLElement} panelRoot            The `[data-sgs-cart-panel]` element.
 * @param {Object}      [opts]               Options.
 * @param {Function}    [opts.onCartUpdated] Callback fired with the fresh
 *                                           cart object after every
 *                                           successful load/mutation — used
 *                                           by view.js to keep every badge
 *                                           on the page in sync.
 * @return {Object} A `{ refresh }` controller.
 */
export function initPanel( panelRoot, { onCartUpdated } = {} ) {
	const itemsEl = panelRoot.querySelector( '[data-sgs-cart-items]' );

	if ( ! itemsEl ) {
		return { refresh: () => {} };
	}

	const footerEl = panelRoot.querySelector( '[data-sgs-cart-footer]' );
	const subtotalEl = panelRoot.querySelector( '[data-sgs-cart-subtotal]' );
	const statusEl = panelRoot.querySelector( '[data-sgs-cart-status]' );

	const emptyMessage = itemsEl.dataset.emptyMessage || 'Your cart is empty';
	const emptyCtaLabel = itemsEl.dataset.emptyCtaLabel || 'Continue shopping';
	const shopUrl = itemsEl.dataset.shopUrl || '/';

	/**
	 * Announce a mutation result via the panel's OWN status live region —
	 * deliberately separate from the trigger badge's `role="status"` node
	 * (FR-36-19 "no double-announce": each live region has exactly one
	 * canonical purpose, so there is never a duplicate to suppress).
	 *
	 * @param {string} message The message to announce.
	 */
	function announce( message ) {
		if ( statusEl ) {
			statusEl.textContent = message;
		}
	}

	/**
	 * Render the empty-cart state — distinct + actionable, not a blank panel.
	 */
	function renderEmpty() {
		itemsEl.removeAttribute( 'aria-busy' );
		itemsEl.innerHTML =
			'<div class="sgs-cart__panel-empty">' +
			`<p class="sgs-cart__panel-empty-message">${ escapeHtml(
				emptyMessage
			) }</p>` +
			`<a class="sgs-cart__panel-empty-cta" href="${ escapeHtml(
				shopUrl
			) }">${ escapeHtml( emptyCtaLabel ) }</a>` +
			'</div>';
		if ( footerEl ) {
			footerEl.hidden = true;
		}
	}

	/**
	 * Render an error state (network/API failure) — never a silent blank panel.
	 */
	function renderError() {
		itemsEl.removeAttribute( 'aria-busy' );
		itemsEl.innerHTML =
			'<p class="sgs-cart__panel-error">' +
			escapeHtml(
				'Your cart could not be loaded. Please try again or visit the cart page.'
			) +
			'</p>';
		if ( footerEl ) {
			footerEl.hidden = true;
		}
	}

	/**
	 * Render a populated cart: item rows + subtotal + footer CTAs.
	 *
	 * @param {Object} cart The Store API cart response.
	 */
	function renderItems( cart ) {
		itemsEl.removeAttribute( 'aria-busy' );
		itemsEl.innerHTML = cart.items
			.map( ( item ) => itemRowHtml( item, cart.totals ) )
			.join( '' );

		if ( subtotalEl ) {
			subtotalEl.textContent = formatMoney(
				cart.totals?.total_items ?? 0,
				cart.totals
			);
		}
		if ( footerEl ) {
			footerEl.hidden = false;
		}
	}

	/**
	 * Render the fetched cart (empty vs populated) and notify the caller.
	 *
	 * @param {Object} cart The Store API cart response.
	 */
	function render( cart ) {
		if (
			! cart ||
			! Array.isArray( cart.items ) ||
			0 === cart.items.length
		) {
			renderEmpty();
		} else {
			renderItems( cart );
		}
		if ( 'function' === typeof onCartUpdated ) {
			onCartUpdated( cart );
		}
	}

	/**
	 * Fetch the live cart and render it.
	 */
	async function refresh() {
		itemsEl.setAttribute( 'aria-busy', 'true' );
		try {
			const cart = await fetchCart();
			render( cart );
		} catch {
			renderError();
		}
	}

	/**
	 * Set every quantity input + remove button to disabled while a mutation
	 * is in flight, so a double-click cannot race two requests.
	 *
	 * @param {boolean} busy Whether the panel is mid-mutation.
	 */
	function setBusy( busy ) {
		itemsEl.querySelectorAll( 'input, button' ).forEach( ( el ) => {
			el.disabled = busy;
		} );
	}

	// Inline qty-edit — fires on `change` (blur/Enter), no redirect.
	itemsEl.addEventListener( 'change', async ( event ) => {
		const input = event.target.closest( 'input.sgs-cart__item-qty-input' );
		if ( ! input ) {
			return;
		}
		const key = input.dataset.key;
		const quantity = Math.max( 0, Number.parseInt( input.value, 10 ) || 0 );

		setBusy( true );
		try {
			const cart =
				quantity === 0
					? await removeCartItem( key )
					: await updateCartItem( key, quantity );
			render( cart );
			announce(
				quantity === 0
					? 'Item removed from your cart.'
					: `Quantity updated to ${ quantity }.`
			);
		} catch {
			announce( 'Could not update your cart. Please try again.' );
			setBusy( false );
		}
	} );

	// Remove — no redirect.
	itemsEl.addEventListener( 'click', async ( event ) => {
		const button = event.target.closest( 'button.sgs-cart__item-remove' );
		if ( ! button ) {
			return;
		}
		const key = button.dataset.key;

		setBusy( true );
		try {
			const cart = await removeCartItem( key );
			render( cart );
			announce( 'Item removed from your cart.' );
		} catch {
			announce( 'Could not remove that item. Please try again.' );
			setBusy( false );
		}
	} );

	return { refresh };
}

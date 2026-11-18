/**
 * SGS Cart — mini-cart panel rendering + mutation wiring (FR-36-19).
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
	addCartItem,
	addViaProxy,
	updateCartItem,
	removeCartItem,
	formatMoney,
} from './store-api';
import { escapeHtml, itemRowHtml } from './item-row-template';
import {
	initFreeDeliveryElement,
	updateFreeDeliveryProgress,
} from './free-delivery';
import { addWishlistId } from '../../shared/wishlist-store';
import { appendAuthoredText } from '../../utils/authored-text-dom';
import { updatePanelExtras } from './panel-extras';
import { publishCart } from '../../shared/cart-live';
import { initGift } from './panel-gift';

/**
 * Wire one panel instance against the Store API.
 *
 * @param {HTMLElement} panelRoot                  The `[data-sgs-cart-panel]` element.
 * @param {Object}      [opts]                     Options.
 * @param {Object}      [opts.freeDelivery]        Wave B, U-2 free-delivery progress data
 *                                                 (from the block wrapper's
 *                                                 `data-free-delivery-*` attributes).
 * @param {string}      [opts.freeDelivery.threshold] The resolved threshold, as a
 *                                                    numeric string, or '' to hide the bar.
 * @param {string}      [opts.freeDelivery.message] The "you're %s away" message template.
 * @param {string}      [opts.freeDelivery.successMessage] The message shown once unlocked.
 * @return {Object} A `{ refresh }` controller.
 */
export function initPanel( panelRoot, { freeDelivery } = {} ) {
	const itemsEl = panelRoot.querySelector( '[data-sgs-cart-items]' );

	if ( ! itemsEl ) {
		return { refresh: () => {} };
	}

	const footerEl = panelRoot.querySelector( '[data-sgs-cart-footer]' );
	const subtotalEl = panelRoot.querySelector( '[data-sgs-cart-subtotal]' );
	const statusEl = panelRoot.querySelector( '[data-sgs-cart-status]' );
	const freeDeliveryEl = initFreeDeliveryElement( panelRoot, itemsEl, freeDelivery );
	// The gift box (opt-in): shown while the basket has an item, filled from the session value the cart read returns.
	const gift = initGift( panelRoot );
	// Counts every drawing of the cart, so a cart read can tell that a newer one was drawn while it was in flight.
	let drawn = 0;
	// The centred empty state (opt-in): server-built markup kept in a template and copied in whenever the basket is empty.
	const emptyTemplate = panelRoot.querySelector( '[data-sgs-cart-empty-template]' );

	const emptyMessage = itemsEl.dataset.emptyMessage || 'Your cart is empty';
	const emptyCtaLabel = itemsEl.dataset.emptyCtaLabel || 'Continue shopping';
	const shopUrl = itemsEl.dataset.shopUrl || '/';
	const itemOpts = {
		removeStyle: itemsEl.dataset.removeStyle || 'icon',
		removeLabel: itemsEl.dataset.removeLabel || '',
		showQty: '0' !== itemsEl.dataset.showQty,
		qtyStyle: 'stepper' === itemsEl.dataset.qtyStyle ? 'stepper' : 'input',
		removePlace: 'end' === itemsEl.dataset.removePlace ? 'end' : 'under',
		showSave: '0' !== itemsEl.dataset.showSave,
		// Opt-in, so an absent attribute means off — unlike the three above,
		// whose absence means on.
		showAddOptions: '1' === itemsEl.dataset.showAddOptions,
		addOptionsLabel: itemsEl.dataset.addOptionsLabel || '',
	};

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
		if ( emptyTemplate ) {
			itemsEl.replaceChildren( emptyTemplate.content.cloneNode( true ) );
			if ( footerEl ) {
				footerEl.hidden = true;
			}
			return;
		}
		// The typed wording is markup: inserted as DOM nodes through the one sanitised path, never as an HTML string.
		const wrap = document.createElement( 'div' );
		wrap.className = 'sgs-cart__panel-empty';
		const message = document.createElement( 'p' );
		message.className = 'sgs-cart__panel-empty-message';
		appendAuthoredText( message, emptyMessage );
		const cta = document.createElement( 'a' );
		cta.className = 'sgs-cart__panel-empty-cta';
		cta.setAttribute( 'href', shopUrl );
		appendAuthoredText( cta, emptyCtaLabel, { links: false } );
		wrap.append( message, cta );
		itemsEl.replaceChildren( wrap );
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
		if ( freeDeliveryEl ) {
			freeDeliveryEl.hidden = true;
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
			.map( ( item ) => itemRowHtml( item, cart.totals, itemOpts ) )
			.join( '' );
		itemsEl.querySelectorAll( '[data-sgs-rich-remove]' ).forEach( ( slot ) => {
			appendAuthoredText( slot, itemOpts.removeLabel || 'Remove', { links: false } );
		} );

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
	 * Render the fetched cart (empty vs populated) and publish it to the page's live cart readers.
	 *
	 * @param {Object} cart The Store API cart response.
	 */
	function render( cart ) {
		drawn += 1;
		if (
			! cart ||
			! Array.isArray( cart.items ) ||
			0 === cart.items.length
		) {
			renderEmpty();
		} else {
			renderItems( cart );
		}
		updateFreeDeliveryProgress( freeDeliveryEl, cart, freeDelivery );
		updatePanelExtras( panelRoot, cart );
		gift.sync( cart );
		publishCart( cart );
	}

	/**
	 * Fetch the live cart and render it. A reply that arrives after the panel has drawn a newer cart (the shopper changed a
	 * quantity while the read was in flight) is dropped, so an older reading never replaces a newer one.
	 */
	async function refresh() {
		itemsEl.setAttribute( 'aria-busy', 'true' );
		const at = drawn;
		try {
			const cart = await fetchCart( gift.headers );
			if ( at === drawn ) {
				render( cart );
			}
		} catch {
			if ( at === drawn ) {
				renderError();
			}
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
			// A stepper button already off at the line's limit stays off when the panel goes idle again.
			el.disabled = busy || el.hasAttribute( 'data-at-limit' );
		} );
	}

	/**
	 * Name the control that has focus, so it can be found again after the rows are redrawn.
	 *
	 * @return {{key: string, role: string}|null} The cart line and which of its stepper controls, or null.
	 */
	function focusedQtyControl() {
		const el = document.activeElement;
		if ( ! el || ! itemsEl.contains( el ) ) {
			return null;
		}
		const role = el.matches( '.sgs-cart__item-qty-step--minus' )
			? 'minus'
			: el.matches( '.sgs-cart__item-qty-step--plus' )
			? 'plus'
			: el.matches( '.sgs-cart__item-qty-input' )
			? 'input'
			: '';
		return role && el.dataset.key ? { key: el.dataset.key, role } : null;
	}

	/**
	 * Put focus back on a stepper control after a redraw; a button that has just reached its limit hands focus to the number.
	 *
	 * @param {{key: string, role: string}|null} was What had focus before the redraw.
	 */
	function restoreQtyFocus( was ) {
		if ( ! was ) {
			return;
		}
		const row = [ ...itemsEl.querySelectorAll( '.sgs-cart__item' ) ].find( ( el ) => el.dataset.key === was.key );
		const target = row?.querySelector( `.sgs-cart__item-qty-${ 'input' === was.role ? 'input' : `step--${ was.role }` }` );
		const usable = target && ! target.disabled ? target : row?.querySelector( '.sgs-cart__item-qty-input' );
		usable?.focus();
	}

	/**
	 * Set one line's quantity (0 removes it), redraw, announce, and keep keyboard focus on the stepper control in use.
	 *
	 * @param {string} key      The cart item key.
	 * @param {number} quantity The new quantity.
	 */
	async function setQuantity( key, quantity ) {
		const was = focusedQtyControl();
		const hadFocus = itemsEl.contains( document.activeElement );
		const index = lineIndex( key );
		setBusy( true );
		try {
			const cart =
				quantity === 0
					? await removeCartItem( key )
					: await updateCartItem( key, quantity );
			render( cart );
			restoreQtyFocus( was );
			keepFocusInPanel( cart, hadFocus, index );
			announce(
				quantity === 0
					? 'Item removed from your cart.'
					: `Quantity updated to ${ quantity }.`
			);
		} catch {
			announce( 'Could not update your cart. Please try again.' );
			setBusy( false );
			restoreQtyFocus( was );
		}
	}

	// Inline qty-edit — fires on `change` (blur/Enter), no redirect.
	itemsEl.addEventListener( 'change', ( event ) => {
		const input = event.target.closest( 'input.sgs-cart__item-qty-input' );
		if ( ! input ) {
			return;
		}
		setQuantity( input.dataset.key, Math.max( 0, Number.parseInt( input.value, 10 ) || 0 ) );
	} );

	// The stepper's minus and plus buttons: one step from the number shown, through the same update path.
	itemsEl.addEventListener( 'click', ( event ) => {
		const button = event.target.closest( 'button.sgs-cart__item-qty-step' );
		if ( ! button || button.disabled ) {
			return;
		}
		const input = button.closest( '.sgs-cart__item-stepper' )?.querySelector( 'input.sgs-cart__item-qty-input' );
		const next = ( Number.parseInt( input?.value, 10 ) || 0 ) + ( Number.parseInt( button.dataset.step, 10 ) || 0 );
		setQuantity( button.dataset.key, Math.max( 0, next ) );
	} );

	/**
	 * Put keyboard focus where the shopper's next step is after the empty state's button has added its product: the first
	 * control of the new line that can take focus, else the panel itself (the open dialog), so focus never falls to the page.
	 * A disabled control ignores `focus()`, and a one-item line's minus button is disabled at the minimum quantity, so the
	 * first button of the line is skipped when it is off.
	 */
	function focusFirstLine() {
		const target = itemsEl.querySelector( '.sgs-cart__item :is(a[href], button, input, select, textarea):not(:disabled)' );
		target?.focus();
		if ( target && itemsEl.contains( document.activeElement ) ) {
			return;
		}
		panelRoot.setAttribute( 'tabindex', '-1' );
		panelRoot.focus();
	}

	/**
	 * Where a cart line sits in the list, read before a mutation removes it.
	 *
	 * @param {string} key The cart item key.
	 * @return {number} The line's position, or -1.
	 */
	function lineIndex( key ) {
		return [ ...itemsEl.querySelectorAll( '.sgs-cart__item' ) ].findIndex( ( el ) => el.dataset.key === key );
	}

	/**
	 * Keep keyboard focus inside the open drawer after a line is removed. The removed row held focus, so without this it
	 * falls to the page. With lines left, focus goes to the first usable control of the line now in the removed line's place
	 * (the last line when the removed one was last). With none left, it goes to the empty state's main button or link, else
	 * the drawer's close button. The panel itself takes focus when nothing else can.
	 *
	 * @param {Object}  cart     The Store API cart the panel has just drawn.
	 * @param {boolean} hadFocus Whether focus was inside the item list before the mutation.
	 * @param {number}  index    Where the removed line sat (see lineIndex()).
	 */
	function keepFocusInPanel( cart, hadFocus, index ) {
		if ( ! hadFocus || panelRoot.contains( document.activeElement ) ) {
			return;
		}
		const rows = [ ...itemsEl.querySelectorAll( '.sgs-cart__item' ) ];
		const row = rows[ Math.min( Math.max( index, 0 ), rows.length - 1 ) ];
		const target = row
			? row.querySelector( ':is(a[href], button, input, select, textarea):not(:disabled)' )
			: itemsEl.querySelector( '.sgs-cart__panel-empty :is(button, a[href]):not(:disabled)' ) ||
			  panelRoot.querySelector( '.sgs-cart__panel-close:not(:disabled)' );
		target?.focus();
		if ( target && panelRoot.contains( document.activeElement ) ) {
			return;
		}
		panelRoot.setAttribute( 'tabindex', '-1' );
		panelRoot.focus();
	}

	// The empty state's button: add its one product through the Store API, redraw the panel with the new line, keep focus in the list.
	itemsEl.addEventListener( 'click', async ( event ) => {
		const button = event.target.closest( 'button[data-sgs-cart-empty-add]' );
		if ( ! button || button.disabled ) {
			return;
		}
		const id = Number.parseInt( button.dataset.sgsCartEmptyAdd, 10 );
		if ( ! ( id > 0 ) ) {
			return;
		}
		button.disabled = true;
		try {
			let cart;
			if ( button.dataset.addBody ) {
				// A variation or picks: the buy box's own add route, then read the cart it changed.
				await addViaProxy( button.dataset.restUrl, button.dataset.nonce, JSON.parse( button.dataset.addBody ) );
				cart = await fetchCart( gift.headers );
			} else {
				cart = await addCartItem( id, 1, gift.headers );
			}
			render( cart );
			focusFirstLine();
			announce( 'Added to your basket.' );
		} catch ( error ) {
			announce( error?.message || 'Could not add that to your basket. Please try again.' );
			button.disabled = false;
			button.focus();
		}
	} );

	// Remove — no redirect.
	itemsEl.addEventListener( 'click', async ( event ) => {
		const button = event.target.closest( 'button.sgs-cart__item-remove' );
		if ( ! button ) {
			return;
		}
		const key = button.dataset.key;
		const hadFocus = itemsEl.contains( document.activeElement );
		const index = lineIndex( key );

		setBusy( true );
		try {
			const cart = await removeCartItem( key );
			render( cart );
			keepFocusInPanel( cart, hadFocus, index );
			announce( 'Item removed from your cart.' );
		} catch {
			announce( 'Could not remove that item. Please try again.' );
			setBusy( false );
			if ( hadFocus ) {
				button.focus();
			}
		}
	} );

	// Save for later (Wave 3C U-12 §E): add to the wishlist, then remove the
	// line the same way the Remove button does — ADD, never toggle (a toggle
	// would wrongly remove an item the shopper already had saved).
	itemsEl.addEventListener( 'click', async ( event ) => {
		const button = event.target.closest(
			'button.sgs-cart__item-save-for-later'
		);
		if ( ! button ) {
			return;
		}
		const key = button.dataset.key;
		const productId = Number( button.dataset.productId );
		const hadFocus = itemsEl.contains( document.activeElement );
		const index = lineIndex( key );

		setBusy( true );
		try {
			await addWishlistId( productId );
			const cart = await removeCartItem( key );
			render( cart );
			keepFocusInPanel( cart, hadFocus, index );
			announce( 'Saved for later.' );
		} catch {
			announce( 'Could not save that item for later. Please try again.' );
			setBusy( false );
			if ( hadFocus ) {
				button.focus();
			}
		}
	} );

	return { refresh };
}

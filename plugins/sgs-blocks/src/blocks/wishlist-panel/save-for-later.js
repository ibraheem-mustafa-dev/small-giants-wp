/**
 * SGS Wishlist Panel — "Save for later" enhancer for WooCommerce's OWN
 * cart-page rows (KJC-1, option A; Wave 3C U-12 §E).
 *
 * Watches `tr.wc-block-cart-items__row` (verified live on sandybrown,
 * WooCommerce 11.1.0) with a MutationObserver — the Cart block renders these
 * client-side and re-renders them on every mutation, so a one-shot query
 * would miss rows added after the initial paint. For each row it matches
 * the row's product-name link to the Store API cart item with the SAME
 * permalink (`match-row.js`, exact-match only — no button on a miss) and
 * inserts a "Save for later" button after the row's own remove link.
 * Clicking it: adds the product to the wishlist, removes the cart line via
 * the Store API, then tells the Cart block to refresh.
 *
 * @package
 */
import { addWishlistId } from '../../shared/wishlist-store';
import { fetchCart, removeCartItemByKey } from './api';
import { findCartItemForRow, wishlistProductIdForCartItem } from './match-row';

const ROW_SELECTOR = 'tr.wc-block-cart-items__row';
const NAME_LINK_SELECTOR = 'a.wc-block-components-product-name[href]';
const REMOVE_LINK_SELECTOR = '.wc-block-cart-item__remove-link';
const BUTTON_CLASS = 'sgs-save-for-later';

/**
 * Tell the Cart block's own data store to re-fetch, so it reflects the
 * removed line without a full page reload. Falls back to reloading the
 * block's own rendered markup via a fresh Store API cart fetch + row removal
 * when `wp.data` (the `wc/store/cart` store) is unavailable.
 */
function invalidateCartStore() {
	const dataStore = window?.wp?.data;
	if ( dataStore && 'function' === typeof dataStore.dispatch ) {
		try {
			dataStore.dispatch( 'wc/store/cart' )?.invalidateResolutionForStore?.();
			return;
		} catch {
			// Fall through to the reload below.
		}
	}
	window.location.reload();
}

/**
 * Wire one row's Save-for-later button.
 *
 * @param {HTMLElement} row       The `tr.wc-block-cart-items__row` element.
 * @param {HTMLElement} removeEl  The row's remove-link element.
 * @param {number}      productId The wishlist product id to save.
 * @param {string}      cartKey   The Store API cart item key to remove.
 */
function insertButton( row, removeEl, productId, cartKey ) {
	if ( row.querySelector( '.' + BUTTON_CLASS ) ) {
		return;
	}
	const button = document.createElement( 'button' );
	button.type = 'button';
	button.className = BUTTON_CLASS;
	button.textContent = 'Save for later';
	removeEl.insertAdjacentElement( 'afterend', button );

	button.addEventListener( 'click', async () => {
		button.disabled = true;
		try {
			await addWishlistId( productId );
			await removeCartItemByKey( cartKey );
			invalidateCartStore();
		} catch {
			button.disabled = false;
		}
	} );
}

/**
 * Scan every current cart row and add a Save-for-later button where a row's
 * product link exactly matches a Store API cart item's permalink.
 */
async function enhanceRows() {
	const rows = document.querySelectorAll( ROW_SELECTOR );
	if ( 0 === rows.length ) {
		return;
	}
	let cart;
	try {
		cart = await fetchCart();
	} catch {
		return;
	}
	const items = Array.isArray( cart?.items ) ? cart.items : [];

	rows.forEach( ( row ) => {
		const nameLink = row.querySelector( NAME_LINK_SELECTOR );
		const removeEl = row.querySelector( REMOVE_LINK_SELECTOR );
		if ( ! nameLink || ! removeEl ) {
			return;
		}
		const item = findCartItemForRow( nameLink.getAttribute( 'href' ), items );
		if ( ! item ) {
			return; // No exact permalink match — no button (never a best guess).
		}
		const productId = wishlistProductIdForCartItem( item );
		if ( productId <= 0 ) {
			return;
		}
		insertButton( row, removeEl, productId, item.key );
	} );
}

/**
 * Start watching the cart page for rows to enhance. No-op if the Cart
 * block's row container never appears (e.g. an empty cart, or a page
 * without the Cart block at all).
 */
export function initSaveForLater() {
	enhanceRows();
	const observer = new MutationObserver( () => {
		enhanceRows();
	} );
	observer.observe( document.body, { childList: true, subtree: true } );
}

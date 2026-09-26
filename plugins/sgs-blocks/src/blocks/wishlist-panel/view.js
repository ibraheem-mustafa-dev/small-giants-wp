/**
 * SGS Wishlist Panel — frontend hydration.
 *
 * render.php emits only a heading + a hidden, aria-busy loading skeleton
 * (the saved-item list cannot be server-rendered — see that file's own
 * docblock). This module:
 *   1. reads the visitor's saved product ids from the shared wishlist store;
 *   2. fetches their current data from the WooCommerce Store API;
 *   3. renders each row (Move to basket / Notify me / Remove);
 *   4. keeps the panel in sync with wishlist changes made elsewhere (a
 *      product-card heart, another tab);
 *   5. starts the "Save for later" enhancer on WooCommerce's own cart rows.
 *
 * @package
 */
import { ensureWishlistReady, onWishlistChange, toggleWishlistId } from '../../shared/wishlist-store';
import { fetchWishlistProducts, addCartItem } from './api';
import { wishlistRowHtml, escapeHtml } from './render-rows';
import { mountNotifyForm } from './notify-form';
import { initSaveForLater } from './save-for-later';

/**
 * Wire one panel instance.
 *
 * @param {HTMLElement} panel The `[data-sgs-wishlist-panel]` root.
 */
function initPanel( panel ) {
	const itemsEl = panel.querySelector( '[data-sgs-wishlist-items]' );
	const statusEl = panel.querySelector( '[data-sgs-wishlist-status]' );
	if ( ! itemsEl ) {
		return;
	}

	const showWhenEmpty = '1' === panel.dataset.showWhenEmpty;
	const showPrice = '1' === panel.dataset.showPrice;
	const showStock = '1' === panel.dataset.showStock;
	const emptyText = panel.dataset.emptyText || 'Your wishlist is empty.';
	const emptyLinkLabel = panel.dataset.emptyLinkLabel || 'Continue shopping';
	const shopUrl = panel.dataset.shopUrl || '/';

	/**
	 * @param {string} message Announcement text for the panel's live region.
	 */
	function announce( message ) {
		if ( statusEl ) {
			statusEl.textContent = message;
		}
	}

	/**
	 * Render the current wishlist (empty state, or the fetched rows).
	 *
	 * `ensureWishlistReady()` caches its FIRST resolution — a later call
	 * returns that same stale id list even after the shared store's `ids`
	 * have since changed (hearting a product elsewhere, or Remove in this
	 * panel), which is why the panel used to need a reload to catch up.
	 * `onWishlistChange` already hands this function the fresh id array on
	 * every change (same-tab CustomEvent, or a re-resolved cross-tab fetch);
	 * accept it here and only fall back to `ensureWishlistReady()` for the
	 * very first, un-subscribed call.
	 *
	 * @param {number[]} [freshIds] The current id list, when already known.
	 */
	async function render( freshIds ) {
		const ids = Array.isArray( freshIds ) ? freshIds : await ensureWishlistReady();

		if ( 0 === ids.length ) {
			panel.hidden = ! showWhenEmpty;
			itemsEl.removeAttribute( 'aria-busy' );
			itemsEl.innerHTML =
				`<p class="sgs-wishlist-panel__empty-message">${ escapeHtml( emptyText ) }</p>` +
				`<a class="sgs-wishlist-panel__empty-cta" href="${ escapeHtml(
					shopUrl
				) }">${ escapeHtml( emptyLinkLabel ) }</a>`;
			return;
		}

		panel.hidden = false;
		itemsEl.setAttribute( 'aria-busy', 'true' );

		let products;
		try {
			products = await fetchWishlistProducts( ids );
		} catch {
			itemsEl.removeAttribute( 'aria-busy' );
			itemsEl.innerHTML =
				'<p class="sgs-wishlist-panel__error">Your wishlist could not be loaded. Please try again.</p>';
			return;
		}

		itemsEl.removeAttribute( 'aria-busy' );
		if ( 0 === products.length ) {
			itemsEl.innerHTML =
				'<p class="sgs-wishlist-panel__error">The saved items could not be found — they may have been removed.</p>';
			return;
		}
		itemsEl.innerHTML = products
			.map( ( product ) => wishlistRowHtml( product, { showPrice, showStock } ) )
			.join( '' );
	}

	// Move to basket / Remove / Notify me — one delegated listener.
	itemsEl.addEventListener( 'click', async ( event ) => {
		const moveButton = event.target.closest( '.sgs-wishlist-panel__move-to-basket' );
		const removeButton = event.target.closest( '.sgs-wishlist-panel__remove' );
		const notifyToggle = event.target.closest( '.sgs-wishlist-panel__notify-toggle' );

		if ( moveButton ) {
			const productId = Number( moveButton.dataset.productId );
			moveButton.disabled = true;
			try {
				await addCartItem( productId );
				await toggleWishlistId( productId );
				announce( 'Moved to your basket.' );
			} catch {
				announce( 'Could not move that item to your basket. Please try again.' );
				moveButton.disabled = false;
			}
			return;
		}

		if ( removeButton ) {
			const productId = Number( removeButton.dataset.productId );
			removeButton.disabled = true;
			try {
				await toggleWishlistId( productId );
				announce( 'Removed from your wishlist.' );
			} catch {
				announce( 'Could not remove that item. Please try again.' );
				removeButton.disabled = false;
			}
			return;
		}

		if ( notifyToggle ) {
			const productId = Number( notifyToggle.dataset.productId );
			const form = itemsEl.querySelector(
				`.sgs-wishlist-panel__notify-form[data-product-id="${ productId }"]`
			);
			if ( form ) {
				mountNotifyForm( form, productId );
				notifyToggle.setAttribute( 'aria-expanded', 'true' );
			}
		}
	} );

	render();
	onWishlistChange( render );
}

document.querySelectorAll( '[data-sgs-wishlist-panel]' ).forEach( initPanel );

// The cart page (theme/sgs-theme/templates/cart.html) carries this block
// alongside WooCommerce's own Cart block — start the row enhancer
// regardless of the panel's own empty/hidden state (a full basket with an
// empty wishlist still benefits from Save-for-later).
initSaveForLater();

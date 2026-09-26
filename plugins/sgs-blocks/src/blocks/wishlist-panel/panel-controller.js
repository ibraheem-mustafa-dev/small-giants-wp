/**
 * SGS Wishlist Panel — one panel instance's controller.
 *
 * Wires the shared/own-list flow (`normal-view.js`) or the read-only
 * shared-list flow (`shared-view.js`) depending on whether the page URL
 * carries a valid `?sgs-list=` token, plus the delegated Move to basket /
 * Remove / Notify me / Add to my list click handling both flows share.
 *
 * @package
 */
import { ensureWishlistReady, onWishlistChange, toggleWishlistId, addWishlistId } from '../../shared/wishlist-store';
import { addCartItem } from './api';
import { escapeHtml } from './render-rows';
import { mountNotifyForm } from './notify-form';
import { readPanelData } from './labels';
import { renderNormalView } from './normal-view';
import { parseShareToken, renderSharedView } from './shared-view';
import { wireAlerts } from './alerts';
import { wireShare } from './share';

/**
 * Wire one panel instance.
 *
 * @param {HTMLElement} panel The `[data-sgs-wishlist-panel]` root.
 */
export function initPanel( panel ) {
	const itemsEl = panel.querySelector( '[data-sgs-wishlist-items]' );
	const statusEl = panel.querySelector( '[data-sgs-wishlist-status]' );
	const barsEl = panel.querySelector( '[data-sgs-wishlist-bars]' );
	const headingEl = panel.querySelector( '.sgs-wishlist-panel__heading' );
	const headingCountEl = panel.querySelector( '[data-sgs-wishlist-count]' );
	const viewAllEl = panel.querySelector( '[data-sgs-wishlist-view-all]' );
	if ( ! itemsEl || ! barsEl ) {
		return;
	}

	const labels = readPanelData( panel );
	const elements = { itemsEl, barsEl, headingEl, headingCountEl, viewAllEl };

	/**
	 * @param {string} message Announcement text for the panel's live region.
	 */
	function announce( message ) {
		if ( statusEl ) {
			statusEl.textContent = message;
		}
	}

	wireAlerts( barsEl, labels, announce );
	wireShare( barsEl, labels, announce );

	const sharedToken = parseShareToken( window.location.search );

	if ( sharedToken ) {
		panel.hidden = false;
		renderSharedView( elements, labels, sharedToken );
	} else {
		/**
		 * @param {number[]} [freshIds] The current id list, when already known.
		 */
		async function render( freshIds ) {
			const ids = Array.isArray( freshIds ) ? freshIds : await ensureWishlistReady();

			if ( 0 === ids.length ) {
				panel.hidden = ! labels.showWhenEmpty;
				itemsEl.removeAttribute( 'aria-busy' );
				barsEl.innerHTML = '';
				itemsEl.innerHTML =
					`<p class="sgs-wishlist-panel__empty-message">${ escapeHtml( labels.emptyText ) }</p>` +
					`<a class="sgs-wishlist-panel__empty-cta" href="${ escapeHtml(
						labels.shopUrl
					) }">${ escapeHtml( labels.emptyLinkLabel ) }</a>`;
				return;
			}

			panel.hidden = false;
			await renderNormalView( elements, labels, ids, announce );
		}

		render();
		onWishlistChange( render );
	}

	// Move to basket / Remove / Notify me / Add to my list — one delegated
	// listener, shared by both the own-list and the shared-list rows.
	itemsEl.addEventListener( 'click', async ( event ) => {
		const moveButton = event.target.closest( '.sgs-wishlist-panel__move-to-basket' );
		const removeButton = event.target.closest( '.sgs-wishlist-panel__remove' );
		const notifyToggle = event.target.closest( '.sgs-wishlist-panel__notify-toggle' );
		const addToMineButton = event.target.closest( '.sgs-wishlist-panel__add-to-mine' );

		if ( moveButton ) {
			const productId = Number( moveButton.dataset.productId );
			moveButton.disabled = true;
			try {
				await addCartItem( productId );
				if ( ! sharedToken ) {
					await toggleWishlistId( productId );
				}
				announce( 'Moved to your basket.' );
			} catch {
				announce( labels.errorText );
				moveButton.disabled = false;
			}
			return;
		}

		if ( removeButton ) {
			const productId = Number( removeButton.dataset.productId );
			removeButton.disabled = true;
			try {
				await toggleWishlistId( productId );
				announce( labels.removeLabel );
			} catch {
				announce( labels.errorText );
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
				mountNotifyForm( form, productId, labels );
				notifyToggle.setAttribute( 'aria-expanded', 'true' );
			}
			return;
		}

		if ( addToMineButton ) {
			const productId = Number( addToMineButton.dataset.productId );
			addToMineButton.disabled = true;
			try {
				await addWishlistId( productId );
				announce( labels.addToMineLabel );
			} catch {
				announce( labels.errorText );
			}
			addToMineButton.disabled = false;
		}
	} );
}

/**
 * SGS Wishlist Panel — the read-only shared-list view (FR-30-15 §4e).
 *
 * `?sgs-list={32-hex-token}` on the Saved items page switches the panel to
 * a public, read-only view of someone else's list: `GET
 * /sgs/v1/wishlist/shared/{token}` (no nonce — a public route), showing
 * only published, visible products, no personal data.
 *
 * `parseShareToken` is pure — no DOM access at import time — so it is
 * directly testable in Node (`scripts/tests/test-wishlist-panel.mjs`).
 *
 * @package
 */
import { escapeHtml, wishlistRowHtml } from './render-rows';
import { fetchWishlistProducts } from './api';

/** The exact token shape the public route accepts. */
const TOKEN_PATTERN = /^[a-f0-9]{32}$/;

/**
 * Read the `sgs-list` share token from a URL's query string.
 *
 * @param {string} search `location.search` (or any "?key=value…" string).
 * @return {string|null} The token, or null when absent/malformed.
 */
export function parseShareToken( search ) {
	let token;
	try {
		token = new URLSearchParams( search || '' ).get( 'sgs-list' ) || '';
	} catch ( e ) {
		return null;
	}
	return TOKEN_PATTERN.test( token ) ? token : null;
}

/**
 * Fetch a shared list's product ids from the public route.
 *
 * @param {string} token A token accepted by {@link parseShareToken}.
 * @return {Promise<{ok:boolean, status:number, ids:number[]}>}
 */
export async function fetchSharedList( token ) {
	const root = String( window?.sgsWishlistData?.restUrl || '/wp-json/' ).replace( /\/$/, '' );
	let response;
	try {
		response = await window.fetch( root + '/sgs/v1/wishlist/shared/' + token, {
			credentials: 'same-origin',
		} );
	} catch ( e ) {
		return { ok: false, status: 0, ids: [] };
	}
	let json = null;
	try {
		json = await response.json();
	} catch ( e ) {
		json = null;
	}
	const ids = Array.isArray( json?.items )
		? json.items.map( ( item ) => Number( item.id ) ).filter( ( id ) => id > 0 )
		: [];
	return { ok: response.ok, status: response.status, ids };
}

/**
 * Render the read-only shared-list view for one panel instance: no dates,
 * no price drop, no Remove, no bars — rows get Move to basket/Choose
 * options plus `addToMineLabel`.
 *
 * @param {Object} elements `{itemsEl, barsEl, headingEl, headingCountEl, viewAllEl}`.
 * @param {Object} labels   `labels.js::readPanelData()` output.
 * @param {string} token    The token from {@link parseShareToken}.
 * @return {Promise<void>}
 */
export async function renderSharedView( elements, labels, token ) {
	const { itemsEl, barsEl, headingEl, headingCountEl, viewAllEl } = elements;
	if ( headingEl ) {
		headingEl.textContent = labels.sharedHeading;
		headingEl.hidden = false;
	}
	if ( headingCountEl ) {
		headingCountEl.hidden = true;
	}
	if ( viewAllEl ) {
		viewAllEl.hidden = true;
	}
	barsEl.innerHTML = '';
	itemsEl.setAttribute( 'aria-busy', 'true' );

	const result = await fetchSharedList( token );
	if ( ! result.ok || 0 === result.ids.length ) {
		itemsEl.removeAttribute( 'aria-busy' );
		itemsEl.innerHTML = `<p class="sgs-wishlist-panel__error">${ escapeHtml(
			labels.sharedGoneText
		) }</p>`;
		return;
	}

	let products;
	try {
		products = await fetchWishlistProducts( result.ids );
	} catch {
		itemsEl.removeAttribute( 'aria-busy' );
		itemsEl.innerHTML = `<p class="sgs-wishlist-panel__error">${ escapeHtml( labels.errorText ) }</p>`;
		return;
	}
	itemsEl.removeAttribute( 'aria-busy' );

	itemsEl.innerHTML = products
		.map( ( product ) =>
			wishlistRowHtml( product, {
				showPrice: labels.showPrice,
				showStock: labels.showStock,
				showDateSaved: false,
				showPriceDrop: false,
				shared: true,
				labels,
			} )
		)
		.join( '' );
}

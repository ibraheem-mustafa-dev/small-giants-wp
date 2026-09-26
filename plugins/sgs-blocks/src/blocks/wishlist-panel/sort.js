/**
 * SGS Wishlist Panel — client-side sort (grid/list layouts only).
 *
 * Pure over the fetched Store API products + each product's saved-price
 * record (`src/shared/wishlist-store/index.js::getSavedPrices()`) — no DOM
 * access at import time, so this module is directly testable in Node
 * (`scripts/tests/test-wishlist-panel.mjs`).
 *
 * @package
 */

const SORT_STORAGE_KEY = 'sgs-wishlist-sort';

/** @type {string[]} Every accepted sort mode. */
export const SORT_MODES = [ 'recent', 'price-asc', 'price-desc', 'stock' ];

/**
 * Sort a list of Store API products.
 *
 * - `recent`: newest-saved first. A logged-in `addedTs` sorts numerically
 *   descending; a guest has no timestamp (`addedTs === null`) — the caller's
 *   own list order is already oldest-first (ids are appended on save), so
 *   guests are sorted by REVERSING that input order rather than comparing
 *   a missing timestamp.
 * - `price-asc` / `price-desc`: the product's current Store API price.
 * - `stock`: in-stock products first (stable otherwise).
 *
 * @param {Array}  products    Store API product objects.
 * @param {string} mode        One of {@link SORT_MODES}.
 * @param {Object} savedPrices id → `{savedPrice, currency, addedTs}` (from `getSavedPrices()`).
 * @return {Array} A NEW sorted array — `products` is never mutated.
 */
export function sortProducts( products, mode, savedPrices ) {
	const list = Array.isArray( products ) ? products.slice() : [];
	const prices = savedPrices || {};

	if ( 'price-asc' === mode || 'price-desc' === mode ) {
		const direction = 'price-asc' === mode ? 1 : -1;
		return list.sort(
			( a, b ) => direction * ( Number( a?.prices?.price ) - Number( b?.prices?.price ) )
		);
	}

	if ( 'stock' === mode ) {
		const inStock = ( product ) =>
			'instock' === product?.is_in_stock || true === product?.is_in_stock;
		return list.sort( ( a, b ) => ( inStock( b ) ? 1 : 0 ) - ( inStock( a ) ? 1 : 0 ) );
	}

	// 'recent' (default). Prefer a real addedTs when every item carries one
	// (the logged-in tier); otherwise treat the input order as oldest-first
	// and reverse it (the guest tier).
	const hasTimestamps = list.every(
		( product ) => null !== prices[ Number( product?.id ) ]?.addedTs
	);
	if ( hasTimestamps ) {
		return list.sort(
			( a, b ) =>
				Number( prices[ Number( b?.id ) ]?.addedTs || 0 ) -
				Number( prices[ Number( a?.id ) ]?.addedTs || 0 )
		);
	}
	return list.reverse();
}

/**
 * Read the shopper's remembered sort mode for this page's panel.
 *
 * @return {string} A value from {@link SORT_MODES}, or 'recent'.
 */
export function readStoredSort() {
	try {
		const value = window.sessionStorage.getItem( SORT_STORAGE_KEY );
		return SORT_MODES.includes( value ) ? value : 'recent';
	} catch ( e ) {
		return 'recent';
	}
}

/**
 * Remember the shopper's chosen sort mode.
 *
 * @param {string} mode One of {@link SORT_MODES}.
 */
export function writeStoredSort( mode ) {
	try {
		window.sessionStorage.setItem( SORT_STORAGE_KEY, mode );
	} catch ( e ) {
		// Storage blocked — the sort still applies for this render.
	}
}

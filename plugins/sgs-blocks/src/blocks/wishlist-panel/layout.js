/**
 * SGS Wishlist Panel — strip-layout row limiting.
 *
 * Pure — no DOM access at import time — so this is directly testable in
 * Node (`scripts/tests/test-wishlist-panel.mjs`).
 *
 * @package
 */

/**
 * Limit a product list for the `strip` layout.
 *
 * @param {Array}  products Store API products, already sorted.
 * @param {number} maxItems Maximum rows to show (0 = no limit, no "View all").
 * @return {{rows:Array, hasMore:boolean}} The rows to render, and whether a
 *                                          "View all" link should show.
 */
export function limitForStrip( products, maxItems ) {
	const list = Array.isArray( products ) ? products : [];
	const limit = Number( maxItems ) || 0;
	if ( limit <= 0 ) {
		return { rows: list, hasMore: false };
	}
	return { rows: list.slice( 0, limit ), hasMore: list.length > limit };
}

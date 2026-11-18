/**
 * SGS Wishlist Panel — where keyboard focus goes when a saved item is removed.
 *
 * Removing an item repaints the list, which would drop focus to the page. Before the removal the controller asks
 * `nextItemId` which item should take focus (the one after, else the one before); after the repaint `applyFocus` puts
 * it there, or on the empty state's button when the list is now empty.
 *
 * @package
 */

/**
 * The item that takes focus once `removedId` is gone.
 *
 * @param {number[]} orderedIds The visible items' product IDs, in on-screen order.
 * @param {number}   removedId  The product ID being removed.
 * @return {number|null} The next item's ID, else the previous one's, else null (the list will be empty).
 */
export function nextItemId( orderedIds, removedId ) {
	const index = orderedIds.indexOf( removedId );
	if ( index < 0 ) {
		return null;
	}
	return orderedIds[ index + 1 ] ?? orderedIds[ index - 1 ] ?? null;
}

/**
 * The product IDs of the rows in a panel's list, in on-screen order.
 *
 * @param {HTMLElement} itemsEl `[data-sgs-wishlist-items]`.
 * @return {number[]} The IDs.
 */
export function visibleIds( itemsEl ) {
	return Array.from( itemsEl.querySelectorAll( '.sgs-wishlist-panel__row[data-product-id]' ) )
		.map( ( row ) => Number( row.dataset.productId ) )
		.filter( ( id ) => id > 0 );
}

/**
 * Move focus after the list repainted.
 *
 * @param {HTMLElement} itemsEl `[data-sgs-wishlist-items]`.
 * @param {number|null} nextId  `nextItemId()` output taken before the removal.
 * @return {boolean} Whether something took focus.
 */
export function applyFocus( itemsEl, nextId ) {
	const target =
		null === nextId
			? itemsEl.querySelector( '.sgs-wishlist-panel__empty-cta' )
			: itemsEl.querySelector( `.sgs-wishlist-panel__row[data-product-id="${ nextId }"]` )?.querySelector(
					'a[href]:not([tabindex="-1"]), button:not(:disabled)'
			  );
	if ( ! target ) {
		return false;
	}
	target.focus();
	return true;
}

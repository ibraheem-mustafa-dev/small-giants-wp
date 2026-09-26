/**
 * SGS Wishlist Panel — the sort `<select>` (grid/list layouts only).
 *
 * @package
 */
import { escapeHtml } from './render-rows';
import { readStoredSort, writeStoredSort } from './sort';

/**
 * Build the sort control's markup — a native `<select>` with a visible
 * `<label>` (never a labelless control).
 *
 * @param {Object} labels `labels.js::readPanelData()` output.
 * @return {string} Sort control markup.
 */
export function sortSelectHtml( labels ) {
	const current = readStoredSort();
	const options = [
		[ 'recent', labels.sortRecentLabel ],
		[ 'price-asc', labels.sortPriceAscLabel ],
		[ 'price-desc', labels.sortPriceDescLabel ],
		[ 'stock', labels.sortStockLabel ],
	]
		.map(
			( [ value, text ] ) =>
				`<option value="${ value }" ${ value === current ? 'selected' : '' }>${ escapeHtml(
					text
				) }</option>`
		)
		.join( '' );

	return (
		'<div class="sgs-wishlist-panel__sort">' +
		`<label for="sgs-wishlist-sort">${ escapeHtml( labels.sortLabel ) }</label>` +
		`<select id="sgs-wishlist-sort" data-sgs-wishlist-sort>${ options }</select>` +
		'</div>'
	);
}

/**
 * Wire the sort control's change event.
 *
 * @param {HTMLElement} container `[data-sgs-wishlist-bars]` (the sort control's parent).
 * @param {Function}    onChange  `(mode:string) => void`, called with the new mode.
 * @param {Function}    announce  `(message:string) => void` — the panel's status region.
 * @param {string}      sortedByPrefix Announcement prefix (e.g. "Sorted by").
 */
export function wireSortSelect( container, onChange, announce, sortedByPrefix ) {
	const select = container.querySelector( '[data-sgs-wishlist-sort]' );
	if ( ! select ) {
		return;
	}
	select.addEventListener( 'change', () => {
		const mode = select.value;
		writeStoredSort( mode );
		onChange( mode );
		const label = select.options[ select.selectedIndex ]?.textContent || mode;
		announce( `${ sortedByPrefix } ${ label }` );
	} );
}

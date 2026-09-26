/**
 * SGS Wishlist Panel — the visitor's own list (grid/list/strip layouts).
 *
 * @package
 */
import { config, getSavedPrices, getAccountState } from '../../shared/wishlist-store';
import { fetchWishlistProducts } from './api';
import { wishlistRowHtml, escapeHtml } from './render-rows';
import { guestPromptHtml, alertsBarHtml } from './render-bars';
import { sortSelectHtml, wireSortSelect } from './sort-ui';
import { sortProducts, readStoredSort } from './sort';
import { limitForStrip } from './layout';

/**
 * Render the bars (guest prompt / alerts+share) — grid/list layouts only.
 *
 * @param {HTMLElement} barsEl  `[data-sgs-wishlist-bars]`.
 * @param {Object}      labels  `labels.js::readPanelData()` output.
 * @return {void}
 */
function renderBars( barsEl, labels ) {
	if ( 'strip' === labels.layout ) {
		barsEl.innerHTML = '';
		return;
	}
	const cfg = config();
	if ( ! cfg.isLoggedIn ) {
		barsEl.innerHTML = labels.showGuestPrompt ? guestPromptHtml( labels ) : '';
		return;
	}
	barsEl.innerHTML = alertsBarHtml(
		{ features: cfg.features || {}, ...getAccountState() },
		labels
	);
}

/**
 * Render the sort control — grid/list layouts only, and only once there is
 * something to sort.
 *
 * @param {HTMLElement} barsEl     `[data-sgs-wishlist-bars]`.
 * @param {Object}      labels     `labels.js::readPanelData()` output.
 * @param {boolean}     hasProducts Whether the panel has any rows to sort.
 * @param {Function}    onSortChange `(mode:string) => void`.
 * @param {Function}    announce   `(message:string) => void`.
 */
function renderSort( barsEl, labels, hasProducts, onSortChange, announce ) {
	if ( 'strip' === labels.layout || ! labels.showSort || ! hasProducts ) {
		return;
	}
	barsEl.insertAdjacentHTML( 'beforeend', sortSelectHtml( labels ) );
	wireSortSelect( barsEl, onSortChange, announce, 'Sorted by' );
}

/**
 * Update the heading's count span and the strip "View all" link.
 *
 * @param {Object}      elements `{headingCountEl, viewAllEl}`.
 * @param {Object}      labels   `labels.js::readPanelData()` output.
 * @param {number}      count    Total saved-item count.
 * @param {boolean}     hasMore  Whether more items exist than are shown (strip only).
 */
function updateHeadingAndViewAll( { headingCountEl, viewAllEl }, labels, count, hasMore ) {
	if ( headingCountEl ) {
		headingCountEl.hidden = ! labels.showCount;
		headingCountEl.textContent = labels.showCount ? `(${ count })` : '';
	}
	if ( viewAllEl ) {
		const showViewAll = 'strip' === labels.layout && hasMore;
		viewAllEl.hidden = ! showViewAll;
		if ( showViewAll ) {
			viewAllEl.textContent = labels.viewAllLabel;
			viewAllEl.href = labels.viewAllUrl;
		}
	}
}

/**
 * Render the visitor's own saved-item list for one panel instance.
 *
 * @param {Object}   elements `{itemsEl, barsEl, headingCountEl, viewAllEl}`.
 * @param {Object}   labels   `labels.js::readPanelData()` output.
 * @param {number[]} ids      The visitor's saved product ids.
 * @param {Function} announce `(message:string) => void`.
 * @return {Promise<void>}
 */
export async function renderNormalView( elements, labels, ids, announce ) {
	const { itemsEl, barsEl } = elements;
	itemsEl.setAttribute( 'aria-busy', 'true' );

	let products;
	try {
		products = await fetchWishlistProducts( ids );
	} catch {
		itemsEl.removeAttribute( 'aria-busy' );
		itemsEl.innerHTML = `<p class="sgs-wishlist-panel__error">${ escapeHtml( labels.errorText ) }</p>`;
		return;
	}
	itemsEl.removeAttribute( 'aria-busy' );

	if ( 0 === products.length ) {
		itemsEl.innerHTML = `<p class="sgs-wishlist-panel__error">${ escapeHtml( labels.errorText ) }</p>`;
		updateHeadingAndViewAll( elements, labels, 0, false );
		return;
	}

	const savedPrices = getSavedPrices();
	const isStrip = 'strip' === labels.layout;

	const paint = ( sortedProducts ) => {
		const view = isStrip ? limitForStrip( sortedProducts, labels.maxItems ) : { rows: sortedProducts, hasMore: false };
		itemsEl.innerHTML = view.rows
			.map( ( product ) =>
				wishlistRowHtml( product, {
					showPrice: labels.showPrice,
					showStock: ! isStrip && labels.showStock,
					showDateSaved: ! isStrip && labels.showDateSaved,
					showPriceDrop: ! isStrip && labels.showPriceDrop,
					shared: false,
					labels,
					savedPrice: savedPrices[ Number( product.id ) ],
				} )
			)
			.join( '' );
		updateHeadingAndViewAll( elements, labels, sortedProducts.length, view.hasMore );
	};

	paint( sortProducts( products, readStoredSort(), savedPrices ) );
	renderBars( barsEl, labels );
	renderSort(
		barsEl,
		labels,
		products.length > 0,
		( mode ) => paint( sortProducts( products, mode, savedPrices ) ),
		announce
	);
}

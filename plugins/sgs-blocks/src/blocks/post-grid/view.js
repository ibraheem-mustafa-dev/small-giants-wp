/**
 * SGS Post Grid — frontend interactivity.
 *
 * Handles AJAX pagination (standard / load-more / infinite scroll),
 * category/tag filter buttons, and carousel controls.
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 * No external libraries — vanilla JS with fetch() and IntersectionObserver.
 *
 * Security note: innerHTML is used only to inject HTML returned from our
 * own sgs-blocks/v1/posts REST endpoint. That endpoint renders all card
 * markup server-side via Post_Grid_REST::render_card() which escapes every
 * output with esc_html(), esc_attr(), esc_url(), and wp_trim_words().
 * No user-supplied HTML ever reaches the DOM through this path.
 */

import { showSkeletons, announce, setTrustedServerHtml, showLoadFailure, fetchPosts } from './view-fetch.js';
import { initStandardPagination, initLoadMore, initInfiniteScroll } from './view-pagination.js';
import { initCarousel } from './view-carousel.js';

// ==========================================================================
// Filter buttons
// ==========================================================================

/**
 * Initialise category/tag filter buttons.
 *
 * @param {Element} gridEl    The .sgs-post-grid root element.
 * @param {Object}  queryData Block query parameters.
 */
function initFilters( gridEl, queryData ) {
	const filtersEl = gridEl.querySelector( '.sgs-post-grid__filters' );
	if ( ! filtersEl ) {
		return;
	}

	filtersEl.addEventListener( 'click', async ( evt ) => {
		const btn = evt.target.closest( '.sgs-post-grid__filter' );
		if ( ! btn || btn.getAttribute( 'aria-pressed' ) === 'true' ) {
			return;
		}

		const filterId = btn.dataset.filterId;
		const innerEl  = gridEl.querySelector( '.sgs-post-grid__inner' );
		const allBtns  = filtersEl.querySelectorAll( '.sgs-post-grid__filter' );

		const previousActive = filtersEl.querySelector( '.sgs-post-grid__filter[aria-pressed="true"]' );

		// Update active state immediately for perceived responsiveness.
		allBtns.forEach( ( b ) => {
			const isActive = b === btn;
			b.classList.toggle( 'sgs-post-grid__filter--active', isActive );
			b.setAttribute( 'aria-pressed', isActive ? 'true' : 'false' );
			b.disabled = true;
		} );

		const previousPosts = [ ...innerEl.childNodes ];
		showSkeletons( innerEl, queryData.postsPerPage );

		try {
			const data = await fetchPosts( queryData, 1, filterId );
			setTrustedServerHtml( innerEl, data.html );
			announce( gridEl, 'Posts filtered. ' + data.totalPosts + ' results shown.' );
		} catch ( err ) {
			showLoadFailure( gridEl, innerEl, previousPosts );
			// Posts put back: the filter that matches them is pressed again.
			if ( ! gridEl.dataset.errorMessage && previousActive ) {
				allBtns.forEach( ( b ) => {
					const isActive = b === previousActive;
					b.classList.toggle( 'sgs-post-grid__filter--active', isActive );
					b.setAttribute( 'aria-pressed', isActive ? 'true' : 'false' );
				} );
			}
		} finally {
			allBtns.forEach( ( b ) => {
				b.disabled = false;
			} );
		}
	} );
}

// ==========================================================================
// Bootstrap all grids on the page
// ==========================================================================

document.querySelectorAll( '.sgs-post-grid[data-sgs-query]' ).forEach( ( gridEl ) => {
	let queryData;
	try {
		queryData = JSON.parse( gridEl.dataset.sgsQuery );
	} catch ( err ) {
		return;
	}

	const pagination = gridEl.dataset.pagination || 'none';
	const layout     = gridEl.dataset.layout     || 'grid';

	if ( 'standard' === pagination ) {
		initStandardPagination( gridEl, queryData );
	}

	if ( 'load-more' === pagination ) {
		initLoadMore( gridEl, queryData );
	}

	if ( 'infinite' === pagination ) {
		initInfiniteScroll( gridEl, queryData );
	}

	// Filters are independent of pagination mode.
	initFilters( gridEl, queryData );

	// Carousel is a layout variant, not a pagination mode.
	if ( 'carousel' === layout ) {
		initCarousel( gridEl, queryData );
	}
} );

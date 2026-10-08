/* Post grid: standard, load-more and infinite-scroll pagination. */

import { REDUCED_MOTION, showSkeletons, announce, setTrustedServerHtml, showLoadFailure, fetchPosts } from './view-fetch.js';

// ==========================================================================
// Standard (numbered) pagination
// ==========================================================================

/**
 * Initialise standard numbered pagination.
 *
 * @param {Element} gridEl    The .sgs-post-grid root element.
 * @param {Object}  queryData Block query parameters.
 */
export function initStandardPagination( gridEl, queryData ) {
	const nav = gridEl.querySelector( '.sgs-post-grid__pagination' );
	if ( ! nav ) {
		return;
	}

	nav.addEventListener( 'click', async ( evt ) => {
		const btn = evt.target.closest( '.sgs-post-grid__page-btn' );
		if ( ! btn || btn.getAttribute( 'aria-current' ) === 'page' ) {
			return;
		}

		const page    = parseInt( btn.dataset.page, 10 );
		const innerEl = gridEl.querySelector( '.sgs-post-grid__inner' );
		const allBtns = nav.querySelectorAll( '.sgs-post-grid__page-btn' );

		allBtns.forEach( ( b ) => {
			b.disabled = true;
		} );

		const previousPosts = [ ...innerEl.childNodes ];
		showSkeletons( innerEl, queryData.postsPerPage );

		try {
			const data = await fetchPosts( queryData, page );
			setTrustedServerHtml( innerEl, data.html );

			allBtns.forEach( ( b ) => {
				const isActive = parseInt( b.dataset.page, 10 ) === data.currentPage;
				b.classList.toggle( 'sgs-post-grid__page-btn--current', isActive );
				if ( isActive ) {
					b.setAttribute( 'aria-current', 'page' );
				} else {
					b.removeAttribute( 'aria-current' );
				}
				b.disabled = false;
			} );

			// Update URL for shareable / bookmarkable paginated pages.
			if ( page > 1 ) {
				history.replaceState( null, '', '?pg=' + page );
			} else {
				history.replaceState( null, '', window.location.pathname );
			}

			announce( gridEl, 'Page ' + data.currentPage + ' of ' + data.totalPages + ' loaded.' );

			gridEl.scrollIntoView( {
				// `behavior` — the DOM API's own spelling. UK English is the
				// house rule for prose and identifiers, but NOT for API keys:
				// an unrecognised key is silently discarded, so `behaviour`
				// meant this scroll ignored reduced motion in BOTH directions.
				behavior: REDUCED_MOTION ? 'auto' : 'smooth',
				block:    'start',
			} );
		} catch ( err ) {
			showLoadFailure( gridEl, innerEl, previousPosts );
			nav.querySelectorAll( '.sgs-post-grid__page-btn' ).forEach( ( b ) => {
				b.disabled = false;
			} );
		}
	} );
}

// ==========================================================================
// Load More pagination
// ==========================================================================

/**
 * Initialise "Load More" button pagination.
 *
 * @param {Element} gridEl    The .sgs-post-grid root element.
 * @param {Object}  queryData Block query parameters.
 */
export function initLoadMore( gridEl, queryData ) {
	const btn = gridEl.querySelector( '.sgs-post-grid__load-more' );
	if ( ! btn ) {
		return;
	}

	let currentPage = 1;

	btn.addEventListener( 'click', async () => {
		const nextPage    = currentPage + 1;
		const totalPages  = parseInt( btn.dataset.totalPages, 10 );
		const innerEl     = gridEl.querySelector( '.sgs-post-grid__inner' );
		const originalText = btn.textContent;

		btn.disabled    = true;
		btn.textContent = 'Loading\u2026';

		try {
			const data = await fetchPosts( queryData, nextPage );

			// Append new cards — trusted server HTML.
			const tempDiv = document.createElement( 'div' );
			setTrustedServerHtml( tempDiv, data.html );
			while ( tempDiv.firstChild ) {
				innerEl.appendChild( tempDiv.firstChild );
			}

			currentPage             = nextPage;
			btn.dataset.currentPage = currentPage;

			if ( currentPage >= data.totalPages ) {
				btn.closest( '.sgs-post-grid__load-more-wrap' )?.remove();
			} else {
				btn.disabled    = false;
				btn.textContent = originalText;
			}

			announce( gridEl, 'Loaded page ' + nextPage + ' of ' + totalPages + '.' );
		} catch ( err ) {
			btn.disabled    = false;
			btn.textContent = originalText;
		}
	} );
}

// ==========================================================================
// Infinite scroll
// ==========================================================================

/**
 * Initialise infinite scroll via IntersectionObserver.
 *
 * @param {Element} gridEl    The .sgs-post-grid root element.
 * @param {Object}  queryData Block query parameters.
 */
export function initInfiniteScroll( gridEl, queryData ) {
	const sentinel = gridEl.querySelector( '.sgs-post-grid__sentinel' );
	if ( ! sentinel || typeof IntersectionObserver === 'undefined' ) {
		return;
	}

	let currentPage = 1;
	let isLoading   = false;

	const observer = new IntersectionObserver(
		async ( entries ) => {
			if ( ! entries[ 0 ].isIntersecting || isLoading ) {
				return;
			}

			const totalPages = parseInt( sentinel.dataset.totalPages, 10 );
			if ( currentPage >= totalPages ) {
				observer.disconnect();
				sentinel.remove();
				return;
			}

			isLoading      = true;
			const nextPage = currentPage + 1;
			const innerEl  = gridEl.querySelector( '.sgs-post-grid__inner' );

			try {
				const data = await fetchPosts( queryData, nextPage );

				// Append cards safely.
				const tempDiv = document.createElement( 'div' );
				setTrustedServerHtml( tempDiv, data.html );
				while ( tempDiv.firstChild ) {
					innerEl.appendChild( tempDiv.firstChild );
				}

				currentPage                  = nextPage;
				sentinel.dataset.currentPage = currentPage;

				announce( gridEl, 'More posts loaded.' );

				if ( currentPage >= data.totalPages ) {
					observer.disconnect();
					sentinel.remove();
				}
			} catch ( err ) {
				// Silent failure — sentinel remains so user can trigger again on next scroll.
			} finally {
				isLoading = false;
			}
		},
		{ rootMargin: '200px' }
	);

	observer.observe( sentinel );
}

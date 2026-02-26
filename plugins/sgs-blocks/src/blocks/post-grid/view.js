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

/* global wpApiSettings */

const REST_BASE = ( typeof wpApiSettings !== 'undefined' && wpApiSettings.root )
	? wpApiSettings.root.replace( /\/$/, '' ) + '/sgs-blocks/v1/posts'
	: '/wp-json/sgs-blocks/v1/posts';

const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

/**
 * Build a URL query string from a plain object.
 *
 * @param {Object} params Key/value pairs to serialise.
 * @return {string} URL-encoded query string without leading '?'.
 */
function buildQuery( params ) {
	return Object.entries( params )
		.filter( ( [ , v ] ) => v !== undefined && v !== null && v !== '' )
		.map( ( [ k, v ] ) => encodeURIComponent( k ) + '=' + encodeURIComponent( v ) )
		.join( '&' );
}

/**
 * Show skeleton placeholder cards while loading.
 *
 * Skeleton cards are inert (aria-hidden) CSS-animated placeholders.
 * Content from the server replaces them once the fetch completes.
 *
 * @param {Element} innerEl The .sgs-post-grid__inner element.
 * @param {number}  count   Number of skeleton cards to render.
 */
function showSkeletons( innerEl, count ) {
	const skeletons = Array.from( { length: count } )
		.map( () => {
			const el = document.createElement( 'div' );
			el.className   = 'sgs-post-grid__card sgs-post-grid__card--skeleton';
			el.setAttribute( 'aria-hidden', 'true' );
			return el;
		} );

	// Clear current cards and append skeletons using safe DOM methods.
	innerEl.replaceChildren( ...skeletons );
}

/**
 * Announce a message to screen readers via the block's aria-live region.
 *
 * @param {Element} gridEl  The .sgs-post-grid root element.
 * @param {string}  message The message to announce.
 */
function announce( gridEl, message ) {
	const region = gridEl.querySelector( '.sgs-post-grid__live-region' );
	if ( ! region ) {
		return;
	}
	region.textContent = '';
	// Yield to the browser so the cleared value is committed before the
	// new message is set — this triggers a fresh live region announcement.
	requestAnimationFrame( () => {
		region.textContent = message;
	} );
}

/**
 * Inject server-rendered HTML from the REST endpoint into a container.
 *
 * The HTML originates exclusively from Post_Grid_REST::render_card() where
 * every value is escaped with WordPress functions before output.
 *
 * @param {Element} container The DOM element to populate.
 * @param {string}  html      Trusted server-rendered HTML string.
 */
function setTrustedServerHtml( container, html ) {
	// eslint-disable-next-line no-unsanitized/property
	container.innerHTML = html; // Server output — see file-level security note.
}

/**
 * Show an inline error message using safe DOM methods.
 *
 * @param {Element} container Target element.
 * @param {string}  message   Plain-text error message.
 */
function showError( container, message ) {
	const p = document.createElement( 'p' );
	p.className   = 'sgs-post-grid__error';
	p.textContent = message;
	container.replaceChildren( p );
}

/**
 * Fetch posts from the REST endpoint.
 *
 * @param {Object} queryData        Block data-sgs-query parameters.
 * @param {number} page             Page number to request.
 * @param {string} [filterCategory] Single category ID from filter button.
 * @return {Promise<{html: string, totalPages: number, currentPage: number, totalPosts: number}>}
 */
async function fetchPosts( queryData, page, filterCategory ) {
	const nonce = ( typeof wpApiSettings !== 'undefined' ) ? ( wpApiSettings.nonce || '' ) : '';

	const params = {
		postType:              queryData.postType,
		page,
		postsPerPage:          queryData.postsPerPage,
		orderBy:               queryData.orderBy,
		order:                 queryData.order,
		offset:                queryData.offset || 0,
		excludeCurrent:        queryData.excludeCurrent || false,
		excludePost:           queryData.excludePost || 0,
		layout:                queryData.layout,
		cardStyle:             queryData.cardStyle,
		imageSize:             queryData.imageSize,
		showImage:             queryData.showImage,
		showTitle:             queryData.showTitle,
		showExcerpt:           queryData.showExcerpt,
		excerptLength:         queryData.excerptLength,
		showDate:              queryData.showDate,
		showAuthor:            queryData.showAuthor,
		showCategory:          queryData.showCategory,
		showReadMore:          queryData.showReadMore,
		readMoreText:          queryData.readMoreText,
		aspectRatio:           queryData.aspectRatio,
		titleColour:           queryData.titleColour,
		excerptColour:         queryData.excerptColour,
		metaColour:            queryData.metaColour,
		categoryBadgeColour:   queryData.categoryBadgeColour,
		categoryBadgeBgColour: queryData.categoryBadgeBgColour,
		readMoreColour:        queryData.readMoreColour,
	};

	// Filter button overrides the block's base category setting.
	if ( filterCategory !== undefined ) {
		params.categories = filterCategory;
	} else if ( queryData.categories ) {
		params.categories = queryData.categories;
	}

	if ( queryData.tags ) {
		params.tags = queryData.tags;
	}

	const url = REST_BASE + '?' + buildQuery( params );
	const response = await fetch( url, {
		headers: nonce ? { 'X-WP-Nonce': nonce } : {},
	} );

	if ( ! response.ok ) {
		throw new Error( 'REST request failed: ' + response.status );
	}

	return response.json();
}

// ==========================================================================
// Standard (numbered) pagination
// ==========================================================================

/**
 * Initialise standard numbered pagination.
 *
 * @param {Element} gridEl    The .sgs-post-grid root element.
 * @param {Object}  queryData Block query parameters.
 */
function initStandardPagination( gridEl, queryData ) {
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
				behaviour: REDUCED_MOTION ? 'auto' : 'smooth',
				block:     'start',
			} );
		} catch ( err ) {
			showError( innerEl, 'Could not load posts. Please try again.' );
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
function initLoadMore( gridEl, queryData ) {
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
function initInfiniteScroll( gridEl, queryData ) {
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

		// Update active state immediately for perceived responsiveness.
		allBtns.forEach( ( b ) => {
			const isActive = b === btn;
			b.classList.toggle( 'sgs-post-grid__filter--active', isActive );
			b.setAttribute( 'aria-pressed', isActive ? 'true' : 'false' );
			b.disabled = true;
		} );

		showSkeletons( innerEl, queryData.postsPerPage );

		try {
			const data = await fetchPosts( queryData, 1, filterId );
			setTrustedServerHtml( innerEl, data.html );
			announce( gridEl, 'Posts filtered. ' + data.totalPosts + ' results shown.' );
		} catch ( err ) {
			showError( innerEl, 'Could not load posts. Please try again.' );
		} finally {
			allBtns.forEach( ( b ) => {
				b.disabled = false;
			} );
		}
	} );
}

// ==========================================================================
// Carousel
// ==========================================================================

/**
 * Initialise carousel prev/next/dots controls.
 *
 * The inner grid scrolls horizontally with CSS scroll-snap;
 * this script manages dot state and keyboard navigation.
 *
 * @param {Element} gridEl    The .sgs-post-grid root element.
 * @param {Object}  queryData Block query parameters.
 */
function initCarousel( gridEl, queryData ) {
	const innerEl = gridEl.querySelector( '.sgs-post-grid__inner' );
	const prevBtn = gridEl.querySelector( '.sgs-post-grid__carousel-prev' );
	const nextBtn = gridEl.querySelector( '.sgs-post-grid__carousel-next' );
	const dotsEl  = gridEl.querySelector( '.sgs-post-grid__carousel-dots' );

	if ( ! innerEl ) {
		return;
	}

	const cards = Array.from( innerEl.querySelectorAll( '.sgs-post-grid__card' ) );
	if ( ! cards.length ) {
		return;
	}

	let currentIndex  = 0;
	let autoplayTimer = null;
	const totalCards  = cards.length;

	/**
	 * Scroll the carousel to a specific card index.
	 *
	 * @param {number} index Target card index (clamped to valid range).
	 */
	const scrollToCard = ( index ) => {
		currentIndex = Math.max( 0, Math.min( index, totalCards - 1 ) );
		const target = cards[ currentIndex ];

		if ( target ) {
			target.scrollIntoView( {
				behaviour: REDUCED_MOTION ? 'auto' : 'smooth',
				block:     'nearest',
				inline:    'start',
			} );
		}

		if ( dotsEl ) {
			dotsEl.querySelectorAll( '.sgs-post-grid__dot' ).forEach( ( dot, i ) => {
				const isActive = i === currentIndex;
				dot.classList.toggle( 'sgs-post-grid__dot--active', isActive );
				dot.setAttribute( 'aria-selected', isActive ? 'true' : 'false' );
			} );
		}

		if ( prevBtn ) {
			prevBtn.disabled = currentIndex === 0;
		}
		if ( nextBtn ) {
			nextBtn.disabled = currentIndex >= totalCards - 1;
		}
	};

	// Build dot buttons.
	if ( dotsEl ) {
		cards.forEach( ( _card, i ) => {
			const dot = document.createElement( 'button' );
			dot.type      = 'button';
			dot.className = 'sgs-post-grid__dot' + ( i === 0 ? ' sgs-post-grid__dot--active' : '' );
			dot.setAttribute( 'role', 'tab' );
			dot.setAttribute( 'aria-selected', i === 0 ? 'true' : 'false' );
			dot.setAttribute( 'aria-label', 'Go to slide ' + ( i + 1 ) );
			dot.addEventListener( 'click', () => {
				scrollToCard( i );
				resetAutoplay();
			} );
			dotsEl.appendChild( dot );
		} );
	}

	// Arrow controls.
	if ( prevBtn ) {
		prevBtn.disabled = true;
		prevBtn.addEventListener( 'click', () => {
			scrollToCard( currentIndex - 1 );
			resetAutoplay();
		} );
	}

	if ( nextBtn ) {
		nextBtn.addEventListener( 'click', () => {
			scrollToCard( currentIndex + 1 );
			resetAutoplay();
		} );
	}

	// Keyboard left/right within the carousel track.
	innerEl.addEventListener( 'keydown', ( evt ) => {
		if ( evt.key === 'ArrowLeft' ) {
			evt.preventDefault();
			scrollToCard( currentIndex - 1 );
			resetAutoplay();
		} else if ( evt.key === 'ArrowRight' ) {
			evt.preventDefault();
			scrollToCard( currentIndex + 1 );
			resetAutoplay();
		}
	} );

	// Autoplay (disabled when prefers-reduced-motion is set).
	const startAutoplay = () => {
		if ( ! queryData.carouselAutoplay || REDUCED_MOTION ) {
			return;
		}
		autoplayTimer = setInterval( () => {
			const next = currentIndex + 1 >= totalCards ? 0 : currentIndex + 1;
			scrollToCard( next );
		}, queryData.carouselSpeed || 5000 );
	};

	const stopAutoplay = () => {
		if ( autoplayTimer ) {
			clearInterval( autoplayTimer );
			autoplayTimer = null;
		}
	};

	const resetAutoplay = () => {
		stopAutoplay();
		startAutoplay();
	};

	// Pause on hover or focus to prevent users losing their place.
	gridEl.addEventListener( 'mouseenter', stopAutoplay );
	gridEl.addEventListener( 'mouseleave', startAutoplay );
	gridEl.addEventListener( 'focusin', stopAutoplay );
	gridEl.addEventListener( 'focusout', startAutoplay );

	startAutoplay();
	scrollToCard( 0 );
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

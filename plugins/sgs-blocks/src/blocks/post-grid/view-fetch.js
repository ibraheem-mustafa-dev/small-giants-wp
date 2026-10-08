/* Post grid: REST fetch helper, skeleton/announce/failure UI helpers and the reduced-motion flag. */

/* global wpApiSettings */

const REST_BASE = ( typeof wpApiSettings !== 'undefined' && wpApiSettings.root )
	? wpApiSettings.root.replace( /\/$/, '' ) + '/sgs-blocks/v1/posts'
	: '/wp-json/sgs-blocks/v1/posts';

export const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

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
export function showSkeletons( innerEl, count ) {
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
export function announce( gridEl, message ) {
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
export function setTrustedServerHtml( container, html ) {
	// eslint-disable-next-line no-unsanitized/property
	container.innerHTML = html; // Server output — see file-level security note.
}

/**
 * After a failed load: the client's own error message (errorMessage) when set,
 * otherwise the posts that were showing before the load, put back unchanged.
 *
 * @param {Element}   gridEl    The block root carrying data-error-message.
 * @param {Element}   container The posts container.
 * @param {Node[]}    previous  The container's children before the load.
 */
export function showLoadFailure( gridEl, container, previous ) {
	const message = gridEl.dataset.errorMessage || '';
	if ( '' === message ) {
		container.replaceChildren( ...previous );
		return;
	}
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
export async function fetchPosts( queryData, page, filterCategory ) {
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
		// 37-media-no-handroll: round-tripped so AJAX-paginated cards' featured
		// images carry the same media-atom marker class as the initial
		// render's — see the $sgs_pg_uid comment in class-post-grid-rest.php.
		uid:                   queryData.uid,
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

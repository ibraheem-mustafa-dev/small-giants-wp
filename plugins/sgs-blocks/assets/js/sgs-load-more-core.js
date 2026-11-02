/**
 * Load more core: pure helpers shared by every "Load more" list (shop grid today, post-grid and card-grid later).
 * Registered as the script module `@sgs/load-more-core` by includes/load-more-core.php.
 *
 * A list shows `k` batches of `P` items through the URL parameter `sgs_batches=k`; the server renders them all in one
 * response, so Back and reloads need no client fetch.
 */

export const BATCHES_PARAM = 'sgs_batches';

/**
 * The URL with `sgs_batches` set to `k`; a count of 1 or less removes the parameter.
 *
 * @param {string|URL} url    Absolute or relative URL.
 * @param {number}     k      Batches to show.
 * @param {string}     [base] Base for a relative URL.
 * @return {string} Absolute URL.
 */
export function withBatches( url, k, base ) {
	const next = new URL( String( url ), base || globalThis.location?.href || 'http://localhost/' );
	const count = Math.floor( Number( k ) );
	if ( count > 1 ) {
		next.searchParams.set( BATCHES_PARAM, String( count ) );
	} else {
		next.searchParams.delete( BATCHES_PARAM );
	}
	return next.href;
}

/**
 * The batches a URL asks for: a whole number of 2 or more, else 1.
 *
 * @param {string|URL} url    URL.
 * @param {string}     [base] Base for a relative URL.
 * @return {number} Batches.
 */
export function readBatches( url, base ) {
	const parsed = new URL( String( url ), base || globalThis.location?.href || 'http://localhost/' );
	const value = parseInt( parsed.searchParams.get( BATCHES_PARAM ) || '', 10 );
	return value > 1 ? value : 1;
}

/**
 * Fill a "Showing %1$d of %2$d products" template.
 *
 * @param {string} template Template with %1$d (loaded) and %2$d (total).
 * @param {number} loaded   Items shown.
 * @param {number} total    Items in the list.
 * @return {string} Sentence.
 */
export function formatCount( template, loaded, total ) {
	return String( template )
		.replace( /%1\$d/g, String( loaded ) )
		.replace( /%2\$d/g, String( total ) );
}

/**
 * Speak text through a polite live region. Repeating the same sentence still changes the region's text, so it is
 * announced again.
 *
 * @param {Element} region Element with role="status".
 * @param {string}  text   Sentence.
 * @return {void}
 */
export function announce( region, text ) {
	if ( ! region ) {
		return;
	}
	region.textContent = region.textContent === text ? text + ' ' : text;
}

/**
 * Storage key for a page's scroll anchor: path plus the query string with its keys sorted.
 *
 * @param {{pathname: string, search: string}} location Location-like object.
 * @return {string} Key.
 */
export function anchorKey( location ) {
	const params = new URLSearchParams( location.search );
	params.sort();
	return 'sgs-lm:' + location.pathname + '?' + params.toString();
}

/**
 * Remember the clicked item so Back can return to it.
 *
 * @param {Storage} storage   sessionStorage-like object.
 * @param {string}  key       Key from anchorKey().
 * @param {string}  id        Item id (the number in its `post-<id>` class).
 * @param {number}  offsetTop Item top relative to the viewport.
 * @return {void}
 */
export function rememberAnchor( storage, key, id, offsetTop ) {
	try {
		storage.setItem( key, JSON.stringify( { id: String( id ), offsetTop: Math.round( offsetTop ) } ) );
	} catch ( error ) {
		// Storage can be full or blocked; Back then lands at the top, as without the feature.
	}
}

/**
 * The remembered item for a key, removed on read; null when none or malformed.
 *
 * @param {Storage} storage sessionStorage-like object.
 * @param {string}  key     Key from anchorKey().
 * @return {{id: string, offsetTop: number}|null} Anchor.
 */
export function restoreAnchor( storage, key ) {
	try {
		const raw = storage.getItem( key );
		if ( null === raw ) {
			return null;
		}
		storage.removeItem( key );
		const data = JSON.parse( raw );
		if ( ! data || ! /^\d+$/.test( String( data.id ) ) || ! Number.isFinite( data.offsetTop ) ) {
			return null;
		}
		return { id: String( data.id ), offsetTop: data.offsetTop };
	} catch ( error ) {
		return null;
	}
}

/**
 * The one way front-end code sends a request that carries a `wp_rest` nonce.
 *
 * A page printed by a full-page cache can be older than the nonce inside it (12 to 24 hours), and the request then
 * answers 403. `fetchWithNonce` sends the page's nonce in `X-WP-Nonce`; when the reply is a 403 whose error code says
 * the nonce failed, it asks the `sgs_rest_nonce` admin-ajax action (URL from the `sgs-rest-nonce-url` meta tag) for a
 * fresh nonce, remembers it for the rest of the page's life and retries the request once. Any other reply, and a second
 * failure, is returned as it came, so callers keep their own error handling.
 *
 * The fresh nonce and the in-flight refresh live on `window`, because each view module is its own bundle and a
 * module-level variable would give each bundle its own copy.
 *
 * @package
 */

const NONCE_KEY = 'sgsRestNonce';
const REFRESH_KEY = 'sgsRestNonceRefresh';
const META_NAME = 'sgs-rest-nonce-url';

/** Error codes that mean "the nonce is stale": core's cookie check, and the SGS routes' own check. */
const NONCE_ERROR_CODES = [ 'rest_cookie_invalid_nonce', 'sgs_bad_nonce' ];

/**
 * The nonce to send: the fresh one learned on this page, else the one the page was printed with.
 *
 * @param {string} [pageNonce] The nonce printed in the page's markup.
 * @return {string} The nonce, or an empty string.
 */
export function currentNonce( pageNonce ) {
	return window[ NONCE_KEY ] || pageNonce || '';
}

/**
 * Ask the server for a fresh nonce, once at a time.
 *
 * @return {Promise<string>} The fresh nonce, or an empty string when it could not be fetched.
 */
function refreshNonce() {
	if ( window[ REFRESH_KEY ] ) {
		return window[ REFRESH_KEY ];
	}
	const url = document.querySelector( `meta[name="${ META_NAME }"]` )?.getAttribute( 'content' );
	if ( ! url ) {
		return Promise.resolve( '' );
	}
	const pending = window
		.fetch( url, { method: 'POST', credentials: 'same-origin', cache: 'no-store' } )
		.then( ( response ) => ( response.ok ? response.json() : null ) )
		.then( ( json ) => {
			const nonce = 'string' === typeof json?.nonce ? json.nonce : '';
			if ( nonce ) {
				window[ NONCE_KEY ] = nonce;
			}
			return nonce;
		} )
		.catch( () => '' )
		.finally( () => {
			window[ REFRESH_KEY ] = null;
		} );
	window[ REFRESH_KEY ] = pending;
	return pending;
}

/**
 * Whether a reply is a nonce failure.
 *
 * @param {Response} response The reply.
 * @return {Promise<boolean>} True for a 403 carrying one of the nonce error codes.
 */
async function isNonceFailure( response ) {
	if ( ! response || 403 !== response.status || 'function' !== typeof response.clone ) {
		return false;
	}
	try {
		const json = await response.clone().json();
		return NONCE_ERROR_CODES.includes( json?.code );
	} catch {
		return false;
	}
}

/**
 * `fetch` with the page's `wp_rest` nonce, refreshed and retried once when it has expired.
 *
 * @param {string}   url          The request URL.
 * @param {Object}   [init]       Fetch options. Do not set `X-WP-Nonce`; this function does.
 * @param {string}   [pageNonce]  The nonce printed in the page's markup.
 * @return {Promise<Response>} The reply (the retry's when a retry happened).
 */
export function fetchWithNonce( url, init = {}, pageNonce = '' ) {
	const send = ( nonce ) => {
		const headers = { ...( init.headers || {} ) };
		if ( nonce ) {
			headers[ 'X-WP-Nonce' ] = nonce;
		}
		return window.fetch( url, { ...init, headers } );
	};
	const sent = currentNonce( pageNonce );
	const retryIfStale = async ( response ) => {
		if ( ! ( await isNonceFailure( response ) ) ) {
			return response;
		}
		// Another request may have refreshed the nonce while this one was in flight: use it before asking again.
		const fresh = window[ NONCE_KEY ] && window[ NONCE_KEY ] !== sent ? window[ NONCE_KEY ] : await refreshNonce();
		if ( ! fresh || fresh === sent ) {
			return response;
		}
		return send( fresh );
	};
	// Only a 403 takes the slow path: any other reply reaches the caller one microtask after `fetch` settles.
	return send( sent ).then( ( response ) => ( 403 === response?.status ? retryIfStale( response ) : response ) );
}

/**
 * Store API client shared by every SGS cart reader and writer.
 *
 * One request path for the page-wide cart reader (`index.js`), sgs/cart's drawer and the wishlist: the base path, the
 * JSON headers, the error message and the rotating `Nonce` header. GET requests are cookie-authenticated; every
 * mutating request replays the nonce the last response returned. The nonce lives on `window`, because each view module
 * is its own bundle and a module-level variable would give each bundle its own, empty copy.
 *
 * @package
 */

const NONCE_KEY = 'sgsStoreApiNonce';

/**
 * The Store API base path.
 *
 * @return {string} e.g. "/wp-json/wc/store/v1".
 */
export function apiBase() {
	const root =
		window?.wpApiSettings?.root ||
		window?.sgsCartData?.restUrl ||
		window?.sgsWishlistData?.restUrl ||
		'/wp-json';
	return root.replace( /\/$/, '' ) + '/wc/store/v1';
}

/**
 * Issue a Store API request, tracking the rotating nonce.
 *
 * @param {string} path             Path under the Store API base, e.g. "/cart".
 * @param {Object} [options]        Fetch options.
 * @param {string} [options.method] HTTP method (default GET).
 * @param {Object} [options.body]   JSON-serialisable request body.
 * @return {Promise<Object>} The parsed JSON response.
 */
export async function storeRequest( path, { method = 'GET', body } = {} ) {
	const headers = { 'Content-Type': 'application/json' };
	if ( 'GET' !== method && window[ NONCE_KEY ] ) {
		headers.Nonce = window[ NONCE_KEY ];
	}

	const response = await fetch( apiBase() + path, {
		method,
		credentials: 'same-origin',
		headers,
		body: body ? JSON.stringify( body ) : undefined,
	} );

	const freshNonce = response.headers?.get?.( 'Nonce' );
	if ( freshNonce ) {
		window[ NONCE_KEY ] = freshNonce;
	}

	if ( ! response.ok ) {
		let message = '';
		try {
			const errorJson = await response.json();
			message = errorJson?.message || '';
		} catch {
			// Non-JSON error body: the generic message below.
		}
		throw new Error(
			message || `Cart request failed (${ response.status })`
		);
	}

	return response.json();
}

/**
 * Read the live cart from the Store API once, for a caller that renders it itself (the cart drawer on opening). The
 * reading is not published: the caller publishes what it renders (`publishCart` in `index.js`).
 *
 * @return {Promise<Object>} The Store API cart response; rejects when the request fails.
 */
export function readCart() {
	return storeRequest( '/cart' );
}

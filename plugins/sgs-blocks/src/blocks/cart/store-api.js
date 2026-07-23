/**
 * SGS Cart — WooCommerce Store API client (FR-36-19 Phase 2).
 *
 * Every cart mutation (add/update-qty/remove) goes through the WooCommerce
 * Store API (`/wp-json/wc/store/v1/cart/*`) — never legacy `cart-fragments`
 * (WooCommerce's own cache-safety guidance). GET requests are cookie-session
 * authenticated (no nonce needed); mutating requests (POST) require the
 * rotating `Nonce` header the API returns on every response — cached here
 * and replayed on the next mutating call.
 *
 * @package
 */

/** @type {string|null} The most recent Store API nonce, rotated every call. */
let cachedNonce = null;

/**
 * Resolve the WooCommerce Store API base path.
 *
 * @return {string} e.g. "/wp-json/wc/store/v1".
 */
function apiBase() {
	const wpRoot =
		window?.wpApiSettings?.root ||
		window?.sgsCartData?.restUrl ||
		'/wp-json';
	return wpRoot.replace( /\/$/, '' ) + '/wc/store/v1';
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
async function request( path, { method = 'GET', body } = {} ) {
	const headers = { 'Content-Type': 'application/json' };
	if ( 'GET' !== method && cachedNonce ) {
		headers.Nonce = cachedNonce;
	}

	const response = await fetch( apiBase() + path, {
		method,
		credentials: 'same-origin',
		headers,
		body: body ? JSON.stringify( body ) : undefined,
	} );

	const freshNonce = response.headers.get( 'Nonce' );
	if ( freshNonce ) {
		cachedNonce = freshNonce;
	}

	if ( ! response.ok ) {
		let message = '';
		try {
			const errorJson = await response.json();
			message = errorJson?.message || '';
		} catch {
			// Non-JSON error body — fall through to the generic message below.
		}
		throw new Error(
			message || `Cart request failed (${ response.status })`
		);
	}

	return response.json();
}

/**
 * Fetch the current cart (items + totals).
 *
 * @return {Promise<Object>} The Store API cart response.
 */
export function fetchCart() {
	return request( '/cart' );
}

/**
 * Set a cart line item's quantity. A quantity of 0 removes the item
 * (mirrors the Store API's own documented behaviour for `update-item`).
 *
 * @param {string} key      The cart item key.
 * @param {number} quantity The new quantity (0 removes the item).
 * @return {Promise<Object>} The updated cart.
 */
export function updateCartItem( key, quantity ) {
	return request( '/cart/update-item', {
		method: 'POST',
		body: { key, quantity },
	} );
}

/**
 * Remove a cart line item entirely.
 *
 * @param {string} key The cart item key.
 * @return {Promise<Object>} The updated cart.
 */
export function removeCartItem( key ) {
	return request( '/cart/remove-item', {
		method: 'POST',
		body: { key },
	} );
}

/**
 * Format a Store API minor-unit money string using the cart's own totals
 * currency metadata (prefix/suffix/minor-unit), so the mini-cart always
 * matches the shop's configured currency display — never a hardcoded "£".
 *
 * @param {string|number} minorAmount The amount in minor currency units (e.g. pence).
 * @param {Object}        totals      The Store API `totals` object carrying currency_*.
 * @return {string} A formatted money string, e.g. "£12.50".
 */
export function formatMoney( minorAmount, totals ) {
	const minorUnit = Number( totals?.currency_minor_unit ?? 2 );
	const amount = Number( minorAmount ) / 10 ** minorUnit;
	const prefix = totals?.currency_prefix ?? totals?.currency_symbol ?? '';
	const suffix = totals?.currency_suffix ?? '';
	return `${ prefix }${ amount.toFixed( minorUnit ) }${ suffix }`;
}

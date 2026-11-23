/**
 * SGS Cart — WooCommerce Store API client (FR-36-19).
 *
 * Every cart mutation (add/update-qty/remove) goes through the WooCommerce
 * Store API (`/wp-json/wc/store/v1/cart/*`) — never legacy `cart-fragments`
 * (WooCommerce's own cache-safety guidance). GET requests are cookie-session
 * authenticated (no nonce needed); mutating requests (POST) require the
 * rotating `Nonce` header the API returns on every response, which
 * `shared/cart-live/request.js` caches and replays on the next mutating call.
 *
 * @package
 */

import { readCart, storeRequest } from '../../shared/cart-live/request';

/**
 * Fetch the current cart (items + totals).
 *
 * @param {Object} [headers] Extra request headers (the drawer's gift box asks for the gift value with `X-SGS-Gift: 1`).
 * @return {Promise<Object>} The Store API cart response.
 */
export function fetchCart( headers ) {
	return readCart( headers );
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
	return storeRequest( '/cart/update-item', {
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
	return storeRequest( '/cart/remove-item', {
		method: 'POST',
		body: { key },
	} );
}

/**
 * Add a product (or variation) to the cart.
 *
 * @param {number} id        Product or variation id.
 * @param {number} quantity  Quantity (default 1).
 * @param {Object} [headers] Extra request headers (the gift box's `X-SGS-Gift: 1`, so the new cart carries the gift value).
 * @return {Promise<Object>} The updated cart.
 */
export function addCartItem( id, quantity = 1, headers ) {
	return storeRequest( '/cart/add-item', {
		method: 'POST',
		body: { id, quantity },
		headers,
	} );
}

export { addViaProxy } from '../../shared/cart-live/add-via-proxy';

/**
 * Fetch products' current public data (price, stock, image, permalink).
 *
 * @param {number[]} ids Product ids (at most 100).
 * @return {Promise<Array>} Store API product objects, in no guaranteed order.
 */
export function fetchProducts( ids ) {
	if ( ! Array.isArray( ids ) || 0 === ids.length ) {
		return Promise.resolve( [] );
	}
	return storeRequest(
		'/products?include=' + ids.join( ',' ) + '&per_page=100'
	);
}

export { formatMoney } from '../../shared/cart-live/money';

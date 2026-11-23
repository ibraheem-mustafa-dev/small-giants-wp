/**
 * The SGS cart proxy's add route, shared by every block that adds a product in one tap.
 *
 * @package SGS\Blocks
 */

import { fetchWithNonce } from '../rest-nonce';

/**
 * Add a product through the SGS cart proxy (`POST /sgs/v1/cart/add-item`), the route the buy box adds through: the server
 * checks the variation's attributes and any "Pick a set" picks again and builds the cart line. The reply is only a summary,
 * so the caller reads the cart afterwards.
 *
 * @param {string} url   The proxy route URL.
 * @param {string} nonce The `wp_rest` nonce.
 * @param {Object} body  `{ id, quantity, variation, picks }`.
 * @return {Promise<Object>} The proxy's summary (`added`, `items_count`, `cart_total`).
 */
export async function addViaProxy( url, nonce, body ) {
	const response = await fetchWithNonce(
		url,
		{
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify( body ),
		},
		nonce
	);
	let json = null;
	try {
		json = await response.json();
	} catch {
		// A non-JSON reply: the generic message below.
	}
	if ( ! response.ok ) {
		throw new Error(
			json?.message ||
				'Could not add that to your basket. Please try again.'
		);
	}
	return json;
}

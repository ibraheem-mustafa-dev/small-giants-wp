/**
 * Gift order: the write call and the Store API flag.
 *
 * Writes go to the cart proxy (`POST /sgs/v1/cart/gift`); this script never
 * posts to WooCommerce's Store API. Reads come from the cart store's `sgs_gift`
 * extension data, which the server adds only when the request carries the
 * `X-SGS-Gift` header that `flagStoreApiRequests()` puts on this page's Store
 * API requests.
 *
 * @package
 */
import apiFetch from '@wordpress/api-fetch';
import { dispatch } from '@wordpress/data';

export const GIFT_PATH = '/sgs/v1/cart/gift';
export const CART_STORE = 'wc/store/cart';

let flagged = false;

/**
 * Add the gift header to this page's Store API requests (once per page).
 */
export function flagStoreApiRequests() {
	if ( flagged ) {
		return;
	}
	flagged = true;
	apiFetch.use( ( options, next ) => {
		const target = String( options.path || options.url || '' );
		if ( target.indexOf( '/wc/store/' ) === -1 ) {
			return next( options );
		}
		return next( {
			...options,
			headers: { ...( options.headers || {} ), 'X-SGS-Gift': '1' },
		} );
	} );
}

/**
 * Save the gift value.
 *
 * @param {{on:boolean,to:string,message:string}} value Value to store.
 * @return {Promise<{on:boolean,to:string,message:string,limits:Object}>} Stored value.
 */
export function saveGift( value ) {
	return apiFetch( { path: GIFT_PATH, method: 'POST', data: value } );
}

/**
 * Ask WooCommerce's cart store to read the cart again, so the shipping name
 * pre-fill and the gift data reach the checkout fields.
 */
export function refreshCart() {
	try {
		const actions = dispatch( CART_STORE );
		if ( actions && actions.invalidateResolutionForStoreSelector ) {
			actions.invalidateResolutionForStoreSelector( 'getCartData' );
		}
	} catch ( error ) {
		// The store is WooCommerce's; a failed refresh only delays the pre-fill.
	}
}

/**
 * SGS wishlist store — account-only write actions (FR-30-15, alerts/share).
 *
 * Both are logged-in-only mutations; the caller (the wishlist panel's
 * alerts/share bars) gates visibility on `isLoggedIn()` and the site's
 * enabled features (`window.sgsWishlistData.features`) — these functions
 * just perform the request and keep the shared cache in sync on success.
 *
 * @package
 */
import { apiFetch } from './config';

/**
 * Update the current shopper's alert opt-ins.
 *
 * @param {Object}                             shared  The shared state object (`index.js`).
 * @param {{price?:boolean, stock?:boolean}}    payload Only the keys changing.
 * @return {Promise<{ok:boolean, alerts:Object, status:number}>}
 */
export async function setWishlistAlerts( shared, payload ) {
	const res = await apiFetch( '/wishlist/alerts', { method: 'POST', body: payload } );
	if ( res.ok && res.json?.alerts ) {
		shared.alerts = res.json.alerts;
	}
	return { ok: res.ok, alerts: shared.alerts, status: res.status };
}

/**
 * Update the current shopper's share-link state.
 *
 * @param {Object}                                  shared  The shared state object (`index.js`).
 * @param {{enabled:boolean, regenerate?:boolean}}   payload
 * @return {Promise<{ok:boolean, share:Object, status:number}>}
 */
export async function setWishlistShare( shared, payload ) {
	const res = await apiFetch( '/wishlist/share', { method: 'POST', body: payload } );
	if ( res.ok && res.json?.share ) {
		shared.share = res.json.share;
	}
	return { ok: res.ok, share: shared.share, status: res.status };
}

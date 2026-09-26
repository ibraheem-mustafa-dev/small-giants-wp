/**
 * SGS wishlist store — REST config and request helper.
 *
 * Login state + REST config come from `window.sgsWishlistData`
 * (`{ restUrl, nonce, isLoggedIn, features, savedItemsUrl }`), localised by
 * `includes/wishlist/class-wishlist-rest.php::Wishlist_Rest::enqueue_client_config()`
 * on its own head script handle, so it runs before this module's first paint.
 *
 * @package
 */

/**
 * @return {{restUrl:string,nonce:string,isLoggedIn:boolean,features:Object,savedItemsUrl:string}}
 *   The localised wishlist config.
 */
export function config() {
	return (
		window.sgsWishlistData || {
			restUrl: '/wp-json/',
			nonce: '',
			isLoggedIn: false,
			features: { priceAlerts: false, stockAlerts: false, sharing: false },
			savedItemsUrl: '',
		}
	);
}

/**
 * @return {boolean} Whether the current visitor is logged in.
 */
export function isLoggedIn() {
	return !! config().isLoggedIn;
}

/**
 * Issue a `/sgs/v1/wishlist*` request.
 *
 * @param {string} path             Path under `/sgs/v1`, e.g. "/wishlist".
 * @param {Object} [options]
 * @param {string} [options.method] HTTP method (default GET).
 * @param {Object} [options.body]   JSON-serialisable request body.
 * @return {Promise<{ok:boolean,status:number,json:Object|null}>}
 */
export async function apiFetch( path, { method = 'GET', body } = {} ) {
	const cfg = config();
	const root = String( cfg.restUrl || '/wp-json/' ).replace( /\/$/, '' );
	const headers = { 'Content-Type': 'application/json' };
	if ( cfg.nonce ) {
		headers[ 'X-WP-Nonce' ] = cfg.nonce;
	}
	let response;
	try {
		response = await window.fetch( root + '/sgs/v1' + path, {
			method,
			credentials: 'same-origin',
			headers,
			body: body ? JSON.stringify( body ) : undefined,
		} );
	} catch ( e ) {
		return { ok: false, status: 0, json: null };
	}
	let json = null;
	try {
		json = await response.json();
	} catch ( e ) {
		json = null;
	}
	return { ok: response.ok, status: response.status, json };
}

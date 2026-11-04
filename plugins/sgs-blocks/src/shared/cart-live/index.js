/**
 * Cart live: one page-wide reader of the WooCommerce cart for every SGS block that shows a live cart figure.
 *
 * The instance is a `window` singleton (`window.sgsCartLive`), because every view module is its own bundle and a
 * module-level variable would give each bundle its own listeners and its own fetch. The first bundle to load creates
 * it; every other bundle gets the same object.
 *
 * Sources, all read only:
 *   - `GET /wc/store/v1/cart` for the first reading when the page has no `wc/store/cart` data store
 *   - WooCommerce's `wc-blocks_added_to_cart`, `added_to_cart` and `wc-blocks_removed_from_cart` document events
 *     (each one refetches; bursts are coalesced into one request in flight and one queued)
 *   - the `wc/store/cart` `wp.data` store where the page has it, so the Cart block's own quantity steppers update
 *     listeners with no extra request
 *
 * The published cart has the Store API's snake_case shape: `items`, `items_count`, `totals` (with `total_items`,
 * `total_items_tax`, `currency_*`).
 *
 * @package
 */

const GLOBAL_KEY = 'sgsCartLive';
const STORE_KEY = 'wc/store/cart';
const EVENTS = [
	'wc-blocks_added_to_cart',
	'added_to_cart',
	'wc-blocks_removed_from_cart',
];
// The store is allowed this long to hand over its first reading before the Store API is asked.
const STORE_GRACE_MS = 3000;

/**
 * The Store API base path.
 *
 * @return {string} e.g. "/wp-json/wc/store/v1".
 */
function apiBase() {
	const root =
		window?.wpApiSettings?.root ||
		window?.sgsCartData?.restUrl ||
		window?.sgsWishlistData?.restUrl ||
		'/wp-json';
	return root.replace( /\/$/, '' ) + '/wc/store/v1';
}

/**
 * Turn the `wc/store/cart` store's camelCase keys into the Store API's snake_case ones.
 *
 * @param {Object} source Object with camelCase keys.
 * @return {Object} The same values under snake_case keys.
 */
function snakeKeys( source ) {
	const out = {};
	Object.keys( source || {} ).forEach( ( key ) => {
		out[ key.replace( /[A-Z]/g, ( c ) => '_' + c.toLowerCase() ) ] =
			source[ key ];
	} );
	return out;
}

/**
 * The `wc/store/cart` selectors, or null when the page has no such store.
 *
 * @return {Object|null} The selectors.
 */
function storeSelectors() {
	try {
		return window.wp?.data?.select?.( STORE_KEY ) || null;
	} catch {
		return null;
	}
}

/**
 * Create the page-wide instance.
 *
 * @return {Object} The instance.
 */
function createInstance() {
	const listeners = new Set();
	let cart = null;
	let inFlight = false;
	let queued = false;
	let lastStoreData = null;
	let storeBound = false;

	const publish = ( next ) => {
		cart = next;
		listeners.forEach( ( callback ) => {
			try {
				callback( cart );
			} catch {
				// A listener's failure never stops the others.
			}
		} );
	};

	const fetchCart = async () => {
		if ( inFlight ) {
			queued = true;
			return;
		}
		inFlight = true;
		try {
			const response = await fetch( apiBase() + '/cart', {
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
			} );
			if ( response.ok ) {
				publish( await response.json() );
			}
		} catch {
			// Offline or blocked: listeners keep the last reading.
		} finally {
			inFlight = false;
			if ( queued ) {
				queued = false;
				fetchCart();
			}
		}
	};

	const readStore = () => {
		const selectors = storeSelectors();
		if ( ! selectors || 'function' !== typeof selectors.getCartData ) {
			return;
		}
		if (
			'function' === typeof selectors.hasFinishedResolution &&
			! selectors.hasFinishedResolution( 'getCartData' )
		) {
			return;
		}
		const data = selectors.getCartData();
		if ( ! data || data === lastStoreData ) {
			return;
		}
		lastStoreData = data;
		publish( {
			items: Array.isArray( data.items ) ? data.items : [],
			items_count: Number( data.itemsCount ?? 0 ),
			totals: snakeKeys( data.totals ),
		} );
	};

	const bindStore = () => {
		if ( storeBound || ! storeSelectors() ) {
			return false;
		}
		storeBound = true;
		window.wp.data.subscribe( readStore, STORE_KEY );
		readStore();
		return true;
	};

	const start = () => {
		EVENTS.forEach( ( name ) =>
			document.addEventListener( name, fetchCart )
		);
		if ( bindStore() ) {
			// The store fetches (or is hydrated with) the cart itself; the Store API is asked only if it never does.
			window.setTimeout( () => {
				if ( null === cart ) {
					fetchCart();
				}
			}, STORE_GRACE_MS );
			return;
		}
		fetchCart();
	};

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', start, { once: true } );
	} else {
		start();
	}

	return {
		version: 1,
		onCartChange( callback ) {
			listeners.add( callback );
			if ( null !== cart ) {
				callback( cart );
			}
			return () => listeners.delete( callback );
		},
		getCart: () => cart,
		refresh: fetchCart,
	};
}

/**
 * The page-wide instance, created on first use.
 *
 * @return {Object} The instance.
 */
function instance() {
	if ( ! window[ GLOBAL_KEY ] ) {
		window[ GLOBAL_KEY ] = createInstance();
	}
	return window[ GLOBAL_KEY ];
}

/**
 * Call back with the cart now (when known) and after every change.
 *
 * @param {Function} callback Receives the cart in the Store API's snake_case shape.
 * @return {Function} Call it to stop listening.
 */
export function onCartChange( callback ) {
	return instance().onCartChange( callback );
}

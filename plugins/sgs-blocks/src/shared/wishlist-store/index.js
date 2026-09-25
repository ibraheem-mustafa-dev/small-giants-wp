/**
 * SGS wishlist store (`sgs/wishlist`) — shared guest/logged-in state.
 *
 * Module id `@sgs/wishlist-store` (Wave 3C U-12 §E). Was
 * `src/blocks/product-card/wishlist.js`; moved here so `sgs/wishlist-link`,
 * `sgs/wishlist-panel` and the `sgs/cart` flyout's Save-for-later button can
 * share the SAME saved-ids state as the product-card heart, instead of each
 * re-deriving it. The Interactivity namespace stays `sgs/wishlist` — the
 * existing server-rendered heart markup
 * (`includes/product-card-live-fill.php::sgs_product_card_wishlist_markup`)
 * is untouched and keeps working unchanged.
 *
 * Two tiers (Bean, 2026-09-25):
 *   - GUEST:     ids live in `localStorage` (`sgs-wishlist`, a JSON array of
 *                product IDs — the pre-existing shape, kept for backwards
 *                compatibility with any already-saved guest list).
 *   - LOGGED IN: ids live server-side (`GET/POST /sgs/v1/wishlist*`,
 *                `includes/class-sgs-wishlist-rest.php`). On the FIRST
 *                logged-in load with a non-empty guest list, the guest ids
 *                are merged into the account (`POST /wishlist/merge`) and
 *                the guest key is cleared — a device's guest saves survive
 *                signing in exactly once, then the account is authoritative.
 *
 * Login state + REST config come from `window.sgsWishlistData`
 * (`{ restUrl, nonce, isLoggedIn }`), localised by
 * `Sgs_Wishlist_Rest::enqueue_client_config()` on `wp-api-request` — the
 * SAME classic-script handle `includes/wc-cart-fragments.php` already uses
 * for `window.sgsCartData`/`window.__sgsCartConfig`, so it is guaranteed to
 * run before this module's first paint. No product-card-live-fill.php
 * markup change was needed or made.
 *
 * Cross-tab sync: every state change (guest OR logged-in) bumps a
 * `sgs-wishlist-signal` localStorage key. Other tabs' `storage` listeners
 * re-resolve state from that signal — this covers logged-in accounts too
 * (their ids are NOT the guest key, so guest id storage never doubles as
 * the account's cache). Same-tab listeners use the pre-existing
 * `sgs-wishlist-change` CustomEvent.
 */
import { store, getContext } from '@wordpress/interactivity';

const STORAGE_KEY = 'sgs-wishlist';
const SIGNAL_KEY = 'sgs-wishlist-signal';
export const WISHLIST_CHANGE_EVENT = 'sgs-wishlist-change';

/**
 * Page-wide state, shared by every bundled copy of this module. The product
 * card, the header link, the saved-items panel and the cart flyout each
 * import this file by relative path, so each view bundle carries its own
 * copy; keeping the id cache and the start-up promise on one window object
 * means they all read one cache and run one start-up (one merge request).
 *
 * @type {{ids: number[], shared.initPromise: Promise<number[]>|null}}
 */
const shared = ( window.sgsWishlistShared = window.sgsWishlistShared || {
	ids: [],
	initPromise: null,
} );

/**
 * @return {{restUrl:string,nonce:string,isLoggedIn:boolean}} The localised wishlist config.
 */
function config() {
	return (
		window.sgsWishlistData || { restUrl: '/wp-json/', nonce: '', isLoggedIn: false }
	);
}

/**
 * @return {boolean} Whether the current visitor is logged in.
 */
function isLoggedIn() {
	return !! config().isLoggedIn;
}

/**
 * Read the guest wishlist from localStorage. Storage can be blocked (private
 * mode, site data off); the wishlist then starts empty.
 *
 * @return {number[]} Saved product IDs.
 */
function readGuestIds() {
	try {
		const parsed = JSON.parse( window.localStorage.getItem( STORAGE_KEY ) || '[]' );
		return Array.isArray( parsed )
			? parsed.map( Number ).filter( ( id ) => id > 0 )
			: [];
	} catch ( e ) {
		return [];
	}
}

/**
 * Write the guest wishlist to localStorage.
 *
 * @param {number[]} ids Product IDs to keep.
 */
function writeGuestIds( ids ) {
	try {
		window.localStorage.setItem( STORAGE_KEY, JSON.stringify( ids ) );
	} catch ( e ) {
		// Storage blocked: the toggle still shows for this page view.
	}
}

/**
 * Bump the cross-tab signal key so other tabs' `storage` listeners fire.
 */
function bumpSignal() {
	try {
		window.localStorage.setItem( SIGNAL_KEY, String( Date.now() ) );
	} catch ( e ) {
		// Storage blocked — same-tab sync (the CustomEvent below) still works.
	}
}

/**
 * Tell every heart/badge/panel on THIS page, then every other tab.
 *
 * @param {number[]} ids The fresh id list.
 */
function broadcast( ids ) {
	window.dispatchEvent(
		new window.CustomEvent( WISHLIST_CHANGE_EVENT, { detail: { ids } } )
	);
	bumpSignal();
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
async function apiFetch( path, { method = 'GET', body } = {} ) {
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

/**
 * Resolve the wishlist's current ids, merging a non-empty guest list into a
 * logged-in account on the first call after login. Safe to call repeatedly —
 * subsequent calls reuse the same in-flight/resolved promise.
 *
 * @return {Promise<number[]>} The resolved id list.
 */
export function ensureWishlistReady() {
	if ( shared.initPromise ) {
		return shared.initPromise;
	}
	shared.initPromise = ( async () => {
		if ( isLoggedIn() ) {
			const guestIds = readGuestIds();
			if ( guestIds.length > 0 ) {
				const merged = await apiFetch( '/wishlist/merge', {
					method: 'POST',
					body: { ids: guestIds },
				} );
				shared.ids =
					merged.ok && Array.isArray( merged.json?.items )
						? merged.json.items.map( ( item ) => Number( item.id ) )
						: guestIds;
				try {
					window.localStorage.removeItem( STORAGE_KEY );
				} catch ( e ) {
					// Non-fatal — the merge already happened server-side.
				}
			} else {
				const res = await apiFetch( '/wishlist' );
				shared.ids =
					res.ok && Array.isArray( res.json?.items )
						? res.json.items.map( ( item ) => Number( item.id ) )
						: [];
			}
		} else {
			shared.ids = readGuestIds();
		}
		return shared.ids;
	} )();
	return shared.initPromise;
}

/**
 * The last-resolved id list. Call {@link ensureWishlistReady} first (or use
 * one of the mutators below, which await it internally) — before that
 * resolves this returns `[]`.
 *
 * @return {number[]}
 */
export function getWishlistIds() {
	return shared.ids.slice();
}

/**
 * Subscribe to wishlist changes made anywhere on the page (or, via the
 * cross-tab signal, another tab).
 *
 * @param {Function} callback Called with the fresh id array.
 * @return {Function} Unsubscribe.
 */
export function onWishlistChange( callback ) {
	const onChange = ( event ) => callback( event.detail.ids.slice() );
	const onStorage = ( event ) => {
		if ( event.key !== SIGNAL_KEY && event.key !== STORAGE_KEY ) {
			return;
		}
		// Another tab changed state. Re-resolve: a guest list re-reads
		// localStorage directly; a logged-in account re-fetches (the merge
		// promise above is per-page-load, so a fresh GET is the correct
		// re-sync here, not a second merge attempt).
		shared.initPromise = null;
		ensureWishlistReady().then( callback );
	};
	window.addEventListener( WISHLIST_CHANGE_EVENT, onChange );
	window.addEventListener( 'storage', onStorage );
	return () => {
		window.removeEventListener( WISHLIST_CHANGE_EVENT, onChange );
		window.removeEventListener( 'storage', onStorage );
	};
}

/**
 * Toggle a product in/out of the wishlist.
 *
 * @param {number} id The product id.
 * @return {Promise<{ok:boolean,saved:boolean,status:number}>}
 */
export async function toggleWishlistId( id ) {
	await ensureWishlistReady();
	const has = shared.ids.includes( id );

	if ( isLoggedIn() ) {
		const res = await apiFetch( '/wishlist/toggle', {
			method: 'POST',
			body: { productId: id },
		} );
		if ( ! res.ok ) {
			// 409 (200-item cap) or a network/validation failure: no local
			// mutation, so the heart reverts to its last-known state.
			return { ok: false, saved: has, status: res.status };
		}
		shared.ids = Array.isArray( res.json?.items )
			? res.json.items.map( ( item ) => Number( item.id ) )
			: shared.ids;
		broadcast( shared.ids );
		return { ok: true, saved: !! res.json?.saved, status: res.status };
	}

	const next = has ? shared.ids.filter( ( x ) => x !== id ) : [ ...shared.ids, id ];
	shared.ids = next;
	writeGuestIds( next );
	broadcast( next );
	return { ok: true, saved: ! has, status: 0 };
}

/**
 * Add a product to the wishlist (idempotent — never removes). Used by
 * "Save for later" flows, where the intent is always "add", not "toggle"
 * (a toggle would incorrectly remove an item the shopper had already saved).
 *
 * @param {number} id The product id.
 * @return {Promise<{ok:boolean,saved:boolean,status:number}>}
 */
export async function addWishlistId( id ) {
	await ensureWishlistReady();
	if ( shared.ids.includes( id ) ) {
		return { ok: true, saved: true, status: 0 };
	}
	return toggleWishlistId( id );
}

store( 'sgs/wishlist', {
	actions: {
		/**
		 * Generator action (the Interactivity API awaits yielded promises) —
		 * a heart click now round-trips the REST API when logged in.
		 *
		 * @param {Event} event The click event on the heart button.
		 */
		*toggle( event ) {
			event.preventDefault();
			event.stopPropagation();
			const context = getContext();
			const result = yield toggleWishlistId( context.id );
			context.saved = result.saved;
		},
	},
	callbacks: {
		sync() {
			const context = getContext();
			let unsubscribe = null;

			const refresh = async () => {
				const ids = await ensureWishlistReady();
				context.saved = ids.includes( context.id );
			};

			refresh();
			unsubscribe = onWishlistChange( ( ids ) => {
				context.saved = ids.includes( context.id );
			} );

			return () => {
				if ( unsubscribe ) {
					unsubscribe();
				}
			};
		},
	},
} );

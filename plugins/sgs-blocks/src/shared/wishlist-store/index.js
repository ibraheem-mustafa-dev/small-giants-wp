/**
 * SGS wishlist store (`sgs/wishlist`) — shared guest/logged-in state.
 *
 * Module id `@sgs/wishlist-store` (Wave 3C U-12 §E). Shared by
 * `sgs/wishlist-link`, `sgs/wishlist-panel` and the `sgs/cart` flyout's
 * Save-for-later button, so they all read the SAME saved-ids state instead
 * of each re-deriving it. The Interactivity namespace stays `sgs/wishlist`
 * — the existing server-rendered heart markup
 * (`includes/product-card-live-fill.php::sgs_product_card_wishlist_markup`)
 * is untouched and keeps working unchanged.
 *
 * Split across five files (FR-30-14/15 build) so every wishlist-store file
 * stays under the project's 250-line JS ceiling: `config.js` (REST client),
 * `local-state.js` (guest ids + cross-tab signal), `prices.js` (guest
 * saved-price cache), `account-state.js` (saved-price + alerts/share
 * readers) and this file (the public API + the Interactivity store).
 *
 * Two tiers (Bean, 2026-09-25):
 *   - GUEST:     ids in `localStorage`; saved prices in a parallel
 *                `localStorage` key (`prices.js`); no alerts, no sharing.
 *   - LOGGED IN: ids, saved prices, alert opt-ins and the share link all
 *                live server-side (`GET/POST /sgs/v1/wishlist*`). On the
 *                FIRST logged-in load with a non-empty guest list, the
 *                guest ids are merged into the account and the guest keys
 *                are cleared — a device's guest saves survive signing in
 *                exactly once, then the account is authoritative.
 *
 * Page-wide shared state lives on `window.sgsWishlistShared` (`{ids, items,
 * alerts, share, initPromise}`) — every bundled copy of this module (product
 * card, header link, saved-items panel, cart flyout) imports this file by
 * relative path, so each view bundle carries its own copy; keeping the cache
 * on one window object means they all read one cache and run one start-up
 * (one merge request). `items` carries the full `_sgs_wishlist` entries
 * (`{id, addedTs, savedPrice, currency, alertPrice, inStock}`) for the
 * logged-in tier only — read via `getSavedPrices()`/`getAccountState()`
 * (`account-state.js`), never directly.
 */
import { store, getContext } from '@wordpress/interactivity';
import { config, isLoggedIn, apiFetch } from './config';
import {
	WISHLIST_CHANGE_EVENT,
	STORAGE_KEY,
	SIGNAL_KEY,
	writeGuestIds,
	broadcast,
} from './local-state';
import { resolveWishlistState } from './ensure-ready';
import { recordGuestPriceOnAdd, removeGuestPrice } from './prices';
import {
	setWishlistAlerts as setWishlistAlertsAction,
	setWishlistShare as setWishlistShareAction,
} from './account-actions';

export { getSavedPrices, getAccountState } from './account-state';

/** @type {{ids:number[], items:Array, alerts:Object, share:Object, initPromise:Promise|null}} */
const shared = ( window.sgsWishlistShared = window.sgsWishlistShared || {
	ids: [],
	items: [],
	alerts: { price: false, stock: false },
	share: { enabled: false, url: '' },
	initPromise: null,
} );

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
	shared.initPromise = resolveWishlistState( shared );
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
		if ( Array.isArray( res.json?.items ) ) {
			shared.items = res.json.items;
			shared.ids = res.json.items.map( ( item ) => Number( item.id ) );
		}
		broadcast( shared.ids );
		return { ok: true, saved: !! res.json?.saved, status: res.status };
	}

	const next = has ? shared.ids.filter( ( x ) => x !== id ) : [ ...shared.ids, id ];
	shared.ids = next;
	writeGuestIds( next );
	if ( has ) {
		removeGuestPrice( id );
	} else {
		recordGuestPriceOnAdd( id ); // Fire-and-forget — never blocks the toggle.
	}
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

/**
 * Update the current shopper's alert opt-ins (logged in only — the caller
 * gates visibility on `isLoggedIn`/the site's enabled features).
 *
 * @param {{price?:boolean, stock?:boolean}} payload Only the keys changing.
 * @return {Promise<{ok:boolean, alerts:Object, status:number}>}
 */
export function setWishlistAlerts( payload ) {
	return setWishlistAlertsAction( shared, payload );
}

/**
 * Update the current shopper's share-link state (logged in only).
 *
 * @param {{enabled:boolean, regenerate?:boolean}} payload
 * @return {Promise<{ok:boolean, share:Object, status:number}>}
 */
export function setWishlistShare( payload ) {
	return setWishlistShareAction( shared, payload );
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

// `config` is re-exported for the panel's alerts/share bars, which need
// `sgsWishlistData.features`/`savedItemsUrl` without duplicating the window
// read `config.js` already centralises.
export { config };

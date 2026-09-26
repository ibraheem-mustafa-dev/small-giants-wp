/**
 * SGS wishlist store — first-load resolution (guest read, or logged-in
 * fetch/merge).
 *
 * Split out of `index.js` (Wave 3C FR-30-14/15) so every wishlist-store file
 * stays under the project's 250-line JS ceiling.
 *
 * @package
 */
import { isLoggedIn, apiFetch } from './config';
import { STORAGE_KEY, readGuestIds } from './local-state';

/**
 * Resolve the wishlist's current state into `shared`, merging a non-empty
 * guest list into a logged-in account on the first call after login.
 *
 * @param {Object} shared The shared state object (`index.js`).
 * @return {Promise<number[]>} The resolved id list.
 */
export async function resolveWishlistState( shared ) {
	if ( ! isLoggedIn() ) {
		shared.ids = readGuestIds();
		return shared.ids;
	}

	const guestIds = readGuestIds();
	if ( guestIds.length > 0 ) {
		const merged = await apiFetch( '/wishlist/merge', {
			method: 'POST',
			body: { ids: guestIds },
		} );
		if ( merged.ok && Array.isArray( merged.json?.items ) ) {
			shared.items = merged.json.items;
			shared.ids = merged.json.items.map( ( item ) => Number( item.id ) );
		} else {
			shared.ids = guestIds;
		}
		try {
			window.localStorage.removeItem( STORAGE_KEY );
		} catch ( e ) {
			// Non-fatal — the merge already happened server-side.
		}
		// The merge response carries only `{items}` (Bean's contract) — one
		// follow-up GET picks up alerts/share so the panel's bars are correct
		// on this same page load, not just next visit.
		const after = await apiFetch( '/wishlist' );
		if ( after.ok ) {
			shared.alerts = after.json?.alerts || shared.alerts;
			shared.share = after.json?.share || shared.share;
		}
		return shared.ids;
	}

	const res = await apiFetch( '/wishlist' );
	if ( res.ok && Array.isArray( res.json?.items ) ) {
		shared.items = res.json.items;
		shared.ids = res.json.items.map( ( item ) => Number( item.id ) );
		shared.alerts = res.json.alerts || shared.alerts;
		shared.share = res.json.share || shared.share;
	} else {
		shared.items = [];
		shared.ids = [];
	}
	return shared.ids;
}

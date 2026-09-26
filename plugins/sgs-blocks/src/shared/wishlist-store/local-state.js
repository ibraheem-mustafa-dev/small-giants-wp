/**
 * SGS wishlist store — guest id storage and cross-tab signalling.
 *
 * GUEST ids live in `localStorage` (`sgs-wishlist`, a JSON array of product
 * IDs — the pre-existing shape, kept for backwards compatibility with any
 * already-saved guest list). Every state change (guest OR logged-in) bumps
 * a `sgs-wishlist-signal` localStorage key so other tabs' `storage`
 * listeners can re-resolve state; same-tab listeners use the
 * `sgs-wishlist-change` CustomEvent.
 *
 * Split out of `index.js` (Wave 3C FR-30-14/15) so every wishlist-store file
 * stays under the project's 250-line JS ceiling.
 *
 * @package
 */

export const STORAGE_KEY = 'sgs-wishlist';
export const SIGNAL_KEY = 'sgs-wishlist-signal';
export const WISHLIST_CHANGE_EVENT = 'sgs-wishlist-change';

/**
 * Read the guest wishlist from localStorage. Storage can be blocked (private
 * mode, site data off); the wishlist then starts empty.
 *
 * @return {number[]} Saved product IDs.
 */
export function readGuestIds() {
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
export function writeGuestIds( ids ) {
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
export function broadcast( ids ) {
	window.dispatchEvent(
		new window.CustomEvent( WISHLIST_CHANGE_EVENT, { detail: { ids } } )
	);
	bumpSignal();
}

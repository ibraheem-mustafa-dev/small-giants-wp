/**
 * SGS wishlist store (`sgs/wishlist`): the heart button on product cards.
 *
 * The visitor's saved product IDs are kept in their browser (localStorage key
 * `sgs-wishlist`, a JSON array of numbers). Every heart for the same product
 * stays in step: a toggle broadcasts `sgs-wishlist-change` on the window, and
 * the `storage` event carries changes made in other tabs.
 *
 * Markup (includes/product-card-live-fill.php::sgs_product_card_wishlist_markup):
 * a button with its own data-wp-interactive="sgs/wishlist" region and a
 * server-seeded context { id, saved: false }; aria-pressed binds to
 * context.saved, which callbacks.sync sets from storage on load.
 */
import { store, getContext } from '@wordpress/interactivity';

const STORAGE_KEY = 'sgs-wishlist';
const CHANGE_EVENT = 'sgs-wishlist-change';

/**
 * Read the saved product IDs. Storage can be blocked (private mode, site
 * data off); the wishlist then starts empty.
 *
 * @return {number[]} Saved product IDs.
 */
function readIds() {
	try {
		const parsed = JSON.parse(
			window.localStorage.getItem( STORAGE_KEY ) || '[]'
		);
		return Array.isArray( parsed )
			? parsed.map( Number ).filter( ( id ) => id > 0 )
			: [];
	} catch ( e ) {
		return [];
	}
}

/**
 * Save the product IDs and tell every heart on the page.
 *
 * @param {number[]} ids Product IDs to keep.
 */
function writeIds( ids ) {
	try {
		window.localStorage.setItem( STORAGE_KEY, JSON.stringify( ids ) );
	} catch ( e ) {
		// Storage blocked: the toggle still shows for this page view.
	}
	window.dispatchEvent(
		new window.CustomEvent( CHANGE_EVENT, { detail: { ids } } )
	);
}

store( 'sgs/wishlist', {
	actions: {
		toggle( event ) {
			event.preventDefault();
			event.stopPropagation();
			const context = getContext();
			const ids = readIds();
			const index = ids.indexOf( context.id );
			if ( index > -1 ) {
				ids.splice( index, 1 );
			} else {
				ids.push( context.id );
			}
			context.saved = index === -1;
			writeIds( ids );
		},
	},
	callbacks: {
		sync() {
			const context = getContext();
			const refresh = () => {
				context.saved = readIds().includes( context.id );
			};
			const onStorage = ( event ) => {
				if ( event.key === STORAGE_KEY ) {
					refresh();
				}
			};
			refresh();
			window.addEventListener( CHANGE_EVENT, refresh );
			window.addEventListener( 'storage', onStorage );
			return () => {
				window.removeEventListener( CHANGE_EVENT, refresh );
				window.removeEventListener( 'storage', onStorage );
			};
		},
	},
} );

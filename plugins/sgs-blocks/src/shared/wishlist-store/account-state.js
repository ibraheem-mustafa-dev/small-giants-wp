/**
 * SGS wishlist store — saved-price and account-state readers (FR-30-14/15).
 *
 * Both tiers keep "the price when it was saved" so the wishlist panel's
 * price-drop line can compare it with the current Store API price:
 * logged-in shoppers get it from their `_sgs_wishlist` entry (kept on
 * `window.sgsWishlistShared.items` by `index.js` on every fetch/toggle/
 * merge); guests keep the parallel browser-only cache in `./prices.js`.
 * Alert opt-ins and the share link (both logged-in only) come from the same
 * `GET /wishlist` response, also kept on the shared object.
 *
 * @package
 */
import { isLoggedIn } from './config';
import { readGuestPrices } from './prices';

/**
 * @return {{ids?:number[], items?:Array, alerts?:Object, share?:Object}}
 */
function shared() {
	return window.sgsWishlistShared || {};
}

/**
 * The saved price for every item on the current visitor's wishlist, for
 * BOTH tiers.
 *
 * @return {Object<number,{savedPrice:number|null,currency:string,addedTs:number|null}>}
 */
export function getSavedPrices() {
	const map = {};

	if ( isLoggedIn() ) {
		( shared().items || [] ).forEach( ( entry ) => {
			const id = Number( entry?.id ) || 0;
			if ( id <= 0 ) {
				return;
			}
			map[ id ] = {
				savedPrice:
					null === entry.savedPrice || undefined === entry.savedPrice
						? null
						: Number( entry.savedPrice ),
				currency: String( entry.currency || '' ),
				addedTs:
					null === entry.addedTs || undefined === entry.addedTs
						? null
						: Number( entry.addedTs ),
			};
		} );
		return map;
	}

	const guestPrices = readGuestPrices();
	Object.keys( guestPrices ).forEach( ( key ) => {
		const id = Number( key );
		if ( id <= 0 ) {
			return;
		}
		const record = guestPrices[ key ] || {};
		const savedPrice = Number( record.p );
		map[ id ] = {
			savedPrice: Number.isFinite( savedPrice ) ? savedPrice : null,
			currency: String( record.c || '' ),
			addedTs: null,
		};
	} );
	return map;
}

/**
 * The logged-in shopper's alert opt-ins and share-link state. Always
 * `false`/empty for a guest — both are account-only features.
 *
 * @return {{alerts:{price:boolean,stock:boolean}, share:{enabled:boolean,url:string}}}
 */
export function getAccountState() {
	const state = shared();
	return {
		alerts: {
			price: !! state.alerts?.price,
			stock: !! state.alerts?.stock,
		},
		share: {
			enabled: !! state.share?.enabled,
			url: String( state.share?.url || '' ),
		},
	};
}

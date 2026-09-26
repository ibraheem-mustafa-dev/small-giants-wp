/**
 * SGS wishlist store — guest saved-price cache (FR-30-15).
 *
 * Guests keep no server-side wishlist entry, so the price-drop line needs
 * its own browser-only record of "the price when this was saved"
 * (`sgs-wishlist-prices`, a JSON object keyed by product id: `{p, c}` — the
 * price in minor units and the currency code, the same basis the Store API
 * and the logged-in `_sgs_wishlist` entry's `savedPrice`/`currency` use).
 * Written when a product is ADDED to the guest wishlist (never on toggle-off
 * — see `removeGuestPrice`), removed when it leaves. The price is always
 * fetched live from the Store API, never trusted from a caller's in-memory
 * value — the same server-truth rule the logged-in entry follows.
 *
 * @package
 */
import { fetchProducts } from '../../blocks/cart/store-api';

const PRICES_KEY = 'sgs-wishlist-prices';

/**
 * @return {Object<string,{p:number,c:string}>} The guest price cache.
 */
export function readGuestPrices() {
	try {
		const parsed = JSON.parse( window.localStorage.getItem( PRICES_KEY ) || '{}' );
		return parsed && 'object' === typeof parsed && ! Array.isArray( parsed ) ? parsed : {};
	} catch ( e ) {
		return {};
	}
}

/**
 * @param {Object} prices The full cache to persist.
 */
function writeGuestPrices( prices ) {
	try {
		window.localStorage.setItem( PRICES_KEY, JSON.stringify( prices ) );
	} catch ( e ) {
		// Storage blocked — the price-drop line simply has no baseline.
	}
}

/**
 * Record a product's current price as "the price when it was saved".
 *
 * @param {number} id The product id just added to the guest wishlist.
 */
export async function recordGuestPriceOnAdd( id ) {
	try {
		const [ product ] = await fetchProducts( [ id ] );
		if ( ! product || ! product.prices ) {
			return;
		}
		const prices = readGuestPrices();
		prices[ String( id ) ] = {
			p: Number( product.prices.price ),
			c: String( product.prices.currency_code || '' ),
		};
		writeGuestPrices( prices );
	} catch ( e ) {
		// Network failure — non-fatal, the row just shows no price-drop baseline.
	}
}

/**
 * Remove a product's saved-price record (it left the guest wishlist).
 *
 * @param {number} id The product id.
 */
export function removeGuestPrice( id ) {
	const prices = readGuestPrices();
	if ( Object.prototype.hasOwnProperty.call( prices, String( id ) ) ) {
		delete prices[ String( id ) ];
		writeGuestPrices( prices );
	}
}

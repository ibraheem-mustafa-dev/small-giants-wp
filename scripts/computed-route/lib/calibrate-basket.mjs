// A fixture's `basket` (calibration-fixtures.json): a WooCommerce basket line some of a block's settings need to paint.
// sgs/cart hides its panel footer (subtotal, checkout and view-cart buttons) while the basket is empty
// (src/blocks/cart/panel-render.js::renderEmpty) and shows its empty state only then, so a cart block is read twice:
// once with the basket empty, once holding the line. Each instance keeps the pass in which its marker shows
// (pickPass): an empty-state setting from the first, a footer setting from the second.
// basket: { id: <product id, after the fixture's tokens resolve>, quantity?, variation?: { taxonomy: term slug } }.
// The basket is filled and emptied through the Store API from inside the calibration page, the same requests the cart
// block makes (src/blocks/cart/store-api.js): reads need no nonce, writes carry the `Nonce` header the API returns.
import { WIDTHS } from './calibrate-props.mjs';

// The add-item body for a basket line.
export function addItemBody( basket ) {
	return {
		id: Number( basket.id ),
		quantity: Number( basket.quantity ) > 0 ? Number( basket.quantity ) : 1,
		...( basket.variation ? { variation: Object.entries( basket.variation ).map( ( [ attribute, value ] ) => ( { attribute, value } ) ) } : {} ),
	};
}

// In-page: empties the basket, then adds `body` when given. Returns the line count after, or { error }.
export async function setBasketInPage( [ root, body ] ) {
	const call = async ( method, path, nonce, data ) => {
		const r = await fetch( root + path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...( nonce ? { Nonce: nonce } : {} ) }, body: data ? JSON.stringify( data ) : undefined } );
		const json = await r.json().catch( () => null );
		return { ok: r.ok, status: r.status, nonce: r.headers.get( 'Nonce' ), json };
	};
	let res = await call( 'GET', '/cart' );
	if ( ! res.ok ) {
		return { error: `GET /cart returned ${ res.status }` };
	}
	if ( res.json?.items?.length ) {
		res = await call( 'DELETE', '/cart/items', res.nonce );
		if ( ! res.ok ) {
			return { error: `emptying the basket returned ${ res.status }` };
		}
		res = await call( 'GET', '/cart' );
	}
	if ( body ) {
		res = await call( 'POST', '/cart/add-item', res.nonce, body );
		if ( ! res.ok ) {
			return { error: `adding product ${ body.id } returned ${ res.status }: ${ res.json?.message || '' }` };
		}
	}
	return { items: res.json?.items?.length ?? 0 };
}

// Fills (basket given) or empties (null) the basket for the site at `siteUrl`, from a page on that site. Throws on a
// failed request or a basket that did not take the line.
export async function setBasket( page, siteUrl, basket ) {
	const site = String( siteUrl ).replace( /\/$/, '' );
	const root = `${ site }/wp-json/wc/store/v1`;
	// The requests carry the page's cookies only from a page on the site itself.
	if ( ! page.url().startsWith( site ) ) {
		await page.goto( site, { waitUntil: 'domcontentloaded' } );
	}
	const out = await page.evaluate( setBasketInPage, [ root, basket ? addItemBody( basket ) : null ] );
	if ( out.error ) {
		throw new Error( `basket: ${ out.error }` );
	}
	if ( basket ? out.items < 1 : out.items > 0 ) {
		throw new Error( `basket: ${ out.items } line(s) after ${ basket ? 'adding the fixture line' : 'emptying it' }` );
	}
	return out.items;
}

// Whether instance n's marker shows against default d in a read pass (any element or property differing at any width).
export function markerShows( reads, n, d ) {
	return WIDTHS.some( ( w ) => JSON.stringify( reads[ w ]?.[ n ] ?? null ) !== JSON.stringify( reads[ w ]?.[ d ] ?? null ) );
}

// The read pass instance n keeps: the empty-basket pass when its marker shows there, else the full-basket pass when it
// shows there, else the empty-basket pass. A state instance read under its trigger counts only when the trigger worked.
export function pickPass( passes, n, d ) {
	const [ first, second ] = passes;
	if ( ! second ) {
		return first;
	}
	const shows = ( r ) => ! r.hoverMissed.includes( n ) && markerShows( r, n, d );
	if ( shows( first ) ) {
		return first;
	}
	return shows( second ) ? second : first;
}

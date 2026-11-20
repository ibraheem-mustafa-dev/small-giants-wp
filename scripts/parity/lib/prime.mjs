// The walker's live-side priming (config field `live.prime`): before the live page's first load, each entry is sent in order in
// the live page's own browser context, so the session the surface needs exists when it loads (a WooCommerce checkout shows its
// form only for a basket holding a product). An entry is a URL, loaded as a page, or { url, form }, posted as that form through
// the context's own request client, which shares the page's cookies (a product whose picks the shop reads from posted fields
// only). A relative URL is resolved against the live url's origin. A posted form holding an `add-to-cart` field is
// confirmed by the basket the Store API reads back (WooCommerce answers a refused add-to-cart with 200 and a notice). Never sent for the
// draft side. The context is discarded
// after the walk, so the basket it fills needs no clearing.
export function primeTargets( prime, liveUrl ) {
	const origin = new URL( liveUrl ).origin;
	return ( Array.isArray( prime ) ? prime : [] ).map( ( p ) => ( 'string' === typeof p ? { url: new URL( p, origin ).href, form: null } : { url: new URL( String( p?.url ?? '' ), origin ).href, form: p?.form ?? null } ) );
}

// Throws unless the live basket holds an item, read back through WooCommerce's Store API at the live origin (`?rest_route=` works
// under plain permalinks too). WooCommerce answers a refused add-to-cart with 200 and a notice, so the post's status proves nothing.
async function assertBasketHolds( page, liveUrl, from ) {
	const r = await page.request.get( new URL( '/?rest_route=/wc/store/v1/cart', new URL( liveUrl ).origin ).href );
	if ( r.status() >= 400 ) {
		throw new Error( `live.prime: the basket after posting to ${ from } could not be read (the Store API answered ${ r.status() })` );
	}
	const cart = await r.json();
	if ( ! ( Number( cart?.items_count ) > 0 || ( Array.isArray( cart?.items ) && cart.items.length > 0 ) ) ) {
		throw new Error( `live.prime: posting to ${ from } answered ok but the basket holds no item (the shop refused the product)` );
	}
}

// Sends each prime entry; throws when a posted form is answered with an error status, and when a posted add-to-cart form leaves
// the basket empty, so a walk never reads an unprimed page as the surface.
export async function primeLive( page, prime, liveUrl ) {
	for ( const t of primeTargets( prime, liveUrl ) ) {
		if ( t.form ) {
			const r = await page.request.post( t.url, { form: t.form } );
			if ( r.status() >= 400 ) {
				throw new Error( `live.prime: posting to ${ t.url } answered ${ r.status() }` );
			}
			'add-to-cart' in t.form && await assertBasketHolds( page, liveUrl, t.url );
		} else {
			await page.goto( t.url, { waitUntil: 'load' } );
		}
	}
}

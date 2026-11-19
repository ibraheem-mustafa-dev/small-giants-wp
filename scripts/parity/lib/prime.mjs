// The walker's live-side priming (config field `live.prime`): before the live page's first load, each entry is sent in order in
// the live page's own browser context, so the session the surface needs exists when it loads (a WooCommerce checkout shows its
// form only for a basket holding a product). An entry is a URL, loaded as a page, or { url, form }, posted as that form through
// the context's own request client, which shares the page's cookies (a product whose picks the shop reads from posted fields
// only). A relative URL is resolved against the live url's origin. Never sent for the draft side. The context is discarded
// after the walk, so the basket it fills needs no clearing.
export function primeTargets( prime, liveUrl ) {
	const origin = new URL( liveUrl ).origin;
	return ( Array.isArray( prime ) ? prime : [] ).map( ( p ) => ( 'string' === typeof p ? { url: new URL( p, origin ).href, form: null } : { url: new URL( String( p?.url ?? '' ), origin ).href, form: p?.form ?? null } ) );
}

// Sends each prime entry; throws when a posted form is answered with an error status, so a walk never reads an unprimed page as
// the surface.
export async function primeLive( page, prime, liveUrl ) {
	for ( const t of primeTargets( prime, liveUrl ) ) {
		if ( t.form ) {
			const r = await page.request.post( t.url, { form: t.form } );
			if ( r.status() >= 400 ) {
				throw new Error( `live.prime: posting to ${ t.url } answered ${ r.status() }` );
			}
		} else {
			await page.goto( t.url, { waitUntil: 'load' } );
		}
	}
}

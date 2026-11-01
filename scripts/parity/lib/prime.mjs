// The walker's live-side priming (config field `live.prime`, scripts/parity/README.md): each URL is visited, in order and in the
// live page's own browser context, before the live page's first load, so the session the surface needs exists when it loads (a
// WooCommerce checkout shows its form only for a basket holding a product). Absolute URLs are used as given; a relative one is
// resolved against the live url's origin. Never called for the draft side. The context is discarded after the walk, so the
// basket it fills needs no clearing.
export function primeTargets( prime, liveUrl ) {
	return ( Array.isArray( prime ) ? prime : [] ).map( ( u ) => new URL( String( u ), new URL( liveUrl ).origin ).href );
}

export async function primeLive( page, prime, liveUrl ) {
	for ( const url of primeTargets( prime, liveUrl ) ) {
		await page.goto( url, { waitUntil: 'load' } );
	}
}

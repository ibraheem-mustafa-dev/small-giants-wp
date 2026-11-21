// What differs between two copies of one site, or two loads of one page, without changing what renders: the copy's
// address, asset versions, nonces, obfuscated email characters, and per-block instance ids hashed from settings that hold the address (`sgs-cart-` + md5 of the block's
// attributes, the per-page stylesheet's file name). Instance ids are renumbered in order of first appearance, so the
// same structure on both copies normalises to the same text.
const INSTANCE_ID = /\b(sgs-[a-z0-9]+(?:-[a-z0-9]+)*?-)(?=[a-f]*[0-9])([0-9a-f]{8,32})\b/g;
export function normaliser( port ) {
	return ( s ) => {
		const seen = new Map();
		return s
			// Percent-encoding first (WooCommerce preloads its API responses percent-encoded), so the rules below see
			// one spelling; decoded byte by byte, which is the same on both sides.
			.replace( /%([0-9a-f]{2})/gi, ( m, h ) => String.fromCharCode( parseInt( h, 16 ) ) )
			.split( 'localhost:' + port ).join( '{host}' )
			.replace( /(timestamp"?\s*[:=]\s*"?)\d{9,13}/gi, '$1T' )
			.replace( /([?&;]ver=)[^&"'\s<>\\]+/g, '$1V' )
			.replace( /(nonce[^\n]{0,48}?)\b[0-9a-f]{10}\b/gi, '$1N' )
			// Analytics data is never drawn, and the tag-manager plugin names a product's category in a random order:
			// the data-layer scripts and gtm4wp data attributes are left out.
			.replace( /(<script\b[^>]*>)[^<]*\b(?:dataLayer|gtm4wp)\w*\b[^<]*(<\/script>)/g, '$1DATALAYER$2' )
			.replace( /\sdata-gtm4wp[\w-]*="[^"]*"/g, '' )
			// A signed per-visitor token (the Store API's Cart-Token, preloaded into the basket page).
			.replace( /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g, 'TOKEN' )
			// WordPress's antispambot() writes a random mix of characters and numeric references on every request.
			.replace( /&#x([0-9a-f]+);/gi, ( m, h ) => String.fromCodePoint( parseInt( h, 16 ) ) )
			.replace( /&#(\d+);/g, ( m, d ) => String.fromCodePoint( parseInt( d, 10 ) ) )
			.replace( INSTANCE_ID, ( m, prefix, hex ) => {
				if ( ! seen.has( hex ) ) {
					seen.set( hex, 'id' + seen.size );
				}
				return prefix + seen.get( hex );
			} );
	};
}

// An element reading (capture.mjs's recordTree JSON) with the copy's own address written as {host}: a computed
// background-image or a link's address names the copy's port, which differs between the two copies and is never
// what a visitor sees.
export function recordHost( origin ) {
	const host = new URL( origin ).host;
	return ( json ) => json.split( host ).join( '{host}' );
}

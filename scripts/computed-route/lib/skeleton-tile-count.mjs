// The tile count and the tile cap per device a strip of fixed-size square tiles is drawn with (data/skeleton-decisions.json
// `rules.marquee.labelledLogos.tileSize`). The logo block sizes each tile as the strip's width shared by a count per device
// (`columns`), never larger than that device's cap (`maxHeight`, `maxHeightTablet`, `maxHeightMobile`): the cap is the draft's tile
// size at that device, and the count is the most tiles that still leave each one at least that size, so the cap, not the count,
// draws the tile and it is the draft's size to the pixel. A device whose cap is what the cascade already gives (tablet inherits
// the desktop cap, mobile the tablet's) needs no cap of its own.
const DEVICE = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };

// tiles: { <width>: draft tile's box width }, viewport: { <width>: the strip viewport's box width }, gap: the draft's gap in px.
// Returns { columns: { desktop, tablet, mobile }, caps: { desktop, tablet?, mobile? } } or null when a device lacks a tile or a
// viewport, or a tile is not a positive size.
export function tileCount( { tiles, viewport, gap } ) {
	// Widest first: an object's integer keys sort ascending, and a device's cap is read against the wider device's.
	const widths = [ '1440', '768', '375' ];
	const sizes = widths.map( ( w ) => Number( tiles?.[ w ] ) );
	const spans = widths.map( ( w ) => Number( viewport?.[ w ] ) );
	const g = Number.isFinite( Number( gap ) ) && Number( gap ) >= 0 ? Number( gap ) : 0;
	if ( sizes.some( ( s ) => ! ( s > 0 ) ) || spans.some( ( s ) => ! ( s > 0 ) ) ) {
		return null;
	}
	const columns = {};
	const caps = {};
	let inherited = null;
	widths.forEach( ( w, i ) => {
		columns[ DEVICE[ w ] ] = Math.max( 1, Math.floor( ( spans[ i ] + g ) / ( sizes[ i ] + g ) ) );
		const cap = Math.round( sizes[ i ] );
		cap !== inherited && ( caps[ DEVICE[ w ] ] = cap );
		inherited = cap;
	} );
	return { columns, caps };
}

// A draft element's box width at each read width, { <width>: w } (empty for no element).
export const boxWidths = ( e ) => Object.fromEntries( Object.entries( e?.box || {} ).filter( ( [ , b ] ) => b?.w > 0 ).map( ( [ w, b ] ) => [ w, b.w ] ) );

// A tile's size at each read width where the draft draws it as a square (width and height within a pixel); a width where it is
// not square, or not drawn, is left out, so the strip is read as no fixed-size tile row.
export const squareTile = ( e ) => Object.fromEntries( Object.entries( e?.box || {} ).filter( ( [ , b ] ) => b?.w > 0 && Math.abs( b.w - b.h ) <= 1 ).map( ( [ w, b ] ) => [ w, b.w ] ) );

// The gap in px a strip's inline style declares (`gap` or `column-gap`), or null.
export function stripGap( style ) {
	const m = String( style ?? '' ).match( /(?:^|;)\s*(?:column-)?gap\s*:\s*(\d*\.?\d+)px/i );
	return m ? Number( m[ 1 ] ) : null;
}

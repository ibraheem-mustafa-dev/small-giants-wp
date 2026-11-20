// The tile count and tile cap a strip of fixed-size square tiles is drawn with (data/skeleton-decisions.json
// `rules.marquee.labelledLogos.tileSize`). The logo block sizes each tile as the strip's width shared by a count per device
// (`columns`), never larger than a cap (`maxHeight`): a length per device is no setting it holds, so the draft's tile of 150,
// 136 and 112px is written as the count that comes nearest to it and the cap that the largest tile is. A count cannot always
// hit the draft's size exactly; the nearest count that does not need a tile larger than the cap is chosen, so the strip still
// spans the draft's viewport.
const DEVICE = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };

const tileOf = ( n, width, gap ) => ( width - ( n - 1 ) * gap ) / n;

// tiles: { <width>: draft tile's box width }, viewport: { <width>: the strip viewport's box width }, gap: the draft's gap in px.
// Returns { columns: { desktop, tablet, mobile }, cap } or null when a device lacks a tile or a viewport, or a tile is not a
// positive size.
export function tileCount( { tiles, viewport, gap } ) {
	const widths = Object.keys( DEVICE );
	const sizes = widths.map( ( w ) => Number( tiles?.[ w ] ) );
	const spans = widths.map( ( w ) => Number( viewport?.[ w ] ) );
	const g = Number.isFinite( Number( gap ) ) && Number( gap ) >= 0 ? Number( gap ) : 0;
	if ( sizes.some( ( s ) => ! ( s > 0 ) ) || spans.some( ( s ) => ! ( s > 0 ) ) ) {
		return null;
	}
	const cap = Math.max( ...sizes );
	const columns = {};
	widths.forEach( ( w, i ) => {
		const first = Math.max( 1, Math.ceil( ( spans[ i ] + g ) / ( cap + g ) ) );
		let best = first;
		for ( let n = first; n <= first + 3; n++ ) {
			Math.abs( tileOf( n, spans[ i ], g ) - sizes[ i ] ) < Math.abs( tileOf( best, spans[ i ], g ) - sizes[ i ] ) && ( best = n );
		}
		columns[ DEVICE[ w ] ] = best;
	} );
	return { columns, cap: Math.round( cap ) };
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

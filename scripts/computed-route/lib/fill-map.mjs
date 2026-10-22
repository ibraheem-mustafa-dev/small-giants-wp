// The map display for Fill (FR-48-39, the embed part): a draft Google Maps <iframe> becomes a `sgs/business-info` block with
// displayType "map" (lib/skeleton-rules.mjs `mapEmbed`), and its display is read from the iframe the draft paints, never
// guessed: the height at each width (mapHeight, a per-device tier object), the zoom the embed address asks for (mapZoom)
// and the whole CSS filter the draft paints over the map (mapFilter, a custom value that wins over the preset). The
// settings are the block's own; a block that does not declare them raises a named gap instead of a write. The embed
// address is the Site Info address, so it is never written as a setting.
// Returns { writes: [{ attr, value, merge }], unmapped: [{ property, value, slot, reason }], notes }.

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it).
export const COVERAGE_WRITES = [
	'embed:other',
	'html-attr:iframe.src',
	'html:iframe',
];

const TIERS = [ [ 1440, 'desktop' ], [ 768, 'tablet' ], [ 375, 'mobile' ] ];
// The filter functions the block keeps (sgs/business-info mapFilter): a filter naming any other function would be dropped
// by the block, so Fill names it instead of writing a value the page discards.
const FILTER_FUNCTIONS = [ 'blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia' ];

// The zoom a Google Maps embed address asks for (`z=15`, or `zoom=15`), a whole number from 1 to 20; null when it names none.
export function zoomOf( src ) {
	let z = null;
	try {
		const u = new URL( String( src ?? '' ), 'https://maps.invalid/' );
		z = u.searchParams.get( 'z' ) ?? u.searchParams.get( 'zoom' );
	} catch {
		return null;
	}
	const n = null === z ? NaN : Number( z );
	return Number.isInteger( n ) && n >= 1 && n <= 20 ? n : null;
}

// The functions named in a CSS filter value, or null when it is not a list of `name(args)` terms.
function filterNames( value ) {
	const terms = String( value ).trim().match( /^(?:[a-z-]+\([^()]*\)\s*)+$/i ) ? [ ...String( value ).matchAll( /([a-z-]+)\(/gi ) ].map( ( m ) => m[ 1 ].toLowerCase() ) : null;
	return terms;
}

// embeds: { width: { src, filter, h } } the iframe the draft paints at each read width (lib/fill-read.mjs `embed`; a
// width the element is not shown at is absent). schema: the block's settings. attributes: what the node already holds.
export function mapDecisions( { schema, attributes = {}, embeds = {} } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const at = TIERS.filter( ( [ w ] ) => embeds[ w ] );
	if ( ! at.length ) {
		return out;
	}
	const gap = ( property, value, reason ) => out.unmapped.push( { property, value, slot: '', reason } );
	const declared = ( attr ) => schema && attr in schema;
	const put = ( attr, value, merge = 'replace' ) => out.writes.push( { attr, value, merge } );

	// Height per device: a tier is written where it differs from the wider tier's value; desktop is always written.
	const heights = {};
	let carried = null;
	for ( const [ w, tier ] of at ) {
		const h = Math.round( embeds[ w ].h );
		if ( h > 0 && `${ h }px` !== carried ) {
			heights[ tier ] = `${ h }px`;
			carried = `${ h }px`;
		}
	}
	if ( Object.keys( heights ).length ) {
		declared( 'mapHeight' ) ? put( 'mapHeight', heights, 'deep' ) : gap( 'height', JSON.stringify( heights ), 'the block has no mapHeight setting' );
	}

	// Zoom: the embed address's own, read at the widest width the iframe shows.
	const src = embeds[ at[ 0 ][ 0 ] ].src;
	const zoom = zoomOf( src );
	if ( null !== zoom ) {
		declared( 'mapZoom' ) ? put( 'mapZoom', zoom ) : gap( 'zoom', String( zoom ), 'the block has no mapZoom setting' );
	} else {
		out.notes.push( `the embed address "${ src }" names no zoom, so mapZoom keeps the block's default` );
	}

	// Filter: the draft's whole computed filter, one value for every width (the block has no per-device filter).
	const filters = [ ...new Set( at.map( ( [ w ] ) => String( embeds[ w ].filter ?? 'none' ).trim() || 'none' ) ) ];
	const painted = filters.filter( ( f ) => 'none' !== f );
	if ( filters.length > 1 ) {
		gap( 'filter', filters.join( ' | ' ), 'the draft paints a different filter at different widths and mapFilter is one value' );
	} else if ( 1 === painted.length ) {
		const names = filterNames( painted[ 0 ] );
		if ( ! declared( 'mapFilter' ) ) {
			gap( 'filter', painted[ 0 ], 'the block has no mapFilter setting' );
		} else if ( ! names || names.some( ( n ) => ! FILTER_FUNCTIONS.includes( n ) ) ) {
			gap( 'filter', painted[ 0 ], `mapFilter keeps only ${ FILTER_FUNCTIONS.join( ', ' ) } with numeric arguments` );
		} else {
			put( 'mapFilter', painted[ 0 ] );
		}
	} else if ( attributes.mapFilter || ( attributes.mapFilterPreset && 'none' !== attributes.mapFilterPreset ) ) {
		put( 'mapFilter', '' );
		out.notes.push( 'the draft paints no filter on the map, so mapFilter is cleared' );
	}
	out.notes.push( 'the embed address is the Site Info address (the map searches it), so it is not written as a setting' );
	return out;
}

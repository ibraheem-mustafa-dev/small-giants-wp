// A clip-path as the motion model's entrance clip channel (Spec 38A §6.2: clip, clipEdge), for the cloning writer.

const EDGES = [ 'top', 'right', 'bottom', 'left' ];

// A clip-path as the entrance's clip channel: inset() with one percentage on every edge is `clip` (the default edge,
// all), with one edge inset and the others at 0 it is `clip` and `clipEdge`; none and inset(0) are clip 0. Any other
// shape, a length inset, a rounded inset or two inset edges has no channel.
export function clipChannels( value ) {
	const s = String( value ?? '' ).trim();
	if ( 'none' === s ) {
		return { channels: { clip: 0 }, unsupported: [] };
	}
	const m = /^inset\(([^)]*)\)$/.exec( s );
	const parts = m ? m[ 1 ].trim().split( /\s+/ ) : [];
	// A zero edge is 0 in any unit: Chrome's computed form writes it as 0px (inset(100% 0px 0px)).
	const pct = parts.map( ( p ) => ( /^-?0*\.?0+(?:[a-z]+)?$/i.test( p ) ? 0 : /^-?\d*\.?\d+%$/.test( p ) ? Number( p.slice( 0, -1 ) ) : null ) );
	if ( ! m || ! parts.length || parts.length > 4 || pct.some( ( p ) => null === p ) ) {
		return { channels: {}, unsupported: [ 'clip-path' ] };
	}
	const [ t, r = t, b = t, l = r ] = pct;
	const sides = [ t, r, b, l ];
	if ( sides.every( ( x ) => x === t ) ) {
		return { channels: { clip: t }, unsupported: [] };
	}
	const set = sides.map( ( x, i ) => [ x, EDGES[ i ] ] ).filter( ( [ x ] ) => 0 !== x );
	return 1 === set.length ? { channels: { clip: set[ 0 ][ 0 ], clipEdge: set[ 0 ][ 1 ] }, unsupported: [] } : { channels: {}, unsupported: [ 'clip-path' ] };
}

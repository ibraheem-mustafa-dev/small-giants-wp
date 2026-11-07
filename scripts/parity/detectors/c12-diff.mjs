// Pure comparison helpers shared by the C1 and C2 detectors (no browser, so tests feed them readings directly).

const channels = ( c ) => ( String( c ).match( /[\d.]+/g ) || [] ).slice( 0, 3 ).map( Number );
export const colourGap = ( a, b ) => {
	const x = channels( a );
	const y = channels( b );
	return 3 === x.length && 3 === y.length ? Math.max( ...x.map( ( v, i ) => Math.abs( v - y[ i ] ) ) ) : a === b ? 0 : 255;
};

// The effects one element shows between two readings of it (samplePairs entries): a set of category names with values.
export function changeSet( rest, hov ) {
	if ( ! rest || ! hov || ! rest.vis || ! hov.vis ) {
		return {};
	}
	const out = {};
	const dtf = hov.tf.map( ( v, i ) => v - rest.tf[ i ] );
	if ( Math.abs( dtf[ 0 ] ) > 0.5 || Math.abs( dtf[ 1 ] ) > 0.5 || Math.abs( dtf[ 2 ] ) > 0.005 || Math.abs( dtf[ 3 ] ) > 0.005 || Math.abs( dtf[ 4 ] ) > 0.3 ) {
		out.transform = { dx: dtf[ 0 ], dy: dtf[ 1 ], ds: dtf[ 2 ], dr: dtf[ 4 ] };
	}
	const db = [ hov.x - rest.x, hov.y - rest.y, hov.w - rest.w, hov.h - rest.h ];
	if ( db.some( ( v ) => Math.abs( v ) > 1 ) ) {
		out.move = { dx: db[ 0 ], dy: db[ 1 ], dw: db[ 2 ], dh: db[ 3 ] };
	}
	if ( colourGap( rest.color, hov.color ) > 6 ) {
		out.colour = { from: rest.color, to: hov.color };
	}
	if ( colourGap( rest.bg, hov.bg ) > 6 || colourGap( rest.bc, hov.bc ) > 6 ) {
		out.ground = { from: `${ rest.bg } ${ rest.bc }`, to: `${ hov.bg } ${ hov.bc }` };
	}
	if ( rest.sh !== hov.sh ) {
		out.shadow = { from: rest.sh, to: hov.sh };
	}
	if ( Math.abs( Number( rest.op ) - Number( hov.op ) ) > 0.02 ) {
		out.opacity = { from: rest.op, to: hov.op };
	}
	if ( rest.fl !== hov.fl ) {
		out.filter = { from: rest.fl, to: hov.fl };
	}
	if ( rest.td !== hov.td ) {
		out.decoration = { from: rest.td, to: hov.td };
	}
	return out;
}

// Largest travel in px of a transform or move change (for the report).
export const travel = ( c ) => Math.round( Math.max( 0, ...[ c?.transform, c?.move ].filter( Boolean ).flatMap( ( v ) => [ v.dx, v.dy ].map( Math.abs ) ) ) * 10 ) / 10;

// Variation of an element's own pose across scroll steps (only steps where it is in view): { dx, dy, ds, dr, steps }.
export function scrollRange( steps ) {
	const seen = steps.filter( ( s ) => s && s.inView );
	if ( seen.length < 2 ) {
		return null;
	}
	const span = ( i ) => Math.max( ...seen.map( ( s ) => s.tf[ i ] ) ) - Math.min( ...seen.map( ( s ) => s.tf[ i ] ) );
	return { dx: span( 0 ), dy: span( 1 ), ds: span( 2 ), dr: span( 4 ), steps: seen.length };
}
export const scrollMoves = ( r ) => Boolean( r ) && ( r.dx > 1.5 || r.dy > 1.5 || r.ds > 0.02 || r.dr > 1 );

// The ids of the live and draft readings, with the reason for each one that cannot be compared.
export function unmeasured( ids, live, draft, why ) {
	return ids.flatMap( ( id ) => {
		if ( live[ id ] && draft[ id ] ) {
			return [];
		}
		return [ { id, reason: why( id, Boolean( live[ id ] ), Boolean( draft[ id ] ) ) } ];
	} );
}

// A recorded ruling (divergences.json entry) covers a finding by node and property name; returns its id or null.
export function ruledBy( rulings, id, prop ) {
	const hit = ( rulings || [] ).find( ( e ) => ( '*' === e.node || e.node === id ) && ( '*' === e.property || e.property === prop ) );
	return hit ? hit.id : null;
}

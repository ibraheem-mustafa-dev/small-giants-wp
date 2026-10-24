// The properties a pair's element moves in any state walked at one width, on either side: what a transition there can
// animate. The walk reads every state at a width before comparing (draft-live-walk.mjs), so the comparison of one state
// can know what the others moved: a transition the hover never uses may still run the scrolled state's collapse.
import { changed } from './compare.mjs';

// One pair's states at one width, in walk order ([{ d, l }], the first state's reads being the rest the others are
// read against). The change set is the union of
// - each state's hover, focus and pressed changes on either side (compare.mjs::changed),
// - each side's resting style values that differ between the first state and any other (a scrolled header's padding),
// - `box:h` and `box:w` where a side's box extent differs between states by more than `tol` px (a collapse read as a
//   size, lib/transitions.mjs::sameTransitions matches it with the sizes, padding and margins).
// Null while the set cannot be known: a state where either side missed the element or read no styles, a state whose
// hover was not read (compare.mjs::changed is null), or a single state with no hover read on a side (a phone run that
// walks nothing but rest).
export function everyStateChanges( snaps, tol = 0.5 ) {
	if ( ! snaps.length || snaps.some( ( s ) => ! s.d?.styles || ! s.l?.styles || s.d.missing || s.l.missing ) ) {
		return null;
	}
	if ( 1 === snaps.length && ( snaps[ 0 ].d.noHover || snaps[ 0 ].l.noHover ) ) {
		return null;
	}
	const out = new Set();
	for ( const { d, l } of snaps ) {
		const own = changed( d, l );
		if ( null === own ) {
			return null;
		}
		own.forEach( ( k ) => out.add( k ) );
	}
	for ( const side of [ 'd', 'l' ] ) {
		const rest = snaps[ 0 ][ side ];
		for ( const x of snaps.slice( 1 ).map( ( s ) => s[ side ] ) ) {
			Object.keys( x.styles ).filter( ( k ) => undefined !== rest.styles[ k ] && String( rest.styles[ k ] ) !== String( x.styles[ k ] ) ).forEach( ( k ) => out.add( k ) );
			[ 'h', 'w' ].filter( ( a ) => Math.abs( ( x.box?.[ a ] ?? 0 ) - ( rest.box?.[ a ] ?? 0 ) ) > tol ).forEach( ( a ) => out.add( `box:${ a }` ) );
		}
	}
	return [ ...out ];
}

// Every pair's change set at one width ({ [pair]: [...] | null }), from the walk's draft and live states.
export function everyStateMap( states, draftStates, liveStates, pairsFor ) {
	const out = {};
	const walked = states.filter( ( s ) => draftStates[ s.name ] );
	for ( const p of new Set( walked.flatMap( ( s ) => pairsFor( s ) ) ) ) {
		const snaps = walked.filter( ( s ) => pairsFor( s ).includes( p ) ).map( ( s ) => ( { d: draftStates[ s.name ]?.snap?.[ p.name ], l: liveStates[ s.name ]?.snap?.[ p.name ] } ) );
		out[ p.name ] = everyStateChanges( snaps );
	}
	return out;
}

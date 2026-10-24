// The properties a pair's element moves in any state walked at one width, on either side: what a transition there can
// animate, and the properties the walk read in every one of those states: what it can say did not move. The walk reads
// every state at a width before comparing (draft-live-walk.mjs), so the comparison of one state can know what the others
// moved: a transition the hover never uses may still run the scrolled state's collapse.
import { changed } from './compare.mjs';

const keysOf = ( o ) => Object.keys( o ).filter( ( k ) => 'icon' !== k );

// One pair's states at one width, in walk order ([{ d, l }], the first state's reads being the rest the others are
// read against). Returns { changes, read }. `changes` is the union of
// - each state's hover, focus and pressed changes on either side (compare.mjs::changed for hover and pressed; a focus
//   read's styles against the rest it read beside them, lib/focus.mjs::focusPass),
// - each side's resting style values that differ between the first state and any other, a property read in one of the
//   two only included (a header that becomes fixed when scrolled reads `top` there alone),
// - `box:h` and `box:w` where a side's box extent differs between states by more than `tol` px (a collapse read as a
//   size, lib/transitions.mjs::sameTransitions matches it with the sizes, padding and margins).
// `read` is the properties read on both sides in every state's resting snapshot and in every hover, focus and pressed
// read the walk made for the pair (a focus that never landed, or a state read that came back empty-handed, read
// nothing): a property outside it is never known to stay still, whatever `changes` holds.
// Null while the set cannot be known: a state where either side missed the element or read no styles, or any snapshot
// on either side whose hover was not read (a phone run, `noHover`, measures no hover, focus or pressed change of the
// pointer kind; an unreached or failed hover read measured nothing).
export function everyStateChanges( snaps, tol = 0.5 ) {
	if ( ! snaps.length || snaps.some( ( s ) => ! s.d?.styles || ! s.l?.styles || s.d.missing || s.l.missing ) ) {
		return null;
	}
	if ( snaps.some( ( s ) => [ s.d, s.l ].some( ( x ) => x.noHover || ! x.hover || 'object' !== typeof x.hover ) ) ) {
		return null;
	}
	const out = new Set();
	let read = null;
	const reads = ( keys ) => {
		read = null === read ? new Set( keys ) : new Set( [ ...read ].filter( ( k ) => keys.includes( k ) ) );
	};
	for ( const { d, l } of snaps ) {
		changed( d, l ).forEach( ( k ) => out.add( k ) );
		for ( const x of [ d, l ] ) {
			reads( Object.keys( x.styles ) );
			reads( keysOf( x.hover ) );
			if ( undefined !== x.active ) {
				reads( x.active && 'object' === typeof x.active ? keysOf( x.active ) : [] );
			}
			if ( undefined !== x.focus && ! x.focus?.none ) {
				const f = x.focus?.landed && x.focus.styles ? x.focus : null;
				reads( f ? Object.keys( f.styles ) : [] );
				Object.keys( f?.styles || {} ).filter( ( k ) => f.rest && String( f.styles[ k ] ) !== String( f.rest[ k ] ) ).forEach( ( k ) => out.add( k ) );
			}
		}
	}
	for ( const side of [ 'd', 'l' ] ) {
		const rest = snaps[ 0 ][ side ];
		for ( const x of snaps.slice( 1 ).map( ( s ) => s[ side ] ) ) {
			[ ...new Set( [ ...Object.keys( rest.styles ), ...Object.keys( x.styles ) ] ) ].filter( ( k ) => String( rest.styles[ k ] ) !== String( x.styles[ k ] ) ).forEach( ( k ) => out.add( k ) );
			[ 'h', 'w' ].filter( ( a ) => Math.abs( ( x.box?.[ a ] ?? 0 ) - ( rest.box?.[ a ] ?? 0 ) ) > tol ).forEach( ( a ) => out.add( `box:${ a }` ) );
		}
	}
	return { changes: [ ...out ], read: [ ...read ] };
}

// Every pair's change set at one width ({ [pair]: { changes, read } | null }), from the walk's draft and live states.
// `states` are the config's states in walk order; those the draft side walked at this width are the walk. A pair the
// walk's first state does not hold (one scoped to later states, such as a drawer pair read in `menu-open` only) has no
// rest to read its states against, so its movement between rest and those states is unknown: null. A partial run
// (`partial`, draft-live-walk.mjs `--states`) walks only some states, so what the others move is unknown for every
// pair: an empty map.
export function everyStateMap( states, draftStates, liveStates, pairsFor, { partial = false } = {} ) {
	const out = {};
	if ( partial ) {
		return out;
	}
	const walked = states.filter( ( s ) => draftStates[ s.name ] );
	for ( const p of new Set( walked.flatMap( ( s ) => pairsFor( s ) ) ) ) {
		const mine = walked.filter( ( s ) => pairsFor( s ).includes( p ) );
		const snaps = mine.map( ( s ) => ( { d: draftStates[ s.name ]?.snap?.[ p.name ], l: liveStates[ s.name ]?.snap?.[ p.name ] } ) );
		out[ p.name ] = mine[ 0 ] === walked[ 0 ] ? everyStateChanges( snaps ) : null;
	}
	return out;
}

// Compares one pair's draft and live snapshots and returns the differences.
import { compareFocus } from './focus.mjs';

const PX = /^-?\d+(\.\d+)?px$/;

// First family only, unquoted and lower-case: "Inter", sans-serif == inter, system-ui.
const firstFamily = ( v ) => v.split( ',' )[ 0 ].replace( /["']/g, '' ).trim().toLowerCase();

// Colour values reduced to rgba numbers so rgb(0, 0, 0) == rgba(0, 0, 0, 1) ==
// color(srgb 0 0 0), the form Chrome reports for colour-mix() and relative colours.
function normColour( v ) {
	return v.replace( /color\(srgb ([^)]+)\)/g, ( m, inner ) => {
		const [ rgb, alpha ] = inner.split( '/' );
		const c = rgb.trim().split( /\s+/ ).map( ( n ) => Math.round( Number( n ) * 255 ) );
		return `rgba(${ c.join( ',' ) },${ alpha ? Number( alpha ) : 1 })`;
	} ).replace( /rgba?\(([^)]+)\)/g, ( m, inner ) => {
		const parts = inner.split( /[\s,/]+/ ).filter( Boolean ).map( Number );
		if ( parts.length === 3 ) {
			parts.push( 1 );
		}
		return `rgba(${ parts.map( ( n ) => Math.round( n * 1000 ) / 1000 ).join( ',' ) })`;
	} );
}

// Transition shorthands ordered by property so "color .2s, background .2s" matches in either order.
const normTransition = ( v ) => v.split( /,(?![^(]*\))/ ).map( ( s ) => s.trim() ).sort().join( ', ' );

export function sameValue( prop, a, b, pxTol ) {
	if ( a === b ) {
		return true;
	}
	if ( a === undefined || b === undefined ) {
		return false;
	}
	if ( prop === 'font-family' ) {
		return firstFamily( a ) === firstFamily( b );
	}
	if ( PX.test( a ) && PX.test( b ) ) {
		return Math.abs( parseFloat( a ) - parseFloat( b ) ) <= pxTol;
	}
	// Space-separated lists of px values (grid-template-columns, border-radius corners).
	const la = a.split( ' ' );
	const lb = b.split( ' ' );
	if ( la.length === lb.length && la.length > 1 && la.every( ( x ) => PX.test( x ) ) && lb.every( ( x ) => PX.test( x ) ) ) {
		return la.every( ( x, i ) => Math.abs( parseFloat( x ) - parseFloat( lb[ i ] ) ) <= pxTol );
	}
	if ( prop === 'transition' ) {
		return normTransition( normColour( a ) ) === normTransition( normColour( b ) );
	}
	// A single colour: each channel within 2/255 (rounding in colour-mix and relative colours).
	const ca = normColour( a ).match( /^rgba\(([^)]+)\)$/ );
	const cb = normColour( b ).match( /^rgba\(([^)]+)\)$/ );
	if ( ca && cb ) {
		const x = ca[ 1 ].split( ',' ).map( Number );
		const y = cb[ 1 ].split( ',' ).map( Number );
		return x.slice( 0, 3 ).every( ( n, i ) => Math.abs( n - y[ i ] ) <= 2 ) && Math.abs( x[ 3 ] - y[ 3 ] ) <= 0.02;
	}
	return normColour( a ) === normColour( b );
}

// An underline is "<line> <colour>": the lines must be equal and the colours within the usual 2/255.
const splitDecoration = ( v ) => v.match( /^(.*?)\s+((?:rgba?|color)\(.*)$/ )?.slice( 1 ) || [ v, '' ];
export const sameDecoration = ( a = 'none', b = 'none' ) => {
	const [ la, ca ] = splitDecoration( a );
	const [ lb, cb ] = splitDecoration( b );
	return la === lb && ( 'none' === la || sameValue( 'color', ca, cb, 0 ) );
};

const normText = ( t ) => ( t || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();

// The same words in another DOM order are the same text; where they sit on screen is
// judged by the box sizes and the side-by-side screenshots.
const sameWords = ( a, b ) => normText( a ).split( ' ' ).sort().join( ' ' ) === normText( b ).split( ' ' ).sort().join( ' ' );

// A border colour only matters where that side has a border.
function borderColourIrrelevant( p, d, l ) {
	const m = p.match( /^border-(top|bottom|left|right)-color$/ );
	if ( ! m ) {
		return false;
	}
	const w = `border-${ m[ 1 ] }-width`;
	return parseFloat( d[ w ] ?? '1' ) === 0 && parseFloat( l[ w ] ?? '1' ) === 0;
}

// Parts that paint nothing on their own: an underline's colour, thickness and offset while either side
// has no underline (the line row says it), an outline's width, colour and offset while either side's
// style is none, and an icon colour where one side has no svg (presence is the inventory's job).
function partIrrelevant( p, d, l ) {
	if ( /^(text-decoration-(color|thickness)|text-underline-offset)$/.test( p ) ) {
		return 'none' === d[ 'text-decoration-line' ] || 'none' === l[ 'text-decoration-line' ];
	}
	if ( /^outline-(width|color|offset)$/.test( p ) ) {
		return 'none' === d[ 'outline-style' ] || 'none' === l[ 'outline-style' ];
	}
	return /^icon-/.test( p ) && ( undefined === d[ p ] || undefined === l[ p ] );
}

const SAME = { 'text-align': [ [ 'start', 'left' ] ] };
const equivalent = ( p, a, b ) => ( SAME[ p ] || [] ).some( ( set ) => set.includes( a ) && set.includes( b ) );

// Returns [{ kind, key, draft, live }] for one pair in one state at one width.
export function comparePair( pair, d, l, tol ) {
	const diffs = [];
	const add = ( kind, key, draft, live ) => diffs.push( { kind, key, draft, live } );
	if ( d.missing || l.missing ) {
		if ( d.missing !== l.missing ) {
			add( 'presence', 'element', d.missing ? 'missing' : 'present', l.missing ? 'missing' : 'present' );
		}
		return diffs;
	}
	if ( pair.text !== false && ! sameWords( d.text, l.text ) ) {
		add( 'text', 'text', d.text, l.text );
	}
	for ( const k of pair.box || [ 'w', 'h' ] ) {
		if ( Math.abs( d.box[ k ] - l.box[ k ] ) > tol.box ) {
			add( 'box', k, d.box[ k ], l.box[ k ] );
		}
	}
	for ( const p of new Set( [ ...Object.keys( d.styles ), ...Object.keys( l.styles ) ] ) ) {
		if ( borderColourIrrelevant( p, d.styles, l.styles ) || partIrrelevant( p, d.styles, l.styles ) || equivalent( p, d.styles[ p ], l.styles[ p ] ) ) {
			continue;
		}
		if ( ! sameValue( p, d.styles[ p ], l.styles[ p ], tol.px ) ) {
			add( 'style', p, d.styles[ p ], l.styles[ p ] );
		}
	}
	if ( pair.motion !== false ) {
		if ( d.keyframes !== l.keyframes ) {
			add( 'motion', 'keyframes', d.keyframes, l.keyframes );
		}
		for ( const k of [ 'animation', 'transition' ] ) {
			if ( ! sameValue( k, d.motion[ k ], l.motion[ k ], 0 ) ) {
				add( 'motion', k, d.motion[ k ], l.motion[ k ] );
			}
		}
		const rd = ( d.running || [] ).join( ' | ' );
		const rl = ( l.running || [] ).join( ' | ' );
		if ( rd !== rl ) {
			add( 'motion', 'running-after-action', rd || 'none', rl || 'none' );
		}
	}
	if ( d.hover && l.hover ) {
		for ( const p of Object.keys( d.hover ) ) {
			if ( borderColourIrrelevant( p, d.styles, l.styles ) ) {
				continue;
			}
			if ( ! sameValue( p, d.hover[ p ], l.hover[ p ], tol.px ) ) {
				add( 'hover', p, d.hover[ p ], l.hover[ p ] );
			}
		}
	}
	diffs.push( ...compareFocus( d.focus, l.focus, sameValue, tol.px ) );
	return diffs;
}

// Scroll-in: the element's opacity and transform before it is scrolled to, after it
// settles in view, and the animations started by reaching it.
export function compareScroll( d, l ) {
	const diffs = [];
	if ( ! d || ! l ) {
		return diffs;
	}
	for ( const phase of [ 'pre', 'post' ] ) {
		for ( const p of Object.keys( d[ phase ] || {} ) ) {
			if ( ! sameValue( p, d[ phase ][ p ], l[ phase ]?.[ p ], 0.02 ) ) {
				diffs.push( { kind: 'scroll', key: `${ phase }:${ p }`, draft: d[ phase ][ p ], live: l[ phase ]?.[ p ] } );
			}
		}
	}
	const rd = ( d.running || [] ).join( ' | ' ) || 'none';
	const rl = ( l.running || [] ).join( ' | ' ) || 'none';
	if ( rd !== rl ) {
		diffs.push( { kind: 'scroll', key: 'running-on-reveal', draft: rd, live: rl } );
	}
	return diffs;
}

// An accepted difference matches on pair, key and optionally state, width, kind and a
// when(diff) test (e.g. "the texts are equal once pennies are dropped"). An entry with
// notPainted: true (a property that differs without changing the pixels) only applies
// while the pair's box matches or every box difference is itself accepted: an
// unexplained box difference may be what the property moved.
export function isAccepted( accept, ctx, diff ) {
	return accept.find( ( a ) => ( ! a.notPainted || ctx.boxMatches ) &&
		( ! a.pair || a.pair === ctx.pair ) &&
		( ! a.key || a.key === diff.key ) &&
		( ! a.kind || a.kind === diff.kind ) &&
		( ! a.state || a.state === ctx.state ) &&
		( ! a.width || a.width === ctx.width ) &&
		( ! a.when || a.when( diff ) ) ) || null;
}

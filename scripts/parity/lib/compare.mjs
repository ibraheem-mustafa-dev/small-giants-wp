// Compares one pair's draft and live snapshots and returns the differences.
import { compareFocus } from './focus.mjs';
import { sameRatio, sameTracks } from './ratio.mjs';
import { layoutComparable } from './paint.mjs';

const PX = /^-?\d+(\.\d+)?px$/;
// The identity transform in both forms the computed style gives (2D and 3D), whitespace removed.
const IDENTITY = new Set( [ 'matrix(1,0,0,1,0,0)', 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)' ] );

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
// One transition that names no property (Chrome prints "all 0.25s" as "0.25s") covers a list whose every part has
// the same timing: the listed properties animate the same way.
const PROPLESS = /^(-?\d|cubic-bezier|steps|ease|linear)/;
const timing = ( part ) => ( PROPLESS.test( part ) ? part : part.replace( /^\S+\s+/, '' ) );
const allCovers = ( a, b ) => {
	const pa = normTransition( a ).split( ', ' );
	const pb = normTransition( b ).split( ', ' );
	const one = ( p ) => 1 === p.length && ( PROPLESS.test( p[ 0 ] ) || /^all\s/.test( p[ 0 ] ) );
	const [ all, list ] = one( pa ) ? [ pa, pb ] : ( one( pb ) ? [ pb, pa ] : [ null, null ] );
	return !! all && list.every( ( part ) => timing( part ) === timing( all[ 0 ] ) );
};

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
	// The identity matrix paints exactly as no transform (a finished reveal animation leaves it behind on one side);
	// any other matrix still compares by value.
	if ( prop === 'transform' ) {
		const flat = ( v ) => ( IDENTITY.has( v.replace( /\s+/g, '' ) ) ? 'none' : v );
		return flat( a ) === flat( b );
	}
	// Ratios paint the same when equal as numbers ("16 / 9" and "1.77778 / 1").
	if ( prop === 'aspect-ratio' ) {
		return sameRatio( a, b );
	}
	// Grid tracks in px compare as proportions (sameTracks): their widths follow the container's.
	if ( prop === 'grid-template-columns' && sameTracks( a, b ) ) {
		return true;
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
		return normTransition( normColour( a ) ) === normTransition( normColour( b ) ) || allCovers( normColour( a ), normColour( b ) );
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

// A border colour or style only matters where that side has a border (a 0 width paints neither).
function borderColourIrrelevant( p, d, l ) {
	const m = p.match( /^border-(top|bottom|left|right)-(color|style)$/ );
	if ( ! m ) {
		return false;
	}
	const w = `border-${ m[ 1 ] }-width`;
	return parseFloat( d[ w ] ?? '1' ) === 0 && parseFloat( l[ w ] ?? '1' ) === 0;
}

// Parts that paint nothing on their own: an underline's colour, thickness and offset while either side
// has no underline (the line row says it), an outline's width, colour and offset while either side's
// style is none, an icon colour where one side has no svg (presence is the inventory's job), and a min-height the
// draft does not set.
function partIrrelevant( p, d, l ) {
	if ( /^(text-decoration-(color|thickness)|text-underline-offset)$/.test( p ) ) {
		return 'none' === d[ 'text-decoration-line' ] || 'none' === l[ 'text-decoration-line' ];
	}
	if ( /^outline-(width|color|offset)$/.test( p ) ) {
		return 'none' === d[ 'outline-style' ] || 'none' === l[ 'outline-style' ];
	}
	// A min-height is a difference only where the draft sets one: a live floor the draft lacks (a 44px touch target)
	// shows in the box rows when it changes the height.
	if ( 'min-height' === p ) {
		return ! ( parseFloat( d[ p ] ) > 0 );
	}
	return /^icon-/.test( p ) && ( undefined === d[ p ] || undefined === l[ p ] );
}

// A single-line control (an input or a select) centres its text, so while its min-height sets its height on both
// pages its top and bottom padding paint nothing.
function controlPaddingIrrelevant( p, d, l ) {
	if ( ! /^padding-(top|bottom)$/.test( p ) ) {
		return false;
	}
	const floored = ( s ) => /^(input|select)$/.test( s.tag || '' ) && Math.abs( s.box.h - parseFloat( s.styles[ 'min-height' ] ) ) <= 1;
	return floored( d ) && floored( l );
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
		if ( borderColourIrrelevant( p, d.styles, l.styles ) || partIrrelevant( p, d.styles, l.styles ) || equivalent( p, d.styles[ p ], l.styles[ p ] ) || ! layoutComparable( p, d, l ) || controlPaddingIrrelevant( p, d, l ) ) {
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

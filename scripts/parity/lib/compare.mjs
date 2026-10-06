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

// A motion timing longhand lists one value per transition or animation: compared as the set of distinct values, so
// "0.25s, 0.25s" (two properties, one timing) matches "0.25s" (all).
const TIMING = /^(transition|animation)-(duration|delay|timing-function)$/;
export const timingSet = ( v ) => [ ...new Set( v.split( /,(?![^(]*\))/ ).map( ( x ) => x.trim() ) ) ].sort().join( ', ' );

export function sameValue( prop, a, b, pxTol ) {
	if ( a === b ) {
		return true;
	}
	if ( a === undefined || b === undefined ) {
		return false;
	}
	if ( TIMING.test( prop ) ) {
		return timingSet( a ) === timingSet( b );
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

// Motion timings that run nothing: an animation's while neither side animates (no keyframes), a transition's delay and
// easing while neither side's transition takes any time.
function timingIrrelevant( p, d, l ) {
	// Animation timings compare only where both sides animate with CSS keyframes: a side animating from script (the
	// Web Animations API, an SGS entrance) leaves no CSS timing, and the keyframes motion row already reports the
	// difference in technique.
	if ( /^animation-/.test( p ) ) {
		return 'none' === ( d.keyframes ?? 'none' ) || 'none' === ( l.keyframes ?? 'none' );
	}
	const still = ( x ) => timingSet( x.styles[ 'transition-duration' ] ?? '0s' ) === '0s';
	return /^transition-(delay|timing-function)$/.test( p ) && still( d ) && still( l );
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

// Text properties (and the text row) of a pair whose icon is a font glyph on one side and an svg or dashicon on the other:
// the glyph paints as text and the svg does not, so the text keys exist on one side only. The icon's colour is compared
// as `icon-colour`, one concept for a glyph's text colour and an svg's fill or stroke.
const GLYPH_TEXT = new Set( [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow', 'text-decoration-line', 'text-decoration-color', 'text-decoration-thickness', 'text-underline-offset' ] );
const iconMixed = ( d, l ) => !! d.iconKind && !! l.iconKind && d.iconKind !== l.iconKind && ( 'glyph' === d.iconKind || 'glyph' === l.iconKind );
// The properties of a pair that no stable value compares: those an infinite animation drives on either side.
const loopSet = ( d, l ) => new Set( [ ...( d.loops || [] ), ...( l.loops || [] ) ] );

const SAME = { 'text-align': [ [ 'start', 'left' ] ] };
// On a flex container (CSS Box Alignment): justify-content normal lays out as flex-start, align-items normal as stretch.
const FLEX_SAME = { 'justify-content': [ [ 'normal', 'flex-start', 'start' ] ], 'align-items': [ [ 'normal', 'stretch' ] ] };
const equivalent = ( p, a, b, flex = false ) => [ ...( SAME[ p ] || [] ), ...( flex ? FLEX_SAME[ p ] || [] : [] ) ].some( ( set ) => set.includes( a ) && set.includes( b ) );

// Tag classes (GAP-CHECKLIST.md section 20): what an element is, for the guard against comparing different things. A
// draft <div> against a live <img>, or a <span> against an <h1>, shares no style, box or hover meaning, so every row
// between them would be false. Different classes give one `tag` row and nothing else.
const MEDIA_TAGS = new Set( [ 'img', 'picture', 'video', 'canvas', 'svg', 'iframe' ] );
const CONTROL_TAGS = new Set( [ 'input', 'select', 'textarea' ] );
const INLINE_TAGS = new Set( [ 'span', 'em', 'strong', 'b', 'i', 'small', 'abbr', 'code', 'label' ] );
export function tagClass( tag ) {
	const t = String( tag || '' ).toLowerCase();
	if ( MEDIA_TAGS.has( t ) ) {
		return 'media';
	}
	if ( CONTROL_TAGS.has( t ) ) {
		return 'control';
	}
	return INLINE_TAGS.has( t ) ? 'inline text' : 'block';
}
// A text-run or group finder measures a set of text nodes or a union box: its recorded tag is the wrapper's, not the thing measured.
const wrapperFinder = ( f ) => !! ( f && 'object' === typeof f && ( f.textRun || f.group ) );

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
	if ( d.tag && l.tag && ! wrapperFinder( pair.draft ) && ! wrapperFinder( pair.live ) && tagClass( d.tag ) !== tagClass( l.tag ) ) {
		add( 'tag', 'tag', `<${ d.tag }> (${ tagClass( d.tag ) })`, `<${ l.tag }> (${ tagClass( l.tag ) })` );
		return diffs;
	}
	const mixed = iconMixed( d, l );
	const loops = loopSet( d, l );
	if ( pair.text !== false && ! mixed && ! sameWords( d.text, l.text ) ) {
		add( 'text', 'text', d.text, l.text );
	}
	for ( const k of pair.box || [ 'w', 'h' ] ) {
		if ( Math.abs( d.box[ k ] - l.box[ k ] ) > tol.box ) {
			add( 'box', k, d.box[ k ], l.box[ k ] );
		}
	}
	for ( const p of new Set( [ ...Object.keys( d.styles ), ...Object.keys( l.styles ) ] ) ) {
		// icon-colour is its own row only across a glyph and an svg; elsewhere icon-fill and icon-stroke carry the icon's colour.
		if ( 'icon-colour' === p ? ! mixed : ( loops.has( p ) || ( mixed && ( GLYPH_TEXT.has( p ) || /^icon-(fill|stroke)$/.test( p ) ) ) ) ) {
			continue;
		}
		if ( borderColourIrrelevant( p, d.styles, l.styles ) || partIrrelevant( p, d.styles, l.styles ) || timingIrrelevant( p, d, l ) || equivalent( p, d.styles[ p ], l.styles[ p ], [ d, l ].every( ( x ) => /(^|-)flex$/.test( x.layoutDisplay || '' ) ) ) || ! layoutComparable( p, d, l ) || controlPaddingIrrelevant( p, d, l ) ) {
			continue;
		}
		if ( ! sameValue( p, d.styles[ p ], l.styles[ p ], tol.px ) ) {
			add( 'style', p, d.styles[ p ], l.styles[ p ] );
		}
	}
	// A text run's rows (an opening-hours list): the same number of rows on both sides spaced differently is a row-gap row.
	if ( d.rows && l.rows && d.rows.count === l.rows.count && d.rows.count > 1 && Math.abs( d.rows.space - l.rows.space ) > tol.box ) {
		add( 'style', 'row-gap', `${ d.rows.space }px`, `${ l.rows.space }px` );
	}
	// Painting ::before / ::after layers: a layer on one side only is one content row; on both, each property compared.
	if ( pair.pseudo !== false ) {
		for ( const ps of new Set( [ ...Object.keys( d.pseudo || {} ), ...Object.keys( l.pseudo || {} ) ] ) ) {
			const [ a, b ] = [ d.pseudo?.[ ps ], l.pseudo?.[ ps ] ];
			if ( ! a || ! b ) {
				diffs.push( { kind: 'style', key: 'content', pseudo: ps, draft: a?.content ?? 'none', live: b?.content ?? 'none' } );
				continue;
			}
			for ( const p of Object.keys( a ) ) {
				if ( ! borderColourIrrelevant( p, a, b ) && ! sameValue( p, a[ p ], b[ p ], tol.px ) ) {
					diffs.push( { kind: 'style', key: p, pseudo: ps, draft: a[ p ], live: b[ p ] } );
				}
			}
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
	// A hover row is a difference in what hovering changes: where neither side's hover end state moves a property off
	// its rest value, a difference there is the rest row's (a rest colour that differs is not also a hover colour).
	// The same judgement for the pressed state (:active, GAP-CHECKLIST.md section 23): rows of kind `active`.
	for ( const [ kind, field ] of [ [ 'hover', 'hover' ], [ 'active', 'active' ] ] ) {
		if ( d[ field ] && l[ field ] ) {
			const still = ( s, p ) => undefined !== s.styles?.[ p ] && sameValue( p, s[ field ][ p ], s.styles[ p ], tol.px );
			for ( const p of Object.keys( d[ field ] ) ) {
				if ( loops.has( p ) || ( mixed && GLYPH_TEXT.has( p ) ) || borderColourIrrelevant( p, d.styles, l.styles ) || ( still( d, p ) && still( l, p ) ) ) {
					continue;
				}
				if ( ! sameValue( p, d[ field ][ p ], l[ field ][ p ], tol.px ) ) {
					add( kind, p, d[ field ][ p ], l[ field ][ p ] );
				}
			}
		}
	}
	// A hover no pointer could reach (a pass that did not move the pointer onto the element) is a row, so that it is never
	// read as a hover that changed nothing; the full check reports its own (chrome-walk.mjs::compareChrome).
	if ( d.hoverUnreached || l.hoverUnreached ) {
		add( 'hover', 'reached', d.hoverUnreached ? 'unreached' : 'hovered', l.hoverUnreached ? 'unreached' : 'hovered' );
	}
	diffs.push( ...compareFocus( d.focus, l.focus, sameValue, tol.px ), ...compareLines( d.lines, l.lines ) );
	return diffs;
}

// Line counts (GAP-CHECKLIST.md section 25): the number of lines a pair's text wraps to, sampled during a state's action
// (state-passes.mjs::sampleLines at 30, 120, 250 and 450ms) and once settled. `lines@<t>ms` rows are a count that differs at
// that instant (a title wrapping to 2 lines for 300ms during a header's shrink on one side only); `lines` is the settled
// count. A count either side could not read (the pair gone mid-action) is no row.
export function compareLines( d, l ) {
	const rows = [];
	if ( ! d || ! l ) {
		return rows;
	}
	for ( const t of Object.keys( d.at || {} ).filter( ( k ) => k in ( l.at || {} ) ) ) {
		if ( null != d.at[ t ] && null != l.at[ t ] && d.at[ t ] !== l.at[ t ] ) {
			rows.push( { kind: 'lines', key: `lines@${ t }ms`, draft: d.at[ t ], live: l.at[ t ] } );
		}
	}
	if ( null != d.settled && null != l.settled && d.settled !== l.settled ) {
		rows.push( { kind: 'lines', key: 'lines', draft: d.settled, live: l.settled } );
	}
	return rows;
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
		( a.pseudo ?? null ) === ( diff.pseudo ?? null ) &&
		( ! a.pair || a.pair === ctx.pair ) &&
		( ! a.key || a.key === diff.key ) &&
		( ! a.kind || a.kind === diff.kind ) &&
		( ! a.state || a.state === ctx.state ) &&
		( ! a.width || a.width === ctx.width ) &&
		( ! a.when || a.when( diff ) ) ) || null;
}

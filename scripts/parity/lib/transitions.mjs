// Transitions matched by the property they animate, read from the computed `transition` shorthand
// ("transform 0.35s cubic-bezier(...) 0s, background-color 0.25s ease 0s"). The timing longhands list one value per
// entry in declaration order, so comparing them as lists or sets pairs the wrong entries; here each property either side
// transitions is compared with the other side's entry for the same property (or its `all`), in both directions.
// The pose properties are one property: a draft's `transform` is a clone's `scale`, `translate`, `rotate` or an SGS
// motion custom property (`--sgs-mh-*`), so the pose entries compare as each side's set of timings. An entry taking no
// time and no delay animates nothing and is not an entry; a 0s entry with a delay (`visibility 0s .3s`, hide after a
// fade) is. A property listed twice takes its last entry, as CSS does.
const POSE = /^(--sgs-mh-.*|scale|translate|rotate|transform)$/;
// A shorthand transition animates its longhands: the first is the one it names (compared wherever either side lists it),
// the rest are implied (compared where the other side names them or where they move, sameTransitions' `changes`).
const SHORTHAND = {
	background: [ 'background-color', 'background-image', 'background-position', 'background-size' ],
	border: [ 'border-top-color', 'border-top-width', 'border-top-style', 'border-bottom-color', 'border-bottom-width', 'border-left-color', 'border-left-width', 'border-right-color', 'border-right-width' ],
	'border-top': [ 'border-top-color', 'border-top-width', 'border-top-style' ],
	'border-color': [ 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color' ],
	'border-width': [ 'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width' ],
	outline: [ 'outline-color', 'outline-width', 'outline-style', 'outline-offset' ],
	'text-decoration': [ 'text-decoration-color', 'text-decoration-line', 'text-decoration-thickness' ],
};
const TIME = /^-?[\d.]+m?s$/;
const TOKEN = /(?:cubic-bezier|steps|linear)\([^)]*\)|\S+/g;
const FIELD = { 'transition-duration': 'duration', 'transition-delay': 'delay', 'transition-timing-function': 'timing' };

const seconds = ( t ) => ( t.endsWith( 'ms' ) ? parseFloat( t ) / 1000 : parseFloat( t ) );

// Map of property → { duration, delay, timing, implied } (seconds as numbers, timing as text; implied for a shorthand's
// longhand it does not name), or null when unreadable.
export function parseTransitions( v ) {
	const out = new Map();
	if ( ! v || 'none' === v.trim() ) {
		return out;
	}
	for ( const part of v.split( /,(?![^(]*\))/ ) ) {
		const tokens = part.trim().match( TOKEN ) || [];
		const times = tokens.filter( ( t ) => TIME.test( t ) );
		const rest = tokens.filter( ( t ) => ! TIME.test( t ) );
		// A part with no property name ("0.25s ease") is Chrome's spelling of `all`.
		const named = rest.length && ! /^(ease|linear|step-|cubic-bezier|steps)/.test( rest[ 0 ] );
		const prop = named ? rest.shift() : 'all';
		const entry = { duration: seconds( times[ 0 ] ?? '0s' ), delay: seconds( times[ 1 ] ?? '0s' ), timing: rest.join( ' ' ) || 'ease' };
		if ( ! times.length && ! named ) {
			return null;
		}
		const longhands = SHORTHAND[ prop ] || [ prop ];
		longhands.forEach( ( key, i ) => {
			out.delete( key );
			if ( 0 !== entry.duration || 0 !== entry.delay ) {
				out.set( key, { ...entry, implied: i > 0 } );
			}
		} );
	}
	return out;
}

// An easing as the curve it names (CSS Easing Level 2): the keywords are their cubic-bezier() values (`linear` is
// cubic-bezier(0, 0, 1, 1)), and the step keywords and step positions their jump-* spelling (`step-start` is
// steps(1, jump-start); `step-end`, steps(1), steps(1, end) are steps(1, jump-end)). A bezier is its four numbers; any
// other easing (a linear() point list) is its text without spaces.
const KEYWORD = { ease: [ 0.25, 0.1, 0.25, 1 ], 'ease-in': [ 0.42, 0, 1, 1 ], 'ease-out': [ 0, 0, 0.58, 1 ], 'ease-in-out': [ 0.42, 0, 0.58, 1 ], linear: [ 0, 0, 1, 1 ] };
const STEP_KEYWORD = { 'step-start': 'steps(1,jump-start)', 'step-end': 'steps(1,jump-end)' };
const STEP_POSITION = { start: 'jump-start', end: 'jump-end' };
export function curve( t ) {
	const text = String( t ).replace( /\s+/g, '' ).toLowerCase();
	if ( KEYWORD[ text ] ) {
		return KEYWORD[ text ];
	}
	const bezier = text.match( /^cubic-bezier\(([^)]*)\)$/ );
	if ( bezier ) {
		const n = bezier[ 1 ].split( ',' ).map( Number );
		return 4 === n.length && n.every( Number.isFinite ) ? n : text;
	}
	const steps = text.match( /^steps\((\d+)(?:,([a-z-]+))?\)$/ );
	if ( steps ) {
		const at = steps[ 2 ] ?? 'jump-end';
		return `steps(${ steps[ 1 ] },${ STEP_POSITION[ at ] ?? at })`;
	}
	return STEP_KEYWORD[ text ] ?? text;
}
// Two easings are one curve: equal bezier numbers (within 0.001), or equal canonical text.
export function sameCurve( a, b ) {
	const [ x, y ] = [ curve( a ), curve( b ) ];
	if ( Array.isArray( x ) || Array.isArray( y ) ) {
		return Array.isArray( x ) && Array.isArray( y ) && x.every( ( v, i ) => Math.abs( v - y[ i ] ) < 0.001 );
	}
	return x === y;
}

const sameEntry = ( a, b, field ) => !! b && ( field ? [ field ] : [ 'duration', 'delay', 'timing' ] ).every( ( f ) => ( 'timing' === f ? sameCurve( a[ f ], b[ f ] ) : Math.abs( a[ f ] - b[ f ] ) < 0.001 ) );

// The longhand a logical size or box-side property sets in a horizontal writing mode (block-size is height,
// padding-block-start is padding-top), so a transition naming one is matched with a change read as the other.
const PHYSICAL = [ [ /block-size/, 'height' ], [ /inline-size/, 'width' ], [ /-block-start$/, '-top' ], [ /-block-end$/, '-bottom' ], [ /-inline-start$/, '-left' ], [ /-inline-end$/, '-right' ] ];
const physical = ( k ) => PHYSICAL.reduce( ( v, [ re, to ] ) => v.replace( re, to ), k );
// A box extent that differs between states (`box:h`, `box:w`, from lib/state-changes.mjs::everyStateChanges) moves
// that axis's sizes and every padding and margin.
const BOX_MOVES = { 'box:h': /^((min-|max-)?height|padding|margin)(-|$)/, 'box:w': /^((min-|max-)?width|padding|margin)(-|$)/ };
// Whether property k moves in a state: a change on k itself, on a longhand of k (a `border` transition and a
// border-top-color change) or on the shorthand k belongs to, or a box extent change that sizes k.
const movesIn = ( k, changes ) => {
	const p = physical( k );
	return changes.some( ( c ) => ( BOX_MOVES[ c ] ? BOX_MOVES[ c ].test( p ) : [ c, physical( c ) ].some( ( x ) => x === p || x.startsWith( `${ p }-` ) || p.startsWith( `${ x }-` ) ) ) );
};

// One side's pose entries (its `all` where it names none), as a list of distinct timings.
const poseSet = ( m ) => {
	const own = [ ...m ].filter( ( [ k ] ) => POSE.test( k ) ).map( ( [ , e ] ) => e );
	const list = own.length ? own : ( m.has( 'all' ) ? [ m.get( 'all' ) ] : [] );
	return list.filter( ( e, i ) => ! list.slice( 0, i ).some( ( x ) => sameEntry( e, x ) ) );
};

// Every property either side transitions has an entry on the other with the same timing (one longhand, or all three);
// the pose properties as equal sets of timings. `changes` (the properties that move in a state read on either side,
// when known) are compared too, so a draft `all` that animates a moving transform is not matched by a live colour-only
// transition; while they are unknown an `all` on one side only is itself compared. Null when either side cannot be
// read (the caller compares raw text).
// `everyState` says `changes` holds every property that moves in any state walked on either side at this width (the
// scrolled rest included, lib/state-changes.mjs::everyStateChanges), not only the hover, focus and pressed reads. Then
// an entry only one side names (the other has neither it nor an `all`) on a property in no change set animates
// nothing and is not compared (a live `color 0.25s` on an icon whose colour never changes). Only while both sides
// transition something: a side with no transition at all against one that has some (a draft `transition: none`
// against a live scroll-collapse transition) stays a difference whatever the walk saw move. The pose is compared as
// before.
export function sameTransitions( draft, live, longhand = null, changes = null, everyState = false ) {
	const d = parseTransitions( draft );
	const l = parseTransitions( live );
	if ( ! d || ! l ) {
		return null;
	}
	const field = longhand ? FIELD[ longhand ] : null;
	const keyOf = ( k ) => ( POSE.test( k ) ? 'pose' : k );
	const named = ( m ) => [ ...m ].filter( ( [ k, e ] ) => 'all' !== k && ! e.implied ).map( ( [ k ] ) => keyOf( k ) );
	const keys = new Set( [ ...named( d ), ...named( l ), ...( changes || [] ).filter( ( k ) => ! BOX_MOVES[ k ] ).flatMap( ( k ) => SHORTHAND[ k ] || [ k ] ).map( keyOf ) ] );
	if ( null === changes && ( d.has( 'all' ) || l.has( 'all' ) ) ) {
		keys.add( 'all' );
	}
	// A property one side does not transition differs in duration only (0s): its delay and easing are not rows too.
	const absent = ! [ null, 'duration' ].includes( field );
	const still = ( k ) => everyState && Array.isArray( changes ) && d.size > 0 && l.size > 0 && ! movesIn( k, changes );
	return [ ...keys ].every( ( k ) => {
		if ( 'pose' === k ) {
			const [ a, b ] = [ poseSet( d ), poseSet( l ) ];
			if ( ! a.length || ! b.length ) {
				return ! a.length && ! b.length ? true : absent;
			}
			return a.every( ( e ) => b.some( ( x ) => sameEntry( e, x, field ) ) ) && b.every( ( e ) => a.some( ( x ) => sameEntry( e, x, field ) ) );
		}
		const a = d.get( k ) ?? d.get( 'all' );
		const b = l.get( k ) ?? l.get( 'all' );
		if ( ! a || ! b ) {
			return ! a && ! b ? true : absent || still( k );
		}
		return sameEntry( a, b, field );
	} );
}

export const isTimingLonghand = ( p ) => p in FIELD;

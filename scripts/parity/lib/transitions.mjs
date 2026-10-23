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

const sameEntry = ( a, b, field ) => !! b && ( field ? [ field ] : [ 'duration', 'delay', 'timing' ] ).every( ( f ) => ( 'timing' === f ? a[ f ].replace( /\s+/g, '' ) === b[ f ].replace( /\s+/g, '' ) : Math.abs( a[ f ] - b[ f ] ) < 0.001 ) );

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
export function sameTransitions( draft, live, longhand = null, changes = null ) {
	const d = parseTransitions( draft );
	const l = parseTransitions( live );
	if ( ! d || ! l ) {
		return null;
	}
	const field = longhand ? FIELD[ longhand ] : null;
	const keyOf = ( k ) => ( POSE.test( k ) ? 'pose' : k );
	const named = ( m ) => [ ...m ].filter( ( [ k, e ] ) => 'all' !== k && ! e.implied ).map( ( [ k ] ) => keyOf( k ) );
	const keys = new Set( [ ...named( d ), ...named( l ), ...( changes || [] ).flatMap( ( k ) => SHORTHAND[ k ] || [ k ] ).map( keyOf ) ] );
	if ( null === changes && ( d.has( 'all' ) || l.has( 'all' ) ) ) {
		keys.add( 'all' );
	}
	// A property one side does not transition differs in duration only (0s): its delay and easing are not rows too.
	const absent = ! [ null, 'duration' ].includes( field );
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
			return ! a && ! b ? true : absent;
		}
		return sameEntry( a, b, field );
	} );
}

export const isTimingLonghand = ( p ) => p in FIELD;

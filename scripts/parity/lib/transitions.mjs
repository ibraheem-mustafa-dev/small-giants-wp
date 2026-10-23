// Transitions matched by the property they animate, read from the computed `transition` shorthand
// ("transform 0.35s cubic-bezier(...) 0s, background-color 0.25s ease 0s"). The timing longhands list one value per
// entry in declaration order, so comparing them as lists or sets pairs the wrong entries; here each property the
// draft transitions is compared with the live entry for the same property (or the live `all`).
// The pose properties are one property: a draft's `transform` is a clone's `scale`, `translate`, `rotate` or an SGS
// motion custom property (`--sgs-mh-*`). A 0s entry animates nothing and is not an entry.
const POSE = /^(--sgs-mh-.*|scale|translate|rotate|transform)$/;
// A shorthand transition is compared as the longhand the walker sees change: `background` paints as background-color.
const SHORTHAND = { background: 'background-color' };
const TIME = /^-?[\d.]+m?s$/;
const TOKEN = /(?:cubic-bezier|steps|linear)\([^)]*\)|\S+/g;
const FIELD = { 'transition-duration': 'duration', 'transition-delay': 'delay', 'transition-timing-function': 'timing' };

const seconds = ( t ) => ( t.endsWith( 'ms' ) ? parseFloat( t ) / 1000 : parseFloat( t ) );

// Map of property → { duration, delay, timing } (seconds as numbers, timing as text), or null when unreadable.
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
		const key = POSE.test( prop ) ? 'transform' : ( SHORTHAND[ prop ] ?? prop );
		if ( 0 === entry.duration || out.has( key ) ) {
			continue;
		}
		out.set( key, entry );
	}
	return out;
}

const sameEntry = ( a, b, field ) => !! b && ( field ? [ field ] : [ 'duration', 'delay', 'timing' ] ).every( ( f ) => ( 'timing' === f ? a[ f ].replace( /\s+/g, '' ) === b[ f ].replace( /\s+/g, '' ) : Math.abs( a[ f ] - b[ f ] ) < 0.001 ) );

// Every property the draft transitions has a live entry with the same timing (one longhand, or all three). A live
// entry the draft does not name is not compared. Null when either side cannot be read (the caller compares raw text).
export function sameTransitions( draft, live, longhand = null ) {
	const d = parseTransitions( draft );
	const l = parseTransitions( live );
	if ( ! d || ! l ) {
		return null;
	}
	const field = longhand ? FIELD[ longhand ] : null;
	// A draft that transitions nothing matches only a live element that transitions nothing.
	if ( ! d.size ) {
		return ! l.size;
	}
	if ( d.has( 'all' ) && 1 === d.size ) {
		return [ ...l.values() ].every( ( e ) => sameEntry( d.get( 'all' ), e, field ) );
	}
	// A property live does not transition differs in duration only (0s): its delay and easing are not rows too.
	return [ ...d ].every( ( [ prop, e ] ) => {
		const match = l.get( prop ) ?? l.get( 'all' );
		return match ? sameEntry( e, match, field ) : ! [ null, 'duration' ].includes( field );
	} );
}

export const isTimingLonghand = ( p ) => p in FIELD;

// How a surfaces.json state is opened, shared by intake's skeleton openers (lib/intake-skeletons.mjs::openers) and Fill's
// state opener (lib/fill-open.mjs::stateOpener): whether its state_keys are plain values (the plain-keys opener first) or
// descriptions (the reach opener, run from lib/intake-reach-calls.mjs::reachCalls, first), and the width bounds its
// comparison values set.

// A state_keys value that describes the state rather than giving a value to set: a JS literal ("{open:true}", "[]"), a
// comparison (">= 768"), a range ("768–1023") or an angle-bracket hole.
const NOT_A_VALUE = /^\s*(?:[[{].*[\]}]|[<>]=?\s*-?\d.*|-?\d+(?:\.\d+)?\s*[–-]\s*-?\d.*|<.*>)\s*$/;

// Whether every state_keys value of a state is a plain value: such a state tries its plain keys before its setState
// calls; a state with a described value tries the calls first.
export const plainState = ( st ) => Object.values( st?.state_keys || {} ).every( ( v ) => ! ( 'string' === typeof v && NOT_A_VALUE.test( v ) ) );

// The width bounds a state's comparison values set: [{ key, min, max }] in whole pixels (null: unbounded on that side).
// A comparison value in state_keys is a breakpoint (`{"w": ">= 768"}`, `"< 1060"`, `"768–1023"`): the state holds at the
// widths inside it, and the key is the viewport's, never a value of the state (lib/manifest-build.mjs::setsRealKey reads
// it the same way). `widthKeys` (a Set, widthStateKeys' entry for the state's component) keeps only the keys the draft
// writes from the width, so a range over another key (an accordion row `{"acc": "0–3"}`, a count `"> 0"`) is no bound;
// without it every comparison counts.
const COMPARE = /^\s*([<>]=?)\s*(-?\d+(?:\.\d+)?)\s*(?:px)?\s*$/;
const RANGE = /^\s*(-?\d+(?:\.\d+)?)\s*(?:px)?\s*[–-]\s*(-?\d+(?:\.\d+)?)\s*(?:px)?\s*$/;
export function widthBounds( st, widthKeys = null ) {
	const out = [];
	for ( const [ key, v ] of Object.entries( st?.state_keys || {} ) ) {
		if ( widthKeys && ! widthKeys.has( key ) ) {
			continue;
		}
		const c = 'string' === typeof v ? v.match( COMPARE ) : null;
		const r = 'string' === typeof v && ! c ? v.match( RANGE ) : null;
		if ( c ) {
			const n = Number( c[ 2 ] );
			out.push( { key, min: '>=' === c[ 1 ] ? Math.ceil( n ) : '>' === c[ 1 ] ? Math.floor( n ) + 1 : null, max: '<=' === c[ 1 ] ? Math.floor( n ) : '<' === c[ 1 ] ? Math.ceil( n ) - 1 : null } );
		} else if ( r ) {
			out.push( { key, min: Math.ceil( Number( r[ 1 ] ) ), max: Math.floor( Number( r[ 2 ] ) ) } );
		}
	}
	return out;
}

// Whether a width lies inside every bound (a null width, an unknown viewport, fits any).
export const fitsWidth = ( bounds, width ) => null == width || ( bounds || [] ).every( ( b ) => ( null == b.min || width >= b.min ) && ( null == b.max || width <= b.max ) );

// The ways to open a surface ([{ bounds, ... }]) offered at a width, in order: each whose bounds hold there.
export const waysHeldAt = ( ways, width ) => ( ways || [] ).filter( ( w ) => fitsWidth( w.bounds, width ) );

// The state keys each component writes from the viewport width, from intake's breakpoints (lib/intake-breakpoints.mjs::
// readBreakpoints: per draft file, each threshold's `variable` names the state key it compares, `state.w` or `effW (state.w)`):
// Map of component (the draft file's name without `.dc.html`) to a Set of keys. A draft whose thresholds compare no state key
// (`w (window.innerWidth)`) has an empty set.
export function widthStateKeys( breakpoints ) {
	const out = new Map();
	for ( const b of breakpoints || [] ) {
		const component = String( b.draft || '' ).replace( /\.dc\.html$/, '' );
		const keys = out.get( component ) ?? out.set( component, new Set() ).get( component );
		( b.thresholds || [] ).forEach( ( t ) => [ ...String( t.variable || '' ).matchAll( /\bstate\.([A-Za-z_$][\w$]*)/g ) ].forEach( ( m ) => keys.add( m[ 1 ] ) ) );
	}
	return out;
}

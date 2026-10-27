// The ways intake opens a state-driven surface before it reads it (Spec 48 §3.4 step 1; lib/intake-skeletons.mjs::openSurface
// applies them). State-driven surfaces (a drawer, a mega-menu panel, a modal) render only when their state opens. The ways to
// open one, in order: each surfaces.json state (a state named "open" first; "closed" and "default" never) by its plain state
// keys (`state`: identifier keys with concrete values) and by the setState calls its how_to_reach gives (`reach`, run on the
// component's logic as the draft's own code would); a state whose keys are all plain JSON-safe values tries `state` first,
// one with a key holding a JS literal ("{open:true}", "[]") or a comparison (">= 768", "768–1023") tries `reach` first
// (lib/state-reach.mjs::plainState). Then each template handler of the surface's component whose method `opened_by` names.
// A state whose state_keys bound the width the draft writes from the viewport (`{"w": ">= 768"}`, lib/state-reach.mjs::
// widthBounds over the component's width keys) is offered only at the widths inside it and its bound keys are never set from
// the state (`bounds`; the reader puts them to the viewport's value after opening, lib/intake-skeletons.mjs::markAt), as Fill
// opens it (lib/fill-open.mjs::stateOpener).
import { reachCalls } from './intake-reach-calls.mjs';
import { plainState, widthBounds, fitsWidth, waysHeldAt } from './state-reach.mjs';

const IDENT = /^[A-Za-z_$][\w$]*$/;

// s: a surfaceRoots surface; census: the census (template handlers); widthKeys: lib/state-reach.mjs::widthStateKeys (a Map of
// component to its width keys), or null to read every comparison as a width bound. Returns [{ via, state?, keys? | calls? |
// draftId?, bounds? (only when the state bounds the width) }].
export function openers( s, census = null, widthKeys = null ) {
	const shut = ( st ) => /^(closed|default)$/i.test( st.name || '' );
	const concrete = ( keys ) => keys.length && keys.every( ( [ n, v ] ) => IDENT.test( n ) && ! ( 'string' === typeof v && /^<.*>$/.test( v ) ) );
	const states = ( s.states || [] ).filter( ( st ) => ! shut( st ) ).sort( ( a, b ) => Number( ! /open/i.test( a.name ) ) - Number( ! /open/i.test( b.name ) ) );
	const own = widthKeys ? widthKeys.get( s.component ) ?? new Set() : null;
	const out = states.flatMap( ( st ) => {
		const bounds = widthBounds( st, own );
		const held = new Set( bounds.map( ( b ) => b.key ) );
		const keys = Object.entries( st.state_keys || {} ).filter( ( [ k ] ) => ! held.has( k ) );
		const bound = bounds.length ? { bounds } : {};
		const set = concrete( keys ) ? [ { via: 'state', state: st.name, keys: Object.fromEntries( keys ), ...bound } ] : [];
		const calls = reachCalls( st.how_to_reach );
		const reach = calls.length ? [ { via: 'reach', state: st.name, calls, ...bound } ] : [];
		return plainState( st ) ? [ ...set, ...reach ] : [ ...reach, ...set ];
	} );
	const named = new Set( String( s.openedBy || '' ).match( /[A-Za-z_$][\w$]*(?=\s*\()|\b[a-z]+[A-Z][\w$]*\b/g ) || [] );
	for ( const r of census?.rows || [] ) {
		if ( 'handler' === r.kind && 'template' === r.detail?.wiring && r.component === s.component && r.detail.event && ( named.has( r.detail.method ) || named.has( r.detail.expression ) ) ) {
			out.push( { via: 'trigger', draftId: r.draftId, event: r.detail.event, method: r.detail.method ?? null } );
		}
	}
	return out;
}

// The way that opens the surface at a width while `first` is being tried: `first` where its bounds hold, else the first way of
// `list` held there (the same state at its other breakpoint); null when no way holds at the width.
export const wayAt = ( list, first, width ) => ( fitsWidth( first.bounds, width ) ? first : waysHeldAt( list, width )[ 0 ] ?? null );

export const describeOpener = ( o ) => ( 'state' === o.via ? `state "${ o.state }" ${ JSON.stringify( o.keys ) }` : 'reach' === o.via ? `reach "${ o.state }" ${ o.calls.map( ( c ) => `${ c.ident }.setState(${ c.args })` ).join( '; ' ) }` : `trigger ${ o.event } on ${ o.draftId }${ o.method ? ` (${ o.method })` : '' }` );

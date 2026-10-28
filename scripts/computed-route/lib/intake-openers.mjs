// The ways intake opens a state-driven surface before it reads it (Spec 48 §3.4 step 1; lib/intake-skeletons.mjs::openSurface
// applies them). State-driven surfaces (a drawer, a mega-menu panel, a modal) render only when their state opens. The ways to
// open one, in order: each surfaces.json state's `state` and `reach` ways, built by lib/state-openers.mjs::stateWays (the
// one builder Fill's lib/fill-open.mjs::stateOpener calls too: which states open, in which order, what is a value, which keys
// are width bounds over the component's width keys, which way first), then each template handler of the surface's
// component whose method `opened_by` names. A state whose state_keys bound the width the draft writes from the viewport
// (`{"w": ">= 768"}`) is offered only at the widths inside it (`bounds`; the reader puts the bound keys to the viewport's
// value after opening, lib/intake-skeletons.mjs::markAt).
import { fitsWidth, waysHeldAt } from './state-reach.mjs';
import { openStates, stateWays } from './state-openers.mjs';

// s: a surfaceRoots surface; census: the census (template handlers); widthKeys: lib/state-reach.mjs::widthStateKeys (a Map of
// component to its width keys; a component it does not name has none). Returns [{ via, state?, keys? | calls? | draftId?,
// bounds? (only when the state bounds the width) }].
export function openers( s, census = null, widthKeys = null ) {
	const own = widthKeys?.get( s.component ) ?? new Set();
	const out = stateWays( openStates( s.states ), { own } ).ways.map( ( { dropped, bounds, ...w } ) => ( bounds.length ? { ...w, bounds } : w ) );
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

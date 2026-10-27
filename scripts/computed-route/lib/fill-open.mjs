// Fill's state opener (FR-48-13, FR-48-34): a surface that exists only while a draft state holds (a drawer, a mega-menu
// panel, a modal) is opened before it is read, through the runtime paths intake uses (lib/intake-state.mjs::setDraftState
// and ::reachDraftState). The state comes from the handoff record the surface's intake skeleton names (`surfaces.json`
// `states` names it), and each state is opened two ways, in intake's order (lib/state-reach.mjs):
//   - `state`: its keys set directly, offering only what the draft's runtime can act on: a key that is a state key of the
//     live component (facts.json `state[<component>].keys`), never a render value (`R.pin`, `item.current`), a
//     width-derived key (`widthKeys`, `isDesktop`), an underscore key (`_closing`) or a form-control selector
//     (`select[name=role]`), with a concrete value, never a placeholder (`<page>-<bi>`, `{…}`, `IND-######`) or prose;
//   - `reach`: the `<ident>.setState(<args>)` calls its how_to_reach gives, run on the component's own logic, with the
//     keys its width bounds name (`{"w": ">= 768"}`) put back to the viewport's values after the calls.
// A state whose keys are all plain values tries `state` first; one holding a description (`"{open:true}"`, `">= 768"`)
// tries `reach` first. A state with width bounds is offered only at the widths inside them.
// A component a route mounts has no live instance until the route loads, so the record's route is loaded first. A state
// whose listed `sc_if_tpl_ids` did not render is refused (a gap row naming the state and the reason), never read as a
// closed surface.
import { setDraftState, reachDraftState, logicState } from './intake-state.mjs';
import { reachCalls } from './intake-reach-calls.mjs';
import { plainState, widthBounds, fitsWidth } from './state-reach.mjs';
import { ROOT_HOST, isStatePage, stateRouteHash } from './state-route.mjs';
import { settleAnimations } from '../../parity/lib/devtools.mjs';

// The property an UNMAPPED row names for a refused state: no one property was read.
export const STATE_REFUSED = '(state opener)';

// The name the runtime gives the served entry draft's component (lib/state-route.mjs).
export { ROOT_HOST };
const IDENT = /^[A-Za-z_$][\w$]*$/;
const CLOSED = /^(closed|default)$/i;
const lower = ( s ) => String( s ).toLowerCase();

// Whether a state value is a description rather than a value: an angle-bracket hole, a braced sketch, an ellipsis, a run
// of `#`, a comparison (`> 0`) or prose of three words or more. Objects and arrays count when any key or value does.
export function isPlaceholder( v ) {
	if ( Array.isArray( v ) ) {
		return v.some( isPlaceholder );
	}
	if ( v && 'object' === typeof v ) {
		return Object.entries( v ).some( ( [ k, x ] ) => isPlaceholder( k ) || isPlaceholder( x ) );
	}
	if ( 'string' !== typeof v ) {
		return false;
	}
	return /<[^>]*>|^\{.*\}$|…|â€¦|#{3,}|^[<>]=?\s*\d/.test( v ) || /\S+\s+\S+\s+\S+/.test( v.trim() );
}

// Splits a state's keys into the ones that can be set and the ones that cannot, each with its reason.
// live: the component's `facts.json` `state` entry ({ keys, widthKeys }), or null when the fact record is missing (the
// name shape is then all that can be judged).
export function usableKeys( keys, live ) {
	const use = {};
	const dropped = [];
	for ( const [ name, value ] of Object.entries( keys || {} ) ) {
		const why = ! IDENT.test( name ) ? 'a render value or selector, not a state key name'
			: name.startsWith( '_' ) ? 'an underscore key the component sets itself'
				: live && ( live.widthKeys || [] ).includes( name ) ? 'derived from the viewport width'
					: live && ! ( live.keys || [] ).includes( name ) ? 'not a state key of the component (facts.json state keys)'
						: widthBounds( { state_keys: { [ name ]: value } } ).length ? 'a width bound the viewport holds, not a value'
							: isPlaceholder( value ) ? 'a placeholder or description, not a value' : null;
		why ? dropped.push( { key: name, why } ) : ( use[ name ] = value );
	}
	return { keys: use, dropped };
}

// The hash a record's route is opened at, or null for the entry page ('*', '/' or none).
export const routeHash = ( route ) => ( null == route || [ '*', '/', '' ].includes( route ) ? null : `#/${ String( route ).replace( /^#?\/?/, '' ) }` );

// The url with its hash replaced by the record's route; unchanged for an entry-page record. A state-page export
// (`routing`, intake.json `routing`) has no URL for a route: the hash is the state route lib/state-route.mjs::applyStateRoute
// sets on the loaded draft.
export function withRoute( url, route, routing = null ) {
	const state = isStatePage( routing ) ? stateRouteHash( route ) : null;
	const hash = isStatePage( routing ) ? ( state ? `#${ state }` : null ) : routeHash( route );
	return hash ? `${ String( url ).split( '#' )[ 0 ] }${ hash }` : url;
}

// The url Fill reads a surface at: a state-driven surface (`opener`) at its record's route, and any surface of a state-page
// export (`routing`, intake.json `routing`) at its own route's state, since such a draft has no URL for a route. Every other
// surface keeps the url it was given (a hash draft's page surfaces carry their route in the url already).
export function readUrlOf( { url, opener, record, routing } ) {
	return opener || isStatePage( routing ) ? withRoute( url, opener?.route ?? record?.route ?? null, routing ) : url;
}

// The opener for one surface, or null when the surface is not state-driven (its intake skeleton's root does not exist
// without a state). entry: the `surfaces.json` entry; skeleton: intake.json `skeletons[<intakeSurface>]`; record: the
// handoff `surfaces.json` record (`skeleton.id`); facts: the fact record or null; rootComponent: the served entry draft's
// component, which the runtime hosts as `Root` (every other component keeps its own name).
// Returns { id, component (the runtime's host name), dc (the record's component, the facts key), route, ways, state,
// keys, calls, dropped, expect, refused: [ { state, reason } ] }. `ways` lists every way to open the surface in the order
// they are tried: [{ via ('state' | 'reach'), state, keys | calls, dropped, expect, bounds }] (candidate states named
// open first, each state's two ways in plainState's order); `state`, `keys`, `calls`, `dropped` and `expect` are the
// first way's. `state` is null when no candidate state has a way (each is refused with its reason).
export function stateOpener( { entry, skeleton, record, facts, rootComponent = null } ) {
	if ( ! skeleton?.root?.viaState ) {
		return null;
	}
	const base = { id: skeleton.id ?? null, component: record && record.dc === rootComponent ? ROOT_HOST : record?.dc ?? null, dc: record?.dc ?? null, route: record?.route ?? null, state: null, keys: {}, dropped: [], expect: [], refused: [] };
	if ( ! record ) {
		return { ...base, refused: [ { state: null, reason: `no handoff record ${ skeleton.id } in surfaces.json, so no state is known` } ] };
	}
	const named = new Set( Object.keys( entry?.states || {} ).map( lower ) );
	const pool = ( record.states || [] ).filter( ( s ) => ! CLOSED.test( s.name || '' ) );
	let candidates = pool.filter( ( s ) => named.has( lower( s.name ) ) );
	if ( ! candidates.length && skeleton.opened?.state ) {
		candidates = pool.filter( ( s ) => lower( s.name ) === lower( skeleton.opened.state ) );
	}
	if ( ! candidates.length ) {
		return { ...base, refused: [ { state: null, reason: `no state of record ${ record.id } is named by the surface's states (${ [ ...named ].join( ', ' ) || 'none' })` } ] };
	}
	candidates.sort( ( a, b ) => Number( ! /open/i.test( a.name ) ) - Number( ! /open/i.test( b.name ) ) );
	// The same state at another breakpoint joins it: a record state with width bounds whose other keys equal a bounded
	// candidate's (the walker state map keeps one of the two, since a breakpoint is never a state of its own).
	const unbound = ( s ) => {
		const held = new Set( widthBounds( s ).map( ( b ) => b.key ) );
		return JSON.stringify( Object.entries( s.state_keys || {} ).filter( ( [ k ] ) => ! held.has( k ) ).sort( ( [ a ], [ b ] ) => ( a < b ? -1 : 1 ) ) );
	};
	const bounded = candidates.filter( ( c ) => widthBounds( c ).length );
	candidates.push( ...pool.filter( ( s ) => ! candidates.includes( s ) && widthBounds( s ).length && bounded.some( ( c ) => unbound( c ) === unbound( s ) ) ) );
	const live = facts?.state?.[ record.dc ] ?? null;
	const refused = [];
	const ways = [];
	for ( const s of candidates ) {
		const { keys, dropped } = usableKeys( s.state_keys, live );
		const common = { state: s.name, dropped, expect: ( s.sc_if_tpl_ids || [] ).map( String ), bounds: widthBounds( s ) };
		const set = Object.keys( keys ).length ? [ { via: 'state', ...common, keys } ] : [];
		const calls = reachCalls( s.how_to_reach );
		const reach = calls.length ? [ { via: 'reach', ...common, calls } ] : [];
		const own = plainState( s ) ? [ ...set, ...reach ] : [ ...reach, ...set ];
		own.length ? ways.push( ...own ) : refused.push( { state: s.name, reason: `no usable state key (${ dropped.map( ( d ) => `${ d.key }: ${ d.why }` ).join( '; ' ) || 'the state sets none' }) and no setState call in its how_to_reach` } );
	}
	const first = ways[ 0 ];
	return first ? { ...base, ways, state: first.state, keys: first.keys ?? {}, calls: first.calls ?? [], dropped: first.dropped, expect: first.expect, refused } : { ...base, ways, refused };
}

// The ways of an opener offered at a width (every way when the width is unknown), in order; an opener built without
// `ways` is its own one `state` way.
export const waysAt = ( opener, width ) => ( opener.ways || [ { via: 'state', state: opener.state, keys: opener.keys, expect: opener.expect || [], bounds: [] } ] ).filter( ( w ) => fitsWidth( w.bounds, width ) );

// The way each read width opened with: { [width]: index into `opener.ways` } from openState's verdicts ({ [width]:
// verdict }), for the walker config to open the same way (openerSource).
export const openedAt = ( opener, widths ) => Object.fromEntries( Object.entries( widths || {} ).filter( ( [ , v ] ) => v?.ok ).map( ( [ w, v ] ) => [ w, ( opener.ways || [] ).findIndex( ( x ) => x.state === v.state && x.via === v.via ) ] ).filter( ( [ , i ] ) => i >= 0 ) );

// One line per way, for the run log: `"<state>" <how>[ at <bounds>]`.
export const describeWays = ( opener ) => ( opener.ways || [] ).map( ( w ) => `"${ w.state }" ${ describeWay( w ) }${ w.bounds.length ? ` at ${ boundsText( w.bounds ) }` : '' }` ).join( ' | ' );

const describeWay = ( w ) => ( 'reach' === w.via ? w.calls.map( ( c ) => `${ c.ident }.setState(${ c.args })` ).join( '; ' ) : `setting ${ JSON.stringify( w.keys ) }` );
const boundsText = ( b ) => b.map( ( x ) => `${ x.key } ${ null == x.min ? `<= ${ x.max }` : null == x.max ? `>= ${ x.min }` : `${ x.min }-${ x.max }` }` ).join( ', ' );

// In-page: how many of `tpls` the live copies of `component` render, judged as lib/intake-skeletons.mjs::markRoot does:
// an element renders when a live copy carries its id; an sc-if, sc-for or sc-else renders when an element it stamps is live.
export function renderedTpls( { component, tpls } ) {
	const hostName = ( e ) => e.parentElement?.closest( '.sc-host' )?.dataset.scName;
	const template = document.createElement( 'template' );
	template.innerHTML = window.__dcAnnotatedTemplate ? window.__dcAnnotatedTemplate( component ) || '' : '';
	const live = new Set( [ ...document.querySelectorAll( '[data-dc-tpl]' ) ].filter( ( e ) => hostName( e ) === component ).map( ( e ) => e.dataset.dcTpl ) );
	return tpls.filter( ( n ) => {
		const src = template.content.querySelector( `[data-dc-tpl="${ n }"]` );
		if ( ! src || ! /^sc-(if|for|else)$/.test( src.localName ) ) {
			return live.has( n );
		}
		return [ ...src.querySelectorAll( '[data-dc-tpl]' ) ].some( ( x ) => live.has( x.dataset.dcTpl ) );
	} ).length;
}

// Applies the opener on an open draft page (the route already loaded) at `width` (the page's viewport when not given) and
// judges it: { state, via, reached (instances set), rendered (of `expected`), expected, ok, reason }. Each way offered at
// the width is tried in order until one opens; `ok` when a way reached an instance and, where its state lists sc-if ids,
// at least one rendered. The verdict is the opening way's, else the last way's carrying every tried way's reason.
export async function openState( page, opener, width = null ) {
	const at = width ?? page.viewportSize?.()?.width ?? null;
	const ways = waysAt( opener, at );
	if ( ! ways.length ) {
		const held = [ ...new Set( ( opener.ways || [] ).map( ( w ) => `"${ w.state }": ${ boundsText( w.bounds ) }` ) ) ];
		return { state: null, via: null, reached: 0, rendered: 0, expected: 0, ok: false, reason: `no state of ${ opener.id ?? 'the surface' } holds at ${ at }px (${ held.join( '; ' ) })` };
	}
	const reasons = [];
	let verdict = null;
	for ( const way of ways ) {
		verdict = await openWay( page, opener, way );
		if ( verdict.ok ) {
			return verdict;
		}
		reasons.push( verdict.reason );
	}
	return { ...verdict, reason: reasons.join( '; ' ) };
}

// One way of an opener: its keys set, or its setState calls run with its width-bound keys kept at the viewport's values.
async function openWay( page, opener, way ) {
	const expected = way.expect.length;
	const where = routeHash( opener.route );
	const on = where ? ` on ${ where }` : ' on the entry page';
	const reached = 'reach' === way.via
		? await reachDraftState( page, { component: opener.component, calls: way.calls, keep: way.bounds.map( ( b ) => b.key ) } )
		: await setDraftState( page, { component: opener.component, keys: way.keys } );
	const head = { state: way.state, via: way.via };
	if ( ! reached ) {
		return { ...head, reached: 0, rendered: 0, expected, ok: false, reason: 'reach' === way.via ? `${ describeWay( way ) } reached no live ${ opener.component }${ on } (not mounted, or a call threw)` : `${ opener.component } has no live instance${ on }` };
	}
	await settleAnimations( page, { floor: 400, cap: 3000 } );
	const rendered = expected ? await page.evaluate( renderedTpls, { component: opener.component, tpls: way.expect } ) : null;
	const ok = ! expected || rendered > 0;
	return { ...head, reached, rendered, expected, ok, reason: ok ? null : `none of the ${ expected } sc-if ids of state "${ way.state }" (${ way.expect.join( ', ' ) }) rendered after ${ describeWay( way ) }` };
}

// The walker config's draft `open` function text for an opener: at the page's width it applies the way Fill opened the
// surface with there (`opener.openedAt`, { [width]: index into `ways` }), else the first way offered at that width,
// through lib/intake-state.mjs::logicState carried as source text (keys set, or setState calls run with the width-bound
// keys kept), then waits for the re-render.
export function openerSource( opener ) {
	const ways = ( opener.ways || waysAt( opener, null ) ).map( ( w ) => ( { op: 'reach' === w.via ? 'reach' : 'set', patch: 'reach' === w.via ? { calls: w.calls, keep: w.bounds.map( ( b ) => b.key ) } : w.keys, bounds: w.bounds || [] } ) );
	return `async ( h ) => {
		const ways = ${ JSON.stringify( ways ) };
		const at = ${ JSON.stringify( opener.openedAt || {} ) };
		const width = h.page.viewportSize?.()?.width ?? null;
		const fits = ${ fitsWidth.toString() };
		const way = ways[ at[ width ] ] || ways.find( ( w ) => fits( w.bounds, width ) );
		if ( way ) {
			await h.page.evaluate( ${ logicState.toString() }, { comp: ${ JSON.stringify( opener.component ) }, op: way.op, patch: way.patch } );
		}
		await h.page.waitForTimeout( 900 );
	}`;
}

// The UNMAPPED rows of the refused states (a gap row naming the state and the reason), attached to the surface's root
// node. nodes: the skeleton nodes; flat[index]: the tree node; refOf: its ref.
export function refusalRows( { opener, nodes, flat, refOf } ) {
	const root = nodes.find( ( n ) => null === n.parent ) ?? nodes[ 0 ];
	return ( opener?.refused || [] ).map( ( r ) => ( { node: root ? refOf( flat[ root.index ] ) : null, block: root?.name ?? '', slot: '', property: STATE_REFUSED, value: r.state ?? '', state: null, reason: `state-refused: ${ r.state ? `state "${ r.state }"` : 'no state' } of ${ opener.id ?? 'the surface' } was not opened: ${ r.reason }` } ) );
}

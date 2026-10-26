// Fill's state opener (FR-48-13, FR-48-34): a surface that exists only while a draft state holds (a drawer, a mega-menu
// panel) is opened before it is read, through the same runtime path intake uses (lib/intake-state.mjs::setDraftState).
// The state comes from the handoff record the surface's intake skeleton names (`surfaces.json` `states` names it), and
// only what the draft's runtime can act on is offered:
//   - a key that is a state key of the live component (facts.json `state[<component>].keys`), never a render value
//     (`R.pin`, `item.current`), a width-derived key (`widthKeys`, `isDesktop`), an underscore key (`_closing`) or a
//     form-control selector (`select[name=role]`);
//   - a value that is concrete: never a placeholder (`<page>-<bi>`, `{…}`, `IND-######`) or prose.
// A component a route mounts has no live instance until the route loads, so the record's route is loaded first. A state
// whose listed `sc_if_tpl_ids` did not render is refused (a gap row naming the state and the reason), never read as a
// closed surface.
import { setDraftState } from './intake-state.mjs';
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
// Returns { id, component (the runtime's host name), dc (the record's component, the facts key), route, state, keys, dropped, expect, refused: [ { state, reason } ] }; `state` is null when
// every candidate state was refused. The first usable state opens the surface (a state named open first).
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
	const live = facts?.state?.[ record.dc ] ?? null;
	const refused = [];
	for ( const s of candidates ) {
		const { keys, dropped } = usableKeys( s.state_keys, live );
		if ( Object.keys( keys ).length ) {
			return { ...base, state: s.name, keys, dropped, expect: ( s.sc_if_tpl_ids || [] ).map( String ), refused };
		}
		refused.push( { state: s.name, reason: `no usable state key (${ dropped.map( ( d ) => `${ d.key }: ${ d.why }` ).join( '; ' ) || 'the state sets none' })` } );
	}
	return { ...base, refused };
}

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

// Applies the opener on an open draft page (the route already loaded) and judges it: { reached (instances set), rendered
// (of `expected`), expected, reason }. `ok` when an instance was reached and, where the record lists sc-if ids, at least
// one rendered.
export async function openState( page, opener ) {
	const expected = opener.expect.length;
	const reached = await setDraftState( page, { component: opener.component, keys: opener.keys } );
	if ( ! reached ) {
		const where = routeHash( opener.route );
		return { reached: 0, rendered: 0, expected, ok: false, reason: `${ opener.component } has no live instance${ where ? ` on ${ where }` : ' on the entry page' }` };
	}
	await settleAnimations( page, { floor: 400, cap: 3000 } );
	const rendered = expected ? await page.evaluate( renderedTpls, { component: opener.component, tpls: opener.expect } ) : null;
	const ok = ! expected || rendered > 0;
	return { reached, rendered, expected, ok, reason: ok ? null : `none of the ${ expected } sc-if ids of state "${ opener.state }" (${ opener.expect.join( ', ' ) }) rendered after setting ${ JSON.stringify( opener.keys ) }` };
}

// In-page: sets `keys` on each live instance of `component` through the draft's own setState (the path of
// lib/intake-state.mjs, written out so the generated walker config can carry it as source text).
export function setStateInPage( { component, keys } ) {
	for ( const host of document.querySelectorAll( '.sc-host' ) ) {
		const name = host.dataset.scName;
		if ( name !== component ) {
			continue;
		}
		const key = Object.keys( host ).find( ( k ) => k.startsWith( '__reactFiber$' ) );
		let f = key ? host[ key ] : null;
		while ( f && ! ( f.stateNode && f.stateNode.logic && f.stateNode.__name === name ) ) {
			f = f.return;
		}
		f && f.stateNode.logic.setState( keys );
	}
}

// The walker config's draft `open` function text for an opener: sets the state, then waits for the re-render.
export const openerSource = ( opener ) => `async ( h ) => {\n\t\tawait h.page.evaluate( ${ setStateInPage.toString().replace( /\n\t*/g, ' ' ) }, ${ JSON.stringify( { component: opener.component, keys: opener.keys } ) } );\n\t\tawait h.page.waitForTimeout( 900 );\n\t}`;

// The UNMAPPED rows of the refused states (a gap row naming the state and the reason), attached to the surface's root
// node. nodes: the skeleton nodes; flat[index]: the tree node; refOf: its ref.
export function refusalRows( { opener, nodes, flat, refOf } ) {
	const root = nodes.find( ( n ) => null === n.parent ) ?? nodes[ 0 ];
	return ( opener?.refused || [] ).map( ( r ) => ( { node: root ? refOf( flat[ root.index ] ) : null, block: root?.name ?? '', slot: '', property: STATE_REFUSED, value: r.state ?? '', state: null, reason: `state-refused: ${ r.state ? `state "${ r.state }"` : 'no state' } of ${ opener.id ?? 'the surface' } was not opened: ${ r.reason }` } ) );
}

// The walker states a generated walker config walks (Spec 48 §3.6, FR-48-13): every state the surface's `surfaces.json`
// entry maps, in its order, each opened by the record state it names (lib/state-openers.mjs::stateWays, the one builder Fill's
// state opener and intake use, over the same width keys) and walked only at the widths that state holds at
// (lib/state-reach.mjs::waysHeldAt).
// - The first state is the page as the config's own `open` leaves it (the walker's rest): its record state's way is
//   applied when it has one, and it is never refused.
// - Every later state loads the page afresh (`from: 'rest'`): a logic state (a signed-in user, a sent form) leaves no mark
//   the walker's rest signature reads, so the next state would otherwise start inside it.
// - A later state is refused (listed, never walked) when no record state is named by it, or when its record state has no
//   way to open it and no width bounds (a width-only state is walked at its widths with no action).
// - The live side reaches a state through the setting state it maps to: a setting state the vocabulary reaches by scroll
//   (`scrolled`, `states.reach = 'scroll'`) scrolls the window on both sides; a state-driven surface's states are open on
//   live through the config's own live `open` (the surface's control, lib/fill-open.mjs::openOwner); any other mapped
//   setting state opens the surface's live root through the control that names it in aria-controls, and says so when
//   nothing does. A state mapped to rest has no live action: the live page at rest is that state.
import { ROOT_HOST, openOwner, STATE_REFUSED } from './fill-open.mjs';
import { stateWays, noWayReason } from './state-openers.mjs';
import { fitsWidth, widthBounds } from './state-reach.mjs';
import { walkerKey } from './manifest-build.mjs';
import { logicState } from './intake-state.mjs';

const lower = ( s ) => String( s ).toLowerCase();
// How far a scroll-reached state scrolls the window: past any header's shrink threshold on a page that long.
const SCROLL_TO = 600;

// The record states a walker state names: by the state's name or its walker key (lib/manifest-build.mjs::walkerKey).
const namedBy = ( key, record ) => ( record?.states || [] ).filter( ( s ) => lower( s.name ) === lower( key ) || walkerKey( s.name || '' ) === key );

// How the live side reaches a setting state: 'scroll', 'owner' or null (see the head of this file).
function liveReach( settingState, vocab, opener ) {
	if ( null == settingState ) {
		return null;
	}
	if ( ( vocab || [] ).some( ( r ) => r.state === settingState && 'scroll' === r.reach ) ) {
		return 'scroll';
	}
	return opener?.state ? null : 'owner';
}

// The way the config's draft `open` applies at a width (lib/fill-open.mjs::openerSource): the one Fill opened with
// there, else the first offered there. Its state name, or null.
function openedState( opener, width ) {
	if ( ! opener?.state ) {
		return null;
	}
	const ways = opener.ways || [];
	const way = ways[ opener.openedAt?.[ width ] ] || ways.find( ( w ) => fitsWidth( w.bounds, width ) );
	return way?.state ?? null;
}

// The walker states of one surface: { states: [{ name, settingState, ways, widths (null: every width), reach, skipAt }],
// refused: [{ state, reason }] }. entry: the `surfaces.json` entry; record: the handoff record its intake skeleton names
// (null when none); facts: the fact record or null; rootComponent: the served entry draft's component; vocab: the state
// vocabulary rows (lib/db.mjs::statesVocabulary); opener: the surface's state opener (with `openedAt`) or null;
// widthKeys: the state keys each component writes from the width (lib/state-reach.mjs::widthStateKeys over intake.json
// `breakpoints`, the map Fill's opener reads), the only keys a state's comparison bounds; widths: the config's walk widths. `skipAt` lists the widths where the config's own `open` already opened the same
// record state, so the state's action does not apply it twice (a toggling setState call would close it again).
export function walkerStates( { entry, record = null, facts = null, rootComponent = null, vocab = [], opener = null, widthKeys = null, widths } ) {
	const names = Object.keys( entry?.states || {} );
	const live = facts?.state?.[ record?.dc ] ?? null;
	const own = widthKeys?.get( record?.dc ) ?? new Set();
	const expect = ( s ) => ( { expect: ( s.sc_if_tpl_ids || [] ).map( String ) } );
	const out = { states: [], refused: [] };
	names.forEach( ( name, i ) => {
		const settingState = entry.states[ name ];
		const recordStates = namedBy( name, record );
		const built = recordStates.map( ( s ) => stateWays( [ s ], { own, live, extra: expect } ) );
		const ways = built.flatMap( ( b ) => b.ways );
		const bounds = recordStates.map( ( s ) => widthBounds( s, own ) );
		if ( i > 0 && ! recordStates.length ) {
			out.refused.push( { state: name, reason: record ? `no state of record ${ record.id } is named "${ name }"` : 'the surface names no handoff record, so no state is known' } );
			return;
		}
		if ( i > 0 && ! ways.length && ! bounds.some( ( b ) => b.length ) ) {
			out.refused.push( { state: name, reason: built.map( ( b, j ) => `"${ recordStates[ j ].name }": ${ noWayReason( b.refused[ 0 ]?.dropped ) }` ).join( '; ' ) } );
			return;
		}
		const held = bounds.length ? widths.filter( ( w ) => bounds.some( ( b ) => fitsWidth( b, w ) ) ) : widths;
		if ( ! held.length ) {
			out.refused.push( { state: name, reason: `it holds at none of the walk widths (${ widths.join( ', ' ) }px)` } );
			return;
		}
		const skipAt = held.filter( ( w ) => recordStates.some( ( s ) => s.name === openedState( opener, w ) ) );
		out.states.push( { name, settingState, ways, widths: held.length === widths.length ? null : held, reach: liveReach( settingState, vocab, opener ), skipAt } );
	} );
	out.component = record ? ( record.dc === rootComponent ? ROOT_HOST : record.dc ) : null;
	return out;
}

// In-page: scrolls the window as a visitor would, at most `to` pixels and no further than the page goes.
export function scrollPage( to ) {
	window.scrollTo( 0, Math.max( 0, Math.min( to, document.documentElement.scrollHeight - innerHeight ) ) );
	return scrollY;
}

// The walker state's draft action text: the window scrolled first for a scroll-reached state, then the state's way at
// the page's width (none at a `skipAt` width) applied through lib/intake-state.mjs::logicState; a way that reaches no live
// instance is logged as a miss, so the walker reports the state as not triggered rather than reading the page as it was.
export function stateDraftSource( state, component ) {
	const ways = state.ways.map( ( w ) => ( { op: 'reach' === w.via ? 'reach' : 'set', patch: 'reach' === w.via ? { calls: w.calls, keep: w.bounds.map( ( b ) => b.key ) } : w.keys, bounds: w.bounds || [] } ) );
	return `async ( h ) => {
		${ 'scroll' === state.reach ? `await h.page.evaluate( ${ scrollPage.toString() }, ${ SCROLL_TO } );
		await h.page.waitForTimeout( 400 );` : '' }
		const ways = ${ JSON.stringify( ways ) };
		const width = h.page.viewportSize?.()?.width ?? null;
		const fits = ${ fitsWidth.toString() };
		const way = ${ JSON.stringify( state.skipAt ) }.includes( width ) ? null : ways.find( ( w ) => fits( w.bounds, width ) );
		if ( way ) {
			const reached = await h.page.evaluate( ${ logicState.toString() }, { comp: ${ JSON.stringify( component ) }, op: way.op, patch: way.patch } );
			h.log.push( { type: 'click', target: ${ JSON.stringify( `state "${ state.name }" on ${ component }` ) }, hit: reached > 0 } );
		}
		await h.page.waitForTimeout( 900 );
	}`;
}

// The walker state's live action text, or null when the live page needs none (see liveReach). `root`: the surface's live
// root (lib/fill-config.mjs::surfaceRoots); an 'owner' state with no root logs a miss.
export function stateLiveSource( state, root ) {
	if ( 'scroll' === state.reach ) {
		return `async ( h ) => {
		await h.page.evaluate( ${ scrollPage.toString() }, ${ SCROLL_TO } );
		await h.page.waitForTimeout( 1300 );
	}`;
	}
	if ( 'owner' !== state.reach ) {
		return null;
	}
	return `async ( h ) => {
		const r = ${ root ? `await h.page.evaluate( ${ openOwner.toString() }, ${ JSON.stringify( root ) } )` : `{ clicked: false, why: 'the surface has no live root to open' }` };
		h.log.push( { type: 'click', target: ${ JSON.stringify( `the control of ${ root || 'the surface' } for state "${ state.name }"` ) }, hit: r.clicked || / is open already$/.test( r.why || '' ) } );
		r.why && console.log( 'live state ' + ${ JSON.stringify( state.name ) } + ': ' + r.why );
		await h.page.waitForTimeout( 900 );
	}`;
}

// The UNMAPPED rows of the states the walker cannot walk (walkerStates' `refused`), one per state, on the surface's root
// node: Solve never measures such a state, so the gap is named where Fill reports. id: the handoff record's id.
export function walkRefusalRows( { walk, id = null, nodes, flat, refOf } ) {
	const root = nodes.find( ( n ) => null === n.parent ) ?? nodes[ 0 ];
	return ( walk?.refused || [] ).map( ( r ) => ( { node: root ? refOf( flat[ root.index ] ) : null, block: root?.name ?? '', slot: '', property: STATE_REFUSED, value: r.state, state: null, reason: `walker-state-refused: walker state "${ r.state }"${ id ? ` of ${ id }` : '' } is not walked: ${ r.reason }` } ) );
}

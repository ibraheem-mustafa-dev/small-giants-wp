// The state map generated from the draft (Spec 48 FR-48-13): for one surface, every `sc-if` of the draft template is
// mapped to a way of reaching it or listed as a gap row naming the condition, and each walker state of surfaces.json is
// listed with its setting state. Pure functions over the parsed files; lib/state-map-io.mjs reads them.

const words = ( s ) => String( s ).replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( Boolean );

// Whether a walker state's name names a draft state: every state key's words are in the walker state's name, and a
// non-boolean value's words too. A `false` value is the default every walker state starts from, so none names it, and a
// state with no keys (unforceable) is named by nothing.
export function namesState( walkerState, state ) {
	const have = new Set( words( walkerState ) );
	const entries = Object.entries( state?.state_keys || {} );
	return entries.length > 0 && entries.every( ( [ k, v ] ) => false !== v && words( k ).every( ( w ) => have.has( w ) ) && ( 'boolean' === typeof v || null == v || words( v ).every( ( w ) => have.has( w ) ) ) );
}

// The vocabulary state a draft state's keys stand for (`mobileOpen` is `open`, `active` is `active`), or null. `vocab` is
// lib/state-vocab.mjs::stateRows().
export function vocabStateFor( state, vocab ) {
	const names = new Set( ( vocab || [] ).map( ( r ) => r.state ) );
	return Object.keys( state?.state_keys || {} ).flatMap( words ).find( ( w ) => names.has( w ) ) ?? null;
}

// The draft ids ("<component>:<n>") of one record state's sc-ifs.
const idsOf = ( rec, state ) => ( state.sc_if_tpl_ids || [] ).map( ( n ) => `${ rec.dc }:${ n }` );

// The index of interactive draft states by sc-if id: id -> [ { record, state } ].
function stateIndex( records ) {
	const index = new Map();
	for ( const rec of records ) {
		for ( const state of rec.states || [] ) {
			for ( const id of idsOf( rec, state ) ) {
				index.set( id, [ ...( index.get( id ) || [] ), { record: rec.id, state } ] );
			}
		}
	}
	return index;
}

// The reach of an sc-if the inventory classed as something other than interactive: the draft reaches it by route, by
// viewport width, by the props a caller passes or by its content, with no state to set.
const OTHER_REACH = { route: 'route', breakpoint: 'width', 'prop-variant': 'props', 'content-variant': 'content' };

// The map for one surface: { surface, walkerStates: [ { walkerState, settingState, names } ], shared: [ { settingState,
// walkerStates } ], scIf: [ { id, component, record, class, reach, ... } ], gaps }. Each sc-if row is reached by
// `walker` (a walker state names its draft state; `walkerState` and `settingState` say which), `set-state` (the logic's
// state keys are set directly, `keys`, entering the vocabulary state `settingState`), or by route, width, props or
// content; otherwise it is a `gap` row with the reason. `intake` is the intake record (census and inventory.surfaces);
// `records` limits the draft records in scope (ids like "S-34"), else the surface's `draftRecords`, else all of them. An
// sc-if no record covers is always in scope: it is a gap.
export function stateMap( { surfaces, surface, intake, vocab = [], records = null } ) {
	const entry = surfaces?.[ surface ];
	if ( ! entry?.states ) {
		throw new Error( `surface "${ surface }" has no "states" map in surfaces.json` );
	}
	const inv = intake?.inventory?.surfaces || { records: [], counts: {} };
	const scope = records || entry.draftRecords || null;
	const index = stateIndex( inv.records || [] );
	const interactive = inv.counts?.toggling_sc_ifs?.covered_by || {};
	const otherOf = new Map();
	for ( const [ cls, v ] of Object.entries( inv.counts?.other_sc_ifs || {} ) ) {
		Object.entries( v.covered_by || {} ).forEach( ( [ id, rec ] ) => otherOf.set( id, { cls, rec } ) );
	}
	const draftStates = [ ...index.values() ].flat().map( ( x ) => x.state );
	const walkerStates = Object.entries( entry.states ).map( ( [ walkerState, settingState ] ) => ( {
		walkerState, settingState: settingState ?? null, names: [ ...new Set( draftStates.filter( ( s ) => namesState( walkerState, s ) ).map( ( s ) => s.name ) ) ],
	} ) );
	const bySetting = new Map();
	walkerStates.forEach( ( w ) => bySetting.set( w.settingState, [ ...( bySetting.get( w.settingState ) || [] ), w.walkerState ] ) );
	const shared = [ ...bySetting ].filter( ( [ , ws ] ) => ws.length > 1 ).map( ( [ settingState, ws ] ) => ( { settingState, walkerStates: ws } ) );

	const scIf = [];
	for ( const r of ( intake?.census || [] ).filter( ( x ) => 'sc-if' === x.kind ) ) {
		const id = r.draftId;
		const component = r.component;
		const other = otherOf.get( id );
		const record = interactive[ id ] ?? other?.rec ?? null;
		if ( scope && record && ! scope.includes( record ) ) {
			continue;
		}
		if ( other ) {
			scIf.push( { id, component, record, class: other.cls, reach: OTHER_REACH[ other.cls ] } );
			continue;
		}
		const states = index.get( id ) || [];
		const forceable = states.filter( ( x ) => Object.keys( x.state.state_keys || {} ).length );
		const named = forceable.flatMap( ( x ) => walkerStates.filter( ( w ) => namesState( w.walkerState, x.state ) ).map( ( w ) => ( { ...w, state: x.state.name } ) ) )[ 0 ];
		if ( named ) {
			scIf.push( { id, component, record, class: 'interactive', reach: 'walker', state: named.state, walkerState: named.walkerState, settingState: named.settingState } );
		} else if ( forceable.length ) {
			const s = forceable[ 0 ].state;
			scIf.push( { id, component, record, class: 'interactive', reach: 'set-state', state: s.name, keys: s.state_keys, settingState: vocabStateFor( s, vocab ) } );
		} else {
			scIf.push( { id, component, record, class: record ? 'interactive' : 'uncovered', reach: 'gap', reason: states.length ? `no type-safe value forces its state keys (draft state ${ states.map( ( x ) => x.state.name ).join( ', ' ) })` : 'no draft state, route, width, props or content covers this condition' } );
		}
	}
	return { surface, walkerStates, shared, scIf, gaps: scIf.filter( ( r ) => 'gap' === r.reach ) };
}

// The group key of a conflict entry is "<ref>|<path>|<kind>|<property>"; the pieces for matching a Solve group.
export function conflictKey( key ) {
	const p = String( key ).split( '|' );
	return { ref: p[ 0 ], path: p.slice( 1, -2 ).join( '|' ), kind: p.at( -2 ), prop: p.at( -1 ) };
}

// A reasons file's rows for one surface, against the generated map: { missing, stale }. `missing` are the map's gap rows
// the reasons do not state (`stateless` holds a row id, or { surface, id }); `stale` are the conflict entries whose group
// the map no longer has: a walker state the surface dropped, or one that now maps to another setting state than the
// entry's `mappedTo` ("<walker state>-><setting state>", rest written `rest`).
export function diffReasons( map, reasons ) {
	const stated = ( reasons?.stateless || [] ).filter( ( x ) => 'string' === typeof x || x.surface === map.surface ).map( ( x ) => ( 'string' === typeof x ? x : x.id ) );
	const missing = map.gaps.filter( ( g ) => ! stated.includes( g.id ) ).map( ( g ) => ( { id: g.id, reason: g.reason } ) );
	const now = new Map( map.walkerStates.map( ( w ) => [ w.walkerState, w.settingState ?? 'rest' ] ) );
	const stale = [];
	for ( const e of ( reasons?.stateConflicts?.entries || [] ).filter( ( x ) => x.surface === map.surface ) ) {
		const off = [ ...( e.walkerStates || [] ).filter( ( ws ) => ! now.has( ws ) ).map( ( ws ) => `${ ws } is no longer a walker state of the surface` ),
			...( e.mappedTo || [] ).map( ( m ) => m.split( '->' ) ).filter( ( [ ws, st ] ) => now.has( ws ) && now.get( ws ) !== st ).map( ( [ ws, st ] ) => `${ ws } maps to ${ now.get( ws ) }, not ${ st }` ) ];
		off.length && stale.push( { surface: e.surface, key: e.key, why: off } );
	}
	return { missing, stale };
}

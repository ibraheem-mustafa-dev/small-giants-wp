// The logic's data and its per-state values (Spec 48 FR-48-7, FR-48-24, Spec 48A §3): in the sandboxed page, the statics,
// getters and instance fields of each live logic instance that hold data (content arrays, menus, catalogues, form schemas),
// serialised with depth and size caps (functions dropped and named), and each hole's value with a surface state's keys
// applied through the instance's own setState (lib/intake-state.mjs), recorded only where it differs from the resting
// value. The draft's logic runs in the page and never in Node; Node plans the reads and files the answers.
import { setDraftState, snapshotDraftState, restoreDraftState } from './intake-state.mjs';
import { templateKey } from './fact-key.mjs';

// depth, items, keys, text and nodes cap one entry; componentNodes caps all the entries of one component and recordNodes all the
// components of one read (a cap hit sets `truncated: true`).
export const CAPS = { depth: 10, items: 200, keys: 80, nodes: 40000, text: 300, componentNodes: 120000, recordNodes: 400000 };
const SLOT = 'read-logic-statics';
const ASSET_PATH = /(?:^|[\s,("'=])((?:\.{0,2}\/)?assets\/[^\s,"'()<>?#]+\.(?:svg|png|jpe?g|webp|gif|avif|mp4|webm|ico|woff2?))/gi;

// In-page. in: { names: [ component ], caps, used (nodes the record has spent already) }. Returns { statics: { <component>:
// null (no live instance) | { entries: [ { name, source (static | getter | field), kind (array | object), length, value,
// dropped?, truncated?, err? } ], functions: [ static method names ], width (the viewport width the getters were read at),
// dropped?: [ { name, source, reason: 'volatile' } ], truncated?: true } }, nodes (spent in all) }. An entry is read twice and
// kept only when both serialisations are equal: a value that changes between two reads (a timer id, a timestamp, a counter)
// is dropped and named with reason `volatile`.
function staticsInPage( { names, caps, used } ) {
	const logicOf = ( name ) => {
		const host = document.querySelector( `.sc-host[data-sc-name="${ CSS.escape( name ) }"]` );
		const key = host && Object.keys( host ).find( ( k ) => k.startsWith( '__reactFiber$' ) );
		let f = key ? host[ key ] : null;
		while ( f && ! ( f.stateNode && f.stateNode.logic && f.stateNode.__name === name ) ) {
			f = f.return;
		}
		return f ? f.stateNode.logic : null;
	};
	const plain = ( v ) => {
		const p = Object.getPrototypeOf( v );
		return null === p || Object.prototype === p;
	};
	const ser = ( v, at, depth, st ) => {
		if ( undefined === v ) {
			return undefined;
		}
		if ( null === v || 'boolean' === typeof v ) {
			return v;
		}
		if ( 'number' === typeof v ) {
			return Number.isFinite( v ) ? v : String( v );
		}
		if ( 'string' === typeof v ) {
			return v.length > caps.text ? `${ v.slice( 0, caps.text ) }…` : v;
		}
		if ( 'function' === typeof v ) {
			st.dropped.push( at );
			return undefined;
		}
		if ( 'object' !== typeof v ) {
			return String( v );
		}
		if ( v.$$typeof || v instanceof Node || ( ! Array.isArray( v ) && ! plain( v ) ) ) {
			st.dropped.push( `${ at } (not plain data)` );
			return undefined;
		}
		if ( st.seen.has( v ) ) {
			st.dropped.push( `${ at } (cycle)` );
			return undefined;
		}
		if ( depth >= caps.depth || ++st.nodes > caps.nodes ) {
			st.truncated = true;
			return undefined;
		}
		if ( ++st.bud.comp > caps.componentNodes || ++st.bud.rec > caps.recordNodes ) {
			st.truncated = true;
			st.bud.comp > caps.componentNodes && ( st.bud.compHit = true );
			st.bud.rec > caps.recordNodes && ( st.bud.recHit = true );
			return undefined;
		}
		st.seen.add( v );
		let out;
		if ( Array.isArray( v ) ) {
			v.length > caps.items && ( st.truncated = true );
			out = v.slice( 0, caps.items ).map( ( x, i ) => {
				const r = ser( x, `${ at }[${ i }]`, depth + 1, st );
				return undefined === r ? null : r;
			} );
		} else {
			const keys = Object.keys( v );
			keys.length > caps.keys && ( st.truncated = true );
			out = {};
			for ( const k of keys.slice( 0, caps.keys ) ) {
				const r = ser( v[ k ], `${ at }.${ k }`, depth + 1, st );
				undefined === r || ( out[ k ] = r );
			}
		}
		st.seen.delete( v );
		return out;
	};
	const entryOf = ( name, source, get, bud ) => {
		let v;
		try {
			v = get();
		} catch ( e ) {
			return { name, source, kind: 'object', length: 0, value: null, err: String( e && e.message || e ).split( '\n' )[ 0 ] };
		}
		const arr = Array.isArray( v );
		if ( ! v || 'object' !== typeof v || v.$$typeof || v instanceof Node || ( ! arr && ! plain( v ) ) ) {
			return null;
		}
		const st = { dropped: [], truncated: false, nodes: 0, seen: new Set(), bud };
		const value = ser( v, name, 0, st );
		return { name, source, kind: arr ? 'array' : 'object', length: arr ? v.length : Object.keys( v ).length, value: undefined === value ? null : value, ...( st.dropped.length ? { dropped: st.dropped.slice( 0, 40 ) } : {} ), ...( st.truncated ? { truncated: true } : {} ) };
	};
	// { entry } when two reads serialise alike, { volatile } when they differ. The second read spends a copy of the budget the
	// first started from, so both stop at the same place.
	const stable = ( name, source, get, bud ) => {
		const before = { ...bud };
		const a = entryOf( name, source, get, bud );
		const b = entryOf( name, source, get, before );
		return JSON.stringify( a ) === JSON.stringify( b ) ? { entry: a } : { volatile: { name, source, reason: 'volatile' } };
	};
	const out = {};
	let total = used;
	for ( const name of names ) {
		const logic = logicOf( name );
		if ( ! logic ) {
			out[ name ] = null;
			continue;
		}
		const bud = { comp: 0, rec: total, compHit: false, recHit: false };
		const entries = [];
		const dropped = [];
		const functions = [];
		const seen = new Set();
		const add = ( name2, source, get ) => {
			if ( seen.has( name2 ) ) {
				return;
			}
			seen.add( name2 );
			const r = stable( name2, source, get, bud );
			r.volatile ? dropped.push( r.volatile ) : r.entry && entries.push( r.entry );
		};
		for ( let c = logic.constructor; c && Function.prototype !== c && ! /^(StreamableLogic|DCLogic)$/.test( c.name ); c = Object.getPrototypeOf( c ) ) {
			for ( const k of Object.getOwnPropertyNames( c ).filter( ( n ) => ! [ 'length', 'name', 'prototype' ].includes( n ) ) ) {
				if ( 'function' === typeof Object.getOwnPropertyDescriptor( c, k ).value ) {
					functions.push( k );
				} else {
					add( k, 'static', () => c[ k ] );
				}
			}
			for ( const [ k, d ] of Object.entries( Object.getOwnPropertyDescriptors( c.prototype ) ) ) {
				d.get && add( k, 'getter', () => logic[ k ] );
			}
		}
		for ( const k of Object.keys( logic ).filter( ( n ) => ! [ 'state', 'props' ].includes( n ) && ! n.startsWith( '__' ) ) ) {
			add( k, 'field', () => logic[ k ] );
		}
		total = bud.rec;
		out[ name ] = { entries, functions: [ ...new Set( functions ) ], width: window.innerWidth, ...( dropped.length ? { dropped } : {} ), ...( bud.compHit || bud.recHit ? { truncated: true } : {} ) };
	}
	return { statics: out, nodes: total };
}

// { statics: { <component>: { entries, functions, width, dropped?, truncated? } }, missing: [ component ], nodes, truncated }
// for the components the page has a live instance of; a component with none is left out and listed in `missing`. `used`: the
// nodes an earlier read of the same record spent; `truncated` is true when the record's node budget ran out.
export async function readStatics( { page, components, used = 0 } ) {
	const got = await page.evaluate( staticsInPage, { names: components, caps: CAPS, used } );
	const statics = {};
	const missing = [];
	for ( const [ name, rec ] of Object.entries( got.statics ) ) {
		rec ? ( statics[ name ] = rec ) : missing.push( name );
	}
	return { statics, missing, nodes: got.nodes, truncated: got.nodes > CAPS.recordNodes };
}

// A state key that only describes a width (`{ w: '>= 1260' }`): the read width sets it.
const isWidthKey = ( value ) => 'string' === typeof value && /^\s*[<>]=?\s*\d/.test( value );

// The state jobs of the surfaces: [ { id: '<surface id>:<state name>', surface, state, component, keys } ] for each state that
// sets a state key of its component's logic. `keys` are the state's non-width keys: a state whose keys also describe a
// width (`{ open: true, w: '>= 1260' }`) is read with the real keys and the width the read sets. Not jobs: the resting state
// (no keys) and a state with only width keys. `skipped`: [ { id, reason } ] the states that cannot be set literally: a surface
// with no draft component, a key that is not a state key (`props.x`, a prop variant that is a different mount;
// `select[name=role]`) or a value that is a placeholder (`<field>`, `IND-######`, `{…}`).
export function stateJobsOf( surfaces ) {
	const jobs = [];
	const skipped = [];
	for ( const s of Object.values( surfaces || {} ) ) {
		for ( const st of s.states || [] ) {
			const keys = st.state_keys || {};
			const id = `${ s.id }:${ st.name }`;
			const real = Object.keys( keys ).filter( ( k ) => ! isWidthKey( keys[ k ] ) );
			if ( ! real.length ) {
				continue;
			}
			const own = Object.fromEntries( real.map( ( k ) => [ k, keys[ k ] ] ) );
			if ( ! s.dc ) {
				skipped.push( { id, reason: 'the surface names no draft component (dc), so there is no instance to set the state on' } );
			} else if ( real.some( ( k ) => ! /^[A-Za-z_$][\w$]*$/.test( k ) ) ) {
				skipped.push( { id, reason: 'a state key is not a state key of the live instance (a prop variant or a selector)' } );
			} else if ( /<[^<>]+>|…|#{2,}/.test( JSON.stringify( own ) ) ) {
				skipped.push( { id, reason: 'a state value is a placeholder, not a value the instance can be set to' } );
			} else {
				jobs.push( { id, surface: s.id, state: st.name, component: s.dc, keys: own } );
			}
		}
	}
	return { jobs, skipped };
}

// Each job's holes at each width with its keys set: { <job id>: { component, surface, state, reached, widths: { <width>: { <hole
// key>: answer } }, errors: [ text ] } }. `ask(page, comps)` answers a plan; `resize(page, width)` sets the width; the state is
// put back after every read. A read that throws is caught: the state is put back, the error is listed in `errors` with its
// width and the job's other widths are still read.
export async function readStateValues( { page, plan, jobs, widths, ask, resize } ) {
	const out = {};
	for ( const job of jobs ) {
		out[ job.id ] = { component: job.component, surface: job.surface, state: job.state, reached: 0, widths: {}, errors: [] };
	}
	for ( const w of widths ) {
		await resize( page, w );
		for ( const job of jobs ) {
			if ( ! plan[ job.component ] ) {
				continue;
			}
			await snapshotDraftState( page, SLOT );
			try {
				const reached = await setDraftState( page, { component: job.component, keys: job.keys } ).catch( () => 0 );
				out[ job.id ].reached = Math.max( out[ job.id ].reached, reached );
				if ( reached ) {
					await page.evaluate( () => new Promise( ( done ) => requestAnimationFrame( () => requestAnimationFrame( () => setTimeout( done, 100 ) ) ) ) );
					const got = await ask( page, { [ job.component ]: plan[ job.component ] } );
					out[ job.id ].widths[ w ] = got[ job.component ]?.holes || {};
				}
			} catch ( e ) {
				out[ job.id ].errors.push( `${ w }: ${ String( e && e.message || e ).split( '\n' )[ 0 ] }` );
			} finally {
				await restoreDraftState( page, SLOT );
			}
		}
	}
	return out;
}

// The gap rows of a read of the statics and the state values. `jobs` / `skipped` are stateJobsOf's; `states` readStateValues' answers;
// `noInstance`: the components with no live instance anywhere; `truncated`: the record's statics budget ran out.
export function valueGaps( { jobs, skipped, states, noInstance, truncated } ) {
	const gaps = [];
	const unreached = jobs.filter( ( j ) => ! states[ j.id ]?.reached ).map( ( j ) => j.id );
	unreached.length && gaps.push( { construct: 'state-values', draftId: unreached.join( ', ' ), error: 'the state keys could not be set (the component has no live instance on the entry page, or its setState refused them), so no per-state value was read' } );
	for ( const reason of [ ...new Set( skipped.map( ( x ) => x.reason ) ) ] ) {
		gaps.push( { construct: 'state-values', draftId: skipped.filter( ( x ) => x.reason === reason ).map( ( x ) => x.id ).join( ', ' ), error: `${ reason }, so no per-state value was read` } );
	}
	for ( const [ job, got ] of Object.entries( states ) ) {
		got.errors.length && gaps.push( { construct: 'state-values', draftId: job, error: `reading the holes with the state set threw (${ got.errors.join( '; ' ) }); the state was put back and nothing was recorded for it at that width` } );
	}
	for ( const comp of [ ...noInstance ].sort() ) {
		gaps.push( { construct: 'statics', draftId: comp, error: 'the component has no live instance on the entry page or in its own file, so its statics, getters and fields were not read' } );
	}
	truncated && gaps.push( { construct: 'statics', draftId: 'record', error: `the statics of the record passed its ${ CAPS.recordNodes } node budget; later values are cut (truncated)` } );
	return gaps;
}

// The template keys a state can change: the subtrees (by the template parent chain) of its surface's roots and of the elements
// its `sc_if_tpl_ids` name; null when the surface or state is unknown or names neither (the scope cannot be judged).
function scopeOf( got, surfaces, elements ) {
	const surface = surfaces[ got.surface ];
	const state = surface?.states?.find( ( s ) => s.name === got.state );
	if ( ! surface || ! state ) {
		return null;
	}
	const tops = new Set( [ ...( surface.roots || [] ), ...( state.sc_if_tpl_ids || [] ).map( ( n ) => templateKey( { dc: surface.dc, tpl: n } ) ) ] );
	if ( ! tops.size ) {
		return null;
	}
	return new Set( elements.filter( ( e ) => tops.has( e.key ) || ( e.parentChain || [] ).some( ( k ) => tops.has( k ) ) ).map( ( e ) => e.key ) );
}

// Whether two answers of one hole differ: the summaries (`v`), the scopes read (`n`) and whether the hole sits in a loop.
const same = ( a, b ) => JSON.stringify( [ a?.v, a?.n, a?.loop ] ) === JSON.stringify( [ b?.v, b?.n, b?.loop ] );

// { holesByState: { <template key>: { <job id>: { <hole id>: { <width>: answer } } } }, stateSideEffects: { <job id>: [ template
// key ] } } from the resting answers and the state reads: only the holes and widths whose answer differs from resting, of the
// elements of the component the job sets (hole keys repeat across components). A changed hole of an element inside the state's
// surface (its roots' subtrees or its sc-if members') is recorded under the element; an element outside it is listed once under
// the job in `stateSideEffects`. `elements`: [ { key, component, n, parentChain, holes: [ { id } ] } ]; `surfaces`: lib/read-surfaces.mjs's
// `surfaces`.
export function holesByState( { elements, rest, states, widths, surfaces = {} } ) {
	const out = {};
	const side = {};
	const scopes = Object.fromEntries( Object.entries( states ).map( ( [ job, got ] ) => [ job, scopeOf( got, surfaces, elements ) ] ) );
	for ( const el of elements ) {
		for ( const [ job, got ] of Object.entries( states ) ) {
			if ( got.component !== el.component ) {
				continue;
			}
			const changed = {};
			for ( const h of el.holes ) {
				for ( const w of widths ) {
					const k = `${ el.n }|${ h.id }`;
					const a = got.widths[ w ]?.[ k ];
					const r = rest[ el.component ]?.[ w ]?.holes?.[ k ];
					if ( ! a || a.err || same( a, r ) ) {
						continue;
					}
					( changed[ h.id ] ||= {} )[ w ] = a;
				}
			}
			if ( ! Object.keys( changed ).length ) {
				continue;
			}
			if ( ! scopes[ job ] || scopes[ job ].has( el.key ) ) {
				( out[ el.key ] ||= {} )[ job ] = changed;
			} else {
				( side[ job ] ||= [] ).push( el.key );
			}
		}
	}
	return { holesByState: out, stateSideEffects: side };
}

// Every path under `assets/` a string in `value` names (a hole summary's `v`, a static's `value`, walked to any depth).
export function assetPathsIn( value, found = new Set() ) {
	if ( 'string' === typeof value ) {
		for ( const m of value.matchAll( ASSET_PATH ) ) {
			found.add( m[ 1 ].replace( /^(\.{0,2}\/)+/, '' ) );
		}
	} else if ( value && 'object' === typeof value ) {
		Object.values( value ).forEach( ( x ) => assetPathsIn( x, found ) );
	}
	return found;
}

// [ { path, by, key?, hole? } ] the logic names: the paths in hole values (resting and per state) and in the statics. A hole's
// path carries the template element it belongs to (`key`) and the hole id (`hole`): that element uses the file. A static's path
// names no element: `by` is `static <component>.<name>`. A path a hole names once per element and hole; a static's once per entry.
export function logicAssetPaths( { holes, holesByState: byState = {}, statics = {} } ) {
	const out = [];
	const seen = new Set();
	const note = ( value, entry ) => assetPathsIn( value ).forEach( ( path ) => {
		const id = JSON.stringify( [ path, entry.key ?? null, entry.hole ?? null, entry.by ] );
		seen.has( id ) || ( seen.add( id ), out.push( { path, ...entry } ) );
	} );
	for ( const [ key, byHole ] of Object.entries( holes ) ) {
		for ( const [ id, per ] of Object.entries( byHole ) ) {
			Object.values( per ).forEach( ( a ) => note( a.v, { by: `hole ${ key } ${ id }`, key, hole: id } ) );
		}
	}
	for ( const [ key, jobs ] of Object.entries( byState ) ) {
		for ( const [ job, byHole ] of Object.entries( jobs ) ) {
			for ( const [ id, per ] of Object.entries( byHole ) ) {
				Object.values( per ).forEach( ( a ) => note( a.v, { by: `hole ${ key } ${ id } in ${ job }`, key, hole: id } ) );
			}
		}
	}
	for ( const [ comp, rec ] of Object.entries( statics ) ) {
		rec.entries.forEach( ( e ) => note( e.value, { by: `static ${ comp }.${ e.name }` } ) );
	}
	return out;
}

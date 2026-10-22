// The logic's data and its per-state values (Spec 48 FR-48-7, FR-48-24, Spec 48A §3): in the sandboxed page, the statics,
// getters and instance fields of each live logic instance that hold data (content arrays, menus, catalogues, form schemas),
// serialised with depth and size caps (functions dropped and named), and each hole's value with a surface state's keys
// applied through the instance's own setState (lib/intake-state.mjs), recorded only where it differs from the resting
// value. The draft's logic runs in the page and never in Node; Node plans the reads and files the answers.
import { setDraftState, snapshotDraftState, restoreDraftState } from './intake-state.mjs';

export const CAPS = { depth: 10, items: 200, keys: 80, nodes: 40000, text: 300 };
const SLOT = 'read-logic-statics';
const ASSET_PATH = /(?:^|[\s("'=])((?:\.{0,2}\/)?assets\/[^\s"'()<>?#]+\.(?:svg|png|jpe?g|webp|gif|avif|mp4|webm|ico|woff2?))/gi;

// In-page. in: { names: [ component ], caps }. Returns { <component>: null (no live instance) | { entries: [ { name, source
// (static | getter | field), kind (array | object), length, value, dropped?, truncated?, err? } ], functions: [ static
// method names ] } }.
function staticsInPage( { names, caps } ) {
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
	const entryOf = ( name, source, get ) => {
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
		const st = { dropped: [], truncated: false, nodes: 0, seen: new Set() };
		const value = ser( v, name, 0, st );
		return { name, source, kind: arr ? 'array' : 'object', length: arr ? v.length : Object.keys( v ).length, value: undefined === value ? null : value, ...( st.dropped.length ? { dropped: st.dropped.slice( 0, 40 ) } : {} ), ...( st.truncated ? { truncated: true } : {} ) };
	};
	const out = {};
	for ( const name of names ) {
		const logic = logicOf( name );
		if ( ! logic ) {
			out[ name ] = null;
			continue;
		}
		const entries = [];
		const functions = [];
		const seen = new Set();
		const add = ( e ) => e && ! seen.has( e.name ) && ( seen.add( e.name ), entries.push( e ) );
		for ( let c = logic.constructor; c && Function.prototype !== c && ! /^(StreamableLogic|DCLogic)$/.test( c.name ); c = Object.getPrototypeOf( c ) ) {
			for ( const k of Object.getOwnPropertyNames( c ).filter( ( n ) => ! [ 'length', 'name', 'prototype' ].includes( n ) ) ) {
				if ( 'function' === typeof Object.getOwnPropertyDescriptor( c, k ).value ) {
					functions.push( k );
				} else {
					add( entryOf( k, 'static', () => c[ k ] ) );
				}
			}
			for ( const [ k, d ] of Object.entries( Object.getOwnPropertyDescriptors( c.prototype ) ) ) {
				d.get && add( entryOf( k, 'getter', () => logic[ k ] ) );
			}
		}
		for ( const k of Object.keys( logic ).filter( ( n ) => ! [ 'state', 'props' ].includes( n ) && ! n.startsWith( '__' ) ) ) {
			add( entryOf( k, 'field', () => logic[ k ] ) );
		}
		out[ name ] = { entries, functions: [ ...new Set( functions ) ] };
	}
	return out;
}

// { <component>: { entries, functions } } for the components the page has a live instance of; a component with none is
// left out and listed in `missing`.
export async function readStatics( { page, components } ) {
	const got = await page.evaluate( staticsInPage, { names: components, caps: CAPS } );
	const statics = {};
	const missing = [];
	for ( const [ name, rec ] of Object.entries( got ) ) {
		rec ? ( statics[ name ] = rec ) : missing.push( name );
	}
	return { statics, missing };
}

// The state jobs of the surfaces: [ { id: '<surface id>:<state name>', component, keys } ] for each state that sets a state
// key of its component's logic. Not jobs: the resting state (no keys) and a state whose key only describes a width
// (`{ w: '>= 1260' }`; the widths are read already). `skipped` names the states that cannot be set literally: a key that is
// not a state key (`props.x`, a prop variant that is a different mount; `select[name=role]`) or a value that is a
// placeholder (`<field>`, `IND-######`, `{…}`).
export function stateJobsOf( surfaces ) {
	const jobs = [];
	const skipped = [];
	for ( const s of Object.values( surfaces || {} ) ) {
		for ( const st of s.states || [] ) {
			const keys = st.state_keys || {};
			const names = Object.keys( keys );
			if ( ! names.length || ! s.dc ) {
				continue;
			}
			if ( names.some( ( k ) => ! /^[A-Za-z_$][\w$]*$/.test( k ) ) || /<[^<>]+>|…|#{2,}/.test( JSON.stringify( keys ) ) ) {
				skipped.push( `${ s.id }:${ st.name }` );
			} else if ( ! names.some( ( k ) => 'string' === typeof keys[ k ] && /^\s*[<>]=?\s*\d/.test( keys[ k ] ) ) ) {
				jobs.push( { id: `${ s.id }:${ st.name }`, component: s.dc, keys } );
			}
		}
	}
	return { jobs, skipped };
}

// Each job's holes at each width with its keys set: { <job id>: { component, reached, widths: { <width>: { <hole key>: answer } } } }.
// `ask(page, comps)` answers a plan; `resize(page, width)` sets the width; the state is put back after every read.
export async function readStateValues( { page, plan, jobs, widths, ask, resize } ) {
	const out = {};
	for ( const job of jobs ) {
		out[ job.id ] = { component: job.component, reached: 0, widths: {} };
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
			} finally {
				await restoreDraftState( page, SLOT );
			}
		}
	}
	return out;
}

// { <template key>: { <job id>: { <hole id>: { <width>: answer } } } } from the resting answers and the state reads: only the
// holes and widths whose value differs from resting, of the elements of the component the job sets (hole keys repeat across
// components). `elements`: [ { key, component, n, holes: [ { id } ] } ].
export function holesByState( { elements, rest, states, widths } ) {
	const out = {};
	for ( const el of elements ) {
		for ( const [ job, got ] of Object.entries( states ) ) {
			if ( got.component !== el.component ) {
				continue;
			}
			for ( const h of el.holes ) {
				for ( const w of widths ) {
					const k = `${ el.n }|${ h.id }`;
					const a = got.widths[ w ]?.[ k ];
					const r = rest[ el.component ]?.[ w ]?.holes?.[ k ];
					if ( ! a || a.err || JSON.stringify( a.v ) === JSON.stringify( r?.v ) ) {
						continue;
					}
					( ( ( out[ el.key ] ||= {} )[ job ] ||= {} )[ h.id ] ||= {} )[ w ] = a;
				}
			}
		}
	}
	return out;
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

// [ { path, by } ] the logic names: the paths in hole values (resting and per state) and in the statics.
// `by`: `hole <template key> <hole id>` or `static <component>.<name>`.
export function logicAssetPaths( { holes, holesByState: byState = {}, statics = {} } ) {
	const out = new Map();
	const note = ( value, by ) => assetPathsIn( value ).forEach( ( p ) => out.has( p ) || out.set( p, by ) );
	for ( const [ key, byHole ] of Object.entries( holes ) ) {
		for ( const [ id, per ] of Object.entries( byHole ) ) {
			Object.values( per ).forEach( ( a ) => note( a.v, `hole ${ key } ${ id }` ) );
		}
	}
	for ( const [ key, jobs ] of Object.entries( byState ) ) {
		for ( const [ job, byHole ] of Object.entries( jobs ) ) {
			for ( const [ id, per ] of Object.entries( byHole ) ) {
				Object.values( per ).forEach( ( a ) => note( a.v, `hole ${ key } ${ id } in ${ job }` ) );
			}
		}
	}
	for ( const [ comp, rec ] of Object.entries( statics ) ) {
		rec.entries.forEach( ( e ) => note( e.value, `static ${ comp }.${ e.name }` ) );
	}
	return [ ...out ].map( ( [ path, by ] ) => ( { path, by } ) );
}

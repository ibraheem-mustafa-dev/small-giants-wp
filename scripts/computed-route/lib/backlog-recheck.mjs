// Re-check of the cross-client framework backlog (Spec 48 FR-48-68): re-runs G3 to G6 (lib/gate-chain.mjs's own gate
// functions) for every width of every entry of every open row, against the injected environment, and closes a row only on
// positive evidence from the row's own class that the gap no longer holds: an F-setting when a setting now reaches the
// element (G5 measured it) or a trial now changes the property (G6, missing setting); an F-hardcode when the winning-rule
// probe now names no SGS framework rule (G6 answers `rule: null`); an F-block when a roster block now matches (G6, missing
// block); an F-behaviour when the flow now agrees on a fresh walk (G6, behaviour). A G5 reach closes only an F-setting;
// for every other class the re-check goes on to that class's own probe. A walker state the surface's state map does not
// map to a setting state, a gate that fails for any other reason, a throw or a missing input leaves the row open with
// that reason. A row closes when every width of every entry closed; a closed row is never re-run.
//
// env (one per client and surface): { db (read-only), cache(block) -> the calibration cache or null, states (the surface's
// walker state map), probes: { measure(row, setting), probe(row, kind) } }.
import { g3Db, g4Calibration, g5Emission, g6Probe, PROBE_CLASS } from './gate-chain.mjs';
import { cssProp, settingState } from './solve-rows.mjs';
import { renderEvidence } from './gate-evidence.mjs';

const KIND_OF = Object.fromEntries( Object.entries( PROBE_CLASS ).map( ( [ kind, cls ] ) => [ cls, kind ] ) );
const text = ( v ) => 'string' === typeof v && '' !== v.trim();
const said = ( v ) => renderEvidence( v );
const because = ( gate, res ) => `${ gate } (${ res.class }): ${ said( res.evidence ) }`;

// The probe-side proof, per kind, that the gap no longer holds, read from the probe's own answer.
const CONTRADICTS = {
	'missing-setting': ( r ) => true === r?.changed,
	'missing-block': ( r ) => Array.isArray( r?.matches ) && r.matches.length > 0,
	behaviour: ( r ) => false === r?.flowFails,
	hardcode: ( r ) => !! r && Object.hasOwn( r, 'rule' ) && null === r.rule,
};

// The ancestors of a block, nearest first.
function ancestorsOf( db, block ) {
	const parentOf = db.prepare( 'SELECT parent_block FROM blocks WHERE slug = ?' );
	const out = [];
	for ( let p = parentOf.get( block )?.parent_block; p && ! out.includes( p ); p = parentOf.get( p )?.parent_block ) {
		out.push( p );
	}
	return out;
}

// What an entry must carry for the gates to run: the row's element, property, kind and path come from its id
// (<surface>:<ref>|<path>|<kind>|<key>, lib/issue-classes.mjs::issueKey). Throws with the reason it cannot.
function readEntry( entry ) {
	if ( ! KIND_OF[ entry.class ] ) {
		throw new Error( `${ entry.class ?? 'a row with no class' } has no live probe (G6), so its re-check cannot run` );
	}
	if ( ! text( entry.block ) ) {
		throw new Error( 'the entry names no block' );
	}
	if ( ! text( entry.state ) ) {
		throw new Error( 'the entry names no walker state' );
	}
	if ( ! Array.isArray( entry.widths ) || ! entry.widths.length ) {
		throw new Error( 'the entry names no width' );
	}
	const rest = text( entry.id ) && text( entry.surface ) && entry.id.startsWith( `${ entry.surface }:` ) ? entry.id.slice( entry.surface.length + 1 ).split( '|' ) : [];
	if ( 4 !== rest.length || ! text( rest[ 0 ] ) || ! text( rest[ 2 ] ) || ! text( rest[ 3 ] ) ) {
		throw new Error( `the id ${ entry.id } does not carry <surface>:<ref>|<path>|<kind>|<key>` );
	}
	const [ ref, path, kind, key ] = rest;
	return { ref, path, kind, key };
}

// One width of one entry: runs G3 to G6 and reads the answer. Returns { outcome: 'open' | 'closed', gate, reason, evidence }.
async function recheckWidth( entry, id, width, env ) {
	const base = { ...id, state: entry.state, width, draftId: entry.draftId ?? null, block: entry.block };
	const ancestors = ancestorsOf( env.db, entry.block );
	const row = { ...base, ancestors, words: [ id.key, entry.draftId ].filter( Boolean ) };
	const state = settingState( row, env.states );
	if ( undefined === state ) {
		return { outcome: 'open', gate: null, reason: `the walker state ${ entry.state } maps to no setting state in the surface's state map (not writable), so no setting can be re-checked on it`, evidence: null };
	}
	const stop = ( gate, res ) => ( { outcome: 'open', gate, reason: because( gate, res ), evidence: null } );
	const g3 = g3Db( { db: env.db, block: entry.block, ancestors, property: cssProp( id.key ), state } );
	if ( ! g3.pass ) {
		return stop( 'G3', g3 );
	}
	const g4 = g4Calibration( { cache: env.cache( entry.block ), settings: g3.settings, state, boxAgrees: null } );
	if ( ! g4.pass ) {
		return stop( 'G4', g4 );
	}
	let reached = null;
	const g5 = await g5Emission( {
		settings: g3.settings,
		measure: env.probes?.measure ? async ( setting ) => {
			const m = await env.probes.measure( row, setting );
			'measured' === m?.method && true === m.reaches && ( reached = m );
			return m;
		} : undefined,
	} );
	if ( ! g5.pass && ! reached ) {
		return stop( 'G5', g5 );
	}
	if ( ! g5.pass && 'F-setting' === entry.class ) {
		return { outcome: 'closed', gate: 'G5', reason: 'a setting now fits and reaches the element', evidence: g5.evidence };
	}
	const kind = KIND_OF[ entry.class ];
	let answer;
	const g6 = await g6Probe( {
		kind,
		probe: env.probes?.probe ? async ( k ) => ( answer = await env.probes.probe( row, k ) ) : undefined,
	} );
	if ( ! g6.pass ) {
		return answer && CONTRADICTS[ kind ]( answer ) ? { outcome: 'closed', gate: 'G6', reason: `the ${ kind } probe no longer proves the gap`, evidence: g6.evidence } : stop( 'G6', g6 );
	}
	return g5.pass ? { outcome: 'open', gate: null, reason: `the gap still holds: G3 to G6 pass (${ said( g6.evidence ) })`, evidence: null }
		: { outcome: 'open', gate: 'G5', reason: `${ because( 'G5', g5 ) }; a reach does not close an ${ entry.class } row and its own probe still proves the gap (${ said( g6.evidence ) })`, evidence: null };
}

// One entry, every width. Returns { outcome, gate, reason, widths: [{ width, outcome, gate, reason, evidence }] }; the entry
// is closed only when every width is.
export async function recheckEntry( entry, env ) {
	const widths = [];
	try {
		const id = readEntry( entry );
		for ( const width of entry.widths ) {
			let r;
			try {
				r = await recheckWidth( entry, id, width, env );
			} catch ( e ) {
				r = { outcome: 'open', gate: null, reason: `the re-check failed: ${ String( e.message || e ).slice( 0, 160 ) }`, evidence: null };
			}
			widths.push( { width, ...r } );
		}
	} catch ( e ) {
		return { outcome: 'open', gate: null, reason: String( e.message || e ), widths };
	}
	const open = widths.filter( ( w ) => 'open' === w.outcome );
	return open.length ? { outcome: 'open', gate: open[ 0 ].gate, reason: open.map( ( w ) => `${ w.width }px: ${ w.reason }` ).join( '; ' ), widths }
		: { outcome: 'closed', gate: widths[ 0 ].gate, reason: widths.map( ( w ) => `${ w.width }px: ${ w.reason }` ).join( '; ' ), widths };
}

// Re-checks every open row of the backlog ({ rows }); returns { backlog (a new object, the input untouched), report, stats }.
// envFor(client, surface, entry) -> env is asked once per client and surface; a throw leaves that surface's entries open
// with the reason. commit is the closing commit; today the date.
export async function recheckBacklog( { backlog, envFor, commit, today } ) {
	const next = structuredClone( backlog );
	const envs = new Map();
	const envOf = ( e ) => {
		const k = `${ e.client }\u0000${ e.surface }`;
		envs.has( k ) || envs.set( k, Promise.resolve().then( () => envFor( e.client, e.surface, e ) ) );
		return envs.get( k );
	};
	const report = { commit, on: today, entries: [] };
	const stats = { rows: next.rows.length, open: 0, closed: 0, newlyClosed: 0, skippedClosed: 0, entries: 0 };
	for ( const row of next.rows ) {
		if ( 'closed' === row.status ) {
			stats.skippedClosed++;
			stats.closed++;
			continue;
		}
		const results = [];
		for ( const entry of row.entries ) {
			let r;
			try {
				r = await recheckEntry( entry, await envOf( entry ) );
			} catch ( e ) {
				r = { outcome: 'open', gate: null, reason: `the re-check environment for ${ entry.client } ${ entry.surface } is not available: ${ String( e.message || e ).slice( 0, 160 ) }`, widths: [] };
			}
			stats.entries++;
			results.push( { entry, r } );
			report.entries.push( { rowKey: row.key, client: entry.client, surface: entry.surface, id: entry.id, outcome: r.outcome, gate: r.gate, reason: r.reason } );
		}
		row.lastRecheck = { on: today, commit, entries: results.map( ( { entry, r } ) => ( { client: entry.client, id: entry.id, outcome: r.outcome, gate: r.gate, reason: r.reason } ) ) };
		if ( results.length && results.every( ( { r } ) => 'closed' === r.outcome ) ) {
			row.status = 'closed';
			row.closed = { commit, on: today, evidence: results.flatMap( ( { entry, r } ) => r.widths.map( ( w ) => ( { client: entry.client, surface: entry.surface, id: entry.id, width: w.width, gate: w.gate, class: entry.class, evidence: w.evidence } ) ) ) };
			stats.newlyClosed++;
			stats.closed++;
		} else {
			stats.open++;
		}
	}
	return { backlog: next, report, stats };
}

// The live side of the state check (Spec 48 FR-48-81, FR-48-46): the draft and the live page are opened as the
// pairing command opens them (lib/pairs-page.mjs::openDraft, ::openLive, with the walker config's navigation), each
// side's paired elements are read by the same state reader (lib/fill-state-read.mjs::readStates) at every read width,
// and lib/state-check.mjs::checkStates compares them. The live resting value is read for every property the draft's
// states change, so a live page that never styles a state's property shows its resting value and the row differs,
// rather than going unread.
import { openDraft, openLive } from './pairs-page.mjs';
import { openDevtools, declaredValues } from '../../parity/lib/devtools.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { readStates } from './fill-state-read.mjs';
import { renderedOf } from './fill-state-apply.mjs';
import { checkStates, stateSummary } from './state-check.mjs';
import { readLogicStates } from './fill-logic-state.mjs';
import { timingCheck } from './fill-timing.mjs';
import { READ_WIDTHS, loadChromium } from './fill-read.mjs';
import { stateMap } from './state-map.mjs';
import fs from 'node:fs';
import path from 'node:path';

const RESOLVE = resolveFinder.toString();

// The walker states a state read opens, each with the pairs read in it: [{ name (null at rest), state (the config's
// state entry, null at rest), pairs: [{ name, draft, live, draftFinder, liveFinder }] }]. A pair with no `states` is read
// at rest; a pair scoped to states is read in each of them (the config's opening state is rest). A pair's finders may
// be any walker finder (a selector, a group of paths, a text run's `within`, a template path): the in-page resolver
// turns each into its element. A pair naming a state the config cannot open on both sides, or lacking a finder on a
// side, is not followed. Each pair keeps one job id per side in every state.
export function stateGroups( cfg ) {
	const opening = cfg.states?.[ 0 ]?.name ?? null;
	const groups = new Map();
	( cfg.pairs || [] ).forEach( ( p, i ) => {
		if ( ! p.draft || ! p.live ) {
			return;
		}
		for ( const n of p.states?.length ? p.states : [ null ] ) {
			const name = n === opening ? null : n;
			const state = name ? ( cfg.states || [] ).find( ( s ) => s.name === name ) : null;
			if ( name && ! ( 'function' === typeof state?.draft && 'function' === typeof state?.live ) ) {
				continue;
			}
			const g = groups.get( name ) || { name, state, pairs: [] };
			g.pairs.push( { name: p.name, draft: `d${ i }`, live: `l${ i }`, draftFinder: p.draft, liveFinder: p.live } );
			groups.set( name, g );
		}
	} );
	return [ ...groups.values() ];
}

// The pairs the state check does not follow, each with the reason: { name, state (null at rest), why }.
export function stateSkips( cfg ) {
	const opening = cfg.states?.[ 0 ]?.name ?? null;
	const skips = [];
	for ( const p of cfg.pairs || [] ) {
		if ( ! p.draft || ! p.live ) {
			skips.push( { name: p.name, state: null, why: `no ${ p.draft ? 'live' : 'draft' } finder` } );
			continue;
		}
		for ( const n of p.states?.length ? p.states : [ null ] ) {
			const state = n && n !== opening ? ( cfg.states || [] ).find( ( s ) => s.name === n ) : null;
			if ( n && n !== opening && ! ( 'function' === typeof state?.draft && 'function' === typeof state?.live ) ) {
				skips.push( { name: p.name, state: n, why: `the walker config cannot open "${ n }" on both sides` } );
			}
		}
	}
	return skips;
}

// The distinct pairs the state check follows, in config order.
export function statePairs( cfg ) {
	const seen = new Set();
	return stateGroups( cfg ).flatMap( ( g ) => g.pairs ).filter( ( p ) => ! seen.has( p.draft ) && seen.add( p.draft ) );
}

// One side at the page's current width: each job's resting declared values (what a state look is diffed against) and
// its state looks (and the resting values, which timingCheck compares); with `want` ({ jobId: [prop] }), each job's rendered resting value of those properties too.
export async function readSide( page, jobs, rows, want = null, log = () => {}, logicRows = null ) {
	const cdp = await openDevtools( page );
	const rest = {};
	for ( const j of jobs ) {
		rest[ j.id ] = await declaredValues( cdp, j.finder, RESOLVE, null ).catch( () => null );
	}
	const states = await readStates( { page, cdp, jobs, rows, rest, resolveSrc: RESOLVE, log } );
	// The looks behind sc-if logic states (lib/fill-logic-state.mjs::readLogicStates) join the CSS state looks.
	if ( logicRows?.length ) {
		const logic = await readLogicStates( { page, cdp, jobs, rest, logicRows, vocab: rows, resolveSrc: RESOLVE, log } );
		for ( const [ id, looks ] of Object.entries( logic.looks ) ) {
			( states.looks[ id ] ??= [] ).push( ...looks );
		}
		// A logic state the page could not enter is listed with the states no page can enter, never dropped.
		states.unreached = [ ...( states.unreached || [] ), ...logic.gaps.map( ( g ) => ( { id: g.ids.join( ', ' ), selector: `sc-if ${ g.ids.join( ', ' ) }`, why: g.reason } ) ) ];
	}
	const rendered = {};
	for ( const [ id, props ] of Object.entries( want || {} ) ) {
		const j = jobs.find( ( x ) => x.id === id );
		rendered[ id ] = j && props.length ? await page.evaluate( renderedOf, [ j.finder, RESOLVE, props ] ).catch( () => null ) : null;
	}
	return { states, rendered, rest };
}

// The properties each live job must be read for: every property any of its draft partner's state looks changes.
export function wantedProps( draftRead, pairs ) {
	return Object.fromEntries( pairs.map( ( p ) => [ p.live, [ ...new Set( ( draftRead.looks?.[ p.draft ] || [] ).flatMap( ( l ) => Object.keys( l.declared ) ) ) ] ] ) );
}

// The state check over a surface's walker config: { rows, summary, pairs } where rows are lib/state-check.mjs's rows
// carrying each pair's name and the walker state it was read in (`walkerState`, null at rest). Each walker state the
// pairs name is opened on both sides as the pairing command opens it (lib/pairs-page.mjs::openDraft, ::openLive) and
// its pairs are read there. browser: a launched Chromium; cfg: the walker config (draft, live, pairs, states); rows: the
// state vocabulary (lib/db.mjs::statesVocabulary); logicRows: the state map's set-state rows (default cfg.logicRows).
export async function liveStateCheck( { browser, cfg, rows, widths = READ_WIDTHS, logicRows = cfg.logicRows || null, log = () => {} } ) {
	const checked = [];
	const draftReads = [];
	for ( const group of stateGroups( cfg ) ) {
		const { pairs } = group;
		const draftJobs = pairs.map( ( p ) => ( { id: p.draft, finder: p.draftFinder } ) );
		const liveJobs = pairs.map( ( p ) => ( { id: p.live, finder: p.liveFinder } ) );
		const draft = {};
		const live = {};
		const timing = { draft: {}, live: {} };
		const liveRest = {};
		for ( const width of widths ) {
			const d = await openDraft( browser, cfg, width, group.state );
			try {
				const side = await readSide( d, draftJobs, rows, null, log, logicRows );
				draft[ width ] = side.states;
				timing.draft[ width ] = { rest: side.rest, states: side.states };
			} finally {
				await d.close();
			}
			const l = await openLive( browser, cfg, width, group.state );
			try {
				const side = await readSide( l, liveJobs, rows, wantedProps( draft[ width ], pairs ), log, logicRows );
				live[ width ] = side.states;
				timing.live[ width ] = { rest: side.rest, states: side.states };
				liveRest[ width ] = side.rendered;
			} finally {
				await l.close();
			}
			log( `state check ${ group.name ?? 'rest' } ${ width }px: ${ Object.keys( draft[ width ].looks ).length } draft and ${ Object.keys( live[ width ].looks ).length } live elements with a state look` );
		}
		const names = Object.fromEntries( pairs.map( ( p ) => [ p.draft, p.name ] ) );
		const idPairs = pairs.map( ( p ) => ( { draft: p.draft, live: p.live } ) );
		const states = checkStates( { draft, live, liveRest, pairs: idPairs } );
		// A timing row reads as a state row: its state is the direction it times, its prop the timing property.
		const timings = timingCheck( { ...timing, pairs: idPairs } ).map( ( r ) => ( { ...r, state: `timing ${ r.state ?? 'rest' } (${ r.direction })`, liveState: true, confirmed: true } ) );
		checked.push( ...[ ...states, ...timings ].map( ( r ) => ( { pair: names[ r.draft ], walkerState: group.name, ...r } ) ) );
		draftReads.push( draft );
	}
	// The summary lists each draft state no page can enter once per walker state read.
	const flat = Object.assign( {}, ...draftReads.map( ( d, i ) => Object.fromEntries( Object.entries( d ).map( ( [ w, r ] ) => [ `${ i }:${ w }`, r ] ) ) ) );
	return { rows: checked, summary: stateSummary( checked, flat ), pairs: statePairs( cfg ).length, skipped: stateSkips( cfg ) };
}

// The surface's sc-if rows from its generated state map (lib/state-map.mjs::stateMap), read from the client's intake
// record (<buildDir>/intake/intake.json); none when intake has not run or the vocabulary has no rows.
export function surfaceLogicRows( { surfaces, surface, buildDir, vocab } ) {
	const intakeFile = buildDir ? path.join( buildDir, 'intake', 'intake.json' ) : null;
	if ( ! surfaces || ! intakeFile || ! fs.existsSync( intakeFile ) || ! vocab?.rows?.length ) {
		return [];
	}
	return stateMap( { surfaces, surface, intake: JSON.parse( fs.readFileSync( intakeFile, 'utf8' ) ), vocab: vocab.rows } ).scIf;
}

// Solve's state check (solve.mjs): the check in its own browser, as the report part; with no states table in the DB it
// reads nothing and the report says why. The surface's sc-if rows (surfaces, surface, buildDir, or `logicRows` given
// directly) are passed to the live check, so the draft's logic states are compared too. `run` is the check it runs.
export async function surfaceStateCheck( { cfg, vocab, surfaces = null, surface = null, buildDir = null, logicRows = null, headless = true, log = () => {}, run = liveStateCheck } ) {
	if ( vocab.missing ) {
		return { json: { off: vocab.missing }, markdown: `## States (FR-48-81)

Not checked: ${ vocab.missing }.` };
	}
	const rowsOf = logicRows ?? surfaceLogicRows( { surfaces, surface, buildDir, vocab } );
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless } );
	try {
		return stateReport( await run( { browser, cfg, rows: vocab.rows, logicRows: rowsOf, log } ) );
	} finally {
		await browser.close();
	}
}

// The report part: the summary and every row that is not a match (differs, then unreadable).
export function stateReport( check ) {
	const open = check.rows.filter( ( r ) => 'match' !== r.verdict ).sort( ( a, b ) => ( a.verdict === b.verdict ? 0 : 'differs' === a.verdict ? -1 : 1 ) );
	const md = [
		`## States (FR-48-81)`,
		'',
		`${ check.pairs } pairs read: ${ check.summary.match } match, ${ check.summary.differs } differ, ${ check.summary.unreadable } unreadable.`,
		...( check.skipped?.length ? [ '', `Not followed: ${ check.skipped.map( ( k ) => `${ k.name }${ k.state ? ` (${ k.state })` : '' }: ${ k.why }` ).join( '; ' ) }` ] : [] ),
		...( check.summary.unreachedDraft.length ? [ '', `Draft states no page can enter: ${ [ ...new Set( check.summary.unreachedDraft.map( ( u ) => u.selector ) ) ].join( ', ' ) }` ] : [] ),
		...( open.length ? [ '', '| Pair | Width | State | Property | Draft | Live | Verdict |', '|---|---|---|---|---|---|---|', ...open.map( ( r ) => `| ${ r.pair } | ${ r.width } | ${ r.walkerState ? `${ r.walkerState }: ` : '' }${ r.state } | ${ r.prop } | ${ r.draftValue } | ${ r.liveValue ?? '(none)' }${ r.liveState ? '' : ' (no live state look)' } | ${ r.verdict }${ false === r.confirmed ? ' (declared in code, not confirmed by the render)' : '' } |` ) ] : [] ),
	];
	return { json: { summary: check.summary, pairs: check.pairs, skipped: check.skipped || [], open }, markdown: md.join( '\n' ) };
}

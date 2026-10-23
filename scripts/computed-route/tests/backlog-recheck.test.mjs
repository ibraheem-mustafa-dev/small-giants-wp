// Proves FR-48-68's re-check: G3 to G6 re-run for every open backlog row through the existing gate functions and the
// injected probes; a row closes only on positive evidence that the gap no longer holds (a setting now reaches the element,
// a trial now changes it, a block now matches, the flow now agrees), with the commit that closed it; a row whose re-check
// cannot run stays open with the reason; a closed row is never re-run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { recheckBacklog, recheckEntry } from '../lib/backlog-recheck.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const CLI = path.join( HERE, '..', 'backlog-recheck.mjs' );

const db = ( ...attrs ) => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT );
		CREATE TABLE roles ( role_name TEXT, classification TEXT );
		CREATE TABLE blocks ( slug TEXT, parent_block TEXT );
		INSERT INTO roles VALUES ( 'spacing-token', 'styling-behaviour' ), ( 'content', 'content-bearing' );
		INSERT INTO blocks VALUES ( 'sgs/button', 'sgs/container' ), ( 'sgs/container', NULL );` );
	for ( const a of attrs ) {
		d.prepare( 'INSERT INTO block_attributes VALUES ( ?, ?, ?, ?, ?, ? )' ).run( ...a );
	}
	return d;
};
const FITS = [ 'sgs/button', 'paddingTop', 'padding-top', null, 'spacing-token', 'sgs' ];

const entry = ( over = {} ) => ( {
	client: 'alpha', surface: 'header', id: 'header:cr-ref-header-3||style|padding-top', class: 'F-setting', block: 'sgs/button', attribute: null, property: 'padding-top',
	widths: [ 1440 ], state: 'rest', draftId: 'Root/9#0', gates: [], firstSeen: '2026-10-20', publishedOn: '2026-10-22', ...over,
} );
const row = ( entries, over = {} ) => ( { key: 'sgs/button||padding-top', block: 'sgs/button', attribute: null, property: 'padding-top', status: 'open', firstSeen: '2026-10-20', lastSeen: '2026-10-22', classes: [ 'F-setting' ], clients: [ ...new Set( entries.map( ( e ) => e.client ) ) ], entries, lastRecheck: null, closed: null, ...over } );

// Injected probes: every call is recorded; each method answers from the map or throws.
const probes = ( answers = {} ) => {
	const calls = [];
	return {
		calls,
		measure: async ( r, s ) => {
			calls.push( [ 'measure', r.width, s.attr ] );
			return 'function' === typeof answers.measure ? answers.measure( r, s ) : answers.measure;
		},
		probe: async ( r, kind ) => {
			calls.push( [ 'probe', r.width, kind ] );
			return 'function' === typeof answers.probe ? answers.probe( r, kind ) : answers.probe;
		},
	};
};
const env = ( over = {} ) => ( { db: db(), cache: () => ( {} ), states: { rest: null }, probes: probes( { probe: { changed: false, evidence: 'no setting changes it' } } ), ...over } );
const run = ( backlog, e, opts = {} ) => recheckBacklog( { backlog, envFor: async () => e, commit: 'c0ffee1', today: '2026-10-23', ...opts } );
const outcomeOf = ( res ) => res.report.entries[ 0 ];

test( 'a gap that still holds stays open: G3 to G6 pass on the unchanged framework', async () => {
	const e = env();
	const res = await run( { rows: [ row( [ entry() ] ) ] }, e );
	assert.equal( res.backlog.rows[ 0 ].status, 'open' );
	assert.deepEqual( [ outcomeOf( res ).outcome, outcomeOf( res ).gate ], [ 'open', null ] );
	assert.match( outcomeOf( res ).reason, /still holds/ );
	assert.deepEqual( e.probes.calls, [ [ 'probe', 1440, 'missing-setting' ] ] );
	assert.deepEqual( [ res.backlog.rows[ 0 ].lastRecheck.on, res.backlog.rows[ 0 ].lastRecheck.commit ], [ '2026-10-23', 'c0ffee1' ] );
	assert.deepEqual( res.stats, { rows: 1, open: 1, closed: 0, newlyClosed: 0, skippedClosed: 0, entries: 1 } );
} );

test( 'MUST FAIL: a setting that now fits and reaches the element closes the row with the commit and the gate evidence', async () => {
	const e = env( { db: db( FITS ), probes: probes( { measure: { method: 'measured', emitted: '.sgs-button-ab12cd34 { padding-top: 24px }', reaches: true, evidence: 'the block\'s own rule matches' } } ) } );
	const res = await run( { rows: [ row( [ entry() ] ) ] }, e );
	const r = res.backlog.rows[ 0 ];
	assert.equal( r.status, 'closed' );
	assert.deepEqual( [ r.closed.commit, r.closed.on ], [ 'c0ffee1', '2026-10-23' ] );
	assert.deepEqual( r.closed.evidence.map( ( x ) => [ x.client, x.id, x.width, x.gate ] ), [ [ 'alpha', entry().id, 1440, 'G5' ] ] );
	assert.match( r.closed.evidence[ 0 ].evidence.line, /emits .*padding-top: 24px.*reaches the element/ );
	assert.equal( r.closed.evidence[ 0 ].evidence.command, 'lib/gate-probes.mjs::measure on the live element' );
	assert.deepEqual( [ res.stats.newlyClosed, res.stats.closed ], [ 1, 1 ] );
} );

test( 'MUST FAIL: a trial that now changes the property closes an F-setting row; a trial that still changes nothing does not', async () => {
	const closed = await run( { rows: [ row( [ entry() ] ) ] }, env( { probes: probes( { probe: { changed: true, evidence: 'a setting renders CSS declaring padding-top' } } ) } ) );
	assert.deepEqual( [ closed.backlog.rows[ 0 ].status, closed.backlog.rows[ 0 ].closed.evidence[ 0 ].gate ], [ 'closed', 'G6' ] );
	const open = await run( { rows: [ row( [ entry() ] ) ] }, env() );
	assert.equal( open.backlog.rows[ 0 ].status, 'open' );
} );

test( 'a measurement that is not a live measurement, or a throw, never closes a row and the reason is kept', async () => {
	const string = await run( { rows: [ row( [ entry() ] ) ] }, env( { db: db( FITS ), probes: probes( { measure: { method: 'string-search', reaches: true, evidence: 'grep found it' } } ) } ) );
	assert.equal( string.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( string ).reason, /G5 \(W-route\).*not measured on the live element/ );
	const thrown = await run( { rows: [ row( [ entry() ] ) ] }, env( { db: db( FITS ), probes: probes( { measure: () => { throw new Error( 'the live page is unreachable' ); } } ) } ) );
	assert.equal( thrown.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( thrown ).reason, /G5 \(W-route\).*the live page is unreachable/ );
	const probeThrown = await run( { rows: [ row( [ entry() ] ) ] }, env( { probes: probes( { probe: () => { throw new Error( 'no browser' ); } } ) } ) );
	assert.equal( probeThrown.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( probeThrown ).reason, /G6 \(W-route\).*no browser/ );
} );

test( 'a gate that now fails for an instrument reason (G3 unrouted, G4 dead) keeps the row open with that gate and class', async () => {
	const unrouted = await run( { rows: [ row( [ entry() ] ) ] }, env( { db: db( [ 'sgs/button', 'paddingTop', null, null, 'spacing-token', 'sgs' ] ) } ) );
	assert.equal( unrouted.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( unrouted ).reason, /G3 \(I-unrouted\): sgs\/button paddingTop .* \[sgs-framework\.db: SELECT/ );
	assert.doesNotMatch( outcomeOf( unrouted ).reason, /"command"/ );
	const dead = await run( { rows: [ row( [ entry() ] ) ] }, env( { db: db( FITS ), cache: () => ( { dead: [ 'paddingTop' ] } ), probes: probes( { measure: { method: 'measured', reaches: true, evidence: 'x' } } ) } ) );
	assert.equal( dead.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( dead ).reason, /G4 \(I-calibration\).*paddingTop is listed dead/ );
	assert.equal( dead.backlog.rows[ 0 ].lastRecheck.entries[ 0 ].outcome, 'open' );
} );

test( 'MUST FAIL: an F-hardcode row closes only when the winning-rule probe positively names no SGS rule; a probe with no answer or a setting that reaches leaves it open', async () => {
	const h = entry( { class: 'F-hardcode' } );
	const gone = await run( { rows: [ row( [ h ], { classes: [ 'F-hardcode' ] } ) ] }, env( { probes: probes( { probe: { rule: null, evidence: 'the rule that wins padding-top is .wp-site-blocks, not an SGS framework rule' } } ) } ) );
	assert.deepEqual( [ gone.backlog.rows[ 0 ].status, gone.backlog.rows[ 0 ].closed?.evidence[ 0 ].gate ], [ 'closed', 'G6' ] );
	const unanswered = await run( { rows: [ row( [ h ], { classes: [ 'F-hardcode' ] } ) ] }, env( { probes: probes( { probe: { evidence: 'no answer' } } ) } ) );
	assert.equal( unanswered.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( unanswered ).reason, /G6 \(W-route\)/ );
	const named = await run( { rows: [ row( [ h ], { classes: [ 'F-hardcode' ] } ) ] }, env( { probes: probes( { probe: { rule: '.sgs-button', evidence: 'removing it changes the value' } } ) } ) );
	assert.match( outcomeOf( named ).reason, /still holds/ );
	const reaches = await run( { rows: [ row( [ h ], { classes: [ 'F-hardcode' ] } ) ] }, env( { db: db( FITS ), probes: probes( { measure: { method: 'measured', reaches: true, emitted: 'e', evidence: 'x' }, probe: { rule: '.sgs-button', evidence: 'removing it changes the value' } } ) } ) );
	assert.equal( reaches.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( reaches ).reason, /G5 \(W-route\).*does not close an F-hardcode/ );
} );

test( 'MUST FAIL: a setting that reaches never closes an F-block or F-behaviour row; only its own probe can', async () => {
	const measure = { method: 'measured', reaches: true, emitted: 'e', evidence: 'x' };
	for ( const [ cls, still ] of [ [ 'F-block', { matches: [], evidence: 'no block matches' } ], [ 'F-behaviour', { flowFails: true, attributeMatches: [], evidence: 'the flow still fails' } ] ] ) {
		const res = await run( { rows: [ row( [ entry( { class: cls } ) ], { classes: [ cls ] } ) ] }, env( { db: db( FITS ), probes: probes( { measure, probe: still } ) } ) );
		assert.equal( res.backlog.rows[ 0 ].status, 'open', cls );
		assert.equal( outcomeOf( res ).gate, 'G5', cls );
	}
	const agrees = await run( { rows: [ row( [ entry( { class: 'F-block' } ) ] ) ] }, env( { db: db( FITS ), probes: probes( { measure, probe: { matches: [ 'sgs/accordion' ], evidence: '1 block matches' } } ) } ) );
	assert.deepEqual( [ agrees.backlog.rows[ 0 ].status, agrees.backlog.rows[ 0 ].closed.evidence[ 0 ].gate ], [ 'closed', 'G6' ] );
} );

test( 'MUST FAIL: a walker state the state map cannot map keeps the row open with that reason and never re-checks it against the resting settings', async () => {
	const e = env( { db: db( FITS ), probes: probes( { measure: { method: 'measured', reaches: true, emitted: 'e', evidence: 'x' } } ) } );
	const res = await run( { rows: [ row( [ entry( { state: 'scrolled-hover' } ) ] ) ] }, e );
	assert.equal( res.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( res ).reason, /walker state scrolled-hover maps to no setting state/ );
	assert.deepEqual( e.probes.calls, [] );
} );

test( 'F-block closes when the roster now has a matching block and not before; F-behaviour closes only when the flow agrees on a fresh walk, a name match alone leaves it open', async () => {
	const b = entry( { class: 'F-block' } );
	const match = await run( { rows: [ row( [ b ] ) ] }, env( { probes: probes( { probe: { matches: [ 'sgs/accordion' ], evidence: '1 block matches' } } ) } ) );
	assert.deepEqual( [ match.backlog.rows[ 0 ].status, match.backlog.rows[ 0 ].closed.evidence[ 0 ].gate ], [ 'closed', 'G6' ] );
	const empty = await run( { rows: [ row( [ b ] ) ] }, env( { probes: probes( { probe: { matches: [], evidence: 'none' } } ) } ) );
	assert.equal( empty.backlog.rows[ 0 ].status, 'open' );
	const noList = await run( { rows: [ row( [ b ] ) ] }, env( { probes: probes( { probe: { evidence: 'no answer' } } ) } ) );
	assert.equal( noList.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( noList ).reason, /G6 \(W-route\)/ );
	const f = entry( { class: 'F-behaviour' } );
	const agrees = await run( { rows: [ row( [ f ] ) ] }, env( { probes: probes( { probe: { flowFails: false, attributeMatches: [], evidence: 'now agrees' } } ) } ) );
	assert.equal( agrees.backlog.rows[ 0 ].status, 'closed' );
	const named = await run( { rows: [ row( [ f ] ) ] }, env( { probes: probes( { probe: { flowFails: true, attributeMatches: [ 'sgs/x skipAddsToBag' ], evidence: 'a setting matches' } } ) } ) );
	assert.equal( named.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( named ).reason, /G6 \(W-route\)/ );
} );

test( 'MUST FAIL: an entry whose re-check cannot run (F-vocabulary, no block, no state, no widths, an unparseable id, no environment) stays open with the reason and no probe is called', async () => {
	const bad = [
		[ entry( { class: 'F-vocabulary' } ), /F-vocabulary has no live probe/ ],
		[ entry( { block: null } ), /names no block/ ],
		[ entry( { state: null } ), /names no walker state/ ],
		[ entry( { widths: [] } ), /names no width/ ],
		[ entry( { id: 'header:garbled' } ), /id header:garbled does not carry/ ],
		[ entry( { id: 'header:cr-ref-header-3||style|padding-top|extra' } ), /does not carry/ ],
		[ entry( { id: 'footer:cr-ref-header-3||style|padding-top' } ), /does not carry/ ],
	];
	for ( const [ e, why ] of bad ) {
		const en = env();
		const res = await run( { rows: [ row( [ e ] ) ] }, en );
		assert.equal( res.backlog.rows[ 0 ].status, 'open' );
		assert.match( outcomeOf( res ).reason, why );
		assert.deepEqual( en.probes.calls, [] );
	}
	const noEnv = await recheckBacklog( { backlog: { rows: [ row( [ entry() ] ) ] }, envFor: async () => { throw new Error( 'no site is reachable' ); }, commit: 'c0ffee1', today: '2026-10-23' } );
	assert.equal( noEnv.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( noEnv ).reason, /no site is reachable/ );
} );

test( 'a row closes only when every entry on every width closed; one client or one width that still holds keeps it open', async () => {
	const closes = { measure: { method: 'measured', reaches: true, emitted: 'e', evidence: 'x' } };
	const two = await run( { rows: [ row( [ entry( { widths: [ 375, 1440 ] } ) ] ) ] }, env( { db: db( FITS ), probes: probes( { measure: ( r ) => ( 375 === r.width ? { method: 'measured', reaches: false, evidence: 'none names it' } : closes.measure ), probe: { changed: false, evidence: 'no setting' } } ) } ) );
	assert.equal( two.backlog.rows[ 0 ].status, 'open' );
	const both = await run( { rows: [ row( [ entry( { widths: [ 375, 1440 ] } ) ] ) ] }, env( { db: db( FITS ), probes: probes( closes ) } ) );
	assert.equal( both.backlog.rows[ 0 ].status, 'closed' );
	assert.deepEqual( both.backlog.rows[ 0 ].closed.evidence.map( ( x ) => x.width ), [ 375, 1440 ] );
	const beta = entry( { client: 'beta', surface: 'footer', id: 'footer:cr-ref-footer-2||style|padding-top' } );
	const mixed = await recheckBacklog( { backlog: { rows: [ row( [ entry(), beta ] ) ] }, envFor: async ( client ) => ( 'alpha' === client ? env( { db: db( FITS ), probes: probes( closes ) } ) : env() ), commit: 'c0ffee1', today: '2026-10-23' } );
	assert.equal( mixed.backlog.rows[ 0 ].status, 'open' );
	assert.deepEqual( mixed.report.entries.map( ( x ) => [ x.client, x.outcome ] ), [ [ 'alpha', 'closed' ], [ 'beta', 'open' ] ] );
	const allClosed = await recheckBacklog( { backlog: { rows: [ row( [ entry(), beta ] ) ] }, envFor: async () => env( { db: db( FITS ), probes: probes( closes ) } ), commit: 'c0ffee1', today: '2026-10-23' } );
	assert.equal( allClosed.backlog.rows[ 0 ].status, 'closed' );
	assert.deepEqual( allClosed.backlog.rows[ 0 ].closed.evidence.map( ( x ) => x.client ), [ 'alpha', 'beta' ] );
} );

test( 'a closed row is never re-run and comes back unchanged; the input backlog is never mutated', async () => {
	const closedRow = row( [ entry() ], { status: 'closed', closed: { commit: 'old1', on: '2026-10-21', evidence: [] } } );
	const open = row( [ entry( { client: 'beta' } ) ], { key: 'sgs/button||margin-top', property: 'margin-top' } );
	const input = { rows: [ closedRow, open ] };
	const before = JSON.stringify( input );
	const en = env();
	const res = await run( input, en );
	assert.equal( JSON.stringify( input ), before );
	assert.equal( JSON.stringify( res.backlog.rows[ 0 ] ), JSON.stringify( closedRow ) );
	assert.deepEqual( [ res.stats.skippedClosed, res.stats.open, res.stats.entries ], [ 1, 1, 1 ] );
	assert.equal( en.probes.calls.length, 1 );
} );

test( 'recheckEntry takes the commit-free gate path for one entry and reports each width', async () => {
	const r = await recheckEntry( entry( { widths: [ 375, 768 ] } ), env() );
	assert.deepEqual( r.widths.map( ( w ) => [ w.width, w.outcome ] ), [ [ 375, 'open' ], [ 768, 'open' ] ] );
	assert.equal( r.outcome, 'open' );
} );

test( 'the command refuses a missing backlog; --dry-run reports without writing, a real run records the re-check and the reason', () => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'recheck-' ) );
	const file = path.join( d, 'framework-backlog.json' );
	const miss = spawnSync( process.execPath, [ CLI, '--backlog', file ], { encoding: 'utf8' } );
	assert.notEqual( miss.status, 0 );
	assert.match( miss.stderr, /no backlog/ );
	fs.writeFileSync( file, JSON.stringify( { rows: [ row( [ entry( { client: 'no-such-client' } ) ] ) ] } ) );
	const before = fs.readFileSync( file, 'utf8' );
	const dry = spawnSync( process.execPath, [ CLI, '--backlog', file, '--dry-run' ], { encoding: 'utf8' } );
	assert.equal( dry.status, 0, dry.stderr );
	assert.match( dry.stdout, /dry run/ );
	assert.match( dry.stdout, /no-such-client.*surfaces\.json/ );
	assert.equal( fs.readFileSync( file, 'utf8' ), before );
	const real = spawnSync( process.execPath, [ CLI, '--backlog', file ], { encoding: 'utf8' } );
	assert.equal( real.status, 0, real.stderr );
	const after = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	assert.equal( after.rows[ 0 ].status, 'open' );
	assert.match( after.rows[ 0 ].lastRecheck.entries[ 0 ].reason, /surfaces\.json/ );
	assert.match( after.rows[ 0 ].lastRecheck.commit, /^[0-9a-f]{40}$/ );
} );

test( 'a setting on an enclosing block counts, an overriddenBy verdict needs a measured box, a row with no entries stays open and the environment is built once per surface', async () => {
	const measured = { measure: { method: 'measured', emitted: 'e', reaches: true, evidence: 'x' } };
	const up = await run( { rows: [ row( [ entry() ] ) ] }, env( { db: db( [ 'sgs/container', 'paddingTop', 'padding-top', null, 'spacing-token', 'sgs' ] ), probes: probes( measured ) } ) );
	assert.equal( up.backlog.rows[ 0 ].status, 'closed' );
	const over = await run( { rows: [ row( [ entry() ] ) ] }, env( { db: db( FITS ), cache: () => ( { settings: { paddingTop: { overriddenBy: [ '.x' ] } } } ), probes: probes( measured ) } ) );
	assert.equal( over.backlog.rows[ 0 ].status, 'open' );
	assert.match( outcomeOf( over ).reason, /G4 \(I-calibration\).*paddingTop is overridden by/ );
	const none = await run( { rows: [ row( [] ) ] }, env() );
	assert.deepEqual( [ none.backlog.rows[ 0 ].status, none.stats.entries ], [ 'open', 0 ] );
	let built = 0;
	const twice = await recheckBacklog( { backlog: { rows: [ row( [ entry(), entry( { id: 'header:cr-ref-header-4||style|padding-top' } ) ] ) ] }, envFor: async () => { built++; return env(); }, commit: 'c0ffee1', today: '2026-10-23' } );
	assert.deepEqual( [ built, twice.report.entries.length ], [ 1, 2 ] );
} );

// Proves FR-48-68's merger: every F-class row of every client's gaps.json becomes one backlog row keyed by block, attribute
// and property, the same gap on two clients is one row listing both with each client's surface, widths, state and gate
// evidence, a re-merge keeps firstSeen and never duplicates, a closed row stays closed, and a row that is not an F-class
// row is refused and counted, never dropped silently.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { backlogKey, mergeBacklog, readBacklog, readGapsFile, writeBacklog, findGapsFiles } from '../lib/framework-backlog.mjs';
import { GATES } from '../lib/gate-chain.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const CLI = path.join( HERE, '..', 'framework-backlog.mjs' );

// Evidence is opaque to the merger: a string today, a structured { command, line } or { file, key } later.
const gates = () => GATES.map( ( gate, i ) => ( { gate, status: 'pass', evidence: 3 === i ? { file: 'sgs-framework.db', key: 'block_attributes' } : `evidence for ${ gate }` } ) );
const gap = ( over = {} ) => ( {
	id: 'header:cr-ref-header-3||style|padding-top', class: 'F-setting', owner: 'owning framework spec', surface: 'header', draftId: 'Root/9#0', block: 'sgs/button',
	attribute: null, property: 'padding-top', widths: [ 375, 1440 ], state: 'rest', declared: '24px', renderedDraft: '24px', renderedLive: '16px', gates: gates(),
	firstSeen: '2026-10-20', publishedOn: '2026-10-22', killed: false, framework: true, ...over,
} );
const src = ( client, rows ) => ( { client, file: `sites/${ client }/build/qa/gaps.json`, rows } );
const merge = ( sources, backlog = { rows: [] }, mergedOn = '2026-10-23' ) => mergeBacklog( { backlog, sources, mergedOn } );
const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'backlog-' ) );

test( 'the same gap on two clients is one row listing both, each with its own surface, widths, state and unchanged gate evidence', () => {
	const a = gap();
	const b = gap( { id: 'footer:cr-ref-footer-9||style|padding-top', surface: 'footer', widths: [ 768 ], state: 'scrolled', publishedOn: '2026-10-23', firstSeen: '2026-10-23' } );
	const { backlog, stats } = merge( [ src( 'alpha', [ a ] ), src( 'beta', [ b ] ) ] );
	assert.equal( backlog.rows.length, 1 );
	const row = backlog.rows[ 0 ];
	assert.deepEqual( [ row.key, row.block, row.attribute, row.property, row.status, row.firstSeen, row.clients ], [ 'sgs/button||padding-top', 'sgs/button', null, 'padding-top', 'open', '2026-10-20', [ 'alpha', 'beta' ] ] );
	assert.deepEqual( row.entries.map( ( e ) => [ e.client, e.surface, e.widths, e.state ] ), [ [ 'alpha', 'header', [ 375, 1440 ], 'rest' ], [ 'beta', 'footer', [ 768 ], 'scrolled' ] ] );
	assert.deepEqual( row.entries[ 0 ].gates, a.gates );
	assert.deepEqual( row.entries[ 0 ].gates[ 3 ].evidence, { file: 'sgs-framework.db', key: 'block_attributes' } );
	assert.deepEqual( [ stats.merged, stats.newRows, stats.crossClientRows, stats.refusedNonF ], [ 2, 1, 1, 0 ] );
} );

test( 'negative control: a different attribute, property or block is a different row', () => {
	const rows = [ gap(), gap( { id: 'h:2', attribute: 'paddingTop' } ), gap( { id: 'h:3', property: 'margin-top' } ), gap( { id: 'h:4', block: 'sgs/heading' } ) ];
	const { backlog, stats } = merge( [ src( 'alpha', rows ) ] );
	assert.equal( backlog.rows.length, 4 );
	assert.equal( new Set( backlog.rows.map( ( r ) => r.key ) ).size, 4 );
	assert.equal( stats.crossClientRows, 0 );
	assert.equal( backlogKey( { block: 'sgs/a', attribute: null, property: 'x' } ), backlogKey( { block: 'sgs/a', attribute: '', property: 'x' } ) );
} );

test( 'MUST FAIL: a row with a non-F class is refused and counted, never merged or dropped silently', () => {
	const rows = [ gap(), gap( { id: 'h:w', class: 'W-route', framework: false } ), gap( { id: 'h:i', class: 'I-calibration', framework: false } ), gap( { id: 'h:c', class: 'CLIENT', framework: false } ) ];
	const { backlog, stats } = merge( [ src( 'alpha', rows ) ] );
	assert.equal( backlog.rows.length, 1 );
	assert.deepEqual( [ stats.rowsRead, stats.merged, stats.refusedNonF ], [ 4, 1, 3 ] );
	assert.deepEqual( stats.refused.map( ( r ) => [ r.client, r.id, r.reason ] ), [ [ 'alpha', 'h:w', 'non-F' ], [ 'alpha', 'h:i', 'non-F' ], [ 'alpha', 'h:c', 'non-F' ] ] );
} );

test( 'MUST FAIL: a malformed row (class and framework flag disagree, unknown class, no id, no block or property) is refused with its own count', () => {
	const rows = [
		gap( { id: 'h:flag', framework: false } ), gap( { id: 'h:flag2', class: 'W-route', framework: true } ), gap( { id: 'h:cls', class: 'F-mystery' } ),
		gap( { id: '' } ), gap( { id: 'h:nb', block: null } ), gap( { id: 'h:np', property: '' } ), null, 'row',
	];
	const { backlog, stats } = merge( [ src( 'alpha', rows ) ] );
	assert.equal( backlog.rows.length, 0 );
	assert.deepEqual( [ stats.rowsRead, stats.merged, stats.refusedMalformed, stats.refusedUnkeyed, stats.refusedNonF ], [ 8, 0, 6, 2, 0 ] );
	assert.equal( stats.refused.length, 8 );
	assert.ok( stats.refused.every( ( r ) => r.reason ) );
} );

test( 'MUST FAIL: a re-merge never duplicates a row or an entry and keeps firstSeen, while the entry takes the newest publish', () => {
	const first = merge( [ src( 'alpha', [ gap() ] ) ], { rows: [] }, '2026-10-22' );
	const again = merge( [ src( 'alpha', [ gap( { firstSeen: '2026-10-23', publishedOn: '2026-10-23', widths: [ 1440 ] } ) ] ) ], first.backlog, '2026-10-23' );
	assert.equal( again.backlog.rows.length, 1 );
	const row = again.backlog.rows[ 0 ];
	assert.equal( row.entries.length, 1 );
	assert.deepEqual( [ row.firstSeen, row.entries[ 0 ].firstSeen, row.lastSeen, row.entries[ 0 ].publishedOn, row.entries[ 0 ].widths ], [ '2026-10-20', '2026-10-20', '2026-10-23', '2026-10-23', [ 1440 ] ] );
	assert.deepEqual( [ again.stats.newRows, again.stats.updatedRows ], [ 0, 1 ] );
	assert.equal( first.backlog.rows[ 0 ].entries[ 0 ].widths.length, 2, 'the earlier backlog object is not mutated' );
	const third = merge( [ src( 'alpha', [ gap() ] ) ], again.backlog, '2026-10-24' );
	assert.deepEqual( third.backlog.rows[ 0 ].entries.length, 1 );
} );

test( 'MUST FAIL: a closed row stays closed with its closing commit when a client publishes the gap again, and the sighting is reported', () => {
	const closed = { ...merge( [ src( 'alpha', [ gap() ] ) ] ).backlog.rows[ 0 ], status: 'closed', closed: { commit: 'abc123', on: '2026-10-22', evidence: [ 'x' ] } };
	const before = JSON.stringify( closed );
	const { backlog, stats } = merge( [ src( 'beta', [ gap( { id: 'h:other' } ) ] ) ], { rows: [ closed ] } );
	assert.equal( backlog.rows.length, 1 );
	assert.equal( JSON.stringify( backlog.rows[ 0 ] ), before );
	assert.deepEqual( [ stats.keptClosed, stats.closedSeenAgain, stats.merged ], [ 1, [ 'sgs/button||padding-top' ], 1 ] );
} );

test( 'an entry a client no longer publishes is kept and counted, and another client\'s file never removes it', () => {
	const first = merge( [ src( 'alpha', [ gap() ] ), src( 'beta', [ gap( { id: 'f:1', surface: 'footer' } ) ] ) ] );
	const next = merge( [ src( 'alpha', [] ) ], first.backlog );
	assert.equal( next.backlog.rows[ 0 ].entries.length, 2 );
	assert.equal( next.stats.unpublishedEntries, 1 );
} );

test( 'the output is the same whatever order the clients and rows arrive in', () => {
	const a = src( 'alpha', [ gap( { property: 'color' } ), gap( { id: 'h:2' } ) ] );
	const b = src( 'beta', [ gap( { id: 'f:1', surface: 'footer' } ) ] );
	assert.deepEqual( merge( [ a, b ] ).backlog, merge( [ b, { ...a, rows: [ ...a.rows ].reverse() } ] ).backlog );
} );

test( 'readGapsFile refuses an unreadable file or one without a rows array, naming the file; readBacklog gives an empty backlog for a missing file and refuses a malformed one', () => {
	const d = tmp();
	const bad = path.join( d, 'bad.json' );
	fs.writeFileSync( bad, '{ nope' );
	assert.throws( () => readGapsFile( bad ), /bad\.json/ );
	fs.writeFileSync( bad, JSON.stringify( { rowz: [] } ) );
	assert.throws( () => readGapsFile( bad ), /no rows array/ );
	assert.throws( () => readGapsFile( path.join( d, 'missing.json' ) ), /missing\.json/ );
	assert.deepEqual( readBacklog( path.join( d, 'none.json' ) ), { rows: [] } );
	fs.writeFileSync( bad, JSON.stringify( { rows: 'x' } ) );
	assert.throws( () => readBacklog( bad ), /no rows array/ );
	const out = path.join( d, 'reports', 'b.json' );
	const { backlog } = merge( [ src( 'alpha', [ gap() ] ) ] );
	writeBacklog( out, backlog );
	assert.deepEqual( readBacklog( out ), backlog );
} );

test( 'findGapsFiles lists sites/<client>/build/qa/gaps.json for every client that has one', () => {
	const d = tmp();
	for ( const c of [ 'beta', 'alpha' ] ) {
		fs.mkdirSync( path.join( d, c, 'build', 'qa' ), { recursive: true } );
		fs.writeFileSync( path.join( d, c, 'build', 'qa', 'gaps.json' ), '{"rows":[]}' );
	}
	fs.mkdirSync( path.join( d, 'gamma', 'build' ), { recursive: true } );
	assert.deepEqual( findGapsFiles( d ).map( ( f ) => f.client ), [ 'alpha', 'beta' ] );
} );

test( 'the command merges every client\'s gaps.json, prints the counts and writes the backlog; a second run changes nothing', () => {
	const d = tmp();
	for ( const [ c, rows ] of [ [ 'alpha', [ gap(), gap( { id: 'h:w', class: 'W-route', framework: false } ) ] ], [ 'beta', [ gap( { id: 'f:1', surface: 'footer' } ) ] ] ] ) {
		fs.mkdirSync( path.join( d, c, 'build', 'qa' ), { recursive: true } );
		fs.writeFileSync( path.join( d, c, 'build', 'qa', 'gaps.json' ), JSON.stringify( { rows } ) );
	}
	const out = path.join( d, 'out', 'framework-backlog.json' );
	const run = () => spawnSync( process.execPath, [ CLI, '--sites', d, '--out', out, '--on', '2026-10-23' ], { encoding: 'utf8' } );
	const r = run();
	assert.equal( r.status, 0, r.stderr );
	assert.match( r.stdout, /2 clients, 3 rows read, 2 F rows merged, 1 cross-client, 1 non-F refused/ );
	const first = fs.readFileSync( out, 'utf8' );
	assert.equal( JSON.parse( first ).rows.length, 1 );
	assert.equal( run().status, 0 );
	assert.equal( fs.readFileSync( out, 'utf8' ), first );
	const none = spawnSync( process.execPath, [ CLI, '--sites', path.join( d, 'nowhere' ), '--out', out ], { encoding: 'utf8' } );
	assert.notEqual( none.status, 0 );
	assert.equal( fs.readFileSync( out, 'utf8' ), first );
} );

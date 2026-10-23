// Spec 48 FR-48-5: the guard remembers the suspects it tried after a trial is exhausted; a Solve run that stops early leaves
// a crash report of the writes no walk judged (written ahead of the tree save, so even a killed process leaves it) and the
// next run judges them first; the wrong-write count takes every later read, not only the guard's reverts and the last walk.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { guardRound } from '../lib/guard.mjs';
import { solveLoop } from '../lib/solve-loop.mjs';
import { journalFile, writeJournal, readJournal, resumeFrom, markStopped } from '../lib/solve-journal.mjs';
import { wrongWrites } from '../solve.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'solve-memory-' ) );

// Two suspects on one node, nothing explaining the regressed row: layout is tried first, then padding.
const node = () => [ { name: 'sgs/container', attributes: { className: 'cr-ref-h-1', layout: 'stack', padding: { desktop: { top: '4px' } } } } ];
const writes = () => [
	{ round: 1, group: 'g-pt', ref: 'cr-ref-h-1', block: 'sgs/container', attr: 'padding', prop: 'padding-top', before: null, after: { desktop: { top: '4px' } } },
	{ round: 1, group: 'g-lay', ref: 'cr-ref-h-1', block: 'sgs/container', attr: 'layout', prop: 'display', before: null, after: 'stack' },
];
const run = ( diffs ) => ( { runs: [ { state: 'opening', width: 375, pairs: { row: { diffs } } } ] } );
const regressed = run( [ { kind: 'style', key: 'justify-content', draft: 'center', live: 'normal', ref: 'cr-ref-h-1', path: '' } ] );
const cleared = run( [] );
const layoutCal = () => ( { settings: {}, discovered: { layout: { display: { slots: [ '.sgs-container__inner' ], values: {} } } } } );

test( 'MUST FAIL WITHOUT GUARD MEMORY: once every suspect was tried, a later round never tries one again', () => {
	const t = node();
	const w = writes();
	const trials = new Map();
	const tried = [];
	for ( let i = 0; i < 5; i++ ) {
		tried.push( guardRound( cleared, regressed, t, w, new Map(), layoutCal, trials ).filter( ( x ) => x.trial ).map( ( x ) => x.attr ) );
	}
	assert.deepEqual( tried.map( ( l ) => [ ...new Set( l ) ].join() ), [ 'layout', 'padding', '', '', '' ], 'each suspect is tried once, then never again' );
	assert.deepEqual( t[ 0 ].attributes, node()[ 0 ].attributes, 'both innocents are back in the tree' );
	assert.deepEqual( [ ...trials.get( 'cr-ref-h-1' ).tried ].sort(), [ 'cr-ref-h-1|layout', 'cr-ref-h-1|padding' ] );
	assert.equal( trials.get( 'cr-ref-h-1' ).setting, null, 'no trial is open, so no settling walk is asked for' );
} );

test( 'a proven culprit stays reverted and is remembered; the other suspect is still tried for a new regression', () => {
	const t = node();
	const w = writes();
	const trials = new Map();
	guardRound( cleared, regressed, t, w, new Map(), layoutCal, trials );
	guardRound( cleared, cleared, t, w, new Map(), layoutCal, trials );
	assert.equal( w.find( ( x ) => 'layout' === x.attr ).reverted, true );
	assert.ok( trials.get( 'cr-ref-h-1' ).tried.has( 'cr-ref-h-1|layout' ) );
	const next = guardRound( cleared, regressed, t, w, new Map(), layoutCal, trials );
	assert.deepEqual( [ ...new Set( next.filter( ( x ) => x.trial ).map( ( x ) => x.attr ) ) ], [ 'padding' ] );
} );

// A loop whose second walk fails (a host failure): the steps record each call, the journal writes the real file.
const steps = ( file, { failOn = 2, journalOf = null } = {} ) => {
	const calls = [];
	return { calls, maxRounds: 2, log: () => {},
		build: ( r ) => ( calls.push( `build ${ r }` ), { ok: true } ),
		walk: async ( r ) => {
			calls.push( `walk ${ r }` );
			if ( r === failOn ) {
				throw new Error( 'host answered 503' );
			}
			return cleared;
		},
		guard: ( prev, rep, last ) => ( calls.push( `guard ${ last.map( ( x ) => x.attr ).join( '+' ) }` ), [] ),
		write: async ( rep, r ) => ( calls.push( `write ${ r }` ), { writes: writes().map( ( x ) => ( { ...x, round: r } ) ), gaps: {} } ),
		save: () => calls.push( 'save' ),
		journal: journalOf || ( ( list, o ) => writeJournal( file, { surface: 'demo', round: o.round, base: o.baseRound ? `round-${ o.baseRound }` : null, writes: list, stopped: o.stopped } ) ),
	};
};

test( 'MUST FAIL WITHOUT THE JOURNAL: a run that stops mid-round leaves a crash report listing the round\'s writes, unjudged', async () => {
	const file = journalFile( tmp(), 'demo' );
	const s = steps( file );
	await assert.rejects( solveLoop( s ), /503/ );
	const rec = readJournal( file );
	assert.deepEqual( rec.writes.map( ( w ) => `${ w.ref }|${ w.attr }|${ w.round }` ).sort(), [ 'cr-ref-h-1|layout|1', 'cr-ref-h-1|padding|1' ] );
	assert.ok( rec.writes.every( ( w ) => true === w.unjudged ) );
	assert.equal( rec.base, 'round-1' );
	assert.match( rec.stopped, /round 2: host answered 503/ );
	assert.ok( s.calls.indexOf( 'write 1' ) < s.calls.indexOf( 'save' ), 'the journal precedes the save' );
} );

test( 'a run that finishes leaves no crash report; a judged walk clears it', async () => {
	const file = journalFile( tmp(), 'demo' );
	await solveLoop( steps( file, { failOn: -1 } ) );
	assert.equal( readJournal( file ), null );
	assert.equal( markStopped( file, 'x' ), null, 'nothing to mark when no write is unjudged' );
} );

test( 'MUST FAIL WITHOUT THE JOURNAL: a Solve process killed mid-round leaves the crash report', async () => {
	const dir = tmp();
	const file = journalFile( dir, 'demo' );
	const child = spawn( process.execPath, [ path.join( HERE, 'fixtures', 'solve-memory', 'killed-run.mjs' ), pathToFileURL( path.join( HERE, '..', 'lib' ) ).href, file ], { stdio: [ 'ignore', 'pipe', 'inherit' ] } );
	await new Promise( ( done, fail ) => {
		child.stdout.on( 'data', ( d ) => String( d ).includes( 'walking 2' ) && done() );
		child.on( 'exit', ( c ) => fail( new Error( `the child exited (${ c }) before round 2's walk` ) ) );
	} );
	child.kill( 'SIGKILL' );
	await new Promise( ( done ) => child.once( 'exit', done ) );
	const rec = readJournal( file );
	assert.deepEqual( rec.writes.map( ( w ) => w.attr ).sort(), [ 'layout', 'padding' ] );
	assert.ok( rec.writes.every( ( w ) => w.unjudged && 1 === w.round ) );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL WITHOUT THE RESUME: the next run judges the unjudged writes on its first walk before it writes anything', async () => {
	const dir = tmp();
	const base = path.join( dir, 'base.json' );
	fs.writeFileSync( base, JSON.stringify( cleared ) );
	const file = journalFile( dir, 'demo' );
	writeJournal( file, { surface: 'demo', round: 1, base, writes: writes(), stopped: 'killed' } );
	const resume = resumeFrom( readJournal( file ) );
	assert.match( resume.note, /2 unjudged setting\(s\) from round 1 \(stopped: killed\)/ );
	const s = steps( file, { failOn: -1 } );
	await solveLoop( { ...s, resume } );
	assert.deepEqual( s.calls.slice( 0, 4 ), [ 'build 1', 'walk 1', 'guard padding+layout', 'write 1' ] );
	fs.rmSync( base );
	assert.match( resumeFrom( readJournal( file ) || { writes: writes(), base } ).note, /is gone, so the guard cannot judge them/ );
	assert.equal( resumeFrom( null ), null );
} );

// A write whose row moved away on the next read and came back by the last one; no guard revert.
const w1 = () => [ { round: 1, group: 'cr-ref-h-1||padding-top|', ref: 'cr-ref-h-1', attr: 'padding', rows: [ { width: 375, draft: '20px', live: '10px' } ] } ];
const padRun = ( live ) => run( [ { kind: 'style', key: 'padding-top', draft: '20px', live, ref: 'cr-ref-h-1', path: '' } ] );

test( 'MUST FAIL WITHOUT EVERY LATER READ: a write that moved its row away without a guard revert counts as wrong', () => {
	const reads = [ { round: 1, report: padRun( '10px' ) }, { round: 2, report: padRun( '40px' ) }, { round: 3, report: padRun( '10px' ) } ];
	assert.equal( wrongWrites( w1(), reads[ 2 ].report, { opening: null }, reads ).length, 1 );
	assert.equal( wrongWrites( w1(), reads[ 2 ].report, { opening: null } ).length, 0, 'the last walk alone does not show it' );
} );

test( 'a read taken with a guard suspect undone, or before the write, does not judge it; a closer read is not wrong', () => {
	const trial = [ { round: 1, report: padRun( '10px' ) }, { round: 2, report: padRun( '40px' ), trialOpen: true }, { round: 3, report: padRun( '10px' ) } ];
	assert.equal( wrongWrites( w1(), trial[ 2 ].report, { opening: null }, trial ).length, 0 );
	const early = [ { round: 0, report: padRun( '40px' ) }, { round: 1, report: padRun( '10px' ) }, { round: 2, report: padRun( '15px' ) } ];
	assert.equal( wrongWrites( w1(), early[ 2 ].report, { opening: null }, early ).length, 0 );
} );

// Proves the foundation command's sequencer (lib/foundation-run.mjs) with steps that run nothing: each step reports one line (ok, skip with the
// reason, FAIL with the next action, stop), a step that holds a current result is skipped and --force runs it anyway, a failure stops every step
// that depends on it (and only those), a step with nothing to do by design satisfies a dependency, the state file records each success and a
// record matches only while the fingerprint does, and a plan runs nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { heldByState, readState, resultLine, runFoundation, stateFile, writeState } from '../lib/foundation-run.mjs';

const fakeClock = () => {
	let t = 0;
	return () => ( t += 2000 );
};
const make = ( ids, behaviour = {} ) => {
	const calls = [];
	const steps = ids.map( ( id ) => ( {
		id,
		deps: behaviour[ id ]?.deps ?? [],
		title: `do ${ id }`,
		applicable: behaviour[ id ]?.applicable,
		holds: behaviour[ id ]?.holds,
		fingerprint: behaviour[ id ]?.fingerprint,
		record: behaviour[ id ]?.record,
		run: async () => {
			calls.push( id );
			if ( behaviour[ id ]?.fail ) {
				throw Object.assign( new Error( behaviour[ id ].fail ), { next: behaviour[ id ].next } );
			}
			return behaviour[ id ]?.detail ?? `${ id } done`;
		},
	} ) );
	return { calls, steps };
};
const run = ( steps, extra = {} ) => {
	const lines = [];
	return runFoundation( { steps, log: ( l ) => lines.push( l ), now: fakeClock(), stamp: () => 'T', ...extra } ).then( ( r ) => ( { ...r, lines } ) );
};

test( 'MUST FAIL: each step reports one line in order and a clean run is ok', async () => {
	const { steps, calls } = make( [ 'a', 'b' ], { b: { deps: [ 'a' ], detail: '3 written' } } );
	const r = await run( steps );
	assert.deepEqual( calls, [ 'a', 'b' ] );
	assert.deepEqual( r.lines, [ 'ok   a 2s - a done', 'ok   b 2s - 3 written' ] );
	assert.equal( r.ok, true );
} );

test( 'MUST FAIL: a step that holds a current result is skipped with its reason, and --force runs it anyway', async () => {
	const behaviour = { a: { holds: () => 'MANIFEST.json is what the check last passed' } };
	const first = make( [ 'a', 'b' ], behaviour );
	const r = await run( first.steps );
	assert.deepEqual( first.calls, [ 'b' ] );
	assert.equal( r.lines[ 0 ], 'skip a - MANIFEST.json is what the check last passed' );
	const forced = make( [ 'a', 'b' ], behaviour );
	await run( forced.steps, { force: [ 'a' ] } );
	assert.deepEqual( forced.calls, [ 'a', 'b' ], 'negative control: force runs a held step' );
} );

test( 'MUST FAIL: a failed step prints its detail and next action, and stops every step that depends on it, directly or through another; an independent step still runs', async () => {
	const { steps, calls } = make( [ 'intake', 'tokens', 'site-info', 'media' ], {
		intake: { fail: 'intake exited 1: the sandbox refused', next: 'rerun intake alone' },
		tokens: { deps: [ 'intake' ] },
		'site-info': { deps: [ 'tokens' ] },
	} );
	const r = await run( steps );
	assert.deepEqual( calls, [ 'intake', 'media' ] );
	assert.deepEqual( r.lines, [
		'FAIL intake 2s - intake exited 1: the sandbox refused; next: rerun intake alone',
		'stop tokens - depends on intake, which failed',
		'stop site-info - depends on tokens, which did not run',
		'ok   media 2s - media done',
	] );
	assert.equal( r.ok, false );
} );

test( 'MUST FAIL: a step with nothing to do by design is skipped and a step that depends on it still runs', async () => {
	const { steps, calls } = make( [ 'push', 'info' ], { push: { applicable: () => 'a local copy takes the snapshot with the sync' }, info: { deps: [ 'push' ] } } );
	const r = await run( steps );
	assert.deepEqual( calls, [ 'info' ] );
	assert.equal( r.lines[ 0 ], 'skip push - a local copy takes the snapshot with the sync' );
	assert.equal( r.ok, true );
	assert.equal( r.results[ 0 ].notApplicable, true );
} );

test( 'MUST FAIL: the state file records each success with its fingerprint and extras, a record matches only while the fingerprint does, and nothing is recorded for a failure', async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'foundation-run-' ) );
	const file = stateFile( { repo: dir, client: 'acme', site: 'local-mediatest-acme' } );
	assert.equal( file, path.join( dir, 'sites', 'acme', 'build', 'foundation', 'local-mediatest-acme.json' ) );
	const state = readState( file );
	assert.deepEqual( state, { steps: {} } );
	const { steps } = make( [ 'a', 'b', 'c' ], { a: { fingerprint: () => 'fp-a', record: () => ( { to: 'scratch' } ) }, b: { fail: 'broke' } } );
	await run( steps, { state, file } );
	const saved = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	assert.deepEqual( saved.steps.a, { at: 'T', after: 'fp-a', detail: 'a done', to: 'scratch' } );
	assert.equal( saved.steps.b, undefined, 'a failed step leaves no record' );
	assert.equal( heldByState( saved, 'a', 'fp-a' ), true );
	assert.equal( heldByState( saved, 'a', 'fp-changed' ), false, 'an input changed since' );
	assert.equal( heldByState( saved, 'b', 'fp-b' ), false );
	assert.equal( heldByState( saved, 'a', null ), false, 'a step with no fingerprint is never held by state' );
	assert.equal( saved.steps.c.after, null );
	assert.equal( heldByState( saved, 'c', null ), false, 'a record with no fingerprint holds nothing' );
	fs.writeFileSync( file, '{ not json' );
	assert.deepEqual( readState( file ), { steps: {} }, 'a damaged state file is read as none' );
	writeState( file, { steps: {} } );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a plan runs nothing and says what each step would do or why it would not', async () => {
	const { steps, calls } = make( [ 'a', 'b', 'c' ], { a: { holds: () => 'already done' }, b: { applicable: () => 'not for this site' } } );
	const r = await run( steps, { plan: true } );
	assert.deepEqual( calls, [] );
	assert.deepEqual( r.lines, [ 'skip a - already done', 'skip b - not for this site', 'plan c - would run: do c' ] );
	assert.equal( r.ok, true );
} );

test( 'MUST FAIL: a step marked always runs under a plan (the preflight does), the others do not', async () => {
	const { steps, calls } = make( [ 'pre', 'b' ] );
	steps[ 0 ].always = true;
	const r = await run( steps, { plan: true } );
	assert.deepEqual( calls, [ 'pre' ] );
	assert.deepEqual( r.lines, [ 'ok   pre 2s - pre done', 'plan b - would run: do b' ] );
} );

test( 'the printed line of each result', () => {
	assert.equal( resultLine( { id: 'x', status: 'ok', seconds: 5, detail: '' } ), 'ok   x 5s' );
	assert.equal( resultLine( { id: 'x', status: 'fail', seconds: 5, detail: 'bad', next: null } ), 'FAIL x 5s - bad' );
	assert.equal( resultLine( { id: 'x', status: 'stop', dependsOn: 'y', dependsOnStatus: 'failed' } ), 'stop x - depends on y, which failed' );
} );

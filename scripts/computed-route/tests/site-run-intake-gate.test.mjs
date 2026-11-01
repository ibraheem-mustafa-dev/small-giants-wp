// The site run's stage-1 gate (lib/site-run-intake-gate.mjs): it refuses while an intake review row has no mark or the stage 0
// baseline records a different handoff manifest hash.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { unmarkedRows, intakeGateProblems, intakeGateFor, manifestSha256 } from '../lib/site-run-intake-gate.mjs';
import { reviewRows } from '../lib/intake-review.mjs';

const intake = ( marks = {} ) => {
	const base = {
		client: 'fx', flags: [ { kind: 'orphan', text: 'x', draftId: 'd1', why: 'w' } ],
		skeletons: { header: { rows: [ { rowId: 'skeleton:header:a', key: 'a', tag: 'a', words: 'Home', block: 'sgs/button', confidence: 1 }, { rowId: 'skeleton:header:b', key: 'b', tag: 'p', words: 'Hi', block: 'sgs/text', confidence: 1 } ] } },
	};
	return { ...base, review: reviewRows( base ).map( ( r ) => ( { rowId: r.rowId, rowType: r.rowType, mark: marks[ r.rowId ] ?? null } ) ) };
};

test( 'MUST FAIL: the site run refuses while a review row has no mark, naming the count, the first rows and the command', () => {
	const open = intakeGateProblems( { client: 'fx', intake: intake( { 'skeleton:header:a': 'accept' } ) } );
	assert.equal( open.length, 1 );
	assert.match( open[ 0 ], /1 intake review rows have no mark/ );
	assert.match( open[ 0 ], /skeleton:header:b \[skeleton-block\]/ );
	assert.match( open[ 0 ], /intake\.mjs --apply-review fx/ );
	assert.deepEqual( unmarkedRows( intake() ).map( ( r ) => r.rowId ), [ 'skeleton:header:a', 'skeleton:header:b' ], 'a flag row left blank has its default and is not listed' );
} );

test( 'MUST FAIL: negative controls: every row marked passes, and a blank flag row alone does not refuse', () => {
	assert.deepEqual( intakeGateProblems( { client: 'fx', intake: intake( { 'skeleton:header:a': 'accept', 'skeleton:header:b': 'accept' } ) } ), [] );
	assert.deepEqual( unmarkedRows( intake( { 'skeleton:header:a': 'accept', 'skeleton:header:b': 'accept' } ) ), [] );
} );

test( 'MUST FAIL: the site run refuses when the baseline records a different manifest hash, no hash, or is missing', () => {
	const all = intake( { 'skeleton:header:a': 'accept', 'skeleton:header:b': 'accept' } );
	assert.match( intakeGateProblems( { client: 'fx', intake: all, manifestHash: 'bbb', baselineHash: 'aaa', baselineExists: true } )[ 0 ], /stage 0 is stale.*differs from the manifestSha256.*stage0\.mjs --client fx --site/ );
	assert.match( intakeGateProblems( { client: 'fx', intake: all, manifestHash: 'bbb', baselineHash: null, baselineExists: true } )[ 0 ], /records no manifestSha256/ );
	assert.match( intakeGateProblems( { client: 'fx', intake: all, manifestHash: 'bbb' } )[ 0 ], /baseline\.json is missing/ );
	assert.deepEqual( intakeGateProblems( { client: 'fx', intake: all, manifestHash: 'aaa', baselineHash: 'aaa', baselineExists: true } ), [], 'negative control: equal hashes pass' );
	assert.deepEqual( intakeGateProblems( { client: 'fx', intake: all } ), [], 'negative control: no manifest, nothing to be stale against' );
} );

test( 'MUST FAIL: intakeGateFor compares hashes on disk: a newer MANIFEST.json with the same content passes, changed content or a baseline without the field refuses', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'gate-' ) );
	const all = intake( { 'skeleton:header:a': 'accept', 'skeleton:header:b': 'accept' } );
	const handoff = path.join( repo, 'sites', 'fx', 'handoff' );
	const intakeDir = path.join( repo, 'sites', 'fx', 'build', 'intake' );
	fs.mkdirSync( handoff, { recursive: true } );
	fs.mkdirSync( intakeDir, { recursive: true } );
	const manifest = path.join( handoff, 'MANIFEST.json' );
	const baseline = path.join( intakeDir, 'calibration-baseline.json' );
	fs.writeFileSync( manifest, '{"files":[]}\n' );
	fs.writeFileSync( baseline, JSON.stringify( { manifestSha256: manifestSha256( manifest ) } ) );
	const later = new Date( Date.now() + 60000 );
	fs.utimesSync( manifest, later, later );
	assert.deepEqual( intakeGateFor( repo, 'fx', all ), [], 'a manifest touched after the baseline, with the same content, passes' );
	fs.writeFileSync( manifest, '{"files":["a"]}\n' );
	assert.match( intakeGateFor( repo, 'fx', all )[ 0 ], /differs from the manifestSha256/ );
	fs.writeFileSync( baseline, '{}' );
	assert.match( intakeGateFor( repo, 'fx', all )[ 0 ], /records no manifestSha256/ );
	fs.rmSync( baseline );
	assert.match( intakeGateFor( repo, 'fx', all )[ 0 ], /is missing/ );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

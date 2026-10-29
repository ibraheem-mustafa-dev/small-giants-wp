// Register row E1: the proposals stage, which runs after the facts stage, reads the breakpoints and the animation records
// from the run context, so the stages that produce them leave them there. A real intake ran neither path in the fixture
// tests: the breakpoints stage named a context it was never given (a ReferenceError on every run), and nothing kept the
// inventory's animation records, so the proposals lost the looping keys. No browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STAGES, keepAnimations } from '../lib/intake-run-stages.mjs';

const stage = ( name ) => STAGES.find( ( [ n ] ) => n === name )[ 1 ];

test( 'MUST FAIL: the breakpoints stage runs and leaves its breakpoints on the run context', () => {
	const folder = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-bp-' ) );
	const ctx = {};
	const out = stage( 'breakpoints' )( { folder }, ctx );
	assert.ok( Array.isArray( ctx.breakpoints ) );
	assert.deepEqual( out.breakpoints, ctx.breakpoints );
} );

test( 'MUST FAIL: the inventory stage result keeps its animation records on the run context, unchanged', () => {
	const ctx = {};
	const out = { inventory: { animations: { records: [ { id: 'K-01' } ] } }, note: 'x' };
	assert.equal( keepAnimations( ctx, out ), out );
	assert.deepEqual( ctx.animations, { records: [ { id: 'K-01' } ] } );
} );

test( 'negative control: an inventory result with no animation records leaves null, never the previous value', () => {
	const ctx = { animations: { stale: true } };
	keepAnimations( ctx, { inventory: {} } );
	assert.equal( ctx.animations, null );
} );

test( 'MUST FAIL: the inventory stage hands its result through keepAnimations', () => {
	assert.match( String( stage( 'inventory' ) ), /keepAnimations\(\s*ctx,/ );
} );

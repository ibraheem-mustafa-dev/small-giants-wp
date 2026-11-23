// The detector for retiring calibration (tools/retire-calibration.mjs) catches what it is for: a listed file that still exists
// and a live file that imports or names one, and it stays quiet about the kept modules that share a stem with a removed command.
import test from 'node:test';
import assert from 'node:assert/strict';
import { REMOVED, selfTest } from '../tools/retire-calibration.mjs';

test( 'MUST FAIL WITHOUT THE SCAN: the self-test sees a planted file, a planted import and a planted root-command import, and a clean tree stays clean', () => {
	const r = selfTest();
	assert.equal( r.cleanOk, true, 'a tree holding only kept modules reports nothing' );
	assert.equal( r.catchesFile, true );
	assert.equal( r.catchesImport, true );
	assert.equal( r.catchesRootCommand, true );
} );

test( 'the list names each path once, in a part the retirement hands out', () => {
	assert.equal( new Set( REMOVED.map( ( r ) => r.path ) ).size, REMOVED.length );
	assert.ok( REMOVED.every( ( r ) => [ 'A', 'B' ].includes( r.part ) ) );
	assert.ok( ! REMOVED.some( ( r ) => /lib\/(calibrate|calibrate-instances|calibrate-markers|calibrate-content|calibrate-props|calibration-refs)\.mjs$/.test( r.path ) ), 'the kept modules are never listed' );
} );

// Proves the calibration build step survives a block with hundreds of instances (CR17, sgs/business-info plans 343):
// the child gets a bigger heap, a block may set its own chunk size, and a chunk whose build times out is halved and
// retried instead of failing the block.
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { CHILD_TIMEOUT_MS, EDITOR_TIMEOUT_MS, NODE_HEAP_FLAG, RUN_HEAP_BYTES, needsBiggerHeap, buildSpawnArgs, chunkSizeFor, halveChunk, planChunks, splitOnTimeout, MIN_CHUNK } from '../lib/calibrate-chunk.mjs';

test( 'MUST FAIL (the build child ran on the default heap and was killed at 300s): the spawn passes --max-old-space-size=8192 before the script', () => {
	assert.equal( NODE_HEAP_FLAG, '--max-old-space-size=8192' );
	const args = buildSpawnArgs( '/repo/scripts/wp-build-page.js', { envFile: 'e.env', envKey: 'K' }, '/t/tree.json', [ '--dry-run' ] );
	assert.deepEqual( args.slice( 0, 2 ), [ NODE_HEAP_FLAG, '/repo/scripts/wp-build-page.js' ] );
	assert.deepEqual( args.slice( 2 ), [ '--env-file', 'e.env', '--env-key', 'K', '--tree', '/t/tree.json', '--editor-timeout', String( EDITOR_TIMEOUT_MS ), '--dry-run' ] );
} );

// CR4: sgs/nav-bar-menu's 744-block calibration page took 150 s to return its edit screen on the local mirror, so every
// attempt died at wp-build-page.js's 60 s default and the block could not be calibrated.
test( 'MUST FAIL (CR4, a large calibration page timed out loading the editor at 60 s): the child gets the long editor limit and a whole-run limit that covers load, save and reload', () => {
	const args = buildSpawnArgs( '/s.js', { envFile: 'e', envKey: 'K' }, '/t.json' );
	assert.equal( args[ args.indexOf( '--editor-timeout' ) + 1 ], String( EDITOR_TIMEOUT_MS ) );
	assert.ok( EDITOR_TIMEOUT_MS >= 150000 * 1.5, 'room above the measured 150 s load' );
	assert.ok( CHILD_TIMEOUT_MS >= 2 * EDITOR_TIMEOUT_MS + 60000, 'the child limit covers two editor loads plus login and save' );
	// Every editor wait in wp-build-page.js reads the flag: a literal 60 s left anywhere is the old ceiling back.
	const src = fs.readFileSync( new URL( '../../wp-build-page.js', import.meta.url ), 'utf8' );
	assert.equal( ( src.match( /timeout:\s*60000/g ) || [] ).length, 0, 'no editor wait keeps a hardcoded 60 s' );
	assert.ok( ( src.match( /args\.editorTimeout/g ) || [] ).length >= 6 );
	// The calibration run's own loads of that page (the login and the front-end reads) read the same limit.
	for ( const f of [ '../lib/calibrate-read.mjs', '../lib/calibrate-content.mjs' ] ) {
		const text = fs.readFileSync( new URL( f, import.meta.url ), 'utf8' );
		assert.equal( ( text.match( /timeout:\s*60000/g ) || [] ).length, 0, `${ f } keeps no hardcoded 60 s` );
		assert.match( text, /timeout: EDITOR_TIMEOUT_MS/ );
	}
	assert.match( fs.readFileSync( new URL( '../calibrate.mjs', import.meta.url ), 'utf8' ), /ensureLoggedIn\( shared\.page, env, EDITOR_TIMEOUT_MS \)/ );
} );

test( 'a fixture names its own chunk size; a bad value falls back to the default', () => {
	assert.equal( chunkSizeFor( { chunk: 100 }, 150 ), 100 );
	assert.equal( chunkSizeFor( {}, 150 ), 150 );
	assert.equal( chunkSizeFor( { chunk: 0 }, 150 ), 150 );
	assert.equal( chunkSizeFor( { chunk: 'x' }, 150 ), 150 );
	assert.equal( chunkSizeFor( { chunk: 12.7 }, 150 ), 12 );
} );

test( 'halving never goes below the floor', () => {
	assert.equal( halveChunk( 150 ), 75 );
	assert.equal( halveChunk( 75 ), 37 );
	assert.equal( halveChunk( 3 ), 1 );
	assert.equal( halveChunk( 1 ), MIN_CHUNK );
} );

test( 'MUST FAIL (business-info: 343 instances in one page): the others are chunked, each chunk carrying every default', () => {
	const defaults = [ { key: 'd0' }, { key: 'd1' } ];
	const others = Array.from( { length: 341 }, ( _, i ) => ( { key: `o${ i }` } ) );
	const chunks = planChunks( defaults, others, 150 );
	assert.equal( chunks.length, 3 );
	assert.ok( chunks.every( ( c ) => c[ 0 ].key === 'd0' && c[ 1 ].key === 'd1' ) );
	assert.deepEqual( chunks.map( ( c ) => c.length - 2 ), [ 150, 150, 41 ] );
	assert.deepEqual( planChunks( defaults, [], 150 ), [ defaults ] );
} );

test( 'MUST FAIL (a timed-out chunk failed the whole block): splitOnTimeout halves the chunk and keeps every default', () => {
	const defaults = [ { key: 'd0', isDefault: true } ];
	const list = [ ...defaults, ...Array.from( { length: 150 }, ( _, i ) => ( { key: `o${ i }` } ) ) ];
	const { size, chunks } = splitOnTimeout( list, 150 );
	assert.equal( size, 75 );
	assert.equal( chunks.length, 2 );
	assert.deepEqual( chunks.map( ( c ) => c.length ), [ 76, 76 ] );
	assert.ok( chunks.every( ( c ) => c[ 0 ].isDefault ) );
	// Nothing left to halve: a single non-default instance cannot be split further.
	assert.equal( splitOnTimeout( [ ...defaults, { key: 'o0' } ], 1 ), null );
} );

// CR4: the calibration run itself (not only its build child) exhausted the default 4 GB heap on sgs/nav-bar-menu.
test( 'MUST FAIL (CR4, the run ran out of its 4 GB heap after 46 minutes): a run below the limit restarts itself with the bigger heap', () => {
	assert.equal( needsBiggerHeap( 4 * 1024 ** 3 ), true, 'the default heap is too small' );
	assert.equal( needsBiggerHeap( 8 * 1024 ** 3 + 1 ), false, 'a run already started with the flag does not restart again' );
	assert.ok( 8192 * 1024 ** 2 > RUN_HEAP_BYTES, 'NODE_HEAP_FLAG itself clears the limit, so the restart cannot loop' );
	const src = fs.readFileSync( new URL( '../calibrate.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /needsBiggerHeap\( v8\.getHeapStatistics\(\)\.heap_size_limit \)/ );
	assert.match( src, /spawnSync\( process\.execPath, \[ NODE_HEAP_FLAG, \.\.\.process\.argv\.slice\( 1 \) \]/ );
} );

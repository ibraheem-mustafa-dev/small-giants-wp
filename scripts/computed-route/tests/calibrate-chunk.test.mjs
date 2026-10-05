// Proves the calibration build step survives a block with hundreds of instances (CR17, sgs/business-info plans 343):
// the child gets a bigger heap, a block may set its own chunk size, and a chunk whose build times out is halved and
// retried instead of failing the block.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NODE_HEAP_FLAG, buildSpawnArgs, chunkSizeFor, halveChunk, planChunks, splitOnTimeout, MIN_CHUNK } from '../lib/calibrate-chunk.mjs';

test( 'MUST FAIL (the build child ran on the default heap and was killed at 300s): the spawn passes --max-old-space-size=8192 before the script', () => {
	assert.equal( NODE_HEAP_FLAG, '--max-old-space-size=8192' );
	const args = buildSpawnArgs( '/repo/scripts/wp-build-page.js', { envFile: 'e.env', envKey: 'K' }, '/t/tree.json', [ '--dry-run' ] );
	assert.deepEqual( args.slice( 0, 2 ), [ NODE_HEAP_FLAG, '/repo/scripts/wp-build-page.js' ] );
	assert.deepEqual( args.slice( 2 ), [ '--env-file', 'e.env', '--env-key', 'K', '--tree', '/t/tree.json', '--dry-run' ] );
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

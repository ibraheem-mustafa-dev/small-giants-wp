// Proves the calibration build step survives a block with hundreds of instances (CR17, sgs/business-info plans 343):
// the child gets a bigger heap, a block may set its own chunk size, and a chunk whose build times out is halved and
// retried instead of failing the block.
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { CHILD_TIMEOUT_MS, EDITOR_TIMEOUT_MS, NODE_HEAP_FLAG, RUN_HEAP_BYTES, needsBiggerHeap, buildSpawnArgs, chunkSizeFor, halveChunk, planChunks, splitOnTimeout, MIN_CHUNK, ELEMENT_BUDGET, pageCapFor, replanQueue, heldFor } from '../lib/calibrate-chunk.mjs';

test( 'MUST FAIL (the build child ran on the default heap and was killed at 300s): the spawn passes --max-old-space-size=8192 before the script', () => {
	assert.equal( NODE_HEAP_FLAG, '--max-old-space-size=8192' );
	const secrets = process.env.SGS_SECRETS_ROOT;
	delete process.env.SGS_SECRETS_ROOT;
	const args = buildSpawnArgs( '/repo/scripts/wp-build-page.js', { envFile: 'e.env', envKey: 'K' }, '/t/tree.json', [ '--dry-run' ] );
	undefined !== secrets && ( process.env.SGS_SECRETS_ROOT = secrets );
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
	assert.match( fs.readFileSync( new URL( '../calibrate.mjs', import.meta.url ), 'utf8' ), /openRunSession\( site, env, EDITOR_TIMEOUT_MS \)/ );
	assert.match( fs.readFileSync( new URL( '../lib/wp-run-session.mjs', import.meta.url ), 'utf8' ), /ensureLoggedIn\( shared\.page, env, timeout \)/ );
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

test( 'MUST FAIL (business-info: 343 instances in one page): the others are chunked, each chunk carrying the default they are compared with', () => {
	const defaults = [ { key: 'd0', isDefault: true, variant: 0 }, { key: 'd1', isDefault: true, variant: 1 } ];
	const others = Array.from( { length: 341 }, ( _, i ) => ( { key: `o${ i }`, variant: i % 2 } ) );
	const chunks = planChunks( defaults, others, 150 );
	assert.equal( chunks.length, 3 );
	assert.ok( chunks.every( ( c ) => c[ 0 ].key === 'd0' && c[ 1 ].key === 'd1' ) );
	assert.deepEqual( chunks.map( ( c ) => c.length - 2 ), [ 150, 150, 41 ] );
	assert.deepEqual( planChunks( defaults, [], 150 ), [ defaults ] );
} );

test( 'MUST FAIL (a timed-out chunk failed the whole block): splitOnTimeout halves the chunk and keeps every default', () => {
	const defaults = [ { key: 'd0', isDefault: true, variant: 0 } ];
	const list = [ ...defaults, ...Array.from( { length: 150 }, ( _, i ) => ( { key: `o${ i }`, variant: 0 } ) ) ];
	const { size, chunks } = splitOnTimeout( list, 150 );
	assert.equal( size, 75 );
	assert.equal( chunks.length, 2 );
	assert.deepEqual( chunks.map( ( c ) => c.length ), [ 76, 76 ] );
	assert.ok( chunks.every( ( c ) => c[ 0 ].isDefault ) );
	// Nothing left to halve: a single non-default instance cannot be split further.
	assert.equal( splitOnTimeout( [ ...defaults, { key: 'o0', variant: 0 } ], 1 ), null );
} );

// A block's plan in the planner's shape (lib/calibrate-instances.mjs::planInstances): per variant a default, then each
// setting's markers, a marker needing partners naming its variant's baseline by baseKey (sgs/nav-bar-menu: 4 variants, 76
// baselines, 1,200 marked instances, each page carrying all 80 until 2026-11-21).
const D = ( v ) => ( { key: `default-v${ v }`, isDefault: true, variant: v } );
const B = ( v, k ) => ( { key: `base-${ k }-v${ v }`, isBase: true, variant: v, baseKey: `${ v }:${ k }` } );
const M = ( v, n, k = null ) => ( { key: `m${ n }-v${ v }`, variant: v, baseKey: k ? `${ v }:${ k }` : null } );
const HELD = [ D( 0 ), B( 0, 'a' ), B( 0, 'b' ), D( 1 ), B( 1, 'a' ), B( 1, 'c' ) ];
const OTHERS = [ M( 0, 1 ), M( 0, 2, 'a' ), M( 0, 3, 'a' ), M( 0, 4, 'b' ), M( 1, 5 ), M( 1, 6, 'a' ), M( 1, 7, 'c' ), M( 1, 8 ) ];
const keys = ( page ) => page.map( ( i ) => i.key );

test( 'MUST FAIL (80 defaults and baselines on every page of sgs/nav-bar-menu): a page carries only the baselines its instances name and the defaults they are compared with', () => {
	const pages = planChunks( HELD, OTHERS, 3 );
	assert.deepEqual( pages.map( keys ), [
		// The first page carries every default (the block's default paint is read there), and only baseline a.
		[ 'default-v0', 'base-a-v0', 'default-v1', 'm1-v0', 'm2-v0', 'm3-v0' ],
		// Baseline b of variant 0, variant 1's default and baseline a; not variant 0's default or baseline a.
		[ 'base-b-v0', 'default-v1', 'base-a-v1', 'm4-v0', 'm5-v1', 'm6-v1' ],
		[ 'default-v1', 'base-c-v1', 'm7-v1', 'm8-v1' ],
	] );
	assert.deepEqual( heldFor( HELD, [ M( 1, 9, 'c' ) ], false ).map( ( i ) => i.key ), [ 'base-c-v1' ], 'a page of based markers carries no default' );
} );

test( 'negative control: every instance on every page finds what it is compared with, every instance is planned once and in order', () => {
	for ( const [ size, cap ] of [ [ 1, Infinity ], [ 2, 5 ], [ 3, 4 ], [ 150, Infinity ] ] ) {
		const pages = planChunks( HELD, OTHERS, size, { cap } );
		pages.forEach( ( page ) => {
			const bases = new Set( page.filter( ( i ) => i.isBase ).map( ( i ) => i.baseKey ) );
			const variants = new Set( page.filter( ( i ) => i.isDefault ).map( ( i ) => i.variant ) );
			page.filter( ( i ) => ! i.isDefault && ! i.isBase ).forEach( ( i ) => assert.ok( i.baseKey ? bases.has( i.baseKey ) : variants.has( i.variant ), `${ i.key } at size ${ size }, cap ${ cap }` ) );
		} );
		assert.deepEqual( pages.flatMap( ( p ) => p.filter( ( i ) => ! i.isDefault && ! i.isBase ) ).map( ( i ) => i.key ), OTHERS.map( ( i ) => i.key ) );
		assert.deepEqual( pages[ 0 ].filter( ( i ) => i.isDefault ).map( ( i ) => i.key ), [ 'default-v0', 'default-v1' ], 'the first page carries every default' );
	}
} );

test( 'MUST FAIL: a page holds no more than the cap, its defaults and baselines counted, and at least one marked instance', () => {
	const pages = planChunks( HELD, OTHERS, 150, { cap: 4 } );
	assert.ok( pages.every( ( p ) => p.length <= 4 || 1 === p.filter( ( i ) => ! i.isDefault && ! i.isBase ).length ), pages.map( keys ).join( ' | ' ) );
	assert.ok( pages.every( ( p ) => p.some( ( i ) => ! i.isDefault && ! i.isBase ) ) );
	// A cap the defaults alone fill still leaves one marked instance a page.
	assert.deepEqual( planChunks( HELD, OTHERS, 150, { cap: 1 } ).map( ( p ) => p.filter( ( i ) => ! i.isDefault && ! i.isBase ).length ), OTHERS.map( () => 1 ) );
} );

test( 'MUST FAIL: a timed-out first page keeps every default on its first piece; a later page\'s pieces carry only what they need', () => {
	const first = planChunks( HELD, OTHERS, 150 )[ 0 ];
	const halves = splitOnTimeout( first, 150, { firstPage: true } ).chunks;
	assert.deepEqual( halves[ 0 ].filter( ( i ) => i.isDefault ).map( ( i ) => i.key ), [ 'default-v0', 'default-v1' ] );
	assert.deepEqual( keys( halves[ 1 ] ), [ 'default-v1', 'base-a-v1', 'base-c-v1', 'm5-v1', 'm6-v1', 'm7-v1', 'm8-v1' ] );
	const later = splitOnTimeout( first, 150 ).chunks;
	assert.deepEqual( keys( later[ 0 ] ), [ 'default-v0', 'base-a-v0', 'base-b-v0', 'm1-v0', 'm2-v0', 'm3-v0', 'm4-v0' ] );
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

// A page of sgs/nav-bar-menu: 80 defaults and baselines on every page, 422 elements an instance (2026-10-29: at 150
// non-defaults a page passed 7 GB while it was read; at 40 the whole run stayed near 5 GB).
const inst = ( k, def = false ) => ( { key: `i${ k }`, ...( def ? { isDefault: true } : {} ) } );

test( 'MUST FAIL: a page of large instances is cut to the element budget, its defaults and baselines counted', () => {
	assert.equal( pageCapFor( 422 ), Math.floor( ELEMENT_BUDGET / 422 ) );
	assert.ok( pageCapFor( 422 ) * 422 <= ELEMENT_BUDGET );
	const pages = planChunks( HELD, OTHERS, 150, { cap: pageCapFor( ELEMENT_BUDGET / 4 ) } );
	assert.ok( pages.slice( 1 ).every( ( p ) => p.length <= 4 || 1 === p.filter( ( i ) => ! i.isDefault && ! i.isBase ).length ) );
} );

test( 'negative control: a block of small instances keeps its chunk size; an empty reading sets no limit', () => {
	assert.ok( pageCapFor( 20 ) > 150 + 80 );
	assert.equal( pageCapFor( 0 ), Infinity );
	const defaults = [ inst( 'd1', true ) ];
	assert.deepEqual( planChunks( defaults, Array.from( { length: 10 }, ( _, k ) => inst( k ) ), 5, { cap: pageCapFor( 20 ) } ).map( ( p ) => p.length ), [ 6, 6 ] );
} );

test( 'MUST FAIL: the queued pages are planned again at the cap from the block\'s defaults and baselines, each carrying what it needs, in order', () => {
	const queue = planChunks( HELD, OTHERS, 3 ).slice( 1 );
	const next = replanQueue( queue, 3, HELD, 3 );
	assert.deepEqual( next.map( keys ), [
		[ 'base-b-v0', 'm4-v0' ],
		[ 'default-v1', 'm5-v1' ],
		[ 'base-a-v1', 'm6-v1' ],
		[ 'base-c-v1', 'm7-v1' ],
		[ 'default-v1', 'm8-v1' ],
	] );
	assert.deepEqual( replanQueue( [], 3, HELD, 3 ), [] );
} );

test( 'MUST FAIL: measurePages re-plans from the block\'s defaults and baselines at the read cap, and halves its first page as the first', () => {
	const src = fs.readFileSync( new URL( '../lib/calibrate-pages.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /const defaults = instances\.filter\( \( i \) => i\.isDefault \|\| i\.isBase \);/ );
	assert.match( src, /const fits = pageCapFor\( drawn \);\s+if \( fits < cap \) \{\s+cap = fits;\s+queue\.splice\( 0, queue\.length, \.\.\.replanQueue\( queue, size, defaults, cap \) \);/ );
	assert.match( src, /splitOnTimeout\( list, size, \{ cap, firstPage: 0 === done \} \)/ );
} );

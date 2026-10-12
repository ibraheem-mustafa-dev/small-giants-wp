// Spec 48 FR-48-28 / FR-48-17, lib/intake-pool.mjs: results come back by input index whatever order units finish in;
// one semaphore bounds every caller together; a nested call runs inside its caller's slot; INTAKE_POOL=1 is a plain loop
// in input order; a failing unit rejects the call only after every started unit has ended.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPool, poolSize, withSlot } from '../lib/intake-pool.mjs';

const pause = ( ms ) => new Promise( ( done ) => setTimeout( done, ms ) );
const withPool = async ( n, fn ) => {
	const was = process.env.INTAKE_POOL;
	process.env.INTAKE_POOL = String( n );
	try {
		return await fn();
	} finally {
		if ( undefined === was ) {
			delete process.env.INTAKE_POOL;
		} else {
			process.env.INTAKE_POOL = was;
		}
	}
};

test( 'MUST FAIL: results are in input order although later units finish first', () => withPool( 4, async () => {
	const finished = [];
	const out = await mapPool( [ 40, 30, 20, 10, 0 ], 4, async ( ms, i ) => {
		await pause( ms );
		finished.push( i );
		return `r${ i }`;
	} );
	assert.deepEqual( out, [ 'r0', 'r1', 'r2', 'r3', 'r4' ] );
	assert.notDeepEqual( finished, [ 0, 1, 2, 3, 4 ], 'the units did not run side by side, so the order test proves nothing' );
} ) );

test( 'MUST FAIL: one semaphore bounds two calls running together, and a nested call never takes a second slot', () => withPool( 3, async () => {
	let live = 0;
	let peak = 0;
	const unit = async () => {
		live++;
		peak = Math.max( peak, live );
		await pause( 15 );
		live--;
	};
	await Promise.all( [ mapPool( [ 1, 2, 3, 4, 5 ], 3, unit ), mapPool( [ 1, 2, 3, 4, 5 ], 3, unit ) ] );
	assert.equal( peak, 3, `peak ${ peak } units with a pool of 3` );
	let inner = 0;
	await mapPool( [ 1, 2, 3 ], 3, () => mapPool( [ 1, 2 ], 3, async () => {
		inner++;
		await pause( 5 );
	} ) );
	assert.equal( inner, 6 );
	assert.equal( await withSlot( () => withSlot( () => 'nested' ) ), 'nested' );
} ) );

test( 'INTAKE_POOL=1: a plain loop, each unit starting after the one before ended', () => withPool( 1, async () => {
	const log = [];
	await mapPool( [ 30, 0, 10 ], 4, async ( ms, i ) => {
		log.push( `start ${ i }` );
		await pause( ms );
		log.push( `end ${ i }` );
	} );
	assert.deepEqual( log, [ 'start 0', 'end 0', 'start 1', 'end 1', 'start 2', 'end 2' ] );
} ) );

test( 'a failing unit rejects the call after every started unit has ended', () => withPool( 4, async () => {
	const ended = [];
	await assert.rejects( mapPool( [ 0, 1, 2 ], 4, async ( x ) => {
		if ( 0 === x ) {
			throw new Error( 'unit 0 failed' );
		}
		await pause( 20 );
		ended.push( x );
	} ), /unit 0 failed/ );
	assert.deepEqual( ended.sort(), [ 1, 2 ] );
} ) );

test( 'poolSize: default 4, a positive integer from INTAKE_POOL, anything else refused', () => {
	assert.equal( poolSize( {} ), 4 );
	assert.equal( poolSize( { INTAKE_POOL: '2' } ), 2 );
	for ( const bad of [ '0', '-1', '1.5', 'many' ] ) {
		assert.throws( () => poolSize( { INTAKE_POOL: bad } ), /positive integer/ );
	}
} );

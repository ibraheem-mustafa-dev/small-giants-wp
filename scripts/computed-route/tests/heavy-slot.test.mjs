import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tryTake, isStale, releaseLabel, acquire, hasRoom, ROOM } from '../lib/heavy-slot.mjs';
import { tempOnC, assertTempOffC } from '../lib/temp-guard.mjs';
import { acquireSlots } from '../lib/route-sweep.mjs';

const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'heavy-slot-' ) );
const room = { cpuBusy: 0.1, freeMem: ROOM.freeMemBytes * 2, freeC: ROOM.freeCBytes * 2 };
const busy = { cpuBusy: 0.95, freeMem: ROOM.freeMemBytes * 2, freeC: ROOM.freeCBytes * 2 };

test( 'a slot held by a dead process is freed and taken; one held by a live process is not', ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	assert.ok( tryTake( dir, 'slot-1', { label: 'gone', pid: 999999 } ) );
	assert.equal( isStale( path.join( dir, 'slot-1' ), Date.now(), () => false ), true );
	assert.ok( tryTake( dir, 'slot-1', { label: 'me', pid: process.pid }, { alive: () => false } ), 'the dead owner\'s slot is reclaimed' );
	assert.equal( tryTake( dir, 'slot-1', { label: 'other', pid: process.pid } ), null, 'a live owner keeps it' );
} );

test( 'a leased slot is freed once its lease runs out, and release frees only the named label', ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	tryTake( dir, 'slot-1', { label: 'a', expires: Date.now() + 1000 } );
	assert.equal( tryTake( dir, 'slot-1', { label: 'b', expires: Date.now() + 1000 } ), null );
	assert.ok( tryTake( dir, 'slot-1', { label: 'b', expires: Date.now() + 1000 }, { now: Date.now() + 5000 } ), 'an expired lease is reclaimed' );
	tryTake( dir, 'slot-2', { label: 'c', expires: Date.now() + 60000 } );
	assert.equal( releaseLabel( dir, 'b' ), 1 );
	assert.equal( fs.existsSync( path.join( dir, 'slot-1' ) ), false );
	assert.equal( fs.existsSync( path.join( dir, 'slot-2' ) ), true, 'another label\'s slot stays' );
} );

test( 'acquire takes the overflow slot only after the wait and only when the machine has room', async ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	for ( const n of [ 'slot-1', 'slot-2' ] ) {
		tryTake( dir, n, { label: 'x', pid: process.pid } );
	}
	let polls = 0;
	const got = await acquire( { dir, owner: { label: 'me', pid: process.pid }, overflowAfterMs: 0, wait: async () => {
		polls++;
	}, load: async () => ( polls < 2 ? busy : room ) } );
	assert.equal( got.overflow, true );
	assert.equal( polls, 2, 'refused while the machine was busy' );
	assert.equal( path.basename( got.path ), 'slot-3' );
	await assert.rejects( acquire( { dir, owner: { label: 'late', pid: process.pid }, overflowAfterMs: 0, maxWaitMs: 0, wait: async () => {}, load: async () => room } ), /no heavy slot/ );
} );

test( 'the sweep takes the overflow slot only after its wait, with room', async ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	tryTake( dir, 'slot-1', { label: 'x', pid: process.pid } );
	const held = await acquireSlots( { dir, names: [ 'slot-1' ], overflow: 'slot-3', overflowAfterMs: 0, want: 2, wait: async () => {}, load: async () => room } );
	assert.deepEqual( held.map( ( p ) => path.basename( p ) ), [ 'slot-3' ] );
	assert.equal( hasRoom( busy ), false );
} );

test( 'the temp guard refuses a temp folder on C: and allows one on E:', () => {
	assert.equal( tempOnC( 'C:\\Users\\Bean\\AppData\\Local\\Temp' ), true );
	assert.equal( tempOnC( 'E:\\sgs-tmp\\tmp-a' ), false );
	assert.throws( () => assertTempOffC( 'run-tests', 'c:\\temp' ), /on C:/ );
	assert.doesNotThrow( () => assertTempOffC( 'run-tests', 'E:\\sgs-tmp\\tmp-a' ) );
} );

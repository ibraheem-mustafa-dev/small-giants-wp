import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tryTake, isStale, releaseLabel, acquire, hasRoom, ROOM, readOwner } from '../lib/heavy-slot.mjs';
import { parseArgv, runCommand } from '../tools/heavy-slot.mjs';
import { tempOnC, assertTempOffC } from '../lib/temp-guard.mjs';
import { readQueue, queuePlace, withQueueLock } from '../lib/heavy-queue.mjs';

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

test( 'MUST FAIL: the queue is first come, first served: a later waiter cannot take the free slot while an earlier one waits', async ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	const file = path.join( dir, 'queue.md' );
	fs.writeFileSync( file, 'A note about the queue.' );
	tryTake( dir, 'slot-1', { label: 'busy', pid: process.pid } );
	const alive = ( pid ) => pid === process.pid || 4242 === pid;
	queuePlace( { file, lockDir: dir, me: { label: 'first', pid: 4242 }, alive } );
	let polls = 0;
	const got = await acquire( { dir, owner: { label: 'second', pid: process.pid }, alive, queueFile: file, overflowAfterMs: 1e9, load: async () => room, wait: async () => {
		polls++;
		assert.equal( fs.existsSync( path.join( dir, 'slot-2' ) ), false, 'the free slot is left for the earlier waiter' );
		assert.deepEqual( readQueue( file ).entries.map( ( e ) => e.label ), [ 'first', 'second' ] );
		const q = fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).filter( ( l ) => ! l.includes( 'first' ) ).join( '\n' );
		fs.writeFileSync( file, q );
	} } );
	assert.equal( polls, 1 );
	assert.equal( path.basename( got.path ), 'slot-2' );
	assert.deepEqual( readQueue( file ).entries, [], 'the job leaves the queue once it holds a slot' );
	assert.match( fs.readFileSync( file, 'utf8' ), /^A note about the queue./, 'the text above the list is kept' );
} );

test( 'MUST FAIL: with two free slots the second waiter starts at once; a waiter whose process is gone or whose beat is old is dropped', async ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	const file = path.join( dir, 'queue.md' );
	const alive = ( pid ) => pid === process.pid || 4242 === pid;
	queuePlace( { file, lockDir: dir, me: { label: 'first', pid: 4242 }, alive } );
	const got = await acquire( { dir, owner: { label: 'second', pid: process.pid }, alive, queueFile: file, wait: async () => assert.fail( 'two free slots: no wait' ) } );
	assert.ok( got.path );
	assert.deepEqual( readQueue( file ).entries.map( ( e ) => e.label ), [ 'first' ] );
	fs.rmSync( got.path, { recursive: true, force: true } );
	queuePlace( { file, lockDir: dir, me: { label: 'gone', pid: 999999 }, alive: () => true } );
	assert.equal( queuePlace( { file, lockDir: dir, me: { label: 'late', pid: process.pid }, alive } ), 1, 'the dead waiter is dropped; first stays ahead' );
	const old = fs.readFileSync( file, 'utf8' ).replace( /beat (\d+)/, () => `beat ${ Date.now() - 10 * 60 * 1000 }` );
	fs.writeFileSync( file, old );
	assert.equal( queuePlace( { file, lockDir: dir, me: { label: 'late', pid: process.pid }, alive } ), 0, 'a waiter silent for ten minutes is dropped' );
} );

test( 'MUST FAIL: a --front run joins the queue at the top, ahead of earlier waiters; a routine run still joins at the bottom', ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	const file = path.join( dir, 'queue.md' );
	const alive = () => true;
	queuePlace( { file, lockDir: dir, me: { label: 'first', pid: 4242 }, alive } );
	queuePlace( { file, lockDir: dir, me: { label: 'second', pid: 4343 }, alive } );
	assert.equal( queuePlace( { file, lockDir: dir, me: { label: 'deploy', pid: 4444 }, alive, front: true } ), 0 );
	assert.equal( queuePlace( { file, lockDir: dir, me: { label: 'routine', pid: 4545 }, alive } ), 3 );
	assert.deepEqual( readQueue( file ).entries.map( ( e ) => e.label ), [ 'deploy', 'first', 'second', 'routine' ] );
	assert.equal( queuePlace( { file, lockDir: dir, me: { label: 'deploy', pid: 4444 }, alive, front: true } ), 0, 'a listed front run keeps its place' );
	assert.deepEqual( parseArgv( [ '--front', 'run', 'x', '--', 'cmd' ] ).front, true );
	assert.deepEqual( parseArgv( [ 'run', 'x', '--', '--front' ] ).front, false, 'an option after -- belongs to the command' );
	assert.equal( parseArgv( [ '--front', 'run', 'x', '--', 'cmd' ] ).label, 'x' );
} );

test( 'acquire run outside the real slot folder never touches the shared queue', async ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	await acquire( { dir, owner: { label: 'me', pid: process.pid } } );
	assert.equal( fs.existsSync( path.join( dir, 'queue.md' ) ), true );
} );

test( 'the temp guard refuses a temp folder on C: and allows one on E:', () => {
	assert.equal( tempOnC( 'C:\\Users\\Bean\\AppData\\Local\\Temp' ), true );
	assert.equal( tempOnC( 'E:\\sgs-tmp\\tmp-a' ), false );
	assert.throws( () => assertTempOffC( 'run-tests', 'c:\\temp' ), /on C:/ );
	assert.doesNotThrow( () => assertTempOffC( 'run-tests', 'E:\\sgs-tmp\\tmp-a' ) );
} );

test( 'a process-held slot whose heartbeat is five minutes old is stale even if its process id is alive again', ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	tryTake( dir, 'slot-1', { label: 'old', pid: process.pid, beat: Date.now() - 6 * 60 * 1000 } );
	assert.equal( isStale( path.join( dir, 'slot-1' ) ), true, 'a reused pid with an old beat is stale' );
	tryTake( dir, 'slot-2', { label: 'fresh', pid: process.pid, beat: Date.now() } );
	assert.equal( isStale( path.join( dir, 'slot-2' ) ), false );
} );

test( 'a stale slot is reclaimed under a lock: while another process holds the reclaim lock it is left alone', ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	tryTake( dir, 'slot-1', { label: 'dead', pid: 999999 } );
	fs.writeFileSync( path.join( dir, 'slot-1.reclaim' ), '1' );
	assert.equal( tryTake( dir, 'slot-1', { label: 'b', pid: process.pid }, { alive: () => false } ), null, 'a live reclaim lock blocks the second taker' );
	fs.rmSync( path.join( dir, 'slot-1.reclaim' ) );
	assert.ok( tryTake( dir, 'slot-1', { label: 'b', pid: process.pid }, { alive: ( pid ) => pid === process.pid } ) );
	assert.equal( readOwner( path.join( dir, 'slot-1' ) ).label, 'b' );
	assert.equal( fs.existsSync( path.join( dir, 'slot-1.reclaim' ) ), false, 'the lock is removed after the reclaim' );
} );

test( 'heavy-slot reads its options only before --, refuses a --dir with no folder, and runs several words without a shell', async () => {
	assert.deepEqual( parseArgv( [ 'run', 'x', '--', 'node', 'sweep.mjs', '--dir', 'out' ] ).command, [ 'node', 'sweep.mjs', '--dir', 'out' ] );
	assert.equal( parseArgv( [ 'run', 'x', '--', 'node', '--dir', 'out' ] ).dir.endsWith( 'heavy' ), true );
	assert.equal( parseArgv( [ '--dir', 'E:/x', 'status' ] ).dir, 'E:/x' );
	assert.match( parseArgv( [ 'run', 'x', '--dir' ] ).error, /needs a folder/ );
	assert.equal( await runCommand( [ process.execPath, '-e', 'process.exit(process.argv[1] === "a b&c" ? 0 : 3)', 'a b&c' ] ), 0 );
} );

test( 'MUST FAIL: the queue lock is broken at once when its holder is gone, and waited out (not given up) while a live holder is slow', ( t ) => {
	const dir = tmp();
	t.after( () => fs.rmSync( dir, { recursive: true, force: true } ) );
	const lock = path.join( dir, 'queue.lock' );
	fs.writeFileSync( lock, '999999' );
	assert.equal( withQueueLock( dir, () => 'ran', { alive: () => false, sleep: () => assert.fail( 'a dead holder is never waited for' ) } ), 'ran' );
	fs.writeFileSync( lock, String( process.pid ) );
	let clock = Date.now();
	let sleeps = 0;
	const out = withQueueLock( dir, () => 'ran', { alive: () => true, now: () => clock, sleep: ( ms ) => {
		sleeps++;
		clock += ms;
		20 === sleeps && fs.rmSync( lock );
	} } );
	assert.equal( out, 'ran', 'a live holder stalled for a second is waited out' );
	assert.equal( sleeps, 20 );
} );

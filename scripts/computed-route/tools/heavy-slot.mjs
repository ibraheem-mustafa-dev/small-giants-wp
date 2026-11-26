#!/usr/bin/env node
// Heavy-run slots for every session and worker on this machine (lib/heavy-slot.mjs says what a heavy run is and how slots work).
//   node tools/heavy-slot.mjs [--dir <folder>] [--front] run <label> -- "<command>"   hold a slot while the command runs, free it when it
//                                                                          ends (preferred; the command as one quoted string,
//                                                                          or as separate words run without a shell)
//   node tools/heavy-slot.mjs [--dir <folder>] acquire <label>              take a slot on a 90-minute lease (never renewed: a
//                                                                          job that may run longer uses `run`); prints its path
//   node tools/heavy-slot.mjs [--dir <folder>] release <label>              free every slot <label> holds
//   node tools/heavy-slot.mjs [--dir <folder>] status                       who holds each slot, and the machine's load
// Waits its turn in the shared queue (.claude/queue.md, lib/heavy-queue.mjs) for one of two slots; from the top of the queue,
// after ten minutes, it takes a third only when the machine has room. Options are read only before
// `--`; --dir overrides the slot folder (default E:/sgs-tmp/general-cloning/heavy); --front joins the queue at the top, for a
// run Bean has put ahead of the others (a live-site deploy he asked to jump the queue), never for routine work.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOT_DIR, NORMAL_SLOTS, OVERFLOW_SLOT, LEASE_MS, acquire, releaseLabel, releasePath, readOwner, isStale, machineLoad, hasRoom, keepAlive } from '../lib/heavy-slot.mjs';
import { QUEUE_FILE, readQueue } from '../lib/heavy-queue.mjs';

const log = ( m ) => process.stderr.write( `heavy-slot: ${ m }\n` );

// The options and words before `--`, and the command after it. Returns { error } for a malformed --dir.
export function parseArgv( argv ) {
	const sep = argv.indexOf( '--' );
	const head = -1 === sep ? argv : argv.slice( 0, sep );
	const command = -1 === sep ? [] : argv.slice( sep + 1 );
	const at = head.indexOf( '--dir' );
	if ( -1 !== at && ( ! head[ at + 1 ] || head[ at + 1 ].startsWith( '--' ) ) ) {
		return { error: '--dir needs a folder' };
	}
	const dir = -1 === at ? SLOT_DIR : head[ at + 1 ];
	const words = ( -1 === at ? head : [ ...head.slice( 0, at ), ...head.slice( at + 2 ) ] ).filter( ( w ) => '--front' !== w );
	return { dir, cmd: words[ 0 ], label: words[ 1 ], command, front: head.includes( '--front' ) };
}

// Runs the command: one word through the shell as written (a whole command line in one quoted string), several words directly
// with no shell, so each word reaches the program exactly as typed. Resolves with the exit code.
export function runCommand( command ) {
	const child = 1 === command.length
		? spawn( command[ 0 ], { shell: true, stdio: 'inherit' } )
		: spawn( command[ 0 ], command.slice( 1 ), { shell: false, stdio: 'inherit' } );
	return new Promise( ( resolve ) => {
		child.on( 'error', ( e ) => {
			log( e.message );
			resolve( 1 );
		} );
		child.on( 'exit', ( code ) => resolve( code ?? 1 ) );
	} );
}

export async function main( argv ) {
	const { dir, cmd, label, command, error, front } = parseArgv( argv );
	if ( error ) {
		log( error );
		return 2;
	}
	if ( 'status' === cmd ) {
		for ( const name of [ ...NORMAL_SLOTS, OVERFLOW_SLOT ] ) {
			const p = path.join( dir, name );
			const owner = readOwner( p );
			process.stdout.write( `${ name }: ${ owner ? `${ owner.label }${ isStale( p ) ? ' (stale, will be freed)' : '' }` : 'free' }\n` );
		}
		const waiting = readQueue( QUEUE_FILE ).entries;
		process.stdout.write( `queue (${ QUEUE_FILE }): ${ waiting.length ? waiting.map( ( e, i ) => `${ i + 1 }. ${ e.label } (waited ${ e.joined ? Math.round( ( Date.now() - e.joined ) / 60000 ) : '?' } min)` ).join( ', ' ) : 'none waiting' }
` );
		const l = await machineLoad();
		process.stdout.write( `CPU ${ Math.round( l.cpuBusy * 100 ) }% busy, ${ ( l.freeMem / 1024 ** 3 ).toFixed( 1 ) } GB memory free, ${ ( l.freeC / 1024 ** 3 ).toFixed( 1 ) } GB free on C: (room for overflow: ${ hasRoom( l ) ? 'yes' : 'no' })\n` );
		return 0;
	}
	if ( ! label || ! [ 'run', 'acquire', 'release' ].includes( cmd ) ) {
		log( 'usage: heavy-slot.mjs [--dir <folder>] run <label> -- "<command>" | acquire <label> | release <label> | status' );
		return 2;
	}
	if ( 'release' === cmd ) {
		log( `freed ${ releaseLabel( dir, label ) } slot(s) held by ${ label }` );
		return 0;
	}
	if ( 'acquire' === cmd ) {
		const got = await acquire( { dir, owner: { label, expires: Date.now() + LEASE_MS }, log, front } );
		process.stdout.write( `${ got.path }${ got.overflow ? ' (overflow)' : '' }\n` );
		return 0;
	}
	if ( ! command.length ) {
		log( 'run needs a command after --' );
		return 2;
	}
	const owner = { label, pid: process.pid };
	const got = await acquire( { dir, owner: { ...owner, beat: Date.now() }, log, front } );
	log( `${ label } holds ${ path.basename( got.path ) }${ got.overflow ? ' (overflow)' : '' }` );
	const stop = keepAlive( [ got.path ], owner );
	try {
		return await runCommand( command );
	} finally {
		stop();
		releasePath( got.path );
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) ).then( ( code ) => {
		process.exitCode = code;
	}, ( e ) => {
		log( e.message );
		process.exitCode = 1;
	} );
}

#!/usr/bin/env node
// Heavy-run slots for every session and worker on this machine (lib/heavy-slot.mjs says what a heavy run is and how slots work).
//   node tools/heavy-slot.mjs run <label> -- "<command>"     hold a slot while the command runs, free it when it ends (preferred;
//                                                           pass the command as one quoted string)
//   node tools/heavy-slot.mjs acquire <label>                take a slot on a 90-minute lease; prints its path
//   node tools/heavy-slot.mjs release <label>                free every slot <label> holds
//   node tools/heavy-slot.mjs status                         who holds each slot, and the machine's load
// Waits for one of two slots; after ten minutes it takes a third only when the machine has room. --dir <folder> overrides the
// slot folder (default E:/sgs-tmp/general-cloning/heavy).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOT_DIR, NORMAL_SLOTS, OVERFLOW_SLOT, LEASE_MS, acquire, releaseLabel, releasePath, readOwner, isStale, machineLoad, hasRoom } from '../lib/heavy-slot.mjs';

const log = ( m ) => process.stderr.write( `heavy-slot: ${ m }\n` );

// One shell line from the words after `--`: a single word is used as written (a whole command passed as one quoted string);
// several words are each quoted when they hold a space or a quote, so the command reaches the shell as it was typed.
export function shellLine( words ) {
	if ( 1 === words.length ) {
		return words[ 0 ];
	}
	return words.map( ( w ) => ( /[\s"']/.test( w ) ? `"${ w.replace( /"/g, '\\"' ) }"` : w ) ).join( ' ' );
}

export async function main( argv ) {
	const dirAt = argv.indexOf( '--dir' );
	const dir = -1 === dirAt ? SLOT_DIR : argv[ dirAt + 1 ];
	const args = -1 === dirAt ? argv : [ ...argv.slice( 0, dirAt ), ...argv.slice( dirAt + 2 ) ];
	const [ cmd, label ] = args;
	if ( 'status' === cmd ) {
		for ( const name of [ ...NORMAL_SLOTS, OVERFLOW_SLOT ] ) {
			const p = path.join( dir, name );
			const owner = readOwner( p );
			process.stdout.write( `${ name }: ${ owner ? `${ owner.label }${ isStale( p ) ? ' (stale, will be freed)' : '' }` : 'free' }\n` );
		}
		const l = await machineLoad();
		process.stdout.write( `CPU ${ Math.round( l.cpuBusy * 100 ) }% busy, ${ ( l.freeMem / 1024 ** 3 ).toFixed( 1 ) } GB memory free, ${ ( l.freeC / 1024 ** 3 ).toFixed( 1 ) } GB free on C: (room for overflow: ${ hasRoom( l ) ? 'yes' : 'no' })\n` );
		return 0;
	}
	if ( ! label || ! [ 'run', 'acquire', 'release' ].includes( cmd ) ) {
		log( 'usage: heavy-slot.mjs run <label> -- <command ...> | acquire <label> | release <label> | status' );
		return 2;
	}
	if ( 'release' === cmd ) {
		log( `freed ${ releaseLabel( dir, label ) } slot(s) held by ${ label }` );
		return 0;
	}
	if ( 'acquire' === cmd ) {
		const got = await acquire( { dir, owner: { label, expires: Date.now() + LEASE_MS }, log } );
		process.stdout.write( `${ got.path }${ got.overflow ? ' (overflow)' : '' }\n` );
		return 0;
	}
	const sep = args.indexOf( '--' );
	const command = -1 === sep ? [] : args.slice( sep + 1 );
	if ( ! command.length ) {
		log( 'run needs a command after --' );
		return 2;
	}
	const got = await acquire( { dir, owner: { label, pid: process.pid }, log } );
	log( `${ label } holds ${ path.basename( got.path ) }${ got.overflow ? ' (overflow)' : '' }` );
	try {
		return spawnSync( shellLine( command ), { shell: true, stdio: 'inherit' } ).status ?? 1;
	} finally {
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

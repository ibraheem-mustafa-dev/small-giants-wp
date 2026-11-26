// The shared first-come-first-served queue for heavy-run slots (Bean, 2026-11-26: "give order and allow for our parallel tracks
// to make progress in sync so it's not a race"). It lives in the main checkout's `.claude/queue.md`, whichever worktree or
// session runs the tool, so every session sees one list. lib/heavy-slot.mjs::acquire adds the job at the bottom, lets it take a
// slot only while it is among the first as many waiting jobs as there are free slots, and removes it once it holds one (or gives
// up). A waiting job whose process is gone is dropped by the next reader. Everything above the "Waiting" heading is Bean's text
// and is kept as written; the list under it is written only by this module, under a short exclusive lock.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HEADING = '## Waiting for a heavy-run slot';
const NOTE = 'Written by `scripts/computed-route/tools/heavy-slot.mjs` (and `route-sweep.mjs --slot-dir`): a heavy run joins at the bottom, starts when it reaches the top and a slot is free, and leaves the list as it starts. Do not edit the list by hand; run heavy work through the tool.';
const LINE = /^- (\d\d:\d\d) (\S+) \(pid (\d+)\)(?: <!-- (?:joined (\d+) )?beat (\d+) -->)?$/;
const LOCK_STALE_MS = 30 * 1000;
const LOCK_WAIT_MS = 2 * 60 * 1000;
// Whether the lock's holder process is running (EPERM: it runs as another user).
function holderAlive( pid ) {
	try {
		process.kill( pid, 0 );
		return true;
	} catch ( e ) {
		return 'EPERM' === e.code;
	}
}
// A waiting job rewrites its beat on every poll; one silent this long is gone even if Windows gave its process id to another program.
export const WAIT_STALE_MS = 5 * 60 * 1000;

// The main checkout's root: a worktree's `.git` file names `<root>/.git/worktrees/<name>`.
export function sharedRoot( from = path.dirname( fileURLToPath( import.meta.url ) ) ) {
	for ( let d = path.resolve( from ); ; d = path.dirname( d ) ) {
		const git = path.join( d, '.git' );
		if ( fs.existsSync( git ) ) {
			if ( fs.statSync( git ).isDirectory() ) {
				return d;
			}
			const m = /gitdir:\s*(.+)/.exec( fs.readFileSync( git, 'utf8' ) );
			const dir = m ? path.resolve( d, m[ 1 ].trim() ).replace( /\\/g, '/' ) : '';
			const at = dir.lastIndexOf( '/.git/' );
			return -1 === at ? d : dir.slice( 0, at );
		}
		if ( path.dirname( d ) === d ) {
			return null;
		}
	}
}

export const QUEUE_FILE = process.env.SGS_HEAVY_QUEUE || path.join( sharedRoot() || '.', '.claude', 'queue.md' );

export function readQueue( file ) {
	const text = fs.existsSync( file ) ? fs.readFileSync( file, 'utf8' ) : '';
	const at = text.indexOf( HEADING );
	const head = ( -1 === at ? text : text.slice( 0, at ) ).replace( /\s+$/, '' );
	const entries = -1 === at ? [] : text.slice( at ).split( /\r?\n/ ).map( ( l ) => LINE.exec( l.trim() ) ).filter( Boolean )
		.map( ( m ) => ( { time: m[ 1 ], label: m[ 2 ], pid: Number( m[ 3 ] ), joined: Number( m[ 4 ] ) || 0, beat: Number( m[ 5 ] ) || 0 } ) );
	return { head, entries };
}

function writeQueue( file, { head, entries } ) {
	const list = entries.length ? entries.map( ( e ) => `- ${ e.time } ${ e.label } (pid ${ e.pid }) <!-- joined ${ e.joined } beat ${ e.beat } -->` ).join( '\n' ) : '(none waiting)';
	fs.writeFileSync( file, `${ head ? `${ head }\n\n` : '' }${ HEADING }\n\n${ NOTE }\n\n${ list }\n` );
}

// Runs `fn` holding the queue's lock (a file created exclusively beside the queue's slots, holding the holder's process id).
// A lock whose holder process is gone, or older than 30 s, is a crash's and is broken; a busy machine can stall a live holder
// for seconds, so the wait is long (LOCK_WAIT_MS) and only a lock still taken after it is an error.
export function withQueueLock( lockDir, fn, { sleep = ( ms ) => Atomics.wait( new Int32Array( new SharedArrayBuffer( 4 ) ), 0, 0, ms ), alive = holderAlive, now = Date.now } = {} ) {
	fs.mkdirSync( lockDir, { recursive: true } );
	const lock = path.join( lockDir, 'queue.lock' );
	for ( const start = now(); ; ) {
		try {
			fs.writeFileSync( lock, String( process.pid ), { flag: 'wx' } );
			break;
		} catch {
			try {
				const holder = Number( fs.readFileSync( lock, 'utf8' ) );
				if ( now() - fs.statSync( lock ).mtimeMs > LOCK_STALE_MS || ( holder && ! alive( holder ) ) ) {
					fs.rmSync( lock, { force: true } );
					continue;
				}
			} catch {
				// freed meanwhile
			}
			if ( now() - start > LOCK_WAIT_MS ) {
				throw new Error( `the heavy-run queue lock ${ lock } stayed taken for ${ LOCK_WAIT_MS / 1000 } s` );
			}
			sleep( 50 );
		}
	}
	try {
		return fn();
	} finally {
		fs.rmSync( lock, { force: true } );
	}
}

const same = ( a, b ) => a.label === b.label && a.pid === b.pid;
const hhmm = ( now ) => new Date( now ).toTimeString().slice( 0, 5 );

// Drops the waiting jobs whose process is gone or whose beat is WAIT_STALE_MS old, adds `me` at the bottom when it is not
// listed (at the top with `front`: a run Bean put ahead of the queue, such as a live-site deploy) or refreshes its beat,
// writes the list, and returns `me`'s place (0 is the top).
export function queuePlace( { file, lockDir, me, alive, now = Date.now(), front = false } ) {
	return withQueueLock( lockDir, () => {
		const q = readQueue( file );
		const entries = q.entries.filter( ( e ) => same( e, me ) || ( alive( e.pid ) && now - e.beat <= WAIT_STALE_MS ) );
		let at = entries.findIndex( ( e ) => same( e, me ) );
		if ( -1 === at ) {
			const entry = { time: hhmm( now ), label: me.label, pid: me.pid, joined: now, beat: now };
			front ? entries.unshift( entry ) : entries.push( entry );
			at = front ? 0 : entries.length - 1;
		} else {
			entries[ at ] = { ...entries[ at ], beat: now };
		}
		writeQueue( file, { head: q.head, entries } );
		return at;
	} );
}

export function leaveQueue( { file, lockDir, me } ) {
	withQueueLock( lockDir, () => {
		const q = readQueue( file );
		const entries = q.entries.filter( ( e ) => ! same( e, me ) );
		entries.length !== q.entries.length && writeQueue( file, { head: q.head, entries } );
	} );
}

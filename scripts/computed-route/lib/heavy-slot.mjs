// Heavy-run slots shared by every session and worker on this machine (plan 2026-11-25-land-fixes-and-editor-cleanup, Task 1).
// A heavy run is a route sweep, the full test suite, a browser or Playwright run, render-check, site-run.mjs or a plugin
// build. Two slots are always available; a third (overflow) slot is taken only after a long wait and only when the machine
// has room (CPU, free memory and free space on C:), so a log jam clears without overloading the PC.
//
// A slot is a folder (created atomically with mkdir) holding owner.json: { label, pid, beat } for a slot held by a running
// process, which rewrites `beat` every minute (keepAlive); it is freed once that process is gone or its beat is five minutes
// old, so a crashed run whose process id Windows hands to another program still lets go. { label, expires } is a slot taken by
// `heavy-slot.mjs acquire`, freed by `release` or when the lease runs out (a lease is never renewed). A slot folder with no
// owner.json older than ten minutes is a lock left by a crashed run and is freed too. Freeing a stale slot happens under a
// short exclusive reclaim lock, so two processes that both find it stale cannot both take it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SLOT_DIR = 'E:/sgs-tmp/general-cloning/heavy';
export const NORMAL_SLOTS = [ 'slot-1', 'slot-2' ];
export const OVERFLOW_SLOT = 'slot-3';
export const LEASE_MS = 90 * 60 * 1000;
export const OVERFLOW_AFTER_MS = 10 * 60 * 1000;
const ORPHAN_MS = 10 * 60 * 1000;
export const BEAT_MS = 60 * 1000;
export const BEAT_STALE_MS = 5 * 60 * 1000;
const RECLAIM_LOCK_MS = 30 * 1000;
// The room a third heavy run needs: CPU busy below this share, at least this much free memory and free space on C:.
export const ROOM = { cpuBusy: 0.7, freeMemBytes: 6 * 1024 ** 3, freeCBytes: 10 * 1024 ** 3 };

const ownerFile = ( p ) => path.join( p, 'owner.json' );

// Whether a process with this id is running (EPERM means it exists but belongs to another user).
export function pidAlive( pid ) {
	if ( ! pid ) {
		return false;
	}
	try {
		process.kill( pid, 0 );
		return true;
	} catch ( e ) {
		return 'EPERM' === e.code;
	}
}

export function readOwner( p ) {
	try {
		return JSON.parse( fs.readFileSync( ownerFile( p ), 'utf8' ) );
	} catch {
		return null;
	}
}

// Whether the slot folder `p` is held by no live owner.
export function isStale( p, now = Date.now(), alive = pidAlive ) {
	const owner = readOwner( p );
	if ( ! owner ) {
		try {
			return now - fs.statSync( p ).mtimeMs > ORPHAN_MS;
		} catch {
			return false;
		}
	}
	if ( owner.pid ) {
		return ! alive( owner.pid ) || ( undefined !== owner.beat && now - owner.beat > BEAT_STALE_MS );
	}
	return now > ( owner.expires || 0 );
}

// Takes slot `name` in `dir` for `owner`, freeing it first when stale. Returns the slot path, or null when it is held.
export function tryTake( dir, name, owner, { now = Date.now(), alive = pidAlive } = {} ) {
	const p = path.join( dir, name );
	fs.mkdirSync( dir, { recursive: true } );
	if ( fs.existsSync( p ) && isStale( p, now, alive ) ) {
		reclaim( p, now, alive );
	}
	try {
		fs.mkdirSync( p );
	} catch {
		return null;
	}
	fs.writeFileSync( ownerFile( p ), JSON.stringify( owner ) );
	return p;
}

// Frees the stale slot `p` under an exclusive lock file, re-checking staleness inside the lock so a slot another process
// has just taken is left alone. A lock older than RECLAIM_LOCK_MS is left by a crash and is broken.
function reclaim( p, now, alive ) {
	const lock = `${ p }.reclaim`;
	try {
		if ( fs.existsSync( lock ) && now - fs.statSync( lock ).mtimeMs > RECLAIM_LOCK_MS ) {
			fs.rmSync( lock, { force: true } );
		}
		fs.writeFileSync( lock, String( process.pid ), { flag: 'wx' } );
	} catch {
		return;
	}
	try {
		if ( fs.existsSync( p ) && isStale( p, now, alive ) ) {
			fs.rmSync( p, { recursive: true, force: true } );
		}
	} finally {
		fs.rmSync( lock, { force: true } );
	}
}

// Rewrites `beat` in each slot's owner.json every BEAT_MS while the caller runs; returns a function that stops it.
export function keepAlive( paths, owner, everyMs = BEAT_MS ) {
	const beat = () => {
		for ( const p of paths ) {
			try {
				fs.writeFileSync( ownerFile( p ), JSON.stringify( { ...owner, beat: Date.now() } ) );
			} catch {
				// slot already released
			}
		}
	};
	beat();
	const t = setInterval( beat, everyMs );
	t.unref?.();
	return () => clearInterval( t );
}

// Frees every slot `label` holds in `dir`; returns how many.
export function releaseLabel( dir, label ) {
	let n = 0;
	for ( const name of [ ...NORMAL_SLOTS, OVERFLOW_SLOT ] ) {
		const p = path.join( dir, name );
		if ( readOwner( p )?.label === label ) {
			fs.rmSync( p, { recursive: true, force: true } );
			n++;
		}
	}
	return n;
}

export function releasePath( p ) {
	fs.rmSync( p, { recursive: true, force: true } );
}

// The machine's load: CPU busy share over `sampleMs`, free memory and free space on C:, in bytes.
export async function machineLoad( sampleMs = 1000 ) {
	const total = () => os.cpus().reduce( ( a, c ) => {
		const t = c.times;
		a.idle += t.idle;
		a.all += t.user + t.nice + t.sys + t.idle + t.irq;
		return a;
	}, { idle: 0, all: 0 } );
	const a = total();
	await new Promise( ( r ) => setTimeout( r, sampleMs ) );
	const b = total();
	const all = b.all - a.all;
	let freeC = Infinity;
	try {
		const s = fs.statfsSync( 'C:\\' );
		freeC = s.bavail * s.bsize;
	} catch {
		// not Windows, or C: unreadable: no limit from it
	}
	return { cpuBusy: all > 0 ? 1 - ( b.idle - a.idle ) / all : 0, freeMem: os.freemem(), freeC };
}

export function hasRoom( load, room = ROOM ) {
	return load.cpuBusy < room.cpuBusy && load.freeMem >= room.freeMemBytes && load.freeC >= room.freeCBytes;
}

// Waits for a slot: a normal one whenever free, the overflow one once `overflowAfterMs` has passed and the machine has room.
// Returns { path, overflow }. Throws after `maxWaitMs`.
export async function acquire( { dir = SLOT_DIR, owner, pollMs = 30000, maxWaitMs = 4 * 60 * 60 * 1000, overflowAfterMs = OVERFLOW_AFTER_MS,
	wait = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) ), load = machineLoad, log = () => {} } ) {
	const start = Date.now();
	for ( ;; ) {
		for ( const name of NORMAL_SLOTS ) {
			const p = tryTake( dir, name, owner );
			if ( p ) {
				return { path: p, overflow: false };
			}
		}
		const waited = Date.now() - start;
		if ( waited >= overflowAfterMs ) {
			const l = await load();
			if ( hasRoom( l ) ) {
				const p = tryTake( dir, OVERFLOW_SLOT, owner );
				if ( p ) {
					return { path: p, overflow: true };
				}
			} else {
				log( `overflow slot refused: CPU ${ Math.round( l.cpuBusy * 100 ) }% busy, ${ ( l.freeMem / 1024 ** 3 ).toFixed( 1 ) } GB memory free, ${ ( l.freeC / 1024 ** 3 ).toFixed( 1 ) } GB free on C:` );
			}
		}
		if ( waited >= maxWaitMs ) {
			throw new Error( `no heavy slot in ${ dir } after ${ Math.round( waited / 60000 ) } minutes` );
		}
		await wait( pollMs );
	}
}

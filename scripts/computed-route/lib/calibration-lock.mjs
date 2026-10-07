// One calibration per calibration page (R-47-11). Every run on a site builds its instances onto that site's one
// calibration page with the same instance classes (cr-ref-cal-<n>), so a second run started meanwhile overwrites the
// first's instances and both read the other's blocks (2026-10-07: a sgs/mega-group calibration measured a
// sgs/nav-bar-menu root while another session calibrated nav-bar-menu on the same local mirror). The lock is a file per
// site in the machine's temp folder, which every session and worktree on this machine shares; a lock whose owning
// process is gone is taken over, so a crashed run never blocks the next one.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A lock file being written by another process may not parse yet: it counts as held for this long.
const FRESH_MS = 60000;

// The lock file for one site's calibration page.
export const calibrationLockPath = ( site, dir = os.tmpdir() ) => path.join( dir, `sgs-calibration-${ String( site ).replace( /[^a-z0-9-]/gi, '_' ) }.lock` );

// Whether a process is still running (EPERM: it runs under another user).
export function processAlive( pid ) {
	try {
		process.kill( pid, 0 );
		return true;
	} catch ( e ) {
		return 'EPERM' === e.code;
	}
}

// Takes the site's calibration lock or throws naming the run that holds it. Returns { file, release }; release removes
// the lock only while this process still holds it, and is safe to call more than once.
export function acquireCalibrationLock( site, { blocks = [], dir, pid = process.pid, isAlive = processAlive, now = Date.now } = {} ) {
	const file = calibrationLockPath( site, dir );
	for ( let attempt = 0; attempt < 2; attempt++ ) {
		try {
			fs.writeFileSync( file, JSON.stringify( { pid, site, blocks, started: new Date( now() ).toISOString() } ), { flag: 'wx' } );
			const release = () => {
				try {
					if ( pid === JSON.parse( fs.readFileSync( file, 'utf8' ) ).pid ) {
						fs.unlinkSync( file );
					}
				} catch {
					// Already released or taken over.
				}
			};
			return { file, release };
		} catch ( e ) {
			if ( 'EEXIST' !== e.code ) {
				throw e;
			}
			let held = null;
			try {
				held = JSON.parse( fs.readFileSync( file, 'utf8' ) );
			} catch {
				held = null;
			}
			const fresh = ! held && now() - fs.statSync( file ).mtimeMs < FRESH_MS;
			if ( fresh || ( held && isAlive( held.pid ) ) ) {
				const who = held ? `pid ${ held.pid }, ${ ( held.blocks || [] ).join( ', ' ) || 'no blocks named' }, since ${ held.started }` : 'a lock still being written';
				throw new Error( `R-47-11: another calibration is using ${ site }'s calibration page (${ who }); wait for it to finish. Lock: ${ file }` );
			}
			fs.rmSync( file, { force: true } );
		}
	}
	throw new Error( `R-47-11: could not take ${ site }'s calibration lock (${ file })` );
}

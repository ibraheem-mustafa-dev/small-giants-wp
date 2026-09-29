/**
 * close-browser-on-exit — make sure a Playwright browser dies with the script that launched it.
 *
 * `await browser.close()` at the end of a script only runs when the script gets that far. A
 * thrown error, a rejected top-level await, a `process.exit()` from a failure path, Ctrl+C or a
 * closed terminal skips it, and on Windows the Chrome for Testing processes then outlive Node —
 * each headed run leaves its windows open (a dozen found in Task Manager, 2026-09-29).
 *
 * Playwright's `Browser` does not expose its process, so the browser is found by a tag instead:
 *
 *   1. `browserOwnerArgs()` — add to `chromium.launch( { args } )`. Tags the browser's command
 *      line with `--sgs-browser-owner=<this script's pid>` (Chrome ignores unknown switches).
 *   2. `closeBrowserOnExit()` — call once after launch. On any exit (normal, error, Ctrl+C,
 *      SIGTERM, Ctrl+Break) it kills the tagged browser's whole process tree; after a clean
 *      `browser.close()` it finds nothing and does nothing. It also sweeps ORPHANS first: tagged
 *      browsers whose owner script is no longer running — left by a run that was killed outright,
 *      where no exit handler could run.
 *
 * Windows kills with `taskkill /T /F` (Chrome's renderer and GPU children go with it); elsewhere
 * SIGKILL on the browser process.
 *
 * Used by scripts/parity/draft-live-walk.mjs and scripts/wp-build-page.js.
 */
'use strict';

const { spawnSync } = require( 'child_process' );

const TAG = '--sgs-browser-owner=';

/**
 * The launch args that tag a browser as owned by this script.
 *
 * @return {string[]} One Chrome switch.
 */
function browserOwnerArgs() {
	return [ TAG + process.pid ];
}

/**
 * Every running tagged browser, with the pid of the script that owns it.
 *
 * @return {{pid:number, owner:number}[]} Tagged browser processes.
 */
function taggedBrowsers() {
	const found = [];
	let lines = '';
	if ( 'win32' === process.platform ) {
		const ps = "Get-CimInstance Win32_Process -Filter \"(Name like 'chrom%' or Name like '%headless_shell%') and CommandLine like '%" + TAG + "%'\" | ForEach-Object { \"$($_.ProcessId) $($_.CommandLine)\" }";
		lines = spawnSync( 'powershell', [ '-NoProfile', '-NonInteractive', '-Command', ps ], { encoding: 'utf8', windowsHide: true } ).stdout || '';
	} else {
		lines = spawnSync( 'ps', [ '-eo', 'pid=,args=' ], { encoding: 'utf8' } ).stdout || '';
	}
	for ( const line of lines.split( /\r?\n/ ) ) {
		// pid, the executable, then the tag as a switch of its own. The executable must be a
		// Chrome/Chromium binary: any other process whose command line merely MENTIONS the tag
		// (a shell, an editor, this search) is never touched.
		const m = line.match( /^\s*(\d+)\s+("[^"]+"|\S+)(?:\s.*?)?\s--sgs-browser-owner=(\d+)(?:\s|$)/ );
		if ( m && /(^|[\\/])(chrome|chromium|chrome-headless-shell|headless_shell)(\.exe)?"?$/i.test( m[ 2 ] ) ) {
			found.push( { pid: Number( m[ 1 ] ), owner: Number( m[ 3 ] ) } );
		}
	}
	return found;
}

function isRunning( pid ) {
	try {
		process.kill( pid, 0 );
		return true;
	} catch ( e ) {
		return 'EPERM' === e.code;
	}
}

function killTree( pid ) {
	try {
		if ( 'win32' === process.platform ) {
			spawnSync( 'taskkill', [ '/pid', String( pid ), '/T', '/F' ], { stdio: 'ignore', windowsHide: true } );
		} else {
			process.kill( pid, 'SIGKILL' );
		}
	} catch ( e ) {
		// Already gone.
	}
}

/**
 * Kill tagged browsers left by scripts that are no longer running.
 *
 * @return {number} How many were killed.
 */
function sweepOrphans() {
	const orphans = taggedBrowsers().filter( ( b ) => b.owner !== process.pid && ! isRunning( b.owner ) );
	orphans.forEach( ( b ) => killTree( b.pid ) );
	if ( orphans.length ) {
		console.error( `[browser] closed ${ orphans.length } browser(s) left open by an earlier run` );
	}
	return orphans.length;
}

/**
 * Kill this script's tagged browser on every way out of the script, and sweep orphans now.
 *
 * @return {Function} The clean-up, callable directly.
 */
function closeBrowserOnExit() {
	sweepOrphans();
	let done = false;
	const kill = () => {
		if ( done ) {
			return;
		}
		done = true;
		taggedBrowsers().filter( ( b ) => b.owner === process.pid ).forEach( ( b ) => killTree( b.pid ) );
	};
	process.once( 'exit', kill );
	for ( const sig of [ 'SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK' ] ) {
		process.once( sig, () => {
			kill();
			process.exit( 130 );
		} );
	}
	return kill;
}

module.exports = { browserOwnerArgs, closeBrowserOnExit, sweepOrphans };

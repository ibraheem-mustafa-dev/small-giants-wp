// One logged-in browser for a run that builds pages on a site (scripts/lib/wp-session.js): the run launches it once, every
// scripts/wp-build-page.js child it starts attaches to it through SGS_CDP_URL, and the login is kept between runs in a
// per-site profile under scripts/computed-route/cache/ (gitignored), so a run logs in at most once and a later run not at
// all. A host's edge that blocks bursts of automated logins (Hostinger answers 403 to every request for about 20 minutes)
// sees one session instead of one login per page. Used by calibrate.mjs, site-build.mjs and site-run.mjs.
// SGS_CDP_URL already set: attach to that browser instead (an everyday Chrome started with --remote-debugging-port, which
// the host's edge does not challenge as it does Playwright's Chrome for Testing); only the run's own tab closes.
// SGS_HEADED=1 runs headed (Hostinger's edge challenges a headless browser under load).
import fs from 'fs';
import net from 'net';
import path from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
const CACHE = path.join( HERE, '..', 'cache' );

// A site's credentials from its secrets file (never printed): { url, user, pwd }.
export function readEnv( file, key, repo = REPO ) {
	const o = {};
	fs.readFileSync( path.resolve( repo, file ), 'utf8' ).split( /\r?\n/ ).forEach( ( l ) => {
		const m = l.match( /^([A-Z0-9_]+)=(.*)$/ );
		if ( m ) {
			o[ m[ 1 ] ] = m[ 2 ].trim().replace( /^["']|["']$/g, '' );
		}
	} );
	return { url: o[ `WP_URL_${ key }` ].replace( /\/+$/, '' ), user: o[ `WP_USER_${ key }` ], pwd: o[ `WP_PWD_${ key }` ] };
}

// The shared browser for `site`, logged in with `env`: { context, page, close }. Scrollbars are hidden as the walker hides
// them, or a headed window lays the page out about 15px narrower than its viewport.
export async function openRunSession( site, env, timeout = 120000 ) {
	const require = createRequire( import.meta.url );
	const wpSession = require( '../../lib/wp-session.js' );
	const closeOnExit = require( '../../lib/close-browser-on-exit.js' );
	const { chromium } = await import( 'playwright' );
	if ( process.env.SGS_CDP_URL ) {
		const attached = await wpSession.connectShared( chromium );
		await wpSession.ensureLoggedIn( attached.page, env, timeout );
		return attached;
	}
	closeOnExit.closeBrowserOnExit();
	const shared = await wpSession.launchShared( chromium, { profileDir: path.join( CACHE, `.profile-${ site }` ), headless: ! process.env.SGS_HEADED, args: [ '--hide-scrollbars', ...closeOnExit.browserOwnerArgs() ] } );
	await wpSession.ensureLoggedIn( shared.page, env, timeout );
	return shared;
}

// A free local TCP port.
const freePort = () => new Promise( ( resolve, reject ) => {
	const srv = net.createServer();
	srv.on( 'error', reject );
	srv.listen( 0, '127.0.0.1', () => {
		const { port } = srv.address();
		srv.close( () => resolve( port ) );
	} );
} );

// The shared browser as a process of its own: { close }. A run that starts its wp-build-page.js children synchronously
// (site-build.mjs's execFileSync) blocks its own event loop, and a browser it launched through Playwright's pipe then stalls
// with it, so a child's login waits until it times out. Here Chrome runs on its own with a debugging port; the run logs in
// over CDP, disconnects, and exports SGS_CDP_URL for the children; close() ends the process.
export async function openDetachedSession( site, env, timeout = 120000 ) {
	const require = createRequire( import.meta.url );
	const wpSession = require( '../../lib/wp-session.js' );
	const closeOnExit = require( '../../lib/close-browser-on-exit.js' );
	const { chromium } = await import( 'playwright' );
	const port = await freePort();
	const url = `http://127.0.0.1:${ port }`;
	closeOnExit.closeBrowserOnExit();
	const proc = spawn( chromium.executablePath(), [ `--remote-debugging-port=${ port }`, `--user-data-dir=${ path.join( CACHE, `.profile-${ site }` ) }`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
		...( process.env.SGS_HEADED ? [] : [ '--headless=new' ] ), ...closeOnExit.browserOwnerArgs(), 'about:blank' ], { stdio: 'ignore' } );
	const until = Date.now() + 30000;
	for ( ;; ) {
		try {
			if ( ( await fetch( `${ url }/json/version` ) ).ok ) {
				break;
			}
		} catch {
			// Not listening yet.
		}
		if ( Date.now() > until ) {
			proc.kill();
			throw new Error( `the shared browser did not open its debugging port ${ port }` );
		}
		await new Promise( ( r ) => setTimeout( r, 250 ) );
	}
	process.env.SGS_CDP_URL = url;
	const attached = await wpSession.connectShared( chromium );
	await wpSession.ensureLoggedIn( attached.page, env, timeout );
	await attached.close();
	return {
		close: async () => {
			delete process.env.SGS_CDP_URL;
			proc.kill();
		},
	};
}

// Tabs a child left open (a wp-build-page.js that exited through fail()) are closed so the window does not fill up.
export async function closeStrayTabs( shared ) {
	await Promise.all( shared.context.pages().filter( ( p ) => p !== shared.page ).map( ( p ) => p.close().catch( () => {} ) ) );
}

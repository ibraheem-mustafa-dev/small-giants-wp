// One logged-in browser for a run that builds pages on a site (scripts/lib/wp-session.js): the run launches it once, every
// scripts/wp-build-page.js child it starts attaches to it through SGS_CDP_URL, and the login is kept between runs in a
// per-site profile under scripts/computed-route/cache/ (gitignored), so a run logs in at most once and a later run not at
// all. A host's edge that blocks bursts of automated logins (Hostinger answers 403 to every request for about 20 minutes)
// sees one session instead of one login per page. Used by calibrate.mjs, site-build.mjs and site-run.mjs.
// SGS_CDP_URL already set: attach to that browser instead (an everyday Chrome started with --remote-debugging-port, which
// the host's edge does not challenge as it does Playwright's Chrome for Testing); only the run's own tab closes.
// SGS_HEADED=1 runs headed (Hostinger's edge challenges a headless browser under load).
import fs from 'fs';
import path from 'path';
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

// Tabs a child left open (a wp-build-page.js that exited through fail()) are closed so the window does not fill up.
export async function closeStrayTabs( shared ) {
	await Promise.all( shared.context.pages().filter( ( p ) => p !== shared.page ).map( ( p ) => p.close().catch( () => {} ) ) );
}

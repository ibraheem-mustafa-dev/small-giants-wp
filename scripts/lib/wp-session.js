/**
 * wp-session — one logged-in Chrome shared by a run and every child script it starts.
 *
 * A run that starts a fresh browser per step logs into WordPress once per step; dozens of logins a minute make the
 * host's edge treat the client as a bot and serve a challenge in place of the login form (2026-10-05: every
 * calibration login timed out waiting for #user_login). This keeps one window per run and one login per site:
 *
 *   - `launchShared( chromium, { profileDir, headless, args } )` — the owning script opens a persistent profile (its
 *     cookies survive between runs, so a still-valid login skips the form) with a CDP port, and sets
 *     `SGS_CDP_URL` so child scripts reuse the same window.
 *   - `connectShared( chromium )` — a child script attaches to that browser when `SGS_CDP_URL` is set: it opens its
 *     own tab in the shared profile; its close shuts that tab and disconnects, leaving the window open.
 *   - `ensureLoggedIn( page, { url, user, pwd } )` — opens wp-admin and fills the login form only when WordPress asks.
 */
'use strict';

const net = require( 'net' );

// Every connection to the shared browser sees each page dialog; with no listener each one auto-dismisses it, and the
// one that loses the race throws "No dialog is showing" and crashes its process. A listener replaces the auto-dismiss:
// still dismissed (the old behaviour), the loser's error ignored.
const dismissDialogs = ( context ) => context.on( 'dialog', ( dialog ) => dialog.dismiss().catch( () => {} ) );

/**
 * A free local TCP port.
 *
 * @return {Promise<number>} The port.
 */
function freePort() {
	return new Promise( ( resolve, reject ) => {
		const srv = net.createServer();
		srv.on( 'error', reject );
		srv.listen( 0, '127.0.0.1', () => {
			const { port } = srv.address();
			srv.close( () => resolve( port ) );
		} );
	} );
}

/**
 * Launch the shared browser: a persistent profile with a CDP endpoint, exported as SGS_CDP_URL for child processes.
 *
 * @param {Object}   chromium            Playwright's chromium.
 * @param {Object}   opts                Options.
 * @param {string}   opts.profileDir     Profile directory (keep it out of git).
 * @param {boolean}  opts.headless       Headless or headed.
 * @param {string[]} [opts.args]         Extra Chrome switches.
 * @return {Promise<{context: Object, page: Object, close: Function}>} The persistent context, its first tab and a closer.
 */
async function launchShared( chromium, { profileDir, headless, args = [] } ) {
	const port = await freePort();
	const context = await chromium.launchPersistentContext( profileDir, {
		headless,
		ignoreHTTPSErrors: true,
		viewport: { width: 1280, height: 800 },
		args: [ ...args, `--remote-debugging-port=${ port }` ],
	} );
	dismissDialogs( context );
	process.env.SGS_CDP_URL = `http://127.0.0.1:${ port }`;
	const page = context.pages()[ 0 ] || ( await context.newPage() );
	return {
		context,
		page,
		close: async () => {
			delete process.env.SGS_CDP_URL;
			await context.close();
		},
	};
}

/**
 * Attach to the browser SGS_CDP_URL names and open a tab in its profile.
 *
 * @param {Object} chromium Playwright's chromium.
 * @return {Promise<{context: Object, page: Object, close: Function}|null>} The shared context, a new tab and a closer
 *     that closes only that tab; null when SGS_CDP_URL is unset.
 */
async function connectShared( chromium ) {
	if ( ! process.env.SGS_CDP_URL ) {
		return null;
	}
	const browser = await chromium.connectOverCDP( process.env.SGS_CDP_URL );
	const context = browser.contexts()[ 0 ];
	dismissDialogs( context );
	const page = await context.newPage();
	return {
		context,
		page,
		// Closing a CDP-connected browser disconnects this process only (the shared window keeps running); without it
		// the open connection keeps the child's event loop alive and it never exits.
		close: async () => {
			await page.close().catch( () => {} );
			await browser.close().catch( () => {} );
		},
	};
}

/**
 * Open wp-admin; log in only when WordPress shows the login form.
 *
 * @param {Object} page      Playwright page.
 * @param {Object} creds     Site credentials.
 * @param {string} creds.url  Site URL without a trailing slash.
 * @param {string} creds.user Login name.
 * @param {string} creds.pwd  Password.
 * @return {Promise<boolean>} True when the form was filled, false when an existing session was reused.
 */
async function ensureLoggedIn( page, { url, user, pwd } ) {
	await page.goto( `${ url }/wp-admin/`, { waitUntil: 'domcontentloaded', timeout: 60000 } );
	if ( ! /wp-login\.php/.test( page.url() ) ) {
		return false;
	}
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pwd );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 90000, waitUntil: 'commit' } ), page.click( '#wp-submit' ) ] );
	return true;
}

module.exports = { launchShared, connectShared, ensureLoggedIn };

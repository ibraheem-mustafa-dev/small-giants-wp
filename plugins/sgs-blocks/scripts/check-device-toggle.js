/**
 * check-device-toggle.js — live browser detector for the global device toggle
 * (src/blocks/extensions/responsive-device-toggle.js).
 *
 * WHY THIS EXISTS
 * ----------------
 * The toggle is portalled DOM, mounted by a `registerPlugin` React component
 * that lives under `src/blocks/extensions/`, and driven by `core/editor`'s
 * getDeviceType/setDeviceType store. Nothing that reads SOURCE FILES can see
 * whether it actually mounts, paints, or drives the canvas on a live page:
 *   - `lint-responsive-controls.py` globs only each block's edit.js (verified
 *     — scripts/lint-responsive-controls.py:299, `blocks_src.glob(...)` with
 *     a one-level-deep "edit.js" pattern). This file is
 *     `src/blocks/extensions/responsive-device-toggle.js`, so it is never in
 *     that file set.
 *   - `check-control-ux.js` explicitly excludes the `extensions` directory
 *     (verified — scripts/check-control-ux.js:506
 *     `.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )`).
 * A runtime failure here (portal orphaned, store call renamed, cue never
 * fires) is therefore invisible to every existing prebuild gate. Only a
 * browser check closes that gap.
 *
 * WHAT IT CHECKS, per editor (post editor + site editor):
 *   1. Exactly ONE `[data-sgs-device-toggle="mounted"]` node exists.
 *   2. That node is genuinely PAINTED — not just present in the DOM. Per
 *      `~/.claude/CLAUDE.md`'s measurement-vs-eye discipline,
 *      `getBoundingClientRect()` is NOT a visibility test (it reports the
 *      layout box regardless of ancestor `overflow:hidden` or the viewport
 *      edge). This uses `document.elementFromPoint()` at the node's own
 *      centre and confirms the HIT element is the node or a descendant.
 *   3. Clicking "Tablet" changes `wp.data.select('core/editor').getDeviceType()`
 *      to `'Tablet'` AND changes the canvas iframe's rendered width.
 *   4. The `.sgs-device-cue` appears once off Desktop.
 *   5. Switching back to "Desktop" removes the cue.
 *
 * NOT WIRED INTO `prebuild` (deliberately). `prebuild` runs offline with no
 * network/credential dependency — that is load-bearing for every contributor's
 * build. This script needs a live canary + WP admin credentials, so it stays
 * a standalone `npm run check:device-toggle`, run on demand / in a separate
 * CI lane that has the canary reachable.
 *
 * CLEANUP: `post-new.php` reserves an auto-draft page ID as soon as the editor
 * loads (before any edit). This script never clicks Save/Publish, but it
 * DOES delete that auto-draft (REST DELETE, i.e. trash) in a `finally` block
 * so the canary is left exactly as found. The site editor pass edits an
 * EXISTING template in memory only (never saved), so nothing to clean up
 * there.
 *
 * USAGE
 *   node scripts/check-device-toggle.js              # report mode, exit 0
 *   node scripts/check-device-toggle.js --check       # gate mode, exit 1 on any failure
 *   node scripts/check-device-toggle.js --self-test    # proves the detector CAN fail
 *
 * Creds: `.claude/secrets/sandybrown.env`
 *   (WP_URL_SANDYBROWN, WP_USER_SANDYBROWN, WP_PWD_SANDYBROWN — browser login;
 *   WP_APP_PWD_SANDYBROWN — REST cleanup).
 *
 * @package SGS\Blocks
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

// ---------------------------------------------------------------------------
// Playwright is a dev-time-only, credential-gated dependency. Degrade cleanly
// (clear message, exit 0 in report mode / exit 1 in --check) rather than
// crash, per the calling brief's "if Playwright isn't available" instruction.
// It IS present in this repo's node_modules (verified: `require.resolve`
// succeeds, `node_modules/playwright` + `node_modules/@playwright` exist),
// even though it is not listed in package.json devDependencies — so this
// guard is a genuine degrade path for any environment where it is missing
// (e.g. a fresh `npm ci` on a machine that never ran the Playwright MCP
// install), not dead code.
let chromium;
try {
	// eslint-disable-next-line import/no-extraneous-dependencies
	( { chromium } = require( 'playwright' ) );
} catch ( e ) {
	process.stderr.write(
		'[check-device-toggle] Playwright is not installed in this environment ' +
			'(require("playwright") failed: ' + e.message + ').\n' +
			'This check cannot run without it. Install with:\n' +
			'  npm install --save-dev playwright && npx playwright install chromium\n'
	);
	process.exit( process.argv.includes( '--check' ) ? 1 : 0 );
}

const CHECK_MODE = process.argv.includes( '--check' );
const SELF_TEST = process.argv.includes( '--self-test' );

// ---------------------------------------------------------------------------
// Creds
// ---------------------------------------------------------------------------
function loadEnv() {
	const envPath = path.resolve( __dirname, '../../../.claude/secrets/sandybrown.env' );
	const txt = fs.readFileSync( envPath, 'utf8' );
	const env = {};
	for ( const line of txt.split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/ );
		if ( m ) env[ m[ 1 ] ] = m[ 2 ].replace( /^["']|["']$/g, '' );
	}
	const required = [ 'WP_URL_SANDYBROWN', 'WP_USER_SANDYBROWN', 'WP_PWD_SANDYBROWN', 'WP_APP_PWD_SANDYBROWN' ];
	for ( const key of required ) {
		if ( ! env[ key ] ) throw new Error( `${ key } missing from ${ envPath }` );
	}
	return {
		url: env.WP_URL_SANDYBROWN.replace( /\/$/, '' ),
		user: env.WP_USER_SANDYBROWN,
		pwd: env.WP_PWD_SANDYBROWN,
		appPwd: env.WP_APP_PWD_SANDYBROWN,
	};
}

// ---------------------------------------------------------------------------
// Result collection
// ---------------------------------------------------------------------------
function makeResults() {
	const rows = [];
	return {
		rows,
		record( editorLabel, name, pass, detail ) {
			rows.push( { editorLabel, name, pass, detail: detail || '' } );
		},
	};
}

function printReport( results ) {
	let anyFail = false;
	const byEditor = {};
	for ( const r of results.rows ) {
		( byEditor[ r.editorLabel ] ||= [] ).push( r );
	}
	process.stdout.write( '\n=== Device toggle — live check ===\n' );
	for ( const [ editorLabel, rows ] of Object.entries( byEditor ) ) {
		process.stdout.write( `\n-- ${ editorLabel } --\n` );
		for ( const r of rows ) {
			if ( ! r.pass ) anyFail = true;
			process.stdout.write( `  ${ r.pass ? 'PASS' : 'FAIL' }  ${ r.name }${ r.detail ? ' — ' + r.detail : '' }\n` );
		}
	}
	process.stdout.write( `\n${ anyFail ? 'RESULT: FAIL' : 'RESULT: ALL PASS' }\n` );
	return anyFail;
}

// ---------------------------------------------------------------------------
// In-page assertion helpers. Kept as standalone functions (not closures over
// `page`) so the SAME code path is exercised by --self-test against a
// synthetic `page.setContent()` document as against the live canary — proving
// the machinery itself, not a self-test-only reimplementation.
// ---------------------------------------------------------------------------

/**
 * Runs in the page. Returns how many `[data-sgs-device-toggle="mounted"]`
 * nodes exist, and — for the first one — whether the element actually hit by
 * `elementFromPoint()` at its own centre is that node or a descendant of it.
 * A clipped / off-screen / covered node fails this even though
 * `getBoundingClientRect()` alone would report a plausible-looking box.
 */
const PROBE_TOGGLE = () => {
	const SELECTOR = '[data-sgs-device-toggle="mounted"]';
	const nodes = Array.from( document.querySelectorAll( SELECTOR ) );
	if ( nodes.length === 0 ) {
		return { count: 0, painted: false, reason: 'no node matches ' + SELECTOR };
	}
	const node = nodes[ 0 ];
	const rect = node.getBoundingClientRect();
	const withinViewport =
		rect.width > 0 &&
		rect.height > 0 &&
		rect.right > 0 &&
		rect.bottom > 0 &&
		rect.left < window.innerWidth &&
		rect.top < window.innerHeight;
	if ( ! withinViewport ) {
		return {
			count: nodes.length,
			painted: false,
			reason: `bounding box (${ Math.round( rect.width ) }x${ Math.round( rect.height ) } @ ${ Math.round( rect.left ) },${ Math.round( rect.top ) }) is off-screen or zero-size`,
		};
	}
	const cx = Math.min( Math.max( rect.left + rect.width / 2, 0 ), window.innerWidth - 1 );
	const cy = Math.min( Math.max( rect.top + rect.height / 2, 0 ), window.innerHeight - 1 );
	const hit = document.elementFromPoint( cx, cy );
	const painted = !! ( hit && ( hit === node || node.contains( hit ) ) );
	return {
		count: nodes.length,
		painted,
		reason: painted
			? ''
			: `elementFromPoint(${ Math.round( cx ) },${ Math.round( cy ) }) hit ${ hit ? hit.tagName + ( hit.className ? '.' + String( hit.className ).replace( /\s+/g, '.' ) : '' ) : 'nothing' }, not the toggle — likely covered or clipped by an ancestor`,
	};
};

/** Runs in the page. Clicks the ToggleGroupControlOption labelled `label`. */
const CLICK_DEVICE_OPTION = ( label ) => {
	const root = document.querySelector( '[data-sgs-device-toggle="mounted"]' );
	if ( ! root ) return { clicked: false, reason: 'toggle root not found' };
	const candidates = Array.from( root.querySelectorAll( 'button, [role="radio"]' ) );
	const target = candidates.find( ( el ) => ( el.textContent || '' ).trim() === label );
	if ( ! target ) {
		return {
			clicked: false,
			reason: `no option labelled "${ label }" among [${ candidates.map( ( c ) => `"${ ( c.textContent || '' ).trim() }"` ).join( ', ' ) }]`,
		};
	}
	target.click();
	return { clicked: true };
};

/** Runs in the page. True when a visible `.sgs-device-cue` exists. */
const CUE_PRESENT = () => {
	const cue = document.querySelector( '.interface-interface-skeleton__footer .sgs-device-cue' );
	if ( ! cue ) return false;
	const rect = cue.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0;
};

/** Runs in the page. Reads core/editor's current device tier. */
const READ_DEVICE_TYPE = () => {
	try {
		return window.wp && window.wp.data && window.wp.data.select( 'core/editor' )
			? window.wp.data.select( 'core/editor' ).getDeviceType()
			: null;
	} catch ( e ) {
		return null;
	}
};

// ---------------------------------------------------------------------------
// Self-test — proves the detector CAN fail before trusting it to gate.
// Runs entirely against `page.setContent()` synthetic HTML; no network, no
// credentials, no WP. Two negative controls (per the repo's
// "a-gate-that-cannot-fail-reads-green-forever" / "negative-control" rules):
//   1. A correctly painted toggle -> PROBE_TOGGLE must report painted:true.
//   2. The SAME markup, but clipped by an `overflow:hidden` ancestor and
//      pushed off-screen -> PROBE_TOGGLE must report painted:false, even
//      though its OWN getBoundingClientRect() is a normal-looking box. This
//      is the exact trap named in the brief: a clipped/off-screen toggle
//      still reports a plausible-looking box from getBoundingClientRect()
//      alone.
//   3. A page with no toggle node at all (deliberately wrong selector
//      scenario) -> PROBE_TOGGLE must report count:0, painted:false.
// If any of the three does not report the expected verdict, the self-test
// itself fails loudly — the assertion machinery is not trustworthy and must
// not be treated as a gate.
// ---------------------------------------------------------------------------
async function selfTest() {
	const browser = await chromium.launch( { headless: true } );
	let failures = 0;
	try {
		const page = await browser.newPage( { viewport: { width: 1000, height: 800 } } );

		// --- Positive control: a normally painted toggle -------------------
		await page.setContent( `
			<html><body style="margin:0">
				<div data-sgs-device-toggle="mounted" style="width:200px;height:40px;background:#eee;">
					<button>Desktop</button><button>Tablet</button><button>Mobile</button>
				</div>
			</body></html>
		` );
		const positive = await page.evaluate( PROBE_TOGGLE );
		if ( positive.count === 1 && positive.painted === true ) {
			process.stdout.write( '[self-test] PASS  positive control: painted toggle reports painted:true\n' );
		} else {
			failures++;
			process.stdout.write( `[self-test] FAIL  positive control: expected count:1/painted:true, got ${ JSON.stringify( positive ) }\n` );
		}

		// --- Negative control 1: clipped + off-screen (the named trap) -----
		// getBoundingClientRect() on the inner node alone would report a
		// normal-looking box; only elementFromPoint() at that box's own
		// coordinates reveals nothing is actually painted there, because the
		// ancestor's overflow:hidden clips it and its containing block is
		// pushed off the left edge of the viewport.
		await page.setContent( `
			<html><body style="margin:0">
				<div style="position:absolute; left:-9999px; width:100px; height:100px; overflow:hidden;">
					<div data-sgs-device-toggle="mounted" style="width:200px;height:40px;background:#eee;">
						<button>Desktop</button>
					</div>
				</div>
			</body></html>
		` );
		const clipped = await page.evaluate( PROBE_TOGGLE );
		if ( clipped.count === 1 && clipped.painted === false ) {
			process.stdout.write( '[self-test] PASS  negative control (clipped/off-screen): reports painted:false\n' );
		} else {
			failures++;
			process.stdout.write( `[self-test] FAIL  negative control (clipped/off-screen): expected count:1/painted:false, got ${ JSON.stringify( clipped ) } — the machinery would read this broken state as healthy\n` );
		}

		// --- Negative control 2: deliberately wrong selector / absent node -
		await page.setContent( '<html><body><div class="not-the-toggle">nothing here</div></body></html>' );
		const absent = await page.evaluate( PROBE_TOGGLE );
		if ( absent.count === 0 && absent.painted === false ) {
			process.stdout.write( '[self-test] PASS  negative control (absent node): reports count:0/painted:false\n' );
		} else {
			failures++;
			process.stdout.write( `[self-test] FAIL  negative control (absent node): expected count:0/painted:false, got ${ JSON.stringify( absent ) }\n` );
		}

		// --- CLICK_DEVICE_OPTION against a deliberately wrong label ---------
		await page.setContent( `
			<html><body style="margin:0">
				<div data-sgs-device-toggle="mounted">
					<button>Desktop</button><button>Tablet</button><button>Mobile</button>
				</div>
			</body></html>
		` );
		const wrongLabel = await page.evaluate( CLICK_DEVICE_OPTION, 'Not A Real Option' );
		if ( wrongLabel.clicked === false ) {
			process.stdout.write( '[self-test] PASS  click helper: a non-existent option label correctly fails to click\n' );
		} else {
			failures++;
			process.stdout.write( `[self-test] FAIL  click helper: expected clicked:false for a bogus label, got ${ JSON.stringify( wrongLabel ) }\n` );
		}
		const rightLabel = await page.evaluate( CLICK_DEVICE_OPTION, 'Tablet' );
		if ( rightLabel.clicked === true ) {
			process.stdout.write( '[self-test] PASS  click helper: the real "Tablet" option clicks successfully\n' );
		} else {
			failures++;
			process.stdout.write( `[self-test] FAIL  click helper: expected clicked:true for "Tablet", got ${ JSON.stringify( rightLabel ) }\n` );
		}
	} finally {
		await browser.close();
	}

	// Set exitCode rather than calling process.exit() here. Chromium's close
	// still has async handles unwinding at this point (a Windows/libuv race —
	// measured live: an immediate process.exit() straight after
	// browser.close() throws `UV_HANDLE_CLOSING` from src/win/async.c and can
	// corrupt the reported exit code). Setting exitCode and returning lets
	// Node drain naturally once those handles finish, which is reliable.
	if ( failures > 0 ) {
		process.stdout.write( `\n[self-test] ${ failures } check(s) FAILED — the detector's assertion machinery is not trustworthy. Fix before relying on --check.\n` );
		process.exitCode = 1;
		return;
	}
	process.stdout.write( '\n[self-test] ALL CHECKS PASS — the detector correctly distinguishes a painted toggle from a broken/absent one.\n' );
	process.exitCode = 0;
}

// ---------------------------------------------------------------------------
// Live login + per-editor pass
// ---------------------------------------------------------------------------
async function login( page, creds ) {
	await page.goto( `${ creds.url }/wp-login.php`, { waitUntil: 'domcontentloaded', timeout: 30000 } );
	await page.fill( '#user_login', creds.user );
	await page.fill( '#user_pass', creds.pwd );
	await Promise.all( [
		page.waitForNavigation( { waitUntil: 'domcontentloaded', timeout: 30000 } ),
		page.click( '#wp-submit' ),
	] );
}

/**
 * Ensures the block-level inspector tab is showing (not Page/Post). The
 * sidebar's Page/Block tabs DO carry visible textContent — matched there —
 * while chrome buttons like the sidebar-open toggle carry NO text, only
 * aria-label, and are matched by that instead.
 */
async function ensureBlockTabActive( page ) {
	const tabsSelector = '.editor-sidebar__panel-tabs [role="tab"]';
	let tabs = await page.$$( tabsSelector );
	if ( tabs.length === 0 ) {
		// Sidebar likely closed — open it via the header's Settings toggle,
		// matched by aria-label since it carries no text.
		const headerButtons = await page.$$( 'button' );
		for ( const btn of headerButtons ) {
			const label = ( await btn.getAttribute( 'aria-label' ) ) || '';
			if ( /^settings$/i.test( label.trim() ) ) {
				await btn.click();
				break;
			}
		}
		await page.waitForTimeout( 400 );
		tabs = await page.$$( tabsSelector );
	}
	for ( const tab of tabs ) {
		const text = ( ( await tab.textContent() ) || '' ).trim();
		if ( /^block$/i.test( text ) ) {
			await tab.click();
			await page.waitForTimeout( 200 );
			return true;
		}
	}
	// No tabs at all can also mean the inspector is already showing the block
	// panel with nothing to switch (some states collapse to one panel) — not
	// necessarily a failure; caller's own presence assertion is the real gate.
	return tabs.length > 0;
}

/** Selects a block in the given editor via the data store (works identically
 *  in the post editor and the site editor's canvas — both are one React app
 *  at the top frame; only rendered block DOM lives in the canvas iframe). */
async function selectFirstOrInsertedBlock( page ) {
	return page.evaluate( () => {
		const editorStore = window.wp.data.select( 'core/block-editor' );
		const dispatch = window.wp.data.dispatch( 'core/block-editor' );
		let blocks = editorStore.getBlocks();
		if ( blocks.length === 0 ) {
			const created = window.wp.blocks.createBlock( 'core/paragraph', {
				content: 'sgs device-toggle probe',
			} );
			dispatch.insertBlock( created );
			blocks = editorStore.getBlocks();
		}
		const target = blocks[ 0 ];
		dispatch.selectBlock( target.clientId );
		return target.clientId;
	} );
}

async function getCanvasIframeWidth( page ) {
	const frame = page.locator( 'iframe[name="editor-canvas"]' ).first();
	const count = await frame.count();
	if ( count === 0 ) return null;
	const box = await frame.boundingBox();
	return box ? Math.round( box.width ) : null;
}

/**
 * Runs the full assertion suite against whichever editor is currently loaded
 * in `page`. Pushes rows into `results`.
 */
async function runEditorSuite( page, editorLabel, results ) {
	await selectFirstOrInsertedBlock( page );
	await page.waitForTimeout( 300 );

	const tabActive = await ensureBlockTabActive( page );
	results.record( editorLabel, 'Block inspector tab reachable', tabActive, tabActive ? '' : 'no [role="tab"] labelled "Block" found in the sidebar' );

	const probe1 = await page.evaluate( PROBE_TOGGLE );
	results.record( editorLabel, 'Exactly one toggle mounted', probe1.count === 1, `count=${ probe1.count }` );
	results.record( editorLabel, 'Toggle is genuinely painted', probe1.painted === true, probe1.reason );

	if ( probe1.count !== 1 || ! probe1.painted ) {
		results.record( editorLabel, 'Tablet click drives getDeviceType()', false, 'skipped — toggle not present/painted' );
		results.record( editorLabel, 'Tablet click resizes the canvas iframe', false, 'skipped — toggle not present/painted' );
		results.record( editorLabel, 'Cue appears off Desktop', false, 'skipped — toggle not present/painted' );
		results.record( editorLabel, 'Cue clears back on Desktop', false, 'skipped — toggle not present/painted' );
		return;
	}

	const widthBefore = await getCanvasIframeWidth( page );
	const deviceBefore = await page.evaluate( READ_DEVICE_TYPE );

	const clickTablet = await page.evaluate( CLICK_DEVICE_OPTION, 'Tablet' );
	results.record( editorLabel, 'Tablet option clickable', clickTablet.clicked === true, clickTablet.reason || '' );
	if ( clickTablet.clicked ) {
		await page.waitForTimeout( 500 ); // canvas iframe reflow + React re-render
		const deviceAfter = await page.evaluate( READ_DEVICE_TYPE );
		results.record(
			editorLabel,
			"Tablet click drives getDeviceType() to 'Tablet'",
			deviceAfter === 'Tablet',
			`was ${ deviceBefore }, now ${ deviceAfter }`
		);

		const widthAfter = await getCanvasIframeWidth( page );
		results.record(
			editorLabel,
			'Tablet click resizes the canvas iframe',
			widthAfter !== null && widthBefore !== null && widthAfter !== widthBefore,
			`was ${ widthBefore }px, now ${ widthAfter }px`
		);

		const cueOnTablet = await page.evaluate( CUE_PRESENT );
		results.record( editorLabel, 'Cue appears off Desktop', cueOnTablet === true, cueOnTablet ? '' : '.sgs-device-cue not found/visible in the footer' );

		const clickDesktop = await page.evaluate( CLICK_DEVICE_OPTION, 'Desktop' );
		if ( clickDesktop.clicked ) {
			await page.waitForTimeout( 500 );
			const cueOnDesktop = await page.evaluate( CUE_PRESENT );
			results.record( editorLabel, 'Cue clears back on Desktop', cueOnDesktop === false, cueOnDesktop ? '.sgs-device-cue still present after switching back to Desktop' : '' );
		} else {
			results.record( editorLabel, 'Cue clears back on Desktop', false, 'could not click Desktop to switch back: ' + clickDesktop.reason );
		}
	} else {
		results.record( editorLabel, "Tablet click drives getDeviceType() to 'Tablet'", false, 'skipped — Tablet option not clickable' );
		results.record( editorLabel, 'Tablet click resizes the canvas iframe', false, 'skipped — Tablet option not clickable' );
		results.record( editorLabel, 'Cue appears off Desktop', false, 'skipped — Tablet option not clickable' );
		results.record( editorLabel, 'Cue clears back on Desktop', false, 'skipped — Tablet option not clickable' );
	}
}

/** Deletes (trashes) a page created by this run, via REST Basic auth. */
async function trashPage( creds, pageId ) {
	if ( ! pageId ) return;
	const auth = 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );
	const res = await fetch( `${ creds.url }/wp-json/wp/v2/pages/${ pageId }`, {
		method: 'DELETE',
		headers: { Authorization: auth },
	} );
	if ( ! res.ok ) {
		process.stderr.write( `[check-device-toggle] WARNING: failed to trash auto-draft page ${ pageId }: ${ res.status } ${ res.statusText } — clean it up manually.\n` );
	} else {
		process.stdout.write( `[check-device-toggle] Trashed auto-draft page ${ pageId }.\n` );
	}
}

async function main() {
	const creds = loadEnv();
	const browser = await chromium.launch( { headless: true } );
	const context = await browser.newContext( { viewport: { width: 1527, height: 900 } } );
	const results = makeResults();
	let draftPageId = null;

	// A dirty editor raises a beforeunload confirm dialog on navigation away.
	// We never save, so every page we open is "dirty" by the time we leave it.
	// Auto-accept every dialog for the life of this context so navigation
	// never hangs.
	context.on( 'page', ( p ) => {
		p.on( 'dialog', ( dialog ) => dialog.accept().catch( () => {} ) );
	} );

	try {
		const page = await context.newPage();
		page.on( 'dialog', ( dialog ) => dialog.accept().catch( () => {} ) );

		await login( page, creds );

		// --- Post editor -----------------------------------------------------
		await page.goto( `${ creds.url }/wp-admin/post-new.php?post_type=page`, {
			waitUntil: 'domcontentloaded',
			timeout: 45000,
		} );
		// Wait for the block-editor React app to mount before touching wp.data.
		await page.waitForFunction( () => !! ( window.wp && window.wp.data && window.wp.data.select( 'core/block-editor' ) ), { timeout: 30000 } );
		await page.waitForTimeout( 500 );

		draftPageId = await page.evaluate( () => {
			try {
				return window.wp.data.select( 'core/editor' ).getCurrentPostId();
			} catch ( e ) {
				return null;
			}
		} );

		await runEditorSuite( page, 'Post editor', results );

		// --- Site editor -------------------------------------------------------
		await page.goto( `${ creds.url }/wp-admin/site-editor.php?canvas=edit`, {
			waitUntil: 'domcontentloaded',
			timeout: 45000,
		} );
		await page.waitForFunction( () => !! ( window.wp && window.wp.data && window.wp.data.select( 'core/block-editor' ) ), { timeout: 30000 } );
		await page.waitForTimeout( 800 );

		await runEditorSuite( page, 'Site editor', results );
	} finally {
		await context.close();
		await browser.close();
		if ( draftPageId ) {
			await trashPage( creds, draftPageId ).catch( ( e ) =>
				process.stderr.write( `[check-device-toggle] cleanup error: ${ e.message }\n` )
			);
		}
	}

	const anyFail = printReport( results );
	// Set exitCode rather than calling process.exit() here — see the matching
	// comment in selfTest(). Chromium's teardown still has async handles
	// unwinding immediately after browser.close()/context.close() resolve on
	// Windows; a forced process.exit() in that window can throw
	// UV_HANDLE_CLOSING and corrupt the exit code a --check gate depends on.
	process.exitCode = CHECK_MODE && anyFail ? 1 : 0;
}

// ---------------------------------------------------------------------------
if ( SELF_TEST ) {
	selfTest();
} else {
	main().catch( ( e ) => {
		process.stderr.write( `[check-device-toggle] FATAL: ${ e.stack || e.message }\n` );
		process.exitCode = CHECK_MODE ? 1 : 2;
	} );
}

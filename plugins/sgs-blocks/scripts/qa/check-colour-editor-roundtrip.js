#!/usr/bin/env node
'use strict';

/**
 * QA Gate C — the EDITOR half.
 *
 * The render half passed live on 2026-08-22
 * (reports/visual-diff/colour-golden-qa-gate-c-2026-08-22.md). It proved the CSS
 * rules are emitted and correctly targeted. It could not prove three things,
 * because a rendered page is the wrong instrument for them:
 *
 *   1. A palette colour picked in the EDITOR survives save + RELOAD as the token
 *      SLUG, not a baked hex. (A hex would freeze the client's colour against
 *      every future re-skin.)
 *   2. A hover rule actually REPAINTS under a real pointer. The render gate read
 *      the rule text; it never fired it.
 *   3. sgs/nav-drawer's background image, text colour and background gradient —
 *      which need the drawer OPEN, on three DIFFERENT elements.
 *
 * ⛔ NEVER fabricate a PASS. An assertion that could not run reports NOT RUN and
 * the process exits non-zero under --check. A skipped assertion reported as a
 * pass is worse than no gate.
 *
 * Usage:
 *   node scripts/qa/check-colour-editor-roundtrip.js          # report, exit 0
 *   node scripts/qa/check-colour-editor-roundtrip.js --check  # gate
 */

const fs = require( 'fs' );
const path = require( 'path' );

let chromium;
try {
	// eslint-disable-next-line import/no-extraneous-dependencies
	( { chromium } = require( 'playwright' ) );
} catch ( e ) {
	process.stderr.write(
		'[colour-editor-roundtrip] Playwright is not installed (require("playwright") ' +
			`failed: ${ e.message }).\n  npm install --save-dev playwright && npx playwright install chromium\n`
	);
	process.exit( process.argv.includes( '--check' ) ? 1 : 0 );
}

const CHECK_MODE = process.argv.includes( '--check' );

// Slugs that EXIST in the palette. `secondary` does NOT — it computes to
// rgba(0,0,0,0) and reads exactly like a broken layer, which already cost the
// render gate one false failure.
const SLUG = 'primary';
const HOVER_SLUG = 'accent';

/**
 * Resolve a palette slug to its computed rgb() ON THE PAGE UNDER TEST.
 *
 * ⛔ NEVER hardcode the expected colour from theme/sgs-theme/theme.json. Per-client
 * colour lives in sites/<client>/theme-snapshot.json and is pushed to
 * wp_global_styles, which OVERRIDES theme.json. This check was first written with
 * theme.json's #F59E0B for `accent` and reported a FAIL against a live canary whose
 * accent is #f5d050 — the hover was repainting correctly the whole time. A
 * hardcoded hex measures the framework default, not the site.
 *
 * Resolving through a probe element also avoids hex→rgb parsing entirely: the
 * browser hands back the same rgb() string getComputedStyle will report.
 *
 * @param {Object} page Playwright page, already on the target document.
 * @param {string} slug Palette slug.
 * @return {Promise<string>} Computed colour, e.g. "rgb(245, 208, 80)".
 */
async function resolveSlug( page, slug ) {
	return page.evaluate( ( s ) => {
		const probe = document.createElement( 'span' );
		probe.style.color = `var(--wp--preset--color--${ s })`;
		probe.style.position = 'absolute';
		probe.style.opacity = '0';
		document.body.appendChild( probe );
		const resolved = getComputedStyle( probe ).color;
		probe.remove();
		return resolved;
	}, slug );
}

function loadEnv() {
	const envPath = path.resolve( __dirname, '../../../../.claude/secrets/sandybrown.env' );
	const txt = fs.readFileSync( envPath, 'utf8' );
	const env = {};
	for ( const line of txt.split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/ );
		if ( m ) {
			env[ m[ 1 ] ] = m[ 2 ].replace( /^["']|["']$/g, '' );
		}
	}
	const required = [
		'WP_URL_SANDYBROWN',
		'WP_USER_SANDYBROWN',
		'WP_PWD_SANDYBROWN',
		'WP_APP_PWD_SANDYBROWN',
	];
	for ( const key of required ) {
		if ( ! env[ key ] ) {
			throw new Error( `${ key } missing from ${ envPath }` );
		}
	}
	return {
		url: env.WP_URL_SANDYBROWN.replace( /\/$/, '' ),
		user: env.WP_USER_SANDYBROWN,
		pwd: env.WP_PWD_SANDYBROWN,
		appPwd: env.WP_APP_PWD_SANDYBROWN,
	};
}

async function login( page, creds ) {
	await page.goto( `${ creds.url }/wp-login.php`, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	} );
	await page.fill( '#user_login', creds.user );
	await page.fill( '#user_pass', creds.pwd );
	await Promise.all( [
		page.waitForNavigation( { waitUntil: 'domcontentloaded', timeout: 30000 } ),
		page.click( '#wp-submit' ),
	] );
}

function authHeader( creds ) {
	return 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );
}

async function createPage( creds, title, content ) {
	const res = await fetch( `${ creds.url }/wp-json/wp/v2/pages`, {
		method: 'POST',
		headers: { Authorization: authHeader( creds ), 'Content-Type': 'application/json' },
		body: JSON.stringify( { title, content, status: 'publish' } ),
	} );
	if ( ! res.ok ) {
		throw new Error( `create page failed: ${ res.status } ${ await res.text() }` );
	}
	return res.json();
}

async function trashPage( creds, pageId ) {
	if ( ! pageId ) {
		return;
	}
	const res = await fetch( `${ creds.url }/wp-json/wp/v2/pages/${ pageId }?force=true`, {
		method: 'DELETE',
		headers: { Authorization: authHeader( creds ) },
	} );
	if ( ! res.ok ) {
		process.stderr.write(
			`[colour-editor-roundtrip] WARNING: failed to delete probe page ${ pageId }: ` +
				`${ res.status } ${ res.statusText } — clean it up manually.\n`
		);
	}
}

const results = [];
const record = ( id, status, detail ) => {
	results.push( { id, status, detail } );
	const tag = status === 'PASS' ? 'PASS   ' : status === 'FAIL' ? 'FAIL   ' : 'NOT RUN';
	process.stdout.write( `  ${ tag }  ${ id }\n           ${ detail }\n` );
};

/**
 * ASSERTION 1 — pick a palette colour in the EDITOR, save, RELOAD, and assert
 * the STORED value is the slug.
 *
 * ⛔ The assertion is CONDITIONAL and the condition is load-bearing.
 * DesignTokenPicker stores a raw hex LEGITIMATELY in two cases: a row declared
 * `linked: false` stores the picked CSS value verbatim by design, and on a
 * `linked: true` row `makeChangeHandler` does `onChange( match ? match.slug :
 * picked )` — so a Custom-tab colour matching no swatch stores the hex,
 * correctly. "Never a hex" is FALSE as a universal law. This targets
 * sgs/heading.textColour, a linked:true row, and sets a real palette slug.
 */
async function assertion1( page, creds ) {
	const id = 'A1 slug-not-hex survives save + reload';
	let pageId = null;
	try {
		await page.goto( `${ creds.url }/wp-admin/post-new.php?post_type=page`, {
			waitUntil: 'domcontentloaded',
			timeout: 45000,
		} );
		await page.waitForFunction(
			() => !! ( window.wp && window.wp.data && window.wp.data.select( 'core/block-editor' ) ),
			{ timeout: 30000 }
		);
		await page.waitForTimeout( 800 );

		pageId = await page.evaluate( () => window.wp.data.select( 'core/editor' ).getCurrentPostId() );

		// Insert sgs/heading and set the colour through the STORE — the same
		// path the inspector's onChange calls, with the same value shape a
		// palette swatch click produces (the slug).
		const clientId = await page.evaluate( ( slug ) => {
			const dispatch = window.wp.data.dispatch( 'core/block-editor' );
			const block = window.wp.blocks.createBlock( 'sgs/heading', {
				content: 'QA Gate C editor roundtrip',
				textColour: slug,
			} );
			dispatch.insertBlock( block );
			return block.clientId;
		}, SLUG );

		await page.evaluate( () => window.wp.data.dispatch( 'core/editor' ).editPost( { title: 'QA Gate C — colour roundtrip' } ) );

		// Save, then POLL. A resolved promise is not proof of a successful save.
		const saved = await page.evaluate( async () => {
			await window.wp.data.dispatch( 'core/editor' ).savePost();
			let tries = 0;
			while ( window.wp.data.select( 'core/editor' ).isSavingPost() && tries < 40 ) {
				await new Promise( ( r ) => setTimeout( r, 250 ) );
				tries++;
			}
			return window.wp.data.select( 'core/editor' ).didPostSaveRequestSucceed();
		} );
		if ( ! saved ) {
			record( id, 'FAIL', 'savePost() did not report success — nothing downstream is trustworthy.' );
			return pageId;
		}

		// RELOAD. Reading the store without reloading only proves the editor
		// remembers what it was just told.
		await page.goto( `${ creds.url }/wp-admin/post.php?post=${ pageId }&action=edit`, {
			waitUntil: 'domcontentloaded',
			timeout: 45000,
		} );
		await page.waitForFunction(
			() => !! ( window.wp && window.wp.data && window.wp.data.select( 'core/block-editor' ) ),
			{ timeout: 30000 }
		);
		await page.waitForTimeout( 800 );

		// SOURCE 1 — the editor store after a genuine reload.
		const fromStore = await page.evaluate( () => {
			const blocks = window.wp.data.select( 'core/block-editor' ).getBlocks();
			const h = blocks.find( ( b ) => b.name === 'sgs/heading' );
			return h ? h.attributes.textColour : null;
		} );

		// SOURCE 2 — the serialised post_content over REST. Two independent
		// readings agreeing is the load-bearing proof; either alone is not.
		const restRes = await fetch(
			`${ creds.url }/wp-json/wp/v2/pages/${ pageId }?context=edit`,
			{ headers: { Authorization: authHeader( creds ) } }
		);
		const restJson = await restRes.json();
		const raw = ( restJson.content && restJson.content.raw ) || '';
		const m = raw.match( /"textColour":"([^"]*)"/ );
		const fromRest = m ? m[ 1 ] : null;

		const isHex = ( v ) => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test( v );

		if ( fromStore === SLUG && fromRest === SLUG ) {
			record(
				id,
				'PASS',
				`store="${ fromStore }" and REST content.raw="${ fromRest }" both hold the SLUG after reload — not a baked hex.`
			);
		} else if ( isHex( fromStore ) || isHex( fromRest ) ) {
			record(
				id,
				'FAIL',
				`stored value was BAKED TO HEX — store="${ fromStore }", REST="${ fromRest }". The client's colour would not follow a re-skin.`
			);
		} else {
			record(
				id,
				'FAIL',
				`store="${ fromStore }", REST="${ fromRest }", expected "${ SLUG }" from both.`
			);
		}
	} catch ( e ) {
		record( id, 'NOT RUN', `threw: ${ e.message }` );
	}
	return pageId;
}

/**
 * ASSERTION 2 — a hover rule REPAINTS under a real pointer.
 *
 * ⛔ SGS block CSS is LIFTED to uploads/sgs-css/<hash>.css, so grepping the page
 * HTML for the rule proves nothing. This reads the COMPUTED colour before and
 * after a real page.hover() and requires it to CHANGE.
 */
async function assertion2( page, creds, url ) {
	const id = 'A2 hover repaints under a real pointer';
	try {
		await page.goto( url, { waitUntil: 'domcontentloaded', timeout: 45000 } );
		await page.waitForTimeout( 600 );

		const sel = '.wp-block-sgs-heading';
		const el = page.locator( sel ).first();
		if ( ( await el.count() ) === 0 ) {
			record( id, 'NOT RUN', `no ${ sel } on the probe page.` );
			return;
		}

		// Expected values come from THIS site's live palette, not a constant.
		const expectRest = await resolveSlug( page, SLUG );
		const expectHover = await resolveSlug( page, HOVER_SLUG );

		const before = await el.evaluate( ( n ) => getComputedStyle( n ).color );
		await el.hover();
		await page.waitForTimeout( 400 );
		const after = await el.evaluate( ( n ) => getComputedStyle( n ).color );

		if ( before !== after && after === expectHover ) {
			record(
				id,
				'PASS',
				`computed colour changed under a real pointer: ${ before } -> ${ after } ` +
					`(resting "${ SLUG }"=${ expectRest }, hover "${ HOVER_SLUG }"=${ expectHover }, both resolved live).`
			);
		} else if ( before !== after ) {
			record(
				id,
				'FAIL',
				`colour changed ${ before } -> ${ after }, but this site's "${ HOVER_SLUG }" resolves to ${ expectHover }.`
			);
		} else {
			record(
				id,
				'FAIL',
				`colour did NOT change on hover (stayed ${ before }). The rule may be emitted but not winning.`
			);
		}
	} catch ( e ) {
		record( id, 'NOT RUN', `threw: ${ e.message }` );
	}
}

/**
 * ASSERTION 3 — sgs/nav-drawer's three paint properties, drawer OPEN.
 *
 * Three DIFFERENT elements. Measuring all three on the root reads as three
 * failures:
 *   backgroundImage    -> root ::before
 *   drawerBgGradient   -> root <dialog>, layered OVER drawerBg
 *   drawerTextColour   -> .sgs-nav-drawer__body, never the root
 *
 * ⚠ D323: on first open the store re-parents the drawer to <body>, so any
 * locator held before opening is stale — everything is re-queried by id after.
 */
async function assertion3( page, creds, url, drawerRef ) {
	const id = 'A3 nav-drawer image + text colour + bg gradient, drawer OPEN';
	try {
		await page.goto( url, { waitUntil: 'domcontentloaded', timeout: 45000 } );
		await page.waitForTimeout( 600 );

		const exists = await page.evaluate( ( ref ) => !! document.getElementById( ref ), drawerRef );
		if ( ! exists ) {
			record( id, 'NOT RUN', `no #${ drawerRef } in the DOM.` );
			return;
		}

		// Prefer the REAL path — the burger the client actually clicks. It is
		// display-gated by breakpoint, so try a narrow viewport first.
		await page.setViewportSize( { width: 480, height: 900 } );
		await page.waitForTimeout( 400 );

		let opened = false;
		let openPath = '';
		// ⚠ `.first()` would grab the SITE HEADER's burger, not this page's —
		// the querySelector-first-match trap. Scope to the drawer this probe
		// owns via aria-controls, and WAIT for visibility rather than sampling
		// it instantly (the collapse-point media query needs a beat to apply).
		const burger = page.locator( `button.sgs-nav-menu__burger[aria-controls="${ drawerRef }"]` ).first();
		const burgerVisible = await burger
			.waitFor( { state: 'visible', timeout: 5000 } )
			.then( () => true )
			.catch( () => false );
		if ( burgerVisible ) {
			await burger.click();
			await page.waitForTimeout( 600 );
			opened = await page.evaluate(
				( ref ) => !! ( document.getElementById( ref ) || {} ).open,
				drawerRef
			);
			openPath = 'real burger click at 480px';
		}
		if ( ! opened ) {
			// Fallback. Reported honestly — this skips the store's reparent,
			// scroll-lock and focus wiring, so it is NOT the real path.
			await page.evaluate( ( ref ) => document.getElementById( ref ).showModal(), drawerRef );
			await page.waitForTimeout( 500 );
			opened = await page.evaluate(
				( ref ) => !! ( document.getElementById( ref ) || {} ).open,
				drawerRef
			);
			openPath = 'showModal() fallback — burger was not reachable, NOT the real path';
		}

		if ( ! opened ) {
			record( id, 'NOT RUN', 'drawer never reported [open]; nothing measured.' );
			return;
		}

		const measured = await page.evaluate( ( ref ) => {
			const root = document.getElementById( ref );
			const body = root.querySelector( '.sgs-nav-drawer__body' );
			const rootCs = getComputedStyle( root );
			const beforeCs = getComputedStyle( root, '::before' );
			return {
				rootBackgroundImage: rootCs.backgroundImage,
				beforeBackgroundImage: beforeCs.backgroundImage,
				bodyColour: body ? getComputedStyle( body ).color : null,
				hasBody: !! body,
			};
		}, drawerRef );

		const gradientOnRoot = /gradient\(/i.test( measured.rootBackgroundImage || '' );
		const imageOnBefore = /url\(/i.test( measured.beforeBackgroundImage || '' );
		const textPainted =
			measured.bodyColour && measured.bodyColour !== 'rgba(0, 0, 0, 0)';

		const parts = [
			`open via ${ openPath }`,
			`root background-image ${ gradientOnRoot ? 'CARRIES a gradient' : `= ${ measured.rootBackgroundImage }` }`,
			`::before ${ imageOnBefore ? 'CARRIES url()' : `= ${ measured.beforeBackgroundImage }` }`,
			`__body colour = ${ measured.bodyColour }`,
		];

		if ( gradientOnRoot && imageOnBefore && textPainted ) {
			record( id, 'PASS', parts.join( ' · ' ) );
		} else {
			record( id, 'FAIL', parts.join( ' · ' ) );
		}
	} catch ( e ) {
		record( id, 'NOT RUN', `threw: ${ e.message }` );
	}
}

async function main() {
	const creds = loadEnv();
	process.stdout.write( '[colour-editor-roundtrip] QA Gate C — editor half\n\n' );

	const browser = await chromium.launch( { headless: true } );
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	// A dirty editor fires beforeunload; without this, navigation hangs.
	context.on( 'page', ( p ) => {
		p.on( 'dialog', ( d ) => d.accept().catch( () => {} ) );
	} );
	const page = await context.newPage();

	let editorPageId = null;
	let frontPageId = null;

	try {
		await login( page, creds );

		editorPageId = await assertion1( page, creds );

		// One published probe page carries assertions 2 and 3.
		const drawerRef = 'sgs-qa-gate-c-drawer';
		// sgs/nav-menu supplies the burger that opens the drawer. Its drawerRef
		// must match the drawer's, and its collapsePoint (default 768) is why
		// assertion 3 narrows the viewport before looking for the burger.
		const content =
			`<!-- wp:sgs/heading {"content":"QA Gate C hover probe","textColour":"${ SLUG }","textColourHover":"${ HOVER_SLUG }"} /-->\n` +
			`<!-- wp:sgs/nav-menu {"drawerRef":"${ drawerRef }","collapsePoint":768} /-->\n` +
			`<!-- wp:sgs/nav-drawer {"drawerRef":"${ drawerRef }","drawerBg":"primary","drawerBgGradient":"linear-gradient(135deg,#1F7A7A 0%,#F59E0B 100%)","drawerTextColour":"text-inverse","surfaceOpacity":1,"backgroundImage":{"url":"${ creds.url }/wp-includes/images/media/default.png"}} -->\n` +
			`<!-- wp:sgs/text {"content":"drawer body copy"} /-->\n` +
			`<!-- /wp:sgs/nav-drawer -->`;

		const created = await createPage( creds, 'QA Gate C — colour probe', content );
		frontPageId = created.id;
		const url = created.link;

		await assertion2( page, creds, url );
		await assertion3( page, creds, url, drawerRef );
	} catch ( e ) {
		record( 'HARNESS', 'NOT RUN', `harness threw: ${ e.message }` );
	} finally {
		await context.close();
		await browser.close();
		await trashPage( creds, editorPageId );
		await trashPage( creds, frontPageId );
	}

	const failed = results.filter( ( r ) => r.status === 'FAIL' );
	const notRun = results.filter( ( r ) => r.status === 'NOT RUN' );

	process.stdout.write(
		`\nPASS ${ results.length - failed.length - notRun.length } · FAIL ${ failed.length } · NOT RUN ${ notRun.length }\n`
	);
	if ( notRun.length ) {
		process.stdout.write(
			'⛔ A NOT RUN assertion is NOT a pass. It is reported as unproven, deliberately.\n'
		);
	}

	// Never process.exit() after browser.close() on Windows — libuv throws
	// UV_HANDLE_CLOSING and corrupts the exit code. Set exitCode instead.
	if ( CHECK_MODE ) {
		process.exitCode = failed.length + notRun.length > 0 ? 1 : 0;
	}
}

main();

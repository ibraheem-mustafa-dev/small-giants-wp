/**
 * sweep-drawer-variants-selftest.mjs — negative controls for the drawer sweep.
 *
 * A sweep whose assertions cannot fail reads green forever. Every control here
 * runs one of the sweep's REAL decision functions (handed in as `targets`, so
 * this module never imports the script and never triggers its main()) against a
 * local fixture page. Fixtures are built in memory and loaded with
 * `page.setContent` or a `data:` URL; the end-to-end exit-code controls serve
 * the same fixtures from a loopback-only http server. Nothing leaves the machine.
 *
 * Rules every control obeys:
 *   - A NEGATIVE control injects exactly one defect and must be reported as a
 *     failure FOR THE RIGHT REASON (the `why` text is matched).
 *   - A NEGATIVE control first confirms its injected break actually landed in
 *     the fixture DOM (`landed: true`). Without that confirmation the control
 *     could be failing for an unrelated reason, or not testing anything at all,
 *     so an unconfirmed negative control is itself reported as FAIL.
 *   - A positive control proves the same assertion still passes clean input.
 */
'use strict';

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EXIT } from './openness-guard.mjs';

const LABELS = [ 'Home', 'Shop', 'Contact' ];
const PLAN_LABELS = LABELS.map( ( text ) => ( { text } ) );
const TAIL_ID = 'after';
// Headless Chromium hands Tab from the last control of a native modal to the
// browser chrome, leaving document.activeElement on <body>. A drawer that keeps
// focus contained wraps it explicitly, so the healthy fixture does the same.
const TRAP_JS = 'd.addEventListener("keydown",function(e){if(e.key!=="Tab"||e.shiftKey){return;}' +
	'var f=d.querySelectorAll("a[href],button:not([disabled])");' +
	'if(f.length&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus();}});';

/**
 * A minimal drawer page in the shape the sweep expects: a burger inside
 * `.entry-content > nav.sgs-nav-bar-menu` and a `dialog.sgs-nav-drawer`.
 *
 * click:  'modal' | 'show' | 'none' — how the burger opens the dialog.
 * escape: 'native' | 'blocked' | 'steal' — Esc closes / is cancelled / closes
 *         but moves focus to the link after the dialog instead of the burger.
 */
function fixture( o = {} ) {
	const {
		click = 'modal', escape = 'native', burger = true, burgerStyle = '', drawer = true,
		openAttr = '', dialogStyle = '', linkStyle = 'color:#000', labels = LABELS, inner = null, script = '', trap = true,
	} = o;
	const links = inner ?? `<nav aria-label="Drawer">${ labels.map( ( t, i ) =>
		`<a class="sgs-nav-drawer-menu__link" href="#l${ i }" style="${ linkStyle }">${ t }</a>` ).join( ' ' ) }</nav>`;
	const wire = [
		'var b=document.querySelector(".sgs-nav-bar-menu__burger"),d=document.querySelector("dialog");',
		click === 'none' ? '' : `if(b){b.addEventListener("click",function(){d.${ click === 'show' ? 'show' : 'showModal' }();});}`,
		escape === 'blocked' ? 'd.addEventListener("cancel",function(e){e.preventDefault();});' : '',
		escape === 'steal' ? `d.addEventListener("close",function(){document.getElementById("${ TAIL_ID }").focus();});` : '',
		trap ? TRAP_JS : '',
		script,
	].join( '' );
	return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Drawer fixture</title></head>' +
		'<body style="margin:0;background:#fff"><main class="entry-content">' +
		( burger ? `<nav class="sgs-nav-bar-menu" aria-label="Site"><button class="sgs-nav-bar-menu__burger" style="${ burgerStyle }">Menu</button></nav>` : '' ) +
		'</main>' +
		( drawer ? `<dialog class="sgs-nav-drawer" aria-label="Menu" ${ openAttr } style="width:300px;height:400px;${ dialogStyle }">${ links }</dialog>` : '' ) +
		`<a href="#tail" id="${ TAIL_ID }">After</a>` +
		( drawer ? `<script>${ wire }</script>` : '' ) +
		'</body></html>';
}

const dataUrl = ( html ) => `data:text/html;charset=utf-8,${ encodeURIComponent( html ) }`;
const DRAWER = 'dialog.sgs-nav-drawer';

/** PASS / FAIL / VACUOUS for a check result, FAIL demoted if its reason is wrong. */
function label( r, whyRe = null ) {
	if ( r.vacuous ) return 'VACUOUS';
	if ( r.ok ) return 'PASS';
	return whyRe && ! whyRe.test( r.why || '' ) ? `FAIL(unexpected reason: "${ r.why }")` : 'FAIL';
}

function runNode( args ) {
	return new Promise( ( resolve ) => {
		const child = spawn( process.execPath, args, { stdio: [ 'ignore', 'pipe', 'pipe' ] } );
		let out = '';
		let err = '';
		child.stdout.on( 'data', ( c ) => { out += c; } );
		child.stderr.on( 'data', ( c ) => { err += c; } );
		child.on( 'close', ( code ) => resolve( { code, out, err } ) );
	} );
}

/**
 * @param {Object} deps
 * @param {Object} deps.chromium    Playwright's chromium export.
 * @param {Object} deps.targets     The sweep's real decision functions.
 * @param {string} deps.scriptPath  Absolute path of sweep-drawer-variants.mjs.
 * @return {Promise<{ok: boolean, results: Array}>}
 */
export async function runDrawerSweepSelfTest( { chromium, targets: T, scriptPath } ) {
	const results = [];
	const browser = await chromium.launch( { headless: true } );

	/** Register one control. `fn` returns { actual, landed?, note? }. */
	async function control( name, expected, fn ) {
		let out;
		try { out = await fn(); } catch ( e ) { out = { actual: `threw: ${ e.message }` }; }
		const negative = name.startsWith( 'NEGATIVE' );
		const landedOk = ! negative || out.landed === true;
		results.push( {
			name,
			expected,
			actual: out.actual,
			ok: landedOk && out.actual === expected,
			reason: landedOk ? ( out.note || '' ) : 'the injected break was not confirmed in the fixture DOM — control is vacuous',
		} );
	}

	async function inPage( html, fn, { width = 1440 } = {} ) {
		const context = await browser.newContext( { viewport: { width, height: 900 } } );
		const page = await context.newPage();
		try {
			await page.setContent( html );
			return await fn( page );
		} finally {
			await context.close();
		}
	}
	const opened = async ( page ) => { await T.openDrawer( page ); await page.mouse.move( 2, 2 ); };
	/** Raw facts about the drawer, read independently of the sweep's own measurements. */
	const state = ( page ) => page.evaluate( ( sel ) => {
		const d = document.querySelector( sel );
		if ( ! d ) return null;
		const cs = getComputedStyle( d );
		return {
			open: d.open, modal: d.matches( ':modal' ), width: d.getBoundingClientRect().width,
			opacity: cs.opacity, transform: cs.transform, links: d.querySelectorAll( 'a[href],button' ).length,
		};
	}, DRAWER );
	const tryOpen = async ( page ) => {
		try { await T.openDrawer( page ); return { ok: true }; } catch ( e ) { return { ok: false, vacuous: Boolean( e.vacuous ), why: e.message }; }
	};
	const openedState = ( r ) => ( r.ok ? 'PASS' : label( r ) );

	try {
		// ---- openDrawer: every pre- and post-click vacuity path ----------------
		await control( 'openDrawer: burger present, click opens the modal → PASS', 'PASS', () =>
			inPage( fixture(), async ( p ) => ( { actual: openedState( await tryOpen( p ) ) } ) ) );
		await control( 'NEGATIVE openDrawer: burger absent must be VACUOUS', 'VACUOUS', () =>
			inPage( fixture( { burger: false } ), async ( p ) => {
				const r = await tryOpen( p );
				return { actual: /matched 0/.test( r.why || '' ) ? openedState( r ) : `wrong reason: ${ r.why }`,
					landed: await p.locator( '.sgs-nav-bar-menu__burger' ).count() === 0 };
			} ) );
		await control( 'NEGATIVE openDrawer: burger hidden must be VACUOUS', 'VACUOUS', () =>
			inPage( fixture( { burgerStyle: 'display:none' } ), async ( p ) => {
				const r = await tryOpen( p );
				return { actual: /not visible/.test( r.why || '' ) ? openedState( r ) : `wrong reason: ${ r.why }`,
					landed: await p.locator( '.sgs-nav-bar-menu__burger' ).count() === 1 && ! await p.locator( '.sgs-nav-bar-menu__burger' ).isVisible() };
			} ) );
		await control( 'NEGATIVE openDrawer: click that opens nothing must be VACUOUS, not a pass', 'VACUOUS', () =>
			inPage( fixture( { click: 'none' } ), async ( p ) => {
				const r = await tryOpen( p );
				return { actual: /did not open/.test( r.why || '' ) ? openedState( r ) : `wrong reason: ${ r.why }`,
					landed: ( await state( p ) ).open === false && await p.locator( '.sgs-nav-bar-menu__burger' ).isVisible() };
			} ) );

		// ---- measureGeometry: absent / not-open / zero-size --------------------
		await control( 'measureGeometry: open drawer with links → PASS', 'PASS', () =>
			inPage( fixture(), async ( p ) => {
				await opened( p );
				const r = await T.measureGeometry( p );
				return { actual: r.ok && r.navLinkCount === LABELS.length && r.focusables === LABELS.length ? 'PASS' : 'FAIL' };
			} ) );
		await control( 'NEGATIVE measureGeometry: drawer element absent must FAIL', 'FAIL', () =>
			inPage( fixture( { drawer: false } ), async ( p ) => {
				const r = await T.measureGeometry( p );
				return { actual: label( r, /absent/ ), landed: await p.locator( DRAWER ).count() === 0 };
			} ) );
		await control( 'NEGATIVE measureGeometry: rendered but not [open] must FAIL', 'FAIL', () =>
			inPage( fixture( { dialogStyle: 'display:block' } ), async ( p ) => {
				const r = await T.measureGeometry( p );
				return { actual: label( r, /not open/ ),
					landed: ( await state( p ) ).open === false && ( await state( p ) ).width > 0 };
			} ) );
		await control( 'NEGATIVE measureGeometry: open but zero-size must FAIL', 'FAIL', () =>
			inPage( fixture( { openAttr: 'open', dialogStyle: 'width:0;height:0;padding:0;border:0' } ), async ( p ) => {
				const r = await T.measureGeometry( p );
				return { actual: label( r ),
					landed: ( await state( p ) ).open === true && ( await state( p ) ).width === 0 };
			} ) );

		// ---- checkKeyboard: ESC closes AND focus returns -----------------------
		await control( 'checkKeyboard: Esc closes and focus returns to the burger → PASS', 'PASS', () =>
			inPage( fixture(), async ( p ) => { await opened( p ); return { actual: label( await T.checkKeyboard( p ) ) }; } ) );
		await control( 'NEGATIVE checkKeyboard: Esc cancelled (dialog stays open) must FAIL', 'FAIL', () =>
			inPage( fixture( { escape: 'blocked' } ), async ( p ) => {
				await opened( p );
				const r = await T.checkKeyboard( p );
				return { actual: label( r, /ESC did not close/ ), landed: ( await state( p ) ).open === true };
			} ) );
		await control( 'NEGATIVE checkKeyboard: closes but focus goes elsewhere must FAIL', 'FAIL', () =>
			inPage( fixture( { escape: 'steal' } ), async ( p ) => {
				await opened( p );
				const r = await T.checkKeyboard( p );
				return { actual: label( r, /focus went to/ ),
					landed: r.closed === true && await p.evaluate( ( id ) => document.activeElement?.id === id, TAIL_ID ) };
			} ) );

		// ---- checkFocusContainment ---------------------------------------------
		await control( 'checkFocusContainment: modal dialog holds Tab inside → PASS', 'PASS', () =>
			inPage( fixture(), async ( p ) => { await opened( p ); return { actual: label( await T.checkFocusContainment( p ) ) }; } ) );
		await control( 'NEGATIVE checkFocusContainment: non-modal drawer lets Tab escape, must FAIL', 'FAIL', () =>
			inPage( fixture( { click: 'show', trap: false } ), async ( p ) => {
				await opened( p );
				const st = await state( p );
				const landed = st.open === true && st.modal === false;
				return { actual: label( await T.checkFocusContainment( p ), /escaped/ ), landed };
			} ) );
		await control( 'NEGATIVE checkFocusContainment: nothing focusable to seed must be VACUOUS', 'VACUOUS', () =>
			inPage( fixture( { inner: '<p>Only text</p>' } ), async ( p ) => {
				await p.evaluate( ( sel ) => document.querySelector( sel ).showModal(), DRAWER );
				return { actual: label( await T.checkFocusContainment( p ) ),
					landed: ( await state( p ) ).open === true && ( await state( p ) ).links === 0 };
			} ) );
		await control( 'NEGATIVE checkFocusContainment: drawer never opened must be VACUOUS', 'VACUOUS', () =>
			inPage( fixture(), async ( p ) => ( { actual: label( await T.checkFocusContainment( p ) ), landed: ( await state( p ) ).open === false } ) ) );

		// ---- checkReducedMotion: full end state, immediately -------------------
		const reduced = async ( html ) => {
			const context = await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' } );
			try {
				const page = await context.newPage();
				await page.setContent( html );
				await T.openDrawer( page ).catch( () => null );
				return await state( page );
			} finally { await context.close(); }
		};
		await control( 'checkReducedMotion: full opacity, no transform → PASS', 'PASS', async () =>
			( { actual: label( await T.checkReducedMotion( browser, dataUrl( fixture() ), 1440 ) ) } ) );
		await control( 'NEGATIVE checkReducedMotion: panel left semi-transparent must FAIL', 'FAIL', async () => {
			const html = fixture( { dialogStyle: 'opacity:0.5' } );
			const s = await reduced( html );
			return { actual: label( await T.checkReducedMotion( browser, dataUrl( html ), 1440 ), /opacity is 0\.5/ ),
				landed: s.open === true && s.opacity === '0.5' };
		} );
		await control( 'NEGATIVE checkReducedMotion: panel left offset must FAIL', 'FAIL', async () => {
			const html = fixture( { dialogStyle: 'transform:translateX(100px)' } );
			const s = await reduced( html );
			return { actual: label( await T.checkReducedMotion( browser, dataUrl( html ), 1440 ), /still transformed/ ),
				landed: s.open === true && s.transform !== 'none' };
		} );
		await control( 'NEGATIVE checkReducedMotion: drawer that never opens must not PASS', 'FAIL', async () => {
			const html = fixture( { click: 'none' } );
			return { actual: label( await T.checkReducedMotion( browser, dataUrl( html ), 1440 ), /threw/ ),
				landed: ( await reduced( html ) ).open === false };
		} );

		// ---- checkNoJs: labels present in the JS-off HTML ----------------------
		const labelsFor = ( names ) => names.map( ( text ) => ( { text } ) );
		await control( 'checkNoJs: every label in static HTML, incl. an HTML-encoded "&" → PASS', 'PASS', async () => {
			const html = fixture( { labels: [ 'Home', 'Arts &amp; Culture' ] } );
			return { actual: label( await T.checkNoJs( browser, dataUrl( html ), labelsFor( [ 'Home', 'Arts & Culture' ] ) ) ) };
		} );
		await control( 'NEGATIVE checkNoJs: a label injected only by script must FAIL', 'FAIL', async () => {
			const html = fixture( { labels: [ 'Home' ],
				script: 'var a=document.createElement("a");a.href="#j";a.textContent="JsOnly"+"Label";document.querySelector("nav[aria-label=Drawer]").appendChild(a);' } );
			const r = await T.checkNoJs( browser, dataUrl( html ), labelsFor( [ 'Home', 'JsOnlyLabel' ] ) );
			const withJs = await inPage( html, ( p ) => p.content() );
			return { actual: label( r, /absent without JS: JsOnlyLabel/ ),
				landed: ! html.includes( 'JsOnlyLabel' ) && withJs.includes( 'JsOnlyLabel' ) };
		} );

		// ---- checkRestContrast: per-element, own background, large-text rule ----
		const contrast = async ( html, accepted = [] ) => inPage( html, async ( p ) => {
			await opened( p );
			const r = await T.checkRestContrast( p, accepted );
			const first = await p.evaluate( ( sel ) => {
				const a = document.querySelector( `${ sel } a` );
				const cs = getComputedStyle( a );
				return { colour: cs.color, size: cs.fontSize };
			}, DRAWER );
			return { r, first };
		} );
		const grey = 'color:#808080';
		await control( 'checkRestContrast: black text on white → PASS', 'PASS', async () =>
			( { actual: label( ( await contrast( fixture() ) ).r ) } ) );
		await control( 'NEGATIVE checkRestContrast: 1:1 text (invisible) must FAIL', 'FAIL', async () => {
			const { r, first } = await contrast( fixture( { linkStyle: 'color:#fff' } ) );
			return { actual: label( r, /1:1/ ), landed: first.colour === 'rgb(255, 255, 255)' };
		} );
		await control( 'NEGATIVE checkRestContrast: 3.95:1 body text must FAIL against the 4.5:1 threshold', 'FAIL', async () => {
			const { r, first } = await contrast( fixture( { linkStyle: `${ grey };font-size:16px` } ) );
			return { actual: label( r, /needs 4\.5:1/ ), landed: first.colour === 'rgb(128, 128, 128)' && first.size === '16px' };
		} );
		await control( 'checkRestContrast: same 3.95:1 at 24px passes the large-text 3:1 threshold → PASS', 'PASS', async () =>
			( { actual: label( ( await contrast( fixture( { linkStyle: `${ grey };font-size:24px` } ) ) ).r ) } ) );
		const nested = ( c ) => `<nav aria-label="Drawer"><a href="#x" style="color:#000">Home</a><div class="card" style="background:#000"><p style="color:${ c };margin:0">Card</p></div></nav>`;
		await control( 'checkRestContrast: white text on a black nested card → PASS (own background, not the panel)', 'PASS', async () =>
			( { actual: label( ( await contrast( fixture( { inner: nested( '#fff' ) } ) ) ).r ) } ) );
		await control( 'NEGATIVE checkRestContrast: black text on a black nested card must FAIL', 'FAIL', async () => {
			const html = fixture( { inner: nested( '#000' ) } );
			const { r } = await contrast( html );
			const landed = await inPage( html, ( p ) => p.evaluate( () => {
				const c = document.querySelector( '.card' );
				const cs = getComputedStyle( c.querySelector( 'p' ) );
				return cs.color === getComputedStyle( c ).backgroundColor && getComputedStyle( document.querySelector( 'dialog' ) ).backgroundColor === 'rgb(255, 255, 255)';
			} ) );
			return { actual: label( r, /Card/ ), landed };
		} );
		await control( 'checkRestContrast: an owner-accepted failing pair passes the verdict AND stays reported', 'PASS+REPORTED', async () => {
			const { r } = await contrast( fixture( { linkStyle: `${ grey };font-size:16px` } ), [ 'rgb(128,128,128)-on-rgb(255,255,255)' ] );
			return { actual: r.ok && r.failing.length === 0 && r.acceptedFailures.length === LABELS.length ? 'PASS+REPORTED' : `ok=${ r.ok } accepted=${ r.acceptedFailures?.length }` };
		} );
		await control( 'NEGATIVE checkRestContrast: drawer not open must be VACUOUS', 'VACUOUS', () =>
			inPage( fixture(), async ( p ) => ( { actual: label( await T.checkRestContrast( p, [] ) ), landed: ( await state( p ) ).open === false } ) ) );

		// ---- axe leg: how axe-run.mjs outcomes are read -------------------------
		const violation = { id: 'label', impact: 'critical', nodes: [ {} ] };
		const axeJson = ( v ) => JSON.stringify( { guard: { status: 'PASS' }, violations: v } );
		await control( 'axe: zero violations → PASS', 'PASS', async () => ( { actual: label( T.interpretAxeSuccess( axeJson( [] ) ) ) } ) );
		await control( 'NEGATIVE axe: a violation in a zero-exit payload must FAIL', 'FAIL', async () => {
			const stdout = axeJson( [ violation ] );
			return { actual: label( T.interpretAxeSuccess( stdout ), /label \(critical\)/ ), landed: JSON.parse( stdout ).violations.length === 1 };
		} );
		await control( 'NEGATIVE axe: exit 1 with violations must FAIL, not VACUOUS', 'FAIL', async () => {
			const e = { status: 1, stdout: axeJson( [ violation ] ) };
			return { actual: label( T.interpretAxeError( e ), /label \(critical\)/ ), landed: e.status === 1 };
		} );
		await control( 'NEGATIVE axe: exit 3 (guard says closed) must be VACUOUS', 'VACUOUS', async () => {
			const e = { status: 3, stdout: JSON.stringify( { guard: { status: 'VACUOUS', reason: 'closed' } } ) };
			return { actual: label( T.interpretAxeError( e ) ), landed: e.status === 3 };
		} );
		await control( 'NEGATIVE axe: exit 2 (runner crashed) must FAIL', 'FAIL', async () => {
			const e = { status: 2, stdout: '', stderr: 'boom', message: 'boom' };
			return { actual: label( T.interpretAxeError( e ), /axe run failed \(exit 2\)/ ), landed: e.status === 2 };
		} );

		// ---- cell verdict + exit-code decision ----------------------------------
		const ok = { ok: true };
		await control( 'classifyCell: all checks ok → PASS', 'PASS', async () => ( { actual: T.classifyCell( { checks: { a: ok, b: ok } } ).verdict } ) );
		await control( 'NEGATIVE classifyCell: one failed check must be FAIL', 'FAIL', async () => {
			const cell = { checks: { a: ok, b: { ok: false, why: 'x' } } };
			return { actual: T.classifyCell( cell ).verdict, landed: cell.checks.b.ok === false };
		} );
		await control( 'NEGATIVE classifyCell: a vacuous check outranks a failure → VACUOUS', 'VACUOUS', async () => {
			const cell = { checks: { a: { ok: false, why: 'x' }, b: { ok: false, vacuous: true } } };
			return { actual: T.classifyCell( cell ).verdict, landed: cell.checks.a.ok === false && cell.checks.b.vacuous === true };
		} );
		await control( 'NEGATIVE classifyCell: a cell already flagged vacuous stays VACUOUS with clean checks', 'VACUOUS', async () => {
			const cell = { vacuous: true, checks: { a: ok } };
			return { actual: T.classifyCell( cell ).verdict, landed: cell.vacuous === true && cell.checks.a.vacuous === undefined };
		} );
		const codes = [ [ 0, 0, EXIT.OK ], [ 2, 0, EXIT.FAILURES ], [ 0, 1, EXIT.VACUOUS ], [ 2, 1, EXIT.VACUOUS ] ];
		for ( const [ fails, vac, want ] of codes ) {
			const name = `${ want === EXIT.OK ? '' : 'NEGATIVE ' }exitCodeFor: ${ fails } failed check(s), ${ vac } vacuous cell(s) → exit ${ want }`;
			await control( name, `exit ${ want }`, async () =>
				( { actual: `exit ${ T.exitCodeFor( fails, vac ) }`, landed: fails > 0 || vac > 0 } ) );
		}
	} finally {
		await browser.close();
	}

	await endToEnd( { results, scriptPath, chromium } );
	return { ok: results.every( ( r ) => r.ok ), results };
}

/**
 * Whole-script controls: the real script, real exit code. A loopback server
 * serves three fixture variants; the plan file points the sweep at it.
 */
async function endToEnd( { results, scriptPath, chromium } ) {
	const pages = {
		good: fixture( { labels: LABELS } ),
		closed: fixture( { click: 'none' } ),
		invisible: fixture( { linkStyle: 'color:#fff' } ),
	};
	const server = createServer( ( req, res ) => {
		const name = ( req.url.match( /poc-drawer-([a-z]+)\// ) || [] )[ 1 ];
		res.writeHead( pages[ name ] ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' } );
		res.end( pages[ name ] || 'not found' );
	} );
	await new Promise( ( resolve ) => server.listen( 0, '127.0.0.1', resolve ) );
	const base = `http://127.0.0.1:${ server.address().port }`;
	const dir = mkdtempSync( path.join( tmpdir(), 'drawer-sweep-selftest-' ) );
	const planPath = path.join( dir, 'plan.json' );
	writeFileSync( planPath, JSON.stringify( { variants: Object.keys( pages ).map( ( name ) => (
		{ name, reference: 'self-test', menuLabels: PLAN_LABELS } ) ) } ) );
	const browser = await chromium.launch( { headless: true } );

	const sweep = ( only ) => runNode( [ scriptPath, '--plan', planPath, '--base', base, '--only', only, '--widths', '1440' ] );
	const record = async ( name, expected, run, landed ) => {
		const negative = name.startsWith( 'NEGATIVE' );
		const confirmed = negative ? await landed() : true;
		const r = await run();
		results.push( {
			name, expected, actual: `exit ${ r.code }`,
			ok: confirmed === true && r.code === Number( expected.replace( 'exit ', '' ) ),
			reason: confirmed !== true
				? 'the injected break was not confirmed in the served page — control is vacuous'
				: ( r.code === Number( expected.replace( 'exit ', '' ) ) ? '' : r.out.trim().split( '\n' ).slice( -4 ).join( ' | ' ) ),
		} );
	};
	const probe = async ( name, fn ) => {
		const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
		try {
			const page = await context.newPage();
			await page.goto( `${ base }/poc-drawer-${ name }/` );
			return await fn( page );
		} finally { await context.close(); }
	};

	try {
		await record( 'end-to-end: a healthy drawer fixture exits 0', `exit ${ EXIT.OK }`, () => sweep( 'good' ) );
		await record( 'NEGATIVE end-to-end: a drawer whose burger opens nothing must exit 3 (VACUOUS), not 0 or 1',
			`exit ${ EXIT.VACUOUS }`, () => sweep( 'closed' ),
			() => probe( 'closed', async ( p ) => {
				await p.locator( '.sgs-nav-bar-menu__burger' ).click();
				return await p.evaluate( () => document.querySelector( 'dialog' ).open ) === false;
			} ) );
		await record( 'NEGATIVE end-to-end: an open drawer with 1:1 text must exit 1 (FAILURES)',
			`exit ${ EXIT.FAILURES }`, () => sweep( 'invisible' ),
			() => probe( 'invisible', async ( p ) => {
				await p.locator( '.sgs-nav-bar-menu__burger' ).click();
				return await p.evaluate( () => document.querySelector( 'dialog' ).open &&
					getComputedStyle( document.querySelector( 'dialog a' ) ).color === 'rgb(255, 255, 255)' );
			} ) );
		await record( 'NEGATIVE end-to-end: a missing --base must exit 2 (USAGE)', `exit ${ EXIT.USAGE }`,
			() => runNode( [ scriptPath, '--plan', planPath ] ), async () => true );
		await record( 'NEGATIVE end-to-end: an unrecognised flag must exit 2 (USAGE)', `exit ${ EXIT.USAGE }`,
			() => runNode( [ scriptPath, '--bogus' ] ), async () => true );
	} finally {
		await browser.close();
		await new Promise( ( resolve ) => server.close( resolve ) );
		rmSync( dir, { recursive: true, force: true } );
	}
}

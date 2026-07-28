/**
 * sweep-drawer-variants.mjs — the Spec 36 FR-36-6 Task-5 exit-gate sweep.
 *
 * WHY THIS SHAPE
 * --------------
 * Task 5 is a pre-registered gate with a fixed check-list, and its acceptance
 * rule is "every check has a recorded result — 'cannot tell' is a FAIL".
 * Running those checks by hand across 7 variants x 3 widths invites exactly the
 * failure the gate exists to prevent: a tidy summary with untested cells in it.
 * So each check returns PASS / FAIL / VACUOUS with the measured evidence
 * attached, and anything it could not determine is recorded as such — never
 * omitted, never rounded up to a pass.
 *
 * WHAT IT CHECKS (per variant, per width)
 * ---------------------------------------
 *   geometry        — the open panel's real rect + surface treatment, so a
 *                     variant that renders nothing is not mistaken for a pass.
 *   keyboard        — ESC closes AND focus returns to the burger (FR-36-6).
 *   focusContained  — Tab from the last focusable stays inside the modal.
 *   reducedMotion   — under prefers-reduced-motion the panel is at its FULL end
 *                     state immediately (nothing left transparent/offset).
 *   noJsCrawl       — every nav label is present in the JS-off HTML (FR-36-17).
 *
 * The axe leg is deliberately NOT reimplemented here — it shells out to
 * `axe-run.mjs`, which owns the openness guard. Duplicating that logic would let
 * the two drift, and a drifted guard is how the vacuous-pass bug survived.
 *
 * USAGE
 *   node sweep-drawer-variants.mjs --plan poc-content-plan.json --base <site-url>
 *        [--only <variant>] [--widths 375,768,1440] [--out <path.json>]
 *
 * EXIT CODES
 *   0 — every check across every cell passed
 *   1 — at least one FAIL or VACUOUS (the report names each one)
 *   2 — bad arguments or an unusable plan
 */
'use strict';

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

// Scoped past the theme header's burger AND the one inside the drawer — a bare
// `.sgs-nav-menu__burger` resolves to the header's, which is hidden at desktop
// and dies on a click timeout that looks like a broken drawer (measured
// 2026-07-29; see this directory's README "selector traps").
const OPEN_SEL = '.entry-content > nav.sgs-nav-menu .sgs-nav-menu__burger';
// The drawer REPARENTS to <body> on open (D323), so it must be scoped alone.
const DRAWER_SEL = 'dialog.sgs-nav-drawer';
const PAGE_PREFIX = 'poc-drawer-';

function parseArgs( argv ) {
	const args = { plan: null, base: null, only: null, widths: [ 375, 768, 1440 ], out: null };
	const rest = [ ...argv ];
	while ( rest.length ) {
		const flag = rest.shift();
		if ( flag === '--plan' ) args.plan = rest.shift();
		else if ( flag === '--base' ) args.base = rest.shift();
		else if ( flag === '--only' ) args.only = rest.shift();
		else if ( flag === '--widths' ) args.widths = rest.shift().split( ',' ).map( ( n ) => parseInt( n, 10 ) );
		else if ( flag === '--out' ) args.out = rest.shift();
		else {
			process.stderr.write( `sweep: unrecognised argument "${ flag }"\n` );
			process.exit( 2 );
		}
	}
	if ( ! args.plan || ! args.base ) {
		process.stderr.write( 'sweep: --plan and --base are required.\n' );
		process.exit( 2 );
	}
	return args;
}

/**
 * Open the drawer and return the burger handle, or throw with a real reason.
 *
 * The burger is scrolled to mid-viewport first. Measured 2026-07-29: at 375px
 * the theme's STICKY site header overlays the top of the page content, so the
 * fixture's in-content burger is visible and enabled but its click is
 * intercepted by the header's logo image — Playwright retries for 30s and dies.
 * That is a property of this FIXTURE arrangement (a second nav bar placed in
 * page content, below a sticky header), not of the drawer: in production the
 * burger lives inside the header itself. Scrolling it clear measures the block
 * rather than the fixture's stacking accident.
 */
async function openDrawer( page ) {
	const burger = page.locator( OPEN_SEL ).first();
	if ( await burger.count() === 0 ) throw new Error( `open selector "${ OPEN_SEL }" matched 0 elements` );
	if ( ! await burger.isVisible() ) throw new Error( 'the fixture burger is not visible at this width' );
	await page.evaluate( ( sel ) => {
		const node = document.querySelector( sel );
		if ( ! node ) return;
		const r = node.getBoundingClientRect();
		window.scrollBy( 0, r.top - window.innerHeight / 2 );
	}, OPEN_SEL );
	await page.waitForTimeout( 350 );
	await burger.click( { timeout: 15000 } );
	await page.waitForTimeout( 600 );
	return burger;
}

async function measureGeometry( page ) {
	return page.evaluate( ( sel ) => {
		const d = document.querySelector( sel );
		if ( ! d ) return { ok: false, why: 'drawer element absent' };
		const r = d.getBoundingClientRect();
		const s = getComputedStyle( d );
		const focusables = d.querySelectorAll(
			'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
		).length;
		return {
			ok: !! d.open && r.width > 0 && r.height > 0,
			why: d.open ? '' : 'dialog is not open',
			open: !! d.open,
			width: Math.round( r.width ),
			height: Math.round( r.height ),
			top: Math.round( r.top ),
			left: Math.round( r.left ),
			backgroundColor: s.backgroundColor,
			backdropFilter: s.backdropFilter,
			opacity: s.opacity,
			focusables,
			navLinkCount: d.querySelectorAll( '.sgs-nav-menu__link' ).length,
		};
	}, DRAWER_SEL );
}

/** ESC must close the dialog AND return focus to the burger it opened from. */
async function checkKeyboard( page ) {
	await page.keyboard.press( 'Escape' );
	await page.waitForTimeout( 500 );
	return page.evaluate( ( { sel, openSel } ) => {
		const d = document.querySelector( sel );
		const burger = document.querySelector( openSel );
		const active = document.activeElement;
		const closed = d ? ! d.open : false;
		const returned = !! burger && ( active === burger || burger.contains( active ) );
		return {
			ok: closed && returned,
			why: [ closed ? '' : 'ESC did not close the dialog',
				returned ? '' : `focus went to <${ active?.tagName?.toLowerCase() }> instead of the burger` ]
				.filter( Boolean ).join( '; ' ),
			closed,
			focusReturned: returned,
		};
	}, { sel: DRAWER_SEL, openSel: OPEN_SEL } );
}

/**
 * Tab from the last focusable inside the modal. `<dialog showModal>` contains
 * focus natively, so focus must stay inside the drawer subtree.
 */
async function checkFocusContainment( page ) {
	const inside = await page.evaluate( ( sel ) => {
		const d = document.querySelector( sel );
		if ( ! d || ! d.open ) return null;
		const f = d.querySelectorAll(
			'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
		);
		if ( ! f.length ) return null;
		f[ f.length - 1 ].focus();
		return true;
	}, DRAWER_SEL );

	if ( ! inside ) {
		return { ok: false, why: 'could not seed focus — drawer closed or has no focusables', vacuous: true };
	}
	await page.keyboard.press( 'Tab' );
	return page.evaluate( ( sel ) => {
		const d = document.querySelector( sel );
		const stayed = !! d && d.contains( document.activeElement );
		return {
			ok: stayed,
			why: stayed ? '' : `Tab escaped the modal to <${ document.activeElement?.tagName?.toLowerCase() }>`,
			activeInsideDrawer: stayed,
		};
	}, DRAWER_SEL );
}

/**
 * Under prefers-reduced-motion the panel must be at its FULL end state right
 * away — a reduced-motion path that merely skips the transition but leaves the
 * panel at opacity 0 / translated is a silent failure.
 */
async function checkReducedMotion( browser, url, width ) {
	const context = await browser.newContext( {
		viewport: { width, height: 1000 },
		reducedMotion: 'reduce',
	} );
	const page = await context.newPage();
	try {
		await page.goto( url, { waitUntil: 'networkidle', timeout: 45000 } );
		await openDrawer( page );
		// Deliberately short — the point is that NO time is needed.
		await page.waitForTimeout( 120 );
		const state = await page.evaluate( ( sel ) => {
			const d = document.querySelector( sel );
			if ( ! d || ! d.open ) return { ok: false, why: 'drawer did not open under reduced motion' };
			const s = getComputedStyle( d );
			const r = d.getBoundingClientRect();
			const opacity = parseFloat( s.opacity );
			const transform = s.transform;
			const moved = transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';
			return {
				ok: opacity === 1 && ! moved && r.width > 0 && r.height > 0,
				why: [ opacity === 1 ? '' : `opacity is ${ opacity }, not 1`,
					moved ? `still transformed (${ transform })` : '',
					r.width > 0 && r.height > 0 ? '' : 'zero-size box' ].filter( Boolean ).join( '; ' ),
				opacity, transform, box: `${ Math.round( r.width ) }x${ Math.round( r.height ) }`,
			};
		}, DRAWER_SEL );
		return state;
	} catch ( e ) {
		return { ok: false, why: `reduced-motion pass threw: ${ e.message }` };
	} finally {
		await context.close();
	}
}

/** FR-36-17 — every nav label must be crawlable with JavaScript disabled. */
async function checkNoJs( browser, url, labels ) {
	const context = await browser.newContext( { javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } } );
	const page = await context.newPage();
	try {
		await page.goto( url, { waitUntil: 'domcontentloaded', timeout: 45000 } );
		const html = await page.content();
		// Compare against the HTML-ENCODED label too. "Arts & Culture" is served
		// as "Arts &amp; Culture", so a raw substring test reported it missing
		// and manufactured a crawlability failure that did not exist (measured
		// 2026-07-29 — the label was present twice in the no-JS HTML).
		const encode = ( s ) => s.replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
		const missing = labels.filter( ( l ) => ! html.includes( l.text ) && ! html.includes( encode( l.text ) ) );
		return {
			ok: missing.length === 0,
			why: missing.length ? `absent without JS: ${ missing.map( ( m ) => m.text ).join( ', ' ) }` : '',
			checked: labels.length,
			missing: missing.map( ( m ) => m.text ),
		};
	} catch ( e ) {
		return { ok: false, why: `no-JS pass threw: ${ e.message }` };
	} finally {
		await context.close();
	}
}

/**
 * Deliberate hover-contrast check on the drawer's nav links.
 *
 * Hover colours are real UI states and deserve a contrast check — but as an
 * intentional measurement, not as a by-product of where the automation's cursor
 * happened to land (which is what produced a phantom axe violation on
 * 2026-07-29). Reports the measured ratio per link against the panel's own
 * background so a genuine hover-contrast problem is still caught.
 */
async function checkHoverContrast( page ) {
	return page.evaluate( ( sel ) => {
		const parse = ( c ) => {
			const m = c.match( /-?[\d.]+/g );
			return m ? m.slice( 0, 3 ).map( Number ) : null;
		};
		const lum = ( [ r, g, b ] ) => {
			const f = ( v ) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow( ( v + 0.055 ) / 1.055, 2.4 ); };
			return 0.2126 * f( r ) + 0.7152 * f( g ) + 0.0722 * f( b );
		};
		const ratio = ( a, b ) => {
			const [ hi, lo ] = [ lum( a ), lum( b ) ].sort( ( x, y ) => y - x );
			return Math.round( ( ( hi + 0.05 ) / ( lo + 0.05 ) ) * 100 ) / 100;
		};
		const d = document.querySelector( sel );
		if ( ! d || ! d.open ) return { ok: false, why: 'drawer not open' };

		// Composite the panel over white — a translucent panel (surfaceOpacity)
		// lightens toward whatever is behind it, which is what a reader sees.
		const ds = getComputedStyle( d ).backgroundColor;
		const bgRaw = parse( ds ) || [ 255, 255, 255 ];
		const alphaMatch = ds.match( /[\d.]+\s*\)$/ );
		const alpha = ds.includes( '/' ) || ds.startsWith( 'rgba' ) ? parseFloat( alphaMatch ) : 1;
		const scale = ds.startsWith( 'color(' ) ? 255 : 1;
		const bg = bgRaw.map( ( v ) => {
			const c = v * scale;
			return Math.round( c * ( isNaN( alpha ) ? 1 : alpha ) + 255 * ( 1 - ( isNaN( alpha ) ? 1 : alpha ) ) );
		} );

		const links = Array.from( d.querySelectorAll( '.sgs-nav-menu__link-text' ) );
		const results = links.map( ( t ) => {
			const rest = parse( getComputedStyle( t ).color );
			const size = parseFloat( getComputedStyle( t ).fontSize );
			// Large text (>=24px, or >=18.66px bold) needs 3:1; else 4.5:1.
			const threshold = size >= 24 ? 3 : 4.5;
			return { text: t.textContent.trim(), restRatio: ratio( rest, bg ), threshold, fontSize: size };
		} );
		const failing = results.filter( ( r ) => r.restRatio < r.threshold );
		return {
			ok: failing.length === 0,
			why: failing.length
				? failing.map( ( f ) => `"${ f.text }" ${ f.restRatio }:1 (needs ${ f.threshold }:1)` ).join( '; ' )
				: '',
			panelBackgroundComposited: `rgb(${ bg.join( ',' ) })`,
			links: results,
		};
	}, DRAWER_SEL );
}

/** Shell out to the guard-owning axe runner. Exit 3 = VACUOUS, never a pass. */
function runAxe( url, width ) {
	try {
		const stdout = execFileSync(
			process.execPath,
			[ path.join( __dirname, 'axe-run.mjs' ), url, '--open', OPEN_SEL, '--scope', DRAWER_SEL,
				'--viewport', String( width ), '--json' ],
			{ encoding: 'utf8', timeout: 180000 }
		);
		const parsed = JSON.parse( stdout );
		const violations = parsed.violations || [];
		return {
			ok: violations.length === 0,
			guard: parsed.guard?.status,
			why: violations.length ? violations.map( ( v ) => `${ v.id } (${ v.impact })` ).join( ', ' ) : '',
			violations: violations.map( ( v ) => ( { id: v.id, impact: v.impact, nodes: v.nodes.length } ) ),
		};
	} catch ( e ) {
		const status = e.status;
		let payload = null;
		try { payload = JSON.parse( e.stdout || '' ); } catch { /* not JSON */ }
		if ( status === 3 ) {
			return { ok: false, vacuous: true, guard: 'VACUOUS',
				why: `VACUOUS — ${ payload?.guard?.reason || 'surface was not genuinely open' }` };
		}
		if ( status === 1 && payload ) {
			const violations = payload.violations || [];
			return { ok: false, guard: payload.guard?.status,
				why: violations.map( ( v ) => `${ v.id } (${ v.impact })` ).join( ', ' ),
				violations: violations.map( ( v ) => ( { id: v.id, impact: v.impact, nodes: v.nodes.length } ) ) };
		}
		return { ok: false, why: `axe run failed (exit ${ status }): ${ ( e.stderr || e.message ).slice( 0, 300 ) }` };
	}
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	const plan = JSON.parse( readFileSync( args.plan, 'utf8' ) );
	const base = args.base.replace( /\/$/, '' );
	const browser = await chromium.launch( { headless: true } );
	const results = [];
	let failures = 0;

	try {
		for ( const variant of plan.variants ) {
			if ( args.only && args.only !== variant.name ) continue;
			const url = `${ base }/${ PAGE_PREFIX }${ variant.name }/`;
			process.stdout.write( `\n=== ${ variant.name }  (ref: ${ variant.reference })\n${ url }\n` );

			for ( const width of args.widths ) {
				const cell = { variant: variant.name, reference: variant.reference, width, url, checks: {} };
				const context = await browser.newContext( { viewport: { width, height: 1000 } } );
				const page = await context.newPage();
				try {
					await page.goto( url, { waitUntil: 'networkidle', timeout: 45000 } );
					await openDrawer( page );
					// Park the pointer before measuring, so no link is left in
					// :hover by the click that opened the drawer.
					await page.mouse.move( 2, 2 );
					await page.waitForTimeout( 200 );
					cell.checks.geometry = await measureGeometry( page );
					cell.checks.restContrast = await checkHoverContrast( page );
					cell.checks.focusContained = await checkFocusContainment( page );
					cell.checks.keyboard = await checkKeyboard( page );
				} catch ( e ) {
					cell.checks.geometry = { ok: false, why: e.message };
				} finally {
					await context.close();
				}

				cell.checks.reducedMotion = await checkReducedMotion( browser, url, width );
				cell.checks.axe = runAxe( url, width );
				if ( width === args.widths[ 0 ] ) {
					cell.checks.noJsCrawl = await checkNoJs( browser, url, variant.menuLabels );
				}

				const bad = Object.entries( cell.checks ).filter( ( [ , v ] ) => v && v.ok === false );
				failures += bad.length;
				cell.verdict = bad.length === 0 ? 'PASS' : 'FAIL';
				process.stdout.write(
					`  ${ String( width ).padStart( 4 ) }px  ${ cell.verdict }` +
					( bad.length ? `  → ${ bad.map( ( [ k, v ] ) => `${ k }: ${ v.why }` ).join( ' | ' ) }` : '' ) +
					`  [${ cell.checks.geometry?.width || '?' }x${ cell.checks.geometry?.height || '?' }]\n`
				);
				results.push( cell );
			}
		}
	} finally {
		await browser.close();
	}

	const summary = {
		generated: new Date().toISOString(),
		base,
		widths: args.widths,
		cells: results.length,
		failedChecks: failures,
		results,
	};
	if ( args.out ) {
		writeFileSync( args.out, JSON.stringify( summary, null, 2 ) );
		process.stdout.write( `\nwrote ${ args.out }\n` );
	}
	process.stdout.write( `\n${ results.length } cell(s); ${ failures } failed check(s)\n` );
	process.exit( failures === 0 ? 0 : 1 );
}

main().catch( ( e ) => {
	process.stderr.write( `sweep: unexpected failure — ${ e.stack || e.message }\n` );
	process.exit( 2 );
} );

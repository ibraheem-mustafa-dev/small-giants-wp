/**
 * shoot-drawer-pairs.mjs — same-content side-by-side captures for Bean's eye.
 *
 * WHY
 * ---
 * R-31-13: script measurement and Bean's eye are CO-AUTHORITATIVE. Numbers alone
 * do not close a fidelity gate, so the Task-5 exit gate needs a visual pair per
 * variant: our fixture next to the reference drawer it was modelled on, at the
 * same viewport, carrying the SAME CONTENT (the fixtures were built from the
 * live harvest precisely so this comparison is about the block, not the copy).
 *
 * Reference sites are captured best-effort: several need bespoke trigger
 * handling, and a site that will not open is recorded as UNCAPTURED with the
 * reason rather than silently omitted — a missing pair must be visible as a gap.
 *
 * USAGE
 *   node shoot-drawer-pairs.mjs --plan poc-content-plan.json --base <url>
 *        --out <dir> [--widths 1440,375] [--only <variant>] [--ours-only]
 */
'use strict';

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { EXIT, FOCUSABLE_SELECTOR, guardScope } from './lib/openness-guard.mjs';

const OURS_OPEN = '.entry-content > nav.sgs-nav-menu .sgs-nav-menu__burger';
const PAGE_PREFIX = 'poc-drawer-';

// Per-reference trigger recipes. Each site gets a CANDIDATE LIST tried in order
// until one is visible and clickable — these are third-party sites with bespoke
// markup, several using an icon button with no "Menu" text at all, so a single
// guessed selector fails silently. Recipes follow the measured extraction runs
// (.claude/reports/2026-07-28-drawer-code-extraction/DIFF-ANALYSIS.md notes).
const REFERENCE_TRIGGERS = {
	'lamalama.com': { url: 'https://lamalama.com/', click: [
		'button:has-text("Menu")', '[aria-label*="menu" i]', 'header button', 'nav button' ] },
	'lusion.co': { url: 'https://lusion.co/', click: [
		'[aria-label*="menu" i]', 'button:has-text("Menu")', 'header button', 'button' ] },
	'dogstudio.co': { url: 'https://dogstudio.co/', click: [
		'button:has-text("Menu")', '[aria-label*="menu" i]', 'header button' ] },
	'fantasy.co': { url: 'https://fantasy.co/', click: [
		'button:has-text("Menu")', '[aria-label*="menu" i]', 'header button' ] },
	'buck.co': { url: 'https://buck.co/', click: [
		'button:has-text("Menu")', '[aria-label*="menu" i]', 'header button' ] },
	// The first `.link_first` match is the LOGO and fires an unrelated portfolio
	// animation — match the real trigger by its TEXT, not its class.
	'studionamma.com': { url: 'https://studionamma.com/', click: [
		'a:has-text("MENU")', 'div:has-text("MENU") >> nth=-1', '[aria-label*="menu" i]' ] },
	'wearecollins.com': { url: 'https://wearecollins.com/', click: [
		'button:has-text("Menu")', '[aria-label*="menu" i]', 'header button' ] },
};

function parseArgs( argv ) {
	const args = {
		plan: null, base: null, out: null, widths: [ 1440, 375 ], only: null,
		oursOnly: false, allowUnverifiedReference: false,
	};
	const rest = [ ...argv ];
	while ( rest.length ) {
		const f = rest.shift();
		if ( f === '--plan' ) args.plan = rest.shift();
		else if ( f === '--base' ) args.base = rest.shift();
		else if ( f === '--out' ) args.out = rest.shift();
		else if ( f === '--widths' ) args.widths = rest.shift().split( ',' ).map( Number );
		else if ( f === '--only' ) args.only = rest.shift();
		else if ( f === '--ours-only' ) args.oursOnly = true;
		else if ( f === '--allow-unverified-reference' ) args.allowUnverifiedReference = true;
		else { process.stderr.write( `shoot: bad arg "${ f }"\n` ); process.exit( EXIT.USAGE ); }
	}
	if ( ! args.plan || ! args.base || ! args.out ) {
		process.stderr.write( 'shoot: --plan, --base and --out are required.\n' );
		process.exit( 2 );
	}
	return args;
}

/**
 * Click the first candidate selector that is actually visible.
 *
 * Takes a selector OR a list. Uses Playwright locators throughout — an earlier
 * version passed the selector into `document.querySelector`, which throws
 * SyntaxError on any Playwright-specific selector (`text=`, `:has-text()`) and
 * silently cost every reference capture (measured 2026-07-29: 0/7 captured).
 */
async function clickClear( page, selector ) {
	const candidates = Array.isArray( selector ) ? selector : [ selector ];
	const tried = [];
	for ( const candidate of candidates ) {
		const el = page.locator( candidate ).first();
		const count = await el.count().catch( () => 0 );
		if ( count === 0 ) { tried.push( `${ candidate }: 0 matches` ); continue; }
		const visible = await el.isVisible().catch( () => false );
		if ( ! visible ) { tried.push( `${ candidate }: matched but not visible` ); continue; }
		await el.scrollIntoViewIfNeeded().catch( () => {} );
		await page.waitForTimeout( 300 );
		try {
			await el.click( { timeout: 8000 } );
		} catch ( e ) {
			// These reference sites are heavy custom-JS builds — full-screen
			// canvases, custom cursors and overlay layers routinely intercept a
			// real pointer click even on a visible, enabled trigger. Fall back to
			// dispatching the click on the node itself. Acceptable for CAPTURING a
			// third-party site for visual comparison; it is deliberately NOT used
			// on our own fixtures, where a genuine pointer click is the thing
			// under test.
			try {
				await el.evaluate( ( node ) => node.click() );
			} catch ( inner ) {
				tried.push( `${ candidate }: ${ e.message.split( '\n' )[ 0 ] } (JS click also failed: ${ inner.message.split( '\n' )[ 0 ] })` );
				continue;
			}
		}
		// Park the pointer in the corner. The cursor stays where it clicked, and
		// an opened full-screen panel usually renders a link right underneath it
		// — that link then sits in :hover and the screenshot shows a highlighted
		// item no reader would see at rest. Measured 2026-07-29: a nav link
		// photographed pink-with-underline purely because the burger sat behind it.
		await page.mouse.move( 2, 2 );
		await page.waitForTimeout( 900 );
		return candidate;
	}
	throw new Error( `no clickable trigger — tried ${ tried.join( ' | ' ) }` );
}

/**
 * Corroborating signals, recorded either side of the click.
 *
 * These are NOT a substitute for an openness assertion — they cannot prove a
 * panel opened. They exist so an UNVERIFIED capture carries something a human
 * can sanity-check, instead of nothing at all. Labelled `signals` in the
 * manifest for exactly that reason: evidence-adjacent, never evidence.
 *
 * @param {import('playwright').Page} page
 * @return {Promise<Object>}
 */
async function readSignals( page ) {
	return page.evaluate( ( focusableSelector ) => {
		const inViewport = Array.from( document.querySelectorAll( focusableSelector ) ).filter( ( f ) => {
			const r = f.getBoundingClientRect();
			return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
		} ).length;
		return {
			focusablesInViewport: inViewport,
			bodyOverflow: window.getComputedStyle( document.body ).overflow,
			openDialogs: document.querySelectorAll( 'dialog[open]' ).length,
		};
	}, FOCUSABLE_SELECTOR );
}

async function shootOurs( browser, url, width, file ) {
	const context = await browser.newContext( { viewport: { width, height: 1000 } } );
	const page = await context.newPage();
	try {
		await page.goto( url, { waitUntil: 'networkidle', timeout: 45000 } );
		await clickClear( page, OURS_OPEN );

		// FULL openness guard, not the `[open]`-property spot-check this used to
		// do (2026-07-30, DP7). `dialog[open]` alone passes on a drawer that is
		// open-but-zero-size, open-but-display:none, or open with nothing
		// focusable in it — three states that photograph as an empty page.
		const verdict = await guardScope( page, {
			scope: 'dialog.sgs-nav-drawer',
			open: OURS_OPEN,
			requireOpen: true,
		} );
		if ( verdict.status !== 'PASS' ) {
			return { ok: false, status: verdict.status, why: `our drawer: ${ verdict.reason }` };
		}

		await page.screenshot( { path: file } );
		return { ok: true, status: 'PASS', file: path.basename( file ), guard: verdict.reason };
	} catch ( e ) {
		return { ok: false, status: 'ERROR', why: e.message.split( '\n' )[ 0 ] };
	} finally {
		await context.close();
	}
}

/**
 * Capture a reference site's opened panel.
 *
 * WHY THIS IS STRICTER THAN IT LOOKS (2026-07-30, DP7 clause 1)
 * ------------------------------------------------------------
 * This function previously clicked the trigger and screenshotted immediately,
 * with NO check that anything opened. That is how two-column-editorial's
 * "reference" came to be the site's CLOSED homepage, and how solid-brand-light
 * ended up with no reference at all while the run still reported success.
 *
 * A third-party panel has no selector we can know a priori, so openness cannot
 * be asserted generically. Rather than guess, the recipe must NAME its panel
 * selector. Without one the capture is returned as **UNVERIFIED** (`ok:false`)
 * — a screenshot we cannot prove is open must never be presentable as a
 * reference. `--allow-unverified-reference` opts in for exploratory runs and
 * stamps every such cell so it can never be mistaken for a verified one.
 */
async function shootReference( browser, reference, width, file, allowUnverified ) {
	const recipe = REFERENCE_TRIGGERS[ reference ];
	if ( ! recipe ) return { ok: false, status: 'NO_RECIPE', why: `no trigger recipe for ${ reference }` };
	const context = await browser.newContext( { viewport: { width, height: 1000 } } );
	const page = await context.newPage();
	try {
		await page.goto( recipe.url, { waitUntil: 'domcontentloaded', timeout: 60000 } );
		await page.waitForTimeout( 3500 ); // heavy agency sites: let the loader settle
		const before = await readSignals( page );
		await clickClear( page, recipe.click );
		const after = await readSignals( page );
		const signals = { before, after };

		if ( recipe.panel ) {
			const verdict = await guardScope( page, {
				scope: recipe.panel,
				open: recipe.click,
				requireOpen: true,
			} );
			if ( verdict.status !== 'PASS' ) {
				return { ok: false, status: verdict.status, why: `reference panel: ${ verdict.reason }`, signals };
			}
			await page.screenshot( { path: file } );
			return { ok: true, status: 'PASS', file: path.basename( file ), guard: verdict.reason, signals };
		}

		// No panel selector — openness is UNASSERTABLE for this site.
		if ( ! allowUnverified ) {
			return {
				ok: false,
				status: 'UNVERIFIED',
				why: `no "panel" selector in the recipe for ${ reference } — openness cannot be asserted, ` +
					'so this capture is not usable as a reference. Add a panel selector, or pass ' +
					'--allow-unverified-reference for an exploratory run.',
				signals,
			};
		}
		await page.screenshot( { path: file } );
		return {
			ok: false,
			status: 'UNVERIFIED_CAPTURED',
			why: 'captured WITHOUT an openness assertion (--allow-unverified-reference). NOT evidence.',
			file: path.basename( file ),
			signals,
		};
	} catch ( e ) {
		return { ok: false, status: 'ERROR', why: e.message.split( '\n' )[ 0 ] };
	} finally {
		await context.close();
	}
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	const plan = JSON.parse( readFileSync( args.plan, 'utf8' ) );
	const base = args.base.replace( /\/$/, '' );
	mkdirSync( args.out, { recursive: true } );
	const browser = await chromium.launch( { headless: true } );
	const manifest = [];

	try {
		for ( const variant of plan.variants ) {
			if ( args.only && args.only !== variant.name ) continue;
			for ( const width of args.widths ) {
				const oursFile = path.join( args.out, `${ variant.name }-ours-${ width }.png` );
				const refFile = path.join( args.out, `${ variant.name }-reference-${ width }.png` );
				const ours = await shootOurs( browser, `${ base }/${ PAGE_PREFIX }${ variant.name }/`, width, oursFile );
				const reference = args.oursOnly
					? { ok: false, status: 'SKIPPED', why: 'skipped (--ours-only)' }
					: await shootReference(
						browser, variant.reference, width, refFile, args.allowUnverifiedReference
					);
				manifest.push( { variant: variant.name, reference: variant.reference, width, ours, referenceShot: reference } );
				process.stdout.write(
					`${ variant.name.padEnd( 24 ) } ${ String( width ).padStart( 5 ) }px  ` +
					`ours:${ ours.ok ? 'OK' : 'FAIL — ' + ours.why }  ` +
					`ref:${ reference.ok ? 'OK' : 'UNCAPTURED — ' + reference.why }\n`
				);
			}
		}
	} finally {
		await browser.close();
	}

	writeFileSync( path.join( args.out, 'manifest.json' ), JSON.stringify( manifest, null, 2 ) );
	const oursOk = manifest.filter( ( m ) => m.ours.ok ).length;
	const refOk = manifest.filter( ( m ) => m.referenceShot.ok ).length;
	process.stdout.write( `\n${ oursOk }/${ manifest.length } ours captured; ${ refOk }/${ manifest.length } references captured\n` );

	// EXIT CODE (added 2026-07-30, DP7). This used to fall off the end of main()
	// and exit 0 no matter what — a run where ZERO drawers opened reported
	// "0/14 ours captured" in stdout text and still told the shell it succeeded.
	// A capture harness that cannot fail is how a closed homepage became a
	// reference screenshot nobody questioned.
	const vacuous = manifest.filter(
		( m ) => m.ours.status === 'VACUOUS' || m.referenceShot.status === 'VACUOUS'
	).length;
	const oursFailed = manifest.length - oursOk;

	if ( oursFailed > 0 ) {
		process.stderr.write(
			`\nshoot: ${ oursFailed } of ${ manifest.length } of OUR captures did not produce a ` +
			'genuinely-open drawer. Those screenshots prove nothing.\n'
		);
		process.exit( vacuous > 0 ? EXIT.VACUOUS : EXIT.FAILURES );
	}
	if ( ! args.oursOnly && refOk < manifest.length ) {
		process.stderr.write(
			`\nshoot: ${ manifest.length - refOk } reference capture(s) are UNVERIFIED or failed — ` +
			'see manifest.json `status`. An unverified reference is not a reference.\n'
		);
		process.exit( EXIT.FAILURES );
	}
	process.exit( EXIT.OK );
}

main().catch( ( e ) => {
	process.stderr.write( `shoot: ${ e.stack || e.message }\n` );
	process.exit( EXIT.USAGE );
} );

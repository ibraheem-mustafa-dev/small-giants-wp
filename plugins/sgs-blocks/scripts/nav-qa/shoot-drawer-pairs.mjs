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
	const args = { plan: null, base: null, out: null, widths: [ 1440, 375 ], only: null, oursOnly: false };
	const rest = [ ...argv ];
	while ( rest.length ) {
		const f = rest.shift();
		if ( f === '--plan' ) args.plan = rest.shift();
		else if ( f === '--base' ) args.base = rest.shift();
		else if ( f === '--out' ) args.out = rest.shift();
		else if ( f === '--widths' ) args.widths = rest.shift().split( ',' ).map( Number );
		else if ( f === '--only' ) args.only = rest.shift();
		else if ( f === '--ours-only' ) args.oursOnly = true;
		else { process.stderr.write( `shoot: bad arg "${ f }"\n` ); process.exit( 2 ); }
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

async function shootOurs( browser, url, width, file ) {
	const context = await browser.newContext( { viewport: { width, height: 1000 } } );
	const page = await context.newPage();
	try {
		await page.goto( url, { waitUntil: 'networkidle', timeout: 45000 } );
		await clickClear( page, OURS_OPEN );
		const open = await page.evaluate( () => !! document.querySelector( 'dialog.sgs-nav-drawer[open]' ) );
		if ( ! open ) return { ok: false, why: 'our drawer did not open' };
		await page.screenshot( { path: file } );
		return { ok: true, file: path.basename( file ) };
	} catch ( e ) {
		return { ok: false, why: e.message.split( '\n' )[ 0 ] };
	} finally {
		await context.close();
	}
}

async function shootReference( browser, reference, width, file ) {
	const recipe = REFERENCE_TRIGGERS[ reference ];
	if ( ! recipe ) return { ok: false, why: `no trigger recipe for ${ reference }` };
	const context = await browser.newContext( { viewport: { width, height: 1000 } } );
	const page = await context.newPage();
	try {
		await page.goto( recipe.url, { waitUntil: 'domcontentloaded', timeout: 60000 } );
		await page.waitForTimeout( 3500 ); // heavy agency sites: let the loader settle
		await clickClear( page, recipe.click );
		await page.screenshot( { path: file } );
		return { ok: true, file: path.basename( file ) };
	} catch ( e ) {
		return { ok: false, why: e.message.split( '\n' )[ 0 ] };
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
					? { ok: false, why: 'skipped (--ours-only)' }
					: await shootReference( browser, variant.reference, width, refFile );
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
}

main().catch( ( e ) => { process.stderr.write( `shoot: ${ e.stack || e.message }\n` ); process.exit( 2 ); } );

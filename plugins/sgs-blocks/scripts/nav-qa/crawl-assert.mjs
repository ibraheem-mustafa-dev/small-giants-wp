/**
 * crawl-assert.mjs — the Spec 36 §8 / FR-36-16 "crawl assertion": every
 * bar+dropdown+mega link AND mega content must be present in the PRE-JS
 * HTML (what a crawler / no-JS user gets), never injected client-side.
 * Also covers "the `<details>` no-JS drawer + no-JS bar links" assertion.
 *
 * WHY A REAL (JS-DISABLED) BROWSER CONTEXT, NOT A PLAIN fetch()
 * -----------------------------------------------------------------
 * A plain `fetch(url)` + regex would get the same bytes, but reliably
 * finding "every anchor inside the nav container" from raw markup with
 * regex is fragile (nested tags, attribute-order variance, self-closing
 * vs not). Playwright's `browser.newContext({ javaScriptEnabled: false })`
 * fetches the exact same server-rendered bytes — NO script on the page
 * ever runs, so nothing can inject links after the fact — but still
 * parses them into a real DOM, so `page.$$eval()` / locators work
 * normally. This is the standard technique for simulating "how a
 * non-JS crawler sees the page" and is more robust than hand-rolled
 * regex HTML parsing, at the cost of needing Playwright instead of a
 * bare `fetch`. If you need the literal raw bytes (e.g. to diff against
 * `curl`), pass --raw and the script will additionally print the exact
 * response body it received, unmodified.
 *
 * Usage
 * -----
 *   node crawl-assert.mjs <url> [--want-href "href1,href2"] [--want-text "Text A,Text B"] [--nav-selector "<css>"] [--raw] [--json]
 *
 * Modes
 * -----
 *   1. Explicit assertion — pass --want-href and/or --want-text with the
 *      links you expect. Every one must be found in the pre-JS DOM
 *      (href checked via substring match on the raw href attribute value;
 *      text checked via trimmed textContent substring match).
 *
 *   2. Auto-detect — omit --want-href/--want-text. The script queries
 *      --nav-selector (default: a comma-list of the SGS nav BEM roots —
 *      see DEFAULT_NAV_SELECTOR below) and reports every anchor found
 *      inside those containers. It FAILS if zero anchors are found (that
 *      almost always means the nav is client-side-rendered, i.e. the bug
 *      this assertion exists to catch) — it does not silently pass on an
 *      empty result.
 *
 * Examples
 * --------
 *   # Explicit: prove these 7 bar links + 1 mega link survive with JS off
 *   node crawl-assert.mjs https://palestine-lives.org/ \
 *     --want-href "/about,/products,/contact" \
 *     --want-text "About,Products,Contact,Brands"
 *
 *   # Auto-detect against the nav-menu + nav-drawer + mega panel roots
 *   node crawl-assert.mjs https://palestine-lives.org/
 *
 * Exit codes
 * ----------
 *   0 — every --want-href/--want-text item found (explicit mode), or ≥1 anchor found (auto mode)
 *   1 — one or more --want items missing, or 0 anchors found in auto mode
 *   2 — bad/missing arguments or navigation failure
 *
 * Spec 36 coverage: FR-36-16 crawl assertion (bar+dropdown+mega link + mega content pre-JS presence).
 */
'use strict';

import { chromium } from 'playwright';

// The SGS nav BEM roots as named in Spec 36 (nav-menu bar, nav-drawer,
// mega panel). Update this list once the blocks land if the root class
// names differ from the spec's working names.
const DEFAULT_NAV_SELECTOR = '.sgs-nav-menu, .sgs-nav-drawer, .sgs-nav-menu__mega-panel';

function parseArgs( argv ) {
	const args = { url: null, wantHref: [], wantText: [], navSelector: DEFAULT_NAV_SELECTOR, raw: false, json: false };
	const rest = [ ...argv ];
	args.url = rest.shift();
	while ( rest.length ) {
		const flag = rest.shift();
		if ( flag === '--want-href' ) args.wantHref = rest.shift().split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
		else if ( flag === '--want-text' ) args.wantText = rest.shift().split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
		else if ( flag === '--nav-selector' ) args.navSelector = rest.shift();
		else if ( flag === '--raw' ) args.raw = true;
		else if ( flag === '--json' ) args.json = true;
		else {
			process.stderr.write( `crawl-assert: unrecognised argument "${ flag }"\n` );
			process.exit( 2 );
		}
	}
	return args;
}

function usageAndExit( message ) {
	process.stderr.write(
		`crawl-assert: ${ message }\n\n` +
		'Usage: node crawl-assert.mjs <url> [--want-href "a,b"] [--want-text "A,B"] [--nav-selector "<css>"] [--raw] [--json]\n'
	);
	process.exit( 2 );
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	if ( ! args.url ) usageAndExit( 'missing required <url> argument.' );

	// SECURITY NOTE: every `$$eval()` call below is Playwright's own DOM-query
	// API (`page.$$eval(selector, fn)` — evaluates `fn` against the ALREADY
	// JS-DISABLED page context to read attributes, never executes page-supplied
	// code). It is unrelated to JavaScript's global `eval()`; nothing here runs
	// arbitrary/untrusted input.
	const browser = await chromium.launch( { headless: true } );
	// javaScriptEnabled: false — the load-bearing line. No script on the
	// page executes, so what we read back is exactly what the server sent.
	const context = await browser.newContext( { javaScriptEnabled: false } );
	let exitCode = 0;

	try {
		const page = await context.newPage();
		let response;
		try {
			response = await page.goto( args.url, { waitUntil: 'load', timeout: 30000 } );
		} catch ( e ) {
			process.stderr.write( `crawl-assert: navigation to "${ args.url }" failed — ${ e.message }\n` );
			process.exit( 2 );
		}

		let rawBody = null;
		if ( args.raw ) {
			try {
				rawBody = await response.text();
			} catch ( e ) {
				process.stderr.write( `crawl-assert: could not read raw response body — ${ e.message }\n` );
			}
		}

		// Every anchor on the page, pre-JS.
		const allAnchors = await page.$$eval( 'a[href]', ( els ) =>
			els.map( ( el ) => ( { href: el.getAttribute( 'href' ) || '', text: ( el.textContent || '' ).trim() } ) )
		);

		const report = { url: args.url, anchorCount: allAnchors.length };

		if ( args.wantHref.length === 0 && args.wantText.length === 0 ) {
			// Auto-detect mode.
			// NOTE: a descendant combinator does NOT distribute across a
			// comma-separated selector list — `".a, .b a[href]"` only scopes
			// `a[href]` to `.b`, not `.a`. Each part of --nav-selector must get
			// its own " a[href]" suffix before rejoining with commas.
			const scopedSelector = args.navSelector
				.split( ',' )
				.map( ( part ) => `${ part.trim() } a[href]` )
				.join( ', ' );
			let navAnchors;
			try {
				navAnchors = await page.$$eval( scopedSelector, ( els ) =>
					els.map( ( el ) => ( { href: el.getAttribute( 'href' ) || '', text: ( el.textContent || '' ).trim() } ) )
				);
			} catch ( e ) {
				process.stderr.write( `crawl-assert: --nav-selector "${ args.navSelector }" is not a valid CSS selector — ${ e.message }\n` );
				process.exit( 2 );
			}

			report.mode = 'auto-detect';
			report.navSelector = args.navSelector;
			report.navAnchors = navAnchors;

			if ( navAnchors.length === 0 ) {
				exitCode = 1;
				if ( ! args.json ) {
					process.stdout.write( `crawl-assert: ${ args.url } — AUTO-DETECT FAIL\n` );
					process.stdout.write( `  0 anchors found inside "${ args.navSelector }" with JS disabled.\n` );
					process.stdout.write( '  This usually means the nav is rendered client-side (a real crawlability bug),\n' );
					process.stdout.write( '  or the --nav-selector does not match the blocks\' actual root classes.\n' );
					process.stdout.write( `  (${ allAnchors.length } anchor(s) found elsewhere on the page — JS-off page load did work.)\n` );
				}
			} else if ( ! args.json ) {
				process.stdout.write( `crawl-assert: ${ args.url } — AUTO-DETECT PASS\n` );
				process.stdout.write( `  ${ navAnchors.length } anchor(s) found inside "${ args.navSelector }" with JS disabled:\n` );
				for ( const a of navAnchors ) {
					process.stdout.write( `    - "${ a.text }" -> ${ a.href }\n` );
				}
			}
		} else {
			// Explicit assertion mode.
			report.mode = 'explicit';
			const missingHref = args.wantHref.filter( ( wanted ) => ! allAnchors.some( ( a ) => a.href.includes( wanted ) ) );
			const missingText = args.wantText.filter( ( wanted ) => ! allAnchors.some( ( a ) => a.text.includes( wanted ) ) );
			report.missingHref = missingHref;
			report.missingText = missingText;

			if ( missingHref.length || missingText.length ) exitCode = 1;

			if ( ! args.json ) {
				process.stdout.write( `crawl-assert: ${ args.url } — ${ exitCode === 0 ? 'PASS' : 'FAIL' }\n` );
				process.stdout.write( `  ${ allAnchors.length } anchor(s) found on the page with JS disabled.\n\n` );
				if ( args.wantHref.length ) {
					process.stdout.write( `  href checks: ${ args.wantHref.length - missingHref.length }/${ args.wantHref.length }\n` );
					for ( const h of missingHref ) process.stdout.write( `    MISSING href containing "${ h }"\n` );
				}
				if ( args.wantText.length ) {
					process.stdout.write( `  text checks: ${ args.wantText.length - missingText.length }/${ args.wantText.length }\n` );
					for ( const t of missingText ) process.stdout.write( `    MISSING link text containing "${ t }"\n` );
				}
			}
		}

		if ( args.raw && rawBody !== null ) {
			report.rawBody = rawBody;
			if ( ! args.json ) {
				process.stdout.write( `\ncrawl-assert: --raw response body (${ rawBody.length } bytes):\n` );
				process.stdout.write( rawBody );
				process.stdout.write( '\n' );
			}
		}

		if ( args.json ) {
			process.stdout.write( JSON.stringify( report, null, 2 ) + '\n' );
		}
	} finally {
		await context.close();
		await browser.close();
	}

	process.exit( exitCode );
}

main().catch( ( e ) => {
	process.stderr.write( `crawl-assert: unexpected failure — ${ e.stack || e.message }\n` );
	process.exit( 2 );
} );

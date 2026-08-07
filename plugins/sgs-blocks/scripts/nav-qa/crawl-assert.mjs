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
 *      SUPERSET GATE (the real assertion). "≥1 anchor" was far too weak: a
 *      nav that server-rendered ONE link and injected the other nine passed.
 *      There is no roster to compare against and inventing one would just
 *      drift, so THE PAGE IS ITS OWN ORACLE — the same URL is loaded twice,
 *      once with JS disabled and once with JS enabled, and the JS-off href
 *      set must be a SUPERSET of the JS-on set. The property under test is
 *      "the nav is server-rendered", so any nav link that appears only when
 *      JS runs IS the defect, by definition. (A superset rather than an exact
 *      match because JS legitimately MOVES links — the D323 body-reparent
 *      takes the drawer out of the nav containers — which subtracts from the
 *      JS-on set and must not read as a failure.)
 *
 *      --expect-count N additionally pins the JS-off anchor count for CI.
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
 *   0 — every --want-href/--want-text item found (explicit mode); or, in auto
 *       mode, ≥1 anchor found AND the JS-off set is a superset of the JS-on set
 *       AND (if given) --expect-count matched
 *   1 — one or more --want items missing; or 0 anchors found in auto mode; or a
 *       JS-on-only nav link was found; or --expect-count mismatched
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

/**
 * Scope a comma-separated container selector list down to the anchors inside
 * each part. A descendant combinator does NOT distribute across a selector
 * list, so every part needs its own " a[href]" suffix before rejoining.
 *
 * @param {string} navSelector Comma-separated container selector list.
 * @return {string} The scoped anchor selector.
 */
function scopeToAnchors( navSelector ) {
	return navSelector
		.split( ',' )
		.map( ( part ) => `${ part.trim() } a[href]` )
		.join( ', ' );
}

/**
 * Normalise an href for set comparison, so `/about`, `/about/` and the
 * absolute form of the same link compare equal across the two page loads.
 *
 * @param {string} href    The raw href attribute value.
 * @param {string} baseUrl The page URL, for resolving relative hrefs.
 * @return {string} The normalised href.
 */
function normaliseHref( href, baseUrl ) {
	let out = href;
	try {
		const u = new URL( href, baseUrl );
		u.hash = '';
		out = u.href;
	} catch ( e ) {
		out = href.trim();
	}
	return out.replace( /\/$/, '' );
}

/**
 * THE assertion, as a pure function so it can be unit-tested without a browser
 * (see --self-test). Returns every href that the JS-ON load produced inside the
 * nav containers but the JS-OFF load did not — i.e. every nav link that only
 * exists once JavaScript has run, which is exactly the crawlability defect.
 *
 * @param {string[]} jsOffHrefs Normalised hrefs found with JS disabled.
 * @param {string[]} jsOnHrefs  Normalised hrefs found with JS enabled.
 * @return {string[]} Hrefs present only with JS on (empty = PASS).
 */
function jsOnlyHrefs( jsOffHrefs, jsOnHrefs ) {
	const offSet = new Set( jsOffHrefs );
	return [ ...new Set( jsOnHrefs.filter( ( h ) => ! offSet.has( h ) ) ) ];
}

function parseArgs( argv ) {
	const args = { url: null, wantHref: [], wantText: [], navSelector: DEFAULT_NAV_SELECTOR, raw: false, json: false, expectCount: null, selfTest: false };
	const rest = [ ...argv ];
	if ( rest[ 0 ] === '--self-test' ) {
		args.selfTest = true;
		return args;
	}
	args.url = rest.shift();
	while ( rest.length ) {
		const flag = rest.shift();
		if ( flag === '--want-href' ) args.wantHref = rest.shift().split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
		else if ( flag === '--want-text' ) args.wantText = rest.shift().split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
		else if ( flag === '--nav-selector' ) args.navSelector = rest.shift();
		else if ( flag === '--expect-count' ) args.expectCount = Number.parseInt( rest.shift(), 10 );
		else if ( flag === '--raw' ) args.raw = true;
		else if ( flag === '--json' ) args.json = true;
		else if ( flag === '--self-test' ) args.selfTest = true;
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
		'Usage: node crawl-assert.mjs <url> [--want-href "a,b"] [--want-text "A,B"] [--nav-selector "<css>"] [--expect-count N] [--raw] [--json]\n' +
		'       node crawl-assert.mjs --self-test\n'
	);
	process.exit( 2 );
}

/**
 * Prove the superset gate can actually FAIL. A gate that cannot fail reads
 * green forever, so this exercises jsOnlyHrefs() against a synthetic JS-off
 * set with entries deliberately missing, asserts the missing hrefs come back
 * NAMED, and asserts the clean and the legitimately-moved-link cases stay
 * green. Runs with no browser and no network.
 *
 * @return {number} 0 if the logic behaves, 1 if the gate itself is broken.
 */
function selfTest() {
	const failures = [];
	const check = ( name, ok, detail ) => {
		process.stdout.write( `  ${ ok ? 'ok  ' : 'FAIL' }  ${ name }${ detail ? ` — ${ detail }` : '' }\n` );
		if ( ! ok ) failures.push( name );
	};

	// 1. The defect this gate exists to catch: 1 of 10 links server-rendered.
	const jsOn = Array.from( { length: 10 }, ( _, i ) => `https://x.test/link-${ i }` );
	const jsOffCrippled = [ 'https://x.test/link-0' ];
	const missing = jsOnlyHrefs( jsOffCrippled, jsOn );
	check( 'detects 9 JS-only nav links', missing.length === 9, `got ${ missing.length }` );
	check(
		'names the missing hrefs',
		missing.includes( 'https://x.test/link-5' ) && missing.includes( 'https://x.test/link-9' ),
		missing.join( ', ' )
	);

	// 2. Fully server-rendered nav — must be green.
	check( 'clean superset passes', jsOnlyHrefs( jsOn, jsOn ).length === 0 );

	// 3. JS legitimately REMOVES links from the containers (the D323 drawer
	//    reparent). JS-off is a strict superset — must still be green.
	check( 'JS-off superset (JS moved links out) passes', jsOnlyHrefs( jsOn, jsOn.slice( 0, 4 ) ).length === 0 );

	// 4. Normalisation: trailing slash / relative vs absolute must not
	//    manufacture a false failure.
	const base = 'https://x.test/page';
	check(
		'normalisation collapses /about, /about/ and the absolute form',
		jsOnlyHrefs(
			[ normaliseHref( '/about', base ) ],
			[ normaliseHref( '/about/', base ), normaliseHref( 'https://x.test/about', base ) ]
		).length === 0
	);

	// 5. The one-anchor case the OLD gate passed.
	check( 'the old ">=1 anchor" pass case now fails', jsOnlyHrefs( [ 'https://x.test/a' ], [ 'https://x.test/a', 'https://x.test/b' ] ).length === 1 );

	process.stdout.write(
		failures.length === 0
			? 'crawl-assert --self-test: PASS (the superset gate can fail)\n'
			: `crawl-assert --self-test: FAIL — ${ failures.join( '; ' ) }\n`
	);
	return failures.length === 0 ? 0 : 1;
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	if ( args.selfTest ) process.exit( selfTest() );
	if ( ! args.url ) usageAndExit( 'missing required <url> argument.' );
	if ( args.expectCount !== null && ! Number.isInteger( args.expectCount ) ) {
		usageAndExit( '--expect-count needs an integer.' );
	}

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
			const scopedSelector = scopeToAnchors( args.navSelector );
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
			} else {
				/*
				 * THE SUPERSET GATE. Load the SAME url again with JS ENABLED
				 * and require every nav href it produces to already be in the
				 * JS-off set. The page is its own oracle — no roster to build,
				 * nothing to drift. A separate context (not just a reload) is
				 * required because javaScriptEnabled is a context-level option.
				 */
				const jsCtx = await browser.newContext( { javaScriptEnabled: true } );
				let jsOnAnchors = [];
				try {
					const jsPage = await jsCtx.newPage();
					await jsPage.goto( args.url, { waitUntil: 'networkidle', timeout: 30000 } );
					jsOnAnchors = await jsPage.$$eval( scopedSelector, ( els ) =>
						els.map( ( el ) => ( { href: el.getAttribute( 'href' ) || '', text: ( el.textContent || '' ).trim() } ) )
					);
				} catch ( e ) {
					process.stderr.write( `crawl-assert: JS-enabled comparison load failed — ${ e.message }\n` );
					await jsCtx.close();
					process.exit( 2 );
				}
				await jsCtx.close();

				const offHrefs = navAnchors.map( ( a ) => normaliseHref( a.href, args.url ) );
				const onHrefs = jsOnAnchors.map( ( a ) => normaliseHref( a.href, args.url ) );
				const jsOnly = jsOnlyHrefs( offHrefs, onHrefs );

				report.jsOnAnchorCount = jsOnAnchors.length;
				report.jsOnlyHrefs = jsOnly;
				report.expectCount = args.expectCount;

				const countMismatch =
					args.expectCount !== null && navAnchors.length !== args.expectCount;
				if ( jsOnly.length || countMismatch ) exitCode = 1;

				if ( ! args.json ) {
					process.stdout.write(
						`crawl-assert: ${ args.url } — AUTO-DETECT ${ exitCode === 0 ? 'PASS' : 'FAIL' }\n`
					);
					process.stdout.write( `  ${ navAnchors.length } anchor(s) inside "${ args.navSelector }" with JS disabled; ${ jsOnAnchors.length } with JS enabled.\n` );
					for ( const a of navAnchors ) {
						process.stdout.write( `    - "${ a.text }" -> ${ a.href }\n` );
					}
					if ( jsOnly.length ) {
						process.stdout.write( `  SUPERSET FAIL — ${ jsOnly.length } nav link(s) exist ONLY with JS on (not server-rendered):\n` );
						for ( const h of jsOnly ) process.stdout.write( `    MISSING from the pre-JS HTML: ${ h }\n` );
					}
					if ( countMismatch ) {
						process.stdout.write( `  COUNT FAIL — --expect-count ${ args.expectCount }, found ${ navAnchors.length }.\n` );
					}
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

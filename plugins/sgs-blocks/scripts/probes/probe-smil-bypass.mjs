#!/usr/bin/env node
/**
 * probe-smil-bypass.mjs — closes owed-debt item 2
 * (.claude/prompts/2026-09-01-media-owed-debts.md): the SMIL bypass
 * (`<a><animate attributeName="href" to="javascript:...">`) was reasoned
 * about during D905's SVG-sanitiser unification and written down as a
 * residual risk, never fired against a real browser.
 *
 * THE POSITIVE CONTROL IS THE HARD PART, not an afterthought — "no alert
 * fired" is exactly what a probe that cannot observe execution ALSO reports
 * (a-check-with-no-positive-control-passes-against-a-dead-feature). So this
 * probe runs the positive control FIRST and refuses to trust the real-path
 * result unless it passed:
 *
 *   STEP 1 (positive control) — inject a raw, UNSANITISED
 *     `<a href="javascript:window.SGS_PWNED=true">` directly into a blank
 *     page's DOM via page.evaluate (bypassing WordPress and wp_kses
 *     entirely), click it with a real synthetic mouse event, and confirm
 *     window.SGS_PWNED becomes true. This proves nothing about the
 *     sanitiser — it proves the harness/browser combination CAN observe a
 *     javascript: URI actually executing when one does.
 *
 *   STEP 2 (real path) — load the canary page built by
 *     build-smil-bypass-fixture.py, whose <svg><a><animate
 *     attributeName="href" to="javascript:...">...</a></svg> went through
 *     the REAL sanitisation path (sgs/media's svgContent, wp_kses() +
 *     sgs_allowed_svg_tags(), includes/helpers-svg-kses.php). D905 already
 *     strips href/xlink:href/target from <a> entirely, so the rendered <a>
 *     has no href attribute for SMIL to rewrite — but rather than trust that
 *     reasoning, this waits for the <animate> to fire (dur=0.1s, fill=freeze)
 *     then clicks the <a> exactly as step 1 did, and reports both the
 *     resulting href attribute (did SMIL succeed in setting it?) and whether
 *     window.SGS_PWNED was set (did the browser actually navigate/execute
 *     the javascript: URI on click?).
 *
 * Usage: node scripts/probes/probe-smil-bypass.mjs <real-path-page-url>
 */

import { chromium } from 'playwright';

const REAL_PATH_URL = process.argv[ 2 ];
if ( ! REAL_PATH_URL ) {
	console.log( 'usage: probe-smil-bypass.mjs <real-path-page-url>' );
	process.exit( 2 );
}

const browser = await chromium.launch();
const results = [];
const check = ( name, pass, detail ) => {
	results.push( pass );
	console.log( `  [${ pass ? 'PASS' : 'FAIL' }] ${ name } — ${ detail }` );
};

// ---------------------------------------------------------------------------
// STEP 1 — positive control. Nothing below this line touches WordPress.
// ---------------------------------------------------------------------------
console.log( '\n--- STEP 1: positive control (can the harness see a javascript: URI execute at all?) ---' );

const controlPage = await browser.newContext().then( ( c ) => c.newPage() );
await controlPage.setContent( '<a id="raw-link" href="javascript:window.SGS_PWNED=true">raw unsanitised link</a>' );
await controlPage.click( '#raw-link' );
const controlFired = await controlPage.evaluate( () => window.SGS_PWNED === true );
await controlPage.close();

check(
	'positive control: clicking a raw javascript: href sets window.SGS_PWNED',
	controlFired,
	controlFired ? 'window.SGS_PWNED === true after click' : 'window.SGS_PWNED never set — the harness cannot observe execution in this environment'
);

if ( ! controlFired ) {
	console.log(
		'\n[ABORT] Positive control failed. A "blocked" result on the real path below would be ' +
			'indistinguishable from a broken probe — refusing to run or trust step 2. Fix the harness first ' +
			'(browser/CSP/context settings), do not report the real path as "safe".'
	);
	await browser.close();
	process.exit( 1 );
}

// ---------------------------------------------------------------------------
// STEP 2 — the real path.
// ---------------------------------------------------------------------------
console.log( `\n--- STEP 2: real path -> ${ REAL_PATH_URL } ---` );

const page = await browser.newContext().then( ( c ) => c.newPage() );
try {
	await page.goto( `${ REAL_PATH_URL }?cb=${ Date.now() }`, { waitUntil: 'load' } );
} catch ( err ) {
	console.log( `  [FAIL] navigation failed: ${ err.message }` );
	await browser.close();
	process.exit( 1 );
}

const anchor = page.locator( '#smil-anchor' );
const anchorCount = await anchor.count();
if ( 0 === anchorCount ) {
	console.log( '  [FAIL] #smil-anchor not found on the page — broken probe or fixture not built. Run build-smil-bypass-fixture.py --apply first.' );
	await browser.close();
	process.exit( 1 );
}

// Give the SMIL animation (begin="0s" dur="0.1s" fill="freeze") time to run
// and settle before reading the attribute or clicking.
await page.waitForTimeout( 500 );

const hrefAfterAnimate = await anchor.evaluate( ( el ) => el.getAttribute( 'href' ) );
check(
	'SMIL did NOT succeed in writing a live href attribute onto the sanitised <a>',
	null === hrefAfterAnimate,
	`getAttribute('href') = ${ JSON.stringify( hrefAfterAnimate ) }`
);

await anchor.click( { force: true } );
const realPathFired = await page.evaluate( () => window.SGS_PWNED === true );
check(
	'clicking the sanitised <a> did NOT execute the javascript: payload',
	! realPathFired,
	realPathFired ? 'window.SGS_PWNED === true — BYPASS SUCCEEDED' : 'window.SGS_PWNED never set'
);

await browser.close();

if ( realPathFired ) {
	console.log(
		'\n[STOP] The SMIL bypass SUCCEEDED against the real sanitiser. Do not patch under time ' +
			'pressure — report this to Bean per the owed-debts prompt instruction.'
	);
}

const failed = results.filter( ( r ) => ! r ).length;
console.log( `\nVERDICT: ${ failed ? 'FAIL' : 'PASS' } — ${ results.length - failed }/${ results.length } assertions held (positive control counted)\n` );
process.exit( failed ? 1 : 0 );

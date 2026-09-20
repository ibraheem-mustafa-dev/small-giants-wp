/**
 * elementfrompoint-sweep-selftest.mjs — negative controls for the
 * `elementFromPoint` occlusion sweep.
 *
 * A sweep that cannot fail reads green forever. Each control below runs a local,
 * in-memory fixture (no network) through the sweep's REAL open-and-sweep function
 * and its real pass/fail decision functions, and asserts the verdict:
 *
 *   1. POSITIVE   an open surface whose every probe lands inside it passes
 *                 (every probe passes, exit 0).
 *   2. OVERLAY    an element injected on top of part of the open surface must be
 *                 reported as a FAILURE (pass count below total, exit 1), and the
 *                 failure must name the covered probe and the overlay as the hit.
 *   3. VACUOUS    a surface that never opens must throw a vacuous error and map
 *                 to exit 3, never a pass.
 *
 * Each negative control first CONFIRMS its injected break landed, by measuring the
 * fixture DOM directly rather than through the sweep: a control whose break did
 * not land would pass for the wrong reason.
 *
 * The sweep functions are passed in by the caller rather than imported, because
 * the sweep script imports this module.
 */
'use strict';

import { EXIT } from './openness-guard.mjs';

const VIEWPORT = { width: 800, height: 600 };

// The open surface: a fixed panel at 100..400 x 100..300 holding two 60px links.
// `hidden` keeps it closed until the trigger runs its click handler.
const SURFACE = ( opensOnClick ) =>
	`<button id="t"${ opensOnClick ? ' onclick="document.getElementById(\'s\').hidden=false"' : '' }>Open</button>` +
	'<div id="s" hidden style="position:fixed;top:100px;left:100px;width:300px;height:200px;background:#fff">' +
	'<a id="a1" href="#one" style="display:block;height:60px">One</a>' +
	'<a id="a2" href="#two" style="display:block;height:60px">Two</a>' +
	'</div>';

// Sits over the first link only (100..160 vertically) and above the surface.
const OVERLAY =
	'<div id="ov" style="position:fixed;top:100px;left:100px;width:300px;height:60px;z-index:99;background:red"></div>';

const CONFIG = {
	openSelector: '#t',
	openScope: '#s',
	probes: [
		{ name: 'link-one', kind: 'self', selector: '#a1' },
		{ name: 'link-two', kind: 'self', selector: '#a2' },
		// (200, 180): inside the surface, below the overlay's 100..160 band.
		{ name: 'surface-point', kind: 'point', xRatio: 0.25, yRatio: 0.3, expectSelector: '#s' },
	],
};

async function load( page, html ) {
	await page.setContent( `<!doctype html><html><body style="margin:0">${ html }</body></html>` );
}

// Runs the sweep's own open-and-sweep, translating a thrown error into the exit
// code the real run would use.
async function runSweep( page, deps ) {
	try {
		const { results, guard } = await deps.openAndSweep( page, VIEWPORT.width, CONFIG );
		const { pass, total } = deps.tally( results );
		return { threw: null, results, guard, pass, total, exit: deps.exitCodeForTotals( pass, total ) };
	} catch ( e ) {
		return { threw: e, exit: deps.exitCodeForError( e ) };
	}
}

async function positiveControl( page, deps ) {
	await load( page, SURFACE( true ) );
	const run = await runSweep( page, deps );
	const ok = ! run.threw && run.total === 3 && run.pass === run.total && run.exit === EXIT.OK;
	return {
		name: 'open surface, every probe inside it -> all probes pass, exit 0',
		expected: '3/3 pass, exit 0',
		actual: run.threw ? `threw: ${ run.threw.message }` : `${ run.pass }/${ run.total }, exit ${ run.exit }`,
		ok,
		reason: 'the sweep did not pass a clean open surface',
	};
}

async function overlayControl( page, deps ) {
	const name = 'NEGATIVE CONTROL — overlay covering part of the open surface must FAIL, exit 1';
	await load( page, SURFACE( true ) + OVERLAY );

	// Confirm the break landed: with the surface open, the overlay exists and it
	// (not the first link) is what elementFromPoint returns at the link's centre.
	await page.click( '#t' );
	const landed = await page.evaluate( () => {
		const ov = document.getElementById( 'ov' );
		const link = document.getElementById( 'a1' );
		if ( ! ov || ! link ) return false;
		const r = link.getBoundingClientRect();
		return document.elementFromPoint( r.left + r.width / 2, r.top + r.height / 2 ) === ov;
	} );
	if ( ! landed ) {
		return {
			name, expected: 'overlay on top of link-one', actual: 'overlay did not cover link-one', ok: false,
			reason: 'the injected break did not land, so this control proves nothing',
		};
	}

	await load( page, SURFACE( true ) + OVERLAY );
	const run = await runSweep( page, deps );
	if ( run.threw ) {
		return { name, expected: '2/3 pass, exit 1', actual: `threw: ${ run.threw.message }`, ok: false, reason: 'the sweep threw instead of reporting' };
	}
	const failed = run.results.filter( ( r ) => ! r.pass );
	const namesCoveredProbe = failed.length === 1 && failed[ 0 ].name === 'link-one' &&
		String( failed[ 0 ].actual ).startsWith( 'div#ov' );
	return {
		name,
		expected: '2/3 pass, exit 1, link-one reported with div#ov as the hit',
		actual: `${ run.pass }/${ run.total }, exit ${ run.exit }, failed: ${ failed.map( ( r ) => `${ r.name } -> ${ r.actual }` ).join( ', ' ) || 'none' }`,
		ok: run.pass < run.total && run.exit === EXIT.FAILURES && namesCoveredProbe,
		reason: 'an overlay over the surface was not reported as a failure of the covered probe',
	};
}

async function vacuousControl( page, deps ) {
	const name = 'NEGATIVE CONTROL — surface that never opens must be VACUOUS, exit 3';
	await load( page, SURFACE( false ) );

	// Confirm the break landed: after clicking the trigger the surface is still closed.
	await page.click( '#t' );
	const stillClosed = await page.evaluate( () => {
		const s = document.getElementById( 's' );
		return !! s && s.hidden && window.getComputedStyle( s ).display === 'none';
	} );
	if ( ! stillClosed ) {
		return {
			name, expected: 'surface closed after the click', actual: 'surface is open', ok: false,
			reason: 'the injected break did not land, so this control proves nothing',
		};
	}

	await load( page, SURFACE( false ) );
	const run = await runSweep( page, deps );
	return {
		name,
		expected: 'vacuous error, exit 3, no pass',
		actual: run.threw
			? `threw (vacuous=${ Boolean( run.threw.vacuous ) }), exit ${ run.exit }`
			: `returned ${ run.pass }/${ run.total }, exit ${ run.exit }`,
		ok: Boolean( run.threw && run.threw.vacuous ) && run.exit === EXIT.VACUOUS,
		reason: 'a closed surface did not produce a vacuous exit',
	};
}

/**
 * Run the controls. Returns a result object; the caller sets the exit code.
 *
 * @param {Object}   deps
 * @param {Object}   deps.chromium            Playwright's chromium export.
 * @param {Function} deps.openAndSweep        The sweep's open + guard + probe function.
 * @param {Function} deps.tally               Counts passing probes.
 * @param {Function} deps.exitCodeForTotals   Maps pass/total to an exit code.
 * @param {Function} deps.exitCodeForError    Maps a thrown sweep error to an exit code.
 * @return {Promise<{ok: boolean, results: Array}>}
 */
export async function selfTest( deps ) {
	const browser = await deps.chromium.launch( { headless: true } );
	const results = [];
	try {
		const page = await browser.newPage( { viewport: VIEWPORT } );
		results.push( await positiveControl( page, deps ) );
		results.push( await overlayControl( page, deps ) );
		results.push( await vacuousControl( page, deps ) );
	} finally {
		await browser.close();
	}
	return { ok: results.every( ( r ) => r.ok ), results };
}

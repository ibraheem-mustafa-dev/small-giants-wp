/**
 * shoot-drawer-pairs-selftest.mjs — negative controls for shoot-drawer-pairs.mjs.
 *
 * WHY
 * ---
 * A capture harness that cannot fail reads green forever. Each control here
 * drives the script's REAL capture functions (`shootOurs`, `shootReference`) and
 * its REAL exit-code decision (`decideExit`) against in-memory `data:` fixtures —
 * no network, no live site — and asserts the harness reports what it should:
 *
 *   1. an open drawer is captured and reported OK (positive control);
 *   2. a CLOSED drawer is not captured, and counts as VACUOUS (exit 3);
 *   3. a cell that fails outright (no trigger on the page) is not captured and
 *      forces a non-zero exit (1), never 0;
 *   4. an unverified reference cannot be presented as a captured one.
 *
 * Every negative control first CONFIRMS its injected break landed by reading the
 * fixture DOM, so a fixture that silently stopped being broken cannot turn the
 * control into a vacuous pass.
 *
 * The capture functions are injected rather than imported: the script runs
 * `main()` on import, so importing it from here would launch a capture run.
 */
'use strict';

import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EXIT } from './openness-guard.mjs';

const DRAWER_OPEN_CLICK = "document.querySelector('dialog.sgs-nav-drawer').showModal()";

/**
 * Build a `data:` URL for a page whose markup matches what `shootOurs` selects:
 * a burger inside `.entry-content > nav.sgs-nav-bar-menu`, and a
 * `dialog.sgs-nav-drawer`.
 *
 * @param {string} inner Markup placed inside the nav element.
 * @return {string}
 */
function fixtureUrl( inner ) {
	const html = '<!doctype html><html><body><div class="entry-content">' +
		`<nav class="sgs-nav-bar-menu">${ inner }</nav></div></body></html>`;
	return `data:text/html;charset=utf-8,${ encodeURIComponent( html ) }`;
}

const DRAWER = '<dialog class="sgs-nav-drawer" style="width:300px;height:200px"><a href="#home">Home</a></dialog>';
const BURGER_WORKING = `<button class="sgs-nav-bar-menu__burger" onclick="${ DRAWER_OPEN_CLICK }">Menu</button>`;
const BURGER_DEAD = '<button class="sgs-nav-bar-menu__burger">Menu</button>';

const FIXTURES = {
	open: fixtureUrl( BURGER_WORKING + DRAWER ),
	closed: fixtureUrl( BURGER_DEAD + DRAWER ),
	noTrigger: fixtureUrl( DRAWER ),
};

/**
 * Read the fixture's drawer/burger state, optionally after clicking the burger.
 *
 * @param {import('playwright').Page} page
 * @param {string}                    url
 * @param {boolean}                   clickBurger
 * @return {Promise<{burgerCount: number, dialogCount: number, dialogOpen: boolean|null}>}
 */
async function probe( page, url, clickBurger ) {
	await page.goto( url );
	if ( clickBurger ) {
		await page.locator( '.sgs-nav-bar-menu__burger' ).first().click();
	}
	return page.evaluate( () => {
		const dialog = document.querySelector( 'dialog.sgs-nav-drawer' );
		return {
			burgerCount: document.querySelectorAll( '.sgs-nav-bar-menu__burger' ).length,
			dialogCount: document.querySelectorAll( 'dialog.sgs-nav-drawer' ).length,
			dialogOpen: dialog ? dialog.open : null,
		};
	} );
}

/**
 * Run the controls. Returns a result object; the caller sets the exit code.
 *
 * @param {Object}   deps
 * @param {Object}   deps.chromium       Playwright's chromium export.
 * @param {Function} deps.shootOurs      The script's own capture of OUR drawer.
 * @param {Function} deps.shootReference The script's own reference capture.
 * @param {Function} deps.decideExit     The script's own exit-code decision.
 * @return {Promise<{ok: boolean, results: Array}>}
 */
export async function runShootSelfTest( { chromium, shootOurs, shootReference, decideExit } ) {
	const results = [];
	const record = ( name, expected, actual, reason ) => {
		results.push( { name, expected: String( expected ), actual: String( actual ), ok: expected === actual, reason } );
	};
	const cell = ( ours, referenceShot ) => ( { variant: 'selftest', reference: 'selftest', width: 1440, ours, referenceShot } );
	const skippedRef = { ok: false, status: 'SKIPPED', why: 'skipped (--ours-only)' };

	const tmp = mkdtempSync( path.join( os.tmpdir(), 'shoot-drawer-selftest-' ) );
	const browser = await chromium.launch( { headless: true } );
	try {
		const probePage = await browser.newPage( { viewport: { width: 1440, height: 900 } } );

		// 1. Positive control: an open drawer is captured.
		const openFile = path.join( tmp, 'open.png' );
		const openBefore = await probe( probePage, FIXTURES.open, false );
		record(
			'fixture — open drawer starts closed and opens on click (precondition for the positive control)',
			'closed->open',
			`${ openBefore.dialogOpen ? 'open' : 'closed' }->${ ( await probe( probePage, FIXTURES.open, true ) ).dialogOpen ? 'open' : 'closed' }`,
			`burgers=${ openBefore.burgerCount } dialogs=${ openBefore.dialogCount }`
		);
		const openShot = await shootOurs( browser, FIXTURES.open, 1440, openFile );
		record( 'open drawer is captured → ok:true, PASS', 'ok:true PASS', `ok:${ openShot.ok } ${ openShot.status }`, openShot.why || openShot.guard );
		const openWritten = existsSync( openFile ) && statSync( openFile ).size > 0;
		record( 'open drawer → screenshot file written and non-empty', 'written', openWritten ? 'written' : 'missing', openFile );
		record(
			'exit decision — all ours captured, references skipped → EXIT.OK',
			EXIT.OK,
			decideExit( [ cell( openShot, skippedRef ) ], { oursOnly: true } ).code,
			'positive control for the exit decision'
		);

		// 2. Negative control: a closed drawer must be VACUOUS, not captured.
		const closedProbe = await probe( probePage, FIXTURES.closed, true );
		record(
			'NEGATIVE CONTROL precondition — closed fixture has a burger and a dialog, and the click leaves the dialog closed',
			'burger+dialog, closed',
			closedProbe.burgerCount === 1 && closedProbe.dialogCount === 1 && closedProbe.dialogOpen === false
				? 'burger+dialog, closed'
				: `burgers=${ closedProbe.burgerCount } dialogs=${ closedProbe.dialogCount } open=${ closedProbe.dialogOpen }`,
			'the injected break must be present in the DOM before the capture is judged'
		);
		const closedFile = path.join( tmp, 'closed.png' );
		const closedShot = await shootOurs( browser, FIXTURES.closed, 1440, closedFile );
		record( 'NEGATIVE CONTROL — closed drawer must be VACUOUS, not ok', 'ok:false VACUOUS', `ok:${ closedShot.ok } ${ closedShot.status }`, closedShot.why );
		record(
			'NEGATIVE CONTROL — closed drawer must NOT be captured as a reference image',
			'missing',
			existsSync( closedFile ) ? 'written' : 'missing',
			closedFile
		);
		record(
			'NEGATIVE CONTROL — a VACUOUS ours cell must exit EXIT.VACUOUS (3)',
			EXIT.VACUOUS,
			decideExit( [ cell( closedShot, skippedRef ) ], { oursOnly: true } ).code,
			'a closed drawer must never exit 0'
		);

		// 3. Negative control: a cell that fails outright must move the exit code.
		const bareProbe = await probe( probePage, FIXTURES.noTrigger, false );
		record(
			'NEGATIVE CONTROL precondition — no-trigger fixture has a dialog and ZERO burger elements',
			'0 burgers, 1 dialog',
			`${ bareProbe.burgerCount } burgers, ${ bareProbe.dialogCount } dialog`,
			'the injected break must be present in the DOM before the capture is judged'
		);
		const bareFile = path.join( tmp, 'no-trigger.png' );
		const bareShot = await shootOurs( browser, FIXTURES.noTrigger, 1440, bareFile );
		record( 'NEGATIVE CONTROL — missing trigger must fail the cell (ok:false ERROR)', 'ok:false ERROR', `ok:${ bareShot.ok } ${ bareShot.status }`, bareShot.why );
		record(
			'NEGATIVE CONTROL — a failed cell must NOT leave a screenshot behind',
			'missing',
			existsSync( bareFile ) ? 'written' : 'missing',
			bareFile
		);
		record(
			'NEGATIVE CONTROL — a failed ours cell must exit EXIT.FAILURES (1), never 0',
			EXIT.FAILURES,
			decideExit( [ cell( bareShot, skippedRef ) ], { oursOnly: true } ).code,
			'a failed capture must move the exit code'
		);
		record(
			'NEGATIVE CONTROL — a VACUOUS cell alongside a failed cell still reports EXIT.VACUOUS (3)',
			EXIT.VACUOUS,
			decideExit( [ cell( bareShot, skippedRef ), cell( closedShot, skippedRef ) ], { oursOnly: true } ).code,
			'vacuous outranks a plain failure'
		);

		// 4. Negative control: an unverified reference is not a captured reference.
		const noRecipeFile = path.join( tmp, 'reference.png' );
		const noRecipe = await shootReference( browser, 'selftest.invalid', 1440, noRecipeFile, false );
		record(
			'NEGATIVE CONTROL precondition — the reference name has no trigger recipe (no network is touched)',
			'NO_RECIPE',
			noRecipe.status,
			noRecipe.why
		);
		record(
			'NEGATIVE CONTROL — a reference with no recipe is not ok and leaves no file',
			'ok:false missing',
			`ok:${ noRecipe.ok } ${ existsSync( noRecipeFile ) ? 'written' : 'missing' }`,
			noRecipe.why
		);
		record(
			'NEGATIVE CONTROL — good ours + uncaptured reference must exit EXIT.FAILURES (1) when references are wanted',
			EXIT.FAILURES,
			decideExit( [ cell( openShot, noRecipe ) ], { oursOnly: false } ).code,
			'an unverified reference is not a reference'
		);
	} finally {
		await browser.close();
		rmSync( tmp, { recursive: true, force: true } );
	}
	return { ok: results.every( ( r ) => r.ok ), results };
}

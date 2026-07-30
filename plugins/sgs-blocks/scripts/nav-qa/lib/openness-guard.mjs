/**
 * openness-guard.mjs — the shared "is this surface GENUINELY open?" primitive
 * for every nav-qa script that measures or captures an interactive surface.
 *
 * WHY THIS EXISTS
 * ---------------
 * A `<dialog>` is in the DOM whether open or closed, and axe's default
 * `excludeHidden` skips hidden subtrees — so a scoped run on a CLOSED drawer
 * returns "0 violations" identically to an open one. On 2026-07-29 a guard was
 * added to `axe-run.mjs` for exactly this. A DP7 review on 2026-07-30 then found
 * the SAME hole still open in three other scripts:
 *
 *   - `shoot-drawer-pairs.mjs`  — screenshots the REFERENCE site with no open
 *     check at all (this is how a closed homepage became "the reference"), and
 *     a failed capture cell never affects the exit code.
 *   - `sweep-drawer-variants.mjs` — `openDrawer()` clicks and assumes; vacuity is
 *     recorded as data but folded into exit 1, indistinguishable from a real FAIL.
 *   - `elementfrompoint-sweep.mjs` — clicks, waits 350ms, hopes.
 *
 * Fixing each in place would have produced four divergent copies of the one
 * check that matters. So the guard lives here once, and every script imports it.
 *
 * DESIGN NOTE — this module returns DATA, never printed output.
 * ------------------------------------------------------------
 * The original guard interleaved measurement with `process.stdout.write` and
 * `process.exit` (axe-run.mjs:312-325), which is precisely why it could not be
 * reused. Everything here is pure: `measureOpenness()` reads the DOM,
 * `assessOpenness()` judges it, and the CALLER decides how to format and which
 * exit code to use. `EXIT` publishes the shared code vocabulary so "3 means
 * vacuous" is stated in one place rather than re-invented per script.
 *
 * Canonical rule: STOP-A-SCOPED-AXE-RUN-ON-A-CLOSED-SURFACE-PASSES-VACUOUSLY.
 * Sibling rule: a check that cannot fail reads green forever — see `selfTest()`.
 */
'use strict';

/**
 * Shared exit-code vocabulary for the nav-qa harness.
 *
 * 3 (VACUOUS) is the load-bearing one: it separates "the surface was not open,
 * so this run proves NOTHING" from "the surface was open and genuinely failed"
 * (1). Before this existed, both collapsed to 1 and a vacuous run looked like a
 * real defect — or worse, a closed surface passed as a clean 0.
 */
export const EXIT = {
	OK: 0,
	FAILURES: 1,
	USAGE: 2,
	VACUOUS: 3,
};

/**
 * Elements a user can actually reach with Tab. A panel you cannot Tab into is
 * not an open panel, which is why `focusableCount === 0` is a guard failure and
 * not merely a warning.
 */
export const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'details > summary',
	'[tabindex]:not([tabindex="-1"])',
].join( ',' );

/**
 * Thrown by `openSurface()` so the caller owns the exit code and the wording.
 * `kind` lets a caller distinguish "the selector is wrong" (a harness bug) from
 * "the trigger cannot take focus" (a real accessibility defect in the product).
 */
export class OpenError extends Error {
	constructor( kind, message ) {
		super( message );
		this.name = 'OpenError';
		this.kind = kind;
	}
}

/**
 * Scroll a trigger to mid-viewport before interacting with it.
 *
 * A STICKY site header otherwise intercepts the click on a trigger near the top
 * of the page: the element reports visible + enabled and the click still never
 * lands (measured 2026-07-29 at 375px).
 *
 * @param {import('playwright').Page} page
 * @param {string}                    selector
 */
export async function scrollTriggerIntoView( page, selector ) {
	await page.evaluate( ( sel ) => {
		const node = document.querySelector( sel );
		if ( ! node ) return;
		const r = node.getBoundingClientRect();
		window.scrollBy( 0, r.top - window.innerHeight / 2 );
	}, selector );
	await page.waitForTimeout( 250 );
}

/**
 * Open a surface by clicking or keyboard-activating its trigger.
 *
 * `openVia` matters and is not a preference:
 *
 *   click    — clicks, then parks the pointer at (2,2). The park is REQUIRED for
 *              a `<dialog>`: after a click the cursor stays put, an opened panel
 *              frequently renders a link underneath it, and that link then sits
 *              in `:hover` — measured 2026-07-29, this manufactured a "serious
 *              color-contrast" violation on one drawer link (2.14:1) that
 *              vanished the moment the pointer moved. A real-looking failure
 *              describing nothing a user would see at rest.
 *   keyboard — focuses the trigger and presses Enter. REQUIRED for a hover-bridge
 *              surface (the desktop mega panel), whose leave-bridge + 170ms grace
 *              closes it the instant the pointer parks. Measured on canary page
 *              1842: click-then-hold = open 1120x499; click-then-move = closed.
 *              Every mega axe run before this path existed ended VACUOUS.
 *
 * @param {import('playwright').Page} page
 * @param {Object}                    opts
 * @param {string}                    opts.open        Trigger selector.
 * @param {string}                    [opts.openVia]   'click' | 'keyboard'.
 * @param {number}                    [opts.settleMs]  Transition settle time.
 * @throws {OpenError}
 */
export async function openSurface( page, { open, openVia = 'click', settleMs = 350 } ) {
	const trigger = page.locator( open );
	if ( await trigger.count() === 0 ) {
		throw new OpenError( 'not-found', `--open selector "${ open }" matched 0 elements on the page.` );
	}

	/*
	 * A trigger that is PRESENT but not VISIBLE is a different fact from one that
	 * is visible and refuses to open, and conflating them makes the harness lie in
	 * one direction or the other.
	 *
	 * The live case that forced this distinction (2026-07-30, W2-a Gate 2): a
	 * burger is CSS-hidden at and above `collapsePoint`, so at 1440px and 768px it
	 * cannot be clicked — by this probe or by a user. There is simply no open state
	 * to measure at that width. Reporting that as a harness FAULT would cry wolf on
	 * every desktop breakpoint forever, and the usual response to a check that
	 * always complains is to stop believing it.
	 *
	 * But the opposite error is worse: silently treating it as fine let a run that
	 * measured 1 of 3 breakpoints exit 0. So this is surfaced as its own kind —
	 * `not-visible` — and the CALLER decides. The rule callers must honour: a
	 * breakpoint with no open state is UNMEASURED, and a run where NOTHING was
	 * measured is never a pass.
	 */
	const visible = await trigger.first().isVisible().catch( () => false );
	if ( ! visible ) {
		throw new OpenError(
			'not-visible',
			`the trigger "${ open }" exists but is not visible at this viewport, so there is ` +
			'no open state to measure here. This is NOT a failure and NOT a pass — it is UNMEASURED.'
		);
	}

	await scrollTriggerIntoView( page, open );

	if ( openVia === 'keyboard' ) {
		try {
			await trigger.first().focus( { timeout: 15000 } );
		} catch ( e ) {
			throw new OpenError(
				'not-focusable',
				`the trigger "${ open }" could not be focused — ${ e.message.split( '\n' )[ 0 ] }. ` +
				'A trigger that cannot take keyboard focus is itself a defect. This is NOT a pass.'
			);
		}
		await page.keyboard.press( 'Enter' );
	} else {
		try {
			await trigger.first().click( { timeout: 15000 } );
		} catch ( e ) {
			throw new OpenError(
				'not-clickable',
				`the trigger "${ open }" could not be clicked — ${ e.message.split( '\n' )[ 0 ] }. ` +
				'Something is intercepting the click (commonly a sticky header). This is NOT a pass.'
			);
		}
		await page.mouse.move( 2, 2 );
	}

	await page.waitForTimeout( settleMs );
}

/**
 * Read the scope's ACTUAL rendered state. Pure measurement — no judgement.
 *
 * @param {import('playwright').Page} page
 * @param {string}                    scope
 * @return {Promise<Object|null>} Measurement, or null if the scope is absent.
 */
export async function measureOpenness( page, scope ) {
	return page.evaluate( ( { scopeSelector, focusableSelector } ) => {
		const el = document.querySelector( scopeSelector );
		if ( ! el ) return null;
		const rect = el.getBoundingClientRect();
		const style = window.getComputedStyle( el );
		const focusables = Array.from( el.querySelectorAll( focusableSelector ) ).filter( ( f ) => {
			const r = f.getBoundingClientRect();
			const s = window.getComputedStyle( f );
			return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
		} );
		return {
			tag: el.tagName,
			isDialog: el.tagName === 'DIALOG',
			dialogOpen: el.tagName === 'DIALOG' ? !! el.open : null,
			width: Math.round( rect.width ),
			height: Math.round( rect.height ),
			display: style.display,
			visibility: style.visibility,
			opacity: style.opacity,
			ariaHidden: el.getAttribute( 'aria-hidden' ),
			hiddenAttr: el.hasAttribute( 'hidden' ),
			focusableCount: focusables.length,
		};
	}, { scopeSelector: scope, focusableSelector: FOCUSABLE_SELECTOR } );
}

/**
 * Should the guard enforce openness for this run?
 *
 * Armed when the run IMPLIES an opened surface (a trigger was given, or the
 * scope resolves to a `<dialog>`), or on explicit demand. `allowClosed` disarms
 * deliberately — and callers must stamp such results UNGUARDED so an unguarded
 * result can never be mistaken for a guarded one.
 *
 * @param {Object} opts
 * @return {boolean}
 */
export function isArmed( { allowClosed = false, requireOpen = false, open = null, measured = null } ) {
	if ( allowClosed ) return false;
	return Boolean( requireOpen || open || measured?.isDialog );
}

/**
 * Judge a measurement. Pure — returns a verdict, prints nothing, exits nothing.
 *
 * @param {Object|null} measured
 * @param {Object}      opts
 * @return {{status: string, reason: string, failures: string[], measured: Object|null}}
 *         status ∈ PASS | VACUOUS | SKIPPED | NOT_ARMED | NOT_APPLICABLE
 */
export function assessOpenness( measured, { armed, allowClosed = false, scope = null } = {} ) {
	if ( ! scope ) {
		return { status: 'NOT_APPLICABLE', reason: 'no scope given', failures: [], measured };
	}
	if ( allowClosed ) {
		return {
			status: 'SKIPPED',
			reason: 'allow-closed passed; this result is UNGUARDED',
			failures: [],
			measured,
		};
	}
	if ( ! armed ) {
		return {
			status: 'NOT_ARMED',
			reason: 'static scope, no trigger and not a <dialog>; require-open enforces it',
			failures: [],
			measured,
		};
	}

	const failures = [];
	if ( ! measured ) {
		failures.push( 'scope element not present at measurement time' );
	} else {
		if ( measured.isDialog && ! measured.dialogOpen ) {
			failures.push( '<dialog> has no open property — it is CLOSED' );
		}
		if ( measured.width === 0 || measured.height === 0 ) {
			failures.push( `rendered box is ${ measured.width }x${ measured.height } (zero-size)` );
		}
		if ( measured.display === 'none' ) failures.push( 'computed display:none' );
		if ( measured.visibility === 'hidden' ) failures.push( 'computed visibility:hidden' );
		if ( parseFloat( measured.opacity ) === 0 ) failures.push( 'computed opacity:0' );
		if ( measured.ariaHidden === 'true' ) failures.push( 'aria-hidden="true"' );
		if ( measured.hiddenAttr ) failures.push( 'the [hidden] attribute is present' );
		if ( measured.focusableCount === 0 ) {
			failures.push( 'contains 0 visible focusable elements — nothing to Tab into' );
		}
	}

	if ( failures.length ) {
		return { status: 'VACUOUS', reason: failures.join( '; ' ), failures, measured };
	}

	return {
		status: 'PASS',
		reason: `open and interactive: ${ measured.width }x${ measured.height }, ` +
			`${ measured.focusableCount } focusable element(s)`,
		failures: [],
		measured,
	};
}

/**
 * Measure + judge in one call. The convenience entry point most callers want.
 *
 * @param {import('playwright').Page} page
 * @param {Object}                    opts
 * @return {Promise<Object>} The verdict from `assessOpenness()`.
 */
export async function guardScope( page, { scope, open = null, requireOpen = false, allowClosed = false } ) {
	if ( ! scope ) {
		return assessOpenness( null, { armed: false, allowClosed, scope: null } );
	}
	const measured = await measureOpenness( page, scope );
	const armed = isArmed( { allowClosed, requireOpen, open, measured } );
	return assessOpenness( measured, { armed, allowClosed, scope } );
}

/**
 * Format a VACUOUS verdict for a human. Kept here so every script says the same
 * thing, but deliberately a SEPARATE function from the judgement above.
 *
 * @param {string} scope
 * @param {Object} verdict
 * @return {string}
 */
export function formatVacuous( scope, verdict ) {
	return (
		`VACUOUS — the scoped surface "${ scope }" was NOT genuinely open, ` +
		'so a result here would prove nothing.\n' +
		`  Why: ${ verdict.failures.join( '\n  Why: ' ) }\n` +
		'  Fix the open step (or the selector) and re-run. This is NOT a pass.\n'
	);
}

/* ------------------------------------------------------------------------- *
 * NEGATIVE CONTROLS
 *
 * A gate that cannot fail reads green forever. Before this, the guard's only
 * proof of function was a prose note in README.md recording a manual run — not
 * re-runnable, and therefore not evidence. Each case below INJECTS a violation
 * and asserts the guard catches it; if the guard is ever broken or short-
 * circuited, these fail loudly.
 * ------------------------------------------------------------------------- */

const SELF_TEST_CASES = [
	{
		name: 'open dialog with a focusable link → PASS',
		html: '<dialog open id="s" style="width:300px;height:200px"><a href="#x">Link</a></dialog>',
		expect: 'PASS',
	},
	{
		name: 'NEGATIVE CONTROL — closed dialog must be VACUOUS, not a clean pass',
		html: '<dialog id="s" style="width:300px;height:200px"><a href="#x">Link</a></dialog>',
		expect: 'VACUOUS',
	},
	{
		name: 'NEGATIVE CONTROL — open dialog with nothing focusable must be VACUOUS',
		html: '<dialog open id="s" style="width:300px;height:200px"><p>Just text</p></dialog>',
		expect: 'VACUOUS',
	},
	{
		// NB the padding/border reset is load-bearing, not tidiness: a <dialog>
		// carries UA default padding (1em) + a 2px border, so `width:0;height:0`
		// alone still renders a 38x38 border-box and the guard is RIGHT to call
		// that open. Caught by this very self-test on first run, 2026-07-30 —
		// a bad fixture, not a bad guard.
		name: 'NEGATIVE CONTROL — zero-size surface must be VACUOUS',
		html: '<dialog open id="s" style="width:0;height:0;padding:0;border:0"><a href="#x">Link</a></dialog>',
		expect: 'VACUOUS',
	},
	{
		name: 'NEGATIVE CONTROL — aria-hidden surface must be VACUOUS',
		html: '<dialog open id="s" aria-hidden="true" style="width:300px;height:200px"><a href="#x">L</a></dialog>',
		expect: 'VACUOUS',
	},
	{
		name: 'NEGATIVE CONTROL — opacity:0 surface must be VACUOUS',
		html: '<dialog open id="s" style="width:300px;height:200px;opacity:0"><a href="#x">L</a></dialog>',
		expect: 'VACUOUS',
	},
	{
		name: 'allow-closed on a closed dialog → SKIPPED and stamped UNGUARDED',
		html: '<dialog id="s" style="width:300px;height:200px"><a href="#x">Link</a></dialog>',
		allowClosed: true,
		expect: 'SKIPPED',
	},
];

/*
 * Cases for openSurface() specifically. The guardScope cases above judge a
 * surface's STATE; these judge the ACT of opening it, which is a separate code
 * path and was covered by nothing until 2026-07-30.
 *
 * The middle case is the one that matters. A trigger which is present but hidden
 * (a burger above its `collapsePoint`) must be distinguishable from one that is
 * visible and broken — because the consumer treats the first as UNMEASURED and
 * the second as a fault, and it exits 3 either way if NOTHING was measured. Get
 * this classification wrong and the harness either cries wolf on every desktop
 * breakpoint or goes quiet on a run that compared nothing.
 */
const OPEN_TRIGGER_CASES = [
	{
		name: 'visible trigger opens the surface → no throw',
		html: '<button id="t" onclick="document.getElementById(\'s\').showModal()">Open</button>' +
			'<dialog id="s" style="width:300px;height:200px"><a href="#x">Link</a></dialog>',
		expectKind: null,
	},
	{
		name: 'NEGATIVE CONTROL — hidden trigger must throw kind "not-visible" (UNMEASURED, not a fault)',
		html: '<button id="t" style="display:none">Open</button>' +
			'<dialog id="s" style="width:300px;height:200px"><a href="#x">Link</a></dialog>',
		expectKind: 'not-visible',
	},
	{
		name: 'NEGATIVE CONTROL — absent trigger must throw kind "not-found"',
		html: '<dialog id="s" style="width:300px;height:200px"><a href="#x">Link</a></dialog>',
		expectKind: 'not-found',
	},
];

/**
 * Run the negative controls. Returns a result object; the caller sets the exit
 * code (so this stays importable from a test runner as well as a CLI).
 *
 * @param {Object} deps
 * @param {Object} deps.chromium Playwright's chromium export.
 * @return {Promise<{ok: boolean, results: Array}>}
 */
export async function selfTest( { chromium } ) {
	const browser = await chromium.launch( { headless: true } );
	const results = [];
	try {
		const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
		for ( const testCase of SELF_TEST_CASES ) {
			await page.setContent( `<!doctype html><html><body>${ testCase.html }</body></html>` );
			const verdict = await guardScope( page, {
				scope: '#s',
				requireOpen: true,
				allowClosed: Boolean( testCase.allowClosed ),
			} );
			results.push( {
				name: testCase.name,
				expected: testCase.expect,
				actual: verdict.status,
				ok: verdict.status === testCase.expect,
				reason: verdict.reason,
			} );
		}

		for ( const testCase of OPEN_TRIGGER_CASES ) {
			await page.setContent( `<!doctype html><html><body>${ testCase.html }</body></html>` );
			let actualKind = null;
			let reason = 'opened without error';
			try {
				await openSurface( page, { open: '#t', openVia: 'click', settleMs: 50 } );
			} catch ( e ) {
				actualKind = e && e.kind ? e.kind : 'unknown-error';
				reason = e.message;
			}
			results.push( {
				name: testCase.name,
				expected: testCase.expectKind === null ? 'no throw' : testCase.expectKind,
				actual: actualKind === null ? 'no throw' : actualKind,
				ok: actualKind === testCase.expectKind,
				reason,
			} );
		}
	} finally {
		await browser.close();
	}
	return { ok: results.every( ( r ) => r.ok ), results };
}

/**
 * CLI entry: `node lib/openness-guard.mjs --self-test`
 */
if ( process.argv[ 1 ] && process.argv[ 1 ].endsWith( 'openness-guard.mjs' ) ) {
	if ( process.argv.includes( '--self-test' ) ) {
		const { chromium } = await import( 'playwright' );
		const { ok, results } = await selfTest( { chromium } );
		for ( const r of results ) {
			process.stdout.write(
				`${ r.ok ? 'PASS' : 'FAIL' }  ${ r.name }\n` +
				`      expected ${ r.expected }, got ${ r.actual }${ r.ok ? '' : ` — ${ r.reason }` }\n`
			);
		}
		const failed = results.filter( ( r ) => ! r.ok ).length;
		process.stdout.write(
			`\n${ results.length - failed }/${ results.length } guard self-tests passed.\n` +
			( ok
				? 'The openness guard can still FAIL when it should. Its results mean something.\n'
				: 'THE GUARD IS BROKEN — it did not catch an injected violation. Do not trust any run.\n' )
		);
		process.exit( ok ? EXIT.OK : EXIT.FAILURES );
	} else {
		process.stderr.write(
			'openness-guard.mjs is a library. Run it directly only with --self-test.\n'
		);
		process.exit( EXIT.USAGE );
	}
}

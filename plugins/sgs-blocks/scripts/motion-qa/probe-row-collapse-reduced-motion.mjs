/**
 * Header row-collapse under `prefers-reduced-motion` (Spec 37 FR-37-40 / Spec 38 §12).
 *
 * WHAT THIS SETTLES. Spec 38 §12 carried `P-ROW-COLLAPSE-RESIDUALS` as an open honesty
 * flag: the reduced-motion arm of the per-row collapse was "correct by construction" but
 * never observed. The chain it asserts is four links long and every one was reasoned:
 *
 *   header-behaviours.css `@media (prefers-reduced-motion: reduce)` strips the transition
 *     -> getComputedStyle(row).transitionDuration computes to ~0
 *     -> transitionMs() (header-behaviours/view.js) returns 0
 *     -> the cleanup timer fires at ~50ms instead of ~250ms
 *     -> the transient inline `block-size` is cleared rather than awaiting a
 *        `transitionend` that will never fire.
 *
 * The failure this guards against is a row left permanently stuck at an inline height,
 * which is invisible to every static gate and only appears for a visitor who has the OS
 * setting on -- i.e. exactly the audience the setting exists to protect.
 *
 * ⛔ WHY IT REWRITES THE HTML RESPONSE. The canary's header carries NO row behaviour, so
 * there is nothing to observe by default, and three cheaper routes were tried and all
 * three failed for reasons worth recording so nobody repeats them:
 *
 *   1. An IN-PAGE fixture (a second `sgs/site-header` in page content) cannot work:
 *      `view.js:67` resolves the header with
 *      `document.querySelector('header.sgs-site-header')`, which returns the FIRST header
 *      in the document -- always the global one, never the fixture.
 *   2. Editing template part 2671 in the database does nothing. `parts/header.html` is a
 *      one-line `<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->`, so the
 *      rendered header comes from `theme/sgs-theme/patterns/framework-header-default.php`.
 *      Hours were lost to this: the attribute stored fine, the deployed render.php had the
 *      logic, both caches were purged, and the class still never appeared -- because the
 *      edited post was not what renders.
 *   3. Marking the row from `addInitScript` on `DOMContentLoaded` is TOO LATE. The view
 *      module is deferred, so it executes and scans before DOMContentLoaded fires.
 *      (Marking it earlier via MutationObserver also fails: at document-start
 *      `document.documentElement` is still null and `observe()` throws.)
 *
 * Rewriting the response body puts the marker in the SOURCE, which is what a real fixture
 * would do, and mutates no live content. The alternative -- enabling the behaviour in the
 * framework's default header pattern -- would change every site using the theme to make
 * one test possible.
 *
 * MEASURED 2026-08-27 (both arms, live):
 *   no-preference : transitionDuration "0.2s x5" · collapse engaged · inline "0px" ->
 *                   cleared to "(none)" after restore
 *   reduce        : transitionDuration "1e-05s"  · collapse engaged · inline "0px" ->
 *                   cleared to "(none)" after restore
 *
 * ⭐ The reduce arm still COLLAPSES. That is correct and is the point: reduced motion
 * removes the animation, never the behaviour. A run where `reduce` failed to collapse
 * would be a regression, not a pass.
 *
 * Usage: node scripts/motion-qa/probe-row-collapse-reduced-motion.mjs
 * Exit 0 = both arms clean. Exit 1 = a real failure. Exit 2 = INCONCLUSIVE (could not set
 * the fixture up at all) -- reported separately from a failure, per this directory's rule
 * that a probe must never let "could not measure" masquerade as "measured fine".
 */

import { chromium } from 'playwright';

const URL = 'https://sandybrown-nightingale-600381.hostingersite.com/';

/** Read the row's transient inline height, whatever form it is written in. */
const inlineHeight = ( r ) =>
	r.style.getPropertyValue( 'block-size' ) || r.style.blockSize || '(none)';

async function arm( browser, reduced ) {
	const ctx = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		reducedMotion: reduced ? 'reduce' : 'no-preference',
	} );
	const page = await ctx.newPage();

	await page.route( URL, async ( route ) => {
		const res = await route.fetch();
		let html = await res.text();
		html = html.replace(
			'sgs-site-header-row sgs-shr-',
			'sgs-site-header-row sgs-row-behaviour sgs-shr-'
		);
		html = html.replace(
			/(class="[^"]*sgs-row-behaviour[^"]*")/,
			'$1 data-sgs-row-hide-on-scroll="desktop tablet mobile"'
		);
		await route.fulfill( {
			response: res,
			body: html,
			headers: { ...res.headers(), 'content-length': undefined },
		} );
	} );

	await page.goto( URL, { waitUntil: 'domcontentloaded', timeout: 60000 } );
	await page.waitForTimeout( 2500 );

	const setup = await page.evaluate( () => {
		const header = document.querySelector( 'header.sgs-site-header' );
		const row = document.querySelector( '.sgs-row-behaviour' );
		return {
			headerPinned: header
				? [ 'sticky', 'fixed' ].includes( getComputedStyle( header ).position )
				: false,
			rowPresent: !! row,
			transitionDuration: row ? getComputedStyle( row ).transitionDuration : null,
		};
	} );

	if ( ! setup.rowPresent || ! setup.headerPinned ) {
		await ctx.close();
		return { reduced, inconclusive: 'fixture not established (row missing or header not pinned)', setup };
	}

	await page.evaluate( () => window.scrollTo( 0, 1400 ) );
	await page.waitForTimeout( 1000 );
	const during = await page.evaluate( ( fn ) => {
		const r = document.querySelector( '.sgs-row-behaviour' );
		return {
			collapseMode: r.classList.contains( 'is-row-collapse-mode' ),
			inline: r.style.getPropertyValue( 'block-size' ) || '(none)',
		};
	} );

	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await page.waitForTimeout( 1500 );
	const after = await page.evaluate( () => {
		const r = document.querySelector( '.sgs-row-behaviour' );
		return {
			inline: r.style.getPropertyValue( 'block-size' ) || '(none)',
			styleAttr: r.getAttribute( 'style' ) || '(none)',
		};
	} );

	await ctx.close();
	return { reduced, setup, during, after };
}

const browser = await chromium.launch();
const results = [ await arm( browser, false ), await arm( browser, true ) ];
await browser.close();

const failures = [];
const inconclusive = [];

for ( const r of results ) {
	const label = r.reduced ? 'reduce' : 'no-preference';
	if ( r.inconclusive ) {
		inconclusive.push( `${ label }: ${ r.inconclusive }` );
		continue;
	}
	console.log(
		`${ label.padEnd( 14 ) } transition=${ r.setup.transitionDuration } ` +
			`collapsed=${ r.during.collapseMode } during=${ r.during.inline } after=${ r.after.inline }`
	);

	// THE assertion Spec 38 section 12 owed: nothing left stuck at an inline height.
	if ( '(none)' !== r.after.inline ) {
		failures.push(
			`${ label }: inline block-size "${ r.after.inline }" REMAINS after restore — the row is stuck at a fixed height`
		);
	}
	// Reduced motion must remove the ANIMATION, not the BEHAVIOUR.
	if ( ! r.during.collapseMode ) {
		failures.push( `${ label }: collapse never engaged — the behaviour itself is broken, not just its animation` );
	}
	if ( r.reduced ) {
		const ms = parseFloat( r.setup.transitionDuration );
		if ( Number.isFinite( ms ) && ms > 0.05 ) {
			failures.push(
				`reduce: transitionDuration is ${ r.setup.transitionDuration } — the reduced-motion CSS is NOT stripping the transition`
			);
		}
	}
}

console.log( '\n=== VERDICT ===' );
if ( inconclusive.length ) {
	console.log( 'INCONCLUSIVE:\n - ' + inconclusive.join( '\n - ' ) );
	process.exit( 2 );
}
if ( failures.length ) {
	console.log( 'FAIL:\n - ' + failures.join( '\n - ' ) );
	process.exit( 1 );
}
console.log(
	'PASS — both arms collapse, and neither leaves an inline block-size behind.\n' +
		'Reduced motion strips the transition while preserving the behaviour.'
);

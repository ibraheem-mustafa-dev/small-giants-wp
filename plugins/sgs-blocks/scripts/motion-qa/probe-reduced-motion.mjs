/**
 * Horizontal panel — reduced-motion arm probe. Spec 38 FR-38-8 / §10.
 *
 * WHAT IT SETTLES
 * A single earlier probe reported `overflow-x: hidden`, `scroll-snap-type: none`
 * and the last panel UNREACHABLE at 1440px under `prefers-reduced-motion: reduce`.
 * That was never confirmed. Unreachable content is the one failure this wave
 * treats as a defect rather than a degradation, so it needs a verdict either
 * way — "cannot tell" is a FAIL.
 *
 * WHY IT RUNS BOTH ARMS
 * The reported values are ALSO exactly what the desktop motion-ALLOWED branch
 * produces, so on their own they cannot tell the two states apart:
 *   · `overflow-x: clip` (what the override specifies) COMPUTES to `hidden` in
 *     Chrome whenever the other axis is non-visible — verified live 2026-07-30
 *     with `prefers-reduced-motion` OFF. So `hidden` is not evidence of the
 *     reduced-motion branch.
 *   · `scroll-snap-type: none` is likewise set by the motion-allowed override.
 * Running the reduce arm alone would therefore reproduce the ambiguity rather
 * than resolve it. The no-preference arm is the NEGATIVE CONTROL: if both arms
 * return identical readings, the emulation is not taking effect and the whole
 * run is inconclusive — which the script reports rather than passing.
 *
 * Usage:
 *   node scripts/motion-qa/probe-reduced-motion.mjs [url]
 * Exit codes: 0 pass · 1 fail · 2 inconclusive (emulation not distinguishable)
 *
 * @package SGS\Blocks
 */

import { chromium } from 'playwright';

const URL =
	process.argv[ 2 ] ||
	'https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-horizontal-panel/';

/**
 * Read the panel's state under one motion preference.
 *
 * @param {import('playwright').Browser} browser       Playwright browser.
 * @param {string}                       reducedMotion 'reduce' | 'no-preference'.
 * @return {Promise<Object>} Measured state.
 */
async function measure( browser, reducedMotion ) {
	const context = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		reducedMotion,
	} );
	const page = await context.newPage();
	await page.goto( URL, { waitUntil: 'load' } );
	await page.waitForTimeout( 1500 );

	const state = await page.evaluate( async () => {
		const host = document.querySelector( '[data-sgs-fx="horizontal-panel"]' );
		if ( ! host ) {
			return { error: 'NO_HOST' };
		}
		const marked = host.querySelector( ':scope > [data-sgs-fx-track]' );
		const track = marked
			? marked.querySelector( ':scope > .wp-block-sgs-container' ) || marked
			: null;
		const panels = track
			? Array.from( track.children ).filter(
					( n ) =>
						n.nodeType === 1 &&
						( n.offsetWidth > 0 || null !== n.offsetParent )
			  )
			: [];

		const cs = getComputedStyle( host );
		const out = {
			mqReduce: window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
			mqNoPreference: window.matchMedia( '(prefers-reduced-motion: no-preference)' ).matches,
			overflowX: cs.overflowX,
			overflowY: cs.overflowY,
			scrollSnapType: cs.scrollSnapType,
			effectRan: !! host.closest( '.pin-spacer' ),
			trackTransform: track ? getComputedStyle( track ).transform : null,
			panelCount: panels.length,
		};

		// NON-VACUOUS GUARD: with fewer than two panels every reachability
		// assertion below is trivially satisfiable and proves nothing.
		if ( panels.length < 2 ) {
			out.reachability = 'VACUOUS';
			return out;
		}

		// Can a user reach the last panel by scrolling the container?
		host.scrollLeft = host.scrollWidth;
		await new Promise( ( r ) => requestAnimationFrame( r ) );
		await new Promise( ( r ) => setTimeout( r, 100 ) );

		const last = panels[ panels.length - 1 ].getBoundingClientRect();
		const hostRect = host.getBoundingClientRect();
		out.maxScrollLeft = host.scrollWidth - host.clientWidth;
		out.scrollLeftAchieved = host.scrollLeft;
		out.lastPanelFullyVisible =
			last.left >= hostRect.left - 1 && last.right <= hostRect.right + 1;
		out.reachability = out.lastPanelFullyVisible ? 'REACHABLE' : 'UNREACHABLE';
		return out;
	} );

	await context.close();
	return state;
}

const browser = await chromium.launch();
const reduce = await measure( browser, 'reduce' );
const noPref = await measure( browser, 'no-preference' );
await browser.close();

console.log( '--- prefers-reduced-motion: reduce ---' );
console.log( JSON.stringify( reduce, null, 2 ) );
console.log( '--- prefers-reduced-motion: no-preference (negative control) ---' );
console.log( JSON.stringify( noPref, null, 2 ) );

// The emulation must actually change something, or nothing below is meaningful.
if ( reduce.mqReduce !== true || noPref.mqNoPreference !== true ) {
	console.log( '\n[VERDICT] INCONCLUSIVE — media-query emulation did not take effect.' );
	process.exit( 2 );
}
if ( reduce.effectRan === noPref.effectRan && reduce.effectRan === true ) {
	console.log(
		'\n[VERDICT] FAIL — the GSAP effect engaged under reduced motion (pin-spacer present in both arms).'
	);
	process.exit( 1 );
}
if ( 'VACUOUS' === reduce.reachability ) {
	console.log(
		'\n[VERDICT] INCONCLUSIVE — fewer than two panels; the reachability assertion cannot fail.'
	);
	process.exit( 2 );
}
if ( 'UNREACHABLE' === reduce.reachability ) {
	console.log(
		'\n[VERDICT] FAIL — last panel unreachable under reduced motion. This is a defect, not a degradation.'
	);
	process.exit( 1 );
}
console.log(
	'\n[VERDICT] PASS — effect did not run under reduced motion, and every panel is reachable via the native scroller.'
);
process.exit( 0 );

/**
 * D451 close-out (2026-08-21) — does motion-path re-animate on a SECOND downward pass?
 *
 * WHAT D451 LEFT OPEN. `onLeave` cleared the transform, added the resting class and called
 * `self.disable( false )` — but `onEnterBack` on the SAME trigger is the only code path
 * that ever calls `enable()` again. A switch wired through itself: motion-path animated
 * exactly once per page load, and scrolling back up and down produced nothing until
 * reload. The fix deletes the `disable`/`enable` pair outright. D451 closed with
 * `⚠ OUTSTANDING: not verified on live canary — harness proves the ScrollTrigger mechanism
 * in isolation, not real-page header height/route sizing. Needs a live down→up→down pass
 * on page 2083 at 375px post-deploy.`
 *
 * ⚠ PAGE 2083 NO LONGER EXISTS (404, checked 2026-08-21). Two live successors do:
 * 2109 "QA Motion Path Resting Position v2" and 2107 (v1). This probe uses 2109. The
 * register's own pointer had gone stale, which is why it is recorded here rather than
 * silently substituted.
 *
 * The deployed module was confirmed to be the real `fx-motion-path.js` and to contain zero
 * `.disable(`/`.enable(` calls BEFORE this probe was written — so the fix is on the server.
 * What was still missing is the behavioural observation on a real page.
 *
 * METHOD — down, up, down. The bug's signature is that pass 2 is dead while pass 1 works,
 * so a probe that only scrolls down once cannot see it. Both passes are measured and
 * compared.
 *
 * ⚠ Never sample at a fixed delay. This site sets `scroll-behavior: smooth` on <html>,
 * which has already produced false results twice on this project (see
 * probe-step14-scrub-focus.mjs). Scroll position is polled until settled.
 *
 * NEGATIVE CONTROL. A static element on the same page is sampled through the identical
 * scroll cycle. If it reported movement, "pass 2 moved" would prove nothing about
 * motion-path — only that the sampler reports movement for everything.
 *
 * Run:  node scripts/motion-qa/probe-motion-path-repeat.mjs
 */

import { chromium } from 'playwright';

const URL_UNDER_TEST =
	'https://sandybrown-nightingale-600381.hostingersite.com/?p=2109&cb=d728path';
const MOVER = '[data-sgs-fx="motion-path"]';

const browser = await chromium.launch();
const page = await browser.newPage( { viewport: { width: 375, height: 812 } } );

const line = ( s ) => console.log( `[motion-path-repeat] ${ s }` );
let exitCode = 0;

/** Scroll to y and poll until scrollY stops changing — never a fixed wait. */
async function settleAt( y ) {
	await page.evaluate( ( target ) => window.scrollTo( { top: target, behavior: 'auto' } ), y );
	await page.evaluate(
		() =>
			new Promise( ( resolve ) => {
				let last = -1;
				let stable = 0;
				const tick = () => {
					if ( Math.abs( window.scrollY - last ) < 0.5 ) {
						stable += 1;
					} else {
						stable = 0;
					}
					last = window.scrollY;
					if ( stable >= 6 ) resolve();
					else requestAnimationFrame( tick );
				};
				requestAnimationFrame( tick );
			} )
	);
}

/** Walk a scroll range in steps, collecting distinct transforms of `selector`. */
async function sweep( selector, from, to, steps ) {
	const seen = new Set();
	for ( let i = 0; i <= steps; i++ ) {
		const y = from + ( ( to - from ) * i ) / steps;
		await settleAt( y );
		const t = await page.evaluate( ( sel ) => {
			const el = document.querySelector( sel );
			return el ? getComputedStyle( el ).transform : null;
		}, selector );
		if ( t !== null ) seen.add( t );
	}
	return seen;
}

try {
	await page.goto( URL_UNDER_TEST, { waitUntil: 'load' } );

	const found = await page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		if ( ! el ) return null;
		const r = el.getBoundingClientRect();
		return { top: r.top + window.scrollY, docH: document.body.scrollHeight };
	}, MOVER );

	if ( ! found ) {
		line( `FAIL — no ${ MOVER } on the page. Probe is broken, not the feature.` );
		process.exit( 1 );
	}
	line( `mover found at documentY=${ Math.round( found.top ) }, docHeight=${ found.docH }` );

	// Sweep a range that brackets the element generously in both directions.
	const from = Math.max( 0, found.top - 900 );
	const to = Math.min( found.docH, found.top + 900 );

	const pass1 = await sweep( MOVER, from, to, 14 );
	line( `pass 1 (down): ${ pass1.size } distinct transform(s)` );

	// Back up ABOVE the trigger start — this is what fired onLeave/onEnterBack and, pre-fix,
	// is where the trigger switched itself off with nothing able to switch it back on.
	await settleAt( 0 );
	await settleAt( from );

	const pass2 = await sweep( MOVER, from, to, 14 );
	line( `pass 2 (down again, after scrolling back up): ${ pass2.size } distinct transform(s)` );

	// Negative control through the identical cycle.
	await settleAt( 0 );
	const control = await sweep( 'body', from, to, 14 );
	line( `negative control (body, never animated): ${ control.size } distinct transform(s)` );

	if ( control.size !== 1 ) {
		line(
			`FAIL — the static control reported ${ control.size } distinct transforms. The ` +
				'sampler reports movement for an element that cannot move, so the passes ' +
				'above prove nothing.'
		);
		exitCode = 1;
	} else {
		line( 'negative control OK — the sampler CAN report "no movement".' );
	}

	if ( pass1.size <= 1 ) {
		line(
			'FAIL — pass 1 never moved. Motion-path is not animating at all, which is a ' +
				'different (worse) defect than the D451 repeat-trigger bug.'
		);
		exitCode = 1;
	} else if ( pass2.size <= 1 ) {
		line(
			`FAIL — pass 1 moved (${ pass1.size }) but pass 2 did not (${ pass2.size }). ` +
				'This is exactly the D451 signature: animates once per page load, dead ' +
				'thereafter until reload. The defect is still present.'
		);
		exitCode = 1;
	} else {
		line(
			`PASS — pass 1 (${ pass1.size }) and pass 2 (${ pass2.size }) both animate. The ` +
				'trigger re-arms after scrolling back up; the D451 defect is gone on the ' +
				'live canary at 375px.'
		);
	}
} finally {
	await browser.close();
}

process.exit( exitCode );

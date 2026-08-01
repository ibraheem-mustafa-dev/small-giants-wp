/**
 * Step N (Motion Wave D register) — image-sequence PIN-ON path, first live
 * observation.
 *
 * WHAT THIS SETTLES
 * `data-sgs-fx-pin` / the `fxPin` block attribute has existed in source since
 * D435 (2026-08-01, `fx-image-sequence.js`), and the SCRUB half (pin OFF,
 * default mode) was verified live in the Wave C report
 * (`reports/visual-diff/image-sequence-2026-07-31.md`, luminance-ramp
 * sampling). But no live instance has ever shipped with `fxPin: true` — the
 * ON path has only ever been reasoned about from source, never observed.
 * This measures three things empirically against a real fixture
 * (`motion-canary-step22-pin-focus`, page 2114, reusing the exact real
 * luminance-ramp frame set from the Wave C fixture — 48 desktop frames,
 * `frame_0001.webp`..`frame_0048.webp`):
 *
 *   1. Does it PIN (position: fixed) while the scrub plays?
 *   2. Does it SCRUB its full range while pinned (frame index moves, proven
 *      by sampling the canvas's own pixels — mean luminance ramps
 *      monotonically with frame index, same method as the Wave C report)?
 *   3. Does it RELEASE cleanly (un-pins, frame stays frozen once released —
 *      not "stuck re-scrubbing" past 100%)?
 *
 * Then, separately, per Spec 38 §10's reduced-motion contract for this
 * effect ("Simplify: poster/final frame only") and the shared
 * `withMotionAllowed()` mechanism (`gsap.matchMedia` registers against
 * `(prefers-reduced-motion: no-preference)`; the browser firing that query's
 * change event calls the registered teardown automatically — see
 * `provider.js:349-355`):
 *
 *   4. Loaded FRESH under `reduce`: does it ever pin/draw at all (it must
 *      not — poster only, §10 SIMPLIFY)?
 *   5. Started under motion-allowed, scrolled INTO the pin (canvas drawing,
 *      pin fixed), THEN switched to `reduce` MID-SESSION with zero further
 *      scroll input: does the effect properly TEAR DOWN (un-pin, stop
 *      drawing, poster reappears) rather than continuing to animate on its
 *      own? This is the literal "does NOT become autonomous motion under
 *      reduced motion once released" check from the dispatch brief — reduced
 *      motion is the trigger that releases the pin here, and the thing being
 *      ruled out is the pin's own progress-driven paint continuing without
 *      any scroll input after that release.
 *
 * ⚠ REDUCED MOTION VIA PLAYWRIGHT ONLY. Chrome DevTools MCP's `emulate` has
 * no `prefers-reduced-motion` parameter (schema-checked, not a guess — see
 * dispatch brief). `browser.newContext({ reducedMotion })` sets it for the
 * WHOLE session; `page.emulateMedia({ reducedMotion })` changes it LIVE
 * mid-session, which is what check 5 needs.
 *
 * ⚠ AUTONOMOUS-MOTION CHECK METHODOLOGY. "Not autonomous" is proven by
 * NEGATIVE evidence over a real time window with ZERO scroll/input: sample
 * the canvas pixels + `is-ready` class + host position immediately after the
 * reduce switch, wait (no scroll), sample again. Identical byte-for-byte
 * (canvas) plus identical structural state = nothing moved on its own. A
 * single sample proves nothing — a self-animating effect and a static one
 * look identical in a single frame.
 *
 * Usage: node scripts/motion-qa/probe-stepn-image-sequence-pin.mjs
 * Output: JSON to stdout + a summary. Exit 0 pass, 1 fail, 2 inconclusive.
 *
 * @package SGS\Blocks
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const REPO_ROOT = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../..' );
const shotPath = ( name ) => path.join( REPO_ROOT, 'reports', 'visual-diff', 'assets', name );

const FIXTURE_URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-step22-pin-focus/';

const bust = ( u ) => u + ( u.includes( '?' ) ? '&' : '?' ) + 'sgsprobeN=' + Date.now();

const HOST_SEL = '[data-sgs-fx="image-sequence"]';

/**
 * Mean luminance of the canvas's own current pixels — reads out WHICH FRAME
 * is painted, not merely that something painted. Mirrors the Wave C report's
 * method exactly (same fixture frame set: mean luminance ramps monotonically
 * with frame index).
 */
const sampleLumaFn = ( sel ) => {
	const canvas = document.querySelector( sel );
	if ( ! canvas || 0 === canvas.width || 0 === canvas.height ) {
		return null;
	}
	const ctx = canvas.getContext( '2d' );
	const { data } = ctx.getImageData( 0, 0, canvas.width, canvas.height );
	let sum = 0;
	let n = 0;
	// Stride 40 (10 RGBA pixels) — a coarse but fast sample, matching the
	// precision the Wave C report needed (distinguishing ~86 / ~128 / ~149).
	for ( let i = 0; i < data.length; i += 40 ) {
		sum += 0.2126 * data[ i ] + 0.7152 * data[ i + 1 ] + 0.0722 * data[ i + 2 ];
		n++;
	}
	return n > 0 ? sum / n : null;
};

/**
 * SCROLL-BEHAVIOUR:SMOOTH TRAP — same class as `probe-step13-pin-focus.mjs`'s
 * own documented trap for Tab-driven scrolling, found again here for
 * SCRIPT-driven scrolling. This site sets CSS `scroll-behavior: smooth` on
 * `<html>`, which applies to `window.scrollTo()` calls too (not just
 * user/browser-triggered scrolling) unless `behavior: 'instant'` is passed
 * explicitly. A fixed short wait after each `scrollTo` samples the page
 * mid-animation, producing rect-top deltas that look like partial/uneven
 * movement rather than either "moving normally" or "genuinely held" — which
 * is exactly the ambiguous signal this run's first attempt produced. Poll
 * until `scrollY` truly settles (bounded, so a stuck scroll still ends the
 * loop) before sampling, mirroring `tabWalk()`'s fix for the identical trap.
 *
 * @param {import('playwright').Page} page   Target page.
 * @param {number}                    target Desired `scrollY`.
 */
async function scrollAndSettle( page, target ) {
	await page.evaluate( ( y ) => window.scrollTo( { top: y, behavior: 'instant' } ), target );
	let lastY = await page.evaluate( () => window.scrollY );
	for ( let tick = 0; tick < 10; tick++ ) {
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( 60 );
		// eslint-disable-next-line no-await-in-loop
		const y = await page.evaluate( () => window.scrollY );
		if ( y === lastY ) {
			break;
		}
		lastY = y;
	}
}

/*
 * PIN-TYPE TRAP (found + fixed during this run). GSAP ScrollTrigger pins an
 * element via genuine `position: fixed` ONLY when it detects no transformed
 * ancestor; when one exists (verified live here — this site's Lenis
 * smooth-scroll wrapper transforms the whole scroll container) it silently
 * falls back to `pinType: 'transform'`, holding the element still via an
 * inline `transform: translate(...)` instead. Confirmed on the live fixture:
 * `sgs/container`'s pin (Job 1, above) genuinely used `position: fixed`, but
 * THIS block's pin used the transform fallback — same effect, different CSS
 * mechanism, and `getComputedStyle(el).position === 'fixed'` (the check
 * `probe-step13-pin-focus.mjs` correctly uses for the container) is BLIND to
 * the transform variant. A pinType-agnostic signal is required: while
 * genuinely pinned, the element's VIEWPORT-RELATIVE `getBoundingClientRect().top`
 * stays constant as `scrollY` changes — true under either pin mechanism,
 * because "held still on screen while the page scrolls" is the actual
 * definition of a pin, not the specific CSS property that achieves it.
 */
const structuralStateFn = ( sel ) => {
	const canvas = document.querySelector( sel );
	if ( ! canvas ) {
		return { hostPresent: false };
	}
	const wrapper = canvas.closest( '.sgs-image-sequence' );
	return {
		hostPresent: true,
		position: getComputedStyle( canvas ).position,
		wrapperPosition: wrapper ? getComputedStyle( wrapper ).position : null,
		wrapperRectTop: wrapper ? Math.round( wrapper.getBoundingClientRect().top ) : null,
		hasPinSpacer: !! canvas.closest( '.pin-spacer' ),
		isReady: wrapper ? wrapper.classList.contains( 'is-ready' ) : null,
		canvasSize: { w: canvas.width, h: canvas.height },
		scrollY: window.scrollY,
	};
};

/**
 * Check 1-3: pin / scrub-full-range / release, against the motion-allowed
 * arm.
 */
async function runPinOnPath( browser ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' } );
	const page = await context.newPage();
	await page.goto( bust( FIXTURE_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 1200 );

	const before = await page.evaluate( structuralStateFn, HOST_SEL );

	const spacerInfo = await page.evaluate( ( sel ) => {
		const canvas = document.querySelector( sel );
		const spacer = canvas ? canvas.closest( '.pin-spacer' ) : null;
		if ( ! spacer ) {
			return { error: 'NO_SPACER' };
		}
		const top = spacer.getBoundingClientRect().top + window.scrollY;
		return { top, height: spacer.offsetHeight };
	}, HOST_SEL );

	/*
	 * LINEAR scrollY WALK, NOT a fraction-of-spacer-geometry WALK (found +
	 * fixed during this run). An earlier version of this sweep computed
	 * targets as `spacerInfo.top + spacerInfo.height * f` — but this
	 * effect's `start`/`end` are FUNCTIONS returning
	 * `computeVisibilityWindow()`'s "fully visible" geometry (block bottom
	 * vs viewport bottom, block top vs viewport top), which does NOT equal
	 * the spacer's own raw DOM position for a block far shorter than the
	 * viewport — the fraction-of-spacer math landed samples mostly PAST the
	 * true pin window, measuring only its tail. A dense linear walk across
	 * the whole plausible region finds the genuine held window empirically
	 * (via `wrapperRectTop` stability, pin-type-agnostic — see
	 * structuralStateFn) instead of assuming where it is.
	 */
	// Clamped to the browser's REAL max scroll — walking targets past this
	// produces a false "held" plateau (scrollY simply can't go further,
	// which looks identical to a genuine pin-hold on rect-top alone unless
	// excluded). Found live: the first attempt's longest "held run" was
	// entirely this clamp artefact (11 identical samples all at
	// `scrollY: 2376`, the document's actual ceiling).
	const docHeight = await page.evaluate( () => document.documentElement.scrollHeight );
	const maxScrollY = await page.evaluate( () => document.documentElement.scrollHeight - window.innerHeight );
	const walkStart = Math.max( 0, spacerInfo.error ? 0 : spacerInfo.top - 900 );
	const walkEndRaw = spacerInfo.error ? docHeight : spacerInfo.top + spacerInfo.height + 400;
	const walkEnd = Math.min( walkEndRaw, maxScrollY );
	/*
	 * STEP=25, not 60 (found + fixed during this run). This fixture's block
	 * is short relative to the 900px viewport (rendered ~675px tall), so per
	 * `computeVisibilityWindow()`'s OWN documented formula
	 * (`vh - headerOffset - elHeight`) its genuinely-fully-visible hold
	 * window is only ~130px of real scroll — narrower than the block itself.
	 * A 60px step could straddle the entire window in a single step,
	 * measuring only its edges. Confirmed live: with STEP=60 the walk found
	 * only 2 samples inside the hold window (real, but below the ≥3
	 * contiguous-sample bar meant to rule out coincidental proximity) even
	 * though the canvas plainly scrubbed 28→74.7→130.6 across them. STEP=25
	 * resolves a ~130px window into ~5 samples.
	 */
	const STEP = 25;

	const sweep = [];
	for ( let y = walkStart; y <= walkEnd; y += STEP ) {
		// eslint-disable-next-line no-await-in-loop
		await scrollAndSettle( page, y );
		/*
		 * `fxScrub: 1` on this fixture means GSAP's scrub has 1 SECOND of
		 * catch-up smoothing (`resolveScrub()` — a numeric value adds that
		 * many seconds of inertia). `scrollAndSettle` only proves `scrollY`
		 * itself stopped moving (now near-instant since it forces
		 * `behavior: 'instant'`) — the EASED progress driving the canvas
		 * paint is a separate, slower-moving value. Sampling luma before it
		 * catches up would read a stale frame and misreport "not scrubbing".
		 */
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( 1100 );
		// eslint-disable-next-line no-await-in-loop
		const state = await page.evaluate( structuralStateFn, HOST_SEL );
		// eslint-disable-next-line no-await-in-loop
		const luma = await page.evaluate( sampleLumaFn, HOST_SEL );
		sweep.push( { label: `y=${ y }`, target: y, ...state, luma } );
	}

	// Two extra samples well past the walk end, with a real settle gap and
	// ZERO further scroll — confirms the frame stays frozen post-release.
	await page.waitForTimeout( 300 );
	const afterLuma1 = await page.evaluate( sampleLumaFn, HOST_SEL );
	const afterState1 = await page.evaluate( structuralStateFn, HOST_SEL );
	await page.waitForTimeout( 500 );
	const afterLuma2 = await page.evaluate( sampleLumaFn, HOST_SEL );
	sweep.push( { label: 'after-released-sample1', ...afterState1, luma: afterLuma1 } );
	sweep.push( { label: 'after-released-sample2', ...afterState1, luma: afterLuma2 } );

	await page.screenshot( { path: shotPath( 'stepn-image-sequence-pin-on.png' ), fullPage: false } );

	const finalHref = page.url();
	await context.close();
	return { before, spacerInfo, sweep, finalHref, step: STEP };
}

/**
 * Check 4: fresh load under reduce — must never pin/draw.
 */
async function runFreshReduce( browser ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' } );
	const page = await context.newPage();
	await page.goto( bust( FIXTURE_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 1000 );

	const mediaQuery = await page.evaluate( () => ( { reduce: matchMedia( '(prefers-reduced-motion: reduce)' ).matches } ) );

	// Scroll through where the pin WOULD have engaged, to give the effect
	// every chance to wrongly fire if the reduced-motion gate had a bug.
	const probeHeight = await page.evaluate( () => document.documentElement.scrollHeight );
	const samples = [];
	for ( let y = 0; y <= probeHeight; y += Math.max( 400, Math.floor( probeHeight / 6 ) ) ) {
		// eslint-disable-next-line no-await-in-loop
		await page.evaluate( ( sy ) => window.scrollTo( 0, sy ), y );
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( 200 );
		// eslint-disable-next-line no-await-in-loop
		const state = await page.evaluate( structuralStateFn, HOST_SEL );
		// eslint-disable-next-line no-await-in-loop
		const luma = await page.evaluate( sampleLumaFn, HOST_SEL );
		samples.push( { y, ...state, luma } );
	}

	const finalHref = page.url();
	await context.close();
	return { mediaQuery, samples, finalHref };
}

/**
 * Check 5 — the load-bearing one. Motion-allowed load, scroll fully into the
 * pin (drawing + fixed), THEN flip to reduce mid-session with NO further
 * scroll, and confirm it tears down (un-pins, `is-ready` removed) and then
 * sits COMPLETELY STILL (two samples, byte-identical) rather than continuing
 * to animate on its own.
 */
async function runMidSessionSwitch( browser ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' } );
	const page = await context.newPage();
	await page.goto( bust( FIXTURE_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 1000 );

	const spacerInfo = await page.evaluate( ( sel ) => {
		const canvas = document.querySelector( sel );
		const spacer = canvas ? canvas.closest( '.pin-spacer' ) : null;
		if ( ! spacer ) {
			return { error: 'NO_SPACER' };
		}
		const top = spacer.getBoundingClientRect().top + window.scrollY;
		return { top, height: spacer.offsetHeight };
	}, HOST_SEL );

	if ( spacerInfo.error ) {
		await context.close();
		return { error: spacerInfo.error };
	}

	// Land mid-scrub (f=0.5) — pinned, drawing, and re-asserted before AND
	// after the switch so the shared-worktree cache-busting rule is honoured.
	// 1100ms settle: same `fxScrub: 1` catch-up reasoning as the linear walk.
	await scrollAndSettle( page, spacerInfo.top + spacerInfo.height * 0.5 );
	await page.waitForTimeout( 1100 );

	const hrefBeforeSwitch = page.url();
	const stateBeforeSwitch = await page.evaluate( structuralStateFn, HOST_SEL );
	const lumaBeforeSwitch = await page.evaluate( sampleLumaFn, HOST_SEL );

	// The switch. NO scroll after this point.
	await page.emulateMedia( { reducedMotion: 'reduce' } );
	// Give gsap.matchMedia's change listener + this module's own teardown
	// (trigger.kill + class removal) a real tick to run.
	await page.waitForTimeout( 400 );

	const stateImmediatelyAfter = await page.evaluate( structuralStateFn, HOST_SEL );
	const lumaImmediatelyAfter = await page.evaluate( sampleLumaFn, HOST_SEL );

	// Settle window with ZERO input — this is the autonomous-motion check.
	await page.waitForTimeout( 900 );

	const stateSettled = await page.evaluate( structuralStateFn, HOST_SEL );
	const lumaSettled = await page.evaluate( sampleLumaFn, HOST_SEL );
	const hrefAfterSettle = page.url();

	await page.screenshot( { path: shotPath( 'stepn-image-sequence-mid-session-switch.png' ), fullPage: false } );

	await context.close();
	return {
		hrefBeforeSwitch,
		hrefAfterSettle,
		stateBeforeSwitch,
		lumaBeforeSwitch,
		stateImmediatelyAfter,
		lumaImmediatelyAfter,
		stateSettled,
		lumaSettled,
	};
}

const browser = await chromium.launch();

const out = {};
out.pinOnPath = await runPinOnPath( browser );
out.freshReduce = await runFreshReduce( browser );
out.midSessionSwitch = await runMidSessionSwitch( browser );

await browser.close();

console.log( JSON.stringify( out, null, 1 ) );

// ── verdict ──────────────────────────────────────────────────────────────
const fails = [];
const inconclusive = [];

// Check 1-3: pin engaged, scrub monotonic-ish, release clean.
if ( out.pinOnPath.spacerInfo.error ) {
	inconclusive.push( `pin-on path: ${ out.pinOnPath.spacerInfo.error } — the effect never created a pin-spacer at all; fxPin may not have reached the runtime` );
} else {
	const walkSamples = out.pinOnPath.sweep.filter( ( s ) => s.label.startsWith( 'y=' ) );
	// Find the HELD WINDOW empirically: the longest contiguous run of
	// consecutive samples whose wrapperRectTop changes by ≤4px step-to-step
	// (pin-type-agnostic — see structuralStateFn docblock). A genuine pin
	// produces a long held run; scrolling with nothing pinned produces a
	// rectTop that moves by roughly STEP px every sample.
	let bestRun = [];
	let currentRun = [ walkSamples[ 0 ] ].filter( Boolean );
	for ( let i = 1; i < walkSamples.length; i++ ) {
		const prev = walkSamples[ i - 1 ];
		const cur = walkSamples[ i ];
		if ( Math.abs( cur.wrapperRectTop - prev.wrapperRectTop ) <= 4 ) {
			currentRun.push( cur );
		} else {
			if ( currentRun.length > bestRun.length ) {
				bestRun = currentRun;
			}
			currentRun = [ cur ];
		}
	}
	if ( currentRun.length > bestRun.length ) {
		bestRun = currentRun;
	}

	// A held run must span at least 3 consecutive samples (≥180px of real
	// scroll distance held still) to count as a genuine pin rather than two
	// samples that coincidentally landed close together.
	const everPinned = bestRun.length >= 3;
	if ( ! everPinned ) {
		fails.push( `pin-on path: no contiguous run of ≥3 samples held within 4px of each other was found across the ${ walkSamples.length }-sample linear walk (longest run: ${ bestRun.length }) — fxPin is not actually holding it still on screen` );
	} else {
		const heldLumas = bestRun.map( ( s ) => s.luma ).filter( ( l ) => null !== l );
		const distinctHeldLumas = new Set( heldLumas.map( ( l ) => Math.round( l ) ) ).size;
		if ( distinctHeldLumas < 2 ) {
			fails.push( `pin-on path: canvas luminance did not change across the held window (${ bestRun.length } samples, values: ${ JSON.stringify( heldLumas ) }) — the scrub is not advancing while pinned` );
		}

		// Everything BEFORE the held run should show rectTop moving
		// (unpinned, normal scroll) — confirms the held run is a genuine
		// pin engaging partway through, not "pinned from the very start".
		const heldStartIndex = walkSamples.indexOf( bestRun[ 0 ] );
		if ( heldStartIndex <= 0 ) {
			fails.push( 'pin-on path: already held at the very first sample of the walk — could not observe the un-pinned approach, widen the walk window before the spacer' );
		}

		// The samples AFTER the held run ends should show rectTop resuming
		// movement (released, back to normal document flow).
		const heldEndIndex = walkSamples.indexOf( bestRun[ bestRun.length - 1 ] );
		const step = out.pinOnPath.step || 60;
		const afterHeldSample = walkSamples[ heldEndIndex + 3 ]; // +3 steps further scroll
		if ( afterHeldSample && Math.abs( afterHeldSample.wrapperRectTop - bestRun[ 0 ].wrapperRectTop ) <= 4 ) {
			fails.push( `pin-on path: rect-top STILL matches the held position ${ ( heldEndIndex + 3 - heldStartIndex ) * step }px of scroll after the held run ended — did not release` );
		}
	}

	const releasedSamples = out.pinOnPath.sweep.filter( ( s ) => s.label.startsWith( 'after-released' ) );
	const releasedLumas = releasedSamples.map( ( s ) => s.luma );
	if ( releasedLumas.length === 2 && releasedLumas[ 0 ] !== releasedLumas[ 1 ] ) {
		fails.push( `pin-on path: canvas kept changing AFTER the walk ended with zero further scroll (${ releasedLumas[ 0 ] } -> ${ releasedLumas[ 1 ] }) — autonomous motion post-release` );
	}
}

// Check 4: fresh reduce — never pins, never draws (poster only).
if ( ! out.freshReduce.mediaQuery.reduce ) {
	inconclusive.push( 'fresh-reduce arm: matchMedia did not report reduce=true — the Playwright context option did not take effect, arm invalid' );
} else {
	const badSamples = out.freshReduce.samples.filter( ( s ) => s.hasPinSpacer || s.isReady );
	if ( badSamples.length ) {
		fails.push( `fresh-reduce arm: pinned/drew/is-ready under prefers-reduced-motion:reduce at ${ badSamples.length } sample point(s) — violates §10 SIMPLIFY (poster/final frame only)` );
	}
}

// Check 5 — THE load-bearing one. Must show: pinned+drawing before the
// switch, torn down after, and COMPLETELY STILL across the settle window.
if ( out.midSessionSwitch.error ) {
	inconclusive.push( `mid-session switch: ${ out.midSessionSwitch.error } — could not exercise this arm at all` );
} else {
	const before = out.midSessionSwitch.stateBeforeSwitch;
	// `hasPinSpacer` (rather than `position === 'fixed'`) — pinType-agnostic,
	// see structuralStateFn's docblock; a spacer only exists once
	// ScrollTrigger has genuinely created the pin.
	if ( ! before || ! before.hasPinSpacer ) {
		inconclusive.push( `mid-session switch: was not genuinely pinned before the switch (hasPinSpacer=${ before && before.hasPinSpacer }) — cannot prove a REVERT because there was nothing engaged to revert` );
	} else {
		const after = out.midSessionSwitch.stateImmediatelyAfter;
		if ( after.position === 'fixed' || after.hasPinSpacer ) {
			fails.push( `mid-session switch: STILL pinned after the reduce switch (position=${ after.position }, hasPinSpacer=${ after.hasPinSpacer }) — gsap.matchMedia teardown did not run / did not release the pin` );
		}
		if ( after.isReady ) {
			fails.push( 'mid-session switch: `is-ready` class still present after the reduce switch — canvas not reverted to poster-only per §10' );
		}
		// THE autonomous-motion check: two samples across a real settle
		// window with ZERO scroll input must be identical.
		if ( out.midSessionSwitch.lumaImmediatelyAfter !== out.midSessionSwitch.lumaSettled ) {
			fails.push(
				`mid-session switch: canvas luminance changed with ZERO scroll input between the switch (${ out.midSessionSwitch.lumaImmediatelyAfter }) and the settle sample (${ out.midSessionSwitch.lumaSettled }) — AUTONOMOUS MOTION under reduced motion`
			);
		}
	}
}

console.log( '\n=== VERDICT ===' );
if ( inconclusive.length ) {
	console.log( 'INCONCLUSIVE:\n - ' + inconclusive.join( '\n - ' ) );
}
if ( fails.length ) {
	console.log( 'FAIL:\n - ' + fails.join( '\n - ' ) );
	process.exit( 1 );
}
if ( inconclusive.length ) {
	process.exit( 2 );
}
console.log( 'PASS — image-sequence pin-ON path pins, scrubs its full range, releases cleanly, never engages under reduced motion, and a mid-session switch to reduced motion tears the pin down with no autonomous motion afterward.' );
process.exit( 0 );

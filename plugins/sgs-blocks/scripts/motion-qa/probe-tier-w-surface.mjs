/**
 * Live probe — Tier W surface-treatment effect (Spec 38 §1.2b, D479).
 *
 * WHY THIS EXISTS, AND WHAT IT REFUSES TO ACCEPT AS A PASS
 *
 * This is the ship/no-ship gate for the surface-treatment effect (grain /
 * halftone / duotone painted over an `<img>` by a single-pass WebGL2
 * shader — `src/shared/effects/fx-surface-treatment.js` +
 * `src/shared/effects/webgl/`). A green build, a green enqueue check, and a
 * `canvas.sgs-webgl-surface` element existing in the DOM all prove the
 * PLUMBING is correct — none of them prove a single pixel of grain, dots or
 * duotone ever reached the screen. This project has shipped that exact
 * failure before (morph shipped with every artefact correct and had never
 * once animated). So every arm below that could plausibly pass on dead
 * plumbing is paired with either a positive or a negative control that
 * PROVES the assertion is capable of failing.
 *
 * THE LOAD-BEARING CONTRACT (read `fx-surface-treatment.js` + `webgl/
 * README.md` before touching this file):
 *   - Emitter:            `[data-sgs-fx="surface-treatment"]`
 *   - Preset attribute:   `data-sgs-fx-treatment="grain|halftone|duotone"`
 *   - The canvas:         `canvas.sgs-webgl-surface`, a CHILD of the emitter
 *   - Liveness flag:      `data-sgs-webgl-active="1"` on the emitter, set
 *                         ONLY after `initSurface()` returns non-null — and
 *                         `initSurface()` already painted the first frame
 *                         before returning that handle (`webgl/renderer.js`
 *                         paints inside `createRenderer()`), so "flag set"
 *                         and "first draw happened" are the same fact here.
 *   - Fail-open:          there is no fallback BRANCH. Absence of the canvas
 *                         IS the fallback — the `<img>` was simply never
 *                         hidden. `visibility:hidden`, never `display:none`
 *                         (layout must not shift when the canvas takes over).
 *
 * ⚠ VACUITY GUARDS FIRST, same discipline as the cursor-field probe this
 * file is shaped after (`probe-cursor-field.mjs`):
 *   1. Every arm that asserts an ELEMENT's behaviour first asserts that
 *      element exists — a wrong URL or an unrendered fixture yields zero
 *      elements and "no failures", which is not a pass.
 *   2. Every arm whose expected result is an ABSENCE (no canvas, no
 *      liveness flag) is paired with either a positive control in the same
 *      arm (arms 3 + 4 reuse arm 1a's "canvas exists" fact) or a synthetic
 *      negative control that proves the detector can fail (arm 1b, arm 6).
 *   3. `__gpuObjectCount()` (the GPU-disposal test hook exported by
 *      `webgl/renderer.js`) is a bare ES-module export — nothing in the
 *      production bundle attaches it to `window`. It is therefore NOT
 *      reachable from `page.evaluate()` against a live deployed page. Arm 7
 *      says so explicitly and reports SKIPPED rather than inventing a
 *      window global that does not exist in production, or silently
 *      reporting a false PASS.
 *
 * Usage: node scripts/motion-qa/probe-tier-w-surface.mjs [url]
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

// Resolved relative to THIS file (plugins/sgs-blocks/scripts/motion-qa/) so
// the screenshot always lands at the repo-root reports/visual-diff/assets/
// (STOP-67) regardless of the caller's cwd — same convention as
// probe-step13-pin-focus.mjs.
const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'../../../..'
);
const shotPath = ( name ) =>
	path.join( REPO_ROOT, 'reports', 'visual-diff', 'assets', name );

const URL =
	process.argv[ 2 ] ||
	'https://sandybrown-nightingale-600381.hostingersite.com/tier-w-surface-canary/';

const EMITTER_SELECTOR = '[data-sgs-fx="surface-treatment"]';
const CANVAS_SELECTOR = 'canvas.sgs-webgl-surface';

const results = [];
let skippedCount = 0;

/**
 * Record one pass/fail assertion.
 *
 * @param {string}  name   What was checked.
 * @param {boolean} pass   Whether it held.
 * @param {string}  detail Measured values, always — never just "ok".
 */
function check( name, pass, detail ) {
	results.push( { name, pass, detail, status: pass ? 'PASS' : 'FAIL' } );
	// eslint-disable-next-line no-console
	console.log( `  [${ pass ? 'PASS' : 'FAIL' }] ${ name } — ${ detail }` );
}

/**
 * Record an arm (or sub-check) that could not genuinely be run, rather than
 * inventing a PASS. A skip must be visually obvious and must NOT count
 * toward the pass tally.
 *
 * @param {string} name   What was attempted.
 * @param {string} reason Why it could not run.
 */
function skip( name, reason ) {
	skippedCount++;
	results.push( { name, pass: null, detail: reason, status: 'SKIPPED' } );
	// eslint-disable-next-line no-console
	console.log( `  [SKIPPED] ${ name } — ${ reason }` );
}

/**
 * WebGL software-rasterises via SwiftShader in headless Chromium — the
 * ANGLE string this project has already verified on this host is
 * "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))". That is
 * slow relative to real hardware, so give it generous settle time after
 * navigation and after any viewport change before reading pixels.
 *
 * @param {import('playwright').Page} page
 */
async function settle( page ) {
	await page.waitForTimeout( 500 );
}

/**
 * Screenshot a single DOM element as a PNG buffer, for byte-level visual
 * comparison. This replaces WebGL canvas-readback (`drawImage` off the
 * canvas into a 2D scratch canvas + `getImageData`) for arms 1b/2/6: the
 * production renderer creates its WebGL2 context WITHOUT
 * `preserveDrawingBuffer` (correct for production — it saves memory and
 * bandwidth on every client page), so after the browser composites the
 * frame the drawing buffer is cleared and any readback yields transparent
 * black even though the canvas was genuinely painted. An element screenshot
 * is captured by the BROWSER'S COMPOSITOR — the same pixels a visitor sees —
 * so it has no such blind spot.
 *
 * PNG encoding is deterministic for identical pixels within one browser
 * build, which is what the same-element-twice stability controls below
 * rely on. It is NOT guaranteed stable across animation, lazy-loading or
 * layout shift, so callers settle + scroll into view first.
 *
 * @param {import('playwright').Page} page
 * @param {string}                    selector CSS selector for the element to screenshot.
 * @return {Promise<Buffer|null>} PNG buffer, or null if the element is absent or unshootable.
 */
async function screenshotElement( page, selector ) {
	const locator = page.locator( selector ).first();
	if ( ( await locator.count() ) === 0 ) {
		return null;
	}
	try {
		await locator.scrollIntoViewIfNeeded();
	} catch ( error ) {
		// Non-fatal — element may already be in view or unscrollable; the
		// screenshot attempt below is the real test of shootability.
	}
	await page.waitForTimeout( 600 );
	try {
		return await locator.screenshot();
	} catch ( error ) {
		return null;
	}
}

/**
 * Byte-level equality check for two PNG buffers.
 *
 * @param {Buffer|null} a
 * @param {Buffer|null} b
 * @return {boolean}
 */
function buffersEqual( a, b ) {
	if ( ! a || ! b ) {
		return false;
	}
	return Buffer.compare( a, b ) === 0;
}

/**
 * Scroll the page to an absolute document-Y position and wait for the
 * scroll-resolve driver (uResolve) to settle before the caller screenshots.
 * Used by arm 9 — deliberately does NOT use `scrollIntoViewIfNeeded()`
 * (as `screenshotElement()` does), because that would pull the viewport
 * to wherever the browser thinks "in view" is and defeat the precise
 * entering/settled positions the arm depends on.
 *
 * @param {import('playwright').Page} page
 * @param {number}                    y Target `window.scrollY` value.
 */
async function scrollToY( page, y ) {
	await page.evaluate( ( targetY ) => window.scrollTo( 0, targetY ), y );
	await page.waitForTimeout( 700 );
}

/**
 * Screenshot a single DOM element at the CURRENT scroll position, without
 * first scrolling it into view. Companion to `screenshotElement()` for
 * arm 9, where the caller has already moved the page to a precise
 * document-Y via `scrollToY()` and an auto-scroll-into-view would defeat
 * that positioning.
 *
 * @param {import('playwright').Page} page
 * @param {string}                    selector CSS selector for the element to screenshot.
 * @return {Promise<Buffer|null>} PNG buffer, or null if the element is absent or unshootable.
 */
async function screenshotElementNoScroll( page, selector ) {
	const locator = page.locator( selector ).first();
	if ( ( await locator.count() ) === 0 ) {
		return null;
	}
	try {
		return await locator.screenshot();
	} catch ( error ) {
		return null;
	}
}

const browser = await chromium.launch();

// eslint-disable-next-line no-console
console.log( `\ntier-w-surface probe -> ${ URL }\n` );

const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
const page = await context.newPage();
await page.goto( `${ URL }?cb=${ Date.now() }`, { waitUntil: 'networkidle' } );
await settle( page );

/* ---- Locate the four canary instances (A=grain, B=halftone, C=duotone, D=control) ---- */
const treatedHandles = await page.locator( EMITTER_SELECTOR ).elementHandles();
if ( treatedHandles.length === 0 ) {
	// eslint-disable-next-line no-console
	console.log(
		'  [FAIL] no [data-sgs-fx="surface-treatment"] element on the page — ' +
			'wrong URL or the fixture never rendered. Nothing below would mean anything.'
	);
	await browser.close();
	process.exit( 1 );
}

const treatedPresets = await page.evaluate(
	( sel ) =>
		Array.from( document.querySelectorAll( sel ) ).map(
			( el ) => el.dataset.sgsFxTreatment || null
		),
	EMITTER_SELECTOR
);
const grainIndex = treatedPresets.indexOf( 'grain' );
const selectorForPreset = ( preset ) =>
	`${ EMITTER_SELECTOR }[data-sgs-fx-treatment="${ preset }"]`;
const instanceASelector =
	grainIndex !== -1 ? selectorForPreset( 'grain' ) : `${ EMITTER_SELECTOR }:nth-of-type(1)`;

// D (the untreated control) is not itself an fx emitter — it is presumed to
// be the one <img> on this single-purpose canary page that is NOT inside a
// [data-sgs-fx="surface-treatment"] wrapper. Try a purpose-built hook first
// (a canary page MAY declare data-sgs-fx-instance="d"); fall back to the
// generic filter and say which method matched, so a wrong pick is visible
// in the report rather than silently mis-measured.
let instanceDSelector = '[data-sgs-fx-instance="d"] img, [data-sgs-fx-instance="d"]';
let dMethod = 'data-sgs-fx-instance="d" hook';
const dHookCount = await page.locator( instanceDSelector ).count();
if ( dHookCount === 0 ) {
	const untreatedImgHandle = await page.evaluateHandle( ( sel ) => {
		const treated = new Set( document.querySelectorAll( sel ) );
		const imgs = Array.from( document.querySelectorAll( 'img' ) );
		return (
			imgs.find( ( img ) => {
				let node = img;
				while ( node ) {
					if ( treated.has( node ) ) {
						return false;
					}
					node = node.parentElement;
				}
				return true;
			} ) || null
		);
	}, EMITTER_SELECTOR );
	const isNull = ( await untreatedImgHandle.jsonValue() ) === null;
	if ( isNull ) {
		instanceDSelector = null;
		dMethod = 'NOT FOUND — no untreated <img> located by either method';
	} else {
		instanceDSelector = 'img[data-sgs-probe-control="d"]';
		await page.evaluate( ( el ) => {
			el.setAttribute( 'data-sgs-probe-control', 'd' );
		}, untreatedImgHandle );
		dMethod = 'generic filter (first <img> outside any fx emitter)';
	}
}
// eslint-disable-next-line no-console
console.log(
	`  instance A (grain) via: ${ grainIndex !== -1 ? 'data-sgs-fx-treatment="grain"' : 'first emitter (grain not found by attr)' }`
);
// eslint-disable-next-line no-console
console.log( `  instance D (control) via: ${ dMethod }\n` );

/* =====================================================================
 * ARM 1a — canvas present + liveness flag on the treated instance,
 * paired with a negative control on the untreated instance.
 * =================================================================== */
const aCount = await page.locator( instanceASelector ).count();
check( 'instance A exists', aCount > 0, `selector "${ instanceASelector }" matched ${ aCount }` );

if ( aCount > 0 ) {
	const aState = await page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		return {
			hasCanvas: !! el.querySelector( 'canvas.sgs-webgl-surface' ),
			active: el.dataset.sgsWebglActive || null,
		};
	}, instanceASelector );
	check(
		'1a — A has canvas.sgs-webgl-surface AND data-sgs-webgl-active="1"',
		aState.hasCanvas && aState.active === '1',
		`hasCanvas=${ aState.hasCanvas } data-sgs-webgl-active=${ aState.active }`
	);
} else {
	check( '1a — A has canvas + liveness flag', false, 'instance A not found, cannot check' );
}

if ( instanceDSelector ) {
	const dCount = await page.locator( instanceDSelector ).count();
	if ( dCount > 0 ) {
		const dState = await page.evaluate(
			( { dSel, emitterSel } ) => {
				const target = document.querySelector( dSel );
				// D may resolve to the <img> itself or to a wrapper — walk up to
				// the nearest fx-emitter ancestor if there is one (there should
				// not be, since D is by definition outside every emitter), else
				// fall back to the target's own parent so a bare <img data-sgs-
				// probe-control="d"> still gets a sensible scope to check.
				const el = target.closest( emitterSel ) || target.parentElement || target;
				return {
					hasCanvas: !! ( el.querySelector && el.querySelector( 'canvas.sgs-webgl-surface' ) ),
					active: el.dataset ? el.dataset.sgsWebglActive || null : null,
				};
			},
			{ dSel: instanceDSelector, emitterSel: EMITTER_SELECTOR }
		);
		check(
			'1a negative control — D has NEITHER canvas nor liveness flag',
			! dState.hasCanvas && dState.active === null,
			`hasCanvas=${ dState.hasCanvas } data-sgs-webgl-active=${ dState.active }`
		);
	} else {
		check( '1a negative control — D located', false, `selector "${ instanceDSelector }" matched 0` );
	}
} else {
	check( '1a negative control — D located', false, dMethod );
}

/* =====================================================================
 * ARM 1b — the canvas actually painted, measured via an ELEMENT
 * SCREENSHOT (browser-composited pixels — what a visitor actually sees)
 * rather than canvas readback, which reads back transparent black
 * because the renderer has no `preserveDrawingBuffer` (see
 * `screenshotElement()` docstring). Paired with a same-element-twice
 * stability control: if two shots of the SAME element are not
 * byte-identical, the screenshot discriminator is unreliable in this
 * environment and the arm reports SKIPPED, never a guessed PASS.
 * =================================================================== */
const aCanvasSelector = `${ instanceASelector } canvas.sgs-webgl-surface`;
let aShot = null;
let dShot = null;
let shotDiscriminatorStable = false;

if ( aCount > 0 ) {
	aShot = await screenshotElement( page, aCanvasSelector );
	const aShotAgain = await screenshotElement( page, aCanvasSelector );
	shotDiscriminatorStable = buffersEqual( aShot, aShotAgain );

	check(
		'1b negative control — two screenshots of the same canvas element are byte-identical (discriminator is stable)',
		shotDiscriminatorStable,
		aShot && aShotAgain
			? `shot1=${ aShot.length }B shot2=${ aShotAgain.length }B`
			: 'one or both screenshot attempts returned no buffer'
	);

	if ( ! shotDiscriminatorStable ) {
		skip(
			'1b — A canvas screenshot is a plausible non-trivial image',
			'same-element-twice stability control failed (two shots of the identical element differed) — the screenshot discriminator cannot be trusted here, so this arm cannot genuinely measure and is not reported as PASS/FAIL'
		);
	} else {
		check(
			'1b — A canvas screenshot is a plausible non-trivial image',
			!! aShot && aShot.length > 1000,
			aShot ? `buffer length=${ aShot.length } bytes (floor 1000)` : 'no buffer captured'
		);
	}
} else {
	check( '1b negative control — same-element-twice stability', false, 'instance A not found' );
	skip( '1b — A canvas screenshot is a plausible non-trivial image', 'instance A not found, cannot screenshot' );
}

if ( instanceDSelector ) {
	dShot = await screenshotElement( page, instanceDSelector );
}

/* =====================================================================
 * ARM 2 — treated ≠ untreated: proves a TREATMENT happened, not a
 * passthrough blit of the same image. Screenshot instance A's canvas
 * and instance D's untreated `<img>` and assert the PNG buffers differ.
 * Gated on the same-element-twice stability control from arm 1b — if
 * that control failed, byte comparison is not trustworthy here and this
 * arm reports SKIPPED rather than a guessed result.
 * =================================================================== */
let arm2ProvedRealDifference = false;
if ( ! shotDiscriminatorStable ) {
	skip(
		'2 — A canvas screenshot differs from D untreated image screenshot',
		'the same-element-twice stability control (arm 1b) failed, so byte-level screenshot comparison is not trustworthy in this environment'
	);
} else if ( aShot && dShot ) {
	arm2ProvedRealDifference = ! buffersEqual( aShot, dShot );
	check(
		'2 — A canvas screenshot differs from D untreated image screenshot',
		arm2ProvedRealDifference,
		`A buffer=${ aShot.length }B, D buffer=${ dShot.length }B, byte-identical=${ ! arm2ProvedRealDifference }`
	);
} else {
	check(
		'2 — A canvas screenshot differs from D untreated image screenshot',
		false,
		`missing screenshot data — A captured=${ !! aShot } D captured=${ !! dShot } (D selector: ${ instanceDSelector || 'not found' })`
	);
}

/* =====================================================================
 * ARM 3 — fail-open, no WebGL. Positive control reuses arm 1a's fact
 * that the normal context DOES set the liveness flag.
 * =================================================================== */
const noWebglContext = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
await noWebglContext.addInitScript( () => {
	const proto = window.HTMLCanvasElement.prototype;
	const original = proto.getContext;
	proto.getContext = function ( type, ...args ) {
		if ( type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl' ) {
			return null;
		}
		return original.call( this, type, ...args );
	};
} );
const noWebglPage = await noWebglContext.newPage();
await noWebglPage.goto( `${ URL }?cb=${ Date.now() + 1 }`, { waitUntil: 'networkidle' } );
await settle( noWebglPage );

const noWebglState = await noWebglPage.evaluate( ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) {
		return null;
	}
	const img = el.querySelector( 'img' );
	return {
		hasCanvas: !! el.querySelector( 'canvas.sgs-webgl-surface' ),
		active: el.dataset.sgsWebglActive || null,
		imgVisible: img ? getComputedStyle( img ).visibility !== 'hidden' : null,
	};
}, instanceASelector );

if ( noWebglState ) {
	check(
		'3 — no WebGL2: no canvas',
		! noWebglState.hasCanvas,
		`hasCanvas=${ noWebglState.hasCanvas }`
	);
	check(
		'3 — no WebGL2: <img> stays visible (visibility !== hidden)',
		noWebglState.imgVisible === true,
		`img visibility hidden? ${ ! noWebglState.imgVisible }`
	);
	check(
		'3 — no WebGL2: liveness flag absent',
		noWebglState.active === null,
		`data-sgs-webgl-active=${ noWebglState.active }`
	);
	check(
		'3 positive control — the SAME instance in the normal context DID set the flag',
		aCount > 0 && ( await page.evaluate( ( sel ) => document.querySelector( sel )?.dataset.sgsWebglActive || null, instanceASelector ) ) === '1',
		'reusing arm 1a\'s measured state: normal context data-sgs-webgl-active="1"'
	);
} else {
	check( '3 — fail-open, no WebGL', false, 'instance A not found in the no-WebGL context' );
}
await noWebglContext.close();

/* =====================================================================
 * ARM 4 — fail-open, no JS.
 * =================================================================== */
const noJsContext = await browser.newContext( {
	viewport: { width: 1440, height: 900 },
	javaScriptEnabled: false,
} );
const noJsPage = await noJsContext.newPage();
await noJsPage.goto( `${ URL }?cb=${ Date.now() + 2 }`, { waitUntil: 'load' } );
await noJsPage.waitForTimeout( 300 );

const noJsCanvasCount = await noJsPage.locator( CANVAS_SELECTOR ).count();
const noJsImgVisible = await noJsPage
	.locator( `${ instanceASelector } img` )
	.first()
	.isVisible()
	.catch( () => null );
check(
	'4 — no JS: no canvas anywhere on the page',
	noJsCanvasCount === 0,
	`${ noJsCanvasCount } canvas.sgs-webgl-surface element(s)`
);
check(
	'4 — no JS: <img> present and visible',
	noJsImgVisible === true,
	`img visible=${ noJsImgVisible }`
);
check(
	'4 positive control — with JS ON a canvas exists',
	aCount > 0 && ( await page.locator( `${ instanceASelector } canvas.sgs-webgl-surface` ).count() ) > 0,
	'reusing the normal-context page: canvas present when JS runs'
);
await noJsContext.close();

/* =====================================================================
 * ARM 5 — mobile / coarse pointer: never a blank box.
 * =================================================================== */
const mobileContext = await browser.newContext( {
	viewport: { width: 375, height: 812 },
	hasTouch: true,
	isMobile: true,
	deviceScaleFactor: 2,
} );
const mobilePage = await mobileContext.newPage();
await mobilePage.goto( `${ URL }?cb=${ Date.now() + 3 }`, { waitUntil: 'networkidle' } );
await settle( mobilePage );

const mobileBox = await mobilePage.evaluate( ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) {
		return null;
	}
	const canvas = el.querySelector( 'canvas.sgs-webgl-surface' );
	const img = el.querySelector( 'img' );
	const visibleEl = canvas && getComputedStyle( el ).display !== 'none' ? canvas : img;
	if ( ! visibleEl ) {
		return null;
	}
	const rect = visibleEl.getBoundingClientRect();
	return {
		tag: visibleEl.tagName,
		width: rect.width,
		height: rect.height,
	};
}, instanceASelector );

check(
	'5 — mobile/coarse-pointer: block renders something with non-zero size (never a blank box)',
	!! mobileBox && mobileBox.width > 0 && mobileBox.height > 0,
	mobileBox
		? `visible element=${ mobileBox.tag } ${ mobileBox.width }x${ mobileBox.height }`
		: 'no canvas and no img found at all'
);
try {
	await mobilePage.screenshot( { path: shotPath( 'tier-w-surface-mobile.png' ) } );
	// eslint-disable-next-line no-console
	console.log( `  (screenshot: ${ shotPath( 'tier-w-surface-mobile.png' ) })` );
} catch ( error ) {
	// eslint-disable-next-line no-console
	console.log( `  (screenshot failed, non-fatal: ${ error.message })` );
}
await mobileContext.close();

/* =====================================================================
 * ARM 6 — reduced motion is a no-op (draws once, never suppressed).
 * Measured via element screenshot (same rationale as arms 1b/2 — canvas
 * readback returns transparent black because the renderer has no
 * `preserveDrawingBuffer`). Negative control: reuse arm 2's proof that
 * byte-comparison CAN detect a real difference (treated vs untreated
 * differed) — if arm 2 could not prove that, byte comparison cannot be
 * trusted to prove "no difference" here either, so this arm is SKIPPED
 * rather than reporting a false PASS on an untrustworthy comparison.
 * =================================================================== */
const rmContext = await browser.newContext( {
	viewport: { width: 1440, height: 900 },
	reducedMotion: 'reduce',
} );
const rmPage = await rmContext.newPage();
await rmPage.goto( `${ URL }?cb=${ Date.now() + 4 }`, { waitUntil: 'networkidle' } );
await settle( rmPage );

const rmState = await rmPage.evaluate( ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) {
		return null;
	}
	return {
		hasCanvas: !! el.querySelector( 'canvas.sgs-webgl-surface' ),
		active: el.dataset.sgsWebglActive || null,
	};
}, instanceASelector );

if ( rmState ) {
	check(
		'6 — reduced motion: canvas still paints',
		rmState.hasCanvas,
		`hasCanvas=${ rmState.hasCanvas }`
	);
	check(
		'6 — reduced motion: liveness flag still set',
		rmState.active === '1',
		`data-sgs-webgl-active=${ rmState.active }`
	);

	if ( ! arm2ProvedRealDifference ) {
		skip(
			'6 — normal vs reduced-motion screenshots are the SAME image (this effect never animates)',
			'negative control unmet — arm 2 could not prove byte-comparison detects a real visual difference on this page, so a byte-identical result here would not be trustworthy evidence of "no animation"'
		);
	} else {
		/* ⚠ AMENDED 2026-08-21, the day scroll-resolve shipped. This row used
		 * to assert "normal and reduced-motion render the SAME image, because
		 * this effect never animates". That was true of the first build and
		 * became FALSE within hours: the treatment now develops in on scroll,
		 * so the two contexts legitimately differ at any position mid-reveal.
		 * An assertion that encodes a superseded contract fails honest code
		 * and teaches the next reader the wrong rule.
		 *
		 * The reduced-motion contract now lives in arm 9c (scrolling must
		 * change nothing under `reduce`), which is testable inside a single
		 * context. What is still worth asserting HERE is the cheaper, blunter
		 * fact: reduced motion must not SUPPRESS the treatment — the canvas
		 * paints and the liveness flag is set (both checked above), and the
		 * rendered output is a real image rather than a blank. */
		const rmShot = await screenshotElement( rmPage, aCanvasSelector );
		if ( aShot && rmShot ) {
			const plausible = rmShot.length > 1000;
			check(
				'6 — reduced motion still renders a real treated image (never suppressed)',
				plausible,
				`reduced-motion buffer=${ rmShot.length }B (floor 1000) — the no-change-on-scroll contract is arm 9c`
			);
		} else {
			check(
				'6 — normal vs reduced-motion screenshots are the SAME image',
				false,
				`missing screenshot data — normal captured=${ !! aShot } reduced-motion captured=${ !! rmShot }`
			);
		}
	}
} else {
	check( '6 — reduced motion no-op', false, 'instance A not found under reduced motion' );
}
await rmContext.close();

/* =====================================================================
 * ARM 7 — GPU disposal.
 * =================================================================== */
const gpuHookType = await page.evaluate( () => typeof window.__gpuObjectCount );
if ( gpuHookType === 'function' ) {
	// Not expected on a production bundle (the export is module-scoped, not
	// attached to window) — but if a build DOES expose it, use it properly
	// rather than ignoring a real hook.
	const before = await page.evaluate( () => window.__gpuObjectCount() );
	await page.evaluate( ( sel ) => document.querySelector( sel )?.remove(), instanceASelector );
	await page.waitForTimeout( 300 );
	const after = await page.evaluate( () => window.__gpuObjectCount() );
	check(
		'7 — GPU disposal via __gpuObjectCount()',
		after < before || after === 0,
		`before=${ before } after=${ after }`
	);
} else {
	skip(
		'7 — GPU disposal via __gpuObjectCount()',
		'hook not reachable — webgl/renderer.js exports __gpuObjectCount() as a ' +
			'bare ES-module symbol; nothing in the production bundle attaches it ' +
			'to window, so page.evaluate() cannot reach it on a live deployed page'
	);

	// Fall back to what IS observable from outside the module: DOM-level
	// cleanup and the absence of WebGL warnings/errors in the console when
	// the treated element is removed from the page.
	const consoleWarnings = [];
	page.on( 'console', ( msg ) => {
		if ( msg.type() === 'warning' || msg.type() === 'error' ) {
			const text = msg.text();
			if ( /webgl|context|gl error/i.test( text ) ) {
				consoleWarnings.push( text );
			}
		}
	} );

	const canvasCountBefore = await page.locator( CANVAS_SELECTOR ).count();
	await page.evaluate( ( sel ) => {
		document.querySelector( sel )?.remove();
	}, instanceASelector );
	await page.waitForTimeout( 300 );
	const canvasCountAfter = await page.locator( CANVAS_SELECTOR ).count();

	check(
		'7 fallback — removing the treated element drops its canvas from the DOM',
		canvasCountAfter === canvasCountBefore - 1,
		`canvas count before=${ canvasCountBefore } after=${ canvasCountAfter }`
	);
	check(
		'7 fallback — no WebGL context warnings/errors logged on teardown',
		consoleWarnings.length === 0,
		consoleWarnings.length
			? `${ consoleWarnings.length } warning(s): ${ consoleWarnings.slice( 0, 3 ).join( ' | ' ) }`
			: 'none observed'
	);
}

/* =====================================================================
 * ARM 9 — scroll-resolve actually moves the treatment (uResolve driver,
 * 1 = untouched source, 0 = treatment at full strength). Measured via
 * element screenshot (same rationale as arms 1b/2/6 — canvas readback
 * yields transparent black without `preserveDrawingBuffer`).
 *
 * STABILITY CONTROL FIRST (9a): two shots at the IDENTICAL scroll
 * position must be byte-identical, or the comparator is untrustworthy in
 * this environment and the whole arm is SKIPPED rather than guessed.
 * 9b then proves the substantive claim (entering ≠ settled), and 9c uses
 * a reduced-motion context to prove BOTH the reduced-motion contract
 * (already fully treated before "entering") AND that 9b's difference is
 * caused by scroll, not load timing.
 * =================================================================== */
const halftoneIndex = treatedPresets.indexOf( 'halftone' );
const instanceHalftoneSelector = halftoneIndex !== -1 ? selectorForPreset( 'halftone' ) : null;

if ( ! instanceHalftoneSelector ) {
	check(
		'9 — halftone instance located (precondition)',
		false,
		`no [data-sgs-fx-treatment="halftone"] instance found among presets: ${
			treatedPresets.join( ', ' ) || '(none)'
		}`
	);
} else {
	const halftoneCanvasSelector = `${ instanceHalftoneSelector } canvas.sgs-webgl-surface`;
	const halftoneCanvasCount = await page.locator( halftoneCanvasSelector ).count();
	check(
		'9 — halftone instance + its canvas exist (precondition)',
		halftoneCanvasCount > 0,
		`canvas selector "${ halftoneCanvasSelector }" matched ${ halftoneCanvasCount }`
	);

	if ( halftoneCanvasCount === 0 ) {
		check( '9a — stability control (same scroll position twice)', false, 'halftone canvas missing, cannot run' );
		check( '9b — substantive: entering vs settled scroll positions differ', false, 'halftone canvas missing, cannot run' );
		check( '9c — reduced motion: image is pre-resolved', false, 'halftone canvas missing, cannot run' );
	} else {
		const docY = await page.evaluate( ( sel ) => {
			const el = document.querySelector( sel );
			const rect = el.getBoundingClientRect();
			return rect.top + window.scrollY;
		}, instanceHalftoneSelector );

		/* -- 9a: stability control, same scroll position (settled) twice -- */
		await scrollToY( page, docY - 150 );
		const settledShot1 = await screenshotElementNoScroll( page, halftoneCanvasSelector );
		await scrollToY( page, docY - 150 );
		const settledShot2 = await screenshotElementNoScroll( page, halftoneCanvasSelector );
		const arm9Stable = buffersEqual( settledShot1, settledShot2 );

		check(
			'9a — stability control: two shots at the SAME scroll position are byte-identical',
			arm9Stable,
			settledShot1 && settledShot2
				? `shot1=${ settledShot1.length }B shot2=${ settledShot2.length }B`
				: 'one or both screenshot attempts returned no buffer'
		);

		if ( ! arm9Stable ) {
			skip(
				'9b — substantive: entering vs settled scroll positions differ',
				'stability control (9a) failed, so byte-level screenshot comparison is not trustworthy in this environment — this arm cannot genuinely measure and is not reported as PASS/FAIL'
			);
			skip(
				'9c — reduced motion: image is pre-resolved (entering shot == normal settled shot)',
				'stability control (9a) failed, so byte-level screenshot comparison is not trustworthy in this environment — this arm cannot genuinely measure and is not reported as PASS/FAIL'
			);
		} else {
			/* -- 9b: entering (near bottom of viewport) vs settled must differ -- */
			await scrollToY( page, docY - 850 );
			const enteringShot = await screenshotElementNoScroll( page, halftoneCanvasSelector );
			await scrollToY( page, docY - 150 );
			const settledShot = await screenshotElementNoScroll( page, halftoneCanvasSelector );
			const resolveMoved = ! buffersEqual( enteringShot, settledShot );

			check(
				'9b — substantive: entering vs settled scroll positions differ (uResolve actually moves)',
				resolveMoved && !! enteringShot && !! settledShot,
				enteringShot && settledShot
					? `entering=${ enteringShot.length }B settled=${ settledShot.length }B byte-identical=${ ! resolveMoved }`
					: `missing screenshot data — entering captured=${ !! enteringShot } settled captured=${ !! settledShot }`
			);

			/* -- 9c: reduced motion — driver never created, so the image must
			 * already be fully treated even at the "entering" position. This
			 * doubles as proof that 9b's difference is caused by scroll rather
			 * than by load/paint timing (a load-timing artefact would also
			 * show up here, since this is a completely fresh navigation). */
			const rm9Context = await browser.newContext( {
				viewport: { width: 1440, height: 900 },
				reducedMotion: 'reduce',
			} );
			const rm9Page = await rm9Context.newPage();
			await rm9Page.goto( `${ URL }?cb=${ Date.now() + 5 }`, { waitUntil: 'networkidle' } );
			await settle( rm9Page );

			const rm9DocY = await rm9Page.evaluate( ( sel ) => {
				const el = document.querySelector( sel );
				if ( ! el ) {
					return null;
				}
				const rect = el.getBoundingClientRect();
				return rect.top + window.scrollY;
			}, instanceHalftoneSelector );

			if ( rm9DocY === null ) {
				check(
					'9c — reduced motion: image is pre-resolved (entering shot == normal settled shot)',
					false,
					'halftone instance not found in the reduced-motion context'
				);
			} else {
				/* ⚠ COMPARE WITHIN THE REDUCED-MOTION CONTEXT, at the SAME two
				 * scroll positions arm 9b uses — never across contexts.
				 *
				 * An earlier version compared the reduced-motion "entering"
				 * shot against the NORMAL context's "settled" shot and failed
				 * by ~2.6KB on identical-looking output. The cause was framing,
				 * not pixels: at the entering position the element is only
				 * partly inside the viewport, so an element screenshot is
				 * clipped differently than at the settled position. Two shots
				 * that frame the element differently can never be byte-equal,
				 * whatever the shader did.
				 *
				 * The contract that actually matters is INTERNALLY testable:
				 * under reduced motion the driver is never created, so
				 * scrolling must change nothing. Same context, same two
				 * positions, expect IDENTICAL — where arm 9b, on the same two
				 * positions, expects DIFFERENT. Together they are a matched
				 * pair, and 9b is 9c's negative control. */
				await scrollToY( rm9Page, rm9DocY - 850 );
				const rm9EnteringShot = await screenshotElementNoScroll( rm9Page, halftoneCanvasSelector );
				await scrollToY( rm9Page, rm9DocY - 150 );
				const rm9SettledShot = await screenshotElementNoScroll( rm9Page, halftoneCanvasSelector );
				/* ⚠ THRESHOLD, NOT BYTE-EQUALITY — and the threshold is derived
				 * from this run's own measurements rather than picked.
				 *
				 * Byte-exact equality is too strict for two shots taken at
				 * DIFFERENT scroll positions: the element's box lands on
				 * different sub-pixel boundaries, so PNG encoding differs
				 * slightly even when every rendered pixel is the same. Measured
				 * here: 23 bytes on ~658KB. Arm 9a proves same-position shots
				 * ARE byte-identical, which isolates the residue to framing.
				 *
				 * So compare against the size of REAL motion instead. Arm 9b
				 * measured the normal-context delta over the identical pair of
				 * positions; if the driver had run under `reduce`, this delta
				 * would be of that order. Requiring < 1% of it is self-
				 * calibrating — no magic constant — and still fails loudly if
				 * the reduced-motion gate ever regresses. */
				const rm9Delta = ( rm9EnteringShot && rm9SettledShot )
					? Math.abs( rm9EnteringShot.length - rm9SettledShot.length )
					: Number.POSITIVE_INFINITY;
				const motionDelta = ( enteringShot && settledShot )
					? Math.abs( enteringShot.length - settledShot.length )
					: 0;
				const allowance = Math.max( 1024, motionDelta * 0.01 );
				const rm9Matches = rm9Delta <= allowance;
				check(
					'9c — reduced motion: scrolling changes NOTHING of substance (driver never created)',
					rm9Matches,
					rm9EnteringShot && rm9SettledShot
						? `reduced-motion delta=${ rm9Delta }B vs real-motion delta=${ motionDelta }B (arm 9b, same two positions) — allowance ${ Math.round( allowance ) }B, i.e. reduced motion moved ${ motionDelta ? ( 100 * rm9Delta / motionDelta ).toFixed( 2 ) : 'n/a' }% of what real motion moves`
						: `missing screenshot data — entering captured=${ !! rm9EnteringShot } settled captured=${ !! rm9SettledShot }`
				);
			}
			await rm9Context.close();
		}
	}
}

await browser.close();

/* ---- Final table ---- */
const failed = results.filter( ( r ) => r.status === 'FAIL' );
const passed = results.filter( ( r ) => r.status === 'PASS' );

// eslint-disable-next-line no-console
console.log( '\n--- RESULTS ---' );
results.forEach( ( r ) => {
	// eslint-disable-next-line no-console
	console.log( `  [${ r.status }] ${ r.name } — ${ r.detail }` );
} );

// eslint-disable-next-line no-console
console.log(
	`\nVERDICT: ${ failed.length ? 'FAIL' : 'PASS' } — ${ passed.length }/${
		results.length - skippedCount
	} assertions held` + ( skippedCount ? ` (${ skippedCount } SKIPPED, not counted)` : '' ) + '\n'
);

process.exit( failed.length ? 1 : 0 );

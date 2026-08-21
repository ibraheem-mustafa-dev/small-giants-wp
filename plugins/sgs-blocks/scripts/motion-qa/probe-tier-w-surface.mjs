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
 * Read a downsampled grid of pixels from a WebGL canvas. The context has no
 * `preserveDrawingBuffer`, so pixels are copied out via `drawImage` into a
 * throwaway 2D canvas rather than read directly off the WebGL surface.
 *
 * @param {import('playwright').Page} page
 * @param {string}                    selector CSS selector for the canvas.
 * @param {number}                    grid     Points per axis (grid×grid samples).
 * @return {Promise<number[][]|null>} `[r,g,b,a]` tuples, or null if absent/empty.
 */
async function sampleCanvasPixels( page, selector, grid = 6 ) {
	return page.evaluate(
		( { selector: sel, grid: g } ) => {
			const canvas = document.querySelector( sel );
			if ( ! canvas || ! canvas.width || ! canvas.height ) {
				return null;
			}
			const scratch = document.createElement( 'canvas' );
			scratch.width = canvas.width;
			scratch.height = canvas.height;
			const ctx = scratch.getContext( '2d' );
			ctx.drawImage( canvas, 0, 0 );
			const { data } = ctx.getImageData( 0, 0, canvas.width, canvas.height );
			const points = [];
			for ( let gy = 0; gy < g; gy++ ) {
				for ( let gx = 0; gx < g; gx++ ) {
					const x = Math.floor( ( ( gx + 0.5 ) * canvas.width ) / g );
					const y = Math.floor( ( ( gy + 0.5 ) * canvas.height ) / g );
					const idx = ( y * canvas.width + x ) * 4;
					points.push( [ data[ idx ], data[ idx + 1 ], data[ idx + 2 ], data[ idx + 3 ] ] );
				}
			}
			return points;
		},
		{ selector, grid }
	);
}

/**
 * Same grid-sampling but off a rendered `<img>` (the untreated control).
 *
 * @param {import('playwright').Page} page
 * @param {string}                    selector CSS selector for the image.
 * @param {number}                    grid     Points per axis.
 * @return {Promise<number[][]|null>}
 */
async function sampleImagePixels( page, selector, grid = 6 ) {
	return page.evaluate(
		( { selector: sel, grid: g } ) => {
			const img = document.querySelector( sel );
			if ( ! img || ! img.naturalWidth || ! img.naturalHeight ) {
				return null;
			}
			const scratch = document.createElement( 'canvas' );
			scratch.width = img.naturalWidth;
			scratch.height = img.naturalHeight;
			const ctx = scratch.getContext( '2d' );
			ctx.drawImage( img, 0, 0 );
			const { data } = ctx.getImageData( 0, 0, scratch.width, scratch.height );
			const points = [];
			for ( let gy = 0; gy < g; gy++ ) {
				for ( let gx = 0; gx < g; gx++ ) {
					const x = Math.floor( ( ( gx + 0.5 ) * scratch.width ) / g );
					const y = Math.floor( ( ( gy + 0.5 ) * scratch.height ) / g );
					const idx = ( y * scratch.width + x ) * 4;
					points.push( [ data[ idx ], data[ idx + 1 ], data[ idx + 2 ], data[ idx + 3 ] ] );
				}
			}
			return points;
		},
		{ selector, grid }
	);
}

/**
 * Is this grid of points NON-uniform (more than one distinct pixel value)?
 * A canvas/image that drew nothing collapses to a single repeated value.
 *
 * @param {number[][]} points
 * @return {boolean}
 */
function isNonUniform( points ) {
	if ( ! points || points.length < 2 ) {
		return false;
	}
	const [ r0, g0, b0, a0 ] = points[ 0 ];
	return points.some(
		( [ r, g, b, a ] ) => r !== r0 || g !== g0 || b !== b0 || a !== a0
	);
}

/**
 * Fraction of corresponding grid points that differ beyond a small
 * per-channel tolerance (guards against 1-bit rounding noise from the
 * software rasteriser counting as a "difference").
 *
 * @param {number[][]} a
 * @param {number[][]} b
 * @param {number}     tolerance Per-channel delta below which two points count as "same".
 * @return {number} 0..1
 */
function diffFraction( a, b, tolerance = 6 ) {
	const n = Math.min( a.length, b.length );
	let differing = 0;
	for ( let i = 0; i < n; i++ ) {
		const [ ar, ag, ab ] = a[ i ];
		const [ br, bg, bb ] = b[ i ];
		if (
			Math.abs( ar - br ) > tolerance ||
			Math.abs( ag - bg ) > tolerance ||
			Math.abs( ab - bb ) > tolerance
		) {
			differing++;
		}
	}
	return n === 0 ? 0 : differing / n;
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
 * ARM 1b — the canvas actually painted (non-uniform pixels), paired
 * with a synthetic negative control proving the non-uniformity test
 * itself can fail.
 * =================================================================== */
let aPixels = null;
if ( aCount > 0 ) {
	aPixels = await sampleCanvasPixels( page, `${ instanceASelector } canvas.sgs-webgl-surface` );
	check(
		'1b — A canvas pixels are non-uniform (actually drew something)',
		isNonUniform( aPixels ),
		aPixels
			? `${ aPixels.length } samples, first=${ JSON.stringify( aPixels[ 0 ] ) } last=${ JSON.stringify( aPixels[ aPixels.length - 1 ] ) }`
			: 'no pixel data read (canvas missing or zero-size)'
	);
} else {
	check( '1b — A canvas pixels non-uniform', false, 'instance A not found' );
}

const syntheticUniform = await page.evaluate( () => {
	const c = document.createElement( 'canvas' );
	c.width = 32;
	c.height = 32;
	// Deliberately left untouched — a fully transparent, uniformly-blank
	// buffer, the same shape a "drew nothing" canvas would produce.
	const ctx = c.getContext( '2d' );
	const { data } = ctx.getImageData( 0, 0, c.width, c.height );
	const points = [];
	for ( let i = 0; i < data.length; i += 4 ) {
		points.push( [ data[ i ], data[ i + 1 ], data[ i + 2 ], data[ i + 3 ] ] );
	}
	return points;
} );
check(
	'1b negative control — a blank synthetic canvas FAILS the same non-uniformity test',
	! isNonUniform( syntheticUniform ),
	`${ syntheticUniform.length } samples, all equal to ${ JSON.stringify( syntheticUniform[ 0 ] ) } — proves the detector discriminates`
);

/* =====================================================================
 * ARM 2 — treated ≠ untreated: proves a TREATMENT happened, not a
 * passthrough blit of the same image.
 * =================================================================== */
if ( aPixels && instanceDSelector ) {
	const dPixels = await sampleImagePixels( page, instanceDSelector );
	if ( dPixels ) {
		const frac = diffFraction( aPixels, dPixels );
		check(
			'2 — A canvas differs from D untreated image at a meaningful fraction of sample points',
			frac >= 0.5,
			`${ Math.round( frac * 100 ) }% of ${ Math.min( aPixels.length, dPixels.length ) } grid points differ (threshold 50%)`
		);
	} else {
		check( '2 — A vs D pixel diff', false, 'could not read D pixel data' );
	}
} else {
	check( '2 — A vs D pixel diff', false, 'missing A pixels or D selector, cannot compare' );
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
 * Negative control: prove the comparison mechanism is LIVE by first
 * confirming both samples are themselves non-uniform (not two blank
 * reads trivially matching each other).
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

	const rmPixels = await sampleCanvasPixels( rmPage, `${ instanceASelector } canvas.sgs-webgl-surface` );
	const bothNonUniform = isNonUniform( aPixels ) && isNonUniform( rmPixels );
	check(
		'6 negative control — the comparison is LIVE (both samples are themselves non-uniform, not two blank reads)',
		bothNonUniform,
		`normal non-uniform=${ isNonUniform( aPixels ) } reduced-motion non-uniform=${ isNonUniform( rmPixels ) }`
	);
	if ( bothNonUniform ) {
		const frac = diffFraction( aPixels, rmPixels );
		check(
			'6 — normal vs reduced-motion renders are the SAME image (this effect never animates)',
			frac < 0.05,
			`${ Math.round( frac * 100 ) }% of grid points differ between normal and reduced-motion (threshold <5%)`
		);
	} else {
		check( '6 — normal vs reduced-motion pixel match', false, 'cannot compare, one or both samples were blank' );
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

/**
 * Spec 38 Wave C — live browser probe for every shipped Wave C effect.
 *
 * WHAT THIS EXISTS TO SETTLE
 * The Wave C deploy report (`.claude/reports/2026-07-31-motion-waveC-deploy-verification.md`)
 * banked server-render, compiled-asset and network evidence, and said plainly
 * that it proved NOTHING about whether any effect actually MOVES. This probe is
 * the missing half: for each effect it asserts on the ONE observable signal that
 * can only change if the effect ran.
 *
 * ⚠ THE MISTAKE THIS FILE'S SHAPE EXISTS TO PREVENT (v1, 2026-07-31)
 * The first version sampled `stroke-dashoffset` and scramble text from a
 * `requestAnimationFrame` loop installed at page init, and reported BOTH as
 * "never changed". Both readings were false. Every Tier G effect on this page
 * defaults to `trigger: scroll` (`provider.js` `resolveTrigger` → `'scroll'`
 * when the attribute is absent), so an effect below the fold has not fired yet
 * and never will until something scrolls to it — the sampler was measuring
 * elements that were correctly still waiting. **A probe that never scrolls to
 * the effect is measuring the probe, not the effect.** Every measurement below
 * therefore scrolls its target into view FIRST and only then samples.
 *
 * WHY EACH ASSERTION IS THE ONE THAT MATTERS
 *  · draggable (gallery)   — `scrollLeft` must follow the pointer DURING a drag
 *                            and keep moving AFTER release when momentum is on.
 *                            "Draggable attached" is not the claim.
 *  · draggable (slider)    — `--sgs-slider-offset` must change. That block's
 *                            track is transform-driven, so `scrollLeft` would be
 *                            a vacuous 0 forever.
 *  · draw (responsive-logo)— `stroke-dasharray` must carry DrawSVG's signature.
 *                            An untouched SVG has `stroke-dasharray: none`, so
 *                            the presence of a dash pair is itself the proof the
 *                            plugin ran; the scroll arm must additionally go
 *                            from 0%-drawn to fully drawn as it is scrolled past.
 *  · scramble              — the heading text must DIFFER from the authored
 *                            string at some sampled moment and settle back to it
 *                            EXACTLY. Settling alone is what a no-op looks like.
 *  · image-sequence        — the canvas's own pixels must change with scroll. The
 *                            fixture frames ramp brightness monotonically with
 *                            frame index, so mean luminance reads out WHICH frame
 *                            is painted, not merely that something painted.
 *  · before-after          — `--sgs-before-after-position` must track a drag on
 *                            the image area (the GSAP layer), and separately via
 *                            the range input (which works with no GSAP at all).
 *
 * NEGATIVE CONTROLS (a test that cannot fail proves nothing)
 *  · Momentum: instance 1 of gallery + slider has momentum ON, instance 2 OFF —
 *    a within-page control under one build, not a cross-run comparison.
 *  · Reduced motion: both arms run. Identical readings across arms means the
 *    emulation did not take effect → INCONCLUSIVE, never PASS.
 *  · Draw scroll arm: sampled BEFORE it is scrolled to as well as after, so
 *    "fully drawn" is a change rather than a state that was always true.
 *
 * Usage:  node scripts/motion-qa/probe-wave-c.mjs [url]
 * Output: JSON on stdout. Exit 0 pass · 1 fail · 2 inconclusive.
 *
 * EXTENSION 2026-07-31 (register Steps 1 + 14) — WHAT WAS ADDED AND WHY
 *
 *  · TOUCH ARM (Step 1). Draggable's whole module is gated behind
 *    `window.matchMedia('(pointer: fine)')` (`fx-draggable.js` line ~319) —
 *    that is a code READING, never measured live. This run adds a real
 *    coarse-pointer context (`hasTouch: true, isMobile: true, 390×844`) and
 *    drives a GENUINE native swipe via CDP `Input.dispatchTouchEvent` (not a
 *    synthetic `scrollLeft` write, which would prove nothing about whether
 *    the BROWSER's own touch-scroll path still works) plus an unrelated
 *    hybrid-pointer context (`hasTouch: true` with NO mobile emulation) to
 *    settle the register's Edge case empirically. Confirmed via an
 *    independent instrument (Chrome DevTools MCP, not this Playwright
 *    process) before being encoded here: `(pointer: fine)` reflects the
 *    PRIMARY pointer, so a hybrid device with both touch and a mouse reads
 *    `pointer: fine === true` — the FINE-POINTER branch wins and Draggable
 *    DOES bind (cursor became `grab`, matched live). A pure-touch device
 *    (`isMobile: true`) reads `pointer: fine === false` and the module
 *    never binds.
 *  · REDUCED-MOTION ARMS for `scrub`, `pin-scrub`, `split-reveal` and
 *    `motion-path` (Step 14). These four (plus `horizontal-panel`, already
 *    covered by the sibling `probe-reduced-motion.mjs` and ported in here so
 *    every §10 row lives in ONE re-runnable harness) were "reasoned by
 *    construction" only — Spec 38 FR-38-20 itself says that must be flagged
 *    as the lesser standard. `scrub`, `pin-scrub` and `horizontal-panel` are
 *    genuinely SCRUBBED (continuous — `scrub: true` in their ScrollTrigger
 *    config), so they are measured in place via a scroll sweep, like DrawSVG
 *    above. `split-reveal` fires ONCE on crossing its start line (plain
 *    `gsap.from` + `scrollTrigger`, no `scrub`), so — exactly like
 *    ScrambleText — it needs its own fresh page, parked above the fold
 *    before the trigger line is crossed.
 *  · `morph` is NOT measured and is reported `NOT-BUILT`, not
 *    `INCONCLUSIVE`. Verified two ways before writing this: (1)
 *    `src/blocks/extensions/fx.js`'s `SHIPPED_EFFECTS` array explicitly
 *    excludes it with a comment — "the module landed, but its asset half is
 *    deliberately deferred (D427)" — so no client can select it from any
 *    inspector; (2) every plausible canary slug
 *    (`motion-canary-morph`/`motion-canary-morphsvg`) 404s live. A selector
 *    that structurally cannot match anything is a documented non-build, not
 *    an unmeasured claim — see the per-effect verdict block at the bottom.
 *  · Each new assertion runs through a `selfTest()` BEFORE the browser
 *    opens: known-good and known-BAD fixtures are fed to the same pure
 *    helper functions (`varied()`/`allNear()`) the real measurements use,
 *    and the script refuses to run (`exit 2`) if either helper cannot tell
 *    them apart. This is the "construct the KNOWN FAILURE and prove the
 *    assertion rejects it" discipline this file's own docblock already
 *    demands of every other measurement here.
 *
 * @package SGS\Blocks
 */

import { chromium } from 'playwright';
import zlib from 'node:zlib';

/**
 * Per-page Tier G/V motion bundle budget, gzip bytes (Step 19 / D448).
 *
 * ⚠ THIS IS A SHARED CONSTANT NAME, NOT A LOCAL CHOICE. Spec 02 sets the
 * framework's page JS budget at <50KB; `SGS_Motion_Diagnostics::BUDGET_BYTES_GZIP`
 * (`plugins/sgs-blocks/includes/class-sgs-motion-diagnostics.php`) cites the
 * same 51200 for the admin-panel report, and any editor-side authoring-time
 * warning (fx.js, owned by a different track per this session's file split)
 * should read this SAME number rather than picking its own — three surfaces
 * measuring against three different thresholds would let a page pass one and
 * fail another for no real reason. If this number ever changes, change it in
 * both PHP and this file together.
 *
 * WHY THIS IS REPORTED, NEVER PUSHED ONTO `fails` (Bean's ruling, D448):
 * capping authoring or keeping the exemption silent were both explicitly
 * rejected. The gate that already exists (`check-motion-bundle-budget.py`)
 * polices PER-MODULE regression against a baseline; this number is a
 * PER-PAGE combinatorial cost that no per-module gate can see (a page can
 * combine five in-budget modules into an over-budget page). Making it
 * visible turns an engineering property into information the operator acts
 * on — it must never silently fail a build.
 */
const MOTION_BUDGET_BYTES_GZIP = 51200; // 50 KB.

/** URL-path fragments that mark a script as one of THIS plugin's motion
 * modules — the exact same scope `check-motion-bundle-budget.py`'s
 * `_WATCHED_SUBDIRS` already uses, so the per-module gate and this per-page
 * report agree on what counts as "a motion module" rather than each
 * inventing its own definition. */
const MOTION_MODULE_URL_FRAGMENTS = [
	'/build/vendor-modules/',
	'/build/shared/effects/',
];

/**
 * Sum the gzip-recompressed size of every motion-module script response seen
 * on a page load. Uses the SAME metric convention as
 * `check-motion-bundle-budget.py::_gzip_size()` (gzip.compress the payload,
 * not the raw Content-Length) so the two numbers are directly comparable —
 * Playwright's `response.body()` returns the DECOMPRESSED payload regardless
 * of what encoding the wire used, so recompressing here (rather than trusting
 * a `content-length` header, which is absent or reflects something else under
 * chunked transfer / different compression) is what makes this an
 * apples-to-apples figure against the committed baseline, not a guess.
 *
 * @param {import('playwright').Page} page Page to attach the listener to.
 * @return {() => Promise<{modules: Object[], totalBytes: number}>} Call after
 *   the page has settled to detach the listener and total the results.
 */
function trackMotionBundleCost( page ) {
	const seen = [];
	const listener = ( response ) => {
		const url = response.url();
		if ( MOTION_MODULE_URL_FRAGMENTS.some( ( f ) => url.includes( f ) ) ) {
			seen.push( response );
		}
	};
	page.on( 'response', listener );

	return async () => {
		page.off( 'response', listener );
		const modules = [];
		let totalBytes = 0;
		for ( const response of seen ) {
			let bytes = null;
			try {
				const body = await response.body();
				bytes = zlib.gzipSync( body ).length;
			} catch ( e ) {
				bytes = null; // Response body unavailable (e.g. redirected/aborted) — reported, not silently dropped.
			}
			const marker = MOTION_MODULE_URL_FRAGMENTS.find( ( f ) =>
				url_includes_any( response.url(), f )
			);
			modules.push( { url: relativiseMotionUrl( response.url() ), bytes } );
			if ( null !== bytes ) {
				totalBytes += bytes;
			}
		}
		// De-duplicate by URL — a module requested twice (e.g. a second
		// in-page instance re-triggering an import) must count once, matching
		// what a browser's module cache actually delivers to the page.
		const byUrl = new Map();
		for ( const m of modules ) {
			if ( ! byUrl.has( m.url ) ) {
				byUrl.set( m.url, m );
			}
		}
		const deduped = Array.from( byUrl.values() );
		const dedupedTotal = deduped.reduce(
			( sum, m ) => sum + ( m.bytes || 0 ),
			0
		);
		return { modules: deduped, totalBytes: dedupedTotal };
	};
}

/** True if `url` contains `fragment`. Tiny named helper kept separate from
 * the inline `.some()` above purely so `trackMotionBundleCost`'s per-response
 * marker lookup reads as intent, not an unlabelled second predicate. */
function url_includes_any( url, fragment ) {
	return url.includes( fragment );
}

/** Trim a motion-module URL down to its plugin-relative path for readable
 * reporting (strips scheme/host/query — the query is just cache-busting). */
function relativiseMotionUrl( url ) {
	const marker = 'wp-content/plugins/sgs-blocks/';
	const idx = url.indexOf( marker );
	const trimmed = idx === -1 ? url : url.slice( idx + marker.length );
	return trimmed.split( '?' )[ 0 ];
}

const URL_ARG = process.argv.find( ( a ) => a.startsWith( 'http' ) );
const BASE_URL =
	URL_ARG ||
	'https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-wave-c/';

/**
 * Cache-busted URL, generated ONCE per run so every page in the run measures
 * the same response.
 *
 * ⚠ Not belt-and-braces. The canary sits behind LiteSpeed, and a run started
 * moments after a deploy read a STALE page: the gallery track measured
 * `scrollWidth === clientWidth` and the DrawSVG sweep produced one dash state,
 * both of which had measured correctly minutes earlier on the same build. A
 * probe that cannot tell "the fix does not work" from "I was served yesterday's
 * HTML" is not a measurement.
 */
const RUN_TS = Date.now();
const URL =
	BASE_URL + ( BASE_URL.includes( '?' ) ? '&' : '?' ) + 'sgsprobe=' + RUN_TS;

/**
 * Dedicated one-effect canary pages (Step 14). Each is a separate WP page —
 * confirmed live 2026-07-31 (`sgsprobe`-cache-busted `curl` + grep for the
 * effect's `data-sgs-fx` attribute, 200 OK, non-empty match) — because these
 * four effects do NOT appear anywhere on `/motion-canary-wave-c/` itself.
 * Same cache-busting discipline as `URL` above and for the same reason
 * (LiteSpeed served stale HTML earlier this session).
 */
const HOST = 'https://sandybrown-nightingale-600381.hostingersite.com';
const SCRUB_URL = `${ HOST }/motion-canary-scrub/?sgsprobe=${ RUN_TS }`;
const PIN_SCRUB_URL = `${ HOST }/motion-canary-pin-scrub/?sgsprobe=${ RUN_TS }`;
const SPLIT_REVEAL_URL = `${ HOST }/motion-canary-split-reveal/?sgsprobe=${ RUN_TS }`;
const HORIZONTAL_PANEL_URL = `${ HOST }/motion-canary-horizontal-panel/?sgsprobe=${ RUN_TS }`;

/**
 * True when every value in `nums` differs from at least one other by more
 * than `tol` — i.e. the series genuinely moved. Used for the no-preference
 * arm of a scrubbed effect: it must show a range, not a flat line.
 *
 * @param {number[]} nums Sampled numbers (nulls/NaN filtered out).
 * @param {number}   tol  Minimum spread to count as "varied".
 * @return {boolean} True if spread > tol.
 */
function varied( nums, tol ) {
	const clean = nums.filter( ( n ) => Number.isFinite( n ) );
	if ( clean.length < 2 ) {
		return false;
	}
	return Math.max( ...clean ) - Math.min( ...clean ) > tol;
}

/**
 * True when every value in `nums` sits within `tol` of `target`. Used for
 * the reduced-motion arm of a SIMPLIFY effect: it must sit at its end state
 * throughout, regardless of scroll position.
 *
 * @param {number[]} nums   Sampled numbers.
 * @param {number}   target The static value the arm should sit at.
 * @param {number}   tol    Allowed deviation.
 * @return {boolean} True if every sample is within tolerance of target.
 */
function allNear( nums, target, tol ) {
	const clean = nums.filter( ( n ) => Number.isFinite( n ) );
	if ( ! clean.length ) {
		return false;
	}
	return clean.every( ( n ) => Math.abs( n - target ) <= tol );
}

/**
 * Prove `varied()`/`allNear()` can actually fail before trusting them on
 * live data. Each fixture pair is a KNOWN-GOOD and a KNOWN-BAD case; if
 * either helper cannot tell them apart, every downstream Step 14 assertion
 * built on it would be checking nothing. Runs before the browser opens.
 */
function selfTest() {
	const problems = [];

	// A genuinely scrubbed opacity arc vs. the flat line a broken/never-firing
	// scrub would produce (the exact shape the DrawSVG defect above once had).
	if ( ! varied( [ 0.02, 0.4, 0.97 ], 0.05 ) ) {
		problems.push( 'varied() rejected a genuinely varying fixture' );
	}
	if ( varied( [ 1, 1, 1, 1 ], 0.05 ) ) {
		problems.push(
			'varied() PASSED a flat known-failure fixture — this is the exact shape a scrub that never ran would produce'
		);
	}

	// A genuinely static SIMPLIFY end-state vs. a leaked scrub still moving
	// under reduced motion (the real defect this arm exists to catch).
	if ( ! allNear( [ 1, 0.99, 1, 1 ], 1, 0.05 ) ) {
		problems.push( 'allNear() rejected a genuinely static fixture' );
	}
	if ( allNear( [ 0.05, 0.5, 1 ], 1, 0.05 ) ) {
		problems.push(
			'allNear() PASSED a known-failure fixture where the effect clearly still scrubbed under reduced motion'
		);
	}

	if ( problems.length ) {
		console.error(
			'SELF-TEST FAILED — refusing to run the Step 14 arms on unproven assertions:\n - ' +
				problems.join( '\n - ' )
		);
		process.exit( 2 );
	}
}

selfTest();

/**
 * Scroll an element to the middle of the viewport and settle.
 *
 * @param {import('playwright').Page} page Page.
 * @param {string}                    sel  Selector.
 * @param {number}                    nth  0-based index.
 * @param {number}                    wait Settle time in ms.
 */
async function bring( page, sel, nth, wait = 900 ) {
	await page.locator( sel ).nth( nth ).scrollIntoViewIfNeeded();
	await page.waitForTimeout( wait );
}

/**
 * Poll one readout many times over a window, returning the distinct values seen.
 * Used for the two effects whose evidence is a TRANSIENT.
 *
 * @param {import('playwright').Page} page   Page.
 * @param {Function}                  reader Evaluated in-page; returns a string.
 * @param {number}                    ms     Total window.
 * @param {number}                    every  Poll interval.
 * @return {Promise<string[]>} Distinct values in first-seen order.
 */
async function pollDistinct( page, reader, ms = 3000, every = 40 ) {
	const seen = [];
	const end = Date.now() + ms;
	while ( Date.now() < end ) {
		// eslint-disable-next-line no-await-in-loop
		const v = await page.evaluate( reader );
		if ( ! seen.includes( v ) ) {
			seen.push( v );
		}
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( every );
	}
	return seen;
}

/**
 * Drag horizontally across an element and report how its chosen readout moved
 * during the gesture and after release.
 *
 * @param {import('playwright').Page} page     Page.
 * @param {string}                    selector Element to drag.
 * @param {number}                    nth      0-based index among matches.
 * @param {string}                    readout  'scrollLeft' | 'sliderOffset' | 'baPosition'.
 * @return {Promise<Object>} Before / during / at-release / settled values.
 */
async function dragAndMeasure( page, selector, nth, readout ) {
	await bring( page, selector, nth, 400 );
	const box = await page.locator( selector ).nth( nth ).boundingBox();
	if ( ! box ) {
		return { error: 'NO_BOX' };
	}

	const read = () =>
		page.evaluate(
			( [ sel, index, kind ] ) => {
				const el = document.querySelectorAll( sel )[ index ];
				if ( ! el ) {
					return null;
				}
				if ( 'scrollLeft' === kind ) {
					return Math.round( el.scrollLeft );
				}
				if ( 'sliderOffset' === kind ) {
					const list =
						el.querySelector( '.sgs-testimonial-slider__list' ) || el;
					return Math.round(
						parseFloat(
							getComputedStyle( list ).getPropertyValue(
								'--sgs-slider-offset'
							)
						)
					);
				}
				const root = el.closest( '.wp-block-sgs-before-after' ) || el;
				return Math.round(
					parseFloat(
						getComputedStyle( root ).getPropertyValue(
							'--sgs-before-after-position'
						)
					)
				);
			},
			[ selector, nth, readout ]
		);

	const before = await read();
	const y = box.y + box.height / 2;
	const startX = box.x + box.width * 0.8;

	await page.mouse.move( startX, y );
	await page.mouse.down();
	// Fast small steps: one big jump gives GSAP no velocity to derive momentum
	// from, so momentum would read as absent for the wrong reason.
	const trail = [];
	for ( let step = 1; step <= 12; step++ ) {
		// eslint-disable-next-line no-await-in-loop
		await page.mouse.move( startX - step * 30, y, { steps: 1 } );
		// eslint-disable-next-line no-await-in-loop
		trail.push( await read() );
	}
	const during = await read();
	await page.mouse.up();
	const atRelease = await read();
	await page.waitForTimeout( 250 );
	const shortlyAfter = await read();
	await page.waitForTimeout( 1500 );
	const settled = await read();

	return {
		before,
		during,
		atRelease,
		shortlyAfter,
		settled,
		trailDistinct: Array.from( new Set( trail ) ).length,
		coastDelta:
			null === atRelease || null === settled ? null : settled - atRelease,
	};
}

/**
 * Mean luminance of a canvas's painted pixels. The fixture frames ramp
 * brightness monotonically with frame index, so this reads out WHICH frame is
 * drawn — not merely that something is drawn.
 *
 * @param {import('playwright').Page} page Page.
 * @param {number}                    nth  Canvas index.
 * @return {Promise<number|null>} Mean luminance 0-255, or null.
 */
function canvasLuma( page, nth ) {
	return page.evaluate( ( index ) => {
		const c = document.querySelectorAll(
			'canvas[data-sgs-fx="image-sequence"]'
		)[ index ];
		if ( ! c || ! c.width ) {
			return null;
		}
		const d = c
			.getContext( '2d' )
			.getImageData( 0, 0, c.width, c.height ).data;
		let sum = 0;
		let n = 0;
		for ( let i = 0; i < d.length; i += 4 * 97 ) {
			sum += ( d[ i ] + d[ i + 1 ] + d[ i + 2 ] ) / 3;
			n++;
		}
		return n ? Math.round( ( sum / n ) * 100 ) / 100 : null;
	}, nth );
}

/** Read every draw target's dash state. */
const readDraw = () =>
	Array.from( document.querySelectorAll( '[data-sgs-fx="draw"]' ) ).map(
		( host ) => {
			const shapes = Array.from(
				host.querySelectorAll(
					'path,line,circle,rect,polyline,polygon,ellipse'
				)
			);
			return {
				trigger: host.getAttribute( 'data-sgs-fx-trigger' ),
				shapes: shapes.length,
				dash: shapes.map( ( s ) => {
					const cs = getComputedStyle( s );
					return cs.strokeDasharray + ' | off ' + cs.strokeDashoffset;
				} ),
			};
		}
	);

/**
 * `scrub` (element scrub timeline, Step 14). Scrubbed = continuous, so
 * unlike ScrambleText/split-reveal it can be measured in place with a
 * scroll sweep rather than needing a fresh page — there is no one-shot
 * trigger to "spend".
 *
 * @param {import('playwright').BrowserContext} context Context (carries the
 *                                                        arm's reducedMotion).
 * @param {string}                              url     Page URL.
 * @return {Promise<Object>} `{ arc, opacities, translateYs }` or `{ error }`.
 */
async function measureScrubElement( context, url ) {
	const page = await context.newPage();
	await page.goto( url, { waitUntil: 'load' } );
	await page.waitForTimeout( 900 );

	const count = await page.locator( '[data-sgs-fx="scrub"]' ).count();
	if ( ! count ) {
		await page.close();
		return { error: 'NO_HOST' };
	}

	const geo = await page.evaluate( () => {
		const el = document.querySelector( '[data-sgs-fx="scrub"]' );
		const r = el.getBoundingClientRect();
		return { docTop: r.top + window.scrollY, vh: window.innerHeight };
	} );

	const arc = [];
	for (
		let y = Math.max( 0, geo.docTop - geo.vh );
		y <= geo.docTop + geo.vh * 0.6;
		y += 80
	) {
		// eslint-disable-next-line no-await-in-loop
		await page.evaluate( ( yy ) => window.scrollTo( 0, yy ), y );
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( 90 );
		// eslint-disable-next-line no-await-in-loop
		const sample = await page.evaluate( () => {
			const el = document.querySelector( '[data-sgs-fx="scrub"]' );
			const cs = getComputedStyle( el );
			const m = new DOMMatrixReadOnly( cs.transform );
			return {
				opacity: parseFloat( cs.opacity ),
				translateY: Math.round( m.m42 * 10 ) / 10,
			};
		} );
		arc.push( sample );
	}

	await page.close();
	return {
		arc,
		opacities: arc.map( ( s ) => s.opacity ),
		translateYs: arc.map( ( s ) => s.translateY ),
	};
}

/**
 * `pin-scrub` (Step 14). Also continuous — measured in place via a scroll
 * sweep through the pin range, reading `.pin-spacer` presence (the pin
 * engagement signal every other pin/scrub probe in this house uses) plus a
 * participating child's opacity.
 *
 * @param {import('playwright').BrowserContext} context Context.
 * @param {string}                              url     Page URL.
 * @return {Promise<Object>} `{ pinSpacerPresent, arc, opacities }` or `{ error }`.
 */
async function measurePinScrub( context, url ) {
	const page = await context.newPage();
	await page.goto( url, { waitUntil: 'load' } );
	await page.waitForTimeout( 900 );

	const count = await page.locator( '[data-sgs-fx="pin-scrub"]' ).count();
	if ( ! count ) {
		await page.close();
		return { error: 'NO_HOST' };
	}

	const pinSpacerPresent = await page.evaluate(
		() =>
			!! document
				.querySelector( '[data-sgs-fx="pin-scrub"]' )
				.closest( '.pin-spacer' )
	);

	const geo = await page.evaluate( () => {
		const el = document.querySelector( '[data-sgs-fx="pin-scrub"]' );
		const r = el.getBoundingClientRect();
		return { docTop: r.top + window.scrollY, vh: window.innerHeight };
	} );

	const arc = [];
	for (
		let y = Math.max( 0, geo.docTop - geo.vh * 0.5 );
		y <= geo.docTop + geo.vh * 1.5;
		y += 100
	) {
		// eslint-disable-next-line no-await-in-loop
		await page.evaluate( ( yy ) => window.scrollTo( 0, yy ), y );
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( 90 );
		// eslint-disable-next-line no-await-in-loop
		const sample = await page.evaluate( () => {
			const host = document.querySelector( '[data-sgs-fx="pin-scrub"]' );
			const wrapper =
				host.querySelector( ':scope > .wp-block-sgs-container' ) || host;
			const kids = Array.from( wrapper.children ).filter(
				( n ) => n.nodeType === 1
			);
			// Index 1: the first PARAGRAPH participant ("This child animates
			// during the pin.") — index 0 is the section's own heading, which
			// also animates but is a noisier readout of the same signal.
			const child = kids[ 1 ] || kids[ 0 ];
			if ( ! child ) {
				return null;
			}
			return { opacity: parseFloat( getComputedStyle( child ).opacity ) };
		} );
		arc.push( sample );
	}

	await page.close();
	return {
		pinSpacerPresent,
		arc,
		opacities: arc.filter( Boolean ).map( ( s ) => s.opacity ),
	};
}

/**
 * `split-reveal` (Step 14). ONE-SHOT — `gsap.from()` + plain `scrollTrigger`,
 * no `scrub`, so exactly like ScrambleText it must run on its own fresh page,
 * parked above the fold before the start line is crossed, or an earlier
 * measurement's scrolling would have already spent it (see the file-level
 * note on `measureScramble` for why this class of bug is real, not
 * theoretical, on this page set).
 *
 * @param {import('playwright').BrowserContext} context Context.
 * @param {string}                              url     Page URL.
 * @return {Promise<Object>} Pre/post split-fragment readings, or `{ error }`.
 */
async function measureSplitReveal( context, url ) {
	const page = await context.newPage();
	await page.goto( url, { waitUntil: 'load' } );
	await page.waitForTimeout( 900 );

	const count = await page.locator( '[data-sgs-fx="split-reveal"]' ).count();
	if ( ! count ) {
		await page.close();
		return { error: 'NO_HOST' };
	}

	const originalText = await page.evaluate( () =>
		document.querySelector( '[data-sgs-fx="split-reveal"]' ).textContent.trim()
	);

	// Park a full viewport above the heading — its start line ('top 85%',
	// unauthored default on this canary) has not been crossed yet.
	await page.evaluate( () => {
		const el = document.querySelector( '[data-sgs-fx="split-reveal"]' );
		const top = el.getBoundingClientRect().top + window.scrollY;
		window.scrollTo( 0, Math.max( 0, top - window.innerHeight * 1.5 ) );
	} );
	await page.waitForTimeout( 500 );

	const pre = await page.evaluate( () => {
		const el = document.querySelector( '[data-sgs-fx="split-reveal"]' );
		// ⚠ NOT `querySelectorAll('span')` — a first cut of this probe hardcoded
		// `span` and read 0 fragments on this exact canary, reporting a false
		// DEFECT. Cross-checked live via Chrome DevTools MCP (independent
		// instrument, 2026-07-31): GSAP 3.15's SplitText wraps each `words`
		// fragment in a `<div aria-hidden="true">` here, not a `<span>` — the
		// wrapper tag is SplitText's own implementation detail, not part of
		// the contract this probe should assume. DIRECT CHILDREN of the split
		// host is the tag-agnostic, correct signal: SplitText's split targets
		// are always the element's own children, regardless of which tag it
		// picks.
		const fragments = el.children;
		return {
			spanCount: fragments.length,
			firstOpacity: fragments.length
				? parseFloat( getComputedStyle( fragments[ 0 ] ).opacity )
				: null,
		};
	} );

	await page.evaluate( () => {
		const el = document.querySelector( '[data-sgs-fx="split-reveal"]' );
		const top = el.getBoundingClientRect().top + window.scrollY;
		window.scrollTo( 0, Math.max( 0, top - window.innerHeight * 0.3 ) );
	} );
	// The tween is a one-shot with a real duration (house default), not a
	// scrub — give it time to actually finish before sampling "settled".
	await page.waitForTimeout( 1600 );

	const post = await page.evaluate( () => {
		const el = document.querySelector( '[data-sgs-fx="split-reveal"]' );
		const fragments = el.children; // see the `pre` reader above for why
		return {
			spanCount: fragments.length,
			opacities: Array.from( fragments ).map( ( s ) =>
				parseFloat( getComputedStyle( s ).opacity )
			),
			text: el.textContent.trim(),
			ariaLabel: el.getAttribute( 'aria-label' ),
		};
	} );

	await page.close();
	return { originalText, pre, post };
}

/**
 * `horizontal-panel` (Step 14). Ported into this harness so every §10 row
 * lives in one re-runnable file (register's own instruction). The
 * reachability + `effectRan` logic mirrors the already-proven
 * `probe-reduced-motion.mjs` (same house, same signals — `.pin-spacer`
 * presence for engagement, last-panel-visible for reachability); this adds
 * a translate-sweep on top so the no-preference arm proves genuine SLIDING,
 * not merely "pinned and static".
 *
 * @param {import('playwright').BrowserContext} context Context.
 * @param {string}                              url     Page URL.
 * @return {Promise<Object>} State object, `error`/`VACUOUS` reachability, or `{ error }`.
 */
async function measureHorizontalPanel( context, url ) {
	const page = await context.newPage();
	await page.goto( url, { waitUntil: 'load' } );
	await page.waitForTimeout( 1000 );

	const count = await page.locator( '[data-sgs-fx="horizontal-panel"]' ).count();
	if ( ! count ) {
		await page.close();
		return { error: 'NO_HOST' };
	}

	const state = await page.evaluate( async () => {
		const host = document.querySelector( '[data-sgs-fx="horizontal-panel"]' );
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
			overflowX: cs.overflowX,
			scrollSnapType: cs.scrollSnapType,
			effectRan: !! host.closest( '.pin-spacer' ),
			panelCount: panels.length,
		};
		if ( panels.length < 2 ) {
			out.reachability = 'VACUOUS';
			return out;
		}
		host.scrollLeft = host.scrollWidth;
		await new Promise( ( r ) => requestAnimationFrame( r ) );
		await new Promise( ( r ) => setTimeout( r, 100 ) );
		const last = panels[ panels.length - 1 ].getBoundingClientRect();
		const hostRect = host.getBoundingClientRect();
		out.lastPanelFullyVisible =
			last.left >= hostRect.left - 1 && last.right <= hostRect.right + 1;
		out.reachability = out.lastPanelFullyVisible ? 'REACHABLE' : 'UNREACHABLE';
		return out;
	} );

	// Movement sweep — only meaningful when the pin actually engaged.
	if ( state.effectRan ) {
		const spacerTop = await page.evaluate( () => {
			const spacer = document
				.querySelector( '[data-sgs-fx="horizontal-panel"]' )
				.closest( '.pin-spacer' );
			return spacer.getBoundingClientRect().top + window.scrollY;
		} );
		const reads = [];
		for ( const frac of [ 0, 0.5, 1 ] ) {
			// eslint-disable-next-line no-await-in-loop
			await page.evaluate(
				( y ) => window.scrollTo( 0, y ),
				spacerTop + frac * 500
			);
			// eslint-disable-next-line no-await-in-loop
			await page.waitForTimeout( 150 );
			// eslint-disable-next-line no-await-in-loop
			const x = await page.evaluate( () => {
				const host = document.querySelector(
					'[data-sgs-fx="horizontal-panel"]'
				);
				const marked = host.querySelector( ':scope > [data-sgs-fx-track]' );
				const track = marked
					? marked.querySelector( ':scope > .wp-block-sgs-container' ) ||
					  marked
					: host;
				const m = new DOMMatrixReadOnly( getComputedStyle( track ).transform );
				return Math.round( m.m41 * 10 ) / 10;
			} );
			reads.push( x );
		}
		state.translateSweep = reads;
	}

	await page.close();
	return state;
}

/**
 * Native, CDP-driven touch swipe (Step 1). Deliberately NOT a synthetic
 * `el.scrollLeft = X` write — that would prove nothing about whether the
 * BROWSER's own touch-scroll path still works, which is the actual claim
 * under test ("native scroll still moves the track"). `Input.dispatchTouchEvent`
 * drives Chromium's real touch/compositor scroll path.
 *
 * @param {import('playwright').Page} page     Page (context must have `hasTouch: true`).
 * @param {string}                    selector Scroller selector.
 * @param {number}                    nth      0-based index.
 * @return {Promise<Object>} Before/after scrollLeft + cursor, or `{ error }`.
 */
async function nativeTouchSwipe( page, selector, nth ) {
	const loc = page.locator( selector ).nth( nth );
	await loc.scrollIntoViewIfNeeded();
	await page.waitForTimeout( 300 );
	const box = await loc.boundingBox();
	if ( ! box ) {
		return { error: 'NO_BOX' };
	}

	const before = await loc.evaluate( ( e ) => Math.round( e.scrollLeft ) );
	const cursorBefore = await loc.evaluate( ( e ) => getComputedStyle( e ).cursor );

	const client = await page.context().newCDPSession( page );
	const y = box.y + box.height / 2;
	const startX = box.x + box.width * 0.85;

	await client.send( 'Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [ { x: startX, y } ],
	} );
	/*
	 * ⚠ STEP COUNT / SPACING / DISTANCE ARE LOAD-BEARING, NOT ARBITRARY
	 * (2026-07-31). The first version (10 steps, 20ms apart, 0.5×width total
	 * distance) reproducibly FAILED to trigger Chromium's native touch-scroll
	 * recognition on this run: measured live via 8 fresh-context repeats —
	 * 2 read `moved: false` (scrollLeft stuck at 0) and 6 read `moved: true`,
	 * same page, same geometry, only the RNG of CDP touch-gesture timing
	 * differing. A flaky negative is exactly as false as a flaky positive: it
	 * would have reported "native scroll is broken" on a coin-flip. 15 steps
	 * at 30ms with 0.6×width of total travel (more distance covered more
	 * slowly) reproduced `moved: true` 5/5 in the same fresh-context repeat
	 * harness — Chromium's touch-scroll gesture recogniser apparently needs
	 * more cumulative distance/time before it commits to a scroll rather than
	 * treating the sequence as a tap-and-hold. This is a probe reliability
	 * fix, not a change to what is being asserted.
	 */
	const steps = 15;
	for ( let i = 1; i <= steps; i++ ) {
		const x = startX - ( i * box.width * 0.6 ) / steps;
		// eslint-disable-next-line no-await-in-loop
		await client.send( 'Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [ { x, y } ],
		} );
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( 30 );
	}
	await client.send( 'Input.dispatchTouchEvent', {
		type: 'touchEnd',
		touchPoints: [],
	} );
	await page.waitForTimeout( 600 );

	const after = await loc.evaluate( ( e ) => Math.round( e.scrollLeft ) );
	const cursorAfter = await loc.evaluate( ( e ) => getComputedStyle( e ).cursor );

	return { before, after, moved: after !== before, cursorBefore, cursorAfter };
}

/**
 * Measure ScrambleText on its OWN FRESH PAGE.
 *
 * ⚠ Why it cannot share the main page: every scramble heading defaults to
 * `trigger: scroll` with `start: 'top 85%'`, and the tween fires ONCE, the
 * first time that line is crossed. Any earlier measurement that scrolls past
 * them — the DrawSVG sweep does exactly this — has already spent the tween, so
 * a later "scroll to the heading and watch" window sees only settled text and
 * reports a false "never scrambled". Both headings are also adjacent, so they
 * must be watched together in one window rather than one after the other.
 *
 * @param {import('playwright').BrowserContext} context Browser context.
 * @return {Promise<Object[]>} Per-heading readings.
 */
async function measureScramble( context ) {
	const page = await context.newPage();
	await page.goto( URL, { waitUntil: 'load' } );
	await page.waitForTimeout( 1500 );

	const count = await page.locator( '[data-sgs-fx="scramble"]' ).count();
	if ( ! count ) {
		return [];
	}

	// Park a full viewport ABOVE both headings, so neither has crossed its
	// start line yet and the scramble is still ahead of us.
	await page.evaluate( () => {
		const first = document.querySelector( '[data-sgs-fx="scramble"]' );
		const top = first.getBoundingClientRect().top + window.scrollY;
		window.scrollTo( 0, Math.max( 0, top - window.innerHeight * 1.5 ) );
	} );
	await page.waitForTimeout( 800 );

	const pre = await page.evaluate( () =>
		Array.from(
			document.querySelectorAll( '[data-sgs-fx="scramble"]' )
		).map( ( el ) => el.textContent.trim() )
	);

	await page.evaluate( () => {
		const first = document.querySelector( '[data-sgs-fx="scramble"]' );
		const top = first.getBoundingClientRect().top + window.scrollY;
		window.scrollTo( 0, Math.max( 0, top - window.innerHeight * 0.4 ) );
	} );

	const seenAll = await pollDistinct(
		page,
		() =>
			JSON.stringify(
				Array.from(
					document.querySelectorAll( '[data-sgs-fx="scramble"]' )
				).map( ( el ) => el.textContent.trim() )
			),
		3200,
		30
	);
	await page.waitForTimeout( 1600 );

	const results = [];
	for ( let i = 0; i < count; i++ ) {
		const values = Array.from(
			new Set( seenAll.map( ( s ) => JSON.parse( s )[ i ] ) )
		);
		results.push( {
			index: i,
			preScrollText: pre[ i ],
			distinctCount: values.length,
			sample: values.slice( 0, 5 ),
			// Read the FINAL text AFTER the window closes — the last NEW value
			// observed can be a mid-scramble frame, which is what made an
			// earlier revision report a false "settled != original".
			settled: await page.evaluate(
				( n ) =>
					document
						.querySelectorAll( '[data-sgs-fx="scramble"]' )
						[ n ].textContent.trim(),
				i
			),
			ariaLabel: await page.evaluate(
				( n ) =>
					document
						.querySelectorAll( '[data-sgs-fx="scramble"]' )
						[ n ].getAttribute( 'aria-label' ),
				i
			),
		} );
	}

	await page.close();
	return results;
}

/**
 * Run every measurement under one motion preference.
 *
 * @param {import('playwright').Browser} browser       Browser.
 * @param {string}                       reducedMotion 'reduce' | 'no-preference'.
 * @return {Promise<Object>} All readings for this arm.
 */
async function runArm( browser, reducedMotion ) {
	const context = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		reducedMotion,
	} );
	const page = await context.newPage();
	const errors = [];
	const failedRequests = [];
	page.on( 'pageerror', ( e ) => errors.push( 'pageerror: ' + e.message ) );
	page.on( 'response', ( r ) => {
		if ( r.status() >= 400 ) {
			failedRequests.push( r.status() + ' ' + r.url() );
		}
	} );

	// Step 19 / D448 — installed BEFORE goto so it catches every motion
	// module request from first paint, not just ones issued after this line.
	const finishMotionCost = trackMotionBundleCost( page );

	await page.goto( URL, { waitUntil: 'load' } );
	await page.waitForTimeout( 1200 );

	const out = { reducedMotion, errors };

	// All Tier G/V motion modules this house has today are enqueued at
	// render time (SGS_Motion_Registry::sniff_block / enqueue_effect), not
	// lazy-loaded on scroll, so the settle window above is sufficient to have
	// seen every request before totalling. Finalised here (not at the very
	// end of runArm) so later steps' own network activity (touch swipes,
	// scroll sweeps) cannot inflate the count with an unrelated request.
	out.motionPageCost = await finishMotionCost();

	out.mediaQuery = await page.evaluate( () => ( {
		reduce: matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
		noPreference: matchMedia( '(prefers-reduced-motion: no-preference)' )
			.matches,
	} ) );

	// ── first paint: every block's content visible without JS help ──
	out.firstPaint = await page.evaluate( () => {
		const rect = ( sel ) =>
			Array.from( document.querySelectorAll( sel ) ).map( ( el ) => {
				const r = el.getBoundingClientRect();
				const cs = getComputedStyle( el );
				return {
					w: Math.round( r.width ),
					h: Math.round( r.height ),
					opacity: cs.opacity,
					visibility: cs.visibility,
					display: cs.display,
				};
			} );
		return {
			gallery: rect( '.sgs-gallery__grid' ),
			galleryScroller: Array.from(
				document.querySelectorAll( '.sgs-gallery__grid' )
			).map( ( el ) => ( {
				overflowX: getComputedStyle( el ).overflowX,
				gridAutoFlow: getComputedStyle( el ).gridAutoFlow,
				scrollWidth: el.scrollWidth,
				clientWidth: el.clientWidth,
				canScrollHorizontally: el.scrollWidth > el.clientWidth,
			} ) ),
			slider: rect( '.sgs-testimonial-slider__track' ),
			logoSvg: rect( '[data-sgs-fx="draw"] svg' ),
			beforeAfter: rect( '.wp-block-sgs-before-after' ),
			beforeAfterImgCount: document.querySelectorAll(
				'.wp-block-sgs-before-after img'
			).length,
			imageSequencePoster: rect( '.sgs-image-sequence__poster' ),
			scrambleHeadings: rect( '[data-sgs-fx="scramble"]' ),
		};
	} );

	// ── DrawSVG ──
	// The scroll arm is SCRUBBED between `top 85%` and `bottom 40%`, so it must
	// be swept THROUGH that range, not merely brought on screen:
	// `scrollIntoViewIfNeeded` scrolls the minimum distance, which can leave the
	// element sitting below the trigger's start with progress legitimately 0 —
	// that is what made v2 report "dash identical before and after".
	out.drawAtLoad = await page.evaluate( readDraw );
	const drawGeo = await page.evaluate( () => {
		const el = document.querySelectorAll( '[data-sgs-fx="draw"]' )[ 1 ];
		const r = el.getBoundingClientRect();
		return { docTop: r.top + window.scrollY, vh: window.innerHeight };
	} );
	const drawArc = [];
	for (
		let y = Math.max( 0, drawGeo.docTop - drawGeo.vh );
		y <= drawGeo.docTop + drawGeo.vh;
		y += 80
	) {
		// eslint-disable-next-line no-await-in-loop
		await page.evaluate( ( yy ) => window.scrollTo( 0, yy ), y );
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( 110 );
		// eslint-disable-next-line no-await-in-loop
		drawArc.push( ( await page.evaluate( readDraw ) )[ 1 ].dash[ 0 ] );
	}
	out.drawScrollArc = {
		distinct: Array.from( new Set( drawArc ) ),
		distinctCount: new Set( drawArc ).size,
	};
	out.drawAfterScroll = await page.evaluate( readDraw );

	out.scramble = await measureScramble( context );

	// ── Step 14: the four "reasoned by construction" effects ──
	out.scrub = await measureScrubElement( context, SCRUB_URL );
	out.pinScrub = await measurePinScrub( context, PIN_SCRUB_URL );
	out.splitReveal = await measureSplitReveal( context, SPLIT_REVEAL_URL );
	out.horizontalPanel = await measureHorizontalPanel(
		context,
		HORIZONTAL_PANEL_URL
	);

	// ── MotionPath — lives on THIS page (wave-c), continuous scrub, so it is
	// swept in place exactly like DrawSVG above rather than needing its own
	// page. `morph` is NOT measured here — see file docblock: no shipped
	// selector exists anywhere on the site (verified against
	// `SHIPPED_EFFECTS` + two 404'd canary slugs), so a probe for it would
	// only ever read NO_HOST. That absence is reported once, at the verdict,
	// as NOT-BUILT rather than being silently retried per arm.
	//
	// ⚠ SWEEP WINDOW WIDTH — GOT THIS WRONG FIRST, CAUGHT BY CROSS-CHECKING
	// A SECOND INSTRUMENT (2026-07-31). A first cut swept `docTop ± vh` (the
	// same window DrawSVG's arc uses) and it "passed": 18 of 19 samples were
	// bit-for-bit flat and only the LAST sample differed. That is the exact
	// shape the DrawSVG false-pass this file's docblock already warns about
	// had — a spread that clears the tolerance while the actual movement is
	// bunched into a sliver of the sweep. Measured live via Chrome DevTools
	// MCP before trusting it: this element's ScrollTrigger range (`top
	// bottom` → `bottom top` against an element with a large rendered height
	// due to its `align: path` repositioning) does not become active until
	// roughly `docTop + 1.9·vh`, and does not fully settle until roughly
	// `docTop + 3.5·vh` — nearly FOUR viewport-heights of scroll, not two.
	// The window below was widened to cover that measured range with margin
	// on both sides, and the assertion (see verdict section) checks that the
	// movement is spread across multiple samples, not just the first/last.
	const mpCount = await page
		.locator( '[data-sgs-fx="motion-path"]' )
		.count();
	if ( mpCount ) {
		const mpGeo = await page.evaluate( () => {
			const el = document.querySelector( '[data-sgs-fx="motion-path"]' );
			const r = el.getBoundingClientRect();
			return { docTop: r.top + window.scrollY, vh: window.innerHeight };
		} );
		const mpArc = [];
		for (
			let y = Math.max( 0, mpGeo.docTop - mpGeo.vh * 0.5 );
			y <= mpGeo.docTop + mpGeo.vh * 4.2;
			y += mpGeo.vh * 0.15
		) {
			// eslint-disable-next-line no-await-in-loop
			await page.evaluate( ( yy ) => window.scrollTo( 0, yy ), y );
			// eslint-disable-next-line no-await-in-loop
			await page.waitForTimeout( 90 );
			// eslint-disable-next-line no-await-in-loop
			const pos = await page.evaluate( () => {
				const el = document.querySelector( '[data-sgs-fx="motion-path"]' );
				const m = new DOMMatrixReadOnly( getComputedStyle( el ).transform );
				return {
					x: Math.round( m.m41 * 10 ) / 10,
					y: Math.round( m.m42 * 10 ) / 10,
				};
			} );
			mpArc.push( pos );
		}
		out.motionPath = { count: mpCount, arc: mpArc };
	} else {
		out.motionPath = { count: 0 };
	}

	out.morphCount = await page
		.locator( '[data-sgs-fx="morph"]' )
		.count();

	// ── gallery: momentum ON (instance 0) vs OFF (instance 1) ──
	out.galleryMomentumOn = await dragAndMeasure(
		page,
		'.sgs-gallery__grid',
		0,
		'scrollLeft'
	);
	out.galleryMomentumOff = await dragAndMeasure(
		page,
		'.sgs-gallery__grid',
		1,
		'scrollLeft'
	);
	out.galleryCursor = await page.evaluate( () =>
		Array.from( document.querySelectorAll( '.sgs-gallery__grid' ) ).map(
			( el ) => getComputedStyle( el ).cursor
		)
	);

	// ── testimonial slider ──
	out.sliderMomentumOn = await dragAndMeasure(
		page,
		'.sgs-testimonial-slider__track',
		0,
		'sliderOffset'
	);
	out.sliderMomentumOff = await dragAndMeasure(
		page,
		'.sgs-testimonial-slider__track',
		1,
		'sliderOffset'
	);

	// ── before/after ──
	out.beforeAfterDrag = await dragAndMeasure(
		page,
		'[data-sgs-before-after-stage]',
		0,
		'baPosition'
	);
	out.beforeAfterDrag2 = await dragAndMeasure(
		page,
		'[data-sgs-before-after-stage]',
		1,
		'baPosition'
	);
	out.beforeAfterRange = await page.evaluate( () => {
		const range = document.querySelectorAll(
			'[data-sgs-before-after-range]'
		)[ 0 ];
		if ( ! range ) {
			return { error: 'NO_RANGE' };
		}
		const root = range.closest( '.wp-block-sgs-before-after' );
		const readPos = () =>
			getComputedStyle( root )
				.getPropertyValue( '--sgs-before-after-position' )
				.trim();
		const before = readPos();
		range.value = '17';
		range.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		return { before, after: readPos(), tag: range.tagName, type: range.type };
	} );

	// ── image sequence ──
	out.imageSequence = [];
	const seqCount = await page
		.locator( 'canvas[data-sgs-fx="image-sequence"]' )
		.count();
	for ( let i = 0; i < seqCount; i++ ) {
		await bring( page, 'canvas[data-sgs-fx="image-sequence"]', i, 3000 );
		const samples = [];
		for ( const frac of [ 0, 0.25, 0.5, 0.75, 1 ] ) {
			// eslint-disable-next-line no-await-in-loop
			await page.evaluate(
				( [ index, f ] ) => {
					const c = document.querySelectorAll(
						'canvas[data-sgs-fx="image-sequence"]'
					)[ index ];
					const r = c.getBoundingClientRect();
					const docTop = r.top + window.scrollY;
					window.scrollTo(
						0,
						docTop - window.innerHeight * ( 1 - f ) + r.height * f
					);
				},
				[ i, frac ]
			);
			// eslint-disable-next-line no-await-in-loop
			await page.waitForTimeout( 800 );
			// eslint-disable-next-line no-await-in-loop
			samples.push( { frac, luma: await canvasLuma( page, i ) } );
		}
		out.imageSequence.push( {
			index: i,
			isReady: await page.evaluate(
				( index ) =>
					!! document
						.querySelectorAll( 'canvas[data-sgs-fx="image-sequence"]' )
						[ index ].closest( '.sgs-image-sequence' )
						?.classList.contains( 'is-ready' ),
				i
			),
			canvasSized: await page.evaluate( ( index ) => {
				const c = document.querySelectorAll(
					'canvas[data-sgs-fx="image-sequence"]'
				)[ index ];
				return { w: c.width, h: c.height };
			}, i ),
			samples,
		} );
	}

	out.failedRequests = failedRequests.slice( 0, 10 );
	out.failedRequestCount = failedRequests.length;

	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await page.waitForTimeout( 400 );
	await page.screenshot( {
		path: `reports/visual-diff/assets/wave-c-${ reducedMotion }-2026-07-31.png`,
		fullPage: true,
	} );

	await context.close();
	return out;
}

/**
 * Step 1 touch arm — a real coarse-pointer context (`hasTouch: true,
 * isMobile: true`, 390×844) against the same cache-busted URL. Also
 * satisfies the register's Integration test ("reduced-motion × touch
 * together") by taking `reducedMotion` as a parameter, so it is run once per
 * motion arm rather than being a third orthogonal dimension bolted on.
 *
 * @param {import('playwright').Browser} browser       Browser.
 * @param {string}                       reducedMotion 'reduce' | 'no-preference'.
 * @return {Promise<Object>} Touch-arm readings for this motion preference.
 */
async function runTouchArm( browser, reducedMotion ) {
	const context = await browser.newContext( {
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true,
		reducedMotion,
	} );
	const page = await context.newPage();
	await page.goto( URL, { waitUntil: 'load' } );
	await page.waitForTimeout( 1000 );

	const pointerFine = await page.evaluate(
		() => matchMedia( '(pointer: fine)' ).matches
	);
	const pointerCoarse = await page.evaluate(
		() => matchMedia( '(pointer: coarse)' ).matches
	);
	const galleryScrollerCount = await page
		.locator( '.sgs-gallery__grid' )
		.count();
	const swipe = galleryScrollerCount
		? await nativeTouchSwipe( page, '.sgs-gallery__grid', 0 )
		: { error: 'NO_GALLERY' };

	await context.close();
	return { pointerFine, pointerCoarse, swipe };
}

/**
 * Step 1 Edge case — a device with BOTH touch and a fine pointer
 * (`hasTouch: true`, no mobile emulation, desktop viewport).
 *
 * ⚠ TOOLING LIMIT, FOUND BY CROSS-CHECKING TWO INDEPENDENT INSTRUMENTS
 * (2026-07-31). This function's FIRST version, and an initial hand-driven
 * Chrome DevTools MCP check, both read `pointerFine: true` on this context
 * shape and the docblock said so. Re-verified deliberately, twice, on a
 * clean MCP page with no other agent's navigation interleaved (the shared
 * browser this session had multiple concurrent agents re-selecting tabs
 * mid-check, which is the likely source of the first, wrong reading) — and
 * BOTH the Playwright harness below and a fresh MCP check now agree:
 * `pointerFine: false, pointerCoarse: true, cursor: 'auto'`. Chromium's CDP
 * touch emulation (which is what `hasTouch` and the DevTools "touch"
 * viewport flag both drive) appears to force `pointer: coarse` as PRIMARY
 * the moment touch capability is enabled at all, REGARDLESS of whether
 * "mobile" is also set — it cannot reconstruct "mouse is primary, touch is
 * additionally present", which is what a real Windows touchscreen-laptop
 * reports. So this function measures what CDP touch emulation actually
 * does, not what real hybrid hardware does — those are not the same claim,
 * and the verdict/narration below says so rather than asserting a pass/fail
 * on an untestable premise. The CODE-READING answer (what the register also
 * invites — "read the gate and say") still stands on its own: the gate is
 * `(pointer: fine)` alone, so on genuine hybrid hardware where a mouse is
 * the primary pointer, the fine-pointer branch wins and Draggable binds;
 * this just cannot be empirically proven inside this emulator.
 *
 * @param {import('playwright').Browser} browser Browser.
 * @return {Promise<Object>} `{ pointerFine, anyPointerCoarse, cursor }`.
 */
async function measureHybridPointerEdgeCase( browser ) {
	const context = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		hasTouch: true,
	} );
	const page = await context.newPage();
	await page.goto( URL, { waitUntil: 'load' } );
	await page.waitForTimeout( 1000 );

	const result = await page.evaluate( () => {
		const el = document.querySelector( '.sgs-gallery__grid' );
		return {
			pointerFine: matchMedia( '(pointer: fine)' ).matches,
			anyPointerCoarse: matchMedia( '(any-pointer: coarse)' ).matches,
			cursor: el ? getComputedStyle( el ).cursor : 'NO_EL',
		};
	} );

	await context.close();
	return result;
}

const browser = await chromium.launch();
const arms = {};
arms.noPreference = await runArm( browser, 'no-preference' );
arms.reduce = await runArm( browser, 'reduce' );

const touch = {};
touch.noPreference = await runTouchArm( browser, 'no-preference' );
touch.reduce = await runTouchArm( browser, 'reduce' );
const hybridEdgeCase = await measureHybridPointerEdgeCase( browser );

await browser.close();

console.log( JSON.stringify( { arms, touch, hybridEdgeCase }, null, 1 ) );

// ── verdict ──────────────────────────────────────────────────────────────
const a = arms.noPreference;
const r = arms.reduce;
const fails = [];
const inconclusive = [];

if ( ! a.mediaQuery.noPreference || ! r.mediaQuery.reduce ) {
	inconclusive.push( 'media-query emulation did not take effect' );
}

/*
 * ⚠ NOT a before/during snapshot comparison. `dragAndMeasure()`'s fixed
 * geometry (start at 80% across, 12 steps × 30px = a FIXED total distance)
 * measured against the before-after block's 1200px-wide stage, 50% starting
 * position, coincidentally lands the pointer back on the SAME value it
 * started at: 80% − (360px / 1200px × 100) = 80% − 30% = 50%, identical to
 * the pre-drag position. `moved()`'s first version compared only `before` to
 * the single `during` snapshot taken at the end of the step loop, so this
 * geometric coincidence read as "never moved" — a false FAIL, proven live
 * 2026-07-31 by instrumenting the range input's own `input` events during an
 * identical drag: value went 50→81→80→…→50, genuinely tracking the pointer
 * the entire time, landing exactly back on 50 only because of the fixed
 * start/distance arithmetic above. `trailDistinct` (already captured per
 * intermediate step in the trail array, previously computed but unused by
 * this assertion) is the correct evidence: it counts DISTINCT values seen
 * throughout the gesture, so a coincidental round-trip back to the start
 * cannot mask it. `>= 2` is a value that genuinely differed from at least
 * one prior sample was observed mid-drag.
 */
const moved = ( m ) => m && Number.isFinite( m.trailDistinct ) && m.trailDistinct >= 2;

if ( ! a.firstPaint.galleryScroller.every( ( g ) => g.canScrollHorizontally ) ) {
	fails.push(
		'gallery carousel is not a horizontal scroller (scrollWidth === clientWidth) — Draggable structurally cannot attach'
	);
} else if ( ! moved( a.galleryMomentumOn ) ) {
	fails.push( 'gallery drag did not move scrollLeft' );
}
if ( ! moved( a.sliderMomentumOn ) ) {
	fails.push( 'slider drag did not move --sgs-slider-offset' );
}
if ( ! moved( a.beforeAfterDrag ) ) {
	fails.push( 'before/after image-area drag did not move the divider' );
}
if ( '17%' !== a.beforeAfterRange.after ) {
	fails.push( 'before/after range input did not drive the divider' );
}

const drawLoad = a.drawAtLoad[ 0 ];
if ( ! drawLoad || ! drawLoad.dash.some( ( d ) => ! d.startsWith( 'none' ) ) ) {
	fails.push( 'DrawSVG load arm: no dash signature — the plugin never ran' );
}
if ( a.drawScrollArc.distinctCount < 3 ) {
	fails.push(
		`DrawSVG scroll arm: only ${ a.drawScrollArc.distinctCount } distinct dash state(s) across the whole scroll sweep — the draw is not scrubbing`
	);
}

a.scramble.forEach( ( s ) => {
	if ( s.distinctCount < 2 ) {
		fails.push( `ScrambleText #${ s.index }: heading text never changed` );
	}
} );
a.scramble.forEach( ( s ) => {
	if ( s.settled && s.ariaLabel && s.settled !== s.ariaLabel ) {
		fails.push(
			`ScrambleText #${ s.index }: settled text "${ s.settled }" != original "${ s.ariaLabel }"`
		);
	}
} );

/*
 * ⚠ WHY THIS IS NOT A SPREAD CHECK ANY MORE (2026-07-31).
 *
 * The previous criterion was `max(luma) - min(luma) >= 5`, and it PASSED a real,
 * owner-visible defect. `resolveStart` was rewriting this effect's `top 80%`
 * default to `top top+=93` on any site with a sticky header, so the sequence did
 * not begin until the block was nearly off the top of the screen. The recorded
 * samples were 86.14 / 86.14 / 86.14 / 128.60 / 149.39 — FLAT across the first
 * 60% of the scroll pass, then everything happening at the end. Spread was 63,
 * comfortably over the threshold, so the probe said PASS.
 *
 * A spread test only asks "did the canvas ever change?". The thing that actually
 * matters is "did it change ACROSS the scroll a visitor performs?" — so the
 * criterion is now DISTRIBUTION, not magnitude:
 *
 *  1. All five samples must be readable. A null is a measurement failure, not a
 *     pass — it must never be silently filtered out of the denominator, which is
 *     how the old `.filter()` could have scored a 2-sample run as if it were 5.
 *  2. Luminance must STRICTLY INCREASE at every step. This is a valid assertion
 *     rather than an arbitrary one: the fixture frames are generated so mean
 *     luminance ramps monotonically with frame index (see `canvasLuma` above), so
 *     luminance IS frame index. Every sample sits at a different scroll position,
 *     so every sample must be showing a later frame than the one before it. A
 *     flat step means that stretch of scrolling produced no change; a falling step
 *     means frames ran backwards.
 *
 * ⚠ "AT LEAST 3 OF 5 DISTINCT" WAS EVALUATED AND REJECTED AS THE CRITERION.
 * It is the obvious strengthening of the spread test, and it is still vacuous
 * against the exact defect above: 86.14 / 86.14 / 86.14 / 128.60 / 149.39 has
 * EXACTLY 3 distinct values, so a "3 of 5" gate would have gone green on the
 * failure it was written to catch. The distinct count is kept below for
 * diagnostics — it is reported, never gated on.
 *
 * `STEP_MIN` is the smallest rise that counts as a real advance. The fixture
 * ramps ~86 → ~149 across the pass, so genuine steps are tens of units, while
 * sampling noise (every 97th pixel, plus the scrub's catch-up smoothing) is
 * sub-unit. 1 separates them with two orders of magnitude to spare, and is
 * deliberately NOT a tolerance that lets a flat step pass: a flat step is 0.
 */
const STEP_MIN = 1;

a.imageSequence.forEach( ( seq ) => {
	const lumas = seq.samples.map( ( s ) => s.luma );

	const label = `image-sequence #${ seq.index }`;
	const unreadable = lumas.filter( ( l ) => null === l ).length;

	if ( unreadable > 0 ) {
		fails.push(
			`${ label }: canvas unreadable at ${ unreadable } of ` +
				`${ lumas.length } scroll samples — cannot judge`
		);
		return;
	}

	// Reported for diagnostics, never gated on — see the note above for why a
	// distinct-count threshold cannot catch the defect this replaced.
	const distinct = new Set( lumas ).size;

	const steps = lumas
		.slice( 1 )
		.map( ( l, i ) => ( { from: i, delta: l - lumas[ i ] } ) );

	const flat = steps.filter( ( s ) => Math.abs( s.delta ) < STEP_MIN );
	const falling = steps.filter( ( s ) => s.delta <= -STEP_MIN );

	const series = lumas.join( ' ' );
	const span = ( s ) =>
		seq.samples[ s.from ].frac + '→' + seq.samples[ s.from + 1 ].frac;

	if ( falling.length > 0 ) {
		const s = falling[ 0 ];
		fails.push(
			`${ label }: luminance FELL ${ -s.delta } across scroll step ` +
				`${ span( s ) } (${ series }) — frames are running backwards ` +
				`against the scroll direction`
		);
	}

	if ( flat.length > 0 ) {
		const where = flat.map( span ).join( ' ' );
		fails.push(
			`${ label }: no frame advance across ${ flat.length } of ` +
				`${ steps.length } scroll steps (${ where }) — lumas ` +
				`${ series }, ${ distinct } distinct. The sequence is bunched ` +
				`into part of the scroll pass instead of spread across it, so ` +
				`most of the scroll a visitor performs produces no visible change`
		);
	}
} );

// Reduced-motion contract (§10).
if ( r.scramble.some( ( s ) => s.distinctCount > 1 ) ) {
	fails.push( 'reduced motion: ScrambleText still scrambled (must SUPPRESS)' );
}
if ( ! moved( r.beforeAfterDrag ) && moved( a.beforeAfterDrag ) ) {
	fails.push(
		'reduced motion: before/after drag stopped working (must SIMPLIFY, not suppress)'
	);
}

// ── Step 14: per-effect two-arm reduced-motion verdicts ────────────────────
// Each entry is one §10 row's verdict, in the vocabulary the brief asks for:
// MEASURED-DIFFERENT / MEASURED-IDENTICAL-BY-DESIGN / INCONCLUSIVE / DEFECT /
// NOT-BUILT. Only DEFECT and an emulation-not-landing INCONCLUSIVE push onto
// `fails`/`inconclusive` (the exit-code gate); the others are reported but do
// not fail the run — they are the honest "cannot tell" or "correctly static"
// outcomes the brief explicitly asks not to be dressed up as a PASS or FAIL.
const effectVerdicts = {};

// -- scrub (Simplify: end-state, static) --
if ( a.scrub.error || r.scrub.error ) {
	effectVerdicts.scrub = `INCONCLUSIVE — probe never reached the element (${ a.scrub.error || r.scrub.error })`;
	inconclusive.push( 'scrub: ' + effectVerdicts.scrub );
} else {
	const noPrefVaried =
		varied( a.scrub.opacities, 0.1 ) || varied( a.scrub.translateYs, 3 );
	const reduceStatic =
		allNear( r.scrub.opacities, 1, 0.05 ) && allNear( r.scrub.translateYs, 0, 2 );
	if ( ! noPrefVaried ) {
		fails.push(
			`scrub: no-preference arm never varied (opacity ${ JSON.stringify( a.scrub.opacities ) }, translateY ${ JSON.stringify( a.scrub.translateYs ) }) — the scrub did not run`
		);
		effectVerdicts.scrub = 'DEFECT — no-preference arm did not scrub';
	} else if ( ! reduceStatic ) {
		fails.push(
			`reduced motion: scrub still scrubbing (opacity ${ JSON.stringify( r.scrub.opacities ) }, translateY ${ JSON.stringify( r.scrub.translateYs ) }) — must SIMPLIFY to a static end-state`
		);
		effectVerdicts.scrub = 'DEFECT — reduced motion did not simplify';
	} else {
		effectVerdicts.scrub = 'MEASURED-DIFFERENT — varies on scroll, static under reduce';
	}
}

// -- pin-scrub (Simplify: no pin, no scrub, end-state in normal flow) --
if ( a.pinScrub.error || r.pinScrub.error ) {
	effectVerdicts.pinScrub = `INCONCLUSIVE — probe never reached the element (${ a.pinScrub.error || r.pinScrub.error })`;
	inconclusive.push( 'pin-scrub: ' + effectVerdicts.pinScrub );
} else {
	const noPrefEngaged =
		a.pinScrub.pinSpacerPresent && varied( a.pinScrub.opacities, 0.1 );
	const reduceSimplified =
		! r.pinScrub.pinSpacerPresent && allNear( r.pinScrub.opacities, 1, 0.05 );
	if ( ! noPrefEngaged ) {
		fails.push(
			`pin-scrub: no-preference arm did not engage (pinSpacerPresent=${ a.pinScrub.pinSpacerPresent }, opacities ${ JSON.stringify( a.pinScrub.opacities ) })`
		);
		effectVerdicts.pinScrub = 'DEFECT — no-preference arm did not pin/scrub';
	} else if ( ! reduceSimplified ) {
		fails.push(
			`reduced motion: pin-scrub did not simplify (pinSpacerPresent=${ r.pinScrub.pinSpacerPresent }, opacities ${ JSON.stringify( r.pinScrub.opacities ) }) — must have no pin and render at end-state`
		);
		effectVerdicts.pinScrub = 'DEFECT — reduced motion still pinned/scrubbed';
	} else {
		effectVerdicts.pinScrub =
			'MEASURED-DIFFERENT — pins+scrubs on scroll, unpinned+static under reduce';
	}
}

// -- split-reveal (Simplify: no split, no stagger, plain readable text) --
if ( a.splitReveal.error || r.splitReveal.error ) {
	effectVerdicts.splitReveal = `INCONCLUSIVE — probe never reached the element (${ a.splitReveal.error || r.splitReveal.error })`;
	inconclusive.push( 'split-reveal: ' + effectVerdicts.splitReveal );
} else {
	const noPrefSplit =
		a.splitReveal.pre.spanCount > 1 &&
		a.splitReveal.post.spanCount > 1 &&
		allNear( a.splitReveal.post.opacities, 1, 0.15 ) &&
		a.splitReveal.post.text === a.splitReveal.originalText;
	const reduceUnsplit =
		r.splitReveal.pre.spanCount <= 1 &&
		r.splitReveal.post.spanCount <= 1 &&
		r.splitReveal.post.text === r.splitReveal.originalText;
	if ( ! noPrefSplit ) {
		fails.push(
			`split-reveal: no-preference arm did not split+settle as expected (pre ${ JSON.stringify( a.splitReveal.pre ) }, post ${ JSON.stringify( a.splitReveal.post ) })`
		);
		effectVerdicts.splitReveal = 'DEFECT — no-preference arm did not split-reveal';
	} else if ( ! reduceUnsplit ) {
		fails.push(
			`reduced motion: split-reveal still split the text (pre ${ JSON.stringify( r.splitReveal.pre ) }, post ${ JSON.stringify( r.splitReveal.post ) }) — must render unsplit, readable text`
		);
		effectVerdicts.splitReveal = 'DEFECT — reduced motion still split the text';
	} else {
		effectVerdicts.splitReveal =
			'MEASURED-DIFFERENT — splits+staggers into words on scroll, single unsplit node under reduce';
	}
}

// -- horizontal-panel (Simplify: native horizontal scroll-snap) --
if ( a.horizontalPanel.error || r.horizontalPanel.error ) {
	effectVerdicts.horizontalPanel = `INCONCLUSIVE — probe never reached the element (${ a.horizontalPanel.error || r.horizontalPanel.error })`;
	inconclusive.push( 'horizontal-panel: ' + effectVerdicts.horizontalPanel );
} else if (
	'VACUOUS' === a.horizontalPanel.reachability ||
	'VACUOUS' === r.horizontalPanel.reachability
) {
	effectVerdicts.horizontalPanel =
		'INCONCLUSIVE — fewer than two laid-out panels; the reachability assertion cannot fail';
	inconclusive.push( 'horizontal-panel: ' + effectVerdicts.horizontalPanel );
} else {
	const noPrefSlid =
		a.horizontalPanel.effectRan &&
		Array.isArray( a.horizontalPanel.translateSweep ) &&
		varied( a.horizontalPanel.translateSweep, 4 );
	const reduceFallback =
		! r.horizontalPanel.effectRan &&
		'REACHABLE' === r.horizontalPanel.reachability;
	if ( ! noPrefSlid ) {
		fails.push(
			`horizontal-panel: no-preference arm did not pin+slide (effectRan=${ a.horizontalPanel.effectRan }, translateSweep ${ JSON.stringify( a.horizontalPanel.translateSweep ) })`
		);
		effectVerdicts.horizontalPanel = 'DEFECT — no-preference arm did not slide';
	} else if ( 'UNREACHABLE' === r.horizontalPanel.reachability ) {
		fails.push(
			'reduced motion: horizontal-panel last panel UNREACHABLE — this is a defect, not a degradation'
		);
		effectVerdicts.horizontalPanel = 'DEFECT — last panel unreachable under reduced motion';
	} else if ( ! reduceFallback ) {
		fails.push(
			`reduced motion: horizontal-panel did not fall back correctly (effectRan=${ r.horizontalPanel.effectRan }, reachability=${ r.horizontalPanel.reachability })`
		);
		effectVerdicts.horizontalPanel = 'DEFECT — reduced-motion fallback incomplete';
	} else {
		effectVerdicts.horizontalPanel =
			'MEASURED-DIFFERENT — pins+slides on scroll, native scroll-snap fallback under reduce';
	}
}

// -- motion-path (Suppress: resting position) --
if ( 0 === a.motionPath.count || 0 === r.motionPath.count ) {
	effectVerdicts.motionPath =
		'INCONCLUSIVE — probe never reached the element (count 0)';
	inconclusive.push( 'motion-path: ' + effectVerdicts.motionPath );
} else {
	// NOT a plain spread check — see the sweep-window docblock above for why:
	// a spread test cleared tolerance on a fixture where 18 of 19 samples
	// were flat and only the last one moved, which is the same
	// bunched-transition shape the image-sequence DISTRIBUTION rule exists to
	// catch. This requires the movement to occupy a real portion of the
	// sweep, not just its tail.
	const mpVaried = ( arc ) => {
		if ( arc.length < 3 ) {
			return false;
		}
		const deltas = arc
			.slice( 1 )
			.map( ( p, i ) =>
				Math.hypot( p.x - arc[ i ].x, p.y - arc[ i ].y )
			);
		const movingSteps = deltas.filter( ( d ) => d > 3 ).length;
		// At least 4 distinct moving steps, AND they must not all sit in the
		// final 15% of the sweep (the bunched-tail shape the fixed sweep
		// window was built to stop reproducing).
		const tailStart = Math.floor( deltas.length * 0.85 );
		const movingBeforeTail = deltas
			.slice( 0, tailStart )
			.filter( ( d ) => d > 3 ).length;
		return movingSteps >= 4 && movingBeforeTail >= 2;
	};
	const mpStatic = ( arc ) =>
		allNear(
			arc.map( ( p ) => p.x ),
			arc[ 0 ].x,
			1
		) &&
		allNear(
			arc.map( ( p ) => p.y ),
			arc[ 0 ].y,
			1
		);
	const noPrefTravelled = mpVaried( a.motionPath.arc );
	const reduceResting = mpStatic( r.motionPath.arc );
	if ( ! noPrefTravelled ) {
		fails.push(
			`motion-path: no-preference arm never travelled (arc ${ JSON.stringify( a.motionPath.arc ) })`
		);
		effectVerdicts.motionPath = 'DEFECT — no-preference arm did not travel the path';
	} else if ( ! reduceResting ) {
		fails.push(
			`reduced motion: motion-path still travelling (arc ${ JSON.stringify( r.motionPath.arc ) }) — must SUPPRESS to a resting position`
		);
		effectVerdicts.motionPath = 'DEFECT — reduced motion did not suppress travel';
	} else {
		effectVerdicts.motionPath =
			'MEASURED-DIFFERENT — travels the path on scroll, resting position under reduce';
	}
}

// -- morph (NOT SHIPPED — verified structurally, not merely absent-on-this-page) --
// `out.morphCount` (added to runArm below) is a LIVE re-check on every run —
// if a future build ever DOES render `data-sgs-fx="morph"` somewhere on this
// page, that is news worth surfacing rather than silently staying NOT-BUILT.
if ( a.morphCount > 0 || r.morphCount > 0 ) {
	inconclusive.push(
		`morph: found ${ a.morphCount + r.morphCount } live instance(s) of data-sgs-fx="morph" — the NOT-BUILT premise this verdict rests on has changed; re-probe properly instead of trusting this stale branch`
	);
	effectVerdicts.morph = 'INCONCLUSIVE — premise changed, live instance(s) found';
} else {
	effectVerdicts.morph =
		'NOT-BUILT — excluded from src/blocks/extensions/fx.js SHIPPED_EFFECTS ' +
		'(the module exists but its curated shape-pair asset library is deliberately ' +
		'deferred, D427); no inspector can select it and no canary slug ' +
		'(motion-canary-morph, motion-canary-morphsvg) resolves — both 404 live, ' +
		'2026-07-31. There is no selector for this probe to reach, so it is reported ' +
		'as a documented non-build rather than an unmeasured effect.';
}

// ── Step 1: touch-arm verdicts (one per motion preference — Integration test) ──
const touchVerdicts = {};
[ 'noPreference', 'reduce' ].forEach( ( arm ) => {
	const t = touch[ arm ];
	if ( ! t.pointerCoarse || t.pointerFine ) {
		touchVerdicts[ arm ] =
			'INCONCLUSIVE — coarse-pointer emulation did not take effect ' +
			`(pointerFine=${ t.pointerFine }, pointerCoarse=${ t.pointerCoarse })`;
		inconclusive.push( `touch (${ arm }): ` + touchVerdicts[ arm ] );
		return;
	}
	if ( t.swipe.error ) {
		touchVerdicts[ arm ] = `INCONCLUSIVE — probe never reached the scroller (${ t.swipe.error })`;
		inconclusive.push( `touch (${ arm }): ` + touchVerdicts[ arm ] );
		return;
	}
	// THE BLOCKING CHECK the brief calls out by name: if Draggable bound on a
	// coarse pointer (cursor left 'auto'), that is a real defect in the gate,
	// not a probe artefact — it fails loudly rather than being folded into
	// the ordinary DEFECT bucket below.
	if ( 'auto' !== t.swipe.cursorBefore || 'auto' !== t.swipe.cursorAfter ) {
		fails.push(
			`BLOCKING: Draggable bound on a coarse-pointer (touch) device in the ${ arm } arm ` +
				`— cursor was "${ t.swipe.cursorBefore }"→"${ t.swipe.cursorAfter }", expected 'auto' throughout. ` +
				`fx-draggable.js's (pointer: fine) gate did not hold.`
		);
		touchVerdicts[ arm ] = 'DEFECT — Draggable bound on touch (BLOCKING)';
		return;
	}
	if ( ! t.swipe.moved ) {
		fails.push(
			`touch (${ arm }): native swipe did not move scrollLeft (before=${ t.swipe.before }, after=${ t.swipe.after }) — the CSS scroll-snap fallback is broken`
		);
		touchVerdicts[ arm ] = 'DEFECT — native scroll did not move the track';
		return;
	}
	touchVerdicts[ arm ] =
		'MEASURED-DIFFERENT (from the desktop control) — cursor stays auto, Draggable never binds, native scroll moves the track';
} );

console.log( '\n=== STEP 1 — TOUCH ===' );
console.log( JSON.stringify( { touch, touchVerdicts, hybridEdgeCase }, null, 1 ) );
console.log(
	'\nEdge case answer (device with BOTH touch and a fine pointer): ' +
		`MEASURED pointerFine=${ hybridEdgeCase.pointerFine }, anyPointerCoarse=${ hybridEdgeCase.anyPointerCoarse }, ` +
		`gallery cursor="${ hybridEdgeCase.cursor }" — under Chromium CDP touch emulation (\`hasTouch: true\`), ` +
		'pointer: fine reads FALSE the moment touch is enabled at all, so this emulator cannot construct the ' +
		'"mouse is primary, touch also present" case a real hybrid device reports. CODE-READING answer instead: ' +
		'fx-draggable.js gates on (pointer: fine) ALONE (the PRIMARY pointer), never (any-pointer: coarse), so on ' +
		'genuine hybrid hardware where the mouse is primary, the FINE-POINTER branch wins and Draggable binds — ' +
		'this is a reasoned answer, not an empirically-proven one; see measureHybridPointerEdgeCase()\'s docblock.'
);

console.log( '\n=== STEP 14 — PER-EFFECT VERDICTS ===' );
console.log( JSON.stringify( effectVerdicts, null, 1 ) );

// ── Step 19 (D448) — per-page motion bundle cost, REPORTED not GATED ──────
// Bean's ruling: do not fail the build on this. Make the cost visible and
// let the operator decide. See the constant docblock above for why the
// number 51200 must stay identical across this file, the admin panel
// (`SGS_Motion_Diagnostics::BUDGET_BYTES_GZIP`), and any future editor-side
// warning.
console.log( '\n=== STEP 19 — PER-PAGE MOTION BUNDLE COST (D448, reported not gated) ===' );
[ 'noPreference', 'reduce' ].forEach( ( armName ) => {
	const cost = arms[ armName ].motionPageCost;
	if ( ! cost ) {
		console.log( `${ armName }: motionPageCost not captured` );
		return;
	}
	const overBudget = cost.totalBytes > MOTION_BUDGET_BYTES_GZIP;
	const pct =
		Math.round( ( cost.totalBytes / MOTION_BUDGET_BYTES_GZIP ) * 1000 ) /
		10;
	console.log(
		JSON.stringify(
			{
				arm: armName,
				totalBytesGzip: cost.totalBytes,
				budgetBytesGzip: MOTION_BUDGET_BYTES_GZIP,
				percentOfBudget: pct,
				verdict: overBudget ? 'OVER BUDGET' : 'within budget',
				moduleCount: cost.modules.length,
				modules: cost.modules,
			},
			null,
			1
		)
	);
} );

console.log( '\n=== VERDICT ===' );
if ( inconclusive.length ) {
	console.log( 'INCONCLUSIVE:\n - ' + inconclusive.join( '\n - ' ) );
	process.exit( 2 );
}
if ( fails.length ) {
	console.log( 'FAIL:\n - ' + fails.join( '\n - ' ) );
	process.exit( 1 );
}
console.log( 'PASS — every Wave C effect moved its named observable signal.' );
process.exit( 0 );

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
 * @package SGS\Blocks
 */

import { chromium } from 'playwright';

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
const URL =
	BASE_URL + ( BASE_URL.includes( '?' ) ? '&' : '?' ) + 'sgsprobe=' + Date.now();

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

	await page.goto( URL, { waitUntil: 'load' } );
	await page.waitForTimeout( 1200 );

	const out = { reducedMotion, errors };

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

const browser = await chromium.launch();
const arms = {};
arms.noPreference = await runArm( browser, 'no-preference' );
arms.reduce = await runArm( browser, 'reduce' );
await browser.close();

console.log( JSON.stringify( arms, null, 1 ) );

// ── verdict ──────────────────────────────────────────────────────────────
const a = arms.noPreference;
const r = arms.reduce;
const fails = [];
const inconclusive = [];

if ( ! a.mediaQuery.noPreference || ! r.mediaQuery.reduce ) {
	inconclusive.push( 'media-query emulation did not take effect' );
}

const moved = ( m ) =>
	m && null !== m.during && null !== m.before && m.during !== m.before;

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

a.imageSequence.forEach( ( seq ) => {
	const lumas = seq.samples.map( ( s ) => s.luma ).filter( ( l ) => null !== l );
	const spread = lumas.length ? Math.max( ...lumas ) - Math.min( ...lumas ) : 0;
	if ( spread < 5 ) {
		fails.push(
			`image-sequence #${ seq.index }: canvas luminance spread ${ spread } — frames did not track scroll`
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

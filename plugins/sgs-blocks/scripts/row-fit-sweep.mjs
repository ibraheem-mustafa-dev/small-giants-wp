#!/usr/bin/env node
/**
 * row-fit-sweep — reusable Playwright width-sweep verification harness.
 *
 * WHY THIS EXISTS. A header row stacked its contents into a vertical pile
 * because of an authored CSS rule, not a lack of space. The critical fact:
 * the defect lived BETWEEN the standard breakpoints (375 / 768 / 1440px) —
 * a check at those three fixed tiers passed while the row was broken at
 * 766px. This harness sweeps in small steps between two widths, never at
 * fixed tiers, so a hard jump at an odd width cannot hide.
 *
 * THREE INDEPENDENTLY-MEASURED ASSERTIONS
 *
 *   1. NO-STACK (header rows, always on). A naive "count distinct child
 *      `top` values" metric is UNSOUND — children on the SAME flex line
 *      legitimately have different tops when they have different heights
 *      and non-stretch `align-items`. Instead: locate the flex/grid
 *      CONTAINER (the row element itself OR its `.sgs-container__inner`
 *      child — detected by computed `display`, never assumed) and compare
 *      its `clientHeight` against the tallest child's `offsetHeight`. If
 *      the container is taller than its tallest child (+ tolerance), a
 *      second layout line has appeared — that is a stack.
 *
 *   2. NO-OVERFLOW (always on). `document.documentElement.scrollWidth`
 *      must never exceed `clientWidth` (+1px rounding tolerance) at any
 *      swept width.
 *
 *   3. MONOTONIC-COLUMNS (`--mode columns`, opt-in — adds to 1+2, does not
 *      replace them). Parses computed `grid-template-columns` into a track
 *      count and asserts the count never INCREASES as the viewport
 *      narrows (equivalently: never decreases as it widens). Every width
 *      at which the count changes is reported, so a hard jump at a round
 *      number (767/768/1023/1024) is visible in the output rather than
 *      hidden between sample points.
 *
 * MEASUREMENT DISCIPLINE CARRIED FROM THIS PROJECT'S MOTION-QA PROBES
 * (`scripts/motion-qa/probe-step13-pin-focus.mjs` et al.):
 *   - Cache-busting query param on every real (http/https) navigation — a
 *     previous session produced two false measurements from stale content.
 *   - `scroll-behavior: smooth` on this codebase's `<html>` makes any
 *     FIXED-DELAY sample a source of false results (proven twice on this
 *     project already). This harness never sleeps-then-samples: after every
 *     resize it polls the measured values across successive animation
 *     frames until they stop changing (bounded to ~500ms), so a genuinely
 *     still-settling layout is still measured, not spun on forever, and a
 *     mid-transition sample never masquerades as a settled one.
 *
 * ZOOM. `--zoom N` is gated on a LIVE, self-verifying check (see
 * `verifyZoomTechnique()`) of the two candidate techniques — browser-context
 * `deviceScaleFactor` and root-`font-size` scaling. Empirically (verified
 * against this repo's own Chromium build, 2026-08-01): `deviceScaleFactor`
 * is a rendering-resolution knob only — it changes zero layout-observable
 * value (confirmed: identical `clientWidth` and element `boundingClientRect`
 * before/after). Root-`font-size` scaling only reaches `rem`/`em`-relative
 * text — SGS's own typography tokens are declared in fixed `px`
 * (`theme/sgs-theme/theme.json` → `settings.typography.fontSizes`, e.g.
 * `x-small: 12px`), so it never reaches real SGS block content either. A
 * check that cannot fail is worse than no check, so `--zoom` refuses to run
 * (exit 2, reason printed) unless the live verification proves ONE of the
 * two techniques genuinely scales a fixed-px fixture element by the
 * requested factor on the Chromium build actually in use.
 *
 * SELF-TEST (`--self-test`, the acceptance criterion for this file). Proves
 * the harness can FAIL, not just pass, against three tiny fixtures written
 * to a temp dir (no WordPress site required):
 *   1. A known-good nowrap row — must exit 0.
 *   2. A known-broken row carrying the EXACT real defect (a
 *      `container-type: inline-size` row with
 *      `@container (max-width: 767px) { .row > * { flex-basis: 100%; } }`)
 *      — must exit 1, with the first failing width inside 760-770px.
 *   3. A fixture that genuinely overflows — must trip NO-OVERFLOW.
 * All three self-test cases run through the SAME `runSweep()` used for real
 * pages — there is no separate self-test-only implementation to drift from
 * the real one.
 *
 * USAGE
 *   node row-fit-sweep.mjs --url <page-url> --selector <css-selector>
 *     [--from 1400] [--to 320] [--step 10]
 *     [--mode nostack|columns] [--tolerance 2]
 *     [--touch-targets] [--zoom 200] [--json <path>]
 *   node row-fit-sweep.mjs --self-test
 *
 * EXIT CODES: 0 pass · 1 assertion failure · 2 usage/config error, zoom
 * unavailable, or self-test failure.
 *
 * Run from `plugins/sgs-blocks/` (or anywhere — Node resolves `playwright`
 * from `plugins/sgs-blocks/node_modules` relative to this file regardless
 * of cwd).
 *
 * @package SGS\Blocks
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ── argument parsing ────────────────────────────────────────────────────

/**
 * Parse the CLI arguments into a plain options object with defaults.
 *
 * @param {string[]} argv `process.argv.slice( 2 )`.
 * @return {Object} Parsed args.
 */
function parseArgs( argv ) {
	const args = {
		url: null,
		selector: null,
		from: 1400,
		to: 320,
		step: 10,
		mode: 'nostack',
		tolerance: 2,
		touchTargets: false,
		zoom: null,
		json: null,
		selfTest: false,
	};

	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		switch ( a ) {
			case '--url':
				args.url = argv[ ++i ];
				break;
			case '--selector':
				args.selector = argv[ ++i ];
				break;
			case '--from':
				args.from = Number( argv[ ++i ] );
				break;
			case '--to':
				args.to = Number( argv[ ++i ] );
				break;
			case '--step':
				args.step = Number( argv[ ++i ] );
				break;
			case '--mode':
				args.mode = argv[ ++i ];
				break;
			case '--tolerance':
				args.tolerance = Number( argv[ ++i ] );
				break;
			case '--touch-targets':
				args.touchTargets = true;
				break;
			case '--zoom':
				args.zoom = Number( argv[ ++i ] );
				break;
			case '--json':
				args.json = argv[ ++i ];
				break;
			case '--self-test':
				args.selfTest = true;
				break;
			default:
				console.error( `[row-fit-sweep] unrecognised argument: ${ a }` );
				process.exit( 2 );
		}
	}

	return args;
}

/**
 * Cache-bust an http(s) URL with a unique query param on every navigation.
 * `file:` URLs are left alone — self-test fixtures are freshly written temp
 * files on every run, so staleness cannot occur, and some Chromium builds
 * mishandle a query string appended to a `file:` URI.
 *
 * @param {string} u URL.
 * @return {string} Cache-busted URL.
 */
function bust( u ) {
	if ( u.startsWith( 'file:' ) ) {
		return u;
	}
	return u + ( u.includes( '?' ) ? '&' : '?' ) + 'sgsrowfit=' + Date.now() + Math.random().toString( 36 ).slice( 2 );
}

/**
 * Build the list of widths to sweep, always including both endpoints
 * regardless of whether `step` divides the range evenly.
 *
 * @param {number} from Start width.
 * @param {number} to   End width.
 * @param {number} step Step size (sign is inferred from `from`/`to`).
 * @return {number[]} Widths in sweep order.
 */
function buildWidths( from, to, step ) {
	const dir = from <= to ? 1 : -1;
	const signedStep = Math.abs( step ) * dir;
	const widths = [];
	for ( let w = from; dir > 0 ? w <= to : w >= to; w += signedStep ) {
		widths.push( w );
	}
	if ( 0 === widths.length || widths[ widths.length - 1 ] !== to ) {
		widths.push( to );
	}
	return widths;
}

/**
 * Convert a filesystem path to a `file://` URL that Chromium accepts on
 * both Windows (`file:///C:/...`) and POSIX (`file:///home/...`).
 *
 * @param {string} p Filesystem path.
 * @return {string} `file://` URL.
 */
function toFileUrl( p ) {
	const abs = path.resolve( p ).replace( /\\/g, '/' );
	return 'file:///' + abs.replace( /^\/+/, '' );
}

// ── in-page measurement ─────────────────────────────────────────────────

/**
 * Measure the row's current layout state. Runs entirely inside the page so
 * one round-trip captures everything needed for all three assertions.
 *
 * @param {import('playwright').Page} page            Page.
 * @param {string}                    selector         Row selector.
 * @param {string}                    mode             'nostack' | 'columns'.
 * @param {boolean}                   checkTouchTargets Whether to scan for
 *                                                       undersized targets.
 * @return {Promise<Object>} Measurement, or `{ error }` if the selector is
 *                            missing.
 */
async function measureAtCurrentSize( page, selector, mode, checkTouchTargets ) {
	return page.evaluate(
		( { sel, mode, checkTouchTargets } ) => {
			const rowEl = document.querySelector( sel );
			if ( ! rowEl ) {
				return { error: 'SELECTOR_NOT_FOUND' };
			}

			const isFlexOrGrid = ( el ) => {
				const d = getComputedStyle( el ).display;
				return 'flex' === d || 'inline-flex' === d || 'grid' === d || 'inline-grid' === d;
			};

			// The flex/grid container may be the row itself OR its
			// `.sgs-container__inner` child — detected by computed display,
			// never assumed. A generic fallback (any flex/grid direct child)
			// covers non-SGS markup using this same harness.
			let container = null;
			let containerIsSelf = false;
			if ( isFlexOrGrid( rowEl ) ) {
				container = rowEl;
				containerIsSelf = true;
			} else {
				const inner = rowEl.querySelector( ':scope > .sgs-container__inner' );
				if ( inner && isFlexOrGrid( inner ) ) {
					container = inner;
				} else {
					const childMatch = Array.from( rowEl.children ).find( isFlexOrGrid );
					if ( childMatch ) {
						container = childMatch;
					}
				}
			}

			let containerDisplay = null;
			let containerHeight = null;
			let containerContentHeight = null;
			let maxChildHeight = null;
			let childCount = 0;
			if ( container ) {
				const cs = getComputedStyle( container );
				containerDisplay = cs.display;
				containerHeight = container.clientHeight;
				// `clientHeight` is the container's PADDING box (content + its own
				// padding). A child's `offsetHeight` is the child's own padding box
				// but carries none of the PARENT's padding. Comparing the two
				// directly false-flags every row that simply has its own padding —
				// proven live via this file's own --self-test case 1 (a genuinely
				// single-line row read clientHeight 50px vs maxChildHeight 34px,
				// purely because of the container's 8px top+bottom padding, before
				// this fix). Strip the container's own padding so both sides
				// measure the same thing: the height of one content line.
				const padTop = parseFloat( cs.paddingTop ) || 0;
				const padBottom = parseFloat( cs.paddingBottom ) || 0;
				containerContentHeight = containerHeight - padTop - padBottom;
				const kids = Array.from( container.children ).filter( ( c ) => 1 === c.nodeType );
				childCount = kids.length;
				maxChildHeight = kids.length ? Math.max( ...kids.map( ( c ) => c.offsetHeight ) ) : 0;
			}

			const docEl = document.documentElement;
			const scrollWidth = docEl.scrollWidth;
			const clientWidth = docEl.clientWidth;

			let gridColumns = null;
			let gridTemplateColumnsRaw = null;
			if ( 'columns' === mode && container ) {
				gridTemplateColumnsRaw = getComputedStyle( container ).gridTemplateColumns;
				gridColumns =
					'none' === gridTemplateColumnsRaw
						? 0
						: gridTemplateColumnsRaw.trim().split( /\s+/ ).filter( Boolean ).length;
			}

			const touchTargetViolations = [];
			if ( checkTouchTargets ) {
				const interactive = rowEl.querySelectorAll(
					'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
				);
				interactive.forEach( ( el ) => {
					const r = el.getBoundingClientRect();
					// getBoundingClientRect() always returns CSS px, unaffected by
					// deviceScaleFactor — a valid measure regardless of zoom mode.
					if ( r.width > 0 && r.height > 0 && ( r.width < 43.5 || r.height < 43.5 ) ) {
						touchTargetViolations.push( {
							tag: el.tagName,
							text: ( el.textContent || el.value || '' ).trim().slice( 0, 40 ),
							width: Math.round( r.width * 10 ) / 10,
							height: Math.round( r.height * 10 ) / 10,
						} );
					}
				} );
			}

			return {
				error: null,
				containerFound: !! container,
				containerIsSelf,
				containerDisplay,
				containerHeight,
				containerContentHeight,
				maxChildHeight,
				childCount,
				scrollWidth,
				clientWidth,
				gridColumns,
				gridTemplateColumnsRaw,
				touchTargetViolations,
			};
		},
		{ sel: selector, mode, checkTouchTargets }
	);
}

/**
 * Resize-then-measure, polling across successive animation frames until the
 * measured values stop changing (bounded to `maxMs`) rather than sampling
 * after a fixed delay. `scroll-behavior: smooth` and any transition/animation
 * on this codebase's rows means a fixed-delay sample can catch layout
 * mid-flight and report a false result — proven twice already on this
 * project (see file header).
 *
 * @param {import('playwright').Page} page              Page.
 * @param {string}                    selector           Row selector.
 * @param {string}                    mode               'nostack' | 'columns'.
 * @param {boolean}                   checkTouchTargets  Touch-target scan.
 * @param {number}                    maxMs              Settle budget.
 * @return {Promise<Object>} The settled measurement.
 */
async function settledMeasure( page, selector, mode, checkTouchTargets, maxMs = 500 ) {
	const sigOf = ( m ) =>
		m.error
			? 'ERROR:' + m.error
			: [ m.containerContentHeight, m.maxChildHeight, m.scrollWidth, m.clientWidth, m.gridColumns, m.touchTargetViolations.length ].join( '|' );

	let current = await measureAtCurrentSize( page, selector, mode, checkTouchTargets );
	if ( current.error ) {
		return current;
	}

	let lastSig = sigOf( current );
	let stableStreak = 1;
	const start = Date.now();

	while ( Date.now() - start < maxMs ) {
		// eslint-disable-next-line no-await-in-loop
		await page.evaluate( () => new Promise( ( r ) => requestAnimationFrame( r ) ) );
		// eslint-disable-next-line no-await-in-loop
		const next = await measureAtCurrentSize( page, selector, mode, checkTouchTargets );
		if ( next.error ) {
			return next;
		}
		const nextSig = sigOf( next );
		current = next;
		if ( nextSig === lastSig ) {
			stableStreak++;
			if ( stableStreak >= 2 ) {
				break;
			}
		} else {
			stableStreak = 1;
		}
		lastSig = nextSig;
	}

	return current;
}

// ── zoom verification ───────────────────────────────────────────────────

/**
 * Live-verify whether EITHER candidate zoom technique — context
 * `deviceScaleFactor` or root-`font-size` scaling — genuinely reproduces a
 * browser text zoom of `zoomFactor` (e.g. 2.0 for 200%) on the Chromium
 * build actually in use, by measuring a fixed-px fixture element before and
 * after. A technique only counts as "working" if the measured content-width
 * ratio lands within 5% of the requested factor — a technique that changes
 * nothing observable from JS is not a zoom, however plausible it sounds.
 *
 * @param {import('playwright').Browser} browser    Browser.
 * @param {number}                       zoomFactor Requested factor (2.0 = 200%).
 * @return {Promise<Object>} `{ usable, technique, report, ... }`.
 */
async function verifyZoomTechnique( browser, zoomFactor ) {
	// Deliberately px-sized (not rem/em) — this mirrors how SGS's OWN
	// typography tokens are declared (`theme/sgs-theme/theme.json` →
	// `settings.typography.fontSizes` are all `px`, e.g. `x-small: 12px`),
	// so a technique that fails to move THIS element would equally fail to
	// move real SGS block content.
	const fixtureHtml =
		'<!DOCTYPE html><html><head><style>' +
		'html,body{margin:0;padding:0}' +
		'#t{font-size:16px;display:inline-block;white-space:nowrap}' +
		'</style></head><body><div id="t">Sample zoom-verification text 1234567890</div></body></html>';

	const measure = async ( ctxOpts, init ) => {
		const ctx = await browser.newContext( { viewport: { width: 1280, height: 800 }, ...ctxOpts } );
		const page = await ctx.newPage();
		if ( init ) {
			await page.addInitScript( init.fn, init.arg );
		}
		await page.setContent( fixtureHtml );
		const m = await page.evaluate( () => ( {
			clientWidth: document.documentElement.clientWidth,
			boxWidth: document.getElementById( 't' ).getBoundingClientRect().width,
		} ) );
		await ctx.close();
		return m;
	};

	const base = await measure( {} );
	const dsf = await measure( { deviceScaleFactor: zoomFactor } );
	const rfs = await measure(
		{},
		{
			fn: ( factor ) => {
				document.documentElement.style.fontSize = 16 * factor + 'px';
			},
			arg: zoomFactor,
		}
	);

	const dsfRatio = base.boxWidth > 0 ? dsf.boxWidth / base.boxWidth : 1;
	const rfsRatio = base.boxWidth > 0 ? rfs.boxWidth / base.boxWidth : 1;
	const within5pct = ( ratio ) => Math.abs( ratio - zoomFactor ) < 0.05 * zoomFactor;
	const dsfWorks = within5pct( dsfRatio );
	const rfsWorks = within5pct( rfsRatio );
	const usable = dsfWorks || rfsWorks;
	const technique = dsfWorks ? 'deviceScaleFactor' : rfsWorks ? 'root-font-size' : null;

	const report = usable
		? `[zoom] verified technique "${ technique }" reproduces a ${ Math.round( zoomFactor * 100 ) }% zoom on this Chromium build ` +
		  `(measured content-width ratio vs baseline: deviceScaleFactor=${ dsfRatio.toFixed( 3 ) }, root-font-size=${ rfsRatio.toFixed( 3 ) }, target=${ zoomFactor.toFixed( 3 ) }).`
		: 'zoom mode unavailable — neither candidate technique genuinely reproduces browser text zoom on this Chromium build. ' +
		  `deviceScaleFactor is confirmed to be a rendering-resolution knob only (measured content-width ratio ${ dsfRatio.toFixed( 3 ) } vs target ${ zoomFactor.toFixed( 3 ) } — i.e. no observable change): ` +
		  'it does not resize rendered content or the layout viewport, so it cannot exercise WCAG 1.4.4-style zoom. ' +
		  `Root font-size scaling (measured ratio ${ rfsRatio.toFixed( 3 ) }) was tested against a fixed-px-sized element mirroring SGS's own typography tokens ` +
		  '(theme/sgs-theme/theme.json declares fontSizes in px, e.g. x-small: 12px — not rem), so it does not reach real SGS block content either, only rem/em-relative text. ' +
		  'Refusing to ship a fake zoom check — a check that cannot fail is worse than no check. Re-run without --zoom, or use a real device/OS-level zoom test for WCAG 1.4.4 sign-off.';

	return { usable, technique, dsfWorks, rfsWorks, dsfRatio, rfsRatio, base, dsf, rfs, report };
}

// ── sweep ────────────────────────────────────────────────────────────────

/**
 * Run the full width sweep against one URL/selector and return every
 * per-width measurement plus the list of failures in sweep order. Used by
 * BOTH real invocations and every `--self-test` case — there is no
 * separate self-test-only implementation to drift from the real one.
 *
 * @param {import('playwright').Browser} browser Browser.
 * @param {Object}                       opts    Sweep options.
 * @return {Promise<Object>} `{ widths, results, failures }` or
 *                            `{ configError }` if the selector never
 *                            resolves.
 */
async function runSweep( browser, opts ) {
	const widths = buildWidths( opts.from, opts.to, opts.step );
	const viewportHeight = opts.viewportHeight || 900;

	const ctxOpts = { viewport: { width: widths[ 0 ], height: viewportHeight } };
	if ( 'deviceScaleFactor' === opts.zoomTechnique ) {
		ctxOpts.deviceScaleFactor = opts.zoomFactor;
	}
	const context = await browser.newContext( ctxOpts );
	const page = await context.newPage();
	if ( 'root-font-size' === opts.zoomTechnique ) {
		await page.addInitScript( ( factor ) => {
			document.documentElement.style.fontSize = 16 * factor + 'px';
		}, opts.zoomFactor );
	}

	const navUrl = bust( opts.url );
	await page.goto( navUrl, { waitUntil: 'load' } );
	await page.waitForTimeout( 300 );

	const exists = await page.evaluate( ( sel ) => !! document.querySelector( sel ), opts.selector );
	if ( ! exists ) {
		await context.close();
		return { configError: `selector "${ opts.selector }" not found on ${ opts.url }`, widths, results: [], failures: [] };
	}

	const results = [];
	const failures = [];
	let prevGridColumns = null;
	let prevWidth = null;

	for ( const w of widths ) {
		// eslint-disable-next-line no-await-in-loop
		await page.setViewportSize( { width: w, height: viewportHeight } );
		// eslint-disable-next-line no-await-in-loop
		const m = await settledMeasure( page, opts.selector, opts.mode, opts.touchTargets );
		const record = { width: w, measured: m, assertions: [] };

		if ( m.error ) {
			const msg = `could not measure at ${ w }px: ${ m.error }`;
			record.assertions.push( { name: 'MEASURE', pass: false, message: msg } );
			failures.push( { width: w, assertion: 'MEASURE', message: msg, measured: m } );
			results.push( record );
			prevWidth = w;
			continue;
		}

		// Assertion 1 — NO-STACK (always on). Compares content-box heights on
		// both sides (container padding stripped) so a row's own padding never
		// false-flags a genuinely single-line row as stacked.
		if ( m.containerFound ) {
			const stacked = m.containerContentHeight > m.maxChildHeight + opts.tolerance;
			const msg = stacked
				? `row gained a layout line — container content height ${ m.containerContentHeight }px exceeds tallest child ${ m.maxChildHeight }px + tolerance ${ opts.tolerance }px`
				: `container content height ${ m.containerContentHeight }px within tallest-child ${ m.maxChildHeight }px + tolerance ${ opts.tolerance }px`;
			record.assertions.push( { name: 'NO-STACK', pass: ! stacked, message: msg } );
			if ( stacked ) {
				failures.push( { width: w, assertion: 'NO-STACK', message: msg, measured: m } );
			}
		} else {
			record.assertions.push( {
				name: 'NO-STACK',
				pass: null,
				message: 'no flex/grid container found on the row or its .sgs-container__inner child — NO-STACK not evaluated',
			} );
		}

		// Assertion 2 — NO-OVERFLOW (always on).
		const overflowed = m.scrollWidth > m.clientWidth + 1;
		const overflowMsg = overflowed
			? `document scrollWidth ${ m.scrollWidth }px exceeds clientWidth ${ m.clientWidth }px + 1px tolerance`
			: `scrollWidth ${ m.scrollWidth }px within clientWidth ${ m.clientWidth }px`;
		record.assertions.push( { name: 'NO-OVERFLOW', pass: ! overflowed, message: overflowMsg } );
		if ( overflowed ) {
			failures.push( { width: w, assertion: 'NO-OVERFLOW', message: overflowMsg, measured: m } );
		}

		// Assertion 3 — MONOTONIC-COLUMNS (--mode columns only; adds to 1+2).
		if ( 'columns' === opts.mode && m.containerFound && null !== m.gridColumns ) {
			if ( null !== prevGridColumns && null !== prevWidth && w !== prevWidth ) {
				const narrowed = w < prevWidth;
				let bad = false;
				if ( narrowed && m.gridColumns > prevGridColumns ) {
					bad = true;
				}
				if ( ! narrowed && m.gridColumns < prevGridColumns ) {
					bad = true;
				}
				if ( m.gridColumns !== prevGridColumns ) {
					record.columnTransition = { from: prevGridColumns, to: m.gridColumns, atWidth: w };
				}
				const dirWord = narrowed ? 'narrowed' : 'widened';
				const colMsg = bad
					? `track count ${ narrowed ? 'increased' : 'decreased' } from ${ prevGridColumns } to ${ m.gridColumns } while the viewport ${ dirWord } (${ prevWidth }px -> ${ w }px)`
					: `track count ${ m.gridColumns } (was ${ prevGridColumns }) — consistent with the viewport having ${ dirWord }`;
				record.assertions.push( { name: 'MONOTONIC-COLUMNS', pass: ! bad, message: colMsg } );
				if ( bad ) {
					failures.push( { width: w, assertion: 'MONOTONIC-COLUMNS', message: colMsg, measured: m } );
				}
			}
			prevGridColumns = m.gridColumns;
		}

		// Touch targets (--touch-targets, opt-in).
		if ( opts.touchTargets ) {
			const violations = m.touchTargetViolations || [];
			const ttMsg = violations.length
				? `${ violations.length } interactive element(s) below 44x44px: ` +
				  violations.map( ( v ) => `${ v.tag } "${ v.text }" ${ v.width }x${ v.height }px` ).join( '; ' )
				: 'all interactive descendants >= 44x44px';
			record.assertions.push( { name: 'TOUCH-TARGET', pass: 0 === violations.length, message: ttMsg } );
			if ( violations.length ) {
				failures.push( { width: w, assertion: 'TOUCH-TARGET', message: ttMsg, measured: m } );
			}
		}

		results.push( record );
		prevWidth = w;
	}

	await context.close();
	return { widths, results, failures };
}

// ── self-test ────────────────────────────────────────────────────────────

/**
 * Prove the harness can FAIL, not just pass, against three fixtures written
 * to a temp dir. Exercises the SAME `runSweep()` real invocations use.
 *
 * @return {Promise<number>} Exit code (0 all pass, 1 any self-test failed).
 */
async function runSelfTest() {
	console.log( '[row-fit-sweep --self-test] running fixture-based self-tests...\n' );

	const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-row-fit-selftest-' ) );
	let allPass = true;

	// CASE 1 — known-good: a nowrap flex row whose items shrink and truncate
	// instead of wrapping. Must never stack, never overflow, at any width in
	// the swept range.
	const goodHtml =
		'<!DOCTYPE html><html><head><style>' +
		'html,body{margin:0;padding:0}' +
		'#target{display:flex;flex-wrap:nowrap;gap:8px;padding:8px;box-sizing:border-box}' +
		'#target > *{flex:1 1 0;min-width:0;padding:8px;background:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}' +
		'</style></head><body><div id="target"><div>Item One</div><div>Item Two</div><div>Item Three</div><div>Item Four</div></div></body></html>';
	const goodPath = path.join( tmpDir, 'known-good.html' );
	fs.writeFileSync( goodPath, goodHtml );

	// CASE 2 — known-broken: the EXACT real defect. A `container-type:
	// inline-size` row whose own `@container` query forces each child to
	// `flex-basis: 100%` (stacking, since the row also wraps) at container
	// widths of 767px and below.
	// NOTE: `#target` deliberately carries NO padding of its own — its
	// content-box inline-size (what `@container` measures against) must track
	// the swept VIEWPORT width exactly, so the 767px CSS threshold and the
	// reported failing WIDTH line up. (Verified empirically: with 8px padding
	// on `#target`, the container's own content-box is 16px narrower than the
	// viewport, so the reported failing width was 783px, not 767/768 — a
	// fixture-authoring pitfall, not a harness bug, caught by this exact
	// self-test run during this file's own build.)
	const brokenHtml =
		'<!DOCTYPE html><html><head><style>' +
		'html,body{margin:0;padding:0}' +
		'#target{container-type:inline-size;display:flex;flex-wrap:wrap;gap:8px}' +
		'#target > *{flex:1 1 auto;min-width:100px;padding:8px;background:#ddd;box-sizing:border-box}' +
		'@container (max-width: 767px) { #target > * { flex-basis: 100%; } }' +
		'</style></head><body><div id="target"><div>Item One</div><div>Item Two</div><div>Item Three</div></div></body></html>';
	const brokenPath = path.join( tmpDir, 'known-broken.html' );
	fs.writeFileSync( brokenPath, brokenHtml );

	// CASE 3 — genuine overflow: a fixed-width child that cannot shrink.
	const overflowHtml =
		'<!DOCTYPE html><html><head><style>' +
		'html,body{margin:0;padding:0}' +
		'#target{display:flex}' +
		'#target > div{width:2000px;flex-shrink:0;background:#ccc}' +
		'</style></head><body><div id="target"><div>Deliberately overflowing fixed-width element</div></div></body></html>';
	const overflowPath = path.join( tmpDir, 'known-overflow.html' );
	fs.writeFileSync( overflowPath, overflowHtml );

	const browser = await chromium.launch();

	try {
		// CASE 1.
		console.log( '[self-test 1/3] known-good nowrap row (never stacks, never overflows) — expect exit 0...' );
		const goodResult = await runSweep( browser, {
			url: toFileUrl( goodPath ),
			selector: '#target',
			from: 800,
			to: 320,
			step: 20,
			mode: 'nostack',
			tolerance: 2,
			touchTargets: false,
		} );
		const case1Pass = ! goodResult.configError && 0 === goodResult.failures.length;
		console.log(
			case1Pass
				? '[self-test 1/3] PASS — known-good fixture produced zero failures, as expected.'
				: `[self-test 1/3] FAIL — known-good fixture produced ${ goodResult.configError ? 'a config error: ' + goodResult.configError : goodResult.failures.length + ' failure(s) it should not have: ' + JSON.stringify( goodResult.failures[ 0 ] ) }`
		);
		allPass = allPass && case1Pass;

		// CASE 2 — the acceptance criterion.
		console.log(
			'\n[self-test 2/3] known-broken row (@container stacking rule at 767px, the exact real defect) — expect exit 1, first failure inside 760-770px...'
		);
		const brokenResult = await runSweep( browser, {
			url: toFileUrl( brokenPath ),
			selector: '#target',
			from: 800,
			to: 700,
			step: 1,
			mode: 'nostack',
			tolerance: 2,
			touchTargets: false,
		} );
		const firstFail = brokenResult.failures[ 0 ];
		const case2Failed = ! brokenResult.configError && brokenResult.failures.length > 0;
		const case2Band = !! firstFail && firstFail.width <= 770 && firstFail.width >= 760 && 'NO-STACK' === firstFail.assertion;
		const case2Pass = case2Failed && case2Band;
		if ( ! case2Failed ) {
			console.log(
				'[self-test 2/3] FAIL — the KNOWN-BROKEN fixture did NOT make the harness fail. ' +
					'If the known-broken fixture does not make the harness fail, the harness is worthless. ' +
					( brokenResult.configError ? `config error: ${ brokenResult.configError }` : 'zero failures reported across the swept range.' )
			);
		} else if ( ! case2Band ) {
			console.log(
				`[self-test 2/3] FAIL — harness did fail (good), but the first failure was ${ firstFail.assertion } at ${ firstFail.width }px, ` +
					'outside the required 760-770px band — the defect is not being caught where it actually lives.'
			);
		} else {
			console.log(
				`[self-test 2/3] PASS — harness FAILED as required (${ firstFail.assertion }), first failing width ${ firstFail.width }px is inside the 760-770px band. ` +
					`Measured: ${ firstFail.message }`
			);
		}
		allPass = allPass && case2Pass;

		// CASE 3.
		console.log( '\n[self-test 3/3] genuine overflow fixture — expect NO-OVERFLOW to fire...' );
		const overflowResult = await runSweep( browser, {
			url: toFileUrl( overflowPath ),
			selector: '#target',
			from: 500,
			to: 320,
			step: 30,
			mode: 'nostack',
			tolerance: 2,
			touchTargets: false,
		} );
		const overflowFail = ( overflowResult.failures || [] ).find( ( f ) => 'NO-OVERFLOW' === f.assertion );
		const case3Pass = ! overflowResult.configError && !! overflowFail;
		console.log(
			case3Pass
				? `[self-test 3/3] PASS — NO-OVERFLOW correctly fired at ${ overflowFail.width }px: ${ overflowFail.message }`
				: '[self-test 3/3] FAIL — the NO-OVERFLOW assertion did not fire against a fixture that genuinely overflows; the check is vacuous.'
		);
		allPass = allPass && case3Pass;
	} finally {
		await browser.close();
		fs.rmSync( tmpDir, { recursive: true, force: true } );
	}

	console.log(
		'\n' +
			( allPass
				? '[row-fit-sweep --self-test] ALL SELF-TESTS PASS.'
				: '[row-fit-sweep --self-test] SELF-TEST FAILURE — the harness cannot be trusted; see above.' )
	);

	return allPass ? 0 : 1;
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );

	if ( args.selfTest ) {
		process.exit( await runSelfTest() );
	}

	if ( ! args.url || ! args.selector ) {
		console.error( 'Usage: node row-fit-sweep.mjs --url <page-url> --selector <css-selector> [options]' );
		console.error( '   or: node row-fit-sweep.mjs --self-test' );
		process.exit( 2 );
	}
	if ( 'nostack' !== args.mode && 'columns' !== args.mode ) {
		console.error( `[row-fit-sweep] --mode must be "nostack" or "columns", got "${ args.mode }"` );
		process.exit( 2 );
	}
	if ( ! Number.isFinite( args.from ) || ! Number.isFinite( args.to ) || ! Number.isFinite( args.step ) || 0 === args.step ) {
		console.error( '[row-fit-sweep] --from / --to / --step must be non-zero numbers' );
		process.exit( 2 );
	}

	const browser = await chromium.launch();

	let zoomTechnique = null;
	let zoomFactor = null;
	if ( null !== args.zoom ) {
		zoomFactor = args.zoom / 100;
		const verdict = await verifyZoomTechnique( browser, zoomFactor );
		console.log( verdict.report );
		if ( ! verdict.usable ) {
			await browser.close();
			process.exit( 2 );
		}
		zoomTechnique = verdict.technique;
	}

	const sweep = await runSweep( browser, {
		url: args.url,
		selector: args.selector,
		from: args.from,
		to: args.to,
		step: args.step,
		mode: args.mode,
		tolerance: args.tolerance,
		touchTargets: args.touchTargets,
		zoomTechnique,
		zoomFactor,
	} );

	await browser.close();

	if ( args.json ) {
		fs.writeFileSync( args.json, JSON.stringify( sweep, null, 2 ) );
		console.log( `[row-fit-sweep] full results written to ${ args.json }` );
	}

	if ( sweep.configError ) {
		console.error( `[row-fit-sweep] ERROR — ${ sweep.configError }` );
		process.exit( 2 );
	}

	// Column-transition summary (mode=columns) — surfaced regardless of
	// pass/fail so a hard jump at a round breakpoint is always visible.
	if ( 'columns' === args.mode ) {
		const transitions = sweep.results.filter( ( r ) => r.columnTransition );
		if ( transitions.length ) {
			console.log( '[row-fit-sweep] track-count transitions across the sweep:' );
			transitions.forEach( ( r ) => {
				console.log( `  ${ r.columnTransition.atWidth }px: ${ r.columnTransition.from } -> ${ r.columnTransition.to } tracks` );
			} );
		}
	}

	if ( 0 === sweep.failures.length ) {
		console.log(
			`[row-fit-sweep] PASS — all assertions held across ${ sweep.widths.length } widths (${ args.from }px -> ${ args.to }px, step ${ args.step }px).`
		);
		process.exit( 0 );
	}

	const first = sweep.failures[ 0 ];
	console.log( `[row-fit-sweep] FAIL at ${ first.width }px — ${ first.assertion }: ${ first.message }` );
	console.log( `[row-fit-sweep] ${ sweep.failures.length } total failure(s) across the sweep.` );
	process.exit( 1 );
}

main().catch( ( err ) => {
	console.error( '[row-fit-sweep] UNEXPECTED ERROR:', err && err.stack ? err.stack : err );
	process.exit( 2 );
} );

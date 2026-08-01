/**
 * Job 1/2 (2026-08-01, D453 follow-up register) — fx-scrub.js + fx-split-reveal.js
 * keyboard-hold fix, verified IN SITU against the REAL deployed gsap/ScrollTrigger
 * singleton, WITHOUT deploying the fixed source.
 *
 * ⚠ HONESTY ABOUT WHAT THIS PROVES. The main thread has not deployed the edited
 * `fx-scrub.js` / `fx-split-reveal.js` — the live canary still serves the
 * PRE-FIX bundles. This script therefore does NOT load those modules. It uses
 * the exact technique D453 itself used to A/B three fix shapes before
 * deploying (`.claude/decisions.md` D453): re-import the SAME live ES-module
 * URL (`vendor-modules/gsap-core`) the page already loaded — the module
 * registry is keyed by URL, so this yields the REAL singleton `gsap`/
 * `ScrollTrigger` instance the page's own effects are using, not a second
 * copy — then construct a SYNTHETIC tween with the EXACT scroll-branch config
 * literally copied from each source file (same `fromTo`/`from` + `scrollTrigger`
 * shape), and inject the candidate fix as a plain function. This measures the
 * true library mechanism (scrubTween/resetTo for fx-scrub, toggleActions for
 * fx-split-reveal, gsap.ticker ordering for both) for real, against real gsap
 * 3.15.0 — it does not, and cannot, prove the actual shipped file will behave
 * identically once bundled; that is the post-deploy re-check this file's own
 * header flags as still owed.
 *
 * BOTH fixtures are built fresh per run (appended to <body>) so each test
 * controls its own scroll range and does not depend on any specific page's
 * existing layout.
 *
 * Methodology carried over from probe-step13-pin-focus.mjs (same file family):
 *   1. Poll scrollY / opacity until settled — never sample at a fixed delay
 *      (`scroll-behavior: smooth` on this site's <html> makes any fixed wait
 *      a source of false results, already proven twice on this project).
 *   2. Effective opacity = own opacity multiplied up the ancestor chain to the
 *      scrub root (inclusive) — CSS opacity does not inherit as a computed
 *      value, so a per-element check alone is exactly the blind spot that hid
 *      the original D453 defect.
 *   3. Negative control: run the UNFIXED mechanism (zero focus handling, the
 *      literal shape of the currently-deployed file) first and confirm it
 *      FAILS, before trusting the fixed mechanism's PASS.
 *   4. Cache-bust + re-assert `location.href` — the browser session is shared
 *      across concurrent agents per this dispatch's rules.
 *
 * Usage: node scripts/motion-qa/probe-step14-scrub-focus.mjs
 * Output: JSON to stdout + a verdict. Exit 0 pass, 1 fail, 2 inconclusive.
 *
 * @package SGS\Blocks
 */

import { chromium } from 'playwright';

// Reuse an existing live canary purely as a HOST for the real gsap module —
// its own content/effects are irrelevant to this probe; only the vendor
// module it loads matters.
const HOST_URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-step22-pin-focus/';

const bust = ( u ) => u + ( u.includes( '?' ) ? '&' : '?' ) + 'sgsprobe14=' + Date.now();

/**
 * Re-import the live gsap CORE module by URL (same trick as
 * probe-step13-pin-focus.mjs's `reachPinTimeline`), then locate the
 * ScrollTrigger plugin already registered on that instance via
 * `gsap.core.globals()` — avoids a second `gsap/ScrollTrigger` module fetch
 * (which would also work, but the core module already carries the
 * registration the live page performed).
 */
async function reachLiveGsap( page ) {
	return page.evaluate( async () => {
		const coreUrl = performance
			.getEntriesByType( 'resource' )
			.map( ( e ) => e.name )
			.find( ( n ) => n.includes( 'gsap-core' ) );
		const stUrl = performance
			.getEntriesByType( 'resource' )
			.map( ( e ) => e.name )
			.find( ( n ) => n.includes( 'gsap-scrolltrigger' ) );
		if ( ! coreUrl || ! stUrl ) {
			return { error: 'MODULE_URL_NOT_FOUND', coreUrl, stUrl };
		}
		const coreMod = await import( coreUrl );
		const stMod = await import( stUrl );
		const gsap = coreMod.gsap || coreMod.default;
		const ScrollTrigger = stMod.ScrollTrigger || stMod.default;
		if ( ! gsap || ! ScrollTrigger ) {
			return { error: 'EXPORTS_NOT_FOUND' };
		}
		// Stash on window so subsequent evaluate() calls in this page can
		// reach the SAME singleton without re-importing.
		window.__sgsProbeGsap = gsap;
		window.__sgsProbeST = ScrollTrigger;
		return {
			ok: true,
			hasTicker: typeof gsap.ticker?.add === 'function',
			hasScrollTrigger: typeof ScrollTrigger.create === 'function',
		};
	} );
}

/**
 * Build the synthetic fx-scrub fixture: a tall spacer, then a `<div
 * id="probe-scrub-el">` (the scrub target — `el` in fx-scrub.js's own
 * signature) containing a real `<a id="probe-scrub-link">` — the "el CONTAINS
 * a focusable descendant" shape the task brief specifically calls out, since
 * that is the harder case (own opacity 1, ancestor opacity 0).
 *
 * @param {'unfixed'|'fixed'} mode Which mechanism to wire up.
 */
async function buildScrubFixture( page, mode ) {
	return page.evaluate( ( fixMode ) => {
		document.getElementById( 'probe-scrub-root' )?.remove();

		const root = document.createElement( 'div' );
		root.id = 'probe-scrub-root';

		const spacerTop = document.createElement( 'div' );
		spacerTop.style.height = '1400px';
		spacerTop.id = 'probe-scrub-before';
		spacerTop.tabIndex = -1;

		const el = document.createElement( 'div' );
		el.id = 'probe-scrub-el';
		el.style.padding = '40px';
		el.style.background = '#eee';

		const link = document.createElement( 'a' );
		link.id = 'probe-scrub-link';
		link.href = '#probe-scrub-target';
		link.textContent = 'Focusable link inside the scrubbed element';
		el.appendChild( link );

		const spacerBottom = document.createElement( 'div' );
		spacerBottom.style.height = '2000px';

		root.appendChild( spacerTop );
		root.appendChild( el );
		root.appendChild( spacerBottom );
		document.body.appendChild( root );

		const gsap = window.__sgsProbeGsap;
		const ScrollTrigger = window.__sgsProbeST;
		gsap.registerPlugin( ScrollTrigger );

		// LITERAL COPY of fx-scrub.js's scroll-branch tween config
		// (opacity/y fromTo + scrub: resolveScrub()'s default, which is the
		// NUMBER 1 whenever no data-sgs-fx-scrub is set — the framework
		// default, reproduced here as a literal `1`).
		const tween = gsap.fromTo(
			el,
			{ opacity: 0, y: 40 },
			{
				opacity: 1,
				y: 0,
				ease: 'none',
				scrollTrigger: {
					trigger: el,
					start: 'top 85%',
					end: 'top 40%',
					scrub: 1,
				},
			}
		);

		window.__sgsProbeTween = tween;
		window.__sgsProbeEl = el;

		if ( 'unfixed' === fixMode ) {
			// The CURRENT deployed shape: zero focus handling. Nothing further
			// to wire up — this is the negative control.
			return { mode: fixMode, built: true };
		}

		// THE FIX under test — copied from the edited fx-scrub.js.
		let keyboardHeld = false;
		const holdComplete = () => {
			if ( tween.progress() < 1 ) {
				tween.progress( 1 );
			}
		};
		const revealForKeyboard = () => {
			if ( keyboardHeld ) {
				return;
			}
			keyboardHeld = true;
			gsap.ticker.add( holdComplete );
			holdComplete();
		};
		const releaseForKeyboard = ( event ) => {
			if ( event.relatedTarget && el.contains( event.relatedTarget ) ) {
				return;
			}
			keyboardHeld = false;
			gsap.ticker.remove( holdComplete );
		};
		el.addEventListener( 'focusin', revealForKeyboard );
		el.addEventListener( 'focusout', releaseForKeyboard );
		window.__sgsProbeHoldComplete = holdComplete;
		window.__sgsProbeTickerCount = () => gsap.ticker._listeners.length;

		return { mode: fixMode, built: true };
	}, mode );
}

async function settledScrollTo( page, y ) {
	await page.evaluate( ( yy ) => window.scrollTo( 0, yy ), y );
	let last = await page.evaluate( () => window.scrollY );
	for ( let i = 0; i < 20; i++ ) {
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( 120 );
		// eslint-disable-next-line no-await-in-loop
		const cur = await page.evaluate( () => window.scrollY );
		if ( Math.abs( cur - last ) < 0.5 ) {
			last = cur;
			break;
		}
		last = cur;
	}
	return last;
}

/**
 * Sweep the scrub's own trigger range to find a scrollY that lands the
 * element's opacity genuinely mid-tween (proves the scrub is live, not
 * sitting at 0 or 1 by coincidence).
 *
 * ⚠ GROUND TRUTH, NOT A FORMULA (fixed after a false-negative during this
 * session). An earlier version derived the sweep band from `'top 85%'`/
 * `'top 40%'`'s documented meaning (`elementTop - fraction*viewportHeight`)
 * computed independently from the element's `getBoundingClientRect()`. That
 * band numerically overlapped the trigger's REAL `start`/`end` (confirmed:
 * 3906-4401 fully contains the real 3951-4356) and still produced a flat,
 * unchanging opacity across the whole sweep on a reproducible fixture — a
 * measurement defect in this probe, not a defect in GSAP or the fix. Reading
 * `ScrollTrigger.getAll().find(s => s.trigger === el).start/.end` directly —
 * the actual authoritative values the library itself computed — reproduced
 * correctly every time in side-by-side comparison. This mirrors this
 * project's own `prove-the-cause-before-fix` rule: the derived value was a
 * hypothesis, not ground truth, and it was wrong to build the rest of this
 * probe on it.
 */
async function findMidScrubScrollY( page ) {
	return page.evaluate( async () => {
		const el = window.__sgsProbeEl;
		const ScrollTrigger = window.__sgsProbeST;
		const mine = ScrollTrigger.getAll().find( ( s ) => s.trigger === el );
		if ( ! mine ) {
			return { error: 'NO_TRIGGER_FOUND' };
		}
		const lo = mine.start - 50;
		const hi = mine.end + 50;
		const sweep = [];
		for ( let f = 0; f <= 1; f += 0.05 ) {
			window.scrollTo( 0, lo + ( hi - lo ) * f );
			// eslint-disable-next-line no-await-in-loop
			await new Promise( ( r ) => requestAnimationFrame( r ) );
			// eslint-disable-next-line no-await-in-loop
			await new Promise( ( r ) => setTimeout( r, 150 ) );
			sweep.push( { f, y: lo + ( hi - lo ) * f, o: getComputedStyle( el ).opacity } );
		}
		const mid = sweep.find( ( s ) => parseFloat( s.o ) > 0.05 && parseFloat( s.o ) < 0.5 );
		return {
			sweep,
			triggerStart: mine.start,
			triggerEnd: mine.end,
			opacityChanged: new Set( sweep.map( ( s ) => s.o ) ).size > 1,
			midY: mid ? mid.y : null,
			midOpacityAtChoice: mid ? mid.o : null,
		};
	} );
}

/** Effective opacity of #probe-scrub-link, own × ancestor chain to #probe-scrub-el inclusive. */
async function effectiveLinkOpacity( page ) {
	return page.evaluate( () => {
		const link = document.getElementById( 'probe-scrub-link' );
		const root = document.getElementById( 'probe-scrub-el' );
		let node = link;
		let eff = 1;
		const chain = [];
		while ( node ) {
			const o = parseFloat( getComputedStyle( node ).opacity );
			chain.push( { t: node.id || node.tagName, o } );
			eff *= o;
			if ( node === root ) {
				break;
			}
			node = node.parentElement;
		}
		return { eff: Number( eff.toFixed( 4 ) ), own: parseFloat( getComputedStyle( link ).opacity ), chain };
	} );
}

/** High-frequency trace of effective link opacity for `ms`, sampled every `everyMs`, in one round trip. */
async function traceEffectiveLinkOpacity( page, ms, everyMs ) {
	return page.evaluate(
		( [ windowMs, interval ] ) =>
			new Promise( ( resolve ) => {
				const link = document.getElementById( 'probe-scrub-link' );
				const root = document.getElementById( 'probe-scrub-el' );
				const t0 = performance.now();
				const samples = [];
				const read = () => {
					let node = link;
					let eff = 1;
					while ( node ) {
						eff *= parseFloat( getComputedStyle( node ).opacity );
						if ( node === root ) {
							break;
						}
						node = node.parentElement;
					}
					return Number( eff.toFixed( 4 ) );
				};
				const tick = () => {
					samples.push( { dt: Math.round( performance.now() - t0 ), eff: read() } );
					if ( performance.now() - t0 < windowMs ) {
						setTimeout( tick, interval );
					} else {
						resolve( samples );
					}
				};
				tick();
			} ),
		[ ms, everyMs ]
	);
}

/**
 * ONE full run: build the fixture in `mode`, settle to a mid-scrub scrollY,
 * nudge (restart the catch-up tween), focus the link with NO settle, trace.
 */
async function runFocusRace( browser, mode ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	const page = await context.newPage();
	await page.goto( bust( HOST_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 800 );
	const hrefStart = page.url();

	const reach = await reachLiveGsap( page );
	if ( reach.error ) {
		await context.close();
		return { mode, hrefStart, error: reach.error };
	}

	await buildScrubFixture( page, mode );
	const activation = await findMidScrubScrollY( page );
	// `Number.isFinite`, not a bare `null !== activation.midY` — an ERROR
	// shape has `midY` as `undefined`, and `null !== undefined` is `true` in
	// JS, which is exactly the probe-validity trap probe-step13-pin-focus.mjs
	// documents catching for the same field shape. Guard on both explicitly.
	if ( activation.error || ! Number.isFinite( activation.midY ) ) {
		await context.close();
		return { mode, hrefStart, activation, error: activation.error || 'NO_MID_SCRUB_Y' };
	}
	await settledScrollTo( page, activation.midY );

	// Known origin just before the fixture, preventScroll so focusing it
	// cannot itself move the page (same trap documented in
	// probe-step13-pin-focus.mjs's runPinScrubRealFocus()).
	await page.evaluate( () => {
		const before = document.getElementById( 'probe-scrub-before' );
		before.focus( { preventScroll: true } );
	} );
	await page.waitForTimeout( 150 );

	const preFocus = await effectiveLinkOpacity( page );

	// FORCE THE RACE: nudge scroll (restarts the scrubTween's catch-up),
	// then focus immediately with no settle at all.
	await page.evaluate( () => window.scrollBy( 0, 40 ) );
	await page.evaluate( () => document.getElementById( 'probe-scrub-link' ).focus( { preventScroll: true } ) );
	const raceTrace = await traceEffectiveLinkOpacity( page, 2600, 50 );
	const raceFinal = await effectiveLinkOpacity( page );

	// RE-NUDGE while focus is still held (the assertion a one-shot cannot pass).
	await page.evaluate( () => window.scrollBy( 0, 60 ) );
	const renudgeTrace = await traceEffectiveLinkOpacity( page, 2000, 50 );

	// RELEASE: move focus elsewhere, confirm the hold actually let go by
	// scrolling BACK to a low-opacity position and checking it tracks again.
	await page.evaluate( () => document.getElementById( 'probe-scrub-before' ).focus( { preventScroll: true } ) );
	await page.waitForTimeout( 300 );
	const tickerAfterRelease =
		'fixed' === mode
			? await page.evaluate( () => window.__sgsProbeTickerCount() )
			: null;
	await settledScrollTo( page, activation.sweep[ 0 ].y );
	const afterReleaseLowOpacity = await effectiveLinkOpacity( page );

	const hrefEnd = page.url();
	await context.close();
	return {
		mode,
		hrefStart,
		hrefEnd,
		activation: { opacityChanged: activation.opacityChanged, midY: activation.midY },
		preFocus,
		raceTrace,
		raceFinal,
		renudgeTrace,
		tickerAfterRelease,
		afterReleaseLowOpacity,
	};
}

/**
 * MOUSE CONTROL — with nothing ever focused, the FIXED mechanism must leave
 * the scrub's own scroll-tracking untouched: opacity should still sweep
 * through several distinct values across the trigger range, ticker listener
 * count should return to its pre-fixture baseline once no focus is held.
 */
async function runMouseControl( browser ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	const page = await context.newPage();
	await page.goto( bust( HOST_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 800 );
	const hrefStart = page.url();

	await reachLiveGsap( page );
	const baselineTicker = await page.evaluate( () => window.__sgsProbeGsap.ticker._listeners.length );
	await buildScrubFixture( page, 'fixed' );
	const activation = await findMidScrubScrollY( page );

	const afterBuildTicker = await page.evaluate( () => window.__sgsProbeGsap.ticker._listeners.length );

	// Full sweep, nothing focused at any point.
	const sweep = activation.sweep.map( ( s ) => ( { f: s.f, o: s.o } ) );

	const hrefEnd = page.url();
	await context.close();
	return { hrefStart, hrefEnd, baselineTicker, afterBuildTicker, sweep, opacityChanged: activation.opacityChanged };
}

/**
 * JOB 2 — fx-split-reveal.js's SCROLL ARM. Structurally different from
 * fx-scrub.js: no `scrub`, so ScrollTrigger's default `toggleActions: 'play
 * none none none'` calls `.play()` once on entry and never reverses. Verifies
 * the SIMPLER one-shot fix on the REAL library:
 *   1. UNFIXED — focusing an interactive descendant BEFORE the trigger fires
 *      leaves it invisible with no recovery (the negative control).
 *   2. FIXED — focusin forces `tween.progress(1)` and it holds.
 *   3. The real `onEnter` firing later (scrolling down to the actual trigger
 *      point) must NOT disturb an already-revealed hold — `.play()` on an
 *      already-finished tween is a forward no-op, not a reset.
 *   4. Scrolling back UP past `start` must NOT reverse it — proves the
 *      default `toggleActions` really has no reverse leg here, so the held
 *      reveal cannot be undone by scrolling away.
 *
 * The interactive element is placed as an ANCESTOR of the split fragments
 * (an `<a>` wrapping the animated text), the opposite relationship from
 * fx-scrub.js's fixture — this is SplitText's real shape: it splits text
 * nodes and preserves existing tags like `<a>` as ancestors of the generated
 * fragment spans, so the fragments (the tween's targets) are the anchor's own
 * children, not the reverse.
 */
async function runSplitRevealCheck( browser, mode ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	const page = await context.newPage();
	await page.goto( bust( HOST_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 800 );

	const reach = await page.evaluate( async () => {
		const coreUrl = performance
			.getEntriesByType( 'resource' )
			.map( ( e ) => e.name )
			.find( ( n ) => n.includes( 'gsap-core' ) );
		const stUrl = performance
			.getEntriesByType( 'resource' )
			.map( ( e ) => e.name )
			.find( ( n ) => n.includes( 'gsap-scrolltrigger' ) );
		// HOST_URL's own page only uses pin-scrub, so it never requests the
		// SplitText vendor module — nothing to re-import by resource URL for
		// it. Every GSAP vendor module lives alongside `gsap-core` under the
		// same `vendor-modules/` path (webpack.config.js's `VENDOR_DIR`), so
		// the URL is derived by substitution rather than harvested from
		// `performance` entries. This is the one legitimate case for
		// constructing a module URL rather than re-using an already-loaded
		// one — confirmed by the successful import below, not assumed.
		const stpUrl = coreUrl ? coreUrl.replace( 'gsap-core', 'gsap-splittext' ) : null;
		if ( ! coreUrl || ! stUrl || ! stpUrl ) {
			return { error: 'MODULE_URL_NOT_FOUND', coreUrl, stUrl, stpUrl };
		}
		const [ coreMod, stMod, stpMod ] = await Promise.all( [
			import( coreUrl ),
			import( stUrl ),
			import( stpUrl ),
		] );
		window.__sgsProbeGsap = coreMod.gsap || coreMod.default;
		window.__sgsProbeST = stMod.ScrollTrigger || stMod.default;
		window.__sgsProbeSplit = stpMod.SplitText || stpMod.default;
		return { ok: true };
	} );
	if ( reach.error ) {
		await context.close();
		return { mode, error: reach.error };
	}

	const built = await page.evaluate( ( fixMode ) => {
		document.getElementById( 'probe-split-root' )?.remove();
		const root = document.createElement( 'div' );
		root.id = 'probe-split-root';
		const spacerTop = document.createElement( 'div' );
		spacerTop.style.height = '1400px';
		spacerTop.id = 'probe-split-before';
		spacerTop.tabIndex = -1;
		const el = document.createElement( 'p' );
		el.id = 'probe-split-el';
		// The anchor WRAPS text that SplitText will fragment — the anchor
		// survives as an ancestor of the generated word spans.
		el.innerHTML =
			'Some leading words <a id="probe-split-link" href="#x">a real focusable link inside the split text</a> and trailing words.';
		const spacerBottom = document.createElement( 'div' );
		spacerBottom.style.height = '2000px';
		root.appendChild( spacerTop );
		root.appendChild( el );
		root.appendChild( spacerBottom );
		document.body.appendChild( root );

		const gsap = window.__sgsProbeGsap;
		const ScrollTrigger = window.__sgsProbeST;
		const SplitText = window.__sgsProbeSplit;
		gsap.registerPlugin( ScrollTrigger, SplitText );

		let tween;
		let keyboardHeld = false;
		const split = SplitText.create( el, {
			type: 'words',
			aria: 'auto',
			onSplit( self ) {
				// LITERAL COPY of fx-split-reveal.js's scroll-branch tween
				// config.
				tween = gsap.from( self.words, {
					opacity: 0,
					y: '0.6em',
					duration: 0.6,
					stagger: 0.03,
					ease: 'power2.out',
					scrollTrigger: { trigger: el, start: 'top 85%' },
				} );
				if ( keyboardHeld ) {
					tween.progress( 1 );
				}
				return tween;
			},
		} );

		window.__sgsProbeSplitEl = el;
		window.__sgsProbeSplitInstance = split;
		window.__sgsProbeSplitGetTween = () => tween;

		if ( 'unfixed' === fixMode ) {
			return { built: true };
		}

		const revealForKeyboard = () => {
			if ( keyboardHeld ) {
				return;
			}
			keyboardHeld = true;
			tween?.progress( 1 );
		};
		const releaseForKeyboard = ( event ) => {
			if ( event.relatedTarget && el.contains( event.relatedTarget ) ) {
				return;
			}
			keyboardHeld = false;
		};
		el.addEventListener( 'focusin', revealForKeyboard );
		el.addEventListener( 'focusout', releaseForKeyboard );

		return { built: true };
	}, mode );

	if ( ! built.built ) {
		await context.close();
		return { mode, error: 'BUILD_FAILED' };
	}

	/*
	 * Effective opacity helper for the link's RENDERED CONTENT.
	 *
	 * ⚠ CORRECTED DURING THIS SESSION — the first version walked the ANCESTOR
	 * chain upward from the link (the fx-scrub.js shape), and it read a flat
	 * "1" in every arm including the deliberately-unfixed one — a vacuous
	 * negative control. SplitText's real shape is the OPPOSITE relationship
	 * for this fixture: it preserves the `<a>` as an ANCESTOR and wraps each
	 * WORD inside it in a generated span, so the invisible content is a
	 * DESCENDANT of the link, not an ancestor. The anchor's own opacity
	 * legitimately stays 1 throughout (nothing ever tweens the `<a>` itself),
	 * which is why the WCAG concern here is narrower than fx-scrub.js's (a
	 * sighted keyboard user still sees a focus outline at the right
	 * location) — but the link's rendered LABEL is invisible until the
	 * fragments reveal, which is what this measures: the MINIMUM opacity
	 * across the link's descendant fragment spans, own opacity chained up
	 * only to the link itself (each span's own opacity — SplitText does not
	 * nest spans inside each other, so no further ancestor multiplication is
	 * needed beyond the span itself).
	 */
	const effOfLink = () =>
		page.evaluate( () => {
			const link = document.getElementById( 'probe-split-link' );
			const fragments = Array.from( link.querySelectorAll( '*' ) );
			if ( 0 === fragments.length ) {
				// No split has run yet (e.g. read before onSplit fired) —
				// report the link's own opacity as a fallback signal.
				return Number( parseFloat( getComputedStyle( link ).opacity ).toFixed( 4 ) );
			}
			const opacities = fragments.map( ( f ) => parseFloat( getComputedStyle( f ).opacity ) );
			return Number( Math.min( ...opacities ).toFixed( 4 ) );
		} );

	// Focus the link BEFORE any scroll — trigger has not fired, fragments are
	// still at opacity 0 (immediateRender default), exactly the state D453's
	// mechanism describes.
	const beforeFocus = await effOfLink();
	await page.evaluate( () => document.getElementById( 'probe-split-link' ).focus() );
	await page.waitForTimeout( 200 );
	const afterFocusPreScroll = await effOfLink();

	// Scroll DOWN to genuinely cross the real trigger point (native onEnter
	// fires .play()) — must not disturb an already-held reveal, and for the
	// UNFIXED arm this is what finally reveals it normally (the trigger
	// firing for real), which is expected and not itself a failure of the
	// unfixed arm's OWN mechanism — the defect is the window BEFORE this.
	const trig = await page.evaluate( () => {
		const el = document.getElementById( 'probe-split-el' );
		const ST = window.__sgsProbeST;
		const st = ST.getAll().find( ( s ) => s.trigger === el );
		return st ? st.start : null;
	} );
	if ( Number.isFinite( trig ) ) {
		await settledScrollTo( page, trig + 30 );
	}
	await page.waitForTimeout( 300 );
	const afterCrossingTrigger = await effOfLink();

	// Scroll back UP past `start` — default toggleActions has no reverse leg;
	// must NOT drop back down.
	await settledScrollTo( page, 0 );
	await page.waitForTimeout( 300 );
	const afterScrollingBackUp = await effOfLink();

	await context.close();
	return { mode, beforeFocus, afterFocusPreScroll, trig, afterCrossingTrigger, afterScrollingBackUp };
}

/**
 * POST-DEPLOY CLOSURE (2026-08-01, a11y-postdeploy verification session).
 *
 * Everything above this point tests a HAND-COPIED candidate against the real
 * gsap singleton — proven mechanism, not proven shipped file (this file's own
 * header says so). The fix has since been deployed. This section closes that
 * gap for real: it imports the ACTUAL deployed `fx-scrub.js` / `fx-split-
 * reveal.js` build files BY ABSOLUTE URL (cache-busted so the import re-
 * executes `bootEffect()` against a fixture built just before the import),
 * not a copy of their logic. `bootEffect()` (`provider.js`) scans
 * `document.querySelectorAll('[data-sgs-fx="…"]')` at IMPORT TIME, so a
 * fixture element present in the DOM before the import is wired up by the
 * real, shipped `initScrub`/`initSplitReveal` exactly as a real block would
 * be.
 *
 * HOST PAGE CHOICE MATTERS. A dynamic `import(absoluteUrl)` still resolves
 * that module's own bare-specifier imports (`@sgs/gsap-scrolltrigger`, `@sgs/
 * gsap-splittext`) against the CURRENT DOCUMENT's `<script type="importmap">`
 * — importing by URL does not bypass that resolution for imports nested
 * inside the imported module. `fx-scrub.js` only needs `@sgs/gsap-
 * scrolltrigger` + `@sgs/motion-provider`, both present on every page that
 * loads any GSAP effect (`REAL_FOCUS_URL`, which already carries pin-scrub).
 * `fx-split-reveal.js` additionally needs `@sgs/gsap-splittext`, which is
 * NOT in that page's importmap (it never enqueues the split-reveal effect) —
 * confirmed live before writing this, `import()` for split-reveal on that
 * host throws `TypeError: Failed to resolve module specifier`. `SPLIT_HOST_URL`
 * below (an existing published canary, `fx-preset-comparison`, found via
 * `wp db query` against post_content for `split-reveal`) already uses the
 * split-reveal effect elsewhere on the page, so its importmap carries the
 * entry — confirmed live the same way before relying on it.
 */
const SCRUB_HOST_URL = HOST_URL;
const SPLIT_HOST_URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/fx-preset-comparison/';
const FX_SCRUB_MODULE_URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/wp-content/plugins/sgs-blocks/build/shared/effects/gsap/fx-scrub.js';
const FX_SPLIT_MODULE_URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/wp-content/plugins/sgs-blocks/build/shared/effects/gsap/fx-split-reveal.js';

/**
 * Build a scrub fixture (spacer/el-with-link/spacer, `data-sgs-fx="scrub"`,
 * no `data-sgs-fx-scrub` set — the framework's numeric-scrub DEFAULT), import
 * the REAL deployed `fx-scrub.js` by URL, and run the identical race this
 * file already runs against the copied candidate: settle to mid-scrub, nudge
 * + focus with no settle, trace, re-nudge while held, release.
 *
 * @param {import('playwright').Browser} browser       Browser.
 * @param {'no-preference'|'reduce'}     reducedMotion  Media emulation.
 */
async function runRealScrubModule( browser, reducedMotion ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion } );
	const page = await context.newPage();
	await page.goto( bust( SCRUB_HOST_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 800 );
	const hrefStart = page.url();

	const built = await page.evaluate( ( fixModUrl ) => {
		document.getElementById( 'real-scrub-root' )?.remove();
		const root = document.createElement( 'div' );
		root.id = 'real-scrub-root';
		const before = document.createElement( 'div' );
		before.style.height = '1400px';
		before.id = 'real-scrub-before';
		before.tabIndex = -1;
		const el = document.createElement( 'div' );
		el.id = 'real-scrub-el';
		el.setAttribute( 'data-sgs-fx', 'scrub' );
		el.style.padding = '40px';
		el.style.background = '#eee';
		const link = document.createElement( 'a' );
		link.id = 'real-scrub-link';
		link.href = '#x';
		link.textContent = 'Real module test link';
		el.appendChild( link );
		const after = document.createElement( 'div' );
		after.style.height = '2000px';
		root.appendChild( before );
		root.appendChild( el );
		root.appendChild( after );
		document.body.appendChild( root );
		return import( fixModUrl + '?realmod=' + Date.now() )
			.then( ( mod ) => ( { ok: true, exports: Object.keys( mod ) } ) )
			.catch( ( e ) => ( { ok: false, error: String( e ) } ) );
	}, FX_SCRUB_MODULE_URL );

	if ( ! built.ok ) {
		await context.close();
		return { reducedMotion, hrefStart, error: built.error };
	}

	// SIMPLIFY contract (§10) under reduced motion: no ScrollTrigger at all,
	// element rendered at its authored end state (opacity 1, no y-offset).
	if ( 'reduce' === reducedMotion ) {
		await page.waitForTimeout( 300 );
		const state = await page.evaluate( async () => {
			const el = document.getElementById( 'real-scrub-el' );
			const stUrl = performance
				.getEntriesByType( 'resource' )
				.map( ( e ) => e.name )
				.find( ( n ) => n.includes( 'gsap-scrolltrigger' ) );
			const stMod = await import( stUrl );
			const ST = stMod.ScrollTrigger || stMod.default;
			const st = ST.getAll().find( ( s ) => s.trigger === el );
			return {
				opacity: getComputedStyle( el ).opacity,
				transform: getComputedStyle( el ).transform,
				triggerCreated: !! st,
			};
		} );
		const hrefEnd = page.url();
		await context.close();
		return { reducedMotion, hrefStart, hrefEnd, simplify: state };
	}

	const activation = await page.evaluate( async () => {
		const el = document.getElementById( 'real-scrub-el' );
		const stUrl = performance
			.getEntriesByType( 'resource' )
			.map( ( e ) => e.name )
			.find( ( n ) => n.includes( 'gsap-scrolltrigger' ) );
		const stMod = await import( stUrl );
		const ST = stMod.ScrollTrigger || stMod.default;
		const st = ST.getAll().find( ( s ) => s.trigger === el );
		if ( ! st ) {
			return { error: 'NO_TRIGGER' };
		}
		const lo = st.start - 50;
		const hi = st.end + 50;
		const sweep = [];
		for ( let f = 0; f <= 1; f += 0.1 ) {
			window.scrollTo( 0, lo + ( hi - lo ) * f );
			// eslint-disable-next-line no-await-in-loop
			await new Promise( ( r ) => requestAnimationFrame( r ) );
			// eslint-disable-next-line no-await-in-loop
			await new Promise( ( r ) => setTimeout( r, 150 ) );
			sweep.push( { f, o: getComputedStyle( el ).opacity } );
		}
		const mid = sweep.find( ( s ) => parseFloat( s.o ) > 0.05 && parseFloat( s.o ) < 0.5 );
		const midIndex = mid ? sweep.indexOf( mid ) : -1;
		return {
			start: st.start,
			end: st.end,
			opacityChanged: new Set( sweep.map( ( s ) => s.o ) ).size > 1,
			midY: midIndex >= 0 ? lo + ( hi - lo ) * ( midIndex / 10 ) : null,
			sweep,
		};
	} );

	if ( activation.error || ! Number.isFinite( activation.midY ) ) {
		await context.close();
		return { reducedMotion, hrefStart, activation, error: activation.error || 'NO_MID_Y' };
	}

	// MOUSE CONTROL for this exact fixture — opacityChanged already proves it
	// (nothing was focused during the sweep above), captured here explicitly.
	const mouseOpacityChanged = activation.opacityChanged;

	await settledScrollTo( page, activation.midY );
	await page.evaluate( () => {
		document.getElementById( 'real-scrub-before' ).focus( { preventScroll: true } );
	} );
	await page.waitForTimeout( 150 );
	const preFocus = await page.evaluate(
		() => getComputedStyle( document.getElementById( 'real-scrub-link' ) ).opacity
	);

	// FORCE THE RACE: nudge scroll, focus immediately, no settle.
	await page.evaluate( () => window.scrollBy( 0, 40 ) );
	await page.evaluate( () =>
		document.getElementById( 'real-scrub-link' ).focus( { preventScroll: true } )
	);
	const raceTrace = await page.evaluate(
		( ms ) =>
			new Promise( ( resolve ) => {
				const el = document.getElementById( 'real-scrub-el' );
				const t0 = performance.now();
				const samples = [];
				const tick = () => {
					samples.push( { dt: Math.round( performance.now() - t0 ), o: getComputedStyle( el ).opacity } );
					if ( performance.now() - t0 < ms ) {
						setTimeout( tick, 50 );
					} else {
						resolve( samples );
					}
				};
				tick();
			} ),
		2600
	);

	// RE-NUDGE while focus is still held.
	await page.evaluate( () => window.scrollBy( 0, 60 ) );
	const renudgeTrace = await page.evaluate(
		( ms ) =>
			new Promise( ( resolve ) => {
				const el = document.getElementById( 'real-scrub-el' );
				const t0 = performance.now();
				const samples = [];
				const tick = () => {
					samples.push( { dt: Math.round( performance.now() - t0 ), o: getComputedStyle( el ).opacity } );
					if ( performance.now() - t0 < ms ) {
						setTimeout( tick, 50 );
					} else {
						resolve( samples );
					}
				};
				tick();
			} ),
		2000
	);

	// RELEASE + confirm the hold actually let go: move focus away, scroll back
	// to a low-opacity position, confirm the participant tracks scroll again.
	await page.evaluate( () => {
		document.getElementById( 'real-scrub-before' ).focus( { preventScroll: true } );
	} );
	await page.waitForTimeout( 300 );
	await settledScrollTo( page, activation.sweep[ 0 ].o !== undefined ? activation.midY - ( activation.end - activation.start ) : activation.start - 50 );
	const afterReleaseLowOpacity = await page.evaluate(
		() => getComputedStyle( document.getElementById( 'real-scrub-el' ) ).opacity
	);

	const hrefEnd = page.url();
	await context.close();
	return {
		reducedMotion,
		hrefStart,
		hrefEnd,
		activation: { start: activation.start, end: activation.end, opacityChanged: activation.opacityChanged, midY: activation.midY },
		mouseOpacityChanged,
		preFocus,
		raceTrace,
		renudgeTrace,
		afterReleaseLowOpacity,
	};
}

/**
 * Same closure, for `fx-split-reveal.js`, against `SPLIT_HOST_URL` (whose
 * importmap already carries `@sgs/gsap-splittext` because the page's own
 * content uses the effect elsewhere).
 *
 * @param {import('playwright').Browser} browser      Browser.
 * @param {'no-preference'|'reduce'}     reducedMotion Media emulation.
 */
async function runRealSplitRevealModule( browser, reducedMotion ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion } );
	const page = await context.newPage();
	await page.goto( bust( SPLIT_HOST_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 800 );
	const hrefStart = page.url();

	const built = await page.evaluate( ( fixModUrl ) => {
		document.getElementById( 'real-split-root' )?.remove();
		const root = document.createElement( 'div' );
		root.id = 'real-split-root';
		const before = document.createElement( 'div' );
		before.style.height = '1400px';
		before.id = 'real-split-before';
		before.tabIndex = -1;
		const el = document.createElement( 'p' );
		el.id = 'real-split-el';
		el.setAttribute( 'data-sgs-fx', 'split-reveal' );
		el.innerHTML =
			'Some leading words <a id="real-split-link" href="#x">a real focusable link inside real split text</a> and trailing words.';
		const after = document.createElement( 'div' );
		after.style.height = '2000px';
		root.appendChild( before );
		root.appendChild( el );
		root.appendChild( after );
		document.body.appendChild( root );
		return import( fixModUrl + '?realmod=' + Date.now() )
			.then( ( mod ) => ( { ok: true, exports: Object.keys( mod ) } ) )
			.catch( ( e ) => ( { ok: false, error: String( e ) } ) );
	}, FX_SPLIT_MODULE_URL );

	if ( ! built.ok ) {
		await context.close();
		return { reducedMotion, hrefStart, error: built.error };
	}

	if ( 'reduce' === reducedMotion ) {
		// SIMPLIFY contract: no split at all, plain readable text at full
		// opacity — check the element's OWN opacity (unsplit means no per-
		// fragment spans exist to query).
		await page.waitForTimeout( 400 );
		const state = await page.evaluate( () => {
			const el = document.getElementById( 'real-split-el' );
			/*
			 * `el.querySelectorAll('*').length` is NOT a valid split-happened
			 * signal — this fixture's own un-split markup already contains a
			 * literal `<a>` child (the focusable link the test needs), so a
			 * bare child count is non-zero even when SplitText never ran,
			 * false-failing this exact check on first use. SplitText's own
			 * `aria:'auto'` (fx-split-reveal.js's explicit config) marks EVERY
			 * generated fragment `aria-hidden="true"` and nothing else on this
			 * fixture ever gets that attribute — confirmed live against the
			 * already-split no-preference fixture (15 `aria-hidden="true"`
			 * DIVs, the literal `<a>` NOT among them) before relying on it.
			 */
			const splitFragments = el.querySelectorAll( '[aria-hidden="true"]' ).length;
			return {
				opacity: getComputedStyle( el ).opacity,
				splitFragments,
				childCount: el.querySelectorAll( '*' ).length,
				text: el.textContent.trim(),
			};
		} );
		const hrefEnd = page.url();
		await context.close();
		return { reducedMotion, hrefStart, hrefEnd, simplify: state };
	}

	const effOfLink = () =>
		page.evaluate( () => {
			const link = document.getElementById( 'real-split-link' );
			const fragments = Array.from( link.querySelectorAll( '*' ) );
			if ( 0 === fragments.length ) {
				return Number( parseFloat( getComputedStyle( link ).opacity ).toFixed( 4 ) );
			}
			return Number( Math.min( ...fragments.map( ( f ) => parseFloat( getComputedStyle( f ).opacity ) ) ).toFixed( 4 ) );
		} );

	const beforeFocus = await effOfLink();
	await page.evaluate( () => document.getElementById( 'real-split-link' ).focus() );
	await page.waitForTimeout( 200 );
	const afterFocusPreScroll = await effOfLink();

	const trig = await page.evaluate( async () => {
		const el = document.getElementById( 'real-split-el' );
		const stUrl = performance
			.getEntriesByType( 'resource' )
			.map( ( e ) => e.name )
			.find( ( n ) => n.includes( 'gsap-scrolltrigger' ) );
		const stMod = await import( stUrl );
		const ST = stMod.ScrollTrigger || stMod.default;
		const st = ST.getAll().find( ( s ) => s.trigger === el );
		return st ? st.start : null;
	} );
	if ( Number.isFinite( trig ) ) {
		await settledScrollTo( page, trig + 30 );
	}
	await page.waitForTimeout( 300 );
	const afterCrossingTrigger = await effOfLink();

	await settledScrollTo( page, 0 );
	await page.waitForTimeout( 300 );
	const afterScrollingBackUp = await effOfLink();

	// MOUSE CONTROL, same host+module, a SEPARATE fresh element, nothing ever
	// focused — the native onEnter reveal must still fire unattended.
	const mouse = await page.evaluate( ( fixModUrl ) => {
		document.getElementById( 'real-split-root2' )?.remove();
		const root = document.createElement( 'div' );
		root.id = 'real-split-root2';
		const before = document.createElement( 'div' );
		before.style.height = '1400px';
		const el = document.createElement( 'p' );
		el.id = 'real-split-el2';
		el.setAttribute( 'data-sgs-fx', 'split-reveal' );
		el.innerHTML = 'Mouse-only control paragraph with no interaction at all, just scroll.';
		const after = document.createElement( 'div' );
		after.style.height = '2000px';
		root.appendChild( before );
		root.appendChild( el );
		root.appendChild( after );
		document.body.appendChild( root );
		return import( fixModUrl + '?realmod=' + Date.now() ).then( () => ( { ok: true } ) );
	}, FX_SPLIT_MODULE_URL );
	await page.waitForTimeout( 200 );
	const mouseBefore = await page.evaluate( () => {
		const el = document.getElementById( 'real-split-el2' );
		const frags = Array.from( el.querySelectorAll( '*' ) );
		return frags.length ? Math.min( ...frags.map( ( f ) => parseFloat( getComputedStyle( f ).opacity ) ) ) : parseFloat( getComputedStyle( el ).opacity );
	} );
	const mouseTrig = await page.evaluate( async () => {
		const el = document.getElementById( 'real-split-el2' );
		const stUrl = performance
			.getEntriesByType( 'resource' )
			.map( ( e ) => e.name )
			.find( ( n ) => n.includes( 'gsap-scrolltrigger' ) );
		const stMod = await import( stUrl );
		const ST = stMod.ScrollTrigger || stMod.default;
		const st = ST.getAll().find( ( s ) => s.trigger === el );
		return st ? st.start : null;
	} );
	if ( Number.isFinite( mouseTrig ) ) {
		await settledScrollTo( page, mouseTrig + 30 );
	}
	// Generous, explicit settle (not a fixed too-short wait) — the stagger
	// animation itself takes real time (duration 0.6s + per-word stagger), and
	// an earlier ad hoc check of this exact shape read a false "0" at 500ms
	// because the reveal was still mid-stagger, not because it never fired.
	let mouseAfter = mouseBefore;
	for ( let i = 0; i < 15; i++ ) {
		// eslint-disable-next-line no-await-in-loop
		await page.waitForTimeout( 150 );
		// eslint-disable-next-line no-await-in-loop
		const cur = await page.evaluate( () => {
			const el = document.getElementById( 'real-split-el2' );
			const frags = Array.from( el.querySelectorAll( '*' ) );
			return frags.length ? Math.min( ...frags.map( ( f ) => parseFloat( getComputedStyle( f ).opacity ) ) ) : parseFloat( getComputedStyle( el ).opacity );
		} );
		mouseAfter = cur;
		if ( cur >= 0.999 ) {
			break;
		}
	}

	const hrefEnd = page.url();
	await context.close();
	return {
		reducedMotion,
		hrefStart,
		hrefEnd,
		beforeFocus,
		afterFocusPreScroll,
		trig,
		afterCrossingTrigger,
		afterScrollingBackUp,
		mouseControl: { mouseBefore, mouseAfter },
	};
}

const browser = await chromium.launch();

const out = {};
out.unfixed = await runFocusRace( browser, 'unfixed' );
out.fixed = await runFocusRace( browser, 'fixed' );
out.mouseControl = await runMouseControl( browser );
out.splitUnfixed = await runSplitRevealCheck( browser, 'unfixed' );
out.splitFixed = await runSplitRevealCheck( browser, 'fixed' );

out.realScrubModule_noPreference = await runRealScrubModule( browser, 'no-preference' );
out.realScrubModule_reduce = await runRealScrubModule( browser, 'reduce' );
out.realSplitModule_noPreference = await runRealSplitRevealModule( browser, 'no-preference' );
out.realSplitModule_reduce = await runRealSplitRevealModule( browser, 'reduce' );

await browser.close();

console.log( JSON.stringify( out, null, 1 ) );

// ── verdict ──────────────────────────────────────────────────────────────
const fails = [];
const inconclusive = [];

const RAMP_ALLOWANCE_MS = 600;

function assertTrace( label, trace, expectHeld ) {
	if ( ! trace || ! trace.length ) {
		inconclusive.push( `${ label }: no trace captured` );
		return;
	}
	const after = trace.filter( ( s ) => s.dt >= RAMP_ALLOWANCE_MS );
	const tail = trace.filter( ( s ) => s.dt >= trace[ trace.length - 1 ].dt - 500 );
	const min = Math.min( ...after.map( ( s ) => s.eff ) );
	const tailMin = Math.min( ...tail.map( ( s ) => s.eff ) );
	if ( expectHeld ) {
		if ( min < 0.99 ) {
			fails.push( `${ label }: expected HELD at ~1 after ${ RAMP_ALLOWANCE_MS }ms, min=${ min }` );
		}
		if ( tailMin < 0.99 ) {
			fails.push( `${ label }: reveal overwritten — tail min=${ tailMin } (one-shot failure shape)` );
		}
	}
}

// Negative control: the UNFIXED mechanism must fail — a focused link mid-race
// must NOT converge to ~1 (there is nothing to make it do so).
if ( ! out.unfixed || out.unfixed.error ) {
	inconclusive.push( `unfixed run errored: ${ out.unfixed ? out.unfixed.error : 'missing' }` );
} else {
	const after = out.unfixed.raceTrace.filter( ( s ) => s.dt >= RAMP_ALLOWANCE_MS );
	const allHigh = after.length > 0 && after.every( ( s ) => s.eff >= 0.99 );
	if ( allHigh ) {
		fails.push(
			'NEGATIVE CONTROL DID NOT FIRE: the UNFIXED mechanism (no focus handling) held at ~1 anyway — this probe cannot distinguish the fix from doing nothing'
		);
	}
}

// The fix must pass both assertions the council/D453 measured a one-shot losing.
if ( ! out.fixed || out.fixed.error ) {
	inconclusive.push( `fixed run errored: ${ out.fixed ? out.fixed.error : 'missing' }` );
} else {
	assertTrace( 'fixed/race', out.fixed.raceTrace, true );
	assertTrace( 'fixed/re-nudge-while-focused', out.fixed.renudgeTrace, true );
	if ( out.fixed.afterReleaseLowOpacity.eff >= 0.5 ) {
		fails.push(
			`fixed/after-release: effective opacity is ${ out.fixed.afterReleaseLowOpacity.eff } after focus moved away and the scroll returned to the low-opacity position — the hold did not release, or it clobbered normal scrub tracking`
		);
	}
	if ( null !== out.fixed.tickerAfterRelease && out.fixed.tickerAfterRelease > out.mouseControl.baselineTicker + 1 ) {
		// +1 tolerance: this run's OWN fixture registers its holdComplete only
		// while held; after release it should be gone, leaving the ticker at
		// (baseline + whatever else the page itself runs), not permanently grown.
		inconclusive.push(
			`fixed/after-release: ticker listener count ${ out.fixed.tickerAfterRelease } vs baseline ${ out.mouseControl.baselineTicker } — inspect manually, gsap.ticker._listeners is an internal, not a stable public API`
		);
	}
}

// Mouse control: opacity must still track scroll (several distinct values),
// proving the fix costs a non-keyboard user nothing.
if ( ! out.mouseControl || out.mouseControl.error ) {
	inconclusive.push( 'mouseControl run errored' );
} else if ( ! out.mouseControl.opacityChanged ) {
	fails.push( 'MOUSE CONTROL: opacity never changed across the sweep — could not confirm scrub tracking is intact' );
}

// JOB 2 — fx-split-reveal.js. Negative control: the UNFIXED mechanism must
// leave the link invisible right after focus, before the real trigger fires.
if ( ! out.splitUnfixed || out.splitUnfixed.error ) {
	inconclusive.push( `splitUnfixed run errored: ${ out.splitUnfixed ? out.splitUnfixed.error : 'missing' }` );
} else if ( out.splitUnfixed.afterFocusPreScroll >= 0.5 ) {
	fails.push(
		`NEGATIVE CONTROL DID NOT FIRE (split-reveal): the UNFIXED mechanism left the link at effective opacity ${ out.splitUnfixed.afterFocusPreScroll } after focus, before the trigger fired — this probe cannot distinguish the fix from doing nothing`
	);
}

// The fix must reveal on focus, survive the real onEnter firing later, and
// survive scrolling back up past `start` (default toggleActions has no
// reverse leg, so nothing should ever pull it back down).
if ( ! out.splitFixed || out.splitFixed.error ) {
	inconclusive.push( `splitFixed run errored: ${ out.splitFixed ? out.splitFixed.error : 'missing' }` );
} else {
	if ( out.splitFixed.afterFocusPreScroll < 0.99 ) {
		fails.push(
			`splitFixed: effective opacity ${ out.splitFixed.afterFocusPreScroll } after focus, before the trigger fired — the one-shot reveal did not land`
		);
	}
	if ( out.splitFixed.afterCrossingTrigger < 0.99 ) {
		fails.push(
			`splitFixed: effective opacity dropped to ${ out.splitFixed.afterCrossingTrigger } after scrolling down to the real trigger point — the native onEnter play() disturbed an already-held reveal`
		);
	}
	if ( out.splitFixed.afterScrollingBackUp < 0.99 ) {
		fails.push(
			`splitFixed: effective opacity dropped to ${ out.splitFixed.afterScrollingBackUp } after scrolling back up past 'start' — something reversed the reveal despite the default toggleActions having no reverse leg`
		);
	}
}

// ── POST-DEPLOY REAL-MODULE VERDICT ─────────────────────────────────────────
// These runs import the ACTUAL shipped fx-scrub.js / fx-split-reveal.js by
// URL — this closes the gap the synthetic-harness runs above cannot.
function assertOTrace( label, trace ) {
	if ( ! trace || ! trace.length ) {
		inconclusive.push( `${ label }: no trace captured` );
		return;
	}
	const after = trace.filter( ( s ) => s.dt >= RAMP_ALLOWANCE_MS );
	const tail = trace.filter( ( s ) => s.dt >= trace[ trace.length - 1 ].dt - 500 );
	const min = Math.min( ...after.map( ( s ) => parseFloat( s.o ) ) );
	const tailMin = Math.min( ...tail.map( ( s ) => parseFloat( s.o ) ) );
	if ( min < 0.99 ) {
		fails.push( `${ label } [REAL MODULE]: expected HELD at ~1 after ${ RAMP_ALLOWANCE_MS }ms, min=${ min }` );
	}
	if ( tailMin < 0.99 ) {
		fails.push( `${ label } [REAL MODULE]: reveal overwritten — tail min=${ tailMin } (one-shot failure shape)` );
	}
}

const rsm = out.realScrubModule_noPreference;
if ( ! rsm || rsm.error ) {
	inconclusive.push( `realScrubModule_noPreference [REAL MODULE]: ${ rsm ? rsm.error : 'missing' }` );
} else {
	if ( ! rsm.mouseOpacityChanged ) {
		fails.push( 'realScrubModule_noPreference [REAL MODULE]: opacity never changed across the sweep — could not confirm the real module\'s scrub is live' );
	}
	assertOTrace( 'realScrubModule_noPreference/race', rsm.raceTrace );
	assertOTrace( 'realScrubModule_noPreference/re-nudge-while-focused', rsm.renudgeTrace );
	if ( parseFloat( rsm.afterReleaseLowOpacity ) >= 0.5 ) {
		fails.push(
			`realScrubModule_noPreference [REAL MODULE]: effective opacity is ${ rsm.afterReleaseLowOpacity } after focus moved away and scroll returned to a low-opacity position — the real shipped module's hold did not release`
		);
	}
}

const rsmR = out.realScrubModule_reduce;
if ( ! rsmR || rsmR.error ) {
	inconclusive.push( `realScrubModule_reduce [REAL MODULE]: ${ rsmR ? rsmR.error : 'missing' }` );
} else if ( rsmR.simplify ) {
	if ( rsmR.simplify.triggerCreated ) {
		fails.push( 'realScrubModule_reduce [REAL MODULE]: a ScrollTrigger was created under prefers-reduced-motion:reduce — violates the §10 SIMPLIFY contract' );
	}
	if ( parseFloat( rsmR.simplify.opacity ) < 0.99 ) {
		fails.push( `realScrubModule_reduce [REAL MODULE]: element opacity is ${ rsmR.simplify.opacity } under reduced motion — expected full opacity, no animation` );
	}
}

const rspm = out.realSplitModule_noPreference;
if ( ! rspm || rspm.error ) {
	inconclusive.push( `realSplitModule_noPreference [REAL MODULE]: ${ rspm ? rspm.error : 'missing' }` );
} else {
	if ( rspm.afterFocusPreScroll < 0.99 ) {
		fails.push( `realSplitModule_noPreference [REAL MODULE]: effective opacity ${ rspm.afterFocusPreScroll } after focus, before the trigger fired` );
	}
	if ( rspm.afterCrossingTrigger < 0.99 ) {
		fails.push( `realSplitModule_noPreference [REAL MODULE]: effective opacity dropped to ${ rspm.afterCrossingTrigger } after the real onEnter fired` );
	}
	if ( rspm.afterScrollingBackUp < 0.99 ) {
		fails.push( `realSplitModule_noPreference [REAL MODULE]: effective opacity dropped to ${ rspm.afterScrollingBackUp } after scrolling back past 'start'` );
	}
	if ( rspm.mouseControl && rspm.mouseControl.mouseAfter < 0.99 ) {
		fails.push( `realSplitModule_noPreference [REAL MODULE]: MOUSE CONTROL — unattended reveal never reached full opacity (stopped at ${ rspm.mouseControl.mouseAfter })` );
	}
}

const rspmR = out.realSplitModule_reduce;
if ( ! rspmR || rspmR.error ) {
	inconclusive.push( `realSplitModule_reduce [REAL MODULE]: ${ rspmR ? rspmR.error : 'missing' }` );
} else if ( rspmR.simplify ) {
	if ( rspmR.simplify.splitFragments > 0 ) {
		fails.push( `realSplitModule_reduce [REAL MODULE]: SplitText created ${ rspmR.simplify.splitFragments } aria-hidden fragments under prefers-reduced-motion:reduce — violates the §10 SIMPLIFY contract (no split expected)` );
	}
	if ( parseFloat( rspmR.simplify.opacity ) < 0.99 ) {
		fails.push( `realSplitModule_reduce [REAL MODULE]: element opacity is ${ rspmR.simplify.opacity } under reduced motion` );
	}
}

console.log( '\n=== VERDICT ===' );
console.log(
	'⚠ Two evidence tiers in this run. (1) IN-SITU SYNTHETIC HARNESS (out.unfixed/fixed/splitUnfixed/splitFixed) — candidate code copied verbatim onto the real gsap/ScrollTrigger/SplitText singleton; proves the mechanism, not the shipped file. (2) REAL-MODULE CLOSURE (out.realScrubModule_*/realSplitModule_*) — imports the ACTUAL deployed fx-scrub.js/fx-split-reveal.js by URL and lets bootEffect() wire a fresh fixture with the literal shipped code; this is the shipped-file proof the header above flags as owed, closed 2026-08-01.'
);
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
console.log(
	'PASS — the unfixed mechanism correctly failed (negative control fired), the fixed mechanism held effective opacity at ~1 through the race and a re-nudge while focused, released cleanly, and mouse-only choreography was untouched.'
);
process.exit( 0 );

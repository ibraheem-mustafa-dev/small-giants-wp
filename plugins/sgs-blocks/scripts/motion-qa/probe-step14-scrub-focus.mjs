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

const browser = await chromium.launch();

const out = {};
out.unfixed = await runFocusRace( browser, 'unfixed' );
out.fixed = await runFocusRace( browser, 'fixed' );
out.mouseControl = await runMouseControl( browser );
out.splitUnfixed = await runSplitRevealCheck( browser, 'unfixed' );
out.splitFixed = await runSplitRevealCheck( browser, 'fixed' );

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

console.log( '\n=== VERDICT ===' );
console.log(
	'⚠ IN-SITU SYNTHETIC HARNESS — this exercises the real live gsap/ScrollTrigger singleton with the candidate code injected verbatim, NOT the deployed fx-scrub.js bundle (unchanged on the canary as of this run). A post-deploy re-run against the actual shipped module is still owed — see the file header.'
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

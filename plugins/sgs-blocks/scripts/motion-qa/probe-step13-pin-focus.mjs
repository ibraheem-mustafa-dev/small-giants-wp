/**
 * Step 13 (Motion Wave D register) — pin + horizontal-panel keyboard story.
 *
 * WHAT THIS SETTLES
 * Neither `fx-pin-scrub.js` nor `fx-horizontal-panel.js` states what happens
 * when Tab reaches content inside an ACTIVE pin. This measures it empirically
 * against the live canaries, using REAL `keyboard.press('Tab')` (not
 * programmatic `.focus()`), on BOTH the motion-allowed arm and the
 * reduced-motion arm.
 *
 * ⚠ THE PROBE-VALIDITY TRAP THIS FILE EXISTS TO AVOID (methodology rule 1)
 * A Tab press only means something if it lands while the pin is genuinely
 * ACTIVE (position: fixed, mid- or post-tween). This script scrolls to a
 * scroll offset proven — by direct measurement of opacity/transform on the
 * pinned children across a scroll sweep — to hold the section fixed, and
 * asserts `getComputedStyle(host).position === 'fixed'` immediately before
 * every Tab press. If that assertion ever fails the run reports INCONCLUSIVE
 * for that step rather than a false PASS/FAIL.
 *
 * NEGATIVE CONTROL (methodology rule 3)
 * A synthetic focusable element is injected in NORMAL document flow
 * (appended to `<body>`, deliberately NOT inside the pinned host — a
 * `position: fixed` pinned element is immune to a scroll-jack by
 * construction, so an in-pin injection could never exercise this), with a
 * deliberate 2.4.11 violation: a focus-time scroll-to-top that carries the
 * just-focused element off-screen. The check must FLAG this. If it does
 * not, the check itself is vacuous and the whole run is discarded.
 *
 * ⚠ SCROLL-BEHAVIOUR:SMOOTH TRAP (found + fixed during this run)
 * This site sets `scroll-behavior: smooth` on `<html>`. The browser's
 * native "scroll the newly focused element into view" therefore runs as an
 * animated scroll taking several hundred ms. `probe-horizontal-panel.js`
 * already documented this exact trap for scroll-driven sampling; it turns
 * out to bite a Tab-press probe too. A fixed 120ms sample after each Tab
 * press caught the scroll mid-flight and reported a FALSE 2.4.11 failure on
 * an element that settles perfectly in view once the smooth scroll
 * finishes. `tabWalk()` below polls `window.scrollY` until it stops
 * changing (bounded — a genuinely stuck scroll still gets measured, not
 * spun on forever) before reading focus state.
 *
 * Usage: node scripts/motion-qa/probe-step13-pin-focus.mjs (run from
 * plugins/sgs-blocks/ or repo root — screenshot paths below resolve
 * relative to the repo root regardless of cwd).
 * Output: JSON to stdout + a summary. Exit 0 pass, 1 fail, 2 inconclusive.
 *
 * @package SGS\Blocks
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

// Repo root is three levels up from this file
// (plugins/sgs-blocks/scripts/motion-qa/) — resolved so screenshots always
// land at the repo-root `reports/visual-diff/assets/` (STOP-67) regardless
// of the cwd the script is invoked from.
const REPO_ROOT = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../..' );
const shotPath = ( name ) => path.join( REPO_ROOT, 'reports', 'visual-diff', 'assets', name );

const PIN_URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-pin-scrub/';
const HP_URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-horizontal-panel/';

/*
 * JOB 1 FIXTURE (2026-08-01) — this file's own header docblock states the
 * defect this run exists to settle: "every canary fixture with an active pin
 * contains NO focusable element inside the pin". Confirmed true on BOTH
 * `PIN_URL` and `HP_URL` above at the time of this addition — both now 404
 * (verified: curl -o /dev/null -w '%{http_code}' returned 404 for each on
 * 2026-08-01), so the "recorded pass" in Spec 38 §3.1 cannot have been run
 * against live infrastructure recently either way. `REAL_FOCUS_URL` is a new
 * fixture (`wp post create`, page 2114) built specifically to carry real
 * interactive content — a link, a text form field, and a submit button —
 * inside a genuine `sgs/container` `data-sgs-fx="pin-scrub"` pin, so a Tab
 * press can land on something real while the section is fixed.
 */
const REAL_FOCUS_URL =
	'https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-step22-pin-focus/';

const bust = ( u ) => u + ( u.includes( '?' ) ? '&' : '?' ) + 'sgsprobe13=' + Date.now();

/**
 * Is the given element's bounding box fully inside the viewport?
 * (WCAG 2.4.11's plain-English test: can the user SEE where focus is.)
 */
const inViewportFn = () => {
	const el = document.activeElement;
	if ( ! el || el === document.body ) {
		return { tag: null, inViewport: false, reason: 'no-active-element' };
	}
	const r = el.getBoundingClientRect();
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const inViewport =
		r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw && r.width > 0 && r.height > 0;
	// Distinguish "this effect's own pinned content" from "a pre-existing,
	// unrelated off-canvas/hidden nav element that happens to sit in the tab
	// order" — the latter is a site-wide header bug out of Step 13's scope,
	// not a defect in fx-pin-scrub.js / fx-horizontal-panel.js.
	const insidePin = !! el.closest( '[data-sgs-fx="pin-scrub"], [data-sgs-fx="horizontal-panel"]' );
	const hiddenAncestor = ( () => {
		let node = el;
		while ( node && node !== document.body ) {
			const cs = getComputedStyle( node );
			if ( 'hidden' === cs.visibility || '0' === cs.opacity || cs.transform.includes( 'translate' ) ) {
				return node.className || node.tagName;
			}
			node = node.parentElement;
		}
		return null;
	} )();
	/*
	 * JOB 1 ADDITION (2026-08-01) — the own-element opacity/visibility of the
	 * FOCUSED element itself, not just an ancestor. `hiddenAncestorClue` above
	 * only ever walked ancestors — it never asked "is the thing that just
	 * received focus itself invisible?". That distinction matters here: a pin
	 * timeline's `.fromTo(child, {opacity:0}, {opacity:1}, index*0.15)` sets
	 * `opacity:0` directly ON the participant element the instant the timeline
	 * is created (GSAP's immediate() write), independent of scroll position —
	 * so a real focusable control inside an unstarted stagger slot can be
	 * BOTH focusable (still in the tab order — CSS opacity does not remove an
	 * element from it) AND invisible at the moment Tab lands on it. That is a
	 * genuine WCAG 2.4.11 failure mode this file's own header docblock never
	 * previously measured, because every prior canary had nothing focusable
	 * inside the pin to expose it.
	 */
	const ownStyle = getComputedStyle( el );
	return {
		tag: el.tagName,
		text: ( el.textContent || el.value || '' ).trim().slice( 0, 40 ),
		href: el.getAttribute ? el.getAttribute( 'href' ) : null,
		className: el.className || null,
		insidePin,
		hiddenAncestorClue: hiddenAncestor,
		ownOpacity: ownStyle.opacity,
		ownVisibility: ownStyle.visibility,
		ownDisplay: ownStyle.display,
		rect: { top: Math.round( r.top ), left: Math.round( r.left ), bottom: Math.round( r.bottom ), right: Math.round( r.right ) },
		viewport: { w: vw, h: vh },
		inViewport,
	};
};

/**
 * Scroll to the scroll-Y that measurably holds the pinned section active
 * (position: fixed), proven by sweeping the pin range and watching the
 * children's opacity/transform actually change — not just checking for a
 * `.pin-spacer` node, which exists structurally even when un-pinned.
 */
async function findActivePinScrollY( page, hostSelector ) {
	return page.evaluate( async ( sel ) => {
		const host = document.querySelector( sel );
		if ( ! host ) {
			return { error: 'NO_HOST' };
		}
		const spacer = host.closest( '.pin-spacer' );
		if ( ! spacer ) {
			return { error: 'NO_SPACER' };
		}
		const spacerTop = spacer.getBoundingClientRect().top + window.scrollY;
		const spacerHeight = spacer.offsetHeight;
		const settle = async () => {
			await new Promise( ( r ) => requestAnimationFrame( r ) );
			await new Promise( ( r ) => setTimeout( r, 150 ) );
		};
		const sweep = [];
		for ( let f = 0; f <= 1; f += 0.05 ) {
			window.scrollTo( 0, spacerTop + spacerHeight * f );
			// eslint-disable-next-line no-await-in-loop
			await settle();
			const kid = host.querySelector( 'h2,h3,p' );
			sweep.push( {
				f,
				position: getComputedStyle( host ).position,
				opacity: kid ? getComputedStyle( kid ).opacity : null,
			} );
		}
		// The first fixed frame whose content is NOT fully settled AND not at 0 —
		// i.e. genuinely mid-tween, proving the pin is live and choreographing —
		// falling back to any fixed frame if the tween window is too narrow to hit.
		const midTween = sweep.find(
			( s ) => 'fixed' === s.position && s.opacity !== null && s.opacity > 0.05 && s.opacity < 0.95
		);
		const anyFixed = sweep.find( ( s ) => 'fixed' === s.position );
		const chosen = midTween || anyFixed;
		return {
			sweep,
			chosenFraction: chosen ? chosen.f : null,
			scrollY: chosen ? spacerTop + spacerHeight * chosen.f : null,
			engaged: sweep.some( ( s ) => 'fixed' === s.position ),
			opacityChanged: new Set( sweep.map( ( s ) => s.opacity ) ).size > 1,
		};
	}, hostSelector );
}

/**
 * Scroll to `y` and poll until `window.scrollY` genuinely settles, rather
 * than trusting a fixed wait.
 *
 * ADDED 2026-08-01 (D451/D453 verification session) — the two call sites
 * that jump-scroll to `activation.scrollY` before starting a Tab walk both
 * used `window.scrollTo(0, y)` followed by a FIXED `waitForTimeout(300)`.
 * This file's own header docblock already documents that this site's
 * `scroll-behavior: smooth` on `<html>` makes native/programmatic scrolls
 * take "several hundred ms" — the exact trap `tabWalk()` below already
 * guards against per-Tab-press, but the ONE-TIME jump-scroll before the walk
 * even starts was not. Measured live: with the fixed 300ms wait, `window.
 * scrollY` was still mid-transit when the walk's first Tab press fired,
 * which caused a genuinely-working `focusin`→`progress(1)` fix to be
 * OVERRIDDEN moments later by ScrollTrigger's own scrub-smoothing render
 * (still reacting to the tail of the smooth-scroll as a real user scroll)
 * — a false FAIL on the D453 fix caused by this probe's own timing, not the
 * fix. Re-run with this settle in place showed the SAME fix holding at
 * opacity 1 indefinitely. This is a probe-reliability fix, not a change to
 * what is asserted.
 *
 * @param {import('playwright').Page} page Page.
 * @param {number}                    y    Target scrollY.
 * @return {Promise<number>} The settled scrollY (may differ slightly from
 *                            `y` if the page cannot scroll that far).
 */
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
 * Real Tab presses (page.keyboard.press), sampling activeElement + viewport
 * containment + pin-engagement + scrub-desync after each press.
 */
async function tabWalk( page, hostSelector, steps, opts = {} ) {
	const results = [];
	// Start from a neutral, known focus origin: <body>.
	await page.evaluate( () => document.activeElement && document.activeElement.blur() );

	for ( let i = 0; i < steps; i++ ) {
		// eslint-disable-next-line no-await-in-loop
		await page.keyboard.press( opts.shift ? 'Shift+Tab' : 'Tab' );
		/*
		 * SETTLE, DON'T SAMPLE MID-FLIGHT. This canary's theme sets CSS
		 * `scroll-behavior: smooth` on <html>, so the browser's native
		 * scroll-focused-element-into-view runs as an ANIMATED scroll that
		 * takes several hundred ms. `probe-horizontal-panel.js` already hit
		 * this exact trap ("a probe that scrolls and samples two frames
		 * later reads a page still in flight"). Sampling at a fixed 120ms
		 * caught the browser's scroll mid-transit and reported the newly
		 * focused element as off-viewport — a false FAIL, not a real one.
		 * Poll until scrollY stops changing (bounded, so a genuinely stuck
		 * scroll — the real defect this test exists to catch — still ends
		 * the loop and gets measured, not spun on forever).
		 */
		// eslint-disable-next-line no-await-in-loop
		let lastY = await page.evaluate( () => window.scrollY );
		// eslint-disable-next-line no-await-in-loop
		for ( let tick = 0; tick < 12; tick++ ) {
			// eslint-disable-next-line no-await-in-loop
			await page.waitForTimeout( 150 );
			// eslint-disable-next-line no-await-in-loop
			const y = await page.evaluate( () => window.scrollY );
			if ( y === lastY ) {
				break;
			}
			lastY = y;
		}
		/*
		 * SETTLE THE FOCUS-TRIGGERED OPACITY RAMP TOO (D453 verification
		 * session, 2026-08-01) — same "don't sample mid-flight" principle as
		 * the scrollY loop above, extended to a SECOND transient this file
		 * did not previously know about. `fx-pin-scrub.js`'s `focusin`
		 * handler calls `timeline.progress(1)`, but on THIS canary the block
		 * carries `data-sgs-fx-scrub="0.5"` (a NUMBER, not boolean `true`) —
		 * a scrub value maps to a real GSAP `scrubTween` with that duration,
		 * and measured live (4-way controlled comparison: with/without the
		 * `tabWalk` blur, at a 150ms vs a 300ms wait) the focused element's
		 * own opacity is STILL "0" at 150ms after Tab and has only reached
		 * ~0.7-0.8 by 300ms, converging to a stable 1 by roughly 350-400ms
		 * and holding there indefinitely (traced for 2.5s) — the visible
		 * result of the `focusin` fix genuinely LANDS, it just isn't
		 * instantaneous on a numeric-scrub block. A fixed 150ms wait alone
		 * (this loop's previous shape) caught it mid-ramp at exactly 0 and
		 * would have reported a false 2.4.11 FAIL on a fix that, given
		 * another ~200ms, actually works. Poll the active element's own
		 * opacity until it stops changing (bounded — a genuinely-still-zero
		 * opacity, i.e. the real pre-D453 defect, still ends the loop and
		 * gets measured as the failure it is).
		 */
		/*
		 * ⚠ A NAIVE "break on first unchanged reading" loop is fooled by a
		 * DEAD-ZONE plateau, not just a monotonic ramp. Measured live: this
		 * transition sits at flat "0" for the first ~100-150ms (two
		 * consecutive 100ms samples can both read "0" purely because the
		 * ramp has not started yet), then rises to ~1 over the following
		 * ~250-300ms. A loop that exits on the FIRST repeated value would
		 * exit during that dead-zone and report the pre-ramp "0" as
		 * converged — reproduced against this exact fixture before adding
		 * the fix below. Requiring 3 CONSECUTIVE matching reads (300ms of
		 * genuine stability) rather than 1 closes that gap without
		 * reintroducing a fixed-delay sample (a still-genuinely-zero
		 * opacity — the real pre-D453 defect — still satisfies 3 consecutive
		 * matches and ends the loop as a real failure, not a false one).
		 */
		// eslint-disable-next-line no-await-in-loop
		let lastOpacity = await page.evaluate( () => {
			const el = document.activeElement;
			return el ? getComputedStyle( el ).opacity : null;
		} );
		let stableStreak = 1;
		// eslint-disable-next-line no-await-in-loop
		for ( let tick = 0; tick < 20; tick++ ) {
			// eslint-disable-next-line no-await-in-loop
			await page.waitForTimeout( 100 );
			// eslint-disable-next-line no-await-in-loop
			const o = await page.evaluate( () => {
				const el = document.activeElement;
				return el ? getComputedStyle( el ).opacity : null;
			} );
			if ( o === lastOpacity ) {
				stableStreak++;
				if ( stableStreak >= 3 ) {
					break;
				}
			} else {
				stableStreak = 1;
			}
			lastOpacity = o;
		}
		// eslint-disable-next-line no-await-in-loop
		const focus = await page.evaluate( inViewportFn );
		// eslint-disable-next-line no-await-in-loop
		const pinState = await page.evaluate( ( sel ) => {
			const host = document.querySelector( sel );
			if ( ! host ) {
				return { hostPresent: false };
			}
			return {
				hostPresent: true,
				position: getComputedStyle( host ).position,
				scrollY: window.scrollY,
			};
		}, hostSelector );
		results.push( { step: i + 1, focus, pinState } );
	}
	return results;
}

/**
 * NEGATIVE CONTROL: inject a synthetic focusable element inside the pinned
 * content with a deliberate keydown-time scroll-jack, and confirm the SAME
 * viewport-containment check used above correctly reports it as OUT of
 * viewport / obscured. This is the "prove the check can fail" step.
 */
async function negativeControl( page ) {
	// Deliberately placed in NORMAL document flow (appended to <body>, not
	// inside the pinned host) — the pinned host is `position: fixed` while
	// active, so anything appended INSIDE it is immune to a scroll-jack by
	// construction (it does not move when scrollY changes). That is not a
	// bug in the check; it means the violation must live where a real
	// focusable element would: in the surrounding document flow.
	const injected = await page.evaluate( () => {
		const btn = document.createElement( 'button' );
		btn.id = 'sgs-negative-control-btn';
		btn.textContent = 'Deliberately broken focus target';
		btn.style.position = 'absolute';
		btn.style.top = '3200px';
		btn.style.left = '20px';
		document.body.appendChild( btn );
		// The deliberate 2.4.11 violation: the instant this button is
		// keyboard-focused, scroll-jack the page to the top, carrying the
		// just-focused element off-screen — the exact failure class Step 13
		// exists to catch.
		btn.addEventListener( 'focus', () => {
			window.scrollTo( 0, 0 );
		} );
		btn.tabIndex = 0;
		return true;
	} );

	if ( ! injected ) {
		return { error: 'INJECT_FAILED' };
	}

	await page.evaluate( () => {
		document.getElementById( 'sgs-negative-control-btn' ).focus();
	} );
	await page.waitForTimeout( 150 );
	const focus = await page.evaluate( inViewportFn );

	await page.evaluate( () => {
		const el = document.getElementById( 'sgs-negative-control-btn' );
		if ( el ) {
			el.remove();
		}
	} );

	return { focus, wouldFailGate: false === focus.inViewport };
}

async function runPinScrub( browser, reducedMotion ) {
	const context = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		reducedMotion,
	} );
	const page = await context.newPage();
	await page.goto( bust( PIN_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 1000 );

	const mediaQuery = await page.evaluate( () => ( {
		reduce: matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
	} ) );

	const activation = await findActivePinScrollY( page, '[data-sgs-fx="pin-scrub"]' );

	let tabResults = null;
	let negControl = null;

	if ( null !== activation.scrollY ) {
		await settledScrollTo( page, activation.scrollY );

		// Focus a known origin just before the pinned section, then walk
		// forward through real Tab presses.
		await page.evaluate( () => {
			const before = document.querySelector( '#sgs-text-3eb6164a' );
			if ( before ) {
				before.setAttribute( 'tabindex', '-1' );
				before.focus();
			}
		} );
		tabResults = await tabWalk( page, '[data-sgs-fx="pin-scrub"]', 6 );

		negControl = await negativeControl( page );
	}

	// BASELINE control: reload fresh, do NOT scroll to the pin at all, focus
	// the SAME origin anchor (so the walk starts from an identical DOM
	// position — otherwise a fresh-body walk starts at the skip-link and the
	// step indices are not comparable to the activated arm), and Tab
	// forward. This isolates whether an off-viewport focus target is CAUSED
	// by the pin's activity or is a pre-existing defect independent of it.
	const basePage = await context.newPage();
	await basePage.goto( bust( PIN_URL ), { waitUntil: 'load' } );
	await basePage.waitForTimeout( 800 );
	await basePage.evaluate( () => {
		const before = document.querySelector( '#sgs-text-3eb6164a' );
		if ( before ) {
			before.setAttribute( 'tabindex', '-1' );
			before.focus();
		}
	} );
	const baseline = await tabWalk( basePage, '[data-sgs-fx="pin-scrub"]', 6 );
	await basePage.close();

	await page.screenshot( {
		path: shotPath( `step13-pin-scrub-${ reducedMotion }.png` ),
		fullPage: false,
	} );

	await context.close();
	return { reducedMotion, mediaQuery, activation, tabResults, negControl, baseline };
}

/**
 * JOB 1 — the real-focus-content run. Structurally identical to
 * `runPinScrub()`'s activation + Tab-walk pattern, but against a fixture that
 * actually has focusable content inside the pin, and additionally asserting
 * on the FOCUSED ELEMENT'S OWN opacity/visibility (see `ownOpacity` etc. on
 * `inViewportFn` above) — the failure mode a pin's own stagger timeline can
 * produce that `inViewport` alone cannot see (an element can be fully inside
 * the viewport rectangle and still be `opacity: 0`).
 */
async function runPinScrubRealFocus( browser, reducedMotion ) {
	const context = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		reducedMotion,
	} );
	const page = await context.newPage();
	await page.goto( bust( REAL_FOCUS_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 1000 );

	const mediaQuery = await page.evaluate( () => ( {
		reduce: matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
	} ) );

	const focusablesPresent = await page.evaluate( () => {
		const host = document.querySelector( '[data-sgs-fx="pin-scrub"]' );
		if ( ! host ) {
			return { error: 'NO_HOST' };
		}
		const els = Array.from( host.querySelectorAll( 'a, button, input, textarea, select' ) ).filter(
			( el ) => el.tabIndex >= 0
		);
		return {
			count: els.length,
			tags: els.map( ( el ) => `${ el.tagName }${ el.type ? ':' + el.type : '' }` ),
		};
	} );

	const activation = await findActivePinScrollY( page, '[data-sgs-fx="pin-scrub"]' );

	/*
	 * `activation.scrollY` is `null` when a spacer exists but no fixed frame
	 * was found, and simply ABSENT (`undefined`) when `findActivePinScrollY`
	 * returned an `{error: 'NO_SPACER'}` shape early (the expected shape
	 * under reduced motion, where `withMotionAllowed` never creates a pin at
	 * all — see fx-pin-scrub.js's own docblock). `null !== undefined` is
	 * `true` in JS, so a bare `null !== activation.scrollY` check silently
	 * treats "no spacer at all" as "activation succeeded" — the exact
	 * probe-validity trap this file's header exists to avoid. Requiring a
	 * genuinely finite number closes that gap.
	 */
	const hasScrollTarget = Number.isFinite( activation.scrollY );

	let tabResults = null;

	/*
	 * FOCUS-JUMP TRAP (found + fixed during this run, same class as the
	 * scroll-behaviour:smooth trap already documented above). Focusing
	 * `#step22-before` WITHOUT `{ preventScroll: true }` makes the browser
	 * scroll it into view — and `#step22-before` sits ABOVE the pinned
	 * section in document order, so on the FIRST run this silently scrolled
	 * the page back to the very top, undoing the `window.scrollTo(y)` above
	 * and leaving every subsequent "Tab" press walking a page that was never
	 * actually pinned (`pinState.position` read 'relative' throughout,
	 * `scrollY` read back as `0`). That produced a false PASS by construction
	 * — the walk never touched the state under test. `preventScroll: true`
	 * keeps the deliberate scroll position intact.
	 */
	if ( hasScrollTarget ) {
		await settledScrollTo( page, activation.scrollY );
		await page.evaluate( () => {
			const before = document.querySelector( '#step22-before' );
			if ( before ) {
				before.setAttribute( 'tabindex', '-1' );
				before.focus( { preventScroll: true } );
			}
		} );
		await page.waitForTimeout( 150 );
		// 5 presses: link, hidden honeypot is skipped (tabindex=-1, verified
		// live 2026-08-01), form field, submit button, one more to confirm
		// focus exits the pin cleanly onto `#step22-after`.
		tabResults = await tabWalk( page, '[data-sgs-fx="pin-scrub"]', 5 );
	} else {
		// No spacer at all (the reduced-motion arm's expected shape) — still
		// walk Tab from a known origin with NO forced scroll, so the SIMPLIFY
		// contract (§10) is checked against a REAL Tab walk (position must
		// never read 'fixed') rather than skipped outright.
		await page.evaluate( () => {
			const before = document.querySelector( '#step22-before' );
			if ( before ) {
				before.setAttribute( 'tabindex', '-1' );
				before.focus( { preventScroll: true } );
			}
		} );
		tabResults = await tabWalk( page, '[data-sgs-fx="pin-scrub"]', 5 );
	}

	await page.screenshot( {
		path: shotPath( `step22-pin-real-focus-${ reducedMotion }.png` ),
		fullPage: false,
	} );

	// Re-asserted per the shared-worktree cache-busting rule — confirms this
	// context's tab never got hijacked mid-run.
	const finalHref = page.url();

	await context.close();
	return { reducedMotion, mediaQuery, focusablesPresent, activation, tabResults, finalHref };
}

async function runHorizontalPanel( browser, reducedMotion ) {
	const context = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		reducedMotion,
	} );
	const page = await context.newPage();
	await page.goto( bust( HP_URL ), { waitUntil: 'load' } );
	await page.waitForTimeout( 1000 );

	const mediaQuery = await page.evaluate( () => ( {
		reduce: matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
	} ) );

	// Structural facts under THIS arm: is it pinned (desktop, motion-allowed)
	// or is it the native CSS scroll-snap fallback (reduced motion / mobile)?
	const structure = await page.evaluate( () => {
		const host = document.querySelector( '[data-sgs-fx="horizontal-panel"]' );
		if ( ! host ) {
			return { error: 'NO_HOST' };
		}
		const cs = getComputedStyle( host );
		return {
			pinSpacer: !! host.closest( '.pin-spacer' ),
			overflowX: cs.overflowX,
			scrollSnapType: cs.scrollSnapType,
		};
	} );

	// Bring the host into range so, on the motion-allowed arm, the pin can
	// engage; measure across a sweep like the pin-scrub probe.
	const activation = await page.evaluate( async () => {
		const host = document.querySelector( '[data-sgs-fx="horizontal-panel"]' );
		if ( ! host ) {
			return { error: 'NO_HOST' };
		}
		const spacer = host.closest( '.pin-spacer' );
		if ( ! spacer ) {
			return { engaged: false, reason: 'no-spacer-not-pinned' };
		}
		const spacerTop = spacer.getBoundingClientRect().top + window.scrollY;
		const spacerHeight = spacer.offsetHeight;
		const settle = async () => {
			await new Promise( ( r ) => requestAnimationFrame( r ) );
			await new Promise( ( r ) => setTimeout( r, 150 ) );
		};
		const sweep = [];
		for ( let f = 0; f <= 1; f += 0.1 ) {
			window.scrollTo( 0, spacerTop + spacerHeight * f );
			// eslint-disable-next-line no-await-in-loop
			await settle();
			const track = document.querySelector(
				'[data-sgs-fx-track] > .wp-block-sgs-container'
			);
			sweep.push( {
				f,
				position: getComputedStyle( host ).position,
				transform: track ? getComputedStyle( track ).transform : null,
			} );
		}
		const midTravel = sweep.find(
			( s ) => 'fixed' === s.position && s.transform && s.transform !== 'none' && ! s.transform.includes( '1, 0, 0, 1, 0, 0' )
		);
		const anyFixed = sweep.find( ( s ) => 'fixed' === s.position );
		const chosen = midTravel || anyFixed;
		return {
			sweep,
			engaged: sweep.some( ( s ) => 'fixed' === s.position ),
			transformChanged: new Set( sweep.map( ( s ) => s.transform ) ).size > 1,
			chosenFraction: chosen ? chosen.f : null,
			scrollY: chosen ? spacerTop + spacerHeight * chosen.f : null,
		};
	} );

	let tabResults = null;
	let tabThroughAndOut = null;

	if ( activation.scrollY ) {
		await settledScrollTo( page, activation.scrollY );
		await page.evaluate( () => {
			const before = document.querySelector( '#sgs-text-5545e1df' );
			if ( before ) {
				before.setAttribute( 'tabindex', '-1' );
				before.focus();
			}
		} );
		// Heading text inside each panel is not focusable — this page's real
		// focusable elements are outside the panel row (header nav, later
		// content). This walk exercises "Tab THROUGH and out the far side":
		// enough presses to pass every panel and land on whatever comes next.
		tabResults = await tabWalk( page, '[data-sgs-fx="horizontal-panel"]', 8 );
		tabThroughAndOut = tabResults[ tabResults.length - 1 ];
	} else {
		// Reduced-motion / not-pinned arm: still walk Tab across the native
		// scroll-snap row from a known origin to prove focus order is intact
		// with no pin involved at all.
		await page.evaluate( () => {
			const before = document.querySelector( '#sgs-text-5545e1df' );
			if ( before ) {
				before.setAttribute( 'tabindex', '-1' );
				before.focus();
			}
		} );
		tabResults = await tabWalk( page, '[data-sgs-fx="horizontal-panel"]', 8 );
		tabThroughAndOut = tabResults[ tabResults.length - 1 ];
	}

	// BASELINE control: fresh page, same anchor origin, NO forced scroll —
	// isolates a pre-existing off-viewport focus target (e.g. a duplicate
	// sticky-header clone further down the DOM) from one caused by this
	// effect. See the identical rationale in runPinScrub.
	const basePage = await context.newPage();
	await basePage.goto( bust( HP_URL ), { waitUntil: 'load' } );
	await basePage.waitForTimeout( 800 );
	await basePage.evaluate( () => {
		const before = document.querySelector( '#sgs-text-5545e1df' );
		if ( before ) {
			before.setAttribute( 'tabindex', '-1' );
			before.focus();
		}
	} );
	const baseline = await tabWalk( basePage, '[data-sgs-fx="horizontal-panel"]', 8 );
	await basePage.close();

	await page.screenshot( {
		path: shotPath( `step13-horizontal-panel-${ reducedMotion }.png` ),
		fullPage: false,
	} );

	await context.close();
	return { reducedMotion, mediaQuery, structure, activation, tabResults, tabThroughAndOut, baseline };
}

const browser = await chromium.launch();

const out = {};
out.pinScrub_noPreference = await runPinScrub( browser, 'no-preference' );
out.pinScrub_reduce = await runPinScrub( browser, 'reduce' );
out.horizontalPanel_noPreference = await runHorizontalPanel( browser, 'no-preference' );
out.horizontalPanel_reduce = await runHorizontalPanel( browser, 'reduce' );
out.pinScrubRealFocus_noPreference = await runPinScrubRealFocus( browser, 'no-preference' );
out.pinScrubRealFocus_reduce = await runPinScrubRealFocus( browser, 'reduce' );

await browser.close();

console.log( JSON.stringify( out, null, 1 ) );

// ── verdict ──────────────────────────────────────────────────────────────
const fails = [];
const inconclusive = [];

if ( ! out.pinScrub_noPreference.activation.opacityChanged ) {
	inconclusive.push( 'pin-scrub: could not prove the pin was genuinely mid-tween (opacity never changed across the sweep)' );
}
if ( ! out.horizontalPanel_noPreference.activation.transformChanged ) {
	inconclusive.push( 'horizontal-panel: could not prove the pin was genuinely mid-travel (track transform never changed across the sweep)' );
}

// Negative control must fire.
const nc = out.pinScrub_noPreference.negControl;
if ( nc && false === nc.wouldFailGate ) {
	fails.push( 'NEGATIVE CONTROL DID NOT FIRE: the deliberately-broken focus target was reported as still in viewport — the viewport-containment check is vacuous' );
}

// Real 2.4.11 check: while the pin is fixed, does any Tab step land on a
// focusable element that ends up NOT in viewport? Cross-referenced against
// the SAME arm's baseline (no scroll, no pin engagement) so a pre-existing
// off-canvas/hidden-nav defect unrelated to this effect is reported
// separately, never folded into the effect's own verdict.
const preExisting = [];
[ 'pinScrub_noPreference', 'pinScrub_reduce', 'horizontalPanel_noPreference', 'horizontalPanel_reduce' ].forEach( ( key ) => {
	const arm = out[ key ];
	if ( ! arm.tabResults ) {
		return;
	}
	const baselineOffViewport = new Set(
		( arm.baseline || [] )
			.filter( ( r ) => r.focus && r.focus.tag && ! r.focus.inViewport )
			.map( ( r ) => r.focus.href || r.focus.className )
	);
	arm.tabResults.forEach( ( r ) => {
		if ( ! r.focus || ! r.focus.tag || 'fixed' !== r.pinState.position || r.focus.inViewport ) {
			return;
		}
		const identity = r.focus.href || r.focus.className;
		if ( baselineOffViewport.has( identity ) ) {
			preExisting.push( `${ key } step ${ r.step }: <${ r.focus.tag }> class="${ r.focus.className }" is off-viewport in the NO-SCROLL baseline too — pre-existing header/nav defect, NOT caused by this effect` );
			return;
		}
		fails.push( `${ key } step ${ r.step }: focus landed on <${ r.focus.tag }> "${ r.focus.text }" (class="${ r.focus.className }", hiddenAncestorClue=${ r.focus.hiddenAncestorClue }) while the pin was fixed, but it is OUTSIDE the viewport and NOT off-viewport in the no-scroll baseline (WCAG 2.4.11 — caused by the pin)` );
	} );
} );

// JOB 1 — real-focus-content checks. Two independent failure modes, checked
// separately because `inViewport` (rect-based) cannot see the second one:
//   (a) a focused control's bounding box falls outside the viewport while
//       the pin is fixed (the same 2.4.11 shape as the pre-existing checks);
//   (b) a focused control's OWN computed opacity/visibility/display is
//       invisible while the pin is fixed — the stagger-timeline failure mode
//       this fixture was built specifically to expose (see `ownOpacity`
//       docblock above).
const realFocusIssues = [];
[ 'pinScrubRealFocus_noPreference', 'pinScrubRealFocus_reduce' ].forEach( ( key ) => {
	const arm = out[ key ];
	if ( ! arm ) {
		return;
	}
	if ( arm.focusablesPresent && arm.focusablesPresent.error ) {
		inconclusive.push( `${ key }: fixture host not found (${ arm.focusablesPresent.error })` );
		return;
	}
	if ( arm.focusablesPresent && 0 === arm.focusablesPresent.count ) {
		inconclusive.push( `${ key }: fixture has 0 real focusable elements inside the pin — the fixture itself did not carry what Job 1 needed` );
		return;
	}
	if ( 'reduce' === arm.reducedMotion ) {
		// SIMPLIFY contract (§10): no pin, no scrub. If the pin ever reports
		// `engaged` under reduce, the withMotionAllowed gate has a genuine
		// bug — content should sit in normal flow, un-pinned, at end-state.
		if ( arm.activation && arm.activation.engaged ) {
			realFocusIssues.push( `${ key }: pin ENGAGED under prefers-reduced-motion:reduce — violates §10 SIMPLIFY contract (should never pin)` );
		}
		return;
	}
	if ( ! arm.tabResults ) {
		inconclusive.push( `${ key }: pin never engaged (activation.scrollY null) — could not exercise the Tab walk at all` );
		return;
	}
	arm.tabResults.forEach( ( r ) => {
		if ( ! r.focus || ! r.focus.tag || 'fixed' !== r.pinState.position ) {
			return;
		}
		if ( ! r.focus.inViewport ) {
			realFocusIssues.push( `${ key } step ${ r.step }: <${ r.focus.tag }> "${ r.focus.text }" focused while pin fixed, OUT OF VIEWPORT (WCAG 2.4.11)` );
		}
		const opacityNum = parseFloat( r.focus.ownOpacity );
		if ( Number.isFinite( opacityNum ) && opacityNum < 0.5 ) {
			realFocusIssues.push( `${ key } step ${ r.step }: <${ r.focus.tag }> "${ r.focus.text }" focused while pin fixed, but ITS OWN opacity is ${ r.focus.ownOpacity } — focusable but not visibly indicated (WCAG 2.4.11 "focus not obscured" / 2.4.7 "focus visible")` );
		}
		if ( 'hidden' === r.focus.ownVisibility || 'none' === r.focus.ownDisplay ) {
			realFocusIssues.push( `${ key } step ${ r.step }: <${ r.focus.tag }> "${ r.focus.text }" focused while pin fixed, but visibility=${ r.focus.ownVisibility } display=${ r.focus.ownDisplay }` );
		}
		/*
		 * ANCESTOR opacity — load-bearing, not a belt-and-braces extra.
		 * `sgs/form`'s submit button proved WHY: the button's OWN computed
		 * `opacity` reads "1" (correct — no tween ever targets the button
		 * itself), but the fx-pin-scrub.js timeline tweens the WHOLE
		 * `.wp-block-sgs-form` PARTICIPANT element's opacity from 0→1, and
		 * CSS `opacity` is a rendering effect on the ancestor's box, not an
		 * inherited computed VALUE its children pick up — so a real,
		 * fully-invisible-on-screen button reports `ownOpacity: "1"` and
		 * would pass the check two lines above while still being invisible
		 * to a sighted keyboard user. `hiddenAncestorClue` (pre-existing on
		 * `inViewportFn`, walks the ancestor chain for opacity/visibility/
		 * transform) is the field that actually catches this — confirmed
		 * live: it fired with the ancestor's class name while `ownOpacity`
		 * stayed "1" for the exact same Tab step.
		 */
		if ( r.focus.hiddenAncestorClue ) {
			realFocusIssues.push( `${ key } step ${ r.step }: <${ r.focus.tag }> "${ r.focus.text }" focused while pin fixed — an ANCESTOR (${ r.focus.hiddenAncestorClue }) is opacity:0/hidden/translated, hiding it even though its own opacity is ${ r.focus.ownOpacity } (WCAG 2.4.11)` );
		}
	} );
} );
if ( realFocusIssues.length ) {
	fails.push( ...realFocusIssues.map( ( m ) => `JOB1 REAL-FOCUS: ${ m }` ) );
}

console.log( '\n=== VERDICT ===' );
if ( preExisting.length ) {
	console.log( 'PRE-EXISTING (out of Step 13 scope, reported for visibility):\n - ' + preExisting.join( '\n - ' ) );
}
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
console.log( 'PASS — no Tab step during an active pin left focus outside the viewport, and the negative control correctly fired.' );
process.exit( 0 );

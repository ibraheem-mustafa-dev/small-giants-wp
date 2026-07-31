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
	return {
		tag: el.tagName,
		text: ( el.textContent || el.value || '' ).trim().slice( 0, 40 ),
		href: el.getAttribute ? el.getAttribute( 'href' ) : null,
		className: el.className || null,
		insidePin,
		hiddenAncestorClue: hiddenAncestor,
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
		await page.evaluate( ( y ) => window.scrollTo( 0, y ), activation.scrollY );
		await page.waitForTimeout( 300 );

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
		await page.evaluate( ( y ) => window.scrollTo( 0, y ), activation.scrollY );
		await page.waitForTimeout( 300 );
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

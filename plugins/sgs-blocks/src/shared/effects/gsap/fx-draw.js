/**
 * Tier G effect — DrawSVG stroke-draw. Spec 38 FR-38-15 / D408.
 *
 * Animates the stroke of SVG shape elements (`path`/`line`/`polyline`/
 * `polygon`/`rect`/`ellipse`/`circle`) from undrawn to fully drawn, either on
 * load, on scroll (scrubbed to the scrollbar), or on hover/focus.
 *
 * THIS MODULE RETIRES VIVUS (D408). `sgs/responsive-logo` is the only current
 * consumer — its `animationStyle` enum (`draw-on-load | hover-redraw |
 * scroll-trigger`) re-backs onto this module unchanged; per D270 there is no
 * `deprecated.js`, so the migration is a runtime swap only. The effect is
 * written generically per Spec 38 §3.4/§4.1 (element scope) so any future
 * SVG-bearing block (`sgs/icon`, `sgs/separator`, `sgs/decorative-image`) can
 * opt in the same way, by carrying `data-sgs-fx="draw"` on its SVG (or a
 * wrapper containing one) — see `collectDrawTargets()` below.
 *
 * FAIL-OPEN (Spec 38 §4.2 / provider.js): an ordinary inline `<svg>` renders
 * its shapes fully stroked with no JS at all — "undrawn" is a JS-APPLIED
 * state (`drawSVG: '0%'` on the tween's FROM), never server-rendered markup.
 * So a page with JS blocked, or a visitor who asked for reduced motion (§10:
 * SIMPLIFY), sees the complete, correctly-drawn graphic — never a stub.
 * `sgs/responsive-logo/render.php` inlines the sanitised SVG server-side
 * precisely so this holds; nothing in this module hides content up front.
 *
 * Reduced motion (§10): SIMPLIFY — no animated stroke, rendered fully drawn.
 * This deliberately UPGRADES Vivus's old reduced-motion arm, which set
 * `duration: 1` (not a real skip — Vivus has no zero/instant duration) and so
 * still ran a barely-visible 1ms draw. Handled structurally by
 * `withMotionAllowed`: `setup` — and therefore the tween that applies
 * `drawSVG: '0%'` in the first place — never runs when
 * `(prefers-reduced-motion: no-preference)` fails to match, so the shapes
 * never leave their natural, fully-drawn state.
 *
 * @package
 */

import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	tierG,
	withMotionAllowed,
	bootEffect,
	resolveTrigger,
	resolveStart,
	resolveScrub,
	resolveEase,
} from '@sgs/motion-provider';

/**
 * Selector for every SVG element DrawSVG can act on. Verified against the
 * installed plugin (`node_modules/gsap/src/DrawSVGPlugin.js`): it reads/writes
 * `stroke-dasharray`/`stroke-dashoffset`, which only apply to elements with an
 * actual stroked outline — `<svg>`, `<g>` and `<text>` are NOT valid targets.
 *
 * @type {string}
 */
const DRAWABLE_SELECTOR =
	'path, line, polyline, polygon, rect, ellipse, circle';

/**
 * Read a numeric fx parameter, falling back when absent or unparseable.
 *
 * Copied from the sibling effect modules rather than shared — see
 * `fx-split-reveal.js` for why: each Tier G effect module is standalone and
 * loaded independently, so a shared four-line util would pull an extra import
 * into every effect for one function.
 *
 * @param {HTMLElement} el       Element carrying the data attributes.
 * @param {string}      name     Attribute suffix (e.g. 'duration').
 * @param {number}      fallback Value when unset or not a number.
 * @return {number} The resolved value.
 */
function numericParam( el, name, fallback ) {
	const raw = el.getAttribute( `data-sgs-fx-${ name }` );
	if ( null === raw || '' === raw.trim() ) {
		return fallback;
	}
	const parsed = parseFloat( raw );
	return Number.isFinite( parsed ) ? parsed : fallback;
}

/**
 * Read a percentage fx attribute (0 to 100), falling back when absent or
 * unparseable.
 *
 * @param {HTMLElement} el       Element carrying the data attributes.
 * @param {string}      name     Attribute suffix (e.g. 'draw-from').
 * @param {number}      fallback Value when unset or not a number.
 * @return {number} The value clamped to 0..100.
 */
function percentParam( el, name, fallback ) {
	const value = numericParam( el, name, fallback );
	return Math.min( 100, Math.max( 0, value ) );
}

/**
 * The DrawSVG from and to values for the authored range and direction.
 *
 * `data-sgs-fx-draw-from` and `-to` are how much of the stroke is drawn at
 * the start and the end of the tween, as percentages of its length (defaults 0
 * and 100, so the stroke draws on). They map straight to DrawSVG's single
 * value form (`'100%'` is the first 100% of the stroke), so `from 100, to 40`
 * undraws to 40%. `data-sgs-fx-draw-direction="reverse"` anchors the visible
 * segment at the stroke's far end instead (`'60% 100%'` is the last 40%), so
 * the stroke draws from its end back towards its start.
 *
 * @param {HTMLElement} el Element carrying the data attributes.
 * @return {{from: string, to: string}} DrawSVG values.
 */
export function drawRange( el ) {
	const from = percentParam( el, 'draw-from', 0 );
	const to = percentParam( el, 'draw-to', 100 );
	if ( 'reverse' === el.getAttribute( 'data-sgs-fx-draw-direction' ) ) {
		return { from: `${ 100 - from }% 100%`, to: `${ 100 - to }% 100%` };
	}
	return { from: `${ from }%`, to: `${ to }%` };
}

/**
 * Bind a paused draw tween to hover and keyboard focus: it plays forward when
 * the pointer enters or focus lands inside `el`, and reverses when both the
 * pointer and focus have left. Reusable for any draw on a part that should
 * redraw on interaction (the logo hover redraw).
 *
 * The caller creates the tween with `paused: true` and `immediateRender:
 * false`, so an element that is never hovered stays as the server rendered it.
 *
 * @param {HTMLElement} el    Element to watch.
 * @param {Object}      tween The paused draw tween.
 * @return {Function} Cleanup that detaches the listeners.
 */
export function bindDrawHover( el, tween ) {
	let pointerInside = false;
	let focusInside = false;

	const settle = () => {
		if ( pointerInside || focusInside ) {
			tween.play();
		} else {
			tween.reverse();
		}
	};
	const onEnter = () => {
		pointerInside = true;
		settle();
	};
	const onLeave = () => {
		pointerInside = false;
		settle();
	};
	const onFocus = () => {
		focusInside = true;
		settle();
	};
	const onBlur = ( event ) => {
		if ( event.relatedTarget && el.contains( event.relatedTarget ) ) {
			return;
		}
		focusInside = false;
		settle();
	};

	el.addEventListener( 'pointerenter', onEnter );
	el.addEventListener( 'pointerleave', onLeave );
	el.addEventListener( 'focusin', onFocus );
	el.addEventListener( 'focusout', onBlur );

	return () => {
		el.removeEventListener( 'pointerenter', onEnter );
		el.removeEventListener( 'pointerleave', onLeave );
		el.removeEventListener( 'focusin', onFocus );
		el.removeEventListener( 'focusout', onBlur );
	};
}

/**
 * Resolve the drawable target(s) for one `data-sgs-fx="draw"` element.
 *
 * `el` itself may be the drawable shape (a single decorative `<svg><path/></svg>`
 * where the fx attribute sits on the path directly), OR a container — the
 * `<svg>` root itself, or a wrapper `<span>` around it, which is how
 * `sgs/responsive-logo/render.php` uses this (the attribute sits on the
 * `.sgs-responsive-logo__svg` wrapper because that markup is authored
 * server-side, while the inlined SVG's own markup comes from a sanitised
 * upload this module must not assume the shape of). Both cases are handled by
 * one lookup: check `el` itself, then search its descendants.
 *
 * @param {HTMLElement} el Element carrying `data-sgs-fx="draw"`.
 * @return {Element[]} Every drawable shape found, deduplicated.
 */
function collectDrawTargets( el ) {
	const targets = new Set();

	if ( 'function' === typeof el.matches && el.matches( DRAWABLE_SELECTOR ) ) {
		targets.add( el );
	}

	el.querySelectorAll( DRAWABLE_SELECTOR ).forEach( ( node ) =>
		targets.add( node )
	);

	return Array.from( targets );
}

/**
 * Initialise one draw element.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="draw"`.
 * @return {Function} Cleanup that kills the tween and its ScrollTrigger.
 */
export function initDraw( el ) {
	return withMotionAllowed( ( gsap ) => {
		const targets = collectDrawTargets( el );

		// Nothing to draw (an SVG with no stroked shapes, or a container whose
		// SVG failed to inline). Fail-open: return no cleanup and leave the
		// element exactly as server-rendered — never throw, never retry.
		if ( ! targets.length ) {
			// The render layer inlines the SVG named by `data-sgs-fx-draw-asset`
			// (a logo or media part); naming one that produced no drawable
			// shape is an authoring fault worth one console line.
			const asset = el.getAttribute( 'data-sgs-fx-draw-asset' );
			if ( asset && asset.trim() ) {
				// eslint-disable-next-line no-console
				console.warn(
					`[sgs-fx-draw] data-sgs-fx-draw-asset "${ asset }" has no drawable shape — draw skipped, element stays as rendered.`,
					el
				);
			}
			return undefined;
		}

		const trigger = resolveTrigger( el );
		const ease = resolveEase(
			el.getAttribute( 'data-sgs-fx-ease' ) || 'power2.inOut'
		);
		const range = drawRange( el );
		const common = {
			drawSVG: range.to,
			duration: numericParam( el, 'duration', 1 ),
			ease,
		};

		let tween;

		/*
		 * `load` and `hover` carry no ScrollTrigger — the draw PLAYS rather than
		 * tracking a scroll position.
		 *
		 * `immediateRender: false` on the hover arm is load-bearing, not
		 * tidiness — see `bindDrawHover`'s docblock above. `fromTo`
		 * renders its FROM state (`drawSVG: '0%'`, undrawn) at once by default,
		 * so a paused hover tween would undraw the graphic the instant it is
		 * created; a visitor who never hovers, or cannot (touch, no pointer),
		 * would be left looking at a blank shape forever. With it, the SVG
		 * stays exactly as it rendered — fully drawn — until something plays
		 * the tween, and hover REPLAYS the draw rather than releasing it.
		 */
		if ( 'scroll' !== trigger ) {
			const isHover = 'hover' === trigger;
			tween = gsap.fromTo(
				targets,
				{ drawSVG: range.from },
				{
					...common,
					paused: isHover,
					immediateRender: ! isHover,
				}
			);

			const unbindHover = isHover
				? bindDrawHover( el, tween )
				: undefined;

			return () => {
				if ( unbindHover ) {
					unbindHover();
				}
				tween.kill();
			};
		}

		// Scroll: scrubbed to the scrollbar, matching Spec 38 §3.4's "DrawSVG —
		// scroll-scrubbed draw needs ScrollTrigger" framing rather than a
		// one-shot reveal-on-entry.
		tween = gsap.fromTo(
			targets,
			{ drawSVG: range.from },
			{
				...common,
				scrollTrigger: {
					trigger: el,
					/*
					 * NO `clearChrome` — this effect never pins, so it keeps its
					 * own default. See resolveStart's docblock: the chrome offset
					 * used to be applied unconditionally, rewriting `top 85%` to
					 * `top top+=93` on any site with a sticky header, which is why
					 * the owner saw the logo finish drawing only once it was
					 * already tucked under the header.
					 *
					 * BOTH ENDS NOW ANCHOR TO THE SAME EDGE (`top`), matching
					 * fx-scrub.js. With the old `bottom 40%` end, the scrub
					 * distance was the element's OWN HEIGHT plus 45% of the
					 * viewport — so the identical logo drew at a completely
					 * different rate depending on how tall its container happened
					 * to be, and a tall SVG's draw could not finish until it was
					 * most of the way off the top of the screen. Anchoring both to
					 * the element's top makes the distance a fixed 45% of the
					 * viewport height regardless of the graphic's size.
					 *
					 * 85% → 40% is deliberately fx-scrub.js's shipped, proven
					 * window rather than a new number: the draw begins as the SVG
					 * clears the bottom edge and completes with it sitting in the
					 * upper-middle of the viewport — well clear of a ~93px header
					 * (~10% of a 900px viewport), so the finished graphic is fully
					 * visible at the moment it finishes.
					 */
					start: resolveStart( el, 'top 85%' ),
					end: el.getAttribute( 'data-sgs-fx-end' ) || 'top 40%',
					scrub: resolveScrub( el ),
				},
			}
		);

		/*
		 * Order matters: kill the ScrollTrigger before the tween, matching
		 * `fx-scrub.js`. The end-state restore on a reduced-motion switch comes
		 * from `context.revert()` in `withMotionAllowed` (which runs before this
		 * cleanup) — these calls only release the scroll listener and pin state
		 * so the instance is garbage-collectable.
		 */
		return () => {
			tween.scrollTrigger?.kill( true, false );
			tween.kill();
		};
	} );
}

// Registering the plugins is load-bearing, not housekeeping — see provider.js.
// Both are registered unconditionally (not just DrawSVG) for the same reason
// `fx-split-reveal.js` registers both of its plugins: this module is
// standalone and must not depend on some other effect module happening to
// load ScrollTrigger first on the same page — an instance using the scroll
// trigger would otherwise silently get an unregistered plugin and its
// `scrollTrigger` config would be ignored, playing on load instead of on
// scroll with no error anywhere.
tierG( DrawSVGPlugin, ScrollTrigger );

bootEffect( 'draw', initDraw );

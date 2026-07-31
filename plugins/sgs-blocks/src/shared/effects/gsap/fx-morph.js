/**
 * Tier G effect — MorphSVG shape morph between prepared path pairs. Spec 38
 * FR-38-16.
 *
 * Morphs one SVG shape into another — the industry-standard "logo draws into
 * a different logo" / "icon reshapes into another icon" flourish. There is no
 * vanilla equivalent: CSS `d: path(...)` transitions require the FROM and TO
 * paths to already share an identical point count and winding order, which is
 * exactly the point-matching problem MorphSVGPlugin exists to solve (§2
 * taxonomy row). Revives parking P-10 — its "requires a paid Club GSAP
 * membership" deferral premise died with the April 2025 Webflow acquisition
 * (see `gsap-morphsvg.js`'s own docblock).
 *
 * ASSET-GATED, NOT A BARE TOGGLE (§3.4, §7). A morph is only possible when the
 * instance carries BOTH matched path assets — the element this effect boots
 * on (the FROM shape, already rendered) and a second element it names as its
 * TO shape. The inspector control does not appear until both are present;
 * this module is the runtime half of that contract and enforces it again at
 * boot, because hand-authored/cloned markup (Spec 38 §11) bypasses the
 * inspector entirely.
 *
 * AUTHORING CONTRACT — what an author (or a cloning pass) must supply, and
 * exactly what happens when they don't:
 *
 *   1. The element carrying `data-sgs-fx="morph"` IS THE FROM SHAPE — a real
 *      SVG shape node (`<path>`, or anything MorphSVGPlugin can
 *      `convertToPath()` itself: `<rect>`/`<circle>`/`<ellipse>`/`<polygon>`/
 *      `<polyline>`/`<line>`) with its own already-visible geometry. This is
 *      NOT a placeholder — it is exactly what renders when the effect never
 *      runs at all: no JS, a blocked script, reduced motion, or the asset
 *      gate below failing all leave this shape showing, unchanged. That is
 *      the "resting/first shape" this module guarantees (FR-38-2 fail-open):
 *      there is no hidden intermediate state a failed script can strand a
 *      visitor in, because nothing is ever hidden by this effect in the
 *      first place.
 *   2. `data-sgs-fx-morph-target="<selector>"` names the TO SHAPE — a second
 *      SVG shape element living anywhere in the document (typically inside
 *      the same `<svg>`, inside a `<defs>` or a `visibility="hidden"`
 *      sibling so it never paints on its own before the tween reads its
 *      geometry). Any valid CSS selector is accepted; `document.querySelector`
 *      resolves it against the whole document, not just the local SVG,
 *      because a cloning pass may place the two shapes in separate markup
 *      regions.
 *   3. The two shapes need roughly MATCHED TOPOLOGY for a clean morph —
 *      similar point count and winding order. MorphSVGPlugin re-samples a
 *      mismatch rather than refusing to run, so a rough difference still
 *      animates; a wildly different vertex count (a 12-point starburst
 *      morphing into a 4-point square) can still produce visible
 *      "travelling" artefacts as the extra points redistribute. This module
 *      cannot validate topology at runtime — it is a design-time authoring
 *      concern the inspector's linked guidance (§7) exists to explain.
 *
 * THE ASSET GATE FAILS SAFE, NEVER LOUD:
 *   - `data-sgs-fx-morph-target` absent or blank → gate not met, no tween is
 *     ever created. Silent — this is the ordinary "morph not configured yet"
 *     state, not an error.
 *   - the selector is invalid CSS (an author typo) → `querySelector` would
 *     throw; caught here so one bad selector cannot take down every other fx
 *     effect booting on the same page. Logged via `console.warn` so it stays
 *     legible to whoever built the page, without being visible to a visitor.
 *   - the selector is valid but matches nothing in the current DOM →
 *     `console.warn`, no tween.
 *   - the matched element has no usable shape geometry (no `d` and not a
 *     shape MorphSVGPlugin can auto-convert) → `console.warn`, no tween.
 * In every failing case `initMorph` returns `undefined` before
 * `withMotionAllowed` ever runs — the FROM element is left exactly as
 * server-rendered. There is no partial setup to unwind, because none ever
 * started (never a half-morphed shape).
 *
 * Reduced motion (§10): **SUPPRESS** — final shape only, no morph ever. This
 * needs no special-case branch: "final shape" IS the FROM element's own
 * already-rendered geometry, identical to the missing-asset case above, so
 * routing through the same `withMotionAllowed` gate every other effect uses
 * is sufficient. When `(prefers-reduced-motion: no-preference)` fails to
 * match, `setup` — and therefore the tween — is simply never created.
 *
 * @package
 */

import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import {
	tierG,
	withMotionAllowed,
	bootEffect,
	resolveTrigger,
	bindHoverReplay,
} from '@sgs/motion-provider';

/**
 * Read a numeric fx parameter, falling back when absent or unparseable.
 *
 * Copied rather than shared — Spec 38 effect modules are deliberately
 * standalone (each is its own registered script module, loaded only on pages
 * that use it), so a shared util here would pull an extra import graph into
 * every effect for one four-line function. Mirrors `fx-scrub.js` /
 * `fx-split-reveal.js` / `fx-scramble.js`.
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
 * Shape tag names MorphSVGPlugin can `convertToPath()` itself, in addition to
 * a plain `<path>` carrying a `d` attribute directly (verified against the
 * installed `node_modules/gsap/MorphSVGPlugin.js` `convertToPath` export,
 * which the plugin calls internally on a non-path target).
 *
 * @type {string[]}
 */
const CONVERTIBLE_SHAPE_TAGS = [
	'rect',
	'circle',
	'ellipse',
	'polygon',
	'polyline',
	'line',
];

/**
 * Resolve this instance's morph target — the asset gate described in the
 * file docblock. Returns the TO shape element only when every part of the
 * contract is satisfied; otherwise warns (where there is something concrete
 * to warn about) and returns `null` so the caller can fail safe.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="morph"`.
 * @return {Element|null} The resolved TO shape, or `null` when the gate fails.
 */
function resolveMorphTarget( el ) {
	const selector = el.getAttribute( 'data-sgs-fx-morph-target' );
	if ( ! selector || ! selector.trim() ) {
		// Ordinary "not configured yet" state — no asset named at all is not
		// an authoring mistake worth a console warning, just an unmet gate.
		return null;
	}

	let target;
	try {
		target = document.querySelector( selector.trim() );
	} catch ( err ) {
		// An invalid selector (author typo) must not throw and abort every
		// other fx effect's boot on this page — bootEffect() maps init()
		// over every matching element with no per-element try/catch of its
		// own.
		// eslint-disable-next-line no-console
		console.warn(
			`[sgs-fx-morph] invalid data-sgs-fx-morph-target selector "${ selector }" — morph skipped, element stays at its rendered shape.`,
			el,
			err
		);
		return null;
	}

	if ( ! target ) {
		// eslint-disable-next-line no-console
		console.warn(
			`[sgs-fx-morph] data-sgs-fx-morph-target "${ selector }" matched no element — morph skipped, element stays at its rendered shape.`,
			el
		);
		return null;
	}

	const tag = target.tagName ? target.tagName.toLowerCase() : '';
	const hasUsableGeometry =
		target.hasAttribute( 'd' ) || CONVERTIBLE_SHAPE_TAGS.includes( tag );

	if ( ! hasUsableGeometry ) {
		// eslint-disable-next-line no-console
		console.warn(
			'[sgs-fx-morph] data-sgs-fx-morph-target resolved to an element with no usable shape geometry (no `d`, not a convertible SVG shape) — morph skipped, element stays at its rendered shape.',
			target
		);
		return null;
	}

	return target;
}

/**
 * Initialise one morphing element.
 *
 * The asset gate runs BEFORE `withMotionAllowed`, deliberately: a missing
 * asset is a configuration state, not a motion preference, so it must skip
 * setup regardless of the visitor's reduced-motion setting rather than only
 * mattering once motion is allowed.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="morph"`.
 * @return {Function|undefined} Cleanup that kills the tween, or `undefined`
 *                              when the asset gate is not met (nothing to
 *                              clean up because nothing was set up).
 */
export function initMorph( el ) {
	const target = resolveMorphTarget( el );
	if ( ! target ) {
		return undefined;
	}

	return withMotionAllowed( ( gsap ) => {
		const trigger = resolveTrigger( el );

		const common = {
			// MorphSVGPlugin accepts the target element directly (as well as
			// a selector string or raw path data) — passing the already
			//-resolved element avoids a second, redundant DOM lookup inside
			// the plugin.
			morphSVG: target,
			duration: numericParam( el, 'duration', 0.8 ),
			ease: el.getAttribute( 'data-sgs-fx-ease' ) || 'power2.inOut',
		};

		let tween;
		let observer;

		if ( 'scroll' !== trigger ) {
			/*
			 * `load` and `hover` play the morph rather than tying it to a
			 * scroll position. `immediateRender: false` is stated explicitly
			 * per house convention (see `bindHoverReplay` in provider.js and
			 * its use in `fx-scramble.js`) even though a `to()` tween does
			 * not render its start state on creation by default — asserting
			 * the safety here is deliberate, not relied on as an implicit
			 * default the next edit could change.
			 */
			const isHover = 'hover' === trigger;
			tween = gsap.to( el, {
				...common,
				paused: isHover,
				immediateRender: false,
			} );
		} else {
			/*
			 * `scroll` plays the morph once, the first time the shape enters
			 * view — this effect never scrubs (§2 taxonomy row: MorphSVG has
			 * no scrub column; the FR-38-16 spec text describes a one-shot
			 * "morph between prepared path pairs", not a scroll-tied
			 * progress). It deliberately does NOT use ScrollTrigger: this
			 * module's registered dependency graph
			 * (`class-sgs-motion-registry.php` → `@sgs/fx-morph` deps =
			 * motion-provider + gsap-morphsvg only, no
			 * `@sgs/gsap-scrolltrigger`) does not include it, and importing
			 * it here anyway would work via the webpack import-map but ship
			 * an under-declared, undeclared-and-slower fetch — the exact
			 * failure mode `split-reveal`'s dependency row was corrected for
			 * (see that file's history). A native `IntersectionObserver`
			 * gives one-shot entry detection for free, with no extra plugin
			 * weight on a page that only ever needs "played once on scroll
			 * into view".
			 */
			tween = gsap.to( el, {
				...common,
				paused: true,
				immediateRender: false,
			} );

			observer = new window.IntersectionObserver(
				( entries ) => {
					entries.forEach( ( entry ) => {
						if ( entry.isIntersecting ) {
							tween.play();
							observer.unobserve( el );
						}
					} );
				},
				// Fires a little before the shape is fully in view, roughly
				// matching the `'top 85%'` default the ScrollTrigger-based
				// siblings use for their own scroll-triggered arms.
				{ rootMargin: '0px 0px -15% 0px' }
			);
			observer.observe( el );
		}

		const unbindHover =
			'hover' === trigger ? bindHoverReplay( el, tween ) : undefined;

		return () => {
			if ( unbindHover ) {
				unbindHover();
			}
			if ( observer ) {
				observer.disconnect();
			}
			tween.kill();
		};
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( MorphSVGPlugin );

bootEffect( 'morph', initMorph );

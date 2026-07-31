/**
 * Tier G effect — scroll-scrubbed MotionPath travel. Spec 38 FR-38-17.
 *
 * Ties an element's position along a prepared SVG path to scroll progress —
 * "the decorative image floats along this curve as you scroll past it".
 *
 * BOUNDARY WITH TIER V (§1.3, §3.4) — do not widen this without amending the
 * spec. FR-38-17 splits MotionPath into two tiers on ONE axis: is the travel
 * tied to scroll, or does it run on its own?
 *   - Autonomous, looping path travel (no scroll relationship — "this image
 *     just drifts along its curve forever") is Tier V: CSS `offset-path` /
 *     `offset-distance` is well-supported and needs no JS plugin at all.
 *   - Scroll-SCRUBBED path progress — this module — is Tier G, because
 *     mapping arbitrary path progress to a scroll position is not something
 *     `offset-path` can express; `offset-distance` has no scroll-linked
 *     variant in CSS today.
 * This module implements ONLY the scroll-scrubbed half. It is not a general
 * "move things along paths" utility, and it must not grow a `load`/`hover`
 * arm that plays the travel once — that would be re-inventing the Tier V
 * case inside Tier G, exactly the "doctrine ratchets toward the cheaper
 * tier, never away from it" rule this boundary exists to enforce (§1.3).
 * `sgs/decorative-image` — FR-38-17's named consumer — currently ships NO
 * `offset-path` CSS of its own (verified against its `style.css`/`view.js`,
 * 2026-07-30); building that Tier V variant is explicitly out of scope for
 * this module too — it is a separate, still-open piece of work.
 *
 * Requires a PATH REFERENCE, not a bare toggle. Unlike a pin/scrub timeline
 * (which animates the element's own box), this effect needs a second element
 * — an SVG `<path>` (or another MorphSVGPlugin-convertible shape) whose
 * geometry defines the travel route:
 *
 *   1. The element carrying `data-sgs-fx="motion-path"` is the TRAVELLER —
 *      whatever it already is (an `<img>`, a wrapper `<div>`, an SVG group).
 *      Its OWN server-rendered position is where it sits at scroll progress
 *      0 by default (MotionPathPlugin's `motionPath` config animates x/y as
 *      offsets from the element's current position unless an explicit
 *      `align` target repositions it onto the path — this module DOES pass
 *      `align`, below, so read point 3 before assuming point 0 == the
 *      traveller's rendered position).
 *   2. `data-sgs-fx-motion-path-target="<selector>"` names the PATH — an SVG
 *      shape element anywhere in the document (typically hidden, e.g. inside
 *      a `<defs>` or `visibility="hidden"` sibling, so only the traveller is
 *      ever visibly painted).
 *   3. Because this module passes `align: path` (so the traveller visibly
 *      rides the curve rather than merely being nudged by delta offsets from
 *      wherever it happened to render), progress 0 places the traveller AT
 *      the path's own start point — an author draws the path so its start
 *      coincides with where the traveller should rest before any scroll has
 *      happened. This is the shared "prepared assets must agree with each
 *      other" authoring discipline MorphSVG needs too (`fx-morph.js`), just
 *      expressed spatially instead of topologically.
 *
 * FAILS SAFE when `data-sgs-fx-motion-path-target` is absent, blank, an
 * invalid selector, resolves to nothing, or resolves to an element with no
 * usable shape geometry: no tween is created and `initMotionPath` returns
 * `undefined` before `withMotionAllowed` ever runs. The traveller is left
 * exactly as server-rendered — its own authored position, never a
 * half-travelled offset. A `console.warn` marks the concrete failure cases
 * (invalid selector / no match / no geometry) so it is legible to whoever
 * built the page without being visible to a visitor; a simply-absent
 * attribute is the ordinary "not configured yet" state and warns nothing.
 *
 * Reduced motion (§10): **SUPPRESS** — resting position, matching the
 * existing `sgs/decorative-image` reduced-motion arm. No special-case branch
 * needed: "resting position" IS the traveller's own server-rendered spot,
 * identical to the missing-asset case above, so routing through the same
 * `withMotionAllowed` gate every other effect uses is sufficient — when
 * `(prefers-reduced-motion: no-preference)` fails to match, the tween (and
 * therefore the `align`-driven reposition onto the path) is simply never
 * created.
 *
 * @package
 */

import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	tierG,
	withMotionAllowed,
	bootEffect,
	resolveStart,
	resolveScrub,
} from '@sgs/motion-provider';

/**
 * Shape tag names MorphSVGPlugin/MotionPathPlugin can resolve geometry from
 * directly, in addition to a plain `<path>` carrying a `d` attribute.
 * MotionPathPlugin accepts the same range of SVG shapes MorphSVGPlugin's
 * `convertToPath()` does (verified against the installed
 * `node_modules/gsap/MotionPathPlugin.js`, which shares that conversion path
 * with MorphSVGPlugin). Mirrors `fx-morph.js`'s identical list.
 *
 * @type {string[]}
 */
const PATH_SHAPE_TAGS = [
	'rect',
	'circle',
	'ellipse',
	'polygon',
	'polyline',
	'line',
];

/**
 * Resolve this instance's travel path — the asset the file docblock
 * describes. Returns the path element only when the full contract is
 * satisfied; otherwise warns (where there is something concrete to warn
 * about) and returns `null` so the caller can fail safe.
 *
 * Copied structure from `fx-morph.js`'s `resolveMorphTarget` rather than
 * shared — Spec 38 effect modules are deliberately standalone (each is its
 * own registered script module, loaded only on pages that use it).
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="motion-path"`.
 * @return {Element|null} The resolved path element, or `null` when the gate
 *                         fails.
 */
function resolvePathTarget( el ) {
	const selector = el.getAttribute( 'data-sgs-fx-motion-path-target' );
	if ( ! selector || ! selector.trim() ) {
		return null;
	}

	let target;
	try {
		target = document.querySelector( selector.trim() );
	} catch ( err ) {
		// eslint-disable-next-line no-console
		console.warn(
			`[sgs-fx-motion-path] invalid data-sgs-fx-motion-path-target selector "${ selector }" — motion path skipped, element stays at its rendered position.`,
			el,
			err
		);
		return null;
	}

	if ( ! target ) {
		// eslint-disable-next-line no-console
		console.warn(
			`[sgs-fx-motion-path] data-sgs-fx-motion-path-target "${ selector }" matched no element — motion path skipped, element stays at its rendered position.`,
			el
		);
		return null;
	}

	const tag = target.tagName ? target.tagName.toLowerCase() : '';
	const hasUsableGeometry =
		target.hasAttribute( 'd' ) || PATH_SHAPE_TAGS.includes( tag );

	if ( ! hasUsableGeometry ) {
		// eslint-disable-next-line no-console
		console.warn(
			'[sgs-fx-motion-path] data-sgs-fx-motion-path-target resolved to an element with no usable path geometry (no `d`, not a convertible SVG shape) — motion path skipped, element stays at its rendered position.',
			target
		);
		return null;
	}

	return target;
}

/**
 * Initialise one scroll-scrubbed travelling element.
 *
 * The asset gate runs BEFORE `withMotionAllowed`, deliberately: a missing
 * path is a configuration state, not a motion preference, so it must skip
 * setup regardless of the visitor's reduced-motion setting.
 *
 * There is deliberately no trigger branching here (unlike `fx-scrub.js` /
 * `fx-split-reveal.js` / `fx-morph.js`): this effect key is defined ONLY for
 * the scroll-scrubbed case (§3.4/§1.3 boundary above) — `generated-fx-effect-
 * meta.json`'s `motion-path` row lists `scroll` as its sole trigger, so
 * there is no `load`/`hover` arm to build without reinventing the Tier V
 * autonomous-travel case this module deliberately excludes.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="motion-path"`.
 * @return {Function|undefined} Cleanup that kills the tween and its
 *                              ScrollTrigger, or `undefined` when the path
 *                              asset is not resolvable (nothing to clean up
 *                              because nothing was set up).
 */
export function initMotionPath( el ) {
	const path = resolvePathTarget( el );
	if ( ! path ) {
		return undefined;
	}

	return withMotionAllowed( ( gsap ) => {
		const ease = el.getAttribute( 'data-sgs-fx-ease' ) || 'none';

		const tween = gsap.to( el, {
			motionPath: {
				path,
				// Rides the curve itself rather than being nudged by delta
				// offsets from wherever the traveller happened to render —
				// see authoring contract point 3 in the file docblock.
				align: path,
				alignOrigin: [ 0.5, 0.5 ],
				autoRotate:
					'false' !==
					el.getAttribute( 'data-sgs-fx-motion-path-rotate' ),
				start: 0,
				end: 1,
			},
			// `ease: 'none'` is the correct default for a SCRUBBED tween —
			// progress must map linearly to scroll position, not accelerate/
			// decelerate on its own. An author CAN override via
			// `data-sgs-fx-ease` (§11.2's grammar names it generically, not
			// per-effect), but doing so reintroduces easing on top of
			// scrub-smoothing, which usually reads as lag rather than
			// intentional motion — a deliberate footgun left available
			// rather than blocked, matching this house's "faithful transfer,
			// no injected defaults overriding an authored value" doctrine
			// (provider.js `resolveStart`'s docblock states the same
			// principle for its own attribute).
			ease,
			scrollTrigger: {
				trigger: el,
				// No pinning chrome-offset concern here (motion-path never
				// pins — `generated-fx-effect-meta.json`'s `pins: false`),
				// but `resolveStart` still applies the same authored-value
				// precedence: an explicit `data-sgs-fx-start` always wins,
				// only the module default gets the persistent-chrome offset.
				start: resolveStart( el, 'top bottom' ),
				end: el.getAttribute( 'data-sgs-fx-end' ) || 'bottom top',
				// `scrub: true` locks progress to the scrollbar; a number
				// adds that many seconds of catch-up smoothing (see
				// `resolveScrub`'s own docblock in provider.js for why 0
				// must map to `true`, not to a falsy scrub).
				scrub: resolveScrub( el ),
			},
		} );

		/*
		 * Mirrors `fx-scrub.js`'s cleanup exactly, including WHY the args are
		 * explicit: verified against the installed gsap 3.15.0,
		 * `ScrollTrigger.js:2508` skips `animation.revert()` inside `kill()`
		 * when its `revert` argument is `undefined` (an argument-less call
		 * always is). The actual end-state restore under a mid-session
		 * reduced-motion switch comes from `Context.kill()`'s own
		 * tween-revert pass, which `context.revert()` (in
		 * `withMotionAllowed`) runs BEFORE this returned cleanup is invoked.
		 * This function's job is only to release the ScrollTrigger's scroll
		 * listener so the instance is garbage-collectable — passing explicit
		 * `true`/`false` states that honestly rather than relying on
		 * `kill()`'s undocumented no-arg default.
		 */
		return () => {
			tween.scrollTrigger?.kill( true, false );
			tween.kill();
		};
	} );
}

// Registering both plugins is load-bearing, not housekeeping — see
// provider.js. Both are required: this effect is scroll-scrubbed BY
// DEFINITION (see the file docblock's Tier V/G boundary), so it genuinely
// depends on ScrollTrigger as well as MotionPathPlugin, and must be
// self-sufficient rather than relying on some other effect module happening
// to register ScrollTrigger first on the same page.
tierG( MotionPathPlugin, ScrollTrigger );

bootEffect( 'motion-path', initMotionPath );

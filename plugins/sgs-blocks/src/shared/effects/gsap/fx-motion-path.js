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
 * Reduced motion (§10): **SUPPRESS** — no tween is created, exactly as
 * before (`withMotionAllowed` gates the whole setup below on
 * `(prefers-reduced-motion: no-preference)`; when that fails to match, this
 * module runs no code at all). What changed 2026-08-01 (D441): "resting
 * position" no longer means "wherever the server happened to render it" —
 * it means the CLIENT-CHOSEN resting position (§11.2's `fxPathRest` control),
 * because `assets/css/fx-motion-path.css` applies that unconditionally under
 * `@media (prefers-reduced-motion: reduce)`, keyed off the exact same
 * `data-sgs-fx-motion-path-rest*` attributes this module's normal-motion
 * branch consumes below. One CSS rule serves both branches — this file does
 * NOT need a second reduced-motion code path that could fall out of sync
 * with it, and must not grow one.
 *
 * ── RESTING POSITION HANDOFF (Spec 38 §11.2, D441) ──────────────────────────
 * The `align: path` tween below is UNCHANGED and still rides whatever curve
 * the route resolves to — including whatever the route-box sizing defect
 * documented in `fx-motion-path.css` does to it mid-scrub. What is new is
 * that this module no longer trusts that computation for where the
 * traveller ENDS UP: `scrollTrigger.onLeave` (fires once, when the scrub
 * crosses its end boundary going forward — never per-frame) hands off from
 * the GSAP transform to a plain CSS `position: sticky` rule by (a) clearing
 * the transform GSAP applied and (b) adding a class that activates the
 * `--sgs-fx-motion-path-rest-y` custom property `fx-motion-path.css`
 * resolves declaratively from the client's preset. `scrollTrigger.disable()`
 * stops the tween from re-asserting its own transform on the next scroll
 * tick (it would otherwise fight the CSS handoff, since a scrubbed
 * ScrollTrigger keeps re-rendering at clamped progress 1 on every further
 * scroll event). `onEnterBack` (scrolling back up past the same boundary)
 * reverses the handoff so the return journey rides the curve again.
 *
 * REJECTED: computing a corrective offset in JS (whether via
 * MotionPathPlugin's own `offsetX`/`offsetY`, or via a live
 * `getBoundingClientRect()` clamp) — both re-derive, in JS, a position this
 * module can instead simply DEFER to CSS for. Full reasoning in
 * `fx-motion-path.css`'s docblock, which is the canonical source for this
 * mechanism; this note exists so a reader of THIS file does not have to
 * cross-reference to understand what the `scrollTrigger` callbacks below do.
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
/**
 * The class `fx-motion-path.css`'s handoff rule keys off — see that file's
 * "RESTING POSITION" docblock section and this file's own note above
 * `initMotionPath`.
 *
 * @type {string}
 */
const RESTING_CLASS = 'sgs-fx-motion-path--resting';

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
				/*
				 * NO `clearChrome` — this effect never pins
				 * (`generated-fx-effect-meta.json`'s `pins: false`), so it keeps
				 * its own default. The comment previously here reasoned that the
				 * offset was harmless because there was "no pinning chrome-offset
				 * concern"; that was wrong about the CODE, not just the concern.
				 * `resolveStart` applied the offset to any unauthored default
				 * whenever a sticky header existed, so `top bottom` silently
				 * became `top top+=93` on every real site — see its docblock.
				 *
				 * `top bottom` → `bottom top` IS CORRECT HERE, and deliberately
				 * NOT converted to the same-anchor shape used by fx-draw and
				 * fx-image-sequence. Those two animate a fixed-length thing (a
				 * stroke, a frame count) whose pacing should not depend on the
				 * element's height, so pinning both ends to one edge is right. A
				 * path traversal is the opposite case: the intent is "the
				 * traveller rides the whole curve during the whole time it is on
				 * screen". `top bottom` is the instant the element first appears
				 * at the bottom edge and `bottom top` the instant its last pixel
				 * leaves at the top, so the mixed anchors are not an accident —
				 * they are the only pair that expresses the element's entire
				 * visible life, and the height-dependence they carry is the
				 * intended behaviour rather than the bug it is elsewhere. Making
				 * it same-anchor would end the travel part-way up the screen and
				 * leave the traveller parked at the end of its path for the rest
				 * of the scroll past.
				 *
				 * The chrome offset was especially destructive for exactly this
				 * reason: it deferred the start of a full-traversal effect until
				 * the element was nearly at the top of the viewport, collapsing
				 * a whole-screen journey into its last few pixels.
				 */
				start: resolveStart( el, 'top bottom' ),
				end: el.getAttribute( 'data-sgs-fx-end' ) || 'bottom top',
				// `scrub: true` locks progress to the scrollbar; a number
				// adds that many seconds of catch-up smoothing (see
				// `resolveScrub`'s own docblock in provider.js for why 0
				// must map to `true`, not to a falsy scrub).
				scrub: resolveScrub( el ),
				/*
				 * The resting-position handoff (Spec 38 §11.2, D441) — see
				 * this file's docblock and `fx-motion-path.css`'s "RESTING
				 * POSITION" section for the full reasoning. Both callbacks
				 * fire ONCE per boundary crossing, never per scroll frame.
				 *
				 * `onLeave`: the scrub has completed and scroll has carried
				 * PAST the end boundary. Clear GSAP's transform (so the CSS
				 * rule's `top` is not fighting a stale `translate`), add the
				 * resting class (which activates that CSS rule), and disable
				 * the ScrollTrigger — without this, a scrubbed trigger keeps
				 * re-rendering the tween at clamped progress 1 on every
				 * further scroll tick, which would silently re-apply the
				 * transform we just cleared on the very next tick.
				 * `disable( false )` — `reset: false` — deliberately does
				 * NOT call `self.revert()` or reset progress to 0; it only
				 * stops the trigger responding to scroll, so the tween's
				 * progress stays exactly where it was for a clean resume.
				 */
				onLeave: ( self ) => {
					gsap.set( el, { clearProps: 'transform' } );
					el.classList.add( RESTING_CLASS );
					self.disable( false );
				},
				/*
				 * `onEnterBack`: scrolling back UP past the same boundary.
				 * Hand control back to the tween for the reverse pass —
				 * remove the resting class first so the CSS rule stops
				 * competing for the `transform`/positioning the instant
				 * before the trigger starts rendering again.
				 * `enable( false )` mirrors `disable`'s `reset: false`: keep
				 * the current (~1) progress rather than snapping to 0, so
				 * the re-engaged scrub continues smoothly from where the
				 * visitor re-entered rather than jumping.
				 */
				onEnterBack: ( self ) => {
					el.classList.remove( RESTING_CLASS );
					self.enable( false );
				},
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
			// Drop the resting handoff too — a mid-session reduced-motion
			// switch reverts this tween via `withMotionAllowed`'s context,
			// but that revert only knows about GSAP-owned state; the class
			// this module added itself is this module's own to remove.
			el.classList.remove( RESTING_CLASS );
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

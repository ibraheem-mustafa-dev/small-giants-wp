/**
 * Tier G effect — pin + scrub section timeline. Spec 38 FR-38-6.
 *
 * Pins a section-level container for N viewport-heights of scroll while its
 * children play a curated from/to timeline mapped to scroll progress. This is
 * the "section stays put, content choreographs itself" pattern — distinct
 * from `fx-scrub.js` (FR-38-7), which scrubs a SINGLE element's own opacity/
 * transform against ITS OWN viewport progress and never pins anything.
 *
 * Client-facing controls (§3.1 FR-38-6): pin length, scrub smoothing, and a
 * per-child timeline POSITION built from curated presets — full GSAP timeline
 * authoring is explicitly NOT exposed. This module reads the preset choice
 * off each child via `data-sgs-fx-child-preset`; the inspector side (owned by
 * the block author wiring this module in) writes that attribute from a
 * dropdown, not free text.
 *
 * Child markup contract — REWRITTEN 2026-07-30 after the owner reported the
 * pin working with NOTHING animating inside it. Both halves of the original
 * contract were broken, and either alone was enough to produce that symptom:
 *
 *   1. It required each participant to carry `data-sgs-fx-child`. NOTHING EVER
 *      WROTE THAT ATTRIBUTE — no render.php, no save path, no block attribute,
 *      no inspector control. Verified by grep across src/, includes/ and
 *      theme/ (only this file mentioned it) and on the live canary
 *      (`document.querySelectorAll('[data-sgs-fx-child]').length === 0`). A
 *      read with no writer is the same defect class as `fxTrigger`, and it
 *      failed silently because an empty participant list still builds a valid
 *      timeline — the pin engages, so the effect LOOKS wired.
 *   2. It looked at DIRECT children of the pinned element. `sgs/container`
 *      renders its content inside a wrapper, so `el.children` is a single
 *      `div.wp-block-sgs-container` and every real content block is a
 *      GRANDchild. Measured live: 1 direct child, 3 content blocks inside it.
 *      This is the same wrong-depth mistake that cost the horizontal panel two
 *      passes (`5830985e`) — identifying the right element is not the same
 *      question as being at the right LEVEL.
 *
 * The contract now follows FR-38-6's own wording — "pins ... while its
 * CHILDREN'S tweens play" — rather than an opt-in marker the spec never asks
 * for: participants are the element children of the pinned section's CONTENT
 * WRAPPER. `data-sgs-fx-child` is kept as an optional NARROWING filter: if any
 * descendant carries it, only those participate, so deliberate authoring still
 * wins. Absent (the normal case), everything in the section choreographs,
 * which is what a pin is for.
 *
 * A child with no preset attribute (or an unrecognised one) gets the default
 * `fade-up` preset rather than being silently skipped — the timeline should
 * never render a child that never enters.
 *
 * Reduced motion (§10): SIMPLIFY — no pin, no scrub; content renders at its
 * end-state in normal document flow. Handled structurally by
 * `withMotionAllowed`: the timeline (and the pin) is never created, and every
 * child's SERVER-RENDERED state must already equal its end-state (FR-38-2
 * fail-open) — this module never writes a hidden/offset INITIAL state outside
 * the GSAP tween itself, so with JS blocked or reduced motion active nothing
 * needs reverting.
 *
 * @package SGS\Blocks
 */

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	tierG,
	withMotionAllowed,
	bootEffect,
	resolveStart,
	resolveScrub,
} from '@sgs/motion-provider';

/**
 * Read a numeric fx parameter, falling back when absent or unparseable.
 * Mirrors `fx-scrub.js`'s helper — kept file-local (no shared util module
 * exists for this yet) so each effect module stays independently importable.
 *
 * @param {HTMLElement} el       Element carrying the data attributes.
 * @param {string}      name     Attribute suffix (e.g. 'scrub').
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
 * Read a string fx parameter, falling back when absent/blank.
 *
 * @param {HTMLElement} el       Element carrying the data attributes.
 * @param {string}      name     Attribute suffix (e.g. 'end').
 * @param {string}      fallback Value when unset.
 * @return {string} The resolved value.
 */
function stringParam( el, name, fallback ) {
	const raw = el.getAttribute( `data-sgs-fx-${ name }` );
	return raw && raw.trim() ? raw.trim() : fallback;
}

/**
 * Curated from/to presets a child's entrance can use. Deliberately small and
 * closed — §3.1 says presets, not authoring, so this list is the inspector's
 * entire vocabulary, not a starting point to extend ad hoc per block.
 *
 * @type {Object<string, {from: Object, to: Object}>}
 */
const CHILD_PRESETS = {
	'fade-up': { from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 } },
	'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
	'slide-left': { from: { opacity: 0, x: 60 }, to: { opacity: 1, x: 0 } },
	'slide-right': { from: { opacity: 0, x: -60 }, to: { opacity: 1, x: 0 } },
	'scale-in': { from: { opacity: 0, scale: 0.85 }, to: { opacity: 1, scale: 1 } },
};

/**
 * Resolve a child's chosen preset, defaulting to `fade-up` for an absent or
 * unrecognised value — see the child-markup contract note above for why this
 * defaults rather than skips.
 *
 * @param {HTMLElement} child The participating child element.
 * @return {{from: Object, to: Object}} The preset's from/to tween targets.
 */
function resolveChildPreset( child ) {
	const requested = child.getAttribute( 'data-sgs-fx-child-preset' );
	return CHILD_PRESETS[ requested ] || CHILD_PRESETS[ 'fade-up' ];
}

/**
 * How much of the pin is spent holding the finished state, per `data-sgs-fx-hold`.
 *
 * Expressed as a FRACTION OF THE PIN rather than a pixel figure, so it scales
 * with whatever pin length the client chose: doubling "how long it stays stuck"
 * doubles the pause too, instead of leaving a fixed dwell that feels
 * proportionally shorter the longer the section holds.
 *
 * `0.33` is the default (Bean, 2026-07-30) — with the shipped one-screen pin
 * that is ~270px of scrolling with everything settled, about three wheel
 * notches. The previous behaviour was ~100px, which is where the report
 * "you have to scroll to an exact point" came from.
 *
 * @type {Object<string, number>}
 */
const HOLD_FRACTIONS = {
	none: 0,
	short: 0.15,
	standard: 0.33,
	long: 0.5,
};

/**
 * Resolve the hold fraction, defaulting to `standard`.
 *
 * @param {HTMLElement} el Element carrying the fx attributes.
 * @return {number} Fraction of the pin spent holding, 0 to <1.
 */
function resolveHoldFraction( el ) {
	const raw = ( el.getAttribute( 'data-sgs-fx-hold' ) || '' ).trim();
	const fraction = HOLD_FRACTIONS[ raw ];
	// An unset or unrecognised value takes the default rather than 0 — a
	// missing attribute must not silently mean "no pause", which is the
	// behaviour that was reported as wrong.
	return undefined === fraction ? HOLD_FRACTIONS.standard : fraction;
}

/**
 * Keep only nodes that are elements AND actually occupy a layout box.
 *
 * Spec 32's no-inline contract has each styled container PREPEND a scoped
 * `<style>` as a preceding SIBLING of its element, and the content of a pinned
 * section is typically a stack of such blocks. On the live frontend those tags
 * are lifted out to an external stylesheet at `render_block` p99, so they are
 * usually gone by the time this runs — but not in the editor canvas, and not on
 * any page where the lift has not run. A `<style>` node is `display: none`, so
 * tweening it animates nothing while still consuming a stagger slot and
 * shifting every following child's timing.
 *
 * @param {Iterable<Node>} nodes Candidate nodes.
 * @return {HTMLElement[]} Laid-out elements only.
 */
function laidOutElements( nodes ) {
	return Array.from( nodes ).filter(
		( node ) =>
			node.nodeType === 1 &&
			( node.offsetWidth > 0 ||
				node.offsetHeight > 0 ||
				null !== node.offsetParent )
	);
}

/**
 * Resolve which elements play on the pinned section's timeline.
 *
 * Order of preference, and why:
 *
 *  1. Anything carrying `data-sgs-fx-child`, ANYWHERE inside the section. This
 *     is the deliberate-authoring escape hatch — if someone has explicitly
 *     marked participants, honour exactly those. Searched by descendant rather
 *     than direct child because the wrapper depth is not stable (see 2).
 *  2. Otherwise, the element children of the section's CONTENT WRAPPER.
 *     `sgs/container` renders content inside `div.wp-block-sgs-container`,
 *     optionally within a `.sgs-container__inner` band, so the pinned element's
 *     own `children` is that wrapper and never the content.
 *
 *     The unwrap steps through those two FRAMEWORK-OWNED class names only. An
 *     earlier draft of this function descended through any single element child
 *     instead — which is subtly wrong: a section holding one heading would
 *     unwrap past the heading and animate the `<span>` inside it. Matching on
 *     the wrapper classes makes the descent deterministic and stops exactly
 *     where content begins, the same rule `fx-horizontal-panel.js` uses to find
 *     its track.
 *  3. If unwrapping finds nothing, fall back to the section's own laid-out
 *     children rather than returning empty, so a hand-authored section with no
 *     SGS wrapper still animates.
 *
 * @param {HTMLElement} el The pinned section.
 * @return {HTMLElement[]} Participants in DOM order.
 */
function resolveParticipants( el ) {
	const marked = laidOutElements( el.querySelectorAll( '[data-sgs-fx-child]' ) );
	if ( marked.length > 0 ) {
		return marked;
	}

	const WRAPPER_CLASSES = [ 'sgs-container__inner', 'wp-block-sgs-container' ];

	let node = el;
	// Bounded: the two wrapper classes can nest at most a couple of levels, and
	// a bound means malformed markup cannot spin here.
	for ( let depth = 0; depth < 4; depth++ ) {
		const inner = Array.from( node.children ).find(
			( child ) =>
				child.nodeType === 1 &&
				WRAPPER_CLASSES.some( ( cls ) => child.classList.contains( cls ) )
		);
		if ( ! inner ) {
			break;
		}
		node = inner;
	}

	const candidates = laidOutElements( node.children );
	return candidates.length > 0 ? candidates : laidOutElements( el.children );
}

/**
 * Initialise one pinned section.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="pin-scrub"`.
 * @return {Function} Cleanup that kills the timeline, its ScrollTrigger, and
 *                     the pin spacer it created.
 */
export function initPinScrub( el ) {
	return withMotionAllowed( ( gsap ) => {
		const children = resolveParticipants( el );

		/*
		 * No participants means the timeline would pin the section and animate
		 * nothing — which is exactly the defect this module shipped with, and
		 * it is invisible because a pin with an empty timeline still looks
		 * wired. Bail instead, leaving the section in its server-rendered
		 * state, and say why once in the console so the next person sees the
		 * cause rather than a section that mysteriously holds still.
		 */
		if ( 0 === children.length ) {
			// eslint-disable-next-line no-console
			console.warn(
				'[sgs/fx-pin-scrub] No animatable children found — skipping the pin so the section is not held still for nothing.',
				el
			);
			return undefined;
		}

		const timeline = gsap.timeline( {
			scrollTrigger: {
				trigger: el,
				// Clears persistent sticky chrome — see resolveStart() in
				// provider.js. Pinning at a bare 'top top' parks the section
				// under the site header, hiding its top for the whole pin.
				// An author-set data-sgs-fx-start still wins untouched.
				// FUNCTION-based, not a resolved string — load-bearing. ScrollTrigger
				// re-evaluates a function `start` on every refresh, so the
				// offset picks up the header's MEASURED height once
				// header-behaviours/view.js publishes it. Resolving it eagerly
				// captured the pre-JS fallback (80px) instead of the real 93px
				// and left 13px of the section still behind the header.
				// `clearChrome: true` is OPT-IN and this module is one of only two
				// entitled to it (see resolveStart's docblock): it sets `pin: true`
				// below, so the section is genuinely parked at the viewport top and
				// would otherwise sit behind the header for the whole pin.
				start: () =>
					resolveStart( el, 'top top', { clearChrome: true } ),
				// Pin length: how many viewport-heights the section holds
				// still while its children's timeline plays out.
				end: stringParam( el, 'end', '+=100%' ),
				pin: true,
				// `scrub: true` locks progress to the scrollbar; a number
				// adds that many seconds of catch-up smoothing (matches the
				// convention in fx-scrub.js).
				scrub: resolveScrub( el ),
				// Pinning changes document height; a resize (orientation
				// change, dev-tools toggle, webfont swap reflow) must
				// re-measure or the pin range drifts from the real layout.
				invalidateOnRefresh: true,
			},
		} );

		/*
		 * HOLD THE FINISHED STATE BEFORE RELEASING THE PIN.
		 *
		 * Owner-reported 2026-07-30: "it looks like the block unpins and scrolls
		 * up as soon as the bottom line of content finishes its animation, so
		 * we have to scroll to an exact point to see all of the content in
		 * place." Measured on the canary and he was right — the last child
		 * settled at 89% of the pin, leaving ~100px (about one wheel notch) of
		 * scrolling in which the composition was fully assembled.
		 *
		 * There is no GSAP-provided dwell and no industry-standard figure: a
		 * ScrollTrigger pin lasts exactly as long as `end` says, and `scrub`
		 * stretches whatever timeline it is given across that whole distance.
		 * So a hold exists only if the timeline deliberately leaves room for
		 * one — otherwise the last tween finishing IS the pin ending, which is
		 * precisely the defect reported.
		 *
		 * Implemented as trailing DEAD TIME on the timeline rather than by
		 * lengthening `end`. Lengthening the pin would also slow every child's
		 * entrance (scrub maps the whole timeline across the whole pin), which
		 * changes the feel of the choreography to fix its ending. Dead time
		 * leaves the entrances exactly as they were and spends the remainder of
		 * the pin holding the finished state.
		 *
		 * The maths: children occupy D. To make them finish at fraction (1-h)
		 * of the pin, total must be D/(1-h), so the tail is D*h/(1-h).
		 */
		const hold = resolveHoldFraction( el );

		children.forEach( ( child, index ) => {
			const preset = resolveChildPreset( child );
			// `<` overlaps every child's entrance onto the same scrub range
			// rather than chaining them end-to-end — a pin's whole point is
			// that ALL its content is visible and choreographing together,
			// not paging through children one at a time. Position label
			// gives each child a slight stagger inside that shared range.
			timeline.fromTo( child, preset.from, preset.to, index * 0.15 );
		} );

		/*
		 * D453 — KEYBOARD REVEAL. WCAG 2.4.11 / 2.4.7.
		 *
		 * `fromTo` defaults to `immediateRender: true`, so every preset's FROM
		 * state (`opacity: 0` in all five presets) lands the moment this
		 * timeline is BUILT — before any scroll. A visitor tabbing faster than
		 * the scroll-driven stagger therefore lands focus on controls that are
		 * fully focusable and completely invisible.
		 *
		 * Measured live on canary page 2114 (a pinned section containing a real
		 * link, text field and submit button): the link's own opacity was 0, the
		 * field's 0.4, and the button read 1 while its ANCESTOR — the actual
		 * stagger participant — was 0. CSS opacity does not inherit as a
		 * computed value, which is precisely why a per-element check missed it
		 * and an ancestor check caught it.
		 *
		 * Fix: keyboard entry COMPLETES the choreography rather than competing
		 * with it. Content is only ever added, never removed (a hidden control
		 * becoming visible), so this cannot make the visual state worse.
		 *
		 * Why not CSS `:focus-within`: GSAP writes opacity as an INLINE style,
		 * which no stylesheet rule can beat without `!important` — and
		 * `!important` on `opacity` in a render surface is what the cheat-gate
		 * exists to reject.
		 *
		 * Mouse users are unaffected: `focusin` does not fire on scroll, and a
		 * subsequent scroll re-drives the scrubbed timeline normally.
		 */
		const revealForKeyboard = () => {
			if ( timeline.progress() < 1 ) {
				timeline.progress( 1 );
			}
		};
		el.addEventListener( 'focusin', revealForKeyboard );

		/*
		 * Trailing dead time — the hold. Appended AFTER the children so
		 * `timeline.duration()` reads their real extent, and guarded on
		 * `hold < 1` so a bad value can never divide by zero or demand an
		 * infinite tail.
		 *
		 * `.to( {}, ... )` on a throwaway object is GSAP's idiom for empty
		 * timeline time: it animates nothing, touches no DOM, and simply
		 * extends the duration that `scrub` maps across the pin.
		 */
		const childrenDuration = timeline.duration();
		if ( hold > 0 && hold < 1 && childrenDuration > 0 ) {
			timeline.to( {}, { duration: ( childrenDuration * hold ) / ( 1 - hold ) } );
		}

		/*
		 * Returned to the matchMedia context, so a mid-session switch to
		 * reduced motion reverts every child to its rendered end-state and
		 * un-pins the section rather than freezing it mid-scrub.
		 *
		 * ⚠ The end-state restore does NOT come from this .kill() call.
		 * Verified against the installed source (gsap 3.15.0):
		 * ScrollTrigger.js:2508 skips animation.revert() inside kill() when
		 * its `revert` argument is undefined, which an argument-less call
		 * always is. The actual restore comes from Context.kill()'s own
		 * tween-revert pass (gsap.js:3722), which context.revert() (in
		 * withMotionAllowed, above) runs BEFORE any cleanup this function
		 * returns is invoked (gsap.js:3742). This function's job is only to
		 * release the ScrollTrigger's scroll listener and pin state so the
		 * instance is garbage-collectable (gold-standard item 13) — not to
		 * revert anything. Passing explicit args makes that honest: true
		 * for revert costs nothing (the context already reverted the timeline)
		 * and removes the dependency on kill()'s undocumented no-arg
		 * default; false for allowAnimation matches the explicit
		 * timeline.kill() call below it, so the timeline is killed exactly
		 * once.
		 */
		return () => {
			// D453 — paired with the `focusin` listener added above the hold
			// block. Removed here rather than relying on the element being
			// discarded: a mid-session switch to reduced motion reverts the
			// timeline while the element STAYS in the document, so a listener
			// left bound would keep calling `progress()` on a killed timeline.
			el.removeEventListener( 'focusin', revealForKeyboard );
			timeline.scrollTrigger?.kill( true, false );
			timeline.kill();
		};
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( ScrollTrigger );

bootEffect( 'pin-scrub', initPinScrub );

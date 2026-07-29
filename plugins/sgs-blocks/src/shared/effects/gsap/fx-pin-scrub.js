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
 * Child markup contract (REASONED, not spec-literal — flag for the caller):
 * §3.1 says "per-child timeline position (simple from/to presets)" but does
 * not define the DOM convention for identifying which children participate.
 * This module treats any DIRECT child of the pinned element carrying
 * `data-sgs-fx-child` as a timeline participant, animated in DOM order. A
 * child with no preset attribute (or an unrecognised one) gets the default
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
 * Initialise one pinned section.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="pin-scrub"`.
 * @return {Function} Cleanup that kills the timeline, its ScrollTrigger, and
 *                     the pin spacer it created.
 */
export function initPinScrub( el ) {
	return withMotionAllowed( ( gsap ) => {
		const children = Array.from( el.children ).filter( ( child ) =>
			child.hasAttribute( 'data-sgs-fx-child' )
		);

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
				start: () => resolveStart( el, 'top top' ),
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

		children.forEach( ( child, index ) => {
			const preset = resolveChildPreset( child );
			// `<` overlaps every child's entrance onto the same scrub range
			// rather than chaining them end-to-end — a pin's whole point is
			// that ALL its content is visible and choreographing together,
			// not paging through children one at a time. Position label
			// gives each child a slight stagger inside that shared range.
			timeline.fromTo( child, preset.from, preset.to, index * 0.15 );
		} );

		// Returned to the matchMedia context, so a mid-session switch to
		// reduced motion reverts every child to its rendered end-state and
		// un-pins the section rather than freezing it mid-scrub.
		return () => {
			timeline.scrollTrigger?.kill();
			timeline.kill();
		};
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( ScrollTrigger );

bootEffect( 'pin-scrub', initPinScrub );

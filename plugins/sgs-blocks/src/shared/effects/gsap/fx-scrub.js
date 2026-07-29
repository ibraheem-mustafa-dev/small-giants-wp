/**
 * Tier G effect — scroll-scrubbed element timeline. Spec 38 FR-38-7.
 *
 * Ties an element's own transform/opacity to its progress through the
 * viewport, so the motion tracks the scrollbar rather than playing once on
 * entry.
 *
 * BOUNDARY WITH TIER V (§3.1) — do not widen this without amending the spec:
 * a SINGLE-property fade or translate scrub stays vanilla (the existing CSS
 * scroll-driven parallax pattern plus `--sgs-scroll-progress`). Tier G owns
 * this because it is multi-keyframe and needs cross-browser scrub consistency
 * that CSS Scroll-Driven Animations cannot yet give (Safari stable still lacks
 * them). If Safari ships them, §1.3 says this is a candidate to DEMOTE back to
 * Tier V — the doctrine ratchets toward cheap, not toward GSAP.
 *
 * Reduced motion (§10): SIMPLIFY — the element renders at its end state,
 * static. Handled structurally by `withMotionAllowed`: the tween is never
 * created, and the server-rendered markup already IS the end state.
 *
 * @package SGS\Blocks
 */

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { tierG, withMotionAllowed, bootEffect } from '@sgs/motion-provider';

/**
 * Read a numeric fx parameter, falling back when absent or unparseable.
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
 * Initialise one scrubbed element.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="scrub"`.
 * @return {Function} Cleanup that kills this element's tween and trigger.
 */
export function initScrub( el ) {
	return withMotionAllowed( ( gsap ) => {
		const tween = gsap.fromTo(
			el,
			{ opacity: 0, y: 40 },
			{
				opacity: 1,
				y: 0,
				ease: el.getAttribute( 'data-sgs-fx-ease' ) || 'none',
				scrollTrigger: {
					trigger: el,
					start: el.getAttribute( 'data-sgs-fx-start' ) || 'top 85%',
					end: el.getAttribute( 'data-sgs-fx-end' ) || 'top 40%',
					// `scrub: true` locks progress to the scrollbar; a number
					// adds that many seconds of catch-up smoothing.
					scrub: numericParam( el, 'scrub', 1 ) || true,
				},
			}
		);

		// Returned to the matchMedia context, so a mid-session switch to
		// reduced motion reverts the element to its rendered end state rather
		// than stranding it at whatever opacity the scroll had reached.
		return () => {
			tween.scrollTrigger?.kill();
			tween.kill();
		};
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( ScrollTrigger );

bootEffect( 'scrub', initScrub );

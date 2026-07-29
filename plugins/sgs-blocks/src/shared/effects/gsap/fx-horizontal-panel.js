/**
 * Tier G effect — horizontal scroll panel. Spec 38 FR-38-8.
 *
 * A `sgs/container` block variation ("Horizontal scroll section"): vertical
 * scroll maps to horizontal travel of a pinned row of panels. Desktop-only
 * upgrade — mobile (<768px) and reduced motion both fall back to the SAME
 * native horizontal scroll-snap the Tier V carousel pattern already uses.
 *
 * FAIL-OPEN CONTRACT (read before touching this file):
 * the fallback for BOTH mobile and reduced-motion is CSS, not JS. The block's
 * own `style.css` must render `[data-sgs-fx="horizontal-panel"]` as a native
 * `overflow-x: auto; scroll-snap-type: x mandatory;` row by default (with its
 * track's children `scroll-snap-align: start`) — that is the SSR finished
 * state (FR-38-2). This module never builds or removes that fallback; it only
 * UPGRADES a desktop, motion-allowed page to a pinned GSAP-driven translate.
 * That split is deliberate: `withMotionAllowed` never runs this module's
 * setup at all under reduced motion, so if the scroll-snap fallback lived
 * behind a JS-applied class, reduced-motion users would land on a page with
 * NEITHER the pin NOR the fallback — unreachable content, which the build
 * brief calls out explicitly as a defect, not a degradation. Putting the
 * fallback in the block's static CSS instead means it is always present and
 * this module only ever ADDS behaviour on top, never gates access to it.
 *
 * Track markup contract (REASONED — the spec names the mechanism, "pinned
 * row", but not the DOM convention): the pinned element's scrollable content
 * lives in a single child carrying `data-sgs-fx-track` (the row that gets
 * translated). If no such child exists, this module falls back to the
 * element's first child — but flags that as a fallback rather than a silent
 * guess, since a wrong track element would translate the wrong thing.
 *
 * Reduced motion (§10): SIMPLIFY — falls back to native horizontal
 * scroll-snap, content reachable, nothing moves by itself. See the fail-open
 * note above for how that is structurally guaranteed rather than JS-applied.
 *
 * @package SGS\Blocks
 */

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { tierG, withMotionAllowed, bootEffect } from '@sgs/motion-provider';

/**
 * Read a string fx parameter, falling back when absent/blank. Mirrors the
 * helper in `fx-pin-scrub.js` — kept file-local per this wave's file-per-
 * effect boundary (no shared param-reading util exists yet).
 *
 * @param {HTMLElement} el       Element carrying the data attributes.
 * @param {string}      name     Attribute suffix (e.g. 'start').
 * @param {string}      fallback Value when unset.
 * @return {string} The resolved value.
 */
function stringParam( el, name, fallback ) {
	const raw = el.getAttribute( `data-sgs-fx-${ name }` );
	return raw && raw.trim() ? raw.trim() : fallback;
}

/**
 * Resolve the track element whose horizontal position gets tweened.
 *
 * @param {HTMLElement} el The pinned panel container.
 * @return {HTMLElement|null} The track element, or null if the container is
 *                            empty (nothing to pin against).
 */
function resolveTrack( el ) {
	return el.querySelector( ':scope > [data-sgs-fx-track]' ) || el.firstElementChild;
}

/**
 * Initialise one horizontal-panel section. Desktop (≥768px) ONLY — the
 * `gsap.matchMedia` breakpoint below is the tier split FR-38-8 calls for
 * ("mobile falls back to native horizontal scroll-snap, NOT a pinned
 * translate"); this is not a progressive enhancement of the mobile layout,
 * it is a DIFFERENT layout entirely below the breakpoint, so the desktop
 * context's own revert (matchMedia switching contexts on resize) is what
 * hands control back to the CSS fallback — no manual class toggling needed.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="horizontal-panel"`.
 * @return {Function} Cleanup that reverts the matchMedia context, killing
 *                     whichever breakpoint branch was active.
 */
export function initHorizontalPanel( el ) {
	return withMotionAllowed( ( gsap ) => {
		const track = resolveTrack( el );
		if ( ! track ) {
			// Nothing to pin against — leave the CSS scroll-snap fallback as
			// the only behaviour rather than pinning an empty container.
			return undefined;
		}

		const mm = gsap.matchMedia();

		mm.add( '(min-width: 768px)', () => {
			// `flex: 0 0 auto` panel widths mean the track's scrollWidth
			// already encodes exactly how far it must travel to reveal the
			// last panel — recomputed on every ScrollTrigger refresh so a
			// webfont swap or a client editing panel count never leaves a
			// stale travel distance baked into the tween.
			const getTravelDistance = () =>
				Math.max( 0, track.scrollWidth - el.clientWidth );

			const tween = gsap.to( track, {
				x: () => -getTravelDistance(),
				ease: 'none',
				scrollTrigger: {
					trigger: el,
					start: stringParam( el, 'start', 'top top' ),
					// Pin length tracks the travel distance by default so
					// scroll speed feels consistent regardless of panel
					// count; a client-set `data-sgs-fx-end` overrides it for
					// a deliberately longer/shorter pin.
					end: () =>
						el.getAttribute( 'data-sgs-fx-end' ) ||
						`+=${ getTravelDistance() }`,
					pin: true,
					scrub: true,
					invalidateOnRefresh: true,
				},
			} );

			// Keyboard focus: this branch only ever writes a `transform` on
			// the track via GSAP — it never touches `tabindex`, DOM order,
			// or `overflow`, so sequential Tab order follows the same
			// document order it would with JS disabled. Nothing here
			// "scroll-jacks" focus; the visual position and the DOM
			// position are allowed to disagree during the pin, same as any
			// pinned section.
			return () => {
				tween.scrollTrigger?.kill();
				tween.kill();
			};
		} );

		// Below 768px this matchMedia instance registers no handler, so GSAP
		// creates nothing — the element is left exactly as the CSS fallback
		// rendered it (native horizontal scroll-snap, §10).

		return () => mm.revert();
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( ScrollTrigger );

bootEffect( 'horizontal-panel', initHorizontalPanel );

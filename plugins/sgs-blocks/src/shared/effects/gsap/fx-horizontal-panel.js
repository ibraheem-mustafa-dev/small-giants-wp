/**
 * Tier G effect — horizontal scroll panel. Spec 38 FR-38-8, Spec 38A FR-38A-38, FR-38A-39, FR-38A-50.
 *
 * A pinned row of panels: vertical scroll maps to horizontal travel. It is a desktop upgrade: below the stored
 * breakpoint, and under reduced motion, the section is a native scroll-snap row or a static stack, both CSS.
 *
 * Parameters (`motion.schema.json::HorizontalPanelValues`, read by `horizontal-panel-params.js`): smoothing
 * (`data-sgs-fx-scrub`), ease, hold (the share of the pin spent at rest after the travel), pin length per panel
 * plus a fixed tail (the pin spans `panels × length + tail`; with no stored length it spans the travel distance),
 * breakpoint, below-breakpoint mode, and the outputs of `horizontal-panel-state.js` (progress, active panel,
 * proximity focus). Smoothing, hold, pin length, tail and the focus values can differ per device: they are read at
 * the current tier, and the pin is rebuilt with the new tier's values when the viewport crosses the tablet or mobile
 * breakpoint (`rebuildOnTierChange`).
 *
 * FAIL-OPEN CONTRACT: the fallback for BOTH narrow viewports and reduced motion is CSS, not JS. The stylesheet
 * `assets/css/fx-horizontal-panel.css` renders `[data-sgs-fx~="horizontal-panel"]` as a native
 * `overflow-x: auto; scroll-snap-type: x mandatory;` row by default (the SSR finished state, FR-38-2); this module
 * never builds or removes that fallback, it only UPGRADES a wide, motion-allowed page to a pinned GSAP-driven
 * translate. `withMotionAllowed` never runs this setup under reduced motion, so a fallback living behind a
 * JS-applied class would leave those users with NEITHER the pin NOR the fallback: unreachable content.
 *
 * Track markup contract: the pinned element's row lives in a child carrying `data-sgs-fx-track`
 * (`horizontal-panel-geometry.js`); without one nothing is pinned.
 *
 * KEYBOARD FOCUS: this branch only writes a `transform` on the track; it never touches `tabindex`, DOM order or
 * `overflow`. The host computes `overflow-x: hidden` (the stylesheet's `clip` normalises to it beside the base
 * `overflow-y: hidden`), a real scroll container, so every browser's native focus-time scroll-into-view moves
 * `host.scrollLeft` when Tab lands on a not-yet-travelled panel, with no code here (measured by
 * `scripts/motion-qa/probe-horizontal-panel-focus.mjs`). No focusin handler is added: a second mechanism would
 * compete with the browser's own. See `assets/css/fx-horizontal-panel.css` (D456) before touching its overflow rules.
 *
 * @package
 */

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	tierG,
	withMotionAllowed,
	bootEffect,
	resolveStart,
	resolveEase,
} from '@sgs/motion-provider';
import { readParams, lengthPx } from './horizontal-panel-params.js';
import { rebuildOnTierChange } from './scroll-rows.js';
import {
	resolveTrack,
	layoutPanels,
	travelDistance,
} from './horizontal-panel-geometry.js';
import { createState } from './horizontal-panel-state.js';

/**
 * The scroll lengths of one pin, in pixels for the current viewport.
 *
 * @param {HTMLElement} el     The pinned panel container.
 * @param {HTMLElement} track  The row.
 * @param {Object}      params Parameters from `readParams`.
 * @param {number}      count  Number of panels.
 * @return {{travel: number, total: number, share: number}} `travel` is the scroll spent moving the row, `total` the
 *                                                           whole pin, `share` the fraction of the pin the row moves
 *                                                           over (the rest is the tail and the hold).
 */
function pinLengths( el, track, params, count ) {
	const viewport = window.innerHeight;
	const travel = params.pinLength
		? lengthPx( params.pinLength, viewport ) * count
		: travelDistance( el, track );
	const total = travel + lengthPx( params.pinTail, viewport );
	return {
		travel,
		total,
		share: total > 0 ? ( travel / total ) * ( 1 - params.hold ) : 1,
	};
}

/**
 * Build the pinned travel for one element above its breakpoint.
 *
 * @param {Object}      gsap   The GSAP core.
 * @param {HTMLElement} el     The pinned panel container.
 * @param {HTMLElement} track  The row.
 * @param {Object}      params Parameters from `readParams`.
 * @return {Function|undefined} Cleanup, or undefined when there is nothing to pin.
 */
function pin( gsap, el, track, params ) {
	const panels = layoutPanels( track );
	// Fewer than two panels has no first-to-last distance; the CSS scroll-snap fallback stays the only behaviour.
	if ( panels.length < 2 ) {
		return undefined;
	}
	const state = createState( el, panels, params );
	// A stored ease neither resolveEase nor GSAP understands (an unknown name, a token missing from the page) parses
	// to undefined; the travel then plays linear rather than throwing on every render.
	const curve =
		gsap.parseEase( resolveEase( params.ease || 'none' ) ) ||
		gsap.parseEase( 'none' );
	let lengths = pinLengths( el, track, params, panels.length );
	let tween = null;
	// ScrollTrigger can render the tween (and call onUpdate) while `gsap.to` is still returning.
	const publish = () =>
		tween &&
		state.update(
			lengths.share > 0 ? tween.progress() / lengths.share : 1
		);

	tween = gsap.to( track, {
		x: () => -travelDistance( el, track ),
		// The row moves over `share` of the pin and rests for the rest, so the stored ease shapes the travel only.
		ease: ( progress ) =>
			curve(
				lengths.share > 0 ? Math.min( 1, progress / lengths.share ) : 1
			),
		onUpdate: publish,
		scrollTrigger: {
			trigger: el,
			// FUNCTION-based, not a resolved string: ScrollTrigger re-evaluates it on every refresh, so the offset
			// picks up the sticky header's MEASURED height once header-behaviours/view.js publishes it. `clearChrome`
			// is OPT-IN and this module is one of two entitled to it (see resolveStart's docblock): the row is
			// genuinely parked at the viewport top for the whole pin.
			start: () => resolveStart( el, 'top top', { clearChrome: true } ),
			end: () => {
				lengths = pinLengths( el, track, params, panels.length );
				return `+=${ lengths.total }`;
			},
			pin: true,
			// `true` is no smoothing; a stored smoothing is the seconds the row takes to catch up with the scroll.
			scrub: params.scrub,
			invalidateOnRefresh: true,
			onRefresh: publish,
		},
	} );
	publish();

	return () => {
		tween.scrollTrigger?.kill();
		tween.kill();
		state.clear();
	};
}

/**
 * Initialise one horizontal-panel section.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="horizontal-panel"`.
 * @return {Function} Cleanup that detaches the tier listeners and reverts the matchMedia context, killing whichever
 *                    breakpoint branch was active.
 */
export function initHorizontalPanel( el ) {
	return withMotionAllowed( ( gsap ) => {
		const track = resolveTrack( el );
		if ( ! track ) {
			return undefined;
		}
		const build = () => {
			// Read at the current device tier; a tier change tears this build down and reads again.
			const params = readParams( el );
			const mm = gsap.matchMedia();
			// Below the stored breakpoint this registers no handler, so GSAP creates nothing and the element stays
			// exactly as the stylesheet rendered it: a native scroll-snap row or a static stack.
			mm.add( params.pinQuery, () => pin( gsap, el, track, params ) );
			return () => mm.revert();
		};
		return rebuildOnTierChange( build );
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( ScrollTrigger );

bootEffect( 'horizontal-panel', initHorizontalPanel );

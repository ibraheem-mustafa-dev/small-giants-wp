/**
 * SGS motion — magnet boot module (Spec 38 §3.3, FR-38-30). Tier V.
 *
 * The `@sgs/fx-magnet` script module the PHP motion registry enqueues when a
 * page renders a block carrying `data-sgs-fx="magnet"`. It finds those elements
 * and drives them; the pull itself lives in `magnet.js`, which knows nothing
 * about blocks or WordPress.
 *
 * ── ONE DOCUMENT LISTENER, NOT N ELEMENT LISTENERS ────────────────────────
 *
 * This is the whole reason the boot module is not a two-line `forEach` over
 * `initMagnet`. A magnetic button's defining behaviour is that it reacts while
 * the pointer is still OUTSIDE it — an element-scoped `mousemove` cannot see
 * that, because it only fires once the pointer is already over the element, by
 * which point the effect has nothing left to do.
 *
 * So the driver has to be document-scoped. Attaching one document listener PER
 * MAGNET would then multiply per-frame work by the number of magnets on the
 * page, so instead there is exactly ONE listener here, rAF-throttled once, and
 * each registered magnet's `apply()` runs from that single tick.
 *
 * ── WHAT THIS MODULE DELIBERATELY DOES NOT DO ─────────────────────────────
 *
 * It writes no CSS and applies no marker attribute. `assets/css/fx-magnet.css`
 * owns the transform (Spec 32: JS writes custom-property VALUES only), and the
 * render layer owns `data-sgs-fx`. With JS blocked the element sits exactly
 * where it would without the effect, because `--magnet-x/y` default to 0 —
 * fail-open by construction rather than by a fallback branch (§1.6).
 *
 * @package
 */

import { createMagnet } from './magnet';
import { prefersReducedMotion, rafThrottle, isTouchInput } from './motion-utils';

/** Elements the render layer marked. */
const SELECTOR = '[data-sgs-fx="magnet"]';

/** Fallbacks when an instance declares no value of its own. */
const DEFAULT_RADIUS = 120;
const DEFAULT_STRENGTH = 24;

/** Live magnets, so a bfcache restore can tear down before re-init. */
let magnets = [];

/** The single shared pointer driver, or null when nothing is registered. */
let onPointerMove = null;

/**
 * Read one instance's options off its own attributes.
 *
 * Every value is BOUNDED rather than trusted: a huge radius would make a button
 * react from across the page, and a huge strength would tear it out of its own
 * layout. An absent attribute falls back to the default rather than to zero,
 * because zero is indistinguishable from "the client turned it off".
 *
 * @param {HTMLElement} el The marked element.
 * @return {Object} Options for {@link createMagnet}.
 */
function readOptions( el ) {
	const axis = el.getAttribute( 'data-sgs-fx-magnet-axis' ) || 'both';
	const radius = parseInt(
		el.getAttribute( 'data-sgs-fx-magnet-radius' ),
		10
	);
	const strength = parseInt(
		el.getAttribute( 'data-sgs-fx-magnet-strength' ),
		10
	);
	return {
		axis: [ 'x', 'y', 'both' ].includes( axis ) ? axis : 'both',
		radius: Math.max( 20, Math.min( 400, radius || DEFAULT_RADIUS ) ),
		maxPull: Math.max( 2, Math.min( 80, strength || DEFAULT_STRENGTH ) ),
		// A magnetic button should reach its cap comfortably inside its radius,
		// rather than creeping toward it — 0.15 is nav-menu's subtle label
		// nudge and reads as nothing at button scale.
		factor: 0.35,
	};
}

/**
 * Attach every marked element and start the shared driver.
 *
 * @return {void}
 */
function boot() {
	const els = [ ...document.querySelectorAll( SELECTOR ) ];
	if ( ! els.length ) {
		return;
	}

	// Reduced motion: register nothing and attach no listener. `createMagnet`
	// still runs so the resting value is written, which keeps the element's
	// computed transform identical to the no-JS state (§10 suppress).
	els.forEach( ( el ) => magnets.push( createMagnet( el, readOptions( el ) ) ) );
	if ( prefersReducedMotion() ) {
		return;
	}

	onPointerMove = rafThrottle( ( event ) => {
		if ( isTouchInput() ) {
			return;
		}
		magnets.forEach( ( m ) => m.apply( event.clientX, event.clientY ) );
	} );
	document.addEventListener( 'mousemove', onPointerMove );
}

/**
 * Tear every magnet down and remove the shared listener.
 *
 * @return {void}
 */
function teardown() {
	if ( onPointerMove ) {
		onPointerMove.cancel();
		document.removeEventListener( 'mousemove', onPointerMove );
		onPointerMove = null;
	}
	magnets.forEach( ( m ) => m.destroy() );
	magnets = [];
}

boot();

/*
 * bfcache (§1.6). A back-navigation restores the page from memory WITHOUT
 * re-running module code, so the listener survives but the registered elements
 * may describe a DOM that has since been re-rendered. Tearing down and
 * re-booting on a persisted restore keeps the two in step. On a normal load
 * `persisted` is false and this does nothing.
 */
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );

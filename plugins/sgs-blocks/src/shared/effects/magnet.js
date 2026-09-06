/**
 * SGS shared motion — magnetic pull (Spec 38 §3.3, FR-38-30). Tier V.
 *
 * An element leans toward the pointer. Two consumers, one core:
 *
 *   · `sgs/nav-menu`'s label magnet (Mega-Menu Build Spec §6, row 4) — the
 *     ORIGINAL and still the default: ±8px, HORIZONTAL only, engaging only
 *     while the cursor is over the label's own box.
 *   · the `magnet` fx effect — award-tier magnetic buttons, which differ in
 *     one load-bearing way: the pull engages from a PROXIMITY RADIUS, i.e.
 *     while the pointer is still OUTSIDE the element. That is the whole feel;
 *     an element that only reacts once you are already on it is just a hover.
 *
 * ── WHY TIER V ────────────────────────────────────────────────────────────
 * The 2026-08-02 motion-ecosystem survey reached this independently: magnetic
 * buttons and cursor followers "are commonly ~20-30 lines of vanilla JS
 * (mousemove + rAF + CSS transform) — write it, don't dependency it". GSAP
 * adds nothing §1.3's ratchet would accept.
 *
 * ── TWO ENTRY POINTS, AND WHY ─────────────────────────────────────────────
 *
 *   initMagnet( el, opts? ) -> cleanup
 *     Self-contained: attaches the element's OWN mousemove/mouseleave. This is
 *     the FROZEN contract `sgs/nav-menu` already imports, and with no `opts`
 *     it behaves byte-identically to the version that shipped before proximity
 *     existed. Do not change its default behaviour.
 *
 *   createMagnet( el, opts? ) -> { apply( x, y ), reset(), destroy() }
 *     Driver-agnostic core with NO listeners of its own. Proximity mode needs
 *     pointer positions from OUTSIDE the element, which an element listener
 *     never sees — so `fx-magnet.js` drives every magnet on the page from ONE
 *     shared document listener rather than N per-element ones.
 *
 * CONSUMING CSS ships per consumer (`sgs/nav-menu/style.css`, or
 * `assets/css/fx-magnet.css` for the fx effect). Both read the same pair:
 *   transform: translate( var( --magnet-x, 0px ), var( --magnet-y, 0px ) );
 * Both default to zero, so with no JS the element sits exactly where it would
 * without the effect — a pure enhancement, never load-bearing for reading or
 * activating anything.
 *
 * @package
 */

import {
	prefersReducedMotion,
	rafThrottle,
	isTouchInput,
} from './motion-utils';

/** Nav-menu's shipped defaults. Changing these changes that block. */
const MAX_PULL_PX = 8;
const PULL_FACTOR = 0.15;

/**
 * Clamp a value between a minimum and a maximum.
 *
 * @param {number} value The value to clamp.
 * @param {number} min   The minimum.
 * @param {number} max   The maximum.
 * @return {number} The clamped value.
 */
function clamp( value, min, max ) {
	return Math.min( max, Math.max( min, value ) );
}

/**
 * Shortest distance from a point to a rectangle. Zero when the point is inside.
 *
 * Deliberately measured to the BOX, not to the centre: distance-to-centre makes
 * a wide element engage late at its ends, because the far end of a 300px button
 * is 150px from its own centre before the pointer is anywhere near it.
 *
 * @param {DOMRect} rect The element's box.
 * @param {number}  x    Pointer clientX.
 * @param {number}  y    Pointer clientY.
 * @return {number} Distance in px, 0 when inside.
 */
function distanceToRect( rect, x, y ) {
	const dx = Math.max( rect.left - x, 0, x - rect.right );
	const dy = Math.max( rect.top - y, 0, y - rect.bottom );
	return Math.hypot( dx, dy );
}

/**
 * The driver-agnostic core. Attaches NO listeners.
 *
 * @param {HTMLElement} el             The element to nudge.
 * @param {Object}      [opts]         Options.
 * @param {string}      [opts.axis]    'x' (default) | 'y' | 'both'.
 * @param {number}      [opts.radius]  Proximity radius in px. 0/absent = engage
 *                                     only while the pointer is over the box.
 * @param {number}      [opts.maxPull] Max displacement in px.
 * @param {number}      [opts.factor]  Fraction of the offset applied.
 * @return {{apply: Function, reset: Function, destroy: Function}} The driver.
 */
export function createMagnet( el, opts = {} ) {
	const axis = opts.axis || 'x';
	const radius = Number( opts.radius ) || 0;
	const maxPull = Number( opts.maxPull ) || MAX_PULL_PX;
	const factor = Number( opts.factor ) || PULL_FACTOR;

	const write = ( x, y ) => {
		el.style.setProperty( '--magnet-x', x.toFixed( 2 ) + 'px' );
		el.style.setProperty( '--magnet-y', y.toFixed( 2 ) + 'px' );
	};

	const reset = () => write( 0, 0 );

	// Resting position written up front, so the element sits at its natural
	// spot until (and unless) the pointer engages it.
	reset();

	const apply = ( clientX, clientY ) => {
		// Reactive touch gate (NOT a one-time device check): a hybrid
		// trackpad+touchscreen device can switch pointer types mid-session,
		// and some browsers fire synthetic mousemove after a tap — both would
		// otherwise leave the element stuck off-centre with no real cursor to
		// release it.
		if ( isTouchInput() ) {
			return;
		}
		const rect = el.getBoundingClientRect();
		if ( 0 === rect.width ) {
			return;
		}

		// Proximity mode falls off to nothing at the radius edge, so the
		// element eases back rather than snapping when the pointer leaves
		// range. With no radius this is the original always-on behaviour and
		// the caller only calls apply() while the pointer is over the element.
		let strength = 1;
		if ( radius > 0 ) {
			const distance = distanceToRect( rect, clientX, clientY );
			if ( distance > radius ) {
				reset();
				return;
			}
			strength = 1 - distance / radius;
		}

		const centreX = rect.left + rect.width / 2;
		const centreY = rect.top + rect.height / 2;
		const pullX =
			'y' === axis
				? 0
				: clamp(
						( clientX - centreX ) * factor * strength,
						-maxPull,
						maxPull
				  );
		const pullY =
			'x' === axis
				? 0
				: clamp(
						( clientY - centreY ) * factor * strength,
						-maxPull,
						maxPull
				  );
		write( pullX, pullY );
	};

	return {
		apply,
		reset,
		destroy: () => {
			el.style.removeProperty( '--magnet-x' );
			el.style.removeProperty( '--magnet-y' );
		},
	};
}

/**
 * Attach the magnet effect to one element, with its own listeners.
 *
 * FROZEN CONTRACT — `sgs/nav-menu` imports this and calls it with no options.
 * With no options the behaviour is byte-identical to the pre-proximity version.
 *
 * @param {HTMLElement} el     The element to nudge toward the cursor.
 * @param {Object}      [opts] Passed through to {@link createMagnet}.
 * @return {Function} Cleanup — removes the listeners. Safe on a
 *                     detached/empty element.
 */
export function initMagnet( el, opts = {} ) {
	if ( ! el || typeof el.addEventListener !== 'function' ) {
		return () => {};
	}

	const magnet = createMagnet( el, opts );

	// Reduced motion: the effect is off entirely — no listeners attached, no
	// displacement ever applied. The resting write above already ran, so the
	// element sits at its natural position.
	if ( prefersReducedMotion() ) {
		return () => {};
	}

	const handleMove = rafThrottle( ( event ) =>
		magnet.apply( event.clientX, event.clientY )
	);
	const handleLeave = () => magnet.reset();

	// Belt-and-braces: a touch tap that fires pointerdown resets immediately,
	// rather than waiting for a mousemove that gates itself out.
	const handlePointerDown = ( event ) => {
		if ( 'touch' === event.pointerType ) {
			handleLeave();
		}
	};

	el.addEventListener( 'mousemove', handleMove );
	el.addEventListener( 'mouseleave', handleLeave );
	el.addEventListener( 'pointerdown', handlePointerDown );

	return () => {
		handleMove.cancel();
		el.removeEventListener( 'mousemove', handleMove );
		el.removeEventListener( 'mouseleave', handleLeave );
		el.removeEventListener( 'pointerdown', handlePointerDown );
	};
}

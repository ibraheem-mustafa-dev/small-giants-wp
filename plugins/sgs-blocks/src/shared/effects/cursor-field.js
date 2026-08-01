/**
 * SGS shared motion — cursor-reactive FIELD emitter (Spec 38 §3.3, FR-38-25).
 *
 * WHAT THIS IS. A block's background carries a soft field that follows the
 * pointer. This module is the EMITTER half: it publishes where the pointer is
 * and nothing else. It never decides what gets painted — that belongs to a
 * FIELD TYPE (`cursor-fields/`), which is pure CSS for every type that can be.
 *
 * WHY THE SPLIT (Bean, 2026-08-01): "the effect isn't limited to a
 * glow/colour, it could be a pattern, move floating objects etc". FR-38-25 as
 * originally signed described exactly one radial gradient. Hard-coding that
 * gradient here would mean a second field type is a second module and a third
 * is a third. Publishing coordinates and letting a field type paint them means
 * a new type is a CSS rule plus a descriptor row.
 *
 * ── THE MECHANISM, AND WHY IT NEEDS NO GEOMETRY MATHS ─────────────────────
 *
 * The emitter publishes the pointer position in VIEWPORT pixels. Custom
 * properties inherit, so every descendant reads the same pair with no ancestry
 * wiring, no event plumbing and no per-element measurement. Each PARTICIPANT
 * then paints the identical field with `background-attachment: fixed`, which
 * resolves a background against the viewport rather than against the element —
 * so the field lines up across separately-painted boxes automatically.
 *
 * That is the whole reason coordinates are viewport-space here and NOT the
 * element-relative percentages the mega-menu spotlight uses: element-relative
 * values are meaningless to a child, because "50%" of the child is not "50%"
 * of the emitter. Element space remains available via `coordinateSpace` for
 * the existing single-element consumer (see `spotlight.js`).
 *
 * ── PARTICIPANTS: WHY THEY ARE DETECTED AT RUNTIME ────────────────────────
 *
 * Bean's ruling was that the field must cross an opaque child seamlessly —
 * "it should be able to go over any surface seamlessly". An opaque child
 * occludes its slice of an emitter-painted field, so each such child has to
 * paint its own share.
 *
 * CSS cannot ask "does this element have a non-transparent background", so
 * participants must be marked. This module marks them by walking the emitter's
 * subtree once at init and testing the COMPUTED background — the fact that
 * decides occlusion — rather than trusting a block's declared capability,
 * which describes what an operator COULD set, not what is actually painted.
 *
 * Known limit, stated rather than hidden: the walk runs at init, so a child
 * whose background is set later (or which is inserted later) will not
 * participate until re-init. That is acceptable for v1 because block content
 * is server-rendered and static on the frontend; if a dynamic case appears,
 * the fix is a MutationObserver here, not per-block code.
 *
 * ── HOUSE CONTRACTS (Spec 38 §1.6) ────────────────────────────────────────
 *
 * - Reduced motion: SIMPLIFY, never suppress. The static field is a legitimate
 *   finished state, so the field still paints — it simply stops following.
 *   Checked LIVE per init, never cached at module load.
 * - Fail-open no-JS: every custom property has a static fallback in the CSS, so
 *   a page with JS blocked renders one fixed soft field rather than nothing.
 * - Spec 32 no-inline: this module writes custom-property VALUES only. Not one
 *   property declaration. The painting lives in `assets/css/fx-cursor-field.css`.
 * - `init( el, opts ) -> cleanup()`.
 *
 * ── POINTER GATE ──────────────────────────────────────────────────────────
 *
 * Gated to a fine, hover-capable pointer. A cursor effect has no meaning on
 * touch, and this also sidesteps `background-attachment: fixed` being ignored
 * on iOS Safari. `supportsFinePointer()` alone is NOT sufficient — a hybrid
 * laptop reports hover-capable for the whole session while being poked with a
 * finger — so `isTouchInput()` is consulted live on each move.
 *
 * @package
 */

import {
	prefersReducedMotion,
	rafThrottle,
	supportsFinePointer,
	isTouchInput,
} from './motion-utils';

/** Viewport-space custom properties, inherited by every participant. */
const VAR_X = '--sgs-cursor-x';
const VAR_Y = '--sgs-cursor-y';

/** Element-space custom properties — the frozen `spotlight.js` contract. */
const VAR_ELEMENT_X = '--mx';
const VAR_ELEMENT_Y = '--my';

/** Marks the element painting the base field. */
const EMITTER_ATTR = 'data-sgs-cursor-field';

/** Marks an opaque descendant painting its own share of the same field. */
const PARTICIPANT_ATTR = 'data-sgs-cursor-participant';

/**
 * Resting position for element space — the centre-ish spot the mega-menu
 * spotlight has always used. Kept verbatim; it is a published contract.
 */
const STATIC_ELEMENT_X = '50%';
const STATIC_ELEMENT_Y = '30%';

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
 * Whether an element is a participant — i.e. it paints an opaque background
 * that would occlude its slice of the emitter's field, AND it can safely take
 * an extra background layer.
 *
 * TWO SEPARATE TESTS, and the second is the one that matters for safety:
 *
 * 1. Does it occlude? A fully transparent background occludes nothing and must
 *    NOT be marked — marking it would paint a second copy of the field over
 *    the emitter's own, doubling brightness exactly where the two overlap.
 *
 * 2. Can it take the field WITHOUT destroying its own painting? Participants
 *    paint via an added `background-image` layer rather than a pseudo-element,
 *    because `::before`/`::after` are already in heavy use across SGS blocks
 *    and claiming one on 51 blocks' descendants would silently break whichever
 *    already used it. A `background-image` layer composites cleanly OVER a
 *    `background-color` (colour always paints beneath image) — but it would
 *    REPLACE an element's own background-image.
 *
 * So an element carrying its own background-image is deliberately NOT marked.
 * Stated limit rather than a hidden one: such a child keeps a visible seam in
 * the field. It is rare among opaque children, and the alternative — clobbering
 * a client's chosen background image — is plainly worse.
 *
 * @param {HTMLElement} el The candidate participant.
 * @return {boolean} True when the element should paint its own share.
 */
function isParticipant( el ) {
	const styles = window.getComputedStyle( el );

	// Its own image would be replaced by ours — leave it alone (see above).
	if ( 'none' !== styles.backgroundImage ) {
		return false;
	}

	const colour = styles.backgroundColor;
	if ( ! colour || 'transparent' === colour ) {
		return false;
	}

	// `rgba(r, g, b, a)` — a zero/near-zero alpha paints nothing worth
	// compensating for. Anything without an alpha channel is fully opaque.
	const alpha = colour.match( /^rgba?\([^)]*,\s*([\d.]+)\s*\)$/ );
	if ( alpha ) {
		return parseFloat( alpha[ 1 ] ) > 0.05;
	}

	return true;
}

/**
 * Mark every descendant that paints its own background, so it can paint its
 * own share of the field rather than occluding the emitter's.
 *
 * @param {HTMLElement} el The emitter.
 * @return {HTMLElement[]} The elements marked — for cleanup to unmark.
 */
function markParticipants( el ) {
	const marked = [];

	el.querySelectorAll( '*' ).forEach( ( child ) => {
		// Never re-mark a nested emitter's subtree: that emitter owns its own
		// field and its participants are marked against IT.
		if ( child.hasAttribute( EMITTER_ATTR ) ) {
			return;
		}
		if ( ! isParticipant( child ) ) {
			return;
		}
		child.setAttribute( PARTICIPANT_ATTR, '' );
		marked.push( child );
	} );

	return marked;
}

/**
 * Attach a cursor-reactive field emitter to `el`.
 *
 * @param {HTMLElement} el                    The element the field is painted on.
 * @param {Object}      [opts]                Options.
 * @param {string}      [opts.coordinateSpace] `'viewport'` (default — the
 *                                            multi-element field) or
 *                                            `'element'` (percentages relative
 *                                            to `el`, the single-element
 *                                            `spotlight.js` contract).
 * @return {Function} Cleanup — removes listeners and participant marks. Safe
 *                    to call on a detached or empty element.
 */
export function initCursorField( el, opts = {} ) {
	if ( ! el || typeof el.addEventListener !== 'function' ) {
		return () => {};
	}

	const elementSpace = 'element' === opts.coordinateSpace;
	const varX = elementSpace ? VAR_ELEMENT_X : VAR_X;
	const varY = elementSpace ? VAR_ELEMENT_Y : VAR_Y;

	/**
	 * Return the field to its resting position. In element space that is the
	 * published static centre; in viewport space it is the centre of the
	 * emitter itself, so the field rests over the block rather than jumping to
	 * an arbitrary screen corner.
	 */
	const rest = () => {
		if ( elementSpace ) {
			el.style.setProperty( varX, STATIC_ELEMENT_X );
			el.style.setProperty( varY, STATIC_ELEMENT_Y );
			return;
		}
		const rect = el.getBoundingClientRect();
		el.style.setProperty( varX, `${ Math.round( rect.left + rect.width / 2 ) }px` );
		el.style.setProperty( varY, `${ Math.round( rect.top + rect.height / 2 ) }px` );
	};

	// The resting position is applied unconditionally and FIRST, so the field
	// is never absent — not before the first pointer move, not under reduced
	// motion, not on touch, not with JS half-loaded.
	rest();

	const participants = elementSpace ? [] : markParticipants( el );

	/**
	 * Undo everything this init did.
	 *
	 * @return {void}
	 */
	const unmark = () => {
		participants.forEach( ( child ) =>
			child.removeAttribute( PARTICIPANT_ATTR )
		);
	};

	// Reduced motion (SIMPLIFY) and coarse pointers both keep the painted
	// field and drop only the tracking. Checked live, not at module load.
	if ( prefersReducedMotion() || ! supportsFinePointer() ) {
		return unmark;
	}

	const handleMove = rafThrottle( ( clientX, clientY ) => {
		if ( elementSpace ) {
			const rect = el.getBoundingClientRect();
			if ( 0 === rect.width || 0 === rect.height ) {
				return;
			}
			el.style.setProperty(
				varX,
				`${ clamp( ( ( clientX - rect.left ) / rect.width ) * 100, 0, 100 ).toFixed( 2 ) }%`
			);
			el.style.setProperty(
				varY,
				`${ clamp( ( ( clientY - rect.top ) / rect.height ) * 100, 0, 100 ).toFixed( 2 ) }%`
			);
			return;
		}

		// Viewport space needs no measurement of anything at all.
		el.style.setProperty( varX, `${ Math.round( clientX ) }px` );
		el.style.setProperty( varY, `${ Math.round( clientY ) }px` );
	} );

	/**
	 * `mousemove` bubbles from descendants, so tracking continues over an
	 * opaque child rather than stopping at it. Reading `clientX`/`clientY` off
	 * the event here (rather than passing the event into the throttle) keeps
	 * the coalesced call holding plain numbers, never a pooled event object.
	 *
	 * @param {MouseEvent} event The move event.
	 */
	const onMove = ( event ) => {
		// A hybrid device can switch pointer types between interactions; a
		// touch-driven move must not drag the field around.
		if ( isTouchInput() ) {
			return;
		}
		handleMove( event.clientX, event.clientY );
	};

	// `mouseleave` does not fire when entering a child, so this only runs when
	// the pointer genuinely leaves the emitter.
	const onLeave = () => {
		handleMove.cancel();
		rest();
	};

	el.addEventListener( 'mousemove', onMove );
	el.addEventListener( 'mouseleave', onLeave );

	return () => {
		handleMove.cancel();
		el.removeEventListener( 'mousemove', onMove );
		el.removeEventListener( 'mouseleave', onLeave );
		unmark();
	};
}

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
 * The initial walk runs at init, and a `MutationObserver` on the emitter's
 * own subtree keeps it current after that — a child whose background is set
 * later (or which is inserted later) is picked up on its own mutation record
 * rather than only at the next full re-init. The observer is bounded to this
 * emitter (created and disconnected inside this module's own `init`/`cleanup`
 * pair — never a page-wide observer) and its callback is rAF-coalesced, so a
 * burst of mutations costs one computed-style pass per frame, not one per
 * record.
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

/**
 * Element-relative pixels, published ALONGSIDE the viewport pair in viewport
 * mode. Deliberately NOT `--mx`/`--my`: those are the mega-menu's frozen
 * contract, carry PERCENTAGES, and rest at a different spot (50%/30%).
 * Reusing them here would silently redefine a published contract.
 *
 * WHY THIS PAIR EXISTS (2026-08-24, measured). `background-attachment: fixed`
 * resolves the LAYER against the viewport, so viewport pixels are correct for
 * it. A `mask-image` has no attachment equivalent — `mask-attachment` is in
 * CSS Masking L1 but no engine implements it — so a mask gradient's `at X Y`
 * resolves against the ELEMENT's own box. Feeding it viewport pixels put the
 * reveal off by exactly the element's distance from the viewport top:
 * measured, a pointer at viewport y=481 over an element whose top was 256 lit
 * a spot at 737, below that element's own bottom edge. Masked field types read
 * this pair instead.
 */
const VAR_LOCAL_X = '--sgs-cursor-local-x';
const VAR_LOCAL_Y = '--sgs-cursor-local-y';

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
 * Watch an emitter's subtree for late-added or late-styled participants.
 *
 * CSS cannot tell us "this element just became opaque" any more than it can
 * tell us it currently is, so a mutation observer is the only way to catch a
 * background set after init (a client-side state change, a lazily-rendered
 * child, an Interactivity-API-driven class toggle). Two mutation kinds matter:
 * a NEW node appearing (`childList`), and an EXISTING node's `style`/`class`
 * changing (`attributeFilter`) — a background is almost always set one of
 * those two ways. Nothing else is watched: text nodes, unrelated attributes,
 * and ancestor mutations outside this subtree are all noise this effect does
 * not need to pay for.
 *
 * Coalesced to one pass per animation frame regardless of how many mutation
 * records land in that frame, so a large paste/re-render cannot turn into one
 * `getComputedStyle()` read per node per record.
 *
 * @param {HTMLElement}   el     The emitter.
 * @param {HTMLElement[]} marked The running list of marked participants —
 *                               mutated in place so cleanup's existing
 *                               `unmark()` closure (which already iterates
 *                               this array) covers late arrivals for free.
 * @return {MutationObserver} The observer — caller disconnects it on cleanup.
 */
function observeParticipants( el, marked ) {
	let scheduled = false;
	let pending = new Set();

	const flush = () => {
		scheduled = false;
		const candidates = pending;
		pending = new Set();

		candidates.forEach( ( node ) => {
			// A candidate can be removed from the DOM, or become a nested
			// emitter's own subtree, between being queued and being flushed.
			if ( ! node.isConnected || ! el.contains( node ) ) {
				return;
			}
			if ( node.hasAttribute( EMITTER_ATTR ) ) {
				return;
			}
			if ( node.hasAttribute( PARTICIPANT_ATTR ) ) {
				return;
			}
			if ( ! isParticipant( node ) ) {
				return;
			}
			node.setAttribute( PARTICIPANT_ATTR, '' );
			marked.push( node );
		} );
	};

	const schedule = () => {
		if ( scheduled ) {
			return;
		}
		scheduled = true;
		window.requestAnimationFrame( flush );
	};

	const observer = new window.MutationObserver( ( mutations ) => {
		mutations.forEach( ( mutation ) => {
			if ( 'childList' === mutation.type ) {
				mutation.addedNodes.forEach( ( node ) => {
					if ( node.nodeType !== 1 ) {
						return;
					}
					pending.add( node );
					node.querySelectorAll( '*' ).forEach( ( child ) =>
						pending.add( child )
					);
				} );
				return;
			}
			// 'attributes' — style/class changed on an existing node.
			if ( mutation.target.nodeType === 1 ) {
				pending.add( mutation.target );
			}
		} );
		if ( pending.size > 0 ) {
			schedule();
		}
	} );

	observer.observe( el, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: [ 'style', 'class' ],
	} );

	return observer;
}

/**
 * Attach a cursor-reactive field emitter to `el`.
 *
 * @param {HTMLElement} el                     The element the field is painted on.
 * @param {Object}      [opts]                 Options.
 * @param {string}      [opts.coordinateSpace] `'viewport'` (default — the
 *                                             multi-element field) or
 *                                             `'element'` (percentages relative
 *                                             to `el`, the single-element
 *                                             `spotlight.js` contract).
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
		el.style.setProperty(
			varX,
			`${ Math.round( rect.left + rect.width / 2 ) }px`
		);
		el.style.setProperty(
			varY,
			`${ Math.round( rect.top + rect.height / 2 ) }px`
		);
		// The same resting point expressed in the element's own box, for
		// masked types. Same rect, no extra measurement.
		el.style.setProperty( VAR_LOCAL_X, `${ Math.round( rect.width / 2 ) }px` );
		el.style.setProperty( VAR_LOCAL_Y, `${ Math.round( rect.height / 2 ) }px` );
	};

	/**
	 * Show/hide without moving. `--sgs-cursor-field-opacity` DEFAULTS TO 1 in
	 * the stylesheet, so a no-JS visitor, the editor canvas and reduced motion
	 * all still see the static resting field (§1.6 fail-open, §9, §10). JS
	 * turns it off only once JS is confirmed running — the `sgs-js` gate shape.
	 */
	const setVisible = ( on ) => {
		if ( on ) {
			// REMOVE rather than set 1 — the stylesheet's own default (0.9) is
			// the resting appearance every field type already shipped with, and
			// writing a literal here would have brightened all of them as a
			// side effect of one look's change.
			el.style.removeProperty( '--sgs-cursor-field-opacity' );
			return;
		}
		el.style.setProperty( '--sgs-cursor-field-opacity', '0' );
	};

	// The resting position is applied unconditionally and FIRST, so the field
	// is never absent — not before the first pointer move, not under reduced
	// motion, not on touch, not with JS half-loaded.
	rest();

	// ⭐ BUT it is not SHOWN at rest once JS is live (2026-08-24, Bean's ruling:
	// "this is a cursor effect so the effect should leave and arrive to the
	// section with your cursor"). Parking a lit pool in the middle of every
	// section announced the effect before the pointer was anywhere near it, and
	// snapping back to that centre on exit read as a teleport rather than a
	// departure. Reduced motion KEEPS the static resting field — there the pool
	// is a finished state, not an animation (§10 SIMPLIFY, never suppress).
	if ( ! elementSpace && ! prefersReducedMotion() ) {
		setVisible( false );
	}

	const participants = elementSpace ? [] : markParticipants( el );

	// Element-space mode is the single-element `spotlight.js` contract — it
	// has no participants and therefore nothing for the observer to watch.
	const participantObserver =
		! elementSpace && 'undefined' !== typeof window.MutationObserver
			? observeParticipants( el, participants )
			: null;

	/**
	 * Undo everything this init did.
	 *
	 * @return {void}
	 */
	const unmark = () => {
		if ( participantObserver ) {
			participantObserver.disconnect();
		}
		participants.forEach( ( child ) =>
			child.removeAttribute( PARTICIPANT_ATTR )
		);
	};

	// Reduced motion (SIMPLIFY) and coarse pointers both keep the painted
	// field and drop only the tracking. Checked live, not at module load.
	if ( prefersReducedMotion() || ! supportsFinePointer() ) {
		return unmark;
	}

	/**
	 * Write one pointer position to both published pairs.
	 *
	 * The VIEWPORT pair needs no measurement — it IS the client position, and
	 * `background-attachment: fixed` resolves the layer against the viewport, so
	 * every participant paints the same field in the same screen place with no
	 * per-element maths. That remains the mechanism.
	 *
	 * The LOCAL pair costs one rect read per frame — the same cost element space
	 * has always paid, and one read for the EMITTER, never one per participant.
	 * Masked types need it because a mask resolves against this element's box.
	 *
	 * @param {number} vx Viewport x.
	 * @param {number} vy Viewport y.
	 * @return {void}
	 */
	const publishViewport = ( vx, vy ) => {
		el.style.setProperty( varX, `${ Math.round( vx ) }px` );
		el.style.setProperty( varY, `${ Math.round( vy ) }px` );
		const localRect = el.getBoundingClientRect();
		el.style.setProperty(
			VAR_LOCAL_X,
			`${ Math.round( vx - localRect.left ) }px`
		);
		el.style.setProperty(
			VAR_LOCAL_Y,
			`${ Math.round( vy - localRect.top ) }px`
		);
	};

	/*
	 * DRAG WEIGHT — the standard lerp follower: each frame, move the published
	 * position a FRACTION of the remaining distance toward the pointer, so it
	 * eases in and never quite overshoots. `current += (target - current) * f`.
	 *
	 * The client-facing control is 0-100 "how far it lags", which is the
	 * inverse of the maths: a SMALLER factor means more lag. 0 maps to 1
	 * (publish directly, the pre-existing behaviour, byte-identical), and 100
	 * maps to 0.06 (very heavy). The published range therefore spans the
	 * 0.1-0.2 "visibly heavy drag" and 0.3-0.5 "snappier but still eased" bands
	 * that recur across implementations of this pattern.
	 *
	 * Reduced motion needs no branch here: `init` returns before any listener
	 * is attached under `reduce`, so the loop can never start and the field
	 * simply rests.
	 */
	const trailAttr = el.getAttribute( 'data-sgs-cursor-field-trail' );
	const trailAmount = clamp( parseInt( trailAttr, 10 ) || 0, 0, 100 );
	const trailFactor = 0 === trailAmount ? 1 : 1 - ( trailAmount / 100 ) * 0.94;

	let targetX = null;
	let targetY = null;
	let currentX = null;
	let currentY = null;
	let trailFrame = null;

	const stopTrail = () => {
		if ( null !== trailFrame ) {
			cancelAnimationFrame( trailFrame );
			trailFrame = null;
		}
	};

	const tick = () => {
		currentX += ( targetX - currentX ) * trailFactor;
		currentY += ( targetY - currentY ) * trailFactor;
		publishViewport( currentX, currentY );
		// Half a pixel is below what any of this can paint, so settling there
		// ends the loop rather than running forever on rounding noise.
		if (
			0.5 < Math.abs( targetX - currentX ) ||
			0.5 < Math.abs( targetY - currentY )
		) {
			trailFrame = requestAnimationFrame( tick );
			return;
		}
		currentX = targetX;
		currentY = targetY;
		publishViewport( currentX, currentY );
		trailFrame = null;
	};

	const startTrail = () => {
		if ( null === trailFrame ) {
			trailFrame = requestAnimationFrame( tick );
		}
	};

	const handleMove = rafThrottle( ( clientX, clientY ) => {
		if ( elementSpace ) {
			const rect = el.getBoundingClientRect();
			if ( 0 === rect.width || 0 === rect.height ) {
				return;
			}
			el.style.setProperty(
				varX,
				`${ clamp(
					( ( clientX - rect.left ) / rect.width ) * 100,
					0,
					100
				).toFixed( 2 ) }%`
			);
			el.style.setProperty(
				varY,
				`${ clamp(
					( ( clientY - rect.top ) / rect.height ) * 100,
					0,
					100
				).toFixed( 2 ) }%`
			);
			return;
		}

		// DRAG 0 (the default) publishes the pointer position directly, exactly
		// as this module always has. Anything above 0 hands the position to the
		// easing loop instead, so the pool lags behind the cursor.
		if ( 1 <= trailFactor ) {
			publishViewport( clientX, clientY );
			return;
		}
		targetX = clientX;
		targetY = clientY;
		if ( null === currentX ) {
			currentX = clientX;
			currentY = clientY;
		}
		startTrail();
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

	/**
	 * ARRIVE WITH THE POINTER. `mouseenter` carries the coordinates of the
	 * crossing, so the field is placed AT the edge the pointer came through
	 * before it is shown — it appears where the cursor is, rather than fading
	 * up in the middle and sliding out to meet it.
	 */
	const onEnter = ( event ) => {
		if ( isTouchInput() ) {
			return;
		}
		// Seed the lerp at the entry point, or a non-zero drag weight would
		// ease the pool in from wherever it was left, across the whole section.
		currentX = event.clientX;
		currentY = event.clientY;
		handleMove( event.clientX, event.clientY );
		setVisible( true );
	};

	// `mouseleave` does not fire when entering a child, so this only runs when
	// the pointer genuinely leaves the emitter.
	const onLeave = ( event ) => {
		handleMove.cancel();
		stopTrail();
		currentX = null;
		currentY = null;
		// LEAVE WITH THE POINTER: publish the exit crossing, which is ON the
		// boundary, then fade. `rest()` is deliberately NOT called — recentring
		// is the teleport Bean reported. The stylesheet's own default still
		// covers the no-JS and reduced-motion cases.
		if ( event && 'number' === typeof event.clientX ) {
			handleMove( event.clientX, event.clientY );
		}
		setVisible( false );
	};

	el.addEventListener( 'mousemove', onMove );
	el.addEventListener( 'mouseenter', onEnter );
	el.addEventListener( 'mouseleave', onLeave );

	return () => {
		handleMove.cancel();
		stopTrail();
		el.removeEventListener( 'mousemove', onMove );
		el.removeEventListener( 'mouseenter', onEnter );
		el.removeEventListener( 'mouseleave', onLeave );
		el.style.removeProperty( '--sgs-cursor-field-opacity' );
		unmark();
	};
}

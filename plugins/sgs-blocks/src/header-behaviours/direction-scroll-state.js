/**
 * Header scroll-trigger state machine (Wave 3C U-13 M-03, §4.6,
 * `.claude/reports/2026-09-26-u13-header-ink-design.md`).
 *
 * Kept as its own ES module (imported by `header-behaviours/view.js`, which is
 * a real webpack entry — bundled, not copied — so an import here reaches the
 * deployed script) so the decision can be unit-tested with plain state
 * objects, independent of a real DOM
 * (`scripts/tests/test-direction-scroll-state.mjs`).
 *
 * `position` mode (the default, unchanged from before this module existed):
 * `is-header-scrolled` is on whenever `scrollY > offset`. No memory of
 * direction is kept.
 *
 * `direction` mode: `is-header-scrolled` turns ON only while `scrollY >
 * offset` AND the last movement was downward, and turns OFF on an upward
 * movement of 8px or more accumulated since the last downward movement (a
 * deadzone against iOS rubber-banding and flick-scroll direction reversals —
 * council finding 4), or unconditionally at `scrollY <= offset`.
 */

/** Upward pixels that must accumulate before direction mode clears the scrolled state. */
export const DIRECTION_UP_DEADZONE_PX = 8;

/**
 * @typedef {Object} DirectionScrollState
 * @property {number}  prevScrollY   The previous tick's scrollY.
 * @property {boolean} scrolled      Whether `is-header-scrolled` is currently on.
 * @property {number}  upAccumPx     Upward pixels accumulated since the last downward movement.
 */

/**
 * The initial state for a fresh page load, given the current scroll position.
 *
 * @param {number} scrollY Current `window.scrollY`.
 * @return {DirectionScrollState}
 */
export function initDirectionScrollState( scrollY ) {
	return { prevScrollY: scrollY, scrolled: false, upAccumPx: 0 };
}

/**
 * One tick of the `direction` trigger's state machine. Pure — takes the
 * previous state and the new scrollY, returns the next state. Never mutates
 * its input.
 *
 * @param {DirectionScrollState} state    The previous tick's state.
 * @param {number}               scrollY  The new `window.scrollY`.
 * @param {number}               offset   `scrolledOffset` — the px threshold.
 * @return {DirectionScrollState} The next state.
 */
export function nextDirectionScrollState( state, scrollY, offset ) {
	const movedDown = scrollY > state.prevScrollY;
	const movedUp = scrollY < state.prevScrollY;

	// At/below the offset, the scrolled state always clears, regardless of
	// direction or deadzone — there is no "solid" fill left to hold onto once
	// the header is back at (or above) its resting position.
	if ( scrollY <= offset ) {
		return { prevScrollY: scrollY, scrolled: false, upAccumPx: 0 };
	}

	let upAccumPx = state.upAccumPx;
	if ( movedUp ) {
		upAccumPx += state.prevScrollY - scrollY;
	} else if ( movedDown ) {
		// A downward movement resets the deadzone — only a CONTIGUOUS upward
		// run of 8px+ clears the scrolled state, not an accumulation across
		// direction reversals.
		upAccumPx = 0;
	}

	let scrolled = state.scrolled;
	if ( movedDown ) {
		scrolled = true;
	} else if ( upAccumPx >= DIRECTION_UP_DEADZONE_PX ) {
		scrolled = false;
	}
	// A movement smaller than the deadzone (including no movement, or the
	// very first tick with movedUp/movedDown both false) leaves `scrolled`
	// exactly as it was — that IS the deadzone's purpose.

	return { prevScrollY: scrollY, scrolled, upAccumPx };
}

/**
 * `position` mode's decision — kept alongside the direction machine so
 * `initScrollBehaviours()` reads one small pair of pure functions instead of
 * branching inline. Byte-for-byte the pre-M-03 rule (`scrollY > offset`).
 *
 * @param {number} scrollY Current `window.scrollY`.
 * @param {number} offset  `scrolledOffset` — the px threshold.
 * @return {boolean}
 */
export function positionScrolled( scrollY, offset ) {
	return scrollY > offset;
}

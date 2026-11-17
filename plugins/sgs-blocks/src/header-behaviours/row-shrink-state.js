/**
 * Row shrink state machine (Spec 37 row shrink).
 *
 * A row shrinks when the page scrolls past `ROW_SHRINK_ENTER_PX`. Shrinking can
 * remove height from the header (a hide-target collapses), and the browser's
 * scroll anchoring then moves `scrollY` up by that same height. With one
 * threshold both ways, the pulled-back `scrollY` falls under it, the row
 * un-shrinks, the header grows, the anchor pushes `scrollY` back over it, and
 * the row flips on every frame. This module gives the way back its own, lower
 * threshold: it allows for the height the shrink removed, so one continuous
 * slow scroll in either direction toggles the state exactly once.
 *
 * Pure (plain numbers in, boolean out) so it is unit-tested without a DOM
 * (`tests/js/row-shrink-state.test.js`).
 */

/** Scroll distance past which a row shrinks. */
export const ROW_SHRINK_ENTER_PX = 50;

/** Extra distance below the anchor-adjusted threshold, so a one-pixel overshoot cannot un-shrink. */
export const ROW_SHRINK_MARGIN_PX = 8;

/**
 * The scrollY below which a shrunk row un-shrinks.
 *
 * @param {number} removedPx Height the shrink took out of the header, in px (0 when none).
 * @return {number} Threshold, never below 1 so the page top always un-shrinks.
 */
export function rowShrinkExitY( removedPx ) {
	const removed = Math.max( 0, Number( removedPx ) || 0 );
	return Math.max( 1, ROW_SHRINK_ENTER_PX - removed - ROW_SHRINK_MARGIN_PX );
}

/**
 * The scrollY past which an un-shrunk row shrinks. Once a shrink has been seen
 * to remove height, the threshold sits above that height plus the margin, so the
 * anchored-back scrollY still clears `rowShrinkExitY` even when it is clamped
 * at the page top.
 *
 * @param {number} removedPx Height the last shrink removed (0 before the first).
 * @return {number} Threshold.
 */
export function rowShrinkEnterY( removedPx ) {
	const removed = Math.max( 0, Number( removedPx ) || 0 );
	return Math.max( ROW_SHRINK_ENTER_PX, removed + ROW_SHRINK_MARGIN_PX + 1 );
}

/**
 * Next shrunk state for one row on one scroll tick.
 *
 * @param {boolean} shrunk    Whether the row is shrunk now.
 * @param {number}  scrollY   Current `window.scrollY`.
 * @param {number}  removedPx Height the last shrink removed from the header (measured when it shrank; 0 until the first shrink).
 * @param {boolean} forced    True when the page restores a shrunk state (scroll-restore), which holds the row shrunk.
 * @return {boolean} Whether the row should be shrunk.
 */
export function nextRowShrunk( shrunk, scrollY, removedPx, forced ) {
	if ( forced ) {
		return true;
	}
	if ( shrunk ) {
		return scrollY >= rowShrinkExitY( removedPx );
	}
	return scrollY > rowShrinkEnterY( removedPx );
}
